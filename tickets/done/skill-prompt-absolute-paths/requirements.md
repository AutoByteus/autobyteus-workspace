# Requirements

- Ticket: `skill-prompt-absolute-paths`
- Status: `Design-ready`
- Scope Classification: `Small`
- Last Updated: `2026-04-08`

## Goal / Problem Statement

AutoByteus runtime already exposes the correct absolute `Skill Base Path` to the model, but preloaded and on-demand skill content still contain raw relative internal links. A live failure showed `architect-designer` emitting a wrong absolute `read_file` path after doing its own path arithmetic. The runtime should remove that arithmetic burden by rewriting resolvable internal skill links to absolute filesystem paths before the model sees them.

## Requirements

### `REQ-001` Prompt-visible skill content must rewrite resolvable internal relative links

When AutoByteus injects skill content into model-visible output, it must rewrite resolvable relative Markdown link targets against the skill root so the rendered content contains usable absolute filesystem paths instead of raw relative targets.

### `REQ-002` Existing non-relative link targets must remain unchanged

External URLs, anchors, already-absolute targets, and unresolved relative targets must remain unchanged so the formatter does not corrupt non-file references or invent paths for missing files.

### `REQ-003` Rewritten links must preserve the user-facing label and use the skill-root path

Only the Markdown link target should change. The visible link label must stay the same. For symlinked entries, the rewritten target must use the symlink path under the skill root, not the symlink's resolved target path.

### `REQ-004` Both model-visible skill-content surfaces must behave consistently

The preloaded skill prompt processor and the `load_skill` tool output must use the same rewriting behavior so AutoByteus does not keep two inconsistent path-handling modes for the same skill content.

### `REQ-005` Validation must cover architect-style relative references

Automated tests must cover same-directory, child-directory, and parent-relative skill references using fixtures shaped like the software-engineering-team architect skills.

## In-Scope Use Cases

- `UC-001`: A preloaded skill contains `[design-principles.md](design-principles.md)` and the injected prompt shows the absolute path under the skill root.
- `UC-002`: A preloaded skill contains `[common-design-patterns.md](references/common-design-patterns.md)` and the injected prompt shows the correct absolute path in a child folder.
- `UC-003`: A skill contains `[spine-first-design-examples.md](../architect-designer/references/spine-first-design-examples.md)` and the emitted content shows the correct absolute parent-relative target when the file exists.
- `UC-004`: A skill contains external or non-file references and those targets remain unchanged.
- `UC-005`: The `load_skill` tool returns the same absolute-target rewriting behavior as the preloaded prompt processor.

## Acceptance Criteria

- `AC-001` (`REQ-001`, `UC-001`): Preloaded skill prompt injection rewrites resolvable relative Markdown link targets to absolute filesystem paths based on the skill root.
- `AC-002` (`REQ-001`, `UC-002`): Child-folder references such as `references/common-design-patterns.md` rewrite correctly when the target exists.
- `AC-003` (`REQ-001`, `UC-003`): Parent-relative references such as `../architect-designer/references/spine-first-design-examples.md` rewrite correctly when the target exists.
- `AC-004` (`REQ-002`, `UC-004`): External URLs, anchors, already-absolute paths, and unresolved targets remain unchanged.
- `AC-005` (`REQ-003`, `UC-001`, `UC-002`, `UC-003`): Rewritten output preserves the visible Markdown link label and uses the usable absolute path under the skill root without exposing symlink-target metadata.
- `AC-006` (`REQ-004`, `UC-005`): `load_skill` output uses the same rewritten target behavior as preloaded prompt injection.
- `AC-007` (`REQ-005`, `UC-001`, `UC-002`, `UC-003`, `UC-004`, `UC-005`): Automated unit or integration coverage guards the rewritten output for architect-style links and unchanged non-relative targets.

## Constraints / Dependencies

- Skills must remain authored with portable relative links on disk.
- The implementation should avoid broad free-text path replacement and instead target actual Markdown link targets.
- The fix belongs in `autobyteus-ts`, where prompt-visible skill content is formatted.
- No new dedicated skill-file tool is in scope.

## Assumptions

- The model benefits materially from seeing absolute internal skill paths instead of relative targets.
- Markdown links are the primary internal-reference syntax used by the affected skills.
- Rewriting the link target while preserving the label is sufficient; a file tree is not required for this ticket.

## Open Questions / Risks

- Risk: Some future skill may rely on a non-Markdown reference convention that this ticket will not rewrite.
- Risk: A shared formatter touching both preloaded injection and `load_skill` slightly broadens the patch, but it removes the duplicate failure mode cleanly.

## Requirement-To-Use-Case Coverage

| Requirement ID | Covered Use Cases |
| --- | --- |
| `REQ-001` | `UC-001`, `UC-002`, `UC-003` |
| `REQ-002` | `UC-004` |
| `REQ-003` | `UC-001`, `UC-002`, `UC-003` |
| `REQ-004` | `UC-005` |
| `REQ-005` | `UC-001`, `UC-002`, `UC-003`, `UC-004`, `UC-005` |

## Acceptance-Criteria-To-Scenario Intent Mapping

| Acceptance Criteria ID | Scenario Intent |
| --- | --- |
| `AC-001` | Verify same-directory relative Markdown link rewriting in preloaded prompt output |
| `AC-002` | Verify child-directory relative Markdown link rewriting in preloaded prompt output |
| `AC-003` | Verify parent-relative Markdown link rewriting in prompt-visible skill content |
| `AC-004` | Verify non-relative and unresolved targets remain unchanged |
| `AC-005` | Verify rewritten output keeps the original link label and does not expose symlink-target details |
| `AC-006` | Verify `load_skill` returns the same rewritten link targets |
| `AC-007` | Verify automated coverage exists for the architect-style reference mix |

## Evidence

- User-provided runtime screenshots show the prompt already includes the correct `Skill Base Path`, while the agent still emitted an incorrect absolute `read_file` path.
- `tickets/done/skill-prompt-absolute-paths/investigation-notes.md` records the current prompt processor behavior, `load_skill` behavior, and the architect-skill reference patterns that must be covered.
