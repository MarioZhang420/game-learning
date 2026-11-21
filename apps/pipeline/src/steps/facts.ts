import { type Fact, FactKind } from '@game-learning/content';
import { z } from 'zod';
import { audienceText, range, type StepContext, selectedUnits } from '../context.ts';
import { FACTS_SYSTEM, pagesAsText } from '../prompts.ts';

const DraftFact = z.object({
  statement: z.string(),
  kind: FactKind,
  pages: z.array(z.number().int()),
  importance: z.enum(['core', 'supporting']),
});

/** Step 2: list every piece of knowledge, lesson by lesson. This list is the "nothing lost" ledger. */
export async function facts(ctx: StepContext): Promise<void> {
  const existing = ctx.pack.has('facts.json') ? await ctx.pack.readFacts() : [];
  let all = existing;
  for (const unit of selectedUnits(ctx)) {
    for (const lesson of unit.lessons) {
      const done = existing.some((f) => f.lessonId === lesson.id);
      if (done && !ctx.force) continue;
      const pages = await Promise.all(range(lesson.pages).map((p) => ctx.pack.readSourcePage(p)));
      const result = await ctx.llm.generateJson({
        system: FACTS_SYSTEM,
        schema: z.object({ facts: z.array(DraftFact) }),
        temperature: 0,
        parts: [
          {
            text: `Audience: ${audienceText(ctx.manifest)}.\nUnit: ${unit.title}\nLesson: ${lesson.title}\n\n${pagesAsText(pages)}`,
          },
        ],
      });
      const lessonFacts: Fact[] = result.facts.map((f, i) => ({
        ...f,
        id: `${lesson.id}-f${String(i + 1).padStart(2, '0')}`,
        unitId: unit.id,
        lessonId: lesson.id,
      }));
      all = [...all.filter((f) => f.lessonId !== lesson.id), ...lessonFacts];
      await ctx.pack.writeFacts(all);
      ctx.log(`facts: ${lesson.id} → ${lessonFacts.length} facts`);
    }
  }
}
