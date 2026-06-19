# Design Spec: Codex Provider Compaction Boundary Capture

## Current-State Read

The current runtime-to-frontend compaction path is already event-driven and runtime-agnostic after runtime conversion:

`Runtime-specific event -> AgentRunEventType.COMPACTION_STATUS -> ServerMessageType.COMPACTION_STATUS -> frontend handleCompactionStatus -> AgentActivityStore compaction row`.

Raw AutoByteus compaction follows this path because `AutoByteusStreamEventConverter` maps `StreamEventType.COMPACTION_STATUS` directly to `AgentRunEventType.COMPACTION_STATUS`. Claude Agent SDK provider compaction also follows it because `ClaudeSessionEventConverter` maps `status_compacting` and `compact_boundary` to provider compaction `COMPACTION_STATUS` events. Team streams reuse `AgentRunEventMessageMapper`, then add member/team identity, so member-provider compaction is frontend-visible when the member runtime emits `COMPACTION_STATUS`.

Codex has the gap before the shared stream boundary. `CodexThreadEventConverter` currently recognizes deprecated/older boundary surfaces: `thread/compacted` and raw response item type `compaction`. Current Codex app-server documentation and local `codex-cli 0.140.0` generated protocol show `contextCompaction` item lifecycle (`item/started` then `item/completed`) and raw response item type `context_compaction`. `CodexItemEventConverter` currently treats `item/completed contextCompaction` as a normal segment end, so no `COMPACTION_STATUS` is emitted. Consequently users do not see the compaction event and `ProviderCompactionBoundaryRecorder` cannot persist/rotate at the completed provider boundary.

The storage and projection owners are healthy for this task: `ProviderCompactionBoundaryRecorder` owns provider marker persistence, dedupe against existing recorded state, and rotation when `rotation_eligible` is true; `RunMemoryFileStore` owns direct raw-trace segment layout; frontend `compactionActivityProjection` owns live compaction activity projection; run-history projection/hydration already turns durable `provider_compaction_boundary` traces into compaction activities without replaying them as normal conversation content.

## Intended Change

Extend Codex runtime event conversion so current Codex compaction lifecycle events produce the same provider compaction status contract already used by AutoByteus semantic compaction and Claude provider compaction:

- `item/started` with normalized item type `contextcompaction` emits a non-rotating provider compaction `COMPACTION_STATUS` (`status: "compacting"`, `rotation_eligible: false`) for frontend progress visibility.
- `item/completed` with normalized item type `contextcompaction` emits a rotating completed provider compaction boundary (`status: "compacted"`, `rotation_eligible: true`) for memory marker persistence and raw-trace rotation.
- `rawResponseItem/completed` with normalized item type `contextcompaction` emits the same completed provider boundary as a duplicate completion surface.
- Existing `thread/compacted` and raw `compaction` response item support remains, but completed boundary dedupe prevents duplicate markers/segments when multiple completed surfaces represent the same provider boundary.
- `compaction_trigger` remains non-boundary and non-rotating.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix / Behavior Change.
- Current design issue found (`Yes`/`No`/`Unclear`): Yes, narrow.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant.
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes, small local refactor.
- Evidence: Codex compaction detection is split between thread-level `thread/compacted` handling and raw-response `compaction` handling, while current documented `contextCompaction` item lifecycle is not recognized. Adding ad hoc checks in multiple converters would perpetuate drift.
- Design response: Add one Codex compaction item classifier and one Codex provider compaction event creation path that can emit both non-rotating lifecycle/progress status and rotating completed boundary events. Keep storage, websocket, and frontend projection owners unchanged.
- Refactor rationale: The refactor is limited to Codex event conversion and prevents repeated item-type string policy in `codex-item-event-converter.ts` and `codex-raw-response-event-converter.ts`.
- Intentional deferrals and residual risk, if any: No broad frontend redesign. If future Codex app-server versions add more compaction item types, the classifier can be extended. Live logs did not contain a recent raw compaction payload, so official docs plus local generated protocol are the contract evidence.

