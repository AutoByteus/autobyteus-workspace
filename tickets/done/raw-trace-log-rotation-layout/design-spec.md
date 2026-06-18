# Design Spec

## Current-State Read

The prior ticket simplified raw trace archive segment filenames but left the archive-oriented physical layout intact:

```text
<memoryDir>/
  raw_traces.jsonl
  raw_traces_archive_manifest.json
  raw_traces_archive/
    000001_20260430T103015123Z.jsonl
```

Current ownership and flow:

- `autobyteus-ts/src/memory/store/raw-trace-archive-manager.ts`
  - owns the archive/rotated segment directory name, manifest filename, segment filename generation, manifest read/write, segment read/write, and boundary-key idempotency.
  - currently uses `RAW_TRACES_ARCHIVE_MANIFEST_FILE_NAME = 'raw_traces_archive_manifest.json'` and `RAW_TRACES_ARCHIVE_DIR_NAME = 'raw_traces_archive'`.
  - writes new segment files under `runDir/raw_traces_archive/` with names like `000001_<timestamp>.jsonl`.
  - reads complete segments by `path.join(getArchiveDirPath(), entry.file_name)`.
- `autobyteus-ts/src/memory/store/run-memory-file-store.ts`
  - owns active raw trace splitting/rewrite and delegates segment file mechanics to `RawTraceArchiveManager`.
  - exposes full raw trace corpus through `readCompleteRawTraceCorpusDicts()`, which merges complete archived/rotated records with active `raw_traces.jsonl` records.
- Runtime write paths are already correctly centralized:
  - AutoByteus/native compaction -> `RunMemoryFileStore.pruneRawTracesById(..., true)` -> archive manager.
  - Codex provider compaction boundary -> provider boundary recorder -> `RunMemoryFileStore.rotateActiveRawTracesBeforeBoundary` -> archive manager.
  - Claude Agent SDK compact boundary -> provider boundary recorder -> `RunMemoryFileStore.rotateActiveRawTracesBeforeBoundary` -> archive manager.
- App-data migrations live under `autobyteus-server-ts/src/app-data-migrations/` and are registered in `app-data-migration-registry.ts`. The runner executes `requiredOnStartup` migrations, records `app_data_migration_records`, writes logs, and returns per-item scanned/migrated/skipped/failed summaries.

The target should keep the existing behavioral model — active + rotated segments = complete raw trace history — but make the filesystem representation match that model directly.

## Intended Change

Adopt a log-rotation-style raw trace layout:

```text
<memoryDir>/
  raw_traces.jsonl
  raw_traces_000001.jsonl
  raw_traces_000002.jsonl
  raw_traces_000003.jsonl
  raw_traces_manifest.json
```

Key decisions:

- New rotated raw trace files live directly in the run memory directory.
- Rotated file names are number-only: `raw_traces_<zero-padded-index>.jsonl`.
- New manifest name is `raw_traces_manifest.json`.
- Manifest remains authoritative for segment ordering/status, boundary-key idempotency, timestamps, and diagnostics.
- Existing old-layout data is migrated by a required startup app-data migration and remains readable through store APIs. Successful migration decommissions the original old manifest so reruns are idempotent.
- Runtime-specific compaction code remains unchanged; changing the shared segment manager applies to AutoByteus/native, Codex, and Claude Agent SDK writers.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Cleanup / behavior simplification + data migration
- Current design issue found (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): File Placement Or Responsibility Drift
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes, narrow
- Evidence: The current physical layout (`raw_traces_archive/` + `raw_traces_archive_manifest.json`) no longer matches the desired raw-trace-family model. The write/read owner is centralized in `RawTraceArchiveManager`, so the design can fix placement at the authoritative boundary instead of duplicating runtime-specific handling. Existing app-data migration framework supports required startup filesystem migrations.
- Design response: Reframe `RawTraceArchiveManager` internally as the raw trace rotation segment owner: keep external behavior and public store semantics, change new manifest/segment paths, add old-layout read resolution, and add an app-data migration that converts old layouts.
- Refactor rationale: The refactor is needed because the old subfolder/manifest naming would keep a mismatched persistence layout and require users/developers to understand two concepts (“active raw traces” and “archive folder”) instead of one raw-traces file family.
- Intentional deferrals and residual risk, if any: Broad renaming of every API/class containing `Archive` can be deferred if not needed for correctness; public API churn is more expensive than the physical layout cleanup. Store APIs can keep `Archive` wording as an internal historical term while filesystem naming becomes coherent.

## Terminology

