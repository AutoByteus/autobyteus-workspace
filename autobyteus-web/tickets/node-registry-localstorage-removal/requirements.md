# Requirements - node-registry-localstorage-removal

## Status
Design-ready

## Goal / Problem Statement
Eliminate stale node-ID rehydration in browser mode by removing node-registry localStorage persistence for `nodeStore`.

## Scope Triage
- Size: `Small`
- Rationale: single frontend store behavior change with test updates.

## In-Scope Use Cases
1. Browser-mode app startup initializes node registry from deterministic default embedded node only.
2. Browser-mode node mutations (add/rename/remove/discovery upsert/prune) update in-memory store only.
3. Electron-mode node registry behavior remains unchanged (IPC/file-backed registry).

## Acceptance Criteria
1. `nodeStore.initializeRegistry()` in non-Electron mode must ignore localStorage registry snapshots.
2. Non-Electron node changes must not write to localStorage.
3. Existing Electron behavior and tests remain intact.
4. Node-store test suite passes with updated expectations.

## Constraints / Dependencies
- No backward-compatibility fallback paths for stale localStorage registry data.
- No backend contract changes.

## Assumptions
- Auto discovery and/or explicit node add is available for browser-mode workflows.

## Open Questions / Risks
- Browser users lose node persistence across reloads for manually added nodes.
