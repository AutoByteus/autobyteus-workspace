# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready

## Goal / Problem Statement

Decide whether backend runtime raw-trace active storage should use an explicit active filename, `raw_traces_active.jsonl`, instead of the current `raw_traces.jsonl`, to align with the adjacent self-evolution work-trace naming (`work_trace_active.md`) and the actual raw-trace lifecycle.

Clarification: the current code uses `raw_traces.jsonl`, not `raw_traces.json`. Raw traces are line-delimited JSON records, so any rename should keep the `.jsonl` extension.

## Investigation Findings

- The active raw-trace filename is centralized in `autobyteus-ts/src/memory/store/memory-file-names.ts` as `RAW_TRACES_MEMORY_FILE_NAME = 'raw_traces.jsonl'`.
- Runtime writes append active raw trace records through `RunMemoryWriter -> RunMemoryFileStore.appendRawTrace(...) -> RAW_TRACES_MEMORY_FILE_NAME`.
- Rotation moves settled records out of the active file into complete segment files named `raw_traces_<zero-padded-index>.jsonl`, indexed by `raw_traces_manifest.json`; the boundary marker remains active.
- Server read paths already distinguish active and corpus semantics in method names: `MemoryFileStore.readRawTracesActive(...)`, `MemoryFileStore.readRawTraceCorpus(...)`, `RawTraceFileSourceService` active-vs-segment summaries, and GraphQL `rawTraceFileName` selector support.
- Documentation explicitly describes `raw_traces.jsonl` as active ordered raw trace records. The runtime behavior is semantically active already; the mismatch is the physical filename and user/API-exposed selected filename.
- Self-evolution work traces are derived markdown projections, not raw runtime persistence. `RawTraceWorkTraceSourceReader` maps raw active/segment sources to `SelfEvolutionWorkTraceSource`, and `SelfEvolutionWorkTraceStore` names the active derived file `work_trace_active.md`.
- Exact source search found no `raw_traces.json` path; all active runtime raw trace references are `.jsonl`.
- Exact source/test/docs search found `raw_traces.jsonl` in 22 files and `RAW_TRACES_MEMORY_FILE_NAME` in 13 files across `autobyteus-ts`, `autobyteus-server-ts`, tests, and docs.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Cleanup / Behavior Change
- Initial design issue signal (`Yes`/`No`/`Unclear`): No major boundary issue; minor naming clarity issue.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): No Design Issue Found for ownership/boundaries; file-name semantic drift is the cleanup pressure.
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Not Needed structurally; a small rename plus migration is needed if approved.
- Evidence basis: `RunMemoryFileStore` and `RawTraceFileSourceService` already own active-vs-archive behavior cleanly; `RAW_TRACES_MEMORY_FILE_NAME` centralizes the physical active filename; work-trace active naming exists only in the self-evolution projection store.
- Requirement or scope impact: The change is not just a string rename because the active filename is user-data and API-visible via raw-trace file summaries/selectors. It requires a one-time app-data migration and tests/docs updates.

## Recommendations

Approved recommendation: perform a clean rename to `raw_traces_active.jsonl` with a one-time app-data migration and no steady-state backward compatibility.

Rationale:

- `raw_traces_active.jsonl` more accurately describes the file: it stores only the currently active tail of the raw-trace corpus after rotation.
- The name aligns with `work_trace_active.md` and makes the active-vs-rotated file set obvious: `raw_traces_active.jsonl` plus `raw_traces_000001.jsonl`, `raw_traces_000002.jsonl`, etc.
- The current code has the right ownership boundaries, so implementation should reuse the existing filename/store/read boundaries rather than adding another abstraction.
- Do not add dual-read fallback in steady state. Use a startup app-data migration to rename existing active files, then make the runtime read/write only the new filename.

User approved the migration/API contract churn because the cleaner active-state name is preferred for this ticket.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium if implemented, because persisted user data, docs, GraphQL raw-trace file selector values, memory sync fixtures/tests, and API/E2E coverage are touched even though source ownership is centralized.

## In-Scope Use Cases

- Backend runtime writes active raw trace state for a standalone run.
- Backend runtime writes active raw trace state for team/member runs.
- Backend runtime reads active raw trace state while a run is in progress, after restart, and during run-history/memory-view hydration.
- Backend runtime reads complete raw trace corpus as complete rotated segments plus active records.
- Raw trace file selection exposes the backend-listed active filename to GraphQL/UI consumers.
- Self-evolution work-trace projection continues to generate `work_trace_active.md` from the active raw-trace source.
- Existing local app-data active trace files are migrated from `raw_traces.jsonl` to `raw_traces_active.jsonl` without steady-state dual reads.

## Out of Scope

- Changing the raw-trace record schema or JSONL payload shape.
- Renaming rotated segment files (`raw_traces_000001.jsonl`) or `raw_traces_manifest.json`.
- Redesigning run history, compaction, memory sync protocol delete semantics, or self-evolution work-trace content.
- Adding compatibility fallback reads from `raw_traces.jsonl` after migration.

## Functional Requirements

