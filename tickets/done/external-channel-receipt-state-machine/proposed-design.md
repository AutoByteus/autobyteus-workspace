# Proposed Design Document

## Design Version

- Current Version: `v6`

## Revision History

| Version | Trigger | Summary Of Changes | Related Review Round |
| --- | --- | --- | --- |
| v1 | Initial draft | Replace fragmented accepted-receipt orchestration with a receipt-owned event-driven state machine | 1 |
| v2 | Stage 8 `Design Impact` re-entry | Replace the underspecified metadata round-trip idea with a server-owned pending-dispatch queue and chronological recovery | 2 |
| v3 | Stage 8 deep re-review on correlation correctness | Replace chronology-first pending-turn assignment with an explicit dispatch-to-turn contract: immediate `turnId` when dispatch already knows it, explicit `dispatchCorrelationId` on AutoByteus `TURN_STARTED`, and chronology only as degraded fallback | 6 |
| v4 | Stage 6 `Design Impact` re-entry after invalid core-event change | Keep immediate `turnId` when dispatch already knows it, but replace core-event correlation enrichment with adapter-boundary dispatch capture plus a separate long-lived run observation listener | 8 |
| v5 | Stage 8 `Design Impact` re-entry after no-fallback review | Remove timeout/null capture and chronology-based pending-turn fallback; accepted receipts now enter the workflow only after authoritative `turnId` binding | 10 |
| v6 | Stage 6 implementation hardening before the next Stage 8 round | Keep the `v5` no-fallback design, and add same-run dispatch serialization at the facade boundary so one accepted dispatch cannot race another dispatch's `TURN_STARTED` capture | 12 |

## Artifact Basis

- Investigation Notes: `tickets/in-progress/external-channel-receipt-state-machine/investigation-notes.md`
- Requirements: `tickets/in-progress/external-channel-receipt-state-machine/requirements.md`
- Requirements Status: `Design-ready`
- Shared Design Principles: `shared/design-principles.md`
- Common Design Practices: `shared/common-design-practices.md`

## Summary

Refactor the external-channel workflow so one durable receipt remains the only authoritative workflow object for one inbound external message, and so the live business path never guesses turn ownership.

1. If dispatch already knows `turnId`, persist the accepted receipt as `TURN_BOUND` immediately.
2. If dispatch does not know `turnId`, the facade-local dispatch contract keeps waiting on the dispatch-scoped listener until exact turn binding is observed.
3. The accepted receipt is recorded only after an authoritative `turnId` exists.
4. Same-run dispatches serialize at the facade boundary so delayed turn capture remains authoritative even if one live run receives back-to-back external messages.
5. Per-turn reply bridges observe the known bound turn directly; the extra run-wide pending-turn assignment path is removed.
6. Recovery remains only for already bound turns, using known-turn evidence instead of chronology-based pending-turn guessing.

This keeps the receipt as the central owner, restores separation of concerns, removes the remaining guessed live path, and removes the now-unnecessary pending-turn coordination layer.

## Goal / Intended Change

Make the external-channel architecture straightforward to reason about:

1. one receipt owns workflow truth
2. one runtime owns durable workflow progression
3. adapter listeners emit facts but do not mutate durable state directly
4. client-specific dispatch capture lives at the adapter boundary, not in the runtime core schema
5. no chronology-based turn binding exists in the business path
6. no same-run dispatch race exists around delayed turn capture

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action:
  - keep `ReceiptWorkflowRuntime` as the sole active workflow owner
  - keep dispatch capture and reply observation helpers adapter-only
  - do not reintroduce accepted-runtime helpers or receipt-state mutation from adapters
  - do not keep any chronology-based pending-turn assignment path
  - fail fast on missing modern receipt fields instead of deriving legacy behavior

## Requirements And Use Cases

