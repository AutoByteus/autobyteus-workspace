# Investigation Notes

## Investigation Status

- Current Status: `Current`
- Scope Triage: `Large`
- Triage Rationale: The change is still localized to `autobyteus-server-ts`, but it is no longer a local bug fix. The work crosses ingress persistence, run dispatch, turn correlation, live observation, persisted recovery, and outbound callback publication, and it changes the architecture model that coordinates them.
- Investigation Goal: Determine the strongest implementable dispatch-to-turn correlation architecture for the receipt-owned workflow without polluting the generic agent-core event surface, and remove all guessed live-path turn binding from the external-channel workflow.
- Re-Entry Context: `2026-04-09 Stage 8 Design Impact` architecture review found that the current refactor still allows timeout-driven capture plus chronology-based pending-turn recovery in the active business path.
- Primary Questions To Resolve:
  - Where does one inbound external message currently gain and lose ownership across the system?
  - Which responsibilities should belong to the receipt versus run observers, reply bridges, and callback publishers?
  - What concrete defects are produced by the current implicit workflow design?
  - Which remaining accepted-runtime adapter responsibilities must move into one authoritative receipt workflow runtime?
  - Which runtimes can already return `turnId` at dispatch time, and where is that signal being discarded?
  - Where should dispatch-scoped turn capture live when the runtime cannot return `turnId` synchronously?
  - Should the receipt runtime ever own a durable waiting-for-turn state if authoritative turn-start capture is guaranteed?
  - What role, if any, should chronological queue ordering keep after explicit dispatch-to-turn correlation exists?

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-04-08 | Command | `git status --short --branch` in the new worktree | Confirm clean Stage 0 bootstrap state | New ticket worktree is isolated on `codex/external-channel-receipt-state-machine` with only ticket artifacts added | No |
| 2026-04-08 | Doc | `software-engineering-workflow-skill/stages/01-investigation/README.md` | Confirm Stage 1 artifact expectations | Stage 1 requires bounded evidence gathering and current investigation notes before downstream stages | No |
| 2026-04-08 | Code | `autobyteus-server-ts/src/external-channel/domain/models.ts` | Inspect durable receipt model | The durable receipt exposes only `PENDING`, `DISPATCHING`, `ACCEPTED`, `ROUTED`, and `UNBOUND`; there is no explicit durable phase for turn pending, collecting, completed, or publish pending | Yes |
| 2026-04-08 | Code | `autobyteus-server-ts/src/external-channel/services/channel-ingress-service.ts` | Trace ingress ownership and duplicate handling | Ingress creates/claims the receipt, dispatches to a run, records `ACCEPTED`, and immediately hands control to the accepted-receipt recovery runtime | Yes |
| 2026-04-08 | Code | `autobyteus-server-ts/src/external-channel/runtime/accepted-receipt-dispatch-turn-capture-registry.ts` | Inspect dispatch-scoped turn capture | Turn correlation may be captured from `TURN_STARTED` during dispatch, but only as a helper attached after dispatch resolves | Yes |
| 2026-04-08 | Code | `autobyteus-server-ts/src/external-channel/runtime/accepted-receipt-turn-correlation-observer-registry.ts` | Inspect delayed turn binding after `ACCEPTED` | When `turnId` is unknown, the system binds the oldest matching accepted receipt for a run upon future `TURN_STARTED` events | Yes |
| 2026-04-08 | Code | `autobyteus-server-ts/src/external-channel/runtime/accepted-receipt-recovery-runtime.ts` | Inspect accepted receipt orchestration | The accepted-receipt runtime multiplexes retry timers, live observation startup, persisted recovery, publish decisions, and terminal state mutation inside one implicit control flow | Yes |
| 2026-04-08 | Code | `autobyteus-server-ts/src/external-channel/runtime/channel-agent-run-reply-bridge.ts` | Inspect live same-turn collection | Live observation already behaves like a turn-scoped collector: it accumulates assistant text and resolves only on `TURN_COMPLETED` | No |
| 2026-04-08 | Code | `autobyteus-server-ts/src/external-channel/runtime/channel-team-run-reply-bridge.ts` | Check whether team path follows the same shape | Team path mirrors the direct path and carries the same architectural pattern and risks | No |
| 2026-04-08 | Code | `autobyteus-server-ts/src/external-channel/services/channel-turn-reply-recovery-service.ts` | Inspect persisted recovery semantics | Persisted recovery reconstructs reply text from assistant traces only; it has no concept of receipt state or turn lifecycle completion | Yes |
| 2026-04-08 | Code | `autobyteus-server-ts/src/external-channel/services/reply-callback-service.ts` | Inspect outbound publication contract | Publish is idempotent by callback key, requires a source route, and can still resolve source from receipts in `ACCEPTED` or `ROUTED` | Yes |
| 2026-04-08 | Code | `autobyteus-server-ts/src/external-channel/providers/file-channel-message-receipt-provider.ts` | Inspect durable state transitions and source lookup | `markReplyPublished()` jumps straight to `ROUTED`, and `getSourceByAgentRunTurn()` treats both `ACCEPTED` and `ROUTED` receipts as source candidates | Yes |
| 2026-04-08 | Code | `autobyteus-server-ts/src/external-channel/runtime/gateway-callback-outbox-store.ts` | Confirm outbox dedupe model | The outbox enforces one record per callback idempotency key, which means premature publish and final publish compete for the same slot | No |
| 2026-04-08 | Issue | User-reported runtime behavior from Telegram and desktop screenshots | Bring in observed production symptoms | A later Telegram message sometimes receives nothing until the agent/run is stopped and deleted, suggesting stale accepted state or ambiguous run-scoped correlation | Yes |
| 2026-04-09 | Code Review | `autobyteus-server-ts/src/external-channel/runtime/accepted-receipt-dispatch-turn-capture-registry.ts:337-390` | Review whether the implementation actually centralized workflow ownership | Dispatch-scoped capture still persists `TURN_BOUND` and `TURN_COMPLETED` directly instead of emitting facts into one runtime owner | Yes |
| 2026-04-09 | Code Review | `autobyteus-server-ts/src/external-channel/runtime/accepted-receipt-turn-correlation-observer-registry.ts:166-229` | Review delayed turn binding ownership after the Stage 6 slice | Delayed correlation still owns durable correlation/persistence decisions and only fails ambiguous cases rather than using a receipt-native correlation token | Yes |
| 2026-04-09 | Command | `rg -n "dispatchCorrelationId" autobyteus-server-ts/src` | Verify whether the new durable correlation field is actually threaded through runtime matching | `dispatchCorrelationId` is persisted in the receipt layer but is not consumed as the authoritative runtime correlation key in the changed source scope | Yes |
| 2026-04-09 | Code | `autobyteus-server-ts/src/external-channel/runtime/channel-agent-input-message-builder.ts`, `autobyteus-server-ts/src/external-channel/runtime/channel-agent-run-facade.ts`, `autobyteus-server-ts/src/external-channel/runtime/channel-team-run-facade.ts` | Re-check whether dispatch can inject receipt metadata and where that metadata is lost | The server can inject receipt metadata into outbound `AgentInputUserMessage`, but the run-facade contract does not receive any receipt-aware event correlation back from the public runtime event surface | Yes |
| 2026-04-09 | Code | `autobyteus-server-ts/src/agent-execution/backends/agent-run-backend.ts`, `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend.ts`, `autobyteus-server-ts/src/agent-team-execution/backends/team-run-backend.ts`, `autobyteus-server-ts/src/agent-team-execution/backends/autobyteus/autobyteus-team-run-backend.ts` | Confirm what the server actually subscribes to from active runs | The public server-side `subscribeToEvents` contract exposes normalized `AgentRunEvent` / `TeamRunEvent` objects, not raw event-store envelopes with `correlation_id` or original input metadata | Yes |
| 2026-04-09 | Code | `autobyteus-ts/src/agent/runtime/agent-worker.ts`, `autobyteus-ts/src/agent/events/agent-input-event-queue-manager.ts`, `autobyteus-ts/src/agent/handlers/user-input-message-event-handler.ts` | Verify whether one agent run processes turns serially | Direct agent runtime allows only one external user turn at a time; new external input is withheld while `activeTurn` exists, so turn creation order follows queued user-message order on the run | Yes |
| 2026-04-09 | Code | `autobyteus-server-ts/src/external-channel/runtime/channel-reply-bridge-support.ts`, `autobyteus-server-ts/src/external-channel/runtime/channel-agent-run-reply-bridge.ts`, `autobyteus-server-ts/src/external-channel/runtime/channel-team-run-reply-bridge.ts` | Check whether delayed correlation can rely on turn-linked events beyond `TURN_STARTED` | Segment events already expose `turnId`, so the server can bind a pending receipt from the first turn-linked signal rather than only a `TURN_STARTED` event | Yes |
| 2026-04-09 | Code | `autobyteus-server-ts/src/external-channel/services/channel-turn-reply-recovery-service.ts`, `autobyteus-server-ts/src/agent-memory/domain/models.ts`, `autobyteus-ts/src/memory/models/raw-trace-item.ts` | Determine whether persisted memory can support chronological turn recovery | Raw traces persist `turnId` and `ts`, so recovery can be extended from “reply by known turn” to “completed turn chronology after dispatch acceptance” without a cross-repo protocol change | Yes |
| 2026-04-09 | Code | `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-agent-run-backend.ts`, `autobyteus-server-ts/src/agent-execution/backends/claude/backend/claude-agent-run-backend.ts`, `autobyteus-server-ts/src/agent-team-execution/backends/codex/codex-team-manager.ts`, `autobyteus-server-ts/src/agent-team-execution/backends/claude/claude-team-manager.ts` | Determine whether direct/team runtimes already know the new turn during dispatch | Codex and Claude runtimes already obtain `turnId` from `sendTurn()`, and their team paths already spread `AgentOperationResult` through the manager/backend layers, but the current contracts discard the turn identity before the receipt is persisted | Yes |
| 2026-04-09 | Code | `autobyteus-ts/src/agent/handlers/user-input-message-event-handler.ts`, `autobyteus-ts/src/agent/context/agent-runtime-state.ts`, `autobyteus-ts/src/agent/events/notifiers.ts`, `autobyteus-ts/src/agent/message/agent-input-user-message.ts` | Check whether AutoByteus runtime can surface dispatch correlation when the turn starts | AutoByteus creates the `turnId` in user-input handling while it still has access to input metadata, so `TURN_STARTED` can emit an explicit dispatch correlation token instead of forcing later queue guessing | Yes |
| 2026-04-09 | Code | `autobyteus-server-ts/src/external-channel/runtime/channel-agent-input-message-builder.ts`, `autobyteus-server-ts/src/external-channel/runtime/channel-reply-bridge-support.ts`, `autobyteus-server-ts/src/external-channel/runtime/receipt-run-observation-registry.ts` | Verify whether server-owned dispatch metadata can be injected and later parsed from live events | The server already controls `AgentInputUserMessage.metadata`, and the run-observation stack can be extended to parse an explicit dispatch correlation field from turn-start payloads | Yes |
| 2026-04-09 | Code | `autobyteus-ts/src/agent/agent.ts`, `autobyteus-ts/src/agent/runtime/agent-runtime.ts`, `autobyteus-ts/src/agent/runtime/agent-worker.ts` | Verify what `Agent.postUserMessage()` guarantees to the server adapter | AutoByteus direct dispatch only guarantees that the user message was enqueued; it does not synchronously return `turnId`, and turn creation happens later inside the worker loop | Yes |
| 2026-04-09 | Code | `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend.ts`, `autobyteus-server-ts/src/agent-team-execution/backends/autobyteus/autobyteus-team-run-backend.ts` | Check whether AutoByteus server adapters already own runtime subscriptions | Both direct and team AutoByteus backends already expose server-local event stream subscriptions, which means dispatch-scoped turn capture can live in the server adapter/client layer instead of the agent core | Yes |
| 2026-04-09 | Code | attempted Stage 6 notifier/runtime patch | Validate whether pushing dispatch correlation into `TURN_STARTED` preserves separation of concerns | It does not. The patch makes agent-core turn lifecycle events depend on one external-channel client’s receipt workflow, which violates the desired client-agnostic runtime boundary | Yes |
| 2026-04-09 | Other | User architecture directive: `turn start` is always receivable once a dispatch is truly accepted | Re-evaluate whether timeout/null capture and chronology fallback should remain in the live path | The active business path should trust authoritative turn-start capture and remove guessed pending-turn fallback instead of keeping it as a secondary branch | No |

