# Design Spec

## Current-State Read

The current repository has two different levels of tool ownership:

- Browser tools under `autobyteus-server-ts/src/agent-tools/browser/*` already use a healthy server-owned pattern: canonical contracts, parameter specs, input parsers, a manifest, a shared service, and thin runtime projections for Codex/Claude/native wrappers.
- Task tools under `autobyteus-ts/src/task-management/tools/task-tools/*` are still local `BaseTool` implementations. They mutate `context.customData.teamContext.state.taskPlan`, so the behavior is tied to native AutoByteus context and cannot be cleanly reused by server-managed Codex/Claude/future runtimes.
- Existing native task activation exists in `SystemEventDrivenAgentTaskNotifier` and `TaskActivator`: task-plan events are observed, runnable tasks are found, tasks are marked `QUEUED`, and target members receive a generic activation message telling them to check their queue.
- Server-managed team backends expose `postMessage`, `deliverInterAgentMessage`, approvals, `interruptMember`, and whole-team `terminate`, but they do not expose a clean per-member “settle/terminate after task completion” boundary.
- Mixed AutoByteus standalone members currently filter out task-management tools (`autobyteus-mixed-tool-exposure.ts`), which is direct evidence that the current task tool surface is not safe as a cross-runtime team mechanism.
- Current server-managed team managers also assume one active runtime per logical member route key. Codex/Claude managers store active runs as `Map<memberRouteKey, AgentRun>`, mixed stores one handle per route key, and the implemented task-delegation activation coordinator groups runnable work by assignee route key. That shape is not sufficient for the refined model where two independent tasks assigned to the same logical member can run as two task-agent instances in parallel.

The user-refined target is not task-plan polling. It is delegation:

- `send_message_to` remains a free-form conversation tool.
- `delegate_tasks` is bounded work delegation with lifecycle.
- A task-agent instance receives the concrete work packet, reports terminal status with an optional message and reference files, then exits/settles when its bound task work is terminal and the turn is idle.
- The coordinator/delegator receives terminal task results by framework notification, not by polling task status.
- A logical team member is a reusable worker template. A delegated task may start a task-scoped agent instance of that logical member. Multiple independent tasks assigned to the same logical member may therefore run in multiple task-agent instances, each with its own task packet, runtime identity, terminal status, and exit lifecycle.

## Intended Change

Replace the model-facing task-management surface with a server-owned task-delegation surface:

- Add model-facing `delegate_tasks` for coordinator/delegator-to-member work delegation.
- Add model-facing `update_task_status` for task-agent progress/final reporting.
- Do not expose `create_task`, `create_tasks`, `get_my_tasks`, `get_task_plan_status`, or `assign_task_to` in the new model-facing surface.
- Maintain an internal authoritative delegation ledger/task-state store for correlation, activation, terminal notification, optional messages, reference files, audit/history, and auto-settlement.
- Activate task-agent instances with a task-specific work packet that includes the rich task description, optional reference files, and status-update instructions. Internal task and task-agent instance identities remain available in context/events for authorization, UI, and debugging; the worker does not need to copy them into tool calls.
- Notify the coordinator/delegator when a delegated task reaches a terminal status.
- Settle/exit the task-agent instance after terminal status is safely processed and that instance's current turn is idle. For every supported runtime/backend path, this is mandatory sub-agent lifecycle behavior, not an optional optimization.
- Introduce a task-agent instance identity below the logical member route. `member_name` selects the logical member/template; activation creates one task-agent instance per runnable task by default, subject to concurrency policy.

## Downstream Requirement Clarification: Mandatory Sub-Agent Settlement

API/E2E validation raised a requirement clarification on 2026-05-29 because the user treats delegated task workers as sub-agents: after their assigned delegated task reaches terminal status and no more work remains, they must exit/settle. The design decision is:

1. **Codex, Claude, and Mixed server-managed task-delegation paths:** a delegated task-agent instance must settle/exit after its terminal task once the current turn is idle/offline and the delegation ledger reports no remaining work bound to that instance. This is a hard acceptance criterion.
2. **Live mixed-runtime E2E:** the E2E must assert that the Codex task-agent instance reaches offline/settled/inactive state after terminal `update_task_status` completion. Proving only coordinator notification is insufficient.
3. **Native AutoByteus pure-team backend:** leaving per-instance/per-member settlement unsupported is acceptable only if native pure-team task delegation is not exposed/claimed as a supported path in this ticket. If pure AutoByteus team members can use the new `delegate_tasks`/`update_task_status` workflow, then `UNSUPPORTED_RUNTIME_COMMAND` from settlement is a requirement gap that must be fixed or the exposure must be gated off.
4. **Instruction wording:** runtime instructions, work packets, durable docs, and acceptance text must say the framework `will`/`must` settle or exit the final task-agent instance for supported paths. Wording such as `may settle` is not acceptable for the supported delegation workflow.

This clarification does not change the safe-turn rule: settlement must still not happen inline inside `update_task_status`. The correct sequence remains terminal state accepted -> tool result/events/notifications delivered -> task-agent instance becomes idle/offline -> settlement coordinator calls the backend task-agent lifecycle boundary.

## Downstream Requirement Clarification: Task-Agent Instance Model

The user further clarified on 2026-05-29 that a task-delegated worker should be understood as a task agent: if the coordinator delegates multiple independent tasks to the same team member, the framework should be able to start multiple instances of that member, one per task, so those tasks can run in parallel. The logical member remains part of the team; each task-agent instance is the short-lived runtime that executes one delegated task and exits when finished.

Design decision:

1. **Identity split:** `memberRouteKey`/member name identifies the logical member/template. A new task-agent instance/run identity identifies the concrete runtime executing one delegated task.
2. **Activation unit:** default activation is one runnable delegated task -> one task-agent instance. The work packet is single-task and focused on the rich description/reference files; internal task identity plus task-agent instance identity are carried by context/events for UI/history/debug visibility.
3. **Parallelism:** multiple task-agent instances of the same logical member may run concurrently when tasks are independent and the member's concurrency policy allows it. The initial implementation may use a conservative concurrency limit, but the identity model must not collapse back to one active runtime per logical member.
4. **Tool binding:** `update_task_status` must derive the task from caller task-agent instance identity. The model-facing tool call does not pass `task_id` or `task_name`. Two instances of the same logical member cannot update each other's tasks accidentally.
5. **Settlement:** settlement targets the task-agent instance, not the logical member template. Exiting one completed task-agent instance must not terminate another running instance of the same logical member.
6. **Status/UI/history:** events and status snapshots should carry both logical member identity and task-agent instance identity so parallel workers are distinguishable.

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
- If the cap is reached, additional ready tasks remain unactivated until an active task-agent reaches terminal state and settles.
- Batching several independent tasks into one packet is not the default; batching may exist later only as an explicit policy with different settlement semantics.

### Status Update Binding

`update_task_status` validation becomes:

1. Caller context includes a task-agent instance identity/run ID.
2. The ledger has exactly one active delegated task bound to that task-agent instance.
3. `context.caller.logicalMemberRouteKey` matches the record target logical member route.
4. The tool input contains only status plus optional `message` and `reference_files`; task selectors such as `task_id`, `task_name`, or task title are rejected.

This prevents two parallel instances of `worker` from completing each other's tasks.

### Settlement Binding

`TaskDelegationSettlementCoordinator` should key pending settlement by `taskAgentRunId`, not by logical member route. It listens for idle/offline events whose payload contains that concrete run ID, then calls `TeamRun.settleTaskAgentInstance(logicalMemberRouteKey, taskAgentRunId, reason)`.

The no-current-work check is instance-specific. For the default one-task-per-instance model, terminal task accepted + idle is enough. If future batching is enabled, the ledger checks that no non-terminal task remains bound to the same task-agent instance.

### Event And Status Projection

Team events and status snapshots should expose both subjects:

- logical member: `memberName`, `memberPath`, `memberRouteKey`;
- concrete task agent: `taskAgentInstanceId`, `taskAgentRunId`, `taskId`;
- display name can be derived, e.g. `worker#task_0007`.

It is valid for `getMemberStatusSnapshots()` to return multiple active rows with the same `member_route_key` as long as `agent_id`/`task_agent_instance_id` differ. The team status aggregator should treat those rows as independent active runtimes.

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
- Design response:
  - Introduce a server-owned `TaskDelegationService` as the authoritative boundary.
  - Hide the internal task/delegation ledger from model-facing tools.
  - Replace polling/query tools with push activation and push completion notification.
  - Add task-agent instance identity below logical member identity.
  - Add safe task-agent settlement after terminal status and idle.
- Refactor rationale:
  - Directly adding more runtime-specific `create_tasks`/`get_my_tasks` variants would preserve the current boundary problem.
  - A task-plan polling surface contradicts the intended delegation semantics and wastes model/tool calls.
  - Keeping one active runtime per logical member would make same-member parallel delegation impossible and would blur the subject identity of `update_task_status`.
- Intentional deferrals and residual risk, if any:
  - General streamable HTTP/stdio MCP exposure is deferred. This ticket creates the canonical service that future MCP can adapt.
  - Durable persistence of the delegation ledger can be deferred if the current team-run lifetime model is in-memory; the design keeps the ledger behind one owner so persistence can be added later without changing model tools.

## Terminology

- `Task delegation`: a bounded work assignment from one team member, usually the coordinator, to another member.
- `Logical member`: the named team member in the team definition, used as the reusable worker template selected by `member_name`.
- `Task-agent instance`: the short-lived runtime/session started from a logical member template to execute one delegated task.
- `Delegation ledger`: internal authoritative state for delegated work records. This replaces model-facing “task plan” semantics, but may initially reuse existing task-plan data structures behind the service boundary.
- `Work packet`: the activation message content sent to a task-agent instance for one delegated task.
- `Terminal status`: `completed` or `failed` for the first simplified model-facing protocol.
- `Settling/exiting task agent`: stopping/terminating the task-agent instance after the delegated work turn is safely idle, without terminating the whole team or the reusable logical member template.

## Design Reading Order

Read this design in this order:

1. data-flow spines;
2. ownership and boundary split;
3. model-facing tool surface;
4. internal ledger and event/notification behavior;
5. runtime projection and lifecycle mapping;
6. removal/decommission plan.

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
| DS-001 | Primary End-to-End | Coordinator calls `delegate_tasks` | Target member receives task work packet | `TaskDelegationService` | Main delegation path. |
| DS-002 | Primary End-to-End | Task-agent calls `update_task_status` | Delegator/coordinator receives terminal result | `TaskDelegationService` | Main completion/failure reporting path. |
| DS-003 | Return/Event | `delegate_tasks` creates multiple independent tasks | Runnable task-agent instances activated | `TaskDelegationActivationCoordinator` served by `TaskDelegationService` | Supports multi-task delegation without legacy `create_tasks`. |
| DS-004 | Return/Event | Terminal status update + task-agent idle event | Task-agent instance runtime settled/exited | `TaskDelegationSettlementCoordinator` + `TeamRun` lifecycle boundary | Prevents task agents from staying alive after bounded work. |
| DS-005 | Bounded Local | Runtime bootstrap for a team member | Delegation protocol and tools become available | Runtime-specific task-delegation projection builders | Ensures current runtimes see the same canonical tool semantics. |
| DS-006 | Primary/Concurrency | Multiple runnable tasks assigned to one logical member | Multiple task-agent instances running under that logical member | `TaskDelegationActivationCoordinator` + backend instance registry | Enables parallel same-member task delegation. |

