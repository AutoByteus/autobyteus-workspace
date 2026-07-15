# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-tasks-auto-open/tickets/done/team-tasks-auto-open/requirements-doc.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-tasks-auto-open/tickets/done/team-tasks-auto-open/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-tasks-auto-open/tickets/done/team-tasks-auto-open/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-tasks-auto-open/tickets/done/team-tasks-auto-open/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-tasks-auto-open/tickets/done/team-tasks-auto-open/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-tasks-auto-open/tickets/done/team-tasks-auto-open/code-review-report.md`
- Current Investigation Round: 1
- Trigger: Code-review pass from `code_reviewer` on 2026-06-30 for branch `codex/team-tasks-auto-open`.
- Prior Investigation Reviewed: N/A
- Latest Authoritative Investigation: Round 1

## Current Requirement And Design Basis

The current approved behavior is a frontend UI-state change in `autobyteus-web` with two boundaries:

1. `TeamOverviewPanel` must auto-open the right-side Team tab `Tasks` accordion when the selected team context already has active task entries, when active task entries arrive while mounted, or when a selected run changes to one with active entries. The active-task signal must come from the same `deriveActiveTaskEntries` utility used by `TeamActiveTasksSection`. Manual collapse must remain respected for the unchanged task identity set, but a new/different active task identity reopens `Tasks`. Messages count and focused-member communication props must remain intact.
2. Workspace history must render nested `agent_team` members as a collapsible tree. Nested subteams with children start collapsed, expose a disclosure control with `aria-expanded`, toggle without selecting/opening the row, preserve row-body selection, and expand ancestors for a focused/selected nested member so the selected row remains visible.

The implementation handoff's Legacy / Compatibility Removal Check was reviewed. It reports no compatibility mechanisms, no retained old behavior, and removal of the old `flattenTeamMembers(team)` branch. Code review independently confirmed no feature flags, no dual renderer, no unconditional Messages reset, and no compatibility-only coverage in the changed scope.

## Changed Behavior Summary

