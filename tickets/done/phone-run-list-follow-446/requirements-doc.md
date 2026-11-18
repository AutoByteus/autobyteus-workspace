# Requirements Document — autobyteus-446

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-002` (requirements unchanged since SR-001)
- Package identifier: `phone-run-list-follow-446`
- Request / ticket: Project Task `autobyteus-446` (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`) and its comments (2026-11-09)
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`) for the user
- Requirements owner: Solution Designer
- Date: 2026-11-09
- Approved by and reference: `Solution Designer within the direction (user informed)`; SR-001 and the Solution Designer's message to the user on 2026-11-09; confirmed by the user, relayed by the PM 2026-11-09, in his words: "Ok great yeah, let's work on the fix now."
- Exact approved requirements baseline / solution revision: this document at SR-001
- Behavior-defining supplements and their approved versions: None

## Problem And Desired Outcome

- Problem: when a Task closes, its delegated runs leave the run list only in a window where the run that delegated them (the "host", here the Project Task Manager) is the open run. In every other window (the user's phone, or a desktop window showing another run) they stay listed until that host run is opened or the page reloads. Reproduced: still listed after 120 s; gone after a reload. It is a bug, not a network delay.
- Affected actors: the user on the phone and on any desktop window whose open run is not the host.
- Desired outcome: a closed Task's delegated runs leave the run list within a few seconds in every window that lists the host, without the user acting; a reopened Task's runs come back the same way.
- Observable definition of success: AC-001 … AC-006.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | SCN-001 | Host is the open run: rows leave in 2 ms | Unchanged | Yes | Repro run 1 |
| BEH-002 | User | SCN-002 | Host only listed: rows stay (120 s+) | Rows leave within 10 s on the list's own refresh | — | Repro run 1 |
| BEH-003 | User | SCN-003 | Reload: rows gone | Unchanged | Yes | Repro run 1 |
| BEH-004 | User | SCN-002 | Desktop window with another open run: same as BEH-002 | Same as BEH-002 desired | — | Code |
| BEH-005 | User | SCN-004 | Task reopened, host only listed: rows stay hidden | Rows return within 10 s | — | Code |
| BEH-006 | User | — | Org host: rows follow on each history read | Unchanged | Yes | Code |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| User (phone, desktop) | See the same, current runs everywhere | Closed Tasks' runs leave every list promptly | No action needed |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | A Task is closed (by an agent such as the PM, or by the user) while its host run is listed but not open: its delegated runs leave the list in every window | SCN-002 |
| UC-002 | A closed Task is reopened while its host run is listed but not open: its delegated runs return to the list | SCN-004 |

### Out Of Scope

- Removing or archiving runs, and stopped/terminated runs' own top-level rows (not reported; their rows follow the history read today).
- The live stream of the open run (works) and opening streams for every listed run.
- autobyteus-380's open points (copies of temporary Tasks never closed) and 426 item 9 states beyond closure.
- Any UI change.

### Non-Goals

- Instant (sub-second) removal in windows where the host is not open: the list's existing refresh (every 5 s while shown) sets the pace.

### Preserved Behavior Boundary

BEH-001, BEH-003, BEH-006; REQ-003.

### Prerequisites

None.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or follow-up.
- A downstream reviewer comment does not amend this requirements basis.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority / Criticality | Rationale | Feasibility Evidence | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-001 | When a Task closes, the delegated runs it listed leave the run list, in every window (phone or desktop) that lists their host run and whose open run is not that host, within the list's next refresh after the node records the closure (at most 10 s while the list is shown), and at once when a phone's list is shown again. Applies to every host kind that lists delegated runs (standalone agent run; Team run, if design finds the same gap). | BEH-002, BEH-004 | High | The reported bug | Repro: the node records the closure (`closed_task_executions`); the list refreshes every 5 s | Task direction |
| REQ-002 | When a closed Task is reopened, its delegated runs return to those lists the same way. | BEH-005 | Medium | Symmetry of the same fact | Same | DEC-002 |
| REQ-003 | Preserved: the open host's live removal (BEH-001); reload (BEH-003); Org hosts (BEH-006); the list's refresh adds no per-host view read when nothing closed or reopened; nothing is read while the phone is in the background (E-25); closed runs stay in their host's tree and Team tab (autobyteus-380). | BEH-001, 003, 006 | High | Preserve | — | — |

## Acceptance Criteria

| Acceptance-Criteria ID | Related Requirement IDs | Related Behavior / Scenario IDs | Preconditions / Trigger | Observable Expected Outcome | Important Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | BEH-002 / SCN-002 | Phone bundle, isolated node; PTM run delegated Task A to an agent and Task B to a Team; the phone's open run is another run; list on screen; both Tasks closed | Both delegated rows leave within 10 s without reload | Before the fix: still listed after 120 s | Browser probe on the phone bundle (repro shape) |
| AC-002 | REQ-001 | BEH-004 | The same in a desktop window whose open run is not the PTM | Same | — | Browser probe (desktop window) or unit test of the shared store |
| AC-003 | REQ-002 | BEH-005 / SCN-004 | After AC-001, Task A reopened | Its row returns within 10 s | — | Probe or store test |
| AC-004 | REQ-003 | BEH-001 | The phone whose open run is the PTM | Rows leave at once (≤ 1 s) as today | — | Existing MSP-14 + probe |
| AC-005 | REQ-003 | — | Ten list refreshes with no Task change | No collaboration view re-read is sent (only the one batched states read per refresh) | — | Unit test of the store + probe network log |
| AC-006 | REQ-001, REQ-003 | BEH-003 | A phone whose list was hidden (in the background) when the Task closed | No read while hidden; on showing the list, the rows leave within 10 s | — | Probe (visibility emulated) |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor / Initiator / Governing Contract | Coherent Goal Or Governing Event | Supported Trigger / Entry Surface | Starting Condition | Product-Level Steps Or Event Sequence | Expected Outcome | Supported Alternate / Error Behavior | Scenario Validity | Independent Evidence / Decision Reference | Related Requirement / AC IDs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | User at the host run | Watch delegated work | Open the PTM run | Task running | PM closes the Task | Rows leave at once | — | Supported Normal Scenario | Repro | AC-004 |
| SCN-002 | User | User elsewhere | See only live work in the run list | Run list (phone list screen, desktop sidebar) | Host listed, another run open | PM (or the user) closes the Task | Rows leave within 10 s | — | Supported Normal Scenario | User's report; repro | AC-001, AC-002, AC-006 |
| SCN-003 | User | User | Reload | App restart / reload | — | — | Rows absent | — | Supported Normal Scenario | Repro | AC-006 |
| SCN-004 | User | PM or user | Reopen a Task | update_task to TODO/IN_PROGRESS | Task closed | Reopen | Rows return within 10 s | — | Supported Normal Scenario (Task reopen exists: `TASK_EXECUTIONS_REOPENED`) | Code | AC-003 |

## UI, Interaction, And Experience Requirements

- Applicable: `No`. Product Design fields: `N/A — not applicable`.

## Quality And Non-Functional Requirements

| Quality ID | Related Requirement / AC IDs | Area | Measurable Requirement Or Constraint | Conditions / Scope | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-001 / AC-001 | Reliability | ≤ 10 s from closure to removal while the list is shown | Host not open | Probe |
| QR-002 | REQ-003 / AC-005 | Performance | No extra request per refresh when nothing changed; at most one view read per host whose closed set changed | — | Unit + probe |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `No`.

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| Collaboration model: closed executions leave the listing, stay in the tree | Preserved | autobyteus-380 | — |

## Supplemental Artifacts

| Artifact Path | Purpose | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- |
| `evidence/repro/closed-task-rows-repro.mjs` | Reproduction | AC-001, AC-004 | Current | Evidence only |

## Assumptions

| Assumption ID | Assumption | Why It Is Necessary | Validation Plan / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | The node's host view already marks closed executions when the Task closes (the live stream and a reload both show it) | The fix reads the node's fact | Repro shows the reload drops the rows | Holds (Measured) |

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | Bug or network delay? | The user asked | Reproduced on loopback with no network involvement: 120 s+ stale, 2 ms when the host is open | A bug in how lists refresh delegated rows of a non-open host; fix it | Solution Designer | Decided |
| DEC-002 | Include reopened Tasks? | Same mechanism, opposite direction | A reopen is a supported action with its own live event | Include; same fact, consistent lists | Solution Designer | Decided |
| DEC-003 | Pace: instant everywhere, or the list's refresh? | Instant needs a live stream per listed host | The list already refreshes every 5 s while shown; streams per host cost connections and battery | The refresh pace (≤ 10 s); no new streams | Solution Designer | Decided |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | Acceptance-Criteria IDs | Scenario IDs | Supplemental / Product Design Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-002, 004 | AC-001, 002, 006 | SCN-002 | Repro |
| REQ-002 | UC-002 | BEH-005 | AC-003 | SCN-004 | — |
| REQ-003 | — | BEH-001, 003, 006 | AC-004, 005, 006 | SCN-001, 003 | Repro |

## Architecture Phase Input

- Approved scenarios: SCN-001…004.
- Constraints: REQ-003; the node owns the closed set.
- Deferred to architecture: how the list's refresh learns that a host's closed set changed; Team hosts (UNK-001).
- Known risks: the refresh's cost.

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
- Remaining content blocker: None

### Approved Basis Ready For Design

- Approval recorded: `Yes` (Solution Designer within the direction, user informed)
- Exact requirements and supplement approval basis recorded: `Yes`
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: None
