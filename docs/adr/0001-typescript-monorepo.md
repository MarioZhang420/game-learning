# 0001: TypeScript monorepo; C# only inside game mods

**Date:** 2026-11-21 · **Status:** Accepted

**Context.** We want many contributors, one language from protocol to screens, and mods in whatever language each game needs.

**Decision.** One repository with pnpm workspaces and Turborepo. Hub, engine, overlay and pipeline are TypeScript (strict). Game integrations use their game's language (C# for Hollow Knight) and talk to the hub only through the protocol.

**Considered.** Rust/Tauri (smaller app, far fewer contributors, weaker audio). Python (good for AI, weak for desktop overlays). Separate repositories (harder for beginners to set up).

**Consequences.** One `pnpm install`, one CI. Mods build separately and are not part of CI, because they need the game's own files.
