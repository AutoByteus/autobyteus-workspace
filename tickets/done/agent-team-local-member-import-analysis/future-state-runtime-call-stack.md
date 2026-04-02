# Future-State Runtime Call Stacks (Debug-Trace Style)

Use this document as a future-state (`to-be`) execution model derived from the design basis.
Prefer exact `file:function` frames, explicit branching, and clear state/persistence boundaries.
Do not treat this document as an as-is trace of current code behavior.

## Design Basis

- Scope Classification: `Large`
- Call Stack Version: `v3`
- Requirements: `tickets/done/agent-team-local-member-import-analysis/requirements.md` (status `Refined`)
- Source Artifact:
  - `Medium/Large`: `tickets/done/agent-team-local-member-import-analysis/proposed-design.md`
- Source Design Version: `v4`
- Referenced Sections:
  - Spine inventory sections: `DS-001` to `DS-006`
  - Ownership sections: `Ownership Map`, `Derived Interface Boundary Mapping`

## Use Case Index (Stable IDs)

| use_case_id | Spine ID(s) | Spine Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Governing Owner | Source Type (`Requirement`/`Design-Risk`) | Requirement ID(s) | Design-Risk Objective (if source=`Design-Risk`) | Use Case Name | Coverage Target (Primary/Fallback/Error) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `UC-001` | `DS-004` | `Primary End-to-End` | package-root settings surface | `Requirement` | `REQ-013`, `REQ-017` to `REQ-028` | `N/A` | List and mutate agent package roots | `Yes/Yes/Yes` |
| `UC-002` | `DS-001` | `Primary End-to-End` | `agent-team-definition` | `Requirement` | `REQ-002` to `REQ-007` | `N/A` | Load a team definition with explicit shared and local agent refs | `Yes/N/A/Yes` |
| `UC-003` | `DS-002` | `Primary End-to-End` | `agent-team-execution` | `Requirement` | `REQ-008` to `REQ-010` | `N/A` | Launch a team that mixes shared agents, local agents, and nested teams | `Yes/N/A/Yes` |
| `UC-004` | `DS-003` | `Primary End-to-End` | `sync` | `Requirement` | `REQ-011`, `REQ-012` | `N/A` | Export and import a team while preserving team-local agent folders | `Yes/N/A/Yes` |
| `UC-005` | `DS-005` | `Bounded Local` | `skills` | `Requirement` | `REQ-014` | `N/A` | Scan bundled skills from shared and team-local agent folders | `Yes/N/A/Yes` |
| `UC-006` | `DS-002` | `Bounded Local` | `agent-team-execution` | `Design-Risk` | `REQ-010` | Collision-free runtime/history identity when two teams use the same local agent id | `No local-id collisions in run metadata/history` | `Yes/N/A/Yes` |
| `UC-007` | `DS-006` | `Primary End-to-End` | `agent-definition` + web agent-management UI | `Requirement` | `REQ-015`, `REQ-029`, `REQ-030` | `N/A` | List and configure a team-local agent from the Agents page | `Yes/Yes/Yes` |

## Transition Notes

- Temporary migration behavior needed to reach target state: `None`
- Retirement plan for temporary logic (if any): `N/A`

## Use Case: UC-001 [List and mutate agent package roots]

### Spine Context

- Spine ID(s): `DS-004`
- Spine Scope: `Primary End-to-End`
- Governing Owner: package-root settings surface
- Why This Use Case Matters To This Spine: the naming cleanup only succeeds if the persisted API/UI/config flow is coherent end-to-end.

### Goal

List registered package roots, show separate shared/local/team counts, and add/remove roots by absolute path.

### Preconditions

- The server config supports `AUTOBYTEUS_AGENT_PACKAGE_ROOTS`.
- The settings page active section is `agent-package-roots`.

### Expected Outcome

