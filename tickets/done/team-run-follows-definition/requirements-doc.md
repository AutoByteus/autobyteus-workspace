# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-006`
- Package identifier: `team-run-follows-definition`
- Request / ticket: Project Task `autobyteus-22` (Project `project_f34a9537-07d7-449a-b78f-16368f1aa619`)
- Requested by: `/project_task_manager` (run `project_task_manager_2f41a1df4e464bf2aa8970327d9d7ad0`), on the user's questions of 2026-11-11
- Requirements owner: Solution Designer
- Date: 2026-11-11
- Approved by and reference: `User`, 2026-11-21, in the Solution Designer conversation: "Anyway I think now you have the fourth picture also the requirement is also clear right now I think you can work on it now is it" — given after the Solution Designer's summary asking for a yes on recommendations 1–3 (DEC-001 (a), DEC-002 (a), DEC-003 standalone + delegated copies) and after the user decided DEC-004 (notice to every remaining member).
- Exact approved requirements baseline: this document at SR-005 (REQ-001..REQ-009, AC-001..AC-010, DEC-001..DEC-009)
- Behavior-defining supplements: None yet

## Problem And Desired Outcome

- Correction of a premise (Task facts and the user's comment of 2026-11-18 say handoff rules are already dynamic): on today's `personal` (`b1229d0430`) `get_handoff_rules` still returns the rules saved in the run when it started, not the current definition's (IF-03, IF-04, IF-16); the live Marketing Team run shows it (IF-05). So the rules must follow the definition too (REQ-003).
- Problem: a Team run copies its members, coordinator and handoff rules from the Team definition when it starts and never reads them again (investigation IF-01..IF-05). A member added to the definition can't be reached by a running team, even by rule; a removed member stays. The only remedy is a new team run, which loses the team's conversation context.
- Desired outcome: a running (or stopped and later reopened) Team run follows its current Team definition: a new member becomes part of the team and starts when it is first needed; a removed member retires cleanly; coordinator and handoff rules match the definition. The team's conversations and history continue.
- Success: a real team run whose definition gains a member and loses a member while it runs: the gained member is reached by handoff and does its work; the removed member can no longer be messaged, its history stays; the team keeps working in the same run.

## Relevant Current And Desired Behavior

| ID | Current (evidence) | Desired | Preserved |
| --- | --- | --- | --- |
| BEH-001 | Membership, coordinator, handoffs fixed at run start (IF-01..IF-03) | They follow the current definition | Run identity, conversations, memory, Tasks |
| BEH-002 | New member unreachable (IF-05, IF-07) | Added as an Offline member; first message starts it | Lazy start (IF-08) |
| BEH-003 | Removed member stays | Retired: no longer addressable, history kept | Its memory and messages |
| BEH-004 | `get_handoff_rules` returns the start-time rules (IF-04) | Returns the run's current rules | Tool contract shape |
| BEH-005 | Agent definition changes are already followed (IF-11) | Unchanged | — |

## Scope Guardrail

### In-Scope Use Cases

| ID | Use case | Scenarios |
| --- | --- | --- |
| UC-001 | A member added to a Team definition joins running and stored runs of that Team | SCN-001 |
| UC-002 | A member removed from a Team definition retires from those runs | SCN-002, SCN-003 |
| UC-003 | Coordinator and handoff-rule changes reach those runs | SCN-004 |
| UC-004 | The team's agents learn about the change | SCN-005 |
| UC-005 | The user sees the running team's current members in the app and can talk to each (the user's comment, 2026-11-18) | SCN-006 |

### Out Of Scope

- Org-mounted Teams (different saved format, IF-10) — per DEC-003.
- Changes of Team-level launch choices (default runtime/model) and of the Team instruction text beyond today's behavior.
- Team-in-Team composition (rejected by the product today).
- Undo/history of definition changes.

### Non-Goals

- No new way to create runs by message: a member exists because the definition says so, not because someone messaged it (collaboration model CM-4).

### Preserved Behavior Boundary

- Lazy member start, restore of existing members, delegated runs and Tasks, run history and memory layout are unchanged.

### Prerequisites

None found.

## Requirements