## Terminology

- `Provider compaction status`: A runtime-provider-owned compaction lifecycle update emitted as `AgentRunEventType.COMPACTION_STATUS` and visible to frontend users.
- `Provider compaction boundary`: The completed provider-owned compaction point that is eligible to rotate raw traces.
- `Completed boundary surface`: A provider event shape that means compaction has completed and raw traces may be rotated.
- `Progress surface`: A provider event shape that means compaction has started/in-progress and should be visible but must not rotate.

## Design Reading Order

1. Runtime event spine and return/event spine.
2. Codex conversion ownership and classifier.
3. Completed-boundary dedupe and non-rotating lifecycle status rules.
4. Existing storage, streaming, frontend, and historical projection reuse.
5. File mapping and implementation sequence.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: No obsolete raw-trace layout or frontend path is being replaced. Existing deprecated Codex `thread/compacted` support is intentionally retained because it remains an active duplicate boundary surface in current generated bindings and existing coverage; it is not a compatibility wrapper for an in-scope replacement.
- Treat removal as first-class design work: no new parallel websocket event type, no frontend-specific Codex/Claude compaction event channel, and no storage bypass will be introduced.
- Decision rule: the design rejects dual frontend transports. Provider compaction must use the existing `COMPACTION_STATUS` boundary.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Codex app-server `item/started contextCompaction` | Frontend compaction activity row in started phase | Codex runtime event conversion + generic stream mapper | Makes provider compaction visible immediately without rotating raw traces. |
| DS-002 | Primary End-to-End | Codex app-server `item/completed contextCompaction` or raw `context_compaction` | Raw trace rotation segment + frontend completed activity | Codex runtime event conversion + ProviderCompactionBoundaryRecorder | Captures the completed provider boundary and keeps memory storage analyzable. |
| DS-003 | Primary End-to-End | Claude SDK `status_compacting` / `compact_boundary` | Frontend started/completed provider activity and existing rotation behavior | ClaudeSessionEventConverter + generic stream mapper | Regression spine proving the shared provider compaction UI path remains consistent. |
| DS-004 | Return-Event | `AgentRunEventType.COMPACTION_STATUS` | Websocket `COMPACTION_STATUS` consumed by frontend | AgentRunEventMessageMapper | This is the cross-runtime frontend-visible event contract. |
| DS-005 | Bounded Local | Provider boundary event received by runtime memory accumulator | Raw trace marker append and optional rotation | ProviderCompactionBoundaryRecorder | Ensures non-rotating start events and rotating completed boundaries are handled centrally. |
| DS-006 | Primary End-to-End | Durable `provider_compaction_boundary` raw trace | Hydrated frontend compaction activity after reopen | Run-history projection/hydration | Preserves user visibility after run history reload. |

## Primary Execution Spine(s)

- Codex start visibility: `Codex app-server item/started contextCompaction -> CodexThreadEventConverter -> Codex provider compaction status event -> AgentRunEventMessageMapper -> frontend compaction activity projection`.
- Codex completed boundary: `Codex app-server item/completed contextCompaction/raw context_compaction -> CodexThreadEventConverter -> completed provider boundary event -> ProviderCompactionBoundaryRecorder -> raw trace segment rotation -> websocket/frontend completed activity`.
- Shared frontend contract: `Runtime AgentRunEventType.COMPACTION_STATUS -> AgentRunEventMessageMapper -> ServerMessageType.COMPACTION_STATUS -> handleCompactionStatus -> AgentActivityStore`.

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | Codex announces context compaction start through normal item lifecycle; backend emits a non-rotating provider status so users see the activity. | Codex app-server, CodexThreadEventConverter, AgentRunEventMessageMapper, frontend projection | CodexThreadEventConverter for runtime recognition | Item type normalization, activity identity stability, no raw-trace rotation. |
| DS-002 | Codex announces context compaction completion; backend emits a completed provider boundary; recorder appends marker and rotates active raw traces before that marker. | Codex app-server, CodexThreadEventConverter, ProviderCompactionBoundaryRecorder, RunMemoryWriter, frontend projection | CodexThreadEventConverter for event creation; recorder for persistence | Completed-surface dedupe, boundary key construction, raw response duplicate handling. |
| DS-003 | Claude provider compaction already emits compacting/compacted status; existing behavior is kept and covered through frontend projection. | ClaudeSessionEventConverter, AgentRunEventMessageMapper, frontend projection | ClaudeSessionEventConverter | Started-to-completed activity merge by provider event identity. |
| DS-004 | Generic streaming maps every compaction status run event into the same websocket message regardless of runtime. | AgentRunEventMessageMapper, team mapper, websocket clients | AgentRunEventMessageMapper | Turn id normalization and team member identity augmentation. |
| DS-006 | Recorded provider markers become durable compaction activities during run projection and are hydrated by frontend activity store. | Raw trace projection, run projection, frontend hydration | Run-history projection | Conversation replay excludes compaction activity entries. |

