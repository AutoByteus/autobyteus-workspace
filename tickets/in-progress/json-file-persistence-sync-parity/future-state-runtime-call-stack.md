# Future-State Runtime Call Stacks

## Modeling Basis

- Scope: `Medium`
- Source requirements: `tickets/in-progress/json-file-persistence-sync-parity/requirements.md`
- Source design: `tickets/in-progress/json-file-persistence-sync-parity/proposed-design.md` (`v1`)
- Rule: future-state only, no backward-compat dual path modeled

## Use Case Index

| use_case_id | Requirement ID(s) | Use Case |
| --- | --- | --- |
| UC-001 | R-001, R-010 | Load agent from `agents/<agentId>/agent.json` |
| UC-002 | R-003, R-014 | Resolve active prompt markdown `prompt-vN.md` |
| UC-003 | R-002, R-011, R-012 | Load team from `agent-teams/<teamId>/team.json` |
| UC-004 | R-004 | Load MCP configs from `<data-dir>/mcps.json` |
| UC-005 | R-004 | Persist MCP mutations to `<data-dir>/mcps.json` |
| UC-006 | R-007, R-008 | Sync export/import of `agent_definition` with prompt versions |
| UC-007 | R-007, R-008 | Sync export/import of `agent_team_definition` |
| UC-008 | R-007 | Sync export/import of `mcp_server_configuration` |
| UC-009 | R-007 | Agent sync payload carries prompt versions |
| UC-010 | R-007 | Selective sync dependency closure `team -> agent -> promptVersions` |

## UC-001 Agent Load From Folder JSON

```text
[ENTRY] AgentDefinitionService.getAllAgentDefinitions()
-> CachedAgentDefinitionProvider.getAll()
-> ensureCachePopulated()
-> JsonFolderAgentDefinitionProvider.getAll()
-> fs.readdir(<data-dir>/agents/)
-> for each agentId folder:
   -> fs.readFile(agents/<agentId>/agent.json)
   -> parse + validate contract
   -> AgentDefinition{id=agentId, ...}
-> cache map by agentId
-> return AgentDefinition[]
```

Fallback/error:
- missing folder: returns `[]`
- invalid JSON: skip folder and log warning

## UC-002 Prompt Resolution From Active Version

```text
[ENTRY] AgentRunManager.buildAgentConfig(agentId)
-> PromptLoader.getPromptTemplateForAgent(agentId, model)
-> AgentDefinitionService.getAgentDefinitionById(agentId)
-> activePromptVersion = N
-> fs.readFile(agents/<agentId>/prompt-vN.md)
-> return prompt string
```

Fallback/error:
- missing prompt file: return `null`, runtime uses `agent.description`

## UC-003 Team Load From Folder JSON

```text
[ENTRY] AgentTeamDefinitionService.getAllDefinitions()
-> CachedAgentTeamDefinitionProvider.getAll()
-> ensureCachePopulated()
-> JsonFolderAgentTeamDefinitionProvider.getAll()
-> fs.readdir(<data-dir>/agent-teams/)
-> fs.readFile(agent-teams/<teamId>/team.json)
-> parse + validate members[].agentId
-> AgentTeamDefinition{id=teamId, nodes[].referenceId=agentId}
```

Fallback/error:
- missing team folder: returns `[]`
- unknown referenced agentId: team loads, runtime resolution fails when creating run

## UC-004 + UC-005 MCP Load/Persist (`mcps.json`)

```text
[ENTRY] McpConfigService.loadAllAndRegister()
-> FileMcpProvider.getAll()
-> fs.readFile(<data-dir>/mcps.json)
-> parse { mcpServers: Record<serverId, config> }
-> map to BaseMcpConfig[]
-> register tools
```

```text
[ENTRY] configureMcpServer/deleteMcpServer
-> FileMcpProvider.update/create/delete
-> update mcpServers map
-> fs.writeFile(<data-dir>/mcps.json) (deterministic JSON)
-> refresh registry/tool state
```

## UC-006 + UC-009 Agent Sync Export/Import

```text
Export:
[ENTRY] NodeSyncService.exportBundle(scope includes agent_definition)
-> list agents from service
-> for each agentId:
   -> read agent.json model
   -> read prompt-v*.md versions
   -> emit {agentId, agent:{...}, promptVersions:{...}}
```

```text
Import:
[ENTRY] NodeSyncService.importBundle(scope includes agent_definition)
-> for each payload entity:
   -> upsert agent folder agents/<agentId>/agent.json
   -> upsert prompt-vN.md files from promptVersions map
-> refresh agent cache + prompt loader cache
```

## UC-007 Team Sync Export/Import

```text
Export: emit {teamId, team:{..., members:[{memberName, agentId}]}}
Import: upsert agent-teams/<teamId>/team.json
```

## UC-008 MCP Sync Export/Import

```text
Export: emit mcp entities from mcps.json normalized map entries
Import: apply map updates back to mcps.json via provider
```

## UC-010 Selective Dependency Resolution

```text
[ENTRY] NodeSyncSelectionService.resolveSelection()
if team selected + includeDependencies:
-> include referenced agentIds
-> include promptVersions for included agentIds
-> reject selection when required dependency is missing
```

