import type { Question } from '@game-learning/content';
import type { GameEvent, GameHello } from '@game-learning/protocol';
import { describe, expect, it } from 'vitest';
import { Engine, MemoryProgressStore } from './engine.ts';
import { DeathRecovery } from './mechanics.ts';

const questions: Question[] = [
  {
    id: 'q1',
    type: 'multiple-choice',
    factIds: ['f1'],
    prompt: 'ما وحدة بناء الكائن الحي؟',
    choices: ['الحجر', 'الخلية', 'العدسة'],
    answerIndex: 1,
    explanation: 'الخلية.',
    difficulty: 1,
  },
  {
    id: 'q2',
    type: 'true-false',
    factIds: ['f2'],
    prompt: 'العظام صلبة.',
    answer: true,
    explanation: 'نعم.',
    difficulty: 1,
  },
];

const hello = (effects: string[]): GameHello => ({
  type: 'hello',
  protocol: '1',
  role: 'game',
  token: 't',
  integration: { id: 'sim', name: 'Simulator', version: '0' },
  game: { id: 'sim', name: 'Sim' },
  capabilities: { events: ['player.died'], effects },
});

let eventCounter = 0;
const died = (): GameEvent => ({
  type: 'event',
  id: `e${++eventCounter}`,
  name: 'player.died',
  at: new Date().toISOString(),
});

function setup(effects: string[] = []) {
  let now = new Date('2026-11-21T12:00:00Z');
  let ids = 0;
  const store = new MemoryProgressStore();
  const engine = new Engine({
    pack: { id: 'p', title: 'P', language: 'ar' },
    questions,
    store,
    mechanics: [new DeathRecovery({ cooldownMs: 10_000 })],
    rewards: { xpForCorrect: 10, effects: [{ name: 'currency.grant', amount: 50 }] },
    clock: () => now,
    newId: () => `id${++ids}`,
  });
  engine.gameConnected(hello(effects));
  return { engine, store, advance: (ms: number) => (now = new Date(now.getTime() + ms)) };
}

describe('Engine', () => {
  it('asks a question when the player dies, without revealing the answer', () => {
    const { engine } = setup();
    const out = engine.handleGameEvent('sim', died());
    expect(out).toHaveLength(1);
    const message = out[0]?.message;
    expect(message?.type).toBe('challenge');
    expect(JSON.stringify(message)).not.toContain('answerIndex');
  });

  it('does not stack questions and respects the cooldown', () => {
    const { engine, advance } = setup();
    const first = engine.handleGameEvent('sim', died())[0]?.message;
    expect(engine.handleGameEvent('sim', died())).toHaveLength(0);
    if (first?.type !== 'challenge') throw new Error('expected challenge');
    engine.handleDismiss(first.id);
    advance(5_000);
    expect(engine.handleGameEvent('sim', died())).toHaveLength(0);
    advance(6_000);
    expect(engine.handleGameEvent('sim', died())).toHaveLength(1);
  });

  it('ignores a repeated event id', () => {
    const { engine } = setup();
    const event = died();
    expect(engine.handleGameEvent('sim', event)).toHaveLength(1);
    const challenge = engine.activeChallenge;
    if (challenge) engine.handleDismiss(challenge.id);
    expect(engine.handleGameEvent('sim', event)).toHaveLength(0);
  });

  it('grants XP for a correct answer and resets the streak on a wrong one', () => {
    const { engine, store, advance } = setup();
    engine.handleGameEvent('sim', died());
    const c1 = engine.activeChallenge;
    if (!c1) throw new Error('no challenge');
    const out = engine.handleAnswer({
      type: 'answer',
      challengeId: c1.id,
      answer: { kind: 'choice', index: 1 },
    });
    expect(out[0]?.message).toMatchObject({ type: 'feedback', correct: true });
    expect(store.xp).toBe(10);
    expect(store.streak).toBe(1);

    advance(20_000);
    engine.handleGameEvent('sim', died());
    const c2 = engine.activeChallenge;
    if (!c2) throw new Error('no challenge');
    expect(c2.view.prompt).toBe('العظام صلبة.'); // does not repeat the question just asked
    engine.handleAnswer({
      type: 'answer',
      challengeId: c2.id,
      answer: { kind: 'boolean', value: false },
    });
    expect(store.xp).toBe(10);
    expect(store.streak).toBe(0);
  });

  it('offers in-game rewards only when the game supports them, and reports them after confirmation', () => {
    const plain = setup([]);
    plain.engine.handleGameEvent('sim', died());
    expect(plain.engine.activeChallenge?.offer.map((o) => o.name)).toEqual(['xp']);

    const { engine } = setup(['currency.grant']);
    engine.handleGameEvent('sim', died());
    const c = engine.activeChallenge;
    if (!c) throw new Error('no challenge');
    expect(c.offer.map((o) => o.name)).toEqual(['xp', 'currency.grant']);

    const out = engine.handleAnswer({
      type: 'answer',
      challengeId: c.id,
      answer: { kind: 'choice', index: 1 },
    });
    const feedback = out.find((o) => o.message.type === 'feedback')?.message;
    // Feedback lists only XP: the Geo is not claimed until the game confirms it.
    expect(feedback).toMatchObject({ rewards: [{ kind: 'xp', amount: 10 }] });
    const effect = out.find((o) => o.to === 'game');
    if (effect?.to !== 'game') throw new Error('expected an effect for the game');
    expect(effect.message).toMatchObject({ name: 'currency.grant', params: { amount: 50 } });

    const reward = engine.handleEffectResult({
      type: 'effect.result',
      effectId: effect.message.id,
      status: 'applied',
    });
    expect(reward[0]?.message).toMatchObject({
      type: 'reward',
      name: 'currency.grant',
      status: 'applied',
    });
  });
});
