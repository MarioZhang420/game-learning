import type { Question } from '@game-learning/content';
import type {
  AnswerMessage,
  ChallengeMessage,
  Effect,
  EffectResult,
  GameEvent,
  GameHello,
  HubToClient,
  StateMessage,
} from '@game-learning/protocol';
import { correctAnswer, isCorrect, toView } from './grading.ts';
import type { Mechanic } from './mechanics.ts';
import { type CardStore, QuestionScheduler } from './scheduler.ts';

/** Player progress. The hub provides a persistent implementation; tests use the in-memory one. */
export interface ProgressStore extends CardStore {
  readonly xp: number;
  readonly streak: number;
  addXp(amount: number): void;
  setStreak(streak: number): void;
}

export interface RewardRules {
  xpForCorrect: number;
  /** In-game rewards, offered only when the connected game supports the effect. */
  effects: { name: string; amount: number }[];
}

export interface EngineOptions {
  pack: { id: string; title: string; language: string };
  questions: Question[];
  store: ProgressStore;
  mechanics: Mechanic[];
  rewards: RewardRules;
  clock?: () => Date;
  newId?: () => string;
}

/** What the engine wants the hub to send. The engine itself does no IO. */
export type Outbound =
  | { to: 'clients'; message: HubToClient }
  | { to: 'game'; integrationId: string; message: Effect };

interface ConnectedGame {
  hello: GameHello;
  effects: Set<string>;
}

interface ActiveChallenge {
  message: ChallengeMessage;
  question: Question;
  integrationId: string | undefined;
}

export class Engine {
  readonly #options: EngineOptions;
  readonly #scheduler: QuestionScheduler;
  readonly #clock: () => Date;
  readonly #newId: () => string;
  readonly #games = new Map<string, ConnectedGame>();
  readonly #seenEvents: string[] = [];
  readonly #pendingEffects = new Map<
    string,
    { challengeId: string; name: string; amount: number }
  >();
  #active: ActiveChallenge | undefined;
  #lastQuestionId: string | undefined;

  constructor(options: EngineOptions) {
    this.#options = options;
    this.#scheduler = new QuestionScheduler(options.questions, options.store);
    this.#clock = options.clock ?? (() => new Date());
    this.#newId = options.newId ?? (() => crypto.randomUUID());
  }

  get activeChallenge(): ChallengeMessage | undefined {
    return this.#active?.message;
  }

  state(): StateMessage {
    return {
      type: 'state',
      games: [...this.#games.values()].map((g) => ({
        integrationId: g.hello.integration.id,
        gameName: g.hello.game.name,
        effects: [...g.effects],
      })),
      xp: this.#options.store.xp,
      streak: this.#options.store.streak,
      pack: {
        id: this.#options.pack.id,
        title: this.#options.pack.title,
        questions: this.#options.questions.length,
      },
    };
  }

  /** Messages a newly connected client needs to catch up. */
  clientConnected(): HubToClient[] {
    return this.#active ? [this.state(), this.#active.message] : [this.state()];
  }

  gameConnected(hello: GameHello): Outbound[] {
    this.#games.set(hello.integration.id, { hello, effects: new Set(hello.capabilities.effects) });
    return [{ to: 'clients', message: this.state() }];
  }

  gameDisconnected(integrationId: string): Outbound[] {
    this.#games.delete(integrationId);
    return [{ to: 'clients', message: this.state() }];
  }

  handleGameEvent(integrationId: string, event: GameEvent): Outbound[] {
    if (this.#seenEvents.includes(event.id)) return [];
    this.#seenEvents.push(event.id);
    if (this.#seenEvents.length > 200) this.#seenEvents.shift();

    const game = this.#games.get(integrationId);
    const out: Outbound[] = [];
    const now = this.#clock();
    for (const mechanic of this.#options.mechanics) {
      mechanic.onEvent(event, {
        now,
        challengeActive: this.#active !== undefined,
        gameEffects: game?.effects ?? new Set(),
        ask: (reason) => {
          if (this.#active) return;
          out.push(...this.#ask(reason, integrationId, now));
        },
      });
    }
    return out;
  }

  handleAnswer(message: AnswerMessage): Outbound[] {
    const active = this.#active;
    if (!active || active.message.id !== message.challengeId) return [];
    this.#active = undefined;

    const { question } = active;
    const correct = isCorrect(question, message.answer);
    const now = this.#clock();
    this.#scheduler.record(question.id, correct, now);
    const store = this.#options.store;
    store.setStreak(correct ? store.streak + 1 : 0);

    const out: Outbound[] = [];
    const rewards: { kind: 'xp' | 'effect'; name: string; amount: number }[] = [];
    if (correct) {
      for (const offer of active.message.offer) {
        if (offer.kind === 'xp') {
          store.addXp(offer.amount);
          rewards.push(offer);
        } else if (
          active.integrationId &&
          this.#games.get(active.integrationId)?.effects.has(offer.name)
        ) {
          const effectId = this.#newId();
          this.#pendingEffects.set(effectId, {
            challengeId: active.message.id,
            name: offer.name,
            amount: offer.amount,
          });
          out.push({
            to: 'game',
            integrationId: active.integrationId,
            message: {
              type: 'effect',
              id: effectId,
              name: offer.name,
              params: { amount: offer.amount },
            },
          });
        }
      }
    }

    out.unshift({
      to: 'clients',
      message: {
        type: 'feedback',
        challengeId: active.message.id,
        correct,
        correctAnswer: correctAnswer(question),
        explanation: question.explanation,
        rewards,
      },
    });
    out.push({ to: 'clients', message: this.state() });
    return out;
  }

  handleDismiss(challengeId: string): Outbound[] {
    if (this.#active?.message.id !== challengeId) return [];
    this.#active = undefined;
    return [{ to: 'clients', message: this.state() }];
  }

  handleEffectResult(result: EffectResult): Outbound[] {
    const pending = this.#pendingEffects.get(result.effectId);
    if (!pending) return [];
    this.#pendingEffects.delete(result.effectId);
    return [
      {
        to: 'clients',
        message: {
          type: 'reward',
          challengeId: pending.challengeId,
          name: pending.name,
          amount: pending.amount,
          status: result.status,
        },
      },
    ];
  }

  #ask(reason: string, integrationId: string | undefined, now: Date): Outbound[] {
    const question = this.#scheduler.next(now, this.#lastQuestionId);
    this.#lastQuestionId = question.id;
    const game = integrationId ? this.#games.get(integrationId) : undefined;
    const { rewards } = this.#options;
    const message: ChallengeMessage = {
      type: 'challenge',
      id: this.#newId(),
      reason,
      language: this.#options.pack.language,
      view: toView(question),
      offer: [
        { kind: 'xp', name: 'xp', amount: rewards.xpForCorrect },
        ...rewards.effects
          .filter((e) => game?.effects.has(e.name))
          .map((e) => ({ kind: 'effect' as const, name: e.name, amount: e.amount })),
      ],
    };
    this.#active = { message, question, integrationId };
    return [{ to: 'clients', message }];
  }
}

export class MemoryProgressStore implements ProgressStore {
  xp = 0;
  streak = 0;
  readonly cards = new Map<string, import('ts-fsrs').CardInput>();
  getCard(id: string) {
    return this.cards.get(id);
  }
  setCard(id: string, card: import('ts-fsrs').Card) {
    this.cards.set(id, card);
  }
  addXp(amount: number) {
    this.xp += amount;
  }
  setStreak(streak: number) {
    this.streak = streak;
  }
}
