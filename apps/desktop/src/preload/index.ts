import type { HubToClient } from '@game-learning/protocol';
import { contextBridge, ipcRenderer } from 'electron';
import { IPC, type OverlayBridge } from '../shared/bridge.ts';

const bridge: OverlayBridge & { onHotkey(listener: (key: number) => void): () => void } = {
  onMessage(listener) {
    const handler = (_: unknown, message: HubToClient) => listener(message);
    ipcRenderer.on(IPC.message, handler);
    return () => ipcRenderer.off(IPC.message, handler);
  },
  onHotkey(listener) {
    const handler = (_: unknown, key: number) => listener(key);
    ipcRenderer.on(IPC.hotkey, handler);
    return () => ipcRenderer.off(IPC.hotkey, handler);
  },
  answer: (challengeId, answer) => ipcRenderer.send(IPC.answer, challengeId, answer),
  dismiss: (challengeId) => ipcRenderer.send(IPC.dismiss, challengeId),
  setInteractive: (interactive) => ipcRenderer.send(IPC.interactive, interactive),
};

contextBridge.exposeInMainWorld('gameLearning', bridge);