## Current Behavior / Codebase Findings

### Current End-to-End Ownership Spine

The current ownership spine for one inbound external message is:

1. `ChannelIngressService` accepts the inbound envelope and persists a receipt.
2. `ChannelIngressService` dispatches the envelope to a run and records the receipt as `ACCEPTED`.
3. Turn correlation may be captured during dispatch by `AcceptedReceiptDispatchTurnCaptureRegistry`, or later by `AcceptedReceiptTurnCorrelationObserverRegistry`.
4. `AcceptedReceiptRecoveryRuntime` repeatedly decides whether the accepted receipt should wait, observe live events, recover from persisted memory, publish, retry, or terminate.
5. Live text collection is owned by `ChannelAgentRunReplyBridge` or `ChannelTeamRunReplyBridge`.
6. Persisted recovery is owned by `ChannelTurnReplyRecoveryService`.
7. Final outbound enqueue is owned by `ReplyCallbackService` and the callback outbox.

This means the receipt is the durable record, but not the authoritative workflow owner.

### Durable-State Gap

- The durable model only has five ingress states:
  - `PENDING`
  - `DISPATCHING`
  - `ACCEPTED`
  - `ROUTED`
  - `UNBOUND`
- There is no durable distinction between:
  - accepted but turn not yet known
  - accepted and turn known
  - live collection in progress
  - turn completed but reply not finalized
  - reply finalized but publish not yet attempted
  - publish attempted but awaiting outbox delivery lifecycle

