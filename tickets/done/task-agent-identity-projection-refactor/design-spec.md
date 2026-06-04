# Design Spec

## Current-State Read

This follow-up starts from latest tracked `origin/personal` at `66bdc6d7f6fdcda2b11d39e9f3b7db18478cd723` in `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-identity-projection-refactor`.

The completed task-delegation implementation already has the right high-level model:

- A logical team member remains part of the team roster.
- A delegated task starts a concrete transient task-agent instance under that logical member.
- The transient task-agent instance appears while active and disappears after accepted/settled completion.
- `TaskDelegationService` owns delegated task policy and state.
- `TeamRun` and backend managers own concrete runtime lifecycle.

The current follow-up pressure is not a new task-delegation feature. It is a design hardening pass prompted by a remaining identity/projection smell:

1. Most server task-agent runtime events already carry explicit task-agent identity through `TeamRunAgentEventPayload.taskAgentInstance` and the websocket mapper.
2. The mixed runtime command-start/status overlay path can still emit an `AGENT_STATUS` with `agent_id` equal to a task-agent run ID but without `task_agent_run_id`, `task_agent_instance_id`, or `task_id`.
3. The frontend compensates by using `isTaskAgentRunId(...)`, which infers task-agent identity from generated ID substrings. That must not be the steady-state contract.
4. `TeamStreamingService.ts` owns too much context-resolution policy and is near the line guard.
5. `runHistoryTeamHelpers.ts` is also near the line guard and mixes team node aggregation with member projection fetching/hydration.
6. Active-execution projection is already partially established, but a few execution-adjacent consumers still use raw logical focus/topology.

The target design should make explicit identity the server/frontend contract, remove generated-run-ID heuristics, strengthen active-execution projection as the frontend boundary for execution-facing decisions, and protect the existing `TaskDelegationService` / `TeamRun` separation.

## Intended Change

Implement a clean-cut follow-up refactor that:

1. Extends task-agent command-start/status event production so task-agent-originated `AGENT_STATUS` messages always include `task_agent_run_id`, `task_agent_instance_id`, `task_id`, logical member route/path, and source route/path.
2. Extracts frontend stream message-to-context resolution into an owned resolver and removes `isTaskAgentRunId(...)` from routing/projection code.
3. Makes identity-less mismatched logical messages strict/malformed rather than guessed task-agent messages.
4. Uses active-execution projection as the authoritative frontend boundary for active display/focus/send/interrupt/history/open/workspace metadata.
5. Splits near-limit frontend files by concrete ownership where this ticket touches them.
6. Documents and preserves the server ownership split: task policy in `TaskDelegationService`; runtime lifecycle in `TeamRun`/backends.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Refactor / cleanup / design hardening.
- Current design issue found (`Yes`/`No`/`Unclear`): Yes.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing invariant, duplicated routing policy, boundary/ownership issue, file responsibility drift, legacy/compatibility pressure.
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes for identity propagation, frontend resolver extraction, active-execution projection cleanup, and near-limit file responsibility split. Deferred for durable task repository and `TASK_PLAN_EVENT` transport rename.
- Evidence:
  - `TeamMemberCommandStatusInput` lacks `TaskAgentInstanceIdentity`.
  - `MixedAgentMemberHandle.publishCommandStatus(...)` has access to `this.options.taskAgentInstance` but does not pass it into the command status overlay path.
  - `TeamStreamingService.ts` imports `isTaskAgentRunId(...)`, uses it in context resolution, and is `570` physical / `496` effective lines.
  - `teamActiveExecutionMembers.ts` imports the same heuristic to hide logical members whose run ID looks like a task-agent run.
  - `runHistoryTeamHelpers.ts` is `534` physical / `493` effective lines and mixes node aggregation with projection hydration/context building.
  - `workspace.ts` uses raw `teamContext.focusedMemberRouteKey` for active team workspace metadata.
  - `TeamRun` currently delegates runtime commands and does not own task acceptance/status policy; `TaskDelegationService` owns those rules.
- Design response:
  - Close the remaining server event identity gap at the producer/builder boundary.
  - Move frontend context routing to a concrete resolver and route task-agent messages by explicit identity only.
  - Remove generated-run-ID substring heuristics.
  - Strengthen active-execution projection APIs and replace execution-adjacent raw focus reads.
  - Split large frontend files by owned concerns.
  - Add durable tests around identity propagation, strict routing, active-execution projection, and boundary preservation.
- Refactor rationale: Adding more conditions inside `TeamStreamingService.ts` or retaining `isTaskAgentRunId(...)` would preserve duplicated implicit policy and couple the frontend to backend ID formatting. The clean boundary is explicit identity emitted by the server and consumed by a frontend resolver/projection owner.
- Intentional deferrals and residual risk, if any:
  - Durable task-delegation repository is deferred because no recovery/history requirement exists. Residual risk: in-memory task ledger remains non-recoverable across process restart, which is accepted from the completed ticket.
  - `TASK_PLAN_EVENT` rename is deferred because it is transport-compatibility-sensitive. Residual risk: naming remains historically confusing but does not block explicit task-agent identity or projection correctness.

## Terminology

- `Logical member`: a persistent team roster member/template/role visible in the team run.
- `Task-agent instance`: a transient concrete runtime instance started for one delegated task under a logical member.
- `Task-agent run ID`: the concrete runtime run ID for a task-agent instance. It is an opaque ID and must not be parsed by the frontend.
- `Task-agent identity`: the explicit compound identity `{ taskAgentRunId, taskAgentInstanceId, taskId, logicalMemberRouteKey/logicalMemberPath }`.
- `Active-execution projection`: the frontend projection that decides which team members/task-agent instances are visible/selectable as active execution subjects, distinct from raw logical team topology.
- `Subsystem` / `capability area`: a larger functional area that owns a broader category of work and may contain multiple files plus optional module groupings.
- `Module`: an optional intermediate grouping inside a subsystem when the codebase benefits from it. Do not use `module` as a synonym for one file.
- `Folder` / `directory`: physical grouping.
- `File`: one concrete source file and primary unit where one concrete concern should land.

