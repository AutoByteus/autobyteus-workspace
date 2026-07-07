# Design Spec

## Current-State Read

The active runtime raw-trace file is currently named `raw_traces.jsonl`. Code investigation found no live `raw_traces.json` path. The `.jsonl` extension is correct because the file contains line-delimited raw trace records.

Current source ownership is healthy:

- `autobyteus-ts/src/memory/store/memory-file-names.ts` owns canonical shared memory filenames.
- `RunMemoryFileStore` owns low-level active raw trace writes, active reads, active rewrites, sequence initialization inputs, and complete-corpus reads.
- `RawTraceArchiveManager` owns raw-trace rotation manifest and segment filenames.
- `MemoryFileStore`, `AgentMemoryService`, and `RawTraceFileSourceService` own server read boundaries and API-safe file-source selection.
- `SelfEvolutionWorkTraceStore` owns derived work-trace markdown filenames, including `work_trace_active.md`.

The naming problem is semantic drift in the active raw-trace filename. `raw_traces.jsonl` sounds like the complete corpus, but after native compaction or provider-boundary rotation it is only the active tail. Complete history is complete rotated `raw_traces_<index>.jsonl` segment files plus the active file.

The target must keep source code clean: source readers/writers should depend on one canonical active filename and must not add a steady-state fallback read from `raw_traces.jsonl`. Existing persisted app data must be migrated once.

## Intended Change

Rename the canonical active runtime raw-trace file from:

- old migration-only name: `raw_traces.jsonl`

To:

- new canonical name: `raw_traces_active.jsonl`

Keep unchanged:

- raw-trace segment files: `raw_traces_000001.jsonl`, `raw_traces_000002.jsonl`, ...
- rotation manifest: `raw_traces_manifest.json`
- self-evolution work-trace active projection: `work_trace_active.md`

Implement this as two explicit parts:

1. **Source-code canonical rename**: update shared constants, store/service imports, tests, and docs so live code uses only the new active filename.
2. **Data migration**: add a startup app-data migration that renames existing old active files to `raw_traces_active.jsonl`, including local memory roots and imported Memory Sync corpora when present.

No backward compatibility wrappers, dual reads, or fallback behavior are allowed after migration.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Cleanup / Behavior Change
- Current design issue found (`Yes`/`No`/`Unclear`): No major ownership issue; yes minor naming drift.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): No Design Issue Found for boundaries; file-name semantic drift cleanup.
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): No structural refactor. Clean rename plus migration required.
- Evidence:
  - `RAW_TRACES_MEMORY_FILE_NAME` centralizes the current active filename.
  - `RunMemoryFileStore` already owns active raw-trace reads/writes and active rewrites.
  - `RawTraceArchiveManager` already owns segment/manifest naming separately.
  - `RawTraceFileSourceService` already exposes active vs segment summaries.
  - User explicitly approved no backward compatibility and existing-data migration.
- Design response:
  - Strengthen source naming by making the active state explicit in the canonical constant and physical filename.
  - Isolate old filename knowledge inside a one-time app-data migration and migration tests.
  - Keep existing runtime, archive, and API boundaries intact.
- Refactor rationale:
  - No new subsystem is needed. The right owners already exist.
  - A narrow migration module is needed because the filename is persisted app data.
- Intentional deferrals and residual risk, if any:
  - Memory Sync protocol v1 has no delete operation. The migration should update imported corpora and import manifests where present, but source-side/hub-side stale old-path state on separately deployed older nodes is not supported by runtime fallback. Upgraded nodes migrate their own app data.

## Terminology

- **Active raw-trace file**: the mutable JSONL file that receives new raw trace records and retains the active tail after rotations.
- **Raw-trace segment file**: immutable rotated JSONL file named `raw_traces_<zero-padded-index>.jsonl`.
- **Raw-trace manifest**: `raw_traces_manifest.json`, the segment index and boundary metadata file.
- **Work trace**: self-evolution markdown projection derived from raw trace files, not the raw runtime persistence format.

