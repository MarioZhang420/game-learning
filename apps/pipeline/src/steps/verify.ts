import { type CoverageReport, FaithfulnessIssue } from '@game-learning/content';
import { z } from 'zod';
import { range, type StepContext, selectedUnits } from '../context.ts';
import { factsAsText, pagesAsText, VERIFY_SYSTEM } from '../prompts.ts';
import { renderLesson } from '../render.ts';

/**
 * Step 4: prove nothing was lost and nothing was made up.
 * Coverage is checked by code; faithfulness (no invented or changed facts) by a second model pass.
 */
export async function verify(ctx: StepContext): Promise<CoverageReport> {
  const facts = await ctx.pack.readFacts();
  const units = new Set(selectedUnits(ctx).map((u) => u.id));
  const scopeFacts = facts.filter((f) => units.has(f.unitId));
  const lessons = (await ctx.pack.readLessons()).filter((l) => units.has(l.unitId));

  const cited = new Set(lessons.flatMap((l) => l.sections.flatMap((s) => s.factIds)));
  const known = new Set(scopeFacts.map((f) => f.id));
  const issues: z.infer<typeof FaithfulnessIssue>[] = [];

  for (const unit of selectedUnits(ctx)) {
    for (const source of unit.lessons) {
      const lesson = lessons.find((l) => l.sourceLessonId === source.id);
      if (!lesson) continue;
      const pages = await Promise.all(range(source.pages).map((p) => ctx.pack.readSourcePage(p)));
      const result = await ctx.llm.generateJson({
        system: VERIFY_SYSTEM,
        schema: z.object({ issues: z.array(FaithfulnessIssue.omit({ lessonId: true })) }),
        temperature: 0,
        parts: [
          {
            text: [
              '## Original pages',
              pagesAsText(pages),
              '',
              '## Facts ledger',
              factsAsText(scopeFacts.filter((f) => f.lessonId === source.id)),
              '',
              '## Reworked lesson',
              renderLesson(lesson, ctx.manifest.language),
            ].join('\n'),
          },
        ],
      });
      issues.push(...result.issues.map((i) => ({ ...i, lessonId: lesson.id })));
      ctx.log(`verify: ${lesson.id} → ${result.issues.length} issue(s)`);
    }
  }

  const report: CoverageReport = {
    totalFacts: scopeFacts.length,
    coveredFacts: scopeFacts.filter((f) => cited.has(f.id)).length,
    missingFactIds: scopeFacts.filter((f) => !cited.has(f.id)).map((f) => f.id),
    unknownFactIds: [...cited].filter((id) => !known.has(id)),
    issues,
  };
  await ctx.pack.writeCoverage(report);
  const serious = issues.filter((i) => i.severity === 'high').length;
  ctx.log(
    `verify: ${report.coveredFacts}/${report.totalFacts} facts taught, ${report.missingFactIds.length} missing, ${serious} serious issue(s)`,
  );
  return report;
}