- Active raw trace file: `raw_traces.jsonl`, the current append target.
- Rotated raw trace segment: `raw_traces_000001.jsonl` style JSONL file containing records moved out of the active file during native or provider compaction boundary rotation.
- Raw trace manifest: `raw_traces_manifest.json`, authoritative metadata/index for rotated segments.
- Old archive layout: `raw_traces_archive_manifest.json` plus `raw_traces_archive/<segment>.jsonl`.

## Design Reading Order

1. Raw trace rotation write/read spine.
2. Manifest and path ownership in `RawTraceArchiveManager`.
3. Old-layout read compatibility and migration.
4. App-data migration integration.
5. Tests and verification.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: new writes must use only the new layout; old layout should be converted by migration.
- Exception rationale: old-layout read support is not a compatibility fork for new writes; it is a data-read safety boundary so existing user data remains accessible before/during migration or if a per-run migration fails. No dual-write behavior is allowed.
- Migration should remove old segment files/directories after successful per-run conversion when safe. Existing backup manifest may remain as migration evidence.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | AutoByteus/native compaction raw trace prune | `raw_traces_000001.jsonl` + `raw_traces_manifest.json` | `RawTraceArchiveManager` through `RunMemoryFileStore` | Ensures native compaction writes the new layout. |
| DS-002 | Primary End-to-End | Codex provider compaction boundary | `raw_traces_000001.jsonl` + `raw_traces_manifest.json` | `RawTraceArchiveManager` through provider boundary recorder | Ensures Codex uses the new shared layout without converter changes. |
| DS-003 | Primary End-to-End | Claude Agent SDK compact boundary | `raw_traces_000001.jsonl` + `raw_traces_manifest.json` | `RawTraceArchiveManager` through provider boundary recorder | Ensures Claude compact boundaries use the new shared layout. |
| DS-004 | Return-Event | Raw trace archive/full-corpus read | Complete raw trace records | `RunMemoryFileStore` / `RawTraceArchiveManager` | Preserves active + rotated = complete history. |
| DS-005 | Primary End-to-End | Startup app-data migration runner | Old raw trace archive layouts converted to new raw trace rotation layout | `RawTraceLayoutAppDataMigration` | Existing user data must be upgraded safely. |

## Primary Execution Spine(s)

- DS-001: AutoByteus compactor -> `MemoryStore.pruneRawTracesById` -> `RunMemoryFileStore.pruneRawTracesById` -> `RawTraceArchiveManager.archiveRecords` -> `raw_traces_<index>.jsonl` + `raw_traces_manifest.json`.
- DS-002: Codex compact event converter -> `COMPACTION_STATUS` provider boundary -> `ProviderCompactionBoundaryRecorder` -> `RunMemoryFileStore.rotateActiveRawTracesBeforeBoundary` -> `RawTraceArchiveManager.archiveRecords` -> `raw_traces_<index>.jsonl` + `raw_traces_manifest.json`.
- DS-003: Claude compact boundary converter -> `COMPACTION_STATUS` provider boundary -> `ProviderCompactionBoundaryRecorder` -> `RunMemoryFileStore.rotateActiveRawTracesBeforeBoundary` -> `RawTraceArchiveManager.archiveRecords` -> `raw_traces_<index>.jsonl` + `raw_traces_manifest.json`.
- DS-005: Server startup -> `AppDataMigrationRunner.runPending` -> `RawTraceLayoutAppDataMigration.execute` -> scan run memory dirs -> convert old manifest/segments -> summary/log/record.

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | Native compaction supplies selected raw trace IDs; file store splits active records; archive manager writes a numbered raw-trace segment beside the active file and records manifest metadata. | Compactor, `RunMemoryFileStore`, `RawTraceArchiveManager` | `RawTraceArchiveManager` | Native boundary key generation remains in file store. |
| DS-002 | Codex compact events normalize to provider boundaries; the boundary recorder asks the file store to rotate records before the marker; archive manager writes the shared new layout. | Codex converter, boundary recorder, file store, archive manager | `RawTraceArchiveManager` | Codex event/window dedupe remains converter-owned. |
| DS-003 | Claude status markers remain non-rotating; Claude compact boundary triggers rotation through the same file store/archive manager path. | Claude converter, boundary recorder, file store, archive manager | `RawTraceArchiveManager` | Status-vs-boundary eligibility remains converter/recorder-owned. |
| DS-004 | Consumers read archive-only or full corpus; archive manager resolves manifest-listed segment files from new or old layout; file store merges active and rotated records. | File store, archive manager | `RunMemoryFileStore` for corpus merge; `RawTraceArchiveManager` for segment reads | Old-layout path resolution. |
| DS-005 | Startup migration scans run memory directories, converts old manifest and segment files to new names/locations, backs up old manifest, and reports per-run results. | Migration runner, raw trace layout migration, filesystem | `RawTraceLayoutAppDataMigration` | Safe scan, backups, atomic writes, failure isolation. |

