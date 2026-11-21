# Game protocol v1

How a game integration (a mod) or a screen (an overlay, a phone page) talks to the hub. You can write an integration in any language that has JSON and WebSocket.

The source of truth is [`packages/protocol/src/messages.ts`](../packages/protocol/src/messages.ts). JSON Schema files for other languages are in [`packages/protocol/schema/`](../packages/protocol/schema/). The [Hollow Knight mod](../integrations/hollow-knight/src/HubConnection.cs) (C#) and the [simulator](../integrations/simulator/src/game.ts) (TypeScript) are working examples.

## 1. Find the hub

When the hub starts, it writes a discovery file:

- Windows: `%APPDATA%\game-learning\hub.json`
- macOS: `~/Library/Application Support/game-learning/hub.json`
- Linux: `~/.config/game-learning/hub.json`

```json
{ "protocol": "1", "port": 47474, "token": "3f9c…", "pid": 1234 }
```

If the file is missing, the hub is not running. Retry every few seconds.

## 2. Connect and say hello

Open `ws://127.0.0.1:<port>/`. The first message must be `hello` (within 5 seconds):

```json
{
  "type": "hello",
  "protocol": "1",
  "role": "game",
  "token": "<token from hub.json>",
  "integration": { "id": "hollow-knight", "name": "Hollow Knight mod", "version": "0.1.0" },
  "game": { "id": "hollow-knight", "name": "Hollow Knight" },
  "capabilities": {
    "events": ["player.died", "player.rested"],
    "effects": ["currency.grant", "health.restore"]
  }
}
```

The hub answers `{ "type": "welcome", "protocol": "1", "sessionId": "…" }`, or `{ "type": "error", "code": "unauthorized" | "unsupported-protocol" | "bad-message", "message": "…" }` and closes.

**Declare only what you really support.** The hub offers a reward only if the game listed its effect.

## 3. Send events

```json
{
  "type": "event",
  "id": "<unique id, e.g. a UUID>",
  "name": "player.died",
  "at": "2026-11-21T13:05:00Z"
}
```

`data` is optional, for example `{ "scene": "Crossroads_01" }`. The hub ignores repeated ids, so retrying is safe.

### Standard events

| Name                           | When                                           |
| ------------------------------ | ---------------------------------------------- |
| `player.died`                  | The player died                                |
| `player.rested`                | The player sat at a safe spot (a bench, a bed) |
| `boss.started` / `boss.ended`  | A boss fight starts or ends                    |
| `scene.changed`                | The player entered a new area (`data.scene`)   |
| `game.paused` / `game.resumed` | The game was paused or resumed                 |

Game-specific events use a prefix: `hollow-knight:charm.equipped`.

## 4. Apply effects

The hub may ask the game for a reward:

```json
{ "type": "effect", "id": "e-123", "name": "currency.grant", "params": { "amount": 50 } }
```

Apply it **on the game's main thread**, then answer:

```json
{ "type": "effect.result", "effectId": "e-123", "status": "applied" }
```

`status` is `applied`, `rejected` (you chose not to, for example during a cutscene) or `failed` (an error; add `message`). The player is told about the reward only after `applied`.

### Standard effects

| Name             | params             | Meaning                                   |
| ---------------- | ------------------ | ----------------------------------------- |
| `currency.grant` | `amount`           | Give in-game money (Geo in Hollow Knight) |
| `health.restore` | `amount`           | Restore health                            |
| `message.show`   | `text`, `language` | Show a short message in the game          |

## 5. Screens (clients)

Screens say hello with `"role": "client"` and a `client` object instead of `integration`/`game`. They receive `state`, `challenge`, `feedback` and `reward` messages, and send `answer` and `dismiss`. The answer to a question never reaches a screen before the player answers.

## Versioning

Within v1, changes only add optional fields and new message types. A breaking change means protocol `2`, and the hub will speak both for a while.
