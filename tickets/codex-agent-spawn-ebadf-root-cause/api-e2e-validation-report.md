# API, E2E, And Executable Validation Report

## Validation Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/design-spec.md`
- Root Cause Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/root-cause-report.md`
- Design Impact Rework Note: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/design-impact-rework-history-lazy-workspace.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/implementation-handoff.md`
- Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/review-report.md`
- Current Validation Round: `12`
- Trigger: Code review round 25 pass after the `CR-017` local fix for FileExplorer rename path-boundary validation.
- Latest Authoritative Round: `12`
- Overall Result: `Pass`
- Recommended Recipient: `code_reviewer`

## Round History

| Round | Trigger | Prior Unresolved Failures Rechecked | New Failures Found | Result | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Code review round 2 pass + user request for strong real E2E coverage | N/A | `E2E-FEWS-001` | Fail | No | Added real Fastify + `ws` file-explorer WebSocket lifecycle E2E; found watcher lease/session leak on disconnect. |
| 2 | Code review round 3 pass after local fix for `E2E-FEWS-001` | `E2E-FEWS-001` | None | Pass | No | Real file-explorer E2E, targeted backend/frontend suites, builds, Electron tests, stale-reference probes, and macOS high-churn harness passed. |
| 3 | User requested broader workspace/file-explorer E2E assurance | None | None | Pass | No | Updated workspace/file-explorer GraphQL E2E for watcher-free create/search/folder/file-operation paths. |
| 4 | Code review round 4 Local Fix for `CR-004` in API/E2E durable validation | `CR-004` | None | Pass | No | Tightened file-operation E2E so write/delete fail on empty `changes`. |
| 5 | Code review round 8 pass after lazy workspace-reference/history-display/team-run changes | Prior file-explorer and team-run risks | None | Pass | No | Added/updated durable workspace metadata/team-run validation; broad backend/frontend/Electron/build/high-churn validation passed. |
| 6 | Code review round 11 pass after Terminal cwd and Mobile Files/Tools local fixes | `CR-009`, `CR-010`, round 11 residual risks | `E2E-TERMFD-001` | Fail | No | Added durable real Terminal WebSocket E2E and mobile context/live-session tests. Broader suites passed, but built-backend macOS terminal close-before-connect FD probe found descriptor growth from `38` to `111` FDs after 25 early-close cycles. |
| 7 | Code review round 12 pass after implementation local fix for `E2E-TERMFD-001` | `E2E-TERMFD-001`, Round 6 matrix | None | Pass | No | Focused terminal FD probe now remains bounded: `38` FDs after normal attached close, `39` FDs after 25 early-close cycles/final wait, 0 child processes. Broader backend, frontend, Electron, high-churn, boundary, and build validation passed. |
| 8 | User requested real browser-level frontend/backend validation after broad refactor | Round 7 pass plus workspace/file-explorer browser concern | None | Pass | No | Started backend and Nuxt frontend from README/development configuration, drove the UI with headless Chrome/Playwright, opened workspace Files, read a file, searched, collapsed/reopened Files, navigated away, and verified file-explorer WebSocket/FD lifecycle stayed bounded. |
| 9 | User requested server-side Terminal E2E/timing validation | Round 7 Terminal pass and Round 8 browser pass | `E2E-TERMFD-002` | Fail | No | Existing server-side Terminal E2E still passed and connect was fast, but a built-backend timing/descriptor probe found normal attached command-output Terminal sessions left PTY-related FDs after close: `37 -> 59` FDs after 8 normal sessions, final child processes `0`, final `lsof` still had `/dev/ptmx`/`(revoked)` entries. |
| 10 | Code review round 17 pass after `E2E-TERMFD-002` / `CR-012` fix | `E2E-TERMFD-002`, broad Round 7/8/9 matrix | None | Pass | No | Isolated PTY descriptor cleanup passed in API/E2E: built-backend probe baseline `36`, after 8 normal command-output sessions `32`, after early-close `32`, final `32`, child count `0`, final `lsof` had no `/dev/ptmx`, `/dev/ttys`, or `(revoked)` lines. Broader backend, frontend, Electron, build, watcher high-churn, and Codex activation probes passed. |
| 11 | Code review round 21 pass after `CR-014` and Terminal target-key cleanup | `CR-013`, `CR-014`, `ADV-TERM-002`, `ADV-TABS-001`, `E2E-TERMFD-002` | None | Pass | No | Fresh Terminal manager/handler/integration/E2E suite, target-key stale-name grep, backend `build:full`, built-backend Terminal descriptor/timing probe, frontend Terminal/right-tabs suite, and web-boundary guard passed. Built-backend probe baseline `36`, after normal command-output sessions `32`, after early-close `32`, final `32`, child count `0`, final lsof PTY/revoked count `0`. |
| 12 | Code review round 25 pass after `CR-017` FileExplorer path-boundary local fix | `CR-015`, `CR-016`, `CR-017`, Terminal/FileExplorer boundary, watcher lifecycle, Codex descriptor-pressure probe | None | Pass | Yes | Added durable backend GraphQL E2E path-boundary coverage for ignored folder projection, same-prefix sibling escape through folder/read/write, and path-like rename rejection before mutation. Expanded workspace/file-explorer E2E passed 5 files / 15 tests; FileExplorer unit passed 1 file / 11 tests; backend build passed; built-backend high-churn FileExplorer + Terminal + Codex probe passed with final FD `33`, child count `0`, Codex `codex-cli 0.134.0`, provider probe OK with `13` providers / `6` models. |

## Validation Basis

Round 12 validation is the latest authoritative pass after code review round 25 accepted the `CR-017` local fix for FileExplorer rename path-boundary validation and preservation of the FileExplorer/Terminal boundary. It was derived from the full upstream artifact package, the implementation handoff `Legacy / Compatibility Removal Check`, the Round 25 code-review pass, the prior Round 7/8/9/10/11 direct runtime validation, and fresh API/E2E execution in the current worktree.

Round 8 remains the most recent browser-level frontend/backend validation. The in-app Browser plugin runtime was not available in that session (`agent.browsers.list()` returned no browser), so headless Google Chrome driven by Playwright was used, with WebSocket interception, screenshots, browser-console lifecycle signals, backend lifecycle logs, and backend FD samples.

The validation focus was intentionally broad because the refactor crosses:

- Terminal cwd/root-path WebSocket lifecycle and real PTY startup/abort cleanup;
- Mobile Files visible live-session ownership and Mobile Tools root-path Terminal targets;
- backend file-explorer watcher lifecycle, watcher-free metadata/snapshot APIs, and path-boundary enforcement;
- backend team-run activation/dedupe behavior;
- desktop/Electron support paths;
- macOS descriptor-pressure and Codex app-server activation from the original `spawn EBADF` scenario.

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable validation added only for compatibility behavior: `No`
- Boundary grep result: `Pass`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round7-boundary-grep-20260523.log`