## Design Reading Order

Read this design in this order:

1. Task-agent identity data-flow spines.
2. Server ownership boundaries (`TaskDelegationService` versus `TeamRun`/backends).
3. Frontend stream context resolver and active-execution projection ownership.
4. File responsibility/folder mapping and removal plan.
5. Validation plan and dependency rules.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove/decommission generated-run-ID task-agent heuristics from in-scope frontend routing/projection behavior.
- The target design must not keep dual behavior where task-agent identity can be either explicit fields or inferred from `agent_id` substrings.
- The target design must not create a `TASK_PLAN_EVENT` compatibility wrapper in this ticket. Since transport renaming is deferred, leave existing naming unchanged rather than adding a dual-path rename.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Task-agent command start/status in backend handle | Frontend transient task-agent context/status | `TeamRun` runtime event boundary plus frontend stream resolver | Closes the exact identity gap that forced heuristics. |
| DS-002 | Return-Event | Task-agent normal runtime/tool/status event | Websocket payload with explicit identity | Backend task-agent runtime registry/handle | Confirms existing good path remains the standard. |
| DS-003 | Primary End-to-End | Incoming websocket message | Correct logical member or transient task-agent context | `TeamStreamMemberContextResolver` | Removes routing policy from facade and removes ID-substring inference. |
| DS-004 | Primary End-to-End | Active UI/composer/history/workspace consumer | Active execution subject | Active-execution projection boundary | Prevents raw logical topology from selecting stale/wrong execution subjects. |
| DS-005 | Primary End-to-End | Delegation/acceptance command | Runtime start/settlement side effect | `TaskDelegationService` policy boundary | Preserves task policy/runtime lifecycle separation. |
| DS-006 | Bounded Local | Run-history store building team rows/contexts | Hydrated history/live team node/context data | Run-history owned files | Prevents near-limit mixed helper growth. |

## Primary Execution Spine(s)

### DS-001: Task-agent command-status identity spine

`Mixed task-agent handle -> TeamCommandStatusOverlayStore -> buildAgentMemberCommandStartStatusEvent -> TeamRun event -> websocket mapper -> TeamStreamMemberContextResolver -> task-agent context/projection`

### DS-003: Frontend stream routing spine

`Websocket message -> TeamStreamingService facade -> TeamStreamMemberContextResolver -> taskAgentContextProjection / logical context map -> handler dispatch -> active-execution projection updates`

### DS-004: Active execution consumer spine

`UI/composer/history/workspace consumer -> active-execution projection API -> task-agent/logical active node/context -> send/interrupt/display/workspace decision`

### DS-005: Task policy/runtime lifecycle spine

`delegate_tasks / mark / accept tool -> TaskDelegationService -> ledger/notifier/settlement coordinator -> TeamRun.startTaskAgentInstance / settleTaskAgentInstance -> backend runtime handle`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | When a task-agent handle publishes initializing/error status before the underlying agent run emits normal events, the command status path must carry the same task-agent identity that the handle already knows. The mapper then serializes the explicit fields and the frontend resolver routes the status to the transient task-agent context. | Mixed task-agent handle, command status overlay store, event builder, websocket mapper, stream resolver | Runtime event boundary (`TeamRun`/backend) for event production; frontend resolver for consumption | `AgentStatusPayload` builder, task-agent identity cloning/serialization |
| DS-002 | Normal task-agent runtime events already flow through registry/handle event binding with `taskAgentInstance`; keep this as the canonical event shape and cover it with tests. | Server-managed task-agent registry, mixed handle event binding, websocket mapper | Backend runtime handle/registry | `AgentRunEventMessageMapper`, status snapshot service |
| DS-003 | The streaming facade parses a message, then asks a dedicated resolver for the target context. Explicit task-agent identity routes to a transient task-agent context; strict logical identity routes to a logical member; mismatched identity-less messages are skipped as malformed/stale. | TeamStreamingService, TeamStreamMemberContextResolver, task-agent projection, logical context map | `TeamStreamMemberContextResolver` | Approval target normalization, message handlers |
| DS-004 | UI and store consumers that need an active execution subject ask the active-execution projection, not raw topology. Raw topology remains available for roster/configuration/history metadata. | Active-execution projection, stores/components/composables | Active-execution projection boundary | Team tree builders, workspace metadata lookup, mobile work catalog |
| DS-005 | Task tools continue to enter through `TaskDelegationService`; it decides task policy and requests runtime effects. `TeamRun` only executes start/settle/post/interrupt/publish commands on concrete runtime handles. | TaskDelegationService, ledger, notifier, settlement coordinator, TeamRun, backend managers | `TaskDelegationService` for task policy; `TeamRun` for runtime lifecycle | Tool adapters, task work-packet renderer, completion notifier |
| DS-006 | Run-history helpers are split so node aggregation and member projection hydration are separate owned concerns. | Run-history node builder, member projection hydrator | Run-history store subsystem | GraphQL projection query adapter, conversation/activity hydration |

## Spine Actors / Main-Line Nodes

| Node | Role In Design |
| --- | --- |
| `TaskDelegationService` | Authoritative task policy/lifecycle boundary. |
| `TaskDelegationLedger` | Internal task record storage behind `TaskDelegationService`. |
| `TaskDelegationSettlementCoordinator` | Internal owner of settlement request timing after task acceptance/failure rules. |
| `TeamRun` | Runtime lifecycle boundary for concrete team/member/task-agent runtime commands. |
| Backend member/task-agent handle/registry | Concrete runtime execution and event publication owner. |
| `TeamCommandStatusOverlayStore` | Runtime command status overlay producer for initializing/error events. |
| `team-run-event-websocket-message-mapper.ts` | Transport projection from internal team events to websocket messages. |
| `TeamStreamingService` | Websocket connection/parse/dispatch facade. |
| `TeamStreamMemberContextResolver` | New frontend owner for message-to-context resolution. |
| `teamTaskAgentContextProjection.ts` | Existing owner for transient task-agent context/node creation/removal. |
| Active-execution projection | Owner for active visible/selectable execution subjects. |
| Run-history node/projection files | Owners for history/live team row and context hydration. |