## Design Reading Order

1. data-flow spine
2. subsystem / capability-area allocation
3. draft file responsibilities -> extract reusable owned structures -> finalize file responsibilities
4. folder/path mapping

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove steady-state source-code dependencies on `raw_traces.jsonl`.
- The old filename may appear only in the one-time migration, migration tests, and limited historical notes if needed.
- Runtime reads/writes must not attempt `raw_traces.jsonl` fallback.
- GraphQL/file-selector behavior must surface the new active filename and rely on existing invalid-selection fallback to a listed backend file, not old-file compatibility.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Runtime memory event | `raw_traces_active.jsonl` append/rewrite | `RunMemoryFileStore` | Main write path for active raw trace persistence. |
| DS-002 | Primary End-to-End | Memory view / run-history / self-evolution read request | Active raw traces or complete corpus records | `AgentMemoryService` + `RunMemoryFileStore` | Ensures readers use the canonical active file and unchanged segment corpus behavior. |
| DS-003 | Primary End-to-End | Startup app-data migration runner | Migrated memory directory/import corpus | `RawTraceActiveFileNameMigration` | Existing data must be moved cleanly without runtime fallback. |
| DS-004 | Bounded Local | Migration candidate directory | Renamed file and optional manifest key update | `RawTraceActiveFileNameMigration` | The migration should stay simple and deterministic: existing old active files become the new active files. |
| DS-005 | Primary End-to-End | Self-evolution work-trace generation | `work_trace_active.md` | `SelfEvolutionWorkTraceProjectionService` | Verifies derived work-trace naming remains distinct and unchanged. |

## Primary Execution Spine(s)

- DS-001: `Runtime Event -> RunMemoryWriter / MemoryManager -> RunMemoryFileStore -> RAW_TRACES_ACTIVE_MEMORY_FILE_NAME -> raw_traces_active.jsonl`
- DS-002: `GraphQL / Run-History / Self-Evolution Reader -> AgentMemoryService / LocalMemoryRunViewProjectionProvider -> MemoryFileStore -> RunMemoryFileStore -> raw_traces_active.jsonl + complete segments`
- DS-003: `AppDataMigrationRunner -> AppDataMigrationRegistry -> RawTraceActiveFileNameMigration -> Memory Roots / Import Roots -> File Rename + Manifest Cleanup`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | Runtime memory recording creates `RawTraceItem` records and appends them through the shared run-memory store. Active rewrites after rotation also use the same canonical active filename. | Runtime memory writer, shared run-memory store, active raw trace file | `RunMemoryFileStore` | Filename constants; raw trace item serialization |
| DS-002 | Read surfaces request active or complete raw traces. Active reads resolve the new active filename; complete corpus reads merge complete segments and active records exactly as before. | Memory service, memory file store, run-memory store, raw-trace files | `AgentMemoryService` for view shaping; `RunMemoryFileStore` for storage mechanics | Raw trace normalization; file-source summaries; GraphQL conversion |
| DS-003 | Startup migration scans local memory roots and imported corpora, renames old active files to the new active filename, and updates imported sync manifests where they exist. | Migration runner, migration definition, memory/import roots | `RawTraceActiveFileNameMigration` | Candidate discovery; old-to-new rename; import manifest key rewrite |
| DS-005 | Self-evolution reads raw active/segment sources through the existing source service and writes markdown work traces. The active derived file remains `work_trace_active.md`. | Raw trace source reader, work trace projection service, work trace store | `SelfEvolutionWorkTraceProjectionService` | Renderer/redactor; work-trace manifest |

## Spine Actors / Main-Line Nodes

