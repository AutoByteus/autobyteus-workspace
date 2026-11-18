# Investigation Notes — list-running-agents (autobyteus-492)

## Investigation Meta

- Package identifier: `list-running-agents`
- Request / ticket: Project Task `autobyteus-492` (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`), delegated by `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`)
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/list-running-agents`
- Repository mode: `Git`
- Task worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/list-running-agents`, `codex/list-running-agents`
- Resolved base remote / branch / revision: `origin/personal` at `bd2053ee51` (fetched 2026-11-18)
- Finalization target remote / branch: `origin/personal`
- Bootstrap result: worktree created from the freshly fetched `origin/personal`
- Bootstrap blocker: None
- Current solution revision ID: `SR-009`
- Authorities read (requirements reading gate, 2026-11-18): `references/requirements-engineering.md`, `references/finding-the-cause.md`, `references/ticket-scope.md`
- Investigation status: requirements and architecture investigation complete

## Initial Request And Clarifications

- Original request (founder 2026-11-14, voice, PM's reading): a tool "list running agents", the pair of `list_available_agents`: the agents and agent teams that already run, also on another node, with run ID, name/address, node, state, Task, start time, so an agent can message them without a person giving it a run ID. Example: a Project Task Manager already runs on another node.
- Clarifications received (Task comments, 2026-11-18, the founder's words read by the PM):
  1. The list is for **messages only**. Delegating a Task to an already running agent is **not** wanted (delegating means a new copy).
  2. The idea: the PM on this node sees what runs on other nodes (each node has its own PM, maybe several) and messages the right one. Starting new work on another node stays `delegate_task` with `node`.
  3. "The list of running agents should only return the roots, the standalone running ones." PM's reading: root runs only; a Team (or Org) run is one entry; no members and no delegated copies as rows.
  4. The founder in the Solution Designer's conversation (2026-11-18, voice, after the four questions): "This is definitely why we need to do refactoring … `send_message_to` has the target agent run ID; in theory you should be able to send a message to it … `send_message_to` also adds this node ID, then the target agent run ID … this should be possible; this is why we designed it earlier. It's the same for `delegate_task`." Reading (to be confirmed): the run ID (plus `node` for another node) is enough to message a running agent; the Task-based refusal is what must be refactored; `send_message_to` gets `node` as `delegate_task` has it.
  5. The founder again (2026-11-18, voice, interrupting the design): "the current running standalone agent teams or agents … maybe there's some kind of global area where those are stored, then send_message_to can easily reach them … of course in theory you can send to any … but do we really need [that]? Because the list of running agents only returns the standalone ones, which the user started … on the current node you are only able to know the remote standalone ones, so of course your send_message_to will only use those." Reading (to confirm): the new reach of send_message_to is only the running runs a person started (what the list shows), from any sender; task agents and members of other Tasks stay as today; a node-wide registry of those runs serves both the list and send_message_to.
  7. The founder (2026-11-18, voice): an Agent entry returns its agent run ID "with its workspace, the workspace the agent is running in"; a Team entry "the team run ID and also the coordinator agent run ID … similar to delegate task"; then "the workspace information for agent team of course should return" (DEC-013, SR-006).
  6. The founder (2026-11-18, voice, answering the reading of 5): "if you know the agent run ID or the agent team run ID, then you should be able to use send_message_to … send_message_to should be able to reach … all the ones, for example your task agent or your task agent team or your standalone agents or your standalone agent team … list_running_agents should only return the standalone ones, because it doesn't make sense to return the task agents' runs or task agent teams' runs." This supersedes the reading of 5: every running agent is reachable by run ID (SR-002), a team run ID too (it reaches the team's coordinator), and only the list is limited to runs a person started.
- User-supplied constraints: keep it simple; follow `DESIGN.md`; never conversation content in the list; cross-node through the existing node authentication; the first version may be limited to the own node plus the nodes the founder allows; release only on his word.
- Initial ambiguity: who may see and who may message whom (explicitly left for the founder); what a Team and an Org entry show; whether "standalone" excludes teams (PM: ask only if the design needs it).

## Product And Domain Understanding

- Product area: agent collaboration tools (`send_message_to`, `delegate_task`, `list_available_agents`, `list_peer_nodes`), remote collaboration between nodes.
- Affected actors: agents (chiefly Project Task Managers) on one node and on paired peer nodes; the founder as owner of every node.
- Terms (`autobyteus-server-ts/docs/design/collaboration_model.md` §1): *run*, *root* (every run is a root of its own since autobyteus-461), *delegated run* (a copy `delegate_task` started; has `delegatedFrom`), *entry agent* (an Agent run's own agent, a Team run's coordinator), *standing instance*, *node*, *peer*.
- "Root the user started" = a run without `delegatedFrom`. This is the founder's "standalone running ones".

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-11-18 | Doc | `autobyteus-server-ts/docs/design/collaboration_model.md` CM-5, CM-11, §4, §5 | The rule of who may message whom | CM-5: two runs message each other by run ID only when they share an open Task or one assigned the other's open Task; "runs of different Tasks are refused". CM-11: "No other run is reachable across nodes." §4 lists "messages to active runs on a peer that no delegation linked" as a later step. | The core decision (DEC-001) |
| 2026-11-18 | Code | `src/agent-communication/services/global-agent-run-message-router.ts` | `send_message_to(target_agent_run_id)` routing | Order: own root → `CrossRunMessageDelivery` (Task-related runs) → team run ID guidance → `getActiveRun` (live only) → refusal `TASK_AGENT_RESOURCE_CONFLICT` when both sides have a member context (R-9). No `node` parameter. | — |
| 2026-11-18 | Code | `src/agent-collaboration/communication/cross-run-message-delivery.ts`, `delegation/delegation-index.ts` `canMessage`, `runOfAgent` | Cross-run admission | `canMessage`: shared open Task or assigner. A receiver related by a Task is restored when stopped (DEC-001 of 461: "a message wakes a stopped run"); an unrelated one is refused. | — |
| 2026-11-18 | Doc | `docs/modules/remote_collaboration.md` | Cross-node mechanics | Remote messages need a link (`RemoteRunLinks` endpoints built from Task entries or `delegatedFrom`); a sender not linked is `REMOTE_TARGET_NOT_PERMITTED`. Four request kinds plus run-view routes, all through `PeerGateway`. Discovery (`list_peer_nodes`, `list_available_agents` with `node`) asks peers live, caches nothing. | New peer request kind needed for a remote list and for unlinked messages |
| 2026-11-18 | Doc | `docs/design/node_access_model.md` NA-2, NA-7, NA-9 | Cross-node authentication | Every `/rest/remote/*` route is peer-only and HMAC-signed by the paired peer secret; a new route is protected without listing it (deny by default). | A new peer route inherits authentication |
| 2026-11-18 | Doc | `docs/modules/agent_tools.md` § Server-Owned Agent Discovery Tools | The pair tool | `list_available_agents` / `list_peer_nodes` are opt-in (selected in the definition's `toolNames`); with `node` they go through `PeerDiscoveryChannel`; refusals share `delegate_task`'s texts. | The new tool follows the same shape |
| 2026-11-18 | Doc | `docs/modules/standalone_agent_run_root.md` | Root lifetime | Each live root is registered in `ActiveCollaborationRootDirectory`; Stop unregisters. Only delegated runs idle-shut-down. After a restart there are no roots until used or resumed. | "Live" = registered root |
| 2026-11-18 | Code | `src/agent-collaboration/execution/services/active-collaboration-root-directory.ts` | Source of live roots | Holds every live root by identity; no list method today (only `resolve`, `placeOf`, `findTeamCoordinator`). | Design: one read-only enumeration |
| 2026-11-18 | Code | `src/agent-collaboration/execution/run-status-service.ts` | Status vocabulary | Agent statuses `offline`, `idle`, `error`, `initializing`, `running`; team aggregate by `foldTeamAggregateStatus`. | State values for the list |
| 2026-11-18 | Doc | `docs/modules/projects.md` § Runs started under a Project | A root's Project | `projects/<id>/project_runs.json` records top-level Agent and Team runs started under a Project (in-memory view in `ProjectRunService`). | Project is the useful label of a root (a root has no Task) |
| 2026-11-18 | Data | `~/.autobyteus/server-data/memory` (counts only, no content read) | Size of the noise | 764 agent folders, 784 team folders, 24 org folders. Of 541 agent runs with metadata, 56 are delegated; of 776 team trees, 175 are delegated. | Default must be live roots only |
| 2026-11-18 | Data | `memory/agents/project_task_manager_7c8dce0c…/run_metadata.json` (keys only) | What a PM root carries | Keys: `address` `/project_task_manager`, `agentDefinitionId`, `startedAt`, `runtimeKind`, …; no `delegatedFrom`. It is recorded in this Project's `project_runs.json`. | A PM is a user-started standalone root with a Project |
| 2026-11-18 | Command | `list_available_agents` (this run) | Catalog shape | `/project_task_manager` is a catalog Agent; addresses are top-level. | — |
| 2026-11-18 | Doc | `docs/modules/agent_execution.md` (input queue, ~l. 523) | Does a message interrupt a working agent | Input is queued; a message waits for the current turn. Only Interrupt / Terminate stop a turn. | "Not interrupting" already holds for messages |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger Or Governing Contract | Current Supported Product Behavior Path / Lifecycle | Current Outcome / Invariants | Evidence | Confidence / Unknown |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Contract | `list_available_agents` (opt-in) | Lists startable definitions (name, kind, address, description) of this node, or of a peer with `node` | No run IDs; nothing written | `agent_tools.md` | High (Read) |
| BEH-002 | Contract | — | No tool lists running runs; an agent learns run IDs only from runs it started and from messages it receives | — | Code search; `agent_tools.md` | High (Read) |
| BEH-003 | Contract | CM-5, R-9 | `send_message_to(run ID)` to an unrelated user-started root on the same node is refused | `TASK_AGENT_RESOURCE_CONFLICT` "You can't message this agent: it works on a different Task." (also for a PM root that works on no Task) | Probe PRB-002 (live app) | High (Reproduced) |
| BEH-004 | Contract | CM-11 | A run ID of another node that no delegation linked is unknown here | `TARGET_AGENT_RUN_NOT_ACTIVE`; on the receiving side an unlinked sender is `REMOTE_TARGET_NOT_PERMITTED` | Probe PRB-001; unit tests PRB-003 | High (Reproduced for the local refusal; the remote refusal by unit test with fakes) |
| BEH-005 | Contract | CM-5, CM-7 | A message to a Task-related run that is stopped restores (wakes) it | Holds for Task-related runs only | `cross-run-message-delivery.ts`; `standalone_agent_run_root.md` | High (Read) |
| BEH-006 | Contract | R-12 | A team run's ID given to `send_message_to` is refused with its coordinator's run ID | `TARGET_IS_TEAM_RUN` | Router code; unit test | High (Read + test) |
| BEH-007 | Contract | Agent input queue | A message to a working agent waits for its current turn | Does not interrupt | `agent_execution.md` | Medium (Read) |

## Relevant Codebase And Technical Facts

| Path / Component / Contract | Current Responsibility Or Behavior | Requirement Implication | Architecture Question |
| --- | --- | --- | --- |
| `ActiveCollaborationRootDirectory` | Every live root by identity | Live roots are already known in one place | Add a read-only enumeration; filter user-started roots |
| `DelegationIndex` / run files `delegatedFrom` | Which runs are delegated | "User-started" is decidable | Read from the root itself or the index? |
| `RunStatusService`, `PairedAgentAccess.pairedAgentStatuses` | Live agent statuses | State of an entry | Team: coordinator's status or the aggregate |
| `ProjectRunService` | Runs started under a Project | Project label of a root | — |
| `GlobalAgentRunMessageRouter`, `CrossRunMessageDelivery`, `DelegationIndex.canMessage` | The message rule | A new rule between user-started roots | Where the new rule lives (one owner) |
| `RemoteRunLinks`, `RemoteMessageReceiver`, `PeerGateway`, `PeerClient` | Linked messages between nodes | Unlinked messages need a new endpoint kind or request | How a reply finds its way back |
| `PeerDiscoveryChannel` / `PeerNodeDiscovery` | Live discovery of a peer | The remote list follows it | New request kind `running-roots` |

## Runtime, Probe, Or Reproduction Findings

| Method / Command | Scenario | Observation | Established | Requirement Implication | Evidence |
| --- | --- | --- | --- | --- | --- |
| PRB-001: `send_message_to(target_agent_run_id: "project_task_manager_000…000")` from this run (live app, 2026-11-18) | A run ID this node does not know (as any unlinked run of another node) | `TARGET_AGENT_RUN_NOT_ACTIVE` "No running agent has the run id …" | Reproduced | A listed remote run ID cannot be messaged today | This conversation |
| PRB-002: `send_message_to(target_agent_run_id: "project_task_manager_13d4c4f4…")` from this run (live app) | Another Project Task Manager root on this node, related to me by no Task | `TASK_AGENT_RESOURCE_CONFLICT` "You can't message this agent: it works on a different Task." Nothing delivered. | Reproduced | The founder's scenario fails today even on one node; a new message rule is required, not only a list | This conversation |
| PRB-003: `npx vitest run tests/unit/agent-communication/global-agent-run-message-router.test.ts tests/unit/remote-collaboration/remote-messaging-owners.test.ts tests/unit/remote-collaboration/remote-message-receiver.test.ts` (base checkout at `bd2053ee51`) | The refusal rules as tested | 3 files, 28 tests passed (R-9 refusal of an unrelated run; `REMOTE_TARGET_NOT_PERMITTED` for an unlinked sender) | Measured (fakes for roots and peers) | Confirms BEH-003/004 as intended behavior today | Command output |
| PRB-004: counts in `~/.autobyteus/server-data/memory` | Volume | 1,572 run folders; 231 delegated among those with run files | Measured | Default = live roots only | Source log |

- Temporary diagnostics: None.
- Reproduction for implementation to start from: PRB-002 is the scenario the build must turn green (as a test: two user-started roots on one node).
- Cross-node: not run live (no second paired node in this investigation). Stated from code, docs and unit tests: an unlinked run ID of another node is refused on both sides (BEH-004).

## Stakeholder And User Evidence

| Source / Actor | Need | Evidence Strength | Requirement Implication | Open Question |
| --- | --- | --- | --- | --- |
| Founder (Task description and two comments) | A PM sees what runs on other nodes and messages the right running agent | Direct (voice, via PM) | Roots list + a message rule between roots, also across nodes | Who may see / message (DEC-001, DEC-002) |
| PM (message 2026-11-18) | Roots only; Team/Org as one entry; maybe a count | PM's reading | Entry shape | Org entry (DEC-004) |

## External Contracts, Standards, And Dependencies

| Contract | Authority | Relevant Behavior | Evidence | Risk |
| --- | --- | --- | --- | --- |
| Peer authentication (autobyteus-437) | `node_access_model.md` NA-2/7/9 | New `/rest/remote/*` routes are peer-only and signed | Doc | None found |
| Collaboration model CM-5, CM-11 | `collaboration_model.md` | Must change by an explicit new rule | Doc | Model change: High risk |

## Persisted Data And State Facts

- Affected stored subject: none written by the list. A message between two roots is written in both roots' message logs (CM-9), as today.
- Remaining evidence gap: None for requirements.

## Product Design Request Context

- Product Design request in the current input: `Not stated` (an agent tool; no UI).

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related IDs | Status | Approval |
| --- | --- | --- | --- | --- | --- | --- |
| None | — | — | — | — | — | — |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| UNK-001 | Unknown | Live two-node behaviour of the new route | Cross-node is the founder's main case | Two-server E2E (`tests/e2e/remote-collaboration/`) in API/E2E | Open (build) |
| RSK-001 | Risk | Any agent may now message any running agent by run ID (SR-002), also from a paired node | One agent could disturb another; a closed Task's run could get new work | Founder's decision (DEC-001/002). Messages queue and never interrupt (BEH-007); a stopped run is not woken by an unrelated sender (DEC-003); the node that holds a closed Task refuses for all its senders (DEC-011, AR-001) | Accepted by the founder |

## Architecture Investigation Findings

Read 2026-11-18 (all `Read` unless noted); the design spec cites file and line for each.

- Router order and R-9: `agent-communication/services/global-agent-run-message-router.ts:56-176`; dispatcher `send-message-to-dispatcher.ts:65-73`.
- Cross-run admission and its CONFLICT throw: `agent-collaboration/communication/cross-run-message-delivery.ts:86-164`; `DelegationIndex.canMessage` `delegation/delegation-index.ts:360-368`; composition `compositions/collaboration-composition.ts:206-263`.
- Remote send order and pair rule: `execution/remote/remote-message-send.ts:33-46`, `remote-endpoint.ts:10-136`, `remote-run-links.ts:113-158`; engine `execution/communication/root-communication-engine.ts:154-295` (Task check only the closed-Task fence: `standalone-agent-run-root.ts:294-301`).
- Inbound: `remote-collaboration/inbound/remote-message-receiver.ts:68-126`; gateway one handler per kind `channel/peer-gateway.ts:55-80, 200-296`; contract `domain/remote-requests.ts`; client `channel/peer-client.ts:190`.
- Live roots: `execution/services/active-collaboration-root-directory.ts` (no list method); live statuses per kind: `standalone-paired-agent-access.ts:95-100`, `AgentOrgAgentStatuses`, Team access; idle shutdown keeps a delegated Agent's root but ends its host (`delegated-run-idle-shutdown.ts:66-74`).
- Run files: `run-history/store/run-own-agents-reader.ts` (`delegationOf` ignores peer-started runs, l. 21-22); start times: agent `startedAt`, team/org `createdAt`.
- Header names a peer sender's node: `execution/communication/received-message-header.ts:6-11`.
- Agent-facing texts: `agent-collaboration/domain/agent-team-collaboration-llm-contract.ts:12-41`.
- Unknowns: none for design; the live two-node behaviour is verified by the two-server E2E in the build (UNK-001).

## Requirement Implications

- The list alone does not reach the goal: today a listed root cannot be messaged (PRB-002, PRB-001). The ticket must include a message rule for listed roots, locally and across nodes, or the founder must accept a list that is only informative.
- A root the user started has no Task (Tasks belong to delegated runs), so "the Task it works on" is empty for every listed entry; the Project it was started under is the label that tells two PMs apart.
- A Team root's message goes to its coordinator: the entry should carry the coordinator's run ID, because `send_message_to` refuses a team run ID (BEH-006).
- An Org run has no entry agent; its PM (if any) is a unit inside it.

## Notes For Architecture Design

See `design-spec.md` (SR-006).
