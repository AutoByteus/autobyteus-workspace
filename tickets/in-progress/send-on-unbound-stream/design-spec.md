# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-002`
- Approved requirements baseline: `requirements-doc.md` at SR-002, approved by the Solution Designer within the direction of Task autobyteus-540 (user informed, 2026-11-18).
- Behavior-defining supplements: None.
- User approval of the design: `Not required`.
- Design status: `Ready`
- Canonical investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/send-on-unbound-stream/tickets/in-progress/send-on-unbound-stream/investigation-notes.md`
- Authorities read (2026-11-18, this conversation): `references/architecture-design.md`, `references/design-principles.md`, `DESIGN.md` (rules 1, 5, 9, 11), `docs/design-cases.md` (Cases 2, 3, 4, 5, 6), `GLOSSARY.md`.
- Conflicts / discrepancies: None.

## Current-State Read

- **Agent streams** (standalone, delegated agent, peer run) share `AgentStreamingService`. `agentRunStore.ensureAgentStreamConnected` (`agentRunStore.ts:315-333`) returns when the **socket** is open (`connectionState === CONNECTED`), while the node's run stream is ready only at its `CONNECTED` message (`api/websocket/agent.ts:40-80`; FU-036 tests). The service already knows that moment: `receive` notifies `{ kind: 'bound' }` on `CONNECTED` (`AgentStreamingService.ts:289`). A send without mentions is fire-and-forget (`sendMessage`, `:158-181`); a send with mentions waits for its ack (`sendMessageAwaitingAdmission`, `:183-207`, rejected at any loss by `rejectInFlight`, `:317-323`). The snapshot after `CONNECTED` replaces the conversation (`agentStreamSnapshotApplication.ts:39-44`), so a send the node never took vanishes. The peer route sends without any wait (`delegatedRunsStore.ts:145-155`); its node session has no not-ready window (`peer-run.ts:15-35`) but the socket may not be open (`WebSocketClient.ts:100-105` throws).
- **Team** (`agentTeamRunStore.ts:128-140,262-355`): waits for the ready view (`isReady`), awaits admission (`TeamSendAdmissions`, drained at a loss, `TeamStreamingService.ts:281-287`). Failure: its own draft restore plus `failLocalSubmission`'s raw segment, and the member's status set to Error.
- **Org** (`agentOrgContextsStore.ts:309-360`): ready stream required (`requireReadyContext`), ack awaited (`command`), all pending rejected at close (`rejectPending`). Failure: its own draft restore (unless edited) plus the raw segment.
- **Failure presentation**: `failLocalSubmission` (`localUserSubmission.ts:151-180`) is the shared owner, called by the three stores (`agentRunStore.ts:258,262`, `agentTeamRunStore.ts:346`, `agentOrgContextsStore.ts:348`); it already dispatches one error type (`CollaboratorAddRejection` → keep the draft + `collaboratorAddFailure` notice, `CollaboratorAddFailureNotice.vue`, mounted in `AgentEventMonitor.vue:43`, desktop and phone).
- **Reconnect holding** (autobyteus-533): `InterruptsAwaitingRebind` (`interruptCommandAdmission.ts:59-79`) holds Stops across a retryable loss in the three services.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Medium` — web only: about 12 source files (one new error type and its presentation in the shared failure owner, one notice component, the agent streaming service, the generalized rebind holder, three stores' send paths, the peer route, the Team and Org services' failure classification, AgentContext, localization) plus two probes and tests. No server source change.
- Architectural risk: `High` — it changes the send contract inside the web app for every run kind (a send now resolves on the node's answer and can end as "not delivered"), adds lifecycle across reconnects (a send held until the rebind's snapshot decides), and moves draft restoration of Team and Org into the shared owner. Blast radius: every send on desktop and phone.
- Escalation trigger: a need to change the node, a wire schema, or the snapshot application; or a runtime whose stored user message lacks its message id (ASM-001).

## Architecture Investigation Evidence

