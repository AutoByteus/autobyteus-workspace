# Future-State Runtime Call Stacks (Debug-Trace Style)

## Conventions

- Frame format: `path/to/file.ts:functionName(args?)`
- Boundary tags:
  - `[ENTRY]` external entrypoint (API/CLI/event)
  - `[ASYNC]` async boundary (`await`, queue handoff, callback)
  - `[STATE]` in-memory mutation
  - `[IO]` file/network/database/cache IO
  - `[FALLBACK]` non-primary branch
  - `[ERROR]` error path
- No legacy/backward-compatibility branches.

## Design Basis

- Scope Classification: `Small`
- Call Stack Version: `v2`
- Requirements: `tickets/in-progress/team-members-node-visibility-detail/requirements.md` (status `Refined`)
- Source Artifact:
  - `Small`: `tickets/in-progress/team-members-node-visibility-detail/implementation-plan.md` (solution sketch)
- Source Design Version: `v1-draft`
- Referenced Sections:
  - Solution Sketch
  - Dependency And Sequencing Map

## Future-State Modeling Rule (Mandatory)

- Model target design behavior even when current code diverges.

## Use Case Index (Stable IDs)

| use_case_id | Requirement | Use Case Name | Coverage Target (Primary/Fallback/Error) |
| --- | --- | --- | --- |
| UC-001 | R-001 | Show member source node in team detail cards | Yes/Yes/Yes |
| UC-002 | R-002 | Keep cross-node identity naming consistent | Yes/N/A/Yes |

## Transition Notes

- Existing cards without source indicator are replaced directly (no compatibility branch retained).

## Use Case: UC-001 Show Member Source Node In Team Detail Cards

### Goal
Each member card clearly shows which node owns the member.

### Preconditions
- Team definition loaded.
- Node registry initialized.

### Expected Outcome
- Member cards include source chip text (`Node: <resolved node name>`).
- Remote and embedded members are visually distinguishable.

### Primary Runtime Call Stack

```text
[ENTRY] components/agentTeams/AgentTeamDetail.vue:onMounted()
├── stores/agentTeamDefinitionStore.ts:fetchAllAgentTeamDefinitions() [ASYNC][IO]
├── stores/agentDefinitionStore.ts:fetchAllAgentDefinitions() [ASYNC][IO]
├── stores/nodeStore.ts:initializeRegistry() [ASYNC][STATE]
└── stores/federatedCatalogStore.ts:loadCatalog() [ASYNC][IO]

[ENTRY] components/agentTeams/AgentTeamDetail.vue:template(v-for node in teamDef.nodes)
├── components/agentTeams/AgentTeamDetail.vue:resolveHomeNodeId(node)
├── components/agentTeams/AgentTeamDetail.vue:getBlueprintName(node)
├── components/agentTeams/AgentTeamDetail.vue:getNodeDisplayName(homeNodeId)
├── components/agentTeams/AgentTeamDetail.vue:getMemberSourceNodeLabel(node)
│   └── stores/nodeStore.ts:getNodeById(homeNodeId)
└── components/agentTeams/AgentTeamDetail.vue:getMemberSourceChipClass(node)
```

### Branching / Fallback Paths

```text
[FALLBACK] if node registry has no matching node profile
components/agentTeams/AgentTeamDetail.vue:getMemberSourceNodeLabel(node)
└── return `Node: ${homeNodeId}`
```

```text
[FALLBACK] if member home node id is embedded-local
components/agentTeams/AgentTeamDetail.vue:getNodeDisplayName(homeNodeId)
└── return `Embedded Node`
```

```text
[ERROR] if federated lookup does not resolve member blueprint
components/agentTeams/AgentTeamDetail.vue:getBlueprintName(node)
├── local fallback for embedded node IDs
└── return Unknown Agent/Team with node context suffix
```

### State And Data Transformations

- `TeamMember.homeNodeId` -> normalized node id (`embedded-local` default)
- normalized node id -> node display name (`Embedded Node` or remote node name)
- node display name -> member source chip text

### Observability And Debug Points

- Existing console/error logging in stores for load failures.

### Design Smells / Gaps

- Legacy/backward-compatibility branch present? `No`
- Naming-to-responsibility drift detected? `No`

### Open Questions

- Should source chip collapse on very narrow card widths?

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-002 Keep Cross-Node Identity Naming Consistent

### Goal
Member display naming should not regress to local ID-only resolution when member belongs to remote node.

### Preconditions
- Team run config template exists.

### Expected Outcome
- For remote members, member name resolution uses federated node-scoped lookup first.

### Primary Runtime Call Stack

```text
[ENTRY] stores/agentTeamContextsStore.ts:createRunFromTemplate()
├── stores/agentTeamDefinitionStore.ts:getAgentTeamDefinitionById(teamDefinitionId)
├── loop teamDef.nodes
│   ├── stores/agentTeamContextsStore.ts:resolve homeNodeId
│   ├── stores/federatedCatalogStore.ts:findAgentByNodeAndId(homeNodeId, referenceId)
│   └── stores/agentDefinitionStore.ts:getAgentDefinitionById(referenceId) # embedded-only fallback
├── [STATE] build AgentRunConfig.agentDefinitionName
└── [STATE] build AgentRunState conversation agentName
```

### Branching / Fallback Paths

```text
[FALLBACK] if federated node lookup misses remote member
stores/agentTeamContextsStore.ts:createRunFromTemplate()
└── fallback to memberName from team definition node
```

```text
[ERROR] if team definition not found
stores/agentTeamContextsStore.ts:createRunFromTemplate()
└── throw Error(`Team definition ... not found.`)
```

### State And Data Transformations

- team definition node -> normalized `homeNodeId`
- node-aware reference lookup -> member display name
- member display name -> runtime config + conversation labels

### Observability And Debug Points

- Unit assertions in store tests for remote member naming.

### Design Smells / Gaps

- Legacy/backward-compatibility branch present? `No`
- Naming-to-responsibility drift detected? `No`

### Open Questions

- None.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`