The grep found no stale `WorkspaceReference`, `workspaceReference`, `WorkspaceActivation`, `ensureWorkspaceInitialized`, `BaseFileExplorer`, `LocalFileExplorer`, old direct `getFileExplorer()` / `workspace.searchFiles()`, old Terminal `workspaceId` URL, or `WorkspaceInfo.fileExplorer` source/test paths in the checked backend/frontend scope. Positive checks confirmed current `TerminalTarget`, `cwd`, `AbortController`, startup-aborted logging, `useWorkspaceFileExplorer`, live-session acquire/release, and `workspaceRootPath` paths.

Note: code review identified internal terminal grouping still using a `workspaceId` parameter name as a non-blocking residual. The API/E2E grep avoided treating that reviewed internal naming as a blocker and instead checked for old external Terminal workspace-id URL/materialization paths.

## Durable Validation Status

Repository-resident durable validation added/updated in Round 6:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/autobyteus-server-ts/tests/e2e/terminal/terminal-websocket-lifecycle.e2e.test.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/autobyteus-web/components/mobile/__tests__/MobileUxRefinement.spec.ts`

Repository-resident durable validation added in Round 12:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/autobyteus-server-ts/tests/e2e/file-explorer/file-explorer-path-boundary.e2e.test.ts`

Code review round 12 explicitly inspected and accepted the Round 6 API/E2E durable validation additions. Later implementation changes for `E2E-TERMFD-002` / `CR-012` were reviewed and passed in code review round 17. The implementation-owned Terminal unit-test durable validation fixture cleanup for `CR-013` / `CR-014` was reviewed and passed in code review round 21.

API/E2E Round 12 added repository-resident durable validation for the FileExplorer GraphQL path-boundary cases introduced by `CR-015`, `CR-016`, and `CR-017`. Because that durable validation was added after code review round 25, this pass must return through `code_reviewer` before delivery resumes.

Rounds 7 through 11 added/updated only this report and temporary validation artifacts under `tickets/.../validation-artifacts` from the API/E2E side. Round 12 updated this report, added the durable E2E file above, and added temporary validation artifacts under `tickets/.../validation-artifacts`.

## Coverage Matrix

