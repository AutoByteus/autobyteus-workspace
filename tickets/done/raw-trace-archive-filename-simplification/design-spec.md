# Design Spec

## Current-State Read

Raw trace archive segment creation is already centralized behind `RawTraceArchiveManager` in `autobyteus-ts/src/memory/store/raw-trace-archive-manager.ts`.

Current archive layout:

```text
<memoryDir>/
  raw_traces.jsonl
  raw_traces_archive_manifest.json
  raw_traces_archive/
    000001_20260430T103015123Z_deadbeef.jsonl
```

Current writer paths:

- AutoByteus/native compaction: `WorkingContextCompactor` / `Compactor` -> `MemoryStore.pruneRawTracesById(..., true)` -> `RunMemoryFileStore.pruneRawTracesById` -> `RawTraceArchiveManager.archiveRecords`.
- Codex provider compaction: Codex event converter emits `COMPACTION_STATUS` provider boundary -> memory recorder rotates active traces -> `RawTraceArchiveManager.archiveRecords`.
- Claude Agent SDK provider compaction: `status/compacting` writes a non-rotating marker; `compactBoundary` emits a rotating provider boundary -> memory recorder rotates active traces -> `RawTraceArchiveManager.archiveRecords`.

The boundary hash suffix is only produced by `RawTraceArchiveManager.buildArchiveSegmentFileName(index, date, boundaryKey)`. It is not used for archive reads, deduplication, ordering, replay protection, or full-history reconstruction. The manifest stores the exact `file_name` and full `boundary_key`; all reads open `manifest.segments[].file_name` directly.

## Intended Change

Change newly created raw trace archive segment filenames from:

```text
<zero-padded-index>_<utcTimestamp>_<boundaryHash>.jsonl
```

to:

```text
<zero-padded-index>_<utcTimestamp>.jsonl
```

This applies to every runtime because every runtime archive writer uses the same `RawTraceArchiveManager` for segment file creation:

- AutoByteus/native compaction
- Codex provider compaction boundaries
- Claude Agent SDK compact boundaries

Do not alter archive directory names, manifest schema, boundary keys, archive read APIs, or compaction rotation behavior.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Cleanup / behavior simplification
- Current design issue found (`Yes`/`No`/`Unclear`): No
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): No Design Issue Found
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): No
- Evidence: `RawTraceArchiveManager` already owns segment filenames and manifest IO. `RunMemoryFileStore` and server runtime recorders delegate archive file creation to that owner. Idempotency uses manifest `boundary_key`, not filename hash. Reads use manifest `file_name`, not computed names.
- Design response: Keep the existing owner and narrow the private filename builder to remove boundary-hash participation.
- Refactor rationale: No broader refactor is needed; changing callers would violate the existing healthy archive boundary.
- Intentional deferrals and residual risk, if any: No migration of existing hash-suffixed archive files. Existing manifests remain readable because reads use stored `file_name` verbatim.

## Terminology

- Archive segment: one JSONL file under `raw_traces_archive/` containing raw traces moved out of active `raw_traces.jsonl` during native compaction or provider boundary rotation.
- Archive manifest: `raw_traces_archive_manifest.json`, the authoritative index that records segment file names and boundary metadata.
- Boundary key: the full runtime/native compaction identity used for idempotency and manifest metadata. It remains unchanged.

## Design Reading Order

1. Shared archive creation spine.
2. `RawTraceArchiveManager` ownership.
3. Filename-builder cleanup.
4. Focused test updates.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove hash suffix generation for newly created archive segment filenames.
- Existing archived files are not a maintained compatibility path; they remain readable naturally because manifest entries already store exact file names. No dual-path filename parsing or migration code should be added.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | AutoByteus/native compaction request to archive selected raw traces | New simplified archive segment file and manifest entry | `RawTraceArchiveManager` through `RunMemoryFileStore` | Proves the cleanup applies to native compaction. |
| DS-002 | Primary End-to-End | Codex compaction boundary event | New simplified archive segment file and manifest entry | `RawTraceArchiveManager` through provider boundary recorder | Proves the cleanup applies to Codex without changing converter logic. |
| DS-003 | Primary End-to-End | Claude Agent SDK compact boundary event | New simplified archive segment file and manifest entry | `RawTraceArchiveManager` through provider boundary recorder | Proves the cleanup applies to Claude compact boundaries while status markers remain non-rotating. |
| DS-004 | Return-Event | Archive/full-corpus read | Raw trace records returned from archive plus active store | `RunMemoryFileStore` / `RawTraceArchiveManager` | Verifies old and new file names remain readable via manifest. |

