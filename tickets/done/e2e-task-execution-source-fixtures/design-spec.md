# Design Spec — Two server e2e tests fail since autobyteus-197

## Solution And Approval Basis

- SR-001; requirements approved by the Solution Designer within the direction (user informed 2026-10-20). Design status: `Ready`.
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/e2e-task-execution-source-fixtures/tickets/in-progress/e2e-task-execution-source-fixtures/investigation-notes.md`
- Authorities read: `references/architecture-design.md`, `references/design-principles.md` (with the 2026-10-20 diff), `references/ticket-scope.md`, `references/handoff.md`, `/Users/normy/autobyteus_org/autobyteus-worktrees/e2e-task-execution-source-fixtures/DESIGN.md`, `TESTING.md`. Conflicts: none.

## Current-State Read

Two test fixtures predate the required `source` (record schema and stream DTO, autobyteus-197). The product is correct; the fixtures are stale.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Small`. Two test files, fixture data only.
- Architectural risk: `Low`. No product code, contract, persistence or deployment change.
- Escalation trigger: if a test then fails on its assertions (not on fixture shape), that signals a real product difference. Investigate it before changing any assertion.

## Intended Change

Add a valid `source` to the three fixture executions (one record, two DTOs), following the existing valid examples.

## Change Scope (Mandatory)

- In scope: UC-001. `autobyteus-server-ts/tests/e2e/memory/memory-collaboration-graphql.e2e.test.ts` (`writingTeamTree` task execution) and `autobyteus-server-ts/tests/e2e/runtime/team-task-event-current-contract.e2e.test.ts` (both `TASK_EXECUTION_STARTED` payloads).
- Deliberately left alone: product code; the other fixtures (DEC-002); the test helpers (`testExecutionTree`).
- Follow-ups: FU-001, FU-002 (`follow-ups.md`).

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior | REQ / AC | Path |
| --- | --- | --- |
| BEH-001 | REQ-001, AC-001 | Test → `writeTeamRoot` → run-history schema validation (`parseTaskAgentExecutionSource`) → GraphQL memory reads |
| BEH-002 | REQ-002, AC-002 | Test → `parseTeamStreamServerMessage` (`@autobyteus/team-stream-contracts`) |

## Task Design Health Assessment (Mandatory)

- Change posture: `Bug Fix` (test fixtures)
- Root cause classification: `Local Implementation Defect` (stale fixtures)
- Refactor needed now: `No`

## Legacy Removal Policy / Removal Plan (Mandatory)

Nothing to remove. Compatibility wrappers: `None`.

## Persisted Data / State Transition Decision (Mandatory)

`Not Affected`.

## Data-Flow Spine Inventory; Ownership; Interfaces

N/A beyond the behavior map: test data only.

## Final File Responsibility Mapping

| File | Change |
| --- | --- |
| `…/tests/e2e/memory/memory-collaboration-graphql.e2e.test.ts` | Task execution: `source: { kind: "agent", agentDefinitionId: <the writer's definition id in this fixture>, launchConfiguration: <same shape as the fixture's other launch configurations> }` |
| `…/tests/e2e/runtime/team-task-event-current-contract.e2e.test.ts` | Task agent: `source: { kind: "agent", agent_definition_id: "worker", launch_configuration: {…} }`. Task team: `source: { kind: "agent_team", team_definition_id, coordinator_address: "/worker/lead", members: [{ address: "/worker/lead", agent_definition_id, launch_configuration, follows_team: true }], handoffs: [], default_launch_configuration }`. Use the exact contract field names from `team-execution-view-dtos.ts` |

## Concrete Examples

See investigation notes, "Valid shapes to follow".

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Decision |
| --- | --- |
| Make `source` optional again | Rejected: it changes 197's product contract to fit a test |

## Change Sequence

Edit the fixtures; run both files; then the full `pnpm test:e2e` (clean env), server `test:unit`, and the three contract package tests.

## Guidance For Implementation

- Keep assertions unchanged.
- Use the TESTING.md clean-env command for e2e.
