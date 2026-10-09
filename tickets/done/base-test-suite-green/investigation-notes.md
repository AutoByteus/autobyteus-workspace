# Investigation Notes

## Investigation Meta

- Package identifier: `base-test-suite-green`
- Request / ticket: Project Task from `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`): "Fix the pre-existing failing tests on the base branch … so the suite is green again." User statement 2026-10-08: "we definitely need it".
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/base-test-suite-green`
- Repository mode: `Git`
- Task worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/base-test-suite-green`, branch `codex/base-test-suite-green`
- Resolved base remote / branch / revision: `origin/personal` @ `ebf68c4af8e5fe2e6d893afcf75b0269b2c1ef65` ("chore(release): bump workspace release version to 1.4.99-beta.5"), fetched 2026-10-08
- Finalization target remote / branch: `origin/personal`
- Bootstrap result: worktree created from freshly fetched `origin/personal`; `pnpm install --frozen-lockfile`; `pnpm -C autobyteus-server-ts prebuild`.
- Bootstrap blocker: none
- Current solution revision ID: `SR-001`
- Authorities read (requirements reading gate; file and date): `references/requirements-engineering.md` (2026-10-08); `TESTING.md` (2026-10-08, incl. Rule 9); `AGENTS.md` (2026-10-08)
- Investigation status: Requirements-phase investigation complete; architecture investigation pending approval.

## Initial Request And Clarifications

- Original request: run the full unit and integration suites (and `typecheck`) on current `origin/personal`, list every failure with file and cause, group as stale test / real product bug / environment-flaky, fix stale tests to current intended behaviour, fix small clearly-intended product bugs (otherwise report), make env/flaky tests deterministic, no deleting/skipping without a user-accepted recorded reason. Done when `tests/unit` and the integration suite pass on `origin/personal` (or only user-accepted documented exceptions), typecheck passes, and the fix is merged.
- Clarifications received: none yet.
- User-supplied facts: prior evidence from `idle-shutdown-background-tasks` (43 unit failures in 15 files) and `project-task-tool-context-files` (TS6059 typecheck failure).
- Initial ambiguity: (1) which package — all evidence points to `autobyteus-server-ts` (`tests/unit`, `tests/integration`, `typecheck` script); (2) what "typecheck passes" means given the masking finding below; (3) what prerequisites the integration suite may assume.

## Product And Domain Understanding

