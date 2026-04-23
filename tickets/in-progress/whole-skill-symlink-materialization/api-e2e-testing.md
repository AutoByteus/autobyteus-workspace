# Stage 7 Executable Validation (API/E2E)

## Validation Round Meta

- Current Validation Round: `2`
- Trigger Stage: `8`
- Prior Round Reviewed: `1`
- Latest Authoritative Round: `2`

## Testing Scope

- Ticket: `whole-skill-symlink-materialization`
- Scope classification: `Medium`
- Workflow state source: `tickets/in-progress/whole-skill-symlink-materialization/workflow-state.md`
- Requirements source: `tickets/in-progress/whole-skill-symlink-materialization/requirements.md`
- Call stack source: `tickets/in-progress/whole-skill-symlink-materialization/future-state-runtime-call-stack.md`
- Design source (`Medium/Large`): `tickets/in-progress/whole-skill-symlink-materialization/proposed-design.md`
- Interface/system shape in scope: `CLI`, `Integration`, `Other`
- Platform/runtime targets: `local Codex app-server`, `local Node/Vitest filesystem validation`
- Lifecycle boundaries in scope (`Install` / `Startup` / `Update` / `Restart` / `Migration` / `Shutdown` / `Recovery` / `None`): `None`

## Validation Asset Strategy

- Durable validation assets to add/update in the repository:
  - `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/codex-workspace-skill-materializer.test.ts`
  - `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/claude-workspace-skill-materializer.test.ts`
  - `autobyteus-server-ts/tests/integration/agent-execution/codex-thread-bootstrapper.integration.test.ts`
  - `autobyteus-server-ts/tests/e2e/runtime/agent-runtime-graphql.e2e.test.ts`
- Temporary validation methods or setup to use only if needed:
  - ephemeral `.materializer-vitest.config.mjs` to bypass unrelated Prisma-global setup for filesystem-only validation
  - `RUN_CODEX_E2E=1` for the live Codex bootstrapper integration run
  - `RUN_CODEX_E2E=1` for the live Codex GraphQL/WebSocket runtime E2E run
- Cleanup expectation for temporary validation:
  - remove the temporary Vitest config after each targeted run

## Round History