| ID | Requirement | Behavior | Source |
| --- | --- | --- | --- |
| REQ-001 | A Team run follows its Team definition's members: a member the definition gains is added to the run as an Offline member with its own AgentRun ID; it starts when the first message reaches it. | BEH-001, BEH-002 | Direction; DEC-001 |
| REQ-002 | A member the definition loses is retired from the run: its address no longer resolves (`send_message_to` and handoffs to it fail as for any unknown address), it is no longer shown as a current member; its memory, conversation and messages stay readable in the run's history; nothing of it is deleted. | BEH-003 | Direction; DEC-002, DEC-007 |
| REQ-003 | The run's coordinator and handoff rules follow the definition; `get_handoff_rules` returns the run's current rules. | BEH-001, BEH-004 | Direction; investigation finding |
| REQ-004 | It applies to standalone Team runs and delegated Team copies (the SemFlow study's team is a copy, IF-06), while they run and when a stopped run is reopened, without starting a new run. | BEH-001 | DEC-001, DEC-003 |
| REQ-005 | The change is saved with the run, so a restart or restore keeps it. | BEH-001 | Safety |
| REQ-006 | The team's agents are told about the change: every remaining member gets one short notice (DEC-004). | — | DEC-004 |
| REQ-008 | In the app, the running team's view shows the current members: a member that joins appears (Offline until it starts) without reopening the run, and a member that leaves disappears from the member list; the user can select and message every current member, which starts a not-yet-started member. A removed member's past messages stay visible in the team's history, named by its address. | — | The user, Task comment 2026-11-18 |
| REQ-009 | A message to a member that left the team is not delivered, and the sender gets a clear refusal naming that the member is no longer in the team and pointing to `get_handoff_rules` (the platform's safety net for a rare mistake, the user 2026-11-21). | BEH-003 | The user, 2026-11-21; Solution Designer (wording at design) |
| REQ-007 | When the Team definition can't be read or is invalid, the run keeps its current members and the problem is logged; the run keeps working. | — | DESIGN.md rule 7 |

## Acceptance Criteria

| ID | REQ | Trigger | Expected outcome |
| --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-003, REQ-004 | Running Team run; a member and a handoff rule to it are added to the definition | The member appears in the run (Offline); `get_handoff_rules` of the rule's sender lists it; a handoff to it starts it and it does the work |
| AC-002 | REQ-002 | Running Team run; a member is removed from the definition | Messages to its address fail as unknown; it is not a current member; its history is still readable |
| AC-003 | REQ-002 | The removed member is busy when the change arrives | Behaves as DEC-002 decides |
| AC-004 | REQ-004, REQ-005 | The definition changes while the run is stopped; the run is reopened (and after a server restart) | The reopened run has the current members and rules |
| AC-005 | REQ-004 | Delegated Team copy (as the SemFlow team) | Same as AC-001/AC-002 |
| AC-006 | REQ-006 | Any of the above | Every remaining member receives one notice (joined, left, current rules) when idle; the new member gets none |
| AC-007 | REQ-007 | Definition made invalid | Run unchanged, warning logged |
| AC-008 | REQ-003 | Coordinator changed in the definition | User messages to the team reach the new coordinator |
| AC-010 | REQ-009 | After a member is removed, a remaining member messages its address | Not delivered; the refusal says it left the team and points to get_handoff_rules |
| AC-009 | REQ-008 | The team's view is open in the app while a member is added and another removed | The new member appears (Offline) and the removed one disappears without reloading; the user messages the new member and it starts and answers; the removed member's earlier messages remain in the Team tab |

### Verification Intent (feasibility of the proof)

All criteria are proven on an isolated server instance built from the ticket worktree with its own data directory, never the user's running app or data:
- **Team under test:** a test Team definition (and its agents) in a local agent package registered on that instance; members and handoff rules are added and removed by editing its files while a Team run runs (the same reload path as a package update), and by the app's definition editor.
- **Real runs:** AC-001..AC-006, AC-008, AC-010 with real agent runtimes (AutoByteus and Codex at least) using the test vault (`AUTOBYTEUS_TEST_VAULT`), for a standalone Team run and a delegated Team copy started by an agent's `delegate_task` (AC-005).
- **Restart:** AC-004 by stopping the run (and restarting the isolated server) between the definition change and the reopen.
- **App:** AC-009 by the web app connected to that instance (rendered browser probe with screenshots of the team view before and after the change, and a message sent to the new member).
- **Invalid definition:** AC-007 by writing an invalid team-config.json in the test package.
No credentials beyond the test vault, no signing keys, no host privilege changes, no production workflow: no evidence decision is needed.

## Relevant Scenarios

| ID | Kind | Trigger | Steps | Outcome | Validity | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User/System | Package author adds a member + rules (agents repo update, app save) | Definition reloads → runs of that Team follow → a sender hands off → member starts | New member works in the same run | Supported Normal | Marketing Reply Scout, Agent Package Creator |
| SCN-002 | User/System | Member removed from definition | Runs follow → member retires | Not addressable; history kept | Supported Normal | Research Method Reviewer (autobyteus-agents-11) |
| SCN-003 | System | Removed member is mid-turn | DEC-002 | — | Supported Explicit Edge | Real timing of package updates |
| SCN-004 | User/System | Coordinator or rules change | Runs follow | Messages follow new rules | Supported Normal | Direction |
| SCN-005 | System | Any change applied to a run | Notice | Agents adjust | Supported Normal | DEC-004 |
| SCN-006 | User | The user watches/uses a running team in the app while its definition changes (e.g. the Agent Package Creator edits it) | View updates live | Sees and can talk to current members | Supported Normal | Task comment 2026-11-18 |

## Decisions

| ID | Question | Reasoning And Recommendation | Owner | Status |
| --- | --- | --- | --- | --- |
| DEC-001 | When does a run follow a changed definition? (a) automatically right away: running runs at once, stopped runs when reopened; (b) only when the run is reopened; (c) only when the user presses "Update team" on the run | You asked why it doesn't happen automatically; agent definition changes (tools) already apply live (IF-11), and a new member costs nothing until first needed (IF-08). (c) adds a manual step you'd forget for delegated copies running unattended. **Recommend (a).** **Decided by the user (2026-11-21): (a).** | User (2026-11-21) | Decided |
| DEC-002 | A removed member that is busy (mid-turn) | (a) it finishes its current turn (its outgoing messages from that turn still go out), then it is stopped and retired; no new messages reach it from the moment of removal. (b) stop it immediately, losing the turn. (a) avoids losing half-done work and is predictable. **Recommend (a).** **Decided by the user (2026-11-21): (a).** | User (2026-11-21) | Decided |
| DEC-003 | Which team runs | Standalone Team runs and delegated Team copies cover both your cases (IF-05, IF-06) and share one saved format. Teams mounted in an Org keep separate copies of members and rules (IF-10); including them roughly doubles the work. **Recommend: standalone + delegated copies now; Org-mounted Teams as a follow-up (FU-002).** **Decided by the user (2026-11-21): standalone Team runs and delegated Team copies now; Org-mounted Teams as follow-up FU-002.** | User (2026-11-21) | Decided |
| DEC-004 | Who is told, and how | The user (2026-11-21): every member still in the team gets the notice, not only the coordinator; agents act correctly on a clear notice, and the platform catches a rare mistake. **Decided by the user:** one short system notice, delivered when the agent is idle (like skill-update notices, IF-12), to **every remaining member**: who joined (with address), who left, and its current handoff rules (or to call `get_handoff_rules`). The new member needs none (it starts with the current team). | User (2026-11-21) | Decided |
| DEC-005 | Runtime and model of an added member | Nobody picks it, as for catalog copies; reuse that rule (IF-13): the agent definition's default, else the team run's own launch choice; workspace and auto-approve from the run. **Decided.** | Solution Designer | Decided |
| DEC-006 | Same member name, different agent | Treat as remove + add: the old member retires, a new run starts fresh (another agent's conversation must not continue). **Decided.** | Solution Designer | Decided |
| DEC-007 | Removed member added back later | It returns as the same member with its old conversation (identity kept as retired). Keeps context, matches what you value here. **Decided.** | Solution Designer | Decided |
| DEC-008 | Removed member's own delegated work (task agents it started) | Unchanged: delegated runs belong to their Tasks and the team root (CM-6/CM-7), not to the member; they finish or stop as their Tasks say. **Decided.** | Solution Designer | Decided |
| DEC-009 | Instructions already given to running members | A running member keeps its composed instructions until its next start/restore (as today for other definition changes); the notice (DEC-004) covers the gap. **Decided.** | Solution Designer | Decided |

## Data Continuity

- Persisted data affected: the run's saved tree (members, coordinator, handoffs) is updated in place; retired members stay recorded. Nothing deleted. Existing trees need no migration (design to confirm).

## Assumptions

| ID | Assumption | Validation |
| --- | --- | --- |
| ASM-001 | The definition-change announcement reaches the server for package-file edits and app saves alike | IF-11; design to verify |

## Readiness Check

- Content ready for approval: `Yes`; remaining blocker: None.
- Approved basis ready for design: `Yes` (User, 2026-11-21).
