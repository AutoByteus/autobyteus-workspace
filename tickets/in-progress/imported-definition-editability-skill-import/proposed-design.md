# Proposed Design

## Objective

Make imported definition packages behave as first-class local packages:

- imported agent and team definitions remain readable with first-hit precedence
- imported definitions can be edited and deleted in place when the source path is writable
- bundled agent-local `SKILL.md` files are discoverable through the skill service
- runtime skill attachment remains explicit through `agent-config.json.skillNames`

## Current Failure

- Read path:
  - definition providers read from `[default root, additional definition roots...]`
- Write path:
  - definition providers write only to the default root
- Skill discovery path:
  - skill service scans standalone skill directories and nested `skills/`
  - agent-local `agents/<id>/SKILL.md` is ignored
- Runtime skill resolution:
  - execution resolves only `agentDef.skillNames`

## Design Changes

### D-001 Resolved-source writes for definitions

- Replace default-root-only update/delete logic with source resolution:
  - locate the definition in the same ordered roots used for reads
  - write back to the resolved source path
  - reject only when the definition does not exist or the resolved source path is not writable
- Apply the same rule to both agent definitions and agent teams.

### D-002 Bundled skill discovery from definition roots

- Extend `SkillService` to treat definition roots as additional bundled-skill contributors.
- Supported bundled layout:
  - `<definition-root>/agents/<agent-id>/SKILL.md`
- Preserve existing precedence:
  - default standalone skills
  - additional standalone skill sources
  - bundled skills from default definition root
  - bundled skills from additional definition roots

### D-003 Explicit-only skill attachment

- Bundled skill discovery does not imply runtime attachment.
- Agent definitions expose only the explicit `skillNames` from `agent-config.json`.
- A bundled `SKILL.md` may exist in the agent folder and still remain unattached until the user or package author explicitly adds that skill name to `agent-config.json`.

## Affected Files

- `autobyteus-server-ts/src/agent-definition/providers/file-agent-definition-provider.ts`
- `autobyteus-server-ts/src/agent-team-definition/providers/file-agent-team-definition-provider.ts`
- `autobyteus-server-ts/src/skills/services/skill-service.ts`
- server tests covering definition-source mutation, provider behavior, and skill discovery

## Risks

- Name collisions between standalone skills and bundled skills.
  - Mitigation: preserve deterministic first-hit precedence with standalone skills first.
- Implicit bundled-skill attachment could surprise definitions that intentionally want zero skills.
  - Mitigation: keep runtime attachment explicit through `skillNames` only.
- External source permissions may still be read-only at the filesystem level.
  - Mitigation: fail with a writable-source-specific error instead of the current default-source error.
