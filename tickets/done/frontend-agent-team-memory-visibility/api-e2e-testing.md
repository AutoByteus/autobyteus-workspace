# API/E2E Testing

## Testing Scope

- Ticket: `frontend-agent-team-memory-visibility`
- Scope classification: `Medium`
- Workflow state source: `tickets/in-progress/frontend-agent-team-memory-visibility/workflow-state.md`
- Requirements source: `tickets/in-progress/frontend-agent-team-memory-visibility/requirements.md`
- Call stack source: `tickets/in-progress/frontend-agent-team-memory-visibility/future-state-runtime-call-stack.md`
- Design source: `tickets/in-progress/frontend-agent-team-memory-visibility/proposed-design.md`

## Acceptance Criteria Coverage Matrix (Mandatory)

| Acceptance Criteria ID | Requirement ID | Criterion Summary | Scenario ID(s) | Current Status (`Unmapped`/`Not Run`/`Passed`/`Failed`/`Blocked`/`Waived`) | Last Updated |
| --- | --- | --- | --- | --- | --- |
| AC-001 | R-001 | Scope toggle visible and defaults to agent | AV-001 | Passed | 2026-03-07 |
| AC-002 | R-002 | Agent runs memory behavior remains | AV-002 | Passed | 2026-03-07 |
| AC-003 | R-003,R-005 | Team/member listing and contextual selection header | AV-003 | Passed | 2026-03-07 |
| AC-004 | R-004,R-007 | Team member memory payload retrieval works from `agent_teams` | AV-004 | Passed | 2026-03-07 |
| AC-005 | R-006 | Scope switch clears incompatible selection | AV-005 | Passed | 2026-03-07 |
| AC-006 | R-006 | Scoped error/stale guard behavior | AV-006 | Passed | 2026-03-07 |
| AC-007 | R-008 | Legacy agent memory APIs remain working | AV-007 | Passed | 2026-03-07 |
| AC-008 | NFR-004 | Automated test coverage exists for new behavior | AV-008 | Passed | 2026-03-07 |

## Scenario Catalog

| Scenario ID | Source Type (`Requirement`/`Design-Risk`) | Acceptance Criteria ID(s) | Requirement ID(s) | Use Case ID(s) | Level (`API`/`E2E`) | Objective/Risk | Expected Outcome | Command/Harness | Status (`Not Started`/`In Progress`/`Passed`/`Failed`/`Blocked`/`N/A`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| AV-001 | Requirement | AC-001 | R-001 | UC-001 | E2E | Validate scope entrypoint UX | Toggle present and defaults to agent scope | `pnpm -C autobyteus-web exec vitest --run components/memory/__tests__/MemoryIndexPanel.spec.ts pages/__tests__/memory.spec.ts` | Passed |
| AV-002 | Requirement | AC-002 | R-002 | UC-001 | E2E | Prevent regression on existing agent path | Agent memory selection flow still works | `pnpm -C autobyteus-web exec vitest --run tests/stores/agentMemoryViewStore.test.ts tests/stores/agentMemoryIndexStore.test.ts` | Passed |
| AV-003 | Requirement | AC-003 | R-003,R-005 | UC-002,UC-003 | E2E | Team/member UI binding correctness | Team scope selection updates contextual inspector text | `pnpm -C autobyteus-web exec vitest --run components/memory/__tests__/MemoryInspector.spec.ts components/memory/__tests__/MemoryIndexPanel.spec.ts` | Passed |
| AV-004 | Requirement | AC-004 | R-004,R-007 | UC-003 | API | Team member memory retrieval contract | Query returns selected member `runId` and memory content from `agent_teams` | `pnpm -C autobyteus-server-ts exec vitest --run tests/e2e/runtime/memory-graphql.e2e.test.ts` | Passed |
| AV-005 | Requirement | AC-005 | R-006 | UC-004 | E2E | Scope isolation correctness | Switching scope avoids incompatible persisted selection render | `pnpm -C autobyteus-web exec vitest --run components/memory/__tests__/MemoryIndexPanel.spec.ts components/memory/__tests__/MemoryInspector.spec.ts` | Passed |
| AV-006 | Requirement | AC-006 | R-006 | UC-004,UC-005 | E2E | Stale/error behavior safety | Store request-id guards and error handling preserve prior successful view | `pnpm -C autobyteus-web exec vitest --run tests/stores/teamMemoryViewStore.test.ts tests/stores/agentMemoryViewStore.test.ts` | Passed |
| AV-007 | Requirement | AC-007 | R-008 | UC-005 | API | Regression safety on legacy agent memory APIs | `listRunMemorySnapshots` and `getRunMemoryView` continue to pass | `pnpm -C autobyteus-server-ts exec vitest --run tests/e2e/runtime/memory-graphql.e2e.test.ts` | Passed |
| AV-008 | Requirement | AC-008 | NFR-004 | UC-001..UC-005 | API | Coverage presence check | New backend/frontend tests pass in targeted suite | `pnpm -C autobyteus-server-ts exec vitest --run tests/unit/agent-memory-view/team-memory-index-service.test.ts tests/unit/api/graphql/types/memory-index-types.test.ts tests/unit/api/graphql/types/memory-view-types.test.ts && pnpm -C autobyteus-web exec vitest --run tests/stores/teamMemoryIndexStore.test.ts tests/stores/teamMemoryViewStore.test.ts components/memory/__tests__/MemoryIndexPanel.spec.ts components/memory/__tests__/MemoryInspector.spec.ts pages/__tests__/memory.spec.ts tests/stores/agentMemoryViewStore.test.ts tests/stores/agentMemoryIndexStore.test.ts` | Passed |

## Failure Escalation Log

- No Stage 7 failing scenarios.

## Feasibility And Risk Record

- Any infeasible scenarios (`Yes`/`No`): `No`
- Environment constraints: none that blocked execution in this scope.
- User waiver for infeasible acceptance criteria recorded (`Yes`/`No`): `N/A`

## Stage 7 Gate Decision

- Stage 7 complete: `Yes`
- All in-scope acceptance criteria mapped to scenarios: `Yes`
- All executable in-scope acceptance criteria status = `Passed`: `Yes`
- Critical executable scenarios passed: `Yes`
- Any infeasible acceptance criteria: `No`
- Explicit user waiver recorded for infeasible acceptance criteria (if any): `N/A`
- Unresolved escalation items: `No`
- Ready to enter Stage 8 code review: `Yes`
- Notes: UI-level scenarios were executed via automated component/page harness; API-level scenarios were executed via GraphQL e2e harness.
