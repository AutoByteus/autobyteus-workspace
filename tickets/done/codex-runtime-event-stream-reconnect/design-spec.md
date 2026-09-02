# Design Spec

## Current-State Read

The approved behavior basis is `requirements.md` (approved 2026-09-02), supported by `investigation-notes.md` and `runtime-evidence.md` in this ticket folder.

The normal request path is healthy: the web client sends one durable `SEND_MESSAGE`, `AgentRun` forwards it through `CodexAgentRunBackend`, and `CodexThread` starts or steers the native Codex turn. The reported runtime accepted and completed that turn.

The defect is on the native return/event path. `CodexClientThreadRouter` correctly routes Codex's v2 `error` notification to `CodexThread`. The internal `codex-thread-notification-handler.ts` then ignores the required `willRetry` boolean and always calls `markTurnFailed` for a resolved turn. That clears `activeTurnId` and pending MCP correlation. The handler also rewrites the event as terminal. `codex-thread-lifecycle-event-converter.ts` independently applies run-wide structural cleanup to every error by closing all reasoning blocks and clearing all ordered-tool correlation. Later item/message notifications from the still-running native turn are rejected by the correct exact-turn admission guard because the adapter has destroyed the active identity. Architecture review `ARCH-REV-001` additionally established that this run-wide converter cleanup is incorrect even for a real turn-terminal error: a late error for retired turn A can leave newer active turn B intact in `CodexThread` while still erasing B's converter-owned reasoning/tool state.

`ARCH-REV-002` verified the revised converter cleanup design, then exposed a second consequence on approved `UC-003`. For late terminal/completion A while B is active, `CodexThread.markTurnFailed(A)` or `markTurnCompleted(A)` correctly refuses to mutate B, but the notification is still emitted. Canonical lifecycle keeps B running and the WebSocket mapper preserves A identity, yet frontend `handleTurnCompleted` and terminal `handleError` ignore `turn_id` and complete/terminalize the latest B response and its open tools. The following running status does not undo `isComplete`; later valid B segments can therefore split into a second response.

Common diagnostic ownership remains correct: canonical `TURN_DIAGNOSTIC` evidence does not terminalize `AgentTurnLifecycleState`; the WebSocket mapper preserves diagnostic scope/effect; and the frontend appends a diagnostic without completing the conversation. Normal UI replay reads the application-owned trace, so events discarded before the fix cannot be reconstructed by the target live path.

The target design preserves existing ownership and closes both defects at the earliest identity-owning Codex boundary. The notification handler classifies native error terminality and suppresses an explicitly identified stale terminal/completion/failed-status boundary before it becomes a `CodexThreadEventMessage`. The converter retains the accepted identity-scoped cleanup matrix for emitted errors. Generic admission, canonical lifecycle, transport, frontend production code, and persistence schemas remain unchanged.

## Intended Change

Change the Codex adapter's handling of a native turn `error` notification as follows:

- Resolve the exact turn as today.
- Treat only an exact upstream `willRetry === true` as `error_scope: "turn"`, `error_effect: "diagnostic"`.
- For a retry diagnostic, emit the normalized local-derived error without calling `markTurnFailed` or clearing thread/pending state.
- Treat `willRetry: false` as terminal. For defensive malformed/older payloads with a resolved turn but no exact boolean `true`, retain the existing conservative terminal behavior rather than guessing from error message text.
- Before mutating or emitting a terminal turn error, `turn/completed`, or turn-identified failed `thread/status/changed`, compare its exact resolved turn id to the current `CodexThread.activeTurnId`. When both identities are non-empty and different, classify the boundary as stale and return the existing no-emission handling result: no thread mutation, local-derived event, or native listener emission.
- In the lifecycle converter, select structural cleanup from canonical scope, effect, and exact turn identity: preserve all trackers for an exact turn diagnostic; clean only the identified turn for an exact turn-terminal error; clean run-wide for a runtime-global terminal error or a genuinely unclassified error, preserving current defensive behavior.
- Continue using the common canonical error pipeline so a diagnostic is visible while the turn remains running and later same-turn events are admitted, persisted, streamed, and rendered.
- Continue emitting matching-active terminal/completion events and runtime-global failures exactly as canonical inputs. A suppressed stale A boundary is intentionally absent from canonical live output and the application replay trace, so it cannot be misapplied to B. Existing opt-in Codex thread debug logging may record only method/run/event-turn/active-turn metadata for diagnosis.

No new runtime service, reconnect loop, persistence schema, frontend production branch, compatibility adapter, or historical repair path is introduced.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind (`User`/`System`/`Operational`/`Contract`) | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| `BEH-001` | Contract / System | `REQ-001`, `REQ-002`, `REQ-006`; `AC-001`, `AC-003` | Codex v2 `ErrorNotification` for an active turn with required `willRetry`, `threadId`, and `turnId` | Investigation `BEH-001`; runtime evidence “Upstream Protocol Contract” and “Fault Localization” | `willRetry: true` becomes a turn diagnostic that preserves active state/correlation; `false` remains terminal | Native return flow `DS-002`; notification classification `DS-003`; conversion cleanup `DS-004` |
| `BEH-002` | User / System | `REQ-002`, `REQ-003`, `REQ-005`; `AC-001`, `AC-002`, `AC-003`, `AC-006` | A retrying native Codex turn subsequently emits valid reasoning, item/tool, assistant, usage, and completion events | Investigation `BEH-002`; runtime evidence timeline and application trace divergence | Later events remain eligible for exact-turn admission and follow the existing canonical stream/replay path to the user | Request path `DS-001`; return/event path `DS-002`; bounded local paths `DS-003`, `DS-004` |
| `BEH-003` | Contract | `REQ-004`, `REQ-005`; `AC-004`, `AC-005`, `AC-006` | Native `error` with `willRetry: false`, failed thread status, runtime-global failure, or late old-turn boundary | Investigation `BEH-003`; existing Codex thread unit tests; architecture findings `AR-F-001`, `AR-F-002` | Preserve matching terminal cleanup and runtime-global behavior; suppress an explicitly stale A terminal/completion/failed-status boundary before canonical emission so active B state, converter trackers, replay, wire output, and one-response UI projection remain intact | Return/event path `DS-002`; terminal/suppression arms of `DS-003`; cleanup `DS-004` |

