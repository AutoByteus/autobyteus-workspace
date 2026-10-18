# Requirements Document — Delegated Copies Slow To Show And Open

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-002` (SR-001 baseline; SR-002 clarifies AC-004's failure outcome and REQ-004's "details", and names the artifact content route in Out Of Scope, all within the direction, no change of intent)
- Package identifier: `delegated-copies-slow-open`
- Request / ticket: Project Task e6985045 (bug, long-standing)
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`)
- Requirements owner: Solution Designer
- Date: 2026-10-18
- Approved by and reference: `Solution Designer within the direction (user informed)`; reference: the Solution Designer's message to the user in this conversation, 2026-10-18 ("Requirements approved within the direction")
- Exact approved requirements baseline / solution revision: this document at SR-002
- Behavior-defining supplements and their approved versions: none

## Problem And Desired Outcome

- Problem: a standalone run that delegated many copies (the Project Task Manager: 56 copies, 286 agents) shows its copies in the sidebar only after minutes, and opening it is slow. Measured cause (investigation notes): before drawing a single copy row the app loads every copy agent's full conversation and artifacts (2 requests per agent, 257 MB), and each artifact request makes the server scan every stored team, org and hub tree (~2 s each). It is the app's load pattern and an unscoped server lookup, not the memory layout.
- Affected actors or systems: the desktop/web user; the server serving the hub's view.
- Desired outcome: the run and its copy rows show fast after app start, independent of the number of copies; a copy's details load when the user opens it; status, Task summaries and history stay correct.
- Observable definition of success: QR-001, QR-002 on a realistic large run; AC-001..AC-009.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | SCN-001 | Copy rows appear only after every copy agent's conversation and artifacts loaded (minutes for 286 agents) | Copy rows appear from the hub's view alone | Same rows, order, nesting, labels, delegated-by, collapse state, closed-Task hiding | notes BEH-001, probe |
| BEH-002 | User | SCN-002 | Opening the hub waits behind the copy fan-out; its Team tab and copy selection wait for all copies | The hub opens and its own conversation shows without waiting for copies | Hub conversation, Team tab messages, composer | notes BEH-002 |
| BEH-003 | User | SCN-003 | A copy opens instantly but only after the full load | Opening a copy loads that copy's stored conversation, activities and artifacts on demand, fast | Complete history, activities, artifacts, event monitor, sending to the copy (wakes it) | notes BEH-003 |
| BEH-004 | System | SCN-004 | Each new delegation (or Save of copy settings) while the hub is open reloads every copy | A new copy adds its row without reloading the others | The new row appears; already opened copies keep their state | notes BEH-004 |
| BEH-005 | User | SCN-001, SCN-005 | Row status, team status color and Task summary correct once shown | Same, available with the rows | Live status for a running hub; Offline for stored; batched Task summaries | notes BEH-005 |

## Stakeholders, Actors, And Outcomes

| Actor | Goal | Required Outcome | Constraint |
| --- | --- | --- | --- |
| User | See and open a long-lived hub and its copies | Rows and run fast, details on demand | Nothing lost or wrong in status, summaries, history |
| Server | Serve hub views and copy details | Cost per request independent of unrelated stored runs | No storage restructuring |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | Sidebar shows a standalone run's delegated copies (task agents, task agent teams and their members) after app start or when a workspace is expanded | SCN-001, SCN-005 |
| UC-002 | Open a standalone run that has delegated copies (stopped or running) | SCN-002 |
| UC-003 | Open a delegated copy (task agent, task team row → coordinator, team member) of a standalone run | SCN-003 |
| UC-004 | A running hub delegates a new copy, or the user saves copy settings, while the hub is shown | SCN-004 |

### Out Of Scope

- Any change to the memory/storage layout or file formats (separate memory Tasks; autobyteus-114 owns message-log storage).
- Team runs and organization runs that have delegated copies (same eager pattern, small volumes today): follow-up FU-1.
- Loading the hub's message log lazily (it is sent with the hub's view): follow-up FU-2 unless measurement shows it blocks QR-001.
- The startup readiness scan of all message histories (autobyteus-114 FU-1) and general app-start time before the sidebar lists runs.
- Speeding up the generic run-id file-change lookup (`getRunFileChanges` for other run kinds, and the artifact content route `/runs/:runId/file-change-content`, which also scans every stored tree, ≈1–2 s per open, for copies, team members and org members alike) (FU-3).

