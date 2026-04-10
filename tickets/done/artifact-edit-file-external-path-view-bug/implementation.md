# Implementation

## Scope Classification

- Classification: `Large`
- Reasoning:
  - planned work spans backend file-change ownership, run-memory persistence, live transport, historical hydration, frontend state refactoring, and removal of a narrower stopgap design.

## Document Status

- Current Status: `Stage 6 Local Fix completed; Stage 7 rerun passed; Stage 8 rerun clean for CR-07`

## Approved Design Basis

- Requirements: `tickets/done/artifact-edit-file-external-path-view-bug/requirements.md`
- Proposed Design: `tickets/done/artifact-edit-file-external-path-view-bug/proposed-design.md`
- Future-State Runtime Call Stack: `tickets/done/artifact-edit-file-external-path-view-bug/future-state-runtime-call-stack.md`
- Future-State Runtime Call Stack Review: `tickets/done/artifact-edit-file-external-path-view-bug/future-state-runtime-call-stack-review.md`

## Execution Goal

Implement an agent-run-owned backend file-change projection for `write_file` and `edit_file` so the Artifacts tab can render live file changes and historical file changes from run memory, with one visible row per normalized path and no dependence on Electron-local reads or current filesystem path availability.

## Stage 6 Kickoff

- Stage 5 Review Outcome: `Go Confirmed`
- Stage 6 Entry Trigger: `User approved the redesign and requested continuation through implementation/review on 2026-04-10`
- Code Edit Permission: `Unlocked`
- Active Execution Focus:
  - close `CR-07` by ensuring active-run reopen hydrates or merges the authoritative server projection even when the browser already has some live file-change rows
  - preserve newer live `FILE_CHANGE_UPDATED` rows while filling historical gaps from the projection path
  - rerun focused Stage 7 validation before returning to Stage 8

## Sequencing Strategy

1. Build the backend source of truth first: types, projection store, live owner, lifecycle wiring, and read APIs.
2. Wire live transport and historical query surfaces around that backend contract.
3. Move the frontend from inferred file rows to a dedicated `runFileChangesStore`, then narrow `agentArtifactsStore` to generated outputs only.
4. Remove legacy file-backed stopgap code once the new end-to-end path is covered by tests.

## Execution Work Table

| Change ID | Owner | Concern | Path(s) | Action | Status | Verification |
| --- | --- | --- | --- | --- | --- | --- |
| C-001 | server file-change owner | normalize agent-run events into one file-change row per normalized path and expose authoritative active-run reads | `autobyteus-server-ts/src/services/run-file-changes/run-file-change-service.ts`, `autobyteus-server-ts/src/services/run-file-changes/run-file-change-types.ts` | Create/Modify | In Progress | focused server unit tests |
| C-002 | server persistence | persist run-memory projection JSON plus committed content snapshots | `autobyteus-server-ts/src/services/run-file-changes/run-file-change-projection-store.ts` | Create | In Progress | projection persistence tests + restart/reload tests |
| C-003 | run lifecycle | attach/detach file-change owner to active agent runs | `autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts` | Modify | In Progress | active-run lifecycle tests |
| C-004 | live transport | publish normalized live file-change updates to connected clients | `autobyteus-server-ts/src/services/agent-streaming/*` | Modify | Planned | websocket handler/message-mapper tests |
| C-005 | history API | expose historical file-change projection reads | `autobyteus-server-ts/src/run-history/services/run-file-change-projection-service.ts`, `autobyus-server-ts/src/api/graphql/types/run-file-changes.ts`, related query wiring | Create/Modify | Planned | history resolver/service tests |
| C-006 | content API | serve run-memory-backed file-change content | `autobyteus-server-ts/src/api/rest/run-file-changes.ts` | Create | Planned | content route tests |
| C-007 | frontend file-change state | create a dedicated browser store/handler/hydration path for file-backed rows | `autobyteus-web/stores/runFileChangesStore.ts`, `autobyteus-web/services/agentStreaming/handlers/fileChangeHandler.ts`, `autobyteus-web/services/runHydration/runFileChangeHydrationService.ts` | Create | Planned | store/handler/hydration tests |
| C-008 | frontend artifact UI | render file-backed rows from the new store and keep generated outputs working through the narrowed artifact store | `autobyteus-web/components/workspace/agent/ArtifactsTab.vue`, `autobyteus-web/components/workspace/agent/ArtifactContentViewer.vue`, `autobyteus-web/stores/agentArtifactsStore.ts` | Modify | Planned | component tests + non-regression tests |
| C-009 | legacy removal | remove the current file-backed stopgap route/store logic once the new file-change subsystem is active | `autobyteus-server-ts/src/services/run-artifacts/*`, file-backed portions of current frontend artifact-row synthesis | Remove | Planned | dead-code review + focused regression tests |

