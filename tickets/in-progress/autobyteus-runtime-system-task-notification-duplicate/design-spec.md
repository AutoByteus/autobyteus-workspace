# Design Spec

## Status

Approved by user on 2026-06-29 for team workflow kickoff. Ready for `architecture_reviewer` review.

## Artifact Package

- Requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-runtime-system-task-notification-duplicate/tickets/in-progress/autobyteus-runtime-system-task-notification-duplicate/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-runtime-system-task-notification-duplicate/tickets/in-progress/autobyteus-runtime-system-task-notification-duplicate/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-runtime-system-task-notification-duplicate/tickets/in-progress/autobyteus-runtime-system-task-notification-duplicate/design-spec.md`

## Current-State Read

The user's screenshots show one task-team work packet displayed twice in `student_one` during the Nested Classroom Test:

1. as a normal visible input containing the full task activation text; and
2. as a purple `System Task Notification` segment with the same content.

The current execution path explains why this is AutoByteus-runtime-specific:

- `TaskDelegationActivationCoordinator` creates the delegated task work packet as `AgentInputUserMessage(..., SenderType.SYSTEM, metadata.message_type="task_team_delegation_work_packet")` for task-team targets and `message_type="task_delegation_work_packet"` for task-agent targets.
- The mixed-team runtime sends that message to the target member through `MixedAgentMemberHandle.postMessage()`.
- After the target runtime accepts the input, `MixedAgentMemberHandle.publishMemberInput()` publishes a `TeamRunEventSourceType.MEMBER_INPUT` event. `team-run-event-websocket-message-mapper.ts` maps that event to `MEMBER_INPUT_MESSAGE`; the web `memberInputMessageHandler.ts` renders it as a normal user/member input.
- Only the AutoByteus runtime has a second semantic projection: `autobyteus-ts/src/agent/pipelines/agent-input-pipeline.ts` emits `notifyAgentDataSystemTaskNotificationReceived()` for every `SenderType.SYSTEM` input. The server converts that stream event into `AgentRunEventType.SYSTEM_TASK_NOTIFICATION`, then WebSocket `SYSTEM_TASK_NOTIFICATION`, and the web renders `SystemTaskNotificationSegment`.
- Codex and Claude Agent SDK backends still consume the message content, but they do not run the AutoByteus `SenderType.SYSTEM` semantic notification path, so they do not produce this second visible event source.

The task packet must remain model-consumed: it contains the delegated task label, task IDs, accountable target, ingress member, instructions, and lifecycle protocol required for `submit_task_result`. Therefore the design must fix visible projection ownership without removing runtime/model delivery.

Prior accepted self-evolution architecture already establishes the relevant invariant: server-authored UI notifications should be projected through runtime-neutral local `AgentRunEventType.SYSTEM_TASK_NOTIFICATION` events, not by relying on `postUserMessage(... SenderType.SYSTEM ...)` as a UI-notification mechanism. This task applies that invariant to task delegation while keeping task packets as real model input.

## Intended Change

Introduce an explicit task-delegation system-message visibility policy:

- Task-delegation work packets and task-delegation lifecycle notifications remain `SenderType.SYSTEM` runtime inputs.
- Those server-owned task-delegation messages are stamped with explicit metadata saying:
  - they should be projected to the live UI as a `SYSTEM_TASK_NOTIFICATION`; and
  - the AutoByteus runtime should not emit its generic `SenderType.SYSTEM` semantic notification for them.
- `MixedAgentMemberHandle` becomes the concrete runtime-boundary owner that chooses the accepted-message live projection:
  - ordinary accepted user/inter-agent messages still publish `MEMBER_INPUT_MESSAGE`;
  - stamped task-delegation system messages emit one local `AgentRunEventType.SYSTEM_TASK_NOTIFICATION` and do **not** publish a member-input echo.
- `AgentInputPipeline` keeps its generic system notification behavior for ordinary AutoByteus `SenderType.SYSTEM` messages, but skips it when the explicit suppression metadata is present.

The target live UI surface for delegated task packets is therefore a single purple `SystemTaskNotificationSegment` across AutoByteus, Codex, and Claude paths.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix.
- Current design issue found (`Yes`/`No`/`Unclear`): Yes.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue plus Duplicated Policy Or Coordination.
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes, targeted.
- Evidence: `TaskDelegationActivationCoordinator` owns server task-packet creation, `MixedAgentMemberHandle` owns accepted member-input projection, and AutoByteus `AgentInputPipeline` independently turns the same `SenderType.SYSTEM` input into a system notification. These owners are currently unaware of each other, so the same server-authored packet reaches the UI through two surfaces.
- Design response: add an explicit metadata contract and one task-delegation visibility policy. Keep runtime input delivery and UI projection separate. Project server-owned task-delegation system messages as one runtime-neutral local system notification and suppress the AutoByteus runtime's generic notification for those messages.
- Refactor rationale: a frontend-only dedupe would hide symptoms while leaving two backend event sources. A runtime-only suppression would remove the AutoByteus duplicate but would still let task packets render as ordinary member inputs instead of the canonical notification component. The runtime-boundary projection branch is the smallest refactor that fixes ownership.
- Intentional deferrals and residual risk, if any: durable run-history notification replay is not redesigned here. The model-consumed task input may still be visible in raw memory/history representations. This change targets live WebSocket rendering and runtime notification duplication.

## Terminology

- **Task-delegation system message**: a server-authored `AgentInputUserMessage` with `SenderType.SYSTEM` produced by task delegation activation or notification dispatch.
- **Model-consumed task packet**: the actual task text delivered to the target runtime/LLM.
- **Visible notification projection**: a live UI event rendered as `SystemTaskNotificationSegment`.
- **Member-input echo**: `MEMBER_INPUT_MESSAGE`, rendered by the web client as an ordinary user/member input.
- **AutoByteus semantic notifier**: the AutoByteus runtime path that emits `agent_data_system_task_notification_received` for `SenderType.SYSTEM` inputs.

## Design Reading Order

1. Follow DS-001 to see how task delegation still delivers model input.
2. Follow DS-002 and DS-004 to see the new single notification projection and AutoByteus suppression.
3. Follow DS-005 to verify ordinary member-input behavior remains unchanged.
4. Read the file-responsibility and dependency sections for exact placement.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove the in-scope legacy behavior where task-delegation system messages are both member-input echoes and runtime system-task notifications.
- No compatibility wrapper, frontend content dedupe, or dual rendering fallback should be introduced.
- Existing un-stamped in-flight messages are not supported by a legacy fallback classifier. All new task-delegation system messages constructed by the in-scope task-delegation owners must be stamped explicitly.

## Data-Flow Spine Inventory

| Spine ID | Scope | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | `Teacher` calls `delegate_task` | Target task-agent/task-team runtime receives full task work packet | Task delegation activation owner | Guarantees the delegated task still executes. |
| DS-002 | Return-Event | Accepted stamped task-delegation system message | Web `SystemTaskNotificationSegment` | Mixed member runtime boundary plus existing agent/team stream mappers | Establishes the one canonical live notification surface. |
| DS-003 | Bounded Local | `MixedAgentMemberHandle.postMessage()` accepted result | Either notification projection or member-input echo | `MixedAgentMemberHandle` | This is the decision point that currently publishes the duplicate member-input echo. |
| DS-004 | Bounded Local / Runtime | AutoByteus `AgentInputPipeline` processes `SenderType.SYSTEM` | LLM still receives message, but generic system notification is skipped when suppressed | AutoByteus input pipeline | Removes the AutoByteus-only second notification event source. |
| DS-005 | Primary / Existing | Ordinary user or inter-agent delivery | `MEMBER_INPUT_MESSAGE` and model input | Mixed member runtime boundary | Protects normal transcript behavior. |

## Primary Execution Spine(s)

- DS-001: `delegate_task tool -> TaskDelegationService -> TaskDelegationActivationCoordinator -> TaskDelegationWorkPacketRenderer -> AgentInputUserMessage(SenderType.SYSTEM, stamped metadata) -> TeamRun.startTaskAgentInstance/startTaskTeamInstance -> MixedAgentMemberHandle.postMessage -> AgentRun.postUserMessage -> runtime/LLM -> submit_task_result`.
- DS-005: `ordinary user/inter-agent input -> TeamRun.postMessage/deliverInterMemberMessage -> MixedAgentMemberHandle -> AgentRun.postUserMessage/inter-agent router -> publishMemberInput -> MEMBER_INPUT_MESSAGE -> UserMessage`.

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | A task is delegated, recorded, rendered as a work packet, and delivered to the target execution instance as real runtime input. The only change is metadata stamping; content and lifecycle semantics stay intact. | Delegated task record, work packet, target execution instance, target member run | `TaskDelegationActivationCoordinator` | Metadata marking, notification projection policy. |
| DS-002 | After the target runtime accepts a stamped task-delegation system message, the mixed member boundary emits one local agent run `SYSTEM_TASK_NOTIFICATION`; existing team and WebSocket mappers route it to the focused/nested conversation. | Accepted message, local agent event, team event, WebSocket message, UI segment | `MixedAgentMemberHandle` for projection decision; existing stream mappers for transport | Payload identity, task-team event prefixing. |
| DS-003 | The mixed member boundary classifies accepted inputs. Stamped task-delegation messages do not become member-input echoes; all other accepted direct inputs keep the existing `publishMemberInput` behavior. | Agent member handle, accepted input, projection branch | `MixedAgentMemberHandle` | Task-delegation visibility classifier. |
| DS-004 | AutoByteus still processes `SenderType.SYSTEM` through input processors and LLM message building. The generic semantic notifier runs only when suppression metadata is absent. | AutoByteus input pipeline, notifier, LLM user message | `AgentInputPipeline` | Generic metadata suppression contract. |
| DS-005 | Non-task messages keep the current transcript path, including dedupe keys and context file handling. Inter-agent delivery remains a separate explicit method and should not be changed by this task. | User/inter-agent message, member input event payload, web user message | Existing mixed member input projection | Member-input payload builder, frontend user-message upsert. |

## Spine Actors / Main-Line Nodes

- `TaskDelegationActivationCoordinator`: creates activation work packets and binds task-agent/task-team execution instances.
- `TaskDelegationNotificationDispatcher`: creates result-submitted and revision-requested task-delegation system notifications.
- `AgentInputUserMessage.metadata`: carries explicit visibility/suppression semantics across package and runtime boundaries.
- `MixedAgentMemberHandle`: owns accepted direct-input projection for concrete agent members.
- `AgentRun.emitLocalEvent`: local runtime-neutral event mechanism used for UI notifications that are not backend-generated runtime stream events.
- `AgentInputPipeline`: AutoByteus runtime input-processing owner.
- Existing mappers/handlers: `agent-run-event-message-mapper.ts`, `team-run-event-websocket-message-mapper.ts`, and web `systemTaskNotificationHandler.ts`.

## Ownership Map

| Node | Owns | Must Not Own |
| --- | --- | --- |
| `TaskDelegationActivationCoordinator` | Work-packet content, task execution identity, activation metadata stamping. | Web rendering, runtime stream conversion, frontend dedupe. |
| `TaskDelegationNotificationDispatcher` | Task-delegation lifecycle notification content and metadata stamping. | Generic AutoByteus input-pipeline behavior. |
| `task-delegation-system-message-visibility.ts` | Task-delegation-specific classification and local notification event shape. | Posting messages, mutating task ledger state, WebSocket transport. |
| `system-task-notification-metadata.ts` in `autobyteus-ts` | Generic cross-package metadata key and suppression predicate. | Task-delegation-specific message type lists or server UI policy. |
| `MixedAgentMemberHandle` | Accepted-message projection choice for a concrete agent member. | Task-packet rendering or task lifecycle state. |
| `AgentInputPipeline` | AutoByteus runtime notification emission and LLM input construction. | Server/team UI projection policy. |
| Existing web handlers | Render incoming protocol messages. | Inferring duplicate backend event sources by content. |

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `TeamRun.postMessage()` | Concrete team backend/member handle | Public team message entrypoint | Task-delegation notification projection policy. |
| `AgentRun.postUserMessage()` | Runtime backend and command observers | Runtime input entrypoint | Live member/team transcript projection. |
| Web `TeamStreamingService` | Server WebSocket protocol | Routes server messages to focused member context | Backend duplicate suppression. |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope | Notes |
| --- | --- | --- | --- | --- |
| Member-input echo for stamped task-delegation system messages | It is the duplicate ordinary visible surface for server-owned task notifications. | `MixedAgentMemberHandle` projection branch plus task-delegation visibility policy. | In This Change | Ordinary user/inter-agent member input remains. |
| AutoByteus generic `SenderType.SYSTEM` notification for stamped task-delegation messages | It duplicates server-owned notification projection. | `SYSTEM_TASK_NOTIFICATION_SUPPRESSION_METADATA_KEY` checked by `AgentInputPipeline`. | In This Change | Generic unsuppressed system notifications remain. |
| Frontend/content-based duplicate hiding as a solution | It would preserve two backend event sources and depend on text matching. | Backend ownership fix. | In This Change | Do not add. |

## Return Or Event Spine(s) (If Applicable)

- DS-002: `MixedAgentMemberHandle accepted stamped task message -> build AgentRunEventType.SYSTEM_TASK_NOTIFICATION -> AgentRun.emitLocalEvent -> MixedAgentMemberHandle.bindEvents subscriber -> TeamRunEventSourceType.AGENT -> team-run-event-websocket-message-mapper -> ServerMessageType.SYSTEM_TASK_NOTIFICATION -> TeamStreamingService -> systemTaskNotificationHandler -> SystemTaskNotificationSegment`.

The event spine deliberately reuses the same runtime-neutral event and frontend component used by self-evolution notifications.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `MixedAgentMemberHandle`.
  - Chain: `postMessage -> ensureReady -> run.postUserMessage -> if accepted classify message -> emit system notification OR publish member input -> notifyStatusChange`.
  - Why it matters: this is the only place with both the accepted-result signal and the concrete member event publisher.
- Parent owner: `AgentInputPipeline`.
  - Chain: `processForLlm -> inspect original message sender/metadata -> maybe notify system task notification -> clone/process/build LLM message`.
  - Why it matters: suppression must not affect LLM input construction or input processors.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Generic suppression metadata | DS-004 | AutoByteus runtime and server message creators | One cross-package key/predicate for skipping runtime-generated system notification. | Both packages must agree without server-specific imports into `autobyteus-ts`. | String drift or circular package dependency. |
| Task-delegation visibility marker | DS-002, DS-003 | Task delegation and mixed member boundary | Marks messages that should be visible only as system task notifications. | Avoids brittle inference from `sender_id` or `message_type`. | Accidental suppression of unrelated system messages. |
| Existing task-team prefixing | DS-002 | Team stream transport | Prefix child task-team event identity into parent stream. | Nested Classroom uses task-team target. | Wrong focused conversation or lost task-team identity. |
| Member-input dedupe/context handling | DS-005 | Ordinary transcript path | Existing stable user-message projection. | Must remain unchanged for non-task messages. | Regressions for normal sends and inter-agent deliveries. |
| Web notification rendering | DS-002 | UI | Render `SYSTEM_TASK_NOTIFICATION`. | Existing component already matches target UX. | Frontend starts owning backend event-source cleanup. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Visible task notification UI | `AgentRunEventType.SYSTEM_TASK_NOTIFICATION` -> WebSocket -> `SystemTaskNotificationSegment` | Reuse | Already accepted for runtime-neutral system notifications. | N/A |
| Runtime input delivery | `AgentRun.postUserMessage` | Reuse | Required to keep the task packet model-consumed. | N/A |
| AutoByteus system notification emission | `AgentInputPipeline` | Extend | Needs a suppression predicate while preserving default behavior. | N/A |
| Task-delegation message classification | `agent-team-execution/task-delegation` | Create small task-specific file | Existing task-delegation files create messages but no single owner defines visibility metadata and event shape. | Generic team-member input builder is too broad; web protocol is too late. |
| Generic metadata suppression contract | `autobyteus-ts/src/agent/message` | Create small generic metadata file | The key must be importable by both `autobyteus-ts` internals and server code. | Server-side file cannot be imported by `autobyteus-ts`. |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts` agent message/runtime input | Generic metadata suppression contract and AutoByteus notifier guard. | DS-004 | `AgentInputPipeline` | Extend | No server-specific task-delegation imports here. |
| Server task delegation | Mark task-delegation system messages and build local notification event shape. | DS-001, DS-002 | Activation coordinator, notification dispatcher | Extend | Keeps task semantics near task-delegation owners. |
| Server mixed team runtime | Accepted-message projection branch. | DS-002, DS-003, DS-005 | `MixedAgentMemberHandle` | Extend | Boundary has both run and team event publisher. |
| Server streaming | Existing mapping of agent event to WebSocket message. | DS-002 | Agent/team stream mappers | Reuse | No protocol type needed beyond existing payload. |
| Web streaming/conversation | Existing handler/component. | DS-002 | `TeamStreamingService` and handler | Reuse / add tests only | No frontend logic change expected unless tests reveal missing coverage. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/agent/message/system-task-notification-metadata.ts` | AutoByteus agent message | Generic metadata contract | Export suppression key and predicate. | One reusable contract shared by runtime and server. | N/A |
| `autobyteus-ts/src/agent/message/index.ts` | AutoByteus public message exports | Barrel export | Re-export metadata contract. | Keeps package exports discoverable. | N/A |
| `autobyteus-ts/src/agent/pipelines/agent-input-pipeline.ts` | AutoByteus runtime input pipeline | Runtime input owner | Skip generic notifier when suppression predicate is true. | Existing owner already emits notifier. | Generic metadata contract. |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-system-message-visibility.ts` | Server task delegation | Task-delegation visibility policy | Mark metadata, classify messages, build local notification event payload. | Task-specific concern used by coordinators and member boundary. | Generic metadata contract. |
| `task-delegation-activation-coordinator.ts` | Server task delegation | Activation owner | Stamp work packet messages. | Existing construction point. | Task visibility marker. |
| `task-delegation-notification-dispatcher.ts` | Server task delegation | Notification owner | Stamp result/revision notification messages. | Existing construction point. | Task visibility marker. |
| `mixed-agent-member-handle.ts` | Mixed team runtime | Runtime member boundary | Branch accepted projection: notification-only or member input. | Existing owner of accepted input projection. | Task visibility classifier/event builder. |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Suppression metadata key | `autobyteus-ts/src/agent/message/system-task-notification-metadata.ts` | AutoByteus agent message | Used by server message creators and AutoByteus runtime. | Yes | Yes | A task-delegation-specific policy file. |
| Task-delegation visibility marker/event builder | `task-delegation-system-message-visibility.ts` | Server task delegation | Used by activation coordinator, notification dispatcher, and mixed member boundary. | Yes | Yes | A generic catch-all message router. |
| System notification event shape | same task-delegation file for task-specific builder | Server task delegation | Keeps sender/content normalization consistent. | Yes | Yes | A WebSocket mapper replacement. |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Parallel / Overlapping Representation Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `suppress_system_task_notification` metadata key | Yes: runtime must not emit its generic system notification for this input. | Yes | Low | Accept boolean `true` only. |
| `task_delegation_system_task_notification` metadata key | Yes: task-delegation message should be projected as a system task notification instead of member input. | Yes | Low | Scope to task-delegation constructors only. |
| Existing `sender_id`, `message_type`, `task_id` metadata | Mostly; they are diagnostic/task identity fields. | No change | Medium if used as classifier | Do not use them as the primary classifier. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/agent/message/system-task-notification-metadata.ts` | AutoByteus agent message | Generic metadata contract | Define `SYSTEM_TASK_NOTIFICATION_SUPPRESSION_METADATA_KEY = "suppress_system_task_notification"` and `shouldSuppressSystemTaskNotification(metadata)`. | Tiny, stable cross-package contract. | N/A |
| `autobyteus-ts/src/agent/message/index.ts` | AutoByteus public message exports | Barrel | Re-export the suppression key/predicate. | Existing export pattern. | N/A |
| `autobyteus-ts/src/agent/pipelines/agent-input-pipeline.ts` | AutoByteus runtime | Runtime input pipeline | Guard `notifyAgentDataSystemTaskNotificationReceived()` with `!shouldSuppressSystemTaskNotification(originalMessage.metadata)`. | Existing emission location. | Generic metadata contract. |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-system-message-visibility.ts` | Server task delegation | Task visibility policy | Define task visibility marker, stamp helper, classifier, and local `SYSTEM_TASK_NOTIFICATION` event builder. | One task-specific policy shared by three server files. | Generic suppression key. |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-activation-coordinator.ts` | Server task delegation | Activation coordinator | Stamp work packet metadata using the policy helper. | Existing packet creation point. | Task visibility policy. |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-notification-dispatcher.ts` | Server task delegation | Notification dispatcher | Stamp result/revision system notifications. | Existing notification creation point. | Task visibility policy. |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-agent-member-handle.ts` | Mixed team runtime | Agent member boundary | Emit one local system notification for stamped accepted task messages; otherwise publish member input. | Existing accepted-projection owner. | Task visibility policy. |
| `autobyteus-ts/tests/unit/agent/pipelines/agent-input-pipeline.test.ts` | AutoByteus tests | Runtime behavior coverage | Add suppression test while retaining existing unsuppressed system test. | Existing pipeline tests. | Generic metadata contract. |
| `autobyteus-server-ts/tests/unit/agent-team-execution/...` | Server tests | Task/mixed runtime coverage | Add metadata stamping and accepted projection tests. | Existing unit/integration test area. | Task visibility policy. |
| `autobyteus-web/services/agentStreaming/__tests__/TeamStreamingService.spec.ts` or handler tests | Web tests | Protocol routing coverage | Verify `SYSTEM_TASK_NOTIFICATION` still renders and no member input is synthesized by that event. | Existing streaming/handler tests. | Existing handler. |

## Ownership Boundaries

- Task delegation owns which messages are task-delegation system messages. It stamps them explicitly at construction time.
- AutoByteus runtime owns whether a `SenderType.SYSTEM` input produces a runtime semantic notifier event. It must only read a generic suppression metadata key, not import server task-delegation code.
- Mixed team runtime owns how accepted direct inputs are projected into team live events. It may depend on task-delegation visibility policy because it is deciding between two team-visible projections.
- Web owns rendering protocol messages it receives; it must not infer backend duplicate semantics from content.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| Task-delegation message constructors | Work-packet rendering, notification rendering, metadata stamping | Task delegation service/activation/notification code | Constructing task-delegation system messages elsewhere without stamp helper | Add a task-delegation factory/helper, not ad hoc literals. |
| Generic suppression metadata contract | Exact key and predicate | Server message constructors, AutoByteus pipeline | Repeating string literals across packages | Export from `autobyteus-ts` message metadata file. |
| Mixed member accepted projection | `publishMemberInput` vs `emitLocalEvent` | Team manager/member registries | Publishing task-delegation system member-input echoes upstream | Add projection method to `MixedAgentMemberHandle`. |
| Existing stream mappers | Agent/team event to WebSocket message conversion | Agent/team event publishers | Direct WebSocket writes from task-delegation code | Reuse `AgentRunEventType.SYSTEM_TASK_NOTIFICATION`. |

## Dependency Rules

- `autobyteus-ts` may not import server task-delegation code.
- `autobyteus-server-ts` may import public/subpath exports from `autobyteus-ts` for `AgentInputUserMessage`, `SenderType`, and generic metadata constants.
- Task-delegation constructors must use the task visibility helper when creating in-scope system messages.
- `MixedAgentMemberHandle` may import task-delegation visibility classification, because it is the server-side accepted input projection owner.
- Frontend must not add content-based dedupe as the fix.
- Codex and Claude backend input mappers should not receive runtime-specific changes for this bug unless tests reveal they strip metadata before acceptance; they are not the duplicate source.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `markTaskDelegationSystemTaskNotificationMetadata(metadata)` | Task-delegation visibility | Return metadata with task visibility marker and generic AutoByteus suppression marker. | `Record<string, unknown>` | Must preserve existing task identity fields. |
| `isTaskDelegationSystemTaskNotificationMessage(message)` | Task-delegation visibility | Classify only explicitly stamped task-delegation system messages. | `AgentInputUserMessage` | Requires `SenderType.SYSTEM` and marker `true`. |
| `buildTaskDelegationSystemTaskNotificationEvent(runId, message)` | Task-delegation visibility | Build local `AgentRunEventType.SYSTEM_TASK_NOTIFICATION`. | Agent run ID + stamped message | Payload must contain at least `sender_id` and `content`. |
| `shouldSuppressSystemTaskNotification(metadata)` | AutoByteus generic metadata | Decide if runtime generic system notification should be skipped. | metadata dictionary | Boolean `true` only. |
| `MixedAgentMemberHandle.postMessage(message)` | Accepted runtime input projection | Deliver to runtime, then project accepted input to exactly one live surface. | `AgentInputUserMessage` | Existing return shape unchanged. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `markTaskDelegationSystemTaskNotificationMetadata` | Yes | Yes | Low | None. |
| `isTaskDelegationSystemTaskNotificationMessage` | Yes | Yes | Low | Do not classify by content text. |
| `buildTaskDelegationSystemTaskNotificationEvent` | Yes | Yes | Low | Keep payload minimal and typed by existing event. |
| `shouldSuppressSystemTaskNotification` | Yes | Yes | Low | Accept only explicit boolean true. |
| `postMessage` projection branch | Yes | Yes | Medium | Keep branch private to `MixedAgentMemberHandle`; do not expose as user API. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Generic suppression key | `SYSTEM_TASK_NOTIFICATION_SUPPRESSION_METADATA_KEY` | Yes | Low | Keep generic; no task-specific words. |
| Suppression predicate | `shouldSuppressSystemTaskNotification` | Yes | Low | Boolean true only. |
| Task visibility file | `task-delegation-system-message-visibility.ts` | Yes | Low | Avoid generic `helpers.ts`. |
| Task marker | `TASK_DELEGATION_SYSTEM_TASK_NOTIFICATION_METADATA_KEY` | Yes | Low | Exact task-delegation scope in name. |
| Projection classifier | `isTaskDelegationSystemTaskNotificationMessage` | Yes | Low | Do not abbreviate to `isTaskNotification`. |

## Applied Patterns (If Any)

- **Explicit metadata contract**: cross-package behavior is driven by a named metadata key, not by content matching.
- **Runtime-neutral local event projection**: follows the accepted self-evolution notification pattern using `AgentRun.emitLocalEvent({ eventType: AgentRunEventType.SYSTEM_TASK_NOTIFICATION, ... })`.
- **Boundary classification before transport**: duplicate prevention happens at the accepted projection boundary, before WebSocket conversion and frontend rendering.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/agent/message/system-task-notification-metadata.ts` | File | AutoByteus generic message metadata | Suppression key and predicate. | Message metadata is shared by runtime and server imports. | Task-delegation message types, server events, UI logic. |
| `autobyteus-ts/src/agent/message/index.ts` | File | Message barrel exports | Export new metadata contract. | Existing package pattern. | Logic. |
| `autobyteus-ts/src/agent/pipelines/agent-input-pipeline.ts` | File | AutoByteus input pipeline | Suppression guard around semantic notifier only. | Existing owner of notifier emission and LLM input processing. | Server task-delegation classifiers. |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-system-message-visibility.ts` | File | Task-delegation visibility policy | Stamp/classify task-delegation system messages; build local notification event. | Task-delegation system-message semantics belong with task delegation. | Runtime posting, ledger mutation, frontend protocol handling. |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-activation-coordinator.ts` | File | Task activation owner | Apply stamp helper to work-packet metadata. | Existing work-packet construction. | Projection branching. |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-notification-dispatcher.ts` | File | Task notification owner | Apply stamp helper to result/revision notification metadata. | Existing notification construction. | Member-input publishing. |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-agent-member-handle.ts` | File | Mixed agent member runtime boundary | Accepted projection branch. | Existing owner of `publishMemberInput`. | Task packet rendering. |
| Web handler/component files | Existing files | Web rendering | No production change expected; tests only unless a type addition is chosen. | Existing `SYSTEM_TASK_NOTIFICATION` path is adequate. | Backend duplicate-policy inference. |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Boundary Is Clear? | Mixed-Layer Or Over-Split Risk | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `autobyteus-ts/src/agent/message` | Off-Spine Concern / shared message metadata | Yes | Low | Generic metadata contract belongs near `AgentInputUserMessage`. |
| `autobyteus-ts/src/agent/pipelines` | Main-Line runtime input | Yes | Low | Existing pipeline owns notifier behavior. |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation` | Main-Line domain-control | Yes | Low | Task-delegation visibility is task-specific. |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members` | Runtime boundary | Yes | Medium | It imports task policy only to decide accepted projection; does not own task semantics. |
| `autobyteus-web/services/agentStreaming` | Transport/client event handling | Yes | Low | Tests verify existing routing; no policy moves here. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Metadata stamping | `{ ...existing, [TASK_DELEGATION_SYSTEM_TASK_NOTIFICATION_METADATA_KEY]: true, [SYSTEM_TASK_NOTIFICATION_SUPPRESSION_METADATA_KEY]: true }` | Infer from `content.startsWith("Your team has been activated")` | Keeps behavior stable across text changes/translations. |
| AutoByteus suppression | `if (senderType === SYSTEM && !shouldSuppressSystemTaskNotification(metadata)) notify...` | Remove all AutoByteus system notifications | Preserves legitimate generic system notifications. |
| Accepted projection | `if (isTaskDelegationSystemTaskNotificationMessage(message)) run.emitLocalEvent(...); else publishMemberInput(message);` | Publish member input and also emit notification, relying on frontend dedupe | Fixes source ownership instead of hiding duplicates. |
| UI path | Existing `SYSTEM_TASK_NOTIFICATION` handler renders purple segment | New task-delegation-specific WebSocket type/component | Reuses accepted runtime-neutral notification UI. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Frontend dedupe by matching notification content to prior user input | Quick way to hide duplicate in the screenshots. | Rejected | Remove duplicate source at backend projection boundary. |
| Keep member-input echo and suppress only AutoByteus runtime notifier | Smallest runtime-specific fix. | Rejected | Would leave server-authored task packets as ordinary member inputs and make UX differ from intended notification surface. |
| Disable AutoByteus `SenderType.SYSTEM` notifications globally | Would stop the duplicate. | Rejected | Add explicit suppression metadata for server-owned task-delegation messages only. |
| Change task packet sender type from `SYSTEM` to `USER` | Would avoid AutoByteus system notifier. | Rejected | Loses semantic identity and does not establish canonical notification projection. |
| Legacy classifier for existing un-stamped task-delegation metadata | Could protect active old messages. | Rejected for in-scope design | Stamp all new messages explicitly; do not maintain old duplicate semantics. |

