# Agent Definition

## Scope

Defines agent blueprints for shared standalone agents, team-local agents, and application-owned agents. This module owns persisted agent metadata, ownership provenance, and shareable default launch configuration.

## TS Source

- `src/agent-definition`
- `src/api/graphql/types/agent-definition.ts`
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
File And Directory Practice, collaboration guidance (`Working With Other Agents`),
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
- direct agent launch preparation,
- delegated catalog copies that an agent starts with `delegate_task`. The agent, or each Team member, runs on its own usable default first, then its Team's default, then the run root's settings. See [Launch configuration of catalog copies](./agent_communication.md#launch-configuration-of-catalog-copies),
- the web Team and Org launch forms, which seed each member row from its usable default (see [Agent Team Definition](./agent_team_definition.md#default-launch-preferences)), and
- application-authored backend orchestration flows that choose to reuse persisted defaults when calling `context.agentExecution.startAgent(...)`.

A default is used only as a whole (runtime, model and model settings together) and only when it is usable: it names both a runtime and a model, the runtime is available, and the model and its settings are valid for it. An unusable default is skipped with a visible note. Delegation to a configured placement uses that placement's own launch configuration, not the definition default.

The generic Applications host no longer launches embedded agents directly at page-load time.

## Skill Scope

Every agent definition carries `skillScope` (`AgentSkillScope`), persisted in `agent-config.json` and exposed through GraphQL create/update/read and the agent-definition tools as `skill_scope`:

- `CONFIGURED` (default; also used for any missing or unknown persisted value) exposes only the configured `skillNames`.
- `ALL_INSTALLED` exposes every enabled installed skill in the catalog at run start. `skillNames` is kept in the definition but is not consulted while the scope is `ALL_INSTALLED`.

`normalizeAgentSkillScope` in `src/agent-definition/domain/models.ts` is the single normalization point. Effective skill resolution for either scope is owned by `SkillService` (see `skills.md`); runtime factories never branch on the scope themselves.

## Internal Agents

An agent definition may carry `"internal": true` in its `agent-config.json`
(shared, team-local and application-package definitions read it the same way;
absent or anything but `true` is a normal agent). An internal agent is the
system's own helper, such as the Model Router. `AgentDefinition.internal` holds
it, `normalizeAgentConfigRecord` reads it, and `buildAgentConfigRecord` writes it
only for an internal agent, so a save keeps it and a normal agent's file gains
no key. GraphQL exposes it as `AgentDefinition.internal` (the Agents page's
"Internal" badge).

The server setting **Show internal agents** (`AUTOBYTEUS_SHOW_INTERNAL_AGENTS`,
`true`/`false`, default off; `src/config/show-internal-agents-setting.ts`) is
read on every call, so a change applies to the next list without a restart. It
can be set in Settings → Server Settings → Basics or as an environment variable.

`InternalAgentVisibility` (`src/agent-definition/services/internal-agent-visibility.ts`)
is the one rule: a definition is hidden when it is internal and the setting is
off. Every place where the user or an agent browses, picks or delegates asks it;
none reads the setting or the attribute itself:

| Surface | Owner that asks the rule |
| --- | --- |
| Agents page, every agent picker (new run, team members, Org placement, featured items), mobile apps, application resources | `AgentDefinitionService.getVisibleAgentDefinitions` (GraphQL `agentDefinitions`) |
| `list_available_agents`, `@` candidates and `@` by ID, `delegate_task` catalog addresses, a peer node's available agents and delegation | `CollaboratorCandidatePolicy.isEligibleAgent` (the rule is injected through `createCollaboratorDefinitionCatalog`) |
| Run history | `AgentRunHistoryService.listRunHistory` (rows of hidden definitions) |
| Memory page | `AgentMemoryExplorerService` (the agent list and its runs) |

While hidden, `delegate_task` to an internal agent's address gets the usual
"not the address of an available agent or agent team" refusal, which reveals
nothing. Hidden is not protected: opening a definition or a run by ID
(`agentDefinition(id)`, the run projection) works
whatever the setting, and system-started runs of internal agents run and are
recorded as usual. Internal Agent Teams are not a feature; built-in agents stay
excluded from collaboration whatever the setting.

Tests: unit `tests/unit/agent-definition/internal-agents.test.ts` and
`tests/unit/agent-collaboration/collaborators/internal-agent-eligibility.test.ts`;
E2E `tests/e2e/agent-definitions/internal-agents.e2e.test.ts` (IA-01…05: list,
save, run history and Memory page with a real recorded run, `list_available_agents`,
`@` and `delegate_task` over Agent Tools MCP with the scripted AGY CLI
(`RUN_AGY_FAILURE_E2E=1`), the setting); RC-38 in
`tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts` (a
peer's offer and delegation).

## Built-In Agent Sync

Backend startup calls the unified built-in-agent bootstrapper in `src/built-in-agents/`. This subsystem owns platform built-in agent templates, syncs the registry-defined built-in agent ids into the normal runtime agent folder under `<appDataDir>/agents/`, and resolves them through `AgentDefinitionService`.

Built-in templates are centralized under `src/built-in-agents/templates/`. Every built-in agent is platform-owned:

- `daily-assistant/` syncs the shared `agents/autobyteus-daily-assistant/` definition with display name **Daily Assistant** and role **General Agent**. It is the default agent of the web Chat entry, ships with the general tool set (including `read_file` for cataloged `SKILL.md` files and opt-in `list_available_agents` for accessible specialist agents and teams) and `skillScope: ALL_INSTALLED`, and is exported as `DAILY_ASSISTANT_AGENT_DEFINITION_ID`.

- `model-router/` syncs `agents/autobyteus-model-router/` (`MODEL_ROUTER_AGENT_DEFINITION_ID`), the **Model Router** agent: marked `"internal": true`, so it is hidden while "Show internal agents" is off, and run only by Model Routing in its own internal workspace (see [Model Routing](model_routing.md)).

Daily Assistant is a displayed name, not a new definition:
`autobyteus-daily-assistant`, the `daily-assistant/` template directory and
`DAILY_ASSISTANT_AGENT_DEFINITION_ID` stay unchanged. Normal startup refreshes
the platform-owned definition; existing runs, saved references and stored
collaboration addresses remain directly usable without migration or reset.
Older history may still show the earlier label General Agent, which a
previous release displayed.

The shipped prompt allows straightforward work directly and specialist
collaboration when useful. `list_available_agents` is selected by this definition,
but runtime availability and eligible catalog definitions still follow the existing
context/eligibility rules. Discovery is not an installed-public-package inventory
and does not grant the specialist's skills to the caller. Direct work uses relevant
available skills or reasoning/tools; no guaranteed delegation or routing order is
introduced.

The built-in-agent bootstrapper owns this lifecycle:

- every built-in has its `agent.md` and `agent-config.json` rewritten from the template on every startup, and its `skills/` folder mirrored from the template (removed when the template has none); app-data edits to those ids, including edits to the Daily Assistant's prompt, tools, model defaults, skill scope or agent-local skills, do not survive restart;
- standalone local agents that are not listed in `BUILT_IN_AGENT_DEFINITIONS`, user package roots, and application-owned package definitions are not part of this sync; and
- built-in files are written for every built-in first, then one full reload of the agent package definitions (`reloadAgentPackageDefinitions()`) runs, and only then is each built-in resolved through `getAgentDefinitionById`.

Built-in agent customization belongs in the bundled source templates; a user who wants a different agent creates their own definition.

Do not add separate one-off built-in-agent bootstrappers or scatter platform
templates under feature-runtime folders. Native compaction now constructs an
isolated tool-free LLM directly; it has no synchronized Memory Compactor agent,
registry-selected algorithm or child Agent runtime. Old compactor-agent files and
removed selector/strategy setting values are inert for compaction and are neither
imported nor deleted. The optional current model/config tuple is server-owned,
not an AgentDefinition selector. The Daily Assistant is not auto-featured;
featured placement stays an operator choice in Settings.

The bootstrapper only writes registry-listed ids; it never deletes app-data
agent folders. Retiring a built-in therefore means removing its registry row and
template and, when its installed copy must disappear, adding a registered
startup app-data migration that deletes that copy once. Do not add a
retired-id list or cleanup loop to the bootstrapper. The built-in Project Task
Manager (`autobyteus-project-task-manager`) was retired this way by migration
`20261006_remove_built_in_project_task_manager` (see the server README).

## Notes

- Canonical ids encode ownership provenance so callers can resolve application-owned and team-local agents deterministically.
- Team-local agent ids use the shape `team-local-agent:<encoded-owner-team-id>:<encoded-local-agent-id>`. Both parts are encoded, so any canonical owner team id is safe inside it. Teams are flat: a team-local agent is owned by its one Team, and there are no team-local subteams.
- `AgentDefinitionService` is the authoritative read/write boundary; callers should not reimplement ownership-path resolution or read files for a "fresher" copy. Shared, team-local and org-owned agents of registered agent packages are served from the [agent package definitions](./agent_package_definitions.md), which apply pending file changes before every read and keep the last working version of a broken definition (`AgentDefinition.loadIssue` explains why). Application-package agents are not agent package definitions: list results and exact-ID reads read them on demand from their application packages, and a malformed one is logged and skipped without failing the list. Writes go through the file provider and the owning definition folder is reloaded immediately. There is no separate cached or fresh read path.
- Application-owned agents can be edited in place when the owning bundle source is writable.
- Agents of registered agent packages are saved into their package folder; Teams and Orgs of those packages follow the same rule (source class `registered_package`).
- Application-owned agents are not created or deleted through the shared standalone provider path.
- No generic agent Duplicate/Fork API exists; customization should happen in source packages, direct edits to user-owned standalone agents, or a newly created shared agent.
- `getAllAgentDefinitions()` still uses batched prompt mapping retrieval to avoid N+1 query patterns.
