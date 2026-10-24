# Design Spec — node-vocabulary (autobyteus-290)

## Solution And Approval Basis

- Package: `node-vocabulary`; Task autobyteus-290.
- Requirements: [requirements-doc.md](requirements-doc.md), `Approved` at SR-002. U-1 (a): keep stored names. U-2 (a): rename the identity wire field to `nodeId`.
- Current solution revision ID: `SR-004` (FU-001 pulled in; the phone apps' entry names). Design status: `Ready`.
- Authorities read:
  - `solution-designer/SKILL.md`;
  - `references/architecture-design.md`;
  - `references/design-principles.md`, re-read 2026-10-24 after autobyteus-agents-57 (Principle 15 "One Vocabulary", the "Vocabulary drift" trigger);
  - `references/design-examples.md`;
  - `templates/design-spec-template.md` (the new naming column);
  - the repository's `DESIGN.md` (rules 8, 9; the Data Migration Guideline);
  - `collaboration_model.md`.
- Conflicts or discrepancies: `DESIGN.md` does not yet say where the project glossary is (Principle 15 expects it). Resolved in this design (§ Glossary).

## Current-State Read

The audit is in [investigation-notes.md](investigation-notes.md), V-01 … V-09, with file and line citations. In short:
- `nodeId` names two different IDs (V-01, V-09);
- a node's ID has two names (V-02);
- "remote" and "available" are used where registered peers are meant (V-03);
- "peer" has three other meanings (V-04, V-05, V-08);
- one stored field has no reader (V-06).

## Task Size And Architectural Risk (Mandatory)

- `task_size`: `Large`. Renames span the server, the web window, the Electron shell, the iOS app, the tool contract, the wire between nodes and clients, and the docs: well over 100 files, in six steps.
- `architectural_risk`: `High`. It changes the identity wire field (U-2), read by the desktop, peers and the phone apps, and an agent-facing tool name. Stored data is not changed (U-1), but stored-to-code name mapping is added in each store's one owner.
- Escalation trigger: none further; behavior must not change. Any step that would change behavior is a defect of that step.

## Intended Change

One vocabulary, applied everywhere. Each step is a rename with no behavior change, tests green after each.

## Glossary (Principle 15)

- **Where:** `collaboration_model.md` § 1 "Vocabulary" is the project glossary. `DESIGN.md` gets one line under "Project-specific design documents": "Domain vocabulary: the glossary in `collaboration_model.md` § 1 is the authority for domain words (Principle 15)."
- **Entries added or tightened in § 1:**
  - **Node:** one AutoByteus server, identified by its **node ID** (`srv_…`).
  - **This node / remote node:** a point of view. Every node other than this one is a remote node, even a Docker node on the same machine. *Remote* names a location.
  - **Peer:** a remote node registered with this node (mutual registration, pinned node ID). *Peer* names a relationship; a remote node that isn't registered is not a peer.
  - **Embedded local:** how the desktop starts its own server; not a kind of node.
  - **Entry:** a client's own record of a node it can open (the desktop's node list, the mobile session), identified by an **entry ID**. It is not the node and not its node ID.
  - **Client address:** the network address a request came from (not a peer).
- **§ 2.2:** "A delegated run is a peer, not a part" becomes "A delegated run is a run of its own, not a part" (V-08). Every other "peer" in the doc keeps the registered-node meaning.

## Change Scope (Mandatory)

- **In scope:** the renames below, in server, web, Electron, iOS (the identity field only), tools and texts, GraphQL types where they carry these words, docs and the glossary.
- **Derived consumers (Principle 11):** see the per-step consumer lists. The stored files (U-1) are read through one mapping owner each.
- **Left alone:**
  - `PeerNode`, `peers.json`, add peer, GraphQL `peerNodes` / `peerNodeOffer` / `peerNodeAvailability`;
  - `EMBEDDED_NODE_ID = 'embedded-local'`, `nodeType: 'embedded' | 'remote'`, `isDesktopEmbeddedNode`;
  - the remote chip and remote runs;
  - the `remote-collaboration` and `remote-access` feature names (remote access = access from another device, a location meaning);
  - the localStorage key's value `autobyteus.node_registry.v1` (a stored value, rule 8);
  - every behavior.
