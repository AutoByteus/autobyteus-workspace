# Requirements Document — Two server e2e tests fail since autobyteus-197

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-001`
- Package identifier: `e2e-task-execution-source-fixtures`
- Request / ticket: Project Task `autobyteus-211`
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`)
- Requirements owner: Solution Designer
- Date: 2026-10-20
- Approved by and reference: `Solution Designer within the direction (user informed)`. Reference: the Solution Designer's message to the user, 2026-10-20 ("autobyteus-211 requirements approved within the Task's direction …").
- Exact approved baseline: SR-001
- Behavior-defining supplements: none

## Problem And Desired Outcome

- Problem: since autobyteus-197 made `source` required for delegated-copy (task execution) records and stream payloads, two server e2e tests fail on `origin/personal`, because their fixtures predate the field. This leaves the base red.
- Desired outcome: both tests pass again with fixtures in the current shape, and they still test what they were written for. No other suite fails for the same reason.

## Relevant Current And Desired Behavior

| ID | Current (evidence) | Desired | Preserved |
| --- | --- | --- | --- |
| BEH-001 | `memory-collaboration-graphql.e2e.test.ts` fails: `rootTeam.taskExecutions[0] is missing required field(s): source.` (reproduced) | Passes; its team-root fixture carries a valid task-agent `source` | The test's intent: memory collaboration over GraphQL for team and org roots |
| BEH-002 | `team-task-event-current-contract.e2e.test.ts` fails: `source` undefined in both `TASK_EXECUTION_STARTED` payloads (reproduced) | Passes; the task-agent and task-team payloads carry a valid `source` DTO | The test's intent: exact current payloads (with the delegator) parse; retired events are rejected |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| ID | Use Case |
| --- | --- |
| UC-001 | `pnpm test:e2e` on `personal` runs without these two failures |

### Out Of Scope

- Product code and schemas.
- Type-checking of test files (`autobyteus-65`; FU-001).
- Fixtures that pass and intentionally use old shapes.
- The validation process gap (FU-002).

### Non-Goals

No shared fixture builder refactor.

### Prerequisites

None.

### Preserved Behavior Boundary

Every other test unchanged; the two tests' assertions unchanged apart from the added fixture fields.

### Review Authority

Standard (`ticket-scope.md`).

## Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| REQ-001 | The task execution in `memory-collaboration-graphql.e2e.test.ts` carries a task-agent `source` in the current record shape (`kind: "agent"`, the delegated agent's definition id, a launch configuration), consistent with the rest of the fixture. | Must |
| REQ-002 | Both `TASK_EXECUTION_STARTED` payloads in `team-task-event-current-contract.e2e.test.ts` carry a `source` DTO in the current contract shape (task agent: `kind: "agent"`, `agent_definition_id`, `launch_configuration`; task team: `kind: "agent_team"`, team definition id, coordinator address, members, handoffs, default launch configuration). The assertions stay as they are. | Must |
| REQ-003 | No other test fails because of the required `source`. | Must |

## Acceptance Criteria

| AC ID | REQ | Expected | Verification |
| --- | --- | --- | --- |
| AC-001 | REQ-001 | `memory-collaboration-graphql.e2e.test.ts` passes (all its cases) | `env -i … vitest run <file>` |
| AC-002 | REQ-002 | `team-task-event-current-contract.e2e.test.ts` passes (both cases) | Same |
| AC-003 | REQ-003 | Full `pnpm test:e2e` shows no failures (gated suites skipped as usual); server `test:unit` green; the three contract packages' tests green | Run logs |

## Decisions

| ID | Question | Reasoning And Recommendation | Owner | Status |
| --- | --- | --- | --- | --- |
| DEC-001 | Shapes to use | Follow the existing valid examples (`team-run-current-package-schema.test.ts` L75-86; `team-task-executions-closed.test.mjs` L16), so the fixtures match what 197 writes | Solution Designer | Decided |
| DEC-002 | Fix the ~30 passing fixtures without `source` too? | No: they pass by design (old or projection shapes). Type-level staleness is FU-001 for autobyteus-65 | Solution Designer | Decided |

## Readiness Check

All checks: Yes. Approval recorded. Ready for design.
