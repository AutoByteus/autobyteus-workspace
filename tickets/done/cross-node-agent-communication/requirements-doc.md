# Requirements Document — Cross-Node Agent Collaboration (parent Task; first slice)

## Document Status

- Status: `Approved` (2026-10-19, SR-004)
- Current solution revision ID: `SR-011` (requirements last changed in SR-007)
- Package identifier: `cross-node-agent-communication`
- Request / ticket: Parent Project Task "Cross-node agent collaboration (trusted private network)": investigation, requirements and the plan of slices. Unparked 2026-10-19.
- Requested by (the user, or the delegating agent's address): `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), on the user's decision of 2026-10-19
- Requirements owner: Solution Designer (`/software_engineering_team/solution_designer`)
- Date: 2026-10-19
- Approved by and reference: `User`, in the Solution Designer conversation, 2026-10-19: "In general, yeah, text one, slice one text only remote delegations S2. Yeah, I think you had a good plan … You had a really good plan. … you can send the suggested ticket to project task manager, then it can create those tickets. And then we start after that, so we start to work on text only." The user approved the plan as presented. DEC-101, DEC-102 and DEC-103 were not answered one by one, so they stand as recommended: (a), (a), (a). The user may still change them while slice 1's architecture is discussed with him; such a change goes through Recovery (renewed approval).
- User direction recorded with the approval: "the main thing is that we should discuss about the architecture … the very first ticket is how do we achieve … the communication itself. … we set up the main architecture, main frame." Slice 1's Task therefore starts with its architecture design (the inter-node communication frame: F-2 … F-4 of `slice-plan.md`), which is discussed with the user before review and implementation.
- Exact approved requirements baseline / solution revision: this document at SR-005. SR-003 content approved 2026-10-19 (SR-004); SR-005 change (no version check between nodes: REQ-114, AC-104, AC-111, REQ-109, QR-104 removed, ASM-101) approved by the user 2026-10-19: "we don't want to introduce … if people want to use our latest feature, of course, they must upgrade the node … the way the rule nine is used to make sure that we can keep our code clean."
- Behavior-defining supplements and their approved versions: `slice-plan.md` (SR-003 content, approved 2026-10-19; SR-004 added the architecture-first note to the slice 1 Task text)

### How this document is scoped

The parent Task's own work is the investigation, the requirements and the plan of slices. The slices do the building. This document therefore has two levels:

1. **Parent target** (§ Parent Target Capability): the whole capability the parent's done-when describes, in outline. Its slices are in `slice-plan.md`. Later slices are listed there but not specified yet.
2. **Slice 1 requirements** (everything from § Relevant Current And Desired Behavior on): specified in full. Slice 1 is the first Task proposed as a part of this parent. Once the user approves it, its architecture design, review, implementation, validation and delivery run in that part's Task.

The earlier draft (SR-001/SR-002, 2026-10-01, written before the collaboration model) is kept unchanged in `history-sr-002/`. § Old Draft Decisions maps its decisions.

## Problem And Desired Outcome

- Problem: AutoByteus nodes (the desktop's embedded server, remote or Docker servers) work independently. An agent on one node cannot hand work or messages to an agent on another node. Example: the user generates a video on the host node, and another node has full computer use. Today the user copies the files over by hand, starts an agent on that node and asks it to publish.
- Affected actors or systems: the owner(s) of two nodes; an agent run on the delegating node (node A); a published agent on the receiving node (node B); the two node servers; the desktop UI of each node window.
- Desired outcome (parent): agents on paired nodes in a trusted private network start published agents on each other with a task and attachments. The delegating run and the remote run then message each other in both directions.
- Desired outcome (slice 1): the user has two nodes already (the desktop node and a Docker node). An agent on one node hands a **text-only** task to a **published agent** on the other. The remote run is an independent run on the receiving node. The delegating run and the remote run exchange follow-up messages in both directions. The feature is off by default and for a trusted private network only. No credential travels between nodes. There is no authentication yet, but there is a defined place to add it.
- Observable definition of success (slice 1): the feature is on and the two nodes are registered with each other. An agent on the desktop node delegates to a published agent on the Docker node in one `delegate_task` call and gets back the remote run ID. The two runs then complete at least one round of follow-up messages in each direction. This still works after the remote run went idle and after either server restarted. The same works with the roles swapped (Docker → desktop).

## Parent Target Capability (outline; not slice 1)

This outline comes from the parent's done-when and the agreed direction. Each item names the slice that delivers it (see `slice-plan.md`).

| Capability | Slice |
| --- | --- |
| Node owners connect two nodes as peers (trusted case, without a secret) and turn the feature on | S1 |
| Node owners publish the Agents they choose; nothing is published by default | S1 (Agents), S4 (Agent Teams) |
| An agent starts a published agent on a peer with a task; the remote run is an independent run on the peer, linked to its coordinator | S1 |
| Follow-up messages flow both ways between the delegating run and the remote run | S1 (text), S2 (with attachments) |
| Attachments: the sender names its own files; the product copies them; the receiver gets local paths plus a mapping back | S2 |
| Task lifecycle across nodes: closing the Task stops the remote run; user stop and reactivation; the remote run is visible on both nodes with its origin | S3 |
| Agents discover peers and their published agents | S5 |
| Security: owner pairing with a secret, peer authentication, permission checks | S6 (own Task; RSK-001 is a separate Task) |

## Relevant Current And Desired Behavior (slice 1)

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-101 | Operational | SCN-101 | Only the desktop app's node registry knows about nodes, and it is client-side. Servers have no notion of peers. Memory Sync is the only server-to-server feature (source → hub, with a token). | A node owner turns cross-node collaboration on for a node (off by default) and registers peer nodes on it. Each registration is pinned to the peer's stable server identity. | Desktop node registry, node windows, Phone Access and Memory Sync unchanged | INV S-06, S-07, S-08 |
| BEH-102 | Operational | SCN-102 | There is no concept of agents that another node may start | A node owner publishes individual Agent definitions for peers to start, with the launch settings they run with on that node. Nothing is published by default. | Agent definitions, catalog and `@`/`list_available_agents` behavior on the node unchanged | S-05, S-10 |
| BEH-103 | Contract | SCN-103 | `delegate_task` starts a copy of an in-run placement or a listed catalog definition **on the same server**. The copy is hosted in the coordinating run's process (CM-7 "hosting"). The result names the new run ID. | An agent can also delegate a text task to a published Agent on a registered peer. The receiving node starts an independent run of it. The agent gets back the remote run ID and the peer's name. | Same-node `delegate_task` behavior, results and errors unchanged | S-02, S-03, S-04 |
| BEH-104 | Contract | SCN-104, SCN-105 | `send_message_to(target_agent_run_id)` reaches runs in the sender's own root (waking a shut-down delegated run) or any active run on the same server. It reaches nothing on another server. | The delegating run and the remote run it started message each other by run ID across the two nodes, in both directions. The wake behavior is the same as for a delegated run in the same root. | Same-node `send_message_to` semantics, results and errors unchanged | S-02 |
| BEH-105 | Contract | SCN-103, SCN-104 | `reference_files` are absolute local paths passed to the receiver unchanged | In slice 1, a cross-node delegation or message that carries `reference_files` (or a saved `task_id`) is refused with a clear reason, and nothing is sent. Attachments come in S2. | Local `reference_files` contract unchanged | S-09 |
| BEH-106 | User | SCN-106 | — (no remote-started runs exist) | The owner of the receiving node sees a remote-started run in that node's run history like any other run. The owner can open, watch, message and stop it. | Existing run views unchanged for local runs | S-05 |
| BEH-107 | User | SCN-103 | The user copies files, starts the agent on node B and instructs it by hand | For text-only work, no manual steps on node B beyond the one-time registration and publishing | — | User report |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| Node owner (one person owns both nodes in slice 1) | Let agents on two nodes work together | Turn the feature on, register peers, publish chosen Agents; see remote work on the receiving node | Trusted private network only; off by default |
| Delegating agent (node A) | Hand off a task and keep talking with the remote run | One `delegate_task` call; follow-ups with the existing `send_message_to` by run ID; clear refusals | Knows it is targeting another node; no attachments in slice 1 |
| Remote run (node B) | Do the work with node B's own setup and reply | Its first message names the delegating run and its node; it replies by run ID | Runs with B's models, tools, credentials and workspace |
| Node servers | Accept cross-node requests only when turned on, only from registered peers, and only for published Agents and the delegation pair | Refuse everything else with a specific reason | No authentication in slice 1; no secret crosses nodes |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-101 | Turn cross-node collaboration on or off for a node; register, rename and remove peer nodes | SCN-101, SCN-107 |
| UC-102 | Publish and unpublish Agent definitions for peers, with their launch settings on this node | SCN-102, SCN-107 |
| UC-103 | An agent delegates a text-only task to a published Agent on a registered peer | SCN-103, SCN-108 |
| UC-104 | The delegating run and the remote run exchange text follow-up messages in both directions, also after idle shutdown or a restart | SCN-104, SCN-105 |
| UC-105 | The receiving node's owner sees and controls the remote-started run like a local run | SCN-106 |

### Out Of Scope

- Attachments of any kind across nodes (`reference_files`, Task context files, delegation by saved `task_id`): S2.
- Lifecycle controls from node A: closing the Task on node A stopping the remote run on node B; stopping, reactivating or changing the model of a remote run from node A. Also showing the remote run in node A's run tree, and an origin badge in node B's run views. All S3.
- Publishing or delegating to Agent Teams across nodes: S4.
- Agents discovering peers' published agents (`list_available_agents` and similar): S5.
- Authentication, pairing secrets, per-peer permissions, and encryption beyond what the private network provides: S6. The desktop's full-backend exposure on shared networks (RSK-001) is its own Task.
- The public internet, NAT traversal, relays.
- Cross-node messages other than between a delegating run and the remote run it started (for example to a peer's standing instances by address, or to arbitrary runs on a peer).
- Queuing for an unreachable peer (store-and-forward), and delivery receipts beyond accepted/refused.
- Teams whose members are spread over nodes; a central broker or shared storage.
- Changing how same-node delegated runs are hosted (the full CM-7 "links instead of hosting" conversion for local runs). See the foundation note in `slice-plan.md`.

### Non-Goals

- Making cross-node delegation transparent: the agent knowingly names another node.
- Watching node B's run from node A's window (open node B's window instead).
- Guaranteed delivery beyond today's at-most-once acceptance.

### Preserved Behavior Boundary

- Same-node `send_message_to`, `delegate_task`, `get_handoff_rules`, `list_available_agents`, `@` mentions and `reference_files`: behavior, results and error codes unchanged (BEH-103/104/105 preserved columns; AC-112).
- Collaboration model rules CM-1 … CM-9 hold for local work unchanged. Slice 1 extends three of them to a remote delegated run: CM-5 (run-ID messaging), CM-6 (Task ownership on the delegating node) and CM-9 (a message is stored on both sides).
- Unchanged: the desktop node registry and node windows, Phone Access pairing and credentials, Memory Sync, run history, Task records and their migrations.
- With the feature off (the default), the node behaves exactly as today. Inbound cross-node requests are refused.

### Prerequisites

None found. The investigation traced delegation, run-ID routing, standalone run roots, the trusted-network route policy and the embedded server listener. None of them blocks slice 1 (INV § Requirement Implications).

| Prerequisite ID | Finding And Evidence | Blocks (REQ / AC IDs) | Sent To (agent) / Task Key | Status |
| --- | --- | --- | --- | --- |
| — | None | — | — | — |

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or follow-up. It is not a required design correction, unless it is a prerequisite (Prerequisites above).
- A downstream reviewer comment does not amend this requirements basis. The Solution Designer must update the canonical requirements and obtain renewed user approval before a scope-changing proposal can govern design or implementation.
- Slice 1 has no authentication by design (direction 2026-10-19; QR-103). Security findings about that belong to S6. The exception is a finding that the slice adds access the trusted-network backend does not already allow (RSK-101).

## Requirements (slice 1)

| Requirement ID | Requirement | Related Behavior IDs | Priority | Rationale | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- |
| REQ-101 | Each node has a cross-node collaboration switch, **off by default**. While it is off, the node sends no cross-node requests and refuses every inbound cross-node request with a "turned off" reason. Turning it on exposes nothing beyond the inbound cross-node requests of this document. | BEH-101 | Must | Off by default, never exposed automatically | Direction 2026-10-19 |
| REQ-102 | A node owner registers a peer node on their node by its URL and a readable name (DEC-101). On registration, the node checks that the URL reaches an AutoByteus node and records that node's stable server identity. Requests to or from a peer whose identity no longer matches are refused with an "identity mismatch" reason. The owner can rename and remove a peer. After removal, new cross-node requests in either direction with that peer are refused. Existing run history stays. | BEH-101 | Must | Explicit consent on each side; a defined place for pairing later | DEC-101 |
| REQ-103 | A node owner publishes and unpublishes individual shared Agent definitions for peers (DEC-102). Each published Agent records the launch settings it runs with on this node: runtime and model (initially the definition's default), workspace, and tool auto-approve (off unless the owner turns it on). Nothing is published by default. Unpublishing refuses new delegations to the Agent; runs already started keep working. | BEH-102 | Must | The owner chooses what peers may start and how it runs | DEC-102, ASM-103 |
| REQ-104 | An agent that has `delegate_task` can delegate a text task to a published Agent on a registered peer, in one `delegate_task` call that names the peer and the Agent. On success, the result confirms the peer and the remote run ID. On refusal, nothing is started on either node and the agent receives a specific reason (REQ-109). | BEH-103, BEH-107 | Must | Core handoff | DEC-104 |
| REQ-105 | The receiving node starts the remote run as an independent run of the published Agent. It uses that Agent's launch settings (REQ-103) and the receiving node's own models, tools, credentials and workspace. Its first message is the work packet: the task text plus the delegating agent's run ID and node name. It has the same form as a local delegation, with the node added. | BEH-103 | Must | A delegated run is a normal run (CM-8) on the node that runs it | ASM-103, collaboration model §4 |
| REQ-106 | The delegating run and the remote run it started can message each other with `send_message_to` by run ID, in both directions, text only. The node routes the run ID through the link (DEC-111). The receiver sees who sent it: the sender's run ID and its node name. No other cross-node message target is accepted (DEC-105). | BEH-104 | Must | Conversation continuity with minimal exposure | DEC-105 |
| REQ-107 | A follow-up wakes its recipient the way a run-ID message inside one root does today. If the remote run was shut down for being idle, or its node restarted, it is restored with its conversation and receives the message. If the delegating run is offline, it is woken the same way on its own node. A follow-up to a run whose history was deleted is refused with "not found". | BEH-104 | Must | Parity with local delegated runs (agent_team_execution.md § Delegated Child Lifecycle) | — |
| REQ-108 | Both nodes keep the link between a delegating run and its remote run, and the link survives a restart of either node. A message between the two runs is recorded in both runs' message logs and in each agent's memory, with one message ID (CM-9). | BEH-104 | Must | Follow-ups must keep working; each run is self-contained | CM-9 |
| REQ-109 | A cross-node refusal returns a specific, distinguishable reason to the calling agent. The reasons include at least: feature turned off (here or on the peer); peer not registered (here or on the peer); peer unreachable; peer identity mismatch; Agent not published or not found on the peer; the published Agent cannot run there (with its reason); attachments or saved Tasks not supported across nodes yet; target run not permitted; target run not found. The delegating node's existing Task refusals (for example a closed Task) also apply. | BEH-103, BEH-104, BEH-105 | Must | Agents and the user must understand failures | — |
| REQ-110 | These are refused before anything is sent (BEH-105): a cross-node `delegate_task` or `send_message_to` that carries `reference_files`, and a cross-node `delegate_task` by saved `task_id`. | BEH-105 | Must | Attachments are S2; nothing is dropped silently | DEC-106 |
| REQ-111 | The remote delegation belongs to a Task on the delegating node, exactly like a local delegation (CM-6): the Project Task, the delegator's own Task, or a new Task with no Project. While that Task is DONE or CANCELLED, the delegating node refuses messages to and from the remote run, as it does for a closed local copy. Stopping the remote run when its Task closes is S3. | BEH-103, BEH-104 | Must | Keep CM-6 whole on the delegating node; keep slice 1 small | DEC-107 |
| REQ-112 | On the receiving node, the remote run appears in the run history like any run. The owner can open it, watch it, message it from the composer and stop it. Its first message shows where it came from. | BEH-106 | Must | Owner control and visibility | — |
| REQ-113 | Cross-node requests carry no credentials or secrets. They carry no provider keys, vault entries, MCP tokens, or mobile or Memory Hub credentials. The only local file paths they carry are those in message text the agent wrote. | BEH-103, BEH-104 | Must | "No credential ever travels between nodes" | Direction 2026-10-19 |
| REQ-114 | Inbound cross-node handling has one entry point per request kind, so peer authentication and permission checks can be added there later without changing what agents see. There is no version check or negotiation between nodes: both nodes run the same release, and keeping them up to date is the user's responsibility (DESIGN.md rule 9; the user, SR-005). | BEH-101 | Must | A place for S6; clean contracts without version branches | Direction 2026-10-19; SR-005 |
| REQ-115 | Node owners configure slice 1 in the node window: the switch (REQ-101), the peers (REQ-102) and the published Agents (REQ-103) (DEC-108). | BEH-101, BEH-102 | Must | The user must be able to set it up on two real nodes | DEC-108 |

## Acceptance Criteria (slice 1)

| AC ID | Related REQ | Related BEH / SCN | Preconditions / Trigger | Observable Expected Outcome | Important Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-101 | REQ-101 | BEH-101 / SCN-101 | Fresh node | The switch is off. An inbound cross-node delegation or message is refused with "turned off". A `delegate_task` naming a peer is refused with "turned off" and nothing is sent. | After turning it on, the same requests are evaluated normally | Server E2E |
| AC-102 | REQ-102 | SCN-101, SCN-107 | Two servers reachable on a private network, switch on | Node A registers node B by URL and name; A lists B with its name and stored identity. B registers A the same way. | A URL that does not reach an AutoByteus node is refused with a reason, and nothing is recorded. After B's identity changes (a different server at the URL), requests are refused with "identity mismatch". After the peer is removed, new requests in either direction are refused with "not registered", and history stays. | Server E2E with two server instances |
| AC-103 | REQ-103 | SCN-102, SCN-107 | Node B with a shared Agent "Publisher" | Before publishing, a delegation to it is refused with "not published". After it is published with launch settings, a delegation starts a run with those settings. | After unpublishing, new delegations are refused with "not published", and a run already started still accepts follow-ups | Server E2E |
| AC-104 | REQ-104, REQ-105 | SCN-103 | A and B registered both ways, switch on at both, Publisher published on B | An agent on A calls `delegate_task` naming B and Publisher, with a description. The result confirms B and gives a remote run ID. On B, a new run of Publisher starts with B's launch settings. Its first message holds the description, the delegator's run ID and node A's name. | Peer unreachable, not registered on B, or turned off on B: specific reason; nothing starts on B; no Task link is left on A | Two-server E2E with a scripted runtime; then the user's check on desktop + Docker |
| AC-105 | REQ-106, REQ-108 | SCN-104 | Remote run from AC-104 | The remote run replies to the delegator's run ID; the delegating agent receives it, naming the sender's run ID and node B. The delegating agent sends a follow-up to the remote run ID; the remote run receives it, naming node A. Each message appears once in both runs' message logs, with one message ID. | — | Two-server E2E |
| AC-106 | REQ-107 | SCN-105 | The remote run was shut down after the idle grace period; then, separately, B restarted; then A restarted | A follow-up from the delegating run restores the remote run with its conversation, and the remote run receives the message. A reply wakes an offline delegating run on A the same way. | History of the remote run deleted on B: "not found" | Two-server E2E |
| AC-107 | REQ-106, REQ-109 | SCN-109 | A run on A that did not start a given run on B; a run on B that was not started from A | Their cross-node messages are refused with "not permitted"; the target receives nothing | — | Server E2E |
| AC-108 | REQ-110 | SCN-108 | A cross-node `delegate_task` or `send_message_to` with `reference_files`; a `delegate_task` to a peer with `task_id` | Refused with the "not supported across nodes yet" reason; nothing sent or started | — | Server E2E |
| AC-109 | REQ-111 | SCN-103, SCN-104 | A remote delegation by an agent working on a Project Task; then that Task is DONE | The remote run is recorded on A as a run of that Task. After DONE, A refuses the delegating run's messages to it and delivers nothing from it, giving the closed-Task reason. | — | Server E2E |
| AC-110 | REQ-112 | SCN-106 | Remote run on B | B's run history lists the run. The owner opens it, sees the conversation including the work packet, sends a composer message and stops it. | — | Browser probe or isolated desktop instance against the receiving node |
| AC-111 | REQ-113, REQ-114 | — | Captured cross-node requests in the E2E | No request carries a credential, token or secret. Every inbound request kind enters through its one gateway entry point, which applies the switch and peer checks. | — | Server E2E with request capture; code review |
| AC-112 | Preserved boundary | BEH-103/104/105 | Existing same-node suites | All same-node messaging, delegation, Task and run-history suites pass unchanged, with the switch off and on | — | Regression suites |
| AC-113 | REQ-115, all | SCN-101 … SCN-106 | The user's desktop node and a Docker node | The user sets up both nodes in the node windows, then runs AC-104 … AC-106 in both directions (desktop → Docker and Docker → desktop) with real runtimes | — | The user's verification across two real nodes |

## Relevant Scenarios And Journeys (slice 1)

| Scenario ID | Kind | Actor / Initiator | Goal / Event | Trigger / Entry | Starting Condition | Steps | Expected Outcome | Alternate / Error | Validity | Evidence / Decision | REQ / AC |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-101 | Operational | Node owner | Connect two nodes | Node window settings | Both nodes reachable on LAN/VPN (desktop ↔ Docker: the Docker node reaches the desktop at `host.docker.internal:<port>`) | Turn the switch on at both; on A, register B by URL and name; on B, register A | Each lists the other | Unreachable URL, or not an AutoByteus node: refused | Supported Normal | Direction 2026-10-19; DEC-101 | REQ-101/102/115; AC-101/102 |
| SCN-102 | Operational | Owner of B | Offer an Agent | Node window settings | Shared Agent "Publisher" on B | Publish it with launch settings | Peers can start it | Unpublishing refuses new starts | Supported Normal | DEC-102 | REQ-103; AC-103 |
| SCN-103 | User / System | Agent on A (prompted by the user) | Hand a text task to B's Publisher | `delegate_task` naming peer B and Publisher | SCN-101 and SCN-102 done | A's agent delegates → B starts Publisher with the work packet → the result gives the remote run ID | Remote work starts without manual steps on B | Failures per REQ-109 | Supported Normal | Original request; the first slice as the PTM proposed it | REQ-104/105/111; AC-104/109 |
| SCN-104 | System | Either run | Continue the conversation | `send_message_to` by the other's run ID | Remote run exists | Message delivered and recorded on both sides | Conversation continues both ways | — | Supported Normal | Parent direction | REQ-106/108; AC-105 |
| SCN-105 | System | Either run | Follow up after idle or restart | `send_message_to` by run ID | Recipient offline (idle shutdown or restart) | Recipient restored, message delivered | Same as a local delegated run | History deleted: not found | Supported Normal | agent_team_execution.md § Delegated Child Lifecycle | REQ-107; AC-106 |
| SCN-106 | User | Owner of B | Oversee remote work | B's run history | Remote run exists | Open, watch, message, stop | Same controls as a local run | — | Supported Normal | — | REQ-112; AC-110 |
| SCN-107 | Operational | Node owner | Withdraw | Node window settings | Peer registered, Agent published | Remove the peer, unpublish, or turn the switch off | New requests refused; history stays | — | Supported Normal | — | REQ-101/102/103; AC-101/102/103 |
| SCN-108 | System | Agent on A | Send files or a saved Task across nodes | `delegate_task`/`send_message_to` with `reference_files`, or with `task_id` | — | Refused | Clear "not yet supported" reason | — | Supported Explicit Edge (slice boundary) | DEC-106 | REQ-110; AC-108 |
| SCN-109 | System | Any run | Message an unrelated run on a peer | `send_message_to` with the run ID of a peer run it is not linked with | — | Refused | "not permitted" | — | Technically Possible but Unsupported (refusal path) | DEC-105 | REQ-106; AC-107 |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes` (behavior level only)
- Linked UI/UX or interaction supplement: N/A — no Product Design in this round (DEC-103 asks whether the user still wants it)
- Linked runnable UI reference, separate design repository/root, UI/UX specification, and applicable support artifacts: N/A — not applicable
- Product ticket record and folder (externally owned): N/A — the 2026-10-01 request to the Product Prototyper returned no result (INV S-12)
- Design repository revision or commit: N/A — not applicable
- UI/UX user-confirmation reference: N/A — not applicable
- Approved visual-reference baseline: N/A — not applicable
- Normative visual and interaction details: none. Slice 1 follows the existing node-window settings patterns (DEC-108).
- Explicitly illustrative fixture content or permitted implementation variation: placement and look within the existing patterns are the designer's choice.
- Required screens, states, transitions, feedback:
  - the switch, with its state;
  - the peer list, with add (URL and name), rename and remove, and a visible error when a URL fails the check;
  - the published-Agent list, with publish/unpublish and the launch settings (runtime, model, workspace, auto-approve).
  - The remote run in B's run history (REQ-112) uses the existing run views.
- Product decisions that need the user: DEC-103.

## Quality And Non-Functional Requirements

| Quality ID | Related REQ / AC | Area | Measurable Requirement Or Constraint | Conditions / Scope | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| QR-101 | REQ-104, REQ-106; AC-104/105 | Reliability | A retried cross-node request never starts a second remote run or delivers a message twice | Network retries, timeouts | Idempotency test in server E2E |
| QR-102 | REQ-104, REQ-106 | Reliability | A `delegate_task` or `send_message_to` to an unreachable peer returns a refusal within a bounded time (proposed ≤ 30 s) and never hangs the agent's tool call | Peer down or network partition | Server E2E with a stopped peer |
| QR-103 | REQ-101, REQ-102, REQ-113, REQ-114 | Security | Slice 1 has no authentication by design. Inbound requests are accepted only when the switch is on, from a registered peer identity, and for a published Agent or a linked run. The slice must not add access beyond what the trusted-network backend already allows (RSK-101). | Trusted private network only | Design review; negative server E2E |
| QR-105 | AC-112 | Compatibility | No change to same-node results, timings or persisted shapes when the switch is off | All nodes | Regression suites |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `Yes` (new data only)
- Data or state that must be preserved: all existing run, Team, Org, Task, message-log, node-registry, Phone Access and Memory Sync data, unchanged.
- New data: the switch, peer records (name, URL, identity), published-Agent records with launch settings, and the link records of remote delegated runs on both nodes.
- Loss, reset, rebuild, or regeneration that is acceptable: none for existing data. For the new data, removing a peer keeps run history.
- Retention, privacy, compliance, volume, downtime, or operational constraints: no secrets are stored for peers in slice 1 (none exist).
- Unknowns requiring downstream investigation: storage places and record shapes (slice 1 architecture).

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| User-operated private network (LAN, company network, Tailscale, WireGuard, NetBird) | Reachability between the nodes in both directions | `autobyteus-web/docs/remote_access.md` | ASM-102 |
| Docker networking for the first two nodes | The desktop's embedded server listens on all interfaces, port 29695; the Docker node reaches it via `host.docker.internal`. The desktop reaches the Docker node at its published Backend URL. | INV S-07, `docs/features/memory_sync.md` § URL Model | Linux Docker may need `--add-host host.docker.internal:host-gateway` (to verify in the slice) |
| Runtime tool surfaces (AutoByteus local tool, Codex/Claude via the Agent Tools MCP server) | Cross-node delegation and follow-ups behave the same on every runtime, through the shared tool contracts | `agent_communication.md` § Runtime Projection | — |

## Supplemental Artifacts

| Artifact Path | Purpose | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- |
| `slice-plan.md` | The ordered plan of slices; the foundations slice 1 needs and what can wait; slice 1's proposed Task text | All | Ready for Approval (SR-003) | The user approves it together with this document |
| `history-sr-002/` | The earlier draft (SR-001/SR-002), unchanged, as history | — | Superseded | None |

## Assumptions

| Assumption ID | Assumption | Why It Is Necessary | Validation Plan / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-101 | Both nodes run the same release, which contains slice 1 | Contract availability | The user keeps nodes up to date (DESIGN.md rule 9); no version check (SR-005) | Settled by the user, SR-005 |
| ASM-102 | The two nodes reach each other in both directions (was ASM-002) | Replies and follow-ups from B to A | Desktop + Docker on one machine: yes (INV S-07). Other networks: the user. With one-way reach, the reverse direction fails with "peer unreachable". | Holds for the slice-1 setup |
| ASM-103 | A published Agent runs with its own node's setup: models, tools, credentials, workspace (was ASM-003) | No credential crosses nodes | Follows from the direction "no credential ever travels between nodes"; REQ-103/105/113 make it concrete | Treated as settled by the direction |
| ASM-104 | A remote run on B may use the collaboration tools any run on B has (for example delegate further on B, or across nodes if B is set up for it). Whatever it delegates is coordinated on B. | Keeps "a delegated run is a normal run" | Slice 1 architecture verifies | Open |

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-101 | How do two nodes "pair" in the simple trusted case? (was DEC-001) | Decides who agrees to cross-node traffic and where replies go | (a) **Mutual registration**: each owner adds the other node by URL and name; the identity (`serverInstanceId`) is checked and pinned; no secret. (b) One-sided: A adds B; while on, B accepts any caller and replies to a URL the caller supplies. (c) A pairing code with a credential (like Phone Access). | With (a), both owners agree explicitly, and replies go to a URL the receiving owner entered, not one a caller claims. The peer record is also where S6 adds a secret, so (c) can later extend (a) without changing what agents see. (b) is one step shorter, but it lets any device on the network make B call arbitrary URLs. (c) is security work, which the direction places after the main function. **Recommend (a).** | User | Decided (a): the user approved the plan as recommended, 2026-10-19 (SR-004) |
| DEC-102 | Which agents may be published, and how do they run on the receiving node? (was DEC-006, receiving side) | Decides what a peer can start and with what power | (a) **The owner publishes individual shared Agents**; nothing by default. Each has launch settings: runtime/model from its default, workspace, and auto-approve off unless turned on. (b) Once the switch is on, every shared Agent is published, using its default launch config and a node default workspace. | (a) gives explicit consent per agent. A definition's default has no workspace or auto-approve, so the owner must choose them anyway. With auto-approve off by default, tool approvals wait in B's run view until the owner turns auto-approve on for that agent; this matters for agents with computer use. Agent Teams come in S4. **Recommend (a).** | User | Decided (a): the user approved the plan as recommended, 2026-10-19 (SR-004) |
| DEC-103 | Is the Product brainstorming of 2026-10-01 (Addendum 1 to the Product Prototyper) still wanted? | Its result never reached the Solution Designer | (a) Not now: slice 1 uses the existing settings patterns; revisit for S3/S5, where the experience is larger. (b) Resend an updated request for the overall cross-node experience before slice 1 starts. | Slice 1's UI is small and follows existing patterns (Memory Sync, feature toggles). Brainstorming pays off when the visible experience grows (remote runs on both nodes, discovery). **Recommend (a).** | User | Decided (a): the user approved the plan as recommended, 2026-10-19 (SR-004) |
| DEC-104 | Who may delegate across nodes? (was DEC-006, sending side) | Exposure on the sending node | (a) Any agent that has `delegate_task`, once the switch is on and the peer is registered. (b) Only agents enabled per definition. | Every collaborating agent already has `delegate_task`. The sending owner consents with the switch and the registration; the receiving owner consents by publishing. On a trusted network, a per-agent gate adds settings without protecting anything. **Decided (a).** How the agent names the peer and the Agent in the tool is left to architecture, with one constraint: one `delegate_task` call, and follow-ups through the existing `send_message_to` by run ID (DEC-111). | Solution Designer | Decided |
| DEC-105 | Which cross-node message targets are allowed? (was DEC-005) | Exposure | (a) Only between a delegating run and the remote run it started, both ways. (b) Also a peer's standing instances by address. | (a) is exactly what the slice needs, and it mirrors CM-5 (a delegated run is reached by its run ID). **Decided (a).** | Solution Designer | Decided |
| DEC-106 | What happens to attachments in slice 1? | Agents may pass `reference_files` | (a) Refuse with a clear reason; send nothing. (b) Send the text and drop the files. | Dropping files silently breaks the agent's picture of what it sent (the user's principle from 2026-09-30). **Decided (a).** The same goes for delegation by saved `task_id`, because a Task's context files are attachments. | Solution Designer | Decided |
| DEC-107 | Does closing the Task on A stop the remote run in slice 1? | CM-6 completeness vs. slice size | (a) In S1, A only fences the run: it refuses messages to and from the closed run. Stopping it on B comes in S3 with the other lifecycle controls. (b) S1 also stops the run on B. | The remote run shuts down on B after the idle grace period anyway. Stopping it from A belongs with user stop and reactivation, which share one mechanism. **Decided (a).** | Solution Designer | Decided |
| DEC-108 | Where does the owner configure slice 1? | The user must set up two real nodes | (a) A new tab in the node window's Nodes screen (beside Memory Sync and Phone Setup), plus the switch as a feature capability like Applications. (b) Raw server settings only. | (a) follows the existing node-bound settings patterns, and the setting is per node. (b) is unusable for the peer and publish lists. **Decided (a)**; details to architecture. | Solution Designer | Decided |
| DEC-109 | Do Agent Teams belong in slice 1? | Slice size | (a) Agents only; Teams in S4. (b) Both. | A Team target adds the coordinator ingress, the team-run ID result and team-member addressing across the link. The first use case needs one agent. **Decided (a).** | Solution Designer | Decided |
| DEC-110 | Does slice 1 need the full CM-7 "links instead of hosting" conversion for local delegated runs? | Foundation size | (a) No: only a remote delegated run is linked (recorded on A, hosted by B as an independent run). Local runs stay hosted as today. (b) Convert all delegated runs first. | The receiving node already has a run kind that fits: a standalone run root restores its host on the next message. Converting local hosting is a large refactor that slice 1 does not need. **Decided (a)**, recorded as an input to architecture; see `slice-plan.md` § Foundations. | Solution Designer | Decided |
| DEC-111 | How does an agent name a target on another node? | Agent-facing contract; must not block later cross-node features | (a) An optional `node` parameter (the peer's name on this node) on **both** `delegate_task` and `send_message_to`. (b) `node` on `delegate_task` only, where the agent chooses a new place; follow-ups by run ID alone, routed by the link. (c) Node inside the identity string (`docker/agent_…`, or a qualified display ID). | (c) is wrong from the other node's view (labels are per node), changes the run-ID format and makes parsing a guess. (a) makes the agent carry a node label next to every run ID; after a long conversation or memory compaction the pairing is easily lost, which causes refusals without preventing any real error. (b) asks for `node` only where it is information (an address means something only on a given node); a run ID is already unique, the delegation result and every header name the node, so the agent stays aware the run is remote while a follow-up is a plain copy of the returned ID. Later, `send_message_to` gets `node` only for targets that are not linked (for example a peer's standing agent by address). **Decided (b)** with the user, 2026-10-19 (SR-007: "I agree with you"), after (a) was briefly chosen in SR-006. | User | Decided (SR-007) |

### Old Draft Decisions (SR-002) — disposition

| Old ID | Disposition |
| --- | --- |
| DEC-001 pairing | Replaced by DEC-101 (simple trusted case); the pairing secret moves to S6 |
| DEC-002 blocking on large transfers | Deferred to S2 (attachments) |
| DEC-003 standalone file-send tool | Deferred; listed as a later candidate in `slice-plan.md` |
| DEC-004 discovery | Deferred to S5 |
| DEC-005 allowed message targets | Replaced by DEC-105 (decided) |
| DEC-006 which agents get the feature | Split: receiving side DEC-102 (user), sending side DEC-104 (decided) |
| DEC-007 `@` collaborator vs delegation | **Obsolete**: collaborators were removed (collaboration model, `collaboration-model-contract`); `@` now only steers the agent to `delegate_task` |
| ASM-002, ASM-003 | Carried as ASM-102, ASM-103 |
| RSK-001 | Kept as RSK-001: its own Task, not part of slice 1 |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | Acceptance-Criteria IDs | Scenario IDs | Supplemental Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-101 | UC-101 | BEH-101 | AC-101, AC-113 | SCN-101, SCN-107 | — |
| REQ-102 | UC-101 | BEH-101 | AC-102, AC-113 | SCN-101, SCN-107 | DEC-101 |
| REQ-103 | UC-102 | BEH-102 | AC-103, AC-113 | SCN-102, SCN-107 | DEC-102 |
| REQ-104 | UC-103 | BEH-103, BEH-107 | AC-104, AC-113 | SCN-103 | DEC-104 |
| REQ-105 | UC-103 | BEH-103 | AC-104 | SCN-103 | ASM-103 |
| REQ-106 | UC-104 | BEH-104 | AC-105, AC-107 | SCN-104, SCN-109 | DEC-105 |
| REQ-107 | UC-104 | BEH-104 | AC-106 | SCN-105 | — |
| REQ-108 | UC-104 | BEH-104 | AC-105, AC-106 | SCN-104, SCN-105 | — |
| REQ-109 | UC-103, UC-104 | BEH-103, BEH-104, BEH-105 | AC-102, AC-103, AC-104, AC-107, AC-108 | SCN-103, SCN-108, SCN-109 | — |
| REQ-110 | UC-103, UC-104 | BEH-105 | AC-108 | SCN-108 | DEC-106 |
| REQ-111 | UC-103, UC-104 | BEH-103, BEH-104 | AC-109 | SCN-103, SCN-104 | DEC-107 |
| REQ-112 | UC-105 | BEH-106 | AC-110 | SCN-106 | — |
| REQ-113 | UC-103, UC-104 | BEH-103, BEH-104 | AC-111 | SCN-103, SCN-104 | — |
| REQ-114 | UC-101 | BEH-101 | AC-111 | SCN-101 | — |
| REQ-115 | UC-101, UC-102 | BEH-101, BEH-102 | AC-113 | SCN-101, SCN-102 | DEC-108 |

## Architecture Phase Input (for slice 1's Task)

- Approved scenario IDs and product-level behavior paths architecture must map: SCN-101 … SCN-107; SCN-108 and SCN-109 as refusal paths.
- Product and system constraints architecture must preserve:
  - same-node semantics (AC-112);
  - one admission owner per run (`AgentRun.postUserMessage`);
  - the shared tool contracts for every runtime;
  - at-most-once acceptance;
  - CM-1 … CM-9;
  - the trusted-network route policy (no new access beyond it, RSK-101);
  - REQ-113 (no secrets).
- Decisions intentionally deferred to architecture design:
  - the agent-facing tool shape for naming a peer and an Agent (settled with the user: DEC-111);
  - the inter-node endpoints and idempotency keys (no version negotiation, SR-005);
  - how node A records the remote link (in the root tree and in the Task's run resources), and how it keeps the link out of A's run tree UI;
  - how node B hosts the remote run (expected: a standalone run root with a link back to the remote coordinator), and its idle shutdown;
  - where the peer and publish records live;
  - how the switch is exposed (feature capability).
- Technical facts architecture should verify:
  - the restore path of a remote-started standalone run on inbound messages;
  - the wake path for a delegating run inside a Team or Org root on inbound replies;
  - `host.docker.internal` on Linux Docker;
  - tool-call timeouts against QR-102.
- Known feasibility or integration risks: RSK-101 (a new inbound surface on the trusted network), RSK-102 (prompt injection from a peer), RSK-103 (until S6, identity is checked, not proven).

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

- Approval recorded: `Yes` (User, 2026-10-19; SR-004)
- Exact requirements and supplement approval basis recorded: `Yes`
- Approved requirements package ready for architecture design: `Yes`. Architecture runs in slice 1's own Task, starting with a discussion with the user.
- Remaining blocker: None. Slice 1 waits for the Project Task Manager to create it and dispatch it with the user's approval.
