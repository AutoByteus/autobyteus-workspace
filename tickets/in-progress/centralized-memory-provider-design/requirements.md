# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready — user approved sending the simplified Memory Sync / embedded Memory Hub design to architecture review on 2026-06-23.

## Goal / Problem Statement

AutoByteus currently writes runtime memory locally on each agent server node under the server memory directory. Local memory contains standalone agent run memory under `memory/agents/` and agent-team memory under `memory/agent_teams/`. In local Docker, Electron-embedded server, and Kubernetes deployments, companies may run many AutoByteus server nodes across teams/departments. Each node then accumulates useful memory data locally, but the organization has no simple way to bring those memories into one place for later inspection, experiments, analysis, audit, self-improvement, or possible future model/dataset work.

The corrected goal is **Memory Sync**, not a runtime memory-provider redesign.

Provide an embedded **Memory Hub** capability in the existing `autobyteus-server-ts` backend. A server can act as:

- a normal local agent server,
- a Memory Sync source that pushes its local memory to another hub server,
- a Memory Hub that receives imported memory from other source nodes,
- both source and hub.

For v1, the hub stores imported source-node memory as a filesystem mirror under the existing memory root, without changing current local runtime memory layout:

```text
memory/
  agents/                 # current local runnable memory, unchanged
  agent_teams/            # current local team memory, unchanged
  imports/
    <sourceNodeId>/
      source-node.json
      sync-manifest.json
      agents/
      agent_teams/
```

Imported memory must be kept separate from local runnable memory. It is an imported corpus for future use, not active local runtime state and not a restore guarantee.

## Investigation Findings

- Current runtime memory already writes useful files under `memory/agents/` and `memory/agent_teams/`.
- Current local memory should not be moved to `memory/local/` in v1 because that would force a migration and risk runtime path regressions.
- Imported memory can be added under `memory/imports/<sourceNodeId>/` without changing current local runtime behavior.
- A stable logical `sourceNodeId` is better than raw IP/port because Docker container IPs and Kubernetes pod IPs can change. IP/port or service URL should be metadata, not the folder identity.
- For local Docker, users can configure source ids such as `docker-node-1`, `research-node`, or `finance-node` and point them at the Electron/server hub URL.
- For Kubernetes, users can configure source ids such as `cluster-a__finance__autobyteus-server`; pod IP is not stable enough for import identity.
- A hub URL cannot be reliably generated from the bind/listen address alone, because the URL that the frontend/browser can reach is not always the URL that Docker containers, Kubernetes pods, or another network can reach. The hub should therefore persist a user-confirmed **advertised hub base URL**. The primary default candidate should be the configured public/client-facing server URL, `AUTOBYTEUS_SERVER_HOST`; the current bound node base URL and server runtime endpoint may be secondary candidates. The user must be able to edit the final value.
- The existing server already distinguishes bind/startup inputs (`--host`, `--port`, `--data-dir`) from configured public/client URL (`AUTOBYTEUS_SERVER_HOST`) and internal runtime URL (`AUTOBYTEUS_INTERNAL_SERVER_BASE_URL`). Memory Hub should follow that separation and treat startup/configured URLs as candidates for source-facing setup, not as guaranteed source-reachable URLs.
- Existing remote-access pairing already uses an industry-standard candidate flow for network-dependent client URLs: loopback/LAN/tailnet/manual candidates plus user confirmation. Memory Hub should reuse or extract that candidate-generation practice for hub setup instead of offering only one hidden default.
- Hub source credentials should follow the existing server secret-handling pattern used by remote access: generate a cryptographically random token in the backend, store only a hash plus credential metadata, show the plaintext token only on creation/regeneration, and require regeneration if the user loses it.
- The first product value is faithful memory collection. Future analytics are unknown, so the v1 design should avoid premature analytics indexes and instead preserve source memory artifacts plus sync manifests.
- The existing frontend Nodes page/Node Manager already lets users register/open AutoByteus server nodes by display name and base URL. Memory Sync should reuse that UI as a setup/navigation surface, but the frontend node registry is not the durable Memory Sync source identity authority.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Larger Requirement / Feature
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes for cross-node memory aggregation; no runtime memory rewrite needed.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue for imported-vs-local memory; Duplicated Policy Or Coordination if sync logic is scattered; Legacy Or Compatibility Pressure if existing memory layout is moved unnecessarily.
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Runtime memory refactor not needed now; additive Memory Sync subsystem needed.
- Evidence basis: Existing memory files are already available in local node folders. Keeping `memory/agents` and `memory/agent_teams` unchanged while adding `memory/imports` satisfies aggregation without disturbing runtime behavior.
- Requirement or scope impact: The design must add source-node sync, hub ingestion, import storage, sync state, and UI/API controls, while explicitly separating imported memory from local runnable memory.

