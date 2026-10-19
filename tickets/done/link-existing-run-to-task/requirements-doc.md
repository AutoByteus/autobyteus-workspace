# Requirements Document

> **WITHDRAWN (SR-018, the user, 2026-10-18).** The adoption feature is withdrawn: the merged first version
> (`4e738acc66`) is removed and the full-adoption revision (SR-010 … SR-017) is cancelled unmerged. The sections below
> the "Removal requirements" block are kept as the record of what was tried. See solution-revision-record SR-018.

## Removal Requirements (SR-018, approved by the user, 2026-10-18)

| ID | Requirement | Verification |
| --- | --- | --- |
| RM-001 | Every product change of merge `4e738acc66` (server, web, contracts, product docs, tests, fixtures) is removed; behavior returns to before adoption: `delegate_task {target_*_run_id, task_id}` on a run that is not one of the delegator's delegated runs is refused as before ("not a delegated copy in this run"). | Source diff against `4e738acc66^1` limited to later tickets' changes; suites green |
| RM-002 | Changes made by tickets merged after `4e738acc66` (append-only message logs, delegated-copies-slow-open, chat-socket-content-cadence, agent-run-input-state-cleanup, segment-lifecycle-error-flood) are kept intact while resolving the revert. | Review of the three conflicting files; those tickets' tests green |
| RM-006 | Only adoption logic is removed; no other functionality changes. A fix made in `4e738acc66` that is useful on its own (it improves behavior for never-adopted runs) is **kept** and listed in the implementation handoff with what it fixes and its evidence (the user, 2026-10-18: "if those fix will need to fix them anyways in the future, then why don't we keep it"). Only a change whose nature is unclear (general fix or adoption-only) is decided with the Solution Designer first. | Implementation handoff list of kept fixes; source review |
| RM-003 | No data migration: no run was ever adopted (the only real attempt, Work Journal, was refused; read-only check on the user's install by the delivery engineer, DR-003). | Records |
| RM-004 | The ticket folder stays as the record (moved back to `tickets/done/` with a withdrawal note); the release notes of the next release say the beta's adoption feature was withdrawn. | Docs |
| RM-005 | After the removal is delivered, a new **beta** is published (the user, 2026-10-18: "After the adoption logic are completely being removed, then we should publish a new beta"). | Delivery: release report |


## Document Status

- Status: `Withdrawn` (SR-018)
- Current solution revision ID: `SR-018`
- Package identifier: `link-existing-run-to-task`
- Request / ticket: Project Task `autobyteus-11`
- Requested by: `/project_task_manager` (relaying the user, 2026-10-18)
- Requirements owner: Solution Designer
- Date: 2026-10-18
- Approved by and reference: `User`, 2026-10-18 — adoption confirmed ("after adopting … the lifecycle will be bounded to the task itself. Of course, that's actually what we want"); DEC-101, 102, 105 in the user's words; DEC-103 taken as confirmed with that answer (stated back to the user). DEC-107 by the Solution Designer within the direction, user informed.
- Exact approved requirements baseline: SR-003 (this document, 2026-10-18)
- Behavior-defining supplements: `adoption-contract.md` (SR-017; consolidates the approved adoption behavior with every case and its validation; the user reads it)
- History: SR-001 (approved 2026-10-18) defined a visibility-only link; kept for reference in
  `superseded-requirements-link-only.md` / `superseded-design-link-only.md`. The user then explained the real goal
  (SR-003): the PM should be able to give a Task to a run the user started by hand, so that run joins the Task's
  lifecycle as if the PM had delegated it — shown under the PM, closed and gone when the Task is done.

## Problem And Desired Outcome

- Problem: before Tasks existed the user started agent and team runs by hand (e.g. 411 Software Engineering Team runs in
  the superrepo workspace, the PM's workspace; read-only data check 2026-10-18). Work on a Task can only be given to a new
  copy (`delegate_task`) or to the delegator's own earlier delegated runs. A hand-started run that is already doing the
  work cannot be given the Task; it stays outside the Task's lifecycle and the user cleans it up by hand.
- Desired outcome: the PM (any agent allowed to delegate a Task) gives a Task to an existing hand-started run in its own
  workspace with `delegate_task`, by run id. From then on that run is the PM's delegated run for that Task, exactly like
  one the PM started: shown under the PM with its Task line, slept / woken by the PM, stopped and removed from the
  sidebar when the Task is DONE or CANCELLED, reactivated by the PM after reopening.
- Success: the user asks the PM to give `autobyteus-10` (Work Journal) to the existing run working on it; it appears
  under the PM with the Task line; closing the Task stops it and it leaves the sidebar.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Scenario | Current | Desired | Preserved | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | SCN-001 | `delegate_task {target_*_run_id, task_id}` works only for the delegator's own earlier delegated runs whose current Task is DONE / CANCELLED | Also accepts a hand-started run in the delegator's workspace that belongs to no Task and is idle; it becomes the delegator's delegated run for that Task and receives the Task as its next work, continuing its conversation | All current `delegate_task` modes and checks | projects.md §Follow-up Task to an existing copy |
| BEH-002 | User | SCN-002 | the run shows in its own group (e.g. TEAMS) | it shows under the PM with its Task line, like any delegated run; its own-group row is gone | the run's files and conversation | sidebar tree (`AgentRunTaskRows.vue`); the user's screenshot |
| BEH-003 | System | SCN-003 | — | lifecycle as any delegated run: idle shutdown and wake by the PM; DONE / CANCELLED stops it and it leaves the sidebar; reactivation by the PM after reopening; Task rules (sub-work, messaging scope) apply | copies unchanged | projects.md §DONE, §Reactivation; CM-6, CM-7 |
| BEH-004 | — | — | Withdrawn (SR-005) | — | — | — |

## Stakeholders, Actors, And Outcomes

| Actor | Goal | Outcome | Constraint |
| --- | --- | --- | --- |
| User | Bring a hand-started run into a Task's lifecycle | Ask the PM; the run moves under the PM and closes with the Task | Only the runs the PM is asked to take |
| PM | Manage the Task's worker | Delegate the Task to the existing run | Same workspace; run idle; run belongs to no Task |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Scenarios |
| --- | --- | --- |
| UC-001 | Delegate a Project Task to an existing hand-started agent run or team run in the delegator's workspace (adoption) | SCN-001 |
| UC-002 | The adopted run is shown, coordinated and closed exactly like a delegated run | SCN-002, SCN-003 |
| UC-003 | Withdrawn (SR-005) | — |

### Out Of Scope

- Runs in another workspace (follow-up after Task 6fb6e21b, delegated runs with their own workspace).
- A visibility-only link (SR-001's model) and any Task-page or run-side UI action for it.
- Organization runs, individual team members, runs owned by a Task, runs that are part of another run.
- Adopting in the middle of a running turn.
- Changes to new-copy delegation or to copies' lifecycle.

### Non-Goals

- Bulk adoption of old runs (the PM decides one run at a time).

### Preserved Behavior Boundary

Every current `delegate_task` mode, copy lifecycle, closure, reactivation and messaging rule, and the sidebar for runs
that are not adopted, stay unchanged.

### Review Authority

Standard: blocking findings cite an approved requirement or AC; new behavior is a Requirement Gap.

## Requirements

| Requirement ID | Requirement | Behavior | Priority | Rationale | Source |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | `delegate_task {target_agent_run_id \| target_team_run_id, task_id}` accepts a run the user started by hand when: it is in the delegator's workspace, belongs to no Task, is not part of another run, and is idle; the delegator may delegate a Task (not Task-owned); the Task is an open Project Task. | BEH-001 | Must | the user, 2026-10-18: "the PM … call the delegate task to … one existing agent team run" | the user |
| REQ-002 | On success the run becomes the delegator's delegated run for that Task: recorded as the Task's assignment by the delegator, and the run receives the Task as its next work, continuing its own conversation (as a follow-up Task to an existing copy does). | BEH-001 | Must | same | the user |
| REQ-003 | From then on the run is shown, coordinated and closed exactly like a run the delegator started: under the delegator in the sidebar with its Task line (no longer in its own group), idle shutdown / wake by the delegator, stopped and removed from the sidebar on DONE / CANCELLED, reactivated by the delegator after reopening; Task rules apply. | BEH-002, BEH-003 | Must | the user's purpose: lifecycle bound to the Task | the user |
| REQ-004 | Adoption keeps every file and the whole conversation of the run; nothing is copied or deleted. | BEH-002 | Must | data continuity | — |
| REQ-005 | Refusals change nothing and tell the delegator why: another workspace; already owned by a Task or part of another run; it or any run in its chain running a turn (try again when idle); an organization run or a team member; a closed or ad-hoc Task; a Task-owned delegator; a run bound to an application; an archived run; a run whose definition is no longer in the catalog. | BEH-001 | Must | — | — |
| REQ-007 | **Full adoption** (SR-010, the user, 2026-10-18): a run that has delegated runs of its own, finished or ongoing, is adopted together with its whole chain. After adoption the stored state and behavior equal those of a natural chain — as if the delegator had delegated the run itself and the run had then delegated its work: every run it delegated is linked under the delegator (same delegator agent, same Task identity rules), names the delegator's run as its coordinator, and is hosted by the delegator's run; ongoing ones become sub-work of the adopted Task; finished ones stay finished with their history. The whole chain must be idle. | BEH-001, BEH-003 | Must | the user: "after adoption, the state should become the state similar to … then it's not a full adoption" | the user |
| REQ-008 | A chain run working on a Project Task (board Task), open or closed, is **handed to the delegator as its own assignment** for that board Task (the relationship to the adopted run is cut): the delegator becomes its assigner, coordinator and host, its current Task stays the board Task, and closing the adopted Task never stops it. Nothing is refused for having board Tasks. | BEH-001, BEH-003 | Must | the user, 2026-10-18 (SR-014) | the user |
| DEC-108 | Which delegators can adopt? | The user's flow is the PM, a standalone agent run. Team members and organization agents as delegators would add hosting cases; later. | Solution Designer | Decided (user informed) |
| DEC-109 | A partial adoption (stopped halfway) | Every step is recognized from the files; the same delegator repeating `delegate_task` finishes it; nothing is lost meanwhile. | Solution Designer | Decided (user informed) |
| DEC-110 | How is the chain of an adopted run handled? | The natural state (read-only data 2026-10-18: a member-delegated run under a PM-delegated team is linked in the PM's tree, its own file names the PM's run, its Task entry is `delegated` sub-work of the team's Task, hosted by the PM's run). Ongoing chain runs: their open tracking-Task entry closes (that Task CANCELLED; no note — temp Tasks have no note field, SR-013) and an open `delegated` entry in the adopted Task is appended, hosted by the delegator — so closing the adopted Task stops them, as naturally. Finished chain runs: their history is kept; only their host and coordinator move to the delegator, so they are shown closed under it. Nothing is invented for finished work. | the user (principle) / Solution Designer (detail) | Decided (the user approved full adoption, 2026-10-18; detail within it, user informed) |
| DEC-111 | What does "equal to a natural chain" mean exactly? | ARCH-F-006: history cannot equal a natural chain's without rewriting it | Behavior-driving state equal (links, coordinators, hosts, current entries); earlier records kept true. | the user | Decided (the user, 2026-10-18: agreed with the recommendation) |
| DEC-112 | Chains that work on board Tasks? | Superseded by DEC-114 (SR-014). | the user | Superseded |
| DEC-114 | Chains that work on board Tasks? | The user: cut the relationship — the run working on a board Task becomes the delegator's own assignment for it, as if the delegator had delegated that board Task directly; a natural state, so DEC-111 holds. Replaces the refusal; also makes hand-started PM runs adoptable (their board Tasks pass to the adopting PM). After adoption the adopted run and the board-Task run no longer message each other by run id (different Tasks), as in a natural chain. | the user | Decided (the user, 2026-10-18: "This is much cleaner") |
| DEC-113 | A chain run that belongs to no Task (a converted collaborator)? | ARCH-F-007: 11 of 93 chain links in the user's data | Following DEC-111 (a natural chain's current entry is sub-work): it becomes open sub-work of the adopted Task and closes with it; nothing else is closed. | Solution Designer (within the user's DEC-111) | Decided (user informed) |
| REQ-006 | Withdrawn (SR-005): no list tool; the user gives the PM the run id, or the PM finds it itself (the user, 2026-10-18). | — | — | — | the user |

## Acceptance Criteria

| AC | Requirements | Scenario | Trigger | Expected | Alternate | Verification |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001..004 | SCN-001..003 | PM delegates an open Task to an idle hand-started team run in its workspace | The team receives the Task in its conversation; sidebar shows it under the PM with the Task line, not under TEAMS; board shows it as the worker with live status; all its files and messages kept | — | Server tests + real-app check (isolated instance, test data) |
| AC-002 | REQ-001..004 | same | Same with a hand-started agent run | Same | — | same |
| AC-003 | REQ-003 | SCN-003 | Task set DONE, then reopened and the PM messages the run | Stopped and removed from the sidebar on DONE; reactivated by the PM's message after reopening | — | Server tests + real-app check |
| AC-004 | REQ-005 | SCN-001 | Each refusal case | Clear refusal; nothing changes | — | Server tests |
| AC-005 | REQ-006 | — | Withdrawn (SR-005) | — | — | — |
| AC-006 | — | — | Existing suites | Copies' behavior unchanged | — | Suites |
| AC-007 | all | — | The user's check | The user asks the PM to give `autobyteus-10` to the run working on it | — | Beta + the user's check |
| AC-008 | REQ-007 | SCN-001..003 | Hand-built test data shaped like the user's Work Journal run: a hand-started team whose Solution Designer delegated a helper (finished), plus a second case with an ongoing helper | After adoption the behavior-driving state equals a naturally delegated chain built the same way — links (place, delegator, startedAt), coordinators, hosts, and each run's **current** entry; earlier history records keep what really happened (a finished helper's re-hosted temp-Task entry; an ongoing helper's closed entry in its CANCELLED temp Task) (DEC-111); the finished helper is shown closed under the delegator; DONE of the Task stops the team and the ongoing helper; reopening and the delegator's message reactivate the team | A helper running a turn: refused, nothing changes | Server tests (state comparison with a natural chain) + real-app check |
| AC-009 | REQ-008 | SCN-001..003 | Hand-built data: a hand-started team whose Solution Designer gave board Task K to a product team (open), and a hand-started PM run with open and closed board-Task assignments | After adoption: each board-Task run is linked under the delegator with the delegator as delegator and assigner, hosted by it, still on its board Task; closing the adopted Task leaves it running; the delegator can give it a follow-up or reactivate it after reopening its board Task; the state equals the delegator having delegated that board Task directly (DEC-111) | — | Server tests |

## Relevant Scenarios And Journeys

| Scenario | Kind | Actor | Goal | Trigger | Start | Steps | Outcome | Validity |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | System | PM | Give a Task to an existing run | `delegate_task` by run id | idle hand-started run in the PM's workspace | refusal checks → record → deliver Task | run is the PM's delegated run | Supported Normal Scenario (the user, 2026-10-18) |
| SCN-002 | User | User | See it under the PM | sidebar | adopted | — | under the PM with Task line | Supported Normal Scenario |
| SCN-003 | System | PM / user | Task lifecycle | DONE / reopen | adopted | — | stopped and gone / reactivated | Supported Normal Scenario |
| SCN-004 | Withdrawn (SR-005) | | | | | | | |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes` — no new UI control; the existing delegated-run display (under the PM, Task line, board worker)
  applies to adopted runs. Product Design: N/A.

## Data Continuity And Acceptable Loss

- Persisted data affected: `Yes` — the adopted run's own file gains the task-agent section (as for any delegated run),
  the delegator's tree gains a link, the Task's `agent_run_resources.json` an `assigned` entry.
- Preserve: every file of the run (no move, no copy), its conversation and messages.
- Acceptable: the run leaves its own group in the sidebar (shown under the PM instead) — intended.
- Downgrade after adoption: an older build no longer lists the run in its own group (like any task agent); nothing lost.

## External Contracts And Dependencies

| Contract | Constraint |
| --- | --- |
| `delegate_task` tool contract | new eligibility for existing runs; refusal messages |
| Collaboration Model CM-5..CM-8, projects.md, memory layout contract (task agent own files) | adopted run = ordinary delegated run |
| Task 6fb6e21b | other workspaces later |

## Decisions

| Decision | Question | Reasoning And Recommendation | Owner | Status |
| --- | --- | --- | --- | --- |
| DEC-101 | Link or adopt? | The user's purpose is lifecycle and cleanup: adopt (the run becomes the PM's delegated run). | the user | Decided (the user, 2026-10-18) |
| DEC-102 | Who adopts, and how? | The delegator, with `delegate_task` by run id (no new tool); the PM decides. | the user | Decided (the user: "the PM decided … call the delegate task to … one existing agent team run") |
| DEC-103 | Does the run receive the Task? | Yes, as with any `delegate_task`: it continues its conversation with the Task as its next work. | the user | Decided (the user, 2026-10-18) |
| DEC-107 | A run that has delegated runs of its own? | Superseded by DEC-110 (SR-010): refusing them left the user's real case (Work Journal) out; a partial adoption would leave an inconsistent state. | Solution Designer | Superseded |
| DEC-104 | Only when idle? | Handing a live run from its own session to the PM's run mid-turn risks losing the turn; refuse while running, retry when idle. | Solution Designer | Decided |
| DEC-105 | Other workspaces? | A run in another workspace stays in its own group and cannot be adopted now (`delegate_task` refuses: another workspace); only runs sharing the PM's workspace ever appear under it, which keeps the sidebar consistent. Adopting across workspaces belongs with Task 6fb6e21b (follow-up). | the user | Decided (the user, 2026-10-18: "for the ones which has a different workspace … we still leave it there … if we bring it back, it will be a little bit inconsistent on the UI") |
| DEC-106 | How does the PM find the run? | The user: no new tool — "the user will just tell it" or the PM finds the team run id itself, then calls `delegate_task` directly. | the user | Decided (the user, 2026-10-18) |

## Traceability

| Requirement | Use Cases | Behaviors | ACs |
| --- | --- | --- | --- |
| REQ-001, REQ-002 | UC-001 | BEH-001 | AC-001, AC-002 |
| REQ-003 | UC-002 | BEH-002, BEH-003 | AC-001..AC-003 |
| REQ-004 | UC-002 | BEH-002 | AC-001 |
| REQ-005 | UC-001 | BEH-001 | AC-004 |
| REQ-006 | — | — | — (withdrawn) |

## Architecture Phase Input

- Verify: handing an idle standalone root (agent run / team run) over to the delegator's root; writing the task-agent
  section and link with the memory-refactor stores; the "idle" check; the list tool's data source (history index rows).

## Readiness Check

- Content ready for approval: `Yes`. Approved basis ready for design: `Yes`.
