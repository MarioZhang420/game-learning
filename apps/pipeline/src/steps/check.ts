import type { CoverageReport } from '@game-learning/content';
import type { StepContext } from '../context.ts';
import { renderLesson } from '../render.ts';

/**
 * Offline check, no AI: validates every file in the pack, re-renders the lesson Markdown,
 * and reports facts that no lesson teaches or no question tests.
 * Works the same whether the pack was written by the AI steps or by a person.
 */
export async function check(ctx: StepContext): Promise<CoverageReport> {
  const facts = await ctx.pack.readFacts();
  const lessons = await ctx.pack.readLessons();
  const questions = ctx.pack.has('questions.json') ? await ctx.pack.readQuestions() : [];
  const units = new Set(
    ctx.manifest.units.filter((u) => !ctx.unit || u.id === ctx.unit).map((u) => u.id),
  );
  const scopeFacts = facts.filter((f) => units.has(f.unitId));
  const known = new Set(facts.map((f) => f.id));

  const ids = facts.map((f) => f.id);
  const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (duplicates.length) ctx.log(`check: duplicate fact ids: ${duplicates.join(', ')}`);

  for (const lesson of lessons) {
    await ctx.pack.writeLesson(lesson, renderLesson(lesson, ctx.manifest.language));
  }

  const taught = new Set(lessons.flatMap((l) => l.sections.flatMap((s) => s.factIds)));
  const tested = new Set(questions.flatMap((q) => q.factIds));
  const cited = [...taught, ...tested];
  const unknown = [...new Set(cited.filter((id) => !known.has(id)))];

  for (const q of questions) {
    if (q.type === 'multiple-choice' && q.answerIndex >= q.choices.length) {
      ctx.log(`check: ${q.id} answerIndex is out of range`);
    }
  }

  const untested = scopeFacts.filter((f) => !tested.has(f.id)).map((f) => f.id);
  const previous = ctx.pack.has('coverage.json') ? await ctx.pack.readCoverage() : undefined;
  const report: CoverageReport = {
    totalFacts: scopeFacts.length,
    coveredFacts: scopeFacts.filter((f) => taught.has(f.id)).length,
    missingFactIds: scopeFacts.filter((f) => !taught.has(f.id)).map((f) => f.id),
    unknownFactIds: unknown,
    // Faithfulness issues come from a review (AI `verify` or a person); keep them.
    issues: previous?.issues ?? [],
  };
  await ctx.pack.writeCoverage(report);

  ctx.log(
    `check: ${lessons.length} lessons, ${questions.length} questions, ` +
      `${report.coveredFacts}/${report.totalFacts} facts taught, ` +
      `${scopeFacts.length - untested.length}/${scopeFacts.length} facts tested`,
  );
  if (report.missingFactIds.length)
    ctx.log(`check: not taught: ${report.missingFactIds.join(', ')}`);
  if (untested.length) ctx.log(`check: not tested: ${untested.join(', ')}`);
  if (unknown.length) ctx.log(`check: unknown fact ids: ${unknown.join(', ')}`);
  return report;
}
