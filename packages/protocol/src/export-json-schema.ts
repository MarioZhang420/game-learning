// Writes JSON Schema files for integrations written in other languages (C#, Java, …).
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { z } from 'zod';
import { Discovery } from './discovery.ts';
import { ClientHello, ClientToHub, GameHello, GameToHub, HubToClient, HubToGame } from './index.ts';

const outDir = join(import.meta.dirname, '..', 'schema');
const schemas = {
  GameHello,
  GameToHub,
  HubToGame,
  ClientHello,
  ClientToHub,
  HubToClient,
  Discovery,
};

await mkdir(outDir, { recursive: true });
for (const [name, schema] of Object.entries(schemas)) {
  const json = z.toJSONSchema(schema, { target: 'draft-2020-12' });
  await writeFile(join(outDir, `${name}.schema.json`), `${JSON.stringify(json, null, 2)}\n`);
}
console.log(`Wrote ${Object.keys(schemas).length} schemas to ${outDir}`);
