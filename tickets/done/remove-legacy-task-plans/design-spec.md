# Design Spec

## Current-State Read

The current system has two task concepts active at the same time:

1. **Legacy native task plan in `autobyteus-ts`**
   - `AgentTeamBootstrapper` runs `TeamContextInitializationStep`, which creates an `InMemoryTaskPlan` and attaches it to `context.state.taskPlan`.
   - Optional `TaskNotifierInitializationStep` uses `TaskNotificationMode.SYSTEM_EVENT_DRIVEN` to create `SystemEventDrivenAgentTaskNotifier`, which observes task-plan events, marks runnable tasks queued, and wakes agents with a generic notification.
   - `AgentTeamStreamEventSourceType` includes `TASK_PLAN`; `AgentTeamExternalEventNotifier.handleAndPublishTaskPlanEvent(...)` publishes native task-plan events.
   - The native CLI/TUI stores and renders task plans.

2. **Authoritative server-owned dedicated task delegation**
   - `TaskDelegationService` and `src/agent-tools/task-delegation/*` own `delegate_tasks`, `mark_task_completed`, `mark_task_failed`, and `accept_task`.
   - Dedicated task state lives in a team-run-scoped delegation ledger; task-agent activation/settlement is server/backend-owned.
   - Domain events already use `TeamRunEventSourceType.TASK_DELEGATION`, but WebSocket mapping still emits legacy `ServerMessageType.TASK_PLAN_EVENT`.

The frontend still has task-plan state and UI:

- `AgentTeamContext.taskPlan` and `taskStatuses` hold legacy frontend task-plan state.
- `TeamStreamingService` routes all `TASK_PLAN_EVENT` messages to `handleTaskPlanEvent(...)`.
- `TeamOverviewPanel.vue` renders the screenshot-visible `Task Plan` section.
- `MobileActivityDigest.vue` has a `Tasks`/`Task plan` filter and card.

The target design must preserve server dedicated task delegation and task-agent projection while removing the parallel native task-plan owner, old task-plan stream contracts, and frontend task-plan presentation.

## Intended Change

Make server-owned dedicated task delegation the only team task workflow by:

- deleting `autobyteus-ts` native task-plan model/runtime/bootstrap/stream/TUI source and tests;
- deleting server native task-plan event mapping and replacing `TASK_PLAN_EVENT` WebSocket output for dedicated tasks with `TASK_DELEGATION_EVENT`;
- deleting frontend task-plan state, protocol types, handler, Team-tab panel, mobile card/filter, localization keys, and tests expecting them;
- leaving personal ToDo tools and `TODO_LIST_UPDATE` behavior intact.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Cleanup / Refactor / Behavior Change
- Current design issue found (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Legacy Or Compatibility Pressure, Boundary Or Ownership Issue, Shared Structure Looseness
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes
- Evidence:
  - `autobyteus-ts` still initializes and streams a native task plan.
  - Server dedicated task delegation already has a distinct owner but is exposed through legacy `TASK_PLAN_EVENT` WebSocket naming.
  - Frontend displays task-plan UI and persists task-plan state.
- Design response:
  - Remove the native task-plan owner and all downstream consumers.
  - Keep the server dedicated-task owner and give it explicit protocol naming.
  - Remove frontend task-plan state/UI; task-agent projection remains the dedicated-task visual surface.
- Refactor rationale:
  - A local UI hide would leave obsolete runtime state/events and protocol aliases active.
  - A compatibility alias from `TASK_DELEGATION_EVENT` to `TASK_PLAN_EVENT` would preserve the legacy contract being removed.
- Intentional deferrals and residual risk, if any:
  - No replacement dedicated-task ledger UI is added. Residual risk: users lose the obsolete task-plan table; current dedicated task visibility remains through task-agent activity, team messages, run activity, and notifications. A future ledger UI should be designed from `TaskDelegationService` data, not from resurrected task-plan state.

## Terminology

- `Dedicated task delegation`: the server-owned bounded work workflow implemented by `TaskDelegationService` and task-delegation tools.
- `Native task plan`: the legacy `autobyteus-ts` `TaskPlan` / `BaseTaskPlan` / `InMemoryTaskPlan` model and its team-stream events.
- `Task-agent projection`: frontend transient projection of a concrete task-agent run in the team member tree/activity bar.

## Design Reading Order

Read this design as:

1. dedicated-task ownership and stream spines;
2. removal/decommission map;
3. subsystem/file responsibility changes;
4. validation and documentation updates.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Obsolete in scope:
  - Native `autobyteus-ts` `TaskPlan`, task-plan event schemas, notification modes, bootstrap steps, CLI task-plan UI.
  - Server native `TASK_PLAN` domain event source and native task-plan bridge.
  - Server/frontend `TASK_PLAN_EVENT` WebSocket message type.
  - Frontend task-plan context state and UI.
- Do not add aliases such as `TaskPlan = ...`, compatibility WebSocket dual emission, hidden task-plan fallback state, or empty task-plan display components.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| `DS-001` | `Primary End-to-End` | Native AutoByteus team start | Native team stream without task-plan source | `AgentTeamRuntime` / `AgentTeamBootstrapper` | Shows task-plan bootstrap and stream removal in `autobyteus-ts`. |
| `DS-002` | `Primary End-to-End` | Task-delegation tool call | Frontend task-agent/team event surfaces | `TaskDelegationService` | Preserves the new authoritative dedicated-task flow. |
| `DS-003` | `Return-Event` | Server `TeamRunEventSourceType.TASK_DELEGATION` | Frontend WebSocket dispatch | `team-run-event-websocket-message-mapper` | Replaces legacy `TASK_PLAN_EVENT` transport naming. |
| `DS-004` | `Primary End-to-End` | Frontend team stream | Team tab / mobile activity digest | `TeamStreamingService` + UI component owners | Removes task-plan state/rendering while keeping messages/activity. |
| `DS-005` | `Bounded Local` | Personal ToDo tool call | Agent `TODO_LIST_UPDATE` stream | `ToDoList` / ToDo tools | Explicitly preserved non-team task-management feature. |

## Primary Execution Spine(s)

- `DS-001`: `AgentTeam.start -> AgentTeamRuntime -> AgentTeamBootstrapper -> AgentConfigurationPreparationStep -> CoordinatorInitializationStep -> AgentTeamExternalEventNotifier(TEAM/AGENT/SUB_TEAM only)`
- `DS-002`: `Model tool call -> TaskDelegationToolService -> TaskDelegationService/Ledger -> TeamRun.startTaskAgentInstance / settlement boundary -> TeamRunEvent(TASK_DELEGATION) -> WebSocket TASK_DELEGATION_EVENT -> Frontend task-agent projection / messages / activity`
- `DS-004`: `WebSocket message -> TeamStreamingService -> TeamCommunicationStore / task-agent projection / agent activity stores -> TeamOverviewPanel(Messages only) / MobileActivityDigest(Messages/Activity only)`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| `DS-001` | Native team startup no longer creates or owns task-plan state. Bootstrap prepares queues/config/coordinator and stream categories remain team/agent/sub-team. | `AgentTeam`, `AgentTeamRuntime`, `AgentTeamBootstrapper`, `TeamManager`, `AgentTeamExternalEventNotifier` | `AgentTeamRuntime` | Tests/docs update; removed env var; removed TUI state. |
| `DS-002` | Dedicated tasks continue through server task-delegation tools and ledger. Task-agent activation/status/settlement remains server/backend-owned. | `TaskDelegationToolService`, `TaskDelegationService`, `TaskDelegationLedger`, `TeamRun`, backend team manager | `TaskDelegationService` | Tool exposure filters; member identity; notifications; task-agent projection. |
| `DS-003` | Dedicated task domain events are mapped to an explicit WebSocket message type. Native task-plan events are no longer mapped. | `TeamRunEvent`, `team-run-event-websocket-message-mapper`, `ServerMessage` | WebSocket mapper | Payload serialization; task-agent identity flattening. |
| `DS-004` | Frontend routes team stream events to active surfaces. Task-plan handler/state/UI are removed; dedicated-task events may only ensure task-agent identity projection and do not populate a task ledger. | `TeamStreamingService`, `AgentTeamContext`, `TeamCommunicationStore`, `TeamOverviewPanel`, `MobileActivityDigest` | `TeamStreamingService` for dispatch; component owners for rendering | Localization; tests; generated message files. |
| `DS-005` | Personal ToDo tools remain local agent tools and emit `TODO_LIST_UPDATE`; no change to team dedicated-task workflow. | `ToDoList`, ToDo tools, `AgentEventStream`, frontend todo handler | ToDo tools / agent stream | Avoid accidental deletion while removing task-plan files. |

## Spine Actors / Main-Line Nodes

- `AgentTeamRuntime`: native team lifecycle and event loop owner.
- `AgentTeamBootstrapper`: ordered startup step owner.
- `AgentTeamExternalEventNotifier`: native team stream envelope owner.
- `TaskDelegationService`: dedicated task use-case and ledger owner.
- `TaskDelegationEventPublisher`: dedicated task domain event publisher.
- `team-run-event-websocket-message-mapper`: server transport mapping owner.
- `TeamStreamingService`: frontend stream dispatch owner.
- `TeamOverviewPanel` / `MobileActivityDigest`: frontend rendering owners.
- `ToDoList` and ToDo tools: personal ToDo owner; preserved.

## Ownership Map

| Node | Owns | Must Not Own |
| --- | --- | --- |
| `AgentTeamRuntime` | Native team lifecycle, worker loop, member routing orchestration | Task ledgers or dedicated-task state. |
| `AgentTeamBootstrapper` | Startup sequencing | Hidden task-plan setup. |
| `AgentTeamExternalEventNotifier` | Team/agent/sub-team stream envelopes | Task-plan payload validation or task-plan rebroadcast. |
| `TaskDelegationService` | Dedicated task records, task-agent lifecycle coordination, terminal/acceptance semantics | Native `TaskPlan` compatibility. |
| `team-run-event-websocket-message-mapper` | Domain-to-transport event naming and payload shaping | Legacy aliasing or dual emission. |
| `TeamStreamingService` | Frontend routing of team WebSocket messages | Persisting a task ledger/task plan. |
| `TeamOverviewPanel` | Team communication panel composition | Legacy task-plan display. |
| `MobileActivityDigest` | Mobile compact messages/activity summary | Legacy task-plan summary. |
| `ToDoList` | Personal ToDo list state | Team dedicated-task delegation. |

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `delegate_tasks`, `mark_task_completed`, `mark_task_failed`, `accept_task` tool wrappers | `TaskDelegationToolService` / `TaskDelegationService` | Model-facing dedicated-task commands | Native task-plan state or frontend task-plan projection. |
| `AgentTeam` facade | `AgentTeamRuntime` | Public native team API | Task-plan lifecycle. |
| `TeamStreamingService.dispatchMessage` | Handler/store/component owners | Frontend transport entry | Task-plan persistence. |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-ts/src/task-management/base-task-plan.ts` | Legacy native task-plan abstraction | Server `TaskDelegationService` for team tasks | In This Change | Remove tests. |
| `autobyteus-ts/src/task-management/in-memory-task-plan.ts` | Legacy native task ledger | Server delegation ledger | In This Change | Remove tests. |
| `autobyteus-ts/src/task-management/task.ts`, `schemas/task-definition.ts`, `schemas/task-status-report.ts`, `converters/task-plan-converter.ts`, `events.ts` | Legacy task-plan DTO/report/event shapes | Server task-delegation record/payload types | In This Change | Do not keep compatibility exports. |
| `autobyteus-ts/src/task-management/deliverable.ts`, `deliverables/*`, task-plan deliverable schemas | Only used by task-plan model/report | Dedicated task reference files live in server payloads | In This Change | Keep only if implementation finds active non-task-plan use; investigation found none. |
| `autobyteus-ts/src/task-management/tools/task-tools/index.ts` | Empty legacy task-tool barrel | No replacement | In This Change | Remove empty compatibility path. |
| `TeamContextInitializationStep` | Only creates/bridges TaskPlan | Remaining bootstrap steps | In This Change | Remove from default bootstrapper. |
| `TaskNotifierInitializationStep` and `src/agent-team/task-notification/*` | Depends on native TaskPlan | Server task-agent activation | In This Change | Remove env var support. |
| `AgentTeamConfig.taskNotificationMode` | Configures removed notifier | No replacement | In This Change | Update tests/docs. |
| `AgentTeamRuntimeState.taskPlan` / `taskNotifier` | Holds removed state | No replacement | In This Change | Remove imports. |
| `EventType.TASK_PLAN_TASKS_CREATED` / `TASK_PLAN_STATUS_UPDATED` | Native event names | No replacement | In This Change | Generic event tests should use other event names. |
| `AgentTeamStreamEventSourceType 'TASK_PLAN'` and `TaskPlanEventPayload` | Native stream source | No replacement | In This Change | Server import removed. |
| `AgentTeamExternalEventNotifier.handleAndPublishTaskPlanEvent` | Native task-plan publish API | No replacement | In This Change | Remove. |
| `autobyteus-ts` CLI task-plan store/UI | Legacy UI | Native team children/history display only | In This Change | Delete `TaskPlanPanel`. |
| Server `TeamRunEventSourceType.TASK_PLAN` / `TeamRunTaskPlanEventPayload` | Native bridge path | `TeamRunEventSourceType.TASK_DELEGATION` only | In This Change | Update domain union. |
| Server native AutoByteus task-plan processor branch | No native task-plan events after removal | No replacement | In This Change | Update integration tests. |
| Server `ServerMessageType.TASK_PLAN_EVENT` | Legacy transport name | `ServerMessageType.TASK_DELEGATION_EVENT` | In This Change | Do not dual emit. |
| Frontend `TaskPlanEventPayload`, `handleTaskPlanEvent`, `types/taskManagement.ts` | Legacy state mapping | Dedicated task event payload and task-agent projection if needed | In This Change | Do not store task ledger. |
| Frontend `AgentTeamContext.taskPlan/taskStatuses` | Legacy state | No replacement | In This Change | Update factories/hydration/tests. |
| `TaskPlanDisplay.vue`, `TeamOverviewPanel` task-plan section, mobile task-plan card/filter | Obsolete UI | Messages/activity/task-agent projection | In This Change | Resolve screenshot. |
| Task-plan localization keys | Unused after UI deletion | No replacement | In This Change | Update generated/localized files consistently. |

## Return Or Event Spine(s) (If Applicable)

- Dedicated task event return spine: `TaskDelegationEventPublisher -> TeamRun.publishEvent(TASK_DELEGATION) -> team-run-event-websocket-message-mapper -> ServerMessage(TASK_DELEGATION_EVENT) -> TeamStreamingService -> task-agent projection / activity/messages`.
- Native team stream return spine after removal: `Agent/Team/SubTeam runtime events -> AgentTeamExternalEventNotifier -> AgentTeamStreamEvent(TEAM/AGENT/SUB_TEAM) -> server AutoByteus processor -> frontend`.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `TaskDelegationService`
  - `Tool input -> Parse/resolve member -> Ledger record -> Start task-agent -> Publish event -> Notify/settle later`
  - This remains unchanged except transport event name.
- Parent owner: `TeamStreamingService`
  - `ServerMessage -> team-level handler? -> member/task-agent context resolution -> segment/activity handler -> optional task-agent removal`
  - Add/keep only a dedicated-task event branch that does not mutate task-plan state.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Tool exposure negative guidance for old names | `DS-002` | `TaskDelegationToolService` / tool exposure | Prevent removed model-facing names from being exposed | Safety around configured old names | If treated as compatibility, old task tools may reappear. |
| Task-agent identity flattening in WebSocket payload | `DS-003`, `DS-004` | `TeamStreamingService` | Ensure frontend can project task-agent runs from dedicated events | Dedicated task UI continuity | If hidden in task-plan handler, frontend retains legacy state owner. |
| Localization cleanup | `DS-004` | UI components | Remove unused task-plan keys | Prevent dead UI strings | If left, tests/audit may drift and UI might be reintroduced. |
| Personal ToDo preservation | `DS-005` | ToDo tools | Keep non-team local ToDo behavior | Avoid over-deletion | If conflated with task plans, active ToDo tools break. |
| Documentation update | All | Delivery/docs readers | Describe dedicated task-only model | Prevent reintroduction | Docs can mislead implementation or users. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Authoritative team task workflow | `autobyteus-server-ts/src/agent-team-execution/task-delegation` | Reuse | Already owns dedicated task ledger, task-agent lifecycle, terminal/acceptance semantics | N/A |
| Dedicated task tool manifests | `autobyteus-server-ts/src/agent-tools/task-delegation` | Reuse | Existing first-party tool boundary | N/A |
| Task-agent frontend projection | `autobyteus-web/services/agentStreaming/teamTaskAgentContextProjection.ts` | Extend/Re-use | Existing transient task-agent member projection | N/A |
| Team messages UI | `TeamCommunicationPanel` / `TeamCommunicationStore` | Reuse | Already valid Team-tab content | N/A |
| Personal ToDo | `autobyteus-ts/src/task-management/todo*` | Reuse/Preserve | Separate personal list feature | N/A |
| New task-plan replacement UI | None | Do Not Create | Out of scope; would require server ledger UX design | Existing task-plan UI is wrong owner. |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts` native agent-team runtime | Native team lifecycle, routing, stream of team/agent/sub-team events | `DS-001` | `AgentTeamRuntime` | Reuse and simplify | Remove task-plan responsibilities. |
| `autobyteus-ts` personal ToDo/task-management subset | Local ToDo tools and schemas | `DS-005` | ToDo tools | Reuse | Keep under current folder for scope. |
| Server task delegation | Dedicated task lifecycle/ledger/tools | `DS-002` | `TaskDelegationService` | Reuse | No task-plan dependency. |
| Server agent streaming | WebSocket message contracts/mapping | `DS-003` | Mapper / `ServerMessage` | Extend/Rename | Add `TASK_DELEGATION_EVENT`, remove `TASK_PLAN_EVENT`. |
| Frontend team streaming | Team stream dispatch and task-agent projection | `DS-004` | `TeamStreamingService` | Reuse and simplify | Remove task-plan state handler. |
| Frontend team UI | Messages/activity/task-agent presentation | `DS-004` | Component owners | Reuse and simplify | Delete task-plan components/cards. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/agent-team/bootstrap-steps/agent-team-bootstrapper.ts` | Native agent-team runtime | Bootstrap owner | Default startup steps after task-plan removal | Existing file owns step ordering | No |
| `autobyteus-ts/src/agent-team/context/agent-team-config.ts` | Native agent-team runtime | Config owner | Team config without task notification mode | Existing config owner | No |
| `autobyteus-ts/src/agent-team/context/agent-team-runtime-state.ts` | Native agent-team runtime | Runtime state owner | State without task plan/notifier fields | Existing state owner | No |
| `autobyteus-ts/src/agent-team/streaming/agent-team-stream-events.ts` | Native team streaming | Stream envelope owner | Source type union and validation excluding task plan | Existing contract owner | Uses payload classes |
| `autobyteus-ts/src/agent-team/streaming/agent-team-stream-event-payloads.ts` | Native team streaming | Payload owner | Team/agent/sub-team payloads only | Existing payload owner | No task-plan payload |
| `autobyteus-ts/src/task-management/index.ts` | Personal ToDo/task-management subset | Public barrel | Export ToDo-only active task-management APIs | Existing barrel but narrowed | ToDo schemas |
| `autobyteus-server-ts/src/agent-team-execution/domain/team-run-event.ts` | Server team-run domain | Event union owner | Remove native task-plan domain source | Existing domain contract | Dedicated task payload remains |
| `autobyteus-server-ts/src/services/agent-streaming/models.ts` | Server streaming | Message enum owner | `TASK_DELEGATION_EVENT` instead of `TASK_PLAN_EVENT` | Existing transport model owner | No |
| `autobyteus-server-ts/src/services/agent-streaming/team-run-event-websocket-message-mapper.ts` | Server streaming | Mapper owner | Map `TASK_DELEGATION` domain events to explicit WebSocket payload | Existing mapping owner | Dedicated task payload type |
| `autobyteus-web/services/agentStreaming/protocol/messageTypes.ts` | Frontend protocol | Typed message union owner | Remove task-plan payload; add task-delegation event payload | Existing protocol owner | Team stream identity payload |
| `autobyteus-web/services/agentStreaming/TeamStreamingService.ts` | Frontend streaming | Dispatch owner | Remove `TASK_PLAN_EVENT` branch; handle `TASK_DELEGATION_EVENT` without task-plan state | Existing dispatch owner | Task-agent identity extraction |
| `autobyteus-web/components/workspace/team/TeamOverviewPanel.vue` | Desktop team UI | Team tab owner | Messages-only layout | Existing component owner | TeamCommunicationPanel |
| `autobyteus-web/components/mobile/MobileActivityDigest.vue` | Mobile UI | Mobile digest owner | Messages/activity filters only | Existing component owner | MobileTeamMessages, activity store |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Dedicated task-agent stream identity in frontend | Existing `teamStreamIdentityTypes.ts` / `teamTaskAgentContextProjection.ts` | Frontend streaming | Already normalizes task-agent run/id fields across messages | Yes | Yes | A task-plan/task-ledger DTO. |
| Server task-delegation event payloads | Existing `task-delegation-record.ts` plus WebSocket mapper serialization | Server task delegation | Domain payloads already defined by service | Yes | Yes | A frontend-owned task plan. |
| Personal ToDo schemas | Existing `todo-definition.ts`, `todo.ts` | `autobyteus-ts` ToDo tools | Separate active feature | Yes | Yes | Team task delegation or task plan. |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `TaskDelegationRecord` / event payloads | Yes | Yes | Low | Preserve as server-owned dedicated task structure. |
| Frontend `TaskDelegationEventPayload` | Yes if it mirrors server dedicated events and top-level task-agent identity only | Yes | Low | Do not include task-plan fields like `task_name`, `assignee_name`, dependencies. |
| `AgentTeamContext` | Yes after removal | Yes | Low | Remove `taskPlan` and `taskStatuses`. |
| `task-management` barrel in `autobyteus-ts` | Mixed folder name but active ToDo-only exports | Yes for this scope | Medium | Narrow exports to ToDo; folder rename deferred/out of scope. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/agent-team/bootstrap-steps/agent-team-bootstrapper.ts` | Native runtime | Bootstrap owner | Default steps exclude deleted task-plan steps | Keeps startup order readable | No |
| `autobyteus-ts/src/agent-team/context/agent-team-config.ts` | Native runtime | Config owner | Team config without task notification env/mode | Single team config owner | No |
| `autobyteus-ts/src/agent-team/context/agent-team-runtime-state.ts` | Native runtime | State owner | Team state without task-plan/task-notifier | Single runtime state owner | No |
| `autobyteus-ts/src/agent-team/streaming/agent-team-stream-events.ts` | Native streaming | Stream envelope owner | Only `TEAM`, `AGENT`, `SUB_TEAM` source types | Central stream contract | Payload classes |
| `autobyteus-ts/src/agent-team/streaming/agent-team-event-notifier.ts` | Native streaming | Notifier owner | Status, agent, sub-team publish methods only | Single native team notifier | Stream event classes |
| `autobyteus-ts/src/task-management/index.ts` | Personal ToDo | Public barrel | ToDo and ToDo tool exports only | Existing package surface narrowed | ToDo structures |
| `autobyteus-ts/src/task-management/schemas/index.ts` | Personal ToDo | Schema barrel | ToDo schema exports only | Existing schema surface narrowed | ToDo structures |
| `autobyteus-ts/src/task-management/tools/index.ts` | Personal ToDo | Tool barrel | ToDo tool exports only | Existing tool surface narrowed | ToDo tools |
| `autobyteus-server-ts/src/agent-team-execution/domain/team-run-event.ts` | Server team-run domain | Domain event contract | `TASK_DELEGATION` remains; `TASK_PLAN` removed | Central event union | Dedicated task payload |
| `autobyteus-server-ts/src/services/agent-streaming/models.ts` | Server streaming | WebSocket message contract | `TASK_DELEGATION_EVENT` | Central message enum | No |
| `autobyteus-server-ts/src/services/agent-streaming/team-run-event-websocket-message-mapper.ts` | Server streaming | Mapper | Dedicated task event serialization and identity flattening | Single mapper owner | Dedicated task payload |
| `autobyteus-web/types/agent/AgentTeamContext.ts` | Frontend team state | Team context type | No task-plan fields | Central type | Existing member/task-agent fields |
| `autobyteus-web/services/agentStreaming/protocol/messageTypes.ts` | Frontend protocol | Message union | `TASK_DELEGATION_EVENT`, no `TASK_PLAN_EVENT` | Central protocol type owner | Team identity payload |
| `autobyteus-web/services/agentStreaming/TeamStreamingService.ts` | Frontend streaming | Dispatch | Dedicated task event branch without task-plan state | Existing dispatch owner | Task-agent projection helpers |
| `autobyteus-web/components/workspace/team/TeamOverviewPanel.vue` | Desktop UI | Team tab component | Messages panel only | Existing Team tab owner | TeamCommunicationPanel |
| `autobyteus-web/components/mobile/MobileActivityDigest.vue` | Mobile UI | Mobile digest | Messages/activity filters and cards only | Existing mobile digest owner | Existing stores |

## Ownership Boundaries

- `autobyteus-ts` native team runtime must stop owning team-task state. It owns only team lifecycle, member routing, and native event aggregation.
- `TaskDelegationService` is the authoritative dedicated-task state/lifecycle boundary. Any task ledger, activation, terminal status, acceptance, or settlement behavior belongs there.
- Server WebSocket mapper owns transport naming. It must map dedicated task events to dedicated naming and must not retain task-plan aliases.
- Frontend `TeamStreamingService` may route and project task-agent identity, but must not reconstruct a task ledger or task plan.
- UI components render existing valid surfaces only: messages, member/task-agent activity, run activity.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `TaskDelegationService` | Ledger, activation, terminal status, acceptance, settlement | Task-delegation tools, backend team managers | Native `TaskPlan` mutation or frontend task-plan reconstruction | Add server dedicated-task API/event, not native task plan. |
| `team-run-event-websocket-message-mapper` | Payload serialization and transport event naming | WebSocket stream handlers | Emitting `TASK_PLAN_EVENT` for dedicated tasks | Add/strengthen `TASK_DELEGATION_EVENT`. |
| `TeamStreamingService` | Frontend message dispatch and task-agent projection hooks | Frontend WebSocket client | Handling dedicated tasks via `handleTaskPlanEvent` / `AgentTeamContext.taskPlan` | Add dedicated task event branch that does not store a ledger. |
| `ToDoList` / ToDo tools | Personal ToDo state and updates | Local agent tools | Treating ToDo as team task delegation | Keep ToDo local/personal. |

## Dependency Rules

- `autobyteus-server-ts` must not import task-plan types from `autobyteus-ts`.
- `autobyteus-ts` native team runtime must not depend on `src/task-management` task-plan files after removal.
- Frontend components must not depend on `types/taskManagement.ts` or task-plan fields on `AgentTeamContext`.
- Dedicated task WebSocket handling must depend on `TASK_DELEGATION_EVENT`, not on `TASK_PLAN_EVENT`.
- Personal ToDo imports may remain within `autobyteus-ts/src/task-management/todo*` and ToDo tools only.
- Forbidden shortcuts:
  - `TaskDelegationService -> native TaskPlan`.
  - `TeamOverviewPanel -> AgentTeamContext.taskPlan`.
  - `TeamStreamingService -> handleTaskPlanEvent`.
  - dual `TASK_DELEGATION_EVENT` + `TASK_PLAN_EVENT` emission.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `delegate_tasks` | Dedicated task delegation | Create bounded ready-to-run work | `member_name` plus task descriptions/reference files | Existing server tool. |
| `mark_task_completed` / `mark_task_failed` | Dedicated task-agent report | Report result for bound task-agent instance | Current task-agent context, no task selector | Existing server tool. |
| `accept_task` | Dedicated task acceptance | Original delegator accepts completed work | `task_id` from framework notification | Existing server tool. |
| `TeamRunEventSourceType.TASK_DELEGATION` | Dedicated task event | Domain event source | `teamRunId`, source path, event payload | Keep. |
| `ServerMessageType.TASK_DELEGATION_EVENT` | Dedicated task WebSocket event | Transport notification | `event_type`, dedicated payload, source path/route, task-agent identity fields if present | Add/replace. |
| `AgentTeamStreamEventSourceType` | Native team stream source | Native stream envelope | `TEAM | AGENT | SUB_TEAM` | Remove `TASK_PLAN`. |
| `TODO_LIST_UPDATE` | Personal ToDo | Agent ToDo update stream | Agent run identity | Unchanged. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `TASK_DELEGATION_EVENT` | Yes | Yes | Low | Include task-agent identity fields explicitly where available. |
| `TASK_PLAN_EVENT` | No | No | High | Remove. |
| `AgentTeamStreamEventSourceType.TASK_PLAN` | No longer valid | N/A | High | Remove. |
| `AgentTeamContext.taskPlan/taskStatuses` | No | No | High | Remove. |
| ToDo tool APIs | Yes | Yes | Low | Preserve unchanged. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Server dedicated task event | Proposed `TASK_DELEGATION_EVENT` | Yes | Low | Replace `TASK_PLAN_EVENT`. |
| Server domain source | `TASK_DELEGATION` | Yes | Low | Keep. |
| Native stream source | Remove `TASK_PLAN` | N/A | N/A | No replacement. |
| Frontend Team tab section | `Messages` | Yes | Low | Remove `Task Plan`. |
| `task-management` folder for ToDo | Current `task-management` | Partially | Medium | Do not rename in this task; narrow exports to ToDo. |

## Applied Patterns (If Any)

- **Clean-cut decommissioning**: remove obsolete owner, types, events, UI, and tests rather than wrapping or hiding them.
- **Authoritative boundary enforcement**: task delegation remains behind server `TaskDelegationService`; frontend and native runtime do not own task state.
- **Transport rename**: replace an overloaded legacy transport message with subject-specific `TASK_DELEGATION_EVENT`.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/task-management/` | Folder | Personal ToDo/task-management subset | Retain ToDo files/tools only | Existing active local tool area | `TaskPlan`, task-plan schemas/events/converters/deliverables. |
| `autobyteus-ts/src/agent-team/bootstrap-steps/agent-team-bootstrapper.ts` | File | Native bootstrap | Step list without task-plan setup | Existing bootstrap owner | Task-plan steps. |
| `autobyteus-ts/src/agent-team/task-notification/` | Folder | Removed | Delete | Legacy task-plan notifier | Any compatibility stub. |
| `autobyteus-ts/src/agent-team/streaming/` | Folder | Native team streaming | TEAM/AGENT/SUB_TEAM only | Existing stream owner | Task-plan payload/source. |
| `autobyteus-ts/src/cli/agent-team/` | Folder | Native CLI | Team/agent/subteam status/history only | Existing CLI owner | TaskPlanPanel/taskPlans. |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/` | Folder | Server task delegation | Dedicated task lifecycle | Existing authoritative owner | Native TaskPlan coupling. |
| `autobyteus-server-ts/src/services/agent-streaming/` | Folder | Server WebSocket protocol | `TASK_DELEGATION_EVENT` mapping | Existing transport owner | `TASK_PLAN_EVENT`. |
| `autobyteus-web/services/agentStreaming/` | Folder | Frontend stream dispatch/protocol | Dedicated task event routing/projection, no task-plan state | Existing stream owner | `handleTaskPlanEvent`, task-plan DTOs. |
| `autobyteus-web/components/workspace/team/` | Folder | Desktop team UI | Messages/task-agent/member views | Existing UI owner | `TaskPlanDisplay`, task-plan section. |
| `autobyteus-web/components/mobile/MobileActivityDigest.vue` | File | Mobile digest | Messages/activity summary | Existing mobile digest owner | Task-plan filter/card. |
| `autobyteus-web/localization/messages/` | Folder | Localization | Remove task-plan keys | Existing i18n owner | Unused task-plan keys. |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `autobyteus-ts/src/task-management` | Mixed Justified | Medium | Medium | Keep ToDo only for this task; folder rename deferred to avoid expanding scope. |
| `autobyteus-ts/src/agent-team/streaming` | Transport/Event | Yes after removal | Low | Remove mixed task-plan payload. |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation` | Main-Line Domain-Control | Yes | Low | Existing authoritative owner. |
| `autobyteus-server-ts/src/services/agent-streaming` | Transport | Yes after rename | Low | Explicit task-delegation message. |
| `autobyteus-web/services/agentStreaming` | Transport/Projection | Yes after removal | Low | Dedicated event projection stays distinct from UI state. |
| `autobyteus-web/components/workspace/team` | UI | Yes after removal | Low | Team panel renders valid team surfaces only. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Dedicated task event mapping | `TeamRunEventSourceType.TASK_DELEGATION -> ServerMessageType.TASK_DELEGATION_EVENT` | `TeamRunEventSourceType.TASK_DELEGATION -> ServerMessageType.TASK_PLAN_EVENT` | Avoids preserving a legacy task-plan transport alias. |
| Frontend dedicated task handling | `TASK_DELEGATION_EVENT -> extractTaskAgentIdentity -> ensureTaskAgentContext -> return` | `TASK_DELEGATION_EVENT/TASK_PLAN_EVENT -> handleTaskPlanEvent -> AgentTeamContext.taskPlan` | Dedicated tasks may project task-agent identity but must not rebuild task-plan state. |
| Desktop Team tab | `TeamOverviewPanel -> TeamCommunicationPanel` | `TeamOverviewPanel -> TaskPlanDisplay + TeamCommunicationPanel` | Resolves screenshot and removes obsolete UI. |
| Native team startup | `Bootstrapper -> AgentConfigurationPreparationStep -> CoordinatorInitializationStep` | `Bootstrapper -> TeamContextInitializationStep(TaskPlan) -> TaskNotifierInitializationStep -> ...` | Removes obsolete startup owner. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep `TaskPlan = InMemoryTaskPlan` export | Existing consumers may import it | Rejected | Delete export and source. |
| Keep empty `task-tools/index.ts` for old imports | It currently asserts legacy tools removed | Rejected | Delete empty compatibility barrel; update tests to check registry/tool exposure without importing old path. |
| Keep `TASK_PLAN_EVENT` as alias for dedicated task events | Existing clients/tests expect it | Rejected | Replace with `TASK_DELEGATION_EVENT`; update frontend/server tests. |
| Emit both `TASK_DELEGATION_EVENT` and `TASK_PLAN_EVENT` | Easier migration | Rejected | Single explicit message only. |
| Hide task-plan panel but keep state/handler | Smaller UI change | Rejected | Delete state/handler/component/types/localization. |
| Leave native `TASK_PLAN` stream source unused | Less source churn | Rejected | Delete source type and native bridge to prevent reintroduction. |
| Remove personal ToDo tools because folder is `task-management` | Broad task cleanup | Rejected | Preserve ToDo; not team task-plan legacy. |

## Derived Layering (If Useful)

- Domain/control: server `TaskDelegationService` and `TeamRunEventSourceType.TASK_DELEGATION`.
- Transport: server `TASK_DELEGATION_EVENT` WebSocket mapper and frontend protocol type.
- Frontend projection: `TeamStreamingService` and task-agent context projection.
- UI: Team messages/activity/mobile digest. No task-plan layer remains.

## Implementation / Migration Sequence

1. **`autobyteus-ts` model/runtime removal**
   - Delete task-plan source files and tests.
   - Narrow `task-management` barrels to ToDo-only exports.
   - Remove task-plan event enum values and update generic event tests to use non-task event values.
   - Remove task-plan bootstrap steps, notification mode/folder, runtime state fields, config property/env handling.
   - Remove `TASK_PLAN` from team stream source types/payloads/notifier.
   - Remove CLI task-plan state and panel.

2. **Server bridge/protocol cleanup**
   - Remove native task-plan domain source/type from `team-run-event.ts`.
   - Remove AutoByteus native task-plan event processor branch/import.
   - Replace `ServerMessageType.TASK_PLAN_EVENT` with `TASK_DELEGATION_EVENT`.
   - Map `TeamRunEventSourceType.TASK_DELEGATION` to `TASK_DELEGATION_EVENT`; include `event_type` and top-level source route/path plus task-agent identity fields when present.
   - Update server tests and docs.

3. **Frontend protocol/state/UI cleanup**
   - Remove task-plan types, context fields, handler, dispatch branch, and initialization/reset nulls.
   - Add/update `TASK_DELEGATION_EVENT` protocol typing and dispatch branch that does not store task-plan state.
   - Remove `TaskPlanDisplay.vue`, task-plan section in `TeamOverviewPanel.vue`, mobile task-plan filter/card, and localization keys.
   - Update tests that construct `AgentTeamContext` fixtures.

4. **Docs and validation**
   - Update active docs in all packages to describe dedicated-task-only team task management.
   - Run type/build/tests and targeted source searches.

## Validation Plan

- `autobyteus-ts`
  - Type/build: `pnpm -C autobyteus-ts exec tsc -p tsconfig.build.json --noEmit` or package build after dependencies are installed.
  - Unit tests for agent-team bootstrap/streaming/CLI/ToDo areas.
  - Targeted source search: no active `TaskPlan`, `BaseTaskPlan`, `InMemoryTaskPlan`, `TaskNotificationMode`, `TASK_PLAN`, `task_plan` in `autobyteus-ts/src` except any intentionally documented negative legacy tool names if unavoidable.
- `autobyteus-server-ts`
  - Typecheck/build: package `typecheck` / `build`.
  - Unit/integration: task-delegation service/lifecycle, AutoByteus team backend event processing, WebSocket mapper tests.
  - Default live E2E command should still skip without flags; opt-in live E2E should expect `TASK_DELEGATION_EVENT` if run.
- `autobyteus-web`
  - Targeted tests: `TeamOverviewPanel`, `MobileActivityDigest`, `TeamStreamingService`/protocol tests, task-agent projection tests, run hydration/open/recovery fixtures.
  - UI assertion: no `team-task-plan-*`, no `Task Plan`, no `No task plan yet` in Team tab.
  - Source search: no `TaskPlanDisplay`, `taskPlan`, `taskStatuses`, `TASK_PLAN_EVENT`, or `types/taskManagement` in active frontend source/tests except deleted historical archives.
- Dependency setup note: current dedicated worktree lacks `node_modules`; install/setup before running validation.

## Documentation Impact

Update active docs:

- `autobyteus-ts/docs/agent_team_runtime_and_task_coordination.md`: remove native internal TaskPlan section; state native runtime has no task-plan workflow and server owns dedicated tasks.
- `autobyteus-ts/docs/agent_team_design.md`: remove TaskNotificationMode/TaskPlan builder/bootstrap/streaming sections and extension point.
- `autobyteus-ts/docs/agent_team_streaming_protocol.md`: remove `TASK_PLAN` source type.
- `autobyteus-ts/examples/agent-team/README.md`: remove event-driven native task-plan examples/guidance references.
- `autobyteus-server-ts/docs/modules/agent_team_execution.md`: remove native task-plan-aware AutoByteus language and update WebSocket event text to `TASK_DELEGATION_EVENT`.
- `autobyteus-web/docs/agent_execution_architecture.md`: remove native task-plan update reference.

## Open Risks / Reviewer Questions

- Confirm that `TASK_PLAN_EVENT -> TASK_DELEGATION_EVENT` rename should ship in this same task. This design includes it because otherwise active task-plan protocol naming remains.
- Confirm no release process requires explicit public breaking-change note before implementation handoff. Delivery can decide docs/release-note scope.