| Requirement ID | Description | Acceptance Criteria ID(s) | Acceptance Criteria Summary | Use Case IDs |
| --- | --- | --- | --- | --- |
| `R-001` | One durable receipt is the authoritative workflow object | `AC-001`, `AC-006` | Centralized receipt workflow ownership | `UC-001`, `UC-002`, `UC-003`, `UC-004`, `UC-005`, `UC-006`, `UC-007`, `UC-008` |
| `R-002` | Explicit receipt workflow phases exist | `AC-001` | Durable workflow clarity | `UC-001`, `UC-002`, `UC-003`, `UC-004`, `UC-005`, `UC-006` |
| `R-003` | Processing is serialized per receipt | `AC-001`, `AC-002`, `AC-003` | No race between live, recovery, retry, publish | `UC-002`, `UC-003`, `UC-004`, `UC-005`, `UC-007`, `UC-008` |
| `R-004` | Live observation and persisted recovery feed the same receipt-owned finalization flow | `AC-002`, `AC-003` | One finalization model | `UC-002`, `UC-003`, `UC-004`, `UC-005` |
| `R-005` | One external publish per completed receipt/turn remains | `AC-002`, `AC-004` | Preserve callback contract | `UC-001`, `UC-002`, `UC-003`, `UC-004`, `UC-007` |
| `R-006` | Recovery resumes from durable receipt state without ambiguous run-scoped matching | `AC-003`, `AC-007` | Safe restart/retry/correlation | `UC-002`, `UC-003`, `UC-004`, `UC-005`, `UC-008` |
| `R-007` | Direct and team flows share one model | `AC-004` | Unified path shape | `UC-001`, `UC-002`, `UC-003`, `UC-004`, `UC-005`, `UC-006`, `UC-007`, `UC-008` |
| `R-008` | Helper modules become adapters/effect handlers, not workflow owners | `AC-006` | Ownership simplification | `UC-002`, `UC-003`, `UC-004`, `UC-005`, `UC-008` |
| `R-009` | Richer internal workflow phases are allowed while external publish remains one-shot | `AC-002`, `AC-006` | Preserve external contract, improve internal truth | `UC-001`, `UC-002`, `UC-003`, `UC-004`, `UC-007` |
| `R-010` | Missing/deleted/stale runs end in explicit truthful terminal states | `AC-005` | Explicit failure handling | `UC-004`, `UC-005`, `UC-006` |

## Current-State Read

| Area | Findings | Evidence (files/functions) | Open Unknowns |
| --- | --- | --- | --- |
| Dispatch result surface | Codex and Claude direct/team dispatch paths already know `turnId` during `sendTurn()`, but the current server contracts drop it before receipt persistence | `agent-operation-result.ts`, `codex-agent-run-backend.ts`, `claude-agent-run-backend.ts`, `codex-team-manager.ts`, `claude-team-manager.ts` | None material |
| AutoByteus dispatch behavior | AutoByteus `postUserMessage()` only guarantees enqueue; it does not synchronously return `turnId`, so delayed capture must happen after dispatch | `agent.ts`, `agent-runtime.ts`, `agent-worker.ts` | The exact capture primitive should stay backend-private |
| Adapter boundary | AutoByteus direct and team server backends already own runtime subscriptions, so they can host authoritative dispatch-scoped capture without changing generic runtime events | `autobyteus-agent-run-backend.ts`, `autobyteus-team-run-backend.ts` | None material |
| Observation parsing | The per-turn reply bridges already parse generic `turnId` and subscribe directly by known turn identity; they can replace the extra run-wide pending-turn queue | `channel-reply-bridge-support.ts`, `channel-agent-run-reply-bridge.ts`, `channel-team-run-reply-bridge.ts` | None material |
| Current weakness | Even after removing chronology fallback, overlapping dispatches on the same run could still let one dispatch-scoped listener observe the wrong `TURN_STARTED` unless the facade boundary serializes those dispatches | `channel-agent-run-facade.ts`, `channel-team-run-facade.ts`, `channel-dispatch-turn-capture.ts`, `agent-run.ts`, `team-run.ts` | None material |
| Recovery evidence | Raw traces persist `turnId` and timestamps, but known-turn recovery is sufficient once the dispatch contract becomes authoritative | `channel-turn-reply-recovery-service.ts`, `raw-trace-item.ts` | None material |

## Options Considered

### Option A: Keep chronology-first pending-turn assignment and patch more cases

- Pros:
  - smallest source change
- Cons:
  - keeps correctness dependent on timing and ordering
  - preserves the remaining design smell found in review
- Decision: `Rejected`

### Option B: Push external-channel correlation into generic runtime/core events

- Pros:
  - makes delayed correlation explicit in the short term
- Cons:
  - violates separation of concerns
  - makes agent-core lifecycle events aware of one client’s receipt workflow
- Decision: `Rejected`

### Option C: Hybrid dispatch-to-turn contract with adapter-boundary capture and degraded chronological fallback

- Pros:
  - uses immediate `turnId` where runtimes already know it
  - keeps generic runtime events client-agnostic
  - puts delayed capture where the client/adapter already owns the dispatch call
  - keeps fallback recovery truthful for restarts and missed signals
- Cons:
  - requires backend-specific capture logic in the AutoByteus server adapters
  - still requires threading `turnId` through server dispatch result contracts
