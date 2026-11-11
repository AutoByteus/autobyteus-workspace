# Requirements Document

## Document Status

- Status: `Ready for Approval` (SR-014, 2026-11-11). PRE-001 (`autobyteus-469`) is delivered and verified (`prerequisite-469-delivery-receipt-verification.md`); this ticket resumed on `origin/personal` `827f1e68dc`. The behavior-defining supplement is re-validated and rewritten on that base as contract revision 5, which changes the approved revision 2 in the points of its §9.1. It needs the user's decisions TC-7, TC-8, TC-9 and DEC-011 before it governs the design. The approval of SR-007 applies to revision 2 only. Earlier: **waiting for prerequisite PRE-001** (the user's decision of 2026-11-10: the growing collaboration tree is fixed first, as its own Task; this ticket continues afterwards). Before that: `Approved` at SR-007, with one open delta at SR-010: DEC-011 (which message routes exist between runs), raised by the architecture review, `Ready for Approval` and waiting for the user. Nothing else changed.
- Current solution revision ID: `SR-014`
- Package identifier: `delegated-copies-outlive-delegator-461`
- Request / ticket: Project Task `autobyteus-461` (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`)
- Requested by (the user, or the delegating agent's address): `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), with the user's decisions of 2026-11-10 in the Solution Designer's conversation
- Requirements owner: Solution Designer
- Date: 2026-11-10
- Approved by and reference: `User` for the direction and every decision that needed him, all on 2026-11-10 in the Solution Designer's conversation: the structure is corrected in this ticket ("we should start to refactor in this ticket … put the data model correct"), contract first ("we always start with the contract"), the contract after its data validation ("after you validate it if it works … we're definitely go for this approach"; then "I agree with your decision one and three", "I like your recommendation" on the second, and `subWork`). The remaining details: `Solution Designer within the direction (user informed)`.
- Exact approved requirements baseline / solution revision: this document at `SR-007` with the contract below
- Behavior-defining supplements and their approved versions: `target-collaboration-contract.md`, revision 2 with TC-1 … TC-6 decided (as committed at SR-007) Revision 5 (SR-014) is proposed and not approved.
- History: SR-001 … SR-003 were a smaller baseline (change only what Stop covers) and its design; the user replaced that direction at SR-004. Their IDs are kept below where the meaning is kept; `solution-revision-record.md` indexes the rounds.

## Problem And Desired Outcome

