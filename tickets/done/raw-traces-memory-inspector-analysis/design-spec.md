# Design Spec

## Current-State Read

The Memory Inspector currently renders four tabs from `autobyteus-web/components/memory/MemoryInspector.vue`: Working Context, Episodic, Semantic, and Raw Traces. The raw tab is lazy: `memoryInspectorStore.setActiveTab('raw')` flips `includeRawTraces=true` and refetches the GraphQL memory view. The store currently hardcodes `includeArchive:false`, so the backend returns only active `raw_traces.jsonl` records.

Backend memory view assembly lives in `autobyteus-server-ts/src/agent-memory/services/agent-memory-service.ts`. It supports two raw-trace read modes today:

- active-only: `MemoryFileStore.readRawTracesActive(runId)` -> active `raw_traces.jsonl`
- merged corpus: `MemoryFileStore.readRawTraceCorpus(runId)` -> complete rotated segments + active records, deduped/sorted by `RunMemoryFileStore.readCompleteRawTraceCorpusDicts()`

The backend does not expose a Memory Inspector API for "which raw trace files exist" or "read this raw trace file name only". Segment metadata already exists in `raw_traces_manifest.json` through `RunMemoryFileStore.readRawTraceArchiveManifest()` / `RawTraceArchiveManager`, and complete segment records live in `raw_traces_<zero-padded-index>.jsonl` files beside active `raw_traces.jsonl`.

A source-listing pattern exists in `autobyteus-server-ts/src/agent-memory/services/raw-trace-work-trace-source-reader.ts`, but it is self-evolution-oriented and returns `SelfEvolutionWorkTraceSource` values. Memory Inspector must not depend on self-evolution domain types for general memory UI behavior.

The storage filename family is documented and remains in scope as-is:

- `raw_traces.jsonl` — active append/current file
- `raw_traces_<zero-padded-index>.jsonl` — complete rotated segment files
- `raw_traces_manifest.json` — segment manifest

The user explicitly decided **not** to rename `raw_traces.jsonl` to `raw_traces_active.jsonl`.

## Intended Change

Add per-file raw-trace selection to the Memory Inspector Raw Traces tab.

Target UX:

- Raw Traces tab defaults to `raw_traces.jsonl` when it exists.
- A dropdown lists backend-discovered raw trace file names with counts:
  - `raw_traces.jsonl — 59 records`
  - `raw_traces_000003.jsonl — 767 records`
  - `raw_traces_000002.jsonl — 553 records`
  - `raw_traces_000001.jsonl — 411 records`
