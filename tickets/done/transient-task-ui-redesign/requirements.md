# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready

## Goal / Problem Statement

The current workspace UI represents transient task agents and task agent teams as additional entries in the left worktree/navigation area. When these transient runs appear, users can see duplicate-looking agents or teams with the same name as stable project/catalog entries; when the work completes, those transient entries disappear. The workspace event/monitor area also surfaces task status in the middle area, which makes the main workspace feel noisy and ambiguous.

The requested change is to move transient task-agent/task-team visibility and task status out of the left worktree and middle event area into the existing right-side **Team** tab. The Team tab should expose an **Active Tasks** section where users can see active delegated tasks, inspect simple task details, and click the associated task agent, task team, or task-team member to focus and communicate with it. Active task rows must not show only the role/team name; they should include a task/run identifier so multiple delegated executions to the same target remain distinguishable.

## Investigation Findings

Code/UI investigation findings:
- The left panel hosts `WorkspaceAgentRunsTreePanel`, whose team/member rows are ultimately built from live `AgentTeamContext.memberTree` through `buildTeamRowsFromContext`.
- Task-agent and task-team stream projections intentionally insert transient nodes into that live `memberTree` (`isTaskAgentInstance`, `isTaskTeamInstance`, `isTaskTeamChildProjection`) so routing, focus, conversations, statuses, and approvals can work.
- Because left workspace history consumes the same live tree without a stable-navigation projection boundary, transient task agents/teams render as left-tree rows and disappear after cleanup.
- The center team workspace renders `TeamActiveTaskExecutionsBar` above the event monitor, so active task status competes with the selected conversation/event surface.
- The right panel already has a `teamMembers` tab labeled **Team** and a `progress` tab labeled **Activity**. Team currently owns team messages, while Activity owns focused-run To-Dos/tool activity.
- Product direction is now to keep Activity as focused-run activity and add Active Tasks inside the Team tab, rather than adding a new top-level tab or moving task structure into Activity.
- The task delegation tool input has a required `description`; the backend `TaskDelegationRecord` stores `description`, `taskLabel`, `status`, `referenceFiles`, and result/review metadata. Current task delegation websocket events expose task ID/label/status/target/execution identity, but the investigated publisher does not currently include the delegated task `description` in the activation/status payloads.
- Current frontend task-agent/task-team display-name builders already append a disambiguator after the logical role/team name, using task ID first and falling back to instance/run ID. The right-side Active Tasks UI should preserve this principle rather than showing only the target name.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change / UX Restructure
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Needed
- Evidence basis: Code inspection shows transient task projections are inserted into `AgentTeamContext.memberTree` for task-run routing and then reused by left workspace history rendering; center task cards are rendered by `TeamActiveTaskExecutionsBar`; task delegation records already contain a simple delegated-task description but current task projection does not expose a dedicated task-details surface.
- Requirement or scope impact: Requirements must separate stable workspace/history navigation from task-run projection. Clickability for transient runs must be preserved through the right-side Team tab Active Tasks surface. Task details should be intentionally simple: delegated task description plus task status, not a detailed current-phase/task-team execution dashboard.

## Recommendations

Recommended direction:
- Keep left navigation stable: workspaces, root agent runs, root team runs, and stable history/roster only.
- Add an expandable **Active Tasks** section to the right-side **Team** tab.
- Show transient task agents and task teams in Team → Active Tasks with clear task-run/transient treatment.
- For each active task, show simple task details:
  - delegated task description from `delegate_task.description` / `TaskDelegationRecord.description`;
  - task status;
  - task ID/label;
  - task target type/name;
  - a compact run-ID disambiguator when task ID alone is insufficient, labeled explicitly as Agent run ID or Agent team run ID;
  - pending approval indicator/actions when relevant.
- Do **not** require complex task-team phase display, current active member, internal workflow timeline, or detailed task-team execution analysis for this iteration.
- Task-team rows may expand to show their members for focus/chat targeting, but the task detail itself remains the delegated task description, status, task ID, and target.
- Remove the center active task execution bar once the Team tab Active Tasks section covers the same focus and approval functions.
- Preserve focus/click behavior by reusing existing focus routing such as `focusMemberAndEnsureHydrated(teamRunId, memberRouteKey)` and concrete task-agent/task-team run IDs.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium

