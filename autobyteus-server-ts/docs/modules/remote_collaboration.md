# Remote Collaboration

## Scope

The rules are defined in the [Collaboration Model](../design/collaboration_model.md) (CM-10 … CM-12, § 4);
this document describes the mechanics.

`src/remote-collaboration/` lets an agent on one node delegate a text task to any shared Agent or shared Agent
Team of another node, and lets the delegator and the remote run (every member of a remote Team) message each
other by run ID. With the discovery tools, an agent also finds the peers and what each offers (autobyteus-261).
It owns the node-level concerns: the switch, the registered peer nodes, the outbound client, the inbound
gateway, the catalog port through which peers' targets are resolved, and this node's discovery of its peers.
The collaboration roots own the runs and their messages; they reach other nodes through the shared owners in
`src/agent-collaboration/execution/remote/`: `RemoteRunLinks` (membership and transmit), `RemoteMessageSend`
(the outbound message order) and `RemoteDelegation` (remote delegation).

Slice 1 (autobyteus-191) is text only, for Agents, on a trusted private network: there is no
authentication between nodes and no credential ever crosses them. autobyteus-245 removed publishing: with the
switch on, every shared Agent is available to registered peers. autobyteus-247 added shared Agent Teams,
autobyteus-261 discovery. autobyteus-278 shows remote runs in the delegator's run tree and lets the owner drive
them (see [Remote runs in the run tree](#remote-runs-in-the-run-tree)). Attachments, a remote run's files, stop
on Task closure and peer authentication come in later slices.

## Settings (per node)

| What | Where | Owner |
| --- | --- | --- |
| The switch, off by default | `ENABLE_REMOTE_COLLABORATION` in `<data>/.env` | `RemoteCollaborationCapability` |
| Peer nodes `{nodeId, name, baseUrl, addedAt}` | `<data>/remote-collaboration/peers.json` | `PeerDirectory` |

- Adding a peer names the node it means (`{nodeId, name, baseUrl}`), contacts `GET <baseUrl>/rest/remote-access/status`
  and pins that node ID as the peer's `nodeId`; a different node there is `PEER_IDENTITY_MISMATCH`. It
  needs the switch on. `name` is this owner's label, the `node` agents pass. Changing a peer's address
  (`changePeerAddress`) checks the pinned node answers at the new one.
- **Which address this node uses for a node** (one-nodes-tab, `settings/peer-address-resolver.ts`,
  `PeerAddressResolver`): a node's address depends on who calls (the desktop reaches a Docker node at
  `localhost:8001`; the Docker node reaches the desktop only at `host.docker.internal:29695`). `resolvePeerAddress(nodeId,
  baseUrls)` asks every given address at once, each within the 20 s bound, and returns the first one, in order, that
  answers with the expected node ID, as soon as every address before it has settled. It is read-only and, like adding,
  needs the switch on: a node whose switch is off asks no other node. When none matches it refuses `PEER_UNREACHABLE`
  with every attempt's outcome (`refused`, `timeout`, `not_found`, `unreachable`, `not_autobyteus`, `different_node`)
  and `loopbackInContainer` when the first address was loopback and this server runs in a container
  (`server-addressing/runs-in-container.ts`, `/.dockerenv`). `peerAddressCandidates` lists this node's own addresses
  (`ServerAddressCandidateService`), which the other side tries after the address the window uses.
- Settings errors carry `extensions: {code, reason?, address?, loopbackInContainer?, attempts?}`; `reason` is the
  transport cause `channel/transport-failure-reason.ts` classifies from Node's `fetch` error. The texts agents read
  are unchanged.
- There is nothing to publish. Peers can start every definition that a local `delegate_task` may target
  as a catalog copy, at the same catalog address: shared Agents and shared Agent Teams, never built-ins,
  Agent Orgs, team-local or application-owned definitions.
- How a remote run runs is decided in one place, `NodeCatalogPort`
  (`agent-collaboration/collaborators/node-catalog-port.ts`): each agent's own default runtime, model and
  model settings, and for a Team member without one the Team's default (no inherited layer; see
  [Agent Communication](agent_communication.md), launch layers), this node's temp workspace
  (`AUTOBYTEUS_TEMP_WORKSPACE_DIR`, default `<data>/temp_workspace`) and tool auto-approve on for every agent
  of the run (every member of a remote Team). An Agent whose default runtime signs in with this node's local login (Codex, Claude) runs
  with that login for any registered peer, as CM-12 says ("a remote run uses its own node's credentials").
  A leftover `published-agents.json` from a development build is neither read nor written.