| Scenario ID | Requirement / Acceptance Coverage | Validation Method | Result | Evidence |
| --- | --- | --- | --- | --- |
| `SCN-001` | `E2E-TERMFD-001`: Terminal close-before-connect/no late PTY descriptor retention in realistic macOS built-backend runtime | Focused built-backend Terminal FD probe | Pass | `api-e2e-round7-terminal-fd-probe-20260523.json`: baseline `36`, after normal attached close `38`, after 25 early-close cycles/final wait `39`, child processes `0`. |
| `SCN-002` | Terminal cwd URL/root-path behavior works with real PTY, invalid cwd rejection, close-before-connect startup abort, repeated open/close cleanup | `autobyteus-ts` PTY unit + backend terminal unit/integration/E2E targeted suite | Pass | `api-e2e-round7-autobyteus-ts-pty-session-unit-20260523.log`: 1 file / 12 tests passed; `api-e2e-round7-backend-terminal-targeted-20260523.log`: 4 files / 26 tests passed. |
| `SCN-003` | Workspace create/list/metadata remains metadata-only and watcher-free | Backend GraphQL E2E | Pass | `api-e2e-round7-expanded-workspace-file-explorer-e2e-20260523.log`: 4 files / 13 tests passed. |
| `SCN-004` | Folder/search snapshots and file operations work without live watcher lease; write/delete explicit events remain enforced | Backend GraphQL E2E | Pass | `api-e2e-round7-expanded-workspace-file-explorer-e2e-20260523.log`. |
| `SCN-005` | Visible file-explorer WebSocket creates/reuses real watcher and releases final lease; close-before-connected and repeated open/close remain stable | Backend real WebSocket E2E + built-backend high-churn harness | Pass | `api-e2e-round7-expanded-workspace-file-explorer-e2e-20260523.log`; `api-e2e-round7-embedded-server-high-churn-20260523.json`. |
| `SCN-006` | Original descriptor-pressure/Codex activation scenario after file-explorer and terminal churn | Built-backend macOS high-churn harness with real GraphQL, WebSockets, `lsof`, `/bin/echo`, `codex --version`, and `codex_app_server` model-catalog probe | Pass | `api-e2e-round7-embedded-server-high-churn-20260523.json`: final FD `46`, child-process samples `0`, Codex `codex-cli 0.133.0`, provider probe OK with `13` providers / `6` models. |
| `SCN-007` | Mobile Files visible surface owns live-session acquire/release; context switch releases old stream | Frontend Nuxt durable mobile test | Pass | `api-e2e-round7-frontend-terminal-mobile-20260523.log`: 7 files / 52 tests passed. |
| `SCN-008` | Mobile Tools derives Terminal target from `MobileWorkContext` with empty workspace store; mobile tools do not instantiate desktop file explorer layout | Frontend Nuxt mobile/terminal suite | Pass | `api-e2e-round7-frontend-terminal-mobile-20260523.log`. |
| `SCN-009` | Team-run same-root dedupe/distinct-root activation and history/catalog boundary remain intact | Backend team-run unit/integration tests | Pass | `api-e2e-round7-backend-team-run-service-20260523.log`: 2 files / 24 tests passed. |
| `SCN-010` | Backend build, shared package build, and built-in agent bootstrap | `autobyteus-ts build` + backend `build:full` | Pass | `api-e2e-round7-autobyteus-ts-build-20260523.log`; `api-e2e-round7-backend-build-full-20260523.log`. |
| `SCN-011` | Frontend production build | Nuxt build | Pass | `api-e2e-round7-frontend-nuxt-build-20260523.log`: build passed with existing chunk-size warnings. |
| `SCN-012` | Desktop/Electron support paths still pass | Electron Vitest suite | Pass | `api-e2e-round7-frontend-electron-tests-20260523.log`: 24 files passed / 1 skipped; 96 tests passed / 1 skipped. |
| `SCN-013` | Frontend boundary/localization guard including prior delivery localization blocker | Guard/localization audit | Pass | `api-e2e-round7-frontend-boundary-localization-20260523.log`: web guard, localization-boundary guard, and literal audit passed. |
| `SCN-014` | No stale legacy workspace/file-explorer/terminal paths remain in checked scope | Source grep audit | Pass | `api-e2e-round7-boundary-grep-20260523.log`. |
| `SCN-015` | Real browser-level desktop workspace/file-explorer behavior: no hidden file-explorer WebSocket before workspace UI, exactly one live file-explorer stream while Files is visible, search/read work through UI, collapse/reopen/navigate-away release/reacquire correctly | Backend `dist/app.js` + Nuxt dev frontend + headless Chrome/Playwright browser flow with WebSocket tracking, screenshots, backend FD samples, and backend lifecycle log audit | Pass | `api-e2e-round8-browser-frontend-workspace-file-explorer-20260523.json`: FD samples `33 -> 36 -> 37 -> 41 -> 41 -> 36 -> 41 -> 36`; temp stream opened only when Files became visible and closed on custom workspace load; custom stream closed on collapse, reopened once, and closed on navigate-away. Screenshots `api-e2e-round8-browser-01` through `06` capture agents list, run config, file tree, README open, search result, and collapsed state. |
| `SCN-016` | Server-side Terminal E2E/timing and descriptor lifecycle for normal attached command-output sessions | Existing durable Terminal E2E plus built-backend Terminal WebSocket timing/FD probe | Pass | `api-e2e-round11-terminal-server-connect-timing-v2-20260528.json`: normal open p50 `2ms`, p95 `2ms`, max `3ms`; command output p50 `140ms`, p95 `150ms`, max `159ms`; baseline `36` FDs, after 8 normal command-output sessions `32`, after 25 early-close sessions `32`, final after 10 abort-before-open attempts `32`, child processes `0`; final lsof grep found `0` `/dev/ptmx`, `/dev/ttys`, or `(revoked)` lines. Durable server Terminal E2E also passed as part of `api-e2e-round11-terminal-targeted-20260528.log`: 4 files / 26 tests with unit, integration, and E2E coverage. |
| `SCN-017` | Terminal target-key cleanup remains free of stale workspace-shaped grouping names and right-panel auto-switch extraction remains intact | Focused Terminal target-key grep plus frontend Terminal/right-tabs targeted Nuxt suite and web-boundary guard | Pass | `api-e2e-round11-terminal-target-key-grep-20260528.log`: no `closeAllForWorkspace`, `terminalTargetId`, `sessions by workspace`, `ws1`, or `ws2` matches in Terminal streaming source/direct unit tests; `api-e2e-round11-frontend-terminal-tabs-20260528.log`: 3 files / 17 tests passed; `api-e2e-round11-frontend-web-boundary-20260528.log`: guard passed. |
| `SCN-018` | FileExplorer GraphQL path-boundary enforcement for ignored requested folders, same-prefix sibling folder/read/write escapes, and path-like rename names before filesystem mutation | New durable backend GraphQL E2E + FileExplorer unit test + source grep | Pass | `api-e2e-round12-file-explorer-path-boundary-e2e-20260529.log`: 1 file / 2 tests passed; `api-e2e-round12-expanded-workspace-file-explorer-e2e-20260529.log`: 5 files / 15 tests passed; `api-e2e-round12-file-explorer-unit-20260529.log`: 1 file / 11 tests passed; `api-e2e-round12-path-boundary-grep-20260529.log`: FileExplorer boundary grep passed. |
| `SCN-019` | FileExplorer watcher lifecycle and original descriptor-pressure/Codex activation scenario remain stable after path-boundary fixes | Built-backend macOS high-churn harness with real GraphQL, FileExplorer WebSockets, Terminal WebSockets, `lsof`, `codex --version`, and `codex_app_server` model-catalog probe | Pass | `api-e2e-round12-embedded-server-high-churn-20260529.json`: snapshot APIs without WebSocket stayed at `37` FDs, visible watcher open/close returned to `33`, 20 FileExplorer open/close cycles returned to `33`, 10 close-before-connected cycles returned to `33`, Terminal real-cwd and 10 Terminal cycles returned to `33`, child count `0`, Codex `codex-cli 0.134.0`, provider probe OK with `13` providers / `6` models. |
| `SCN-020` | Terminal remains independent of FileExplorer/tree/search/watch APIs after FileExplorer boundary fixes | Terminal/FileExplorer boundary grep | Pass | `api-e2e-round12-terminal-file-explorer-boundary-grep-20260529.log`: no forbidden Terminal dependency patterns for FileExplorer, folder/search, acquire/get file explorer, or watcher APIs; positive Terminal root-path/cwd evidence remained. |

