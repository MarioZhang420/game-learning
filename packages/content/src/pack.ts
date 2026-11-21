import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { z } from 'zod';
import { CoverageReport, Fact, Lesson, PackManifest, Question, SourcePage } from './schema.ts';

/** File-system access to one content pack folder. Every read is validated. */
export class Pack {
  readonly dir: string;

  constructor(dir: string) {
    this.dir = resolve(dir);
  }

  path(...segments: string[]): string {
    return join(this.dir, ...segments);
  }

  has(...segments: string[]): boolean {
    return existsSync(this.path(...segments));
  }

  async manifest(): Promise<PackManifest> {
    return this.#read(PackManifest, 'pack.json');
  }

  /** Absolute path to the source file named in the manifest. */
  async sourceFile(): Promise<string> {
    const file = (await this.manifest()).source.file;
    if (!file) throw new Error('pack.json has no source.file');
    return isAbsolute(file) ? file : this.path(file);
  }

  sourcePageFile(page: number): string[] {
    return ['source', `p${String(page).padStart(3, '0')}.json`];
  }

  readSourcePage(page: number) {
    return this.#read(SourcePage, ...this.sourcePageFile(page));
  }
  writeSourcePage(page: SourcePage) {
    return this.#write(SourcePage, page, ...this.sourcePageFile(page.page));
  }

  readFacts() {
    return this.#read(z.array(Fact), 'facts.json');
  }
  writeFacts(facts: Fact[]) {
    return this.#write(z.array(Fact), facts, 'facts.json');
  }

  readLesson(id: string) {
    return this.#read(Lesson, 'lessons', `${id}.json`);
  }
  async readLessons(): Promise<Lesson[]> {
    if (!this.has('lessons')) return [];
    const files = (await readdir(this.path('lessons'))).filter((f) => f.endsWith('.json')).sort();
    return Promise.all(files.map((f) => this.readLesson(f.slice(0, -'.json'.length))));
  }
  async writeLesson(lesson: Lesson, markdown: string) {
    await this.#write(Lesson, lesson, 'lessons', `${lesson.id}.json`);
    await writeFile(this.path('lessons', `${lesson.id}.md`), markdown, 'utf8');
  }

  readCoverage() {
    return this.#read(CoverageReport, 'coverage.json');
  }
  writeCoverage(report: CoverageReport) {
    return this.#write(CoverageReport, report, 'coverage.json');
  }

  readQuestions() {
    return this.#read(z.array(Question), 'questions.json');
  }
  writeQuestions(questions: Question[]) {
    return this.#write(z.array(Question), questions, 'questions.json');
  }

  async #read<T>(schema: z.ZodType<T>, ...segments: string[]): Promise<T> {
    const file = this.path(...segments);
    const data: unknown = JSON.parse(await readFile(file, 'utf8'));
    const result = schema.safeParse(data);
    if (!result.success) throw new Error(`${file} is invalid:\n${z.prettifyError(result.error)}`);
    return result.data;
  }

  async #write<T>(schema: z.ZodType<T>, value: T, ...segments: string[]): Promise<void> {
    const file = this.path(...segments);
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, `${JSON.stringify(schema.parse(value), null, 2)}\n`, 'utf8');
  }
}
