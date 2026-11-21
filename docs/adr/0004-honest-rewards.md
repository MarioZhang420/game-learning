# 0004: Rewards count only after the game confirms them

**Date:** 2026-11-21 · **Status:** Accepted

**Context.** The brief warns against promising in-game effects that no integration provides.

**Decision.** Each game declares the effects it supports. The hub offers only those. An effect is shown to the player only after the game replies `applied`. XP lives in the companion and always works.

**Consequences.** No fake buffs. Games without effects still work with XP only.