## Prior Failure Resolution Check

| Failure | Previous Round | Classification | Latest Resolution | Evidence |
| --- | --- | --- | --- | --- |
| `E2E-FEWS-001` file-explorer WebSocket disconnect watcher/session leak | 1 | Local Fix | Still resolved | `api-e2e-round7-expanded-workspace-file-explorer-e2e-20260523.log`; `api-e2e-round7-embedded-server-high-churn-20260523.json`. |
| `CR-004` insufficient file-operation explicit-event durable assertions | 4 | API/E2E durable validation Local Fix | Still resolved | `api-e2e-round7-expanded-workspace-file-explorer-e2e-20260523.log`. |
| `CR-008` duplicate same-root team activation | 8 | Local Fix | Still resolved | `api-e2e-round7-backend-team-run-service-20260523.log`. |
| `E2E-TERMFD-001` terminal close-before-connect descriptor growth | 6 | Local Fix | Resolved | `api-e2e-round7-terminal-fd-probe-20260523.json`: `38 -> 39` FD count after 25 early-close cycles/final wait, child processes `0`. |
| `E2E-TERMFD-002` normal attached Terminal command-output sessions retain PTY descriptors after close | 9 | Design Impact / Requirement Gap per user routing instruction | Resolved | Reconfirmed in Round 11 with `api-e2e-round11-terminal-server-connect-timing-v2-20260528.json`: `36 -> 32 -> 32 -> 32` FD samples, child processes `0`, final PTY/revoked descriptor grep count `0`. Round 10 high-churn evidence also remains valid: `api-e2e-round10-embedded-server-high-churn-v2-20260524.json` returned terminal real-cwd close and 10 terminal open/close cycles to `33` FDs and `0` children. Historical failure analysis remains in `terminal-server-e2e-failure-analysis-20260524.md`. |
| `CR-015` ignored requested folders mutate/expose FileExplorer tree | 22 | Local Fix | Resolved and covered by durable E2E | `api-e2e-round12-file-explorer-path-boundary-e2e-20260529.log`: ignored `.git`, `node_modules`, and `.gitignore` folders return `Access denied`, keep watcher leases at `0`, and leave cached tree JSON `null` until a valid root projection is requested. |
| `CR-016` same-prefix sibling path escapes through FileExplorer APIs | 23 | Local Fix | Resolved and covered by durable E2E | `api-e2e-round12-file-explorer-path-boundary-e2e-20260529.log`: `folderChildren`, `fileContent`, and `writeFileContent` reject `../ws-sibling` / `../ws-sibling/*`; sibling leak content is not returned and outside write target is not created. |
| `CR-017` rename destination escape through path-like `newName` | 24 | Local Fix | Resolved and covered by durable E2E | `api-e2e-round12-file-explorer-path-boundary-e2e-20260529.log`: `renameFileOrFolder` rejects `../../ws-sibling/renamed-leak.txt` with `Invalid new name`; sibling leak file is not created and original source remains. |

