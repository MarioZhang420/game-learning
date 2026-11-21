#!/usr/bin/env -S npx tsx
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { Pack } from '@game-learning/content';
import { GeminiProvider, geminiKeysFromEnv } from '@game-learning/providers';
import { Command } from 'commander';
import type { StepContext } from './context.ts';
import { check } from './steps/check.ts';
import { facts } from './steps/facts.ts';
import { questions } from './steps/questions.ts';
import { read } from './steps/read.ts';
import { rework } from './steps/rework.ts';
import { verify } from './steps/verify.ts';

const STEPS = { read, facts, rework, verify, questions, check } as const;
type StepName = keyof typeof STEPS;

loadEnv();

const program = new Command()
  .name('gl-pipeline')
  .description('Turn a book into a content pack: read → facts → rework → verify → questions')
  .argument('<step>', `one of: ${Object.keys(STEPS).join(', ')}, all`)
  .requiredOption('-p, --pack <dir>', 'content pack folder (contains pack.json)')
  .option('-u, --unit <id>', 'only this unit')
  .option('-m, --model <name>', 'model name', process.env.GL_MODEL ?? 'gemini-flash-latest')
  .option('-f, --force', 'redo steps even if their output exists', false)
  .action(
    async (step: string, opts: { pack: string; unit?: string; model: string; force: boolean }) => {
      const names: StepName[] =
        step === 'all' ? (Object.keys(STEPS) as StepName[]) : [assertStep(step)];
      const log = (message: string) =>
        console.log(`[${new Date().toLocaleTimeString()}] ${message}`);
      const pack = new Pack(opts.pack);
      const ctx: StepContext = {
        pack,
        manifest: await pack.manifest(),
        llm: new GeminiProvider({ apiKeys: geminiKeysFromEnv(), model: opts.model, log }),
        force: opts.force,
        log,
        ...(opts.unit ? { unit: opts.unit } : {}),
      };
      log(`pack "${ctx.manifest.title}", model ${opts.model}`);
      for (const name of names) await STEPS[name](ctx);
    },
  );

await program.parseAsync();

function assertStep(step: string): StepName {
  if (step in STEPS) return step as StepName;
  throw new Error(`Unknown step "${step}". Use one of: ${Object.keys(STEPS).join(', ')}, all`);
}

/** Loads the repo-root .env (secrets stay out of the shell history and out of git). */
function loadEnv() {
  for (let dir = process.cwd(), i = 0; i < 5; i++, dir = resolve(dir, '..')) {
    const file = resolve(dir, '.env');
    if (existsSync(file)) {
      process.loadEnvFile(file);
      return;
    }
  }
}
