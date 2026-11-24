# Docs Sync Report — autobyteus-628 (conversation-order-628)

## Scope

- Ticket: `conversation-order-628`: the conversation keeps its own order whatever the viewer's clock (D-1); after a reload a platform notice sits right after the message it was delivered with (D-2); the node records every row's time, carried as `occurred_at` (and `accepted_at` for pending input) on all three streams, and the app only shows it (D-3, the user's rule); an external user message is stored at its admission time (SR-006); every other stored trace keeps its write time, as before the ticket (SR-007).
- Trigger: API-REV-002 `Pass` (95.1 %, round 2 on the merged tree), test-code review CRR-005 `Not Applicable` (no test-code change in round 2; CRR-003 `Pass` covered the tests); source review CRR-001 Fail (one Local Fix, CR-001), CRR-002 Pass after IR-002, CRR-004 `Pass` on IR-003. Architecture review ARCH-REV-001…ARCH-REV-004 (round 4 `Pass` on SR-007). `task_size` `Large`, `architectural_risk` `High`, route `Code Review` (reviewed).
- Bootstrap base reference: `origin/personal` `1f761bc8db`.
- Integrated base reference used for docs sync: `origin/personal` `2a8d5bf8c3` (round DR-002; 4 commits after DR-001's `e5d878832b`: the beta.10 release's version bump and its tickets), merged as `061498f684`. DR-001's merge of `e5d878832b` is `54cee15c8e`.
- Post-integration verification reference: `evidence/delivery/` on the merged tree (round DR-001's DEL-01…DEL-05 and DEL-BLOCK, round DR-002's `dr-002/`); the release/deployment report lists it. Round DR-001 was blocked on two findings; both are fixed (SR-007, IR-003) and DR-002 verifies them. The docs below describe the ticket's final behavior.

## Why Docs Were Updated

- Summary: the ticket changed what every stream carries (`occurred_at`, `accepted_at`), where an event gets its time (one stamp in `AgentRun`), how an external runtime's user trace is stored (at admission time) and how a reload orders a platform notice. It updated only `docs/design-cases.md`. No server doc named the new fields, and the web architecture doc described the notice row but not that the feed keeps the conversation's order and takes every time from the node.
- Why this should live in long-lived project docs: "a row's time is the node's, and a client stamps nothing" is a rule a later change to any handler, mapper or producer must keep; without it the next handler to default a time to `new Date()` brings the phone-clock-behind bug back, and a new timed message type without `occurred_at` would be refused at the parser with no hint why.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `DESIGN.md` | Project design rules; rule 9 (no compatibility between versions) applies to a required wire field | No change | The ticket applies existing rules (one owner for a derived fact: the time is stamped once in `AgentRun`; rule 9: a clean cut) |
| `TESTING.md` | Test layers; "Other packages ... contracts: `pnpm -C <package> test`" | No change | Its rule already covers the contract packages' own suites, which DR-001's Finding 1 concerned (the suites had not been run); they now pass and delivery reran them |
| `RELEASE.md` | Finalization and release rules | No change | Read from the merged tree (`2a8d5bf8c3`); unchanged by the ticket |
| `docs/design-cases.md` | Design cases | Updated in the ticket (kept) | The ticket's case bullet; the base's own additions came with the merge |
| `autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md` | The wire contract | Updated by delivery | New section "Row Times" |
| `autobyteus-server-ts/docs/modules/agent_streaming.md` | The stream mappers | Updated by delivery | A paragraph pointing at Row Times |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | `AgentRun`'s delivery and input admission | Updated by delivery (DR-001; corrected in DR-002 for SR-007) | New section "The Node's Time Of An Event" |
| `autobyteus-server-ts/docs/modules/run_history.md` | The replay builder | Updated by delivery | The notice-after-its-input rule |
| `autobyteus-web/docs/agent_execution_architecture.md` | The feed's order and row times | Updated by delivery | A bullet next to "A notice is its own conversation row" |
| `autobyteus-web/docs/remote_access.md`, `chat.md`, other web docs | The phone's conversation | No change | They describe screens and flows, not row order or times |
| `autobyteus-server-ts/docs/modules/agent_team_execution.md`, `agent_orgs.md`, `agent_work_journal.md` | Team and Org messages | No change | The per-type payload schemas are shared; `occurred_at` is documented once in Row Times |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md` | Contract | "Row Times": `occurred_at` (ISO 8601 UTC, `serverTimeSchema`) is required on the messages a client turns into a row (the segment, tool-lifecycle and `TOOL_LOG`, notice, inter-agent, `ERROR` and `COMPACTION_STATUS` types), on `/ws/agent` (also the snapshot's `turn_frames`), `/ws/agent-team` and the Org and collaboration streams; `accepted_at` on each `AGENT_INPUT_STATE` entry; `MEMBER_INPUT_MESSAGE` keeps `received_at`; one stamp in `AgentRun` (`stampForDelivery`); a client refuses a timed message without it and stamps nothing; a peer run's times are its own node's; a clean cut across versions | New wire contract |
| `autobyteus-server-ts/docs/modules/agent_streaming.md` | Contract | The mappers format the node's time, set once by `AgentRun`; link to Row Times | |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | Behavior | `AgentRunEvent.occurredAt`, `stampForDelivery` in `deliverToListeners`, `serverTimeOf`/`serverTimeMsOf` (throw for a timed event without a time); **the recorder does not read `occurredAt` (SR-007)**: a stored trace keeps its payload time or its write time (`extractTimestamp`, the writer's `toTimestampSeconds`), so a live row's time and a reloaded row's time can differ by a few ms while the order is the same; admission time (`acceptedAt`) is earlier than the notice's delivery, and an external user trace is stored at it (SR-006), the only stored trace that takes an admission time | New behavior; DR-002 replaced DR-001's draft sentence that said the recorder uses the event's time as every trace's `ts` |
| `autobyteus-server-ts/docs/modules/run_history.md` | Behavior | A preface notice reads back right after its input: (a) an external runtime's user trace whose `ts` is not later than the notice's, (b) both written by the native input processor; any other notice keeps its stored place; stored traces unchanged | D-2 |
| `autobyteus-web/docs/agent_execution_architecture.md` | Behavior | The feed keeps the conversation array's order and never sorts messages by time; a compaction row is placed by time; every row time is the node's (`occurred_at`, `accepted_at`, `received_at`, the stored `ts`); an own send has `timestamp: null` until confirmed; `updatedAt` derives from row times; the run list's "last activity" time still reads the viewer's clock (FU-004) | D-1, D-3 |

All statements were checked against the code at the merged state: `TIMED_MESSAGE_TYPES` in `agent-run-event-message-mapper.ts`, `stampForDelivery`, `serverTimeOf` and `serverTimeMsOf` in `agent-run-event.ts`, `serverTimeSchema` and the `accepted_at` field in the contracts package, `createErrorMessage`'s own stamp, `orderPrefaceNoticesAfterTheirInput` and `isPrefaceOfInput`, the follow-up FU-004's text, and for DR-002: `extractTimestamp` in `runtime-memory-event-payload.ts` (its comment names SR-007), `recordForwardedUserMessage`'s `payload.acceptedAt` in `runtime-memory-event-accumulator.ts`, and `toTimestampSeconds` in `external-runtime-memory-writer.ts` (`Date.now() / 1000` when no time is given). `git diff e5d878832b HEAD -- autobyteus-server-ts/src/agent-memory` shows only the SR-006 line, an `extractTimestamp` comment and nothing else: the recorder otherwise equals the base.

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
| Nothing: D-3 first replaced the recorder's `extractTimestamp(payload)` (write time when the payload had none) with `extractEventTime(event)`, and SR-007 took that replacement back (DR-001 Finding 2) | The recorder's `extractTimestamp` is unchanged; `extractEventTime` no longer exists | `agent_execution.md` ("The Node's Time Of An Event") |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

Not used: docs changed (above).

## Delivery Continuation

- Result: `Pass` (round DR-002; round DR-001 had written the docs and blocked on the findings below).
- Next delivery action: handoff summary, release notes, archive, finalization.
- Notes: DR-001's Finding 2 changed one fact the docs state, the stored trace `ts`. DR-002 corrected the two sentences in `agent_execution.md` to SR-007 (above). No other doc named the recorder's time: `run_history.md` says an external user trace is stored at the admission time (still true), and Row Times says nothing about stored traces.
