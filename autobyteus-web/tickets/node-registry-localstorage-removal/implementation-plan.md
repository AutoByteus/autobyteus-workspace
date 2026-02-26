# Implementation Plan - node-registry-localstorage-removal

## Small-Scope Solution Sketch
- Remove localStorage read/write logic from `nodeStore` browser fallback path.
- Keep browser fallback deterministic: default embedded node snapshot only.
- Update nodeStore unit tests to verify localStorage is ignored and state remains in-memory.

## Tasks
1. Edit `/Users/normy/autobyteus_org/worktrees/team-history-restore/autobyteus-web/stores/nodeStore.ts`.
2. Update `/Users/normy/autobyteus_org/worktrees/team-history-restore/autobyteus-web/stores/__tests__/nodeStore.spec.ts`.
3. Run targeted tests for node store.

## Verification Strategy
- `pnpm vitest run stores/__tests__/nodeStore.spec.ts`
