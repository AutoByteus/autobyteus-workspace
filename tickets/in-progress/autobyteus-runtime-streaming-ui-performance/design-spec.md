# Design Spec — Runtime-Agnostic Stream Presentation Backpressure

Current solution revision: `SR-002` (resolves architecture findings `AR-F-001` and `AR-F-002`).

## Current-State Read

The supported production path is transport-cadence-driven. `AgentStreamingService` and `TeamStreamingService` parse each WebSocket message and immediately dispatch it. A `SEGMENT_CONTENT` event first assigns `new Date().toISOString()` to the resolved conversation's `updatedAt`, then mutates an accumulated reactive string through `handleSegmentContent`; the surrounding dispatcher captures and rebuilds a recent-event-monitor presentation witness; Vue then invalidates the live feed and, for a visible text/reasoning segment, reparses and sanitizes the full accumulated Markdown. Live run/member/team recency consumers derive last-activity state from `conversation.updatedAt`. The team path resolves nested member/task-agent identity correctly, but neither streaming facade nor the projection layer owns a presentation budget.

This is a structural performance defect rather than a slow local-file or backend path. The exact Electron-backed reproduction recorded a 109.67% renderer CPU mean, 7.90–52.27 second UI actions, approximately four accumulated characters per presentation revision, and a healthy backend/local reference endpoint. The same frontend path remained responsive with Codex/Luna because Codex exposed much coarser and less frequent content; it did not bypass the path. A hidden team member could sustain the renderer pressure, proving that per-event state/witness work is independently material; accumulated Markdown rendering compounds it when the active member streams. See `investigation-notes.md` and `performance-evidence.md` for the complete production paths and measurements.

Voice input has a separate local lifecycle defect. `voiceInputStore.startRecording()` performs several awaits before `isRecording` becomes true. The store owns the asynchronous media lifecycle but does not expose its startup phase, so both voice consumers can appear inert and a duplicate start is possible while initialization is unresolved. The composer currently calls cleanup when it unmounts; `VoiceInputExtensionCard` owns the supported Settings test trigger but has no unmount caller, so a pending settings-test startup cannot invoke store-owned invalidation when the user leaves Settings.

The target design must preserve these constraints:

- every stream content byte and its per-member/per-segment identity remain exact;
- the latest accepted content receipt advances the correct context's `conversation.updatedAt` once per batch so live standalone/member/team recency remains correct without per-delta presentation revisions;
- semantic events observe all earlier content;
- nested team/task-team/task-agent routing remains authoritative before content is buffered;
- hydration and already-completed history do not enter the live cadence path;
- no backend protocol, persistence, schema, or historical run-data change is introduced;
- the policy applies to all runtimes using these services, with no AutoByteus-, DeepSeek-, Codex-, or model-specific branch.

## Intended Change

Introduce one reusable frontend stream-content presentation subsystem used by both live agent and live team services. Each service instance owns one scheduler. The scheduler coalesces `SEGMENT_CONTENT` payloads by the already-resolved `AgentContext` and exact segment identity and presents at a fixed non-debounced cadence of 100 ms. Every non-content WebSocket event synchronously flushes all earlier pending content before its existing dispatch path runs. Context replacement, remote disconnect, and explicit disconnect also flush and cancel the pending timer.

Each streaming facade captures an ISO receipt timestamp immediately after parsing a content message. After team routing resolves the exact context, the scheduler retains only the latest receipt timestamp alongside that context's coalesced content. It delegates a tight `StreamContentPresentationBatch` containing `contentPayloads` and `latestActivityAt` to a dedicated batch projector. The projector assigns `conversation.updatedAt = latestActivityAt` once, applies coalesced deltas in order, performs recent-window enforcement once, and marks at most one presentation revision for a handler-reported content mutation instead of constructing full before/after presentation witnesses for each provider delta. A timestamp-only/no-op payload still advances recency but does not mark a presentation revision. Existing witness comparison remains authoritative for non-content events whose visible effect can be a no-op.

The voice store gains an explicit synchronous `isStarting` lifecycle state, a startup-attempt generation guard, and a source-guarded `cancelOperationForSource(source)` consumer boundary. Composer and settings consumers render/disable against starting state and call that source boundary when they unmount. A matching `starting` or `recording` operation is invalidated and its resources are disposed; another source's operation is untouched; an already-running transcription is allowed to complete because captured audio no longer depends on the unmounted microphone surface. Thus an unresolved permission/device/media/worklet operation cannot later transition an unmounted or reset consumer into recording.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind (`User`/`System`/`Operational`/`Contract`) | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System/User | FR-01, FR-04, FR-05 / AC-01, AC-04, AC-05 | Any supported live runtime emits agent/team `SEGMENT_CONTENT` | `investigation-notes.md` BEH-001; native CPU/revision/hidden-member evidence; architecture-review MP-001 recency path | Runtime-agnostic bounded presentation, exact final content/semantic boundaries, and latest per-context content activity time preserved without per-delta revisions | Runtime stream -> timestamped WebSocket receipt -> resolved context -> scheduler -> batch projector sets `updatedAt` and content -> event monitor -> Vue/recency presentation; DS-001, DS-003 |
| BEH-002 | User | FR-02, FR-04 / AC-02, AC-04 | User opens a supported workspace file or team-message reference during live streaming | `investigation-notes.md` BEH-002; UI versus direct endpoint timing | File/reference behavior stays unchanged and receives renderer time within the approved budget | File/reference click -> existing loader/fetch -> existing viewer; protected by DS-001 budget, directly represented by DS-002 |
| BEH-003 | User | FR-03, FR-04 / AC-03, AC-04 | User activates composer voice input or settings microphone test and may leave that surface during startup/recording | `investigation-notes.md` BEH-003; `voiceInputStore.ts`; architecture-review MP-002 | Immediate starting feedback, duplicate-start guard, source-owned unmount cancellation, truthful success/error/cancel transitions, and preserved active transcription | Voice consumer -> voice store -> guarded media startup -> recording/transcription or error; consumer unmount -> source-guarded store cancellation; DS-004, DS-005 |
| BEH-004 | Contract/System | FR-01, FR-05 / AC-01, AC-05 | Runtime-specific chunk cadence enters the shared frontend WebSocket protocol | `investigation-notes.md` BEH-004; Codex/Luna control | All runtimes use the same cadence owner; no runtime-specific behavior gate; Codex and idle remain correct | Runtime adapter -> existing server protocol -> the same service-owned scheduler; DS-001 |
| BEH-005 | System/Operational | FR-06 / AC-06 | Complete assistant/tool lifecycle reaches memory ingestion | `investigation-notes.md` BEH-005; sparse raw-trace/snapshot writes | Backend persistence and existing stored runs remain unchanged and directly usable | Existing server lifecycle -> memory manager -> raw trace/snapshot/run history; preserved DS-006 |

