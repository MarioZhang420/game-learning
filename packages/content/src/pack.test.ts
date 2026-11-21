import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from 'vitest';
import { Pack } from './pack.ts';

const examples = resolve(import.meta.dirname, '../../../content/examples');
const packNames = readdirSync(examples, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

test('the repository contains example packs', () => {
  expect(packNames.length).toBeGreaterThan(0);
});

test.each(packNames)('example pack %s is valid and covers every fact', async (name) => {
  const pack = new Pack(resolve(examples, name));
  const [, facts, questions] = await Promise.all([
    pack.manifest(),
    pack.readFacts(),
    pack.readQuestions(),
  ]);
  const factIds = new Set(facts.map((fact) => fact.id));
  const covered = new Set<string>();

  for (const question of questions) {
    for (const id of question.factIds) {
      expect(factIds.has(id), `Question ${question.id} references unknown fact ${id}`).toBe(true);
      covered.add(id);
    }
  }
  expect(
    [...factIds].filter((id) => !covered.has(id)),
    'Facts without questions',
  ).toEqual([]);
});
