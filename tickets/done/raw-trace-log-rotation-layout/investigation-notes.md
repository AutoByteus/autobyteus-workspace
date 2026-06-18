# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Architecture review round 1 failed with design-impact findings; requirements and design refined for old-manifest decommission/idempotency and pending-entry migration policy; resubmitting for architecture review.
- Investigation Goal: Bootstrap a follow-up ticket that changes raw trace archive storage from subdirectory-based archive segments to log-rotation-style raw trace segment files in the run memory directory.
- Scope Classification (`Small`/`Medium`/`Large`): Medium
- Scope Classification Rationale: The write path is centralized, but read compatibility for old manifest paths and tests across native/provider compaction paths require careful design.
- Scope Summary: New rotated raw trace files should live next to active `raw_traces.jsonl` as `raw_traces_<index>.jsonl`; the manifest should be renamed to `raw_traces_manifest.json` and remain authoritative for metadata/idempotency. A startup app-data migration should convert existing old-layout runs.
- Primary Questions To Resolve:
  - Should rotated raw trace segment files be direct children of the run directory? Proposed: yes.
  - Should the manifest be retained? Yes; user confirmed keeping the manifest is acceptable.
  - Should old `raw_traces_archive/` files remain readable? Yes, and a migration is now required to convert old layouts to the new layout.

## Request Context

The prior raw trace archive filename simplification ticket was finalized and merged. The user then proposed a further simplification inspired by Python/application log rotation: keep active `raw_traces.jsonl` and rotated raw trace files such as `raw_traces_000001.jsonl` / `raw_traces_000002.jsonl` in the same folder, making active + rotated files visually represent the whole raw trace history. The user agreed to keep the manifest, asked whether timestamps are needed, considered renaming `raw_traces_archive_manifest.json`, and requested a migration using the existing app-data migration pattern.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/raw-trace-log-rotation-layout`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/raw-trace-log-rotation-layout/tickets/in-progress/raw-trace-log-rotation-layout`
- Current Branch: `codex/raw-trace-log-rotation-layout`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/raw-trace-log-rotation-layout`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin --prune` succeeded; `origin/personal` resolved to `f83f18fb8ba8fb53167c9236c71b4d60be9b405a`.
- Task Branch: `codex/raw-trace-log-rotation-layout`
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None
- Notes For Downstream Agents: Main checkout has unrelated untracked `.article-work/` and `docs/articles/`; authoritative work is isolated in the dedicated task worktree above.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-06-17 | Command | `git fetch origin --prune`; `git rev-parse origin/personal`; `git branch codex/raw-trace-log-rotation-layout origin/personal`; `git worktree add /Users/normy/autobyteus_org/autobyteus-worktrees/raw-trace-log-rotation-layout codex/raw-trace-log-rotation-layout` | Bootstrap a fresh ticket after the prior ticket was finalized. | New worktree created from finalized `origin/personal` at `f83f18fb8ba8fb53167c9236c71b4d60be9b405a`. | No |
| 2026-06-17 | Code | `autobyteus-ts/src/memory/store/raw-trace-archive-manager.ts` | Inspect current finalized archive segment path/name owner. | Current manager uses `RAW_TRACES_ARCHIVE_DIR_NAME = 'raw_traces_archive'`; `getArchiveDirPath()` returns `runDir/raw_traces_archive`; new files use `000001_<timestamp>.jsonl` under that directory. Reads open `path.join(getArchiveDirPath(), entry.file_name)`. | Yes: design new path resolution for direct files and old files. |
| 2026-06-17 | Code | `autobyteus-ts/src/memory/store/raw-trace-archive-manifest.ts` | Verify manifest schema. | Manifest stores `file_name`, `boundary_key`, status, timestamps, record counts, and boundary type. | No schema removal recommended. |
| 2026-06-17 | Code | `autobyteus-ts/src/memory/store/run-memory-file-store.ts` | Inspect public wrapper and full-history read semantics. | `readCompleteRawTraceCorpusDicts()` already merges complete archive records plus active raw trace records; `getRawTracesArchiveDirPath()` exposes the old archive directory path. | Yes: design whether to keep API for legacy old layout. |
| 2026-06-17 | Code | `autobyteus-ts/tests/unit/memory/raw-trace-archive-manager.test.ts` | Inspect current tests after previous ticket. | Tests assert simplified filename shape under old archive directory and old hash-suffix readability. | Yes: update tests for direct layout + old layout readability. |
| 2026-06-17 | Command | `rg -n "raw_traces_archive|raw_traces_.*jsonl|readCompleteArchiveRawTraceDicts|readCompleteRawTraceCorpusDicts|getRawTracesArchiveDirPath|getRawTracesArchiveManifestPath|rawTracesArchive" -S ...` | Find usage of archive dir/path APIs. | Production usage is mainly `RunMemoryFileStore` and server memory read APIs. One E2E asserts old flat `raw_traces_archive.jsonl` does not exist. | Yes: design test impact. |
| 2026-06-17 | Code | `autobyteus-server-ts/src/app-data-migrations/domain/app-data-migration-types.ts`; `autobyteus-server-ts/src/app-data-migrations/app-data-migration-registry.ts`; `autobyteus-server-ts/src/app-data-migrations/app-data-migration-runner.ts`; `autobyteus-server-ts/src/app-data-migrations/migrations/*.ts` | Inspect existing app-data migration framework requested by user. | Migrations implement `AppDataMigrationDefinition`, are registered in `AppDataMigrationRegistry`, can be `requiredOnStartup`, return summaries/details, write logs, and persist records through `app_data_migration_records`. | Yes: design/register a raw trace layout migration. |
| 2026-06-17 | Code | `autobyteus-server-ts/src/agent-memory/store/agent-memory-layout.ts`; `autobyteus-server-ts/src/agent-memory/services/agent-memory-location-service.ts`; `autobyteus-server-ts/src/agent-memory/store/memory-file-store.ts` | Inspect memory directory layout discovery needs for migration. | Standalone runs live under `memoryDir/agents/<runId>`; team/member/task run dirs live under nested `memoryDir/agent_teams/...` paths. Store APIs read a single run memory directory through `RunMemoryFileStore`. | Yes: migration should scan for raw trace manifest/archive evidence under both roots. |
| 2026-06-17 | Review | `tickets/in-progress/raw-trace-log-rotation-layout/design-review-report.md` | Incorporate architecture review findings. | Review failed due underspecified old-manifest decommission/rerun behavior and open pending-entry migration policy. | Resolved in refined requirements/design; reroute to architecture reviewer. |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: compaction or provider compact boundary requests raw trace archival through `RunMemoryFileStore`.
- Current execution flow:
  - Native: compactor -> `pruneRawTracesById(..., true)` -> `RunMemoryFileStore.archiveAndRewriteActive` -> `RawTraceArchiveManager.archiveRecords`.
  - Provider: Codex/Claude compact boundary -> `ProviderCompactionBoundaryRecorder` -> `RunMemoryWriter.rotateActiveRawTracesBeforeBoundary` -> `RunMemoryFileStore.archiveAndRewriteActive` -> `RawTraceArchiveManager.archiveRecords`.
  - Read: server/service callers -> `RunMemoryFileStore.readCompleteArchiveRawTraceDicts` or `readCompleteRawTraceCorpusDicts` -> archive manager reads manifest-listed complete segment files.