## Ownership Map

| Owner | Owns | Must Not Own |
| --- | --- | --- |
| `TaskDelegationService` | Delegated task records, task IDs, delegator identity, task-agent binding, status/acceptance transitions, authorization, completion/failure notifications, settlement-request decision. | Concrete runtime start/settle implementation details. |
| `TeamRun` | Runtime lifecycle command routing: start task-agent, settle task-agent, post/send/interrupt/approval, publish team/member/runtime events. | Task acceptance/status rules, task record mutation, original-delegator authorization. |
| Backend managers/handles | Concrete runtime handle creation, provider/agent run interaction, status snapshots, event publication. | Task business policy. |
| `TeamCommandStatusOverlayStore` | Temporary runtime command status overlay events and snapshots. | Task lifecycle policy or frontend routing decisions. |
| `TeamStreamMemberContextResolver` | Frontend stream message context resolution, strict identity validation, malformed/stale routing decisions. | Websocket lifecycle, message rendering, handler business logic. |
| `teamTaskAgentContextProjection.ts` | Task-agent context/node identity storage, create/update/remove projection behavior. | Generic websocket dispatch or logical member selection policy. |
| Active-execution projection | Active execution display/focus target selection over logical and task-agent nodes. | Raw team definition/roster ownership. |
| Run-history node builder | Team tree/history row aggregation and status summaries. | Projection fetching/hydration. |
| Run-history member projection hydrator | Fetch/build/apply team-member projection conversations/configs/contexts. | Team row aggregation or active execution selection policy. |

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `TeamStreamingService` | `TeamStreamMemberContextResolver` for routing; handlers for message application | Websocket connection, parsing, dispatch sequencing | Task-agent ID heuristics or context routing policy. |
| Tool adapter functions for delegation tools | `TaskDelegationService` | Model-facing tool boundary | Task policy outside the service. |
| `TeamRun.startTaskAgentInstance(...)` / `settleTaskAgentInstance(...)` | Backend runtime manager/handle | Runtime command boundary | Task acceptance/status policy. |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| `isTaskAgentRunId(...)` heuristic use in `TeamStreamingService.ts` | Explicit identity is mandatory for task-agent messages. | `TeamStreamMemberContextResolver` using `extractTaskAgentIdentity(...)` and strict logical run-id guard. | In This Change | Delete `taskAgentRunIdentity.ts` if no references remain. |
| `isTaskAgentRunId(...)` heuristic use in `teamActiveExecutionMembers.ts` | Active projection should not compensate for polluted logical run IDs. | Strict resolver prevents pollution; projection uses node/context identity. | In This Change | If additional guard is needed, use explicit task-agent context identity, not ID substrings. |
| Inline `getMemberContextResolution(...)` policy in `TeamStreamingService.ts` | Facade is near line guard and owns too much routing policy. | New `teamStreamMemberContextResolver.ts`. | In This Change | Keep dispatch switch in facade. |
| Mixed task-agent command-status identity-less event path | It emits task-agent run ID without task-agent identity fields. | `TaskAgentInstanceIdentity` propagated through overlay builder. | In This Change | Logical-member command statuses remain supported without task identity. |
| Raw active workspace metadata focus read in `workspace.ts` | It can select logical focus when active execution focus differs. | Active-execution projection getter/API. | In This Change | Raw focus still allowed for configuration views. |
| `runHistoryTeamHelpers.ts` mixed large-file responsibilities | File is near guard and mixes row aggregation with projection hydration. | Split node aggregation and member projection hydration files. | In This Change if touched/near guard | Keep exports stable only through intentional store imports, not compatibility wrapper. |
| Opportunistic task-delegation `TASK_PLAN_EVENT` rename | Compatibility-sensitive and not needed for identity fix. | Deferred dedicated protocol cleanup. | Follow-up | Do not add dual-path wrapper in this ticket. |
| Durable task-delegation repository | No recovery/history requirement in scope. | Existing in-memory ledger behind `TaskDelegationService`. | Follow-up | Add only in a persistence/recovery ticket. |

## Return Or Event Spine(s) (If Applicable)

### Task-agent status return/event spine

`Agent/task-agent runtime event or command status -> backend publishEvent(...) -> TeamRun event bus -> websocket mapper -> frontend parse -> context resolver -> message handler -> UI projection`

This return/event spine is the core of the ticket. The backend has the concrete runtime identity; the websocket payload carries it; the frontend must not reconstruct it from generated ID strings.

### Task acceptance settlement return/event spine

`accept_task -> TaskDelegationService.acceptTask(...) -> ledger accepted transition -> status/notification event -> settlement coordinator -> TeamRun.settleTaskAgentInstance(...) -> backend termination -> frontend offline/removal event`

This spine remains unchanged except for identity hardening on emitted events.

## Bounded Local / Internal Spines (If Applicable)

