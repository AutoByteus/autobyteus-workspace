# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/design-spec.md`
- Root-cause report: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/root-cause-report.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/design-review-report.md`
- Code review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/review-report.md`
- API/E2E validation report: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/api-e2e-validation-report.md`
- API/E2E failing rerun log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/backend-file-explorer-websocket-lifecycle-e2e-rerun.log`
- Durable API/E2E test added upstream: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/autobyteus-server-ts/tests/e2e/file-explorer/file-explorer-websocket-lifecycle.e2e.test.ts`

## What Changed

Implemented the reviewed watcher-lifecycle refactor for the Codex `spawn EBADF` investigation:

- Removed frontend auto-starting file-explorer streams from workspace create/fetch/register paths.
- Added visible-consumer live-session ownership in `WorkspaceStore` and `FileExplorer.vue` so a workspace is watched only while a visible file explorer owns a live consumer.
- Changed desktop right-panel collapse from hidden retention to unmounting, preventing hidden Files content from keeping a live watcher.
- Made the mobile dedicated `explorer` panel the only mobile live file-explorer surface; mobile tools mode filters out Files and disables auto-switch-to-files.
- Replaced backend direct watcher startup with reference-counted watcher leases, idempotent lease release, and awaited watcher close.
- Added route-level cleanup for close-before-connect-resolves and handler-level atomic cleanup for setup/send failure.
- Split filename search indexing from persistent live monitoring; search now refreshes a full snapshot on demand without starting a watcher.
- Added diagnostic-only Codex app-server spawn failure context for `EBADF`/`EMFILE`/`ENFILE` style failures: error code, best-effort open file descriptor count, cwd, command, args, runtime label, process fs read/write counters, and descriptor-pressure hint.
- Updated TS tests and the legacy `.js` test mirrors in changed areas so stale old API references are removed from the repository.

Round 2 local fixes from code review:

- CR-001: `FileExplorerStreamHandler.streamLoop()` now self-cleans connected stream send/parse/stream failures by removing the active task, closing the session, releasing the watcher lease exactly once, and closing the socket with 1011 when appropriate.
- CR-002: Reacquiring a visible file explorer now refreshes the root plus already-open descendant folders in depth order, preserving visible open state while reconciling stale child lists and node-index entries through `openFolderRefresh.ts`.
- CR-003: Codex spawn diagnostics now include `runtime=codex_app_server`, `cwd`, `command`, and `args`, with unit assertions for descriptor-pressure and ENOENT paths.

API/E2E round 1 local fix (`E2E-FEWS-001`):

- `FileSystemWatcher.events()` now returns a cancellable per-subscriber async iterator; `return()` unsubscribes that subscriber and wakes any pending `queue.pop()` without stopping other subscribers on the shared watcher.
- `EventBatcher.getBatchedEvents()` now returns a cancellable async iterator; `return()` wakes pending batched consumers and propagates cancellation to the source event generator.
- `FileExplorerSession.close()` now releases its watcher lease before waiting on generator/forwarder shutdown, eliminating the close/release circular wait where final lease release was needed to stop the watcher and unblock real subscriber queues.
- Added focused coverage for idle stream return/unsubscribe behavior while a second subscriber stays live, plus EventBatcher pending-consumer cancellation coverage. The durable real WebSocket lifecycle E2E added by API/E2E now passes locally for the local fix reproduction.

## Key Files Or Areas

Backend source:

- `autobyteus-server-ts/src/file-explorer/base-file-explorer.ts`
- `autobyteus-server-ts/src/file-explorer/local-file-explorer.ts`
- `autobyteus-server-ts/src/file-explorer/file-explorer.ts`
- `autobyteus-server-ts/src/file-explorer/watcher/file-system-watcher.ts`
- `autobyteus-server-ts/src/file-explorer/watcher/event-batcher.ts`
- `autobyteus-server-ts/src/file-explorer/file-name-indexer.ts`
- `autobyteus-server-ts/src/workspaces/filesystem-workspace.ts`
- `autobyteus-server-ts/src/services/file-explorer-streaming/file-explorer-session.ts`
- `autobyteus-server-ts/src/services/file-explorer-streaming/file-explorer-session-manager.ts`
- `autobyteus-server-ts/src/services/file-explorer-streaming/file-explorer-stream-handler.ts`
- `autobyteus-server-ts/src/api/websocket/file-explorer.ts`
- `autobyteus-server-ts/src/runtime-management/codex/client/codex-app-server-client.ts`

Frontend source:

- `autobyteus-web/stores/workspace.ts`
- `autobyteus-web/utils/fileExplorer/openFolderRefresh.ts`
- `autobyteus-web/components/fileExplorer/FileExplorer.vue`
- `autobyteus-web/components/layout/WorkspaceDesktopLayout.vue`
- `autobyteus-web/components/layout/WorkspaceMobileLayout.vue`
- `autobyteus-web/components/layout/RightSideTabs.vue`

Tests:

- `autobyteus-server-ts/tests/e2e/file-explorer/file-explorer-websocket-lifecycle.e2e.test.ts` (added by API/E2E; rerun locally for the Local Fix)
- `autobyteus-server-ts/tests/unit/api/websocket/file-explorer.test.ts` (new)
- `autobyteus-server-ts/tests/unit/runtime-management/codex/client/codex-app-server-client.test.ts` (new)
- `autobyteus-server-ts/tests/unit/file-explorer/local-file-explorer.test.ts`
- `autobyteus-server-ts/tests/unit/file-explorer/file-name-indexer.test.ts`
- `autobyteus-server-ts/tests/unit/file-explorer/watcher/event-batcher.test.ts`
- `autobyteus-server-ts/tests/unit/services/file-explorer-streaming/file-explorer-session*.test.ts`
- `autobyteus-server-ts/tests/unit/services/file-explorer-streaming/file-explorer-stream-handler.test.ts`
- `autobyteus-server-ts/tests/integration/file-explorer/file-name-indexer.integration.test.ts`
- `autobyteus-server-ts/tests/integration/file-explorer/file-system-watcher.integration.test.ts`
- `autobyteus-server-ts/tests/integration/file-explorer/nested-folder-move-watcher.integration.test.ts`
- `autobyteus-web/stores/__tests__/workspaceStore.spec.ts`
- `autobyteus-web/components/fileExplorer/__tests__/FileExplorer.spec.ts`
- `autobyteus-web/components/layout/__tests__/RightSideTabs.spec.ts`
- `autobyteus-web/components/layout/__tests__/WorkspaceDesktopLayout.spec.ts`

## Important Assumptions

- Codex app-server client changes are diagnostic-only on failure paths; no retry, fallback behavior, process command, args, cwd, or normal spawn semantics were intentionally changed.
- File search is request/response snapshot work, not a live-monitoring owner.
- Visible `FileExplorer` components are the only frontend owners of file-explorer live watcher streams.
- The API/E2E-authored durable WebSocket lifecycle test is now part of the repository state and therefore this updated state must return through code review before API/E2E resumes.
- Durable documentation updates are left for delivery after code review/API-E2E because `autobyteus-web/docs/file_explorer.md` still documents old `connectToFileSystemChanges`/`disconnectFromFileSystemChanges` names.

## Known Risks

- Full app typechecks still fail from pre-existing/baseline config and typing issues unrelated to this implementation. See local checks below.
- The actual EBADF/descriptor-pressure symptom is environment/load-sensitive. Local implementation checks validate lifecycle mechanics and diagnostics plumbing, but downstream API/E2E should still run the high-churn visible/collapsed/mobile watcher scenarios.
- Existing repository tracks legacy `.js` mirrors for some server tests while Vitest includes only `tests/**/*.test.ts`; changed mirrors in touched areas were updated to avoid stale old API references, but the TS tests remain the authoritative executed tests.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Refactor watcher ownership and lifecycle to remove accidental persistent file monitoring; add diagnostic-only spawn failure context.
- Reviewed root-cause classification: descriptor pressure from frontend/backend watcher lifecycle leaks can surface as Codex child-process `spawn EBADF`.
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): `Refactor Needed Now`.
- Implementation matched the reviewed assessment (`Yes`/`No`): `Yes`.
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): `N/A`.
- Evidence / notes: Frontend stream ownership now follows visible consumers; backend live watcher ownership is through leases; search no longer starts a live watcher; WebSocket pending-connect cleanup, setup-failure cleanup, connected stream send-failure cleanup, open-folder refresh, spawn diagnostic context, and real watcher subscriber cancellation are covered by targeted tests and the API/E2E local-fix reproduction rerun.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`.
- Legacy old-behavior retained in scope: `No`.
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes` for source/tests in implementation scope; durable docs are explicitly deferred to delivery.
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`.
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`; no design-impact reroute was needed.
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): `Yes`; source line guard found no changed source implementation file over 500 effective non-empty lines.
- Notes: `autobyteus-web/stores/fileExplorer.ts` was intentionally not changed to avoid leaving an existing >500-line source file in the changed set. CR-002 tree-refresh reconciliation was extracted to `autobyteus-web/utils/fileExplorer/openFolderRefresh.ts`.

## Environment Or Dependency Notes

- The worktree did not have local `node_modules`. For local checks only, temporary symlinks to `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/.../node_modules` were created and removed before handoff.
- Frontend test setup required generated Nuxt artifacts; `pnpm -C autobyteus-web exec nuxt prepare` was used earlier in the implementation session.
- No package/dependency changes were made.

## Local Implementation Checks Run

Passed:

- `pnpm -C autobyteus-server-ts test tests/unit/file-explorer/watcher/event-batcher.test.ts tests/unit/file-explorer/file-name-indexer.test.ts tests/unit/file-explorer/local-file-explorer.test.ts tests/unit/services/file-explorer-streaming/file-explorer-session-manager.test.ts tests/unit/services/file-explorer-streaming/file-explorer-session.test.ts tests/unit/services/file-explorer-streaming/file-explorer-stream-handler.test.ts tests/unit/api/websocket/file-explorer.test.ts tests/unit/runtime-management/codex/client/codex-app-server-client.test.ts`
  - Result: pass, 8 files / 47 tests.
- `pnpm -C autobyteus-server-ts test tests/integration/file-explorer/file-name-indexer.integration.test.ts tests/integration/file-explorer/file-system-watcher.integration.test.ts tests/integration/file-explorer/nested-folder-move-watcher.integration.test.ts`
  - Result: pass, 3 files / 17 tests.
- `pnpm -C autobyteus-server-ts build:full`
  - Result: pass, including built-in agents bootstrap smoke check.
- `pnpm -C autobyteus-web test:nuxt components/fileExplorer/__tests__/FileExplorer.spec.ts components/layout/__tests__/RightSideTabs.spec.ts components/layout/__tests__/WorkspaceDesktopLayout.spec.ts stores/__tests__/workspaceStore.spec.ts`
  - Result: pass, 4 files / 30 tests.
- `node -e "const { spawn } = require('node:child_process'); const child=spawn('/bin/echo',['codex-spawn-probe-ok']); child.stdout.on('data',d=>process.stdout.write(d)); child.on('error',e=>{ console.error(e); process.exit(1); }); child.on('exit',code=>process.exit(code??1));"`
  - Result: pass, prints `codex-spawn-probe-ok`.
- Effective source line guard script across changed source implementation files.
  - Result: pass, no changed source implementation file over 500 effective non-empty lines.
- Source direct watcher API grep: `grep -R "\.startWatcher\|\.stopWatcher\|startWatcher()\|stopWatcher()" -n autobyteus-server-ts/src autobyteus-web --exclude-dir=node_modules`
  - Result: only the authoritative `FileExplorer` methods and `LocalFileExplorer` lease owner call them; no frontend/caller-level bypasses found.

API/E2E local-fix reproduction rerun requested by API/E2E engineer; this is not a downstream validation sign-off:

- `pnpm -C autobyteus-server-ts test tests/e2e/file-explorer/file-explorer-websocket-lifecycle.e2e.test.ts`
  - Result: command completed successfully, 1 file / 3 tests. It exercises watcher-free create/search, shared real watcher leases across two real WebSocket clients, real `FILE_SYSTEM_CHANGE` delivery, early-close cleanup, repeated open/close cleanup, descriptor-growth guard, and child-process spawn health.
- `pnpm -C autobyteus-server-ts test tests/unit/file-explorer/watcher/event-batcher.test.ts tests/e2e/file-explorer/file-explorer-websocket-lifecycle.e2e.test.ts`
  - Result: command completed successfully after adding `Symbol.asyncDispose` for build/type compatibility, 2 files / 5 tests.

Attempted / currently failing due existing baseline issues:

- `pnpm -C autobyteus-server-ts typecheck`
  - Result: fails with existing `TS6059` because `tsconfig.json` includes `tests` while `rootDir` is `src`; `pnpm -C autobyteus-server-ts build:full` passed against `tsconfig.build.json`.
- `pnpm -C autobyteus-web exec nuxi typecheck`
  - Result: fails with existing/baseline type errors across build scripts, unrelated components/tests/stores, missing `~/stores/agents`, and Apollo typings; grep found no errors in changed frontend files, including `openFolderRefresh.ts`.

## Downstream Validation Hints / Suggested Scenarios

- Desktop: create/fetch workspaces without opening Files; confirm no file-explorer WebSocket and no watcher lease are opened until Files is actually visible.
- Desktop: open Files, switch to another right-side tab, collapse the right panel, and navigate workspaces; confirm live session release and watcher close are awaited after the last visible consumer leaves.
- Mobile: verify only the dedicated `explorer` panel can render `FileExplorer`; mobile tools should not list Files, should not auto-switch to Files, and should not instantiate `FileExplorerLayout`.
- WebSocket race: open file-explorer WebSocket and close before auth/connect resolves; confirm late sessions are disconnected and watcher leases are released.
- Setup failure: simulate watcher unavailable and send failure after session registration; confirm `WATCHER_UNAVAILABLE`/`SESSION_ERROR` behavior and lease/session cleanup.
- Connected stream failure: simulate a `FILE_SYSTEM_CHANGE` send failure after CONNECTED succeeds; confirm session close and watcher lease release.
- Real watcher subscriber cancellation: close one of two real file-explorer WebSockets while both share one watcher; confirm the first session release decrements the lease while the second session/watcher remains live, then final close stops the watcher.
- Search: run file search without any visible file explorer; confirm search refreshes snapshot/index and no live watcher lease is acquired.
- Descriptor pressure: repeat the original high-churn reproduction while capturing Codex app-server spawn diagnostics; expect EBADF/EMFILE/ENFILE errors to include code, open_fds, fs_read/fs_write, cwd, command, args, runtime, and the descriptor-pressure hint.

## API / E2E / Executable Validation Still Required

API/E2E validation should resume after code re-review. The specific failing durable WebSocket lifecycle E2E was rerun locally for the Local Fix and now completes successfully, but broader downstream validation remains owned by `api_e2e_engineer`.
