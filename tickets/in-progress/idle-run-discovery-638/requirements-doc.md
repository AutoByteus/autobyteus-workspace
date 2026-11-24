# Requirements Document — autobyteus-638 Find and wake a user's sleeping runs

## Document Status

- Status: `Ready for Approval` (waiting for the founder's decisions DEC-003 and DEC-005)
- Current solution revision ID: `SR-001`
- Package identifier: `idle-run-discovery-638`
- Request / ticket: autobyteus-638, "Cross-node & local agent discovery: find and wake idle-stopped user runs instead of spawning duplicates"
- Requested by: `/project_task_manager` (for the founder)
- Requirements owner: Solution Designer
- Date: 2026-11-24
- Approved by and reference: not yet
- Behavior-defining supplements: none. Evidence: [investigation-notes.md](investigation-notes.md)

## Problem And Desired Outcome

- **Problem:** an agent that wants to message a user's existing run (the founder's Project Task Manager on docker-8001) can't find it once the run is no longer loaded.
  - `list_running_agents` lists only live runs, and `send_message_to` refuses a run that isn't live.
  - So the agent delegates a duplicate.
  - In the incident the runs were unloaded by the node's restart for the 1.5.14 update, not by the 10-minute idle timer, which applies only to delegated runs (investigation-notes §1).
