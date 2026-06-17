# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready

## Goal / Problem Statement

Simplify raw trace archive segment filenames by removing the boundary-key hash suffix for every runtime path that writes raw trace archive segments: AutoByteus/native compaction, Codex provider compaction boundaries, and Claude Agent SDK compact boundaries. New archive segment files should use only the segment number and UTC timestamp while preserving all existing archive behavior, manifest metadata, idempotency, and full-history read APIs.

Current filename shape:

```text
raw_traces_archive/000001_20260430T103015123Z_deadbeef.jsonl
```

Target filename shape:

```text
raw_traces_archive/000001_20260430T103015123Z.jsonl
```

## Investigation Findings

- `RawTraceArchiveManager` is the owner of archive segment filename creation and archive manifest IO in `autobyteus-ts/src/memory/store/raw-trace-archive-manager.ts`.
- The current boundary hash is generated only for the file name by `hashBoundaryKey(boundaryKey)` and `buildArchiveSegmentFileName(index, date, boundaryKey)`.
- Deduplication and idempotency do not depend on the filename hash. They use the manifest's full `boundary_key` through `findCompleteSegmentForBoundary(boundaryKey)`.
- Archive reads do not recompute or parse the filename hash. They read `manifest.segments[].file_name` and open that exact file.
- Full raw trace history reads (`readCompleteRawTraceCorpusDicts`) merge complete archive segments plus active `raw_traces.jsonl`; this behavior is independent of the filename suffix.
- Existing tests contain hard-coded sample archive segment names with the hash suffix and should be updated to the target shape where the test is expressing current expected layout.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Cleanup / behavior simplification
- Initial design issue signal (`Yes`/`No`/`Unclear`): No
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): No Design Issue Found
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Not Needed
- Evidence basis: filename construction is localized in `RawTraceArchiveManager`; existing `RunMemoryFileStore`, provider compaction boundary recording, native compaction pruning, and archive read APIs already use the manifest as the authority.
- Requirement or scope impact: constrain the change to filename generation and expectation updates; do not alter archive layout, manifest schema, compaction semantics, read APIs, or migration/compatibility behavior.

## Recommendations

- Change `RawTraceArchiveManager.buildArchiveSegmentFileName` to produce `<zero-padded-index>_<utcStamp>.jsonl`.
- Remove the `crypto` import and local `hashBoundaryKey` helper from `raw-trace-archive-manager.ts` if it becomes unused there.
- Keep `RunMemoryFileStore`'s separate `hashBoundaryKey` helper for native compaction boundary-key generation; that boundary key remains part of idempotency and is not the archive filename suffix.
- Update unit tests that construct sample manifest/file names to use the simplified filename shape.
- Add or strengthen a test assertion that a newly created segment file name matches the simplified shape and no longer includes the boundary hash suffix.

## Scope Classification (`Small`/`Medium`/`Large`)

Small

## In-Scope Use Cases

- UC-001: A native/autobyteus compaction archives selected raw traces and creates a new archive segment file using the simplified filename shape.
- UC-002: A provider compaction boundary (Codex or Claude compact boundary) archives active raw traces before the marker and creates a new archive segment file using the simplified filename shape.
- UC-003: Existing archive read paths continue reading complete archive segments by `manifest.segments[].file_name` and continue producing full raw trace history from archive plus active traces.
- UC-004: Duplicate/replayed compaction boundaries continue reusing the existing complete manifest segment rather than creating duplicate archive files.

## Out of Scope

- Changing archive directory name (`raw_traces_archive`) or manifest filename (`raw_traces_archive_manifest.json`).
- Changing manifest schema or removing `boundary_key` from the manifest.
- Changing native compaction boundary-key generation.
- Changing Codex or Claude compact-event conversion behavior.
- Migrating or renaming existing archive segment files already written with the old hash-suffixed shape.
- Changing full-history APIs such as `readCompleteRawTraceCorpusDicts`.