## Recommendations

1. Call the feature **Memory Sync** and the receiving role **Memory Hub**.
2. Implement Memory Hub inside the current `autobyteus-server-ts` backend; do not create a separate project in v1.
3. Keep the current local memory layout unchanged:
   - `memory/agents/`
   - `memory/agent_teams/`
4. Store imported memory under:
   - `memory/imports/<sourceNodeId>/agents/`
   - `memory/imports/<sourceNodeId>/agent_teams/`
5. Use stable configured `sourceNodeId` values for import folders. Do not use volatile pod/container IP as the stable identity.
6. Synchronize source-node memory artifacts from `agents/` and `agent_teams/` as file mirrors in v1, excluding imports, sync state, temporary files, and unsafe paths.
7. Include `source-node.json` and `sync-manifest.json` under each imported source root.
8. Start with manual sync and add real-time/background changed-file mirroring as a configurable mode.
9. Do not build an analytics index in v1 unless implementation later proves it is needed for basic UI. Preserve memory first; analytics can be derived later.
10. Keep imported memory read-only and not runnable by default.
11. Extend the current Memory menu so a hub can browse both local memory and imported source-node memory.
12. Add a Nodes page `Memory Sync` tab so users can enable the current node as a hub, configure the current node as a source, update hub URL/token after startup, test connection, run sync now, and enable/disable background sync without restarting when possible.
13. Integrate with the existing frontend Nodes page so users can open a node-bound window and configure Memory Sync for that bound node instead of inventing a second node-management surface.
14. Keep `sourceNodeId` separate from frontend `NodeProfile.id` and editable `NodeProfile.name`; those frontend fields may suggest display/default values but must not silently determine the hub import folder.
15. When enabling a Memory Hub, require an advertised hub base URL that is shown to the user and editable. Seed it from the configured public/client-facing server URL first, then the bound node base URL/runtime/LAN/tailnet/manual candidates as conveniences; do not treat any suggestion as guaranteed reachable from Docker/Kubernetes sources.
16. Generate Memory Hub source tokens server-side, store only hashed credentials, show plaintext tokens only once, and let users revoke/regenerate tokens from the `Memory Sync` tab.
17. Present hub URL candidates where possible, including configured/public server URL, current frontend node URL, LAN/tailnet-like addresses from existing address-candidate logic, and manual entry. Persist only the user-confirmed advertised hub URL.

## User Journeys / Product Flow

### UJ-001: Make the current server a Memory Hub

1. User opens the Nodes page and selects the `Memory Sync` tab for the current node.
2. User enables `Memory Hub`.
3. UI proposes advertised hub base URL candidates, with the configured public/client-facing URL (`AUTOBYTEUS_SERVER_HOST` / backend `getBaseUrl()`) first when available, then current bound node/runtime/LAN/tailnet/manual candidates. The user confirms or edits the final value for the network that source nodes will use.
4. Backend persists the advertised hub base URL, starts accepting authenticated Memory Sync ingestion requests, and creates an initial source credential when no active credential exists.
5. UI shows hub status, the advertised hub URL/ingestion endpoint, credential summaries, imported source count, and last import activity.
6. UI shows a newly generated plaintext source token only once and exposes copyable connection information for source-node setup: advertised hub base URL plus token.
7. Memory page gains an imported-source selector when imports exist.

### UJ-002: Configure a source node after it has already started

