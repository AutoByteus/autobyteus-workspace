# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Refined - approved by user on 2026-06-17; refined after architecture review round 1.

## Goal / Problem Statement

Simplify raw trace storage to a log-rotation-style layout where the active raw trace file, rotated raw trace segment files, and raw trace manifest all live directly in the run memory directory.

Current finalized layout after the prior filename simplification ticket:

```text
<memoryDir>/
  raw_traces.jsonl
  raw_traces_archive_manifest.json
  raw_traces_archive/
    000001_20260430T103015123Z.jsonl
    000002_20260430T104200456Z.jsonl
```

Target layout:

```text
<memoryDir>/
  raw_traces.jsonl
  raw_traces_000001.jsonl
  raw_traces_000002.jsonl
  raw_traces_000003.jsonl
  raw_traces_manifest.json
```

The manifest stays, but it should use the cleaner `raw_traces_manifest.json` name. Rotated segment files should use only the zero-padded segment number because the manifest already stores timestamps and boundary metadata.

The ticket also requires an app-data migration so existing runs using the old `raw_traces_archive/` layout are moved to the new layout automatically and safely.

## Investigation Findings

- The previous raw trace archive filename simplification ticket has been finalized and merged into `origin/personal` at `f83f18fb8ba8fb53167c9236c71b4d60be9b405a`.
- `RawTraceArchiveManager` currently centralizes archive segment path/name creation for all runtime archive writers in `autobyteus-ts/src/memory/store/raw-trace-archive-manager.ts`.
- All runtime archive writers use the same manager path:
  - AutoByteus/native compaction through `RunMemoryFileStore.pruneRawTracesById`.
  - Codex provider compaction boundaries through provider boundary rotation.
  - Claude Agent SDK compact boundaries through provider boundary rotation.
- The current archive manager writes segment files under `raw_traces_archive/`, names new files `000001_<timestamp>.jsonl`, and stores metadata in `raw_traces_archive_manifest.json`.
- The timestamp is not needed in the segment filename because the manifest stores `archived_at`, `first_ts`, `last_ts`, and segment `index`.
- The existing app-data migration framework lives under `autobyteus-server-ts/src/app-data-migrations/` and is invoked on startup from `autobyteus-server-ts/src/server-runtime.ts`. Migrations implement `AppDataMigrationDefinition`, are registered in `app-data-migration-registry.ts`, create per-item summaries/details, and record results in `app_data_migration_records`.
- Existing app-data migrations use safe writes/backups and are marked `requiredOnStartup` when they repair filesystem app data. This raw trace layout change should follow that pattern.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Cleanup / behavior simplification + data migration
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): File Placement Or Responsibility Drift
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Needed, narrow
- Evidence basis: the current archive subfolder and archive-named manifest no longer match the desired active-plus-rotated raw trace mental model. File path/name creation is centralized, so the refactor can be bounded to the raw trace segment store boundary plus app-data migration registration.
- Requirement or scope impact: update new-write layout, manifest name, old-layout reads, and add a startup app-data migration for existing old-layout runs.

## Recommendations

- Write new rotated raw trace files directly in the run directory as `raw_traces_<zero-padded-index>.jsonl`.
- Rename the manifest file for new writes from `raw_traces_archive_manifest.json` to `raw_traces_manifest.json`.
- Keep manifest schema fields that support idempotency and diagnostics: `index`, `file_name`, `boundary_key`, `boundary_type`, status, timestamps, record count.
- Keep the active file name `raw_traces.jsonl` unchanged.
- Add a required startup app-data migration in `autobyteus-server-ts/src/app-data-migrations/migrations/` and register it in `app-data-migration-registry.ts`.
- The migration should scan run memory directories, migrate old manifest + segment files into the new layout, create manifest backups, preserve idempotency metadata, and report per-run details.
- Preserve old-layout read support in the store boundary during and after migration so old data remains readable if a migration is skipped, fails for one run, or has not yet executed.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium

## In-Scope Use Cases

- UC-001: AutoByteus/native compaction rotates selected raw traces into `raw_traces_000001.jsonl` style files in the run directory.
- UC-002: Codex compaction boundary rotation writes direct run-directory raw trace segment files using the same naming convention.
- UC-003: Claude Agent SDK compact boundary rotation writes direct run-directory raw trace segment files using the same naming convention.
- UC-004: Full raw trace history reads still return rotated segment records plus active `raw_traces.jsonl` records in stable order.
- UC-005: Existing old-layout run directories are migrated from `raw_traces_archive_manifest.json` + `raw_traces_archive/<segment>.jsonl` to `raw_traces_manifest.json` + `raw_traces_<index>.jsonl`.
- UC-006: Existing old-layout data remains readable if a migration is not yet run or an individual run is skipped/failed.

