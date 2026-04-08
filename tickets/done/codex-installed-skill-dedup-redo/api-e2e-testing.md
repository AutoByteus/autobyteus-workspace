# Stage 7 Executable Validation (API/E2E)

## Validation Round Meta

- Current Validation Round: `4`
- Trigger Stage: `Re-entry`
- Prior Round Reviewed: `3`
- Latest Authoritative Round: `4`

## Testing Scope

- Ticket: `codex-installed-skill-dedup-redo`
- Scope classification: `Medium`
- Workflow state source: `tickets/in-progress/codex-installed-skill-dedup-redo/workflow-state.md`
- Requirements source: `tickets/in-progress/codex-installed-skill-dedup-redo/requirements.md`
- Call stack source: `tickets/in-progress/codex-installed-skill-dedup-redo/future-state-runtime-call-stack.md`
- Design source (`Medium/Large`): `tickets/in-progress/codex-installed-skill-dedup-redo/proposed-design.md`
- Interface/system shape in scope: `API`
- Platform/runtime targets: `macOS`, `Node.js v22`, `codex_app_server`, local GraphQL websocket runtime
- Lifecycle boundaries in scope (`Install` / `Startup` / `Update` / `Restart` / `Migration` / `Shutdown` / `Recovery` / `None`): `None`

## Validation Asset Strategy

- Durable validation assets to add/update in the repository:
  - `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/backend/codex-thread-bootstrapper.test.ts`
  - `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/codex-workspace-skill-materializer.test.ts`
  - `autobyteus-server-ts/tests/integration/agent-execution/codex-thread-bootstrapper.integration.test.ts`
- Temporary validation methods or setup to use only if needed:
  - targeted live Codex execution through the existing GraphQL runtime harness with `RUN_CODEX_E2E=1`
  - targeted live Codex app-server integration through the real bootstrapper/client-manager path with temp `.codex/skills` fixtures
- Cleanup expectation for temporary validation:
  - no temporary repo files retained; generated runtime workspaces are test-local temp directories

## Round History