## Primary Execution Spine(s)

- DS-001: AutoByteus compactor -> `MemoryStore.pruneRawTracesById` -> `RunMemoryFileStore.pruneRawTracesById` -> `RawTraceArchiveManager.archiveRecords` -> simplified archive segment file + manifest entry.
- DS-002: Codex event converter -> `COMPACTION_STATUS` provider boundary -> `ProviderCompactionBoundaryRecorder` -> `RunMemoryFileStore.rotateActiveRawTracesBeforeBoundary` -> `RawTraceArchiveManager.archiveRecords` -> simplified archive segment file + manifest entry.
- DS-003: Claude session converter `compactBoundary` -> `COMPACTION_STATUS` provider boundary -> `ProviderCompactionBoundaryRecorder` -> `RunMemoryFileStore.rotateActiveRawTracesBeforeBoundary` -> `RawTraceArchiveManager.archiveRecords` -> simplified archive segment file + manifest entry.

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | Native compaction chooses raw trace IDs to archive; the file store delegates archive mechanics to the archive manager; the archive manager creates one new segment file and manifest entry. | Compactor, file store, archive manager | `RawTraceArchiveManager` for file naming and segment IO | Native boundary-key construction remains in `RunMemoryFileStore`. |
| DS-002 | Codex compact events are normalized as provider boundaries; when rotation eligible, active traces before the marker are archived through the same archive manager. | Codex converter, boundary recorder, file store, archive manager | `RawTraceArchiveManager` for file naming and segment IO | Codex event dedupe remains converter-owned. |
| DS-003 | Claude compacting status can write a marker only; Claude compact boundary rotates active traces through the same archive manager. | Claude converter, boundary recorder, file store, archive manager | `RawTraceArchiveManager` for file naming and segment IO | Status-vs-boundary eligibility remains converter/recorder-owned. |
| DS-004 | Readers ask for archive-only or full corpus; archive manager opens manifest file names directly, so filename format is not parsed. | File store, archive manager | Manifest-backed archive read path | Chronological merge and dedupe remain in `RunMemoryFileStore`. |

## Spine Actors / Main-Line Nodes

- Runtime/event compaction trigger: AutoByteus compactor, Codex converter, or Claude converter.
- Memory recorder/file store: decides which active traces move to archive and which remain active.
- `RawTraceArchiveManager`: creates archive segment filename, writes pending/complete manifest state, writes segment JSONL, reads manifest-listed segment files.

## Ownership Map

- `RawTraceArchiveManager` owns archive segment filename shape, archive directory path, manifest path, segment write lifecycle, complete-segment reads, and boundary-key idempotency checks.
- `RunMemoryFileStore` owns active raw trace list rewrite/pruning and full corpus merge behavior.
- Codex and Claude converters own provider compact-event normalization and rotation eligibility, not archive filenames.
- `ProviderCompactionBoundaryRecorder` owns translating provider boundaries into active trace marker/rotation operations, not archive filenames.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `FileMemoryStore.pruneRawTracesById` | `RunMemoryFileStore` / `RawTraceArchiveManager` | Public memory store facade for package consumers. | Archive segment filename construction. |
| `RunMemoryWriter.rotateActiveRawTracesBeforeBoundary` | `RunMemoryFileStore` / `RawTraceArchiveManager` | Server memory writer facade for provider compaction events. | Archive segment filename construction. |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Boundary hash suffix in archive segment filenames | Manifest stores full `boundary_key`; filename hash is not used for correctness. | `RawTraceArchiveManager.buildArchiveSegmentFileName(index, date)` with index + timestamp only. | In This Change | Do not remove `RunMemoryFileStore`'s native boundary-key hash helper. |
| `crypto` import and local `hashBoundaryKey` in `raw-trace-archive-manager.ts` | Only served filename suffix generation. | No replacement needed in archive manager. | In This Change | Keep any remaining crypto usage elsewhere. |
| Tests expecting old hash-suffixed generated filenames | They encode obsolete filename shape. | Tests asserting simplified shape. | In This Change | Manually constructed old names may remain only when testing manifest-read flexibility. |

## Return Or Event Spine(s) (If Applicable)

- Archive read: caller -> `RunMemoryFileStore.readCompleteArchiveRawTraceDicts` -> `RawTraceArchiveManager.readCompleteArchiveRawTraceDicts` -> manifest complete segments -> JSONL records.
- Full corpus read: caller -> `RunMemoryFileStore.readCompleteRawTraceCorpusDicts` -> archive records + active records -> deduped/sorted records.

## Bounded Local / Internal Spines (If Applicable)

