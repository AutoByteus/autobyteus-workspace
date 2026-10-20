# Design Spec — Slice 1: Remote Delegation, Text Only (autobyteus-191)

## Solution And Approval Basis

- Current solution revision ID: `SR-012`
- Approved requirements baseline: `requirements-doc.md` at SR-007 (approved by the User 2026-10-19: SR-004 for the slice, SR-005 for no version check, SR-007 for `node` on `delegate_task` only)
- Behavior-defining supplements: `slice-plan.md` (approved 2026-10-19)
- Design status: `Ready` (SR-011). The architecture was discussed with the user 2026-10-19/20 (SR-005 … SR-011): tool shape, contract, on-disk data model and back-link. Classified below.
- Canonical investigation notes: `investigation-notes.md` (S-01 … S-15; architecture evidence A-01 … A-10 below are added there)
- Authorities read (2026-10-19; re-read after the skill update 2026-10-20: `SKILL.md`, `references/design-principles.md`, `references/handoff.md`, `references/ticket-scope.md`, `templates/design-spec-template.md`): `references/architecture-design.md`, `references/design-principles.md`, `/DESIGN.md` (rules 1–9, project documents), `autobyteus-server-ts/docs/design/collaboration_model.md`, `autobyteus-server-ts/docs/design/data_migration_guideline.md` (§1–§3). `design-examples.md`: not used.
- Project design-principle conflicts: one, found and resolved. DESIGN.md rule 9 (no version checks between nodes) conflicted with REQ-114's version check. The user removed the check (SR-005).

## Current-State Read

Every collaboration path ends in an in-process call (INV S-02 … S-05, A-01 … A-06):

- `send_message_to(target_agent_run_id)` → `GlobalAgentRunMessageRouter.deliver`. If the sender's root `hasAgentExecution(target)`, the call goes to `root.deliverExactAgentMessage` → the root's message delivery → `RootCommunicationEngine.deliver`, which runs these steps:
  1. Task-scope check (`assertDeliveryAllowed`);
  2. build the receiver's input;
  3. `reserveRecipientInput` on the **in-process** AgentRun;
  4. `commitAppend`, which writes the receiver's and then the sender's message log (CM-9) and admits the input.

  Otherwise the target must be an active run on this server.
- `delegate_task(recipient_address)` → root `delegateToNewCopy` → `resolveDelegationPlacement` (CM-1 refusal → in-run placement → catalog). Then `RootTaskExecutionLifecycle` runs: the Task link is written, then the adapter's `prepare` (a private in-process copy), `commit` (one tree write), and `acceptSeed` (the work packet as the first message).
- Each root kind (Agent/standalone, Team, Org) owns its tree, index, delivery and adapter. Shared logic lives in `src/agent-collaboration/`.
- Node B side: a standalone Agent run has a root (`StandaloneAgentRunRoot`). Its host is restored by `ensureReady()` on the next message (S-05). It has **no idle shutdown**; only delegated copies have one (A-07).
- Every root kind can be restored by its run ID: `StandaloneAgentRunRootManager.resolveRoot`, `TeamRunService.resolveManagedTeamRun`, `AgentOrgRunService.restore` (A-05).
- The trusted-network route policy lets non-loopback, credential-less requests reach protected routes (S-11).

Nothing is broken. The gap is that the receiving run is always assumed to be an object in this process.

## Intended Change

Add a node-to-node channel and a **remote endpoint**. A run on a peer becomes a participant of a collaboration root through a link, instead of through an in-process handle. Each node keeps owning its own runs (federation, CM-8/CM-9). One node never controls another node's runtime directly; it only sends it requests.

## Change Scope (Mandatory)

- In scope: UC-101 … UC-105. Areas:
  - a new `src/remote-collaboration/` subsystem: peers, publishing, switch, channel, gateway, inbound handlers;
  - remote endpoints in the shared root communication and task activation (`src/agent-collaboration/execution/remote/`);
  - the remote placement in delegation;
  - the `node` parameter of `delegate_task` (DEC-111);
  - the remote links in the three root trees and the standalone run metadata;
  - idle shutdown for remote-started standalone hosts;
  - message headers with the node;
  - REST routes, the route policy and GraphQL for the settings;
  - the web Nodes tab;
  - docs (collaboration model § 4/§ 5 and module docs).
- Deliberately left alone:
  - hosting of local delegated runs (DEC-110);
  - the global live-only run-ID path;
  - `send_message_to`'s parameters (DEC-111);
  - Phone Access and Memory Sync;
  - Task record shapes (a remote copy is recorded as `{kind: agent, agentRunId}`, which the record already allows, A-08);
  - local message-log formats.
- Follow-ups: FU-1 "Every delegated copy restores from its own run file; remove `taskAgent.origin`" (legacy of delegated-copy-own-run-memory U-4). Created as **autobyteus-197** and dispatched to a separate software engineering team (coordinator `solution_designer_8faa67797c254dc2959e34410e2f48a2`); sent to `/project_task_manager` on 2026-10-19 at the user's request, with `follow-up-delegated-copy-restore-from-own-file.md`. It is not a prerequisite, but it touches the same loading code, so it is best done before this slice's implementation.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Requirement / AC | Trigger | Existing Behavior | Change | Target Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-101 | Operational | REQ-101/102/114/115; AC-101/102/111 | Owner in node window | No peers | Switch + peer records with pinned identity | DS-004, DS-005 |
| BEH-102 | Operational | REQ-103; AC-103 | Owner in node window | — | Published Agents with launch settings | DS-004 |
| BEH-103 | Contract | REQ-104/105/109/111; AC-104/109 | `delegate_task({node, …})` | Local copy only | Remote placement → B creates a standalone run → A records the link → work packet | DS-001 |
| BEH-104 | Contract | REQ-106/107/108; AC-105/106/107 | `send_message_to(run id)` | Same root or live-only | The root knows the run ID as a remote endpoint (link) → channel → the other node's root | DS-002, DS-003 |
| BEH-105 | Contract | REQ-110; AC-108 | `reference_files` / `task_id` with `node` | — | Refused before anything is sent | DS-001, DS-002 |
| BEH-106 | User | REQ-112; AC-110 | B's run history | — | Remote run is a normal standalone run on B | DS-001 (B part), DS-006 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related IDs | Relationship | Status |
| --- | --- | --- | --- | --- |
| `slice-plan.md` | Foundations F-1 … F-4 | All | F-1 → `remote-collaboration/` peers and publishing; F-2 → channel + gateway; F-3 → remote links; F-4 → remote endpoints in roots | Approved |

## Task Design Health Assessment (Mandatory)