### Non-Goals

- No new UI (no loading skeleton design); a copy that is loading uses the existing loading behavior of the center view.
- No caching or background precomputation of copy details.

### Preserved Behavior Boundary

- BEH-001..BEH-005 preserved columns; REQ-005, REQ-006; AC-005, AC-006.
- A stopped hub is never restored by viewing; sending to a copy still wakes it.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or follow-up. It is not a required design correction.
- A downstream reviewer comment does not amend this requirements basis.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority | Rationale | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | A standalone run's copy rows are drawn from the run's collaboration view alone: the number of requests and the data needed to draw them do not grow with the number of copies' conversations or artifacts | BEH-001, BEH-005 | Must | Measured cause; Task direction "roughly independent of how many delegated copies" | Task Direction; DEC-001 |
| REQ-002 | Opening a standalone run shows its own conversation without waiting for any copy's details | BEH-002 | Must | Task "opening a run with many copies is fast" | Task Done-when |
| REQ-003 | A copy's stored conversation, activities and artifacts are loaded when the user opens that copy (or the app needs them for an action on it), once per copy while its view is kept, and are complete | BEH-003 | Must | Task "load details lazily"; history correctness | Task Direction; DEC-002 |
| REQ-004 | Loading one copy's stored details (conversation, activities, artifact list) costs time independent of how many other runs are stored on the node | BEH-003 | Must | `getRunFileChanges` scans every stored tree (~2 s/agent) | probe; DEC-003 |
| REQ-005 | Row status (live for a running hub, Offline for a stopped one), team aggregate status, delegated-by, Task summaries and closed-Task hiding stay as today | BEH-005, BEH-001 | Must | Task "keep correctness of status, Task summaries and history" | Task Direction |
| REQ-006 | Live updates of a running hub keep working for every copy, opened or not: status changes, new messages of an opened copy, tool approvals, sending to a copy | BEH-003, BEH-004 | Must | Preserved behavior | Code |
| REQ-007 | A new copy (or a settings Save) while a running hub is shown does not reload the details of the other copies | BEH-004 | Should | Recurring cost per delegation | Code; DEC-004 |
| REQ-008 | The cause is documented with baseline and fixed timings on a realistic large run, and a repeatable regression check guards that showing the copy rows does not scale with the number of copies | — | Must | Task Done-when | Task Done-when |

## Acceptance Criteria