| Parent Owner | Bounded Local Spine | Why This Matters |
| --- | --- | --- |
| `TeamCommandStatusOverlayStore` | `publishMemberCommandStatus -> build status payload -> cache overlay -> publish TeamRunEvent -> apply/clear overlay on replacement runtime event` | The identity gap lives in this local status overlay path. |
| `TeamStreamMemberContextResolver` | `extract task identity -> route task-agent context -> else validate logical route/path/run identity -> return context or malformed/stale` | Keeps routing policy in one place and makes malformed handling testable. |
| Active-execution projection | `collect task-agent nodes -> filter active logical members -> attach task-agent children -> resolve focused active route` | Determines what appears/selects as an execution subject without deleting logical roster data. |
| Run-history member projection hydrator | `fetch projection -> build conversation/config -> apply status/activity hydration -> return context map` | Separates history hydration from team row aggregation. |

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| `AgentStatusPayload` identity fields | DS-001, DS-002 | Server event mapper / status builders | Normalize status payload including optional task-agent fields. | Avoid ad-hoc payload spreading. | Inconsistent event identity. |
| `TaskAgentInstanceIdentity` clone/serialization | DS-001, DS-002, DS-005 | Backend handles and mappers | Carry exact task-agent identity safely. | Prevent accidental mutation or partial identity. | Missing or stale task identity. |
| Approval target normalization | DS-003 | `TeamStreamingService` | Keep approval selector payloads normalized. | Existing facade concern separate from member context routing. | Resolver becomes a generic message utility. |
| Message handlers | DS-003 | `TeamStreamingService` dispatch | Apply stream messages to an already resolved context. | Keep routing separate from message mutation. | Handler routing duplication. |
| Workspace metadata lookup | DS-004 | Workspace store | Resolve metadata for active execution subject. | Needed for file/workspace surfaces. | Raw focus bypass. |
| GraphQL projection query adapter | DS-006 | Run-history member projection hydrator | Fetch member projection data. | External IO around context building. | Run-history node builder becomes IO/hydration blob. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Task-agent identity shape | `TaskAgentInstanceIdentity` and `TeamRunAgentEventPayload.taskAgentInstance` | Extend | Existing shape already fits. | N/A |
| Command status event identity | `team-member-command-start-status-events.ts` / `TeamCommandStatusOverlayStore` | Extend | Existing owner already produces initializing/error events. | N/A |
| Websocket identity serialization | `team-run-event-websocket-message-mapper.ts` | Reuse/extend lightly | Mapper already serializes `taskAgentInstance`. | N/A |
| Frontend task-agent projection | `teamTaskAgentContextProjection.ts` | Reuse | Already creates/removes transient task-agent contexts/nodes. | N/A |
| Frontend message-to-context routing | Agent streaming subsystem | Create New File | Routing is a concrete concern currently embedded in facade. | Existing projection file owns task-agent contexts, not all stream context resolution; handlers own message application, not routing. |
| Active execution selection | `teamActiveExecutionMembers.ts` | Extend / optionally relocate by ownership | Existing projection semantics are correct. | If relocated, it should become an explicit active-execution projection file, not a generic util. |
| Run-history member projection hydration | Run-history store subsystem | Create/Extract Owned File | Existing helper mixes too many concerns and is near guard. | Generic helper would hide ownership. |
| Durable task repository | Task delegation subsystem | Deferred | No recovery/history requirement. | N/A |
| Transport rename | Agent streaming protocol subsystem | Deferred | Compatibility-sensitive and not required. | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Server task delegation | Task records, lifecycle policy, authorization, notifications, settlement request decisions | DS-005 | `TaskDelegationService` | Reuse / guard | No business policy moves out. |
| Server team runtime lifecycle | Concrete runtime start/settle/post/interrupt/publish | DS-001, DS-002, DS-005 | `TeamRun`, backend managers/handles | Reuse / extend | Add identity to runtime status event path only. |
| Server agent streaming transport | Team event to websocket message projection | DS-001, DS-002 | Websocket mapper | Reuse | Mapper already has identity fields. |
| Frontend agent streaming | Websocket lifecycle, parse, context resolution, message dispatch | DS-003 | `TeamStreamingService`, new resolver | Extend / split | Extract resolver. |
| Frontend task-agent projection | Task-agent transient context/node lifecycle | DS-003, DS-004 | `teamTaskAgentContextProjection.ts` | Reuse | No new state store. |
| Frontend active execution projection | Visible/selectable active execution subjects | DS-004 | Projection file/getters | Extend | Replace bypasses. |
| Frontend run history | History/live team rows and member context hydration | DS-006 | Run-history store files | Split | Keep owned concerns separate. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `team-member-command-start-status-events.ts` | Server team runtime lifecycle | Command status event builder | Build status payload and TeamRun event for logical/task-agent command statuses. | Single producer of command-start/error status events. | `TaskAgentInstanceIdentity`, `AgentStatusPayload`. |
| `team-command-status-overlay-store.ts` | Server team runtime lifecycle | Command status overlay owner | Cache/apply/clear initializing/error overlays and pass optional task-agent identity. | Overlay lifecycle is one local concern. | `TeamMemberCommandStatusInput`. |
| `mixed-agent-member-handle.ts` | Server backend runtime | Mixed runtime member/task-agent handle | Pass task-agent identity into command status overlay. | Handle knows whether it is a task-agent instance. | `TaskAgentInstanceIdentity`. |
| `teamStreamMemberContextResolver.ts` | Frontend agent streaming | Stream message context resolver | Resolve incoming message to task-agent/logical context or malformed/stale. | One concrete routing concern extracted from facade. | `TaskAgentStreamIdentity`. |
| `TeamStreamingService.ts` | Frontend agent streaming | Websocket facade | Connect, parse, log, approval target mapping, dispatch to handlers after resolver. | Avoids routing policy bloat. | New resolver. |
| `teamTaskAgentContextProjection.ts` | Frontend task-agent projection | Task-agent context projection | Extract identity, ensure/remove task-agent contexts/nodes. | Existing owner remains correct. | Protocol identity payload. |
| `teamActiveExecutionMembers.ts` or renamed active projection file | Frontend active execution projection | Active execution selector | Flatten active display rows, resolve active focus, no ID heuristics. | This is one projection concern. | Task-agent context identity when needed. |
| `runHistoryTeamHelpers.ts` | Frontend run history | Team node/status aggregator | Team status conversion, draft summary, workspace root, build team nodes. | Keep row aggregation separate. | Active projection. |
| `runHistoryTeamMemberProjectionHydrator.ts` | Frontend run history | Member projection hydrator | Fetch/apply member projections, build conversations/config/context shells. | Projection hydration is one real concern. | Run hydration services. |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Task-agent identity fields in status/event payloads | Existing `TaskAgentInstanceIdentity` plus status payload builder extension | Server team runtime lifecycle | Same identity needed across builder, overlay, mapper, tests. | Yes | Yes | Loose optional bag for unrelated logical member events. |
| Frontend task-agent stream identity extraction | Existing `teamTaskAgentContextProjection.ts` exports | Frontend task-agent projection | Existing extraction/WeakMap should remain canonical. | Yes | Yes | Generic protocol parser for all message types. |
| Message-to-context resolution | New `teamStreamMemberContextResolver.ts` | Frontend agent streaming | Routing logic is reused across dispatch and tests. | Yes | Yes | Generic helper with unrelated logging/handler behavior. |
| Active execution focus/display logic | Existing active projection file, optionally renamed/re-homed | Frontend active execution projection | Consumers need one authoritative boundary. | Yes | Yes | Misc UI utility with hidden ID heuristics. |
| Team-member projection hydration | New run-history member projection hydrator | Frontend run history | Fetch/build/apply projection repeated in live/historical paths. | Yes | Yes | Generic store helper. |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `TaskAgentInstanceIdentity` | Yes | Yes | Low | Continue using as authoritative server identity. |
| `AgentStatusPayload` task-agent fields | Yes if optional only for task-agent-originated status | Yes | Medium | Extend builder with task identity and tests; do not infer from `agentId`. |
| `TaskAgentStreamIdentity` | Mostly yes | Yes | Low | Keep `taskAgentRunId` required; other task fields nullable only for legacy/external payload tolerance, but in server-originated task-agent events tests must require them. |
| `TeamStreamIdentityPayload` | Generic optional transport payload | N/A | Medium | Keep generic protocol type optional, but resolver must enforce required fields for task-agent-originated messages. |
| Active execution projection output | Yes | Yes | Low | Make the output the source for active consumer decisions. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-team-execution/services/team-member-command-start-status-events.ts` | Server team runtime lifecycle | Command status event builder | Build logical or task-agent command status payload/event; include task-agent identity when supplied. | One builder for command-start/error status events. | `TaskAgentInstanceIdentity`, `AgentStatusPayload`. |
| `autobyteus-server-ts/src/agent-team-execution/services/team-command-status-overlay-store.ts` | Server team runtime lifecycle | Command status overlay store | Publish/cache/apply/clear command status overlays with optional task-agent identity. | Overlay behavior belongs together. | Builder input. |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-agent-member-handle.ts` | Server mixed backend | Mixed member/task-agent runtime handle | Pass `this.options.taskAgentInstance ?? null` to command status overlay. | Handle owns runtime context. | `TaskAgentInstanceIdentity`. |
| `autobyteus-web/services/agentStreaming/teamStreamMemberContextResolver.ts` | Frontend agent streaming | Stream context resolver | Resolve messages to `{ context, identity?, routeKey?, reason? }` using explicit task-agent identity and strict logical identity. | Extracted owned routing policy. | `extractTaskAgentIdentity`, `getTaskAgentContextByRunId`, `ensureTaskAgentContext`. |
| `autobyteus-web/services/agentStreaming/TeamStreamingService.ts` | Frontend agent streaming | Websocket facade | Connection lifecycle, parsing, approval target mapping, logging, dispatch switch. | Keeps facade lean and testable. | New resolver. |
| `autobyteus-web/services/agentStreaming/teamTaskAgentContextProjection.ts` | Frontend task-agent projection | Transient task-agent projection | Maintain task-agent context/node identity and lifecycle. | Existing file remains correct owner. | Protocol identity types. |
| `autobyteus-web/utils/teamActiveExecutionMembers.ts` or `autobyteus-web/services/teamExecution/teamActiveExecutionProjection.ts` | Frontend active execution projection | Active execution selector | Flatten visible active members/task agents, resolve active focus, conversation preview rules without ID heuristic. | One active projection boundary. | Task-agent node/context identity. |
| `autobyteus-web/stores/workspace.ts` | Frontend workspace store | Active workspace metadata getter | Use active-execution focused context for team active metadata. | Store owns workspace metadata selection. | Active execution getter/API. |
| `autobyteus-web/stores/runHistoryTeamHelpers.ts` | Frontend run history | Team node/status aggregator | Keep status conversion, summary/activity/workspace-root and team node aggregation. | Narrowed file under guard. | Active projection. |
| `autobyteus-web/stores/runHistoryTeamMemberProjectionHydrator.ts` | Frontend run history | Member projection hydrator | Fetch/apply projections and build live/historical member contexts. | Concrete extracted concern. | Run hydration services. |
| Tests under existing server/frontend test folders | Validation | Invariant tests | Cover identity propagation, resolver strictness, projection use, boundary preservation. | Durable regression coverage. | N/A |

