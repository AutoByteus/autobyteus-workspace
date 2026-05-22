# API, E2E, And Executable Validation Report

## Validation Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/design-spec.md`
- Design Impact Rework Note: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/design-impact-rework-history-lazy-workspace.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/implementation-handoff.md`
- Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/review-report.md`
- Current Validation Round: `5`
- Trigger: Code review round 8 pass after the lazy workspace-reference/history-display rework and `CR-008` local fix. User explicitly requested robust E2E coverage because the refactor is large.
- Prior Round Reviewed: `4`
- Latest Authoritative Round: `5`

## Round History

| Round | Trigger | Prior Unresolved Failures Rechecked | New Failures Found | Result | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Code review round 2 pass + user request for strong real E2E coverage | N/A | `E2E-FEWS-001` | Fail | No | Added a real Fastify + `ws` file-explorer WebSocket lifecycle E2E. It found that real disconnects could leave watcher leases/sessions alive until workspace close. |
| 2 | Code review round 3 pass after local fix for `E2E-FEWS-001` | `E2E-FEWS-001` | None | Pass | No | Durable real E2E, targeted backend/frontend suites, builds, Electron tests, stale-reference probes, and a multi-process macOS high-churn embedded-server harness passed. |
| 3 | User requested broader assurance that existing workspace/file-explorer E2E coverage was updated where relevant | None | None | Pass | No | Updated three durable GraphQL E2E files to assert watcher-free behavior for createWorkspace shallow payloads, folder/search snapshots, and file create/write/read/delete/rename operations without a visible file-explorer stream. |
| 4 | Code review round 4 Local Fix for `CR-004` in API/E2E-owned durable validation | `CR-004` | None | Pass | No | Tightened `file-operations-graphql.e2e.test.ts` so write/delete assertions fail on empty `changes` arrays and require expected explicit change events. |
| 5 | Code review round 8 pass after lazy workspace-reference/history-display and team-run activation refactor; user requested robust tests | `E2E-FEWS-001`, `CR-004`, round 8 residual risks | None in product code | Pass | Yes | Added missing durable E2E coverage for `workspaceReference(rootPath:)` being deterministic and side-effect-free; updated team-run service integration tests to validate the current `TeamRunHistoryCatalogService` persistence boundary instead of stale history-index/direct-metadata assertions; executed broader backend, frontend, Electron, build, source-grep, and macOS high-churn runtime validation. |

## Validation Basis

Validation was derived from the updated requirements/design package, the design-impact rework note for lazy workspace references, the implementation handoff, the round 8 code-review pass, and observed current runtime behavior.

The round 5 validation focus was broadened beyond the original watcher leak to cover:

- deterministic filesystem workspace references that do not initialize workspaces merely for display/history/config read paths;
- explicit activation only for real consumers such as FileExplorer, Terminal, active run recovery, and team-run launch;
- team-run launch serialization/readiness carrying `workspaceRootPath`, backend rejection of filesystem references missing `workspaceRootPath`, and per-request dedupe of same-root activation;
- historical run/team display and open flows using references without accidental activation unless the flow is active/recovering;
- desktop file explorer watcher lifecycle, mobile Files/Tools separation, and descriptor-pressure/Codex activation behavior from the original `spawn EBADF` scenario.

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable validation added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: `N/A`
- Upstream recipient notified: `N/A`

## Validation Surfaces / Modes