- GraphQL exposes canonical `agentPackageRoots`, `addAgentPackageRoot`, and `removeAgentPackageRoot`.
- Summaries include `sharedAgentCount`, `teamLocalAgentCount`, `agentTeamCount`, and `isDefault`.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-web/pages/settings.vue:onMounted(...)
├── autobyteus-web/components/settings/AgentPackageRootsManager.vue:onMounted(...)
│   └── autobyteus-web/stores/agentPackageRootsStore.ts:fetchAgentPackageRoots(...) [ASYNC]
│       └── autobyteus-web/graphql/agentPackageRoots.ts:GetAgentPackageRoots
└── autobyteus-server-ts/src/api/graphql/types/agent-package-roots.ts:agentPackageRoots(...)
    └── autobyteus-server-ts/src/agent-package-roots/services/agent-package-root-service.ts:listAgentPackageRoots(...)
        ├── autobyteus-server-ts/src/config/app-config.ts:getAdditionalAgentPackageRoots(...) [IO]
        ├── countSharedAgents(...) [IO]
        ├── countTeamLocalAgents(...) [IO]
        └── countTeams(...) [IO]
```

### Branching / Fallback Paths

```text
[FALLBACK] add new root
autobyteus-web/components/settings/AgentPackageRootsManager.vue:handleAdd(...)
└── autobyteus-web/stores/agentPackageRootsStore.ts:addAgentPackageRoot(...) [ASYNC]
    └── autobyteus-server-ts/src/api/graphql/types/agent-package-roots.ts:addAgentPackageRoot(...)
        └── autobyteus-server-ts/src/agent-package-roots/services/agent-package-root-service.ts:addAgentPackageRoot(...)
            ├── validateAgentPackageRoot(...) [IO]
            ├── autobyteus-server-ts/src/services/server-settings-service.ts:updateSetting(...) [IO]
            └── refreshDefinitionCaches(...) [ASYNC]
```

```text
[ERROR] invalid or relative root path
autobyteus-server-ts/src/agent-package-roots/services/agent-package-root-service.ts:validateAgentPackageRoot(...)
└── autobyteus-web/components/settings/AgentPackageRootsManager.vue:error banner render
```

### State And Data Transformations

- root path input -> normalized absolute root path
- filesystem root -> package-root summary counts
- GraphQL payload -> Pinia store state

### Observability And Debug Points

- Logs emitted at: package-root service errors only
- Metrics/counters updated at: `None`
- Tracing spans (if any): `None`

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? `No`
- Any tight coupling or cyclic cross-subsystem dependency introduced? `No`
- Any naming-to-responsibility drift detected? `No`

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-007 [List and configure a team-local agent from the Agents page]

### Spine Context

- Spine ID(s): `DS-006`
- Spine Scope: `Primary End-to-End`
- Governing Owner: `agent-definition` + web agent-management UI
- Why This Use Case Matters To This Spine: manual verification showed that the feature is not actually usable if team-local agents vanish from the generic Agents surface after teams move to the folder-owned layout.

### Goal

List shared and team-local agents together in the Agents page, show explicit ownership context for team-local agents, and allow detail/edit flows to update team-local agent files in their owning team folders.

### Preconditions

- Team-local agent ids are derived as `team-local:<teamId>:<agentId>`.
- GraphQL `AgentDefinition` payloads include ownership metadata.
- The Agents page uses that metadata to render local-vs-shared context and the minimal `Team: <team name>` label.
- Shared-only selection surfaces consume a filtered shared-only subset instead of the visible mixed list.

### Expected Outcome

- Shared and team-local agents both appear in the Agents page.
- Team-local agents show ownership context with the owning team name.
- Detail and edit flows for team-local agents succeed and write back into `agent-teams/<team-id>/agents/<agent-id>/`.
- Shared-only selection surfaces such as team authoring continue to show only shared agents.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-web/pages/agents.vue:onMounted(...)
└── autobyteus-web/stores/agentDefinitionStore.ts:fetchAllAgentDefinitions(...) [ASYNC]
    └── autobyteus-web/graphql/queries/agentDefinitionQueries.ts:GetAgentDefinitions
        └── autobyteus-server-ts/src/api/graphql/types/agent-definition.ts:agentDefinitions(...)
            └── autobyteus-server-ts/src/agent-definition/services/agent-definition-service.ts:getVisibleAgentDefinitions(...) [ASYNC]
                └── autobyteus-server-ts/src/agent-definition/providers/file-agent-definition-provider.ts:getAllVisible(...) [ASYNC]
                    ├── read shared agents from agents/* [IO]
                    ├── read team-local agents from agent-teams/*/agents/* [IO]
                    ├── parse owning team.md for ownerTeamName [IO/STATE]
                    └── emit ownership metadata: shared or team_local(+ownerTeamId,+ownerTeamName) [STATE]
```

