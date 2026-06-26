# Frontend Task-Team UI Requirement Gap

## Context

After code review round 4 passed and the package was routed to API/E2E, the user asked how the frontend will look when a product manager delegates a task to a visible team target such as `SoftwareEngineeringTeam` inside an `EngineeringOrganization` team.

The answer is not covered by the current requirements/design. The implemented work defines the backend/runtime/tool model for team-target delegation, and it updates websocket event flattening, but it does not define or implement a first-class frontend projection for task-scoped team executions.

This is a product/requirement gap, not merely a cosmetic polish issue: without a task-team projection, users can see existing structural team/member UI and task-agent projections, but they cannot clearly see that `SoftwareEngineeringTeam` is now executing a specific delegated task as a task-scoped team run.

## Current Frontend Behavior: Task-Agent Instances

The existing frontend already has a concrete projection model for task-agent instances.

Relevant files inspected:

- `autobyteus-web/types/agent/AgentTeamContext.ts`
- `autobyteus-web/services/agentStreaming/TeamStreamingService.ts`
- `autobyteus-web/services/agentStreaming/teamTaskAgentContextProjection.ts`
- `autobyteus-web/utils/teamActiveExecutionMembers.ts`
- `autobyteus-web/components/workspace/team/TeamTaskAgentActivityBar.vue`
- `autobyteus-web/components/workspace/team/TeamMemberMonitorTile.vue`
- `autobyteus-web/components/workspace/team/TeamWorkspaceView.vue`

### Task-agent projection data model

`TeamMemberNodeBase` has explicit task-agent projection fields:

```ts
isTaskAgentInstance?: boolean;
taskAgentInstanceId?: string | null;
taskAgentRunId?: string | null;
taskId?: string | null;
logicalMemberRouteKey?: string | null;
```

### Task-agent stream handling

`TeamStreamingService.dispatchMessage` special-cases `TASK_DELEGATION_EVENT`:

```ts
if (message.type === 'TASK_DELEGATION_EVENT') {
  const taskAgentIdentity = extractTaskAgentIdentity(message);
  if (taskAgentIdentity) {
    ensureTaskAgentContext(teamContext, taskAgentIdentity);
  }
  return;
}
```

`extractTaskAgentIdentity` reads task-agent identity from flattened websocket payload fields such as:

- `task_agent_run_id`
- `task_agent_instance_id`
- `task_id`
- `member_route_key` / `member_path`

### Task-agent node creation

`ensureTaskAgentContext` / `ensureTaskAgentNode` creates a transient `AgentTeamMemberNode`:

```ts
{
  memberKind: 'agent',
  memberName: displayName,
  displayName,
  memberPath: [...logicalMemberPath, taskAgentRunId],
  memberRouteKey: taskAgentRunId,
  memberRunId: taskAgentRunId,
  isTaskAgentInstance: true,
  taskAgentInstanceId,
  taskAgentRunId,
  taskId,
  logicalMemberRouteKey,
}
```

The display name is built as:

```text
<logical member display name> · <task_id>
```

For example:

```text
implementation_engineer · task_0001
```

The transient task-agent node is inserted near its logical/template member via `insertTaskAgentNodeNearParent`.

### Task-agent visible surfaces

The current UI shows task-agent instances in multiple places:

1. `TeamTaskAgentActivityBar.vue`
   - Shows an `Active task agents` strip.
   - Renders task-agent cards.
   - Shows a `Task agent` badge.
   - Shows concrete run id and status.
   - Shows pending tool approvals and approves/denies with the concrete task-agent run identity.

2. `TeamMemberMonitorTile.vue`
   - Shows a `Task agent` badge on task-agent member tiles.
   - Can show conversation preview for task-agent contexts.

3. Focus behavior
   - Clicking a task-agent card selects the concrete task-agent route key.
   - When a task-agent is focused, the shared composer is hidden because task lifecycle should use task tools rather than manual user chat.

4. Cleanup
   - `removeTaskAgentContext` removes the transient node when task-agent status indicates offline/settled.

This is why current member-target delegation feels visible in the frontend.

## Current Frontend Behavior: Task-Team Instances

There is no equivalent first-class task-team projection.

### Missing task-team frontend model fields

`TeamMemberNodeBase` has no task-team equivalent fields such as:

```ts
isTaskTeamInstance?: boolean;
taskTeamInstanceId?: string | null;
taskTeamRunId?: string | null;
taskId?: string | null;
logicalTeamRouteKey?: string | null;
```

### Missing task-team stream handling