- Problem: a run that was delegated is stored and run as a part of another run (its "coordinating run", the top of the delegation chain), which hosts, idles, wakes and stops it. So stopping the Project Task Manager stopped every team working for it. The relationship is wrong in the data model and the code follows the data model.
- Affected actors or systems: the user; every run that delegates and every delegated run; the Task side; run history and the run tree in the web client (also shown by the phone apps); stored run data.
- Desired outcome: a delegated run is an ordinary run with a link to the run that delegated it, as the contract defines. Each run owns its life; a Task owns the work. This ticket puts the contract in place and builds it for delegations made from a standalone agent run; delegations made from team runs and org runs follow in their own Tasks (TC-4).
- Observable definition of success: on an isolated instance, an agent delegates a long task; the user stops the delegating agent; the delegated run keeps running and finishes; its result wakes the delegator; closing the Task stops the delegated run; existing delegated runs of standalone runs keep working after the upgrade.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | SCN-001 | Stop of a standalone agent run stops every local run it (or anything below it) delegated to, then its own agent | Stop of a run stops that run only | History, conversation, resume by the next message | Notes BEH-001 (`Reproduced` at unit level) |
| BEH-002 | User | SCN-002 | Stop of a team run or org run stops its members and every delegated run they started | Not changed by this ticket (TC-4): next Tasks | The whole behavior until then | Notes BEH-002 (`Read`) |
| BEH-003 | System | SCN-003 | A message to a host that is not running makes it ready first; after a Stop no local delegated run is alive to send | A delegated run's message wakes its stopped delegator, once | Messages between running runs | Notes BEH-003 (`Read`) |
| BEH-004 | User | SCN-004 | Stop of one delegated run also stops the runs it delegated to | For a run delegated from a standalone run: that run only (TC-1) | A delegated team run still stops as a whole; the runs its members delegated to stop with it until the next Task | Notes BEH-004 (`Read`) |
| BEH-005 | Contract | SCN-004 | Closing a Task stops its runs that have no other open Task; a closed run takes no input except its assigner's reactivation; runs of different Tasks cannot message each other | Unchanged | The whole behavior | Notes BEH-005 (`Read`) |
| BEH-006 | Operational | SCN-007 | Shutdown ends everything; a run is restored by its next message; an update restart resumes busy runs but skips those of a stopped root | Unchanged, except that a busy delegated run is resumed after an update whether or not its delegator was stopped | Shutdown order; the update-restart rule | Notes BEH-006 (`Read`) |
| BEH-007 | User | SCN-006 | Archive or delete of a run ends a still-loaded root and its children first; a deleted run's delegated runs keep their folders and are hidden ("detached") | Refused while a run it delegated to is working; its delegated runs are never deleted with it and are then listed as runs of their own (TC-2, TC-3) | Archive and delete of a run with no working delegated run | Notes BEH-007 (`Read`); contract §5 E6 |
| BEH-008 | System | SCN-008 | A run delegated to a peer is an ordinary run there with `delegatedFrom`; it is not stopped with its delegator; its message restores the delegator | Unchanged; its stored back-link follows the contract (rename) | The whole behavior | Notes BEH-008 (`Read`) |
| BEH-009 | User | SCN-005 | Opening a standalone run's collaboration view starts its own agent | Opening or watching never starts or resumes a run | Messages resume | Notes BEH-009 (`Read`) |
| BEH-010 | Contract | SCN-009 | A local delegated run's file has a `taskAgent` section naming the top of the chain; the Task record has `hostRoot`; a remote one has `delegatedFrom` | The stored shapes of the contract (§2), for the runs this ticket reaches; existing data converted | Conversations, memory, message logs, Task records' content | Notes "Data-level validation" (`Measured`) |
| BEH-011 | User | SCN-010 | A delegated run is shown only inside its coordinating run's view, with copy-only versions of Stop, model choice, files and conversation | A delegated run of a standalone run is an ordinary run: shown under the run that delegated it, and opened, watched, messaged, configured while stopped, archived and deleted like any run | What the user can do with it today | Contract §5–§6 |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| The user | Stop, reconfigure and resume a coordinating run without losing delegated work; see the relationship | REQ-001 … REQ-007 | Simple rules; existing data keeps working |
| A delegated run | Do its Task's work and report | Its report reaches its delegator | No change to agent tools or their texts |
| The Task side | End a Task's work | Closing a Task stops its runs | Unchanged rules |
| Later Tasks (team runs, org runs) | Build the same contract | One contract, approved once | No rework of this ticket's shapes |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | A standalone agent run (started by the user, or itself delegated) delegates to an Agent or an Agent Team on this node; the user stops, resumes, reconfigures either run | SCN-001, SCN-010 |
| UC-002 | A delegated run messages its delegator, running or stopped; the delegator messages it | SCN-003 |
| UC-003 | A Task is closed or reopened; a follow-up Task is given to the same run | SCN-004 |
| UC-004 | The user watches delegated runs | SCN-005 |
| UC-005 | The user archives or deletes a run that delegated | SCN-006 |
| UC-006 | The server restarts | SCN-007 |
| UC-007 | A delegation to or from a peer node | SCN-008 |
| UC-008 | The app is upgraded with existing delegated runs | SCN-009 |

### Out Of Scope

