# Design Spec

## Current-State Read

AutoByteus runtime memory is already file-based and local to each server node.

Current local memory root shape:

```text
memory/
  agents/
    <runId>/...
  agent_teams/
    <teamRunId>/...
```

Current observations:

- Native AutoByteus runtime memory writes through `autobyteus-ts` memory stores.
- Server-recorded external runtime memory writes through `AgentRunMemoryRecorder -> RuntimeMemoryEventAccumulator -> RunMemoryWriter -> RunMemoryFileStore`.
- Run history, memory view, team projection, and self-evolution evidence read from the local memory root.
- Existing local paths are active runtime paths and must remain stable.
- There is no current cross-node import namespace.
- Docker and Kubernetes deployments can create many AutoByteus server nodes, each with its own local memory.

The new design should aggregate memory from many nodes without changing current runtime memory. The central receiving role should be embedded in the existing backend, not created as a separate v1 project.

## Intended Change

Add **Memory Sync** to `autobyteus-server-ts`.

A backend server can be configured as:

1. a normal local AutoByteus agent server,
2. a Memory Sync source,
3. a Memory Hub,
4. both source and hub.

The hub stores imported source-node memory under the existing memory root:

```text
memory/
  agents/                 # local runtime memory, unchanged
  agent_teams/            # local team runtime memory, unchanged
  imports/
    <sourceNodeId>/
      source-node.json
      sync-manifest.json
      agents/
      agent_teams/
```

This design intentionally does **not** move local memory under `memory/local/`. Moving local memory would force migration and risk breaking current runtime path assumptions.

The Memory Sync source reads local `memory/agents/**` and `memory/agent_teams/**`, excludes `memory/imports/**` and sync internals, computes changed file operations, and pushes them to a hub ingestion endpoint. The hub validates the source id and writes imported files under that source namespace.

V1 synchronization rule: **changed-file full replacement only**. The source records per-file fingerprints such as size, mtime, and/or content hash. If a file is unchanged since the last accepted sync, it is skipped. If a file changed, the source uploads the complete file and the hub atomically replaces the imported copy. V1 intentionally does not implement append/range deltas, even for active `raw_traces.jsonl`; that optimization is deferred unless real corpus sizes prove it necessary.

Imported memory is a corpus. It is not local runnable memory and should not appear in normal local run history. It can appear in the homepage Memory menu only through an explicit memory source selector that labels imported memory as read-only.

Hub setup has two separate values:

- `advertisedHubBaseUrl`: the URL source nodes should use to reach the hub, such as `http://host.docker.internal:29695` for local Docker or a Kubernetes Service/Ingress URL. The UI/backend should use `AUTOBYTEUS_SERVER_HOST` / `appConfigProvider.config.getBaseUrl()` as the primary default candidate because that is the existing configured public/client-facing server URL. The bound node's `NodeProfile.baseUrl` and runtime endpoint can be secondary candidates, but the user confirms/edits the final advertised URL because the backend cannot infer every caller's network.
- `source token`: a backend-generated secret used by source nodes to authenticate hub ingestion. The hub stores only token hashes and credential metadata; plaintext tokens are returned only once when created or regenerated.
- Source nodes persist the copied source token as sensitive node-local source configuration so background sync can continue after restart. Source status APIs and UI must show only masked token presence/credential metadata, not the plaintext token.

Current startup configuration already has useful inputs but they are not sufficient as the final hub URL:

- The backend CLI accepts bind/runtime inputs: `--host`, `--port`, and `--data-dir`.
- Electron starts the embedded backend with `--port 29695` and `--data-dir`, while setting `AUTOBYTEUS_SERVER_HOST=http://127.0.0.1:29695` for the desktop loopback client. It does not currently pass `--host`, so the backend default bind host is `0.0.0.0`; the advertised desktop URL is loopback, but current bind behavior is broader unless changed.
- Docker starts the backend with `--host 0.0.0.0`, `--port 8000`, `--data-dir`, and an `AUTOBYTEUS_SERVER_HOST` default based on the host-mapped port for user/browser access.
- Server startup also derives `AUTOBYTEUS_INTERNAL_SERVER_BASE_URL` from the active listen address for internal runtime use.

Therefore Memory Hub should use `AUTOBYTEUS_SERVER_HOST` as the **first/default advertised URL candidate**, but it should still treat it as a candidate to confirm rather than a universal truth. In many deployments it will be exactly right. In local Docker, however, `AUTOBYTEUS_SERVER_HOST=http://localhost:<hostPort>` or `http://127.0.0.1:29695` is correct for the host/browser but wrong from another container, where `http://host.docker.internal:<hostPort>` may be needed. A LAN IP candidate such as `http://192.168.1.20:29695` may also work only when the hub process is bound beyond loopback and host firewall/network policy allows it, and it exposes the hub more broadly than the Docker-host alias. This mirrors the existing remote-access pairing pattern that suggests loopback/LAN/tailnet/manual client-facing URL candidates and lets the user choose the one reachable by the actual client. To avoid duplicated network-address policy, Memory Hub setup should use one backend address-candidate owner. The clean target is a generic server-address candidate service that can be shared by remote access and Memory Hub, or a Memory Hub candidate service that extracts/reuses the current remote-access address-candidate logic without coupling hub setup to phone-access UI semantics.

## User Journey Definition

### UJ-001: Enable the current server as a Memory Hub

User opens the Nodes page and selects the `Memory Sync` tab for the current bound node, turns on Memory Hub, and sees an advertised hub URL field. The UI proposes advertised hub URL candidates with the configured public/client-facing URL (`AUTOBYTEUS_SERVER_HOST` / backend `getBaseUrl()`) first, followed by current bound node/runtime/LAN/tailnet/manual candidates. The user must confirm or edit the final value for the network that source nodes will use. After the user saves, the server starts accepting authenticated source-node pushes without affecting local runtime memory. If the hub has no active source credential, the backend creates an initial source token; otherwise the user can create/regenerate/revoke source credentials. The UI shows hub health, imported source count, credential summaries, the derived ingestion endpoint, and copyable setup information containing the advertised hub base URL plus a newly generated plaintext token when one is available.

### UJ-002: Configure a running Docker/Kubernetes/source node

User opens the UI/API for a running source node, either directly or through the existing frontend Nodes page/Node Manager, then opens the same `Memory Sync` tab in that node-bound context. The user sets or confirms the node identity (`sourceNodeId`) and display name, pastes the advertised hub base URL plus source token from the Memory Hub, tests the connection, and then clicks `Sync Now` or enables background sync. Configuration changes are persisted as sensitive node-local Memory Sync configuration, token values are masked after save, and changes apply without restarting the agent runtime; at most the sync worker is restarted.

### UJ-003: Manual Memory Sync

User clicks `Sync Now`. The source node scans `memory/agents` and `memory/agent_teams`, excludes `imports` and unsafe/sync/temp files, sends changed file replacements to the hub, and shows progress/result status.

### UJ-004: Browse imported memory from the Memory menu

User opens the homepage Memory menu on a hub server. The existing Agents / Agent Teams explorer gains a memory source selector. Choices include `Local Memory` and imported source nodes. `Local Memory` is the default selection on initial page load and whenever no valid imported source is explicitly requested, so existing local memory behavior remains unchanged by default. Selecting an imported source reuses the existing Agents / Agent Teams browsing shape, but all cards/details are labeled imported/read-only and no local runtime actions are available.

The UI placement is intentionally simple:

```text
Memory page
  Source selector:
    - Local Memory  (default)
    - Imported: docker-node-1
    - Imported: finance-prod
    - Imported: cluster-a__finance__autobyteus-server
  Tabs:
    - Agents
    - Agent Teams
  List/details:
    - same list shape as today
    - imported/read-only badges for imported source
    - source metadata panel or header
    - no restore/continue/delete/archive runtime actions for imported source
```

### UJ-005: Monitor imported sources

User opens Memory Sync status on the hub and sees source ids, display names, last known endpoint, last import time, last error, file counts/bytes where available, and an action to open that source in the Memory menu.

The Memory Sync tab is for setup/status. The Memory page is for browsing. Hub status should therefore include an imported-source summary list/table with an `Open in Memory` action that routes to the Memory page with `source=IMPORTED:<sourceNodeId>` or equivalent store state preselected.

### UJ-006: Use the existing Nodes page as the setup surface

User opens the existing `/nodes` page, sees registered frontend nodes such as the embedded server and Docker/remote nodes, and opens the node that should be configured. The `Memory Sync` tab shown in that node-bound window operates against that bound backend node. The primary and only V1 journey is `Nodes -> Open node -> Memory Sync tab`. Do not add a separate row-level `Memory Sync` button next to `Open` in v1. The frontend node registry's `NodeProfile.id` and editable `NodeProfile.name` are UI metadata only; they may suggest a default label, but `sourceNodeId` remains explicit backend Memory Sync configuration.

The top of the `Memory Sync` tab should show a bound-node identity banner before any controls: frontend node display name, node type, and base URL/endpoint. This makes the configuration target obvious.

## Memory UI Source Selection Contract

Current Memory UI code is local-only: `/memory` route query values carry the view/tab/agent/team/run identifiers, `MemoryHome.vue` renders Agents / Agent Teams tabs directly, `memoryExplorerStore` has no selected source state, and `MemoryInspectorStore` fetches memory views by run ids without a source input. The target design adds one explicit source dimension while preserving Local Memory as the default.

Target source selector shape:

```ts
type MemoryExplorerSourceType = "LOCAL" | "IMPORTED";

type MemoryExplorerSourceInput =
  | { type: "LOCAL" }
  | { type: "IMPORTED"; sourceNodeId: string };

type MemoryExplorerSourceOption = {
  key: "local" | `imported:${string}`;
  type: MemoryExplorerSourceType;
  label: string;
  sourceNodeId?: string;
  displayName?: string;
  readOnly: boolean;
  lastImportedAt?: string | null;
  lastSyncStatus?: string | null;
};
```

Frontend route/store rules:

- Omitted source route/query state means `Local Memory`.
- A valid imported route state such as `source=imported:docker-node-1` preselects that imported source.
- If route state references an unknown imported source, the UI loads `listMemoryExplorerSources`, falls back to `Local Memory`, and removes or replaces the invalid source query value. Backend direct calls for an unknown imported source should return a typed not-found error rather than silently reading a different source.
- `pages/memory.vue` must include the selected source when pushing routes for home, agent detail, team detail, agent inspector, and team inspector.
- `memoryExplorerStore` owns `selectedSource`, source option loading, and source-aware list queries.
- `memoryInspectorStore` carries the source inside `MemoryInspectTarget` and passes it to memory view queries.
- Imported cards/details show an imported/read-only badge and source metadata; no restore/continue/delete/archive controls are shown for imported sources.

Memory page placement:

```text
Memory page
  Source selector: Local Memory (default), Imported: <source display name/sourceNodeId>
  Agents / Agent Teams tabs
  Search / pagination
  Source-aware list cards
  Source-aware detail and inspector views
```

## Memory Sync Tab Configuration Contract

The Nodes page remains the setup entrypoint. The target `Memory Sync` tab contains one bound-node card and two role cards so the same backend can be hub, source, or both.

```text
Nodes -> Open node -> Memory Sync tab

Bound node banner
  frontend node display name
  node type: embedded/remote/etc.
  node base URL or current endpoint

Memory Hub role card
  Enable Memory Hub toggle
  Advertised hub base URL field
  URL candidate picker:
    1. configured public URL from AUTOBYTEUS_SERVER_HOST / getBaseUrl()
    2. current bound node URL
    3. Docker-host / LAN / tailnet-like candidates when available
    4. manual URL
  Ingestion endpoint preview
  Credential list: credentialId, label, bound/claimed source id, created/last used/revoked
  Generate / regenerate / revoke credential actions
  One-time plaintext token display only immediately after creation/regeneration
  Imported source summary table with Open in Memory action

Memory Sync Source role card
  Enable source sync toggle
  sourceNodeId and display name fields
  Hub base URL field
  Hub token input; masked after save
  Test Connection
  Sync Now
  Background sync toggle and interval/batch options
  Last job status, last success, last error
```

The tab must not add a separate row-level `Memory Sync` button beside `Open`; keeping one journey avoids duplicated setup entrypoints.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Larger Requirement / Feature
- Current design issue found (`Yes`/`No`/`Unclear`): Yes, cross-node memory aggregation lacks an owner and namespace.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue; Duplicated Policy Or Coordination; Legacy Or Compatibility Pressure if local memory layout is moved.
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): No runtime memory refactor; yes additive Memory Sync subsystem and hub import namespace.
- Evidence: Current local memory files already exist and should be copied/mirrored. Runtime writers do not need remote awareness. Future analytics are unknown, so faithful import storage is safer than premature indexing.
- Design response: Add `memory-sync` backend subsystem with source scanner, change planner, source state, hub client, hub ingestion, import store, and frontend/API controls.
- Refactor rationale: Keeping runtime memory unchanged avoids risky migration. New sync ownership prevents remote upload policy from being scattered across runtime writers, GraphQL resolvers, or frontend code. Source-aware Memory Explorer ownership prevents imported memory from being accidentally mixed into local runnable memory.
- Intentional deferrals and residual risk, if any: Advanced imported-memory search/analytics/indexing, deletion propagation, redaction policy, and dedicated external service extraction are deferred. Basic source-scoped imported-memory browsing through the existing Memory menu is in scope. The v1 corpus is a file mirror with manifests.

## Terminology

- `Memory Sync`: Feature that transfers memory artifacts from a source AutoByteus server node to a Memory Hub.
- `Memory Hub`: AutoByteus backend role that receives and stores imported memory under `memory/imports/<sourceNodeId>/`.
- `Memory Sync Source`: AutoByteus backend role that scans local `memory/agents` and `memory/agent_teams` and pushes changes to a hub.
- `sourceNodeId`: Stable configured logical source identity. Used as folder name under imports. Not a pod IP, container IP, or volatile endpoint.
- `advertisedHubBaseUrl`: User-confirmed base URL copied to source nodes. It is a network address contract between source and hub, not automatically guaranteed by the hub's internal listen address.
- `Memory Hub source credential`: Hub-owned auth record containing credential id, hash, optional/claimed source binding, label, created/last-used/revoked timestamps, and no plaintext token after creation/regeneration response.
- `Frontend NodeProfile`: Existing web/Electron UI registry record with frontend-local `id`, editable `name`, `baseUrl`, and `nodeType`. It is used for UI navigation and endpoint routing, not as durable Memory Sync import identity.
- `Node-bound window/context`: Existing frontend mechanism where a renderer window routes GraphQL/REST/WS calls to one selected node's base URL.
- `Source endpoint metadata`: Last known URL/IP/port/service name, stored in `source-node.json` for display/diagnostics only.
- `Imported memory`: Memory copied from a source node into a hub. It is read-only corpus data by default.
- `Local runnable memory`: The hub server's own `memory/agents` and `memory/agent_teams`. This remains the only normal runtime memory.
- `Sync manifest`: Durable per-source file state on the hub and per-hub send state on a source. Used for idempotency, changed-file detection, and observability.
- `File operation`: A sync operation. V1 uses only full-file `replace` operations for changed files; optional future delete markers or range deltas are out of scope.

## Existing Frontend Nodes Relationship

The current frontend Nodes feature should participate in Memory Sync UX, but it must not become the Memory Sync identity model.

| Existing Nodes Concept | Current Owner | Memory Sync Relationship |
| --- | --- | --- |
| `NodeProfile.id` | frontend/electron node registry | Used to open/focus a node-bound UI context only. Not stored as hub import identity by default. |
| `NodeProfile.name` | frontend/electron node registry | User-friendly label; can suggest a `sourceNodeId` or display name, but renames must not silently move/rename hub imports. |
| `NodeProfile.baseUrl` | frontend node registry / endpoint routing | Used by frontend to reach/open a node; can appear as endpoint metadata, but is not stable enough for import folder identity. |
| `WindowNodeContextStore` | frontend routing | Ensures the `Memory Sync` tab calls target the node currently being configured. |
| `sourceNodeId` | backend Memory Sync config | Stable configured source identity persisted on the backend node and used by the hub under `memory/imports/<sourceNodeId>/`. |

V1 rule: from the Nodes page, the user opens a registered source node and then configures Memory Sync in the `Memory Sync` tab of that node-bound context. No separate row-level `Memory Sync`/`Configure Sync` shortcut should be added in v1; keeping one entry path avoids duplicate actions and confusion. A one-screen hub-admin console that edits multiple remote nodes directly would require a separate multi-target admin client and is deferred.

## Design Reading Order

Read this design in this order:

1. data-flow spines,
2. ownership boundaries,
3. storage layout and identity model,
4. backend/API/frontend file mapping,
5. migration/refactor sequence.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility wrappers or dual runtime-memory behavior.`
- Existing local memory layout stays unchanged; no migration to `memory/local/`.
- No runtime memory-provider refactor is introduced for this feature.
- No remote upload calls are added to runtime writers.
- Any earlier context-layer/raw-trace-only/separate-project assumptions are superseded by Memory Sync / embedded Memory Hub.
- Imported memory is not promoted into normal run history or runtime restore without a future explicit design.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | User triggers manual sync on source node | Hub stores imported memory files under `memory/imports/<sourceNodeId>/` | `MemorySyncService` | First and clearest source-to-hub path |
| DS-002 | Primary End-to-End | Runtime writes local memory file | Hub eventually stores changed imported file | `MemorySyncWorker` | Real-time/background sync without runtime writer changes |
| DS-003 | Primary End-to-End | Source sends file batch | Hub import store commits files and manifest | `MemoryHubIngestionService` | Hub-side authority for safe imported storage |
| DS-004 | Primary End-to-End | UI/operator requests sync status | Current source/hub/import status displayed | `MemorySyncStatusService` | User must trust repeated sync |
| DS-005 | Primary End-to-End | Hub lists imported sources | Imported memory source list returned | `MemoryImportCatalogService` | Users need to see what has been imported |
| DS-006 | Return-Event | Hub accepts/rejects batch | Source updates sync state and UI status | `MemorySyncStateStore` | Remote failure must be retryable and visible |
| DS-007 | Bounded Local | Source memory root scan | Changed-file replacement plan | `LocalMemoryExportScanner` + `MemoryFileChangePlanner` | Keeps file layout/sync logic out of runtime writers |
| DS-008 | Primary End-to-End | User opens Memory menu on hub | Local or imported memory explorer page | `MemoryExplorerSourceService` + existing memory explorer services | Makes imported memory visible without mixing it into run history |
| DS-009 | Primary End-to-End | User updates the `Memory Sync` tab after node startup | Source/hub config applied and worker/hub role refreshed | `MemorySyncConfigService` | Docker/Kubernetes/local nodes need runtime configuration |
| DS-010 | Primary End-to-End | User opens hub imported-source status | Source list and navigation target returned | `MemoryImportCatalogService` | Hub needs understandable imported-source management |
| DS-011 | Primary End-to-End | User opens a registered frontend node to configure sync | Bound node's `Memory Sync` tab is displayed/applied | `NodeManager` + `WindowNodeContextStore` + `MemorySyncConfigService` | Existing node UI should help setup without becoming sync identity owner |
| DS-012 | Primary End-to-End | User enables Memory Hub or creates a source credential | Copyable hub setup info with advertised URL and one-time token is returned | `MemoryHubConnectionInfoService` + `MemoryHubCredentialService` | Hub URL/token setup must be explicit, secure, and usable by Docker/Kubernetes sources |
| DS-013 | Bounded Local | Hub setup asks for address candidates | User sees current/configured/LAN/tailnet/manual URL candidates and chooses one advertised URL | `ServerAddressCandidateService` | Network URL choice is deployment-specific and should not be duplicated across features |
| DS-014 | Bounded Local | Background worker wakes while raw trace files may be live-changing | Hub receives full-file replacements for changed files | `MemorySyncWorker` + `MemoryFileChangePlanner` | Live raw traces must sync eventually without blocking runtime writes or requiring append/range-delta logic |

## Primary Execution Spine(s)

Manual Memory Sync:

```text
Frontend Sync Button
  -> GraphQL startMemorySync mutation
  -> MemorySyncService
  -> LocalMemoryExportScanner
  -> MemoryFileChangePlanner
  -> MemoryHubClient
  -> Hub REST ingestion route
  -> MemoryHubIngestionService
  -> MemoryImportStore
  -> memory/imports/<sourceNodeId>/...
  -> Source MemorySyncStateStore status
```

Background Memory Sync:

```text
Existing Runtime Writer
  -> memory/agents or memory/agent_teams local file change
  -> MemorySyncWorker poll/watch cycle
  -> MemoryFileChangePlanner
  -> MemoryHubClient
  -> MemoryHubIngestionService
  -> memory/imports/<sourceNodeId>/...
```

Concrete background worker cycle:

```text
MemorySyncWorker timer/poll event
  -> acquire non-overlapping worker lock for this hub target
  -> load source config + last accepted file fingerprint state
  -> LocalMemoryExportScanner snapshots exportable files
  -> MemoryFileChangePlanner creates no-op or full-file replace operations
  -> MemoryHubClient sends bounded batch
  -> hub verifies auth/source/path and atomically commits file replacements
  -> source advances file fingerprint state only after accepted response
  -> release lock and schedule next cycle with normal interval or backoff