The behavior map defines what real behavior the design must serve. The spine sections below define how the target structure carries it.

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related Requirement / Acceptance-Criteria IDs (When Applicable) | Relationship To This Design | Status / Approval Applicability |
| --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-event-stream-reconnect-release-v1.4.67/tickets/done/codex-runtime-event-stream-reconnect/runtime-evidence.md` | Exact production timeline, trace divergence, upstream v2 contract, and fault localization | `REQ-001`, `REQ-002`, `REQ-003`; `AC-001`, `AC-002`, `AC-003` | Establishes that Codex recovered and identifies `willRetry` plus the adapter state mutation as the design premise | `Complete`; approval `N/A` (evidence only) |

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): `Bug Fix`
- Current design issue found (`Yes`/`No`/`Unclear`): `No`
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): `Local Implementation Defect`
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): `No`
- Evidence: Native routing, thread-state ownership, exact-turn admission, canonical diagnostic evidence, WebSocket mapping, and frontend projection each have singular existing owners. The notification handler already owns native lifecycle mutation and the emit/no-emit decision; it is the only point that simultaneously knows the exact native boundary turn and current active turn. The converter owns structural trackers and exposes exact-turn cleanup for `turn/completed`. `AR-F-001` proves converter cleanup must be identity-scoped; `AR-F-002` proves preserving a stale A terminal event beyond the Codex boundary lets turn-blind frontend terminal handlers corrupt active B.
- Design response: Correct the conditional inside the same two Codex owners. The notification handler classifies retry intent and suppresses only explicitly stale turn-terminal/completion/failed-status boundaries before listener emission. The converter reuses its existing exact-turn boundary hooks for emitted valid turn terminals and reserves all-scope hooks for runtime-global/unclassified errors. One joined test-only integration proves native input through canonical/wire output and the resulting one-message B frontend projection.
- Refactor rationale: No public API, identity shape, file placement, production frontend state, or shared data structure needs to change. `CodexNotificationHandlingResult` already expresses local-derived events plus native emit/no-emit. A new classifier/filter service or frontend runtime-specific branch would add indirection or broaden non-Codex behavior. The normalized `error_scope`/`error_effect` shape remains authoritative for events that are emitted.
- Intentional deferrals and residual risk, if any: Retry-card visual severity/deduplication and historical trace backfill are explicitly outside the approved scope. They do not leave the corrected live lifecycle on a known-bad boundary.

## Terminology

- **Native retry diagnostic:** A Codex app-server `error` notification whose exact `willRetry` value is `true`.
- **Native terminal turn error:** A Codex app-server `error` notification whose `willRetry` is `false`, or a defensively malformed turn-associated error that does not contain exact boolean `true`.
- **Structural cleanup:** Closing tracked reasoning blocks and clearing pending/ordered tool correlation at an actual terminal boundary.
- **Explicit stale turn boundary:** A Codex turn-terminal error, completion, or turn-identified failed status whose non-empty resolved turn id differs from the non-empty current `activeTurnId`.
- **Suppression:** Consume that stale native boundary at the `CodexThread` notification handler and emit neither a local-derived nor native thread event; it is therefore absent from canonical processing, application replay, WebSocket output, and UI projection.
- **Application-owned replay trace:** The AutoByteus JSONL event trace used by normal run-view history, distinct from Codex's own rollout/session history.

## Design Reading Order

This design follows the template order: verified behavior and health decision, data transition, full spines, owner/boundary rules, existing subsystem and file allocation, then change sequence and implementation guidance.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: Remove the obsolete assumption that every native Codex turn error is terminal and the corresponding unconditional structural cleanup behavior.
- No file or public API is obsolete. Removal is behavioral and occurs directly in the existing handler/converter branches.
- The target must not accept aliases such as `will_retry`, parse `Reconnecting... n/5`, add dual notification handlers, or retain a second “legacy all-terminal” path.
- Persisted event schemas remain current and directly usable; no compatibility reader or dual write is authorized.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject, location, representative shape, and approximate volume: Per-run application event traces at `~/.autobyteus/server-data/memory/agents/<run-id>/raw_traces*.jsonl`. The affected file was 158,455 bytes/155 records; the affected turn had only its user record because subsequent events were discarded.
- Relevant code-model, serialization, semantic, or physical-store change: No schema or serialization change. Existing canonical error fields carry diagnostic semantics; existing event shapes carry later reasoning/tool/text/completion records.
- Normal reader/writer behavior and representative evidence: The normal run projection reads the application-owned replay trace; common event persistence already records canonical diagnostic events and admitted subsequent events. The native Codex history provider is diagnostic-only and not part of normal UI hydration.
- Required semantics and invariants under direct use: Preserve event order, exact run/turn identity, per-tool outcomes, and existing historical records. Do not rewrite or duplicate turns.
- Physical-store, privacy/security, disposal/rebuild, and operational constraints: Existing traces are user data and must not be rewritten. Codex rollout content may be sensitive and is not a substitute store for automatic backfill.
- Decision (`Not Affected`/`Directly Usable — No Migration`/`Discard or Rebuild`/`Migration Required`/`Undetermined`): `Directly Usable — No Migration`
- Decision rationale, including concrete benefit versus I/O, downtime, corruption, recovery, and rollout cost: Correctly classified future events fit the present schema. A migration cannot recreate events absent from application traces and would add corruption/privacy/operational risk without a correctness benefit.
- Acceptance criteria or design constraints supported by this decision: `AC-002`, `AC-006`, `AC-007`; no historical repair, compatibility reader, or storage rewrite.

### Migration Plan (Only When Decision Is `Migration Required`)

N/A — no migration is required or authorized.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| `DS-001` | Primary End-to-End | `BEH-002`, preserved `BEH-003` | User sends follow-up in the agent chat | Codex app-server accepts one turn | `AgentRun` | Establishes single-submission identity and proves provider retry must not introduce a parallel send/reconnect command path |
| `DS-002` | Return-Event | `BEH-001`, `BEH-002`, `BEH-003` | Codex app-server emits a native turn event | Non-stale canonical events reach replay/wire/UI; explicitly stale A terminal boundaries stop before canonical emission; B remains one running response until B's own boundary | `AgentRun`, with `CodexThread` authoritative for native thread identity and containment | Carries corrected classification and stale-boundary containment to the meaningful user-visible/persisted outcome |
| `DS-003` | Bounded Local | `BEH-001`, `BEH-003` | Routed native Codex error/completion/failed-status notification | Normalized local-derived/native event plus preserved/terminalized state, or no emission for an explicitly stale boundary | `CodexThread` | Owns decisive `willRetry`, exact event-versus-active identity, active-turn mutation, and emission admission |
| `DS-004` | Bounded Local | `BEH-001`, `BEH-002`, `BEH-003` | Normalized Codex error enters event conversion | Canonical `AgentRunEvent.ERROR`, with scope/effect/identity-appropriate tracker cleanup | `CodexThreadEventConverter` | Prevents both diagnostic terminalization and cross-turn cleanup leakage from a late terminal boundary |

## Primary Execution Spine(s)

`DS-001: Agent chat / agentRunStore.sendUserInputAndSubscribe -> AgentStreamingService SEND_MESSAGE -> AgentStreamHandler -> AgentRun command coordination -> CodexAgentRunBackend.dispatchUserInput -> CodexThread.startInput/appendInput -> Codex app-server turn`

No node on this spine changes. Its single accepted command/turn identity is a preserved invariant.

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| `DS-001` | The user sends one follow-up. Existing transport and command coordination restore if necessary and forward exactly one start/append request to the owned Codex thread. | Agent chat, `AgentRun`, `CodexAgentRunBackend`, `CodexThread`, Codex app-server | `AgentRun` | Command dedupe/acknowledgement, runtime bootstrap |
| `DS-002` | Native events route to the matching thread. The thread contains an explicitly stale A terminal boundary before emission; every admitted non-stale event converts to canonical batches, is processed by AgentRun lifecycle/persistence, maps to WebSocket messages, and projects into conversation/activity. Thus the B projection never receives A terminal/error/completion and remains one response until B's own boundary. | Codex app-server, `CodexThread`, `CodexThreadEventConverter`, `AgentRun`, client projection | `AgentRun` outward; `CodexThread` for native identity/containment | Replay writer, status mapper, frontend segment projection |
| `DS-003` | The matching thread reads exact `willRetry` and exact event turn identity. A diagnostic keeps active/pending state and emits normalized diagnostic evidence. A matching terminal invokes the existing guarded failure transition and emits terminal evidence. A terminal/completion/failed-status for explicit A while B is active returns no events and leaves B untouched. | `CodexThread`, notification handler, active turn/pending MCP registry | `CodexThread` | Turn-id resolver, native JSON shape, opt-in safe debug log |
| `DS-004` | The converter validates normalized error scope/effect/exact `turn_id`. Exact turn diagnostics emit only error content; exact turn-terminal errors close/clear only that turn; runtime-global terminal and genuinely unclassified errors retain run-wide cleanup. Later valid events for another active turn reuse intact trackers. | Lifecycle converter, reasoning tracker, ordered-tool tracker, canonical error event | `CodexThreadEventConverter` | Status-hint resolver, item payload parser |

## Spine Actors / Main-Line Nodes

- **Agent chat / AgentStreamingService:** initiates and transports one accepted user command.
- **AgentStreamHandler / AgentRun:** command ingress and canonical run lifecycle/event orchestration.
- **CodexAgentRunBackend:** canonical runtime-adapter facade; dispatches input and publishes converted source batches.
- **CodexThread:** authoritative native thread state, active-turn identity, notification admission, and pending MCP correlation.
- **Codex app-server:** external native runtime and source of the authoritative retry contract.
- **CodexThreadEventConverter:** stateful native-to-canonical event transformation and reasoning/ordered-tool correlation.
- **AgentRun event pipeline / trace writer:** canonical lifecycle and application replay persistence.
- **AgentRunEventMessageMapper / frontend projector:** wire projection and user-visible conversation/activity state for canonical events admitted by the Codex boundary; neither owns native stale-boundary policy.

## Ownership Map

- `AgentRun` owns canonical command lifecycle, canonical status, processing, and outward event sequencing.
- `CodexAgentRunBackend` is the runtime-specific facade used by `AgentRun`; it owns dispatch adaptation and source-batch publication, not native notification terminality.
- `CodexThread` owns the native thread lifecycle, exact active turn, and admission of native lifecycle facts into its listener stream. Its notification handler is the internal owned mechanism that compares exact boundary and active identities, mutates state only for the matching/native-global case, and suppresses an explicitly stale turn boundary before emission.
- `CodexThreadEventConverter` owns conversion-time reasoning and ordered-tool trackers. It must align cleanup with normalized lifecycle effect; it must not reinterpret native retry text.
- `AgentTurnLifecycleState` owns generic diagnostic versus terminal canonical status and remains unchanged.
- Frontend projection owns display mutation only and must not infer provider retry terminality or add Codex-specific stale-event policy. It remains turn-blind for terminal projection in this scope, so the Codex owner must not emit a stale terminal/completion that could be misapplied.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `AgentStreamHandler` WebSocket entry | `AgentRun` command/lifecycle owner | Translates authenticated transport commands and streams mapped events | Codex retry policy or native turn state |
| `CodexAgentRunBackend` | `CodexThread` for native state; `CodexThreadEventConverter` for conversion | Satisfies the common backend contract and joins native events to canonical batches | Duplicate `willRetry` classification or a second tracker lifecycle |
| `CodexClientThreadRouter` | Registered `CodexThread` | Multiplexes one client's native events by thread identity | Turn terminality or canonical status |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Unconditional `markTurnFailed` for every turn-associated native `error` | Violates upstream `willRetry` and causes the production event loss | Effect-aware branch in `codex-thread-notification-handler.ts` under `CodexThread` | `In This Change` | `markTurnFailed` itself remains for real terminal errors |
| Unconditional run-wide reasoning/tool cleanup for every Codex `error` | Diagnostics are not boundaries, and a turn-terminal error owns only its exact turn; run-wide cleanup can erase a newer active turn | Scope/effect/identity-aware cleanup in `codex-thread-lifecycle-event-converter.ts` using existing turn-boundary and all-scope hooks | `In This Change` | Exact turn terminal cleans that turn; runtime-global and genuinely unclassified errors retain current run-wide cleanup |
| Emission of an explicitly stale Codex turn-terminal/completion/failed-status boundary while another turn is active | Canonical lifecycle preserves B, but turn-blind frontend terminal handlers misapply the A boundary to B | Existing emit/no-emit decision in `codex-thread-notification-handler.ts`, guarded by exact event-turn versus active-turn identity | `In This Change` | Do not replace it with a downstream filter, tombstone, or compatibility event; matching/runtime-global boundaries remain emitted |
| Any proposed retry-text parsing or parallel reconnect/replay path | The protocol already supplies an exact boolean and existing common projection works | Exact native contract plus existing canonical diagnostic pipeline | `In This Change` (reject, do not add) | No compatibility alias or dual path |

## Return Or Event Spine(s) (If Applicable)

`DS-002: Codex app-server notification -> CodexClientThreadRouter -> CodexThread admission/notification handling -> CodexThreadEventConverter -> CodexAgentRunBackend source batch -> AgentRun lifecycle + replay trace -> AgentStreamHandler / AgentRunEventMessageMapper -> AgentStreamingService / agentStreamMessageProjector -> conversation and Activity UI`

Authority changes at three explicit points: native state and native-event emission admission in `CodexThread`, canonical events in `AgentRun`, and display state in the frontend projector. For an explicit stale A terminal boundary, `DS-002` intentionally terminates at `CodexThread`; every downstream stage receives no A event. For diagnostics, matching terminal/completion, and runtime-global failures, the full spine remains unchanged.

### Stale-Boundary Containment And Event/Replay Semantics

| Native input at `CodexThread` | Active identity | Thread state action | Thread/canonical emission | Replay / wire / projection outcome |
| --- | --- | --- | --- | --- |
| `error` with exact `willRetry: true` for the active turn | Same exact turn | Preserve active/status/pending state | Emit normalized turn diagnostic | Persist and stream the diagnostic; later same-turn B events continue in one response |
| `error` with terminal effect, `turn/completed`, or turn-identified failed status for the active turn | Same exact turn | Apply existing matching terminal/completion transition | Emit terminal/completion as today | Persist/stream and terminalize that same response |
| Terminal error, completion, or turn-identified failed status for retired A | Newer B active and exact A differs from B | No mutation; retain B and its pending state | Suppress both local-derived and native emission using existing `CodexNotificationHandlingResult` | No canonical event, lifecycle companion, trace record, replay item, WebSocket frame, or UI mutation for the stale boundary; B continues and completes only on B's boundary |
| Runtime-global failure | Any | Apply existing run-wide runtime failure | Emit runtime-global terminal error | Persist/stream and terminalize the run as today |
| Malformed/non-exact-`true` error without an exact conflicting turn identity | Active or idle | Retain existing conservative fallback/terminal handling | Emit as today | No new compatibility or missing-identity policy is introduced |

Suppression is prospective native-event emission admission, not historical repair. It performs no thread pending-state cleanup because the only current pending registry belongs to B, and no converter cleanup because the event never enters the converter. Retired A tracker state has already been closed by A's prior boundary or reset by B's admitted `turn/started`, whose existing converter behavior closes/clears prior run trackers. The thread handler must not bypass the converter to clean trackers. Existing application traces stay unchanged, and no already persisted event is deleted. The native Codex rollout/history remains available through its existing diagnostic-only surfaces. When `CODEX_THREAD_EVENT_DEBUG=1`, the handler may use existing `debugCodexThreadEvent` to log only `runId`, native method, stale event turn id, and active turn id; this log is non-authoritative and must not carry error contents or become a replay source.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `CodexThread` (`DS-003`)
  - `native error/completion/failed status -> resolve exact event turn -> compare with active turn -> explicit stale terminal boundary: no mutation/no emission -> otherwise inspect willRetry or apply matching/global lifecycle -> emit normalized/local or native event`
  - This matters because both clearing the active turn on a retry and emitting a stale A terminal fact toward a turn-blind B projection violate the approved lifecycle.
- Parent owner: `CodexThreadEventConverter` (`DS-004`)
  - `normalized error -> validate scope/effect/exact turn identity -> exact turn diagnostic: retain trackers / exact turn terminal: close+clear that turn / runtime-global terminal or genuinely unclassified: close+clear all -> create canonical ERROR -> status-hint resolution`
  - This matters because tracker cleanup is independent of the thread's guarded active-turn mutation: a late terminal error for retired turn A must not synthesize reasoning ends or erase ordered-tool correlation for active turn B.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Turn-id resolution | `DS-003` | `CodexThread` | Resolve supported camel/snake/nested turn identity | Centralizes exact identity extraction | Text/error policy could become coupled to routing |
| Pending MCP registry | `DS-003` | `CodexThread` | Preserve start arguments until completion | Native completion can require earlier facts | Clearing it on diagnostics loses tool fidelity |
| Reasoning-block tracker | `DS-004` | `CodexThreadEventConverter` | Maintain balanced reasoning segments by exact turn and expose turn-scoped/all-scope closure | Native deltas/completions arrive incrementally and late boundaries can target retired turns | Diagnostic cleanup or run-wide cleanup for old turn A can create an artificial end for active B |
| Ordered-tool tracker | `DS-004` | `CodexThreadEventConverter` | Correlate raw tool output by exact turn/invocation/name and expose turn-scoped/all-scope clearing | Some later raw events omit names and late boundaries can target retired turns | Clearing all for a diagnostic or old turn A suppresses/mislabels active B logs |
| Status-hint resolution | `DS-002`, `DS-004` | Canonical event conversion | Convert terminal evidence to error hint while diagnostics remain status-neutral | Prevents payload name alone from forcing error status | Duplicate policy in frontend/backend facade |
| Replay persistence | `DS-002` | `AgentRun` event pipeline | Persist canonical admitted events | Normal UI history is application-owned | Native-history backfill would bypass canonical ownership |
| Frontend diagnostic/terminal projection | `DS-002` | Frontend conversation state | Render emitted diagnostics and terminal boundaries; mutate the current response under existing semantics | Makes lifecycle visible | Codex-specific filtering or provider-contract inference in UI; receiving stale A would corrupt B, so containment stays upstream |
| Token-usage handling | `DS-002` | `CodexThread` / backend | Record exact-turn usage independently | Same notification handler contains this separate established branch | Retry fix could accidentally broaden into unrelated accounting change |

## Ownership Boundaries

- Native Codex notification facts cross from the external app-server through `CodexClientThreadRouter` into the registered `CodexThread`. Only the thread boundary may mutate `activeTurnId`, native status, and pending MCP state.
- The notification handler is internal to `CodexThread`; it also owns whether one routed native lifecycle notification is emitted to thread listeners. Callers must not invoke it as an alternative public boundary, mutate `runContext.runtimeContext.activeTurnId` directly, or re-emit a notification it suppresses.
- The converter accepts only branded native-admitted or local-derived `CodexThreadEventMessage` values from the thread. It owns transformation trackers but not thread state. Its lifecycle context must expose both existing identity-scoped boundary cleanup (`closeReasoningBlocksForBoundary`, `clearOrderedToolsForBoundary`) and run-wide cleanup (`closeAllReasoningBlocks`, `clearAllOrderedTools`); the lifecycle converter selects among them only from valid canonical error evidence.
- `CodexAgentRunBackend` publishes converter output through the common backend contract. A suppressed stale boundary never reaches it. Generic lifecycle/persistence/transport consumers must depend on canonical `AgentRunEvent`, not inspect native `willRetry` or recover a suppressed native event.
- The frontend depends on canonical error scope/effect and must not parse Codex-specific fields or retry text.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `CodexThread.handleAppServerNotification(method, params)` | Segment admission, notification handler, active-turn state, pending MCP registry, stale-boundary containment, event branding/emission | `CodexClientThreadRouter` | Router/backend calling `markTurnFailed`, editing `activeTurnId`, re-emitting a suppressed boundary, or emitting unbranded error events | Strengthen thread-owned handling, not router/publisher policy |
| `CodexThreadEventConverter.convert(event)` | Lifecycle/item/raw converters, reasoning tracker, ordered-tool tracker, identity-scoped and run-wide cleanup hooks, status hint | `CodexAgentRunBackend` | Backend directly closing trackers, choosing cleanup scope, or creating Codex canonical error payloads | Extend the owned lifecycle-converter context with the existing turn-boundary cleanup hooks |
| `AgentRun` backend/event pipeline | Lifecycle state, canonical processing, replay persistence, outward listeners | `AgentStreamHandler` and other run callers | Transport handler reading native Codex params or writing replay directly | Extend canonical contract only if approved; not needed here |
| `dispatchAgentStreamMessage` / frontend handlers | Conversation/activity projection | `AgentStreamingService` | Component parsing `willRetry`, adding Codex-specific identity filtering, or receiving a deliberately re-emitted stale boundary | Keep Codex containment upstream; no frontend production extension needed |

## Dependency Rules

- `CodexClientThreadRouter` may route native JSON notifications only through `CodexThread.handleAppServerNotification`.
- `CodexThread` may use its internal notification handler and state APIs; the handler may classify only from exact protocol fields, the resolved event identity, and the thread's current active identity.
- The notification handler may emit the existing local-derived event shape or return the existing no-emission result for an explicit stale turn boundary. It may not call frontend, persistence, mapper, or generic lifecycle code; downstream code may not reconstitute the suppressed event.
- `CodexThreadEventConverter` may depend on normalized `error_scope`/`error_effect`/exact `turn_id`, existing parser/trackers, and canonical event types; it may not mutate `CodexThread` state. Exact turn-terminal cleanup must call only turn-boundary hooks; run-wide hooks are reserved for runtime-global terminal or genuinely unclassified errors.
- Generic AgentRun and frontend code may depend on canonical diagnostic/terminal evidence only; they must not depend on Codex `willRetry`.
- Generic AgentRun, replay, mapper, and frontend code remain unchanged. Adding a shared stale-event filter or a Codex branch in those layers is forbidden for this scope.
- The single `autobyteus-web/tests/integration` regression may import server production owners through test-only relative workspace paths so it can join native input to real frontend projection. No file under web production folders and no `autobyteus-web/package.json` production dependency may import or depend on server implementation.
- Exact-turn admission remains mandatory and must not be weakened to accept events with no active turn as a workaround.
- No text parsing, global retry singleton, duplicate event listener, native-history read, or resend from the observer/UI is permitted.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `CodexThread.handleAppServerNotification(method, params)` | One registered Codex thread/run | Admit, apply, and conditionally emit one routed native notification | Registered thread plus protocol `threadId`/`turnId`; governed items receive exact normalized `turn_id` | Signature unchanged; it honors the handler's existing `emitNativeMessage` result |
| `handleAppServerNotification(codexThread, brandedMessage)` | One admitted native notification | Internal state mutation, retry classification, stale-boundary containment, and local/native emit decision | Branded `native_admitted` message, exact resolved event turn when present, and owning thread's current active turn | Exact `willRetry === true` selects diagnostic; explicit mismatched terminal/completion/failed-status returns no events and `emitNativeMessage: false` |
| `CodexThread.markTurnFailed(turnId)` | One active Codex turn | Guarded terminal transition/cleanup | Exact turn id equal to current active turn | Unchanged; must only be called on terminal path |
| `CodexThreadEventConverter.convert(message)` | One run's native/local-derived event stream | Stateful native-to-canonical conversion | Branded thread event; valid turn diagnostic/terminal errors require canonical scope/effect plus exact `turn_id` | Signature unchanged; lifecycle context gains existing turn-boundary hooks so cleanup becomes scope/effect/identity-aware |
| Lifecycle converter `closeReasoningBlocksForBoundary(codexEventName, payload)` / `clearOrderedToolsForBoundary(payload)` | One exact turn's conversion trackers | Close/clear only the turn resolved from an already validated exact-turn payload | Canonical payload with non-empty `turn_id` | Reuse existing methods already used by `turn/completed`; never call for an unvalidated/missing turn id |
| Lifecycle converter `closeAllReasoningBlocks` / `clearAllOrderedTools` | All conversion trackers for one run | Run-wide cleanup at runtime-global or genuinely unclassified error boundary | No turn selector | Must not be used for valid turn-scoped terminal errors |
| `resolveAgentRunErrorEvidence(event)` | One canonical error event | Resolve diagnostic/terminal/runtime-global lifecycle evidence | Canonical scope/effect plus exact turn id | Reused unchanged |
| `CodexNotificationHandlingResult` | One native notification handling outcome | Carry local-derived events and whether the admitted native message should be emitted | Existing `{ localDerivedEvents, emitNativeMessage }` | Reused unchanged; no new suppression DTO/result kind |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| Thread notification boundary | `Yes` | `Yes` | `Low` | Correct effect classification and suppress only when an exact event turn conflicts with an exact active turn |
| `markTurnFailed` | `Yes` | `Yes` | `Low` | Keep guarded exact-turn comparison |
| Converter boundary | `Yes` | `Yes` | `Low` | Branch structural cleanup on valid canonical scope/effect/exact identity and expose both boundary/all cleanup hooks |
| Canonical error evidence | `Yes` | `Yes` | `Low` | Reuse without Codex-specific fields |
| Existing notification handling result | `Yes` | `Yes` | `Low` | Reuse empty local events plus `emitNativeMessage: false`; do not add a parallel filter interface |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Native thread owner | `CodexThread` | `Yes` | Low | None |
| Native notification policy | `handleAppServerNotification` in `codex-thread-notification-handler.ts` | `Yes` | Low | Keep internal; no generic “retry service” |
| Stateful converter | `CodexThreadEventConverter` | `Yes` | Low | None |
| Canonical lifecycle evidence | `TURN_DIAGNOSTIC` / `TURN_TERMINAL` | `Yes` | Low | Reuse exact existing terms |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Interpret native retry terminality | Codex thread notification handling | `Extend` | Already owns native notification state mutation | N/A |
| Preserve/cleanup reasoning and ordered tools | Codex event conversion trackers | `Extend` | Already owns both exact-turn boundary cleanup and run-wide cleanup; lifecycle error conversion must select correctly | N/A |
| Keep run running for diagnostics | Common AgentRun lifecycle/error evidence | `Reuse` | Existing exact canonical semantics match requirement | N/A |
| Stream/persist/render continuation | Existing event pipeline, replay writer, WebSocket mapper, frontend projector | `Reuse` | Correct diagnostics/B events continue normally; explicit stale A terminals are removed before this shared path, so no frontend/non-Codex policy change is needed | N/A |
| Stale A terminal/completion containment | Codex thread notification handling | `Extend` | Already owns exact native and active identities plus the emit/no-emit decision | N/A |
| Historical repair | No approved capability in scope | `Reuse` neither; do not create | Explicitly out of scope and not needed for prospective correctness | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Codex thread adapter (`backends/codex/thread`) | Native state, exact turn, notification classification, stale-boundary containment, pending MCP correlation, listener emission | `DS-002`, `DS-003` | `CodexThread` | `Extend` | One local classification/containment policy using the existing result shape |
| Codex event conversion (`backends/codex/events`) | Native-to-canonical mapping, reasoning/tool correlation, exact-turn versus run-wide cleanup, status hint | `DS-002`, `DS-004` | `CodexThreadEventConverter` | `Extend` | Diagnostic preserves all; turn terminal cleans its identity only; runtime-global/unclassified cleans all |
| Common AgentRun event processing | Diagnostic/terminal lifecycle, replay persistence | `DS-002` | `AgentRun` | `Reuse` | No source modification expected |
| Agent streaming/frontend projection | Wire mapping and visible state | `DS-002` | Stream mapper and frontend projector | `Reuse` | No production source modification; add regression coverage for the post-containment B stream |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `src/.../codex/thread/codex-thread-notification-handler.ts` | Codex thread adapter | `CodexThread` internal mechanism | Map native `willRetry`; compare exact event/active identities; suppress explicit stale terminal/completion/failed-status; otherwise mutate and normalize/emit | Existing single notification and emission decision point | Yes—turn resolver, `activeTurnId`, local-derived event shape, and notification result |
| `src/.../codex/events/codex-thread-lifecycle-event-converter.ts` | Codex event conversion | `CodexThreadEventConverter` internal converter | Validate canonical error evidence; choose no, exact-turn, or run-wide structural cleanup; build canonical error | Existing single thread/error conversion point | Yes—canonical error fields plus existing turn-boundary/all-scope tracker hooks |
| `tests/unit/.../codex/thread/codex-thread.test.ts` | Codex thread tests | Thread notification boundary | Retryable/matching-terminal state plus no-mutation/no-emission for explicit stale completion, terminal error, and failed status | Existing owner-level suite | Yes—current thread fixture |
| `tests/unit/.../codex/events/codex-thread-event-converter.test.ts` | Codex conversion tests | Converter boundary through real thread harness | Diagnostic payload/status plus joined A-late/B-active suppression and B reasoning/ordered-tool preservation | Existing conversion suite can prove listener/converter absence and both tracker families through the production-owned harness | Yes—production-owned harness |
| `tests/unit/.../codex/events/codex-tool-log-correlation.test.ts` | Codex conversion tests | Ordered-tool correlation | Prove tool correlation survives a diagnostic | Existing correlation-focused suite | Yes—current harness/helper functions |
| `autobyteus-web/tests/integration/codex-stale-turn-boundary-projection.integration.test.ts` | Test-only cross-workspace stream/projection integration | Native Codex notification through live conversation projection | With a fake native client but real `CodexThread`, backend, `AgentRun`, mapper, and frontend dispatcher, drive B open content/tool state, terminal error A, completion A, then B continuation/completion; prove no A canonical/wire event and exactly one B response completing on B | One joined regression owns the full verified consequence; test-only cross-workspace imports add no production dependency | Yes—real production owners and current Pinia/context fixture |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Native retry classification | None | Codex thread adapter | Used once at the authoritative notification branch; extraction would be indirection | `Yes`—only exact boolean and existing scope/effect are needed | `Yes`—no second error model | A generic provider retry framework or text parser |
| Canonical diagnostic/terminal shape | Existing `agent-run-error-evidence.ts` and event payload contract | Common AgentRun domain | Already shared and semantically tight | `Yes` | `Yes` | Codex-specific or UI-specific union |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| Native `ErrorNotification` (`error`, `willRetry`, `threadId`, `turnId`) | `Yes` | `Yes` | Low | Consume exact current fields; do not mirror as a new long-lived type solely for this branch |
| Canonical error evidence (`error_scope`, `error_effect`, `turn_id`) | `Yes` | `Yes` | Low | Continue normalization at thread boundary and consume downstream |
| `CodexThreadEventMessage` branded native/local union | `Yes` | `Yes` | Low | Preserve; normalized event remains `local_derived` |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-notification-handler.ts` | Codex thread adapter | `CodexThread` internal notification policy | Resolve exact event turn, compare it to `activeTurnId`, classify retry intent, suppress explicit stale terminal/completion/failed-status, or apply matching/global transition and emit | Keeps identity comparison, state mutation, and emit/no-emit decision adjacent to all native lifecycle notifications | Existing JSON/turn resolvers, `debugCodexThreadEvent`, notification result, and event shape |
| `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-thread-lifecycle-event-converter.ts` | Codex event conversion | `CodexThreadEventConverter` internal lifecycle conversion | Preserve trackers for exact turn diagnostics; clean only exact turn-terminal identity; retain run-wide cleanup for runtime-global/unclassified errors; create canonical error | Keeps conversion structural effects in the established lifecycle converter | Existing turn-boundary/all-scope context hooks and canonical error fields |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/thread/codex-thread.test.ts` | Codex thread tests | Thread boundary | Prove state/admission/pending MCP behavior for exact `willRetry`, matching terminal behavior, and zero listener emission/state mutation for each explicit stale terminal source | Existing fixture has direct state/listener visibility | Existing fixture |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/events/codex-thread-event-converter.test.ts` | Codex event tests | Converter through `CodexThread` | Prove diagnostic event/status, accepted identity-scoped cleanup, and a joined stale A terminal+completion/active B sequence that never enters conversion and preserves B reasoning/ordered-tool correlation until B's real boundaries | Existing harness traverses the real notification/converter boundary and exposes listener/event counts | Existing harness |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/events/codex-tool-log-correlation.test.ts` | Codex event tests | Ordered-tool correlation | Insert retry diagnostic into supported start/completion/raw-output sequence and preserve exact correlation | Concern is already isolated in this suite | Existing harness/helpers |
| `autobyteus-web/tests/integration/codex-stale-turn-boundary-projection.integration.test.ts` | Test-only cross-workspace integration | Full native-to-projection contract | Carry deterministic native B/A/B sequence through actual Codex thread, converter, backend, AgentRun lifecycle, wire mapper, and `dispatchAgentStreamMessage`; assert no stale A canonical/wire event, one B message, intact B tool state, later B content in-place, and completion only on B | Ends at frontend projection, so the web integration folder owns the joined assertion; relative server imports are test-only and never enter web production/package dependencies | Existing fake client pattern, production owners, Pinia/context fixture |