| Source | Path | Observation | Decision |
| --- | --- | --- | --- |
| Code | `AgentStreamingService.ts:115-117,141-150,289,300,309-323` | `CONNECTED` already observed; losses go through `rejectInFlight(reason, recovers)` | D-1, D-3 |
| Code | `agentStreamSnapshotApplication.ts:39-47` | Snapshot replaces conversation, overlays queued input, replays turn frames | D-3 decides after the snapshot is fully applied |
| Code | server `runtime-memory-event-accumulator.ts:88`; `agent-run-command-coordinator.ts:291-300`; web `runProjectionConversation.ts:281`, `userMessageProjection.ts:112` | Stored and queued user messages carry the page's message id (external runtimes: recorded from the input's metadata the coordinator sets) | D-3; ASM-001 to confirm for native |
| Code | `localUserSubmission.ts:151-180`; three callers | One failure owner exists | D-4 extends it |
| Code | `interruptCommandAdmission.ts:59-79` | A holder for work across a reconnect | D-3 reuses it (generalized) |
| Measurement | `evidence/reproduction/` | Node refuses before `CONNECTED`; takes everything after | D-1 |

## Design Decisions

- **D-1 Ready means bound.** `AgentStreamingService` gets `whenBound(timeoutMs): Promise<void>`: resolves at once when `CONNECTED` has been received on the current connection, otherwise at the next `CONNECTED`; rejects `MessageNotDeliveredError('not_sent')` at the timeout. The bound flag is set on `CONNECTED` and cleared whenever the socket is lost or dropped. `ensureAgentStreamConnected` connects and awaits `whenBound(10_000)` (replacing its socket poll). The peer route awaits the same before sending.
- **D-2 Every agent send waits for the node's answer.** `sendMessage` becomes `Promise<void>`: it resolves at the node's `AGENT_COMMAND_ACK` for that message, accepted or rejected (a rejected ack keeps today's presentation by the projector, `agentStreamMessageProjector.ts:143-154`); `sendMessageAwaitingAdmission` (sends with mentions) keeps rejecting on a rejected ack. A socket that is not open when sending → `MessageNotDeliveredError('not_sent')`.
- **D-3 A send lost with its connection is decided after the rebind.** On a retryable loss (`handleDisconnect` retryable, `reopen`, `dropConnection`), waiting sends move to a rebind holder (the 533 holder generalized as `HeldUntilRebind`). After the new connection's `AGENT_STREAM_SNAPSHOT` has been applied (stored part, queued input and turn frames), each held send settles: the context's conversation has a user message with its message id → delivered (resolve); otherwise → `MessageNotDeliveredError('not_sent')`. At a final close (`disconnect()`, a non-retryable loss) held and waiting sends reject `MessageNotDeliveredError('unknown')`.
- **D-4 One owner for "not delivered".** New `MessageNotDeliveredError` (`certainty: 'not_sent' | 'unknown'`). `failLocalSubmission` handles it as a third outcome, `'returned_draft'`: removes the shown message from the conversation (`'not_sent'` only; for `'unknown'` the snapshot shows the truth), puts text, attachments, mentions and skill tags back when the message box is empty, sets `context.messageNotDelivered = certainty`, clears `submissionPending`, leaves the status alone, logs the detail with `console.warn`. A new send clears the notice (`beginLocalUserSubmission`, as it clears `collaboratorAddFailure`).
- **D-5 Team and Org classify their transport failures.** Team: `ensureTeamStreamConnected` timeout and a socket send failure → `'not_sent'`; a send drained at a loss (`TeamSendAdmissions.drain`) → `'unknown'`. Org: not ready (`requireReadyContext`) and a socket send failure → `'not_sent'`; a `SEND_MESSAGE` pending at a close (`rejectPending`) → `'unknown'`. Both stores return on `'returned_draft'` and drop their own draft restore for it; Team no longer sets the member's status to Error for it. Other failures keep today's path.
- **D-6 The notice.** `MessageNotDeliveredNotice.vue` beside `CollaboratorAddFailureNotice` in `AgentEventMonitor.vue` (desktop and phone), reading `activeWorkspaceTarget.context.messageNotDelivered`, with a dismiss button; texts (a)/(b) of REQ-004 under `agents.send.notDelivered.notSent` / `.unknown` (en, zh-CN).
- **D-7 Probes.** `stop-generation-probe.mjs` `holdTurn` and `mobile-stop-generation-cases.mjs` `holdTurn`: a send that does not start its turn fails the case at once (no second attempt); the stall record stays as evidence.

## Change Scope (Mandatory)

- In scope: UC-001…UC-004. Web: agent streaming readiness and send answers, the rebind holder, the shared failure owner and its notice, Team and Org failure classification, the peer route, localization, probes, tests, docs (`autobyteus-web/docs/agent_execution_architecture.md` send and readiness passages).
- Derived consumers:
  - `failLocalSubmission`'s three callers: adapted (return on `'returned_draft'`).
  - `sendMessage` callers: `agentRunStore.sendUserInputAndSubscribe` (awaits it), any other caller found by the typecheck (each awaits or handles the rejection).
  - `InterruptsAwaitingRebind` users (agent, Team, Org services): renamed use of the generalized holder, behavior unchanged.
  - `ensureAgentStreamConnected` callers other than send (search them): they get the stronger readiness, which is what a command needs.
  - Existing tests asserting the socket-level readiness or the raw failure segment for these cases: rewritten.
- Deliberately left alone: the node (gate, protocol, dedupe); rejected acks' presentation; `isAgentStreamReady` (a view question, not a send gate); the open-time placeholder (533 FU-002 → 542); Team stream recovery (FU-005 → 541).
- Follow-ups: FU-001 (`agentOrgContextsStore.ts` and `agentOrgStreamingService.ts` are 506 lines, over the limit before this change) in `follow-ups.md`.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior | REQ / AC | Trigger | Change | Spine |
| --- | --- | --- | --- | --- |
| BEH-001/002 | REQ-001; AC-001, AC-002 | Agent send on a just-opened stream | Wait for bound | DS-001 |
| BEH-003 | REQ-001, REQ-003; AC-001, AC-004 | Peer send | Wait for bound; not open → returned draft | DS-001, DS-003 |
| BEH-004 | REQ-003, REQ-004; AC-004 | Team/Org transport failure | Classified; shared presentation | DS-003 |
| BEH-005 | REQ-002; AC-003 | Agent send lost in flight | Held; decided after the rebind snapshot | DS-002 |
| BEH-006 | REQ-003; AC-004 | Agent stream not bound in 10 s | Returned draft, text (a) | DS-003 |
| BEH-007 | REQ-006; AC-007 | Protocol | Unchanged | — |

## Task Design Health Assessment (Mandatory)

- Change posture: `Bug Fix`.
- Current design issue found: `Yes`.
- Structural triggers:
  - *Behavior by absence* (13): "the stream is ready" is decided by the socket state instead of the node's explicit `CONNECTED`; a send's delivery is assumed because no answer is awaited. Response: D-1, D-2.
  - *Duplicated policy* (13): draft restoration after a failed send exists in Team and Org stores separately, and not in the agent store. Response: D-4 in the shared owner.
  - *Several kinds or forms* (1): six run kinds, three services; each traced (Current-State Read; spine re-walk).
  - *Capability-area reuse* (4): the 533 rebind holder and the existing notice place are reused.
  - *Empty indirection* (13): none added; `HeldUntilRebind` owns held work and its single settlement.
- Deviations: None.
- Root cause classification: `Missing Invariant` (a send leaves only on a ready stream and is known delivered or returned) plus `Duplicated Policy Or Coordination` (failure presentation per store).
- Refactor needed now: `Yes` (bounded): the generalized holder; the shared failure outcome replacing two store-local restores.
- Intentional deferrals: FU-001.

## Terminology

- **Bound**: the stream has received the node's `CONNECTED` on its current connection (the node's session for it exists).
- **Not delivered**: a send whose message the node does not have (`not_sent`) or may not have (`unknown`); class `MessageNotDeliveredError`.
- No glossary entry needed (UI/protocol words).