- GraphQL: `remoteCollaborationCapability` / `setRemoteCollaborationEnabled`, `peerNodes`, `addPeerNode`,
  `renamePeerNode`, `changePeerAddress`, `removePeerNode`, `peerNodeOffer(nodeId)` (autobyteus-267),
  `peerNodeAvailability(nodeId)`, `peerAddressCandidates` and `resolvePeerAddress(nodeId, baseUrls)` (one-nodes-tab).
  The web's Nodes → Manage Nodes tab uses them on this node and, from the window, on the other node of a row: one
  list of nodes, and turning collaboration on or off for a node registers or removes both sides after one
  confirmation (the other node decides through its own settings API; no node writes another node's peers).
- `peerNodeOffer(nodeId)` answers `{entries: [{name, kind, description}]}` (no address; `description` null when
  absent) or `{refusalCode, unreachableReason}`, exactly one of the two kinds, through `RemoteNodeDiscovery.listAvailableAgentsOf(nodeId)`:
  the same path as `list_available_agents` with `node`. The window never asks a peer for its offer (only this
  node's server does); the page words the
  refusal code itself. It takes at most about 20 s (the peer request bound). `peerNodeAvailability(nodeId)` answers
  `{available, refusalCode, unreachableReason}` through `RemoteNodeDiscovery.checkAvailabilityOf(nodeId)`, the
  availability question `list_available_nodes` asks, for one peer.

## Between nodes

Four requests, `POST /rest/remote/delegated-runs`, `/rest/remote/messages`, `/rest/remote/availability` and
`/rest/remote/available-agents`, plus the run-view routes of autobyteus-278 (`/rest/remote/run-summaries`,
`/agent-projection`, `/owner-commands` and the WebSocket `/rest/remote/run-observations`, described
[below](#remote-runs-in-the-run-tree)) (route class `REMOTE_PEER`; a mobile credential is refused). Every request
carries `{fromNodeId, toNodeId}`; every answer carries the responder's `nodeId`. A domain refusal is `200
{accepted: false, code, message, target?: {kind: "agent" | "agent_team", name}}` (`message` is the responder's
detail; `target` the target definition there, for `NO_DEFAULT_RUNTIME` and `AGENT_CANNOT_RUN`, so the delegating
node words it as an Agent or an Agent Team), a malformed body `400`. A delegated-run request names its target by `address`, its catalog address on the
called node; its answer is `{accepted: true, nodeId, kind: "agent", agentRunId}` or `{accepted: true, nodeId,
kind: "agent_team", teamRunId, coordinatorAddress, members: [{address, agentRunId}]}` (the member addresses
as the delegating node addresses them, under the catalog address). Every message and work packet carries
`targetRoot: {kind: "agent" | "agent_team" | "agent_org", runId}`, the root that receives it on the called
node: towards a remote run, that run's root; back towards the delegator, the coordinating run its
`delegatedFrom` names. The two discovery requests carry the envelope only: *availability* is answered
`{accepted: true, nodeId}`, *available agents* `{accepted: true, nodeId, agents: [{name, kind, address,
description?}]}`. There is no version field and no request ID; nothing retries. A node without a route (an older
build) answers 404, which the caller reads as unreachable (DESIGN.md rule 9).

- **`PeerClient`** (`channel/peer-client.ts`, implements `RemoteRunChannel`): applies this node's switch
  and the registration, sends with a 20 s bound (QR-102), refuses an answer from a server that is not the
  pinned peer, and words every refusal for the agent with the peer's name. It reads a peer's list strictly:
  each entry has exactly `name`, `kind`, `address` and, optionally, `description`; anything else (for example
  a `members` field) makes the answer malformed, read as unreachable "it answered without its list".
- **`PeerGateway`** (`channel/peer-gateway.ts`): the one entry point (REQ-114; S6 adds authentication
  here). Order: `toNodeId` is this node, the switch is on, `fromNodeId` is a registered peer, then the
  handler of the request kind. *Availability* has no handler: passing the admission is the answer.
- **`RemoteCatalogLister`** (`inbound/remote-catalog-lister.ts`): the *available agents* answer,
  `CollaboratorCandidatePolicy.listEligible(NodeCatalogPort)` through the one entry builder. It is the same
  policy and port a delegation from a peer resolves its address with, so the list is exactly what a delegation
  accepts, at the addresses it accepts. Nothing is created or written.
- **`RemoteDelegationReceiver`**: resolves the address exactly as a local catalog copy is resolved, through
  `CollaboratorAdmission` with `NodeCatalogPort` (`catalogDefinitionAt`, then `catalogTaskSourceOf`):
  nothing there → `AGENT_NOT_FOUND`; an agent covered by no default runtime and model →
  `NO_DEFAULT_RUNTIME` ("… the target agent <name>" or "… the target agent team <name>"); a default that
  can't run here (runtime unavailable, model unavailable, settings invalid) → `AGENT_CANNOT_RUN` with the
  reason. Every refusal comes before a run is created.
  - An Agent: a **prepared** standalone run with the resolved launch and `delegatedFrom`; its ID is
    returned. A prepared run that never receives its work packet expires (prepared-run TTL).
  - An Agent Team: **`RemoteTeamRunStarter`** (`inbound/remote-team-run-starter.ts`), the one owner of
    mapping a resolved Team source to `TeamRunService.createTeamRun`: the Team default as the Team's launch,
    each member's resolved launch, and `delegatedFrom` onto the Team tree. The Team run is created, not
    started: its members start on input. `createTeamRun` plans the layout again from the definition; a
    definition edited in between (a member added, removed or of another Agent, or another coordinator) is
    `AGENT_CANNOT_RUN` "the Agent Team changed while it was being started", and a Team run already created
    is terminated first.
- **`RemoteMessageReceiver`**: resolves `targetRoot` by kind through `RemoteRootDirectory` (the root
  managers' public resolve / restore APIs), one rule for both directions. Once a root accepts a work packet, the
  packet's content (the task description) becomes the run's history title through `RemoteRunTitles` (the run
  service of the root's kind; the first non-empty title wins; a failure is logged and the packet stays accepted;
  autobyteus-269). A work packet is for a root a peer
  started (`agent` or `agent_team`); a message for any root kind. Before an inactive root is restored, the
  directory checks the request against the root's **stored** links (`storedLinkCheck`: the root managers read
  their own stores, `remote-collaboration` parses no root files): a sender not linked from that node is
  `REMOTE_TARGET_NOT_PERMITTED` and nothing is loaded. The restored root's own link check stays the authority.

The refusal codes are one list next to the port (`agent-collaboration/execution/remote/remote-refusal-codes.ts`);
the agent-facing texts are in `domain/remote-refusals.ts`.

While this node's identity waits for its data migration (autobyteus-290, capability `node_identity`), nothing is sent
or admitted: the gateway answers HTTP 503 `NODE_IDENTITY_NOT_MIGRATED` (with no `nodeId`), the client refuses with the
same code ("This node's identity is waiting for its data migration, so nothing was sent to another node."), and
adding a peer or resolving an address is refused with it as a settings error. A peer that answers 503 with the code is
named as waiting for its data migration (a refusal, a probe's settings error, an address attempt `identity_pending`),
not as unreachable or "not an AutoByteus node".

## Discovery

autobyteus-261. An agent with the opt-in tools (see [Agent Tools](agent_tools.md)) finds its node's peers and what
each offers, then delegates with `delegate_task` without being told an address.

- **`RemoteDiscoveryChannel`** (`agent-collaboration/execution/remote/remote-discovery-channel.ts`): the port the
  tools use, owned by `agent-collaboration`, implemented by **`RemoteNodeDiscovery`**
  (`discovery/remote-node-discovery.ts`) and bound at composition, as `RemoteRunChannel` is. The listing does not
  go through the roots: a peer's offer does not depend on the asking run.
- `listNodes()` (`list_available_nodes`): with the switch on, the registered peers in registration order, all
  asked for *availability* at the same time, each within the 20 s bound, so the whole call takes at most about
  20 s. An accepted answer is `available`; anything else (switch off there, this node not registered there, the
  wrong node, an HTTP error, a transport failure, a timeout) is `unavailable`.
- `listAvailableAgents(node)` (`list_available_agents` with `node`): the peer by name, with the same refusals as
  `delegate_task` (switch off, no peer by that name), then `listAvailableAgentsOf(nodeId)`, the peer's
  *available agents* by node ID, which the Nodes page also uses; the peer's refusal gives the reason for an
  unavailable node.
- Nothing is stored or cached; every call asks the peers now. A listing creates no run, writes nothing on
  either node and is not a message.
- A peer reveals only the name, kind, address and description of each entry: never definitions, prompts,
  settings, members or launch settings. Identity is claimed, not proven, until S6: a listing is answered to any
  registered peer, the same rule as a delegation.

## In the roots

- **Delegating node.** `delegate_task({node, recipient_address, description})`: `RemoteDelegation` resolves a
  `remote_agent` placement (refusing `task_id` and `reference_files` first), and the unchanged
  `RootTaskExecutionLifecycle` runs it. Each root's task adapter hands the remote placement's planning and
  activation to `RemoteDelegation`, the one caller of `startDelegatedRun`: planning asks the peer to create
  the run, so the peer's run ID is known before the Task link (for a Team, the Task's run is the Team, entered
  through its coordinator, as for a local Team copy); `RemoteTaskActivation` then commits the link (an entry
  with `nodeId` in the topmost coordinating root's `remoteTaskExecutions`: `agentRunId`, or `teamRunId` with
  `coordinatorAddress` and `members`) and sends the work packet to the Agent run or the Team's coordinator. A
  refusal by the peer leaves nothing on this node. The result is the local copy's shape plus `node`.
- **Receiving node, an Agent.** The run is an ordinary standalone run; `run_metadata.json` carries
  `delegatedFrom` `{nodeId, coordinatingRun, delegatorAgentRunId}`. Its root admits the work packet (link
  check, host made ready, system task notification naming the node), knows the delegator as its back-link
  endpoint, creates its `collaboration/` package with the first message, and shuts the host down after the
  idle grace period (`StandaloneHostIdleShutdown`); the next message restores it.
- **Receiving node, an Agent Team.** The run is an ordinary top-level Team run (history, open, watch, stop);
  its `team_run_execution_tree.json` carries the same `delegatedFrom`. Its root pairs the delegator with every
  member, admits the work packet for the coordinator (link check, then the coordinator's input with the
  system task notification naming the node, which starts it), and has a quiet idle shutdown
  (`RemoteTeamIdleShutdown`, see [Agent Team Execution](agent_team_execution.md)); the next message restores
  it.
- **Endpoints.** `RemoteRunLinks` holds a root's remote endpoints, of three kinds (`remote-endpoint.ts`).
  Each endpoint has one representation of the pair rule, `pairedAgentRunIds` (the local agents it pairs
  with), from which `allowsSender` / `allowsTarget` derive:
  - `delegated_run` on the delegating node (an Agent link; only its delegator messages it; it belongs to the
    Task the link was recorded under; its messages name the run's root);
  - `delegated_team` on the delegating node (one per member of a Team link, the coordinator included; only
    the delegator messages them; they belong to the Team's Task, `[{teamRunId}]`; their messages name the Team
    run);
  - `delegator` on the node that runs the delegated run (built from `delegatedFrom`; it pairs with the host
    of a standalone root, or every member of a Team root; no Task there; its messages name the coordinating
    run).

  `RemoteRunLinks` itself has membership (`endpointFor`, `inboundEndpoint`, `has`, `teamLinkFor`), the link
  checks (`admitsWorkPacket`, `admitsInbound`, also used against stored links before a restore) and
  `deliver` (the channel only).
- **Messages.** A root's `hasAgentExecution` answers for its remote endpoints too, so `send_message_to`
  by run ID reaches the root. The root's delivery only routes: a remote endpoint goes to the root's
  `RemoteMessageSend`, which runs the endpoint's pair rule → `RootCommunicationEngine.prepareRemoteSend` (the
  checks and the message ID, no state change) → `RemoteRunLinks.deliver` → `commitSentToRemote` (the
  sender's log), so nothing is written unless the peer accepted. Inbound, the root's `acceptRemoteMessage`
  runs the shared link check (`inboundEndpoint`), its own wake, then `engine.acceptFromRemote` (the
  receiver's log). The sender's node assigns the message ID; each node writes only its own run's log line
  (CM-9). Headers and results name the other run's node.
- **Saved Task.** `delegate_task` with `task_id` naming a remote run or a remote Team (its team run ID) is
  refused once, in `RootTaskExecutionLifecycle.assignToExistingCopy` (through its `RemoteEndpointLookup`:
  `isRemoteEndpoint` / `isRemoteTeam`), before any Task change. A message to a remote team run ID gets the
  usual guidance to use the coordinator's run ID (`teamCoordinatorOf`, answered from `teamLinkFor`).
- **Remote links in memory.** The stores load entries with `nodeId` into the tree's own
  `remoteTaskExecutions` (absent when none), never into `taskExecutions`, so every walker of local copies
  (index, Stop, launch selections, run tree, idle shutdown, Task closure release) excludes them. Run-ID
  membership, the stored message view and Task ownership include them through `RemoteRunLinks`. Messages
  with a remote endpoint are kept out of the public run views: the root never publishes them to its view
  stream (`publishToRootView`, so the stream's change sequence has no gap), and the view snapshots filter
  them out. The local agent's own stream and the message logs show them.
- **Package admission.** The Team and Org package validators (`validateTeamRunStatePackage`,
  `validateAgentOrgStatePackage`), which the history scan, restore and the migrations run, check each stored
  message against the same endpoint set the store composes (`agentRunIdsOfTree`: the tree's agents, its
  remote runs with every member of a remote Team, and the delegator of the tree's own back-link). A message is admitted when both endpoints are in that set, the two differ, and at least one
  is an agent of the tree; the execution index stays local-only. A Team or Org whose delegator exchanged
  messages with a remote run therefore still loads, restores and reopens after a restart.
- **Task closure** fences a remote run or a remote Team: the closed Task refuses its messages both ways, no
  release is invoked, and the result is `fenced_remote` with the text "… runs on node "X". This Task sends it
  no more messages; it stops there when it goes idle." It keeps running on its node until idle; Task closure
  does not stop it (the owner can, from the run tree, since autobyteus-278).

## Remote runs in the run tree

autobyteus-278 (CM-11, collaboration model § 4). The delegating node (A) shows each remote run as a child of the
delegator's root, as it shows a local copy, and its owner talks to it, interrupts and stops it. The node that runs
it (B) serves only the peer whose delegation started the run, and only about the run's **paired agents**: an Agent
run's host, or a Team run's members.

- **Requests.** All four go through `PeerGateway` admission (`toNodeId`, switch, registered peer) and then
  `RemoteRunViewProvider`'s link check. They are:
  - `POST /rest/remote/run-summaries` `{runs: [{kind, runId}]}` → `{runs: [{kind, runId, title, statuses:
    [{agentRunId, status}]}]}`. One request per node covers every run A asks about there. A run B's delegation
    from A did not start is left out of the answer. `statuses` lists only the live paired agents; one not listed
    is offline. A summary never restores a run.
  - `POST /rest/remote/agent-projection` `{targetRoot, agentRunId}` → `{projection: {agentRunId, conversation,
    activities, summary, lastActivityAt, hasEarlierActiveTraceEvents}}`, read from B's stored projection services.
  - `POST /rest/remote/owner-commands` `{targetRoot, agentRunId, command}`. The command is one of:
    - `post_message {content, messageId, dedupeKey}`, a user message to the paired agent. Its content is the
      owner's text under the heading `From the owner of node "<B's name for A>":` and a blank line (DS-004a,
      `remoteOwnerUserMessage`, the heading's one owner). The agent, B's stored conversation and both nodes'
      windows read the mark there. `messageId` and `dedupeKey` pass through unchanged, so A's window replaces its
      echo with the streamed message. The message makes the agent ready, restoring it after idle shutdown, as any
      input does;
    - `interrupt`;
    - `terminate`, which stops the whole run (an Agent root's Stop, a Team's terminate) and keeps its history.
  - WebSocket `GET /rest/remote/run-observations`. A's first frame is the envelope with `targetRoot`. B's first
    frame is `{nodeId}` (or a refusal, then close). After it come `{agentRunId, message}` frames, one presentation
    message of one paired agent each. A frame the run produces while it is being subscribed (a live run's current
    state) waits in the route and follows `{nodeId}`.
    - An Agent run is followed from host to host across idle shutdown (`StandaloneAgentRunRoot.onHostReady`).
    - A Team run is followed through its root publisher, filtered to its members, and across a restore after idle
      shutdown (the manager's lifecycle notifications).
    - B ends the stream when the run is stopped, terminated or deleted by any path: B's own window, GraphQL,
      history delete or archive, or `owner-commands`. The standalone manager reports the end after the host stopped
      (`onRunEnded`); the Team lifecycle snapshot carries `ending: "stopped"`. Idle shutdown does not end it
      (`ending: "idle_shutdown"`, or only the host is replaced). A then reads the final summary (AR-403).
- **B's owner.** `RemoteRunViewProvider` (`inbound/remote-run-view-provider.ts`) first checks the run's stored
  back-link: `RemoteRootDirectory.storedLinkCheck` with the query kind `owner` (`{fromNodeId, targetAgentRunId}`),
  which admits the node in `delegatedFrom.nodeId` and, when an agent is named, only a paired agent. It then calls
  the root kind's `PairedAgentAccess` behind `RemoteRootDirectory.pairedAgents(kind)`:
  - `StandalonePairedAgentAccess` on `StandaloneAgentRunRootManager`;
  - `TeamPairedAgentAccess` on `TeamRunService`.

  Titles come from the run services' `readRunTitle`, and projections from the agent and Team-member projection
  services. A refusal is `REMOTE_TARGET_NOT_PERMITTED` or `REMOTE_TARGET_NOT_FOUND`.
- **A's client.** `PeerClient.runSummaries` / `agentProjection` / `ownerCommand` read their answers strictly
  (`channel/peer-run-view-answers.ts`). `openPeerRunObservation` (`channel/peer-run-observation-client.ts`, the
  global Node `WebSocket`) requires the first frame to be `{nodeId}` equal to the pinned peer. A refusal, any
  other first frame, a timeout or a close ends the observation once (`onEnd`); A's own `close()` ends it
  silently.
- **A's owner.** Each root (standalone, Team, Org) owns one `RemoteRunObservation`
  (`agent-collaboration/execution/remote/remote-run-observation.ts`) over its `remoteTaskExecutions`:
  - The root's view streams count viewers (`viewerAttached` / `viewerDetached`). Each new viewer gets a summary
    fetch (one request per node). The first viewer opens one observation per link; the last viewer to leave
    closes them.
  - An observation that ends without A closing it gets one summary fetch. There is no reconnect.
  - `refresh()` (the client's `REFRESH_REMOTE_TASK_EXECUTIONS`, Retry in the window) fetches the summaries again
    and reopens the ended observations.
  - A newly committed remote link (`onRemoteLinkCommitted` from the task adapters) publishes
    `remote_task_execution_started` with the node's name, and is observed when the root is being viewed.
  - The root events are `RemoteRunRootEvent`s: `remote_task_execution_started`, `remote_task_execution_summary`
    and `remote_agent_presentation`. They are published to the root's view stream only. Only the stream DTO
    projectors map `remote_agent_presentation` to `agent_presentation`; the Team stream wraps them as source
    `REMOTE`.
- **Views and commands on A.** The root views carry `remote_task_executions` (the links, with the node's name): the
  stream snapshots, `agentRunCollaboration`, the Org inspection and the Team's `getTeamRunResumeConfig`, so a root
  without a live stream still lists them.
  The member-projection resolvers (`remoteChildOf`) answer a remote agent's conversation through
  `agentProjection`. The root's agent commands go to `executeRemoteChildCommand` first. Stop of a remote child
  goes to `stopRemoteChild`, which terminates a Team through its coordinator. Remote commands run outside the
  root's operation gate, because a peer call can take up to 20 s.
- **Phase 1 limits.** Neither node reconnects a stream or pushes a change. A root without a live stream (a
  stopped delegator) lists its remote runs without a title or status: summaries come only over the root's stream.
  A remote run's files are not read.
