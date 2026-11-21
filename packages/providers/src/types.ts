import type { z } from 'zod';

/** A piece of model input: text, or a binary file such as a PDF page or an image. */
export type Part = { text: string } | { file: { mimeType: string; data: Uint8Array } };

export interface GenerateRequest {
  /** Instructions that frame the task (system prompt). */
  system?: string;
  parts: Part[];
  /** Overrides the provider's default model for this call. */
  model?: string;
  temperature?: number;
}

export interface GenerateJsonRequest<T> extends GenerateRequest {
  /** The answer is validated against this schema; invalid answers are retried. */
  schema: z.ZodType<T>;
}

/** A text/vision language model. Adapters (Gemini, Claude, local models…) implement this. */
export interface LlmProvider {
  readonly id: string;
  generateText(req: GenerateRequest): Promise<string>;
  generateJson<T>(req: GenerateJsonRequest<T>): Promise<T>;
}
