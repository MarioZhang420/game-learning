# Game Learning (working name)

An early, experimental open-source project: make the games people already play part of what they learn.

You keep playing your game (Hollow Knight first; Minecraft, Terraria… later). A companion turns your own study material into short challenges and brings them in at good moments, such as after a death. Correct answers earn rewards: XP in the companion, and in-game rewards (like Geo) where the game integration supports them.

**Status:** first prototype. Hollow Knight death → question on an overlay → answer → feedback → reward.

- **Roadmap (V1 / V2 / V3 and phases):** [docs/ROADMAP.md](docs/ROADMAP.md)
- **Want to help?** [CONTRIBUTING.md](CONTRIBUTING.md) and the [good first issues](https://github.com/Mohammed-Hashim18/game-learning/labels/good%20first%20issue)

| Doc                                         | What it covers                                            |
| ------------------------------------------- | --------------------------------------------------------- |
| [BRIEF.md](docs/BRIEF.md)                   | The original concept                                      |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md)     | How the parts fit together                                |
| [PROTOCOL.md](docs/PROTOCOL.md)             | How a game mod talks to the hub (for integration authors) |
| [CONTENT-FORMAT.md](docs/CONTENT-FORMAT.md) | How study material is stored                              |
| [IDEAS.md](docs/IDEAS.md)                   | Every idea, scored and placed in V1, V2 or V3             |
| [PRIVACY.md](docs/PRIVACY.md)               | What stays on the PC and what is sent                     |
| [adr/](docs/adr/)                           | Big decisions and why                                     |

## How it fits together

```
Hollow Knight mod (C#) ──┐                       ┌── Overlay (Electron)
Simulator (fake game) ───┼── Game Protocol ── Hub ┤
Other games (later) ─────┘   (WebSocket)          └── Other screens (later)
```

| Folder                       | What                                                                                                    |
| ---------------------------- | ------------------------------------------------------------------------------------------------------- |
| `packages/protocol`          | The wire protocol (zod schemas + JSON Schema in `schema/`). The public contract for integrations.       |
| `packages/core`              | Engine with no IO: mechanics (when to ask), question choice (FSRS spaced repetition), grading, rewards. |
| `packages/hub`               | Local WebSocket service that runs the engine. Writes a discovery file so games can find it.             |
| `packages/content`           | Content pack format: facts, lessons, questions.                                                         |
| `apps/desktop`               | Electron overlay that shows questions on top of the game.                                               |
| `apps/pipeline`              | CLI that turns a book into a content pack.                                                              |
| `integrations/hollow-knight` | Hollow Knight Modding API mod.                                                                          |
| `integrations/simulator`     | A fake game, so you can develop without owning one.                                                     |

## Run it

Needs Node 24+, pnpm 10, and for the Hollow Knight mod the .NET SDK and the Hollow Knight Modding API (e.g. via Lumafly).

```sh
pnpm install
pnpm test                 # unit + end-to-end hub tests
pnpm mod:install          # build the Hollow Knight mod into the game's Mods folder
pnpm app                  # start the overlay (it starts the hub)
```

Then start Hollow Knight in **windowed or borderless** mode (the overlay cannot draw over exclusive fullscreen). Die, and a question appears. Answer with the number keys or by clicking. `Ctrl+Shift+Q` closes the overlay.

Without the game: run `pnpm sim` in a second terminal and press `d` to "die".

Choose the content pack with `--pack=<folder>`, the `GL_PACK` variable, or `packDir` in `%APPDATA%\game-learning\settings.json`.

## License

Code: [Apache-2.0](LICENSE). Content packs carry their own license; copyrighted textbooks stay private (`content/private/` is gitignored).