- `RunMemoryWriter` / `MemoryManager`: runtime-facing trace creation owners.
- `RunMemoryFileStore`: authoritative low-level active raw-trace file owner.
- `RawTraceArchiveManager`: segment/manifest owner for rotated raw traces.
- `MemoryFileStore`: server read adapter around run memory layout.
- `AgentMemoryService`: memory view owner.
- `RawTraceFileSourceService`: API-safe raw-trace file listing and selected-file owner.
- `RawTraceActiveFileNameMigration`: one-time persisted data migration owner.
- `SelfEvolutionWorkTraceProjectionService`: derived work-trace projection owner.

## Ownership Map

| Node | Owns |
| --- | --- |
| `RunMemoryFileStore` | Active raw-trace physical file path, active append/read/rewrite mechanics, complete corpus merge mechanics. |
| `memory-file-names.ts` | Shared canonical active memory filenames and filename constants. |
| `RawTraceArchiveManager` | Rotation manifest path, segment filename generation/resolution, complete segment reads. |
| `MemoryFileStore` | Server-side active/corpus/semantic/episodic file read convenience by run id. |
| `AgentMemoryService` | Memory view option interpretation and raw trace inclusion mode. |
| `RawTraceFileSourceService` | UI-safe file summaries, active vs segment source kind, selected filename validation. |
| `RawTraceActiveFileNameMigration` | Migration-only knowledge of old active filename, candidate discovery, old-to-new rename behavior, import manifest update. |
| `SelfEvolutionWorkTraceStore` | Work-trace markdown file names and manifest. |

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| GraphQL `getAgentRunMemoryView` / `getTeamMemberRunMemoryView` | `AgentMemoryService` and `RawTraceFileSourceService` | API entrypoint and GraphQL conversion boundary. | Physical raw trace filename policy or fallback reads. |
| `MemoryFileStore.readRawTracesActive` | `RunMemoryFileStore` / shared filename owner | Server convenience by run id. | Separate active filename constants or old-name fallback. |
| `MemoryManager` / `RunMemoryWriter` | `RunMemoryFileStore` | Runtime-facing trace creation. | Physical filename branching. |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Live source-code active filename `raw_traces.jsonl` | Misleading for active tail after rotation. | `raw_traces_active.jsonl` via canonical active filename constant. | In This Change | Old string allowed only in migration/tests/historical notes. |
| Export/import name `RAW_TRACES_MEMORY_FILE_NAME` if replaced by a clearer constant | Constant name does not say active. | `RAW_TRACES_ACTIVE_MEMORY_FILE_NAME` (or similarly explicit approved name). | In This Change | Prefer explicit source naming; update all imports. |
| `MEMORY_FILE_NAMES.rawTraces` if retained only for old naming | Property is not explicit about active state. | `MEMORY_FILE_NAMES.rawTracesActive` or remove object if unused. | In This Change | No compatibility property. |
| Existing persisted `raw_traces.jsonl` files | Old physical layout. | App-data migration to `raw_traces_active.jsonl`. | In This Change | Migration-only old-name knowledge. |
| Docs/tests expecting active `raw_traces.jsonl` | Old contract. | New active filename expectations. | In This Change | Segment docs unchanged. |

## Return Or Event Spine(s) (If Applicable)

