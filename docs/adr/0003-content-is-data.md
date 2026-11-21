# 0003: Content packs are data linked by facts; no AI during play

**Date:** 2026-11-21 · **Status:** Accepted

**Context.** AI can turn books into lessons and questions, but it can drop or invent facts, costs money, needs internet, and children use the app.

**Decision.** A pipeline makes a content pack ahead of time: source pages → facts (with page numbers) → lessons → questions, all linked by fact ids and checked for coverage. During play, the hub only reads files. See [CONTENT-FORMAT.md](../CONTENT-FORMAT.md).

**Consequences.** Play works offline and free. A person can review every question before a child sees it. Packs can be written by hand without AI.