## Applied Patterns (If Any)

- **Protocol adapter normalization:** Native `willRetry` is translated once into the existing canonical diagnostic/terminal effect at the `CodexThread` boundary.
- **Guarded state transition:** Existing `markTurnFailed(turnId)` continues to protect newer turns; the fix controls when it is invoked rather than weakening the guard.
- **Identity-owned stale-boundary containment:** The same Codex notification boundary compares exact event and active identities and uses its existing no-emission result before generic consumers can misapply the old event.
- **Scope/effect/identity-aware terminal boundary:** Converter cleanup follows valid canonical evidence: none for a turn diagnostic, exact-turn cleanup for a turn terminal, and run-wide cleanup for runtime-global/unclassified errors.
- **Thin runtime facade:** `CodexAgentRunBackend` remains a pass-through adapter facade around the true native-state and conversion owners.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/` | Folder | Codex native thread boundary | Native client/thread state, routing admission, notification handling | Existing runtime-specific state depth | Generic UI/replay retry behavior |
| `.../thread/codex-thread-notification-handler.ts` | File | `CodexThread` internal | Exact retry classification, stale lifecycle-boundary containment, state mutation, and emit/no-emit result | Current notification policy/emission owner | Message-text parsing, canonical lifecycle implementation, frontend-specific logic |
| `autobyteus-server-ts/src/agent-execution/backends/codex/events/` | Folder | Codex native-to-canonical conversion | Stateful conversion and tracker boundaries | Existing adapter conversion depth | Native thread mutation or frontend state |
| `.../events/codex-thread-lifecycle-event-converter.ts` | File | Converter lifecycle concern | Error mapping plus no/exact-turn/run-wide structural cleanup selection | Current error conversion owner and existing tracker contexts | Provider retry/backoff, active-turn mutation, or cross-turn cleanup for a valid turn error |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/thread/codex-thread.test.ts` | File | Thread boundary coverage | State/admission terminality regression | Mirrors production owner | Generic frontend tests |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/events/codex-thread-event-converter.test.ts` | File | Converter coverage | Canonical error evidence plus diagnostic and late-old-turn cross-tracker preservation | Mirrors conversion owner | Live provider nondeterminism |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/events/codex-tool-log-correlation.test.ts` | File | Tool-correlation coverage | Ordered-tool preservation across diagnostic | Existing focused concern | Unrelated command execution semantics |
| `autobyteus-web/tests/integration/codex-stale-turn-boundary-projection.integration.test.ts` | File | Test-only full return spine | Deterministic native-to-one-response UI A/B containment regression | The assertion ends in frontend state and Nuxt Vitest supplies frontend aliases; server imports remain test-only | Production web dependency on server source, live-provider nondeterminism, or duplicated lifecycle policy |

