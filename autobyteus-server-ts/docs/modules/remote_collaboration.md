# Remote Collaboration

## Scope

The rules are defined in the [Collaboration Model](../design/collaboration_model.md) (CM-10 … CM-12, § 4);
this document describes the mechanics.

Vocabulary ([Glossary](../../../GLOSSARY.md#nodes)): a *node* is one server with its node ID (`nodeId`, `srv_…`);
*remote* says where a node is; a *peer* is a node paired with this node: each holds the other's public node key
(`PeerNode`, `peers.json`, `list_peer_nodes`). In this module `nodeId` always means a node's ID, and a request's network address is its
*client address*, never a peer.

`src/remote-collaboration/` lets an agent on one node delegate a text task to any shared Agent or shared Agent
Team of another node, and lets the delegator and the remote run (every member of a remote Team) message each
other by run ID. With the discovery tools, an agent also finds the peers and what each offers (autobyteus-261).
It owns the node-level concerns: pairing and the node key, the peer nodes, the outbound client, the inbound
gateway, the catalog port through which peers' targets are resolved, and this node's discovery of its peers.
The collaboration roots own the runs and their messages; they reach other nodes through the shared owners in
`src/agent-collaboration/execution/remote/`: `RemoteRunLinks` (membership and transmit), `RemoteMessageSend`
(the outbound message order) and `RemoteDelegation` (remote delegation).

Slice 1 (autobyteus-191) is text only, for Agents, on a trusted private network. autobyteus-437 signed every request
between nodes; autobyteus-661 signs it with each node's own key and removed the switch: a node collaborates exactly with
the nodes it is paired with. autobyteus-245 removed publishing: every shared Agent is available to peers. autobyteus-247 added shared Agent Teams,
autobyteus-261 discovery. autobyteus-278 shows remote runs in the delegator's run tree and lets the owner drive
them (see [Remote runs in the run tree](#remote-runs-in-the-run-tree)). autobyteus-492 lets any agent list the
running agents of a peer and message one by its run ID, linked or not (see
[Messages by run ID and running agents](#messages-by-run-id-and-running-agents)). autobyteus-587 sends `reference_files`
with a cross-node message or delegation as copies, and makes every cross-node send name its node (see
[Reference files between nodes](#reference-files-between-nodes)). A remote run's files and stop on Task closure come in
later slices.

## Settings (per node)

| What | Where | Owner |
| --- | --- | --- |
| This node's key (Ed25519, PKCS#8, created on first use) | `<data>/remote-collaboration/node-key.pem` (0600) | `NodeKey` (`pairing/node-key.ts`) |
| Peers `{nodeId, name, publicKey, address, machine, account, relation, sandbox?, addedAt}` | `<data>/remote-collaboration/peers.json` (0600) | `PeerDirectory` (written only for `PeerPairing`) |

- A peer record (contract §1 of autobyteus-661): `publicKey`, the peer's node key (base64 SPKI); `address`, where this
  node reaches it; `machine` and `account`, the private network's stable machine ID and the account that added it
  (`null` when paired by plain address); `relation`, `own` or `teammate` (never control); `sandbox: true` on a host's
  record of a sandbox it created (autobyteus-581; it changes no route or permission, it labels the peer and lets the
  host's start sweep remove it, [Sandboxes](./sandboxes.md)). A record without `publicKey` (a pair made before node
  keys, written by the migration `20261127_peers_to_node_keys`) is `paired: false`: "Pair again", and the verifier
  refuses it. `name` is this owner's label, the `node` agents pass.
- The reader is tolerant (known fields, unknown dropped on the next write); the writer writes every field (`null` where
  unknown; `sandbox` only when set). A file that cannot be read (for example a released file the migration could not
  convert) is reported and never rewritten; every peer request is then refused and the rest of the node works.
- Changing a peer's address (`changePeerAddress`, a peer paired by plain address only: `PEER_ADDRESS_FIXED` for a
  private-network peer) checks the same node answers at the new one (`GET <address>/rest/remote-access/status`); a
  different node is `PEER_IDENTITY_MISMATCH`. When the node there refuses the name in the address (its Host gate,
  autobyteus-416), changing the address and Pair refuse `PEER_HOST_REFUSED` with `host` (autobyteus-426); any other
  403 is not an AutoByteus node. An unreachable loopback address says `loopbackInContainer` when this server runs in
  a container (`server-addressing/runs-in-container.ts`).
- Settings errors carry `extensions: {code, reason?, address?, loopbackInContainer?, host?}`; `reason` is the
  transport cause `channel/transport-failure-reason.ts` classifies from Node's `fetch` error.

## Pairing (autobyteus-661)

`PeerPairing` (`pairing/peer-pairing.ts`) is the only maker of peer records; its messages go through
`PeerPairingClient` (`channel/peer-pairing-client.ts`), signed (when signed) by `PeerRequestSigner` and routed by
`PeerConnector`, like every peer sender.

- **Your own nodes, one click.** The app that controls both asks B for a grant (`createPairingGrant(relation,
  forMachine?, nameForAsker?)`: one use, 10 minutes, kept as a hash in memory), then has A pair with it
  (`pairWithNode(address, grant, nodeId?, name?)`): A sends `POST /rest/remote/pair {nodeId, name, publicKey,
  addresses, grant}` (`addresses`: where B may reach A, in A's order: its configured and current addresses, the Docker
  host alias when it listens on loopback, its interface addresses; at most 8). B checks the grant (unused, unexpired,
  `forMachine` = the caller's machine when set), asks each address's identity route at once (5 s each) and keeps the
  first, in order, that answers with A's node ID as the record's `address` (none: 409 `PAIR_ADDRESS_UNREACHABLE`, the
  grant stays unused; the resolution both nodes did before, moved to the receiver), then stores A (`relation` from the
  grant, named `nameForAsker` when set) and answers its own identity; A stores B (`own`). A host pairs its sandbox
  this way ([Sandboxes](./sandboxes.md)).
- **A node this app does not control.** `pairWithNode(address)` without a grant: A keeps an outstanding request and
  sends `pair` with a random `requestId` and its addresses; B resolves the address the same way and keeps it pending (`pendingPairRequests`; at most 20, one per asking node,
  a restart drops them). B's owner Accepts (`acceptPairRequest`): B stores A as `teammate` and sends `POST
  /rest/remote/pair-accepted {nodeId, name, publicKey, requestId}`; A takes it only for its outstanding request,
  confirms with a signed `POST /rest/remote/pair-confirm {nodeId}` at the address it asked, which must answer with the
  same node, and only then stores B (`teammate`). When A does not take the acceptance, B removes its record again.
  Reject (`rejectPairRequest`) sends `pair-rejected` (A shows "declined"); Cancel (`cancelPairRequest`) drops A's
  outstanding request, so a later acceptance is refused (`outstandingPairRequests`).
- **Unpair** (`unpairPeerNode`): a signed `POST /rest/remote/unpaired` to the peer when it can be reached, then the
  record here is removed and its open sockets close (NA-11). A node that receives `unpaired` removes its record of the
  caller. An unreachable peer keeps its record until its next request is refused.
- `pair`, `pair-accepted` and `pair-rejected` are exempt from credentials (NA-6); `pair-confirm` and `unpaired` are
  peer routes. Over the private network (its own build slice) the listener attaches the caller's machine and account,
  which `pair` and `pair-accepted` keep in the record.

- There is nothing to publish. Peers can start every definition that a local `delegate_task` may target
  as a catalog copy, at the same catalog address: shared Agents (the Daily Assistant too) and shared Agent
  Teams, never the Model Router, Agent Orgs, team-local or application-owned definitions, nor internal agents while this node hides them
  ([Agent Definition: Internal Agents](./agent_definition.md#internal-agents)).
- How a remote run runs is decided in one place, `NodeCatalogPort`
  (`agent-collaboration/collaborators/node-catalog-port.ts`): each agent's own default runtime, model and
  model settings, and for a Team member without one the Team's default (no inherited layer; see
  [Agent Communication](agent_communication.md), launch layers), this node's temp workspace
  (`AUTOBYTEUS_TEMP_WORKSPACE_DIR`, default `<data>/temp_workspace`) and tool auto-approve on for every agent
  of the run (every member of a remote Team). An Agent whose default runtime signs in with this node's local login (Codex, Claude) runs
  with that login for any registered peer, as CM-12 says ("a remote run uses its own node's credentials").
  A leftover `published-agents.json` from a development build is neither read nor written.
- GraphQL: `peerNodes`, `pendingPairRequests`, `outstandingPairRequests`, `createPairingGrant`, `pairWithNode`,
  `acceptPairRequest`, `rejectPairRequest`, `cancelPairRequest`, `renamePeerNode`, `changePeerAddress`,
  `unpairPeerNode`, `peerNodeOffer(nodeId)` (autobyteus-267) and `peerNodeAvailability(nodeId)` (one-nodes-tab); every
  change is an owner action (a phone is refused). The web's Nodes → Manage Nodes tab uses them on this node and,
  from the window, on the other node of a row: pairing two nodes the app controls is one confirmation (a grant there,
  Pair here; no node writes another node's peers).
- `peerNodeOffer(nodeId)` answers `{entries: [{name, kind, description}]}` (no address; `description` null when
  absent) or `{refusalCode, unreachableReason}`, exactly one of the two kinds, through `PeerNodeDiscovery.listAvailableAgentsOf(nodeId)`:
  the same path as `list_available_agents` with `node`. The window never asks a peer for its offer (only this
  node's server does); the page words the
  refusal code itself. It takes at most about 20 s (the peer request bound). `peerNodeAvailability(nodeId)` answers
  `{available, refusalCode, unreachableReason}` through `PeerNodeDiscovery.checkAvailabilityOf(nodeId)`, the
  availability question `list_peer_nodes` asks, for one peer.

## Between nodes

Six requests, `POST /rest/remote/delegated-runs`, `/rest/remote/messages`, `/rest/remote/availability`,
`/rest/remote/available-agents`, and (autobyteus-492) `/rest/remote/run-messages` and `/rest/remote/running-agents`
([below](#messages-by-run-id-and-running-agents)), plus the run-view routes of autobyteus-278 (`/rest/remote/run-summaries`,
`/agent-projection`, `/owner-commands` and the WebSocket `/rest/remote/run-observations`, described
[below](#remote-runs-in-the-run-tree)), and (autobyteus-591) `/rest/remote/delegated-run-states`
([below](#a-remote-runs-delegation-state)) (route class `REMOTE_PEER`; a mobile credential is refused). Every request
carries `{fromNodeId, toNodeId}`; every answer carries the responder's `nodeId`. A domain refusal is `200
{accepted: false, code, message, target?: {kind: "agent" | "agent_team", name}}` (`message` is the responder's
detail; `target` the target definition there, for `NO_DEFAULT_RUNTIME` and `AGENT_CANNOT_RUN`, so the delegating
node words it as an Agent or an Agent Team), a malformed body `400`. A delegated-run request names its target by `address`, its catalog address on the
called node; its answer is `{accepted: true, nodeId, kind: "agent", agentRunId}` or `{accepted: true, nodeId,
kind: "agent_team", teamRunId, coordinatorAddress, members: [{address, agentRunId}]}` (the member addresses
as the delegating node addresses them, under the catalog address). A delegated-run request also carries the Task
(`task`: text, title, key and IDs), so the called node can route its agents; both accepted answers carry `launches`
(each agent's address, runtime, model and launch source), and a refusal may carry `modelRouting {state}` and
`agentName` (code `MODEL_ROUTER_FAILED` for a failed routing with no fallback; see
[Model Routing: Across nodes](./model_routing.md#across-nodes)). Every message and work packet carries
`targetRoot: {kind: "agent" | "agent_team" | "agent_org", runId}`, the root that receives it on the called
node: towards a remote run, that run's root; back towards the delegator, the delegating run its
`delegatedFrom` names. The two discovery requests carry the envelope only: *availability* is answered
`{accepted: true, nodeId}`, *available agents* `{accepted: true, nodeId, agents: [{name, kind, address,
description?}]}`. There is no version field and no request ID; nothing retries. A node without a route (an older
build) answers 404, which the caller reads as unreachable (DESIGN.md rule 9).

- **`PeerClient`** (`channel/peer-client.ts`, implements `RemoteRunChannel`): applies the pairing (a peer without a key
  is `PEER_NOT_PAIRED`, nothing sent), signs every request with `PeerRequestSigner` and reaches the peer through
  `PeerConnector` (directly at `address`, or, for a peer with a `machine`, only through the network relay of the
  private network), sends with a 20 s bound (QR-102; a delegated-run start request waits up to 50 s,
  `PEER_START_REQUEST_TIMEOUT_MS`, to fit the called node's 40 s routing), refuses an answer from a server that is not the
  pinned peer, and words every refusal for the agent with the peer's name. It reads a peer's list strictly:
  each entry has exactly `name`, `kind`, `address` and, optionally, `description`; anything else (for example
  a `members` field) makes the answer malformed, read as unreachable "it answered without its list".
- **`PeerGateway`** (`channel/peer-gateway.ts`): the one entry point (REQ-114; S6 adds authentication
  here). Order: `toNodeId` is this node, `fromNodeId` is the authenticated peer and a peer here, then the
  handler of the request kind. *Availability* has no handler: passing the admission is the answer.
- **`RemoteCatalogLister`** (`inbound/remote-catalog-lister.ts`): the *available agents* answer,
  `CollaboratorCandidatePolicy.listEligible(NodeCatalogPort)` through the one entry builder. It is the same
  policy and port a delegation from a peer resolves its address with, so the list is exactly what a delegation
  accepts, at the addresses it accepts. Nothing is created or written.
- **`RemoteDelegationReceiver`**: resolves the address exactly as a local catalog delegation resolves it, through
  `CollaboratorAdmission` with `NodeCatalogPort` (`catalogDefinitionAt`, then `catalogTaskSourceOf`):
  nothing there → `AGENT_NOT_FOUND`; an agent covered by no default runtime and model →
  `NO_DEFAULT_RUNTIME` ("… the target agent <name>" or "… the target agent team <name>"); a default that
  can't run here (runtime unavailable, model unavailable, settings invalid) → `AGENT_CANNOT_RUN` with the
  reason. Every refusal comes before a run is created.
  - An Agent: a **prepared** standalone run with the resolved launch and `delegatedFrom`; its ID is
    returned. A prepared run that never receives its work packet is not expired by age; the next server
    start removes it if its folder holds nothing but its record (see `agent_execution.md`).
  - An Agent Team: **`RemoteTeamRunStarter`** (`inbound/remote-team-run-starter.ts`), the one owner of
    mapping a resolved Team source to `TeamRunService.createTeamRun`: the Team default as the Team's launch,
    each member's resolved launch, and `delegatedFrom` onto the Team tree. The Team run is created, not
    started: its members start on input. `createTeamRun` plans the layout again from the definition; a
    definition edited in between (a member added, removed or of another Agent, or another coordinator) is
    `AGENT_CANNOT_RUN` "the Agent Team changed while it was being started", and a Team run already created
    is terminated first.
- **`RemoteMessageReceiver`**: resolves `targetRoot` by kind through `RemoteRootDirectory` (the root
  managers' public resolve / restore APIs, through the node's one `CollaborationRootResolver`, shared with
  [Restart Resume](./restart_resume.md)), one rule for both directions. Once a root accepts a work packet, the
  packet's content (the task description) becomes the run's history title through `RemoteRunTitles` (the run
  service of the root's kind; the first non-empty title wins; a failure is logged and the packet stays accepted;
  autobyteus-269). A work packet is for a root a peer
  started (`agent` or `agent_team`); a message for any root kind. Before an inactive root is restored, the
  directory checks the request against the root's **stored** links (`storedLinkCheck`: the root managers read
  their own stores, `remote-collaboration` parses no root files): a sender not linked from that node is
  `REMOTE_TARGET_NOT_PERMITTED` and nothing is loaded. The restored root's own link check stays the authority.

### Messages by run ID and running agents

autobyteus-492 (CM-13): the run ID is the address across nodes too.

- **`run-messages`**: `{fromNodeId, toNodeId, messageId, sender: {agentRunId, address}, target: {agentRunId}, content,
  messageType, createdAt}`, with no `targetRoot`: a message to a running agent of the called node by its run ID
  only. Unlike `messages` (a linked run, its root named, which may wake it), it never restores or wakes anything.
  `RemoteMessageReceiver.acceptRunMessage` asks `RunningAgents.rootOf` (from each live root's own statuses), and
  the agent's active root accepts it in its gate (`acceptPeerRunMessage`: the agent still runs) as from a
  one-message `unlinked_run` endpoint; the engine writes the receiver's log and the header names the sender's
  node. An agent that does not run is `REMOTE_TARGET_NOT_RUNNING`; a team run's ID that runs there is
  `TARGET_IS_TEAM_RUN` with its coordinator's run ID (`RunningAgents.teamCoordinatorOf`, from the team's own
  root). The sending node words both with its name for the peer, the second saying to keep `node`.
- **Who sends it.** `send_message_to(target_agent_run_id, node)` from any agent of this node. The router owns one order
  (autobyteus-587 SR-010 R1), so nothing changes before every file is on that node: the peer by this node's name for it
  → the node rule (`PeerRunNodes`, below) → the files (`OutgoingFiles`: every local check, then the whole upload; a
  refusal changes nothing) → the Task admission of a run this node's Tasks hold on a peer
  (`CrossRunMessageDelivery.admitPeerRun`, autobyteus-591 DN-9; see [below](#a-remote-runs-delegation-state)) → the
  sender's root sends it with the files' descriptors (`deliverToPeerRun`; `RemoteMessageSend` chooses the endpoint: the
  root's link when the sender is paired with that run on that node, else `unlinked_run`). A refusal after the admission
  reopened the run says its Task is open again. Files uploaded before a refusal wait unlinked for the cleanup (24 h). A
  root's linked run ID messaged by an agent the link does not pair (a teammate of the delegator) goes unlinked too, to
  the same node. The sender's log gets the message once the peer accepted it, as for a linked message.
- **The node rule (autobyteus-587 RF-14, `PeerRunNodes`, `agent-collaboration/execution/remote/peer-run-nodes.ts`).**
  One owner of "which node a run is on, as this node knows it": the sender root's links (a run it delegated to a peer,
  or a peer-started root's delegator; `remoteNodeOf` through the root boundary), then the tree's Task entries (any
  sender). A run known on a peer without `node` is `NODE_REQUIRED` with the node to pass; with another `node`,
  `NODE_MISMATCH` with the right one; on a node that is no longer a paired peer, `NODE_NOT_PAIRED`, with no node to pass.
  It reads only. The router asks it before any path (so no root ever routes a remote run itself), and so does
  `TaskDelegation` before giving a saved Task to an existing copy (`node` required there too; a local copy given `node`
  is `NODE_MISMATCH` naming this node, SR-011).
- **`running-agents`**: the envelope only; the answer `{accepted: true, nodeId, agents: [entry]}` is the called
  node's `RunningAgentsListing` with no caller (the entries `list_running_agents` lists, without `node`). The
  asking node's `PeerClient` reads it strictly (each kind's fields only; anything else is a malformed answer,
  "it answered without its list") and `PeerNodeDiscovery.listRunningAgents(node)` adds `node`. Nothing is cached.
- Both routes are peer routes behind the node access gate (signed, NA-9) and `PeerGateway`'s admission, like
  every `/rest/remote/*` route. A peer of an older release answers 404, read as unreachable.

The refusal codes are one list next to the port (`agent-collaboration/execution/remote/remote-refusal-codes.ts`);
the agent-facing texts are in `domain/remote-refusals.ts`.

While this node's identity waits for its data migration (autobyteus-290, capability `node_identity`), nothing is sent
or admitted: the gateway answers HTTP 503 `NODE_IDENTITY_NOT_MIGRATED` (with no `nodeId`), the client refuses with the
same code ("This node's identity is waiting for its data migration, so nothing was sent to another node."), and
adding a peer or resolving an address is refused with it as a settings error. A peer that answers 503 with the code is
named as waiting for its data migration (a refusal, a probe's settings error, an address attempt `identity_pending`),
not as unreachable or "not an AutoByteus node".

## Reference files between nodes

autobyteus-587 (CM-14, contract RFC-001): files attached to a cross-node `delegate_task` or `send_message_to` are copied
to the receiving node, which owns its copy.

- **Wire.** `POST /rest/remote/received-files/status` `{files: [{sha256, size}]}` answers `{maxFileBytes, files:
  [{sha256, receivedBytes, complete}]}`. `PUT /rest/remote/received-files/<sha256>?fromNodeId=&toNodeId=&offset=&size=`
  carries one piece of raw bytes (`application/octet-stream`, at most 8 MiB); the envelope is in the query, which is
  signed (NA-9), and the gate checks the body against the signed hash before the handler runs. It answers
  `{receivedBytes, complete}`. `messages`, `run-messages` and the work packet carry `files: [{sha256, size, name}]`, each
  already complete there; a request that names one that is not is refused `REFERENCE_FILE_CHECK_FAILED`.
- **Sending node (`OutgoingFiles`, `agent-collaboration/execution/remote/outgoing-files.ts`), for both tools.** Each file
  must be a regular file inside the sending agent's workspace once links are resolved; only a saved Task's own context
  files (the paths the Task service resolved for it) may lie outside (DEC-009). It is opened once at the path given; the
  opened file must be the very file its resolved path names (same device and inode) before the containment check, and
  its SHA-256 and every piece are read from that opening. A piece refused as unpaired right after the same call's status
  succeeded is reported as damaged or refused in transit ("try again"). One call carries at most 4 GiB; the status names the receiving
  node's per-file limit, checked before any piece. A file it holds complete is skipped; one it holds in part resumes
  there; after each piece the upload goes on from the bytes the node answers it holds (another sender of the same content
  may be uploading it too). Two different files of one name in one call are refused (`REFERENCE_FILE_NAME_REPEATED`:
  the second would replace the first there). Every refusal (§ 5 of the contract) comes before the message or work
  packet, so nothing is delivered.
- **Receiving node (`ReceivedFiles`, `remote-collaboration/inbound/received-files.ts`).** Pieces append to
  `<data>/received_files/<sha256>.partial` at the bytes held, under the content's lock; the per-file limit
  (`AUTOBYTEUS_RECEIVED_FILE_MAX_MB`, default 2048) applies to every piece; the last one is checked (size and SHA-256) and
  renamed to `<sha256>`. `RemoteMessageReceiver` checks every named file is complete before any root sees the request.
  The root places them at `<agent's own folder>/received_files/<sender's run ID>/<name>` (a temporary name, then a rename
  over the same sender's earlier file; a read-only hard link, or a copy where a link cannot be made) only after its
  admission: a message after the engine's checks and the receiver's slot, a work packet after the link check and the
  host made ready.
- **Cleanup.** A run's history delete removes its folder and so its names; then `ReceivedFiles.sweep` removes every entry
  whose only name is its own and that nothing touched for 24 hours, and every `.partial` untouched for 24 hours. It runs
  after each committed delete (`DelegatedWorkGuard`) and at startup. `status`, completion and placement touch an entry.
  Memory Sync never exports a `received_files` folder.
- **Tool-call time.** The call waits until the files arrived and the message or work packet was delivered. Codex
  (`tool_timeout_sec: 3600`) and Claude (`timeout: 3_600_000`) get an hour for the Agent Tools server; AutoByteus has no
  limit. Antigravity, Grok and ACP-based runtimes offer no per-server setting here; a transfer longer than their default
  fails cleanly (FU-001 of the ticket).

## Discovery

autobyteus-261. An agent with the opt-in tools (see [Agent Tools](agent_tools.md)) finds its node's peers and what
each offers, then delegates with `delegate_task` without being told an address.

- **`PeerDiscoveryChannel`** (`agent-collaboration/execution/remote/peer-discovery-channel.ts`): the port the
  tools use, owned by `agent-collaboration`, implemented by **`PeerNodeDiscovery`**
  (`discovery/peer-node-discovery.ts`) and bound at composition, as `RemoteRunChannel` is. The listing does not
  go through the roots: a peer's offer does not depend on the asking run.
- `listPeerNodes()` (`list_peer_nodes`): the peers in pairing order, all
  asked for *availability* at the same time, each within the 20 s bound, so the whole call takes at most about
  20 s. An accepted answer is `available`; anything else (this node not a peer there, the
  wrong node, an HTTP error, a transport failure, a timeout) is `unavailable`.
- `listAvailableAgents(node)` (`list_available_agents` with `node`): the peer by name, with the same refusals as
  `delegate_task` (no peer by that name), then `listAvailableAgentsOf(nodeId)`, the peer's
  *available agents* by node ID, which the Nodes page also uses; the peer's refusal gives the reason for an
  unavailable node.
- Nothing is stored or cached; every call asks the peers now. A listing creates no run, writes nothing on
  either node and is not a message.
- A peer reveals only the name, kind, address and description of each entry: never definitions, prompts,
  settings, members or launch settings. Identity is claimed, not proven, until S6: a listing is answered to any
  registered peer, the same rule as a delegation.

## In the roots

- **Delegating node.** `delegate_task({node, recipient_address, description, reference_files?})` or
  `delegate_task({node, recipient_address, task_id})` (a saved Task, with its own context files, DEC-009):
  `RemoteDelegation` resolves the peer by this owner's label, then calls `TaskDelegation.toPeerRun`, the one caller of
  `startDelegatedRun`. It uploads the files first (`OutgoingFiles`; a refusal starts nothing on the peer),
  then the peer creates the run, so its run ID is
  known before the Task link; the Task entry is then written with `nodeId` (and for a Team, `members` by run ID
  and their own address, and the coordinator as `teamCoordinatorAgentRunId`), and the work packet is sent to the
  Agent run or the Team's coordinator, naming the files. A refusal by the peer leaves nothing on this node. The result
  is a local delegation's shape plus `node` (and `files_sent`). Nothing is stored in the delegating run (autobyteus-461): its peer children
  are read from the Task entries (`peerRunLinksOf`, through the `DelegationIndex`).
- **Receiving node, an Agent.** The run is an ordinary standalone run; `run_metadata.json` carries
  `delegatedFrom` `{nodeId, delegatingRun, delegatorAgentRunId}`. Its root admits the work packet (link
  check, host made ready, its files placed, system task notification naming the node and the files' received paths),
  knows the delegator as its back-link
  endpoint, writes the first message to its own log, and shuts the host down after the idle grace period
  (`DelegatedRunIdleShutdown`); the next message restores it.
- **Receiving node, an Agent Team.** The run is an ordinary top-level Team run (history, open, watch, stop);
  its `team_run_execution_tree.json` carries the same `delegatedFrom`. Its root pairs the delegator with every
  member, admits the work packet for the coordinator (link check, its files placed in the coordinator's own folder,
  then the coordinator's input with the system task notification naming the node and the files, which starts it), and has a quiet idle shutdown
  (`DelegatedTeamIdleShutdown`, see [Agent Team Execution](agent_team_execution.md)); the next message restores
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
    of a standalone root, or every member of a Team root; no Task there; its messages name the delegating
    run).

  `RemoteRunLinks` itself has membership (`endpointFor`, `inboundEndpoint`, `has`, `teamLinkFor`), the link
  checks (`admitsWorkPacket`, `admitsInbound`, also used against stored links before a restore) and
  `deliver` (the channel only).
- **Messages.** A root's `hasAgentExecution` answers for its remote endpoints too, so `send_message_to`
  by run ID without `node` reaches the root, which refuses it with the node to pass (RF-14). With `node`, the root's
  `RemoteMessageSend` runs the endpoint choice → `OutgoingFiles.send` → `RootCommunicationEngine.prepareRemoteSend` (the
  checks and the message ID, no state change; the line keeps the sender's paths) → `RemoteRunLinks.deliver` →
  `commitSentToRemote` (the sender's log), so nothing is written unless the peer accepted. Inbound, the root's
  `acceptRemoteMessage` runs the shared link check (`inboundEndpoint`), its own wake, then `engine.acceptFromRemote`:
  its checks and the receiver's slot, then the files placed (`RootCommunicationPort.receivedFilesFor`), then the
  receiver's log with the received paths. The sender's node assigns the message ID; each node writes only its own run's log line
  (CM-9). Headers and results name the other run's node.
- **Who the other agent is (autobyteus-565).** Both message requests (`messages`, `run-messages`) carry the sending
  agent's address in its own run (`sender: {agentRunId, address}`, `address` null when it has none), and their accepted
  answers the receiving agent's (`{accepted: true, nodeId, receiverAddress}`; `PeerClient` reads it strictly: a string or
  null, anything else is a malformed answer, "it answered without the receiving agent"). Each side's line records the
  other agent (`counterpart: {address, nodeId}`): the sender's at `commitSentToRemote` (the answer's `receiverAddress`,
  the endpoint's node), the receiver's at `acceptFromRemote` (the request's `sender.address`, the calling node). Each
  of these two commits publishes the message as `remote`, to its own run's views only; `MessageViewScope` admits it
  into the view of an Agent run that is one of its runs (its Messages; a Team or Org view never shows it), named with
  the address and this node's name for the peer (`RemoteRunChannel.peerName`). Older lines carry no record: a linked
  run's other agent is named from its Task entry, an unlinked one by its run ID.
- **Saved Task (autobyteus-587 DEC-009).** `delegate_task` with `task_id` and `node` starts a new remote Agent or
  Team copy from a saved Task (`TaskDelegation.toPeerRun`); `delegate_task` with a remote run or Team run ID and
  `task_id` gives a saved Task to the existing copy, and then `node` is required (`toPeerRunAgain`; without it, or with
  the wrong node, the refusal names the node to pass). In both forms the Task's own context files are copied to the peer
  first, to the Agent or a Team's coordinator (the one exception to the workspace rule, RF-3; every other rule of
  [Reference files between nodes](#reference-files-between-nodes) applies). A message to a remote team run ID gets the
  usual guidance to use the coordinator's run ID (`teamCoordinatorOf`, answered from `teamLinkFor`).
- **Remote links in memory.** `RemoteRunLinks` reads a root's peer children from the Task entries of its
  delegating run (`peerRuns`), never from a stored list. Run-ID membership and the stored message view include
  them. Messages
  with a remote endpoint are kept out of the public run views: the root never publishes them to its view
  stream (`publishToRootView`, so the stream's change sequence has no gap), and the view snapshots filter
  them out. The local agent's own stream and the message logs show them.
- **Package admission.** The Team and Org package validators read a run's own parts only: a stored message is
  admitted when one of its endpoints is an agent of the tree (autobyteus-461). A Team or Org whose delegator
  exchanged messages with a remote run therefore still loads, restores and reopens after a restart.
- **Task closure** fences a remote run or a remote Team at once: the closed Task refuses its messages both ways.
  Its node then stops it ([below](#a-remote-runs-delegation-state), since autobyteus-591).

## A remote run's delegation state

autobyteus-591 (CM-7, CM-10). The delegating node (A) decides a remote run's delegation state: open while an open
Task entry names the run, closed otherwise. The node that runs it (B) records it and acts on it.

- **A: `PeerRunStateNotices`** (`agent-collaboration/execution/remote/peer-run-state-notices.ts`). The closure's
  release (`TaskExecutionResourceRelease`) gives it each closed run on a peer, and a follow-up Task
  (`TaskDelegation.toExistingRun`) gives it the run after the new entry commits. It marks the notice owed on the
  run's Task entry (`peerNoticeOwed: true`), sends the state read from `isOpen` at send time, and clears the mark
  when B confirms. Per run, one notice is in flight; the next is sent after the previous answer, and a state that
  changed in flight is sent again at once. A transport failure, or a Stop B refused, keeps it owed: while a peer has
  owed notices, one timer per peer (30 s, unref'd) sends them, one run at a time; they are loaded at start from the
  Task entries; a retry logs only a new reason. `TARGET_NOT_FOUND`, `TARGET_NOT_PERMITTED` and `PEER_NOT_REGISTERED`
  (a node no longer a peer, on either side) drop it, logged `TASK_PEER_NOTICE_DROPPED`; a peer to pair again keeps
  it owed. A host without peers sends nothing and runs no timer.
- **The request.** `POST /rest/remote/delegated-run-states` `{run: {kind: "agent" | "agent_team", runId}, open}`,
  through `PeerGateway` admission, then the run's stored back-link (`storedRemoteLinkCheck`, an owner query: only
  the caller's own delegation). Answers `{accepted: true, nodeId, open}` with B's state after the request,
  `REMOTE_TARGET_NOT_FOUND`, `REMOTE_TARGET_NOT_PERMITTED`, or `DELEGATED_RUN_NOT_STOPPED`.
- **B: `DelegatedRunStateHandler`** (`remote-collaboration/inbound/`). Closed: records the run in
  `ClosedDelegations`, then stops it with a closed Task's Stop (`AgentRunService` / `TeamRunService`
  `.stopForTaskClosure`, which re-checks the record where the run's gate closes; a Team with every member) and
  answers after the Stop. Open: removes the record and starts nothing. Both are idempotent.
- **B: `ClosedDelegations`** (`<appDataDir>/remote-collaboration/closed-delegations.json`, a list of `{kind, runId,
  nodeId, closedAt}`). Loaded once at start; each change written whole and atomically; read tolerantly (an
  unreadable file is empty, with `CLOSED_DELEGATIONS_UNREADABLE`). Absence means open. The run list leaves out a run
  it holds (`WorkspaceRunHistoryService`, in memory, desktop and phone alike, on their next list read). An accepted
  linked message or work packet from the run's delegating node removes it (`RemoteMessageReceiver`), and so does
  the run's delete on B. The application host takes no delegations, so it holds none.
- **The assigner's continuation** (DN-9, as locally). Every `send_message_to(run ID)` from this node, with or without
  `node`, first passes `CrossRunMessageDelivery.admitPeerRun` in `GlobalAgentRunMessageRouter.deliver`, once,
  before the sender root's endpoint, `node` or the local route, and outside any root's gate. For a run on a peer that
  this node's Task entries name: an open entry is admitted. A closed run whose last entry is `assigned` and was
  assigned by the sender is continued: the Task side checks and reopens the entry (`assertReopenable`,
  `reopenAssignment`; no local restorability check, the run is its node's), `PeerRunStateNotices` tells its node it
  is open, after any notice in flight, and the message is admitted once the node confirmed. Not confirmed: the entry
  stays open, "open" stays owed, and the answer is the notice's refusal (`PEER_UNREACHABLE` for an unreachable node)
  with "send it again". Any other sender is refused `TASK_AGENT_RESOURCE_CLOSED`. `delegate_task` with the same
  closed Task gets the local refusal, which says to message the run instead.
- **A follow-up Task** (a different saved Task) for a remote run (`delegate_task` with its run ID and `task_id`) skips the local
  conversation check (the conversation is on B), copies the Task's context files first (a refused file or a failed upload reopens nothing), waits for B's "open" confirmation, then
  sends the Task's work over the run's link (`deliverMessageToPeerRun`, the delivery `send_message_to(node)` uses).
  Not confirmed: the work is not delivered, the entry is `failed`, and the notice stays owed.

## Remote runs in the run tree

autobyteus-278 (CM-11, collaboration model § 4). The delegating node (A) shows each remote run as a child of its
delegating run, as it shows a local delegated run, and its owner talks to it, interrupts and stops it. The node that runs
it (B) serves only the peer whose delegation started the run, and only about the run's **paired agents**: an Agent
run's host, or a Team run's members.

- **Requests.** All four go through `PeerGateway` admission (`toNodeId`, the authenticated peer) and then
  `RemoteRunViewProvider`'s link check. They are:
  - `POST /rest/remote/run-summaries` `{runs: [{kind, runId}]}` → `{runs: [{kind, runId, title, statuses:
    [{agentRunId, status, backgroundTasksRunning}]}]}` (the count is required, autobyteus-448). One request per node covers every run A asks about there. A run B's delegation
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
    - An Agent run is followed from host to host across idle shutdown (`StandaloneAgentRunRoot.onAgentReady`).
    - A Team run is followed through its root publisher, filtered to its members, and across a restore after idle
      shutdown (the manager's lifecycle notifications).
    - B ends the stream when the run is stopped, terminated or deleted by any path: B's own window, GraphQL,
      history delete or archive, or `owner-commands`. The standalone manager reports the end after the host stopped
      (`onRunEnded`); the Team lifecycle snapshot carries `ending: "stopped"`. Idle shutdown does not end it
      (`ending: "idle_shutdown"`, or only the host is replaced). A then reads the final summary (AR-403).
- **B's owner.** `RemoteRunViewProvider` (`inbound/remote-run-view-provider.ts`) first checks the run's stored
  back-link: `RemoteRootDirectory.storedLinkCheck` with the query kind `owner` (`{fromNodeId, targetAgentRunId}`),
  which admits the node in `delegatedFrom.nodeId` and, when an agent is named, only a paired agent. It then calls
  the root kind's `RunAgentAccess` behind `RemoteRootDirectory.runAgents(kind)`:
  - `StandaloneRunAgentAccess` on `StandaloneAgentRunRootManager`;
  - `TeamRunAgentAccess` on `TeamRunService`.

  Titles come from the run services' `readRunTitle`, and projections from the agent and Team-member projection
  services. A refusal is `REMOTE_TARGET_NOT_PERMITTED` or `REMOTE_TARGET_NOT_FOUND`.
- **A's client.** `PeerClient.runSummaries` / `agentProjection` / `ownerCommand` read their answers strictly
  (`channel/peer-run-view-answers.ts`). `openPeerRunObservation` (`channel/peer-run-observation-client.ts`, the
  global Node `WebSocket`) requires the first frame to be `{nodeId}` equal to the pinned peer. A refusal, any
  other first frame, a timeout or a close ends the observation once (`onEnd`); A's own `close()` ends it
  silently.
- **A's rows.** A remote run is a row of its delegating run's tree, and of each tree above it (`peer_agent` /
  `peer_team`, a team's members as `peer_member`; see
  [Run trees](../design/agent_websocket_streaming_protocol.md#run-trees-autobyteus-461)). The row comes from the
  run's Task link (its node, kind, run ID and paired agents) and, once the node answered, the node's last answer
  (`peer`: title, reachable; `launch`). A newly linked remote run arrives as the tree's next change, like a local one.
- **A's statuses (`RunStatusService`).** A client holds the runs it shows on `/ws/run-status`. For a held remote run,
  A asks its node once for its summary (`runSummaries`: title, reachability, statuses, launches) and observes its
  paired agents' statuses on that node (`openPeerRunObservation`), whether or not the delegating run is open or
  running. An observation that ends unasked is asked once more and not reopened; a client that newly holds a run
  whose observation ended asks once more too. `RETRY_PEERS` (the window's Retry) reopens the ended observations and
  asks again, one call in flight per run. A changed answer changes the run's row in every tree that holds it
  (`ChildRowsFeed.rowChanged`).
- **Opening and commands on A.** A remote row opens the run by its own identity (the row's `openTarget` with its
  `nodeId`): `/ws/peer-run/:nodeId/:runKind/:runId/:agentRunId` relays the agent's own stream from its node
  (`PeerRunStreamSession`, in the `/ws/agent` protocol). A message, an interrupt or a Stop goes to its node as an
  owner command; its files are read on its node. Remote calls run outside every root's operation gate, because a peer
  call can take up to 20 s.
- **Replaced (autobyteus-461).** The per-root viewer-counted observation (`RemoteRunObservation`), its root events
  (`RemoteRunRootEvent`: `remote_task_execution_summary`, `remote_agent_presentation`), the views'
  `remote_task_executions`, `REFRESH_REMOTE_TASK_EXECUTIONS`, and the resolvers and commands that reached a remote run
  through its delegator (`remoteChildOf`, `executeRemoteChildCommand`, `stopRemoteChild`) are gone: the run tree,
  `RunStatusService` and `/ws/peer-run` do their work.
