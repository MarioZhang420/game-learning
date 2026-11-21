import { z } from 'zod';

/**
 * Game Learning wire protocol, version 1.
 *
 * Transport: one WebSocket connection per peer to the hub at ws://127.0.0.1:<port>/.
 * Every message is a JSON object with a "type". The first message a peer sends is "hello".
 * Peers are either a GAME integration (a mod, a plugin, the simulator) or a CLIENT (an overlay, a phone screen).
 *
 * This file is the public contract. Integrations in other languages use the generated JSON Schema
 * (`pnpm --filter @game-learning/protocol schema`). Changes must stay backward compatible within v1:
 * add optional fields and new message types only.
 */
export const PROTOCOL_VERSION = '1';

const Id = z.string().min(1).max(128);
/** Namespaced names: standard ones like "player.died", game-specific ones like "hollow-knight:soul.grant". */
const Name = z.string().regex(/^([a-z0-9-]+:)?[a-z0-9-]+(\.[a-z0-9-]+)*$/);
const Data = z.record(z.string(), z.unknown());

// ─── Standard names ────────────────────────────────────────────────────────────

/** Events a game may report. Games declare which ones they support in "hello". */
export const StandardEvents = {
  playerDied: 'player.died',
  playerRested: 'player.rested',
  bossStarted: 'boss.started',
  bossEnded: 'boss.ended',
  sceneChanged: 'scene.changed',
  gamePaused: 'game.paused',
  gameResumed: 'game.resumed',
} as const;

/** Effects the hub may ask a game to apply. Games declare which ones they support in "hello". */
export const StandardEffects = {
  /** params: { amount: number } — in-game money (Geo in Hollow Knight). */
  currencyGrant: 'currency.grant',
  /** params: { amount: number } — health points / masks. */
  healthRestore: 'health.restore',
  /** params: { text: string, language: string } — show a short message in the game. */
  messageShow: 'message.show',
} as const;

// ─── Handshake ─────────────────────────────────────────────────────────────────

export const GameHello = z.object({
  type: z.literal('hello'),
  protocol: z.string(),
  role: z.literal('game'),
  /** Pairing token from the hub's discovery file. Stops web pages and strangers from connecting. */
  token: z.string(),
  integration: z.object({
    id: Id.describe('Stable id of the integration, e.g. "hollow-knight"'),
    name: z.string(),
    version: z.string(),
  }),
  game: z.object({ id: Id, name: z.string(), version: z.string().optional() }),
  capabilities: z.object({
    events: z.array(Name).describe('Event names this integration can send'),
    effects: z.array(Name).describe('Effect names this integration can apply'),
  }),
});

export const ClientHello = z.object({
  type: z.literal('hello'),
  protocol: z.string(),
  role: z.literal('client'),
  token: z.string(),
  client: z.object({ id: Id, name: z.string(), version: z.string() }),
  /** BCP 47 language the client prefers for UI text, e.g. "ar". */
  language: z.string().optional(),
});

export const Hello = z.discriminatedUnion('role', [GameHello, ClientHello]);

export const Welcome = z.object({
  type: z.literal('welcome'),
  protocol: z.string(),
  sessionId: Id,
});

export const ErrorMessage = z.object({
  type: z.literal('error'),
  code: z.enum(['bad-message', 'unauthorized', 'unsupported-protocol', 'internal']),
  message: z.string(),
});

// ─── Game ⇄ hub ───────────────────────────────────────────────────────────────

export const GameEvent = z.object({
  type: z.literal('event'),
  id: Id.describe('Unique per event, so retries can be ignored'),
  name: Name,
  /** ISO 8601 time the event happened in the game. */
  at: z.string(),
  data: Data.optional(),
});

export const Effect = z.object({
  type: z.literal('effect'),
  id: Id,
  name: Name,
  params: Data,
});

export const EffectResult = z.object({
  type: z.literal('effect.result'),
  effectId: Id,
  status: z.enum(['applied', 'rejected', 'failed']),
  message: z.string().optional(),
});

