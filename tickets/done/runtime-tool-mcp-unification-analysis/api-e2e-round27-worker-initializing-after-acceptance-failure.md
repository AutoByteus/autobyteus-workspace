# API/E2E Round 15 Failure: Task-only Logical Worker Remains Focusable As `Initializing` After Explicit `accept_task`

## Classification

- Validation round: 15
- Trigger: Round 27 code-review pass for explicit-intent task-delegation API (`delegate_tasks`, `mark_task_completed`, `mark_task_failed`, `accept_task`) replacing the model-facing `update_task_status` interface.
- Classification: **Local Fix to `implementation_engineer`**
- Reason: Requirements/design already define the parent/child model. The concrete task-agent child may disappear after accepted settlement and the stable logical parent may remain as roster/topology, but a task-delegation-only logical worker must not be presented as the completed task-agent execution participant or focused as an active execution target/status after settlement. Current implementation still lets the browser UI focus/display the logical `worker` as `Initializing` after `accept_task` succeeds.

## Summary

Round 15 API/E2E proved the new explicit model-facing tools work in the live/API path, but browser validation found a blocking frontend/status-projection regression:

1. AutoByteus/LMStudio Qwen coordinator successfully called `delegate_tasks`.
2. Codex `gpt-5.5` task-agent worker successfully called selector-free `mark_task_completed` with only `message` and `reference_files`.
3. The framework delivered an awaiting-acceptance task notification to the coordinator.
4. The coordinator successfully called `accept_task` for `task_0001`.
5. A fresh post-settlement websocket snapshot showed no active task-agent child and no status payload for the task-agent run.
6. However, the browser UI still shows/focuses a logical `worker` row as `worker • Initializing` after acceptance/settlement.

This is the same user-visible class as the earlier Round 17 failure: the active execution UI can still make the stable logical worker look like a live/stuck execution entity after the concrete task-agent is accepted and removed.

## Test Environment

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis`
- Backend: `http://localhost:8000`
- Frontend: `http://localhost:3000`
- Temporary validation root: `/tmp/autobyteus-explicit-tools-browser-20260602-064026`
- Session metadata: `/tmp/autobyteus-explicit-tools-browser-20260602-064026/session.env`
- Seed data: `/tmp/autobyteus-explicit-tools-browser-20260602-064026/team-seed-round27-explicit-tools.json`
- Websocket event log: `/tmp/autobyteus-explicit-tools-browser-20260602-064026/round27-browser-ws-events.json`
- Browser validation summary: `/tmp/autobyteus-explicit-tools-browser-20260602-064026/round27-browser-validation-summary.json`
- Post-settlement fresh snapshot: `/tmp/autobyteus-explicit-tools-browser-20260602-064026/post-settlement-snapshot.json`

Seeded runtime details:

- Team definition: `round27-browser-explicit-tools-e4e9f405`
- Team run: `team_round27-browser-explicit-tools-e4e9f405_a3d4182e`
- Coordinator runtime/model: AutoByteus / `mlx-qwen3.5-35b-a3b-claude-4.6-opus-reasoning-distilled:lmstudio@127.0.0.1:1234`
- Worker runtime/model: Codex / `gpt-5.5`
- Task-agent run: `team_round27-browser-explicit-tools-e4e9f405_a3d4182e__worker__task_0001`
- Completion token: `BROWSER_EXPLICIT_TOOLS_DONE_e4e9f405`

## Passing Explicit-Tool Evidence

From `/tmp/autobyteus-explicit-tools-browser-20260602-064026/round27-browser-ws-events.json`:

- `TOOL_EXECUTION_SUCCEEDED` for coordinator `delegate_tasks` at event index `381`.
- `TASK_PLAN_EVENT` `TASK_DELEGATION_ACTIVATED` at event index `378`, including `taskAgentInstance.taskAgentRunId = team_round27-browser-explicit-tools-e4e9f405_a3d4182e__worker__task_0001`.
- `TOOL_EXECUTION_SUCCEEDED` for worker `mark_task_completed` at event index `623` with arguments:

```json
{
  "message": "BROWSER_EXPLICIT_TOOLS_DONE_e4e9f405",
  "reference_files": []
}
```

- `TASK_PLAN_EVENT` `TASK_DELEGATION_TERMINAL_STATUS` at event index `621`, `status: "completed"`, with `message: "BROWSER_EXPLICIT_TOOLS_DONE_e4e9f405"`.
- `SYSTEM_TASK_NOTIFICATION` to coordinator at event index `653` instructing acceptance with `accept_task` and `task_id="task_0001"`.
- `TASK_PLAN_EVENT` `TASK_DELEGATION_STATUS_UPDATED` at event index `784`, `status: "accepted"`.
- `TOOL_EXECUTION_SUCCEEDED` for coordinator `accept_task` at event index `800` with result:

```json
{
  "status": "accepted",
  "terminal": true,
  "message": null,
  "reference_files_count": 0,
  "settlement_requested": true
}
```

