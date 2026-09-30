# Skills

## Scope

The Skills module owns the one-skill-per-name catalog, skill-name validation at
import, GraphQL CRUD/file workflows, and configured runtime skill resolution for
agent definitions. It
does not own an agent-facing skill-tool boundary.

## TS Source

- `src/skills`
- `src/api/graphql/types/skills.ts`

## Main Service

- `src/skills/services/skill-service.ts`
- `src/skills/services/skill-catalog.ts`
- `src/skills/services/configured-agent-skill-resolver.ts`
- `src/skills/services/runtime-default-skill-folders.ts`

## Skills Catalog

The Skills module has one catalog: exactly one skill per name (D-19, REQ-022).
`SkillService.listInstalledSkillRecords()` scans every source in precedence
order and keeps the first copy of each name. The Skills page, `skillStore`, the
Chat `/` menu, `ALL_INSTALLED` agents and configured agents all use that copy.

Precedence (tier, then order within the tier):

1. AutoByteus's own skills folder (`config.getSkillsDir()`).
2. Definition-root bundles: the app data dir, then the agent package roots
   (`AUTOBYTEUS_AGENT_PACKAGE_ROOTS`) in order. Within a root: `agents/*` by
   name, then `agent-teams/*` by name (each team's shared skills, then its
   agents), then `agent-orgs/*` by name (each Org's org-owned agents by name,
   then its org-owned teams by name: the team's shared skills, then its local
   agents). The app data dir's Orgs live in `config.getAgentOrgsDir()`; a
   package root's in `<packageRoot>/agent-orgs`.
3. Added skill folders (`AUTOBYTEUS_SKILLS_PATHS`) that are not runtime default
   folders, in Settings order.
4. Runtime default folders, only if added: `$CODEX_HOME/skills` (default
   `~/.codex/skills`), `~/.claude/skills`, `~/.agents/skills`, `~/.grok/skills`.
   They are recognised by realpath (`runtime-default-skill-folders.ts`) and
   always come after tiers 1–3, whatever the Settings order.

Bundled layouts inside a definition root:

- shared agent private skill folders:
  `agents/<agent-id>/skills/<skill-name>/SKILL.md`
- team-local agent private skill folders:
  `agent-teams/<team-id>/agents/<agent-id>/skills/<skill-name>/SKILL.md`
- owning-team shared skills:
  `agent-teams/<team-id>/skills/<skill-name>/SKILL.md`
- Agent Org-owned agents (`agent_private`, the agent folder is the root):
  `agent-orgs/<org>/agents/<agent>/skills/<skill-name>/SKILL.md`
- Agent Org-owned teams: shared skills (`team_shared`) in
  `agent-orgs/<org>/agent-teams/<team>/skills/<skill-name>/SKILL.md`, and their
  local agents (`agent_private`, the team folder is the root) in
  `agent-orgs/<org>/agent-teams/<team>/agents/<agent>/skills/<skill-name>/SKILL.md`

Org-owned agent and team folders come from the exact owned-source correlation
(`correlateAgentOrgOwnedMembers` in
`agent-org-definition/providers/agent-org-owned-definition-correlation.ts`,
read synchronously for the catalog by `listAgentOrgOwnedDefinitionSourcesSync`
and asynchronously for the definition providers by
`listAgentOrgOwnedDefinitionSources`). A folder that no `org_local` member
correlates with is not scanned, and an Org has no org-level `skills/` folder.

An added skill folder is scanned both as a skills folder (including nested
`skills` folders; a nested link back to a scanned folder is skipped) and as a
definition root. A folder reached through two sources is one copy. Symlinked
skill folders and folders without a parsable `SKILL.md` are not catalog copies;
a folder is catalogued under the name its `SKILL.md` declares.

Each record (`src/skills/domain/installed-skill-record.ts`) carries the parsed
`Skill`, its `origin` (`global`, `agent_private` or `team_shared`), the
trusted and configured roots of its layout, its `tier` and its `sourcePath`.

### Ignored copies (REQ-024)

A later copy of a name is ignored. `SkillService.listSkillNameIssues()` returns
`{ name, usedPath, ignoredPaths, kind }`: `conflict` when the ignored copies are
in tiers 1–3 (the user should fix them), `shadowed_runtime_default` when they
are in a runtime default folder (informational). The issues are logged whenever
they change, and the GraphQL `skillNameIssues` query feeds the Skills page
banner. Ignored copies are not addressable by name.

