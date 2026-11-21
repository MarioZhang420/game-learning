# Roadmap

**Goal:** make the games people already love a part of what they learn.

We grow in three versions. Each version has phases, and each phase has a clear "done when". We do not start a phase's big features before the previous phase is done; small fixes and tests are always welcome.

Every task lives as a GitHub issue with three labels:

- **Difficulty:** `difficulty: easy` (first contribution, a few hours) · `difficulty: medium` (needs to read some code, a day or two) · `difficulty: hard` (design work, several days)
- **Priority:** `priority: P1` (needed for the current phase) · `priority: P2` (current phase, nice to have) · `priority: P3` (later)
- **Milestone:** the phase it belongs to

Ideas are judged in [IDEAS.md](IDEAS.md) before they get a version.

**Task boards:** [Phase 1](https://github.com/Mohammed-Hashim18/game-learning/milestone/1) · [Phase 2](https://github.com/Mohammed-Hashim18/game-learning/milestone/2) · [Phase 3](https://github.com/Mohammed-Hashim18/game-learning/milestone/3) · [V2 epics](https://github.com/Mohammed-Hashim18/game-learning/milestone/4) · [V3 epics](https://github.com/Mohammed-Hashim18/game-learning/milestone/5) · [Good first issues](https://github.com/Mohammed-Hashim18/game-learning/labels/good%20first%20issue)

---

## Where we are

| Part                                                                             | Status                                                        |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Architecture, protocol v1, CI                                                    | ✅ Done                                                       |
| Hub + engine (death questions, spaced repetition, rewards confirmed by the game) | ✅ Done, tested                                               |
| Overlay on top of the game (Arabic + English, number keys)                       | ✅ Works with the simulator                                   |
| Hollow Knight mod (deaths, bench rests, Geo, health)                             | 🟡 Builds; first real in-game test pending                    |
| Content pipeline (book → facts → lessons → questions)                            | 🟡 Built; one unit made, AI run on the free tier not finished |

---

## V1: One game, one learner, a real loop

**Question V1 answers:** does learning between deaths in Hollow Knight feel good, and does a child actually remember more?

**V1 is done when:**

- [x] The repo is public with a README, license and contributor guide.
- [ ] Questions are made from the learner's own material (a book or notes).
- [ ] Questions appear during real Hollow Knight play, and rewards arrive in the game.
- [ ] The maintainer's brother and at least 3 friends played it, and a written verdict says what to keep, change and drop.

### Phase 0: Foundation (done)

Repo, architecture, protocol v1, hub, engine, mod, overlay, simulator, CI, sample pack.

### Phase 1: Play-test ready

Make one real session pleasant and debuggable.

- The mod verified in the real game.
- Settings without editing code: question cooldown, Geo amount, text size, rewards on/off.
- The overlay shows whether a game is connected.
- After a wrong answer, a short "learn more" from the lesson.
- Questions read aloud (audio made ahead of time, so play needs no internet).
- Small joys: sounds, a hideable XP badge, streak bonus.
- Bench rest gives a gentle review question.
- Unit tests for every core rule.

**Done when:** a 20-minute Hollow Knight session with Unit 1 runs without anyone touching the code, and the hub log shows no errors.

### Phase 2: Content

Enough good material to play for weeks.

- The pipeline proven end to end on the Gemini free tier with a public sample.
- Plain text and Markdown notes as a source, not only PDFs.
- The private book: all 5 units reworked and checked (done locally, never published).
- Public example packs in Arabic and English, all checked by CI.
- A guide to writing a pack by hand.

**Done when:** a new person can turn their own notes into a pack by following the docs, and CI rejects a broken pack.

### Phase 3: Friends play-test → V1 release

Let people who are not developers try it.

- A Windows installer (double-click, no pnpm).
- A mod zip and install steps for Lumafly users.
- A play-test guide and a feedback form.
- A simple progress report: which facts are learned and which are weak.
- Arabic README.
- The verdict written in `docs/playtests/`.

**Done when:** 3 friends installed and played without help, and the verdict is written. Tag `v1.0.0`.

---

## V2: Ready for more people and more games

**Question V2 answers:** can the platform grow without the maintainer doing everything?

### Phase 4: Better in-game experience

- Questions drawn **inside** Hollow Knight by the mod (works in fullscreen, answers with the controller).
- Phone as an answer pad: scan a QR code, answer on the phone.
- Boss-prep questions before a boss (needs boss detection).
- Overlay themes per game.
- New question types: ordering, matching, picture questions.
- Opt-in, gentle penalties (off by default).

### Phase 5: Contributor ecosystem

- A second game integration, chosen with the community (Minecraft, Terraria or Stardew Valley).
- A protocol conformance kit: one command tells an integration author if their mod speaks the protocol correctly.
- Loading mechanics and question types from outside the repo (plugins).
- Publishing the Hollow Knight mod on Lumafly.
- Sharing packs: import and export as one file.

### Phase 6: Parents and teachers

- A parent view: time played, questions answered, weak topics.
- A review screen to approve AI-made facts and questions before a child sees them.
- Voice answers with speech recognition that runs on the PC (no child audio leaves the computer).

**V2 is done when** a contributor who is not the maintainer shipped a second game integration, and a parent used the review screen to prepare a pack.

---

## V3: The ecosystem

**Question V3 answers:** can learning become a shared, social part of gaming?

### Phase 7: Together

- Study raids: friends share a health pool and a question pool across their games.
- Archipelago integration: learning-locked checks, Death Link-style "learning link".
- Friendly leaderboards that reward accuracy and improvement, not only speed.

### Phase 8: Intelligence and reach

- Game–subject mapping: which game mechanics teach which concepts, as a community knowledge base.
- Context-aware timing for games without mods (screen recognition).
- An AI tutor that explains a wrong answer in conversation.
- A community pack library.
- macOS and Linux; new games such as Hollow Knight: Silksong.

---

## What is public and what is private

| Public (this repo)                              | Private (maintainer's PC only)                                                      |
| ----------------------------------------------- | ----------------------------------------------------------------------------------- |
| All code, protocol, docs, roadmap, ideas        | Copyrighted textbooks and packs made from them (`content/private/`)                 |
| Example packs we wrote ourselves (CC BY-SA 4.0) | API keys (`.env`)                                                                   |
| Play-test verdicts, without personal data       | Raw play-test notes about a child, recordings, progress files                       |
| Decision records (`docs/adr/`)                  | Maintainer's personal notes and AI-assistant instructions (`private/`, `CLAUDE.md`) |

See [PRIVACY.md](PRIVACY.md) for what the app itself stores and sends.