The layout remains compact because no new responsibility or abstraction is introduced; the existing `thread/` versus `events/` structural depth already makes ownership clear.

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `backends/codex/thread/` | Main-Line Domain-Control | `Yes` | Low | Owns native lifecycle/state; keep classification here |
| `backends/codex/events/` | Off-Spine Concern | `Yes` | Low | Serves adapter by transforming admitted events; no new subfolder needed |
| Corresponding unit-test folders | Mixed Justified | `Yes` | Low | Mirror production owners while exercising their join through the shared harness |
| `autobyteus-web/tests/integration/` | Mixed Justified | `Yes` | Low | Owns the joined test because its meaningful assertion is conversation projection; cross-workspace server imports are confined to test code and do not alter production dependency direction or the web boundary guard |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Native classification | `effect = params.willRetry === true ? "diagnostic" : "terminal"`; call `markTurnFailed` only for terminal | `message.includes("Reconnecting")`, `will_retry`, or treating every `error` event as terminal | Uses the authoritative version-matched protocol and fails conservatively |
| Diagnostic conversion | Emit canonical `ERROR` with no reasoning/tool cleanup; later same-turn item is admitted | Close trackers, clear active turn, then weaken admission to accept orphaned later items | Preserves existing identity/ownership invariants instead of compensating downstream |
| Terminal conversion | `willRetry: false` -> guarded `markTurnFailed(turnId)` -> cleanup only that exact turn's converter state -> terminal error status if it is active | Swallow the error because Codex sometimes retries, or clear all converter state despite an exact turn id | Preserves real failure behavior without cross-turn damage |
| Late old-turn terminal containment | With B active and exact A on a terminal error/completion/failed status, compare A to B before mutation and return `{ localDerivedEvents: [], emitNativeMessage: false }`; B later resolves its tool name and closes reasoning normally | Preserve/stream A because `markTurnFailed(A)` no-oped, then expect generic lifecycle or a later B-running status to repair frontend state | Makes `AC-005` true across thread state, converter trackers, replay/wire, and live projection |
| Emitted turn-terminal cleanup | For a matching active turn-terminal event that is emitted, call `closeReasoningBlocksForBoundary(...turn)` and `clearOrderedToolsForBoundary(turn)` | Call run-wide cleanup for an exact turn id | Preserves the accepted `AR-F-001` correction for all reachable emitted turn terminals |
| Runtime-global/unclassified terminal | Runtime-global terminal or invalid/unclassified error retains `closeAllReasoningBlocks` and `clearAllOrderedTools` | Treat a missing identity as a turn or silently preserve unknown tracker state | Preserves current defensive cleanup without weakening error handling |
| Joined A/B projection regression | Native B start -> B reasoning/text/tool open -> terminal error A -> completion A -> later B content/tool completion -> B completion. In one test-only integration, collect actual AgentRun events, map and dispatch them to the real frontend projector; assert no canonical/wire A error/completion or companion status, exactly one B AI message, an open B tool that remains nonterminal through both suppressed facts, later B content in the same message, and `isComplete` only after B completion | Test thread state alone, or feed stale A terminal frames directly to unchanged frontend and expect a later running status to undo completion | Covers the full verified failure consequence at package-owned seams without changing frontend production policy |
| Architecture boundary | Codex-specific fact classified/contained before `AgentRun`/frontend | Pass native `willRetry` to Vue components, add a generic stale filter, or re-emit a tombstone | Keeps generic and non-Codex consumers runtime-neutral |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Accept `will_retry` or infer from missing field | Generic JSON currently lacks a generated compile-time native type | `Rejected` | Use exact supported camel-case `willRetry`; only exact `true` is diagnostic, otherwise retain conservative terminal semantics |
| Parse `Reconnecting... n/5` text | Visible production strings identify the symptom | `Rejected` | Use upstream boolean; messages remain presentation content only |
| Keep old all-terminal branch plus a new special retry handler | Minimizes editing the existing branch superficially | `Rejected` | Replace the old assumption in the single notification branch |
| Add browser/server reconnect or native-history replay fallback | Could mask missing live events | `Rejected` | Preserve active native turn so existing event spine works; historical backfill remains separate scope |
| Dual trace schema/write | Could distinguish retry events explicitly in storage | `Rejected` | Existing canonical scope/effect schema already represents the distinction |