## Legacy Removal Policy (Mandatory)

- Removed: the socket poll in `ensureAgentStreamConnected`; the Team and Org store-local draft restores for transport failures; Team's status-to-Error for them; the probes' second send.
- Compatibility wrappers kept: `None`.

## Persisted Data / State Transition Decision

- `Not Affected`.

## Data-Flow Spine Inventory

| Spine | Scope | Behavior | Start | End | Owner | Why |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary | BEH-001…003 | Composer Send | `SEND_MESSAGE` on a bound stream; the node's ack | `AgentStreamingService` (readiness, answer) driven by the store's send | No send before the session |
| DS-002 | Return-Event | BEH-005 | Loss with a send waiting | Delivered or not delivered, after the rebind snapshot | `AgentStreamingService` + `HeldUntilRebind` | No silent loss in flight |
| DS-003 | Return-Event | BEH-003…006 | `MessageNotDeliveredError` from any route | Draft back + one notice | `failLocalSubmission` | One presentation |
| DS-004 | Bounded Local | — | Held send | settled once (snapshot check / final close) | `HeldUntilRebind` | Exactly-once settlement |

## Primary Execution Spine(s)

DS-001 (agent, delegated, peer):
`Composer Send -> activeContextStore.send -> agentRunStore.sendUserInputAndSubscribe (beginLocalUserSubmission) -> ensureAgentStreamConnected (connect; whenBound 10 s) -> AgentStreamingService.sendMessage (await ack) -> /ws/agent -> node gate (ready) -> session -> AGENT_COMMAND_ACK`
Peer: `delegatedRunsStore peer send -> peer service whenBound -> sendMessageAwaitingAdmission -> /ws/peer-run`.
Team / Org routes are unchanged up to their failures (DS-003).