## Out of Scope

- Removing the manifest entirely.
- Renaming the active file `raw_traces.jsonl`.
- Changing compaction trigger policy or compacted memory behavior.
- Changing Codex or Claude compact-event conversion semantics.
- Replacing manifest idempotency with filename scanning.
- Implementing size-based or time-based automatic rotation independent of compaction boundaries.
- Migrating non-raw-trace memory files such as `episodic.jsonl`, `semantic.jsonl`, or `working_context_snapshot.json`.

## Functional Requirements

- REQ-001: New rotated raw trace segment files must be written directly under the run memory directory.
- REQ-002: New rotated raw trace segment files must be named `raw_traces_<zero-padded-index>.jsonl`, for example `raw_traces_000001.jsonl`.
- REQ-003: New raw trace manifests must be named `raw_traces_manifest.json`.
- REQ-004: `raw_traces.jsonl` must remain the active/current raw trace file.
- REQ-005: The manifest must continue recording segment metadata, including `file_name`, `boundary_key`, boundary type, status, timestamps, and record count.
- REQ-006: Boundary idempotency must continue using manifest `boundary_key`, not file names.
- REQ-007: Full raw trace corpus reads must continue returning rotated segment records plus active records, deduped and sorted as today.
- REQ-008: The layout change must apply through the shared raw trace segment/archive manager and therefore cover AutoByteus/native, Codex, and Claude Agent SDK archive writers uniformly.
- REQ-009: The store read path must continue reading old-layout manifest/segment files so historical data is accessible before or after migration.
- REQ-010: A required startup app-data migration must migrate old raw trace archive layouts to the new layout.
- REQ-011: The migration must scan both standalone agent run directories and team/member/task agent run directories under the configured memory directory.
- REQ-012: The migration must create a backup of the old manifest before replacing it with `raw_traces_manifest.json`.
- REQ-013: The migration must not delete old segment files or old archive directories until the corresponding new segment files and new manifest have been written successfully for that run.
- REQ-014: The migration must be idempotent: rerunning it after a successful migration must skip already-migrated runs without rewriting data unnecessarily.
- REQ-015: The migration must return app-data migration summaries/details with scanned, migrated, skipped, and failed counts, following the existing `AppDataMigrationDefinition` pattern.
- REQ-016: After a successful per-run migration, the original `raw_traces_archive_manifest.json` must be decommissioned by removing it or atomically renaming it to a backup path so reruns no longer treat it as authoritative old-layout evidence.
- REQ-017: The migration must define and enforce exact pending-entry behavior: complete entries are migrated; pending entries are not promoted into the new manifest; pending files, when present, are preserved as backup evidence; missing pending files do not fail migration; missing complete files fail that run and leave old files untouched.

## Acceptance Criteria

- AC-001: After new archive/rotation creation, the segment file exists at `<memoryDir>/raw_traces_000001.jsonl` and no new segment file is created under `<memoryDir>/raw_traces_archive/`.
- AC-002: The manifest for new writes exists at `<memoryDir>/raw_traces_manifest.json`.
- AC-003: New manifest entries record `file_name` values matching `^raw_traces_\d{6}\.jsonl$`.
- AC-004: `readCompleteArchiveRawTraceDicts()` reads records from new direct run-directory segment files.
- AC-005: `readCompleteArchiveRawTraceDicts()` still reads records from old manifest entries and old `raw_traces_archive/` segment files.
- AC-006: `readCompleteRawTraceCorpusDicts()` returns the same complete-history semantics: rotated/archive segment records plus active `raw_traces.jsonl` records in stable order.
- AC-007: Same-boundary replay returns the existing complete manifest segment and does not create a duplicate rotated raw trace file.
- AC-008: The app-data migration converts an old-layout run directory into the new layout, including segment files and `raw_traces_manifest.json`.
- AC-009: The app-data migration preserves old manifest metadata such as `boundary_key`, `boundary_type`, status, timestamps, and record count in the new manifest.
- AC-010: The app-data migration creates a manifest backup path and reports it in migration details for migrated runs.
- AC-011: The app-data migration skips already-new-layout runs and reports them as `SKIPPED`.
- AC-012: The app-data migration reports a per-run `FAILED` detail without aborting all runs when one run has malformed JSON or missing segment files.
- AC-013: The app-data migration is registered in `AppDataMigrationRegistry` and participates in required startup migrations.
- AC-014: Existing native, Codex provider boundary, and Claude compact boundary tests either pass unchanged through the shared manager or are updated to assert the new shared layout behavior.
- AC-015: After a successful migration, `raw_traces_archive_manifest.json` no longer exists at its original authoritative path; only `raw_traces_manifest.json`, new rotated segment files, and backup evidence remain.
- AC-016: Rerunning migration against a run with a valid `raw_traces_manifest.json` and only old-manifest backup evidence reports `SKIPPED` as already migrated.
- AC-017: If both new `raw_traces_manifest.json` and original `raw_traces_archive_manifest.json` exist, migration either completes old-manifest decommission after validating the new layout or reports `FAILED` for ambiguous partial state without deleting data.
- AC-018: Pending-entry migration behavior is covered: pending with file present is excluded from the new manifest and preserved in backup evidence; pending with missing file is excluded without failure; complete with missing file fails that run; stale pending plus complete for the same boundary migrates the complete entry and excludes the pending entry.