```

Live `raw_traces.jsonl` handling:

- Background sync is eventually consistent. It does not hook into `appendRawTrace`, does not lock runtime writers, and does not make runtime writes wait for the hub.
- V1 intentionally avoids append/range deltas. Every changed file is uploaded as a complete file replacement.
- The scanner fingerprints files by size/mtime/hash. If a fingerprint differs from the last accepted source state, the planner creates one `replace` operation for the whole file.
- For active `raw_traces.jsonl`, the scanner may use a simple stable-read guard such as stat/read/stat or a short debounce. If the file is actively changing during the read, the worker can defer that file to the next interval rather than uploading a partial snapshot.
- If active `raw_traces.jsonl` grows, shrinks, is compacted, or is rewritten, the result is the same to Memory Sync: the file fingerprint changed, so the whole file is replaced on the hub.
- Archive segment files and raw-trace manifests are normal files. In the current code, new raw-trace archive segments are written at the run root as `raw_traces_000001.jsonl`, `raw_traces_000002.jsonl`, etc., with `raw_traces_manifest.json` tracking them. If these files appear or their fingerprint changes, they are uploaded once as full replacements. If they never change after creation, they are not resent.
- The sync layer does not need to understand compaction semantics: it does not calculate which trace records moved to archive and which remained active. It only mirrors the resulting files.

Memory menu source-aware browsing:

```text
Memory Menu
  -> listMemoryExplorerSources
  -> MemoryExplorerSourceService
  -> Local Memory source + MemoryImportCatalogService sources
  -> user selects source
  -> listAgentsWithMemory/listAgentTeamsWithMemory(source)
  -> local MemoryFileStore OR imported MemoryFileStore rooted at memory/imports/<sourceNodeId>
  -> route/store preserves selected source through list/detail/inspector/back flows
  -> read-only imported memory cards/details
```

Runtime Memory Sync configuration:

```text
Nodes page `Memory Sync` tab
  -> updateMemoryHubConfig or updateMemorySyncSourceConfig GraphQL mutation
  -> MemorySyncConfigService
  -> persisted config
  -> MemorySyncWorker reload/restart OR hub ingestion role refresh
  -> status result
```

Memory Hub setup URL/token creation:

```text
Nodes page `Memory Sync` tab on hub node
  -> user enables Memory Hub
  -> GraphQL returns advertised hub URL candidates
  -> ServerAddressCandidateService combines AUTOBYTEUS_SERVER_HOST/configured base URL first,
       bound NodeProfile.baseUrl,
       LAN/tailnet-like addresses,
       and manual entry
  -> user chooses or edits advertisedHubBaseUrl
  -> updateMemoryHubConfig
  -> MemorySyncConfigService persists hub config
  -> createMemoryHubSourceCredential if no active credential or user clicks Generate
  -> MemoryHubCredentialService creates secure random token and stores hash only
  -> MemoryHubConnectionInfoService returns copyable setup once:
       { hubBaseUrl, ingestEndpointUrl, token }
```

Existing Nodes page assisted setup:

```text
Nodes Page / NodeManager
  -> user selects a registered NodeProfile
  -> Open button
  -> openNodeWindow(nodeId) / bind window node context
  -> user selects the `Memory Sync` tab
  -> bound GraphQL client targets selected node baseUrl
  -> MemorySyncCard for current bound node
  -> updateMemoryHubConfig/updateMemorySyncSourceConfig
  -> backend MemorySyncConfigService persists sourceNodeId/hub settings on that node
```

Hub Import Catalog:

```text
Frontend / API
  -> GraphQL memory import query
  -> MemoryImportCatalogService
  -> MemoryImportStore
  -> imports source list + manifest summaries
