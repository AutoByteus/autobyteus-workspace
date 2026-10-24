# Design Spec — node-vocabulary (autobyteus-290)

## Solution And Approval Basis

- Package: `node-vocabulary`; Task autobyteus-290.
- Requirements: [requirements-doc.md](requirements-doc.md), `Approved` at SR-006. U-2 (a): rename the identity wire field to `nodeId`. U-3: stored names follow the code through sealed migrations (U-1 reversed).
- Current solution revision ID: `SR-007` (ARCH-REV-004: AR-905 the hold-back chains, AR-906 the phone keys, N-906 … N-909). Design status: `Ready`.
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
- `architectural_risk`: `High`. It changes the identity wire field (U-2), read by the desktop, peers and the phone apps, and an agent-facing tool name. Stored names are migrated by sealed migrations on the server, the desktop and the window (U-3, § Stored Names Migration), with the node identity held back until its migration succeeds.
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
- **Derived consumers (Principle 11):** see the per-step consumer lists. Stored names are migrated (§ Stored Names Migration); current code reads and writes only the new names.
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
  - The stored identity file becomes `node-identity.json` `{nodeId}` through migration SM-1 (§ Stored Names Migration). This service reads and writes only the new file; it never creates a new ID while the `node_identity` capability is held back (REQ-913).
- **Wire:** `/rest/remote-access/status` answers `nodeId` instead of `serverInstanceId` (U-2, a clean cut).
- **Readers, all renamed:**
  - `PeerClient.fetchServerInstanceId` → `fetchNodeId` (`PeerIdentityProbe`);
  - web `utils/nodeIdentityProbe.ts`, `types/remoteAccess.ts` `RemoteAccessStatus.nodeId`, `isServerInstanceId` / `SERVER_INSTANCE_ID_PATTERN` → `isNodeId` / `NODE_ID_PATTERN`;
  - `stores/phoneAccessStore.ts`, `nodeRowStatus.ts`, `nodeListStore.ts`, `components/settings/nodes/NodeRow.vue`, `NodeConnectionDetails.vue`;
  - iOS `AutoByteusMobileCore/ConnectionValidator.swift` (`serverInstanceID = "serverInstanceId"` → `nodeId`) and its tests.
- **UI text:** none needed; the Nodes tab already says "Node ID" (`localization/messages/en/nodesPage.ts:57`).
- **Old stored names (N-904, now SR-006):** they appear only inside the migration folders and their frozen shapes (`autobyteus-server-ts/src/app-data-migrations/migrations/node-identity-file-name/`, `…/memory-sync-source-id-names/`, `autobyteus-web/client-data-migrations/`). The boundary tests enforce it.

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

### Step 4: the client's own record is an entry (V-01, V-06, V-09; U-3)