## Ownership Boundaries

### Server boundary

`TaskDelegationService` is the authoritative task-management policy boundary. It owns the meaning of task states and acceptance. `TeamRun` is the runtime lifecycle boundary. It owns how to start, settle, post, interrupt, approve, and publish runtime events for concrete logical members or task-agent instances.

The follow-up identity fix must not move task policy into `TeamRun` or backend managers. Backends may carry `TaskAgentInstanceIdentity` because they need it to publish correct runtime events, but they must not interpret task acceptance/status business rules.

### Frontend boundary

`TeamStreamMemberContextResolver` is the authoritative stream routing boundary. `TeamStreamingService` must not also implement routing fallbacks based on task-agent ID formatting. Active execution consumers must use the active-execution projection boundary instead of combining raw `memberTree` / raw focus with projection internals.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `TaskDelegationService` | Ledger, input resolver, event publisher, notifier, settlement coordinator | Tool implementations, coordinator/delegator task flows | Tool/TeamRun/backend mutates ledger or decides acceptance directly | Add/reshape service method. |
| `TeamRun` runtime lifecycle | Backend manager/handle command execution | Task delegation settlement/activation, external commands | TaskDelegationService reaches directly into backend manager | Add/reshape `TeamRun` runtime command. |
| `TeamStreamMemberContextResolver` | Task-agent identity extraction, logical route/path resolution, strict mismatched identity handling | `TeamStreamingService` dispatch | Facade or handlers parse run IDs or duplicate context lookup policy | Add resolver return type/method. |
| Active-execution projection | Active display entries, active focused route/context/node | Stores/components/composables needing active execution target | Consumer uses raw focus plus raw member tree to choose execution target | Add projection selector/getter. |
| Run-history member projection hydrator | Projection fetching/building/applying | Run history store | Node builder directly performs GraphQL projection hydration | Add hydrator API. |