```

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | Manual sync scans the local source node memory, fingerprints files, sends full replacements for changed files to the hub, and updates source status. | UI, GraphQL resolver, sync service, scanner, planner, client, hub ingestion, import store | `MemorySyncService` | config, auth, batching, progress |
| DS-002 | Runtime keeps writing local memory as today. A background sync worker independently discovers changed files and sends them to the hub. | runtime writer, memory file, sync worker, planner, client, hub ingestion | `MemorySyncWorker` | poll/watch cadence, backoff, file fingerprint state |
| DS-003 | Hub receives a source file batch, validates source/token/path safety, commits files atomically under imports, and updates manifest. | REST route, auth, ingestion service, import store | `MemoryHubIngestionService` | path normalization, idempotency, partial upload cleanup |
| DS-004 | User reads source/hub status through GraphQL; backend returns role config, last sync, active job, errors, imported source summary. | UI, GraphQL resolver, status service, state/import stores | `MemorySyncStatusService` | error shaping, counts, health |
| DS-005 | Hub lists imported sources from `memory/imports`, including source metadata and manifest summary. | catalog query, import catalog service, import store | `MemoryImportCatalogService` | corrupted source folder handling |
| DS-006 | Batch result or failure is converted into durable source sync state so retries can continue without runtime impact. | hub response, client, state store, status service | `MemorySyncStateStore` | retryability, last error, high-water state |
| DS-007 | Source scanner excludes imports and sync internals, classifies relative paths, fingerprints files, and creates full-file replacement operations for changed files. | scanner, change planner, file descriptors | `MemoryFileChangePlanner` | hash cache, changed-file no-op planning |
| DS-008 | The Memory menu defaults to Local Memory, then lets the user explicitly select one imported source; existing agent/team explorer flows read either local memory or one imported source root. Imported results are marked read-only. | memory menu, source service, explorer resolver, local/imported memory store | `MemoryExplorerSourceService` | default local selection, source selector, imported labels, action suppression |
| DS-009 | Node-bound `Memory Sync` tab changes persist source/hub config and apply them to the sync worker or hub ingestion role without restarting agent runtime. | Nodes page Memory Sync UI, GraphQL resolver, config service, worker/hub role | `MemorySyncConfigService` | token safety, worker reload, connection test |
| DS-010 | Hub status lists imported sources and lets the user jump into a selected imported source in Memory menu. | status UI, catalog service, import store, memory menu route/state | `MemoryImportCatalogService` | source summaries, navigation state |
| DS-011 | Existing frontend Nodes page opens the right node-bound context; the `Memory Sync` tab then calls that bound node's backend. Frontend node id/name stay UI metadata, not import identity. | nodes page, node store, window node context, memory sync card, config resolver | `NodeManager` for navigation; `MemorySyncConfigService` for persisted sync config | one primary tab, no separate row-level Memory Sync button, no multi-target hidden writes |
| DS-012 | Hub setup persists an editable advertised URL and creates backend-generated source credentials; only newly created/regenerated plaintext tokens are copyable. | Memory Sync tab, GraphQL resolver, config service, credential service, connection info service | `MemoryHubConnectionInfoService` + `MemoryHubCredentialService` | URL suggestion vs reachability, hash-at-rest token storage, one-time secret display |
| DS-013 | Hub setup lists URL candidates without treating any startup/listen URL as authoritative. | Memory Sync tab, GraphQL resolver, server address candidate service, connection info service | `ServerAddressCandidateService` | configured public URL first, bound node URL, LAN/tailnet candidates, manual entry |
| DS-014 | Background sync observes live-changing memory files, especially active raw trace JSONL, and sends full-file replacements for changed files. | worker, scanner, change planner, source fingerprint state, hub replace commit | `MemorySyncWorker` + `MemoryFileChangePlanner` | stable-read guard, file fingerprinting, atomic replacement |

## Spine Actors / Main-Line Nodes

- `MemorySyncGraphQLResolver`: frontend-facing config/status/manual-sync boundary.
- `MemorySyncService`: manual sync use-case owner.
- `MemorySyncWorker`: optional background/real-time sync loop.
- `LocalMemoryExportScanner`: discovers exportable local memory files.
- `MemoryFileChangePlanner`: compares local file fingerprints to last accepted send state and creates no-op or full-file replace operations.
- `MemorySyncStateStore`: source-side durable state for each hub target.
- `MemoryHubClient`: source-side HTTP client for hub ingestion/health.
- `MemoryHubRestRoutes`: hub REST boundary for source-node pushes.
- `MemoryHubIngestionService`: hub-side batch validation and commit owner.
- `MemoryHubCredentialService`: hub-side source token generation, hash-at-rest storage, validation, revocation, and source binding owner.
- `MemoryHubConnectionInfoService`: hub-side setup-info owner that combines advertised hub URL, REST route constants, and one-time credential creation/regeneration results.
- `ServerAddressCandidateService`: generic backend address-candidate owner for loopback/configured/LAN/tailnet/manual base URL candidates used by Memory Hub and, after extraction, remote access.
- `MemoryImportStore`: hub-side storage owner for `memory/imports`.
- `MemoryImportCatalogService`: hub-side imported source listing/status owner.
- `MemorySyncConfigResolver`: config owner for source/hub roles.
- `MemorySyncConfigService`: persists and applies hub/source configuration at runtime.
- `MemoryExplorerSourceService`: lists/selects Local Memory and imported source roots for the Memory menu.
- `ImportedMemoryExplorerAdapter`: opens existing memory explorer services against `memory/imports/<sourceNodeId>`.
- `MemorySyncCard` / Memory menu source selector: frontend node-bound configuration and browsing controls.
- `NodeManager` / `WindowNodeContextStore`: existing frontend node registry and node-bound routing owners used to reach the node being configured.

## Ownership Map

| Node | Role | Ownership |
| --- | --- | --- |
| `MemorySyncService` | Manual sync owner | sync job lifecycle, scan scope, batching, status transitions |
| `MemorySyncWorker` | Background sync owner | recurring/polling lifecycle, scheduling, backoff, stop/start |
| `LocalMemoryExportScanner` | Source filesystem discovery owner | includes `agents`/`agent_teams`, excludes `imports`/sync/temp files, emits safe relative paths |
| `MemoryFileChangePlanner` | Changed-file policy owner | hash/mtime/size comparison, no-op vs full-file replace decision |
| `MemorySyncStateStore` | Source durable state owner | last sent state per hub/source, active job, last success/error, retry data |
| `MemoryHubClient` | Source remote transport owner | auth headers, request body/chunks, response parsing |
| `MemoryHubIngestionService` | Hub write owner | source auth, source id validation, path safety, batch idempotency, manifest update |
| `MemoryHubCredentialService` | Hub credential owner | secure token generation, token hash storage, token validation, revoke/regenerate, optional/claimed `sourceNodeId` binding |
| `MemoryHubConnectionInfoService` | Hub setup info owner | advertised URL normalization, ingest endpoint composition, copyable setup payloads with one-time token values |
| `MemoryImportStore` | Hub imported file storage owner | atomic writes under `memory/imports/<sourceNodeId>`, manifests, source metadata |
| `MemoryImportCatalogService` | Hub read/catalog owner | imported source summaries, manifest counts, last import status |
| `MemorySyncGraphQLResolver` | API facade | user-facing config/status/actions; no sync business logic |
| `MemoryHubRestRoutes` | Ingestion facade | source-node REST endpoints; no storage logic |
| `MemorySyncConfigService` | Runtime config owner | source/hub config persistence, validation, connection test orchestration, worker reload |
| `ServerAddressCandidateService` | Address candidate owner | configured public URL first, then current/LAN/tailnet/manual URL candidate generation; no credential or sync behavior |
| `NodeManager` / `WindowNodeContextStore` | Frontend node navigation/routing owner | registered node list, open node-bound window/context, route API calls to the selected node |
| `MemoryExplorerSourceService` | Memory menu source owner | local/imported source list, Local Memory defaulting, and selected source resolution |
| `ImportedMemoryExplorerAdapter` | Imported memory read adapter | creates memory explorer/detail readers rooted at a selected import source |

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `MemorySyncGraphQLResolver` | `MemorySyncService`, `MemorySyncStatusService`, config/credential/connection-info services | frontend control and status | scanning, file replacements, hub writes, token generation logic |
| `listMemoryHubUrlCandidates` GraphQL field | `ServerAddressCandidateService` | frontend setup candidate list | deciding the advertised URL without user confirmation |
| `MemoryHubRestRoutes` | `MemoryHubIngestionService` | source-node ingestion transport | import storage, idempotency policy |
| `MemorySyncStore` in frontend | GraphQL resolver/services | UI state/actions | generating hub tokens, storing plaintext hub credentials outside form state, local filesystem access |
| `MemoryHome` source selector | `MemoryExplorerSourceService` and memory explorer resolvers | user chooses local/imported memory | interpreting filesystem roots or offering runtime actions for imports |
| `MemorySyncCard` | `MemorySyncConfigService`, `MemorySyncService`, `MemorySyncStatusService` | node-bound `Memory Sync` tab setup/status/manual sync control | direct hub REST calls from frontend |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Earlier `autobyteus-context-layer` separate project idea | User now prefers embedded current server capability | `autobyteus-server-ts/src/memory-sync` | In This Change | Artifact/design replacement only |
| Earlier raw-trace-only sync as v1 assumption | Future analytics are unknown; full memory artifact mirror preserves more | file mirror of `agents` and `agent_teams` | In This Change | Raw traces remain inside mirrored files |
| `memory/local` relocation option | Would create migration/risk for active runtime paths | keep `memory/agents`, `memory/agent_teams`; add `memory/imports` | In This Change | Explicitly rejected |
| Runtime writer remote-upload hooks | Would couple runtime to hub and duplicate sync policy | scanner/worker after local file writes | In This Change | Forbidden shortcut |
| Imported memory in normal local run history | Would confuse corpus data with runnable local runs | future imported-memory browser if needed | In This Change | Keep imported memory separate |

## Return Or Event Spine(s) (If Applicable)

- Manual result return: `MemoryHubIngestionService -> MemoryHubClient -> MemorySyncService -> MemorySyncStateStore -> GraphQL result -> Frontend toast/status`.
- Failure return: `Network/auth/path/storage failure -> MemoryHubClient typed error -> MemorySyncStateStore failed status -> GraphQL status -> UI retry affordance`.
- Background event return: `Worker cycle result -> state store update -> status query/poll -> UI status`.
- Hub setup return: `MemoryHubCredentialService -> MemoryHubConnectionInfoService -> GraphQL response -> UI one-time token display/copy -> plaintext token discarded from backend response state`.

## Bounded Local / Internal Spines (If Applicable)

| Parent Owner | Bounded Local Spine | Why It Matters |
| --- | --- | --- |
| `LocalMemoryExportScanner` | `memory root -> agents/agent_teams walk -> exclusion filters -> safe relative file descriptors` | Prevents import echo loops and path traversal |
| `MemoryFileChangePlanner` | `file descriptor -> stat/hash/cache compare -> no-op or full-file replace operation` | Keeps changed-file behavior deterministic and simple |
| `MemorySyncWorker` | `timer -> acquire local worker lock -> plan/send batch -> update state -> schedule next` | Avoids overlapping background sync jobs |
| `MemoryFileChangePlanner` | `active raw trace fingerprint -> stable read if possible -> full-file replace operation when changed` | Live raw trace files can be mirrored safely while an agent is still running |
| `MemoryHubIngestionService` | `auth -> source id validation -> path validation -> temp write -> atomic commit -> manifest update` | Hub storage safety and idempotency depend on this sequence |
| `MemoryHubCredentialService` | `generate random token -> hash token -> store credential metadata -> return plaintext once -> later validate with timing-safe hash compare -> bind/verify sourceNodeId` | Prevents frontend-generated secrets and source identity impersonation |
| `MemoryImportStore` | `source id -> import root -> atomic file write/read -> manifest update` | Filesystem operations stay below one boundary |

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Source/hub configuration | DS-001, DS-002, DS-003, DS-009, DS-012 | sync service/client/hub routes | enabled roles, advertised hub URL, source hub URL, source id, display name, intervals | Keeps env/settings parsing centralized | inconsistent role behavior |
| Hub advertised URL | DS-009, DS-012 | connection info service/config service | suggested default, user-confirmed `advertisedHubBaseUrl`, derived ingest endpoint | Source reachability differs across local/Docker/Kubernetes networks | copied setup contains unusable internal URL |
| Source node identity validation | DS-003 | hub ingestion/import store | safe folder name, uniqueness, display metadata | Prevents IP/pod volatility and path injection | unstable imports or security bugs |
| Path exclusion policy | DS-007 | scanner | exclude imports, sync state, temp/lock/partial files | Prevents echo loops and corrupt uploads | recursively imports hub data |
| File hashing/cache | DS-001, DS-002, DS-007 | change planner/state store | detect changed files and avoid resend | Required for repeated sync | full resync every cycle |
| Auth/security | DS-003, DS-012 | hub routes/client/credential service | token generation, hash-at-rest validation, revoke/regenerate, source authorization | Imported memory is sensitive | unauthorized imports/data leak |
| Delete policy | DS-001, DS-002 | sync service/import store | default no automatic hard delete propagation | Hub is corpus; accidental deletion risk | data loss |
| UI wording | DS-004, DS-005 | frontend | distinguish local memory vs imported memory | Avoid user thinking imported runs are runnable | false restore expectations |
| Memory source selector | DS-008 | Memory menu | explicit Local vs imported source selection | Prevents accidental mixing | imported memory appears runnable/local |
| Runtime config reload | DS-009 | sync config service/worker | apply hub URL/token/source id/background mode without agent runtime restart | Docker nodes may already be running | user must recreate containers to configure sync |
| One-time secret display | DS-012 | credential service/frontend card | plaintext token only in creation/regeneration response; later queries return masked summaries | Prevents accidental secret leakage | status page reveals reusable hub token |
| Imported action suppression | DS-008 | memory detail UI/API | hide/disable restore/continue/delete/archive for imported memory | Imported memory is corpus data | false runtime semantics |
| Frontend node navigation | DS-011 | Node Manager / `Memory Sync` tab | open the correct node-bound UI and keep frontend node metadata separate from sync identity | Reuses current Nodes UX | duplicate node registry or silent identity mismatch |
| Bound-node identity banner | DS-009, DS-011 | `MemorySyncCard` | show which frontend node/backend endpoint is being configured before hub/source controls | Prevents wrong-node configuration | user configures embedded when intending Docker, or vice versa |
| Hub URL candidates | DS-012, DS-013 | `ServerAddressCandidateService` / connection info service | provide configured public URL first, plus current/LAN/tailnet/manual choices for advertised hub URL | Follows network-address best practice and existing remote-access shape | one hidden default URL fails for Docker/Kubernetes |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Local memory files | `autobyteus-ts/src/memory/store`, `autobyteus-server-ts/src/agent-memory/store` | Reuse | Existing files are source artifacts | N/A |
| Runtime writes | current runtime and recorder code | Reuse unchanged | Stable local behavior | N/A |
| Memory Sync orchestration | none | Create New `autobyteus-server-ts/src/memory-sync` | New cross-node sync concern | Runtime/run-history services should not own remote sync |
| Hub ingestion REST | existing REST route registration | Extend | Inter-server push is better as REST | N/A |
| Frontend config/status/manual actions | existing GraphQL/node-store/UI patterns | Extend | User-facing controls fit existing frontend structure and should enter through Nodes page | N/A |
| Frontend node setup/navigation | existing `/nodes`, `NodeManager`, `nodeStore`, `WindowNodeContextStore` | Extend | Already owns registered node list and node-bound windows | N/A |
| Server/client-facing URL candidates | existing remote-access address candidate logic | Extract/Share | Remote access and Memory Hub both need loopback/LAN/tailnet/manual candidate generation | Avoid direct dependency from Memory Sync on phone-access-specific service names/types |
| Imported memory browsing | current `MemoryHome`, memory explorer GraphQL/store/services | Extend | Existing Memory menu already presents agent/team memory; add source selector | N/A |
| Imported memory analytics | none/current memory view not enough | Deferred | Future use cases unknown | Avoid premature index/analytics UI |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/memory-sync/source` | source scanner, change planner, manual service, worker, source state | DS-001, DS-002, DS-006, DS-007 | source node | Create New | Source-side only |
| `autobyteus-server-ts/src/memory-sync/hub` | hub ingestion, credential service, connection info, import store, import catalog | DS-003, DS-005, DS-012 | hub node | Create New | Hub-side only |
| `autobyteus-server-ts/src/memory-sync/shared` | shared sync DTOs, manifests, path/source id validation | all | source and hub | Create New | Internal to backend package |
| `autobyteus-server-ts/src/server-addressing` | generic server/client-facing URL candidates | DS-012, DS-013 | hub setup and remote access | Extract/Share | Candidate generation is not Memory Sync-specific and not phone-access-specific |
| `autobyteus-server-ts/src/api/rest/memory-sync.ts` | hub ingestion HTTP routes | DS-003 | source nodes | Extend API | REST for inter-server transfer |
| `autobyteus-server-ts/src/api/graphql/types/memory-sync.ts` | config/status/manual sync/credential GraphQL | DS-001, DS-004, DS-005, DS-009, DS-012 | frontend | Extend API | GraphQL for UI |
| `autobyteus-web` memory sync UI/store | frontend control/status | DS-001, DS-004, DS-005, DS-009 | user | Extend | Nodes page panel first |
| `autobyteus-web` existing Nodes page/Node Manager | registered node navigation and node-bound config entry | DS-011 | user | Extend | add Memory Sync navigation/status hints; do not own `sourceNodeId` |
| `autobyteus-web` Memory menu | local/imported memory browsing | DS-008, DS-010 | user | Extend | source selector on existing MemoryHome |
| backend memory explorer services | source-aware local/imported memory listing/details | DS-008 | Memory menu | Extend | existing local services receive explicit source/root boundary |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `memory-sync/shared/memory-sync-types.ts` | shared | DTOs | source metadata, file descriptors, file ops, job/status types | Keeps source/hub consistent | Yes |
| `memory-sync/shared/source-node-id.ts` | shared | identity validation | normalize/validate source ids | Security and stable import folders | Yes |
| `memory-sync/shared/memory-sync-path-policy.ts` | shared | path policy | safe relative paths and exclusions | Prevent traversal/echo loops | Yes |
| `memory-sync/source/local-memory-export-scanner.ts` | source | scanner | discover local export files | One layout owner | Yes |
| `memory-sync/source/memory-file-change-planner.ts` | source | change planner | choose no-op or full-file replace ops | One sync policy owner | Yes |
| `memory-sync/source/memory-sync-service.ts` | source | manual service | manual sync jobs | Use-case owner | Yes |
| `memory-sync/source/memory-sync-worker.ts` | source | worker | background sync loop | Worker lifecycle owner | Yes |
| `memory-sync/source/memory-sync-state-store.ts` | source | state contract | job/file-fingerprint/status API | Durable state boundary | Yes |
| `memory-sync/source/local-file-memory-sync-state-store.ts` | source | local state impl | state files under `{appDataDir}/memory-sync/source-state` | Default storage outside exported memory | Yes |
| `memory-sync/source/memory-hub-client.ts` | source | transport | call hub REST endpoints | Internal HTTP owner | Yes |
| `memory-sync/hub/memory-hub-config.ts` | hub | config type | hub enablement, advertised hub URL, credential policy | Keeps hub settings explicit | Yes |
| `memory-sync/hub/memory-hub-credential-service.ts` | hub | credential service | generate, hash, validate, revoke, regenerate, bind source tokens | Secret owner | Yes |
| `memory-sync/hub/local-file-memory-hub-credential-store.ts` | hub | credential persistence | store credential hashes and metadata outside imported corpus | Default secret storage | Yes |
| `memory-sync/hub/memory-hub-connection-info-service.ts` | hub | setup info | derive copyable hub setup info from advertised URL and credential creation/regeneration | Keeps URL/token copy behavior in one owner | Yes |
| `server-addressing/server-address-candidate-service.ts` | server addressing | URL candidates | configured public URL first, then current/LAN/tailnet/manual base URL candidates | One network-address candidate policy shared by setup features | Yes |
| `memory-sync/hub/memory-hub-ingestion-service.ts` | hub | ingestion domain | validate/commit batches | Hub write owner | Yes |
| `memory-sync/hub/memory-import-store.ts` | hub | storage contract | imported file and manifest API | Storage boundary | Yes |
| `memory-sync/hub/local-file-memory-import-store.ts` | hub | storage impl | writes under `memory/imports` | Filesystem import owner | Yes |
| `memory-sync/hub/memory-import-catalog-service.ts` | hub | catalog | list imported sources/summaries | Read owner | Yes |
| `memory-sync/source/memory-sync-config-service.ts` | source/shared | config | runtime-updatable sync config and worker reload | One config owner | Yes |
| `memory-sync/hub/imported-memory-explorer-adapter.ts` | hub | imported reader adapter | open memory explorer/detail readers for selected import source | Keeps import root resolution out of UI/API | Yes |
| `agent-memory/services/memory-explorer-source-service.ts` | memory explorer | source owner | list Local Memory plus imported sources | One Memory menu source boundary | Yes |
| `api/rest/memory-sync.ts` | API | REST routes | hub ingestion endpoints | Transport boundary | Yes |
| `api/graphql/types/memory-sync.ts` | API | GraphQL | UI config/status/actions | Frontend boundary | Yes |
| `api/graphql/types/memory-explorer.ts` | API | GraphQL | add explicit source input to memory explorer queries | Existing Memory menu API owner | Yes |
| `autobyteus-web/components/settings/NodeManager.vue` | frontend nodes | node setup navigation | add `Memory Sync` tab; keep row actions to existing `Open`/rename/remove behavior | Existing node-management owner | No backend sync structure |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Source node identity | `source-node-id.ts` | memory-sync shared | Source and hub both validate folder identity | Yes | Yes | raw IP/port folder name |
| Relative path policy | `memory-sync-path-policy.ts` | memory-sync shared | Scanner and hub ingestion must agree | Yes | Yes | ad hoc string checks |
| File operation DTO | `memory-sync-types.ts` | memory-sync shared | Source planner, client, hub ingestion share it | Yes | Yes | generic unvalidated upload blob |
| Sync manifest | `memory-sync-manifest.ts` | memory-sync shared | Source/hub need durable file state | Yes | Yes | analytics index |
| Sync status | `memory-sync-status.ts` | memory-sync shared/source | API/UI/state store share it | Yes | Yes | scattered booleans |
| Hub/source config | `memory-sync-config.ts` + `memory-hub-config.ts` | memory-sync source/hub | Config APIs, worker reload, and setup info need one persisted shape | Yes | Yes | generic server-settings blob |
| Hub credential record | `memory-hub-credential-service.ts` / credential store model | memory-sync hub | Token validation and UI summaries need the same non-plaintext record | Yes | Yes | plaintext token persistence |
| URL candidate | `server-address-candidate-service.ts` | server-addressing | Remote access and Memory Hub need common candidate shape | Yes | Yes | phone-access-only DTO leaked into Memory Sync |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `SourceNodeMetadata` | Yes | Yes | Medium | Separate stable `sourceNodeId` from `lastKnownEndpoint` |
| `MemoryFileDescriptor` | Yes | Yes | Low | Use relative path + size + mtime + hash + kind |
| `MemoryFileOperation` | Yes | Yes | Low | V1 only supports explicit `replace`; no catch-all upload blob |
| `MemorySyncManifest` | Yes | Yes | Medium | Stores sync state only; not analytics/query index |
| `MemorySyncStatus` | Yes | Yes | Low | Separate role config, job state, last error, counts |
| `MemoryHubConfig` | Yes | Yes | Low | Separate `advertisedHubBaseUrl` from source-side target `hubBaseUrl` |
| `MemoryHubSourceCredentialRecord` | Yes | Yes | Low | Store hash + credential metadata only; optional/claimed source binding is explicit |
| `ServerAddressCandidate` | Yes | Yes | Low | Candidate has kind/label/baseUrl/source; selected advertised URL remains separate persisted hub config |

