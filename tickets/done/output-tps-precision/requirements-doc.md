# Requirements — TPS as precise as each runtime allows

## Document Status

- Status: Approved
- Current solution revision ID: SR-006 (requirements baseline R3. SR-006 only aligns the AC-004 and DEC-002 Codex wording with the approved REQ-003/SCN-002 intent; intended behavior is unchanged)
- Package identifier: output-tps-precision
- Request / ticket: Project Task `project_task_6e115ebc-5440-40f3-bc93-ac01fbf9cc94`, a follow-up to `token-meter-tps` (Task b91ece4e)
- Requested by: `/project_task_manager` (AgentRun `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`); the user's own card direction was given in this conversation on 2026-10-14
- Requirements owner: Solution Designer
- Date: 2026-10-14
- Approved by and reference: R3 is approved by the **User**: "I don't care about reload, for TPS … TPS is normally real time. Why do we care about reload then?" (conversation 2026-10-14), which removes reload support. Earlier: R2 was approved by the **User**. The user directed the ownership and persistence change in this conversation on 2026-10-14: TPS is data belonging to the agent run ("agent-run itself is the agent … status and TPS token usage … all belong to … this agent-run"); "it's better not to store it … because it's a runtime data"; "You can call it latest TPS"; "great the big direction is set now then you can continue". The other R1 decisions were approved by Solution Designer within the direction, user informed (SR-001).
- Exact approved requirements baseline / solution revision: R3 (this document as of SR-004)
- Behavior-defining supplements and their approved versions: None. Screenshots are current-state evidence. The user's card direction is captured in REQ-006 text.

## Problem And Desired Outcome

- Problem: The Token tab's Output TPS shows nothing for ordinary single-call turns. Example: native AutoByteus with DeepSeek Flash stays "Collecting". It is also not real TPS: it divides a later usage report's output by the time since the previous report, which includes tools, waits, prompt processing and reporting delays. The card is also cluttered with words the user does not care about.
- Affected actors or systems: the user watching any agent (standalone, Team/Org member, delegated copy); all five runtimes (`autobyteus`, `claude_agent_sdk`, `codex_app_server`, `antigravity_cli`, `grok_build`).
- Desired outcome: every completed model call of the selected agent yields a TPS reading measured with the most precise timing that runtime provides, including single-call turns. A small card shows the number, and a collapsed help explains exactly how that reading was measured.
- Observable definition of success: a single-call plain-text turn on each runtime shows a TPS value. The value corresponds to that call's output tokens over its measured duration under the method the help names. The card shows only "TPS", the value, the model and the help toggle.

## Relevant Current And Desired Behavior

| ID | Kind | Scenarios | Evidence-backed current behavior | Desired behavior | Preserved | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | SCN-001,002 | Card "Output TPS", "Selected agent only", value, "Estimated · Last reported", raw runtime·model, local timestamp, "N output tokens / S s", "How output TPS is estimated" | Card "TPS", value, the call's model, and (only when not generation speed) a short method qualifier. Details live in the collapsed help | Card placement in the Token tab; other meter sections | User screenshot; card source |
| BEH-002 | System | SCN-001,002,003 | TPS from pairs of consecutive usage reports in one turn; single-call turns give none; interval includes tools/waits/reporting delays | Each completed model call is measured by its own runtime timing; one call suffices | Usage, cost, context accounting values | `tokenUsageThroughput.ts`; Task screenshots; investigation |
| BEH-003 | System | SCN-004 | Exact selected run only; Team double dispatch and stale/duplicate reports do not change the reading | Same | Same | token-meter-tps verification |
| BEH-004 | System | SCN-005 | Browser session-local; nothing after reload/history | TPS is real-time: each model call's event on the agent run carries that call's TPS, and the card shows the newest one received for the selected run. Nothing is kept on the server or saved. After a page reload, or for history runs, the card shows "—" until the next model call | No persistence change | prior ticket; user 2026-10-14 |

## Stakeholders, Actors, And Outcomes

