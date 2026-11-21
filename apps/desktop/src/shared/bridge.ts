import type { Answer, HubToClient } from '@game-learning/protocol';

/** The small API the preload script exposes to the overlay page (window.gameLearning). */
export interface OverlayBridge {
  onMessage(listener: (message: HubToClient) => void): () => void;
  answer(challengeId: string, answer: Answer): void;
  dismiss(challengeId: string): void;
  /** Tells the main process whether the card is on screen (to accept clicks and hotkeys). */
  setInteractive(interactive: boolean): void;
}

export const IPC = {
  message: 'gl:message',
  answer: 'gl:answer',
  dismiss: 'gl:dismiss',
  interactive: 'gl:interactive',
  hotkey: 'gl:hotkey',
} as const;
