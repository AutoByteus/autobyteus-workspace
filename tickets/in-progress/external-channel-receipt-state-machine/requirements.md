# Requirements

- Ticket: `external-channel-receipt-state-machine`
- Status: `Design-ready`
- Scope Classification: `Large`
- Last Updated: `2026-04-09`

## Goal

Refactor the external-channel inbound and outbound orchestration so the receipt becomes the authoritative workflow object from inbound message acceptance through turn binding, reply aggregation, turn completion, publish, and recovery.

## Problem Statement

The current external-channel architecture spreads receipt ownership across ingress handling, dispatch-scoped turn capture, turn-correlation observers, accepted-receipt recovery, live reply bridges, persisted memory recovery, and outbound callback publishing. The durable receipt currently exposes only a small ingress-state enum, while the real workflow is an implicit multi-phase process hidden across several modules.

That makes the system hard to reason about and prone to cross-phase bugs:

- one `ACCEPTED` receipt can mean several different workflow situations
- turn binding can be inferred by run-scoped matching instead of receipt-owned progression
- persisted reply recovery can compete with live collection instead of behaving as a clear fallback
- stale run state can affect later external messages until the run is terminated or deleted

## In-Scope Use Cases

- `UC-001`: A fresh inbound message for a bound direct agent run where dispatch and turn capture both happen promptly.
- `UC-002`: A fresh inbound message for a bound direct or team run where dispatch must wait for authoritative turn binding before the receipt is recorded as accepted.
- `UC-003`: A turn that emits assistant-visible text across multiple LLM legs and tool calls, where the receipt must aggregate the final externally deliverable reply until the turn completes.
- `UC-004`: A runtime restart, retry, or delayed observer attachment where a receipt must resume from durable state without duplicating or losing the external reply.
- `UC-005`: A stale or missing run, deleted agent/run, or unavailable live observation path where recovery must either resume correctly or fail explicitly without attaching to the wrong turn.
- `UC-006`: A binding removal or route invalidation before publish, where the receipt must terminate in a truthful terminal state.
- `UC-007`: Duplicate inbound delivery for the same external message, where the same receipt must remain authoritative and idempotent.

## Architecture Direction

- Core model: `Receipt-owned state machine`
- Input model: `Event-driven edges feeding one serialized per-receipt workflow`
- Decision model: `Reducer or explicit transition function`
- Side-effect model: `Post-transition effect runner`

## Requirements

| Requirement ID | Description | Covered Use Cases |
| --- | --- | --- |
| `R-001` | One durable receipt remains the authoritative workflow object for one inbound external message. | `UC-001`, `UC-002`, `UC-003`, `UC-004`, `UC-005`, `UC-006`, `UC-007` |
| `R-002` | Receipt progression must use explicit workflow phases for at least dispatching, turn bound, collecting, turn completed, reply finalized, publish pending, and terminal outcome. | `UC-001`, `UC-002`, `UC-003`, `UC-004`, `UC-005`, `UC-006` |
| `R-003` | Processing must be serialized per receipt so live observation, recovery, retry, and publish decisions cannot race each other for the same inbound message. | `UC-002`, `UC-003`, `UC-004`, `UC-005`, `UC-007` |
| `R-004` | Live turn events and persisted recovery must feed the same receipt-owned reply-finalization workflow instead of independent publish decisions. | `UC-003`, `UC-004`, `UC-005` |
| `R-005` | External publish remains at most once per logical turn/receipt under the existing callback idempotency contract. | `UC-001`, `UC-003`, `UC-004`, `UC-007` |
| `R-006` | Recovery after restart or missing live observer must resume from durable receipt state after authoritative turn binding, without relying on ambiguous run-scoped matching or chronology-based live-path turn assignment. | `UC-002`, `UC-004`, `UC-005` |
| `R-007` | The same model must work for both direct agent runs and team-member turns. | `UC-001`, `UC-002`, `UC-003`, `UC-004`, `UC-005`, `UC-006`, `UC-007` |
| `R-008` | Live observation, delayed turn correlation, persisted recovery, and outbound publishing must act as adapters or effect handlers, not as independent workflow owners. | `UC-002`, `UC-003`, `UC-004`, `UC-005` |
| `R-009` | The architecture must preserve one externally visible publish per completed receipt/turn under the current callback contract, but internal receipt phases may be richer than the old ingress-state enum. | `UC-001`, `UC-003`, `UC-004`, `UC-007` |
| `R-010` | The design must make stale-run and deleted-run handling explicit, so a receipt can end in a truthful terminal state when its owning run can no longer progress. | `UC-005`, `UC-006` |

## Receipt Workflow Phase Requirements

The design must model at least the following logical phases, whether as one field or equivalent durable representation:

1. `RECEIVED`
2. `BINDING_RESOLVED`
3. `DISPATCHING`
4. `DISPATCH_ACCEPTED`
5. `TURN_BOUND`
6. `COLLECTING_REPLY`
7. `TURN_COMPLETED`
8. `REPLY_FINALIZED`
9. `PUBLISH_PENDING`
10. `PUBLISHED`

Required terminal outcomes:

1. `UNBOUND`
2. `FAILED`
3. `EXPIRED` or equivalent explicit abandonment state

## Event Input Requirements

The design must identify explicit receipt-relevant events, including at least:

