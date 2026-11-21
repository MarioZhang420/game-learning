import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { ProgressStore } from '@game-learning/core';
import type { Card, CardInput } from 'ts-fsrs';

interface ProgressFile {
  version: 1;
  xp: number;
  streak: number;
  cards: Record<string, CardInput>;
}

/**
 * Progress saved as one JSON file per content pack. Small and easy to inspect;
 * the ProgressStore interface lets us move to SQLite later without touching the engine.
 */
export class FileProgressStore implements ProgressStore {
  readonly #file: string;
  #data: ProgressFile;
  #timer: NodeJS.Timeout | undefined;

  constructor(file: string) {
    this.#file = file;
    this.#data = existsSync(file)
      ? (JSON.parse(readFileSync(file, 'utf8')) as ProgressFile)
      : { version: 1, xp: 0, streak: 0, cards: {} };
  }

  get xp() {
    return this.#data.xp;
  }
  get streak() {
    return this.#data.streak;
  }
  getCard(questionId: string) {
    return this.#data.cards[questionId];
  }
  setCard(questionId: string, card: Card) {
    this.#data.cards[questionId] = card;
    this.#save();
  }
  addXp(amount: number) {
    this.#data.xp += amount;
    this.#save();
  }
  setStreak(streak: number) {
    this.#data.streak = streak;
    this.#save();
  }

  /** Writes pending changes now (call on shutdown). */
  flush() {
    if (this.#timer) clearTimeout(this.#timer);
    this.#timer = undefined;
    mkdirSync(dirname(this.#file), { recursive: true });
    const tmp = `${this.#file}.tmp`;
    writeFileSync(tmp, JSON.stringify(this.#data, null, 2));
    renameSync(tmp, this.#file);
  }

  #save() {
    if (this.#timer) return;
    this.#timer = setTimeout(() => this.flush(), 500);
  }
}
