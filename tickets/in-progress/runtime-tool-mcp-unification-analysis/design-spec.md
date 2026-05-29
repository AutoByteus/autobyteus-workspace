# Design Spec

## Current-State Read

The current repository has two different levels of tool ownership:

- Browser tools under `autobyteus-server-ts/src/agent-tools/browser/*` already use a healthy server-owned pattern: canonical contracts, parameter specs, input parsers, a manifest, a shared service, and thin runtime projections for Codex/Claude/native wrappers.
- Task tools under `autobyteus-ts/src/task-management/tools/task-tools/*` are still local `BaseTool` implementations. They mutate `context.customData.teamContext.state.taskPlan`, so the behavior is tied to native AutoByteus context and cannot be cleanly reused by server-managed Codex/Claude/future runtimes.
- Existing native task activation exists in `SystemEventDrivenAgentTaskNotifier` and `TaskActivator`: task-plan events are observed, runnable tasks are found, tasks are marked `QUEUED`, and assignees receive a generic activation message telling them to check their queue.
- Server-managed team backends expose `postMessage`, `deliverInterAgentMessage`, approvals, `interruptMember`, and whole-team `terminate`, but they do not expose a clean per-member “settle/terminate after task completion” boundary.
- Mixed AutoByteus standalone members currently filter out task-management tools (`autobyteus-mixed-tool-exposure.ts`), which is direct evidence that the current task tool surface is not safe as a cross-runtime team mechanism.

The user-refined target is not task-plan polling. It is delegation:

- `send_message_to` remains a free-form conversation tool.
- `delegate_tasks` is bounded work delegation with lifecycle.
- A delegated assignee receives the concrete work packet, reports terminal status with deliverables, then exits/settles when no more delegated work remains.
- The coordinator/delegator receives terminal task results by framework notification, not by polling task status.

## Intended Change

Replace the model-facing task-management surface with a server-owned task-delegation surface:

- Add model-facing `delegate_tasks` for coordinator/delegator-to-member work delegation.
- Add model-facing `update_task_status` for assignee progress/final reporting.
- Do not expose `create_task`, `create_tasks`, `get_my_tasks`, `get_task_plan_status`, or `assign_task_to` in the new model-facing surface.
- Maintain an internal authoritative delegation ledger/task-state store for correlation, dependency readiness, activation, terminal notification, deliverables, audit/history, and auto-settlement.
- Activate workers with a task-specific work packet that includes the exact `task_id` and status-update instructions.
- Notify the coordinator/delegator when a delegated task reaches a terminal status.
- Settle/exit the assignee after terminal status is safely processed and the current turn is idle, if no remaining runnable/queued/in-progress delegated work exists for that member.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Feature + behavior change + refactor.
- Current design issue found (`Yes`/`No`/`Unclear`): Yes.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary/ownership issue, missing lifecycle invariant, duplicated runtime projection risk, and legacy task-plan polling pressure.
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes.
- Evidence:
  - Task tools are local `BaseTool`s and read `context.customData.teamContext.state.taskPlan` directly.
  - Mixed server-managed teams filter task-management tools because they are not cross-runtime-safe.
  - Native task notification emits generic “check your queue” activation instead of a concrete work packet.
  - Team managers have member interrupt and whole-team terminate but not safe per-member task settlement.
- Design response:
  - Introduce a server-owned `TaskDelegationService` as the authoritative boundary.
  - Hide the internal task/delegation ledger from model-facing tools.
  - Replace polling/query tools with push activation and push completion notification.
  - Add per-member safe settlement after terminal status and idle.
- Refactor rationale:
  - Directly adding more runtime-specific `create_tasks`/`get_my_tasks` variants would preserve the current boundary problem.
  - A task-plan polling surface contradicts the intended delegation semantics and wastes model/tool calls.
- Intentional deferrals and residual risk, if any:
  - General streamable HTTP/stdio MCP exposure is deferred. This ticket creates the canonical service that future MCP can adapt.
  - Durable persistence of the delegation ledger can be deferred if the current team-run lifetime model is in-memory; the design keeps the ledger behind one owner so persistence can be added later without changing model tools.

## Terminology

