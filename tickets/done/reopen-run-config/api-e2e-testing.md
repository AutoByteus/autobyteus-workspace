# API/E2E Testing

## Testing Scope
- Ticket: `reopen-run-config`
- Scope classification: Small
- Workflow state source: `tickets/in-progress/reopen-run-config/workflow-state.md`
- Requirements source: `tickets/in-progress/reopen-run-config/requirements.md`
- Call stack source: `tickets/in-progress/reopen-run-config/future-state-runtime-call-stack.md`
- Design source: `tickets/in-progress/reopen-run-config/implementation-plan.md`

## Acceptance Criteria Coverage Matrix
| Acceptance Criteria ID | Requirement ID | Criterion Summary | Scenario ID(s) | Current Status | Last Updated |
| --- | --- | --- | --- | --- | --- |
| AC-101 | R-101 | Agent header `Edit config` opens selected-run config | AV-101 | Passed | 2026-02-27 |
| AC-102 | R-102 | Team header `Edit config` opens selected-team config | AV-102 | Passed | 2026-02-27 |
| AC-103 | R-103 | Selection remains event/chat-first by default | AV-103 | Passed | 2026-02-27 |
| AC-104 | R-105 | `Back to event view` returns to event/chat view | AV-104 | Passed | 2026-02-27 |
| AC-105 | R-106 | History tree renders no run/team config row selectors | AV-105 | Passed | 2026-02-27 |

## Scenario Catalog
| Scenario ID | Source Type | Acceptance Criteria ID(s) | Requirement ID(s) | Use Case ID(s) | Level | Objective/Risk | Expected Outcome | Command/Harness | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| AV-101 | Requirement | AC-101 | R-101,R-104 | UC-101 | E2E | Verify agent header action is config entrypoint | Clicking header `Edit config` opens selected-run config panel | `cd autobyteus-web && pnpm test:nuxt components/workspace/agent/__tests__/AgentWorkspaceView.spec.ts components/workspace/team/__tests__/TeamWorkspaceView.spec.ts components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts components/workspace/config/__tests__/RunConfigPanel.spec.ts components/layout/__tests__/WorkspaceDesktopLayout.spec.ts --run` | Passed |
| AV-102 | Requirement | AC-102 | R-102,R-104 | UC-102 | E2E | Verify team header action is config entrypoint | Clicking team header `Edit config` opens team config panel | same as above | Passed |
| AV-103 | Requirement | AC-103 | R-103 | UC-103 | E2E | Verify selection remains event/chat-first | Row selection does not auto-switch to config view | same as above | Passed |
| AV-104 | Requirement | AC-104 | R-105 | UC-103 | E2E | Verify explicit return path from config mode | `Back to event view` returns center mode to event/chat | same as above | Passed |
| AV-105 | Requirement | AC-105 | R-106 | UC-104 | E2E | Verify history row-config actions removed | `workspace-run-config-*` and `workspace-team-config-*` selectors absent | same as above | Passed |

## Failure Escalation Log
- None

## Feasibility And Risk Record
- Any infeasible scenarios: No
- Environment constraints: Browser/Electron automation harness not used in this ticket; scenario execution is component-level E2E-style.
- Compensating automated evidence: `45/45` tests passed across mapped suites.
- Residual risk notes: native desktop host integration click path not separately automated.
- User waiver for infeasible acceptance criteria recorded: N/A

## Stage 7 Gate Decision
- Stage 7 complete: Yes
- All in-scope acceptance criteria mapped to scenarios: Yes
- All executable in-scope acceptance criteria status = Passed: Yes
- Critical executable scenarios passed: Yes
- Any infeasible acceptance criteria: No
- Explicit user waiver recorded for infeasible acceptance criteria: N/A
- Unresolved escalation items: No
- Ready to enter Stage 8 code review: Yes
