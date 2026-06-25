# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready

## Goal / Problem Statement

Improve the Memory Inspector `Raw Traces` tab so users can inspect raw traces beyond the current active `raw_traces.jsonl` file. Raw traces can be rotated into multiple segment files, but the current frontend requests only the active file. Users need a simple way to see which raw-trace files exist, how many records each contains, and display one selected file at a time.

## Investigation Findings

- The Memory Inspector frontend initially loads memory without raw traces. Opening the `Raw Traces` tab sets `includeRawTraces=true` and refetches.
- The frontend currently sends `includeArchive=false` in `memoryInspectorStore.buildVariables`, so the current Raw Traces tab does **not** request merged active + rotated segment corpus.
- Backend `AgentMemoryService.getRunMemoryView` supports active-only and merged-corpus reads, but it does not currently expose a per-file source list or a selected raw-trace file/source selector for the Memory Inspector.
- Raw-trace segment metadata already exists in `raw_traces_manifest.json` through `RawTraceArchiveManager` / `RunMemoryFileStore`; complete segments have record counts, index, filename, boundary metadata, and timestamps.
- A similar source-listing pattern exists in `RawTraceWorkTraceSourceReader` for self-evolution work traces, but that reader is coupled to self-evolution domain types. The Memory Inspector should use a shared agent-memory raw-trace source owner rather than depending on self-evolution.
- The Raw Traces tab renders a flat list of normalized trace events (`traceType`, `seq`, `content`, tool/media fields). It does not display segment file identity or explicit segment boundaries.
- The imported run visible in the screenshot contains three rotated segment files plus active `raw_traces.jsonl` (411 + 553 + 767 + 59 = 1,790 records). Current UI would show only the 59 active records.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change / Small Feature
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant / Boundary Or Ownership Issue
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Needed, small and local to raw-trace source ownership
- Evidence basis: The backend has merged-corpus support, but the UI needs per-file selection. Segment source listing logic exists only in a self-evolution-specific reader; exposing it directly to Memory Inspector would couple the UI path to the wrong domain.
- Requirement or scope impact: Add a shared raw-trace source listing/reading boundary, expose it through GraphQL memory view data, and update the Raw Traces tab to select a source.

## Recommendations

- Implement a simple source selector in the Raw Traces tab:
  - Default selected source: active `raw_traces.jsonl`.
  - Dropdown choices include active file name and each complete rotated segment file name.
  - Each dropdown label includes file name / segment label and record count, e.g. `Active raw_traces.jsonl — 59 records`, `raw_traces_000003.jsonl — 767 records`.
  - Selecting a source refetches/displays only that source's records.
- Keep the UI per-file by default instead of defaulting to merged/all records; this matches user intent, avoids a very large default payload, and makes segment boundaries explicit.
- Create a reusable `agent-memory` raw-trace file reader/service for file summaries and selected-file reads. The selector/display identity should be the raw-trace file name (for example `raw_traces.jsonl` or `raw_traces_000003.jsonl`), not a separate synthetic active source id and not an absolute path. Reuse this service from both Memory Inspector and the existing self-evolution work-trace projection path where practical, rather than duplicating manifest/file selection logic.
- Optionally add a later `All / merged` dropdown choice only if users need cross-file chronological reading; it is not required for the simplified first improvement.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium

## In-Scope Use Cases

- UC-001: User opens Raw Traces for a run with only active `raw_traces.jsonl`; UI shows active source selected and displays active records as it does today.
- UC-002: User opens Raw Traces for a run with active + complete rotated raw trace segments; UI defaults to active records and provides a dropdown listing active plus segment files with counts.
- UC-003: User selects a rotated segment in the dropdown; UI refetches and displays that segment's normalized raw trace events.
- UC-004: User changes raw trace limit while a source is selected; UI refetches the same source and applies the limit to that source.
- UC-005: User inspects an imported read-only memory corpus; source listing and selected-source display work the same as local memory without write assumptions.

## Out of Scope

- Editing raw trace files.
- Showing all segment contents merged by default.
- Arbitrary filesystem path browsing or exposing absolute local/server paths in the frontend.
- Displaying pending/incomplete raw trace segments.
- Changing raw-trace rotation or compaction behavior.
- Renaming physical `raw_traces.jsonl` to `raw_traces_active.jsonl` or otherwise changing the storage filename family.
- Durable API/E2E coverage edits are downstream-owned after implementation design/review.

## Functional Requirements

