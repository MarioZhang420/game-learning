import { homedir } from 'node:os';
import { join } from 'node:path';
import { z } from 'zod';

/**
 * How integrations find the hub: the hub writes this small JSON file when it starts.
 *   Windows: %APPDATA%\game-learning\hub.json
 *   macOS:   ~/Library/Application Support/game-learning/hub.json
 *   Linux:   $XDG_CONFIG_HOME/game-learning/hub.json (or ~/.config/…)
 * A mod reads it, connects to ws://127.0.0.1:<port>/ and sends the token in "hello".
 */
export const Discovery = z.object({
  protocol: z.string(),
  port: z.number().int(),
  token: z.string(),
  pid: z.number().int(),
});
export type Discovery = z.infer<typeof Discovery>;

export function configDir(
  env: NodeJS.ProcessEnv = process.env,
  platform = process.platform,
): string {
  if (env.GAME_LEARNING_HOME) return env.GAME_LEARNING_HOME;
  if (platform === 'win32')
    return join(env.APPDATA ?? join(homedir(), 'AppData', 'Roaming'), 'game-learning');
  if (platform === 'darwin')
    return join(homedir(), 'Library', 'Application Support', 'game-learning');
  return join(env.XDG_CONFIG_HOME ?? join(homedir(), '.config'), 'game-learning');
}

export function discoveryFile(env?: NodeJS.ProcessEnv, platform?: NodeJS.Platform): string {
  return join(configDir(env, platform), 'hub.json');
}

export const DEFAULT_PORT = 47474;
