# Design Spec: Member And Team Task Delegation

## Status

Draft for architecture review. Revised after:

- architecture review round 1 findings AR-001 and AR-002;
- implementation code-review round 2 design-impact findings CR-001, CR-002, and CR-003;
- code-review round 6 requirement-gap finding CR-005 for missing frontend task-team execution visibility.

Requirements remain `Design-ready` after CR-005 revision; this design now includes frontend task-team execution visibility in addition to backend/runtime architecture and file-ownership guidance.

## Inputs

- Requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-task-delegation-analysis/tickets/done/team-task-delegation-analysis/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-task-delegation-analysis/tickets/done/team-task-delegation-analysis/investigation-notes.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-task-delegation-analysis/tickets/done/team-task-delegation-analysis/design-review-report.md`
- Implementation handoff reviewed as current implementation evidence: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-task-delegation-analysis/tickets/done/team-task-delegation-analysis/implementation-handoff.md`
- Code review report requiring this rework: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-task-delegation-analysis/tickets/done/team-task-delegation-analysis/code-review-report.md`
- Frontend task-team UI requirement-gap artifact: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-task-delegation-analysis/tickets/done/team-task-delegation-analysis/frontend-task-team-ui-requirement-gap.md`
- Base branch: `origin/personal`
- Worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-task-delegation-analysis` / `codex/team-task-delegation-analysis`

## Task Design Health Assessment

- Change posture: larger requirement / feature, now with design-impact implementation rework.
- Current design issue signal: yes.
- Root cause classification: boundary or ownership issue, shared-structure looseness, duplicated coordination, file placement / responsibility drift, and missing frontend projection requirements.
- Refactor needed now: yes.
- Why:
  - The original current-code pressure was that `delegate_task` treated every target as a flat `member_name` and every execution as a task-agent instance.
  - The first design fixed that with explicit member/team targets, task-agent/task-team execution unions, and parent-ledger team result routing.
  - The implementation then exposed three additional architecture-pressure points before API/E2E should lock in the shape: `mixed-team-member-registry.ts` became a mixed lifecycle catch-all, `TaskDelegationToolService` owned cross-run binding/routing inline, and `TaskTeamDirectory` mixed active run lookup with lifecycle/tombstone state.
- Design response:
  1. Preserve the good decisions: explicit `delegate_task.target`, no `member_name` compatibility, `TaskExecutionInstance` union, `TeamRun` / `TeamManager` as authoritative runtime boundary, and no use of task-team runtime data as topology/roster source.
  2. Split mixed backend runtime instance ownership by subject: persistent members, task-agent instances, and task-team instances.
  3. Add a concrete task-tool run router that owns current-run/parent-run service binding and active run fallback policy.
  4. Rename/tighten `TaskTeamDirectory` into `TaskTeamActiveRunDirectory`, an active runtime resolver only.
  5. Add first-class frontend task-team execution projection so `SoftwareEngineeringTeam · task_0001` is visible distinctly from structural `SoftwareEngineeringTeam`.

## Terminology

- **Communication recipient**: a `send_message_to({ recipient_name })` target from `MemberTeamContext.communicationRecipients`.
- **Task delegation target**: a `delegate_task` target from current-team topology, not from communication recipients.
- **Member target**: a physical `agent` member of the current team context.
- **Team target**: a visible `agent_team` wrapper/member of the current team context.
- **Task-agent instance**: per-task single-agent execution instance for member targets.
- **Task-team instance**: per-task child team execution instance for team targets.
- **Ingress coordinator**: child team member that receives the team-task packet and submits the team result back to the parent task ledger.
- **Task-tool run router**: new model-tool boundary owner that resolves which `TaskDelegationService` a task tool call should use and how task-scoped child team runs are resolved.
- **Task-team active-run directory**: task-delegation-owned active runtime resolver for task-scoped child `TeamRun`s. It is not a topology source, history source, lifecycle ledger, or roster source.
- **Persistent member registry**: mixed-backend owner for ordinary persistent agent/subteam member handles.
- **Task-agent instance registry**: mixed-backend owner for task-agent handles, task-agent recovery, task-agent command routing, and task-agent memory location derivation.
- **Task-team instance registry**: mixed-backend owner for task-team handles and task-team start/post/settle/terminate routing.
- **Task-team execution projection**: frontend transient projection for one concrete team-target task execution; distinct from the structural `agent_team` topology node.
- **Active task execution surface**: frontend strip/list/card surface that shows concrete task-agent and task-team executions currently relevant to the user.

## Legacy Removal Policy

Policy: no backward-compatibility wrapper for the ambiguous member-only target model.

This design preserves member delegation, but replaces `delegate_task({ member_name })` with an explicit target object. Existing tests and prompts migrate to `delegate_task({ target: { kind: "member", name: "..." }, ... })`. Do not keep `member_name` as an in-scope compatibility shorthand.

## Data-Flow Spine Inventory

| Spine ID | Scope | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Tool exposure + `MemberTeamContext` | Model-facing runtime prompt | `MemberRunInstructionComposer` with roster builders | Prevents models from confusing communication names with task targets. |
| DS-002 | Primary End-to-End | `delegate_task` member target | Task-agent active work packet | `TaskDelegationService` / `TaskDelegationActivationCoordinator` / `TeamRun` backend | Preserves member delegation under the explicit target model. |
| DS-003 | Primary End-to-End | `delegate_task` team target | Task-team ingress coordinator receives packet | `TaskDelegationService` / `TaskDelegationActivationCoordinator` / `TeamRun` backend | Enables product-manager-to-team assignment. |
| DS-004 | Return/Event | Child team coordinator submits team result | Parent delegator receives review notification | `TaskDelegationToolRunRouter` + parent `TaskDelegationService` | Critical parent ledger return path; cannot be ordinary `send_message_to`. |
| DS-005 | Return/Event | Parent delegator review accept/revision | Task-team revision delivery or settlement | `TaskDelegationService` / settlement coordinators | Closes lifecycle and exits task-scoped team instances safely. |
| DS-006 | Primary End-to-End | Parent PM accepted one task | Parent PM delegates a later task | Parent team run + topology-based roster | Ensures iterative PM feature work while child task-team instances exit. |
| DS-007 | Primary End-to-End | Any child member in a task-scoped team calls a task tool | Child team `TaskDelegationService` resolves and runs | `TaskDelegationToolRunRouter` + `TaskTeamActiveRunDirectory` | Makes task-scoped child `TeamRun`s resolvable without registering them as top-level runs. |
| DS-008 | Bounded Local/Internal | `TeamRun` mixed runtime command/status/termination | Correct persistent/task-agent/task-team runtime instance owner | `MixedTeamManager` | Prevents mixed backend instance lifecycle from collapsing into one god registry. |
| DS-009 | Primary Frontend Projection | `TASK_DELEGATION_EVENT` with `execution_kind=task_team` | Visible task-team execution card/node | `TeamTaskExecutionProjection` / active task execution UI | Makes team-target delegation product-visible, not backend-only. |
| DS-010 | Frontend Lifecycle/Timeline | task-team result/review/settlement events | Updated task-team status/timeline and cleanup/history | `TeamTaskExecutionProjection` + lifecycle/timeline store | Lets parent delegator see awaiting review, revision, acceptance, and settlement. |

## Primary Execution Spines

### DS-001 Prompt / roster spine

`Tool Exposure -> MemberTeamContext -> CommunicationRosterBuilder + DelegationTargetRosterBuilder -> MemberRunInstructionComposer -> Runtime Prompt`

### DS-002 Member target delegation spine

`Model delegate_task(member target) -> Tool Parser -> TaskDelegationToolRunRouter.resolveServiceForDelegateOrReview -> TaskDelegationInputResolver -> TaskDelegationLedger -> TaskDelegationActivationCoordinator -> TeamRun.startTaskAgentInstance -> MixedTeamManager -> MixedTaskAgentInstanceRegistry -> MixedAgentMemberHandle -> Task Agent Run`

### DS-003 Team target delegation spine

`Model delegate_task(team target) -> Tool Parser -> TaskDelegationToolRunRouter.resolveServiceForDelegateOrReview -> TaskDelegationInputResolver -> TaskDelegationLedger -> TaskDelegationActivationCoordinator -> TaskTeamRunIdentityFactory -> TeamRun.startTaskTeamInstance -> MixedTeamManager -> MixedTaskTeamInstanceRegistry -> MixedTaskTeamMemberHandle -> Task-scoped Child TeamRun -> TaskTeamActiveRunDirectory.bindActiveRun -> Ingress Coordinator AgentRun`

### DS-004 Team result return spine

`Ingress Coordinator submit_task_result -> TaskDelegationToolRunRouter.resolveServiceForSubmit(parent task-team ingress route) -> Parent TaskDelegationService.submitTaskTeamIngressResult -> Parent TaskDelegationLedger -> TaskDelegationNotificationDispatcher -> Product Manager`

### DS-005 Review / settlement spine

`Product Manager review_task_result -> TaskDelegationToolRunRouter.resolveServiceForDelegateOrReview -> Parent TaskDelegationService -> Parent Ledger -> Revision Notification or TaskTeamSettlementCoordinator -> TaskTeamActiveRunDirectory.resolveActiveEntry -> TeamRun.settleTaskTeamInstance -> MixedTaskTeamInstanceRegistry -> MixedTaskTeamMemberHandle -> child TeamRun termination`

### DS-007 Child task-tool resolution spine

`Child Team Member task tool call -> TaskDelegationToolRunRouter.resolveServiceForDelegateOrReview -> TeamRunService active/restore lookup miss -> TaskTeamActiveRunDirectory active child-run lookup hit -> TaskDelegationRunRegistry.getOrCreate(childRun) -> Child TaskDelegationService`

### DS-008 Mixed runtime instance dispatch spine

`MixedTeamManager public runtime command/status/termination -> choose subject registry -> MixedPersistentMemberRegistry OR MixedTaskAgentInstanceRegistry OR MixedTaskTeamInstanceRegistry -> concrete handle`

### DS-009 Frontend task-team root and child projection spine

`WebSocket TASK_DELEGATION_EVENT(task_team) -> TeamStreamingService -> TaskExecutionProjectionEventRouter -> extractTaskTeamIdentity -> ensureTaskTeamExecutionProjection -> cloneTaskTeamChildTree -> AgentTeamContext root + scoped child projection state -> ActiveTaskExecutionsBar + TeamMemberMonitorTile/Workspace`

### DS-010 Frontend task-team lifecycle/timeline spine

`TASK_DELEGATION_RESULT_SUBMITTED/REVIEWED/ACCEPTED/SETTLED event -> TaskExecutionProjectionEventRouter -> task-team projection lifecycle/timeline update -> cascade cleanup or history transition -> parent delegator sees awaiting review/revision/accepted/settled state`

### DS-011 Frontend task-scoped child stream routing spine

`Stamped child AGENT_STATUS/SEGMENT/TOOL/MEMBER_INPUT/COMMUNICATION event -> websocket payload with task_team_run_id + relative child route -> TeamStreamingService -> TaskExecutionProjectionEventRouter -> teamTaskTeamChildProjection resolves/promotes scoped child context -> existing generic handlers update scoped child, not structural node`

## Spine Narratives

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | Runtime instructions are composed from actual tool exposure and current member context. Communication recipients and delegation targets are built separately before text rendering. | `MemberTeamContext`, roster manifests, instruction composer | `MemberRunInstructionComposer` | tool exposure, recipient-name availability, snapshot tests |
| DS-002 | Existing member delegation becomes one branch of an explicit target model. It creates a fresh task-agent run through the runtime boundary. | target resolver, ledger, activation coordinator, task-agent instance | `TaskDelegationService` + `MixedTaskAgentInstanceRegistry` | input schema, work packet text, event publishing |
| DS-003 | A parent PM assigns work to a visible team. The parent ledger owns the task; activation creates a per-task child team run and delivers the packet to the ingress coordinator. | team target, task-team instance, child team run | `TaskDelegationService` + `TeamRun` backend | fresh run-id allocation, parent-boundary context, ingress routing |
| DS-004 | The ingress coordinator's `submit_task_result` is routed to the parent ledger by explicit task-team binding, not by ordinary messages or name inference. | task-tool run route, team-task binding, parent ledger submission | `TaskDelegationToolRunRouter` / `TaskDelegationService` | notification delivery, result payload shape |
| DS-005 | Parent review either sends revision instructions back to the same task-team instance or accepts and requests safe settlement. | review transition, notification dispatcher, settlement coordinator | `TaskDelegationService` | open-work gate, child team termination, warnings |
| DS-006 | After one team task is accepted, only the task-scoped team run exits. Parent topology remains and the PM can delegate another feature task. | parent team run, active runtime directories, mixed registries | `TeamRun` / `MixedTeamManager` | cleanup, no completed run IDs in initial roster |
| DS-007 | Task tools called from any child member resolve the task-scoped child `TeamRun` through the router's active-run fallback. | child member context, active-run directory, child task delegation service | `TaskDelegationToolRunRouter` | active child-run bind/unbind |
| DS-008 | Mixed backend commands dispatch to registries by lifecycle subject rather than one catch-all registry. | persistent handles, task-agent handles, task-team handles | `MixedTeamManager` | cross-kind status aggregation and termination order |
| DS-009 | Frontend consumes task-team delegation identity and creates a concrete runtime projection distinct from structural team topology, including scoped child member clones. | stream event, task-team identity, root projection node, scoped child projection nodes | `TaskExecutionProjectionEventRouter` / `teamTaskTeamExecutionProjection` / `teamTaskTeamChildProjection` | active execution UI, node insertion, focus safety |
| DS-010 | Task-team lifecycle events update status/timeline and cleanup rules so parent delegator sees review/acceptance/settlement state and ghost child projections are removed. | lifecycle event, timeline entry, projection status, cleanup cascade | `teamTaskTeamExecutionProjection` | history/cleanup, nested activity grouping |
| DS-011 | Stamped task-scoped child stream events update the task-team scoped child context before generic structural resolution can see them. | stamped websocket event, scoped child identity, scoped child `AgentContext`, child task-agent association | `TaskExecutionProjectionEventRouter` / `teamTaskTeamChildProjection` | backend event stamping, run-id promotion, contract violation logging |

## Spine Actors / Main-Line Nodes

- `MemberRunInstructionComposer`: model-facing runtime-instruction composer.
- `CommunicationRosterBuilder`: communication recipient source only.
- `DelegationTargetRosterBuilder`: task-target source for prompts and validation examples.
- `TaskDelegationToolService`: thin model-tool adapter for task-delegation tools.
- `TaskDelegationToolRunRouter`: task-tool run/service binding owner.
- `TaskDelegationInputResolver`: explicit target selector normalization and validation.
- `TaskDelegationService`: authoritative task lifecycle owner per team-run ledger.
- `TaskDelegationLedger`: task state, target identity, execution binding, submissions, reviews.
- `TaskDelegationActivationCoordinator`: starts the correct runtime execution instance for the selected target.
- `TaskTeamRunIdentityFactory`: builds fresh task-team identity and materialized child-team config.
- `TeamRun` / `TeamManager`: authoritative runtime command boundary.
- `MixedTeamManager`: mixed-backend public command composition and cross-kind status/termination owner.
- `MixedPersistentMemberRegistry`: persistent agent/subteam handle owner.
- `MixedTaskAgentInstanceRegistry`: task-agent runtime instance owner.
- `MixedTaskTeamInstanceRegistry`: task-team runtime instance owner.
- `MixedTaskTeamMemberHandle`: runtime owner for one task-scoped child team run.
- `TaskTeamActiveRunDirectory`: active task-team child-run resolver.
- `TaskTeamSettlementCoordinator`: safe settlement owner for accepted task-team instances.
- `TaskExecutionProjectionEventRouter`: frontend stream/projection router for task delegation events and stamped task-scoped child stream events.
- `TeamTaskTeamExecutionProjection`: frontend owner for task-team identity extraction, transient root node/card creation, lifecycle status/timeline updates, and root cleanup.
- `TeamTaskTeamChildProjection`: frontend owner for scoped child projection identity, child clone creation, child `AgentContext` creation/promotion, child status updates, child task-agent parent association data, and child cleanup.
- `TeamRunEvent.taskTeamInstance` / websocket mapper stamping: backend event contract for task-scoped child stream identity.
- `ActiveTaskExecutionsBar`: generalized frontend surface for task-agent and task-team execution cards.

## Ownership Map

| Node | Owns |
| --- | --- |
| `MemberTeamContext` | current member identity, topology descriptors, communication recipients, and task-bound context metadata visible to a member run. |
| `DelegationTargetRosterBuilder` | derivation of `member` and `team` task target rows from current topology and tool availability; must not read `communicationRecipients` as task targets. |
| `TaskDelegationToolRunRouter` | task-tool run binding: current service for delegate/review, parent service for task-team ingress submit, `TeamRunService` then active task-team fallback, and run-registry service lookup. |
| `TaskDelegationInputResolver` | target selector normalization, deterministic target errors, self-target rejection, and caller authorization checks. |
| `TaskDelegationService` | task lifecycle sequencing: create, activate, submit result on an already selected ledger, review, revision, accepted terminal state, and settlement request. |
| `TaskDelegationLedger` | durable in-memory record shape for target identity, execution instance identity, status transitions, result submissions, and reviews. |
| `TaskDelegationActivationCoordinator` | branch selection between member activation and team activation. |
| `TaskTeamRunIdentityFactory` | fresh task-team run id and child member run id assignment from a logical `agent_team` config. |
| `TeamRun` / `TeamManager` | runtime activation, posting, interruption, settlement, and termination commands. |
| `MixedTeamManager` | composition of runtime subject registries, public mixed-backend command routing, cross-kind status aggregation, and termination order. |
| `MixedPersistentMemberRegistry` | persistent member handle map, ordinary member context resolution, get/create/remove, and ordinary persistent handle listing. |
| `MixedTaskAgentInstanceRegistry` | task-agent handle map, recovery cache usage, task-agent memory location derivation, task-agent command routing, and task-agent cleanup. |
| `MixedTaskTeamInstanceRegistry` | task-team handle map, task-team start/post/settle/terminate/list, and task-team cleanup. |
| `MixedTaskTeamMemberHandle` | lifecycle of one task-team child run, including active-run binding and ingress/revision delivery. |
| `TaskTeamActiveRunDirectory` | active task-team entries keyed for runtime lookup by taskTeamRunId and child teamRunId; bind/unbind only active child `TeamRun` references. |
| `TaskTeamSettlementCoordinator` | accepted team-task settlement gates and eventual child team termination. |
| `TaskExecutionProjectionEventRouter` | frontend task-delegation event dispatch by execution kind/lifecycle event type and task-scoped child stream routing before generic structural resolution. |
| `TeamTaskTeamExecutionProjection` | task-team identity extraction, transient root `agent_team` projection creation, insertion near/under the logical team, lifecycle status/timeline updates, and root cleanup/history transition. |
| `TeamTaskTeamChildProjection` | task-scoped child member projection identity/model, clone/repair, leaf child `AgentContext` creation and runtime-run-id promotion, child status updates, child task-agent parent association metadata, and cascade cleanup. |
| `TeamRunEvent.taskTeamInstance` / websocket mapper stamping | backend-to-frontend contract for all task-scoped child events: task-team run id, instance id, task id, logical team route/path, and relative child path/route. |
| `ActiveTaskExecutionsBar` | visible active execution card/list surface for both task-agent and task-team execution projections. |

## Thin Entry Facades / Public Wrappers

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `TaskDelegationToolsMcpAdapterProvider` | `TaskDelegationToolService` | MCP tool adapter for model calls | target validation, run binding, or lifecycle policy |
| `TaskDelegationToolService` | `TaskDelegationToolRunRouter` + `TaskDelegationService` | tool API adapter for parsed tool calls | `TeamRunService` fallback logic, parent submit routing, run-registry lookup |
| `TeamRun` methods | backend `TeamManager` | stable runtime command boundary | mixed-backend-specific handle lookup policy |
| runtime backend prompt composers | `composeMemberRunInstructions` | backend-specific formatting hooks | roster semantics |

## Removal / Decommission Plan

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope | Notes |
| --- | --- | --- | --- | --- |
| `delegate_task` `member_name`-only schema/parser/description | Ambiguous and cannot represent team targets | explicit `target` object schema | In This Change | Update tests and docs. |
| `TaskDelegationRecord.member` as the only target field | Misrepresents team tasks as member tasks | `TaskDelegationTarget` union | In This Change | Member target remains as `target.kind=member`. |
| `TaskDelegationRecord.taskAgentInstance` as the only execution binding | Cannot represent task-team instances | `TaskExecutionInstance` union | In This Change | Result/review payloads branch by execution kind. |
| Generic task-delegation prompt text saying exact logical team member only | Incorrect after team targets | capability-gated delegation target roster | In This Change | Snapshot coverage required. |
| Any implementation deriving delegation targets from `allowedRecipientNames` | Conflates communication with task ownership | `DelegationTargetRosterBuilder` | In This Change | Add regression test with representative-only recipient. |
| Any assumption that task-scoped child `TeamRun`s resolve through `AgentTeamRunManager` | Task-scoped child runs are mixed child runs, not top-level run manager entries | `TaskTeamActiveRunDirectory` fallback via `TaskDelegationToolRunRouter` | In This Change | Do not expose completed task-team run ids as initial delegation targets. |
| `mixed-team-member-registry.ts` as a catch-all owner for persistent, task-agent, and task-team lifecycles | It is already a 497-line responsibility hotspot and would become a god-object | `MixedPersistentMemberRegistry`, `MixedTaskAgentInstanceRegistry`, `MixedTaskTeamInstanceRegistry`, composed by `MixedTeamManager` | Rework Before API/E2E | The old file should be removed or reduced to no exported production owner; do not keep it as a compatibility facade. |
| Inline run binding in `task-delegation-tool-service.ts` | Tool adapter should not own current/parent run selection, active-run fallback, and run-registry lookup | `task-delegation-tool-run-router.ts` | Rework Before API/E2E | Tool service delegates all run/service routing to router. |
| `TaskTeamDirectory` lifecycle/tombstone shape | Active resolver name must match responsibility and must not become history/lifecycle manager | `TaskTeamActiveRunDirectory` | Rework Before API/E2E | Remove starting/settled statuses, tombstone set, and unused task-id index unless a real caller/invariant is added. |
| `TaskTeamDirectory.taskTeamRunIdByTaskId` | Populated without a current caller and broadens directory responsibility | no replacement unless a real caller is designed | Rework Before API/E2E | Parent task id remains in ledger/identity, not an active-run lookup index. |
| `TaskDelegationLedger.hasOpenWorkBlockingTaskTeamSettlement` if still unused after settlement refactor | Duplicates or suggests unowned settlement policy | `TaskDelegationService.hasOpenWork()` / `TaskTeamSettlementCoordinator` child-service query | Rework Before API/E2E | Remove unless settlement intentionally calls it. |
| Legacy fallback fields in `flattenTaskDelegationIdentity` if current event payloads no longer need them | Dormant old event shape support would preserve obsolete payloads | current `target` + `execution` event model | Rework Before API/E2E | Remove unless there is an explicit serialized-event compatibility requirement. |

## Return Or Event Spines

### Result submitted

`Task Agent or Task-Team Ingress -> submit_task_result -> TaskDelegationToolRunRouter -> Owning TaskDelegationService -> Ledger awaiting_review -> TASK_DELEGATION_RESULT_SUBMITTED event -> Notification to original delegator`

### Revision requested

`Original Delegator -> review_task_result(request_revision) -> TaskDelegationToolRunRouter -> Ledger active -> TASK_DELEGATION_RESULT_REVIEWED event -> Notification to execution instance`

For member execution, revision notification targets the task-agent run id. For team execution, revision notification targets the task-team instance and is delivered to the ingress coordinator in that task-scoped child team run.

### Accepted / settlement

`Original Delegator -> review_task_result(accept) -> TaskDelegationToolRunRouter -> Ledger accepted -> settlement requested -> task-agent or task-team settlement coordinator -> runtime instance exits after safe gates`

## Bounded Local / Internal Spines

| Parent Owner | Local Spine | Why It Matters |
| --- | --- | --- |
| `TaskDelegationToolRunRouter` | `tool context -> choose current vs parent route -> resolve TeamRun through TeamRunService then TaskTeamActiveRunDirectory -> get TaskDelegationService` | Gives task-tool run binding one owner. |
| `TaskDelegationActivationCoordinator` | `record target -> branch member/team -> bind execution instance -> start runtime -> mark active or rollback` | Keeps activation atomic around the ledger. |
| `TaskTeamSettlementCoordinator` | `acceptance request -> pending settlement -> resolve active child run -> observe child team events/status -> open-work gate -> terminate child run -> unbind active run` | Prevents accepting a team task from killing a still-working child team. |
| `MixedTeamManager` | `public runtime command/status/termination -> select persistent/task-agent/task-team registry -> aggregate result/status` | Keeps cross-kind command composition explicit without one catch-all registry. |
| `MixedTaskTeamMemberHandle` | `start -> create child TeamRun -> bind active child run in TaskTeamActiveRunDirectory -> post packet to coordinator -> record runtime context -> deliver revisions -> terminate/dispose -> unbind active run` | Owns one task-team runtime lifecycle and makes child task tools resolvable. |

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Tool parameter schema | DS-002, DS-003 | `TaskDelegationToolService` | expose explicit target object | Keeps model surface unambiguous | lifecycle classes start owning transport shape |
| Tool run binding | DS-002, DS-004, DS-007 | `TaskDelegationToolRunRouter` | resolve current/parent task service and active child-team run fallback | Keeps run-binding policy out of the tool adapter and lifecycle service | repeated routing branches across tool and lifecycle code |
| Target roster rendering | DS-001 | `MemberRunInstructionComposer` | prompt text from structured rows | Keeps human/model semantics clear | prompt text drifts from validator behavior |
| Team-task context injection | DS-003, DS-004 | `MemberTeamContextBuilder` / mixed runtime | give ingress coordinator parent task binding | Allows child coordinator to submit to parent ledger | submit_task_result cannot find parent task |
| Event publishing | DS-002..DS-005 | `TaskDelegationService` | lifecycle events for UI/history | Keeps observable behavior consistent | activation/settlement owners mix UI concerns |
| Notification rendering | DS-004, DS-005 | `TaskDelegationNotificationDispatcher` | system messages for result/revision | Keeps lifecycle messages out of business transitions | ledgers become prompt renderers |
| Identity allocation | DS-003, DS-006 | `TaskTeamRunIdentityFactory` | fresh task-team and child member run ids | Enables task-scoped team exit/restart | reused runtime identities confuse sequential work |
| Active child-run resolution | DS-003, DS-005, DS-007 | `TaskTeamActiveRunDirectory` | resolve active task-scoped child `TeamRun`s by taskTeamRunId or child teamRunId | Child team members' task tools and settlement checks need the child run object | global run manager polluted or active resolver becomes history manager |
| Mixed runtime instance storage | DS-008 | `MixedPersistentMemberRegistry`, `MixedTaskAgentInstanceRegistry`, `MixedTaskTeamInstanceRegistry` | store and command handles by lifecycle subject | Avoids one registry becoming a god-object | hidden cross-kind lifecycle coupling |
| Task-scoped child event stamping | DS-011 | `MixedTaskTeamMemberHandle` / event bridge / websocket mapper | carry task-team identity and relative child route on child events | Prevents simultaneous task-team executions from colliding in UI | frontend guesses from structural source paths |
| Frontend task-team child projection | DS-009, DS-011 | `TeamTaskTeamChildProjection` | scoped child identity, clone/context creation, run-id promotion, cleanup | Keeps structural nodes immutable and child events correctly scoped | generic resolver mutates topology or drops child activity |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Member target lifecycle | task-delegation | Extend | Existing path already owns task-agent lifecycle | N/A |
| Team runtime start/terminate | team execution / mixed backend | Extend | TeamRun/TeamManager is authoritative runtime boundary | N/A |
| Child team run creation | `MixedSubTeamRunFactory` | Reuse | Already builds child `TeamRun` from subteam config | N/A |
| Task-team per-task identity | no exact existing owner | Create New | Existing launch identity is public launch/persistent topology; task-team needs per-task materialization from a subteam config | Existing launch assignment rejects manual IDs and is not shaped as task instance metadata. |
| Task-tool run binding | no exact existing owner; current tool service owns it inline | Create New `TaskDelegationToolRunRouter` | The policy spans current team run, parent task-team ingress run, active child-run fallback, and run-registry service lookup | `TaskDelegationToolService` should remain a model-tool adapter; `TaskDelegationService` should own lifecycle transitions, not tool-run lookup. |
| Active child team run resolution for task tools | no exact existing owner; `TeamRunService` only resolves top-level active/restorable runs | Rename/Tighten to `TaskTeamActiveRunDirectory` | Task-scoped child runs are not top-level history runs, but child member tools still need active lookup | Registering them as normal top-level runs blurs lifecycle/history semantics; keeping lifecycle/tombstones in this directory makes it a second history manager. |
| Mixed backend runtime instance ownership | existing `MixedTeamManager`, handle classes, and registries | Split / Extend | Existing handle types are right, but registry ownership must be by lifecycle subject | One `MixedTeamMemberRegistry` no longer has a singular responsibility. |
| Prompt roster rendering | member run instruction services | Extend | Current prompt composers already receive tool exposure and member context | N/A |
| Result/revision notification | task-delegation notification dispatcher | Extend | Same lifecycle messages, new execution target kind | N/A |
| Frontend task-agent projection | `teamTaskAgentContextProjection.ts` and active execution UI | Extend / Preserve | Existing task-agent projection is the baseline; task-team child task-agents should pass scoped parent identity to it rather than rewriting member-target behavior | N/A |
| Frontend task-team root/child projection | agent streaming projection services | Create / Extend | Existing stream resolver only owns structural/task-agent contexts; task-team child clones need a dedicated scoped projection owner | Generic resolver cannot safely clone topology or infer concurrent task-team identity. |
| Backend task-scoped child event identity | mixed event bridge + websocket mapper | Extend | Existing prefixing supplies structural source paths but not concurrent-safe task-team identity | Source path alone cannot distinguish two active task-team executions of the same logical team. |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-team-execution/task-delegation` | target model, ledger, activation, result/review, settlement, active task-team child-run resolver | DS-002..DS-007 | `TaskDelegationService` | Extend / Tighten | Active-run resolver stays here because task-scoped child runs exist only for delegated team tasks. It must not own topology/history. |
| `agent-team-execution/domain` | runtime command request/identity types that `TeamRun` consumes | DS-003, DS-005 | `TeamRun` | Extend | Runtime-only task-team instance request types; no imports from task-delegation target/lifecycle files. |
| `agent-team-execution/backends/mixed` | mixed runtime implementation of persistent members, task-agent instances, and task-team instances | DS-002, DS-003, DS-008 | `MixedTeamManager` and subject registries | Split / Extend | Add real subject registries; do not keep `MixedTeamMemberRegistry` as a catch-all. |
| `agent-team-execution/services` | prompt rosters and member context construction | DS-001, DS-004 | instruction composer / context builder | Extend | Keep communication vs delegation manifests separate. |
| `agent-tools/task-delegation` | model-facing tool schema/parser/manifest/service adapter and tool-run router | DS-002, DS-004, DS-007 | `TaskDelegationToolService` / `TaskDelegationToolRunRouter` | Extend / Tighten | Explicit target object plus one run-binding owner. |
| `services/agent-streaming` backend mapper | websocket event transport mapping | DS-009, DS-011 | frontend projection owners | Extend | Flatten task-team identity onto all task-scoped child events, not only task-delegation lifecycle events. |
| `autobyteus-web/services/agentStreaming` | frontend stream projection and context routing | DS-009..DS-011 | `TeamStreamingService`, projection router, projection owners | Extend / Split | Add root and child task-team projection owners; generic resolver delegates before structural lookup. |
| `autobyteus-web/utils` + workspace components | active execution flattening and rendering | DS-009..DS-011 | active execution UI | Extend | Render task-team root/children/nested task-agents without changing member-target task-agent behavior. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `task-delegation-target.ts` | task-delegation | target model | `TaskDelegationTarget`, member/team target identities, clone helpers | Shared by resolver, ledger, roster, events | Yes |
| `task-team-instance.ts` | domain | runtime task-team command identity | `LogicalTaskTeamMemberIdentity`, `TaskTeamInstanceIdentity`, `StartTaskTeamInstanceRequest` | Parallel to `task-agent-instance.ts` but team-specific and runtime-only | No task-delegation imports |
| `task-team-run-identity-factory.ts` | task-delegation | team-task identity allocation | fresh task team run id + materialized child config | Keeps allocation out of backend handle | Yes |
| `task-team-active-run-directory.ts` | task-delegation | active child-run resolver | active task-team entry lookup by taskTeamRunId or child teamRunId, plus parent cleanup | Name matches active-runtime responsibility | Yes |
| `task-delegation-tool-run-router.ts` | agent tools / task delegation | task-tool run binding | current/parent service selection, active run fallback, run-registry lookup | Gives repeated tool routing one owner | Yes |
| `delegation-target-roster-builder.ts` | services | prompt manifest | member/team target rows | Prompt builder must not derive from comm recipients | Yes |
| `mixed-persistent-member-registry.ts` | mixed backend members | persistent member handles | ordinary agent/subteam handle map and get/create/remove/list/resolveContext | Persistent topology has a different lifecycle from task instances | Yes |
| `mixed-task-agent-instance-registry.ts` | mixed backend members | task-agent instances | start/post/deliver/approve/settle/terminate/recover task agents and memory config derivation | Task-agent recovery and memory policy are one subject | Yes |
| `mixed-task-team-instance-registry.ts` | mixed backend members | task-team instances | start/post/settle/terminate/list task-team handles | Task-team runtime instances are one subject | Yes |
| `mixed-team-member-config-resolver.ts` | mixed backend members | member config lookup | route/run-id lookup in team member config trees | Avoids duplicated tree traversal after registry split | Optional; add if both persistent and task-agent registries need config lookup |
| `mixed-task-team-member-handle.ts` | mixed backend members | runtime instance | one task-scoped child team run | Separate from ordinary subteam communication handle | Yes |
| `task-team-settlement-coordinator.ts` | task-delegation | settlement | pending accepted team instance settlement and child open-work gate | Separate safe gates from task-agent idle logic | Yes |
| `team-run-event.ts` | team execution domain | event contract | optional task-team instance marker for task-scoped child events | Domain event boundary carries runtime identity to transport | `TaskTeamInstanceIdentity` |
| `mixed-team-event-bridge.ts` | mixed backend events | event prefix/stamp | prefix child paths and attach task-team identity | One place translates child events into parent stream events | Yes |
| `team-run-event-websocket-message-mapper.ts` | backend streaming mapper | transport flattening | task-team scoped event fields on all child message kinds | Transport owner already maps domain events to server messages | Yes |
| `teamTaskExecutionProjection.ts` | frontend stream projection | shared projection types | status/timeline, kind guards, scoped key builders | Avoids duplicated task execution field semantics | Yes |
| `teamTaskTeamExecutionProjection.ts` | frontend stream projection | task-team root projection | identity extraction, root node lifecycle/timeline, root cleanup | Root task-team execution is one concrete subject | Yes |
| `teamTaskTeamChildProjection.ts` | frontend stream projection | task-team child projection | scoped child identity, clone/context creation, run-id promotion, child status, cleanup | Child clones need one owner separate from root lifecycle | Yes |
| `teamTaskExecutionEventRouter.ts` | frontend stream projection | projection event routing | dispatch task-team lifecycle and scoped child events before generic resolver | Prevents structural resolver bypass/collision | Yes |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| member vs team task target identity | `task-delegation-target.ts` | task-delegation | Resolver, ledger, results, events, roster all need same target meaning | Yes | Yes | kitchen-sink member/team optional object |
| task-agent vs task-team execution identity | `task-execution-instance.ts` or colocated record model | task-delegation | Ledger, notification, settlement need one execution union | Yes | Yes | parallel unscoped run-id fields without discriminator |
| active task-team child run lookup | `task-team-active-run-directory.ts` | task-delegation | Tool router and settlement both need active child run by taskTeamRunId/teamRunId | Yes | Yes | lifecycle ledger, tombstone store, topology roster source |
| task-tool service binding | `task-delegation-tool-run-router.ts` | agent tools / task delegation | delegate/review/submit all need consistent current/parent run selection | Yes | Yes | pass-through facade; it must own routing policy |
| mixed runtime member config traversal | `mixed-team-member-config-resolver.ts` if repeated | mixed backend | persistent and task-agent registries both need config lookup | Yes | Yes | generic helper with lifecycle policy |
| delegation roster row | `delegation-target-roster-builder.ts` | services | Prompt and tests need structured rows | Yes | Yes | communication recipient alias |
| task-bound member context | `member-team-context.ts` extension | team execution domain | Tool service and prompt composer need task binding | Yes | Yes | arbitrary customData bag |
| task-team child projection identity | `teamTaskTeamChildProjection.ts` | frontend agent streaming | clone, event routing, focus, and cleanup need the same scoped identity shape | Yes | Yes | optional-field kitchen-sink node |
| task-team scoped websocket identity | `teamStreamIdentityTypes.ts` + mapper flattening | backend/frontend stream protocol | all child event kinds need the same `task_team_run_id` + relative route contract | Yes | Yes | source-path-only inference |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Parallel / Overlapping Representation Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `TaskDelegationTarget` | Yes | Yes | Low | Discriminated union: `kind` plus one identity object. |
| `TaskExecutionInstance` | Yes | Yes | Medium | Use discriminator; do not keep unscoped `targetAgentRunId` as universal field. |
| `TaskTeamInstanceIdentity` | Yes | Yes | Low | Runtime-owned identity only; do not import/reuse `TaskDelegationTarget`. |
| `TaskTeamActiveRunEntry` | Yes | Yes | Medium | Active entry contains identity plus active child `TeamRun`; no `starting`/`settled` status, no tombstone set, no task-id lookup index unless a real active lookup caller is added. |
| `DelegationTargetRosterRow` | Yes | Yes | Low | Separate from `CommunicationRosterRow`. |
| `TaskTeamChildMemberProjectionIdentity` | Yes | Yes | Low | Parent task-team identity, structural source identity, relative child identity, scoped frontend identity, and runtime member run id each have one meaning. |
| `TaskTeamScopedEventPayloadFields` | Yes | Yes | Low | `task_team_run_id` is the execution selector; relative route/path selects the child within that execution; structural `source_path` is display/source context only. |