- Decision: `Chosen`

### Option D: Authoritative dispatch-to-turn contract with no guessed live-path fallback

- Pros:
  - removes timeout/null capture as a business-path branch
  - removes chronology-based pending-turn assignment entirely
  - lets the accepted receipt workflow begin only after exact turn binding
  - makes the per-turn reply bridges the only live observation path after binding
  - remains authoritative under same-run concurrency once the facade boundary serializes dispatch attempts per run
- Cons:
  - accepted dispatch may wait longer at the facade boundary before the receipt is recorded as accepted
  - restart recovery no longer attempts guessed post-restart turn binding before a turn is known
- Decision: `Chosen`

## Data-Flow Spine Inventory

| Spine ID | Scope | Start | End | Owning Node / Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| `DS-001` | Primary End-to-End | inbound external message | callback outbox enqueue or terminal receipt state | `ReceiptWorkflowRuntime` | The main business path for one external message |
| `DS-002` | Return-Event | dispatch-scoped runtime event | authoritative `turnId` returned to ingress/facade | adapter-boundary capture helper serving `Channel*RunFacade` | Delayed turn capture returns here without polluting the runtime core or guessing by chronology |
| `DS-003` | Return-Event | per-turn runtime observation | receipt final-reply fact ingestion | per-turn reply bridges serving `ReceiptWorkflowRuntime` | Live reply observation stays directly attached to the known accepted turn |
| `DS-004` | Return-Event | persisted raw traces for a known turn | receipt recovery fact ingestion | `ChannelTurnReplyRecoveryService` serving `ReceiptWorkflowRuntime` | Known-turn fallback for already bound turns only |
| `DS-005` | Bounded Local | `(receipt snapshot, receipt event)` | persisted next receipt snapshot + effect plan | `ReceiptWorkflowRuntime` | The authoritative reducer/effect loop |

## Primary Execution / Data-Flow Spine(s)

- `External channel ingress -> dispatch facade resolves exact turn binding -> accepted receipt persisted -> receipt workflow runtime -> reply finalized -> callback publish enqueued once`

Why the span is long enough:

- it starts at the external inbound boundary
- it crosses the authoritative receipt owner
- it includes immediate binding, delayed capture, and known-turn recovery
- it ends at the externally visible publish boundary or truthful terminal state

## Ownership Map

| Node / Owner | Owns | Must Not Own | Notes |
| --- | --- | --- | --- |
| `ReceiptWorkflowRuntime` | receipt event ingestion, receipt snapshot loading, reducer execution, durable state persistence, effect dispatch, correlation policy selection | raw event parsing details, callback transport internals, backend-specific capture mechanics | Top-level authoritative owner |
| `ReceiptReducer` | workflow transitions and effect decisions | IO, timers, subscriptions | Pure or near-pure |
| `ReceiptEffectRunner` | observation startup, known-turn recovery calls, publish calls | dispatch-time turn capture policy or durable state mutation | Reports outcomes back as events |
| adapter-boundary dispatch capture helper | one accepted dispatch awaiting delayed turn binding | durable receipt mutation, publish decisions, generic runtime-schema changes | Backend/client-specific helper |
| per-turn reply bridges | turn-scoped runtime event subscriptions and reply aggregation for a known bound turn | durable receipt mutation or dispatch-time turn capture | Adapter-only |
| `ChannelTurnReplyRecoveryService` | known-turn reply recovery from raw traces | receipt transitions or publish decisions | Adapter-only |
| `ReplyCallbackService` | callback enqueue and duplicate detection | deciding if the receipt is publishable | Adapter-only |
| `ChannelMessageReceiptProvider` | atomic receipt persistence and targeted lookup queries | business policy | Store boundary only |

## Proposed Architecture

### Core Components

1. `ReceiptWorkflowRuntime`
   - entrypoint for receipt facts
   - serializes processing per receipt
   - loads receipt snapshot
   - reduces next state
   - persists next state
   - invokes effect runner

2. `ReceiptReducer`
   - input: `receipt snapshot + receipt fact`
   - output: `next receipt snapshot fields + effect list`
   - only this layer decides when the receipt becomes `TURN_BOUND`, `REPLY_FINALIZED`, `PUBLISH_PENDING`, `PUBLISHED`, `FAILED`, or `EXPIRED`

3. `ReceiptEffectRunner`
   - start or restore long-lived observation
   - request known-turn raw-trace recovery
   - publish final reply
   - convert effect outcomes back into receipt facts