## Spine Actors / Main-Line Nodes

- Compaction/runtime trigger: native compactor, Codex converter, Claude converter.
- `RunMemoryFileStore`: active raw trace split/rewrite and full-corpus merge.
- `RawTraceArchiveManager`: rotated segment file and manifest owner.
- `AppDataMigrationRunner`: startup execution and record/log owner for app data migrations.
- `RawTraceLayoutAppDataMigration`: old-layout filesystem conversion owner.

## Ownership Map

- `RawTraceArchiveManager`
  - owns active run's rotated raw trace segment naming, manifest filename, segment write lifecycle, manifest read/write, old/new segment path resolution, and boundary-key idempotency.
  - must not know Codex/Claude event semantics beyond boundary metadata passed in.
- `RunMemoryFileStore`
  - owns active raw trace file rewrite, prune/rotate orchestration, and active+rotated full-corpus merge.
  - delegates segment file mechanics to `RawTraceArchiveManager`.
- `ProviderCompactionBoundaryRecorder`
  - owns marker writing and deciding whether a provider boundary should call rotation.
  - must not construct raw trace segment filenames.
- `RawTraceLayoutAppDataMigration`
  - owns app-data upgrade from old raw trace archive layout to new raw trace rotation layout across stored run dirs.
  - must not change runtime compaction semantics.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `FileMemoryStore.pruneRawTracesById` | `RunMemoryFileStore` / `RawTraceArchiveManager` | Public package memory-store facade. | Segment path/name policy. |
| `RunMemoryWriter.rotateActiveRawTracesBeforeBoundary` | `RunMemoryFileStore` / `RawTraceArchiveManager` | Server memory-writer facade for provider boundary events. | Segment path/name policy. |
| `AppDataMigrationRunner.runPending` | Registered `AppDataMigrationDefinition`s | Shared startup migration orchestration. | Raw trace layout conversion details. |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| New writes to `raw_traces_archive/` | New raw trace rotation model keeps active and rotated raw-trace files together. | `RawTraceArchiveManager` writing `raw_traces_<index>.jsonl` under run dir. | In This Change | Old read support remains for existing data. |
| New writes to `raw_traces_archive_manifest.json` | Manifest name should match raw trace family. | `raw_traces_manifest.json`. | In This Change | Migration backs up old manifest and writes new manifest. |
| Timestamp in new segment filenames | Manifest stores archival timestamp. | Number-only `raw_traces_<index>.jsonl`. | In This Change | Segment index remains ordered and unique. |
| Old `raw_traces_archive/` files after successful migration | Converted files supersede them. | New direct segment files and new manifest. | In This Change | Remove complete-entry source files after successful verification; preserve pending-file evidence in migration backup if present; remove old archive dir only if empty. |
| Original `raw_traces_archive_manifest.json` after successful migration | Leaving it authoritative would break rerun idempotency after old segment cleanup. | `raw_traces_manifest.json` plus old-manifest backup evidence. | In This Change | After verifying new manifest/segments and backup creation, remove or atomically rename the original old manifest so only backup evidence remains. |
| Broad class/API `Archive` naming | Internal historical naming may remain without affecting filesystem model. | Potential future `RawTraceSegmentManager` rename. | Follow-up | Avoid broad churn unless reviewer requires. |

## Return Or Event Spine(s) (If Applicable)

- Archive-only read: caller -> `RunMemoryFileStore.readCompleteArchiveRawTraceDicts` -> `RawTraceArchiveManager.readCompleteArchiveRawTraceDicts` -> new manifest or old manifest fallback -> segment path resolver -> records.
- Full corpus read: caller -> `RunMemoryFileStore.readCompleteRawTraceCorpusDicts` -> rotated records + active records -> dedupe/sort -> returned complete raw trace history.
- Migration result: migration -> `AppDataMigrationExecutionResult` -> runner writes log and app data migration record -> UI/API can display status.

## Bounded Local / Internal Spines (If Applicable)

- `RawTraceArchiveManager.archiveRecords`:
  - check records -> find complete segment by boundary key -> remove pending same-boundary entries -> allocate `next_segment_index` -> build `raw_traces_<index>.jsonl` -> write pending manifest to `raw_traces_manifest.json` -> write segment JSONL -> mark manifest complete -> return segment.
