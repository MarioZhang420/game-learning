// A fake game and a terminal client, so anyone can work on the project without owning a game.
//   pnpm --filter @game-learning/simulator start          → fake game: press d = die, b = bench, q = quit
//   pnpm --filter @game-learning/simulator start --client → terminal overlay: answer with number keys
import { readFileSync } from 'node:fs';
import { emitKeypressEvents } from 'node:readline';
import { parseArgs } from 'node:util';
import { HubToClient, HubToGame, PROTOCOL_VERSION } from '@game-learning/protocol';
import { Discovery, discoveryFile } from '@game-learning/protocol/discovery';
import WebSocket from 'ws';

const { values } = parseArgs({
  allowPositionals: true,
  options: { client: { type: 'boolean', default: false } },
});
const discovery = Discovery.parse(JSON.parse(readFileSync(discoveryFile(), 'utf8')));
const socket = new WebSocket(`ws://127.0.0.1:${discovery.port}/`);
const send = (message: unknown) => socket.send(JSON.stringify(message));

socket.on('open', () => {
  if (values.client) {
    send({
      type: 'hello',
      protocol: PROTOCOL_VERSION,
      role: 'client',
      token: discovery.token,
      client: { id: 'terminal', name: 'Terminal client', version: '0.0.0' },
    });
  } else {
    send({
      type: 'hello',
      protocol: PROTOCOL_VERSION,
      role: 'game',
      token: discovery.token,
      integration: { id: 'simulator', name: 'Simulator', version: '0.0.0' },
      game: { id: 'simulator', name: 'Simulated game' },
      capabilities: { events: ['player.died', 'player.rested'], effects: ['currency.grant'] },
    });
  }
});
socket.on('close', (code, reason) => {
  console.log(`disconnected (${code} ${reason})`);
  process.exit(0);
});

let currentChallenge: Extract<HubToClient, { type: 'challenge' }> | undefined;

socket.on('message', (raw) => {
  const data: unknown = JSON.parse(String(raw));
  if (values.client) {
    const message = HubToClient.parse(data);
    if (message.type === 'challenge') {
      currentChallenge = message;
      console.log(`\n❓ (${message.reason}) ${message.view.prompt}`);
      if (message.view.kind === 'multiple-choice') {
        for (const [i, c] of message.view.choices.entries()) console.log(`   ${i + 1}) ${c}`);
      } else {
        console.log('   1) صح / true   2) خطأ / false');
      }
      console.log(`   reward: ${message.offer.map((o) => `${o.amount} ${o.name}`).join(' + ')}`);
    } else if (message.type === 'feedback') {
      console.log(`${message.correct ? '✅' : '❌'} ${message.explanation}`);
    } else if (message.type === 'reward') {
      console.log(`🎁 ${message.amount} ${message.name}: ${message.status}`);
    } else if (message.type === 'state') {
      console.log(
        `state: xp ${message.xp}, streak ${message.streak}, games: ${message.games.map((g) => g.gameName).join(', ') || 'none'}`,
      );
    } else {
      console.log(message);
    }
  } else {
    const message = HubToGame.parse(data);
    console.log(message);
    if (message.type === 'effect') {
      // A real game would apply it; the simulator just confirms.
      send({ type: 'effect.result', effectId: message.id, status: 'applied' });
    }
  }
});

emitKeypressEvents(process.stdin);
if (process.stdin.isTTY) process.stdin.setRawMode(true);
process.stdin.on('keypress', (_text: string, key: { name?: string; ctrl?: boolean }) => {
  if (key.name === 'q' || (key.ctrl && key.name === 'c')) process.exit(0);
  if (values.client) {
    const n = Number(key.name);
    if (!currentChallenge || !Number.isInteger(n) || n < 1) return;
    const answer =
      currentChallenge.view.kind === 'multiple-choice'
        ? { kind: 'choice', index: n - 1 }
        : { kind: 'boolean', value: n === 1 };
    send({ type: 'answer', challengeId: currentChallenge.id, answer });
    currentChallenge = undefined;
    return;
  }
  const name = key.name === 'd' ? 'player.died' : key.name === 'b' ? 'player.rested' : undefined;
  if (!name) return;
  send({ type: 'event', id: crypto.randomUUID(), name, at: new Date().toISOString() });
  console.log(`sent ${name}`);
});
console.log(
  values.client
    ? 'terminal client: answer with 1-4, q quits'
    : 'simulator: d = die, b = bench, q = quit',
);