## Commands / Evidence Summary

Commands were run from `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause`.

- `pnpm -C autobyteus-ts exec vitest tests/unit/tools/terminal/pty-session.test.ts`
  - Pass: 1 file / 12 tests.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round7-autobyteus-ts-pty-session-unit-20260523.log`
- `pnpm -C autobyteus-ts build`
  - Pass.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round7-autobyteus-ts-build-20260523.log`
- `pnpm -C autobyteus-server-ts build:full`
  - Pass.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round7-backend-build-full-20260523.log`
- `node tickets/.../api-e2e-round7-terminal-fd-probe-20260523.mjs`
  - Pass; focused failure probe resolved.
  - Script: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round7-terminal-fd-probe-20260523.mjs`
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round7-terminal-fd-probe-20260523.log`
  - JSON: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round7-terminal-fd-probe-20260523.json`
  - Final lsof: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round7-terminal-fd-probe-20260523-final-lsof.log`
  - Server log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round7-terminal-fd-probe-20260523-server.log`
- `pnpm -C autobyteus-server-ts test tests/unit/services/terminal/pty-session-manager.test.ts tests/unit/services/terminal/terminal-handler.test.ts tests/integration/terminal/terminal-websocket.integration.test.ts tests/e2e/terminal/terminal-websocket-lifecycle.e2e.test.ts`
  - Pass: 4 files / 26 tests.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round7-backend-terminal-targeted-20260523.log`
- `pnpm -C autobyteus-server-ts test tests/e2e/workspaces/workspaces-graphql.e2e.test.ts tests/e2e/file-explorer/file-explorer-graphql.e2e.test.ts tests/e2e/file-explorer/file-operations-graphql.e2e.test.ts tests/e2e/file-explorer/file-explorer-websocket-lifecycle.e2e.test.ts`
  - Pass: 4 files / 13 tests.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round7-expanded-workspace-file-explorer-e2e-20260523.log`
- `pnpm -C autobyteus-server-ts test tests/unit/agent-team-execution/team-run-service.test.ts tests/integration/agent-team-execution/team-run-service.integration.test.ts`
  - Pass: 2 files / 24 tests.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round7-backend-team-run-service-20260523.log`
- `node tickets/.../api-e2e-round7-embedded-server-high-churn-20260523.mjs`
  - Pass.
  - Script: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round7-embedded-server-high-churn-20260523.mjs`
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round7-embedded-server-high-churn-20260523.log`
  - JSON: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round7-embedded-server-high-churn-20260523.json`
- `pnpm -C autobyteus-web test:nuxt components/workspace/tools/__tests__/Terminal.spec.ts composables/__tests__/useTerminalSession.spec.ts components/mobile/__tests__/MobileUxRefinement.spec.ts components/mobile/__tests__/MobileContextSelectionRegression.spec.ts components/mobile/__tests__/MobileRemoteAccessShell.spec.ts stores/__tests__/workspaceMetadataActions.spec.ts stores/__tests__/fileExplorerStore.spec.ts`
  - Pass: 7 files / 52 tests.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round7-frontend-terminal-mobile-20260523.log`
- `pnpm -C autobyteus-web build`
  - Pass with existing chunk-size warnings.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round7-frontend-nuxt-build-20260523.log`
- `pnpm -C autobyteus-web test:electron`
  - Pass: 24 files passed / 1 skipped; 96 tests passed / 1 skipped.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round7-frontend-electron-tests-20260523.log`
- `pnpm -C autobyteus-web guard:web-boundary && pnpm -C autobyteus-web guard:localization-boundary && pnpm -C autobyteus-web audit:localization-literals`
  - Pass.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round7-frontend-boundary-localization-20260523.log`
- Boundary/source grep audit.
  - Pass.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round7-boundary-grep-20260523.log`
- Diff/whitespace checks for report/harness and previously reviewed durable validation files.
  - Pass.
  - Logs:
    - `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round7-report-harness-diff-check-20260523.log`
    - `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round7-durable-validation-diff-check-20260523.log`

- Browser-level Round 8 stack startup from README/development configuration:
  - Backend: `node dist/app.js --host 127.0.0.1 --port 8000 --data-dir tickets/.../api-e2e-round8-browser-server-data-20260523` with SQLite/app-data isolation.
    - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round8-browser-backend-20260523.log`
  - Frontend: `pnpm exec nuxt dev --host 127.0.0.1 --port 3000` with `BACKEND_NODE_BASE_URL=http://127.0.0.1:8000`.
    - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round8-browser-frontend-20260523.log`
  - Startup helper/metadata:
    - `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round8-browser-start-stack-20260523.sh`
    - `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round8-browser-stack-20260523.json`
- `node tickets/.../api-e2e-round8-browser-frontend-workspace-file-explorer-20260523.mjs` from `autobyteus-web`
  - Pass: browser-level Chrome flow against the real local frontend/backend.
  - Script: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round8-browser-frontend-workspace-file-explorer-20260523.mjs`
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round8-browser-frontend-workspace-file-explorer-20260523.log`
  - JSON: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round8-browser-frontend-workspace-file-explorer-20260523.json`
  - Screenshots:
    - `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round8-browser-01-agents-list-20260523.png`
    - `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round8-browser-02-run-config-no-files-20260523.png`
    - `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round8-browser-03-files-visible-tree-20260523.png`
    - `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round8-browser-04-readme-open-20260523.png`
    - `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round8-browser-05-search-results-20260523.png`
    - `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round8-browser-06-right-panel-collapsed-20260523.png`
