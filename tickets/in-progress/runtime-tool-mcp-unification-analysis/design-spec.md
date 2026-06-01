# Design Spec

## Current-State Read

The current repository has two different levels of tool ownership:

- Browser tools under `autobyteus-server-ts/src/agent-tools/browser/*` already use a healthy server-owned pattern: canonical contracts, parameter specs, input parsers, a manifest, a shared service, and thin runtime projections for Codex/Claude/native wrappers.
- Task tools under `autobyteus-ts/src/task-management/tools/task-tools/*` are still local `BaseTool` implementations. They mutate `context.customData.teamContext.state.taskPlan`, so the behavior is tied to native AutoByteus context and cannot be cleanly reused by server-managed Codex/Claude/future runtimes.
- Existing native task activation exists in `SystemEventDrivenAgentTaskNotifier` and `TaskActivator`: task-plan events are observed, runnable tasks are found, tasks are marked `QUEUED`, and target members receive a generic activation message telling them to check their queue.
- Server-managed team backends expose `postMessage`, `deliverInterAgentMessage`, approvals, `interruptMember`, and whole-team `terminate`, but they do not expose a clean per-member “settle/terminate after task completion” boundary.
- Mixed AutoByteus standalone members currently filter out task-management tools (`autobyteus-mixed-tool-exposure.ts`), which is direct evidence that the current task tool surface is not safe as a cross-runtime team mechanism.
- Current server-managed team managers also assume one active runtime per logical member route key. Codex/Claude managers store active runs as `Map<memberRouteKey, AgentRun>`, mixed stores one handle per route key, and the implemented task-delegation activation coordinator groups runnable work by assignee route key. That shape is not sufficient for the refined model where two independent tasks assigned to the same logical member can run as two task-agent instances in parallel.
- Downstream Round 6 browser validation found that the backend now emits task-agent identity and settlement behavior, but the frontend still projects task-agent work into the logical worker row/conversation. The UI kept the logical `worker` row visible/offline after completion, showed the task work packet inside that logical member conversation, and had no separate task-agent row/card to appear and disappear. That does not satisfy the user's sub-agent lifecycle expectation.
- User follow-up on 2026-05-31 challenged the interpretation that the remaining `worker` row is merely a logical member/template. User confirmation on 2026-06-01 selected the parent/child UX: the logical `worker` row may remain as a stable member/template, the active task appears indented underneath, and only the task/task-agent child disappears after settlement.

The user-refined target is not task-plan polling. It is delegation:

- `send_message_to` remains a free-form conversation tool.
- `delegate_tasks` is bounded work delegation with lifecycle and is available to any authorized active team agent context, not only the coordinator.
- A task-agent instance receives the concrete work packet, reports its own execution status with an optional message and reference files, then waits in an awaiting-acceptance state after self-reported `completed`.
- The original delegator receives the task-agent's reported result by framework notification when reachable, including generated `task_id` and targetable task-agent identity, with team/coordinator-visible event history as fallback. The delegator can request changes through existing `send_message_to` targeted at that task-agent identity, or accept the result through `update_task_status(status: "accepted", task_id)`.
- A logical team member is a reusable worker template. A delegated task may start a task-scoped agent instance of that logical member. Multiple independent tasks assigned to the same logical member may therefore run in multiple task-agent instances, each with its own task packet, runtime identity, worker-reported status, acceptance gate, and exit lifecycle.

## Intended Change

Replace the model-facing task-management surface with a server-owned task-delegation surface:

- Add model-facing `delegate_tasks` for authorized-delegator-to-member work delegation.
- Add model-facing `update_task_status` for task-agent progress/completion reporting and original-delegator acceptance.
- Do not expose `create_task`, `create_tasks`, `get_my_tasks`, `get_task_plan_status`, or `assign_task_to` in the new model-facing surface.
- Maintain an internal authoritative delegation ledger/task-state store for correlation, activation, completion/failure notification, optional messages, reference files, audit/history, and auto-settlement.
- Activate task-agent instances with a task-specific work packet that includes the rich task description, optional reference files, and status-update instructions. Internal task and task-agent instance identities remain available in context/events for authorization, UI, and debugging; the worker does not need to copy them into tool calls.
- Notify the original delegator when a task-agent self-reports completion/failure and record the result in team/coordinator-visible history.
- Settle/exit a successfully completed task-agent instance only after the original delegator accepts the task and that instance's current turn is idle. For every supported runtime/backend path, post-acceptance settlement is mandatory sub-agent lifecycle behavior, not an optional optimization.
- Introduce a task-agent instance identity below the logical member route. `member_name` selects the logical member/template; activation creates one task-agent instance per runnable task by default, subject to concurrency policy.
- Project the same concrete task-agent instance lifecycle to the frontend: a stable logical member/template row remains visible as the reusable team member, and a task-agent instance appears as a transient indented child under that logical member while active. After settlement, the task-agent/task child disappears while the logical member/template parent can remain visible for team transparency and future delegation.
- Tighten active-run UI semantics: after task-delegation-only work completes, any visible task-specific worker execution entity for that work disappears. The logical member/template parent may remain, but it must be visually/semantically distinct from the completed task-agent, must not contain the task-agent packet/activity as its normal conversation, and must not be the row that represents the completed task-agent.

## Downstream Requirement Clarification: Mandatory Sub-Agent Settlement

API/E2E validation raised a requirement clarification on 2026-05-29 because the user treats delegated task workers as sub-agents. The 2026-06-01 acceptance refinement adds that a worker's self-reported `completed` status is not enough to settle the task-agent; successful work settles after original-delegator acceptance. The design decision is:

1. **Codex, Claude, and Mixed server-managed task-delegation paths:** a delegated task-agent instance must remain addressable after self-reported `completed`, then settle/exit after the original delegator accepts the task once the current turn is idle/offline and the delegation ledger reports no remaining work bound to that instance. This is a hard acceptance criterion.
2. **Live mixed-runtime E2E:** the E2E must assert that the Codex task-agent instance remains active/addressable after self-reported completion, that the original delegator receives `task_id` plus task-agent identity, and that the task-agent reaches offline/settled/inactive only after delegator acceptance. Proving only coordinator notification is insufficient.
3. **Native AutoByteus pure-team backend:** leaving per-instance/per-member settlement unsupported is acceptable only if native pure-team task delegation is not exposed/claimed as a supported path in this ticket. If pure AutoByteus team members can use the new `delegate_tasks`/`update_task_status` workflow, then `UNSUPPORTED_RUNTIME_COMMAND` from settlement is a requirement gap that must be fixed or the exposure must be gated off.
4. **Instruction wording:** runtime instructions, work packets, durable docs, and acceptance text must say the framework `will`/`must` settle or exit the final task-agent instance for supported paths. Wording such as `may settle` is not acceptable for the supported delegation workflow.

This clarification does not change the safe-turn rule: settlement must still not happen inline inside worker self-reported `update_task_status(completed)`. The correct sequence is worker completion report recorded by service -> result notification delivered to original delegator with task-agent identity -> delegator accepts with `update_task_status(status: "accepted", task_id)` -> task-agent instance becomes idle/offline -> settlement coordinator calls the backend task-agent lifecycle boundary.

## Downstream Requirement Clarification: Task-Agent Instance Model

The user further clarified on 2026-05-29 that a task-delegated worker should be understood as a task agent: if the coordinator delegates multiple independent tasks to the same team member, the framework should be able to start multiple instances of that member, one per task, so those tasks can run in parallel. The logical member remains part of the team; each task-agent instance is the short-lived runtime that executes one delegated task and exits when finished.

Design decision:

1. **Identity split:** `memberRouteKey`/member name identifies the logical member/template. A new task-agent instance/run identity identifies the concrete runtime executing one delegated task.
2. **Activation unit:** default activation is one runnable delegated task -> one task-agent instance. The work packet is single-task and focused on the rich description/reference files; internal task identity plus task-agent instance identity are carried by context/events for UI/history/debug visibility.
3. **Parallelism:** multiple task-agent instances of the same logical member may run concurrently when tasks are independent and the member's concurrency policy allows it. The initial implementation may use a conservative concurrency limit, but the identity model must not collapse back to one active runtime per logical member.
4. **Tool binding:** task-agent execution calls to `update_task_status` must derive the task from caller task-agent instance identity. The task-agent model-facing call does not pass `task_id` or `task_name`. The original delegator's acceptance call reuses `update_task_status` with system-provided `task_id` and `status: "accepted"`.
5. **Settlement:** settlement targets the task-agent instance, not the logical member template. Exiting one accepted task-agent instance must not terminate another running instance of the same logical member.
6. **Status/UI/history:** events and status snapshots should carry both logical member identity and task-agent instance identity so parallel workers are distinguishable.

## Downstream Requirement Clarification: Frontend Task-Agent Lifecycle UX

API/E2E browser validation routed a frontend UX gap on 2026-05-30. The user expects delegated workers to feel like sub-agents: the task-agent instance becomes visible when work starts, and that task-agent instance disappears after it finishes/exits/settles. The observed frontend behavior kept only the logical `worker` member row visible/offline and embedded the task-agent work packet into the logical worker conversation; that is not the intended UX.

User follow-up on 2026-05-31 clarified the ambiguity further: if the only visible worker-related row says `worker • Offline` in the active run UI after a worker-reported completion/settlement event, users reasonably interpret that as the task-model worker still being present. User confirmation on 2026-06-01 selected the clearer parent/child model: keep the logical member visible, show active delegated tasks underneath it, and remove the task child when it settles. Therefore the design distinction is:

- **Domain/internal truth:** `worker` as a logical team member/template still exists in the team definition and remains available for future delegation.
- **Stable parent UX:** `worker` as a logical member/template may remain visible in the team view as the stable parent/available member so users understand the team structure.
- **Transient child UX:** a concrete task-agent instance is the task child shown under/near the logical member while it runs; that child disappears after settlement.
- **History boundary:** task-agent work packets/tool activity/completed history belong to the task-agent/completed-task entity, not the logical member's normal conversation.

Design decision:

1. **Separate visible subjects:** the frontend must represent a concrete task-agent instance as a transient active entity distinct from the logical member/template. The logical member is the reusable team-definition member selected by `member_name`; the task-agent instance is the concrete runtime doing one delegated task and is preferably rendered as an indented child under the logical member.
2. **Appear condition:** the task-agent entity appears when the frontend observes task-agent activation/status/stream payload containing concrete task-agent identity (`task_agent_instance_id` and/or `task_agent_run_id`) for the team run.
3. **Active lifetime:** the task-agent entity remains visible while the concrete run is initializing/running/idle-before-settlement. It carries the task-agent conversation/activity/tool lifecycle stream.
4. **Disappear condition:** after original-delegator acceptance plus backend settlement/offline cleanup for successful work, the task-agent child/entity is removed from active team/member/running-agent UI. Failure-terminal cleanup may follow the explicit failure policy. The logical member/template parent may remain visible. The final result remains visible through task-delegation activity/history/coordinator notification, not as a lingering active/offline task-agent child or as the logical member's normal conversation.
5. **Logical member row behavior:** a static logical member row/card may remain visible as the reusable template/available member and parent for task-agent children. It must be visually/structurally distinct from task-agent execution children, must not be selected as the completed task-agent's conversation, and must not use plain `Offline` status as the task-agent exit presentation.
6. **Parallel same-member behavior:** if two task-agent instances for the same logical member run concurrently, the frontend shows two distinguishable transient entities and removes only the one whose concrete run settles.

