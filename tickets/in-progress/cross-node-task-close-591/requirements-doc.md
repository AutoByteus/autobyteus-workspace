# Requirements Document

## Document Status

- Status: `Approved` (SR-002)
- Current solution revision ID: `SR-002`
- Package identifier: `cross-node-task-close-591`
- Request / ticket: Project Task `autobyteus-591` in Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), on the founder's word
- Requirements owner: Solution Designer (run `solution_designer_65a93db823284ad5b4e87726a5b250a2`)
- Date: 2026-11-21
- Approved by and reference: the user decided DEC-004 (2026-11-21, quoted there). The rest was approved by the Solution Designer within the direction, and the user was informed in the conversation (2026-11-21)
- Exact approved requirements baseline / solution revision: this document at SR-002
- Behavior-defining supplements and their approved versions: none

## Problem And Desired Outcome

- **Problem:** closing a Task (DONE or CANCELLED) on the delegating node stops its local runs, but not a run of that Task on a peer node.
  - The delegating node only logs `TASK_AGENT_RESOURCE_FENCED_REMOTE` (F-1), and nothing reaches the peer.
  - The peer's idle shutdown doesn't help while any agent of the run is still running (F-5).
  - Seen live on 2026-11-21: the Mac closed `ad_hoc_task_889b2aa6-…`, and docker-8001's Marketing Team was still running 12 minutes later (F-2, F-6).
- **Affected actors or systems:** the delegating node (its Task closure); the peer node that runs the delegated run (its lifecycle); the peer's owner, who sees the run on his node.
- **Desired outcome:** closing a Task stops its runs wherever they live, by the same rule as for local runs (CM-7).
- **Observable definition of success:** in a real two-node test, closing a Task on node A, DONE or CANCELLED, stops the remote agent run or remote team run on node B. A peer that was unreachable at the close gets the stop once it is reachable again.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | SCN-001 | A closed Task's local runs that have no other open Task stop through their ordinary Stop. A run on a peer is skipped | The same for a run on a peer: it stops on its node through its ordinary Stop | Local closure as is, including a run kept when a reopen or new assignment commits during the stop (CR-461-001) | F-1, F-3 |
| BEH-002 | System | SCN-002 | Nothing is retried, because nothing is sent | A stop that can't reach the peer is delivered when the peer is reachable again, also after either node restarts | — | F-1 |
| BEH-003 | Contract | SCN-003 | The peer runs only requests about runs the caller's delegation started (link check) | Unchanged for the new stop | The link check, pairing and signatures (CM-12, autobyteus-437) | F-4 |
| BEH-004 | User | SCN-004 | On the peer, a peer-started run is a top-level row whatever its state | Listed on the peer only while its delegation is open; leaves the list when its Task closes, and is listed again when a message after a reopen wakes it (DEC-004) | The run's stored conversation on the peer; its rows on the delegating node | F-7 |
| BEH-005 | System | SCN-001 | A stopped run wakes on a later message (CM-7), keeping its conversation | Unchanged for a remote run stopped by its Task's closure | Memory, message log and history on both nodes stay | F-3 |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| The delegating node's agent (for example the Project Task Manager) or user | Close a Task when its work is done | The Task's runs stop, local or remote | Nothing new to do: `update_task` as today |
| The peer node and its owner | Run what a paired peer delegated | Delegated runs end when their Task ends; resources are released | The peer owns the run's lifecycle (CM-10); it stops only what the delegating node's delegation started |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | Closing (DONE or CANCELLED) a Project Task or a temp Task stops its remote agent and team runs that have no other open Task | SCN-001 |
| UC-002 | The same, when the peer is unreachable at the close or either node restarts | SCN-002 |
| UC-003 | How a run stopped this way shows on the peer (DEC-004) | SCN-004 |

### Out Of Scope

- autobyteus-380's rules for temp Tasks (automatic close, adoption, reopen by message). This ticket applies whatever closure rule holds locally (DEC-006).
- Reactivating a remote run on reopen (named in §4 with the stop). As today, a later message wakes it (CM-7).
- File transfer across nodes (autobyteus-587).
- Grouping peer-started runs under their peer on the receiving node (DEC-004 chose the local behavior instead).