## Final File Responsibility Mapping

| File | Owning Subsystem | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-target.ts` | task-delegation | target model | member/team target identities and helpers | Central semantic model for target identity | N/A |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-execution-instance.ts` | task-delegation | execution model | task-agent/task-team execution union and helpers | Prevents optional-field spread in ledger/notifications | `TaskAgentInstanceIdentity`, `TaskTeamInstanceIdentity` |
| `autobyteus-server-ts/src/agent-team-execution/domain/task-team-instance.ts` | team execution domain | runtime request model | `LogicalTaskTeamMemberIdentity`, `TaskTeamInstanceIdentity`, `StartTaskTeamInstanceRequest`, clone helper | TeamRun backend command type; parallel to task-agent domain type | None from task-delegation; activation converts into this type |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-team-run-identity-factory.ts` | task-delegation | identity allocation | allocate taskTeamRunId and fresh child member run ids from logical subteam config | Activation-specific materialization | team run id + agent run allocator |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-team-active-run-directory.ts` | task-delegation | active child-run resolver | active task-team entries and fallback active child `TeamRun` resolver by taskTeamRunId/child teamRunId | Makes child member task tools and settlement checks actionable without top-level run registration | task-team runtime identity |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-team-settlement-coordinator.ts` | task-delegation | team settlement | safe settlement gates and pending settlement of task-team instances | Separate from task-agent idle settlement | active-run directory + run registry |
| `autobyteus-server-ts/src/agent-tools/task-delegation/task-delegation-tool-run-router.ts` | agent tools / task delegation | task-tool run binding | resolve service for delegate/review, resolve service for submit, resolve active team run, get task service | Removes run-binding policy from the tool adapter | `TeamRunService`, active-run directory, run registry |
| `autobyteus-server-ts/src/agent-tools/task-delegation/task-delegation-tool-service.ts` | agent tools / task delegation | tool adapter | delegate/submit/review tool methods call router then lifecycle service | Keeps model tool surface thin | router + service only |
| `autobyteus-server-ts/src/agent-team-execution/services/delegation-target-roster-builder.ts` | services | roster manifest | model-facing delegation target rows | Separate from communication roster builder | target model |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/mixed-team-manager.ts` | mixed backend | runtime composition | compose persistent/task-agent/task-team registries, route public commands, aggregate status, terminate in order | MixedTeamManager is the authoritative backend boundary | subject registries |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-persistent-member-registry.ts` | mixed backend members | persistent handles | ordinary member context resolution, get/create/remove/list/dispose persistent handles | Separate lifecycle from task instances | member contexts/config resolver |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-task-agent-instance-registry.ts` | mixed backend members | task-agent handles | task-agent start/post/deliver/approve/settle/terminate/recover and memory location derivation | Keeps task-agent-specific recovery out of persistent registry | task-agent identity, recovery cache |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-task-team-instance-registry.ts` | mixed backend members | task-team handles | task-team start/post/settle/terminate/list | Existing file remains but is composed directly by MixedTeamManager | task-team identity, active-run directory |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-task-team-member-handle.ts` | mixed backend members | runtime handle | task-scoped child team run start/post/revision/terminate, active-run bind/unbind, and task-team identity stamping for child/overlay events | Separate from ordinary subteam handle | task-team identity |
| `autobyteus-server-ts/src/agent-team-execution/domain/team-run-event.ts` | team execution domain | event contract | optional task-team instance marker on task-scoped child events | Keeps event identity in runtime domain, not frontend inference | `TaskTeamInstanceIdentity` |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/events/mixed-team-event-bridge.ts` | mixed backend events | event bridge | prefix child source/member paths and preserve task-team identity marker | Existing bridge owns child-to-parent event adaptation | task-team identity |
| `autobyteus-server-ts/src/services/agent-streaming/team-run-event-websocket-message-mapper.ts` | backend streaming mapper | websocket flattening | emit task-team root and scoped child fields for every task-scoped event kind | Transport mapper owns server-message payload shape | task-team identity fields |
| `autobyteus-web/services/agentStreaming/teamTaskExecutionProjection.ts` | frontend stream projection | shared task execution model | normalized status/timeline, kind predicates, scoped key builders | Prevents duplicate task-agent/task-team projection semantics | task execution projection types |
| `autobyteus-web/services/agentStreaming/teamTaskTeamExecutionProjection.ts` | frontend stream projection | task-team root projection | extract task-team identity, create/update root node, lifecycle/timeline, cascade cleanup entrypoint | Root task-team execution is one subject | child projection owner |
| `autobyteus-web/services/agentStreaming/teamTaskTeamChildProjection.ts` | frontend stream projection | task-team child projection | scoped child identity, clone/repair child nodes, child AgentContext creation/promotion, child status, child task-agent association data, cleanup | Prevents structural-node mutation and event collisions | structural team template data |
| `autobyteus-web/services/agentStreaming/teamTaskExecutionEventRouter.ts` | frontend stream projection | event router | intercept task-team lifecycle and stamped child stream events before generic resolution | One explicit owner for projection event routing | root/child projection owners |
| `autobyteus-web/services/agentStreaming/teamStreamMemberContextResolver.ts` | frontend stream projection | member context resolver | delegate task-team scoped events before task-agent extraction and structural lookup | Avoids task-agent/structural misattachment | projection event router |
| `autobyteus-web/services/agentStreaming/protocol/teamStreamIdentityTypes.ts` | frontend stream protocol | payload typing | task-team scoped identity fields | Keeps payload typing explicit | N/A |

Existing files to modify:

- `task-delegation-record.ts`: target/execution unions and team-aware result submission fields.
- `task-delegation-ledger.ts`: records by target, execution binding, member/team submissions, and only intentional open-work helpers.
- `task-delegation-input-resolver.ts`: explicit target selectors, self/wrong-kind errors.
- `task-delegation-activation-coordinator.ts`: member/task-agent and team/task-team activation; no active-run directory `starting` registration.
- `task-delegation-work-packet-renderer.ts`: member packet and team packet variants.
- `task-delegation-notification-dispatcher.ts`: revision notifications to task-agent or task-team instance.
- `task-delegation-service.ts`: lifecycle transitions on a service already selected by the router; explicit task-agent result and task-team-ingress result paths; no `TeamRunService`/active-run fallback logic.
- `task-delegation-run-registry.ts`: non-creating lookup for settlement, `getOrCreate` for router-selected active runs.
- `team-run.ts`, `team-run-backend.ts`, `team-manager.ts`: explicit task-team runtime commands.
- `mixed-team-run-backend.ts`, `mixed-team-manager.ts`: compose the three mixed runtime subject registries directly.
- `mixed-team-member-registry.ts`: split into subject registries and remove as catch-all owner.
- `mixed-team-run-context.ts`, `mixed-team-run-backend-factory.ts`, `mixed-sub-team-run-factory.ts`: carry optional task-team context into task-scoped child team runs.
- `mixed-agent-member-handle.ts`: pass task-team ingress binding into `MemberTeamContextBuilder` for the ingress coordinator only.
- `member-team-context.ts`, `member-team-context-builder.ts`: store task-team binding and build delegation target rows from topology.
- `member-run-instruction-composer.ts`, `member-team-roster-manifest.ts`: render capability-gated communication and delegation rosters separately.
- `task-delegation-tool-parameter-schemas.ts`, `task-delegation-tool-input-parsers.ts`, `task-delegation-tool-manifest.ts`: explicit target schema.
- `task-delegation-tool-service.ts`: remove inline run binding and use `TaskDelegationToolRunRouter`.
- `team-run-event.ts`: add task-team event marker or equivalent metadata for task-scoped child events.
- `mixed-task-team-member-handle.ts`, `mixed-team-event-bridge.ts`, `team-command-status-overlay-store.ts` if needed: stamp task-team identity on child and overlay events.
- `team-run-event-websocket-message-mapper.ts`: flatten task-team scoped fields on all task-scoped child event message kinds; remove dormant legacy fallback fields unless an explicit current serialized-event compatibility requirement is documented.
- `AgentTeamContext.ts`, `teamStreamIdentityTypes.ts`, `TeamStreamingService.ts`, `teamStreamMemberContextResolver.ts`, `teamTaskAgentContextProjection.ts`, `teamActiveExecutionMembers.ts`, `TeamMemberMonitorTile.vue`, `TeamWorkspaceView.vue`, and active execution bar component: implement task-team root/child projection model and display.
- `ToolApprovalTarget`/segments types, team streaming client message payload types, `team-command-selector-parser.ts`, `agent-team-stream-handler.ts`, `TeamRun`/backend/manager approval methods, and `MixedTaskTeamInstanceRegistry`/`MixedTaskTeamMemberHandle`: route task-team-scoped child approval/deny commands through `task_team_run_id` plus relative child selector before ordinary structural approval resolution.

## Ownership Boundaries

- `TaskDelegationService` is the authoritative lifecycle boundary. Backends and tool adapters must not transition ledger statuses directly.
- `TaskDelegationToolRunRouter` is the authoritative task-tool run-binding boundary. Tool adapter code must not call `TeamRunService`, `TaskTeamActiveRunDirectory`, or `TaskDelegationRunRegistry` directly.
- `TeamRun` / `TeamManager` is the authoritative runtime boundary. Task-delegation code must not construct mixed handles directly.
- `MixedTeamManager` composes runtime subject registries and owns cross-kind status/termination ordering. It must not absorb subject-specific recovery/memory/start logic.
- `MixedPersistentMemberRegistry`, `MixedTaskAgentInstanceRegistry`, and `MixedTaskTeamInstanceRegistry` each own one runtime lifecycle subject.
- `TaskTeamActiveRunDirectory` owns active task-scoped child run resolvability only. It is not a topology source, roster source, lifecycle ledger, history manager, or tombstone store.
- `MemberRunInstructionComposer` owns prompt text. Tool adapters and ledgers should provide structured data, not prompt prose.
- `MemberCommunicationRosterBuilder` owns communication recipients only. It must not become the delegation target builder.
- `MixedTaskTeamMemberHandle` / mixed event bridge owns backend task-team child event stamping. The frontend must not infer concurrent task-team child identity from source path alone.
- `TeamTaskTeamExecutionProjection` and `TeamTaskTeamChildProjection` own frontend task-team root/child projection state. Generic member resolvers and UI components must not mutate structural nodes to represent task-team execution state.
- `TaskExecutionProjectionEventRouter` owns task-team stream interception before structural member resolution.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `TaskDelegationService` | ledger, activation, notifications, settlement request | router-selected tool calls, tests, UI if added | direct ledger mutation from adapters/backends | Add explicit service method for the lifecycle subject. |
| `TaskDelegationToolRunRouter` | `TeamRunService`, `TaskTeamActiveRunDirectory`, `TaskDelegationRunRegistry` service lookup | `TaskDelegationToolService` | tool service directly resolving runs or choosing parent/current service | Add router method with explicit route name. |
| `TeamRun` / `TeamManager` | mixed runtime manager, registries, handles, child run creation | task delegation activation/settlement | task delegation importing mixed handles | Add explicit `TeamRun` / `TeamManager` command. |
| `MixedTeamManager` | persistent/task-agent/task-team registries | `MixedTeamRunBackend`, `TeamRun` | a new `MixedTeamMemberRegistry` catch-all facade with all subject logic | Compose subject registries directly or add a non-empty coordinator that owns cross-kind policy only. |
| `MixedTaskAgentInstanceRegistry` | task-agent handles, recovery cache, memory config derivation | `MixedTeamManager` | persistent registry owning task-agent recovery/memory | Add task-agent registry method. |
| `MixedTaskTeamInstanceRegistry` | task-team handles and command routing | `MixedTeamManager` | persistent registry owning task-team handle maps | Add task-team registry method. |
| `TaskTeamActiveRunDirectory` | active child `TeamRun` references and active lookup indexes | `TaskDelegationToolRunRouter`, `TaskTeamSettlementCoordinator`, task-team handle cleanup | using `AgentTeamRunManager` as topology/history, storing child runs in ledger, or retaining settled tombstones | Add active bind/resolve/unbind methods only. |
| `MemberRunInstructionComposer` | roster manifest rendering | runtime backends | backend-specific prompt roster rewrites | Add structured manifest input. |
| `MixedTaskTeamMemberHandle` / mixed event bridge | task-team identity marker and child event prefixing | websocket mapper, parent stream publisher | mapper guessing task-team execution from source path | Stamp domain event metadata at child-to-parent event boundary. |
| `TaskExecutionProjectionEventRouter` | task-team root/child projection owners and existing task-agent projection owner | `TeamStreamingService`, member context resolver | generic resolver handling task-team child events first | Add router result variants or explicit resolver method. |
| `TeamTaskTeamChildProjection` | scoped child node/context maps and clone indexes | projection router, cleanup owner, active execution flattener | UI components creating child clones or mutating structural nodes | Add explicit ensure/resolve/remove APIs. |

## Dependency Rules

Allowed:

- `agent-tools/task-delegation` parser/schema/manifest -> tool contract types.
- `TaskDelegationToolService` -> `TaskDelegationToolRunRouter` -> selected `TaskDelegationService`.
- `TaskDelegationToolRunRouter` -> `TeamRunService` for top-level active/restorable runs.
- `TaskDelegationToolRunRouter` -> `TaskTeamActiveRunDirectory` only as fallback for active task-scoped child runs.
- `TaskDelegationToolRunRouter` -> `TaskDelegationRunRegistry` to get/create the service for the resolved run.
- `TaskDelegationService` -> ledger / activation / notification / settlement coordinators.
- `TaskDelegationActivationCoordinator` -> `TeamRun` runtime commands.
- `TaskTeamSettlementCoordinator` -> `TaskTeamActiveRunDirectory` to resolve the child run and -> `TaskDelegationRunRegistry` to inspect child open work.
- `MixedTeamManager` -> `MixedPersistentMemberRegistry`, `MixedTaskAgentInstanceRegistry`, `MixedTaskTeamInstanceRegistry`.
- `TeamMemberDeliveryCoordinator` -> an interface satisfied by `MixedPersistentMemberRegistry`, not by a mixed catch-all registry.
- prompt composers -> `composeMemberRunInstructions` only.
- `MixedTaskTeamMemberHandle` -> mixed event bridge to stamp task-team identity on child events.
- websocket mapper -> domain event task-team marker to emit transport identity fields.
- `TeamStreamingService` -> `TaskExecutionProjectionEventRouter` before generic member resolution.
- `TaskExecutionProjectionEventRouter` -> task-team root/child projection owners and existing task-agent projection owner.
- `teamTaskTeamChildProjection` -> structural node/context maps as read-only template input and task-scoped projection maps as its owned write target.

Forbidden:

- Deriving delegation targets from `communicationRecipients` or `allowedRecipientNames`.
- Treating `targetMemberRunId` as a generic task execution run id for both agent and team instances.
- Calling `MixedSubTeamMemberHandle` or `MixedTaskTeamMemberHandle` directly from task-delegation code.
- Keeping `MixedTeamMemberRegistry` as a production catch-all owner for persistent, task-agent, and task-team lifecycles.
- Letting `TaskDelegationToolService` call `TeamRunService`, `TaskTeamActiveRunDirectory`, or `TaskDelegationRunRegistry` directly.
- Letting the child team ledger own parent team task status.
- Letting ordinary `send_message_to` submit, revise, accept, or finalize task lifecycle.
- Importing `agent-team-execution/task-delegation/*` from `agent-team-execution/domain/task-team-instance.ts` or any domain runtime command type.
- Using `TaskTeamActiveRunDirectory` as a model-facing delegation target roster source.
- Keeping starting/settled/tombstone lifecycle state in `TaskTeamActiveRunDirectory` without a distinct owner and reason.
- Frontend source-path-only inference to select a task-team execution when `task_team_run_id` is absent.
- Generic `teamStreamMemberContextResolver` resolving task-team child events after structural lookup.
- Reusing structural node object references or structural `AgentContext`s for task-team child projections.
- Child task-agent projection inside a task-team using the structural logical member route as its parent instead of the scoped child route.

## Interface Boundary Mapping

| Interface / API / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `delegate_task` | task delegation target | create one bounded task | `{ target: { kind: "member", name } }` or `{ target: { kind: "team", name } }` | No bare `member_name`. |
| `submit_task_result` | task execution instance | submit result for bound task | caller has task-agent binding OR task-team ingress binding | Router chooses current vs parent service; task-agent binding wins if both are present. |
| `review_task_result` | original delegator task | accept or request revision | `{ task_id, decision, message?, reference_files? }` | Original delegator authorization unchanged. |
| `TaskDelegationToolRunRouter.resolveServiceForDelegateOrReview` | current task tool run | select service for delegate/review | `TaskDelegationToolContext` with `teamRunId` | Current team run; top-level first, active task-team fallback second. |
| `TaskDelegationToolRunRouter.resolveServiceForSubmit` | result submit route | select parent/current service for result submission | `TaskDelegationToolContext` with task-agent or task-team binding | Parent service for task-team ingress without task-agent binding; otherwise current service. |
| `TaskDelegationToolRunRouter.resolveActiveTeamRun` | active team run lookup | resolve run by id | teamRunId; `TeamRunService` then `TaskTeamActiveRunDirectory` | Settled/removed task-team run ids return null via active directory miss. |
| `TaskDelegationService.submitTaskAgentResult` or equivalent explicit path | task-agent result transition | submit member task-agent result to selected ledger | selected current service + task-agent context | Does not resolve team runs. |
| `TaskDelegationService.submitTaskTeamIngressResult` or equivalent explicit path | task-team result transition | submit team result to selected parent ledger | selected parent service + task-team ingress binding | Does not resolve team runs. |
| `TeamRun.startTaskAgentInstance` | task-agent runtime | start member task-agent | `StartTaskAgentInstanceRequest` | Existing branch. |
| `TeamRun.startTaskTeamInstance` | task-team runtime | start team task child run | `StartTaskTeamInstanceRequest` | New explicit branch. |
| `TeamRun.postMessageToTaskTeamInstance` | task-team runtime | deliver revision/system message | logical team route key + taskTeamRunId + message | Do not overload `postMessage(... targetMemberRunId)`. |
| `TeamRun.settleTaskTeamInstance` | task-team runtime | terminate task-scoped child team after safe gates | logical team route key + taskTeamRunId | Called by settlement coordinator. |
| `TaskTeamActiveRunDirectory.bindActiveRun` | active task-team child run | bind active child `TeamRun` after creation | `TaskTeamInstanceIdentity` + child `TeamRun` | No `starting` state. |
| `TaskTeamActiveRunDirectory.resolveActiveRun` | active task-team child run | resolve active child `TeamRun` | child teamRunId or taskTeamRunId | Active-runtime only. |
| `TaskTeamActiveRunDirectory.unbind` | active task-team cleanup | remove active child run lookup | taskTeamRunId | No settled tombstone retained. |
| `prefixMixedSubTeamEvent` | child-to-parent event adaptation | prefix source/member paths and stamp task-team identity | parentTeamRunId + sourcePrefix + event + taskTeamInstance | Source path remains structural; task-team marker disambiguates execution. |
| `convertTeamRunEventToServerMessage` task-team marker flattening | stream payload identity | emit task-team scoped fields for all message kinds | `TeamRunEvent.taskTeamInstance` + `sourcePath` | Computes relative path; does not infer lifecycle. |
| `ensureTaskTeamExecutionProjection` | frontend task-team root | create/repair root projection and clone child tree | `TaskTeamExecutionProjectionIdentity` | Does not mutate structural team node. |
| `resolveTaskTeamScopedMemberContext` | frontend task-team child stream | resolve/promote scoped child context before generic handlers | websocket message with `task_team_run_id` + relative route/path | Returns handled/memberContext/drop/continue result. |
| `removeTaskTeamExecutionProjection` | frontend cleanup | cascade remove root, child clones, child contexts, nested child task-agents | taskTeamRunId | Structural nodes/contexts remain. |
| task-team scoped `APPROVE_TOOL` / `DENY_TOOL` | child tool approval routing | route approval to task-team child run before child member/task-agent | `task_team_run_id` + relative child selector + optional `task_agent_run_id` | Prevents approvals from targeting the structural team/member. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `delegate_task` target object | Yes | Yes | Low | Validate `target.kind` and reject wrong fields. |
| `submit_task_result` | Yes | Context-bound | Medium | Use router-selected route and explicit service methods; never infer from names. |
| `TaskDelegationToolRunRouter` | Yes | Yes | Low | Owns all tool-run service binding and active-run fallback. |
| `TeamRun.postMessageToTaskTeamInstance` | Yes | Yes | Low | New method avoids `targetMemberRunId` ambiguity. |
| `TaskTeamActiveRunDirectory.resolveActiveRun` | Yes | Yes | Low | Fallback only after top-level run resolution misses; no settled/tombstone path. |
| `resolveTaskTeamScopedMemberContext` | Yes | Yes | Low | Requires `task_team_run_id` for task-team child updates; drops malformed task-team-scoped payloads. |
| `ensureTaskTeamExecutionProjection` / child clone APIs | Yes | Yes | Low | Scoped route/path identity is explicit; structural source identity is read-only. |
| `MixedPersistentMemberRegistry` / `MixedTaskAgentInstanceRegistry` / `MixedTaskTeamInstanceRegistry` | Yes | Yes | Low | Split by lifecycle subject; MixedTeamManager composes. |
| `DelegationTargetRosterBuilder` | Yes | Yes | Low | Source rows from topology descriptors. |

## Task-Scoped Child TeamRun Resolution Policy

Decision: do **not** register task-scoped child `TeamRun`s as normal top-level active runs in `AgentTeamRunManager`. They are temporary execution instances owned by the parent task delegation ledger, not independent organization-level run history subjects. Instead, make them resolvable only while active through `TaskTeamActiveRunDirectory` and only through `TaskDelegationToolRunRouter` / settlement code that needs active runtime lookup.

Required behavior:

1. During team-target activation, `TaskDelegationActivationCoordinator` creates a parent ledger record and a runtime-only `TaskTeamInstanceIdentity`.
2. `TeamRun.startTaskTeamInstance(request)` delegates to the mixed backend.
3. `MixedTaskTeamInstanceRegistry` starts a `MixedTaskTeamMemberHandle`.
4. `MixedTaskTeamMemberHandle` creates the task-scoped child `TeamRun` with `MixedSubTeamRunFactory`.
5. After the child `TeamRun` exists, the handle calls `TaskTeamActiveRunDirectory.bindActiveRun(identity, childRun)` before/while posting the ingress packet.
6. Every child member's `MemberTeamContext.teamRunId` remains the task-scoped child `TeamRun.runId`.
7. When any child member calls `delegate_task`, `review_task_result`, or child-local task tooling, `TaskDelegationToolRunRouter.resolveActiveTeamRun(context.teamRunId)` first asks `TeamRunService.resolveTeamRun`. If that misses, it asks `TaskTeamActiveRunDirectory.resolveActiveRun(context.teamRunId)`.
8. The child task tool then uses `TaskDelegationRunRegistry.getOrCreate(childRun)` and operates against the child team's own task ledger.
9. When the ingress coordinator calls `submit_task_result` for the parent team task, `TaskDelegationToolRunRouter.resolveServiceForSubmit` detects the ingress `taskTeamInstance` binding and routes submission to the parent `TaskDelegationService`, not to the child ledger.
10. On acceptance, `TaskTeamSettlementCoordinator` resolves the active child run from `TaskTeamActiveRunDirectory`, checks child open work using the child `TaskDelegationService` plus task-agent directory/status gates, then calls `TeamRun.settleTaskTeamInstance`.
11. On settlement, failed start after binding, task-team handle dispose, or parent termination, cleanup calls `TaskTeamActiveRunDirectory.unbind(taskTeamRunId)` or `unbindForParentTeamRun(parentTeamRunId)`.
12. There is no `settled` tombstone in the active directory. Once unbound, active resolution returns null. Future initial delegation targets come from topology, never from the active directory.

`TaskTeamActiveRunDirectory` is not a topology source. It MUST NOT feed `DelegationTargetRosterBuilder`, and a completed taskTeamRunId MUST NOT resolve as a future initial delegation target.

Good-shape example:

```text
implementation_engineer inside taskTeamRunId=engineering_task_team_123 calls delegate_task(member: code_reviewer)
-> TaskDelegationToolRunRouter.resolveServiceForDelegateOrReview(context)
-> router.resolveActiveTeamRun("engineering_task_team_123")
-> TeamRunService.resolveTeamRun misses because this is not a top-level run
-> TaskTeamActiveRunDirectory.resolveActiveRun("engineering_task_team_123") returns the active child TeamRun
-> router.getService(childRun) returns child TaskDelegationService
-> child TaskDelegationService creates a child member task for code_reviewer
```

Bad-shape examples:

- `TaskDelegationToolService` directly calling `TeamRunService`, `TaskTeamActiveRunDirectory`, and `TaskDelegationRunRegistry`.
- `TaskTeamActiveRunDirectory` retaining settled ids as tombstones or providing task-history queries.
- Registering task-scoped child runs in `AgentTeamRunManager` as normal top-level runs.

## Task-Tool Run Router Policy

Create `autobyteus-server-ts/src/agent-tools/task-delegation/task-delegation-tool-run-router.ts`.

Required methods:

```ts
resolveServiceForDelegateOrReview(context: TaskDelegationToolContext): Promise<TaskDelegationService>;
resolveServiceForSubmit(context: TaskDelegationToolContext): Promise<TaskDelegationSubmitRoute>;
resolveActiveTeamRun(teamRunId: string | null | undefined): Promise<TeamRun>;
getService(run: TeamRun): TaskDelegationService;
```

Required submit route shape:

```ts
type TaskDelegationSubmitRoute =
  | { kind: "current"; service: TaskDelegationService; context: TaskDelegationToolContext }
  | { kind: "task_team_ingress_parent"; service: TaskDelegationService; context: TaskDelegationToolContext; taskTeamInstance: TaskTeamInstanceIdentity };
```

Routing rules:

1. `delegate_task` and `review_task_result` always use the current bound team run: `context.teamRunId` resolved top-level first, active task-team fallback second.
2. `submit_task_result` uses task-agent/current service when `context.caller.taskAgentRunId` is present. This preserves task-agent result submission even if an implementation context also carries parent-boundary metadata.
3. `submit_task_result` uses parent service when `context.caller.taskTeamInstance` exists and there is no task-agent binding.
4. `resolveActiveTeamRun` owns the only tool-surface fallback path: `TeamRunService.resolveTeamRun(teamRunId)` then `TaskTeamActiveRunDirectory.resolveActiveRun(teamRunId)`.
5. `getService` owns the only tool-surface access to `TaskDelegationRunRegistry.getOrCreate(run)`.

`TaskDelegationToolService` must be reduced to tool API adaptation:

```text
delegateTask -> router.resolveServiceForDelegateOrReview -> service.delegateTask
reviewTaskResult -> router.resolveServiceForDelegateOrReview -> service.reviewTaskResult
submitTaskResult -> router.resolveServiceForSubmit -> explicit selected service submit path
```

`TaskDelegationService` still validates and transitions ledger state, but it must not resolve current-vs-parent team runs, call `TeamRunService`, or call the active-run directory for task-tool binding. If needed, expose explicit lifecycle methods such as `submitTaskAgentResult(...)` and `submitTaskTeamIngressResult(...)` so the router-selected route does not force another parent/current route decision inside the service.

## Mixed Backend Runtime Instance Ownership Split

Replace the catch-all `MixedTeamMemberRegistry` ownership model with subject registries composed by `MixedTeamManager`.

### Target owners

| Owner | Must Own | Must Not Own |
| --- | --- | --- |
| `MixedTeamManager` | public mixed-backend commands, cross-kind status aggregation, termination order, construction/injection of subject registries | task-agent recovery, task-agent memory config derivation, persistent handle maps, task-team handle maps |
| `MixedPersistentMemberRegistry` | persistent agent/subteam handle map, ordinary `resolveContext`, `getOrCreate`, `remove`, `listHandles`, `dispose` | task-agent start/recover/post/approve/settle, task-team start/post/settle |
| `MixedTaskAgentInstanceRegistry` | task-agent handle map, recovery cache, recovery from active `AgentRun`, task-agent memory location derivation, task-agent post/deliver/approve/settle/terminate/list/resolve logical context | persistent member maps, task-team handles |
| `MixedTaskTeamInstanceRegistry` | task-team handle map, task-team start/post/settle/terminate/list/dispose | persistent member maps, task-agent recovery |
| `MixedTeamMemberConfigResolver` if added | team-member config tree lookup by route/run id | lifecycle commands or handle storage |

### Composition rules

- `MixedTeamManager` constructs the three subject registries with shared dependencies (`teamContext`, publish callback, status callback, inter-agent delivery callback, `AgentRunManager`, `MixedSubTeamRunFactory`, active-run directory where needed).
- `TeamMemberDeliveryCoordinator` should depend on a minimal persistent-member registry interface: `resolveContext`, `getOrCreate`, and persistent handle lookup. It should not require a catch-all registry that also knows task-agent/task-team instances.
- `MixedTeamManager.postMessage(... targetMemberRunId)` routes task-agent exact-run delivery to `MixedTaskAgentInstanceRegistry`; ordinary member delivery uses `MixedPersistentMemberRegistry`.
- `MixedTeamManager.startTaskAgentInstance`, `postMessageToTaskAgent`, `settleTaskAgentInstance`, task-agent approve/deliver, and task-agent termination route to `MixedTaskAgentInstanceRegistry`.
- `MixedTeamManager.startTaskTeamInstance`, `postMessageToTaskTeamInstance`, `settleTaskTeamInstance`, and task-team termination route to `MixedTaskTeamInstanceRegistry`.
- `MixedTeamManager.getMemberStatusSnapshots()` aggregates persistent member snapshots plus task-agent and task-team instance snapshots.
- `MixedTeamManager.terminate()` terminates task-agent instances, task-team instances, then persistent members, and finally disposes task-agent directory and active task-team directory entries for the parent run.

This split is not optional cleanup. It is in-scope rework before API/E2E because the current catch-all registry is already near the hard file-size guardrail and mixes multiple lifecycle subjects.

## Task-Team Active-Run Directory Shape

Rename `task-team-directory.ts` to `task-team-active-run-directory.ts` and narrow its responsibility.

Required entry shape:

```ts
export type TaskTeamActiveRunEntry = {
  parentTeamRunId: string;
  taskId: string;
  logicalTeamRouteKey: string;
  taskTeamRunId: string;
  childTeamRunId: string;
  identity: TaskTeamInstanceIdentity;
  activeRun: TeamRun;
  boundAt: string;
};
```

Required methods:

```ts
bindActiveRun(identity: TaskTeamInstanceIdentity, run: TeamRun): TaskTeamActiveRunEntry;
resolveActiveRun(teamRunIdOrTaskTeamRunId: string): TeamRun | null;
resolveActiveEntryByTaskTeamRunId(taskTeamRunId: string): TaskTeamActiveRunEntry | null;
unbind(taskTeamRunId: string): void;
unbindForParentTeamRun(parentTeamRunId: string): void;
clear(): void;
```

Allowed indexes:

- `entryByTaskTeamRunId: Map<string, TaskTeamActiveRunEntry>`
- `taskTeamRunIdByChildTeamRunId: Map<string, string>`
- optional `taskTeamRunIdsByParentTeamRunId: Map<string, Set<string>>` if it makes parent cleanup direct and is kept in sync.

Forbidden state:

- `status: "starting" | "active" | "settled"` on the active entry.
- `settledTaskTeamRunIds` tombstone set.
- `taskTeamRunIdByTaskId` unless a concrete active lookup caller is designed and documented.
- Any history query or lifecycle-transition method beyond active bind/unbind.

Activation coordinator no longer registers a `starting` task-team directory entry. A directory entry appears only when the child `TeamRun` exists and can be resolved. If start fails before binding, there is nothing to clean in the active directory. If start fails after binding, handle cleanup unbinds.


## Frontend Task-Team Execution Visibility Design (CR-005)

### Decision Summary

Task-team executions MUST become first-class frontend active execution projections. The preferred shape is:

- a transient `agent_team` projection node for the concrete task-team execution;
- a generalized active task executions surface that shows both task-agent and task-team cards;
- lifecycle/timeline state associated with the task-team projection.

The structural team node and task execution node are different subjects:

```text
SoftwareEngineeringTeam                    # structural topology/team definition node
SoftwareEngineeringTeam · task_0001        # concrete task-team execution projection
```

This mirrors the existing task-agent projection pattern without pretending that a team execution is an ordinary task-agent.

### Projection Subjects And Invariants

The frontend must model three different subjects without sharing object identity or route keys:

1. **Structural topology nodes**: the existing `SoftwareEngineeringTeam` / `solution_designer` nodes that describe the configured team. These nodes are not task executions.
2. **Task-team root projection**: one transient `agent_team` node for one concrete delegated team execution, e.g. `SoftwareEngineeringTeam · task_0001`.
3. **Task-team child member projections**: transient cloned/projected child nodes inside that root, e.g. `taskTeamRunId/solution_designer`.

Hard invariants:

- Structural topology nodes MUST NOT be mutated, reused by reference, or have their `memberRouteKey`, `memberPath`, `memberRunId`, `currentStatus`, `children`, or `AgentContext` replaced by task-team execution state.
- Every task-team root and child projection uses fresh node objects and fresh child arrays.
- Task-team child projection keys are scoped under the concrete task-team run. A structural route key such as `SoftwareEngineeringTeam/solution_designer` and a task-scoped route key such as `<taskTeamRunId>/solution_designer` are different UI/runtime subjects.
- The frontend task-team projection owner is the only code that may create, update, or remove task-team root nodes, task-scoped child nodes, task-scoped child `AgentContext`s, and child task-agent parent associations.

Target visible shape:

```text
SoftwareEngineeringTeam                          # structural topology/team node
SoftwareEngineeringTeam · task_0001 [Task team]  # task-team root projection
├─ solution_designer                             # task-scoped child projection
├─ implementation_engineer                       # task-scoped child projection
└─ code_reviewer                                 # task-scoped child projection
```

### Projection Data Model

Extend frontend model types with task-team-specific fields. Do not use a single ambiguous `taskExecutionRunId` field.

Root task-team execution identity:

```ts
export interface TaskTeamExecutionProjectionIdentity {
  taskTeamRunId: string;
  taskTeamInstanceId: string | null;
  taskId: string | null;
  logicalTeamRouteKey: string | null;
  logicalTeamPath: string[];
}
```

Task-scoped child identity:

```ts
export interface TaskTeamChildMemberProjectionIdentity {
  parentTaskTeamRunId: string;
  parentTaskTeamInstanceId: string | null;
  parentTaskId: string | null;
  logicalTeamRouteKey: string | null;
  logicalTeamPath: string[];
  relativeMemberPath: string[];              // e.g. ["solution_designer"]
  relativeMemberRouteKey: string;            // e.g. "solution_designer"
  structuralSourcePath: string[];            // e.g. ["SoftwareEngineeringTeam", "solution_designer"]
  structuralSourceRouteKey: string | null;   // e.g. "SoftwareEngineeringTeam/solution_designer"
  scopedMemberPath: string[];                // e.g. [taskTeamRunId, "solution_designer"]
  scopedMemberRouteKey: string;              // e.g. `${taskTeamRunId}/solution_designer`
  memberKind: "agent" | "agent_team";
  runtimeMemberRunId: string | null;         // backend child member run id when known
}
```

Node-level fields should be specialized rather than kitchen-sink:

```ts
export interface TeamMemberNodeBase {
  // existing fields...
  isTaskAgentInstance?: boolean;
  taskAgentInstanceId?: string | null;
  taskAgentRunId?: string | null;
  taskId?: string | null;
  logicalMemberRouteKey?: string | null;

  // task-team root projection fields; root node only
  isTaskTeamInstance?: boolean;
  taskTeamInstanceId?: string | null;
  taskTeamRunId?: string | null;
  logicalTeamRouteKey?: string | null;
  logicalTeamPath?: string[] | null;
  taskExecutionStatus?: TaskExecutionProjectionStatus | null;
  taskTimeline?: TaskExecutionTimelineEntry[];

  // task-team child projection fields; cloned children and nested child task-agents
  isTaskTeamChildProjection?: boolean;
  parentTaskTeamRunId?: string | null;
  parentTaskTeamInstanceId?: string | null;
  parentTaskId?: string | null;
  taskTeamRelativeMemberRouteKey?: string | null;
  taskTeamRelativeMemberPath?: string[] | null;
  structuralSourceRouteKey?: string | null;
  structuralSourcePath?: string[] | null;
}
```

Field semantics:

- `taskTeamRunId` identifies the task-team root projection. It is set on the root node only.
- `parentTaskTeamRunId` links task-scoped child nodes and child task-agent nodes back to their task-team root.
- `memberRouteKey` is the stable frontend selection/key identity. For children it is always the scoped key, never the structural source key.
- `memberPath` is the frontend scoped path, `[taskTeamRunId, ...relativeMemberPath]`, not the structural path.
- `memberRunId` is the backend runtime member run id when known. It may be `null` on freshly cloned task-scoped child nodes until a stamped child event provides `agent_id`/runtime member id. It MUST NOT be populated from the structural template node's `memberRunId`.
- For leaf agent child contexts, `AgentContext.state.runId` starts as the scoped route key as a provisional frontend id, then is promoted to the backend runtime member run id when the first stamped child event provides `agent_id`. This promotion must happen before generic segment/tool/status handlers check run-id consistency.
- For cloned nested `agent_team` children, `teamRunId` remains `null` unless a backend event explicitly supplies a task-scoped nested team run id. The scoped child team node is not a top-level resumable team run.

If implementation keeps a separate active-execution collection, it must remain a tight discriminated union and point to node route keys rather than duplicate lifecycle state:

```ts
type ActiveTaskExecutionProjection =
  | { kind: "task_agent"; taskId: string | null; taskAgentRunId: string; logicalMemberRouteKey: string | null; nodeRouteKey: string; parentTaskTeamRunId?: string | null }
  | { kind: "task_team"; taskId: string | null; taskTeamRunId: string; taskTeamInstanceId: string | null; logicalTeamRouteKey: string | null; nodeRouteKey: string };
```

### Projection Clone Rules

`ensureTaskTeamExecutionProjection(teamContext, identity)` owns root creation/repair:

1. Resolve the structural logical team node from `logicalTeamRouteKey` or `logicalTeamPath`. Use it only as read-only template input.
2. Create or repair a root `SubTeamMemberNode`:
   - `memberKind: "agent_team"`;
   - `memberRouteKey = identity.taskTeamRunId`;
   - `memberPath = [identity.taskTeamRunId]`;
   - `memberRunId = identity.taskTeamRunId`;
   - `teamRunId = identity.taskTeamRunId`;
   - `displayName = <structural display name> · <taskId or taskTeamRunId>`;
   - `isTaskTeamInstance = true`;
   - task-team identity/status/timeline fields populated;
   - `children = cloneTaskTeamChildTree(...)`.
3. Insert the root projection near/under the structural team node without replacing the structural node.
4. Add the root to `memberNodesByRouteKey` under `taskTeamRunId`.

`cloneTaskTeamChildTree(teamContext, parentIdentity, structuralChildren)` owns child clone creation:

- For every structural child, create a fresh node object.
- Relative child path is the structural child path with the logical team path prefix removed. Example: structural `SoftwareEngineeringTeam/solution_designer` becomes relative `solution_designer`.
- Scoped child route key is `buildTaskTeamScopedChildRouteKey(taskTeamRunId, relativeRouteKey)`; the required format is `${taskTeamRunId}/${relativeRouteKey}`.
- Scoped child path is `[taskTeamRunId, ...relativeChildPath]`.
- Copy display metadata (`memberName`, `displayName`, `role`, `description`, `agentDefinitionId`, `teamDefinitionId`) from the structural node, but do not copy runtime status, task-agent fields, task-team root fields, structural `memberRunId`, structural `teamRunId`, or object references.
- Add `isTaskTeamChildProjection = true`, parent task-team fields, relative fields, and structural source fields.
- For leaf `agent` children, create a fresh `AgentContext` in `leafAgentContextsByRouteKey` keyed by the scoped child route key. Its config is copied from the structural leaf context/config when available and locked; its conversation is empty and keyed by the scoped child route key; its provisional `state.runId` is the scoped child route key until a stamped event promotes it.
- For nested `agent_team` children, recursively clone their children using the same scoped route-key rules. Do not create an `AgentContext` for an `agent_team` node.
- If a later stamped event references a relative route that was not cloned, the projection owner may create a fallback node only when it can resolve the structural source node from `logicalTeamPath + relativePath`. Otherwise it must log/drop the event and must not create an untyped phantom structural replacement.

### Frontend Projection Owner And Files

Add/refactor the frontend projection owners as follows:

| File | Owner / Boundary | Responsibility |
| --- | --- | --- |
| `autobyteus-web/services/agentStreaming/teamTaskExecutionProjection.ts` | shared task execution projection model | shared normalized lifecycle status/timeline types, kind guards, active-execution node predicates, and key builders that are independent of task-agent vs task-team creation. |
| `autobyteus-web/services/agentStreaming/teamTaskTeamExecutionProjection.ts` | task-team root projection owner | `extractTaskTeamIdentity`, `ensureTaskTeamExecutionProjection`, root insertion, lifecycle/timeline update, root status update, and cascade removal/history transition. |
| `autobyteus-web/services/agentStreaming/teamTaskTeamChildProjection.ts` | task-team child projection owner | `TaskTeamChildMemberProjectionIdentity`, scoped child route/path builders, clone/repair of task-scoped child member nodes, leaf child `AgentContext` creation/promotion, child status updates, child lookup indexes, and child cleanup. |
| `autobyteus-web/services/agentStreaming/teamTaskAgentContextProjection.ts` | task-agent projection owner | preserve existing member-target task-agent behavior; accept an optional `parentTaskTeamRunId` / scoped logical parent route when the task-agent is spawned inside a task-team; do not infer task-team parentage itself. |
| `autobyteus-web/services/agentStreaming/teamTaskExecutionEventRouter.ts` | projection event router | route all task-delegation lifecycle messages and task-scoped child stream messages before generic structural member resolution; call task-agent or task-team projection owners; no UI rendering. |
| `autobyteus-web/services/agentStreaming/teamStreamMemberContextResolver.ts` | member context resolver | delegate to `resolveTaskTeamScopedMemberContext` before existing task-agent extraction and structural route lookup, so task-team child events cannot update structural contexts. |
| `autobyteus-web/services/agentStreaming/TeamStreamingService.ts` | stream dispatcher | call the projection event router before generic member resolution; respect router results: handled, member-context resolved, drop/contract-violation, or continue structural resolution. |
| `autobyteus-web/services/agentStreaming/protocol/teamStreamIdentityTypes.ts` | stream payload types | add task-team root and task-team child identity fields, including relative child path/route. |
| `autobyteus-web/utils/teamActiveExecutionMembers.ts` | active execution flattening | deterministically display task-team root, its task-scoped children, and nested child task-agent cards together; preserve existing task-agent behavior outside task teams. |
| `autobyteus-web/components/workspace/team/TeamTaskAgentActivityBar.vue` -> `TeamActiveTaskExecutionsBar.vue` | active execution UI | render task-agent and task-team cards with kind-specific badges/actions. |
| `autobyteus-web/components/workspace/team/TeamMemberMonitorTile.vue` | member/execution tile | render `Task team` badge, task-scoped child rows, child status, and lifecycle/timeline state. |
| `autobyteus-web/components/workspace/team/TeamWorkspaceView.vue` | workspace composition | use generalized active execution bar; hide or constrain composer for task-team root and task-team child projection focus according to lifecycle safety. |

Allowed writes:

- `teamTaskTeamExecutionProjection.ts` / `teamTaskTeamChildProjection.ts` may write task-team projection nodes and task-scoped child contexts into `memberTree`, `memberNodesByRouteKey`, and `leafAgentContextsByRouteKey`.
- Generic handlers may update the returned `AgentContext` after the task-team projection router has resolved it.
- No generic stream resolver or UI component may create task-team child nodes directly.

### Backend Event Contract For Task-Scoped Child Events

The target architecture requires backend stamping for task-scoped child team events. Source-path-only inference is not authoritative enough for simultaneous delegated executions of the same logical team.

Required server-side event contract:

- Add an optional `taskTeamInstance?: TaskTeamInstanceIdentity | null` marker to `TeamRunEvent`, or an equivalent domain event metadata field owned by the team-runtime event boundary.
- `MixedTaskTeamMemberHandle` MUST stamp every event it republishes from the task-scoped child run with the task-team identity before publishing to the parent stream. This includes:
  - agent events;
  - team/status events;
  - task-delegation lifecycle events emitted inside the child team;
  - communication events;
  - member-input events;
  - command-status overlay events generated by the task-team handle itself.
- `prefixMixedSubTeamEvent` should accept the task-team identity and preserve both:
  - the parent-rooted `sourcePath` already prefixed by the logical team path; and
  - the task-team identity needed for transport flattening.
- `team-run-event-websocket-message-mapper.ts` MUST flatten the task-team marker onto every server message produced from a task-scoped child event, not only `TASK_DELEGATION_EVENT` messages.

Required flattened websocket fields for task-scoped child events:

```ts
interface TaskTeamScopedEventPayloadFields {
  task_team_run_id: string;
  task_team_instance_id?: string;
  task_id?: string;
  team_route_key: string;                    // logical structural team route key
  team_path: string[];                       // logical structural team path
  task_team_relative_member_path: string[];  // [] for task-team root/status, ["solution_designer"] for a child
  task_team_relative_member_route_key?: string;
}
```

Field rules:

- `task_team_run_id` is mandatory for every task-scoped child event.
- `team_route_key` / `team_path` identify the structural team that was delegated to.
- `task_team_relative_member_path` is computed by removing `team_path` from the parent-rooted `source_path`. If the event is for the task-team root itself, it is `[]`.
- `task_team_relative_member_route_key` is `task_team_relative_member_path.join("/")` when non-empty.
- Existing `member_route_key`, `member_path`, `source_route_key`, and `source_path` may remain parent-rooted structural/display identities. They are not sufficient to choose a task-team execution.
- When a task-agent is spawned inside a task-scoped team, its messages MUST carry both task-agent identity fields and the task-team scoped fields above. The task-team fields determine the parent task-team root and scoped child member; `task_agent_run_id` remains the task-agent projection's own route/run id.

### Frontend Event Routing Contract

`TeamStreamingService.dispatchMessage` must route in this order:

1. `teamTaskExecutionEventRouter.handleTaskExecutionProjectionMessage(teamContext, message)`.
2. If the router returns `handled`, stop.
3. If the router returns `memberContext`, run the existing generic handler switch against that context.
4. If the router returns `drop`, log a contract violation and stop; do not fall through to structural member resolution.
5. Otherwise continue with existing task-agent/structural member resolution.

The router owns these cases:

- `TASK_DELEGATION_EVENT` with `execution_kind = "task_team"`: ensure/repair root projection and update lifecycle/timeline.
- Any message with `task_team_run_id`: resolve or repair the task-team root, compute the scoped child identity, ensure/update the child projection, and return the scoped leaf `AgentContext` for agent-bound messages.
- Task-team root/status messages where `task_team_relative_member_path` is empty: update the task-team root node/status and return `handled`.
- Child `agent_team` status messages: update the scoped child `agent_team` node's `currentStatus` and return `handled`.
- Child leaf `agent` messages: ensure/promote the scoped child `AgentContext`, then return it so existing segment/tool/status handlers update the correct task-scoped conversation/status.
- Child task-agent messages carrying both `task_agent_run_id` and `task_team_run_id`: first ensure the scoped child member projection, then call the existing task-agent projection owner with `logicalMemberRouteKey` set to the scoped child route key and `logicalMemberPath` set to the scoped child path. The created task-agent node additionally gets `parentTaskTeamRunId` and structural source fields so active execution flattening can group it under the task-team root and relevant child member.

Tool approval target handling is part of the same routing contract:

- `TeamStreamingService.trackApprovalRequest` must not capture a structural approval target before task-team scoped routing has a chance to normalize it.
- `ToolApprovalTarget` and `ToolActionPayload` should carry `taskTeamRunId`, logical `teamRouteKey`/`teamPath`, and relative child route/path when the approval request comes from a task-scoped child event.
- Client approval/deny payloads for task-scoped child tools must include `task_team_run_id` and the relative child selector. If the approval belongs to a task-agent inside the task team, it also includes `task_agent_run_id`.
- The server command parser must route those approvals to the task-team instance first, then to the child selector inside the child run. Do not send a structural parent-rooted route key directly to ordinary persistent-member approval handling.
- Existing member-target task-agent approval payloads without `task_team_run_id` continue to use the existing task-agent path.

No source-path-only task-team association is allowed in the target design. If `task_team_run_id` is missing:

- If no task-team-specific fields are present, the event follows the ordinary structural resolver path.
- If any `task_team_*` scoped fields are present but `task_team_run_id` is missing, the router returns `drop` and logs a contract violation.
- If two active task-team executions exist for the same logical team, an unstamped child event MUST NOT update either task-team projection. Tests must assert that no wrong task-team child node is updated.

This is a clean-cut contract, not a compatibility mode: task-scoped child events are required to be stamped by the backend in this feature.

### Lifecycle Status, Timeline, And Cleanup

Define a frontend projection status union, separate from backend raw event names:

```ts
type TaskExecutionProjectionStatus =
  | "starting"
  | "active"
  | "awaiting_review"
  | "revision_requested"
  | "accepted"
  | "settling"
  | "settled"
  | "failed";
```

Mapping:

| Backend event / signal | Projection behavior |
| --- | --- |
| task/team activation | create projection; status `active` or `starting` until first child/team status arrives. |
| result submitted | status `awaiting_review`; add timeline entry visible to parent delegator. |
| review requested revision | status `revision_requested` then `active`; add timeline entry and keep projection visible. |
| review accepted | status `accepted` / `settling`; add timeline entry and keep projection visible until settlement cleanup. |
| settlement/child team offline-equivalent | status `settled`; cascade cleanup root/children/contexts after an explicit cleanup window or move to compact history. |
| activation/settlement failure | status `failed`; keep visible long enough to show error. |

Cleanup is owned by `removeTaskTeamExecutionProjection(teamContext, taskTeamRunId)` or equivalent. It must remove, in one cascade:

- task-team root node from `memberTree` and `memberNodesByRouteKey`;
- every descendant node with `isTaskTeamChildProjection && parentTaskTeamRunId === taskTeamRunId`;
- every child task-agent node/context with `parentTaskTeamRunId === taskTeamRunId` or scoped logical parent route under `${taskTeamRunId}/`;
- every leaf child `AgentContext` keyed by a scoped child route key under `${taskTeamRunId}/`;
- any WeakMap or index entries owned by task-team projection files;
- focus, using `resolveActiveExecutionFocusedMemberRouteKey` after removal.

Structural nodes and structural `AgentContext`s must remain untouched by cleanup.

History rule for this task: active execution surfaces stay focused on current work. Settled task-team projections may be removed from the active bar like task-agent cleanup, but the task timeline entry should remain available in the focused team/task view if such a timeline exists. If no durable history view exists, cleanup after settled is acceptable only after the accepted/settled event has been rendered at least once.

### Active Display, Focus, And Composer Behavior

Active execution display requirements:

- Task-team root appears before its task-scoped child member nodes.
- Task-agent cards spawned inside the task-scoped team appear under/near the scoped child member that spawned them and carry a parent label such as `in SoftwareEngineeringTeam · task_0001` when shown in a flattened card strip.
- Task-agent cards must not be the only visible sign that a parent team-target task exists.
- Existing member-target task-agent ordering/cleanup behavior must remain unchanged for task agents that do not have `parentTaskTeamRunId`.

Focus rules:

- Selecting the task-team root focuses the concrete task-team execution, not the structural team node.
- Selecting a task-scoped child member focuses the child projection/context keyed by its scoped route key, not the structural child member.
- Header/title shows task-team or child display name with a `Task team` / task-scoped indicator as appropriate.
- The shared composer MUST NOT present itself as final task-result submission. Safer default: hide the shared composer for `isTaskTeamInstance` and `isTaskTeamChildProjection` focus, matching task-agent focus, until deliberate task-team communication UX is designed.
- Task-team root-level approval affordances remain unsupported unless backend/tooling later adds them. Existing child member/task-agent tool approvals inside a task-team must use the task-team-scoped approval routing contract above.

### Tests And Coverage

Required frontend/unit/component tests:

- `extractTaskTeamIdentity` parses `execution_kind=task_team` payloads and ignores task-agent-only events.
- `ensureTaskTeamExecutionProjection` creates a transient root `agent_team` node with `isTaskTeamInstance`, task-team ids, task id, logical team route/path, display name, insertion near/under the structural team, and task-scoped cloned child member nodes.
- Child clone tests assert no structural node object/child-array reference is reused and structural node status/context is not mutated by child events.
- Scoped child identity tests verify `memberRouteKey`, `memberPath`, `structuralSourceRouteKey`, relative fields, `memberRunId` semantics, and provisional `AgentContext.state.runId` promotion on first stamped child event.
- `TeamStreamingService` consumes task-team `TASK_DELEGATION_EVENT`; it must not no-op.
- A stamped child `AGENT_STATUS`/segment/tool event with `task_team_run_id` updates the scoped child context, not the structural context.
- A task-team-scoped `TOOL_APPROVAL_REQUESTED` stores an approval target containing `task_team_run_id` and relative child selector; approve/deny sends those fields and backend routes the command to the child run rather than the structural member.
- Two active task-team executions for the same logical team: an event with explicit `task_team_run_id` routes to the correct root/child; an event with task-team scoped fields but missing `task_team_run_id` is dropped/logged and does not update the wrong task-team or structural node.
- A child task-agent event inside a task-team creates/groups the task-agent under both the parent task-team root and the relevant scoped child member.
- Cleanup removes root, child clones, child contexts, and nested child task-agent projections without removing structural nodes or structural contexts.
- Active execution flattening includes task-team roots/children/nested task-agents and preserves existing task-agent ordering/cleanup behavior.
- Active execution bar renders `Task team` and `Task agent` cards distinctly.
- `TeamMemberMonitorTile` renders task-team badge, task-scoped child rows, and lifecycle/timeline status.
- Composer visibility is hidden or explicitly safe when focusing task-team root or child projections.

Required backend/mapper tests:

- `MixedTaskTeamMemberHandle` / event bridge stamps task-team identity on child agent, team/status, task-delegation, communication, member-input, and command-status overlay events.
- `team-run-event-websocket-message-mapper.ts` emits `task_team_run_id`, `task_team_instance_id`, `task_id`, `team_route_key`, `team_path`, `task_team_relative_member_path`, and `task_team_relative_member_route_key` for task-scoped child events.

Required cross-layer/API/E2E coverage:

- PM delegates to `SoftwareEngineeringTeam`; backend emits task-team activation; frontend projection appears with task id, task-team run id, and cloned child members.
- Child member activity updates the scoped child member under `SoftwareEngineeringTeam · task_0001`, not the structural child member.
- Result submission changes projection to awaiting review and records a visible timeline/status.
- Revision request and acceptance update projection state.
- Settlement removes the active projection cascade or moves it to explicit history according to the chosen cleanup rule.
- Existing member-target task-agent UI tests continue to pass unchanged.

## Runtime Task-Team Identity Boundary

`agent-team-execution/domain/task-team-instance.ts` owns runtime command types only. It must be shaped like `domain/task-agent-instance.ts`: standalone runtime identity, clone helper, and start request type. It MUST NOT import from `agent-team-execution/task-delegation/task-delegation-target.ts`, `task-delegation-record.ts`, or other task-delegation lifecycle files.

Required domain-owned shape:

```ts
export type LogicalTaskTeamMemberIdentity = {
  memberName: string;
  memberPath: string[];
  memberRouteKey: string;
  templateMemberRunId: string;
  teamDefinitionId: string;
  coordinatorMemberRouteKey: string | null;
};

export type TaskTeamIngressIdentity = {
  memberName: string;
  memberPath: string[];
  memberRouteKey: string;
  memberRunId: string;
};

export type TaskTeamInstanceIdentity = {
  taskTeamInstanceId: string;
  taskTeamRunId: string;
  parentTeamRunId: string;
  taskId: string;
  logicalTeam: LogicalTaskTeamMemberIdentity;
  ingress: TaskTeamIngressIdentity;
  createdAt: string;
};

export type StartTaskTeamInstanceRequest = {
  identity: TaskTeamInstanceIdentity;
  teamConfig: TeamRunConfig;
  message: AgentInputUserMessage;
};
```

Conversion point:

```text
TaskDelegationTeamTarget
  -> TaskTeamRunIdentityFactory / TaskDelegationActivationCoordinator
  -> TaskTeamInstanceIdentity + materialized TeamRunConfig
  -> TeamRun.startTaskTeamInstance
```

The conversion boundary belongs in task-delegation activation code because task-delegation knows the ledger target and task id. Runtime domain code only carries the already-converted runtime identity.

## Main Domain Subject Naming Check

| Node / Subject | Proposed Name | Name Is Natural And Self-Descriptive? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| team execution instance | `TaskTeamInstance` | Yes | Low | Use only for per-task child team runs, not persistent team definitions. |
| team target identity | `TaskDelegationTeamTarget` / `TaskDelegationTeamIdentity` | Yes | Low | Keep separate from representative/ingress identity. |
| active child-run resolver | `TaskTeamActiveRunDirectory` | Yes | Low | Name says active-runtime lookup, not history/lifecycle. |
| task-tool route owner | `TaskDelegationToolRunRouter` | Yes | Low | Must own real routing policy, not pass through. |
| persistent member registry | `MixedPersistentMemberRegistry` | Yes | Low | Ordinary persistent handles only. |
| task-agent instance registry | `MixedTaskAgentInstanceRegistry` | Yes | Low | Task-agent recovery/memory and commands only. |
| task-team instance registry | `MixedTaskTeamInstanceRegistry` | Yes | Low | Task-team commands only. |
| child-team runtime handle | `MixedTaskTeamMemberHandle` | Yes | Medium | Document distinction from `MixedSubTeamMemberHandle`. |

## Applied Patterns

- Discriminated union: `TaskDelegationTarget` and `TaskExecutionInstance` make member/team and agent/team execution branches explicit.
- State machine: task ledger status remains `not_started -> active -> awaiting_review -> active/accepted`; execution kind is orthogonal.
- Router: `TaskDelegationToolRunRouter` owns task-tool run/service selection and active fallback policy.
- Registry: mixed backend registries are split by lifecycle subject.
- Active directory: `TaskTeamActiveRunDirectory` is a narrow active-runtime resolver.
- Runtime handle: `MixedTaskTeamMemberHandle` owns one live task-team runtime subject.
- Settlement coordinator: task-team settlement mirrors task-agent settlement but uses team-safe gates.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `agent-team-execution/task-delegation/` | Folder | task lifecycle | target, ledger, activation, notification, settlement, active child-run resolver | Existing task delegation capability area | mixed backend implementation details or model tool adapter code |
| `agent-team-execution/domain/task-team-instance.ts` | File | team runtime command type | runtime-only task-team identity/request | Parallel to `task-agent-instance.ts` | ledger transitions or imports from `task-delegation/*` |
| `agent-team-execution/task-delegation/task-team-active-run-directory.ts` | File | active task-team child-run resolver | active entries and active child `TeamRun` fallback lookup | Task-team child runs are task lifecycle runtime artifacts, not topology/history | delegation roster rows, settled tombstones, persistent team history |
| `agent-team-execution/backends/mixed/members/` | Folder | mixed runtime member/instance handles and registries | subject registries and handles by lifecycle kind | Existing mixed backend location | one catch-all registry owning every subject |
| `agent-team-execution/backends/mixed/members/mixed-persistent-member-registry.ts` | File | persistent members | ordinary persistent member handles | Separate from task instances | task-agent recovery or task-team maps |
| `agent-team-execution/backends/mixed/members/mixed-task-agent-instance-registry.ts` | File | task-agent instances | task-agent handle lifecycle/recovery/memory | Separate from persistent and task-team instances | persistent member maps or task-team maps |
| `agent-team-execution/backends/mixed/members/mixed-task-team-instance-registry.ts` | File | task-team instances | task-team handle lifecycle | Existing task-team subject owner | persistent member maps or task-agent recovery |
| `agent-tools/task-delegation/task-delegation-tool-run-router.ts` | File | task-tool run binding | service route selection and active-run fallback | Tool boundary owns model tool context interpretation | ledger transitions or prompt text |
| `agent-team-execution/services/delegation-target-roster-builder.ts` | File | prompt data source | delegation target manifest rows | Existing services own member context/prompt helpers | communication delivery resolution |
| `agent-tools/task-delegation/` | Folder | model tool surface | schemas/parsers/manifest/service adapter/router | Existing tool capability area | runtime activation logic |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Boundary Is Clear? | Mixed-Layer Or Over-Split Risk | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `task-delegation/` | Main-Line Domain-Control | Yes | Medium | Add files by concrete concerns; active-run directory must stay active-only. |
| `backends/mixed/members/` | Runtime backend | Yes after split | Medium | Three subject registries are real lifecycle owners, not artificial layers. |
| `services/` roster builders | Off-Spine Concern | Yes | Medium | Keep roster files concrete and separate from communication routing. |
| `agent-tools/task-delegation/` | Transport/tool boundary | Yes | Low | Router belongs here because it interprets tool context and chooses run service; it must not own lifecycle transitions. |

## Concrete Examples / Shape Guidance

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Product manager prompt | `solution_designer — SoftwareEngineeringTeam representative` under message roster; `SoftwareEngineeringTeam — team target` under delegation roster | one flat list with `solution_designer` and `SoftwareEngineeringTeam` both unlabeled | Prevents wrong tool selection. |
| Team target input | `{ "target": { "kind": "team", "name": "SoftwareEngineeringTeam" }, "description": "..." }` | `{ "member_name": "solution_designer" }` to mean team | Keeps accountability on team. |
| Team result binding | router sees ingress `taskTeamInstance` and selects parent service | child coordinator submits to child team's own empty ledger | Routes result to PM. |
| Child task-tool run resolution | router resolves current child `teamRunId` through `TeamRunService` miss then `TaskTeamActiveRunDirectory` hit | `TaskDelegationToolService` inlines `TeamRunService` + directory + run-registry calls | Gives binding policy one owner. |
| Mixed runtime registry split | `MixedTeamManager -> MixedTaskAgentInstanceRegistry.start(...)` | `MixedTeamMemberRegistry.startTaskAgentInstance(...)` in a 500-line catch-all registry | Prevents god-object registry drift. |
| Active directory shape | `bindActiveRun(identity, childRun)` then `unbind(taskTeamRunId)` | `starting/active/settled` statuses, settled tombstones, unused task-id index | Keeps active resolver from becoming a history manager. |
| Runtime activation | `TeamRun.startTaskTeamInstance(request)` | task-delegation code imports and constructs `MixedTaskTeamMemberHandle` | Preserves runtime boundary. |
| Settlement | accept -> pending team settlement -> active-run lookup -> open-work/idle gates -> terminate task-team run -> unbind active entry | accept -> immediate child run terminate | Avoids killing active internal work. |

## Backward-Compatibility Rejection Log

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep `member_name` as shorthand for member targets | Existing tests/tools used it | Rejected | Migrate to explicit `target.kind=member`. |
| Treat `agent_team` wrapper as if it were a member target | Minimal code change | Rejected | Team target branch with `TaskTeamInstance`. |
| Use `send_message_to` to return team task result | Already routes parent/child messages | Rejected | `submit_task_result` routed by task-team binding and router. |
| Reuse `targetMemberRunId` for task-team run id | Avoids new backend method | Rejected | Add explicit task-team runtime methods. |
| Reuse persistent subteam handle for task tasks | Less code | Rejected | Separate per-task team handle to keep ordinary communication and task lifecycle independent. |
| Keep `MixedTeamMemberRegistry` as a compatibility facade around split registries | Less call-site churn | Rejected | `MixedTeamManager` composes real subject registries directly or through a non-empty cross-kind coordinator only. |
| Keep `TaskTeamDirectory` tombstones to prevent later resolution | Simple defensive guard | Rejected | Active directory unbind makes resolution miss; lifecycle history remains in ledger/events. |

## Derived Layering

- Tool layer: MCP schemas/parsers/adapters plus `TaskDelegationToolRunRouter` for tool-context run binding.
- Task lifecycle domain/control layer: target resolver, service, ledger, activation, notification, settlement, active child-run resolver.
- Runtime boundary layer: `TeamRun` / `TeamManager` commands.
- Mixed backend runtime layer: `MixedTeamManager`, subject registries, handles.
- Prompt/off-spine layer: context builder, roster builders, instruction composer.

Layering is explanatory only; ownership rules above are authoritative.

## Migration / Refactor Sequence

1. Preserve existing explicit target/schema, target/execution union, and no-`member_name` work.
2. Add/rename `TaskTeamActiveRunDirectory` with active-only entry shape, bind/resolve/unbind APIs, and parent cleanup; remove `TaskTeamDirectory` starting/settled status, tombstone set, and unused task-id index.
3. Update `TaskDelegationActivationCoordinator` and `MixedTaskTeamMemberHandle` so only the handle binds an active child run after the child `TeamRun` exists; failed-before-bind activation has no active directory cleanup.
4. Update `TaskTeamSettlementCoordinator` to use `TaskTeamActiveRunDirectory.resolveActiveEntryByTaskTeamRunId` and unbind after accepted settlement.
5. Add `TaskDelegationToolRunRouter` and move run binding from `TaskDelegationToolService`: current delegate/review route, parent task-team ingress submit route, active run fallback, run-registry lookup.
6. Tighten `TaskDelegationService.submitTaskResult` into explicit lifecycle transition methods or equivalent internal split so it no longer repeats parent/current run selection; it validates/transitions only the router-selected ledger.
7. Split `mixed-team-member-registry.ts` into `mixed-persistent-member-registry.ts`, `mixed-task-agent-instance-registry.ts`, and existing `mixed-task-team-instance-registry.ts`; add `mixed-team-member-config-resolver.ts` only if config lookup would otherwise duplicate.
8. Update `MixedTeamManager` to compose subject registries directly, route public commands, aggregate status, and terminate in safe order.
9. Update `TeamMemberDeliveryCoordinator` to depend on a persistent-member registry interface, not a catch-all mixed registry.
10. Remove or intentionally wire `TaskDelegationLedger.hasOpenWorkBlockingTaskTeamSettlement`; do not leave it unused.
11. Remove legacy fallback fields in `flattenTaskDelegationIdentity` unless there is an explicit current serialized-event compatibility requirement.
12. Update unit and integration tests for router behavior, active directory cleanup, and split mixed registries.
13. Add frontend task-team execution projection model/types and stream identity extraction.
14. Add task-team projection creation/status/timeline/cleanup handling from `TASK_DELEGATION_EVENT`.
15. Generalize `TeamTaskAgentActivityBar` into an active task executions surface or add an equivalent surface that renders task-agent and task-team cards distinctly.
16. Update focused tile/workspace composer behavior for task-team execution focus.
17. Add frontend unit/component/streaming tests plus cross-layer API/E2E coverage for task-team projection visibility.
18. Re-run implementation checks and then return to code review before final API/E2E/delivery proceeds.

Temporary seams allowed during implementation:

- A private adapter may exist inside `MixedTeamManager` during the split only if it owns cross-kind status/termination policy and does not recreate a catch-all lifecycle registry.
- Runtime task-team methods may initially support only the mixed backend because team execution is currently MixedTeamManager-only.
- A deprecation-style export alias for the renamed active directory is not allowed in production code unless needed only for an immediate mechanical test transition and removed in the same implementation pass.

## Key Tradeoffs

- **Per-task team run vs persistent subteam run**: per-task is more work but matches the user's mental model that the delegated team execution exits after acceptance and allows sequential PM tasks without stale exact run identities.
- **Explicit target object vs flat `target_kind` fields**: nested object is clearer and supported by `ParameterType.OBJECT`; use it as the target design.
- **Separate task-team handle vs overloading subteam handle**: separation prevents ordinary representative communication from being accidentally terminated by task acceptance.
- **Single `submit_task_result` tool vs new `submit_team_task_result`**: keep one model-facing result tool, but route by explicit caller binding through `TaskDelegationToolRunRouter`.
- **TaskTeamActiveRunDirectory fallback vs AgentTeamRunManager registration**: active directory keeps child task tools working without making task-scoped runs top-level history/topology subjects.
- **Split subject registries vs catch-all MixedTeamMemberRegistry**: more files, but each file owns one lifecycle subject and prevents the current 497-line catch-all from becoming a god-object.
- **Active-only directory vs tombstone directory**: active-only is simpler and keeps history in ledger/events; it relies on unique run ids and cleanup discipline.

## Risks

- Task-team settlement safety may be hard to define from current status snapshots alone. Mitigate with explicit open-work queries on the child task delegation service plus task-agent directory checks.
- Refactoring ledger record shape and service submit methods may touch many tests and event payload consumers. Mitigate by updating all task-delegation tests in one pass and avoiding compatibility dual paths.
- Child team context injection must be precise: only the ingress coordinator should get the parent task binding unless requirements later expand who can submit team results.
- Multiple simultaneous team tasks to the same logical team require taskTeamRunId-specific routing. The active-run directory and explicit backend methods must be keyed by taskTeamRunId and logical team route.
- If `ParameterType.OBJECT` formatting differs across model providers, tool schema tests must verify generated JSON schema for the nested target object.
- `TaskTeamActiveRunDirectory` holds active child `TeamRun` references. Mitigate cleanup risk by unbinding on failed start after binding, settlement, task-team handle dispose, and parent team termination.
- Registry splitting can create duplicate config traversal. Mitigate with `MixedTeamMemberConfigResolver` if both persistent and task-agent registries need the same lookup.
- Frontend task-team projection risks duplicating state between tree nodes and active execution cards. Mitigate by making the projection node the state owner and active execution card a renderer over that node.

## Guidance For Implementation

- Do not begin final product-complete API/E2E until CR-001..CR-003 and CR-005 rework has passed architecture and code review.
- Keep the good existing decisions intact: explicit target object, execution union, runtime-only task-team identity, no `member_name`, no `send_message_to` finalization, and no top-level registration of task-scoped child runs.
- Implement the router before adding more submit/run-binding logic to `TaskDelegationToolService`.
- Keep `TaskDelegationToolService` free of `TeamRunService`, active-run directory, and run-registry dependencies.
- Keep `TaskDelegationService` free of tool-run resolution. It should own lifecycle transitions after the correct service has been selected.
- Rename/tighten `TaskTeamDirectory` to `TaskTeamActiveRunDirectory`; remove lifecycle/tombstone state rather than documenting it as harmless.
- Split mixed runtime registries before adding any more task-team commands to `mixed-team-member-registry.ts`.
- Do not use `communicationRecipients` to validate `delegate_task` targets.
- Do not expose exact completed task-team run ids as future initial delegation targets.
- Keep `domain/task-team-instance.ts` runtime-only. Convert from task-delegation target structures inside task-delegation activation/identity factory code.
- Add tests at five levels:
  1. unit tests for target resolver, roster builder, and explicit target schema;
  2. unit tests for `TaskDelegationToolRunRouter` current/parent/fallback service selection;
  3. unit tests for `TaskTeamActiveRunDirectory` active bind/resolve/unbind cleanup and no tombstone behavior;
  4. frontend unit/component/streaming tests for task-team projection creation, lifecycle updates, active execution display, and existing task-agent non-regression;
  5. integration/API/E2E test for PM -> team -> visible task-team projection -> child internal work -> team result -> PM accept -> task-team settlement -> PM delegates second task.