| Actor | Goal | Required outcome | Constraint |
| --- | --- | --- | --- |
| User | See how fast the selected agent's model generates | A trustworthy number per model call, with minimal words | No extra paid calls, no change to costs |
| Runtimes | Report usage per model call | Also report timing for that call | No change to runtime behavior/control |
| Downstream specialists | Implement and validate | Clear method per runtime, testable rules | Live checks where credentials allow |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| ID | Use case | Scenarios |
| --- | --- | --- |
| UC-001 | See TPS of the selected agent's latest model call, including single-call turns, on every runtime | SCN-001,002,003 |
| UC-002 | Understand what the shown number measures (help and docs) | SCN-001,003 |
| UC-003 | Inspect any selected run (host, Team/Org member, delegated copy) without mixing identities | SCN-004 |
| UC-004 | Read a minimal, uncluttered TPS card | SCN-001,005 |

### Out Of Scope

Time-to-first-token as a displayed metric. TPS history/charts or persistence. A unified, extensible agent-run data model for status, token usage, TPS and future statistics (user-acknowledged follow-up, 2026-10-14; a separate Task). TPS in Settings statistics or analytics. Team/aggregate TPS. Benchmarking or extra provider calls. Changes to token counting, cost, context or the accounting of reasoning tokens. Changes to runtime behavior or provider requests. Card layout changes outside the TPS card.

### Non-Goals

- Per-token live counters, or a value that moves between model calls.
- A value for a model call whose runtime gives no usable timing or count, or whose sample is too small (DEC-003).
- Proving that every provider's output count is exact. The count is the one the platform already accounts.

### Preserved Behavior Boundary

BEH-003/BEH-004 and REQ-004, REQ-005, REQ-008 / AC-005, AC-006, AC-009: exact-run attribution, de-duplication and session lifetime stay as delivered. All usage, cost, context and compaction values and runtime behavior stay unchanged.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved REQ/AC/BEH ID.
- New product behavior, persistence, policies or metrics are `Requirement Gap`s and need user approval.
- Adjacent concerns become non-blocking follow-ups.
- Reviewer comments do not amend R1.

## Requirements

| ID | Requirement | Behavior | Priority | Rationale | Source |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | Every completed model call of the selected run that has a usable output count and timing produces a TPS reading when its usage arrives. A turn with a single model call must produce a reading. The report-interval method (pairs of reports) is removed and is not used as a fallback | BEH-002 | Must | User: single-call turns must get a value; one method only | Task; DEC-004 |
| REQ-002 | TPS = that call's reported output tokens (the count the platform already accounts, reasoning included only as already inside output) ÷ the call's measured duration in seconds. The duration is measured by the runtime integration on one clock, never from report arrival intervals | BEH-002 | Must | Real per-call speed | Task; investigation |
| REQ-003 | Use the most precise method each call allows. **Generation speed** (first streamed response event of the call → end of the call) is used only when that first event provably precedes all of the call's token generation, including hidden reasoning. Otherwise use **end-to-end call speed** (call request → end of the call), preferring a provider-reported call duration when the runtime supplies one. Per-runtime defaults are in DEC-002. A call without usable timing produces no reading | BEH-002 | Must | Precise where possible, never inflated | Task; DEC-001/002 |
| REQ-004 | The reading belongs to the exact selected AgentRun and carries that call's reported model and method. Team/Org members and delegated copies show their own readings. Duplicate, stale or replayed usage reports never create or change a reading | BEH-003 | Must | Reuse earlier attribution learnings | Task; prior ticket |
| REQ-005 | **TPS is a real-time event of the agent run.** Each qualifying model call's event carries that call's TPS (method, output tokens, duration). The card shows the newest one received for the selected run and keeps it until a newer one arrives (no decay, no timer). Calls below the minimum sample (DEC-003) carry no TPS and do not replace the shown value. Nothing is held on the server or persisted for TPS. With no value received yet (including after a page reload, and for history runs) the card shows "—". Switching the selected run switches the card immediately | BEH-004 | Must | Real-time metric; run event per model call | User 2026-10-14; DEC-003, DEC-006 |
| REQ-006 | Simplified card (user direction): title **"TPS"**; the value with unit (e.g. "104.0 tokens/s"); one muted line with the call's model; and, only for an end-to-end reading, a short qualifier on that line meaning "includes time to first token". Remove "Selected agent only", the timestamp, "Estimated", "Last reported", the raw runtime id and the visible tokens/seconds line. With no reading, show "—" only. Keep one collapsed help toggle | BEH-001 | Must | User: no redundant words | User message 2026-10-14; DEC-005 |
| REQ-007 | The help ("How TPS is measured") explains the method of the reading shown in plain words and gives its numbers (output tokens and seconds). The docs list the method and its limits per runtime | BEH-001,002 | Must | Honest meaning | Task |
| REQ-008 | Usage, cost, context, compaction and analytics values, persisted data and runtime behavior stay unchanged. No extra provider calls. No polling or history scans for TPS | all | Must | Task constraints | Task |
| REQ-009 | Durable tests for method selection, arithmetic, minimum sample, attribution and de-duplication per runtime adapter and in the web card. Real runs per runtime where credentials allow, scripted evidence otherwise, with a per-runtime matrix stating which | all | Must | Task "Done when"; TESTING.md | Task |

