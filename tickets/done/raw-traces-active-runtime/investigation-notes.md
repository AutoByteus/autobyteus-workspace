# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete; dedicated task worktree and draft artifacts created.
- Current Status: User approved rename and data migration; design production in progress.
- Investigation Goal: Determine whether backend runtime trace persistence should rename/use `raw_traces_active.jsonl` instead of `raw_traces.jsonl`, and identify affected owners, lifecycle semantics, APIs, tests, and migration implications.
- Scope Classification (`Small`/`Medium`/`Large`): Medium if implemented.
- Scope Classification Rationale: The source filename owner is centralized, but the name is persisted user data and API-visible via raw-trace file selectors. Tests/docs/memory sync fixtures also carry the physical filename.
- Scope Summary: Backend/shared runtime active raw-trace file naming and active-vs-segment lifecycle semantics.
- Primary Questions To Resolve:
  - Where is `raw_traces.jsonl` referenced, and is it active runtime state or finalized history?
  - Where is `work_trace_active.md` referenced, and what lifecycle convention does it imply?
  - Are trace file names centralized behind a repository/boundary or duplicated across call sites?
  - Would `raw_traces_active.jsonl` align with existing semantics without adding dual-read compatibility?

## Request Context

User: "currently we use raw_traces.json in the backend for all the runtime, i feel maybe its better to use raw_traces_active.json because if you read backend code, we use work_trace_active.json you know. please analyse"

