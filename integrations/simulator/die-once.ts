import { readFileSync } from 'node:fs';
import { Discovery, discoveryFile } from '@game-learning/protocol/discovery';
import { connectGame } from './src/game.ts';
const d = Discovery.parse(JSON.parse(readFileSync(discoveryFile(), 'utf8')));
const game = await connectGame(d.port, d.token, ['currency.grant']);
await new Promise((r) => setTimeout(r, 300));
game.die();
await new Promise((r) => setTimeout(r, 1500));
