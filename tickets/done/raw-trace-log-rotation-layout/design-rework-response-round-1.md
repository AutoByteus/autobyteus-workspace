# Design Rework Response - Round 1

## Trigger

Architecture review round 1 failed with two design-impact findings in `/Users/normy/autobyteus_org/autobyteus-worktrees/raw-trace-log-rotation-layout/tickets/in-progress/raw-trace-log-rotation-layout/design-review-report.md`.

## DR-001 Resolution: Old Manifest Decommission / Rerun Idempotency

Updated requirements, investigation notes, and design spec to require an explicit successful post-migration final state:

- `raw_traces_manifest.json` is the only authoritative manifest after success.
- Original `raw_traces_archive_manifest.json` must be removed or atomically renamed/decommissioned after new manifest and new segment files are verified and backup evidence exists.
- Backup files such as `raw_traces_archive_manifest.json.backup-<timestamp>` do not count as old-layout evidence on rerun.
- Rerun behavior is now explicit:
  - new manifest present + original old manifest absent => `SKIPPED` already migrated.
  - new manifest present + original old manifest present => validate new layout and complete cleanup as `MIGRATED`, or `FAILED` if ambiguous/invalid without deleting data.

## DR-002 Resolution: Pending-Entry Migration Policy

Updated design with exact pending/missing file behavior:

- Complete entries with source files are migrated into the new manifest and segment files.
- Complete entries with missing source files fail that run and leave old authoritative files untouched.
- Pending entries are never promoted into the new manifest because current archive reads ignore pending entries.
- Pending entries with files have those files preserved as backup evidence outside `raw_traces_archive/`, then excluded from the new manifest.
- Pending entries with missing files are excluded and noted, but do not fail migration.
- Stale pending plus complete same-boundary migrates the complete entry and excludes/backs up pending evidence.
- Old manifests with only pending entries produce a new manifest with no segments and preserved `next_segment_index`, then decommission the old manifest.

## Updated Artifacts

- Requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/raw-trace-log-rotation-layout/tickets/in-progress/raw-trace-log-rotation-layout/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/raw-trace-log-rotation-layout/tickets/in-progress/raw-trace-log-rotation-layout/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/raw-trace-log-rotation-layout/tickets/in-progress/raw-trace-log-rotation-layout/design-spec.md`