| Behavior / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Team tab `Tasks` auto-opens for existing active task entries | Changed | REQ-001, AC-001, design DS-001, implementation handoff `What Changed` | Execute component coverage proving body visible and Messages hidden when active entries are present. |
| Team tab remains Messages-first when no active task entries exist | Preserved / Changed conditionally | REQ-003, AC-002, design `Messages remains default only when no active tasks exist` | Execute no-active default coverage. |
| Team tab opens when active task entries appear while mounted | Added | REQ-001, REQ-005, AC-003, code-review residual risk about realistic projection arrival | Execute component arrival coverage and streaming/projection service coverage for `TASK_DELEGATION_EVENT` creating task projection nodes. |
| Manual collapse is respected for the same task identity; new identity reopens | Added | REQ-004, REQ-005, AC-004 | Execute component coverage. |
| Selected team-run change defaults to Tasks when the new run has active entries | Changed | REQ-003, AC-005 | Existing coverage has no direct selected-run-to-active scenario; add one narrow durable component test before execution. |
| Existing task focus/send workflow remains intact | Preserved | REQ-007, AC-007 | Execute workflow component coverage. |
| Workspace history nested `agent_team` rows default collapsed with disclosure | Changed | REQ-008 through REQ-010, AC-008, AC-009, design DS-002 | Execute Workspace history component coverage. |
| Workspace history disclosure toggles without selection | Added | REQ-011, AC-010, AC-011, design DS-003 | Execute Workspace history component coverage. |
| Workspace history row-body selection and selected nested row visibility remain intact | Preserved / Added | REQ-012, REQ-013, AC-012, AC-013, design DS-004 | Execute Workspace history component coverage and existing composable regression coverage. |
| Active task-team navigator nested collapse | Preserved out of scope | Requirements Out of Scope and design review accepted deferral | No coverage change; record as out of scope residual. |
| Backend task delegation semantics / protocol | Preserved out of scope | Requirements Out of Scope; no backend changes expected | No backend API tests required beyond existing streaming projection boundary coverage. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/workspace/team/__tests__/TeamOverviewPanel.spec.ts` | Team tab parent accordion behavior, Messages props, active-task initial/arrival/manual-collapse scenarios. | REQ-001 through REQ-006; AC-001 through AC-006; design DS-001. | Needs Update | Current tests cover most required active-task policy, but AC-005 selected-run change to another run with active entries lacks a direct durable scenario. | Add one narrow selected-run-to-active test, then execute file. |
| `autobyteus-web/components/workspace/team/__tests__/TeamFocusSendWorkflow.spec.ts` | Cross-component task actor/member focus and message send workflow; task-team summary clicks remain reading-only. | REQ-007, AC-007; implementation handoff says workflow helper was adapted for auto-open. | Still Valid | Code review ran and passed this file; assertions still represent current behavior. | Execute file. |
| `autobyteus-web/components/workspace/team/__tests__/TeamActiveTasksSection.spec.ts` | Controlled child section rendering, empty state, task entries, summary/member focus semantics. | REQ-002, REQ-007; TeamActiveTasksSection remains controlled by parent. | Still Valid | Requirements preserve child behavior except parent auto-open; this suite remains relevant to the task section boundary. | Execute file as supporting durable coverage. |
| `autobyteus-web/services/agentStreaming/__tests__/teamTaskExecutionEventRouter.spec.ts` | `TASK_DELEGATION_EVENT` applies task details and creates/updates task-agent projection node. | Runtime projection source for REQ-001/REQ-002/AC-003; code-review residual asks for realistic projection arrival evidence. | Still Valid | The test exercises the streaming projection boundary that feeds `deriveActiveTaskEntries`. | Execute file. |
| `autobyteus-web/services/agentStreaming/__tests__/TeamStreamingService.spec.ts` scenario `creates the transient task-agent context from a task-delegation event with task-agent identity` | WebSocket message path creates transient task-agent context/node from `TASK_DELEGATION_EVENT`. | REQ-001/AC-003 runtime projection arrival; implementation handoff downstream hint. | Still Valid | Existing service scenario proves a more realistic `onMessage` path than component-level state replacement. | Execute targeted scenario as broader executable validation. |
| `autobyteus-web/components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts` | Workspace history tree UI, team run disclosure, nested subteam default collapse, disclosure toggle/no-selection, row-body selection, ancestor reveal. | REQ-008 through REQ-013; AC-008 through AC-013; design DS-002/DS-003/DS-004. | Still Valid | Implementation added/updated these durable UI scenarios before code review; code review passed them. | Execute file. |
| `autobyteus-web/components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.regressions.spec.ts` | Existing Workspace history reveal/selection regressions. | RISK-003; preserve selected team reveal behavior. | Still Valid | Existing regression coverage remains valid under new nested member expansion state. | Execute file. |
| `autobyteus-web/composables/__tests__/useWorkspaceHistoryTreeState.spec.ts` | Workspace/agent/team-definition/team-run expansion state and reveal behavior. | DS-002/DS-004 ownership and reveal semantics. | Still Valid | New member expansion is primarily covered by component integration; existing composable assertions remain current and should not break. | Execute file. |
| `autobyteus-web/composables/__tests__/useWorkspaceHistorySelectionActions.spec.ts` | Focused nested member route-key resolution for team selection. | REQ-012/REQ-013; DS-004. | Still Valid | Existing tests prove exact nested route-key selection, a dependency of ancestor reveal behavior. | Execute file. |
| `autobyteus-web/stores/__tests__/runHistoryTeamRows.spec.ts` | Live team-history rows preserve nested team labels and filter transient task projection nodes out of history rows. | REQ-008 history read model shape; REQ-002 active tasks are not unrelated historical/completed rows. | Still Valid | Supports boundary separation between active task projections and historical member rows. | Execute file as supporting coverage if final command time is reasonable. |
| Repository browser E2E harness (Playwright/Cypress) | Search for stable browser E2E suite/config in the worktree. | User-facing UI behavior. | Out Of Scope | No Playwright/Cypress app-level E2E harness was found in the repository scan. Nuxt component tests are the durable executable UI boundary available here. | No durable browser E2E added. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| N/A | N/A | No stale or obsolete repository-resident coverage was found during this investigation. | N/A | N/A | N/A |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| COV-AT-005 | Selected team run changes from a no-active-task run to another selected team run with active task entries; `Tasks` opens for the new run. | REQ-003 and AC-005 explicitly require selected-run reset logic to respect active task presence. | `autobyteus-web/components/workspace/team/__tests__/TeamOverviewPanel.spec.ts` | Existing component tests cover initial active tasks and mounted active-task arrival, but not the selected-run-to-active reset path directly. This is a narrow durable UI-state scenario and should live with the existing parent accordion tests. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| N/A | N/A | N/A | N/A | No existing valid test requires expectation changes beyond the added scenario above. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| N/A | N/A | N/A | No durable coverage removal planned. |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| TEMP-INV-001 | Repository scan for Playwright/Cypress/e2e harness and existing relevant tests. | Determines whether browser E2E coverage exists and which durable test surfaces are available. | Discovery-only inventory, not product behavior coverage. |
| TEMP-RT-001 | Targeted execution of existing `TeamStreamingService.spec.ts` scenario for `TASK_DELEGATION_EVENT` WebSocket message path. | Provides runtime-like projection arrival evidence without standing up a full backend/server team run. | The durable scenario already exists; the targeted command is execution evidence, not new scaffolding. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Full live backend team run in a real browser session receiving a real delegated task over WebSocket | No stable app-level E2E harness or seeded live backend fixture was found for this local worktree; backend/protocol semantics are out of scope. Existing streaming service tests emulate the WebSocket message path and component tests prove UI reaction. | Medium-low: the component and service boundaries are covered separately, but not as one live browser-to-backend scenario. | None for this task; add an app-level E2E harness only as a separate project capability. |
| Active task-team navigator nested collapse parity | Requirements and design review explicitly keep this out of scope. | Accepted product residual if users later expect nested collapse inside active task-team navigator. | No escalation; track only if product expands scope. |
| Broad project TypeScript gate `pnpm --dir autobyteus-web exec tsc -p tsconfig.json --noEmit` | Implementation handoff and code review record this as a known non-clean project gate with broad existing/test declaration issues. | Low for changed scope because focused tests, web boundary guard, and changed-file review passed. | Record limitation in execution report; do not use as pass/fail gate for this task. |

## Ambiguities Or Reroute Triggers

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| N/A | N/A | No requirement/design ambiguity or implementation defect found during coverage investigation. | N/A |

## Execution Plan

1. Add durable coverage COV-AT-005 to `autobyteus-web/components/workspace/team/__tests__/TeamOverviewPanel.spec.ts`.
2. Run focused Team tab UI coverage:
   - `pnpm --dir autobyteus-web test:nuxt --run components/workspace/team/__tests__/TeamOverviewPanel.spec.ts components/workspace/team/__tests__/TeamFocusSendWorkflow.spec.ts components/workspace/team/__tests__/TeamActiveTasksSection.spec.ts`
3. Run Workspace history UI and composable coverage:
   - `pnpm --dir autobyteus-web test:nuxt --run components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.regressions.spec.ts composables/__tests__/useWorkspaceHistorySelectionActions.spec.ts composables/__tests__/useWorkspaceHistoryTreeState.spec.ts stores/__tests__/runHistoryTeamRows.spec.ts`
4. Run runtime projection boundary coverage:
   - `pnpm --dir autobyteus-web test:nuxt --run services/agentStreaming/__tests__/teamTaskExecutionEventRouter.spec.ts`
   - `pnpm --dir autobyteus-web test:nuxt --run services/agentStreaming/__tests__/TeamStreamingService.spec.ts -t "creates the transient task-agent context from a task-delegation event with task-agent identity"`
5. Run unchanged repository hygiene checks:
   - `pnpm --dir autobyteus-web guard:web-boundary`
   - `git diff --check`
6. Write the canonical execution coverage report. Because repository-resident durable coverage is added after the initial code review, return the cumulative package to `code_reviewer` rather than `delivery_engineer`.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: Add one missing durable component-test scenario for AC-005 before final execution. No stale coverage removal or implementation reroute is required.