- `RawTraceLayoutAppDataMigration` per-run conversion:
  - discover run dir -> classify layout state -> read old manifest if authoritative -> prevalidate complete segment sources -> derive new file names by segment `index` -> copy/write complete segment files to new names -> preserve pending-file evidence in backup area when present -> write new manifest atomically with complete entries only -> verify new manifest/segments -> create/confirm old manifest backup -> decommission original old manifest -> remove migrated old complete segment files and old archive dir if empty -> emit detail.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Safe manifest path resolution | DS-004, DS-005 | `RawTraceArchiveManager`, migration | Resolve new direct names and old archive-dir names under run dir only. | Prevent path traversal and preserve old reads. | Runtime code could bypass store safety. |
| App-data migration record/logging | DS-005 | `AppDataMigrationRunner` | Persist status, logs, retryability. | Consistent migration UX/ops. | Raw trace migration would invent a parallel migration mechanism. |
| Run directory discovery | DS-005 | `RawTraceLayoutAppDataMigration` | Find standalone and team/member/task run dirs that contain raw trace layout evidence. | Existing data spans `agents/` and nested `agent_teams/`. | Normal read APIs might start scanning directories. |
| Per-run backup/atomic write | DS-005 | `RawTraceLayoutAppDataMigration` | Preserve old manifest before conversion and avoid partial data loss. | Startup migration must be safe. | Archive manager would absorb app-data migration policy. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| New rotated raw trace file layout | `autobyteus-ts/src/memory/store` | Extend | Existing archive manager owns segment files for all runtimes. | N/A |
| Startup data migration | `autobyteus-server-ts/src/app-data-migrations` | Extend | Existing framework owns app-data migration records, logs, startup execution, retries. | N/A |
| Runtime-specific compaction events | Codex/Claude/native compaction paths | Reuse | They already delegate to shared store boundary. | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts` memory store | Raw trace active file, rotated segments, manifest, corpus reads. | DS-001..DS-004 | `RunMemoryFileStore`, `RawTraceArchiveManager` | Extend | Main runtime/storage change. |
| Server app-data migrations | Stored data upgrade from old to new layout. | DS-005 | `AppDataMigrationRunner`, new migration definition | Extend | Migration lives server-side because startup migration framework is there. |
| Agent memory server store | Read APIs used by memory views. | DS-004 | `MemoryFileStore` | Reuse | Should work via `RunMemoryFileStore` with minimal/no changes. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/memory/store/raw-trace-archive-manager.ts` | Memory store | Rotated raw trace segment manager | New manifest name, new segment names/paths, old/new read resolution. | Existing segment owner. | Manifest types. |
| `autobyteus-ts/src/memory/store/raw-trace-archive-manifest.ts` | Memory store | Manifest schema | Keep schema, maybe export new/old file-name constants if needed. | Existing manifest type owner. | N/A |
| `autobyteus-ts/src/memory/store/run-memory-file-store.ts` | Memory store | Run memory file store | Full corpus reads and archive manager facade. | Existing active+rotated corpus owner. | Archive manager. |
| `autobyteus-server-ts/src/app-data-migrations/migrations/raw-trace-rotation-layout-migration.ts` | App-data migrations | Raw trace layout migration | Convert old raw trace archive layout across run dirs. | New migration concern with startup records/logs. | App migration types. |
| `autobyteus-server-ts/src/app-data-migrations/app-data-migration-registry.ts` | App-data migrations | Migration registry | Register required startup migration. | Existing registry owner. | Migration definition. |
| Unit tests under `autobyteus-ts/tests/unit/memory/` | Memory store tests | Store behavior coverage | New layout writes/reads and old layout reads. | Existing focused coverage. | N/A |
| Unit tests under `autobyteus-server-ts/tests/unit/app-data-migrations/` | Migration tests | App-data migration coverage | Migration success/skip/failure/idempotency. | Existing migration test convention. | N/A |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Raw trace layout file-name constants | Possibly `raw-trace-archive-manager.ts` exports or a small constants section in existing file | Memory store | Migration and runtime store need consistent names if server imports package source/export. | Yes | Yes | Generic filesystem constants dump. |
| Segment file name builder `raw_traces_<index>.jsonl` | Keep private or export focused helper only if migration needs it | Memory store | Prevent duplicated filename format in migration. | Yes | Yes | Runtime-specific helper. |
| Safe segment path resolution | Keep in archive manager; migration may have own stricter conversion helper | Memory store / migration | Runtime read and migration differ: read resolves; migration transforms. | Yes | Yes | Over-broad path utility. |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `RawTraceArchiveSegmentEntry.file_name` | Yes | Yes | Medium during migration | Store new direct file names; old manifest fallback may contain old names until migration. |
| `RawTraceArchiveSegmentEntry.archived_at` | Yes | Yes | Low | Use as timestamp authority; keep timestamp out of filenames. |
| `RawTraceArchiveSegmentEntry.index` | Yes | Yes | Low | Use for new filename derivation. |
| `RawTraceArchiveManifest.next_segment_index` | Yes | Yes | Low | Continue allocating unique segment numbers. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/memory/store/raw-trace-archive-manager.ts` | Memory store | Raw trace rotated segment manager | New `raw_traces_manifest.json`, `raw_traces_<index>.jsonl`, old manifest fallback, old/new segment resolution, segment write/read/idempotency. | Existing authoritative segment owner. | Manifest types. |
| `autobyteus-ts/src/memory/store/raw-trace-archive-manifest.ts` | Memory store | Manifest schema | Existing schema; optional constants if needed. | Existing schema file. | N/A |
| `autobyteus-ts/src/memory/store/run-memory-file-store.ts` | Memory store | Run memory file store | Continue active file operations and full corpus merge; expose manifest revision info from new manifest with old fallback if needed. | Existing active+rotated corpus boundary. | Archive manager. |
| `autobyteus-server-ts/src/app-data-migrations/migrations/raw-trace-rotation-layout-migration.ts` | App-data migrations | Raw trace layout migration | Discover old-layout run dirs, convert files/manifests, backup, cleanup, summarize. | Dedicated app-data migration concern. | Migration types; memory layout knowledge. |
| `autobyteus-server-ts/src/app-data-migrations/app-data-migration-registry.ts` | App-data migrations | Registry | Include new migration in startup sequence. | Existing registration owner. | New migration class. |
| `autobyteus-ts/tests/unit/memory/raw-trace-archive-manager.test.ts` | Memory store tests | Segment manager tests | New write layout, old read fallback, idempotency. | Existing focused tests. | N/A |
| `autobyteus-ts/tests/unit/memory/run-memory-file-store.test.ts` | Memory store tests | Run store tests | Native/provider path visible behavior and full corpus. | Existing focused tests. | N/A |
| `autobyteus-server-ts/tests/unit/app-data-migrations/raw-trace-rotation-layout-migration.test.ts` | App-data migration tests | Migration tests | Success, skip, idempotency, failure isolation. | Existing migration test folder. | N/A |

## Ownership Boundaries

- Runtime compaction boundaries remain above the storage boundary and must not know segment filenames.
- `RunMemoryFileStore` remains the active raw trace owner and calls the segment manager for rotated persistence.
- `RawTraceArchiveManager` is the only runtime/write owner of raw trace segment physical layout.
- `RawTraceLayoutAppDataMigration` owns offline/stored-data conversion and can manipulate old/new files directly because migration is outside normal runtime write flow.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `RawTraceArchiveManager.archiveRecords` | segment filename, manifest filename, pending/complete lifecycle | `RunMemoryFileStore` | Codex/Claude/native code writing `raw_traces_000001.jsonl` directly. | Add archive manager method. |
| `RunMemoryFileStore.pruneRawTracesById` / `rotateActiveRawTracesBeforeBoundary` | active split/rewrite and segment delegation | Compactors, server memory writer | Compactors mutating active and rotated files separately. | Add store-level operation. |
| `AppDataMigrationRunner` | migration records/logs/retries/startup gating | Server startup, settings UI/API | Standalone startup script outside migration records. | Add migration definition. |

## Dependency Rules

- `RunMemoryFileStore` may depend on `RawTraceArchiveManager`.
- `RawTraceArchiveManager` may depend on filesystem/path and manifest types only.
- Codex/Claude converters and `ProviderCompactionBoundaryRecorder` must not depend on raw trace segment filename constants.
- App-data migration may depend on app-data migration types and filesystem scanning; it may use or mirror raw trace layout constants, but must not call runtime compaction paths.
- Normal read APIs must use manifest entries, not directory scanning.
- Migration discovery may scan filesystem only for migration detection/conversion.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `RawTraceArchiveManager.archiveRecords(records, boundary)` | Rotated raw trace segment | Create or reuse segment for boundary. | `RawTraceArchiveBoundaryInput.boundaryKey` | New file path/name. |
| `RawTraceArchiveManager.readManifest()` | Raw trace manifest | Read new manifest, with old fallback if no new manifest. | None | Prefer new manifest when present. |
| `RawTraceArchiveManager.readCompleteArchiveRawTraceDicts()` | Rotated raw trace records | Read complete segments from manifest. | None | Resolve old/new paths safely. |
| `RunMemoryFileStore.readCompleteRawTraceCorpusDicts(limit?)` | Complete raw trace corpus | Merge rotated + active records. | Optional limit. | Behavior unchanged. |
| `RawTraceLayoutAppDataMigration.execute()` | Stored app data conversion | Convert old layout across runs. | Configured memory dir. | Required startup migration. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `archiveRecords` | Yes | Yes | Low | None. |
| `readManifest` | Yes | Yes | Low | Define new-first/old-fallback behavior. |
| `readCompleteArchiveRawTraceDicts` | Yes | Yes | Low | Keep path resolution internal. |
| `RawTraceLayoutAppDataMigration.execute` | Yes | Yes | Medium | Define safe run-dir discovery rules. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Active raw trace file | `raw_traces.jsonl` | Yes | Low | Keep. |
| Rotated raw trace segment | `raw_traces_000001.jsonl` | Yes | Low | Add. |
| Raw trace manifest | `raw_traces_manifest.json` | Yes | Low | Rename from archive manifest for new layout. |
| Manager class | `RawTraceArchiveManager` | Partially | Medium | Defer broad rename unless implementation scope remains small enough. |
| Migration | `RawTraceRotationLayoutMigration` / `RawTraceLayoutAppDataMigration` | Yes | Low | Use clear class/file name. |

## Applied Patterns (If Any)

- Log-rotation-style file family: active raw trace file plus numbered rotated raw trace files in the same directory.
- Manifest/index pattern: filenames stay simple while metadata remains in the manifest.
- App-data migration pattern: required startup migration with summaries, details, logs, retry support, and persisted records.
- Atomic replacement pattern: write temp then rename for manifests; copy/write new segment files before deleting old ones.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/memory/store/raw-trace-archive-manager.ts` | File | Rotated raw trace segment owner | New file layout, manifest name, read fallback, idempotency. | Existing shared runtime owner for all runtimes. | App-data migration scanning. |
| `autobyteus-ts/src/memory/store/raw-trace-archive-manifest.ts` | File | Manifest model | Manifest schema/types/constants if extracted. | Existing schema model. | Filesystem migration logic. |
| `autobyteus-server-ts/src/app-data-migrations/migrations/raw-trace-rotation-layout-migration.ts` | File | App-data migration | Convert old layout to new layout. | Existing migration subsystem. | Runtime compaction logic. |
| `autobyteus-server-ts/src/app-data-migrations/app-data-migration-registry.ts` | File | Migration registry | Register new migration. | Existing registry. | Migration implementation details. |
| `autobyteus-ts/tests/unit/memory/` | Folder | Memory store tests | Store/manager coverage. | Existing unit test location. | Server migration tests. |
| `autobyteus-server-ts/tests/unit/app-data-migrations/` | Folder | App-data migration tests | Migration coverage. | Existing unit test location. | Runtime provider event tests. |