- Change posture: `Larger Requirement` (feature)
- Current design issue found: `No` for the existing owners. One structural point: the shared root communication engine assumes every endpoint is local.
- Structural triggers:
  - **Repeated coordination:** fires potentially. Three root kinds would each need remote delivery. Response: one shared owner (`RemoteRunLinks`) that each root plugs in, as roots already share `RootCommunicationEngine` and `RootTaskExecutionLifecycle`.
  - **Ambiguous boundary:** ruled out. The remote endpoint has its own explicit identity (`RemoteRunReference`), and the tool takes an explicit `node`.
  - **Shared-structure looseness:** avoided. There is no optional `nodeId` on the existing local identity types; a distinct type is used instead (DEC-111 reasoning).
  - **Responsibility overload:** `RootCommunicationEngine` would grow. Response: the remote send/accept paths live in `RemoteRunLinks`, which uses the engine's existing adapter for the local half.
- Root cause classification: `No Design Issue Found` (new capability on healthy owners)
- Refactor needed now: `No`. One small extension: the engine accepts a caller-supplied message ID for inbound messages (CM-9 needs one ID on both nodes).
- Evidence: A-01 … A-08.
- Design response: extend the existing owners. Add a new `remote-collaboration` subsystem for node concerns. Keep remote-collaboration knowledge out of runtime adapters and tools, except for the `node` parameter.
- Intentional deferrals: local CM-7 conversion (DEC-110); lifecycle control across the link (S3).

## Terminology

- **Peer**: a node registered here; `nodeId` = its `serverInstanceId`. `name` is this owner's label for it.
- **Remote run reference**: `{ nodeId, agentRunId }`, the identity of a run on a peer (`nodeId` = its server ID, the same field name as on links).
- **Remote link**: on A, the record in the delegating run's root of a remote run it started. On B, the remote run's **back-link** to its coordinator.
- **Remote endpoint**: a participant of a root that is reached through the channel instead of an in-process handle. On A, the remote run; on B, the delegator.
- **Channel**: the outbound peer client plus the inbound gateway.

## Legacy Removal Policy (Mandatory)

- Obsolete legacy paths and files in this scope: none. Slice 1 adds a capability; no path is replaced. The legacy `taskAgent.origin` found during this design was removed separately by autobyteus-197 (FU-001), which landed before this slice.
- Compatibility wrappers, dual paths, or legacy fallbacks this design keeps: `None`.

## On-Disk Data Model (designed first)

This section is the authority for every file slice 1 adds or changes. Everything above it in the code follows from it. The shapes are checked against real stored files (read-only, `~/.autobyteus/server-data`, 2026-10-19; INV A-13). `<data>` is the node's server data directory and `<memory>` is `<data>/memory`.

### Principles

- **Each node stores only its own side.** No node stores another node's run content. Between the two nodes there are links, never copies (CM-8). Each run's message log holds the messages of that run (CM-9).
- **A link names the other side by `(peer server ID, run ID)`.** It never uses the peer's name, because names are each owner's local labels.
- **A delegated run is a delegated run; where it runs is one more fact about it** (the user, SR-009). The existing link entry in `taskExecutions` and the existing `taskAgent` back-link each gain the other side's node. Absent means this node, which is truthful for every stored entry. The meaning of both structures is unchanged; only the location becomes explicit (Data Migration Guideline § 3: an optional field whose absence has a truthful meaning).
- **Readers load links into explicit kinds** (local Agent link, local Team link, remote Agent link; local or remote back-link). Every code path that walks links must then decide what a remote run means for it, and the compiler checks that it does.
- **Tolerant read, exact write, no version fields** (§ 3). Every new field is optional, and its absence means "none".

### The picture

```text
NODE A (desktop, srv_A)                                   NODE B (docker, srv_B)
<data>/.env            ENABLE_REMOTE_COLLABORATION=true             <data>/.env            ENABLE_REMOTE_COLLABORATION=true
<data>/remote-collaboration/peers.json   → B: srv_B, "docker", URL  <data>/remote-collaboration/peers.json   → A: srv_A, "desktop", URL
<data>/remote-collaboration/published-agents.json  (A's own offers) <data>/remote-collaboration/published-agents.json → "Publisher" + launch settings

<memory>/agents/agent_a1/                                 <memory>/agents/agent_7f3/          ← the remote run: B's own run
  run_metadata.json        (delegator, a normal run)        run_metadata.json  + delegatedFrom { nodeId: srv_A, coordinatingRun, agent_a1 }
  collaboration/                                            collaboration/
    collaboration_tree.json                                   communication_messages_active.jsonl  ← agent_7f3's log (B's side)
      taskExecutions: [{ agent_7f3, nodeId: srv_B, … }]  ← link raw_traces_active.jsonl, …          ← agent_7f3's memory
    communication_messages_active.jsonl  ← agent_a1's log (A's side)
```

The same message `collabmsg_X` appears in A's log for `agent_a1` and in B's log for `agent_7f3`.

### Files on every node

**1. The switch: `<data>/.env`, key `ENABLE_REMOTE_COLLABORATION`.** Written by `ServerSettingsService.updateSetting`, which is the existing mechanism for `ENABLE_SKILL_IMPROVEMENT` and `ENABLE_APPLICATIONS`. Absent or not `true` means off.

**2. Peers: `<data>/remote-collaboration/peers.json`.** New. Owner: `PeerDirectory`, the only reader and writer.

```json
{
  "peers": [
    {
      "nodeId": "srv_Q2h…",
      "name": "docker",
      "baseUrl": "http://localhost:29700",
      "addedAt": "2026-10-20T09:00:00.000Z"
    }
  ]
}
```

- `nodeId` is the peer's `serverInstanceId`, read from `GET <baseUrl>/rest/remote-access/status` when the peer is added. It is unique in the file.
- `name` is this owner's label: unique in the file, the value agents pass as `node`, and shown in headers.
- `baseUrl` is how *this* node reaches the peer. For example, the desktop reaches Docker at `localhost:<published port>`, while Docker reaches the desktop at `http://host.docker.internal:29695`.
- Rename changes `name` only. Remove deletes the entry. Links that name a removed peer stay on disk and refuse with "not registered" (REQ-102).
- No secret is stored (slice 1). S6 adds its credential fields here.

**3. Published agents: `<data>/remote-collaboration/published-agents.json`.** New. Owner: `PublishedAgentService`, the only reader and writer.

```json
{
  "publishedAgents": [
    {
      "agentDefinitionId": "publisher",
      "runtimeKind": "claude_agent_sdk",
      "llmModelIdentifier": "sonnet",
      "llmConfig": null,
      "workspaceRootPath": "/home/autobyteus/work/publishing",
      "autoExecuteTools": false,
      "publishedAt": "2026-10-20T09:05:00.000Z"
    }
  ]
}
```

