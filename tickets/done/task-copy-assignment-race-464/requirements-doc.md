# Requirements Document — task-copy-assignment-race-464

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-001`
- Package identifier: `task-copy-assignment-race-464`
- Request / ticket: Project Task `autobyteus-464` (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`); FU-005 of autobyteus-447
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`)
- Requirements owner: Solution Designer
- Date: 2026-11-10
- Approved by and reference: `Solution Designer within the direction (user informed)`. The Task comment carries the user's word: "choices within this direction are the team's; only a change of product direction goes to the user. Keep it simple." The user was informed in the Solution Designer's conversation on 2026-11-10.
- Exact approved requirements baseline / solution revision: this document at SR-001
- Behavior-defining supplements: None

## Problem And Desired Outcome

- **Problem.** A Manager can close a copy's Task (`update_task` DONE) and give the same copy its next Task (`delegate_task` with the copy's run ID) as parallel tool calls in one turn. Under load the assignment is then refused after its commit: "Task B was given to the task agent, but the message with its work was not delivered (… could not continue with its conversation: Task TeamRun '…' is already active or reserved.)". B's entry is marked failed, and the Manager must recover by hand. Reproduced on base `c8f303af70` (REPRO-01).
- **Cause.** The closure release that DONE starts stops the copy outside the root's lifecycle queue. The assignment checks the copy (open) at its queue step, then commits outside the queue. A release that starts in between is still stopping the copy when the delivery's wake tries to restore it, so the restore is refused. See investigation notes.
- **Desired outcome.** In both orders (DONE first or assignment first), the assignment is delivered and the copy ends live, working on the next Task. A copy is never stopped by a release that arrives after an assignment or reactivation reopened it.
- **Observable definition of success.** A deterministic test of this interleaving fails on base and passes with the fix (AC-003). The gated EXC-E2E-004 passes under load (AC-004). Nothing else about delegation changes (AC-005).

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User (agent) | SCN-001 | When DONE(A) commits after the assignment's queue step saw the copy open but before B's commit, A's release stops the copy while B is committed and delivered. The wake finds it neither live nor gone, and B's work is refused ("already active or reserved") | B is delivered and the copy ends live on B, in every interleaving | The delegation result shapes and texts; the Task records (B assigned, A DONE) | REPRO-01 |
| BEH-002 | User (agent) | SCN-002 | The same split exists for reactivation (`send_message_to` to a closed copy by its assigner after reopening its Task): its commit `reopenAssignment` runs after its queue step, outside the queue | The same rule: a release arriving after the reopen never stops the reopened copy, and one arriving before is settled before the commit | Reactivation's refusals (`TASK_REACTIVATION_STOP_PENDING`, a DONE that wins, unrestorable conversation) | Code read (`root-task-execution-lifecycle.ts:296-307`) |
| BEH-003 | System | SCN-003 | DONE or CANCELLED of a copy's last open Task stops the copy; a repeated DONE asks again; root termination stops everything | Unchanged | All of it, including "closing one of several open Tasks stops nothing" | `projects.md` "Follow-up Task to an existing copy" |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| A Manager agent (for example the Project Task Manager) | Close a Task and give the follow-up to the same copy, possibly as parallel tool calls | The follow-up is delivered whatever the order | No new tool, field or text to learn |
| The user | Board work that does this pattern | No manual recovery after such a turn | Keep it simple (Task comment) |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | Close a copy's Task and give the same copy its next Task in one turn, in either order, in any root kind (standalone Agent, Team, Org) and for either copy kind (Agent copy, Team copy) | SCN-001 |
| UC-002 | Reactivate a closed copy by message while a closure release for it is in flight | SCN-002 |

### Out Of Scope

- Any change to the Task side's rules (who may assign, several open Tasks, DONE/CANCELLED semantics, the Task locks).
- Idle shutdown, user Stop, model change and root termination ordering (already queued, or unchanged).
- FU-006 of autobyteus-447 (`task-copy-idle-lifetime` under load), a separate follow-up.
- Remote (peer) copies: a saved Task is never given to a run on a peer node (AR-003); fencing unchanged.

### Non-Goals

- A general rework of the root lifecycle queue or the registries.

### Preserved Behavior Boundary

- BEH-003 entirely; all existing refusals and their texts; the delegation results; the published `closed`/`reopened` events in the order their commits happen.

### Prerequisites

None.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or follow-up.
- A downstream reviewer comment does not amend this requirements basis.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority | Rationale | Feasibility Evidence | Source |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-001 | An existing-copy assignment racing a DONE (or CANCELLED) of the copy's earlier Task is delivered, and the copy ends live on the new Task, in either order, for all three root kinds and both copy kinds | BEH-001 | Must | The Task's goal; the user's board pattern | PROTO-01: prototype passed twice under load; both orders exercised (25 and 27 releases settled or skipped) | Task autobyteus-464 |
| REQ-002 | A closure release never stops a copy that an assignment or reactivation has reopened. A release that comes first is settled before the reopening commits | BEH-001, BEH-002 | Must | The root's own documented rule ("a copy already open is never released") must hold for every order | PROTO-01 | Code comment `root-task-execution-lifecycle.ts:311-313`; design-case Principle 13 |
| REQ-003 | A deterministic test reproduces the failing interleaving: copy open at the assignment's queue step, then DONE commits, then its release is still in flight across B's commit and the wake. It fails on base and passes with the fix; the same for reactivation | BEH-001, BEH-002 | Must | The Task asks for a test that reproduces the race; the existing QR-001 cases miss this interleaving | N/A | Task "Done when" |
| REQ-004 | Existing behavior unchanged (BEH-003); no new tool argument, result field or agent-facing text | BEH-003 | Must | Keep it simple | N/A | Task comment |
| REQ-005 | The module docs describe the order (closure release and reopening commits serialized per root) | BEH-001 | Should | Docs follow the code | N/A | DESIGN.md |

## Acceptance Criteria

| Acceptance-Criteria ID | Related Requirement IDs | Related Behavior / Scenario IDs | Preconditions / Trigger | Observable Expected Outcome | Important Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-002 | BEH-001 / SCN-001 | Unit fixture: copy open; assignment's queue step reached; DONE(A) closes; A's release held in flight | `delegated: true`; B open; copy live; no refusal | — | New unit case (fails on base) |
| AC-002 | REQ-001, REQ-002 | BEH-001 / SCN-001 | Existing QR-001 orders (DONE first; release after commit) | Unchanged outcomes | — | Existing unit cases |
| AC-003 | REQ-002, REQ-003 | BEH-002 / SCN-002 | Unit fixture: reactivation by message with a closure release in flight | Reactivated copy live and delivered; never stopped after the reopen | Existing refusals unchanged | New unit case |
| AC-004 | REQ-001 | BEH-001 / SCN-001 | Gated `task-existing-copy-assignment` (scripted AGY), under load | EXC-E2E-004 passes; the whole file passes | A failure caused by the user's Codex usage limit is recorded, not fixed (user direction, 2026-11-10); none expected (scripted AGY) | Gated run alone and inside the scripted-AGY gated set |
| AC-005 | REQ-004 | BEH-003 / SCN-003 | Server unit, integration; the gated delegation suites (scripted AGY) | All pass; no texts or results changed | — | Runs |
| AC-006 | REQ-005 | — | — | `projects.md` and `agent_team_execution.md` state the order | — | Docs review |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor | Goal | Trigger | Starting Condition | Steps | Expected Outcome | Alternate / Error | Validity | Evidence | Related IDs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User (agent) | Manager agent | Close A, hand B to the same copy | Parallel `update_task(A, DONE)` and `delegate_task(copy, B)` in one turn | Copy works on A, assigned by the Manager | Both calls run at once | B delivered; copy live on B | Real refusals (another assigner, closed root) unchanged | Supported Normal Scenario (agents issue parallel tool calls; documented pattern in `projects.md`) | EXC-E2E-004; Task text | REQ-001, REQ-002; AC-001, AC-002, AC-004 |
| SCN-002 | User (agent) | Assigner | Reopen a closed copy by message | `send_message_to(copy)` after reopening its Task, while a release of it is in flight | Copy closed by DONE | Message reactivates | Copy restored and receives the message | Existing reactivation refusals | Supported Explicit Edge Scenario (documented reactivation; overlap with a release is the same race) | Code read | REQ-002, REQ-003; AC-003 |
| SCN-003 | System | Task side | Stop a copy whose last open Task closed | DONE/CANCELLED | — | Release requested | Copy stopped | Repeated DONE re-requests | Supported Normal Scenario | `projects.md` | REQ-004; AC-005 |

## UI, Interaction, And Experience Requirements

- Applicable: `No` (N/A — not applicable for every Product design field)

## Quality And Non-Functional Requirements

| Quality ID | Related IDs | Area | Measurable Requirement Or Constraint | Conditions | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-001 | Reliability | No interleaving of DONE and the assignment refuses the assignment for a race | Any load | AC-001, AC-004 |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `No` (ordering of runtime steps only; Task records written as today).

## External Contracts And Dependencies

None beyond the codebase.

## Supplemental Artifacts

| Artifact Path | Purpose | Related IDs | Status | Approval |
| --- | --- | --- | --- | --- |
| `evidence/REPRO-01-race-diagnostics.log` | The reproduced failure with the logged sequence | REQ-001 | Current | Evidence |
| `evidence/PROTO-01-queued-release-prototype.log` | Prototype of the fix under load | REQ-001, REQ-002 | Current | Evidence |

## Assumptions

| Assumption ID | Assumption | Why It Is Necessary | Validation Plan / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | Nothing awaits the closure release inside a queue step (else queuing it could deadlock) | Design D1 | Read: `TaskExecutionResourceRelease.release` is fire-and-forget (`task-execution-resource-release.ts:13`); `discardReleasedExecution` settles releases directly, not through `releaseTaskExecutions` | Verified by reading; implementation confirms with the suites |

## User Direction In Force

The user's word for 2026-11-10: a failure caused by the Codex usage limit is recorded, not fixed today; other failures are fixed. This ticket plans no live Codex call.

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | Deliver in both orders, or refuse with clear guidance? | The Task allows either | Deliver (PROTO-01 shows it is simple and works); refuse (the Manager must retry; the current failure already leaves a failed entry) | Delivering is what the Manager meant and the documented rule promises ("several open Tasks"). The fix that delivers is small. **Deliver** | Solution Designer | Decided |
| DEC-002 | Also fix reactivation's identical split? | Same race on a parallel path | Yes (consistency, Principle 1); no (narrower) | It is the same queue step and commit shape; leaving it would keep the race on the second form. **Yes** | Solution Designer | Decided |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | Acceptance-Criteria IDs | Scenario IDs | Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001 | AC-001, AC-002, AC-004 | SCN-001 | REPRO-01, PROTO-01 |
| REQ-002 | UC-001, UC-002 | BEH-001, BEH-002 | AC-001, AC-003 | SCN-001, SCN-002 | PROTO-01 |
| REQ-003 | UC-001, UC-002 | BEH-001, BEH-002 | AC-001, AC-003 | SCN-001, SCN-002 | — |
| REQ-004 | UC-001 | BEH-003 | AC-005 | SCN-003 | — |
| REQ-005 | UC-001 | BEH-001 | AC-006 | SCN-001 | — |

## Architecture Phase Input

- Scenarios to map: SCN-001, SCN-002. Constraints: BEH-003; no texts or results change. Verify: no queue step awaits a closure release (ASM-001); root termination still releases.

## Readiness Check

- Content ready for approval: `Yes`. Approval recorded (Solution Designer within the direction, user informed): `Yes`. Ready for design: `Yes`.