| AC ID | Related REQ | Related Behavior / Scenario | Preconditions / Trigger | Observable Expected Outcome | Alternate / Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | BEH-001 / SCN-001 | A stopped hub with ≥50 task agent teams (≈280 child agents) in an expanded workspace; app (re)loads | Copy rows appear within QR-001; drawing them issues exactly one collaboration-view request for the hub, plus the batched Task summary request(s), and no per-copy conversation or artifact request | If the view request fails, the existing error state shows; no partial per-copy errors | Browser/unit test counting requests; timing on a large fixture |
| AC-002 | REQ-001 | SCN-001 | Same hub with 5 copies vs 50 copies | Requests issued to draw the rows are the same count; server time of the view grows only with the hub tree/links, not with copies' traces | — | Unit/integration test with two fixture sizes |
| AC-003 | REQ-002 | BEH-002 / SCN-002 | Click the large hub run (stopped and running) | The hub's conversation shows within QR-002; the copy rows and the Team tab appear without per-copy loads | — | Browser probe / isolated instance |
| AC-004 | REQ-003, REQ-004 | BEH-003 / SCN-003 | Click a copy row (task agent; task team → coordinator; a member) of the large hub | That copy's full stored conversation, activities and artifact list show within QR-002; exactly that copy's details are requested; reopening it while the hub's view is kept (no new snapshot or inspection) does not refetch | A failure to load one copy is logged with that copy's identity and leaves it not loaded, so opening it again retries; other rows and copies stay usable (no new error UI, Non-Goals) | Unit test + browser probe |
| AC-005 | REQ-005 | BEH-005 / SCN-001, SCN-005 | Hub with open and closed (DONE/CANCELLED) Tasks; running and stopped | Same rows, statuses, team status colors, delegated-by labels and Task summary lines as before the change | — | Existing tests stay green; comparison on fixture |
| AC-006 | REQ-006 | SCN-003, SCN-004 | Running hub; a not-yet-opened copy changes status or produces output; then the user opens it; user sends to a copy | Row status updates live; on opening, the copy shows its complete conversation including output produced before opening; sending wakes and delivers as today; tool approvals work | — | Unit tests on hydration/event ordering; existing e2e |
| AC-007 | REQ-007 | BEH-004 / SCN-004 | Running hub shown with one copy opened; a new delegation starts | The new row appears; no detail request for unopened copies; the opened copy keeps its conversation and state | — | Unit test counting requests |
| AC-008 | REQ-008 | — | Validation | Validation report lists baseline vs fixed timings for the large run (rows shown, hub opened, copy opened) and the regression check's command | — | Validation report |
| AC-009 | REQ-004 | SCN-003 | Node with hundreds of stored team and org runs | Loading one copy's artifacts takes time independent of the number of other stored runs (no scan of unrelated trees) | — | Server unit/integration test |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor | Goal / Event | Trigger / Entry | Starting Condition | Steps | Expected Outcome | Alternate / Error | Validity | Evidence | Related REQ / AC |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | User | See a hub's copies | App start / workspace expanded in the Workspaces sidebar | Hub with many copies stored | App lists runs → hub row → copy rows | Copy rows quickly, with status and Task summaries | View read error → existing error state | Supported Normal Scenario | Screenshots 46/47/53; code | REQ-001, REQ-005; AC-001, AC-002, AC-005 |
| SCN-002 | User | User | Work in the hub | Click the hub run | Stopped or running hub | Run opens → conversation → copy rows / Team tab | Fast, independent of copies | — | Supported Normal Scenario | Task text | REQ-002; AC-003 |
| SCN-003 | User | User | Look at or talk to one copy | Click a copy row; send a message to it | Hub shown | Copy opens → its history, activities, artifacts | That copy's details load on demand, complete | That copy's load error shown for it only | Supported Normal Scenario | Code; screenshot 47 | REQ-003, REQ-004, REQ-006; AC-004, AC-006, AC-009 |
| SCN-004 | System | Hub agent / user | New delegation or copy-settings Save while hub shown | `delegate_task`; Settings Save | Running hub shown | Event → new row / updated settings | No reload of other copies | — | Supported Normal Scenario | Code | REQ-006, REQ-007; AC-006, AC-007 |
| SCN-005 | User | User | Know each copy's Task | Rows shown | Projects available | Batched Task summary read | Summary line per Task row | — | Supported Normal Scenario | Code | REQ-005; AC-005 |

## UI, Interaction, And Experience Requirements

- Applicable: `No` (no new UI; existing loading behavior reused).
- Linked UI/UX or interaction supplement: N/A — not applicable
- Linked runnable UI reference, separate design repository/root, UI/UX specification, and applicable support artifacts: N/A — not applicable
- Product ticket record and folder (externally owned): N/A — not applicable
- Design repository revision or commit: N/A — not applicable
- UI/UX user-confirmation reference: N/A — not applicable
- Approved visual-reference baseline: N/A — not applicable
- Normative visual and interaction details, including the approved final references: N/A — not applicable
- Explicitly illustrative fixture content or permitted implementation variation: N/A — not applicable
- Required screens, states, transitions, feedback, responsive behavior, or accessibility outcomes: a copy whose details are loading shows the center view's existing loading state.
- Product decisions that need the user: none.

## Quality And Non-Functional Requirements

| Quality ID | Related REQ / AC | Area | Measurable Requirement | Conditions / Scope | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-001; AC-001 | Performance | Copy rows visible ≤ 2 s after the hub row is visible (baseline: minutes) | Realistic large hub: ≥50 task agent teams, ≈280 child agents, hub message log of several MB; isolated instance or fixture; warm start | Timed browser probe / isolated instance |
| QR-002 | REQ-002, REQ-003; AC-003, AC-004 | Performance | Hub conversation and a selected copy's conversation visible ≤ 2 s after the click; a copy's artifact lookup on the server ≤ 100 ms with hundreds of stored runs (baseline ≈2 s) | Same | Timed probe; server test |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `No` (reads only).
- Data or state that must be preserved: all stored data unchanged.
- Loss, reset, rebuild, or regeneration that is acceptable: none.
- Unknowns: none.

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| Collaboration stream contracts package | Keep view/snapshot shapes; if changed, rebuild and commit `dist/` | TESTING.md | Prefer no change |
| autobyteus-114 (append-only message logs) | Do not change message-log stores or readiness | its design spec Change Scope | Coordinate if a shared file is touched |

