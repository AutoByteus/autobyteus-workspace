# Implementation Progress - file-explorer-move-stale-children

## Kickoff Preconditions Checklist

- Workflow state is current: `Yes`
- Stage 6 + Code Edit Permission Unlocked before edits: `Yes`
- Scope classification confirmed `Small`: `Yes`
- Investigation notes current: `Yes`
- Requirements status `Design-ready` or `Refined`: `Yes`
- Runtime review gate `Implementation can start: Yes`: `Yes`
- Runtime review `Go Confirmed` streak = 2: `Yes`
- Unresolved blocking findings: `No`

## Planned Change Table

| Change ID | Change Type | File | Planned Verification | Notes |
| --- | --- | --- | --- | --- |
| C-101 | Add | `autobyteus-server-ts/src/file-explorer/traversal-ignore-strategy/workspace-ignore-matcher.ts` | Watcher integration tests | Shared ignore evaluation for both watch registration and handler-time filtering |
| C-102 | Modify | `autobyteus-server-ts/src/file-explorer/watcher/watchdog-handler.ts` | Existing ignore regression tests | Delegate runtime ignore decisions to the shared matcher and ignore modify events too |
| C-103 | Modify | `autobyteus-server-ts/src/file-explorer/watcher/file-system-watcher.ts` | Watch-map integration tests + watcher regression suite | Pass a pre-watch `ignored` predicate into chokidar |
| C-104 | Modify | `autobyteus-server-ts/src/api/graphql/types/workspace.ts` | GraphQL e2e test | Reuse `WorkspaceConverter.toGraphql(...)` for shallow create response |
| C-105 | Modify | `autobyteus-server-ts/tests/integration/file-explorer/file-system-watcher.integration.test.ts` | Vitest | Prove ignored directories are absent from chokidar's watch map and document delete semantics for moves into ignored trees |
| C-106 | Modify | `autobyteus-server-ts/tests/e2e/workspaces/workspaces-graphql.e2e.test.ts` | Vitest | Prove `createWorkspace.fileExplorer` is shallow |

## Progress Log

- 2026-03-08: Reopened the ticket for a design-impact issue after user verification exposed large-workspace `EMFILE` watcher failures.
- 2026-03-08: Added `workspace-ignore-matcher.ts` to centralize root ignore strategies plus root/nested `.gitignore` evaluation with cached `.gitignore` parsing.
- 2026-03-08: Updated `watchdog-handler.ts` to reuse the shared matcher and to ignore modify events for ignored paths.
- 2026-03-08: Updated `file-system-watcher.ts` so chokidar excludes ignored/generated trees before watch registration.
- 2026-03-08: Updated `createWorkspace` to delegate to `WorkspaceConverter.toGraphql(...)`, which keeps the initial payload shallow.
- 2026-03-08: Added focused watch-map tests for pre-existing root and nested `.gitignore` exclusions.
- 2026-03-08: Added GraphQL e2e coverage for the shallow `createWorkspace` payload.
- 2026-03-08: Reframed the move-into-ignored-directory watcher test to assert the correct visible-tree result: a delete event for the source path.

## Verification Log

- `pnpm -C autobyteus-server-ts exec vitest --run tests/integration/file-explorer/file-system-watcher.integration.test.ts tests/e2e/workspaces/workspaces-graphql.e2e.test.ts tests/integration/file-explorer/file-explorer.integration.test.ts tests/integration/file-explorer/nested-folder-move-watcher.integration.test.ts`
  - Result: `Pass` (`24` tests)
- `pnpm -C autobyteus-server-ts build`
  - Result: `Pass` (exit code `0`)

## Notes

- The earlier frontend stale-child fix remains in the worktree unchanged for this re-entry.
- Background full initialization of very large non-ignored trees is still a separate performance topic; this implementation closes the ignored-path watcher-handle bug and the eager initial payload inconsistency.