No separate return/event spine is introduced. Existing run events and GraphQL return shapes remain unchanged except for file summary `fileName` values.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `RawTraceActiveFileNameMigration`
- Bounded local spine: `Scan Candidate Roots -> Identify Directory With Old Active File -> Rename Old Active File To New Active File -> Update Import Manifest If Needed -> Emit Migration Detail`
- Why it matters: Migration should stay simple and deterministic: existing old active files become new active files, and no runtime fallback exists.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Active filename constants | DS-001, DS-002 | `RunMemoryFileStore` | Provide one canonical active filename. | Prevent path duplication. | Callers hardcode or branch on filenames. |
| Raw trace normalization | DS-002 | `AgentMemoryService` | Convert raw records into API memory events. | Keeps UI/API payload shape separate from storage path. | File naming leaks into event conversion. |
| Raw trace file summaries | DS-002 | `RawTraceFileSourceService` | Expose safe active/segment file metadata. | Prevents absolute-path exposure. | GraphQL resolver would duplicate file selection rules. |
| Import manifest rewrite | DS-003, DS-004 | `RawTraceActiveFileNameMigration` | Keep imported Memory Sync manifests aligned with renamed files. | Imported memory views are read-only corpora with path-keyed manifests. | Runtime readers would need old-path compatibility or manifests would become misleading. |
| Work-trace rendering | DS-005 | `SelfEvolutionWorkTraceProjectionService` | Produce readable markdown evidence package. | Separate derived projection from raw trace storage. | Raw runtime file naming could leak into self-evolver prompt contract. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Canonical active filename | `autobyteus-ts` memory store filename constants | Extend | Existing shared memory filename owner. | N/A |
| Active raw-trace IO | `RunMemoryFileStore` | Reuse | Existing authoritative file path/write/read/rewrite owner. | N/A |
| Segment naming | `RawTraceArchiveManager` / manifest helpers | Reuse unchanged | Existing segment owner; rename does not affect segments. | N/A |
| API file selection | `RawTraceFileSourceService` | Reuse | Already owns active/segment summaries and selected filename validation. | N/A |
| Data migration | `app-data-migrations` subsystem | Extend | Existing startup migration framework and raw-trace layout migration precedent. | N/A |
| Work-trace active projection | `self-evolution` work-trace subsystem | Reuse unchanged | Existing derived artifact owner. | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts` memory store | Canonical active filename, low-level active raw trace IO, corpus merge, segment archive manager. | DS-001, DS-002 | Runtime memory owners | Extend | Rename constant/value; no fallback read. |
| `autobyteus-server-ts` agent-memory | Server read surfaces, file-source summaries, memory view conversion. | DS-002 | API/run-history/self-evolution readers | Reuse | Update imports/tests; behavior same except filename. |
| `autobyteus-server-ts` app-data migrations | Existing persisted data rename. | DS-003, DS-004 | App startup data hygiene | Extend | Add required startup migration after raw-trace rotation layout migration. |
| `autobyteus-server-ts` memory-sync | Imported corpus manifest path-key cleanup. | DS-003, DS-004 | Imported memory explorer | Extend via migration only | No protocol compatibility shim. |
| `autobyteus-server-ts` self-evolution | Work-trace projection names and content. | DS-005 | Self-evolver prompt/evidence | Reuse unchanged | Keep `work_trace_active.md`. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/memory/store/memory-file-names.ts` | Memory store | Filename constants | Rename active raw trace filename constant/value. | Existing canonical filename file. | N/A |
| `autobyteus-ts/src/memory/store/run-memory-file-store.ts` | Memory store | Run memory IO | Use renamed active filename constant. | Existing active IO owner. | Yes |
| `autobyteus-server-ts/src/agent-memory/store/memory-file-store.ts` | Agent-memory | Server read adapter | Use renamed active filename constant. | Existing server read adapter. | Yes |
| `autobyteus-server-ts/src/agent-memory/services/memory-run-summary-builder.ts` | Agent-memory | Availability summary | Check new active file for raw-trace availability. | Existing summary owner. | Yes |
| `autobyteus-server-ts/src/agent-memory/services/raw-trace-file-source-service.ts` | Agent-memory | File-source selection | Expose active filename as new backend-listed name. | Existing selection owner. | Yes |
| `autobyteus-server-ts/src/app-data-migrations/migrations/raw-trace-active-file-name-migration.ts` | App-data migrations | Migration definition | Required startup migration orchestration and summary. | One migration concern. | Yes |
| `autobyteus-server-ts/src/app-data-migrations/migrations/raw-trace-active-file-name-migration-files.ts` | App-data migrations | Migration helper | Candidate discovery, old-to-new active-file rename, import manifest key updates. | Keeps migration definition readable. | Yes |
| `autobyteus-server-ts/src/app-data-migrations/app-data-migration-registry.ts` | App-data migrations | Registry | Register new migration after raw-trace rotation layout migration. | Existing migration registry. | N/A |
| Tests under `autobyteus-ts/tests` and `autobyteus-server-ts/tests` | Tests | Durable coverage | Update expectations and add migration tests. | Existing suites by owner. | Yes |
| `autobyteus-server-ts/docs/modules/agent_memory.md`, `run_history.md`, maybe `self_evolution.md` | Docs | Durable docs | Update active raw filename while preserving work trace distinction. | Existing module docs. | N/A |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Active raw trace filenames | `memory-file-names.ts` | `autobyteus-ts` memory store | Already shared across low-level and server readers. | Yes | Yes | A dual old/new filename registry. |
| Migration old/new filename pair | Migration helper file | App-data migrations | Old filename should be migration-only. | Yes | Yes | A steady-state runtime fallback utility. |
| Import manifest key rewrite helper | Migration helper file | App-data migrations | Used only by migration candidate processing. | Yes | Yes | General Memory Sync compatibility layer. |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `RAW_TRACES_ACTIVE_MEMORY_FILE_NAME` | Yes | Yes | Low | Use one active filename constant; remove old constant/property. |
| `RawTraceArchiveSegmentEntry.file_name` | Yes | N/A | Low | Leave segment filenames unchanged. |
| `RawTraceFileSummary.fileName` | Yes | N/A | Low | It remains backend-listed file selector identity; value changes for active source. |
| `MemorySyncManifest.files[*].relativePath` | Yes | Yes | Medium | Migration updates imported manifest records from old relative path to new relative path where applicable. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/memory/store/memory-file-names.ts` | Memory store | Canonical filename owner | Export explicit active raw trace filename constant with value `raw_traces_active.jsonl`; remove old active-name export/property. | Existing filename owner. | N/A |
| `autobyteus-ts/src/memory/store/run-memory-file-store.ts` | Memory store | Run memory IO owner | Resolve active raw trace paths via explicit active constant. | Existing active IO owner. | Yes |
| `autobyteus-ts/src/memory/index.ts` | Memory store public export | Package export boundary | Export the new explicit active filename constant; remove old export if renamed. | Existing public export file. | Yes |
| `autobyteus-server-ts/src/agent-memory/store/memory-file-store.ts` | Agent-memory | Server read adapter | Read active raw traces from the new canonical active file. | Existing adapter. | Yes |
| `autobyteus-server-ts/src/agent-memory/services/memory-run-summary-builder.ts` | Agent-memory | Availability summary | Mark raw traces available based on new active file. | Existing summary owner. | Yes |
| `autobyteus-server-ts/src/agent-memory/services/raw-trace-file-source-service.ts` | Agent-memory | File-source selector | Return `raw_traces_active.jsonl` for active file summaries. | Existing selector owner. | Yes |
| `autobyteus-server-ts/src/app-data-migrations/migrations/raw-trace-active-file-name-migration.ts` | App-data migrations | Migration definition | Migration metadata, root orchestration, result summary. | One migration. | Yes |
| `autobyteus-server-ts/src/app-data-migrations/migrations/raw-trace-active-file-name-migration-files.ts` | App-data migrations | Migration mechanics | Discover candidates, rename old active files, update imported manifests. | Separates IO mechanics from definition. | Yes |
| `autobyteus-server-ts/src/app-data-migrations/app-data-migration-registry.ts` | App-data migrations | Registry | Register new migration in startup sequence. | Existing registry. | N/A |

## Ownership Boundaries

- Runtime writers must depend on `RunMemoryFileStore` for physical raw-trace persistence.
- Server readers must depend on `MemoryFileStore` / `RunMemoryFileStore` or higher services, not direct hardcoded paths.
- `RawTraceArchiveManager` remains the only owner of segment/manifest naming.
- `RawTraceActiveFileNameMigration` is the only code allowed to know both old and new active filenames.
- `SelfEvolutionWorkTraceStore` remains the only owner of `work_trace_active.md`.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `RunMemoryFileStore` | Active file path resolution and active rewrites. | `MemoryManager`, `RunMemoryWriter`, server read adapters. | Callers joining `runDir` with active filename directly outside store/summary/migration. | Add/adjust store method. |
| `RawTraceArchiveManager` | Segment path resolution and manifest policy. | `RunMemoryFileStore`, file-source service via store methods. | Callers constructing segment paths or interpreting pending entries directly. | Add/adjust archive manager/store method. |
| `RawTraceFileSourceService` | Listed file summaries and selected-file validation. | GraphQL memory-view resolvers, self-evolution source reader. | GraphQL resolver manually choosing active/segment file paths. | Extend file-source service. |
| `RawTraceActiveFileNameMigration` | Old filename handling and simple old-to-new rename policy. | App-data migration runner only. | Runtime readers checking both old/new filenames. | Improve migration coverage, not runtime fallback. |

## Dependency Rules

Allowed:

- Runtime writers/readers -> `RunMemoryFileStore` -> canonical active filename constant.
- Server memory services -> `MemoryFileStore` / `RunMemoryFileStore`.
- Raw trace file selection -> `RawTraceFileSourceService` -> store/archive owners.
- App-data migration -> old/new active filename constants or local migration-only constants.
- Tests/fixtures/docs -> literal file names where they verify/document the physical contract.

Forbidden:

- Runtime steady-state read fallback from `raw_traces_active.jsonl` to `raw_traces.jsonl`.
- Runtime steady-state write to both old and new active files.
- A shared `LEGACY_RAW_TRACES_MEMORY_FILE_NAME` exported for normal runtime use.
- Segment rename or manifest rename as part of this task.
- Work-trace active filename changes as part of this task.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `RunMemoryFileStore.getRawTracesPath()` | Active raw-trace file | Return canonical active file path. | `runDir` instance state | Should return `raw_traces_active.jsonl`. |
| `MemoryFileStore.readRawTracesActive(runId, limit?)` | Active raw traces for one run | Read active records only. | `runId` | No old-file fallback. |
| `MemoryFileStore.readRawTraceCorpus(runId, limit?)` | Complete raw-trace corpus for one run | Read complete segments plus active. | `runId` | Behavior unchanged except active filename. |
| `RawTraceFileSourceService.readSelectedFile(runId, requestedFileName?, limit?)` | Listed raw-trace file source | Validate backend-listed filename and read selected file. | `runId + listed fileName` | Active listed filename becomes `raw_traces_active.jsonl`. |
| GraphQL `getAgentRunMemoryView` | Agent run memory view | Return memory view and raw trace files/records. | `runId + flags + optional rawTraceFileName` | Existing invalid-selection fallback remains generic. |
| GraphQL `getTeamMemberRunMemoryView` | Team member run memory view | Return member memory view and raw trace files/records. | `teamRunId + memberRunId + flags + optional rawTraceFileName` | Existing identity unchanged. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `getRawTracesPath()` | Yes | Yes | Low | Update active filename. |
| `readRawTracesActive(runId)` | Yes | Yes | Low | No fallback. |
| `readRawTraceCorpus(runId)` | Yes | Yes | Low | Preserve segment+active merge. |
| `readSelectedFile(runId, fileName)` | Yes | Yes | Medium | Tests must assert old requested file name falls back to listed new active file, not read old path. |
| GraphQL memory-view queries | Yes | Yes | Low | Update expected file selector values. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Active raw trace file | `raw_traces_active.jsonl` | Yes | Low | Rename from `raw_traces.jsonl`. |
| Active filename constant | `RAW_TRACES_ACTIVE_MEMORY_FILE_NAME` | Yes | Low | Prefer explicit constant over old ambiguous name. |
| Segment files | `raw_traces_000001.jsonl` | Yes | Low | Leave unchanged. |
| Work trace active projection | `work_trace_active.md` | Yes | Low | Leave unchanged. |

## Applied Patterns (If Any)

- Repository/store boundary: `RunMemoryFileStore` continues to encapsulate physical file IO.
- Migration pattern: a required startup app-data migration owns one-time persisted data cleanup.
- Adapter/service boundary: `RawTraceFileSourceService` continues to adapt storage files into API-safe summaries.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/memory/store/memory-file-names.ts` | File | Shared memory filename owner | New active raw trace filename constant/value. | Existing shared filename source. | Legacy active filename export for runtime. |
| `autobyteus-ts/src/memory/store/run-memory-file-store.ts` | File | Run memory file store | Use active filename constant for active path. | Existing IO owner. | Old/new branch fallback. |
| `autobyteus-server-ts/src/app-data-migrations/migrations/` | Folder | App-data migrations | New raw trace active filename migration files. | Existing migration location. | Runtime read compatibility logic. |
| `autobyteus-server-ts/src/agent-memory/` | Folder | Agent-memory services | Update imports/expectations for new active file. | Existing read/view capability area. | Migration-only old filename handling. |
| `autobyteus-server-ts/docs/modules/` | Folder | Durable module docs | Update documented active runtime file. | Existing docs location. | Claiming `raw_traces_active.jsonl` is whole corpus. |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `autobyteus-ts/src/memory/store` | Persistence-Provider | Yes | Low | Existing low-level memory file owner. |
| `autobyteus-server-ts/src/agent-memory` | Main-Line Domain-Control / read service | Yes | Low | Existing server memory view capability. |
| `autobyteus-server-ts/src/app-data-migrations/migrations` | Off-Spine Concern | Yes | Low | Existing app-data migration subsystem. |
| `autobyteus-server-ts/src/memory-sync` | Off-Spine Concern | Yes | Low | No new runtime behavior; imported manifest update lives in migration. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Active file layout | `runDir/raw_traces_active.jsonl` + `runDir/raw_traces_manifest.json` + `runDir/raw_traces_000001.jsonl` | `runDir/raw_traces.jsonl` pretending to be complete corpus after segments exist | Makes active-vs-complete storage visible. |
| Runtime source path | `RunMemoryFileStore.getRawTracesPath() -> RAW_TRACES_ACTIVE_MEMORY_FILE_NAME` | `if exists(raw_traces_active) read it else read raw_traces` | Keeps source code clean and rejects compatibility fallback. |
| Migration behavior | old active file exists -> rename to new active file | Keep runtime fallback for the old file | Keeps the migration focused on the only expected current-data shape. |
| Work trace distinction | raw active source -> derived `work_trace_active.md` | Rename work trace files because raw trace file changed | Keeps derived self-evolution artifact contract separate. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Runtime dual-read `raw_traces_active.jsonl` then `raw_traces.jsonl` | Existing data currently uses old name. | Rejected | Startup data migration moves old file to new name. |
| Runtime dual-write old and new active files | Could keep older readers working. | Rejected | Only new canonical file is written. |
| Keep old exported constant as alias | Could reduce source churn. | Rejected | Rename to explicit active constant and update callers. |
| Accept old GraphQL `rawTraceFileName` as alias for active | Could preserve stored UI selection. | Rejected | Existing generic invalid-selection fallback selects the current backend-listed file and returns `selectedRawTraceFileName`. |
| Translate Memory Sync old incoming path to new path | Could support older source nodes. | Rejected | Upgraded nodes migrate their app data; no protocol compatibility shim in this task. |