- Product area: developer/agent test infrastructure of `autobyteus-server-ts`.
- Affected actors: every implementation/review/API-E2E/delivery agent and human developer who runs the server suites; most of them run inside shells spawned by the live AutoByteus app.
- Existing purpose: `TESTING.md` lists `pnpm -C autobyteus-server-ts test` as the server layer and Rule 9 requires baseline failures to be fixed, not just noted.
- No CI workflow runs these suites (`.github/workflows` only has release workflows), which is how drift accumulated.

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-10-08 | Doc | `tickets/done/idle-shutdown-background-tasks/evidence/api-e2e/r2-unit-full.json` | Prior evidence | 43 failed / 15 files, run inside the agent environment | Compared with clean run |
| 2026-10-08 | Doc | `tickets/done/project-task-tool-context-files/implementation-handoff.md:131` | Prior typecheck evidence | Claimed "with TS6059 filtered out there are 0 errors" | Disproved (see TC-2) |
| 2026-10-08 | Command | `pnpm -C autobyteus-server-ts typecheck` → `evidence/base-typecheck.log` | Baseline typecheck | Exit 2; 922 TS6059 errors only | TC-1 |
| 2026-10-08 | Command | `tsc -p tsconfig.json --noEmit --rootDir .` → `evidence/base-typecheck-rootdir-probe.log` | Reveal masked diagnostics | 10,174 errors (src 3,365; tests 4,883; `../autobyteus-ts` 1,335); 7,757 are TS4111 | TC-2 |
| 2026-10-08 | Command | `tsc -p tsconfig.build.json --noEmit` → `evidence/probe-build-src.log` | Production policy | 0 errors | TC-3 |
| 2026-10-08 | Command | build-policy flags + `src`+`tests` (temporary probe config, removed) → `evidence/probe-build-flags-with-tests.log` | Test-file type debt under production policy | 1,340 errors (tests 1,322 in ~370 files: unit 740, integration 351, e2e 205); src 0 | TC-4 |
| 2026-10-08 | Runtime | `env` in the agent shell | Env leak check | Live-app variables present: `AUTOBYTEUS_DATA_DIR`/`AUTOBYTEUS_MEMORY_DIR`/`DATABASE_URL`/`DB_NAME` → `~/.autobyteus/server-data`, `AUTOBYTEUS_STREAMING_CONTENT_FLUSH_INTERVAL_MS=300`, `GEMINI_SETUP_MODE=VERTEX…`, `AUTOBYTEUS_SERVER_HOST`, provider API keys, package/skill roots | ENV-1..3 |
| 2026-10-08 | Command | `evidence/run-suite-clean-env.sh clean-unit tests/unit` | Clean unit baseline | 5,089 tests: 41 failed in 13 files, 6 skipped (platform/opt-in gates) | `evidence/clean-unit-inventory.txt` |
| 2026-10-08 | Command | `evidence/run-suite-clean-env.sh clean-integration tests/integration` (no build outputs) | Clean integration baseline | 408 tests: 89 failed, 27 files failed, 71 skipped | `evidence/clean-integration-inventory.txt` |
| 2026-10-08 | Command | `pnpm -C autobyteus-server-ts build`; `pnpm -C <sdk-contracts, backend-sdk, frontend-sdk, devkit> build`; `pnpm install --offline` (bin relink); `pnpm -C applications/brief-studio build` | Integration prerequisites | All built; Brief Studio needs devkit `dist/cli.js` linked as `autobyteus-app` | `evidence/prereq-*.log` |
| 2026-10-08 | Command | `evidence/run-suite-clean-env.sh clean-integration-prereqs-built tests/integration` | Integration with prerequisites | 47 failed in 15 files + 1 suite-level error (16 files), 71 skipped | `evidence/clean-integration-prereqs-built-inventory.txt` |
| 2026-10-08 | Code | `git log -S/-L` on each failing test's production owner | Classify stale vs bug | Every failure maps to a dated intentional production change the test did not follow (tables below) | — |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger Or Governing Contract | Current Behavior | Current Outcome | Evidence | Confidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Operational | `pnpm -C autobyteus-server-ts exec vitest run tests/unit` | 41 failures / 13 files in a clean env; 43 / 15 inside the agent env | Red baseline | `evidence/clean-unit*.{json,log}`; prior `r2-unit-full.json` | High |
| BEH-002 | Operational | `vitest run tests/integration` on a fresh worktree after install+prebuild | 89 failures / 27 files; 42 of them only because build outputs are absent | Red baseline | `evidence/clean-integration*` | High |
| BEH-003 | Operational | same, after building server `dist`, application SDKs, devkit and Brief Studio | 47 failures / 16 files | Red baseline | `evidence/clean-integration-prereqs-built*` | High |
| BEH-004 | Operational | `pnpm -C autobyteus-server-ts typecheck` | Exit 2 on TS6059 (`rootDir: src` vs `include: tests`); TS6059 is an options diagnostic, so `tsc` never runs semantic checking and every type error is hidden | Script cannot pass and checks nothing | TC-1..4 | High |
| BEH-005 | Operational | Running the suites from a shell spawned by the live app | Tests inherit live-app config: results change (flush interval, Gemini mode) and some resolvers can point at the user's real data | Non-deterministic; unsafe | ENV-1..3 | High |

## Relevant Codebase And Technical Facts

### Unit failures (clean env) — all classified **Stale test**

