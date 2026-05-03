# Design Spec

## Current-State Read

The Claude Agent SDK runtime currently turns provider chunks into AutoByteus runtime events inside `ClaudeSession.executeTurn()`. Tool lifecycle events are extracted by `ClaudeSessionToolUseCoordinator` from raw Claude `tool_use` / `tool_result` content blocks and already use provider tool invocation ids. Text events take a different path: `normalizeClaudeStreamChunk()` returns only `delta/source/sessionId`, `ClaudeSession` emits every text delta with `id: options.turnId`, and the end of the turn emits a single `ITEM_OUTPUT_TEXT_COMPLETED` with that same turn id and the aggregate `assistantOutput`.

`ClaudeSessionEventConverter` then maps those Claude events to `SEGMENT_CONTENT` / `SEGMENT_END` with `segment_type: "text"`, preserving the id. The websocket mapper and team stream handler forward those segment payloads without changing identity. On the frontend, `handleSegmentContent()` correctly finds existing stream segments by `segment_type:id` and appends new deltas to the existing segment. This is correct generic behavior, but the Claude backend is giving distinct text units the same text id. Therefore a common sequence like `assistant text A -> tool -> assistant text B` can render as one earlier text segment containing A+B above the tool cards.

The target design must respect these constraints:

- The frontend segment handler remains generic and coalesces by stream identity.
- Runtime/provider-specific identity extraction stays in the Claude backend/session layer.
- Existing Codex provider-id-based behavior remains unchanged.
- Single-agent and team stream paths share the same server event payload shape.
- Durable memory/history should receive separate segment boundaries when text is separate in provider order.

## Intended Change