## Derived Layering (If Useful)

- Shared storage layer: `autobyteus-ts/src/memory/store/*` owns physical active/segment paths and IO.
- Server read/application layer: `autobyteus-server-ts/src/agent-memory/*` shapes views and summaries from shared storage.
- Migration/off-spine layer: `autobyteus-server-ts/src/app-data-migrations/*` performs one-time old-name cleanup.
- Derived artifact layer: self-evolution work traces consume raw trace sources and write markdown projections.

## Migration / Refactor Sequence

1. Update shared filename owner:
   - Replace `RAW_TRACES_MEMORY_FILE_NAME = 'raw_traces.jsonl'` with explicit active constant/value, preferably `RAW_TRACES_ACTIVE_MEMORY_FILE_NAME = 'raw_traces_active.jsonl'`.
   - Update `MEMORY_FILE_NAMES` and exports to explicit active naming; remove old alias/property.
2. Update all live source imports/usages:
   - `RunMemoryFileStore`, server `MemoryFileStore`, summary builder, file-source service, and tests.
   - Ensure no runtime source references old active filename.
3. Add app-data migration:
   - Migration id: use a new dated id, e.g. `20260707_raw_trace_active_file_name`.
   - Register after `RawTraceRotationLayoutMigration` in `app-data-migration-registry.ts`.
   - Scan local roots: `<memoryDir>/agents` and `<memoryDir>/agent_teams`.
   - Scan imported roots when present: `<memoryDir>/imports/<sourceNodeId>/agents` and `<memoryDir>/imports/<sourceNodeId>/agent_teams`.
   - For each directory containing the old active file name:
     - old exists: rename old to new.
     - old absent: no action needed.
   - For imported roots, update that source's `sync-manifest.json` old path record to the new path after successful file handling; rewrite the manifest record to the new path.