## Acceptance Criteria

| ID | REQ | BEH / SCN | Trigger | Observable expected outcome | Alternate / failure | Verification intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001,002 | BEH-002 / SCN-001 | Single-call plain-text turn on native AutoByteus (DeepSeek Flash or a scripted native provider) | Card shows a value = output tokens ÷ measured duration of that call, right after the call's usage arrives | No "Collecting"/pairing state exists anywhere | Unit (native timing) + rendered card + live run where credentials allow |
| AC-002 | REQ-002,003 | BEH-002 / SCN-001,003 | Claude SDK call: `message_start` at t0, `message_delta` with 1,762 output at t0+16.94 s | Reading 104.0 tokens/s, method generation speed. Time spent awaiting the SDK context read after `message_delta` is excluded | Missing `message_start` gives no reading for that call | Unit with recorded frame timeline; live run |
| AC-003 | REQ-003 | BEH-002 / SCN-003 | A call whose reasoning tokens > 0 but whose first observed event came after hidden reasoning (native hidden reasoning, AGY thinking, Codex default) | Method is end-to-end. The value is never computed from first-output time | If request time is also unknown, no reading | Unit tables per adapter |
| AC-004 | REQ-003 | BEH-002 / SCN-003 | Grok call with burst-delivered chunks; AGY DONE step with `duration_seconds`; Codex call | Grok: server-observed request→`response_completed`, end-to-end. AGY: generation (first `text_delta`→DONE) when thinking = 0 and the sample qualifies, else provider `duration_seconds` end-to-end. Codex: end-to-end from the call's request boundary to the end of that call's response. This is not the arrival of its usage report, which can come only after a tool has run. Tool execution and approval waits are never inside the reading (SCN-002) | Codex may use generation speed only if validation records evidence per DEC-002 | Unit with recorded fixtures; live where credentials allow |
| AC-005 | REQ-004 | BEH-003 / SCN-004 | Host and Team member calls interleave; Team route delivers the same usage twice; stale/duplicate reports arrive | Each run shows only its own readings; duplicates/stale do not change the value; model shown is the call's reported model | — | Store/adapter regression |
| AC-006 | REQ-005 | BEH-004 / SCN-005 | Call A qualifies (120 tok/s); then a tool-only call with 12 output tokens; then idle; then a page reload; then the next qualifying call (90 tok/s) | Card shows 120 tok/s through the tiny call and idle. After the reload it shows "—"; after the next qualifying call it shows 90 tok/s. No TPS data is stored anywhere | Switching runs shows that run's newest received TPS or "—" immediately | Store + component + browser |
| AC-007 | REQ-006 | BEH-001 / SCN-001 | Any reading, en and zh-CN, narrow panel | Visible content only: "TPS" title, value+unit, model line (plus the end-to-end qualifier when applicable), help toggle. None of the removed items appear. No-reading state shows "—" only. No overflow; keyboard-accessible toggle | — | Component + browser screenshot |
| AC-008 | REQ-007 | BEH-001,002 / SCN-001 | Expand help for a generation reading and for an end-to-end reading | Help states the method in plain words and that reading's output tokens and seconds. Docs contain a per-runtime method table matching DEC-002 | — | Component + docs review |
| AC-009 | REQ-008 | all | Existing usage/cost/context flows with the change | Identical accounting values and persisted records; no new provider requests | — | Existing suites + diff review |
| AC-010 | REQ-009 | all | Delivery | Per-runtime matrix: live / scripted / not run, with reasons; commands and evidence retained | — | API/E2E + Delivery artifacts |