1. User opens the UI bound to a Docker/Kubernetes/remote source node, either directly or by selecting/opening that node from the existing frontend Nodes page.
2. User opens the `Memory Sync` tab for that bound node.
3. User sets or confirms the node identity (`sourceNodeId`) and display name.
4. User pastes or enters the hub connection information from the Memory Hub: hub URL and hub auth token/credential reference.
5. User clicks `Test Connection`.
6. User clicks `Sync Now` or enables background sync.
7. Backend persists the node-local Memory Sync configuration and applies it at runtime; if a worker restart is required, only the sync worker restarts, not the agent runtime.

### UJ-003: Manual sync from source to hub

1. User clicks `Sync Now` on a source node.
2. Source scans local `memory/agents` and `memory/agent_teams`.
3. Source excludes imports/sync/temp/unsafe files and plans full-file replacement uploads for changed files.
4. Source pushes batches to hub.
5. Hub writes files under `memory/imports/<sourceNodeId>/`.
6. UI shows job progress/result and last sync time.

### UJ-004: Browse imported memory from the Memory menu

1. User opens the homepage Memory menu on a hub server.
2. UI shows a memory source selector above the existing Agents / Agent Teams tabs: `Local Memory` plus imported source nodes such as `docker-node-1`, `finance-prod`, or `cluster-a__finance__autobyteus-server`. `Local Memory` is selected by default on initial page load and whenever no imported source is explicitly requested.
3. User selects an imported source.
4. Existing Agents / Agent Teams tabs show memory from that imported source.
5. Imported memory cards/details are labeled as imported/read-only and include source-node metadata such as source display name, `sourceNodeId`, last import time, and last sync status when available.
6. Restore, continue, delete, archive, or other local-runtime actions are not offered for imported memory unless a future design explicitly adds them.

### UJ-005: Monitor hub imports

1. User opens Memory Sync status on the hub.
2. UI lists imported source nodes as a hub import summary table/card list with display name, source id, last known endpoint, last import time, file counts/bytes if available, and last error.
3. User can open an imported source directly in the Memory menu.

## Scope Classification (`Small`/`Medium`/`Large`)

Large, but bounded and safer than runtime memory-provider refactoring.

## In-Scope Use Cases

- UC-001: User runs a local Electron-embedded AutoByteus server as a Memory Hub.
- UC-002: User runs one or more local Docker AutoByteus server nodes as Memory Sync sources and pushes to the hub.
- UC-003: User runs Kubernetes AutoByteus server nodes as Memory Sync sources with stable logical source ids and pushes to a hub server.
- UC-004: User manually triggers memory sync from the frontend/API.
- UC-005: User enables background/real-time memory sync so changed files are mirrored repeatedly.
- UC-006: Hub stores imported memory from each source under `memory/imports/<sourceNodeId>/` without mixing it into local `agents` or `agent_teams`.
- UC-007: User can inspect Memory Sync status, source nodes, imported memory availability, last sync times, and errors.
- UC-008: Hub Memory menu displays imported source nodes alongside local memory through an explicit source selector.
- UC-009: User can browse imported agents, imported agent-team memory, and imported memory details as read-only memory corpus data.
- UC-010: User can configure hub/source Memory Sync settings from the Nodes page `Memory Sync` tab after a node has already started.
- UC-011: Later downstream experiments or analytics can read imported memory from the hub without requiring source-node disks.
- UC-012: User can use the existing frontend Nodes page to find/open a registered Docker/remote node and then configure that node's `Memory Sync` tab.

## Out of Scope

- Moving current local memory into `memory/local/`.
- Replacing or refactoring runtime memory writes.
- Introducing a runtime memory provider abstraction for this feature.
- Treating imported memory as local runnable/restorable memory.
- Guaranteeing Codex/Claude native session restore from imported memory.
- Building analytics dashboards, model training, dataset curation, or self-evolution pipelines in v1.
- Creating a separate Memory Hub project/service in v1.
- Treating frontend node registry id/name as the automatic durable Memory Sync source identity.
- Syncing `memory/imports/` recursively from a source node to prevent import echo loops.

## Functional Requirements