- **Memory Sync's "source node id" (V-10), left alone:** it is a user-entered import identity (`memory-sync-config-service.ts:81-98`, label "Source node id" in `memorySyncSettings.ts:29`), stored in the sync state and sent to the hub. It is not the node's ID. Renaming it, or making it the node's ID, changes stored data and the hub protocol: FU-002, the user's decision.
- **Follow-ups:** FU-002 (Memory Sync's source identity). FU-001 is pulled in as Step 1b (the user).

## Steps (each no behavior change, green before the next)

### Step 1: the node's ID is `nodeId` (V-02, U-2)

- **Server:**
  - `remote-access/services/server-instance-identity-service.ts` → `node-identity-service.ts`: `ServerInstanceIdentityService` → `NodeIdentityService`, `getServerInstanceId` → `getNodeId`, `isValidServerInstanceId` → `isValidNodeId`.
  - The stored identity file keeps its field `serverInstanceId` (U-1). This service is its only reader and writer, and maps it. Documented in its header.
- **Wire:** `/rest/remote-access/status` answers `nodeId` instead of `serverInstanceId` (U-2, a clean cut).
- **Readers, all renamed:**
  - `PeerClient.fetchServerInstanceId` → `fetchNodeId` (`PeerIdentityProbe`);
  - web `utils/nodeIdentityProbe.ts`, `types/remoteAccess.ts` `RemoteAccessStatus.nodeId`, `isServerInstanceId` / `SERVER_INSTANCE_ID_PATTERN` → `isNodeId` / `NODE_ID_PATTERN`;
  - `stores/phoneAccessStore.ts`, `nodeRowStatus.ts`, `nodeListStore.ts`, `components/settings/nodes/NodeRow.vue`, `NodeConnectionDetails.vue`;
  - iOS `AutoByteusMobileCore/ConnectionValidator.swift` (`serverInstanceID = "serverInstanceId"` → `nodeId`) and its tests.
- **UI text:** none needed; the Nodes tab already says "Node ID" (`localization/messages/en/nodesPage.ts:57`).
- **Consumers check:** a search for `serverInstanceId` and `ServerInstance` finds only the identity service's stored-field mapping and the desktop registry mapping (Step 4).

### Step 1b: no version field on the status answer (REQ-909, the user's request)

- **Server:** `api/rest/remote-access.ts:30` stops answering `compatibilityVersion`.
- **Readers:**
  - web `types/remoteAccess.ts:49` (the field), the mobile shell specs' fixtures;
  - the server E2E type `phone-access-running-routes.e2e.test.ts:36`;
  - iOS `ConnectionValidator.swift`: the field, its decode and encode, `minimumCompatibilityVersion` and the `>= minimum` guard (line 135), plus `ConnectionDiagnosticMapper.incompatibleServer()` if nothing else reaches it (it is also referenced at `ConnectionDiagnostic.swift:110`; keep it only if that path is live, otherwise remove it as dead code, Principle 7); the iOS tests' JSON.
  - Android: no reader (search: none).
- **Behavior:** the only change is that an iOS app no longer refuses a server for a version number (rule 9: versions are the user's to keep together). Everything else is unchanged.

### Step 2: registered-peer names say peer (V-03)

- **Server:**
  - `remote-collaboration/discovery/remote-node-discovery.ts` → `peer-node-discovery.ts` (`RemoteNodeDiscovery` → `PeerNodeDiscovery`);
  - `agent-collaboration/execution/remote/remote-discovery-channel.ts` → `peer-discovery-channel.ts` (`RemoteDiscoveryChannel` → `PeerDiscoveryChannel`, `AvailableNode` → `PeerNodeStatus`, `listNodes` → `listPeerNodes`, the bind/find functions);
  - `RemotePeer` → `PeerNodeRef` (`remote-run-channel.ts` and its users).
- **Consumers:** `remote-collaboration-services.ts`, `compositions/remote-collaboration-composition.ts`, the tool contracts (Step 3), the GraphQL resolver that serves availability, tests.

### Step 3: the tool is `list_peer_nodes` (V-03; the user's name), one step (PTM: coordinate with autobyteus-260)

- **Code:** `agent-tools/agent-discovery/list-available-nodes-*` → `list-peer-nodes-*` (contract, tool, MCP adapter provider). `LIST_AVAILABLE_NODES_*` → `LIST_PEER_NODES_*`; the exposure flag `listAvailableNodesEnabled` → `listPeerNodesEnabled`; the resolver and Claude tooling option names.
- **Texts:**
  - the tool description: "List the peer nodes registered on this node, …" (unchanged apart from naming itself);
  - the `list_available_agents` and `delegate_task` texts and the refusal hints that name `list_available_nodes` → `list_peer_nodes` (`remote-refusals.ts`).
- **Docs:** `remote_collaboration.md`, `agent_tools.md`, `agent_communication.md`.
- **Agent definitions in this repository** that select the tool: none found. The PTM's own config, skill and board are updated by the PTM through the Agent Package Creator after this ships (PTM, 2026-10-24).
- **Abilities and exposure unchanged:** opt-in by definition, the same results.

### Step 4: the client's own record is an entry (V-01, V-06, V-09; U-1)

- **Types:**
  - `types/node.ts`: `NodeProfile` → `NodeEntry`; `id` → `entryId`; `serverInstanceId` → `nodeId` (from Step 1); `isSystem` removed (V-06; no reader);
  - `WindowNodeContext.nodeId` → `entryId`;
  - the registry changes' `nodeId` → `entryId`;
  - `EMBEDDED_NODE_ID` keeps its value and is named `EMBEDDED_ENTRY_ID`.
- **Stores and shell:** `stores/nodeStore.ts`, `stores/windowNodeContextStore.ts` (`nodeId` → `entryId`, `isEmbeddedWindow` stays), `electron/nodeRegistryStore.ts`, `electron/preload.ts`, `electron/types.d.ts`, `electron/application/electronApplication.ts`, and every caller (the 87 web files using `nodeId`, each classified: entry meaning → `entryId`; node meaning stays `nodeId`).
- **Stored-name mapping (U-1), one owner:** a new `utils/nodeEntryStorage.ts` (`toStoredNodeEntry` / `fromStoredNodeEntry`), used by both stores that persist the snapshot (the Electron file and the window's localStorage copy). It maps `entryId` ⇄ stored `id` and `nodeId` ⇄ stored `serverInstanceId`. It reads and ignores a stored `isSystem`, and no longer writes it. Old files load unchanged (rule 7); there is no migration.
- **Phone apps:** iOS `SavedNodeProfile` → `SavedNodeEntry` (13 files) and Android `NodeProfile` → `NodeEntry` (`ui/ConnectionScreen.kt` and its users). Their stored keys stay through each app's one store owner (U-1).
- **Mobile (V-09):** `MobileNodeSession.nodeId` → `entryId` (`MOBILE_NODE_ID` → `MOBILE_ENTRY_ID`). The stored credential session keeps its field name through `utils/remoteAccess/mobileCredentialStorage.ts`, its one owner.
- **Consumers check:** every window-scoped endpoint resolver, the Nodes tab, phone access, the window switcher; the remote runs store keeps `nodeId` (the node's ID).

### Step 5: other meanings of "peer" (V-04, V-05, V-08)

- **Client address:** `api/security/remote-access-local-trust.ts` (`NormalizedPeerAddress` → `NormalizedClientAddress`, `normalizePeerAddress` → `normalizeClientAddress`, `isLoopbackPeerAddress` → `isLoopbackClientAddress`), and the route policy, websocket auth, URL resolver and MCP local access that call them.
- **Siblings:** `stores/runHistoryTeamExecutionRows.ts` wording; e2e fixture `task-agent-peer-sidebar.page.vue` → `task-agent-sibling-sidebar.page.vue` and its spec references.
- **The contract:** `collaboration_model.md` § 2.2 (V-08).

### Step 6: glossary and docs (REQ-907)

The glossary entries above; the `DESIGN.md` pointer; `remote_collaboration.md`, the web `settings.md`, `agent_tools.md`, `agent_communication.md`.

## Main Domain Subject Naming Check (Principle 15)

| Node / Subject | Current / Proposed Name | Natural And Self-Descriptive? | Same Meaning And Name Everywhere, Per The Glossary? | Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- | --- |
| A server's identity | `serverInstanceId` / `nodeId` → `nodeId` | Yes | Yes after Step 1 | stored field keeps old name | one mapping owner, documented |
| The client's record of a node | `NodeProfile.id`, `nodeId` → `NodeEntry.entryId` | Yes | Yes after Step 4 | `nodeId` reused for it | Step 4 |
| Registered remote node | `RemotePeer`, `AvailableNode`, "available nodes" → `PeerNodeRef`, `PeerNodeStatus`, `list_peer_nodes` | Yes | Yes | qualifier repeats or contradicts | Steps 2–3 |
| Request origin address | `peerAddress` → `clientAddress` | Yes | Yes | collided with peer | Step 5 |
| A delegated run's standing | "a peer" → "a run of its own" | Yes | Yes | collided with peer | Step 5 |

## Persisted Data / State Transition Decision

`Directly Usable — No Migration` (U-1).
- The identity file, the desktop node list file, its localStorage copy and the mobile session keep their stored field names. Each is read and written by one owner that maps them.
- `isSystem` is ignored when read and no longer written. Old code doesn't read new files (rule 9), and new code reads old files (rule 7).

## Legacy Removal / Backward-Compatibility Rejection Log

| Candidate | Rejected because |
| --- | --- |
| Answering both `serverInstanceId` and `nodeId` on the status route | Rule 9: a clean cut; every reader is renamed in Step 1 |
| Aliases for the old tool name | Principle 8 / rule 9: one name |
| A data migration for stored names | U-1 (the user's decision): no behavior gain; rule 8 |

## Verification

- After each step: the server and web suites, typecheck; the iOS unit tests for Step 1.
- **At the end:**
  - the two-server E2E (Nodes tab, pairing identity, discovery with `list_peer_nodes`, remote runs);
  - the Nodes tab browser check;
  - loading a pre-change desktop node list and `peers.json` from a clean clone (AC-903);
  - the word-list search (AC-901): `serverInstanceId` only in the two mapping owners; none of `list_available_nodes`, `AvailableNode`, `RemoteNodeDiscovery`, `RemoteDiscoveryChannel`, `RemotePeer`, `PeerAddress`, `isSystem`, `NodeProfile`, `MOBILE_NODE_ID`; `nodeId` only in node-ID meaning.

## Risks

- RSK-901: an older phone app or desktop can't identify an updated node until it updates (U-2, rule 9; the user accepted it).
- RSK-902: classifying 87 web `nodeId` uses by meaning is manual. The type change (`entryId` on `WindowNodeContext` and `NodeEntry`) makes the compiler find every entry-meaning use. The rest stays `nodeId`.