```text
[CONTINUE] autobyteus-web/components/agents/AgentList.vue
├── render card title from agent name [STATE]
├── render `Team: <team name>` for team-local agents [STATE]
└── route detail/edit with the resolved agentDefinitionId [STATE]
```

```text
[CONTINUE] autobyteus-web/components/agents/AgentEdit.vue:handleUpdate(...)
└── autobyteus-web/stores/agentDefinitionStore.ts:updateAgentDefinition(...) [ASYNC]
    └── autobyteus-server-ts/src/api/graphql/types/agent-definition.ts:updateAgentDefinition(...)
        └── autobyteus-server-ts/src/agent-definition/services/agent-definition-service.ts:updateAgentDefinition(...)
            └── autobyteus-server-ts/src/agent-definition/providers/file-agent-definition-provider.ts:update(...) [ASYNC]
                ├── resolve shared source path when ownershipScope === shared [STATE]
                └── resolve team-local source path when ownershipScope === team_local [STATE/IO]
```

### Branching / Fallback Paths

```text
[FALLBACK] shared-only selector needs agent choices
autobyteus-web/stores/agentDefinitionStore.ts:sharedAgentDefinitions
└── filters visible mixed list down to ownershipScope === SHARED before team-authoring library render [STATE]
```

```text
[ERROR] team-local agent listed but backing folder disappears before edit save
file-agent-definition-provider.ts:update(team-local:<teamId>:<agentId>)
└── throws source-not-found error
    └── autobyteus-web/components/agents/AgentEdit.vue:error notification render
```

### State And Data Transformations

- file-backed shared/local agent definitions -> GraphQL payloads with ownership metadata
- ownership metadata -> web card/detail rendering plus ownership-aware update routing
- team-local update request -> owning team-local file write

### Observability And Debug Points

- Logs emitted at: GraphQL resolver/provider errors only
- Metrics/counters updated at: `None`
- Tracing spans (if any): `None`

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? `No`
- Any tight coupling or cyclic cross-subsystem dependency introduced? `No`
- Any naming-to-responsibility drift detected? `No`

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-002 [Load a team definition with explicit shared and local agent refs]

### Spine Context

- Spine ID(s): `DS-001`
- Spine Scope: `Primary End-to-End`
- Governing Owner: `agent-team-definition`
- Why This Use Case Matters To This Spine: all later runtime/sync behavior depends on the normalized member contract being explicit and strict.

### Goal

Load a team definition from disk or GraphQL and keep explicit scope on every agent member.

### Preconditions

- `team-config.json` uses `refScope` for every `refType: "agent"` member.

### Expected Outcome

- In-memory `TeamMember` objects always carry `refScope` for agents.
- Invalid agent members without scope are rejected rather than silently treated as shared.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-server-ts/src/agent-team-definition/providers/file-agent-team-definition-provider.ts:getById(teamId)
└── readTeamFromRoot(rootPath, teamId) [ASYNC]
    ├── fs.readFile(team.md) [IO]
    ├── readJsonFile(team-config.json) [IO]
    ├── parseTeamMd(...) [STATE]
    ├── parseTeamConfigMembers(...) [STATE]
    │   └── new TeamMember({ memberName, refType, refScope, ref }) [STATE]
    └── new AgentTeamDefinition(...) [STATE]
