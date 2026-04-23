# Requirements

- Status: `Design-ready`
- Ticket: `whole-skill-symlink-materialization`
- Scope Classification: `Medium`

## Goal / Problem Statement

The current runtime-owned skill materialization paths create copied workspace bundles. That causes stale behavior when the source skill changes after materialization, and the current Codex fallback also uses unintuitive hash-suffixed folder names under `.codex/skills/`. Investigation proved that the real Codex runtime can discover a whole-directory symlinked skill folder and does not require `agents/openai.yaml` for discovery. We need to replace copy-based runtime-owned skill materialization with whole-directory symlinks where applicable, keep workspace paths intuitive, preserve correct cleanup ownership, and determine Claude parity in the same ticket because the Claude backend currently has the same stale-copy behavior.

## In-Scope Use Cases

- `UC-001`: A Codex-configured skill is already discoverable by `skills/list`, so bootstrap keeps skipping runtime-owned workspace materialization for that skill.
- `UC-002`: A Codex-configured skill is missing from live discovery, so fallback materialization creates a whole-directory symlink under workspace `.codex/skills/` that points to the source skill root.
- `UC-003`: A missing Codex-configured skill relies on shared files outside its own folder through internal relative paths, and the whole-directory symlink keeps that original layout valid.
- `UC-004`: A Claude-configured skill is materialized into workspace `.claude/skills/`, and the runtime uses a whole-directory symlink instead of a copied bundle so source updates are visible immediately.
- `UC-005`: A runtime-owned workspace skill path already exists at the intuitive location, and the runtime must distinguish safe reuse/removal of the same source-target symlink from unsafe collisions with different content.

## Out Of Scope

- Supporting Windows-specific symlink behavior.
- Redesigning Codex same-name reuse policy beyond the existing `skills/list` preflight.
- Introducing a new workspace-global shared mirror such as `.codex/shared/...`.
- Requiring runtime-owned generated metadata files to be written back into source skill roots.

## Requirements

### `R-001`

The current `origin/personal` architecture remains the implementation context for this ticket.

### `R-002`

Codex must keep its existing `skills/list` preflight behavior so same-name discoverable skills continue to skip runtime-owned workspace materialization.

### `R-003`

When Codex fallback materialization is still required, the runtime must create a whole-directory symbolic link from workspace `.codex/skills/<intuitive-name>` to the source skill root instead of copying the skill tree.

### `R-004`

The Codex fallback materialized folder name must be intuitive and must not include the current hash suffix.

### `R-005`

Codex fallback materialization must not require `agents/openai.yaml` generation or any other runtime-owned file write into the source skill root.

### `R-006`

Claude workspace skill materialization must stop copying configured skill trees into `.claude/skills/` and must instead use a whole-directory symbolic link to the source skill root.

### `R-007`

Neither backend may write runtime-owned ownership markers or other runtime metadata into a source skill root when the workspace materialization path is a directory symlink.

### `R-008`

Cleanup must remove only runtime-owned workspace symlinks and must never delete the source skill root or any user-owned/discoverable external skill directory.

### `R-009`

If the intuitive workspace skill path already exists and is not the expected runtime-owned symlink to the same source root, the runtime must fail loudly instead of hiding the collision behind a suffix or overwriting unrelated content.

### `R-010`

The new symlink-based materialization path must preserve the original source-root-relative layout so skills that rely on sibling/shared paths outside their immediate folder continue to work.

### `R-011`

The runtime behavior must no longer go stale after source skill updates solely because of copied workspace bundles.

### `R-012`

Validation must cover the new symlink-based materialization contract, the no-suffix naming contract, and cleanup/collision ownership behavior for each touched backend.

## Acceptance Criteria

### `AC-001`

Investigation and durable validation show that the Codex runtime can discover a whole-directory symlinked project skill and does not require `agents/openai.yaml` for that discovery path.

### `AC-002`

Targeted Codex tests prove that missing configured skills now materialize as whole-directory symlinks with intuitive workspace folder names and no hash suffix.

### `AC-003`

Targeted tests prove that the new Codex symlink-based materialization keeps external/shared relative paths usable without introducing a `.codex/shared/...` mirror.

### `AC-004`

Targeted tests prove that cleanup removes only runtime-owned symlink materializations and rejects or preserves unsafe path collisions correctly.

### `AC-005`

Targeted Claude tests prove that workspace skill materialization now uses whole-directory symlinks instead of copies and therefore no longer relies on copied bundles for configured skills.

### `AC-006`

The final implementation changes only the current owning Codex/Claude subsystem paths and removes any now-obsolete copied-bundle assumptions inside the changed scope.

## Constraints / Dependencies

- Use the software engineering workflow skill process for this ticket.
- The user explicitly wants whole-directory symbolic links rather than copied bundles.
- The user explicitly wants the Codex suffix-based workspace folder naming removed.
- Claude live verification may be limited by local account access; if that remains true later, the validation plan must record the constraint rather than hiding it.

## Assumptions

- Codex discovery behavior observed in investigation is representative of the target runtime contract for this ticket.
- Claude Code project skill loading will treat a directory symlink under `.claude/skills/` as equivalent to a normal skill directory, unless later validation disproves it.
- Skill names are unique enough in a given configured-skill set that explicit collision errors are preferable to automatic suffixing.

## Open Questions / Risks

- Live Claude symlink proof was blocked by local org access during investigation, so Claude runtime viability is still lower-confidence than Codex until more validation is available.
- Some existing tests and docs may encode copied-bundle or marker-file assumptions that need coordinated updates.
- If either backend internally normalizes skill directories in a way not covered by current investigation, a later validation round may reopen the design.

## Requirement Coverage

| Requirement ID | Use Case(s) |
| --- | --- |
| `R-001` | `UC-001`, `UC-002`, `UC-003`, `UC-004`, `UC-005` |
| `R-002` | `UC-001`, `UC-002` |
| `R-003` | `UC-002`, `UC-003`, `UC-005` |
| `R-004` | `UC-002`, `UC-005` |
| `R-005` | `UC-002` |
| `R-006` | `UC-004`, `UC-005` |
| `R-007` | `UC-002`, `UC-004`, `UC-005` |
| `R-008` | `UC-002`, `UC-004`, `UC-005` |
| `R-009` | `UC-005` |
| `R-010` | `UC-003`, `UC-004` |
| `R-011` | `UC-002`, `UC-004` |
| `R-012` | `UC-001`, `UC-002`, `UC-003`, `UC-004`, `UC-005` |

## Acceptance Criteria To Validation Intent

| Acceptance Criteria ID | Validation Intent |
| --- | --- |
| `AC-001` | Stage 1 investigation evidence plus Codex-focused durable validation updates |
| `AC-002` | Codex unit/integration validation around symlink materialization and naming |
| `AC-003` | Codex validation focused on shared/sibling path behavior under whole-directory symlinks |
| `AC-004` | Codex and Claude validation around cleanup ownership and collision handling |
| `AC-005` | Claude unit validation plus best available executable evidence |
| `AC-006` | Diff review against current owning subsystem paths |
