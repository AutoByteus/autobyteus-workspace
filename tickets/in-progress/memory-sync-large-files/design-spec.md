# Design Spec — memory-sync-large-files

## Solution And Approval Basis

- Current solution revision ID: `SR-002`
- Approved requirements baseline: `requirements-doc.md` at SR-002 (SR-001 baseline plus REQ-008/AC-007/AC-008/DEC-007 revised to DESIGN.md rule 9), approved by the Solution Designer within the direction, user informed in this conversation on 2026-11-15.
- Behavior-defining supplements: None
- User approval of the design: `Not required` (the Task does not ask for design approval)
- Design status: `Ready`
- Canonical investigation-notes path: `/Users/normy/autobyteus-org/autobyteus-task-worktrees/memory-sync-large-files/tickets/in-progress/memory-sync-large-files/investigation-notes.md`
- Authorities read (2026-11-15): `references/architecture-design.md`, `references/design-principles.md`, `DESIGN.md` (repository root, the only one), `autobyteus-server-ts/docs/design/data_migration_guideline.md` §2–§3, `autobyteus-server-ts/docs/design/node_access_model.md` (NA-7, NAS-26), `autobyteus-server-ts/docs/features/memory_sync.md`, `TESTING.md`.
- Project design-principle conflicts or discrepancies: none with the general principles. The approved SR-001 REQ-008 contradicted `DESIGN.md` rule 9 (no compatibility between software versions); the requirement was revised (SR-002), not the rule.

## Current-State Read

One sync run (`memory-sync-service.ts:52-120`) reads config, marks the job `running`, scans, plans, posts batches one after another and marks `success`; any throw marks the whole job `error` and rethrows. The scanner (`local-memory-export-scanner.ts:83-105`) reads and SHA-256-hashes **every** file whole on every run. The planner (`memory-file-change-planner.ts:27-80`) compares fingerprints (size, sha256, truncated mtime), stops after `maxOperations` (= `batchSize`, so a run sends one batch) and reads each changed file whole again to put it base64 into the operation. The client (`memory-hub-client.ts:32-50`) posts `JSON.stringify(batch)`. The hub route (`api/rest/memory-sync.ts:41-54`) has `bodyLimit: 50 MiB`. The hub store (`local-file-memory-import-store.ts:104-212`) commits the batch under the manifest lock (`store-utils.ts:213-228`): for each operation in turn it decodes, verifies size and SHA-256, writes temp + renames, then records the manifest with the batch digest (idempotency).

Problems (evidence: investigation notes, Runtime findings): a batch over 50 MiB fails, the same files lead the next plan, so every later run fails (reproduced with one 40 MiB or two 20 MiB files); ≥ 384 MiB cannot be base64-encoded; ≥ 2 GiB breaks the scan; unchanged files are re-read every minute; the error names no file. Real raw-trace files on the user's node are 40–54 MB.

Constraints: `/rest/memory-sync` is gated to memory sync source credentials (`node-route-permissions.ts:85`); source and hub run the same release (`DESIGN.md` rule 9); a file is visible in the imports only after verification (BEH-007); the hub may be the user's own node.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Large`
- Size rationale: three subsystems change together — Memory Sync source (scanner, planner, new batch planner, new file stager, new failure policy, service), Memory Sync hub (new staged-file store, import store commit, ingestion service, REST routes), and the owner surface (GraphQL schema/resolver, web store/query/card/localization, generated GraphQL types); about 20 files, plus docs.
- Architectural risk: `High`
- Risk rationale: a new node-to-node contract (staged-file routes, `staged` operation encoding), a new hub persistence area (staging) with lifecycle and cleanup, an additive persisted field in source state, a changed run lifecycle (per-file outcomes, all changed files per run), and a scoped content-type parser on the hub.
- Escalation trigger: any need to keep the base64 encoding for large files, a staging location outside the memory directory, a migration of source state or manifest, a change to the node access gate, or measured transfer memory above QR-002 returns to the Solution Designer as `Design Impact`.

## Architecture Investigation Evidence

| Source / Command / Probe | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Reproduction probe | `probes/large-file-sync-probe.e2e.test.ts.txt` | 413 `Request body is too large`, poisoned runs | Byte budget + staged lane + per-file outcomes | None |
| Node ceilings | investigation notes, Source Log | 384 MiB base64, 2 GiB `readFile` | Streaming hash; raw pieces | None |
| Real data sizes | investigation notes | traces 40–54 MB | Transfer, not skip (DEC-001) | None |
| Fastify premise probe | `/tmp/msync-premise/fastify-octet.mjs` (run from `autobyteus-server-ts`, Fastify ^5.12.7) | Scoped `addContentTypeParser("application/octet-stream", {parseAs:"buffer"})` delivers a `Buffer`; a route `bodyLimit` of 8 MiB accepts 8 MiB and refuses 8 MiB + 1 (client sees `ECONNRESET` while writing); a sibling route outside the scope still answers 415 | Staged piece route in its own encapsulated scope | None |
| Manifest lock | `src/persistence/file/store-utils.ts:213-228` | Per-path lock, temp+rename | Large-file commit reuses `commitBatch` | None |
| Imported reader | `src/agent-memory/services/memory-explorer-source-service.ts:83` | Explorer root = `imports/<sourceId>` | Staging lives outside `imports/` | None |
| Route registration | `src/api/rest/index.ts:43` | `registerMemorySyncRoutes(app)` on the `/rest` instance | New routes registered in a child scope | None |
| Migration guideline §3 | `docs/design/data_migration_guideline.md` | Optional field with truthful absence needs no migration; reader projects known fields; writer writes exact shape | `fileFailures` additive | None |
| Node access model | `docs/design/node_access_model.md` NA-7, NAS-26 | "Memory sync source: only the memory sync hub routes" | New routes are hub routes under the same prefix; doc wording unchanged, route list in `memory_sync.md` | None |