This is now an acceptance criterion in addition to backend settlement. Backend proof that a run is offline/settled is necessary but not sufficient if the frontend still collapses that task-agent into the logical member row.

## Achievability Assessment From Current Code

The user model is achievable, but not by only changing the settlement coordinator. The current implementation has a reusable lower-level `AgentRunManager`, but the team layer above it currently collapses one logical member to one active runtime.

| Current Area | Evidence | Fit For Task-Agent Instances | Required Design Response |
| --- | --- | --- | --- |
| `AgentRunManager` | `createAgentRun(config, preferredRunId)` registers runs by concrete run ID. | Good foundation: it can create multiple concrete runs if run IDs differ. | Generate deterministic task-agent run IDs and call `AgentRunManager` through backend managers. |
| Codex/Claude team managers | `memberRuns = Map<string, AgentRun>` and `memberRunUnsubscribers = Map<string, () => void>` keyed by logical route. | Not sufficient: second task for same member replaces/reuses the same route entry. | Split logical member lookup from concrete runtime instance registry. |
| Mixed team registry | `handles = Map<string, MixedTeamMemberHandle>` keyed by logical route. | Not sufficient for parallel same-member agents. | Key handles by task-agent instance/run ID for delegated task agents; keep route-key handle only for normal conversation routing. |
| `TeamRun.postMessage` | Target is a `TeamMemberSelector`, resolved to one logical member. | Correct for free-form `send_message_to`, wrong as the task-agent activation primitive. | Add explicit `startTaskAgentInstance`/`postTaskAgentWork` lifecycle API instead of overloading `postMessage`. |
| `TaskDelegationActivationCoordinator` | Groups runnable records by assignee route and sends one packet containing multiple records. | Not sufficient: batching prevents one task -> one task agent -> one exit. | Iterate runnable records and allocate one task-agent instance per selected task. |
| `TaskDelegationRecord` | Stores `assignee: TaskDelegationMemberIdentity` only. | Not sufficient: no bound task-agent instance identity. | Add optional/required `taskAgentInstance` after activation. |
| `updateTaskStatus` authorization | Checks `existing.assignee.memberRouteKey === context.caller.memberRouteKey`. | Unsafe for parallel same-member agents. | Resolve the bound task from caller task-agent instance/run ID; reject contexts with zero or multiple active bound tasks. |
| Team events/status | Agent events carry logical `memberPath`/`memberRouteKey` and `memberRunId`; status snapshots assume one row per member. | Ambiguous for parallel instances. | Include both logical member identity and task-agent instance identity; allow multiple status rows for one logical member. |
| Frontend team-run projection | `AgentTeamContext`/team views derive rows and message routing from `memberRouteKey`/`leafAgentContextsByRouteKey`. | Not sufficient: task-agent payloads with the same logical route are routed into the logical member conversation and no transient task-agent row can disappear. | Add a frontend task-agent instance projection keyed by `task_agent_run_id`/`task_agent_instance_id`; route task-agent streams to that projection and remove it from active UI after settlement. |
| Frontend active member/tree views | Team views and workspace tree render logical `memberTree` rows even when no normal conversation/task-agent execution is active. | Misleading if the only worker-related state after completion is a `worker • Offline` row that looks like the completed task-agent. | Split stable logical-member parent projection from transient task-agent child projection; keep the parent visible if desired, but remove the task-agent child after settlement and do not attach task-agent history to the parent conversation. |

## Target Task-Agent Instance Architecture

### Identity Model

Keep two different subjects explicit:

```ts
type LogicalMemberIdentity = {
  memberName: string;
  memberPath: string[];
  memberRouteKey: string;
  templateMemberRunId: string; // existing static member run id from team topology
  runtimeKind: RuntimeKind;
};

type TaskAgentInstanceIdentity = {
  taskAgentInstanceId: string; // stable domain id, e.g. task_agent_task_0007
  taskAgentRunId: string;      // concrete AgentRun id used by AgentRunManager
  teamRunId: string;
  taskId: string;
  logicalMember: LogicalMemberIdentity;
  createdAt: string;
};
```

Rules:

- `member_name` resolves only to `LogicalMemberIdentity`.
- Activation allocates `TaskAgentInstanceIdentity` for each runnable task selected for execution.
- The task-agent runtime's current tool context carries `taskAgentInstanceId`, `taskAgentRunId`, `taskId`, and `logicalMemberRouteKey`.
- Existing `memberRunId` in the current member context should be treated as the concrete active runtime ID for the caller. For a task-agent, that is `taskAgentRunId`; the logical template run ID is separately recorded.

### Runtime API Shape

Do not overload `postMessage` for task-agent activation. Add explicit team-run lifecycle APIs:

```ts
type StartTaskAgentInstanceRequest = {
  logicalMemberRouteKey: string;
  taskAgentInstanceId: string;
  taskAgentRunId: string;
  taskId: string;
  message: AgentInputUserMessage;
};

interface TeamRun {
  startTaskAgentInstance(request: StartTaskAgentInstanceRequest): Promise<AgentOperationResult>;
  settleTaskAgentInstance(logicalMemberRouteKey: string, taskAgentRunId: string, reason?: string | null): Promise<AgentOperationResult>;
}
```

`postMessage` remains the free-form logical-member conversation path used by user messages and `send_message_to`. Task delegation uses `startTaskAgentInstance` so parallel work does not fight with a member's conversation run or with sibling task agents.

### Backend Registry Shape

Each server-managed backend needs a dynamic instance registry. A healthy shape is:

```ts
conversationRunsByRouteKey: Map<logicalMemberRouteKey, AgentRun | Handle>
taskAgentRunsByRunId: Map<taskAgentRunId, TaskAgentRuntimeHandle>
taskAgentRunIdsByLogicalRouteKey: Map<logicalMemberRouteKey, Set<taskAgentRunId>>
```

`TaskAgentRuntimeHandle` owns:

- cloned logical member config;
- task-agent instance identity;
- concrete `AgentRun`;
- event unsubscribe;
- status snapshot projection;
- terminate/settle for only that concrete run.

This avoids the bad shape `Map<memberRouteKey, AgentRun>` becoming responsible for both logical member conversations and task-agent instances.

### Activation And Concurrency Policy

Activation flow:

1. `TaskDelegationService` asks the ledger for runnable unactivated records.
2. `TaskDelegationActivationCoordinator` applies per-logical-member concurrency policy.
3. For each selected task, it allocates a task-agent instance identity.
4. It renders a single-task work packet from the rich description/reference files while binding internal task identity and `task_agent_instance_id` in context/events.
5. It calls `TeamRun.startTaskAgentInstance(...)`.
6. The ledger records the bound task-agent instance only after start succeeds.

Concurrency policy:

- Default conceptual model: one runnable task gets one task-agent instance.
- A configurable per-member/global cap may limit simultaneous instances.
- If the cap is reached, additional ready tasks remain unactivated until an active task-agent reaches an explicit release point: accepted successful work plus settlement, or a failure-terminal policy plus settlement.
- Batching several independent tasks into one packet is not the default; batching may exist later only as an explicit policy with different settlement semantics.

### Delegation Authorization And Delegator Identity

`delegate_tasks` is not coordinator-only. The coordinator is the common top-level delegator, but any active team agent context may delegate when the tool is exposed to that context and policy allows the requested target member.

Rules:

- The tool context supplies the delegator identity; the model does not pass a `delegator` argument.
- The stored delegator identity includes team run ID, logical member identity, concrete run ID, and task-agent instance identity when the delegator is itself a task-agent.
- Completion/failure notifications route to the original delegator identity when it is reachable; the same reported result is also recorded as a team event/history item visible to the coordinator/team.
- A task-agent that delegates child work should normally wait for the child completion notification before reporting its own parent task `completed` or `failed` if the child result is needed for its assignment.
- If the original delegator is no longer reachable when a child task finishes, the result remains durable in task/completed-task history and falls back to team/coordinator-visible notification rather than being lost.

### Completion, Revision, And Acceptance

Do not add a separate `review_task_result` / `accept_task_result` tool. Keep the task surface simple:

- Task-agent execution updates use `update_task_status` without task selectors.
- Original-delegator acceptance reuses `update_task_status` with `status: "accepted"` and the system-generated `task_id` from the completion notification.
- Revision requests reuse existing `send_message_to`, targeted at the live task-agent identity included in the completion notification.

Successful completion flow:

1. Task-agent calls `update_task_status({ status: "completed", message, reference_files })`.
2. The ledger records the worker-reported result and moves the task to `awaiting_acceptance`.
3. The completion notification to the original delegator includes generated `task_id`, target logical member, `task_agent_instance_id`/`task_agent_run_id` (or a stable `task_agent_id` alias), message, and reference files.
4. If the delegator sees a problem, it calls `send_message_to` targeting that task-agent identity; the task-agent remains addressable and can revise the same task, then report `completed` again.
5. If the delegator accepts the result, it calls `update_task_status({ status: "accepted", task_id })`.
6. The ledger marks the task accepted and schedules the task-agent instance for safe settlement after idle.

### Status Update Binding

`update_task_status` validation becomes:

1. For task-agent execution updates, caller context includes a task-agent instance identity/run ID.
2. The ledger has exactly one active delegated task bound to that task-agent instance.
3. `context.caller.logicalMemberRouteKey` matches the record target logical member route.
4. Task-agent execution input contains only status plus optional `message` and `reference_files`; task selectors such as `task_id`, `task_name`, or task title are rejected.
5. For original-delegator acceptance, caller context must match the stored original delegator identity, input status must be `accepted`, and `task_id` must identify a task awaiting acceptance for that delegator.

This prevents two parallel instances of `worker` from completing each other's tasks while still allowing the delegator to accept a specific completed task by ID.

### Settlement Binding

`TaskDelegationSettlementCoordinator` should key pending settlement by `taskAgentRunId`, not by logical member route. For successful work, it queues settlement after the original delegator accepts the task, not after the task-agent merely reports `completed`. It listens for idle/offline events whose payload contains that concrete run ID, then calls `TeamRun.settleTaskAgentInstance(logicalMemberRouteKey, taskAgentRunId, reason)`.

The no-current-work check is instance-specific. For the default one-task-per-instance model, delegator acceptance + idle is enough. If future batching is enabled, the ledger checks that no non-accepted task remains bound to the same task-agent instance.

### Event And Status Projection

Team events and status snapshots should expose both subjects:

- logical member: `memberName`, `memberPath`, `memberRouteKey`;
- concrete task agent: `taskAgentInstanceId`, `taskAgentRunId`, `taskId`;
- display name can be derived, e.g. `worker#task_0007`.

It is valid for `getMemberStatusSnapshots()` to return multiple active rows with the same `member_route_key` as long as `agent_id`/`task_agent_instance_id` differ. The team status aggregator should treat those rows as independent active runtimes.