- `RawTraceArchiveManager.archiveRecords`: check empty records -> find existing complete segment by boundary key -> remove pending entries for same boundary -> allocate next segment index -> write pending manifest -> write segment JSONL -> mark manifest segment complete.
- This lifecycle must stay intact; only filename composition changes.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| UTC timestamp formatting | DS-001, DS-002, DS-003 | `RawTraceArchiveManager` | Produce filesystem-safe human-readable creation timestamp. | Keeps file names readable without parsing manifest. | Runtime converters might start owning archive layout. |
| Boundary-key idempotency | DS-001, DS-002, DS-003 | `RawTraceArchiveManager` | Prevent duplicate archive segments for same boundary. | Supports retries/replays. | Filename shape might be incorrectly used as identity. |
| Full-corpus chronological merge | DS-004 | `RunMemoryFileStore` | Merge active and archived records by trace identity/order. | Gives consumers all raw trace history. | Archive manager would own active-store semantics. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Archive segment filename change | `autobyteus-ts/src/memory/store` / `RawTraceArchiveManager` | Reuse | Existing owner already centralizes segment file creation for all runtimes. | N/A |
| Runtime coverage for AutoByteus/Codex/Claude | Existing compaction and provider boundary tests | Extend | Existing tests already exercise archive manager and run store behavior. | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts` memory store | Archive segment files, manifest, active/raw archive reads. | DS-001, DS-002, DS-003, DS-004 | `RawTraceArchiveManager`, `RunMemoryFileStore` | Reuse | No new subsystem. |
| `autobyteus-server-ts` runtime memory recording | Provider boundary marker/rotation. | DS-002, DS-003 | `ProviderCompactionBoundaryRecorder` | Reuse | No code change expected. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/memory/store/raw-trace-archive-manager.ts` | Memory store | Archive manager | Generate simplified archive segment filenames and maintain manifest-backed segment IO. | Existing single owner for archive file mechanics. | Manifest types. |
| `autobyteus-ts/tests/unit/memory/raw-trace-archive-manager.test.ts` | Memory store tests | Archive manager tests | Assert simplified filename shape and preserve manifest/idempotency behavior. | Existing focused test file. | N/A |
| `autobyteus-ts/tests/unit/memory/run-memory-file-store.test.ts` | Memory store tests | File store tests | Validate archive/full corpus behavior after manager change. | Existing focused test file. | N/A |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Archive segment filename builder | None | Memory store | Not repeated; keep private to archive manager. | Yes | Yes | Cross-runtime filename helper outside archive manager. |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `RawTraceArchiveSegmentEntry.file_name` | Yes | Yes | Low | Continue storing exact file name; no schema change. |
| `RawTraceArchiveSegmentEntry.boundary_key` | Yes | Yes | Low | Continue using as idempotency and diagnostic identity. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/memory/store/raw-trace-archive-manager.ts` | Memory store | Archive manager | Build `<index>_<utcStamp>.jsonl`, write/read archive segments and manifest, dedupe by boundary key. | Existing authoritative archive segment owner. | `RawTraceArchiveManifest` types. |
| `autobyteus-ts/tests/unit/memory/raw-trace-archive-manager.test.ts` | Memory store tests | Archive manager tests | Verify new filename shape, pending/complete read behavior, and same-boundary retry behavior. | Existing focused test file. | N/A |
| `autobyteus-ts/tests/unit/memory/run-memory-file-store.test.ts` | Memory store tests | File store tests | Verify active/archive/full-corpus behavior still passes. | Existing focused test file. | N/A |

## Ownership Boundaries

`RawTraceArchiveManager` is the authoritative archive segment file boundary. Runtime-specific code must not shape archive filenames. The runtime-specific compaction owners only produce compaction boundaries or raw trace IDs. `RunMemoryFileStore` bridges active trace mutation and archive manager calls.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `RawTraceArchiveManager.archiveRecords` | filename builder, pending/complete manifest lifecycle, segment JSONL writes | `RunMemoryFileStore` | Runtime converter constructing archive segment filenames. | Extend archive manager API, not converters. |
| `RunMemoryFileStore.pruneRawTracesById` / `rotateActiveRawTracesBeforeBoundary` | active trace split/rewrite and archive delegation | Compactors, server memory writer | Compactors writing archive files directly. | Add focused file-store method. |

## Dependency Rules

- `RawTraceArchiveManager` may depend on filesystem/path and manifest types.
- `RunMemoryFileStore` may depend on `RawTraceArchiveManager`.
- Runtime converters and provider boundary recorder must not depend on archive segment filename rules.
- Tests may inspect manifest `file_name` to verify the new public persistence shape.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `RawTraceArchiveManager.archiveRecords(records, boundary)` | Archive segment creation | Create or reuse archive segment for a boundary. | Full `RawTraceArchiveBoundaryInput` with `boundaryKey`. | Return segment entry with simplified `file_name`. |
| `RawTraceArchiveManager.readCompleteArchiveRawTraceDicts()` | Archive segment reads | Read manifest-listed complete segments. | None | Must not parse filename shape. |
| `RunMemoryFileStore.readCompleteRawTraceCorpusDicts(limit?)` | Full raw trace corpus | Merge archived and active raw traces. | Optional numeric limit. | Unchanged. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `archiveRecords` | Yes | Yes | Low | None. |
| `readCompleteArchiveRawTraceDicts` | Yes | Yes | Low | None. |
| `readCompleteRawTraceCorpusDicts` | Yes | Yes | Low | None. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Archive segment owner | `RawTraceArchiveManager` | Yes | Low | None. |
| Manifest entry field | `file_name` | Yes | Low | None. |
| Boundary identity field | `boundary_key` | Yes | Low | None. |

## Applied Patterns (If Any)

- Manifest/index pattern: archive segment files are addressed by an authoritative manifest. This existing pattern remains unchanged.
- Idempotent write pattern: boundary-key lookup prevents duplicate complete segments for the same compaction boundary. This existing pattern remains unchanged.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/memory/store/raw-trace-archive-manager.ts` | File | Raw trace archive manager | Simplified segment filename generation and manifest-backed archive IO. | Existing owner of archive segment file mechanics. | Runtime-specific compaction policies. |
| `autobyteus-ts/tests/unit/memory/raw-trace-archive-manager.test.ts` | File | Archive manager tests | New filename shape and existing archive behavior. | Existing focused unit tests. | Provider converter tests. |
| `autobyteus-ts/tests/unit/memory/run-memory-file-store.test.ts` | File | File store tests | Active/archive/full-history regression coverage. | Existing focused unit tests. | Filename builder internals beyond manifest result assertions. |

