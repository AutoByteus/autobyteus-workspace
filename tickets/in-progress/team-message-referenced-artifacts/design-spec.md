# Design Spec

## Current-State Read

The ticket implementation has already moved the product in the right broad direction: message-file references are a team-level artifact projection, and the focused agent can see **Sent Artifacts** and **Received Artifacts** without changing the conversation message renderer.

The remaining design problem is the source of reference intent. Current in-ticket code derives references by scanning `INTER_AGENT_MESSAGE.payload.content` with `MessageFileReferenceProcessor -> extractMessageFileReferencePathCandidates`. That makes natural prose an implicit file-sharing API. It also creates noisy rows whenever a handoff message mentions upstream context files, logs, or paths that are useful to read but were not intentionally declared as the shared artifact list.

Current relevant boundaries:

- Public send-message schemas:
  - `autobyteus-server-ts/src/agent-execution/backends/codex/team-communication/codex-send-message-tool-spec-builder.ts`
  - `autobyteus-server-ts/src/agent-execution/backends/claude/team-communication/claude-send-message-tool-definition-builder.ts`
  - `autobyteus-ts/src/agent/message/send-message-to.ts`
- Shared server parser/delivery boundary:
  - `autobyteus-server-ts/src/agent-team-execution/services/send-message-to-tool-argument-parser.ts`
  - `autobyteus-server-ts/src/agent-team-execution/domain/inter-agent-message-delivery.ts`
- Runtime/event shaping boundary:
  - `autobyteus-server-ts/src/agent-team-execution/services/inter-agent-message-runtime-builders.ts`
  - `autobyteus-ts/src/agent-team/events/agent-team-events.ts`
  - `autobyteus-ts/src/agent/message/inter-agent-message.ts`
  - `autobyteus-ts/src/agent/handlers/inter-agent-message-event-handler.ts`
- Current implicit derivation boundary:
  - `autobyteus-server-ts/src/agent-execution/events/processors/message-file-reference/message-file-reference-processor.ts`
  - `autobyteus-server-ts/src/agent-execution/events/processors/message-file-reference/message-file-reference-paths.ts`
- Team-level reference projection/content/UI boundary, which remains broadly correct:
  - `autobyteus-server-ts/src/services/message-file-references/*`
  - `autobyteus-server-ts/src/api/rest/message-file-references.ts`
  - `autobyteus-server-ts/src/api/graphql/types/message-file-references.ts`
  - `autobyteus-web/stores/messageFileReferencesStore.ts`
  - `autobyteus-web/components/workspace/agent/ArtifactList.vue`
  - `autobyteus-web/components/workspace/agent/ArtifactContentViewer.vue`

The target design must preserve:

- existing `INTER_AGENT_MESSAGE` conversation display;
- team-level canonical reference storage;
- Sent/Received perspective projection;
- separate **Agent Artifacts** authority through run file changes;
- read-only content serving by persisted team/reference id.

## Intended Change

Add optional `reference_files` to `send_message_to` and make it the sole source of Artifacts-tab message-file-reference declarations for new accepted inter-agent messages. Preserve the message body as self-contained communication, analogous to an email body that still explains and naturally mentions its attachments.

Target public contract:

```json
{
  "recipient_name": "code_reviewer",
  "content": "Implementation is ready for review. The main handoff is at /Users/normy/.../implementation-handoff.md, and the validation evidence is in /Users/normy/.../review-evidence.log. Key points and risks are summarized below...",
  "message_type": "agent_message",
  "reference_files": [
    "/Users/normy/.../implementation-handoff.md",
    "/Users/normy/.../review-evidence.log"
  ]
}
```

Recommended schema description for `reference_files`:

> Optional attachment/reference list of absolute file paths the recipient may need to inspect, such as handoff documents, reports, logs, validation evidence, generated outputs, or related project files that should appear in Sent/Received Artifacts. Keep the message content self-contained, like an email body, and use this list as the structured attachment/index list.

Use the field name `reference_files`, not `attachments`, because the tool is not uploading file bytes; it is declaring local file references that the backend later resolves through persisted reference identity.

High-level flow:

1. Sender calls `send_message_to` with self-contained natural `content` and optional `reference_files`.
2. Shared parser validates and normalizes `reference_files` as absolute local file paths.
3. Delivery request carries `referenceFiles` through the shared team delivery boundary.
4. Runtime builders append a generated **Reference files:** block to the recipient-visible input when references exist, analogous to an email attachment list, and include `reference_files` in `INTER_AGENT_MESSAGE.payload`.
5. `MessageFileReferenceProcessor` reads only `payload.reference_files` and emits `MESSAGE_FILE_REFERENCE_DECLARED` events.
6. Existing team-level projection/content/frontend paths persist, hydrate, and display canonical references as **Sent Artifacts** and **Received Artifacts**.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior change plus bounded refactor of an additive feature.
- Current design issue found (`Yes`/`No`/`Unclear`): Yes.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue plus Legacy Or Compatibility Pressure.
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes.
- Evidence: Content scanning makes prose an implicit artifact-sharing authority and creates noisy rows. Keeping content scanning after adding `reference_files` would leave two competing authorities. The existing processor boundary is still healthy because it decouples provider-specific tool handlers from reference projection; the processor's input source is the design issue.
- Design response: Strengthen the public send-message contract with explicit `reference_files`, carry it through delivery/events, refactor the processor to consume that structured field, and remove free-text path extraction.
- Refactor rationale: This is a clean-cut ownership correction. Tool schemas own agent intent capture; runtime builders own recipient/event shaping; the processor owns declaration derivation; projection services own persistence/content; frontend stores own perspective views.
- Intentional deferrals and residual risk, if any: Historical backfill remains out of scope. Agents may omit `reference_files` in some messages, or may write thinner content if examples are poor; schema/instruction examples must show complete email-like content plus `reference_files`, and omitted references intentionally produce no artifact rows.