The behavior map defines the production behavior served by the design. The spines below define where cadence, ordering, state, and lifecycle authority live.

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related Requirement / Acceptance-Criteria IDs (When Applicable) | Relationship To This Design | Status / Approval Applicability |
| --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-runtime-streaming-ui-performance/tickets/in-progress/autobyteus-runtime-streaming-ui-performance/performance-evidence.md` | Retained native/Codex CPU, event-shape, UI-latency, endpoint, persistence, and source-path evidence | FR-01–FR-07 / AC-01, AC-02, AC-05–AC-07 | Establishes the cadence-sensitive renderer owner and rules out backend/file/persistence as the primary fix site | Current; evidence-only; approval `N/A` |

## Task Design Health Assessment (Mandatory)

- Change posture: `Performance` plus a bounded `Bug Fix` for voice startup feedback.
- Current design issue found: `Yes`.
- Root cause classification: `Boundary Or Ownership Issue` for streaming presentation cadence; `Local Implementation Defect` and missing lifecycle invariant for voice startup.
- Refactor needed now: `Yes`.
- Evidence: both live services project transport events immediately; generic dispatch builds presentation witnesses around every tiny content event; visible content invalidates full accumulated Markdown; native DeepSeek averaged 3.75–4.43 characters per revision and pinned the renderer while Codex/Luna's coarser events did not. Direct content dispatch also advances `conversation.updatedAt`, which live recency consumers use. Voice has no state before multiple awaits, and the Settings test has no unmount cancellation caller.
- Design response: create one owned runtime-agnostic cadence mechanism, route both live services through it, retain the latest receipt/activity scalar per context batch, remove direct content dispatch, use a content-specific mutation commit, and make voice startup a guarded store lifecycle with source-scoped consumer cancellation.
- Refactor rationale: a timer in each component or runtime branch would duplicate policy, would not fix hidden-member projection work, and would leave transport cadence as the governing owner. The shared frontend streaming subsystem is the narrowest boundary that sees both runtimes and both single/team live paths before reactive projection.
- Intentional deferrals and residual risk: full Markdown parsing remains whole-source per presented content batch. The 100 ms budget removes unbounded provider cadence and is expected to satisfy the approved load. Incremental Markdown parsing/virtualization is deferred because arbitrary incomplete Markdown makes it a materially larger behavior-sensitive refactor; if AC-01 still fails after the bounded path, evidence must return through solution design rather than adding ad hoc component throttles. Server-log rotation and token-ledger uniqueness warnings remain separate operational follow-up items.

## Terminology

- **Transport event:** one parsed WebSocket `ServerMessage` in arrival order.
- **Content identity:** resolved `AgentContext` plus `turn_id`, segment `id`, and optional `segment_type`. The context object provides the already-authoritative run/member/task-agent identity.
- **Content receipt:** a parsed `SEGMENT_CONTENT` plus the ISO timestamp captured by the streaming facade on receipt. Team routing subsequently attaches it to the authoritative resolved context.
- **Presentation batch:** all pending content accumulated for one resolved context during one scheduler interval, with deltas coalesced by content identity and exactly one `latestActivityAt` scalar from the last accepted receipt for that context.
- **Semantic boundary:** any non-`SEGMENT_CONTENT` message, context replacement, disconnect, or teardown. The design conservatively flushes on every such boundary instead of maintaining an incomplete event whitelist.
- **Known presentation mutation:** a validated content batch in which the segment handler reports at least one created or appended presentation segment; it can mark a revision without a before/after full witness comparison.
- **Source-guarded voice cancellation:** a store action that cancels only a matching `composer` or `settings-test` starting/recording operation; it cannot cancel the other source and does not interrupt an already-running transcription.

## Design Reading Order

This design follows the template order: verified behavior and health decision; lifecycle and state transition; spine and ownership; interfaces and file responsibilities; then sequencing, tradeoffs, risks, and implementation guidance.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove the direct `SEGMENT_CONTENT` branches from `AgentStreamingService.dispatchMessage` and `dispatchGenericTeamMemberMessage`; content must have exactly one live projection path through the scheduler and batch projector.
- Remove the recording/transcribing-only busy assumptions from both voice consumers; `isStarting` is part of the one current lifecycle, not a parallel compatibility mode.
- Do not retain a runtime-specific bypass, immediate-content fallback, component-level debounce, or a feature flag that keeps both direct and batched projection authoritative.
- Existing completed history/hydration is not a legacy live path and remains direct because it is outside transport streaming.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject, location, representative shape, and approximate volume: existing agent/team raw traces, working-context snapshots, team communications, artifacts, run metadata, and database history under the configured server data root; the reproduction inspected representative active team memory, including a large existing server log but only sparse logical-boundary memory writes.
- Relevant code-model, serialization, semantic, or physical-store change: none. New pending content and voice-start attempt state are ephemeral renderer memory only.
- Normal reader/writer behavior and representative evidence: server memory ingestion continues on complete assistant/tool phases; raw traces append and snapshots atomically replace; existing frontend hydration reads completed projection data directly. See `investigation-notes.md` BEH-005 and persisted-data evidence.
- Required semantics and invariants under direct use: stored bytes, order, recovery meaning, communications, and historical run projection remain unchanged; no pending frontend presentation batch is a durability boundary.
- Physical-store, privacy/security, disposal/rebuild, and operational constraints: do not rewrite or copy user production memory; keep probe details local; preserve existing root/authorization checks.
- Decision: `Directly Usable — No Migration`.
- Decision rationale, including concrete benefit versus I/O, downtime, corruption, recovery, and rollout cost: there is no stored representation change and therefore no correctness benefit from migration. Rewriting existing memory would add only I/O, downtime, and corruption exposure.
- Acceptance criteria or design constraints supported by this decision: FR-04, FR-06 / AC-04, AC-06.

### Migration Plan

N/A — the approved decision is `Directly Usable — No Migration`.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001, BEH-004 | Runtime/provider emits normalized content | Live agent/member content and content-driven recency are presented | `AgentStreamingService` or `TeamStreamingService`, with owned scheduler | Main corrected live-stream path across every runtime, including preserved activity time |
| DS-002 | Primary End-to-End | BEH-002 | User clicks file/reference | Existing `FileViewer` shows content/error | Existing file/reference surface owners | User-visible responsiveness outcome protected by DS-001 |
| DS-003 | Bounded Local | BEH-001, BEH-004 | First timestamped pending content receipt | Latest activity time applied once and at most one committed presentation revision per context batch | `StreamContentPresentationScheduler` | Makes cadence, per-context receipt recency, coalescing, semantic flush, and timer lifecycle explicit |
| DS-004 | Primary End-to-End | BEH-003 | User activates voice control or leaves the initiating surface | Recording/transcribing or truthful source-scoped error/cancel state | `voiceInputStore` | Gives asynchronous media lifecycle and consumer-owned cancellation one UI-visible owner |
| DS-005 | Bounded Local | BEH-003 | Voice startup attempt begins | Attempt commits recording or is invalidated/failed | `voiceInputStore` startup generation guard | Prevents duplicates and late post-cleanup transition |
| DS-006 | Return-Event | BEH-005 | Complete server-side assistant/tool lifecycle | Existing memory/run history updated | Existing backend memory owners | Explicitly records the preserved, non-target persistence path |

## Primary Execution Spine(s)

- DS-001: `Runtime/provider -> Electron backend WebSocket protocol -> streaming facade captures content receipt time -> standalone context or TeamStreamingService-resolved AgentContext -> StreamContentPresentationScheduler retains latest per-context activity -> StreamContentBatchProjector updates conversation/content -> event-monitor and live recency consumers -> AgentConversationFeed/MarkdownRenderer/history rows`.
- DS-002: `Files or Team reference click -> existing selection/viewer state -> existing authorized REST request -> Electron backend local-content service -> response decoding -> FileViewer visible content/error`.
- DS-004: `Composer or Settings voice button -> voiceInputStore.toggleRecording -> guarded startRecording attempt -> browser media/audio-worklet boundary -> store recording/transcription/error state -> consumer feedback`; or `consumer unmount -> cancelOperationForSource(source) -> matching starting/recording invalidation and resource disposal`.

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The facade timestamps parsed content receipt, team routing resolves the exact context, and the scheduler buffers exact bytes plus the latest per-context activity time. The projector assigns that activity time once, applies content, commits at most one presentation revision, and then existing live recency/Vue presentation consumes the state. Every non-content event first drains older content. | WebSocket facade, timestamped receipt, resolved context, scheduler, batch projector, conversation/recency presentation | Live streaming facade plus scheduler | Protocol parsing, team identity resolution, event-monitor retention, Markdown and run-history rendering |
| DS-002 | File/reference interactions use their unchanged fetch/viewer path; the stream fix prevents unrelated renderer starvation so their already-fast response can paint. | File/reference surface, content endpoint, FileViewer | Existing surface owners | Authorization, MIME/type resolution, loading/error state |
| DS-003 | The first timestamped content receipt starts one 100 ms timer. Later receipts append exact-identity bytes, overwrite only that context batch's `latestActivityAt`, and do not reset the deadline. Timer or explicit boundary snapshots/clears pending state, cancels the timer, then projects each context once. | Pending context batches, content identities, latest activity scalar, timer | Scheduler | Clock/receipt injection, fake timers, diagnostics in tests |
| DS-004 | A voice action commits starting state synchronously, performs the existing media startup, and transitions to recording/transcription or existing error behavior. If the initiating component unmounts, it invokes source-guarded store cancellation: matching starting/recording stops, another source is untouched, and active transcription continues. | Voice action, store, media resources, source-scoped consumer lifecycle | Voice store | Toasts, device selection, permission text, worklet/transcription adapter |
| DS-005 | A monotonically increasing attempt generation invalidates stale async continuations. Locally acquired resources are disposed rather than committed when the attempt is no longer current. | Startup attempt, generation token, local media resources | Voice store | Cleanup/unmount/reset |
| DS-006 | Existing complete assistant/tool results continue to be written by server memory owners, independently of frontend presentation cadence. | Memory manager, raw trace, snapshot, run history | Existing backend owners | Atomic write/append policy |

## Spine Actors / Main-Line Nodes

- Runtime/provider and backend WebSocket emitter: supplies normalized events; does not own frontend presentation frequency.
- `AgentStreamingService` / `TeamStreamingService`: thin public live-stream facades that own connection/routing lifecycle, capture content receipt time, and encapsulate one scheduler instance.
- Resolved `AgentContext`: exact standalone or team-member/task-agent subject receiving projection.
- `StreamContentPresentationScheduler`: owns pending content, the latest receipt/activity time per resolved context, runtime-agnostic cadence, coalescing identity, and flush/cancel sequencing.
- `StreamContentBatchProjector`: owns one context-level transaction that assigns latest activity, applies content, and performs at most one known presentation commit.
- Segment/event-monitor state owners: own segment lookup/append, recent-window retention, and presentation revision.
- Vue feed/Markdown renderer: owns rendering the presented state, not stream backpressure.
- `voiceInputStore`: owns voice startup/recording/transcribing resource lifecycle and state invariants.
- Voice components: render and invoke the store, including a source-specific unmount cancellation call; they do not coordinate media resources or inspect generation tokens.

## Ownership Map

- The two streaming services remain authoritative connection facades. Immediately after parsing they capture one ISO receipt timestamp for content, decide when the event crosses the cadence boundary, and force semantic flushes. Team member/task execution resolution remains inside `TeamStreamingService` before the timestamped receipt is enqueued against a context.
- Each service owns its scheduler instance. The scheduler is reusable code and one policy, not a global singleton; this keeps timer/pending lifecycle scoped to one socket/run or one team socket.
- The scheduler owns batching only: exact content aggregation plus replacement of one `latestActivityAt` scalar per resolved context. It must not parse raw messages, create timestamps, resolve team routes, mutate conversations, render Markdown, or inspect runtime/model names.
- The batch projector owns the transaction from one tight context batch to `conversation.updatedAt`, segment content, and at most one context revision. It assigns activity time even when all payload handlers are no-ops, but calls the known presentation commit only when a handler reports a presentation mutation. It does not own timing or transport routing.
- `segmentHandler.ts` remains the segment mutation authority. Its content method reports whether a real presentation mutation occurred.
- `recentEventMonitorMutationCommit.ts` remains the authoritative retention/revision boundary. It gains an explicit known-change commit alongside the witness-based unknown-change commit.
- The voice store, not the components, owns startup cancellation and the invariant that no duplicate or stale attempt can commit. Components own only the lifecycle signal that their supported surface is leaving and must call `cancelOperationForSource` with their fixed source.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `AgentStreamingService` | Its `StreamContentPresentationScheduler` for cadence; existing handlers for domain mutation | Standalone WebSocket lifecycle and public send/approve/interrupt API | Runtime-specific batching rules or component rendering |
| `TeamStreamingService` | Its scheduler plus existing team/task resolution owners | Team WebSocket lifecycle, exact member routing, public team actions | Segment mutation semantics or duplicated per-member timers |
| Voice components | `voiceInputStore` | User interaction, accessible feedback, and source-specific unmount signal | Media-resource lifecycle, generation invalidation, or deciding another source's cancellation |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Immediate `SEGMENT_CONTENT` branch in `AgentStreamingService.dispatchMessage` | Would create a second authoritative content path | Timestamped receipt -> `StreamContentPresentationScheduler.ts` -> `streamContentBatchProjector.ts` | In This Change | Projector preserves the removed branch's `conversation.updatedAt` effect once per batch; non-content switch remains |
| Immediate `SEGMENT_CONTENT` branch in `teamStreamGenericMessageDispatcher.ts` | Bypasses the team service's shared cadence owner | Same timestamped shared presentation path | In This Change | Team resolution still occurs before enqueue; each context retains its own latest activity time |
| Full witness begin/commit for each content delta | Dominant repeated hidden-member work and unnecessary for known append/create batches | Known-change commit in `recentEventMonitorMutationCommit.ts` | In This Change | Witness path remains for non-content/no-op-sensitive events |
| Voice recording/transcribing-only busy/unmount assumptions | Cannot represent async startup, guard duplicate start, or cancel the initiating Settings surface safely | `isStarting` + startup generation + `cancelOperationForSource` in `voiceInputStore.ts` | In This Change | Both consumers update together; source-scoped unmount replaces composer-global cleanup |
| Server-log/token-ledger operational issues | Not causal to this task and not replaced by this design | Separate operational follow-up | Follow-up | No in-scope code placeholder |

## Return Or Event Spine(s) (If Applicable)

- DS-001 return/presentation portion: `StreamContentBatchProjector -> conversation.updatedAt + reactive content -> live run/member/team recency + at most one presentation revision -> AgentConversationFeed -> segment renderer -> visible live content`.
- Semantic return ordering: `pending content flush -> existing non-content dispatcher/handler -> state/status/tool/team communication presentation`.
- DS-006 preserved persistence: `complete assistant/tool event -> MemoryManager -> raw trace/snapshot/run history`.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `StreamContentPresentationScheduler` (DS-003).
  - `enqueue resolved timestamped receipt -> aggregate exact identity + replace latestActivityAt for that context -> ensure one deadline -> timer or forced flush -> snapshot and clear pending -> project one batch per context`.
  - This is the bounded batching loop. It is not a second transport architecture.
- Parent owner: `voiceInputStore` (DS-005).
  - `commit isStarting + attempt generation -> initialize/devices/permission -> acquire local stream/context/worklet -> generation check -> commit recording OR dispose/error/cancel`.
  - Consumer exit branch: `component unmount -> cancelOperationForSource(fixed source) -> source match? -> invalidate/cleanup starting or recording : no-op; transcribing -> continue`.
  - This makes async startup, source ownership, and unmount/reset behavior an explicit local state machine.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Team member/task resolution | DS-001 | `TeamStreamingService` | Resolve canonical nested route/run identity to `AgentContext` before enqueue | Team content identity cannot be guessed from segment ID | Scheduler becomes a team-routing blob |
| Protocol parse/logging | DS-001 | Streaming facades | Parse raw payload and optional diagnostic summary | Existing transport boundary | Scheduler couples to raw transport/runtime |
| Content receipt time | DS-001, DS-003 | Streaming facades and scheduler | Facade captures one ISO timestamp; scheduler retains only latest per context; projector applies it | Preserves live recency without per-delta presentation work | Recency becomes stale or scheduler invents time after arbitrary delay |
| Recent-window enforcement | DS-001, DS-003 | Event-monitor commit owner | Retain bounded recent presentation and earlier-trace flag | Existing presentation invariant | Cadence owner starts owning history policy |
| Markdown rendering | DS-001 | Vue presentation | Render only state that has crossed cadence boundary | Existing UI capability | Component timers duplicate backpressure and hidden work remains |
| Authorized file/type handling | DS-002 | Existing file/reference viewer | Preserve root checks, MIME, loading/error behavior | Security and viewer correctness | Performance fix accidentally weakens file policy |
| Toast/localization | DS-004 | Voice store/components | Preserve errors and provide starting text | User feedback | Store lifecycle is obscured by presentation policy |
| Consumer unmount signal | DS-004, DS-005 | `voiceInputStore` | Composer/Settings supplies fixed source to store-owned cancellation | Only the component knows its surface is leaving | Component starts owning resource disposal or cancels another source |
| Fake clock/runtime probe instrumentation | DS-003, DS-005 | Tests/validation | Deterministic cadence/state and real renderer evidence | Verifiable acceptance | Production owner becomes diagnostics-specific |

## Ownership Boundaries

Raw WebSocket parsing and connection lifecycle stop at the streaming service. Team route resolution also stops there. The service may call only the scheduler's content API or the existing non-content dispatcher; callers/stores must not call the scheduler directly.

The scheduler accepts a resolved context and a tight timestamped content receipt. It encapsulates pending maps, one latest activity scalar per context, timer handles, coalescing, and forced flush. It calls only the batch projector with a `StreamContentPresentationBatch`. The projector is the only path from scheduled content to `conversation.updatedAt`, segment mutation, and content-driven event-monitor commit.

Segment handlers remain unaware of clocks and services. Event-monitor commit remains unaware of runtimes and transport. Live recency continues to consume only `conversation.updatedAt`; it does not depend on scheduler internals. Vue remains unaware of buffered raw deltas. Voice components remain unaware of startup tokens or resource cleanup; they call a source-owned cancellation boundary on unmount.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `AgentStreamingService.handleMessage/dispatchMessage` | Service-owned scheduler and existing handlers | WebSocket client callback | Raw content -> handler directly | Add an explicit service-internal content method, not a store/component call |
| `TeamStreamingService.dispatchMessage` | Team projection/resolution, service-owned scheduler, generic dispatcher | Team WebSocket callback | Scheduler resolving route keys or generic dispatcher handling content | Strengthen team dispatch branch while preserving resolver authority |
| `StreamContentPresentationScheduler` | Pending context buckets, identity aggregation, latest activity scalar, timer/flush lifecycle | The two streaming services only | Component/runtime-specific timer, late timestamp creation, or direct pending-map access | Extend typed receipt/batch/flush lifecycle only |
| `StreamContentBatchProjector` | Activity timestamp assignment, segment application, and at most one known event-monitor commit | Scheduler only | Scheduler mutating `AgentContext` or services marking revisions | Add projector batch/result contract |
| `voiceInputStore` | Attempt generation, source guard, media resources, state transitions | Composer/settings components | Component directly calling `getUserMedia`, stopping tracks, or clearing store flags piecemeal | Add store action/getter |

## Dependency Rules

- `AgentStreamingService` and `TeamStreamingService` may depend on the scheduler public API; neither may inspect its pending internals.
- The streaming facades capture `receivedAt` at parsed content receipt. The scheduler must not generate the time at flush, because that would represent presentation delay rather than content activity.
- The scheduler may depend on the tight timestamped receipt/batch types, protocol `SegmentContentPayload`, `AgentContext` identity, and batch projector callback; it may not import Vue components, stores, runtime configuration, or team resolvers.
- The batch projector may depend on conversation state, the segment handler, and event-monitor commit boundary; it may not schedule timers, parse raw messages, or recalculate activity time.
- The team service must resolve member/task identity before `enqueue`; the scheduler must not accept ambiguous route strings as a substitute for `AgentContext`.
- Every non-content message must call `flush()` before existing dispatch/projection; do not maintain a partial semantic-event whitelist.
- No runtime/model conditional may select direct versus batched content. All affected runtimes use the same path.
- Vue components must not add debounce/throttle layers for this fix.
- Voice components use store state/actions only. Composer unmount calls `cancelOperationForSource('composer')`; Settings-card unmount calls `cancelOperationForSource('settings-test')`. The store checks ownership and state before invalidating/cleaning resources. Neither component calls global cleanup directly.
- Backend, file endpoint, persistence, and hydration modules must not depend on the new frontend scheduler.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `StreamContentPresentationScheduler.enqueue(context, receipt)` | One resolved live content receipt | Add exact bytes, replace that context batch's latest activity with `receipt.receivedAt`, and ensure a non-sliding deadline | `AgentContext` + `StreamContentReceipt { payload, receivedAt }`; payload `turn_id/id/segment_type` | Facade captures `receivedAt`; runtime-neutral; ignores runtime/model identity |
| `StreamContentPresentationScheduler.flush()` | All pending content for one service/socket | Cancel deadline, snapshot/clear, project all earlier content now | Scheduler instance scope | Safe no-op when empty; callable on semantic and lifecycle boundaries |
| `projectStreamContentBatch(context, batch)` | One resolved context presentation batch | Assign `latestActivityAt` once, apply coalesced payloads, and commit at most one presentation revision | Exact `AgentContext`; `StreamContentPresentationBatch { contentPayloads, latestActivityAt }` | Timestamp-only/no-op payload batch advances recency but not presentation revision |
| `handleSegmentContent(payload, context): boolean` | One segment mutation | Create/find segment, append delta, report presentation mutation | Segment `id` plus optional `segment_type`; context | Invalid/empty payload returns false |
| `commitKnownRecentEventMonitorPresentationMutation(context)` | Recent presentation state | Enforce recent window and mark one known change | Exact context | No full before/after witness |
| `voiceInputStore.startRecording(source)` | One voice startup attempt | Synchronously enter starting, guard async resources, transition | Explicit `composer` or `settings-test` | Attempt generation is internal |
| `voiceInputStore.cancelOperationForSource(source)` | One consumer-owned voice operation | If source owns starting/recording, synchronously invalidate then dispose; otherwise no-op | Explicit `composer` or `settings-test` | Active transcription continues; authoritative component-unmount boundary |
| `voiceInputStore.cleanup()` | Store-internal current voice resources | Dispose current capture resources and reset starting/recording state | Store-owned current operation | Used behind source guard and internal error/reset paths; not called directly by components |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| Scheduler enqueue | Yes | Yes | Low | Require resolved context plus tight receipt; do not accept run ID/route alternatives or make timestamp optional |
| Scheduler flush | Yes | Yes (instance scope) | Low | Keep one instance per live service |
| Batch projector | Yes | Yes | Low | Treat activity+content+revision as one context projection transaction; do not expose to stores/components |
| Known event-monitor commit | Yes | Yes | Low | Call only after handler-reported mutation |
| Voice startup | Yes | Yes | Low | Explicit source and internal generation token |
| Voice source cancellation | Yes | Yes | Low | Store owns source/state guard; component supplies only its fixed source |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Cadence owner | `StreamContentPresentationScheduler` | Yes | Low | Avoid generic `BatchHelper`/`ThrottleService` |
| Projection transaction | `projectStreamContentBatch` / `streamContentBatchProjector.ts` | Yes | Low | Name by content projection, not generic dispatch |
| Content receipt shape | `StreamContentReceipt` | Yes | Low | Keep `payload` and required `receivedAt`; no redundant runtime/member selectors |
| Context batch shape | `StreamContentPresentationBatch` | Yes | Low | Keep `contentPayloads` and required `latestActivityAt`; context remains method identity |
| Known commit | `commitKnownRecentEventMonitorPresentationMutation` | Yes | Low | Keep event-monitor subject explicit |
| Voice startup state | `isStarting` | Yes | Low | Do not introduce overlapping `isPending` and `isInitializing` flags |
| Voice attempt identity | `startupAttemptGeneration` (internal) | Yes | Low | Keep it internal; consumers need only lifecycle state |
| Voice consumer cancellation | `cancelOperationForSource` | Yes | Low | Avoid ambiguous global `cancel` from component callers |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Live stream cadence/backpressure | `services/agentStreaming` | Extend | Both affected authoritative facades and typed protocol live here | N/A |
| Segment mutation | `agentStreaming/handlers/segmentHandler.ts` | Extend | Existing segment identity and append owner | N/A |
| Presentation revision/retention | `services/eventMonitor` | Extend | Existing authoritative commit/window owner | N/A |
| Markdown rendering | Existing conversation renderer | Reuse unchanged | It should receive fewer bounded mutations, not own timing | N/A |
| Voice lifecycle | `stores/voiceInputStore.ts` | Extend | Already owns media resources and transitions | N/A |
| File/reference loading | Existing file/reference surfaces | Reuse unchanged | Runtime evidence proves their path is healthy | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Agent streaming presentation | Timestamped content receipt, cadence, content identity aggregation, per-context latest activity, semantic/lifecycle flush, batch projection | DS-001, DS-003 | Agent/team streaming facades | Extend | Add a `presentation/` grouping to expose structural depth |
| Agent streaming handlers | Segment create/find/append and mutation outcome | DS-001 | Batch projector/non-content dispatch | Extend | No timer logic |
| Event monitor | Retention and revision commit | DS-001, DS-003 | Batch projector and existing dispatchers | Extend | Known-change and witness-change commits coexist by semantic purpose, not compatibility |
| Voice input | Startup/recording/transcription lifecycle and source-guarded consumer cancellation | DS-004, DS-005 | Voice store | Extend | Consumers stay thin and supply only unmount source |
| File/reference viewing | Existing content fetch and viewer state | DS-002 | Existing components | Reuse | No change expected |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `agentStreaming/presentation/streamContentPresentationTypes.ts` | Streaming presentation | Shared contract owner | Required receipt and batch shapes | Both facades, scheduler, projector share one tight meaning | N/A — canonical structure |
| `agentStreaming/presentation/StreamContentPresentationScheduler.ts` | Streaming presentation | Scheduler | Pending batches, latest activity per context, 100 ms deadline, coalescing, flush | One bounded local lifecycle | Uses shared receipt/batch types |
| `agentStreaming/presentation/streamContentBatchProjector.ts` | Streaming presentation | Batch projector | Apply latest activity and content in one context transaction; commit at most once | Separates timing from mutation | Uses shared batch plus segment/event-monitor owners |
| Existing streaming service files | Agent streaming | Connection facades | Capture receipt time, route all content through scheduler, and flush boundaries | Existing facade responsibilities | Reuse receipt type/scheduler |
| `recentEventMonitorMutationCommit.ts` | Event monitor | Commit boundary | Known-change commit | Same retention/revision owner | Reuse window enforcement |
| `voiceInputStore.ts` | Voice input | Voice lifecycle | Starting state, generation guard, source guard, local-resource commit/disposal | Existing authoritative resource owner | Reuse current state/actions |
| Existing voice component/catalog files | Voice input presentation | Thin consumers | Starting feedback/disabled/accessibility and fixed-source unmount signal | Existing UI surfaces | Reuse store state/action |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Timestamped receipt and context batch shapes | `presentation/streamContentPresentationTypes.ts` | Agent streaming | Facades, scheduler, and projector must agree on required receipt/activity semantics | Yes — one receipt timestamp and one batch latest scalar | Yes — no parallel optional timestamp parameters | Generic transport envelope or runtime DTO |
| Agent/team content buffering policy | `presentation/StreamContentPresentationScheduler.ts` | Agent streaming | Same protocol and invariants across both live facades | Yes — one cadence constant/policy | Yes — removes two direct content paths | Global singleton or generic event bus |
| Context batch application | `presentation/streamContentBatchProjector.ts` | Agent streaming | Both services require identical segment/revision transaction | Yes | Yes | Generic all-message dispatcher |
| Voice busy/start lifecycle | Existing `VoiceInputStoreState` | Voice input | Both consumers observe one operation owner | Yes — add only `isStarting` | Yes — do not add separate component pending refs | Kitchen-sink generic async status |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `StreamContentReceipt` | Yes | Yes | Low | Required `payload` and facade-captured `receivedAt`; exclude redundant context/runtime selectors |
| `StreamContentPresentationBatch` | Yes | Yes | Low | Required `contentPayloads` and one `latestActivityAt`; context remains the method argument |
| Pending context/content entries | Yes | Yes | Low | Key by context + turn/id/type; retain one concatenated delta per identity and overwrite only the context's latest activity scalar on accepted receipt |
| Scheduler options/constant | Yes | Yes | Low | One exported default; optional clock seam only for tests |
| Voice lifecycle flags | Yes, with invariant | Yes | Medium | Document mutually exclusive starting/recording/transcribing and use one operation source |
| Startup attempt generation | Yes | Yes | Low | Internal number only; never exposed as UI state |
| Source-guarded cancel command | Yes | Yes | Low | Explicit source only; store reads current state/owner and components do not duplicate predicates |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/services/agentStreaming/presentation/streamContentPresentationTypes.ts` (Add) | Agent streaming presentation | Shared contract owner | `StreamContentReceipt` and `StreamContentPresentationBatch` with required activity fields | Prevents incomplete/parallel timestamp shapes across facades/scheduler/projector | Canonical shared types |
| `autobyteus-web/services/agentStreaming/presentation/StreamContentPresentationScheduler.ts` (Add) | Agent streaming presentation | Scheduler | Runtime-agnostic batching, exact identity aggregation, latest activity per context, fixed deadline, flush/cancel lifecycle | Cohesive bounded local loop | Uses canonical receipt/batch types |
| `autobyteus-web/services/agentStreaming/presentation/streamContentBatchProjector.ts` (Add) | Agent streaming presentation | Batch projector | One context batch -> activity assignment + segment mutations -> at most one known commit | Keeps mutation transaction out of timer owner | Shared by both services |
| `autobyteus-web/services/agentStreaming/presentation/__tests__/StreamContentPresentationScheduler.spec.ts` (Add) | Agent streaming tests | Scheduler contract | Fake-time cadence, coalescing, per-context latest activity, flush/reentrancy | One owner-focused suite | Tests shared policy/types |
| `autobyteus-web/services/agentStreaming/presentation/__tests__/streamContentBatchProjector.spec.ts` (Add) | Agent streaming tests | Projector contract | Activity assignment, exact content, one known revision, timestamp-only no-revision | One transaction-focused suite | Tests shared batch type |
| `autobyteus-web/services/agentStreaming/AgentStreamingService.ts` (Modify) | Agent streaming | Standalone facade | Capture content receipt time; own scheduler; enqueue receipt; flush before non-content and lifecycle | Existing connection boundary | Reuses shared presentation files |
| `autobyteus-web/services/agentStreaming/TeamStreamingService.ts` (Modify) | Agent streaming | Team facade | Capture receipt time; resolve context then enqueue; flush before all non-content/projection/cleanup and lifecycle | Existing team routing boundary | Reuses shared presentation files |
| `autobyteus-web/services/agentStreaming/teamStreamGenericMessageDispatcher.ts` (Modify) | Agent streaming | Non-content dispatcher | Remove direct content case; keep witness-based generic events | Clean-cut separation | Existing handlers |
| `autobyteus-web/services/agentStreaming/handlers/segmentHandler.ts` (Modify) | Agent streaming handlers | Segment mutation owner | Return whether content created/appended presentation state | Existing natural owner | Batch projector consumes result |
| `autobyteus-web/services/eventMonitor/recentEventMonitorMutationCommit.ts` (Modify) | Event monitor | Commit boundary | Add known-change retention/revision commit | Existing invariant owner | Reuses enforcement |
| Existing `AgentStreamingService.spec.ts`, `TeamStreamingService.spec.ts`, `recentEventMonitorProductionDispatch.spec.ts`, `recentEventMonitorMutationCommit.spec.ts` (Modify) | Tests | Production path contracts | Deterministic cadence, semantic/disconnect flush, exact revisions/content, standalone latest receipt recency, and interleaved-member recency | Existing affected suites | Reuse fake WS/context fixtures |
| `autobyteus-web/stores/voiceInputStore.ts` (Modify) | Voice input | Lifecycle owner | `isStarting`, attempt invalidation, `cancelOperationForSource`, local resource commit/disposal | Existing resource/state owner | Existing source and cleanup |
| `autobyteus-web/components/agentInput/AgentUserInputTextArea.vue` (Modify) | Voice UI | Composer consumer | Starting visibility, spinner/status, disabled/aria state, composer-scoped unmount cancellation | Existing composer surface | Store state/action |
| `autobyteus-web/components/settings/VoiceInputExtensionCard.vue` (Modify) | Voice UI | Settings consumer | Settings-test starting state, disabled controls, and settings-test-scoped unmount cancellation | Existing settings surface and initiating caller | Store state/action |
| `autobyteus-web/localization/messages/en/settings.ts`, `zh-CN/settings.ts` (Modify if new settings text is used) | Localization | Settings catalog | Localized "Starting microphone" label/status | Existing hand-authored catalog | Existing localization runtime |
| Existing `voiceInputStore.spec.ts`, `AgentUserInputTextArea.spec.ts`, and `VoiceInputExtensionCard.spec.ts` (Modify) | Tests | Voice contracts | Same-turn starting, duplicate guard, source isolation, failure/cancel, settings-card unmount during deferred startup, active recording disposal, and transcription preservation | Existing focused suites | Existing media/component mocks |
| `autobyteus-web/tests/e2e/runtime-streaming-responsiveness-probe.mjs` (Add) | E2E probes | Browser validation | Reproducible timer drift, click-to-visible latency, revision/content counts | Durable acceptance probe for web-equivalent Electron behavior | Existing Playwright/browser endpoint patterns |

