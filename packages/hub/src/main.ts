// Runs the hub on its own (without the desktop app): pnpm --filter @game-learning/hub start -- --pack <dir>
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { DEFAULT_PORT } from '@game-learning/protocol/discovery';
import { createHub } from './create.ts';

const { values } = parseArgs({
  allowPositionals: true,
  options: {
    pack: { type: 'string' },
    port: { type: 'string', default: String(DEFAULT_PORT) },
    cooldown: { type: 'string', default: '30' },
  },
});
if (!values.pack) {
  console.error('Usage: gl-hub --pack <content pack folder> [--port 47474] [--cooldown 30]');
  process.exit(2);
}

const log = (message: string) => console.log(`[${new Date().toLocaleTimeString()}] ${message}`);
const running = await createHub({
  // pnpm runs scripts inside the package folder; resolve the path from where the user typed it.
  packDir: resolve(process.env.INIT_CWD ?? process.cwd(), values.pack),
  port: Number(values.port),
  cooldownSeconds: Number(values.cooldown),
  log,
});
log(`hub: studying "${running.manifest.title}" (${running.questions} questions)`);

const shutdown = async () => {
  await running.stop();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