## Spine Narratives (Mandatory)

| Spine | Narrative | Owner |
| --- | --- | --- |
| DS-001 | The store shows the message, finalizes attachments, then waits for the stream to be bound; only then does the message leave. The send resolves at the node's ack; the composer's pending state ends as today (ack/status). | `AgentStreamingService` |
| DS-002 | A loss while a send waits for its ack holds it. The reconnect (same service) brings `CONNECTED`, status and the snapshot; once the snapshot (stored part, queued input, replayed turn frames) is applied, each held send looks for its message id in the conversation: found → resolved (it shows, nothing else), missing → `not_sent`. A final close settles held and waiting sends `unknown`. | `AgentStreamingService`, `HeldUntilRebind` |
| DS-003 | Any route's `MessageNotDeliveredError` reaches `failLocalSubmission`, which returns the draft (if the box is empty), removes the shown message for `not_sent`, sets the notice, ends `submissionPending`, keeps the status. Stores return on `'returned_draft'`. | `failLocalSubmission` |

## Ownership Map

- `AgentStreamingService`: bound state, `whenBound`, send answers, holding sends across a reconnect and deciding them after the snapshot.
- `HeldUntilRebind` (generalized from `InterruptsAwaitingRebind`): holds callbacks and settles them once.
- `failLocalSubmission`: the user-visible outcome of a failed send for every kind.
- Stores: drive their send; translate nothing except returning on `'returned_draft'`.
- `TeamStreamingService` / `AgentOrgStreamingService`: classify their transport failures as `MessageNotDeliveredError`.
- `MessageNotDeliveredNotice.vue`: shows `context.messageNotDelivered`; dismiss clears it.

## Thin Entry Facades / Public Wrappers

| Facade | Owner Behind | Must Not Own |
| --- | --- | --- |
| `ensureAgentStreamConnected` | `AgentStreamingService.whenBound` | its own readiness rule |

## Removal / Decommission Plan (Mandatory)

| Item | Why | Replaced By |
| --- | --- | --- |
| Socket poll loop in `ensureAgentStreamConnected` (`agentRunStore.ts:320-332`) | Wrong readiness | `whenBound` |
| `InterruptsAwaitingRebind` name/shape (`interruptCommandAdmission.ts:59-79`) | Generalized | `HeldUntilRebind` (+ the Stop-specific `holdPending` as a function) |
| Team draft restore + `applyOfflineOrTerminalCleanup(…, Error)` for transport failures (`agentTeamRunStore.ts:347-351`) | Shared owner | D-4 (kept for other failures) |
| Org draft restore for transport failures (`agentOrgContextsStore.ts:349`) | Shared owner | D-4 (kept for other failures) |
| Probe second send (`stop-generation-probe.mjs:254-255`, `mobile-stop-generation-cases.mjs:126-127`) | Hides the defect | Fail at once |
| Measurement test `tests/e2e/agent-run/send-on-unbound-stream-repro.e2e.test.ts` | Scratch | Durable tests |