- Backend GraphQL E2E for workspace creation/listing, `workspaceReference`, file-explorer folder/search snapshots, file operations, explicit change events, watcher-free invariants, and real WebSocket watcher lifecycle.
- Backend team-run unit and integration tests for reference-backed root activation, missing-root rejection, same-root dedupe, distinct-root activation, metadata/history persistence, restore, and termination history behavior.
- Backend build and built-in agent bootstrap smoke.
- Frontend Nuxt/Vitest suites for workspace reference cache, workspace store activation/live stream ownership, run config forms, team config serialization/readiness, historical run/team hydration/open/recovery, FileExplorer/Terminal explicit activation, right-side tab lifecycle, context path input, and mobile layout/files/tools behavior.
- Electron support-code suite for native desktop support paths.
- Nuxt production build.
- Source grep audit for removed/stale watcher APIs and workspace-reference activation hotspots.
- Temporary macOS multi-process high-churn harness that launched the built backend (`autobyteus-server-ts/dist/app.js`) with isolated app data, used real GraphQL and real WebSocket clients, sampled descriptors through `lsof`, exercised repeated socket churn, and verified child-process/Codex app-server activation after churn.

## Platform / Runtime Targets

- Host: macOS/Darwin arm64.
- Node: `v22.21.1`.
- Backend test runtime: Vitest in `autobyteus-server-ts`.
- Frontend test runtime: Nuxt/Vitest in `autobyteus-web`.
- Native desktop support-code runtime: Electron Vitest suite.
- Realistic descriptor-pressure runtime: built backend entrypoint `autobyteus-server-ts/dist/app.js` launched as a separate Node process on macOS with isolated data directory.
- Packaged `.app` launch: not executed in this round because no current-code packaged app was generated by API/E2E; the high-churn harness used the same built backend entrypoint that Electron packages as its embedded server.

## Lifecycle / Upgrade / Restart / Migration Checks

No version upgrade or migration was in scope. Lifecycle validation covered:

- workspace reference resolution without workspace initialization;
- explicit workspace activation by FileExplorer/Terminal/team launch/recovery paths;
- WebSocket open/close/reopen;
- shared same-workspace visible consumers;
- final disconnect watcher shutdown;
- close-before-connected cycles;
- 20 repeated open/close cycles;
- descriptor count before, during, and after churn;
- child process spawn and Codex app-server model-catalog activation after churn.

## Coverage Matrix

