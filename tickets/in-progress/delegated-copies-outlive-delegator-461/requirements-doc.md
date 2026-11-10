# Requirements Document

## Document Status

- Status: `Ready for Approval`
- Current solution revision ID: `SR-001`
- Package identifier: `delegated-copies-outlive-delegator-461`
- Request / ticket: Project Task `autobyteus-461` (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`)
- Requested by (the user, or the delegating agent's address): `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), carrying the user's decision of 2026-11-10
- Requirements owner: Solution Designer
- Date: 2026-11-10
- Approved by and reference: not yet approved; the user approves the direction (the Task requires it) and decides DEC-001
- Exact approved requirements baseline / solution revision: none yet
- Behavior-defining supplements and their approved versions: none

## Problem And Desired Outcome

- Problem: stopping a run that delegated work also stops every delegated copy (task agent, task agent team) it started. The user stopped the Project Task Manager to make it pick up changed configuration and lost the hours-long work of several teams.
- Affected actors or systems: the user; delegating runs (standalone Agent run, Team run, Org run); their delegated copies, local and on a peer node; the Task side; restart resume; the web client (also shown by the phone apps).
- Desired outcome: Stop stops the run the user stopped, not the work it delegated. The copies keep running, stay visible and controllable, and can still report back; nothing they send is lost.
- Observable definition of success: on an isolated instance, an agent delegates a long task to a copy, the user stops the delegating agent, the copy keeps running and finishes, and its result reaches the delegator; stopping one copy by itself and closing its Task still work.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | SCN-001 | Stop of a standalone Agent run stops every local copy of the run (any depth), then its own agent | Stop stops only the run's own agent; copies keep running | The run's history, conversation and resume by the next message | Investigation notes BEH-001 (`Reproduced` at unit level) |
| BEH-002 | User | SCN-002 | Stop of a Team run or Org run stops its members and every local copy in one scope | Stop stops only the run's own agents (Team members; an Org's direct agents and the members of its mounted Teams); copies keep running | The Team/Org shows as stopped and resumes as today | Notes BEH-002 (`Read`) |
| BEH-003 | System | SCN-003 | A copy's message to its delegator makes a not-running host ready and is delivered; after a Stop no local copy is alive to send | A copy's message to a stopped delegator is never lost (DEC-001 decides how it arrives) | Messages between running runs | Notes BEH-003 (`Read`) |
| BEH-004 | User | SCN-004 | Stop of one copy stops it and the copies it started; refused when the delegating run is not loaded | Unchanged, and it works while the delegating run is stopped | The whole behavior | Notes BEH-004 (`Read`) |
| BEH-005 | Contract | SCN-004 | Closing a Task stops its copies that have no other open Task | Unchanged, and it works while the delegating run is stopped | The whole behavior | Notes BEH-005 (`Read`) |
| BEH-006 | Operational | SCN-007 | Server shutdown or restart ends everything; copies keep their conversations and wake on their next message; only an update restart resumes busy runs, and it skips runs whose root was stopped on purpose | Unchanged, except that an update restart also resumes a busy copy whose delegator was stopped | Shutdown order and the update-restart rule | Notes BEH-006 (`Read`) |
| BEH-007 | User | SCN-006 | Archive or delete of a stopped run ends a still-loaded root first, stopping its children | Refused while a copy of the run is running; unchanged otherwise | Archive and delete of a run with no running copy | Notes BEH-007 (`Read`) |
| BEH-008 | System | SCN-008 | A copy on a peer node keeps running when its delegator is stopped; its later message restores the delegating run and wakes the receiver | Unchanged; it also keeps its live status under the stopped delegator | The whole behavior | Notes BEH-008 (`Read`) |
| BEH-009 | User | SCN-005 | Opening a standalone run's collaboration view starts its own agent when it is not running | Opening or watching a stopped run or its copies never resumes the run's own agents | Messages still resume | Notes BEH-009 (`Read`) |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| The user | Stop a coordinating run (to change its configuration, or to halt it) without losing delegated work | Copies keep running, stay visible and stoppable one by one | Simple rules; no new screens |
| A delegated copy | Finish its Task's work and report | Its report or question reaches the delegator | No change to its tools |
| The delegating run | Coordinate its copies | It gets every message its copies sent | Its conversation is kept |
| The Task side | End a Task's work | Closing a Task still stops its copies | Unchanged rules |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | The user stops a run they started (standalone Agent run, Team run, Org run) that has delegated copies | SCN-001, SCN-002 |
| UC-002 | A copy messages its stopped delegator | SCN-003 |
| UC-003 | The user stops one copy, or a Task is closed, while the delegating run is stopped or running | SCN-004 |
| UC-004 | The user watches the copies of a stopped run | SCN-005 |
| UC-005 | The user archives or deletes a run whose copies are running | SCN-006 |
| UC-006 | The server restarts while copies of a stopped run exist | SCN-007 |
| UC-007 | The user stops a run that delegated to a peer node | SCN-008 |
| UC-008 | The user edits a stopped run's own settings while its copies run | SCN-001, SCN-002 |

