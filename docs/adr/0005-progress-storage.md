# 0005: Progress in a JSON file behind an interface; SQLite later

**Date:** 2026-11-21 · **Status:** Accepted (replaces the SQLite plan in the first architecture draft)

**Context.** V1 has one learner and small data. SQLite in Electron needs native builds, which slow down beginners.

**Decision.** `FileProgressStore` saves one JSON file per pack, written safely (temp file + rename). The engine only knows the `ProgressStore` interface.

**Consequences.** Simple and easy to inspect. When V2 needs history and reports across packs, a SQLite store can replace it without engine changes.