- Ownership or boundary observations:
  - `RawTraceArchiveManager` is the correct owner for segment file path/name creation.
  - `RunMemoryFileStore` is the correct owner for active + archived corpus merge semantics.
  - Runtime-specific code should not be changed for the physical layout because it already delegates to the shared store boundary.
- Current behavior summary: segment files are now hashless but still hidden under a `raw_traces_archive/` subfolder and include timestamps, while the user wants a direct log-rotation-style raw-traces family in one folder with number-only rotated files and `raw_traces_manifest.json`.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Cleanup / behavior simplification
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): File Placement Or Responsibility Drift
- Refactor posture evidence summary: A narrow refactor is likely needed inside the archive manager to separate new segment file path construction from old archive directory path resolution.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `RawTraceArchiveManager.getArchiveDirPath` | New and old segment files are currently rooted in `runDir/raw_traces_archive`. | Physical file placement is less aligned with the active+rotated raw trace mental model. | Change new segment file path generation and manifest name. |
| `RawTraceArchiveManager.readSegmentRawTraceDicts` | Reads assume every manifest file name lives under the archive directory. | Old/new layout support needs explicit path resolution. | Design safe relative resolver and migration. |
| `RunMemoryFileStore.readCompleteRawTraceCorpusDicts` | Already models active + archive as complete corpus. | Behavioral semantics are right; filesystem layout is the cleanup target. | Preserve behavior. |
| Runtime compaction paths | All delegate through shared archive manager. | Single owner change applies to AutoByteus, Codex, Claude. | Avoid runtime-specific writer edits. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-ts/src/memory/store/raw-trace-archive-manager.ts` | Archive segment path/name, manifest lifecycle, segment reads. | Main target for moving new segment files to run directory. | Needs design for direct filenames and old path readability. |
| `autobyteus-ts/src/memory/store/run-memory-file-store.ts` | Active raw trace file, archive delegation, full corpus merge. | Exposes old archive dir path method. | May keep method for old layout/testing, but new writes should not use it for segment output. |
| `autobyteus-ts/src/memory/store/raw-trace-archive-manifest.ts` | Manifest type. | Still useful and should remain. | No schema change expected. |
| `autobyteus-server-ts/src/agent-memory/store/memory-file-store.ts` | Server-side memory view reads. | Uses `readCompleteArchiveRawTraceDicts` and `readCompleteRawTraceCorpusDicts`. | Should not need code change if store API preserved. |
| `autobyteus-ts/tests/unit/memory/raw-trace-archive-manager.test.ts` | Archive manager unit coverage. | Needs new layout assertions and old layout read coverage. | Primary test target. |
| `autobyteus-ts/tests/unit/memory/run-memory-file-store.test.ts` | Store-level archive/full-corpus coverage. | Should verify full corpus remains unchanged under new layout. | Secondary test target. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-06-17 | Static probe | `rg` search for archive dir and read APIs | No runtime-specific writer bypasses the archive manager for segment filenames. | Shared manager change covers all runtimes. |

## External / Public Source Findings

- Public API / spec / issue / upstream source: Python logging docs were discussed conversationally as a mental model, but no external source is needed for repository requirements.
- Version / tag / commit / freshness: Not applicable.
- Relevant contract, behavior, or constraint learned: Log rotation commonly presents active file plus numbered rotated files in one directory; for this ticket the manifest carries timestamps, so rotated raw trace filenames are number-only.
- Why it matters: Supports the user's preferred mental model for raw trace history.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: None for design/bootstrap.
- Required config, feature flags, env vars, or accounts: None identified.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: dedicated worktree creation from finalized `origin/personal`.
- Cleanup notes for temporary investigation-only setup: None.

## Findings From Code / Docs / Data / Logs

- Current code already has simplified segment filenames, but still uses a separate archive directory.
- Manifest-driven reads mean new and old file layouts can coexist without migration if `file_name` resolution is designed carefully.
- The manifest should remain because it stores metadata that simple log-rotation filenames cannot represent: boundary type/key, status, timestamps, record count, and idempotency identity. It should be renamed to `raw_traces_manifest.json` for new layout coherence.

## Constraints / Dependencies / Compatibility Facts

- Existing old-layout segments must remain readable when referenced by manifest, and startup migration should convert them to the new layout when possible.
- No code should reconstruct full history by scanning raw-trace-like files during normal reads; manifest remains the source of segment ordering/status. Migration scanning is allowed only to discover run directories that contain old raw-trace layout evidence.
- Same-boundary replay behavior must remain unchanged.

## Open Unknowns / Risks

- Whether to rename public/internal methods containing `Archive` remains open; recommendation is to avoid broad API rename unless architecture review requires it.
- Migration cleanup policy is now specified: decommission the original old manifest after successful verification; remove old archive dir only when empty; leave non-empty unexpected leftovers as non-authoritative evidence and report them without treating them as rerun-blocking old-layout state.

## Notes For Architect Reviewer

- This follow-up is larger than the previous filename-only cleanup because file path resolution, manifest rename, app-data migration, and old layout readability matter.
- The intended design should likely keep the existing raw trace segment manager/store boundary as the owner but rename/reshape its internal segment path logic.
- Required migration should follow `AppDataMigrationDefinition` patterns, be registered in `AppDataMigrationRegistry`, and cover standalone plus nested team/member run directories.


## Architecture Review Rework Notes

- DR-001 resolution: refined migration final-state requirements. After successful new segment and `raw_traces_manifest.json` verification, the original `raw_traces_archive_manifest.json` must be decommissioned by removal or atomic rename to backup evidence. Reruns with new manifest and only backup evidence skip as already migrated. Runs with both new and original old manifests trigger deterministic cleanup if the new layout validates, otherwise fail as ambiguous partial state without deleting data.
- DR-002 resolution: refined pending-entry policy. Complete entries are the only entries migrated into the new manifest. Pending entries are never promoted because current complete archive reads ignore them. Pending files are preserved as backup evidence; missing pending files do not fail. Missing complete files fail the run and leave old authoritative files untouched. Stale pending plus complete for the same boundary migrates the complete entry and drops/backs up pending evidence.