## Change Inventory

| Type (`Add`/`Modify`/`Rename/Move`/`Remove`) | Path | Summary |
| --- | --- | --- |
| Modify | `autobyteus-ts/src/memory/store/raw-trace-archive-manager.ts` | New manifest filename, new segment filename/path, old layout read fallback. |
| Modify | `autobyteus-ts/src/memory/store/run-memory-file-store.ts` | Adjust exposed manifest/revision behavior only if needed due new/old manifest paths. |
| Add | `autobyteus-server-ts/src/app-data-migrations/migrations/raw-trace-rotation-layout-migration.ts` | Required startup migration for old raw trace archive layouts. |
| Modify | `autobyteus-server-ts/src/app-data-migrations/app-data-migration-registry.ts` | Register new migration. |
| Modify | `autobyteus-ts/tests/unit/memory/raw-trace-archive-manager.test.ts` | Update/add new layout and old fallback tests. |
| Modify | `autobyteus-ts/tests/unit/memory/run-memory-file-store.test.ts` | Update/add full-corpus and write-path assertions. |
| Add | `autobyteus-server-ts/tests/unit/app-data-migrations/raw-trace-rotation-layout-migration.test.ts` | Migration coverage. |

## Migration / Refactor Sequence

1. Update raw trace segment manager constants:
   - new manifest: `raw_traces_manifest.json`
   - old manifest fallback: `raw_traces_archive_manifest.json`
   - new segment name: `raw_traces_<index>.jsonl`
   - old segment directory fallback: `raw_traces_archive/`
