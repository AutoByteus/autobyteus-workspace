# Requirements

## Metadata

- Ticket: `imported-definition-editability-skill-import`
- Status: `Design-ready`
- Scope: `Medium`
- Owner: `Codex`
- Last Updated: `2026-03-08`

## User Intent

Fix the imported-definition workflow so a user who clones an external definition package, registers that package as a source, and opens an imported agent or agent team can edit it without hitting the backend error:

`Agent definition 'requirements-engineer' is read-only or does not exist in default source.`

Also investigate why skills inside the imported package are not discovered by the skill-source import flow, even though the user expects the imported agent package to bring its own skills with it.

## Problem Statement

The current import flow lets users register an external filesystem root that contains `agents/` and `agent-teams/`. Imported definitions become visible in the UI, but saving edits fails because update operations only write to the default definition source. Separately, skills under the imported package are not surfaced unless a separate skill-source import succeeds, and the current package shape appears to yield `0 skills`.

This creates two user-facing failures:

1. Imported definitions look editable in the UI, but saving fails at runtime.
2. Imported agents may depend on colocated skills, but users have no clear or automatic path to make those skills available.

## User Evidence

- Repro path:
  - clone remote repository containing agent definitions
  - register the repository root under Settings -> Import
  - open an imported agent
  - attempt to add a tool and save
- Observed error:
  - `Failed to update agent definition: Error: Agent definition 'requirements-engineer' is read-only or does not exist in default source.`
- Additional observation:
  - importing the same root as a skill source reports `0 skills` despite the package containing a skill the agent is expected to use.

## Requirements

- `REQ-001` Imported agent definitions that come from a registered external definition source must have a coherent editability model.
- `REQ-002` If imported definitions are editable, save operations must persist back to the correct source root instead of assuming the default source.
- `REQ-003` If a definition is intentionally non-editable, the UI must communicate that before the user enters an edit flow or attempts to save.
- `REQ-004` Skill discovery for imported packages must be analyzed against the supported skill source format and the product should provide a coherent user path for agent-associated skills.
- `REQ-005` The import UX must make the relationship between definition sources and skill sources clear enough that users can predict what will and will not be imported.

## Decisions

- `DEC-001` Registered external definition sources are treated as writable package roots when the filesystem path itself is writable.
- `DEC-002` Imported definition updates and deletes must target the resolved source root that supplied the definition.
- `DEC-003` Definition-source roots contribute bundled skills from `agents/<agent-id>/SKILL.md`; users should not need a duplicate manual import just to access those bundled skills.
- `DEC-004` Bundled skill discovery does not imply runtime attachment; only explicit `agent-config.json.skillNames` determines which skills load for an agent run.

## Acceptance Criteria

- `AC-001` Editing an imported agent definition succeeds when the imported source is intended to be writable by product design.
- `AC-002` Editing an imported agent definition is blocked in the UI with a precise explanation when the imported source is intentionally read-only by product design.
- `AC-003` The backend no longer emits the misleading "does not exist in default source" failure for a normal imported-definition edit attempt without corresponding product handling.
- `AC-004` Investigation identifies whether skill import failure is caused by unsupported folder layout, incorrect skill metadata shape, or missing linkage between definition import and skill import flows.
- `AC-005` The chosen implementation either auto-discovers colocated skills from the imported root or explicitly guides the user through the supported separate import path with accurate counts and messaging.

## Open Questions

- Are external definition sources meant to be first-class writable sources, or are they intentionally read-only in v1?
- Should definition-source import and skill-source import stay separate concepts, or should one root be able to register both when it contains both supported directory layouts?
- What exact skill directory layout exists in the user’s imported package, and does it match the currently supported skill-source contract?