No `update_task_status` text was present in the Round 15 browser event payloads, and no task-delegation event used model-facing `in_progress`.

## Browser/UI Failure Evidence

### While active / awaiting acceptance

The browser correctly showed a concrete task-agent child while active:

- `ACTIVE TASK AGENTS`
- `worker · task_0001`
- concrete run id `team_round27-browser-explicit-tools-e4e9f405_a3d4182e__worker__task_0001`

Screenshot:

- `/Users/normy/.autobyteus/browser-artifacts/f6088b-1780375923916.png`

### After `accept_task`

The task-agent child disappeared, but the browser still showed/focused the logical worker as an active execution row/status:

- Header: `worker • Initializing`
- Left active/team tree: clickable selected `W worker`
- Activity side panel no longer shows the active task-agent child; user sees a stuck-looking worker instead of a clean post-settlement active-execution focus.

Screenshots:

- API/E2E post-settlement screenshot: `/Users/normy/.autobyteus/browser-artifacts/f6088b-1780375969298.png`
- User-provided screenshot: `/Users/normy/.autobyteus/server-data/memory/agent_teams/team_software-engineering-team_36cd04cf/api_e2e_engineer_7a52be060fdd9214/context_files/ctx_a70dda770298__image.png`

### Fresh post-settlement backend/websocket snapshot

A fresh websocket snapshot after settlement showed no active task-agent child/status for the task-agent run:

```json
{
  "teamRunId": "team_round27-browser-explicit-tools-e4e9f405_a3d4182e",
  "taskAgentRunId": "team_round27-browser-explicit-tools-e4e9f405_a3d4182e__worker__task_0001",
  "count": 4,
  "hasTaskAgentStatusMessage": false,
  "taskAgentMessages": [],
  "agentStatuses": [
    { "status": "idle", "agent_name": "coordinator", "member_route_key": "coordinator" },
    { "status": "offline", "agent_name": "worker", "member_route_key": "worker" }
  ],
  "teamStatuses": [
    { "status": "idle", "source_path": [] }
  ]
}
```

This confirms the backend/post-settlement snapshot is clean; the observed browser problem is a live frontend/status-projection/focus issue.

## Implementation Clues

Two implementation observations appear relevant:

1. The live websocket stream emitted an early `AGENT_STATUS` for the task-agent run without task-agent identity fields:

```json
{
  "status": "initializing",
  "can_interrupt": false,
  "agent_id": "team_round27-browser-explicit-tools-e4e9f405_a3d4182e__worker__task_0001",
  "agent_name": "worker",
  "member_route_key": "worker",
  "member_path": ["worker"],
  "source_path": ["worker"],
  "source_route_key": "worker"
}
```

This was followed by identity-bearing task-agent status events. The identity-less event can be misapplied to the logical `worker` context and leave it at `Initializing`.

2. Current `autobyteus-web/utils/teamActiveExecutionMembers.ts` makes every node active:

```ts
export const isActiveExecutionMemberNode = (
  _teamContext: AgentTeamContext,
  node: TeamMemberNode,
): boolean => {
  return Boolean(node.memberRouteKey);
};
```

Because `resolveActiveExecutionFocusedMemberRouteKey(...)` then accepts `worker` as an active route, the task-only logical worker can remain selectable/focusable in active execution after the concrete task-agent child settles.

These are implementation clues, not a prescribed fix. The desired behavior should follow the requirements/design:

- Active execution projection: coordinator/root run, normal member conversations that were explicitly activated through direct/user messages, and active task-agent entities.
- Team roster/topology projection: stable logical members such as `worker`, allowed to remain as templates/available assignees.
- After accepted settlement, a task-delegation-only logical `worker` must not be focused/displayed as `worker Initializing`, `worker Offline`, or any equivalent completed task-agent execution state, and composer/send/interrupt targets must not route to it as the completed task-agent.

## Expected Fix Outcome

Please implement a local fix so that after `mark_task_completed` + original-delegator `accept_task` + settlement/offline cleanup:

1. The concrete task-agent child (`worker · task_0001`) is removed from active UI only after acceptance-gated settlement.
2. The stable logical `worker` parent may remain in an explicitly roster/topology role, but must not render as a stuck active execution status such as `Initializing`.
3. Active execution focus should resolve away from a task-delegation-only logical worker after settlement, normally back to the coordinator or another active execution row.
4. Any identity-less status event for a task-agent run must not poison the logical worker's status. If `agent_id` is a task-agent run id, frontend/backend should preserve task-agent identity or route/ignore it appropriately.
5. Composer/send/interrupt/draft target should not become the task-only logical worker after accepted settlement.
6. Existing explicit tool split remains intact: model-facing worker completion uses `mark_task_completed` / `mark_task_failed`, not `update_task_status`.

## Routing

This is a **Local Fix** reroute to implementation, not a requirement/design reroute. The design already states that the logical parent may remain only as stable roster/topology and must not masquerade as the completed task-agent execution participant.