4. adapter-boundary dispatch capture helper
   - created per dispatch when the runtime cannot return `turnId` synchronously
   - waits for the delayed turn-binding fact using backend-private listener logic
   - returns exact `turnId` back to the dispatch facade before the receipt is recorded as accepted
   - never mutates durable receipt state directly

5. per-turn reply bridges
   - subscribe to generic runtime turn/segment/completion events for one known `turnId`
   - aggregate assistant-visible reply text for that one accepted turn
   - never persist receipt state directly

6. `ChannelTurnReplyRecoveryService`
   - supports direct `resolveReplyText(turnId)`
   - never publishes or mutates receipt state

### Receipt Snapshot Shape

Minimum durable concepts:

- `workflowState`
- `dispatchAcceptedAt`
- dispatch target refs:
  - direct `agentRunId`
  - team `teamRunId`
  - member `agentRunId` for targeted team member
- `turnId`
- `replyTextFinal`
- `lastError`

Recommended durable states:

1. `RECEIVED`
2. `DISPATCHING`
3. `TURN_BOUND`
4. `COLLECTING_REPLY`
5. `TURN_COMPLETED`
6. `REPLY_FINALIZED`
7. `PUBLISH_PENDING`
8. `PUBLISHED`
9. `UNBOUND`
10. `FAILED`
11. `EXPIRED`

### Canonical Event Set

Recommended receipt facts:

1. `MESSAGE_RECEIVED`
2. `BINDING_FOUND`
3. `BINDING_NOT_FOUND`
4. `DISPATCH_ACCEPTED`
5. `TURN_CAPTURED`
6. `TURN_COMPLETED_SIGNAL`
7. `RECOVERY_REPLY_FOUND`
8. `RECOVERY_UNAVAILABLE`
9. `PUBLISH_REQUESTED`
10. `PUBLISH_SUCCEEDED`
11. `PUBLISH_FAILED`
12. `RUN_MISSING`
13. `ROUTE_INVALIDATED`
14. `RETRY_TIMER_FIRED`
15. `WORKFLOW_TIMEOUT`

### Turn Correlation Strategy

The authoritative rule is:

`bind by immediate dispatch result first, otherwise keep waiting at the adapter boundary until exact turn capture completes inside one run-scoped exclusive dispatch window`

Rules:

1. Every accepted dispatch persists:
   - `dispatchAcceptedAt`
   - the resolved direct run or member run target
   - an exact `turnId`
2. If dispatch already returns `turnId`, the receipt is persisted as `TURN_BOUND` immediately.
3. If dispatch does not return `turnId`, the dispatch-scoped capture helper keeps waiting until exact turn binding is observed before the accepted receipt is recorded.
4. If the dispatch path is delayed, same-run dispatch attempts must serialize at the facade boundary until capture resolves so one dispatch-scoped listener can only observe its own accepted turn.
5. The capture helper may listen for the delayed turn-binding fact using backend-private logic, but it must not require changes to the generic runtime event schema.
6. After a receipt is bound to `turnId`, all later same-turn events route by `turnId`, never by chronology.
7. Known-turn raw-trace recovery is allowed only after the receipt is already turn-bound.
8. The runtime must never make the generic core notifier/event schema aware of external-channel receipt correlation.
9. The runtime must never use generic “oldest accepted receipt for this run” matching as an authoritative or degraded turn-binding rule.

Why this is stronger:

- Codex and Claude already give `turnId` immediately.
- AutoByteus can be captured at the server adapter boundary without changing core lifecycle events.
- Same-run serialization keeps that adapter-boundary capture authoritative under concurrency without leaking client-specific state into the runtime core.
- direct and team flows still share one receipt-owned model.
- the accepted workflow begins only after truth is recovered from explicit identity.

### Receipt-Centric Behavioral Rules

1. A receipt cannot publish before `REPLY_FINALIZED`.
2. Live observation and persisted recovery both feed receipt facts; neither may publish independently.
3. Adapters never call `ChannelMessageReceiptService.updateReceiptWorkflowProgress()` directly.
4. Turn binding is completed before a receipt enters the accepted reply workflow; backend-specific capture mechanics stay inside the adapter boundary.
5. Duplicate inbound delivery always re-enters the same receipt workflow.
6. Restart recovery operates only on already bound turns and uses known-turn recovery.
7. Missing or deleted runs are explicit facts that lead to known-turn recovery or terminal failure.

## Ownership-Driven Dependency Rules