## Terminology

- `reference_files`: The optional structured list of absolute local paths supplied to `send_message_to`.
- `message-file reference`: A persisted team-level metadata row derived from an accepted inter-agent message's explicit `reference_files`.
- `Agent Artifacts`: Produced file-change artifacts owned by run-file-change services/stores.
- `Sent Artifacts` / `Received Artifacts`: Perspective projections of canonical message-file references for the focused member.

## Design Reading Order

Read this design in this order:

1. explicit send-message reference contract and data-flow spine;
2. declaration/projection/content spines;
3. removal plan for implicit content scanning and receiver-scoped authorities;
4. file responsibility and interface mapping;
5. migration/refactor sequence and validation requirements.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove/decommission content-path extraction as a reference authority and remove receiver-scoped reference APIs/storage/store shapes.
- Clean-cut rule: new accepted messages create referenced artifacts only from explicit `reference_files`.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Sender `send_message_to` call | Accepted recipient runtime input and `INTER_AGENT_MESSAGE.payload.reference_files` | Team communication delivery boundary | Captures explicit file-reference intent while preserving self-contained communication for recipient agents. |
| DS-002 | Return-Event | Accepted `INTER_AGENT_MESSAGE` event | Persisted `message_file_references.json` row and streamed declaration | Message reference processor + projection service | Converts explicit references into durable team-level artifact metadata. |
| DS-003 | Primary End-to-End | Live/hydrated message-reference payload | Focused member Artifacts tab Sent/Received rows | Frontend message-reference store | Shows the same canonical reference differently for sender and receiver. |
| DS-004 | Primary End-to-End | User selects a referenced artifact row | Read-only content displayed or graceful unavailable state | Message-reference content service | Serves file bytes only through persisted team/reference identity. |
| DS-005 | Primary End-to-End | Native/autobyteus `send_message_to` | Native recipient message/context carries reference files | Native team communication event/message DTOs | Prevents provider-specific contract drift. |

## Primary Execution Spine(s)

- DS-001: `send_message_to schema -> shared argument parser -> InterAgentMessageDeliveryRequest.referenceFiles -> runtime input/event builder -> recipient runtime input + INTER_AGENT_MESSAGE.payload.reference_files`
- DS-003: `MESSAGE_FILE_REFERENCE_DECLARED live/hydrated payload -> TeamStreamingService/messageFileReferenceHydrationService -> messageFileReferencesStore -> ArtifactsTab -> ArtifactList`
- DS-004: `ArtifactContentViewer -> /team-runs/:teamRunId/message-file-references/:referenceId/content -> MessageFileReferenceContentService -> persisted reference -> filesystem read -> viewer state`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The sender writes self-contained natural content plus optional reference files. The shared parser normalizes the request and the runtime builder creates both recipient-visible body/attachment context and the synthetic inter-agent event payload. | Tool schema, argument parser, delivery request, runtime builder | Team communication delivery | Validation, generated reference-files block, provider adapters |
| DS-002 | Accepted inter-agent events are processed after delivery. The processor reads explicit `reference_files`, builds declaration payloads, and the projection service persists/upserts them. | Inter-agent event, reference processor, projection service | Message-reference event/projection capability | Path normalizer, id builder, artifact type inference, diagnostics |
| DS-003 | Live and historical references enter one frontend store. The store derives Sent/Received groups for the focused member without duplicating persisted direction rows. | Streaming/hydration adapters, store, Artifacts UI | Frontend message-reference store | GraphQL query, websocket handler, localization labels |
| DS-004 | Selecting a row asks the backend for content by persisted team/reference id. The content service resolves the stored path, validates readability, and returns content or a graceful error. | Viewer, REST route, content service, projection resolver | Message-reference content service | MIME/type detection, filesystem errors, read-only policy |
| DS-005 | Native/autobyteus team communication mirrors the same explicit reference contract so downstream runtime handlers and stream payloads remain consistent across providers. | Native tool, team event, inter-agent message, recipient handler | Native team communication DTOs | Stream notifier metadata, generated reference block |

## Spine Actors / Main-Line Nodes