2. Update `archiveRecords` to write pending/complete state to the new manifest and segment files directly under run dir.
3. Update `readManifest` to prefer new manifest and fall back to old manifest when new is absent.
4. Update segment read path resolution to safely support:
   - new direct `raw_traces_000001.jsonl`
   - old bare old manifest entries resolved under `raw_traces_archive/`
   - old explicit relative entries such as `raw_traces_archive/000001_...jsonl` if migration writes/encounters them.
5. Add app-data migration:
   - discover candidate run dirs under `memoryDir/agents/**` and `memoryDir/agent_teams/**` by old/new manifest/archive evidence.
   - skip already-new-layout dirs with no old manifest/archive work.
   - for old-layout dirs, read old manifest, derive new `file_name` from `index`, copy/move segment records into `raw_traces_<index>.jsonl`, write `raw_traces_manifest.json`, back up old manifest, and clean old segment files/directories only after success.
6. Register migration as required on startup.
7. Update tests.

## Migration Details / Safety Rules

- Migration ID should be stable and date-prefixed, for example `20260617_raw_trace_rotation_layout`.
- Per-run item ID should be the run directory path relative to memory root where possible.
- Backup path: `${oldManifestPath}.backup-<iso-safe-timestamp>`.
- New manifest write should use temp file then rename.
- Segment conversion should avoid overwriting a non-equivalent existing `raw_traces_<index>.jsonl`. If the target exists with identical content, treat the segment as already converted; if it differs, fail that run detail before decommissioning old authoritative files.
- Complete entries are authoritative and must be migrated into the new manifest. If any complete segment source file is missing, fail that run detail, do not write/decommission the new manifest for that run, and leave old files untouched except for harmless temp files that are cleaned up.
- Pending entries are not authoritative because current archive reads ignore them; they must not be promoted into the new manifest.
- Pending entry with file present: preserve the pending file as backup evidence under a migration backup path outside `raw_traces_archive/`, exclude the entry from the new manifest, continue migration, and report `MIGRATED` for the run with a message noting pending evidence was backed up.
- Pending entry with missing file: exclude the entry from the new manifest, continue migration, and report `MIGRATED` for the run with a message noting stale missing pending metadata was dropped. Missing pending files do not cause `FAILED`.
- Stale pending plus complete same-boundary: migrate the complete entry, exclude the pending entry, back up the pending file if present, and report `MIGRATED` for the run with that cleanup noted.
- If the old manifest has only pending entries, write a new manifest with no segments and preserve old `next_segment_index`; back up present pending files; decommission the old manifest; report `MIGRATED` because authoritative layout changed.
- Remove old `raw_traces_archive/` only if empty after migrated complete files are removed and pending files are moved/copied to backup evidence. If non-empty unexpected files remain, leave the directory and report `MIGRATED` with cleanup warning details; rerun detection must not treat that backup/unexpected leftover alone as authoritative old manifest evidence.
- Do not migrate by scanning arbitrary `raw_traces_*.jsonl` files; use manifest entries as authoritative.


