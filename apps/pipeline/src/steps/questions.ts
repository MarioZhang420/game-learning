import { Question } from '@game-learning/content';
import { z } from 'zod';
import { audienceText, type StepContext, selectedUnits } from '../context.ts';
import { factsAsText, QUESTIONS_SYSTEM } from '../prompts.ts';
import { renderLesson } from '../render.ts';

// Gemini's structured output handles flat objects best, so ask for one shape and convert.
const DraftQuestion = z.object({
  type: z.enum(['multiple-choice', 'true-false']),
  factIds: z.array(z.string()).min(1),
  prompt: z.string(),
  choices: z.array(z.string()).describe('3-4 choices for multiple-choice, empty for true-false'),
  answerIndex: z.number().int().describe('Index of the correct choice; -1 for true-false'),
  trueFalseAnswer: z.boolean().describe('The answer for true-false; false for multiple-choice'),
  explanation: z.string(),
  difficulty: z.number().int().min(1).max(3),
});

/** Step 5: write questions for every fact, linked back to the facts (and so to the pages). */
export async function questions(ctx: StepContext): Promise<void> {
  const facts = await ctx.pack.readFacts();
  const existing = ctx.pack.has('questions.json') ? await ctx.pack.readQuestions() : [];
  let all = existing;
  for (const unit of selectedUnits(ctx)) {
    for (const source of unit.lessons) {
      const prefix = `${source.id}-q`;
      if (!ctx.force && existing.some((q) => q.id.startsWith(prefix))) continue;
      const lesson = await ctx.pack.readLesson(source.id);
      const lessonFacts = facts.filter((f) => f.lessonId === source.id);
      const result = await ctx.llm.generateJson({
        system: QUESTIONS_SYSTEM,
        schema: z.object({ questions: z.array(DraftQuestion) }),
        temperature: 0.5,
        parts: [
          {
            text: [
              `Audience: ${audienceText(ctx.manifest)}.`,
              '## Facts',
              factsAsText(lessonFacts),
              '',
              '## The lesson the student studied',
              renderLesson(lesson, ctx.manifest.language),
            ].join('\n'),
          },
        ],
      });

      const known = new Set(lessonFacts.map((f) => f.id));
      const lessonQuestions: Question[] = [];
      for (const [i, q] of result.questions.entries()) {
        const parsed = toQuestion(q, `${prefix}${String(i + 1).padStart(2, '0')}`, known);
        if (parsed) lessonQuestions.push(parsed);
        else ctx.log(`questions: dropped an invalid question in ${source.id}: ${q.prompt}`);
      }

      const untested = lessonFacts.filter(
        (f) => !lessonQuestions.some((q) => q.factIds.includes(f.id)),
      );
      if (untested.length) {
        ctx.log(
          `questions: ${source.id} facts without a question: ${untested.map((f) => f.id).join(', ')}`,
        );
      }
      all = [...all.filter((q) => !q.id.startsWith(prefix)), ...lessonQuestions];
      await ctx.pack.writeQuestions(all);
      ctx.log(`questions: ${source.id} → ${lessonQuestions.length} questions`);
    }
  }
}

function toQuestion(
  q: z.infer<typeof DraftQuestion>,
  id: string,
  knownFacts: Set<string>,
): Question | undefined {
  const base = {
    id,
    factIds: q.factIds.filter((f) => knownFacts.has(f)),
    prompt: q.prompt,
    explanation: q.explanation,
    difficulty: q.difficulty,
  };
  const candidate =
    q.type === 'true-false'
      ? { ...base, type: q.type, answer: q.trueFalseAnswer }
      : { ...base, type: q.type, choices: q.choices, answerIndex: q.answerIndex };
  const parsed = Question.safeParse(candidate);
  if (!parsed.success) return undefined;
  const question = parsed.data;
  if (question.type === 'multiple-choice' && question.answerIndex >= question.choices.length) {
    return undefined;
  }
  return question;
}
