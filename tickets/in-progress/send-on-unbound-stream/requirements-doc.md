# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-003`
- Package identifier: `send-on-unbound-stream`
- Request / ticket: Project Task autobyteus-540 (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`), from autobyteus-533 FU-006 (urgent)
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`)
- Requirements owner: Solution Designer
- Date: 2026-11-18
- Approved by and reference: `Solution Designer within the direction (user informed)`; SR-001 and the message to the user in the Solution Designer's conversation of 2026-11-18.
- Exact approved requirements baseline: this document at SR-003 (SR-001 approved; SR-002 refines REQ-004's texts and how the notice clears; SR-003 (ARCH-REV-001 AR-001) makes REQ-002 say where the node's queued input comes from and answers "unknown" where the page cannot know; all within the same direction)
- Behavior-defining supplements: None

## Problem And Desired Outcome

- Problem: a message sent to an agent run whose stream has just opened can be lost without a word. The page sends when the socket opens, before the node has bound the session; the node refuses it (`SESSION_NOT_READY`); the snapshot that follows erases the shown message and the error; the draft was already cleared. Reproduced in 533's real stack (1 of 80 sends after a Stop) and at the node (a send at socket open to a just-stopped run: 15 of 16 refused). Root cause and measurements: `investigation-notes.md`.
- Desired outcome: a message the user sends is never lost silently. The page sends only on a ready stream, so the node takes it. If a send still cannot reach the node, the message comes back to the message box with one plain line saying it was not sent.
- Observable definition of success: a send right after a stream opens, after a Stop, after a reconnect, or as the first message of a new run starts its turn every time; a send that cannot be delivered always leaves the text in the box and a plain notice; no probe needs a second send.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Scenario | Current | Desired | Preserved | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | SCN-001 | Agent send leaves when the socket opens; refused before `CONNECTED`; erased; draft gone | The send leaves only after the node's `CONNECTED` for the current connection; it is taken | Message identity, attachments, mentions, skills, the optimistic display of the sent message | Reproduced |
| BEH-002 | User | SCN-001 | Delegated agent run: same | Same as BEH-001 | — | Read |
| BEH-003 | User | SCN-001 | Peer run: send throws if the socket is not open; console only | Waits for its stream like BEH-001; if it cannot, SCN-003 | — | Read |
| BEH-004 | User | SCN-001, SCN-003 | Team / Org: wait for a ready stream and for admission; failure: draft back, raw "Error Occurred" segment (Team also marks the member Error) | Wait unchanged; failure presented as SCN-003 (plain notice, draft back, the member's status unchanged) | Team/Org readiness and admission | Read |
| BEH-005 | User | SCN-002 | Agent send lost with the connection before the node answered: silent if the node never had it | After the stream is back: if the node has the message (stored conversation or queued input), it shows and nothing else happens; otherwise SCN-003 | — | Read |
| BEH-006 | User | SCN-003 | Agent stream not ready within 10 s: raw segment naming the run id; draft gone | SCN-003 | The 10 s wait | Read |
| BEH-007 | Contract | — | Run stream protocol: commands after `CONNECTED` (Team/Org: after the view snapshot) | Unchanged; the page follows it | The node's `SESSION_NOT_READY` gate | Code + FU-036 tests |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Scenarios |
| --- | --- | --- |
| UC-001 | Send to a run whose stream has just opened: the first message of a new run (incl. New chat), a message to a stopped or offline run (incl. after a Stop), a message during or right after a reconnect or page resume | SCN-001 |
| UC-002 | The connection is lost after the message left the page and before the node answered | SCN-002 |
| UC-003 | A send that cannot reach the node | SCN-003 |
| UC-004 | UC-001…003 for every run kind: standalone agent run, delegated agent run, peer (remote) run, Team member (own Team, delegated Team, a Team launch draft's first message), Org member (live, and a stopped Org's first message); desktop and phone | SCN-001…003 |

### Out Of Scope

- The node's `SESSION_NOT_READY` gate and the run stream protocol (kept; the page now follows it).
- A message the node takes and later rejects (`AGENT_COMMAND_ACK` rejected, e.g. the run does not accept input, a collaborator add failure): its existing presentation stays.
- Tool approvals and Stop (autobyteus-533).
- FU-005 (a Team stream that closes after a reconnect: autobyteus-541), FU-007 (run-open race: 542).

### Non-Goals

- No automatic resend of a message the user sees as not sent; the user sends again.
- No change to how long the page waits for a stream (10 s).

### Preserved Behavior Boundary

- BEH-007; the optimistic display of a sent message; message identity (message id, dedupe key); attachments' finalization; mention admission (held sends); Team and Org readiness and admission.

### Prerequisites

None.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the boundary is a non-blocking risk or a follow-up, unless it is a prerequisite.
- A downstream reviewer comment does not amend this requirements basis.

## Requirements

| Requirement ID | Requirement | Behavior IDs | Priority | Rationale | Feasibility Evidence | Source / Decision |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-001 | A message to an agent run (standalone, delegated, peer) leaves the page only after the node's `CONNECTED` on the current connection (the session is bound). Team and Org keep waiting for their ready view. | BEH-001…003, BEH-007 | Must | The protocol's readiness; removes the refusal at its source | Read: the gate refuses only while the session connects (`agent.ts:47-54`); the FU-036 integration test proves a command after `CONNECTED` reaches the session (`run-stream-not-ready.integration.test.ts:68`) | Task; DEC-001 |
| REQ-002 | When the connection is lost after an agent message left the page and before the node answered, then after the stream is back the page decides from what the node tells it on the new connection: its stored conversation, its live turn, and the run's queued input (a message the node holds until the running turn ends). The node has it → the message shows and nothing else happens. The node tells the page its queued input and the message is not there → REQ-003 with text (a). The node cannot tell the page its queued input (the run is not running at the reconnect, or the run is on another node) and the message is not in the conversation → REQ-003 with text (b). Never "not sent" for a message the node holds. | BEH-005 | Must | The same silent loss through a connection loss; a queued message (native, AGY, ACP runs queue input while a turn runs) must not be reported as not sent | Read: stored user messages carry the message id (server `runtime-memory-event-accumulator.ts:86-89`; native raw traces `autobyteus-ts raw-trace-item.ts:76-80`); queued entries carry it (`userMessageProjection.ts:112`); the node's current queued input is `AgentRun.getInputStateSnapshot()` (`agent-run.ts:478`) | DEC-002, DEC-006 |
| REQ-003 | A message that does not reach the node (the stream is not ready within the wait, the socket is not open, the node refuses it before the session, or REQ-002 finds it missing) is not lost: the sent message is removed from the conversation, the text, attachments, mentions and skill tags are back in the message box (unless the user has typed a new draft meanwhile), and one plain notice above the message box says it was not sent. For every run kind of UC-004, desktop and phone. The notice survives the conversation being replaced by a stream snapshot. | BEH-001…006 | Must | Founder-level direction in the Task: the draft comes back or a plain message says it was not sent | N/A | DEC-003, DEC-004 |
| REQ-004 | The notice is in plain words (en, zh-CN) and names no run id and no internal words (`SESSION_NOT_READY`, stream, session, socket). Two texts: (a) when the page knows the node does not have the message: "Your message was not sent: not connected to the node. It is back in the message box; send it again."; (b) when the connection was lost while sending and the page cannot tell (a Team or Org send lost in flight; an agent stream closed for good before the node answered; REQ-002's case where the node cannot tell its queued input): "The connection to the node was lost while sending. Your message is back in the message box; if it does not appear in the conversation, send it again." The notice goes away when the user sends again or dismisses it. A send that ends this way does not change the run's status. | BEH-004, BEH-006 | Must | Plain words (533 precedent); an honest text where delivery is unknown | N/A | DEC-003, DEC-005 |
| REQ-005 | Tests: the probes treat a lost send as a failure (no second send); unit tests for each run kind's wait and failure; a real-stack case that sends right after a Stop took an AGY run offline, and right after a stream reconnect, on desktop and on the phone bundle. | — | Must | Task | N/A | Task |
| REQ-006 | Preserved: BEH-007 and the preserved boundary above. | BEH-007 | Must | No regression | N/A | — |

## Acceptance Criteria

| AC ID | REQ | Scenario | Trigger | Expected Outcome | Alternate | Verification |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | SCN-001 | Agent stream socket open, `CONNECTED` not yet received; user sends | No `SEND_MESSAGE` leaves until `CONNECTED`; then exactly one; the turn starts | `CONNECTED` never comes within 10 s → AC-004 | Web unit (fake socket) for standalone, delegated, peer |
| AC-002 | REQ-001 | SCN-001 | Real stack: send right after a Stop took an AGY run offline (new stream), 40+ rounds; send right after a reconnect | Every send starts its turn; no `SESSION_NOT_READY` on the wire; no retry needed | — | Browser probe (desktop), phone case |
| AC-003 | REQ-002 | SCN-002 | Connection lost after `SEND_MESSAGE` left, before the ack; stream rebinds | Node has it (stored, in the live turn, or queued) → the message shows once, no notice, draft untouched; node reports its queued input and does not have it → AC-004 text (a); node cannot report queued input (run not active at the rebind; peer run) and the message is missing → AC-004 text (b) | A native, AGY or ACP run queued the message while Running and the ack and input state were lost: never text (a) | Web unit (each branch, incl. the queued case); server unit: the active run's snapshot carries its input state |
| AC-004 | REQ-003, REQ-004 | SCN-003 | Not ready in 10 s / socket not open / AC-003's missing branch → text (a); Team or Org send lost in flight, agent stream closed for good before the answer → text (b) | The sent message is gone from the conversation (text (a)); text, attachments, mentions, skills back in the box (a draft typed meanwhile is kept); one notice with the REQ-004 text; no run id or internal word; status unchanged; the notice clears on the next send or its dismiss button | — | Web unit for standalone, delegated, peer, Team member, Org member; localization guards |
| AC-005 | REQ-003 | SCN-003 | AC-004 then a stream snapshot replaces the conversation | The notice and the restored draft are still there | — | Web unit |
| AC-006 | REQ-005 | — | The probes | A lost send fails the case (no second attempt) | — | Probe code review + run |
| AC-007 | REQ-006 | — | Existing suites | Pass; FU-036 tests unchanged | — | Server/web suites |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor | Goal | Trigger | Starting Condition | Steps | Expected Outcome | Alternate | Validity | Evidence | REQ / AC |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | User | Send a message | Composer Send (desktop/phone) | The run's stream has just opened (new run, stopped/offline run, reconnect) | Type, Send | The node takes it; the turn starts | SCN-003 | Supported Normal Scenario | Reproduced (533 API-10; server measurement) | REQ-001; AC-001, AC-002 |
| SCN-002 | User / network | User | Same | Send while the connection drops | Message in flight | Send; drop; reconnect | The message shows if the node had it; else SCN-003 | — | Supported Normal Scenario (phone on a weak network; reconnect exists) | Read | REQ-002; AC-003 |
| SCN-003 | User | User | Same | Send that cannot be delivered | Node unreachable / not ready | Send | Draft back + one plain notice | Send again | Supported Normal Scenario | Read | REQ-003, REQ-004; AC-004, AC-005 |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes`. Product Design: N/A — not applicable (not requested; the Task sets the direction).
- Required states: the notice above the message box (the same place as today's collaborator-add notice), the restored draft, no error segment in the conversation for a not-sent message.
- Product decisions that need the user: None.

## Quality And Non-Functional Requirements

| ID | REQ / AC | Area | Constraint | Verification |
| --- | --- | --- | --- | --- |
| QR-001 | REQ-004 | Privacy / Operability | No run id or internal word in the notice | Unit on rendered text |
| QR-002 | REQ-001 | Performance | The wait adds no delay once `CONNECTED` is in (an already bound stream sends at once) | Unit |

## Data Continuity And Acceptable Loss

- Persisted data affected: `No`.

## External Contracts And Dependencies

| Contract | Constraint | Evidence | Risk |
| --- | --- | --- | --- |
| Run stream readiness (FU-036) | Unchanged | `agent.ts:40-80` + tests | — |
| Message identity on the node | In memory per node process | `agent-run-command-registry.ts:25-26` | REQ-002 decides from the node's stored/queued view, not from identity dedupe |

## Assumptions

| ID | Assumption | Why | Validation | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | Every runtime's stored user message keeps the message id the page sent | REQ-002 | Design reads each runtime's stored conversation path | To verify (design) |

## Decisions

| ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | Wait for `CONNECTED`, resend on `SESSION_NOT_READY`, or have the node buffer early messages? | Root cause 1 | The node's refusal is an established contract (FU-036) that every test client follows; a resend needs the refusal to name the message (it does not); buffering changes the contract | **Wait for `CONNECTED`** on the page: it follows the protocol, needs no node change, and Team/Org already work this way | Solution Designer | Decided |
| DEC-002 | Lost in flight: resend automatically or decide from the node's view? | Root cause 2 via a connection loss | Resend with the same identity is a no-op only while the node process lives (registry in memory) | **Decide from the node's own stored conversation / queued input after the rebind**: shows the truth, no duplicate turn after a node restart; if missing → REQ-003 | Solution Designer | Decided |
| DEC-003 | What the user sees when a message was not sent | Task asks for a decision | Raw error segment (today; erased by the snapshot) / toast / notice above the box | **Draft back + one plain notice above the message box** (survives snapshots; next to the text it concerns); no automatic resend; status unchanged | Solution Designer (within the Task's stated options) | Decided |
| DEC-006 | Where does the page learn the node's queued input after a reconnect? (ARCH-REV-001 AR-001) | The snapshot carries no queued input today; native/AGY/ACP queue input while a turn runs | (1) the node includes the run's input state in an active run's stream snapshot; (2) a new read; (3) always answer "unknown" when missing | **(1)** for this node's agent streams: it is the node's own fact, at the snapshot, in one place (`activeRunSnapshot`); a run that is not active, or a peer run (the relay reads another node's run through `RunAgentAccess`, which has no input state), carries none, and the page answers (b) there | Solution Designer | Decided |
| DEC-005 | One text or two? | A Team/Org send lost in flight may have reached the node (they have no post-rebind check) | One "not sent" text would be false when the node had it | **Two texts**: (a) known not sent, (b) unknown, telling the user to check the conversation; dismiss instead of clear-on-edit (no draft watching needed) | Solution Designer | Decided |
| DEC-004 | Apply the same presentation to Team and Org send failures? | Consistency across run kinds (lesson: every kind) | Today: raw segment, Team marks the member Error | **Yes**: one presentation for "not sent" on every kind | Solution Designer | Decided |

## Traceability

| REQ | UC | BEH | AC | SCN |
| --- | --- | --- | --- | --- |
| REQ-001 | UC-001, UC-004 | BEH-001…003, 007 | AC-001, AC-002 | SCN-001 |
| REQ-002 | UC-002 | BEH-005 | AC-003 | SCN-002 |
| REQ-003 | UC-003, UC-004 | BEH-001…006 | AC-004, AC-005 | SCN-003 |
| REQ-004 | UC-003 | BEH-004, 006 | AC-004 | SCN-003 |
| REQ-005 | — | — | AC-006, AC-002 | — |
| REQ-006 | — | BEH-007 | AC-007 | — |

## Architecture Phase Input

- Scenarios SCN-001…003 for every kind of UC-004.
- Constraints: the node unchanged; one readiness rule and one "not sent" owner across kinds; the notice outside the conversation.
- To verify: ASM-001 per runtime; where each kind's send waits and fails; the composer notice mechanism (`collaboratorAddFailure`).

## Readiness Check

- Content ready for approval: `Yes`. Approval recorded: `Yes` (Solution Designer within the direction; user informed). Ready for design: `Yes`.
