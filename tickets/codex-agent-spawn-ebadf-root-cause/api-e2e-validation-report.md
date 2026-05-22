# API, E2E, And Executable Validation Report

## Validation Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/implementation-handoff.md`
- Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/review-report.md`
- Current Validation Round: `4`
- Trigger: Code review round 4 failed API/E2E-owned durable validation on `CR-004`; write/delete GraphQL E2E assertions allowed empty `changes` arrays despite claiming explicit change-event coverage.
- Prior Round Reviewed: `3`
- Latest Authoritative Round: `4`

## Round History

| Round | Trigger | Prior Unresolved Failures Rechecked | New Failures Found | Result | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Code review round 2 pass + user request for strong real E2E coverage | N/A | `E2E-FEWS-001` | Fail | No | Added a real Fastify + `ws` file-explorer WebSocket lifecycle E2E. It found that real disconnects could leave watcher leases/sessions alive until workspace close. |
| 2 | Code review round 3 pass after local fix for `E2E-FEWS-001` | `E2E-FEWS-001` | None | Pass | No | Re-ran the durable real E2E, targeted backend/frontend suites, builds, Electron tests, stale-reference probes, and an added multi-process macOS high-churn embedded-server harness with real GraphQL, WebSocket, filesystem watcher, descriptor sampling, and Codex app-server model-catalog activation. |
| 3 | User requested broader assurance that existing workspace/file-explorer E2E coverage was updated where relevant | None | None | Pass | No | Audited existing workspace/file-explorer E2E coverage and updated three durable GraphQL E2E files to assert watcher-free behavior for createWorkspace shallow payloads, folder/search snapshots, and file create/write/read/delete/rename operations without a visible file-explorer stream. |
| 4 | Code review round 4 Local Fix for `CR-004` in API/E2E-owned durable validation | `CR-004` | None | Pass | Yes | Tightened `file-operations-graphql.e2e.test.ts` so write/delete assertions fail on empty `changes` arrays and require expected explicit change events while preserving watcher-free assertions. Expanded E2E rerun passed. |

## Validation Basis

Validation was derived from the reviewed requirements/design, updated implementation handoff, updated code review report, prior API/E2E failure evidence, and observed runtime behavior. The validation focus was:

- workspace create/fetch/search must not open file-explorer WebSockets or live recursive watchers;
- visible file explorers must open exactly one backend live stream per visible consumer and share one watcher for the same workspace;
- switching away, collapsing, unmounting, final disconnect, setup failure, send/stream failure, close-before-connect, and repeated open/close cycles must release sessions/watchers promptly;
- mobile tools must not expose the Files tab or instantiate `FileExplorerLayout`; the dedicated mobile explorer panel is the only mobile file-explorer live surface;
- search/folder snapshot operations must work without acquiring live watcher leases;
- descriptor-pressure prevention must be proven by executable lifecycle evidence, not only mocked counters;
- Codex `spawn EBADF`/`EMFILE` diagnostics must include runtime, cwd, command, args, code, open fd count, fs counters, and descriptor-pressure hint.

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable validation added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: `N/A`
- Upstream recipient notified: `N/A`

## Validation Surfaces / Modes

- Backend unit tests for watcher leases, session cancellation, route races, setup failure, send failure, close-before-connect, and Codex spawn diagnostics.
- Backend integration tests for filename indexing, file search, and real `FileSystemWatcher` filesystem events.
- Durable backend E2E test using actual Fastify, `@fastify/websocket`, real `ws` clients, real `WorkspaceManager`, real `LocalFileExplorer`, real `chokidar`, real filesystem events, repeated socket lifecycle, descriptor sampling, and `/bin/echo` child-process spawn probe.
- Frontend Nuxt/Vitest component/store tests for visible-consumer ownership, desktop right-panel unmounting, mobile tools suppression, and refresh-on-reacquire behavior.
- Full Electron Vitest suite for native desktop support code.
- Production Nuxt build.
- Existing workspace/file-explorer GraphQL E2E tests updated to assert the broader workspace APIs remain watcher-free when no file-explorer stream is visible.
- Temporary macOS multi-process harness that launched the built backend `dist/app.js` as a separate process with an isolated app data directory, then exercised real GraphQL create/search/folder APIs, real file-explorer WebSockets, real filesystem change delivery, descriptor-count sampling through `lsof`, repeated churn, and Codex app-server model-catalog activation.

## Platform / Runtime Targets

- Host: macOS/Darwin arm64, Node `v22.21.1`, pnpm `10.28.2`.
- Backend test runtime: Vitest in `autobyteus-server-ts`.
- Frontend test runtime: Nuxt/Vitest in `autobyteus-web`.
- Native desktop runtime coverage: Electron support-code suite passed; high-churn descriptor/Codex activation path was exercised through the same built backend entrypoint (`autobyteus-server-ts/dist/app.js`) that Electron packages as the embedded server.
- Packaged `.app` binary launch: not executed in this validation pass because no current-code packaged app was present in the worktree. I did not use the older superrepo packaged app as evidence because it was not the reviewed implementation state.

## Lifecycle / Upgrade / Restart / Migration Checks

No upgrade/restart/version migration was in scope. Lifecycle validation focused on:

- WebSocket open/close/reopen;
- watcher lease acquisition/release and awaited watcher stop;
- close-before-`CONNECTED` cleanup;
- shared-consumer final disconnect cleanup;
- descriptor count before, during, and after high churn;
- child-process and Codex app-server activation after high churn.

## Coverage Matrix

| Scenario ID | Requirement / Acceptance Coverage | Validation Method | Result | Evidence |
| --- | --- | --- | --- | --- |
| `SCN-001` | Workspace create/fetch/search should not start live watchers (`REQ-001`, `REQ-008`, `AC-001`, `AC-006`) | Backend unit/integration + durable E2E + high-churn separate server GraphQL create/search/folder snapshot with no WS | Pass | `api-e2e-round2-backend-targeted-unit.log`; `api-e2e-round2-backend-file-explorer-integration.log`; `api-e2e-round2-file-explorer-websocket-lifecycle.log`; high-churn fd samples stayed 38 -> 39 through three create/search/folder snapshot workspaces with no websocket. |
| `SCN-002` | Opening visible file explorer starts a real stream/watcher | Durable E2E + high-churn separate server WebSocket | Pass | Durable E2E passed 3 tests; high-churn saw fd count rise from 39 snapshot-only to 162 after first visible WebSocket. |
| `SCN-003` | Concurrent visible consumers share one watcher and final disconnect stops it (`AC-007`, `AC-008`) | Durable E2E + high-churn two shared WebSockets | Pass | `api-e2e-round2-file-explorer-websocket-lifecycle.log`; high-churn fd count 162 after first WS, 163 after second, then 33 after closing final shared websocket. |
| `SCN-004` | Live file events arrive over real stream while visible (`AC-012`) | Durable E2E + high-churn real file creation | Pass | Durable E2E received `FILE_SYSTEM_CHANGE`; high-churn received add event for `live-added-from-harness.txt`. |
| `SCN-005` | Close-before-`CONNECTED` / early-close cycles do not leak (`REQ-009A`, `AC-014`) | Durable E2E + high-churn 10 early-close cycles | Pass | Durable E2E passed; high-churn fd count stayed 33 after 10 close-before-connected cycles. |
| `SCN-006` | Repeated open/close cycles do not grow descriptors and child-process spawn remains healthy (`AC-009`, `AC-010`) | Durable E2E + high-churn 20 open/close cycles + `/bin/echo` spawn | Pass | High-churn fd samples returned to 33 after cycles 1, 10, 20 and after all 20 cycles; `codex-spawn-probe-ok` succeeded. |
| `SCN-007` | Setup failure, connected send failure, final disconnect, stream failure, and pending-route cleanup at unit boundary (`REQ-009`, `REQ-009A`, `REQ-009B`, `AC-015`) | Targeted backend unit tests | Pass | `api-e2e-round2-backend-targeted-unit.log`: 8 files / 47 tests passed. |
| `SCN-008` | Desktop/mobile frontend visibility policy (`REQ-002`, `REQ-003`, `REQ-004A`, `AC-002`, `AC-003`, `AC-004`, `AC-004A`) | Targeted frontend Nuxt tests | Pass | `api-e2e-round2-frontend-targeted.log`: 4 files / 30 tests passed. Includes mobile-tools filtering/no `FileExplorerLayout` and desktop right-panel collapse unmount behavior. |
| `SCN-009` | Codex EBADF diagnostics include runtime/cwd/command/args/code/open_fds/fs counters/hint (`REQ-013`, `AC-013`) | Targeted backend unit test + source assertion review | Pass | `api-e2e-round2-backend-targeted-unit.log` includes `codex-app-server-client.test.ts`; test source asserts `runtime=codex_app_server`, `cwd`, `command`, `args`, `code=EBADF`, `open_fds`, `fs_read`, `fs_write`, and descriptor-pressure hint. |
| `SCN-010` | Codex app-server activation remains healthy after watcher churn (`AC-011` intent, descriptor-pressure original scenario proxy) | High-churn separate server GraphQL provider/model catalog query with `runtimeKind: codex_app_server` after watcher churn | Pass | `api-e2e-round2-embedded-server-high-churn.json`: `codexVersion=codex-cli 0.132.0`, provider probe OK, 13 providers / 6 models, final fd count 33. |
| `SCN-011` | Native desktop support-code regression surface | Electron Vitest suite | Pass | `api-e2e-round2-frontend-electron-tests.log`: 24 files passed / 96 tests passed, 1 skipped real-release test. |
| `SCN-012` | Frontend production build | Nuxt production build | Pass | `api-e2e-round2-frontend-nuxt-build.log`: build complete; warnings are existing chunk-size/dynamic-import warnings, not failures. |
| `SCN-013` | Stale watcher API/source reference removal | Source/test greps | Pass | `api-e2e-round2-stale-watcher-api-grep.log` empty; `api-e2e-round2-direct-watcher-api-grep.log` only authoritative `FileExplorer` methods and `LocalFileExplorer` lease owner calls. |
| `SCN-014` | Broader workspace/file-explorer GraphQL E2E remains watcher-free without a visible stream (`REQ-001`, `REQ-005`, `REQ-006`, `REQ-008`, `REQ-012`, `AC-001`, `AC-006`, `AC-012`) | Updated existing durable E2E tests: workspaces GraphQL, file-explorer GraphQL, file-operations GraphQL | Pass | `api-e2e-round4-expanded-workspace-file-explorer-e2e.log`: 4 E2E files / 12 tests passed. New/tightened assertions cover createWorkspace shallow fileExplorer payload, folderChildren/search snapshot refresh, and file write/read/delete/create/rename operations without creating watcher leases; write/delete now fail on empty changes arrays. |

## Test Scope

Round 1 added durable E2E because the user explicitly emphasized real E2E coverage. That test caught `E2E-FEWS-001`, a real cancellation/leak defect that mocked unit tests did not reveal. Round 2 re-ran that durable E2E after the implementation fix and added a broader executable high-churn process harness to prove descriptor behavior in a realistic separate backend process.

## Validation Setup / Environment

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause`
- Evidence directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/`
- Temporary dependency symlinks were created from `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/.../node_modules` to run tests in the worktree and were removed before handoff.
- The high-churn harness used temporary workspace roots and an isolated temporary app data directory under the OS temp directory; it removed those temp directories during cleanup.
- For the separate server process on macOS, the harness set isolated app/data/database/log/memory paths and explicit macOS Prisma engine paths so current-code `dist/app.js` could start without touching the user's live server data.

## Tests Implemented Or Updated

Round 1 added durable repository-resident E2E test:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/autobyteus-server-ts/tests/e2e/file-explorer/file-explorer-websocket-lifecycle.e2e.test.ts`