- FR-001: Existing local runtime memory paths `memory/agents/` and `memory/agent_teams/` must remain unchanged.
- FR-002: A backend node must be configurable as a Memory Hub that accepts memory imports from source nodes.
- FR-003: A backend node must be configurable as a Memory Sync source that pushes its local memory to a configured hub.
- FR-004: A single backend node may be both a Memory Hub and a Memory Sync source.
- FR-005: Each source node must have a stable, filesystem-safe `sourceNodeId` used as the import folder name.
- FR-006: Source node endpoint/IP/port/service name may be stored in metadata, but must not be the required stable import identity.
- FR-007: The hub must store imported source memory under `memory/imports/<sourceNodeId>/`.
- FR-008: Imported memory must include source metadata in `source-node.json`.
- FR-009: Imported memory must include a sync manifest in `sync-manifest.json` or an equivalent manifest file that records file sync state.
- FR-010: Memory Sync v1 must sync files under source `memory/agents/` and `memory/agent_teams/`. Agent-team files must use the same relative-path mirroring model as standalone agent files, with path kind `agent_teams`.
- FR-011: Memory Sync must exclude source `memory/imports/`, Memory Sync internal state, temporary files, partial upload files, lock files, unsafe relative paths, and symlink escapes.
- FR-012: Manual synchronization must be triggerable from backend API and frontend UI.
- FR-013: Background/real-time synchronization must be configurable and disabled by default unless explicitly enabled.
- FR-014: Memory Sync must avoid resending unchanged files by comparing source file fingerprints such as size, mtime, and/or content hash against the last accepted sync state.
- FR-015: Memory Sync v1 must use full-file replacement for every changed file. It must not implement append/range deltas in v1, including for active `raw_traces.jsonl`.
- FR-016: Hub ingestion must be idempotent; duplicate batches or retries must not corrupt imported memory.
- FR-017: Source sync failures or hub unavailability must not affect local runtime execution.
- FR-018: Sync status must expose last success, last error, current job state, configured hub/source role, imported source list, and basic counts.
- FR-019: Imported memory must be treated as read-only corpus data by default.
- FR-020: Imported memory must not appear in normal local runnable run history; it may appear only through explicit imported-memory source selection in the Memory menu or future imported-memory surfaces.
- FR-021: The design must leave future analytics/indexes possible but not require them for v1.
- FR-022: The Memory menu must support an explicit memory source selector with at least `Local Memory` and imported source-node entries when the current server is a hub.
- FR-023: Memory explorer backend APIs must accept an explicit memory source scope so local and imported memory are never mixed accidentally.
- FR-024: Imported memory explorer results must include source-node identity/metadata and read-only/imported indicators.
- FR-025: Agent/team memory detail APIs must be able to read from selected imported source memory without treating it as local runnable memory.
- FR-026: Imported memory views must not expose restore, continue, archive, delete, or active-runtime actions in v1.
- FR-027: Imported source-node memory must be displayed in the existing Memory menu through an explicit source selector before the Agents / Agent Teams tabs, rather than mixing imported runs into the normal local memory list.
- FR-028: Hub Memory Sync status must display an imported source summary list/table and provide an action/link to open each source in the Memory menu with that source preselected.
- FR-029: The Memory menu must default to `Local Memory` on initial load and for any route/state that does not explicitly select a valid imported `sourceNodeId`, preserving current local-memory behavior.
- FR-030: Memory page route/store state must carry the selected memory source through home, agent detail, team detail, inspector, and back-navigation flows; invalid or missing imported selections must fall back to `Local Memory`.
- FR-031: Memory inspector/detail GraphQL queries must accept the same explicit memory source scope and must root raw-trace, working-context, episodic, semantic, and team-member location reads under the selected local/imported source root.
- FR-032: The Nodes page `Memory Sync` tab must allow enabling/disabling the current bound node as a Memory Hub.
- FR-033: The Nodes page `Memory Sync` tab must allow configuring the current bound node as a Memory Sync source by setting `sourceNodeId`, display name, hub URL, auth token, manual/background mode, and sync interval/batch options as applicable.
- FR-034: Memory Sync source configuration updates should apply without full server restart when technically safe; at minimum, the sync worker must reload/restart independently from agent runtime.
- FR-035: UI/API must support testing hub connectivity from a source node before enabling background sync.
- FR-036: Hub status UI/API must list imported sources and allow opening a source in the Memory menu.
- FR-037: Hub UI/API must expose copyable source-node setup information, including the hub URL and the token/credential reference needed by a source node, subject to existing secret-handling rules.
- FR-038: Frontend Memory Sync setup must integrate with the existing Nodes page/Node Manager through one primary `Memory Sync` tab. V1 must not add a separate node-row `Memory Sync` button next to `Open`; users should use the existing `Open` action and then select the `Memory Sync` tab.
- FR-039: The Memory Sync backend configuration must persist `sourceNodeId` as node-local server configuration; it must not rely on frontend-only `NodeProfile.id` as the hub import folder identity.
- FR-040: Editable frontend node display names may seed or display Memory Sync labels, but renaming a frontend node must not silently rename an existing Memory Hub import namespace.
- FR-041: The `Memory Sync` tab must clearly show which bound node is being configured, including frontend node display name, node type, and base URL or equivalent endpoint, so users do not accidentally configure the wrong node.
- FR-042: Memory Hub configuration must persist an editable `advertisedHubBaseUrl` used in copyable source-node setup information and source connection tests.
- FR-043: The default `advertisedHubBaseUrl` suggestion must prioritize `AUTOBYTEUS_SERVER_HOST` / `appConfigProvider.config.getBaseUrl()` because that is the existing configured public/client-facing server URL. The current bound frontend node base URL and server runtime endpoint may be shown as secondary candidates, but the user must be able to override the final advertised URL for Docker/Kubernetes/ingress reachability.
- FR-044: Memory Hub source tokens must be generated by the hub backend using cryptographically secure randomness, stored only as hashes plus metadata, and displayed in plaintext only during creation or regeneration.
- FR-045: Hub ingestion and health checks must authenticate source requests with the generated source token and must bind or validate the token against the presenting `sourceNodeId` so one token cannot silently impersonate arbitrary source identities after it is claimed or bound.
- FR-046: Hub UI/API must allow source credentials to be listed as summaries, revoked, and regenerated without exposing previously generated plaintext token values.
- FR-047: Source nodes may persist the copied hub token as sensitive node-local Memory Sync source configuration for background sync, but status/list APIs and UI must mask it and must not echo the plaintext token after save.
- FR-048: Memory Hub setup UI/API should expose candidate advertised hub URLs, when available, using configured public server URL (`AUTOBYTEUS_SERVER_HOST`) first, then current node URL, LAN/tailnet-like address candidates, and manual entry without making any candidate authoritative until the user confirms it.
- FR-049: Memory Hub URL candidate generation must have one backend owner, preferably a generic server-address candidate service extracted from or shared with the current remote-access address candidate logic, so Memory Hub does not duplicate network-address policy or depend directly on phone-access UI behavior.
- FR-050: The source-to-hub batch protocol must include `batchId`, `sourceNodeId`, source metadata, replace-file operation metadata, path kind (`agents` or `agent_teams`), normalized relative path, size, content hash, and mtime/fingerprint metadata sufficient for idempotent retry and changed-file planning.
- FR-051: Hub file commits must use root-containment checks, temporary/partial writes, atomic rename/replace where supported, and manifest update ordering that prevents partial uploads from appearing as complete imports.
- FR-052: Changing a source node's `sourceNodeId` after sync must be an explicit Memory Sync identity change with a UI warning; it must not silently rename old hub imports, and hub-side source collisions must be rejected unless the presented credential is authorized for that source id.
- FR-053: Background synchronization must be owned by a source-side `MemorySyncWorker` that runs outside runtime writers, uses a non-overlapping worker lock, and performs repeated scan/fingerprint/replace-upload/status cycles on a configured interval.
- FR-054: Background synchronization must be eventually consistent, not synchronous per trace event; local runtime writes must never wait for hub network I/O.
- FR-055: For live active `raw_traces.jsonl` files, when the file fingerprint changes, the source must upload the entire file as a replacement. The scanner may use a simple stable-read guard such as stat/read/stat or short debounce; if the file is actively changing during the read, it may defer that file to the next cycle.
- FR-056: Hub ingestion must write every changed file replacement through a temporary path and atomic replace where supported, then update the manifest only after the replacement is complete.
- FR-057: If an active raw trace file is truncated, rewritten, compacted, or rotated, Memory Sync must treat this as a normal changed-file replacement and upload the whole resulting file.
- FR-058: When compaction/archive/rotation changes raw-trace files, Memory Sync must treat the result as ordinary file changes: new or changed archive segment files such as `raw_traces_000001.jsonl`, raw-trace manifests, and rewritten active `raw_traces.jsonl` are synchronized as files without interpreting how many trace records moved or remained active.
- FR-059: Source sync state must advance only after the hub accepts a batch; failed or rejected batches must leave the previous file fingerprint state intact and be retried with backoff or replanned on a later scan.