| Round | Trigger | Prior Unresolved Failures Rechecked (`Yes`/`No`/`N/A`) | New Failures Found (`Yes`/`No`) | Gate Result (`Pass`/`Fail`/`Blocked`) | Latest Authoritative (`Yes`/`No`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Stage 6 exit | N/A | No | Pass | No | Used direct `vitest run` invocations to avoid the package-script broad-suite behavior from `pnpm test -- --run ...`. |
| 2 | Re-entry | N/A | No | Pass | Yes | User-requested validation-gap follow-up added real live Codex `skills/list` bootstrapper integration coverage on temp workspace skill bundles. |
| 3 | Re-entry | Yes | No | Pass | Yes | Requirement-gap rerun replaced the old symlink-preservation expectation with self-contained copied bundles and added live team-style shared-doc symlink coverage. |
| 4 | Re-entry | Yes | No | Pass | Yes | Local-fix rerun shortened the runtime-owned materialized bundle suffix to four hash characters and reconfirmed that the same live Codex integration and websocket paths remained healthy. |

## Acceptance Criteria Coverage Matrix (Mandatory)

| Acceptance Criteria ID | Requirement ID | Criterion Summary | Scenario ID(s) | Current Status (`Unmapped`/`Not Run`/`Passed`/`Failed`/`Blocked`/`Waived`) | Last Updated |
| --- | --- | --- | --- | --- | --- |
| AC-001 | R-002 | Preflight `skills/list` runs before workspace copy in the latest `personal` layout. | AV-001, AV-006 | Passed | 2026-04-08 |
| AC-002 | R-003 / R-004 | Discoverable same-name skills skip materialization while missing skills still materialize. | AV-001, AV-002, AV-006, AV-007 | Passed | 2026-04-08 |
| AC-003 | R-005 / R-007 | Discovery failure falls back to runtime-owned materialization and cleanup removes only runtime-owned bundles. | AV-002, AV-003, AV-007 | Passed | 2026-04-08 |
| AC-004 | R-006 | Symlinked source content becomes a self-contained usable runtime bundle on macOS/Linux assumptions. | AV-003, AV-007 | Passed | 2026-04-08 |
| AC-005 | R-001 | Only current-owner Codex subsystem paths changed; obsolete `runtime-execution` layout remains untouched. | AV-004 | Passed | 2026-04-08 |
| AC-006 | R-008 | The current Codex configured-skill executable validation path passes on latest `personal`. | AV-005 | Passed | 2026-04-08 |

## Spine Coverage Matrix (Mandatory)

| Spine ID | Spine Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Governing Owner | Scenario ID(s) | Coverage Status (`Unmapped`/`Planned`/`Passed`/`Failed`/`Blocked`/`N/A`) | Notes |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | CodexThreadBootstrapper | AV-001, AV-002, AV-005, AV-006, AV-007 | Passed | Covers unit and live same-name skip, missing-skill fallback path, and the live configured-skill runtime path. |
| DS-002 | Return-Event | CodexThreadCleanup | AV-002, AV-007 | Passed | Unit and live integration coverage prove cleanup remains limited to runtime-owned bundles. |
| DS-003 | Primary End-to-End | CodexThreadBootstrapper | AV-002, AV-003, AV-005, AV-007 | Passed | Covers fallback copy path, self-contained copied content for symlinked skills, live bootstrapper materialization, and live configured-skill execution when materialization is required. |

## Scenario Catalog

| Scenario ID | Spine ID(s) | Source Type (`Requirement`/`Design-Risk`) | Acceptance Criteria ID(s) | Requirement ID(s) | Use Case ID(s) | Validation Mode (`API`/`Browser-E2E`/`Desktop-UI`/`CLI`/`Integration`/`Process`/`Lifecycle`/`Other`) | Platform / Runtime | Lifecycle Boundary (`None`/`Install`/`Startup`/`Update`/`Restart`/`Migration`/`Shutdown`/`Recovery`) | Objective/Risk | Expected Outcome | Durable Validation Asset(s) | Temporary Validation Method / Setup | Command/Harness | Status (`Not Started`/`In Progress`/`Passed`/`Failed`/`Blocked`/`N/A`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| AV-001 | DS-001 | Requirement | AC-001, AC-002 | R-002, R-003 | UC-001 | Integration | local Node/Vitest Codex bootstrap path | None | Prove bootstrapper preflights `skills/list` and skips workspace copy for an already discoverable same-name skill. | `CodexThreadBootstrapper` passes an empty configured-skill list to the materializer when the discoverable name already exists. | `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/backend/codex-thread-bootstrapper.test.ts` | None | `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/codex-installed-skill-dedup-redo/autobyteus-server-ts exec vitest run tests/unit/agent-execution/backends/codex/backend/codex-thread-bootstrapper.test.ts` | Passed |
| AV-002 | DS-001, DS-002, DS-003 | Requirement | AC-002, AC-003 | R-004, R-005, R-007 | UC-002, UC-003 | Integration | local Node/Vitest Codex bootstrap + cleanup path | None | Prove missing-skill fallback still materializes and cleanup remains limited to runtime-owned bundles. | Discovery failure returns the original configured skill to the materializer, and cleanup removes only the runtime-owned materialized bundle after the final holder releases it. | `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/backend/codex-thread-bootstrapper.test.ts`, `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/codex-workspace-skill-materializer.test.ts` | None | `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/codex-installed-skill-dedup-redo/autobyteus-server-ts exec vitest run tests/unit/agent-execution/backends/codex/backend/codex-thread-bootstrapper.test.ts tests/unit/agent-execution/backends/codex/codex-workspace-skill-materializer.test.ts` | Passed |
| AV-003 | DS-003 | Requirement | AC-003, AC-004 | R-005, R-006 | UC-002 | Integration | local Node/Vitest materializer filesystem path | None | Prove runtime-owned materialization turns team-style shared-doc symlinks into self-contained copied files that remain readable after the source tree is removed. | Materialized `design-principles.md` and `common-design-practices.md` are regular files with preserved content after the original team fixture is deleted, and no `.codex/shared/...` mirror is required. | `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/codex-workspace-skill-materializer.test.ts` | None | `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/codex-installed-skill-dedup-redo/autobyteus-server-ts exec vitest run tests/unit/agent-execution/backends/codex/codex-workspace-skill-materializer.test.ts` | Passed |
| AV-004 | DS-001, DS-002, DS-003 | Requirement | AC-005 | R-001 | UC-004 | Process | git working tree on latest `origin/personal` architecture | None | Prove the patch stays inside the current Codex owners and does not reintroduce obsolete `runtime-execution` files. | Only current `src/agent-execution/backends/codex/...` files and current-ticket artifacts are changed; no `src/runtime-execution/...` Codex files appear in the diff. | None | None | `git diff --name-only` in `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-installed-skill-dedup-redo` | Passed |
| AV-005 | DS-001, DS-003 | Requirement | AC-006 | R-008 | UC-002 | API | live `codex_app_server` GraphQL websocket runtime | None | Prove the current latest-architecture Codex configured-skill executable path still works end-to-end after the change. | The existing GraphQL runtime test creates a configured skill, starts a live Codex run, and receives the exact skill-driven response token over the websocket contract. | existing `autobyteus-server-ts/tests/e2e/runtime/agent-runtime-graphql.e2e.test.ts` harness | `RUN_CODEX_E2E=1` against the local Codex binary and user environment | `RUN_CODEX_E2E=1 pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/codex-installed-skill-dedup-redo/autobyteus-server-ts exec vitest run tests/e2e/runtime/agent-runtime-graphql.e2e.test.ts -t 'Codex.*applies configured runtime skills over the current websocket API contract'` | Passed |
| AV-006 | DS-001 | Requirement | AC-001, AC-002 | R-002, R-003 | UC-001 | Integration | live `codex_app_server` bootstrapper/client-manager path | None | Prove live `skills/list` discovers a repo-local workspace skill by logical `name` and the real bootstrapper skips runtime materialization for the same configured skill name. | Real Codex discovery returns the repo-local skill metadata from temp workspace `.codex/skills`, and `CodexThreadBootstrapper` returns zero runtime-owned materialized skills for the same configured name. | `autobyteus-server-ts/tests/integration/agent-execution/codex-thread-bootstrapper.integration.test.ts` | `RUN_CODEX_E2E=1` against the local Codex binary with temp workspace skill bundles | `RUN_CODEX_E2E=1 pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/codex-installed-skill-dedup-redo/autobyteus-server-ts exec vitest run tests/integration/agent-execution/codex-thread-bootstrapper.integration.test.ts` | Passed |
| AV-007 | DS-001, DS-002, DS-003 | Requirement | AC-002, AC-003, AC-004 | R-004, R-005, R-006, R-007 | UC-002, UC-003 | Integration | live `codex_app_server` bootstrapper/client-manager path | None | Prove the real bootstrapper materializes a missing configured skill with team-style shared-doc symlinks, that live Codex then discovers the materialized copy, and that cleanup removes the runtime-owned bundle. | The bootstrapper returns one runtime-owned materialized descriptor when no same-name skill is already discoverable, the materialized bundle contains regular copied shared-doc files instead of broken symlinks, no `.codex/shared/...` mirror is created, live Codex lists the materialized skill from the workspace, and cleanup deletes the owned bundle afterward. | `autobyteus-server-ts/tests/integration/agent-execution/codex-thread-bootstrapper.integration.test.ts` | `RUN_CODEX_E2E=1` against the local Codex binary with temp workspace skill bundles | `RUN_CODEX_E2E=1 pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/codex-installed-skill-dedup-redo/autobyteus-server-ts exec vitest run tests/integration/agent-execution/codex-thread-bootstrapper.integration.test.ts` | Passed |

## Validation Assets Implemented Or Updated

| Asset Path / Name | Asset Type (`API Test`/`Browser Test`/`Desktop Automation`/`CLI Harness`/`Lifecycle Harness`/`Process Probe`/`Harness`/`Fixture`/`Helper`/`Other`) | Durable In Repo (`Yes`/`No`) | Scenario ID(s) | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/backend/codex-thread-bootstrapper.test.ts` | Other | Yes | AV-001, AV-002 | New targeted durable coverage for same-name skip and discovery-failure fallback. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/codex-workspace-skill-materializer.test.ts` | Other | Yes | AV-002, AV-003 | Expanded durable coverage for self-contained copied shared-doc content while retaining existing cleanup-ownership verification. |
| `autobyteus-server-ts/tests/e2e/runtime/agent-runtime-graphql.e2e.test.ts` | API Test | Yes | AV-005 | Existing durable live harness reused to prove current-architecture configured-skill execution remains healthy. |
| `autobyteus-server-ts/tests/integration/agent-execution/codex-thread-bootstrapper.integration.test.ts` | Other | Yes | AV-006, AV-007 | Live integration coverage uses real Codex `skills/list` discovery on temp workspace `.codex/skills` fixtures and now also proves self-contained copied shared-doc content for team-style symlinked skills. |

## Temporary Validation Methods / Setup Used

| Method / Setup | Why Needed | Scenario ID(s) | Cleanup Required (`Yes`/`No`) | Cleanup Status |
| --- | --- | --- | --- | --- |
| `RUN_CODEX_E2E=1` targeted live Codex execution against the local binary and user environment | Durable repo-resident tests alone do not prove the latest-architecture GraphQL websocket/Codex app-server path in this machine context. | AV-005 | No | N/A |
| `RUN_CODEX_E2E=1` targeted live Codex bootstrapper/client-manager integration against temp workspace skill bundles | The validation-gap follow-up required real live proof that Codex `skills/list` sees workspace `.codex/skills` fixtures and that the real bootstrapper consumes that result correctly. | AV-006, AV-007 | No | N/A |

## Prior Failure Resolution Check (Mandatory On Round >1)

| Prior Round | Scenario ID | Previous Classification | Current Resolution (`Resolved`/`Partially Resolved`/`Still Failing`/`Not Applicable After Rework`) | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | N/A | Validation Gap | Resolved | Round `2` added live Codex bootstrapper integration coverage and all new/existing targeted scenarios passed. | Round `1` had no failing scenarios; round `2` was opened by user request for stronger live evidence. |
| 2 | AV-003 / AV-007 | Requirement Gap | Resolved | Round `3` replaced the broken relative-symlink expectation with self-contained copied content and both the durable materializer test and live bootstrapper integration test passed on team-style shared-doc fixtures. | The manual executable failure was traced to `.codex/shared/...` resolution under preserved relative symlinks. |
| 3 | N/A | Local Fix | Resolved | Round `4` reran the same live integration and websocket scenarios after shortening the runtime-owned materialized bundle suffix to four hash characters, and both remained green. | One non-authoritative parallel E2E attempt hit a SQLite test DB lock and was rerun serially before recording the authoritative result. |

## Failure Escalation Log

No Stage 7 failures occurred in validation round `4`.

## Feasibility And Risk Record

- Any infeasible scenarios (`Yes`/`No`): `No`
- If `Yes`, concrete infeasibility reason per scenario: `N/A`
- Environment constraints (secrets/tokens/access limits/dependencies): local Codex binary and usable Codex runtime environment were available on this machine.
- Platform/runtime specifics for lifecycle-sensitive scenarios (OS/device/runtime/version `from` -> `to`/package channel or update feed/signing/access requirements): `macOS`, `Node.js v22`, live `codex app-server` binary.
- Compensating automated evidence: `N/A`
- Residual risk notes: same-name skip is now proven through a live repo-local `.codex/skills` discovery integration, the team-style shared-doc symlink failure mode is now covered by both durable and live validation, and the live GraphQL runtime path remains healthy; there is still no dedicated live user-scope installed-skill collision harness.
- Human-assisted execution steps required because of platform or OS constraints (`Yes`/`No`): `No`
- If `Yes`, exact steps and evidence capture: `N/A`
- User waiver for infeasible acceptance criteria recorded (`Yes`/`No`): `No`
- If `Yes`, waiver reference (date/user decision): `N/A`
- Temporary validation-only scaffolding cleaned up (`Yes`/`No`/`Partially`): `Yes`
- If retained, why it remains useful as durable coverage: the added/updated repo-resident tests remain as durable regression coverage.

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
- Notes: direct `vitest run` invocations were required because `pnpm test -- --run ...` executed an unexpectedly broad suite in this repo. Round `4` reconfirmed the already-fixed behavior after shortening the runtime-owned materialized bundle suffix to four hash characters. One non-authoritative parallel E2E attempt hit the shared SQLite test DB lock and was rerun serially before the authoritative pass was recorded.