## Spine Actors / Main-Line Nodes

- Codex app-server notification stream.
- Codex runtime event converter.
- Provider compaction event payload builder/classifier.
- Runtime memory recorder.
- Generic agent/team websocket mapper.
- Frontend compaction activity projection.
- Run-history projection/hydration.

## Ownership Map

- `CodexThreadEventConverter`: governs Codex notification dispatch, Codex provider compaction event creation, runtime-level dedupe window for duplicate completed boundary surfaces, and runtime metadata derivation.
- `CodexItemEventConverter`: owns `item/*` event conversion behavior but should delegate compaction status creation through a context function instead of building payloads locally.
- `CodexRawResponseEventConverter`: owns raw response item conversion but should delegate completed compaction boundary creation through the same classifier/event function.
- New Codex compaction classifier: owns normalized item-type decisions (`contextcompaction`, legacy `compaction`, trigger exclusion) so item and raw response converters cannot drift.
- `ProviderCompactionBoundaryRecorder`: governs provider marker persistence, durable dedupe against existing recorded state, and rotation on `rotation_eligible`.
- `AgentRunEventMessageMapper`: governs websocket message mapping for `AgentRunEventType.COMPACTION_STATUS`.
- Frontend `compactionActivityProjection`: governs live user-visible compaction activity identity, phase, and message.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `convertCodexItemEvent(...)` | `CodexThreadEventConverter` context plus item converter | Converts one `item/*` notification into one or more run events. | Provider boundary payload construction, completed-boundary dedupe window, storage policy. |
| `convertCodexRawResponseEvent(...)` | `CodexThreadEventConverter` context plus raw response converter | Converts raw response item completion into logs or provider boundaries. | Its own divergent compaction item type policy. |
| `convertTeamRunEventToServerMessage(...)` | `AgentRunEventMessageMapper` for member agent events | Adds team/member identity around generic run event messages. | Runtime-specific compaction mapping. |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Ad hoc raw-response-only `itemType === "compaction"` policy | It misses current `context_compaction` and would drift from item lifecycle handling. | Shared Codex compaction classifier. | In This Change | Replace with `isCompletedCodexCompactionItemType(...)` or equivalent. |
| Normal-segment handling for `item/started`/`item/completed contextCompaction` | These are provider compaction lifecycle events, not user-visible assistant text/tool segments. | Codex provider compaction status event path. | In This Change | Prevent synthetic/empty text segment end for compaction items. |
| Candidate new websocket provider-compaction event type | Would duplicate existing `COMPACTION_STATUS` frontend contract. | `AgentRunEventType.COMPACTION_STATUS` -> `ServerMessageType.COMPACTION_STATUS`. | In This Change | Explicitly rejected. |

## Return Or Event Spine(s) (If Applicable)

