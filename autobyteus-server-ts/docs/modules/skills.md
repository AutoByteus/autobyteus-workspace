# Skills

## Scope

Skill catalog, retrieval, CRUD/file workflows, and configured runtime skill
resolution for agent definitions.

## TS Source

- `src/skills`
- `src/api/graphql/types/skills.ts`
- `src/agent-tools/skills`

## Main Service

- `src/skills/services/skill-service.ts`
- `src/skills/services/configured-agent-skill-resolver.ts`

## Skills Catalog

The Skills module has a normal catalog surface backed by configured skills
directories plus bundled skill layouts found in app-data and imported agent
package definition roots. The catalog is what the GraphQL `skills` and
`skill(name)` fields expose to the frontend Skills page and Skill Detail/File
Explorer flow.

Configured/global skill directories are scanned first:

- the default skills directory from server config
- additional skills directories from server config

After those directories, `SkillService.listSkills()` and
`SkillService.getSkill(name)` scan definition roots from app data and configured
agent package roots for bundled package skills:

- shared agent private skill folders:
  `agents/<agent-id>/skills/<skill-name>/SKILL.md`
- team-local agent private skill folders:
  `agent-teams/<team-id>/agents/<agent-id>/skills/<skill-name>/SKILL.md`
- owning-team shared skills:
  `agent-teams/<team-id>/skills/<skill-name>/SKILL.md`

Duplicate skill names use deterministic first-seen precedence: configured/global
skill directories win over later bundled package roots, and later duplicates are
skipped in the catalog.

Catalog skills remain the source for normal Skills-page browsing, Skill Detail
loading, File Explorer workspaces, and UI selection during agent authoring.
Create/edit behavior still depends on the existing Skills and File Explorer
operations plus the underlying filesystem permissions of each resolved skill
root. Repository-backed history, tags, and rollbacks are external to AutoByteus.

### Catalog Reload

The GraphQL `reloadSkillCatalog` mutation is the explicit user-command boundary
for refreshing the Skills page after files under already configured skill source
folders change on disk. It delegates to `SkillService.reloadSkillCatalog()`,
which performs a fresh catalog scan through the same `listSkills()` path and
returns refreshed `skills` plus refreshed `skillSources` metadata from
`getSkillSources()`.

Reload is global for all configured skill sources. It preserves existing
discovery ordering, duplicate first-seen precedence, malformed-skill
warning/skip behavior, and disabled-skill lookup by skill name. It is a catalog
and UI refresh for browsing and future selections; it does not mutate skill
material that has already been loaded into currently running agent sessions.

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

1. agent-private skill folder:
   `<agentDirPath>/skills/<skillName>/SKILL.md`
2. owning-team shared skill for team-local agents:
   `<teamDirPath>/skills/<skillName>/SKILL.md`
3. configured/global skill-directory fallback

Contextual candidates must contain `SKILL.md`, and that file's frontmatter
`name` must exactly match the configured skill name. Unsafe configured names
such as absolute paths, path separators, empty names, or `..` traversal are
skipped with a warning. Missing or invalid configured skills are skipped rather
than blocking bootstrap.

This lets an imported package carry private skill content beside its agent or
team while preserving source-context-first runtime resolution. Runtime fallback
is deliberately limited to configured/global skill directories, not the full
package-scanning catalog, so one package agent does not accidentally resolve a
different agent's private package skill. Duplicate skill names across
configured/default/private/team-shared sources should still be avoided; the
catalog uses first-seen precedence and the runtime resolver prefers the owning
context before global fallback.

## Runtime Consumption

Runtime bootstraps consume the resolved `Skill[]` records, not a package-wide
private skill scan.

- Codex materializes unresolved-by-native-Codex entries as
  `.codex/skills/<skillName>` directory symlinks whose targets are the exact
  resolved `Skill.rootPath` package roots.
- Native AutoByteus passes the exact resolved `Skill.rootPath` values to
  `AgentConfig.skills`, including package-private canonical skill roots under
  `skills/<skillName>`.
- GraphQL `skills` / `skill(name)` and the frontend Skills page expose bundled
  package skills as normal catalog entries when their package roots are
  available, so users can browse their `SKILL.md` content and files through the
  existing Skill Detail/File Explorer flow.

## Supported Package Authoring Layouts

Shared/package-owned agents use the same canonical foldered layout for one
skill or many skills:

```text
agents/my-agent/
  agent.md
  agent-config.json        # { "skillNames": ["my-private-skill", "optional-second-skill"] }
  skills/
    my-private-skill/
      SKILL.md             # frontmatter name: my-private-skill
    optional-second-skill/
      SKILL.md             # frontmatter name: optional-second-skill
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

Skill names should be unique across configured global, agent-private, and
team-shared sources. The catalog applies first-seen precedence for duplicate
names, while runtime resolution checks the owning agent/team context before it
falls back to configured/global skill directories.