```

### Branching / Fallback Paths

```text
[ERROR] invalid team-config member for agent ref
file-agent-team-definition-provider.ts:parseTeamConfigMembers(...)
└── TeamConfigParseError
```

### State And Data Transformations

- raw `members[]` JSON -> validated scoped `TeamMember[]`
- `team.md` frontmatter + instructions -> domain definition

### Observability And Debug Points

- Logs emitted at: provider warning on skipped unreadable team definitions during bulk list
- Metrics/counters updated at: `None`
- Tracing spans (if any): `None`

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? `No`
- Any tight coupling or cyclic cross-subsystem dependency introduced? `No`
- Any naming-to-responsibility drift detected? `No`

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-003 [Launch a team that mixes shared agents, local agents, and nested teams]

### Spine Context

- Spine ID(s): `DS-002`
- Spine Scope: `Primary End-to-End`
- Governing Owner: `agent-team-execution`
- Why This Use Case Matters To This Spine: this is the core functional behavior the user asked for.

### Goal

Build a runnable team where shared agents come from the standalone registry and local agents come from the owning team folder.

### Preconditions

- The root team definition exists.
- Every agent member has explicit `refScope`.
- Nested teams, if any, are valid.

### Expected Outcome

- Shared members resolve by standalone id.
- Local members resolve by owning team id + local agent id.
- Team-run metadata uses unique `agentDefinitionId` values even when local ids overlap.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-server-ts/src/agent-team-execution/services/team-run-service.ts:buildMemberConfigsFromLaunchPreset(...)
├── collectLeafAgentMembers(teamDefinitionId, visited) [ASYNC]
│   ├── agentTeamDefinitionService.getDefinitionById(teamDefinitionId) [ASYNC]
│   ├── buildResolvedAgentDefinitionId(teamDefinitionId, node) [STATE]
│   │   ├── if node.refScope === "shared" -> return node.ref
│   │   └── if node.refScope === "team_local" -> return buildTeamLocalAgentDefinitionId(teamDefinitionId, node.ref)
│   └── recurse into nested teams when node.refType === "agent_team" [ASYNC]
└── createTeamRun(...) [ASYNC]
    └── autobyteus-server-ts/src/agent-team-execution/backends/autobyteus/autobyteus-team-run-backend-factory.ts:buildTeamConfigFromDefinition(...)
        ├── teamDefinitionService.getFreshDefinitionById(teamDefinitionId) [ASYNC]
        ├── buildResolvedAgentDefinitionId(teamDefinitionId, member) [STATE]
        └── buildAgentConfigFromDefinition(memberName, resolvedAgentDefinitionId, memberConfig) [ASYNC]
            └── agentDefinitionService.getFreshAgentDefinitionById(resolvedAgentDefinitionId) [ASYNC]
                └── file-agent-definition-provider.ts:getById(resolvedAgentDefinitionId) [ASYNC]
                    ├── parseTeamLocalAgentDefinitionId(...) [STATE]
                    ├── read shared agent folder [IO]
                    └── or read agent-teams/<teamId>/agents/<agentId>/ [IO]
```

### Branching / Fallback Paths

```text
[ERROR] missing local agent folder
file-agent-definition-provider.ts:getById(team-local:<teamId>:<agentId>)
└── autobyteus-team-run-backend-factory.ts:buildAgentConfigFromDefinition(...)
    └── throws "AgentDefinition with ID ... not found."
```

```text
[ERROR] nested-team cycle
team-run-service.ts:collectLeafAgentMembers(...)
└── throws circular dependency error
```

### State And Data Transformations

- scoped member refs -> resolved runtime/history ids
- file-backed agent definition -> `AgentConfig`
- team run config -> persisted `TeamRunMetadata`

### Observability And Debug Points

- Logs emitted at: missing processors/tools inside runtime hydration
- Metrics/counters updated at: `None`
- Tracing spans (if any): `None`

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? `No`
- Any tight coupling or cyclic cross-subsystem dependency introduced? `No`
- Any naming-to-responsibility drift detected? `No`

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-004 [Export and import a team while preserving team-local agent folders]

### Spine Context

- Spine ID(s): `DS-003`
- Spine Scope: `Primary End-to-End`
- Governing Owner: `sync`
- Why This Use Case Matters To This Spine: sync currently flattens team ownership; this use case proves the requested structure survives transport.

### Goal

Export a selected team with its local agents and import it into another node without flattening the local agents into top-level `agents/`.

