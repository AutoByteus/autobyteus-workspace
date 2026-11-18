# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-003` (requirements approved at SR-001; SR-003 adds DEC-004 within the direction, with no visible change)
- Package identifier: `large-runs-load-less`
- Request / ticket: Project Task `autobyteus-358`, "Large runs: load less and open faster (8 small Tasks merged into one)"
- Requested by: the user, through `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`)
- Requirements owner: Solution Designer
- Date: 2026-11-01
- Approved by and reference: `Solution Designer within the direction (user informed)`. The user's rule, relayed by the PM on 2026-11-01: "check yourself whether each merged small problem still exists, and decide … yours to drop … Only questions that truly need the user (a change of product behavior or scope) go to him." In this conversation he said: "go ahead", and asked to keep in mind that performance problems usually come from how a feature is designed. The user is informed in the conversation. No decision below changes visible product behavior: DEC-001 keeps the display as it is
- Exact approved requirements baseline: SR-001
- Behavior-defining supplements: none

## Problem And Desired Outcome

- **Problem.** Large runs load far more than the screen shows, and some of it repeatedly:
  - a hub's view carries its whole message log (2.8 MB in a 50-copy test hub; the PM's log is 6.7 MB on disk), and one hub click reads it twice;
  - opening a team or org run loads every member's conversation, though the user looks at one member at a time (the user's largest org runs: 8 members, 49–58 MB of traces);
  - the run-history readiness check reads every team and org run's whole message log (103.8 MB on the user's install) at the first history access after a start, and again on every new team or org run;
  - a conversation of very long unbroken tokens takes 87 s to open.

  The design causes behind these are in investigation-notes M-* and E-*. Each screen gets everything because the "view" is one snapshot of everything, and validation of history happens up front.
- Affected actors: the user; the app's run views (hub, team run, org run), Settings, startup.
- Desired outcome: each screen asks for what it shows. A run opens with its structure and statuses; its messages and its members' details load when the user opens them; history is validated when a run is opened; one click reads once.
- Observable definition of success: the measurements in Quality Requirements, before and after, on test-owned large data.

## Merged Items: Kept Or Dropped

| Item | Decision | Evidence (investigation-notes) |
| --- | --- | --- |
| 151 team/org members on demand | **Kept** (REQ-001) | E-04, E-09; M-151 |
| 152 messages only when shown | **Kept** (REQ-002) | E-01, E-02; M-152 |
| 162 one hub click reads the view twice | **Kept** (REQ-003) | E-06; M-162 |
| 156 startup readiness scan reads all message logs | **Kept** (REQ-004) | E-03; M-156 |
| 163 very long unbroken tokens | **Kept** (REQ-005) | M-163 (CPU profile) |
| 161 live view shows part of the log | **Dropped: already fixed.** The same probe now shows 252 of 252 stored messages in the running hub's live view (October: 11 of 252) | M-161 |
| 200 Projects whole-backlog read | **Dropped: not worth the effort now.** 20 Projects × 1,000 Tasks: 0.64 s on the Mac, 1.3 s in a Docker node (October: 1.8 s). The user has 12 Projects and 458 Tasks, about 30 ms | M-200 |
| 118 hub's task agents' own files read up front | **Dropped: no real cost.** The hub view with 300 task agents' own files and a 2.6 MB log is built in 47 ms on the server. REQ-002 removes most of the view's bytes anyway | M-118 |

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Scenario | Current Behavior | Desired Behavior | Preserved | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | SCN-001, SCN-002 | A hub's view and every live snapshot carry the whole message log | The view and snapshots carry structure, statuses and input states only; the Team tab loads the focused participant's messages when shown | Complete history; live messages in order; reference files | E-01, M-152 |
| BEH-002 | User | SCN-003 | Opening a team or org run loads every member's conversation, activities and files, and the run's whole message log | It loads the run's view and the focused member's details; another member loads when opened; the Team tab's messages load when shown | Statuses, Task summaries, live updates, history | E-04 |
| BEH-003 | User | SCN-001 | One hub click reads the hub's view twice (Settings reads it again) | One read per hub selection | Settings shows the copies' model settings | E-06, M-162 |
| BEH-004 | System | SCN-004, SCN-005 | The readiness scan reads every team and org message log, at the first history access after a start and on every new team or org run | Admission by structure only; a run's messages are validated when the run is opened | An unreadable or damaged run package is still reported, not silently ignored; older runs still open | E-03, M-156 |
| BEH-005 | User | SCN-006 | A conversation of 60 KB unbroken tokens takes 87 s to open | Roughly proportional to its size, like prose of the same size | Wrapping, copy, search; auto-scroll to the latest message | M-163 |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Scenarios |
| --- | --- | --- |
| UC-001 | Open a hub (a standalone run with copies), stopped or running, and its Team tab | SCN-001, SCN-002 |
| UC-002 | Open a team run or an org run, and open a member | SCN-003 |
| UC-003 | Start the app with a large run history; create a team or org run | SCN-004, SCN-005 |
| UC-004 | Open a conversation that contains very long unbroken tokens | SCN-006 |
| UC-005 | Open a run whose stored package is damaged | SCN-007 |