- Field names and meanings are those of `run_metadata.json`, so the receiver copies them into the new run unchanged.
- The published **address** (`/publisher`) is not stored. It is derived by `CatalogAddressMap` over the published set, so a definition rename never leaves a stale stored address. The Nodes tab shows it.
- Unpublish deletes the entry. Runs already started are not affected (REQ-103).

### Node A (delegating side)

**4. The link: the existing `taskExecutions` entry gains an optional `nodeId`.** It is in the coordinating root's tree, in the same list and place as local links:

| Root kind | File | Object holding `taskExecutions` |
| --- | --- | --- |
| Standalone Agent run | `<memory>/agents/<hostRunId>/collaboration/collaboration_tree.json` | top level (beside `host`) |
| Team run | `<memory>/agent_teams/<teamRunId>/team_run_execution_tree.json` | `rootTeam` |
| Org run | `<memory>/agent_orgs/<orgRunId>/agent_org_run_execution_tree.json` | `rootOrg` |

```json
"taskExecutions": [
  { "address": "/reviewer", "agentRunId": "reviewer_12…",
    "delegatorAgentRunId": "agent_a1…", "startedAt": "2026-10-20T09:58:00.000Z" },
  { "address": "/publisher", "agentRunId": "publisher_7f3c…", "nodeId": "srv_Q2h…",
    "delegatorAgentRunId": "agent_a1…", "startedAt": "2026-10-20T10:00:00.000Z" }
]
```

- The remote entry has the fields of a local Agent link (`{address, agentRunId, delegatorAgentRunId, startedAt}`, compare the real entries, A-13) plus `nodeId`, the peer's server ID.
  - `address` is the published address the agent delegated to.
  - `agentRunId` is the ID B gave the run.
  - There is no `platformAgentRunId` and no launch selection, because those belong to B.