## Dependency Rules

### Allowed

- `TaskDelegationService` may call `TeamRun.startTaskAgentInstance(...)` and request settlement through `TaskDelegationSettlementCoordinator` / `TeamRun.settleTaskAgentInstance(...)`.
- Backends/handles may carry and publish `TaskAgentInstanceIdentity` for runtime events.
- `TeamRun` may route postMessage/send/interrupt/approval commands to concrete logical member or task-agent handles.
- `TeamStreamingService` may call `TeamStreamMemberContextResolver` and dispatch to message handlers with the returned context.
- Active UI/store consumers may use active-execution projection getters/selectors.
- Raw logical `memberTree` / `focusedMemberRouteKey` may be used for roster, team definition editing, static history metadata, and configuration views where no active execution subject is selected.

### Forbidden

- `TeamRun` or backend managers must not decide task acceptance/status rules, mutate task records, determine original-delegator authorization, or interpret task business state.
- Frontend code must not infer task-agent identity from generated run ID substrings such as `__task_` or `task-agent-run`.
- `TeamStreamingService` must not retain duplicate message-to-context routing policy after the resolver is introduced.
- Active execution consumers must not mix raw topology with projection internals to choose send/interrupt/display/workspace execution targets.
- No dual-path transport compatibility wrapper for `TASK_PLAN_EVENT` rename in this ticket.
- No durable task repository outside or above `TaskDelegationService` in this ticket.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `buildAgentMemberCommandStartStatusEvent(input)` | Runtime command status event | Build logical/task-agent status event | Logical member identity plus optional `TaskAgentInstanceIdentity` | If task identity supplied, event data and payload must carry it. |
| `TeamCommandStatusOverlayStore.publishMemberCommandStatus(input)` | Runtime status overlay | Publish/cache command status | Member context plus optional task-agent identity | Logical path unchanged when identity absent. |
| `MixedAgentMemberHandle.publishCommandStatus(...)` | Mixed runtime handle | Publish initializing/error for current handle | Uses handle context and `this.options.taskAgentInstance ?? null` | Task-agent handles must pass identity. |
| `convertTeamRunEventToServerMessage(...)` | Transport mapper | Serialize internal team event | `TeamRunAgentEventPayload.taskAgentInstance` | Keep mapper as projection, not identity inference owner. |
| `resolveTeamStreamMemberContext(teamContext, message)` | Frontend stream resolver | Resolve target context or malformed/stale | Explicit task-agent identity or strict logical route/path/run identity | New API. |
| `ensureTaskAgentContext(teamContext, identity)` | Task-agent projection | Create/update transient task-agent context | `TaskAgentStreamIdentity` with required run ID | Existing API. |
| `resolveActiveExecutionFocusedMemberRouteKey(teamContext, preferred?)` | Active execution projection | Resolve active focus | Team context plus optional preferred route | Must not use task-agent ID marker heuristic. |
| Workspace active metadata getter | Workspace store | Choose workspace metadata for selected run/team | Active-execution focused context for teams | Replace raw focus. |
| `TaskDelegationService.acceptTask(...)` | Task policy | Verify acceptance and request settlement | `task_id` plus original delegator context | Preserve; do not move to `TeamRun`. |
| `TeamRun.settleTaskAgentInstance(logicalMemberRouteKey, taskAgentRunId, reason?)` | Runtime lifecycle | Stop concrete task-agent runtime | Logical member route + task-agent run ID | Runtime command only. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `publishMemberCommandStatus` current | Mostly | No for task-agent | Medium | Add optional `taskAgentInstance`. |
| `getMemberContextResolution` current inline method | No | No; uses route/run/heuristic | High | Replace with resolver API. |
| `resolveTeamStreamMemberContext` target | Yes | Yes | Low | New resolver. |
| Active workspace metadata current | Yes | No; raw focus can be wrong subject | Medium | Use active-execution focus. |
| `TaskDelegationService.acceptTask` | Yes | Yes | Low | Preserve. |
| `TeamRun.settleTaskAgentInstance` | Yes | Yes | Low | Preserve runtime-only meaning. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Frontend stream resolver | `TeamStreamMemberContextResolver` / `teamStreamMemberContextResolver.ts` | Yes | Low | Use this or equivalent; avoid `helper`. |
| Active execution projection | `teamActiveExecutionMembers.ts` current / possible `teamActiveExecutionProjection.ts` | Mostly | Medium | Rename only if useful; if kept, document as projection owner. |
| Run-history projection hydrator | `runHistoryTeamMemberProjectionHydrator.ts` | Yes | Low | Extract from helper. |
| Command status overlay | `TeamCommandStatusOverlayStore` | Yes | Low | Extend, do not rename. |
| Task-agent ID heuristic | `taskAgentRunIdentity.ts` | No longer valid | High | Remove/decommission. |

## Applied Patterns (If Any)