## Primary Execution Spine(s)

- DS-001: `delegate_tasks tool call -> runtime projection -> TaskDelegationToolService -> TaskDelegationService -> DelegationLedger -> TaskDelegationActivationCoordinator -> TeamRun.startTaskAgentInstance(logical member, task) -> task-agent receives work packet`
- DS-002: `update_task_status tool call -> runtime projection -> TaskDelegationToolService -> TaskDelegationService -> DelegationLedger terminal transition -> TaskDelegationCompletionNotifier -> TeamRun.postMessage(coordinator/delegator)`
- DS-004: `terminal transition -> TaskDelegationSettlementCoordinator pending-settlement -> task-agent idle team event -> TeamRun.settleTaskAgentInstance/settleMemberInstance -> backend runtime termination`
- DS-006: `same logical member has N runnable tasks -> activation coordinator applies concurrency policy -> creates N task-agent instance identities -> backend runs N independent task agents -> each settles independently`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | A coordinator/delegator calls `delegate_tasks`. The tool projection validates runtime shape and delegates to the server-owned service. The service creates ledger records, identifies runnable work, creates task-agent instance identities, renders single-task work packets, and starts task-agent instances from logical member templates. | Tool projection, tool service, task delegation service, ledger, activation coordinator, team run. | `TaskDelegationService` | Member resolution, task-agent instance creation, work-packet rendering, event publishing. |
| DS-002 | A task-agent instance calls `update_task_status` with status and optional result context. The service resolves the bound task from caller task-agent identity, mutates the ledger, records optional message/reference files, emits events, and notifies the delegator/coordinator on terminal status. | Tool projection, tool service, task delegation service, ledger, completion notifier, team run. | `TaskDelegationService` | Reference-file validation, notification rendering, team event projection. |
| DS-003 | When one `delegate_tasks` call contains multiple independent task items, the service creates separate records and activates each runnable task via the task-agent instance path. | Ledger, activation coordinator. | `TaskDelegationActivationCoordinator` | Duplicate activation prevention, per-member concurrency limits. |
| DS-004 | Terminal updates do not stop the task agent inline. The settlement coordinator records pending settlement and waits for the task-agent instance to become idle, then asks the team runtime lifecycle boundary to settle only that instance. | Settlement coordinator, team run, backend team manager/member instance handle. | `TaskDelegationSettlementCoordinator` + `TeamRun` | Safe idle detection, coordinator/root protection, no whole-team termination, no sibling-instance termination. |
| DS-005 | Runtime bootstrap injects general delegation protocol instructions and exposes the same canonical tools through Codex dynamic tools, Claude in-process MCP tools, and native wrappers if needed. | Projection builders, instruction composer, model runtime. | Runtime projection builders served by `TaskDelegationToolService` | Tool schema conversion, runtime approval behavior, tool-name normalization. |
| DS-006 | If multiple runnable tasks target the same logical member, the activation coordinator starts separate task-agent instances up to that member's concurrency limit. Each instance receives one task packet and exits independently. | Ledger, activation coordinator, backend instance registry, task-agent runtime. | `TaskDelegationActivationCoordinator` + backend manager | Concurrency policy, instance identity generation, status disambiguation. |

## Spine Actors / Main-Line Nodes

- `delegate_tasks` / `update_task_status` tool projections: runtime-specific entry wrappers.
- `TaskDelegationToolService`: canonical model-tool execution adapter around the service.
- `TaskDelegationService`: authoritative orchestration boundary for delegation creation and status transitions.
- `TaskDelegationLedger`: internal state owner for delegated records.
- `TaskDelegationActivationCoordinator`: owns work-packet activation sequencing.
- `TaskAgentInstanceRegistry` / backend member-instance registry: owns active task-agent runtime lookup by instance identity.
- `TaskDelegationCompletionNotifier`: owns coordinator/delegator notification payloads and delivery.
- `TaskDelegationSettlementCoordinator`: owns delayed safe task-agent instance settlement.
- `TeamRun` / backend `TeamManager`: owns logical member messaging and task-agent runtime lifecycle.

## Ownership Map

