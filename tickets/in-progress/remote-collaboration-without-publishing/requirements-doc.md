# Requirements Document — Remote Collaboration Without Publishing (autobyteus-245)

## Document Status

- Status: `Approved` (2026-10-21, SR-002)
- Current solution revision ID: `SR-002`
- Package identifier: `remote-collaboration-without-publishing`
- Request / ticket: Project Task **autobyteus-245** "Remote collaboration without publishing", a part of **autobyteus-25** (cross-node parent). From FU-007 of autobyteus-191.
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), on the user's direction of 2026-10-21
- Requirements owner: Solution Designer
- Date: 2026-10-21
- Approved by and reference: `User`, in the Solution Designer conversation, 2026-10-21:
  - "yesss. i think they are by default available … I would just want to be able to delegate to any agent on the other nodes. I don't want to just every time do configuration";
  - on the workspace: "if you didn't set the default workspace, then it's temporal space, yes … we use the temporal space" (and the default-workspace follow-up FU-001);
  - on auto-approve: "Yeah, of course like auto approve … we always used Auto approve";
  - on the refusal: "if the target node … doesn't have … default runtime setting … just report error and this error is sent to the client".
- Exact approved requirements baseline / solution revision: this document at SR-002
- Behavior-defining supplements: None

## Problem And Desired Outcome

- Problem: slice 1 (autobyteus-191, merged `d51ef843f6`, not released) makes a node's owner publish each Agent, with its runtime, model, workspace and auto-approve, before peers can start it. The user finds this step unfriendly.
- The user's direction, 2026-10-21: "all the agents and agent teams are automatically available, because this publishing phase is really user unfriendly. The remote node might not have the runtime and model set up right. … if there is no default configuration, just send the error back, like 'there is no default runtime configured for the target agent or agent team'."
- Desired outcome:
  - With remote collaboration switched on, every shared Agent of the node is available to its registered peers, at its normal catalog address, with no publish step.
  - A remote run starts with the Agent's own default runtime and model. When there is none, or it can't run on that node, the delegating agent gets a clear refusal naming the Agent and the node.
  - Agent Teams become available the same way through autobyteus-247 (DEC-205).
- Observable definition of success: on two registered nodes with the switch on and nothing published, an agent on A delegates to any shared Agent of B by its catalog address. The run starts on B with that Agent's default runtime and model. Delegating to an Agent without a usable default returns the refusal, and nothing starts on B.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-201 | Operational | SCN-201 | The owner publishes individual shared Agents with launch settings; nothing is published by default (`PublishedAgentService`, `published-agents.json`, the publish list in Nodes → Remote Collaboration) | No publish step. With the switch on, every shared Agent is available to registered peers | The switch (off by default), peer registration, identity pinning | INV S-01, S-02 |
| BEH-202 | Contract | SCN-202 | B resolves the target by its address among *published* Agents and refuses `AGENT_NOT_PUBLISHED` otherwise | B resolves the target by its **catalog address** among all eligible Agents (the same eligibility and addresses as local `delegate_task`), and refuses "not found" otherwise | Built-ins, Agent Orgs, team-local and application-owned definitions are never targets | S-03 |
| BEH-203 | Contract | SCN-202, SCN-203 | The remote run starts with the published entry's runtime, model, model settings, workspace and auto-approve | Runtime, model and model settings come from the Agent's **default launch configuration**. Workspace and auto-approve come from node-level rules (DEC-202, DEC-203) | The prepared-run path, `delegatedFrom`, the activation order, every message flow | S-04, S-05 |
| BEH-204 | Contract | SCN-203 | `AGENT_CANNOT_RUN` when a published entry's settings fail the runtime/model check | Refused before anything starts on B: (a) no default runtime and model configured: "There is no default runtime configured for the target agent <name> on node <node>."; (b) a default that can't run there: the specific reason (runtime unavailable, model unavailable, settings invalid) | Refusals leave nothing on either node (AC-104 of slice 1) | S-04, S-05 |

## Stakeholders, Actors, And Outcomes

