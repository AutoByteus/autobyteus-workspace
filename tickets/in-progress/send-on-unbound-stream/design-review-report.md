# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/send-on-unbound-stream/tickets/in-progress/send-on-unbound-stream/requirements-doc.md` (SR-002, Approved)
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/send-on-unbound-stream/tickets/in-progress/send-on-unbound-stream/investigation-notes.md`
- Upstream Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/send-on-unbound-stream/tickets/in-progress/send-on-unbound-stream/solution-revision-record.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/send-on-unbound-stream/tickets/in-progress/send-on-unbound-stream/design-spec.md` (SR-002)
- Supplemental Task Artifacts Reviewed: `evidence/spine-validation/sr-002-send-spines-by-run-kind.md`; `evidence/reproduction/server-window-*.json`; `follow-ups.md`; `handoff-architecture-design-complete.md`
- Relevant Solution Revision IDs: SR-001, SR-002
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/send-on-unbound-stream/tickets/in-progress/send-on-unbound-stream/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-001`
- Current Review Round: 1
- Trigger: Solution Designer's `Architecture Design Complete` (SR-002), 2026-11-18
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Current-State Evidence Basis: branch `codex/send-on-unbound-stream` at `8dc5a60205` (base `origin/personal` `914eb36577`). Opened: web `localUserSubmission.ts:1-180`, `agentStreamSnapshotApplication.ts:14-48`, `userMessageProjection.ts:1-170`, `agentInputStateHandler.ts:14-16`, `runProjectionConversation.ts:19,100,268-292`; server `agent-stream-snapshot.ts`, `agent-stream-connection.ts`, `agent-stream-sequence.ts:1-160`, `agent-stream-handler.ts:100-160`, `agent-run.ts:210-225,505-525`, `runtime-memory-event-accumulator.ts:80-91`, `agent-run-memory-recorder.ts:34,127-128`, `api/websocket/peer-run.ts`, `peer-run-stream-session.ts:43`; `autobyteus-ts` `raw-trace-item.ts:29,76-109`, `raw-trace-ingestion.ts:152-160`.

## Routing Classification Review

- Task size: `Medium`
- Architectural risk: `High`
- Classification rationale reviewed: web-only, about 12 source files within existing owners; changes the send contract for every run kind, adds lifecycle across reconnects, moves Team/Org draft restoration into the shared owner.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: None.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed` (the behavior map represents the approved basis; the target path for BEH-005 is incoherent with it: AR-001)
- Approved requirements / intended behavior understood: Yes. No message lost silently. An agent send waits for `CONNECTED`. A send lost in flight is decided from the node's own view. If the node has it (stored conversation **or queued input**), it shows and nothing else happens; otherwise the draft comes back with notice (a). Team/Org in-flight losses use notice (b). One presentation for every kind.
- Relevant existing behavior and evidence confirmed: Yes (root cause reproduced at the node; page half read and confirmed).
- Scope guardrail confirmed: Yes (node gate and protocol unchanged; rejected acks keep their presentation; Stop/tool approvals out).
- Every prospective blocking `Design Impact` finding is traceable: `Yes` (AR-001 → REQ-002, AC-003, REQ-004 (a)).
- Remaining material ambiguity: None.
- Statements about existing code the design relies on:
  - `ensureAgentStreamConnected` polls the socket state; `CONNECTED` already notifies `bound`; the snapshot replaces the conversation and keeps only messages marked `pendingInput` (`agentStreamSnapshotApplication.ts:39-41`, `userMessageProjection.ts:128-132`). True.
  - The page's optimistic message carries no `pendingInput` (`localUserSubmission.ts:72-80`), so the snapshot erases it unless the node's view has it. True; the check by message id is meaningful.
  - "After the new connection's `AGENT_STREAM_SNAPSHOT` has been applied (stored part, **queued input** and turn frames)" (D-3, DS-002): **false for queued input.** The agent snapshot is `{ stored, turn_frames, base_sequence, live_sequence_id }` (`agent-stream-snapshot.ts:13-18,25-37`). `turn_frames` holds only frames that carry a turn id (`agent-stream-sequence.ts:100-108`). `AGENT_INPUT_STATE` has none (`agent-run.ts:510-511`), so it is numbered but not buffered, and a new connection gets nothing for it (`agent-stream-connection.ts:17-40`). The stored part has a user message only once it was forwarded into a turn (`runtime-memory-event-accumulator.ts:80-90`, `forwardedAt`). Pending messages reach the page only through `AGENT_INPUT_STATE` frames (`agentInputStateHandler.ts:14-16` → `upsertPendingUserMessage`), and the snapshot keeps only those the page already had (`overlayPendingUserMessages`). See AR-001.
  - Cited `runProjectionConversation.ts:281` as the stored user message's id: that line is the `system_task_notification` message id. The real support: external runtimes `runtime-memory-event-accumulator.ts:86-89`; native `raw-trace-item.ts:76-80,106` (user traces write `message_id`), `raw-trace-ingestion.ts:152-160`. So ASM-001 is largely supported by code. Implementation still confirms native ingestion receives the id (R-1), as the design says.
  - `/ws/peer-run` sends `CONNECTED` at start (`peer-run-stream-session.ts:43`, `peer-run.ts:29`): true.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001/002 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-003 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-004 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-005 | User | Fail (queued-input branch of REQ-002) | Pass | Fail | Needs Correction | AR-001 |
