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
copy the platform-owned Working Environment, Bash Operating Practice, File And
Directory Practice, Team Runtime rosters/protocols, configured skill bodies, or
tool schemas into `agent.md`. Authored Markdown headings are deterministically
nested below `Responsibilities and Boundaries` during composition.

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
automatically adds `send_message_to` and `delegate_task`; authors do not need to
duplicate those two names merely to make team membership functional. Other
tools remain explicitly configured and availability-gated.

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

## Built-In Agent Sync

Backend startup calls the unified built-in-agent bootstrapper in `src/built-in-agents/`. This subsystem owns platform infrastructure agent templates, syncs the registry-defined built-in agent ids into the normal runtime agent folder under `<appDataDir>/agents/`, resolves them through `AgentDefinitionService`, and initializes server settings that select infrastructure agents when required.

Built-in templates are centralized under `src/built-in-agents/templates/`:

- `memory-compactor/` syncs the normal shared `agents/autobyteus-memory-compactor/` definition with display name **Memory Compactor**.
- `retrospective-skill-improver/` syncs the normal shared `agents/autobyteus-retrospective-skill-improver/` definition with display name **Retrospective Skill Improver**. The persisted clean-state definition id is `autobyteus-retrospective-skill-improver`.

The built-in-agent bootstrapper owns this lifecycle:

- registry-defined built-in `agent.md` and `agent-config.json` files are overwritten from the built-in template registry on startup;
- standalone local agents that are not listed in `BUILT_IN_AGENT_DEFINITIONS`, user package roots, and application-owned package definitions are not part of this sync;
- the Memory Compactor is synchronized at fixed id `autobyteus-memory-compactor` without creating a user-selectable server-setting default;
- `AUTOBYTEUS_RETROSPECTIVE_SKILL_IMPROVER_AGENT_DEFINITION_ID` is initialized to `autobyteus-retrospective-skill-improver` only when the setting is blank; and
- the agent-definition cache is refreshed after built-in definitions resolve.

Internal built-in agent customization belongs in the bundled source templates or in a separate user/package-managed agent selected by the relevant server setting; app-data edits to registry-defined built-in ids are product-managed and will be overwritten by startup sync.

Do not add separate one-off built-in-agent bootstrappers or scatter platform templates under feature-runtime folders. The current `structured-json` compaction strategy always resolves the fixed built-in `autobyteus-memory-compactor`; it does not own the template/sync lifecycle and does not read `AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID`. A stale custom value for that removed selector is inert. The separate process-global `AUTOBYTEUS_COMPACTION_STRATEGY` setting selects the registered working-context algorithm for subsequent operations and must not be added to `AgentConfig` or agent definitions. Daily Assistant is not a server built-in or server-selected featured default; keep it in a user/private agent package such as `/Users/normy/autobyteus_org/autobyteus-private-agents/agents/daily-assistant/` and feature it through Settings when desired.

## Notes

- Canonical ids encode ownership provenance so callers can resolve application-owned and team-local agents deterministically.
- Team-local agent ids use the subject-specific nested-safe shape `team-local-agent:<encoded-owner-team-id>:<encoded-local-agent-id>`. The owner team id can itself be a canonical team-local team id, so local agents owned by local subteams resolve under the local subteam's `agents/` folder rather than the root parent team's `agents/` folder.
- `AgentDefinitionService` and the file provider remain the authoritative read/write boundary; callers should not reimplement ownership-path resolution.
- Application-owned agents can be edited in place when the owning bundle source is writable.
- Application-owned agents are not created or deleted through the shared standalone provider path.
- No generic agent Duplicate/Fork API exists; customization should happen in source packages, direct edits to user-owned standalone agents, or a newly created shared agent.
- `getAllAgentDefinitions()` still uses batched prompt mapping retrieval to avoid N+1 query patterns.
