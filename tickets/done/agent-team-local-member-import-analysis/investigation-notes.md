# Investigation Notes

## Investigation Status

- Current Status: `Current`
- Scope Triage: `Large`
- Triage Rationale:
  - The original slice already crossed discovery, team loading, runtime construction, sync, skill discovery, and naming cleanup.
  - The refreshed investigation adds a second architectural concern: the backend/frontend contract now needs to distinguish shared-only server lists from ownership-aware UI-visible agent lists.
- Investigation Goal:
  - Re-evaluate the backend/frontend contract for ownership-aware agent visibility and save semantics now that team-local agents must be configurable from the generic Agents page.
- Primary Questions To Resolve:
  - Which backend list surfaces must remain shared-only for sync/runtime safety?
  - Which frontend-facing agent list should include team-local agents with ownership metadata?
  - What metadata must the backend return so the frontend can render team ownership cleanly and route edits to the correct folder?
  - Which existing web consumers of `agentDefinitionStore.agentDefinitions` would break if the visible list becomes ownership-aware?
  - Where do update/delete/duplicate source-path assumptions still hard-code top-level shared `agents/` only?

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-04-02 | Command | `git status --short --branch`, `git branch -vv`, `git worktree list`, `git fetch origin personal`, `git worktree add -b codex/agent-team-local-member-import-analysis ... origin/personal` | Bootstrap the workflow ticket correctly | Base branch is `origin/personal`; dedicated worktree created successfully | No |
| 2026-04-02 | Code | `autobyteus-server-ts/src/definition-sources/services/definition-source-service.ts` | Trace definition-source registration and validation | Only top-level `agents/` / `agent-teams/` directories are validated and counted | No |
| 2026-04-02 | Code | `autobyteus-server-ts/src/agent-definition/providers/file-agent-definition-provider.ts` | Trace agent discovery roots and id resolution | Agents are read only from top-level `agents/` roots across registered sources | No |
| 2026-04-02 | Code | `autobyteus-server-ts/src/agent-team-definition/providers/file-agent-team-definition-provider.ts` | Trace team discovery and payload parsing | Teams are read only from top-level `agent-teams/` roots; provider reads only `team.md` + `team-config.json` | No |
| 2026-04-02 | Code | `autobyteus-server-ts/src/agent-team-execution/backends/autobyteus/autobyteus-team-run-backend-factory.ts` | Verify runtime team-member resolution behavior | Agent members resolve through global agent definition lookup by `member.ref` | No |
| 2026-04-02 | Code | `autobyteus-server-ts/src/agent-team-execution/services/team-run-service.ts` | Check team leaf-member traversal | Leaf-member collection also treats `node.ref` as a global agent definition id | No |
| 2026-04-02 | Code | `autobyteus-server-ts/src/sync/services/node-sync-selection-service.ts`, `autobyteus-server-ts/src/sync/services/node-sync-service.ts` | Check sync validation and import/export shape | Team dependency expansion validates member refs against global agent/team maps; sync payloads store agents and teams as separate top-level entities/folders | No |
| 2026-04-02 | Code | `autobyteus-server-ts/src/skills/services/skill-service.ts` | Check bundled-skill discovery impact | Bundled skills are discovered from `agents/*/SKILL.md` under definition roots, not from team-local agent paths | No |
| 2026-04-02 | Code | `autobyteus-web/components/settings/DefinitionSourcesManager.vue`, `autobyteus-web/stores/definitionSourcesStore.ts` | Inspect current product naming | UI heading/button say `Import`, while store/backend model says `definition source`; naming is inconsistent | No |
| 2026-04-02 | Repo | `../autobyteus-agents` | Verify the concrete example package the user referenced | Teams are defined separately from a shared top-level `agents/` folder and use bare global refs in `team-config.json` | No |
| 2026-04-02 | Doc | `tickets/in-progress/agent-md-centric-definition/requirements.md` | Confirm whether current two-file team shape was intentional | Earlier md-centric requirements explicitly define a team as `team.md` + `team-config.json` and a definition root as top-level `agents/` plus `agent-teams/` | No |
| 2026-04-02 | Code | `autobyteus-server-ts/src/api/graphql/types/agent-definition.ts`, `autobyteus-web/stores/agentDefinitionStore.ts` | Trace the frontend-facing agent list contract | GraphQL `agentDefinitions` currently returns the same shared-only list shape the backend uses internally; the store exposes no ownership metadata | No |
| 2026-04-02 | Code | `autobyteus-server-ts/src/agent-definition/providers/cached-agent-definition-provider.ts`, `agent-definition-persistence-provider.ts`, `agent-definition-service.ts` | Check how deeply the shared-only list assumption is embedded | Backend services/cache only know one `getAll()` list shape today; sync/server internals depend on that shared-only behavior | No |
| 2026-04-02 | Code | `autobyteus-web/components/agentTeams/AgentTeamDefinitionForm.vue`, `autobyteus-web/components/workspace/running/AgentLibraryPanel.vue`, `autobyteus-web/composables/useMessagingChannelBindingSetupFlow.ts` | Identify frontend consumers of `agentDefinitionStore.agentDefinitions` | Team authoring, run-library, and messaging flows all consume the same store list; changing it blindly would leak team-local agents into shared-only selection surfaces | No |
| 2026-04-02 | Code | `autobyteus-web/components/agents/AgentList.vue`, `AgentCard.vue`, `AgentDetail.vue`, `AgentEdit.vue` | Check what the Agents page can safely do with team-local agents | The current Agents UI assumes every listed agent supports shared-only actions like selective sync, duplicate, and delete; that is not true for team-local ownership | No |
| 2026-04-02 | Code | `autobyteus-server-ts/src/config/app-config.ts`, `autobyteus-server-ts/src/agent-team-definition/utils/team-md-parser.ts` | Verify whether the backend can derive team display names and team-local write paths | The server already knows canonical team-local file paths and can parse `team.md` names, so it can return clean ownership metadata without exposing raw paths | No |