As a result, `ACCEPTED` is a catch-all workflow state rather than a truthful phase.

### Architectural Findings

| Area | Current Owner | Finding | Why It Matters |
| --- | --- | --- | --- |
| Inbound receipt creation and duplicate gate | `ChannelIngressService` | Ingress owns early receipt lifecycle but stops at `ACCEPTED`; after that, ownership is fragmented | One business object changes owners several times with no single reducer |
| Turn binding during dispatch | `AcceptedReceiptDispatchTurnCaptureRegistry` | Dispatch-scoped correlation is opportunistic and only available if `TURN_STARTED` is seen during a short local capture window | Binding logic is adapter-local, not receipt-owned |
| Turn binding after dispatch | `AcceptedReceiptTurnCorrelationObserverRegistry` | Delayed binding uses the oldest accepted receipt that matches a run/member predicate | This is run-scoped matching, not receipt-scoped matching, and can bind the wrong receipt |
| Live reply aggregation | `ChannelAgentRunReplyBridge` / `ChannelTeamRunReplyBridge` | Live collection is cleanly turn-scoped and waits for `TURN_COMPLETED` | This is the strongest part of the current design and should likely become an adapter into receipt state |
| Persisted reply reconstruction | `ChannelTurnReplyRecoveryService` | Recovery knows nothing about receipt workflow phase and only reconstructs text from stored traces | Recovery can compete with live workflow instead of acting as a controlled fallback |
| Outbound publish and dedupe | `ReplyCallbackService` + outbox | Publish is one-shot per callback key, not multi-phase per receipt | Once the wrong publish happens, later correct publish is structurally blocked |

