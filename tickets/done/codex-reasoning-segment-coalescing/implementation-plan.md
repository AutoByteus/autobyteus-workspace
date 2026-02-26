# Implementation Plan

## Scope
- Fix reasoning-segment fragmentation for Codex runtime by backend coalescing.

## Tasks
1. Add turn-scoped reasoning coalescing in `codex-runtime-event-adapter.ts`.
2. Ensure `turn/completed` clears turn-scoped mapping.
3. Add mapper tests for:
   - coalescing by turn when item ids missing,
   - reset behavior after turn completion,
   - existing stable item-id behavior intact.
4. Run targeted mapper tests and build.

## Rollback Plan
- Revert adapter + tests if unexpected regression appears in segment mapping.