Clarification from code: the actual raw-trace runtime file is `raw_traces.jsonl`, not `raw_traces.json`. The adjacent self-evolution work trace is `work_trace_active.md`, not JSON.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/raw-traces-active-runtime`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/raw-traces-active-runtime/tickets/done/raw-traces-active-runtime`
- Current Branch: `codex/raw-traces-active-runtime`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/raw-traces-active-runtime`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin --prune` completed successfully from `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`.
- Task Branch: `codex/raw-traces-active-runtime`
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None.
- Notes For Downstream Agents: The user's original shared checkout `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` is on branch `personal`; all authoritative investigation artifacts for this task are in the dedicated task worktree above.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-07-07 | Command | `pwd && git rev-parse --show-toplevel && git status --short --branch && git remote -v && find . -maxdepth 2 ...` from `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` | Discover repository root, current branch, remote, and project shape before task isolation. | Root is `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`; branch `personal` tracks `origin/personal`; repo contains multiple TypeScript packages including backend/server packages. | No |
| 2026-07-07 | Command | `git branch --show-current && git worktree list --porcelain && git remote show origin ...` | Identify existing worktrees and remote default/base branch. | Current branch `personal`; remote HEAD/default resolved as `personal`; many existing `codex/*` worktrees but none for this task. | No |
| 2026-07-07 | Command | `git fetch origin --prune` | Refresh tracked remote refs before creating task worktree. | Completed successfully. | No |
| 2026-07-07 | Command | `git worktree add -b codex/raw-traces-active-runtime /Users/normy/autobyteus_org/autobyteus-worktrees/raw-traces-active-runtime origin/personal` | Create dedicated task worktree/branch from fresh base. | Created branch `codex/raw-traces-active-runtime` tracking `origin/personal`; worktree at `/Users/normy/autobyteus_org/autobyteus-worktrees/raw-traces-active-runtime`. | No |
| 2026-07-07 | Command | `mkdir -p tickets/done/raw-traces-active-runtime` and artifact file creation | Create draft requirements and investigation artifacts before deeper investigation. | Draft `requirements.md` and `investigation-notes.md` created. | No |
| 2026-07-07 | Command | `git fetch origin --prune && git rebase origin/personal && git status --short --branch` | Re-verify dedicated task worktree after user approval and refresh against latest tracked base before design production. | Rebase succeeded; branch `codex/raw-traces-active-runtime` is aligned with `origin/personal`; only task artifacts are untracked. | No |
| 2026-07-07 | Doc | `solution-designer/design-principles.md`; `references/design-examples.md` | Apply shared design guidance and examples before writing design spec. | Design should be spine-first, keep old filename migration-only, and preserve authoritative boundaries. | No |
| 2026-07-07 | Other | User approval message: "yesss. no backward compatiblities. to do this ticket, i guess we also need data migration right? because existing data should be migrated to raw_traces_active.jsonl" | Lock requirements approval and migration direction. | User approved clean rename, no backward compatibility, and required existing data migration to `raw_traces_active.jsonl`. | Produce design spec and hand off to architecture review. |
| 2026-07-07 | Command | `rg -n "raw_traces|work_trace_active|work-trace|work_trace|raw traces|RawTrace|rawTrace" -S . --glob '!node_modules' --glob '!dist' --glob '!build' --glob '!*.map'` | Broad repository search for trace naming and related docs. | Large output; relevant current source/docs use `raw_traces.jsonl`, `raw_traces_manifest.json`, `raw_traces_<index>.jsonl`, and `work_trace_active.md`. | Narrowed searches used. |
| 2026-07-07 | Command | `rg -n "raw_traces\.json([^l]|$)|raw_traces\.jsonl|raw_traces_active|raw_traces_active\.jsonl|work_trace_active\.(json|md)|work_trace_active" autobyteus-server-ts/src autobyteus-server-ts/tests autobyteus-ts/src autobyteus-ts/tests autobyteus-server-ts/docs` | Confirm exact file extensions and active work-trace name. | No exact `raw_traces.json` code path; active raw trace file is `raw_traces.jsonl`; work trace active file is `work_trace_active.md`. | No |
| 2026-07-07 | Command | `rg -n "RAW_TRACES_MEMORY_FILE_NAME|raw_traces\.jsonl|raw_traces_.*jsonl|WORK_TRACE|work_trace_active|work_trace_" autobyteus-server-ts/src autobyteus-ts/src` | Find source-level owners for raw trace and work trace names. | Canonical active raw trace filename lives in `autobyteus-ts/src/memory/store/memory-file-names.ts`; server imports it. Work trace active name is built in `SelfEvolutionWorkTraceStore`. | No |
| 2026-07-07 | Code | `autobyteus-ts/src/memory/store/memory-file-names.ts` | Inspect canonical memory file names. | `RAW_TRACES_MEMORY_FILE_NAME = 'raw_traces.jsonl'`; memory file names object exposes `rawTraces`. | Rename target would start here. |
| 2026-07-07 | Code | `autobyteus-ts/src/memory/store/run-memory-file-store.ts` | Inspect runtime file path owner, active reads/writes, and rotation. | `getFilePath(MemoryType.RAW_TRACE)` returns active path; `appendRawTrace`, `listRawTraceDicts`, and active rewrite/rotation use that path. Complete corpus reads merge archive segments plus active records. | No |
| 2026-07-07 | Code | `autobyteus-ts/src/memory/store/raw-trace-archive-manager.ts`; `autobyteus-ts/src/memory/store/raw-trace-archive-manifest.ts` | Inspect segment/manifest naming and archive boundary owner. | Manifest is `raw_traces_manifest.json`; new segments are `raw_traces_000001.jsonl`; archive manager handles segment resolution. Segment names are separate from active file name. | Keep segment names unchanged unless explicitly expanding scope. |
| 2026-07-07 | Code | `autobyteus-server-ts/src/agent-memory/store/run-memory-writer.ts` | Inspect server-side runtime memory writer. | `RunMemoryWriter` appends raw traces via `RunMemoryFileStore.appendRawTrace` and initializes sequence counters from active plus archive records. | No |
| 2026-07-07 | Code | `autobyteus-server-ts/src/agent-memory/store/memory-file-store.ts` | Inspect server read boundary. | `readRawTracesActive` reads `RAW_TRACES_MEMORY_FILE_NAME`; `readRawTraceCorpus` delegates complete corpus read to `RunMemoryFileStore`. Method names already distinguish active vs corpus. | No |
| 2026-07-07 | Code | `autobyteus-server-ts/src/agent-memory/services/raw-trace-file-source-service.ts` | Inspect GraphQL/UI-safe file source list/selection owner. | Active file source reports `fileName: RAW_TRACES_MEMORY_FILE_NAME`, `kind: active`; segment sources come from manifest entries; selection validates against listed backend filenames. | API-visible filename changes if active file is renamed. |
| 2026-07-07 | Code | `autobyteus-server-ts/src/agent-memory/services/provider-compaction-boundary-recorder.ts` | Inspect provider-boundary rotation behavior. | Provider boundary marker is appended active; if eligible, settled active records before the marker rotate into a complete segment, leaving marker active. | Rename must preserve this behavior. |
| 2026-07-07 | Code | `autobyteus-server-ts/src/self-evolution/services/work-traces/self-evolution-work-trace-store.ts`; `self-evolution-work-trace-projection-service.ts`; `raw-trace-work-trace-source-reader.ts` | Inspect relation between raw traces and work traces. | Work traces are derived markdown projections. Active raw source maps to `work_trace_active.md`; archive segment source maps to `work_trace_<index>.md`. | Work trace naming stays as-is. |
| 2026-07-07 | Doc | `autobyteus-server-ts/docs/modules/agent_memory.md` lines around common files and raw-trace file selector docs | Check documented current behavior. | Docs explicitly say `raw_traces.jsonl` is active ordered raw trace records; raw trace file selector examples expose it. | Docs must update if rename approved. |
| 2026-07-07 | Doc | `autobyteus-server-ts/docs/modules/run_history.md` lines around runtime memory artifacts and archive/rotation boundaries | Check run-history documented layout. | Docs show `raw_traces.jsonl`, `raw_traces_manifest.json`, and `raw_traces_<index>.jsonl`; complete corpus includes segments plus active. | Docs must update if rename approved. |
| 2026-07-07 | Doc | `autobyteus-server-ts/docs/modules/self_evolution.md` lines around work traces | Check `work_trace_active.md` convention. | Self-evolution docs describe work traces under `self_evolution/work_traces/` with `work_trace_active.md` for active segment. | No behavior change needed. |
| 2026-07-07 | Command | `python3 - <<'PY' ... patterns=['raw_traces.jsonl','RAW_TRACES_MEMORY_FILE_NAME','work_trace_active.md','raw_traces_manifest.json','raw_traces_'] ... PY` | Count and list affected files. | `raw_traces.jsonl`: 63 matches in 22 source/test/docs files; `RAW_TRACES_MEMORY_FILE_NAME`: 29 matches in 13 files; `work_trace_active.md`: 8 matches in 4 files. | Use for scope estimate. |
| 2026-07-07 | Command | `rg -n -S 'raw_traces\.json([^l]|$)' autobyteus-server-ts/src autobyteus-ts/src autobyteus-server-ts/tests autobyteus-ts/tests autobyteus-server-ts/docs` | Verify user-mentioned `.json` exact path. | No matches. | No |
| 2026-07-07 | Code | `autobyteus-server-ts/src/memory-sync/source/local-memory-export-scanner.ts`; `memory-sync/.../local-file-memory-import-store.ts`; `memory-sync/shared/memory-sync-types.ts` | Inspect Memory Sync path implications. | Memory Sync exports/imports full file relative paths. There is no delete operation; manifests/source state are keyed by relative path. A rename affects sync/import paths and may leave stale old records unless migrated/cleaned. | Decide whether imported corpus migration is same-scope. |
| 2026-07-07 | Code | `autobyteus-server-ts/src/app-data-migrations/migrations/raw-trace-rotation-layout-migration*.ts`; `app-data-migration-registry.ts` | Inspect existing migration pattern for raw-trace layout. | Startup app-data migrations already handle raw-trace layout changes and recursively scan `memory/agents` and `memory/agent_teams`; a new migration can follow this pattern. | Required if rename approved. |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: Runtime memory recording enters through `RunMemoryWriter` for server-owned Codex/Claude storage-only memory, and through `MemoryManager` / `FileMemoryStore` for native AutoByteus memory.
- Current execution flow:
  - `RunMemoryWriter.appendRawTrace(...)` or `MemoryManager.appendRawTrace(...)` creates a `RawTraceItem`.
  - `RunMemoryFileStore.appendRawTrace(...)` writes the item to `getFilePath(MemoryType.RAW_TRACE)`.
  - `getFilePath(MemoryType.RAW_TRACE)` resolves to `path.join(runDir, RAW_TRACES_MEMORY_FILE_NAME)`, currently `raw_traces.jsonl`.
  - Rotation methods (`rotateActiveRawTracesBeforeBoundary`, `pruneRawTracesById`) archive settled active records to complete `raw_traces_<index>.jsonl` segments and rewrite the active file with the remaining active records.
  - Read boundaries either read active only (`readRawTracesActive`) or complete corpus (`readRawTraceCorpus` / `readCompleteRawTraceCorpusDicts`).
