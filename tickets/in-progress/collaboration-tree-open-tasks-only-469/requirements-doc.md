# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-001`
- Package identifier: `collaboration-tree-open-tasks-only-469`
- Request / ticket: Project Task `autobyteus-469` (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`); prerequisite PRE-001 of `autobyteus-461`
- Requested by (the user, or the delegating agent's address): `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), on the user's decision of 2026-11-10
- Requirements owner: Solution Designer
- Date: 2026-11-10
- Approved by and reference: the user, in the Solution Designer's conversation on 2026-11-10: "this ticket is just about the collaboration tree itself ... this file should only contain the current active ones ... I don't think under UI there will be any difference". That answers DEC-001 (no visible change). The Solution Designer approved the rest within the Task's direction and informed the user.
- Exact approved requirements baseline / solution revision: `SR-002`
- Behavior-defining supplements and their approved versions: none of this ticket. The rules come from the Task description (agreed by the user as §11 of the 461 contract).

## Problem And Desired Outcome

- Problem: every delegation adds an entry to the top run's collaboration tree and nothing removes it. The entry list is also what a top run reads when it loads: each listed run's own file and message log. On the user's machine the Project Task Manager's tree has 145 entries after one month, 134 of closed Tasks, and a load of that run reads about 22 MB of message logs and run files, about 15 MB of it for closed Tasks.
- Affected actors or systems: the user; every run that delegates (standalone agent run, team run, org run); the Task side; the web client's tree and Team tab; the Memory page.
- Desired outcome: an entry exists while a Task that its run works on is open. The Task's record is the lasting record. A run of a closed Task is dismissed from the tree and comes back when its Task is reopened or it gets another Task.
- Observable definition of success: the "Done when" of the Task (AC-001 … AC-009).

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | SCN-001 | A delegation adds an entry; entries are never removed | Unchanged for adding | — | Notes BEH-001 |
| BEH-002 | Contract | SCN-001 | Closing a Task stops its runs and hides them; the entries stay | Closing a run's last open Task also removes its entry | The run's own files, conversation, logs and Task record; the stop itself | Notes BEH-002 |
| BEH-003 | Operational | SCN-005 | Loading a top run reads every listed run's own file and message log | It reads only the runs whose Task is open | What is shown for those runs | Notes BEH-003 (`Measured`) |
| BEH-004 | Contract | SCN-002, SCN-003 | Reopen and the assigner's message, or a follow-up Task by run ID, find the run in the top run's index | The same outcome when the entry is gone: the run continues and is listed again | The texts and results the agents get | Notes BEH-004 |
| BEH-005 | User | SCN-004 | The Team tab shows the messages that the focused agent sent or received. For a top run's own agent all of them are in the run's own message log (`Measured`: 2,097 for the manager; 1,957 with runs of closed Tasks) | Unchanged: every one of those messages is still shown, with the other agent's name, when that agent's run was dismissed | The whole behavior; each run's own conversation | Notes BEH-005; `evidence/team-tab-messages-2026-11-10.txt` |
| BEH-006 | User | SCN-004 | The Memory page lists a delegated run while its top run lists it | It keeps listing a dismissed run (DEC-002) | What the page shows of the run | Notes BEH-006 |
| BEH-007 | User | SCN-004 | The top run's token total and earlier attachments are found through the tree | Unchanged results | The whole behavior | Notes BEH-007 |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| The user | A long-lived manager run that stays light | The tree and what a load reads do not grow with closed Tasks | Nothing he uses disappears without his decision |
| Agents | Continue a run, give a follow-up Task | Works as today | No change to tools or texts |
| `autobyteus-461` | Builds on this | The entry rule in place for all three kinds of top run | — |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | A Task closes; its runs leave the top run's tree | SCN-001 |
| UC-002 | A closed Task is reopened and its assigner continues the run | SCN-002 |
| UC-003 | A run of closed Tasks gets a follow-up Task by its run ID | SCN-003 |
| UC-004 | The user looks at a top run, its Team tab, the Memory page, the Task page, token totals, earlier attachments | SCN-004 |
| UC-005 | A top run is loaded | SCN-005 |
| UC-006 | The app is upgraded with existing trees | SCN-006 |

### Out Of Scope

- Removing the hosting of delegated runs, Stop of a run that delegated, the stored back-link's shape, message routes (`autobyteus-461`).
- A timer that closes temporary Tasks.
- Deleting or archiving anything of a dismissed run.

### Non-Goals