### Preconditions

- A selected team contains one or more local agents.

### Expected Outcome

- Sync selection validates local agent refs without requiring them in the shared-agent map.
- Exported team payload contains `localAgents`.
- Import writes `agent-teams/<team-id>/agents/<agent-id>/...`.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-server-ts/src/sync/services/node-sync-service.ts:exportBundle(...)
├── node-sync-selection-service.ts:resolveSelection(...) [ASYNC]
│   └── expandTeamDependencies(...) [STATE]
│       ├── if member.refScope === "shared" -> require agent in shared map
│       └── if member.refScope === "team_local" -> keep dependency inside team payload
└── node-sync-service.ts:exportBundle(...)
    └── serializeTeam(teamId) [ASYNC]
        ├── read team.md [IO]
        ├── read team-config.json [IO]
        └── read agent-teams/<teamId>/agents/* local agent files [IO]
```

### Branching / Fallback Paths

```text
[ERROR] shared agent referenced by team is missing
node-sync-selection-service.ts:expandTeamDependencies(...)
└── NodeSyncSelectionValidationError("team-member-missing")
```

```text
[ERROR] imported team payload missing a local-agent file
node-sync-service.ts:writeTeamFolder(...)
└── import failure entry recorded
```

### State And Data Transformations

- selected team ids -> resolved sync selection
- team folder + local agent folders -> sync bundle payload
- sync bundle payload -> restored team folder tree

### Observability And Debug Points

- Logs emitted at: sync failure capture
- Metrics/counters updated at: import/export summaries only
- Tracing spans (if any): `None`

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? `No`
- Any tight coupling or cyclic cross-subsystem dependency introduced? `No`
- Any naming-to-responsibility drift detected? `No`

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-005 [Scan bundled skills from shared and team-local agent folders]

### Spine Context

- Spine ID(s): `DS-005`
- Spine Scope: `Bounded Local`
- Governing Owner: `skills`
- Why This Use Case Matters To This Spine: team-local agents should be able to carry `SKILL.md` assets just like shared standalone agents.

### Goal

Load bundled skills from both shared agent folders and team-local agent folders.

### Preconditions

- A definition root contains one or more `SKILL.md` files under shared or team-local agent folders.

### Expected Outcome

- `SkillService.listSkills()` includes skills from both locations.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-server-ts/src/skills/services/skill-service.ts:listSkills(...)
└── scanBundledSkillsFromDefinitionRoot(definitionRoot) [STATE]
    ├── scan definitionRoot/agents/* [IO]
    └── scan definitionRoot/agent-teams/*/agents/* [IO]
        └── loader.loadSkill(skillDir, isReadonlyPath(skillDir)) [IO]
```

### Branching / Fallback Paths

```text
[ERROR] malformed local SKILL.md
skill-service.ts:scanBundledSkillsFromDefinitionRoot(...)
└── logger.warn("Error loading bundled skill ...")
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-006 [No local-id collisions in run metadata/history]

### Spine Context

- Spine ID(s): `DS-002`
- Spine Scope: `Bounded Local`
- Governing Owner: `agent-team-execution`
- Why This Use Case Matters To This Spine: without a scoped runtime identity, team-local agent support degrades run-history correctness.

### Goal

Guarantee that two different teams can each use local agent `reviewer` and still produce distinct downstream `agentDefinitionId` values.

### Preconditions

- Two team definitions each contain `refScope: "team_local", ref: "reviewer"`.

### Expected Outcome

- Runtime/history ids differ, for example:
  - `team-local:team-a:reviewer`
  - `team-local:team-b:reviewer`

### Primary Runtime Call Stack

```text
[ENTRY] team-run-service.ts:collectLeafAgentMembers(...)
└── buildTeamLocalAgentDefinitionId(teamDefinitionId, agentId) [STATE]
    └── team-run-metadata-store.ts:writeMetadata(...) [IO]
```

### Branching / Fallback Paths

```text
[ERROR] helper receives empty team id or agent id
buildTeamLocalAgentDefinitionId(...)
└── throws validation error before metadata is written
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`
