import type { GameEvent } from '@game-learning/protocol';

/**
 * A mechanic (game mode) decides WHEN to challenge the player, based on game events.
 * New modes ("boss prep", "study raid", …) implement this interface; the engine does the rest.
 */
export interface Mechanic {
  readonly id: string;
  onEvent(event: GameEvent, ctx: MechanicContext): void;
}

export interface MechanicContext {
  now: Date;
  /** True while a question is on screen; most mechanics should not stack questions. */
  challengeActive: boolean;
  /** Effects the connected game can apply (from its "hello"). */
  gameEffects: ReadonlySet<string>;
  /** Ask the next question. `reason` is shown to the player (usually the event name). */
  ask(reason: string): void;
}

export interface DeathRecoveryOptions {
  /** Minimum time between two questions, so frequent deaths do not flood the player. */
  cooldownMs: number;
}

/** After the player dies, offer a question; a right answer earns a reward. */
export class DeathRecovery implements Mechanic {
  readonly id = 'death-recovery';
  readonly #options: DeathRecoveryOptions;
  #lastAsked = Number.NEGATIVE_INFINITY;

  constructor(options: Partial<DeathRecoveryOptions> = {}) {
    this.#options = { cooldownMs: options.cooldownMs ?? 30_000 };
  }

  onEvent(event: GameEvent, ctx: MechanicContext): void {
    if (event.name !== 'player.died' || ctx.challengeActive) return;
    if (ctx.now.getTime() - this.#lastAsked < this.#options.cooldownMs) return;
    this.#lastAsked = ctx.now.getTime();
    ctx.ask(event.name);
  }
}