- Runtime projections own only schema conversion, runtime result format, and runtime-specific approval/event glue. They must not own delegation business semantics.
- `TaskDelegationToolService` owns canonical parsing/serialization around model-facing tools. It must delegate state changes to `TaskDelegationService`.
- `TaskDelegationService` owns delegation invariants: who can delegate, who can update, valid transitions, terminal notifications, and settlement decisions.
- `TaskDelegationLedger` owns record storage and atomic state reads/writes for one team run. It does not deliver messages or stop runtimes.
- `TaskDelegationActivationCoordinator` owns activation work-packet send decisions, task-agent instance creation requests, duplicate activation suppression, and per-logical-member concurrency gating.
- Backend task-agent instance registry owns active concrete runtime instances. It must allow multiple instances for one logical member route key and must key operations by task-agent instance/run identity.
- `TaskDelegationCompletionNotifier` owns completion/failure message rendering and coordinator/delegator notification delivery.
- `TaskDelegationSettlementCoordinator` owns safe-exit scheduling and waits for task-agent runtime idle before calling lifecycle APIs.
- `TeamRun`/backend managers own actual runtime post/settle operations.

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
| Model-facing `get_task_plan_status` | Coordinator receives terminal notifications instead of polling. | Team events/UI/internal debug query. | In This Change | If UI needs status, use internal API, not model tool. |
| `assign-task-to.ts` as task tool | Mixes task creation and direct message delivery. | `delegate_tasks` for bounded work; `send_message_to` for conversation. | In This Change | If needed later, implement as explicit orchestration tool, not pure task service. |
| Model-facing `DelegateTasksInput.task_name` | The user wants the delegation call to carry only target member and task details; server-generated task identity is sufficient. | Internal generated `task_id` and optional derived display label from `description`. | In This Change | Remove from `task-delegation-record.ts` input type, parameter schema, parser, projections, examples, and tests. Parser should reject stale calls that include it. |
| Model-facing `DelegateTasksInput.dependencies` | Dependency authoring is not in the simplified first-ticket schema and conflicts with the minimal work-packet interface. | Future dependency feature ticket with an intentionally designed API, if needed. | In This Change | Remove from `task-delegation-record.ts` input type, `task-delegation-tool-parameter-schemas.ts`, `task-delegation-tool-input-parsers.ts`, runtime projections, and tests. Parser should reject stale calls that include it rather than silently accepting it. |
| Model-facing `DelegateTasksInput.completion_criteria` | The user explicitly wants success conditions in the rich `description`, not a separate model-facing field. | `description` field guidance. | In This Change | Remove from contract/schema/parser/work-packet renderer/projection tests. |
| Model-facing `DelegateTasksInput.expected_deliverables` | The user explicitly rejected a separate expected-deliverables field; expected output guidance belongs in `description`. | `description` field guidance; terminal `update_task_status.reference_files` records produced/important artifact references. | In This Change | Do not reintroduce a structured deliverables object; use optional status `message` plus `reference_files`. |
| `update_task_status` task selectors (`task_id`, `task_name`, title) | The bound task-agent instance already identifies exactly one delegated task in the simplified model. | Caller task-agent instance/run identity from tool context. | In This Change | Contract/parser/service must reject selector fields and resolve the task internally. |
| Generic task activation message asking worker to check queue | Contradicts push work-packet model. | `TaskDelegationWorkPacketRenderer`. | In This Change | Activation must include task details and update instructions. |
| Grouping independent runnable tasks by assignee into one activation packet | Collapses several parallel task-agent instances into one long-lived/member-level runtime. | One task-agent instance per runnable task selected by `TaskDelegationActivationCoordinator`. | In This Change If Parallel Task Agents Are In Scope | A later explicit batching policy may reintroduce batching with separate semantics. |
| Direct `context.customData.teamContext.state.taskPlan` mutation by tools | Runtime-local and unsafe for server-managed/mixed teams. | `TaskDelegationService`/ledger boundary. | In This Change | Authoritative Boundary Rule applies. |
| Active runtime maps keyed only by logical `memberRouteKey` for delegated task workers | Prevents multiple instances of the same logical member and makes settlement ambiguous. | Backend task-agent instance registry keyed by `taskAgentRunId`. | In This Change If Parallel Task Agents Are In Scope | The conversation/member route map may remain for `postMessage`/`send_message_to`. |

## Return Or Event Spine(s) (If Applicable)

- Terminal notification: `Ledger terminal transition -> TaskDelegationCompletionNotifier -> TeamRun event TASK_DELEGATION -> TeamRun.postMessage(coordinator/delegator)`.
- Multi-task activation: `delegate_tasks records created -> runnable records -> ActivationCoordinator -> task-agent instance start`.
- Settlement: `Ledger terminal transition -> pending settlement keyed by taskAgentRunId -> AGENT idle/status event for that run -> TeamRun.settleTaskAgentInstance`.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `TaskDelegationService`.
  - Chain: `delegate/update -> ledger mutation -> runnable task selection -> activation commands`.
  - Why: keeps activation policy in one owner rather than scattering across tool handlers and team managers.
