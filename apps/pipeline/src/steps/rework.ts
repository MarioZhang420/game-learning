import { type Fact, Lesson } from '@game-learning/content';
import { audienceText, range, type StepContext, selectedUnits } from '../context.ts';
import { factsAsText, pagesAsText, REWORK_SYSTEM } from '../prompts.ts';
import { renderLesson } from '../render.ts';

const DraftLesson = Lesson.omit({ id: true, unitId: true, sourceLessonId: true });

/** Step 3: rewrite each lesson so it is easy to understand and remember, keeping every fact. */
export async function rework(ctx: StepContext): Promise<void> {
  const allFacts = await ctx.pack.readFacts();
  for (const unit of selectedUnits(ctx)) {
    for (const source of unit.lessons) {
      if (!ctx.force && ctx.pack.has('lessons', `${source.id}.json`)) continue;
      const facts = allFacts.filter((f) => f.lessonId === source.id);
      const pages = await Promise.all(range(source.pages).map((p) => ctx.pack.readSourcePage(p)));
      const draft = await ctx.llm.generateJson({
        system: REWORK_SYSTEM,
        schema: DraftLesson,
        temperature: 0.7,
        parts: [
          {
            text: [
              `Audience: ${audienceText(ctx.manifest)}.`,
              `Unit: ${unit.title}`,
              `Lesson: ${source.title}`,
              '',
              '## Facts that MUST all be taught (cite their ids)',
              factsAsText(facts),
              '',
              '## Original pages',
              pagesAsText(pages),
            ].join('\n'),
          },
        ],
      });
      const lesson: Lesson = {
        ...draft,
        id: source.id,
        unitId: unit.id,
        sourceLessonId: source.id,
      };
      warnUnknownFacts(ctx, lesson, facts);
      await ctx.pack.writeLesson(lesson, renderLesson(lesson, ctx.manifest.language));
      ctx.log(`rework: ${lesson.id} → ${lesson.sections.length} sections`);
    }
  }
}

function warnUnknownFacts(ctx: StepContext, lesson: Lesson, facts: Fact[]) {
  const known = new Set(facts.map((f) => f.id));
  const unknown = lesson.sections.flatMap((s) => s.factIds).filter((id) => !known.has(id));
  if (unknown.length) ctx.log(`rework: ${lesson.id} cites unknown fact ids: ${unknown.join(', ')}`);
}
