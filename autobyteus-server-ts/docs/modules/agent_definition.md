# Agent Definition

## Scope

Defines agent blueprints for shared standalone agents, team-local agents, and application-owned agents. This module owns persisted agent metadata, ownership provenance, and shareable default launch configuration.

## TS Source

- `src/agent-definition`
- `src/api/graphql/types/agent-definition.ts`
- `src/agent-tools/agent-management`
- `src/built-in-agents` (platform-provided built-in agent templates and startup sync)

## Main Service

- `src/agent-definition/services/agent-definition-service.ts`
- `src/agent-definition/providers/file-agent-definition-provider.ts`

## Ownership Model

| Ownership scope | Backing source shape | Notes |
| --- | --- | --- |
| `SHARED` | `agents/<agent-id>/` | normal standalone agent path |
| `TEAM_LOCAL` | `<owner-team>/agents/<agent-id>/`, including nested owners such as `agent-teams/<parent>/agent-teams/<child>/agents/<agent-id>/` and `applications/<application-id>/agent-teams/<team-id>/agent-teams/<child>/agents/<agent-id>/` | excluded from normal Agents browse/search; surfaced through owning-team provenance and direct known-id routes |
| `APPLICATION_OWNED` | `applications/<application-id>/agents/<agent-id>/` | surfaced in the generic Agents UI with owning-application / package provenance |

## Source Metadata For Runtime Skills

File-backed agent providers attach non-persisted `sourceInfo` to loaded
`AgentDefinition` instances. `sourceInfo.agentDirPath` points at the source
folder for the current agent definition. Team-local agents also carry
`sourceInfo.teamDirPath` for the owning team folder.

Runtime bootstrap uses this metadata through
`SkillService.resolveConfiguredSkillsForAgent(...)` to resolve
`agent-config.json.skillNames` contextually. That boundary supports
agent-private skills under the agent folder, owning-team shared skills for
team-local members, and then global skill fallback. Callers should not
reconstruct `agents/`, `agent-teams/`, or application-owned paths themselves;
`AgentDefinitionService` and the file providers remain the authoritative source
for both definition identity and source-path context.

## Runtime Prompt Authoring

The selected definition supplies only the agent-owned portion of the Carpenter
runtime prompt:

- `name` is required and renders under `Agent Identity`;
- non-blank `description` renders as the identity description;
- the non-blank `agent.md` body renders under `Responsibilities and Boundaries`;
- the optional persisted `role` does not render in Agent Identity; and
- a blank body remains absent instead of falling back to the description.

Keep the body specific to the agent's responsibilities and boundaries. Do not
copy the platform-owned native Working Environment, Bash Operating Practice,
File And Directory Practice, AgentTeam Addressing/Collaboration guidance,
configured skill bodies, or tool schemas into `agent.md`. Authored Markdown
headings are deterministically nested below `Responsibilities and Boundaries`
during composition.

For example:

```markdown
---
name: Release Reviewer
description: Reviews release readiness and rollback evidence.
category: delivery
---

Check that the tested candidate, durable documentation, and release notes agree.
Block publication when required evidence or a rollback path is missing.
```

`agent-config.json.skillNames` selects ordinary configured lazy skills, while
`toolNames` selects explicitly configured capabilities. A valid team runtime
automatically adds `get_handoff_rules`, `send_message_to`, and `delegate_task`;
authors do not need to duplicate those three names merely to make team
membership functional. Other tools remain explicitly configured and
availability-gated.

Agent definitions contain no prompt-processor selection field, and the
create/update/read/GraphQL/frontend surfaces must not create a parallel prompt
mutation option. Runtime prompt structure is the closed platform composition documented in
[Prompt Engineering And Runtime Instruction Composition](./prompt_engineering.md).

## Default Launch Config

Agent definitions now persist `defaultLaunchConfig` alongside the rest of the definition metadata.

`defaultLaunchConfig` contains:

- `llmModelIdentifier`
- `runtimeKind`
- `llmConfig`

These defaults are consumed by:

- the native agent create/edit/detail surfaces,
- direct agent launch preparation, and
- application-authored backend orchestration flows that choose to reuse persisted defaults when calling `context.agentExecution.startAgent(...)`.

