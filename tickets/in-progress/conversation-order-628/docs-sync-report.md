# Docs Sync Report — autobyteus-628 (conversation-order-628)

## Scope

- Ticket: `conversation-order-628`: the conversation keeps its own order whatever the viewer's clock (D-1); after a reload a platform notice sits right after the message it was delivered with (D-2); the node records every row's time, carried as `occurred_at` (and `accepted_at` for pending input) on all three streams, and the app only shows it (D-3, the user's rule); an external user message is stored at its admission time (SR-006).
- Trigger: API-REV-001 `Pass` (95.1 %), test-code review CRR-003 `Pass`; source review CRR-001 Fail (one Local Fix, CR-001), CRR-002 Pass after IR-002. `task_size` `Large`, `architectural_risk` `High`, route `Code Review` (reviewed).
- Bootstrap base reference: `origin/personal` `1f761bc8db`.
- Integrated base reference used for docs sync: `origin/personal` `e5d878832b` (35 commits), merged as `54cee15c8e`.
- Post-integration verification reference: `evidence/delivery/` on the merged tree; the release/deployment report lists it. **Delivery is blocked on two findings from that verification** (release/deployment report, "Escalation / Reroute"); the docs below describe the ticket's intended behavior, which the blockers do not change except where the report says.

## Why Docs Were Updated

- Summary: the ticket changed what every stream carries (`occurred_at`, `accepted_at`), where an event gets its time (one stamp in `AgentRun`), how an external runtime's user trace is stored (at admission time) and how a reload orders a platform notice. It updated only `docs/design-cases.md`. No server doc named the new fields, and the web architecture doc described the notice row but not that the feed keeps the conversation's order and takes every time from the node.
- Why this should live in long-lived project docs: "a row's time is the node's, and a client stamps nothing" is a rule a later change to any handler, mapper or producer must keep; without it the next handler to default a time to `new Date()` brings the phone-clock-behind bug back, and a new timed message type without `occurred_at` would be refused at the parser with no hint why.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `DESIGN.md` | Project design rules; rule 9 (no compatibility between versions) applies to a required wire field | No change | The ticket applies existing rules (one owner for a derived fact: the time is stamped once in `AgentRun`; rule 9: a clean cut) |
| `TESTING.md` | Test layers; "Other packages ... contracts: `pnpm -C <package> test`" | No change | Its rule already covers the contract packages' own suites, which the blocking finding concerns (the suites were not run) |
| `RELEASE.md` | Finalization and release rules | No change | Read from the merged tree; unchanged by the ticket |
| `docs/design-cases.md` | Design cases | Updated in the ticket (kept) | The ticket's case bullet; the base's own additions came with the merge |
| `autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md` | The wire contract | Updated by delivery | New section "Row Times" |
| `autobyteus-server-ts/docs/modules/agent_streaming.md` | The stream mappers | Updated by delivery | A paragraph pointing at Row Times |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | `AgentRun`'s delivery and input admission | Updated by delivery | New section "The Node's Time Of An Event" |
| `autobyteus-server-ts/docs/modules/run_history.md` | The replay builder | Updated by delivery | The notice-after-its-input rule |
| `autobyteus-web/docs/agent_execution_architecture.md` | The feed's order and row times | Updated by delivery | A bullet next to "A notice is its own conversation row" |
| `autobyteus-web/docs/remote_access.md`, `chat.md`, other web docs | The phone's conversation | No change | They describe screens and flows, not row order or times |
| `autobyteus-server-ts/docs/modules/agent_team_execution.md`, `agent_orgs.md`, `agent_work_journal.md` | Team and Org messages | No change | The per-type payload schemas are shared; `occurred_at` is documented once in Row Times |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md` | Contract | "Row Times": `occurred_at` (ISO 8601 UTC, `serverTimeSchema`) is required on the messages a client turns into a row (the segment, tool-lifecycle and `TOOL_LOG`, notice, inter-agent, `ERROR` and `COMPACTION_STATUS` types), on `/ws/agent` (also the snapshot's `turn_frames`), `/ws/agent-team` and the Org and collaboration streams; `accepted_at` on each `AGENT_INPUT_STATE` entry; `MEMBER_INPUT_MESSAGE` keeps `received_at`; one stamp in `AgentRun` (`stampForDelivery`); a client refuses a timed message without it and stamps nothing; a peer run's times are its own node's; a clean cut across versions | New wire contract |
| `autobyteus-server-ts/docs/modules/agent_streaming.md` | Contract | The mappers format the node's time, set once by `AgentRun`; link to Row Times | |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | Behavior | `AgentRunEvent.occurredAt`, `stampForDelivery` in `deliverToListeners`, `serverTimeOf`/`serverTimeMsOf` (throw for a timed event without a time), the recorder's use of it as the trace `ts`; admission time (`acceptedAt`) is earlier than the notice's delivery, and an external user trace is stored at it (SR-006) | New behavior |
| `autobyteus-server-ts/docs/modules/run_history.md` | Behavior | A preface notice reads back right after its input: (a) an external runtime's user trace whose `ts` is not later than the notice's, (b) both written by the native input processor; any other notice keeps its stored place; stored traces unchanged | D-2 |
| `autobyteus-web/docs/agent_execution_architecture.md` | Behavior | The feed keeps the conversation array's order and never sorts messages by time; a compaction row is placed by time; every row time is the node's (`occurred_at`, `accepted_at`, `received_at`, the stored `ts`); an own send has `timestamp: null` until confirmed; `updatedAt` derives from row times; the run list's "last activity" time still reads the viewer's clock (FU-004) | D-1, D-3 |

All statements were checked against the code at the merged state: `TIMED_MESSAGE_TYPES` in `agent-run-event-message-mapper.ts`, `stampForDelivery`, `serverTimeOf` and `serverTimeMsOf` in `agent-run-event.ts`, `extractEventTime`, `serverTimeSchema` and the `accepted_at` field in the contracts package, `createErrorMessage`'s own stamp, `orderPrefaceNoticesAfterTheirInput` and `isPrefaceOfInput`, and the follow-up FU-004's text.

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| The node's time, stamped once | `AgentRun` is the one stamping point; streams, mappers and the recorder only read it; a timed event without it fails loudly | `design-spec.md` D-3 | `agent_execution.md`, `agent_websocket_streaming_protocol.md` |
| A client stamps nothing | the web's parsers refuse a timed frame without `occurred_at`; an unconfirmed own send has no time | D-3, REQ-004 | `agent_execution_architecture.md`, Row Times |
| Reload order of a notice | the replay builder's two rules | D-2 | `run_history.md` |
| Admission time orders the external user trace before its notice | SR-006 | `design-spec.md` SR-006 | `agent_execution.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| The web's own clock on live rows (`new Date()` in the segment, tool, compaction and pending-input handlers, the own send, `updatedAt`) | the node's `occurred_at` / `accepted_at` / `received_at` | `agent_execution_architecture.md`, Row Times |
| `forwardedAt` as the external user trace's time | `acceptedAt` | `agent_execution.md` |
| The recorder's `extractTimestamp(payload)` (write time when the payload had none) | `extractEventTime(event)` | `agent_execution.md` (**the blocking finding concerns this change's effect on stored order**) |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

Not used: docs changed (above).

## Delivery Continuation

- Result: `Pass` for the docs; **delivery as a whole is `Blocked`** (release/deployment report).
- Next delivery action: resume after the blockers are resolved: re-integrate the base, rerun the failed suites, then handoff summary, release notes, archive, finalization.
- Notes: the docs state the ticket's intended behavior. If the fix for the stored-order finding changes what the recorder stamps for a trace written from several events, the "trace `ts`" sentences in `agent_execution.md` change with it.