## Derived Layering (If Useful)

Explanatory only: external native protocol -> Codex adapter state/conversion -> canonical AgentRun lifecycle/persistence -> transport mapping -> frontend projection. Dependency direction follows this order; no layer may reach backward to mutate a deeper owner's state.

## Change / Refactor Sequence

1. Add/adjust focused `CodexThread` tests that reproduce exact native `{ willRetry: true }`, assert diagnostic payload plus preserved running/active/pending state, and prove a later governed event is admitted without re-opening the turn.
2. In the same thread suite, make B active with pending correlation and deliver, separately and in a joined sequence, terminal error A, completion A, and failed status explicitly identifying A. Assert no state mutation and no listener message for each. Preserve positive assertions for matching B terminal/completion/failed status and runtime-global failure.
3. Update `codex-thread-notification-handler.ts` with one file-local exact-stale predicate (`eventTurnId && activeTurnId && eventTurnId !== activeTurnId`) evaluated before terminal mutation/emission. Reuse the existing empty-local-events/`emitNativeMessage: false` result; optionally call existing `debugCodexThreadEvent` with identity/method metadata only. Derive retry effect from exact `params.willRetry === true`; diagnostics still emit without `markTurnFailed`; matching/missing-identity conservative terminal behavior remains unchanged.
4. Add converter coverage with an open reasoning block followed by a diagnostic; assert the diagnostic emits no synthetic reasoning end and has no error status hint. Then prove later reasoning/content can close through its real boundary.
5. Extend the lifecycle-converter context with the existing `closeReasoningBlocksForBoundary` and `clearOrderedToolsForBoundary` hooks. Update `codex-thread-lifecycle-event-converter.ts` to select: no cleanup for valid turn diagnostic; exact-turn boundary cleanup for valid emitted turn terminal; current run-wide cleanup for runtime-global terminal or genuinely unclassified error. Keep error extraction and canonical payload creation otherwise unchanged.
6. Revise the joined converter-harness `AC-005` sequence: open B reasoning and ordered-tool correlation; send terminal error A and completion A through the real thread; assert listener/converter event counts do not change and B trackers remain; emit B's later raw/tool and completion events; assert exact tool name/identity and normal B reasoning closure. Retain a matching-turn converter test to prove accepted exact-turn cleanup.
7. Add `autobyteus-web/tests/integration/codex-stale-turn-boundary-projection.integration.test.ts` as one deterministic test-only cross-workspace integration. Use a fake native client only, but real `CodexThread`, `CodexAgentRunBackend`, `AgentRun` lifecycle, `AgentRunEventMessageMapper`, frontend `dispatchAgentStreamMessage`, and Pinia-backed `AgentContext`. Drive `B start -> B content/tool open -> A terminal error -> A completion -> later B content/tool completion -> B completion`; await each async AgentRun batch, map/dispatch actual emitted events, assert no A error/completion or stale-derived status is emitted, and prove one B message/tool remains running until B completion. Cross-workspace imports must stay in this test file; do not add a web production dependency or change the boundary guard.
8. Add a same-turn tool-correlation sequence with a retry diagnostic between supported lifecycle events; assert raw completion/log correlation still has exact turn, invocation, and tool name. Preserve matching-active terminal, runtime-global terminal, explicit failed-status, unclassified-error, and diagnostic regression tests.
9. Run focused Codex thread/converter/correlation/backend suites, the joined native-to-projection A/B integration, the existing generic diagnostic WebSocket lifecycle suite, and repository typecheck/build checks appropriate to both packages. Record environment dependency setup rather than editing shared-checkout source.
10. Do not remove or weaken segment admission, add frontend production changes, rewrite traces, add a downstream filter/tombstone, or create compatibility code. No temporary seam should remain after the two source changes land together.

