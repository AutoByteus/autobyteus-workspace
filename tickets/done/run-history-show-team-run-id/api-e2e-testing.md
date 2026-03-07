# API/E2E Testing

## Testing Scope

- Ticket: `run-history-show-team-run-id`
- Scope classification: `Small`
- Workflow state source: `tickets/in-progress/run-history-show-team-run-id/workflow-state.md`
- Requirements source: `tickets/in-progress/run-history-show-team-run-id/requirements.md`
- Call stack source: `tickets/in-progress/run-history-show-team-run-id/future-state-runtime-call-stack.md`

## Acceptance Criteria Coverage Matrix (Mandatory)

| Acceptance Criteria ID | Requirement ID | Criterion Summary | Scenario ID(s) | Current Status (`Unmapped`/`Not Run`/`Passed`/`Failed`/`Blocked`/`Waived`) | Last Updated |
| --- | --- | --- | --- | --- | --- |
| AC-001 | R-001 | Team row primary label uses run identifier | AV-001 | Passed | 2026-03-07 |
| AC-002 | R-001 | Same-team runs remain distinguishable by label | AV-001 | Passed | 2026-03-07 |
| AC-003 | R-002 | Team row selection behavior unchanged | AV-002 | Passed | 2026-03-07 |
| AC-004 | R-003 | Team projection does not re-sort by activity timestamp | AV-003 | Passed | 2026-03-07 |
| AC-005 | R-003 | Team order remains stable across updates in-session | AV-003 | Passed | 2026-03-07 |

## Scenario Catalog

| Scenario ID | Source Type (`Requirement`/`Design-Risk`) | Acceptance Criteria ID(s) | Requirement ID(s) | Use Case ID(s) | Level (`API`/`E2E`) | Objective/Risk | Expected Outcome | Command/Harness | Status (`Not Started`/`In Progress`/`Passed`/`Failed`/`Blocked`/`N/A`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| AV-001 | Requirement | AC-001, AC-002 | R-001 | UC-001 | E2E | Verify rendered row label source | Team row text contains `teamRunId` | `pnpm -C autobyteus-web exec vitest --run stores/__tests__/runHistoryStore.spec.ts components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts` | Passed |
| AV-002 | Requirement | AC-003 | R-002 | UC-002 | E2E | Verify selection path unchanged | `selectRun(teamRunId, 'team')` still called | same command | Passed |
| AV-003 | Requirement | AC-004, AC-005 | R-003 | UC-003 | API | Verify projection order stability | Team node order preserves insertion/source order despite timestamp differences | same command | Passed |

## Failure Escalation Log

- None.

## Feasibility And Risk Record

- Any infeasible scenarios (`Yes`/`No`): No
- Environment constraints (secrets/tokens/access limits/dependencies): None
- Compensating automated evidence: N/A
- Residual risk notes: If backend reorders rows during fetch, frontend follows backend order (expected).
- User waiver for infeasible acceptance criteria recorded (`Yes`/`No`): No

## Stage 7 Gate Decision

- Stage 7 complete: Yes
- All in-scope acceptance criteria mapped to scenarios: Yes
- All executable in-scope acceptance criteria status = `Passed`: Yes
- Critical executable scenarios passed: Yes
- Any infeasible acceptance criteria: No
- Explicit user waiver recorded for each infeasible acceptance criterion (if any): N/A
- Unresolved escalation items: No
- Ready to enter Stage 8 code review: Yes
- Notes: Store+component focused tests provide full signal for this small-scope change.
