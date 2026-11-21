# 0002: Games talk to a local hub over a WebSocket protocol

**Date:** 2026-11-21 · **Status:** Accepted

**Context.** Each game is modded differently. The learning logic must not be rewritten per game.

**Decision.** A small hub on `127.0.0.1` runs all logic. Games and screens connect over WebSocket with JSON messages (protocol v1, see [PROTOCOL.md](../PROTOCOL.md)). A discovery file gives the port and a pairing token. Browsers from unknown origins are refused.

**Considered.** HTTP polling (more latency, more code in mods). Logic inside each mod (rewritten per game). Archipelago's protocol (built for randomizers, not learning).

**Consequences.** Any language with WebSocket can integrate a game. The overlay is just one client, so a phone screen or in-game UI can be added without touching the engine.