| BEH-006 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-007 | Contract | Pass | Pass | Pass | Confirmed | — |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `evidence/reproduction/` | Pass | Pass | Pass | Pass | Pass | — |
| `sr-002-send-spines-by-run-kind.md` | Pass | Pass | Pass | Fail (row "Lost after sending, retryable": "held → after the snapshot: id present → shown" assumes queued input is in the snapshot) | Pass | Correct with AR-001 |
| `follow-ups.md` (FU-001) | Pass | Pass | Pass | Pass | Pass | — |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment present | Pass | Bug fix | — |
| Root cause explicit and evidence-backed | Pass | Missing invariant (socket ≠ session; delivery assumed) + duplicated failure presentation; reproduced/read | — |
| Refactor decision explicit | Pass | Yes, bounded | — |
| Supported by concrete sections | Pass | D-1…D-7, removal plan | — |

## Spine Inventory Verdict

| Spine ID | Scope | Readable? | Narrative Clear? | Facade Vs Owner? | Naming? | One Owner Per Node, In Order? | Off-Spine Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary | Pass | Pass | Pass (`ensureAgentStreamConnected` → `whenBound`) | Pass | Pass | Pass | Pass |
| DS-002 | Return-Event | Pass | Fail (decides from a view that lacks queued input) | Pass | Pass | Pass | Pass | Fail (AR-001) |
| DS-003 | Return-Event | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 | Bounded local | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Entry Point Clear? | Internals Stay Internal? | Bypass Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `AgentStreamingService` (bound, `whenBound`, send answers, held sends) | Pass | Pass | Pass | Pass | — |
| `failLocalSubmission` / `showMessageNotDelivered` | Pass | Pass | Pass | Pass | Only writers of the notice and returned draft |
| Team / Org services (classification only) | Pass | Pass | Pass | Pass | — |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner | Allowed Clear? | Forbidden Explicit? | Coherent? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Streaming services → `messageNotDelivered.ts` | Pass | Pass (never drafts/notices) | Pass | Pass | — |
| Stores → `failLocalSubmission` | Pass | Pass | Pass | Pass | — |

Principle 16: `Pass` (no binding added).

## Interface Boundary Verdict

| Interface | Subject Clear? | Singular? | Identity Explicit? | Generic Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `whenBound(timeoutMs)` | Pass | Pass | Pass | Low | Pass |
| `sendMessage(...): Promise<void>` | Pass | Pass | Pass | Low | Pass |
| `MessageNotDeliveredError(certainty, detail)` | Pass | Pass | Pass | Low | Pass |
| `failLocalSubmission(...): 'kept_draft' \| 'returned_draft' \| 'failed'` | Pass | Pass | Pass | Low | Pass |
| `HeldUntilRebind.hold/settle` | Pass | Pass | Pass | Low | Pass |

Empty indirection check: `Pass` (`HeldUntilRebind` owns settle-once for several services; generalized, not added).

## Existing Capability / Subsystem Reuse Verdict

| Need | Checked? | Decision Sound? | New Piece Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Readiness signal | Pass | Pass (`CONNECTED` / `bound`) | N/A | Pass | — |
| Holding across reconnect | Pass | Pass (533 holder generalized) | N/A | Pass | — |
| Failure presentation | Pass | Pass (`failLocalSubmission`, notice slot beside `CollaboratorAddFailureNotice`) | Pass | Pass | — |
| The node's view of a lost send | Fail | Fail (the rebind snapshot is not the node's whole view: queued input is missing) | N/A | Fail | AR-001 |

## Subsystem / Capability-Area Allocation Verdict

