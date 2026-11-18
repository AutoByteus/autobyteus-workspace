# Docs Sync Report — autobyteus-533 (interrupt-idempotent-stop)

## Scope

- Ticket: `interrupt-idempotent-stop` (Project Task `autobyteus-533`): a user's Stop that finds nothing to stop is accepted, and the composer's Stop shows "Stopping…" after the first press.
- Trigger: API-REV-001 `Pass` (94.6 %), test-code review CRR-003 `Pass`, source review CRR-002 `Pass`; routed to delivery by the Code Reviewer. `task_size` `Medium`, `architectural_risk` `High`, route `Code Review` (reviewed).
- Bootstrap base reference: `origin/personal` `bd2053ee51`.
- Integrated base reference used for docs sync: `origin/personal` `53b72018ad` (98 commits ahead of the bootstrap base), merged into the ticket branch as `ac410ad30b`.
- Post-integration verification reference: `DEL-01`…`DEL-03` in `evidence/delivery/` (both typechecks, the Stop-related server and web suites, the websocket integration file, a server rebuild and the real-stack desktop probe), all on `ac410ad30b` plus this report's docs edits. See the release/deployment report, "Initial Delivery Integration Refresh".

## Why Docs Were Updated

- Summary: the ack meaning of `INTERRUPT_GENERATION` changed on five streams (a Stop with nothing to stop is `accepted`), and the web's Stop moved from per-service toasts to one owner (`runInterrupt`) with a "Stopping…" state and a held Stop across a reconnect. Four passages that the implementation did not touch still described the old behavior (a toast from the streaming service for `rejected`/`failed`, "accepted only clears pending correlation", "missing/inactive targets are result arms"). Delivery corrected them against the final code.
- Why this should live in long-lived project docs: the protocol doc and the web architecture doc are what the next change to a stream, a backend's `interrupt` or the composer reads first; a stale statement (such as "the streaming service shows the toast") would lead a later change to put presentation back into the services and so bring back the duplicate toasts this ticket removed.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `DESIGN.md` | Project design rules; the ticket changes ack semantics, one presentation owner, a client-side pending state | No change | No rule changes. The ticket applies existing rules (one owner for a policy; the node answers for the run). The design lesson is a design case (below), not a rule |
| `TESTING.md` | Test commands and rules; the ticket adds a probe (`test:e2e:stop-generation`) and changes the phone probe | No change | It names browser probes by the generic form `test:e2e:<name>` and keeps no list. The base's own `TESTING.md` change (file-watching wording, from another ticket) came in with the merge. One proposed rule refinement is in the release/deployment report ("Proposed guide fixes") and in `follow-ups.md` FU-008 |
| `RELEASE.md` | Finalization and release rules | No change | The ticket changes no release step. Read from the merged tree (`origin/personal` copy), not the main checkout |
| `AGENTS.md` | Pointers to the three documents | No change | |
| `docs/design-cases.md` | The design case this ticket's review found (ARCH-REV-001 AR-001) | Updated in the ticket (kept) | One bullet added to Case 5 by the Solution Designer; the merge conflict with the base's own new bullet (autobyteus-492) was resolved by keeping both |
| `autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md` | The wire contract of the five streams | Updated in the ticket (kept) | New section "A user's Stop with nothing to stop is accepted"; the Org stream's stopped-run sentence now says an interrupt is `accepted`, a tool approval is refused. Checked against `user-interrupt-outcome.ts`, the five handlers and the backends: matches |
| `autobyteus-web/docs/agent_execution_architecture.md` | Stop dispatch, pending state, reconnect behavior | Updated in the ticket, plus two passages corrected by delivery | See "Docs Updated" |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | States what `INTERRUPT_GENERATION` answers | Updated by delivery | Paragraph said missing/inactive targets are result arms and accepted means only runtime admission |
| `autobyteus-web/docs/agent_integration_minimal_bridge.md` | States who presents a Stop result | Updated by delivery | Said the streaming service produces the toast |
| `autobyteus-server-ts/docs/modules/agent_team_execution.md`, `agent_streaming.md`, `agent_orgs.md` | Name `INTERRUPT_GENERATION` and its addressing | No change | They describe the command's fields and addressing (`agent_run_id`, `INVALID_TARGET`), which did not change |
| `autobyteus-ts/docs/agent_runtime_loop_and_interrupt.md` | States `interrupt(...)` returns `no_active_turn` | No change | The native runtime's own result is unchanged; only the server backend maps it (the protocol doc says so) |
| `autobyteus-web/docs/settings.md` ("Stopping…" on an Org's stop icon) | Same word, different feature | No change | That is the run list's terminate action ("Terminating…"; Org "Stopping…"), not the composer's Stop |
| `autobyteus-web/docs/chat.md`, `GLOSSARY.md` | Composer behavior and terms | No change | `chat.md` describes the Send rule (`hasSendableDraft`), unchanged; the glossary has no Stop term |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md` | Contract (by the ticket) | A Stop with nothing to stop is `accepted` on all five streams, by one rule (`userInterruptOutcome`); `AgentRun.interrupt()` keeps `NO_ACTIVE_TURN` for internal callers; malformed/non-member stays `rejected` | New durable wire contract |
| `autobyteus-web/docs/agent_execution_architecture.md` | Architecture (by the ticket, then two edits by delivery) | The "Interrupt dispatch" section: `runInterrupt` owns what the user sees, `InterruptOutcome`, `InterruptsAwaitingRebind`, when Stopping ends. Delivery: the Team `interruptFocusedMemberGeneration()` bullet and the `AGENT_COMMAND_ACK` row now say the service settles the Stop and `runInterrupt` alone presents it | The two passages still said the service raises the toast |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | Behavior (by delivery) | `INTERRUPT_GENERATION` paragraph: nothing to stop is `accepted`; malformed or non-member stays `rejected`; a runtime failure is `failed`; link to the protocol doc | It said missing/inactive targets are result arms and accepted means only runtime admission |
| `autobyteus-web/docs/agent_integration_minimal_bridge.md` | Behavior (by delivery) | Team streaming service bullet: each Stop settles as an `InterruptOutcome`, `runInterrupt` owns "Stopping…" and the one message; the stop-affordance bullet adds the `interruptPending` "Stopping…" state | It said `rejected`/`failed` and local failures produce the toast in the service |
| `docs/design-cases.md` | Design case (by the ticket; conflict resolved by delivery) | Case 5 bullet: the design assumed "a rebind drains pending commands" while the code drains at the drop | Lesson for future designs of the same shape |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Stop is idempotent on the node | One rule (`userInterruptOutcome`) turns `NO_ACTIVE_TURN` and `RUN_NOT_ACTIVE` into `accepted` at the five user command boundaries; the domain result is not changed | `design-spec.md` D-S1…D-S3 | `agent_websocket_streaming_protocol.md` |
| One owner of Stop presentation in the web | `runInterrupt` shows nothing for `accepted` / `connection_lost`, one plain message for `not_sent` / `refused`; the services settle and present nothing | `design-spec.md` D-W1…D-W7 | `agent_execution_architecture.md`, `agent_integration_minimal_bridge.md` |
| A Stop held across a reconnect | `InterruptsAwaitingRebind` holds a Stop lost with a recovering connection and settles it after the rebind's status; a final close settles at once | `design-spec.md` D-W7; ARCH-REV-001 AR-001 | `agent_execution_architecture.md`, `docs/design-cases.md` |
| A Stop with a stale status | Stopping ends with the run's status, with no timer (R-3, R-4 by design) | requirements DEC-003…DEC-005 | `agent_execution_architecture.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Streaming services' per-result toasts (`interruptCommandAdmission` failure callbacks, `agents.store.interrupt.*` keys) | `runInterrupt` + `InterruptOutcome` (`agents.interrupt.notSent`, `agents.interrupt.failed`) | `agent_execution_architecture.md` (Interrupt dispatch) |
| `teamRunCommandPresentation.ts` (presenters) | `teamRunCommandIds.ts` (id builders only) | `agent_execution_architecture.md` |
| `tests/e2e/interrupt-twice-repro-scratch.mjs`, the server `interrupt-twice-repro` scratch | `stop-generation-probe.mjs` (+ `mobile-stop-generation-cases.mjs`, MSP-75…79) and `stop-nothing-to-stop.e2e.test.ts` | the ticket's execution report; `TESTING.md` needs no entry (it names probes generically) |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary, release notes, verification record, archive, finalization on `personal`.
- Notes: docs match the integrated code. No documentation was left to a follow-up.