- `Task delegation`: a bounded work assignment from one team member, usually the coordinator, to another member.
- `Delegation ledger`: internal authoritative state for delegated work records. This replaces model-facing “task plan” semantics, but may initially reuse existing task-plan data structures behind the service boundary.
- `Work packet`: the activation message content sent to an assignee for one or more runnable delegated tasks.
- `Terminal status`: `completed` or `failed` for the first simplified model-facing protocol.
- `Settling/exiting member`: stopping/terminating the member runtime after the delegated work turn is safely idle, without terminating the whole team.

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
| DS-001 | Primary End-to-End | Coordinator calls `delegate_tasks` | Assignee receives task work packet | `TaskDelegationService` | Main delegation path. |
| DS-002 | Primary End-to-End | Assignee calls `update_task_status` | Delegator/coordinator receives terminal result | `TaskDelegationService` | Main completion/failure reporting path. |
| DS-003 | Return/Event | Terminal status update | Downstream runnable tasks activated | `TaskDelegationActivationCoordinator` served by `TaskDelegationService` | Preserves dependency-driven continuation. |
| DS-004 | Return/Event | Terminal status update + member idle event | Assignee member runtime settled/exited | `TaskDelegationSettlementCoordinator` + `TeamRun` lifecycle boundary | Prevents workers from staying alive after bounded work. |
| DS-005 | Bounded Local | Runtime bootstrap for a team member | Delegation protocol and tools become available | Runtime-specific task-delegation projection builders | Ensures current runtimes see the same canonical tool semantics. |

## Primary Execution Spine(s)

- DS-001: `delegate_tasks tool call -> runtime projection -> TaskDelegationToolService -> TaskDelegationService -> DelegationLedger -> TaskDelegationActivationCoordinator -> TeamRun.postMessage(assignee)`
- DS-002: `update_task_status tool call -> runtime projection -> TaskDelegationToolService -> TaskDelegationService -> DelegationLedger terminal transition -> TaskDelegationCompletionNotifier -> TeamRun.postMessage(coordinator/delegator)`
- DS-004: `terminal transition -> TaskDelegationSettlementCoordinator pending-settlement -> member idle team event -> TeamRun.settleMember/terminateMember -> backend member runtime termination`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | A coordinator/delegator calls `delegate_tasks`. The tool projection validates runtime shape and delegates to the server-owned service. The service creates ledger records, resolves dependencies, identifies runnable work, renders an activation work packet, and posts it to the assignee. | Tool projection, tool service, task delegation service, ledger, activation coordinator, team run. | `TaskDelegationService` | Assignee resolution, dependency normalization, work-packet rendering, event publishing. |
| DS-002 | An assignee calls `update_task_status` with a stable task ID and status. The service validates caller ownership, mutates the ledger, records deliverables, emits events, and notifies the delegator/coordinator on terminal status. | Tool projection, tool service, task delegation service, ledger, completion notifier, team run. | `TaskDelegationService` | Deliverable validation, notification rendering, team event projection. |
| DS-003 | When a task becomes terminal, the service re-evaluates blocked/not-ready delegated tasks. Newly runnable delegated tasks are activated via the same work-packet path. | Ledger, dependency readiness evaluator, activation coordinator. | `TaskDelegationActivationCoordinator` | Duplicate activation prevention, grouped per-assignee activation. |
| DS-004 | Terminal updates do not stop the worker inline. The settlement coordinator records pending settlement and waits for the member to become idle, then asks the team runtime lifecycle boundary to settle only that member. | Settlement coordinator, team run, backend team manager/member handle. | `TaskDelegationSettlementCoordinator` + `TeamRun` | Safe idle detection, coordinator/root protection, no whole-team termination. |
| DS-005 | Runtime bootstrap injects general delegation protocol instructions and exposes the same canonical tools through Codex dynamic tools, Claude in-process MCP tools, and native wrappers if needed. | Projection builders, instruction composer, model runtime. | Runtime projection builders served by `TaskDelegationToolService` | Tool schema conversion, runtime approval behavior, tool-name normalization. |

## Spine Actors / Main-Line Nodes

