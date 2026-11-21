import type { Question } from '@game-learning/content';
import type { Answer, ChallengeView } from '@game-learning/protocol';

/** What the player sees: the question without its answer. */
export function toView(question: Question): ChallengeView {
  return question.type === 'multiple-choice'
    ? { kind: 'multiple-choice', prompt: question.prompt, choices: question.choices }
    : { kind: 'true-false', prompt: question.prompt };
}

export function correctAnswer(question: Question): Answer {
  return question.type === 'multiple-choice'
    ? { kind: 'choice', index: question.answerIndex }
    : { kind: 'boolean', value: question.answer };
}

export function isCorrect(question: Question, answer: Answer): boolean {
  if (question.type === 'multiple-choice') {
    return answer.kind === 'choice' && answer.index === question.answerIndex;
  }
  return answer.kind === 'boolean' && answer.value === question.answer;
}