## Relevant Scenarios And Journeys

| ID | Kind | Actor | Goal | Trigger | Start | Steps | Outcome | Alternate | Validity | Evidence | REQ/AC |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | User | See how fast the agent generates | Selects an agent, opens Token tab, sends a message | Any runtime | Agent answers with one model call (plain text) | TPS value for that call | Runtime without usable timing: "—" | Supported Normal Scenario | Task screenshot (DeepSeek) | REQ-001,002,006,007 / AC-001,002,007,008 |
| SCN-002 | User | User | Watch a working agent | Agent performs multi-call tool turns | Running | Each completed call updates the value | Latest qualifying call shown; tool time never included | — | Supported Normal Scenario | Task screenshot (PTM) | REQ-001,003,005 / AC-002,006 |
| SCN-003 | System | Runtime | Report a model call | Call completes | — | Runtime integration captures timing, usage report carries it | Method chosen per REQ-003 | Hidden reasoning / burst delivery → end-to-end | Supported Normal Scenario | Investigation | REQ-002,003 / AC-002–004 |
| SCN-004 | User | User | Inspect another agent | Selects Team/Org member or delegated copy | Several agents running | Card follows the exact run | Own reading only | — | Supported Normal Scenario | prior ticket | REQ-004 / AC-005 |
| SCN-005 | User | User | Revisit later | Idle, page reload, or reopen history | — | — | Idle: the last received TPS stays. After reload or for history: "—" until the next model call | — | Supported Normal Scenario | User 2026-10-14 ("TPS is normally real time") | REQ-005 / AC-006 |

## UI, Interaction, And Experience Requirements

- Applicable: Yes
- Linked UI/UX supplement: N/A — not applicable (no Product Team request)
- Runnable UI reference / design repository / UI/UX spec: N/A — not applicable
- Product ticket record: N/A — not applicable
- Design repository revision: N/A — not applicable
- UI/UX user-confirmation reference: N/A — not applicable. The user's direction is text in REQ-006.
- Approved visual-reference baseline: N/A — not applicable. The existing Token Meter visual language is kept.
- Normative details: REQ-006. Suggested copy (implementation may polish wording within the meaning):
  - en: title "TPS"; unit "tokens/s"; end-to-end qualifier "incl. time to first token"; help toggle "How TPS is measured"; generation help "Output tokens of the latest model call ÷ time from its first streamed output to its end ({tokens} tokens in {seconds} s). Waiting for the first token and tool time are excluded."; end-to-end help "Output tokens of the latest model call ÷ time from sending the request to its end ({tokens} tokens in {seconds} s). Includes waiting for the first token, so it reads lower than pure generation speed."; a general line: "Updates after each model call. Very short calls are skipped. Not kept after reload."
  - zh-CN equivalents.