- `send_message_to` public tool contract
- `SendMessageToToolArgumentParser` / native argument reader
- `InterAgentMessageDeliveryRequest`
- `InterAgentMessageRuntimeBuilders`
- `INTER_AGENT_MESSAGE` accepted event
- `MessageFileReferenceProcessor`
- `MessageFileReferenceService` / projection store
- `messageFileReferencesStore`
- `ArtifactsTab` / `ArtifactList`
- `MessageFileReferenceContentService`

## Ownership Map

- Public tool schemas own what an agent can intentionally declare in a send-message call.
- Shared argument parser owns syntactic validation and normalization of the send-message arguments.
- Team communication delivery owns routing and accepted-message shaping; provider-specific handlers remain thin adapters.
- Runtime builders own generated recipient-visible reference context and event payload fields.
- `MessageFileReferenceProcessor` owns declaration derivation from accepted event payloads.
- Message-reference services own persistence, hydration data, reference resolution, and read-only content serving.
- Frontend message-reference store owns canonical client state and focused-member perspective grouping.
- Artifacts components compose existing stores and render sections; they do not derive references from text.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| Codex dynamic tool registration | Shared send-message parser + delivery request | Adapts Codex tool invocation to team delivery | Reference persistence, content serving, or path scanning |
| Claude tool call handler | Shared send-message parser + delivery request | Adapts Claude MCP invocation to team delivery | Reference persistence, content serving, or divergent validation policy |
| REST content route | `MessageFileReferenceContentService` | HTTP boundary for viewer content | Direct JSON reads or raw path streaming |
| GraphQL message-reference resolver | Projection read service | Hydration boundary | Per-receiver storage authority |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| `extractMessageFileReferencePathCandidates` and free-text content extraction | Explicit `reference_files` is now the authority | Explicit reference-list parser/normalizer under message-reference or send-message parsing ownership | In This Change | Remove or replace `message-file-reference-paths.ts`; no Markdown wrapper parser extension. |
| Content-scanning branch in `MessageFileReferenceProcessor` | Would preserve implicit second authority | Processor reads `payload.reference_files` only | In This Change | If no explicit refs, processor emits no declarations. |
| Parser tests that assert Markdown-wrapped content paths create references | No longer target behavior | Tests for explicit `reference_files` validation/derivation | In This Change | Historical parser report should be marked superseded. |
| Receiver-scoped content route | Wrong identity boundary | `/team-runs/:teamRunId/message-file-references/:referenceId/content` | In This Change | No `members/:receiverRunId` segment. |
| Receiver-scoped GraphQL query argument/store key | Duplicates perspective into persistence/API | `getMessageFileReferences(teamRunId)` + frontend selectors | In This Change | Sender/receiver stay metadata only. |
| Member-level `message_file_references.json` | Splits canonical team state | `agent_teams/<teamRunId>/message_file_references.json` | In This Change | One projection file per team run. |
| Single **Referenced Artifacts** UI section | Hides sender/receiver perspective | Separate **Sent Artifacts** and **Received Artifacts** sections | In This Change | Current in-ticket UI mostly already follows this. |
| Any compatibility fallback from message prose to artifact row | Creates dual authority and noise | Explicit `reference_files` only | In This Change | No hidden fallback. |

## Return Or Event Spine(s) (If Applicable)

DS-002 event flow:

`INTER_AGENT_MESSAGE(payload.reference_files) -> AgentRunEventPipeline/shared synthetic-event processing seam -> MessageFileReferenceProcessor -> MESSAGE_FILE_REFERENCE_DECLARED -> MessageFileReferenceService -> projection store -> websocket/hydration payload`

The event spine matters because the provider-specific `send_message_to` handlers should not own projection persistence. They only produce the accepted delivery request; derived artifact metadata remains an event-sidecar concern.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: shared send-message argument parser.
  - Local chain: `unknown tool args -> read reference_files array -> trim/normalize -> validate absolute local path -> dedupe -> parsed.referenceFiles`.
  - Why it matters: all provider adapters must share one validation policy.
- Parent owner: `MessageFileReferenceProcessor`.
  - Local chain: `accepted event -> metadata validation -> explicit refs loop -> payload builder -> declaration events`.
  - Why it matters: keeps event derivation pure and free of filesystem IO.
- Parent owner: frontend message-reference store.
  - Local chain: `canonical refs by team -> filter by focused member -> split sender/receiver perspective -> group by counterpart -> stable sorted rows`.
  - Why it matters: Sent/Received is a UI perspective, not persisted direction state.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Reference-list validation/normalization | DS-001, DS-002 | Shared parser / processor | Ensure explicit refs are absolute local strings and deduped | Prevents malformed explicit contracts | Provider drift or late noisy failures |
