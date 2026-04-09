# Stage 7 Executable Validation (API/E2E)

## Validation Round Meta

- Current Validation Round: `4`
- Trigger Stage: `6`
- Prior Round Reviewed: `3`
- Latest Authoritative Round: `4`

## Testing Scope

- Ticket: `remove-file-persistence-provider`
- Scope classification: `Medium`
- Workflow state source: `tickets/in-progress/remove-file-persistence-provider/workflow-state.md`
- Requirements source: `tickets/in-progress/remove-file-persistence-provider/requirements.md`
- Call stack source: `tickets/in-progress/remove-file-persistence-provider/future-state-runtime-call-stack.md`
- Design source (`Medium/Large`): `tickets/in-progress/remove-file-persistence-provider/proposed-design.md`
- Interface/system shape in scope: `API`, `CLI`, `Process`
- Platform/runtime targets: Node.js server runtime, Electron server bootstrap helpers, Docker/bootstrap shell surfaces
- Lifecycle boundaries in scope: `Startup`, `Migration`

## Validation Asset Strategy

- Durable validation assets to add/update in the repository:
  - `autobyteus-server-ts/tests/unit/config/app-config.test.ts`
  - `autobyteus-server-ts/tests/unit/agent-customization/processors/persistence/token-usage-persistence-processor.test.ts`
  - `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/thread/codex-thread.test.ts`
  - `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/codex-agent-run-backend.test.ts`
  - `autobyteus-server-ts/tests/integration/token-usage/providers/token-usage-store.integration.test.ts`
  - `autobyteus-server-ts/tests/integration/token-usage/providers/statistics-provider.integration.test.ts`
  - `autobyteus-server-ts/tests/integration/external-channel/runtime/gateway-callback-delivery-runtime.integration.test.ts`
  - `autobyteus-web/electron/server/__tests__/serverRuntimeEnv.spec.ts`
  - `autobyteus-server-ts/tests/e2e/runtime/token-usage-runtime-graphql.e2e.test.ts`
- Temporary validation methods or setup to use only if needed:
  - targeted `rg` source scan over runtime/build/bootstrap/docs surfaces to prove that the removed contract is gone from active paths
  - Codex raw event capture via `CODEX_THREAD_RAW_EVENT_LOG_DIR` to inspect the live `thread/tokenUsage/updated` payload during a failing E2E run
- Cleanup expectation for temporary validation:
  - remove temporary raw event logs after the failing payload is analyzed; keep only the recorded command evidence

## Round History