### Concrete Failure Modes Explained By Current Design

1. Premature finalization from a non-final workflow phase.
The receipt can still be in a logically “collecting” situation while persisted recovery already sees enough text to publish.

2. Wrong turn can be attached to the wrong accepted receipt.
Delayed correlation chooses the oldest accepted receipt for a run rather than a specific receipt-owned pending turn workflow.

3. Stale run state can block or misroute later receipts.
The user’s observation that deleting the existing agent/run makes the next Telegram message work strongly suggests residual accepted receipts or run observers remain attached to a long-lived run context that is too ambiguous.

4. Source lookup remains available before the receipt is truly finalized.
Outbound source lookup accepts both `ACCEPTED` and `ROUTED` receipts as source candidates, which keeps unfinished receipts structurally eligible for publish-side behavior.

5. Recovery and live observation are peers instead of layers.
The system currently treats live observation and persisted recovery as alternative publish paths rather than as event sources feeding the same receipt-owned state progression.

## Stage 8 Re-Entry Findings (2026-04-09)

### New Confirmed Design Gaps

1. Queue chronology is still the primary correlation rule in the current implementation.
The receipt workflow is cleaner than before, but `TURN_PENDING` receipts are still mainly assigned from `dispatchAcceptedAt + dispatchCorrelationId + receivedAt` ordering instead of an explicit dispatch-to-turn contract.