## Acceptance Criteria

- AC-001: With Memory Sync disabled, existing local agent/team runs and memory behavior are unchanged.
- AC-002: A server configured as hub accepts an authenticated import from a source node and writes files under `memory/imports/<sourceNodeId>/`.
- AC-003: A source node configured with `sourceNodeId=docker-node-1` can sync to a local Electron/server hub, and the hub stores under `memory/imports/docker-node-1/`.
- AC-004: A Kubernetes-style source id such as `cluster-a__finance__autobyteus-server` is accepted and stored independently of pod IP.
- AC-005: Manual sync copies source `agents/` and `agent_teams/` memory artifacts to the hub import namespace.
- AC-006: Source `memory/imports/` is not synced to the hub.
- AC-007: Re-running sync uploads full replacements for changed files and safely no-ops unchanged files.
- AC-008: Real-time/background sync eventually propagates new local memory file changes to the hub without modifying runtime writers.
- AC-009: Hub outage leaves local runtime execution unaffected and reports sync failure status.
- AC-010: Imported memory does not appear as local runnable memory in normal local run history.
- AC-011: Sync status UI/API shows source/hub role, configured target, imported sources, last sync time, and last error.
- AC-012: Tests or documented checks verify no Codex/Claude native restore is attempted from imported memory.
- AC-013: On a hub with imported sources, the Memory menu displays `Local Memory` and imported source-node choices.
- AC-014: Selecting an imported source in the Memory menu lists that source's imported agents and teams from `memory/imports/<sourceNodeId>/`.
- AC-015: Imported memory detail views are clearly labeled imported/read-only and do not show local runtime actions.
- AC-016: A Docker node that is already running can have hub URL/token/source id configured through UI/API and then run `Sync Now` without restarting the agent runtime.
- AC-017: A source node can test hub connectivity from UI/API and receive success/failure feedback.
- AC-018: Hub Memory Sync status lists imported sources and provides a path from each source to its Memory menu view.
- AC-019: A user can enable Memory Hub, copy hub connection information, paste it into an already-running source node's `Memory Sync` tab, test the connection, and run manual sync through UI/API without restarting the agent runtime.
- AC-020: From the existing Nodes page, a user can open a registered Docker/remote node with the existing `Open` action and then reach the `Memory Sync` tab for that bound node.
- AC-021: Renaming a frontend node changes the frontend label only and does not change the persisted `sourceNodeId` or the hub's `memory/imports/<sourceNodeId>/` folder unless the user explicitly changes Memory Sync source identity through the `Memory Sync` tab.
- AC-022: The `Memory Sync` tab displays the current bound node identity before any hub/source configuration controls.
- AC-023: Enabling Memory Hub proposes a hub URL, lets the user edit and persist the advertised hub base URL, and copyable setup information uses the persisted value rather than an unconfirmed internal listen address.
- AC-024: When a hub source credential is created or regenerated, the plaintext token is returned once for copy/paste; later status/list queries show only masked/summary metadata.
- AC-025: A source node using the copied advertised hub base URL and token can run `Test Connection`; a wrong/revoked token or a token claimed/bound to a different `sourceNodeId` is rejected with a clear error.
- AC-026: After a source token is saved on a source node, the source can run background sync after restart, but the UI/status response shows only masked token state, not the plaintext token.
- AC-027: Enabling Memory Hub shows at least one suggested advertised URL plus manual-edit support; when LAN/tailnet candidates are available, they are shown as choices, and the saved connection info uses only the user-confirmed advertised URL.
- AC-028: Opening the Memory page without an explicit imported-source selection shows `Local Memory` selected and displays the same local Agents / Agent Teams memory as before this feature.
- AC-029: Selecting an imported memory source and navigating into agent detail, team detail, raw-trace inspector, and back to Memory preserves the selected imported source; an invalid imported source in route/state falls back to `Local Memory`.
- AC-030: Retrying the same source batch with the same `batchId` is idempotent and does not duplicate or corrupt imported files; partially written files are not visible as complete imports.
- AC-031: Attempting to change `sourceNodeId` after a source has synchronized requires explicit user confirmation/warning and does not silently move existing hub imports.
- AC-032: Hub ingestion rejects absolute paths, `..` traversal paths, disallowed path kinds, and symlink/root-escape attempts.
- AC-033: While an agent run is actively appending raw traces, background sync can mirror the active `raw_traces.jsonl` as a full-file replacement without blocking the run; later cycles overwrite the hub copy with newer complete file contents when the source file changes again.
- AC-034: If the source detects that an active raw trace file changed during read, it defers or retries that whole file instead of uploading a partial snapshot; a later cycle mirrors the complete file.
- AC-035: Hub ingestion commits a changed file by writing a temporary file, atomically replacing the prior file where supported, and updating the manifest after the file replacement succeeds; retrying the same batch is idempotent.
- AC-036: If compaction/archiving shrinks active `raw_traces.jsonl` and creates or updates archive artifacts, background sync eventually mirrors the changed files to the hub without requiring record-level knowledge of what compaction moved.
- AC-037: Starting a new background sync cycle while a previous cycle is still running no-ops or queues according to worker policy; overlapping cycles must not upload conflicting batches.

