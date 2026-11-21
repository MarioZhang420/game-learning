# Architecture (draft v0, for review)

Goal: a structure that stays right as the project grows into many games, many subjects and many contributors, without building all of it now. We build **one vertical slice** (Hollow Knight + one book + death trigger) on top of the **real** boundaries, so nothing has to be rewritten later.

## 1. Big picture

```
 ┌────────────── Game integrations (any language, out of process) ──────────────┐
 │  Hollow Knight mod (C#)   Minecraft mod (Java, later)   Simulator (TS, tests) │
 └───────────────▲──────────────────────────────────────────────────────────────┘
                 │  Game Protocol: JSON over WebSocket, versioned, localhost only
 ┌───────────────┴──────────────── Hub (local Node service) ────────────────────┐
 │  core: sessions · scheduler (when to ask) · challenge engine · rewards ledger │
 │  plugins: mechanics · challenge types · providers (AI / TTS / STT)            │
 │  storage: progress + spaced repetition (SQLite)                               │
 └───────────────▲──────────────────────────────────────────────▲───────────────┘
                 │  Client API (same WebSocket style)            │ reads
 ┌───────────────┴────────────┐                    ┌─────────────┴──────────────┐
 │ Desktop app (Electron)     │                    │ Content packs (files)      │
 │ overlay · voice · settings │                    │ made by the content        │
 │ (phone / web UI later)     │                    │ pipeline (CLI)             │
 └────────────────────────────┘                    └────────────────────────────┘
```

Three rules hold everything together:

1. **Games talk to the hub only through the Game Protocol.** A contributor can add a game in any language (C# for Hollow Knight/Terraria, Java for Minecraft) without touching the hub. The protocol is the most important public contract, so it is versioned and has a conformance test kit.
2. **The hub has no UI, and the UI has no game logic.** The overlay is one client of the hub. A phone screen, a web page or an in-game UI drawn by a mod can be other clients later. Nothing gets rewritten.
3. **Content is data, not code.** A course (a book, a subject) is a _content pack_: plain files that people can read, review, translate and share. The AI pipeline that makes packs is separate from the game runtime. No AI call is needed while playing.

## 2. Honest capabilities

Each integration announces, when it connects, what it can actually do:

```json
{
  "type": "hello",
  "protocol": "1.0",
  "integration": { "id": "hollow-knight", "version": "0.1.0" },
  "capabilities": {
    "events": ["player.died", "player.rested"],
    "effects": ["currency.grant", "health.restore"]
  }
}
```

- The hub only offers rewards the connected game supports. Otherwise rewards stay in the companion (XP, streaks).
- An effect counts as "applied" only after the game confirms it (`effect.result`). The UI never claims a buff that did not happen.
- Standard names cover common things (`player.died`, `boss.started`, `currency.grant`). Game-specific ones are namespaced (`hollow-knight:soul.grant`).
- Security: localhost only, a pairing token, and the hub rejects browser `Origin`s, so a web page cannot fake game events.

## 3. Extension points (plugins)

| Kind             | What it adds                                                 | Where it runs                | Example                               |
| ---------------- | ------------------------------------------------------------ | ---------------------------- | ------------------------------------- |
| Game integration | Events from a game, effects into it                          | Out of process, any language | Hollow Knight mod                     |
| Mechanic / mode  | Rules: which event leads to which challenge and which reward | Hub (TypeScript)             | "Death recovery", later "Study raid"  |
| Challenge type   | A question format: data shape, UI, grading                   | Hub + UI                     | Multiple choice, true/false, ordering |
| Provider         | AI text/vision, TTS, STT behind one interface                | Hub                          | Gemini now, the Arabic TTS site later |
| Content importer | Turns a source into a pack                                   | Pipeline CLI                 | PDF pages, photos, Anki deck          |
| Content pack     | A course                                                     | Data files                   | Yemen grade 4 science, part 1         |

v1 loads plugins that live in this repo, through the same interfaces third parties will use. Loading outside plugins (a marketplace) comes later, once the interfaces have proven themselves.

## 4. Content pipeline: "rework the book, lose nothing"

Every step writes reviewable files and can resume (the Gemini free tier has rate limits):

1. **Read:** page images go to Gemini vision, which returns clean text per page (`source/p012.md`). This book's PDF has a broken text layer, so we read the images.
2. **Facts ledger:** Gemini lists every atomic piece of knowledge with its page number (`facts.json`). This list is the guarantee that nothing gets lost.
3. **Rework:** lessons are rewritten for the learner (age, language), with short chunks, examples from the child's life, memory hooks and a summary. Each lesson lists the fact IDs it covers.
4. **Verify:** code checks that every fact is covered. A second AI pass flags anything invented or changed. Anything flagged goes to human review.
5. **Questions:** several question types per fact, each with an explanation and links back to the facts and pages.

Arabic and English are separate pack languages. Translation is its own step, so each language stays reviewable.

Copyright: the reworked book stays **private** (gitignored, local only). The public repo ships the pipeline and a sample pack made from openly licensed material.

## 5. Stack (reuse first)

| Need                          | Choice                                        | Why                                                                      |
| ----------------------------- | --------------------------------------------- | ------------------------------------------------------------------------ |
| Language (hub, app, pipeline) | TypeScript, strict                            | Largest contributor pool, one language from protocol to UI               |
| Repo                          | pnpm workspaces + Turborepo                   | Standard monorepo, fast builds                                           |
| Desktop / overlay             | Electron + electron-vite + React              | Transparent always-on-top windows, mic/audio, right-to-left, mature      |
| Schemas                       | zod → JSON Schema                             | Validates messages; JSON Schema lets C#/Java integrations generate types |
| Transport                     | WebSocket (`ws`)                              | Simple, any language has a client                                        |
| Storage                       | SQLite (better-sqlite3) + Drizzle migrations  | Local, single file, safe schema changes                                  |
| Spaced repetition             | `ts-fsrs` (FSRS, the algorithm Anki uses)     | Proven, no need to invent our own                                        |
| AI                            | `@google/genai` behind our provider interface | Gemini free tier now, swappable                                          |
| i18n                          | i18next, CSS logical properties               | Arabic + English, RTL from day one                                       |
| Tests                         | Vitest + a game **simulator**                 | Contributors can work without owning the game                            |
| Lint/format                   | Biome                                         | One fast tool                                                            |
| Releases                      | Changesets + GitHub Actions                   | Versioned packages, CI on every PR                                       |
| Hollow Knight mod             | C#, .NET Framework 4.7.2, HK Modding API      | The official modding path; hooks verified in the installed game          |

## 6. Repo layout

```
apps/
  desktop/            Electron app: overlay, voice, settings, starts the hub
  pipeline/           CLI: book → content pack
packages/
  protocol/           Game + client protocol schemas, versioned (the public contract)
  core/               Domain logic, pure (no IO): sessions, scheduler, engine, rewards
  hub/                Server: WebSocket gateway, plugin host, storage
  content/            Content pack format + loader + validator
  providers/          AI / TTS / STT interfaces + gemini adapter
  plugin-sdk/         What plugin authors import
  mechanics/          Built-in modes (death-recovery first)
  challenges/         Built-in question types (multiple choice first)
integrations/
  hollow-knight/      C# mod
  simulator/          Fake game for tests and demos
content/              Private packs (gitignored) + public sample pack
docs/                 Architecture, ADRs (decisions with reasons), protocol spec
```

## 7. First slice (prototype)

Death in Hollow Knight → mod sends `player.died` → hub's "death recovery" mechanic picks a due question (spaced repetition) → overlay shows it (Arabic, read aloud) → answer by click → feedback with the reworked explanation → XP in the companion. A Geo reward through the mod comes as step two, once the basic loop feels good.

## 8. Known risks

- The overlay needs Hollow Knight in **windowed or borderless** mode, not exclusive fullscreen.
- **Gemini free tier:** Google may use free-tier inputs to improve its products. That is fine for a textbook. It is **not** fine for a child's voice. Voice _output_ (TTS) is fine; voice _input_ stays off until we have a paid or local option.
- Building the C# mod needs the .NET SDK, which is not installed yet.