## In-Scope Use Cases

- UC-001: A task agent starts and is visible without creating a duplicate-looking stable left-nav entry.
- UC-002: A task agent team starts and its members are visible without creating duplicate-looking stable team/member entries in the left-nav worktree.
- UC-003: A user can click a transient task agent/team/member from Team → Active Tasks to focus its messages/events and communicate with it while it is running.
- UC-004: A task completes and the transient activity resolves/disappears or archives without destabilizing stable navigation.
- UC-005: Task status is visible in Team → Active Tasks instead of adding noise to the center workspace event monitor.
- UC-006: A user can expand or inspect an active task item and see the delegated task description, current task status, task ID, and target.
- UC-007: Multiple active tasks delegated to the same agent/team target are distinguishable by task ID or run ID in the Team tab.

## Detailed Target UI Contract

### Global Information Architecture

- Left panel / worktree:
  - Owns stable navigation only: workspaces, root agent runs, root team runs, and stable non-task team/member history where applicable.
  - Must not render task-agent, task-team, or task-team child projection rows whose only purpose is an active delegated task execution.
  - Must not visually change just because a delegated task starts or completes.
- Center workspace:
  - Owns the currently focused conversation/event monitor.
  - Must not show a persistent active-task strip/list above the team event monitor once Team → Active Tasks has equivalent focus and approval behavior.
  - When a user focuses a task agent or task-team member from the Team tab, the center switches to that selected target’s conversation/event stream.
- Right panel → Team tab:
  - Owns team messages plus delegated task structure.
  - Contains two top-level expandable rows/sections in this order:
    1. `Messages`
    2. `Active Tasks`
  - `Messages` keeps current team-message behavior.
  - `Active Tasks` is the only primary surface for active delegated task agents/task teams.
- Right panel → Activity tab:
  - Owns focused-run To-Dos, tool activity, and event/activity feed.
  - Does not own the list of active task agents/task teams.

### Team Tab Top-Level Layout

```text
Team

Messages                  <message count> Messages
  ...existing team message panel...

Active Tasks              <active count> Active
  ...active task list...
```

- If there are no active tasks, show the row with `0 Active` and an empty state such as `No active delegated tasks`.
- If there are active tasks, the `Active Tasks` row shows a count and can expand/collapse.
- The Team tab should not require a new top-level right-side tab.

### Active Task Row: Task Agent

Collapsed row shape:

```text
▸ Task Agent  <target display name> · <short task ID>
              <status badge>  <approval badge if needed>
```

Expanded row shape:

```text
▾ Task Agent  implementation_engineer · task_abc123
    Task: <delegated task description, 1-3 line clamp with expand/copy if long>
    Status: <task status>
    Target: member implementation_engineer
    Task ID: task_abc123
    Agent run ID: agent_run_xyz789
    <pending approval controls, if any>
    [Open conversation]
```

Rules:
- Primary label uses friendly target display name plus short task ID.
- Full task ID must be available in details or tooltip.
- Agent run ID must be labeled exactly `Agent run ID`, not `Runtime`.
- Row click focuses the task agent conversation/event stream in the center.
- Chevron/expand affordance opens task details without changing focus if feasible; if row-click and expand conflict, provide separate click targets.

### Active Task Row: Task Team

Collapsed row shape:

```text
▸ Task Team   <target team display name> · <short task ID>
              <status badge>
```

Expanded row shape:

```text
▾ Task Team   software_engineering_team · task_def456
    Task: <delegated task description, 1-3 line clamp with expand/copy if long>
    Status: <task status>
    Target: team software_engineering_team
    Task ID: task_def456
    Agent team run ID: team_run_qwe456

    Members
      solution_designer
      implementation_engineer
      code_reviewer
```

Rules:
- Primary label uses friendly target team display name plus short task ID.
- Full task ID must be available in details or tooltip.
- Agent team run ID must be labeled exactly `Agent team run ID`, not `Runtime`.
- Row click focuses the task-team root/overview when a focusable root exists.
- Expanding shows simple task details and the task-team members.
- Members are focus/chat targets only; they do not need separate task-detail panels.
- Do not show current phase, current active internal member, internal timeline, or workflow analytics.

