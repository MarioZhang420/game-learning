import { SourcePage } from '@game-learning/content';
import { z } from 'zod';
import { range, type StepContext, selectedUnits } from '../context.ts';
import { PdfSource } from '../pdf.ts';
import { READ_SYSTEM } from '../prompts.ts';

const BATCH = 4;

/** Step 1: transcribe every page of the selected units from the page images. */
export async function read(ctx: StepContext): Promise<void> {
  const pdf = await PdfSource.open(await ctx.pack.sourceFile());
  const offset = ctx.manifest.source.pageOffset;
  const pages = selectedUnits(ctx).flatMap((u) => [
    ...u.lessons.flatMap((l) => range(l.pages)),
    ...(u.reviewPages ? range(u.reviewPages) : []),
  ]);
  const todo = [...new Set(pages)].filter(
    (p) => ctx.force || !ctx.pack.has(...ctx.pack.sourcePageFile(p)),
  );
  ctx.log(`read: ${todo.length} of ${pages.length} pages to transcribe`);

  for (let i = 0; i < todo.length; i += BATCH) {
    const batch = todo.slice(i, i + BATCH);
    const pdfBytes = await pdf.extract(batch.map((p) => p + offset));
    const result = await ctx.llm.generateJson({
      system: READ_SYSTEM,
      schema: z.object({ pages: z.array(SourcePage) }),
      temperature: 0,
      parts: [
        { file: { mimeType: 'application/pdf', data: pdfBytes } },
        {
          text: `These are printed pages ${batch.join(', ')} of "${ctx.manifest.title}", in order. Return exactly ${batch.length} pages with those page numbers.`,
        },
      ],
    });
    for (const [j, page] of result.pages.entries()) {
      const expected = batch[j];
      if (expected === undefined) break;
      await ctx.pack.writeSourcePage({ ...page, page: expected });
    }
    if (result.pages.length !== batch.length) {
      ctx.log(
        `read: expected ${batch.length} pages, got ${result.pages.length}; missing ones will be retried next run`,
      );
    }
    ctx.log(`read: pages ${batch.join(', ')} done`);
  }
}
