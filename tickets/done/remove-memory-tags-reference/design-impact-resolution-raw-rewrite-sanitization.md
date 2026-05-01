# Superseded Design Impact Resolution: Raw Rewrite Sanitization

## Status

Superseded on 2026-05-01 by explicit no-migration/no-compatibility clarification.

This note is retained only as review history. Do not implement the raw rewrite sanitizer direction described in the earlier version of this artifact.

## Superseding Decision

The project policy is strict: no backward compatibility code and no migration code for stale memory shapes. Historical memory can be dropped/ignored/reset; it does not justify adding old-schema migration, scrubber, sanitizer, or compatibility logic.

For `AR-001`, the accepted resolution is therefore **not** to add `RunMemoryFileStore` stale-record sanitization. Instead:

- Current model shapes remove `tags`, `reference`, and `toolResultRef` / `tool_result_ref`.
- Current writers stop producing removed fields.
- Current docs/tests stop presenting removed fields as current contract.
- Existing compacted semantic memory with removed fields is dropped/reset through the existing schema gate.
- Existing raw/episodic historical JSONL bytes are not migrated, scrubbed, sanitized, compatibility-loaded, or given special stale-fixture tests.

## Replacement Artifact

Use the no-migration resolution artifact instead:

- `<TASK_WORKTREE>/tickets/in-progress/remove-memory-tags-reference/design-impact-resolution-no-migration-policy.md`
