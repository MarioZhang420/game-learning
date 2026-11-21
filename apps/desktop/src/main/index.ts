import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createHub } from '@game-learning/hub';
import { type Answer, HubToClient, PROTOCOL_VERSION } from '@game-learning/protocol';
import { configDir, DEFAULT_PORT } from '@game-learning/protocol/discovery';
import { app, BrowserWindow, globalShortcut, ipcMain, screen } from 'electron';
import WebSocket from 'ws';
import { IPC } from '../shared/bridge.ts';

const log = (message: string) => console.log(`[${new Date().toLocaleTimeString()}] ${message}`);

if (!app.requestSingleInstanceLock()) app.quit();

/** Which content pack to study: --pack=<dir>, then GL_PACK, then settings.json, then the dev default. */
function packDir(): string {
  const arg = process.argv.find((a) => a.startsWith('--pack='));
  if (arg) return resolve(arg.slice('--pack='.length));
  if (process.env.GL_PACK) return resolve(process.env.GL_PACK);
  const settings = join(configDir(), 'settings.json');
  if (existsSync(settings)) {
    const value = (JSON.parse(readFileSync(settings, 'utf8')) as { packDir?: string }).packDir;
    if (value) return value;
  }
  // Development default: the maintainer's private pack if present, otherwise the public sample.
  const privatePack = resolve(app.getAppPath(), '../../content/private/yemen-g4-science-1');
  return existsSync(privatePack)
    ? privatePack
    : resolve(app.getAppPath(), '../../content/examples/solar-system');
}

function createOverlay(): BrowserWindow {
  const { bounds } = screen.getPrimaryDisplay();
  const win = new BrowserWindow({
    ...bounds,
    transparent: true,
    frame: false,
    resizable: false,
    movable: false,
    skipTaskbar: true,
    hasShadow: false,
    focusable: false, // never steal keyboard focus from the game
    alwaysOnTop: true,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: join(import.meta.dirname, '../preload/index.cjs'),
      contextIsolation: true,
      sandbox: true,
    },
  });
  win.setAlwaysOnTop(true, 'screen-saver');
  win.setIgnoreMouseEvents(true, { forward: true });
  if (process.env.ELECTRON_RENDERER_URL) void win.loadURL(process.env.ELECTRON_RENDERER_URL);
  else void win.loadFile(join(import.meta.dirname, '../renderer/index.html'));
  return win;
}

/** The overlay is one ordinary protocol client of the hub, exactly like a phone UI would be. */
function connectClient(port: number, token: string, overlay: BrowserWindow) {
  const socket = new WebSocket(`ws://127.0.0.1:${port}/`);
  socket.on('open', () =>
    socket.send(
      JSON.stringify({
        type: 'hello',
        protocol: PROTOCOL_VERSION,
        role: 'client',
        token,
        client: { id: 'desktop-overlay', name: 'Desktop overlay', version: app.getVersion() },
      }),
    ),
  );
  socket.on('message', (raw) => {
    const message = HubToClient.safeParse(JSON.parse(String(raw)));
    if (message.success) overlay.webContents.send(IPC.message, message.data);
  });
  ipcMain.on(IPC.answer, (_e, challengeId: string, answer: Answer) =>
    socket.send(JSON.stringify({ type: 'answer', challengeId, answer })),
  );
  ipcMain.on(IPC.dismiss, (_e, challengeId: string) =>
    socket.send(JSON.stringify({ type: 'dismiss', challengeId })),
  );
  return socket;
}

const ANSWER_KEYS = ['1', '2', '3', '4'];

function setInteractive(overlay: BrowserWindow, interactive: boolean) {
  overlay.setIgnoreMouseEvents(!interactive, { forward: true });
  for (const key of ANSWER_KEYS) {
    if (interactive && !globalShortcut.isRegistered(key)) {
      // Number keys answer while a card is shown, so the player never has to leave the controller/keyboard.
      globalShortcut.register(key, () => overlay.webContents.send(IPC.hotkey, Number(key)));
    } else if (!interactive && globalShortcut.isRegistered(key)) {
      globalShortcut.unregister(key);
    }
  }
}

app.whenReady().then(async () => {
  const pack = packDir();
  log(`studying pack: ${pack}`);
  let running: Awaited<ReturnType<typeof createHub>>;
  try {
    running = await createHub({ packDir: pack, port: DEFAULT_PORT, log });
  } catch (error) {
    log(`port ${DEFAULT_PORT} busy or pack invalid (${String(error)}); trying a free port`);
    running = await createHub({ packDir: pack, port: 0, log });
  }

  const overlay = createOverlay();
  overlay.webContents.once('did-finish-load', () =>
    connectClient(running.hub.port, running.hub.token, overlay),
  );
  ipcMain.on(IPC.interactive, (_e, interactive: boolean) => setInteractive(overlay, interactive));
  globalShortcut.register('CommandOrControl+Shift+Q', () => app.quit());
  log('overlay ready. Ctrl+Shift+Q quits.');

  app.on('will-quit', () => {
    globalShortcut.unregisterAll();
    void running.stop();
  });
});

app.on('window-all-closed', () => app.quit());
