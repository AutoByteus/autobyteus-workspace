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
autobyteus-261 discovery. Attachments, lifecycle control from the delegating node and peer authentication come
in later slices.

## Settings (per node)

| What | Where | Owner |
| --- | --- | --- |
| The switch, off by default | `ENABLE_REMOTE_COLLABORATION` in `<data>/.env` | `RemoteCollaborationCapability` |
| Peer nodes `{nodeId, name, baseUrl, addedAt}` | `<data>/remote-collaboration/peers.json` | `PeerDirectory` |

- Adding a peer contacts `GET <baseUrl>/rest/remote-access/status` and pins the `serverInstanceId` as the
  peer's `nodeId`; it needs the switch on. `name` is this owner's label, the `node` agents pass.
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
  `renamePeerNode`, `removePeerNode`. The web's Nodes → Remote Collaboration tab uses them and says which
  Agents and Agent Teams peers can start and how they run.

## Between nodes

Four requests, `POST /rest/remote/delegated-runs`, `/rest/remote/messages`, `/rest/remote/availability` and
`/rest/remote/available-agents` (route class `REMOTE_PEER`; a mobile credential is refused). Every request
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
  managers' public resolve / restore APIs), one rule for both directions. A work packet is for a root a peer
  started (`agent` or `agent_team`); a message for any root kind. Before an inactive root is restored, the
  directory checks the request against the root's **stored** links (`storedLinkCheck`: the root managers read
  their own stores, `remote-collaboration` parses no root files): a sender not linked from that node is
  `REMOTE_TARGET_NOT_PERMITTED` and nothing is loaded. The restored root's own link check stays the authority.

The refusal codes are one list next to the port (`agent-collaboration/execution/remote/remote-refusal-codes.ts`);
the agent-facing texts are in `domain/remote-refusals.ts`.

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
  `delegate_task` (switch off, no peer by that name), then its *available agents*; the peer's refusal gives the
  reason for an unavailable node.
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
  through its coordinator, as for a local Team copy); `RemoteTaskActivation` then commits the link (a
  `taskExecutions` entry with `nodeId` in the topmost coordinating tree: `agentRunId`, or `teamRunId` with
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
  no more messages; it stops there when it goes idle." It keeps running on its node until idle (stopping it
  from the delegating node is S3).
