# Memory Sync / Memory Hub

Memory Sync lets one AutoByteus server push its local persisted memory to another
AutoByteus server that is acting as a Memory Hub. The feature is embedded in
`autobyteus-server-ts`; there is no separate hub service in the current design.

A node can be:

- a normal local runtime node;
- a Memory Sync source that pushes local memory to a hub;
- a Memory Hub that receives imported memory from sources; or
- both a source and a hub.

## Setup Surface

Use the current node window in **Nodes -> Memory Sync**. The tab configures the
backend that the window is bound to, not a global desktop setting.

For a hub:

1. Enable **Memory Hub**.
2. Confirm the **Advertised hub base URL** that source nodes will use.
3. Save hub settings.
4. Copy the generated source token immediately. Plaintext tokens are shown only
   when created or regenerated.

For a source:

1. Open the source node in its own node-bound window.
2. Set a stable `memorySyncSourceId` such as `docker-node-1`, `finance-prod`, or
   `cluster-a__finance__autobyteus-server`.
3. Paste the hub base URL and hub token, then save source settings.
4. Click **Test connection** from that source node. A blank token field tests the
   saved source settings; a pasted token tests the draft URL/source/token
   together.
5. Run **Sync now** or enable background sync.

Frontend node names and the desktop's entry IDs are navigation metadata only.
They are not the durable import identity. `memorySyncSourceId` is the stable folder and
catalog identity used by the hub.

## Storage Layout

Existing local runtime memory remains unchanged:

```text
memory/
  agents/                 # local standalone runs; still runtime-owned
  agent_teams/            # local team/member runs; still runtime-owned
```

Imported memory is stored separately under the hub's memory root:

```text
memory/
  imports/
    <memorySyncSourceId>/
      memory-sync-source.json
      sync-manifest.json
      agents/
      agent_teams/
  memory-sync-staging/    # large files being uploaded; never part of imports/
    <memorySyncSourceId>/
      <sha256>.partial
```

Imported memory is a read-only corpus. It is not local runnable state and is not
a restore/continue guarantee for Codex, Claude, native AutoByteus, or agent-team
runtime sessions.

Memory Sync configuration and source state live under the app data directory:

```text
memory-sync/
  memory-sync-config.json          # hub/source enablement and source token config
  hub-credentials.json             # hub token hashes and credential metadata
  source-state/
    <hubHash>--<memorySyncSourceId>.json # source-side synced-file records and file failures per hub/source
```

The source-side hub token is stored in node-local config so background sync can
continue after restart. Public GraphQL responses and the frontend only expose a
configured/redacted token state.

Data released before autobyteus-290 used the names `sourceNodeId`,
`boundSourceNodeId` and `source-node.json`. The sealed startup migration
`memory-sync-source-id-names` renames them once to `memorySyncSourceId`, `boundMemorySyncSourceId`
and `memory-sync-source.json`, keeping a `<file>.backup-<timestamp>` copy of each file it
rewrites; the Memory Sync source ID values, and the folder and file names made from them,
do not change. Until that migration has succeeded (capability `memory_sync`),
nothing reads or writes Memory Sync files: the settings card shows "Memory Sync
is waiting for its data migration.", the background loop and Sync now do not
run, hub ingestion answers its sources HTTP 503
`{error: "MEMORY_SYNC_NOT_MIGRATED", message}`, and the Memory page lists only
this node's own memory.

## URL Model And Test Connection

The hub persists a user-confirmed `advertisedHubBaseUrl`. This value is the URL
that source nodes should call. It is intentionally separate from the server bind
address and from colocated internal runtime URLs.

URL candidates are conveniences, not reachability guarantees. The candidate list
can include:

- the configured public URL from `AUTOBYTEUS_SERVER_HOST`;
- the current node-bound frontend URL;
- `host.docker.internal` when a loopback URL is a useful Docker-host alias;
- private LAN or tailnet-like interface addresses; and
- a manual URL.

Choose the URL that is reachable from the source node's network. For example, a
Docker source on the same host may need `http://host.docker.internal:<port>`,
while a Kubernetes source may need a Service, Ingress, VPN, tailnet, or other
company-controlled route. Do not assume `localhost` on the hub is reachable from
a container or pod.

The Memory Hub REST endpoints are:

- `GET /rest/memory-sync/v1/health?memorySyncSourceId=<memorySyncSourceId>`
- `POST /rest/memory-sync/v1/batches` (JSON, at most 50 MiB)
- `GET /rest/memory-sync/v1/sources/<memorySyncSourceId>/staged-files/<sha256>`
  answers `{ receivedBytes }`, the bytes of that file the hub already holds (0 when none)
