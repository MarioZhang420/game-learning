import { Pack, type PackManifest } from '@game-learning/content';
import type { LlmProvider } from '@game-learning/providers';

export interface StepContext {
  pack: Pack;
  manifest: PackManifest;
  llm: LlmProvider;
  /** Only process this unit id, if set. */
  unit?: string;
  /** Redo work even if the output already exists. */
  force: boolean;
  log: (message: string) => void;
}

export function selectedUnits(ctx: StepContext) {
  const units = ctx.manifest.units.filter((u) => !ctx.unit || u.id === ctx.unit);
  if (units.length === 0) throw new Error(`No unit "${ctx.unit}" in pack.json`);
  return units;
}

export function range([from, to]: readonly [number, number]): number[] {
  return Array.from({ length: to - from + 1 }, (_, i) => from + i);
}

export function audienceText(m: PackManifest): string {
  const parts = [
    m.audience.grade ? `grade ${m.audience.grade} students` : 'students',
    m.audience.ageRange ? `aged ${m.audience.ageRange}` : '',
  ];
  return `${parts.filter(Boolean).join(' ')}, studying ${m.subject}, language "${m.language}"`;
}

export { Pack };