- **Types:**
  - `types/node.ts`: `NodeProfile` → `NodeEntry`; the record keeps `id` (an entry's own ID is correctly `id`); `serverInstanceId` → `nodeId` (from Step 1); `isSystem` removed (V-06; no reader). References to an entry from elsewhere use `entryId`;
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
- **Stored names:** the desktop node list file and the window's browser-mode copy are migrated by SM-6 and SM-7 (§ Stored Names Migration). `nodeRegistryStore.ts` and `nodeStore.ts` read and write only the new file and key and the new field names.
- **Phone apps:** iOS `SavedNodeProfile` → `SavedNodeEntry` (13 files) and Android `SavedNodeProfile` → `SavedNodeEntry` (`connection/SavedNodeProfile.kt`, `SavedNodeStore.kt`, `ConnectionValidator.kt` and their users). No stored key changes (the type name isn't stored).
- **Mobile (V-09):** `MobileNodeSession.nodeId` → `entryId` (`MOBILE_NODE_ID` → `MOBILE_ENTRY_ID`). The stored session is migrated by SM-8 (new key, `entryId`, no schema `version`).
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
- **Docs:** `autobyteus-server-ts/docs/features/memory_sync.md` and `docs/modules/agent_memory.md`: "`sourceNodeId`" → "source ID" (the folder `memory/imports/<source ID>` keeps its stored value), and "`NodeProfile.id`" → "entry ID".
- **Stored names:** migrated by SM-2 … SM-5 (§ Stored Names Migration); current code reads and writes only `sourceId`, `boundSourceId` and `source.json`.

### Step 6: glossary and docs (REQ-907)

The glossary entries above; the `DESIGN.md` pointer; `remote_collaboration.md`, the web `settings.md`, `agent_tools.md`, `agent_communication.md`.

## Main Domain Subject Naming Check (Principle 15)

| Node / Subject | Current / Proposed Name | Natural And Self-Descriptive? | Same Meaning And Name Everywhere, Per The Glossary? | Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- | --- |
| A server's identity | `serverInstanceId` / `nodeId` → `nodeId` | Yes | Yes after Step 1 and SM-1 | none after the migration | SM-1 |
| The client's record of a node | `NodeProfile.id`, `nodeId` → `NodeEntry.entryId` | Yes | Yes after Step 4 | `nodeId` reused for it | Step 4 |
| Registered remote node | `RemotePeer`, `AvailableNode`, "available nodes" → `PeerNodeRef`, `PeerNodeStatus`, `list_peer_nodes` | Yes | Yes | qualifier repeats or contradicts | Steps 2–3 |
| Request origin address | `peerAddress` → `clientAddress` | Yes | Yes | collided with peer | Step 5 |
| A delegated run's standing | "a peer" → "a run of its own" | Yes | Yes | collided with peer | Step 5 |

## Stored Names Migration (SR-006, U-3; `DESIGN.md` rule 10; Data Migration Guideline)

The mapping owners of SR-003 … SR-005 are **removed from the design**. Current code reads and writes only the new names. Sealed migrations rename the stored names once.

### What is renamed on disk

| ID | Store (owner today) | Released shape | New shape |
| --- | --- | --- | --- |
| SM-1 | Server identity (`NodeIdentityService`) | `<data>/remote-access/server-instance.json` `{serverInstanceId}` | `<data>/remote-access/node-identity.json` `{nodeId}`, same value |
| SM-2 | Memory Sync source config (`memory-sync-config-service.ts:43`) | `memory-sync/memory-sync-config.json` `source.sourceNodeId` | `source.sourceId` |
| SM-3 | Memory Sync source state (`local-file-memory-sync-state-store.ts:44`) | `memory-sync/source-state/*.json` `sourceNodeId` | `sourceId` (file names are derived from values; unchanged) |
| SM-4 | Hub credentials (`local-file-memory-hub-credential-store.ts:17`) | `memory-sync/hub-credentials.json` records' `boundSourceNodeId` | `boundSourceId` |
| SM-5 | Hub imports (`local-file-memory-import-store.ts:91-225`) | `memory/imports/<id>/source-node.json` `{sourceNodeId, …}` and `sync-manifest.json` `sourceNodeId` | `source.json` `{sourceId, …}` and `sourceId`; folder names (values) unchanged |
| SM-6 | Desktop node list (`electron/nodeRegistryStore.ts:11`) | `userData/node-registry.v1.json`: `nodes[].serverInstanceId`, `nodes[].isSystem` | `userData/node-registry.json`: `nodes[].nodeId`; `isSystem` dropped; `id` (the entry's own ID) unchanged |
| SM-7 | The window's node list in browser mode (`stores/nodeStore.ts`, key `autobyteus.node_registry.v1`; written only without the Electron API, `nodeStore.ts:31`) | the same snapshot shape | key `autobyteus.node_registry`, same field changes |
| SM-9 | iOS saved entries (`AutoByteusMobileCore/SavedNodeStore.swift:65-68`) | UserDefaults keys `autobyteus.saved-node-profiles`, `autobyteus.selected-node-profile-id` | `autobyteus.saved-node-entries`, `autobyteus.selected-node-entry-id`; record fields unchanged |
| SM-10 | Android saved entries (`connection/SavedNodeStore.kt:84-86`) | SharedPreferences `saved_nodes` keys `profiles`, `selected_profile_id` | `entries`, `selected_entry_id`; record fields unchanged |
| SM-8 | Mobile session (`utils/remoteAccess/mobileCredentialStorage.ts:3`) | key `autobyteus.remote_access.mobile_session.v1` `{version: 1, nodeId, …}` | key `autobyteus.remote_access.mobile_session` `{entryId, …}`; the schema `version` field dropped (Guideline § 3) |

The iOS and Android saved records keep their fields (no node-ID field; `id` is the entry's own ID). Their **keys** say "profile", the second name rule 10 removes, so SM-9 and SM-10 rename them (AR-906, decided (a) under rule 10). Renaming the Swift and Kotlin types changes no key string by itself; the keys change only through these migrations.

### Where the migrations live (sealed)

- **Server, SM-1 … SM-5:** `src/app-data-migrations/migrations/<name>/`, registered in `app-data-migration-registry.ts`, with frozen released shapes in `frozen/released-*`. They follow the sealed-area import rules, enforced by `app-data-migration-boundaries.test.ts`.
  - `node-identity-file-name`: SM-1. Declares `holdsBackCapabilities: ["node_identity"]`, a new `AppDataCapability`.
  - `memory-sync-source-id-names`: SM-2 … SM-5. Declares `holdsBackCapabilities: ["memory_sync"]`.
  - They run before the services are built (`server-runtime.ts:183-206`: `runPending`, then `applyCapabilityReadiness`, then `buildStudioServer`).
- **Phone apps, SM-9 and SM-10 (call sites, N-911):** the iOS step runs in `AutoByteusMobile/AppShellCoordinator.swift:18`, right before `SavedNodeStore(...)` is created. The Android step runs in `MainActivity.kt:39`, right before `SavedNodeStore(this)`. Each app adds a boundary check (a unit test) that only that call site references its migration folder.
- **Phone apps, SM-9 and SM-10:** each app gets a sealed one-time step in its own migration folder (`autobyteus-ios/AutoByteusMobileCore/DataMigrations/`, `autobyteus-android/app/src/main/java/org/autobyteus/mobile/datamigrations/`). Each is called once at app start, before `SavedNodeStore` is first read. It follows the same order: write the new keys, then remove the old ones, keeping a backup key. Structural recognition: old key present and new absent. Current code knows only the new keys.
- **Desktop and browser, SM-6 … SM-8:** a new sealed area, `autobyteus-web/client-data-migrations/`, with the same rules as the server's area (Guideline § 3, "Client-side stores … follow the same rule"):
  - `migrations/<name>/`: pure transforms with frozen released shapes, imported by no current code;
  - two runners (N-908): `electron-file-runner.ts` (main process, called in `electronApplication.ts` right before `loadNodeRegistrySnapshot` at :362) and `browser-storage-runner.ts` (renderer, called by a new plugin `19.clientDataMigrations.client.ts`, ordered before `20.windowNodeBootstrap.client.ts` and `21.mobileRemoteAccessBootstrap.client.ts`). Several open tabs are safe: each step is idempotent through the structural check;
  - a boundary spec: current code imports only the two runners, at their two call sites.

### Checklist (Data Migration Guideline § 2)

1. **Need:** a stored name carries a wrong or second meaning (rule 10). It is not cosmetic.
2. **Availability:** a failed migration never locks out the app. The hold-back chains (AR-905) are below.
   - SM-1 holds back `node_identity`. Remote access and remote collaboration report "not available until the node identity is migrated", while everything else works. `NodeIdentityService` never creates a new ID while `node_identity` is held back (REQ-913).
   - SM-2 … SM-5 hold back `memory_sync`.
   - SM-6 … SM-8: a failed client migration logs a warning and leaves the original. The desktop starts with the embedded entry only, and the old file stays for recovery (rule 7).
3. **Source and target:** the shapes come from the released code (`origin/personal` before this ticket; the files cited above) and are frozen as `frozen/released-*` and `client-data-migrations/frozen/`.
   - One fixture per shape: config with and without a source; state files; credentials with null and set bindings; several import folders; registry with 0, 1 and several entries, with and without `serverInstanceId` and `isSystem`; the mobile session.
   - No real user data was read: the user declined (2026-10-24). The fixtures are built from the released writers' exact output.
4. **Disposition:** each item is converted, already current (the new name is present and the old one absent: skipped), or failed (logged, original kept).
   - Recognition is by structure (Guideline § 3): the old file or key present and the new one absent. There is no version field.
5. **SM-1 specifics (N-906):** if both files are present with the same value, keep the new one and remove the old. If both are present with **different** values, that's a failure: hold back, keep both, log a warning naming both files. Never "keep new". `createdAt` is copied into `node-identity.json`.
   **SM-6 specifics (N-907):** per record, rename only `serverInstanceId` → `nodeId` and drop `isSystem`, copying every other field as it is. It fails only when the file is not readable JSON. A record today's tolerant reader would drop is still copied; the current reader decides about it, as today.
5. **Commit and retry:**
   - **Server:** the runner's record and atomic file writes (write the new file or name, then remove the old). For SM-1 the new file is written first, then the old one is removed, so a crash in between re-runs safely: both files present with the same value → keep the new one.
   - **Client:** the same order (new key or file first, then the old removed). Backups are `.bak` copies for files and a `…:backup` key for storage, kept until the next successful start.
6. **Current-only boundary:**
   - current code knows only `nodeId`, `sourceId`, `source.json`, `node-identity.json`, `node-registry.json` and the unversioned keys;
   - old names exist only inside migration folders and their frozen shapes;
   - the existing in-place "legacy node record" normalization in `nodeRegistryStore.ts:139-146` stays as current validation only (it drops invalid records). It gains no old-name branch.
7. **Cost:** a handful of small JSON files and keys; the import folders scale with the number of Memory Sync sources (two small files each). It runs once.
8. **References:**
   - the source ID value names hub folders and source-state files: unchanged;
   - the node ID value is pinned by peers (`peers.json`) and links: unchanged.
9. **Evidence:**
   - migration unit tests per shape, plus re-run and crash-between-steps cases;
   - the boundary tests;
   - the two-server E2E starting from pre-change data: peers still pinned, Memory Sync continuing;
   - a desktop start with a pre-change node list.
10. **Lessons:** `custom-provider-readable-id` (rewriting definition JSON in place with frozen readers); `token-usage-run-records-v1` (capability hold-back).

### Hold-back chains (AR-905)

**`node_identity` (SM-1):**
1. `markCapabilitiesPending()` (`startup/app-data-capability-readiness.ts:10-13`) gains `configureNodeIdentityCapability(false)`. `applyCapabilityReadiness()` (:15-20) gains `configureNodeIdentityCapability(readiness.node_identity)`. `AppDataCapability` (`app-data-migration-types.ts:42`) gains `"node_identity"` and `"memory_sync"`.
2. `NodeIdentityService` holds the readiness. While it is not ready, `getNodeId()` throws one explicit `NodeIdentityNotMigratedError` ("This node's identity is waiting for its data migration.") and **never creates or writes a file**. When ready, it behaves as today: it reads `node-identity.json`, and creates a new ID only when no identity file exists.
3. **Fresh install:** no file under either name means SM-1 is already current. The capability is ready, and the service creates the ID as today.
4. **Each consumer's answer while held back:**
   - **`/rest/remote-access/status`** (`api/rest/remote-access.ts:31`): answers **HTTP 503 with `{code: "NODE_IDENTITY_NOT_MIGRATED", message}`** (N-910). The readers state that reason instead of calling the node "not AutoByteus":
     - the web probe (`utils/nodeIdentityProbe.ts:55-59`) gains the cause `identity_pending`, shown as "This node's identity is waiting for its data migration";
     - `PeerClient.fetchNodeId` (`peer-client.ts:232-235`) refuses with `NODE_IDENTITY_NOT_MIGRATED` and that text, not `PEER_NOT_AUTOBYTEUS`;
     - the phone apps show their existing "server unavailable" state for a 503.
   - **Remote collaboration:** `ownNodeId` (`remote-collaboration-composition.ts:58`) is used by `PeerGateway` and `PeerClient`. Both answer with a refusal, `NODE_IDENTITY_NOT_MIGRATED` ("This node's identity is waiting for its data migration"), for inbound and outbound requests and the discovery tools. Delegation and messages to peers get it as a refusal text. Nothing is sent.
   - **Phone-access pairing:** it refuses to issue a pairing while held back (it embeds the node ID).
   - **GraphQL showing the node ID** (the Nodes tab): the field is null, and the tab shows "Node ID: waiting for its data migration".
5. **Unit cases:** held back → `getNodeId` throws and no file is written; the status route answers without `nodeId`; the gateway refuses; fresh install → created; ready → read.

**`memory_sync` (SM-2 … SM-5):**
1. The same two configure calls (`configureMemorySyncCapability`).
2. While held back:
   - the source's background loop and "Sync now" don't run (the status says "waiting for its data migration");
   - hub ingestion answers the source with an unavailable status;
   - the Memory Sync settings GraphQL reads answer with that status and refuse saves.
3. Nothing reads or writes Memory Sync files until it is ready.
4. **Unit cases** for each gate.

## Persisted Data / State Transition Decision

`Migration Required` (U-3, SR-006): see § Stored Names Migration. Superseded text: `Directly Usable — No Migration` (U-1, SR-002 … SR-005).
- Old stored names are renamed once by SM-1 … SM-8; current code knows only the new names.
- `isSystem` is ignored when read and no longer written. Old code doesn't read new files (rule 9), and new code reads old files (rule 7).

## Legacy Removal / Backward-Compatibility Rejection Log

| Candidate | Rejected because |
| --- | --- |
| Answering both `serverInstanceId` and `nodeId` on the status route | Rule 9: a clean cut; every reader is renamed in Step 1 |
| Aliases for the old tool name | Principle 8 / rule 9: one name |
| A permanent mapping of old stored names in current code | U-3 / `DESIGN.md` rule 10: a mapping is a second name for one concept |

## Verification

- After each step: the server and web suites, typecheck; the iOS unit tests for Step 1.
- **At the end:**
  - the two-server E2E (Nodes tab, pairing identity, discovery with `list_peer_nodes`, remote runs);
  - the Nodes tab browser check;
  - loading a pre-change desktop node list and `peers.json` from a clean clone (AC-903);
  - the word-list search (AC-901):
    - `serverInstanceId`, `sourceNodeId`, `source-node.json`, `server-instance.json`, `node-registry.v1`, `mobile_session.v1`, `saved-node-profiles`, `selected-node-profile-id`, `selected_profile_id` (and the Android `profiles` key constant) only inside the migration folders and their frozen shapes;
    - `list_available_nodes` only in the release-note text (Step 3);
    - none of `AvailableNode`, `RemoteNodeDiscovery`, `RemoteDiscoveryChannel`, `RemotePeer`, `PeerAddress`, `isSystem` (outside the migration folder), `NodeProfile`, `SavedNodeProfile`, `MOBILE_NODE_ID`;
    - `nodeId` only in node-ID meaning, per the implementation's list (AR-902).

## Risks

- RSK-901: an older phone app or desktop can't identify an updated node until it updates (U-2, rule 9; the user accepted it).
- RSK-902: classifying 87 web `nodeId` uses by meaning is manual. The type change (`entryId` on `WindowNodeContext` and `NodeEntry`) makes the compiler find the uses through those types, IPC included. It does not find plain string parameters, separate option types or logs: Step 4's carrier list covers those, and AC-901's per-identifier list proves none is left (N-905).