| Actor | Goal | Required Outcome | Constraint |
| --- | --- | --- | --- |
| Node owner | Let peers use this node's agents without per-agent setup | Switch on, register peers; agents' defaults decide how they run | Trusted private network; switch off by default |
| Delegating agent | Start a peer's agent by its address | Same call as today (`delegate_task` with `node`); a clear reason when the target can't run | — |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-201 | A registered peer starts any shared Agent of this node by its catalog address, with no publish step | SCN-201, SCN-202 |
| UC-202 | A remote run starts with the Agent's default runtime and model, and with the node's workspace and auto-approve rules | SCN-202 |
| UC-203 | Delegating to an Agent with no usable default is refused with a clear reason | SCN-203 |
| UC-204 | The owner configures the node-level rules for remote runs (DEC-202, DEC-203) in Nodes → Remote Collaboration; the publish list is gone | SCN-201 |

### Out Of Scope

- Agent Teams across nodes: autobyteus-247 (DEC-205). Until it lands, the catalog address of a shared Agent Team on B is refused with "Agent Teams on another node are not supported yet", rather than "not found".
- A per-peer or per-agent allow list: a permission rule belongs to S6 (security).
- Attachments (S2), lifecycle control across nodes (S3), discovery (S5).
- Changing how local delegation picks launch settings.

### Non-Goals

- Choosing a runtime or model on B's behalf when the Agent has no default (the user: send the error back).

### Preserved Behavior Boundary

- All slice 1 behavior except publishing: the switch, peers, identity pinning, the contract between nodes (except the target field's name, DEC-206), remote links and `delegatedFrom`, message flows, refusals, Task closure fence, every slice 1 AC other than AC-103.
- Same-node delegation and messaging unchanged.

### Prerequisites

None.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or follow-up. It is not a required design correction, unless it is a prerequisite (Prerequisites above).
- A downstream reviewer comment does not amend this requirements basis.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority | Rationale | Source / Decision |
| --- | --- | --- | --- | --- | --- |
| REQ-201 | With the switch on, every Agent definition that local `delegate_task` may target as a catalog copy is available to registered peers, at the same catalog address. Excluded: built-ins, Agent Orgs, team-local and application-owned definitions. There is no publish step and no published list | BEH-201, BEH-202 | Must | The user's direction | User 2026-10-21 |
| REQ-202 | A remote run of an Agent starts with the Agent's default launch configuration on B: runtime, model, model settings | BEH-203 | Must | "the remote node might not have the runtime and model set up right" — use what is configured, or refuse | User 2026-10-21; DEC-201 |
| REQ-203 | When the Agent has no default runtime and model on B, the delegation is refused before anything starts on B, with: "There is no default runtime configured for the target agent <name> on node <node>." | BEH-204 | Must | The user's wording | User 2026-10-21; DEC-201 |
| REQ-204 | When the default exists but can't run on B (runtime not available, model not available, model settings invalid), the delegation is refused before anything starts on B, with the specific reason, naming the Agent and the node | BEH-204 | Must | Truthful reasons (slice 1 REQ-109) | DEC-201 |
| REQ-205 | The remote run's workspace is the receiving node's temp workspace (`AUTOBYTEUS_TEMP_WORKSPACE_DIR`, default `<data>/temp_workspace`). No setting. A definition default workspace is FU-001 | BEH-203 | Must | Zero configuration | DEC-202 |
| REQ-206 | The remote run's tool auto-approve is that of the delegating run on the delegating node, as for a local delegated copy (which takes the run root's). No setting | BEH-203 | Must | Zero configuration; the user always uses auto-approve | DEC-203 | Tool auto-approve for remote runs | With it off, a remote run's tool calls wait for approval in B's window; with it on, a peer's tasks run tools without asking | (a) Always off. (b) A node-level setting, default off. (c) Always on. (d) **Inherited from the delegating run**, as a local delegated copy inherits the run root's auto-approve | (d) needs no setting, matches local delegation exactly, and leaves the decision with the person who started the delegating run. The user always runs with auto-approve, so remote runs auto-approve too. Antigravity still forces auto-approve, as locally | User | Decided (d), 2026-10-21 ("Yeah, of course like auto approve … we always used Auto approve") |
| REQ-207 | Nodes → Remote Collaboration no longer shows a publish list. It shows that all shared Agents are available to registered peers, and that remote runs use each agent's default runtime and model. It has no new setting | BEH-201 | Must | — | — |
| REQ-208 | The publishing code, its stored file handling, its GraphQL API and its refusal are removed (no dead code). A leftover `published-agents.json` on a development or test machine is neither read nor written (DEC-204) | BEH-201 | Must | Clean-cut removal | DEC-204 |
| REQ-209 | The collaboration model (CM-12) and the module docs say that a node offers all its shared Agents to registered peers while the switch is on | BEH-201 | Must | The contract stays true | — |

