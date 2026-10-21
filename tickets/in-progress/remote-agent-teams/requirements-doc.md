# Requirements Document — Remote Agent Teams (autobyteus-247)

## Document Status

- Status: `Ready for Approval`. `Needs user`: DEC-301 (who on B talks to A), DEC-302 (S3 before Teams?).
- Current solution revision ID: `SR-001`
- Package identifier: `remote-agent-teams`
- Request / ticket: Project Task **autobyteus-247** "Remote Agent Teams", part of **autobyteus-25**; depends on autobyteus-245 (done)
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), on the user's approval of 2026-10-21: "lets dispatch the work for agent teams, because with just the agent, it's very limited."
- Requirements owner: Solution Designer
- Date: 2026-10-21
- Approved by and reference: Not approved yet
- Exact approved requirements baseline: N/A
- Behavior-defining supplements: None

## Problem And Desired Outcome

- Problem: since autobyteus-245, an agent can delegate to any shared Agent on a peer node. A shared Agent Team is refused ("Agent Teams on another node are not supported yet"), and a single agent is limiting.
- Desired outcome: `delegate_task({node, recipient_address: "/<team>", description})` starts a Team run of a shared Agent Team on the peer, exactly as a local Team copy is started.
  - The result names the node, the team run ID and the coordinator's run ID.
  - Follow-ups go to the coordinator by run ID, both ways, also after idle shutdown and restarts.
  - The same rules as for Agents apply: catalog address, each agent's own defaults (the Team default for members without their own), the temp workspace, auto-approve on.
- Observable definition of success: from the desktop node, an agent delegates to a shared Agent Team on the Docker node. The Team run starts on Docker, its coordinator works and replies to the delegator, the delegator follows up with the coordinator, and this still works after the Team went idle and after either node restarted.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Scenario IDs | Current | Desired | Preserved | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-301 | Contract | SCN-301 | B refuses a Team address with `REMOTE_TEAMS_NOT_SUPPORTED` | B starts a Team run of it, with each agent's own default, else the Team default; the temp workspace; auto-approve on. The result gives `target_team_run_id`, `target_team_coordinator_agent_run_id` and `node` | The Agent path of 245; local Team copies | INV S-01, S-04 |
| BEH-302 | Contract | SCN-302 | — | Without a usable default for an agent of the Team: refused before anything starts, with "There is no default runtime configured for the target agent team <name> on node <node>." (or the specific reason) | 245's refusals | S-03 |
| BEH-303 | Contract | SCN-303 | — | The delegator and the Team's coordinator message each other by run ID, both ways. A message to the team run ID gets the existing guidance to use the coordinator's run ID | Slice 1's delegator ↔ remote run rules | S-05 |
| BEH-304 | System | SCN-304 | Top-level Team runs don't shut down when idle | A Team run started by a peer shuts down after the idle grace period once every member is quiet; the next message restores it and wakes the coordinator with its conversation; links survive restarts of either node | Local Team runs unchanged | S-02 |
| BEH-305 | User | SCN-305 | — | On B, the Team run appears in run history like any Team run; the owner can open, watch and stop it | — | — |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Scenarios |
| --- | --- | --- |
| UC-301 | Delegate a text task to a shared Agent Team on a peer | SCN-301, SCN-302 |
| UC-302 | Delegator ↔ remote coordinator follow-ups, both ways, also after idle shutdown and restarts | SCN-303, SCN-304 |
| UC-303 | B's owner sees and controls the remote-started Team run | SCN-305 |

### Out Of Scope