- `PUT /rest/memory-sync/v1/sources/<memorySyncSourceId>/staged-files/<sha256>?offset=<n>`
  (`application/octet-stream`, at most 8 MiB) appends one piece at `offset` and answers
  `{ receivedBytes }`; an offset other than the hub's current length answers 409
  `{ error: "MemorySyncStagedFileOffsetMismatch", receivedBytes }`

All of them admit only memory sync source credentials (node access model NA-7). A reverse proxy
in front of a hub must accept request bodies of at least 50 MiB (FU-002 in
`tickets/done/memory-sync-large-files/follow-ups.md` tracks documenting proxy settings).

Sources authenticate with an `Authorization: Bearer <mhub_...>` token. GraphQL
connection testing is explicit about which configuration is being tested:

- `mode: SAVED` loads the persisted source `hubBaseUrl`, `memorySyncSourceId`, and
  saved hub token from node-local config. This is the mode used by the UI when
  the token field is blank after source settings were saved and the token is
  only visible as a redacted placeholder.
- `mode: DRAFT` uses the request's draft `hubBaseUrl`, `memorySyncSourceId`, and
  plaintext token together. This is the mode used by the UI when the operator
  pastes a draft token before saving it.

The saved mode intentionally does not mix unsaved draft URL or source id edits
with the saved token. To test edited URL/source-id values, save the source
settings first or provide a draft token. Both modes call the health endpoint and
verify that the hub is enabled, the token is accepted, and the source id is
authorized. Test results are status-only; token values are never returned.

## Token And Security Behavior

Hub source tokens are generated by the backend with the `mhub_` prefix. The hub
stores only a SHA-256 hash plus credential metadata:

- credential id;
- optional label;
- optional or first-use `boundMemorySyncSourceId`;
- created/last-used/revoked timestamps.

Plaintext token values are returned only on creation or regeneration. If the
operator loses the token, regenerate it and update the source node. Revoked
tokens are rejected. A token that is bound to one `memorySyncSourceId` cannot be reused
by another source id.

Use Memory Sync only across trusted private networks, VPNs, tailnets, or HTTPS
routes controlled by the operator. The token protects Memory Sync ingestion, but
it is not a substitute for safely exposing the full AutoByteus backend to the
public internet.

## Sync Behavior

A source scans its local memory roots:

- `memory/agents/`
- `memory/agent_teams/`

The scanner lists regular files with their size and modification time; it reads no content. It skips
symlinks and temporary leaves such as `.tmp`, `.partial`, `.lock`, `.swp`, `.swx`, and `.DS_Store`. It also skips
every `received_files` folder with everything in it (autobyteus-587): files another node sent to an agent are copies of that
node's files, not the run's memory, so they are never uploaded to the hub (the message lines that name them are).

**Change detection.** A file whose size and modification time equal its last synced record is
unchanged and is not read. A changed file is hashed (SHA-256) by streaming, so memory use does not
depend on its size, and only when its size and modification time are stable across the read; a file
that changes while being read is deferred to the next run.

**One run sends every changed file.** Changed files are cut, in key order, into batches of at most
`batchSize` files, at most 24 MiB of inline content and at most 4 GiB of staged content (a larger
file goes alone). A source records each batch's outcomes right after sending it.

**Two ways a file reaches the hub, one commit.**

- *Inline file* (up to 8 MiB): its content travels base64-encoded inside the batch operation
  (`contentEncoding: "base64"`).
- *Staged file* (larger): the source first uploads its raw bytes in pieces of at most 8 MiB to the hub's
  staging area `memory/memory-sync-staging/<memorySyncSourceId>/<sha256>.partial` (name = SHA-256 of
  the content), then the batch carries an operation with `contentEncoding: "staged"` and no content.
  An interrupted upload resumes on the next run from the bytes the hub already holds: the source hashes
  the part the hub has locally without sending it, and reads exactly the planned size. A file that
  changed while being uploaded is deferred, never committed. Memory use on both nodes does not grow with
  the file size.

The hub commits a batch under the source's manifest lock in this order: duplicate `batchId` check; verify
every operation (inline: decode, size, SHA-256; staged: each distinct content once, size and streaming
SHA-256); refuse the whole batch, naming the file, before writing anything if one operation cannot be
written; write (inline: temp file and rename; staged: the staged file is renamed into place, and the
same content under several paths, such as one video attached to two runs, is copied to a temporary
sibling of each extra path and renamed, so no reader ever sees a partly written file); record the
manifest. A file is visible under `imports/` only after its full size and SHA-256 are verified, and
nothing partial is ever there. Batch ids are idempotent: retrying the same committed batch succeeds
as a duplicate, while reusing a batch id with different content is rejected.

