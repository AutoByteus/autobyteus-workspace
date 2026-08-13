# Working Environment Prompt Specification

## Status

Approved intended-behavior supplement — approved with `requirements.md` on 2026-08-12

## Purpose

Pin down the necessary runtime-specific workspace-versus-skill path contract. This is part of the always-present agent foundation, not a general behavioral-advice section.

## Scope

- Always-present working-environment semantics.
- Runtime binding of the configured agent workspace.
- Separation of the workspace from configured skill locations.
- No change to lazy skill selection or tool authorization.
- No generic advice that capable models already follow without prompting.

## Canonical Relationship

An agent reads a skill from its skill package directory and applies that skill to work on the task in its agent workspace.

## Proposed Prompt Text

```md
## Working Environment

- Agent workspace: `{{workspace_root_path}}`
- Use skills from their skill package directories to work on tasks in the agent workspace.
- A skill package directory contains the skill's instructions and bundled assets. It is not the agent workspace, and reading the skill does not change the agent workspace.
- Resolve skill-package references from the skill package directory. Resolve task and project locations from the agent workspace unless an explicit target says otherwise.
- Do not modify a skill package unless the task explicitly targets that skill package.
- With no working-directory override, `pwd` returns the agent workspace. An explicit working directory changes only that command's location; it does not redefine the workspace.
```

## Binding Rules

- `{{workspace_root_path}}` is a specification placeholder, not literal prompt text or an XML element. Each adapter binds it to the exact absolute directory it resolved and will use as that run's default working directory: native `workspaceInstance.getBasePath()`, Codex `workingDirectory`, or Claude `workingDirectory`.
- A missing, blank, or non-absolute resolved workspace is a bootstrap error before provider invocation. The composer must not render an empty value, guess from a skill path, or substitute stale run metadata.
- The workspace value is a runtime fact; users do not duplicate it in agent-authored instructions.
- Skill paths remain owned by the configured skill catalog. They are not copied into this block.
- Tool schemas remain authoritative for whether a tool accepts `cwd`, `base_dir`, absolute paths, or paths outside the workspace.
- The statement about `pwd` applies only when the shell command does not provide a working-directory override. `pwd` reports the effective command directory, which can be a permitted subdirectory when an override is supplied.
- Generic instructions such as “understand the task,” “verify,” or “report clearly” are deliberately excluded. They belong only in an applicable skill when a concrete workflow requires more specific behavior.
- The separation applies to every skill package.
- The complete source and failure matrix is authoritative in `prompt-value-binding-spec.md`.

## Examples

### External skill source

- Agent workspace: `/workspaces/project-a`
- Applicable skill manifest: `/shared/agent-skills/review/SKILL.md`
- Task source file: `/workspaces/project-a/src/service.ts`

The agent reads the manifest from `/shared/agent-skills/review/SKILL.md`, resolves any relative skill references from `/shared/agent-skills/review`, and performs the review against `/workspaces/project-a`.

Reading that skill does not change the workspace to `/shared/agent-skills/review`. Any task output is written under `/workspaces/project-a` unless the task explicitly names another target.

### Nested task directory

- Agent workspace: `/workspaces/monorepo`
- Target project: `/workspaces/monorepo/packages/api`

The workspace remains `/workspaces/monorepo`. A command explicitly run with `cwd=/workspaces/monorepo/packages/api` has that nested effective working directory; its `pwd` result does not redefine the agent workspace.

## Related Authority

- Requirements: `BEH-001`, `BEH-002`, `BEH-005`; `R-001`, `R-002`, `R-007`; `AC-001`, `AC-002`, `AC-007`
- Investigation evidence: `investigation-notes.md`
