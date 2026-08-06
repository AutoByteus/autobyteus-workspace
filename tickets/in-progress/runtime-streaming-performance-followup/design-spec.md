# Design Spec — Runtime Streaming Performance Follow-up

## Current-State Read

The supported production path is:

`runtime adapter -> AgentRun / TeamRun canonical events -> server agent/team WebSocket handler -> one JSON message per event -> frontend AgentStreamingService / TeamStreamingService -> 100 ms presentation scheduler -> segment projection -> rich Markdown renderer`.

The current design has two concrete pressure points documented in `investigation-notes.md` and `performance-evidence.md`:

1. **Cadence ownership is too late.** Each fine-grained `SEGMENT_CONTENT` event is mapped, serialized, sent, received, parsed, and routed before the renderer-owned 100 ms scheduler coalesces it. Standalone and team server handlers call `connection.send(...)` directly, while broadcasters and command helpers provide additional direct-send paths.
2. **Active text uses the completed-content renderer.** Every presented text/reasoning revision sends the full accumulated source through Markdown parsing, Prism/KaTeX handling, file/image discovery, sanitization, DOM reconciliation, and post-render effects. Existing `_streamSegmentIdentity.presentationComplete` state already distinguishes active from ended streamed segments, but `AIMessage.vue`, `TextSegment.vue`, and `ThinkSegment.vue` do not use it.

The internal `AgentRun` and `TeamRun` event streams also serve persistence, memory, lifecycle, application/external output, and other non-UI subscribers. They are authoritative domain/event boundaries and must remain fine-grained and unthrottled. The UI pressure concern therefore belongs at application-level server WebSocket egress, after message mapping and immediately before serialization/send—not in runtime adapters, the internal event bus, the low-level WebSocket library, or the frontend.

The existing server-settings path provides validated predefined settings, bound-node GraphQL reads/writes, immediate in-process `AppConfig` updates, and `.env` persistence. It can own the approved server-wide interval without a new storage subsystem or restart.

The target must preserve the existing single-message WebSocket schema, exact content, ordered semantic boundaries, reconnect/hydration behavior, raw traces, and run data. Current abrupt disconnect behavior has no event replay; this task must not claim to add it.

## Intended Change

Replace frontend-owned timed content presentation with configurable server-side WebSocket egress coalescing and a completion-aware frontend rendering split:

- Add one per-WebSocket-session `AgentStreamWebSocketEgress` owner shared by standalone and team streaming.
- Route every post-session outbound `ServerMessage` through that owner so no semantic event can bypass pending content.
- Coalesce only consecutive `SEGMENT_CONTENT` messages with equal non-`delta` payload identity, preserving ordered aggregate groups and never mutating the input message.
- Use one non-sliding configured interval, default 500 ms and validated from 100 through 2,000 ms.
- Flush before dependent/terminal messages; allow only explicitly classified control/telemetry companions to pass without collapsing the cadence, and seal the current aggregate tail whenever such a companion passes.
- Keep `AgentRun`/`TeamRun`, raw traces, persistence, and the WebSocket payload schema unchanged.
- Delete the frontend 100 ms scheduler and dispatch each server-shaped content message immediately through the existing single-mutation projection path.
- Render incomplete text/reasoning as safe Vue text with preserved whitespace; mount the existing rich `MarkdownRenderer` only when the stream segment or containing message is complete.
- Add a bound-node **Live response update interval (ms)** Settings card with save, validation, and reset-to-500 behavior.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind (`User`/`System`/`Operational`/`Contract`) | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | FR-001, FR-004, FR-006 / AC-001, AC-004, AC-006 | Run an agent/team while interacting with the workspace. | Renderer bursts and current topology in investigation BEH-001 and performance evidence. | Sustained streaming remains responsive while exact final state and lifecycle correctness remain intact. | Runtime -> internal run event -> mapped server message -> egress -> immediate frontend projection -> active/final renderer. DS-001, DS-003, DS-005. |
| BEH-002 | System | FR-002, FR-004, FR-008 / AC-002, AC-004, AC-008 | Continuous or bursty `SEGMENT_CONTENT`. | Current frontend fixed 100 ms scheduler; every raw message still crosses renderer. | One configured non-sliding server egress window, 500 ms default; no second frontend timer. | Mapped content -> egress local cadence -> WebSocket -> immediate projection. DS-001, DS-004. |
| BEH-003 | System | FR-003, FR-004, FR-005, FR-008 / AC-003, AC-004, AC-005, AC-008 | Fine-grained standalone/team internal stream events. | Server handlers send each event immediately; internal consumers need unchanged canonical streams. | Consecutive same-identity UI messages coalesce only at WebSocket egress; internal events stay unthrottled. | AgentRun/TeamRun -> mapper -> egress ordered groups -> socket. DS-001, DS-003, DS-004. |
| BEH-004 | User | FR-001, FR-005, FR-006 / AC-001, AC-005, AC-006 | Standalone/team, AutoByteus/Codex, visible/background, lifecycle variations. | Shared event model with runtime-specific upstream adapters and common UI projection. | One runtime-independent transport policy covers standalone/team without provider branches. | All runtime variants converge before egress and share the same egress boundary. DS-001. |
| BEH-005 | User | FR-007 / AC-007 | Observe incomplete and completed text/reasoning. | Full accumulated Markdown work occurs for every presented active revision. | Safe live text during streaming; existing rich Markdown once completion is known. | Segment content -> immediate state -> live text; segment/message completion -> MarkdownRenderer. DS-005. |
| BEH-006 | User | FR-008 / AC-008 | Read/change/reset interval in Settings for bound server. | Generic persisted settings exist; no cadence setting/card exists. | Effective 500 default, 100–2,000 validation, persistence, reset, bound-node isolation, and live effect on newly scheduled windows. | Settings card -> store/GraphQL -> server setting -> AppConfig -> next egress window. DS-002, DS-004. |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related Requirement / Acceptance-Criteria IDs (When Applicable) | Relationship To This Design | Status / Approval Applicability |
| --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-streaming-performance-followup/tickets/in-progress/runtime-streaming-performance-followup/performance-evidence.md` | Current process observations, event shape, code/settings path, and Markdown scaling evidence. | FR-001, FR-002, FR-003, FR-006, FR-007, FR-008 / AC-001, AC-002, AC-003, AC-006, AC-007, AC-008 | Constrains cadence default, ownership boundary, renderer split, metrics, and settings reuse. | `Current`; approval `N/A — evidence only`. |

## Task Design Health Assessment (Mandatory)

- Change posture: `Performance` plus bounded `Behavior Change` and `Refactor`.
- Current design issue found: `Yes`.
- Root cause classification: `Boundary Or Ownership Issue`, `Duplicated Policy Or Coordination`, and bounded `Local Implementation Defect`.
- Refactor needed now: `Yes`.
- Evidence: timed policy currently begins only after every content message reaches the renderer; server messages can be sent through handlers, broadcasters, and command helpers; active text uses the completed rich renderer; the measured full render grows to about 177 ms at 120k characters and about 399 ms at 240k characters.
- Design response: introduce one authoritative session egress boundary; remove all frontend cadence ownership; preserve internal events; split active and completed rendering; reuse typed settings persistence.
- Refactor rationale: adding another server timer while retaining direct-send bypasses or the frontend timer would duplicate policy, allow boundary reordering, and stack latency. A clean-cut owner plus deletion is required.
- Intentional deferrals and residual risk: no reconnect replay, adaptive cadence, wire batch envelope, incremental Markdown AST, generalized WebSocket backpressure, or per-run central broadcast coalescing. Per-session coalescing repeats small string work when multiple clients watch the same run, but correctly aligns buffer lifecycle with each connection and retains one shared policy implementation.

## Terminology

- **Outbound stream shaping:** deterministic reduction of UI-facing event frequency without slowing the runtime producer. It is not consumer-saturation backpressure.
- **WebSocket egress:** the application-level owner after `ServerMessage` mapping and before JSON serialization/socket send.
- **Ordered aggregate group:** one pending client-facing `SEGMENT_CONTENT` created from consecutive same-identity messages. Groups retain their original interleaving.
- **Control companion:** a message that may be sent immediately without requiring pending content to become visible first, such as a non-terminal running/initializing status or command acknowledgement.
- **Dependent boundary:** a message whose meaning or presentation requires all earlier content to be sent first, such as segment end, terminal status, tool/lifecycle transition, error, completion, or interruption.

## Design Reading Order

This design follows the required order: approved behavior and current reality; transition/removal decisions; spines and owners; interfaces and dependency rules; subsystem/file mapping; sequence, tradeoffs, risks, and implementation guidance.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: delete the frontend `StreamContentPresentationScheduler`, frontend flush policy, presentation receipt/batch types, batch projector, and scheduler-specific tests. Remove scheduler fields/imports/flush calls from standalone and team services.
- Server egress becomes the only timed cadence path. Do not retain a feature flag, dual path, runtime-provider exception, or fallback frontend timer.
- Preserve the existing `SEGMENT_CONTENT` wire schema directly; no compatibility wrapper or batch envelope is needed.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject, location, representative shape, and approximate volume: existing agent/team run data remains in its current stores; server settings are string key/value assignments in the selected node's existing `.env`. The new subject is one optional integer-string setting.
- Relevant code-model, serialization, semantic, or physical-store change: additive `AUTOBYTEUS_STREAMING_CONTENT_FLUSH_INTERVAL_MS`; no database, run-history, trace, memory, or WebSocket schema change.
- Normal reader/writer behavior and representative evidence: `AppConfig.get` reads process/config values; `AppConfig.set` updates in-memory/process values and persists `.env`; generic GraphQL mutation already writes predefined settings.
- Required semantics and invariants under direct use: absence or invalid direct environment input resolves safely to 500; valid saved integers persist; existing settings/run data remain readable unchanged.
- Physical-store, privacy/security, disposal/rebuild, and operational constraints: no secret data, bulk I/O, downtime, rewrite, or maintenance window. Bound-node isolation must remain intact.
- Decision: `Directly Usable — No Migration`.
- Decision rationale: existing `.env` and run data require no transformation. Treating an absent key as the effective default avoids pointless file churn and migration risk.
- Acceptance criteria or design constraints supported by this decision: FR-004, FR-005, FR-008 / AC-004, AC-005, AC-008.

### Migration Plan

N/A — no migration is required.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001, BEH-002, BEH-003, BEH-004 | Fine-grained runtime content event | Responsive visible standalone/team content | `AgentStreamWebSocketEgress` for client delivery; existing run/frontend owners on either side | Exposes the complete runtime-to-presentation pressure path and the corrected cadence boundary. |
| DS-002 | Primary End-to-End | BEH-006 | User edits bound-node Settings card | Persisted effective interval governs newly scheduled windows | Existing server settings service plus typed interval resolver | Establishes user control, persistence, node isolation, and live effect. |
| DS-003 | Return-Event | BEH-001, BEH-002, BEH-003 | Dependent/control server message | Ordered content-first or control-companion client delivery | `AgentStreamWebSocketEgress` | Makes boundary ordering and status classification explicit. |
| DS-004 | Bounded Local | BEH-002, BEH-003, BEH-006 | Egress receives client-facing content | Ordered aggregate groups serialized and sent | `AgentStreamWebSocketEgress` | Defines fixed-window, identity, timer, setting-read, cloning, and disposal invariants. |
| DS-005 | Return-Event | BEH-001, BEH-005 | Frontend receives shaped content/completion | Safe active text or final rich Markdown | Existing frontend streaming dispatch plus `AIMessage` presentation selection | Removes growing rich-render cost from the active loop without weakening final output. |

## Primary Execution Spine(s)

### DS-001 — Runtime content delivery

`Runtime backend -> AgentRun / TeamRun canonical publication -> agent/team message mapper -> AgentStreamWebSocketEgress -> WebSocket transport -> AgentStreamingService / TeamStreamingService -> segment projection -> live-text or final-Markdown presentation`

### DS-002 — Cadence setting

`Server Settings page -> LiveResponseStreamingCard -> serverSettings store / GraphQL -> ServerSettingsService -> AppConfig/.env -> typed effective-interval resolver -> next AgentStreamWebSocketEgress window`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | Fine-grained internal events remain unchanged. A mapped client message enters the session egress; content waits for its configured window while boundaries/control messages follow policy. The browser receives fewer larger deltas and projects each once. | Canonical run event, server message, session egress, frontend segment, presentation | Egress governs client delivery; existing owners govern internal event and UI state. | Mapping, identity comparison, settings resolution, performance evidence. |
| DS-002 | The user edits an effective millisecond value for the bound node. Server validation persists the canonical string and subsequent egress windows read the new effective value without socket/server restart. | Settings draft, persisted setting, effective interval | ServerSettingsService for mutation; typed resolver for runtime interpretation. | GraphQL codegen, localization, bound-node revision protection. |
| DS-003 | Every non-content message is classified. Dependent/terminal messages synchronously flush pending ordered groups before themselves; safe companions seal the aggregate tail and send without flushing. | Server message, pending content, socket order | AgentStreamWebSocketEgress | Status/lifecycle policy. |
| DS-004 | First content opens a non-sliding window using the current interval. Consecutive messages with equal non-delta payloads append only while the last cloned group remains open; different identities or intervening non-content messages create/seal ordered groups. Timer or explicit boundary snapshots and clears state before sends. | Pending group list, append eligibility, timer, effective interval | AgentStreamWebSocketEgress | Pure coalescing equality, error callback, fake timers. |
| DS-005 | Each shaped content message is immediately applied once. Streamed text/reasoning without completion identity uses escaped Vue text; segment end or message completion flips it to existing rich Markdown. Historical segments lacking stream identity are treated as complete. | Segment content, presentation-complete state, live/final component | AIMessage component selection; handlers own completion mutation. | Whitespace styling, file actions only in final Markdown, browser quality validation. |

## Spine Actors / Main-Line Nodes

- Runtime backend: emits provider/runtime-specific fine-grained source events; unchanged.
- `AgentRun` / `TeamRun`: owns canonical internal event lifecycle and subscribers; unchanged.
- Existing message mappers: produce canonical client-facing `ServerMessage`; unchanged schema.
- `AgentStreamWebSocketEgress`: authoritative per-session outbound message owner.
- Existing WebSocket connection: raw frame transport only.
- Frontend streaming service/dispatcher: parses, routes, and commits each shaped message immediately.
- `AIMessage` plus text/reasoning renderers: selects active safe text versus completed rich output.
- Server settings service/typed resolver: owns persisted mutation and effective interval interpretation.

## Ownership Map

- **AgentStreamWebSocketEgress** owns pending content state, input-message cloning, consecutive equality/coalescing, ordered groups, one non-sliding timer, message classification, flush-before-boundary sequencing, serialization, raw send invocation, and disposal.
- **AgentStreamHandler / AgentTeamStreamHandler** remain thin session and command orchestrators. They map events and call the egress; they do not own cadence or directly serialize post-session messages.
- **Agent/TeamStreamBroadcaster** retains run/team fan-out selection but stores a `ServerMessage` sink rather than a raw-string socket, so broadcast messages cannot bypass the egress.
- **Typed interval resolver** owns key/default/range parsing and fallback. The generic settings service owns mutation/persistence metadata, not runtime timer state.
- **Frontend streaming services** own protocol parsing/routing and immediate state projection only.
- **AIMessage** owns choosing a presentation component from existing segment lifecycle state. `LiveTextRenderer` owns only safe text display. `MarkdownRenderer` remains the sole rich final renderer.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `AgentStreamHandler` | `AgentRun` for domain events; `AgentStreamWebSocketEgress` for outbound delivery | Fastify/WebSocket session and command entrypoint | Content cadence, delta aggregation, or rich presentation. |
| `AgentTeamStreamHandler` | `TeamRun` for domain events; `AgentStreamWebSocketEgress` for outbound delivery | Team session/routing and command entrypoint | A separate team batching policy or direct post-session writes. |
| `AgentStreamingService` / `TeamStreamingService` | Existing handlers/projection state | Browser transport facade and message routing | Timed cadence or another pending-content queue. |
| `ServerSettingsManager` / Basics panel | ServerSettingsService and typed resolver | Bound-node configuration UI | Runtime interval interpretation duplicated in the client. |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-web/services/agentStreaming/presentation/StreamContentPresentationScheduler.ts` | Server egress owns the only timed window. | `AgentStreamWebSocketEgress` | In This Change | Delete, do not retain fallback. |
| `streamContentPresentationFlushPolicy.ts` | Boundary policy moves to authoritative server egress. | `agent-stream-websocket-egress-policy.ts` | In This Change | Server policy can inspect payload status. |
| `streamContentPresentationTypes.ts` | Receipt/batch types exist only for removed scheduler. | Existing `SegmentContentPayload` and `ServerMessage` | In This Change | Delete. |
| `streamContentBatchProjector.ts` | One server-shaped content message now follows normal immediate dispatcher mutation. | `AgentStreamingService.dispatchMessage` and `dispatchGenericTeamMemberMessage` | In This Change | Delete rather than keep one-item abstraction. |
| Scheduler/projector focused tests and service timer assertions | They validate obsolete frontend ownership. | Server egress tests plus immediate frontend dispatch tests | In This Change | Preserve behavioral tests, rewrite ownership-specific expectations. |
| Direct post-session `connection.send(message.toJson())` paths in handlers/helpers/broadcasters | They can bypass pending content and ordering policy. | `AgentStreamServerMessageSink.send(ServerMessage)` | In This Change | Pre-session rejection may still use raw connection because no egress state exists. |