## Final File Responsibility Mapping

Target backend additions:

```text
autobyteus-server-ts/src/memory-sync/
  shared/
    memory-sync-types.ts
    memory-sync-manifest.ts
    memory-sync-status.ts
    source-node-id.ts
    memory-sync-path-policy.ts
  source/
    memory-sync-config.ts
    memory-sync-config-service.ts
    local-memory-export-scanner.ts
    memory-file-change-planner.ts
    memory-sync-service.ts
    memory-sync-worker.ts
    memory-sync-state-store.ts
    local-file-memory-sync-state-store.ts
    memory-hub-client.ts
    memory-hub-response-parser.ts
  hub/
    memory-hub-config.ts
    imported-memory-explorer-adapter.ts
    memory-hub-auth.ts
    memory-hub-credential-service.ts
    local-file-memory-hub-credential-store.ts
    memory-hub-connection-info-service.ts
    memory-hub-ingestion-service.ts
    memory-import-store.ts
    local-file-memory-import-store.ts
    memory-import-catalog-service.ts
    memory-import-path-resolver.ts
autobyteus-server-ts/src/server-addressing/
  server-address-candidate-types.ts
  server-address-candidate-service.ts

autobyteus-server-ts/src/api/rest/memory-sync.ts
autobyteus-server-ts/src/api/graphql/types/memory-sync.ts
autobyteus-server-ts/src/api/graphql/types/memory-explorer.ts   # modify: source-aware list queries
autobyteus-server-ts/src/api/graphql/types/memory-view.ts       # modify: source-aware detail/inspector queries
autobyteus-server-ts/src/agent-memory/services/memory-explorer-source-service.ts
```

Target frontend additions:

```text
autobyteus-web/graphql/queries/memorySyncQueries.ts
autobyteus-web/graphql/mutations/memorySyncMutations.ts
autobyteus-web/stores/memorySyncStore.ts
autobyteus-web/components/settings/MemorySyncCard.vue
autobyteus-web/components/settings/NodeManagerTabs.vue           # modify: add primary Memory Sync tab
autobyteus-web/components/settings/NodeManager.vue               # modify: host Memory Sync tab content, no row-level button
autobyteus-web/stores/nodeStore.ts                               # reuse existing registry; no sourceNodeId authority
autobyteus-web/pages/memory.vue                                      # modify: source route state across home/detail/inspector
autobyteus-web/components/memory/MemoryHome.vue                # modify: source selector
autobyteus-web/components/memory/AgentMemoryDetail.vue         # modify: imported/read-only/source context label
autobyteus-web/components/memory/AgentTeamMemoryDetail.vue     # modify: imported/read-only/source context label
autobyteus-web/components/memory/MemoryInspector.vue           # modify: imported/read-only/source context label
autobyteus-web/stores/memoryExplorerStore.ts                   # modify: selected source state
autobyteus-web/stores/memoryInspectorStore.ts                  # modify: source-aware targets and queries
autobyteus-web/graphql/queries/memoryExplorerQueries.ts         # modify: source input
autobyteus-web/graphql/queries/memoryViewQueries.ts             # modify: source input
```

Target hub storage layout:

```text
memory/
  agents/
  agent_teams/
  imports/
    <sourceNodeId>/
      source-node.json
      sync-manifest.json
      agents/
        ...
      agent_teams/
        ...
```

`agent_teams/` is mirrored with the same relative paths that exist on the source node. The sync layer does not reinterpret team topology. Current team memory examples include:

```text
agent_teams/<rootTeamRunId>/team_run_metadata.json
agent_teams/<rootTeamRunId>/<memberRunId>/raw_traces.jsonl
agent_teams/<rootTeamRunId>/<memberRunId>/raw_traces_000001.jsonl
agent_teams/<rootTeamRunId>/<nestedTeamRunId>/<memberRunId>/raw_traces.jsonl
```

Target local Memory Sync config/state/secret layout:

```text
{appDataDir}/memory-sync/
  memory-sync-config.json             # hub/source role config, including advertisedHubBaseUrl and sensitive source token values masked in APIs/UI
  hub-credentials.json                # credential ids, hashes, source bindings, no plaintext tokens
  source-state/
    <hubKey>.json                     # source-side file fingerprint/status per hub target
```

## Hub Import Metadata And Batch Protocol

`source-node.json` is hub-owned metadata for display and diagnostics. It is not an authorization source of truth.

```json
{
  "schemaVersion": 1,
  "sourceNodeId": "docker-node-1",
  "displayName": "Docker node 1",
  "firstImportedAt": "2026-06-23T10:00:00.000Z",
  "lastImportedAt": "2026-06-23T10:15:00.000Z",
  "lastKnownEndpoint": "http://host.docker.internal:29695",
  "sourceServerVersion": "optional",
  "lastSyncStatus": "success"
}
```