## Functional Requirements

- REQ-001: New raw trace archive segment files must be named with only the zero-padded segment index and UTC timestamp: `<index>_<utcStamp>.jsonl`.
- REQ-002: Raw trace archive manifest entries must continue storing the exact `file_name` used for the segment and the full `boundary_key` for idempotency and diagnostics.
- REQ-003: Archive creation must continue writing the manifest in pending state before writing the segment file, then marking the segment complete after the segment file write succeeds.
- REQ-004: Archive reads must continue using manifest `file_name` values and must remain able to read old or manually constructed manifest entries regardless of whether their filename includes a boundary hash.
- REQ-005: Replayed or duplicate boundaries must continue detecting existing complete segments by `boundary_key`, not filename.
- REQ-006: Active raw traces must continue being rewritten/pruned after a successful newly created archive segment, with no behavioral change to native compaction or provider compaction boundary rotation.

## Acceptance Criteria

- AC-001: A new archive segment created by `RawTraceArchiveManager.archiveRecords` has a file name matching `^\d{6}_\d{8}T\d{9}Z\.jsonl$` and not the old `^\d{6}_\d{8}T\d{9}Z_[a-f0-9]{8}\.jsonl$` shape.
- AC-002: The new segment file exists under `raw_traces_archive/`, and `raw_traces_archive_manifest.json` records the same simplified `file_name` plus the unchanged full `boundary_key`.
- AC-003: `readCompleteArchiveRawTraceDicts()` returns records from complete archive segments whose file names are stored in the manifest.
- AC-004: `readCompleteRawTraceCorpusDicts()` still returns archived plus active raw traces in stable chronological/turn/sequence/id order.
- AC-005: Retrying archive creation for the same `boundary_key` after a complete segment exists returns the existing segment with `created: false` and does not create a second archive segment file.
- AC-006: Unit tests covering raw trace archive manager and run memory file store pass after expectation updates.

## Constraints / Dependencies

- `raw_traces_archive_manifest.json` remains the authoritative index for archive segment files.
- Existing archived segment files with hash-suffixed names must remain readable when referenced by existing manifests; no migration is required or desired for this cleanup.
- The target package is `autobyteus-ts`, with server-side readers in `autobyteus-server-ts` relying on exported store APIs.

## Assumptions

- A clean-cut change for newly created files is acceptable; existing files retain their current names until naturally absent or manually migrated outside this ticket.
- Human inspection benefits from the segment index and timestamp; the boundary hash suffix is not needed because the manifest carries boundary metadata.

## Risks / Open Questions

- Risk: brittle tests may assert the old filename shape indirectly. Mitigation: update tests only where the old shape is expected layout, not where arbitrary manifest filenames are intentionally accepted.
- Open question: none currently blocking.

## Requirement-To-Use-Case Coverage

| Requirement | UC-001 | UC-002 | UC-003 | UC-004 |
| --- | --- | --- | --- | --- |
| REQ-001 | Yes | Yes | No | No |
| REQ-002 | Yes | Yes | Yes | Yes |
| REQ-003 | Yes | Yes | No | No |
| REQ-004 | No | No | Yes | No |
| REQ-005 | No | No | No | Yes |
| REQ-006 | Yes | Yes | No | No |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion | Scenario Intent |
| --- | --- |
| AC-001 | Verifies the direct requested filename simplification for newly created archive segments. |
| AC-002 | Verifies the manifest remains authoritative and still stores boundary metadata. |
| AC-003 | Verifies archive-only reads still work via manifest file names. |
| AC-004 | Verifies full-history raw trace reads remain unchanged. |
| AC-005 | Verifies replay/idempotency remains boundary-key based. |
| AC-006 | Verifies existing durable coverage for the affected store behavior remains valid after updates. |

## Approval Status

Approved by user on 2026-06-17. User explicitly confirmed this simplification is intended for all runtimes, including AutoByteus, Codex, and Claude Agent SDK.