2. Some runtimes already know the bound `turnId` during dispatch, but the server drops it.
Codex and Claude direct runs obtain `turnId` from `sendTurn()`, and their team paths already spread `AgentOperationResult` through the manager/backend layers, but the current operation and dispatch contracts discard this signal before the receipt is persisted.

3. AutoByteus does not return `turnId` synchronously, but the server adapter already has the right listener boundary.
`Agent.postUserMessage()` only guarantees enqueue, and turn creation happens later inside the worker loop. However, the AutoByteus server backends already own runtime subscriptions, so delayed turn capture can live in that adapter/client layer instead of leaking client-specific receipt correlation into the agent core.

4. The correct architecture is now a split-listener model.
The main path should bind by immediate `turnId` when dispatch returns it. Otherwise, a dispatch-scoped listener in the external-channel server adapter should capture the turn for that accepted dispatch, while a separate long-lived run listener continues to handle turn/segment/completion observation and degraded recovery wake-ups.

5. The failed Stage 6 slice proved that core event enrichment is the wrong fix.
Adding external-channel receipt correlation to generic turn-start notifications strengthens one client path by contaminating the runtime core API surface. The right fix is adapter-boundary capture, not core-event mutation.

## Stage 8 Re-Entry Findings (2026-04-09, no-live-fallback correction)

### New Confirmed Design Gaps

1. The current split-listener design still keeps a guessed live path.
It moved delayed capture to the correct boundary, but it still allows capture to resolve `null` and then revives chronology-based pending-turn assignment in the receipt workflow.

2. The external-channel facade should trust authoritative turn-start capture.
The user-confirmed runtime invariant is that a truthful `TURN_STARTED` signal is always receivable for a truly accepted dispatch. That means the dispatch boundary should keep waiting for exact turn binding instead of admitting a null-capture business path.

3. Durable `TURN_PENDING` no longer earns its place in the accepted workflow.
Waiting for turn start belongs to the facade-local dispatch contract. The accepted receipt workflow should start only once a real `turnId` is known.

4. The run-wide queued-signal observation registry is now extra coordination.
Once the dispatch boundary produces an exact `turnId` and the per-turn reply bridges subscribe by that known identity, the extra run-wide queue-and-assign layer no longer owns a necessary responsibility.