### Frontend Active Entity Projection

The frontend needs the same identity split as the backend:

```ts
type TaskAgentFrontendEntity = {
  taskAgentInstanceId: string;
  taskAgentRunId: string;
  taskId: string;
  logicalMemberRouteKey: string;
  logicalMemberName: string;
  displayName: string; // e.g. "worker · task_0001"
  conversation: Conversation;
  currentStatus: AgentStatus;
};
```

Frontend rules:

- Team topology/logical member state remains keyed by `memberRouteKey`.
- Task-agent active state is keyed by `taskAgentRunId` (fallback `taskAgentInstanceId` only when run ID is unavailable).
- WebSocket payloads with `task_agent_run_id` or `task_agent_instance_id` are routed to the task-agent frontend entity, not to the logical member's normal conversation.
- `AGENT_STATUS`/stream snapshots that contain task-agent identity create/update the task-agent entity while status is `initializing`, `running`, or `idle`.
- Settlement/offline cleanup removes the task-agent child/entity from active team/member/running-agent UI. The logical member/template parent can remain visible, but it must be the stable member/template node, not the visible representation of the completed task-agent.
- The final task-agent conversation/activity is archived under completed task/task-agent history. It must not be moved into the logical member's normal conversation after active cleanup.
- Logical member rows can remain as stable team topology/template/available-assignee nodes and as parents for active task-agent children. Those rows must not display the task-agent work packet as if it were the logical member's own normal conversation and should be labeled/structured as member templates/available assignees, not active/offline sub-agents.

### Active Execution Vs Team Roster Projection

The frontend should maintain two projections:

1. **Active execution projection:** coordinator/root run, normal member conversations that have been explicitly activated through direct messages/user messages, and active task-agent entities. Task-delegation task children disappear from this projection when their concrete task-agent settles.
2. **Team roster/topology projection:** logical members from the team definition, used for configuration, future delegation targets, and stable parent display. This projection can include `worker` before, during, and after completion; active task-agent children are attached under this parent while running, without task-agent conversation/activity becoming normal member state.

Default task-delegation validation targets the task-agent child lifecycle: while running or awaiting acceptance, a child such as `worker · task_0001` appears under/near `worker`; after final settlement, that child disappears. Showing the stable parent `worker` after task-agent settlement is acceptable and preferred for transparency, as long as it is not selected as the completed task-agent and has no task-agent work packet/history attached as normal conversation.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Feature + behavior change + refactor.
- Current design issue found (`Yes`/`No`/`Unclear`): Yes.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary/ownership issue, missing lifecycle invariant, duplicated runtime projection risk, shared identity looseness, and legacy task-plan polling pressure.
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes.
- Evidence:
  - Task tools are local `BaseTool`s and read `context.customData.teamContext.state.taskPlan` directly.
  - Mixed server-managed teams filter task-management tools because they are not cross-runtime-safe.
  - Native task notification emits generic “check your queue” activation instead of a concrete work packet.
  - Team managers have member interrupt and whole-team terminate but not safe task-agent instance settlement.
  - Current server-managed team managers key active member runtimes by logical `memberRouteKey`, so two independent tasks assigned to the same logical member collapse into one runtime/session.
  - Current task activation groups runnable records by assignee route, which is batching, not task-agent instance creation.
  - Current frontend team-run projection routes task-agent work into logical member rows/conversations, so users see a lingering offline `worker` row instead of a stable logical parent with a transient task-agent child that appears and disappears.
  - User-observed browser screenshots from the earlier implementation show worker-reported `update_task_status` with `settlement_requested: true` while the active run UI still contains a `worker • Offline` row carrying task-agent activity, which contradicts the parent/child task-agent mental model and the acceptance-gated target lifecycle.
- Design response:
  - Introduce a server-owned `TaskDelegationService` as the authoritative boundary.
  - Hide the internal task/delegation ledger from model-facing tools.
  - Replace polling/query tools with push activation and push completion notification.
  - Add task-agent instance identity below logical member identity.
- Add safe task-agent settlement after original-delegator acceptance and idle.
  - Add frontend task-agent active entity projection keyed by concrete task-agent identity.
  - Split frontend active execution projection from team roster/topology projection so task-only worker execution rows disappear after settlement.
- Refactor rationale:
  - Directly adding more runtime-specific `create_tasks`/`get_my_tasks` variants would preserve the current boundary problem.
  - A task-plan polling surface contradicts the intended delegation semantics and wastes model/tool calls.
  - Keeping one active runtime per logical member would make same-member parallel delegation impossible and would blur the subject identity of `update_task_status`.
  - Keeping frontend state keyed only by logical member route would hide the task-agent lifecycle even when backend settlement is correct.
  - Presenting logical member templates as offline active-run participants causes users to perceive settled task agents as still present.
- Intentional deferrals and residual risk, if any:
  - General streamable HTTP/stdio MCP exposure is deferred. This ticket creates the canonical service that future MCP can adapt.
  - Durable persistence of the delegation ledger can be deferred if the current team-run lifetime model is in-memory; the design keeps the ledger behind one owner so persistence can be added later without changing model tools.

## Terminology

- `Task delegation`: a bounded work assignment from one team member, usually the coordinator, to another member.
- `Logical member`: the named team member in the team definition, used as the reusable worker template selected by `member_name`.
- `Task-agent instance`: the short-lived runtime/session started from a logical member template to execute one delegated task.
- `Delegation ledger`: internal authoritative state for delegated work records. This replaces model-facing “task plan” semantics, but may initially reuse existing task-plan data structures behind the service boundary.
- `Work packet`: the activation message content sent to a task-agent instance for one delegated task.
- `Worker-reported completion`: `completed` from the task-agent, meaning the worker believes the task is done and is requesting delegator acceptance.
- `Accepted task`: the original delegator has accepted the worker-reported completion using `update_task_status(status: "accepted", task_id)`.
- `Settling/exiting task agent`: stopping/terminating the task-agent instance after the accepted delegated work turn is safely idle, without terminating the whole team or the reusable logical member template.
- `Frontend task-agent entity`: the transient UI/session projection of one concrete task-agent instance, keyed by task-agent run/instance identity and removed from active UI after settlement.
- `Active execution projection`: the frontend list/cards/header/conversation surfaces for currently active or explicitly normal-conversation participants. Task-agent/task child entities leave this projection when their concrete task-agent settles; logical member/template parents may remain visible as stable team structure.
- `Team roster/topology projection`: the non-execution display of logical member templates/available assignees from the team definition.

## Design Reading Order

Read this design in this order:

1. data-flow spines;
2. ownership and boundary split;
3. model-facing tool surface;
4. internal ledger and event/notification behavior;
5. runtime projection and lifecycle mapping;
6. frontend task-agent lifecycle projection;
7. removal/decommission plan.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: replace the model-facing task-plan tool surface with delegation semantics. Do not keep dual surfaces where both `create_tasks` and `delegate_tasks` are exposed to agents.
- Obsolete paths in scope:
  - model-facing `create_task`;
  - model-facing `create_tasks`;
  - model-facing `get_my_tasks`;
  - model-facing `get_task_plan_status`;
  - model-facing `assign_task_to` as a composite task+message shortcut;
  - generic queue-check activation message.
- Internal storage may reuse existing classes only behind the new `TaskDelegationService` boundary. Callers must not directly mutate `TaskPlan`/ledger internals.

## Data-Flow Spine Inventory

| Spine ID | Scope | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Authorized delegator calls `delegate_tasks` | Target member receives task work packet | `TaskDelegationService` | Main delegation path. |
| DS-002 | Primary End-to-End | Task-agent calls `update_task_status(completed)` | Original delegator receives worker-reported result with task/task-agent identity and team/coordinator history is updated | `TaskDelegationService` | Main completion/failure reporting path. |
| DS-003 | Return/Event | `delegate_tasks` creates multiple independent tasks | Runnable task-agent instances activated | `TaskDelegationActivationCoordinator` served by `TaskDelegationService` | Supports multi-task delegation without legacy `create_tasks`. |
| DS-004 | Return/Event | Original delegator accepts completed task + task-agent idle event | Task-agent instance runtime settled/exited | `TaskDelegationSettlementCoordinator` + `TeamRun` lifecycle boundary | Prevents task agents from staying alive after accepted bounded work while keeping them addressable during review. |
| DS-005 | Bounded Local | Runtime bootstrap for a team member | Delegation protocol and tools become available | Runtime-specific task-delegation projection builders | Ensures current runtimes see the same canonical tool semantics. |
| DS-006 | Primary/Concurrency | Multiple runnable tasks assigned to one logical member | Multiple task-agent instances running under that logical member | `TaskDelegationActivationCoordinator` + backend instance registry | Enables parallel same-member task delegation. |
| DS-007 | Frontend Projection | Task-agent activation/status stream with concrete task-agent identity | Transient task-agent entity appears, then disappears from active UI after settlement | Frontend team-run projection store/components | Makes the backend task-agent lifecycle visible as sub-agent UX instead of a lingering logical member row. |
| DS-008 | Delegator Identity / Nested Delegation | Non-coordinator or task-agent delegator calls `delegate_tasks` | Completion result routes back to that original delegator identity with team/coordinator-visible fallback | `TaskDelegationService` | Prevents delegation from being hard-coded to the root coordinator. |

## Primary Execution Spine(s)