## Return Or Event Spine(s) (If Applicable)

### DS-003 — Boundary/control delivery

`Mapped non-content ServerMessage -> egress policy -> (dependent: flush ordered content groups -> send message) OR (safe companion: seal pending aggregate tail -> send message immediately without draining timer/queue) -> frontend dispatch`

Terminal `AGENT_STATUS` values `idle`, `offline`, and `error` are dependent boundaries. `initializing` and `running` are control companions. `AGENT_COMMAND_ACK`, initial `CONNECTED`, and token-usage telemetry are companions. The default for unclassified non-content types is **flush before send**, preventing new semantic message types from silently bypassing content.

### DS-005 — Frontend active/final presentation

`Shaped SEGMENT_CONTENT -> immediate segment append/one presentation mutation -> presentationComplete=false -> LiveTextRenderer`; then `SEGMENT_END or message terminalization -> presentationComplete=true -> existing MarkdownRenderer`.

Historical/hydrated segments have no live stream identity and therefore resolve as complete/rich. `markConversationComplete` must mark any identified open segments complete as a fallback for supported completion/interruption/error paths that terminalize the message without a segment end.

## Bounded Local / Internal Spines (If Applicable)

### DS-004 — `AgentStreamWebSocketEgress`

Parent owner: `AgentStreamWebSocketEgress`.