## Current Behavior / Codebase Findings

### Entrypoints And Boundaries

- Primary entrypoints:
  - `DefinitionSourceService.addDefinitionSource(path)` validates and registers external definition roots.
  - `FileAgentDefinitionProvider` discovers standalone agent definitions from top-level `agents/`.
  - `FileAgentTeamDefinitionProvider` discovers team definitions from top-level `agent-teams/`.
  - GraphQL `agentDefinitions` exposes the same shared-only list shape through the web store today.
- Execution boundaries:
  - source registration is separate from file discovery,
  - team provider parses team metadata but does not hydrate member definitions,
  - runtime construction and sync validation later resolve team member refs through global services,
  - the frontend currently has no ownership-aware agent contract separate from the shared-only backend list.
- Owning subsystems / capability areas:
  - `definition-sources`
  - `agent-definition`
  - `agent-team-definition`
  - `agent-team-execution`
  - `sync`
  - `skills`
  - `autobyteus-web` settings UX
- Optional modules involved:
  - cached providers sit on top of the file providers, but they do not change the underlying read-root model.
- Folder / file placement observations:
  - current placement deliberately splits team metadata and standalone agents into separate top-level roots,
  - no current subsystem models a team as a folder that owns nested member definitions.

### Relevant Files / Symbols

