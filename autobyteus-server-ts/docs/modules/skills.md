# Skills

## Scope

Skill catalog, retrieval, CRUD/version workflows, and configured runtime skill
resolution for agent definitions.

## TS Source

- `src/skills`
- `src/api/graphql/types/skills.ts`
- `src/agent-tools/skills`

## Main Service

- `src/skills/services/skill-service.ts`
- `src/skills/services/configured-agent-skill-resolver.ts`

## Global Skill Catalog

The Skills module has a global catalog surface backed by the configured skills
directories:

- the default skills directory from server config
- additional skills directories from server config

`SkillService.listSkills()` and `SkillService.getSkill(name)` are intentionally
global-catalog operations. They do not scan agent package definition roots for
private agent skills or team-shared package skills. The GraphQL `skills` and
`skill(name)` fields follow that same global-only boundary, so package-private
skills do not appear as standalone catalog rows.

Global catalog skills remain the source for normal Skills-page CRUD, versioning,
file-explorer workspaces, and UI selection during agent authoring.

## Configured Agent Skill Resolution

`agent-config.json.skillNames` is an ordered list of logical skill names. Runtime
bootstrap paths must resolve that list through
`SkillService.resolveConfiguredSkillsForAgent(agentDefinition)` rather than
calling the global catalog APIs directly.

The contextual resolver uses source metadata attached by the agent-definition
providers:

- `sourceInfo.agentDirPath` is the folder that contains the agent's `agent.md`
  and `agent-config.json`.
- `sourceInfo.teamDirPath` is present for team-local agents and points at the
  owning team folder.

For each configured skill name, resolution proceeds in this order:

1. agent-private multi-skill folder:
   `<agentDirPath>/skills/<skillName>/SKILL.md`
2. agent colocated root skill:
   `<agentDirPath>/SKILL.md`
3. owning-team shared skill for team-local agents:
   `<teamDirPath>/skills/<skillName>/SKILL.md`
4. global catalog fallback through `getSkill(skillName)`

Contextual candidates must contain `SKILL.md`, and that file's frontmatter
`name` must exactly match the configured skill name. Unsafe configured names
such as absolute paths, path separators, empty names, or `..` traversal are
skipped with a warning. Missing or invalid configured skills are skipped rather
than blocking bootstrap.

This lets an imported package carry private skill content beside its agent or
team without registering that content globally. Duplicate skill names across
configured/default/private/team-shared sources are product-excluded for this
ticket, so callers must not rely on duplicate-name collision or
source-disambiguation behavior.

## Supported Package Authoring Layouts

Shared/package-owned agents can use a single colocated skill:

```text
agents/my-agent/
  agent.md
  agent-config.json        # { "skillNames": ["my-private-skill"] }
  SKILL.md                 # frontmatter name: my-private-skill
```

They can also use multiple private skills:

```text
agents/my-agent/
  agent.md
  agent-config.json        # { "skillNames": ["tone", "outline"] }
  skills/
    tone/SKILL.md          # frontmatter name: tone
    outline/SKILL.md       # frontmatter name: outline
```

Team-local agents can use private member skills and owning-team shared skills:

```text
agent-teams/review-team/
  team.md
  team-config.json
  skills/
    shared-rubric/SKILL.md
  agents/reviewer/
    agent.md
    agent-config.json      # { "skillNames": ["private-tone", "shared-rubric"] }
    skills/
      private-tone/SKILL.md
```

Skill names are expected to be unique across configured global, agent-private,
and team-shared sources. Duplicate-name conflict behavior is intentionally out
of scope. If no contextual location matches the configured name, the resolver
falls back to the global catalog.