`send(content) -> clone payload -> if append-eligible compare non-delta payload with last group -> append or add ordered group -> start timer only if absent -> intervening non-content seals append eligibility -> timer/explicit flush snapshots and clears queue/timer -> serialize/send groups in order -> future enqueue reads current setting for a new window`.

Key invariants:

- The timer is fixed-window/non-sliding; later deltas do not reset it.
- Input `ServerMessage` instances are never mutated because broadcasters may share one message across sinks.
- Coalescing compares the complete non-`delta` content payload rather than maintaining a second partial identity model. If any routing/metadata field differs, create a new ordered group.
- `A, B, A` remains three ordered groups; it is never rewritten as `AA, B`.
- Every non-content message is a merge barrier. `send-without-flush` keeps the current queue/timer but seals its tail, so `A:a1, running, A:a2` cannot become one `A:a1a2` aggregate.
- Snapshot/clear happens before raw sends so re-entrant sends cannot corrupt the active snapshot.
- `dispose()` cancels the timer and clears unsendable pending connection state. A boundary-triggered close while the socket is still writable calls `send(error/terminal)` through egress first, which flushes.
- The interval is read only when opening a new window. A saved setting therefore affects the next newly scheduled window and does not reschedule or lose an already pending window.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Message classification policy | DS-003, DS-004 | AgentStreamWebSocketEgress | Classify coalesce / flush-then-send / seal-then-send-without-flush. | Keeps lifecycle knowledge explicit and testable. | Inline duplicated switches in two handlers drift. |
| Non-delta payload comparison | DS-004 | AgentStreamWebSocketEgress | Decide whether consecutive content can combine without a parallel identity schema. | Exact routing safety and future protocol conservatism. | Handler-specific keys omit nested team identity. |
| Effective interval resolver | DS-002, DS-004 | Egress and ServerSettingsService | Default, parse, range, invalid fallback. | One runtime interpretation. | Scattered `process.env` reads or client-only validation diverge. |
| Broadcaster fan-out | DS-001, DS-003 | Existing broadcasters | Select sinks for run/team and send `ServerMessage`. | External messages/status share session ordering. | Raw-string send bypasses egress. |
| Completion fallback | DS-005 | Frontend lifecycle handlers | Mark identified segments presentation-complete when message terminalizes. | Guarantees final rich render on all supported terminal paths. | Component guesses from status independently. |
| Localization/accessibility | DS-002 | Settings card | Human-readable tradeoff, units, validation, labels, disabled/error states. | User-operable setting. | Raw environment key becomes the only UI. |
| Performance evidence | All | Downstream validation | Measure rates, queue age, CPU/lag, commit/render counts, equality. | Proves outcome without unconditional telemetry overhead. | Per-delta production logging recreates pressure. |

## Ownership Boundaries

The authoritative transport boundary is `AgentStreamWebSocketEgress.send(ServerMessage)`. Once a session has an egress, handlers, lifecycle subscribers, command helpers, and broadcasters must send through it. The raw connection remains available only for physical close and pre-session errors, when no content can be pending.

The internal run-event boundary remains authoritative for domain events. Egress consumes mapped messages and must not reach back into `AgentRun`, persistence, or runtime adapters.

The settings mutation boundary remains `ServerSettingsService.updateSetting`. The typed resolver is an interpretation concern used by both the settings query and egress; it does not write configuration.

Frontend protocol dispatch is authoritative for conversation mutation. Render components receive existing segment state and do not create their own timers or lifecycle truth.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `AgentStreamWebSocketEgress.send` | Queue, timer, cloning, equality, policy, serialization, raw sender | Agent/team handlers, lifecycle callbacks, broadcasters, command helpers after session creation | Any post-session `connection.send(message.toJson())` | Extend sink/message API, never expose raw send as semantic path. |
| `AgentRun` / `TeamRun` subscriptions | Runtime conversion, lifecycle, internal consumers | Server handler event loops | Egress throttles source subscriptions or provider adapters | Keep egress downstream of mapping. |
| `ServerSettingsService.updateSetting` | Metadata and persistence validation | GraphQL mutation / Settings store | Card writes `.env` or `process.env` locally | Add typed metadata/normalizer to service. |
| Effective interval resolver | Key, default, bounds, parsing/fallback | Egress factory and effective GraphQL query | Each handler parses raw setting differently | Strengthen resolver exports. |
| Frontend streaming dispatcher | Segment lookup/append and one presentation mutation | Parsed agent/team messages | Component mutates conversation or schedules transport content | Add explicit dispatcher case. |
| `AIMessage` presentation selection | Stream completion interpretation and component choice | Conversation rendering | `MarkdownRenderer` internally guesses streaming lifecycle | Pass explicit `presentationComplete`. |

## Dependency Rules

Allowed:

- Handler -> mapper -> `AgentStreamWebSocketEgress` -> raw connection sender.
- Broadcaster/command helper -> `AgentStreamServerMessageSink` only.
- Egress -> `ServerMessage`, egress policy/coalescing logic, injected interval resolver, raw string sender.
- Typed interval resolver -> `AppConfig` read only; ServerSettingsService -> resolver normalizer and `AppConfig` writer.
- Frontend service -> protocol parser -> existing handlers/dispatchers.
- `AIMessage` -> stream identity reader -> `TextSegment`/`ThinkSegment` -> live or Markdown renderer.

Forbidden:

- Egress -> runtime adapter, AgentRun internal processors, persistence, frontend types, or settings UI.
- Runtime/provider-specific cadence branches.
- Post-session handler/broadcaster/helper -> raw `connection.send` for `ServerMessage`.
- Frontend service/component -> cadence timer, pending content queue, or server environment parsing.
- LiveTextRenderer -> `v-html`, Markdown parser, DOMPurify, file/image actions, Mermaid, or link activation.
- Dual WebSocket payload formats or batch-envelope compatibility branches.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `AgentStreamServerMessageSink.send(message)` | One session's outbound agent/team stream | Ordered application message delivery | Fully mapped `ServerMessage`; session identity is implicit in sink instance | Singular semantic send boundary. |
| `AgentStreamWebSocketEgress.flush()` | One session's pending content | Synchronous ordered content drain | No external identity selector | Used by boundary policy/tests, not handlers for routine flow. |
| `AgentStreamWebSocketEgress.dispose()` | One session's egress lifecycle | Cancel timer and release pending connection state | Session instance | No replay promise. |
| `resolveStreamingContentFlushIntervalMs(raw?)` | Effective cadence | Parse integer/default/range/fallback | Raw string/undefined | Returns 100–2,000, default 500. |
| `normalizeStreamingContentFlushIntervalForPersistence(value)` | Persisted cadence input | Reject invalid UI/API writes | String integer | Returns canonical decimal string or error. |
| GraphQL `getEffectiveStreamingContentFlushIntervalMs` | Bound-node effective cadence | Report runtime-effective value | Current bound server | Added to existing settings query/store. |
| GraphQL `updateServerSetting` | Bound-node persisted setting | Existing generic mutation | Exact setting key/value | Reused, server validation authoritative. |
| `dispatchMessage` / `dispatchGenericTeamMemberMessage` content case | One target context segment | Immediate append and one presentation mutation | Already resolved context plus payload | No receipt batch type. |
| `getStreamSegmentIdentity(segment)` | Segment live lifecycle | Read presentation completion | Concrete segment object | Missing identity means historical/completed. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| AgentStreamServerMessageSink | Yes | Yes—session-bound sink + mapped message | Low | Do not accept raw JSON. |
| Effective interval resolver | Yes | Yes—one setting value | Low | Keep bounds/default in same file. |
| Existing generic settings mutation | Yes | Yes—key/value | Low | Register predefined validation; no special mutation needed. |
| Frontend dispatchers | Yes | Yes—resolved context | Low | Add content to existing switch instead of parallel projector. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Governing outbound owner | `AgentStreamWebSocketEgress` | Yes | Low | Use “egress” because it owns all agent/team session writes, not only batching. |
| Technique | WebSocket egress coalescing / outbound stream shaping | Yes | Low | Do not call it backpressure. |
| Internal pending item | Ordered aggregate group | Yes | Low | Do not expose a vague batch envelope type. |
| Setting UI | Live response update interval (ms) | Yes | Low | Keep technical env key out of primary label. |
| Active renderer | `LiveTextRenderer` | Yes | Low | Its name must not imply Markdown support. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| WebSocket session delivery | Server `services/agent-streaming` | Extend | Existing agent/team handlers, models, mappers, broadcasters live here. | N/A |
| Cadence persistence | Server settings/AppConfig | Extend | Already owns bound-node validated persisted settings. | N/A |
| Frontend stream projection | Web `services/agentStreaming` | Reuse/clean up | Existing dispatchers already own segment mutation. | N/A |
| Active safe text presentation | Conversation segment renderers | Create New | MarkdownRenderer intentionally owns rich completed output and must not gain mode branches that keep expensive watchers mounted. | No existing plain live component owns whitespace-safe text. |
| Rich completed presentation | MarkdownRenderer/useMarkdownSegments | Reuse | Existing features/security remain authoritative. | N/A |
| Performance telemetry | Existing test/evidence tooling | Reuse | Requirements need evidence, not a new permanent metrics product. | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Server agent streaming / websocket-egress | Message classification, coalescing, timer, sink, serialization/send | DS-001, DS-003, DS-004 | AgentStreamWebSocketEgress | Create focused subfolder inside existing capability | Shared by standalone/team. |
| Server configuration/settings | Key/default/range, validation, effective query, persistence | DS-002, DS-004 | ServerSettingsService / resolver | Extend | No migration. |
| Web agent streaming | Immediate standalone/team content projection | DS-001, DS-005 | Existing services/dispatchers | Refactor/cleanup | Delete scheduler folder. |
| Web conversation presentation | Active/plain and completed/rich selection | DS-005 | AIMessage and render components | Extend | Existing Markdown owner preserved. |
| Web server settings | Typed card/store/query/localization | DS-002 | Existing bound-node settings UI | Extend | Applies to active/future server windows. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `agent-stream-websocket-egress.ts` | Server agent streaming | AgentStreamWebSocketEgress | Sink, queue/timer lifecycle, serialization/send | One governing owner | ServerMessage |
| `agent-stream-websocket-egress-policy.ts` | Server agent streaming | Egress off-spine policy | Message classification | Pure lifecycle policy deserves focused tests | ServerMessageType |
| `stream-content-coalescing.ts` | Server agent streaming | Egress off-spine concern | Clone/equality/append consecutive messages | Prevent duplicate identity logic | ServerMessage |
| `streaming-content-flush-interval-setting.ts` | Server config | Typed resolver | Key/default/bounds/normalization/effective read | One setting subject | AppConfig |
| `LiveTextRenderer.vue` | Web conversation | Safe active renderer | Escaped whitespace-preserving text only | Separate from rich renderer lifecycle | None |
| `LiveResponseStreamingCard.vue` | Web settings | Settings interaction | Numeric draft/save/reset/errors | One user-facing setting subject | serverSettings store |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Standalone/team outbound sink contract | `agent-stream-websocket-egress.ts` exported `AgentStreamServerMessageSink` | Server agent streaming | Handlers, broadcasters, helpers share one semantic send boundary. | Yes | Yes | Generic raw WebSocket wrapper for unrelated services. |
| Consecutive content equality/append | `stream-content-coalescing.ts` | Server agent streaming | Same logic across standalone/team through shared egress. | Yes—derive from all non-delta payload fields | Yes—no second identity DTO | General event merger. |
| Setting interpretation | `streaming-content-flush-interval-setting.ts` | Server config | Runtime and settings query must resolve identically. | Yes | Yes | Generic numeric-settings framework. |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `AgentStreamServerMessageSink` | Yes | Yes | Low | Accept `ServerMessage`, not both raw JSON and messages. |
| Pending content group | Yes—cloned message plus queue time only | Yes | Low | Identity equality derives from non-delta payload; do not store another partial key object. |
| Effective interval constants/resolver | Yes | Yes | Low | Export one key/default/min/max set. |
| Stream completion state | Yes—existing `presentationComplete` | Yes | Low | Reuse; do not add `isStreaming` in segment models. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/services/agent-streaming/websocket-egress/agent-stream-websocket-egress.ts` | Server agent streaming | Authoritative egress | Sink interface/class, queue/timer, flush/dispose, raw send | Governing session owner | Yes |
| `.../websocket-egress/agent-stream-websocket-egress-policy.ts` | Server agent streaming | Policy concern | Three-way message classification including terminal status and the safe-companion merge barrier | Pure stable policy | ServerMessage |
| `.../websocket-egress/stream-content-coalescing.ts` | Server agent streaming | Coalescing concern | Immutable clone, complete non-delta equality, ordered append | Pure reusable mechanism | ServerMessage |
| `autobyteus-server-ts/src/config/streaming-content-flush-interval-setting.ts` | Server config | Setting resolver | Key/default/min/max, persistence normalization, effective read | One typed setting | AppConfig |
| Existing server handlers/broadcasters/command helpers | Server agent streaming | Thin callers | Route all post-session ServerMessages to sink | Existing responsibilities remain coherent | Sink interface |
| `autobyteus-web/services/agentStreaming/AgentStreamingService.ts` | Web streaming | Standalone dispatcher | Remove scheduler; dispatch content immediately | Existing facade | Existing handlers |
| `autobyteus-web/services/agentStreaming/TeamStreamingService.ts` and `teamStreamGenericMessageDispatcher.ts` | Web streaming | Team resolver/dispatcher | Remove scheduler; add normal content case after member resolution | Existing routing boundary | Existing handlers |
| `autobyteus-web/components/conversation/AIMessage.vue` | Web presentation | Presentation selector | Derive complete state from stream identity/message and pass to text/think | Existing segment host | Stream identity |
| `TextSegment.vue`, `ThinkSegment.vue` | Web presentation | Segment container | Select LiveTextRenderer or MarkdownRenderer | Same layout/interaction owner | Both renderers |
| `LiveTextRenderer.vue` | Web presentation | Active text | Vue-escaped whitespace-preserving content | Tight new concern | None |
| `agentStatusHandler.ts` | Web lifecycle | Message completion | Mark identified segments presentation-complete on message terminalization | Existing completion owner | Segment identity helper |
| Settings service/resolvers/store/query/card/localization files | Server/web settings | Existing settings owners | Expose effective value and user control | Existing capability | Typed setting constants server-side |

## Applied Patterns (If Any)

- **Application-level egress owner:** one session writer governs sequencing before physical transport.
- **Fixed non-sliding window:** first content schedules one timer; later content does not extend it.
- **Default-flush policy:** unknown future non-content messages flush, while explicitly safe companions opt out.
- **Immutable input / owned pending clone:** prevents cross-session mutation when broadcasters fan out one message.
- **Completion-aware renderer selection:** cheap active renderer and existing rich terminal renderer have separate lifecycles.
- **Typed setting resolver:** persistence mutation and runtime interpretation share constants/normalization.

## Change Inventory

| Action | Target | Purpose |
| --- | --- | --- |
| Add | Server `websocket-egress/` owner, policy, coalescing files and focused tests | Establish one application-level sequencing/cadence boundary shared by standalone and team sessions. |
| Add | Typed server interval setting/effective GraphQL query and web Settings card/localization/tests | Provide validated, persisted, bound-node control with a 500 ms default. |
| Add | `LiveTextRenderer.vue` and focused component/browser coverage | Remove rich Markdown work from incomplete text/reasoning updates. |
| Modify | Server handlers, broadcasters, and command helpers | Replace post-session raw sends with the semantic egress sink. |
| Modify | Frontend standalone/team dispatchers and conversation lifecycle/render selection | Immediately project shaped content and switch to rich output at completion. |
| Remove | Entire frontend `services/agentStreaming/presentation/` scheduler/projector implementation and ownership-specific tests | Eliminate duplicated cadence policy and stacked latency. |

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/services/agent-streaming/websocket-egress/` | Folder | AgentStreamWebSocketEgress | Focused egress owner and owned policy/coalescing mechanisms | Adds structural depth under existing transport capability | Runtime adapters, persistence, UI settings. |
| `.../agent-stream-websocket-egress.ts` | File | Egress | Public sink/class and local lifecycle | Natural governing component name approved in discussion | Domain event processing. |
| `.../agent-stream-websocket-egress-policy.ts` | File | Egress policy | Classify messages | Prevent two handler switches | Timer/connection state. |
| `.../stream-content-coalescing.ts` | File | Egress coalescing | Immutable consecutive merge operations | Exact shared content concern | Timers or socket sends. |
| `autobyteus-server-ts/src/config/streaming-content-flush-interval-setting.ts` | File | Typed config | Setting constants/resolution/normalization | Established config folder | GraphQL/UI. |
| `autobyteus-server-ts/src/services/agent-streaming/{agent-stream-handler,agent-team-stream-handler,agent-stream-broadcaster,team-stream-broadcaster,team-*-command-handler}.ts` | File set | Existing transport/session owners | Replace raw post-session send dependencies with sink | Existing entrypoints/fan-out remain | Duplicate coalescing. |
| `autobyteus-server-ts/src/services/server-settings-service.ts` | File | Settings service | Register/validate setting; expose effective getter | Existing persisted setting authority | Egress timers. |
| `autobyteus-server-ts/src/api/graphql/types/server-settings.ts` or focused setting resolver | File | GraphQL settings | Effective interval query | Existing API area | Runtime queue state. |
| `autobyteus-web/services/agentStreaming/presentation/` | Folder | N/A after change | Delete entire obsolete frontend cadence folder | Clean-cut replacement | Legacy fallback. |
| `autobyteus-web/services/agentStreaming/AgentStreamingService.ts` | File | Standalone frontend facade | Immediate content dispatch | Existing standalone routing | Timer/queue. |
| `autobyteus-web/services/agentStreaming/TeamStreamingService.ts` | File | Team frontend facade | Resolve target then immediate generic dispatch | Existing team routing | Timer/queue. |
| `autobyteus-web/services/agentStreaming/teamStreamGenericMessageDispatcher.ts` | File | Team member projection | Add `SEGMENT_CONTENT` handler | Existing one-mutation dispatcher | Cadence. |
| `autobyteus-web/components/conversation/segments/renderer/LiveTextRenderer.vue` | File | Active renderer | Escaped pre-wrapped text | Renderer folder reflects presentation depth | `v-html` or rich features. |
| `AIMessage.vue`, `TextSegment.vue`, `ThinkSegment.vue`, `agentStatusHandler.ts` | File set | Presentation/lifecycle owners | Completion-aware switch and fallback completion | Existing owners | Duplicate lifecycle state. |
| `autobyteus-web/components/settings/LiveResponseStreamingCard.vue` | File | Settings UI | Input/save/reset states | Existing quick-card pattern | Direct environment access. |
| `ServerSettingsBasicsPanel.vue`, store, GraphQL query/generated types, `en/settings.ts`, `zh-CN/settings.ts` | File set | Existing UI/API infrastructure | Wire card/effective value/localization | Established capability | Cadence implementation. |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| Server `agent-streaming/websocket-egress` | Transport | Yes | Low | Three files separate governing lifecycle, policy, and pure merge without artificial modules. |
| Server `config` | Off-Spine Concern | Yes | Low | Setting interpretation follows established placement. |
| Web `services/agentStreaming` | Transport/projection mixed justified | Yes | Low | Existing facade resolves contexts and dispatches; cadence is removed. |
| Web `segments/renderer` | Presentation concern | Yes | Low | Active and rich renderers are peer presentation mechanisms. |
| Web `components/settings` | Presentation/configuration | Yes | Low | Existing quick-card convention. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Egress placement | `map(event) -> egress.send(message) -> socket.send(json)` | `AgentRun timer -> handler timer -> frontend timer` | Shows single cadence authority and preserved internal events. |
| Consecutive ordering | `A:a1, A:a2, B:b1, A:a3 -> [A:a1a2, B:b1, A:a3]` | `[A:a1a2a3, B:b1]` | Prevents cross-identity reordering. |
| Boundary policy | `content -> idle/error/SEGMENT_END` flushes content first; `content -> running/token usage` seals the aggregate tail and may send the companion without draining the window | Every status flushes and collapses the window, no status ever flushes, or content merges across the companion | Makes causality and merge barriers explicit. |
| Renderer lifecycle | `presentationComplete=false -> LiveTextRenderer`; `true/missing identity -> MarkdownRenderer` | Markdown parsing on every delta or permanent plain final output | Preserves both performance and final features. |
| Setting application | Pending 500 ms window remains intact; saving 1000 affects the next newly opened window | Cancel/reschedule pending timer and risk loss/duplication | Defines live update safely. |
| Authoritative send boundary | Broadcaster stores `AgentStreamServerMessageSink` | Broadcaster retains raw socket and bypasses egress | Protects ordering across secondary send paths. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Retain frontend scheduler as fallback | Could support older server behavior | Rejected | Server and frontend ship together; delete scheduler and use one server owner. |
| Feature flag switching backend/frontend cadence | Could stage rollout | Rejected | Adds dual ownership and stacked-latency risk. |
| New batch-envelope plus old single messages | Could reduce multi-identity frames | Rejected | Existing aggregated `SEGMENT_CONTENT` messages meet evidence; preserve one protocol. |
| Runtime/provider-specific batching | Chunk rates differ | Rejected | Shared mapped message path owns provider-independent policy. |
| Persist explicit default to every existing `.env` | Could make value visible | Rejected | Effective query reports 500; absence is directly usable and migration-free. |
| Old and new setting keys | Naming might change | Rejected | Use one canonical key in this unreleased change. |