| Area | Allocation Clear? | Decision Sound? | Supports Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| web `services/agentStreaming/` | Pass | Pass | Pass | Pass | — |
| web `services/runSubmission/` | Pass | Pass | Pass | Pass | — |
| Team / Org services and stores | Pass | Pass | Pass | Pass | — |

All run kinds (standalone, delegated agent, peer, Team member incl. delegated and launch draft, Org member incl. stopped Org) are traced in the re-walk.

## Reusable Owned Structures Verdict

| Structure | Evaluated? | Shared File Sound? | Ownership Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `MessageNotDeliveredError` | Pass | Pass | Pass | Pass | — |
| `HeldUntilRebind` | Pass | Pass | Pass | Pass | — |

## Shared Structure / Data Model Tightness Verdict

| Structure | One Meaning Per Field? | Redundant Removed? | Overlap Controlled? | Core Vs Variant | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `MessageNotDeliveredError.certainty` | Pass | Pass | Pass | N/A | Pass | — |
| `AgentContext.messageNotDelivered` | Pass | Pass | Pass | N/A | Pass | — |

Derived consumers listed: `Pass`. Vocabulary: `Pass` ("bound" matches the existing `bound` event).

## File Responsibility Mapping Verdict

| File | Singular? | Matches Owner? | Re-Tightened? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Added and modified files of the Final File Responsibility Mapping | Pass | Pass | N/A | Pass | Org files must not grow (FU-001) |

## Subsystem / Folder / File Placement Verdict

| Path | Clear? | Folder Matches Owner? | Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `services/runSubmission/messageNotDelivered.ts`, `components/agentInput/MessageNotDeliveredNotice.vue`, `services/agentStreaming/heldUntilRebind.ts` | Pass | Pass | Low | Pass | — |

## Removal / Decommission Completeness Verdict

| Item | Named? | Replacement Clear? | Scope Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Socket poll; Team/Org local restores; Team status-to-Error; probes' second send; measurement test; `InterruptsAwaitingRebind` name | Pass | Pass | Pass | Pass | — |

## Legacy / Backward-Compatibility Verdict

| Area | Retention Exists? | Clean-Cut Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Socket readiness fallback; Team Error status | No | Pass | Pass | — |

## Persisted-Data Transition Verdict (When Applicable)

N/A — `Not Affected`; confirmed.

## Change / Refactor Safety Verdict

| Area | Realistic? | Seams Explicit? | Cleanup Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Tests first → types → holder → service → routes → probes/docs | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic | Needed? | Present? | Bad Shape? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Readiness, lost in flight, presentation | Yes | Pass | Pass | Pass | The "Lost in flight" example changes with AR-001 |

## Material Premise Validation (Only When Needed)

### `MP-001` — A message sent while the agent is running is queued by the node; the connection drops before its input state and ack reach the page

