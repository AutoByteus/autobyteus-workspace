# Requirements

- Ticket: `agent-run-id-sanitization`
- Status: `Design-ready`
- Scope: `Small`
- Last Updated: `2026-04-10`

## Problem Statement

The desktop/server runtime emitted a missing-memory-file warning for:

- `/Users/normy/.autobyteus/server-data/memory/agents/Xiaohongshu marketer_Xiaohongshu marketer_3615/raw_traces_archive.jsonl`

The user reported two concerns:

1. memory/run file naming appears to allow spaces and should use one unified safe naming method for both creation and lookup,
2. the runtime-generated identifier appears duplicated (`Xiaohongshu marketer_Xiaohongshu marketer_3615`) and the reason must be identified.

The user also requested that this work be executed under the software engineering workflow and migrated onto the dedicated ticket branch worktree.

## Requirements

- `REQ-001` Investigate all code paths that generate agent/run/member identifiers used as memory folder names or run ids in the current superrepo scope.
- `REQ-002` Identify the exact source of the duplicated identifier shape `name_role_suffix` and explain why `Xiaohongshu marketer_Xiaohongshu marketer_3615` was produced.
- `REQ-003` Ensure new readable agent/run identifiers use one shared normalization method across the relevant creation paths instead of duplicating divergent logic.
- `REQ-004` The shared normalization method must produce folder-safe identifiers and must not preserve raw spaces in newly generated readable ids.
- `REQ-005` If the normalized readable `name` and `role` collapse to the same value, the generated readable id must not duplicate that segment.
- `REQ-006` Investigate memory file read paths and confirm whether any lookup path currently depends on unsanitized names; fix mismatches if found.
- `REQ-007` Optional archive-memory files must not produce misleading error/warning logs when the file is absent by design.
- `REQ-008` Existing persisted runs must remain restorable by their stored run id; the fix is forward-looking for newly generated ids unless a separate migration is explicitly designed.
- `REQ-009` The ticket workflow artifacts must capture any broader findings about related code paths so the final implementation is not a narrow one-off patch.

## Non-Goals

- `NG-001` Do not rename or migrate already persisted historical run folders as part of this ticket.
- `NG-002` Do not redesign team member run-id generation, because current investigation shows it already uses a sanitized hashed format.
- `NG-003` Do not suppress all missing-memory warnings globally; only stop warning for files that are optional by design in the current read path.

## Acceptance Criteria

- `AC-001` Investigation notes enumerate the in-scope readable id generation and memory path lookup/create call sites that could affect this bug.
- `AC-002` The root cause of the duplicated `Xiaohongshu marketer_Xiaohongshu marketer_3615` id is documented with exact source references.
- `AC-003` New standalone AutoByteus readable run ids are generated through the shared normalization method rather than a duplicated server-local formatter.
- `AC-004` New runtime-generated readable ids contain folder-safe normalized segments and avoid duplicated identical `name`/`role` stems.
- `AC-005` Missing optional `raw_traces_archive.jsonl` files no longer emit misleading warning logs.
- `AC-006` Targeted automated tests cover the normalized readable id behavior and the optional archive-file warning behavior.
- `AC-007` The implementation is migrated onto the dedicated ticket worktree branch and does not remain only in the personal workspace.

## Use Cases

- `UC-001` Creating a new standalone AutoByteus run for an agent whose `name` and `role` are identical produces one normalized stem plus suffix, not a duplicated stem.
- `UC-002` Creating a new runtime-generated readable agent id for values containing spaces or punctuation produces a folder-safe identifier.
- `UC-003` Restoring or reading historical run memory by an existing persisted run id still works without a migration step.
- `UC-004` Reading memory for a run with no `raw_traces_archive.jsonl` file returns an empty archive result without emitting a misleading warning.

## Refined Decisions

- `D-001` The shared readable-id formatter in `autobyteus-ts` is the authoritative source for normalized readable standalone/new-agent ids.
- `D-002` `autobyteus-server-ts` standalone AutoByteus run provisioning must reuse that shared formatter rather than owning a duplicated server-local implementation.
- `D-003` Team/member run-id generation remains on the existing `buildTeamMemberRunId(...)` path and is explicitly out of scope for behavioral change.
- `D-004` Optional archive-file warning suppression is limited to the archive read path, preserving warning behavior for genuinely expected files.

## Open Questions

- No unresolved blockers remain for design.