## Derived Layering (If Useful)

`Domain events (unchanged) -> application WebSocket projection/egress -> physical socket -> frontend protocol projection -> presentation selection`.

Settings is an orthogonal control path: `Settings UI -> GraphQL/service persistence -> typed effective resolver -> egress window creation`. It does not bypass or enter the domain event layer.

## Change / Refactor Sequence

1. Add the typed interval setting constants, persistence normalizer, effective resolver, server setting metadata, and effective GraphQL query; add server unit/API coverage.
2. Add pure content coalescing and message classification policy with focused tests.
3. Add `AgentStreamWebSocketEgress` with fake-timer coverage for 100/500/1000/2000, fixed-window behavior, immutable inputs, `A/B/A` ordering, safe-companion merge barriers, dependent boundaries, settings changes, send failures, flush, and dispose.
4. Refactor standalone handler to create one egress per session and route mapped events, initial/status/ack/error messages, broadcaster registration, and helper messages through the sink.
5. Refactor team handler and team command helpers/lifecycle callbacks the same way. Change broadcasters to store `ServerMessage` sinks, not raw connections. Confirm no post-session `connection.send(message.toJson())` remains.
6. Add Settings store/query state and `LiveResponseStreamingCard`; wire the Basics panel, English/Chinese localization, reset, validation, error/loading/disabled and node-rebinding behavior; regenerate GraphQL types through the repository codegen path.
7. Refactor frontend standalone/team services to normal immediate `SEGMENT_CONTENT` dispatch. Add content to the existing dispatch switches so each shaped message produces one mutation commit.
8. Add `LiveTextRenderer`, pass completion state through `AIMessage` to `TextSegment`/`ThinkSegment`, and terminalize open stream presentation identity from existing message completion handlers.
9. Delete the entire frontend presentation scheduler folder and scheduler-specific tests/imports/fields/flush calls. Rewrite affected service/production-dispatch tests for immediate projection.
10. Run implementation-scoped typechecks/focused unit suites. Downstream API/E2E owns coverage investigation and realistic before/after performance evidence, including event rates, queue age, exact equality, renderer behavior, settings live effect, and persistence/trace verification.