### Out Of Scope

- `autobyteus-460` (a running agent does not learn that a skill was added or removed). Its own ticket.
- Moving local copies from "hosted by the coordinating run" to "linked like remote runs" (`collaboration_model.md` § 5, "Local runs: hosting"). The coordinating run keeps coordinating its copies.
- Stop of a run a peer node started (`delegatedFrom`), by its owner through the link or on its own node: it is a delegated copy, and its Stop stays as today.
- Termination of an application-owned run by its application.
- A hard kill or power loss of the server (restart resume's FU-001), and a plain restart resuming busy runs (the user's earlier decision, restart resume DEC-001).
- Remote lifecycle control not yet built (stop on Task closure across nodes).

### Non-Goals

- No new "stop this run and all its copies" action. To stop everything, the user stops the copies (or closes their Tasks) and the run.
- No new store, inbox or queue for messages.
- No new screen; the run tree keeps its shape.

### Preserved Behavior Boundary

BEH-004, BEH-005, BEH-006 (except the stated addition), BEH-008; Stop of a run with no copies; a stopped run's history, conversation, model editing and resume by message; idle shutdown and wake of copies; REQ-005, REQ-008, REQ-010 and AC-004, AC-005, AC-012, AC-013.

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
| REQ-001 | When the user stops a run they started (standalone Agent run, Team run, Org run), only the run's own agents stop. Every delegated copy started in that run, at any depth, local or on a peer node, keeps running and can finish. | BEH-001, BEH-002, BEH-008 | Critical | The user's decision; copies do independent work | N/A | Task 461, want 1; DEC-002 |
| REQ-002 | The copies of a stopped run stay listed under it with their real status. The user can open, watch, message and stop each one; a quiet copy is still shut down after the idle grace period and woken by its next message; copies can still delegate sub-work. | BEH-001, BEH-002 | Critical | A running copy must stay visible and controllable | N/A | Task 461, open questions; DEC-005 |
| REQ-003 | A message a copy sends to its stopped delegator (a result or a question) is never lost and never refused because the delegator is stopped. | BEH-003 | Critical | The user's requirement | N/A | Task 461, want 2; **DEC-001 (Needs user)** decides the rule |
| REQ-004 | Opening or watching a stopped run, its copies or their conversations never resumes the stopped run's own agents. Only a message resumes them. | BEH-009 | High | Otherwise watching the copies would undo the Stop | N/A | Investigation BEH-009; DEC-001 |
| REQ-005 | The user's Stop of one copy stays as today (the copy and the copies it started; its next message restores it), and closing a Task stays as today. Both also work while the delegating run is stopped. | BEH-004, BEH-005 | Critical | The Task rules stay | N/A | Task 461, want 3; DEC-003 |
| REQ-006 | A stopped run's own settings stay editable while its copies run, as for any stopped run, and apply when it resumes. | BEH-001, BEH-002 | High | The goal behind the Task: change the manager's configuration without losing the work | N/A | Task 461, "Why it matters" |
| REQ-007 | Archive and delete of a run are refused while a copy of that run is running, with a message that says so. Once its copies are stopped or finished they work as today. | BEH-007 | High | A history action must not silently end running work | N/A | DEC-004 |
| REQ-008 | Server shutdown and restart stay as today: everything ends; a copy keeps its conversation and continues when it is next messaged; only an update restart resumes busy runs. An update restart also resumes a busy copy whose delegator was stopped; the stopped delegator is not resumed by the restart. | BEH-006 | Medium | The server's end is a different case; an independent copy must not be skipped because of its delegator | N/A | Task 461, want 4; DEC-007 |
| REQ-009 | Stop of a run with no delegated copies, and every resume path of a stopped run, behave as today. | BEH-001, BEH-002 | Critical | No regression of the common case | N/A | Preserved behavior |
| REQ-010 | Stop of a run a peer node started, and termination of an application-owned run by its application, stay as today. | BEH-008 | Medium | A delegated copy's Stop is unchanged; an application owns its runs | N/A | DEC-006 |