### Name-based operations (AR-013)

`SkillService.getSkill(name)` is `resolveCatalogRecord(name)?.skill`, the used
copy. GraphQL `skill(name)`, the file tree, `updateSkill`, `deleteSkill`,
enable/disable, file upload/read/delete, `getSkills` and the skill file
workspace therefore always act on the used copy, never on an ignored one.
Edit and delete still depend on the filesystem permissions of that copy.

The administrative catalog is broader than any one agent's runtime configuration.
Listing or browsing a catalog skill does not grant an agent permission to use it.

### Import validation (REQ-023)

`SkillService.validateIncomingSkillNames(source)` checks an incoming source
against the installed copies; `assertNoIncomingSkillNameConflicts` throws
`SkillNameConflictError` on a conflict. A second copy of a name among tiers 1–3
is a conflict, including two copies inside the incoming source. A duplicate
against a runtime default folder is not an error: the tier 1–3 copy wins and a
notice is logged. The incoming source's own folders are not counted as existing
copies, so reloading or updating a package in place only conflicts with other
sources. Every caller validates before it commits, so a rejected operation
changes nothing:

- `SkillService.addSkillSource`, before `AUTOBYTEUS_SKILLS_PATHS` is persisted;
- `SkillService.createSkill`, against tiers 1–3;
- `AgentPackageService.importAgentPackage`: a local path before it is
  registered; a GitHub download before it is recorded (a rejected download is
  deleted);
- `AgentPackageService.updateAgentPackage`: the staged revision is rolled back
  and the record and update status stay as they were;
- `AgentPackageService.reloadAgentPackage` (R-3): the previous registration is
  kept. Files already on disk stay; the catalog and the banner reflect them.

GraphQL surfaces the error as `Duplicate skill names: <names>` with
`extensions: { code: 'SKILL_NAME_CONFLICT', conflicts: [{ name, existingPath,
incomingPath }] }` (`src/api/graphql/errors/skill-name-conflict-graphql-error.ts`).

### Catalog Reload

The GraphQL `reloadSkillCatalog` mutation is the explicit user-command boundary
for refreshing the Skills page after files under already configured skill source
folders change on disk. It delegates to `SkillService.reloadSkillCatalog()`,
which performs a fresh catalog scan through the same `listSkills()` path and
returns refreshed `skills` plus refreshed `skillSources` metadata from
`getSkillSources()`. It does not rewrite a running native agent's launch-time
skill catalog; direct reads against an already advertised path can still
observe current file contents.

## Configured Agent Skill Resolution

`agent-config.json.skillNames` is an ordered list of logical skill names. Every
safe configured name resolves by name against the catalog
(`resolveCatalogRecord`), the same copy the Skills page and `ALL_INSTALLED`
agents use. An agent that ships its own copy of a name uses it only if that copy
is the catalog's (DEC-017); import validation keeps custom sources free of such
duplicates.

`SkillService.resolveConfiguredSkillBindingsForAgent(agentDefinition)` keeps
one ordered result for every safe configured name: a `resolved` binding carries
the catalog `Skill` and its source roots, while an `unresolved` binding
preserves the validated logical name for runtime workspace reconciliation.
Consumers that need only available skills use the resolved-only
`resolveConfiguredSkillsForAgent(agentDefinition)` projection. Unsafe configured
names (absolute paths, path separators, empty names, `..` traversal) are skipped
with a warning. Missing configured skills remain non-blocking.

The detailed (AGY) variant builds each binding from the catalog record through
`ConfiguredAgentSkillResolver.resolveInstalledRecordDetailed(record)`: the
record path applies the provenance, source-safety, manifest and fingerprint
checks, and a bundled folder whose name does not match its manifest `name` is
reported as `name_mismatch`. A name the catalog does not have is
`certified_absent`.

**Boundary: application-owned agents.** Agents with
`ownershipScope: 'application_owned'` are sandboxed bundles, not installed
skills. They resolve each configured name from their bundle first
(`sourceInfo.agentDirPath/skills/<name>`, then `sourceInfo.teamDirPath/skills/<name>`,
whose manifest name must match), then from the catalog.

### `ALL_INSTALLED` scope

When an agent definition has `skillScope: ALL_INSTALLED`,
`resolveConfiguredSkillBindingsForAgent(Detailed)` does not read `skillNames`.
It builds bindings from the enabled catalog records at run start, so a skill
bundled inside another agent package folder binds to that folder.