## Key Tradeoffs

- **Exact boolean versus tolerant aliases:** Exact `willRetry` follows the installed supported protocol. Treating only exact `true` as diagnostic avoids falsely preserving a truly failed turn when a malformed payload arrives.
- **Visible diagnostics versus suppression:** The diagnostic continues through the canonical stream so users retain truthful provider information. Visual severity/deduplication is a product-presentation decision outside this bug fix.
- **Suppress stale native boundary versus identity-aware frontend refactor:** Suppression is chosen because `CodexThread` owns both identities and emission admission, the stale fact cannot authoritatively settle B, and the existing frontend has no message-level active-turn owner. A shared/frontend identity state would broaden non-Codex behavior and replay policy. The stale fact remains observable only through opt-in safe Codex debug/native history, while matching and runtime-global terminal events remain canonical.
- **No tombstone/replay marker:** Emitting a neutralized or tombstone A event would introduce a new canonical/storage/UI contract solely for an obsolete boundary. No event is the clean-cut target; existing stored data remains directly usable and future replays reproduce the same B-only canonical history.
- **Local change versus generated protocol model:** A generated/native TypeScript model would be broader integration work. This change needs one required field at one authoritative branch; current `JsonObject` boundary remains otherwise healthy.
- **Prospective correctness versus historical backfill:** Preserving events before they are discarded fixes the production path without risking a cross-store reconciliation mechanism that cannot rely on application traces alone.

