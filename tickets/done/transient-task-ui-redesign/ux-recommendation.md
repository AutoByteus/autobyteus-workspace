# UX Recommendation: Transient Task Agents / Teams

## Recommendation

Move transient task-agent and task-team visibility out of the left workspace tree and out of the center team workspace bar. The right-side **Team** tab should own these transient entities through an expandable **Active Tasks** section.

## Why

The current implementation uses the live `AgentTeamContext.memberTree` for two different purposes:

1. Execution routing/focus: transient task agents and task teams must exist as concrete task-run identities so users can inspect messages, approve tools, and target follow-up actions.
2. Stable navigation/history: the left workspace tree should help users find workspaces, root runs, teams, and persisted history.

Because the same live tree feeds stable left navigation, transient task projections appear as duplicate-looking agents/teams and then disappear after cleanup. That is a surface ownership problem, not just a styling problem.

## Proposed Information Architecture

- Left panel: stable navigation only.
  - Workspaces.
  - Root agent runs.
  - Root team runs.
  - Stable team roster/history if needed, but no transient task-agent/team task-run projections.
- Center workspace: selected content only.
  - Focused member/task conversation or event monitor.
  - Minimal header/status for the selected focus.
  - No horizontal active-task card strip in the main event area.
- Right panel → Team tab: team structure and active delegation.
  - Messages.
  - Active Tasks.
  - Task agents.
  - Task teams and their members as focus/chat targets.
  - Simple delegated task details and task status.
  - Pending approvals.
- Right panel → Activity tab: detailed activity for the currently focused item.
  - To-Dos.
  - Tool activity.
  - Event/activity feed for the focused run.

## Best UI Shape

Preferred: add an expandable **Active Tasks** row/section inside the existing right-side **Team** tab.

Example:

```text
Team

Messages                  0 Messages

Active Tasks              2 Running
  ▾ Task Agent: implementation_engineer · task_abc123
      Target: member implementation_engineer
      Task ID: task_abc123
      Task: Implement the transient task UI cleanup.
      Status: Active
      Agent run ID: agent_run_xyz789
      [Open conversation]

  ▾ Task Team: software_engineering_team · task_def456
      Target: team software_engineering_team
      Task ID: task_def456
      Task: Review the UI design and implementation.
      Status: Awaiting review
      Agent team run ID: team_run_qwe456
      Members
        solution_designer
        implementation_engineer
        code_reviewer
```

Interaction rules:
- Clicking a task-agent row focuses that task-agent conversation/event stream in the center.
- Clicking a task-team row focuses the task-team root/overview.
- Clicking a task-team member focuses that member inside the task-team execution.
- Expanding a task row shows simple task details.

Task details should stay intentionally simple:
- delegated task description;
- task status;
- task ID/label;
- target kind/name;
- compact run ID when useful for disambiguation;
- pending approval indicator/actions when relevant.

Do not require current phase, current active internal member, internal workflow timeline, or detailed task-team analytics for this iteration. Do require visible disambiguation: the row label should be friendly but not ambiguous, preferably `<target display name> · <task ID short>`, with full task ID and agent run ID or agent team run ID available in details/tooltip/secondary text.

## Implementation Direction

1. Keep frontend transient projections in `AgentTeamContext.memberTree` for routing/focus only.
2. Change left workspace-history projection so it filters out `isTaskAgentInstance`, `isTaskTeamInstance`, and `isTaskTeamChildProjection` rows.
3. Rehost the active-task card/list concern from `TeamActiveTaskExecutionsBar` into a new or extended Team tab Active Tasks section.
4. Remove the center rendering of `TeamActiveTaskExecutionsBar` from `TeamWorkspaceView` after parity is available in Team tab.
5. Preserve click behavior through existing team focus routing, including concrete task run IDs and task-team scoped member route keys.
6. Expose/store delegated task description for the Active Tasks UI. Prefer adding `TaskDelegationRecord.description` to relevant task-delegation websocket payload/projection data instead of scraping conversation text.
7. Preserve current disambiguation behavior: current task projection display names append task ID/fallback run ID after the logical role/team name; the new Team tab UI should keep that concept.
8. Optional but recommended: keep recently completed task cards in the right panel briefly or in a collapsed Recent section so task completion does not feel like a sudden disappearance.

## Acceptance Notes

A user should never see two indistinguishable entries with the same agent/team name in the left workspace tree just because a transient task is running. The user should still be able to expand the transient task-run item in the Team tab to see the delegated task description/status/task ID/target and click the task-run item or member to focus its conversation in the center. Multiple tasks with the same target name must remain distinguishable by task ID or run ID.