Round 3 **did** update repository-resident durable validation after code review round 3, because the user clarified that broader workspace/file-explorer E2E coverage should be audited and strengthened. Round 4 tightened those durable assertions for `CR-004`. The updated durable tests are existing E2E files, not product implementation files.

The durable E2E covers:

1. watcher-free `createWorkspace` + `searchFiles`, then real visible WebSocket watcher acquisition, two-consumer sharing, real live file event delivery, and disconnect release;
2. sockets closed before `CONNECTED` is observed;
3. repeated open/close cycles with descriptor-count and child-process spawn probes after successful cleanup.

## Durable Validation Added To The Codebase

- Repository-resident durable validation added or updated in round 1: `Yes`
- Paths added or updated:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/autobyteus-server-ts/tests/e2e/file-explorer/file-explorer-websocket-lifecycle.e2e.test.ts`
- Returned through `code_reviewer` before delivery: `Yes`; code review round 3 passed and specifically reviewed the durable E2E.
- Repository-resident durable validation added or updated after code review round 3: `Yes`
- Paths updated after code review round 3:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/autobyteus-server-ts/tests/e2e/workspaces/workspaces-graphql.e2e.test.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/autobyteus-server-ts/tests/e2e/file-explorer/file-explorer-graphql.e2e.test.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/autobyteus-server-ts/tests/e2e/file-explorer/file-operations-graphql.e2e.test.ts`
- Returned through `code_reviewer` before delivery resumes: `Pending; this round routes to code_reviewer because durable E2E changed after code review round 3.`
- Latest post-validation code review artifact before this round: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/review-report.md`

## Other Validation Artifacts

Round 2 final/resumed evidence:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round2-file-explorer-websocket-lifecycle.log`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round2-backend-targeted-unit.log`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round2-backend-file-explorer-integration.log`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round2-backend-focused-lifecycle.log`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round2-backend-build-full.log`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round2-frontend-targeted.log`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round2-frontend-electron-tests.log`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round2-frontend-nuxt-build.log`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round2-stale-watcher-api-grep.log`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round2-direct-watcher-api-grep.log`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round2-embedded-server-high-churn.log`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round2-embedded-server-high-churn.json`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round2-embedded-server-high-churn-server.stdout.log`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round2-embedded-server-high-churn-server.stderr.log`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round3-expanded-workspace-file-explorer-e2e.log`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round4-expanded-workspace-file-explorer-e2e.log`

Historical/pre-fix evidence retained:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/backend-file-explorer-websocket-lifecycle-e2e-rerun.log`

