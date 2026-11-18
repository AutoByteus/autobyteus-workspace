# Design Spec — list-running-agents (autobyteus-492)

## Solution And Approval Basis

- Current solution revision ID: `SR-009` (SR-009: AR-008 wording, `resolveActive` as a target; SR-008: the Solution Designer's per-use-case walkthrough, § Design Validation Walkthrough, fixes G-1 and G-2; SR-006 revised for ARCH-REV-001: AR-001, AR-003 … AR-006, and the founder's field names, DEC-013; SR-007 for ARCH-REV-002: AR-007)
- Approved requirements baseline: `requirements-doc.md` at SR-006, approved by the founder (DEC-001, DEC-002, DEC-004, DEC-012, DEC-013; his answers of 2026-11-18 in the Solution Designer's conversation) and by the Solution Designer within his direction (DEC-003 … DEC-011, founder informed).
- Behavior-defining supplements: None.
- User approval of the design: `Not required` (the Task asks for investigation and design, then build; it does not ask for design approval).
- Design status: `Ready`
- Canonical investigation notes: `tickets/in-progress/list-running-agents/investigation-notes.md`
- Authorities read (2026-11-18): `references/architecture-design.md`, `references/design-principles.md`, `DESIGN.md` (root), `docs/design-cases.md` (Cases 1–8 read in full; titles of the rest), `autobyteus-server-ts/AGENTS.md`, `autobyteus-server-ts/docs/design/collaboration_model.md`, `docs/modules/remote_collaboration.md`, `docs/modules/agent_tools.md`, `docs/modules/standalone_agent_run_root.md`, `docs/design/node_access_model.md`. `references/design-examples.md`: not used.
- Project design-principle conflicts or discrepancies: None.

## Current-State Read

- **Message by run ID** (`send_message_to(target_agent_run_id)`): `SendMessageToDispatcher.dispatch` (`agent-communication/services/send-message-to-dispatcher.ts:65-73`) → `GlobalAgentRunMessageRouter.deliver` (`global-agent-run-message-router.ts:56-176`), in order:
  1. the sender's own root, when it holds the run ID (its agents, and its linked remote endpoints, `RemoteRunLinks.has`) (l. 65-81);
  2. `CrossRunMessageDelivery.route` (l. 85-90): runs related by an open Task (`DelegationIndex.canMessage`, `delegation-index.ts:360-368`) — the receiver is restored when stopped; an assigner may reopen; otherwise `TASK_AGENT_RESOURCE_CLOSED` or **`TASK_AGENT_RESOURCE_CONFLICT`** (`cross-run-message-delivery.ts:140-164`). It returns `null` for an agent no Task names (l. 90, 134-138) and for a run on a peer (l. 92-94);
  3. team-run-ID guidance (l. 94-102);
  4. a live `AgentRun` (`getActiveRun`, l. 104-112); **R-9**: refused `TASK_AGENT_RESOURCE_CONFLICT` when both sides have a member context (l. 129-130); otherwise a direct input post with no message log (l. 132-175), today used by senders and targets without a collaboration root (application-owned runs).
- **Across nodes** a message moves only along a link: the root's `RemoteMessageSend.send` refuses a sender the endpoint does not pair (`remote-message-send.ts:35`, pair rule `remote-endpoint.ts:72-76`: only the delegator), then `engine.prepareRemoteSend` → `RemoteRunLinks.deliver` (`remote-run-links.ts:153-158`) → `PeerClient.deliverMessage` (`peer-client.ts:190`) → B's `PeerGateway` → `RemoteMessageReceiver.accept` (`remote-message-receiver.ts:68-107`), which checks the stored link (`not_linked` → `REMOTE_TARGET_NOT_PERMITTED`, l. 73), restores the named `targetRoot` and calls `root.acceptRemoteMessage` (standalone: `standalone-root-message-delivery.ts:120-126`: link check, `whenReady` — restores — then `engine.acceptFromRemote`). The receiver's header names the sender's node (`received-message-header.ts:6-11`).
- **Live roots** are registered in `ActiveCollaborationRootDirectory` (`active-collaboration-root-directory.ts:39-152`); it has no list. Each root kind's live agents and their statuses: `PairedAgentAccess.pairedAgentStatuses` (`paired-agent-access.ts:35`; standalone `standalone-paired-agent-access.ts:95-100`: the active host only; Team and Org likewise), already composed as `RunStatusSources.agents(kind)` (`compositions/collaboration-composition.ts:201-203, 249`).
- **A run's own file** (`RunOwnAgentsReader`, `run-history/store/run-own-agents-reader.ts`): agent `run_metadata.json` (`agentDefinitionId`, `address`, `startedAt`, `delegatedFrom`), team and org trees (`createdAt`, `delegatedFrom`, members, coordinator). `delegationOf` ignores a peer-started run (l. 21-22), so it cannot answer "started by a person".
- **Idle shutdown:** a delegated Agent run's host is terminated while its root stays registered (`delegated-run-idle-shutdown.ts:66-74`); a delegated Team's quiet shutdown unregisters its root (`team-paired-agent-access.ts:52`). So "the root is registered" is not "the agent runs"; the agent's live status is.
- **Discovery** mirrors: `list_available_agents` (opt-in, `agent_tools.md` § Discovery), with `node` through `PeerDiscoveryChannel` → `PeerNodeDiscovery` → `PeerClient` → B's `/rest/remote/available-agents` (`peer-gateway.ts`, `remote-requests.ts:22`); the peer's answer is read strictly.

Constraints the target keeps: CM-9 (each run logs its own side), the closed-Task rule, Task-related wake and reopen, links routing remote run IDs without `node`, peer authentication at the gate (NA-2, NA-7, NA-9), DESIGN.md rule 9 (both nodes run one release; no version handling).

## Task Size And Architectural Risk (Mandatory)

- Task size: `Large`
- Size rationale: about 20 production files over five subsystems (agent-communication, agent-collaboration cross-run and remote, the three root kinds, remote-collaboration gateway/client/receiver, agent-tools discovery and MCP adapters), two new peer request kinds, one new agent tool, a changed tool contract (`send_message_to` `node`), and the collaboration model and four module docs.
- Architectural risk: `High`
- Risk rationale: it changes the canonical message contract (CM-5, CM-11) for every agent; it adds two inter-node requests (contract between nodes, security surface behind the peer gate); it changes which runs one agent can reach (isolation between Tasks and between nodes).
- Escalation trigger: a root kind that cannot answer "is this agent running" without restoring it; a need to store anything new; a peer request that must bypass `PeerGateway`; any change to Task-related wake, reopen or closure.

## Architecture Investigation Evidence

| Source / Probe | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| PRB-002 (live app) | `send_message_to` to another PM root | `TASK_AGENT_RESOURCE_CONFLICT` | The refusal to replace (DS-003) | — |
| PRB-001 (live app) | unknown run ID | `TARGET_AGENT_RUN_NOT_ACTIVE` | Reused as "not running" refusal; text gains the `node` hint | — |
| PRB-003 (unit tests) | router, remote messaging owners, receiver | 28 tests pass on base | Tests to rewrite: R-9 test, receiver `not_linked` test | — |
| Code | `cross-run-message-delivery.ts:86-164` | Admission throws CONFLICT last | `admit` returns `unrelated` instead | — |
| Code | `remote-endpoint.ts:10-31, 72-88` | Endpoint = reference + pair rule + transmission | A transient `unlinked_run` endpoint fits the same send/accept steps | — |
| Code | `root-communication-engine.ts:154-228` | `prepareRemoteSend` / `acceptFromRemote` take any endpoint; Task check via `assertDeliveryAllowed`, which reads the root's own links (`remoteLinks.endpointFor`), not the endpoint passed in: only the closed-Task fence of this root's linked endpoints (`standalone-agent-run-root.ts:294-301`, `root-team-run.ts:424-431`, `agent-org-run.ts:107`); `RemoteEndpointCore.ownershipChain` has no reader (only a comment at `:152`) | Engine unchanged | — |
| Code | `paired-agent-access.ts:35`, `collaboration-composition.ts:201-203` | One live-status source per root kind exists | `RunningAgents` combines it with the root directory | — |
| Code | `delegated-run-idle-shutdown.ts:66-74` | Host terminated, root kept | "Running" = live agent status, not root registration | — |
| Code | `peer-gateway.ts:55-80, 200-296` | One handler method per request kind, admission first | Two new kinds follow it | — |
| Data | `~/.autobyteus/server-data/memory` counts | 1,572 stored runs | List reads only live roots' files | — |

## Intended Change

Make "the run ID is the address" true: any agent messages any running agent by its run ID (a team through its coordinator's run ID, as today), on this node, or with `node` on a paired node, and the receiver answers the same way; add `list_running_agents` to find the run IDs of running runs a person started, here or on a paired node. Task-related wake, reopen and the closed-Task rule stay.

## Change Scope (Mandatory)

- In scope: UC-001 … UC-004. Areas: the message router and cross-run delivery; remote messaging (endpoint kinds, send, receiver, gateway, client, request contract); the three root kinds' message deliveries (one outbound and one inbound method each); a new running-agents owner and listing; the new tool on every runtime; the collaboration model and docs.
- Derived consumers:
  | Changed structure / rule | Consumer | Decision |
  | --- | --- | --- |
  | Message rule (CM-5, CM-11) | `collaboration_model.md` CM-5, CM-11, §4, §5 | Rewrite: new CM-13 "The run ID is the address"; CM-5/CM-11 keep Task wake/reopen/closed and links |
  | Message rule | `agent_communication.md`, `agent_tools.md`, `remote_collaboration.md`, `projects.md` (message scope lines) | Update to the new rule |
  | Message rule | `send_message_to` tool description and field texts (`agent-team-collaboration-llm-contract.ts:12-20`) | Add `node`; "Unknown run ids are rejected" → "a run id that is not running is refused" |
  | `TARGET_AGENT_RUN_NOT_ACTIVE` text | agents reading it | Add: "For an agent on another node, also pass node." |
  | `RemoteMessageTransmission` / `DeliverRemoteMessageRequest` | `PeerClient.deliverMessage`, `PeerGateway` parsers | New union member and path; existing kinds unchanged |
  | `RemoteEndpoint` union | `RemoteRunLinks.endpoints/endpointFor/inboundEndpoint`, roots' `assertPeerEntryOpen` | The new kind is never stored in or returned by `RemoteRunLinks`; it exists only for one send or accept, so these readers are unaffected |
  | `ActiveCollaborationRootDirectory` | — | Read-only `liveRoots()` added; nothing else changes |
  | Tool exposure (`RuntimeAgentToolExposure`) | tool picker, MCP adapter catalog, Claude/Codex tooling options, Work Journal discovery converters (`agent-work-journal/rendering/platform/discovery-tool-converters.ts`) | Add `list_running_agents` beside `list_available_agents` in each |
  | Messages between unrelated local runs (G-1) | Live run-view feed (`RunMessagesFeed.publish`, `delegation/run-messages-feed.ts:26-43`: published to the views of both runs, because one side is X) and the stored Team-tab read (`collaboration-participant-messages.ts:81-88`: `isPublicMessage` keeps only messages whose two agents are in X's tree, or a past participant from `forAgentRunIds`, which reads delegated runs only) | Not in run views, live or stored, like a message to a remote run (`acceptFromRemote` publishes nothing, `root-communication-engine.ts:226`). `RunAcceptInput` gains `publishToViews`; `CrossRunMessageDelivery` passes `true` for related, `false` for unrelated; the engine's `acceptFromRun` publishes only when it is `true`. The two agents' own conversations and both message logs show it (CM-9) |
| Message logs (CM-9) | run views, package validators | An unlinked remote message is stored like a linked one (an endpoint not of the run): the Team/Org validators admit a message with one local endpoint (`remote_collaboration.md` § Package admission) — unchanged; views keep remote-endpoint messages out as today |
- Deliberately left alone: `delegate_task` (all modes); Task closure, fencing and reopen; idle shutdown; the run tree and remote child rows; owner commands; `list_available_agents`; peer pairing and the gate; the app UI.
- Follow-ups: None found.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Requirement / AC IDs | Trigger | Existing Behavior | Approved Change / Preserved | Target Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-002 | Contract | REQ-001…007; AC-001…004 | `list_running_agents` | None | New | DS-001, DS-002 |
| BEH-003 | Contract | REQ-008, REQ-010; AC-005, AC-007, AC-008 | `send_message_to(run ID)` | CONFLICT refusal | Delivered to a running agent; never wakes | DS-003 |
| BEH-004 | Contract | REQ-009; AC-006 | `send_message_to(node, run ID)` | Unknown | Delivered to a running agent of the peer | DS-004, DS-005, DS-006 |
| BEH-005 | Contract | REQ-010, REQ-011; AC-007, AC-008 | Message to a Task-related or closed run | Wake / reopen / CLOSED | Preserved | Existing CrossRun path (unchanged branch) |
| BEH-006 | Contract | REQ-011; AC-002 | `send_message_to(team run ID)` | Refused with coordinator (R-12) | Preserved; across nodes the peer gives the same refusal (`TARGET_IS_TEAM_RUN` with the coordinator's run ID) when the team runs there; the list gives `team_coordinator_agent_run_id` | Router l. 92-102 (local); `RemoteMessageReceiver.acceptRunMessage` via `RunningAgents.teamCoordinatorOf` (peer) |
| BEH-007 | Contract | REQ-010 | Message to a working agent | Queued | Preserved (same reservation path) | DS-003, DS-004 |
| BEH-008 | Contract | REQ-011 | `delegate_task` | New copy | Preserved | — |

## Relevant Supplemental Task Artifacts

None.

## Task Design Health Assessment (Mandatory)

- Change posture: `Behavior Change` (with a new tool).
- Current design issue found: `Yes`.
- Structural triggers:
  - **Several kinds or forms (P1):** fires. Senders: a standalone host, a Team member, an Org agent, a task agent, a member of a task agent team; targets: the same kinds, local or on a peer, running or not, linked or not. Response: the entry-form table below (Concrete Examples) traces each.
  - **Repeated coordination (P13):** fires. "Is this agent running, and in which root" is needed by local delivery, the peer receiver and the listing. Response: one owner, `RunningAgents`.
  - **Split sequence (P2, P13; Case 1):** checked. The remote send keeps one owner of the order (`RemoteMessageSend`); the new unlinked endpoint is data, not a callback.
  - **Behavior by absence (P13; Case 4):** fires today: a sender reaches the CONFLICT refusal because no Task relation is found. Response: admission returns an explicit `unrelated` result with its own rule (running only).
  - **Empty indirection (P13):** `RunningAgents` combines two owners (root directory + per-kind live statuses) for three consumers — not empty. No new port.
  - **Capability-area reuse (P4):** statuses reuse `PairedAgentAccess`; peer resolution reuses `RemoteRunChannel.findPeer`; listing over peers reuses `PeerDiscoveryChannel`; logs reuse the engine.
  - **Hidden dependency (P16):** the router reads `getActiveCollaborationRootDirectory()` and `AgentRunManager.getInstance()` by default today (l. 178-184); the new collaborators (`runningAgents`, `channel`) are passed in by the composition root. The existing defaults stay as they are (not touched beyond use).
  - **Vocabulary drift (P15):** "running agent", "started by a person" defined below and added to the collaboration model § 1.
  - **Persisted-data transition (P5):** does not fire (nothing new stored).
- Deliberate deviations: None.
- Root cause classification: `Boundary Or Ownership Issue` — who may message whom was decided by the Task relation alone (CM-5), and across nodes by the link alone (CM-11); the founder's rule makes the run ID the address and leaves the Task relation only what it truly owns (wake, reopen, closed).
- Refactor needed now: `Yes` — the CONFLICT branch and the outbound pair-rule refusal are replaced, not wrapped.
- Evidence: PRB-002; `cross-run-message-delivery.ts:163`; `global-agent-run-message-router.ts:130`; `remote-message-send.ts:35`; `remote-message-receiver.ts:73`.
- Design response: see spines; removal plan.
- Intentional deferrals: delivery retries across nodes stay at-most-once (FU-002 of autobyteus-191, already sent).

## Terminology

- **Running agent:** an agent whose live status its own root reports now (`PairedAgentAccess.pairedAgentStatuses` lists it). A host terminated by idle shutdown, a Team member not yet started, a stopped run: not running.
- **Run started by a person:** a run whose own file has no `delegatedFrom` (neither local nor from a peer). The list's entries.
- **Unlinked run endpoint (`unlinked_run`):** a remote agent named only by `{nodeId, agentRunId}`, with no Task link; built for one message (send or accept), never stored.
- **Related / unrelated (to a message):** related = today's Task rule (`canMessage`, or the assigner's continuation); unrelated = every other pair of runs.
- Glossary: `GLOSSARY.md` defers collaboration words to `collaboration_model.md` § 1; both words are added there.

## Legacy Removal Policy (Mandatory)

- Obsolete paths: the CONFLICT refusal for unrelated runs (local); R-9 in the router; the outbound pair-rule refusal in `RemoteMessageSend`; the dead `ownershipChain`. The inbound `not_linked` refusal stays for linked requests; only its test for a message that now goes the unlinked way is rewritten (linked kind stays for linked requests).
- Compatibility wrappers kept: `None`.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Decision: `Not Affected`. The list reads run files read-only; messages are written to the existing message logs in the existing shape (`CollaborationCommunicationMessage`), as linked remote messages are today. No new field, file or store.

## Data-Flow Spine Inventory

| Spine ID | Scope | Behavior | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary | BEH-002 | Agent calls `list_running_agents()` | Entries of this node | `RunningAgentsListing` | UC-001 |
| DS-002 | Primary | BEH-002 | Agent calls `list_running_agents(node)` | Entries of the peer, with `node` | `PeerNodeDiscovery` (A), `RunningAgentsListing` (B) | UC-002 |
| DS-003 | Primary | BEH-003 | `send_message_to(run ID)` to an agent of another local run | Delivered, both logs | `CrossRunMessageDelivery` | UC-003 |
| DS-004 | Primary | BEH-004 | `send_message_to(node, run ID)` | Delivered on the peer, both nodes' logs | `RemoteMessageSend` (A), `RemoteMessageReceiver` + receiving root (B) | UC-004 |
| DS-005 | Return | BEH-004 | B's agent answers `send_message_to(node: A, sender run ID)` | Delivered on A | as DS-004 | The answer path |
| DS-006 | Primary | BEH-004 | A run ID the sender's root links but the sender is not paired with (e.g. a teammate of the delegator), without `node` | Delivered via the endpoint's node | `RemoteMessageSend` | Founder: "doesn't matter if you're a member" |

## Primary Execution Spine(s)

- DS-001: `Agent → list_running_agents tool (local / MCP adapter) → RunningAgentsListing.list(caller root, filters) → ActiveCollaborationRootDirectory.liveRoots → RunOwnAgentsReader.listingFactsOf(root) + RunningAgents.statusesOf(root) + catalog name/address + Project name → entries`
- DS-002: `Agent (A) → tool(node) → PeerDiscoveryChannel.listRunningAgents(node) → PeerNodeDiscovery (findPeer) → PeerClient.runningAgents(nodeId) → [signed] → PeerGateway /rest/remote/running-agents (B) → RunningAgentsListing.list(no caller) → answer → PeerClient strict reader (A) → entries + node`
- DS-003: `Agent → SendMessageToDispatcher → GlobalAgentRunMessageRouter (own root miss) → CrossRunMessageDelivery.route → admit = unrelated → RunningAgents.rootOf(target) → sender root.prepareSendToRun → receiver root (`rootResolver.resolveActive(run)`, never restored).acceptFromRun({..., publishToViews: false}) → sender root.commitSentToRun → result`
- DS-004: `Agent (A) → Dispatcher → Router.deliver(node) → RemoteRunChannel.findPeer(node) → CrossRunMessageDelivery.closedPeerRunRefusal(peer.nodeId, T) (AR-001: CLOSED when this node's tree holds T on that node and all its entries are closed) → sender root.deliverToPeerRun → RemoteMessageSend.sendToPeerRun (linked & paired endpoint on that node, else unlinkedRunEndpoint) → engine.prepareRemoteSend → RemoteRunLinks.deliver → PeerClient.deliverMessage → [signed] → PeerGateway /rest/remote/run-messages (B) → RemoteMessageReceiver.acceptRunMessage → RunningAgents.rootOf(target) (null → RunningAgents.teamCoordinatorOf(target): `TARGET_IS_TEAM_RUN` with the coordinator's run ID, else not running) → root.acceptPeerRunMessage (in its gate: target still running) → engine.acceptFromRemote (B's log; header names A's node) → answer → engine.commitSentToRemote (A's log)`
- DS-006: `root.deliverExact → RemoteMessageSend.send(endpoint) → not paired → unlinkedRunEndpoint(endpoint.reference) → DS-004 from prepareRemoteSend on`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The listing reads the live roots, keeps those a person started, other than the caller's, of kind Agent or Team (Org runs are not listed, DEC-004) whose entry agent (an Agent's host, a Team's coordinator) is running, and builds one entry each from the run's own file, the live statuses, the catalog and the Project. | live root, entry | `RunningAgentsListing` | filters; definition name; catalog address; Project name |
| DS-002 | The same listing on the peer, asked through the signed peer channel; A reads the answer strictly and adds the peer's name as `node`. | peer, entry | `PeerNodeDiscovery` | strict reader; refusal texts shared with discovery |
| DS-003 | A target that no Task relates to the sender is admitted as `unrelated`; it is delivered only when `RunningAgents` finds it running, through the same prepare/accept/commit as a related message, but the receiver's root is the live one and nothing is restored. | message, receiver run | `CrossRunMessageDelivery` | running check; not-running refusal |
| DS-004 | With `node`, the router resolves the peer and hands the message to the sender's root. `RemoteMessageSend` uses the root's link when the sender is paired with that run, else a one-message `unlinked_run` endpoint; the peer receives a `run_message`, finds the running agent's root, and the root accepts it like a linked message, without waking anything. | message, peer, endpoint | `RemoteMessageSend` / `RemoteMessageReceiver` | peer resolution; strict answer |
| DS-005 | The answer is DS-004 from B to A: B's agent copies the run ID and the node name from the header. | — | as DS-004 | header wording |
| DS-006 | A root's link no longer refuses a teammate of the delegator; the message goes unlinked to the same node (running only). | endpoint | `RemoteMessageSend` | — |

## Spine Actors / Main-Line Nodes

`list_running_agents` tool, `RunningAgentsListing`, `PeerNodeDiscovery`, `PeerClient`, `PeerGateway`, `SendMessageToDispatcher`, `GlobalAgentRunMessageRouter`, `CrossRunMessageDelivery`, `RunningAgents`, the three roots' message deliveries, `RemoteMessageSend`, `RootCommunicationEngine`, `RemoteRunLinks`, `RemoteMessageReceiver`.

## Ownership Map

- `RunningAgents` (new): the one answer to "is this agent running on this node, and in which root" (`rootOf(agentRunId)`, decided from the root's own live statuses, not from `placeOf` alone, which also names a root that only links a remote run ID: `standalone-agent-run-root.ts:153-156`), and the coordinator of a team that runs on this node, from the team's own live root (`teamCoordinatorOf(teamRunId)` = `roots.resolve({rootSubjectKind: "agent_team", rootRunId})?.teamCoordinatorOf(teamRunId)`, AR-006; not `findTeamCoordinator`, which also answers for a team a root of this node delegated to another node, `active-collaboration-root-directory.ts:106-117`), for the peer's refusal guidance. `RunStatusService` also combines the directory and statuses, but as pushed view subscriptions held per client; a synchronous read-only question is a different need, so it is not reused and "which agents of this live root run, with their status" (`statusesOf(root)`). Combines `ActiveCollaborationRootDirectory` (`placeOf`, `liveRoots`) with the per-kind `PairedAgentAccess.pairedAgentStatuses`. Reads only; never restores.
- `RunningAgentsListing` (new): the listing rule (which roots, which fields, filters) and entry building. Owns the entry shape for both the tool and the peer answer.
- `CrossRunMessageDelivery`: owns the order of a message between two local runs, now for related and unrelated pairs; owns the admission result (`related` / `reopened` / `unrelated`; CLOSED throws as today); and the Task admission of a message to a peer run this node's tree holds (`closedPeerRunRefusal({nodeId, agentRunId})`: `runOfAgent`, then `tasksOf` entries with that `nodeId`; all closed → `TASK_AGENT_RESOURCE_CLOSED` with `ASSIGNER_ONLY_REACTIVATION_MESSAGE`, AR-001). Two callers, one rule: the router on the `node` path before the sender's root, and `route` itself in its peer-run branch (`cross-run-message-delivery.ts:92-94`), so a sender without `node` is refused the same way (AR-007).
- `GlobalAgentRunMessageRouter`: owns the order of target resolution for a run-ID message, now including `node`: peer resolution, then `crossRun.closedPeerRunRefusal`, then the sender's root.
- `RemoteMessageSend`: owns the outbound remote order and the endpoint choice (linked & paired, else unlinked).
- `RemoteMessageReceiver`: owns inbound resolution; for `run_message`, the running root via `RunningAgents`.
- Each root's message delivery: its own sender lease and gate; `deliverToPeerRun` (outbound) and `acceptPeerRunMessage` (inbound, running agents only).
- `RootCommunicationEngine`: unchanged; message state and logs.
- `PeerGateway` / `PeerClient`: wire contract of the two new request kinds.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade | Governing Owner | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `list_running_agents` local tool and MCP adapter | `RunningAgentsListing` / `PeerDiscoveryChannel` | Runtime projection | Filtering or entry building |
| Roots' `deliverToPeerRun` | `RemoteMessageSend` | Sender authorization and lease, in the root's gate | Endpoint choice |
| `PeerGateway.runningAgents` / `runMessages` | `RunningAgentsListing` / `RemoteMessageReceiver` | Admission and parse | Any rule |

## Removal / Decommission Plan (Mandatory)

| Item | Why Unnecessary | Replaced By | Notes |
| --- | --- | --- | --- |
| `throw TASK_AGENT_RESOURCE_CONFLICT` in `CrossRunMessageDelivery.admit` (`:163`) | Unrelated runs are no longer refused | `unrelated` admission result + running-only delivery | `OTHER_TASK_REFUSAL` (`:44`) becomes unused → remove with its import in the router |
| R-9 branch in the router (`global-agent-run-message-router.ts:129-130`) | A member-context target is delivered through its root (DS-003) or is not running | Not-running refusal for a member-context target no live root holds | The direct post stays only for targets without a member context (unchanged) |
| Outbound pair refusal `if (!endpoint.allowsSender(...)) return endpoint.refusals.notPermitted` (`remote-message-send.ts:35`) | Any agent may message; an unpaired sender goes unlinked | DS-006 | `allowsSender` and `refusals` on endpoints: remove when no reader remains (implementation verifies; `REMOTE_ROOT_REFUSAL_TEXT.notPermitted` likewise) |
| `RemoteEndpointCore.ownershipChain` (type member and the three builders in `remote-endpoint.ts`), and the comment at `root-communication-engine.ts:152` that names it | Dead: no reader in `src/` (a search finds only the declaration, the builders and the comment; ARCH-REV-001 AR-004) | — (the Task check is `assertDeliveryAllowed` on the root's own links; the comment is corrected to say so) | The new `unlinked_run` endpoint has none |
| `TASK_AGENT_RESOURCE_CONFLICT` in the engine's `DELIVERY_REFUSAL_CODES` (`root-communication-engine.ts:27`) | No message path throws it after this change | — | Dead: verify no message path throws it (`assertDeliveryAllowed` throws only CLOSED: `standalone-agent-run-root.ts:298-300`, and Team/Org likewise) |
| Tests asserting R-9 and the CONFLICT refusal for unrelated runs | Behavior replaced | Tests of DS-003 | `global-agent-run-message-router.test.ts:276`, `cross-run-message-delivery.test.ts` cases, contract fixture rows that encode R-7 for messages (`tests/fixtures/collaboration-contract/contract-states.json`) |

## Return Or Event Spine(s) (If Applicable)

DS-005 (above). No events are added; delivered messages publish as today (the receiver's commit).

## Bounded Local / Internal Spines (If Applicable)

`CrossRunMessageDelivery.route` (parent: `CrossRunMessageDelivery`):
`target → tree.runOfAgent → (none: own-delegation TASK_NOT_FOUND check, else unrelated) → same run? null → peer run? closedPeerRunRefusal(its nodeId, target) ?? null (AR-007: CLOSED without `node` too; otherwise the sender's root links it or the router answers not running) → admit: related | reopened | unrelated | throw CLOSED → related/reopened: today's path (restore) ; unrelated: RunningAgents.rootOf → not running: null (router answers not running) → live receiver root → prepare → accept → commit`

## Off-Spine Concerns Around The Spine

| Concern | Spine | Serves | Responsibility | Why | Risk If On Main Line |
| --- | --- | --- | --- | --- | --- |
| Listing facts of a run's own file | DS-001 | `RunningAgentsListing` | `RunOwnAgentsReader.listingFactsOf(run)`: started by a person?, definition ref, start time, workspace (Agent `workspaceRootPath`; Team: the coordinator member's launch `workspaceRootPath`), a Team's coordinator | One reader of run files | Listing parsing files itself |
| Definition name and catalog address | DS-001 | `RunningAgentsListing` | From the definition services and `CatalogAddressMap` of this node | Name/address as `list_available_agents` shows | A second address rule |
| Project of a run | DS-001 | `RunningAgentsListing` | `ProjectRunService` (in-memory view of `project_runs.json`) + Project name | Tells PMs apart | — |
| Peer answer reading | DS-002 | `PeerClient` | Strict: only the entry fields; anything else = malformed (QR-002) | Privacy | — |
| Header wording | DS-004/005 | engine input builder | Existing `receivedMessageHeader` with `node` | Agent copies run ID and node | — |

## Ownership Boundaries

- Callers ask `RunningAgents`, never `ActiveCollaborationRootDirectory` + `PairedAgentAccess` together, for "running" (one fact, one owner).
- Roots are reached only through their boundaries: `ActiveRootMessageBoundary` gains `deliverToPeerRun`; the receiver's `RemoteMessageRoot` gains `acceptPeerRunMessage`. Neither `RemoteMessageReceiver` nor the router touches a root's engine.
- `remote-collaboration` keeps owning HTTP; `agent-collaboration` owns endpoints and rules (as today).

## Boundary Encapsulation Map

| Boundary | Encapsulates | Callers | Forbidden Bypass | Fix If Thin |
| --- | --- | --- | --- | --- |
| `RunningAgents` | root directory placement, per-kind statuses | CrossRun, receiver directory, listing | Reading `pairedAgentStatuses` directly for a "running" decision | Extend `RunningAgents` |
| Root `deliverToPeerRun` | `RemoteMessageSend`, engine | Router | Router calling `RemoteMessageSend` or the engine | — |
| Root `acceptPeerRunMessage` | engine, own agent liveness | `RemoteMessageReceiver` | Receiver calling the engine | — |
| `RemoteRunChannel` | `PeerClient` | `RemoteRunLinks`, router (`findPeer`), discovery | HTTP outside `remote-collaboration` | — |

## Dependency Rules

- `agent-communication` (router) → `agent-collaboration` (CrossRun, `RunningAgents`, `RemoteRunChannel` port, root boundaries). Never → `remote-collaboration`.
- `remote-collaboration` (receiver, gateway, discovery) → `agent-collaboration` ports and `RunningAgents`/`RunningAgentsListing`. Never the reverse (as today).
- `RunningAgentsListing` → `RunningAgents`, `RunOwnAgentsReader`, definition/catalog lookup, Project names. It does not import tools.
- Collaborators: all new owners are created in `compositions/collaboration-composition.ts` and passed in: `RunningAgents({ roots: input.activeRoots, statuses: (kind) => kind === "agent_org" ? orgAgents : liveAgents(kind) })`; `CrossRunMessageDelivery({ ..., runningAgents, activeReceiverRoot: (run) => input.rootResolver.resolveActive(run)?.root ?? null })` (G-2: `ActiveCollaborationRootDirectory.resolve` returns a message boundary without `acceptFromRun`. Target, added by this change (AR-008): `CollaborationRootResolver.resolveActive(root)` in `compositions/collaboration-root-resolver.ts`, beside `resolveOrRestore` (the only method at the base, `:27, :56`), returning the active root of each kind and never restoring; its standalone dependency gains `getActive`); `GlobalAgentRunMessageRouter({ crossRun, coordinators: tree, runningAgents, channel: input.remoteChannel })`; `RunningAgentsListing` likewise; the remote receiver directory gets `runningAgents` where `RemoteRootDirectory` is built (its composition).
- Process-wide lookups added: `None`. Used and unchanged: the router's existing defaults (`getActiveCollaborationRootDirectory()`, `AgentRunManager.getInstance()`), and `resolveRemoteRunChannel` (bound at composition, missing → `null` → the existing "turned off" refusal).

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity Shape | Notes |
| --- | --- | --- | --- | --- |
| `list_running_agents({node?, address?, state?})` | running runs started by a person | Discovery for messaging | peer name; catalog address; `running`/`idle` | Opt-in; same availability as `list_available_agents` |
| Result `{ agents: Entry[] }` | entry | — | Agent `{kind:"agent", name, address?, agent_run_id, workspace?, state, started_at, project?, node?}`; Team `{kind:"agent_team", name, address?, team_run_id, team_coordinator_agent_run_id, workspace?, state, started_at, project?, node?}` (`state` and `workspace` = its coordinator's) | `state`: `running` (running or initializing), `idle`, `error`; absent fields are left out (autobyteus-260 rule) |
| `send_message_to({..., node?})` | message | `node` only with `target_agent_run_id` | peer name + agent run ID | `node` with `recipient_address` → `INVALID_TOOL_ARGUMENTS` |
| `RunningAgents.rootOf(agentRunId)` | running agent | `{root, status} \| null` | agent run ID | Read-only |
| `RunningAgents.statusesOf(root)` | a live root's running agents | statuses | `RootExecutionIdentity` | Read-only |
| `ActiveCollaborationRootDirectory.liveRoots()` | live roots | identities | — | Read-only |
| `ActiveRootMessageBoundary.deliverToPeerRun({sender, nodeId, targetAgentRunId, content, messageType, referenceFiles})` | outbound message to a peer agent | authorize sender, call `RemoteMessageSend.sendToPeerRun` | node ID + agent run ID | All three roots |
| `RemoteMessageRoot.acceptPeerRunMessage({fromNodeId, fromNodeName, message})` | inbound unlinked message | target running in this root → engine | sender agent run ID on node; receiver agent run ID | All three roots; never restores |
| `RemoteMessageSend.sendToPeerRun` / `send` | outbound remote | endpoint choice + order | — | — |
| `unlinkedRunEndpoint({nodeId, agentRunId, pairedAgentRunId})` | `RemoteEndpoint` kind `unlinked_run` | transmission kind `run_message` | node ID + agent run ID | Not stored; no `ownershipChain` (removed from every kind, AR-004) |
| `RunAcceptInput.publishToViews` (`root-communication-engine.ts:70-80`, `communication/cross-run-accept-input.ts`) | whether a cross-run message enters run views | `acceptFromRun` passes the sender's run as `publishFrom` only when `true` | boolean | G-1; set by `CrossRunMessageDelivery` (related `true`, unrelated `false`) |
| `CrossRunMessageDelivery.closedPeerRunRefusal({nodeId, agentRunId})` | Task admission of a peer run | `TASK_AGENT_RESOURCE_CLOSED` refusal or `null` | node ID + agent run ID | AR-001; the same rule the linking root applies |
| `RunningAgents.teamCoordinatorOf(teamRunId)` | a team running on this node | its coordinator's run ID or `null` | team run ID | AR-006 |
| `POST /rest/remote/running-agents` | envelope only | → `{accepted:true, nodeId, agents: Entry[] without node}` | — | Peer route; signed |
| `POST /rest/remote/run-messages` | envelope + `{messageId, sender:{agentRunId}, target:{agentRunId}, content, messageType, createdAt}` | → `{accepted:true, nodeId}` or refusal | — | No `targetRoot`; peer route; signed |
| `PeerDiscoveryChannel.listRunningAgents(node)` | a peer's running runs | discovery | peer name | Same refusals as `listAvailableAgents(node)` |

## Interface Boundary Check

| Interface | Singular | Identity Explicit | Ambiguity Risk | Action |
| --- | --- | --- | --- | --- |
| `list_running_agents` | Yes | Yes | Low | — |
| `send_message_to` + `node` | Yes | Yes (node + run ID) | Low | Team run ID still refused with the coordinator's run ID, locally and from a peer (when the team runs there) |
| `/rest/remote/run-messages` vs `/rest/remote/messages` | Yes | Yes: linked (root named, may restore) vs unlinked (agent only, running only) | Low | Split by subject (P10) |
| `RunningAgents` | Yes | Yes | Low | — |

## Main Domain Subject Naming Check

| Subject | Name | Natural | Same Everywhere | Drift Risk | Action |
| --- | --- | --- | --- | --- | --- |
| The tool | `list_running_agents` | Yes | Pair of `list_available_agents` (both list agents and teams) | Low | — |
| Running | "running agent" | Yes | New in CM § 1 | Low | Add to § 1 |
| Entry IDs | `agent_run_id`, `team_run_id`, `team_coordinator_agent_run_id` | Yes | As `delegate_task`'s result names without `target_` (DEC-013) | Low | — |
| Workspace | `workspace` | Yes | The run's `workspaceRootPath` (Agent: `run_metadata.json`; Team: its coordinator's launch) | Low | — |
| Endpoint kind | `unlinked_run` | Yes | "link" = Task entry / `delegatedFrom` (CM-10) | Low | — |
| Request kind | `run-messages` / `run_message` | Yes | Beside `messages` (linked) | Medium | Doc comment states the difference |

## Existing Capability / Subsystem Reuse Check

| Need | Existing | Decision | Why |
| --- | --- | --- | --- |
| Live statuses | `PairedAgentAccess` per kind, `AgentOrgAgentStatuses` | Reuse | Root-owned truth |
| Live roots | `ActiveCollaborationRootDirectory` | Extend (`liveRoots`) | Only owner |
| Peer lookup | `RemoteRunChannel.findPeer` | Reuse | Same refusals as `delegate_task` |
| Remote listing | `PeerDiscoveryChannel`/`PeerNodeDiscovery`/`PeerClient` | Extend | Mirrors available agents |
| Remote send/accept | `RemoteMessageSend`, engine, `RemoteRunLinks.deliver` | Extend / reuse | Same order and logs |
| Run file facts | `RunOwnAgentsReader` | Extend (`listingFactsOf`) | One reader of run files |
| Project name | `ProjectRunService` + Project service | Reuse | — |
| "Is it running" | — | Create `RunningAgents` | Three consumers; no existing owner combines both facts |
| Listing | — | Create `RunningAgentsListing` | New rule |

## Subsystem / Capability-Area Allocation

| Area | Owns | Spines | Decision |
| --- | --- | --- | --- |
| `agent-collaboration/running/` | `RunningAgents`, `RunningAgentsListing`, entry type | DS-001…004 | Create |
| `agent-collaboration/communication/` | CrossRun admission | DS-003 | Extend |
| `agent-collaboration/execution/remote/` | endpoint kind, send choice, transmission union, discovery port | DS-002, DS-004, DS-006 | Extend |
| `agent-communication/` | router `node`, tool contract | DS-003, DS-004 | Extend |
| Root kinds (standalone, team, org deliveries) | `deliverToPeerRun`, `acceptPeerRunMessage` | DS-004 | Extend |
| `remote-collaboration/` | gateway routes, client methods, receiver, discovery | DS-002, DS-004 | Extend |
| `agent-tools/agent-discovery/` + MCP | the tool | DS-001, DS-002 | Extend |

## Draft File Responsibility Mapping

See Final File Responsibility Mapping (no extraction changed the draft).

## Reusable Owned Structures Check

| Structure | Shared File | Owner | Why Shared | Redundant Removed | Overlap Removed | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Running entry (`RunningAgentEntry`) | `agent-collaboration/running/running-agent-entry.ts` | `RunningAgentsListing` | Built on B, read on A, returned by the tool | Yes | Yes | A run view (no title, content, members) |

## Shared Structure / Data Model Tightness Check

| Structure | One Meaning Per Field | Redundant Removed | Overlap Risk | Action |
| --- | --- | --- | --- | --- |
| `RunningAgentEntry` (kind union) | Yes | Yes: Agent `agent_run_id`; Team `team_run_id` + `team_coordinator_agent_run_id` (the ID messages take) | Low | Union by `kind`, not optional-field soup |

## Final File Responsibility Mapping

| File | Area | Owner | Concern |
| --- | --- | --- | --- |
| `src/agent-collaboration/running/running-agents.ts` (new) | collaboration | `RunningAgents` | running agent / root / statuses |
| `src/agent-collaboration/running/running-agents-listing.ts` (new) | collaboration | `RunningAgentsListing` | listing rule, filters, entries |
| `src/agent-collaboration/running/running-agent-entry.ts` (new) | collaboration | entry type + builder | the one entry shape |
| `src/agent-collaboration/execution/services/active-collaboration-root-directory.ts` | collaboration | directory | + `liveRoots()` |
| `src/agent-collaboration/communication/cross-run-message-delivery.ts`, `cross-run-accept-input.ts` | collaboration | CrossRun | admission result; unrelated branch (`resolveActive`, `publishToViews: false`); `closedPeerRunRefusal`; removal |
| `src/compositions/collaboration-root-resolver.ts` | composition | root resolver | Modify: + `resolveActive(root)` (active root of each kind, never restores); its `standaloneRoots` dependency gains `getActive` (AR-008) |
| `src/agent-collaboration/execution/communication/root-communication-engine.ts` | collaboration | engine | `acceptFromRun` honours `publishToViews`; comment at `:152` (AR-004); `DELIVERY_REFUSAL_CODES` |
| `src/agent-communication/services/global-agent-run-message-router.ts` | communication | router | `node`; R-9 removal; not-running text |
| `src/agent-communication/services/send-message-to-tool-argument-parser.ts`, `send-message-to-tool-contract.ts`, `send-message-to-dispatcher.ts`, `src/agent-collaboration/domain/agent-team-collaboration-llm-contract.ts` | communication | tool contract | `node` field and texts |
| `src/agent-collaboration/execution/remote/remote-endpoint.ts` | remote | endpoint kinds | + `unlinked_run`; pair-refusal cleanup |
| `src/agent-collaboration/execution/remote/remote-message-send.ts` | remote | send order | `sendToPeerRun`; unpaired → unlinked |
| `src/agent-collaboration/execution/remote/remote-run-channel.ts` | remote | channel port | `RemoteMessageTransmission` union (+ `run_message`); `listRunningAgents` on `PeerDiscoveryChannel` (`peer-discovery-channel.ts`) |
| `src/agent-collaboration/execution/services/active-collaboration-root-directory.ts` (boundary type) | collaboration | boundary | + `deliverToPeerRun` |
| `src/standalone-agent-run-root/services/standalone-root-message-delivery.ts`, `domain/standalone-agent-run-root.ts` | root | standalone | `deliverToPeerRun`, `acceptPeerRunMessage` |
| `src/agent-team-execution/services/team-run-message-delivery.ts`, `domain/root-team-run.ts` | root | team | same |
| `src/agent-org-execution/services/agent-org-run-message-delivery.ts`, `domain/agent-org-run.ts` | root | org | same |
| `src/remote-collaboration/domain/remote-requests.ts` | remote-collab | contract | two paths, request/answer types |
| `src/remote-collaboration/channel/peer-gateway.ts` (+ route registration file) | remote-collab | gateway | two routes, parsers, handlers |
| `src/remote-collaboration/channel/peer-client.ts` | remote-collab | client | `deliverMessage` by kind; `runningAgents` + strict reader |
| `src/remote-collaboration/inbound/remote-message-receiver.ts` | remote-collab | receiver | `acceptRunMessage` |
| `src/remote-collaboration/discovery/peer-node-discovery.ts` | remote-collab | discovery | `listRunningAgents(node)` |
| `src/run-history/store/run-own-agents-reader.ts` | run-history | reader | + `listingFactsOf(run)` |
| `src/agent-tools/agent-discovery/list-running-agents-contract.ts`, `list-running-agents-tool.ts`, `register-agent-discovery-tools.ts` | tools | tool | new tool |
| `src/agent-tools/mcp/providers/list-running-agents-mcp-adapter-provider.ts` (+ adapter catalog, runtime exposure, Claude/Codex tooling options, journal converter) | tools | MCP projection | new tool |
| `src/compositions/collaboration-composition.ts` (+ remote composition where the receiver directory and gateway are built) | composition | root | wiring |
| Docs: `collaboration_model.md`, `agent_communication.md`, `agent_tools.md`, `remote_collaboration.md`, `projects.md`, `node_access_model.md` (route list, if it enumerates peer routes) | docs | — | the new rule and tool |

## Applied Patterns (If Any)

None beyond the existing ones (endpoint as data; one handler per request kind).

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner | Responsibility | Why Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `src/agent-collaboration/running/` | Folder (new) | collaboration | running agents and their listing | Collaboration owns runs' relations and reach; peer side reuses it | HTTP, tool parsing |

All other changes extend existing files (table above).

## Folder Boundary Check

| Path | Depth | Clear | Risk | Justification |
| --- | --- | --- | --- | --- |
| `agent-collaboration/running/` | Main-Line Domain-Control | Yes | Low | Three small files, one concern |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

**Entry forms traced (Principle 1, Case 2).** `send_message_to(target_agent_run_id = T)` from sender S:

| # | S | T | `node` | Outcome |
| --- | --- | --- | --- | --- |
| 1 | any | agent of S's own run | — | As today (same root) |
| 2 | any | agent of another local run, Task-related | — | As today (may restore, reopen; CLOSED) |
| 3 | any (standalone host, Team member, Org agent, task agent, task team member) | running agent of another local run, unrelated | — | **Delivered** (DS-003), both logs |
| 4 | any | not running, unrelated (stopped, idle-shut-down host, unstarted member) | — | Refused `TARGET_AGENT_RUN_NOT_ACTIVE` + node hint; nothing woken |
| 5 | delegator | its linked remote run | — or same node | As today (link; may wake) |
| 6 | not the delegator (e.g. its teammate) | a run S's root links | — or same node | **Delivered if running** (DS-006, unlinked) |
| 7 | any | running agent on peer P | P | **Delivered** (DS-004) |
| 8 | any | not running on P | P | Refused `REMOTE_TARGET_NOT_RUNNING` "… is not running on node P …" |
| 9 | any | anything | unknown / switch off / unreachable | Today's peer refusal texts (as `delegate_task` with `node`) |
| 10 | no collaboration root (application-owned) | any | — | As today (direct post); with `node`: refused, needs a collaboration root |
| 11 | any | a team run ID | — or P | As today: refused `TARGET_IS_TEAM_RUN` with the coordinator's run ID (on P: the same, when the team runs there; else not running) |
| 12 | any | a run whose Tasks are all closed | — | As today `TASK_AGENT_RESOURCE_CLOSED` (assigner may reopen) |
| 13 | any agent of A, in any root (not only the delegating one) | a run on P that A's tree holds, all its Task entries closed (fenced) | P, or none | `TASK_AGENT_RESOURCE_CLOSED` from `closedPeerRunRefusal`, before any send: with `node` on the router's `node` path (AR-001); without `node` in `CrossRunMessageDelivery.route`'s peer-run branch (AR-007); the linking root's own check gives the same |
| 14 | an agent on P (where the fenced run runs) or on a third node C | that fenced run, still running | — on P / P from C | Delivered (DEC-011: only the Task's node knows the closure; the run is never woken) (AR-005) |

**Unlinked endpoint (data, not a callback; avoids Case 1):**

```text
✅ RemoteMessageSend.sendToPeerRun(sender, nodeId, T):
     endpoint = links.endpointFor(T) on nodeId and paired with sender  ??  unlinkedRunEndpoint({nodeId, agentRunId: T, pairedAgentRunId: sender})
     engine.prepareRemoteSend(endpoint) → links.deliver(endpoint, msg) → engine.commitSentToRemote
❌ router → engine.sendTo(T, () => peerClient.post(...))   // a second owner deciding when transmit runs
```

**List result:**

```json
{ "agents": [
  { "kind": "agent", "name": "Project Task Manager", "address": "/project_task_manager", "agent_run_id": "project_task_manager_7c8d…",
    "workspace": "/Users/normy/autobyteus_org/autobyteus-workspace-superrepo", "state": "idle", "started_at": "2026-11-14T09:12:03Z", "project": "AutoByteus", "node": "docker-node" },
  { "kind": "agent_team", "name": "Product Team", "address": "/product_team", "team_run_id": "team_…",
    "team_coordinator_agent_run_id": "product_lead_…", "workspace": "/Users/…/product-designs", "state": "running", "started_at": "…" } ] }
```

## Design Validation Walkthrough (SR-008)

The Solution Designer walked each use case along its spine against the code, at the founder's request (2026-11-18), checking every premise the spine rests on. `Read` unless noted.

| UC / Spine | Step checked | Evidence | Result |
| --- | --- | --- | --- |
| UC-001 / DS-001 | Live roots, one place | `active-collaboration-root-directory.ts:39-152` (map of live roots; `liveRoots()` is a read of it) | Holds |
| UC-001 / DS-001 | Started by a person; start time; workspace | Agent `run_metadata.json`: `delegatedFrom`, `startedAt`, `workspaceRootPath` (PM run's keys, PRB data row); Team tree: `createdAt`, `delegatedFrom`, member launch `workspaceRootPath` optional (`run-execution-tree-shared-record-schemas.ts:69-90`, `team-run-execution-tree-schema.ts:91-93`) | Holds (`workspace?`) |
| UC-001 / DS-001 | Project name of a run | `ProjectRunService.contextOfRun(root)` → `{projectId, name}` (`projects/services/project-run-service.ts:67`) | Holds (reuse) |
| UC-001 / DS-001 | Catalog address and name | `CollaboratorCandidatePolicy.catalogAddressMap(port)` (`collaborator-candidate-policy.ts:106-108`) with `NodeCatalogPort`, as `RemoteCatalogLister` uses it; names from the same catalog view (`:125-131`) | Holds |
| UC-001 / DS-001 | State | Per-kind `pairedAgentStatuses` (`standalone-paired-agent-access.ts:95-100`; Team; `AgentOrgAgentStatuses`) | Holds |
| UC-002 / DS-002 | Peer route protected without listing it | Every `/rest/remote` path is peer-only (`api/security/node-route-permissions.ts:86`), signed (NA-9); gateway admits first (`peer-gateway.ts:200-296`) | Holds |
| UC-002 / DS-002 | Discovery shape | `PeerDiscoveryChannel` → `PeerNodeDiscovery` → `PeerClient` strict reader, as available agents (`remote_collaboration.md` § Discovery) | Holds |
| UC-003 / DS-003 | Sender and receiver steps on every root kind | `prepareSendToRun`/`commitSentToRun`: standalone `:232-233`, Team `root-team-run.ts:308-309`, Org `agent-org-run.ts:195-196`; `acceptFromRun` on all three (grep) | Holds |
| UC-003 / DS-003 | Receiver root without restore | At the base the resolver has only `resolveOrRestore` (`collaboration-root-resolver.ts:27, 56`; 77 lines) | **G-2**: the spec named `ActiveCollaborationRootDirectory.resolve`, whose boundary type has no `acceptFromRun`. Target: a new `resolveActive` on the resolver (AR-008: first written here as existing code, read from the implementation's uncommitted diff) |
| UC-003 / DS-003 | Logs | Unknown counterpart → `OTHER_RUN_LOG` (standalone `:134`, Team `root-team-run.ts:131`, Org `agent-org-run.ts:109`); both logs, one ID (engine `:261-295`) | Holds |
| UC-003 / DS-003 | Sender address in the header for a run outside any Task | `reachingAddressOf` → `stepTwo()` is `null` with no entries (`collaboration-tree.ts:148-149, 196-199`) → header names the run ID only | Holds |
| UC-003 / DS-003 | Run views | Live feed publishes to both runs' views (`run-messages-feed.ts:26-43`, `chainOf` = `[run]` for a run outside the tree, `delegation-index.ts:206-215`); stored Team-tab read drops it (`collaboration-participant-messages.ts:81-88`, `public-message-scope.ts:10-13`) | **G-1**: live and stored disagree; fixed: not in run views (Change Scope) |
| UC-003 / DS-003 | Today's refusal turns into delivery | PRB-002 target is a tree node (it delegated), so `admit` throws CONFLICT at `:163` today; with `unrelated` it reaches `RunningAgents.rootOf` | Holds (Reproduced today's refusal) |
| UC-004 / DS-004 | Engine accepts an endpoint not in the root's links | `prepareRemoteSend` / `acceptFromRemote` take any endpoint (`root-communication-engine.ts:154-228`); sender check is `senderAgentRunId === endpoint.reference.agentRunId` (`:216`) | Holds |
| UC-004 / DS-004 | Not in run views | `acceptFromRemote` and `commitSentToRemote` publish nothing (`:194, :226`); the stored read drops a remote counterpart (`collaboration-participant-messages.ts:82-88`) | Holds |
| UC-004 / DS-004 | Header for the reply | `receivedMessageHeader` names the sender's node by this node's label for it (`received-message-header.ts:6-11`; `fromNodeName` = `from.name`, `remote-message-receiver.ts:96`) = the `node` value `findPeer` takes on that node | Holds |
| UC-004 / DS-004, rows 13-14 | Closed Task with and without `node` | `closedPeerRunRefusal` on both paths (AR-001, AR-007) | Holds (ARCH-REV-003) |
| All | Two-node behaviour live | — | Not run here (no second node); the two-server E2E in the build (UNK-001) |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why Considered | Decision | Clean-Cut Replacement |
| --- | --- | --- | --- |
| Keep CONFLICT for old tests/fixtures | Many tests encode it | Rejected | Tests rewritten to the new rule |
| Accept `run_message` on `/rest/remote/messages` with optional `targetRoot` | One route | Rejected | Separate path (different subject) |
| Version check for peers without the new routes | Mixed releases | N/A (DESIGN.md rule 9): an older peer answers 404 → read as unreachable | — |

## Change / Refactor Sequence

1. `RunningAgents` + `liveRoots()`; unit tests.
2. Local rule: `CrossRunMessageDelivery` admission result and unrelated branch; router R-9 removal and not-running text; tests (turn PRB-002 green as a server test).
3. Remote contract: transmission union, `unlinked_run` endpoint, `RemoteMessageSend.sendToPeerRun` and unpaired branch; roots' `deliverToPeerRun` / `acceptPeerRunMessage`; `remote-requests.ts`, gateway route, client, receiver; router `node` and tool contract.
4. Listing: `RunOwnAgentsReader.listingFactsOf`, `RunningAgentsListing`, peer route and client reader, discovery; the tool on all runtimes.
5. Removals (table), docs (collaboration model CM-13 and § 1 terms, modules), wording.
6. Two-server E2E extended (`tests/e2e/remote-collaboration/`): AC-004, AC-006, AC-008 remote part (rows 13 and 14: a sender in another root of A, with `node` and without `node`, to A's fenced run on B is refused CLOSED; an agent on B reaches it while it runs), QR-003. Server unit tests: `closedPeerRunRefusal`; `RunningAgents.rootOf` for a root that only links the run ID (not running); `teamCoordinatorOf` for a team a root of this node delegated elsewhere (`null`).

## Key Tradeoffs

- **Separate unlinked path vs. generalizing links:** links keep owning Task-related cross-node behaviour (wake, fence, run views); the unlinked path is small and live-only. Generalizing links to every message would mix Task rules into contact messages.
- **`node` on `send_message_to` vs. auto-routing known remote run IDs:** explicit and stateless (the founder's own framing); links still route without `node`.
- **Running = live agent status, not root registration:** matches what an agent can answer now; avoids waking idle-shut-down hosts.

## Risks

- Inbound messages from any agent of a paired node to running agents: accepted by the founder (DEC-001/002); mitigated by peer signing and pairing (NA-9), no wake (REQ-010), no attachments across nodes.
- Race: an agent stops between the running check and the reservation; the reservation path may then restore it. Not a supported scenario (P6); the in-gate re-check in `acceptPeerRunMessage`/receiver resolution keeps the window small.
- Many test fixtures encode the old rule (contract-states.json): implementation must rewrite them deliberately, not loosen assertions.

## Guidance For Implementation

- Reproduction to start from: PRB-002 as a server test — two user-started standalone roots on one node; `send_message_to` from one to the other must be delivered and logged in both runs (it is refused `TASK_AGENT_RESOURCE_CONFLICT` today).
- Keep agent-facing texts in the wording authority (`agent-team-collaboration-llm-contract.ts`, `domain/remote-refusals.ts`); refusal codes in `remote-refusal-codes.ts`.
- The tool description of `list_running_agents` says: for messages only (start work with `delegate_task`); message an Agent by `agent_run_id`, a Team by `team_coordinator_agent_run_id` (as with `delegate_task`'s result); `workspace` tells which project folder a run works in; on another node pass `node` to `send_message_to`; stopped runs are not listed and are not woken.
