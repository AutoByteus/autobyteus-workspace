# Design Spec

## Current-State Read

The current team send path already finalizes uploaded context files and delivers them to the selected backend runtime. The user-provided member memory trace confirms the runtime recorded `media.images` with final `/rest/team-runs/.../context-files/...` locators.

The frontend-visible loss happens after local submission:

1. `agentTeamRunStore.sendMessageToFocusedMember` creates a local user message via `beginLocalUserSubmission` with the draft attachments, finalizes the draft files, assigns `messageId` and `dedupeKey`, and updates that local message with finalized `contextFilePaths`.
2. The backend team stream handler converts the send payload into an `AgentInputUserMessage` with `ContextFile[]`; this is delivered to the runtime successfully.
3. After acceptance, `MixedAgentMemberHandle.publishMemberInput` publishes a team `MEMBER_INPUT` event.
4. `team-member-input-event-builder.ts` attempts to derive event `contextFilePaths` from `AgentInputUserMessage.contextFiles`, but it calls `ContextFile.toDict()` and then looks for `path`, `locator`, or `file_path`; the canonical dict actually contains `uri`, `file_type`, `file_name`, and `metadata`. Result: the echo has an empty `context_file_paths` array.
5. `externalUserMessageHandler.ts` sees matching `message_id`/`dedupe_key` and replaces the local user message fields with the lower-fidelity server echo, including empty `contextFilePaths`.
6. `UserMessage.vue` renders attachments only from `message.contextFilePaths`, so the preview disappears.

Independent-agent sends keep working because they share the local submitted-message mechanism but do not receive this team member-input echo that overwrites the sent message.

A secondary current-state gap exists in historical hydration: `runProjectionConversation.ts` sets projected user messages to `contextFilePaths: []` even when the projection entry contains user `media` references.

## Intended Change

Make team sent context-file visibility durable across the live echo and historical hydration boundaries by:

1. Separating the internal team/member user-input echo concept from true external-channel user messages. A laptop/frontend send should not be modeled as `EXTERNAL_USER_MESSAGE`.
2. Correcting backend team member-input event context-file normalization to preserve canonical `ContextFile` references (`uri`/`file_type`) when building user-input echo payloads.
3. Hardening frontend user-input echo reconciliation so a deduped echo with absent/empty attachment metadata cannot erase an existing local message's non-empty finalized attachments.
4. Hydrating user-message `media` references from run projections into `UserMessage.contextFilePaths` where the projection contains displayable media/context locators.

## Refactoring Design Decision: Internal Member Input Is Not External User Input

The target protocol must separate two subjects:

| Subject | Source | Target Server Message Type | Frontend Handler | Notes |
| --- | --- | --- | --- | --- |
| Internal team/member accepted input echo | Frontend laptop send, team communication delivery, task packet delivery, or other team-owned member input | `MEMBER_INPUT_MESSAGE` | `handleMemberInputMessage` | This is the in-scope team echo path and must carry context-file refs. |
| True external-channel user message | Backend-supported external channels such as messaging integrations | `EXTERNAL_USER_MESSAGE` | `handleExternalUserMessage` | This remains external-channel-specific. |

`MEMBER_INPUT_MESSAGE` may reuse the same payload fields as the old team echo (`content`, `received_at`, `message_id`, `dedupe_key`, `context_file_paths`, member route identity), but it must be a distinct websocket type and frontend dispatch branch. Do not emit both `MEMBER_INPUT_MESSAGE` and `EXTERNAL_USER_MESSAGE` for the same internal member input.

Implementation should extract only the reusable low-level projection logic (payload attachment hydration, timestamp parsing, and identity-based upsert) into a neutral helper, for example `userMessageProjection.ts`. The semantic handlers stay separate:

- `memberInputMessageHandler.ts` owns internal member-input echo reconciliation.
- `externalUserMessageHandler.ts` owns true external-channel user messages.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix
- Current design issue found (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue plus Shared Structure Looseness plus Missing Invariant
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes, targeted only
- Evidence: `ContextFile.toDict()` emits `uri`/`file_type`; team member-input builder reads `path`/`locator`/`file_path`. Frontend dedupe replacement overwrites richer local `contextFilePaths` with empty incoming echo attachments.
- Design response: Rename/split the internal user-input echo boundary away from external-channel message handling; add/centralize a small context-file event reference normalizer at the backend team event boundary; add a frontend merge invariant at the user-input echo boundary; add projection-media-to-context-attachment hydration.
- Refactor rationale: This is not a broad architecture refactor. The existing owners are correct, but the mapper and merge boundaries must be tightened to avoid parallel loose shapes and lower-fidelity overwrite.
- Intentional deferrals and residual risk, if any: Provider projections that do not contain any user media/context references cannot be retroactively hydrated without broader persistence changes. Exact original display-name propagation through team echoes can be deferred if stored filename inference remains acceptable.

## Terminology

- `ContextFile`: backend domain object from `autobyteus-ts` with canonical serialized fields `uri`, `file_type`, `file_name`, and `metadata`.
- `ContextAttachment`: frontend UI attachment model with `locator`, `type`, `displayName`, and ownership kind.
- `Team member-input echo`: backend `MEMBER_INPUT` event for a specific team member. Target design projects this as an internal `MEMBER_INPUT_MESSAGE` websocket message, not as true external-channel `EXTERNAL_USER_MESSAGE`.

## Design Reading Order

1. Live send/echo data-flow spine.
2. Backend event reference normalization.
3. Frontend echo reconciliation invariant.
4. Historical hydration mapping.
5. Tests and migration sequence.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: Do not add a second frontend field for sent attachments and do not keep old empty-echo behavior. Tighten the existing mapper and merge semantics.
- No obsolete files are expected to be removed; the obsolete behavior is the incomplete context-file field normalization inside `team-member-input-event-builder.ts`.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Team composer send | Runtime receives `AgentInputUserMessage` with `ContextFile[]` | `agentTeamRunStore` + backend `AgentTeamStreamHandler` | Confirms backend/runtime delivery is not the broken segment. |
| DS-002 | Return-Event | Accepted team member input | Frontend member conversation reconciles internal `MEMBER_INPUT_MESSAGE` | Backend team member-input event builder + frontend member-input message handler | This is where sent attachments are currently dropped and where the boundary is currently mislabeled as external. |
| DS-003 | Primary End-to-End | Historical run projection | UI conversation user message with context attachment previews | Run projection/hydration services | Ensures reload/reconnect does not lose available user media references. |

## Primary Execution Spine(s)

- DS-001: `Team Composer -> agentTeamRunStore local submission/finalization -> TeamStreamingService SEND_MESSAGE -> AgentTeamStreamHandler -> TeamRun/MixedAgentMemberHandle -> Runtime AgentInputUserMessage`
- DS-002: `MixedAgentMemberHandle accepted input -> TeamMemberInputEventBuilder -> TeamMemberInputMessagePayload -> TeamStreamingService dispatch -> user-input echo handler -> UserMessage.vue`
- DS-003: `Agent memory raw traces/projection -> runProjectionConversation hydration -> UserMessage.contextFilePaths -> UserMessage.vue`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The frontend finalizes files and sends message content plus context locators to the team backend. Backend converts them into `ContextFile[]` and sends to runtime. | Team composer, team run store, team stream handler, team member handle, runtime message | Send orchestration remains split correctly between frontend store and backend stream handler. | Context file finalization; attachment partition into text/media payloads. |
| DS-002 | Runtime acceptance triggers a team member-input echo. The echo must carry equivalent context-file refs and the frontend must reconcile it without losing local sent metadata. | Team member handle, event builder, websocket payload builder, frontend member-input message handler, user message renderer | Event builder owns backend shape conversion; handler owns UI message reconciliation. | Context-file reference normalization; dedupe identity matching. |
| DS-003 | Historical projection builds user messages from raw traces. If user media exists, hydration must create UI context attachments from it. | Projection entry, hydration mapper, user message renderer | Hydration mapper owns projection-to-UI shape conversion. | Media-to-attachment type inference. |

## Spine Actors / Main-Line Nodes

- Team composer / active member context
- `agentTeamRunStore.sendMessageToFocusedMember`
- `AgentTeamStreamHandler.handleSendMessage`
- `MixedAgentMemberHandle.publishMemberInput`
- `buildTeamMemberInputEventPayload`
- `buildTeamMemberInputMessagePayload`
- `handleMemberInputMessage` / shared user-message projector
- `UserMessage.vue`
- `buildConversationFromProjection`

## Ownership Map

- `agentTeamRunStore`: owns frontend team send sequencing, local optimistic message creation, context-file finalization, message identity generation, and stream send.
- `ContextFileFinalizationService` / upload store: own moving draft files to final run/member ownership. No design change.
- `AgentTeamStreamHandler`: owns websocket command parsing and conversion into backend runtime input. No design change.
- `MixedAgentMemberHandle`: owns publication of accepted member input events after runtime accepts the message. No design change.
- `team-member-input-event-builder.ts`: owns conversion from backend member input domain message into team event payload. Must normalize canonical `ContextFile` references.
- `team-member-input-message-payload.ts`: owns websocket payload naming. It should remain a thin serializer.
- User-input echo handler currently named `externalUserMessageHandler.ts`: owns UI conversation insertion/reconciliation for user-message echoes. It should be renamed or split so true external-channel messages do not share an ambiguous boundary with laptop/frontend sends. Must preserve richer existing context attachments during dedupe.
- `runProjectionConversation.ts`: owns persisted projection-to-UI conversation mapping. Must hydrate available user media into `contextFilePaths`.
- `UserMessage.vue`: owns rendering only; no data-repair logic should be added there.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `TeamStreamingService.sendMessage` | `agentTeamRunStore` send orchestration and backend `AgentTeamStreamHandler` command handling | Websocket transport facade | Context-file normalization policy beyond serialization. |
| `team-member-input-message-payload.ts` | `team-member-input-event-builder.ts` | Converts domain event payload keys to websocket keys | Recovery from missing event context data. |
| `UserMessage.vue` | member-input/external user-message projector / hydration mapper | Renders the already-normalized UI message model | Attachment reconciliation or backend-shape interpretation. |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Incomplete object-field assumption in `readContextFilePath` | It drops canonical `ContextFile.toDict()` objects | A stricter normalizer that accepts `uri`/`file_type` plus existing literal string support | In This Change | This is behavior removal, not file removal. |
| Lower-fidelity overwrite behavior in the internal member-input echo handler | It lets empty server echoes erase local sent attachments | Merge rule that preserves existing non-empty attachments when incoming echo has none | In This Change | This is an invariant, not a compatibility fallback. |
| `TeamRunEventSourceType.MEMBER_INPUT -> EXTERNAL_USER_MESSAGE` mapping | It conflates laptop/team sends with true external-channel user messages | `TeamRunEventSourceType.MEMBER_INPUT -> MEMBER_INPUT_MESSAGE` plus a member-input handler | In This Change | Do not keep a dual emit path for old frontend behavior. |
| User hydration hardcoded `contextFilePaths: []` when `entry.media` exists | It loses persisted user media display | Media-to-context-attachment hydration helper | In This Change if reload AC stays in scope | If projections lack media, no attachment can be generated. |

## Return Or Event Spine(s) (If Applicable)

DS-002 return/event spine:
`Runtime accepted input -> MixedAgentMemberHandle.publishMemberInput -> TeamRun event bus -> AgentTeamStreamHandler.convertTeamEvent -> websocket MEMBER_INPUT_MESSAGE -> TeamStreamingService member dispatch -> handleMemberInputMessage dedupe merge -> UserMessage.vue`

## Bounded Local / Internal Spines (If Applicable)

- `handleMemberInputMessage` reconciliation bounded local spine:
  `Normalize incoming identity -> Hydrate incoming attachments -> Find existing message by messageId/dedupeKey -> Merge preserving richer attachments -> Update conversation`
- `team-member-input-event-builder` normalization bounded local spine:
  `Read message.contextFiles -> Convert ContextFile object/dict/string to event reference -> Normalize path/type -> Filter invalid refs`

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Context-file finalization | DS-001 | `agentTeamRunStore` | Move draft uploads to final run/member locators before send | Ensures runtime sees final references | Putting in renderer would couple UI display to storage. |
| Context-file reference normalization | DS-002 | `team-member-input-event-builder.ts` | Convert backend domain `ContextFile` shapes into event references | Prevents shared-shape mismatch | If hidden in websocket serializer, event payload remains semantically loose. |
| Dedupe reconciliation | DS-002 | `memberInputMessageHandler.ts` / shared user-message projector | Merge server echo with local optimistic message by identity | Prevents duplicates and preserves richer local state | If renderer handles it, message model stays corrupted. |
| Media-to-attachment hydration | DS-003 | `runProjectionConversation.ts` | Convert projection `media` references into UI attachments | Supports reloaded display | If backend-specific code leaks into renderer, UI model fragments. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Frontend locator/type -> `ContextAttachment` | `utils/contextFiles/contextAttachmentModel.ts` | Reuse | `hydrateContextAttachment` already maps locators to uploaded/external/workspace attachments and infers type. | N/A |
| Frontend internal member-input echo handling | `services/agentStreaming/handlers` | Create New / Split | Current `externalUserMessageHandler.ts` is conceptually for true external-channel messages; internal team/member echoes need a distinct handler while reusing a small shared projector. | Existing external handler is not the right authoritative boundary for laptop/team sends. |
| Backend team member input event conversion | `agent-team-execution/services/team-member-input-event-builder.ts` | Extend | It already owns member input event payload construction. | N/A |
| Historical conversation hydration | `services/runHydration/runProjectionConversation.ts` | Extend | It already owns projection-to-UI conversion. | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Backend agent-team execution | Team member input event payload construction | DS-002 | `team-member-input-event-builder.ts` | Extend | Fix canonical context-file shape handling here. |
| Backend agent streaming | Websocket message serialization | DS-002 | `team-member-input-message-payload.ts` | Reuse | Should just serialize event payload. |
| Frontend agent streaming | Live member-input echo reconciliation | DS-002 | `memberInputMessageHandler.ts` plus shared projector | Create New / Split | Add accurately named handler, merge invariant, and tests. |
| Frontend run hydration | Historical projection to conversation | DS-003 | `runProjectionConversation.ts` | Extend | Map user `media` to `contextFilePaths`. |
| Frontend context-file utilities | Attachment model hydration | DS-002, DS-003 | `contextAttachmentModel.ts` | Reuse | Do not duplicate type inference. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-team-execution/services/team-member-input-event-builder.ts` | Backend agent-team execution | Team member input event builder | Normalize `AgentInputUserMessage.contextFiles` into `TeamRunMemberInputContextFile[]` | Existing builder owns payload construction | Reuses `ContextFile.toDict()` shape contract. |
| `autobyteus-web/services/agentStreaming/handlers/memberInputMessageHandler.ts` plus shared projector extracted from `externalUserMessageHandler.ts` | Frontend agent streaming | User-input echo handler | Reconcile live user-message echoes into conversation state without conflating them with true external-channel messages | Existing handler currently owns dedupe merge but is misnamed/overloaded | Reuses `hydrateContextAttachment`. |
| `autobyteus-web/services/runHydration/runProjectionConversation.ts` | Frontend run hydration | Projection conversation mapper | Hydrate user projection media into `contextFilePaths` | Existing mapper owns projection-to-conversation | Reuses `hydrateContextAttachment`. |
| Tests | Respective package tests | Coverage | Lock backend mapping and frontend reconciliation/hydration | Existing test locations already cover nearby behavior | N/A |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Frontend locator -> UI attachment | Existing `contextAttachmentModel.ts` | Frontend context-file utilities | Already shared across upload, streaming, rendering | Yes | Yes | A backend-domain parser. |
| Backend `ContextFile` object/dict/string -> team event ref | Keep local helper in `team-member-input-event-builder.ts` unless reused elsewhere | Backend agent-team execution | Only one backend event boundary currently needs it | Yes | Yes | A catch-all frontend/backend mixed DTO. |
| Projection media -> UI attachments | Local helper in `runProjectionConversation.ts` | Frontend run hydration | Specific to projection entries | Yes | Yes | A second renderer data source. |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `ContextFile.toDict()` | Yes | Yes | Low | Treat `uri`/`file_type` as canonical backend serialized shape. |
| `TeamRunMemberInputContextFile` | Yes after fix | Yes | Medium | Map from canonical backend shape to `{ path, type }`; do not accept ambiguous missing-path objects. |
| `ContextAttachment` | Yes | Yes | Low | Continue feeding renderer via `contextFilePaths`. |
| Projection `media` | Mostly | N/A | Medium | Hydrate to `ContextAttachment` only at UI projection boundary. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-team-execution/services/team-member-input-event-builder.ts` | Backend agent-team execution | Team member input event builder | Add `uri`/`file_type`/`fileType`/`file_name` awareness when converting message context files to event refs; preserve string support. | Existing owner of event payload construction | `ContextFile.toDict()`. |
| `autobyteus-web/services/agentStreaming/handlers/memberInputMessageHandler.ts` | Frontend agent streaming | Internal member-input echo reconciler | Merge deduped member-input echoes without erasing existing non-empty attachments when incoming has none; otherwise use incoming attachments. | New accurately named owner for team/member echoes | Shared user-message projector using `hydrateContextAttachment`. |
| `autobyteus-web/services/agentStreaming/handlers/externalUserMessageHandler.ts` | Frontend agent streaming | True external-channel user-message handler | Continue handling provider/channel-originated external user messages only, delegating shared attachment hydration/upsert logic where useful. | Keeps external-channel semantics separate | Shared user-message projector. |
| `autobyteus-web/services/agentStreaming/protocol/messageTypes.ts` | Frontend protocol | Message type definitions | Add `MEMBER_INPUT_MESSAGE` payload type and keep `EXTERNAL_USER_MESSAGE` for true external channels. | Protocol boundary should encode subject meaning | Shared payload field shape allowed, but names must stay distinct. |
| `autobyteus-server-ts/src/services/agent-streaming/models.ts` and `team-run-event-websocket-message-mapper.ts` | Backend streaming protocol | Server message type and event mapping | Add `MEMBER_INPUT_MESSAGE`; map `TeamRunEventSourceType.MEMBER_INPUT` to it instead of `EXTERNAL_USER_MESSAGE`. | Backend owns websocket event contract | `buildTeamMemberInputMessagePayload`. |
| `autobyteus-web/services/runHydration/runProjectionConversation.ts` | Frontend run hydration | Historical conversation mapper | Convert user `entry.media.images/audio/video` to `contextFilePaths` via `hydrateContextAttachment`. | Existing owner of projection conversation mapping | `hydrateContextAttachment`. |
| `autobyteus-server-ts/tests/unit/...` | Backend tests | Backend mapper coverage | Add focused test for `buildTeamMemberInputEventPayload` with `ContextFile.toDict()` / actual `ContextFile` instances. | Captures root backend failure | N/A |
| `autobyteus-web/services/agentStreaming/...tests...` | Frontend tests | Live merge coverage | Add test where existing local message has attachments and incoming echo has same identity but empty `context_file_paths`; attachments remain. | Captures immediate UI failure | N/A |
| `autobyteus-web/services/runHydration/...tests...` | Frontend tests | Hydration coverage | Add test where user projection `media.images` becomes `contextFilePaths`. | Captures reload gap | N/A |

## Ownership Boundaries

- Backend team event builder is authoritative for team event payload completeness. It must not rely on frontend attachment field names when its input is backend `ContextFile` domain objects.
- Frontend user-input echo handler is authoritative for live conversation reconciliation. It may compare local and incoming message fidelity and preserve richer local state during dedupe. True external-channel user messages should remain a separate conceptual path even if they share a small normalizer.
- Renderer is not authoritative for state repair. It receives `UserMessage.contextFilePaths` and displays them.
- Hydration mapper is authoritative for converting persisted projection data into UI conversation state.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `team-member-input-event-builder.ts` | Context file ref extraction from `AgentInputUserMessage` | `MixedAgentMemberHandle.publishMemberInput` | Serializer or frontend infers lost context refs after builder emitted empty list | Add canonical field handling in builder. |
| `memberInputMessageHandler.ts` | Internal member-input echo dedupe and merge policy | `TeamStreamingService` for `MEMBER_INPUT_MESSAGE` | Renderer tries to restore erased attachments, or internal sends are routed through external-channel handler | Strengthen handler merge semantics and route member input to this boundary. |
| `externalUserMessageHandler.ts` | True external-channel user-message handling | `AgentStreamingService`/`TeamStreamingService` only for provider/channel-originated `EXTERNAL_USER_MESSAGE` | Laptop/team local sends use this external boundary | Keep this boundary for external channels and share only low-level projection helpers. |
| `runProjectionConversation.ts` | Projection-to-UI message conversion | Run/open/hydration stores | Components inspect raw projection media | Add media-to-attachment hydration in mapper. |

## Dependency Rules

Allowed:
- Backend event builder may depend on `AgentInputUserMessage`/`ContextFile` serialized semantics.
- Frontend streaming and hydration may depend on `hydrateContextAttachment` to build `ContextAttachment` objects.
- Renderer may depend only on normalized `UserMessage.contextFilePaths`.

Forbidden:
- Do not make `UserMessage.vue` parse backend `context_file_paths`, raw projection `media`, or `ContextFile` dicts.
- Do not add a second message attachment field parallel to `contextFilePaths`.
- Do not make runtime adapters responsible for frontend sent-file visibility.
- Do not keep an old empty-echo branch as accepted behavior.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `TeamStreamingService.sendMessage(content, targetMemberRouteKey, contextFilePaths, imageUrls, identity)` | Frontend websocket command | Send user input and context locators to target team member | `teamRunId` connection + `targetMemberRouteKey` + `messageId`/`dedupeKey` | No change except tests may cover identity. |
| `AgentTeamStreamHandler.handleSendMessage` | Backend websocket command | Convert send payload to `AgentInputUserMessage` | `target_member_route_key` selector | No change. |
| `buildTeamMemberInputEventPayload` | Team member input event | Convert accepted member input to event payload | `teamRunId`, member route/path/run identity | Add canonical context-file extraction. |
| `handleMemberInputMessage` | Frontend internal member input echo | Insert or merge accepted member input echo into `AgentContext.conversation.messages` | `message_id` and/or `dedupe_key` | New boundary for team/member local sends; add richer-state merge rule. |
| `handleExternalUserMessage` | Frontend true external-channel message | Insert external-channel user message into `AgentContext.conversation.messages` | external provider/account/thread identifiers; optional message identity | Keep for backend-supported external channels, not normal laptop/team sends. |
| `buildConversationFromProjection` | Frontend historical conversation | Convert projection entries to UI messages | `runId`, projection entries | Add user media hydration. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `buildTeamMemberInputEventPayload` | Yes | Yes | Low | Tighten context-file value shape handling. |
| `handleMemberInputMessage` | Yes | Yes | Low | Preserve richer local attachments on matching identity. |
| `handleExternalUserMessage` | Yes | Mostly | Medium | Restrict to true external-channel semantics; share projection helper but not internal-member ownership. |
| `buildConversationFromProjection` | Yes | Yes | Low | Map media only during projection hydration. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Team member input event builder | `team-member-input-event-builder.ts` | Yes | Low | Keep name. |
| Internal member-input message handler | `memberInputMessageHandler.ts` | Yes | Low | Add this name and route team/member echoes here. |
| External user message handler | `externalUserMessageHandler.ts` | Yes only for true external channels | Medium | Keep only for backend-supported external channels; do not route local laptop/team sends here. |
| Context attachment hydration | `hydrateContextAttachment` | Yes | Low | Reuse. |

## Applied Patterns (If Any)

- Adapter/normalizer at backend event boundary: converts backend domain `ContextFile` into team event context-file refs.
- Reconciliation merge at frontend streaming boundary: merges server echo with local optimistic message using stable identities.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-team-execution/services/team-member-input-event-builder.ts` | File | Backend team event construction | Context-file extraction from accepted member input | Existing team execution service | Frontend `ContextAttachment` concepts. |
| `autobyteus-web/services/agentStreaming/handlers/memberInputMessageHandler.ts` | File | Frontend internal member-input projection | Dedupe/merge internal team/member input echoes | Existing streaming handler folder | True external-channel provider/account semantics. |
| `autobyteus-web/services/agentStreaming/handlers/externalUserMessageHandler.ts` | File | Frontend external-channel projection | Handle backend-supported external-channel user messages | Existing streaming handler folder | Internal laptop/team send echo ownership. |
| `autobyteus-web/services/agentStreaming/handlers/userMessageProjection.ts` | File | Shared projection helper | Hydrate context-file payloads, parse timestamps, and upsert user messages by identity | Shared low-level logic for member and external handlers | Protocol routing decisions or semantic ownership. |
| `autobyteus-server-ts/src/services/agent-streaming/team-run-event-websocket-message-mapper.ts` | File | Backend team event websocket mapper | Map `MEMBER_INPUT` events to `MEMBER_INPUT_MESSAGE` | Existing protocol mapping owner | True external-channel mapping. |
| `autobyteus-web/services/runHydration/runProjectionConversation.ts` | File | Frontend history hydration | Convert projection media to user context attachments | Existing hydration service | Live websocket merge policy. |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-team-execution/services` | Main-Line Domain-Control | Yes | Low | Team event building belongs with team execution services. |
| `autobyteus-web/services/agentStreaming/handlers` | Transport-to-UI projection | Yes | Low | Live stream handler owns message projection. |
| `autobyteus-web/services/runHydration` | Persistence/Hydration projection | Yes | Low | Hydration mapper owns historical projection conversion. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Backend context-file normalization | `{ uri: '/rest/team-runs/t/members/m/context-files/x.png', file_type: 'Image' } -> { path: '/rest/team-runs/t/members/m/context-files/x.png', type: 'Image' }` | Dropping object because it lacks `path` | This is the exact root cause. |
| Frontend dedupe merge | Existing local attachments `[final.png]` + incoming echo `[]` -> keep `[final.png]`; incoming echo `[server.png]` -> use incoming | Always spread incoming over existing | Prevents lower-fidelity echo from erasing sent proof. |
| Hydration | User projection `media.images: ['/rest/team-runs/.../x.png']` -> `contextFilePaths: [hydrateContextAttachment(...)]` | `contextFilePaths: []` for every user projection | Keeps reload display aligned with live display. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Add a separate `media` display path to `UserMessage.vue` | Would display historical media without fixing message model | Rejected | Normalize all sent attachments into `UserMessage.contextFilePaths`. |
| Keep backend empty echo and only hide overwrite in frontend | Quick UI-only workaround | Rejected as sole fix | Fix backend event builder and add frontend merge invariant. |
| Keep `MEMBER_INPUT` routed as `EXTERNAL_USER_MESSAGE` and only rename comments | Minimizes protocol edits | Rejected | Add `MEMBER_INPUT_MESSAGE` and route internal team/member input through it. |
| Runtime-specific display behavior | User noted runtimes differ but all receive file | Rejected | Fix runtime-independent frontend/backend event contract. |

## Derived Layering (If Useful)

- Frontend store layer: send sequencing and local optimistic state.
- Backend command layer: websocket command to runtime message.
- Backend event layer: runtime acceptance to member-input event payload.
- Frontend projection layer: live echo/historical projection to conversation message.
- Renderer layer: display normalized message only.

## Migration / Refactor Sequence

1. Protocol/boundary naming: introduce `MEMBER_INPUT_MESSAGE` as the distinct server message type for team/member user-input echoes. Map `TeamRunEventSourceType.MEMBER_INPUT` to `MEMBER_INPUT_MESSAGE`, not `EXTERNAL_USER_MESSAGE`. Keep true external-channel messages on `EXTERNAL_USER_MESSAGE`.
2. Backend context mapping: update `team-member-input-event-builder.ts` context-file extraction to read canonical `ContextFile` object/dict shapes:
   - string -> `{ path: string }`
   - object with `uri` -> `{ path: uri, type: file_type/fileType/type }`
   - object with `path`/`locator`/`file_path` remains supported when already present
   - normalize empty strings out
3. Add backend unit coverage for `buildTeamMemberInputEventPayload` preserving context refs from actual `ContextFile` instances or `toDict()` payloads.
4. Frontend live merge: add `memberInputMessageHandler.ts` and route `MEMBER_INPUT_MESSAGE` to it from `TeamStreamingService`. Extract neutral shared projection/upsert logic from `externalUserMessageHandler.ts` if useful. Existing non-empty `contextFilePaths` must survive when incoming deduped echo has none; incoming non-empty attachments still replace/update local attachments.
5. Add frontend unit coverage for the disappearing case.
6. Frontend hydration: add helper in `runProjectionConversation.ts` to map user `entry.media.images/audio/video` into `contextFilePaths` with types `Image`/`Audio`/`Video`; keep empty array only when no media exists.
7. Add hydration test coverage for user projection media.
8. Run focused frontend/backend test suites.

## Key Tradeoffs

- Backend-only fix would address future team echoes, but frontend merge would still be fragile if any lower-fidelity echo appears. Adding the merge invariant is a small robustness improvement at the correct owner.
- Frontend-only fix would stop immediate disappearance but leave the server event contract wrong. Backend mapping must be corrected.
- Hydration support slightly expands scope but aligns reloaded conversations with live display using already-available projection media.

## Risks

- Historical projections that lack user media cannot display attachments without broader persistence changes.
- If a server echo intentionally needs to remove attachments from an existing local message, the proposed invariant would preserve them when incoming is empty. There is no current use case for attachment removal on a sent user message; incoming non-empty still updates.
- Existing tests with fixtures using `contextFilePaths: []` may need to be updated to include context-file cases rather than assuming empty arrays.

## Guidance For Implementation

- Do not change `ContextFile.toDict()`.
- Prefer small local helper functions with explicit accepted fields over generic `any` shape spreading.
- Keep all renderer changes out of scope unless tests reveal no normalized data reaches it.
- Use focused tests before broad E2E:
  - Backend: `team-member-input-event-builder` context refs from `ContextFile`.
  - Frontend: `handleMemberInputMessage` preserves local attachments on empty deduped echo and `EXTERNAL_USER_MESSAGE` remains reserved for true external-channel messages.
  - Frontend: `buildConversationFromProjection` hydrates user media into `contextFilePaths`.