**Staging cleanup.** A staged file is removed when a commit takes it or when it fails verification. A
partial untouched for 24 h is removed by a background sweep that the hub starts at server start and
at most once an hour when any source calls it; the sweep never runs on a request path (no request
waits for it) and takes each source's manifest lock one source at a time.

**File failures.** A problem of one file (the hub refuses it or its content, it cannot be read, an
upload that cannot continue) does not stop the other files. When a batch of several files is
refused, the source sends each file alone to find the one the hub refuses. The file gets a *file
failure* record in the source state (`fileFailures`: reason, attempts, last and next attempt) and is
retried when its delay has passed (1 minute, doubling per failure up to 1 hour), at once when its size
or modification time changed, and at once on **Sync now**. A warning line is logged once per new
failure or changed reason:
`Memory Sync could not sync <kind>/<relativePath> (<bytes> bytes): <reason>. Next attempt at <ISO time>.`
Problems that affect every file stay run errors with the messages they always had: an invalid or revoked
token, a disabled hub, Memory Sync held back, an unreachable hub, any network error or lost
connection. The run stops, batches already recorded stay recorded, and the next run resumes an
interrupted upload.

**Run gate and trigger.** The background loop and Sync now share one run gate. A background start while
a run is in progress joins it. **Sync now** while a background run is in progress waits for it and then
starts one manual run (further clicks join that run), so Sync now always ends with every failing file
retried.

Background sync is off by default and uses the configured interval when enabled. Source sync failures
are recorded in source state and do not stop local agent runtime execution.

Source status records the current/last job state, `lastSuccessfulSyncAt`, `lastError`, and the files
that could not be synced (`fileFailureCount`, and the 20 most recent `fileFailures`). The frontend
renders this as `Current job: idle` or `Current job: syncing…`, followed by `Last sync: success ·
<timestamp>` or the latest sync error. If a sync fails after an earlier success, the latest error is
shown before the older success timestamp. A run with file failures is `success`; the card then shows a
warning block "N files could not be synced" listing path, size, reason and next attempt of each file
(at most 20, then "and N more"). The run result adds `failedFiles`.

### Update every node together, and release order

A source and a hub must run the same release and be updated together (`DESIGN.md` rule 9): an older
hub does not know the staged-file routes or the `staged` operation, and nothing detects or works around
that. Within this repository, **the change that introduced staged files (ticket
`memory-sync-large-files`, Project Task `autobyteus-workspace-7`) must be released before or with
`autobyteus-workspace-6`** (2 GiB context-file uploads); without it, one large attachment would stop all
Memory Sync.

### Nested Team Memory Layout Upgrades

Required startup migration `20260823_repair_team_agent_memory_layout` moves an
affected flat nested AgentRun directory into the canonical physical hierarchy
derived from the validated migration-owned V1 intermediate Team execution tree.
The following `20260824_team_run_execution_tree_v2` migration establishes the
current runtime/history schema. The migrations and Memory Sync
remain separate owners: the migration does not filter the scanner, emit a
delete, gate sync, or clean a hub import.

Because Memory Sync sends replacements but no deletes, two bounded physical
retention cases are possible:

- a source-plus-valid-canonical conflict may export files from both paths; and
- a hub synchronized before the upgrade may keep the old flat import after a
  later sync adds the canonical path.

This may retain duplicate bytes on a trusted hub. It does not create two
semantic Team members: both local and imported Memory Explorer resolve the
exact member directory from `rootTeamRunId`, its V2 ancestor TeamRun chain, and
`agentRunId`, and never fall back to the flat residue. A migration result with a
real canonical target plus this approved residue is
`SUCCEEDED_WITH_WARNINGS`. If the canonical target is missing or invalid, the
migration is `FAILED`; Memory Sync availability does not make that state
successful. Delete propagation, remote corpus cleanup, and migration-status
sync gating require separate product scope.

### Task Agents As Their Own Runs

Since `20261017_task_agent_own_run_v1`, a task agent (a delegated run) is a run of its own:
`agents/<taskAgentRunId>/` or `agent_teams/<taskTeamRunId>/`. Memory Sync needs no change: those
folders are exported like any run folder, now also the task agents of organization runs (whose
memory used to sit inside `agent_orgs/`, which is not exported). The startup migration moves each
task agent's folder once, so a node that synchronized before the upgrade re-exports the moved files
once; the hub keeps the old nested copies as inert residue (no deletes are sent, as above).