- REQ-001: The Raw Traces tab must default to the active raw trace file (`raw_traces.jsonl`) for a selected run when it exists.
- REQ-002: The Raw Traces tab must show a raw trace file selector when raw trace file metadata is available.
- REQ-003: The file selector must include active `raw_traces.jsonl` when present and all complete rotated segment file names from the manifest.
- REQ-004: Each file option must show the raw trace file name and record count.
- REQ-005: Selecting a raw trace file name must display records from that file only, not an implicit merged corpus.
- REQ-006: Raw trace file identity passed from frontend to backend must be the backend-listed raw trace file name, e.g. `raw_traces.jsonl` or `raw_traces_000003.jsonl`, not an absolute path and not an arbitrary user-provided path.
- REQ-007: Backend source listing must ignore pending/incomplete segment entries.
- REQ-008: Backend selected-source reads must preserve existing normalized `MemoryTraceEvent` shape used by `RawTracesTab`.
- REQ-009: Existing merged-corpus behavior used by non-inspector callers must continue to work unless explicitly replaced by the new source API in that caller.
- REQ-010: The implementation must avoid coupling Memory Inspector to self-evolution-specific work-trace domain types.

## Acceptance Criteria

- AC-001: For a run with only `raw_traces.jsonl`, opening Raw Traces shows active source selected and displays active records.
- AC-002: For a run with `raw_traces.jsonl`, `raw_traces_manifest.json`, and complete segment files, opening Raw Traces shows a dropdown containing active plus each complete segment file name with counts.
- AC-003: Selecting a complete segment file name changes the displayed records to that file's records and does not display active-file records at the same time.
- AC-004: Pending manifest entries are absent from the dropdown.
- AC-005: The frontend never sends an absolute path as the selector; it sends only one raw trace file name that came from the backend source list, and the backend validates that file name against active `raw_traces.jsonl` or complete manifest segments before reading.
- AC-006: The raw trace limit still applies to the selected file.
- AC-007: Imported memory sources work with the same selector behavior.
- AC-008: Existing tests for opening Raw Traces and active-only display are updated or preserved with the new default-active behavior.

## Constraints / Dependencies

- Current dedicated worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/raw-traces-memory-inspector-analysis`.
- Current branch: `codex/raw-traces-memory-inspector-analysis`, based on `origin/personal`.
- GraphQL generated frontend types may need regeneration/update after schema/query changes.
- Raw-trace segment manifest/file naming remains owned by `RawTraceArchiveManager` / `RunMemoryFileStore`.

## Assumptions

- The desired first UX is per-file-name selection, not merged-all display by default.
- Active `raw_traces.jsonl` is the most recent/default file and should remain the default view when present.
- Record count from manifest is acceptable for complete segment dropdown labels; active file count can be computed by reading/counting active JSONL records or by a store helper.

## Risks / Open Questions

- Should segment options be sorted newest-first (`active`, highest segment index to lowest) or chronological (`segment 1`, `segment 2`, ..., `active`)? Recommendation: active first, then segments newest-to-oldest for recent-history inspection.
- Should an `All merged` option be included now? Recommendation: no for the first simplified UI, but keep backend merged-corpus support intact.
- Very large selected files can still be heavy; the existing `rawTraceLimit` should remain visible and apply per selected source.

## Requirement-To-Use-Case Coverage

- REQ-001 -> UC-001, UC-002, UC-005
- REQ-002 -> UC-002, UC-003, UC-005
- REQ-003 -> UC-002
- REQ-004 -> UC-002
- REQ-005 -> UC-003
- REQ-006 -> UC-003, UC-005
- REQ-007 -> UC-002
- REQ-008 -> UC-001, UC-003
- REQ-009 -> UC-001, UC-002, UC-003
- REQ-010 -> UC-002, UC-003

## Acceptance-Criteria-To-Scenario Intent

- AC-001 -> Single-file active-only run remains simple and backward-compatible in user experience.
- AC-002 -> Multi-segment run exposes hidden raw trace files.
- AC-003 -> File-name selection is per-file rather than merged.
- AC-004 -> UI does not advertise incomplete data.
- AC-005 -> Backend remains authoritative for file-name validation and path resolution.
- AC-006 -> Existing performance control remains effective.
- AC-007 -> Imported/read-only memory is supported.
- AC-008 -> Regression coverage for current and new UX.

## Approval Status

Approved by user on 2026-06-25 for per-file filename selector behavior; physical `raw_traces.jsonl` rename explicitly out of scope.