## Derived Layering (If Useful)

Layering after this change:

1. Task-delegation domain constructs task system messages and marks visibility intent.
2. Runtime boundary delivers messages and chooses one accepted live projection.
3. Runtime input pipeline consumes messages and emits runtime-origin notifications only when not explicitly suppressed.
4. Stream mappers transport existing event types.
5. Web renders protocol events without owning duplicate policy.

## Migration / Refactor Sequence

1. Add `autobyteus-ts/src/agent/message/system-task-notification-metadata.ts` with the generic suppression key and predicate. Re-export it through `autobyteus-ts/src/agent/message/index.ts`.
2. Update `AgentInputPipeline` so the existing `SenderType.SYSTEM` notifier runs only when `shouldSuppressSystemTaskNotification(originalMessage.metadata)` is false. Keep all LLM input construction unchanged.
3. Add `task-delegation-system-message-visibility.ts` in the server task-delegation folder. It should:
   - import the generic suppression key from `autobyteus-ts`;
   - define the task-delegation visibility marker;
   - provide a metadata stamp helper;
   - classify explicitly stamped `SenderType.SYSTEM` task-delegation messages;
   - build a local `AgentRunEventType.SYSTEM_TASK_NOTIFICATION` with payload `{ sender_id, content }`.
4. Update `TaskDelegationActivationCoordinator.buildWorkPacketMessage()` to apply the stamp helper to both task-agent and task-team work-packet metadata while preserving existing `sender_id`, `team_run_id`, `task_id`, `task_ids`, `execution_kind`, `message_type`, and task-agent/task-team IDs.
5. Update `TaskDelegationNotificationDispatcher.deliver()` to apply the same stamp helper to result-submitted and revision-requested notification metadata while preserving `input_origin`, `task_notification_type`, target identity, and task IDs.
6. Update `MixedAgentMemberHandle.postMessage()` after `run.postUserMessage(message)` acceptance:
   - if the message is a stamped task-delegation system notification, emit the local notification event on `run` and do not call `publishMemberInput(message)`;
   - otherwise call `publishMemberInput(message)` exactly as today.