- No new screen for dismissed runs.
- No change to what an agent reads.

### Preserved Behavior Boundary

BEH-001, BEH-004, BEH-007; REQ-002, REQ-005; AC-002, AC-003, AC-006, AC-007, AC-008.

### Prerequisites

None.

| Prerequisite ID | Finding And Evidence | Blocks (REQ / AC IDs) | Sent To (agent) / Task Key | Status |
| --- | --- | --- | --- | --- |
| — | — | — | — | — |

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or follow-up. It is not a required design correction, unless it is a prerequisite.
- A downstream reviewer comment does not amend this requirements basis. The Solution Designer must update the canonical requirements and obtain renewed user approval before a scope-changing proposal can govern design or implementation.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority / Criticality | Rationale | Feasibility Evidence | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-001 | When the last open Task of a delegated run closes, the run's entry is removed from the top run's tree, in the file and in the loaded run, also when the top run is not loaded. The run's own files, conversation, message log and Task record do not change. | BEH-002 | Critical | The user's rule | N/A (the data check shows the entry's facts are in the Task's record or the run's own file for 170 of 170) | Task 469 |
| REQ-002 | When a closed Task is reopened and its assigner messages the run, or the run is given a follow-up Task by its run ID, the run continues as today and its entry is back in the tree. | BEH-004 | Critical | The Task rules stay | N/A | Task 469 |
| REQ-003 | An entry stays while it should: a run with another open Task; a run of a temporary Task until that Task is closed or its creating run is deleted (no timer); a run that belongs to no Task; a sub-work run until its Task closes; an entry of a run on another node follows the same rule. | BEH-002 | High | The Task's rules | N/A | Task 469; DEC-003, DEC-004 |
| REQ-004 | The top run's tree shows the same rows as today (closed runs are hidden today). Loading a top run reads no file of a dismissed run. The Team tab shows the same messages and names as before a closure (DEC-001). The Memory page keeps listing a dismissed run (DEC-002). | BEH-003, BEH-005, BEH-006 | High | The outcome the user asked for; nothing disappears without his decision | N/A | DEC-001, DEC-002 |
| REQ-005 | Unchanged by a dismissal: the top run's token total; opening a file attached in an earlier conversation of any run; the Task page's run status and locator; a team run or org run whose message log names a dismissed run loads and works normally. | BEH-007 | Critical | "Must keep working" of the Task | N/A | Task 469; notes R-001 |
| REQ-006 | The rules hold for standalone agent runs, team runs and org runs as top runs. | BEH-002 | High | The Task | N/A | Task 469 |
| REQ-007 | A startup migration removes the entries of closed Tasks from existing trees. It changes nothing else, never prevents startup, leaves a tree it cannot read untouched and reports it, and a second start changes nothing. | BEH-002 | Critical | Data Migration Guideline; `DESIGN.md` rule 7 | N/A | Task 469 |
| REQ-008 | `collaboration_model.md` and the module docs state the rule. | BEH-002 | Medium | The canonical contract changes with the code | N/A | `DESIGN.md` |

## Acceptance Criteria

| Acceptance-Criteria ID | Related Requirement IDs | Related Behavior / Scenario IDs | Preconditions / Trigger | Observable Expected Outcome | Important Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-006 | SCN-001 | An agent delegates a Task; the Task is closed (for each kind of top run) | The run is stopped and its entry is no longer in the top run's tree file; its own files are byte-identical | The top run not loaded at that time: the same | Server tests; isolated instance for a standalone top run |
| AC-002 | REQ-002 | SCN-002 | AC-001's state; the Task is reopened; its assigner messages the run by run ID | The run continues with its conversation; its entry is in the tree again | Anyone else's message is refused with today's text | Server tests; isolated instance |
| AC-003 | REQ-002 | SCN-003 | AC-001's state; the assigner gives the run a follow-up Task by its run ID | As today; its entry is in the tree again | — | Server tests; isolated instance |
| AC-004 | REQ-003 | SCN-001 | A run with two open Tasks; one closes | The entry stays; it goes when the second closes | — | Server tests |
| AC-005 | REQ-003 | SCN-001 | A temporary Task left open; a run with no Task record | Their entries stay | — | Server tests; migration fixtures |
| AC-006 | REQ-005 | SCN-004 | A top run's token total is read before and after a closure | The same total | — | Server tests; isolated instance |
| AC-007 | REQ-005 | SCN-004 | A file attached in an earlier conversation of a dismissed run is opened | It opens | — | Server tests; isolated instance |
| AC-008 | REQ-005, REQ-006 | SCN-005 | A team run and an org run whose message logs name a dismissed run are loaded | They load and work; the message stays in the log | — | Server tests |
| AC-009 | REQ-007 | SCN-006 | Start on data with entries of closed Tasks, of open Tasks, of no Task, one unreadable tree | Closed entries are gone, the others stay, the unreadable tree is untouched and reported, the app starts; a second start changes nothing | — | Migration tests on small hand-built data per shape; isolated instance |
| AC-010 | REQ-004 | SCN-005 | A top run with dismissed and listed runs is loaded | No file of a dismissed run is read | — | Server test counting reads |
| AC-011 | REQ-004 | SCN-004 | A top run's Team tab, focused on the top run's own agent, before and after a Task with messages is closed; and after a restart | The same messages, each with the other agent's name as before | A listed run focused: its messages as today | Web and server tests; isolated instance |
| AC-012 | REQ-004 | SCN-004 | The Memory page's Agents list, after a run was dismissed | The dismissed run is listed and its memory opens, as before the closure | Its top run was deleted: as today | Server tests; isolated instance |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor / Initiator / Governing Contract | Coherent Goal Or Governing Event | Supported Trigger / Entry Surface | Starting Condition | Product-Level Steps Or Event Sequence | Expected Outcome | Supported Alternate / Error Behavior | Scenario Validity | Independent Evidence / Decision Reference | Related Requirement / AC IDs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | Contract | An agent with `update_task`; the user on the Task page | A Task's work ends | Task set to DONE or CANCELLED | Runs work on it | Close → runs stopped → entries removed | REQ-001, REQ-003 | — | Supported Normal Scenario | CM-6; Task 469 | REQ-001, REQ-003, REQ-006 / AC-001, AC-004, AC-005 |
| SCN-002 | Contract | The assigner | Continue closed work | Task reopened; `send_message_to` by run ID | The run was dismissed | Message → record reopened → entry back → run restored | REQ-002 | Not the assigner: refused | Supported Normal Scenario | `docs/modules/projects.md` "Reactivation" | REQ-002 / AC-002 |
| SCN-003 | Contract | The assigner | Another Task for the same run | `delegate_task` with a run ID and a Task | The run was dismissed | Assignment → entry back → work delivered | REQ-002 | — | Supported Normal Scenario | CM-6 | REQ-002 / AC-003 |
| SCN-004 | User | The user | Look at a run and its history | Tree, Team tab, Memory page, Task page, token totals, attachments | Runs were dismissed | Open | REQ-004, REQ-005 | — | Supported Normal Scenario | The Task's "must keep working" | REQ-004, REQ-005 / AC-006, AC-007, AC-011, AC-012 |
| SCN-005 | Operational | The node | Load a top run | First use, restore, open | Entries of open Tasks only | Load | REQ-004, REQ-005 | — | Supported Normal Scenario | Notes BEH-003 | REQ-004, REQ-005 / AC-008, AC-010 |
| SCN-006 | Operational | The node | Upgrade | First start | Existing trees | Migration → normal use | REQ-007 | A tree that cannot be read is left | Supported Normal Scenario | Data Migration Guideline | REQ-007 / AC-009 |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes` (existing surfaces)
- Linked UI/UX or interaction supplement: N/A — not applicable
- Linked runnable UI reference, separate design repository/root, UI/UX specification, and applicable support artifacts: N/A — not applicable
- Product ticket record and folder (externally owned): N/A — not applicable
- Design repository revision or commit: N/A — not applicable
- UI/UX user-confirmation reference: N/A — not applicable
- Approved visual-reference baseline: N/A — not applicable
- Normative visual and interaction details, including the approved final references: the tree and the Memory page are unchanged. The Team tab is unchanged (DEC-001). No surface changes visibly.
- Explicitly illustrative fixture content or permitted implementation variation: N/A
- Required screens, states, transitions, feedback, responsive behavior, or accessibility outcomes: none new.
- Product decisions that need the user (with reasoning and recommendation): none open. DEC-001 was answered by the user.

## Quality And Non-Functional Requirements

| Quality ID | Related Requirement / AC IDs | Area | Measurable Requirement Or Constraint | Conditions / Scope | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-004 / AC-010 | Performance | Loading a top run reads its tree, its own log and the files of the runs whose Task is open; none of a dismissed run | The user's hub: 145 entries, 11 open | A read-count test |
| QR-002 | REQ-007 / AC-009 | Reliability | The migration never prevents startup and removes only entries of closed Tasks | Every tree shape | Migration tests |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `Yes` (entries are removed from trees)
- Data or state that must be preserved: every run's own files, conversations, message logs, Task records
- Loss, reset, rebuild, or regeneration that is acceptable: a removed entry (its facts are in the Task's record and the run's own file; measured for all 170)
- Retention, privacy, compliance, volume, downtime, or operational constraints: no downgrade after the migration
- Unknowns requiring downstream investigation: notes U-001, U-002

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| Collaboration Model | Updated in the same change | `DESIGN.md` | None |
| Data Migration Guideline | Governs the migration | `data_migration_guideline.md` | None |

## Supplemental Artifacts

| Artifact Path | Purpose | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- |
| The 461 contract's §11 and §12 (path in the investigation notes) | The rules as cases with example files | REQ-001 … REQ-003 | Reference | Not this ticket's supplement |

## Assumptions

| Assumption ID | Assumption | Why It Is Necessary | Validation Plan / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | A removed entry can be rebuilt from the Task's record and the run's own file | REQ-002 | Architecture investigation | Open |

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | What does a top run's Team tab show of dismissed runs? | The only surface where a closure could have changed what the user sees | **A.** Only messages with the runs listed now. **B.** Every message stays | The Solution Designer first recommended A. The user answered that the UI must not differ. The follow-up check showed B costs nothing extra: the tab shows the focused agent's messages, and a top run's own agent has all of them in its own log, which a load reads anyway (2,097 for the manager); no log of a dismissed run is needed. Only the other agent's name has to come from somewhere else than the tree (design). | The user | **Decided by the user (2026-11-10): B, no visible change** |
| DEC-002 | Does the Memory page still list a dismissed run? | Visible: today a delegated run is listed only while its top run lists it; with A-or-B above, dismissed runs would vanish from the Memory page | **A.** Keep listing it (the test becomes "its top run still exists"). **B.** Let it go from the Memory page | Dismissing a run ends its work, not its memory; the user asked in October that a hub's delegated runs' data is never lost. **Recommendation: A.** | Solution Designer | Decided: A (the Task lists the Memory page under "must keep working") |
| DEC-003 | An entry of a run on another node | Same list | Same rule / keep for good | The same rule: the entry goes when its Task closes | Solution Designer | Decided |
| DEC-004 | A timer for temporary Tasks | Stale entries | Timer / none | None: 1 of 15 temporary Tasks is open (19 days); a timer would cut off later follow-ups; the user was asked and the recommendation given | Solution Designer | Decided (the user informed) |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | Acceptance-Criteria IDs | Scenario IDs | Supplemental / Product Design Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-002 | AC-001 | SCN-001 | 461 contract §11 L3 |
| REQ-002 | UC-002, UC-003 | BEH-004 | AC-002, AC-003 | SCN-002, SCN-003 | §11 L4, L5 |
| REQ-003 | UC-001 | BEH-002 | AC-004, AC-005 | SCN-001 | §11 L6 … L10 |
| REQ-004 | UC-004, UC-005 | BEH-003, BEH-005, BEH-006 | AC-010, AC-011, AC-012 | SCN-004, SCN-005 | — |
| REQ-005 | UC-004, UC-005 | BEH-007 | AC-006, AC-007, AC-008 | SCN-004, SCN-005 | — |
| REQ-006 | UC-001 | BEH-002 | AC-001, AC-008 | SCN-001 | — |
| REQ-007 | UC-006 | BEH-002 | AC-009 | SCN-006 | — |
| REQ-008 | UC-006 | BEH-002 | — (document review) | SCN-006 | — |

## Architecture Phase Input

- Approved scenario IDs and product-level behavior paths architecture must map: SCN-001 … SCN-006 (after approval).
- Product and system constraints architecture must preserve: the Preserved Behavior Boundary; `DESIGN.md`; the Data Migration Guideline.
- Decisions intentionally deferred to architecture design: who removes and re-adds an entry (loaded and not loaded); the Task-side lookup; each reader of "the agents of a tree".
- Technical facts architecture should verify: notes R-001, U-001, U-002; ASM-001.
- Known feasibility or integration risks: R-001.

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

- Approval recorded (the user's, or yours within the direction with the user informed): `Yes`
- Exact requirements and supplement approval basis recorded: `Yes` (`SR-002`; no supplement)
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: none