| Pattern | Location | Problem Solved | Owner |
| --- | --- | --- | --- |
| Explicit compound identity | Server event payloads and frontend resolver | Avoid ambiguous run-ID selectors and string heuristics. | Runtime event boundary / stream resolver. |
| Projection | Frontend task-agent and active-execution files | Separate transient execution view from logical team topology. | Frontend projection owners. |
| Status overlay | Server command status overlay store | Represent initializing/error status before normal runtime events arrive. | Runtime lifecycle subsystem. |
| Facade + owned resolver | `TeamStreamingService` + new resolver | Keep websocket dispatch separate from context routing policy. | Frontend agent streaming. |

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-team-execution/services/team-member-command-start-status-events.ts` | File | Runtime command status builder | Add optional task-agent identity to status payload/event. | Existing service owns command-start status events. | Task policy or frontend assumptions. |
| `autobyteus-server-ts/src/agent-team-execution/services/team-command-status-overlay-store.ts` | File | Status overlay store | Pass/store/apply optional task-agent identity in overlays. | Existing owner for overlays. | Task acceptance rules. |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-agent-member-handle.ts` | File | Mixed runtime handle | Provide task-agent identity to command status overlay. | Handle owns runtime identity/context. | Task business transitions. |
| `autobyteus-web/services/agentStreaming/teamStreamMemberContextResolver.ts` | File | Stream context resolver | Resolve message target by explicit task-agent identity or strict logical route identity. | Same subsystem as streaming/projection. | Websocket lifecycle, handler mutation, ID-substring heuristics. |
| `autobyteus-web/services/agentStreaming/TeamStreamingService.ts` | File | Websocket facade | Use resolver; dispatch parsed messages to handlers. | Existing facade remains. | Context resolution policy or task-agent ID heuristics. |
| `autobyteus-web/services/agentStreaming/taskAgentRunIdentity.ts` | File | Obsolete heuristic | Remove if no references remain. | It should not belong anywhere in target. | Any in-scope routing behavior. |
| `autobyteus-web/services/agentStreaming/teamTaskAgentContextProjection.ts` | File | Task-agent projection | Continue context/node lifecycle; remove reliance on active heuristic if any arises. | Existing task-agent projection owner. | Generic logical member routing. |
| `autobyteus-web/utils/teamActiveExecutionMembers.ts` or `autobyteus-web/services/teamExecution/teamActiveExecutionProjection.ts` | File | Active-execution projection | Active display/focus without ID heuristic. | Existing utility can remain if clear; rename/re-home only if implementation benefits. | Raw topology selection for execution targets outside projection. |
| `autobyteus-web/stores/workspace.ts` | File | Workspace metadata getter | Use active-execution focused context for selected team. | Store owns workspace metadata. | Raw focus execution-subject selection. |
| `autobyteus-web/stores/runHistoryTeamHelpers.ts` | File | Run-history team node/status aggregation | Keep non-hydration team-node concerns. | Existing run-history store location. | Projection fetching/context hydration if extracted. |
| `autobyteus-web/stores/runHistoryTeamMemberProjectionHydrator.ts` | File | Run-history member projection hydration | Fetch/build/apply team-member projections and contexts. | Same store subsystem; concrete owner. | Team row aggregation or active execution projection. |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-team-execution/services` | Off-spine runtime services | Yes | Low | Existing home for command event builders/overlays. |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members` | Runtime backend | Yes | Low | Handle-specific identity passing belongs here. |
| `autobyteus-web/services/agentStreaming` | Transport/projection-adjacent frontend streaming | Yes | Low | Resolver belongs beside streaming facade and task-agent projection. |
| `autobyteus-web/utils` active projection current location | Off-spine projection utility | Mostly | Medium | Acceptable if named/owned clearly; consider `services/teamExecution` only if broader projection ownership becomes clearer. |
| `autobyteus-web/stores` run-history files | Store/history subsystem | Yes if split | Medium | Extract hydrator to avoid mixed helper blob. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Task-agent status payload | `{ status, agent_id: taskAgentRunId, member_route_key: 'worker', task_agent_run_id: taskAgentRunId, task_agent_instance_id: 'task_agent_task_0001', task_id: 'task_0001' }` | `{ status, agent_id: 'team__worker__task_0001', member_route_key: 'worker' }` plus frontend substring detection | Shows explicit identity instead of generated ID inference. |
| Frontend resolver | `if task identity -> ensureTaskAgentContext; else if logical route and agent_id matches known logical run -> logical context; else malformed/stale` | `if agent_id includes '__task_' -> skip` | Keeps run IDs opaque. |
| Active workspace metadata | `activeExecutionFocusedMemberContext?.config.workspaceMetadata ?? teamContext.config.workspaceMetadata` | `leafAgentContextsByRouteKey.get(focusedMemberRouteKey)` | Prevents raw focus from selecting a logical member when active task-agent is the execution subject. |
| Server task policy boundary | `accept_task -> TaskDelegationService -> settlementCoordinator.requestSettlement -> TeamRun.settleTaskAgentInstance` | `TeamRun.acceptTask(...)` mutates ledger and decides delegator authorization | Preserves separation. |
| Run-history split | `runHistoryTeamHelpers` builds nodes; `runHistoryTeamMemberProjectionHydrator` builds member contexts | One large `runHistoryTeamHelpers.ts` fetches, hydrates, builds rows, and manages active projection | Avoids near-limit mixed file. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep `isTaskAgentRunId(...)` as fallback when task-agent identity is missing | It currently protects against identity-less task-agent status events. | Rejected | Server emits explicit identity; resolver treats mismatched identity-less logical events as malformed/stale without ID markers. |
| Support both explicit task-agent identity and ID-substring inference indefinitely | Might reduce short-term risk if another producer is missed. | Rejected | Add producer tests/invariant coverage so missing identity is caught. |
| Rename `TASK_PLAN_EVENT` while also supporting old/new message types | Naming is confusing but compatibility-sensitive. | Rejected for this ticket | Defer to a separate clean protocol migration ticket. |
| Add durable task repository as broad cleanup | Mentioned as future possible improvement. | Rejected for this ticket | Keep in-memory ledger; only add repository behind `TaskDelegationService` if recovery/history requirements appear. |
| Add generic frontend helpers to reduce line counts | Quick way to lower file sizes. | Rejected | Extract owned resolver and projection hydrator concerns. |

## Derived Layering (If Useful)

### Server