7. Add/adjust unit tests:
   - AutoByteus pipeline: unsuppressed system message still notifies; suppressed system message still reaches LLM but does not call notifier.
   - Task-delegation metadata: activation and notification messages carry both markers.
   - Mixed member handle: stamped accepted message emits one agent notification event and no member-input event; ordinary user message still emits member input.
   - Web: existing `SYSTEM_TASK_NOTIFICATION` stream handling still creates one notification segment and does not synthesize a user message.
8. Run focused checks, then broader typecheck/test commands selected by implementation/API-E2E owners.
9. Do not add a compatibility fallback or content dedupe at the end.

## Key Tradeoffs

- **Accepted-only projection vs pre-accept notification**: Project after runtime acceptance to avoid showing notifications for rejected starts. This matches existing member-input echo semantics.
- **Task-specific server classifier plus generic runtime key**: Two small files are preferable to duplicating string literals or importing server policy into `autobyteus-ts`.
- **No frontend production change**: Backend ownership is cleaner; frontend tests can lock existing rendering but should not implement the fix.
- **Live UI focus over durable history**: This resolves the reported live duplicate. Durable historical notification reconstruction remains a separate design topic.

## Risks

- If an in-scope task-delegation message constructor is missed, that path may still use old projection behavior. Mitigation: update both activation and notification dispatcher constructors and add tests.
- If the suppression key is misspelled in either package, AutoByteus duplicate remains. Mitigation: import shared constant, do not repeat literals.
- Some existing tests may use minimal `AgentRun` stubs lacking `emitLocalEvent`. Mitigation: update stubs in touched tests to include the method.
- If Codex/Claude `postUserMessage` acceptance is slower than AutoByteus, the notification may appear after accepted result timing in those runtimes. This matches the accepted-projection boundary and avoids false notifications for rejected inputs.

## Guidance For Implementation

- Keep task packet content unchanged.
- Preserve all existing metadata fields; add new metadata fields rather than replacing task identity fields.
- The AutoByteus suppression guard must not skip input processors, memory ingest, prompt building, or LLM message construction.
- Do not modify `memberInputMessageHandler.ts` to hide task messages by content.
- Do not modify Codex/Claude runtime input mappers unless tests uncover metadata loss relevant to this design.
- Use existing `AgentRunEventType.SYSTEM_TASK_NOTIFICATION`, `AgentRun.emitLocalEvent`, and existing WebSocket mappers.
- Test the user's concrete scenario: Nested Classroom task-team delegation to `StudentStudyGroup` ingress `student_one`, with AutoByteus + DeepSeek, should show one task activation notification and still solve/submit the right-triangle result.