## Constraints / Dependencies

- The raw trace segment manager remains the single owner for rotated raw trace segment path/name creation.
- The manifest remains authoritative for segment discovery and boundary metadata; readers should not rely on directory scanning to reconstruct history.
- Migration must fit the existing app-data migration framework in `autobyteus-server-ts/src/app-data-migrations/`.
- Existing old layout data must stay readable through store APIs even if migration has not run.
- The current finalized base is `origin/personal` at `f83f18fb8ba8fb53167c9236c71b4d60be9b405a`.

## Assumptions

- The preferred final layout is exactly:

```text
raw_traces.jsonl
raw_traces_000001.jsonl
raw_traces_000002.jsonl
raw_traces_manifest.json
```

- Keeping the manifest is desired for idempotency and metadata.
- Removing timestamps from segment filenames is acceptable because the manifest stores archival timestamps.
- The migration should be a startup app-data migration rather than only a manual standalone script.

## Risks / Open Questions

- Risk: recursive scanning of team/member/task run directories must avoid treating arbitrary directories as run memory directories. Mitigation: migrate only directories containing old/new raw trace manifest files or old `raw_traces_archive/` evidence.
- Risk: moving large raw trace segment files during startup may take time on installations with many historical runs. Mitigation: migration is per-run, summarizes progress, and can report warnings/failures through the existing migration UI.
- Risk: partial migration must not lose data. Mitigation: prevalidate complete segment sources, write/copy new files first, write new manifest atomically, verify new files, preserve pending-file backup evidence, then decommission the original old manifest and remove old files/directories only after success.

## Requirement-To-Use-Case Coverage

| Requirement | UC-001 | UC-002 | UC-003 | UC-004 | UC-005 | UC-006 |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-001 | Yes | Yes | Yes | No | Yes | No |
| REQ-002 | Yes | Yes | Yes | No | Yes | No |
| REQ-003 | Yes | Yes | Yes | Yes | Yes | No |
| REQ-004 | Yes | Yes | Yes | Yes | No | No |
| REQ-005 | Yes | Yes | Yes | Yes | Yes | Yes |
| REQ-006 | Yes | Yes | Yes | No | Yes | Yes |
| REQ-007 | No | No | No | Yes | Yes | Yes |
| REQ-008 | Yes | Yes | Yes | No | No | No |
| REQ-009 | No | No | No | Yes | No | Yes |
| REQ-010 | No | No | No | No | Yes | No |
| REQ-011 | No | No | No | No | Yes | No |
| REQ-012 | No | No | No | No | Yes | No |
| REQ-013 | No | No | No | No | Yes | No |
| REQ-014 | No | No | No | No | Yes | Yes |
| REQ-015 | No | No | No | No | Yes | No |
| REQ-016 | No | No | No | No | Yes | Yes |
| REQ-017 | No | No | No | No | Yes | Yes |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion | Scenario Intent |
| --- | --- |
| AC-001 | Verifies direct same-folder rotated raw trace files. |
| AC-002 | Verifies the renamed manifest file. |
| AC-003 | Verifies simple number-only segment filenames. |
| AC-004 | Verifies new rotated segment files are readable. |
| AC-005 | Verifies old layout data remains readable. |
| AC-006 | Verifies full-history semantics are unchanged. |
| AC-007 | Verifies idempotency remains boundary-key based. |
| AC-008 | Verifies migration transforms old layout to new layout. |
| AC-009 | Verifies migration preserves manifest metadata. |
| AC-010 | Verifies migration backup/reporting behavior. |
| AC-011 | Verifies migration idempotency for already-migrated runs. |
| AC-012 | Verifies per-run failure isolation. |
| AC-013 | Verifies startup app-data migration integration. |
| AC-014 | Verifies all runtime paths benefit through the shared manager. |
| AC-015 | Verifies the original old manifest is decommissioned after successful migration. |
| AC-016 | Verifies rerun idempotency after successful migration. |
| AC-017 | Verifies partial old+new manifest state is handled deterministically. |
| AC-018 | Verifies exact pending-entry and missing-file migration policy. |

## Approval Status

Approved by user on 2026-06-17.
