# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-004`
- Package identifier: `org-teams-follow-definition`
- Request / ticket: Project Task `autobyteus-29` (FU-002, FU-003 of autobyteus-22)
- Requested by: `/project_task_manager` (run `project_task_manager_2f41a1df4e464bf2aa8970327d9d7ad0`), on the user's "work on the follow-up immediately" (2026-11-21)
- Requirements owner: Solution Designer
- Date: 2026-11-21
- Direction: the user, 2026-11-21 (SR-002): an Org is a container; each mounted Team is its own Team run and each direct Org agent its own agent run ("let's go with the second option").
- Approved by and reference: `User`, 2026-11-21, in the Solution Designer conversation: DEC-001 (a) (quoted in its row); then "I think you should contain both", answering whether FU-003 stays in this ticket and whether the Org also follows its Org definition. Recorded as: both fixes stay in this ticket (DEC-003) and the Org follows its Org definition (DEC-002), with that reading told to the user for correction.
- Exact approved requirements baseline: this document at SR-004 (REQ-001..REQ-009, AC-001..AC-008, DEC-001..DEC-005)
- Behavior-defining supplements: autobyteus-22's approved behavior (archived `tickets/done/team-run-follows-definition/` on `personal`: requirements SR-005/SR-006, design § Exact Texts, § Member States) applies unchanged to every Team run, including those inside an Org

## Problem And Desired Outcome

- Problem 1 (FU-002): an Org run is one run that holds its Teams as parts (one saved tree, one message log, one root), so the Teams inside it never follow their Team definition (IF-01..IF-05, IF-09, IF-10). The design contract already calls an Org a container of independent units (CM-3).
- Problem 2 (FU-003): the delegating node records a peer Team copy's members once and never updates them (IF-06..IF-08).
- Desired outcome: (1) an Org run is a container: its direct agents and mounted Teams are runs of their own, grouped under the Org; every Team inside an Org is a Team run like any other, so it follows its Team definition through autobyteus-22; the Org still looks and works as one unit to the user. (2) The delegating node's record of a peer Team copy follows the copy's membership.
- Success: a real Org run whose Team gains and loses a member while running behaves exactly as a standalone Team run does; a real cross-node Team copy's change is seen on the delegating node; the user's existing Org run keeps its conversations and history.

## Relevant Current And Desired Behavior

| ID | Current | Desired | Preserved |
| --- | --- | --- | --- |
| BEH-001 | Org Teams and agents are parts of one Org run (IF-09) | Each is a run of its own inside the Org container | One Org in the app: one launch page, one Org view, one Stop and reopen |
| BEH-002 | Org Teams don't follow their Team definition | They do, as any Team run (autobyteus-22) | Everything autobyteus-22 delivered |
| BEH-003 | Units message each other by address inside the Org run | Same addresses work across the units' runs; each message stored in both runs' logs (CM-9) | Addresses, handoff texts, who may message whom |
| BEH-004 | Org-level handoff rules in the Org run | Kept by the Org container; a unit's `get_handoff_rules` returns its own run's rules plus the Org rules from it; an Org rule from or to a member that left is left out until it returns | Org rules' content |
| BEH-005 | Peer Team copy members fixed on the delegating node | Updated after the copy changes | Peer node owns the run (CM-10) |
| BEH-006 | Existing Org runs stored as one run | Converted (DEC-001) | Their conversations, messages, memory, Tasks and history |

## Scope Guardrail

### In-Scope Use Cases

| ID | Use case |
| --- | --- |
| UC-001 | Start, use, stop and reopen an Org run that is a container of runs, looking and working as today |
| UC-002 | A Team inside an Org follows its Team definition (autobyteus-22 behaviors) |
| UC-003 | Org units message each other by address and follow Org-level rules across their runs |
| UC-004 | Existing Org runs keep working after the change (DEC-001) |
| UC-005 | The delegating node sees a peer Team copy's current members (FU-003; DEC-003) |
| UC-006 | The Org follows its Org definition: Teams mounted/unmounted, direct agents added/removed, Org rules |

### Out Of Scope

- Orgs inside Orgs; Teams inside Teams (unchanged product limits).
- Placement copies (`copiedFrom: configured_placement`): they keep their current behavior (none exist).
- Application-bound runs.

### Preserved Behavior Boundary

- The Org launch page, Org view, focus rules ("select an exact Agent or Team"), Stop/reopen of the whole Org, delegation from Org units, Tasks, Memory page and run history look and work as today, apart from the following and the conversion.

### Prerequisites

None found.

## Requirements