4. Update durable coverage:
   - Shared store tests for active path/write/read.
   - Server memory file/source service tests for active summary filename and selected-file read.
   - Rotation/corpus tests ensuring segments remain unchanged and active marker stays in new active file.
   - Migration tests covering old-to-new rename, recursive team/import roots, imported manifest update, and absence of runtime old-file fallback.
   - Memory Sync fixture tests that previously used `raw_traces.jsonl`.
   - Self-evolution projection test asserting `work_trace_active.md` remains generated from active source.
5. Update docs:
   - `agent_memory.md` and `run_history.md` active file examples to `raw_traces_active.jsonl`.
   - Keep `self_evolution.md` work-trace names unchanged, optionally clarify raw active source distinction if touched.
6. Source hygiene check:
   - `rg -n 'raw_traces\.jsonl' autobyteus-ts/src autobyteus-server-ts/src ...` should show only migration/migration-test/historical-note contexts, not runtime read/write code.

## Key Tradeoffs

- Clean source model over compatibility: approved by user. Migration absorbs existing-data cost.
- Rename constant as well as value: more source churn, but better long-term clarity and no stale alias.
- Include imported corpora migration: more migration work, but avoids read-only memory explorer depending on old active filename.
- Do not rename segments: keeps rotation identity stable and avoids unnecessary manifest churn.

## Risks

- Memory Sync deployments not upgraded together may temporarily send/retain old-path files. This task intentionally does not add compatibility reads for that case.
- External consumers outside this monorepo that import old constant names may break; this is consistent with the no-backward-compatibility scope.
- A broad search/replace could accidentally alter historical done-ticket artifacts. Implementation should target source/tests/docs in current packages and migration artifacts, not old ticket history.

## Guidance For Implementation

- Keep old filename knowledge migration-only.
- Prefer explicit naming in source: `rawTracesActive`, `RAW_TRACES_ACTIVE_MEMORY_FILE_NAME`.
- Do not change raw trace payload schemas, `RawTraceItem`, segment naming, or compaction behavior.
- Do not create a new runtime helper that knows old and new names.
- Update tests before relying on broad source search; use targeted tests for migration and raw trace service behavior.
- Be careful with untracked/historical artifact folders: do not edit unrelated `tickets/done` or generated `electron-dist` outputs.