`sync-manifest.json` records sync state only; it must not become an analytics index.

```json
{
  "schemaVersion": 1,
  "sourceNodeId": "docker-node-1",
  "lastCommittedBatchId": "batch-20260623-101500-001",
  "lastCommittedAt": "2026-06-23T10:15:01.000Z",
  "recentBatchIds": ["batch-20260623-101500-001"],
  "totals": { "fileCount": 42, "totalBytes": 1234567 },
  "files": {
    "agents/run-123/raw_traces.jsonl": {
      "kind": "agents",
      "relativePath": "run-123/raw_traces.jsonl",
      "size": 98765,
      "sha256": "...",
      "mtimeMs": 1782219301000,
      "lastBatchId": "batch-20260623-101500-001"
    },
    "agents/run-123/raw_traces_000001.jsonl": {
      "kind": "agents",
      "relativePath": "run-123/raw_traces_000001.jsonl",
      "size": 45678,
      "sha256": "...",
      "mtimeMs": 1782219200000,
      "lastBatchId": "batch-20260623-101500-001"
    },
    "agent_teams/team-run-456/team_run_metadata.json": {
      "kind": "agent_teams",
      "relativePath": "team-run-456/team_run_metadata.json",
      "size": 4096,
      "sha256": "...",
      "mtimeMs": 1782219100000,
      "lastBatchId": "batch-20260623-101500-001"
    },
    "agent_teams/team-run-456/member-run-789/raw_traces.jsonl": {
      "kind": "agent_teams",
      "relativePath": "team-run-456/member-run-789/raw_traces.jsonl",
      "size": 76543,
      "sha256": "...",
      "mtimeMs": 1782219300500,
      "lastBatchId": "batch-20260623-101500-001"
    }
  }
}
```

The source-side state under `{appDataDir}/memory-sync/source-state/<hubKey>.json` uses the same canonical file keys and tracks the last accepted fingerprint for both standalone agent and agent-team files:

```json
{
  "schemaVersion": 1,
  "hubKey": "hub-main",
  "hubBaseUrl": "http://host.docker.internal:29695",
  "sourceNodeId": "docker-node-1",
  "lastSuccessfulSyncAt": "2026-06-23T10:15:01.000Z",
  "files": {
    "agents/run-123/raw_traces.jsonl": {
      "kind": "agents",
      "relativePath": "run-123/raw_traces.jsonl",
      "size": 98765,
      "sha256": "...",
      "mtimeMs": 1782219301000,
      "lastSyncedAt": "2026-06-23T10:15:01.000Z",
      "lastBatchId": "batch-20260623-101500-001"
    },
    "agent_teams/team-run-456/member-run-789/raw_traces.jsonl": {
      "kind": "agent_teams",
      "relativePath": "team-run-456/member-run-789/raw_traces.jsonl",
      "size": 76543,
      "sha256": "...",
      "mtimeMs": 1782219300500,
      "lastSyncedAt": "2026-06-23T10:15:01.000Z",
      "lastBatchId": "batch-20260623-101500-001"
    }
  }
}
```

Source-to-hub batch shape:

```ts
type MemorySyncBatch = {
  protocolVersion: 1;
  batchId: string;
  sourceNodeId: string;
  sourceDisplayName?: string;
  sourceEndpoint?: string;
  generatedAt: string;
  operations: MemoryFileOperation[];
};

type MemoryFileOperation = {
  opId: string;
  operation: "replace";                   // v1 only uses full-file replacement
  kind: "agents" | "agent_teams";
  relativePath: string;                    // relative below kind root, never absolute
  size: number;                          // uploaded file size
  sha256: string;                        // uploaded file hash
  mtimeMs?: number;
  contentEncoding?: "base64" | "binary";  // implementation may use multipart instead
};
```

Hub commit rules:

- Authenticate request with a Memory Hub source credential before accepting batch content.
- Validate/bind credential to `sourceNodeId`.
- Normalize `kind + relativePath`; reject absolute paths, `..`, disallowed path kinds, and symlink/root escapes.
- Write file content to a temporary path under the same import root, then atomically rename/replace where supported.
- Update `sync-manifest.json` only after file operations are committed.
- Remember recent committed `batchId` values; retrying an already committed batch returns success/no-op.
- Do not hard-delete hub corpus files in v1. Delete markers can be designed later if product policy requires them.

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `source-node-id.ts` | memory-sync shared | identity | validate/sanitize source ids | Single source of truth | Yes |
| `memory-sync-path-policy.ts` | memory-sync shared | path safety | inclusion/exclusion/path traversal rules | Shared by source and hub | Yes |
| `local-memory-export-scanner.ts` | memory-sync source | scanner | walk local agents/team memory | Keeps layout local | Yes |
| `memory-file-change-planner.ts` | memory-sync source | changed-file policy | decide no-op vs full-file replace operations | Core sync algorithm owner | Yes |
| `memory-sync-service.ts` | memory-sync source | manual sync | user-triggered jobs | Use-case owner | Yes |
| `memory-sync-worker.ts` | memory-sync source | background sync | real-time/polling loop | Lifecycle owner | Yes |
| `server-address-candidate-service.ts` | server-addressing | URL candidates | configured/current/LAN/tailnet/manual base URL candidates | Shared network setup policy | Yes |
| `memory-hub-credential-service.ts` | memory-sync hub | credential service | generate/hash/validate/revoke/regenerate source tokens | Secret lifecycle owner | Yes |
| `memory-hub-connection-info-service.ts` | memory-sync hub | setup info | copyable hub URL/token payload using advertised URL and route constants | Prevents URL/token rules spreading into UI | Yes |
| `local-file-memory-import-store.ts` | memory-sync hub | import storage | writes imported files/manifests | Hub filesystem boundary | Yes |
| `memory-hub-ingestion-service.ts` | memory-sync hub | hub write | validate/commit operations | Governing hub owner | Yes |
| `memory-import-catalog-service.ts` | memory-sync hub | hub read | imported source summaries | UI/status owner | Yes |
| `api/rest/memory-sync.ts` | REST API | ingestion facade | source-to-hub endpoints | Transport only | Yes |
| `api/graphql/types/memory-sync.ts` | GraphQL API | UI facade | config/status/manual action | Transport only | Yes |
| `MemorySyncCard.vue` | frontend UI | node-bound `Memory Sync` tab content | show bound-node identity, configure/status/sync action | User-facing entry from Nodes page | Yes |

## Ownership Boundaries

- Runtime writers own local memory only. They do not know about Memory Sync.
- Memory Sync source subsystem owns scanning and pushing local memory files.
- Memory Hub subsystem owns imported memory storage under `memory/imports`.
- Normal run-history/memory-view services own local runnable memory only; they must not silently include imports.
- Frontend owns UI actions/status only and must go through backend GraphQL.
- Memory Explorer source selection owns visibility of local vs imported memory in the Memory menu.
- Imported memory is corpus data, not runtime state.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `MemorySyncService` | scanner, planner, state store, client | GraphQL resolver, manual trigger | resolver scans files or sends HTTP batches directly | add service method |
| `LocalMemoryExportScanner` | local file walk and exclusions | sync service/worker | worker duplicates file traversal rules | add scanner options |
| `MemoryFileChangePlanner` | stat/hash/no-op/full-replace decision | sync service/worker | service manually decides changed-file policy | add planner operation type |
| `MemoryHubIngestionService` | auth/source/path validation, import store commit | REST route | route writes files directly | add ingestion method |
| `MemoryImportStore` | import path resolution, atomic writes, manifest files | ingestion/catalog services | services write `memory/imports` paths manually | add store method |
| `MemoryImportCatalogService` | imported source listing/summaries | GraphQL resolver/UI | UI reads folders directly | add catalog query |
| `MemoryExplorerSourceService` | Local/imported source list, Local Memory default, and selected root resolution | Memory explorer GraphQL resolver/UI | resolver guesses import roots ad hoc or defaults to an imported source | add source service method |
| `MemorySyncConfigService` | persisted source/hub config and worker reload | GraphQL resolver/Nodes page panel | UI writes generic server settings and worker misses reload | add config service method |
| `MemoryHubCredentialService` | secure token creation, hash storage, validation, source binding, revocation | GraphQL resolver, hub ingestion service | frontend generates/stores hub token or route compares plaintext secrets directly | add credential service method |
| `MemoryHubConnectionInfoService` | advertised URL normalization and setup payload composition | GraphQL resolver/MemorySyncCard | UI constructs ingest URL from hidden route knowledge and stale token rules | add connection-info method |
| `ServerAddressCandidateService` | configured/current/LAN/tailnet/manual candidate generation | Memory Sync hub setup and remote-access setup | each feature duplicates OS network-interface and URL normalization logic | add generic candidate API |

## Dependency Rules

Allowed dependencies:

- `memory-sync/source` may read the configured local memory root.
- `memory-sync/source` may call hub REST endpoints through `MemoryHubClient`.
- `memory-sync/hub` may write under `memory/imports` through `MemoryImportStore`.
- GraphQL memory-sync resolver may call source/hub status and manual sync services.
- GraphQL memory-sync resolver may call `MemoryHubCredentialService` and `MemoryHubConnectionInfoService` for hub setup.
- GraphQL memory-sync resolver may call `ServerAddressCandidateService` to list advertised hub URL candidates.
- Frontend may call backend GraphQL only.
- Node Manager may open/focus a node-bound window/context and navigate the user to that node's `Memory Sync` tab.
- Memory explorer queries must pass/resolve an explicit memory source scope before reading imported memory.

Forbidden shortcuts:

- Runtime memory writers must not call `MemoryHubClient`.
- Hub ingestion routes must not write files directly; they use `MemoryHubIngestionService` and `MemoryImportStore`.
- `memory/imports` must not be scanned as source export content by default.
- Imported memory must not be included in normal local run history by default.
- Imported memory details must not expose restore/continue/archive/delete actions in v1.
- Source folder names must not be raw unsanitized endpoint strings.
- Source folder names must not silently come from frontend-only `NodeProfile.id` or editable `NodeProfile.name`.
- No path operation may accept `..`, absolute paths, or symlink escapes under import root.
- Frontend must not generate Memory Hub source tokens; it only displays plaintext tokens returned once by backend mutations.
- Hub URL copy behavior must not use an unconfirmed internal listen address as authoritative; use persisted `advertisedHubBaseUrl`.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `startMemorySync(input)` | manual sync job | trigger source sync | scope + hub target + mode | GraphQL mutation |
| `getMemorySyncStatus()` | sync status | source/hub status | local server | GraphQL query |
| `updateMemoryHubConfig(input)` | hub config | enable/disable hub and save advertised URL | enabled + `advertisedHubBaseUrl` | GraphQL mutation; URL can be suggested but must be user-confirmed |
| `listMemoryHubUrlCandidates(input)` | hub setup URL candidates | list possible advertised hub base URLs | current bound node base URL + optional manual URL | GraphQL query; candidates are suggestions only |
| `updateMemorySyncSourceConfig(input)` | source config | save source settings | sourceNodeId, display name, hub base URL, token, mode | GraphQL mutation; source stores token as sensitive local config and masks it in later reads |
| `getMemoryHubConnectionInfo()` | hub setup | provide current setup metadata | advertised hub URL + ingest endpoint + credential summaries | GraphQL query; no previously generated plaintext token values |
| `createMemoryHubSourceCredential(input)` | hub credential | create a source credential | optional label + optional/claim-on-first-use source binding | GraphQL mutation; returns plaintext token once |
| `regenerateMemoryHubSourceCredential(input)` | hub credential | replace a credential secret | credentialId | GraphQL mutation; returns new plaintext token once and invalidates old secret |
| `revokeMemoryHubSourceCredential(input)` | hub credential | revoke a source credential | credentialId | GraphQL mutation |
| `openNodeWindow(nodeId)` / node-bound navigation | frontend node registry | open a UI context for the selected frontend node | `NodeProfile.id` | Existing frontend/electron API; not a Memory Sync identity |
| `listMemoryImports()` | hub import catalog | list imported sources | sourceNodeId filters | GraphQL query |
| `listMemoryExplorerSources()` | Memory menu sources | list Local Memory and imported source choices | local + sourceNodeId | GraphQL query; Local Memory is the default option |
| `listAgentsWithMemory(source, ...)` | agent memory listing | list agents for selected local/imported source | `MemoryExplorerSourceInput` | Existing query extended/source-aware |
| `listAgentTeamsWithMemory(source, ...)` | team memory listing | list teams for selected local/imported source | `MemoryExplorerSourceInput` | Existing query extended/source-aware |
| `getAgentRunMemoryView(source, runId, ...)` | memory detail | read local/imported run memory | `MemoryExplorerSourceInput` + runId | Imported returns read-only metadata |
| `getTeamMemberRunMemoryView(source, teamRunId, memberRunId, ...)` | team member detail | read local/imported member memory | `MemoryExplorerSourceInput` + ids | Imported returns read-only metadata |
| `testMemoryHubConnection(input)` | source config | validate hub URL/token at runtime | hub base URL + token + sourceNodeId | GraphQL mutation/query; hub rejects revoked/wrong/bound-to-different-source tokens |
| `scanLocalMemoryForExport(scope)` | local export | enumerate exportable files | memory root + scope | internal source API |
| `planChangedMemoryFiles(scan, state)` | changed-file plan | no-op/replace operations | file descriptors + prior accepted fingerprint state | internal source API |
| `pushMemoryFileBatch(batch)` | hub client | send operations to hub | sourceNodeId + batchId | internal source API |
| `POST /rest/memory-sync/v1/batches` | hub ingestion | receive file operation batch | bearer source token + sourceNodeId + batch | External REST endpoint; route file registers `/memory-sync/v1/batches` under `/rest` prefix |
| `GET /rest/memory-sync/v1/health` | hub health | remote health check | bearer source token + sourceNodeId for authenticated setup tests | External REST endpoint; route file registers `/memory-sync/v1/health` under `/rest` prefix |
| `commitMemoryImportBatch(batch)` | hub import | validate and commit files | sourceNodeId + operations | internal hub API |
| `resolveMemoryExplorerSource(source)` | Memory menu source | map local/imported source input to a concrete root and metadata | `LOCAL` or `IMPORTED/sourceNodeId` | Internal API; omitted source resolves to Local, unknown imported source returns typed error |
| `changeSourceNodeIdentity(input)` | source config | explicitly change source identity with warning/confirmation | old sourceNodeId + new sourceNodeId + confirmation | Optional implementation helper behind source config update |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `startMemorySync` | Yes | Yes | Medium | Scope enum: all, agents, teams, run/team future |
| `MemoryFileOperation` | Yes | Yes | Medium | Explicit operation type and relative path |
| Hub REST batch | Yes | Yes | Low | Requires sourceNodeId and batch id |
| `listMemoryImports` | Yes | Yes | Low | Import identity is sourceNodeId |
| `updateMemoryHubConfig` / `updateMemorySyncSourceConfig` | Yes | Yes | Low | Keep hub advertised URL separate from source target config |
| `listMemoryHubUrlCandidates` | Yes | Yes | Low | Candidate result is not persisted until `updateMemoryHubConfig` |
| `create/regenerateMemoryHubSourceCredential` | Yes | Yes | Low | Plaintext token only in mutation response; hash at rest |
| `MemoryExplorerSourceInput` | Yes | Yes | Medium | Explicit `LOCAL` or `IMPORTED/sourceNodeId`; omitted source resolves to `LOCAL`; UI falls back on invalid route source; backend direct unknown imported source returns typed error |
| `testMemoryHubConnection` | Yes | Yes | Low | Does not save config unless explicitly requested |
| frontend node navigation | Yes for UI navigation | Yes: `NodeProfile.id` only | Medium | Never reuse as Memory Sync import identity |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Feature | `Memory Sync` | Yes | Low | Avoid context-sync wording |
| Receiving server role | `Memory Hub` | Yes | Low | Makes hub role clear |
| Source role | `Memory Sync Source` | Yes | Low | Makes push role clear |
| Imported storage | `memory/imports/<sourceNodeId>` | Yes | Medium | Document imported != runnable |
| Source id | `sourceNodeId` | Yes | Low | Stable logical id, not IP |
| Frontend node id | `NodeProfile.id` | Yes for UI registry | Medium | Use only for frontend node navigation, not hub import identity |
| Memory menu source input | `MemoryExplorerSourceInput` | Yes | Low | Makes local/imported selection explicit |

## Applied Patterns (If Any)

- Scanner: `LocalMemoryExportScanner` reads existing file artifacts without changing runtime writers.
- Change planner: `MemoryFileChangePlanner` owns repeated sync efficiency.
- Worker loop: `MemorySyncWorker` owns optional background sync.
- Client adapter: `MemoryHubClient` isolates source-to-hub HTTP.
- Service/domain/storage: `MemoryHubIngestionService` plus `MemoryImportStore` separates REST transport from filesystem writes.
- Manifest/fingerprint state: source and hub manifests make sync idempotent and resumable.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/memory-sync/` | Folder | Memory Sync subsystem | source/hub/shared sync code | Product feature spans beyond agent-memory internals | runtime memory writer logic |
| `memory-sync/source/` | Folder | source role | scanner, planner, worker, source state, hub client | Source-only sync concerns | hub import writes |
| `memory-sync/hub/` | Folder | hub role | advertised setup info, credentials, ingestion, import store, import catalog | Hub-only sync concerns | source scan logic |
| `memory-sync/shared/` | Folder | shared sync contracts | DTOs, manifests, path/id validation | Source and hub must agree | runtime DTO sprawl |
| `server-addressing/` | Folder | server address candidates | configured/current/LAN/tailnet/manual URL candidates | Reused network setup policy | token or sync behavior |
| `api/rest/memory-sync.ts` | File | REST transport | source-to-hub batch/health endpoints | Inter-server transfer fits REST | filesystem writes |
| `api/graphql/types/memory-sync.ts` | File | GraphQL transport | frontend config/status/manual actions | UI boundary | sync algorithms |
| `api/graphql/types/memory-explorer.ts` | File | GraphQL transport | source-aware memory explorer | Existing Memory menu API | sync configuration |
| `components/settings/NodeManager.vue` | File | frontend node registry UI | open/configure registered node Memory Sync entry | Existing Nodes page owner | backend sync identity mutation logic |
| `components/memory/MemoryHome.vue` | File | frontend Memory menu | local/imported source selector | Existing memory homepage | hub credentials/direct REST |
| `memory/imports/` | Folder | imported memory namespace | source-node imported memory | Clear local/import separation | hub local runnable runs |
| `{appDataDir}/memory-sync/` | Folder | Memory Sync config/state/secrets | hub/source config, credential hashes, source file fingerprint state | Matches existing app-data config/secret store pattern and stays outside imported corpus | imported memory files or plaintext tokens |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `src/memory-sync/source` | Off-Spine Concern / Worker | Yes | Low | Source-side sync lifecycle only |
| `src/memory-sync/hub` | Main-Line Domain-Control / Persistence-Provider | Yes | Low | Hub ingestion and import storage only |
| `src/memory-sync/shared` | Shared Structures | Yes | Medium | Keep only sync DTOs/policies, no generic utilities |
| `src/server-addressing` | Off-Spine Concern | Yes | Low | Network URL candidate policy shared by setup features; no sync/credential behavior |
| `api/rest/memory-sync.ts` | Transport | Yes | Low | REST facade only |
| `api/graphql/types/memory-sync.ts` | Transport | Yes | Low | GraphQL facade only |
| `memory/imports` | Persistence-Provider | Yes | Low | Imported corpus only |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Storage layout | `memory/agents`, `memory/agent_teams`, `memory/imports/docker-node-1/...` | `memory/local/agents` migration in v1 | Avoids runtime path migration |
| Source identity | `sourceNodeId=cluster-a__finance__autobyteus-server` | `imports/10.1.2.3:8080` as durable identity | Pod/container IP changes |
| Docker local setup | Docker source pushes to `http://host.docker.internal:<hubPort>` with `sourceNodeId=docker-node-1` | Hub discovers Docker container IPs and pulls files | Push is simpler and safer |
| Hub URL setup | UI lists `AUTOBYTEUS_SERVER_HOST` / configured public URL first, plus current node URL, Docker-host alias, LAN/tailnet address, and manual entry; user edits advertised URL to `http://host.docker.internal:<hubPort>` for same-machine Docker or `https://autobyteus-hub.company.com` for Kubernetes ingress when needed | backend blindly copies its internal listen address and calls it the hub URL | Reachability depends on the source node network |
| Hub token setup | hub backend returns `mhub_<random>` once; later UI shows `credentialId`, label, bound/claimed source id, created/last-used/revoked status | frontend generates token or backend stores plaintext token in config | Keeps credentials server-owned and safe at rest |
| Runtime decoupling | runtime writes local files; worker scans later | runtime writer uploads to hub | Keeps remote failure out of runtime |
| Future analytics | derive index later from imported files | mandatory v1 analytics index | Future use cases unknown |
| Import separation | imported memory listed in Memory Hub imports UI | imported runs mixed into local run history | Avoids false runnable/restore semantics |
| Memory menu source selection | `Local Memory` selected by default, then optional `docker-node-1` selector before Agents/Teams lists | one combined list with local and imported runs mixed, or imported source selected by default | Keeps imported memory visible but unambiguous and preserves current local behavior |
| Runtime source configuration | update hub URL/token in the `Memory Sync` tab and reload worker | require Docker container recreation for hub URL changes | Supports user's local Docker workflow |
| Existing frontend node integration | Node Manager opens `docker-node-1` window, MemorySyncCard shows that bound node banner, then saves `sourceNodeId=docker-node-1` on that backend | NodeProfile rename automatically renames `memory/imports/...` | Keeps UI navigation helpful while preserving stable backend identity |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Move local runtime memory to `memory/local` | Clearer separation on paper | Rejected | Keep existing local paths; add sibling `imports` |
| Use IP:port as import folder | Easy local mental model | Rejected as durable identity | Use stable `sourceNodeId`; store endpoint in metadata |
| Separate Memory Hub project | Earlier architecture direction | Rejected for v1 | Embed hub in current server |
| Runtime provider abstraction | Earlier architecture direction | Rejected for v1 | File mirror sync after local writes |
| Raw-trace-only sync | Earlier narrowed scope | Rejected for current v1 | Mirror `agents` and `agent_teams` memory artifacts |
| Imported memory in normal local history | Might make data visible quickly | Rejected | Show imported memory only through explicit Memory menu source selector |
| Require restart to change source hub URL/token | Simpler config loading | Rejected where avoidable | Runtime-updatable config plus sync worker reload |
| Automatic hard delete propagation | Mirror semantics | Rejected by default | Preserve hub corpus; future explicit policy |
| Use frontend `NodeProfile.id`/`name` as automatic import folder | Existing Nodes page already has names | Rejected | Persist explicit backend `sourceNodeId`; use frontend fields only for navigation/suggestions |
| Add separate row-level `Memory Sync` button beside `Open` | Faster access from node rows | Rejected for v1 | Use one consistent journey: `Open` the node, then select the `Memory Sync` tab |
| Auto-generate hub URL only from server listen address | Looks convenient | Rejected | Persist editable `advertisedHubBaseUrl`; suggest defaults but require user confirmation/source test |
| Store plaintext hub source token for later display | Easier copy UX | Rejected | Store only token hash; show plaintext only on creation/regeneration |