### Active Task Details Field Contract

Every active task item must expose the following fields when available:

| Field | Required? | Source / Meaning | UI Label |
| --- | --- | --- | --- |
| Task description | Yes | `delegate_task.description` / `TaskDelegationRecord.description` | `Task` |
| Task status | Yes | task delegation status/projection status | `Status` |
| Target kind/name | Yes | delegated target member/team | `Target` |
| Task ID | Yes | `taskId` / `task_id` | `Task ID` |
| Task-agent run ID | Task-agent only | `taskAgentRunId` / `task_agent_run_id` | `Agent run ID` |
| Task-team run ID | Task-team only | `taskTeamRunId` / `task_team_run_id` | `Agent team run ID` |
| Pending approvals | If present | pending tool approval segments for task agent | Approval badge/buttons |

Field rules:
- The UI must not invent a task description from display name, run ID, or status.
- If description is temporarily unavailable because an older event lacks it, show a clear placeholder such as `Task description unavailable` and keep task ID/status/target visible; implementation should still add the DTO/projection support needed for normal availability.
- Long task descriptions should be readable but compact: show a clamped summary with an expansion affordance or tooltip rather than forcing a very tall row by default.

### Selection, Focus, and Expansion Rules

- Active task row click:
  - Task agent row → focus task-agent route key/run in center.
  - Task team row → focus task-team root/overview if supported by existing routing.
  - Task-team member row → focus the scoped member route key in center.
- Expand/collapse click:
  - Expands task details in the Team tab.
  - Should not unexpectedly change center focus if the user only clicks the chevron.
- Focused state:
  - The row corresponding to `teamContext.focusedMemberRouteKey` should show a selected/focused visual state.
  - Focus state and expanded state are independent.
- Composer targeting:
  - After focusing a task agent/member, existing center composer behavior should target that focused task participant.

### Completion / Disappearance Rules

- Task completion must not change the left worktree.
- In Team → Active Tasks, completed tasks may either:
  - disappear from `Active Tasks` after the existing cleanup lifecycle; or
  - move briefly to a collapsed `Recent` subsection if feasible.
- If a `Recent` subsection is implemented, it must be clearly secondary and must not become long-term history/analytics.
- The first implementation may keep existing cleanup semantics as long as disappearance is isolated to the Team tab and not the left navigation.

### Empty, Loading, and Error States

- No active tasks:
  - `Active Tasks    0 Active`
  - empty text: `No active delegated tasks`.
- Description missing:
  - Show task ID/status/target and `Task description unavailable`.
  - Do not hide the whole task row.
- Unknown status:
  - Show a neutral status badge such as `Unknown` only if the status cannot be normalized.
- Missing run ID:
  - Keep task ID as the primary disambiguator; omit the run-ID field rather than showing misleading placeholder text.

### Terminology Rules

- Use `Task Agent`, `Task Team`, `Task`, `Status`, `Target`, `Task ID`, `Agent run ID`, and `Agent team run ID`.
- Do not use `Runtime` as a user-facing label.
- Do not call task-team members “phases”.
- Do not use only the role/team name as the visible row label.

## Canonical User Journeys

### Journey 1: Task Agent Starts

1. A team member delegates a task to `implementation_engineer`.
2. The left worktree remains unchanged; no duplicate `implementation_engineer` row appears there.
3. The Team tab `Active Tasks` count increments.
4. The user expands `Active Tasks` and sees:
   - `Task Agent implementation_engineer · <task ID>`;
   - status;
   - task description;
   - target;
   - task ID;
   - Agent run ID.
5. The user clicks the task-agent row or `Open conversation`.
6. The center focuses the task agent conversation/event stream and the composer targets that task agent.

### Journey 2: Task Team Starts

1. A task is delegated to `software_engineering_team`.
2. The left worktree remains unchanged; no duplicate team/member subtree appears there.
3. The Team tab `Active Tasks` count increments.
4. The user expands the task-team row and sees:
   - `Task Team software_engineering_team · <task ID>`;
   - status;
   - task description;
   - target;
   - task ID;
   - Agent team run ID;
   - members list.
