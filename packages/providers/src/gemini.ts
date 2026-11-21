import { ApiError, GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import type { GenerateJsonRequest, GenerateRequest, LlmProvider, Part } from './types.ts';

export interface GeminiOptions {
  /** One or more API keys. Later keys are used when earlier ones hit a quota or fail. */
  apiKeys: string[];
  model: string;
  /** Maximum attempts per request across all keys before giving up. */
  maxAttempts?: number;
  log?: (message: string) => void;
}

const RETRYABLE = new Set([408, 429, 500, 502, 503, 504]);

/** Reads GEMINI_API_KEY, GEMINI_API_KEY1, GEMINI_API_KEY2, … from the environment. */
export function geminiKeysFromEnv(env: NodeJS.ProcessEnv = process.env): string[] {
  return Object.keys(env)
    .filter((name) => /^GEMINI_API_KEY\d*$/.test(name))
    .sort()
    .map((name) => env[name]?.trim() ?? '')
    .filter((key) => key.length > 0);
}

export class GeminiProvider implements LlmProvider {
  readonly id = 'gemini';
  readonly #clients: GoogleGenAI[];
  readonly #model: string;
  readonly #maxAttempts: number;
  readonly #log: (message: string) => void;
  #current = 0;

  constructor(options: GeminiOptions) {
    if (options.apiKeys.length === 0) throw new Error('GeminiProvider needs at least one API key');
    this.#clients = options.apiKeys.map(
      (apiKey) => new GoogleGenAI({ apiKey, apiVersion: 'v1beta' }),
    );
    this.#model = options.model;
    this.#maxAttempts = options.maxAttempts ?? 6;
    this.#log = options.log ?? (() => {});
  }

  async generateText(req: GenerateRequest): Promise<string> {
    return this.#call(req);
  }

  async generateJson<T>(req: GenerateJsonRequest<T>): Promise<T> {
    const jsonSchema = z.toJSONSchema(req.schema, { target: 'draft-2020-12' });
    let lastError: unknown;
    for (let attempt = 1; attempt <= 2; attempt++) {
      const text = await this.#call(req, jsonSchema);
      try {
        return req.schema.parse(JSON.parse(text));
      } catch (error) {
        lastError = error;
        this.#log(`gemini: answer did not match the schema (attempt ${attempt}), retrying`);
      }
    }
    throw new Error(`Gemini returned invalid JSON twice: ${String(lastError)}`);
  }

  async #call(req: GenerateRequest, jsonSchema?: unknown): Promise<string> {
    const model = req.model ?? this.#model;
    let delayMs = 15_000;
    for (let attempt = 1; ; attempt++) {
      const client = this.#clients[this.#current % this.#clients.length] as GoogleGenAI;
      try {
        const response = await client.models.generateContent({
          model,
          contents: [{ role: 'user', parts: req.parts.map(toGeminiPart) }],
          config: {
            ...(req.system ? { systemInstruction: req.system } : {}),
            ...(req.temperature === undefined ? {} : { temperature: req.temperature }),
            ...(jsonSchema
              ? { responseMimeType: 'application/json', responseJsonSchema: jsonSchema }
              : {}),
          },
        });
        const text = response.text;
        if (!text)
          throw new Error(
            `Gemini returned no text (finish: ${response.candidates?.[0]?.finishReason})`,
          );
        return text;
      } catch (error) {
        const status = error instanceof ApiError ? error.status : undefined;
        const retryable = status === undefined || RETRYABLE.has(status);
        if (!retryable || attempt >= this.#maxAttempts) throw error;
        if (this.#clients.length > 1) this.#current++;
        const wait = status === 429 && this.#current % this.#clients.length !== 0 ? 1_000 : delayMs;
        this.#log(
          `gemini: ${status ?? 'error'} on attempt ${attempt}, retrying in ${Math.round(wait / 1000)}s`,
        );
        await new Promise((resolve) => setTimeout(resolve, wait));
        if (wait === delayMs) delayMs = Math.min(delayMs * 2, 120_000);
      }
    }
  }
}

function toGeminiPart(part: Part) {
  if ('text' in part) return { text: part.text };
  return {
    inlineData: {
      mimeType: part.file.mimeType,
      data: Buffer.from(part.file.data).toString('base64'),
    },
  };
}
