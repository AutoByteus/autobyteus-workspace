# Docs Sync Report — autobyteus-540 (send-on-unbound-stream)

## Scope

- Ticket: `send-on-unbound-stream` (Project Task `autobyteus-540`): a message is never lost silently. Agent sends leave only after the node's `CONNECTED` and wait for the node's answer; a send lost with its connection is decided from the reconnect snapshot, which now carries `input_state`; a message that is not delivered comes back to the message box with one plain notice.
- Trigger: API-REV-001 `Pass` (95.3 %), test-code review CRR-002 `Pass`, source review CRR-001 `Pass`; routed to delivery by the Code Reviewer. `task_size` `Medium`, `architectural_risk` `High`, route `Code Review` (reviewed).
- Bootstrap base reference: `origin/personal` `914eb36577`.
- Integrated base reference used for docs sync: `origin/personal` `914eb36577` (unchanged: the branch was already current, see the release/deployment report).
- Post-integration verification reference: not needed (no new base commits); the validated code is the tested code (`f70d3cb968`, `49ed8967f0`, tests `41bba2c734`; nothing but documents changed after it).

## Why Docs Were Updated

- Summary: the ticket changed what a standalone, delegated or peer run's stream promises (commands only after `CONNECTED`, a per-send answer, a snapshot that carries `input_state`) and what the page does with a send that does not arrive (hold, decide from the snapshot, give the draft back with a notice). The ticket documented the web side. Delivery corrected one stale class name in it and added the server side's wire contract, which no document held.
- Why this should live in long-lived project docs: a later change to the snapshot or to a stream's readiness must know that a page decides "delivered / not sent / unknown" from `input_state`; a server change that dropped the field, or made it `null` for an active run, would turn "not sent" into "unknown" or, worse, let the page report a delivered message as lost, with no test failing.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `DESIGN.md` | Project design rules | No change | No rule changes: the ticket applies the existing rule that one owner decides a policy (`failLocalSubmission` presents every not-delivered send) |
| `TESTING.md` | Test commands and rules; the ticket adds `test:e2e:send-delivery` and `MSP-85…88` | No change | It names browser probes by the generic form `test:e2e:<name>` and keeps no list; no statement in it about a probe retrying a send. The ticket's own testing rule (a lost send fails a probe case, no second send) lives in the probe code. Same open question as autobyteus-533's FU-008 about the one added `package.json` script line (below) |
| `RELEASE.md` | Finalization and release rules | No change | Read from the branch, which equals `origin/personal` |
| `AGENTS.md` | Pointers | No change | |
| `docs/design-cases.md` | The design case the architecture review found (ARCH-REV-001 AR-001) | Updated in the ticket (kept) | One bullet added to Case 5: the design said the snapshot "includes queued input"; it did not |
| `autobyteus-web/docs/agent_execution_architecture.md` | Send path, not-delivered handling, Stop hold | Updated in the ticket, plus one correction by delivery | See "Docs Updated" |
| `autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md` | The wire contract of the streams | Updated by delivery | The ticket did not touch it; the Code Reviewer noted no server doc describes the snapshot's fields. The doc's "Connection And Restore" section describes the standalone connection, so the new field and the readiness rule belong there |
| `autobyteus-server-ts/docs/modules/agent_streaming.md`, `agent_execution.md` | Describe the streams and `SEND_MESSAGE` | No change | `SEND_MESSAGE` acceptance as admission, ordering and queueing are unchanged; they do not list snapshot fields |
| `autobyteus-web/docs/agent_integration_minimal_bridge.md` | Streaming service duties | No change | Describes Team streaming and Stop (updated by autobyteus-533); the agent send path is covered in the architecture doc. Nothing in it is contradicted |
| `autobyteus-web/docs/chat.md` | Composer behavior | No change | Describes the Send rule (`hasSendableDraft`), unchanged; the notice above the message box is described in the architecture doc |
| `autobyteus-ts` docs | Runtime queueing | No change | The runtime's input queueing is unchanged; the server reads it (`getInputStateSnapshot`) |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-web/docs/agent_execution_architecture.md` | Architecture (by the ticket) | `sendUserInputAndSubscribe()` waits for `ensureAgentStreamConnected` (the node's `CONNECTED`, 10 s); new passage "A message that does not reach the node": `whenBound`, the per-send `AGENT_COMMAND_ACK`, the held send decided from the snapshot's stored part, `input_state` and turn frames, `MessageNotDeliveredError`, `failLocalSubmission`, the notice and the draft | New durable behavior of the send path |
| `autobyteus-web/docs/agent_execution_architecture.md` | Correction (by delivery) | The Stop hold is called `HeldUntilRebind` (the class the ticket generalized from `InterruptsAwaitingRebind`; the Code Reviewer's note) | The name no longer exists in the code |
| `autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md` | Contract (by delivery) | "Connection And Restore": a standalone run's stream takes commands only after `CONNECTED` (`SESSION_NOT_READY` before it); its `AGENT_STREAM_SNAPSHOT` carries `input_state` (the active run's queued, forwarded and held input; `null` for a stopped run and a peer's relay); how a client decides a send lost with its answer | The snapshot's new field and its meaning were documented nowhere |
| `docs/design-cases.md` | Design case (by the ticket) | Case 5 bullet | Lesson for future designs: a claim about what a snapshot includes is a claim about code |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| A send leaves only on a bound stream | The run stream takes commands after `CONNECTED`; the page waits (`whenBound`, 10 s) and a send resolves at its `AGENT_COMMAND_ACK` | `design-spec.md` D-1, D-2 | `agent_execution_architecture.md`, `agent_websocket_streaming_protocol.md` |
| A send lost with its connection is decided from the rebind's snapshot | stored / live turn / `input_state` → delivered; missing with `input_state` → not sent; missing without → unknown | `design-spec.md` D-3, D-8; ARCH-REV-001 AR-001 | both docs above, `docs/design-cases.md` |
| One owner presents a not-delivered message | `failLocalSubmission` with `MessageNotDeliveredError`; draft back, one notice, status untouched | `design-spec.md` D-4…D-6 | `agent_execution_architecture.md` |
| Held work across a reconnect | `HeldUntilRebind` holds a Stop (settled after the rebind's status) or an agent send (after its snapshot) | `design-spec.md` D-3 | `agent_execution_architecture.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `InterruptsAwaitingRebind` | `HeldUntilRebind` (`services/agentStreaming/heldUntilRebind.ts`), shared by Stops and agent sends; `holdPendingInterrupts` moves a service's waiting Stops into it | `agent_execution_architecture.md` |
| The probes' one-time send retry (`holdTurn`) | A lost send fails the case at once | the probe code (`stop-generation-probe.mjs`, `mobile-stop-generation-cases.mjs`, `send-delivery-probe.mjs`); no long-lived doc described the retry |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary, release notes, verification record, archive, finalization on `personal`.
- Notes: docs match the code at the validated state. Nothing was left to a follow-up.
