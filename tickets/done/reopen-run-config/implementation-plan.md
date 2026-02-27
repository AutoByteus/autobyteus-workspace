# Implementation Plan

## Scope Classification
- Classification: Small
- Reasoning:
  - UX interaction shift with existing state primitives.
  - No backend/API changes.

## Upstream Artifacts
- Workflow state: `tickets/in-progress/reopen-run-config/workflow-state.md`
- Investigation notes: `tickets/in-progress/reopen-run-config/investigation-notes.md`
- Requirements: `tickets/in-progress/reopen-run-config/requirements.md` (Refined)
- Runtime call stacks: `tickets/in-progress/reopen-run-config/future-state-runtime-call-stack.md` (v2)
- Runtime review: `tickets/in-progress/reopen-run-config/future-state-runtime-call-stack-review.md` (`Go Confirmed`)

## Plan Maturity
- Current Status: Review-Gate-Validated
- Notes: This is re-entry cycle `v2` after user-driven requirement change.

## Solution Sketch (Small Scope Design Basis)
- Extend `WorkspaceHeaderActions` to support explicit `editConfig` event/action in addition to `newAgent`.
- Wire `AgentWorkspaceView` and `TeamWorkspaceView` to handle `editConfig` by setting `workspaceCenterViewStore.showConfig()`.
- Keep row selection handlers chat/event-first (`showChat`) unchanged.
- Remove row-level config buttons from `WorkspaceAgentRunsTreePanel` for both run and team rows.
- Keep explicit round-trip action in config view; rename button text to `Back to event view` for clearer mental model.

## Runtime Call Stack Review Gate Summary
| Round | Review Result | Findings Requiring Persisted Updates | New Use Cases Discovered | Persisted Updates Completed | Classification | Required Re-Entry Path | Round State | Clean Streak After Round |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Pass | No | No | N/A | N/A | N/A | Candidate Go | 1 |
| 2 | Pass | No | No | N/A | N/A | N/A | Go Confirmed | 2 |

## Go / No-Go Decision
- Decision: Go
- Evidence:
  - Final review round: Round 2
  - Clean streak at final round: 2 consecutive clean deep-review rounds
  - Implementation can start: Yes

## Dependency And Sequencing Map
| Order | File/Module | Depends On | Why This Order |
| --- | --- | --- | --- |
| 1 | `autobyteus-web/components/workspace/common/WorkspaceHeaderActions.vue` | N/A | Add shared header contract first. |
| 2 | `autobyteus-web/components/workspace/agent/AgentWorkspaceView.vue` | 1 | Wire selected-agent header action to config mode. |
| 3 | `autobyteus-web/components/workspace/team/TeamWorkspaceView.vue` | 1 | Wire selected-team header action to config mode. |
| 4 | `autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue` | 2,3 | Remove row-level config actions after header path exists. |
| 5 | `autobyteus-web/components/workspace/config/RunConfigPanel.vue` | N/A | Update return CTA copy to `Back to event view`. |
| 6 | `autobyteus-web/components/workspace/agent/__tests__/AgentWorkspaceView.spec.ts` | 2 | Validate header config event switches mode. |
| 7 | `autobyteus-web/components/workspace/team/__tests__/TeamWorkspaceView.spec.ts` | 3 | Validate header config event switches mode for team. |
| 8 | `autobyteus-web/components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts` | 4 | Remove/replace row-cog expectations with absence assertions. |
| 9 | `autobyteus-web/components/workspace/config/__tests__/RunConfigPanel.spec.ts` | 5 | Validate updated back-action wording + behavior. |

## Requirement And Design Traceability
| Requirement | Acceptance Criteria ID(s) | Design Section | Use Case / Call Stack | Planned Task ID(s) | Stage 6 Verification | Stage 7 Scenario ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| R-101 | AC-101 | Solution Sketch #1,#2 | UC-101 | T-001,T-002,T-006 | `AgentWorkspaceView.spec.ts` | AV-101 |
| R-102 | AC-102 | Solution Sketch #1,#3 | UC-102 | T-001,T-003,T-007 | `TeamWorkspaceView.spec.ts` | AV-102 |
| R-103 | AC-103 | Solution Sketch #3 | UC-103 | T-004 | `WorkspaceAgentRunsTreePanel.spec.ts` | AV-103 |
| R-104 | AC-101,AC-102 | Solution Sketch #2,#3 | UC-101,UC-102 | T-002,T-003 | `AgentWorkspaceView.spec.ts`, `TeamWorkspaceView.spec.ts` | AV-101,AV-102 |
| R-105 | AC-104 | Solution Sketch #5 | UC-103 | T-005,T-009 | `RunConfigPanel.spec.ts` | AV-104 |
| R-106 | AC-105 | Solution Sketch #4 | UC-104 | T-004,T-008 | `WorkspaceAgentRunsTreePanel.spec.ts` | AV-105 |

## Tasks
- T-001 Add `editConfig` action/event to `WorkspaceHeaderActions`.
- T-002 Wire agent header action to `workspaceCenterViewStore.showConfig()`.
- T-003 Wire team header action to `workspaceCenterViewStore.showConfig()`.
- T-004 Remove run/team config row buttons from history panel.
- T-005 Update config return CTA text to `Back to event view`.
- T-006 Add agent workspace tests for header config action.
- T-007 Add team workspace tests for header config action.
- T-008 Replace row-cog tests with row-cog absence assertions.
- T-009 Update config panel tests for return CTA copy + mode behavior.

## Test Strategy
- Stage 6:
  - `cd autobyteus-web && pnpm test:nuxt components/workspace/agent/__tests__/AgentWorkspaceView.spec.ts components/workspace/team/__tests__/TeamWorkspaceView.spec.ts components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts components/workspace/config/__tests__/RunConfigPanel.spec.ts --run`
- Stage 7:
  - same suite as scenario harness for mapped AC closure in this frontend-only ticket.

## Code Review Gate Plan (Stage 8)
- Monitor `WorkspaceAgentRunsTreePanel.vue` size risk while confirming this change actually reduces per-row action complexity.