- Attachments (S2); a saved Task to a remote Team (existing-copy form): still refused.
- Lifecycle control from A (Task closure stopping the remote Team, user stop or reactivation from A, showing it in A's run tree): S3. Task closure on A fences it, as for remote Agents.
- Messages across nodes between the delegator and Team members other than the coordinator (DEC-301).
- Discovery (S5), security (S6).

### Non-Goals

- Teams whose members are spread over nodes.

### Preserved Behavior Boundary

- Everything of slice 1 and 245 for remote Agents; local Team copies and Team runs.

### Prerequisites

None.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or follow-up. It is not a required design correction, unless it is a prerequisite (Prerequisites above).
- A downstream reviewer comment does not amend this requirements basis.

## Requirements

| Requirement ID | Requirement | Behavior | Priority | Source |
| --- | --- | --- | --- | --- |
| REQ-301 | A registered peer can start a Team run of any shared Agent Team of this node by its catalog address (the address local delegation uses), with the switch on. Excluded as for Agents: Orgs, application-owned, built-ins. The interim `REMOTE_TEAMS_NOT_SUPPORTED` refusal is removed | BEH-301 | Must | User 2026-10-21; 245 |
| REQ-302 | Each agent of the remote Team run uses its own default runtime and model; an agent without one uses the Team's default. If an agent is covered by neither, the delegation is refused before anything starts, with "There is no default runtime configured for the target agent team <name> on node <node>."; a default that can't run there is refused with its specific reason | BEH-302 | Must | User 2026-10-21; 245 DEC-201 |
| REQ-303 | The remote Team run uses the receiving node's temp workspace, and every agent in it runs with tool auto-approve on (RSK-201, accepted by the user, applies to every member) | BEH-301 | Must | 245 DEC-202, DEC-203 |
| REQ-304 | The `delegate_task` result for a remote Team is the local Team-copy shape plus the node: `{delegated: true, target_kind: "team", target_team_run_id, target_team_coordinator_agent_run_id, node}` | BEH-301 | Must | Local Team copies |
| REQ-305 | The delegator and the remote coordinator message each other by run ID in both directions (text only), as for a remote Agent; a message to the remote team run ID is refused with the guidance to use the coordinator's run ID. Other members follow DEC-301 | BEH-303 | Must | Slice 1 REQ-106 |
| REQ-306 | A Team run started by a peer is shut down after the idle grace period (`AUTOBYTEUS_TASK_EXECUTION_IDLE_SHUTDOWN_GRACE_MS`) once every member is quiet; a later message restores it and wakes the coordinator with its conversation. The link on A and the back-link on B survive restarts of either node | BEH-304 | Must | Slice 1 REQ-107/REQ-108 |
| REQ-307 | On B the remote Team run is an ordinary Team run in run history: openable, watchable, stoppable; its coordinator's first message names the delegator's run ID and node | BEH-305 | Must | Slice 1 REQ-112 |
| REQ-308 | Task closure on A fences the remote Team (no messages either way while closed; it keeps running on B until idle), as for a remote Agent; a saved Task to the remote Team is refused | BEH-303 | Must | Slice 1 REQ-111, 245 |
| REQ-309 | Docs and the Nodes tab note say that shared Agents **and Agent Teams** are available, and that every agent of a remote run auto-approves | BEH-301 | Must | — |

## Acceptance Criteria

| AC ID | REQ | Scenario | Trigger | Expected | Alternate | Verification |
| --- | --- | --- | --- | --- | --- | --- |
| AC-301 | REQ-301, 302, 303, 304, 307 | SCN-301 | Two registered nodes, switch on; B has a shared Team whose agents have defaults | `delegate_task({node, recipient_address: "/<team>"})` returns the team run ID, the coordinator run ID and the node; on B a Team run starts, only its coordinator starts, with the work packet naming the delegator and node A; members use their defaults or the Team's, the temp workspace, auto-approve | — | Two-server E2E |
| AC-302 | REQ-302 | SCN-302 | A Team member with no own default and no Team default; separately, a Team default naming an unavailable runtime | Refused with the "…target agent team <name>…" text, or the specific reason; nothing on B, nothing on A | — | Two-server E2E / unit |
| AC-303 | REQ-305 | SCN-303 | Remote Team from AC-301 | The coordinator replies to the delegator; the delegator follows up with the coordinator; each message once in both logs (A: the delegator's; B: the Team's) | A message to the team run ID: the coordinator guidance; DEC-301 outcome for another member | Two-server E2E |
| AC-304 | REQ-306 | SCN-304 | The Team went idle; then B restarted; then A restarted | A follow-up restores B's Team run and the coordinator receives it; a reply wakes the delegator on A | — | Two-server E2E |
| AC-305 | REQ-308 | SCN-303 | The delegator's Task closed; a saved Task to the remote Team | Messages refused with the closed-Task reason; closure result is `fenced_remote`; the saved Task refused | — | Server E2E |
| AC-306 | Preserved | — | Slice 1 and 245 suites; local Team copy suites | Pass unchanged | — | Regression |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor | Goal | Trigger | Steps | Expected | Validity | REQ / AC |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-301 | User / System | Agent on A | Hand a task to a Team on B | `delegate_task({node, recipient_address: "/<team>"})` | B resolves the Team, creates a Team run, A links it, the packet reaches the coordinator | Team works on B | Supported Normal | REQ-301 … 304, 307; AC-301 |
| SCN-302 | System | Agent on A | Team can't run on B | Same | Refused before anything starts | Clear reason | Supported Normal | REQ-302; AC-302 |
| SCN-303 | System | Delegator / coordinator | Continue | `send_message_to` by run ID | Delivered both ways | Conversation continues | Supported Normal | REQ-305, 308; AC-303, 305 |
| SCN-304 | System | Either | Follow up after idle or restart | Same | Restored, delivered | As local | Supported Normal | REQ-306; AC-304 |
| SCN-305 | User | Owner of B | Oversee | B's run history | Open, watch, stop | As any Team run | Supported Normal | REQ-307 |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes` (the note text only, REQ-309). Product Design: N/A — not requested.

## Quality And Non-Functional Requirements

| QR | Related | Area | Requirement |
| --- | --- | --- | --- |
| QR-301 | REQ-303 | Security | Every agent of a remote Team run auto-approves (RSK-201, accepted by the user for remote runs) |

## Data Continuity And Acceptable Loss

- New data only: a Team link with `nodeId` and the coordinator's run ID in A's tree; a `delegatedFrom` back-link on B's Team run tree. No migration; existing data unchanged.

## Assumptions

| ID | Assumption | Status |
| --- | --- | --- |
| ASM-301 | Shared Agent Teams meant for remote use have defaults (Team or members) on their node | The user's direction (245) |

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-301 | Who on B may message the delegator on A, and whom may the delegator message on B? | The pair rule (DEC-105) for a Team | (a) **The coordinator only**, both ways; other members reach outside through their coordinator. (b) Any member of the Team run, both ways | The result names the coordinator as the Team's one entry point, and the work packet reaches only the coordinator; other members don't know the delegator's run ID unless the coordinator passes it on. (b) would make A track every member of B's Team (their run IDs, which appear only as members start), and would let any member write across nodes. Locally, members of a Team copy can message the delegator, so (a) is narrower than local. It can be widened later without a contract change. **Recommend (a).** | User | Needs user |
| DEC-302 | Must S3 (lifecycle across nodes) come before Teams? | The plan recommended S3 first | What S3 covers: closing the Task on A stops the remote run; stop or reactivate from A; the remote run shown in A's run tree. What it does **not** cover: idle shutdown, wake on message and restarts. Those are already in slice 1 for Agents and in this ticket for Teams (REQ-306) | A remote Team behaves like a remote Agent: it fences on Task closure, keeps running on B until idle, then shuts down; the next message restores it; restarts of either node keep the link. Nothing in S3 is needed for Teams to work. S3 then adds the lifecycle controls for Agents and Teams together. **Recommend: Teams now; S3 later, covering both** | User | Needs user |
| DEC-303 | What does a Team run on B record as its Team-level default when the Team has none but every member has its own? | The tree needs a Team-level launch (delivery note from 245) | 245's resolver records the coordinator's launch as the Team-level launch in `defaults_only` mode when the Team default is not usable (`collaborator-launch-resolver.ts:268`). It is used by nobody when every member runs on its own default | **Decided:** keep 245's recording; it is truthful (the coordinator's launch) and unused by members with their own default | Solution Designer | Decided |
| DEC-304 | The unused Team run on B when A's commit or packet fails after B created it | Agents use the prepared-run TTL; Team runs have no prepared state | (a) It stays an empty Team run until the idle schedule shuts it down; it is in B's history with no messages. (b) A new prepared state for Team runs | (a) is rare (A's link commit or packet failure) and harmless; (b) adds machinery. **Decided (a)**, recorded as a risk (RSK-301) | Solution Designer | Decided |

## Traceability

| REQ | UC | BEH | AC | SCN |
| --- | --- | --- | --- | --- |
| REQ-301 … 304 | UC-301 | BEH-301/302 | AC-301, AC-302 | SCN-301/302 |
| REQ-305 | UC-302 | BEH-303 | AC-303 | SCN-303 |
| REQ-306 | UC-302 | BEH-304 | AC-304 | SCN-304 |
| REQ-307 | UC-303 | BEH-305 | AC-301 | SCN-305 |
| REQ-308 | UC-302 | BEH-303 | AC-305 | SCN-303 |
| REQ-309 | UC-301 | BEH-301 | — | — |

## Architecture Phase Input

- Reuse: 245's `NodeCatalogPort` and `catalogTaskSourceOf` (Team source); `TeamRunService.createTeamRun` on B; slice 1's endpoint kinds, `RemoteMessageSend`, inbound order; the remote link and `delegatedFrom` patterns; the SR-017 endpoint-set rule for B's Team package validation.
- To verify:
  - how B's Team root learns its `delegatedFrom` and its idle schedule;
  - which root a message to B's coordinator resolves (the message must name the Team run);
  - the Team link shape on A (coordinator ID stored, no own tree on A).

## Readiness Check

- Content ready for approval: `Yes`, pending DEC-301 and DEC-302.