## Applied Patterns (If Any)

- **Bounded scheduler loop:** one owner implements fixed-window batching; the deadline is not reset by later events, avoiding debounce starvation.
- **Unit of work / mutation transaction:** one context batch applies all content then commits retention/revision once.
- **Latest-value aggregation:** each pending context keeps only the newest receipt/activity scalar while content bytes retain exact per-identity order.
- **Thin facade with owned mechanism:** live services keep connection/routing authority and encapsulate the scheduler rather than exposing it to stores.
- **Generation-token plus source-guarded cancellation:** the voice store rejects stale async continuations and validates consumer ownership without parallel resource owners.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/services/agentStreaming/presentation/` | Folder | Stream presentation capability | Tight receipt/batch types, scheduler, batch projector, owner-focused tests | Distinguishes cadence/projection from protocol, transport, and handlers | Vue components, team route resolution, backend logic |
| `.../presentation/streamContentPresentationTypes.ts` | File | Shared contract owner | Required receipt and batch activity/content shapes | Shared semantic boundary among facade/scheduler/projector | Optional timestamps, runtime selectors, behavior |
| `.../presentation/StreamContentPresentationScheduler.ts` | File | Scheduler | Pending state, latest activity, timing/flush policy | Shared service-internal owner | Segment mutations, timestamp generation, or runtime branching |
| `.../presentation/streamContentBatchProjector.ts` | File | Batch projector | Context activity/content/revision transaction | Same capability, separate concern | Timers or raw message parsing |
| `.../AgentStreamingService.ts` | File | Standalone connection facade | Receipt timestamp, scheduler lifecycle, message boundary | Existing authoritative entry | Duplicate content dispatcher |
| `.../TeamStreamingService.ts` | File | Team connection/routing facade | Receipt timestamp, flush ordering, exact context resolution, enqueue | Existing authoritative team entry | Scheduler pending implementation |
| `.../handlers/segmentHandler.ts` | File | Segment mutation | Typed mutation and result | Existing owner | Cadence or presentation timer |
| `autobyteus-web/services/eventMonitor/recentEventMonitorMutationCommit.ts` | File | Event-monitor commit | Witness-based and known-change commits | Existing retention/revision owner | Transport/runtime knowledge |
| `autobyteus-web/stores/voiceInputStore.ts` | File | Voice lifecycle | State/resource/generation/source-guarded cancellation | Existing store boundary | Component presentation markup |
| Existing voice component/catalog/test paths | Files | Voice presentation/tests | Render/verify startup and emit fixed-source unmount cancellation | Existing surface ownership | Media lifecycle duplication or component-side source predicates |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `services/agentStreaming/` | Mixed Justified | Yes | Medium | Existing capability includes facades/protocol/handlers; new `presentation/` grouping makes the new bounded owner visible |
| `services/agentStreaming/presentation/` | Main-Line Domain-Control | Yes | Low | Tight shared types plus timing and mutation-transaction owners reflect real contracts, not empty layers |
| `services/eventMonitor/` | Off-Spine Concern | Yes | Low | Keeps retention/revision authority separate from streaming cadence |
| `stores/` + voice components | Mixed Justified | Yes | Low | Store owns lifecycle; components own UI; no new folder needed for one state addition |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Fixed batching | `first delta -> schedule 100 ms; later deltas append; deadline fires once` | `clearTimeout/setTimeout on every token` | A debounce may never present while a continuous model streams |
| Semantic ordering | `content A1,A2 -> SEGMENT_END => flush A1+A2 -> apply END` | `apply END now; timer appends content later` | Preserves completion/interruption/tool boundaries |
| Team identity | `resolveTeamStreamMemberContext -> enqueue(context, { payload, receivedAt })` | `enqueue(routeKey/id) -> scheduler guesses member` | Keeps complex nested task identity in its authoritative owner while retaining true receipt time |
| Runtime policy | `all SEGMENT_CONTENT -> same scheduler` | `if runtime === autobyteus batch else immediate` | The defect is cadence-sensitive, not runtime-specific |
| Activity/recency | `A@t1, B@t2, A@t3 -> batch A.latest=t3, B.latest=t2 -> one assignment/revision per changed context` | `timestamp at flush` or one global latest timestamp | Preserves current member/team last-activity order without representing scheduler delay or mixing contexts |
| Batch mutation | `assign latestActivityAt -> coalesce exact identity -> handle content -> at most one known commit` | `one timer callback that still calls full generic dispatch for every token` | Bounding timer callbacks alone is insufficient if expensive witness work remains per delta; timestamp does not require its own presentation revision |
| Voice startup | `set isStarting synchronously -> await -> generation check -> commit` | `await initialize/getUserMedia -> set isRecording` | Gives immediate truth and prevents stale post-unmount recording |
| Settings unmount | `onBeforeUnmount -> cancelOperationForSource('settings-test') -> store checks owner/state` | Component stops tracks directly or calls global cleanup unconditionally | Ensures leaving Settings cancels only its startup/recording while transcription/Composer remain correct |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep immediate content dispatch behind a feature flag | Easy rollback | Rejected | One scheduler path; use tests and runtime evidence rather than dual authority |
| Batch only AutoByteus/DeepSeek | Codex did not reproduce the freeze | Rejected | Runtime-agnostic protocol-level policy; Codex gets negligible overhead and the same correctness |
| Add timers separately to feed/Markdown/team components | Local visible symptom | Rejected | Shared scheduler before reactive mutation also fixes hidden contexts |
| Change backend to coalesce or drop events | Could lower frontend message count | Rejected for this change | Frontend owns presentation budget and preserves backend/runtime protocol/durability |
| Keep old voice behavior when startup state unavailable | Avoid consumer edits | Rejected | Update both current consumers and tests in one change |

Hard block: implementation fails this design if direct and scheduled live content paths coexist or runtime/model identity selects between them.

## Derived Layering (If Useful)

`Transport/routing facade -> stream presentation control -> segment/event-monitor state -> Vue presentation`.

This layering is derived from the ownership/spine model. The facade encapsulates, rather than exposes, the presentation-control layer. The event-monitor layer remains an off-spine state invariant owner. Voice is a separate local path: `consumer -> store lifecycle -> browser/electron adapter`.

## Change / Refactor Sequence

1. Add tight `StreamContentReceipt`/`StreamContentPresentationBatch` types and scheduler contract/tests with a 100 ms exported default, facade-captured receipt time, per-context latest-activity replacement, exact content identity grouping, multi-context behavior, non-sliding deadline, forced flush, and reentrant enqueue safety.
2. Make `handleSegmentContent` return a truthful mutation result and add the event-monitor known-change commit. Add focused tests before integrating services.
3. Add the batch projector and prove latest activity assignment, exact concatenation, segment identity, at most one revision per changed context batch, timestamp-only no-revision behavior, and recent-window retention.
4. Integrate the standalone service: capture receipt time immediately after parse, construct one scheduler, enqueue timestamped content, flush before every non-content dispatch, flush on context replacement/remote disconnect/explicit disconnect, and remove its direct content switch case. Test two receipts advance `updatedAt` to the later value with one batch revision.
5. Integrate the team service after existing task/member projection resolves content context. Capture the parsed receipt time, enqueue it against the resolved context, flush before every non-content event including team/task projection and cleanup, and remove content from the generic dispatcher. Test nested task-agent and interleaved `A@t1, B@t2, A@t3` so A/B receive t3/t2 respectively without per-delta revisions.
6. Add `isStarting`, the startup-attempt generation invariant, and `cancelOperationForSource` to the voice store. Acquire resources locally and commit only when the attempt remains current; source cancellation synchronously invalidates matching starting/recording before async disposal, ignores another source, and preserves transcription. Update cleanup/reset/toggle invariants.
7. Update composer/settings states, accessibility/disabled behavior, localization where used, and unmount calls. Replace component-global cleanup with fixed-source cancellation. Add a Settings-card lifecycle test using a deferred startup: unmount, resolve the deferred media promise, and verify no late recording/resource commit; also cover recording disposal, source isolation, and transcription continuation.
8. Run focused frontend tests, type/build/guard checks required by the repository, then downstream API/E2E investigation and Electron-backend browser validation against AC-01–AC-07.
9. If the 100 ms bounded path does not meet AC-01/AC-02, capture evidence and return to solution design. Do not silently add component timers, runtime branches, or drop semantic fidelity.

No temporary dual path is permitted. Steps 4 and 5 replace direct content dispatch atomically within their respective service changes.

## Key Tradeoffs

- **100 ms cadence versus token-immediate paint:** introduces at most one small presentation interval under an available event loop, but converts provider-dependent unbounded work into at most 10 scheduled commits per second per active service. Semantic events remain prompt because they force a synchronous flush.
- **Batched activity time versus per-event timestamp mutation:** live recency advances at the same bounded presentation cadence using the last true receipt time, at most 100 ms later in wall-clock application. This preserves ordering/meaning without per-delta reactive work or falsely timestamping the later flush.
- **Frontend versus backend coalescing:** frontend placement fixes every runtime without changing protocol, memory, trace fidelity, or server ownership. Backend coalescing could later reduce transport volume, but it is unnecessary and riskier for this measured defect.
- **Known-change commit versus full witness:** the content path can truthfully mark one revision after a handler-reported create/append; non-content events retain witness comparison where visible no-op behavior matters.
- **Per-service scheduler versus global singleton:** shared class/policy avoids duplication while per-service instances keep lifecycle and pending identity bounded to one socket/team.
- **Unmount cancellation versus transcription continuity:** pending startup and live recording depend on the initiating surface and are canceled; transcription operates on captured audio and continues so leaving Settings does not discard valid work.
- **Whole-source Markdown retained:** preserves current live/completed rendering semantics and keeps scope focused; the bounded cadence is the first-line industry pattern. Incremental Markdown remains a measured follow-up only if acceptance fails.

## Risks

- A missed flush boundary could show completion/tool/status before earlier text. Mitigation: flush on every non-content event, not an allowlist, plus disconnect/context-replacement tests.
- Incorrect team grouping could assign bytes to another member/task agent. Mitigation: route first, key by exact context object and segment identity, and test nested task/team plus two contexts.
- A global or flush-time activity timestamp could misorder live members/team recency. Mitigation: facade-captured receipt plus one latest scalar inside each context bucket; standalone and A/B/A fake-clock tests.
- A timer callback racing an explicit flush could double-apply. Mitigation: cancel handle and snapshot/clear pending state before projector callbacks; fake-time and reentrancy tests.
- Unconditional revision marking could over-report on invalid content. Mitigation: handler returns a mutation boolean; known commit occurs only when at least one payload created/appended presentation state.
- Visible 30,000-character Markdown may still be expensive at 10 Hz on slower hardware. Mitigation: AC-01/AC-02 are blocking validation; any further renderer design is evidence-triggered rework, not ad hoc implementation.
- Voice async resources could leak when cleanup invalidates an attempt. Mitigation: hold newly acquired stream/context/worklet locally until the generation check; stale attempts explicitly stop/close local resources.
- Settings unmount could cancel a composer operation or discard transcription if cancellation is global. Mitigation: `cancelOperationForSource` performs the source/state guard in the store; component callers pass only their fixed source; transcribing is a documented no-op.
- Existing tests assume immediate content mutation. Mitigation: use fake timers/forced semantic boundaries and update assertions to the approved scheduled contract, not arbitrary sleeps.

## Guidance For Implementation

- Implement a throttle/batch, not a debounce: never reset the first pending deadline because content continues to arrive.
- Export one `STREAM_CONTENT_PRESENTATION_INTERVAL_MS = 100` constant and allow only a narrow timer seam if deterministic tests need it. Do not scatter numeric delays.
- Copy/aggregate payloads without mutating parsed protocol objects. Preserve delta bytes exactly using ordered string concatenation for the same context/turn/id/type.
- In each service `handleMessage`, capture `receivedAt = new Date().toISOString()` immediately after successful parse and before other content work. For team content, carry that value through synchronous route resolution and enqueue it only with the resolved context. Do not generate activity time in the timer/flush path.
- A pending context bucket owns `{ contentEntries, latestActivityAt }`. Every accepted receipt replaces only `latestActivityAt` for that same context; content continues to coalesce by turn/id/type. Never use a scheduler-global latest timestamp.
- Treat distinct content identities as commuting only inside a content-only batch. Preserve per-identity byte order and first-seen batch entry order. Any non-content message forces the full service batch first.
- Snapshot and clear pending entries before calling the projector so reentrant events cannot be lost or double-applied.
- `TeamStreamingService` must run existing task-team/task-agent/member resolution before enqueue. It must flush before any non-content projection can remove or change those contexts.
- Both remote and explicit disconnect paths, `attachContext`, and reconnect/context replacement must leave no pending timer targeting detached state.
- In the batch projector, assign `context.conversation.updatedAt = batch.latestActivityAt` once before/with payload application. Keep `beginRecentEventMonitorMutation`/witness commit for non-content dispatch. Use the known-change commit only after `handleSegmentContent` reports a mutation; timestamp-only change does not increment event-monitor presentation revision.
- Voice lifecycle invariant: at most one of `isStarting`, `isRecording`, and `isTranscribing` is true. `recordingSource` identifies the current starting/recording operation; cleanup clears starting/recording source and invalidates the attempt. `cancelOperationForSource(source)` synchronously invalidates only a matching starting/recording operation before awaiting resource close, ignores a different source, and leaves transcribing untouched. A stale async attempt must not toast a cancellation as an error.
- Composer starting state should be visible in the same status region, use a non-recording spinner/tone, disable duplicate activation, and expose `aria-busy`/truthful title. Settings test should similarly show a starting label/status and disable refresh/device/test conflicts. On unmount, composer calls `cancelOperationForSource('composer')` and Settings calls `cancelOperationForSource('settings-test')`; no component stops media resources directly.
- Preserve all existing authorization, MIME, history/hydration, tool approval, task delegation, token usage, error, and persistence behavior.
- Downstream validation must compare exact final bytes/order, latest per-context activity time, presentation revision counts, source-scoped voice lifecycle, and visual speed. Browser validation should use the Electron-started backend and Temp Workspace topology retained in `performance-evidence.md`; actual desktop shell execution is only needed if browser-equivalent validation cannot establish the behavior.