No long-lived temporary seam or compatibility path is permitted after step 9.

## Key Tradeoffs

- **500 ms default vs 1,000 ms:** 500 ms retains better perceived progress while historical evidence predicts about 93.6% message reduction; 1,000 ms is user-selectable.
- **Per-session egress vs run-wide coalescing:** per-session state duplicates small string/timer work for multiple viewers but matches connection lifecycle, avoids changing broadcasters/domain streams, and keeps failure ownership local.
- **Existing message schema vs batch envelope:** existing aggregated delta messages avoid protocol/codegen compatibility work. Alternating identities may produce multiple sends at one flush, but ordering remains exact.
- **Complete non-delta payload equality vs hand-maintained identity tuple:** comparing the full non-delta mapped payload is conservative and automatically respects new routing fields; changing metadata simply prevents an unsafe merge.
- **Plain active text vs incremental Markdown:** plain text is bounded and safe with existing lifecycle state. Incremental AST/DOM reconciliation is substantially larger and riskier.
- **Live setting effect at next window vs timer reschedule:** next-window application avoids losing/duplicating pending content and remains understandable.
- **Validation evidence vs permanent telemetry:** focused instrumentation proves the change without adding unconditional hot-path logging or a new metrics product.

## Risks

- Multiple alternating team identities can still create several messages per flush because total ordering is preserved and no batch envelope is introduced. Validate representative multi-member load; revisit only with evidence.
- A physical disconnect can occur while content is pending. The egress cannot deliver to a closed socket; internal state/history remains authoritative and current reconnect has no replay. Do not claim a stronger guarantee.
- Unknown future message types default to flush, which is correctness-safe but may reduce batching until explicitly classified.
- Plain active text temporarily shows Markdown syntax and defers file actions/images/math/code highlighting until completion. This is approved but requires rendered browser validation for readability, whitespace, long lines, scrolling, and transition stability.
- If message completion can occur without `SEGMENT_END`, failure to mark stream identity complete would leave plain rendering. The completion fallback is required and must have focused coverage.
- Generic raw-setting updates from an externally edited invalid `.env` can expose the raw invalid value in advanced settings; the effective query/card/runtime must consistently show/use 500 until the user saves a valid value.
- Existing server tests with immediate-send assumptions and frontend tests with fake 100 ms timers will require deliberate ownership-aware updates, not mechanical expectation deletion.