| # | Test file (failures) | Cause | Production change the test missed |
| --- | --- | --- | --- |
| U1 | `tests/unit/file-explorer/file-explorer.test.ts` (7) | imports `FileExplorer`; class is `WorkspaceFileExplorer` | rename in `src/file-explorer/file-explorer.ts` |
| U2 | `tests/unit/agent-memory/agent-memory-location-service.test.ts` (5) | fixture writes only `team_run_execution_tree.json`; current admission requires the Team communication-messages authority too, so the root is not admitted → `[]`/`null` | `requiredTeamFiles` in `src/run-history/services/root-run-package-current-validator.ts` (6beda63e6, 2026-09-27) |
| U3 | `tests/unit/agent-memory/team-memory-explorer-service.test.ts` (4) | same as U2 in one `describe` block's `beforeEach` | same |
| U4 | `tests/unit/agent-packages/package-root-summary.test.ts` (1) | summary gained `applicationCount` | 76bd9107d (2026-04-13) |
| U5 | `tests/unit/application-platform/application-execution-scope.test.ts` (8) | provider-factory stub lacks `antigravity`/`grok` → `AgentRunManager requires all execution-family dependencies` | AGY (03bf9a370) / Grok (2b31b046d) runtimes |
| U6 | `tests/unit/application-platform/application-execution-scope-kernel-builder.test.ts` (3) | same stub gap | same |
| U7 | `tests/unit/application-platform/application-platform-lifecycle.test.ts` (1) | Codex client stub exposes `acquireClient/releaseClient`; adapter now uses `beginAcquire()` leases | `application-provider-credential-readiness-adapter.ts` (028cca231) |
| U8 | `tests/unit/application-platform/application-platform-runtime-isolation.test.ts` (1) | spies on removed `AgentRunManager.prototype.prepareNewAgentRun` | 028cca231 (2026-10-05) |
| U9 | `tests/unit/application-orchestration/application-execution-event-journal-recovery.test.ts` (2) | lifecycle deps lack `applicationAgentToolCatalog`; `reloadAndReenter` moved from `ApplicationReentryService` to `ApplicationCatalogTransitionService` | 598ee2c2f (2026-08-27) |
| U10 | `tests/unit/logging/prisma-query-log-policy.test.ts` (6) | pins `repository_prisma` 1.0.9; installed 1.0.10 loads `@prisma/client` through its default namespace and the test's synthetic ESM peer has no `default` export | dependency `^1.0.10` (209131721) + package CHANGELOG 1.0.10 |
| U11 | `tests/unit/services/media-storage-service.test.ts` (1) | expects absolute `http://…/rest/files/…`; URLs are deliberately relative | 233dffa91 (remote access, 2026-05-16) |
| U12 | `tests/unit/workspaces/workspace-manager-skill-integration.test.ts` (1) | expects `initialize()` call; initialize became metadata-only and the manager no longer calls it | 8d2cda4ed (2026-05-23) |
| U13 | `tests/unit/agent-customization/processors/response-customization/media-url-transformer-processor.test.ts` (1) | context lacks `state.activeTurn.turnId`; segments now require the active turn | 7e41f9c4d (2026-04-05) |

### Unit failures only inside the agent environment — **Environment**

| # | Test | Cause |
| --- | --- | --- |
| E1 | `tests/unit/config/streaming-content-flush-interval-setting.test.ts` "falls back for invalid runtime input undefined" | `undefined` triggers the default parameter, which reads `AUTOBYTEUS_STREAMING_CONTENT_FLUSH_INTERVAL_MS=300` from the inherited env |
| E2 | `tests/unit/llm-management/gemini-configuration-service.test.ts` "starts with no selected mode" | inherited `GEMINI_SETUP_MODE=VERTEX…` |

### Integration failures — **Missing build prerequisite** (42 tests, disappear after building)

| Test files | Missing artifact |
| --- | --- |
| `tests/integration/file-explorer/file-system-watcher.integration.test.ts` (14) | `autobyteus-server-ts/dist/file-explorer/watcher/runtime/watcher-runtime-process.js` (`watcher-runtime-entrypoint.ts` falls back from `src` to `dist`) |
| `application-backend/*` (brief-studio-team-config 4, brief-studio-imported-package 3, brief-studio-agent-tool-mcp 1, standalone-application-server 2, standalone-package-portable-defaults 9, application-agent-tool-worker 3, application-backend-custom-websocket 2, application-backend-mount-route-transport 1, application-backend-rest-ws 2, application-context-capabilities 1) | `applications/brief-studio/dist/importable-package` and built application SDK/devkit `dist/` (worker processes exit code 1 without them) |

