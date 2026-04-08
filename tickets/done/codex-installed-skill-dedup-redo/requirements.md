# Requirements

- Status: `Design-ready`
- Ticket: `codex-installed-skill-dedup-redo`
- Scope Classification: `Medium`

## Goal / Problem Statement

Redo the Codex installed-skill dedupe ticket from scratch on the latest `personal` branch. In the current architecture, configured Codex skills should not be materialized into workspace `.codex/skills` when Codex already discovers a skill with the same logical `name`; when discovery does not find the skill, runtime materialization must still produce a usable self-contained bundle.

## In-Scope Use Cases

- `UC-001`: A configured skill already exists in Codex discovery (`skills/list`) with the same `name`, so workspace materialization is skipped.
- `UC-002`: A configured skill does not exist in Codex discovery, so the runtime materializes a workspace-owned copy and uses it normally.
- `UC-003`: A configured skill contains symlinks inside or just outside its source tree, and runtime materialization produces a usable self-contained bundle on macOS/Linux.
- `UC-004`: The implementation fits the current `personal` architecture and does not revive obsolete `runtime-execution` layout or legacy compatibility paths.

## Out Of Scope

- Changing Codex skill selection semantics beyond same-name dedupe for configured skills.
- Supporting Windows-specific filesystem behavior.
- Reusing or salvaging code from the stale March worktree without revalidation in the current layout.

## Requirements

### `R-001`

The latest `personal` branch architecture must be the implementation context for this ticket.

### `R-002`

Before workspace skill materialization, the runtime must query Codex `skills/list` for the active working directory and compare configured skills by logical skill `name`.

### `R-003`

If Codex discovery already exposes a skill with the same `name`, the runtime must skip workspace materialization for that configured skill.

### `R-004`

If Codex discovery does not expose the configured skill name, the runtime must materialize a workspace-owned copy that remains usable by Codex.

### `R-005`

If the `skills/list` probe fails, the runtime must fall back to workspace materialization rather than block run startup.

### `R-006`

When runtime materialization is required, source skill content that is reached through symlinks must remain usable after the copy, even when the original symlink target was expressed as a relative path outside the copied skill root.

### `R-007`

Cleanup must remove only runtime-owned materialized skill bundles and must not delete reused external Codex skills.

### `R-008`

Validation must cover the current Codex code path well enough to detect regressions in skill reuse, fallback materialization, symlink preservation, and the touched integration path.

## Acceptance Criteria

### `AC-001`

In the latest `personal` layout, the configured-skill materialization flow issues a `skills/list` request for the active working directory before copying a configured skill into workspace `.codex/skills`.

### `AC-002`

Targeted tests prove that an already discoverable skill name skips materialization while a missing skill name still materializes.

### `AC-003`

Targeted tests prove that a failed discovery probe falls back to runtime-owned materialization and that cleanup only removes runtime-owned bundles.

### `AC-004`

Targeted tests prove that runtime materialization turns symlinked source content into a self-contained usable bundle on macOS/Linux assumptions, without depending on the original skill tree or a separately mirrored `.codex/shared/...` structure.

### `AC-005`

The final implementation changes only the current owning Codex subsystem paths and leaves obsolete `runtime-execution` files untouched or absent.

### `AC-006`

The current Codex configured-skill executable validation path passes on the latest `personal` architecture after the change.

## Constraints / Dependencies

- Base all code and tests on current `origin/personal`.
- Use the current Codex client/bootstrap/materializer architecture rather than stale runtime service files.
- Keep code edits locked until investigation, requirements, design, and review gates are ready.

## Assumptions

- Skill `name` is the right dedupe key for this product decision.
- `skills/list` remains available from the Codex app server in the current architecture.
- Same-name collisions from unrelated third-party skills are acceptable to treat as reuse for this ticket unless investigation proves otherwise.

## Open Questions / Risks

- The latest `personal` branch may have moved the relevant Codex bootstrap/materializer responsibilities again relative to the stale branch.
- The right place to acquire and release a discovery client may have changed in the current runtime-management layer.
- Existing Codex integration coverage may already encode expectations that need to be updated rather than duplicated.

## Requirement Coverage

| Requirement ID | Use Case(s) |
| --- | --- |
| `R-001` | `UC-004` |
| `R-002` | `UC-001`, `UC-002`, `UC-004` |
| `R-003` | `UC-001`, `UC-004` |
| `R-004` | `UC-002`, `UC-004` |
| `R-005` | `UC-002`, `UC-004` |
| `R-006` | `UC-003` |
| `R-007` | `UC-001`, `UC-002` |
| `R-008` | `UC-001`, `UC-002`, `UC-003`, `UC-004` |

## Acceptance Criteria To Validation Intent

| Acceptance Criteria ID | Validation Intent |
| --- | --- |
| `AC-001` | Source inspection plus unit coverage around bootstrap/materializer wiring |
| `AC-002` | Materializer unit coverage for discoverable-skill reuse and missing-skill materialization |
| `AC-003` | Materializer unit coverage for discovery-failure fallback and cleanup ownership |
| `AC-004` | Materializer coverage proving self-contained symlinked-content materialization |
| `AC-005` | Diff review against current `personal` file ownership |
| `AC-006` | Current Codex configured-skill executable validation on latest `personal` |