## Verification Plan

- Backend focused tests for:
  - live `write_file` buffer updates
  - `edit_file` commit snapshot capture
  - same-path retouch collapsing to one row
  - restart/reload reconstruction from run-memory projection
  - failure/denial state persistence
  - run-memory-backed content serving
- Frontend focused tests for:
  - live file-change updates from normalized backend events
  - historical file-change hydration
  - committed content rendering from the new content route
  - same-path retouch behavior
  - failed-row visibility
  - generated-output non-regression
- Executable validation target:
  - rebuild the Electron app after implementation and rerun the original external-path scenario plus historical reopen checks

## Execution Notes

- Current implementation scope remains agent-run-owned. Team-run-owned aggregation is explicitly deferred.
- No public `changeId` is planned. The visible row identity is `runId + normalizedPath`; existing `invocationId` remains internal live-correlation metadata only.
- Generated outputs remain on the existing artifact flow in current scope and should not be pulled into this redesign unless later evidence requires it.
- The current `run-artifacts` touched-path route is now considered migration scaffolding at most, not the target architecture.
- The current worktree still contains the earlier stopgap route/service changes; Stage 6 execution must treat them as replace-or-remove candidates, not as design constraints.
- Stage 8 Round 4 opened `CR-02`: the active-run read path currently bypasses the in-memory owner and races against `projection.json` persistence, so this re-entry is staying within the approved design and should be treated as a Local Fix rather than a redesign restart.
- `CR-02` is now resolved by routing active-run reads through `RunFileChangeService.getProjectionForRun()` and by adding a blocked-persist regression in `tests/unit/run-history/services/run-file-change-projection-service.test.ts`.
- Stage 8 Round 6 opened `CR-03` and `CR-04`: the current viewer/content contract overpromises non-text file-change preview support and collapses pending content into deleted-file UI.
- `CR-03` and `CR-04` are now resolved by making `/runs/:runId/file-change-content` return explicit `409` pending and `415` unsupported-preview states, by making `ArtifactContentViewer` render pending/failed/unsupported states explicitly, and by preventing non-text file changes from being snapshotted as UTF-8 strings in `RunFileChangeService`.
- Stage 8 Round 8 opened `CR-05`: the current GraphQL hydration shape drops buffered `write_file` content, so reopened or recovered active runs cannot re-render in-flight writes from the backend-owned projection.
- Stage 8 Round 8 opened `CR-06`: failed `write_file` rows still render buffered draft text because the viewer handles buffered-write rows before it handles failed file-change state.
- `CR-05` is now resolved by exposing `content` on the run-file-change GraphQL shape, requesting it in `GetRunFileChanges`, and covering that query contract with a focused frontend regression.
- `CR-06` is now resolved by narrowing buffered-write rendering to `streaming`/`pending` rows only, clearing failed `write_file` buffered content at the backend owner, and teaching the frontend store to apply explicit `null` content updates instead of preserving stale drafts.
- Stage 8 Round 10 opened `CR-07`: the `KEEP_LIVE_CONTEXT` reopen path treats any non-empty browser store as fully hydrated and can therefore skip authoritative file-change projection hydration for active runs that only have a partial live subset loaded.
- `CR-07` is now resolved by giving the frontend an explicit authoritative projection merge path for active-run reopen, wiring `openAgentRun()` to use that merge path in `KEEP_LIVE_CONTEXT`, and adding focused regressions that prove missing historical rows are filled without clobbering newer live rows.