## Acceptance Criteria

| AC ID | Related REQ | Scenario | Precondition / Trigger | Expected Outcome | Alternate / Failure | Verification |
| --- | --- | --- | --- | --- | --- | --- |
| AC-201 | REQ-201, REQ-202 | SCN-202 | A and B registered, switch on at both, nothing published; B has a shared Agent "Publisher" with a default runtime and model | An agent on A delegates to `/publisher` on B; a run of Publisher starts on B with that runtime, model and settings; follow-ups work as in slice 1 | — | Two-server E2E |
| AC-202 | REQ-203 | SCN-203 | B's shared Agent has no default launch configuration | The delegation returns "There is no default runtime configured for the target agent <name> on node <node>."; nothing starts on B and nothing is left on A | — | Two-server E2E |
| AC-203 | REQ-204 | SCN-203 | The default names a runtime that is not available on B, or a model it doesn't offer | Refused with the specific reason; nothing starts | — | Server E2E / unit |
| AC-204 | REQ-201 | SCN-202 | Targets: a built-in, an Agent Org, a team-local agent, an unknown address | Each refused as not found on B; nothing starts | — | Server E2E |
| AC-205 | REQ-205, REQ-206 | SCN-202 | A started remote run | Its `run_metadata.json` shows the workspace and auto-approve of DEC-202/DEC-203 | — | Server E2E |
| AC-206 | REQ-207 | SCN-201 | The node window | No publish list; the availability note and the node setting(s) | — | Web unit + browser probe |
| AC-207 | REQ-208 | — | A node with a leftover `published-agents.json` | Startup and delegation ignore it; no code reads or writes it | — | Unit; code search |
| AC-208 | Preserved | — | Slice 1 two-server suite (minus publishing cases) and same-node suites | Pass unchanged | — | Regression |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor | Goal | Trigger | Starting Condition | Steps | Expected Outcome | Alternate / Error | Validity | Evidence | REQ / AC |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-201 | Operational | Node owner | Offer the node's agents to peers | Nodes → Remote Collaboration | Peers registered | Turn the switch on; optionally set the node rule(s) | All shared Agents available | — | Supported Normal | User 2026-10-21 | REQ-201, 207; AC-206 |
| SCN-202 | User / System | Agent on A | Start a peer's agent | `delegate_task({node, recipient_address: "/publisher", description})` | SCN-201 done | As slice 1 DS-001, with B resolving the catalog address and the Agent's default | The run starts with the default | — | Supported Normal | Slice 1 | REQ-201, 202, 205, 206; AC-201, 204, 205 |
| SCN-203 | System | Agent on A | Start an agent that can't run on B | Same call | The Agent has no usable default on B | B refuses before preparing a run | A clear reason; nothing started | — | Supported Normal | User 2026-10-21 | REQ-203, 204; AC-202, 203 |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes` (behavior level only): REQ-207. Product Design: N/A — not requested.

## Quality And Non-Functional Requirements

| Quality ID | Related | Area | Requirement | Verification |
| --- | --- | --- | --- | --- |
| QR-201 | REQ-201 | Security | Availability widens only what peers can start on a node whose owner switched remote collaboration on; no new route or credential. Consistent with the trusted-network model (slice 1 QR-103) | Design review |

## Data Continuity And Acceptable Loss

- Persisted data affected: `published-agents.json` stops being used. It has never shipped in a release (no tag contains `d51ef843f6`; INV S-06). It exists only on development and test machines.
- Acceptable loss: its launch settings (they existed only for publishing). DEC-204.
- Everything else unchanged.

## Assumptions