- Delegations made by a member of a team run and by a unit of an org run: those runs stay hosted by that team or org run, with today's behavior, until their own Tasks (follow-ups FU-003, FU-004); the removal of the remaining hosting code is FU-005.
- `autobyteus-460` (a running agent does not learn that a skill was added or removed).
- Stop on Task closure across nodes, attachments to a peer, and the other remote steps named in `collaboration_model.md` § 4.
- A Memory page view for runs whose delegating run was deleted (they are ordinary runs now).
- A hard kill or power loss; a plain restart resuming busy runs.

### Non-Goals

- No "stop this run and everything it delegated" action (DEC-008). Closing the Task does that.
- No new store, inbox or queue for messages.
- No change to what an agent reads: tool names, parameters, results and collaboration texts.

### Preserved Behavior Boundary

BEH-002, BEH-005, BEH-006 (except the stated addition), BEH-008; REQ-005, REQ-008, REQ-009, REQ-010 and AC-005, AC-009, AC-012, AC-013; every behavior of delegations made from team runs and org runs.

### Prerequisites

| Prerequisite ID | Finding And Evidence | Blocks (REQ / AC IDs) | Sent To (agent) / Task Key | Status |
| --- | --- | --- | --- | --- |
| PRE-001 | A run's collaboration tree keeps an entry for every run it ever delegated to, also after the run's Task is closed, and grows for good. Evidence (read-only, the user's data, `investigation-notes.md` and `evidence/data-model-validation/task-record-validation-2026-11-10.txt`): the manager's tree has 145 entries, 134 of closed Tasks; loading the run also reads 143 own files of listed runs; of 196 delegated runs 170 belong only to closed Tasks; for all 170 the entry's facts are also in the Task's record or the run's own file. The user decided on 2026-11-10 to fix this first, on the current structure, and to return to this ticket afterwards ("let's first fix the problem regarding the collaboration tree which is constantly growing … and then after this problem is fixed we come back to this ticket again"). It is other functionality than this ticket's (which removes the hosting); this ticket's contract §11 and §12 are its rules | All (the user's ordering): this ticket's design is rebuilt on the result | `/project_task_manager`, 2026-11-10 (`handoff-waiting-for-prerequisite.md`); Task key: to be created | Sent Delivered: `827f1e68dc`, verified Terminal on 2026-11-11 |

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or follow-up. It is not a required design correction, unless it is a prerequisite.
- A downstream reviewer comment does not amend this requirements basis. The Solution Designer must update the canonical requirements and obtain renewed user approval before a scope-changing proposal can govern design or implementation.
- The contract (`target-collaboration-contract.md`) is part of this basis: a design or implementation that needs a stored shape, word or rule it does not contain returns here.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority / Criticality | Rationale | Feasibility Evidence | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-001 | Stop of a standalone agent run stops that run only. A run it delegated to, at any depth, on this node or a peer, keeps running. Stop of a delegated run of a standalone run stops that run only. | BEH-001, BEH-004 | Critical | The user's decision; contract P6, TC-1 | N/A | Task 461 want 1; DEC-010; TC-1 |
| REQ-002 | A delegated run of a standalone run is shown under the run that delegated it, once, with its real status and its own Stop, in the desktop and phone layouts. It is opened, watched, messaged, configured while stopped, archived and deleted like any run. A quiet delegated run is shut down after the idle grace period and woken by its next message. | BEH-011 | Critical | Contract P1, §5 | N/A | Contract; TC-3 |
| REQ-003 | A message a delegated run sends to its stopped delegator wakes the delegator: it resumes with its conversation and receives the message once. It is never lost or refused because the delegator is stopped. The same holds for a message to a stopped or idle delegated run. | BEH-003 | Critical | The platform's standard rule | N/A | DEC-001 (the user) |
| REQ-004 | Opening or watching a run, a delegated run or their conversations never starts or resumes a run. | BEH-009 | High | Otherwise watching undoes a Stop | N/A | Investigation BEH-009 |
| REQ-005 | The Task rules are unchanged for runs delegated from a standalone run: closing a Task stops its runs that have no other open Task (assigned and sub-work); a closed run takes no input except its assigner's reactivation; reopening starts nothing; runs of different Tasks cannot message each other by run ID; a follow-up Task can be given to a run by its ID. | BEH-005 | Critical | Contract P5; the Task rules stay | N/A | Task 461 want 3; CM-6 |
| REQ-006 | A stopped run's own settings are editable while the runs it delegated to work, and a stopped delegated run's settings are saved like any stopped run's. | BEH-001, BEH-011 | High | "Change the manager's configuration without losing the work"; TC-5 | N/A | Task 461; TC-5 |
| REQ-007 | Archive and delete of a run are refused, with the reason shown to the user, while a run it delegated to is working. They never delete a delegated run. A delegated run whose delegating run was deleted is listed as a run of its own. | BEH-007 | High | TC-2, TC-3 | N/A | TC-2; TC-3 (the user) |
| REQ-008 | Server shutdown and restart stay as today; after an update restart a busy delegated run is resumed whether or not its delegator was stopped, and a stopped run is not resumed. | BEH-006 | Medium | DEC-007 | N/A | Task 461 want 4 |
| REQ-009 | Everything else a user or an agent can do today with a delegation made from a standalone run keeps working: `delegate_task` to an address (described work and a saved Task) and to an existing run by its ID, with the same results and texts; the Project's folder and launch inheritance of a new delegated run; the launch notes; the Task page with each run's status and locator; a delegated run's files, conversation, context files and token usage, and the delegating run's token roll-up; tool approval and interrupt; `@` mentions; the restart notice. | BEH-011 | Critical | No regression | N/A | Preserved behavior |
| REQ-010 | Unchanged by this ticket: Stop and every other behavior of delegations made from team runs and org runs (also from a delegated team run's members), and termination of an application-owned run by its application. | BEH-002 | High | TC-4 | N/A | TC-4 (the user) |
| REQ-011 | Stored data follows the contract (§2, §3) for every run delegated from a standalone run and for runs started by a peer; the Task record's sub-work role is `subWork`. Existing data is converted once at startup: nothing is lost, a run that cannot be converted is left intact and reported, and the app starts and stays usable. The shapes the contract removes that this ticket cannot yet remove (they serve runs hosted by team and org runs) are named in the design and belong to the next Tasks. | BEH-010 | Critical | Contract P4, P7; `DESIGN.md` rules 7 and 10; Data Migration Guideline | N/A (no uncertain technology; the data check shows every stored run converts) | Contract; DEC-010 |
| REQ-012 | `collaboration_model.md` and `GLOSSARY.md` carry the contract's words and rules, with a current-state table that says which delegating run kinds follow it. | BEH-010 | High | The canonical contract changes with the code | N/A | `DESIGN.md` project documents |

## Acceptance Criteria

| Acceptance-Criteria ID | Related Requirement IDs | Related Behavior / Scenario IDs | Preconditions / Trigger | Observable Expected Outcome | Important Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-002 | BEH-001 / SCN-001 | A standalone agent delegated a long task to an Agent, and to a Team; the user stops the delegating agent | The delegating agent is stopped; the delegated run's turn is not interrupted; it stays running under the stopped run and finishes | A run delegated by a delegated agent run also keeps running | Isolated instance, real runtime; server tests |
| AC-002 | REQ-003 | BEH-003 / SCN-003 | AC-001's state; the delegated run reports to the delegator by run ID, and by address | The delegator resumes with its conversation and the report is in it once | The send is accepted | Isolated instance; server tests |
| AC-003 | REQ-003, REQ-009 | SCN-003 | The user resumes the stopped delegator with a message | It resumes; it messages its delegated runs by run ID (waking an idle one) and receives their later messages | — | Isolated instance |
| AC-004 | REQ-001 | BEH-004 / SCN-004 | A delegated agent run A of a standalone run delegated to B; the user stops A | A stops; B keeps running; B's report wakes A | — | Server tests; isolated instance |
| AC-005 | REQ-005 | BEH-005 / SCN-004 | The Task of a delegated run is closed while the delegator is stopped, and while it runs | The run stops and shows as closed; a message to it is refused with the closed-Task text; after the Task is reopened the assigner's message continues it, a sub-work run stays closed | A follow-up Task given by run ID reopens its record as today | Server tests; isolated instance for close |
| AC-006 | — | BEH-002 | Retired at SR-003; team and org runs are FU-003 and FU-004 | — | — | — |
| AC-007 | REQ-004 | BEH-009 / SCN-005 | A stopped run with a running delegated run; the user opens both and the delegated run's conversation, desktop and phone layout | Live output of the delegated run; the stopped run stays stopped | A message to the delegated run wakes only it | Web tests; isolated instance |
| AC-008 | REQ-007 | BEH-007 / SCN-006 | The user archives or deletes a run whose delegated run is working; then when none is working | Refused, and the reason is shown; then it succeeds, the delegated runs' folders stay, and each is listed as a run of its own | — | Server and web tests; isolated instance |
| AC-009 | REQ-008 | BEH-006 / SCN-007 | Shutdown and start with a stopped run and its delegated runs | Plain restart: each run offline with its conversation, continued by its next message. Update restart: a busy delegated run gets the restart notice; the stopped delegator does not | — | Server tests |
| AC-010 | REQ-006 | SCN-001 | A stopped run with a running delegated run: the user saves its model; a stopped delegated run: the user saves its model | Both saved and used at the next start; no run is interrupted | — | Server tests; isolated instance |
| AC-011 | REQ-001, REQ-011 | BEH-008 / SCN-008 | A delegation to a peer; a run started by a peer on this node | As today; the peer-started run's file carries `delegatedFrom.delegatingRun` | — | Server tests; two nodes where available, otherwise stated as read |
| AC-012 | REQ-009, REQ-010 | SCN-002, SCN-010 | The preserved operations of REQ-009; a team run and an org run whose members delegated are stopped; a delegated team run is stopped | REQ-009's list works; the team and org runs behave as today (their members' delegated runs stop with them) | — | Existing tests adapted or green; isolated instance for delegate, Task page, files |
| AC-013 | REQ-002 | SCN-010 | A delegated run becomes quiet | Shut down after the grace period; woken by its next message | A run waiting for tool approval or with a background task is not shut down | Server tests |
| AC-014 | REQ-011 | BEH-010 / SCN-009 | Start on a data folder holding every existing shape of the contract's §5 that this ticket converts | Each run has the contract's shape; conversations, logs, Task records and links are intact; a second start changes nothing; an unreadable run is left as it was and reported while every other run is converted | The app starts in every case | Migration tests on small hand-built data of each shape (Data Migration Guideline); isolated instance started on such data |
| AC-015 | REQ-012 | BEH-010 | — | The two documents state the contract and the current state by delegating run kind | — | Document review |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor / Initiator / Governing Contract | Coherent Goal Or Governing Event | Supported Trigger / Entry Surface | Starting Condition | Product-Level Steps Or Event Sequence | Expected Outcome | Supported Alternate / Error Behavior | Scenario Validity | Independent Evidence / Decision Reference | Related Requirement / AC IDs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | The user | Stop a coordinating agent without losing delegated work | Stop on a standalone agent run | It delegated runs that are working | Stop → the agent stops → the delegated runs keep working → the user edits settings or sends a message → the run resumes | Delegated runs were never interrupted | — | Supported Normal Scenario | Task 461 (the real case) | REQ-001, REQ-006 / AC-001, AC-010 |
| SCN-002 | User | The user | The same for a team run or org run | Stop on that run | A member delegated a run | Not in this ticket (TC-4) | Today's behavior | — | Supported Normal Scenario (deferred: FU-003, FU-004) | TC-4 | REQ-010 / AC-012 |
| SCN-003 | System | A delegated run; a delegator | Report, ask, answer | `send_message_to` by run ID or address | The receiver is stopped, idle or running | The message is delivered; a receiver that is not running is restored first | The receiver has the message once | Closed Task: refused with the Task text | Supported Normal Scenario | Task 461 want 2; DEC-001 | REQ-003 / AC-002, AC-003 |
| SCN-004 | User / Contract | The user; an agent with `update_task` | Stop one run; end or continue a Task's work | Stop on a delegated run; `update_task`; `delegate_task` with a run ID | Any | As REQ-001 and REQ-005 | — | — | Supported Normal Scenario | Task 461 want 3; TC-1 | REQ-001, REQ-005 / AC-004, AC-005 |
| SCN-005 | User | The user | Watch delegated work | Selecting a run or a delegated run in the run tree | The delegating run is stopped | Open → read live output | Nothing starts | — | Supported Normal Scenario | Investigation BEH-009 | REQ-004 / AC-007 |
| SCN-006 | User | The user | Archive or delete a run | Archive / Delete | It delegated runs | Refused while one works; else done, and the delegated runs become runs of their own | — | — | Supported Explicit Edge Scenario | TC-2, TC-3 | REQ-007 / AC-008 |
| SCN-007 | Operational | The node | Shutdown, restart, update restart | Quit, Restart server, update | Runs and delegated runs exist | Everything ends → next start | REQ-008 | — | Supported Normal Scenario | Task 461 want 4 | REQ-008 / AC-009 |
| SCN-008 | System | Two nodes | Delegation across nodes | `delegate_task` with `node`; a peer's delegation | Remote collaboration on | As today | — | — | Supported Normal Scenario | CM-10, CM-11 | REQ-001, REQ-011 / AC-011 |
| SCN-009 | Operational | The node | Upgrade | First start of the new release | Existing delegated runs | Startup migration → normal use | REQ-011 | A run that cannot be converted is left and reported | Supported Normal Scenario | Data Migration Guideline; contract §5 | REQ-011 / AC-014 |
| SCN-010 | User | The user | Work with a delegated run as a run | The run tree, Settings, the Task page | A standalone run delegated | Open, message, stop, resume, configure, archive, delete the delegated run | REQ-002, REQ-009 | — | Supported Normal Scenario | Contract §5; the user ("a normal run … start it, stop it like any other") | REQ-002, REQ-009 / AC-012, AC-013 |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes` (existing surfaces)
- Linked UI/UX or interaction supplement: N/A — not applicable
- Linked runnable UI reference, separate design repository/root, UI/UX specification, and applicable support artifacts: N/A — not applicable
- Product ticket record and folder (externally owned): N/A — not applicable
- Design repository revision or commit: N/A — not applicable
- UI/UX user-confirmation reference: N/A — not applicable
- Approved visual-reference baseline: N/A — not applicable
- Normative visual and interaction details, including the approved final references: the run tree keeps its shape: a delegated run is a row under the run that delegated it, with its status and its own Stop; it is not listed a second time among the top-level runs unless its delegating run was deleted. No new screen.
- Explicitly illustrative fixture content or permitted implementation variation: N/A
- Required screens, states, transitions, feedback, responsive behavior, or accessibility outcomes: a stopped run with running delegated runs; the refusal of archive and delete with its reason; a delegated run listed as a run of its own after its delegating run was deleted.
- Product decisions that need the user (with reasoning and recommendation): none open.

## Quality And Non-Functional Requirements

| Quality ID | Related Requirement / AC IDs | Area | Measurable Requirement Or Constraint | Conditions / Scope | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-001 / AC-001 | Reliability | A delegated run's running turn is not interrupted by its delegator's Stop | Every agent runtime | Server tests on the shared path; one real runtime |
| QR-002 | REQ-003 / AC-002 | Reliability | A message between a run and its delegated run is delivered exactly once and stored in both runs' logs | Local and remote | Server tests |
| QR-003 | REQ-011 / AC-014 | Reliability | The migration never prevents startup and never deletes data | Every existing shape; a stop in the middle | Migration tests; a second start is a no-op |
| QR-004 | REQ-002 | Performance | Opening a run that delegated reads its links, not the content of every run it delegated to | The user's hub: one run with 144 links | A work-count check in a server test (reads per open) |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `Yes`
- Data or state that must be preserved: every run's conversation, memory, message logs, files; every link; every Task record's content
- Loss, reset, rebuild, or regeneration that is acceptable: none
- Retention, privacy, compliance, volume, downtime, or operational constraints: the user's data today: 196 delegated runs, 197 links, 407 Task records; no downgrade after the migration, as in any upgrade that changes stored data
- Unknowns requiring downstream investigation: contract §7.2 (V-8 … V-12)

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| Collaboration Model, Glossary | Updated to the contract in the same change | `DESIGN.md` | None |
| Data Migration Guideline | Governs the migration | `autobyteus-server-ts/docs/design/data_migration_guideline.md` | Released migrations that read these shapes (contract V-11) |
| The peer protocol between nodes | Both nodes run the same release (`DESIGN.md` rule 9); a renamed wire field is a clean cut | `DESIGN.md` | None |

## Supplemental Artifacts

| Artifact Path | Purpose | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- |
| `target-collaboration-contract.md` | The contract: words, rules, records with example JSON, cases, attribute check, existing data, simulations, decisions | All | Revision 2, approved (TC-1 … TC-6 decided) | Behavior-defining; approved by the user, 2026-11-10 |
| `evidence/data-model-validation/validate_delegation_shapes.py`, `counts-2026-11-10.txt` | The read-only data check | REQ-011 | Current | Evidence |
| `follow-ups.md` | FU-002 … FU-005 | REQ-010 | Current | Not behavior-defining |

## Assumptions

| Assumption ID | Assumption | Why It Is Necessary | Validation Plan / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | An application-owned run's termination by its application is not the user's Stop | REQ-010 | Solution Designer | Accepted |
| ASM-003 | A delegated run can run under its own root with the features of REQ-009, as a run started by a peer already runs under its own root | REQ-002, REQ-009 | Investigation notes F-2 (the link machinery and peer-started runs) and F-3 (what a linked run lacks, each designed in `design-spec.md`); the review's AR-001 … AR-004 added the Task membership, the location consumers and restart resume (design RC-1, RC-3, RC-4) | Confirmed by reading; one part became DEC-011 |

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | A message to a stopped delegator | Visible behavior | Wake / hold | Wake: the platform's standard rule | The user | Decided, 2026-11-10 |
| DEC-004 | Archive or delete of a run whose delegated runs work | Running work | Refuse / stop / detach | Refuse with the reason (contract TC-2) | Solution Designer | Decided |
| DEC-006 | Application-owned runs | Other callers of Stop | Same / unchanged | Unchanged | Solution Designer | Decided |
| DEC-007 | Server shutdown and restart | The Task leaves it to the team | Keep / change | Keep, with the update-restart addition | Solution Designer | Decided |
| DEC-008 | A one-click "stop this run and all it delegated" | Today's Stop did that | Add / no | No; closing the Task does it | Solution Designer | Decided |
| DEC-011 | Which messages by run ID and by address exist between two runs? | Without hosting, every route must exist on purpose (architecture review AR-002) | A: links only / B: links and the Task / **centered on the Task with today's reach** | **Centered on the Task** (contract §10): two runs may talk when they work on one open Task, or one is the run that assigned the other's Task; by address, the sender's team, then the standing agents of the run that assigned its Task. Validated on 1,604 stored messages: 1,540 as today; the 64 others involve the 15 legacy runs; none newly allowed | The user | **Decided by the user, 2026-11-11** ("the routing strategy will be centered around the task itself"; "let's go with this approach") |
| DEC-010 | Change what Stop covers, or correct the structure | The cause | SR-003 design / the contract | The structure, in this ticket | The user | Decided, 2026-11-10 |
| TC-1 … TC-6 | See the contract §9 | — | — | — | The user (TC-1, TC-3, TC-4, TC-6); Solution Designer (TC-2, TC-5) | Decided |
| DEC-002, DEC-003, DEC-005, DEC-009 | Earlier scope and cascade decisions | — | — | Superseded by DEC-010, TC-1, TC-3, TC-4 (history in `solution-revision-record.md`) | — | Superseded |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | Acceptance-Criteria IDs | Scenario IDs | Supplemental / Product Design Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001, UC-007 | BEH-001, BEH-004 | AC-001, AC-004, AC-011 | SCN-001, SCN-004, SCN-008 | Contract P6, TC-1 |
| REQ-002 | UC-001, UC-004 | BEH-011 | AC-001, AC-013 | SCN-010 | Contract P1 |
| REQ-003 | UC-002 | BEH-003 | AC-002, AC-003 | SCN-003 | Contract §6 |
| REQ-004 | UC-004 | BEH-009 | AC-007 | SCN-005 | — |
| REQ-005 | UC-003 | BEH-005 | AC-005 | SCN-004 | Contract P5 |
| REQ-006 | UC-001 | BEH-001, BEH-011 | AC-010 | SCN-001 | Contract TC-5 |
| REQ-007 | UC-005 | BEH-007 | AC-008 | SCN-006 | Contract TC-2, TC-3 |
| REQ-008 | UC-006 | BEH-006 | AC-009 | SCN-007 | — |
| REQ-009 | UC-001, UC-003 | BEH-011 | AC-003, AC-012 | SCN-010 | — |
| REQ-010 | UC-001 | BEH-002 | AC-012 | SCN-002 | Contract TC-4 |
| REQ-011 | UC-007, UC-008 | BEH-008, BEH-010 | AC-011, AC-014 | SCN-008, SCN-009 | Contract §2, §3, §5 |
| REQ-012 | UC-008 | BEH-010 | AC-015 | SCN-009 | Contract |

## Architecture Phase Input

- Approved scenario IDs and product-level behavior paths architecture must map: SCN-001, SCN-003 … SCN-010 (SCN-002 is deferred).
- Product and system constraints architecture must preserve: the Preserved Behavior Boundary; the contract; `DESIGN.md` (smallest solution; no speculative machinery; rule 7 containment; rule 10 stored names); the Data Migration Guideline.
- Decisions intentionally deferred to architecture design: the exact cut line of this step (which shapes the contract removes can be removed now); how a delegated run of a standalone run runs under its own root with REQ-009's features; the local path of a message between two runs; the Task side without a host; the migration; the client's tree through links.
- Technical facts architecture should verify: contract V-8 … V-12; ASM-003.
- Known feasibility or integration risks: REQ-009 is a wide surface; a part of it may prove to depend on hosting in a way that needs a decision.

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Product design and supplemental evidence is integrated consistently: `Yes`
- Applicable UI/UX approval and final visual-reference basis are recorded: `N/A`
- Material assumptions and decisions are visible, each decision with reasoning and recommendation: `Yes`
- Content ready for approval: `Yes`
- Remaining content blocker: none. TC-7, TC-8, TC-9 and DEC-011 were decided by the user on 2026-11-11; the user's approval of the whole package follows his review of the design draft

### Approved Basis Ready For Design

- Approval recorded (the user's, or yours within the direction with the user informed): `No` for revision 5 (revision 2 was approved at SR-007)
- Exact requirements and supplement approval basis recorded: `Yes`
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: the user's decisions on contract revision 5