- DS-001: `delegate_tasks tool call from authorized delegator -> runtime projection -> TaskDelegationToolService -> TaskDelegationService -> DelegationLedger -> TaskDelegationActivationCoordinator -> TeamRun.startTaskAgentInstance(logical member, task) -> task-agent receives work packet`
- DS-002: `task-agent update_task_status(completed) -> runtime projection -> TaskDelegationToolService -> TaskDelegationService -> DelegationLedger awaiting_acceptance transition -> TaskDelegationCompletionNotifier -> TeamRun.postMessage(original delegator when reachable) + team/coordinator history event`
- DS-004: `delegator update_task_status(accepted, task_id) -> TaskDelegationService accepted transition -> TaskDelegationSettlementCoordinator pending-settlement -> task-agent idle team event -> TeamRun.settleTaskAgentInstance/settleMemberInstance -> backend runtime termination`
- DS-006: `same logical member has N runnable tasks -> activation coordinator applies concurrency policy -> creates N task-agent instance identities -> backend runs N independent task agents -> each reports and settles independently after acceptance plus idle`
- DS-007: `backend task-agent AGENT_STATUS/stream payload with task_agent_run_id -> TeamStreamingService/frontend projection -> task-agent frontend entity row/card + scoped conversation -> acceptance/settlement/offline cleanup -> remove transient entity from active UI, keep history/activity`
- DS-008: `task-agent or non-coordinator member calls delegate_tasks -> ledger stores concrete delegator identity -> target task-agent completes -> notifier routes result to original delegator or durable team/coordinator fallback`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | An authorized delegator calls `delegate_tasks`. The tool projection validates runtime shape and delegates to the server-owned service. The service creates ledger records, identifies runnable work, creates task-agent instance identities, renders single-task work packets, and starts task-agent instances from logical member templates. | Tool projection, tool service, task delegation service, ledger, activation coordinator, team run. | `TaskDelegationService` | Member resolution, task-agent instance creation, work-packet rendering, event publishing. |
| DS-002 | A task-agent instance calls `update_task_status(completed)` with optional result context. The service resolves the bound task from caller task-agent identity, mutates the ledger to awaiting acceptance, records optional message/reference files, emits events, and notifies the original delegator while recording team/coordinator-visible history. | Tool projection, tool service, task delegation service, ledger, completion notifier, team run. | `TaskDelegationService` | Reference-file validation, notification rendering, team event projection, targetable task-agent identity. |
| DS-003 | When one `delegate_tasks` call contains multiple independent task items, the service creates separate records and activates each runnable task via the task-agent instance path. | Ledger, activation coordinator. | `TaskDelegationActivationCoordinator` | Duplicate activation prevention, per-member concurrency limits. |
| DS-004 | Worker completion updates do not stop the task agent inline. The settlement coordinator records pending settlement only after original-delegator acceptance, waits for the task-agent instance to become idle, then asks the team runtime lifecycle boundary to settle only that instance. | Settlement coordinator, team run, backend team manager/member instance handle. | `TaskDelegationSettlementCoordinator` + `TeamRun` | Safe idle detection, acceptance gate, coordinator/root protection, no whole-team termination, no sibling-instance termination. |
| DS-005 | Runtime bootstrap injects general delegation protocol instructions and exposes the same canonical tools through Codex dynamic tools, Claude in-process MCP tools, and native wrappers if needed. | Projection builders, instruction composer, model runtime. | Runtime projection builders served by `TaskDelegationToolService` | Tool schema conversion, runtime approval behavior, tool-name normalization. |
| DS-006 | If multiple runnable tasks target the same logical member, the activation coordinator starts separate task-agent instances up to that member's concurrency limit. Each instance receives one task packet and exits independently after acceptance plus idle. | Ledger, activation coordinator, backend instance registry, task-agent runtime. | `TaskDelegationActivationCoordinator` + backend manager | Concurrency policy, instance identity generation, status disambiguation. |
| DS-007 | The frontend consumes task-agent-identified stream/status payloads, creates a transient task-agent entity under/near the logical member, routes task-agent conversation/activity to that entity, and removes the entity after settlement/offline cleanup while preserving durable completion history. | Stream handler, frontend team-run projection store, team member/running-agent views. | Frontend team-run projection owner | Task-agent identity extraction, active entity cleanup, logical member roster distinction, archived activity/history. |
| DS-008 | A non-coordinator member or task-agent delegates work to another member. The ledger stores that concrete delegator identity, and completion/failure reporting routes back to that delegator if reachable rather than assuming the coordinator initiated the task. | Tool service, task delegation service, ledger, completion notifier, team run. | `TaskDelegationService` | Authorization policy, delegator reachability, fallback team/coordinator history. |

## Spine Actors / Main-Line Nodes

- `delegate_tasks` / `update_task_status` tool projections: runtime-specific entry wrappers.
- `TaskDelegationToolService`: canonical model-tool execution adapter around the service.
- `TaskDelegationService`: authoritative orchestration boundary for delegation creation and status transitions.
- `TaskDelegationLedger`: internal state owner for delegated records.
- `TaskDelegationActivationCoordinator`: owns work-packet activation sequencing.
- `TaskAgentInstanceRegistry` / backend member-instance registry: owns active task-agent runtime lookup by instance identity.
- `TaskDelegationCompletionNotifier`: owns original-delegator notification payloads, delivery, and team/coordinator-visible history fallback.
- `TaskDelegationSettlementCoordinator`: owns delayed safe task-agent instance settlement.
- `TeamRun` / backend `TeamManager`: owns logical member messaging and task-agent runtime lifecycle.
- Frontend team-run projection store/components: own visible active task-agent entity creation, routing, and cleanup for browser UX.

## Ownership Map