`Tool/API boundary -> TaskDelegationService policy -> TeamRun runtime lifecycle -> Backend runtime handle/registry -> TeamRun event -> websocket mapper`

### Frontend

`Websocket facade -> Stream context resolver -> Task-agent/logical context projection -> Message handlers -> Active-execution projection -> UI/store consumers`

Layering is explanatory only. The real boundary rule is authoritative ownership: callers above a subject boundary must depend on that boundary rather than on the boundary and its internals at the same time.

## Migration / Refactor Sequence

1. **Server identity producer fix**
   - Extend `TeamMemberCommandStatusInput` with `taskAgentInstance?: TaskAgentInstanceIdentity | null`.
   - Update `buildAgentMemberCommandStatusPayload(...)` to pass task-agent fields into `buildAgentStatusPayload(...)` when identity is supplied.
   - Update `buildAgentMemberCommandStartStatusEvent(...)` to set `data.taskAgentInstance` when identity is supplied.
   - Update `TeamCommandStatusOverlayStore.publishMemberCommandStatus(...)` to accept/pass optional task identity.
   - Update overlay snapshots/apply/clear logic only as needed; avoid changing logical member behavior.
   - Update `MixedAgentMemberHandle.publishCommandStatus(...)` to pass `this.options.taskAgentInstance ?? null`.

2. **Server validation**
   - Add/extend unit/integration tests proving mixed task-agent command status emits explicit identity fields.
   - Add regression test that logical member command status still emits without task-agent fields and routes normally.
   - Add code-review/search guard around `TeamRun`/backend task policy separation if feasible.

3. **Frontend resolver extraction**
   - Add `teamStreamMemberContextResolver.ts` with a resolver API and tests.
   - Move `getMemberContextResolution(...)` logic out of `TeamStreamingService.ts`.
   - Use explicit task-agent identity first.
   - For identity-less messages, route by logical route/path only when strict logical identity checks pass.
   - Do not mutate an existing logical member run ID from a conflicting `agent_id` in a generic stream message.

4. **Frontend heuristic removal**
   - Remove `isTaskAgentRunId(...)` imports from `TeamStreamingService.ts` and `teamActiveExecutionMembers.ts`.
   - Delete `taskAgentRunIdentity.ts` if `rg` confirms no references.
   - Replace tests that assert heuristic behavior with tests asserting explicit identity and strict malformed handling.

5. **Active-execution projection audit/fix**
   - Update `workspace.ts` active team metadata to use active-execution focused context.
   - Audit composer/send/interrupt/running sidebar/history/open/workspace link/mobile paths.
   - Replace execution-subject raw focus reads with active projection APIs.
   - Leave raw logical topology reads where they are roster/configuration/static history metadata.

6. **Run-history and file size split**
   - Extract member projection hydration/building from `runHistoryTeamHelpers.ts` into `runHistoryTeamMemberProjectionHydrator.ts` or equivalent.
   - Keep node aggregation/status helpers in `runHistoryTeamHelpers.ts` or a clearly named node builder file.
   - Keep `TeamStreamingService.ts` below guard after resolver extraction.

7. **Transport/persistence deferral check**
   - Confirm no durable task-delegation repository was added.
   - Confirm no `TASK_PLAN_EVENT` dual-path rename compatibility wrapper was added.

## Validation Plan

### Server tests

- Unit/integration test for `buildAgentMemberCommandStartStatusEvent(...)` with `taskAgentInstance` supplied:
  - internal event data includes `taskAgentInstance`;
  - status payload includes `task_agent_instance_id`, `task_agent_run_id`, and `task_id`;
  - websocket mapper emits the same fields.
- Unit/integration test for logical member command status without task identity:
  - no task-agent fields;
  - logical route/path and agent ID still present.
- Mixed runtime task-agent lifecycle test update:
  - after `delegate_tasks`, the first task-agent initializing/status event carries explicit identity.
- Boundary search/review check:
  - `TeamRun`/backend managers do not call ledger mutation or decide `acceptTask`/`markTask*` policy.

### Frontend tests

- Resolver tests:
  - explicit task-agent identity creates/routes to task-agent context;
  - offline status with explicit identity removes the task-agent context/card;
  - identity-less mismatched logical `agent_id` is skipped/malformed and does not mutate logical context;
  - no test depends on `__task_` or `task-agent-run` substrings.
- `TeamStreamingService` tests:
  - service delegates routing to resolver;
  - no `isTaskAgentRunId` import/reference remains.
- Active-execution projection tests:
  - logical worker row remains visible as roster/logical member where expected;
  - transient task-agent row appears under logical member while active and disappears after settlement;
  - workspace metadata uses active-execution focus.
- Run-history tests:
  - live team rows still filter to active execution tree;
  - history opening/selection still resolves active execution focus where appropriate;
  - split hydrator preserves projection hydration.

### Static checks

- `rg -n "isTaskAgentRunId|taskAgentRunIdentity" autobyteus-web` returns no production references.
- Effective line counts for `TeamStreamingService.ts` and `runHistoryTeamHelpers.ts` are comfortably below the guard after extraction.
- Existing server/frontend test suites relevant to changed files pass.

## Open Questions / Decisions For Architecture Review

1. Is the proposed strict logical run-ID mismatch handling acceptable as the clean replacement for task-agent run-ID heuristics?
2. Should active-execution projection remain in `autobyteus-web/utils/teamActiveExecutionMembers.ts`, or should implementation re-home/rename it to a more explicit service path if the touch size is already significant?
3. Is the proposed run-history split (`runHistoryTeamMemberProjectionHydrator.ts`) the right owned concern boundary, or should the node aggregation side be renamed as well?

## Non-Goals / Explicit Deferrals

- No change to model-facing task-delegation tool schema.
- No new durable task-delegation repository.
- No task-delegation state replay/recovery semantics.
- No `TASK_PLAN_EVENT` protocol rename or dual-path compatibility layer.
- No broad team UI redesign beyond active-execution projection correctness and task-agent identity lifecycle display.