| Path | Symbol / Area | Current Responsibility | Finding / Observation | Ownership / Placement Implication |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/definition-sources/services/definition-source-service.ts` | `validateSourceRoot`, `buildSourceInfo` | Source-root validation and summary counts | Accepts only top-level `agents/` / `agent-teams/` as meaningful directories; counts only those top-level children | Team-local member folders are currently invisible to source summaries |
| `autobyteus-server-ts/src/agent-definition/providers/file-agent-definition-provider.ts` | `getReadAgentRoots`, `getAll`, `getById` | Standalone agent discovery and global id lookup | Reads only `<root>/agents/<agentId>` across default + additional roots; no team-relative lookup exists | Agent ids are treated as global across registered roots |
| `autobyteus-server-ts/src/agent-definition/providers/file-agent-definition-provider.ts` | `findAgentSourcePaths`, `update`, `delete`, `duplicate` | Shared-agent write routing | Source-path lookup only searches top-level shared `agents/`; local ids cannot be updated/deleted from the generic agent-definition flow today | Backend save semantics must become ownership-aware |
| `autobyteus-server-ts/src/api/graphql/types/agent-definition.ts` | `agentDefinitions` query | Frontend-facing agent list | The GraphQL list currently mirrors the shared-only backend list with no ownership metadata | The UI cannot distinguish shared vs team-owned agents or route actions safely |
| `autobyteus-web/stores/agentDefinitionStore.ts` | `agentDefinitions`, `fetchAllAgentDefinitions`, `getAgentDefinitionById` | Canonical frontend agent registry | All web consumers currently share one list with no ownership semantics | The store must separate visible-agent semantics from shared-only selection semantics |
| `autobyteus-web/components/agentTeams/AgentTeamDefinitionForm.vue` | `agentDefinitions` computed | Team-authoring library source | Today it would consume any change to the store list directly | Shared-only team-authoring must be preserved explicitly if the UI-visible list becomes broader |
| `autobyteus-web/components/agents/AgentList.vue` and `AgentDetail.vue` | Card/detail action surface | Generic agent management | Assumes every agent supports sync/duplicate/delete as if it were a shared standalone definition | Team-local actions need ownership-aware gating |
| `autobyteus-server-ts/src/agent-team-definition/providers/file-agent-team-definition-provider.ts` | `getReadTeamRoots`, `readTeamFromRoot`, `update`, `delete` | Team discovery and persistence | Team folders are treated as owning only `team.md` and `team-config.json`; deleting a team deletes the full folder | Supporting nested team-local agents would change team-folder ownership semantics |
| `autobyteus-server-ts/src/agent-team-execution/backends/autobyteus/autobyteus-team-run-backend-factory.ts` | `buildAgentConfigFromDefinition`, `buildTeamConfigFromDefinition` | Runtime hydration of team members | `member.ref` is passed into global agent/team definition services; missing ids throw runtime errors | Team member resolution must become scoped here |
| `autobyteus-server-ts/src/agent-team-execution/services/team-run-service.ts` | `collectLeafAgentMembers` | Runtime traversal of team leaves | Leaf agents are collected via global `node.ref` ids | Same scoped-resolution contract must apply here |
| `autobyteus-server-ts/src/sync/services/node-sync-selection-service.ts` | `expandTeamDependencies` | Export selection validation | Team members are validated against global agent/team snapshots only | Sync selection would reject team-local members unless updated |
| `autobyteus-server-ts/src/sync/services/node-sync-service.ts` | `exportBundle`, `importBundle`, `writeAgentFolder`, `writeTeamFolder` | Node sync serialization/import | Agents and teams are serialized/imported as separate top-level folder payloads | Team-local member definitions would need a new bundle shape |
| `autobyteus-server-ts/src/skills/services/skill-service.ts` | `scanBundledSkillsFromDefinitionRoot` | Bundled-skill discovery from definition roots | Bundled skills are scanned from top-level `agents/*` only | Team-local agents with `SKILL.md` would be missed today |
| `autobyteus-web/components/settings/DefinitionSourcesManager.vue` | UI labels and helper copy | Settings UX for source registration | UI mixes `Import` wording with `definition source` data model | Naming cleanup should be deliberate and coordinated |

### Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-04-02 | Probe | `find ../autobyteus-agents -maxdepth 3 -type f | sort` | Example package has shared top-level `agents/` plus per-team `agent-teams/<team-id>/team.md` and `team-config.json` | The referenced repository matches the current flat global-member model |
| 2026-04-02 | Probe | `rg -n '"ref": ' ../autobyteus-agents/agent-teams` | All sample team member refs are bare agent ids such as `requirements-engineer` | Current examples rely on global id lookup, not team-relative lookup |
| 2026-04-02 | Probe | read `DefinitionSourcesManager.vue` | UI copy says `Import` and `Import Path`, but notes import is registration-only | Naming already conflates registration with copying/importing |
| 2026-04-02 | Probe | `rg -n "agentDefinitions\\b|fetchAllAgentDefinitions\\(" autobyteus-web autobyteus-server-ts/src` | Trace where the frontend/store list is reused | The same list currently feeds the Agents page, team-authoring form, workspace library, run hydration, and messaging flows | Visible-agent changes must not accidentally widen shared-only selection surfaces |

## Constraints

- Technical constraints:
  - team member refs currently carry no scope or path metadata,
  - agent definition ids are globally deduplicated across roots in the file provider,
  - runtime and sync paths both assume global agent/team registries,
  - node sync currently models teams as two files only,
  - the backend has only one agent-list contract today even though the product now needs both shared-only and ownership-aware-visible semantics.
- Environment constraints:
  - additional definition roots must be absolute existing directories,
  - source registration is v1 filesystem-root registration, not content copying.
- Third-party / API constraints:
  - None discovered; this is an internal product contract issue.

## Unknowns / Open Questions

- Unknown:
  - Should team-local agents appear in the generic Agents UI list while staying out of shared-only backend lists?
  - Why it matters:
    - A blind merge would pollute shared-only team-authoring/sync semantics, but hiding them completely breaks configurability.
  - Planned follow-up:
    - Prefer a split contract: shared-only backend lists remain intact, while the frontend-facing list becomes ownership-aware and explicitly marks team-owned agents.
- Unknown:
  - What exact metadata should the frontend receive for visible team-local agents?
  - Why it matters:
    - The UI needs just enough information to render a clean team label and to let edit/save route to the correct folder without learning filesystem paths.
  - Planned follow-up:
    - Use ownership metadata such as `ownershipScope`, `ownerTeamId`, and `ownerTeamName`, while keeping `refScope` as the team-config contract rather than a generic agent-card concern.
- Unknown:
  - Which generic agent actions should remain available for team-local agents?
  - Why it matters:
    - `run` and `edit` are ownership-safe, but shared-only operations like standalone selective sync are not automatically safe.
  - Planned follow-up:
    - Keep the UI clean by rendering only the extra team-name line on cards, then explicitly gate unsupported shared-only actions in design rather than pretending every visible agent is shared.

## Implications

### Requirements Implications

- Supporting team-local agents is a broader contract change, not just a UI/import validation tweak.
- Backward compatibility matters because existing packages use top-level `agents/` plus bare global refs.
- The requirement set must explicitly decide whether team-local members are standalone definitions or team-owned internal definitions.
- The requirement set must now also distinguish:
  - shared-only server lists used by sync/runtime dependency logic,
  - ownership-aware visible lists used by the generic Agents page and edit flows.

### Design Implications

- The cleanest direction is explicit scoped refs rather than implicit "local first, global fallback" lookup.
- A plausible target layout is:
  - `agents/<agent-id>/...` for shared standalone agents,
  - `agent-teams/<team-id>/team.md`,
  - `agent-teams/<team-id>/team-config.json`,
  - `agent-teams/<team-id>/agents/<agent-id>/...` for local team-owned members.
- With that layout, `team-config.json` needs a way to say whether `ref` points to:
  - a shared standalone agent,
  - a local agent owned by the current team,
  - a nested team.
- Sync/export-import should package local agents with the team instead of emitting them as separate global agent entities.
- The frontend should not learn raw paths; instead, the backend-visible agent payload should carry semantic ownership metadata:
  - whether the visible agent is shared or team-owned,
  - which team owns it,
  - the resolved agent definition id used for edit/run lookups.
- The clean display cut is minimal:
  - keep the normal agent name unchanged,
  - add only one extra line for team-owned agents, `Team: <team name>`.

### Implementation / Placement Implications

- Likely touched backend areas:
  - `definition-sources`
  - `agent-definition/providers`
  - `agent-definition/services`
  - `api/graphql/types/agent-definition.ts`
  - `api/graphql/converters/agent-definition-converter.ts`
  - `agent-team-definition/providers`
  - `agent-team-execution`
  - `sync`
  - `skills`
  - GraphQL/tests/settings copy
- The current file placement for team folders is too narrow if teams are meant to own member definitions.
- The frontend likely needs one shared source of truth with two views:
  - `visibleAgentDefinitions` or equivalent for generic agent management,
  - `sharedAgentDefinitions` filtered for team-authoring and other shared-only selection flows.
- Renaming `definition-sources` remains a separate coordinated concern from the refreshed agent-management contract.