- Runtime projections own only schema conversion, runtime result format, and runtime-specific approval/event glue. They must not own delegation business semantics.
- `TaskDelegationToolService` owns canonical parsing/serialization around model-facing tools. It must delegate state changes to `TaskDelegationService`.
- `TaskDelegationService` owns delegation invariants: who can delegate, who can update, valid transitions, delegator identity capture, completion/failure notifications, acceptance, and settlement decisions.
- `TaskDelegationLedger` owns record storage and atomic state reads/writes for one team run. It does not deliver messages or stop runtimes.
- `TaskDelegationActivationCoordinator` owns activation work-packet send decisions, task-agent instance creation requests, duplicate activation suppression, and per-logical-member concurrency gating.
- Backend task-agent instance registry owns active concrete runtime instances. It must allow multiple instances for one logical member route key and must key operations by task-agent instance/run identity.
- `TaskDelegationCompletionNotifier` owns completion/failure message rendering, original-delegator notification delivery, and team/coordinator-visible history fallback.
- `TaskDelegationSettlementCoordinator` owns safe-exit scheduling and waits for task-agent runtime idle before calling lifecycle APIs.
- `TeamRun`/backend managers own actual runtime post/settle operations.
- Frontend team-run projection owns only visual/session projection of logical members and concrete task-agent instances. It does not own delegation state, activation, or settlement decisions, but it must not collapse task-agent streams into `memberRouteKey`-only logical member rows.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| Codex dynamic tool handler | `TaskDelegationToolService` | Codex-specific tool registration/result shape. | Delegation state, activation, completion notification, settlement. |
| Claude in-process MCP tool handler | `TaskDelegationToolService` | Claude SDK tool schema/handler integration. | Delegation state or coordinator notification policy. |
| Native AutoByteus wrapper, if retained | `TaskDelegationToolService` plus native task-agent/per-member lifecycle support | Native runtime compatibility during migration. | Direct `TaskPlan` mutation, or exposing delegation if task-agent settlement is unsupported. |
| Future general MCP endpoint | `TaskDelegationToolService` | Transport adapter in later ticket. | Business semantics. |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-ts/src/task-management/tools/task-tools/create-task.ts` | Single-task creation is a one-item delegation. | `delegate_tasks` manifest entry and service command. | In This Change | Remove from registry and configured tool docs. |
| Model-facing `create_tasks` | Name exposes internal record creation, not delegation semantics. | `delegate_tasks`. | In This Change | Internal service may still create ledger records. |
| `get-my-tasks.ts` | Workers receive task packets by activation push; no polling. | Internal ledger query + activation work packet renderer. | In This Change | Do not re-expose as worker tool. |
| Model-facing `get_task_plan_status` | Delegators receive completion/failure notifications instead of polling. | Team events/UI/internal debug query. | In This Change | If UI needs status, use internal API, not model tool. |
| `assign-task-to.ts` as task tool | Mixes task creation and direct message delivery. | `delegate_tasks` for bounded work; `send_message_to` for conversation. | In This Change | If needed later, implement as explicit orchestration tool, not pure task service. |
| Model-facing `DelegateTasksInput.task_name` | The user wants the delegation call to carry only target member and task details; server-generated task identity is sufficient. | Internal generated `task_id` and optional derived display label from `description`. | In This Change | Remove from `task-delegation-record.ts` input type, parameter schema, parser, projections, examples, and tests. Parser should reject stale calls that include it. |
| Model-facing `DelegateTasksInput.dependencies` | Dependency authoring is not in the simplified first-ticket schema and conflicts with the minimal work-packet interface. | Future dependency feature ticket with an intentionally designed API, if needed. | In This Change | Remove from `task-delegation-record.ts` input type, `task-delegation-tool-parameter-schemas.ts`, `task-delegation-tool-input-parsers.ts`, runtime projections, and tests. Parser should reject stale calls that include it rather than silently accepting it. |
| Model-facing `DelegateTasksInput.completion_criteria` | The user explicitly wants success conditions in the rich `description`, not a separate model-facing field. | `description` field guidance. | In This Change | Remove from contract/schema/parser/work-packet renderer/projection tests. |
| Model-facing `DelegateTasksInput.expected_deliverables` | The user explicitly rejected a separate expected-deliverables field; expected output guidance belongs in `description`. | `description` field guidance; worker-reported `update_task_status.reference_files` records produced/important artifact references. | In This Change | Do not reintroduce a structured deliverables object; use optional status `message` plus `reference_files`. |
| Task-agent execution selectors on `update_task_status` (`task_id`, `task_name`, title) | The bound task-agent instance already identifies exactly one delegated task in execution-update mode. | Caller task-agent instance/run identity from tool context; original-delegator acceptance uses system-generated `task_id`. | In This Change | Contract/parser/service must reject selector fields for task-agent execution updates, but accept `task_id` only for `status: "accepted"` from the authorized original delegator. |
| Generic task activation message asking worker to check queue | Contradicts push work-packet model. | `TaskDelegationWorkPacketRenderer`. | In This Change | Activation must include task details and update instructions. |
| Grouping independent runnable tasks by assignee into one activation packet | Collapses several parallel task-agent instances into one long-lived/member-level runtime. | One task-agent instance per runnable task selected by `TaskDelegationActivationCoordinator`. | In This Change If Parallel Task Agents Are In Scope | A later explicit batching policy may reintroduce batching with separate semantics. |
| Direct `context.customData.teamContext.state.taskPlan` mutation by tools | Runtime-local and unsafe for server-managed/mixed teams. | `TaskDelegationService`/ledger boundary. | In This Change | Authoritative Boundary Rule applies. |
| Active runtime maps keyed only by logical `memberRouteKey` for delegated task workers | Prevents multiple instances of the same logical member and makes settlement ambiguous. | Backend task-agent instance registry keyed by `taskAgentRunId`. | In This Change If Parallel Task Agents Are In Scope | The conversation/member route map may remain for `postMessage`/`send_message_to`. |
| Frontend projection of task-agent work into the logical member row/conversation only | Hides the transient sub-agent lifecycle and leaves users with an offline logical worker row rather than a task-agent instance that appears and disappears. | Frontend task-agent active entity projection keyed by `task_agent_run_id`/`task_agent_instance_id`. | In This Change For Supported Frontend UX | Logical member roster rows may remain, but task-agent streams/conversations must be scoped to transient task-agent entities. |

## Return Or Event Spine(s) (If Applicable)

- Completion/failure notification: `Ledger worker-reported completion/failure transition -> TaskDelegationCompletionNotifier -> TeamRun event TASK_DELEGATION -> TeamRun.postMessage(original delegator when reachable) + team/coordinator-visible history`.
- Multi-task activation: `delegate_tasks records created -> runnable records -> ActivationCoordinator -> task-agent instance start`.
- Settlement: `Ledger accepted transition -> pending settlement keyed by taskAgentRunId -> AGENT idle/status event for that run -> TeamRun.settleTaskAgentInstance`.
- Frontend task-agent lifecycle: `task-agent status/stream event -> frontend active task-agent entity -> scoped conversation/activity -> settlement/offline cleanup -> active entity removed`.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `TaskDelegationService`.
  - Chain: `delegate/update -> ledger mutation -> runnable task selection -> activation commands`.
  - Why: keeps activation policy in one owner rather than scattering across tool handlers and team managers.
- Parent owner: `TaskDelegationSettlementCoordinator`.
  - Chain: `accepted update -> pending settlement map keyed by taskAgentRunId -> task-agent idle event -> instance work check -> settle task-agent instance`.
  - Why: prevents unsafe runtime termination inside `update_task_status` tool execution.
- Parent owner: backend task-agent instance registry.
  - Chain: `startTaskAgentInstance -> create AgentRun with task-agent context -> bind events/status -> settle/cleanup by taskAgentRunId`.
  - Why: allows several concrete runtimes for one logical member without confusing team topology or free-form messaging.
- Parent owner: runtime projection builders.
  - Chain: `configured tool exposure/member context -> protocol instructions -> tool registration`.
  - Why: workers must see status-update protocol before receiving a task packet.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Member/delegator identity resolution | DS-001, DS-002 | `TaskDelegationService` | Resolve names/route keys/run IDs from `MemberTeamContext`/team runtime into logical member identities. | Prevents ambiguous or unauthorized delegation/status updates. | Tool handlers could mutate wrong team/member state. |
| Task-agent instance identity allocation | DS-001, DS-004, DS-006 | Activation coordinator / instance identity allocator | Build stable `taskAgentInstanceId` and `taskAgentRunId` for one task. | Separates logical member template from runtime instance. | Route-key-only runtime maps would remain ambiguous. |
| Work-packet rendering | DS-001 | Activation coordinator | Render single-task details, lifecycle instructions, and task-agent instance identity. | Keeps prompt content consistent across runtimes. | Generic activation prompts reintroduce polling or batching. |
| Completion notification rendering | DS-002, DS-008 | Completion notifier | Render the worker-reported completion/failure result for the original delegator and team/coordinator-visible history. | Prevents polling and normalizes optional messages/reference files. | Status updates could be invisible to the delegator/team. |
| Runtime-specific schema conversion | DS-001, DS-002, DS-005 | Projection builders | Convert canonical parameter specs to Codex/Claude/native format. | Keeps tool logic transport-independent. | Duplicated runtime behavior. |
| Team event projection | DS-002, DS-003 | UI/history/event pipeline | Emit visible task-delegation events. | Provides durable UI/history visibility. | Model-facing status polling returns. |
| Safe idle detection | DS-004 | Settlement coordinator | Wait for current task-agent turn to complete before instance settlement. | Avoids interrupting tool result delivery. | Worker can be killed mid-tool-call. |
| Backend task-agent instance registry | DS-001, DS-004, DS-006 | Team backend manager | Store active task-agent handles by concrete run ID and project their events/status. | Current route-key maps cannot represent parallel same-member workers. | TeamRun or TaskDelegationService could reach into backend internals. |
| Frontend task-agent active entity projection | DS-007 | Frontend team-run projection store/components | Create/update/remove task-agent UI entities keyed by concrete task-agent identity, and route task-agent conversations to those entities. | Keeps sub-agent UX aligned with backend lifecycle. | Active UI would continue treating settled task agents as offline logical members. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Canonical tool manifest/service pattern | `autobyteus-server-ts/src/agent-tools/browser/*` | Reuse pattern | Browser tools are the strongest local precedent. | N/A |
| Team member messaging/activation | `TeamRun.postMessage`, backend `TeamManager.postMessage` | Reuse for conversation only; add separate task-agent start API | Existing `postMessage` is correct for logical member/user/inter-agent messages, but it selects one route-key member and should not be overloaded for one-task-per-instance activation. | Need `startTaskAgentInstance` because current areas do not own task-agent instance identity. |
| Inter-agent free-form messaging | `send_message_to`/communication services | Reuse for revision conversations to live task-agent identities, not for delegation state creation. | Semantics differ: conversation vs bounded task lifecycle, but revision requests after self-reported completion are conversation directed at the existing task-agent instance. | Completion notifier should be framework-owned, not a user message tool call; `send_message_to` must route `task_agent_id` targets to the concrete task-agent instance, not the logical member conversation. |
| Task state primitives | `autobyteus-ts/src/task-management/*` | Reuse behind boundary or migrate | Current TaskPlan has status events and legacy dependency support. Status/event mechanics may be useful behind the boundary; dependency authoring/activation is deferred out of the first-ticket model-facing surface. | New service needed to own delegation semantics and safe settlement. |
| Task-agent runtime instances | `AgentRunManager` plus team backend managers | Extend | `AgentRunManager` can create multiple concrete runs with unique IDs; team backends must add dynamic task-agent instance registries. | Existing `memberRuns`/`handles` maps are keyed only by logical member route. |
| Member lifecycle | Team backend managers and mixed member handles | Extend/gate by backend | Need mandatory per-instance settlement for every supported task-delegation path; current whole-team terminate is too broad, and unsupported pure-team settlement cannot be exposed as supported delegation. | N/A |
| Frontend team-run projection | `autobyteus-web` team context store, streaming handlers, and team views | Extend | Existing team views already know logical member topology and statuses. They should be extended to add task-agent instance entities rather than replaced wholesale. | Current state keys visible members/conversations by logical `memberRouteKey`; task-agent entities need concrete run identity. |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-tools/task-delegation` | Canonical model-facing tool names, schemas, parsing, result serialization, tool service. | DS-001, DS-002, DS-005 | `TaskDelegationToolService` | Create New | Mirrors browser tool shape. |
| `agent-team-execution/task-delegation` | Delegation ledger, service, activation, task-agent identity allocation, completion notification, settlement. | DS-001..DS-004, DS-006 | `TaskDelegationService` | Create/Extend | Owns business semantics. |
| Team run backend layer | Task-agent start/settle lifecycle and active instance registry. | DS-001, DS-004, DS-006 | `TeamRun`/`TeamManager` | Extend/gate | Add task-agent instance lifecycle boundary; a backend that cannot start/settle instances must not expose parallel task delegation as supported. |
| Runtime projections | Codex/Claude/native tool exposure and protocol instructions. | DS-005 | Projection builders | Extend | No business logic. |
| UI/history/event streaming | Task-delegation event display plus task-agent active entity projection. | DS-002, DS-003, DS-007 | Event pipeline + frontend team-run projection | Extend | Replace task-plan polling surface with event visibility and project transient task-agent rows/cards from task-agent identity. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `agent-tools/task-delegation/task-delegation-tool-contract.ts` | Tool surface | Tool contract | Tool names, parameter specs, result types. | Canonical public tool contract. | Yes |
| `agent-tools/task-delegation/task-delegation-tool-input-parsers.ts` | Tool surface | Input parser | Parse raw runtime tool args into canonical command inputs. | Keeps parsing out of runtime adapters. | Yes |
| `agent-tools/task-delegation/task-delegation-tool-manifest.ts` | Tool surface | Tool manifest | Entries for `delegate_tasks` and `update_task_status`. | Mirrors browser pattern. | Yes |
| `agent-tools/task-delegation/task-delegation-tool-service.ts` | Tool surface | Tool service | Executes parsed tool commands against `TaskDelegationService`. | Thin canonical adapter. | Yes |
| `agent-team-execution/task-delegation/task-delegation-record.ts` | Delegation domain | Record model | Internal ledger record types/statuses/work packet/notification types. | Shared across ledger/service/renderers. | Yes |
| `agent-team-execution/task-delegation/task-agent-instance-identity.ts` | Delegation domain | Instance identity | Logical member identity, task-agent instance identity, run-id generation. | Keeps identity shape out of runtime adapters. | Yes |
| `agent-team-execution/task-delegation/task-delegation-ledger.ts` | Delegation domain | Ledger | Store/query/mutate records for one team run. | Keeps state mechanics separate from side effects. | Yes |
| `agent-team-execution/task-delegation/task-delegation-service.ts` | Delegation domain | Authoritative service | Delegate tasks, update statuses, enforce invariants, call activation/notification/settlement coordinators. | Governing owner for business semantics. | Yes |
| `agent-team-execution/task-delegation/task-delegation-activation-coordinator.ts` | Delegation domain | Activation coordinator | Evaluate runnable records, apply concurrency policy, allocate task-agent instances, and start task agents. | Isolates activation policy. | Yes |
| `agent-team-execution/task-delegation/task-agent-concurrency-policy.ts` | Delegation domain | Concurrency policy | Decide how many task-agent instances may run per logical member. | Keeps policy out of ledger and backend maps. | Yes |
| `agent-team-execution/task-delegation/task-delegation-work-packet-renderer.ts` | Delegation domain | Renderer | Render task-agent activation message with exact update instructions. | Prompt content owner. | Yes |
| `agent-team-execution/task-delegation/task-delegation-completion-notifier.ts` | Delegation domain | Notifier | Emit team events and notify the original delegator when reachable. | Separates notification from status transition. | Yes |
| `agent-team-execution/task-delegation/task-delegation-settlement-coordinator.ts` | Delegation domain | Settlement coordinator | Track pending settlement after delegator acceptance and settle when task-agent instance is idle/no bound work remains. | Prevents unsafe inline stop. | Yes |
| `agent-team-execution/task-delegation/task-delegation-run-registry.ts` | Delegation domain | Runtime binding registry | Bind active `TeamRun` to ledger/service/unsubscribers. | Avoids adding ad hoc fields to every runtime context. | Yes |
| `autobyteus-web/types/agent/AgentTeamContext.ts` | Frontend team projection | UI state model | Add task-agent active entity map keyed by task-agent run/instance identity while preserving logical member topology. | Keeps frontend identity model explicit. | Yes |
| `autobyteus-web/services/agentStreaming/TeamStreamingService.ts` | Frontend streaming projection | Message routing | Route payloads with `task_agent_run_id`/`task_agent_instance_id` to task-agent entities instead of logical member conversations. | Existing router is the boundary where stream payload identity becomes UI state. | Yes |
| `autobyteus-web/services/runHydration/teamRunStatusHydration.ts` | Frontend hydration | Status snapshot projection | Hydrate/update/remove task-agent entities from live status snapshots and settlement/offline cleanup. | Centralizes live status merge. | Yes |
| `autobyteus-web/components/workspace/team/*` and `autobyteus-web/components/workspace/running/*` | Frontend views | Visible task-agent lifecycle | Render task-agent rows/cards distinctly and remove them after settlement while retaining logical member roster display when appropriate. | Keeps visual UX near existing team views. | Yes |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Delegated task identity and status | `task-delegation-record.ts` | Task delegation | Used by ledger, service, renderer, notifier, tests. | Yes | Yes | A generic task-plan DTO with unrelated optional fields. |
| Work-packet shape | `task-delegation-record.ts` or renderer-local type | Task delegation | Activation and tests need stable shape. | Yes | Yes | Prompt-only string without structured source data. |
| Completion notification payload | `task-delegation-record.ts` | Task delegation | Event and delegator/coordinator message share source payload. | Yes | Yes | Duplicate event vs message shapes. |
| Tool parameter specs | `task-delegation-tool-contract.ts` | Tool surface | Codex/Claude/native projections convert from same contract. | Yes | Yes | Runtime-specific schemas as source of truth. |
| Logical member vs task-agent identity | `task-agent-instance-identity.ts` | Task delegation | Used by ledger, activation, runtime context builders, status/events, and settlement. | Yes | Yes | Overloading `memberRunId` without preserving logical template identity. |
| Frontend task-agent entity identity | `AgentTeamContext.ts` / frontend task-agent projection type | Frontend team projection | Used by streaming routing, status hydration, team member views, running tree, and activity/history links. | Yes | Yes | A route-key-only member row with optional task-agent fields. |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Parallel / Overlapping Representation Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `TaskDelegationRecord` | Yes | Yes | Medium | Store logical member/delegator identities and, after activation, exactly one bound task-agent instance identity for default one-task-per-instance mode. |
| `TaskAgentInstanceIdentity` | Yes | Yes | Low | Keep `taskAgentInstanceId`, `taskAgentRunId`, `taskId`, and logical member identity distinct; do not use one generic `memberRunId` for both template and instance. |
| `TaskAgentFrontendEntity` | Yes | Yes | Medium | Keep concrete task-agent run/instance ID, logical member reference, conversation/activity state, and status explicit. Do not mutate the logical member context's `runId` to represent a task-agent instance. |
| `DelegateTasksInput` | Yes | Yes | Low | Keep the model-facing envelope minimal: `member_name`, rich `description`, optional `reference_files`. Do not add separate `task_name`, `completion_criteria`, `expected_deliverables`, or dependency fields in the first-ticket tool schema. Use `member_name` consistently and resolve to logical route key internally. |
| `UpdateTaskStatusInput` | Yes | Yes | Medium | Keep execution updates minimal: `status`, optional `message`, optional `reference_files` with no task selector. Permit `task_id` only for original-delegator `status: "accepted"`; never accept `task_name` or title selectors. |
| `TaskDelegationCompletionPayload` | Yes | Yes | Low | Use one payload for team event and original-delegator/coordinator-visible message rendering. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-tools/task-delegation/task-delegation-tool-contract.ts` | Tool surface | Contract | Names `delegate_tasks`, `update_task_status`; parameter/result contracts. | Single canonical tool contract. | Yes |
| `autobyteus-server-ts/src/agent-tools/task-delegation/task-delegation-tool-input-parsers.ts` | Tool surface | Parser | Runtime raw args -> canonical inputs with clear errors. | Avoids parser duplication. | Yes |
| `autobyteus-server-ts/src/agent-tools/task-delegation/task-delegation-tool-manifest.ts` | Tool surface | Manifest | Tool entries with description, params, parser, executor. | Browser-pattern reuse. | Yes |
| `autobyteus-server-ts/src/agent-tools/task-delegation/task-delegation-tool-service.ts` | Tool surface | Tool execution | Context-bound execution and result serialization. | Keeps transport thin. | Yes |
| `autobyteus-server-ts/src/agent-tools/task-delegation/register-task-delegation-tools.ts` | Tool surface | Registration | Native/server registry sync if needed. | Avoid scattered registration. | Yes |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-record.ts` | Delegation domain | Domain model | Record/status/input/event/work-packet/completion types. | Common model source. | Yes |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-agent-instance-identity.ts` | Delegation domain | Instance identity | Logical member vs task-agent identity types and deterministic task-agent run-id builder. | Prevents route-key identity collapse. | Yes |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-ledger.ts` | Delegation domain | Ledger | Per-team storage, status transition primitives, queries. | State owner. | Yes |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-service.ts` | Delegation domain | Authoritative service | Delegate/update commands; invariant enforcement; side-effect sequencing. | Spine owner. | Yes |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-activation-coordinator.ts` | Delegation domain | Activation | Readiness evaluation, duplicate activation prevention, task-agent identity allocation, task-agent start. | Clear off-spine owner. | Yes |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-agent-concurrency-policy.ts` | Delegation domain | Concurrency | Per-logical-member task-agent concurrency limits and slot checks. | Avoids hiding policy in backend registry. | Yes |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-work-packet-renderer.ts` | Delegation domain | Renderer | Activation message content. | Prompt content stays testable. | Yes |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-completion-notifier.ts` | Delegation domain | Notifier | Original-delegator notification and team/coordinator-visible event payload. | Push completion owner. | Yes |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-settlement-coordinator.ts` | Delegation domain | Settlement | Post-acceptance pending settlement, idle listener, no-remaining-work gate. | Prevents inline termination. | Yes |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-run-registry.ts` | Delegation domain | Runtime binding | Attach/detach delegation services to active team runs. | Central lifecycle registration. | Yes |
| `autobyteus-server-ts/src/agent-team-execution/services/member-run-instruction-composer.ts` | Runtime instruction composition | Delegation protocol instructions | Inject mandatory task-delegation lifecycle wording into member runtime instructions. | One owner for static task protocol text. | Yes |
| `autobyteus-server-ts/src/agent-team-execution/domain/task-agent-instance.ts` or colocated backend-domain file | Team runtime domain | Runtime instance contract | `StartTaskAgentInstanceRequest`, task-agent status/event identity. | Shared by TeamRun and backends. | Yes |
| `autobyteus-server-ts/src/agent-team-execution/backends/common/task-agent-runtime-registry.ts` | Backend common | Task-agent registry helper | Shared map/lookup/cleanup semantics for task-agent runs where Codex/Claude can reuse it. | Prevents repeated map-by-run-id policy. | Yes |
| `autobyteus-server-ts/src/agent-team-execution/backends/codex/codex-task-agent-instance-registry.ts` | Codex backend | Codex task-agent instances | Create/restore/settle Codex task-agent AgentRuns by taskAgentRunId. | Keeps Codex-specific runtime setup out of core service. | Yes |
| `autobyteus-server-ts/src/agent-team-execution/backends/claude/claude-task-agent-instance-registry.ts` | Claude backend | Claude task-agent instances | Create/restore/settle Claude task-agent AgentRuns by taskAgentRunId. | Keeps Claude-specific runtime setup out of core service. | Yes |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-task-agent-instance-registry.ts` | Mixed backend | Mixed task-agent instances | Multiple same-logical-member handles keyed by taskAgentRunId. | Current mixed registry is route-key only. | Yes |
| `autobyteus-server-ts/src/agent-team-execution/backends/autobyteus/autobyteus-team-run-backend.ts` | Native team backend | Native task-agent/per-member lifecycle support or exposure gate | Either implement settlement or ensure new task delegation is not exposed as supported for pure native teams. | Prevents `UNSUPPORTED_RUNTIME_COMMAND` from violating sub-agent semantics. | Yes |
| `autobyteus-web/types/agent/AgentTeamContext.ts` | Frontend team projection | UI state model | Add/own `taskAgentContextsByRunId` or equivalent typed task-agent active entity map; keep logical `memberNodesByRouteKey` as topology. | The identity split must exist in frontend state, not only backend events. | Yes |
| `autobyteus-web/services/agentStreaming/protocol/messageTypes.ts` | Frontend protocol | Payload types | Include task-agent identity fields on relevant stream/status/tool payloads. | Prevents ad hoc `any` parsing of task-agent identity. | Yes |
| `autobyteus-web/services/agentStreaming/TeamStreamingService.ts` | Frontend streaming projection | Message routing | Resolve task-agent payloads by `task_agent_run_id`/`task_agent_instance_id`, create/update the task-agent frontend entity, and route conversation/tool segments there. | Current routing falls back to `member_route_key` and mutates logical member context. | Yes |
| `autobyteus-web/services/runHydration/teamRunStatusHydration.ts` | Frontend hydration | Live status merge | Merge task-agent status snapshots into the task-agent active entity map; remove settled/offline task-agent entities from active UI projection. | Keeps snapshot and live event behavior consistent. | Yes |
| `autobyteus-web/components/workspace/team/TeamMembersPanel.vue` and grid/spotlight tiles | Frontend team views | Visible task-agent lifecycle | Render logical member template/roster rows distinctly from transient task-agent rows/cards. | Existing views show only logical rows. | Yes |
| `autobyteus-web/components/workspace/running/*` | Frontend running tree | Active run list projection | Show active task-agent instances while running and remove them after settlement, without treating logical templates as active task agents. | User-visible run tree is where lingering offline rows were observed. | Yes |

## Ownership Boundaries

The authoritative boundary for model-facing task work is `TaskDelegationService`, not `TaskPlan`, not runtime projections, and not MCP transport. Any caller above the task-delegation subsystem must call `delegateTasks` or `updateTaskStatus` on the service/tool service, not directly mutate ledger records.

The authoritative boundary for runtime lifecycle remains `TeamRun`/backend `TeamManager`. The activation and settlement coordinators decide that a task-agent instance should start or settle, but they must request that through explicit `TeamRun` APIs, not by reaching into backend runtime maps. Logical member conversations and task-agent instances are different subjects under this boundary.

The authoritative boundary for frontend active task-agent presentation is the frontend team-run projection state, not individual display components. Streaming and hydration code should create/update/remove task-agent entities in one projection model; team member panels, grid/spotlight views, and running-tree rows should render that projection instead of independently inferring task-agent lifecycle from logical member route keys.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `TaskDelegationService` | Ledger, activation coordinator, completion notifier, settlement coordinator. | Tool service, future MCP endpoint, tests above subsystem. | Runtime handler writes ledger or posts activation directly. | Add explicit service command/query. |
| `TaskDelegationToolService` | Parser/serializer plus service call. | Runtime projections. | Runtime-specific business logic. | Extend manifest/service result contract. |
| `TeamRun` task-agent lifecycle API | Backend managers/task-agent instance registries. | Activation coordinator, settlement coordinator. | Task delegation reaches into `memberRuns`/handle maps or uses `postMessage` to imply task-agent creation. | Add `startTaskAgentInstance` and `settleTaskAgentInstance` on `TeamRun` and `TeamManager`. |
| Backend task-agent instance registry | Concrete `AgentRun`s/handles and event subscriptions by `taskAgentRunId`. | Backend manager. | One route-key map stores both conversation runs and task-agent runs. | Split conversation route registry from task-agent run registry. |
| `TaskDelegationWorkPacketRenderer` | Prompt/message content format. | Activation coordinator. | Hand-building activation prompts in multiple backends. | Add renderer options/sections. |
| Runtime task-delegation exposure gate | Backend task-agent settlement capability. | Runtime projection builders/tool exposure composition. | Exposing `delegate_tasks` for a backend whose task-agent settlement returns unsupported. | Implement backend settlement or hide/gate task-delegation tools for that backend. |
| Frontend task-agent projection | Task-agent active entity map, stream routing, status cleanup. | Team views/running tree/activity links. | Components infer task-agent lifecycle from `memberRouteKey` or logical member contexts directly. | Add/extend frontend projection APIs keyed by concrete task-agent identity. |

## Dependency Rules

Allowed:

- Runtime projections -> `TaskDelegationToolService`.
- `TaskDelegationToolService` -> `TaskDelegationService`.
- `TaskDelegationService` -> ledger/coordinators under task-delegation subsystem.
- Task-delegation coordinators -> `TeamRun` public APIs.
- Backend task-agent instance registries -> `AgentRunManager`.
- UI/history/event pipeline -> task-delegation event payloads.
- Frontend team views/running tree -> frontend team-run projection, not raw route-key-only snapshots.

Forbidden:

- Runtime projections directly accessing `TaskPlan`, ledger, team manager member maps, or notification internals.
- `update_task_status` handler stopping the task-agent runtime inline.
- `delegate_tasks` using `send_message_to` model-tool code or generic `postMessage` as the task-agent activation primitive.
- Workers polling `get_my_tasks` or coordinator polling `get_task_plan_status` as part of the normal flow.
- Exposing both `create_tasks` and `delegate_tasks` model-facing names in the new surface.
- Exposing the supported task-delegation tool surface for a backend that cannot settle a final task-agent instance.
- Runtime or work-packet instructions saying the framework "may settle" the final task-agent instance after delegator acceptance in a supported delegation path.
- Keying delegated-task worker lifecycle only by logical `memberRouteKey` when multiple task-agent instances can exist for that member.
- Preserving stale model-facing `delegate_tasks` fields `task_name`, `dependencies`, `completion_criteria`, or `expected_deliverables`.
- Allowing task-agent execution updates to select work by model-facing fields such as `task_id`, `task_name`, or title; task-agent instance context is the selector. The only `task_id` exception is original-delegator acceptance with `status: "accepted"`.
- Frontend stream routing that ignores `task_agent_run_id`/`task_agent_instance_id` and attaches task-agent packets, tool calls, or status to the logical member's normal conversation.
- Treating a lingering offline logical member row as sufficient evidence or presentation of task-agent exit.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `delegateTasks(context, input)` | Delegated task records | Create internal records, evaluate readiness, activate task-agent instances. | `teamRunId`, delegator identity from context; `member_name` resolves to logical member identity; server generates task identity. | Context supplies delegator and generated IDs; not user args. |
| `startTaskAgentInstance(request)` | One concrete task-agent runtime | Start a runtime instance for one delegated task from a logical member template. | `teamRunId + logicalMemberRouteKey + taskId + taskAgentInstanceId + taskAgentRunId`. | Do not use for free-form `send_message_to`. |
| `updateTaskStatus(context, input)` | One delegated task status or acceptance decision | For task-agent execution, resolve bound task from caller task-agent context and mutate status/message/reference files. For original-delegator acceptance, resolve by generated `task_id`, mark accepted, and schedule settlement. | Execution mode: caller logical member route plus task-agent instance/run identity; acceptance mode: original delegator identity plus `task_id`. | Reject `task_name`/title selectors and reject `task_id` except for `status: "accepted"` by the authorized delegator. |
| `settleTaskAgentInstance(logicalMemberRouteKey, taskAgentRunId, reason)` | One task-agent runtime | Safely stop one concrete task-agent instance. | Logical member route key plus concrete task-agent run ID. | Not whole-team terminate and not sibling-instance terminate. |
| `settleMember(target, reason)` or `terminateMember(target, reason)` | One logical conversation/member runtime | Safely stop one normal member runtime where applicable. | Explicit member route key and optional run ID. | Separate from task-agent instance settlement. |
| `renderWorkPacket(record)` | Activation message | Render one task's details, task-agent identity, and lifecycle instruction. | One structured task record plus bound task-agent instance identity. | Default output is single-task, not a batch. |
| `notifyReportedTaskResult(payload)` | Original-delegator notification | Emit event and optionally post message to the original delegator when a task-agent reports completion/failure. | Stored delegator identity, team/coordinator fallback. | No coordinator polling. |
| `sendMessageTo(taskAgentId, message)` | One live task-agent revision conversation | Route delegator feedback to the concrete task-agent instance that reported completion and is awaiting acceptance. | `teamRunId + taskAgentInstanceId/taskAgentRunId` from completion notification. | Used for revisions only; does not create task records or accept tasks. |
| `projectTaskAgentStatus/message(payload)` (frontend projection API shape) | One frontend task-agent entity | Create/update/remove the visible task-agent entity and route task-agent stream content. | `teamRunId + taskAgentRunId/taskAgentInstanceId + logicalMemberRouteKey`. | Components consume projection state; they do not infer lifecycle from logical member route alone. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `delegateTasks` | Yes | Yes | Medium | Resolve member names once to logical member identity; reject ambiguous names; generate task identity internally. |
| `startTaskAgentInstance` | Yes | Yes | Low | Require logical route plus generated task-agent instance/run identity. |
| `updateTaskStatus` | Yes | Yes | Medium | Resolve execution updates from caller task-agent identity; resolve acceptance from original delegator plus generated `task_id`. |
| `settleTaskAgentInstance` | Yes | Yes | Low | Require logical route and concrete task-agent run ID; run ID protects sibling instances. |
| `settleMember` | Yes | Yes | Low | Keep for normal member/conversation runtime or legacy backend lifecycle; do not use as the only task-agent identity. |
| `notifyReportedTaskResult` | Yes | Yes | Medium | Store delegator identity at delegation time; fallback to team/coordinator-visible history. |
| Frontend task-agent projection API | Yes | Yes | Low | Concrete task-agent run/instance identity is required; `memberRouteKey` alone is not an accepted selector for a task-agent entity. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Model-facing delegation tool | `delegate_tasks` | Yes | Low | Use this name instead of `create_tasks`; it is not coordinator-only. |
| Status/acceptance tool | `update_task_status` | Yes | Medium | Keep one tool: task-agent execution updates are caller-bound; delegator acceptance uses generated `task_id`. |
| Internal state | `TaskDelegationLedger` | Yes | Low | Avoid exposing “task plan” to agents. |
| Runtime worker | `TaskAgentInstance` | Yes | Low | Use for concrete task-scoped runtime, not for logical member template. |
| Team template | `LogicalMember` | Yes | Low | Use for team-definition member selected by `member_name`. |
| Activation content | `TaskDelegationWorkPacket` | Yes | Low | Render from structured record. |
| Completion push | `TaskDelegationCompletionNotification` | Yes | Low | Use one payload for event/message. |
| Frontend transient worker | `TaskAgentFrontendEntity` / task-agent row/card | Yes | Medium | Name and render as a task-agent instance, not as the logical member itself. |

## Applied Patterns (If Any)

- Browser tool manifest/service/projection pattern: reused for `agent-tools/task-delegation` so schemas and execution logic are runtime-neutral.
- Event-driven orchestration: worker-reported completion/failure drives original-delegator notification and team/coordinator-visible history; delegator acceptance drives delayed settlement.
- Runtime instance registry: backend-owned dynamic task-agent registries allow several concrete `AgentRun`s under one logical member.
- Frontend projection: task-agent stream/status identity creates transient active UI entities, while logical member topology remains a separate roster/template projection.
- Authoritative boundary rule: runtime adapters call the task-delegation boundary, not ledger internals.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-tools/task-delegation/` | Folder | Tool surface | Model-facing task delegation tool contracts/service. | Matches existing server-owned first-party tools. | Team runtime internals. |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/` | Folder | Delegation domain | Ledger/orchestration/activation/task-agent identity/notification/settlement. | Team-run execution concern, not generic tool concern. | Runtime-specific schema adapters. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/task-delegation/` | Folder | Codex projection | Codex dynamic tool registrations and instruction integration. | Runtime-specific adapter. | Delegation business logic. |
| `autobyteus-server-ts/src/agent-execution/backends/claude/task-delegation/` | Folder | Claude projection | Claude in-process MCP tool definitions/server builder. | Runtime-specific adapter. | Delegation business logic. |
| `autobyteus-server-ts/src/agent-team-execution/domain/team-run-event.ts` | File | Team event domain | Add/replace task-delegation event payload/source. | Existing event identity owner. | Renderer-specific prompt strings. |
| `autobyteus-server-ts/src/agent-team-execution/backends/team-manager.ts` | File | Team lifecycle interface | Add task-agent start/settlement APIs. | Existing team manager contract. | Delegation state. |
| `autobyteus-ts/src/task-management/tools/task-tools/*` | Folder | Legacy local task tools | Remove/decommission model-facing legacy tools. | Old ownership is wrong for target. | New canonical logic. |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Boundary Is Clear? | Mixed-Layer Or Over-Split Risk | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `agent-tools/task-delegation` | Transport/tool-surface adapter | Yes | Low | Mirrors browser pattern. |
| `agent-team-execution/task-delegation` | Main-line domain-control + local off-spine concerns | Yes | Medium | Several files are justified because service, ledger, activation, notification, and settlement own different concerns. |
| Runtime-specific projection folders | Transport/runtime adapter | Yes | Low | Keeps runtime details away from core service. |
| Backend task-agent instance registries | Runtime lifecycle depth below team manager | Yes | Medium | Necessary because task-agent instances are dynamic concrete runtimes, not static team topology members. |
| Existing `autobyteus-ts/task-management` | Legacy/local domain | No for target surface | High | Decommission as model-facing path; reuse internally only if hidden behind service. |

## Concrete Examples / Shape Guidance

### Model-facing `delegate_tasks` input shape

`delegate_tasks` must not be interpreted as "create a named record for this member." The task item is the worker's work packet source. Keep the tool schema deliberately small so LLMs can call it reliably. There is no model-facing `task_name`; the server generates task identity and may derive a display label from the first line or a short excerpt of `description` when UI/history needs one.

The schema description should also make sequencing explicit: `delegate_tasks` is for ready-to-run work. If task B depends on task A, the delegator should delegate task A, wait for the framework completion notification, then call `delegate_tasks` for task B. Do not reintroduce a model-facing `dependencies` field in this first-ticket surface.

Canonical first-ticket shape:

```ts
type DelegateTasksInput = {
  tasks: Array<{
    // Logical member/template selected from the team definition.
    // The framework creates task-agent instance identity internally.
    member_name: string;

    // Required rich Markdown work packet for ready-to-run work: objective, context, scope,
    // instructions, constraints, relevant files, and any details the
    // task agent needs to begin without calling get_my_tasks.
    // Do not encode dependency references as separate fields; sequence dependent
    // work by delegating it later after completion notification.
    // This is where the delegator includes any done criteria,
    // expected output guidance, constraints, and relevant context.
    description: string;

    // Optional structured references to preserve artifact visibility
    // without forcing the model to encode paths inside prose.
    reference_files?: string[];
  }>;
};
```

Minimal valid example:

```json
{
  "tasks": [
    {
      "member_name": "implementation_engineer",
      "description": "Objective: implement the server-owned TaskDelegationService and delegate_tasks/update_task_status tool surface.\n\nContext: this replaces model-facing create_task/create_tasks/get_my_tasks with push activation.\n\nScope: add the canonical service, ledger integration, runtime projections, and lifecycle instructions. Do not implement the future HTTP/streamable MCP endpoint in this ticket.\n\nRelevant files: /path/to/requirements.md, /path/to/design-spec.md.",
      "reference_files": ["/path/to/requirements.md", "/path/to/design-spec.md"]
    }
  ]
}
```

Invalid example:

```json
{
  "tasks": [
    {
      "member_name": "implementation_engineer"
    }
  ]
}
```

This must be rejected because the task-agent would receive only target identity, not enough work detail.

### Model-facing `update_task_status` input shape

`update_task_status` has two modes. A task-agent instance uses it for execution updates and is already bound to exactly one delegated task, so it passes no task selector. The original delegator uses the same tool for acceptance with the generated `task_id` from the completion notification.

```ts
type UpdateTaskStatusInput =
  | {
      // Task-agent execution mode; task inferred from caller task-agent context.
      status: "in_progress" | "completed" | "failed";
      message?: string;
      reference_files?: string[];
    }
  | {
      // Original-delegator acceptance mode; task_id comes from completion notification.
      status: "accepted";
      task_id: string;
      message?: string;
    };
```

Terminal example:

```json
{
  "status": "completed",
  "message": "Implemented the service and updated tests.",
  "reference_files": ["/path/to/implementation-handoff.md", "/path/to/test.log"]
}
```

### Work packet sent to task-agent instance

```text
You have been activated as a task agent for the delegated task below.

Task label: Implement the server-owned TaskDelegationService... (derived for display)
Delegated by: solution_designer
Logical member: implementation_engineer
Description:
Objective: implement the server-owned TaskDelegationService...
Context: this replaces model-facing create_task/create_tasks/get_my_tasks...
Scope: add the canonical service, ledger integration, runtime projections...
Reference files:
- /path/to/requirements.md
- /path/to/design-spec.md

Lifecycle instructions:
1. Work directly from this task packet. Do not call get_my_tasks; that tool is not part of this workflow.
2. If you need to mark the task started, call update_task_status with status="in_progress". Do not pass task_id or task_name; this tool is bound to the current task-agent instance.
3. When done, call update_task_status with status="completed" or "failed".
4. Include a short message and reference_files, if useful, when reporting completion/failure.
5. After you report completed, the framework will notify the delegator and keep this task-agent addressable while awaiting acceptance. If the delegator requests changes, continue the same task and report completed again when revised.
6. After the delegator accepts the task, the framework must settle this task-agent instance once this turn is idle.
```

### Parallel same-member delegation shape

If a delegator delegates two independent tasks to `implementation_engineer`, the ledger should bind two task-agent instances:

```text
task_0007 -> logical member implementation_engineer -> task_agent_task_0007 -> run implementation_engineer_task_0007_<hash>
task_0008 -> logical member implementation_engineer -> task_agent_task_0008 -> run implementation_engineer_task_0008_<hash>
```

Both task agents can run concurrently if concurrency policy allows. When `task_0007` is accepted by its delegator, only `task_agent_task_0007` settles; `task_agent_task_0008` keeps running.

### Frontend task-agent lifecycle shape

When `worker` receives a delegated task, the active frontend projection should look conceptually like this while work is running:

```text
Team members:
- coordinator
- worker                    (logical member/template)
  - worker · task_0001      (task_agent_task_0001 / run ...__worker__task_0001, Running)
```

The task-agent work packet, tool calls, and streamed answer belong to `worker · task_0001`, not to the logical `worker` template conversation. After `task_0001` reports completed, the child remains visible/addressable as awaiting acceptance. After the delegator accepts it and the backend settles that concrete run:

```text
Team members:
- coordinator
- worker                    (logical member/template, available/no active task)

Task/activity history:
- task_0001 completed, message/reference_files...
```

Bad shape:

```text
- worker Offline            (same row contains the task-agent work packet)
```

That bad shape makes the task-agent look like a lingering offline logical member and does not show the requested parent/child lifecycle. The good shape keeps `worker` visible as the stable team member and removes only `worker · task_0001`.

### Completion notification to original delegator

```text
Delegated task reported completed and is awaiting your acceptance.

Task ID: task_0001
Task: Implement the server-owned TaskDelegationService... (derived)
Target member: implementation_engineer
Task agent ID: task_agent_task_0001
Task agent run ID: implementation_engineer_task_0001_<hash>
Reported status: completed
Message: Implemented service, projections, and tests.
Reference files:
- /path/to/implementation-handoff.md
- /path/to/test.log

If changes are needed, send a message to task_agent_task_0001.
If accepted, call update_task_status with status="accepted" and task_id="task_0001".
```

## Migration / Refactor Sequence

1. Add/tighten task-delegation domain models, including `LogicalMemberIdentity` and `TaskAgentInstanceIdentity`.
2. Update the ledger so records are assigned to logical members at creation and bound to task-agent instance identity at activation.
3. Remove stale model-facing task item fields from `DelegateTasksInput` and all projections/parsers/tests: `task_name`, `dependencies`, `completion_criteria`, and `expected_deliverables`. Make the parser strict enough that stale calls with these fields do not silently succeed.
4. Add task-agent concurrency policy and deterministic task-agent run-id generation.
5. Add explicit `TeamRun.startTaskAgentInstance` / backend task-agent start API. Do not use generic `postMessage` for task-agent activation.
6. Add backend task-agent instance registries for server-managed Codex/Claude/Mixed paths. Keep normal logical-member conversation routing separate.
7. Add activation work-packet renderer and activation coordinator that starts one task-agent instance per selected runnable task; test no `get_my_tasks` instruction is needed.
8. Add completion notifier and task-delegation team event payloads carrying generated `task_id`, logical member, targetable task-agent identity, and original delegator identity; test original-delegator notification on worker-reported `completed`/`failed` plus team/coordinator-visible history.
9. Add settlement coordinator and task-agent instance settlement APIs on `TeamRun`/team managers/member handles; test delayed settlement after original-delegator acceptance plus idle and no sibling-instance termination.
10. For each backend that will expose task delegation, either implement task-agent start/settlement or add an explicit exposure gate. Native AutoByteus pure-team must not expose supported delegation while task-agent/per-member settlement is unsupported.
11. Add canonical `agent-tools/task-delegation` manifest/service for `delegate_tasks` and `update_task_status`, including task-agent context binding and selector-free status updates.
12. Add Codex/Claude/native projections and general delegation protocol instruction injection; static protocol text must say the framework `will`/`must` settle the final task-agent after delegator acceptance, not `may`.
13. Remove/decommission legacy model-facing local task tools from registration/configured exposure.
14. Update tests for mixed teams so task delegation tools are available through server-owned projections instead of filtered local `ToolCategory.TASK_MANAGEMENT` tools.
15. Extend frontend team-run projection and streaming/hydration handlers so task-agent-identified payloads create scoped task-agent entities and settlement/offline cleanup removes them from active UI.
16. Update team/running views so the logical member can remain visible as a stable parent/template and active delegated task-agent instances render as indented child rows/cards underneath it. Settlement must remove the task-agent child, not the logical member parent, and task-agent conversations must not be stored in logical member rows.
17. Update docs/UI labels from task-plan polling toward delegation lifecycle and task-agent instances where in scope.

## Validation Strategy

- Unit tests for parser validation:
  - `delegate_tasks` rejects ambiguous/missing member_name;
  - `delegate_tasks` rejects stale task item fields `task_name`, `dependencies`, `completion_criteria`, and `expected_deliverables`;
  - task-agent execution `update_task_status` accepts only `status`, optional `message`, and optional `reference_files`; it rejects task selector fields such as `task_id` and `task_name`; original-delegator acceptance accepts `status: "accepted"` plus generated `task_id`.
- Unit tests for ledger/service transitions:
  - delegation creates stable records;
  - activation binds a task-agent instance to one task;
  - multiple delegated task records activate according to concurrency policy;
  - worker-reported completion records message/reference files, moves the task to awaiting acceptance, and emits completion payload with `task_id` plus task-agent identity;
  - original-delegator acceptance by `task_id` marks the task accepted and schedules settlement.
- Task-agent instance tests:
  - two runnable tasks for the same logical member allocate two distinct task-agent instance/run IDs;
  - `update_task_status` from one task-agent instance cannot update the other instance's task because task selection is derived from instance context;
  - settling one task-agent instance does not settle the sibling instance.
- Runtime projection tests:
  - Codex/Claude expose only `delegate_tasks` and `update_task_status` for the new surface;
  - old model-facing task tools are absent.
- Orchestration tests:
  - authorized delegator delegates to member;
  - task-agent instance receives full single-task packet with task-agent identity;
  - task-agent reports completed and remains addressable while awaiting acceptance;
  - original delegator receives completion notification with `task_id` plus task-agent identity;
  - if the delegator sends a revision request to that task-agent identity, the same task-agent receives it and can report completed again;
  - original delegator accepts by `task_id`;
  - task-agent instance settles after acceptance plus idle;
  - sibling task-agent instances for the same logical member remain active.
  - a non-coordinator member or task-agent instance can delegate to another member when authorized, and completion/failure notification routes back to that original delegator identity instead of assuming the coordinator.
- Live mixed-runtime E2E:
  - AutoByteus/LMStudio coordinator or another authorized delegator delegates to Codex worker;
  - Codex task-agent worker receives the work packet and calls `update_task_status`;
  - original delegator receives completion notification with generated `task_id` and task-agent identity, and team/coordinator history is updated;
  - Codex task-agent worker remains addressable after self-reported completion;
  - original delegator accepts by `task_id`;
  - Codex task-agent worker is observed as offline/settled/inactive after acceptance and idle settlement.
  - Browser/frontend state shows the logical `worker` member/template plus a distinct transient Codex task-agent child/entity while active.
  - After settlement/offline cleanup, that transient task-agent child/entity disappears from active member/agent UI while the logical `worker` parent remains visible/available and the completion remains visible through activity/history/notification.
  - The task-agent work packet/conversation is scoped to the task-agent entity and is not embedded as the logical worker's normal conversation.
  - if live cost/runtime permits, two independent tasks delegated to the same Codex logical member produce two distinct task-agent run IDs and settle independently.
- Frontend deterministic/unit coverage:
  - stream/status payloads with `task_agent_run_id` create/update a task-agent frontend entity keyed by run identity;
  - task-agent stream/tool/segment events route to the task-agent entity even when `member_route_key` equals a logical member;
  - offline/settlement cleanup removes only the settled task-agent entity, not the logical member template or sibling task-agent entities.
- Backend exposure validation:
  - a backend with unsupported task-agent/per-member settlement does not expose the new task-delegation tools as a supported path;
  - if native AutoByteus pure-team exposure is enabled, its settlement path is implemented and covered.

## Open Implementation Decisions

- Whether to physically rename/move existing `TaskPlan` domain classes in this ticket or wrap them behind `TaskDelegationLedger` first. Recommendation: wrap first if that reduces risk, but do not expose task-plan tools.
- Whether terminal statuses should include `blocked` in addition to `completed`/`failed`. Recommendation: first ticket uses `completed`/`failed`; use `failed` with reason for blocked/unable-to-complete cases unless product wants a third terminal state.
- Whether completion notification should always start/resume the original delegator or only emit an event if that delegator is not running. Recommendation: emit event always; post a system message to the original delegator when reachable, and keep team/coordinator-visible history as fallback.
- Native AutoByteus pure-team decision is no longer open from a requirement perspective: either implement task-agent/per-member settlement before exposing task delegation there, or gate task delegation off for pure native teams in this ticket.
- Initial same-member concurrency limit remains an implementation decision. Recommendation: support the identity model and at least a test-configurable limit of `2`; production default can be conservative, but must not remove the ability to run multiple instances where policy allows.
