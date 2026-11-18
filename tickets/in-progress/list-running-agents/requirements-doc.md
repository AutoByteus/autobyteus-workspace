# Requirements Document — list-running-agents (autobyteus-492)

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-002`
- Package identifier: `list-running-agents`
- Request / ticket: Project Task `autobyteus-492`, Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), for the founder
- Requirements owner: Solution Designer
- Date: 2026-11-18
- Approved by and reference: `User` (the founder) for DEC-001 and DEC-002, in the Solution Designer's conversation on 2026-11-18 ("as long as you know the target's agent run ID you should be able to send a message to it … doesn't matter if you're a task agent, a member in a task agent team, or from a remote node"); the remaining decisions by the Solution Designer within that direction (user informed in the same conversation)
- Exact approved requirements baseline / solution revision: SR-002 (this document)
- Behavior-defining supplements and their approved versions: None

## Problem And Desired Outcome

- Problem: an agent can find what it can *start* (`list_available_agents`), but not what already *runs*. To message a running agent, for example the Project Task Manager on another node, it must be given the run ID by a person. Investigation adds a second, larger problem: even with the run ID, today's rule refuses the message. Two Project Task Managers on one node cannot message each other (`TASK_AGENT_RESOURCE_CONFLICT`, reproduced, PRB-002), and no run on another node is reachable unless a delegation linked it (CM-11, PRB-001).
- Affected actors: agents that coordinate work (chiefly Project Task Managers) on this node and on paired peer nodes; the founder, owner of every node.
- Desired outcome: **the run ID is the address.** Any agent that knows a running agent's run ID messages it with `send_message_to`, on this node or (with `node`) on a paired node, whether the sender is a user-started run, a task agent, a member of a task agent team, or on another node (founder, 2026-11-18). An agent finds the run IDs of the running roots (the runs a person started) of its node or of a paired node with `list_running_agents`. Nothing about delegation changes.
- Observable definition of success: a PM on node A lists node B's running roots, finds B's Project Task Manager (by name and Project), sends it a message, and receives B's reply, with no person giving either a run ID.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Contract | SCN-001 | `list_available_agents` lists startable definitions, here or on a peer | Unchanged; a new pair tool lists running roots | Its output and rules | `agent_tools.md` |
| BEH-002 | Contract | SCN-001, SCN-002 | No tool lists running runs | `list_running_agents` lists live roots the user started (here, or on a paired node with `node`) | — | Code search |
| BEH-003 | Contract | SCN-003, SCN-006 | A message by run ID to a running agent of another run that no open Task relates to the sender's run is refused (`TASK_AGENT_RESOURCE_CONFLICT`), whoever sends | Delivered: any sender, any running agent of this node (DEC-001) | Messages between agents of one run; Task-related delivery | PRB-002 |
| BEH-004 | Contract | SCN-004 | A run ID of another node is unknown unless a delegation linked it | Reachable by run ID with `node` when it names a running agent of that paired node, from any sender (DEC-001) | Linked remote runs keep routing without `node` (CM-11) | PRB-001, PRB-003 |
| BEH-005 | Contract | SCN-005 | A message to a stopped, Task-related run wakes it (the assigner may reopen a closed one); a run whose Tasks are all closed takes input only from its assigner after a reopen | Unchanged. A stopped run messaged by a sender no open Task relates to is not woken: refused "not running" (DEC-003); a closed Task's run stays closed (DEC-011) | Wake, reopen and the closed-Task refusal | `cross-run-message-delivery.ts` |
| BEH-006 | Contract | SCN-003 | A team run ID given to `send_message_to` is refused with its coordinator's run ID | Unchanged; the list gives the coordinator's run ID directly | The refusal | Router code |
| BEH-007 | Contract | SCN-003 | A message to a working agent waits for its current turn | Unchanged: a message never interrupts | — | `agent_execution.md` |
| BEH-008 | Contract | — | `delegate_task` always starts a new copy | Unchanged: no delegation to a running root (founder, 2026-11-18) | All of `delegate_task` | Task comment 1 |

## Stakeholders, Actors, And Outcomes

| Actor | Goal | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| Project Task Manager (any coordinating agent with the tool) | Find and message the right running agent on its node or another | A short list with run IDs; the message arrives; the answer comes back | Sees no conversation content |
| Root that receives a message | Do its work undisturbed | The message waits for its current turn | Never stopped, interrupted or woken by another agent |
| Founder | Control who sees and talks to what | The rules of DEC-001/002 hold on every node | Release only on his word |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | An agent lists the running roots of its own node | SCN-001 |
| UC-002 | An agent lists the running roots of a paired peer node | SCN-002 |
| UC-003 | Any agent messages a running agent of its own node by run ID, and the receiver answers | SCN-003, SCN-006 |
| UC-004 | Any agent messages a running agent of a paired node by run ID and `node`, and the receiver answers | SCN-004 |

### Out Of Scope

- Delegating a Task to a running root (founder: not wanted).
- Listing delegated runs (copies), Team members, or stopped runs; listing run titles or any conversation content.
- Interrupting or stopping another agent's run, and waking a stopped run that no Task relates to the sender.
- Files (`reference_files`) on cross-node messages: refused across nodes as today for delegation.
- Retries or guaranteed delivery between nodes (FU-002 of autobyteus-191 stays a separate item).
- A UI for the list (the app's Runs view already shows runs to the user).
- The GitHub-items route for shared work between nodes (autobyteus-integrations).

### Non-Goals

- Discovery across all peers in one call (one node per call, as `list_available_agents`).
- Push notifications when a root starts or stops.

### Preserved Behavior Boundary

BEH-001, BEH-005, BEH-006, BEH-007, BEH-008; linked remote runs routing without `node` (CM-11); wake, reopen and the closed-Task refusal (CM-5/CM-6); Task closure stopping or fencing its runs; peer authentication (NA-2, NA-7, NA-9). Only the "runs of different Tasks are refused" part of CM-5 and the "no other run is reachable across nodes" part of CM-11 change.

### Prerequisites

None.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or follow-up.
- A downstream reviewer comment does not amend this requirements basis.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority | Rationale | Feasibility Evidence | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-001 | An opt-in agent tool `list_running_agents` lists the live roots of the caller's node that a person started (runs without `delegatedFrom`), except the caller's own root. | BEH-002 | Must | The pair of `list_available_agents` | N/A | Task description 1; founder comment 3; DEC-002, DEC-008, DEC-010 |
| REQ-002 | Each entry has: `run_id`, `kind` (`agent`, `agent_team`, `agent_org`), `name` (the definition's name), `address` (its catalog address), `message_run_id` (the run ID a message goes to: the agent itself, a Team's coordinator), `state` (`running`, `idle`, `error`), `started_at`, and `project` (the Project's name) when the root was started under a Project; with `node`, also `node`. No other field. | BEH-002, BEH-006 | Must | What an agent needs to pick and reach a root | N/A | DEC-004, DEC-005, DEC-006 |
| REQ-003 | A Team root is one entry; an Org root is one entry as DEC-004 decides. Team members and delegated runs are never entries. | BEH-002 | Must | Short list; no inner structure | N/A | Founder comment 3; DEC-004 |
| REQ-004 | Only live roots are listed (the root runs now). Stopped roots are never listed. | BEH-002 | Must | 1,572 stored runs (PRB-004) | N/A | Task description 1; DEC-003 |
| REQ-005 | Optional filters: `node` (a paired peer's name), `address` (a catalog address), `state` (`running` or `idle`). | BEH-002 | Should | Founder asked filters by node, definition and state | N/A | Task description 1; DEC-008 |
| REQ-006 | With `node`, the list comes from that paired peer, asked now through the existing authenticated peer channel, with the same refusals as `list_available_agents` with `node` (switch off, no such peer, unreachable). Nothing is cached. | BEH-002 | Must | Cross-node through node authentication | N/A | Founder comment 2; DEC-002 |
| REQ-007 | The list never contains conversation content, titles, prompts, settings, member names or Task content. | BEH-002 | Must | Runs hold private conversations | N/A | Task constraints |
| REQ-008 | `send_message_to(target_agent_run_id)` delivers to any running agent of this node, whoever the sender is (a user-started run's agent, a task agent, a member of a Team or task agent team, an Org's agent); "a different Task" is no longer a reason to refuse. The receiver answers the same way by the sender's run ID. | BEH-003, BEH-007 | Must | The run ID is the address (founder) | PRB-002 shows today's refusal; a rule change, no uncertain technology | DEC-001 |
| REQ-009 | `send_message_to` takes an optional `node` (a paired peer's name). With `node` it delivers to any running agent of that node by run ID, from any sender; the receiver sees the sender's node and run ID and answers with `send_message_to` and that `node`. | BEH-004 | Must | The founder's example; same as `delegate_task`'s `node` | Peer channel exists (autobyteus-191/437); new request kind | DEC-001, DEC-002, DEC-007 |
| REQ-010 | A message under REQ-008/009 never interrupts or stops the receiver: it waits for the current turn. It wakes a stopped run only where today's rule wakes it (a Task relates the two runs); otherwise a stopped or unknown run refuses it with a clear text ("… is not running …"), and nothing is woken. | BEH-005, BEH-007 | Must | One agent must not disturb another's work; no tokens spent on a run a person stopped | N/A | Task description 3; DEC-003 |
| REQ-011 | Everything else stays: messages inside a run; Task-related delivery, wake and reopen; a run whose Tasks are all closed refuses input except its assigner's reopen (`TASK_AGENT_RESOURCE_CLOSED`, also for a fenced remote run); linked remote runs keep routing by run ID without `node`; the team-run-ID refusal with the coordinator's run ID; `delegate_task` unchanged. | BEH-001, BEH-005, BEH-006, BEH-008 | Must | Preserved behavior | N/A | Founder comment 1; DEC-011 |
| REQ-012 | The tool descriptions and refusal texts say plainly: the list is for messages only (to start work use `delegate_task`); a message to a team goes to `message_run_id`; across nodes pass `node`; a stopped root is not listed and is not woken. The collaboration model records the new rule. | All | Must | Agents act on the tool text | N/A | Task description 2 |

## Acceptance Criteria

| AC ID | Related REQ | Related BEH / SCN | Preconditions / Trigger | Observable Expected Outcome | Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-003, REQ-004 | SCN-001 | Node with: two user-started Agent roots live (one is the caller), one user-started Team root live, one delegated copy live, one stopped user-started root | The caller's list holds exactly the other Agent root and the Team root | Caller without the tool: no tool | Server test + two-root E2E |
| AC-002 | REQ-002, REQ-007 | SCN-001 | AC-001's list | Each entry has exactly the REQ-002 fields; Team entry's `message_run_id` is its coordinator's run ID; no title or content | Root not under a Project: no `project` field | Unit test on the entry builder |
| AC-003 | REQ-005 | SCN-001 | Filters `address`, `state` | Only matching entries | Unknown address: empty list | Unit test |
| AC-004 | REQ-006 | SCN-002 | Two paired nodes, a live user-started PM root on B | A's `list_running_agents(node: "B")` lists it with `node: "B"` | Switch off / unknown peer / unreachable: the same refusal texts as `list_available_agents` with `node` | Two-server E2E |
| AC-005 | REQ-008, REQ-010 | SCN-003 | Two live user-started PM roots on one node (PRB-002's setup) | A's `send_message_to(B's message_run_id)` is delivered; B's answer to A is delivered; both runs' message logs hold both messages with one message ID each | B working: the message waits for B's turn | Server test turning PRB-002 green |
| AC-006 | REQ-009 | SCN-004 | AC-004's setup | A's `send_message_to(node: "B", target_agent_run_id: …)` is delivered on B, naming A's node and run ID; B's `send_message_to(node: "A", …)` answer reaches A | Run ID not running on B: refused, nothing delivered; `node` unknown/off/unreachable: today's peer refusal texts | Two-server E2E |
| AC-007 | REQ-010 | SCN-005 | A run that no open Task relates to the sender is stopped (locally, and on a peer) | Refused "… is not running …"; the run stays stopped | A Task-related stopped run is still woken (today) | Server test |
| AC-008 | REQ-008, REQ-011 | SCN-006 | A task agent messages a running agent of a run of another Task (local; and a member of a task agent team messages a running root on a peer) | Delivered | A run whose Tasks are all closed: `TASK_AGENT_RESOURCE_CLOSED` as today, except the assigner's reopen; Task-related wake and reopen tests stay green | Server tests; existing suites; E2E |
| AC-009 | REQ-012 | All | Read the tool descriptions and the collaboration model | The texts in REQ-012 are present | — | Review |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor | Goal | Trigger | Starting Condition | Steps | Expected Outcome | Alternate / Error | Validity | Evidence | REQ / AC |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | Contract | Agent with the tool | See what runs here | `list_running_agents()` | Some live roots | Call; read entries | Short list of live user-started roots | Empty list | Supported Normal Scenario (proposed) | Founder request | REQ-001…005, 007; AC-001…003 |
| SCN-002 | Contract | PM on node A | See what runs on B | `list_peer_nodes`, then `list_running_agents(node: "B")` | A and B paired, switch on | Call | B's live roots | Refusals as for discovery | Supported Normal Scenario (proposed) | Founder comment 2 | REQ-006; AC-004 |
| SCN-003 | Contract | PM root on A | Message another root on A | `send_message_to(message_run_id)` | Both live | Send; receiver answers | Delivered both ways | Receiver busy: queued | Supported Normal Scenario | PRB-002; founder 2026-11-18 | REQ-008, 010; AC-005 |
| SCN-004 | Contract | Any agent on A | Message a running agent on B (e.g. B's PM) | `send_message_to(node, run ID)` | Paired, target running | Send; B answers with `node: A` | Delivered both ways | Not running: refused | Supported Normal Scenario | Founder example and 2026-11-18 | REQ-009; AC-006 |
| SCN-005 | Contract | Any agent | Message a run that stopped | `send_message_to` | Target stopped, no Task relates them | Send | Refused, not woken | Task-related: woken as today | Supported Explicit Edge Scenario | DEC-003 | REQ-010; AC-007 |
| SCN-006 | Contract | Task agent or task team member | Message a running agent outside its Task | `send_message_to` | Target running | Send | Delivered | Closed Task's run: refused as today | Supported Normal Scenario | Founder 2026-11-18 | REQ-008, REQ-011; AC-008 |

## UI, Interaction, And Experience Requirements

- Applicable: `No` — an agent tool. Product design fields: N/A — not applicable.

## Quality And Non-Functional Requirements

| Quality ID | Related | Area | Requirement | Conditions | Verification |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-006 | Performance | A remote list answers within the peer request bound (20 s) | Peer unreachable | E2E |
| QR-002 | REQ-007 | Privacy | No content field ever leaves a node in the list answer; the peer client reads the answer strictly (unknown fields = malformed) | — | Unit test on the strict reader |
| QR-003 | REQ-006, REQ-009 | Security | Both new cross-node requests go through the signed peer gate (NA-9) and `PeerGateway` admission | — | Two-server E2E with a signed and an unsigned request |

## Data Continuity And Acceptable Loss

- Persisted data affected: `No` for the list. A delivered message is stored in both roots' message logs, as every message between runs (CM-9). No migration.

## External Contracts And Dependencies

| Contract | Required Behavior | Authority | Risk |
| --- | --- | --- | --- |
| Peer channel and authentication | Signed requests, admission by pairing | `node_access_model.md`, `remote_collaboration.md` | Both nodes must run the new release; an older peer answers 404, read as unreachable (DESIGN.md rule 9) |
| Collaboration model | New rule beside CM-5/CM-11 | `collaboration_model.md` | Model change |

## Supplemental Artifacts

None.

## Assumptions

| ID | Assumption | Why | Validation | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | A root a person started has no Task entry (Tasks belong to delegated runs), so "the Task it works on" is always empty for listed roots | Replaces Task by Project in REQ-002 | `collaboration_model.md` CM-6; PM run's metadata | Verified (Read) |

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | Who may message a running agent? | Today a message to a run of another Task is refused (PRB-002) and a run of another node is unreachable unless linked (PRB-001) | (a) list only; (b) **the run ID is the address**: any agent with a run ID (plus `node` for another node) messages any running agent; (c) only user-started roots message each other | Founder, 2026-11-18: "as long as you know the target's agent run ID you should be able to send a message to it … I don't see why the design should prevent it … doesn't matter if you're a task agent, a member in a task agent team, or from a remote node"; and earlier "send_message_to also adds this node ID, then the target agent run ID … the same for delegate_task". **Decided (b).** Waking a stopped run and the closed-Task refusal stay as today (DEC-003, DEC-011). | Founder | Decided (User) |
| DEC-002 | Who may see the list and message across nodes? | Visibility and reach of a node's runs | (a) the tool is opt-in per agent definition (as `list_available_agents`); pairing two nodes is the owner's permission for each to list and message the other's running agents; (b) (a) plus a per-node switch, off by default | Founder: messaging works "from a remote node" with the run ID, and he gave no extra condition; pairing already lets a peer start agents here, which is more than listing and messaging. **Decided (a).** | Founder (his answer to DEC-001 covers it) | Decided (User) |
| DEC-003 | A message to a stopped run that no open Task relates to the sender: wake it? | Waking spends tokens on a run a person or a Task closure stopped | (a) refuse, do not wake; (b) wake | Today's rule wakes only Task-related runs; the founder asked that a message can be *sent* to a known run, not that any agent can restart any run. Keeping today's wake rule is the preserved behavior; widening it would need him. **Decided (a)**; told to the founder. | Solution Designer within the direction | Decided |
| DEC-004 | Which roots are entries, and what does a Team or an Org entry show? | Founder: "the standalone running ones"; PM's reading on the Task: Team/Org runs as one entry, which the founder did not correct | Agent root: one entry. Team root: one entry, `message_run_id` = coordinator. Org root: an Org has no entry agent, so one entry with `units` (address, kind, `message_run_id`), no team members | Follows the PM's recorded reading; keeps one entry per run, a PM inside an Org reachable, and shows only catalog addresses already public through `list_available_agents`. **Decided**; told to the founder (he can narrow it to Agent runs). | Solution Designer within the direction | Decided |
| DEC-005 | Fields | — | Founder's list: run ID, name/address, node, state, Task, start time | Roots have no Task (ASM-001), so `project` (name of the Project it was started under) replaces it: it is what tells two PMs apart. No member count (nothing uses it). No title (it is built from the first message, i.e. content). | Solution Designer | Decided |
| DEC-006 | How a message reaches a Team | `send_message_to` talks with agents and refuses a team run ID with its coordinator's ID | Give the coordinator's run ID as `message_run_id` vs. let `send_message_to` accept team run IDs | Keeps `send_message_to` unchanged (BEH-006); one field tells the agent where to send. | Solution Designer | Decided |
| DEC-007 | How a run ID of another node is addressed | No `node` on `send_message_to` today | (a) optional `node` on `send_message_to`; (b) the server remembers listed run IDs | (a) is stateless and mirrors `delegate_task`'s `node`; the received message names the sender's node so the answer can pass it. Linked remote runs still need no `node`. | Solution Designer | Decided |
| DEC-008 | Filters and calls | — | — | One node per call (as `list_available_agents`); filters `node`, `address`, `state` (`running`/`idle`). | Solution Designer | Decided |
| DEC-009 | State values | Status vocabulary has `offline`, `idle`, `error`, `initializing`, `running` | — | Show `running` (working or starting), `idle` (waiting for input), `error` (its entry agent failed; a message restarts it, as today's host recovery). Team: its coordinator's state. | Solution Designer | Decided |
| DEC-010 | Does the caller see its own root? | Noise | — | No: its own root is left out. | Solution Designer | Decided |
| DEC-011 | Does the new rule also open a run whose Tasks are all closed (including a fenced remote run)? | Closing a Task ends its work; today only the assigner continues it, by a reopen | (a) keep `TASK_AGENT_RESOURCE_CLOSED` as today; (b) deliver to it like any running agent | A closed Task's run is ended work, not "a different Task"; the founder's point was that a different Task must not block a message. Keeping the closed rule keeps Task records truthful. **Decided (a)**; told to the founder. | Solution Designer within the direction | Decided |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | AC IDs | Scenario IDs | Supplemental |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-002 | AC-001 | SCN-001 | — |
| REQ-002 | UC-001, UC-002 | BEH-002, BEH-006 | AC-002 | SCN-001 | — |
| REQ-003 | UC-001 | BEH-002 | AC-001 | SCN-001 | — |
| REQ-004 | UC-001 | BEH-002 | AC-001 | SCN-001 | — |
| REQ-005 | UC-001 | BEH-002 | AC-003 | SCN-001 | — |
| REQ-006 | UC-002 | BEH-002 | AC-004 | SCN-002 | — |
| REQ-007 | UC-001, UC-002 | BEH-002 | AC-002 | SCN-001, SCN-002 | — |
| REQ-008 | UC-003 | BEH-003, BEH-007 | AC-005, AC-008 | SCN-003, SCN-006 | — |
| REQ-009 | UC-004 | BEH-004 | AC-006 | SCN-004 | — |
| REQ-010 | UC-003, UC-004 | BEH-005, BEH-007 | AC-005, AC-007 | SCN-003, SCN-005 | — |
| REQ-011 | — | BEH-001, BEH-005, BEH-006, BEH-008 | AC-008 | SCN-006 | — |
| REQ-012 | UC-001…004 | All | AC-009 | All | — |

## Architecture Phase Input

- Approved scenario IDs: SCN-001 … SCN-006.
- Constraints: no conversation content; peer gate for both cross-node requests; CM-5/CM-11 preserved for delegated runs.
- Deferred to design: where the "run ID is the address" rule lives (one owner replacing the different-Task refusal); the inbound path for an unlinked message from a peer, how the answer routes back, and both logs; how a live root is enumerated (`ActiveCollaborationRootDirectory`); Org entry building.
- Technical facts to verify: how the sender's node and run ID appear in the receiver's message header; whether a Team root's coordinator can be the sender under the rule; root registration across server restart.
- Risks: model change (CM-5/CM-11); a two-node protocol change (both nodes need the new release).

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
- Remaining content blocker: None

### Approved Basis Ready For Design

- Approval recorded: `Yes` (the founder for DEC-001/002; the Solution Designer within his direction for the rest, founder informed)
- Exact requirements and supplement approval basis recorded: `Yes` (SR-002; no supplements)
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: None