- Round 8 report diff/cleanup check
  - Pass: no listeners remained on ports 3000/8000 after cleanup; report `git diff --check` passed.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round8-report-diff-check-20260523.log`


- `pnpm -C autobyteus-server-ts test tests/e2e/terminal/terminal-websocket-lifecycle.e2e.test.ts --run --reporter verbose`
  - Pass: 1 file / 3 tests.
  - Notable timing: real PTY cwd test `1504ms`; invalid cwd rejection `8ms`; close-before-connect/repeated churn `544ms`; total command including shared prebuild `15s`.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round9-server-terminal-e2e-20260524.log`
- `node tickets/.../api-e2e-round9-terminal-server-connect-timing-v2-20260524.mjs`
  - Fail by API/E2E interpretation: connect/output timings are fast, but descriptor lifecycle is not clean for normal attached command-output sessions.
  - Script: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round9-terminal-server-connect-timing-v2-20260524.mjs`
  - JSON: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round9-terminal-server-connect-timing-v2-20260524.json`
  - Run log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round9-terminal-server-connect-timing-v2-20260524.run.log`
  - Server log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round9-terminal-server-connect-timing-v2-20260524-server.log`
  - Final lsof: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round9-terminal-server-connect-timing-v2-20260524-final-lsof.log`
  - Derived failure summary: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round9-terminal-server-connect-failure-20260524.json`
- Round 9 failure analysis:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/terminal-server-e2e-failure-analysis-20260524.md`

- `pnpm -C autobyteus-ts exec vitest run tests/unit/tools/terminal/session-factory.test.ts tests/unit/tools/terminal/isolated-pty-session.test.ts tests/unit/tools/terminal/node-pty-bootstrap.test.ts tests/unit/tools/terminal/pty-session.test.ts tests/integration/tools/terminal/isolated-pty-session.test.ts --reporter verbose`
  - Pass: 5 files / 30 tests.
  - Covers isolated PTY backend selection, bootstrap repair, close-during-bootstrap no-spawn behavior, legacy PTY session cleanup, and real integration repair of a non-executable helper.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round10-autobyteus-ts-terminal-unit-integration-20260524.log`
- `pnpm -C autobyteus-server-ts test tests/e2e/terminal/terminal-websocket-lifecycle.e2e.test.ts --run --reporter verbose`
  - Pass: 1 file / 3 tests.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round10-server-terminal-e2e-20260524.log`
- `pnpm -C autobyteus-server-ts build:full`
  - Pass.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round10-backend-build-full-20260524.log`
- `node tickets/.../api-e2e-round10-terminal-server-connect-timing-v2-20260524.mjs`
  - Pass: `E2E-TERMFD-002` resolved in built-backend macOS runtime.
  - JSON: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round10-terminal-server-connect-timing-v2-20260524.json`
  - Script: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round10-terminal-server-connect-timing-v2-20260524.mjs`
  - Run log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round10-terminal-server-connect-timing-v2-20260524.run.log`
  - Server log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round10-terminal-server-connect-timing-v2-20260524-server.log`
  - Final lsof: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round10-terminal-server-connect-timing-v2-20260524-final-lsof.log`
- `pnpm -C autobyteus-server-ts test tests/e2e/workspaces/workspaces-graphql.e2e.test.ts tests/e2e/file-explorer/file-explorer-graphql.e2e.test.ts tests/e2e/file-explorer/file-operations-graphql.e2e.test.ts tests/e2e/file-explorer/file-explorer-websocket-lifecycle.e2e.test.ts --run --reporter verbose`
  - Pass: 4 files / 13 tests.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round10-expanded-workspace-file-explorer-e2e-20260524.log`
- `pnpm -C autobyteus-server-ts test tests/unit/agent-team-execution/team-run-service.test.ts tests/integration/agent-team-execution/team-run-service.integration.test.ts --run --reporter verbose`
  - Pass: 2 files / 24 tests.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round10-backend-team-run-service-20260524.log`
- `node tickets/.../api-e2e-round10-embedded-server-high-churn-v2-20260524.mjs`
  - Pass: built-backend macOS high-churn file-explorer, Terminal cwd/open-close, Codex spawn/model-catalog probe.
  - JSON: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round10-embedded-server-high-churn-v2-20260524.json`
  - Script: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round10-embedded-server-high-churn-v2-20260524.mjs`
  - Run log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round10-embedded-server-high-churn-v2-20260524.run.log`
  - Server stdout/stderr logs:
    - `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round10-embedded-server-high-churn-v2-20260524-server.stdout.log`
    - `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round10-embedded-server-high-churn-v2-20260524-server.stderr.log`