// ─── Hub ⇄ client ─────────────────────────────────────────────────────────────

/** A question as shown to the player. The answer never leaves the hub before the player answers. */
export const ChallengeView = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('multiple-choice'),
    prompt: z.string(),
    choices: z.array(z.string()),
  }),
  z.object({ kind: z.literal('true-false'), prompt: z.string() }),
]);

export const ChallengeMessage = z.object({
  type: z.literal('challenge'),
  id: Id,
  /** Why it appeared, e.g. "player.died", so the UI can say "You fell! Answer to recover." */
  reason: z.string(),
  language: z.string(),
  view: ChallengeView,
  /** Reward offered for a correct answer, already limited to what the game supports. */
  offer: z.array(
    z.object({ kind: z.enum(['xp', 'effect']), name: z.string(), amount: z.number() }),
  ),
});

export const Answer = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('choice'), index: z.number().int().min(0) }),
  z.object({ kind: z.literal('boolean'), value: z.boolean() }),
]);

export const AnswerMessage = z.object({
  type: z.literal('answer'),
  challengeId: Id,
  answer: Answer,
});

export const DismissMessage = z.object({ type: z.literal('dismiss'), challengeId: Id });

export const FeedbackMessage = z.object({
  type: z.literal('feedback'),
  challengeId: Id,
  correct: z.boolean(),
  correctAnswer: Answer,
  explanation: z.string(),
  /** Rewards actually granted. Effects appear here only after the game confirmed them. */
  rewards: z.array(
    z.object({ kind: z.enum(['xp', 'effect']), name: z.string(), amount: z.number() }),
  ),
});

/** Sent when the game confirms (or refuses) an in-game reward after feedback was shown. */
export const RewardMessage = z.object({
  type: z.literal('reward'),
  challengeId: Id,
  name: z.string(),
  amount: z.number(),
  status: z.enum(['applied', 'rejected', 'failed']),
});

export const StateMessage = z.object({
  type: z.literal('state'),
  games: z.array(
    z.object({ integrationId: z.string(), gameName: z.string(), effects: z.array(z.string()) }),
  ),
  xp: z.number(),
  streak: z.number(),
  pack: z.object({ id: z.string(), title: z.string(), questions: z.number() }).optional(),
});

// ─── Unions per direction ─────────────────────────────────────────────────────

export const GameToHub = z.discriminatedUnion('type', [GameEvent, EffectResult]);
export const HubToGame = z.discriminatedUnion('type', [Welcome, ErrorMessage, Effect]);
export const ClientToHub = z.discriminatedUnion('type', [AnswerMessage, DismissMessage]);
export const HubToClient = z.discriminatedUnion('type', [
  Welcome,
  ErrorMessage,
  StateMessage,
  ChallengeMessage,
  FeedbackMessage,
  RewardMessage,
]);

export type GameHello = z.infer<typeof GameHello>;
export type ClientHello = z.infer<typeof ClientHello>;
export type Hello = z.infer<typeof Hello>;
export type Welcome = z.infer<typeof Welcome>;
export type ErrorMessage = z.infer<typeof ErrorMessage>;
export type GameEvent = z.infer<typeof GameEvent>;
export type Effect = z.infer<typeof Effect>;
export type EffectResult = z.infer<typeof EffectResult>;
export type ChallengeView = z.infer<typeof ChallengeView>;
export type ChallengeMessage = z.infer<typeof ChallengeMessage>;
export type Answer = z.infer<typeof Answer>;
export type AnswerMessage = z.infer<typeof AnswerMessage>;
export type FeedbackMessage = z.infer<typeof FeedbackMessage>;
export type RewardMessage = z.infer<typeof RewardMessage>;
export type StateMessage = z.infer<typeof StateMessage>;
export type GameToHub = z.infer<typeof GameToHub>;
export type HubToGame = z.infer<typeof HubToGame>;
export type ClientToHub = z.infer<typeof ClientToHub>;
export type HubToClient = z.infer<typeof HubToClient>;