Introduce a Claude-owned text segment projector/tracker under the Claude session capability area. It will derive UI-facing text segment ids from Claude provider assistant message/content-block identity, emit text deltas with those ids, and close each text segment at the provider text boundary. `ClaudeSession` will stop using the whole turn id as the text segment id and will stop emitting one aggregate text segment completion for the entire turn. The aggregate `assistantOutput` can remain an internal session-cache/result-dedupe accumulator, but it must no longer be the authoritative UI segment identity or completion boundary.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix
- Current design issue found (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes
- Evidence: `ClaudeSession.executeTurn()` emits text deltas/completion with `id: options.turnId`; `normalizeClaudeStreamChunk()` strips provider block identity; frontend coalesces by `segment_type:id`; raw Claude SDK chunks expose provider message ids, wrapper uuids, and content-block indices.
- Design response: Add a Claude text segment projector/tracker behind the `ClaudeSession` boundary and make it the sole owner of text segment id derivation, per-segment text lifecycle, and result/partial/full-message dedupe for UI-facing text events.
- Refactor rationale: A one-line id tweak in `ClaudeSession` is not sufficient because the current normalizer has already collapsed identity and completion is emitted only once per turn. The segment identity invariant must be enforced before events leave the Claude session boundary.
- Intentional deferrals and residual risk, if any: Full run-history projection parity for Claude tool cards may remain outside this change if the live stream and raw memory traces are corrected. If deferred, record that run-history projection still depends on SDK session messages and may not yet replay tool cards identically to live focus rendering.

## Terminology

- `Claude text segment`: one UI/durable assistant text unit derived from a Claude assistant message text block or partial content block.
- `Provider text identity`: Claude message id or wrapper uuid plus content-block index; used to build a stable AutoByteus stream segment id.
- `Turn id`: AutoByteus turn lifecycle id. It scopes events but is not a text segment id.
- `Projector`: the Claude-owned mechanism that translates raw Claude text-bearing chunks into `ClaudeSessionEventName.ITEM_OUTPUT_TEXT_DELTA` / `ITEM_OUTPUT_TEXT_COMPLETED` events with explicit ids.

## Design Reading Order

Read this design from:

1. the live stream data-flow spine,
2. the Claude session ownership boundary,
3. the text projector file responsibility,
4. the converter/websocket/frontend contract that remains unchanged,
5. validation and migration sequencing.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove/decommission the old Claude UI-facing text path that uses `options.turnId` as the segment id and emits one aggregate `ITEM_OUTPUT_TEXT_COMPLETED` for the whole turn.
- This design must not introduce a frontend compatibility branch such as "if Claude and text id equals turn id, force a new segment after tools". That would preserve the broken backend identity model and make the generic renderer runtime-specific.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | User agent turn | Focus/conversation rendered segments | Claude session boundary plus generic streaming pipeline | This is the observed bug path: Claude provider chunks become rendered text/tool segments. |
| DS-002 | Bounded Local | Raw Claude chunk in `ClaudeSession` | Claude text segment events | Claude text segment projector | This local projection enforces the missing text identity invariant. |
| DS-003 | Return-Event | Claude session event | Browser websocket message and frontend handler | Runtime event conversion/streaming services | The converter/mappers must preserve corrected ids without adding runtime-specific policy. |
| DS-004 | Return-Event | `AgentRunEvent` stream | Runtime memory raw traces/snapshots | Runtime memory accumulator | Per-segment completion should preserve assistant/tool/assistant durable order. |

## Primary Execution Spine(s)

`User message -> ClaudeSession.sendTurn() -> Claude SDK query -> ClaudeSession chunk loop -> Claude text segment projector / tool lifecycle coordinator -> ClaudeSessionEventConverter -> Agent streaming mapper/team stream handler -> frontend segment handlers -> focus/history rendering`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | A user turn enters a Claude-backed session. The session starts the provider query, translates provider chunks into AutoByteus runtime events, the server forwards them, and the frontend appends/creates segments by stream identity. | User turn, Claude session, provider query, runtime event stream, frontend segment state | `ClaudeSession` governs provider-to-runtime translation; frontend segment handler governs generic rendering state | Tool lifecycle extraction, text identity projection, websocket serialization, memory accumulation |
| DS-002 | For every Claude text-bearing chunk, the projector resolves the provider text identity, emits deltas against that id, and closes the segment when the provider text unit ends. | Raw Claude text chunk, provider text identity, text segment lifecycle | New Claude text segment projector | Result dedupe, partial stream tracking, per-turn cleanup |
| DS-003 | Claude session events become `AgentRunEvent`s and websocket messages. Corrected ids pass through unchanged to both single-agent and team streams. | Claude session event, `AgentRunEvent`, websocket message | `ClaudeSessionEventConverter` and streaming services | Payload serialization, member metadata enrichment |
| DS-004 | The same segment events feed runtime memory. Distinct text ids and segment ends allow memory traces to flush text at actual boundaries instead of a whole-turn aggregate. | `AgentRunEvent`, memory accumulator segment state, raw trace writer | Runtime memory accumulator | Pending reasoning association, turn fallback for legacy/missing ids |

## Spine Actors / Main-Line Nodes

- `ClaudeSession.sendTurn()` / `executeTurn()`: owns turn lifecycle and provider query execution.
- Claude SDK query: external provider event source.
- Claude text segment projector: owns provider text identity and text segment lifecycle inside the session.
- `ClaudeSessionToolUseCoordinator`: owns provider tool lifecycle extraction and dedupe.
- `ClaudeSessionEventConverter`: owns Claude-session-event to `AgentRunEvent` mapping.
- Streaming mappers/handlers: own transport payload forwarding.
- Frontend segment handlers: own generic segment creation/coalescing/finalization.
- Runtime memory accumulator: owns durable trace accumulation from runtime events.

## Ownership Map

- `ClaudeSession` owns the authoritative boundary for Claude provider stream translation. Callers should receive Claude session events, not provider raw chunks or lower-level projector internals.
- The new Claude text segment projector owns text identity derivation, active text segment state, text delta emission, per-segment completion, and result-dedupe interaction for text output.
- `ClaudeSessionToolUseCoordinator` continues to own tool observation, approval lifecycle, and tool segment/lifecycle event dedupe.
- `ClaudeSessionEventConverter` remains a thin mapping boundary; it must not guess Claude text ids.
- Frontend segment handlers own generic stream identity coalescing; they must not infer Claude-specific order from turn ids.
- Runtime memory accumulator owns durable trace flushing from received segment events; it should benefit from explicit ids and ends but not become provider-specific.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `ClaudeSessionEventConverter.convert()` | Claude session event contract | Maps provider-runtime events into generic `AgentRunEvent`s | Claude provider text identity derivation |
| `AgentRunEventMessageMapper` | Agent streaming protocol | Serializes generic runtime events to websocket messages | Runtime-specific segment disambiguation |
| Frontend `handleSegmentContent()` | Frontend conversation segment state | Generic segment coalescing/append behavior | Claude-specific ordering repair |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| `ITEM_OUTPUT_TEXT_DELTA` emission with `id: options.turnId` in `ClaudeSession.executeTurn()` | It is the direct id collision causing post-tool text to append to pre-tool text | Claude text segment projector emits deltas with provider-derived ids | In This Change | Keep `turnId` as a scope field, not as text segment id. |
| Whole-turn `ITEM_OUTPUT_TEXT_COMPLETED` with `id: options.turnId` and aggregate `assistantOutput` | It delays/merges text boundaries and breaks durable ordering | Projector emits completion per text segment | In This Change | Do not emit an extra aggregate text end for UI. |
| Delta-only use of `normalizeClaudeStreamChunk()` as the text segment event source | It discards provider identity before the session emits UI events | Identity-aware projector/extractor | In This Change | Helper may remain only for non-identity content/result dedupe if tightened. |
| Any frontend Claude-specific reordering workaround | Would hide backend contract violation and introduce runtime-specific rendering policy | Correct backend segment ids | In This Change | Explicitly rejected. |

## Return Or Event Spine(s) (If Applicable)

- `ClaudeSessionEventName.ITEM_OUTPUT_TEXT_DELTA(id=providerTextSegmentId) -> ClaudeSessionEventConverter -> AgentRunEventType.SEGMENT_CONTENT(segment_type=text, id=providerTextSegmentId) -> AgentRunEventMessageMapper -> websocket SEGMENT_CONTENT -> frontend handleSegmentContent -> create/append correct text segment`
- `ClaudeSessionEventName.ITEM_OUTPUT_TEXT_COMPLETED(id=providerTextSegmentId) -> ClaudeSessionEventConverter -> AgentRunEventType.SEGMENT_END(segment_type=text, id=providerTextSegmentId) -> memory accumulator/frontend finalization`
- `ClaudeSessionToolUseCoordinator ITEM_ADDED/ITEM_COMPLETED/tool lifecycle events -> converter -> frontend tool cards/activity`

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `ClaudeSession`
  - Arrow chain: `raw chunk -> text-bearing entries -> provider text identity -> active text segment state -> delta event(s) -> segment completion -> cleanup`
  - Why it matters: This local state machine is where same-block deltas should coalesce while post-tool/new-message text gets a new id.
- Parent owner: `ClaudeSessionToolUseCoordinator`
  - Arrow chain: `tool_use/tool_result block -> observed invocation state -> segment/lifecycle start/end events -> observed invocation cleanup`
  - Why it matters: Text projection must preserve ordering relative to tool lifecycle events and not duplicate tool ownership.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Text result dedupe | DS-002 | Claude text segment projector / `ClaudeSession` | Avoid duplicate final `result` text after full assistant messages or stream deltas already emitted | Claude SDK can emit both assistant text and terminal result | If left as aggregate session logic, identity/completion stay turn-scoped |
| Partial stream event tracking | DS-002 | Claude text segment projector | Track message id/uuid and content block index for `stream_event` chunks | Installed SDK supports partial assistant stream events | If ignored, enabling partial messages can recreate id collision |
| Tool lifecycle dedupe | DS-001 | `ClaudeSessionToolUseCoordinator` | Keep raw tool observation and permission callback from double-emitting tool events | Existing coordinator already owns this | If moved to text projector, text/tool concerns become mixed |
| Websocket serialization | DS-003 | Streaming services | Preserve payloads and add team metadata | Transport concern separate from runtime identity | If used to fix identity, transport becomes runtime-policy owner |
| Runtime memory flushing | DS-004 | Runtime memory accumulator | Convert segment events to raw assistant/reasoning/tool traces | Durable state must follow event boundaries | If provider-specific, memory layer becomes coupled to Claude internals |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Claude provider text identity/lifecycle | Claude backend session subsystem | Extend | Identity belongs at provider adapter/session boundary with access to raw chunks | N/A |
| Generic segment conversion | Claude session event converter | Reuse | Converter already maps session events to generic events and should stay thin | N/A |
| Frontend rendering/coalescing | Web agent streaming handlers | Reuse unchanged | Handler is correct when backend ids are correct | N/A |
| Durable trace accumulation | Runtime memory subsystem | Reuse unchanged or with tests | It already tracks by explicit segment id | N/A |
| Provider-specific text segment projection file | None exact today | Create New | Current normalizer is delta-only and tool coordinator is tool-specific; new concern has its own state/invariant | Existing files would become mixed if they absorbed provider text identity state. |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Claude backend session | Provider query execution, session lifecycle, provider-to-runtime event translation | DS-001, DS-002 | `ClaudeSession` | Extend | Add text segment projector behind session boundary. |
| Claude backend events | Runtime event name/payload to `AgentRunEvent` mapping | DS-003 | `ClaudeSessionEventConverter` | Reuse | No provider id guessing here. |
| Agent streaming service | Websocket message serialization/fan-out | DS-003 | Stream handlers/mappers | Reuse | Same path for single and team. |
| Frontend agent streaming handlers | Generic stream segment state and activity projection | DS-001, DS-003 | `segmentHandler` | Reuse | Add contract regression if useful; no runtime branch. |
| Runtime memory | Raw trace/snapshot persistence from runtime events | DS-004 | `RuntimeMemoryEventAccumulator` | Reuse | May only need tests/evidence. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `claude-text-segment-projector.ts` | Claude backend session | Internal mechanism behind `ClaudeSession` | Resolve provider text identities, emit text deltas/completions, track active partial/full text segments | Single coherent concern: Claude text segment lifecycle | Uses Claude runtime `asObject/asString` helpers and event names |
| `claude-session.ts` | Claude backend session | Authoritative Claude session boundary | Drive query loop, call text projector and tool coordinator, retain assistant output cache | Keeps lifecycle owner thin by delegating text identity details | New projector |
| `claude-runtime-message-normalizers.ts` | Claude backend runtime normalizers | Normalization helpers | Keep or tighten generic session id/text extraction; avoid being authoritative for segment identity | Avoid mixing identity state into stateless normalizer | Possibly uses projector extraction types if extracted |
| `claude-session-tool-use-coordinator.ts` | Claude backend session | Tool lifecycle owner | Continue provider tool id handling; optionally expose block-level processing if needed for mixed content order | Tool-specific state remains separate from text-specific state | Existing observed tool invocation structures |
| `claude-session.test.ts` | Server unit tests | Claude session regression coverage | Deterministic text-tool-text fixture verifying distinct ids/order/completion | Existing session test area already mocks SDK query | N/A |
| `segmentHandler.spec.ts` or `toolLifecycleOrdering.spec.ts` | Frontend streaming tests | UI contract coverage | Verify distinct backend text ids produce `text, tool, text` ordering | Documents generic handler contract | N/A |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Claude text segment identity tuple | Keep inside `claude-text-segment-projector.ts` unless needed elsewhere | Claude backend session | Currently only projector/session need it | Yes | Yes | A generic cross-runtime optional-field DTO |
| Raw Claude object extraction helpers | Existing `claude-runtime-shared.ts` | Claude backend | Already provides `asObject`/`asString` | Yes | Yes | A broad SDK abstraction layer |
| Segment event payload shape | Existing Claude session event payloads + converter | Claude backend events | Existing event contract sufficient if id is correct | Yes | Yes | A parallel segment protocol |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| Proposed `ClaudeTextSegmentIdentity` | Yes | Yes | Low | Fields should be explicit: `segmentId`, `turnId`, `messageIdOrUuid`, `contentBlockIndex`, optional `source`. |
| `ITEM_OUTPUT_TEXT_DELTA` payload | Yes after fix | Yes | Low | `id` means text segment id; `turnId`/`turn_id` means turn scope only. Do not set them equal by default. |
| `assistantOutput` accumulator | Yes if internal only | Yes | Medium today | Keep as session cache/result-dedupe string only; do not expose as UI segment text completion. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-text-segment-projector.ts` | Claude backend session | Internal projector owned by `ClaudeSession` | Build provider-derived text segment ids, track active partial/full text blocks, emit `ITEM_OUTPUT_TEXT_DELTA` and `ITEM_OUTPUT_TEXT_COMPLETED`, dedupe terminal result text | Text segment identity/lifecycle is one stateful concern distinct from turn lifecycle and tool lifecycle | Claude runtime shared helpers/event names |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session.ts` | Claude backend session | Authoritative session boundary | Instantiate/use projector per turn, pass raw chunks in provider order, maintain assistantOutput/cache, emit turn lifecycle | Keeps session owner authoritative but avoids embedding text identity details | New projector |
| `autobyteus-server-ts/src/agent-execution/backends/claude/claude-runtime-message-normalizers.ts` | Claude backend runtime normalization | Stateless normalizer | Either narrow to session id/simple text extraction or export identity-preserving extraction helpers used by projector | Prevents delta-only shape from masquerading as segment lifecycle owner | Shared helpers only if semantically tight |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-tool-use-coordinator.ts` | Claude backend session | Tool lifecycle owner | Preserve current provider tool invocation id behavior; optionally add content-block processing API for mixed text/tool assistant messages | Tool identity remains separate from text identity | Existing observed invocation state |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/session/claude-session.test.ts` | Server tests | Session contract tests | Add regression for text-tool-text same-turn ordering and ids | Closest deterministic unit seam | N/A |
| `autobyteus-web/services/agentStreaming/handlers/__tests__/segmentHandler.spec.ts` or `toolLifecycleOrdering.spec.ts` | Frontend tests | Generic segment handler contract | Add regression that distinct text ids around a tool render in chronological segment order | Prevents accidental frontend coalescing change | N/A |
| Existing Codex tests in server/web | Codex runtime validation | Regression guard | Run targeted tests that exercise Codex text/reasoning/tool lifecycle | Ensures no cross-runtime identity regression | N/A |

## Ownership Boundaries

The authoritative boundary for provider-specific stream semantics is `ClaudeSession`. Anything above it must receive normalized Claude session events. The new text projector is an internal owned mechanism of that boundary; converters, websocket mappers, frontend handlers, and memory should not call it or know Claude provider id rules.

The boundary between text and tools remains explicit: `ClaudeTextSegmentProjector` owns text ids and text lifecycle; `ClaudeSessionToolUseCoordinator` owns tool ids and tool lifecycle. `ClaudeSession` coordinates both in provider chunk order.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `ClaudeSession` runtime events | Text segment projector, tool coordinator, query loop | Session manager/backend run orchestration | Converters/frontend reading raw Claude chunks to repair ids | Add/adjust Claude session event payloads |
| `ClaudeSessionEventConverter` | Event-type mapping helpers | Agent run event consumers | Converter deriving Claude text identities from `turnId` or payload guesses | Emit correct payload from `ClaudeSession` |
| Frontend segment handler | Segment identity store and append/finalize logic | Websocket message handlers | Claude-specific branch based on runtime kind | Fix backend ids or generic segment protocol if needed |
| Runtime memory accumulator | Segment/tool trace state | Memory writers/observers | Provider-specific Claude text id fallback | Ensure events include explicit ids and ends |

## Dependency Rules

- `ClaudeSession` may depend on the text projector and tool coordinator.
- The text projector may depend on Claude runtime shared helpers and event names, and receives an emit callback or returns events for `ClaudeSession` to emit.
- The text projector must not depend on frontend types, websocket mappers, or memory store types.
- `ClaudeSessionEventConverter` must depend only on Claude session event payloads, not raw SDK chunk shapes.
- Frontend handlers must not inspect Claude runtime kind to decide whether same ids should append.
- Runtime memory must remain provider-agnostic and use explicit segment ids from events.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `ClaudeTextSegmentProjector.processChunk(input)` (name illustrative) | Claude text segment lifecycle | Inspect raw chunk, emit/return text delta/end events, update projector state | `turnId`, `sessionId`, raw Claude chunk, optional current aggregate output state | Keep raw SDK parsing inside Claude backend. |
| `ClaudeTextSegmentProjector.finishTurn()` | Text segment cleanup | End any active text segment at turn completion/interruption as needed | Active provider text segment ids | Should not emit aggregate turn-id segment. |
| `ClaudeSession.emitRuntimeEvent()` | Claude session events | Publish normalized session events to listeners | Explicit text segment id + turn id | Existing public shape. |
| `ClaudeSessionEventConverter.convert()` | Generic runtime events | Convert `ITEM_OUTPUT_TEXT_*` to `SEGMENT_*` | Payload `id` is already segment id; `turnId`/`turn_id` scope only | No identity inference. |
| Frontend `handleSegmentContent()` | Rendered text segment state | Append or create segment by stream identity | `segment_type:id` | Correctly creates a new segment when post-tool text id differs. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| Text projector chunk processing | Yes | Yes after design | Low | Define segment id formula and turn id separately. |
| `ITEM_OUTPUT_TEXT_DELTA` payload | Yes | Yes after design | Low | Document/encode `id` as text segment id. |
| Frontend segment handler | Yes | Yes | Low | No change. |
| Current `normalizeClaudeStreamChunk()` | No for identity purposes | No | High | Stop using it as authoritative text segment event projection. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Provider text projection | `ClaudeTextSegmentProjector` | Yes | Low | Prefer concrete term over generic helper/tracker. |
| Provider tool lifecycle | `ClaudeSessionToolUseCoordinator` | Yes | Low | Keep as-is. |
| Turn lifecycle | `ClaudeSession` | Yes | Low | Keep as authoritative boundary. |
| Whole-turn output accumulator | `assistantOutput` | Mostly | Medium | Treat as internal aggregate only, not segment identity. |

## Applied Patterns (If Any)

- Bounded local state machine/projector: The text projector keeps active text segment state keyed by provider text identity, emits deltas as they arrive, and finalizes the active segment at content block/message boundaries.
- Thin converter: `ClaudeSessionEventConverter` remains a thin mapping layer from provider-runtime events to generic `AgentRunEvent`s.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/` | Folder | Claude session subsystem | Session lifecycle and provider stream mechanisms | Existing location for `ClaudeSession`, tool coordinator, config, MCP/session helpers | Frontend/websocket policy |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-text-segment-projector.ts` | File | Internal text projector | Provider-derived text segment id and lifecycle projection | Sibling of `ClaudeSession` and tool coordinator; scoped to session runtime | Generic protocol mapper or UI renderer logic |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session.ts` | File | Authoritative Claude session boundary | Use projector/coordinator, emit normalized events, manage query/turn/cache | Existing owner for turn execution | Detailed text block identity state after extraction |
| `autobyteus-server-ts/src/agent-execution/backends/claude/claude-runtime-message-normalizers.ts` | File | Stateless normalizers | Identity-preserving helper extraction only if needed; no lifecycle state | Existing Claude runtime helper area | Active segment state or event emission |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/session/claude-session.test.ts` | File | Server unit tests | Deterministic session regression | Existing tests already instantiate/mocks `ClaudeSession` | Live SDK-only assertions |
| `autobyteus-web/services/agentStreaming/handlers/__tests__/segmentHandler.spec.ts` | File | Frontend stream handler tests | Generic segment order contract | Existing handler tests | Claude runtime-specific branch logic |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `backends/claude/session/` | Main-Line Domain-Control with internal provider mechanisms | Yes | Low | The new projector is session-internal and belongs near the turn loop. |
| `backends/claude/events/` | Return/Event mapping | Yes | Low | Keep converter thin; no raw SDK parsing. |
| `services/agent-streaming/` | Transport/event delivery | Yes | Low | No runtime identity policy added. |
| `autobyteus-web/services/agentStreaming/handlers/` | Frontend streaming state | Yes | Low | No backend provider-specific policy added. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Segment id formula | `run-1:turn-2:claude-text:msg-post:0` for post-tool assistant text; `run-1:turn-2:claude-text:msg-pre:0` for pre-tool text | `id = run-1:turn-2` for both | Shows why post-tool text becomes a later distinct segment. |
| Same-block coalescing | Two deltas from `message id msg-7`, content block `0` both use `...:claude-text:msg-7:0` | Assigning a random id per delta | Preserves streaming append inside one text block. |
| Frontend contract | Backend sends `SEGMENT_CONTENT(text-pre-id)`, `SEGMENT_START(toolu-1)`, `SEGMENT_END(toolu-1)`, `SEGMENT_CONTENT(text-post-id)` and frontend segments are `[text, tool, text]` | Frontend sees `SEGMENT_CONTENT(turn-id)`, tool, `SEGMENT_CONTENT(turn-id)` and segments are `[text(A+B), tool]` | Directly mirrors the screenshot symptom. |
| Compatibility rejection | Replace the Claude turn-id path entirely | Add `if runtimeKind === CLAUDE && id === turnId then newSegmentAfterTool` in UI | Keeps provider identity ownership in backend. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep turn-id text segments and add sequence suffix only after a tool is seen | Small local patch | Rejected | Always derive text ids from provider message/block identity. |
| Frontend runtime-specific split/reorder for Claude text segments | Could hide screenshot symptom | Rejected | Backend emits semantically correct segment ids; frontend remains generic. |
| Emit both old aggregate turn-id completion and new per-segment completions | Might preserve old listeners | Rejected | Remove aggregate UI-facing completion; `turnId` remains only as event scope. |
| Fallback to turn id whenever provider identity is absent | Easy fallback | Rejected as default | Use wrapper uuid or bounded per-turn text sequence fallback; never collapse all text in a turn into one id. |

## Derived Layering (If Useful)

- Provider/runtime layer: Claude SDK query and raw chunks.
- Claude backend session layer: turn lifecycle, tool coordinator, text segment projector.
- Runtime event layer: Claude session event conversion to `AgentRunEvent`.
- Transport/UI layer: websocket forwarding and frontend generic segment rendering.
- Durable memory layer: provider-agnostic event accumulation.

The design relies on ownership boundaries rather than generic layers: identity is fixed in the Claude backend session layer because that is the first authoritative boundary with raw provider context.

## Migration / Refactor Sequence

1. Add a failing deterministic backend unit test in `claude-session.test.ts` for `assistant text A -> assistant tool_use -> user tool_result -> assistant text B -> result`, asserting:
   - text delta ids for A and B differ,
   - same-block deltas coalesce under one id,
   - event order preserves text/tool/text,
   - text completions are emitted for each text segment id rather than one aggregate turn-id completion.
2. Add `claude-text-segment-projector.ts` with identity extraction for:
   - full assistant message chunks: `message.id` or chunk `uuid` plus text content block index,
   - partial stream events: active message id/uuid plus `event.index`, handling `content_block_delta` and `content_block_stop`,
   - terminal result fallback: only emit if no prior assistant text covered the result, using a result-specific segment id.
3. Refactor `ClaudeSession.executeTurn()` to instantiate/reset the projector per turn, pass raw chunks through it, and collect returned text deltas for `assistantOutput`/session cache as needed.
4. Remove/decommission direct `ITEM_OUTPUT_TEXT_DELTA` emissions with `id: options.turnId` and the single aggregate `ITEM_OUTPUT_TEXT_COMPLETED` at turn end.
5. Ensure content-block order relative to tools:
   - If a full assistant chunk contains both text and tool blocks, emit text/tool events in the order of `message.content` entries, either by letting the session iterate blocks and call the text projector/tool coordinator by block or by extending the coordinator/projector APIs to process ordered block entries.
   - If implementation determines Claude chunks are one block per assistant message in current mode, still avoid a design that would reverse mixed content order when mixed chunks occur.
6. Add or update frontend handler contract test proving distinct text ids around a tool render as `text, tool, text`.
7. Add/adjust memory-focused validation if feasible: two text segment ids completed around a tool should write separate assistant traces in order.
8. Run targeted tests:
   - `autobyteus-server-ts` Claude session/projector tests,
   - Claude event converter tests if payload shape changed,
   - `autobyteus-web` segment handler/tool lifecycle tests,
   - targeted Codex runtime parser/tracker or existing unchanged-scope tests.
9. Record any environment limitation, especially missing `node_modules` in the dedicated worktree, in the implementation/validation handoffs.

## Key Tradeoffs

- A new projector file is more structure than a one-line id formula in `ClaudeSession`, but it gives the text identity/lifecycle invariant a clear owner and prevents the session loop from becoming a mixed turn/tool/text state blob.
- Keeping the frontend unchanged means the fix is rooted at the source of truth, but it requires backend tests to simulate the Claude provider sequence accurately.
- Supporting partial stream events in the projector adds some state even if current logs mostly show full assistant messages; this is warranted because the installed SDK type surface exposes partial content-block events and the same invariant must hold when partial streaming is enabled.

## Risks

- The exact raw chunk shapes can vary across Claude SDK versions. Mitigation: implement tolerant extraction with explicit tests for observed full assistant chunks and typed partial event shapes.
- Result chunks may duplicate already-emitted assistant text. Mitigation: keep content dedupe as projector/session internal state and test no duplicate final text segment is emitted.
- Mixed text/tool content arrays may expose existing ordering assumptions in `ClaudeSessionToolUseCoordinator`. Mitigation: preserve provider content-block order as part of the implementation sequence; do not let tool processing preempt earlier text blocks in the same message.
- Test tooling may be unavailable in the fresh worktree. Mitigation: install dependencies in the worktree or record/coordinate an approved prepared environment for validation.

## Guidance For Implementation

- Treat `id` in `ITEM_OUTPUT_TEXT_DELTA` and `ITEM_OUTPUT_TEXT_COMPLETED` as the text segment id. Treat `turnId`/`turn_id` as turn scope only.
- Prefer segment id shape: `${turnId}:claude-text:${providerMessageOrUuid}:${contentBlockIndex}`. If no provider message/uuid exists, use a bounded per-turn sequence such as `${turnId}:claude-text:anonymous:${sequence}` rather than the bare turn id.
- Preserve exact same id for multiple deltas from the same provider text block.
- Emit `ITEM_OUTPUT_TEXT_COMPLETED` for a text segment when its full assistant message block is consumed or when a partial content block stop is observed. Do not wait until the whole turn ends for all text.
- Keep `assistantOutput` if needed for session cache and terminal-result dedupe, but do not use it to emit a UI-facing aggregate completion.
- Do not add Claude-specific logic to `autobyteus-web` segment handlers or websocket mappers.
- Use raw log examples under `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/claude-sdk-tool-arguments-activity/logs/claude-raw-events/` as fixture inspiration, not as live test dependencies.