## Guidance For Implementation

- Keep `AgentStreamWebSocketEgress` small and deterministic. Use Vitest fake timers; do not sleep in unit tests.
- Accept an injected raw sender and effective-interval reader so tests do not initialize Fastify/AppConfig. Do not inject a generic service locator.
- Clone a content message and payload when opening an aggregate group. Never mutate an event-mapper or broadcaster-owned message.
- Derive merge equality from all payload fields except `delta`; use a stable comparison appropriate for the already-serialized plain payload and preserve arrays in order. Treat invalid/missing/non-string delta conservatively and do not fabricate content.
- Clear timer/queue state before invoking raw sends. Define one failure callback/log path for timer-triggered send exceptions and ensure dispose is idempotent.
- Make policy exhaustive with a correctness-safe default. Explicitly test terminal `idle/offline/error`, non-terminal `initializing/running`, command acknowledgements, token usage, segment/tool/error/completion/interruption, and team lifecycle. Prove that every send-without-flush companion seals the current aggregate tail without resetting its timer.
- Keep raw socket access private to handler connection lifecycle. Search for and eliminate post-session `.send(...toJson())` bypasses in agent-streaming files.
- The setting normalizer must reject decimals, whitespace-only strings, scientific notation, and out-of-range values; canonical valid persistence is a base-10 integer string. Runtime invalid input falls back to 500 and may log one bounded warning at resolution/initialization, never per delta.
- The Settings card must use the bound-node store revision patterns already used by other cards. Show 500 even when the key is absent; save/reset through the existing mutation; disable while unreadable/saving; expose accessible label/help/error text.
- Immediate frontend content dispatch must still use `beginRecentEventMonitorMutation` / `commitRecentEventMonitorMutation` once per shaped message. Do not create a component-local or microtask cadence substitute.
- `LiveTextRenderer` must use normal Vue text interpolation/text content, `white-space: pre-wrap`, safe wrapping, and no `v-html`. File actions and external links intentionally become active only in final Markdown.
- Treat missing stream identity as completed/historical. Reuse `presentationComplete`; do not add overlapping `isStreaming` flags to persisted or shared segment models.
- Implementation-scoped checks should cover server/web typechecks and focused unit/component suites. Do not claim the performance acceptance criteria until downstream realistic API/E2E execution records the required evidence.
