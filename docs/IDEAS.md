# Ideas and how we judged them

Every idea gets a score before it gets a version. This keeps V1 small and lets anyone see why an idea is where it is.

- **Value:** how much it helps learning or fun (1 low – 5 high)
- **Effort:** how much work (1 small – 5 huge)
- **Risk:** what could go wrong (technical, privacy, frustration)
- **Verdict:** V1, V2, V3, or ✗ (not planned)

Have a new idea? Open an issue with the **Idea** template. We add it here after a discussion.

## Learning

| Idea                                              | Value | Effort | Risk          | Verdict        | Why                                                                                             |
| ------------------------------------------------- | ----- | ------ | ------------- | -------------- | ----------------------------------------------------------------------------------------------- |
| Questions after death                             | 5     | 1      | Low           | **V1 ✅ done** | The natural pause in Hollow Knight; proven in the brief.                                        |
| Spaced repetition (FSRS)                          | 5     | 1      | Low           | **V1 ✅ done** | Proven algorithm from Anki; makes questions come back at the right time.                        |
| "Learn more" after a wrong answer                 | 5     | 2      | Low           | **V1**         | The data already links questions → facts → lesson sections. Turns a mistake into a mini-lesson. |
| Questions read aloud, audio made ahead of time    | 4     | 2      | Low           | **V1**         | Helps young readers; pre-made audio means no internet and no cost during play.                  |
| Notes (text/Markdown) as a source                 | 5     | 2      | Low           | **V1**         | The V1 finish line says "your own notes"; much simpler than PDFs.                               |
| Progress report (learned / weak facts)            | 4     | 2      | Low           | **V1**         | Needed to judge whether V1 works.                                                               |
| Bench rest review question                        | 3     | 1      | Low           | **V1**         | Calm moment, the mod already reports it.                                                        |
| More question types (ordering, matching, picture) | 4     | 3      | Low           | **V2**         | Valuable, but multiple choice and true/false are enough to test the loop.                       |
| Review screen to approve AI-made questions        | 4     | 3      | Low           | **V2**         | Important before strangers use AI packs; in V1 the maintainer reviews by hand.                  |
| Voice answers (speech recognition on the PC)      | 4     | 4      | Privacy       | **V2**         | Child audio must not go to a cloud service; local models need strong PCs.                       |
| AI tutor conversation                             | 4     | 4      | Privacy, cost | **V3**         | A child typing to an online AI needs consent and moderation.                                    |
| Adaptive difficulty from mastery                  | 4     | 3      | Low           | **V2**         | FSRS covers timing; difficulty can follow once we have data.                                    |

## Game experience

| Idea                                             | Value | Effort | Risk              | Verdict                        | Why                                                                  |
| ------------------------------------------------ | ----- | ------ | ----------------- | ------------------------------ | -------------------------------------------------------------------- |
| Overlay on top of the game                       | 5     | 2      | Fullscreen limits | **V1 ✅ done**                 | Works for any game; needs borderless mode.                           |
| Rewards only after the game confirms             | 5     | 1      | Low               | **V1 ✅ done**                 | Honest: we never claim a buff that did not happen.                   |
| Streak bonus (more Geo for 3 right in a row)     | 3     | 1      | Low               | **V1**                         | Cheap motivation.                                                    |
| Sounds and small animations                      | 3     | 1      | Low               | **V1**                         | Feedback should feel like part of a game.                            |
| Settings without code (cooldown, Geo, text size) | 4     | 2      | Low               | **V1**                         | Play-testers must tune it themselves.                                |
| Questions drawn inside the game by the mod       | 5     | 4      | Medium            | **V2**                         | Solves fullscreen and controller input; game-specific work.          |
| Phone as an answer pad                           | 4     | 3      | Low               | **V2**                         | Also solves fullscreen; the protocol already supports extra screens. |
| Boss-prep questions                              | 4     | 3      | Medium            | **V2**                         | Needs reliable boss detection (scene names first).                   |
| Themes per game                                  | 3     | 2      | Low               | **V2**                         | The user asked for custom UI per game; after the loop is proven.     |
| Penalties for wrong answers                      | 2     | 1      | Frustration       | **V2, opt-in, off by default** | The brief warns against punishing learners.                          |
| Second chance: revive after a right answer       | 4     | 4      | High              | **✗ for now**                  | Undoing death safely in Hollow Knight is hard and could break saves. |

## Social

| Idea                                                 | Value | Effort | Risk             | Verdict | Why                                                                                   |
| ---------------------------------------------------- | ----- | ------ | ---------------- | ------- | ------------------------------------------------------------------------------------- |
| Study raid (shared health and questions)             | 5     | 5      | High             | **V3**  | Needs networking between players' hubs; exciting, but only after single-player works. |
| Archipelago "learning link" / learning-locked checks | 4     | 4      | Medium           | **V3**  | Great fit (the maintainer uses Archipelago), but heavy setup for players.             |
| Leaderboards                                         | 3     | 4      | Server, fairness | **V3**  | Needs a server; must reward improvement, not only speed.                              |

## Platform

| Idea                                      | Value | Effort | Risk     | Verdict        | Why                                               |
| ----------------------------------------- | ----- | ------ | -------- | -------------- | ------------------------------------------------- |
| Game protocol any language can speak      | 5     | 2      | Low      | **V1 ✅ done** | The base of community integrations.               |
| Simulator (fake game)                     | 5     | 1      | Low      | **V1 ✅ done** | Contributors do not need to own a game.           |
| Windows installer                         | 5     | 3      | Low      | **V1**         | Friends will not install pnpm.                    |
| Protocol conformance kit                  | 4     | 2      | Low      | **V2**         | Lets integration authors check their work alone.  |
| Second game                               | 5     | 4      | Medium   | **V2**         | Proves the design is not Hollow Knight-only.      |
| Plugins from outside the repo             | 3     | 3      | Security | **V2**         | Only after the interfaces settle.                 |
| Game–subject mapping knowledge base       | 4     | 5      | Low      | **V3**         | Needs many games and many contributors first.     |
| Screen recognition for games without mods | 3     | 5      | High     | **V3**         | Fragile; mods are more reliable where they exist. |
| macOS / Linux                             | 3     | 3      | Low      | **V3**         | Most target games and players are on Windows.     |