- Related approved requirement: REQ-002 ("if the node has the message (stored conversation **or queued input**) … shows it … Never both, never neither"); AC-003; REQ-004 (a) ("when the page knows the node does not have the message").
- Relevant behavior ID(s): BEH-005.
- Initiating basis kind: `User` (+ network event, SCN-002).
- Independent trigger: the user sends a follow-up message while the agent is Running on a runtime that cannot add input to a running turn: native, AGY, ACP (`inputCapabilities.activeTurnAppend: "unsupported"`, `autobyteus-agent-run-backend.ts:131`, `agy-agent-run-backend.ts:48`, `acp-agent-run-backend.ts:73`). The node keeps the message `queued` until the turn ends (`agent-run-input-admission-state.ts:157-185` returns no claim). Claude and Codex append it into the running turn instead (`:173-182`), so their message is in the turn's frames and is found. On a phone over a weak network (SCN-002, approved as a Supported Normal Scenario), the connection drops before the node's answer reaches the page.
- Forward path: Send → (D-1) bound → `SEND_MESSAGE` → node admits it as queued, publishes `AGENT_INPUT_STATE` (no turn id) and the ack → the socket drops before both reach the page → (D-3) held → reconnect → `CONNECTED`, `AGENT_STATUS`, `AGENT_STREAM_SNAPSHOT` = stored part (the message is not stored: it was not forwarded into a turn) + turn frames (no input-state frames) → the overlay keeps only `pendingInput` messages the page already had (none for this one) → the check by message id finds nothing → `not_sent` → message removed, draft back, notice (a) "not sent … send it again". The node then runs the queued message when the current turn ends. If the user sends again, there are two turns.
- Lifecycle consequence: the "Never both" rule of REQ-002 is broken. The page says "not sent" for a message the node will run, and the user is invited to duplicate it. A queued message can wait for the whole current turn, so a later frame does not rescue the decision, which is taken at the snapshot.
- Reachability: `Reachable` (each link cited above; the drop window is the ack's flight, which REQ-002 exists for).
- Review consequence: AR-001.

## Unresolved Approved-Behavior Or Current-State Gaps

None beyond AR-001.

## Review Decision

`Fail`

## Findings

### AR-001 — The "delivered?" check after the rebind cannot see queued input, so a queued message is reported "not sent"

- Type: Design Impact
- Severity: High (blocking)
- Protects: REQ-002 (queued input counts as "the node has it"; never both), AC-003, REQ-004 (a) (text (a) only when the page *knows* the node does not have it).
- Scope status: Within Approved Scope. Changes approved behavior: No, if fixed by giving the check the node's queued input. A fix that reports such a send with text (b) instead changes REQ-004's mapping and needs a requirements revision (see below).
- Affected behavior: BEH-005 / SCN-002 for agent, delegated agent and peer runs on native, AGY and ACP runtimes while a turn runs (the peer relays the peer node's agent stream: same snapshot shape). Claude/Codex append into the turn and are found.
- Concrete problem: D-3 and DS-002 decide a held send from the conversation after the rebind snapshot and say that snapshot includes queued input. It does not. The agent snapshot carries the stored part (messages forwarded into a turn) and the frames of unconfirmed turns. `AGENT_INPUT_STATE` frames have no turn and are not in the snapshot, and nothing sends the current input state on a new connection. So a message the node queued is missing at the check, is settled `not_sent`, and the user is told to send it again although the node will run it (MP-001).
- Evidence: MP-001; `agent-stream-snapshot.ts:13-37`; `agent-stream-sequence.ts:100-108`; `agent-run.ts:510-511`; `agent-stream-connection.ts:17-40`; `runtime-memory-event-accumulator.ts:80-90`; `agentStreamSnapshotApplication.ts:39-41`; `userMessageProjection.ts:128-132`; `agentInputStateHandler.ts:14-16`.
- Required update: the decision for a held send must read the node's current queued input as well as the stored part and turn frames, or must not claim "not sent" when it cannot. Say who supplies it and in what order: the snapshot (or its connection) delivers it, the service applies it, then each held send is checked. Proportionate options for the Solution Designer to choose from:
  1. The node includes the run's current input state on every new agent-stream connection (for example in the snapshot or right after it, before the page decides). This is a node change, so it fires the design's own escalation trigger. It is a small change, and it also makes a reconnected view show the queued message that the user's send created.
  2. The page reads the run's current input state through an existing read after the snapshot and before deciding. I found none for agent runs, so this would be a new read.
  3. When the id is missing, settle the send as `unknown` (text (b)), not `not_sent`. No node change, but this changes REQ-004 (a)/(b) mapping for agent streams, so it needs a requirements revision (Solution Designer's approval within the direction, as for SR-002).
  Whichever is chosen, correct D-3, DS-002, the "Lost in flight" example and the re-walk row. Add a unit case: a held send whose message the node queued while Running is not reported `not_sent`.
- Why proportionate: it fixes the one decision REQ-002 is about, using the node's own state; no timer or retry machinery.
- Recommended recipient: Solution Designer.

## Classification

`Design Impact` (AR-001).

## Recommended Recipient

Solution Designer (`/solution_designer`).

## Residual Risks

- R-1 / ASM-001: code supports it (native user raw traces write `message_id`, `raw-trace-item.ts:106`; external runtimes record it, `runtime-memory-event-accumulator.ts:86-89`). Implementation confirms that native ingestion passes the id (`raw-trace-ingestion.ts:152-160`), as the design says.
- Node restart between the drop and the rebind (R-001 in the notes): the overlay can carry a `pendingInput` message the page received before the drop although a restarted node lost it, so such a held send would be judged delivered. This is an operational edge, not a supported scenario. Fixing AR-001 with option 1 (the current input state replaces the overlaid one before the check) would remove it. Non-blocking.
- R-2 (no ack timer), R-3 / FU-001 (Org files over the line limit, must not grow): accepted.
- Citation to correct: `runProjectionConversation.ts:281` is the system task notification's id, not the stored user message's (evidence above).

## Latest Authoritative Result

- Review Decision: `Fail`
- Material-Premise Gate: `Pass` (MP-001 reachable; drives AR-001)
- Notes: everything else passes: readiness as bound (D-1), every agent send awaiting its answer (D-2), one "not delivered" owner and notice (D-4, D-6), Team/Org classification (D-5), probes (D-7), and the classification. Only the decision basis of D-3 needs correcting.