- Permitted variation: exact wording/typography, provided the visible content set equals REQ-006.
- Required states: reading (generation), reading (end-to-end), no reading ("—").
- Product decisions that need the user: none (DEC-005 records my choices within the user's direction).

## Quality And Non-Functional Requirements

| ID | REQ/AC | Area | Constraint | Conditions | Verification |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-008 / AC-009 | Performance | O(1) timing work per streamed event/call. No extra provider calls, polling or history reads | All runtimes | Diff review + tests |
| QR-002 | REQ-002 / AC-002 | Other (precision) | Durations come from one monotonic or same-process clock at event receipt, with millisecond resolution | All runtimes | Unit tests with injected clock |
| QR-003 | REQ-006 / AC-007 | Accessibility | Help toggle keyboard-accessible; value readable at narrow width; en + zh-CN | Web | Component/browser |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: No
- Must preserve: all token usage records, summaries, analytics.
- Acceptable loss: TPS is real-time only. Nothing is kept; after a page reload or for history runs the card shows "—" until the next model call (user decision 2026-10-14).
- Constraints: none.
- Unknowns: none.

## External Contracts And Dependencies

| Contract | Constraint | Evidence | Risk |
| --- | --- | --- | --- |
| Claude Code CLI `stream_event` frames (`message_start`, `message_delta`) | Main-loop only, as today | Probe 2026-10-14 | CLI framing change |
| Codex app-server notifications | Call end = `rawResponse/completed` (one per model call, carrying that call's usage); request boundary from turn start, the previous call end, item completion and approval replies | Source + live wire logs (SR-006) | RSK-002 |
| AGY `step_update` `duration_seconds`, `text_delta`, `thinking_tokens` | As recorded | Fixture | Version drift |
| Grok ACP `response_completed`; chunk burst delivery | As recorded | Fixture | Version drift |
| Shared stream DTO packages | Additive optional field only | Source | — |

## Supplemental Artifacts

| Path | Purpose | IDs | Status | Approval |
| --- | --- | --- | --- | --- |
| `/Users/normy/.autobyteus/server-data/projects/project_a1377344-25db-482a-97cc-ecfdb0fb495a/tasks/project_task_6e115ebc-5440-40f3-bc93-ac01fbf9cc94/context/ctx_67986568edfb__44.png` | Native single-call "Collecting" evidence | REQ-001 | Read | Evidence only |
| `/Users/normy/.autobyteus/server-data/projects/project_a1377344-25db-482a-97cc-ecfdb0fb495a/tasks/project_task_6e115ebc-5440-40f3-bc93-ac01fbf9cc94/context/ctx_0068877a59ba__45.png` | Claude report-interval reading evidence | REQ-002 | Read | Evidence only |
| `/private/tmp/claude-501/-Users-normy-autobyteus-org-autobyteus-workspace-superrepo/d2a738d7-e7dd-4032-ae63-9b0c53dd4513/images/1.png` | User's card screenshot with simplification request | REQ-006 | Read | Evidence only |

## Assumptions

| ID | Assumption | Why | Validation | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | The platform's per-call output count is the right numerator (reasoning inside output) | Consistent with accounting | Validation notes any runtime where this looks wrong (RSK-005) → follow-up | Open, non-blocking |
| ASM-002 | Claude `message_start` precedes all generation of its message (thinking included) | Generation-speed validity for Claude | Probe shows `message_start` 1 ms before the first content block, with thinking progress following. Live validation re-records | Supported by probe |

## Decisions

| ID | Question | Why it matters | Options / evidence | Reasoning and recommendation | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | Which quantity is "TPS"? | Honesty/precision | (a) report-interval (current); (b) generation speed; (c) end-to-end call speed | "Output speed" by convention means tokens per second once output starts. That is what users compare models by and what the user calls "real TPS". Use (b) wherever it is provably valid. Where it is not, use (c), which is exact but includes time to first token and is labelled as such. Drop (a), because it mixes tools and waits | Solution Designer | Decided |
| DEC-002 | Method per runtime | Precision per runtime | Investigation E-rows | **Native AutoByteus:** generation speed (first streamed chunk → final chunk) when the call's reasoning was streamed or the call reports 0 reasoning tokens; otherwise end-to-end (request → final chunk). **Claude Agent SDK:** generation speed (`message_start` → `message_delta`, frame receipt times, main loop only). **Codex:** end-to-end (call request boundary → the end of the call's response, `rawResponse/completed`), because hidden reasoning start is not proven observable. The later usage update supplies the counts and carries the reading; its arrival time is not the call end (SR-006). Upgrade to generation speed only if validation records that a Codex event provably marks the start of reasoning. **Antigravity:** generation speed (first `text_delta` → DONE) when `thinking_tokens` = 0; otherwise the provider-reported `duration_seconds` (end-to-end). **Grok:** end-to-end, server-observed (request boundary → `response_completed`), because chunks arrive in bursts. Other/future runtimes follow REQ-003's rule | Solution Designer | Decided |
| DEC-003 | Minimum sample | Tiny calls (tool-call-only, "OK") give noise | Fixture: AGY 4-token calls dominated by prompt time | A call produces a displayed reading only with ≥ 20 output tokens and a measured duration ≥ 0.25 s. Smaller calls leave the previous reading unchanged. This keeps the number meaningful without hiding normal calls | Solution Designer | Decided |
| DEC-004 | Keep the report-interval estimate as a fallback? | The Task allows a labelled estimate "only where nothing better exists" | Every runtime has at least end-to-end per-call timing | Something better exists everywhere, so remove the estimator entirely (one method per call, no dual paths) | Solution Designer | Decided |
| DEC-005 | What does the card show? | The user's direction asks what users really care about | User message | The user cares about the speed and which model it describes (agents can switch models, and Team members differ). Show "TPS", the value, and the model. Mark only the exceptional meaning (end-to-end) with a short qualifier, because generation speed is what "TPS" means by default. Everything else moves into the help or is dropped | Solution Designer within user direction | Decided |
| DEC-006 | Who owns TPS, is it kept, and per-call or aggregated? | Ownership, persistence and reload shape the architecture | User: the agent run is the fundamental unit, so TPS belongs to it; TPS is runtime data, so don't store it; TPS is real time, so reload support isn't needed. Holding run state on the server only served reload | TPS is a **per-model-call event of the agent run**: the run side decides each call's TPS and its event carries it. The UI shows the newest one. No server state, no persistence, no reload support. Show the latest call, not turn averages | User (ownership, persistence, no reload, name); Solution Designer (per-call vs aggregate) | Decided (user approved 2026-10-14) |

## Traceability

| REQ | UC | BEH | AC | SCN | Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-002 | AC-001 | SCN-001,002 | Task screenshot 44 |
| REQ-002 | UC-001 | BEH-002 | AC-001,002 | SCN-001,003 | Claude probe |
| REQ-003 | UC-001,002 | BEH-002 | AC-003,004 | SCN-003 | Fixtures |
| REQ-004 | UC-003 | BEH-003 | AC-005 | SCN-004 | Prior ticket |
| REQ-005 | UC-001,004 | BEH-004 | AC-006 | SCN-005 | Prior ticket |
| REQ-006 | UC-004 | BEH-001 | AC-007 | SCN-001 | User screenshot |
| REQ-007 | UC-002 | BEH-001,002 | AC-008 | SCN-001 | Task |
| REQ-008 | all | all | AC-009 | all | Task |
| REQ-009 | all | all | AC-010 | all | Task, TESTING.md |

## Architecture Phase Input

- Scenarios to map: SCN-001–005 across standalone, Team, Org and collaboration routes.
- Constraints: accounting identical; exact-run attribution; no persistence; no extra calls; one method per call.
- Deferred to architecture: where timing is captured per runtime; where each call's TPS is decided and how its event carries it; removal of the browser estimator.
- Facts to verify: Claude emission lag (context read); Codex call request boundary; AGY `duration_seconds` placement; Grok request boundary in ACP; strict DTO validation of an added field; persistence transformer ignoring timing.
- Risks: RSK-002 (Codex), RSK-005 (AGY thinking count).

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: Yes
- Desired and preserved behavior are explicit: Yes
- Scope and non-goals are clear: Yes
- Requirements and acceptance criteria are testable and traceable: Yes
- Applicable scenarios are covered with validity and evidence: Yes
- Product design and supplemental evidence is integrated consistently: N/A
- Applicable UI/UX approval and final visual-reference basis are recorded: N/A
- Material assumptions and decisions are visible, each decision with reasoning and recommendation: Yes
- Content ready for approval: Yes
- Remaining content blocker: None

### Approved Basis Ready For Design

- Approval recorded: Yes (R3: user, 2026-10-14; unchanged R1 decisions: Solution Designer within the direction, user informed)
- Exact requirements and supplement approval basis recorded: Yes (R3/SR-004; no supplements)
- Approved requirements package ready for architecture design: Yes
- Remaining blocker: None
