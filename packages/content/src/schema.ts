import { z } from 'zod';

/**
 * Content pack format, version 1.
 * A pack is a folder of plain files that people can read, review, translate and share:
 *
 *   pack.json             manifest (this file's PackManifest)
 *   source/pNNN.json      the original pages, transcribed (SourcePage)
 *   facts.json            every piece of knowledge in the source, with page refs (Fact[])
 *   lessons/<id>.json     the reworked lessons (Lesson)
 *   lessons/<id>.md       the same lesson rendered for reading
 *   coverage.json         check that every fact is taught and nothing was invented (CoverageReport)
 *   questions.json        challenges built from the facts (Question[])
 */
export const FORMAT_VERSION = 1;

const id = z.string().regex(/^[a-z0-9][a-z0-9-]*$/, 'lowercase id: letters, digits, dashes');

export const SourceLesson = z.object({
  id,
  title: z.string(),
  /** Inclusive printed page range in the source book. */
  pages: z.tuple([z.number().int(), z.number().int()]),
});

export const SourceUnit = z.object({
  id,
  title: z.string(),
  lessons: z.array(SourceLesson),
  /** Unit review/exercises pages, if any. */
  reviewPages: z.tuple([z.number().int(), z.number().int()]).optional(),
});

export const PackManifest = z.object({
  formatVersion: z.literal(FORMAT_VERSION),
  id,
  title: z.string(),
  /** BCP 47 language tag of the pack's content, e.g. "ar" or "en". */
  language: z.string(),
  subject: z.string(),
  audience: z.object({ grade: z.number().int().optional(), ageRange: z.string().optional() }),
  source: z.object({
    title: z.string(),
    publisher: z.string().optional(),
    /** Path to the source file, relative to the pack folder or absolute. Never committed. */
    file: z.string().optional(),
    /** PDF page number = printed page number + pageOffset. */
    pageOffset: z.number().int().default(0),
  }),
  license: z.string().optional(),
  units: z.array(SourceUnit),
});
export type PackManifest = z.infer<typeof PackManifest>;

export const SourcePage = z.object({
  page: z.number().int().describe('Printed page number'),
  text: z.string().describe('All text on the page as Markdown, in reading order'),
  figures: z
    .array(
      z.object({
        description: z.string().describe('What the picture shows and what it teaches'),
        caption: z.string().optional(),
      }),
    )
    .describe('Pictures, diagrams and tables that carry information'),
});
export type SourcePage = z.infer<typeof SourcePage>;

export const FactKind = z.enum([
  'definition',
  'fact',
  'process',
  'function',
  'classification',
  'example',
  'comparison',
  'health-advice',
  'vocabulary',
]);

export const Fact = z.object({
  id: z.string().describe('Stable id, e.g. "u1-l2-f03"'),
  unitId: z.string(),
  lessonId: z.string(),
  statement: z.string().describe('One self-contained piece of knowledge, in the pack language'),
  kind: FactKind,
  pages: z.array(z.number().int()),
  importance: z.enum(['core', 'supporting']),
});
export type Fact = z.infer<typeof Fact>;

export const SectionKind = z.enum([
  'hook',
  'explain',
  'example',
  'picture-this',
  'remember',
  'did-you-know',
  'try-it',
  'summary',
]);

export const Lesson = z.object({
  id: z.string(),
  unitId: z.string(),
  sourceLessonId: z.string(),
  title: z.string(),
  sections: z.array(
    z.object({
      kind: SectionKind,
      title: z.string().optional(),
      body: z.string().describe('Markdown'),
      factIds: z.array(z.string()).describe('Facts this section teaches'),
    }),
  ),
  keyWords: z.array(z.object({ term: z.string(), meaning: z.string() })),
});
export type Lesson = z.infer<typeof Lesson>;

export const FaithfulnessIssue = z.object({
  lessonId: z.string(),
  quote: z.string().describe('The exact text in the lesson'),
  problem: z.string(),
  kind: z.enum(['contradicts-source', 'not-in-source', 'oversimplified-wrong', 'unclear']),
  severity: z.enum(['high', 'low']),
});

export const CoverageReport = z.object({
  totalFacts: z.number().int(),
  coveredFacts: z.number().int(),
  missingFactIds: z.array(z.string()),
  unknownFactIds: z.array(z.string()),
  issues: z.array(FaithfulnessIssue),
});
export type CoverageReport = z.infer<typeof CoverageReport>;

const QuestionBase = z.object({
  id: z.string(),
  factIds: z.array(z.string()).min(1),
  prompt: z.string(),
  explanation: z.string().describe('Short, kind explanation shown after answering'),
  difficulty: z.number().int().min(1).max(3),
});

export const Question = z.discriminatedUnion('type', [
  QuestionBase.extend({
    type: z.literal('multiple-choice'),
    choices: z.array(z.string()).min(3).max(4),
    answerIndex: z.number().int().min(0),
  }),
  QuestionBase.extend({ type: z.literal('true-false'), answer: z.boolean() }),
]);
export type Question = z.infer<typeof Question>;