- **RTR-001**: The canonical active raw-trace file name must be `raw_traces_active.jsonl` for new runtime writes in standalone and team/member memory directories.
- **RTR-002**: `RunMemoryFileStore` and server memory read boundaries must read the active raw-trace file through the same canonical filename owner; no caller should hardcode active raw trace paths outside fixtures, tests, docs, or the migration.
- **RTR-003**: Complete corpus behavior must remain unchanged: complete rotated segments plus active records are merged/deduped/ordered as before, and segment files remain `raw_traces_<zero-padded-index>.jsonl` under `raw_traces_manifest.json`.
- **RTR-004**: GraphQL memory-view raw-trace file summaries and `selectedRawTraceFileName` must expose `raw_traces_active.jsonl` for the active source after the rename.
- **RTR-005**: Self-evolution work-trace generation must continue to produce `work_trace_active.md` for the active derived markdown projection and numbered `work_trace_<index>.md` files for archive-derived projections.
- **RTR-006**: A startup app-data migration must rename existing active files from `raw_traces.jsonl` to `raw_traces_active.jsonl` across local memory run directories and imported Memory Sync corpora when present. It must not leave a steady-state dual-read path.
- **RTR-007**: Tests and docs that describe runtime memory layout, memory inspector file selection, run history, memory sync fixtures, and self-evolution work traces must be updated to the new active filename where applicable.

## Acceptance Criteria

- **AC-RTR-001**: A new standalone runtime run creates/appends `memory/agents/<runId>/raw_traces_active.jsonl` and does not create `memory/agents/<runId>/raw_traces.jsonl`.
- **AC-RTR-002**: A new team/member runtime run creates/appends `memory/agent_teams/<...>/<memberRunId>/raw_traces_active.jsonl` and does not create `raw_traces.jsonl` in that member memory directory.
- **AC-RTR-003**: Raw-trace rotation still creates `raw_traces_manifest.json` plus `raw_traces_000001.jsonl`-style complete segments, leaves the boundary marker in `raw_traces_active.jsonl`, and complete-corpus reads still include segment records plus active records.
- **AC-RTR-004**: `getAgentRunMemoryView(... includeRawTraceFiles: true ...)` and `getTeamMemberRunMemoryView(... includeRawTraceFiles: true ...)` list the active raw trace file as `raw_traces_active.jsonl` with `kind: active`; requesting that file name reads active records.
- **AC-RTR-005**: The migration renames existing `raw_traces.jsonl` files to `raw_traces_active.jsonl`, updates imported Memory Sync manifests for renamed imported files when present, and does not add runtime fallback reads for the old name.
- **AC-RTR-006**: Self-evolution `ensureCurrent()` continues to create `work_trace_active.md` for active source records and numbered work trace files for archive segments.
- **AC-RTR-007**: Source search after implementation has no live runtime read/write dependency on `raw_traces.jsonl`; remaining references, if any, are limited to the migration, migration tests, or historical explanatory notes.

## Constraints / Dependencies

- `autobyteus-server-ts` imports the canonical active filename from `autobyteus-ts`; rename must keep shared package and server package aligned.
- The active file name is exposed in GraphQL raw-trace file summaries/selectors; clients selecting by filename must use the backend-returned filename.
- Existing app data must be migrated rather than supported by a permanent fallback read path.
- Memory Sync currently syncs file paths as full-file replace operations and has no delete operation; stale old-path records may require explicit migration/manifest cleanup if imported corpora are included.

## Assumptions

- The desired target is `raw_traces_active.jsonl`, not `raw_traces_active.json`, because the file contains line-delimited JSON records.
- The rename is intended as a clean active-state clarity improvement, not as a schema or compaction behavior change.
- Segment naming stays plural (`raw_traces_...`) because each JSONL segment contains multiple raw trace records.

## Risks / Open Questions

- Existing Memory Sync imported corpora under `memory/imports/<sourceNodeId>/...` should be migrated when present so read-only imported memory views do not depend on the old filename. Source-side Memory Sync state may still contain stale old-path fingerprints until the next sync cycle because protocol v1 has no delete operation; do not preserve old runtime reads for that state.
- API/UI clients that store a selected raw-trace filename locally could hold `raw_traces.jsonl`; backend selection will naturally realign to the listed new active filename when clients refetch file metadata.
- External consumers of the exported `autobyteus-ts` constant `RAW_TRACES_MEMORY_FILE_NAME` may need update if the constant is renamed rather than only changing its value.

## Requirement-To-Use-Case Coverage

- Standalone active write/read: RTR-001, RTR-002, RTR-006; AC-RTR-001, AC-RTR-005.
- Team/member active write/read: RTR-001, RTR-002, RTR-006; AC-RTR-002, AC-RTR-005.
- Complete corpus/rotation: RTR-003; AC-RTR-003.
- GraphQL/memory inspector file selection: RTR-004; AC-RTR-004.
- Self-evolution work traces: RTR-005; AC-RTR-006.
- Documentation/tests/source hygiene: RTR-007; AC-RTR-007.

## Acceptance-Criteria-To-Scenario Intent

- AC-RTR-001 and AC-RTR-002 verify new-write physical layout.
- AC-RTR-003 verifies that rename does not regress compaction/provider-boundary rotation or corpus reads.
- AC-RTR-004 verifies API-visible selector behavior.
- AC-RTR-005 verifies existing user data migration without steady-state compatibility reads.
- AC-RTR-006 verifies that the user-observed `work_trace_active.md` convention remains intact.
- AC-RTR-007 verifies no accidental dependency on the old active filename remains.

## Approval Status

Approved by user on 2026-07-07. User explicitly approved the clean rename, required existing-data migration to `raw_traces_active.jsonl`, and no backward compatibility.