`TeamStreamingService.dispatchMessage` only extracts task-agent identity from `TASK_DELEGATION_EVENT`. If a task-delegation event carries only task-team identity, `extractTaskAgentIdentity` returns null and the handler returns immediately. No task-team context or node is created.

### Backend/websocket now provides some task-team identity

The server mapper now flattens current task-delegation event payloads into fields such as:

- `execution_kind: 'task_team'`
- `task_team_instance_id`
- `task_team_run_id`
- `task_id`
- `team_route_key`
- `team_path`

But the current frontend does not consume those fields to create a task-team UI projection.

### Existing structural subteam UI is not enough

The frontend already has structural `agent_team` nodes, such as `SoftwareEngineeringTeam`. That structural node represents the team in topology, not a specific delegated task execution.

If `product_manager` delegates a task to `SoftwareEngineeringTeam`, users need to see something task-specific, for example:

```text
SoftwareEngineeringTeam · task_0001
[Task team]
task_team_run_id: engineering_task_team_...
status: running / awaiting review / accepted / settled
```

Currently, there is no such task-team execution node/card.

## User-Visible Problem

Example team topology:

```text
EngineeringOrganization
├─ product_manager
└─ SoftwareEngineeringTeam
   ├─ solution_designer
   ├─ implementation_engineer
   └─ code_reviewer
```

Runtime flow:

1. `product_manager` calls:

```json
{
  "target": { "kind": "team", "name": "SoftwareEngineeringTeam" },
  "description": "Build feature X"
}
```

2. Backend creates a task-scoped child team run for `SoftwareEngineeringTeam`.
3. Ingress/coordinator receives the work packet.
4. The task-team can internally delegate to its members.

What user likely sees today:

- Existing `SoftwareEngineeringTeam` structural node remains visible.
- Existing child members may show activity as normal nested team members.
- If the task-team internally creates concrete task-agent instances, those task-agent cards can appear through the existing task-agent projection.
- But the initial team-target task itself is not shown as a first-class task-team execution.

This is confusing because the parent user cannot clearly tell:

- that `SoftwareEngineeringTeam` accepted a specific delegated task,
- which task-scoped team run is active,
- whether the team task is active, awaiting review, accepted, or settled,
- how the task-team execution relates to the structural `SoftwareEngineeringTeam` node,
- why a task-agent card may appear later while the team-level delegated work was never shown.

## Requirement Gap

The current requirements/design covered backend semantics but did not require a frontend task-team execution projection. This should be added before treating the feature as product-complete.

Recommended classification: `Requirement Gap` with frontend/product design impact.

## Design Questions For Solution Designer

Please define the intended frontend behavior for task-team executions. At minimum, the design should answer:

1. Projection shape
   - Should task-team executions appear as transient nodes in the existing member tree, similar to task-agent instances?
   - Should they be represented as `memberKind: 'agent_team'` with `isTaskTeamInstance: true`?
   - Should the structural `SoftwareEngineeringTeam` remain separate from `SoftwareEngineeringTeam · task_0001`?

2. Placement
   - Should the transient task-team execution node be inserted near/under the logical `SoftwareEngineeringTeam` structural node?
   - Should it appear in a top active-execution strip?
   - Should it appear inside the existing grid/spotlight views?

3. Naming and badges
   - Suggested display name: `<logical team name> · <task_id>`.
   - Suggested badge: `Task team`.
   - Should `TeamTaskAgentActivityBar` become a generalized `Active Task Executions` bar with both task-agent and task-team cards?

4. Focus behavior
   - When the user clicks the task-team execution card, what opens?
     - The task-scoped child team run view?
     - A represented team card with task status?
     - A filtered event monitor for that task team?
   - Should the composer be hidden or route to the task-team ingress coordinator?

5. Status/lifecycle
   - Which statuses should be visible: active/running, awaiting review, revision requested, accepted, settling/settled?
   - Should accepted/settled task-team executions disappear like task-agent instances, remain in history, or collapse into a completed task row?

6. Event handling
   - Should frontend add `extractTaskTeamIdentity` and `ensureTaskTeamContext` equivalents?
   - What websocket event payload fields are authoritative for task-team projections?
   - Are current flattened fields (`task_team_run_id`, `task_team_instance_id`, `team_route_key`, `team_path`, `task_id`, `execution_kind`) sufficient, or does backend need additional fields/status events?

7. Interaction with nested team events
   - Backend intentionally does not register task-scoped child `TeamRun`s as normal top-level history runs.
   - How should frontend represent a child team run that is active-runtime-only?
   - How should prefixed child member events be associated with the task-team execution node rather than only the structural team node?

