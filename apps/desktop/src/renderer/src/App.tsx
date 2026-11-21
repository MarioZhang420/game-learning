import type {
  Answer,
  ChallengeMessage,
  FeedbackMessage,
  HubToClient,
  RewardMessage,
  StateMessage,
} from '@game-learning/protocol';
import { useCallback, useEffect, useState } from 'react';
import type { OverlayBridge } from '../../shared/bridge.ts';
import { isRtl, reasonText, t } from './i18n.ts';

declare global {
  interface Window {
    gameLearning: OverlayBridge & { onHotkey(listener: (key: number) => void): () => void };
  }
}

const bridge = window.gameLearning;
const FEEDBACK_SECONDS = 8;

type Card =
  | { kind: 'challenge'; challenge: ChallengeMessage }
  | {
      kind: 'feedback';
      challenge: ChallengeMessage;
      feedback: FeedbackMessage;
      rewards: RewardMessage[];
    };

export function App() {
  const [card, setCard] = useState<Card | undefined>();
  const [state, setState] = useState<StateMessage | undefined>();

  useEffect(
    () =>
      bridge.onMessage((message: HubToClient) => {
        if (message.type === 'state') setState(message);
        if (message.type === 'challenge') setCard({ kind: 'challenge', challenge: message });
        if (message.type === 'feedback') {
          setCard((c) =>
            c?.kind === 'challenge' && c.challenge.id === message.challengeId
              ? { kind: 'feedback', challenge: c.challenge, feedback: message, rewards: [] }
              : c,
          );
        }
        if (message.type === 'reward') {
          setCard((c) =>
            c?.kind === 'feedback' && c.challenge.id === message.challengeId
              ? { ...c, rewards: [...c.rewards, message] }
              : c,
          );
        }
      }),
    [],
  );

  // Clicks and number keys go to the overlay only while a card is on screen.
  useEffect(() => bridge.setInteractive(card !== undefined), [card]);

  const answer = useCallback(
    (value: Answer) => {
      if (card?.kind === 'challenge') bridge.answer(card.challenge.id, value);
    },
    [card],
  );

  useEffect(
    () =>
      bridge.onHotkey((key) => {
        if (card?.kind === 'feedback') return setCard(undefined);
        if (card?.kind !== 'challenge') return;
        const { view } = card.challenge;
        if (view.kind === 'true-false') {
          if (key === 1 || key === 2) answer({ kind: 'boolean', value: key === 1 });
        } else if (key <= view.choices.length) {
          answer({ kind: 'choice', index: key - 1 });
        }
      }),
    [card, answer],
  );

  useEffect(() => {
    if (card?.kind !== 'feedback') return;
    const timer = setTimeout(() => setCard(undefined), FEEDBACK_SECONDS * 1000);
    return () => clearTimeout(timer);
  }, [card]);

  const language = card?.challenge.language ?? 'ar';
  return (
    <div className="stage" dir={isRtl(language) ? 'rtl' : 'ltr'} lang={language}>
      {state && (
        <div className="hud">
          ⭐ {state.xp} {t(language, 'xp')}
          {state.streak > 1 && ` · 🔥 ${state.streak} ${t(language, 'streak')}`}
        </div>
      )}
      {card?.kind === 'challenge' && (
        <ChallengeCard
          challenge={card.challenge}
          onAnswer={answer}
          onLater={() => {
            bridge.dismiss(card.challenge.id);
            setCard(undefined);
          }}
        />
      )}
      {card?.kind === 'feedback' && (
        <FeedbackCard
          challenge={card.challenge}
          feedback={card.feedback}
          rewards={card.rewards}
          onClose={() => setCard(undefined)}
        />
      )}
    </div>
  );
}

function options(challenge: ChallengeMessage): { label: string; answer: Answer }[] {
  const { view } = challenge;
  if (view.kind === 'multiple-choice') {
    return view.choices.map((label, index) => ({ label, answer: { kind: 'choice', index } }));
  }
  return [
    { label: t(challenge.language, 'true'), answer: { kind: 'boolean', value: true } },
    { label: t(challenge.language, 'false'), answer: { kind: 'boolean', value: false } },
  ];
}

function sameAnswer(a: Answer, b: Answer) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function ChallengeCard(props: {
  challenge: ChallengeMessage;
  onAnswer: (answer: Answer) => void;
  onLater: () => void;
}) {
  const { challenge } = props;
  const lang = challenge.language;
  return (
    <div className="card enter">
      <div className="reason">{reasonText(lang, challenge.reason)}</div>
      <div className="prompt">{challenge.view.prompt}</div>
      <div className="choices">
        {options(challenge).map((option, i) => (
          <button
            type="button"
            key={option.label}
            className="choice"
            onClick={() => props.onAnswer(option.answer)}
          >
            <span className="key">{i + 1}</span>
            {option.label}
          </button>
        ))}
      </div>
      <div className="footer">
        <span className="offer">
          🎁 {challenge.offer.map((o) => `${o.amount} ${t(lang, o.name)}`).join(' + ')}
        </span>
        <button type="button" className="later" onClick={props.onLater}>
          {t(lang, 'later')}
        </button>
      </div>
      <div className="hint">{t(lang, 'keys')}</div>
    </div>
  );
}

function FeedbackCard(props: {
  challenge: ChallengeMessage;
  feedback: FeedbackMessage;
  rewards: RewardMessage[];
  onClose: () => void;
}) {
  const { challenge, feedback } = props;
  const lang = challenge.language;
  const right = options(challenge).find((o) => sameAnswer(o.answer, feedback.correctAnswer));
  return (
    <div className={`card enter ${feedback.correct ? 'good' : 'bad'}`}>
      <div className="verdict">
        {feedback.correct ? `✅ ${t(lang, 'correct')}` : `💡 ${t(lang, 'wrong')}`}
      </div>
      {!feedback.correct && right && (
        <div className="right-answer">
          {t(lang, 'rightAnswer')}: <strong>{right.label}</strong>
        </div>
      )}
      <div className="explanation">{feedback.explanation}</div>
      {(feedback.rewards.length > 0 || props.rewards.length > 0) && (
        <div className="rewards">
          {feedback.rewards.map((r) => (
            <span key={r.name}>
              +{r.amount} {t(lang, r.name)}
            </span>
          ))}
          {props.rewards.map((r) => (
            <span key={r.name}>
              +{r.amount} {t(lang, r.name)} {t(lang, r.status)}
            </span>
          ))}
        </div>
      )}
      <button type="button" className="continue" onClick={props.onClose}>
        {t(lang, 'continue')}
      </button>
    </div>
  );
}
