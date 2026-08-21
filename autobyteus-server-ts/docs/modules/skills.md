# Skills

## Scope

The Skills module owns managed skill discovery, catalog and GraphQL CRUD/file
workflows, and configured runtime skill resolution for agent definitions. It
does not own an agent-facing skill-tool boundary.

## TS Source

- `src/skills`
- `src/api/graphql/types/skills.ts`

## Main Service

- `src/skills/services/skill-service.ts`
- `src/skills/services/configured-agent-skill-resolver.ts`

## Skills Catalog

The Skills module has a normal catalog surface backed by configured skill
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

The administrative catalog is broader than any one agent's runtime configuration.
Listing or browsing a catalog skill does not grant an agent permission to use it.

### Catalog Reload

The GraphQL `reloadSkillCatalog` mutation is the explicit user-command boundary
for refreshing the Skills page after files under already configured skill source
folders change on disk. It delegates to `SkillService.reloadSkillCatalog()`,
which performs a fresh catalog scan through the same `listSkills()` path and
returns refreshed `skills` plus refreshed `skillSources` metadata from
`getSkillSources()`.

Reload is global for all configured skill sources. It preserves existing
discovery ordering, duplicate first-seen precedence, malformed-skill
warning/skip behavior, and disabled-skill lookup by skill name. It refreshes
administrative browsing and future selections. It does not rewrite a running
native agent's launch-time skill catalog; direct reads against an already
advertised path can still observe current file contents.

## Configured Agent Skill Resolution

`agent-config.json.skillNames` is an ordered list of logical skill names. Runtime
bootstrap paths must resolve that list through the contextual configured-skill
resolver rather than calling the global catalog APIs directly.

`SkillService.resolveConfiguredSkillBindingsForAgent(agentDefinition)` keeps
one ordered result for every safe configured name: a `resolved` binding carries
the current `Skill`, while an `unresolved` binding preserves the validated
logical name for runtime workspace reconciliation. Consumers that need only
available skills use the resolved-only
`resolveConfiguredSkillsForAgent(agentDefinition)` projection.

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
skipped with a warning and never become filesystem paths. Safe names whose
current source is missing or invalid remain `unresolved` bindings so Codex and
Claude can remove a stale broken runtime link before warning and omitting the
skill. Missing or invalid configured skills remain non-blocking.

This lets an imported package carry private skill content beside its agent or
team while preserving source-context-first runtime resolution. Runtime fallback
is deliberately limited to configured/global skill directories, not the full
package-scanning catalog, so one package agent does not accidentally resolve a
different agent's private package skill. Duplicate skill names across
configured/default/private/team-shared sources should still be avoided; the
catalog uses first-seen precedence and the runtime resolver prefers the owning
context before global fallback.

## Runtime Consumption

Runtime bootstraps consume contextual configured-skill results, not a
package-wide private skill scan. Native AutoByteus uses the resolved `Skill[]`
projection. Codex and Claude use the complete ordered binding projection so
their provider workspace paths can be reconciled even when an optional skill no
longer has a source.

### Native AutoByteus

The server passes the exact resolved `Skill.rootPath` values to
`AgentConfig.skills`. Core registers those roots and the mandatory native prompt
processor advertises only the configured skill name, description, and absolute
`SKILL.md` path, plus shared rules to read the entry point before governed work
and to resolve relative references from its directory.

The server does not register a `Skills` agent-tool category. Configured skill
bodies, file trees, and rewritten links are not returned through dedicated
skill tools and are not inserted into newly bootstrapped native prompts.
Agents that must inspect skill files need an explicitly configured
general-purpose reader such as `read_file`; skill configuration alone does not
grant one. The same applies to shell or execution tools needed by a skill.

The direct-read boundary deliberately uses normal tool behavior:

- an absolute catalog path can be passed directly to `read_file`;
- a relative skill reference uses the directory containing `SKILL.md` as its
  explicit absolute base directory;
- updated file content can be observed by a later read in the same run;
- missing or inaccessible files surface the reader's normal error.

The retired `get_available_skills`, `get_skill_content`, and `load_skill` names
are not registered runtime tools. Persisted agent definitions that still contain
one of those names rely on the existing missing-tool warning/skip behavior; the
name remains inert and does not recreate a compatibility tool.

### Codex and Claude

Codex and Claude use one profile-driven `WorkspaceSkillMaterializer` policy,
with provider-specific roots at `.codex/skills/<sanitized-skill-name>` and
`.claude/skills/<sanitized-skill-name>`. A resolved link targets the exact
contextual `Skill.rootPath`; no package-wide catalog lookup or source-tree copy
is performed.

Codex first asks `skills/list` which logical names the provider already
discovers. A discoverable name does not bypass reconciliation: a missing
AutoByteus workspace path remains absent, while a broken AutoByteus workspace
symlink is repaired to the current resolved source. Claude exposes every
resolved binding through its conventional workspace path. If provider discovery
fails, Codex falls back to resolved workspace-link exposure.

The shared path-state policy is deliberately narrow and non-destructive:

- a broken symlink is rechecked and only the link itself is unlinked; it is
  recreated when a valid current source exists, or removed and omitted when the
  safe configured name is unresolved;
- a missing or newly unavailable optional source is warned about and omitted;
- a same-source runtime link is reused, with path-keyed holder tracking and
  guarded cleanup after the final owner releases it;
- a live different-target symlink, file, directory, or other non-symlink path is
  a fatal collision and is never overwritten or trusted; and
- batch failure rolls back links acquired by that invocation without replacing
  the original failure.

Warnings include the runtime, run, skill, path, relevant old/current target, and
repair/skip disposition. Claude and Codex continue to use their
provider-specific bootstrap paths; the native catalog-only processor does not
replace those paths.

### Access modes and historical context

Normal launches use configured-only behavior. `PRELOADED_ONLY` remains the
internal/default runtime value for "use the agent definition's configured
skills"; despite the retained name, it does not mean that native prompt bodies
are preloaded. `NONE` remains available for internal no-skill suppression. The
removed legacy `GLOBAL_DISCOVERY` value is not accepted by public GraphQL inputs
or SDK contracts. Existing persisted run/team/channel records that still
contain that legacy value are rewritten to `PRELOADED_ONLY` by the required
startup app-data migration `20260706_remove_global_skill_discovery_mode`.

Historical native working-context snapshots remain exact. A pre-change snapshot
may therefore retain historical embedded skill content; restore does not merge
or rewrite it to the new catalog/path-only shape. The new prompt contract applies
to newly bootstrapped native prompts.

## Supported Package Authoring Layouts

Shared/package-owned agents use the same canonical foldered layout for one skill
or many skills:

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

## Operational Limits

The catalog/path contract makes relevant instructions discoverable but does not
guarantee model compliance. LLM choice to read and follow a skill remains
stochastic. Deterministic coverage can verify resolution, prompt content,
explicit tool authorization, and direct file freshness, not compliance on every
model turn.