## Intended Change

Changed files of a run go to the hub in batches cut by count and by inline bytes. A file larger than 8 MiB is no longer inlined: it is first uploaded as raw bytes in 8 MiB pieces to a hub staging area (resumable), and the batch then commits it with the new `staged` content encoding through the same manifest commit. Change detection stops re-reading unchanged files and hashes changed ones by streaming. Each file gets its own outcome: a file-level problem is recorded with a reason and a retry delay while the rest of the run continues; the owner sees the list in the Memory Sync card and the node log.

## Change Scope (Mandatory)

- In scope: UC-001..UC-004. Areas: `autobyteus-server-ts/src/memory-sync/{source,hub,shared}`, `src/api/rest/memory-sync.ts`, `src/api/graphql/types/memory-sync{,-schema}.ts`, `autobyteus-web` Memory Sync card/store/query/localization and generated GraphQL types, `docs/features/memory_sync.md`, tests.
- Derived consumers:
  - `MemorySyncSourceState` (source state file): readers are `local-file-memory-sync-state-store.ts` `normalizeState` (extended: projects `fileFailures`), `memory-sync-service.ts` (writer), GraphQL `buildStatus` (`memory-sync.ts:35-60`, extended with the failure count and list). No other reader (grep `readState(`).
  - `MemoryFileOperation` (wire): `memory-sync-batch-identity.ts` digest (unchanged: it hashes metadata, not content, so a staged and an inline operation of the same file digest alike — correct, same content), `local-file-memory-import-store.ts` commit (extended), source batch building (new). Tests that build operations (`tests/e2e/memory-sync/memory-sync-api.e2e.test.ts`) keep the inline shape, which stays valid.
  - `MemorySyncRunResult`: GraphQL `MemorySyncRunResultGql`, web store mutation result (adds `failedFiles`).
  - Hub manifest: unchanged shape.
- Deliberately left alone: delete propagation, delta/range sync, the Memory Sync capability gate and its migration, the node access gate rules, the context-file upload limits (`autobyteus-workspace-6`), imported Memory explorer, hub credential service.
- Follow-ups: FU-001 (per-source size/type exclusion setting), FU-002 (reverse-proxy body limits in front of a hub) in `follow-ups.md`.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Requirement / AC IDs | Trigger | Existing Behavior | Approved Change / Preserved Outcome | Target Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | REQ-001, REQ-005; AC-001, AC-002, AC-004 | Background tick or Sync now | All-or-nothing, one batch per run | All changed, due files per run; batches by count and bytes; per-file outcomes | DS-001, DS-003 |
| BEH-002 | System | REQ-001..REQ-003; AC-001, AC-003, AC-005 | A changed file > 8 MiB | Inlined → 413 | Uploaded in pieces to staging, committed by reference | DS-001, DS-002 |
| BEH-003/004 | System | REQ-002, REQ-004; AC-003, AC-011 | File ≥ 384 MiB / ≥ 2 GiB | Throws | Streaming hash, pieces | DS-001, DS-004 |
| BEH-005 | System | REQ-004; AC-011 | Every run | Re-read all | Unchanged by size+mtime → not read | DS-004 |
| BEH-006 | Operational | REQ-007; AC-010 | Owner opens card | `error · Request body is too large` | Failure count and list; log line | DS-005 |
| BEH-007 | Contract | REQ-008, REQ-009; AC-007..AC-009 | Hub ingestion | Batch route only | Staged-file routes added; same-release contract; nothing partial visible | DS-002, DS-003 |
| BEH-008 | System | REQ-006; AC-006 | Hub refuses/unreachable | Run error | Preserved | DS-001 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related IDs | Relationship | Status |
| --- | --- | --- | --- | --- |
| `probes/large-file-sync-probe.e2e.test.ts.txt` | Reproduction | REQ-001, REQ-005, AC-001 | Starting point for the durable multi-process test | Evidence |

## Task Design Health Assessment (Mandatory)