## Supplemental Artifacts

| Artifact Path | Purpose | Related REQ / AC | Status | Approval Applicability |
| --- | --- | --- | --- | --- |
| `probes/open-cost-probe.test.ts`, `probes/probe-run1.txt` | Baseline timings | REQ-008, QR-001, QR-002 | Evidence | N/A (evidence, not behavior-defining) |

## Assumptions

| ID | Assumption | Why | Validation / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | The user's perceived delay is dominated by the measured server CPU for per-copy requests | Probe measures server CPU, not wall time in the app | Baseline vs fixed timing by API/E2E | Open |

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | What must the rows wait for? | Core of the fix | (a) all copies' details (today); (b) the hub view only | Rows use only tree + status (code); (b) makes the time independent of copies, matching the Task direction. **(b)** | Solution Designer | Decided |
| DEC-002 | When are a copy's details loaded? | Lazy vs prefetch | (a) on open/use of that copy; (b) background prefetch of all; (c) prefetch visible rows | (b) repeats today's server load; (c) still scales with visible rows and adds no user value until opened. Team runs already hydrate members on selection (precedent). **(a)** | Solution Designer | Decided |
| DEC-003 | How to make one copy's artifact load fast | REQ-004 | (a) hub-scoped read through the hub's links; (b) a generic faster lookup for every run kind | (a) fixes this Task's path without touching unrelated families; (b) is broader and belongs to FU-3. **(a)** (mechanism in design) | Solution Designer | Decided |
| DEC-004 | New copy while hub shown | REQ-007 | (a) reload all (today); (b) keep opened copies, add the new one | (b) avoids per-delegation cost; already-opened copies keep their state. **(b)** | Solution Designer | Decided |
| DEC-005 | Include team/org roots? | Scope | Same eager pattern; user volumes small (≤34 agents) | The Task names runs like the PM; keep this Task focused; record FU-1. **Exclude** | Solution Designer | Decided |
| DEC-006 | Hub message log in the view | Payload 4–5 MB | Measured 0.4 s read; grows with activity | Not the measured cause; changing it touches DTOs that autobyteus-114 also leaves alone. **Keep; FU-2** unless QR-001 fails on it | Solution Designer | Decided |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | AC IDs | Scenario IDs | Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001, BEH-005 | AC-001, AC-002 | SCN-001 | probe |
| REQ-002 | UC-002 | BEH-002 | AC-003 | SCN-002 | probe |
| REQ-003 | UC-003 | BEH-003 | AC-004 | SCN-003 | code |
| REQ-004 | UC-003 | BEH-003 | AC-004, AC-009 | SCN-003 | probe |
| REQ-005 | UC-001 | BEH-005 | AC-005 | SCN-001, SCN-005 | code |
| REQ-006 | UC-003, UC-004 | BEH-003, BEH-004 | AC-006 | SCN-003, SCN-004 | code |
| REQ-007 | UC-004 | BEH-004 | AC-007 | SCN-004 | code |
| REQ-008 | all | — | AC-008 | — | Task |

## Architecture Phase Input

- Approved scenario IDs and product-level behavior paths architecture must map: SCN-001..SCN-005.
- Product and system constraints architecture must preserve: no storage change; stopped hub never restored by viewing; complete history on open; live updates.
- Decisions intentionally deferred to architecture design: on-demand hydration owner and trigger; hub-scoped artifact read shape; event handling for not-yet-hydrated copies; republish without reloading.
- Technical facts architecture should verify: consumers that need a hydrated child before selection; behavior of `prepareLocalContextAdoption`; DTO impact.
- Known feasibility or integration risks: R-001 (event/hydration ordering).

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Product design and supplemental evidence is integrated consistently: `N/A`
- Applicable UI/UX approval and final visual-reference basis are recorded: `N/A`
- Material assumptions and decisions are visible, each decision with reasoning and recommendation: `Yes`
- Content ready for approval: `Yes`
- Remaining content blocker: none

### Approved Basis Ready For Design

- Approval recorded: `Yes` (Solution Designer within the direction; user informed 2026-10-18)
- Exact requirements and supplement approval basis recorded: `Yes`
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: none
