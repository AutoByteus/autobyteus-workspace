# Design Impact Resolution: No Migration Policy For Memory Metadata Removal

## Trigger

Architecture review round 1 raised `AR-001` because raw trace archive/prune rewrite paths copy raw dictionaries, so old raw records containing removed `tags` / `tool_result_ref` could be reserialized unless a sanitizer is added or the requirement is clarified.

A later architecture clarification explicitly rejected the sanitizer/migration direction:

- no migration code,
- no compatibility code,
- no scrubber/sanitizer code for historical memory,
- historical memory can be dropped/ignored/reset and is not worth making the current codebase messy.

## Final Resolution

Do **not** add `RunMemoryFileStore` raw rewrite sanitization for stale records.

The target behavior is:

- Current schemas remove the fields.
- Current append/serialization paths do not write the fields.
- Current DTO/projection paths do not expose the fields.
- Stale compacted semantic memory is dropped/reset by the existing semantic schema gate.
- Stale raw/episodic historical JSONL files are not migrated, scrubbed, sanitized, or compatibility-loaded by this ticket.

This resolves `AR-001` by explicitly relaxing the earlier raw/episodic stale-file cleanup expectation. The design no longer claims that historical raw archive/prune rewrites must strip old extras. It only requires current schemas and current writes to omit them.

## Artifact Updates

Updated:

- `<TASK_WORKTREE>/tickets/in-progress/remove-memory-tags-reference/requirements.md`
- `<TASK_WORKTREE>/tickets/in-progress/remove-memory-tags-reference/investigation-notes.md`
- `<TASK_WORKTREE>/tickets/in-progress/remove-memory-tags-reference/design-spec.md`
- `<TASK_WORKTREE>/tickets/in-progress/remove-memory-tags-reference/design-impact-resolution-raw-rewrite-sanitization.md` marked superseded

Key changes:

- REQ-007 is now `no_raw_episodic_migration`.
- AC-005 now prohibits migration/compatibility fixtures for stale raw/episodic files.
- The design spec removes the DS-006 rewrite-sanitizer spine and all `RunMemoryFileStore` sanitizer ownership.
- The design explicitly rejects raw/episodic migration/scrubber/sanitizer code in the backward-compatibility log and refactor sequence.

## Implementation Guidance

Implementation should delete current metadata fields and update current writers/tests/docs only.

Implementation must not:

- add raw/episodic migration utilities,
- add raw trace rewrite sanitizers,
- add compatibility loaders for removed metadata,
- add tests that seed old raw/episodic JSONL solely to prove scrub/migration behavior.
