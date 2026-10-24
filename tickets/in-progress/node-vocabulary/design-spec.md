# Design Spec — node-vocabulary (autobyteus-290)

## Solution And Approval Basis

- Package: `node-vocabulary`; Task autobyteus-290.
- Requirements: [requirements-doc.md](requirements-doc.md), `Approved` at SR-002. U-1 (a): keep stored names. U-2 (a): rename the identity wire field to `nodeId`.
- Current solution revision ID: `SR-005` (ARCH-REV-001: AR-901 … AR-903, N-901 … N-904). Design status: `Ready`.
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

- **Where (N-901):** a repository-level `GLOSSARY.md` at the workspace root is the project glossary. It holds the node words below, which govern the server, the web, the desktop shell and the phone apps.
  - `collaboration_model.md` § 1 keeps the collaboration words (Run, Unit, Team, Org, …). Its Node and Peer entries link to `GLOSSARY.md` instead of defining them again, so there is one definition per word.
  - `DESIGN.md` gets one line under "Project-specific design documents": "Domain vocabulary: `GLOSSARY.md` is the authority for domain words, with `collaboration_model.md` § 1 for collaboration words (Principle 15)."
  - The glossary also lists **source ID** (Memory Sync).
- **Entries:**
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
- **Memory Sync's "source node id" (V-10):** renamed now (AR-903), Step 5. Whether a source should be identified by its node ID instead stays FU-002 (the user's decision).
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
- **Mapping owners of stored names (N-904).** Each is the only reader and writer of its stored shape, and AC-901's search allows the old names only in these:
  - the server's `NodeIdentityService` (identity file `serverInstanceId`);
  - `autobyteus-web/utils/nodeEntryStorage.ts` (desktop registry file and its localStorage copy: `id`, `serverInstanceId`);
  - `utils/remoteAccess/mobileCredentialStorage.ts` (mobile session `nodeId`);
  - iOS `SavedNodeStore.swift` and Android `connection/SavedNodeStore.kt` (their saved records' keys);
  - and, for Step 5b, `memory-sync-config-service.ts`, `local-file-memory-sync-state-store.ts`, `memory-sync-manifest.ts` (`sourceNodeId`).

### Step 1b: no version field on the status answer (REQ-909, the user's request)

- **Server:** `api/rest/remote-access.ts:30` stops answering `compatibilityVersion`.
- **Readers:**
  - web `types/remoteAccess.ts:49` (the field), the mobile shell specs' fixtures;
  - the server E2E type `phone-access-running-routes.e2e.test.ts:36`;
  - iOS `ConnectionValidator.swift`: the field, its decode and encode, `minimumCompatibilityVersion` and the `>= minimum` guard (line 135), plus the HTTP 426 → `incompatibleServer` branch (`ConnectionDiagnostic.swift:110`; no server answers 426, N-902) and `ConnectionDiagnosticMapper.incompatibleServer()` itself, both dead after the guard goes (Principle 7); the iOS tests' JSON.
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
- **Stored tool selections (AR-901, the user's decision 2026-10-24):** an agent definition stores the tools it uses (`toolNames` in `agent-config.json`). Exposure matches by name (`runtime-agent-tool-exposure.ts:80`), so a definition that still lists `list_available_nodes` no longer gets the tool after the rename. The user ruled updating agent configs out of this ticket: "The agent config file belongs to another ticket after you have done your task … the agent package creator could create another task to update its own package."
  - There is no startup migration and no alias.
  - REQ-906 states this as its one accepted exception besides REQ-909. A definition that selects the old name must be updated to `list_peer_nodes`. The PTM's own package is updated by the Agent Package Creator in a separate ticket after this one.
  - The release note (whenever a release is made) says: "`list_available_nodes` is now `list_peer_nodes`; agents that use it need the new name selected."
  - This repository's built-in definitions select neither name (search: none).
- **Abilities and exposure unchanged:** opt-in by definition, the same results.

### Step 4: the client's own record is an entry (V-01, V-06, V-09; U-1)

- **Types:**
  - `types/node.ts`: `NodeProfile` → `NodeEntry`; `id` → `entryId`; `serverInstanceId` → `nodeId` (from Step 1); `isSystem` removed (V-06; no reader);
  - `WindowNodeContext.nodeId` → `entryId`;
  - the registry changes' `nodeId` → `entryId`;
  - `EMBEDDED_NODE_ID` keeps its value and is named `EMBEDDED_ENTRY_ID`.
- **Carriers the compiler does not catch (AR-902)**, renamed by hand to `entryId`. Cited at `electron/application/electronApplication.ts:126-260`, `electron/preload.ts:45-46`, `electron/shell/workspace-shell-window-registry.ts:44`:
  - `createNodeBoundWindow(nodeId)`, `openNodeWindow(nodeId)`, `ensureNodeExists(nodeId)`;
  - the IPC handlers `open-node-window` / `focus-node-window` (their parameter; the channel names stay, since they open a node's window);
  - `preload.openNodeWindow` / `focusNodeWindow`;
  - `shellWindowRegistry.getNodeIdForShell` → `getEntryIdForShell`, `getByNodeId` → `getByEntryId`, `closeNodeWindow(entryId)`;
  - the `WorkspaceShellWindow` and `attachRendererConsoleDiagnostics` options;
  - the log texts (`nodeId=` → `entryId=`).
- **Stores and shell:** `stores/nodeStore.ts`, `stores/windowNodeContextStore.ts` (`nodeId` → `entryId`, `isEmbeddedWindow` stays), `electron/nodeRegistryStore.ts`, `electron/preload.ts`, `electron/types.d.ts`, `electron/application/electronApplication.ts`, and every caller (the 87 web files using `nodeId`, each classified: entry meaning → `entryId`; node meaning stays `nodeId`).
- **Stored-name mapping (U-1), one owner:** a new `utils/nodeEntryStorage.ts` (`toStoredNodeEntry` / `fromStoredNodeEntry`), used by both stores that persist the snapshot (the Electron file and the window's localStorage copy). It maps `entryId` ⇄ stored `id` and `nodeId` ⇄ stored `serverInstanceId`. It reads and ignores a stored `isSystem`, and no longer writes it. Old files load unchanged (rule 7); there is no migration.
- **Phone apps:** iOS `SavedNodeProfile` → `SavedNodeEntry` (13 files) and Android `SavedNodeProfile` → `SavedNodeEntry` (`connection/SavedNodeProfile.kt`, `SavedNodeStore.kt`, `ConnectionValidator.kt` and their users). Their stored keys stay through each app's one store owner (U-1).
- **Mobile (V-09):** `MobileNodeSession.nodeId` → `entryId` (`MOBILE_NODE_ID` → `MOBILE_ENTRY_ID`). The stored credential session keeps its field name through `utils/remoteAccess/mobileCredentialStorage.ts`, its one owner.
- **Consumers check:** every window-scoped endpoint resolver, the Nodes tab, phone access, the window switcher; the remote runs store keeps `nodeId` (the node's ID).
- **AC-901 made concrete (AR-902):** the implementation lists every remaining `nodeId` in `autobyteus-web/electron/`, `stores/`, `utils/`, `services/` and `components/` with its meaning (all must be the node's ID) in its handoff, and the code review checks that list.

### Step 5: other meanings of "peer" (V-04, V-05, V-08)

- **Client address:** `api/security/remote-access-local-trust.ts` (`NormalizedPeerAddress` → `NormalizedClientAddress`, `normalizePeerAddress` → `normalizeClientAddress`, `isLoopbackPeerAddress` → `isLoopbackClientAddress`), and the route policy, websocket auth, URL resolver and MCP local access that call them.
- **Siblings:** `stores/runHistoryTeamExecutionRows.ts` wording; e2e fixture `task-agent-peer-sidebar.page.vue` → `task-agent-sibling-sidebar.page.vue` and its spec references.
- **The contract:** `collaboration_model.md` § 2.2 (V-08).

### Step 5b: Memory Sync's source ID (V-10, AR-903)

- **Code:**
  - `sourceNodeId` → `sourceId` across `memory-sync/` (`shared/source-node-id.ts` → `shared/source-id.ts`, the config, state store, manifest, hub client, ingestion service, types);
  - the GraphQL `memory-sync` types and the web (`types/memory.ts`, `memorySyncStore.ts`, `memoryExplorerStore.ts`, `memoryInspectorStore.ts`, `MemorySyncCard.vue`, the memory GraphQL documents, `generated/graphql.ts` by codegen).
- **UI:** "Source node id" → "Source ID", and the card's description "the source node id below is the stable import identity" → "the source ID below …", in English and Chinese.
- **Wire to the hub:** renamed as a clean cut (rule 9; the hub is a node of the same release). Covers `memory-hub-client.ts:24` (the query parameter) and the ingestion side.
- **Stored names kept (U-1)**, mapped by their one owner each: the source config (`memory-sync-config-service.ts`), the sync state (`local-file-memory-sync-state-store.ts`), the hub's stored manifest (`memory-sync-manifest.ts` read and write). Stored values (the identity itself) are unchanged.

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
  - the word-list search (AC-901):
    - `serverInstanceId` only in the mapping owners Step 1 names (N-904);
    - `sourceNodeId` only in Step 5b's three owners;
    - `list_available_nodes` only in the release-note text (Step 3);
    - none of `AvailableNode`, `RemoteNodeDiscovery`, `RemoteDiscoveryChannel`, `RemotePeer`, `PeerAddress`, `isSystem` (outside the desktop entry storage owner, which reads and ignores it), `NodeProfile`, `SavedNodeProfile`, `MOBILE_NODE_ID`;
    - `nodeId` only in node-ID meaning, per the implementation's list (AR-902).

## Risks

- RSK-901: an older phone app or desktop can't identify an updated node until it updates (U-2, rule 9; the user accepted it).
- RSK-902: classifying 87 web `nodeId` uses by meaning is manual. The type change (`entryId` on `WindowNodeContext` and `NodeEntry`) makes the compiler find every entry-meaning use. The rest stays `nodeId`.
