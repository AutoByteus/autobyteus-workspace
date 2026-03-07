# API/E2E Testing

## Testing Scope

- Ticket: `temp-workspace-app-config-root`
- Scope classification: `Small`
- Workflow state source: `tickets/in-progress/temp-workspace-app-config-root/workflow-state.md`
- Requirements source: `tickets/in-progress/temp-workspace-app-config-root/requirements.md`
- Call stack source: `tickets/in-progress/temp-workspace-app-config-root/future-state-runtime-call-stack.md`
- Design source (`Medium/Large`): `N/A`

## Acceptance Criteria Coverage Matrix (Mandatory)

| Acceptance Criteria ID | Requirement ID | Criterion Summary | Scenario ID(s) | Current Status (`Unmapped`/`Not Run`/`Passed`/`Failed`/`Blocked`/`Waived`) | Last Updated |
| --- | --- | --- | --- | --- | --- |
| AC-001 | R-001 | Default temp workspace resolves under active app data dir when no override is configured | AV-001 | Passed | 2026-03-07 |
| AC-002 | R-004 | GraphQL exposes the backend-selected temp workspace absolute path | AV-001 | Passed | 2026-03-07 |
| AC-003 | R-003 | Relative override behavior remains valid under app data dir | AV-002 | Passed | 2026-03-07 |
| AC-004 | R-002 | No default OS-temp-root behavior remains in the verified backend path flow | AV-002 | Passed | 2026-03-07 |

## Scenario Catalog

| Scenario ID | Source Type (`Requirement`/`Design-Risk`) | Acceptance Criteria ID(s) | Requirement ID(s) | Use Case ID(s) | Level (`API`/`E2E`) | Objective/Risk | Expected Outcome | Command/Harness | Status (`Not Started`/`In Progress`/`Passed`/`Failed`/`Blocked`/`N/A`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| AV-001 | Requirement | AC-001, AC-002 | R-001, R-004 | UC-001, UC-003 | E2E | Validate backend default temp workspace root and GraphQL exposure | `workspaces` GraphQL returns `temp_ws_default` rooted under `<appDataDir>/temp_workspace` | `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/workspaces/workspaces-graphql.e2e.test.ts` | Passed |
| AV-002 | Requirement | AC-003, AC-004 | R-002, R-003 | UC-002 | E2E | Validate relative override remains app-data-relative and old default no longer appears | `workspaces` GraphQL returns `temp_ws_default` rooted under `<appDataDir>/isolated-temp-workspace` when override is set | `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/workspaces/workspaces-graphql.e2e.test.ts` | Passed |

## Failure Escalation Log

None.

## Feasibility And Risk Record

- Any infeasible scenarios (`Yes`/`No`): `No`
- If `Yes`, concrete infeasibility reason per scenario: `N/A`
- Environment constraints (secrets/tokens/access limits/dependencies):
  - Supplemental live Claude runtime suite is environment-gated and may skip.
- Compensating automated evidence:
  - `pnpm -C autobyteus-server-ts exec vitest run tests/unit/config/app-config.test.ts`
  - `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/workspaces/workspaces-graphql.e2e.test.ts`
  - `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/claude-runtime-graphql.e2e.test.ts -t "keeps default temp workspace isolated from the server worktree git root"` -> skipped by suite gate
- Residual risk notes:
  - Low residual risk remains around live Claude transport execution because the environment-gated suite skipped rather than running.
- User waiver for infeasible acceptance criteria recorded (`Yes`/`No`): `No`

## Stage 7 Gate Decision

- Stage 7 complete: `Yes`
- All in-scope acceptance criteria mapped to scenarios: `Yes`
- All executable in-scope acceptance criteria status = `Passed`: `Yes`
- Critical executable scenarios passed: `Yes`
- Any infeasible acceptance criteria: `No`
- Explicit user waiver recorded for each infeasible acceptance criterion (if any): `N/A`
- Unresolved escalation items: `No`
- Ready to enter Stage 8 code review: `Yes`
- Notes:
  - Critical backend-visible behavior is covered by the GraphQL E2E suite.