5. Chronological completed-turn matching should leave the active business path entirely.
Known-turn reply recovery remains valid for already bound turns, but chronology-based pending-turn assignment is still a guessed business rule and should be removed, not merely demoted.

### Investigation Implication For Re-Entry

- Re-entry classification remains `Design Impact`.
- The next design round should narrow to:
  - one receipt-owned workflow runtime with no adapter-owned durable mutation
  - immediate turn binding from dispatch results whenever the runtime already knows `turnId`
  - otherwise dispatch-scoped capture in the AutoByteus server adapter/client layer until exact turn binding is observed
  - no durable accepted receipt without an authoritative `turnId`
  - no run-wide queued-signal registry for live-path turn binding
  - no chronology-based pending-turn assignment in any active or degraded business path
  - known-turn reply recovery only after authoritative turn binding
  - no client-specific correlation fields inside generic `autobyteus-ts` notifier or lifecycle payloads

### Investigation Implication For Re-Entry

- Re-entry classification remains `Design Impact`.
- The next design round should narrow to:
  - one receipt-owned workflow runtime with no adapter-owned durable mutation
  - immediate turn binding from dispatch results whenever the runtime already knows `turnId`
  - a server-side dispatch-scoped listener/capture path when AutoByteus dispatch cannot return `turnId` synchronously
  - a separate long-lived run observation listener for turn/segment/completion events after receipt binding
  - chronological pending-dispatch ordering only as restart/degraded fallback instead of the main turn-assignment rule
  - raw-trace chronological recovery for missed turn binding or restart gaps
  - no client-specific correlation fields inside generic `autobyteus-ts` notifier or lifecycle payloads

## Stage 6 Re-Entry Findings (2026-04-09, adapter-boundary correction)

### New Confirmed Design Gaps

1. The failed Stage 6 slice solved the wrong problem at the wrong boundary.
It tried to improve correlation by extending generic AutoByteus turn-start notifications with an external-channel receipt field. That strengthens one client path by contaminating the runtime core API surface.

2. The server adapter already has the right place to own listener logic.
`AutoByteusAgentRunBackend` and `AutoByteusTeamRunBackend` already sit at the runtime-client boundary and already own server-local event subscriptions. That is the correct place for dispatch-scoped turn capture, because that boundary already knows which dispatch call it initiated.

3. There are actually two listener responsibilities, and they should not be merged.
- Dispatch-scoped capture listener:
  created around one external-channel dispatch attempt to discover the turn bound to that accepted dispatch when the runtime cannot return it synchronously.
- Long-lived observation listener:
  stays attached to the run for turn/segment/completion observation, reply aggregation, and degraded recovery wake-ups.

4. The receipt workflow should consume facts from listeners, not invent client-specific facts in the runtime core.
The runtime core should continue to emit generic turn lifecycle events. The external-channel subsystem may translate those events into receipt facts, but that translation belongs to the server-side listener/adapter layer.

5. The next design round must move from “explicit correlation field in the runtime event” to “explicit listener ownership at the adapter boundary.”
That preserves the receipt-centric state machine while restoring clean separation of concerns.

## Runtime / Probe Findings