| Round | Trigger | Prior Unresolved Failures Rechecked (`Yes`/`No`/`N/A`) | New Failures Found (`Yes`/`No`) | Gate Result (`Pass`/`Fail`/`Blocked`) | Latest Authoritative (`Yes`/`No`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Stage 6 exit | N/A | No | Pass | Yes | Durable backend validation updated and executed successfully |
| 2 | Stage 8 validation-gap re-entry from user verification | Yes | No | Pass | Yes | Added a higher-level live Codex runtime E2E proving whole-directory skill symlink materialization plus a linked file outside the skill folder |

## Acceptance Criteria Coverage Matrix (Mandatory)

| Acceptance Criteria ID | Requirement ID | Criterion Summary | Scenario ID(s) | Current Status (`Unmapped`/`Not Run`/`Passed`/`Failed`/`Blocked`/`Waived`) | Last Updated |
| --- | --- | --- | --- | --- | --- |
| AC-001 | R-003, R-005, R-012 | Codex discovers whole-directory symlinked skills without runtime-generated `openai.yaml` | AV-001, AV-006 | Passed | 2026-04-23 |
| AC-002 | R-003, R-004, R-011, R-012 | Codex fallback materializes as intuitive workspace symlink with no suffix | AV-002 | Passed | 2026-04-23 |
| AC-003 | R-010, R-012 | Shared/sibling relative paths still work without a `.codex/shared/...` mirror | AV-003, AV-006 | Passed | 2026-04-23 |
| AC-004 | R-007, R-008, R-009, R-012 | Cleanup ownership and collision behavior remain safe | AV-004 | Passed | 2026-04-23 |
| AC-005 | R-006, R-007, R-008, R-011, R-012 | Claude workspace skill materialization uses whole-directory symlinks instead of copies | AV-005 | Passed | 2026-04-23 |
| AC-006 | R-001 | The final implementation stays within the owning Codex/Claude subsystem paths and removes obsolete copy assumptions | AV-004, AV-005 | Passed | 2026-04-23 |

## Spine Coverage Matrix (Mandatory)

| Spine ID | Spine Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Governing Owner | Scenario ID(s) | Coverage Status (`Unmapped`/`Planned`/`Passed`/`Failed`/`Blocked`/`N/A`) | Notes |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | `GraphQL agent run` + `CodexThreadBootstrapper` + `CodexWorkspaceSkillMaterializer` | AV-001, AV-002, AV-006 | Passed | Live Codex bootstrapper integration plus a higher-level GraphQL/WebSocket runtime E2E executed with `RUN_CODEX_E2E=1` |
| DS-002 | Primary End-to-End | `ClaudeSessionBootstrapper` + `ClaudeWorkspaceSkillMaterializer` | AV-005 | Passed | Durable targeted Claude validation executed through the updated workspace materializer suite |
| DS-003 | Bounded Local | `CodexWorkspaceSkillMaterializer` + `ClaudeWorkspaceSkillMaterializer` | AV-002, AV-003, AV-004, AV-005 | Passed | Covers symlink creation, reuse, collision rejection, and live-source behavior |
| DS-004 | Bounded Local | `CodexWorkspaceSkillMaterializer` + `ClaudeWorkspaceSkillMaterializer` | AV-004 | Passed | Covers last-holder cleanup and safe non-owned-path preservation |

## Scenario Catalog

| Scenario ID | Spine ID(s) | Source Type (`Requirement`/`Design-Risk`) | Acceptance Criteria ID(s) | Requirement ID(s) | Use Case ID(s) | Validation Mode (`API`/`Browser-E2E`/`Desktop-UI`/`CLI`/`Integration`/`Process`/`Lifecycle`/`Other`) | Platform / Runtime | Lifecycle Boundary (`None`/`Install`/`Startup`/`Update`/`Restart`/`Migration`/`Shutdown`/`Recovery`) | Objective/Risk | Expected Outcome | Durable Validation Asset(s) | Temporary Validation Method / Setup | Command/Harness | Status (`Not Started`/`In Progress`/`Passed`/`Failed`/`Blocked`/`N/A`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| AV-001 | DS-001 | Requirement | AC-001 | R-003, R-005, R-012 | UC-001, UC-002 | CLI / Integration | local `codex app-server` via bootstrapper integration | None | prove live Codex discovery still works when fallback is a whole-directory symlink and no runtime `openai.yaml` exists | Codex lists the symlinked fallback skill and bootstrap skips copying when the same-name repo skill already exists | `autobyteus-server-ts/tests/integration/agent-execution/codex-thread-bootstrapper.integration.test.ts` | temporary no-Prisma Vitest config, `RUN_CODEX_E2E=1` | `RUN_CODEX_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/integration/agent-execution/codex-thread-bootstrapper.integration.test.ts --config .materializer-vitest.config.mjs --no-watch` | Passed |
| AV-002 | DS-001, DS-003 | Requirement | AC-002 | R-003, R-004, R-011, R-012 | UC-002, UC-005 | CLI / Integration | local `codex app-server` via bootstrapper integration | None | prove Codex fallback path is `.codex/skills/<sanitized-name>` and stays live instead of stale | the materialized workspace path is an intuitive symlink and Codex discovers the external source-root `SKILL.md` | `autobyteus-server-ts/tests/integration/agent-execution/codex-thread-bootstrapper.integration.test.ts` | temporary no-Prisma Vitest config, `RUN_CODEX_E2E=1` | same as `AV-001` | Passed |
| AV-003 | DS-003 | Requirement | AC-003 | R-010, R-012 | UC-003 | Other | local Node/Vitest filesystem validation | None | prove whole-directory symlinking preserves team-shared relative symlinks without a mirrored workspace shared folder | shared-file reads succeed through the materialized path, updates stay live, and `.codex/shared` is absent | `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/codex-workspace-skill-materializer.test.ts` | temporary no-Prisma Vitest config | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-execution/backends/codex/codex-workspace-skill-materializer.test.ts --config .materializer-vitest.config.mjs --no-watch` | Passed |
| AV-004 | DS-003, DS-004 | Requirement | AC-004, AC-006 | R-007, R-008, R-009, R-012 | UC-005 | Other | local Node/Vitest filesystem validation | None | prove collisions fail loudly and cleanup removes only the expected runtime-owned symlink | both backends reject same-name collisions and preserve a path that no longer matches the expected symlink during cleanup | `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/codex-workspace-skill-materializer.test.ts`, `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/claude-workspace-skill-materializer.test.ts` | temporary no-Prisma Vitest config | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-execution/backends/codex/codex-workspace-skill-materializer.test.ts tests/unit/agent-execution/backends/claude/claude-workspace-skill-materializer.test.ts --config .materializer-vitest.config.mjs --no-watch` | Passed |
| AV-005 | DS-002, DS-003, DS-004 | Requirement | AC-005, AC-006 | R-006, R-007, R-008, R-011, R-012 | UC-004, UC-005 | Other | local Node/Vitest filesystem validation | None | prove Claude workspace materialization is symlink-based and no longer stale | Claude workspace paths are symlinks, source updates stay live, and no marker-file copy contract remains | `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/claude-workspace-skill-materializer.test.ts` | temporary no-Prisma Vitest config | same as `AV-004` | Passed |
| AV-006 | DS-001 | Design-Risk | AC-001, AC-003 | R-003, R-005, R-010, R-012 | UC-002, UC-003 | API | local `codex app-server` via GraphQL/WebSocket runtime | None | prove real Codex turn execution still works when the configured skill is materialized as a whole-directory workspace symlink and the skill itself contains a symlinked file outside the skill folder | the workspace skill directory is a symlink, the linked guidance file remains readable through the materialized path, and Codex returns the token that appears only in the external shared file | `autobyteus-server-ts/tests/e2e/runtime/agent-runtime-graphql.e2e.test.ts` | `RUN_CODEX_E2E=1` | `RUN_CODEX_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/agent-runtime-graphql.e2e.test.ts -t "uses a whole-directory materialized skill whose linked shared file sits outside the skill folder" --no-watch` | Passed |

## Validation Assets Implemented Or Updated

| Asset Path / Name | Asset Type (`API Test`/`Browser Test`/`Desktop Automation`/`CLI Harness`/`Lifecycle Harness`/`Process Probe`/`Harness`/`Fixture`/`Helper`/`Other`) | Durable In Repo (`Yes`/`No`) | Scenario ID(s) | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/codex-workspace-skill-materializer.test.ts` | Harness | Yes | AV-003, AV-004 | Updated to assert symlink behavior, no-suffix naming, shared-relative-path viability, collision rejection, and guarded cleanup |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/claude-workspace-skill-materializer.test.ts` | Harness | Yes | AV-004, AV-005 | Updated to assert symlink behavior, live source updates, collision rejection, and guarded cleanup |
| `autobyteus-server-ts/tests/integration/agent-execution/codex-thread-bootstrapper.integration.test.ts` | CLI Harness | Yes | AV-001, AV-002 | Updated live Codex integration to assert whole-directory symlink fallback and no runtime-generated yaml |
| `autobyteus-server-ts/tests/e2e/runtime/agent-runtime-graphql.e2e.test.ts` | API Test | Yes | AV-006 | Added a live Codex GraphQL/WebSocket scenario that proves Codex can answer from a linked shared file reachable only through the whole-directory materialized skill symlink |

## Temporary Validation Methods / Setup Used

| Method / Setup | Why Needed | Scenario ID(s) | Cleanup Required (`Yes`/`No`) | Cleanup Status |
| --- | --- | --- | --- | --- |
| ephemeral `.materializer-vitest.config.mjs` | bypass unrelated Prisma global setup and DB locking for filesystem-only validation | AV-001, AV-002, AV-003, AV-004, AV-005 | Yes | Cleaned up after each targeted run |
| `RUN_CODEX_E2E=1` | enable the opt-in live Codex runtime integration paths | AV-001, AV-002, AV-006 | No | N/A |

## Prior Failure Resolution Check (Mandatory On Round >1)

| Prior Round | Scenario ID | Previous Classification | Current Resolution (`Resolved`/`Partially Resolved`/`Still Failing`/`Not Applicable After Rework`) | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | AV-001, AV-002, AV-003 | Validation Gap | Resolved | `autobyteus-server-ts/tests/e2e/runtime/agent-runtime-graphql.e2e.test.ts` | Added a higher-level live Codex GraphQL/WebSocket proof that the materialized workspace skill symlink and the linked shared file both work during a real runtime turn |

## Failure Escalation Log

| Date | Scenario ID | Failure Summary | Investigation Required (`Yes`/`No`) | Classification (`Local Fix`/`Design Impact`/`Requirement Gap`/`Unclear`) | Action Path | `investigation-notes.md` Updated | Requirements Updated | Design Updated | Call Stack Regenerated | Review Re-Entry Round | Resolved |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

## Feasibility And Risk Record

- Any infeasible scenarios (`Yes`/`No`): `No`
- If `Yes`, concrete infeasibility reason per scenario: `N/A`
- Environment constraints (secrets/tokens/access limits/dependencies):
  - live Claude CLI org access remains unavailable in this environment, so no separate live Claude Stage 7 scenario was added beyond the durable targeted backend tests already required by `AC-005`
- Platform/runtime specifics for lifecycle-sensitive scenarios (OS/runtime/version `from` -> `to`/package channel or update feed/signing/access requirements): `N/A`
- Compensating automated evidence:
  - updated Claude durable validation suite
  - earlier investigation evidence that Claude already loads direct project skills from `.claude/skills/<name>`
- Residual risk notes:
  - Codex whole-directory symlink behavior is now live-proven both at bootstrap discovery time and at the higher-level GraphQL/WebSocket runtime boundary in this branch
  - Claude directory-symlink acceptance remains lower-confidence than Codex until live CLI access is available again, but the changed backend contract is durable-test covered
- Human-assisted execution steps required because of platform or OS constraints (`Yes`/`No`): `No`
- If `Yes`, exact steps and evidence capture: `N/A`
- User waiver for infeasible acceptance criteria recorded (`Yes`/`No`): `No`
- If `Yes`, waiver reference (date/user decision): `N/A`
- Temporary validation-only scaffolding cleaned up (`Yes`/`No`/`Partially`): `Yes`
- If retained, why it remains useful as durable coverage: `N/A`

## Stage 7 Gate Decision

- Latest authoritative round: `2`
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
  - targeted backend validation was executed with a temporary no-Prisma Vitest config because the default repo-wide Prisma setup is unrelated to these filesystem-only scenarios and causes DB lock contention when multiple Vitest processes run
  - the user-requested stronger Codex proof now exists as a durable repository test that exercises the real GraphQL/WebSocket runtime path, verifies `.codex/skills/<name>` is a whole-directory symlink, and proves Codex can answer from a shared file that sits outside the source skill folder
