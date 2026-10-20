# Remote Collaboration

## Scope

The rules are defined in the [Collaboration Model](../design/collaboration_model.md) (CM-10 … CM-12, § 4);
this document describes the mechanics.

`src/remote-collaboration/` lets an agent on one node delegate a text task to an Agent another node
publishes, and lets the two runs message each other by run ID. It owns the node-level concerns: the
switch, the registered peer nodes, the published Agents, the outbound client and the inbound gateway.
The collaboration roots own the runs and their messages; they reach other nodes through the shared
`RemoteRunLinks` in `src/agent-collaboration/execution/remote/`.

Slice 1 (autobyteus-191) is text only, for Agents, on a trusted private network: there is no
authentication between nodes and no credential ever crosses them. Attachments, lifecycle control from the
delegating node, remote Agent Teams, discovery and peer authentication come in later slices.

## Settings (per node)

| What | Where | Owner |
| --- | --- | --- |
| The switch, off by default | `ENABLE_REMOTE_COLLABORATION` in `<data>/.env` | `RemoteCollaborationCapability` |
| Peer nodes `{nodeId, name, baseUrl, addedAt}` | `<data>/remote-collaboration/peers.json` | `PeerDirectory` |
| Published Agents with their launch settings | `<data>/remote-collaboration/published-agents.json` | `PublishedAgentService` |

- Adding a peer contacts `GET <baseUrl>/rest/remote-access/status` and pins the `serverInstanceId` as the
  peer's `nodeId`; it needs the switch on. `name` is this owner's label, the `node` agents pass.
- A published Agent records runtime, model and settings, workspace and tool auto-approve (off unless the
  owner turns it on). Its address is derived from the published set with the catalog's address rules,
  never stored. `PublishedLaunchCheck` (runtime availability, model selection, workspace folder) checks
  it when it is published and again when a peer starts it.
- GraphQL: `remoteCollaborationCapability` / `setRemoteCollaborationEnabled`, `peerNodes`, `addPeerNode`,
  `renamePeerNode`, `removePeerNode`, `publishedAgents`, `publishAgent`, `updatePublishedAgent`,
  `unpublishAgent`. The web's Nodes → Remote Collaboration tab uses them.

## Between nodes

Two requests, `POST /rest/remote/delegated-runs` and `POST /rest/remote/messages` (route class
`REMOTE_PEER`; a mobile credential is refused). Every request carries `{fromNodeId, toNodeId}`; every
answer carries the responder's `nodeId`. A domain refusal is `200 {accepted: false, code, message}`, a
malformed body `400`. There is no version field and no request ID; nothing retries.

- **`PeerClient`** (`channel/peer-client.ts`, implements `RemoteRunChannel`): applies this node's switch
  and the registration, sends with a 20 s bound (QR-102), refuses an answer from a server that is not the
  pinned peer, and words every refusal for the agent with the peer's name.
- **`PeerGateway`** (`channel/peer-gateway.ts`): the one entry point (REQ-114; S6 adds authentication
  here). Order: `toNodeId` is this node, the switch is on, `fromNodeId` is a registered peer, then the
  handler of the request kind.
- **`RemoteDelegationReceiver`**: an Agent published at the address that can run here → a **prepared**
  standalone run with the published launch settings and `delegatedFrom`; its ID is returned. A prepared
  run that never receives its work packet expires (prepared-run TTL).
- **`RemoteMessageReceiver`**: a work packet, or a message without `coordinatingRun`, goes to the run's
  own standalone root on this node; a message with `coordinatingRun` goes to that coordinating root of the
  delegating node (restored if needed). The root applies the link check.

The refusal codes are one list next to the port (`agent-collaboration/execution/remote/remote-refusal-codes.ts`);
the agent-facing texts are in `domain/remote-refusals.ts`.

## In the roots

- **Delegating node.** `delegate_task({node, recipient_address, description})`: the root resolves a
  `remote_agent` placement (refusing `task_id` and `reference_files` first), and the unchanged
  `RootTaskExecutionLifecycle` runs it. Planning asks the peer to create the run, so the peer's run ID is
  known before the Task link; `RemoteTaskActivation` then commits the link (`taskExecutions` entry with
  `nodeId` in the topmost coordinating tree) and sends the work packet. A refusal by the peer leaves
  nothing on this node.
- **Receiving node.** The run is an ordinary standalone run; `run_metadata.json` carries `delegatedFrom`
  `{nodeId, coordinatingRun, delegatorAgentRunId}`. Its root admits the work packet (link check, host
  made ready, system task notification naming the node), knows the delegator as its back-link endpoint,
  creates its `collaboration/` package with the first message, and shuts the host down after the idle
  grace period (`StandaloneHostIdleShutdown`); the next message restores it.
- **Messages.** A root's `hasAgentExecution` answers for its remote endpoints too, so `send_message_to`
  by run ID reaches the root. `RemoteRunLinks` applies the pair rule (only the delegator and the remote
  run message each other) and calls `RootCommunicationEngine.sendToRemote` / `acceptFromRemote`. The
  sender's node assigns the message ID; each node writes only its own run's log line (CM-9). Headers and
  results name the other run's node.
- **Remote links in memory.** The stores load entries with `nodeId` into the tree's own
  `remoteTaskExecutions` (absent when none), never into `taskExecutions`, so every walker of local copies
  (index, Stop, launch selections, run tree, idle shutdown, Task closure release) excludes them. Run-ID
  membership, the stored message view and Task ownership include them through `RemoteRunLinks`. Messages
  with a remote endpoint are kept out of the public run views: the root never publishes them to its view
  stream (`publishToRootView`, so the stream's change sequence has no gap), and the view snapshots filter
  them out. The local agent's own stream and the message logs show them.
- **Task closure** fences a remote run (its messages are refused with the closed-Task reason); it keeps
  running on its node until idle (stopping it from the delegating node is S3).