| Generated recipient reference block | DS-001, DS-005 | Runtime builders | Make explicit references visible as an attachment/index list | Mirrors email attachment affordance while preserving self-contained body | Tool schema leaks into provider-specific message formatting |
| Stable reference id builder | DS-002, DS-004 | Projection/content services | Build deterministic ids from team/sender/receiver/path | Enables dedupe and content lookup | Random ids or raw path URLs |
| Artifact type inference | DS-002, DS-003 | Reference payload builder/UI | Choose icon/viewer handling | Reuses existing artifact utility | UI guesses repeatedly |
| Streaming/hydration adapters | DS-003 | Frontend store | Convert backend payloads into client state | Keeps Artifacts UI thin | UI components become transport-aware |
| Content read validation | DS-004 | Content service | Resolve persisted reference and validate file | Keeps route thin and read-only | Raw path endpoint or direct filesystem reads in UI/route |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Send-message public contract | Existing Codex/Claude/native team communication tools | Extend | Same tool; add one optional field | N/A |
| Shared send-message parsing | `send-message-to-tool-argument-parser.ts` | Extend | Already centralizes server provider parsing | N/A |
| Recipient input/event shaping | `inter-agent-message-runtime-builders.ts` | Extend | Correct shared owner for accepted message shape | N/A |
| Message-reference declaration | Existing `MessageFileReferenceProcessor` | Refactor | Processor boundary remains correct; source changes | N/A |
| Path text extraction | `message-file-reference-paths.ts` | Remove/replace | Explicit list makes free-text extraction obsolete | N/A |
| Team-level reference storage/content | `services/message-file-references` | Reuse/extend | Already owns reference subject | N/A |
| Frontend perspective state | `messageFileReferencesStore.ts` | Reuse/extend | Already owns Sent/Received selectors | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Team communication tools | Public `send_message_to` schema, provider adapters | DS-001, DS-005 | Team communication delivery | Extend | Codex, Claude, native/autobyteus must align. |
| Team communication delivery | Delivery DTO, recipient input, accepted event payload | DS-001 | Team managers/runtimes | Extend | Keep managers thin via shared builders. |
| Agent event processing | Pure derivation of reference declarations | DS-002 | Event pipeline | Refactor | Processor consumes explicit refs only. |
| Message references service | Projection file, id resolution, content serving | DS-002, DS-004 | Backend API and streaming | Reuse | Keep team-level identity. |
| Frontend artifacts | Store, hydration/live handling, Sent/Received composition | DS-003 | Artifacts tab | Reuse/extend | No message parsing. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `codex-send-message-tool-spec-builder.ts` | Team communication tools | Codex schema builder | Add `reference_files` JSON schema and examples | Provider-specific schema shape | Shared semantics from requirements |
| `claude-send-message-tool-definition-builder.ts` | Team communication tools | Claude schema builder | Add `reference_files` Zod schema/description | Provider-specific schema shape | Shared semantics from requirements |
| `send-message-to-tool-argument-parser.ts` | Team communication delivery | Shared parser | Parse/validate/normalize explicit refs | Centralizes provider validation | Reference normalizer |
| `inter-agent-message-delivery.ts` | Team communication delivery | Delivery DTO | Add `referenceFiles` | One request contract | N/A |
| `inter-agent-message-runtime-builders.ts` | Team communication delivery | Runtime builder | Render generated reference block and event payload | Shared accepted-message shaping | Reference files DTO |
| Native `send-message-to.ts` / events/message files | Native team communication | Native contract | Mirror field and recipient block | Prevents provider drift | Reference files DTO |
| `message-file-reference-processor.ts` | Agent event processing | Processor | Consume `payload.reference_files`; emit declarations | Same derivation owner | Payload builder |
| `message-file-reference-files.ts` or equivalent | Agent event/message references | Explicit reference normalizer | Validate/normalize explicit path list if not kept in parser | Replaces free-text parser with explicit concern | N/A |
| `message-file-reference-payload-builder.ts` | Agent event processing | Payload builder | Build declaration payload, infer type, id | Already tight | Identity utilities |
| `services/message-file-references/*` | Message references service | Projection/content services | Persist/read/content by team/reference | Existing owner | Projection types |
| `messageFileReferencesStore.ts` | Frontend artifacts | Store/selectors | Canonical refs + Sent/Received projection | Existing owner | Backend payload types |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Parsed explicit reference list | `send-message-to-tool-argument-parser.ts` helper or `message-file-reference-files.ts` | Team communication/message references | Needed by parser and possibly processor tests | Yes | Yes | Free-text scanner |
| Delivery/event reference shape | `InterAgentMessageDeliveryRequest.referenceFiles` and event payload `reference_files` | Team communication delivery | Same semantic list across adapters/builders | Yes | Yes | Mixed attachments object with optional byte/upload fields |
| Declaration payload | `agent-run-message-file-reference.ts` | Agent event domain | Processor, mapper, projection agree on fields | Yes | Yes | Projection persistence type with UI-only direction |
| Projection entry | `message-file-reference-types.ts` | Message references service | Store, content, hydration, frontend payload | Yes | Yes | Per-receiver duplicate representation |
| Frontend perspective item | `messageFileReferencesStore.ts` selector type or local UI model | Frontend artifacts | Sent/Received is derived UI shape | Yes | Yes | Persisted occurrence history model |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `reference_files: string[]` | Yes | Yes | Low | Keep as list of path strings; no upload metadata. |
| `InterAgentMessageDeliveryRequest.referenceFiles` | Yes | Yes | Low | Normalize to empty array at boundary. |
| `INTER_AGENT_MESSAGE.payload.reference_files` | Yes | Yes | Low | This is the only event source for declarations. |
| `AgentRunMessageFileReferencePayload` | Yes | Yes | Low | Keep sender/receiver metadata; no direction field. |
| `MessageFileReferencePerspectiveItem` | Yes | Yes | Low | Derived only; not persisted. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/backends/codex/team-communication/codex-send-message-tool-spec-builder.ts` | Team communication tools | Codex tool schema | Add optional `reference_files` array with positive description/example | Provider-specific schema builder | Shared field semantics |
| `autobyteus-server-ts/src/agent-execution/backends/codex/team-communication/codex-send-message-dynamic-tool-registration.ts` | Team communication tools | Codex adapter | Pass parsed `referenceFiles` to delivery | Thin provider adapter | Parsed args |
| `autobyteus-server-ts/src/agent-execution/backends/claude/team-communication/claude-send-message-tool-definition-builder.ts` | Team communication tools | Claude tool schema | Add optional `reference_files` array | Provider-specific schema builder | Shared field semantics |
| `autobyteus-server-ts/src/agent-execution/backends/claude/team-communication/claude-send-message-tool-call-handler.ts` | Team communication tools | Claude adapter | Pass parsed `referenceFiles` to delivery | Thin provider adapter | Parsed args |
| `autobyteus-server-ts/src/agent-team-execution/services/send-message-to-tool-argument-parser.ts` | Team communication delivery | Shared parser | Parse, validate, normalize, dedupe explicit references | One policy for providers | May call explicit path normalizer |
| `autobyteus-server-ts/src/agent-team-execution/domain/inter-agent-message-delivery.ts` | Team communication delivery | Delivery request contract | Add `referenceFiles` | Stable boundary DTO | N/A |
| `autobyteus-server-ts/src/agent-team-execution/services/inter-agent-message-runtime-builders.ts` | Team communication delivery | Runtime/event builder | Build generated reference block and `payload.reference_files` | Central accepted-message shaper | Reference list |
| `autobyteus-server-ts/src/agent-team-execution/backends/codex/codex-team-manager.ts` | Team run backend | Manager | Preserve normalized `referenceFiles` when normalizing request | Manager remains thin | Delivery request |
| `autobyteus-server-ts/src/agent-team-execution/backends/claude/claude-team-manager.ts` | Team run backend | Manager | Preserve normalized `referenceFiles` when normalizing request | Manager remains thin | Delivery request |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/mixed-team-manager.ts` | Team run backend | Manager/router | Preserve normalized `referenceFiles` across routed delivery | Manager remains thin | Delivery request |
| `autobyteus-server-ts/src/agent-execution/events/processors/message-file-reference/message-file-reference-processor.ts` | Agent event processing | Processor | Read explicit `payload.reference_files`; emit declarations | Derivation owner remains pure | Payload builder |
| `autobyteus-server-ts/src/agent-execution/events/processors/message-file-reference/message-file-reference-paths.ts` | Agent event processing | Obsolete file | Remove or replace with explicit path-list normalization file | Free-text extraction is obsolete | N/A |
| `autobyteus-server-ts/src/agent-execution/events/processors/message-file-reference/message-file-reference-payload-builder.ts` | Agent event processing | Payload builder | Build canonical declaration payloads | Existing tight concern | Identity utility |
| `autobyteus-ts/src/agent/message/send-message-to.ts` | Native team communication | Native tool | Add optional `reference_files` and validation | Native public schema | Reference list |
| `autobyteus-ts/src/agent-team/events/agent-team-events.ts` | Native team communication | Team event DTO | Add `referenceFiles` | Native request boundary | N/A |
| `autobyteus-ts/src/agent/message/inter-agent-message.ts` | Native team communication | Recipient message DTO | Add `referenceFiles` | Recipient event payload | N/A |
| `autobyteus-ts/src/agent/handlers/inter-agent-message-event-handler.ts` | Native runtime | Recipient handler | Include generated reference block/stream metadata | Native equivalent of runtime builders | Reference list |
| Existing `services/message-file-references/*` | Message references service | Projection/content | Keep team-level storage/content/hydration | Existing subject owner | Reference payload/projection types |
| Existing frontend store/components | Frontend artifacts | Store/UI | Keep Sent/Received/Agent Artifacts composition | Existing subject owner | Backend payloads |