| ID | Assumption | Status |
| --- | --- | --- |
| ASM-201 | Agents meant for remote use have a default launch configuration on their node (the owner sets it in the agent's settings) | The user's direction |

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-201 | Where do runtime and model come from? | Publishing chose them | (a) The Agent's default launch configuration; refuse when missing or unusable. (b) Fall back to some node default model | The user said: if there's no default, send the error back. Local catalog copies already take the agent default first (`CollaboratorLaunchResolver`); a remote run has no delegating run on B to inherit from, so the agent default is the only layer. **(a)**, with the user's wording for "missing" and the existing specific reasons for "unusable" | User (direction) | Decided by the user's direction |
| DEC-202 | Which workspace does a remote run use? | Every run needs one; publishing chose it | (a) The node's temp workspace (`AUTOBYTEUS_TEMP_WORKSPACE_DIR`, default `<data>/temp_workspace`; it exists on every node, Docker included). (b) A node-level "workspace for remote runs" setting in Nodes → Remote Collaboration, defaulting to the temp workspace | (a) needs no setup and fits "automatically available". (b) adds one optional setting, useful when remote agents should work in a known folder. I recommend **(a) now**; add (b) only if you want remote runs to land in a specific folder | User | Decided (a), the temp workspace; a definition default workspace is FU-001 (2026-10-21) |
| DEC-203 | Tool auto-approve for remote runs | With it off, a remote run's tool calls wait for approval in B's window, possibly unattended; with it on, peers' tasks run tools (including computer use) without asking | (a) Always off. (b) One node-level setting "Auto-approve tools in remote runs" in Nodes → Remote Collaboration, **default off**. (c) Always on | (b): the owner decides once per node. Off by default keeps the safe default; on fits a dedicated worker node such as your Docker node. Recommend **(b), default off** | User | Needs user |
| DEC-204 | Existing `published-agents.json` files | The user asked to decide its handling | Publishing never shipped in a release (S-06), so no released user data exists. (a) Stop reading it; no migration; delete leftover files by hand on test machines. (b) A registered migration that deletes it | DESIGN.md and the migration guideline protect released data; unreleased development data needs no migration machinery. Recommend **(a)** | User | Decided (a), 2026-10-21 ("yesss") |
| DEC-205 | Agent Teams (autobyteus-247): one design and delivery with 245, or in sequence? | The user wants both available | (a) In sequence: 245 (no publishing, Agents) delivered first; 247 (Teams) right after, reusing 245's rules (catalog address, default-config refusal "…target agent team…"). (b) Merged: one design, one review and one delivery | 245 is a small, mostly-removal change that can reach you within days. Teams across nodes is real new mechanics: a Team run on B with a coordinator, the result's team run ID and coordinator run ID, follow-ups to the coordinator, Team links. Slice 1 needed seven review rounds; keeping reviews small keeps them fast. The default-config rule is designed in 245 for both kinds, so 247 adds only the Team mechanics. Recommend **(a)** | User | Decided (a), in sequence (2026-10-21, "yesss") |
| DEC-206 | The contract's `publishedAddress` field | The name would be wrong | Rename it to `address` (the catalog address) in a clean cut (DESIGN.md rule 9: both nodes run the same release) | **Decided**: rename | Solution Designer | Decided |

## Traceability

| REQ | UC | BEH | AC | SCN |
| --- | --- | --- | --- | --- |
| REQ-201 | UC-201 | BEH-201/202 | AC-201, AC-204 | SCN-201/202 |
| REQ-202 | UC-202 | BEH-203 | AC-201 | SCN-202 |
| REQ-203 | UC-203 | BEH-204 | AC-202 | SCN-203 |
| REQ-204 | UC-203 | BEH-204 | AC-203 | SCN-203 |
| REQ-205 | UC-202 | BEH-203 | AC-205 | SCN-202 |
| REQ-206 | UC-202 | BEH-203 | AC-205 | SCN-202 |
| REQ-207 | UC-204 | BEH-201 | AC-206 | SCN-201 |
| REQ-208 | UC-204 | BEH-201 | AC-207 | — |
| REQ-209 | UC-201 | BEH-201 | AC-208 | — |

## Architecture Phase Input

- Scenarios to map: SCN-201 … SCN-203.
- Constraints: the slice 1 contract and data model (except DEC-206); one eligibility owner (`CollaboratorCandidatePolicy`) and one address allocator (`CatalogAddressMap`) for local and remote targets; one launch-resolution owner (`CollaboratorLaunchResolver`, agent-default layer only for remote runs).
- To verify: how `CollaboratorLaunchResolver` can be used without the inherited layer; the default-config checks for an Agent Team member set (for 247); the web tab's removal surface.

## Readiness Check

- Content ready for approval: `Yes`.
- Approved basis ready for design: `Yes` (User, 2026-10-21, SR-002).