## Return Or Event Spine(s)

- DS-002: `retryable loss -> sends to HeldUntilRebind -> reconnect -> CONNECTED (bound) -> AGENT_STATUS -> AGENT_STREAM_SNAPSHOT applied -> each held send: id in conversation ? resolve : reject not_sent -> store -> failLocalSubmission (not_sent) | normal end`; `disconnect() / non-retryable loss -> held and waiting reject unknown`.
- DS-003: `MessageNotDeliveredError -> store catch -> failLocalSubmission 'returned_draft' -> notice + draft`.

## Bounded Local / Internal Spines

- Held send (`HeldUntilRebind` in `AgentStreamingService`): `waiting -> held (retryable loss) -> settled (snapshot check | final close)`; exactly once.
- Bound flag: `false -> true (CONNECTED) -> false (any loss/drop/disconnect)`.

## Off-Spine Concerns

| Concern | Serves | Responsibility |
| --- | --- | --- |
| `MessageNotDeliveredError` (`services/runSubmission/messageNotDelivered.ts`) | all routes, `failLocalSubmission` | The typed outcome |
| Localization (`localization/messages/{en,zh-CN}/agents.ts`) | notice | Texts (a), (b), dismiss label |

## Ownership Boundaries / Dependency Rules

- Streaming services throw/reject `MessageNotDeliveredError`; they never touch drafts or notices.
- `messageNotDelivered` is written only by `showMessageNotDelivered(context, certainty)` in `localUserSubmission.ts` (used by `failLocalSubmission` and the peer route) and cleared by a new send or the notice's dismiss; `failLocalSubmission` is the only owner of a returned draft.
- `runSubmission/messageNotDelivered.ts` imports nothing from stores; services import it.
- No process-wide binding added.

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Note |
| --- | --- | --- | --- |
| `AgentStreamingService.whenBound(timeoutMs)` | this stream | ready = bound | New |
| `AgentStreamingService.sendMessage(...): Promise<void>` | one message | resolves at the node's answer | Was `void` |
| `MessageNotDeliveredError(certainty, detail)` | one send | the outcome | New |
| `failLocalSubmission(handle, error): 'kept_draft' | 'returned_draft' | 'failed'` | one submission | presentation | Third outcome |
| `HeldUntilRebind.hold(settle)` / `.settle()` | held work of one service | once | Generalized |

## Main Domain Subject Naming Check

| Name | Natural | Consistent | Note |
| --- | --- | --- | --- |
| `whenBound`, bound | Yes | Matches the service's existing `{ kind: 'bound' }` event | — |
| `MessageNotDeliveredError`, `messageNotDelivered` | Yes | — | — |
| `HeldUntilRebind` | Yes | Replaces `InterruptsAwaitingRebind` | — |

## Existing Capability Reuse Check

| Need | Existing | Decision |
| --- | --- | --- |
| Readiness signal | `CONNECTED` handling (`bound` event) | Extend |
| Holding across reconnect | 533 holder | Extend (generalize) |
| Failure presentation | `failLocalSubmission`, the notice slot | Extend |

## Final File Responsibility Mapping