- Change posture: `Bug Fix` with `Larger Requirement` (large-file transfer).
- Current design issue found: `Yes`
- Structural triggers that fire:
  - Responsibility overload (P12): the planner both decides what changed and materializes file content for transport (`memory-file-change-planner.ts:58-80`); the service owns run lifecycle and batch transport (`memory-sync-service.ts:73-93,148-154`). Adding byte budgets, staging and isolation to either file would mix three concerns.
  - Behavior by absence (P13): "one batch per run" is reached only because the planner stops at `maxOperations` and defers the rest with reason "batch limit reached" (`memory-file-change-planner.ts:43-46`), not by a rule about runs.
  - Capability-area reuse (P4): status (source state + GraphQL status), persistence (`store-utils` locked JSON), logging (worker's console logger) — reused.
  - Persisted-data transition (P5): source state gains `fileFailures`; hub gains a staging area.
  - Several kinds or forms (P1): content travels inline or staged; both commit through one hub commit path (traced in DS-003).
- Root cause classification: `Missing Invariant` (no request-size invariant, no per-file outcome) plus `File Placement Or Responsibility Drift` (planner/service).
- Refactor needed now: `Yes`
- Evidence: above lines; probe.
- Design response: the scanner only lists files with their stat; the change planner decides changed and due files and hashes them by streaming; a new pure batch planner cuts batches and picks inline vs staged per file; a new batch transfer owns sending one planned batch with per-file isolation; a new file stager owns resumable piece upload; a new failure policy owns retry delays; the service keeps the run lifecycle and state recording.
- Refactor rationale: each new rule gets one owner; the service stays the single sequence owner of a run.
- Intentional deferrals: none.

## Terminology

No project glossary entry exists for Memory Sync words (`GLOSSARY.md` has none); words added to `GLOSSARY.md` in this change: none (feature-local words, defined in `memory_sync.md`).

- **Inline file**: a changed file ≤ 8 MiB, sent base64 inside a batch operation (`contentEncoding: "base64"`).
- **Staged file**: a changed file > 8 MiB, uploaded first in raw pieces to the hub's staging area, then committed by a batch operation with `contentEncoding: "staged"`. Its staging name is its SHA-256.
- **Piece**: one raw-byte upload of at most 8 MiB at an offset of a staged file.
- **File failure**: a file-level problem recorded in source state with reason, attempts and next attempt time. UI: "files could not be synced".
- **Due**: a file with a file failure is due when its next attempt time has passed, its size or mtime changed, or the run is Sync now.

## Legacy Removal Policy (Mandatory)

- Obsolete paths: whole-file reads in scanner and planner; base64 materialization in the planner; count-only chunking in the service; the per-run `maxOperations` cap and its "batch limit reached" deferral; the literal `50 * 1024 * 1024` in the route.
- Compatibility wrappers, dual paths, or legacy fallbacks this design keeps: `None`. Inline and staged are two encodings of the one current protocol, each with an explicit size rule, not an old and a new path. No route or field exists for an older hub or source (`DESIGN.md` rule 9).

## Persisted Data / State Transition Decision (Mandatory)

- Stored subjects: (1) source state `app-data/memory-sync/source-state/<hubHash>--<sourceId>.json`, one entry per synced file; (2) hub staging `<memoryDir>/memory-sync-staging/<sourceId>/<sha256>.partial` (new); (3) hub manifest/imports (unchanged shape).
- Change: (1) adds optional `fileFailures: Record<fileKey, MemorySyncFileFailure>`; (2) new transient files.
- Reader/writer: `normalizeState` projects known fields (`local-file-memory-sync-state-store.ts:28-39`); extended to project `fileFailures` (each record validated; invalid records dropped). Writer writes the exact current shape.
- Semantics under direct use: absence of `fileFailures` truthfully means "no recorded file failure" → every changed file is due, which is exactly today's behavior.
- Constraints: staging must be on the same file system as `imports/` for an atomic rename → under the memory directory, outside `imports/` so no imported reader or source listing ever sees it.
- Decision: (1) `Directly Usable — No Migration`; (2) `Not Affected` (new, disposable: a removed partial only restarts that upload); (3) `Not Affected`.
- Rationale: migration guideline §3 "adding an optional field, provided its absence has a truthful meaning".
- Guideline §2 checklist: Need — none (tolerant reader). Availability — unaffected; Memory Sync stays behind its existing capability gate. Source/target shapes — released state files have no `fileFailures`; fixture: existing tests' state files plus one with `fileFailures`. Disposition — N/A. Commit/retry — existing locked atomic JSON writer. Current-only boundary — no old-shape code. Cost — no pass over history; unchanged files are no longer read (cost falls). References — file keys reuse `toMemorySyncFileKey`. Evidence — unit tests of `normalizeState` and service. Lessons — tolerant-reader pattern; no schema version field added.
- Supports: REQ-005, REQ-007, REQ-009; AC-004, AC-009.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001..005, 008 | Worker tick / `startMemorySync` | Source state recorded, run result returned | `MemorySyncService` | The sync run |
| DS-002 | Primary End-to-End | BEH-002, 007 | Batch transfer meets a staged file | Hub staged file complete | `MemoryFileStager` (source) → `MemoryHubStagedFileStore` (hub) | Large files without base64 |
| DS-003 | Primary End-to-End | BEH-001, 007 | Batch transfer posts a batch | Hub manifest committed | `MemorySyncBatchTransfer` (source) → `LocalFileMemoryImportStore` (hub) | One commit path for both encodings |
| DS-004 | Bounded Local | BEH-004, 005 | Scan entries + prior state | Changed, due files with SHA-256 | `MemoryFileChangePlanner` | No re-reads, streaming hash |
| DS-005 | Return-Event | BEH-006 | Recorded file failures | Card list, log line | `MemorySyncService` (record + log) → GraphQL status → card | Owner visibility |

## Primary Execution Spine(s)

- DS-001: `MemorySyncWorker tick / GraphQL startMemorySync -> MemorySyncService.runOnce -> LocalMemoryExportScanner.scan -> MemoryFileChangePlanner.planChangedFiles -> planMemorySyncBatches -> MemorySyncBatchTransfer.send (per batch) -> MemorySyncService records outcomes in LocalFileMemorySyncStateStore -> MemorySyncRunResult`
- DS-002: `MemorySyncBatchTransfer -> MemoryFileStager.stage -> MemoryHubClient (GET status, PUT pieces) -> REST staged-file routes -> MemoryHubIngestionService -> MemoryHubStagedFileStore.appendPiece`
- DS-003: `MemorySyncBatchTransfer -> MemoryHubClient.pushBatch -> REST POST batches -> MemoryHubIngestionService.commitBatch -> LocalFileMemoryImportStore.commitBatch (verify all operations, then write; staged via MemoryHubStagedFileStore.verifyStagedFile/takeStagedFile) -> manifest`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | A run lists files with their stat, keeps the changed and due ones (hashing them by streaming), cuts them into batches, sends each batch through the batch transfer, and records per-file outcomes: synced files into `files`, problems into `fileFailures`, cleared failures for synced or vanished files. A run-level error (hub refusal, unreachable) stops the run as today. All changed, due files are handled in one run. | file list, changed file, planned batch, file outcome | `MemorySyncService` | failure policy, state store, logger |
| DS-002 | For a staged file the stager asks the hub how many bytes of `<sha256>` it already holds, then reads the file from that offset in 8 MiB pieces and PUTs each at its offset, hashing what it reads; when the bytes read do not hash to the planned SHA-256 (the file changed), the file is deferred. The hub appends a piece only at its current length (else 409 with the current length). | staged file, piece, received bytes | `MemoryFileStager`; hub side `MemoryHubStagedFileStore` | hub client errors |
| DS-003 | The batch transfer reads each inline file's content just in time (stable-read check), builds the batch (inline `base64` + `staged` operations) and posts it. The hub verifies every operation first — inline: decode, size, hash; staged: staged file exists, size, streaming hash — and only then writes them (inline: temp+rename; staged: rename from staging) and records the manifest. On a file-level rejection of a multi-file batch the transfer re-sends each file alone to find the failing ones. | batch, operation | `MemorySyncBatchTransfer`; hub `LocalFileMemoryImportStore` | identity digest |
| DS-004 | For each listed file: unchanged when size and mtime equal its synced record; otherwise, if it has a file failure that is not due, it waits; else its SHA-256 is computed by streaming with a stable-read check (changed while read → deferred). | file entry, changed file | `MemoryFileChangePlanner` | failure policy (`isDue`) |
| DS-005 | When the service records a new failure or a changed reason it logs one warning; GraphQL status returns the count and the 20 most recent failures; the card renders them. | file failure | `MemorySyncService` | GraphQL mapping, card |

## Spine Actors / Main-Line Nodes

`MemorySyncService`, `LocalMemoryExportScanner`, `MemoryFileChangePlanner`, `planMemorySyncBatches`, `MemorySyncBatchTransfer`, `MemoryFileStager`, `MemoryHubClient`, hub REST routes, `MemoryHubIngestionService`, `MemoryHubStagedFileStore`, `LocalFileMemoryImportStore`.

## Ownership Map

- `MemorySyncService`: run lifecycle (gate, job state, run result), sequencing of scan → plan → batches, recording outcomes in source state (`files`, `fileFailures`), the per-failure log line. Calls each mechanism itself.
- `LocalMemoryExportScanner`: walking the roots and listing regular files with `size` and `mtimeMs` (no reads); exclusion rules unchanged.
- `MemoryFileChangePlanner`: change and due decisions; streaming SHA-256 with stable-read check.
- `planMemorySyncBatches` (pure function): batch cutting by `batchSize` and inline byte budget; inline vs staged per file by the 8 MiB threshold.
- `MemorySyncBatchTransfer`: sending one planned batch with per-file isolation: staging large files, reading inline content, building operations, posting, splitting on file-level rejection; returns per-file outcomes. Owns the file-level vs run-level classification of hub errors.
- `MemoryFileStager`: resumable piece upload of one file with read-hash verification.
- `memory-sync-file-failure-policy.ts`: retry delay (1 min doubling, max 1 h), `isDue`, building/clearing failure records.
- `MemoryHubClient`: HTTP calls; throws `MemoryHubRequestError` carrying `status` and hub `code`.
- Hub REST routes: transport, body parsing, mapping errors to status codes.
- `MemoryHubIngestionService`: hub enabled check and credential binding for every hub call (batches and staged files).
- `MemoryHubStagedFileStore`: staging folder per source, append at offset, received bytes, verification (size + streaming hash; removes a staged file that fails), take (rename into a target path), sweeping partials older than 24 h.
- `LocalFileMemoryImportStore`: batch commit under the manifest lock for both encodings.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| GraphQL `startMemorySync` / `getMemorySyncStatus` | `MemorySyncService`, state store | API surface | Failure policy or formatting rules beyond mapping |
| REST `memory-sync.ts` | `MemoryHubIngestionService` | Transport | Staging or verification logic |

## Removal / Decommission Plan (Mandatory)

| Item To Remove | Why It Becomes Unnecessary | Replaced By | Notes |
| --- | --- | --- | --- |
| Whole-file read + hash in `LocalMemoryExportScanner.describeStableFile` | Scanner lists stat only | `MemoryFileChangePlanner` streaming hash for changed files | `sha256Buffer` helper removed from the scanner |
| `MemoryFileChangePlanner.buildReplaceOperation` and its base64 materialization; `maxOperations` option and "batch limit reached" deferral | Operations are built just in time per batch; a run handles all changed due files | `MemorySyncBatchTransfer`; `planMemorySyncBatches` | `sha256Buffer` in the planner replaced by the streaming hash |
| `MemorySyncService.chunkOperations` | Count-only chunking | `planMemorySyncBatches` | — |
| `bodyLimit: 50 * 1024 * 1024` literal | One owner for limits | `memory-sync-transfer-limits.ts` `MEMORY_SYNC_BATCH_REQUEST_LIMIT_BYTES` | Same value |
| `MemoryFileDescriptor.sha256` on scan results | The scanner no longer hashes | `MemoryFileEntry` (stat) and `ChangedMemoryFile` (+ sha256) | Tightened types |

Dead code in touched files: none found beyond the above (grep of exports in `src/memory-sync/source/*.ts` against callers, 2026-11-15).

## Return Or Event Spine(s) (If Applicable)

DS-005 above: `MemorySyncService (records failure, logs) -> LocalFileMemorySyncStateStore -> GraphQL buildStatus -> memorySyncStore -> MemorySyncCard`.

## Bounded Local / Internal Spines (If Applicable)

- Parent `MemorySyncBatchTransfer`: `planned batch -> stage each staged file (failure → file outcome, file left out) -> read each inline file (changed → deferred) -> post batch -> success: all committed | file-level rejection and >1 operation: post each alone | run-level error: rethrow`.
- Parent `MemoryFileStager`: `GET received -> (received ≥ size: done) -> loop: read piece at offset, hash, PUT at offset (409: continue from hub's received) -> compare read hash with planned SHA-256 (mismatch → deferred "changed while being read")`.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Spine | Serves | Responsibility | Why | Risk If On Main Line |
| --- | --- | --- | --- | --- | --- |
| Failure policy | DS-001, DS-004 | Service, change planner | Delay, due, record shapes | One rule for retries | Delay rules duplicated in planner and service |
| Transfer limits | DS-002, DS-003 | Batch planner, stager, routes | Inline threshold 8 MiB, batch inline budget 24 MiB, piece 8 MiB, batch request limit 50 MiB | One owner for numbers shared by source and hub | Drift between source budget and hub limit |
| Streaming hash | DS-004, DS-002 hub | Change planner, staged store | SHA-256 of a file by stream with stat check | Constant memory | Whole-file reads return |
| Hub error classification | DS-003 | Batch transfer | file-level vs run-level | Isolation without hiding outages | Every error poisons or every error is swallowed |
| Logging | DS-005 | Service | One warn line per new failure/reason | Owner log | Log spam every minute |

## Ownership Boundaries

Source: callers (worker, GraphQL) depend only on `MemorySyncService`. The service is the only caller of the scanner, change planner, batch planner and batch transfer; only the batch transfer calls the stager; the stager and batch transfer call the hub client. Hub: routes call only `MemoryHubIngestionService`; it calls `LocalFileMemoryImportStore` (batches) and `MemoryHubStagedFileStore` (pieces, status); the import store calls the staged store for verify/take. Nothing outside the hub folder touches staging.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Mechanisms | Upstream Callers | Forbidden Bypass | Fix If Too Thin |
| --- | --- | --- | --- | --- |
| `MemorySyncService` | scanner, planners, batch transfer, stager, failure policy, state writes | worker, GraphQL resolver | resolver calling the batch transfer or writing state | Extend the service |
| `MemoryHubIngestionService` | import store, staged store, credential binding | REST routes | a route calling a store directly (skips enabled + binding checks) | Add an ingestion method |
| `LocalFileMemoryImportStore.commitBatch` | staged store verify/take | ingestion service | ingestion committing staged files itself | Extend commit |

## Dependency Rules

- `source/*` may import `shared/*` and `hub/memory-hub-config.ts` (as today); never `hub/*` stores.
- `hub/*` may import `shared/*`; never `source/*` except the existing config service import (`memory-hub-ingestion-service.ts:3`).
- `memory-sync-transfer-limits.ts` lives in `shared/` and imports nothing.
- `api/rest/memory-sync.ts` imports the ingestion service, errors and limits only.

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity Shape | Notes |
| --- | --- | --- | --- | --- |
| `GET /rest/memory-sync/v1/sources/:memorySyncSourceId/staged-files/:sha256` | Staged file of a source | Received bytes | source id + 64-hex SHA-256 | `{ receivedBytes }`; 0 when none; sweeps that source's stale partials |
| `PUT /rest/memory-sync/v1/sources/:memorySyncSourceId/staged-files/:sha256?offset=<n>` (`application/octet-stream`, ≤ 8 MiB) | Same | Append one piece | same + offset | `{ receivedBytes }`; 409 `{ error: "MemorySyncStagedFileOffsetMismatch", message, receivedBytes }` |
| `POST /rest/memory-sync/v1/batches` | Batch | Commit | body `memorySyncSourceId`, `batchId` | Operation `contentEncoding: "base64"` (with `contentBase64`) or `"staged"` (content = staged `<sha256>` of that source) |
| `MemoryHubIngestionService.getStagedFileStatus({credentialId, memorySyncSourceId, sha256})`, `.receiveStagedFilePiece({…, offset, bytes})` | Staged file | Checks + delegate | explicit | Same hub-enabled and `bindCredentialToSource(bindOnFirstUse: true)` as batches |
| `MemoryHubStagedFileStore.receivedBytes / appendPiece / verifyStagedFile / takeStagedFile / sweepStale` | Staged file | Storage | `(memorySyncSourceId, sha256)` | |
| `MemorySyncBatchTransfer.send(batch, context) → MemorySyncFileOutcome[]` | Planned batch | Send with isolation | — | Outcome: `synced` (batchId, committedAt) / `deferred` (reason) / `failed` (reason) |
| GraphQL `MemorySyncSourceStateGql.fileFailureCount: Int`, `.fileFailures: [MemorySyncFileFailureGql]` | Source state | Status | — | List: 20 most recent by `lastFailedAt`; fields `kind relativePath size reason attempts lastFailedAt nextAttemptAt` |
| GraphQL `MemorySyncRunResultGql.failedFiles: Int` | Run | Count | — | |

## Interface Boundary Check

| Interface | Singular | Explicit Identity | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| staged-file GET/PUT | Yes | Yes (source + sha256 in path) | Low | sha256 validated `^[0-9a-f]{64}$` |
| batches POST | Yes | Yes | Low | `staged` operation names no path to staging; the hub derives it from source + sha256 |
| GraphQL status | Yes | N/A | Low | — |

## Main Domain Subject Naming Check

| Subject | Name | Natural | Same Meaning Everywhere | Drift Risk | Action |
| --- | --- | --- | --- | --- | --- |
| Large-file lane | staged file / `staged` encoding / `memory-sync-staging/` | Yes | Yes | Low | "upload" not used as a second name |
| Per-file problem | file failure / `fileFailures` / "could not be synced" | Yes | Yes | Low | Not "issue"/"error" elsewhere |
| Listed file | `MemoryFileEntry` (stat) vs `ChangedMemoryFile` (+ sha256) | Yes | Yes | Low | Replaces `MemoryFileDescriptor` |

## Existing Capability / Subsystem Reuse Check

| Need | Existing Area | Decision | Why |
| --- | --- | --- | --- |
| Per-file status | source state + GraphQL status | Extend | Same owner and surface |
| Locked atomic JSON | `persistence/file/store-utils.ts` | Reuse | Already used |
| Hub commit | `LocalFileMemoryImportStore.commitBatch` | Extend | One manifest owner |
| Access control | node access gate prefix rule | Reuse | Routes under `/rest/memory-sync` |
| Binary request parsing | Fastify content-type parsers | Reuse (scoped) | Premise verified |
| Streaming hash | none in memory-sync | Create New (`shared/memory-sync-file-hash.ts`) | Needed by source planner and hub staged store |

## Subsystem / Capability-Area Allocation

| Area | Owns | Spines | Decision |
| --- | --- | --- | --- |
| `memory-sync/source` | run, scan, change plan, batch plan, transfer, staging upload, failure policy | DS-001..005 | Extend |
| `memory-sync/hub` | staged store, commit, ingestion | DS-002, DS-003 | Extend |
| `memory-sync/shared` | wire types, limits, streaming hash | all | Extend |
| `api/rest`, `api/graphql/types` | transport, status DTOs | DS-002, DS-003, DS-005 | Extend |
| `autobyteus-web` settings | card, store, query, localization | DS-005 | Extend |

## Draft File Responsibility Mapping

See Final mapping; the draft put batch cutting inside `memory-sync-batch-transfer.ts`, then moved it into a pure `memory-sync-batch-planner.ts` so the size rules are unit-testable without I/O and the transfer only sends.

## Reusable Owned Structures Check

| Repeated Structure | Shared File | Owner | Why Shared | Redundant Removed | Overlap Removed | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Size limits used by source and hub | `shared/memory-sync-transfer-limits.ts` | memory-sync | Source budget must stay below hub limit | Yes | Yes | A config system |
| Streaming SHA-256 of a file | `shared/memory-sync-file-hash.ts` | memory-sync | Source planner + hub verification | Yes | Yes | A generic fs util for other features |
| Operation union | `shared/memory-sync-types.ts` | memory-sync | Wire contract | Yes | Yes | Optional-field soup |

## Shared Structure / Data Model Tightness Check

| Structure | One Meaning Per Field | Redundant Removed | Overlap Risk | Action |
| --- | --- | --- | --- | --- |
| `MemoryFileOperation = MemoryFileInlineOperation \| MemoryFileStagedOperation` (common: `opId, operation:"replace", kind, relativePath, size, sha256, mtimeMs`; inline adds `contentEncoding:"base64", contentBase64`; staged adds `contentEncoding:"staged"`) | Yes | Yes | Low | Discriminated by `contentEncoding` |
| `MemorySyncFileFailure { kind, relativePath, size, mtimeMs, reason, attempts, lastFailedAt, nextAttemptAt }` | Yes (`size`/`mtimeMs` = fingerprint the failure applies to) | Yes | Low | No sha256 (a failing file may not be hashable) |
| `MemoryFileEntry { kind, relativePath, absolutePath, size, mtimeMs }`; `ChangedMemoryFile = MemoryFileEntry & { sha256 }` | Yes | Yes | Low | Replaces `MemoryFileDescriptor` |

## Final File Responsibility Mapping

| File | Area | Owner | Concrete Concern |
| --- | --- | --- | --- |
| `src/memory-sync/shared/memory-sync-transfer-limits.ts` (new) | shared | limits | `MEMORY_SYNC_INLINE_FILE_MAX_BYTES = 8 MiB`, `MEMORY_SYNC_BATCH_INLINE_BYTES_BUDGET = 24 MiB`, `MEMORY_SYNC_STAGED_PIECE_MAX_BYTES = 8 MiB`, `MEMORY_SYNC_BATCH_REQUEST_LIMIT_BYTES = 50 MiB`, `MEMORY_SYNC_STAGED_FILE_MAX_AGE_MS = 24 h` |
| `src/memory-sync/shared/memory-sync-file-hash.ts` (new) | shared | hash | `hashStableFile(path, {size, mtimeMs}) → sha256 \| null` (stream, stat before/after) and `hashFile(path)` |
| `src/memory-sync/shared/memory-sync-types.ts` | shared | wire + state types | Operation union; `MemoryFileEntry`, `ChangedMemoryFile`; `MemorySyncFileFailure`; `fileFailures` in `MemorySyncSourceState` |
| `src/memory-sync/source/local-memory-export-scanner.ts` | source | scanner | List entries with stat |
| `src/memory-sync/source/memory-file-change-planner.ts` | source | change planner | Unchanged / waiting / changed (hashed) / deferred |
| `src/memory-sync/source/memory-sync-batch-planner.ts` (new) | source | batch planner | Pure batch cutting and inline/staged choice |
| `src/memory-sync/source/memory-sync-batch-transfer.ts` (new) | source | batch transfer | Send one batch with isolation; outcomes; error classification |
| `src/memory-sync/source/memory-file-stager.ts` (new) | source | stager | Resumable piece upload with read hash |
| `src/memory-sync/source/memory-sync-file-failure-policy.ts` (new) | source | failure policy | Delay, due, record, clear |
| `src/memory-sync/source/memory-hub-client.ts` | source | client | + `getStagedFileStatus`, `putStagedFilePiece` |
| `src/memory-sync/source/memory-hub-response-parser.ts` | source | parser | Throw `MemoryHubRequestError { status, code, receivedBytes? }` (gate refusal texts unchanged) |
| `src/memory-sync/source/memory-sync-service.ts` | source | run owner | Sequence, outcomes → state, log, result (+`failedFiles`) |
| `src/memory-sync/source/local-file-memory-sync-state-store.ts` | source | state store | `normalizeState` projects `fileFailures` |
| `src/memory-sync/hub/memory-hub-staged-file-store.ts` (new) | hub | staged store | Staging folder, append, received, verify, take, sweep |
| `src/memory-sync/hub/local-file-memory-import-store.ts` | hub | import store | Verify all ops, then write; staged take |
| `src/memory-sync/hub/memory-hub-ingestion-service.ts` | hub | ingestion | + staged status/piece methods with the same checks |
| `src/api/rest/memory-sync.ts` | api | routes | + GET/PUT staged-file routes in a scoped child with the octet-stream parser; limits from shared |
| `src/api/graphql/types/memory-sync-schema.ts`, `memory-sync.ts` | api | GraphQL | Failure count/list; `failedFiles` |
| `autobyteus-web/graphql/queries/memorySyncQueries.ts`, `graphql/mutations/memorySyncMutations.ts`, `generated/graphql.ts` (codegen) | web | API types | New fields |
| `autobyteus-web/stores/memorySyncStore.ts` | web | store | Types |
| `autobyteus-web/components/settings/MemorySyncCard.vue` | web | card | "N files could not be synced" block |
| `autobyteus-web/localization/messages/{en,zh-CN}/memorySyncSettings.ts` | web | texts | New keys |
| `autobyteus-server-ts/docs/features/memory_sync.md` | docs | feature doc | Sync behavior, limits, routes, staging, failures, same-release + release order, validation coverage |

## Applied Patterns (If Any)

- Pure planner function (batch planner) for deterministic, testable size rules.
- Content-addressed staging (staging name = SHA-256) for idempotent resume without a session id.

## Target Subsystem / Folder / File Mapping

Flat layout inside `source/`, `hub/`, `shared/` kept (existing pattern; each new file is one concern; no new folders needed). Hub staging on disk: `<memoryDir>/memory-sync-staging/<memorySyncSourceId>/<sha256>.partial`.

## Folder Boundary Check

| Folder | Depth | Clear | Risk | Justification |
| --- | --- | --- | --- | --- |
| `memory-sync/source` | Main-line + off-spine | Yes | Low | 15 files after change, each one concern |
| `memory-sync/hub` | Persistence + domain | Yes | Low | — |
| `memory-sync/shared` | Off-spine | Yes | Low | Only truly shared source/hub items |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why |
| --- | --- | --- | --- |
| Batch cutting | changed files sizes `[1 KiB, 40 MiB, 5 MiB×6, 2 GiB]`, `batchSize 25` → batch 1: 1 KiB inline, 40 MiB staged, 5 MiB×4 inline (≈ 20 MiB inline; a fifth 5 MiB file would pass 24 MiB), batch 2: 5 MiB×2 inline, 2 GiB staged. Staged files count toward `batchSize`, not toward the inline budget | One batch carrying 31 MiB of inline content (→ 41 MiB base64 + JSON, near the limit) | Shows both limits |
| Isolation | batch [a, b(bad path), c] → hub 400 → send [a], [b], [c] → a, c synced; b `failed: <hub message>` | Whole run `error` | REQ-005 |
| Run-level | hub 401/403 gate refusal, 503, network error → rethrow, job `error` | Recording a file failure for every file on an outage | REQ-006 |
| Resume | file 2 GiB, hub holds 1.2 GiB of `<sha>` → GET 1.2 GiB → PUT from 1.2 GiB | Restart from 0 | REQ-003 |
| Card | `Last sync: success · 15/11 14:02` then amber `2 files could not be synced` and rows `agents/run-b/context_files/video.mp4 · 1.9 GB · Uploaded file hash mismatch … · next attempt 14:06` | Raw `error · Request body is too large` | REQ-007 |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why Considered | Decision | Replacement |
| --- | --- | --- | --- |
| Detect an old hub (404 on staged routes) and skip large files with "update the hub" | SR-001 REQ-008 | Rejected (`DESIGN.md` rule 9) | Same-release contract; docs say update every node together |
| Keep base64 for files > 8 MiB when the hub lacks staging | Same | Rejected | — |
| Separate v2 batch route | Versioned API | Rejected (rule 8/9: no versions side by side) | `contentEncoding` union on the current route |

## Derived Layering (If Useful)

N/A — ownership above is sufficient.

## Change / Refactor Sequence

1. Shared: limits, streaming hash, types (operation union, entries, failure, state field).
2. Hub: staged store; import store verify-then-write with staged take; ingestion methods; routes (scoped parser, limits). Unit + route tests.
3. Source: parser error type; client methods; scanner (stat only); change planner (fast path, due, streaming hash); batch planner; failure policy; stager; batch transfer; service rewrite of the run sequence and state recording; state store projection.
4. GraphQL fields; web query/mutation/codegen/store/card/localization.
5. Durable tests (below) and doc update; remove the replaced code listed in the Removal plan.

## Key Tradeoffs

- Two encodings (inline/staged) instead of staging everything: keeps one request per up to 25 small files (first sync of thousands of small files stays fast) while large files never go base64. The 8 MiB threshold equals the piece size, so a staged file always needs ≥ 2 pieces or exactly fills them.
- A run now sends all changed due files instead of one batch: Sync now finishes the job; a run with a 2 GiB file lasts minutes (the run gate already coalesces overlapping runs).
- Size + mtime change detection: standard; content changes that keep both are missed (no writer in this product does that).
- Hub verification hashes a staged file in the batch request (≈ seconds per GiB) before taking the manifest lock.

## Risks

- R-003 release order: this change must be released before or with `autobyteus-workspace-6`.
- Mixed versions: an older hub answers 404 to staged routes and rejects `staged` operations; per rule 9 this is not handled; documented "update every node together" (already in `memory_sync.md`).
- `generated/graphql.ts` is a fresh-start build input (TESTING.md "Fresh-start build"): delivery runs the fresh-start desktop build.
- Reverse proxies with small body limits (FU-002).

## Guidance For Implementation

- Reproduction to start from: `tickets/in-progress/memory-sync-large-files/probes/large-file-sync-probe.e2e.test.ts.txt` (command in investigation notes). Turn it into durable `tests/e2e/memory-sync/memory-sync-large-files.e2e.test.ts` (two built server processes) asserting: 40 MiB + small file synced in one run (AC-001); two 20 MiB files synced (AC-002); a 20 MiB file interrupted (stop the hub mid-transfer or a first run that fails after some pieces) resumes (AC-005); a file failure is listed in GraphQL status and others sync (AC-004, AC-010).
- Unit: batch planner (budget, count, threshold, examples above); change planner (fast path AC-011, due rules, deferral); failure policy (delays 1, 2, 4 … 60 min; Sync now; changed file); stager (resume, 409, read-hash mismatch); batch transfer (split on 400, run-level errors AC-006); staged store (offset rules, verify removes bad file, sweep, never under `imports/` AC-009); import store (verify-all-then-write, staged take, digest unchanged); state store projection (absent → `{}`; invalid records dropped; exact written keys).
- Keep `tests/e2e/memory-sync/memory-sync-api.e2e.test.ts` and the multiprocess test green (AC-008 inline shape).
- AC-003 is one measured run with a 2 GiB generated file (RSS of both processes sampled), recorded as validation evidence; not a CI test.
- No test-only parameters in production code (`DESIGN.md` rule 11): tests use real sizes (20–40 MiB files in a temp dir) and pure functions with sizes as data.
- Log line format: `Memory Sync could not sync <kind>/<relativePath> (<bytes> bytes): <reason>. Next attempt at <ISO time>.` once per new failure or changed reason.
- Release-order note (REQ-010) in the implementation handoff and the doc.
