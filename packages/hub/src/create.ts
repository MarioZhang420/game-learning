import { join } from 'node:path';
import { Pack } from '@game-learning/content';
import { DeathRecovery, Engine } from '@game-learning/core';
import { configDir } from '@game-learning/protocol/discovery';
import { FileProgressStore } from './progress-store.ts';
import { Hub, type HubOptions } from './server.ts';

export interface CreateHubOptions extends Omit<HubOptions, 'engine'> {
  /** Folder of the content pack to study. */
  packDir: string;
  /** Seconds between two death questions. */
  cooldownSeconds?: number;
  /** Geo (or other currency) granted for a right answer, when the game supports it. */
  currencyReward?: number;
}

/** Wires a hub from a content pack with the default mechanics and rewards. */
export async function createHub(options: CreateHubOptions) {
  const pack = new Pack(options.packDir);
  const manifest = await pack.manifest();
  const questions = await pack.readQuestions();
  const store = new FileProgressStore(join(configDir(), 'progress', `${manifest.id}.json`));
  const engine = new Engine({
    pack: { id: manifest.id, title: manifest.title, language: manifest.language },
    questions,
    store,
    mechanics: [new DeathRecovery({ cooldownMs: (options.cooldownSeconds ?? 30) * 1000 })],
    rewards: {
      xpForCorrect: 10,
      effects: [{ name: 'currency.grant', amount: options.currencyReward ?? 50 }],
    },
  });
  const hub = new Hub({ ...options, engine });
  await hub.start();
  return {
    hub,
    manifest,
    questions: questions.length,
    async stop() {
      store.flush();
      await hub.stop();
    },
  };
}