- `pnpm -C autobyteus-web test:nuxt components/workspace/tools/__tests__/Terminal.spec.ts composables/__tests__/useTerminalSession.spec.ts components/mobile/__tests__/MobileUxRefinement.spec.ts components/mobile/__tests__/MobileContextSelectionRegression.spec.ts components/mobile/__tests__/MobileRemoteAccessShell.spec.ts stores/__tests__/workspaceMetadataActions.spec.ts stores/__tests__/fileExplorerStore.spec.ts --run --reporter verbose`
  - Pass: 7 files / 51 tests.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round10-frontend-terminal-mobile-20260524.log`
- `pnpm -C autobyteus-web build`
  - Pass with existing chunk-size warnings.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round10-frontend-nuxt-build-20260524.log`
- `pnpm -C autobyteus-web test:electron`
  - Pass: 27 files passed / 1 skipped; 109 tests passed / 1 skipped.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round10-frontend-electron-tests-20260524.log`
- `pnpm -C autobyteus-web guard:web-boundary && pnpm -C autobyteus-web guard:localization-boundary && pnpm -C autobyteus-web audit:localization-literals`
  - Pass.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round10-frontend-boundary-localization-20260524.log`
- Node-pty spawn-helper mode check after API/E2E tests
  - Pass for active macOS arm64 helper: mode `755`.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round10-spawn-helper-mode-after-tests-20260524.log`

- `pnpm -C autobyteus-server-ts test tests/unit/services/terminal/pty-session-manager.test.ts tests/unit/services/terminal/terminal-handler.test.ts tests/integration/terminal/terminal-websocket.integration.test.ts tests/e2e/terminal/terminal-websocket-lifecycle.e2e.test.ts --run --reporter verbose`
  - Pass: 4 files / 26 tests.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round11-terminal-targeted-20260528.log`
- Terminal target-key stale-name grep over Terminal streaming source and direct Terminal unit tests.
  - Pass: no stale `closeAllForWorkspace`, `terminalTargetId`, `sessions by workspace`, `ws1`, or `ws2` matches; positive target-key evidence found.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round11-terminal-target-key-grep-20260528.log`
- `pnpm -C autobyteus-server-ts build:full`
  - Pass.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round11-backend-build-full-20260528.log`
- `node tickets/.../api-e2e-round11-terminal-server-connect-timing-v2-20260528.mjs`
  - Pass: built-backend macOS Terminal timing/descriptor lifecycle remains bounded after the target-key cleanup sequence.
  - JSON: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round11-terminal-server-connect-timing-v2-20260528.json`
  - Script: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round11-terminal-server-connect-timing-v2-20260528.mjs`
  - Run log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round11-terminal-server-connect-timing-v2-20260528.run.log`
  - Event log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round11-terminal-server-connect-timing-v2-20260528.log`
  - Server log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round11-terminal-server-connect-timing-v2-20260528-server.log`
  - Final lsof: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round11-terminal-server-connect-timing-v2-20260528-final-lsof.log`
- `pnpm -C autobyteus-web test:nuxt components/layout/__tests__/RightSideTabs.spec.ts components/workspace/tools/__tests__/Terminal.spec.ts composables/__tests__/useTerminalSession.spec.ts --run --reporter verbose`
  - Pass: 3 files / 17 tests.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round11-frontend-terminal-tabs-20260528.log`
- `pnpm -C autobyteus-web guard:web-boundary`
  - Pass.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round11-frontend-web-boundary-20260528.log`

- `pnpm -C autobyteus-server-ts test tests/e2e/file-explorer/file-explorer-path-boundary.e2e.test.ts --run --reporter verbose`
  - Pass: 1 file / 2 tests.
  - Added durable E2E coverage for ignored-folder projection rejection before cached tree mutation, same-prefix sibling folder/read/write escapes, and path-like rename rejection before filesystem mutation.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round12-file-explorer-path-boundary-e2e-20260529.log`
- `pnpm -C autobyteus-server-ts test tests/e2e/workspaces/workspaces-graphql.e2e.test.ts tests/e2e/file-explorer/file-explorer-graphql.e2e.test.ts tests/e2e/file-explorer/file-operations-graphql.e2e.test.ts tests/e2e/file-explorer/file-explorer-path-boundary.e2e.test.ts tests/e2e/file-explorer/file-explorer-websocket-lifecycle.e2e.test.ts --run --reporter verbose`
  - Pass: 5 files / 15 tests.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round12-expanded-workspace-file-explorer-e2e-20260529.log`
- `pnpm -C autobyteus-server-ts test tests/unit/file-explorer/workspace-file-explorer.test.ts --run --reporter verbose`
  - Pass: 1 file / 11 tests.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round12-file-explorer-unit-20260529.log`
- `pnpm -C autobyteus-server-ts build:full`
  - Pass.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round12-backend-build-full-20260529.log`
