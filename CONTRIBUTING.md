# Contributing

Welcome! This project is young and experimental, and beginners are very welcome. You do **not** need a paid AI tool, a paid account, or even Hollow Knight to help.

## 1. Set up (once)

1. Install **Node.js 24** (https://nodejs.org) and **Git** (https://git-scm.com).
2. Install pnpm: `npm install -g pnpm@10`
3. Fork this repo on GitHub, then:

```sh
git clone https://github.com/<your-name>/game-learning.git
cd game-learning
pnpm install
pnpm test
```

If `pnpm test` ends with "passed", you are ready.

> Slow internet? Set `ELECTRON_SKIP_BINARY_DOWNLOAD=1` before `pnpm install` to skip the ~110 MB overlay runtime. You only need it to run the overlay window.

A good free editor: **VS Code** (https://code.visualstudio.com) with the **Biome** extension.

## 2. Pick a task

Look at issues labeled **`good first issue`**. Comment "I'll take this" so two people don't do the same thing. Ask questions in the issue: there are no stupid questions.

## 3. Make the change

```sh
git checkout -b my-change        # a new branch for your work
# … edit files …
pnpm format                      # fixes formatting for you
pnpm lint && pnpm typecheck && pnpm test
git add .
git commit -m "Short description of what you changed"
git push -u origin my-change
```

Then open a Pull Request on GitHub. Small pull requests are best: one task per PR.

## 4. Try the app without the game

You can test everything with the **simulator**, a fake game:

```sh
pnpm hub --pack content/examples/solar-system   # terminal 1: the hub with the sample pack
pnpm sim --client                                # terminal 2: shows questions, answer with number keys
pnpm sim                                         # terminal 3: press d to "die"
```

## Where things are

See the table in [README.md](README.md) and the design in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). The short version:

- **Protocol** (`packages/protocol`): the messages games and screens send. Changing it affects everyone, so discuss first.
- **Core** (`packages/core`): the rules. Pure TypeScript, easy to unit test.
- **Hub** (`packages/hub`): the local server.
- **Overlay** (`apps/desktop`): what the player sees (React).
- **Hollow Knight mod** (`integrations/hollow-knight`): C#.

## Rules

- Be kind. We are all learning.
- Never commit API keys, `.env` files, or copyrighted books. Private study material belongs in `content/private/`, which git ignores.
- Code is Apache-2.0. By contributing you agree your contribution uses the same license.