## Constraints / Dependencies

- Current memory layout is file-based and must remain stable for runtime code.
- Source and hub may run on local host, Docker, Kubernetes, or across networks.
- Docker/Kubernetes network addresses can change; stable logical source ids are required.
- The network-reachable hub URL depends on the source node's network. The backend can suggest a URL, but user confirmation/editing and source-side `Test Connection` are required for reliable setup.
- Memory files may be JSON, JSONL, manifests, or future file types; sync should treat them as file bytes plus metadata rather than only raw trace records.
- Imported memory may contain sensitive business data and tool outputs; hub ingestion requires authentication and path safety.
- Existing frontend `NodeProfile` records are local UI registry metadata; Memory Sync source identity must be persisted by backend Memory Sync config.
- Source-side saved hub tokens are sensitive local configuration required for background sync; APIs/UI must mask them after save.
- Memory page route/store state must preserve source selection explicitly because current local-only memory routes do not encode a source.
- Hub import writes must tolerate retry and process interruption by using temporary writes and manifest/atomic commit ordering.
- Live files may change while being scanned; background sync must use file fingerprint/stable-read semantics rather than runtime writer locks.

## Assumptions

- Source nodes can reach the hub URL in push mode.
- Each source node has a stable configured identity for sync.
- Hub storage is filesystem-based under the existing memory root for v1.
- Analytics/fine-tuning/self-improvement uses are valuable but not yet specified, so v1 should preserve memory faithfully rather than overfit a query/index design.