- Runtime event return spine: `CodexThreadEventConverter/ClaudeSessionEventConverter/AutoByteusStreamEventConverter -> AgentRunEventType.COMPACTION_STATUS -> AgentRunEventMessageMapper -> websocket COMPACTION_STATUS -> frontend handler`.
- Historical event return spine: `provider_compaction_boundary raw trace -> historical replay compaction event -> run projection activity -> frontend hydration -> AgentActivityStore`.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `ProviderCompactionBoundaryRecorder`.
  - Chain: `parse provider payload -> check complete/active/seen boundary state -> append marker -> rotate only if rotation_eligible -> remember key`.
  - Why it matters: Codex start events may be non-rotating and completion events may arrive through multiple surfaces; storage must remain centralized.
- Parent owner: `CodexThreadEventConverter`.
  - Chain: `build provider payload -> exact key dedupe -> completed-window dedupe -> create COMPACTION_STATUS event`.
  - Why it matters: start/progress events must not suppress later completed boundary events, while duplicate completed surfaces must still dedupe.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Codex item type normalization | DS-001, DS-002 | Codex event conversion | Normalize `contextCompaction`, `context_compaction`, `compaction`, `compaction_trigger`. | Prevent repeated string logic and drift. | Converters would diverge again. |
| Completed-boundary dedupe | DS-002 | CodexThreadEventConverter | Dedupe `thread/compacted`, `item/completed`, raw `context_compaction`, raw `compaction`. | Avoid duplicate markers/segments. | Storage receives duplicated completed boundary events. |
| Frontend activity identity | DS-001, DS-003, DS-004 | Frontend compaction projection | Merge provider compacting -> compacted rows using provider event/session/turn identity. | Keeps user-visible history stable. | Runtime converters would leak UI activity policy. |
| Raw trace rotation | DS-002, DS-005 | ProviderCompactionBoundaryRecorder/RunMemoryWriter | Append markers and rotate active traces only on eligible boundary. | Keeps storage layout centralized. | Runtime converters would bypass storage invariant. |
| Historical projection | DS-006 | Run-history projection | Convert durable provider markers into compaction activities. | Reopen/history visibility. | Frontend would fabricate history from latest status. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Runtime compaction status stream | `AgentRunEventType.COMPACTION_STATUS` and mapper | Reuse | Already supports raw AutoByteus, Claude, team streams, and frontend handler. | N/A |
| Provider boundary persistence | `ProviderCompactionBoundaryRecorder` | Reuse | Already dedupes storage state and rotates eligible boundaries. | N/A |
| Codex compaction item classification | Codex backend event conversion | Extend | Existing parser normalizes item type; but no owned classifier for compaction semantics. | N/A |
| Frontend visible row | `compactionActivityProjection` / `AgentActivityStore` | Reuse | Already handles provider fields, statuses, and activity rows. | N/A |
| Historical/reopen visibility | run-history projection and hydration | Reuse | Already projects provider boundary traces into activities. | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Codex backend event conversion | Recognize current Codex compaction lifecycle and emit provider status/boundary events. | DS-001, DS-002 | CodexThreadEventConverter | Extend | Main code change. |
| Agent memory recording | Persist provider markers and rotate raw traces. | DS-002, DS-005 | ProviderCompactionBoundaryRecorder | Reuse | No storage redesign. |
| Agent streaming | Websocket `COMPACTION_STATUS` mapping. | DS-004 | AgentRunEventMessageMapper | Reuse | Add/keep coverage only. |
| Frontend agent streaming | Live compaction projection into activity store. | DS-001, DS-003, DS-004 | compactionActivityProjection | Reuse | Add/keep coverage only unless tests reveal a narrow gap. |
| Run history | Durable compaction activity projection/hydration. | DS-006 | raw-trace projection and hydration services | Reuse | Coverage assurance. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-compaction-event-classifier.ts` | Codex backend event conversion | Codex compaction classification | Normalize and classify Codex compaction item types and lifecycle surfaces. | Dedicated Codex-only policy shared by item/raw converters. | Reuses existing normalized tokens from parser/tool family if exported or duplicated minimally. |
| `codex-thread-event-converter.ts` | Codex backend event conversion | Codex provider event creation | Build provider status/boundary payloads and own completed-boundary dedupe. | Already owns runtime metadata, run id, and create-event boundary. | Uses classifier. |
| `codex-item-event-converter.ts` | Codex backend event conversion | Item event conversion | Route `item/started` and `item/completed contextCompaction` to provider compaction context function. | Keeps item-specific dispatch local. | Uses classifier through context or local import. |
| `codex-raw-response-event-converter.ts` | Codex backend event conversion | Raw response item conversion | Route `context_compaction` and legacy `compaction` completion to completed provider boundary function; ignore trigger. | Keeps raw response log/boundary conversion local. | Uses classifier. |
| `memory-recording-models.ts` | Agent memory domain | Provider boundary payload type | Optionally document new Codex source surfaces in union. | Type contract location for recorder payload. | N/A |
| Server/frontend tests | Coverage | Durable behavior verification | Prove conversion, dedupe, memory rotation, websocket mapping, frontend projection, historical hydration. | Existing test suites already align with each boundary. | N/A |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Codex compaction item-type classification | `codex-compaction-event-classifier.ts` | Codex backend event conversion | Used by item and raw response converters. | Yes | Yes | A generic provider-compaction policy for Claude/AutoByteus. |
| Provider boundary payload shape | Existing `ProviderCompactionBoundaryPayload` | Agent memory domain | Already the persisted boundary contract. | Yes | Yes | Runtime-specific DTO fork. |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `ProviderCompactionBoundaryPayload` | Yes | Yes | Low | Keep existing fields. Add new source-surface literals only if useful for TypeScript clarity. |
| Codex classifier result | Yes | Yes | Low | Keep result as simple predicates or a small discriminated lifecycle enum, not a broad payload builder. |
| Frontend `CompactionStatusPayload` | Yes | Yes | Low | No new fields required. Existing provider/source/boundary/runtime fields are sufficient. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-compaction-event-classifier.ts` | Codex backend event conversion | Codex compaction classifier | `isCodexContextCompactionItemType`, `isCodexCompletedCompactionItemType`, `isCodexCompactionTriggerItemType` or equivalent. | Prevents repeated item-type policy. | Existing normalized item type strings. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-thread-event-converter.ts` | Codex backend event conversion | Codex provider event builder | Add source surfaces, lifecycle-aware payload builder, and completed-boundary-only window dedupe. | It already owns run id, thread metadata, and event creation. | Classifier and provider payload type. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-item-event-converter.ts` | Codex backend event conversion | Codex item dispatch | Early-route `item/started contextCompaction` and `item/completed contextCompaction` before normal segment/tool conversion. | Prevents compaction items becoming fake text segment starts/ends. | Classifier/context function. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-raw-response-event-converter.ts` | Codex backend event conversion | Raw response dispatch | Recognize `context_compaction` as completed boundary and keep `compaction_trigger` ignored. | Keeps raw-response tool log behavior separate. | Classifier/context function. |
| `autobyteus-server-ts/src/agent-memory/domain/memory-recording-models.ts` | Agent memory domain | Provider boundary payload contract | Optional source-surface literal expansion for Codex start/completed item lifecycle. | Type clarity only; recorder accepts string already. | Provider payload. |
| Existing tests under `autobyteus-server-ts/tests` and `autobyteus-web/services/.../__tests__` | Coverage | Test boundaries | Add/update tests described below. | Aligns tests with existing ownership. | N/A |

## Ownership Boundaries

Runtime converters decide what a provider event means. They must not decide how markers are stored, how raw files rotate, or how the frontend renders activities. `ProviderCompactionBoundaryRecorder` decides storage and rotation based on `rotation_eligible`. `AgentRunEventMessageMapper` decides websocket protocol mapping. Frontend `compactionActivityProjection` decides visible phase, row identity, and user-facing message.

For Codex, `CodexThreadEventConverter` is the authoritative boundary for provider compaction payload creation and completed-boundary dedupe. Item/raw converters are subordinate dispatchers that ask the thread converter context to create the event.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `CodexThreadEventConverter` | Provider payload builder, Codex boundary key/window dedupe, event creation | Codex item/raw converters | Item/raw converters building provider payloads directly. | Add context methods for lifecycle/completed compaction events. |
| `ProviderCompactionBoundaryRecorder` | Marker append, durable dedupe, rotation | Runtime memory accumulator | Runtime converter writing raw traces or rotating files directly. | Extend provider payload if needed. |
| `AgentRunEventMessageMapper` | Run event to websocket message conversion | Agent and team stream handlers | Runtime-specific websocket message construction for compaction. | Add mapper normalization/coverage. |
| `compactionActivityProjection` | Frontend activity identity and phase/message normalization | Frontend websocket handlers and hydration | Codex/Claude-specific UI row construction in websocket handler. | Extend projection if provider fields are insufficient. |

## Dependency Rules

- Codex item/raw converters may depend on the Codex compaction classifier and their converter context.
- Codex item/raw converters must not import memory recorder or frontend code.
- `CodexThreadEventConverter` may create `AgentRunEventType.COMPACTION_STATUS` payloads but must not write raw traces.
- Memory recorder depends only on generic provider boundary payload shape, not Codex converter internals.
- Stream handlers must continue to map through `AgentRunEventMessageMapper`.
- Frontend must continue to consume `COMPACTION_STATUS`, not a Codex/Claude-specific websocket message.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `CodexItemEventConverterContext.createCompactionStatusEvent(...)` or equivalent | Codex provider compaction lifecycle | Request lifecycle/progress or completed boundary event creation from item converter. | source surface + payload + lifecycle/status/rotation eligibility | Exact signature can be small, but item converter must not build payload. |
| `CodexRawResponseEventConverterContext.createCompactionBoundaryEvent(...)` | Codex completed boundary | Request completed boundary event from raw response converter. | source surface + payload | Extend source surface union to include current raw response type. |
| `ProviderCompactionBoundaryPayload` | Provider marker persistence | Storage contract for provider compaction status/boundary events. | `boundary_key`, `runtime_kind`, `provider`, `source_surface`, `rotation_eligible` | Existing shape remains valid. |
| `AgentRunEventMessageMapper.map(event)` | Websocket protocol | Map run event to websocket message. | `AgentRunEventType.COMPACTION_STATUS` | No runtime-specific split. |
| `projectCompactionStatusToActivity(payload, input)` | Frontend visible activity | Normalize payload into latest state and activity row. | provider/session/event/boundary/turn ids | Existing provider operation identity behavior should be covered. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| Codex context compaction classifier | Yes | Yes | Low | Classify normalized item type only. |
| Codex provider event builder | Yes | Yes | Medium | Ensure start boundary key cannot suppress completed boundary; keep provider_event_id stable for frontend merge. |
| Provider recorder payload | Yes | Yes | Low | Use existing explicit provider and boundary fields. |
| Frontend compaction projection | Yes | Yes | Low | Existing provider operation identity path is adequate. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Codex compaction classifier | `codex-compaction-event-classifier.ts` | Yes | Low | Keep Codex-specific. |
| Start source surface | `codex.context_compaction_started` | Yes | Low | Use only for `item/started contextCompaction`. |
| Completed source surface | `codex.context_compaction_completed` | Yes | Low | Use only for `item/completed contextCompaction`. |
| Raw response completed source | `codex.raw_response_compaction_item` | Mostly | Low | Existing name can cover `compaction` and `context_compaction`; no forced rename. |

## Applied Patterns (If Any)

- Classifier pattern inside Codex event conversion: centralizes item-type semantic classification without becoming a generic runtime facade.
- Event projection pattern: runtime events stay backend-owned until mapped to generic websocket message and frontend projection.
- Bounded local dedupe window: Codex converter maintains recent emitted completed boundary keys/windows to prevent duplicate completed surfaces.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/backends/codex/events/` | Folder | Codex backend event conversion | Runtime-specific event conversion files. | Existing location for Codex event conversion. | Generic memory/frontend policy. |
| `.../codex-compaction-event-classifier.ts` | File | Codex compaction classifier | Shared Codex item-type predicates/lifecycle classification. | Same folder as event converters that consume it. | Provider payload construction or storage logic. |
| `.../codex-thread-event-converter.ts` | File | Codex event conversion boundary | Lifecycle-aware provider compaction event creation and dedupe. | Existing top-level converter and event factory owner. | Raw-trace writes or frontend row logic. |
| `.../codex-item-event-converter.ts` | File | Codex item conversion | Route current contextCompaction item lifecycle. | Existing `item/*` dispatcher. | Duplicate boundary-key builder. |
| `.../codex-raw-response-event-converter.ts` | File | Codex raw response conversion | Route raw `context_compaction` completed boundary and ignore trigger. | Existing raw response item dispatcher. | UI or storage code. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/events/codex-thread-event-converter.test.ts` | File | Unit conversion coverage | Current Codex lifecycle, raw response, dedupe, trigger non-boundary. | Existing Codex converter test. | Full storage integration assertions. |
| `autobyteus-server-ts/tests/integration/agent-memory/cross-runtime-memory-persistence.integration.test.ts` | File | Integration memory coverage | Raw trace marker/rotation behavior across Codex/Claude/AutoByteus. | Existing cross-runtime memory suite. | Frontend rendering assertions. |
| `autobyteus-server-ts/tests/unit/services/agent-streaming/agent-run-event-message-mapper.test.ts` and team mapper tests if present/needed | File | Streaming contract coverage | Provider compaction payload remains websocket `COMPACTION_STATUS`. | Existing mapper coverage. | Runtime conversion details. |
| `autobyteus-web/services/agentStreaming/handlers/__tests__/agentStatusHandler.spec.ts` | File | Frontend live projection coverage | Codex/Claude provider status visible as compaction activities. | Existing handler/projection tests. | Backend event construction. |
| `autobyteus-web/services/runHydration/__tests__/runProjectionActivityHydration.spec.ts` | File | Historical hydration coverage | Durable provider compaction activities hydrate correctly. | Existing hydration test. | Live websocket details. |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| Codex events folder | Main-Line Domain-Control | Yes | Low | Runtime conversion files are already grouped here. |
| Agent memory services/store | Persistence-Provider | Yes | Low | Reused as-is. |
| Agent streaming services | Transport | Yes | Low | Reused as-is for generic message mapping. |
| Frontend agentStreaming handlers | Transport/projection boundary | Yes | Low | Reused as-is for live events. |
| Run hydration services | Historical projection | Yes | Low | Reused as-is for durable activities. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Codex start event | `item/started contextCompaction -> COMPACTION_STATUS { provider: "codex", status: "compacting", rotation_eligible: false }` | Treating start as `SEGMENT_START text` or rotating raw traces. | Users see progress without corrupting storage boundaries. |
| Codex completed event | `item/completed contextCompaction -> COMPACTION_STATUS { provider: "codex", status: "compacted", rotation_eligible: true }` | Waiting only for `turn/completed` or deprecated `thread/compacted`. | Official app-server docs identify item lifecycle as compaction progress. |
| Frontend path | `COMPACTION_STATUS -> handleCompactionStatus -> compaction activity` | New `CODEX_COMPACTION_STATUS` websocket event. | Keeps AutoByteus/Codex/Claude behavior consistent. |
| Dedupe | Completed `thread/compacted` + completed `raw context_compaction` in same thread/turn produce one completed boundary. | Start event suppresses later completed event through same dedupe window. | Start/progress and completed boundary are different lifecycle phases. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| New provider-specific websocket event | User asked whether Codex/Claude compaction should be sent to frontend. | Rejected | Use existing `COMPACTION_STATUS` event path. |
| Infer compaction from raw trace size/token count | Could detect missing provider events indirectly. | Rejected | Only rotate on explicit provider lifecycle/boundary events. |
| Treat `compaction_trigger` as completed boundary | It is a compaction-related item type. | Rejected | Ignore for boundary/rotation until proven completed by provider contract. |
| Keep contextCompaction as normal segment event | Existing behavior falls through this way. | Rejected | Route to provider compaction status/boundary event. |

## Derived Layering (If Useful)

- Runtime layer: AutoByteus/Codex/Claude converters produce `AgentRunEvent`.
- Persistence layer: memory recorder consumes `AgentRunEvent` and writes raw traces/segments.
- Transport layer: stream mappers convert run/team events to websocket messages.
- Presentation projection layer: frontend handler/projection turns compaction payloads into activities.
- Historical projection layer: raw traces become replay/activity entries for hydration.

## Migration / Refactor Sequence

1. Add Codex compaction classifier under Codex event conversion.
2. Extend Codex provider compaction event creation to support lifecycle/status and rotation eligibility:
   - start/progress event: `codex.context_compaction_started`, `status: "compacting"`, `rotation_eligible: false`;
   - completed item event: `codex.context_compaction_completed`, `status: "compacted"`, `rotation_eligible: true`;
   - raw response current/legacy completion: completed boundary;
   - deprecated thread compacted: completed boundary.
3. Adjust Codex completed-boundary dedupe so only completed/rotation-eligible boundary surfaces participate in boundary-window suppression. Start/progress events must not suppress later completed boundaries.
4. Route `item/started contextCompaction` and `item/completed contextCompaction` before normal item segment/tool conversion.
5. Route raw `context_compaction` as completed boundary and keep `compaction_trigger` ignored.
6. Update or extend provider payload type source-surface literals if TypeScript requires it.
7. Add unit tests for Codex converter lifecycle, trigger exclusion, and duplicate completed surfaces.
8. Add/update integration memory test for `item/completed contextCompaction` and raw `context_compaction` rotation; ensure start-only does not rotate.
9. Add/keep streaming mapper/team mapper coverage for provider compaction payload fields.
10. Add/keep frontend handler projection coverage for Codex and Claude provider compaction activities, including Claude started-to-completed identity merge.
11. Add/keep historical hydration coverage for provider compaction activities.

## Key Tradeoffs

- Reusing `COMPACTION_STATUS` avoids protocol expansion and keeps all runtimes visually consistent, but requires provider payload fields to carry enough identity. Existing fields are adequate.
- Recording non-rotating provider start markers through the recorder can preserve durable lifecycle history; completion must use a distinct boundary key or completed-only dedupe so the completed marker/rotation is not suppressed by the start marker.
- Retaining `thread/compacted` and raw `compaction` support adds multiple completed surfaces, but dedupe keeps storage stable and avoids losing older/deprecated notifications that may still appear.

## Risks

- Codex may emit start/completed items without stable item ids. Mitigation: build provider activity identity from provider/session/turn and keep completed boundary window dedupe for no-stable-id surfaces.
- If app-server drops terminal turn completion around compaction, relying on `item/completed contextCompaction` is still more precise than relying on `turn/completed`.
- If frontend subscription identity is wrong in a specific shell, backend mapper/projection tests may pass while the UI still misses events. That would be a downstream subscription bug, not runtime conversion; the current task should cover mapper and projection boundaries enough to localize it.

## Guidance For Implementation

- Prefer a small Codex-specific classifier over scattered string checks:
  - normalize `contextCompaction` and `context_compaction` to `contextcompaction`;
  - classify `contextcompaction` as current lifecycle;
  - classify `compaction` and `contextcompaction` as completed raw response boundary types;
  - classify `compactiontrigger` as non-boundary.
- Start/progress event identity should use the same `provider_event_id` as completion when available so frontend can merge rows, but its `boundary_key` should not collide with the completed boundary key if the recorder will persist the start marker.
- Completed-boundary dedupe should continue to collapse duplicate completed reports across `thread/compacted`, `item/completed contextCompaction`, raw `context_compaction`, and raw legacy `compaction`.
- Do not add a new websocket message type. Ensure tests show the existing `COMPACTION_STATUS` payload keeps `provider`, `source_surface`, `boundary_key`, `runtime_kind`, `turn_id`, and `rotation_eligible`.
- Do not modify raw trace file layout.
