# Design Spec

## Current-State Read

Task delegation is server-owned by `TaskDelegationService` under `autobyteus-server-ts/src/agent-team-execution/task-delegation`. The current lifecycle path is healthy for routing, ledger mutation, event publication, notification delivery outcome handling, and task-agent/task-team settlement, but the content boundary is wrong.

Current paths:

- `delegate_task` activation:
  - `TaskDelegationToolService.delegateTask(...)`
  - `TaskDelegationService.delegateTask(...)`
  - `TaskDelegationActivationCoordinator.activateTask(...)`
  - `TaskDelegationActivationCoordinator.buildWorkPacketMessage(...)`
  - `TaskDelegationWorkPacketRenderer.render(...)`
  - `TeamRun.startTaskAgentInstance(...)` or `TeamRun.startTaskTeamInstance(...)`
- `submit_task_result` follow-up notification:
  - `TaskDelegationService.publishSubmissionTransition(...)`
  - `TaskDelegationNotificationDispatcher.notifyResultSubmitted(...)`
  - `TaskDelegationNotificationDispatcher.renderResultSubmitted(...)`
  - `TeamRun.postMessage(...)` to the original delegator
- `review_task_result(decision="request_revision")` follow-up notification:
  - `TaskDelegationService.reviewTaskResult(...)`
  - `TaskDelegationNotificationDispatcher.notifyRevisionRequested(...)`
  - `TaskDelegationNotificationDispatcher.renderRevisionRequested(...)`
  - `TeamRun.postMessage(...)` or `TeamRun.postMessageToTaskTeamInstance(...)` to the bound task execution target
- Visible transcript projection:
  - stamped `SenderType.SYSTEM` message reaches `MixedAgentMemberHandle.postMessage(...)`
  - accepted stamped task-delegation messages call `buildTaskDelegationSystemTaskNotificationEvent(...)`
  - that helper currently emits `SYSTEM_TASK_NOTIFICATION` payload `content: message.content`
  - frontend `handleSystemTaskNotification(...)` and `SystemTaskNotificationSegment.vue` render that exact backend payload content.

The immediate defect is that task-delegation runtime/model instruction content and human/agent-visible notification content share a single string. As a result, visible system task notifications show execution kind, submission/review ids, task-agent/task-team run ids, task-team instance ids, ingress details, JSON tool-call snippets, and `send_message_to` protocol warnings. Those details are backend correlation or model instruction details, not useful task/review information for the recipient's transcript.

A second semantic issue exists in the `review_task_result` model-facing API: the reviewer's free-text field is named `message`. In this workflow the text is not ordinary message delivery; it is a review comment or revision instruction attached to a lifecycle decision. The schema, parser, prompt/manifest text, service input, ledger review record, and tests currently preserve the ambiguous `message` name.

## Intended Change

Separate task-delegation display notification content from runtime/model message content, tighten runtime/model content to remove non-actionable internals, and rename `review_task_result.message` to canonical `review_task_result.comment` with no accepted `message` alias.

The target behavior is:

- Visible `SYSTEM_TASK_NOTIFICATION.content` is concise, natural, and task/review focused, not sender/receiver-message focused and not target-kind focused. Agent-target and team-target activations use the same visible template.
- Runtime/model input remains actionable, but avoids internal ids unless the recipient needs that field for a supported action.
- Task-delegation metadata/events/tool results still retain internal identifiers required for routing, correlation, diagnostics, warnings, and status projection.
- `review_task_result` free-text uses `comment` everywhere in the model-facing tool boundary and task-review domain model.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change + small boundary refactor
- Current design issue found (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue; secondary Shared Structure Looseness for `review_task_result.message`
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes
- Evidence:
  - `task-delegation-system-message-visibility.ts` projects visible content directly from `message.content`.
  - `task-delegation-work-packet-renderer.ts` and `task-delegation-notification-dispatcher.ts` mix task/review content with run ids, execution kind, submission/review ids, and tool protocol details.
  - `task-delegation-tool-parameter-schemas.ts`, `task-delegation-tool-input-parsers.ts`, `task-delegation-tool-manifest.ts`, `member-run-instruction-composer.ts`, `task-delegation-service.ts`, `task-delegation-ledger.ts`, and `task-delegation-record.ts` all model review free text as `message`.
- Design response:
  - Add a task-delegation-owned visible notification renderer.
  - Add explicit task-delegation display content metadata and use it when creating local `SYSTEM_TASK_NOTIFICATION` events.
  - Keep task lifecycle/routing owners unchanged.
  - Rename review free text to `comment` across the model-facing boundary and review domain structures.
- Refactor rationale:
  - A copy-only edit would either remove needed model instructions or keep internal text visible. A boundary split is required.
  - Keeping `message` as an alias would preserve the same semantic ambiguity the user identified.
- Intentional deferrals and residual risk, if any:
  - No structured frontend notification payload is introduced; `content` stays text. If product later wants rich notification cards, that is a separate UI/API design.

## Terminology

- `Runtime/model content`: the `AgentInputUserMessage.content` delivered to the agent/team runtime so the model can act.
- `Visible notification content`: the text emitted as `SYSTEM_TASK_NOTIFICATION.payload.content` for transcript rendering.
- `Review comment`: the optional/free-text task-result feedback on `review_task_result`, required for revision requests and optional for acceptance. It is about the task result itself, not an ordinary message to another agent.
- `Execution identity`: task-agent/task-team run ids and instance ids used by backend routing/correlation, not normally useful in agent-facing copy.

## Design Reading Order

1. Follow the task-delegation lifecycle spine.
2. Separate display notification rendering from runtime/model content rendering.
3. Rename the review free-text boundary from `message` to `comment`.
4. Update file responsibilities and tests without changing lifecycle routing.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove `message` from the accepted `review_task_result` model-facing schema, parser, examples, runtime instructions, and review input type. Do not retain `message` as a compatibility alias.
- Treat removal as first-class design work: remove visible notification dependence on raw `message.content` for task-delegation constructors by stamping explicit display content.
- Decision rule: the implementation must not support dual `message`/`comment` review arguments in steady state.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | `delegate_task` tool call | Visible activation system notification in target conversation | `TaskDelegationService` with activation owned by `TaskDelegationActivationCoordinator` | Covers individual-agent and team-target task activation copy. |
| DS-002 | Primary End-to-End | `submit_task_result` tool call | Visible result-submitted notification in delegator conversation | `TaskDelegationService` with notification delivery owned by `TaskDelegationNotificationDispatcher` | Covers the review prompt shown to the original delegator. |
| DS-003 | Primary End-to-End | `review_task_result` tool call with `decision="request_revision"` | Visible revision-request notification in task execution target conversation | `TaskDelegationService` with notification delivery owned by `TaskDelegationNotificationDispatcher` | Covers reviewer feedback delivery back to the worker/team. |
| DS-004 | Primary End-to-End | Model-facing `review_task_result` schema/prompt | Ledger review record and tool result | `TaskDelegationToolService` boundary + `TaskDelegationService` | Covers the `message` to `comment` rename. |
| DS-005 | Return-Event | Accepted stamped system message | WebSocket `SYSTEM_TASK_NOTIFICATION` payload | `task-delegation-system-message-visibility.ts` helper under task-delegation subsystem | The exact point where display content is selected. |
| DS-006 | Bounded Local | Mixed member accepted input handling | Runtime post + one local event, no member-input echo | `MixedAgentMemberHandle` | Protects no-duplicate transcript behavior. |

## Primary Execution Spine(s)

- DS-001: `delegate_task -> TaskDelegationToolService -> TaskDelegationService -> TaskDelegationActivationCoordinator -> Runtime Work Packet + Visible Notification Renderer -> MixedAgentMemberHandle -> SYSTEM_TASK_NOTIFICATION`
- DS-002: `submit_task_result -> TaskDelegationToolService -> TaskDelegationService -> Ledger Submission -> TaskDelegationNotificationDispatcher -> Runtime Review Notice + Visible Notification Renderer -> SYSTEM_TASK_NOTIFICATION`
- DS-003: `review_task_result(comment) -> TaskDelegationToolService -> TaskDelegationService -> Ledger Review -> TaskDelegationNotificationDispatcher -> Runtime Revision Notice + Visible Notification Renderer -> SYSTEM_TASK_NOTIFICATION`
- DS-004: `Tool Manifest/Schema -> Strict Parser -> ReviewTaskResultInput.comment -> TaskDelegationService.reviewTaskResult -> TaskDelegationLedger.reviewResult -> TaskResultReview.comment`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | A delegator calls `delegate_task`; the service creates/binds a record, activation starts a task-agent or task-team run, and a stamped system input carries both actionable model content and separate task-centered visible content metadata. The mixed member boundary emits only the visible task content as `SYSTEM_TASK_NOTIFICATION`, without sender/delegator framing and without member/team target-kind framing. | Tool call, task record, activation coordinator, execution target, system notification | `TaskDelegationService` | Display renderer, metadata stamping, no-duplicate projection |
| DS-002 | A worker/team submits a result; the ledger records it and dispatcher notifies the delegator with actionable review instructions plus a clean display summary of the result. | Tool call, ledger submission, dispatcher, delegator target | `TaskDelegationService` | Display renderer, routing target resolution, warning outcome |
| DS-003 | A delegator requests revision using `comment`; the ledger records the review and dispatcher notifies the task execution target with actionable revision instructions plus a clean visible summary. | Tool call, ledger review, dispatcher, task execution target | `TaskDelegationService` | Display renderer, target resolution, warning outcome |
| DS-004 | The model-facing schema accepts `comment`, strict parsing rejects `message`, service normalizes `comment`, and ledger records review comments under review-domain names. | Schema, parser, service, ledger, review record | `TaskDelegationToolService` at boundary, `TaskDelegationService` for lifecycle | Manifest/prompt docs, tests, event payload names |
| DS-005 | The task-delegation projection helper reads the display-content metadata from a stamped message and emits that as the local event payload; if no display content exists, it falls back to message content only as a defensive default. | Stamped message, metadata reader, local event | Task-delegation visibility helper | Sender id normalization |

## Spine Actors / Main-Line Nodes

- Task-delegation tool boundary (`TaskDelegationToolService`, schemas, parsers, manifest)
- Task lifecycle owner (`TaskDelegationService`)
- Activation owner (`TaskDelegationActivationCoordinator`)
- Work-packet renderer (`TaskDelegationWorkPacketRenderer`)
- Follow-up notification dispatcher (`TaskDelegationNotificationDispatcher`)
- New visible notification renderer (`TaskDelegationVisibleNotificationRenderer`)
- Task-delegation system message visibility helper (`task-delegation-system-message-visibility.ts`)
- Mixed leaf projection boundary (`MixedAgentMemberHandle`)

## Ownership Map

| Node | Owns |
| --- | --- |
| `TaskDelegationToolService` + tool schema/parser/manifest files | Model-facing tool contract, strict input shape, and user/model prompt descriptions. |
| `TaskDelegationService` | Lifecycle sequencing, authorization, ledger transitions, event publication trigger points, and normalization of review comments. |
| `TaskDelegationActivationCoordinator` | Binding execution identity, starting task-agent/task-team instances, and constructing stamped activation messages. |
| `TaskDelegationWorkPacketRenderer` | Actionable runtime/model work-packet text only; not visible transcript copy. |
| `TaskDelegationNotificationDispatcher` | Routing lifecycle follow-up system inputs and delivery outcomes; it may render actionable runtime notices but must not own display copy. |
| `TaskDelegationVisibleNotificationRenderer` | Human/agent-facing task-delegation system notification text for activation, result-submitted, and revision-requested cases. |
| `task-delegation-system-message-visibility.ts` | Task-delegation system message stamping, display-content metadata key, detection, and local event payload projection. |
| `MixedAgentMemberHandle` | Runtime post and no-duplicate local projection decision; it must not compose task-delegation copy. |

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `DelegateTaskTool`, `SubmitTaskResultTool`, `ReviewTaskResultTool` | `TaskDelegationToolService` and manifest entries | Native AutoByteus tool wrappers | Copy policy, lifecycle state, display rendering |
| Frontend `SystemTaskNotificationSegment` | Backend `SYSTEM_TASK_NOTIFICATION` payload | Visual rendering of backend-provided content | Task-delegation wording or internal-field filtering |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Accepted `review_task_result.message` argument | Ambiguous with ordinary inter-agent messaging | `review_task_result.comment` in schema/parser/service/domain | In This Change | Strict parser should reject `message` as unrecognized. |
| `ReviewTaskResultInput.message` | Review text is a comment, not message delivery | `ReviewTaskResultInput.comment` | In This Change | Update service and tests. |
| `TaskResultReview.message` and ledger review `message` input | Domain review record should match review terminology | `TaskResultReview.comment` and ledger `comment` input | In This Change | Update renderer/dispatcher/event payload mapping. |
| `acceptanceMessage` task-delegation status field | Acceptance free text is a review comment | `acceptanceComment` | In This Change | Update status payload/tests/docs if present. |
| Visible notification dependence on `message.content` for new task-delegation messages | Runtime content is not display content | Display-content metadata rendered by `TaskDelegationVisibleNotificationRenderer` | In This Change | Projection helper may retain fallback for defensive/manual messages only. |
| Execution/run/submission/review ids in visible text | Internal/debug metadata not useful to agents | Metadata/events/tool results | In This Change | Task ID remains visible. |

## Return Or Event Spine(s) (If Applicable)

- `AgentInputUserMessage` accepted by mixed member → `buildTaskDelegationSystemTaskNotificationEvent(...)` → `AgentRunEventType.SYSTEM_TASK_NOTIFICATION` → `AgentRunEventMessageMapper` / `convertTeamRunEventToServerMessage` → WebSocket `SYSTEM_TASK_NOTIFICATION` → frontend segment.
- Ledger transition → `TaskDelegationEventPublisher` → `TASK_DELEGATION_EVENT` remains unchanged except for renamed review/acceptance comment fields where review payload/status payload includes the reviewer free text.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `MixedAgentMemberHandle`
- Chain: `postMessage(stamped system input) -> run.postUserMessage(...) -> if accepted and stamped emit local SYSTEM_TASK_NOTIFICATION -> skip MEMBER_INPUT echo -> notify status`
- Why it matters: this is the no-duplicate projection loop. The implementation changes the local event content source, not the duplication rule.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Visible notification text rendering | DS-001, DS-002, DS-003, DS-005 | Task-delegation lifecycle owner | Compose concise task-centered task/review display text without sender/receiver framing and without agent/team target-kind framing | Keeps UI copy out of runtime packet renderers and frontend | Runtime content and UI display remain coupled, or ordinary-message/target-kind framing leaks into task workflows. |
| Metadata stamping and display content selection | DS-005 | Task-delegation visibility helper | Mark messages, store display content, build local event payload | One canonical projection boundary | Scattered metadata reads across mixed backends. |
| Tool schema/comment rename and descriptions | DS-004 | Tool boundary | Define canonical model-facing argument names and task-centered field descriptions | Removes ambiguity with `send_message_to` and ordinary messages | Dual alias behavior or prompt/schema mismatch. |
| Delivery outcome warnings | DS-002, DS-003 | Notification dispatcher | Preserve non-transactional delivery warnings | Lifecycle state must not roll back on notification failure | Warnings leak into display copy or disappear. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Task lifecycle | `agent-team-execution/task-delegation` | Reuse | Existing owner is correct. | N/A |
| Display notification copy for task delegation | `agent-team-execution/task-delegation` | Create New file inside existing subsystem | No current file owns display copy separately. | Frontend pass-through and runtime packet renderers are wrong owners. |
| System notification event projection | `task-delegation-system-message-visibility.ts` | Extend | Existing helper already owns stamping/detection/local event projection. | N/A |
| Generic inter-agent message rendering | `inter-agent-message-runtime-builders.ts` | Do Not Reuse | Conceptual precedent only; subject and fields differ. | Task delegation needs task/review-specific wording. |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-team-execution/task-delegation` | Lifecycle, ledger, activation, follow-up notifications, visible task-delegation display copy | DS-001..DS-005 | `TaskDelegationService` | Extend | Add one focused display renderer. |
| `agent-tools/task-delegation` | Model-facing tool schemas, parsers, manifest text, wrappers | DS-004 | `TaskDelegationToolService` | Extend | Rename review `message` to `comment`. |
| `autobyteus-web` agent streaming | Pass-through display of notification payload content | DS-005 | Backend stream payload | Reuse unchanged | No frontend copy filtering. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `task-delegation-visible-notification-renderer.ts` | Task delegation | Visible notification renderer | Compose display text for activation/result/revision | One coherent copy boundary for this subsystem | Uses task record/submission/review types |
| `task-delegation-system-message-visibility.ts` | Task delegation | System message projection helper | Metadata keys and event payload selection | Existing stamping/projection owner | Uses display content string from metadata |
| `task-delegation-work-packet-renderer.ts` | Task delegation | Runtime work packet renderer | Actionable task execution packet | Existing model-content owner | No |
| `task-delegation-notification-dispatcher.ts` | Task delegation | Follow-up delivery dispatcher | Route and send result/revision system inputs; stamp display content | Existing delivery owner | Uses visible renderer |
| `task-delegation-record.ts` | Task delegation | Domain types | Rename review message/comment fields | Existing type owner | N/A |
| `task-delegation-ledger.ts` | Task delegation | Ledger state transitions | Store review comments and acceptance comments | Existing ledger owner | N/A |
| `task-delegation-tool-*` files | Agent tools | Tool contract boundary | Rename review argument in schema/parser/manifest | Existing model-facing boundary | N/A |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Reference-file bullet rendering | Local helper in visible renderer, local helper in runtime renderers | Each renderer file | Formatting is small and context-specific | Yes | Yes | Global formatting utility without owner |
| Display content metadata key/read logic | `task-delegation-system-message-visibility.ts` | Task delegation | One projection helper reads/writes same key | Yes | Yes | Frontend heuristic |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `ReviewTaskResultInput` | Yes after rename | Yes | Low | Use `comment`, remove `message`. |
| `TaskResultReview` | Yes after rename | Yes | Low | Use `comment`, update ledger/dispatcher. |
| Status payload acceptance text | Yes after rename | Yes | Medium currently | Rename `acceptanceMessage` to `acceptanceComment`. |
| Task-delegation system message metadata | Yes | Yes | Low | Add single display content field; keep routing fields separate. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-visible-notification-renderer.ts` | Task delegation | Display notification renderer | Render visible activation/result-submitted/revision-requested content | New dedicated copy owner | Task record/submission/review types |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-system-message-visibility.ts` | Task delegation | Stamping/projection helper | Add display-content metadata key and event content selection | Existing projection owner | N/A |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-activation-coordinator.ts` | Task delegation | Activation owner | Stamp activation messages with display content | Activation already builds stamped system message | Visible renderer |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-notification-dispatcher.ts` | Task delegation | Follow-up notification delivery | Stamp result/revision messages with display content; simplify model-facing notices | Existing routing/delivery owner | Visible renderer |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-work-packet-renderer.ts` | Task delegation | Runtime work packet renderer | Remove non-actionable execution ids; keep task/action instructions | Existing runtime content owner | No |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-record.ts` | Task delegation | Domain type owner | Rename review/acceptance free-text fields to comments | Existing type owner | N/A |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-ledger.ts` | Task delegation | Ledger owner | Store review/acceptance comments | Existing state transition owner | N/A |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-event-publisher.ts` | Task delegation | Event payload projector | Emit renamed acceptance/review comment fields where applicable | Existing payload mapping owner | N/A |
| `autobyteus-server-ts/src/agent-tools/task-delegation/task-delegation-tool-parameter-schemas.ts` | Agent tools | Tool schema | Rename review parameter `message` to `comment` | Existing schema owner | N/A |
| `autobyteus-server-ts/src/agent-tools/task-delegation/task-delegation-tool-input-parsers.ts` | Agent tools | Strict parser | Parse/reject review input shape | Existing parser owner | N/A |
| `autobyteus-server-ts/src/agent-tools/task-delegation/task-delegation-tool-manifest.ts` | Agent tools | Manifest prompt contract | Update review descriptions/examples | Existing manifest owner | N/A |
| `autobyteus-server-ts/src/agent-team-execution/services/member-run-instruction-composer.ts` | Team runtime instructions | Member/team prompt composer | Update review instruction wording to `comment` | Existing runtime prompt owner | N/A |
| Tests under `autobyteus-server-ts/tests/...` | Durable coverage | Unit/integration/e2e coverage | Protect display copy, comment schema, no-duplicate behavior | Existing coverage locations | N/A |

## Ownership Boundaries

- `TaskDelegationService` remains the authoritative lifecycle boundary. No caller should bypass it to mutate review/submission state.
- `TaskDelegationVisibleNotificationRenderer` owns only display text. It must not choose routing targets, mutate records, or create `AgentInputUserMessage` objects.
- `TaskDelegationWorkPacketRenderer` owns only runtime/model task packet text. It must not own visible transcript copy.
- `TaskDelegationNotificationDispatcher` owns delivery and delivery outcome handling. It may call runtime-content render methods and visible renderer, but it must not duplicate display copy policy inline.
- Frontend remains a renderer of backend payloads, not a task-delegation copy policy owner.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `TaskDelegationService` | Ledger, publisher, activation coordinator, notification dispatcher | Tool service | Tool wrappers directly calling ledger/dispatcher | Add service methods, not bypasses |
| `task-delegation-system-message-visibility.ts` | Metadata keys and event payload projection | Mixed member handles | Mixed backend reading ad hoc metadata keys and composing content | Add helper functions/constants |
| `TaskDelegationVisibleNotificationRenderer` | Display copy templates | Activation coordinator, notification dispatcher | Frontend or dispatcher duplicating task display copy | Add renderer method/variant |
| `TaskDelegationToolService` | Tool run routing and service lookup | Tool wrappers/MCP adapters | Tool wrappers parsing old/new args separately | Update canonical schema/parser |

## Dependency Rules

Allowed:

- Activation coordinator and notification dispatcher may depend on `TaskDelegationVisibleNotificationRenderer`.
- Task-delegation visibility helper may read metadata from `AgentInputUserMessage` and emit `AgentRunEvent` payloads.
- Tool manifest/schema/parser files may depend on task-delegation domain types.
- Frontend may depend on stream payload `content` only.

Forbidden:

- Frontend must not special-case task-delegation content to hide backend internals.
- `MixedAgentMemberHandle` must not compose task-delegation display copy itself.
- `review_task_result` parser must not accept both `message` and `comment`.
- Visible notification renderer must not use execution run ids, task-team instance ids, submission ids, or review ids in display copy.
- Runtime packet/notice renderers must not include internal identifiers unless the receiving model needs them to perform a supported action.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `review_task_result` | Task result review | Review latest pending submission | `{ task_id, decision, comment?, reference_files? }` | `comment` required for `request_revision`, optional for `accept`; no `message`. |
| `submit_task_result` | Task result submission | Submit reviewable task result | `{ message, reference_files? }` | Keep `message`; this is submitted result content, not review comment. |
| `delegate_task` | Task delegation activation | Create one ready task for target | `{ target: { kind, name }, description, reference_files? }` | Unchanged. |
| `markTaskDelegationSystemTaskNotificationMetadata` | Task-delegation system input | Stamp metadata and optional display content | metadata object + display content option | Should expose an explicit option or helper for display content. |
| `buildTaskDelegationSystemTaskNotificationEvent` | Visible local event | Build `SYSTEM_TASK_NOTIFICATION` payload | run id + stamped message | Uses display content metadata first. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `review_task_result` | Yes after rename | Yes | Low | Rename `message` to `comment`; strict parser. |
| `delegate_task` | Yes | Yes | Low | No change. |
| Display metadata field | Yes | N/A | Low | Single canonical key. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Review free text | Current `message`; proposed `comment` | Yes after rename | High currently | Rename across tool/domain/prompt surfaces. |
| Visible notification renderer | `TaskDelegationVisibleNotificationRenderer` | Yes | Low | Add file/class. |
| Runtime work packet renderer | `TaskDelegationWorkPacketRenderer` | Yes | Low | Keep, but remove non-actionable internals. |
| Acceptance free text | Current `acceptanceMessage`; proposed `acceptanceComment` | Yes after rename | Medium currently | Rename in record/status payload. |

## Applied Patterns (If Any)

- Renderer pattern inside task-delegation owner: one renderer for runtime work packets, one renderer for visible notifications. This is a local separation of concerns, not a new subsystem.
- Adapter/projection helper: `task-delegation-system-message-visibility.ts` adapts stamped runtime input metadata into local stream events.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/` | Folder | Task delegation subsystem | Lifecycle, rendering, event projection helpers | Existing correct owner | Frontend rendering code |
| `.../task-delegation-visible-notification-renderer.ts` | File | Display copy owner | Natural visible task/review notification text | Task-specific display content belongs with task lifecycle | Routing, ledger mutation, tool schema |
| `.../task-delegation-system-message-visibility.ts` | File | Projection helper | Metadata key and event content selection | Existing visibility helper | Copy templates beyond selecting display content |
| `.../task-delegation-work-packet-renderer.ts` | File | Runtime packet renderer | Actionable model instructions | Existing runtime packet owner | Visible UI notification copy |
| `autobyteus-server-ts/src/agent-tools/task-delegation/` | Folder | Task-delegation tool boundary | Schema/parser/manifest rename | Existing tool boundary | Lifecycle copy rendering |
| `autobyteus-web/services/agentStreaming/...` | Files | Frontend stream handling | No functional change expected | Pass-through remains correct | Task-delegation filtering heuristics |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `agent-team-execution/task-delegation` | Mixed Justified | Yes | Low | Existing compact subsystem for lifecycle and immediate helpers. |
| `agent-tools/task-delegation` | Transport/tool boundary | Yes | Low | Existing tool contract files. |
| `autobyteus-web/services/agentStreaming` | Transport/client stream handling | Yes | Low | No copy ownership added. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Activation visible content | `You have a new task.\n\nTask ID: task_0001\nTask: Draft the implementation note.\n\nReference files:\n- /tmp/source.md` | `New delegated team task.`, `Accountable team: DesignTeam`, `You received a delegated task from Coordinator...`, or `You have been activated as task agent target_agent_run_id=...` | Shows one uniform task-centered display copy for agent and team targets without sender, target-kind, or internal runtime details. |
| Result-submitted visible content | `A task result is ready for review.\n\nTask ID: task_0001\nSubmitted result:\nImplemented the requested work.` | `Worker submitted...` or `Submission ID: ... Execution kind: task_agent ...` | Reviewers care about task/result, not sender framing or backend correlation ids. |
| Revision-request visible content | `This task needs revision.\n\nTask ID: task_0001\nReview comment:\nPlease add tests.` | `Coordinator requested...` or `Review ID: ... Reviewed submission ID: ... Execution kind: ...` | Worker/team needs task feedback, not reviewer framing or ledger ids. |
| Tool field descriptions | `description: Complete task details: objective, context, constraints, done conditions, expected output, and reference guidance.` / `comment: Task-result review comment. Required when requesting revision; optional acceptance feedback.` | `message: Message to send to the task receiver.` | Prevents prompt/schema wording from reintroducing sender/receiver mental model. |
| Review tool input | `review_task_result({ task_id: "task_0001", decision: "request_revision", comment: "Please add tests." })` | `review_task_result({ ..., message: "Please add tests." })` | `comment` avoids confusion with `send_message_to`. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Accept both `message` and `comment` for `review_task_result` | Could avoid breaking old prompts/tests | Rejected | Strict schema accepts `comment` only; update prompts/tests/docs. |
| Frontend hides internal fields from raw content | Quick UI-only fix | Rejected | Backend emits correct visible content. |
| Keep raw runtime `message.content` as display source for all task-delegation messages | Simpler implementation | Rejected | New task-delegation messages stamp display content; projection helper uses it. |
| Continue displaying submission/review ids in visible copy | Existing content includes them | Rejected | Keep ids in metadata/events/tool results only. |

## Derived Layering (If Useful)

- Tool boundary: `agent-tools/task-delegation/*`
- Lifecycle/domain boundary: `agent-team-execution/task-delegation/*`
- Runtime delivery/projection boundary: `TeamRun` / `MixedAgentMemberHandle` / `task-delegation-system-message-visibility.ts`
- Client display boundary: frontend segment rendering of backend payload content

Layering follows ownership: frontend does not bypass backend notification ownership; tool wrappers do not bypass lifecycle owner.

## Migration / Refactor Sequence

1. Add `TaskDelegationVisibleNotificationRenderer` with methods for activation, result submitted, and revision requested.
2. Extend `task-delegation-system-message-visibility.ts`:
   - add display-content metadata key,
   - normalize/read display content,
   - update `markTaskDelegationSystemTaskNotificationMetadata(...)` to accept display content,
   - update `buildTaskDelegationSystemTaskNotificationEvent(...)` to prefer display content and fall back to `message.content` only defensively.
3. Update activation coordinator to instantiate/use visible renderer and stamp activation messages with display content.
4. Simplify `TaskDelegationWorkPacketRenderer` runtime content by removing non-actionable execution/run/ingress identifiers while retaining task id, delegator, description, reference files, and necessary lifecycle tool guidance.
5. Update notification dispatcher:
   - use visible renderer for display metadata,
   - simplify runtime result/revision notices by removing submission id, review id, execution kind, and execution run ids,
   - keep task id and necessary action guidance.
6. Rename review free text:
   - `ReviewTaskResultInput.message` -> `comment`,
   - ledger `reviewResult` input `message` -> `comment`,
   - `TaskResultReview.message` -> `comment`,
   - `acceptanceMessage` -> `acceptanceComment` where the record/status payload represents review acceptance free text,
   - update service normalization and error messages.
7. Update tool schemas, parser validation, manifest descriptions, runtime instruction composer, and E2E prompt strings to use `comment`. Update tool parameter descriptions for `delegate_task.description` and `review_task_result.comment` so they describe task-centered content, not ordinary messages.
8. Update tests:
   - system visibility projection override/fallback,
   - task-delegation service member/team activation display content,
   - result/revision visible content lacks internal fields,
   - parser rejects `message` and accepts `comment`,
   - no-duplicate projection still passes,
   - existing lifecycle routing/warning tests still pass.
9. Update docs that describe `review_task_result` and system task notification surfaces.
10. Run targeted server tests and typecheck; broader API/E2E coverage investigation will decide live E2E execution scope downstream.

## Key Tradeoffs

- Text display content remains a single string instead of introducing structured notification cards. This keeps the change backend-local and matches existing frontend contract.
- The projection helper keeps a fallback to `message.content` for defensive safety. This is not a compatibility path for new task-delegation constructors; all in-scope constructors must provide display content.
- Runtime/model content may still mention `submit_task_result` / `review_task_result` where the model needs to act, but visible content must not include protocol examples, target-kind labels, or internal ids.

## Risks

- Renaming `message` to `comment` is intentionally breaking for model-facing tool calls and tests; all prompts/E2E instructions must be updated together.
- If external consumers depend on `acceptanceMessage` websocket payload fields, renaming to `acceptanceComment` may require coordinated test/doc updates. This is still preferred to avoid preserving the ambiguous review-message naming.
- Display wording may need product tone iteration, but the renderer boundary makes it localized.

## Guidance For Implementation

- Keep routing and ledger state-transition behavior unchanged except for field names.
- Do not add frontend heuristics for task-delegation notifications.
- Do not include sender/delegator/reviewer names by default in receiver-facing visible display strings. Do not include target-kind labels such as `team task`, `Accountable team`, or `Logical member`. Do not include `submissionId`, `reviewId`, `executionKind`, `taskAgentRunId`, `taskTeamRunId`, or `taskTeamInstanceId` in visible display strings.
- Keep `taskId` visible in activation/result/revision notifications.
- Keep internal ids in metadata/events/tool results where current code needs them for correlation, warnings, or status projection.
- Prefer test assertions that verify both positive useful content and negative internal-detail absence.
