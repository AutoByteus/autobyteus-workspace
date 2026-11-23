# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-002` (AC-007, AC-008 and REQ-006 added from `test-gap-report.md`; within the founder's direction)
- Package identifier: `message-reference-own-log-615` (autobyteus-615)
- Request / ticket: Project Task `autobyteus-615`, Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a` (an investigation, then the fix)
- Requested by: `/project_task_manager` (the founder's report). The fix was approved by the founder in this conversation on 2026-11-23: "you analyze it and trust your proposals now you can continue", after the root-cause report and options A + B, and his direction "make sure that our code base and our overall architecture is healthy … following the design principles".
- Requirements owner: Solution Designer (`solution_designer_703182187282472484b90793eac8be40`)
- Date: 2026-11-23
- Approved by and reference: `User` (founder), 2026-11-23, in this conversation. The decisions below are within that direction.
- Behavior-defining supplements: `root-cause-report.md` (evidence)

## Problem And Desired Outcome

- **Problem:** in the Messages tab, a message's reference file opens as "Reference file unavailable — the file may have been deleted, moved, or become unreadable", although the file exists.
  - **Cause:** the server builds the tab's message list from the view of a run: its own log plus the log of every run of its open subtree (`participant-messages-reader.ts:79-93`, `run-view-messages.ts:42-62`). The reference file is looked up by a different reader.
  - **The three reference routes** look only in one run's own log (`agent-collaboration-references.ts`, `team-communication.ts`, `agent-org-references.ts`).
  - **The web builds the three reference links by hand**, pointing at the root run even when the tab shows a delegated run's messages (`agentRunCollaborationContext.ts:109-110`, `teamCollaborationMessagesView.ts:41-42`, `agentOrgExecutionContext.ts:323-324`).
  - **So any message that lives in another run's log gives 404.** That covers every message of a delegated task agent, task team or delegated copy, and a root's messages with its delegated runs. The viewer shows every 404 as "file deleted or moved" (`CollaborationMessageReferenceViewer.vue:176-180`).
  - **Origin:** autobyteus-461 (2026-11-12) moved delegated runs' messages into their own logs and composed views from them; the reference read was not moved with it. Founder's server log: 90 requests since 2026-11-22, all 404.
- **Desired outcome:** every reference file listed with a message opens, from wherever the message was listed. A failure says what actually failed. The code has one owner for "the messages of a view", and the list and the reference read both use it.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Scenario | Current | Desired | Preserved | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | SCN-001 | A delegated run's message reference returns 404 | Opens | A reference whose file is missing still reports it | report §Evidence 1-3 |
| BEH-002 | User | SCN-002 | A root's message stored in a delegated run's log (root ↔ delegated run) returns 404 | Opens | — | `composeRunViewMessages` composes those messages; the reference routes don't |
| BEH-003 | User | SCN-003 | Every 404 reads "deleted, moved, or unreadable" | Message-not-found and file-missing read differently | The file-missing text | `CollaborationMessageReferenceViewer.vue:53-56, 176-180`; server codes `REFERENCE_NOT_FOUND`, `REFERENCE_CONTENT_UNAVAILABLE` |
| BEH-004 | System | SCN-001…003 | Three routes, each reading one log | One route that reads the same view as the message list | A reference must belong to a message of that view; no file outside a listed message is served | report |
| BEH-005 | User | SCN-004 | A phone shows the same web page | Same fix | — | the iOS `DemoWeb` bundle |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Scenarios |
| --- | --- | --- |
| UC-001 | Open a message's reference file in the Messages tab of any run (standalone, Team member, Org member, delegated task agent, task team, delegated copy) on desktop and phone | SCN-001…004 |

### Out Of Scope

- Context files (files attached to a chat input), fixed by autobyteus-500 FU-020, except a regression check.
- Task reference files in the Tasks panel.
- Message content and the paging of the message list.
- Peer (remote-node) runs: their messages stay on their node, and that is unchanged.

### Non-Goals

- Opening references of messages the view does not list.

### Preserved Behavior Boundary

- BEH-003's file-missing text;
- BEH-004's rule that a reference must belong to a listed message;
- NA-7 route permissions (owner and phone);
- context files.

### Prerequisites

None.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or follow-up. It is not a required design correction, unless it is a prerequisite.
- A downstream reviewer comment does not amend this requirements basis.

## Requirements

| REQ | Requirement | BEH | Priority | Source |
| --- | --- | --- | --- | --- |
| REQ-001 | A reference file of any message the Messages tab lists opens, whichever run's log holds the message | BEH-001, BEH-002, BEH-005 | Must | Founder; report |
| REQ-002 | The server finds a reference only through a message of the same view the list is read from (the same run identity and the same composition), and serves only a file named by that message | BEH-004 | Must | Principle 11; preserved boundary |
| REQ-003 | The viewer tells "the message or reference was not found in this view" (`REFERENCE_NOT_FOUND`) apart from "the file is missing or unreadable" (`REFERENCE_CONTENT_UNAVAILABLE`), and keeps today's text for the latter | BEH-003 | Must | Option B; DEC-003 |
| REQ-004 | One owner in the web builds a message's reference link, from the same key that loaded the message list; no context writes its own | BEH-001, BEH-004 | Must | Founder's direction; DEC-001 |
| REQ-005 | Context files keep opening as today | — | Must | Preserved |
| REQ-006 | The class of bug is guarded permanently: a test proves that every reference listed in every view opens, for each root kind with delegated runs; TESTING.md states the rule for changes that move where data lives | — | Must | `test-gap-report.md`; the founder's question (2026-11-23, via the PM) |

## Acceptance Criteria

| AC | REQ | Trigger | Expected | Verification |
| --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | The Messages tab of a delegated task team member (the observed case), a delegated task agent, and a member of a task team under an Org; click a reference | The file opens | Web unit tests per context; server integration on synthetic run trees; one built-app check |
| AC-002 | REQ-001 | A root's own Messages tab: a message between the root's agent and a delegated run's agent, stored in the delegated run's log | Opens | Server test with a composed view |
| AC-003 | REQ-002 | A request naming a message not in the view, or a reference not on the message | `REFERENCE_NOT_FOUND` (404) | Server unit tests |
| AC-004 | REQ-003 | (a) not found; (b) file missing | (a) a distinct "not found in this conversation" text; (b) today's text | Web unit test of the viewer; rendered check |
| AC-005 | REQ-004 | — | One builder; the three hand-written links and the test-support copy are gone | Review |
| AC-006 | REQ-005 | Open a context file of a delegated run | Opens | Existing context-file tests pass; one rendered check |
| AC-007 | REQ-006 | A synthetic tree: standalone, Team and Org roots, each with a delegated task team and a delegated task agent; cross-run messages and messages inside the delegated runs, each with a reference | For every view (each root's own tab, each delegated run's member tab), every listed reference fetched through the web's link answers 200 with the file's bytes | Built-server E2E (permanent), plus a web unit test of the builder per row kind |
| AC-008 | REQ-006 | — | TESTING.md: when a change moves where data is stored, or which run owns it, every read path of that data (lists, attachments and references, counts, links, live) is proven for each owner kind through the real route; a case where the old place still holds a copy does not count; "expected to work" is a gap | Review (written by API/E2E, its owner) |

## Relevant Scenarios And Journeys

| Scenario | Kind | Actor | Trigger | Outcome | Validity | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | Founder | Click a reference in a delegated run's Messages tab | Opens | Supported Normal Scenario (every SE task team) | report |
| SCN-002 | User | Founder | Click a reference in a root's Messages tab, on a message with a delegated run | Opens | Supported Normal Scenario | 461 SR-072 composition |
| SCN-003 | User | Founder | The file was really deleted | The file-missing text | Supported Normal Scenario | — |
| SCN-004 | User | Founder | The same on the phone | Same | Supported Normal Scenario | — |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes`, minimally. The existing viewer gets one more empty-state text (DEC-003), in `en` and `zh-CN`. No new screen.