5. The user clicks a member such as `implementation_engineer` under that task team.
6. The center focuses that scoped task-team member and allows communication with that member.

### Journey 3: User Inspects Details Without Changing Focus

1. The user is watching `solution_designer` in the center.
2. The user opens the Team tab and clicks the chevron on a task row.
3. The task row expands and shows simple task details.
4. The center remains focused on `solution_designer` unless the user clicks the row body/member/open-conversation target.

### Journey 4: Multiple Tasks Share The Same Target

1. Two tasks are delegated to `implementation_engineer`.
2. Team → Active Tasks shows two separate rows:
   - `implementation_engineer · task_abc123`
   - `implementation_engineer · task_def456`
3. Expanding each row shows its own task description, status, Task ID, and Agent run ID.
4. Clicking each row focuses the correct task-agent run.

### Journey 5: Pending Approval Appears

1. A task agent requests tool approval.
2. The corresponding active task row shows an approval badge.
3. Expanding the row shows the approval control with approve/deny actions.
4. Approving or denying uses the same target identity semantics as the current active task execution bar.
5. The row remains identifiable by task ID and Agent run ID after the approval action.

### Journey 6: Task Completes

1. A task reaches accepted/settled/offline state.
2. The left worktree remains unchanged.
3. The Team tab updates the task row according to the chosen cleanup behavior:
   - remove from Active Tasks after cleanup; or
   - move briefly to Recent if implemented.
4. The center focus falls back using existing task-execution focus fallback rules if the completed task was focused.

### Journey 7: User Uses Activity Tab After Focusing A Task

1. The user focuses a task agent/member from Team → Active Tasks.
2. The center shows that focused task participant.
3. The Activity tab shows To-Dos/tool/activity feed for the focused participant.
4. The Activity tab does not need to repeat the Active Tasks list.

## Out of Scope

- Changing backend task execution semantics unless required to expose correct UI identity/status/description data.
- Redesigning stable agent/team catalog management.
- Long-term task history or analytics beyond what is needed for current transient visibility.
- A complex task-team execution dashboard with current phase, active internal member, internal timeline, or detailed workflow analytics.
- Mobile-specific redesign unless the same components are reused.

## Functional Requirements

- REQ-001: The left worktree/navigation must represent stable workspace/project entities and must not add separate duplicate-looking entries for transient task-run agents or task-run teams.
- REQ-002: The right-side Team tab must include an Active Tasks section that represents active transient task agents, task teams, task team child/member projections, pending approvals, and task status with clear task-run/transient identity.
- REQ-003: Users must be able to click/focus a transient task agent, task team, or task-team member from Team → Active Tasks to inspect and communicate with the relevant run in the center workspace.
- REQ-004: Completion of a transient task must not cause confusing left-nav disappearance; any disappearance/archive behavior must be isolated to the Team tab Active Tasks surface.
- REQ-005: The UI must distinguish stable definition identity from task-run instance identity when names overlap.
- REQ-006: Each active task item must expose simple task details consisting of the delegated task description, task status, task ID, and target at minimum.
- REQ-007: Task-team task details must remain simple and task-level; the UI must not require or imply detailed current phase/current internal member tracking for the first iteration.
- REQ-008: Active task-agent/task-team rows must include a disambiguating identifier after or near the friendly role/team name, preferring task ID and falling back to Agent run ID or Agent team run ID when needed.

## Acceptance Criteria

