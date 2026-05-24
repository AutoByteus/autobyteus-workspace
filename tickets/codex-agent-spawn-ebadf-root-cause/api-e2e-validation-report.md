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
- Current Validation Round: `9`
- Trigger: User requested explicit server-side Terminal E2E/timing validation because Terminal connect/open can feel slow.
- Latest Authoritative Round: `9`
- Overall Result: `Fail`
- Recommended Recipient: `solution_designer`

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
| 9 | User requested server-side Terminal E2E/timing validation | Round 7 Terminal pass and Round 8 browser pass | `E2E-TERMFD-002` | Fail | Yes | Existing server-side Terminal E2E still passes and connect is fast, but a built-backend timing/descriptor probe found normal attached command-output Terminal sessions leave PTY-related FDs after close: `37 -> 59` FDs after 8 normal sessions, final child processes `0`, final `lsof` still has `/dev/ptmx`/`(revoked)` entries. |

## Validation Basis

Round 8 validation is an additive browser-level pass on top of the Round 7 API/E2E pass. It was derived from the full upstream artifact package, the implementation handoff `Legacy / Compatibility Removal Check`, the Round 12 code-review pass, the existing Round 7 direct runtime validation, and a fresh running backend + frontend browser session in the current worktree.

The in-app Browser plugin runtime was not available in this session (`agent.browsers.list()` returned no browser). I therefore used the next closest browser-level executable validation: local backend on `127.0.0.1:8000`, Nuxt dev frontend on `127.0.0.1:3000`, and headless Google Chrome driven by Playwright, with WebSocket interception, screenshots, browser-console lifecycle signals, backend lifecycle logs, and backend FD samples.

The validation focus was intentionally broad because the refactor crosses:

- Terminal cwd/root-path WebSocket lifecycle and real PTY startup/abort cleanup;
- Mobile Files visible live-session ownership and Mobile Tools root-path Terminal targets;
- backend file-explorer watcher lifecycle and watcher-free metadata/snapshot APIs;
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

Round 12 code review explicitly inspected and accepted these API/E2E durable validation additions. API/E2E Rounds 7 and 8 did not edit repository-resident durable validation after that review. Therefore this pass can proceed to delivery rather than returning to code review.

Rounds 7 and 8 added/updated only this report and temporary validation artifacts under `tickets/.../validation-artifacts`.

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
| `SCN-016` | Server-side Terminal E2E/timing and descriptor lifecycle for normal attached command-output sessions | Existing durable Terminal E2E plus built-backend Terminal WebSocket timing/FD probe | Fail | Durable E2E passed 1 file / 3 tests, but built-backend probe `api-e2e-round9-terminal-server-connect-timing-v2-20260524.json` found fast connect with retained PTY FDs: normal open p50 `2ms`, p95 `3ms`, max `4ms`; actual command output p50 `290ms`, p95 `349ms`, max `410ms`; FD count `37 -> 59` after 8 normal command-output sessions and stayed `59` after 25 early-close + 10 abort-before-open cycles; final child processes `0`; final `lsof` contains 16 PTY-related/revoked descriptors. |

## Prior Failure Resolution Check

| Failure | Previous Round | Classification | Latest Resolution | Evidence |
| --- | --- | --- | --- | --- |
| `E2E-FEWS-001` file-explorer WebSocket disconnect watcher/session leak | 1 | Local Fix | Still resolved | `api-e2e-round7-expanded-workspace-file-explorer-e2e-20260523.log`; `api-e2e-round7-embedded-server-high-churn-20260523.json`. |
| `CR-004` insufficient file-operation explicit-event durable assertions | 4 | API/E2E durable validation Local Fix | Still resolved | `api-e2e-round7-expanded-workspace-file-explorer-e2e-20260523.log`. |
| `CR-008` duplicate same-root team activation | 8 | Local Fix | Still resolved | `api-e2e-round7-backend-team-run-service-20260523.log`. |
| `E2E-TERMFD-001` terminal close-before-connect descriptor growth | 6 | Local Fix | Resolved | `api-e2e-round7-terminal-fd-probe-20260523.json`: `38 -> 39` FD count after 25 early-close cycles/final wait, child processes `0`. |
| `E2E-TERMFD-002` normal attached Terminal command-output sessions retain PTY descriptors after close | 9 | Design Impact / Requirement Gap per user routing instruction | Unresolved | `api-e2e-round9-terminal-server-connect-failure-20260524.json`; `api-e2e-round9-terminal-server-connect-timing-v2-20260524.json`; `api-e2e-round9-terminal-server-connect-timing-v2-20260524-final-lsof.log`; failure analysis `terminal-server-e2e-failure-analysis-20260524.md`. |

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

## Platform / Runtime Targets

- Host: macOS/Darwin arm64.
- Node: `v22.21.1`.
- Backend test runtime: Vitest in `autobyteus-server-ts`.
- Frontend test runtime: Nuxt/Vitest in `autobyteus-web`.
- Native desktop support-code runtime: Electron Vitest suite.
- Descriptor-pressure runtime: built backend entrypoint `autobyteus-server-ts/dist/app.js` launched as a separate Node process on macOS with isolated app data.
- Browser-level Round 8 runtime: backend `dist/app.js` on `127.0.0.1:8000`, Nuxt dev frontend on `127.0.0.1:3000`, and headless Google Chrome via Playwright.

## Not Tested / Out Of Scope

- Round 9 did not proceed to delivery because server-side Terminal descriptor validation found `E2E-TERMFD-002`.
- Live model-provider prompt execution with Codex/GPT-5.5 was not submitted. The browser flow verified the run-configuration/runtime/model UI surfaces and workspace/file-explorer behavior, but avoided a paid/side-effectful LLM run because the validation target was watcher/WebSocket/descriptor lifecycle.
- Current-code packaged `.app` launch was not executed by API/E2E. The built backend entrypoint used by the Electron package was executed directly in the macOS descriptor probes; Electron support-code tests also passed.
- Full frontend/backend typechecks remain baseline-blocked per implementation handoff; this round used focused tests, production build, Electron suite, source grep, runtime probes, and the Round 8 browser-level frontend/backend flow.

## Cleanup Performed

- Focused Terminal FD probe removed temporary app data/workspace roots and killed the temporary built-backend server during cleanup.
- Built-backend high-churn harness removed temporary app data/workspace roots and the server process exited with code `0`.
- Round 8 browser-level backend and frontend dev processes were stopped after evidence capture.
- Round 9 built-backend Terminal timing probe stopped its temporary server and removed temporary app data/workspace roots after evidence capture.
- No dependency mutations or symlinks were created.

## Final Classification And Handoff

- Latest Result: `Fail`
- New Failures: `E2E-TERMFD-002`
- Product Failure `E2E-TERMFD-001`: `Resolved`
- Browser-level frontend/backend workspace/file-explorer validation: `Pass`
- Server-side Terminal normal attached command-output descriptor lifecycle: `Fail`
- Repository-resident durable validation edited after Round 12 code review: `No`
- Delivery Status: `Paused`
- Recommended Recipient: `solution_designer`