### Non-Goals

- No new tool, and no change to `update_task` or `delegate_task` for agents.

### Preserved Behavior Boundary

BEH-001's local closure, BEH-003 and BEH-005. Messages, statuses, views and owner commands through the link are unchanged (CM-11).

### Prerequisites

None.

### Review Authority

As the template states.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority | Rationale | Feasibility Evidence | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-001 | When a Task is set to DONE or CANCELLED on its node, each run of that Task on a peer node that has no other open Task is stopped on that node through the run's ordinary Stop (an agent run, or a whole team run). While the peer is reachable, this happens within 30 s of the close. | BEH-001 | High | CM-7 for every run, wherever it lives | The link's stop exists (F-4) | Task direction 1; DEC-001, DEC-003 |
| REQ-002 | When the peer can't be reached at the close, the stop is delivered once it is reachable again, within 30 s of the delegating node seeing it reachable, also after either node restarted in between. It is never delivered for a run whose Task was reopened, or that got another open Task, before delivery. | BEH-002 | High | "Peer temporarily offline" (direction 2) | To verify in design: how the node sees a peer return (U-2) | DEC-002 |
| REQ-003 | The peer stops only runs the requesting node's delegation started, as for every link request. | BEH-003 | High | The link's security contract | F-4 | CM-12 |
| REQ-004 | A run stopped this way keeps its memory, message log and history on both nodes. A later message wakes it, as for a local run. Its row on the delegating node shows it stopped (offline). | BEH-005 | High | CM-7 | Existing statuses through the link (CM-11) | — |
| REQ-005 | On the peer, a run its Task's closure stopped leaves the run list (desktop and phone) within the existing live-update time, as a local closed delegated run does. It is listed again when a later message wakes it. Its stored conversation stays on the peer. | BEH-004 | High | "Just like the task agent and task agent team"; a node that serves many delegations must not pile up rows | — | DEC-004 (user) | How the stopped run shows on the peer | Visible product behavior | (a) a top-level row, shown stopped; (b) like a local closed delegated run, it leaves the run list; (c) grouped under its node | **The user (2026-11-21):** "when we close the task … the resource on the remote node should also be closed just like the task agent and task agent team … otherwise you leave a lot of task agent or task agent team on the remote … imagine that if I have a node I use this node to delegate a lot of tasks for other nodes". So it is **(b), as for a local one**: the run stops and leaves the peer's run list. Its conversation stays stored, and it stays visible on the delegating node under its delegating run and on its Task's page. A later message (after a reopen) wakes it, and it is listed on the peer again while that delegation is open. (a), the earlier recommendation, would pile up stopped rows on a node that serves many delegations | User | Decided |

## Acceptance Criteria