## Ownership Boundaries

Authority changes hands at these boundaries:

1. Tool schema -> parser: schema describes the field; parser validates concrete runtime values.
2. Parser -> delivery request: parser produces normalized `referenceFiles`; provider adapters stop owning semantics.
3. Delivery request -> runtime builder: builder owns how references appear to the recipient and how accepted events carry them.
4. Accepted event -> processor: processor owns derived declaration events, not routing/delivery.
5. Declaration -> projection service: service owns persistence and upsert semantics.
6. Projection -> frontend store: store owns Sent/Received perspective grouping.
7. Viewer -> content service: content service owns read-only file resolution by persisted reference id.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| Shared send-message parser | Reference list normalization/validation | Codex and Claude tool adapters | Provider-specific divergent parsing | Add shared parser API/validation result |
| `InterAgentMessageDeliveryRequest` | Accepted send-message data contract | Team managers/backends | Extra ad-hoc reference args beside request | Add field to request DTO |
| Runtime builders | Generated recipient reference block and event payload mapping | Team managers | Duplicated provider-specific message formatting | Extend builder inputs/outputs |
| `MessageFileReferenceProcessor` | Declaration derivation | Event pipeline/shared synthetic event seam | Tool handlers writing projection rows | Add explicit payload handling to processor |
| `MessageFileReferenceProjectionService` | Projection read/resolve | GraphQL/content services | Direct JSON reads with custom identity | Expose explicit team/reference APIs |
| `MessageFileReferenceContentService` | Filesystem validation/read | REST route/viewer | Raw path content route | Add resolve/read methods by reference id |
| `messageFileReferencesStore` | Focused-member projection | Artifacts components | Components scanning messages or duplicating grouping logic | Add selectors |