## App-Data Migration State Machine And Idempotency

Per-run migration must classify state before changing files:

| State | Evidence | Required Behavior | Detail Status |
| --- | --- | --- | --- |
| Already new layout | `raw_traces_manifest.json` exists; original `raw_traces_archive_manifest.json` absent; only backup evidence may remain | Validate new manifest can be parsed; skip without rewriting. | `SKIPPED` |
| Old layout | Original `raw_traces_archive_manifest.json` exists; new manifest absent | Run full conversion. After success, original old manifest is removed or atomically renamed to backup evidence. | `MIGRATED` |
| Partial converted, cleanup pending | New manifest exists and original old manifest still exists | Validate new manifest and new complete segment files. If valid, complete decommission of original old manifest and cleanup old complete files; if invalid or conflicts with old manifest, fail without deleting old authoritative data. | `MIGRATED` for cleanup completion or `FAILED` for ambiguous partial state |
| Orphan old archive dir only | No original old manifest; `raw_traces_archive/` exists | Do not reconstruct from directory scanning. If empty, optionally remove and report skip/cleanup; if non-empty, leave it and skip with warning message because no authoritative old manifest exists. | `SKIPPED` |
| Malformed old manifest | Original old manifest exists but cannot be parsed as expected | Do not write new manifest or delete old files. | `FAILED` |

Successful final state for a migrated run:

```text
<memoryDir>/
  raw_traces.jsonl                    # if active traces existed before
  raw_traces_000001.jsonl             # complete entries only
  raw_traces_000002.jsonl
  raw_traces_manifest.json            # authoritative manifest
  raw_traces_archive_manifest.json.backup-<timestamp>  # backup evidence, optional exact suffix
  raw_traces_migration_backup-<timestamp>/...          # only if pending-file evidence needed
```

