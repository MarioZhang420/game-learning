import type { Question } from '@game-learning/content';
import { type Card, type CardInput, createEmptyCard, fsrs, Rating } from 'ts-fsrs';

/**
 * Spaced repetition with FSRS (the algorithm Anki uses).
 * Each question has a card; a right answer pushes it further into the future, a wrong one brings it back soon.
 */
export interface CardStore {
  getCard(questionId: string): CardInput | undefined;
  setCard(questionId: string, card: Card): void;
}

export class QuestionScheduler {
  readonly #fsrs = fsrs({ enable_fuzz: true });
  readonly #questions: Question[];
  readonly #store: CardStore;

  constructor(questions: Question[], store: CardStore) {
    if (questions.length === 0) throw new Error('QuestionScheduler needs at least one question');
    this.#questions = questions;
    this.#store = store;
  }

  /**
   * Picks the next question: the most overdue one first, then a new one in pack order,
   * then whichever comes due soonest. `exclude` avoids repeating the question just asked.
   */
  next(now: Date, exclude?: string): Question {
    const candidates = this.#questions.filter((q) => q.id !== exclude);
    const pool = candidates.length > 0 ? candidates : this.#questions;
    let soonest: { q: Question; due: number } | undefined;
    let overdue: { q: Question; due: number } | undefined;
    for (const q of pool) {
      const card = this.#store.getCard(q.id);
      if (!card) continue;
      const due = new Date(card.due).getTime();
      if (due <= now.getTime() && (!overdue || due < overdue.due)) overdue = { q, due };
      if (!soonest || due < soonest.due) soonest = { q, due };
    }
    if (overdue) return overdue.q;
    const fresh = pool.find((q) => !this.#store.getCard(q.id));
    return fresh ?? soonest?.q ?? (pool[0] as Question);
  }

  record(questionId: string, correct: boolean, now: Date): void {
    const card = this.#store.getCard(questionId) ?? createEmptyCard(now);
    const result = this.#fsrs.next(card, now, correct ? Rating.Good : Rating.Again);
    this.#store.setCard(questionId, result.card);
  }
}