| Date | Method (`Trace`/`Probe`/`Issue Reproduction`/`Static Review`) | Exact Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-04-08 | Static Review | Trace through `ChannelIngressService.handleInboundMessage()` | Receipt creation, binding resolution, dispatch, accepted persistence, and recovery registration all occur in one ingress call | Ingress is doing setup for a larger workflow but does not own the workflow after dispatch |
| 2026-04-08 | Static Review | Trace through `AcceptedReceiptRecoveryRuntime.processReceipt()` | One function decides waiting for turn, starting observation, falling back to persisted recovery, publishing, and retry | This is already an implicit reducer/effect loop, but its state model is hidden |
| 2026-04-08 | Static Review | Trace through `AcceptedReceiptTurnCorrelationObserverRegistry.bindOldestAcceptedDirectReceipt()` | Future `TURN_STARTED` events are mapped to the oldest accepted receipt for a run | Receipt/run ownership is ambiguous for long-lived runs |
| 2026-04-08 | Static Review | Trace through direct/team reply bridges | Both bridges accumulate content and resolve on `TURN_COMPLETED` | Live collection can be preserved as an adapter, not as the workflow owner |
| 2026-04-08 | Static Review | Trace through callback outbox enqueue | The first publish wins the callback key | Premature publish is not just early; it structurally suppresses later correct publish |
| 2026-04-08 | Issue Reproduction | User report from Telegram plus deleting the existing run/agent | After deleting the existing externally triggered agent/run, the next Telegram message worked again | Long-lived run state and accepted receipt/run matching are likely part of the real bug surface |
| 2026-04-09 | Static Review | Trace through direct agent runtime queue + `activeTurn` gating | Direct agent runtime serializes external user turns and processes them in queued order | Queue ordering is a viable fallback, but it no longer needs to be the primary business-path correlation rule |
| 2026-04-09 | Static Review | Trace through run event conversion and reply bridge parsing | Public run events expose `turnId` on segment events, and AutoByteus turn-start payloads can be enriched under our control | Delayed turn binding can move from guessed queue order to explicit signal correlation |
| 2026-04-09 | Static Review | Trace through persisted raw trace structure and recovery service | Raw traces contain `turnId` and `ts`, while current recovery only resolves by known turnId | Restart recovery can be expanded to chronological completed-turn matching after dispatch acceptance |

## Constraints

- Existing callback idempotency is valuable and should be preserved.
- The current external-channel contract still assumes one externally visible publish per logical inbound receipt/turn.
- Direct and team flows should converge on one receipt-owned model rather than fork further.
- Recovery on restart is required after authoritative turn binding; guessed post-restart turn binding is not acceptable.
- Generic `autobyteus-ts` notifier and lifecycle payloads must remain client-agnostic; external-channel-specific receipt correlation must not be added there.

## Unknowns / Open Questions

- Whether the durable receipt should store a new workflow-state field, or whether the current receipt record should be reshaped entirely.
- Whether the final publish contract should remain strictly “one publish per receipt/turn” or whether future streaming support should be explicitly out of scope for this refactor.
- Whether run-scoped correlation observers can be fully removed in the first refactor, or whether they should be retained as event adapters feeding the new receipt state machine.

## Implications

### Requirements Implications

- Requirements must be rewritten around explicit receipt phases, serialized per-receipt processing, and clean separation between event inputs and workflow decisions.

### Design Implications

- The target architecture should be:
  - event-driven at the edges
  - receipt-owned reducer/state machine at the core
  - effect runner after transitions
- Live observation, delayed turn binding, recovery, and publish should become adapters that emit events or perform commanded effects rather than owning workflow branches.
- Turn correlation should be redesigned around an explicit dispatch-to-turn contract:
  - immediate `turnId` from dispatch results when the runtime already knows it
  - otherwise dispatch-scoped capture in the AutoByteus server adapter/client layer until exact turn binding is observed
  - no chronology-based pending-turn assignment in the active path
- Restart recovery should resume only after authoritative turn binding, using known-turn reply recovery instead of guessed chronology.

### Implementation / Placement Implications

- The main refactor will center in `autobyteus-server-ts/src/external-channel` plus the server-side AutoByteus backend/client boundary inside `autobyteus-server-ts`; generic `autobyteus-ts` runtime event schemas should remain untouched.
- The likely new primary owner is a receipt workflow/orchestrator module that replaces the current implicit role of `AcceptedReceiptRecoveryRuntime`.
- Existing bridges and callback publisher should survive, but with narrower, adapter-style responsibilities.
- The current dispatch-turn capture and delayed-correlation registries should be collapsed into adapter-style run-observation helpers that never persist receipt workflow state directly.
- `ChannelTurnReplyRecoveryService` should narrow back to known-turn reply recovery instead of carrying chronology-based completed-turn lookup.