- `node tickets/.../api-e2e-round12-embedded-server-high-churn-20260529.mjs`
  - Pass: built-backend macOS high-churn FileExplorer watcher lifecycle, Terminal cwd/open-close, and Codex spawn/model-catalog probe.
  - JSON: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round12-embedded-server-high-churn-20260529.json`
  - Script: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round12-embedded-server-high-churn-20260529.mjs`
  - Run log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round12-embedded-server-high-churn-20260529.run.log`
  - Server stdout/stderr logs:
    - `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round12-embedded-server-high-churn-20260529-server.stdout.log`
    - `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round12-embedded-server-high-churn-20260529-server.stderr.log`
- Terminal/FileExplorer boundary grep.
  - Pass.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round12-terminal-file-explorer-boundary-grep-20260529.log`
- FileExplorer path-boundary source/test grep.
  - Pass.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round12-path-boundary-grep-20260529.log`
- Diff and source-size check for the new durable E2E file.
  - Pass: `git diff --check`; new durable E2E file has `212` non-empty lines.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round12-diff-size-check-20260529.log`

## Platform / Runtime Targets

- Host: macOS/Darwin arm64.
- Node: `v22.21.1`.
- Backend test runtime: Vitest in `autobyteus-server-ts`.
- Frontend test runtime: Nuxt/Vitest in `autobyteus-web`.
- Native desktop support-code runtime: Electron Vitest suite.
- Descriptor-pressure runtime: built backend entrypoint `autobyteus-server-ts/dist/app.js` launched as a separate Node process on macOS with isolated app data.
- Round 10 / 11 Terminal runtime: built backend entrypoint with isolated app data, real Terminal WebSockets, isolated PTY backend, `lsof`, and child-process sampling.
- Browser-level Round 8 runtime: backend `dist/app.js` on `127.0.0.1:8000`, Nuxt dev frontend on `127.0.0.1:3000`, and headless Google Chrome via Playwright.

## Not Tested / Out Of Scope

- Live model-provider prompt execution with Codex/GPT-5.5 was not submitted. The browser flow verified the run-configuration/runtime/model UI surfaces and workspace/file-explorer behavior, but avoided a paid/side-effectful LLM run because the validation target was watcher/WebSocket/descriptor lifecycle.
- Current-code packaged `.app` launch was not executed by API/E2E. The built backend entrypoint used by the Electron package was executed directly in the macOS descriptor probes; Electron support-code tests also passed.
- Full frontend/backend typechecks remain baseline-blocked per implementation handoff; the cumulative API/E2E validation used focused tests, production builds, the Electron suite, source grep, runtime probes, and the Round 8 browser-level frontend/backend flow. Round 11 specifically reran the targeted Terminal/right-tabs tests, backend build, target-key grep, and built-backend Terminal descriptor probe relevant to those reviewed changes. Round 12 specifically added and ran durable FileExplorer GraphQL path-boundary E2E, expanded workspace/file-explorer E2E, backend build, boundary greps, and the built-backend high-churn FileExplorer/Terminal/Codex probe relevant to the latest reviewed changes.

## Cleanup Performed

- Focused Terminal FD probe removed temporary app data/workspace roots and killed the temporary built-backend server during cleanup.
- Built-backend high-churn harness removed temporary app data/workspace roots and the server process exited with code `0`.
- Round 8 browser-level backend and frontend dev processes were stopped after evidence capture.
- Round 9 built-backend Terminal timing probe stopped its temporary server and removed temporary app data/workspace roots after evidence capture.
- Round 10 built-backend Terminal timing probe and high-churn harness stopped their temporary servers and removed temporary app data/workspace roots after evidence capture.
- Round 11 built-backend Terminal timing probe stopped its temporary server and removed temporary app data/workspace roots after evidence capture; listener check found no remaining listener on the probe port.
- Round 12 built-backend high-churn harness stopped its temporary server and removed temporary app data/workspace roots after evidence capture.
- The permission-mutating isolated PTY integration test restored the active macOS arm64 `spawn-helper` executable mode; final mode check recorded `755`.
- No dependency symlinks were created.

## Final Classification And Handoff

- Latest Result: `Pass`
- New Failures: `None`
- Product Failure `E2E-TERMFD-001`: `Resolved`
- Product Failure `E2E-TERMFD-002`: `Resolved`
- FileExplorer path-boundary findings `CR-015`, `CR-016`, `CR-017`: `Resolved in runtime validation`
- Browser-level frontend/backend workspace/file-explorer validation: `Pass`
- Server-side Terminal normal attached command-output descriptor lifecycle: `Pass`
- Repository-resident durable validation edited after Round 25 code review by API/E2E: `Yes - added backend FileExplorer GraphQL path-boundary E2E`
- Terminal target-key / right-tabs advisory cleanup validation: `Pass`
- Delivery Status: `Paused pending code review of API/E2E durable validation addition`
- Recommended Recipient: `code_reviewer`