## Quality And Non-Functional Requirements

| QR | Area | Requirement |
| --- | --- | --- |
| QR-001 | Security | No file is served unless a message of the requested view names it (unchanged boundary) |
| QR-002 | Performance | Opening a reference reads the view's records once, as the list page does; no extra subtree scan per byte |

## Data Continuity And Acceptable Loss

- Persisted data affected: `No`. Links are built at display time; nothing stored names a reference URL (the 500 migration's marker treats `/agent-collaborations/:runId/communication/…` as "not an attachment link", `attachment-link-conversion.ts:20`).

## External Contracts And Dependencies

| Contract | Constraint |
| --- | --- |
| REST reference routes (web ↔ server, one release; phone uses the web) | Replaced as a clean cut (DESIGN.md rule 9) |
| Node access model NA-7 | The new route is an owner-and-phone route like the old three; no rule change |
| Reference ID rule `sha256(messageId \0 path)` | Unchanged |

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | Fix the three links, or give the reference read the same owner as the list? | The founder asked for a healthy architecture | (a) Repoint the three web links to the delegated run. The server's per-log readers would still miss root ↔ delegated messages (BEH-002). (b) One server owner, "the messages of the view of run X", used by both the page and the reference read, plus one route with the query's identity `(rootKind, rootRunId)`, plus one web builder from the key. | (a) fixes only SCN-001 and keeps four derivations of one fact. (b) removes the cause: one fact, one owner (Principle 11), and the list and its references can no longer disagree. Recommend (b). | Solution Designer (within the founder's direction) | Decided: (b) |
| DEC-002 | Keep the three old routes? | Dead code | No other caller: web only, plus `test-support`; nothing stored; phone uses the web | Remove as a clean cut | Solution Designer | Decided |
| DEC-003 | The not-found text | Product text | Founder approved option B (honest message) | Keep the title "Reference file unavailable". The detail for `REFERENCE_NOT_FOUND` is "This file's message could not be found in this conversation." `REFERENCE_CONTENT_UNAVAILABLE` keeps "The file may have been deleted, moved, or become unreadable." `zh-CN` gets the same. | Solution Designer | Decided |

## Traceability

| REQ | AC | BEH | SCN |
| --- | --- | --- | --- |
| REQ-001 | AC-001, AC-002 | BEH-001, BEH-002, BEH-005 | SCN-001, SCN-002, SCN-004 |
| REQ-002 | AC-003 | BEH-004 | SCN-001…003 |
| REQ-003 | AC-004 | BEH-003 | SCN-003 |
| REQ-004 | AC-005 | BEH-001, BEH-004 | SCN-001 |
| REQ-005 | AC-006 | — | — |
| REQ-006 | AC-007, AC-008 | BEH-001, BEH-002 | SCN-001, SCN-002 |

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Product design and supplemental evidence is integrated consistently: `N/A`
- Applicable UI/UX approval and final visual-reference basis are recorded: `N/A` (one text in the existing viewer, approved as option B)
- Material assumptions and decisions are visible, each decision with reasoning and recommendation: `Yes`
- Content ready for approval: `Yes`
- Remaining content blocker: none

### Approved Basis Ready For Design

- Approval recorded: `Yes`, the founder, 2026-11-23
- Exact requirements and supplement approval basis recorded: `Yes`
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: none