## Risks

- A retry diagnostic arriving amid reasoning/tool activity can expose tracker bugs if only state status is tested; sequence coverage is mandatory.
- A late terminal error for retired turn A can leave thread state B intact while independently damaging converter state B if cleanup is not identity-scoped; the joined A/B tracker test is mandatory.
- A late A terminal/completion can still corrupt B after correct thread/converter state handling if it reaches the turn-blind frontend; Codex-local no-emission plus the joined native-to-live-projection regression is mandatory.
- The `5/5` display may look terminal even when Codex still declares retry/fallback intent. The implementation must use `willRetry`, never retry-count text.
- Treating an invalid or incomplete error as turn-scoped could preserve stale state or target the wrong turn. Only valid canonical turn evidence gets no/scoped cleanup; genuinely unclassified errors retain run-wide defensive cleanup.
- Suppression intentionally removes the stale A boundary from application replay. This is correct only for an exact A/B mismatch; evaluating after state mutation, suppressing a matching event, or treating missing identity as stale would hide genuine failures. Tests must cover all three distinctions.
- Existing worktree dependencies are not installed; implementation/test setup must be explicit and must not contaminate the user's shared checkout.
- Previously dropped output remains absent from normal UI history, as approved.

## Guidance For Implementation

- In `codex-thread-notification-handler.ts`, keep the existing turn-id resolution and local-derived emission pattern. Add one file-local predicate/result path for an exact event-turn/current-active-turn mismatch; do not add another handler, exported abstraction, or downstream filter.
- Error ordering must be explicit: resolve exact event turn -> compute `errorEffect = params.willRetry === true ? "diagnostic" : "terminal"` -> if `errorEffect === "terminal"` and exact event turn conflicts with exact active turn, suppress -> otherwise apply the diagnostic or terminal branch. This prevents accidental suppression of the approved active-turn retry diagnostic.
- Evaluate stale identity before calling `markTurnFailed`/`markTurnCompleted`, before clearing pending state, and before pushing any local-derived error. Apply it to terminal native `error`, `turn/completed`, and failed `thread/status/changed` only when that status carries an exact conflicting turn. Do not classify an identity-missing notification as stale.
- Preserve the exact resolved event turn separately from the current fallback-to-active behavior. Only the exact resolved identity may prove A/B mismatch; the fallback active id remains available for existing malformed/missing-identity terminal handling but must never be used to manufacture a stale classification.
- For a resolved turn:
  - exact `params.willRetry === true`: set `error_scope: "turn"`, `error_effect: "diagnostic"`, and exact `turn_id`; do not call `markTurnFailed`.
  - otherwise: call existing guarded `markTurnFailed(turnId)` and emit `error_effect: "terminal"` exactly as today.
