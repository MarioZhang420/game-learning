# Privacy

Many players will be children. These rules are part of the design, not an afterthought.

## What stays on the player's computer

- Progress: answers, XP, streaks and the spaced-repetition schedule, in `%APPDATA%\game-learning\progress\`.
- The hub's address and pairing token, in `%APPDATA%\game-learning\hub.json`.
- Study material and content packs.

The hub only listens on `127.0.0.1` (this computer) and needs a pairing token, so other computers and web pages cannot connect.

## What is sent to the internet

- **During play: nothing.** Questions, audio and grading all work offline.
- **When making a content pack** (`apps/pipeline`), the source pages are sent to the AI provider you choose (Gemini today). On free tiers, providers may use inputs to improve their products. Only send material you are allowed to share, and never personal information.

## Rules for new features

- No child voice, image or typed text goes to an online service without a clear, opt-in setting that a parent controls.
- Speech recognition must run on the PC (planned for V2).
- No accounts, tracking or analytics in V1.
- Play-test reports in this repo contain no names, ages tied to names, photos or recordings.