## Dependency Rules

Allowed:

- Provider tool adapters may depend on the shared send-message parser and delivery handler.
- Runtime builders may read normalized delivery request fields and build recipient input/event payloads.
- `MessageFileReferenceProcessor` may read `INTER_AGENT_MESSAGE.payload.reference_files` and provenance fields; it may use payload builders/normalizers.
- Projection/content services may depend on message-reference types, identity, and filesystem utilities.
- Frontend streaming/hydration adapters may upsert backend reference payloads into `messageFileReferencesStore`.
- Artifacts components may consume store selectors and content viewer models.

Forbidden:

- Provider-specific `send_message_to` handlers must not persist references or read files.
- `MessageFileReferenceProcessor` must not scan `payload.content` or perform filesystem IO.
- Frontend components must not scan Markdown/message content to create rows.
- `InterAgentMessageSegment` must not open files or depend on Artifacts stores.
- Content routes must not accept raw path authority.
- Receiver-scoped storage/query/route/store APIs must not remain as compatibility wrappers.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `send_message_to` | Inter-agent communication request | Send natural message and optional explicit file references | `recipient_name`, `content`, optional `message_type`, optional `reference_files: string[]` | `reference_files` contains absolute paths only. |
| `parseSendMessageToToolArguments` | Tool argument validation | Produce normalized send-message args | Unknown tool args -> typed args | Shared by Codex/Claude server paths. |
| `InterAgentMessageDeliveryRequest` | Accepted delivery request | Carry sender/team/recipient/content/type/references | `teamRunId`, `senderRunId`, `recipientMemberName`, `referenceFiles` | No raw extra provider args. |
| `buildRecipientVisibleInterAgentMessageContent` | Recipient runtime context | Create visible self-contained content including generated attachment/index block | Delivery request | Existing message style preserved plus block when refs exist. |
| `buildInterAgentMessageAgentRunEvent` | Accepted event payload | Build `INTER_AGENT_MESSAGE` with `reference_files` | Sender/receiver/team request | Event source for processor. |
| `MESSAGE_FILE_REFERENCE_DECLARED` | Reference declaration event | Declare one canonical file reference | team + sender + receiver + normalized path/reference id | No direction field. |
| `getMessageFileReferences(teamRunId)` | Reference hydration | Return canonical refs for a team | `teamRunId` | No receiver argument. |
| `GET /team-runs/:teamRunId/message-file-references/:referenceId/content` | Reference content | Stream content for persisted reference | `teamRunId`, `referenceId` | No raw path query. |
| `messageFileReferencesStore.getPerspectiveForMember` | Frontend projection | Derive Sent/Received grouped views | `teamRunId`, `memberRunId` | UI-only perspective. |

Rule validation: no one generic boundary handles both generated run-file artifacts and message-file references. Their identity and authority differ, so their stores/routes/services remain separate.

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `send_message_to` | Yes | Yes | Low | Add one optional field without changing content semantics. |
| `parseSendMessageToToolArguments` | Yes | Yes | Low | Keep validation shared. |
| `InterAgentMessageDeliveryRequest` | Yes | Yes | Low | Normalize references to empty array. |
| `getMessageFileReferences(teamRunId)` | Yes | Yes | Low | Remove receiver argument. |
| Content endpoint | Yes | Yes | Low | Keep team/reference identity only. |
| `messageFileReferencesStore.getPerspectiveForMember` | Yes | Yes | Low | Direction remains derived. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Tool argument | `reference_files` | Yes | Low | Prefer over `attachments` because paths are references, not uploaded blobs. |
| Delivery DTO field | `referenceFiles` | Yes | Low | CamelCase internal representation. |
| Event payload field | `reference_files` | Yes | Low | Snake_case payload convention. |
| UI sections | **Sent Artifacts** / **Received Artifacts** | Yes | Low | Existing accepted product wording. |
| Persisted row | `MessageFileReferenceEntry` | Yes | Low | No direction/occurrence fields. |