The original authoritative old manifest path must not remain:

```text
<memoryDir>/raw_traces_archive_manifest.json  # must be absent after success
```

Rerun rule: a run with `raw_traces_manifest.json` and no original `raw_traces_archive_manifest.json` is already migrated, regardless of old-manifest backup files. Backup files must not be treated as old-layout evidence.

## Pending And Missing Segment Migration Policy

| Old Manifest Entry Case | New Manifest Treatment | File Treatment | Run Detail Status | Old Authoritative Files After Attempt |
| --- | --- | --- | --- | --- |
| `complete` entry with source file present | Include entry with new `file_name` (`raw_traces_<index>.jsonl`) and preserved metadata. | Copy/write to new segment file; remove old source after verification. | `MIGRATED` if conversion performed; `SKIPPED` only if already converted and old manifest absent. | Decommission old manifest after success. |
| `complete` entry with source file missing | Do not write/decommission new manifest for that run. | No cleanup; leave old files as-is. | `FAILED` | Old manifest and old files remain authoritative for diagnosis/retry. |
| `pending` entry with source file present | Exclude from new manifest. | Preserve file as backup evidence outside `raw_traces_archive/`; remove old pending source only after backup succeeds. | `MIGRATED` with message noting pending evidence backup. | Old manifest decommissioned after success. |
| `pending` entry with source file missing | Exclude from new manifest. | No file action. | `MIGRATED` with message noting stale missing pending entry dropped. | Old manifest decommissioned after success. |
| Pending and complete entries share same `boundary_key` | Migrate complete entry; exclude pending entry. | Back up pending file if present; migrate complete file. | `MIGRATED` with stale pending cleanup note. | Old manifest decommissioned after success. |
| Only pending entries, no complete entries | New manifest has no segments but preserves `next_segment_index`. | Back up present pending files; missing pending files ignored with note. | `MIGRATED` | Old manifest decommissioned after success. |

This policy preserves current runtime semantics: complete archive reads ignore pending entries today, so migration must not make pending entries visible as completed history.

## Compatibility / Legacy Handling

- New writes never use old manifest or old archive directory.
- Reads support old layout as data-read safety.
- Migration converts old layout into new layout and can leave backups.
- No dual-write behavior.
- No manifest schema version bump is required unless implementation needs to distinguish layout explicitly; `file_name` and manifest path are sufficient.

## Test / Coverage Guidance

Minimum durable tests:

- Archive manager creates `raw_traces_000001.jsonl` and `raw_traces_manifest.json` for new writes.
- Archive manager does not create `raw_traces_archive/` for new writes.
- Same-boundary replay remains idempotent.
- Archive manager reads old `raw_traces_archive_manifest.json` + old segment files when new manifest is absent.
- Full corpus read merges old/new rotated records plus active records.
- App-data migration:
  - migrates old layout to new layout.
  - preserves manifest metadata.
  - creates backup and reports migrated detail.
  - skips already-new layout.
  - is idempotent on rerun.
  - isolates malformed/missing-file failures per run.
  - scans standalone and nested team/member run dirs.
- Existing cross-runtime memory persistence tests should be considered by API/E2E after code review because runtime writer paths are shared through the manager.

Suggested implementation checks, adjusted by package tooling:

```bash
pnpm --filter autobyteus-ts exec vitest run tests/unit/memory/raw-trace-archive-manager.test.ts tests/unit/memory/run-memory-file-store.test.ts
pnpm --filter autobyteus-server-ts exec vitest run tests/unit/app-data-migrations/raw-trace-rotation-layout-migration.test.ts
pnpm --filter autobyteus-ts build
pnpm --filter autobyteus-server-ts typecheck
```

## Risks / Open Questions

- Risk: recursive team directory scanning can overmatch non-run directories. Mitigation: treat only dirs with raw trace manifest/archive evidence as candidates.
- Risk: old layout cleanup could remove data after partial conversion. Mitigation: prevalidate complete sources, copy/write new first, write manifest atomically, verify new files, preserve pending evidence in backup, then decommission original old manifest and cleanup old complete files only after successful verification.
- Risk: internal `Archive` naming may remain slightly stale. Mitigation: acceptable unless architecture review requires targeted rename; avoid broad churn.
- Pending-entry behavior is no longer an implementation open question: pending entries are excluded from the new manifest; present pending files are backed up; missing pending files are noted but do not fail; missing complete files fail that run and preserve old authoritative files.
