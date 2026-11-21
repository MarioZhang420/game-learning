import { randomBytes, timingSafeEqual } from 'node:crypto';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Engine, Outbound } from '@game-learning/core';
import {
  ClientToHub,
  GameToHub,
  Hello,
  type HubToClient,
  type HubToGame,
  PROTOCOL_VERSION,
} from '@game-learning/protocol';
import { type Discovery, discoveryFile } from '@game-learning/protocol/discovery';
import { type WebSocket, WebSocketServer } from 'ws';

export interface HubOptions {
  engine: Engine;
  /** 0 picks a free port. */
  port: number;
  /** Defaults to a fresh random token. */
  token?: string;
  /** Browser origins allowed to connect (e.g. the desktop app's renderer). Mods send no Origin. */
  allowedOrigins?: string[];
  /** Where to write the discovery file; `false` to skip (tests). */
  discoveryPath?: string | false;
  log?: (message: string) => void;
}

type Peer =
  | { role: 'game'; socket: WebSocket; integrationId: string }
  | { role: 'client'; socket: WebSocket };

const HELLO_TIMEOUT_MS = 5_000;

/** The hub: accepts games and clients over WebSocket on 127.0.0.1 and runs the engine. */
export class Hub {
  readonly token: string;
  readonly #options: HubOptions;
  readonly #log: (message: string) => void;
  readonly #peers = new Set<Peer>();
  #server: WebSocketServer | undefined;
  #discoveryPath: string | undefined;

  constructor(options: HubOptions) {
    this.#options = options;
    this.token = options.token ?? randomBytes(24).toString('hex');
    this.#log = options.log ?? (() => {});
  }

  get port(): number {
    const address = this.#server?.address();
    if (!address || typeof address === 'string') throw new Error('Hub is not running');
    return address.port;
  }

  async start(): Promise<void> {
    const allowed = new Set(this.#options.allowedOrigins ?? []);
    const server = new WebSocketServer({
      host: '127.0.0.1',
      port: this.#options.port,
      maxPayload: 64 * 1024,
      verifyClient: ({ origin }: { origin: string | undefined }) => !origin || allowed.has(origin),
    });
    this.#server = server;
    await new Promise<void>((resolve, reject) => {
      server.once('listening', resolve);
      server.once('error', reject);
    });
    server.on('connection', (socket) => this.#accept(socket));

    if (this.#options.discoveryPath !== false) {
      this.#discoveryPath = this.#options.discoveryPath ?? discoveryFile();
      const discovery: Discovery = {
        protocol: PROTOCOL_VERSION,
        port: this.port,
        token: this.token,
        pid: process.pid,
      };
      mkdirSync(dirname(this.#discoveryPath), { recursive: true });
      writeFileSync(this.#discoveryPath, JSON.stringify(discovery, null, 2));
    }
    this.#log(`hub: listening on ws://127.0.0.1:${this.port}`);
  }

  async stop(): Promise<void> {
    if (this.#discoveryPath) rmSync(this.#discoveryPath, { force: true });
    for (const peer of this.#peers) peer.socket.close(1001, 'hub stopping');
    await new Promise<void>((resolve) =>
      this.#server ? this.#server.close(() => resolve()) : resolve(),
    );
  }

  #accept(socket: WebSocket) {
    const timer = setTimeout(() => socket.close(4000, 'no hello'), HELLO_TIMEOUT_MS);
    socket.once('message', (raw) => {
      clearTimeout(timer);
      const hello = Hello.safeParse(parse(raw));
      if (!hello.success)
        return this.#reject(socket, 'bad-message', 'First message must be "hello"');
      if (!sameToken(hello.data.token, this.token))
        return this.#reject(socket, 'unauthorized', 'Wrong token');
      if (hello.data.protocol.split('.')[0] !== PROTOCOL_VERSION) {
        return this.#reject(
          socket,
          'unsupported-protocol',
          `Hub speaks protocol ${PROTOCOL_VERSION}`,
        );
      }
      const welcome = {
        type: 'welcome',
        protocol: PROTOCOL_VERSION,
        sessionId: crypto.randomUUID(),
      } as const;
      const { engine } = this.#options;

      if (hello.data.role === 'game') {
        const integrationId = hello.data.integration.id;
        const peer: Peer = { role: 'game', socket, integrationId };
        this.#peers.add(peer);
        send(socket, welcome);
        this.#log(
          `hub: game connected: ${hello.data.game.name} (${integrationId}), effects: ${hello.data.capabilities.effects.join(', ') || 'none'}`,
        );
        this.#dispatch(engine.gameConnected(hello.data));
        socket.on('message', (data) => this.#onGameMessage(peer, data));
        socket.on('close', () => {
          this.#peers.delete(peer);
          this.#log(`hub: game disconnected: ${integrationId}`);
          this.#dispatch(engine.gameDisconnected(integrationId));
        });
      } else {
        const peer: Peer = { role: 'client', socket };
        this.#peers.add(peer);
        send(socket, welcome);
        this.#log(`hub: client connected: ${hello.data.client.name}`);
        for (const message of engine.clientConnected()) send(socket, message);
        socket.on('message', (data) => this.#onClientMessage(peer, data));
        socket.on('close', () => this.#peers.delete(peer));
      }
    });
  }

  #onGameMessage(peer: Extract<Peer, { role: 'game' }>, raw: unknown) {
    const message = GameToHub.safeParse(parse(raw));
    if (!message.success) return send(peer.socket, badMessage(message.error.message));
    const { engine } = this.#options;
    if (message.data.type === 'event') {
      this.#log(`hub: event ${message.data.name} from ${peer.integrationId}`);
      this.#dispatch(engine.handleGameEvent(peer.integrationId, message.data));
    } else {
      this.#log(`hub: effect ${message.data.effectId} ${message.data.status}`);
      this.#dispatch(engine.handleEffectResult(message.data));
    }
  }

  #onClientMessage(peer: Extract<Peer, { role: 'client' }>, raw: unknown) {
    const message = ClientToHub.safeParse(parse(raw));
    if (!message.success) return send(peer.socket, badMessage(message.error.message));
    const { engine } = this.#options;
    this.#dispatch(
      message.data.type === 'answer'
        ? engine.handleAnswer(message.data)
        : engine.handleDismiss(message.data.challengeId),
    );
  }

  #dispatch(outbound: Outbound[]) {
    for (const item of outbound) {
      for (const peer of this.#peers) {
        if (item.to === 'clients' && peer.role === 'client') send(peer.socket, item.message);
        if (
          item.to === 'game' &&
          peer.role === 'game' &&
          peer.integrationId === item.integrationId
        ) {
          send(peer.socket, item.message);
        }
      }
    }
  }

  #reject(
    socket: WebSocket,
    code: 'bad-message' | 'unauthorized' | 'unsupported-protocol',
    message: string,
  ) {
    this.#log(`hub: rejected a connection: ${message}`);
    send(socket, { type: 'error', code, message });
    socket.close(4001, code);
  }
}

function parse(raw: unknown): unknown {
  try {
    return JSON.parse(String(raw));
  } catch {
    return undefined;
  }
}

function send(socket: WebSocket, message: HubToClient | HubToGame) {
  if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(message));
}

function badMessage(detail: string): HubToGame {
  return { type: 'error', code: 'bad-message', message: detail.slice(0, 500) };
}

function sameToken(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
