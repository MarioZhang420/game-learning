import type { Question } from '@game-learning/content';
import { DeathRecovery, Engine, MemoryProgressStore } from '@game-learning/core';
import type { HubToClient } from '@game-learning/protocol';
import { afterEach, describe, expect, it } from 'vitest';
import WebSocket from 'ws';
import { Hub } from './server.ts';

const questions: Question[] = [
  {
    id: 'q1',
    type: 'true-false',
    factIds: ['f1'],
    prompt: 'الخلية وحدة بناء الكائن الحي.',
    answer: true,
    explanation: 'صحيح.',
    difficulty: 1,
  },
];

let hub: Hub | undefined;
afterEach(async () => {
  await hub?.stop();
  hub = undefined;
});

async function startHub() {
  const engine = new Engine({
    pack: { id: 'p', title: 'P', language: 'ar' },
    questions,
    store: new MemoryProgressStore(),
    mechanics: [new DeathRecovery({ cooldownMs: 0 })],
    rewards: { xpForCorrect: 10, effects: [{ name: 'currency.grant', amount: 50 }] },
  });
  hub = new Hub({ engine, port: 0, discoveryPath: false, allowedOrigins: ['app://overlay'] });
  await hub.start();
  return hub;
}

/** Opens a socket, sends hello and collects every message it receives. */
async function connect(h: Hub, hello: Record<string, unknown>, origin?: string) {
  const socket = new WebSocket(`ws://127.0.0.1:${h.port}/`, origin ? { origin } : {});
  const inbox: Record<string, unknown>[] = [];
  socket.on('message', (raw) => inbox.push(JSON.parse(String(raw))));
  await new Promise((resolve, reject) => {
    socket.once('open', resolve);
    socket.once('error', reject);
  });
  socket.send(JSON.stringify({ protocol: '1', token: h.token, ...hello, type: 'hello' }));
  const next = async (type: string) => {
    for (let i = 0; i < 100; i++) {
      const index = inbox.findIndex((m) => m.type === type);
      if (index >= 0) return inbox.splice(index, 1)[0] as Record<string, unknown>;
      await new Promise((r) => setTimeout(r, 10));
    }
    throw new Error(`no "${type}" message`);
  };
  return { socket, next, send: (m: unknown) => socket.send(JSON.stringify(m)) };
}

const gameHello = {
  role: 'game',
  integration: { id: 'sim', name: 'Sim', version: '0' },
  game: { id: 'sim', name: 'Sim' },
  capabilities: { events: ['player.died'], effects: ['currency.grant'] },
};
const clientHello = { role: 'client', client: { id: 'ui', name: 'UI', version: '0' } };

describe('Hub', () => {
  it('runs the full loop: death → question → answer → feedback → in-game reward', async () => {
    const h = await startHub();
    const client = await connect(h, clientHello);
    await client.next('welcome');
    const game = await connect(h, gameHello);
    await game.next('welcome');

    game.send({ type: 'event', id: 'e1', name: 'player.died', at: new Date().toISOString() });
    const challenge = (await client.next('challenge')) as Extract<
      HubToClient,
      { type: 'challenge' }
    >;
    expect(challenge.view.prompt).toBe('الخلية وحدة بناء الكائن الحي.');

    client.send({
      type: 'answer',
      challengeId: challenge.id,
      answer: { kind: 'boolean', value: true },
    });
    expect(await client.next('feedback')).toMatchObject({ correct: true });
    const effect = await game.next('effect');
    expect(effect).toMatchObject({ name: 'currency.grant', params: { amount: 50 } });

    game.send({ type: 'effect.result', effectId: effect.id, status: 'applied' });
    expect(await client.next('reward')).toMatchObject({
      name: 'currency.grant',
      status: 'applied',
    });
    client.socket.close();
    game.socket.close();
  });

  it('rejects a wrong token', async () => {
    const h = await startHub();
    const peer = await connect(h, { ...clientHello, token: 'wrong' });
    expect(await peer.next('error')).toMatchObject({ code: 'unauthorized' });
  });

  it('rejects web pages from unknown origins but accepts the app origin', async () => {
    const h = await startHub();
    await expect(connect(h, clientHello, 'https://evil.example')).rejects.toThrow();
    const app = await connect(h, clientHello, 'app://overlay');
    await app.next('welcome');
    app.socket.close();
  });
});
