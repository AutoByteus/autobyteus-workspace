# Investigation Notes

## Scope Triage

- Scope: `Medium`
- Reason:
  - backend persistence rules for agent definitions and team definitions must change
  - bundled-skill discovery crosses definition-source and skill-service boundaries
  - tests need coverage across provider, service, and GraphQL paths

## Reproduction Summary

1. User clones `/Users/normy/autobyteus_org/autobyteus-agents`.
2. User registers that repository root as a definition source.
3. Imported agents become visible in the UI.
4. Editing and saving an imported agent fails with:
   - `Agent definition 'requirements-engineer' is read-only or does not exist in default source.`
5. Registering the same root as a skill source reports `0 skills`.

## Code Findings

### Imported definition edit failure

- `autobyteus-server-ts/src/agent-definition/providers/file-agent-definition-provider.ts`
  - `update()` checks only `this.getAgentDir(id)`, which always points at the default source.
  - imported agents can be read from additional roots via `getReadAgentRoots()`, but updates ignore those roots.
- `autobyteus-server-ts/src/agent-team-definition/providers/file-agent-team-definition-provider.ts`
  - team updates follow the same default-root-only pattern.
- Result:
  - imported definitions are readable but not writable even when the external filesystem path is writable.

### Imported skill discovery failure

- Imported package layout:
  - `agents/<agent-id>/SKILL.md`
  - example: `/Users/normy/autobyteus_org/autobyteus-agents/agents/requirements-engineer/SKILL.md`
- `autobyteus-server-ts/src/skills/services/skill-service.ts`
  - `scanDirectory()` loads skills only from:
    - direct child folders that contain `SKILL.md`
    - nested `skills/` folders
  - it does not scan `agents/<agent-id>/SKILL.md`
- Result:
  - adding the repository root as a skill source returns `0 skills` even though agent-local skills exist.

### Bundled skill association gap

- Imported agent configs in the package are mostly `{}` and do not declare `skillNames`.
- Runtime execution in:
  - `autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts`
  - `autobyteus-server-ts/src/agent-team-execution/services/agent-team-run-manager.ts`
  - resolves only `agentDef.skillNames`.
- Result:
  - bundled skill discovery and runtime skill attachment are separate concerns
  - runtime skill attachment should remain explicit through `agent-config.json.skillNames`

## Product Interpretation

- Current behavior is internally inconsistent:
  - definition sources are treated as readable registries
  - skill sources are treated as standalone skill roots
  - imported agent packages bundle `SKILL.md` beside agents
- The user expectation is reasonable:
  - importing an agent package should not require a second, different mental model just to make the package’s own skill available
  - cloned external sources in a writable local repo should be editable

## Chosen Direction

- Imported agent and team definitions should be editable when their source directory is writable.
- Update and delete operations should target the resolved source root instead of assuming the default source.
- Definition-source roots should contribute bundled agent-local skills automatically.
- Bundled skills should be discoverable from definition roots, but never auto-attached by convention.
- Runtime skill attachment remains explicit through `agent-config.json.skillNames`.

## Touched Boundaries

- `autobyteus-server-ts/src/agent-definition/...`
- `autobyteus-server-ts/src/agent-team-definition/...`
- `autobyteus-server-ts/src/skills/services/skill-service.ts`
- GraphQL/e2e/integration/unit tests for definition sources and skill discovery
