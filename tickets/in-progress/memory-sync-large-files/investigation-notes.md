# Investigation Notes — memory-sync-large-files

## Investigation Meta

- Package identifier: `memory-sync-large-files`
- Request / ticket: Project Task `autobyteus-workspace-7` (Project `project_3165230d-b602-4efc-ac42-fb61a03f1ed5`), follow-up FU-001 of `autobyteus-workspace-6` (`context-file-large-video-upload`)
- Workspace root: `/Users/normy/autobyteus-org/autobyteus-task-worktrees/memory-sync-large-files`
- Repository mode: `Git`
- Task worktree / branch: `/Users/normy/autobyteus-org/autobyteus-task-worktrees/memory-sync-large-files`, branch `task/memory-sync-large-files`
- Resolved base remote / branch / revision: `origin/personal` @ `3d738de6e` (fetched 2026-11-15)
- Finalization target remote / branch: `origin/personal`; no release (Task: "Stop at merge-ready; no release")
- Bootstrap result: worktree created with `git worktree add -b task/memory-sync-large-files … origin/personal`; `pnpm install --frozen-lockfile` (pnpm 10.28.2 through `npx`, pnpm is not on this shell's PATH), `pnpm -C autobyteus-server-ts prebuild` and `build` passed.
- Bootstrap blocker: None
- Current solution revision ID: `SR-002`
- Authorities read (requirements reading gate; file and date): `references/requirements-engineering.md`, `references/finding-the-cause.md`, `references/ticket-scope.md` (2026-11-15); `TESTING.md` (2026-11-15)
- Investigation status: Requirements investigation complete; architecture investigation below.

## Initial Request And Clarifications

- Original request: Task `autobyteus-workspace-7` (see requirements doc). Reproduce on a node with Memory Sync on; byte budget for batches; defined behaviour for a single file bigger than the hub limit that never blocks the rest (skip with a visible warning, or chunked/streamed transfer: propose and justify; large videos should NOT be synced as base64 blobs); a failing file must not poison later batches; clear logs/status for the owner; unit + integration tests; stop at merge-ready.
- Clarifications received: Manager message 2026-11-15 (run `project_task_manager_89e33a2ea30f422fab0407e4dc2b13bb`): no source overlap with `autobyteus-workspace-6` (it touches context-files policy/writer/routes, web composer, autobyteus-ts media sanitizer, Project Task uploads); merge order free; **release order: this fix must be released before or in the same release as autobyteus-workspace-6**; design for videos up to 2 GiB; never base64 a whole large file into one request; tell the manager when merge-ready.
- User-supplied facts and constraints: Memory Sync is opt-in and off by default; the sibling ticket plans 2 GiB default for video/audio context files, configurable up to 10240 MiB.
- Initial ambiguity: skip vs transfer for files above the hub limit (resolved by evidence, DEC-001).

## Product And Domain Understanding

- Product area: Memory Sync / Memory Hub (`autobyteus-server-ts/docs/features/memory_sync.md`). A source node pushes `memory/agents/` and `memory/agent_teams/` to a hub node, which stores them read-only under `memory/imports/<memorySyncSourceId>/` and shows them in the Memory page as an imported source.
- Affected actors or systems: the node owner who enabled Memory Sync on a source; the hub node; agents whose runs produce large traces or receive large attachments.
- Existing purpose: a central read-only corpus of agent memory (raw traces, metadata, run files) from several nodes.
- Terminology: *source* (pushing node), *hub* (receiving node), *batch* (one JSON POST of up to `batchSize` replace operations), *operation* (one whole file, base64), *source state* (per hub/source file fingerprints in app data).

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-11-15 | Doc | sibling `context-file-large-video-upload/handoff-sr-001.md`, `follow-ups.md`, `investigation-notes.md` R-001 | Origin of FU-001 | Problem statement; claims read-only, not reproduced there | Reproduce |
| 2026-11-15 | Code | `src/memory-sync/source/memory-sync-service.ts` | Run owner | One run = scan, plan (max `batchSize` ops), chunk by count, `pushBatch` sequentially; any throw marks the whole job `error` and stops; remaining batches never sent | Byte budget, per-file isolation |
| 2026-11-15 | Code | `src/memory-sync/source/local-memory-export-scanner.ts` | Scan | Reads **every** file whole (`fs.readFile`) on every run to hash it, including unchanged ones | Memory/IO for large files |
| 2026-11-15 | Code | `src/memory-sync/source/memory-file-change-planner.ts` | Plan | Reads changed file whole again, base64s it into the operation; caps operations at `maxOperations` (= `batchSize`, default 25) per run, rest "deferred: batch limit reached"; files in sorted key order | Same first files retried every run |
| 2026-11-15 | Code | `src/memory-sync/source/memory-hub-client.ts` | Transport | `fetch` POST of `JSON.stringify(batch)` | Whole-batch string in memory |
| 2026-11-15 | Code | `src/api/rest/memory-sync.ts` | Hub route | `POST /rest/memory-sync/v1/batches` with `bodyLimit: 50 MiB`; health GET | Hard limit for every released hub |
| 2026-11-15 | Code | `src/memory-sync/hub/local-file-memory-import-store.ts` | Hub commit | Under the manifest file lock: per op decode base64, verify size+sha256, write temp + rename; manifest records batch digest for idempotency | Commit semantics to preserve |
| 2026-11-15 | Code | `src/api/security/node-route-permissions.ts:85` | Access | Every path under `/rest/memory-sync` admits only `memory_sync_source` clients | New hub routes inherit the gate |
| 2026-11-15 | Code | `src/memory-sync/source/memory-sync-worker.ts` | Background loop | Interval timer (default 60 s); logs one warn line `Memory Sync background cycle failed: <error>` | Owner log |
| 2026-11-15 | Code | `src/api/graphql/types/memory-sync.ts`, `memory-sync-schema.ts` | Status | `sourceState { jobState lastSuccessfulSyncAt lastError trackedFileCount }`; `startMemorySync` returns counts | Status surface |
| 2026-11-15 | Code | `autobyteus-web/components/settings/MemorySyncCard.vue`, `stores/memorySyncStore.ts` | Owner UI | Shows `Current job` and `Last sync: success · time` or `error · <lastError>` | Where per-file issues become visible |
| 2026-11-15 | Code | `src/context-files/store/context-file-layout.ts` | Where attachments live | Final run attachments: `memory/agents/<runId>/context_files/<file>` and team member `…/context_files/` — inside the synced roots | Attachments are synced |
| 2026-11-15 | Code | `src/api/rest/context-files.ts` | Hub reader of attachments | Context-file routes serve only local runs; no route serves an imported source's attachment | Hub keeps attachment bytes without a viewer |
| 2026-11-15 | Code | `src/memory-sync/shared/memory-sync-capability.ts`, `startup/app-data-capability-readiness.ts` | Availability | Memory Sync is gated by capability `memory_sync` (migration `20261024_memory_sync_source_id_names`); ready after that migration succeeds | Feature is live on migrated nodes |
| 2026-11-15 | Data | `find ~/.autobyteus/server-data/memory -type f -size +5M` (sizes and names only, no content read) | Do real memory files exceed the limit without attachments? | Real raw trace files on this machine: 54,353,284 B (`raw_traces_000002.jsonl`), 46,695,628 B and 40,634,433 B (`raw_traces_active.jsonl`), several 20–35 MB | Skipping large files would drop core memory |
| 2026-11-15 | Command | `node -e …` (Node v26.12.0) | String/IO ceilings | `buffer.constants.MAX_STRING_LENGTH` 536,870,888 → largest base64-encodable file 384 MiB (`Cannot create a string longer than 0x1fffffe8 characters`); `fs.readFile` of a 2049 MiB file → `ERR_FS_FILE_TOO_LARGE` "greater than 2 GiB" | Whole-file reads cannot carry 2 GiB |
| 2026-11-15 | Command | Probe `probes/large-file-sync-probe.e2e.test.ts.txt` (two built server processes) | Reproduce | See Runtime findings | — |
| 2026-11-15 | Doc | `autobyteus-server-ts/docs/features/memory_sync.md` | Contract | v1: whole-file replace, base64 JSON, idempotent batch ids, no deletes, no range/delta protocol; validation coverage list | Doc must change |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger Or Governing Contract | Current Path / Lifecycle | Current Outcome / Invariants | Evidence | Confidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | Background interval or **Sync now** on a configured source | scan all files (read+hash each) → plan ≤ `batchSize` changed files in key order (read+base64 each) → POST batches → mark synced | All-or-nothing per run; job `success` or `error · <message>` | memory-sync-service.ts | Read + Reproduced |
| BEH-002 | System | A changed file whose base64 batch exceeds 50 MiB | Hub answers 413; Fastify message "Request body is too large" | Run fails; same files planned first next run → **every later run fails; files after it never sync** | Probe case A/B | Reproduced |
| BEH-003 | System | File ≥ 384 MiB changed | `toString("base64")` throws | Run fails before any request | node measurement | Measured (string limit); path Read |
| BEH-004 | System | File ≥ 2 GiB anywhere under the roots (also unchanged) | Scanner `fs.readFile` throws `ERR_FS_FILE_TOO_LARGE` | Scan fails → every run fails | node measurement | Measured (readFile limit); path Read |
| BEH-005 | System | Every run | Scanner re-reads and hashes every file, changed or not | IO and memory proportional to the whole corpus each minute; a 1.5 GiB file is loaded into memory every interval | scanner code | Read |
| BEH-006 | Operational | Owner opens Nodes → Memory Sync | `Last sync: error · Request body is too large` | No file name, size or way forward | Probe status output | Reproduced |
| BEH-007 | Contract | Hub batch ingestion | Validates source id, token binding, paths, size and sha256; idempotent batch ids; temp+rename writes; manifest under lock | Partial content is never visible | import store | Read |
| BEH-008 | System | Hub unreachable / token invalid / hub disabled | Run fails with that message | Job `error` | parser + service | Read |

## Relevant Codebase And Technical Facts

| Path / Component / Contract | Current Responsibility Or Behavior | Requirement Implication | Architecture Question |
| --- | --- | --- | --- |
| `memory-sync-service.ts` (174 lines) | Run orchestration, batching by count, state marking | Needs per-file outcomes and byte budget | Split batching/upload owners out of the service |
| `local-memory-export-scanner.ts` | Stable-read check + whole-file hash | Must not read unchanged/large files whole | Streamed hashing; size+mtime fast path |
| `memory-file-change-planner.ts` | Reads + base64 per op | Must not hold large content | Plan descriptors only; content read at send time |
| `memory-hub-client.ts` | Two calls (health, batch) | New large-file calls | Upload session client |
| `api/rest/memory-sync.ts` | Hub routes; 50 MiB body limit | Released hubs keep 50 MiB forever | New routes beside, same gate |
| `local-file-memory-import-store.ts` (241 lines) | Manifest + file commit under lock | Large-file commit must update the same manifest atomically | Shared commit path for a staged file |
| `memory-sync-types.ts` `MemorySyncSourceState` | Persisted source state (`schemaVersion: 1`, unknown fields dropped by `normalizeState`) | Per-file issue records need storage | Additive field; old readers ignore/drop it |
| GraphQL `MemorySyncSourceStateGql` | Status DTO | Add issues | Additive fields |
| `MemorySyncCard.vue` (336 lines) | Owner status | Show not-synced files | Small subcomponent or computed block |

## Structural And Payload Surface Inventory

### Payload Or Content Surfaces

- Files: everything under `memory/agents/` and `memory/agent_teams/` except symlinks and `.tmp/.partial/.lock/.swp/.swx/.DS_Store` leaves (raw traces, archives, metadata, `context_files/` attachments).
- Readers/writers: source scanner/planner/service; hub import store; Memory explorer imported source reader; state file `app-data/memory-sync/source-state/<hubHash>--<sourceId>.json`; hub `imports/<sourceId>/sync-manifest.json`, `memory-sync-source.json`.
- Evidence paths: above.

### Structural Surfaces

- Hub REST `POST /rest/memory-sync/v1/batches`, `GET …/health` (contract between nodes of possibly different versions).
- Node access gate prefix rule `/rest/memory-sync` → `memory_sync_source`.
- GraphQL Memory Sync status/run result; web card + store + localization catalogs.
- Persisted: source state JSON (source), manifest JSON (hub).

### Potential Structural Impacts To Investigate

- API or external-contract change: Yes — additive hub routes for large-file transfer; batch contract unchanged.
- Persistence schema or invariant change: additive source-state field for per-file issues; hub staging area for partial uploads (must never appear as imported memory).
- Security or privacy boundary change: new routes under the same gated prefix; path validation as for batches.
- Concurrency or lifecycle change: one run at a time (existing gate); hub manifest lock reused; staged upload lifetime.
- Deployment/migration: no data migration (additive, tolerant readers — to confirm against DESIGN.md in architecture phase).
- Confirmed: present (API additive, persistence additive).

## Runtime, Probe, Or Reproduction Findings

| Method / Command | Scenario | Observation | Established | Requirement Implication | Artifact |
| --- | --- | --- | --- | --- | --- |
| Probe, two built server processes (`dist/app.js`), hub + source via GraphQL, `startMemorySync` | case 0: one small file | `committedBatches 1`, job `success` | Reproduced | Baseline works | probe |
| same | case A: one 40 MiB `agents/run-b/context_files/video.mp4` + a small trace in `agents/run-c` | `Request body is too large`; job `error`; retry fails identically; `run-c` trace **not** imported | Reproduced | REQ-001, REQ-004 | probe |
| same | case B: two 20 MiB attachments (each under today's 25 MiB attachment limit) | `Request body is too large`; `run-c` still not imported | Reproduced | Bug exists today without the sibling change | probe |
| `node -e` | base64 / readFile ceilings | 384 MiB string ceiling; 2 GiB readFile ceiling | Measured | REQ-002 | this file |
| `find … -size +5M` on the real node memory | real file sizes | raw traces up to 54 MB; active traces 40–47 MB | Measured | DEC-001: skipping is not acceptable | this file |

- Temporary diagnostics: None (the probe lived in `tests/e2e/memory-sync/` for one run, then moved to the ticket folder; nothing else edited).
- Reproduction for implementation to start from: `tickets/in-progress/memory-sync-large-files/probes/large-file-sync-probe.e2e.test.ts.txt`. Copy to `autobyteus-server-ts/tests/e2e/memory-sync/`, `pnpm -C autobyteus-server-ts build`, then `env -i PATH="$PATH" HOME="$(cd "$(mktemp -d)" && pwd -P)" TMPDIR="$TMPDIR" pnpm -C autobyteus-server-ts exec vitest run tests/e2e/memory-sync/<file> --no-watch`. Today it prints the failures; the durable test asserts the opposite.

## Stakeholder And User Evidence

| Source / Actor | Need, Problem, Or Constraint | Evidence Strength | Requirement Implication | Open Question |
| --- | --- | --- | --- | --- |
| Manager (user's delegate) | Release before/with autobyteus-workspace-6; videos up to 2 GiB; never whole-file base64 in one request; one bad file never blocks the rest | Explicit direction | REQ-001..REQ-006, REQ-010 | None |
| Sibling ticket | 2 GiB default media limit, max 10240 MiB | Planned | Size range to support | None |

## External Contracts, Standards, And Dependencies

| Contract / Dependency | Version / Authority | Relevant Behavior Or Constraint | Evidence | Unknown / Risk |
| --- | --- | --- | --- | --- |
| Hub batch route | every released server | `bodyLimit` 50 MiB on batches; no other ingest route | route code | Mixed versions not supported (`DESIGN.md` rule 9, SR-002) |
| Fastify | repo version | 413 `Request body is too large` over bodyLimit | probe | — |
| V8 / Node | Node v26.12.0 here | 536,870,888-char string ceiling; 2 GiB `readFile` ceiling | measurement | Same ceilings in the embedded runtime (V8 constant since long) |
| Node `fetch` (undici) | built-in | Streams a request body with `duplex: "half"` | To verify in architecture phase | — |

## Persisted Data And State Facts

- Affected: source state JSON per hub/source; hub manifest and imported files.
- Shape: `{schemaVersion:1, hubKey, hubBaseUrl, memorySyncSourceId, lastSuccessfulSyncAt, lastError, lastJobState, files:{<key>:{kind,relativePath,size,sha256,mtimeMs,lastSyncedAt,lastBatchId}}}`.
- Volume: one entry per synced file (thousands).
- Readers/writers: source service only; GraphQL status reads counts.
- Unknown/extra fields: `normalizeState` keeps only known fields (extra fields are dropped on the next write by an older version).
- Must preserve: synced fingerprints (else a full re-sync), hub imports and manifest.
- Acceptable loss: per-file issue records are diagnostic; losing them on downgrade only causes a retry.
- Remaining gap: none for requirements.

## Product Design Request Context

- Product Design request in the current input: `Not stated`. The card change is a small status line in an existing surface (DEC-004).

## Product Design Findings

- N/A — no Product Design request.

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related IDs | Status | Approval |
| --- | --- | --- | --- | --- | --- | --- |
| `probes/large-file-sync-probe.e2e.test.ts.txt` | Solution Designer | Reproduction on two real server processes | BEH-002 | REQ-001, REQ-004, AC-001, AC-004 | Current | Evidence only |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| R-001 | Risk | Reverse proxies (Kubernetes ingress default 1 MiB) in front of a hub can refuse even today's batches | Operational, not code | Docs mention chunk size; out of scope | Open (noted) |
| R-002 | Risk | Hub disk use grows with synced large attachments | Owner opted into Memory Sync; behavior preserved | DEC-002; follow-up FU-001 (size cap setting) | Open |
| R-003 | Risk | Release order with autobyteus-workspace-6 | Without this fix, a 2 GiB video stops all syncing (and ≥2 GiB breaks the scan) | Stated in handoffs/delivery notes | Open |

## Architecture Investigation Findings

Architecture-phase evidence, 2026-11-15 (authorities: `references/architecture-design.md`, `references/design-principles.md`, `DESIGN.md`, `docs/design/data_migration_guideline.md` §2–§3, `docs/design/node_access_model.md`).

| Source / Command | Observation | Design implication |
| --- | --- | --- |
| `DESIGN.md` rule 9 | No compatibility between software versions: no version checks, fallbacks or old/new APIs side by side | SR-001 REQ-008 (old-hub fallback) revised in SR-002 |
| `DESIGN.md` rule 11 | No production parameter only tests use | Tests use real sizes and pure functions, no injected limits |
| `data_migration_guideline.md` §3 | Optional field with a truthful absence meaning needs no migration; reader projects known fields | `fileFailures` additive, `Directly Usable — No Migration` |
| `node_access_model.md` NA-7, NAS-26; `node-route-permissions.ts:85` | Every `/rest/memory-sync` path admits only memory sync sources | New staged-file routes need no gate change |
| `store-utils.ts:213-228` | `updateJsonFile` = per-path lock + temp + rename | Hub commit of staged files stays in `commitBatch` under the manifest lock |
| `memory-explorer-source-service.ts:83` | Imported explorer root is `imports/<sourceId>` | Staging folder `memory/memory-sync-staging/<sourceId>/` (same file system as `imports/`, outside it) |
| `api/rest/index.ts:43` | Memory Sync routes registered on the `/rest` instance | Staged-file routes in their own child scope so the octet-stream parser stays local |
| Premise probe `/tmp/msync-premise/fastify-octet.mjs` (run once from `autobyteus-server-ts`; not kept) | Scoped `application/octet-stream` parser with `parseAs: "buffer"` gives a `Buffer`; route `bodyLimit` 8 MiB accepts 8,388,608 B and refuses 8,388,609 B (client: `ECONNRESET` while writing); a route outside the scope still answers 415 | Piece route design confirmed; an over-limit body may surface as a network error, so the source must never exceed the piece size |
| `memory-sync-batch-identity.ts:5-16` | Digest covers op metadata, not content encoding | A staged and an inline op of the same file digest alike; idempotency unchanged |
| `local-file-memory-import-store.ts:139-154` | Ops are written one by one inside the lock; a later op's failure leaves earlier files written but unrecorded | Verify every op before writing any |
| `autobyteus-web/generated/graphql.ts` | Codegen output, a TESTING.md fresh-start build input | Delivery runs the fresh-start build |


## Requirement Implications

- Reproduced: one file ≥ ~37 MiB or two 20 MiB files stop **all** syncing permanently; the error does not name the file.
- Real core memory (raw traces) on this machine already exceeds the limit (54 MB), so the fix must **carry** large files, not skip them (DEC-001).
- Whole-file reads cannot carry ≥ 384 MiB (base64) or ≥ 2 GiB (readFile), and re-reading every unchanged file every minute is not viable with GiB-sized attachments.
- The batch route keeps its 50 MiB limit; batches must stay below it. Mixed source/hub versions are not designed for (`DESIGN.md` rule 9; SR-002 revised the SR-001 idea of reporting "hub must be updated").

## Notes For Architecture Design

- Approved scenarios: SCN-001..SCN-007 (requirements doc).
- Constraints: same-release contract (`DESIGN.md` rule 9); manifest atomicity and idempotency; partial data never visible on the hub; memory bounded independent of file size; one run at a time.
- Questions: streaming request bodies with `fetch`; Fastify raw body streaming for octet-stream; staging location and cleanup; how a large-file commit shares the manifest lock and record format; how source state records per-file issues compatibly.