- Preserve the original nested `error` object/message in the spread payload so current converter display extraction remains intact. Do not add unapproved provider-detail exposure.
- For an explicit stale boundary, return the existing frozen `{ localDerivedEvents: [], emitNativeMessage: false }` shape. Do not emit a canonical diagnostic, terminal, completion, tombstone, or compensating B-running event. If debug logging is added, reuse `debugCodexThreadEvent` and log identifiers/method only.
- In `codex-thread-lifecycle-event-converter.ts`, recognize valid turn evidence only when `error_scope === "turn"`, `error_effect` is the expected value, and canonical `turn_id` is a non-empty string. Do not infer identity from the converter's current runtime snapshot.
- Extend `CodexThreadLifecycleEventConverterContext` with the same existing `closeReasoningBlocksForBoundary(codexEventName, payload)` and `clearOrderedToolsForBoundary(payload)` hooks already wired for `turn/completed`; wire them from `CodexThreadEventConverter` without exposing trackers.
- Cleanup matrix: valid turn diagnostic -> no cleanup; valid turn terminal -> call only the two boundary hooks with that exact payload; runtime-global terminal or genuinely unclassified/invalid error -> retain current all-reasoning/all-tools cleanup. Preserve cleanup-before-error event ordering where cleanup applies.
- The late A/B converter regression must use one thread/converter instance: open B reasoning, register B ordered-tool identity, deliver terminal error A and completion A, prove neither reaches the listener/converter and no B `SEGMENT_END` appears, then resolve a B raw tool output without a direct name and complete B so its original reasoning segment ends normally. A state-only `activeTurnId === B` assertion is insufficient.
- The joined test-only cross-workspace integration must cover the verified full consequence: B has both content and an open tool before the two A facts; no A canonical/wire events are produced; the actual B wire sequence projects to exactly one AI message; the tool is neither errored nor interrupted by A; later B content stays in that message; only B's own terminal boundary sets completion.
- Do not change `CodexThread.markTurnFailed`, `markTurnCompleted`, segment admission, `resolveAgentRunErrorEvidence`, lifecycle state, status-hint resolution, WebSocket mapping, or frontend production `handleError`/`handleTurnCompleted` unless implementation uncovers contradictory evidence; such a change would require a design-impact review.
- Tests must exercise the production-owned `CodexThread`/converter harness rather than calling the pure handler alone, so state mutation, event branding, admission, status hint, and tracker behavior are all observed.
- Keep real tool failures independent: a retry diagnostic must not rewrite tool result status, and a tool failure must not be used as the turn retry signal.
- Do not edit or attempt to repair the reported user's retained trace or Codex rollout.