### Integration failures with prerequisites built — all classified **Stale test** (one pending confirmation)

| # | Test file (failures) | Cause |
| --- | --- | --- |
| I1 | `agent-execution/agent-run-manager.integration.test.ts` (12) | calls removed `prepareNewAgentRun` / `prepareRestoreAgentRun` / `prepareRestoreAgentRunFromPlatformState` (028cca231) |
| I2 | `agent-execution/agent-run-service.integration.test.ts` (6) | manager double lacks `releaseRetiredRun` (fccd1a009, 2026-10-08) |
| I3 | `agent-execution/agent-run-prompt-fallback.integration.test.ts` (2) | fake agent lacks `getCompactionRecovery` |
| I4 | `agent-execution/autobyteus-agent-run-backend-factory.integration.test.ts` (3) | factory input now needs the `ownLlm` capability |
| I5 | `agent-execution/claude-session-manager.integration.test.ts` (1) | needs `ownSession` capability |
| I6 | `agent-execution/codex-command-failure-transport.integration.test.ts` (1) | passes extra keys to the strict member execution identity |
| I7 | `agent/agent-status-websocket.integration.test.ts` (2) | status snapshot gained `recoverableBlock`; fake backend lacks `compactionRecovery` |
| I8 | `agent/agent-websocket.integration.test.ts` (3) | two: `AGENT_STATUS` payload gained `recoverableBlock: null`; one ("duplicate and busy ACKs") times out — **likely the same drift; confirm in implementation** |
| I9 | `agent-definition/md-centric-provider.integration.test.ts` (2) | spies on a removed static `getInstance` |
| I10 | `api/run-file-changes-api.integration.test.ts` (1) | Team fixture lacks the communication-messages authority (same as U2) |
| I11 | `api/team-communication-api.integration.test.ts` (suite error, 3 tests not run) | `AgentTeamRunManager` process instance not initialized by the harness |
| I12 | `api/rest/upload-file.integration.test.ts` (2) | `new URL()` on the now-relative `/rest/files/…` URL (as U11) |
| I13 | `services/media-storage-service.integration.test.ts` (4) | absolute-URL expectations (as U11) |
| I14 | `file-explorer/file-explorer.integration.test.ts` (6), `nested-folder-move-watcher.integration.test.ts` (1) | `FileExplorer` rename (as U1) |
| I15 | `application-backend/brief-package-team-prompt.integration.test.ts` (1) | calls `CodexThreadBootstrapper` without the current admission guard argument |

Skipped tests (unit 6, integration 71) are opt-in/platform gates (`RUN_*_E2E`, `RUN_GITHUB_AGENT_PACKAGE_E2E`, live URLs, Windows/WSL, Codex/Claude binaries) and are not failures, except I11.

### Typecheck facts

| ID | Fact |
| --- | --- |
| TC-1 | `typecheck` = `tsc -p tsconfig.json --noEmit`; `tsconfig.json` has `rootDir: "src"` and `include: ["src","tests"]`, plus `paths` that pull `../autobyteus-ts/src` into the program → 922 TS6059. Unchanged since the 2026-02-26 flatten (b1c89884e). |
| TC-2 | TS6059 is an options diagnostic; `tsc` reports semantic diagnostics only when there are no options/syntactic diagnostics, so the script has never type-checked anything. Prior tickets' "0 errors besides TS6059" was a false negative. |
| TC-3 | Production build policy (`tsconfig.build.json`: `src` only, relaxed index-access flags, package `autobyteus-ts`) → 0 errors. This is what `pnpm build` enforces. |
| TC-4 | Test files under the production policy → 1,322 errors in ~370 files. Under the strict `tsconfig.json` flags → 10,174 errors including 3,365 in production `src` and 1,335 in `autobyteus-ts`. |

### Environment facts