## Applied Patterns (If Any)

- Adapter: Codex/Claude/native tool handlers adapt provider-specific invocation shape to the shared delivery request.
- Event processor: `MessageFileReferenceProcessor` derives sidecar events from accepted `INTER_AGENT_MESSAGE` events.
- Repository/projection store: message-reference projection store persists `message_file_references.json` and serves hydration/content lookup.
- Selector: frontend store derives Sent/Received perspective groups from canonical references.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/backends/codex/team-communication/` | Folder | Codex team tool adapter | Codex schema + tool registration updates | Existing provider adapter folder | Projection persistence |
| `autobyteus-server-ts/src/agent-execution/backends/claude/team-communication/` | Folder | Claude team tool adapter | Claude schema + call handler updates | Existing provider adapter folder | Divergent validation policy |
| `autobyteus-server-ts/src/agent-team-execution/services/send-message-to-tool-argument-parser.ts` | File | Shared tool parser | Explicit reference parse/validation | Existing shared parser | Filesystem reads or event processing |
| `autobyteus-server-ts/src/agent-team-execution/domain/inter-agent-message-delivery.ts` | File | Delivery DTO | Add `referenceFiles` | Existing boundary contract | Provider-specific logic |
| `autobyteus-server-ts/src/agent-team-execution/services/inter-agent-message-runtime-builders.ts` | File | Runtime/event builder | Generated reference block + event payload mapping | Existing shared accepted-message builder | Persistence |
| `autobyteus-server-ts/src/agent-execution/events/processors/message-file-reference/` | Folder | Message-reference event derivation | Processor + payload builder + explicit list normalizer if needed | Existing processor folder | Free-text scanning |
| `autobyteus-server-ts/src/services/message-file-references/` | Folder | Projection/content services | Team-level projection, resolve, content read | Existing subject owner | Conversation rendering |
| `autobyteus-ts/src/agent/message/` and `autobyteus-ts/src/agent-team/events/` | Folder | Native communication contracts | Mirror `reference_files` contract | Native package ownership | Server-only projection state |
| `autobyteus-web/stores/messageFileReferencesStore.ts` | File | Frontend reference store | Canonical references and Sent/Received selectors | Existing client state owner | Message parsing |
| `autobyteus-web/components/workspace/agent/` | Folder | Artifacts UI | Section rendering and content viewer | Existing UI owner | Reference derivation |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| Provider team-communication folders | Transport/Adapter | Yes | Low | Provider schema/handler only. |
| `agent-team-execution/services` | Main-Line Domain-Control | Yes | Low | Shared delivery/parser/runtime builder concerns. |
| `agent-execution/events/processors/message-file-reference` | Off-Spine Concern | Yes | Low | Pure declaration derivation. |
| `services/message-file-references` | Mixed Justified | Yes | Medium | Projection and content share one subject; transport remains outside. |
| Frontend stores | Off-Spine Concern | Yes | Low | Client state/projection only. |
| Frontend components | UI Composition | Yes | Low | Render/select/fetch, no derivation. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Tool call | `send_message_to({ recipient_name: "code_reviewer", content: "Implementation is ready. The main handoff is at /Users/.../implementation-handoff.md. Please review the parser refactor and validation evidence.", reference_files: ["/Users/.../implementation-handoff.md"] })` | Thin content like `See attached.` with only `reference_files`, or only prose paths with no artifact list | Makes reference intent explicit while content stays self-contained. |
| Recipient-visible input | Self-contained natural content followed by generated `Reference files:\n- /Users/.../implementation-handoff.md` | Treating `reference_files` as a replacement for explaining the handoff in `content` | Recipient gets both an email-like body and an attachment/index list. |
| Processor source | `payload.reference_files.map(buildMessageFileReferencePayload)` | `extractMessageFileReferencePathCandidates(payload.content)` | Prevents prose from becoming an implicit API. |
| UI projection | Canonical row shows under Sent for sender and Received for receiver | Persisting separate sent/received JSON rows | Direction is a perspective, not storage identity. |
| Content read | `/team-runs/team-1/message-file-references/ref-1/content` | `/local-file?path=/Users/...` | Persisted reference id is the content authority. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep content scanning as fallback when `reference_files` is absent | Would preserve old in-ticket behavior for agents that mention paths only in prose | Rejected | New accepted messages create artifact rows only from `reference_files`. |
| Extend Markdown path parser for bold/backtick/link wrappers | Earlier runtime investigation found parser gaps | Rejected | Remove parser target; validate explicit path list instead. |
| Accept both `attachments` and `reference_files` | Could seem friendlier | Rejected | One field: `reference_files`; schema description can call it an attachment/reference list. |
| Receiver-scoped route/query/store compatibility | Would avoid touching existing in-ticket code | Rejected | Team-level query/content route/store selectors only. |
| Store Sent and Received rows separately | Makes UI querying simple | Rejected | Persist one canonical row and derive perspective. |
| Raw path content endpoint | Easy viewer implementation | Rejected | Resolve through persisted team/reference id. |

Hard block: any implementation that keeps content scanning, receiver-scoped authorities, or raw-path content serving for in-scope behavior fails this design.

## Derived Layering (If Useful)

- Public/adapter layer: provider-specific `send_message_to` schemas and tool handlers.
- Domain/control layer: shared parser, delivery DTO, runtime builders, team managers.
- Event/sidecar layer: `MessageFileReferenceProcessor` and declaration payload builder.
- Persistence/content layer: message-reference projection and content services.
- Client state/UI layer: streaming/hydration adapters, `messageFileReferencesStore`, Artifacts components.

Layering is explanatory only; ownership boundaries above are authoritative.

## Migration / Refactor Sequence

1. Update requirements/tests docs references so content scanning is no longer target behavior.
2. Add `reference_files` to Codex and Claude `send_message_to` tool schemas with positive examples.
3. Extend `SendMessageToToolArguments` and parser validation to return normalized `referenceFiles`.
4. Extend `InterAgentMessageDeliveryRequest` and all team-manager normalization paths to preserve `referenceFiles` as an empty array when omitted.
5. Update `inter-agent-message-runtime-builders.ts` so accepted references:
   - appear in recipient-visible runtime input as a generated **Reference files:** block;
   - appear in synthetic `INTER_AGENT_MESSAGE.payload.reference_files`.
6. Update native/autobyteus `send-message-to`, team event, inter-agent message DTO, and recipient handler to mirror the same contract.
7. Refactor `MessageFileReferenceProcessor` to read `payload.reference_files` only, validate required metadata, and emit declarations through the existing payload builder.
8. Remove/decommission `extractMessageFileReferencePathCandidates` and any tests/docs that assert references are derived from content/Markdown wrappers.
9. Keep/refine team-level projection/content APIs and frontend Sent/Received store/UI; adjust payload typings if needed.
10. Update docs for streaming protocol, agent artifacts, and send-message usage so they describe explicit `reference_files`.
11. Add concise diagnostics for explicit references: validation failures, accepted event reference count, skipped missing metadata, projection insert/update, content resolution failures.
12. Run focused unit/integration/frontend tests and grep checks listed below.

## Validation Requirements

Implementation should provide evidence for:

- tool schema snapshots/types include `reference_files` for Codex, Claude, and native/autobyteus send-message paths;
- tool schema/instruction examples show self-contained email-like `content` plus `reference_files`, not thin `See attached`-style content;
- parser accepts omitted/empty `reference_files`, normalizes valid absolute paths, dedupes duplicates, and rejects malformed lists;
- recipient-visible runtime input includes generated **Reference files:** block when explicit references exist;
- `INTER_AGENT_MESSAGE.payload.reference_files` is present for accepted referenced messages;
- `MessageFileReferenceProcessor` emits declarations from `payload.reference_files` and emits none when only `payload.content` contains absolute paths;
- `extractMessageFileReferencePathCandidates` and content-scanning fallback are absent or unreachable;
- team-level `message_file_references.json` persists one canonical row per `teamRunId + senderRunId + receiverRunId + normalizedPath`;
- sender sees the row under **Sent Artifacts**, receiver sees the same row under **Received Artifacts**;
- generated **Agent Artifacts** remain backed by run-file-change state;
- content endpoint resolves by `teamRunId + referenceId` and handles missing/unreadable files gracefully;
- existing `InterAgentMessageSegment` behavior remains unchanged;
- no frontend Markdown/message click path creates reference rows.

Suggested grep/review checks:

- no production call to `extractMessageFileReferencePathCandidates` remains;
- no receiver-scoped route segment like `/members/:receiverRunId/message-file-references` remains;
- no GraphQL reference query requires `receiverRunId`;
- no frontend `entriesByReceiver` or single **Referenced Artifacts** authority remains;
- no raw path content endpoint is introduced.

## Design Risks And Mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Agents omit `reference_files` when mentioning paths in prose | Artifact row absent | Positive schema description plus examples showing complete content and `reference_files`. |
| Provider implementations diverge | Some teams fail to share artifacts | Shared parser and delivery DTO; tests for each provider schema/handler. |
| Agents write thin content because references are in `reference_files` | Recipient loses context | Email-like examples require self-contained body plus generated **Reference files:** block. |
| Invalid path entry blocks message delivery | Sender must retry | Concise validation error; explicit contract favors correction over silent noise. |
| Old content-scanning tests conflict | Failing tests | Replace with explicit-reference tests; mark runtime parser investigation superseded. |

## Open Questions For Architecture Review

- Should invalid `reference_files` entries fail the whole tool call as designed, or should the parser drop invalid entries and deliver the message with only valid references? Current design chooses fail-fast to keep the explicit contract honest.
- Should the generated recipient block label be exactly **Reference files:** or should product copy prefer **Attached reference files:**? Current design uses **Reference files:** to avoid implying upload semantics.