| Round | Trigger | Prior Unresolved Failures Rechecked (`Yes`/`No`/`N/A`) | New Failures Found (`Yes`/`No`) | Gate Result (`Pass`/`Fail`/`Blocked`) | Latest Authoritative (`Yes`/`No`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Stage 6 exit | N/A | No | Pass | No | Build, targeted server tests, Electron runtime-env test, and active-surface source scan all passed. |
| 2 | User-requested Stage 7 re-entry for real E2E validation | N/A | Yes | Fail | No | Existing Codex runtime GraphQL restore E2E passed, but a new token-usage Codex runtime GraphQL E2E proved that `thread/tokenUsage/updated` is emitted and then dropped before SQL persistence. |
| 3 | Stage 6 local-fix rerun | Yes | No | Pass | No | The first bounded Codex runtime fix passed behaviorally, proving the SQL persistence gap was closed before the later Stage 8 ownership review. |
| 4 | Stage 8 local-fix rerun after owner-boundary correction | Yes | No | Pass | Yes | The thread-owned readiness model passed focused Codex/thread/token-usage tests, the live token-usage GraphQL E2E, the existing Codex runtime restore E2E, and a fresh build. |

## Acceptance Criteria Coverage Matrix (Mandatory)

| Acceptance Criteria ID | Requirement ID | Criterion Summary | Scenario ID(s) | Current Status (`Unmapped`/`Not Run`/`Passed`/`Failed`/`Blocked`/`Waived`) | Last Updated |
| --- | --- | --- | --- | --- | --- |
| `AC-001` | `R-001` | no active runtime path depends on `PERSISTENCE_PROVIDER` | `AV-001` | Passed | 2026-04-09 |
| `AC-002` | `R-002` | token usage is SQL-backed only | `AV-002`, `AV-006` | Passed | 2026-04-09 |
| `AC-003` | `R-003` | SQLite URL derivation and migrations no longer depend on file-profile selection | `AV-003` | Passed | 2026-04-09 |
| `AC-004` | `R-004` | no file-profile build/package/runtime path remains | `AV-004` | Passed | 2026-04-09 |
| `AC-005` | `R-005` | env/bootstrap/docs/tests reflect the simplified contract | `AV-005` | Passed | 2026-04-09 |

## Spine Coverage Matrix (Mandatory)

| Spine ID | Spine Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Governing Owner | Scenario ID(s) | Coverage Status (`Unmapped`/`Planned`/`Passed`/`Failed`/`Blocked`/`N/A`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `DS-001` | `Primary End-to-End` | startup/config | `AV-001`, `AV-003` | Passed | covers startup config and migration flow after profile removal |
| `DS-002` | `Return-Event` | token-usage subsystem | `AV-002`, `AV-006` | Passed | integration coverage passes for store/statistics boundaries and real Codex runtime token usage now persists from thread-owned readiness before idle/turn-complete dispatch |
| `DS-003` | `Primary End-to-End` | bootstrap surfaces | `AV-004`, `AV-005` | Passed | covers build/env/bootstrap truthfulness across scripts and Electron |

## Scenario Catalog

| Scenario ID | Spine ID(s) | Source Type (`Requirement`/`Design-Risk`) | Acceptance Criteria ID(s) | Requirement ID(s) | Use Case ID(s) | Validation Mode (`API`/`Browser-E2E`/`Desktop-UI`/`CLI`/`Integration`/`Process`/`Lifecycle`/`Other`) | Platform / Runtime | Lifecycle Boundary (`None`/`Install`/`Startup`/`Update`/`Restart`/`Migration`/`Shutdown`/`Recovery`) | Objective/Risk | Expected Outcome | Durable Validation Asset(s) | Temporary Validation Method / Setup | Command/Harness | Status (`Not Started`/`In Progress`/`Passed`/`Failed`/`Blocked`/`N/A`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `AV-001` | `DS-001`, `DS-003` | Requirement | `AC-001` | `R-001` | `UC-001`, `UC-003` | `CLI` | repo source scan | `Startup` | prove the removed persistence-profile contract is absent from active runtime/build/bootstrap surfaces | scan returns no matches in active paths | updated runtime/bootstrap code + docs/tests | targeted `rg` scan with prompt-engineering exclusions | `rg -n "PERSISTENCE_PROVIDER|build:file|build:file:package|dist-file|getPersistenceProfile|isSqlPersistenceProfile|persistence-proxy|persistence-provider-registry|sql-persistence-provider" autobyteus-server-ts autobyteus-web docker scripts -S -g '!**/tickets/**' -g '!**/*.js' -g '!autobyteus-server-ts/tests/unit/prompt-engineering/**' -g '!autobyteus-server-ts/tests/integration/prompt-engineering-removal.integration.test.ts'` | Passed |
| `AV-002` | `DS-002` | Requirement | `AC-002` | `R-002` | `UC-002` | `Integration` | Node.js + SQLite test DB | `None` | prove token usage persists and aggregates through the SQL store only | token-usage store, processor, and statistics tests pass | updated token-usage tests | none | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-customization/processors/persistence/token-usage-persistence-processor.test.ts tests/integration/token-usage/providers/token-usage-store.integration.test.ts tests/integration/token-usage/providers/statistics-provider.integration.test.ts` | Passed |
| `AV-003` | `DS-001` | Requirement | `AC-003` | `R-003` | `UC-001` | `Process` | Node.js server runtime | `Startup`, `Migration` | prove SQLite URL derivation and startup migration behavior remain correct | config/bootstrap checks pass without profile branching | `tests/unit/config/app-config.test.ts`, `tests/integration/external-channel/runtime/gateway-callback-delivery-runtime.integration.test.ts` | none | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/config/app-config.test.ts tests/integration/external-channel/runtime/gateway-callback-delivery-runtime.integration.test.ts` | Passed |
| `AV-004` | `DS-003` | Requirement | `AC-004` | `R-004` | `UC-003` | `Process` | Node.js build tooling | `Startup` | prove the standard build path is the only active build/runtime path left | server build succeeds and source scan finds no file-profile build/output references | `autobyteus-server-ts/package.json`, Android/bootstrap scripts | same targeted `rg` scan as `AV-001` | `pnpm -C autobyteus-server-ts build` | Passed |
| `AV-005` | `DS-003` | Requirement | `AC-005` | `R-005` | `UC-001`, `UC-003` | `Integration` | Electron server bootstrap helpers | `Startup` | prove Electron runtime env generation no longer emits the removed contract and surrounding env/docs surfaces are truthful | Electron runtime-env spec passes and active docs/env/bootstrap scan stays clean | `autobyteus-web/electron/server/__tests__/serverRuntimeEnv.spec.ts` | same targeted `rg` scan as `AV-001` | `pnpm exec vitest --config ./electron/vitest.config.ts run electron/server/__tests__/serverRuntimeEnv.spec.ts` (from `autobyteus-web`) | Passed |
| `AV-006` | `DS-002` | Design-Risk | `AC-002` | `R-002` | `UC-002` | `API` | Codex runtime + GraphQL + WebSocket + SQLite test DB | `None` | prove a real Codex runtime turn persists token usage into SQL-backed statistics after the file-persistence removal | after a live Codex turn, GraphQL token-usage statistics should show prompt and completion usage for the run window | `autobyteus-server-ts/tests/e2e/runtime/token-usage-runtime-graphql.e2e.test.ts` | optional raw event capture via `CODEX_THREAD_RAW_EVENT_LOG_DIR` to inspect failures only | `RUN_CODEX_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/token-usage-runtime-graphql.e2e.test.ts` | Passed |

## Validation Assets Implemented Or Updated

| Asset Path / Name | Asset Type (`API Test`/`Browser Test`/`Desktop Automation`/`CLI Harness`/`Lifecycle Harness`/`Process Probe`/`Harness`/`Fixture`/`Helper`/`Other`) | Durable In Repo (`Yes`/`No`) | Scenario ID(s) | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/unit/config/app-config.test.ts` | `API Test` | Yes | `AV-003` | updated runtime config expectation to DB-only selection |
| `autobyteus-server-ts/tests/unit/agent-customization/processors/persistence/token-usage-persistence-processor.test.ts` | `API Test` | Yes | `AV-002` | updated mock boundary from proxy to store |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/thread/codex-thread.test.ts` | `API Test` | Yes | `AV-006` | added owner-level readiness coverage for running-turn and late token-usage updates |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/codex-agent-run-backend.test.ts` | `API Test` | Yes | `AV-006` | retargeted backend coverage so it persists ready thread state before dispatching idle/turn-complete runtime events |
| `autobyteus-server-ts/tests/integration/token-usage/providers/token-usage-store.integration.test.ts` | `API Test` | Yes | `AV-002` | renamed store integration test to match authoritative boundary |
| `autobyteus-server-ts/tests/integration/token-usage/providers/statistics-provider.integration.test.ts` | `API Test` | Yes | `AV-002` | updated statistics test to the SQL store boundary |
| `autobyteus-server-ts/tests/integration/external-channel/runtime/gateway-callback-delivery-runtime.integration.test.ts` | `Process Probe` | Yes | `AV-003` | updated runtime bootstrap env fixture to DB-only config |
| `autobyteus-web/electron/server/__tests__/serverRuntimeEnv.spec.ts` | `API Test` | Yes | `AV-005` | updated Electron runtime env assertions |
| `autobyteus-server-ts/tests/e2e/runtime/token-usage-runtime-graphql.e2e.test.ts` | `API Test` | Yes | `AV-006` | new Codex runtime GraphQL E2E proving token-usage persistence end-to-end |

## Temporary Validation Methods / Setup Used

| Method / Setup | Why Needed | Scenario ID(s) | Cleanup Required (`Yes`/`No`) | Cleanup Status |
| --- | --- | --- | --- | --- |
| targeted `rg` contract scan | prove absence of legacy contract strings across active runtime/build/bootstrap surfaces | `AV-001`, `AV-004`, `AV-005` | No | N/A |
| `CODEX_THREAD_RAW_EVENT_LOG_DIR=/tmp/codex-token-usage-log.hg336C` | captured the live Codex `thread/tokenUsage/updated` payload during the failing round so the local fix could target the actual turn-level token data shape | `AV-006` | Yes | Cleaned |

## Prior Failure Resolution Check (Mandatory On Round >1)

Round `4` rechecked the unresolved Round `2` failure on `AV-006`, preserved the behavioral pass from Round `3`, and confirmed the same scenario remains green after moving token-usage ownership into the Codex thread boundary.

## Failure Escalation Log

- 2026-04-09 / `AV-006` Round 2: real Codex runtime turn completed successfully, and raw event capture proved `thread/tokenUsage/updated` emitted `tokenUsage.last` with prompt/output counts, but `usageStatisticsInPeriod` remained empty. Classified as `Local Fix`; Stage 7 returned to Stage 6.
- 2026-04-09 / `AV-006` Round 3: the first local backend fix resolved the live SQL gap; the same live Codex runtime path created token-usage rows before idle signaling and GraphQL statistics immediately reflected the run window.
- 2026-04-09 / `AV-006` Round 4: after Stage 8 rejected backend raw-event parsing, the owner-boundary fix kept the live runtime behavior green; the same Codex runtime path still created SQL token-usage rows and reflected them through GraphQL statistics.

## Feasibility And Risk Record

- Any infeasible scenarios (`Yes`/`No`): `No`
- Environment constraints (secrets/tokens/access limits/dependencies):
  - The Electron Vitest run emits a warning because `autobyteus-web/tsconfig.json` still extends `./.nuxt/tsconfig.json`, which is absent in this worktree. The targeted Electron config still ran and the spec passed, so this did not block Stage 7.
  - Codex runtime E2E requires a working local `codex` CLI installation and access to the configured Codex account/runtime.
- Platform/runtime specifics for lifecycle-sensitive scenarios:
  - startup/migration scenarios were validated on local macOS Node.js runtime with SQLite test DBs
- Compensating automated evidence:
  - server build
  - 16 targeted token-usage / Codex thread / Codex backend unit+integration tests across the reopened local-fix scope
  - 31 targeted server unit/integration tests across the original Stage 6 scope
  - 4 targeted Electron tests
  - 1 passing live Codex token-usage GraphQL E2E
  - 1 passing existing Codex runtime GraphQL restore E2E
  - active-surface source scan
- Residual risk notes:
  - Android helper changes were validated by build/script/source-scan evidence rather than a live Termux run in this environment.
- Human-assisted execution steps required because of platform or OS constraints (`Yes`/`No`): `No`
- User waiver for infeasible acceptance criteria recorded (`Yes`/`No`): `No`
- Temporary validation-only scaffolding cleaned up (`Yes`/`No`/`Partially`): `Yes`

## Stage 7 Gate Decision

- Latest authoritative round: `4`
- Latest authoritative result (`Pass`/`Fail`/`Blocked`): `Pass`
- Stage 7 complete: `Yes`
- Durable executable validation that should live in the repository was implemented or updated: `Yes`
- All in-scope acceptance criteria mapped to scenarios: `Yes`
- All relevant spines mapped to scenarios: `Yes`
- All executable in-scope acceptance criteria status = `Passed`: `Yes`
- All executable relevant spines status = `Passed`: `Yes`
- Critical executable scenarios passed: `Yes`
- Any infeasible acceptance criteria: `No`
- Explicit user waiver recorded for each infeasible acceptance criterion (if any): `N/A`
- Temporary validation-only scaffolding cleaned up or intentionally retained with rationale: `Yes`
- Unresolved escalation items: `No`
- Ready to enter Stage 8 code review: `Yes`
- Notes:
  - Validation is scoped to the files touched by this ticket. Unrelated existing branch changes in the worktree were not part of this Stage 7 decision.
  - The authoritative Round `4` evidence includes both the repaired live Codex token-usage path under the thread-owned readiness model and the pre-existing Codex runtime restore smoke.
