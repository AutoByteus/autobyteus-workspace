# Requirements

## Status

- Current Status: `Refactor design-ready`
- Scope: `Small`

## Round 10 Re-Entry Note

- No user-visible or runtime-behavior requirement changed in this re-entry.
- The reopened work is structural:
  - keep the passing dispatch-scoped first-turn capture behavior,
  - restore one authoritative recovery-runtime boundary for ingress,
  - and split the oversized correlation owner into smaller named owners without changing the accepted external behavior.

## Problem

The previous refactor fixed the downstream reply-publication side by making Telegram publication depend on exact persisted correlation plus `TURN_COMPLETED(turnId)`. Real packaged Electron + Telegram verification showed that this is still insufficient in the native AutoByteus path: the first *bound* inbound message can still miss its own reply because accepted-receipt correlation currently begins too late. `postUserMessage()` / `postMessage()` remain enqueue-oriented runtime triggers, and the native worker can emit `TURN_STARTED(turnId)` almost immediately after enqueue. The current recovery runtime only starts turn-correlation observation later on an asynchronous timer, so the just-dispatched first `TURN_STARTED` can be missed and the oldest unmatched accepted receipt then binds to the next turn instead of the correct one.

## User-Visible Goal

Each accepted user message should correspond to an explicit turn lifecycle that downstream clients can observe directly:

- AutoByteus direct and team dispatch remain enqueue-oriented,
- accepted receipts may be persisted before exact `turnId` is known,
- the first *bound* Telegram/external-channel message receives its own reply without needing a later inbound message,
- runtime `TURN_STARTED(turnId)` still completes exact receipt correlation later, but the just-dispatched first turn must not be missed under native immediate timing,
- Telegram/external-channel reply publication continues to use only exact persisted correlation plus `TURN_COMPLETED(turnId)`,
- AutoByteus turn completion remains functionally correct but is expressed through one named runtime-owned completion rule,
- `AGENT_STATUS` remains a run-level state signal instead of carrying primary turn-correlation responsibility.

## In-Scope Requirements

| ID | Requirement |
| --- | --- |
| R-001 | AutoByteus direct `postUserMessage()` dispatch may remain enqueue-oriented and does not need to return the accepted turn id. |
| R-002 | AutoByteus team `postMessage()` dispatch may remain enqueue-oriented and does not need to return the accepted turn id. |
| R-003 | Accepted external-channel receipts must be allowed to persist in `ACCEPTED` state with `turnId = null` when runtime dispatch has succeeded but the runtime has not yet emitted `TURN_STARTED`. |
| R-004 | `AcceptedReceiptRecoveryRuntime` must bind exact accepted direct/team receipt correlation later from runtime `TURN_STARTED(turnId)` events using existing persisted run identifiers (`agentRunId`, `teamRunId`, `memberRunId`). |
| R-005 | Late correlation must be deterministic: for a given direct run or team member run, the oldest unmatched accepted receipt binds to the next matching `TURN_STARTED(turnId)` event, and one `TURN_STARTED` event must not correlate multiple receipts. |
| R-006 | AutoByteus turn start and completion lifecycle emission must remain explicit and centralized so every created turn still emits `TURN_STARTED` and the matching completion path emits `TURN_COMPLETED` while clearing the matching active-turn state. |
| R-007 | The AutoByteus turn-finalization rule after `LLMCompleteResponseReceivedEvent` must be expressed through a named runtime-owned decision/helper instead of being left as dispatcher-local implicit queue/status coupling. |
| R-008 | Direct and team external-channel reply bridges must continue to publish replies only from exact persisted turn-scoped correlation and `TURN_COMPLETED(turnId)`; turnless completion signals must not publish accepted replies. |
| R-009 | `AcceptedReceiptRecoveryRuntime` should remove dead dependency surface left behind by the strict-correlation cleanup. |
| R-010 | Regression coverage must prove direct/team late correlation on `TURN_STARTED`, deterministic oldest-receipt binding, explicit turn-finalization behavior, and strict accepted-receipt recovery after late correlation. |
| R-011 | Exact accepted direct/team receipt correlation must not miss the just-dispatched first bound turn when the native runtime emits `TURN_STARTED(turnId)` immediately after enqueue or before the current asynchronous recovery timer runs. |
| R-012 | Stage 7 validation must include a native-timing regression that fails if the first bound accepted receipt is correlated to the next turn instead of the just-dispatched one. |

## Acceptance Criteria

| ID | Maps To | Acceptance Criterion |
| --- | --- | --- |
| AC-001 | R-001 | AutoByteus direct dispatch paths no longer read `context.state.activeTurn` immediately after enqueue to determine the accepted turn id. |
| AC-002 | R-002 | AutoByteus team dispatch paths no longer read target-member `activeTurn` from team internals immediately after enqueue to determine the accepted turn id. |
| AC-003 | R-003 | `ChannelIngressService` can persist an accepted direct or team receipt with `turnId = null` while keeping the exact run identifiers needed for later correlation. |
| AC-004 | R-004 | `AcceptedReceiptRecoveryRuntime` binds a missing direct/team `turnId` by persisting `updateAcceptedReceiptCorrelation(...)` after the matching runtime `TURN_STARTED` event is observed. |
| AC-005 | R-005 | When multiple accepted receipts for the same run/member wait for `turnId`, a single `TURN_STARTED` event binds only the oldest unmatched receipt. |
| AC-006 | R-006 | AutoByteus still emits `TURN_STARTED` at actual turn creation and `TURN_COMPLETED` at actual matching completion, and completion clears the matching active-turn state. |
| AC-007 | R-007 | The post-LLM turn-finalization rule is implemented behind a named runtime-owned helper/decision with focused tests covering the “finish now” and “continue turn” cases. |
| AC-008 | R-008 | Telegram direct/team reply observation continues to publish only on `TURN_COMPLETED(turnId)` for the accepted turn and ignores turnless completion/status events for routing. |
| AC-009 | R-009 | `AcceptedReceiptRecoveryRuntime` no longer retains the unused `bindingService` dependency surface. |
| AC-010 | R-010 | Focused unit/integration coverage exists for direct/team late correlation on `TURN_STARTED`, deterministic oldest-receipt binding, explicit turn-finalization ownership, and strict accepted-receipt recovery after late correlation. |
| AC-011 | R-011 | The first bound accepted direct/team receipt still correlates to the exact turn created by the same dispatch even when `TURN_STARTED` is emitted before the current asynchronous accepted-receipt processing loop begins observing that run. |
| AC-012 | R-012 | Stage 7 includes a native-timing validation scenario that would fail if the first bound Telegram/external-channel reply is published only after a later inbound message. |

## Out Of Scope

- Redesigning Telegram transport beyond the event-driven late-correlation contract already in progress.
- Broad memory or event-store redesign unrelated to authoritative turn assignment / turn-finalization ownership.
- Reworking Claude or Codex lifecycle semantics beyond preserving their existing explicit turn events.
- Replaying pre-binding Telegram peer-discovery messages after a binding is saved; the ticket scope is the first *bound* message still missing its own reply.