## Temporary Validation Methods / Scaffolding

- Temporary dependency symlinks were used for local execution and removed before handoff.
- The high-churn harness script is retained under `validation-artifacts` as a reproducibility/evidence artifact, not as repository-resident product/test code:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round2-embedded-server-high-churn.mjs`
- No temporary app data or workspace directories from the harness remain.

## Dependencies Mocked Or Emulated

- The durable lifecycle E2E does not mock the file-explorer streaming stack. It uses real Fastify WebSocket routing, real `ws` clients, real workspace manager/workspace/file explorer instances, real `chokidar`, and real filesystem events.
- The high-churn harness does not mock the backend server, GraphQL API, WebSocket route, filesystem watcher, filesystem events, descriptor counts, child-process spawn, or Codex app-server model-catalog activation. It uses temporary workspaces and an isolated app data directory only to avoid touching user data.
- Frontend/Electron tests use their established Vitest mocks where those tests are component/support-code scoped.

## Prior Failure Resolution Check (Mandatory On Round >1)

| Prior Round | Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | `E2E-FEWS-001` — real WebSocket disconnect/early-close/repeated open-close lifecycle left watcher leases/sessions alive until workspace close | `Local Fix` to implementation_engineer | Resolved | `api-e2e-round2-file-explorer-websocket-lifecycle.log`; `api-e2e-round2-backend-focused-lifecycle.log`; `api-e2e-round2-embedded-server-high-churn.json` | Durable E2E now passes 1 file / 3 tests. High-churn separate-server fd samples return to 33 after final shared close, repeated 20 cycles, and 10 early-close cycles. |
| 2 | Broader workspace/file-explorer E2E coverage did not yet assert watcher-free behavior across existing GraphQL workspace/file APIs | Coverage gap, not product failure | Resolved | `api-e2e-round3-expanded-workspace-file-explorer-e2e.log` | Existing durable E2E files were updated; 4 E2E files / 12 tests passed. |
| 3 / Code review round 4 | `CR-004` — write/delete durable E2E assertions allowed empty explicit change arrays | `Local Fix` to API/E2E durable validation | Resolved | `api-e2e-round4-expanded-workspace-file-explorer-e2e.log` | Write now asserts non-empty changes and at least one `add`/`modify`; delete now asserts non-empty changes plus a `delete` change with required identifiers. Expanded E2E passed 4 files / 12 tests. |

## Scenarios Checked

### `E2E-FEWS-001` — Real WebSocket disconnect and early-close lifecycle

- Command: `pnpm -C autobyteus-server-ts test tests/e2e/file-explorer/file-explorer-websocket-lifecycle.e2e.test.ts`
- Evidence: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round2-file-explorer-websocket-lifecycle.log`
- Result: `Pass`, 1 file / 3 tests.
- Observed behavior:
  - workspace creation and search do not create a watcher;
  - real WebSocket `CONNECTED` creates a watcher lease;
  - two real clients share the same watcher;
  - a real file add emits `FILE_SYSTEM_CHANGE`;
  - closing one of two clients decrements the lease while preserving the shared watcher;
  - closing the final client stops the watcher and clears the active reference;
  - early-close and repeated open/close cycles complete without leaks;
  - child-process spawn probe remains healthy.