- Selecting a file name refetches and displays only that file's normalized trace records.
- The frontend never shows or sends absolute paths.
- The frontend sends only a file name that came from the backend list; backend validates it against active `raw_traces.jsonl` or complete manifest segment `file_name` entries before reading.
- `rawTraceLimit` remains visible and applies to the selected file.
- Existing merged-corpus behavior stays available for non-inspector callers that explicitly request archive inclusion.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change / Small Feature
- Current design issue found (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant plus Boundary Or Ownership Issue
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes, small targeted refactor
- Evidence:
  - `memoryInspectorStore.ts` asks for raw traces but always passes `includeArchive:false`, so segmented runs only display the active tail.
  - `AgentMemoryService` has active-only and merged-corpus modes but no per-file selector mode.
  - `RawTraceWorkTraceSourceReader` already duplicates file/segment listing behavior under a self-evolution-specific type, proving the capability exists but is not owned by a reusable agent-memory boundary.
- Design response:
  - Introduce an `agent-memory` raw trace file source service that owns raw trace file summaries, selected filename validation, and selected file reads.
  - Extend the memory view API/domain with raw trace file summaries, selected file name, and an optional selected raw trace file name argument.
  - Update the frontend store/component to use file names as the dropdown identity.
- Refactor rationale:
  - Memory Inspector must not start resolving file paths or reconstructing manifest policy in the frontend.
  - Memory Inspector also should not depend on self-evolution's work-trace projection reader. The reusable boundary belongs under `agent-memory` because raw trace source discovery is a memory storage concern.
- Intentional deferrals and residual risk, if any:
  - `All merged` dropdown option is deferred. Existing merged-corpus backend behavior remains for current non-inspector consumers.
  - Rich segment provenance display beyond file name/count/timestamps is deferred; the dropdown can expose only the simple file-oriented UX requested.

## Terminology

- Active raw trace file: `raw_traces.jsonl`, current append/current file.
- Rotated segment file: complete `raw_traces_<zero-padded-index>.jsonl` file referenced by `raw_traces_manifest.json`.
- Raw trace file summary: backend-safe UI-facing metadata for one raw trace file: file name, kind, record count, optional timestamps, and optional segment index.
- Selected raw trace file name: UI/API selector string, constrained to backend-listed raw trace file names only.

## Design Reading Order

1. data-flow spine
2. subsystem / capability-area allocation
3. draft file responsibilities -> extract reusable owned structures -> finalize file responsibilities
4. folder/path mapping

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: no storage filename migration or compatibility wrapper is introduced. Existing `raw_traces.jsonl` naming is retained as the target convention.
- Existing merged-corpus read behavior is not a legacy path; it remains an intentional API mode for non-inspector projection/recovery callers.
- Any duplicated raw-trace source discovery in self-evolution should be decommissioned in favor of the new `agent-memory` raw trace file service where practical in this change.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | User opens Raw Traces tab | Active file records rendered | Memory Inspector Store + AgentMemoryService | Preserves default active-file behavior while exposing file metadata. |
| DS-002 | Primary End-to-End | User selects a raw trace file name | Selected file records rendered | RawTraceFileSourceService + Memory Inspector Store | Core new behavior: per-file selection instead of active-only or merged-only display. |
| DS-003 | Bounded Local | Backend validates selected file name | Safe file records returned or default source selected | RawTraceFileSourceService | Prevents arbitrary path reads while still using simple file names. |
| DS-004 | Return/Event | GraphQL response returns source list and selected file | Store updates selected file/dropdown state | Memory View Resolver / Store | Keeps UI selected state aligned with backend default/fallback. |

## Primary Execution Spine(s)

- DS-001: `Raw Traces tab click -> memoryInspectorStore raw mode -> GraphQL memory view query -> AgentMemoryService -> RawTraceFileSourceService -> RawTracesTab`
- DS-002: `Raw trace file dropdown change -> memoryInspectorStore selectedRawTraceFileName -> GraphQL memory view query -> AgentMemoryService -> RawTraceFileSourceService selected-file read -> RawTracesTab`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | When the user opens Raw Traces, the store requests raw traces plus raw trace file metadata. The backend lists available files, chooses `raw_traces.jsonl` if present, reads that file, maps records to `MemoryTraceEvent`, and returns both records and file options. | Raw tab, memory view query, raw trace file service, trace list | Memory Inspector Store and AgentMemoryService | GraphQL conversion, localization labels, JSONL parsing |
| DS-002 | When the user selects a file name, the store sends that file name. The backend validates that the file name is active or a complete manifest segment, reads only that file, applies limit, and returns records. | Dropdown selection, selected file name, raw trace file service | RawTraceFileSourceService | Stale selection fallback, record count/timestamp metadata |
| DS-003 | The selected file name never becomes a path directly. The service matches exact file names against known active/manifest entries and delegates segment path resolution to the existing store/archive owner. | File name validator, RunMemoryFileStore, RawTraceArchiveManager | RawTraceFileSourceService / RunMemoryFileStore | Path traversal prevention, pending segment exclusion |
| DS-004 | Backend response includes `selectedRawTraceFileName`, so the frontend can update/reset local selected state after target changes or stale file fallback. | GraphQL response, store selected state | Memory Inspector Store | Request race handling already present through request id |

## Spine Actors / Main-Line Nodes

- `RawTracesTab`: renders file selector, limit input, and normalized trace rows.
- `memoryInspectorStore`: owns selected target, raw tab active state, selected raw trace file name, and fetch variables.
- GraphQL memory view queries/resolver: transport boundary for memory view and selected file request.
- `AgentMemoryService`: domain memory view assembler.
- `RawTraceFileSourceService` (new): owns raw trace file list, file-name validation/defaulting, selected-file reads.
- `RunMemoryFileStore` / `RawTraceArchiveManager`: storage owner for active file path, archive manifest, and segment path resolution.

## Ownership Map

- `RawTracesTab` owns presentation only. It must not decide which files exist or construct file paths.
- `memoryInspectorStore` owns UI request state and sends the selected backend-listed file name.
- GraphQL resolver is a thin transport boundary. It must not parse manifests or read files directly.
- `AgentMemoryService` owns assembling one coherent `AgentMemoryView`, including raw trace file summaries when requested.
- `RawTraceFileSourceService` owns raw trace file discovery, default selected file choice, file-name validation, selected-file read orchestration, and per-file limit application.
- `RunMemoryFileStore` / `RawTraceArchiveManager` own storage layout, manifest reading, complete-segment filtering helpers, and safe segment file resolution.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| GraphQL `getAgentRunMemoryView` / `getTeamMemberRunMemoryView` | `AgentMemoryService` | Public API for memory inspector/query consumers | Raw trace file path resolution, manifest policy |
| `MemoryFileStore` | `RunMemoryFileStore` / file-level readers | Server-side facade around memory root/run directory layout | Segment validation policy beyond delegating to raw trace storage owner |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Self-evolution-local raw trace source listing/path logic in `RawTraceWorkTraceSourceReader` | It duplicates generic raw-trace file source discovery under self-evolution types | New `RawTraceFileSourceService` under `agent-memory` | In This Change where practical | Keep self-evolution-specific projection/adaptation there, but move file listing/reading to shared service. |
| Memory Inspector hardcoded active-only raw trace request | It hides rotated segment files | Store selected file name + backend file summaries | In This Change | Replace `includeArchive:false` as the only raw behavior with explicit selected filename mode. |
| Proposed physical rename to `raw_traces_active.jsonl` | User rejected; storage convention remains valid | UI label `raw_traces.jsonl` with optional active hint | N/A | Do not implement. |

## Return Or Event Spine(s) (If Applicable)

- DS-004 return flow: `AgentMemoryService -> MemoryViewConverter -> GraphQL response -> memoryInspectorStore -> RawTracesTab props`.
- The store should update `selectedRawTraceFileName` from the backend's `selectedRawTraceFileName` after successful raw fetch. This handles backend defaulting and stale selection fallback without race-prone frontend inference.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `RawTraceFileSourceService`
- Chain: `List files -> validate requested fileName -> choose selected summary -> read selected file -> sort/apply limit -> return selected summary + records`
- Why it matters: it is the local safety and defaulting loop that keeps file-name UX simple without allowing arbitrary path reads.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| GraphQL type conversion | DS-001, DS-002, DS-004 | GraphQL resolver | Map domain file summaries and trace events to API objects | Transport schema shape differs from domain TypeScript types | Resolver becomes a domain owner if it builds summaries directly |
| Localization strings | DS-001, DS-002 | RawTracesTab | Labels for raw trace file selector and empty states | UI text must stay i18n-compliant | Hard-coded UI literals fail localization guard |
| Generated frontend GraphQL types | DS-001, DS-002 | Frontend query/store | Keep TS types aligned with schema/query changes | Prevents typed frontend drift | Runtime works but compile/codegen breaks later |
| Existing merged-corpus read | DS-001 | Projection/recovery callers | Keep active+complete corpus mode where explicitly requested | Non-inspector consumers still need complete chronological corpus | Inspector file selector accidentally breaks run history/recovery |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Segment manifest/filename ownership | `autobyteus-ts` memory store | Extend | `RawTraceArchiveManager` already owns segment resolution and complete/pending status | N/A |
| Memory view assembly | `agent-memory` service | Extend | `AgentMemoryService` already owns Memory Inspector backend view | N/A |
| File source listing | Self-evolution work trace reader | Create shared owner + adapt existing | Existing logic is in wrong domain and returns self-evolution-specific types | New owner belongs under `agent-memory` |
| UI tab display | `autobyteus-web/components/memory` | Extend | Existing `RawTracesTab` is the correct display component | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts` memory store | Low-level active file and complete segment reads | DS-003 | RawTraceFileSourceService | Extend | Add focused safe segment-read helper if needed; do not expose arbitrary path reads. |
| `autobyteus-server-ts/src/agent-memory` | Raw trace file summaries, selected file reads, memory view assembly | DS-001, DS-002, DS-003 | AgentMemoryService | Extend | New raw trace file source service lives here. |
| `autobyteus-server-ts/src/api/graphql` | Schema/query transport | DS-001, DS-002, DS-004 | MemoryViewResolver | Extend | Add file summary type and args. |
| `autobyteus-web` memory UI | Dropdown, selected file state, query variables | DS-001, DS-002, DS-004 | memoryInspectorStore / RawTracesTab | Extend | Keep UI simple; file names only. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-memory/services/raw-trace-file-source-service.ts` | Agent memory | Raw trace file source owner | List file summaries, choose selected file, validate file name, read selected file records | Single service around one subject: raw trace file sources | Domain `RawTraceFileSummary`, `MemoryTraceEvent` |
| `autobyteus-server-ts/src/agent-memory/domain/models.ts` | Agent memory | Domain model definitions | Add `RawTraceFileSummary` and selected filename fields on `AgentMemoryView` | Existing home for memory view domain shapes | N/A |
| `autobyteus-ts/src/memory/store/raw-trace-archive-manager.ts` | Memory store | Segment archive owner | Add safe complete-segment read by exact manifest file name if needed | Existing owner of private segment path resolver | Manifest segment entries |
| `autobyteus-ts/src/memory/store/run-memory-file-store.ts` | Memory store | Run memory file facade | Delegate safe segment read/list helpers | Existing server-facing facade for raw trace archive manager | Manifest segment entries |
| `autobyteus-server-ts/src/api/graphql/types/memory-view.ts` | GraphQL API | Memory view transport | Add GraphQL type/args/fields for raw trace files and selected filename | Existing schema entrypoint for memory view | Domain converter |
| `autobyteus-server-ts/src/api/graphql/converters/memory-view-converter.ts` | GraphQL API | Converter | Map domain file summaries | Existing converter | Domain/GraphQL shapes |
| `autobyteus-web/types/memory.ts` | Frontend memory types | UI data model | Add `RawTraceFileSummary`, `selectedRawTraceFileName` | Existing frontend memory view types | GraphQL query shape |
| `autobyteus-web/graphql/queries/memoryViewQueries.ts` | Frontend GraphQL | Query document | Add variables/fields for file selector | Existing memory view queries | Generated GraphQL types |
| `autobyteus-web/stores/memoryInspectorStore.ts` | Frontend state | Inspector request state | Track selected file name and request file summaries | Existing inspector state owner | Frontend memory types |
| `autobyteus-web/components/memory/RawTracesTab.vue` | Frontend UI | Raw trace tab renderer | Render dropdown and emit selected file name | Existing raw trace component | Frontend memory types |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Raw trace file summary (`fileName`, `kind`, counts, timestamps) | `agent-memory/domain/models.ts` or a focused `raw-trace-files.ts` if model file grows | Agent memory | Used by service, GraphQL converter, frontend query shape | Yes | Yes | A kitchen-sink manifest mirror with every boundary field |
| File-name validation and selected-file read | `raw-trace-file-source-service.ts` | Agent memory | Used by Memory Inspector and can back self-evolution adapter | Yes | Yes | Generic filesystem browser |
| Complete segment path resolution | Existing `RawTraceArchiveManager` | Memory store | Already owns manifest/segment filename rules | Yes | Yes | Public arbitrary path resolver |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `RawTraceFileSummary.fileName` | Yes | Yes | Low | This is both display identity and selector identity; no extra synthetic source id. |
| `RawTraceFileSummary.kind` | Yes | Yes | Low | Use only `active` / `segment`; do not encode active in filename. |
| `AgentMemoryView.selectedRawTraceFileName` | Yes | Yes | Low | Backend-selected effective file, not a requested/path field. |
| GraphQL `rawTraceFileName` arg | Yes | Yes | Medium | Document it as backend-listed file name only; validate server-side. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-memory/services/raw-trace-file-source-service.ts` | Agent memory | RawTraceFileSourceService | Safe list/read/default for raw trace files by file name | One cohesive domain service around file source selection | Domain models, RunMemoryFileStore |
| `autobyteus-server-ts/src/agent-memory/services/agent-memory-service.ts` | Agent memory | AgentMemoryService | Add `includeRawTraceFiles` / `rawTraceFileName` behavior while preserving existing active/corpus modes | Existing view assembler | RawTraceFileSourceService |
| `autobyteus-server-ts/src/agent-memory/domain/models.ts` | Agent memory | Memory domain models | Add raw trace file summary and view fields | Existing model home; split later only if size/pressure demands | N/A |
| `autobyteus-ts/src/memory/store/raw-trace-archive-manager.ts` | Memory store | RawTraceArchiveManager | Expose safe read by exact complete manifest `file_name` if service needs segment records | Existing private resolver owner | Manifest entry |
| `autobyteus-ts/src/memory/store/run-memory-file-store.ts` | Memory store | RunMemoryFileStore | Delegate safe segment read helper | Existing facade | RawTraceArchiveManager |
| `autobyteus-server-ts/src/api/graphql/types/memory-view.ts` | GraphQL API | MemoryViewResolver / API schema | Add `RawTraceFileSummary` object, args, fields | Existing transport boundary | Domain converter |
| `autobyteus-server-ts/src/api/graphql/converters/memory-view-converter.ts` | GraphQL API | MemoryViewConverter | Map file summaries/selected filename | Existing conversion owner | Domain/GraphQL types |
| `autobyteus-web/stores/memoryInspectorStore.ts` | Frontend memory | Memory inspector store | Selected file state, variables, refetch actions | Existing UI state owner | Frontend memory types |
| `autobyteus-web/components/memory/RawTracesTab.vue` | Frontend memory | Raw tab UI | Dropdown, labels, emit selected filename | Existing tab owner | Frontend memory types |
| `autobyteus-web/graphql/queries/memoryViewQueries.ts` | Frontend GraphQL | Query docs | Add raw trace file variable/fields | Existing query owner | Generated GraphQL |
| `autobyteus-web/types/memory.ts` | Frontend memory | Type declarations | Add file summary fields | Existing frontend domain type location | N/A |
| `autobyteus-web/localization/messages/*/memory.generated.ts` or source catalog if generation source exists | Frontend localization | Text catalog | Add selector labels/empty text if new visible strings are needed | Existing catalog area | N/A |

## Ownership Boundaries

- Frontend boundary: may display file names and send selected file names returned by backend. It must not infer segment file names by scanning patterns or build paths.
- GraphQL boundary: accepts a selected raw trace file name as an explicit memory-view selector. It must forward to `AgentMemoryService`, not read files.
- Agent memory boundary: owns selected file semantics and defaulting.
- Memory store boundary: owns raw-trace file layout and segment path safety.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `AgentMemoryService` | `RawTraceFileSourceService`, `MemoryFileStore` | GraphQL resolvers, projection callers | Resolver directly parsing manifest or reading segment files | Add explicit service options/return fields |
| `RawTraceFileSourceService` | `RunMemoryFileStore`, exact file-name validation | `AgentMemoryService`, self-evolution adapter | Frontend or resolver submitting/reading paths | Add summary/read methods by file name |
| `RawTraceArchiveManager` | Segment manifest and relative path resolution | `RunMemoryFileStore`, raw trace source service through facade | Reimplementing segment path resolution in server UI services | Add narrow safe store method |

## Dependency Rules

Allowed:

- `RawTracesTab` -> props/emits only.
- `memoryInspectorStore` -> GraphQL memory view queries.
- GraphQL resolver -> `AgentMemoryService`.
- `AgentMemoryService` -> `RawTraceFileSourceService` / `MemoryFileStore`.
- `RawTraceFileSourceService` -> `RunMemoryFileStore` and active JSONL read for the resolved run directory.
- Self-evolution work trace projection -> `RawTraceFileSourceService` through an adapter if refactored.

Forbidden:

- Frontend constructing raw trace paths, absolute paths, or segment filename patterns.
- GraphQL resolver reading raw trace files or manifest directly.
- Memory Inspector depending on self-evolution work trace domain types.
- Renaming physical `raw_traces.jsonl` in this ticket.
- Keeping duplicated manifest/segment path logic in multiple server services if a shared owner is introduced.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `getAgentRunMemoryView(... rawTraceFileName?: String, includeRawTraceFiles?: Boolean)` | Agent run memory view | Return memory view, raw file summaries, selected file records | `runId`, optional backend-listed `rawTraceFileName` | Preserve existing args for compatibility with current callers. |
| `getTeamMemberRunMemoryView(... rawTraceFileName?: String, includeRawTraceFiles?: Boolean)` | Team member run memory view | Same for member run | `teamRunId` + `memberRunId`, optional file name | Same semantics as agent run. |
| `AgentMemoryService.getRunMemoryView(runId, options)` | Run memory view | Assemble domain view | `runId`, options including `rawTraceFileName` | File name mode wins when file metadata/filename selector is requested. |
| `RawTraceFileSourceService.listFiles(runDir)` | Raw trace file sources | Return file summaries | run directory only | No external file name input. |
| `RawTraceFileSourceService.readFile(runDir, fileName, limit?)` | Selected raw trace file | Validate and read selected file | exact file name from list | No path input. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| GraphQL `rawTraceFileName` arg | Yes | Yes | Medium | Validate against backend-discovered file list; do not treat as path. |
| `includeArchive` existing arg | Yes | Yes | Low | Preserve for merged-corpus mode; Memory Inspector should use file-name mode. |
| `RawTraceFileSourceService.readFile` | Yes | Yes | Low | Exact active/manifest filename match only. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Raw trace file summary | `RawTraceFileSummary` | Yes | Low | Keep file-oriented; avoid `Source` if user-facing identity is file name. |
| Selected raw trace file name | `selectedRawTraceFileName` | Yes | Low | Use in both backend view and frontend store. |
| Raw trace file service | `RawTraceFileSourceService` or `RawTraceFileService` | Yes | Medium | Prefer `RawTraceFileSourceService` if it lists/read sources; prefer `RawTraceFileService` if implementation remains file-only. Do not call it helper. |

## Applied Patterns (If Any)

- Facade: `RunMemoryFileStore` remains the facade over active + archive segment storage.
- Adapter: self-evolution work trace reader, if refactored, becomes an adapter from generic raw trace file summaries/records to `SelfEvolutionWorkTraceSource`.
- Selector: frontend selected file name is a constrained selector, validated by the backend owner.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-memory/services/raw-trace-file-source-service.ts` | File | Agent memory raw trace file source owner | List file names/counts, select default/effective file, read selected file safely | Agent-memory service concern, not API or self-evolution | UI formatting beyond labels/counts; arbitrary path browsing |
| `autobyteus-server-ts/src/agent-memory/services/agent-memory-service.ts` | File | Memory view assembler | Integrate raw trace file summaries and selected records | Existing domain service | Manifest/path parsing |
| `autobyteus-ts/src/memory/store/raw-trace-archive-manager.ts` | File | Archive storage owner | Add narrow safe read by complete manifest filename | Existing private resolver owner | UI/domain labels |
| `autobyteus-ts/src/memory/store/run-memory-file-store.ts` | File | Store facade | Delegate segment read by file name | Existing facade used by server | GraphQL/UI concerns |
| `autobyteus-server-ts/src/api/graphql/types/memory-view.ts` | File | GraphQL schema/resolver | Add fields/args | Existing memory view schema | Domain logic |
| `autobyteus-web/components/memory/RawTracesTab.vue` | File | Raw trace UI | Dropdown and list rendering | Existing tab component | API fetching or path logic |
| `autobyteus-web/stores/memoryInspectorStore.ts` | File | Inspector UI state | Selected filename/refetch variables | Existing store | Rendering details |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-memory/services` | Main-Line Domain-Control | Yes | Low | Memory view and raw trace file service both belong to agent-memory domain service layer. |
| `autobyteus-ts/src/memory/store` | Persistence-Provider | Yes | Low | Owns file layout and segment path resolution. |
| `autobyteus-server-ts/src/api/graphql/types` | Transport | Yes | Low | Schema/resolver only. |
| `autobyteus-web/components/memory` | UI presentation | Yes | Low | Memory Inspector components already live here. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Dropdown values | `raw_traces.jsonl`, `raw_traces_000003.jsonl` | `/Users/normy/.autobyteus/.../raw_traces_000003.jsonl` | File names are enough for desktop UX; absolute paths are unnecessary and unsafe as selectors. |
| Selected-file read | `rawTraceFileName` -> backend exact-match validation -> read file | Frontend builds `raw_traces_${index}.jsonl` and asks backend to read path | Keeps file-family policy in backend/storage owner. |
| Active labeling | `raw_traces.jsonl — 59 records` or `raw_traces.jsonl (active) — 59 records` | Rename physical file to `raw_traces_active.jsonl` | Clarifies active without storage migration. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Rename `raw_traces.jsonl` but keep fallback reads from old name | User asked whether rename would be better | Rejected | Keep physical `raw_traces.jsonl`; label active in UI if needed. |
| Frontend path selector | Simple desktop implementation | Rejected | Backend-listed file names only; backend validates/resolves. |
| Use `includeArchive=true` and show merged corpus by default | Existing backend can already do it | Rejected for this UX | Per-file dropdown defaulting to active file. |
| Add synthetic `active` source id | Common source-selector shape | Rejected per user clarification | Use raw trace file name itself as selector/display identity. |

## Derived Layering (If Useful)

- UI layer: `RawTracesTab`, `memoryInspectorStore`, GraphQL query docs.
- Transport layer: GraphQL memory view types/resolver/converter.
- Domain service layer: `AgentMemoryService`, `RawTraceFileSourceService`.
- Persistence/store layer: `MemoryFileStore`, `RunMemoryFileStore`, `RawTraceArchiveManager`.

Higher layers must not bypass the domain/store boundaries to parse manifests or read file paths.

## Migration / Refactor Sequence

1. Add domain model fields:
   - `RawTraceFileSummary`
   - `AgentMemoryView.rawTraceFiles?: RawTraceFileSummary[] | null`
   - `AgentMemoryView.selectedRawTraceFileName?: string | null`
2. Add/extend storage helpers:
   - expose safe complete segment read by exact manifest `file_name` through `RawTraceArchiveManager` / `RunMemoryFileStore` if needed.
   - do not rename `RAW_TRACES_MEMORY_FILE_NAME`.
3. Add `RawTraceFileSourceService`:
   - list active file if present
   - list complete manifest segments only
   - default selected file to `raw_traces.jsonl` if present, otherwise newest complete segment
   - validate requested file name by exact match
   - read selected file, sort records consistently, apply limit
4. Update `AgentMemoryService` options:
   - add `includeRawTraceFiles?: boolean`
   - add `rawTraceFileName?: string | null`
   - when file mode is active, use `RawTraceFileSourceService`; preserve existing active-only/merged-corpus behavior for callers not using file mode.
5. Update GraphQL schema/resolver/converter:
   - add `RawTraceFileSummary` GraphQL type
   - add `includeRawTraceFiles` and `rawTraceFileName` args to agent and team member memory view queries
   - add `rawTraceFiles` and `selectedRawTraceFileName` fields on `AgentMemoryView`
6. Update frontend query/types/generated artifacts:
   - add query variables and returned fields
   - update generated GraphQL types if committed/generated workflow requires it
7. Update `memoryInspectorStore`:
   - state `selectedRawTraceFileName: string | null`
   - reset on target change/clear
   - fetch raw file summaries when raw tab is active
   - add `setRawTraceFileName(fileName: string)` action
   - store backend-returned `selectedRawTraceFileName`
8. Update `RawTracesTab` and `MemoryInspector` wiring:
   - props for file summaries and selected filename
   - dropdown emits selected filename
   - label displays file name and record count
9. Refactor self-evolution reader if practical:
   - replace duplicated list/read logic with new agent-memory raw trace file service and adapt to work-trace source output.
10. Add/update tests.

## Key Tradeoffs

- Per-file default vs merged-all default: per-file is simpler, cheaper, and makes segments visible; merged-all remains available but is not the first UI.
- File name as selector vs synthetic source id: file name matches user mental model and desktop context; backend validation keeps it safe.
- Keeping `raw_traces.jsonl` vs renaming: retaining storage convention avoids migration and keeps standard log-rotation shape.
- Adding `includeRawTraceFiles` vs always returning summaries: explicit flag avoids extra file/manifest reads for non-inspector callers.

## Risks

- Stale selected file after rotation/import update: backend should fall back to default selected file and return `selectedRawTraceFileName` so the store can realign.
- Large active files: existing `rawTraceLimit` still applies; record counts may require reading/counting active file. Implementation should avoid unnecessary repeated reads where easy.
- Generated GraphQL types can drift if codegen is not run after schema/query changes.
- Existing callers using `includeArchive:true` must keep merged-corpus behavior.

## Guidance For Implementation

- Do not rename `raw_traces.jsonl`.
- Do not expose absolute paths in GraphQL or frontend state.
- Treat `rawTraceFileName` as a selector, not a path. Exact-match only against backend-known names.
- Keep pending manifest entries out of `rawTraceFiles`.
- Order dropdown options as active first, then complete segments newest-to-oldest by segment index. If active is absent, default to newest segment.
- Labels can be frontend-composed from file name and count; no backend display name is required unless implementation prefers it.
- Suggested tests:
  - `AgentMemoryService` or new service unit: active-only file summary/read, segment summary/read, pending segment hidden, invalid filename fallback/no arbitrary read, limit applied per selected file.
  - GraphQL E2E: query returns rawTraceFiles and selected file; selecting `raw_traces_000001.jsonl` returns segment records only.
  - Frontend store: opening raw tab requests `includeRawTraceFiles:true`; selecting file sends `rawTraceFileName`; target change resets selected file.
  - `RawTracesTab`: dropdown labels include file names/counts and emits selected file name.
  - Existing run-history/local-memory projection tests: confirm merged-corpus callers still pass.