- **Absent `nodeId` means this node**, so every existing entry reads unchanged.
- **The topmost coordinating root holds it**, as for local links today (CM-7), also when the delegator is a member of a delegated copy.
- **There is no folder on A for the remote run**, because its content is B's. The store's own-file composition (it composes each local link with its run's own file on load, and splits it on save) **does not apply** to an entry with `nodeId`. It is stored whole in the tree.
- **The reader loads it as a remote Agent link, its own in-memory kind** (`RemoteTaskAgentExecution {address, agentRunId, nodeId, delegatorAgentRunId, startedAt}`). Since autobyteus-197, a local `TaskAgentExecution` always carries the `source` composed from its own file. A remote link has no own file on A, so it cannot be that type. Restore, idle shutdown, stop, own-file composition and liveness do not apply to it. Task closure and the closed-executions view list it like any copy. Message routing sends to it through the channel.
- **Written once**, in the activation `commit` step (the root's existing atomic tree write), after B returned the run ID and before the work packet is sent. Never rewritten.
- **Every writer of the three trees must write `nodeId` when present.** Writers are exact, and a dropped `nodeId` would turn the remote run into a broken local copy. There is a key-set test per root kind (RSK-108).
- **Agent Teams on a peer (S4)** use the same rule: a Team link with `nodeId`.

**5. Task ownership: `agent_run_resources.json` of the Task. Shape unchanged.** The remote run is recorded like any copy:
`{"role":"delegated"|"assigned", "hostRoot":{"kind":"agent","runId":"agent_a1…"}, "agentRun":{"kind":"agent","agentRunId":"publisher_7f3c…"}, "linkedAt", "start", "closedAt"}`.
- `linkedAt` is written before the request to B, as for local copies. `start` becomes `started` after the link commit, or `failed` with `startError` (the refusal code) when B refused.
- Whether a Task copy is remote is read from the root tree, never stored twice.

**6. Messages on A: the delegator's existing log. Format unchanged.** Location by the delegator's placement, as today:
- a standalone host: `collaboration/communication_messages_active.jsonl`;
- a task agent: `agents/<id>/communication_messages_active.jsonl`;
- a Team member: the Team's log.

One line per message, the existing seven fields, for example:
`{"messageId":"collabmsg_X","senderAgentRunId":"agent_a1…","receiverAgentRunId":"publisher_7f3c…","content":"…","messageType":"agent_message","referenceFiles":[],"createdAt":"…"}`.
- The other endpoint is a run ID on B. The link tells which node it is on, so a line needs no node field.
- `messageLogOwners` gets a remote owner kind: A writes **only its own run's line**, and B writes its run's line.

### Node B (receiving side)

**7. The remote run: `<memory>/agents/<runId>/`, an ordinary standalone run folder.** Run history lists it like any run (REQ-112).

`run_metadata.json` is today's shape of a **standalone** run, with launch fields copied from the published agent, plus the back-link. **DEC-112, decided by the user 2026-10-20 ("I agree … from the data model perspective, it looks intuitive"): the back-link is a `delegatedFrom` section.**

**(a) Chosen: a small section `delegatedFrom`, holding only the fields that have a reader on B:**

```json
{
  "runId": "publisher_7f3c…",
  "agentDefinitionId": "publisher",
  "workspaceRootPath": "/home/autobyteus/work/publishing",
  "memoryDir": "<memory>/agents/publisher_7f3c…",
  "llmModelIdentifier": "sonnet",
  "llmConfig": null,
  "autoExecuteTools": false,
  "runtimeKind": "claude_agent_sdk",
  "platformAgentRunId": null,
  "startedAt": "2026-10-20T10:00:00.000Z",
  "delegatedFrom": {
    "nodeId": "srv_A7k…",
    "coordinatingRun": { "kind": "agent", "runId": "agent_a1…" },
    "delegatorAgentRunId": "agent_a1…"
  }
}
```

Each field has a reader on B:
- `nodeId`: which peer replies go to;
- `coordinatingRun`: A's root, echoed on every message to A, so A finds the right root without scanning (DS-003). A checks it against its own tree; B treats it as opaque;
- `delegatorAgentRunId`: the only run that may message this one, and the target of its replies.

**(b) Rejected: the existing `taskAgent` section plus `coordinatingNodeId`**, for two reasons:
- **The code defines the presence of `taskAgent` as what makes a file a task agent's own file** (`agent-run-metadata-types.ts`, G1/G2; still true after autobyteus-197). Such a file is hosted, listed, restored and stopped through its coordinator on the same node. A remote run is the opposite: a standalone run with its own root. Every reader of run files would have to change how it classifies files.
- **The type for that file (`TaskAgentRunMetadata`) excludes standalone-run fields**, and its section carries `address`, `launchSource` and `userLaunchSelection`, which nothing on B reads.

- **Hosting follows from where the coordinator is** (contract CM-10). A run whose coordinating run is on the same node is hosted by that run, as today. A run delegated from another node is the host of **its own standalone root** on this node:
  - run history lists it as a top-level run (REQ-112), not under a coordinator;
  - the next message restores it;
  - it gets the host idle schedule (DS-006).

  Existing readers are unchanged: it is a standalone run, and only its root reads `delegatedFrom`.
- **Written once at creation** by `RemoteDelegationReceiver`, through the standalone lifecycle (the only writer of `run_metadata.json`). Never changed.
- **The run's standalone root reads it** to add the delegator as its back-link endpoint and to arm the host idle schedule.

**8. Messages on B: the remote run's own log, `collaboration/communication_messages_active.jsonl`.** This is a standalone host's log, created lazily with the `collaboration/` package on the first message. Same seven fields, same `messageId` as on A.

**9. The work packet** is the remote run's first input, a system task notification exactly as for a local copy. It is recorded in the run's memory (raw traces), not in message logs, also as today.

### What is not stored

- **Peer names inside links or messages:** names are labels; links hold server IDs.
- **Liveness, timers, in-flight requests:** runtime only, as for local copies.
- **Any credential:** REQ-113.

### Lifecycle of the data

| Event | Node A | Node B |
| --- | --- | --- |
| Peer added / renamed / removed | `peers.json` | — |
| Agent published / unpublished | — | `published-agents.json` |
| `delegate_task({node})` | Task `linkedAt` → (B creates) → tree `taskExecutions` += link with `nodeId` → Task `start: started` | `agents/<id>/run_metadata.json` with `delegatedFrom` |
| Delegation refused by B | Task `start: failed` + `startError`; no tree entry | nothing written |
| Message A→B | (B accepts) → delegator's log += line | remote run's log += line |
| Message B→A | delegator's log += line | (A accepts) → remote run's log += line |
| A's or B's history deleted | tree / Task records as today | run folder as today; A's later messages refused "not found" |

### Persisted-data transition decision

- Decision: `Not Affected` for all existing data. Every change is a new file or a new optional field whose absence means "none". **No migration.** Downgrade is unsupported (an older build would drop the new array on its next tree save).
- Data Migration Guideline § 2 checklist:
  1. Need: none.
  2. Availability: a malformed `nodeId` link or back-link is left out with a logged warning naming the run (DESIGN.md rule 7); the run otherwise loads.
  3. Source/target: no source shapes; real files inspected (A-13).
  4. Disposition: N/A.
  5. Commit: the existing atomic tree writer and `run_metadata.json` writer; settings files use the store's atomic JSON write.
  6. Current-only: yes.
  7. Cost: nothing at startup; the settings files are read on use.
  8. References: `nodeId` (link and back-link) → `peers.json` (refusal when absent); `coordinatingRun` → A's tree (validated on every inbound message); `agentRunId` → B's run folder (refusal "not found" when deleted).
  9. Evidence: writer key-set tests per tree kind; restart E2E (AC-106).
  10. Lessons: tolerant read / exact write; no version fields; no field reuse.

## Data-Flow Spine Inventory

| Spine ID | Scope | Behavior | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary | BEH-103/105/106 | Agent on A calls `delegate_task({node,…})` | Remote run on B working on the packet; A's tool result | A: the root's `RootTaskExecutionLifecycle`; B: `RemoteDelegationReceiver` | The handoff |
| DS-002 | Primary | BEH-104 | Delegator on A calls `send_message_to(remote run id)` | Admitted into the remote run on B; both logs written | A: root + `RemoteRunLinks`; B: the remote run's standalone root | Follow-up A→B |
| DS-003 | Primary | BEH-104 | Remote run on B calls `send_message_to(delegator run id)` | Admitted into the delegator on A (woken if needed) | B: standalone root + `RemoteRunLinks`; A: the coordinating root | Reply B→A |
| DS-004 | Primary | BEH-101/102 | Owner in the Nodes tab | Settings stored | `PeerDirectory`, `PublishedAgentService` | Setup |
| DS-005 | Bounded local | BEH-101 | Inbound HTTP request | Handler result | `PeerGateway` | The single entry point (REQ-114, S6 hook) |
| DS-006 | Bounded local | BEH-104/106 | Remote-started host goes quiet | Host shut down, restorable | `StandaloneAgentRunRoot` (host idle schedule) | REQ-107 "shut down for being idle" |

## Primary Execution Spine(s)

```text
DS-001  Agent tool call → delegate_task parser (node) → A root.delegateToNewCopy
        → resolveDelegationPlacement (remote placement: peer + published address)
        → RootTaskExecutionLifecycle (Task link written, serialized)
        → RemoteTaskActivation.prepare → PeerClient.startDelegatedRun → B PeerGateway
        → RemoteDelegationReceiver → B creates a standalone run (published launch settings, back-link)
        ← remote run id → A commit: tree write (`taskExecutions` link with `nodeId`)
        → acceptSeed: work packet sent as the first deliverMessage → B admits → tool result {node, run id}

DS-002  Delegator send_message_to(remote id) → GlobalAgentRunMessageRouter (sender root hasAgentExecution: yes, remote endpoint)
        → A root.deliverExactAgentMessage → RemoteRunLinks.sendToRemote (Task check, pair check, message id)
        → PeerClient.deliverMessage → B PeerGateway → RemoteMessageReceiver
        → B StandaloneAgentRunRoot.acceptRemoteMessage → host ensureReady (restore) → reserve + commit (host log) → admitted
        ← accepted → A appends to the delegator's log → tool result

DS-003  Remote run send_message_to(delegator id) → router (B root hasAgentExecution: yes, back-link endpoint)
        → B root.deliverExactAgentMessage → RemoteRunLinks.sendToRemote → PeerClient.deliverMessage (with coordinatingRun)
        → A PeerGateway → RemoteMessageReceiver → resolve/restore A's root by coordinatingRun
        → root.acceptRemoteMessage (link check, Task check, wake delegator) → commit (delegator's log) → admitted
        ← accepted → B appends to the host's log → tool result
```

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The agent names a peer and a published address. The root resolves this to a remote placement and runs the same serialized activation as a local copy. The remote activation asks B to create the run (B returns its ID without admitting work), A records the link, and only then is the work packet delivered. So the remote run can never reply before A knows the link. | Tool, root, lifecycle, remote activation, peer client, gateway, receiver | A: lifecycle; B: receiver | Peer lookup, published lookup, launch resolution on B, header text |
| DS-002 | A follow-up to a run ID that the root knows as a remote endpoint goes through `RemoteRunLinks`. It applies the Task check and the pair rule (only the delegator), assigns the message ID and sends. B admits the message into the remote run (restoring it if needed) and writes it to that run's log. When B accepts, A writes the same message to the delegator's log. | Router, root, remote links, client, gateway, B root | `RemoteRunLinks` (A) / standalone root (B) | Channel timeout, refusal mapping |
| DS-003 | This is the mirror of DS-002. B's root knows the delegator as the back-link endpoint. The request carries `coordinatingRun`, which A gave at start, so A finds the root without scanning anything. It restores the root if it is not active and checks that the root really holds this link from this peer. | Router, B root, client, A gateway, A root | `RemoteRunLinks` (B) / A's root | Root restore by kind |
| DS-004 | The owner adds a peer by URL. The service fetches `/rest/remote-access/status` and pins the `serverInstanceId`. The owner publishes Agents with their launch settings, validated by the existing model/runtime validator. | UI, GraphQL, settings service, store | `PeerDirectory` / `PublishedAgentService` | Identity fetch, launch validation |
| DS-005 | Every inbound request checks the switch, then that `fromNodeId` is a registered peer, then dispatches to its handler. Nothing else is reachable through these routes. | Gateway | `PeerGateway` | Refusal codes |
| DS-006 | A standalone host with `delegatedFrom` gets the same idle schedule and grace setting as delegated copies. The next inbound message restores it. | Standalone root | `StandaloneAgentRunRoot` | `TaskExecutionIdleShutdownSchedule` reuse |

## Spine Actors / Main-Line Nodes

Delegate tool parser · root (`StandaloneAgentRunRoot` / `RootTeamRun` / `AgentOrgRun`) · `RootTaskExecutionLifecycle` · `RemoteTaskActivation` · `RemoteRunLinks` · `PeerClient` · `PeerGateway` · `RemoteDelegationReceiver` · `RemoteMessageReceiver` · `PeerDirectory` / `PublishedAgentService`.

## Ownership Map

- **`PeerDirectory`**: owns the peers: add (identity check and pinning), rename, remove, and lookup by name or node ID. It is the only reader and writer of `remote-collaboration/peers.json`.
- **`PublishedAgentService`**: owns what this node offers: publish, unpublish, update, launch-settings validation, and the published address of each Agent. It is the only reader and writer of `remote-collaboration/published-agents.json`.
- **`RemoteCollaborationCapability`**: reads the switch `ENABLE_REMOTE_COLLABORATION` through the existing feature-capability mechanism.
- **`PeerClient`**: owns outbound transport. It sets the bounded timeout (QR-102, proposed 20 s), sends the envelope `{fromNodeId, request}`, checks that the answering node's `serverInstanceId` matches the pinned one, and maps transport failures to refusal codes. It knows nothing about runs.
- **`PeerGateway`**: owns inbound admission (switch, registered peer) and dispatch to one handler per request kind. **This is the S6 hook** (REQ-114).
- **`RemoteDelegationReceiver`** (B): owns `startDelegatedRun`. It checks that the Agent is published, creates the standalone run with the published launch settings, workspace and back-link, and returns the run ID without admitting work.
- **`RemoteMessageReceiver`** (both nodes): owns resolving the target root of an inbound message. On B, it resolves the remote run's own standalone root. On A, it uses `coordinatingRun`, restoring the root if it is not active. It then calls `root.acceptRemoteMessage`.
- **`RemoteRunLinks`** (shared, one per root): owns the root's remote endpoints. It provides index membership (`hasAgentExecution`), the pair rule, outbound send (Task check, then send, then sender-log append) and inbound accept (link check, Task check, then local reserve and commit to the receiver's log). Each root plugs it into its delivery and its index.
- **`RemoteTaskActivation`** (shared): the remote variant of `TaskExecutionActivationOperation`. `prepare` calls `startDelegatedRun`; `commit` writes the tree entry; `acceptSeed` sends the work packet. The root's lifecycle is unchanged.
- **Roots**: own their tree (including links with `nodeId`) and their gate. The standalone root also owns its back-link endpoint and host idle schedule.

## Thin Entry Facades / Public Wrappers

| Facade | Owner Behind It | Why | Must Not Own |
| --- | --- | --- | --- |
| `api/rest/remote.ts` (`POST /rest/remote/delegated-runs`, `POST /rest/remote/messages`) | `PeerGateway` | HTTP binding | Admission or business rules |
| `api/graphql/types/remote-collaboration-settings.ts` | `PeerDirectory`, `PublishedAgentService` | UI API | Validation |

## Removal / Decommission Plan (Mandatory)

| Item | Why | Replaced By | Scope | Notes |
| --- | --- | --- | --- | --- |
| None | New capability; no path is replaced | — | — | Dead-code check in touched files during implementation (Principle 7) |

## Return Or Event Spine(s)

The tool results are the return path (DS-001/002/003 `←` steps). Presentation: an accepted inbound message emits the receiver's existing `INTER_AGENT_MESSAGE` / member presentation event, with the sender's node in the header. No new event types.

## Bounded Local / Internal Spines

- `PeerGateway` (DS-005): `request → switch on? → fromNodeId registered? → handler by kind → result | refusal`.
- Host idle schedule (DS-006): `host status idle/offline/error → arm grace → fire → quiet? → shut down host`. A `running` status, or a message or lease, cancels it. It reuses `TaskExecutionIdleShutdownSchedule` and `AUTOBYTEUS_TASK_EXECUTION_IDLE_SHUTDOWN_GRACE_MS`.

## Off-Spine Concerns Around The Spine

| Concern | Spine | Serves | Responsibility | Why | Risk If On Main Line |
| --- | --- | --- | --- | --- | --- |
| Published address map | DS-001, DS-004 | Receiver, settings | Address of each published Agent via the existing `CatalogAddressMap` over the published set | Same address rules as the catalog | Duplicated address policy |
| Launch resolution on B | DS-001 | Receiver | Validate the published settings with `RunModelSelectionValidator`; refuse "cannot run there: <reason>" | REQ-109 | Mixed policy in receiver |
| Header wording | DS-001/002/003 | Builders | `… sender run id "X" on node "<peer name>"` and the work packet's `… on node "<name>"`, in the existing builders (`task-execution-input.ts`, `root-communication-runtime-builder.ts`) | One wording owner | Wording drift across paths |
| Refusal codes | All | Client, gateway, roots | One code list (`remote-refusals.ts`) mapped to `{accepted:false, code, message}` / `{delegated:false, message}` | REQ-109 | Ad hoc strings |

## Ownership Boundaries

- Tools and runtime adapters know only the `node` parameter. They never touch the channel.
- Selector rule (DEC-111): `node` exists only on `delegate_task`, naming where a new copy starts. `send_message_to` keeps its parameters: the router asks the sender's root `hasAgentExecution(run id)`, and the root answers for its local runs and its remote endpoints alike; the root then routes a remote endpoint through `RemoteRunLinks`. The global live-only path never reaches a peer. A run ID that is neither local nor linked keeps today's refusal.
- Roots reach the channel only through `RemoteRunLinks` / `RemoteTaskActivation`. These depend on a narrow `RemoteRunChannel` (`startDelegatedRun`, `deliverMessage`) and a peer lookup, never on HTTP.
- `src/remote-collaboration/` reaches roots only through their public root APIs: `acceptRemoteMessage`, plus the managers' resolve/restore.

## Boundary Encapsulation Map

| Boundary | Encapsulates | Callers | Forbidden Bypass | If Too Thin |
| --- | --- | --- | --- | --- |
| `PeerGateway` | Admission checks, handler dispatch | REST routes | A route calling a receiver directly | Add a handler kind |
| `PeerClient` (via `RemoteRunChannel`) | HTTP, timeout, identity check | `RemoteRunLinks`, `RemoteTaskActivation`, settings | Roots using `fetch` | Extend the port |
| Root `acceptRemoteMessage` | Link check, Task check, wake, log commit | `RemoteMessageReceiver` | Receiver posting to an AgentRun directly | Extend the root API |
| `PeerDirectory` / `PublishedAgentService` (each for its file) | The settings files | Gateway, client, receivers, GraphQL | Reading a JSON file elsewhere | Add a query |

## Dependency Rules

- Allowed directions:
  - `agent-tools` → `agent-collaboration`;
  - `agent-collaboration/execution/remote` → its `RemoteRunChannel` interface (owned by `agent-collaboration`, implemented by `remote-collaboration`);
  - `remote-collaboration` → root managers' public APIs and `remote-access` (identity).
- Forbidden:
  - `agent-collaboration` importing `remote-collaboration` HTTP code;
  - `remote-collaboration` reading root trees or message logs directly;
  - runtime backends (Codex/Claude/AutoByteus) knowing about nodes.

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity Shape | Notes |
| --- | --- | --- | --- | --- |
| `delegate_task({node?, recipient_address, description})` | Delegation | `node` given → remote placement; `task_id`/`reference_files` with `node` → refused | `node` = peer name on this node; address = published address on the peer | Result adds `node` |
| `send_message_to({target_agent_run_id, content})` (unchanged parameters) | Message | A run ID the root knows as a remote endpoint is sent through the link; `reference_files` to a remote endpoint → refused | Run ID (unique) | The tool result and header name the node |
| `POST /rest/remote/delegated-runs` | Start a remote run | B creates the run; no work yet | `{fromNodeId, requestId, publishedAddress, delegator:{agentRunId}, coordinatingRun:{kind, runId}}` → `{agentRunId}` | Refusals as codes |
| `POST /rest/remote/messages` | Deliver one message | Admit into the target run | `{fromNodeId, messageId, sender:{agentRunId}, target:{agentRunId}, coordinatingRun?, content, messageType, kind: "work_packet" \| "message"}` | `messageId` is shared by both logs (CM-9). The receiver ignores a `messageId` it already holds (idempotent). |
| `RemoteRunChannel` | Outbound channel | Two methods above | `RemoteRunReference` | Port owned by `agent-collaboration` |
| Root `acceptRemoteMessage(input)` | Inbound into one root | See ownership | `{fromNodeId, sender: RemoteRunReference, targetAgentRunId, messageId, …}` | All three root kinds |
| GraphQL `peerNodes` / `addPeerNode` / `renamePeerNode` / `removePeerNode` / `publishedAgents` / `publishAgent` / `updatePublishedAgent` / `unpublishAgent` | Settings | CRUD | `nodeId`, `definitionId` | — |

## Interface Boundary Check

| Interface | Singular? | Identity Explicit? | Ambiguity Risk | Action |
| --- | --- | --- | --- | --- |
| `delegate_task` with `node` | Yes | Yes | Low | Without `node`, the local path, unchanged |
| `send_message_to` by run ID | Yes | Yes (unique run ID; the link holds `(peer, run id)`) | Low | No guessing: the root's index decides local vs remote endpoint |
| `/delegated-runs`, `/messages` | Yes | Yes | Low | Two request kinds, not one generic "command" route |
| `acceptRemoteMessage` | Yes | Yes | Low | — |

## Main Domain Subject Naming Check

Naming rule (the user, SR-012):
- **peer** is the other node;
- **remote** is anything that lives on a peer;
- the feature and its subsystem are **remote collaboration**;
- **"cross-node" is not used in names.**
- **"Peer" names are always compound** (`PeerNode`, `PeerClient`, `PeerGateway`, `PeerDirectory`), never a bare `Peer` type. Existing uses of the word mean other things (checked 2026-10-20): `peerAddress` / `isLoopbackPeerAddress` in the server is the TCP caller's address; `peerId`, `peerType` and `PeerCandidate` in `autobyteus-message-gateway` are a chat counterpart in external channels; the web has only test fixture names and Tailwind's `peer` class.

`PeerNode` is chosen over `RemoteNode`, because "remote node" already means a server the desktop app opens a window to (Manage Nodes, `nodeType: "remote"`).

| Node / Subject | Name | Natural? | Drift Risk | Action |
| --- | --- | --- | --- | --- |
| Another registered node | `PeerNode` (`peers.json`, `PeerDirectory`) | Yes | Desktop "remote node" | Not `RemoteNode` |
| The API a peer calls | `/rest/remote/delegated-runs`, `/rest/remote/messages`; route class `REMOTE_PEER`; `PeerGateway` | Yes | `/rest/remote-access/` (Phone Access) | Exact prefixes in the route policy |
| Calling a peer | `PeerClient` (implements `RemoteRunChannel`) | Yes | — | — |
| A run on a peer | `RemoteRunReference {nodeId, agentRunId}` | Yes | — | — |
| A root's links to remote runs and messaging over them | `RemoteRunLinks` (was `RootRemoteLinks`) | Yes | — | — |
| The link kind in memory | `RemoteTaskAgentExecution` | Yes | — | — |
| Starting a delegated run on a peer | `RemoteTaskActivation` | Yes | — | — |
| Handling incoming requests | `RemoteDelegationReceiver`, `RemoteMessageReceiver` | Yes | — | — |
| What this node offers | `PublishedAgentService` (`published-agents.json`) | Yes | — | — |
| The switch | `ENABLE_REMOTE_COLLABORATION`, `RemoteCollaborationCapability`; Nodes tab "Remote Collaboration" | Yes | — | — |
| Back-link on B | `delegatedFrom` (type `DelegatedFrom`) | Yes | — | — |
| The coordinating run named in requests and in `delegatedFrom` | `coordinatingRun` (one name everywhere) | Yes | `coordinatingRoot` (removed) | — |

## Existing Capability / Subsystem Reuse Check

| Need | Existing | Decision | Why |
| --- | --- | --- | --- |
| Peer identity | `ServerInstanceIdentityService`, `/rest/remote-access/status` | Reuse | Stable ID, public route |
| Switch | Feature capability (`ENABLE_*`, `FeatureCapabilityToggleCard`) | Reuse | Same pattern as Applications / Skill Improvement |
| Settings file | Memory Sync config-service pattern | Reuse the pattern | JSON in app data |
| Remote run on B | Standalone run root | Extend (back-link, idle schedule, `acceptRemoteMessage`) | Restores on message; shows in history |
| Activation | `RootTaskExecutionLifecycle` | Reuse (new operation variant) | Task link, serialization, failure handling |
| Message logs | `MessageLog`, `messageLogOwners` | Extend (a remote owner kind that is skipped) | CM-9 per node |
| Idle shutdown | `TaskExecutionIdleShutdownSchedule` | Reuse | Same grace setting |
| Published addresses | `CatalogAddressMap` | Reuse | Same rules |
| Launch validation | `RunModelSelectionValidator`, `RuntimeAvailabilityService` | Reuse | Same checks |

## Subsystem / Capability-Area Allocation

| Subsystem | Owns | Spines | Decision |
| --- | --- | --- | --- |
| `src/remote-collaboration/` (new) | Peers, publishing, switch reading, channel, gateway, inbound receivers | DS-001 … DS-005 | Create New |
| `src/agent-collaboration/execution/remote/` (new folder) | `RemoteRunLinks`, `RemoteTaskActivation`, `RemoteRunChannel`, `RemoteRunReference` | DS-001 … DS-003 | Extend |
| `src/agent-collaboration/collaborators/` | Remote placement in `resolveDelegationPlacement` | DS-001 | Extend |
| `src/agent-tools/task-delegation/` | `node` parameter, result | DS-001 | Extend |
| `src/standalone-agent-run-root/`, `src/agent-team-execution/`, `src/agent-org-execution/` | Wiring of `RemoteRunLinks`, `nodeId` links in trees; standalone back-link and idle schedule | DS-001 … DS-003, DS-006 | Extend |
| `src/api/` | REST routes, route policy class, GraphQL | DS-004, DS-005 | Extend |
| `autobyteus-web` | Nodes tab "Remote Collaboration", store, capability toggle | DS-004 | Extend |

## Final File Responsibility Mapping

| File | Owner | Concern |
| --- | --- | --- |
| `src/remote-collaboration/domain/peer-node.ts` | Settings | `PeerNode {nodeId, name, baseUrl, addedAt}` |
| `src/remote-collaboration/domain/published-agent.ts` | Settings | `PublishedAgent {agentDefinitionId, runtimeKind, llmModelIdentifier, llmConfig, workspaceRootPath, autoExecuteTools, publishedAt}` |
| `src/remote-collaboration/domain/remote-requests.ts` | Channel | Request/response shapes of the two kinds and the envelope |
| `src/remote-collaboration/domain/remote-refusals.ts` | Channel | Refusal codes and agent-facing texts |
| `src/remote-collaboration/settings/peer-store.ts`, `published-agent-store.ts` | Settings | Tolerant read / exact write of `peers.json` and `published-agents.json` |
| `src/remote-collaboration/settings/peer-directory.ts` | Settings | `PeerDirectory` |
| `src/remote-collaboration/settings/published-agent-service.ts` | Settings | `PublishedAgentService` |
| `src/remote-collaboration/settings/remote-collaboration-capability.ts` | Settings | `RemoteCollaborationCapability` (`ENABLE_REMOTE_COLLABORATION`) |
| Modified: `src/run-history/domain/run-execution-tree-shared-records.ts` and the tree schemas | Run history | `RemoteTaskAgentExecution` kind; `nodeId` on links |
| Modified: `src/run-history/store/agent-run-metadata-types.ts` | Run history | `DelegatedFrom` section type on standalone run metadata |
| `src/remote-collaboration/channel/peer-client.ts` | Channel | Outbound HTTP; implements `RemoteRunChannel` |
| `src/remote-collaboration/channel/peer-gateway.ts` | Channel | Inbound admission + dispatch |
| `src/remote-collaboration/inbound/remote-delegation-receiver.ts` | B | Create the remote run |
| `src/remote-collaboration/inbound/remote-message-receiver.ts` | Both | Resolve the target root and call `acceptRemoteMessage` |
| `src/agent-collaboration/execution/remote/remote-run-reference.ts` | Shared | `RemoteRunReference` |
| `src/agent-collaboration/execution/remote/remote-run-channel.ts` | Shared | Port interface |
| `src/agent-collaboration/execution/remote/remote-run-links.ts` | Shared | Endpoints, pair rule, send, accept |
| `src/agent-collaboration/execution/remote/remote-task-activation.ts` | Shared | The remote activation operation |
| `src/api/rest/remote.ts`, `src/api/graphql/types/remote-collaboration-settings.ts` | Facades | Bindings |
| Modified: `remote-access-route-policy.ts` | API | New class `REMOTE_PEER`, allowed without a credential; the gateway checks |
| Modified: `task-delegation-tool-input-parsers.ts`, `-parameter-schemas.ts`, `task-delegation-tool-serialization.ts`, `agent-team-collaboration-llm-contract.ts` | Tools | `node` parameter of `delegate_task`, its description, result `node` |
| Modified: `catalog-delegation.ts` | Collaborators | `DelegationPlacement` kind `remote_agent` |
| Modified: `task-execution-input.ts`, `root-communication-runtime-builder.ts` | Builders | Node in headers |
| Modified: `root-communication-engine.ts` | Shared | Accept a supplied message ID for inbound messages |
| Modified: `task-agent-message-logs.ts` | Run history | Remote log owner (skipped) |
| Modified: the three root trees' types, schemas, stores; the three roots' index, delivery, adapters | Roots | `nodeId` on links, link kinds in readers; `RemoteRunLinks` wiring |
| Modified: standalone run metadata type and store; `standalone-agent-run-root.ts` | Standalone | `delegatedFrom` section (standalone metadata type and store); back-link endpoint; idle schedule |
| Web: `NodeManagerTabs.vue` (+ tab), `RemoteCollaborationCard.vue`, `stores/remoteCollaborationStore.ts`, GraphQL documents, localization | Web | Settings UI |
| Docs: `collaboration_model.md` (drafted in this design round: vocabulary, CM-10 … CM-12, § 3, § 4, § 5), `agent_communication.md`, `agent_team_execution.md`, `standalone_agent_run_root.md`, `agent_tools.md`, new `docs/modules/remote_collaboration.md`, `autobyteus-web/docs/settings.md` | Docs | — |

## Concrete Examples / Shape Guidance

| Topic | Good | Avoided | Why |
| --- | --- | --- | --- |
| Tool call | `delegate_task({node:"docker", recipient_address:"/publisher", description:"Publish the video draft …"})` → `{delegated:true, target_kind:"agent", node:"docker", target_agent_run_id:"agent_7f3…", task_id?}` | `recipient_address:"//docker/publisher"` | Explicit `node` (DEC-111) |
| Follow-up | `send_message_to({target_agent_run_id:"agent_7f3…", content})`, a copy of the returned ID | `send_message_to({node:"docker", target_agent_run_id:"agent_7f3…"})` | A second field to keep paired with the ID adds failures, not information (DEC-111) |
| Header on B | `You have a new task from the agent with sender run id "agent_a1…" on node "desktop". When you finish …, tell that agent using send_message_to with target_agent_run_id set to that sender run id.` | Sender named by a node-qualified ID | Names are per-node labels; the node is information, the run ID is what the agent copies |
| Tree entry on A | `{"address":"/publisher","agentRunId":"publisher_7f3…","nodeId":"srv_…","delegatorAgentRunId":"agent_a1…","startedAt":"…"}` in `taskExecutions`, loaded as a remote Agent link | A separate `remoteTaskExecutions` list (rejected in SR-009: code that must see remote runs would silently miss them) | One list of links; explicit kinds in memory |
| Activation order | B creates the run (no work) → A writes the link → A sends the work packet | B starts working immediately → its reply can arrive before A knows the link | Avoids a real race |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why Considered | Decision | Replacement |
| --- | --- | --- | --- |
| Version check / negotiation between nodes | REQ-114 (old wording) | Rejected (rule 9, SR-005) | Same release on both nodes |
| Reading old links without `nodeId` via a version branch | New field | N/A | Absent `nodeId` means this node (tolerant reader) |

## Change / Refactor Sequence

0. **Contract and data model first** (the user, 2026-10-19). The collaboration model is updated in this branch (CM-10 … CM-12, § 3 storage, § 4, § 5; drafted by the Solution Designer and reviewed with this design). Then the on-disk types, readers and writers of § On-Disk Data Model, with their key-set tests, before any routing code.
1. `src/remote-collaboration/` settings, store, switch, GraphQL, web tab (DS-004). This can be tested on its own.
2. Channel: `PeerClient`, gateway, REST routes, route-policy class (DS-005).
3. `agent-collaboration/execution/remote/`: reference, port, `RemoteRunLinks`, `RemoteTaskActivation`; engine message-ID extension; remote log owner.
4. Standalone root: back-link, endpoint, `acceptRemoteMessage`, host idle schedule. `RemoteDelegationReceiver`, `RemoteMessageReceiver`.
5. Delegation: `node` parameter, remote placement, tree array in the standalone root (A side), headers. **First end-to-end: a standalone run on A ↔ B.**
6. Team and Org roots: tree array, `RemoteRunLinks` wiring, `acceptRemoteMessage`, restore by `coordinatingRun`.
7. Docs; two-server E2E (two server instances on different ports and data dirs); the user's desktop + Docker check.

## Key Tradeoffs

- **Request/response HTTP vs. a persistent connection:** simpler, stateless, works over every VPN; cost: one TCP/HTTP setup per message (negligible at agent speeds).
- **One list with `nodeId` and explicit kinds in memory vs. a separate list:** the unified list matches the model (a delegated run with a location) and makes every link walker handle remote runs explicitly. The cost is touching each walker once; a separate list would leave existing code untouched but blind to remote runs.
- **Waiting for B's acceptance:** keeps today's tool-result meaning. The remote HTTP call runs inside the root's serialized task queue, so a slow peer holds that root's queue for at most the timeout.
- **Decided (SR-011, Solution Designer within the design; the user informed):** points 2–4 as proposed. No automatic transport retries; the call to the peer runs inside the root's serialized task queue (bounded by the ≤ 20 s timeout); standalone delegators first, then Team and Org (Change Sequence steps 5–6).
- **No automatic transport retries:** QR-101 holds because nothing retries. A timeout after B accepted leaves the outcome unknown to A (RSK-106).

## Risks

- RSK-106: a timeout after B accepted. For a delegation, B holds a created run without work (it never received the packet), which idles out and stays in B's history as empty. For a message, it is delivered on B but missing from A's log, and A reports "the peer did not answer in time; it may have been delivered".
- RSK-107: restoring a whole Team or Org root on A just to deliver a reply. This is the same as the user reopening it; it costs the same as today's restore.
- RSK-103 (identity is claimed, not proven) until S6.
- RSK-108: the tree writers of three root kinds must all carry the new array (a writer key-set test per kind).

## Task Size And Architectural Risk (Mandatory)

- Task size: `Large`
- Size rationale:
  - A new subsystem (`src/remote-collaboration/`: settings, channel, gateway, inbound receivers).
  - A new shared component in `agent-collaboration/execution/remote/`, wired into all three root kinds (standalone, Team, Org): index, delivery, activation, trees.
  - Tool contract changes (`delegate_task` `node`).
  - Standalone run metadata and root changes (`delegatedFrom`, host idle schedule).
  - New REST routes and route-policy class; GraphQL settings API; a web Nodes tab.
  - Docs: the contract and module docs.
  - Roughly 30–40 source files across server and web, plus two-server E2E.
- Architectural risk: `High`
- Risk rationale:
  - **Contract:** a new inter-node contract, an agent-facing tool parameter, and the collaboration model (CM-10 … CM-12).
  - **Persistence:** new optional fields in three tree kinds whose writers are exact (RSK-108); a new run-metadata section; new settings files.
  - **Security:** a new inbound surface on the trusted network (RSK-101; no authentication by design until S6).
  - **Concurrency and lifecycle:** remote activation inside the serialized task queue; inbound wake and root restore across processes; timeout ambiguity (RSK-106).
  - **Ownership boundary:** the run delivery path gains remote endpoints.
- Escalation trigger: implementation finds that a root kind cannot add remote endpoints through `RemoteRunLinks` without changing `RootCommunicationEngine`'s admission rules, or that a tree writer outside the three named stores writes `taskExecutions`. Either is a Design Impact back to the Solution Designer.

## Guidance For Implementation

- Reproduction to start from, from the investigation notes: `None` (new capability). Start the two-server E2E from the existing multiprocess harness `tests/e2e/memory-sync/memory-sync-multiprocess.e2e.test.ts` (INV P-5). The premises are checked in INV P-1 … P-4.

- Follow the sequence. Prove step 5 end to end before step 6.
- Keep every agent-facing text in the existing wording owners.
- Every refusal returns its code and leaves nothing behind (no Task link stays `started` after a refusal, no tree entry).
- Tests: unit tests for gateway admission, settings and the parser; key-set tests for each tree writer; two-server E2E for AC-101 … AC-111 with a scripted runtime.