## Risks / Open Questions

- Large files could make full-file replacement expensive later, but v1 optimizes for robustness and simplicity because expected memory files are not huge; batch limits, intervals, and future optional delta work can mitigate this if real data proves otherwise.
- Deletion propagation is risky because the hub is also a corpus. Default should be no automatic hard delete propagation in v1 unless explicitly configured later.
- Advanced imported-memory search/filtering UX is not fully defined; basic browsing is defined through the Memory menu source selector.
- Redaction/retention policy is important before enterprise production use.
- Exact GraphQL field names and REST request DTO details can be finalized during implementation, but the API split is decided: REST for source-to-hub ingestion/health, GraphQL for UI config/status/manual sync/credential controls.

## Requirement-To-Use-Case Coverage

| Use Case | Covered Requirements |
| --- | --- |
| UC-001 | FR-001, FR-002, FR-007, FR-018, FR-037, FR-042, FR-043, FR-044, FR-046, FR-048, FR-049 |
| UC-002 | FR-003, FR-005, FR-012, FR-014, FR-033, FR-045, FR-047, FR-050 |
| UC-003 | FR-005, FR-006, FR-016, FR-042, FR-043, FR-045, FR-048 |
| UC-004 | FR-012, FR-018 |
| UC-005 | FR-013, FR-014, FR-015, FR-017, FR-053, FR-054, FR-055, FR-056, FR-057, FR-058, FR-059 |
| UC-006 | FR-007, FR-008, FR-009, FR-019, FR-020, FR-051 |
| UC-007 | FR-018, FR-036 |
| UC-008 | FR-022, FR-023, FR-024, FR-027, FR-028, FR-029, FR-030 |
| UC-009 | FR-023, FR-024, FR-025, FR-026, FR-027, FR-029, FR-030, FR-031 |
| UC-010 | FR-032, FR-033, FR-034, FR-035, FR-037, FR-042, FR-043, FR-044, FR-045, FR-046, FR-047, FR-048, FR-049, FR-052 |
| UC-011 | FR-021 |
| UC-012 | FR-038, FR-039, FR-040, FR-041 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criteria | Scenario Intent |
| --- | --- |
| AC-001 | No local runtime regression |
| AC-002 | Hub ingestion and storage path |
| AC-003 | Local Docker source-node workflow |
| AC-004 | Kubernetes-stable source identity |
| AC-005 | Whole memory artifact mirror for agents/team memory |
| AC-006 | No import echo loop |
| AC-007 | Changed-file full replacement and idempotent no-op for unchanged files |
| AC-008 | Background sync without runtime writer changes |
| AC-009 | Remote failure isolation |
| AC-010 | Imported-vs-local runtime separation |
| AC-011 | Operator/user observability |
| AC-012 | No unsupported native runtime restore |
| AC-013 | Memory menu source selector |
| AC-014 | Imported memory browsing |
| AC-015 | Imported read-only detail behavior |
| AC-016 | Runtime-applied source configuration |
| AC-017 | Hub connection test |
| AC-018 | Hub imported source status/navigation |
| AC-019 | UI-first hub-to-source setup flow |
| AC-020 | Existing Nodes page integration |
| AC-021 | Frontend node rename does not silently rename Memory Sync source identity |
| AC-022 | Bound node identity is visible in Memory Sync tab |
| AC-023 | Advertised hub URL setup and copy payload |
| AC-024 | One-time hub token display and masked credential summaries |
| AC-025 | Source connection test with token/source authorization |
| AC-026 | Source-side saved token supports background sync but stays masked in UI/API |
| AC-027 | Hub URL candidate selection and manual advertised URL confirmation |
| AC-028 | Memory page defaults to Local Memory |
| AC-029 | Selected imported source is preserved through Memory page route/detail/inspector flows and invalid source falls back safely |
| AC-030 | Batch idempotency and atomic commit semantics |
| AC-031 | Source identity changes are explicit and do not silently move imports |
| AC-032 | Path safety and symlink/root containment |
| AC-033 | Live raw trace file full-replacement sync without runtime blocking |
| AC-034 | Stable-read/defer behavior for active files |
| AC-035 | Atomic full-file replacement and idempotent retry |
| AC-036 | Raw-trace archive/compaction is treated as file-level mirroring, not record-level interpretation |
| AC-037 | Background worker non-overlap policy |

## Approval Status

- Earlier remote-provider/context-layer/raw-trace-only designs are superseded by this Memory Sync / embedded Memory Hub design.
- User approved sending this design to architecture review on 2026-06-23.
- Architecture review handoff has been requested with the requirements, investigation notes, and design spec artifact package.
