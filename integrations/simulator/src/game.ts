import { type HubToGame, PROTOCOL_VERSION } from '@game-learning/protocol';
import WebSocket from 'ws';

export interface SimulatedGame {
  die(): void;
  received: HubToGame[];
  close(): void;
}

/** Connects a scripted fake game to a hub (used in tests and as a reference for integration authors). */
export async function connectGame(
  port: number,
  token: string,
  effects: string[] = [],
): Promise<SimulatedGame> {
  const socket = new WebSocket(`ws://127.0.0.1:${port}/`);
  const received: HubToGame[] = [];
  await new Promise<void>((resolve, reject) => {
    socket.once('open', resolve);
    socket.once('error', reject);
  });
  socket.on('message', (raw) => {
    const message = JSON.parse(String(raw)) as HubToGame;
    received.push(message);
    if (message.type === 'effect') {
      socket.send(
        JSON.stringify({ type: 'effect.result', effectId: message.id, status: 'applied' }),
      );
    }
  });
  socket.send(
    JSON.stringify({
      type: 'hello',
      protocol: PROTOCOL_VERSION,
      role: 'game',
      token,
      integration: { id: 'simulator', name: 'Simulator', version: '0.0.0' },
      game: { id: 'simulator', name: 'Simulated game' },
      capabilities: { events: ['player.died'], effects },
    }),
  );
  return {
    received,
    die() {
      socket.send(
        JSON.stringify({
          type: 'event',
          id: crypto.randomUUID(),
          name: 'player.died',
          at: new Date().toISOString(),
        }),
      );
    },
    close() {
      socket.close();
    },
  };
}