### Out Of Scope

- Items 161, 200 and 118 (dropped, see the table).
- How message logs and run packages are stored (no format change).
- A member's own conversation paging (a single member's projection is not changed).
- The work of other teams in parallel: autobyteus-318, 345, 357, 285, 337 and 355.

### Non-Goals

- Loading a single long message log incrementally (paging the Team tab). It loads whole for the focused participant when shown.
- Collapsing very long messages (DEC-001).

### Preserved Behavior Boundary

- Complete history and live messages in order, statuses, Task summaries, reference-file links, Settings content, auto-scroll, copy and search.
- A damaged package is reported.

### Prerequisites

None.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or follow-up. It is not a required design correction, unless it is a prerequisite.
- A downstream reviewer comment does not amend this requirements basis. The Solution Designer must update the canonical requirements and obtain renewed user approval before a scope-changing proposal can govern design or implementation.

## Requirements

| Requirement ID | Requirement | Behavior | Priority | Feasibility Evidence | Source |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | Opening a team run or an org run loads the run's view (structure, statuses, Task summaries) and the focused member's details only. Another member's conversation, activities and files load when the user opens it. One shared on-demand member-loading core serves team members, org members and a hub's copies | BEH-002 | Must | The on-demand precedent exists for copies and as the team fallback (E-05) | 151 |
| REQ-002 | A run's view and its live snapshots no longer carry the run's message log, for hubs, team runs and org runs. The Team tab loads the messages of the participant it shows when it is shown. Messages arriving live are added in order, and the loaded list equals the stored log for that participant | BEH-001, BEH-002 | Must | The Team tab already filters by one participant (`agentRunCollaborationContext.ts:357-394`) | 152 (team and org runs: the same fix, per the Task's "one change") |
| REQ-003 | One selection of a hub reads its view once; Settings uses that view or reads only what it needs | BEH-003 | Must | E-06 | 162 |
| REQ-004 | Run packages are admitted by structure only: the readiness check reads no message log. A run's messages are validated when the run is opened, and a damaged or unreadable log is reported then. A new team or org run does not rescan the whole history | BEH-004 | Must | M-156: the scan is 139 ms without logs | 156 |
| REQ-005 | Opening a conversation of very long unbroken tokens takes a time roughly proportional to its size, with the display unchanged | BEH-005 | Must | M-163b: shaping those runs without kerning and ligatures lays out the whole conversation in 45–87 ms (86 s with them) | 163 |

## Acceptance Criteria

| AC | Requirements | Scenario | Trigger | Expected Outcome | Verification |
| --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-002 | SCN-001 | Open the seeded 50-copy hub, stopped and running | The view has no message log; its size does not grow with the log (QR-001) | Probe S-API/S-001, live L-001 |
| AC-002 | REQ-002 | SCN-002 | Open the Team tab for the hub, then for a copy | It shows exactly the stored messages of that participant, newest first, as today. A message sent while it is open appears once, in order | Probe plus an integration test against the stored log |
| AC-003 | REQ-001, REQ-002 | SCN-003 | Open a large team run and a large org run; open another member | Only the focused member's projection and files load at open; the next member loads on open; statuses and Task summaries are unchanged | Request counts in a browser probe |
| AC-004 | REQ-003 | SCN-001 | Click a hub | One `GetAgentRunCollaboration` per selection; Settings shows the same copy settings | Test asserting the count; the probe's request log |
| AC-005 | REQ-004 | SCN-004, SCN-005 | Start with 100 MB of team logs; create a team run | The scan time does not depend on log size (QR-003); creating a run does not rescan the logs | `startup-scan-probe.mjs`; a test |
| AC-006 | REQ-004 | SCN-007 | A team or org run whose message log is damaged: open its Team tab, or resume it | The Team tab shows the run's messages as unavailable, with the reason; resuming is refused with the reason. Neither shows a silently empty or partial log | Integration test |
| AC-007 | REQ-005 | SCN-006 | Open the 20 × 60 KB unbroken-token copy | Loaded within QR-004; wrapping, copy and search unchanged; it ends scrolled to the latest message | Probe L-010 unbroken, before and after |
| AC-008 | all | — | The full suites | Pass from a clean clone | Suites |

## Relevant Scenarios And Journeys

| Scenario | Kind | Goal | Trigger | Expected | Validity |
| --- | --- | --- | --- | --- | --- |
| SCN-001 | User | See a hub and its copies | Click the hub in the history | Rows and the hub conversation; one view read | Supported Normal Scenario |
| SCN-002 | User | Read a hub's or copy's messages | Open the Team tab | That participant's messages | Supported Normal Scenario |
| SCN-003 | User | Work with a team or org run | Open it; click a member | The focused member at once; others on demand | Supported Normal Scenario |
| SCN-004 | System | Start the app | App start, first history access | History ready without reading logs | Supported Normal Scenario |
| SCN-005 | User | Start a team or org run | Run creation | No rescan of the history | Supported Normal Scenario |
| SCN-006 | User | Read a copy whose messages are long tokens (base64, minified text) | Click the copy | Opens in proportion to its size | Supported Explicit Edge Scenario (real agent output) |
| SCN-007 | Operational | A damaged run package | Open the run | The run is reported, not hidden | Supported Explicit Edge Scenario (the scan's purpose) |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes`, limited. The Team tab may show its usual loading state while its messages load. Nothing else visible changes.
- Product Design: `N/A — not applicable`

## Quality And Non-Functional Requirements

| ID | Related | Area | Requirement (seeded large data; load average recorded) |
| --- | --- | --- | --- |
| QR-001 | AC-001 | Performance | The seeded hub's view is under 300 KB (today 2.79 MB), and its size does not grow with the message log |
| QR-002 | AC-004 | Performance | One view request per hub selection (today 2) |
| QR-003 | AC-005 | Performance | The scan at 100 MB of team logs stays within 1.3× the scan with empty logs (today 328 ms vs 139 ms) |
| QR-004 | AC-007 | Performance | The unbroken-token copy loads within 1 s (today 87 s; prose of the same size: 262 ms) |
| QR-005 | AC-003 | Performance | Opening a team or org run issues one member projection and file-change request (the focused member), not one per member |
| QR-006 | all | Privacy | Measurements only on test-owned data; the user's data only by names and sizes |

## Data Continuity And Acceptable Loss

- Persisted data affected: `No`. Only reads and transport change.

## Decisions

| Decision ID | Question | Options / Evidence | Reasoning And Recommendation | Owner | Status |
| --- | --- | --- | --- | --- | --- |
| DEC-001 | Item 163: fix the forced layout only, or also collapse very long messages? | (a) Remove the repeated forced layout (the measured cause, 88.8 of 89.9 s). (b) Also show very long messages collapsed with "Show all", which changes what the user sees | (a) removes the cause, and prose of the same size already opens in 262 ms. (b) is a visible change, and only needed if (a) misses QR-004. (a); (b) becomes a question for the user only if the measurement after (a) misses the target | Solution Designer | Decided |
| DEC-004 | 163 after IR-001: DEC-001 (a) misses QR-004; how to meet it without changing what the user sees? | M-163b: the cause is font shaping, with kerning and ligatures, of very long unbroken runs (86 s → 45–87 ms without them) | Turn kerning and ligatures off only for text that contains a very long unbroken run (base64, minified text), where they have no visible meaning. Other messages keep their typography, and wrapping, copy and search are unchanged. This meets QR-004 without DEC-001 (b), so no user decision is needed | Solution Designer | Decided (SR-003) |
| DEC-002 | Apply "messages only when shown" to team and org runs too? | The original item names the hub; team and org runs load their whole log at open as well (E-04) | It is the same cause and the same fix, and the Task asks for one change. Yes | Solution Designer | Decided |
| DEC-003 | Drop 161, 200 and 118? | Measurements M-161, M-200, M-118 | The user allowed dropping fixed or not-worth-it items. Drop all three, reported with evidence | Solution Designer | Decided |

## Traceability

| Requirement | Use Cases | Behaviors | ACs | Scenarios |
| --- | --- | --- | --- | --- |
| REQ-001 | UC-002 | BEH-002 | AC-003 | SCN-003 |
| REQ-002 | UC-001, UC-002 | BEH-001, BEH-002 | AC-001, AC-002, AC-003 | SCN-001, SCN-002, SCN-003 |
| REQ-003 | UC-001 | BEH-003 | AC-004 | SCN-001 |
| REQ-004 | UC-003, UC-005 | BEH-004 | AC-005, AC-006 | SCN-004, SCN-005, SCN-007 |
| REQ-005 | UC-004 | BEH-005 | AC-007 | SCN-006 |

## Readiness Check

- Content ready for approval: `Yes`
- Approval recorded: `Yes` (within the direction, user informed)
- Approved requirements package ready for architecture design: `Yes`