| Scenario ID | Requirement / Acceptance Coverage | Validation Method | Result | Evidence |
| --- | --- | --- | --- | --- |
| `SCN-001` | Workspace create/fetch/search should not start live watchers | Durable backend E2E + source audit + high-churn separate server snapshot-only GraphQL | Pass | `api-e2e-round5-expanded-workspace-file-explorer-e2e.log`; high-churn fd samples stayed `36 -> 37` through three create/search/folder snapshot workspaces before any WebSocket. |
| `SCN-002` | `workspaceReference(rootPath:)` returns deterministic reference data without initializing a workspace | New durable GraphQL E2E in `workspaces-graphql.e2e.test.ts` | Pass | `api-e2e-round5-expanded-workspace-file-explorer-e2e.log`: 4 files / 13 tests passed. New test asserts deterministic ID/path/display/kind, no active workspace after repeated reference query, and later `createWorkspace` activates the same ID without watcher lease. |
| `SCN-003` | Opening visible file explorer starts real stream/watcher; closing releases it | Durable WebSocket E2E + high-churn separate server | Pass | `api-e2e-round5-expanded-workspace-file-explorer-e2e.log`; high-churn fd count rose to `160/161` with visible WebSockets and returned to `33` after final close. |
| `SCN-004` | Concurrent visible consumers share one watcher and final disconnect stops it | Durable WebSocket E2E + high-churn two-client same-workspace check | Pass | `api-e2e-round5-embedded-server-high-churn.json`; `after_second_visible_websocket_open_same_workspace=161`, `after_closing_final_shared_visible_websocket=33`. |
| `SCN-005` | Search/folder snapshots and file operations work without live watcher lease | Updated durable GraphQL E2E | Pass | `api-e2e-round5-expanded-workspace-file-explorer-e2e.log`: folder/search snapshots and file operations pass; watcher state remains `null`/lease `0` where asserted. |
| `SCN-006` | File write/delete GraphQL operations emit explicit change events and fail the E2E if `changes` is empty | Durable GraphQL E2E from round 4, re-run in round 5 | Pass | `api-e2e-round5-expanded-workspace-file-explorer-e2e.log`: file operations E2E passed with tightened explicit-event assertions. |
| `SCN-007` | Team launch activates reference-backed workspace roots, rejects missing root paths, dedupes same root, and preserves distinct roots | Backend team-run unit tests + updated integration tests | Pass | `api-e2e-round5-backend-team-run-service.log`: 2 files / 24 tests passed. |
| `SCN-008` | Team-run metadata/history persistence uses the current catalog-service boundary after refactor | Updated durable integration test assertions | Pass | `api-e2e-round5-backend-team-run-service.log`: integration tests now inject/assert `recordTeamRunCreated`, `recordTeamRunRestored`, and `recordTeamRunTerminated`. |
| `SCN-009` | Frontend workspace reference cache, config forms, readiness, and launch serialization | Frontend Nuxt targeted suite | Pass | `api-e2e-round5-frontend-workspace-reference-config.log`: 11 files / 103 tests passed. |
| `SCN-010` | Historical run/team display/open/recovery does not initialize workspaces unless active/recovering, and FileExplorer/Terminal activate explicitly | Frontend Nuxt targeted suite | Pass | `api-e2e-round5-frontend-run-open-file-explorer.log`: 10 files / 85 tests passed. |
| `SCN-011` | Mobile Files/Tools behavior remains separated; mobile tools do not instantiate desktop file explorer layout | Frontend mobile Nuxt suite | Pass | `api-e2e-round5-frontend-mobile.log`: 4 files / 37 tests passed. |
| `SCN-012` | Frontend production build | Nuxt production build | Pass | `api-e2e-round5-frontend-nuxt-build.log`: build complete; only known dynamic-import/chunk-size warnings. |
| `SCN-013` | Native desktop support code | Electron Vitest suite | Pass | `api-e2e-round5-frontend-electron-tests.log`: 24 files passed, 1 real-release test skipped; 96 tests passed, 1 skipped. |
| `SCN-014` | Descriptor pressure / original Codex spawn scenario after watcher churn | Separate-process macOS high-churn harness + `/bin/echo` + `codex --version` + `codex_app_server` provider/model catalog GraphQL | Pass | `api-e2e-round5-embedded-server-high-churn.json`: `codex-cli 0.133.0`, provider probe OK, 13 providers / 6 models, final fd count `33`. |
| `SCN-015` | Removed/stale watcher API references do not remain | Source grep audit | Pass | `api-e2e-round5-source-grep-audit.log`: no removed legacy watcher API references found. |

## Test Scope

Round 5 intentionally used a larger matrix because the refactor touched backend API semantics, team-run launch behavior, frontend run-history hydration/open flows, explicit FileExplorer/Terminal activation, mobile layout policy, and descriptor-sensitive watcher lifecycle.

The validation did not rely only on mocked unit tests. It included durable GraphQL E2E, real Fastify/WebSocket/chokidar E2E, integration tests at the team-run service boundary, production builds, Electron tests, and a separate built-backend process harness with real descriptor sampling and Codex activation.

## Validation Setup / Environment

Commands were run from `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause`.

Key commands executed:

```bash
git diff --check -- autobyteus-server-ts/tests/e2e/workspaces/workspaces-graphql.e2e.test.ts autobyteus-server-ts/tests/integration/agent-team-execution/team-run-service.integration.test.ts
pnpm -C autobyteus-server-ts test tests/e2e/workspaces/workspaces-graphql.e2e.test.ts tests/e2e/file-explorer/file-explorer-graphql.e2e.test.ts tests/e2e/file-explorer/file-operations-graphql.e2e.test.ts tests/e2e/file-explorer/file-explorer-websocket-lifecycle.e2e.test.ts
pnpm -C autobyteus-server-ts test tests/unit/agent-team-execution/team-run-service.test.ts tests/integration/agent-team-execution/team-run-service.integration.test.ts
pnpm -C autobyteus-server-ts build:full
pnpm -C autobyteus-web test:nuxt <workspace/config/reference suite>
pnpm -C autobyteus-web test:nuxt <run-open/recovery/file-explorer suite>
pnpm -C autobyteus-web test:nuxt <mobile suite>
pnpm -C autobyteus-web build
pnpm -C autobyteus-web test:electron
node tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round5-embedded-server-high-churn.mjs
```