- Allowed dependency directions:
  - `ChannelIngressService -> ReceiptWorkflowRuntime`
  - `ReceiptWorkflowRuntime -> ChannelMessageReceiptService`
  - `ReceiptWorkflowRuntime -> ReceiptReducer`
  - `ReceiptWorkflowRuntime -> ReceiptEffectRunner`
  - `ReceiptEffectRunner -> ChannelRunFacade / adapter-boundary capture helpers / ChannelTurnReplyRecoveryService / ReplyCallbackService`
- Authoritative public entrypoints versus internal owned sub-layers:
  - post-accept callers depend on `ReceiptWorkflowRuntime`, not directly on receipt services plus observation helpers
- Forbidden shortcuts:
  - adapters mutating receipt workflow state directly
  - providers owning correlation policy
  - recovery adapter publishing or finalizing state directly
  - client-specific fields added to generic runtime/core events
  - chronology-first queue selection on the normal live path
  - overlapping delayed-turn dispatches on one run without a facade-owned exclusive boundary

## Architecture Direction Decision (Mandatory)

- Chosen direction: `Receipt-owned event-driven state machine with adapter-boundary delayed turn capture and run-scoped dispatch serialization`
- Rationale:
  - complexity: removes the wrong-layer core-event mutation and keeps delayed capture at the client boundary that initiated dispatch
  - testability: immediate and delayed binding paths stay explicit and directly testable
  - operability: restart recovery still works without restoring old heuristic ownership
  - evolution cost: future runtime improvements can refine backend capture without moving workflow ownership again
- Data-flow spine clarity assessment: `Yes`
- Spine span sufficiency assessment: `Yes`
- Spine inventory completeness assessment: `Yes`
- Ownership clarity assessment: `Yes`
- Off-spine concern clarity assessment: `Yes`
- Authoritative Boundary Rule assessment: `Yes`
- File placement within the owning subsystem assessment: `Yes`
- Outcome: `Change`

## Change Inventory (Delta)

| Change ID | Change Type | Current Path | Target Path | Rationale | Impacted Areas | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `C-001` | `Modify` | `agent-execution/domain/agent-operation-result.ts` | same file | carry optional `turnId` through dispatch results when a runtime already knows it | server runtime contracts | direct/team runtimes already have the data |
| `C-002` | `Modify` | `external-channel/runtime/channel-run-dispatch-result.ts` | same file | expose optional `turnId` on accepted dispatch results | external-channel runtime | keeps ingress/runtime explicit |
| `C-003` | `Modify` | `external-channel/runtime/channel-agent-run-facade.ts`, `channel-team-run-facade.ts` | same files | persist immediate turn binding when dispatch already knows `turnId` | external-channel runtime | Codex/Claude paths |
| `C-004` | `Add/Modify` | `external-channel/runtime/channel-dispatch-turn-capture.ts`, `channel-dispatch-lock-registry.ts`, `channel-agent-run-facade.ts`, `channel-team-run-facade.ts` | same files | keep delayed capture at the server adapter boundary and serialize same-run dispatches until capture resolves | external-channel runtime | AutoByteus direct/team paths |
| `C-005` | `Modify` | `external-channel/providers/*receipt*`, `services/channel-message-receipt-service.ts` | same files | keep accepted-dispatch persistence able to store exact `turnId` only | providers/services | no core-event coupling |
| `C-006` | `Modify` | `external-channel/runtime/receipt-effect-runner.ts`, `receipt-workflow-runtime.ts`, `services/channel-turn-reply-recovery-service.ts` | same files | keep only turn-bound live observation and known-turn recovery after authoritative binding | external-channel runtime | primary design change |
| `C-007` | `Remove` | attempted `autobyteus-ts` notifier/runtime correlation edits | revert from active design | restore client-agnostic runtime core event surface | autobyteus-ts | mandatory cleanup |
| `C-008` | `Remove` | `external-channel/runtime/receipt-run-observation-registry.ts`, pending-turn/chronology helpers | remove from active design | eliminate the extra run-wide pending-turn owner and guessed turn-binding rule | external-channel runtime | mandatory cleanup |

## Removal / Decommission Plan (Mandatory)

1. Remove the attempted core-event correlation change from `autobyteus-ts`.
2. Remove chronology-first pending-turn assignment from the normal live path.
3. Remove any run-wide pending-turn ownership layer from the active workflow.
4. Do not add any compatibility wrapper around the wrong-layer change or the old live-path rule.
5. Keep fail-fast behavior for missing modern receipt fields.

## Non-Goals

- No frontend rendering redesign.
- No external multi-publish or streaming delivery contract.
- No legacy fallback for older receipt rows.