8. Review/submission visibility
   - Should parent delegator see a task review queue or at least a task lifecycle row when team submits with `submit_task_result`?
   - Should `TASK_DELEGATION_RESULT_SUBMITTED`, `TASK_DELEGATION_RESULT_REVIEWED`, and status update events be visible in a task timeline?

## Suggested Acceptance Criteria

Potential ACs for a revised design:

- AC-FE-001: When a task-team target is activated, the frontend creates a visible task-team execution projection with task id and task-team run id.
- AC-FE-002: The projection is visually distinct from the structural team node and is labeled as a task-team execution.
- AC-FE-003: The projection is placed near the logical team target or in a generalized active task executions strip.
- AC-FE-004: `TASK_DELEGATION_EVENT` with `execution_kind: 'task_team'` is consumed by the frontend and does not silently no-op.
- AC-FE-005: Task-agent projections created inside the task-scoped team remain associated with the task-team context in a way users can understand.
- AC-FE-006: Task-team result submission/review/acceptance produces visible task lifecycle state or timeline entries for the parent delegator.
- AC-FE-007: Settled task-team executions are either removed or moved to history according to an explicit lifecycle rule.
- AC-FE-008: Existing task-agent instance UI behavior remains unchanged for member-target delegation.

## Why This Matters

The backend feature now supports `delegate_task(target.kind = 'team')`, but if the frontend only shows the existing structural `SoftwareEngineeringTeam` node and later maybe individual task agents, users will not have a coherent mental model of the team-level task execution.

The feature would appear partially invisible: the PM delegated to Engineering, but the UI would not show a distinct Engineering task execution. That is likely to feel broken even if backend behavior is correct.

## Solution-Design Resolution Notes (2026-06-26)

The requirements/design reset chooses a first-class frontend projection for task-team executions.

Decisions now reflected in the requirements and design spec:

- A task-team execution is a concrete runtime projection, distinct from the structural `agent_team` topology node.
- Preferred projection shape: transient `agent_team` node with `isTaskTeamInstance`, task-team instance/run id, task id, logical team route/path, display name `<logical team name> · <task_id>`, and a `Task team` badge.
- Active execution UI should become generalized enough to show both task-agent and task-team cards; task-agent behavior remains unchanged.
- `TASK_DELEGATION_EVENT` with `execution_kind: 'task_team'` must create/repair/update a task-team projection rather than silently no-op.
- Result submission, revision request, acceptance, and settlement must update visible lifecycle state or timeline entries.
- The transient task-team projection is not just one flat card: it must include task-scoped child member nodes cloned/projected from the delegated team's internal member tree, such as `solution_designer`, `implementation_engineer`, and `code_reviewer` under `SoftwareEngineeringTeam · task_0001`.
- Those child member nodes are distinct from the structural team's member nodes and must use route/run identity namespaced by the task-team execution, e.g. `<taskTeamRunId>/<relativeChildRouteKey>`, so focus, status, and event updates do not collide.
- Child task-agent projections spawned inside a task-scoped team must remain visually associated with the parent task-team execution and the relevant task-scoped child member node.

Updated authoritative artifacts:

- Requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-task-delegation-analysis/tickets/in-progress/team-task-delegation-analysis/requirements.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-task-delegation-analysis/tickets/in-progress/team-task-delegation-analysis/design-spec.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-task-delegation-analysis/tickets/in-progress/team-task-delegation-analysis/investigation-notes.md`

## AR-003 / AR-004 Resolution Notes (2026-06-26)

Architecture review accepted the root task-team projection direction but required a safer design for nested child member projections.

The revised design now requires:

- a dedicated frontend child projection owner, `teamTaskTeamChildProjection.ts`;
- scoped child identity with parent task-team run id, relative child route/path, structural source route/path, scoped route/path, child kind, and runtime member-run-id semantics;
- cloned child nodes and child contexts that do not reuse structural node/context references;
- mandatory backend stamping of task-scoped child events with `task_team_run_id` plus relative child route/path;
- no source-path-only task-team association in the target design;
- child task-agent grouping under both the task-team root and the relevant scoped child member;
- cascade cleanup for root, child clones, child contexts, and nested child task-agent projections.

This closes the product gap at design level by making `SoftwareEngineeringTeam · task_0001` an expandable task-team execution with its own scoped internal member tree, not a flat card and not a mutation of the structural `SoftwareEngineeringTeam` node.
