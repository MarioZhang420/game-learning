import { readFile } from 'node:fs/promises';
import { PDFDocument } from 'pdf-lib';

/** Loads a PDF once and cuts out page ranges as small standalone PDFs (for vision models). */
export class PdfSource {
  readonly #doc: PDFDocument;

  private constructor(doc: PDFDocument) {
    this.#doc = doc;
  }

  static async open(file: string): Promise<PdfSource> {
    return new PdfSource(await PDFDocument.load(await readFile(file), { ignoreEncryption: true }));
  }

  get pageCount(): number {
    return this.#doc.getPageCount();
  }

  /** `pdfPages` are 1-based PDF page numbers. */
  async extract(pdfPages: number[]): Promise<Uint8Array> {
    const out = await PDFDocument.create();
    const copied = await out.copyPages(
      this.#doc,
      pdfPages.map((p) => p - 1),
    );
    for (const page of copied) out.addPage(page);
    return out.save();
  }
}
