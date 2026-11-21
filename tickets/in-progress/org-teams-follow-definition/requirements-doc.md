# Requirements Document

## Document Status

- Status: `Ready for Approval`
- Current solution revision ID: `SR-001`
- Package identifier: `org-teams-follow-definition`
- Request / ticket: Project Task `autobyteus-29` (FU-002, FU-003 of autobyteus-22)
- Requested by: `/project_task_manager` (run `project_task_manager_2f41a1df4e464bf2aa8970327d9d7ad0`), on the user's "work on the follow-up immediately" (2026-11-21)
- Requirements owner: Solution Designer
- Date: 2026-11-21
- Approved by and reference: pending (DEC-001 needs the user)
- Behavior-defining supplements: autobyteus-22's approved behavior (requirements SR-005/SR-006, design § Exact Texts and § Member States, archived at `tickets/done/team-run-follows-definition/` on `personal`) applies unchanged to the runs added here

## Problem And Desired Outcome

- Problem 1 (FU-002): a Team mounted in an Org run keeps the members, coordinator and rules it had when the Org run started; autobyteus-22 made standalone Team runs and Team copies follow their definition but left Org runs out (IF-01..IF-04). The user's own Org run mounts the Software Engineering Team and the Product Design Prototyping Team (IF-05).
- Problem 2 (FU-003): when a Team copy runs on a peer node, the delegating node records its members once, at delegation, and never updates them (IF-06, IF-07). After the copy gains or loses a member, the delegating node's tree rows under the delegating run and its messages by run ID to the copy's members stay stale.
- Desired outcome: (1) a Team mounted in an Org run follows its Team definition exactly as a standalone Team run does; (2) the delegating node's record of a peer Team copy's members follows the copy's real membership.
- Success: a real Org run whose mounted Team gains and loses a member while it runs, and a real cross-node Team copy that does the same, both seen on the delegating side.

## Relevant Current And Desired Behavior

| ID | Current | Desired | Preserved |
| --- | --- | --- | --- |
| BEH-001 | Org-mounted Team fixed at Org start (IF-01..IF-03) | Follows its Team definition: members, coordinator, the Team's own rules | Org direct agents, which Teams are mounted, and the Org's own rules (DEC-001) |
| BEH-002 | Org-level rules naming a member stay | An Org-level rule from or to a member that left is left out (as autobyteus-22 N-3) | Other Org-level rules |
| BEH-003 | Peer Team copy's members recorded once (IF-06) | Updated on the delegating node after the copy's membership changes | The peer node owns the run (CM-10) |

## Scope Guardrail

### In-Scope Use Cases

| ID | Use case | Scenarios |
| --- | --- | --- |
| UC-001 | A Team mounted in a running or reopened Org run gains, loses or swaps members, or changes coordinator or rules, when its Team definition changes | SCN-001 |
| UC-002 | The delegating node sees a peer Team copy's current members | SCN-002 |

### Out Of Scope

- Changes of the Org definition itself (direct agents, which Teams are mounted, Org-level rules), unless the user decides otherwise in DEC-001.
- Team copies made from a configured placement (`copiedFrom: configured_placement`): they stay as they are (none exist in the user's data; autobyteus-22 AF-13).
- Application-bound runs.

### Non-Goals

- No change to the autobyteus-22 behaviors, texts or UI; they are reused.

### Preserved Behavior Boundary

- Standalone Team runs and Team copies behave as autobyteus-22 delivered. An Org run's direct agents, conversations, Tasks and history are unchanged.

### Prerequisites

None found.

## Requirements

| ID | Requirement | Behavior | Source |
| --- | --- | --- | --- |
| REQ-001 | A Team mounted in an Org run follows its Team definition with every autobyteus-22 behavior: added members Offline until first message; removed members leave (busy ones finish their turn as "Leaving", then stop) and become former members with their history; coordinator and the Team's own rules follow; `get_handoff_rules` returns current rules; one notice to each remaining member of that Team; the clear refusal for a former member; live member rows; at once while running, and when the Org run is reopened. | BEH-001 | FU-002 |
| REQ-002 | An Org-level rule (from the Org definition) whose `from` or `to` is a member that is no longer in its mounted Team is left out of the Org run's rules; when that member comes back, the rule comes back. Members whose rules changed this way get the notice's rules line. | BEH-002 | Consistency with autobyteus-22 N-3 |
| REQ-003 | The delegating node's record of a peer Team copy (its members' addresses and run IDs, and its coordinator) is updated after the copy's membership changes on the peer, so the delegating run's tree rows and its messages by run ID reach the copy's current members. If the delegating node can't be reached at that moment, its record is updated at the next contact. | BEH-003 | FU-003 |
| REQ-004 | A broken or missing Team definition leaves the mounted Team unchanged with the autobyteus-22 warning (`TEAM_RUN_DEFINITION_NOT_FOLLOWED`), naming the Org run and the Team; the rest of the Org run keeps working. | BEH-001 | DESIGN.md rule 7 |