- Parent owner: `TaskDelegationSettlementCoordinator`.
  - Chain: `terminal update -> pending settlement map keyed by taskAgentRunId -> task-agent idle event -> instance work check -> settle task-agent instance`.
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
| Completion notification rendering | DS-002 | Completion notifier | Render terminal result for coordinator/delegator. | Prevents coordinator polling and normalizes optional messages/reference files. | Status updates could be invisible to coordinator. |
| Runtime-specific schema conversion | DS-001, DS-002, DS-005 | Projection builders | Convert canonical parameter specs to Codex/Claude/native format. | Keeps tool logic transport-independent. | Duplicated runtime behavior. |
| Team event projection | DS-002, DS-003 | UI/history/event pipeline | Emit visible task-delegation events. | Provides durable UI/history visibility. | Model-facing status polling returns. |
| Safe idle detection | DS-004 | Settlement coordinator | Wait for current task-agent turn to complete before instance settlement. | Avoids interrupting tool result delivery. | Worker can be killed mid-tool-call. |
| Backend task-agent instance registry | DS-001, DS-004, DS-006 | Team backend manager | Store active task-agent handles by concrete run ID and project their events/status. | Current route-key maps cannot represent parallel same-member workers. | TeamRun or TaskDelegationService could reach into backend internals. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Canonical tool manifest/service pattern | `autobyteus-server-ts/src/agent-tools/browser/*` | Reuse pattern | Browser tools are the strongest local precedent. | N/A |
| Team member messaging/activation | `TeamRun.postMessage`, backend `TeamManager.postMessage` | Reuse for conversation only; add separate task-agent start API | Existing `postMessage` is correct for logical member/user/inter-agent messages, but it selects one route-key member and should not be overloaded for one-task-per-instance activation. | Need `startTaskAgentInstance` because current areas do not own task-agent instance identity. |
| Inter-agent free-form messaging | `send_message_to`/communication services | Reuse only for conversation, not delegation state | Semantics differ: conversation vs bounded task lifecycle. | Completion notifier should be framework-owned, not a user message tool call. |
| Task state primitives | `autobyteus-ts/src/task-management/*` | Reuse behind boundary or migrate | Current TaskPlan has status events and legacy dependency support. Status/event mechanics may be useful behind the boundary; dependency authoring/activation is deferred out of the first-ticket model-facing surface. | New service needed to own delegation semantics and safe settlement. |
| Task-agent runtime instances | `AgentRunManager` plus team backend managers | Extend | `AgentRunManager` can create multiple concrete runs with unique IDs; team backends must add dynamic task-agent instance registries. | Existing `memberRuns`/`handles` maps are keyed only by logical member route. |
| Member lifecycle | Team backend managers and mixed member handles | Extend/gate by backend | Need mandatory per-instance settlement for every supported task-delegation path; current whole-team terminate is too broad, and unsupported pure-team settlement cannot be exposed as supported delegation. | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-tools/task-delegation` | Canonical model-facing tool names, schemas, parsing, result serialization, tool service. | DS-001, DS-002, DS-005 | `TaskDelegationToolService` | Create New | Mirrors browser tool shape. |
| `agent-team-execution/task-delegation` | Delegation ledger, service, activation, task-agent identity allocation, completion notification, settlement. | DS-001..DS-004, DS-006 | `TaskDelegationService` | Create/Extend | Owns business semantics. |
| Team run backend layer | Task-agent start/settle lifecycle and active instance registry. | DS-001, DS-004, DS-006 | `TeamRun`/`TeamManager` | Extend/gate | Add task-agent instance lifecycle boundary; a backend that cannot start/settle instances must not expose parallel task delegation as supported. |
| Runtime projections | Codex/Claude/native tool exposure and protocol instructions. | DS-005 | Projection builders | Extend | No business logic. |
| UI/history/event streaming | Task-delegation event display. | DS-002, DS-003 | Event pipeline | Extend | Replace task-plan polling surface with event visibility. |

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
| `agent-team-execution/task-delegation/task-delegation-service.ts` | Delegation domain | Authoritative service | Delegate tasks, update statuses, enforce invariants, call coordinators. | Governing owner for business semantics. | Yes |
| `agent-team-execution/task-delegation/task-delegation-activation-coordinator.ts` | Delegation domain | Activation coordinator | Evaluate runnable records, apply concurrency policy, allocate task-agent instances, and start task agents. | Isolates activation policy. | Yes |
| `agent-team-execution/task-delegation/task-agent-concurrency-policy.ts` | Delegation domain | Concurrency policy | Decide how many task-agent instances may run per logical member. | Keeps policy out of ledger and backend maps. | Yes |
| `agent-team-execution/task-delegation/task-delegation-work-packet-renderer.ts` | Delegation domain | Renderer | Render task-agent activation message with exact update instructions. | Prompt content owner. | Yes |
| `agent-team-execution/task-delegation/task-delegation-completion-notifier.ts` | Delegation domain | Notifier | Emit team events and notify coordinator/delegator. | Separates notification from status transition. | Yes |
| `agent-team-execution/task-delegation/task-delegation-settlement-coordinator.ts` | Delegation domain | Settlement coordinator | Track pending settlement and settle when task-agent instance is idle/no bound work remains. | Prevents unsafe inline stop. | Yes |
| `agent-team-execution/task-delegation/task-delegation-run-registry.ts` | Delegation domain | Runtime binding registry | Bind active `TeamRun` to ledger/service/unsubscribers. | Avoids adding ad hoc fields to every runtime context. | Yes |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Delegated task identity and status | `task-delegation-record.ts` | Task delegation | Used by ledger, service, renderer, notifier, tests. | Yes | Yes | A generic task-plan DTO with unrelated optional fields. |
| Work-packet shape | `task-delegation-record.ts` or renderer-local type | Task delegation | Activation and tests need stable shape. | Yes | Yes | Prompt-only string without structured source data. |
| Completion notification payload | `task-delegation-record.ts` | Task delegation | Event and coordinator message share source payload. | Yes | Yes | Duplicate event vs message shapes. |
| Tool parameter specs | `task-delegation-tool-contract.ts` | Tool surface | Codex/Claude/native projections convert from same contract. | Yes | Yes | Runtime-specific schemas as source of truth. |
| Logical member vs task-agent identity | `task-agent-instance-identity.ts` | Task delegation | Used by ledger, activation, runtime context builders, status/events, and settlement. | Yes | Yes | Overloading `memberRunId` without preserving logical template identity. |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Parallel / Overlapping Representation Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `TaskDelegationRecord` | Yes | Yes | Medium | Store logical member/delegator identities and, after activation, exactly one bound task-agent instance identity for default one-task-per-instance mode. |
| `TaskAgentInstanceIdentity` | Yes | Yes | Low | Keep `taskAgentInstanceId`, `taskAgentRunId`, `taskId`, and logical member identity distinct; do not use one generic `memberRunId` for both template and instance. |
| `DelegateTasksInput` | Yes | Yes | Low | Keep the model-facing envelope minimal: `member_name`, rich `description`, optional `reference_files`. Do not add separate `task_name`, `completion_criteria`, `expected_deliverables`, or dependency fields in the first-ticket tool schema. Use `member_name` consistently and resolve to logical route key internally. |
| `UpdateTaskStatusInput` | Yes | Yes | Low | Keep the model-facing envelope minimal: `status`, optional `message`, optional `reference_files`. Do not accept `task_id`, `task_name`, or other task selector fields; resolve the task from caller task-agent instance context. |
| `TaskDelegationCompletionPayload` | Yes | Yes | Low | Use one payload for team event and coordinator message rendering. |

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
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-completion-notifier.ts` | Delegation domain | Notifier | Coordinator/delegator notification and event payload. | Push completion owner. | Yes |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-settlement-coordinator.ts` | Delegation domain | Settlement | Pending settlement, idle listener, no-remaining-work gate. | Prevents inline termination. | Yes |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-run-registry.ts` | Delegation domain | Runtime binding | Attach/detach delegation services to active team runs. | Central lifecycle registration. | Yes |
| `autobyteus-server-ts/src/agent-team-execution/services/member-run-instruction-composer.ts` | Runtime instruction composition | Delegation protocol instructions | Inject mandatory task-delegation lifecycle wording into member runtime instructions. | One owner for static task protocol text. | Yes |
| `autobyteus-server-ts/src/agent-team-execution/domain/task-agent-instance.ts` or colocated backend-domain file | Team runtime domain | Runtime instance contract | `StartTaskAgentInstanceRequest`, task-agent status/event identity. | Shared by TeamRun and backends. | Yes |
| `autobyteus-server-ts/src/agent-team-execution/backends/common/task-agent-runtime-registry.ts` | Backend common | Task-agent registry helper | Shared map/lookup/cleanup semantics for task-agent runs where Codex/Claude can reuse it. | Prevents repeated map-by-run-id policy. | Yes |
| `autobyteus-server-ts/src/agent-team-execution/backends/codex/codex-task-agent-instance-registry.ts` | Codex backend | Codex task-agent instances | Create/restore/settle Codex task-agent AgentRuns by taskAgentRunId. | Keeps Codex-specific runtime setup out of core service. | Yes |
| `autobyteus-server-ts/src/agent-team-execution/backends/claude/claude-task-agent-instance-registry.ts` | Claude backend | Claude task-agent instances | Create/restore/settle Claude task-agent AgentRuns by taskAgentRunId. | Keeps Claude-specific runtime setup out of core service. | Yes |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-task-agent-instance-registry.ts` | Mixed backend | Mixed task-agent instances | Multiple same-logical-member handles keyed by taskAgentRunId. | Current mixed registry is route-key only. | Yes |
| `autobyteus-server-ts/src/agent-team-execution/backends/autobyteus/autobyteus-team-run-backend.ts` | Native team backend | Native task-agent/per-member lifecycle support or exposure gate | Either implement settlement or ensure new task delegation is not exposed as supported for pure native teams. | Prevents `UNSUPPORTED_RUNTIME_COMMAND` from violating sub-agent semantics. | Yes |

## Ownership Boundaries

The authoritative boundary for model-facing task work is `TaskDelegationService`, not `TaskPlan`, not runtime projections, and not MCP transport. Any caller above the task-delegation subsystem must call `delegateTasks` or `updateTaskStatus` on the service/tool service, not directly mutate ledger records.

The authoritative boundary for runtime lifecycle remains `TeamRun`/backend `TeamManager`. The activation and settlement coordinators decide that a task-agent instance should start or settle, but they must request that through explicit `TeamRun` APIs, not by reaching into backend runtime maps. Logical member conversations and task-agent instances are different subjects under this boundary.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `TaskDelegationService` | Ledger, activation coordinator, completion notifier, settlement coordinator. | Tool service, future MCP endpoint, tests above subsystem. | Runtime handler writes ledger or posts activation directly. | Add explicit service command/query. |
| `TaskDelegationToolService` | Parser/serializer plus service call. | Runtime projections. | Runtime-specific business logic. | Extend manifest/service result contract. |
| `TeamRun` task-agent lifecycle API | Backend managers/task-agent instance registries. | Activation coordinator, settlement coordinator. | Task delegation reaches into `memberRuns`/handle maps or uses `postMessage` to imply task-agent creation. | Add `startTaskAgentInstance` and `settleTaskAgentInstance` on `TeamRun` and `TeamManager`. |
| Backend task-agent instance registry | Concrete `AgentRun`s/handles and event subscriptions by `taskAgentRunId`. | Backend manager. | One route-key map stores both conversation runs and task-agent runs. | Split conversation route registry from task-agent run registry. |
| `TaskDelegationWorkPacketRenderer` | Prompt/message content format. | Activation coordinator. | Hand-building activation prompts in multiple backends. | Add renderer options/sections. |
| Runtime task-delegation exposure gate | Backend task-agent settlement capability. | Runtime projection builders/tool exposure composition. | Exposing `delegate_tasks` for a backend whose task-agent settlement returns unsupported. | Implement backend settlement or hide/gate task-delegation tools for that backend. |

## Dependency Rules

Allowed:

- Runtime projections -> `TaskDelegationToolService`.
- `TaskDelegationToolService` -> `TaskDelegationService`.
- `TaskDelegationService` -> ledger/coordinators under task-delegation subsystem.
- Task-delegation coordinators -> `TeamRun` public APIs.
- Backend task-agent instance registries -> `AgentRunManager`.
- UI/history/event pipeline -> task-delegation event payloads.

Forbidden:

- Runtime projections directly accessing `TaskPlan`, ledger, team manager member maps, or notification internals.
- `update_task_status` handler stopping the task-agent runtime inline.
- `delegate_tasks` using `send_message_to` model-tool code or generic `postMessage` as the task-agent activation primitive.
- Workers polling `get_my_tasks` or coordinator polling `get_task_plan_status` as part of the normal flow.
- Exposing both `create_tasks` and `delegate_tasks` model-facing names in the new surface.
- Exposing the supported task-delegation tool surface for a backend that cannot settle a final task-agent instance.
- Runtime or work-packet instructions saying the framework "may settle" the final task-agent instance in a supported delegation path.
- Keying delegated-task worker lifecycle only by logical `memberRouteKey` when multiple task-agent instances can exist for that member.
- Preserving stale model-facing `delegate_tasks` fields `task_name`, `dependencies`, `completion_criteria`, or `expected_deliverables`.
- Allowing `update_task_status` to select work by model-facing fields such as `task_id`, `task_name`, or title; task-agent instance context is the selector.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `delegateTasks(context, input)` | Delegated task records | Create internal records, evaluate readiness, activate task-agent instances. | `teamRunId`, delegator identity from context; `member_name` resolves to logical member identity; server generates task identity. | Context supplies delegator and generated IDs; not user args. |
| `startTaskAgentInstance(request)` | One concrete task-agent runtime | Start a runtime instance for one delegated task from a logical member template. | `teamRunId + logicalMemberRouteKey + taskId + taskAgentInstanceId + taskAgentRunId`. | Do not use for free-form `send_message_to`. |
| `updateTaskStatus(context, input)` | One delegated task status | Resolve bound task from caller task-agent context, mutate status/message/reference files, notify and settle on terminal. | Caller logical member route plus task-agent instance/run identity; input carries no task selector. | Reject model-facing `task_id`, `task_name`, or title selectors. |
| `settleTaskAgentInstance(logicalMemberRouteKey, taskAgentRunId, reason)` | One task-agent runtime | Safely stop one concrete task-agent instance. | Logical member route key plus concrete task-agent run ID. | Not whole-team terminate and not sibling-instance terminate. |
| `settleMember(target, reason)` or `terminateMember(target, reason)` | One logical conversation/member runtime | Safely stop one normal member runtime where applicable. | Explicit member route key and optional run ID. | Separate from task-agent instance settlement. |
| `renderWorkPacket(record)` | Activation message | Render one task's details, task-agent identity, and lifecycle instruction. | One structured task record plus bound task-agent instance identity. | Default output is single-task, not a batch. |
| `notifyTerminalStatus(payload)` | Coordinator/delegator notification | Emit event and optionally post message to coordinator/delegator. | Stored delegator identity, coordinator fallback. | No coordinator polling. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `delegateTasks` | Yes | Yes | Medium | Resolve member names once to logical member identity; reject ambiguous names; generate task identity internally. |
| `startTaskAgentInstance` | Yes | Yes | Low | Require logical route plus generated task-agent instance/run identity. |
| `updateTaskStatus` | Yes | Yes | Low | Resolve task from caller's task-agent instance/run identity; reject explicit task selector fields. |
| `settleTaskAgentInstance` | Yes | Yes | Low | Require logical route and concrete task-agent run ID; run ID protects sibling instances. |
| `settleMember` | Yes | Yes | Low | Keep for normal member/conversation runtime or legacy backend lifecycle; do not use as the only task-agent identity. |
| `notifyTerminalStatus` | Yes | Yes | Medium | Store delegator identity at delegation time; fallback to coordinator route. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Model-facing coordinator tool | `delegate_tasks` | Yes | Low | Use this name instead of `create_tasks`. |
| Worker status tool | `update_task_status` | Yes | Low | Keep; ensure it uses caller task-agent binding, not task selectors. |
| Internal state | `TaskDelegationLedger` | Yes | Low | Avoid exposing “task plan” to agents. |
| Runtime worker | `TaskAgentInstance` | Yes | Low | Use for concrete task-scoped runtime, not for logical member template. |
| Team template | `LogicalMember` | Yes | Low | Use for team-definition member selected by `member_name`. |
| Activation content | `TaskDelegationWorkPacket` | Yes | Low | Render from structured record. |
| Completion push | `TaskDelegationCompletionNotification` | Yes | Low | Use one payload for event/message. |

## Applied Patterns (If Any)

- Browser tool manifest/service/projection pattern: reused for `agent-tools/task-delegation` so schemas and execution logic are runtime-neutral.
- Event-driven orchestration: terminal status updates drive coordinator notification and delayed settlement.
- Runtime instance registry: backend-owned dynamic task-agent registries allow several concrete `AgentRun`s under one logical member.
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

The schema description should also make sequencing explicit: `delegate_tasks` is for ready-to-run work. If task B depends on task A, the coordinator should delegate task A, wait for the framework completion notification, then call `delegate_tasks` for task B. Do not reintroduce a model-facing `dependencies` field in this first-ticket surface.

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

`update_task_status` is called by a task-agent instance that is already bound to exactly one delegated task. The model-facing input must therefore avoid task selectors and keep only status plus optional result context.

```ts
type UpdateTaskStatusInput = {
  status: "in_progress" | "completed" | "failed";
  message?: string;
  reference_files?: string[];
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
4. Include a short message and reference_files, if useful, when reporting terminal status.
5. After terminal status is accepted, the framework will notify the delegator and must settle this task-agent instance once this turn is idle.
```

### Parallel same-member delegation shape

If the coordinator delegates two independent tasks to `implementation_engineer`, the ledger should bind two task-agent instances:

```text
task_0007 -> logical member implementation_engineer -> task_agent_task_0007 -> run implementation_engineer_task_0007_<hash>
task_0008 -> logical member implementation_engineer -> task_agent_task_0008 -> run implementation_engineer_task_0008_<hash>
```

Both task agents can run concurrently if concurrency policy allows. When `task_0007` completes, only `task_agent_task_0007` settles; `task_agent_task_0008` keeps running.

### Terminal completion notification to coordinator/delegator

```text
Delegated task completed.

Task: Implement the server-owned TaskDelegationService... (derived)
Target member: implementation_engineer
Status: completed
Message: Implemented service, projections, and tests.
Reference files:
- /path/to/implementation-handoff.md
- /path/to/test.log
```

## Migration / Refactor Sequence

1. Add/tighten task-delegation domain models, including `LogicalMemberIdentity` and `TaskAgentInstanceIdentity`.
2. Update the ledger so records are assigned to logical members at creation and bound to task-agent instance identity at activation.
3. Remove stale model-facing task item fields from `DelegateTasksInput` and all projections/parsers/tests: `task_name`, `dependencies`, `completion_criteria`, and `expected_deliverables`. Make the parser strict enough that stale calls with these fields do not silently succeed.
4. Add task-agent concurrency policy and deterministic task-agent run-id generation.
5. Add explicit `TeamRun.startTaskAgentInstance` / backend task-agent start API. Do not use generic `postMessage` for task-agent activation.
6. Add backend task-agent instance registries for server-managed Codex/Claude/Mixed paths. Keep normal logical-member conversation routing separate.
7. Add activation work-packet renderer and activation coordinator that starts one task-agent instance per selected runnable task; test no `get_my_tasks` instruction is needed.
8. Add completion notifier and task-delegation team event payloads carrying logical member and task-agent instance identity; test coordinator notification on `completed`/`failed`.
9. Add settlement coordinator and task-agent instance settlement APIs on `TeamRun`/team managers/member handles; test delayed settlement after idle and no sibling-instance termination.
10. For each backend that will expose task delegation, either implement task-agent start/settlement or add an explicit exposure gate. Native AutoByteus pure-team must not expose supported delegation while task-agent/per-member settlement is unsupported.
11. Add canonical `agent-tools/task-delegation` manifest/service for `delegate_tasks` and `update_task_status`, including task-agent context binding and selector-free status updates.
12. Add Codex/Claude/native projections and general delegation protocol instruction injection; static protocol text must say the framework `will`/`must` settle the final task-agent, not `may`.
13. Remove/decommission legacy model-facing local task tools from registration/configured exposure.
14. Update tests for mixed teams so task delegation tools are available through server-owned projections instead of filtered local `ToolCategory.TASK_MANAGEMENT` tools.
15. Update docs/UI labels from task-plan polling toward delegation lifecycle and task-agent instances where in scope.

## Validation Strategy

- Unit tests for parser validation:
  - `delegate_tasks` rejects ambiguous/missing member_name;
  - `delegate_tasks` rejects stale task item fields `task_name`, `dependencies`, `completion_criteria`, and `expected_deliverables`;
  - `update_task_status` accepts only `status`, optional `message`, and optional `reference_files`; it rejects task selector fields such as `task_id` and `task_name`.
- Unit tests for ledger/service transitions:
  - delegation creates stable records;
  - activation binds a task-agent instance to one task;
  - multiple delegated task records activate according to concurrency policy;
  - terminal update records message/reference files and emits completion payload.
- Task-agent instance tests:
  - two runnable tasks for the same logical member allocate two distinct task-agent instance/run IDs;
  - `update_task_status` from one task-agent instance cannot update the other instance's task because task selection is derived from instance context;
  - settling one task-agent instance does not settle the sibling instance.
- Runtime projection tests:
  - Codex/Claude expose only `delegate_tasks` and `update_task_status` for the new surface;
  - old model-facing task tools are absent.
- Orchestration tests:
  - coordinator delegates to member;
  - task-agent instance receives full single-task packet with task-agent identity;
  - task-agent reports completed;
  - coordinator receives completion notification;
  - task-agent instance settles after idle;
  - sibling task-agent instances for the same logical member remain active.
- Live mixed-runtime E2E:
  - AutoByteus/LMStudio coordinator delegates to Codex worker;
  - Codex task-agent worker receives the work packet and calls `update_task_status`;
  - coordinator receives terminal notification;
  - Codex task-agent worker is observed as offline/settled/inactive after the terminal update and idle settlement.
  - if live cost/runtime permits, two independent tasks delegated to the same Codex logical member produce two distinct task-agent run IDs and settle independently.
- Backend exposure validation:
  - a backend with unsupported task-agent/per-member settlement does not expose the new task-delegation tools as a supported path;
  - if native AutoByteus pure-team exposure is enabled, its settlement path is implemented and covered.

## Open Implementation Decisions

- Whether to physically rename/move existing `TaskPlan` domain classes in this ticket or wrap them behind `TaskDelegationLedger` first. Recommendation: wrap first if that reduces risk, but do not expose task-plan tools.
- Whether terminal statuses should include `blocked` in addition to `completed`/`failed`. Recommendation: first ticket uses `completed`/`failed`; use `failed` with reason for blocked/unable-to-complete cases unless product wants a third terminal state.
- Whether completion notification should always start/resume coordinator or only emit event if coordinator is not running. Recommendation: emit event always; post a system message to the delegator/coordinator when reachable, because the user expects push notification.
- Native AutoByteus pure-team decision is no longer open from a requirement perspective: either implement task-agent/per-member settlement before exposing task delegation there, or gate task delegation off for pure native teams in this ticket.
- Initial same-member concurrency limit remains an implementation decision. Recommendation: support the identity model and at least a test-configurable limit of `2`; production default can be conservative, but must not remove the ability to run multiple instances where policy allows.