1. `MESSAGE_RECEIVED`
2. `BINDING_FOUND` / `BINDING_NOT_FOUND`
3. `DISPATCH_STARTED`
4. `DISPATCH_ACCEPTED`
5. `TURN_STARTED`
6. `SEGMENT_OBSERVED`
7. `TURN_COMPLETED`
8. `RECOVERY_REPLY_FOUND`
9. `RECOVERY_UNAVAILABLE`
10. `PUBLISH_REQUESTED`
11. `PUBLISH_SUCCEEDED`
12. `PUBLISH_FAILED`
13. `ROUTE_INVALIDATED`
14. `RETRY_TIMER_FIRED`

## Acceptance Criteria

| Acceptance Criteria ID | Requirement ID(s) | Description | Scenario Intent |
| --- | --- | --- | --- |
| `AC-001` | `R-001`, `R-002`, `R-003` | Each inbound external message advances through explicit receipt-owned phases rather than implicit module-local flags. | Durable workflow clarity |
| `AC-002` | `R-003`, `R-004`, `R-005` | A multi-leg tool-using turn produces one final externally published reply from receipt-owned aggregation/finalization. | One publish after receipt finalization |
| `AC-003` | `R-004`, `R-006` | When live observation is unavailable after a receipt is already turn-bound, recovery resumes from receipt state and does not attach a later turn to the wrong receipt. | Safe recovery and restart |
| `AC-004` | `R-005`, `R-007` | Duplicate inbound delivery and direct/team run variants remain idempotent and publish at most once. | Idempotent direct and team paths |
| `AC-005` | `R-006` | Stale run deletion, missing run, or binding removal produce truthful terminal receipt outcomes instead of hanging or silently replaying stale reply text. | Explicit failure/termination behavior |
| `AC-006` | `R-008`, `R-009` | Workflow decisions are centralized in one receipt-oriented orchestrator/reducer, and helper modules are reduced to event adapters or effect executors. | Ownership simplification |
| `AC-007` | `R-010` | The system no longer depends on ambiguous run-scoped “oldest accepted receipt” matching as the authoritative correlation rule for durable workflow ownership. | Remove ambiguous run-scoped ownership |

## Constraints / Dependencies

- Existing callback publishing is deduplicated by callback idempotency key.
- Existing external message bindings remain the source of route ownership.
- Existing run events still provide the earliest truthful turn lifecycle signals.
- For supported runtimes, a truthful `TURN_STARTED` signal is always observable after a dispatch that is truly accepted for execution.
- The refactor should remain inside `autobyteus-server-ts` unless design work proves a cross-repo protocol change is required.

## Assumptions

- The receipt should be the authoritative aggregate, not the run or the bridge.
- `TURN_STARTED` and `TURN_COMPLETED` remain useful lifecycle signals, even if their handling moves behind a receipt-owned reducer or event loop.
- Authoritative turn binding should be obtained before a receipt enters the accepted reply workflow; guessed live-path correlation is not allowed.
- A plain persisted reducer/event-loop model is sufficient; a heavy framework is not required.
- Streaming or multi-publish external delivery is not part of this refactor.

## Open Questions / Risks

- Whether the durable model should extend the existing `ingressState` or introduce separate receipt workflow fields.
- Whether run-scoped turn-correlation observers can be removed entirely or must remain as adapters that emit events into the receipt workflow.
- Whether persisted reply recovery should finalize reply text directly or only append evidence into the receipt-owned aggregation model.

## Non-Goals

- No frontend rendering redesign in this ticket.
- No change to the external callback outbox transport contract beyond what is necessary to support the new receipt workflow.
- No cross-repo protocol redesign unless later design review proves it unavoidable.

## Requirement To Use-Case Coverage

| Requirement ID | Use Case IDs |
| --- | --- |
| `R-001` | `UC-001`, `UC-002`, `UC-003`, `UC-004`, `UC-005`, `UC-006`, `UC-007` |
| `R-002` | `UC-001`, `UC-002`, `UC-003`, `UC-004`, `UC-005`, `UC-006` |
| `R-003` | `UC-002`, `UC-003`, `UC-004`, `UC-005`, `UC-007` |
| `R-004` | `UC-003`, `UC-004`, `UC-005` |
| `R-005` | `UC-001`, `UC-003`, `UC-004`, `UC-007` |
| `R-006` | `UC-002`, `UC-004`, `UC-005` |
| `R-007` | `UC-001`, `UC-002`, `UC-003`, `UC-004`, `UC-005`, `UC-006`, `UC-007` |
| `R-008` | `UC-002`, `UC-003`, `UC-004`, `UC-005` |
| `R-009` | `UC-001`, `UC-003`, `UC-004`, `UC-007` |
| `R-010` | `UC-005`, `UC-006` |

## Acceptance-Criteria To Scenario Intent Mapping

| Acceptance Criteria ID | Scenario Intent |
| --- | --- |
| `AC-001` | Validate explicit durable receipt workflow phases. |
| `AC-002` | Validate one final reply after multi-leg aggregation. |
| `AC-003` | Validate restart/retry recovery without misbinding receipts to later turns. |
| `AC-004` | Validate idempotent direct and team run handling. |
| `AC-005` | Validate truthful termination when live progression is impossible. |
| `AC-006` | Validate that workflow ownership is centralized instead of fragmented. |
| `AC-007` | Validate removal of ambiguous run-scoped receipt ownership. |