| ID | Requirement | Source |
| --- | --- | --- |
| REQ-001 | Starting an Org creates an Org container run plus one Team run per mounted Team and one agent run per direct Org agent, all bound to the container and configured from the one Org launch page (root, Team and agent settings as today). Members stay Offline until first work. | Direction |
| REQ-002 | Each Team run inside an Org is a Team run in every respect: it follows its Team definition with every autobyteus-22 behavior (join, leave, Leaving, notices, refusal, rules, live rows, reopen). | FU-002 |
| REQ-003 | Org units reach each other by the same addresses as today (`/concierge`, `/software_engineering_team`, `/software_engineering_team/code_reviewer`), across their runs; a message between two units is stored in both runs' logs; the Org view's messages show them as today. | CM-3, CM-9 |
| REQ-004 | The Org container keeps the Org-level handoff rules. A unit's `get_handoff_rules` returns its own run's rules plus the Org rules from it; an Org rule from or to a member no longer in its Team is left out until it returns, and the members whose rules changed get the autobyteus-22 notice line. | Consistency |
| REQ-005 | Stopping the Org stops all its runs; reopening the Org reopens the container and restores its runs as they are needed (Offline until work), each following its definition on reopen. | Preserved |
| REQ-006 | The Org view, run tree rows (`org_agent`, `org_team`, members), Memory page and run history show the Org and its units as today; a unit row's commands, Stop and Settings go to that unit's own run. | Preserved |
| REQ-007 | Existing Org runs are handled as DEC-001 decides, keeping every conversation, message, memory folder, Task link and history entry. | DEC-001 |
| REQ-008 | (FU-003, in this ticket per DEC-003) The delegating node's record of a peer Team copy (members, coordinator) is updated after the copy's membership changes; if the delegating node is unreachable then, at the next contact. | FU-003 |
| REQ-009 | (DEC-002: included) The Org follows its Org definition: a newly mounted Team or new direct agent becomes a run in the container (Offline); an unmounted Team or removed direct agent leaves with the autobyteus-22 rules (busy members finish as Leaving, history kept); Org rules follow. | DEC-002 |

## Acceptance Criteria

| ID | REQ | Trigger | Expected outcome |
| --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-006 | Start an Org from its launch page | The Org view looks as today; its Teams and agents are runs of their own in the container; members Offline |
| AC-002 | REQ-002 | A Team inside a running Org gains a member and loses a busy one | Same outcomes as autobyteus-22 AC-001..AC-003, in the Org view |
| AC-003 | REQ-003 | An Org agent hands off to a Team member and back | Delivered by address both ways; stored in both runs' logs; shown in the Org view's messages |
| AC-004 | REQ-004 | An Org rule targets a Team member that is removed, then re-added | Rule absent then back; the sender notified both times |
| AC-005 | REQ-005 | Stop the Org; change a Team definition; reopen | All units stopped; reopened Org has the current members |
| AC-006 | REQ-007 | A pre-change Org run of every released shape (fixtures modelled on the user's run of 2026-09-21) after the upgrade's conversion | Opens; its conversations, messages, memory, Task links and history are all there; its Teams follow their definitions |
| AC-007 | REQ-008 | Cross-node Team copy gains and loses a member; then with the delegating node offline | Delegating node's rows and run-ID messages follow; updated at the next contact |
| AC-008 | REQ-009 | Mount a new Team / unmount one / add or remove an Org agent | New run appears Offline; removed unit leaves per autobyteus-22 rules |

### Verification Intent (feasibility of the proof)

Isolated server instances from the ticket worktree with their own data directories (never the user's app or data): a test Org definition mounting test Teams in a local test package, edited while the Org runs; AC-006 on small hand-built fixtures in every released pre-change Org shape (learned by reading real data read-only; never a copy of user data, and the conversion never runs on real user data: data migration guideline §9, TESTING.md), put through the conversion; two paired isolated instances for AC-007; real runtimes via the test vault; the web app against the instance for the Org view. No credentials beyond the test vault; no evidence decision needed.

## Decisions

| ID | Question | Reasoning And Recommendation | Owner | Status |
| --- | --- | --- | --- | --- |
| DEC-001 | Existing Org runs (your Software Development Department run of 2026-09-21, and any others) | (a) Convert them at startup into containers with their Teams and agents as runs of their own, keeping every conversation, message, memory folder and Task link (as the repository did twice before for delegated runs, IF-11); (b) keep them as history you can read but not reopen. (a) keeps your run usable and is the repository's established path; it is hard to undo (a data migration), so it needs your word. **Recommend (a).** **Decided by the user (2026-11-21): (a)**, "the existing organization run well basically you know we need to have a data migration right yeah but in general as you also mentioned that in the past we have already done similar like a refactoring so maybe you can learn from the past and then do the type of refactoring". | User (2026-11-21) | Decided |
| DEC-002 | Also follow the **Org** definition (mount/unmount Teams, add/remove Org agents, Org rules)? | In the container it is the same mechanism one level up (start or stop a unit run); it completes "the dynamic feature applies to the organization". It adds Org-level leave/join on top of the restructuring. **Recommend: include it** in this ticket as its last step. **Decided by the user (2026-11-21): include** ("I think you should contain both"; reading stated to the user). | User (2026-11-21) | Decided |
| DEC-003 | FU-003 (peer Team copy members) in this ticket or its own | FU-003 is small and independent of the restructuring; in this ticket it waits for the large change to finish. **Recommend: split FU-003 into its own Task** (I ask the Project Task Manager) so it ships soon; this ticket becomes the Org container. **Decided by the user (2026-11-21): keep both in this ticket** ("I think you should contain both"). | User (2026-11-21) | Decided |
| DEC-004 | How an Org looks after the change | Unchanged for the user (REQ-006); the container is an internal shape. **Decided.** | Solution Designer | Decided |
| DEC-005 | Org-level rules | Kept by the container; merged into a unit's rules; left out while a named member is gone (REQ-004). **Decided.** | Solution Designer | Decided |

## Readiness Check

- Content ready for approval: `Yes`; remaining blockers: None.
- Approved basis ready for design: `Yes` (User, 2026-11-21).
