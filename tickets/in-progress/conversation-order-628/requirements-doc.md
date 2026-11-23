# Requirements Document

## Document Status

- Status: `Approved` (SR-004: REQ-004 added and REQ-003 revised on the founder's direction)
- Current solution revision ID: SR-005
- Package identifier: `conversation-order-628`
- Request / ticket: autobyteus-628, Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), for the founder
- Requirements owner: Solution Designer
- Date: 2026-11-23
- Approved by and reference:
  - SR-001: Solution Designer within the direction (the Task: "if it is a bug, design, implement and prove the fix"); user informed 2026-11-23.
  - SR-004: **the user**, in conversation 2026-11-23: "the time itself … it's not like the client is recording a time, it's actually the server records a time … the client is only showing … one single source of truth" (and earlier: "it should be a consistent timing from the server, definitely from the server"). The user chose this ticket over a separate one by stating the rule after the question.
- Exact approved baseline: this document at SR-005 (SR-004's REQ-004 approved by the user; SR-005 aligns the text with it after ARCH-REV-001 AR-002)
- Behavior-defining supplements: none (`probes/` is evidence)

## Problem And Desired Outcome

- Problem: in a live conversation, the founder's own message showed below the agent's reply to it. This happens on a phone, or in any window, whose clock is behind the node's. The rows are sorted by timestamp, and live timestamps come from two clocks: the viewer's clock for the agent's output, and the node's for the user's message. A platform notice delivered with the message makes even a small difference visible.
- It is a current bug in the web's conversation window, not an old trace format. The stored traces are in order (investigation notes).
- Desired outcome: a conversation shows its rows in the order they happened, on the phone and the desktop, live and after a reload, whatever the viewer's clock.
- Observable definition of success: with the viewer's clock behind or ahead of the node's, the founder's sequence reads: the previous reply, You, the "Skill updated" notice, the reply, the same live and after a reload.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Scenarios | Current (evidence) | Desired | Preserved | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | SCN-001, SCN-002 | Live rows are sorted by timestamps from two clocks, so the user's message can show after the reply (Reproduced at a 1 s difference) | Order independent of any clock: the conversation's own order | The shown times; everything else in the rows | Notes: live path |
| BEH-002 | User | SCN-003 | Reload shows You → notice → reply only through a same-clock timestamp sort; by entry order the notice comes first | Reload and live show the same order: You → notice → reply | Stored traces unchanged | Notes: reload path |
| BEH-003 | User | SCN-004 | Compaction rows are placed among messages by timestamp (viewer `now` live) | Messages keep their own order; a compaction row is placed between messages by its time, and every one of these times is the server's (REQ-004), so its place is right | The compaction rows themselves | `recentEventMonitorWindow.ts:186-200`, `compactionActivityProjection.ts:214` |

## Stakeholders, Actors, And Outcomes

| Actor | Goal | Outcome | Constraint |
| --- | --- | --- | --- |
| The founder, on the phone and the desktop | Read a conversation in order | BEH-001…003 | No change to stored data |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Scenarios |
| --- | --- | --- |
| UC-001 | The conversation's rows in the order they happened, live, on phone and desktop | SCN-001, SCN-002, SCN-004 |
| UC-002 | The same order after a reload | SCN-003 |

### Out Of Scope

- Clocks of other nodes: a run's times are those of the node that runs it (a peer run's are the peer's).
- The earlier-events page (event monitor browse, its own node-ordered page).
- Stored traces and their order.
- Clock synchronization between devices.

### Non-Goals

- None beyond Out Of Scope.

### Preserved Behavior Boundary

- autobyteus-585: a platform notice is its own row.
- The recent window's size limit and which rows it keeps.
- The usage row per message.
- Inter-agent delivery rows.
- Pending/queued input display (autobyteus-540).

### Prerequisites

None.

### Review Authority

As the template states.

## Requirements

| Requirement ID | Requirement | Behavior IDs | Priority | Rationale | Feasibility | Source |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-001 | The conversation shows its messages, notices and agent output in the order they happened in the conversation, never by comparing timestamps from different clocks: live, on the phone and the desktop, for a run on the viewer's own node or another node | BEH-001 | Must | The founder's report; Reproduced | N/A | Task |
| REQ-002 | A platform notice delivered with the user's message shows right after that message, live and after a reload | BEH-002 | Must | Live and reload must agree; the notice is what the platform added to that message | N/A | DEC-002 |
| REQ-003 | Placing compaction rows never reorders messages: a compaction row is placed between messages (in conversation order) by its time, and that time and the messages' times are all the server's (REQ-004) | BEH-003 | Must | The fix of REQ-001 must keep compaction rows; with one clock their place is right (FU-001 resolved here) | N/A | DEC-003, DEC-004 |
| REQ-004 | Every time the app keeps for a conversation's rows (user messages, agent messages, notices, tool and compaction rows) is a time the server recorded; the app never stamps one from its own clock. Live and after a reload, the app uses the server's times | BEH-001, BEH-003 | Must | The founder's rule: one source of truth for time | N/A | User 2026-11-23; DEC-004 |

## Acceptance Criteria

| AC ID | REQ | Behavior / Scenario | Trigger | Expected Outcome | Failure / Alternate | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-002 | BEH-001, SCN-001 | The phone (its clock set 2 s behind the node) sends a message to a run whose next input carries a platform notice; the agent replies | Live: previous reply, You, the notice row, the reply | The same with the clock 2 s ahead, and with equal clocks | The reproduction (`probes/clock-order-reproduction.spec.ts`) turned into a passing web spec (behind, ahead, equal); a phone probe case with the phone page's clock offset (Playwright `page.clock`) |
| AC-002 | REQ-001 | BEH-001, SCN-002 | A message sent from another window (desktop) to a Team member while the phone (clock behind) watches | The phone shows You before the notice and the reply | — | Web spec (echo only, no local send); phone probe |
| AC-003 | REQ-002 | BEH-002, SCN-003 | Reload the run after AC-001 | The same order as live: You, notice, reply | — | Server projection unit test on the founder's trace shape; web hydration spec; the probe's reload step |
| AC-004 | REQ-003 | BEH-003, SCN-004 | A compaction happens between two turns (equal clocks), and the same with the viewer's clock behind | Equal clocks: the row between the two turns, as today. Behind: the messages keep their order whatever the compaction's place | — | Web spec |
| AC-006 | REQ-004 | BEH-001, BEH-003 | A live turn (message with a preface notice, agent output, a tool call, a compaction) with the viewer's clock 2 s behind, then 2 s ahead | Every user message, agent message and compaction row in the web's state carries the server's time (the echo's `received_at`, the frame's server time, or the stored `ts` after a reload); none carries the viewer's clock | — | Web specs with fake timers far from the frame times; a server unit test that every agent presentation message carries the server time; the phone probe case reads the rows' times |
| AC-005 | All | Preserved | The existing recent-window, notice-row, usage and pending-input specs, and MSP-99 (585) | Pass unchanged, or changed only where they asserted a clock-based order | — | Web suite; MSP-99 |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor | Goal | Trigger | Start | Steps | Outcome | Alternate | Validity | Evidence | REQ / AC |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | Founder on the phone | Ask the agent | Send from the phone | A skill changed since the run's last input (a notice waits) | Send → the node puts the notice in front of the input → the agent replies | Rows in order | Phone clock ahead or equal | Supported Normal (phones and computers routinely differ by hundreds of ms to seconds) | Founder screenshots; Reproduced | REQ-001/002, AC-001 |
| SCN-002 | User | Founder watching on the phone | Follow a conversation | Message sent from the desktop | Phone shows the run | The echo, then the agent's events | Rows in order | — | Supported Normal | Notes: a non-sender has only the node's time | REQ-001, AC-002 |
| SCN-003 | User | Founder | Reopen the run | Reload | — | Read the stored run | Same order as live | — | Supported Normal | Notes: reload path | REQ-002, AC-003 |
| SCN-004 | User | Founder | See where memory was compacted | A compaction | — | — | Row in place | — | Supported Normal | `compactionActivityProjection.ts:214` | REQ-003, AC-004 |

## UI, Interaction, And Experience Requirements

- Applicable: Yes (order only; no visual change). Product UI/UX: N/A.

## Quality And Non-Functional Requirements

| ID | REQ / AC | Area | Requirement | Verification |
| --- | --- | --- | --- | --- |
| QR-1 | REQ-001 | Performance | No extra request or stream frame; the window's work stays proportional to its rows | Code review; spec |

## Data Continuity And Acceptable Loss

- Persisted data affected: No. The stored traces are read as they are.

## External Contracts And Dependencies

| Contract | Constraint | Evidence | Risk |
| --- | --- | --- | --- |
| Projection conversation entries (JSON) | Their order may change for a preface notice (DEC-002); same-version deploy (DESIGN.md rule 9) | Notes | Low |

## Assumptions

| ID | Assumption | Why | Validation | Status |
| --- | --- | --- | --- | --- |
| ASM-1 | The founder's phone clock was behind the computer's by more than the gap from the node's receipt to the notice reaching the phone | Explains this instance | Not measurable after the fact. The mechanism is Reproduced, and the fix removes any clock from the order | Accepted (the fix does not depend on it) |

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | A current bug or an old-format artifact? | The Task's branch | Stored traces in order; Reproduced with current code | A current bug in the web's conversation window: fix it | Solution Designer | Decided |
| DEC-002 | Where a platform notice delivered with the user's message shows | Live and reload disagree by entry order | (a) You → notice → reply; (b) notice → You → reply (the stored and provider order) | (a): it reads as what happened from the user's side (you asked; the platform told the agent about the update; it answered). It is what live already shows, and what reload shows today. | Solution Designer (within the direction) | Decided; user informed |
| DEC-004 | Where the times come from (the founder's rule) | The app stamped agent messages and compaction rows with its own clock | (a) Order only (SR-001); (b) the server records every time and the app only shows it | **(b), the user's decision.** The server stamps each live agent event once, with the same server time its memory records, and the app takes every row's time from the server. With one clock, the compaction placement of FU-001 is right too | User | Decided |
| DEC-003 | Is the compaction row's placement in scope? | The same timestamp sort places it | (a) Record each compaction's place in the conversation (its writers: live projection, native stop, reload hydration, the activity store's merge); (b) keep placing it by time, but between messages in their own order | (b) here: the founder's problem is message order, which (b) fixes completely. A compaction row misplaced by a clock difference is rare, it is not what was reported, and (a) touches four writers. (a) is FU-001. | Solution Designer | Decided; user informed |

## Traceability

| REQ | UC | BEH | AC | SCN |
| --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001 | AC-001, AC-002, AC-005 | SCN-001, SCN-002 |
| REQ-002 | UC-001, UC-002 | BEH-002 | AC-001, AC-003 | SCN-001, SCN-003 |
| REQ-003 | UC-001, UC-002 | BEH-003 | AC-004 | SCN-004 |
| REQ-004 | UC-001, UC-002 | BEH-001, BEH-003 | AC-006 | SCN-001…004 |

## Architecture Phase Input

- Verify:
  - what order authority the window can use for compaction rows (their place in the conversation);
  - whether the reload builder or the node projection owns "a preface notice follows its message";
  - every reader of the window's order (desktop feed, phone, the mutation coordinator, the contention fixture);
  - whether Playwright's `page.clock` can offset the phone page in the probe.

## Readiness Check

### Content Ready For Approval

- All items Yes. Content ready: Yes.

### Approved Basis Ready For Design

- Approval recorded: Yes (Solution Designer within the direction, user informed 2026-11-23).
- Ready for architecture design: Yes.