- AC-001: Starting a task agent with the same display name as a stable agent does not create two indistinguishable entries in the left worktree/navigation.
- AC-002: Starting a task team with members whose names match stable agents does not create duplicate-looking team/member entries in the left worktree/navigation.
- AC-003: The right-side Team tab displays an Active Tasks section containing active transient task agents/task teams with task-run status and clear transient/running visual treatment.
- AC-004: Clicking a transient task agent/team/member in Team → Active Tasks focuses its associated messages/events/conversation without requiring a left-nav duplicate entry.
- AC-005: When a transient task completes, the stable left navigation does not change; only the Team tab Active Tasks representation updates, collapses, archives, or disappears per the final design.
- AC-006: Task status is no longer primarily surfaced as noisy standalone items in the middle workspace event area; central area output remains focused on selected conversation/workspace content.
- AC-007: Expanding or inspecting an active task item shows the delegated task description, current task status, task ID, and target.
- AC-008: Task-team active task details do not show unnecessary phase/current-member/timeline complexity; members remain available only as focus/chat targets under the task-team item.
- AC-009: If two active tasks target the same logical agent or team, their Team tab rows remain distinguishable by task ID, Agent run ID, or Agent team run ID.

## Constraints / Dependencies

- Must align with existing frontend/back-end event models for task agents, agent teams, and team activity.
- Must preserve user ability to inspect active task participants, task status, and pending approvals.
- Must avoid introducing a second authoritative representation of the same transient task-run state.
- May require a small backend/websocket DTO extension so `TaskDelegationRecord.description` is available to the right-side Active Tasks UI without scraping conversation/tool-call text.
- Must preserve or replace the current display-name disambiguation behavior that appends task ID/fallback run ID after the logical role/team name.

## Assumptions

- The right-side Team tab can host an additional expandable Active Tasks row/section alongside Messages.
- Existing task-run events already contain enough identity and lifecycle data to distinguish stable definitions from transient run instances.
- The delegated task description should be sourced from the existing `delegate_task.description` / `TaskDelegationRecord.description` rather than invented from task-run status labels.
- The user expects task ID and target to be visible as part of the simple task details, and expects active task-agent/task-team rows to carry a visible identifier beyond the shared role/team name.
- The goal is UX simplification rather than removal of task visibility.

## Risks / Open Questions

- Exact data contract: current task delegation websocket events include task ID/label/status/target/execution identity, but the delegated task description may need to be added to activation/status payloads or stored in a frontend task projection when the delegation tool call is observed.
- Need choose final visual formatting for disambiguation: recommended pattern is `<target display name> · <task ID short>` with full task ID plus Agent run ID or Agent team run ID in tooltip or secondary text.
- Completed task retention: should completed tasks disappear immediately from Active Tasks, remain briefly as Recent, or remain until team-run selection changes? Recommendation: brief/collapsed Recent section if feasible.
- Implementation must preserve pending tool approval actions currently available in `TeamActiveTaskExecutionsBar`.
- Need ensure stable left history still allows selecting historical team members where appropriate, while excluding only transient task-agent/team projections from live navigation rows.

## Requirement-To-Use-Case Coverage

| Requirement | Use Cases |
| --- | --- |
| REQ-001 | UC-001, UC-002, UC-004 |
| REQ-002 | UC-001, UC-002, UC-003, UC-005 |
| REQ-003 | UC-003 |
| REQ-004 | UC-004 |
| REQ-005 | UC-001, UC-002, UC-003 |
| REQ-006 | UC-006 |
| REQ-007 | UC-002, UC-003, UC-006 |
| REQ-008 | UC-001, UC-002, UC-007 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion | Scenario Intent |
| --- | --- |
| AC-001 | Verify stable-vs-transient agent name collision no longer duplicates left-nav entries. |
| AC-002 | Verify team/member transient task-run participants do not duplicate stable team/member entries in left nav. |
| AC-003 | Verify Team tab Active Tasks owns transient task-run visibility. |
| AC-004 | Verify click/focus behavior is preserved after moving transient entries. |
| AC-005 | Verify completion lifecycle no longer destabilizes stable navigation. |
| AC-006 | Verify center event area is cleaner and no longer primary task-status list. |
| AC-007 | Verify task description/status/task ID/target are visible without opening left-nav duplicates. |
| AC-008 | Verify task-team details stay intentionally simple. |
| AC-009 | Verify same-target concurrent task executions remain distinguishable. |

## Approval Status

Product direction refined with user: use the Team tab Active Tasks section, keep task details simple, include task ID/target/run ID disambiguation, and avoid complex task-team phase details. Requirements include detailed target UI and canonical user journeys and are ready for architecture review with the design spec.