| ID | Fact |
| --- | --- |
| ENV-1 | Agent shells spawned by the app inherit live-app variables (see Source Log). `AppConfig.get` prefers `process.env`. |
| ENV-2 | `autobyteus-ts/src/memory/path-resolver.ts` reads `AUTOBYTEUS_MEMORY_DIR` directly → under the inherited env a native agent's memory can resolve to `~/.autobyteus/server-data/memory` (the user's data; TESTING.md Rule 2). |
| ENV-3 | Package/skill roots (`AUTOBYTEUS_AGENT_PACKAGE_ROOTS`, `AUTOBYTEUS_SKILLS_PATHS`, `AUTOBYTEUS_DEFINITION_SOURCE_PATHS`) also flow into tests; TESTING.md already advises `env -u …` for one E2E for this reason. |
| ENV-4 | A first unit/integration attempt ran with the inherited env and was stopped. Files under `~/.autobyteus/server-data` modified during that window were only this conversation's own memory/project files, the live DB and logs (live-app activity); no test-created entries were found. |
| ENV-5 | Tests leave ignored residue in the package root (`agents/`, `applications/`, `memory/`, `tests/.tmp/`) because test `AppConfig` defaults its data dir to the package root. Ignored by git; not a failure. |

## Structural And Payload Surface Inventory

- Payload surfaces: test files and fixtures under `autobyteus-server-ts/tests/{unit,integration,fixtures,helpers,setup}`; `TESTING.md`; server `package.json` scripts; `tsconfig*.json`.
- Structural surfaces: vitest config/setup files (`tests/setup/*`), the `typecheck` script, integration prerequisite preparation.
- Potential structural impacts: none to production APIs, persistence, security or deployment are expected; the env isolation is test-only. Production `src` changes only if a real product bug is confirmed.

## Runtime, Probe, Or Reproduction Findings

| Method / Command | Scenario | Observation | Evidence Path |
| --- | --- | --- | --- |
| `evidence/run-suite-clean-env.sh` (env -i, disposable HOME) | Clean baselines | see BEH-001..003 | `evidence/clean-*` |
| Typecheck probes | TC-1..4 | see table | `evidence/base-typecheck*.log`, `evidence/probe-*.log` |

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Status | Approval Applicability |
| --- | --- | --- | --- | --- |
| `evidence/clean-unit-inventory.txt`, `clean-integration-inventory.txt`, `clean-integration-prereqs-built-inventory.txt` (+ `.json`/`.log`) | Solution Designer | Exact baseline failure lists | Current | Evidence only |
| `evidence/run-suite-clean-env.sh`, `evidence/failure-inventory.py` | Solution Designer | Reproduce clean-env runs / inventories | Current | Evidence only |
| `evidence/base-typecheck*.log`, `evidence/probe-*.log` | Solution Designer | Typecheck evidence | Current | Evidence only |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Resolution / Owner | Status |
| --- | --- | --- | --- | --- |
| UNK-001 | Unknown | I8 "duplicate and busy ACKs" timeout root cause | Implementation confirms; if a product defect, apply REQ-005 | Open |
| RISK-001 | Risk | `origin/personal` moves daily; new failures may appear before merge | Delivery re-runs on the latest base; new base failures follow the same classification | Open |
| RISK-002 | Risk | Without CI the suites can drift again | Separate-ticket candidate (CI gate) | Open |
| RISK-003 | Risk | Inherited live env can make tests touch user data | REQ-004 | Open |

## Requirement Implications

- Every currently failing test has a stale-test, missing-prerequisite or environment explanation; no product bug is established. Fixes are test/test-infra changes plus the `typecheck` script.
- "Typecheck passes" needs a user decision: the existing script has never checked types (DEC-001).
- "Integration suite passes" needs a user decision on build prerequisites (DEC-002).
- Determinism and Rule 2 safety require the unit/integration suites to ignore the inherited live-app env (DEC-003).

## Notes For Architecture Design

- Verify each stale-test fix against the current production contract it follows (commit references above), not by loosening assertions.
- Env isolation must keep explicit opt-in gates and fixture variables (`RUN_*`, `ANTIGRAVITY_CLI_COMMAND`, `AGY_FAKE_VERSION`, …) working, and must not change E2E/real-provider behaviour unless approved.
- Prerequisite preparation must cover server `dist`, the application SDK/devkit `dist`, devkit bin linking, and `applications/brief-studio/dist/importable-package`.