## Derived Layering (If Useful)

- Runtime local memory layer: unchanged existing writers/readers.
- Memory Sync source layer: scans local memory, plans full-file replacements for changed files, pushes to hub.
- Memory Hub layer: receives batches and stores imports.
- UI/API layer: config/status/manual sync/import catalog.
- Future data layer: analytics/indexes/experiments derived from imported memory.

Layering is explanatory only. The important boundaries are local runtime memory vs imported memory, source sync vs hub ingestion, stable source identity vs volatile endpoint metadata, and backend `sourceNodeId` vs frontend `NodeProfile` metadata.

## Migration / Refactor Sequence

1. Add memory-sync shared DTOs/policies: source id validation, path policy, file descriptors, file operations, manifest/status types.
2. Add hub import storage under `memory/imports/<sourceNodeId>/` with atomic write helpers and manifest/source metadata files.
3. Add app-data Memory Sync config/state/secret stores under `{appDataDir}/memory-sync/`, including `advertisedHubBaseUrl`, source config, source file fingerprint state, and hub credential hashes/metadata.
4. Extract/add `ServerAddressCandidateService` from the current remote-access address-candidate logic so hub setup can list current/configured/LAN/tailnet/manual advertised URL candidates without depending on phone-access-specific types.
5. Add `MemoryHubCredentialService` and `MemoryHubConnectionInfoService`: secure random token generation, hash-at-rest storage, revoke/regenerate, optional/claimed source binding, advertised URL persistence, and copyable setup payloads.
6. Add hub REST ingestion route and `MemoryHubIngestionService` with credential validation, source id validation, safe relative path validation, and idempotent batch handling.
7. Add source-side `LocalMemoryExportScanner` that walks `memory/agents` and `memory/agent_teams`, excluding `imports`, sync internals if present, temp/lock/partial files, unsafe paths, and symlink escapes.
8. Add `MemoryFileChangePlanner` and source `MemorySyncStateStore` backed by `{appDataDir}/memory-sync/source-state/`.
9. Add `MemoryHubClient` and manual `MemorySyncService`.
10. Add GraphQL config/status/manual sync/import catalog/credential/url-candidate APIs, including `testMemoryHubConnection`, `listMemoryHubUrlCandidates`, `updateMemoryHubConfig`, `updateMemorySyncSourceConfig`, source credential create/regenerate/revoke, and runtime config reload behavior.
11. Add `MemoryExplorerSourceService` and source-aware memory explorer/list/detail GraphQL inputs/outputs; default omitted source to explicit Local Memory and reject unknown imported sources at backend boundary.
12. Extend `pages/memory.vue`, `MemoryHome`, memory detail/inspector components, `memoryExplorerStore`, `memoryInspectorStore`, and memory GraphQL documents with source selector route/store state, imported/read-only labels, and source-preserving navigation.
13. Add frontend GraphQL documents, `memorySyncStore`, and `MemorySyncCard` under the Nodes page `Memory Sync` tab for hub/source config, advertised hub URL candidate selection/editing, one-time token display, test connection, sync now, and background toggle.
14. Extend existing `NodeManagerTabs`/Nodes page with a primary `Memory Sync` tab; do not add a separate node-row Memory Sync button in v1.
15. Add optional `MemorySyncWorker` for background/realtime polling with a non-overlapping worker lock, interval/backoff scheduling, simple stable-read guards, and no runtime-writer hooks; keep disabled by default.
16. Add tests: source id validation, explicit source identity change warning, path policy, scanner fixture for agents/team memory, import exclusion, changed-file no-op/full-replace planning, hub credential create/hash/revoke/regenerate/binding, advertised URL candidate/setup payload, hub ingestion idempotency/atomic partial-write behavior, manual sync source-to-hub integration, GraphQL status/config, Memory Sync node-manager navigation, frontend node rename vs `sourceNodeId`, memory source selector default/fallback, source-preserving route/detail/inspector navigation, imported read-only UI, frontend store/component basics, live raw trace full-file sync, active-file stable-read/defer behavior, changed-file replacement idempotency, and raw-trace archive/active file-level rewrite mirroring.
17. Add documentation/comments clarifying imported memory is not local runnable memory, frontend node registry identity is separate from Memory Sync source identity, and hub URL suggestions must be confirmed/edited for Docker/Kubernetes reachability.

## Design-Principles Conformance Check After Sync Simplification

| Principle Area | Current Design Answer |
| --- | --- |
| Data-flow spine clarity | DS-001/DS-002/DS-007/DS-014 now describe scan/fingerprint/full-file replacement directly; no hidden append-delta sub-spine remains. |
| Ownership clarity | `LocalMemoryExportScanner` owns file discovery, `MemoryFileChangePlanner` owns unchanged-vs-replace decisions, `MemorySyncWorker` owns background scheduling, and `MemoryHubIngestionService` owns authenticated atomic replacement. |
| Authoritative boundary rule | Runtime writers still own only local files and never call hub APIs. GraphQL/REST remain facades over sync services. Hub routes do not write files directly; they call ingestion/import-store boundaries. |
| Off-spine concern control | File fingerprinting is an off-spine concern serving the sync worker/service; it is not spread across UI, runtime writers, or hub routes. |
| Shared structure tightness | `MemoryFileOperation` is tighter after simplification: V1 only has `operation: "replace"`, path kind, relative path, size/hash/mtime, and payload encoding. No optional append-only fields remain. |
| Legacy/removal policy | Earlier append/range delta logic is explicitly out of scope for V1. The clean target is full-file replacement for changed files. |
| Concrete example sufficiency | Live `raw_traces.jsonl`, run-root archive segments such as `raw_traces_000001.jsonl`, raw-trace manifests, and immutable archive segments are covered as file-level mirror examples. |

## Key Tradeoffs

- Embedded hub is simpler than a separate project and directly supports agents querying memory later.
- Keeping current local memory paths avoids migration risk.
- File mirror preserves unknown future value better than raw-trace-only sync.
- Deferring analytics index avoids premature schema decisions; v1 still supports basic source-scoped Memory menu browsing by reusing existing memory explorer readers against imported roots.
- Push sync is easier for Docker/Kubernetes than hub pull, because source nodes know their local memory and only need hub URL/token.
- Editable advertised hub URL is safer than pretending the backend can generate a universally reachable URL; source-side connection testing closes the loop.

## Risks

- Full-file replacement can become expensive if memory files become very large. V1 accepts this tradeoff for robustness because expected files are not gigabyte-sized; mitigate with changed-file no-op detection, batch limits, intervals, and future optional delta work only if real usage proves it necessary.
- Imported memory may include sensitive information. Hub auth, source allowlists, retention/redaction follow-up, and secure transport are important.
- Source id collisions can mix imports. Hub must validate/authorize source ids and require token-to-source binding or claim-on-first-use behavior.
- Auto-suggested hub URLs may be unreachable from Docker/Kubernetes sources. The UI must label the URL as advertised/editable and provide source-side `Test Connection`.
- Source nodes need the hub token to run background sync, so source-side token storage is sensitive. UI/API responses must mask it and future hardening can add encryption/secret-manager integration.
- Frontend node names are editable and frontend registry ids are local; confusing them with `sourceNodeId` would make imports unstable. UI copy must label this distinction clearly.
- Filesystem path traversal or symlink attacks must be prevented by path policy and root containment checks.
- No analytics index means future data analysis will require later derived indexing/export work.
- Deletion semantics need product policy. Default preserving hub corpus avoids accidental data loss but is not a perfect mirror.

## Guidance For Implementation

- Do not modify `MemoryManager`, `RunMemoryWriter`, or runtime write flow for v1 Memory Sync.
- Use `Memory Sync` / `Memory Hub` naming consistently; avoid `context sync` and `memory provider` terminology.
- Preserve existing `memory/agents` and `memory/agent_teams` local paths.
- Store imported memory under `memory/imports/<sourceNodeId>/` only.
- Require or strongly encourage explicit stable `sourceNodeId` for Docker/Kubernetes/local multi-node setups.
- Exclude `memory/imports` from source export by default.
- Treat imported memory as read-only corpus and not local runnable memory.
- Implement manual sync before background sync.
- For background sync, use polling, file fingerprinting, and simple stable-read semantics first; do not depend solely on filesystem watch events and do not lock or call from runtime raw-trace writers.
- Implement hub ingestion as REST and UI controls as GraphQL.
- Generate Memory Hub source tokens only in the backend; store token hashes and metadata under app-data Memory Sync credential storage, never plaintext tokens.
- When a source node saves a hub token for background sync, treat it as sensitive local config and return only masked token state in reads/status.
- Treat the advertised hub URL as user-confirmed configuration. Suggest from the bound node URL/runtime endpoint, but let users edit it for `host.docker.internal`, Kubernetes Service, or Ingress URLs.
- Add Memory menu source selection as the first imported-memory browsing surface.
- Make source/hub configuration runtime-updatable where safe, especially hub URL/token/source id for already-running Docker nodes.
- User approved sending this design to architecture review on 2026-06-23.