- **Desired outcome:** a run a person started stays findable and reachable until the person stops or archives it, whether or not it is loaded right now. A message to it wakes it. Runs whose work ended (a person's Stop, an archive, a delegated run whose Tasks closed) stay unreachable.
- **Success:** after a restart, `list_running_agents(node: "docker-8001")` returns the founder's Project Task Managers as `sleeping` with workspace and last activity. A message to one of them wakes it with its conversation, and no duplicate is needed.

## Relevant Current And Desired Behavior

| ID | Kind | Current | Desired | Preserved | Evidence |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | Contract | The list holds only live runs a person started | Also holds that kind's **sleeping** runs (not live, not stopped by a person, not archived), marked `sleeping`, with last activity | Delegated runs, Team members and Org runs are never listed; the caller's own run is left out | notes §2 |
| BEH-002 | Contract | A message by run ID to a run that isn't live is refused "not running" unless a Task relates the two | A message to a **sleeping** run a person started wakes it with its conversation, from any sender, on this node or a paired node | Waiting for the receiver's turn; never interrupting | notes §2 |
| BEH-003 | Contract | A run a person stopped, an archived run, a delegated run whose Tasks are all closed: refused | Unchanged (DEC-003 asks about the person's Stop) | `TASK_AGENT_RESOURCE_CLOSED`, the assigner's reopen | notes §2 |
| BEH-004 | Contract | A delegated run with an open Task, idle-shut-down: woken by related runs only | Unchanged | CM-5 | notes §2 |

## Scope Guardrail

### In-Scope Use Cases

| ID | Use case | Scenarios |
| --- | --- | --- |
| UC-001 | An agent lists the user's runs on this node or a peer and sees sleeping ones | SCN-001 |
| UC-002 | An agent messages a sleeping run (an Agent, or a Team through its coordinator) and it wakes | SCN-002 |
| UC-003 | A message to a run that is retired is refused with a clear reason | SCN-003 |

### Out Of Scope

- When runs are unloaded: the idle-shutdown timer, restart resume, and restoring runs after a restart (option B).
- Org runs and Team members in the list.
- The run list UI (the grey "offline" dot stays as it is).
- Who may *start* work (`delegate_task`).
- The security layer follow-up from autobyteus-587.

### Non-Goals

- Ranking or choosing "the right" run for the agent. The entries give workspace, project and last activity; the agent chooses.

### Preserved Behavior Boundary

- autobyteus-492 REQ-003 (who is listed: runs a person started), REQ-010 (never interrupt; wait for the turn), REQ-011 (Task wake, reopen, closed-Task refusal, fenced remote runs) and CM-5/CM-6/CM-7, except the "never wakes" part of CM-13 for sleeping runs a person started.
- 492 REQ-004 ("only live roots are listed") and DEC-003 are replaced by this ticket.

### Prerequisites

None.

### Review Authority

As the template states.

## Requirements

| ID | Requirement | Behavior | Priority | Rationale | Feasibility | Source |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-001 | A run a person started is **sleeping** when its agent isn't live and the run is not archived and was not stopped by a person (DEC-003). The list includes sleeping runs as `state: "sleeping"` | BEH-001 | Must | The founder's direction | Data exists: `archivedAt`, `terminatedAt`, `delegatedFrom` (notes §2) | Task comment; DEC-002 |
| REQ-002 | Every entry has `last_active_at`. Entries are ordered newest activity first. The `state` filter accepts `sleeping` | BEH-001 | Must | Several runs of one definition exist (4 Project Task Managers on docker-8001) | `lastActivityAt` exists (notes §2) | DEC-006 |
| REQ-003 | A message by run ID to a sleeping run (an Agent's agent, or a sleeping Team's coordinator) wakes it with its conversation and delivers the message, on this node or from a paired node (`node`) | BEH-002 | Must | No duplicate needed | Restore exists (`resolveOrRestore`) | Task comment; DEC-007 |
| REQ-004 | A message to a run a person stopped (per DEC-003), an archived run, or a delegated run whose Tasks are all closed is refused, and the text says why and what to do (for example "it was stopped by its owner; delegate_task starts new work") | BEH-003 | Must | Retired runs stay retired | — | Task comment |
| REQ-005 | Delegated runs stay out of the list, and their wake rule is unchanged | BEH-004 | Must | Founder: closed task agents stay retired | — | Task comment |
| REQ-006 | The tool's description and the collaboration model say: sleeping runs are listed and wake on a message; message an existing run before delegating a new one | All | Must | Agents act on the tool text | — | Task goal |
| REQ-007 | The tool name follows DEC-005 | All | Must | The name must say what it lists (Principle 15) | — | DEC-005 |

## Acceptance Criteria

| ID | Req | Trigger | Expected | Failure / alternate | Verification |
| --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-002 | Node restarted; a run a person started was idle before | Listed as `sleeping` with `last_active_at`, newest first; live runs still `running`/`idle` | Archived run: not listed; stopped by a person: per DEC-003 | Server test + two-server E2E across a restart |
| AC-002 | REQ-003 | Agent on node A messages a sleeping run on node B (with `node`) | The run wakes with its conversation, the message is delivered, and a later list shows it live | A sleeping Team, messaged through its coordinator: the Team wakes | Two-server E2E |
| AC-003 | REQ-004 | Message to a stopped / archived / closed-Task run | Refused with the reason; nothing woken | — | Server tests |
| AC-004 | REQ-005 | Delegated run idle-shut-down, open Task; an unrelated sender | Not listed; the message refused as today; a related sender wakes it as today | — | Existing suites green |
| AC-005 | REQ-006, REQ-007 | Tool text and docs | Say the rule plainly | — | Prompt-wording test |

## Relevant Scenarios

| ID | Kind | Actor | Goal | Steps | Outcome | Validity |
| --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | Contract | An agent with the tool (here the Project Task Manager on the Mac) | Find the user's existing agent on a node | List with `node` | Sees running, idle and sleeping runs with workspace, project and last activity | Supported Normal (the incident) |
| SCN-002 | Contract | Same | Hand work to the existing agent | `send_message_to` its run ID with `node` | It wakes and answers | Supported Normal |
| SCN-003 | Contract | Any agent | Message a run whose work ended | `send_message_to` | Refused with the reason | Supported Normal |

## UI, Interaction, And Experience Requirements

- Applicable: No (agent tools only). Product design: N/A, not applicable.

## Quality And Non-Functional Requirements

| ID | Req | Area | Constraint |
| --- | --- | --- | --- |
| QR-001 | REQ-001 | Performance | Listing reads only the not-archived, not-stopped rows a person started (4 + 1 on docker-8001, 2 on this Mac): no full scan of stored runs per call |
| QR-002 | REQ-003 | Cost | A run wakes only on a message to it; listing never wakes anything |

## Data Continuity

- Persisted data affected: no stored shape changes, except DEC-005 (the stored `toolNames` of agent definitions, if the tool is renamed).

## Decisions

| ID | Question | Why it matters | Options | Reasoning and recommendation | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | Cause | The Task says the 10-min idle timer stopped the user's runs | — | Evidence: the timer applies only to delegated runs. The user's runs were unloaded by the restart for the 1.5.14 update (notes §1). The founder's fix still fits and covers restarts, crashes and updates too | Solution Designer | Decided (founder informed) |
| DEC-002 | Which runs are "sleeping"? | Defines what is listed and woken | — | Runs a person started that aren't live, aren't archived and weren't stopped by a person: exactly the runs that are still the person's working agents. Delegated runs never (REQ-005) | Solution Designer | Decided |
| DEC-003 | A run the person **stopped** with Stop: sleeping (listed, wakeable) or retired? | Waking it undoes the person's own action and spends tokens | (a) retired: not listed, a message refused "stopped by its owner"; (b) sleeping like the others | Stop is the person's explicit "end this". An agent should not undo it, and the person can still open the run and send to it. **Recommend (a).** | Founder | Needs user |
| DEC-004 | Option for the whole fix | — | A list + wake; B restore after restart; C separate tool; D text only | A is the founder's direction and the only one that fixes the problem without starting unused runtimes (notes §4). **A** | Solution Designer | Decided |
| DEC-005 | Keep the name `list_running_agents`? | It will list agents that are not running | (a) keep; (b) rename to `list_reachable_agents` (every entry can be messaged now), with a one-time migration of agent definitions that select the tool | A name that says less than it does misleads agents into thinking sleeping runs are missing. The tool is a week old and opt-in, so the migration is small. **Recommend (b).** | Founder | Needs user |
| DEC-006 | How to tell several runs of one definition apart | 4 Project Task Managers on docker-8001 | — | Add `last_active_at`; newest first; workspace and project are already there | Solution Designer | Decided |
| DEC-007 | Who may wake a sleeping run? | Cost | any sender with its run ID (local or paired node) vs related only | The founder's direction: discoverable and wakeable so duplicates are not spawned. Paired nodes are trusted (autobyteus-587). **Any sender** | Solution Designer | Decided |

## Traceability

| Req | UC | BEH | AC | SCN |
| --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001 | AC-001 | SCN-001 |
| REQ-002 | UC-001 | BEH-001 | AC-001 | SCN-001 |
| REQ-003 | UC-002 | BEH-002 | AC-002 | SCN-002 |
| REQ-004 | UC-003 | BEH-003 | AC-003 | SCN-003 |
| REQ-005 | UC-003 | BEH-004 | AC-004 | — |
| REQ-006 | all | all | AC-005 | — |
| REQ-007 | all | all | AC-005 | — |

## Architecture Phase Input

- Contract first (Principle 17): the list entry (`state: sleeping`, `last_active_at`), the peer wire shape, and the refusal texts.
- To verify:
  - restore of a sleeping Team through its coordinator;
  - the unlinked remote message path (`/rest/remote/run-messages`) restoring a root on the peer;
  - the restart reminder riding the wake.

## Readiness Check

- Content ready for approval: Yes
- Remaining blocker: founder decisions DEC-003, DEC-005