## Acceptance Criteria

| Acceptance-Criteria ID | Related Requirement IDs | Related Behavior / Scenario IDs | Preconditions / Trigger | Observable Expected Outcome | Important Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-002 | BEH-001 / SCN-001 | A standalone agent delegated a long task to a copy (an Agent, and a Team); the user stops the delegating agent | The delegating agent is stopped; the copy's turn is not interrupted, it stays running under the stopped run and finishes | A copy started by that copy also keeps running | Isolated instance, real runtime; server tests |
| AC-002 | REQ-003 | BEH-003 / SCN-003 | AC-001's state; the copy sends its result to the delegator | Per DEC-001. Recommended rule: the delegator resumes with its conversation and the result is in it, once | The copy's send is accepted | Isolated instance; server tests |
| AC-003 | REQ-003, REQ-009 | SCN-003 | The user resumes the stopped delegator with a message before any copy reports | It resumes as today; it can message its copies by run ID and receives their later messages | — | Isolated instance |
| AC-004 | REQ-005 | BEH-004 / SCN-004 | The delegating run is stopped and its copy is running; the user stops the copy | The copy and the copies it started stop; the copy's next message restores it | The same on a running delegator, as today | Server tests; isolated instance |
| AC-005 | REQ-005 | BEH-005 / SCN-004 | The delegating run is stopped; the copy's Task is closed (DONE or CANCELLED) | The copy stops and shows as closed, as today | — | Server tests |
| AC-006 | REQ-001, REQ-002, REQ-003 | BEH-002 / SCN-002 | A member of a Team run, and a unit of an Org run, delegated to a copy; the user stops the Team run / Org run | The run's own agents stop and the run shows as stopped; the copy keeps running and finishes; its message to its delegator arrives per DEC-001 | — | Server tests; isolated instance for one of the two kinds at least |
| AC-007 | REQ-004 | BEH-009 / SCN-005 | A stopped run with a running copy; the user opens the run, the copy and the copy's conversation, in the desktop layout and the phone layout | The copy's live output is shown; the stopped run's own agents stay stopped | — | Web tests; isolated instance |
| AC-008 | REQ-007 | BEH-007 / SCN-006 | A stopped run with a running copy; the user archives or deletes the run | Refused with a message naming the running copies; nothing stops | After the copies are stopped or finished, archive and delete work as today | Server tests |
| AC-009 | REQ-008 | BEH-006 / SCN-007 | A stopped run with a running copy; the server is shut down and started again | After a plain restart the copy is offline with its conversation and continues on its next message. After an update restart a copy that was busy is resumed with the restart notice; the stopped delegator is not resumed | — | Server tests of restart resume |
| AC-010 | REQ-006 | SCN-001, SCN-002 | A stopped run with a running copy; the user changes the stopped run's model settings | Saved; the run uses them when it resumes; the copy is not interrupted | — | Server tests; isolated instance for the standalone case |
| AC-011 | REQ-001, REQ-002 | BEH-008 / SCN-008 | A run delegated to a peer node; the user stops the run | The remote copy keeps running and keeps its status under the stopped run | — | Where a second node is available; otherwise stated as verified by reading |
| AC-012 | REQ-009, REQ-010 | SCN-001 | A run with no copies is stopped; a peer-started run is stopped; an application ends its run | As today | — | Existing tests stay green |
| AC-013 | REQ-002 | SCN-001 | A copy of a stopped run becomes quiet | It is shut down after the idle grace period and woken by its next message, as today | — | Server tests |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor / Initiator / Governing Contract | Coherent Goal Or Governing Event | Supported Trigger / Entry Surface | Starting Condition | Product-Level Steps Or Event Sequence | Expected Outcome | Supported Alternate / Error Behavior | Scenario Validity | Independent Evidence / Decision Reference | Related Requirement / AC IDs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | The user | Stop a coordinating agent (to change its configuration or halt it) without losing delegated work | Stop on a standalone Agent run (run tree, header) | The run delegated one or more copies that are working | Stop → the agent stops → the copies keep working → the user edits the run's settings or sends a message → the run resumes | The copies were never interrupted | A run without copies stops as today | Supported Normal Scenario | Task 461 (the user's real case; the manager is a standalone Agent run, investigation notes) | REQ-001, REQ-002, REQ-006, REQ-009 / AC-001, AC-010, AC-012, AC-013 |
| SCN-002 | User | The user | The same for a Team run or an Org run whose members delegated | Stop on the Team run / Org run | A member delegated a copy that is working | As SCN-001 | As SCN-001 | — | Supported Normal Scenario | Task 461, want 1 ("agent, team or org run") | REQ-001, REQ-002, REQ-006 / AC-006, AC-010 |
| SCN-003 | System | A delegated copy | Report a result or ask a question | `send_message_to` to the delegator's run ID or address | The delegator is stopped | The copy sends → the message is delivered per DEC-001 | The delegator has the message | — | Supported Normal Scenario | Task 461, want 2 | REQ-003 / AC-002, AC-003 |
| SCN-004 | User / Contract | The user; an agent with `update_task` | Stop one copy; end a Task's work | Stop on a copy; `update_task` DONE/CANCELLED | The delegating run is stopped or running | As today | As today | — | Supported Normal Scenario | Task 461, want 3 | REQ-005 / AC-004, AC-005 |
| SCN-005 | User | The user | Watch delegated work while the coordinator is stopped | Selecting the run or a copy in the run tree (desktop and phone layout) | A stopped run with a running copy | Open the run → open the copy → read its live output | The stopped run stays stopped | — | Supported Normal Scenario | Investigation BEH-009 | REQ-004 / AC-007 |
| SCN-006 | User | The user | Archive or delete a run | Archive / Delete on a stopped run | Its copy is running | The action is refused with the reason | Nothing stops | Works once no copy runs | Supported Explicit Edge Scenario | DEC-004 | REQ-007 / AC-008 |
| SCN-007 | Operational | The node | Shutdown, restart, update restart | Quit, Restart server, update | A stopped run with copies | Everything ends → next start | Copies offline with their conversations; an update restart resumes the busy ones | — | Supported Normal Scenario | Task 461, want 4; `restart_resume.md` | REQ-008 / AC-009 |
| SCN-008 | User | The user | Stop a run that delegated to a peer node | Stop on the run | A remote copy is working | Stop → the remote copy keeps working on its node | It reports back as in SCN-003 | — | Supported Normal Scenario | CM-10, CM-11 | REQ-001, REQ-002 / AC-011 |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes` (existing surfaces only)
- Linked UI/UX or interaction supplement: N/A — not applicable
- Linked runnable UI reference, separate design repository/root, UI/UX specification, and applicable support artifacts: N/A — not applicable
- Product ticket record and folder (externally owned): N/A — not applicable
- Design repository revision or commit: N/A — not applicable
- UI/UX user-confirmation reference: N/A — not applicable
- Approved visual-reference baseline: N/A — not applicable
- Normative visual and interaction details, including the approved final references: the run tree is unchanged in shape. After Stop, the stopped run's row shows as stopped as today, and each copy's row keeps its own live status and its own Stop control, in the desktop layout and the phone layout (the phone apps show the web client).
- Explicitly illustrative fixture content or permitted implementation variation: N/A
- Required screens, states, transitions, feedback, responsive behavior, or accessibility outcomes: a stopped run with running copies; the refusal message of archive/delete (REQ-007).
- Product decisions that need the user (with reasoning and recommendation): DEC-001.

## Quality And Non-Functional Requirements

| Quality ID | Related Requirement / AC IDs | Area | Measurable Requirement Or Constraint | Conditions / Scope | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-001 / AC-001 | Reliability | A copy's running turn is not interrupted by its delegator's Stop | Every agent runtime the copy can run on | Server tests on the shared path; one real runtime on the isolated instance |
| QR-002 | REQ-003 / AC-002 | Reliability | A copy's message to a stopped delegator is delivered exactly once | Local and remote copies | Server tests |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `Unknown` (no change needed by the requirements; the architecture phase decides whether a Team/Org run needs a stored fact)
- Data or state that must be preserved: every run's conversation, message logs, execution trees and Task records
- Loss, reset, rebuild, or regeneration that is acceptable: none
- Retention, privacy, compliance, volume, downtime, or operational constraints: none
- Unknowns requiring downstream investigation: investigation notes U-001

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| Collaboration Model (`collaboration_model.md`) | CM-7 gets the new Stop rule; § 5 and the three root module docs are updated in the same change | `DESIGN.md` "Project-specific design documents" | None |
| Task ownership (CM-6) | Unchanged | `collaboration_model.md` | None |

## Supplemental Artifacts

| Artifact Path | Purpose | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- |
| None | — | — | — | — |

## Assumptions

| Assumption ID | Assumption | Why It Is Necessary | Validation Plan / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | An application-owned run's termination by its application is not the user's Stop | Keeps that path unchanged (REQ-010) | Solution Designer, DEC-006 | Accepted |
| ASM-002 | The stopped delegator's coordinating record can stay loaded on the node until the server ends or the run is archived or deleted | REQ-002, REQ-005 | Architecture investigation | Open |

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | What happens to a message a copy sends to its stopped delegator? | Visible behavior: does a stopped run resume by itself? | **A. Wake:** the delegator resumes with its conversation and gets the message. **B. Hold:** the delegator stays stopped; the message waits and is delivered when the user resumes it. Evidence: wake is already the rule for a user-stopped copy ("its next message restores it"), for a crashed host, and for a remote copy's message to a stopped delegator. | A needs no new store and is one rule everywhere: a stopped agent resumes on its next message, whoever sends it. It keeps the pipeline moving (a team's report is handled with the manager's new configuration). Its cost: a stopped manager does not stay stopped while its copies still report; to keep it quiet the user stops those copies too, and a report can arrive while the user edits the stopped run's settings (the Save then says the run is active). B respects "stopped stays stopped", but needs a durable waiting list, an order rule on resume and a "messages waiting" hint, and work stalls unseen if the user forgets to resume. **Recommendation: A.** | The user | **Needs user** |
| DEC-002 | Which runs get the new rule? | Scope | Standalone Agent runs only (the real case) / also Team and Org runs | The Task names all three, and one rule for every run kind is simpler to explain than a rule per kind. All three. | Solution Designer | Decided |
| DEC-003 | Does Stop of one copy still stop the copies it started? | The Task says "as today" | Keep / change to the new rule | A top-level run's copies work on their own Tasks; a copy's own copies do sub-work of its Task. Stopping a copy stops that Task's work, so the cascade stays. | Solution Designer | Decided |
| DEC-004 | Archive or delete of a run whose copies run? | Today a still-loaded root's children are stopped by it | Refuse / stop the copies / let them run detached | Stopping them silently repeats this ticket's problem; detached copies would have nobody to report to. Refuse with the reason, as an active run is refused today. | Solution Designer | Decided |
| DEC-005 | Who coordinates a copy when its delegator is stopped, and where is it listed? | The Task's open question | The Project, the Task, the node, or the delegating run's record | Nothing moves: the copy stays under the run that delegated it, that run's coordinating record stays loaded while its own agents are stopped, and the copy's Task still decides when its work ends. No new owner. | Solution Designer | Decided |
| DEC-006 | Peer-started runs and application-owned runs? | Other callers of the same Stop | Same rule / unchanged | A peer-started run is a delegated copy; an application owns its runs. Unchanged. | Solution Designer | Decided |
| DEC-007 | Server shutdown and restart? | The Task leaves it to the team | Keep / change | Keep: everything ends with the server; copies keep their conversations and continue on their next message; an update restart resumes busy runs. One addition: a busy copy is resumed after an update even when its delegator was stopped. | Solution Designer | Decided |
| DEC-008 | A one-click "stop this run and all its copies"? | Today's Stop did that | Add / not now | Not asked for; the user stops copies one by one or closes their Tasks. Not now. | Solution Designer | Decided |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | Acceptance-Criteria IDs | Scenario IDs | Supplemental / Product Design Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001, UC-007 | BEH-001, BEH-002, BEH-008 | AC-001, AC-006, AC-011 | SCN-001, SCN-002, SCN-008 | — |
| REQ-002 | UC-001, UC-004 | BEH-001, BEH-002 | AC-001, AC-006, AC-011, AC-013 | SCN-001, SCN-002, SCN-008 | — |
| REQ-003 | UC-002 | BEH-003 | AC-002, AC-003, AC-006 | SCN-003 | — |
| REQ-004 | UC-004 | BEH-009 | AC-007 | SCN-005 | — |
| REQ-005 | UC-003 | BEH-004, BEH-005 | AC-004, AC-005 | SCN-004 | — |
| REQ-006 | UC-008 | BEH-001, BEH-002 | AC-010 | SCN-001, SCN-002 | — |
| REQ-007 | UC-005 | BEH-007 | AC-008 | SCN-006 | — |
| REQ-008 | UC-006 | BEH-006 | AC-009 | SCN-007 | — |
| REQ-009 | UC-001 | BEH-001, BEH-002 | AC-003, AC-012 | SCN-001 | — |
| REQ-010 | UC-001 | BEH-008 | AC-012 | SCN-001 | — |

## Architecture Phase Input

- Approved scenario IDs and product-level behavior paths architecture must map: SCN-001 … SCN-008 (after approval).
- Product and system constraints architecture must preserve: the Preserved Behavior Boundary; CM-6; simple, existing mechanisms first (`DESIGN.md`).
- Decisions intentionally deferred to architecture design: how each root kind keeps coordinating its copies while its own agents are stopped; how a Team or Org run shows as stopped while its coordinating record stays loaded (investigation notes U-001); the client's Stop flows (U-002).
- Technical facts architecture should verify: the facts marked `Read` in the investigation notes for Team and Org roots.
- Known feasibility or integration risks: U-001 decides the size of the Team/Org part. If it proves out of proportion, the Solution Designer returns to the user with a slicing proposal before design continues.

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
- Remaining content blocker: DEC-001 needs the user

### Approved Basis Ready For Design

- Approval recorded (the user's, or yours within the direction with the user informed): `No`
- Exact requirements and supplement approval basis recorded: `No`
- Approved requirements package ready for architecture design: `No`
- Remaining blocker: the user's approval of the direction and DEC-001