### High-churn separate backend process / descriptor pressure / Codex activation

- Command: `node tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round2-embedded-server-high-churn.mjs`
- Evidence: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round2-embedded-server-high-churn.json`
- Result: `Pass`.
- Key evidence:
  - separate current-code backend process started from `autobyteus-server-ts/dist/app.js` on macOS arm64;
  - three workspaces with 123 files each were created/searched/snapshotted with no WebSocket and fd count stayed 38 -> 39;
  - first visible file-explorer WebSocket raised fds to 162; second same-workspace WebSocket raised to 163, consistent with shared watcher plus one socket;
  - final shared close returned fds to 33;
  - 20 repeated open/close cycles returned fds to 33 after cycle 1, cycle 10, cycle 20, and final sample;
  - 10 close-before-connected cycles left fds at 33;
  - `/bin/echo` spawn probe succeeded after churn;
  - `codex --version` succeeded (`codex-cli 0.132.0`);
  - GraphQL `availableLlmProvidersWithModels(runtimeKind: "codex_app_server")` succeeded after churn, returning 13 providers and 6 models;
  - final fd sample after Codex probe was 33.

## Passed

- `git diff --check -- autobyteus-server-ts/tests/e2e/file-explorer/file-operations-graphql.e2e.test.ts autobyteus-server-ts/tests/e2e/file-explorer/file-explorer-graphql.e2e.test.ts autobyteus-server-ts/tests/e2e/workspaces/workspaces-graphql.e2e.test.ts`
  - Result: Pass.
- `pnpm -C autobyteus-server-ts test tests/e2e/workspaces/workspaces-graphql.e2e.test.ts tests/e2e/file-explorer/file-explorer-graphql.e2e.test.ts tests/e2e/file-explorer/file-operations-graphql.e2e.test.ts tests/e2e/file-explorer/file-explorer-websocket-lifecycle.e2e.test.ts`
  - Round 4 result after `CR-004` fix: Pass, 4 files / 12 tests.
  - Round 3 result before `CR-004` fix: Pass, 4 files / 12 tests.
- `pnpm -C autobyteus-server-ts test tests/e2e/file-explorer/file-explorer-websocket-lifecycle.e2e.test.ts`
  - Result: Pass, 1 file / 3 tests.
- `pnpm -C autobyteus-server-ts test tests/unit/file-explorer/watcher/event-batcher.test.ts tests/unit/file-explorer/file-name-indexer.test.ts tests/unit/file-explorer/local-file-explorer.test.ts tests/unit/services/file-explorer-streaming/file-explorer-session-manager.test.ts tests/unit/services/file-explorer-streaming/file-explorer-session.test.ts tests/unit/services/file-explorer-streaming/file-explorer-stream-handler.test.ts tests/unit/api/websocket/file-explorer.test.ts tests/unit/runtime-management/codex/client/codex-app-server-client.test.ts`
  - Result: Pass, 8 files / 47 tests.
- `pnpm -C autobyteus-server-ts test tests/integration/file-explorer/file-name-indexer.integration.test.ts tests/integration/file-explorer/file-system-watcher.integration.test.ts tests/integration/file-explorer/nested-folder-move-watcher.integration.test.ts`
  - Result: Pass, 3 files / 17 tests.
- `pnpm -C autobyteus-server-ts test tests/e2e/file-explorer/file-explorer-websocket-lifecycle.e2e.test.ts tests/unit/file-explorer/watcher/event-batcher.test.ts tests/integration/file-explorer/file-system-watcher.integration.test.ts tests/unit/services/file-explorer-streaming/file-explorer-session.test.ts tests/unit/services/file-explorer-streaming/file-explorer-stream-handler.test.ts`
  - Result: Pass, 5 files / 34 tests.
- `pnpm -C autobyteus-web test:nuxt components/fileExplorer/__tests__/FileExplorer.spec.ts components/layout/__tests__/RightSideTabs.spec.ts components/layout/__tests__/WorkspaceDesktopLayout.spec.ts stores/__tests__/workspaceStore.spec.ts`
  - Result: Pass, 4 files / 30 tests.
- `pnpm -C autobyteus-web test:electron`
  - Result: Pass, 24 files / 96 tests passed, 1 skipped.
- `pnpm -C autobyteus-server-ts build:full`
  - Result: Pass.
- `pnpm -C autobyteus-web build`
  - Result: Pass.
- Stale watcher API grep excluding deferred docs:
  - Result: no stale source/test references found.
- Direct watcher API grep:
  - Result: only authoritative `FileExplorer` methods and `LocalFileExplorer` lease owner calls remain.
- High-churn separate backend process harness:
  - Result: Pass.

## Failed

None in the latest authoritative validation round.

## Not Tested / Out Of Scope

- Fresh packaged `.app` build-and-launch was not run. The worktree did not contain a current-code packaged app, and the older packaged app in the superrepo was not used as evidence because it did not represent the reviewed implementation state.
- Full mobile device/browser automation was not run; mobile render suppression remains covered by targeted Nuxt/Vitest tests and source-reviewed route ownership.
- A full agent conversation using GPT-5.5 was not run; the original descriptor-pressure/Codex-spawn risk was covered by real child-process spawn and a real `codex_app_server` model-catalog activation after watcher churn, without making an external model call.

## Blocked

None for API/E2E sign-off. The packaged `.app` launch gap is recorded as a residual validation limitation, not a blocking implementation failure, because the current-code embedded backend lifecycle, descriptor-pressure path, and Codex app-server activation path were exercised directly and passed.

## Cleanup Performed

- Removed temporary dependency symlinks created for validation:
  - root `node_modules`
  - package `node_modules` symlinks for backend/shared packages used during checks
- The high-churn harness removed its temporary app data directory and temporary workspace directories.
- Generated/ignored build artifacts from Nuxt/Electron/Vitest were left only where the project build/test tooling normally writes ignored outputs.

## Classification

- `Local Fix`: used for API/E2E-owned durable-validation assertion gap `CR-004`; resolved in round 4. Prior implementation local fix `E2E-FEWS-001` remains resolved.
- `Design Impact`: not used.
- `Requirement Gap`: not used.
- `Unclear`: not used.

## Recommended Recipient

`code_reviewer`

## Evidence / Notes

The user explicitly emphasized that enough real E2E tests are extremely important, then clarified that existing workspace/file-explorer E2E coverage should also be audited and updated where relevant. The validation suite now includes a durable real backend WebSocket E2E that previously found a real leak and now passes after the implementation fix, a separate-process high-churn macOS harness, and expanded existing GraphQL workspace/file-explorer E2E coverage that proves broader workspace APIs remain watcher-free without a visible file-explorer stream. `CR-004` is resolved in the durable validation: write/delete assertions now fail on empty `changes` arrays and require explicit expected change events.

Durable docs still need delivery-phase update: `autobyteus-web/docs/file_explorer.md` documents old stream method names and old watcher behavior.

## Latest Authoritative Result

- Result values: `Pass` / `Fail` / `Blocked`
- Result: `Pass`
- Notes: API/E2E validation signs off the current implementation state, but repository-resident durable validation was updated after code review round 3. Per workflow, this must return through `code_reviewer` before delivery resumes.