## Acceptance Criteria

| ID | REQ | Trigger | Expected outcome |
| --- | --- | --- | --- |
| AC-001 | REQ-001 | Running Org run; a member and a rule are added to a mounted Team's definition | The member appears (Offline) under the Team in the Org run; the rule's sender's `get_handoff_rules` lists it; a handoff starts it and it works |
| AC-002 | REQ-001 | A member is removed from a mounted Team's definition (idle, and busy) | Idle: gone, refused with the exact text; busy: "Leaving", approvals answerable, then gone; history readable |
| AC-003 | REQ-001 | Definition changed while the Org run is stopped; reopened | Reopened Org run has the current members |
| AC-004 | REQ-002 | An Org-level rule targets a member that is removed, then re-added | Rule absent while removed, back when re-added; the sender is notified both times |
| AC-005 | REQ-003 | Cross-node: a Team copy on node B delegated from node A gains and loses a member | Node A's tree rows under the delegating run show the new member and drop the removed one; node A's message by run ID to the new member is delivered; to the removed one, refused with the exact text |
| AC-006 | REQ-003 | Node A unreachable during the change, then back | Node A's record is updated at the next contact |
| AC-007 | REQ-004 | A mounted Team's definition made invalid | That Team unchanged, warning names the Org run and Team; other Teams and agents keep working |

### Verification Intent (feasibility of the proof)

On isolated server instances built from the ticket worktree with their own data directories, never the user's app or data: a test Org definition mounting a test Team in a local test package (edited while an Org run runs; restart for AC-003); two isolated instances paired as peers for AC-005/AC-006 (the existing two-server harness used by autobyteus-22's RC suite), stopping node A's instance for AC-006; real runtimes via the test vault; the web app connected to the instance for the rows. No credentials beyond the test vault: no evidence decision is needed.

## Relevant Scenarios

| ID | Kind | Trigger | Outcome | Validity | Evidence |
| --- | --- | --- | --- | --- | --- |
| SCN-001 | User/System | Package update or app save of a Team mounted in an Org run (e.g. the Software Engineering Team in the Software Development Department) | Org run's mounted Team follows | Supported Normal | IF-05 |
| SCN-002 | System | Membership change of a Team copy running on a peer node | Delegating node's record follows | Supported Normal | IF-06..IF-08 |

## Decisions

| ID | Question | Reasoning And Recommendation | Owner | Status |
| --- | --- | --- | --- | --- |
| DEC-001 | Should an Org run also follow changes of its **Org definition** (direct agents added/removed, Teams mounted/unmounted, Org-level rules)? | The follow-ups name only mounted Teams following their Team definition. Following the Org definition is the same idea one level up, but adds unmounting a whole Team and changing direct agents, roughly half again the work. **Recommend: not in this ticket; record it as a follow-up**, and decide after you've used Org runs with following Teams. | User | Needs user |
| DEC-002 | Notices for an Org-mounted Team | Same as autobyteus-22 DEC-004: every remaining member of that Team; plus an Org-level agent whose own rules changed (REQ-002). **Decided.** | Solution Designer | Decided |
| DEC-003 | How the delegating node learns of a peer copy's change | The peer node owns the run (CM-10), so it tells the delegating node after a committed change (push), and the delegating node also refreshes on its next contact (covers a missed push). Exact channel at design. **Decided.** | Solution Designer | Decided |
| DEC-004 | Placement copies | Unchanged (out of scope): none exist; their rules come from the delegating run's placement. **Decided.** | Solution Designer | Decided |

## Readiness Check

- Content ready for approval: `Yes`; remaining blocker: DEC-001.