`SkillService.hasEffectiveSkills(agentDefinition)` answers whether the
definition would expose any skill under its scope (any non-empty configured name for
`CONFIGURED`; any enabled catalog record for `ALL_INSTALLED`). Runtime
factories use it instead of inspecting `skillNames` so that an
`ALL_INSTALLED` agent with an empty `skillNames` list still enables skill
support. For `ALL_INSTALLED`, disabled skills are excluded from both the
bindings and this check.

## Runtime Consumption

Runtime bootstraps consume the catalog-backed configured-skill results. Native AutoByteus uses the resolved `Skill[]`
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
catalog `Skill.rootPath`; no source-tree copy is performed.

Codex first asks `skills/list` which skills the provider already discovers.
Codex also reads its own default folder and does not de-duplicate same-named
skills, so a name is `reconcile-discoverable` only when every enabled entry
Codex lists for it has the catalog copy's directory (the realpath of its
`SKILL.md` directory). Otherwise the chosen copy is exposed through the
workspace link, and a differing Codex copy is logged as `codex-runtime-duplicate`
(name, Codex paths, chosen path). A discoverable name does not bypass
reconciliation: a missing AutoByteus workspace path remains absent, while a
broken AutoByteus workspace symlink is repaired to the current resolved source.
Claude exposes every resolved binding through its conventional workspace path.
If provider discovery fails, Codex falls back to resolved workspace-link
exposure.

The shared path-state policy is deliberately narrow and non-destructive:

- a broken symlink is rechecked and only the link itself is unlinked; it is
  recreated when a valid current source exists, or removed and omitted when the
  safe configured name is unresolved;
- a missing or newly unavailable optional source is warned about and omitted;
- a same-source runtime link is reused, with path-keyed holder tracking and
  guarded cleanup after the final owner releases it;
- a live different-target symlink, file, directory, or other non-symlink path is
  a collision and is never overwritten or trusted (a fatal one for configured
  requests; see the workspace collision policy below); and
- batch failure rolls back links acquired by that invocation without replacing
  the original failure.

Warnings include the runtime, run, skill, path, relevant old/current target, and
repair/skip disposition. Claude and Codex continue to use their
provider-specific bootstrap paths; the native catalog-only processor does not
replace those paths.

### Workspace collision policy (`ALL_INSTALLED` versus configured)

The same materializer also serves ACP/Grok (`.grok/skills`). With one skill per
name, runs that share a workspace ask for the same source for a name and share
its link (one holder per acquisition; the link is removed once no holder
remains, and only while it still points at the entry's source). A different
source for a live path only follows an out-of-band catalog change and fails
fast with the source collision error.

Every call carries one `workspaceCollisionPolicy` for the run, which the
bootstrappers and factories (Codex, Claude, ACP/Grok, AGY) derive from
`SkillService.resolveSkillScope` through `workspaceCollisionPolicyForScope`.
The materializers never read `skillScope` themselves.

- **Rule 1 — a user-owned workspace entry** (a non-symlink, or a link the
  registry does not own): `prefer_workspace` (`ALL_INSTALLED`) leaves it in
  place, omits its own copy and logs `skipped-workspace-owned`; the runtime
  discovers the workspace skill natively. `fail` (configured) keeps the path
  collision error. AGY applies the same rule to
  `<workspace>/.agents/skills/<name>` (`AGY_SKILL_NAME_COLLISION` for `fail`
  only).

### Historical context

There is no run-level skill switch. The agent definition (`skillScope` /
`skillNames`) is the only authority for which skills a run has, and every
runtime always exposes those effective skills. The former run-level skill
access mode (`PRELOADED_ONLY` / `NONE`, and earlier `GLOBAL_DISCOVERY`)
is gone from launch inputs, GraphQL, SDK contracts and newly written run
history; a value in older run history is ignored on read.

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

Skill names must be unique across AutoByteus's skills folder, agent packages
and added skill folders: import validation rejects a duplicate, and the catalog
uses exactly one copy of a name if a duplicate appears outside the app.

## Operational Limits

The catalog/path contract makes relevant instructions discoverable but does not
guarantee model compliance. LLM choice to read and follow a skill remains
stochastic. Deterministic coverage can verify resolution, prompt content,
explicit tool authorization, and direct file freshness, not compliance on every
model turn.
