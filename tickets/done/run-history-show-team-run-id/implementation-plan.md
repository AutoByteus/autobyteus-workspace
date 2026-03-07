# Implementation Plan

## Scope Classification

- Classification: `Small`
- Reasoning:
  - View-layer label binding plus team-node ordering rule update.
  - Focused unit tests only.

## Upstream Artifacts (Required)

- Workflow state: `tickets/in-progress/run-history-show-team-run-id/workflow-state.md`
- Investigation notes: `tickets/in-progress/run-history-show-team-run-id/investigation-notes.md`
- Requirements: `tickets/in-progress/run-history-show-team-run-id/requirements.md`
  - Current Status: `Refined`
- Runtime call stacks: `tickets/in-progress/run-history-show-team-run-id/future-state-runtime-call-stack.md`
- Runtime review: `tickets/in-progress/run-history-show-team-run-id/future-state-runtime-call-stack-review.md`

## Plan Maturity

- Current Status: `Review-Gate-Validated`
- Notes: Re-entry update completed for stable ordering requirement.

## Solution Sketch (Small Scope)

- Use Cases In Scope:
  - `UC-001`: Team rows display unique `teamRunId` labels.
  - `UC-002`: Team-row selection/navigation unaffected by label change.
  - `UC-003`: Team row ordering remains stable during live updates.
- Requirement Coverage Guarantee:
  - `R-001` covered by team-row label render update.
  - `R-002` covered by unchanged `onSelectTeam(team.teamRunId)` behavior.
  - `R-003` covered by removing dynamic `lastActivityAt` sort from team node projection.
- Target Architecture Shape:
  - Keep boundaries unchanged: read-model/projection creates nodes, view renders nodes.
- New Layers/Modules/Boundary Interfaces To Introduce:
  - None.
- Touched Files/Modules:
  - `autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue`
  - `autobyteus-web/stores/runHistoryTeamHelpers.ts`
  - `autobyteus-web/components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts`
  - `autobyteus-web/stores/__tests__/runHistoryStore.spec.ts`
- API/Behavior Delta:
  - Team row visible label changes from `teamDefinitionName` to `teamRunId`.
  - Team list order changes from recency sort to stable insertion/source order.
- Key Assumptions:
  - API-provided team order is acceptable as baseline order.
- Known Risks:
  - If backend changes order between fetches, frontend will follow backend order on refresh.

## Runtime Call Stack Review Gate Summary (Required)

| Round | Review Result | Findings Requiring Persisted Updates | New Use Cases Discovered | Persisted Updates Completed | Classification (`Design Impact`/`Requirement Gap`/`Unclear`/`N/A`) | Required Re-Entry Path | Round State (`Reset`/`Candidate Go`/`Go Confirmed`) | Clean Streak After Round |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Pass | No | No | N/A | N/A | N/A | Candidate Go | 1 |
| 2 | Pass | No | No | N/A | N/A | N/A | Go Confirmed | 2 |

## Go / No-Go Decision

- Decision: `Go`
- Evidence:
  - Final review round: `2`
  - Clean streak at final round: `2`
  - Final review gate line (`Implementation can start`): `Yes`

## Dependency And Sequencing Map

| Order | File/Module | Depends On | Why This Order |
| --- | --- | --- | --- |
| 1 | `runHistoryTeamHelpers.ts` | None | Remove dynamic order behavior at projection source. |
| 2 | `WorkspaceHistoryWorkspaceSection.vue` | None | Ensure team label rendering uses run ID. |
| 3 | `runHistoryStore.spec.ts` | 1 | Add stable-order regression coverage. |
| 4 | `WorkspaceAgentRunsTreePanel.spec.ts` | 2 | Preserve display-label assertion. |

## Requirement And Design Traceability

| Requirement | Acceptance Criteria ID(s) | Design Section | Use Case / Call Stack | Planned Task ID(s) | Stage 6 Verification (Unit/Integration) | Stage 7 Scenario ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| R-001 | AC-001, AC-002 | Solution Sketch | UC-001 | T-001 | Unit | AV-001 |
| R-002 | AC-003 | Solution Sketch | UC-002 | T-002 | Unit | AV-002 |
| R-003 | AC-004, AC-005 | Solution Sketch | UC-003 | T-003 | Unit | AV-003 |

## Acceptance Criteria To Stage 7 Mapping (Mandatory)

| Acceptance Criteria ID | Requirement ID | Expected Outcome | Stage 7 Scenario ID(s) | Test Level (`API`/`E2E`) | Initial Status (`Planned`/`Blocked`) |
| --- | --- | --- | --- | --- | --- |
| AC-001 | R-001 | Team row shows team run ID as label. | AV-001 | E2E | Planned |
| AC-002 | R-001 | Rows are distinguishable for same team name / different run IDs. | AV-001 | E2E | Planned |
| AC-003 | R-002 | Team row selection still selects same run ID. | AV-002 | E2E | Planned |
| AC-004 | R-003 | Team entries no longer reorder by `lastActivityAt`. | AV-003 | API | Planned |
| AC-005 | R-003 | Team order remains stable across reactive updates in current session. | AV-003 | API | Planned |

## Step-By-Step Plan

1. Remove recency sort in team-node projection to preserve insertion/source order.
2. Keep team row label bound to `teamRunId`.
3. Add store-level regression test asserting order does not reorder by activity timestamp.
4. Run focused workspace history panel + run history store tests.
5. Record Stage 7/8/9 artifacts.

## Backward-Compat And Decoupling Guardrails (Mandatory)

- Backward-compatibility mechanisms introduced: `None`
- Legacy code retained for old behavior: `No`
- Decoupling impact assessment completed: `Yes`
- New tight coupling or cyclic dependency introduced: `No`

## Test Strategy

- Unit tests:
  - `pnpm -C autobyteus-web exec vitest --run stores/__tests__/runHistoryStore.spec.ts`
  - `pnpm -C autobyteus-web exec vitest --run components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts`
- Integration tests:
  - N/A.