- Ownership or boundary observations:
  - Active file naming is correctly centralized in the shared `autobyteus-ts` memory store package.
  - Archive/segment naming is owned by `RawTraceArchiveManager` / raw-trace archive manifest helpers.
  - UI/API-safe file selection is owned by `RawTraceFileSourceService`; it exposes backend-listed file names, not absolute paths.
  - Work trace naming is owned separately by `SelfEvolutionWorkTraceStore` and applies to markdown projections, not raw runtime files.
- Current behavior summary: `raw_traces.jsonl` is semantically active state already, despite lacking `_active` in the physical name. Complete trace history after rotation is active file plus complete segment files.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Cleanup / Behavior Change
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): No Design Issue Found for boundaries; minor file-name semantic drift.
- Refactor posture evidence summary: No structural refactor is needed because the current owners are clear. If approved, implementation should be a clean rename through existing filename/store boundaries plus migration/tests/docs.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `memory-file-names.ts` | Active filename centralized as `RAW_TRACES_MEMORY_FILE_NAME = 'raw_traces.jsonl'`. | Filename change can be centralized; no duplicated write policy found. | Rename canonical owner if approved. |
| `run-memory-file-store.ts` | Active record reads/writes and active rewrites all pass through `getFilePath(MemoryType.RAW_TRACE)` / `getRawTracesPath()`. | Existing store is correct authoritative boundary. | Preserve boundary. |
| `raw-trace-archive-manager.ts` | Segment names and manifest are separately owned. | Do not rename segment files unless scope expands. | No |
| `MemoryFileStore.readRawTracesActive` | Server read boundary already says active. | Semantics are not ambiguous in service API. | No structural refactor. |
| `RawTraceFileSourceService` | Active file name is returned to API clients as backend-listed selector. | Rename is API-visible and must be tested. | Update GraphQL/API tests. |
| `SelfEvolutionWorkTraceStore` | Active work trace projection is named `work_trace_active.md`. | User's naming intuition is valid, but this is a derived markdown artifact. | Keep work trace naming unchanged. |
| Memory Sync scanner/import store | Relative paths are sync identity; no delete operation exists. | Rename can leave stale imported/source-state records unless migration/manifest cleanup is included. | Decide scope. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-ts/src/memory/store/memory-file-names.ts` | Shared canonical memory filenames. | Owns `RAW_TRACES_MEMORY_FILE_NAME = 'raw_traces.jsonl'`. | Primary target for active filename rename. |
| `autobyteus-ts/src/memory/store/run-memory-file-store.ts` | Low-level run memory IO for active raw traces, snapshots, semantic/episodic, and archive/corpus reads. | Active file path and active rewrites use shared filename constant; corpus reads merge active plus archive. | Keep as authoritative active raw trace file boundary. |
| `autobyteus-ts/src/memory/store/raw-trace-archive-manager.ts` | Raw-trace rotation manifest/segment file policy. | Segment files are direct `raw_traces_<index>.jsonl`; old archive layout fallback exists for migration compatibility. | Segment naming remains unchanged. |
| `autobyteus-server-ts/src/agent-memory/store/run-memory-writer.ts` | Server-side storage-only memory writer. | Appends raw traces and loads active+archive for sequence initialization through `RunMemoryFileStore`. | Works after centralized rename. |
| `autobyteus-server-ts/src/agent-memory/store/memory-file-store.ts` | Server memory read boundary. | `readRawTracesActive` reads current active file constant; corpus delegates shared store. | Method name already supports active clarity. |
| `autobyteus-server-ts/src/agent-memory/services/raw-trace-file-source-service.ts` | File-source listing, selected filename validation, selected-file reads. | Active source uses `RAW_TRACES_MEMORY_FILE_NAME`; API exposes this filename. | API-visible expectations must update. |
| `autobyteus-server-ts/src/agent-memory/services/provider-compaction-boundary-recorder.ts` | Provider-boundary marker and rotation trigger. | Leaves marker active and rotates earlier records into segment. | Rename must preserve marker/rotation behavior. |
| `autobyteus-server-ts/src/self-evolution/services/work-traces/self-evolution-work-trace-store.ts` | Derived work trace file names/manifest. | Active source -> `work_trace_active.md`. | No raw file-name dependency; keep unchanged. |
| `autobyteus-server-ts/src/self-evolution/services/work-traces/self-evolution-work-trace-projection-service.ts` | Regenerates work trace projections from raw trace sources. | Reuses unchanged archive files by fingerprint; regenerates active. | Should continue after raw filename rename because it uses source service. |
| `autobyteus-server-ts/src/agent-memory/services/raw-trace-work-trace-source-reader.ts` | Converts raw trace file sources into self-evolution source objects. | Builds display/source info from `file.kind`, not hardcoded `raw_traces.jsonl`. | Low risk. |
| `autobyteus-server-ts/docs/modules/agent_memory.md` | Agent memory module docs. | Documents active file as `raw_traces.jsonl`; selector examples use same. | Update if approved. |
| `autobyteus-server-ts/docs/modules/run_history.md` | Run history persisted layout docs. | Documents runtime memory artifacts with `raw_traces.jsonl`. | Update if approved. |
| `autobyteus-server-ts/src/app-data-migrations/...` | Startup app-data migrations. | Existing raw-trace layout migration patterns can be reused for active file rename. | Add new required-on-startup migration if approved. |
| `autobyteus-server-ts/src/memory-sync/...` | Memory Sync full-file path export/import. | Rename changes file identity path; no delete operation. | Include tests and consider import manifest cleanup. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-07-07 | Probe | Source search commands listed in Source Log. | Active raw trace filename is centralized and `.jsonl`; no `.json` active path exists. | Proposed target should be `raw_traces_active.jsonl`. |
| 2026-07-07 | Probe | Static code read of writer/store/rotation/read-service paths. | `raw_traces.jsonl` is active tail, not guaranteed whole runtime corpus after rotation. | User-facing explanation should clarify active + segments. |

## External / Public Source Findings

None used.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: None for static analysis.
- Required config, feature flags, env vars, or accounts: None.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: `git fetch origin --prune`; `git worktree add ...`.
- Cleanup notes for temporary investigation-only setup: Dedicated worktree is intentionally persistent for this task.

## Findings From Code / Docs / Data / Logs

1. The current raw trace file is `raw_traces.jsonl`, not `raw_traces.json`.
2. `raw_traces.jsonl` is the active raw-trace file. It may contain all records for runs without rotation, but after native compaction or provider-boundary rotation, the complete raw-trace corpus is complete segment files plus the active file.
3. Work traces are a self-evolution projection, not the backend runtime raw trace persistence layer. Their `work_trace_active.md` naming is nevertheless a good convention signal for active-state clarity.
4. A rename to `raw_traces_active.jsonl` is semantically correct and cleaner, but it is API-visible and data-migration-sensitive.
5. The existing architecture does not require a broad refactor. Existing ownership boundaries are healthy: shared store owns physical active file path, archive manager owns segments/manifest, file source service owns UI-safe file selection, self-evolution store owns derived work-trace filenames.

## Constraints / Dependencies / Compatibility Facts

- `autobyteus-server-ts` imports memory filename constants from `autobyteus-ts`, so both packages must update together.
- Raw trace file selectors expose backend filenames; clients should use returned file names.
- Existing persisted local data has `raw_traces.jsonl`; clean steady state requires migration, not permanent fallback reads.
- Memory Sync exports/imports file paths as identity. Because Memory Sync currently has no delete operation, stale old-path files/manifest records are a known risk if imported corpora are included.
- Existing app-data migration framework supports required startup migrations and already has raw-trace layout migration precedent.

## Open Unknowns / Risks

- Should the rename migration scan only local active runtime roots (`memory/agents`, `memory/agent_teams`) or also imported Memory Sync roots under `memory/imports/<sourceNodeId>/{agents,agent_teams}`? Including imports is more complete for memory explorer but expands scope because import manifests need path-record cleanup.
- Whether external consumers outside this monorepo import `RAW_TRACES_MEMORY_FILE_NAME`. If so, renaming the exported constant is a breaking API cleanup; only changing its value is less breaking but leaves the constant name less explicit.
- Memory Sync source state and hub manifests may retain old-path entries because protocol v1 has no delete operation. This does not break runtime reads after local migration but can make sync metadata stale unless handled.

## Notes For Architect Reviewer

Requirements are approved by user on 2026-07-07. The design should keep the existing owners and specify a clean-cut rename plus migration:

- canonical active filename owner in `autobyteus-ts`;
- server read/write boundaries continue through stores/services;
- no steady-state fallback read from `raw_traces.jsonl`;
- migration owns old filename handling;
- raw trace segments/manifest remain unchanged;
- self-evolution work trace names remain unchanged.