- `delegate_tasks` / `update_task_status` tool projections: runtime-specific entry wrappers.
- `TaskDelegationToolService`: canonical model-tool execution adapter around the service.
- `TaskDelegationService`: authoritative orchestration boundary for delegation creation and status transitions.
- `TaskDelegationLedger`: internal state owner for delegated records.
- `TaskDelegationActivationCoordinator`: owns work-packet activation sequencing.
- `TaskDelegationCompletionNotifier`: owns coordinator/delegator notification payloads and delivery.
- `TaskDelegationSettlementCoordinator`: owns delayed safe member settlement.
- `TeamRun` / backend `TeamManager`: owns member runtime messaging and lifecycle.

## Ownership Map

- Runtime projections own only schema conversion, runtime result format, and runtime-specific approval/event glue. They must not own delegation business semantics.
- `TaskDelegationToolService` owns canonical parsing/serialization around model-facing tools. It must delegate state changes to `TaskDelegationService`.
- `TaskDelegationService` owns delegation invariants: who can delegate, who can update, valid transitions, dependency readiness, terminal notifications, and settlement decisions.
- `TaskDelegationLedger` owns record storage and atomic state reads/writes for one team run. It does not deliver messages or stop runtimes.
- `TaskDelegationActivationCoordinator` owns activation work-packet send decisions and duplicate activation suppression.
- `TaskDelegationCompletionNotifier` owns completion/failure message rendering and coordinator/delegator notification delivery.
- `TaskDelegationSettlementCoordinator` owns safe-exit scheduling and waits for runtime idle before calling lifecycle APIs.
- `TeamRun`/backend managers own actual runtime post/settle operations.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| Codex dynamic tool handler | `TaskDelegationToolService` | Codex-specific tool registration/result shape. | Delegation state, activation, completion notification, settlement. |
| Claude in-process MCP tool handler | `TaskDelegationToolService` | Claude SDK tool schema/handler integration. | Delegation state or coordinator notification policy. |
| Native AutoByteus wrapper, if retained | `TaskDelegationToolService` | Native runtime compatibility during migration. | Direct `TaskPlan` mutation. |
| Future general MCP endpoint | `TaskDelegationToolService` | Transport adapter in later ticket. | Business semantics. |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-ts/src/task-management/tools/task-tools/create-task.ts` | Single-task creation is a one-item delegation. | `delegate_tasks` manifest entry and service command. | In This Change | Remove from registry and configured tool docs. |
| Model-facing `create_tasks` | Name exposes internal record creation, not delegation semantics. | `delegate_tasks`. | In This Change | Internal service may still create ledger records. |
| `get-my-tasks.ts` | Workers receive task packets by activation push; no polling. | Internal ledger query + activation work packet renderer. | In This Change | Do not re-expose as worker tool. |
| Model-facing `get_task_plan_status` | Coordinator receives terminal notifications instead of polling. | Team events/UI/internal debug query. | In This Change | If UI needs status, use internal API, not model tool. |
| `assign-task-to.ts` as task tool | Mixes task creation and direct message delivery. | `delegate_tasks` for bounded work; `send_message_to` for conversation. | In This Change | If needed later, implement as explicit orchestration tool, not pure task service. |
| Generic task activation message asking worker to check queue | Contradicts push work-packet model. | `TaskDelegationWorkPacketRenderer`. | In This Change | Activation must include task details and update instructions. |
| Direct `context.customData.teamContext.state.taskPlan` mutation by tools | Runtime-local and unsafe for server-managed/mixed teams. | `TaskDelegationService`/ledger boundary. | In This Change | Authoritative Boundary Rule applies. |

## Return Or Event Spine(s) (If Applicable)

- Terminal notification: `Ledger terminal transition -> TaskDelegationCompletionNotifier -> TeamRun event TASK_DELEGATION -> TeamRun.postMessage(coordinator/delegator)`.
- Dependency continuation: `Ledger terminal transition -> readiness evaluator -> newly runnable records -> ActivationCoordinator -> work packet to assignee`.
- Settlement: `Ledger terminal transition -> pending settlement -> AGENT idle/status event -> TeamRun.settleMember/terminateMember`.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `TaskDelegationService`.
  - Chain: `delegate/update -> ledger mutation -> readiness evaluation -> activation commands`.
  - Why: keeps dependency activation policy in one owner rather than scattering across tool handlers and team managers.
- Parent owner: `TaskDelegationSettlementCoordinator`.
  - Chain: `terminal update -> pending settlement map -> team member idle event -> no-remaining-work check -> settle member`.
  - Why: prevents unsafe runtime termination inside `update_task_status` tool execution.
- Parent owner: runtime projection builders.
  - Chain: `configured tool exposure/member context -> protocol instructions -> tool registration`.
  - Why: workers must see status-update protocol before receiving a task packet.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Assignee/delegator identity resolution | DS-001, DS-002 | `TaskDelegationService` | Resolve names/route keys/run IDs from `MemberTeamContext`/team runtime. | Prevents ambiguous or unauthorized delegation/status updates. | Tool handlers could mutate wrong team/member state. |
| Work-packet rendering | DS-001 | Activation coordinator | Render task details and lifecycle instructions. | Keeps prompt content consistent across runtimes. | Generic activation prompts reintroduce polling. |
| Completion notification rendering | DS-002 | Completion notifier | Render terminal result for coordinator/delegator. | Prevents coordinator polling and normalizes deliverables. | Status updates could be invisible to coordinator. |
| Runtime-specific schema conversion | DS-001, DS-002, DS-005 | Projection builders | Convert canonical parameter specs to Codex/Claude/native format. | Keeps tool logic transport-independent. | Duplicated runtime behavior. |
| Team event projection | DS-002, DS-003 | UI/history/event pipeline | Emit visible task-delegation events. | Provides durable UI/history visibility. | Model-facing status polling returns. |
| Safe idle detection | DS-004 | Settlement coordinator | Wait for current turn to complete before member settlement. | Avoids interrupting tool result delivery. | Worker can be killed mid-tool-call. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Canonical tool manifest/service pattern | `autobyteus-server-ts/src/agent-tools/browser/*` | Reuse pattern | Browser tools are the strongest local precedent. | N/A |
| Team member messaging/activation | `TeamRun.postMessage`, backend `TeamManager.postMessage` | Extend/use | Existing team managers already start/restore target members and post user/system messages. | N/A |
| Inter-agent free-form messaging | `send_message_to`/communication services | Reuse only for conversation, not delegation state | Semantics differ: conversation vs bounded task lifecycle. | Completion notifier should be framework-owned, not a user message tool call. |
| Task state primitives | `autobyteus-ts/src/task-management/*` | Reuse behind boundary or migrate | Current TaskPlan has dependencies/status events, useful but incorrectly exposed. | New service needed to own delegation semantics and safe settlement. |
| Member lifecycle | Team backend managers and mixed member handles | Extend | Need per-member settlement; current whole-team terminate is too broad. | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-tools/task-delegation` | Canonical model-facing tool names, schemas, parsing, result serialization, tool service. | DS-001, DS-002, DS-005 | `TaskDelegationToolService` | Create New | Mirrors browser tool shape. |
| `agent-team-execution/task-delegation` | Delegation ledger, service, activation, completion notification, settlement. | DS-001..DS-004 | `TaskDelegationService` | Create New | Owns business semantics. |
| Team run backend layer | Member post/settle lifecycle. | DS-001, DS-004 | `TeamRun`/`TeamManager` | Extend | Add per-member settlement boundary. |
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
| `agent-team-execution/task-delegation/task-delegation-ledger.ts` | Delegation domain | Ledger | Store/query/mutate records for one team run. | Keeps state mechanics separate from side effects. | Yes |
| `agent-team-execution/task-delegation/task-delegation-service.ts` | Delegation domain | Authoritative service | Delegate tasks, update statuses, enforce invariants, call coordinators. | Governing owner for business semantics. | Yes |
| `agent-team-execution/task-delegation/task-delegation-activation-coordinator.ts` | Delegation domain | Activation coordinator | Evaluate runnable records and post work packets. | Isolates activation policy. | Yes |
| `agent-team-execution/task-delegation/task-delegation-work-packet-renderer.ts` | Delegation domain | Renderer | Render assignee activation message with exact update instructions. | Prompt content owner. | Yes |
| `agent-team-execution/task-delegation/task-delegation-completion-notifier.ts` | Delegation domain | Notifier | Emit team events and notify coordinator/delegator. | Separates notification from status transition. | Yes |
| `agent-team-execution/task-delegation/task-delegation-settlement-coordinator.ts` | Delegation domain | Settlement coordinator | Track pending settlement and settle when member idle/no work. | Prevents unsafe inline stop. | Yes |
| `agent-team-execution/task-delegation/task-delegation-run-registry.ts` | Delegation domain | Runtime binding registry | Bind active `TeamRun` to ledger/service/unsubscribers. | Avoids adding ad hoc fields to every runtime context. | Yes |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Delegated task identity and status | `task-delegation-record.ts` | Task delegation | Used by ledger, service, renderer, notifier, tests. | Yes | Yes | A generic task-plan DTO with unrelated optional fields. |
| Work-packet shape | `task-delegation-record.ts` or renderer-local type | Task delegation | Activation and tests need stable shape. | Yes | Yes | Prompt-only string without structured source data. |
| Completion notification payload | `task-delegation-record.ts` | Task delegation | Event and coordinator message share source payload. | Yes | Yes | Duplicate event vs message shapes. |
| Tool parameter specs | `task-delegation-tool-contract.ts` | Tool surface | Codex/Claude/native projections convert from same contract. | Yes | Yes | Runtime-specific schemas as source of truth. |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Parallel / Overlapping Representation Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `TaskDelegationRecord` | Yes | Yes | Medium | Store assignee and delegator as explicit route/run/name triplets; avoid both arbitrary recipient name and route-only fields without meaning. |
| `DelegateTasksInput` | Yes | Yes | Low | Use `assignee_name` or `assignee` consistently; resolve to route key internally. |
| `UpdateTaskStatusInput` | Yes | Yes | Low | Require `task_id`; optional task name is display-only, not identity. |
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
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-ledger.ts` | Delegation domain | Ledger | Per-team storage, status transition primitives, queries. | State owner. | Yes |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-service.ts` | Delegation domain | Authoritative service | Delegate/update commands; invariant enforcement; side-effect sequencing. | Spine owner. | Yes |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-activation-coordinator.ts` | Delegation domain | Activation | Readiness evaluation, duplicate activation prevention, member activation. | Clear off-spine owner. | Yes |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-work-packet-renderer.ts` | Delegation domain | Renderer | Activation message content. | Prompt content stays testable. | Yes |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-completion-notifier.ts` | Delegation domain | Notifier | Coordinator/delegator notification and event payload. | Push completion owner. | Yes |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-settlement-coordinator.ts` | Delegation domain | Settlement | Pending settlement, idle listener, no-remaining-work gate. | Prevents inline termination. | Yes |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-run-registry.ts` | Delegation domain | Runtime binding | Attach/detach delegation services to active team runs. | Central lifecycle registration. | Yes |

## Ownership Boundaries

The authoritative boundary for model-facing task work is `TaskDelegationService`, not `TaskPlan`, not runtime projections, and not MCP transport. Any caller above the task-delegation subsystem must call `delegateTasks` or `updateTaskStatus` on the service/tool service, not directly mutate ledger records.

The authoritative boundary for member runtime lifecycle remains `TeamRun`/backend `TeamManager`. The settlement coordinator decides that a member should settle, but it must request settlement through `TeamRun`, not terminate runtime internals directly.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `TaskDelegationService` | Ledger, activation coordinator, completion notifier, settlement coordinator. | Tool service, future MCP endpoint, tests above subsystem. | Runtime handler writes ledger or posts activation directly. | Add explicit service command/query. |
| `TaskDelegationToolService` | Parser/serializer plus service call. | Runtime projections. | Runtime-specific business logic. | Extend manifest/service result contract. |
| `TeamRun` member lifecycle API | Backend managers/member handles. | Settlement coordinator, external team commands. | Settlement coordinator reaches into `memberRuns` maps. | Add `settleMember`/`terminateMember` on `TeamRun` and `TeamManager`. |
| `TaskDelegationWorkPacketRenderer` | Prompt/message content format. | Activation coordinator. | Hand-building activation prompts in multiple backends. | Add renderer options/sections. |

## Dependency Rules

Allowed:

- Runtime projections -> `TaskDelegationToolService`.
- `TaskDelegationToolService` -> `TaskDelegationService`.
- `TaskDelegationService` -> ledger/coordinators under task-delegation subsystem.
- Task-delegation coordinators -> `TeamRun` public APIs.
- UI/history/event pipeline -> task-delegation event payloads.

Forbidden:

- Runtime projections directly accessing `TaskPlan`, ledger, team manager member maps, or notification internals.
- `update_task_status` handler stopping the member runtime inline.
- `delegate_tasks` using `send_message_to` model-tool code to activate assignees.
- Workers polling `get_my_tasks` or coordinator polling `get_task_plan_status` as part of the normal flow.
- Exposing both `create_tasks` and `delegate_tasks` model-facing names in the new surface.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `delegateTasks(context, input)` | Delegated task records | Create internal records, evaluate readiness, activate assignees. | `teamRunId`, delegator member route/run/name from context; assignee name in input resolved internally. | Context supplies delegator, not user args. |
| `updateTaskStatus(context, input)` | One delegated task status | Validate assignee, mutate status/deliverables, notify and settle on terminal. | Required `task_id`; caller member route/run/name. | Do not rely on task name as identity. |
| `settleMember(target, reason)` or `terminateMember(target, reason)` | One team member runtime | Safely stop one member runtime. | Explicit member route key and optional run ID. | Not whole-team terminate. |
| `renderWorkPacket(record/batch)` | Activation message | Render task details and lifecycle instruction. | Structured task record(s). | Output is task-specific user/system activation message. |
| `notifyTerminalStatus(payload)` | Coordinator/delegator notification | Emit event and optionally post message to coordinator/delegator. | Stored delegator identity, coordinator fallback. | No coordinator polling. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `delegateTasks` | Yes | Yes | Medium | Resolve assignee names once to route/run identity; reject ambiguous names. |
| `updateTaskStatus` | Yes | Yes | Low | Require `task_id`; validate caller is assignee. |
| `settleMember` | Yes | Yes | Low | Require route key; optional run ID protects stale settlement. |
| `notifyTerminalStatus` | Yes | Yes | Medium | Store delegator identity at delegation time; fallback to coordinator route. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Model-facing coordinator tool | `delegate_tasks` | Yes | Low | Use this name instead of `create_tasks`. |
| Worker status tool | `update_task_status` | Yes | Low | Keep; ensure it uses `task_id`. |
| Internal state | `TaskDelegationLedger` | Yes | Low | Avoid exposing “task plan” to agents. |
| Activation content | `TaskDelegationWorkPacket` | Yes | Low | Render from structured record. |
| Completion push | `TaskDelegationCompletionNotification` | Yes | Low | Use one payload for event/message. |

## Applied Patterns (If Any)

- Browser tool manifest/service/projection pattern: reused for `agent-tools/task-delegation` so schemas and execution logic are runtime-neutral.
- Event-driven orchestration: terminal status updates drive dependency activation, coordinator notification, and delayed settlement.
- Authoritative boundary rule: runtime adapters call the task-delegation boundary, not ledger internals.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-tools/task-delegation/` | Folder | Tool surface | Model-facing task delegation tool contracts/service. | Matches existing server-owned first-party tools. | Team runtime internals. |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/` | Folder | Delegation domain | Ledger/orchestration/activation/notification/settlement. | Team-run execution concern, not generic tool concern. | Runtime-specific schema adapters. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/task-delegation/` | Folder | Codex projection | Codex dynamic tool registrations and instruction integration. | Runtime-specific adapter. | Delegation business logic. |
| `autobyteus-server-ts/src/agent-execution/backends/claude/task-delegation/` | Folder | Claude projection | Claude in-process MCP tool definitions/server builder. | Runtime-specific adapter. | Delegation business logic. |
| `autobyteus-server-ts/src/agent-team-execution/domain/team-run-event.ts` | File | Team event domain | Add/replace task-delegation event payload/source. | Existing event identity owner. | Renderer-specific prompt strings. |
| `autobyteus-server-ts/src/agent-team-execution/backends/team-manager.ts` | File | Team lifecycle interface | Add per-member settlement API. | Existing team manager contract. | Delegation state. |
| `autobyteus-ts/src/task-management/tools/task-tools/*` | Folder | Legacy local task tools | Remove/decommission model-facing legacy tools. | Old ownership is wrong for target. | New canonical logic. |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Boundary Is Clear? | Mixed-Layer Or Over-Split Risk | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `agent-tools/task-delegation` | Transport/tool-surface adapter | Yes | Low | Mirrors browser pattern. |
| `agent-team-execution/task-delegation` | Main-line domain-control + local off-spine concerns | Yes | Medium | Several files are justified because service, ledger, activation, notification, and settlement own different concerns. |
| Runtime-specific projection folders | Transport/runtime adapter | Yes | Low | Keeps runtime details away from core service. |
| Existing `autobyteus-ts/task-management` | Legacy/local domain | No for target surface | High | Decommission as model-facing path; reuse internally only if hidden behind service. |

## Concrete Examples / Shape Guidance

### Model-facing `delegate_tasks` input shape

```json
{
  "tasks": [
    {
      "task_name": "implement_task_delegation_service",
      "assignee_name": "implementation_engineer",
      "description": "Implement the server-owned TaskDelegationService and delegate_tasks/update_task_status tool surface.",
      "dependencies": [],
      "completion_criteria": "Service has unit tests and runtime projections compile.",
      "expected_deliverables": ["implementation handoff", "test log"]
    }
  ]
}
```

### Work packet sent to assignee

```text
You have been activated for delegated task task_0007.

Task: implement_task_delegation_service
Delegated by: solution_designer
Description: Implement the server-owned TaskDelegationService...
Completion criteria: Service has unit tests and runtime projections compile.
Expected deliverables: implementation handoff, test log

Lifecycle instructions:
1. Work directly from this task packet. Do not call get_my_tasks; that tool is not part of this workflow.
2. If you need to mark the task started, call update_task_status with task_id="task_0007" and status="in_progress".
3. When done, call update_task_status with task_id="task_0007" and status="completed" or "failed".
4. Include a summary and deliverables when reporting terminal status.
5. After terminal status is accepted, the framework will notify the delegator and settle this member if no more delegated work remains.
```

### Terminal completion notification to coordinator/delegator

```text
Delegated task completed.

Task: implement_task_delegation_service (task_0007)
Assignee: implementation_engineer
Status: completed
Summary: Implemented service, projections, and tests.
Deliverables:
- /path/to/implementation-handoff.md
- /path/to/test.log

Downstream activation: code_reviewer was activated for review_task_delegation_service.
```

## Migration / Refactor Sequence

1. Add task-delegation domain models, ledger, and service with unit tests for delegate/update/status transition behavior.
2. Add activation work-packet renderer and activation coordinator; test no `get_my_tasks` instruction is needed.
3. Add completion notifier and task-delegation team event payloads; test coordinator notification on `completed`/`failed`.
4. Add settlement coordinator and per-member settlement APIs on `TeamRun`/team managers/member handles; test delayed settlement after idle.
5. Add canonical `agent-tools/task-delegation` manifest/service for `delegate_tasks` and `update_task_status`.
6. Add Codex/Claude/native projections and general delegation protocol instruction injection.
7. Remove/decommission legacy model-facing local task tools from registration/configured exposure.
8. Update tests for mixed teams so task delegation tools are available through server-owned projections instead of filtered local `ToolCategory.TASK_MANAGEMENT` tools.
9. Update docs/UI labels from task-plan polling toward delegation lifecycle where in scope.

## Validation Strategy

- Unit tests for parser validation:
  - `delegate_tasks` rejects ambiguous/missing assignee;
  - `update_task_status` requires `task_id` and rejects wrong assignee.
- Unit tests for ledger/service transitions:
  - delegation creates stable records;
  - dependencies block activation until prerequisite terminal completion;
  - terminal update records deliverables and emits completion payload.
- Runtime projection tests:
  - Codex/Claude expose only `delegate_tasks` and `update_task_status` for the new surface;
  - old model-facing task tools are absent.
- Orchestration tests:
  - coordinator delegates to member;
  - member receives full task packet;
  - member reports completed;
  - coordinator receives completion notification;
  - member settles after idle;
  - member does not settle when more work is queued/in-progress.

## Open Implementation Decisions

- Whether to physically rename/move existing `TaskPlan` domain classes in this ticket or wrap them behind `TaskDelegationLedger` first. Recommendation: wrap first if that reduces risk, but do not expose task-plan tools.
- Whether terminal statuses should include `blocked` in addition to `completed`/`failed`. Recommendation: first ticket uses `completed`/`failed`; use `failed` with reason for blocked/unable-to-complete cases unless product wants a third terminal state.
- Whether completion notification should always start/resume coordinator or only emit event if coordinator is not running. Recommendation: emit event always; post a system message to the delegator/coordinator when reachable, because the user expects push notification.