| AC ID | Requirements | Scenario | Trigger | Observable Outcome | Alternate / Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-004 | SCN-001 | Two real nodes, paired. Node A delegates a Task to a single agent on node B, then sets the Task to DONE | Within 30 s B's run is stopped (offline, no runtime process), and A's child row shows it offline. Its conversation stays on B | — | Two-node E2E (API/E2E) |
| AC-002 | REQ-001 | SCN-001 | The same with an Agent Team on B, and CANCELLED | Every member of the team run on B is offline within 30 s, including a member that was running at the close | — | Two-node E2E |
| AC-003 | REQ-001 | SCN-001 | The remote run also has another open Task on A | The run is not stopped | — | E2E or integration |
| AC-004 | REQ-002 | SCN-002 | B is unreachable when A closes the Task, then becomes reachable, with A or B restarted in between | B's run is stopped within 30 s of A seeing B again | If the Task is reopened before B is reachable, nothing is stopped | Two-node E2E with B stopped and restarted, and integration for the reopen |
| AC-005 | REQ-003 | SCN-003 | A third paired node sends the stop for B's run that A's delegation started | Refused; the run keeps running | — | Integration |
| AC-006 | REQ-005 | SCN-004 | After AC-001 / AC-002, on B's run list (desktop and phone) | The run is no longer listed on B, and stays listed on A under its delegating run and on the Task's page. Its conversation is still stored on B | After a reopen and a message from A, the run wakes and is listed on B again | Browser on B and the phone layout |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor | Goal | Trigger | Starting Condition | Steps | Outcome | Alternate | Validity | Evidence | Reqs / ACs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | System | The delegating node's Task owner (an agent with `update_task`, or the user on the Task's page) | End the Task's work | `update_task` DONE / CANCELLED, or the Task page | A delegated, with `node`, to an agent or team on B | Close; A tells B; B stops the run | B's run stops; resources are released | Another open Task: no stop | Supported Normal Scenario | F-2 (the founder's live case) | REQ-001, 004; AC-001 … 003 |
| SCN-002 | Operational | The same | The same | The same | B unreachable (offline, restarting, network) | The close is owed; B returns; A delivers | B's run stops on return | A reopen in between cancels it | Supported Explicit Edge Scenario (the Task's direction 2) | Task direction | REQ-002; AC-004 |
| SCN-003 | Contract | A paired node | — | A stop request | — | B checks the link | Only the delegating node's own runs | — | Supported Normal Scenario (CM-12) | F-4 | REQ-003; AC-005 |
| SCN-004 | User | B's owner | See what runs on his node | B's run list | A run stopped by its Task's close | — | DEC-004 | How the stopped run shows on the peer | Visible product behavior | (a) a top-level row, shown stopped; (b) like a local closed delegated run, it leaves the run list; (c) grouped under its node | **The user (2026-11-21):** "when we close the task … the resource on the remote node should also be closed just like the task agent and task agent team … otherwise you leave a lot of task agent or task agent team on the remote … imagine that if I have a node I use this node to delegate a lot of tasks for other nodes". So it is **(b), as for a local one**: the run stops and leaves the peer's run list. Its conversation stays stored, and it stays visible on the delegating node under its delegating run and on its Task's page. A later message (after a reopen) wakes it, and it is listed on the peer again while that delegation is open. (a), the earlier recommendation, would pile up stopped rows on a node that serves many delegations | User | Decided | — | Supported Normal Scenario | F-7, screenshot | REQ-005; AC-006 |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes`, only through DEC-004 (the receiving node's list): no new screen; the existing list drops the row.
- Product decisions that need the user: none open (DEC-004 decided by the user).
- Other Product fields: `N/A — not applicable`.

## Quality And Non-Functional Requirements

| Quality ID | Related | Area | Requirement | Scope | Verification |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-001, REQ-002 | Reliability | The stop is delivered at least once while it's owed, and stopping twice is harmless | Both nodes | E2E with a repeated close |
| QR-002 | REQ-002 | Operability | Owed stops cost no work on start-up or reconnect beyond the owed ones (no scan of closed history) | The delegating node | Design and review |

## Data Continuity And Acceptable Loss

- **Persisted data affected:** `Unknown`. To keep an owed stop across a restart (REQ-002), the delegating node may need to record it. For REQ-005, the peer needs to know a run's delegation closed, so its list can drop the row after a restart too. The architecture decides how, by the data migration guideline (no migration is expected: an optional record whose absence means "nothing owed").
- **Must be preserved:** both nodes' memories, message logs, Task entries and history.
- **Acceptable:** none lost.

## External Contracts And Dependencies

| Contract | Required Behavior | Evidence | Risk |
| --- | --- | --- | --- |
| The peer link (`/rest/remote/*`, signed, paired) | Carries the stop; both nodes run the same release (DESIGN.md rule 9) | F-4 | None: one release, a clean cut |

## Decisions

| ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | Who starts the stop | Ownership (CM-10) | (a) the delegating node tells the peer at the close (push); (b) the peer polls the delegating node | The delegating node owns the Task's state; the peer owns the run. A push at the close is immediate, uses the existing link and stop (F-4), and needs no polling on the peer. **(a)** | Solution Designer | Decided |
| DEC-002 | An unreachable peer | Direction 2 | (a) give up and log; (b) retry until delivered, while the Task stays closed; (c) the peer's idle shutdown | (c) fails exactly in the founder's case (F-5), and (a) leaks the run. **(b)**: owed per run, delivered when the peer is reachable again and after a restart, and dropped on a reopen or another open Task | Solution Designer | Decided |
| DEC-003 | Who decides "no other open Task" | CM-7 | The delegating node holds every Task entry that names its remote run | **The delegating node decides**, and the design verifies U-1 (whether any other Task can name the run). If one can, it returns here | Solution Designer | Decided, U-1 to verify |
| DEC-004 | How the stopped run shows on the peer | Visible product behavior | (a) a top-level row, shown stopped; (b) like a local closed delegated run, it leaves the run list; (c) grouped under its node | **The user (2026-11-21):** "when we close the task … the resource on the remote node should also be closed just like the task agent and task agent team … otherwise you leave a lot of task agent or task agent team on the remote … imagine that if I have a node I use this node to delegate a lot of tasks for other nodes". So it is **(b), as for a local one**: the run stops and leaves the peer's run list. Its conversation stays stored, and it stays visible on the delegating node under its delegating run and on its Task's page. A later message (after a reopen) wakes it, and it is listed on the peer again while that delegation is open. (a), the earlier recommendation, would pile up stopped rows on a node that serves many delegations | User | Decided | How the stopped run shows on the peer | Visible product behavior the direction leaves open | (a) **as today**: a top-level row on the peer, shown stopped (grey), like a run its owner started (a peer-started run has no local parent, F-7); (b) leaves the peer's run list once its Task closed, like a local closed delegated run, but the peer has no Task page to find it on afterwards; (c) the peer groups peer-started runs under their node ("From MacBookPro"), a new list presentation | (a) needs no new state or screen, and the stopped row tells the truth. (c) is a presentation feature of its own, and (b) hides a run the peer's owner can no longer reach. **Recommend (a) here, with (c) as a follow-up if wanted** | User | Needs user |
| DEC-005 | Runs that leaked before this fix (Tasks closed while it was missing) | The founder's docker-8001 | (a) a one-time sweep of all closed Tasks' remote runs at the first start; (b) no sweep: they're stopped by hand | The fix can't know which old closures went unsent without scanning the closed history, and the one known case is a single team. **(b)**: the founder stops the Marketing Team from its row on docker-8001, or from the Mac's view | Solution Designer | Decided (the user informed) |
| DEC-006 | Alignment with autobyteus-380 | Direction 2 | 380 changes how a temp Task closes and, if approved, may release an adopted run to the user instead of stopping it | The remote stop applies **the same closure rule as the local one, through the same decision**. Whatever 380 decides for local runs then holds for remote ones, without a second rule | Solution Designer | Decided |

## Traceability

| Requirement | Use Cases | Behaviors | ACs | Scenarios |
| --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001 | AC-001, 002, 003 | SCN-001 |
| REQ-002 | UC-002 | BEH-002 | AC-004 | SCN-002 |
| REQ-003 | UC-001 | BEH-003 | AC-005 | SCN-003 |
| REQ-004 | UC-001 | BEH-005 | AC-001 | SCN-001 |
| REQ-005 | UC-003 | BEH-004 | AC-006 | SCN-004 |

## Architecture Phase Input

- **Verify:**
  - U-1: Tasks that can name a peer-started run;
  - U-2: how a peer's return is seen, and what survives a restart;
  - U-3: the link's `terminate`, or a "Task closed" request, against the reopen race.
- **Preserve:** the local closure path and its `kept_open` race; the link check.
- **Feasibility of the proof:** two-node E2E runs on one machine with two servers (done in autobyteus-500's round 7: RC 49/49).

## Readiness Check

- Current behavior evidence-backed: Yes. Desired and preserved behavior explicit: Yes. Scope clear: Yes. Testable and traceable: Yes. Scenarios covered: Yes. Decisions visible with reasoning: Yes.
- Content ready for approval: Yes. Approved at SR-002.