On the hub, imported memory shows a hub's task agents once the source node runs this release and
syncs again; an import from a node not yet upgraded shows its hubs without task agents (there is no
reader for the old layout). Task agents coordinated by an organization run are not listed in
imported memory, because `agent_orgs/` is not exported and their link cannot be checked. Update
every node together.

## Imported Memory Explorer

The Memory page defaults to `Local Memory`. When imports exist, the Memory page
source selector also lists read-only imported sources. Source-aware GraphQL
queries accept `MemoryExplorerSourceInput`:

```graphql
{ type: LOCAL }
{ type: IMPORTED, memorySyncSourceId: "docker-node-1" }
```

The backend resolves imported sources under
`memory/imports/<memorySyncSourceId>/agents` and
`memory/imports/<memorySyncSourceId>/agent_teams`. Unknown imported source ids return
an error instead of silently falling back to local memory.

Imported lists and details are labeled read-only/imported in the UI. Runtime
actions such as restore, continue, archive, or delete are not part of the v1
imported-memory surface.

## Operational Limits

Current v1 limits are intentional:

- no `memory/local/` migration and no runtime memory-provider rewrite;
- no append, range, or delta sync protocol (a changed file is sent whole; only an interrupted upload
  of the same content resumes);
- no per-source exclusion of files by size or type (FU-001 in
  `tickets/done/memory-sync-large-files/follow-ups.md`);
- no delete propagation from source to hub;
- no analytics index, dataset curation, or model training pipeline;
- no automated guarantee that Docker, Kubernetes, LAN, VPN, or tailnet routing is
  correct; use URL candidates plus Test Connection;
- no long-running stress guarantee for active files being appended continuously,
  beyond stable-read deferral and later retries.

## Validation Coverage

Durable coverage includes both API-boundary and process-boundary checks:

- `tests/e2e/memory-sync/memory-sync-api.e2e.test.ts` covers GraphQL hub/source
  setup, source token redaction, URL candidates, explicit draft and saved
  connection-test modes, REST batch ingestion, duplicate retry,
  source-token binding, unsafe path rejection, latest-error source status, and
  imported Memory Explorer reads.
- `tests/e2e/memory-sync/memory-sync-multiprocess.e2e.test.ts` starts two real
  backend server processes with isolated app-data directories, configures the hub
  and source through HTTP GraphQL, validates saved-mode connection testing, runs
  source-to-hub sync over HTTP, asserts imported files on the hub filesystem,
  covers both-path replacement eligibility plus no-delete retention, and proves
  the imported semantic member still resolves only through the canonical V2
  target.
- `tests/e2e/memory-sync/memory-sync-large-files.e2e.test.ts` starts a hub and a source as real
  processes with a counting proxy between them: a 40 MiB attachment, two 20 MiB files and small files
  sync in one run with every request within the limits; the same attachment under two runs is
  uploaded once and imported twice; a connection cut mid-upload resumes from the hub's bytes and
  nothing partial is imported; a piece corrupted in transit fails only its file, which is listed
  with its reason and retried by Sync now.
- Unit tests under `tests/unit/memory-sync/` cover the batch planner, failure policy, change planner,
  stager, batch transfer, run outcomes and run gate, staged-file store, staged commit, and the
  sweep cadence.
- Frontend focused tests cover Memory Explorer source selection/store variables,
  the Nodes page Memory Sync tab entry, form-preserving source status refresh,
  saved-vs-draft test dispatch, inline connection feedback, `Current job` /
  `Last sync` precedence, sync button loading state, and the "files could not be synced" block.

The multi-process test intentionally does not require browser, Electron, Docker,
or Kubernetes. Docker/Kubernetes network reachability remains an operational
configuration concern handled through advertised URL selection and Test
Connection.

## Source Owners

- GraphQL Memory Sync API: `src/api/graphql/types/memory-sync.ts`
- REST hub ingestion API: `src/api/rest/memory-sync.ts`
- Hub services (ingestion, import store, staged-file store): `src/memory-sync/hub/`
- Source services (run owner, change planner, batch planner, batch transfer, stager, failure policy),
  saved/draft connection-test policy, and worker: `src/memory-sync/source/`
- Shared sync DTOs/path/source-id policy, transfer limits and streaming hash: `src/memory-sync/shared/`
- URL candidates: `src/server-addressing/`
- Imported/local Memory Explorer source resolution:
  `src/agent-memory/services/memory-explorer-source-service.ts`