## Tests Implemented Or Updated

- Added a durable GraphQL E2E in `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/autobyteus-server-ts/tests/e2e/workspaces/workspaces-graphql.e2e.test.ts` for `workspaceReference(rootPath:)`:
  - returns deterministic `workspaceId`, canonical `workspaceRootPath`, `displayName`, and `kind`;
  - repeated reference queries do not add an active workspace;
  - later `createWorkspace` for the same root activates the same deterministic ID;
  - post-activation watcher state remains `watcher: null`, `leaseCount: 0`.
- Updated `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/autobyteus-server-ts/tests/integration/agent-team-execution/team-run-service.integration.test.ts` so integration assertions follow the current `TeamRunHistoryCatalogService` boundary:
  - creation assertions now validate `recordTeamRunCreated({ teamRunId, metadata, summary })`;
  - restore assertions now validate `recordTeamRunRestored({ teamRunId, metadata })`;
  - termination assertions now validate `recordTeamRunTerminated({ teamRunId })`;
  - obsolete `teamRunHistoryIndexService` injection and direct metadata-write expectations were removed from these integration tests.

## Durable Validation Added To The Codebase

- Repository-resident durable validation added or updated this round: `Yes`
- Paths added or updated:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/autobyteus-server-ts/tests/e2e/workspaces/workspaces-graphql.e2e.test.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/autobyteus-server-ts/tests/integration/agent-team-execution/team-run-service.integration.test.ts`
- If `Yes`, returned through `code_reviewer` before delivery: `Yes, required by handoff rules; this report is routing back to code review.`
- Post-validation code review artifact: `Pending next code-review pass.`

## Other Validation Artifacts

- `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round5-durable-validation-diff-check.log`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round5-expanded-workspace-file-explorer-e2e.log`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round5-backend-team-run-service.log`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round5-backend-build-full.log`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round5-frontend-workspace-reference-config.log`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round5-frontend-run-open-file-explorer.log`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round5-frontend-mobile.log`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round5-frontend-nuxt-build.log`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round5-frontend-electron-tests.log`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round5-embedded-server-high-churn.mjs`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round5-embedded-server-high-churn.log`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round5-embedded-server-high-churn.json`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round5-embedded-server-high-churn-server.stdout.log`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round5-embedded-server-high-churn-server.stderr.log`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round5-source-grep-audit.log`

## Temporary Validation Methods / Scaffolding

- Temporary high-churn harness copied from the prior round and retargeted to round 5 artifact names. It is stored under `validation-artifacts` and is not wired into the repository test suite.
- No temporary symlinks or dependency mutations were required.

## Dependencies Mocked Or Emulated

- Frontend Nuxt/Vitest suites mock GraphQL/server stores as appropriate for component/store/service boundaries.
- Backend team-run service unit/integration tests mock runtime managers, team definitions, metadata/catalog services, and workspace manager dependencies at their intended service boundary.
- The backend file-explorer E2E and high-churn harness use real filesystem directories, real `chokidar` watchers, real WebSocket clients, real GraphQL execution, and real descriptor sampling.

## Prior Failure Resolution Check

| Prior Round | Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | `E2E-FEWS-001`: WebSocket disconnect could leak watcher lease/session until workspace close | Local Fix to implementation | Resolved and reverified | `api-e2e-round5-expanded-workspace-file-explorer-e2e.log`; `api-e2e-round5-embedded-server-high-churn.json` | Final disconnect returns watcher/descriptor state to baseline. |
| 4 | `CR-004`: write/delete GraphQL E2E allowed empty `changes` arrays | Local Fix to API/E2E durable validation | Resolved and reverified | `api-e2e-round5-expanded-workspace-file-explorer-e2e.log` | File-operations E2E remains part of expanded suite and passed. |
| 8 | `CR-008`: duplicate same-root workspace activation inside one team-create request | Local Fix to implementation | Resolved and reverified | `api-e2e-round5-backend-team-run-service.log` | Team-run unit suite includes same-root dedupe and distinct-root activation coverage. |

## Scenarios Checked

See the Coverage Matrix above. The round 5 scenario set intentionally covers backend API, backend service, real WebSocket lifecycle, frontend run-history/open/recovery, mobile layout, build, Electron support code, source grep, and process descriptor pressure.

## Passed

- `git diff --check` for the changed durable validation files: Pass.
- Backend expanded workspace/file-explorer E2E: Pass, 4 files / 13 tests.
- Backend team-run service unit + integration: Pass, 2 files / 24 tests.
- Backend `build:full`: Pass.
- Frontend workspace/reference/config targeted suite: Pass, 11 files / 103 tests.
- Frontend run-open/recovery/file-explorer/terminal targeted suite: Pass, 10 files / 85 tests.
- Frontend mobile suite: Pass, 4 files / 37 tests.
- Frontend Nuxt production build: Pass.
- Frontend Electron suite: Pass, 24 files / 96 tests; 1 real-release test skipped by suite policy.
- macOS built-backend high-churn descriptor/Codex activation harness: Pass.
- Source grep audit: Pass.

## Failed

None remain.

During coverage tightening, an initial diagnostic run of `team-run-service.integration.test.ts` exposed stale test assertions/injection for the old history-index/direct-metadata boundary. This was an API/E2E-owned durable-validation gap, not a product-code failure, and was fixed in the integration test before final validation. The passing authoritative evidence is `api-e2e-round5-backend-team-run-service.log`.

## Not Tested / Out Of Scope

- Full browser-click manual E2E through a running Nuxt UI was not executed. Equivalent affected paths were covered through targeted component/store/service suites, backend API/E2E, and the separate-process backend harness.
- Current-code packaged `.app` launch was not executed by API/E2E. The built backend entrypoint used by the Electron package was executed directly in the high-churn harness; Electron support-code tests also passed.
- Full frontend `nuxi typecheck` remains baseline-blocked per implementation handoff and prior validation artifacts; this round used focused Nuxt tests, production build, and changed-path source grep instead.

## Blocked

None.

## Cleanup Performed

- The high-churn harness removed its temporary app data directory and temporary workspace roots.
- The high-churn server process exited cleanly with code `0`.
- No temporary dependency symlinks were created.

## Classification

No product failure remains. Because repository-resident durable validation was added/updated after code review round 8, this pass must return to `code_reviewer` for validation-code review before delivery resumes.

## Recommended Recipient

`code_reviewer`

## Evidence / Notes

Key high-churn descriptor samples from `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round5-embedded-server-high-churn.json`:

- `after_server_health`: `36`
- `after_all_snapshot_queries_no_websocket`: `37`
- `after_first_visible_websocket_open`: `160`
- `after_second_visible_websocket_open_same_workspace`: `161`
- `after_closing_final_shared_visible_websocket`: `33`
- `after_20_open_close_cycles`: `33`
- `after_10_close_before_connected_cycles`: `33`
- `after_codex_probe_final`: `33`
- Codex probe: `codex-cli 0.133.0`, provider probe OK, `13` providers / `6` models.

## Latest Authoritative Result

- Result: `Pass`
- Notes: Round 5 API/E2E validation passes with robust expanded coverage. Durable validation was updated this round, so delivery remains paused until code review passes the validation changes.