## Change Inventory

| Type (`Add`/`Modify`/`Rename/Move`/`Remove`) | Path | Summary |
| --- | --- | --- |
| Modify | `autobyteus-ts/src/memory/store/raw-trace-archive-manager.ts` | Remove boundary hash suffix from generated segment filenames; drop now-unused local crypto/hash helper. |
| Modify | `autobyteus-ts/tests/unit/memory/raw-trace-archive-manager.test.ts` | Update fixture file names and add/assert simplified generated filename shape. |
| Modify if needed | `autobyteus-ts/tests/unit/memory/run-memory-file-store.test.ts` | Add/adjust assertion that archive segment names from native/provider store paths use simplified shape if implementation engineer finds coverage gap. |

## Migration / Refactor Sequence

1. Update `RawTraceArchiveManager.buildArchiveSegmentFileName` to accept only `index` and `date`, and return `${index}_${utcStamp}.jsonl`.
2. Update `archiveRecords` call site accordingly.
3. Remove unused `crypto` import and local archive-manager `hashBoundaryKey` helper.
4. Update archive manager tests to reflect the new generated filename shape.
5. Run focused memory store tests.
6. Run broader build/typecheck as practical for `autobyteus-ts` and server integration constraints.

## Compatibility / Legacy Handling

No migration and no dual-path code. Existing manifest entries with old hash-suffixed `file_name` values remain readable because the existing reader opens the manifest value directly. New writes use only the simplified filename shape.

## Test / Coverage Guidance

Implementation should verify at least:

- `RawTraceArchiveManager.archiveRecords` creates a file name matching `^\d{6}_\d{8}T\d{9}Z\.jsonl$`.
- The created filename does not match the old hash-suffixed shape.
- Manifest still records full `boundary_key`.
- Same-boundary retry remains idempotent.
- `RunMemoryFileStore` archive/full-corpus tests still pass.

Suggested commands, adjusted if package tooling requires:

```bash
pnpm --filter autobyteus-ts exec vitest run tests/unit/memory/raw-trace-archive-manager.test.ts tests/unit/memory/run-memory-file-store.test.ts
pnpm --filter autobyteus-ts build
```

If server workspace integration is needed after code review, downstream API/E2E should decide whether cross-runtime memory persistence integration tests need execution.

## Risks / Open Questions

- Risk: removing the archive-manager `crypto` import must not remove `RunMemoryFileStore`'s separate native boundary-key hash helper.
- Risk: focused test command may need adjustment because `autobyteus-ts` package has no standard `test` script.
- Open questions: none.