| File | Change | Concern |
| --- | --- | --- |
| `autobyteus-web/services/runSubmission/messageNotDelivered.ts` | Add | error type |
| `services/runSubmission/localUserSubmission.ts` | Modify | `'returned_draft'` outcome; `showMessageNotDelivered`; clear the notice on a new send |
| `types/agent/AgentContext.ts` | Modify | `messageNotDelivered: 'not_sent' | 'unknown' | null` |
| `components/agentInput/MessageNotDeliveredNotice.vue` | Add | notice |
| `components/workspace/agent/AgentEventMonitor.vue` | Modify | mount the notice |
| `services/agentStreaming/AgentStreamingService.ts` | Modify | bound, `whenBound`, send answers, held sends |
| `services/agentStreaming/interruptCommandAdmission.ts` → holder in `services/agentStreaming/heldUntilRebind.ts` | Modify/Add | generalized holder |
| `services/agentStreaming/TeamStreamingService.ts`, `teamSendAdmission.ts` | Modify | classify failures (`drain` → `unknown`) |
| `services/agentOrgExecution/agentOrgStreamingService.ts` | Modify | classify failures; **no net growth** (506 lines) |
| `stores/agentRunStore.ts` | Modify | `ensureAgentStreamConnected` via `whenBound` (timeout → `not_sent`); await the send |
| `stores/agentTeamRunStore.ts` | Modify | timeout → `not_sent`; return on `'returned_draft'` |
| `stores/agentOrgContextsStore.ts` | Modify | return on `'returned_draft'`; **no net growth** (506 lines) |
| `stores/delegatedRunsStore.ts` | Modify | peer send: `whenBound` first; on `MessageNotDeliveredError` show the notice with `showMessageNotDelivered(context, certainty)` (the peer route keeps its draft until success and shows no local message, so there is nothing to return) |
| `localization/messages/{en,zh-CN}/agents.ts` | Modify | texts |
| `tests/e2e/stop-generation-probe.mjs`, `tests/e2e/mobile-stop-generation-cases.mjs` | Modify | fail on a lost send |
| `autobyteus-server-ts/tests/e2e/agent-run/send-on-unbound-stream-repro.e2e.test.ts` | Remove | scratch |

## Concrete Examples / Shape Guidance

| Topic | Good | Avoided | Why |
| --- | --- | --- | --- |
| Readiness | `await service.whenBound(10_000)` then `await service.sendMessage(…)` | `while (service.connectionState !== CONNECTED) sleep(50)` | The socket is not the session |
| Lost in flight | after the snapshot: `conversation.messages.some(m => m.type === 'user' && m.messageId === id)` | resend with the same identity (forgotten after a node restart) or "not sent" at the drop (false when the node had it) | Truthful outcome |
| Presentation | `failLocalSubmission(handle, new MessageNotDeliveredError('not_sent', detail))` → draft + notice | a raw "Error Occurred" segment the next snapshot erases | Survives the snapshot; plain words |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Decision |
| --- | --- |
| Keep the socket poll as a fallback | Rejected |
| Keep Team's status-to-Error for transport failures | Rejected |

## Change / Refactor Sequence

1. Failing web unit tests first (investigation notes' reproduction): send before `CONNECTED`; send lost in flight (both branches); not-delivered presentation per kind.
2. `MessageNotDeliveredError`, `AgentContext.messageNotDelivered`, `failLocalSubmission` outcome, notice + localization.
3. `HeldUntilRebind` (generalize; 533 users renamed).
4. `AgentStreamingService` bound/whenBound/send answers/held sends; `ensureAgentStreamConnected`; agent store awaits the send.
5. Peer route; Team and Org classification and store returns.
6. Probes; real-stack cases (desktop probe: sends after Stops of an AGY run, 40+ rounds; after a forced reconnect; phone case); remove the measurement test; docs.

## Key Tradeoffs

- Awaiting the ack makes the store's send wait one round trip; the composer already shows the message at once, so the user sees no delay.
- Deciding lost sends after the snapshot keeps the composer pending through a reconnect (≥1 s); the truth is worth the wait.

## Risks

- R-1 (ASM-001): the native runtime's stored user message may lack the message id; implementation checks it (unit on the native memory path) before relying on D-3; if missing → Design Impact.
- R-2: an ack that never comes on an open, bound stream (node defect) leaves the send pending until a loss; no timer added (DESIGN.md: no speculative machinery).
- R-3: Org files over the line limit (FU-001).

## Guidance For Implementation

- Reproduction: `autobyteus-server-ts/tests/e2e/agent-run/send-on-unbound-stream-repro.e2e.test.ts` (node half; command in the investigation notes); write the failing web unit tests of step 1 first.
- Re-walk the spines for every run kind (spine validation file) before handing off; both typechecks; localization guards; line limits.