The generic Applications host no longer launches embedded agents directly at page-load time.

## Skill Scope

Every agent definition carries `skillScope` (`AgentSkillScope`), persisted in `agent-config.json` and exposed through GraphQL create/update/read and the agent-definition tools as `skill_scope`:

- `CONFIGURED` (default; also used for any missing or unknown persisted value) exposes only the configured `skillNames`.
- `ALL_INSTALLED` exposes every enabled installed skill in the catalog at run start. `skillNames` is kept in the definition but is not consulted while the scope is `ALL_INSTALLED`.

`normalizeAgentSkillScope` in `src/agent-definition/domain/models.ts` is the single normalization point. Effective skill resolution for either scope is owned by `SkillService` (see `skills.md`); runtime factories never branch on the scope themselves.

## Built-In Agent Sync

Backend startup calls the unified built-in-agent bootstrapper in `src/built-in-agents/`. This subsystem owns platform built-in agent templates, syncs the registry-defined built-in agent ids into the normal runtime agent folder under `<appDataDir>/agents/`, resolves them through `AgentDefinitionService`, and initializes server settings that select infrastructure agents when required.

Built-in templates are centralized under `src/built-in-agents/templates/`. Every built-in agent is platform-owned:

- `retrospective-skill-improver/` syncs the shared `agents/autobyteus-retrospective-skill-improver/` definition with display name **Retrospective Skill Improver**. The persisted clean-state definition id is `autobyteus-retrospective-skill-improver`.
- `daily-assistant/` syncs the shared `agents/autobyteus-daily-assistant/` definition with display name **General Agent**. It is the default agent of the web Chat entry, ships with the general tool set (including `read_file` for cataloged `SKILL.md` files and opt-in `list_available_agents` for accessible specialist agents and teams) and `skillScope: ALL_INSTALLED`, and is exported as `DAILY_ASSISTANT_AGENT_DEFINITION_ID`.

The built-in-agent bootstrapper owns this lifecycle:

- every built-in has its `agent.md` and `agent-config.json` rewritten from the template on every startup, and its `skills/` folder mirrored from the template (removed when the template has none); app-data edits to those ids, including edits to the General Agent's prompt, tools, model defaults, skill scope or agent-local skills, do not survive restart;
- standalone local agents that are not listed in `BUILT_IN_AGENT_DEFINITIONS`, user package roots, and application-owned package definitions are not part of this sync;
- `AUTOBYTEUS_RETROSPECTIVE_SKILL_IMPROVER_AGENT_DEFINITION_ID` is initialized to `autobyteus-retrospective-skill-improver` only when the setting is blank; and
- the agent-definition cache is refreshed after built-in definitions resolve.

Internal infrastructure-agent customization belongs in the bundled source templates or in a separate user/package-managed agent selected by the relevant server setting.

Do not add separate one-off built-in-agent bootstrappers or scatter platform
templates under feature-runtime folders. Native compaction now constructs an
isolated tool-free LLM directly; it has no synchronized Memory Compactor agent,
registry-selected algorithm or child Agent runtime. Old compactor-agent files and
removed selector/strategy setting values are inert for compaction and are neither
imported nor deleted. The optional current model/config tuple is server-owned,
not an AgentDefinition selector. The General Agent is not auto-featured;
featured placement stays an operator choice in Settings.

## Notes

- Canonical ids encode ownership provenance so callers can resolve application-owned and team-local agents deterministically.
- Team-local agent ids use the subject-specific nested-safe shape `team-local-agent:<encoded-owner-team-id>:<encoded-local-agent-id>`. The owner team id can itself be a canonical team-local team id, so local agents owned by local subteams resolve under the local subteam's `agents/` folder rather than the root parent team's `agents/` folder.
- `AgentDefinitionService` and the file provider remain the authoritative read/write boundary; callers should not reimplement ownership-path resolution.
- Application-owned agents can be edited in place when the owning bundle source is writable.
- Application-owned agents are not created or deleted through the shared standalone provider path.
- No generic agent Duplicate/Fork API exists; customization should happen in source packages, direct edits to user-owned standalone agents, or a newly created shared agent.
- `getAllAgentDefinitions()` still uses batched prompt mapping retrieval to avoid N+1 query patterns.
