# Design Spec

## Current-State Read

Self-evolution currently owns a work-trace projection that is broader than self-evolution:

```text
SelfEvolutionService.startFromEvolutionRequest
  -> SelfEvolutionWorkTraceProjectionService.ensureCurrent
  -> RawTraceWorkTraceSourceReader.listSources
  -> RawTraceFileSourceService.listFiles/readSource
  -> buildHistoricalReplayEvents
  -> SelfEvolutionWorkTraceRenderer.renderSource
  -> SelfEvolutionWorkTraceStore.writeTraceFile/writeManifest
  -> SelfEvolutionCompanionTriggerMessageBuilder sends manifest/root/file paths
```

Current ownership boundaries and coupling problems:

- `SelfEvolutionWorkTraceProjectionService` is the actual projection orchestrator: source discovery, archive cache reuse, rendering, store writes, manifest writes, and summary hash calculation.
- `SelfEvolutionWorkTraceStore` writes to `<memoryDir>/self_evolution/work_traces/`, so the derived cache location encodes self-evolution ownership even though raw traces are canonical and work traces are general readable projections.
- `SelfEvolutionWorkTraceRenderer` uses the shared `buildHistoricalReplayEvents` transformer, but its class name, imported source type, and Markdown heading are self-evolution-specific.
- `SelfEvolutionWorkTraceRedactor` is generic rendering hygiene but is self-evolution-named.
- `self-evolution/domain/work-traces.ts` defines general source/file/manifest/package DTOs but imports `SelfEvolutionTargetRef` and prefixes all type names with `SelfEvolution`.
- `agent-memory/services/raw-trace-work-trace-source-reader.ts` imports self-evolution domain/context types. This is the strongest boundary smell: a lower-level memory service depends on a feature-specific owner.
- Latest `origin/personal` changed the canonical active raw trace file to `raw_traces_active.jsonl` through `RAW_TRACES_ACTIVE_MEMORY_FILE_NAME`; `RawTraceFileSourceService` now reports the active source with that file name, and old `raw_traces.jsonl` is migration-only.
- `SelfEvolutionCompanionTriggerMessageBuilder` is already shaped correctly as a consumer: it sends paths to the companion, not full trace content. It should remain self-evolution-specific, but not own projection.

Constraints the target design must respect:

- Raw traces remain canonical. Work traces are derived and generated on demand.
- Output files must move to `<memoryDir>/work_traces/` with existing simple file names: `work_traces_manifest.json`, `work_trace_active.md`, and `work_trace_000000.md`-style archive files.
- Self-evolution behavior must remain functionally intact, including refreshed projection before each companion trigger and path-only companion prompts.
- The later memory compaction redesign must be able to import the shared projection directly without depending on self-evolution.
- The shared source reader must not hardcode raw trace physical filenames. It should stay behind `RawTraceFileSourceService` / `RunMemoryFileStore` so active-file naming remains owned by `agent-memory`/`autobyteus-ts` memory storage.
- No steady-state dual write/read path should preserve `<memoryDir>/self_evolution/work_traces/` as another authoritative cache.

## Intended Change

Create a shared `agent-work-traces` capability area in `autobyteus-server-ts` that owns Agent Work Trace Projection:

```text
Projection consumer
  -> AgentWorkTraceProjectionService.ensureCurrent({ target, memoryDir })
  -> AgentWorkTraceSourceReader
  -> RawTraceFileSourceService / MemoryFileStore
  -> AgentWorkTraceRenderer / buildHistoricalReplayEvents / AgentWorkTraceRedactor
  -> AgentWorkTraceStore
  -> AgentWorkTracePackage at <memoryDir>/work_traces/
```

Then migrate self-evolution from owner to consumer:

```text
SelfEvolutionService
  -> AgentWorkTraceProjectionService
  -> SelfEvolutionCompanionSessionService.buildTriggerRequest
  -> SelfEvolutionCompanionTriggerMessageBuilder
  -> companion prompt/metadata points at shared work-trace paths
```

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Refactor / shared capability extraction
- Current design issue found (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue; File Placement Or Responsibility Drift; Shared Structure Looseness
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes
- Evidence:
  - Current projection service/store/renderer/domain types are named and located under self-evolution while implementing generic raw-trace-to-readable-work-trace behavior.
  - Current disk location `<memoryDir>/self_evolution/work_traces/` makes a shared derived artifact appear feature-owned.
  - `agent-memory/services/raw-trace-work-trace-source-reader.ts` imports self-evolution domain/context types, proving mixed-level dependency.
  - Future memory compaction needs the same readable projection; without this refactor it would depend on self-evolution internals or duplicate projection policy.
- Design response:
  - Introduce a new shared `agent-work-traces` capability area with shared domain types, projection service, source reader, renderer, redactor, and store.
  - Move/write generated artifacts under `<memoryDir>/work_traces/`.
  - Update self-evolution to import only the shared service/package type and keep self-evolution-specific session/message behavior as consumer logic.
  - Remove obsolete self-evolution projection files and the old `agent-memory` work-trace source reader.
- Refactor rationale:
  - The capability's governing owner is Agent Work Trace Projection, not Self-Evolution.
  - The refactor is prerequisite work for memory compaction and prevents duplicated policy/coordination.
  - A clean-cut move is simpler and safer than wrappers/dual writes because work traces are derived from canonical raw traces.
- Intentional deferrals and residual risk, if any:
  - Memory compaction consumption is deferred to the later compaction ticket. Residual risk is only that the future compaction design may need extra projection metadata; this ticket should not pre-add compaction-specific fields.
  - Migration of old generated files under `<memoryDir>/self_evolution/work_traces/` is deferred/not needed because raw traces are canonical. Residual risk is an unknown external reader of old generated paths; no repository-local reader was found.

## Terminology

- `Subsystem` / `capability area`: a larger functional area that owns a broader category of work and may contain multiple files plus optional module groupings.
- `Module`: an optional intermediate grouping inside a subsystem when the codebase benefits from it. Do not use `module` as a synonym for one file or as the default ownership term.
- `Folder` / `directory`: a physical grouping used to organize files and any optional module groupings.
- `File`: one concrete source file and the primary unit where one concrete concern should land.
- `Agent Work Trace Projection`: the shared capability that derives readable Markdown work traces from canonical raw trace files.
- `Work trace`: derived readable Markdown; not canonical evidence.
- `Raw trace`: canonical runtime evidence stored by agent memory.

## Design Reading Order

Read and write this design from abstract to concrete:

1. data-flow spine
2. subsystem / capability-area allocation
3. draft file responsibilities -> extract reusable owned structures -> finalize file responsibilities
4. folder/path mapping

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove/decommission the self-evolution-owned work-trace domain and service files after the shared owner is introduced.
- Treat removal as first-class design work: the old generated cache path must not remain as a second projection source, fallback, or dual-write destination.
- Decision rule: the design is invalid if it depends on compatibility wrappers, dual-path behavior, or legacy fallback branches kept only for old behavior.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-WT-001 | Primary End-to-End | Projection consumer with `{ target, memoryDir }` | `AgentWorkTracePackage` persisted under `<memoryDir>/work_traces/` | `AgentWorkTraceProjectionService` | Main shared raw-trace-to-readable-work-trace path |
| DS-WT-002 | Primary End-to-End | `SelfEvolutionService.startFromEvolutionRequest` | Companion task message containing shared work-trace paths | `SelfEvolutionService` for self-evolution orchestration; `AgentWorkTraceProjectionService` for projection segment | Ensures self-evolution is a consumer, not the projection owner |
| DS-WT-003 | Bounded Local | Ordered raw trace sources | Manifest file list with reused unchanged archive files | `AgentWorkTraceProjectionService` | Archive cache/reuse behavior materially affects correctness and performance |
| DS-WT-004 | Bounded Local | Raw trace file source | `AgentWorkTraceSource` with fingerprint/timestamps | `AgentWorkTraceSourceReader` | Source normalization/fingerprinting must have one owner |

## Primary Execution Spine(s)

Shared projection spine:

```text
Projection Consumer -> AgentWorkTraceProjectionService -> AgentWorkTraceSourceReader -> RawTraceFileSourceService -> AgentWorkTraceRenderer -> AgentWorkTraceStore -> AgentWorkTracePackage
```

Self-evolution consumer spine:

```text
SelfEvolutionService -> AgentWorkTraceProjectionService -> SelfEvolutionCompanionSessionService -> SelfEvolutionCompanionTriggerMessageBuilder -> Companion Agent Message
```

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-WT-001 | A consumer asks for a current work-trace package for a target memory directory. The projection service inventories raw trace sources, renders any changed sources, writes files/manifest under the shared root, computes the summary hash, and returns a package. | Projection consumer, `AgentWorkTraceProjectionService`, `AgentWorkTraceSourceReader`, `RawTraceFileSourceService`, `AgentWorkTraceRenderer`, `AgentWorkTraceStore`, `AgentWorkTracePackage` | `AgentWorkTraceProjectionService` | Historical replay transformer, redactor, atomic file writes |
| DS-WT-002 | Self-evolution starts from a target request, resolves target context, calls the shared projection, then sends only manifest/root/file paths to the companion agent. Self-evolution owns the companion request, not projection. | `SelfEvolutionService`, `AgentWorkTraceProjectionService`, `SelfEvolutionCompanionSessionService`, `SelfEvolutionCompanionTriggerMessageBuilder`, Companion Agent Message | `SelfEvolutionService` for self-evolution; `AgentWorkTraceProjectionService` for projection | Skill target resolution, companion session state, direct message grant metadata |
| DS-WT-003 | Inside `ensureCurrent`, each source is compared against the existing manifest by `sourceId` and `sourceFingerprint`; unchanged archive segments reuse prior file metadata while active sources are always refreshed. | `AgentWorkTraceProjectionService`, existing manifest, ordered sources, file list | `AgentWorkTraceProjectionService` | Summary hash calculation |
| DS-WT-004 | The source reader resolves the run id from the target memory directory, asks the raw-trace file service for chronological archive/active sources, reads normalized records from canonical files such as `raw_traces_active.jsonl` and `raw_traces_000001.jsonl`, and produces source DTOs with fingerprints and timestamps. | `AgentWorkTraceSourceReader`, `RawTraceFileSourceService`, `MemoryFileStore`, `AgentWorkTraceSource` | `AgentWorkTraceSourceReader` | Raw trace record normalization owned by `RawTraceFileSourceService`/agent-memory |

## Spine Actors / Main-Line Nodes

- `Projection Consumer`: any feature that needs readable work traces; self-evolution now, memory compaction later.
- `SelfEvolutionService`: self-evolution orchestration owner.
- `AgentWorkTraceProjectionService`: shared projection owner and authoritative public boundary for work trace packages.
- `AgentWorkTraceSourceReader`: source inventory/translation owner for projection inputs.
- `RawTraceFileSourceService`: raw trace file listing/reading owner in `agent-memory`.
- `AgentWorkTraceRenderer`: Markdown rendering owner for one work trace source.
- `AgentWorkTraceStore`: filesystem layout/manifest/write owner for derived work traces.
- `SelfEvolutionCompanionSessionService`: companion lifecycle/request owner.
- `SelfEvolutionCompanionTriggerMessageBuilder`: self-evolution prompt/metadata owner.

## Ownership Map

| Node | Owns | Notes |
| --- | --- | --- |
| `Projection Consumer` | Demand for a work-trace package | Does not own source reading/rendering/store details |
| `SelfEvolutionService` | Self-evolution start sequence, target liveness, evidence summary assignment, companion trigger sequencing | It is a consumer of `AgentWorkTraceProjectionService`, not a projection owner |
| `AgentWorkTraceProjectionService` | On-demand projection lifecycle, manifest reuse policy, source-to-file loop, summary hash, package return contract | Authoritative public boundary for generated work trace packages |
| `AgentWorkTraceSourceReader` | Translation from target memory directory + raw trace files into `AgentWorkTraceSource[]` | Keeps projection source DTO construction out of `agent-memory` and self-evolution |
| `RawTraceFileSourceService` | Raw trace file discovery, active/archive file reads, normalized raw records, canonical active filename exposure (`raw_traces_active.jsonl`) | Existing `agent-memory` owner; should not import work-trace or self-evolution types |
| `AgentWorkTraceRenderer` | Markdown representation of one source using historical replay events | Encapsulates transformer/redactor use |
| `AgentWorkTraceRedactor` | Redaction/truncation of readable trace text | Rendering hygiene off-spine concern |
| `AgentWorkTraceStore` | `<memoryDir>/work_traces/` root, manifest path, file naming, atomic writes, timestamp formatting | Store path is shared, not consumer-specific |
| `SelfEvolutionCompanionSessionService` | Companion session activation/reuse, grant registration, session state update | Persists self-evolution state that points to shared paths |
| `SelfEvolutionCompanionTriggerMessageBuilder` | Self-evolution task prompt and metadata | May keep `self_evolution_*` metadata keys because they describe self-evolution state |

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `SelfEvolutionService.workTraceProjectionService` dependency accessor | `AgentWorkTraceProjectionService` | Convenience dependency access inside self-evolution orchestration | Projection source reading, rendering, storage, or old-path fallback |
| `RawTraceFileSourceService` as used by work traces | `AgentMemory` raw trace subsystem | Provides raw trace file inventory/read boundary | Work-trace source DTO policy or work-trace storage |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| `src/self-evolution/domain/work-traces.ts` | Domain DTOs are shared projection shapes, not self-evolution state | `src/agent-work-traces/domain/work-traces.ts` | In This Change | Update `evolver-session.ts` to import shared package type |
| `src/self-evolution/services/work-traces/self-evolution-work-trace-projection-service.ts` | Projection orchestration is shared | `src/agent-work-traces/services/agent-work-trace-projection-service.ts` | In This Change | No wrapper retaining old class as authoritative owner |
| `src/self-evolution/services/work-traces/self-evolution-work-trace-store.ts` | Store path and manifest are shared | `src/agent-work-traces/services/agent-work-trace-store.ts` | In This Change | New root is `<memoryDir>/work_traces/` |
| `src/self-evolution/services/work-traces/self-evolution-work-trace-renderer.ts` | Rendering is shared | `src/agent-work-traces/services/agent-work-trace-renderer.ts` | In This Change | Generalize Markdown heading |
| `src/self-evolution/services/work-traces/self-evolution-work-trace-redactor.ts` | Redaction is shared rendering hygiene | `src/agent-work-traces/services/agent-work-trace-redactor.ts` | In This Change | Preserve redaction semantics |
| `src/agent-memory/services/raw-trace-work-trace-source-reader.ts` | Work-trace source DTO construction should not live in agent-memory while depending on feature/shared projection types | `src/agent-work-traces/services/agent-work-trace-source-reader.ts` | In This Change | `agent-memory` keeps raw trace file service only |
| Old generated path `<memoryDir>/self_evolution/work_traces/` as a code target | Derived cache should be shared and regenerable | `<memoryDir>/work_traces/` | In This Change | Do not dual-write or read old cache as fallback |
| Projection test named under self-evolution as authoritative projection coverage | Projection owner becomes shared | `tests/agent-work-traces/agent-work-trace-projection-service.test.ts` | In This Change | Self-evolution tests remain for consumer behavior |

## Return Or Event Spine(s) (If Applicable)

No asynchronous return/event spine is introduced by this ticket. The relevant return value is synchronous/asynchronous method output from `AgentWorkTraceProjectionService.ensureCurrent`: an `AgentWorkTracePackage` whose manifest/file paths are then consumed by self-evolution.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `AgentWorkTraceProjectionService`
  - `Existing Manifest -> Existing Files By Source ID -> Ordered Raw Trace Sources -> Reused Archive File Or Re-rendered File -> New Manifest -> Summary Hash`
  - Why it matters: preserving unchanged archive reuse is an acceptance criterion and prevents needless rewrites while still refreshing active traces.

- Parent owner: `AgentWorkTraceSourceReader`
  - `Target Memory Directory -> Run ID / Raw Trace File Store -> Chronological Raw Trace Files -> Normalized Records -> Fingerprinted AgentWorkTraceSource[]`
  - Why it matters: this is the boundary where raw trace file details become projection-domain source DTOs.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| `buildHistoricalReplayEvents` transformer | DS-WT-001 | `AgentWorkTraceRenderer` | Convert raw trace records into replay events | Existing reusable normalization for messages/tools/compaction events | Duplicated rendering policy or renderer bypass |
| `AgentWorkTraceRedactor` | DS-WT-001 | `AgentWorkTraceRenderer` | Secret/backend-field redaction and visible length cap | Keeps readable trace safe and bounded | Renderer becomes mixed with regex policy, or consumers bypass redaction |
| Atomic file write helper | DS-WT-001 | `AgentWorkTraceStore` | Write trace/manifest via temp file then rename | Prevents partial derived files | Projection service becomes filesystem-detail owner |
| Summary hash calculation | DS-WT-001, DS-WT-003 | `AgentWorkTraceProjectionService` | Hash target + source fingerprints + record counts | Self-evolution uses evidence hash to record/run state | Session service would duplicate projection summary policy |
| Self-evolution session state `workTraces` | DS-WT-002 | `SelfEvolutionCompanionSessionService` | Remember last work trace paths/hash for self-evolution session | Consumer-specific state | Shared projection would become polluted with self-evolution lifecycle |
| Companion prompt metadata keys | DS-WT-002 | `SelfEvolutionCompanionTriggerMessageBuilder` | Build self-evolution task prompt/metadata | Consumer-specific communication | Shared projection would own prompt text, blocking future consumers |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Raw trace file discovery/read | `agent-memory` / `RawTraceFileSourceService` | Reuse | It already owns raw trace active/archive file listing, canonical active filename (`raw_traces_active.jsonl`), and normalization | N/A |
| Raw trace -> replay event conversion | `run-history/projection/transformers` | Reuse | It already converts messages, reasoning, tools, and compaction boundaries into replay events | N/A |
| Work trace projection owner | None as shared owner; current owner is self-evolution | Create New | The capability is reusable by self-evolution and future compaction and should not be owned by a consumer | `self-evolution` is a consumer; `agent-memory` owns canonical memory/raw trace files but not readable evidence-package projection semantics; `run-history` owns UI/replay projection, not per-run derived work-trace cache storage |
| Self-evolution companion prompt/session | `self-evolution` | Reuse/Modify | Prompt/session are consumer-specific and already correctly path-only | N/A |
| Durable projection coverage | Existing self-evolution projection test | Extend/Move | Coverage exists but is under old owner/path | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-work-traces` | Shared work-trace domain types, source reader, projection service, renderer, redactor, store | DS-WT-001, DS-WT-003, DS-WT-004 | `AgentWorkTraceProjectionService` | Create New | Top-level capability area makes future consumers import directly without self-evolution |
| `agent-memory` | Canonical raw trace file storage, raw trace file inventory/read, raw record normalization | DS-WT-001, DS-WT-004 | `RawTraceFileSourceService` | Reuse | Must not import `agent-work-traces` or self-evolution for projection DTOs |
| `run-history/projection` | Existing historical replay event transformation | DS-WT-001 | `AgentWorkTraceRenderer` | Reuse | Keep transformer as internal rendering dependency, not consumer API |
| `self-evolution` | Self-evolution request/session/prompt flow that consumes work trace package paths | DS-WT-002 | `SelfEvolutionService` | Modify | Imports shared projection service/package type only |
| `tests/agent-work-traces` | Shared projection durable unit coverage | DS-WT-001, DS-WT-003 | Shared projection behavior | Create New | Move/replace old self-evolution projection test |
| `tests/self-evolution` | Consumer integration/prompt/session coverage | DS-WT-002 | Self-evolution behavior | Modify | Assert shared paths are passed through |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `src/agent-work-traces/domain/work-traces.ts` | `agent-work-traces` | Shared domain boundary | `AgentWorkTraceTargetRef`, projection context, source/file/manifest/package types | One tight domain DTO file for the capability | Uses `MemoryTraceEvent` |
| `src/agent-work-traces/services/agent-work-trace-projection-service.ts` | `agent-work-traces` | `AgentWorkTraceProjectionService` | Public projection orchestration, cache reuse, summary hash, package return | One use-case owner for projection lifecycle | Uses domain types, source reader, renderer, store |
| `src/agent-work-traces/services/agent-work-trace-source-reader.ts` | `agent-work-traces` | `AgentWorkTraceSourceReader` | Convert raw trace files into projection sources | One boundary adapter from raw trace storage to work-trace domain | Uses `RawTraceFileSourceService` |
| `src/agent-work-traces/services/agent-work-trace-renderer.ts` | `agent-work-traces` | `AgentWorkTraceRenderer` | Render one source to readable Markdown | Rendering is one concrete concern | Uses historical replay transformer and redactor |
| `src/agent-work-traces/services/agent-work-trace-redactor.ts` | `agent-work-traces` | `AgentWorkTraceRedactor` | Redact/truncate visible text | Separate reusable rendering hygiene | No |
| `src/agent-work-traces/services/agent-work-trace-store.ts` | `agent-work-traces` | `AgentWorkTraceStore` | Shared disk layout, file naming, manifest reads/writes | Filesystem layout/write concern is separate from projection orchestration | Uses domain types |
| `src/self-evolution/services/self-evolution-service.ts` | `self-evolution` | `SelfEvolutionService` | Consume shared projection service before companion trigger | Existing orchestration owner remains | Uses `AgentWorkTraceProjectionService` |
| `src/self-evolution/domain/evolver-session.ts` | `self-evolution` | Self-evolution trigger request/session types | Type `workTracePackage` as shared package | Existing self-evolution domain file remains proper owner for session shapes | Uses `AgentWorkTracePackage` |
| `tests/agent-work-traces/agent-work-trace-projection-service.test.ts` | Tests | Shared projection coverage | Disk layout, manifest, rendering, archive reuse | Projection tests follow projection owner | Uses shared service |
| `tests/self-evolution/*.test.ts` | Tests | Self-evolution consumer coverage | Path-only prompt/session and orchestration with shared package | Consumer tests stay under self-evolution | Uses shared package-shaped mocks |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Work trace source/file/manifest/package DTOs | `src/agent-work-traces/domain/work-traces.ts` | `agent-work-traces` | Used by projection and consumers; future compaction should import same package | Yes: remove self-evolution prefixes and self-evolution target dependency | Yes: one shared source kind and package type | A self-evolution or compaction-specific DTO bag |
| Projection target identity | `AgentWorkTraceTargetRef` in shared domain | `agent-work-traces` | Manifest/package need target identity without importing self-evolution | Yes: do not import `SelfEvolutionTargetRef` | Yes: target shape mirrors subject explicitly (`agent_run` or `team_member_run`) | Generic ambiguous `targetKey` string |
| Source reading/fingerprinting | `AgentWorkTraceSourceReader` | `agent-work-traces` | Needed by projection as one source boundary | Yes: remove self-evolution context dependency | Yes: one fingerprint/source shape | A raw-trace storage owner or feature-specific helper |
| Work trace filenames/constants | `AgentWorkTraceStore` | `agent-work-traces` | Store owns common file names/root | Yes: no consumer-specific prefix | Yes: one root path | Dual self-evolution/shared layout policy |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `AgentWorkTraceTargetRef` | Yes | Yes | Low | Keep explicit union; do not use generic string target keys |
| `AgentWorkTraceProjectionContext` | Yes | Yes | Low | Keep minimal: `target` + `memoryDir`; self-evolution context can pass structurally but shared service must not depend on self-evolution fields |
| `AgentWorkTraceSource` | Yes | Yes | Low | Keep raw records/source path/fingerprint as projection input; no consumer-specific fields |
| `AgentWorkTraceFile` | Yes | Yes | Low | Keep manifest file metadata; source fingerprint is required for archive reuse |
| `AgentWorkTraceManifest` | Yes | Yes | Low | Persist target/root/path/files; no compaction-specific fields |
| `AgentWorkTracePackage` | Yes | Mostly | Medium | `workTraceRootPath`/`manifestPath` mirror manifest for consumer convenience; compute from manifest only and do not let them diverge |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-work-traces/domain/work-traces.ts` | `agent-work-traces` | Domain boundary | Shared work-trace target/context/source/file/manifest/package types | Tight capability DTOs in one domain file | `MemoryTraceEvent` |
| `autobyteus-server-ts/src/agent-work-traces/services/agent-work-trace-projection-service.ts` | `agent-work-traces` | `AgentWorkTraceProjectionService` | Authoritative `ensureCurrent` projection API; source loop; archive reuse; manifest write; summary hash | Main shared use-case owner | Domain types, source reader, renderer, store |
| `autobyteus-server-ts/src/agent-work-traces/services/agent-work-trace-source-reader.ts` | `agent-work-traces` | `AgentWorkTraceSourceReader` | Build `AgentWorkTraceSource[]` from chronological raw trace files | Adapter from raw trace owner to projection owner | `RawTraceFileSourceService`, `MemoryFileStore` |
| `autobyteus-server-ts/src/agent-work-traces/services/agent-work-trace-renderer.ts` | `agent-work-traces` | `AgentWorkTraceRenderer` | Render one source to shared Markdown work trace | Keeps rendering semantics together | `buildHistoricalReplayEvents`, redactor |
| `autobyteus-server-ts/src/agent-work-traces/services/agent-work-trace-redactor.ts` | `agent-work-traces` | `AgentWorkTraceRedactor` | Redact secrets/backend fields and cap visible text | Separate rendering hygiene | No |
| `autobyteus-server-ts/src/agent-work-traces/services/agent-work-trace-store.ts` | `agent-work-traces` | `AgentWorkTraceStore` | Shared root path `<memoryDir>/work_traces/`, file names, manifest read/write, atomic writes | One filesystem layout owner | Domain types |
| `autobyteus-server-ts/src/self-evolution/services/self-evolution-service.ts` | `self-evolution` | `SelfEvolutionService` | Depend on shared projection service | Existing self-evolution sequence stays coherent | `AgentWorkTraceProjectionService` |
| `autobyteus-server-ts/src/self-evolution/domain/evolver-session.ts` | `self-evolution` | Self-evolution trigger/session domain | Type `workTracePackage` as `AgentWorkTracePackage` | Keeps session semantics in self-evolution | Shared package type |
| `autobyteus-server-ts/src/self-evolution/services/companion/self-evolution-companion-trigger-message-builder.ts` | `self-evolution` | Prompt/metadata owner | Continue path-only prompt using shared package fields | No projection ownership changes needed | Existing trigger request type now references shared package |
| `autobyteus-server-ts/tests/agent-work-traces/agent-work-trace-projection-service.test.ts` | Tests | Shared projection coverage | Verify common disk layout, rendering, manifest, archive reuse | Durable coverage follows owner | Shared service |
| `autobyteus-server-ts/tests/self-evolution/self-evolution-companion-session-service.test.ts` | Tests | Self-evolution consumer coverage | Verify shared paths flow through prompt/session metadata | Existing consumer coverage | Shared package-shaped fixtures |
| `autobyteus-server-ts/tests/self-evolution/self-evolution-service.integration.test.ts` | Tests | Self-evolution orchestration coverage | Verify projection refresh before companion trigger with shared package type | Existing orchestration coverage | Shared package-shaped mocks |

## Ownership Boundaries

- `AgentWorkTraceProjectionService` is the authoritative public boundary for work-trace packages. Consumers must request a package from it rather than calling source reader, renderer, and store independently.
- `AgentWorkTraceStore` owns the shared disk layout. Consumers must not concatenate `<memoryDir>/work_traces/` paths themselves except in tests/fixtures that assert the contract.
- `AgentWorkTraceSourceReader` owns work-trace source DTO construction. `agent-memory` owns raw trace file listing/reading but not projection DTOs.
- `AgentWorkTraceRenderer` owns readable Markdown semantics. It may depend on `run-history`'s historical replay transformer, but consumers should not bypass renderer by calling the transformer for work trace files.
- `SelfEvolutionService` owns the self-evolution flow and remains a consumer. It can keep self-evolution-specific metadata/session keys, but those keys point to shared work trace paths.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `AgentWorkTraceProjectionService.ensureCurrent` | Source reader, renderer, store, manifest reuse, summary hash | Self-evolution now; future memory compaction later | Consumer calls `AgentWorkTraceStore` + `AgentWorkTraceRenderer` directly to build package | Add needed package options/fields to projection service/domain |
| `AgentWorkTraceStore` | Root path, file naming, manifest path, atomic writes | Projection service only | Self-evolution writes work trace files under its own path | Extend store through projection owner; do not consumer-write |
| `AgentWorkTraceSourceReader` | Run id resolution from memoryDir, chronological source listing, fingerprinting | Projection service only | `agent-memory` imports work-trace package types or self-evolution types | Keep source reader in `agent-work-traces`; reuse raw trace service only |
| `AgentWorkTraceRenderer` | Historical replay conversion and redaction | Projection service only | Consumer calls `buildHistoricalReplayEvents` and writes Markdown itself | Add renderer behavior behind projection service |
| `SelfEvolutionCompanionTriggerMessageBuilder` | Self-evolution prompt and metadata shape | Self-evolution companion session service | Shared projection imports self-evolution prompt builder | Keep consumer-specific prompt in self-evolution |

## Dependency Rules

Allowed production dependency directions:

- `self-evolution -> agent-work-traces`
- future `agent-execution/compaction` or compaction subsystem -> `agent-work-traces`
- `agent-work-traces -> agent-memory` for raw trace file services/models
- `agent-work-traces -> autobyteus-ts` only indirectly through existing memory services; if a direct filename import is ever needed, use `RAW_TRACES_ACTIVE_MEMORY_FILE_NAME` rather than string literals
- `agent-work-traces -> run-history/projection` for historical replay transformation
- `agent-memory -> autobyteus-ts` memory store primitives (existing)

Forbidden shortcuts:

- `agent-work-traces -> self-evolution`
- `agent-memory -> self-evolution`
- `agent-memory -> agent-work-traces` for projection DTOs/source policy
- self-evolution importing `AgentWorkTraceStore`, `AgentWorkTraceRenderer`, or `AgentWorkTraceSourceReader` directly in production
- future memory compaction importing any self-evolution work-trace file/type to get readable traces
- any new production write/read fallback to `<memoryDir>/self_evolution/work_traces/` for in-scope projection behavior
- any production fallback from active raw trace `raw_traces_active.jsonl` to old `raw_traces.jsonl`; old active filename handling belongs only to the completed app-data migration

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `AgentWorkTraceProjectionService.ensureCurrent(context)` | Work trace package for a target run memory directory | Produce/reuse current derived work trace files and manifest | `AgentWorkTraceProjectionContext` = `{ target: AgentWorkTraceTargetRef; memoryDir: string }` | Public shared boundary |
| `AgentWorkTraceSourceReader.listSources(context)` | Projection source list | Read chronological raw trace files through `RawTraceFileSourceService` and build source DTOs | Same projection context | Internal to projection service; should inherit `raw_traces_active.jsonl` from raw trace boundary, not hardcode it |
| `AgentWorkTraceStore.getWorkTraceRootPath(context)` | Work trace root path | Return `<memoryDir>/work_traces` | Same projection context | Internal/store boundary |
| `AgentWorkTraceStore.writeTraceFile({ context, source, content, generatedAt })` | One work trace file | Write active/archive Markdown file and return metadata | Context + source | Internal to projection service |
| `AgentWorkTraceStore.writeManifest({ context, files, generatedAt })` | Work trace manifest | Persist schemaVersion/target/root/path/files | Context + files | Internal to projection service |
| `AgentWorkTraceRenderer.renderSource(source)` | Markdown for one source | Render messages/tools/reasoning/compaction events | `AgentWorkTraceSource` | Internal to projection service |
| `SelfEvolutionCompanionSessionService.buildTriggerRequest(input)` | Self-evolution trigger request | Carry shared workTracePackage to prompt builder | Self-evolution target + `AgentWorkTracePackage` | Consumer boundary |

Rule:
- Do not use one generic boundary when the subject or identity meaning differs.
- Split boundaries by subject or require an explicit compound identity shape.

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `AgentWorkTraceProjectionService.ensureCurrent` | Yes | Yes | Low | Keep context explicit; do not accept generic `any` self-evolution context as named API |
| `AgentWorkTraceSourceReader.listSources` | Yes | Yes | Low | Keep internal and context-specific |
| `AgentWorkTraceStore.*` | Yes | Yes | Low | Keep store behind projection service |
| `SelfEvolutionCompanionSessionService.buildTriggerRequest` | Yes | Yes | Low | Import shared package type but keep self-evolution request shape |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Shared projection service | Proposed `AgentWorkTraceProjectionService` | Yes | Low | Use consistently in imports/tests |
| Shared source reader | Proposed `AgentWorkTraceSourceReader` | Yes | Low | Avoid old `RawTraceWorkTraceSourceReader` under `agent-memory` |
| Shared renderer | Proposed `AgentWorkTraceRenderer` | Yes | Low | Markdown title should say `Agent Work Trace`, not `Self-Evolution Work Trace` |
| Shared store | Proposed `AgentWorkTraceStore` | Yes | Low | Store path must be shared |
| Shared package type | Proposed `AgentWorkTracePackage` | Yes | Low | Replace `SelfEvolutionWorkTracePackage` imports |
| Self-evolution metadata keys | Existing `self_evolution_work_trace_*` | Yes for self-evolution state | Low | Keep only in prompt/session metadata; not in shared package/domain |

## Applied Patterns (If Any)

- **Adapter**: `AgentWorkTraceSourceReader` adapts raw trace file sources into projection-domain sources.
- **Repository/store-like boundary**: `AgentWorkTraceStore` owns filesystem persistence for derived work trace artifacts. It should not own projection orchestration or rendering.
- **Strategy/transformer reuse**: `AgentWorkTraceRenderer` reuses existing raw-trace-to-historical-replay transformer rather than duplicating event normalization.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-work-traces/` | Folder | Agent Work Trace Projection capability | Shared derived work-trace projection subsystem | Top-level shared capability area readable by self-evolution and future compaction | Self-evolution prompt/session behavior; compaction-specific result contracts |
| `autobyteus-server-ts/src/agent-work-traces/domain/` | Folder | Work-trace domain | Shared DTOs/types | Mirrors existing capability-area domain/service organization | Feature-specific DTOs |
| `autobyteus-server-ts/src/agent-work-traces/domain/work-traces.ts` | File | Work-trace domain boundary | Target/context/source/file/manifest/package types | One tight type file | `SelfEvolution*` names; compaction-specific fields |
| `autobyteus-server-ts/src/agent-work-traces/services/` | Folder | Work-trace services | Projection/source/render/store services | Established codebase pattern for capability services | Mixed self-evolution orchestration |
| `autobyteus-server-ts/src/agent-work-traces/services/agent-work-trace-projection-service.ts` | File | Projection service | Public shared `ensureCurrent` API | Governing use-case owner | Filesystem low-level write code beyond delegating to store |
| `autobyteus-server-ts/src/agent-work-traces/services/agent-work-trace-source-reader.ts` | File | Source reader | Raw trace file -> work trace source DTOs | Adapter belongs with projection domain | Raw trace storage ownership beyond service calls |
| `autobyteus-server-ts/src/agent-work-traces/services/agent-work-trace-renderer.ts` | File | Renderer | Source -> Markdown | Rendering concern | Store path/manifest logic |
| `autobyteus-server-ts/src/agent-work-traces/services/agent-work-trace-redactor.ts` | File | Redactor | Redaction/truncation | Separate rendering hygiene | Projection orchestration |
| `autobyteus-server-ts/src/agent-work-traces/services/agent-work-trace-store.ts` | File | Store | `<memoryDir>/work_traces` layout and writes | Filesystem concern | Consumer-specific root paths |
| `autobyteus-server-ts/src/self-evolution/services/self-evolution-service.ts` | File | Self-evolution orchestration | Import/use shared projection service | Consumer remains in self-evolution | Projection internals |
| `autobyteus-server-ts/src/self-evolution/domain/evolver-session.ts` | File | Self-evolution session domain | Import shared package type for trigger request | Session shape remains self-evolution-owned | Shared projection DTO definitions |
| `autobyteus-server-ts/src/self-evolution/services/companion/self-evolution-companion-trigger-message-builder.ts` | File | Self-evolution prompt builder | Continue path-only prompt | Consumer-specific behavior stays here | Projection generation |
| `autobyteus-server-ts/tests/agent-work-traces/` | Folder | Shared projection tests | Projection behavior coverage | Test placement follows shared owner | Self-evolution companion assertions except through package fixture |
| `autobyteus-server-ts/tests/self-evolution/` | Folder | Self-evolution tests | Consumer integration/prompt/session coverage | Existing feature coverage | Authoritative projection tests |

Rules:
- If the design has meaningful structural depth, usually reflect it in folders rather than flattening everything into one mixed directory.
- Do not place transport entrypoints, main-line domain/control nodes, persistence, adapters, and unrelated off-spine concerns in one flat folder when that hides ownership or structural depth.
- A compact layout is acceptable when it remains easy to read for the scope. If you keep it flatter, state why that is the clearer tradeoff.
- Folder boundaries should make ownership and structural depth easier to read, not hide them.
- Shared-layer, feature-oriented, runtime-oriented, and hybrid projections can all be valid when they make the intended ownership and flow easier to understand.

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `src/agent-work-traces/domain` | Main-Line Domain-Control | Yes | Low | Domain types are shared projection structures |
| `src/agent-work-traces/services` | Mixed Justified | Yes | Medium | Small subsystem uses service files for projection/source/render/store; responsibilities are separated by file names and concrete owners |
| `src/agent-memory/services` | Persistence-Provider / raw trace source | Yes | Low after removal | Remove work-trace source reader so folder no longer imports feature/shared projection DTOs |
| `src/self-evolution/services` | Main-Line Domain-Control for self-evolution | Yes after removal | Low | Remove `work-traces/` projection services; self-evolution keeps consumer orchestration |
| `tests/agent-work-traces` | Test owner for shared projection | Yes | Low | New tests follow capability owner |
| `tests/self-evolution` | Test owner for self-evolution consumer behavior | Yes | Low | Keep prompt/session/orchestration tests here |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Shared projection call | `SelfEvolutionService -> AgentWorkTraceProjectionService.ensureCurrent(context) -> shared package` | `SelfEvolutionService -> SelfEvolutionWorkTraceProjectionService -> old self_evolution path` | Shows self-evolution as consumer, not owner |
| Active raw trace source | `AgentWorkTraceSourceReader -> RawTraceFileSourceService -> raw_traces_active.jsonl` | `AgentWorkTraceSourceReader -> path.join(memoryDir, "raw_traces.jsonl")` | Keeps active raw trace naming owned by memory storage and avoids reviving old filename fallback |
| Future compaction call | `CompactionEvidencePackageBuilder -> AgentWorkTraceProjectionService.ensureCurrent({ target, memoryDir })` | `CompactionEvidencePackageBuilder -> SelfEvolutionWorkTraceRenderer` | Prevents future compaction from depending on self-evolution internals |
| Disk layout | `<memoryDir>/work_traces/work_traces_manifest.json` | `<memoryDir>/self_evolution/work_traces/work_traces_manifest.json` plus `<memoryDir>/work_traces/...` dual writes | Work traces are shared derived artifacts, not feature-private cache |
| Boundary bypass | Consumer receives `AgentWorkTracePackage` with `manifestPath`, `workTraceRootPath`, and files | Consumer directly instantiates `AgentWorkTraceStore` and `AgentWorkTraceRenderer` | Enforces Authoritative Boundary Rule for projection |
| Type shape | `AgentWorkTraceProjectionContext = { target, memoryDir }` | `ensureCurrent(selfEvolutionContext)` as the named shared API | Shared API should not expose feature-specific context even if structural typing allows passing it |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep `SelfEvolutionWorkTraceProjectionService` wrapper that delegates to shared service | Could reduce import churn | Rejected | Update imports to `AgentWorkTraceProjectionService`; remove old file |
| Dual-write to `<memoryDir>/self_evolution/work_traces/` and `<memoryDir>/work_traces/` | Could preserve old generated cache readers | Rejected | Write only `<memoryDir>/work_traces/`; raw traces regenerate derived work traces |
| Read old self-evolution manifest as fallback for archive reuse | Could preserve generatedAt for old archived projections | Rejected | Start shared manifest cache fresh; unchanged archive reuse applies after first shared projection |
| Keep `SelfEvolutionWorkTracePackage` type alias in self-evolution domain | Could reduce type update scope | Rejected | Import `AgentWorkTracePackage` from shared domain in self-evolution request/session types |
| Add compaction-specific fields now | Could anticipate next ticket | Rejected | Keep shared projection purpose-neutral; compaction package fields belong to future compaction design |

Hard block:
- Any design that depends on backward-compatibility wrappers, dual-path behavior, or retained legacy flow for in-scope replaced behavior fails review.

## Derived Layering (If Useful)

Derived dependency layering for this scope:

```text
self-evolution (consumer)
future compaction (consumer, later)
  -> agent-work-traces (shared projection owner)
      -> agent-memory (canonical raw trace file access)
      -> run-history/projection (historical replay event transformation)
      -> node fs/path/crypto
```

This layering is derived from ownership. It must not be inverted by having `agent-memory` import work-trace projection DTOs or having `agent-work-traces` import self-evolution.

## Migration / Refactor Sequence

1. Add `src/agent-work-traces/domain/work-traces.ts` with shared names:
   - `AgentWorkTraceTargetRef`
   - `AgentWorkTraceProjectionContext`
   - `AgentWorkTraceSourceKind`
   - `AgentWorkTraceSource`
   - `AgentWorkTraceFile`
   - `AgentWorkTraceManifest`
   - `AgentWorkTracePackage`
2. Move/rename current projection implementation into shared services:
   - `SelfEvolutionWorkTraceProjectionService` -> `AgentWorkTraceProjectionService`
   - `SelfEvolutionWorkTraceStore` -> `AgentWorkTraceStore`
   - `SelfEvolutionWorkTraceRenderer` -> `AgentWorkTraceRenderer`
   - `SelfEvolutionWorkTraceRedactor` -> `AgentWorkTraceRedactor`
   - `RawTraceWorkTraceSourceReader` -> `AgentWorkTraceSourceReader`
3. Change `AgentWorkTraceStore.getWorkTraceRootPath` to `path.join(context.memoryDir, "work_traces")`.
4. Generalize renderer title from `Self-Evolution Work Trace` to `Agent Work Trace` or equivalent shared wording while preserving event rendering semantics.
5. Update shared imports/types throughout moved files; ensure `agent-work-traces` imports `RawTraceFileSourceService` but no self-evolution files.
6. Update `SelfEvolutionService` to import/use `AgentWorkTraceProjectionService` in deps and accessor.
7. Update `self-evolution/domain/evolver-session.ts` to type `workTracePackage` as `AgentWorkTracePackage`.
8. Leave `SelfEvolutionCompanionTriggerMessageBuilder` behavior path-only; update only as needed through changed shared package type.
9. Remove obsolete self-evolution work-trace service/domain files and old `agent-memory/services/raw-trace-work-trace-source-reader.ts`.
10. Move/update projection tests to `tests/agent-work-traces/agent-work-trace-projection-service.test.ts`:
    - use `raw_traces_active.jsonl` for active raw trace fixtures on the latest base;
    - assert `<memoryDir>/work_traces/` root;
    - assert manifest path/file metadata;
    - assert readable rendering and redaction;
    - assert archived+active backfill and unchanged archive reuse.
11. Update self-evolution tests/fixtures to use shared paths and shared package type while preserving path-only prompt/session assertions.
12. Run focused tests and typecheck after dependency setup:
    - `pnpm exec vitest run tests/agent-work-traces/agent-work-trace-projection-service.test.ts tests/self-evolution/self-evolution-companion-session-service.test.ts tests/self-evolution/self-evolution-service.integration.test.ts`
    - `pnpm run typecheck` from `autobyteus-server-ts` if practical in implementation stage.
13. Use `rg` to confirm no production references remain to old self-evolution work-trace owner files/types and no production write target to `self_evolution/work_traces` remains.
14. Use targeted search to confirm this ticket does not reintroduce live `raw_traces.jsonl` reads/writes outside the already-completed migration/historical-note contexts.

## Key Tradeoffs

- **New top-level `agent-work-traces` vs placing under `agent-memory`**: A top-level capability makes the shared projection obvious to self-evolution and future compaction while keeping `agent-memory` focused on canonical memory/raw trace storage. It is a small new subsystem, but it avoids feature ownership drift and low-level memory importing projection DTOs.
- **Clean-cut cache path vs migration/dual path**: Clean-cut path may leave stale old generated files on disk, but raw traces are canonical and projection is on demand. Dual writes would preserve a misleading old boundary.
- **Keep package convenience mirrors**: `AgentWorkTracePackage` can keep `workTraceRootPath` and `manifestPath` alongside `manifest` to preserve consumer ergonomics. The implementation must compute these from the manifest/store and not allow divergent values.
- **Do not add compaction fields now**: This keeps the shared projection purpose-neutral; future compaction evidence/result metadata belongs in the compaction ticket.

## Risks

- External consumers outside the searched repository could read the old generated self-evolution path. No repository evidence was found, and raw traces can regenerate work traces, so the design rejects dual paths.
- Dependency/test setup is absent in the worktree; implementation validation must handle Node dependencies before executing tests.
- The move touches several imports/tests. Implementation should prefer move/rename with targeted updates rather than rewriting rendering logic.
- If future compaction needs additional metadata, adding it later may require manifest schema evolution. Do not pre-optimize in this ticket.

## Guidance For Implementation

- Preserve current rendering semantics unless a concrete bug is discovered; this ticket is about ownership/path extraction, not rendering redesign.
- Preserve latest-base raw trace active filename semantics: active source fixtures and any low-level reads should use `raw_traces_active.jsonl` through the existing raw trace file boundary, not old `raw_traces.jsonl`.
- Keep `AgentWorkTraceProjectionService` as the only production entrypoint consumers use for packages.
- Keep old work-trace files out of self-evolution after migration; no wrappers, fallback reads, or dual writes.
- Keep self-evolution prompt metadata path-only. It is okay for metadata keys to remain `self_evolution_*` because they describe self-evolution messaging/session state, not shared projection ownership.
- Update tests as durable coverage rather than only changing production code.
- After implementation, run targeted tests/typecheck from `autobyteus-server-ts` once dependencies are available, and record any setup blockers in the implementation handoff.
