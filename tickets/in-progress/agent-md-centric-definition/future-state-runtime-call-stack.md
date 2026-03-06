# Future-State Runtime Call Stacks — Agent-MD-Centric Definition

- **Version**: `v3`
- **Design Basis**: `proposed-design.md` v2 + 2026-03-06 definition-source addendum
- **Date**: 2026-03-06

---

## Use Case Index

| use_case_id | Source Type | Title |
| --- | --- | --- |
| UC-001 | Requirement | Create Agent |
| UC-002 | Requirement | Update Agent Instructions / Metadata |
| UC-003 | Requirement | Configure Agent Capabilities |
| UC-004 | Requirement | List Agents |
| UC-005 | Requirement | Delete Agent |
| UC-006 | Requirement | Runtime Loads System Prompt (PromptLoader) |
| UC-007 | Requirement | Create Agent Team |
| UC-008 | Requirement | Update Team Instructions / Membership |
| UC-009 | Requirement | List Teams |
| UC-010 | Requirement | Delete Team |
| UC-011 | Requirement | Node Sync Export Bundle |
| UC-012 | Requirement | Node Sync Import Bundle |
| UC-013 | Requirement | List Agent Templates |
| UC-014 | Requirement | Duplicate Agent |
| UC-019 | Requirement | List Agent Team Templates |
| UC-020 | Requirement | Register Definition Source Path |
| UC-021 | Requirement | Remove Definition Source Path |
| UC-022 | Requirement | Reload Agents/Teams After Source Changes |
| DR-001 | Design-Risk | `agent.md` Parser Handles Malformed Input Without Crashing Listing |
| DR-002 | Design-Risk | `agent-config.json` Missing Does Not Block Agent Load |
| DR-003 | Design-Risk | Per-File Atomic Write via Temp+Rename (Node Sync Import source_wins) |
| DR-004 | Design-Risk | Partial-Write Failure in Regular Update Path |
| DR-005 | Design-Risk | Duplicate IDs Across Sources Resolve By Deterministic Precedence |
| DR-006 | Design-Risk | Invalid Source Path Or Structure Rejected Before Registration |

---

## UC-001 — Create Agent

**Source**: Requirement — REQ-001, REQ-002, REQ-006, REQ-012
**Requirement IDs**: REQ-001, REQ-002, REQ-006
**Expected Outcome**: `agent.md` and `agent-config.json` written to `agents/{id}/`; `AgentDefinition` returned with `instructions` field populated

### Primary Path

```
GraphQL Mutation: createAgentDefinition(input)
  └─ autobyteus-server-ts/src/api/graphql/types/agent-definition.ts : createAgentDefinition(input)
       │  Validate input: name, description, instructions required
       │  Map input → AgentDefinitionCreate domain object
       └─ src/agent-definition/services/agent-definition-service.ts : create(agentDef)
            │  Generate agentId = slugify(name), check collision → append -2, -3
            │  Merge mandatory processor names (filterOptionalProcessorNames)
            └─ src/agent-definition/providers/cached-agent-definition-provider.ts : create(agentDef)
                 └─ src/agent-definition/providers/file-agent-definition-provider.ts : create(agentDef)
                      │  path = AppConfig.getAgentsDir() + agentId/
                      │  mkdir -p agents/{agentId}/
                      │  [WRITE] agents/{agentId}/agent.md
                      │    └─ src/agent-definition/utils/agent-md-parser.ts : serializeAgentMd(fields, instructions)
                      │         → "---\nname: ...\ndescription: ...\ncategory: ...\nrole: ...\n---\n\n{instructions}"
                      │  [WRITE] agents/{agentId}/agent-config.json
                      │         → JSON.stringify({ toolNames:[], skillNames:[], ...processorNames, avatarUrl:null })
                      │  [STATE MUTATION] cache.set(agentId, agentDef)
                      └─ returns AgentDefinition { id, name, description, category, role, instructions, ... }
       └─ GraphQL maps AgentDefinition → AgentDefinitionGqlType
       └─ returns to client
```

### Error Path — Duplicate Name Collision

```
AgentDefinitionService.create(agentDef)
  │  agentId = slugify(name) → "my-agent"
  │  FileAgentDefinitionProvider.exists("my-agent") → true
  │  agentId = "my-agent-2"
  │  FileAgentDefinitionProvider.exists("my-agent-2") → false
  └─ proceeds with agentId = "my-agent-2"
```

### Error Path — Missing Required Field

```
GraphQL Mutation createAgentDefinition(input: { name: "X" })
  └─ GraphQL input validation: instructions missing → throws GraphQLUserInputError
  └─ client receives error: "instructions is required"
```

**Coverage**: Primary ✓ | Fallback N/A | Error ✓

---

## UC-002 — Update Agent Instructions / Metadata

**Source**: Requirement — REQ-001, REQ-006
**Expected Outcome**: `agent.md` frontmatter and/or body updated in place; `agent-config.json` unchanged

### Primary Path

```
GraphQL Mutation: updateAgentDefinition(input: { id, name?, description?, category?, role?, instructions? })
  └─ src/api/graphql/types/agent-definition.ts : updateAgentDefinition(input)
       └─ src/agent-definition/services/agent-definition-service.ts : update(id, update)
            └─ src/agent-definition/providers/cached-agent-definition-provider.ts : update(id, update)
                 └─ src/agent-definition/providers/file-agent-definition-provider.ts : update(id, update)
                      │  [READ] agents/{id}/agent.md → parse current frontmatter + body
                      │    └─ src/agent-definition/utils/agent-md-parser.ts : parseAgentMd(content)
                      │         → { name, description, category, role, instructions }
                      │  Merge: apply only provided fields from update onto current values
                      │  [WRITE] agents/{id}/agent.md (overwrite)
                      │    └─ agent-md-parser.ts : serializeAgentMd(mergedFields, mergedInstructions)
                      │  [STATE MUTATION] cache.set(id, updatedDef)
                      └─ returns updated AgentDefinition
```

### Error Path — Agent Not Found

```
FileAgentDefinitionProvider.update("nonexistent-id", ...)
  │  agents/nonexistent-id/ does not exist
  └─ throws AgentDefinitionNotFoundError
       └─ GraphQL returns error to client
```

**Coverage**: Primary ✓ | Fallback N/A | Error ✓

---

## UC-003 — Configure Agent Capabilities (Tools / Skills / Processors)

**Source**: Requirement — REQ-002, REQ-006
**Expected Outcome**: `agent-config.json` updated in place; `agent.md` unchanged

### Primary Path

```
GraphQL Mutation: updateAgentDefinition(input: { id, toolNames?, skillNames?, processorNames?... })
  └─ agent-definition-service.ts : update(id, update)
       └─ file-agent-definition-provider.ts : update(id, update)
            │  [READ] agents/{id}/agent-config.json → current config
            │  Merge capability fields: toolNames, skillNames, *ProcessorNames, avatarUrl
            │  [WRITE] agents/{id}/agent-config.json (overwrite)
            │  [STATE MUTATION] cache invalidate / update
            └─ returns updated AgentDefinition
```

Note: `update` operation separates concerns — identity/instruction fields go to `agent.md`; capability fields go to `agent-config.json`. The provider determines which file to update based on which fields are present in the update object.

**Coverage**: Primary ✓ | Fallback N/A | Error ✓ (same not-found path as UC-002)

---

## UC-004 — List Agents

**Source**: Requirement — REQ-005, REQ-006, REQ-012
**Expected Outcome**: All agents in `agents/` returned except `_templates/` subfolders

### Primary Path (Cache Hit)

```
GraphQL Query: agentDefinitions
  └─ agent-definition.ts (resolver) : agentDefinitions()
       └─ agent-definition-service.ts : getAll()
            └─ cached-agent-definition-provider.ts : getAll()
                 │  cache populated → return cache.values()
                 └─ returns [AgentDefinition, ...]
```

### Primary Path (Cache Miss / Cold Start)

```
cached-agent-definition-provider.ts : getAll()
  │  cache empty
  └─ file-agent-definition-provider.ts : getAll()
       │  [READ] fs.readdir(agents/)
       │  for each subdirectory entry:
       │    if entry.name starts with "_" → skip (template)
       │    [READ] agents/{entry}/agent.md
       │      └─ agent-md-parser.ts : parseAgentMd(content) → { name, description, category, role, instructions }
       │    [READ] agents/{entry}/agent-config.json → config
       │    construct AgentDefinition { id: entry, ...fields }
       └─ [STATE MUTATION] cache.setAll(results)
       └─ returns [AgentDefinition, ...]
```

### Error Path — Malformed `agent.md` in One Entry

```
file-agent-definition-provider.ts : getAll()
  │  for entry "bad-agent":
  │    parseAgentMd(content) → throws AgentMdParseError
  │    log.warn("Skipping agent bad-agent: parse error: ...")
  │    continue (do not crash listing)
  └─ returns list without "bad-agent"
```

**Coverage**: Primary ✓ | Fallback (cache miss) ✓ | Error ✓

---

## UC-005 — Delete Agent

**Source**: Requirement — REQ-006
**Expected Outcome**: `agents/{id}/` directory removed entirely

### Primary Path

```
GraphQL Mutation: deleteAgentDefinition(id: "my-agent")
  └─ agent-definition-service.ts : delete("my-agent")
       └─ cached-agent-definition-provider.ts : delete("my-agent")
            └─ file-agent-definition-provider.ts : delete("my-agent")
                 │  [DELETE] fs.rm(agents/my-agent/, { recursive: true })
                 │  [STATE MUTATION] cache.delete("my-agent")
                 └─ returns DeleteAgentDefinitionResult { success: true }
```

**Coverage**: Primary ✓ | Fallback N/A | Error ✓ (not-found → returns success: false or throws)

---

## UC-006 — Runtime Loads System Prompt (PromptLoader)

**Source**: Requirement — REQ-010
**Expected Outcome**: Returns body text of `agent.md` for the given `agentId`; used by `autobyteus-ts` runtime as the agent's system prompt

### Primary Path

```
autobyteus-ts runtime : buildSystemPrompt(agentId)
  └─ src/agent-definition/utils/prompt-loader.ts : getPromptTemplateForAgent(agentId)
       │  [READ] AppConfig.getAgentMdPath(agentId) → agents/{agentId}/agent.md
       └─ agent-md-parser.ts : parseAgentMd(content)
            │  Parse frontmatter → { name, description, category, role }
            └─ Extract body (content after closing "---\n\n")
       └─ returns instructions (body string)
```

### Error Path — `agent.md` Missing

```
prompt-loader.ts : getPromptTemplateForAgent("missing-agent")
  │  fs.readFile(agents/missing-agent/agent.md) → ENOENT
  └─ throws PromptLoadError("agent.md not found for agentId: missing-agent")
       └─ autobyteus-ts runtime handles error (agent cannot start)
```

**Coverage**: Primary ✓ | Fallback N/A | Error ✓

---

## UC-007 — Create Agent Team

**Source**: Requirement — REQ-003, REQ-004, REQ-007 (UC-008)
**Expected Outcome**: `team.md` and `team-config.json` written to `agent-teams/{id}/`

### Primary Path

```
GraphQL Mutation: createAgentTeamDefinition(input)
  └─ src/api/graphql/types/agent-team-definition.ts : createAgentTeamDefinition(input)
       └─ src/agent-team-definition/services/agent-team-definition-service.ts : create(teamDef)
            │  Generate teamId = slugify(name)
            └─ src/agent-team-definition/providers/cached-agent-team-definition-provider.ts : create(teamDef)
                 └─ src/agent-team-definition/providers/file-agent-team-definition-provider.ts : create(teamDef)
                      │  mkdir -p agent-teams/{teamId}/
                      │  [WRITE] agent-teams/{teamId}/team.md
                      │    └─ src/agent-team-definition/utils/team-md-parser.ts : serializeTeamMd(fields, instructions)
                      │  [WRITE] agent-teams/{teamId}/team-config.json
                      │         → JSON.stringify({ coordinatorMemberName, members:[], avatarUrl:null })
                      │  [STATE MUTATION] cache.set(teamId, teamDef)
                      └─ returns AgentTeamDefinition
```

**Coverage**: Primary ✓ | Fallback N/A | Error ✓

---

## UC-008 — Update Team Instructions / Membership

**Source**: Requirement — REQ-003, REQ-004
**Expected Outcome**: `team.md` and/or `team-config.json` updated; correct file written based on field type

### Primary Path

```
GraphQL Mutation: updateAgentTeamDefinition(input: { id, instructions?, members?... })
  └─ agent-team-definition-service.ts : update(id, update)
       └─ file-agent-team-definition-provider.ts : update(id, update)
            │  If instructions/name/description/category changed:
            │    [READ] agent-teams/{id}/team.md → parseTeamMd
            │    merge fields
            │    [WRITE] agent-teams/{id}/team.md
            │  If members/coordinatorMemberName/avatarUrl changed:
            │    [READ] agent-teams/{id}/team-config.json
            │    merge config fields
            │    [WRITE] agent-teams/{id}/team-config.json
            │  [STATE MUTATION] cache.set(id, updated)
            └─ returns updated AgentTeamDefinition
```

**Coverage**: Primary ✓ | Fallback N/A | Error ✓

---

## UC-009 — List Teams

**Source**: Requirement — REQ-005 (for teams)
**Expected Outcome**: All teams in `agent-teams/` returned except `_templates/` subfolders

### Primary Path (Cache Miss)

```
GraphQL Query: agentTeamDefinitions
  └─ agent-team-definition-service.ts : getAll()
       └─ file-agent-team-definition-provider.ts : getAll()
            │  [READ] fs.readdir(agent-teams/)
            │  for each entry (skip "_" prefix):
            │    [READ] agent-teams/{entry}/team.md → parseTeamMd → { name, description, category, instructions }
            │    [READ] agent-teams/{entry}/team-config.json → { coordinatorMemberName, members[], avatarUrl }
            │    construct AgentTeamDefinition
            └─ [STATE MUTATION] cache.setAll(results)
            └─ returns [AgentTeamDefinition, ...]
```

**Coverage**: Primary ✓ | Fallback (cache hit) ✓ | Error ✓ (malformed team.md skipped with WARN)

---

## UC-010 — Delete Team

**Source**: Requirement — REQ-004
**Expected Outcome**: `agent-teams/{id}/` directory removed

### Primary Path

```
GraphQL Mutation: deleteAgentTeamDefinition(id)
  └─ agent-team-definition-service.ts : delete(id)
       └─ file-agent-team-definition-provider.ts : delete(id)
            │  [DELETE] fs.rm(agent-teams/{id}/, { recursive: true })
            │  [STATE MUTATION] cache.delete(id)
            └─ returns DeleteAgentTeamDefinitionResult { success: true }
```

**Coverage**: Primary ✓ | Fallback N/A | Error ✓

---

## UC-011 — Node Sync Export Bundle

**Source**: Requirement — REQ-016, REQ-017
**Expected Outcome**: Bundle contains raw file content strings for each agent and team; absent `agent-config.json` on source defaults to serialized empty config rather than throwing

### Primary Path

```
GraphQL Query: exportSyncBundle(input: { scope: ["agent_definition", "agent_team_definition"] })
  └─ src/api/graphql/types/node-sync.ts : exportSyncBundle(input)
       └─ src/sync/services/node-sync-service.ts : exportBundle(scope, selection)
            │  For scope "agent_definition":
            │    agent-definition-service.getAll() → [AgentDefinition, ...]
            │    for each agent (agentId):
            │      agentMdPath = AppConfig.getAgentMdPath(agentId)
            │      [READ] fs.readFile(agentMdPath, "utf8") → agentMdContent (string)
            │      agentConfigPath = AppConfig.getAgentConfigPath(agentId)
            │      agentConfigContent = readRawFileOrDefault(agentConfigPath)
            │        └─ [same logic as DR-002]: try readFile; on ENOENT → JSON.stringify(defaultAgentConfig())
            │      bundle.entities.agent_definition.push({ agentId, agentMdContent, agentConfigContent })
            │  For scope "agent_team_definition":
            │    agent-team-definition-service.getAll() → [AgentTeamDefinition, ...]
            │    for each team (teamId):
            │      teamMdPath = AppConfig.getTeamMdPath(teamId)
            │      [READ] fs.readFile(teamMdPath, "utf8") → teamMdContent (string)
            │      teamConfigPath = AppConfig.getTeamConfigPath(teamId)
            │      teamConfigContent = readRawFileOrDefault(teamConfigPath)
            │        └─ [same default logic]: on ENOENT → JSON.stringify(defaultTeamConfig())
            │      bundle.entities.agent_team_definition.push({ teamId, teamMdContent, teamConfigContent })
            │  bundle.watermark = new Date().toISOString()
            └─ returns NodeSyncBundle
```

### Sub-Path — `agent-config.json` Absent on Source Node

```
node-sync-service.ts : readRawFileOrDefault(agentConfigPath)
  │  try { return fs.readFileSync(agentConfigPath, "utf8") }
  │  catch (e) {
  │    if (e.code === "ENOENT") {
  │      log.warn(`agent-config.json absent for export at ${agentConfigPath}, using defaults`)
  │      return JSON.stringify(defaultAgentConfig())  ← same defaults as DR-002
  │    }
  │    throw e
  │  }
```

**Coverage**: Primary ✓ | Sub-path (absent config) ✓ | Error ✓ (non-ENOENT errors propagated)

---

## UC-012 — Node Sync Import Bundle

**Source**: Requirement — REQ-018
**Expected Outcome**: Agent and team files written to target node's disk; caches refreshed

### Primary Path (source_wins conflict policy)

```
GraphQL Mutation: importSyncBundle(input: { bundle, conflictPolicy: "source_wins" })
  └─ src/sync/services/node-sync-service.ts : importBundle(bundle, conflictPolicy)
       │  For each agent_definition entry:
       │    agentDir = AppConfig.getAgentsDir() + entry.agentId
       │    mkdir -p agentDir
       │    [WRITE] AppConfig.getAgentMdPath(entry.agentId) ← entry.agentMdContent
       │    [WRITE] AppConfig.getAgentConfigPath(entry.agentId) ← entry.agentConfigContent
       │  await agent-definition-service.refreshCache()
       │  [STATE MUTATION] agent cache reloaded from disk
       │
       │  For each agent_team_definition entry:
       │    teamDir = AppConfig.getAgentTeamsDir() + entry.teamId
       │    mkdir -p teamDir
       │    [WRITE] AppConfig.getTeamMdPath(entry.teamId) ← entry.teamMdContent
       │    [WRITE] AppConfig.getTeamConfigPath(entry.teamId) ← entry.teamConfigContent
       │  await agent-team-definition-service.refreshCache()
       │  [STATE MUTATION] team cache reloaded from disk
       └─ returns ImportNodeSyncBundleResult { imported: N, skipped: 0 }
```

### Conflict Path (target_wins — existing agent present)

```
node-sync-service.ts : importBundle(bundle, "target_wins")
  │  For entry agentId "existing-agent":
  │    agents/existing-agent/ already exists
  │    conflictPolicy = "target_wins" → skip this entry
  │    skipped++
  └─ returns ImportNodeSyncBundleResult { imported: M, skipped: 1 }
```

**Coverage**: Primary ✓ | Fallback (target_wins) ✓ | Error ✓

---

## UC-013 — List Agent Templates

**Source**: Requirement — REQ-005
**Expected Outcome**: Only `_templates/` subfolders returned; regular agents not included

### Primary Path

```
GraphQL Query: agentTemplates
  └─ agent-definition.ts (resolver) : agentTemplates()
       └─ agent-definition-service.ts : getTemplates()
            └─ file-agent-definition-provider.ts : getTemplates()
                 │  [READ] fs.readdir(agents/)
                 │  for each entry:
                 │    if entry.name starts with "_" → include
                 │    else → skip
                 │  for each template entry:
                 │    [READ] agents/{entry}/agent.md → parseAgentMd
                 │    [READ] agents/{entry}/agent-config.json
                 └─ returns [AgentDefinition, ...] (template entries only)
```

**Coverage**: Primary ✓ | Fallback N/A | Error N/A

---

## UC-014 — Duplicate Agent

**Source**: Requirement — REQ-006
**Expected Outcome**: New agent folder created with copies of source `agent.md` and `agent-config.json`

### Primary Path

```
GraphQL Mutation: duplicateAgentDefinition(input: { sourceId: "my-agent", newName: "My Agent Copy" })
  └─ agent-definition-service.ts : duplicate(sourceId, newName)
       │  newId = slugify(newName), handle collision
       └─ file-agent-definition-provider.ts : duplicate(sourceId, newId)
            │  [READ] agents/{sourceId}/agent.md → sourceMdContent
            │  [READ] agents/{sourceId}/agent-config.json → sourceConfigContent
            │  [PARSE] parseAgentMd(sourceMdContent) → fields
            │  Override name field: fields.name = newName
            │  [WRITE] agents/{newId}/agent.md ← serializeAgentMd({ ...fields, name: newName }, fields.instructions)
            │  [WRITE] agents/{newId}/agent-config.json ← sourceConfigContent (verbatim copy)
            │  [STATE MUTATION] cache.set(newId, newAgentDef)
            └─ returns new AgentDefinition
```

**Coverage**: Primary ✓ | Fallback N/A | Error ✓ (source not found)

---

## DR-001 — `agent.md` Parser Handles Malformed Input Without Crashing Listing

**Source**: Design-Risk — risk that a single bad file brings down `getAll()`
**Technical Objective**: Parser errors on individual files must be isolated; listing must continue for valid files
**Expected Outcome**: Malformed files produce a WARN log; listing returns all valid agents; no exception propagated to caller

### Call Stack

```
file-agent-definition-provider.ts : getAll()
  │  for entry "bad-agent":
  │    content = fs.readFileSync(agents/bad-agent/agent.md, "utf8")
  │    try {
  │      agent-md-parser.ts : parseAgentMd(content) → throws AgentMdParseError("missing name field")
  │    } catch (e: AgentMdParseError) {
  │      log.warn(`Skipping agent folder "bad-agent": ${e.message}`)
  │      continue  ← listing continues
  │    }
  │  for entry "good-agent":
  │    parseAgentMd succeeds
  │    agent included in result
  └─ returns [good-agent, ...]
```

**Coverage**: Primary ✓ | Error path (isolation) ✓

---

## DR-002 — `agent-config.json` Missing Does Not Block Agent Load

**Source**: Design-Risk — `agent-config.json` may not exist for freshly created template or migrated agent
**Technical Objective**: `agent-config.json` absence defaults to empty config; does not throw
**Expected Outcome**: Agent loaded successfully with all capability fields defaulted to `[]`/`null`

### Call Stack

```
file-agent-definition-provider.ts : readAgentConfig(agentId)
  │  try {
  │    content = fs.readFileSync(agents/{agentId}/agent-config.json, "utf8")
  │    return JSON.parse(content)
  │  } catch (e) {
  │    if (e.code === "ENOENT") {
  │      log.warn(`agent-config.json missing for ${agentId}, using defaults`)
  │      return defaultAgentConfig()  ← { toolNames:[], skillNames:[], ...allEmpty, avatarUrl: null }
  │    }
  │    throw e  ← propagate unexpected errors
  │  }
```

**Coverage**: Primary ✓ | Fallback (missing file) ✓

---

## DR-003 — Per-File Atomic Write via Temp+Rename (Node Sync Import source_wins)

**Source**: Design-Risk — risk that a partial write leaves a file in a corrupted state
**Technical Objective**: Each individual file write (agent.md, agent-config.json) is individually atomic via temp+rename. Cross-file atomicity for the pair is NOT guaranteed; a brief consistency window is accepted.
**Expected Outcome**: Each file is either fully the old version or fully the new version (no partial content). If a crash occurs between the two file writes, server restart + `refreshCache()` restores consistency from disk.

### Call Stack

```
node-sync-service.ts : importAgentDefinition(entry)
  │  // Use store-utils.ts writeRawFile(path, content) for each file (C-034)
  │  // writeRawFile internally:
  │  //   1. Acquires cross-process lock on the target path
  │  //   2. Writes content to temp path: {path}.{pid}.{ts}.tmp
  │  //   3. fs.rename(tempPath, finalPath)  ← atomic per-file on Linux (same filesystem)
  │  //   4. Releases lock
  │
  │  await writeRawFile(AppConfig.getAgentMdPath(entry.agentId), entry.agentMdContent)
  │  // agent.md is now fully the new version OR still the old version (never partial content)
  │
  │  await writeRawFile(AppConfig.getAgentConfigPath(entry.agentId), entry.agentConfigContent)
  │  // agent-config.json is now fully new OR still old (never partial content)
  │
  │  // Brief window between the two renames: agent.md = new, agent-config.json = old
  │  // Recovery path: server restart calls refreshCache() which re-reads both files from disk
  │  // This window is accepted — not safety-critical
```

### Error Path — Write Failure

```
writeRawFile(agentMdPath, content)
  │  temp write fails (e.g., disk full)
  │  lock released, temp file cleaned up
  └─ throws WriteError → propagated to importBundle caller
     → import logs error for this entry, continues for remaining entries
```

**Coverage**: Primary ✓ | Per-file atomicity guaranteed ✓ | Cross-file consistency window accepted and documented ✓ | Error ✓

---

## DR-004 — Partial-Write Failure in Regular Update Path

**Source**: Design-Risk — regular `update()` writes both `agent.md` and `agent-config.json` when a combined mutation is submitted; failure between the two writes leaves a brief inconsistency
**Technical Objective**: Confirm the same per-file atomicity + accepted-window model applies to the regular update path (not only sync import)
**Expected Outcome**: Same as DR-003 — each file is individually safe; cross-file consistency window is accepted; `refreshCache()` on server restart restores consistency

### Call Stack

```
file-agent-definition-provider.ts : update(id, update)
  │  // Determine which files need updating based on fields present in update object
  │  mdFieldsChanged = update has any of: name, description, category, role, instructions
  │  configFieldsChanged = update has any of: toolNames, skillNames, *ProcessorNames, avatarUrl
  │
  │  if (mdFieldsChanged):
  │    [READ] agent.md → parse current state
  │    merge md fields
  │    await writeRawFile(agentMdPath, serializeAgentMd(merged))  ← per-file atomic
  │
  │  if (configFieldsChanged):
  │    [READ] agent-config.json → parse current config (DR-002 default on ENOENT)
  │    merge config fields
  │    await writeJsonFile(agentConfigPath, mergedConfig)  ← per-file atomic (store-utils)
  │
  │  // If both files needed updating: same accepted consistency window as DR-003
  │  // Recovery: server restart + refreshCache() re-reads both files
  │
  │  [STATE MUTATION] cache.set(id, updatedDef)
  └─ returns updated AgentDefinition
```

**Coverage**: Primary ✓ | Combined-update path ✓ | Consistency window accepted and documented ✓

---

## UC-019 — List Agent Team Templates

**Source**: Requirement — REQ-005
**Expected Outcome**: Only `_templates/` subfolders in `agent-teams/` are returned; regular teams not included; empty list returned if no templates exist

### Primary Path

```
GraphQL Query: agentTeamTemplates
  └─ agent-team-definition.ts (resolver) : agentTeamTemplates()
       └─ agent-team-definition-service.ts : getTemplates()
            └─ file-agent-team-definition-provider.ts : getTemplates()
                 │  [READ] fs.readdirSync(agent-teams/, { withFileTypes: true })
                 │  for each entry (dirent):
                 │    if entry.isDirectory() && entry.name starts with "_" → include
                 │    else → skip
                 │  if no matching entries → return []  ← no throw on empty/absent templates
                 │  for each template entry:
                 │    [READ] agent-teams/{entry}/team.md → parseTeamMd → fields + instructions
                 │    [READ] agent-teams/{entry}/team-config.json → config (DR-002 default on ENOENT)
                 └─ returns [AgentTeamDefinition, ...] (template entries only)
```

### Error Path — Template Directory Absent

```
file-agent-team-definition-provider.ts : getTemplates()
  │  fs.readdirSync(agent-teams/) entries: no "_"-prefixed directories found
  └─ returns []  ← empty list, no error thrown
```

**Coverage**: Primary ✓ | Empty/absent templates → empty list ✓ | Error N/A (empty is valid)

---

## UC-020 — Register Definition Source Path

**Source**: Requirement — REQ-025, REQ-026, REQ-027, REQ-029, REQ-031
**Expected Outcome**: Valid absolute source root is persisted in server settings, returned by `definitionSources`, and agent/team caches are refreshed.

### Primary Path

```
GraphQL Mutation: addDefinitionSource(path)
  └─ src/api/graphql/types/definition-sources.ts : addDefinitionSource(path)
       └─ src/definition-sources/services/definition-source-service.ts : addDefinitionSource(path)
            │  normalize = path.resolve(path)
            │  validate absolute path, existence, and directory type
            │  validate source root shape:
            │    - has agents/ OR agent-teams/
            │  reject if equals default app-data root
            │  reject if already in AUTOBYTEUS_DEFINITION_SOURCE_PATHS
            │  newValue = currentValue + "," + normalize
            │  getServerSettingsService().updateSetting("AUTOBYTEUS_DEFINITION_SOURCE_PATHS", newValue)
            │  AgentDefinitionService.getInstance().refreshCache()
            │  AgentTeamDefinitionService.getInstance().refreshCache()
            └─ listDefinitionSources()
                 │  source[0] = default app-data root
                 │  source[n] = additional roots from AppConfig
                 │  count per-source definitions from {root}/agents and {root}/agent-teams
                 └─ returns [DefinitionSource]
```

### Error Path — Invalid Source

```
DefinitionSourceService.addDefinitionSource(path)
  │  resolved path not found OR not directory OR missing both agents/ and agent-teams/
  └─ throws Error("Definition source must contain agents/ or agent-teams/")
     └─ GraphQL mutation returns error to client
```

**Coverage**: Primary ✓ | Error ✓

---

## UC-021 — Remove Definition Source Path

**Source**: Requirement — REQ-025, REQ-027, REQ-029, REQ-031
**Expected Outcome**: Source path is removed from settings, cache is refreshed, and source-unique entities disappear from list queries.

### Primary Path

```
GraphQL Mutation: removeDefinitionSource(path)
  └─ definition-sources.ts : removeDefinitionSource(path)
       └─ definition-source-service.ts : removeDefinitionSource(path)
            │  normalize = path.resolve(path)
            │  reject removal if normalized path equals default app-data root
            │  read current additional roots from AppConfig
            │  remove normalized path from list; fail if not found
            │  update AUTOBYTEUS_DEFINITION_SOURCE_PATHS with remaining roots
            │  refresh agent/team definition caches
            └─ listDefinitionSources() and return updated list
```

### Error Path — Remove Unknown Source

```
DefinitionSourceService.removeDefinitionSource(path)
  │  normalized path not found in configured additional roots
  └─ throws Error("Definition source not found")
```

**Coverage**: Primary ✓ | Error ✓

---

## UC-022 — Reload Agents/Teams After Source Changes

**Source**: Requirement — REQ-028, REQ-029, REQ-032
**Expected Outcome**: Existing Reload actions in Agents/Teams pages show latest definitions across default and registered sources.

### Primary Path

```
UI: Agents page "Reload"
  └─ autobyteus-web/components/agents/AgentList.vue : onReload()
       └─ autobyteus-web/stores/agentDefinitionStore.ts : fetchAgentDefinitions(force)
            └─ GraphQL query agentDefinitions
                 └─ AgentDefinitionResolver.agentDefinitions()
                      └─ AgentDefinitionService.getAllAgentDefinitions()
                           └─ CachedAgentDefinitionProvider.getAll()
                                └─ FileAgentDefinitionProvider.getAll()
                                     │  build source roots in precedence order:
                                     │    1) default agents dir
                                     │    2) additional source roots + "/agents"
                                     │  scan directories, skip "_" templates
                                     │  dedupe by id (first hit wins)
                                     └─ returns merged list

UI: Agent Teams page "Reload"
  └─ same pattern via agentTeamDefinitions query and team provider roots:
     default agent-teams dir + additional source roots + "/agent-teams"
```

### Error/Fallback Path — Missing Side Directory

```
FileAgentDefinitionProvider.getAll()
  │  source root exists but "{root}/agents" does not
  └─ skip that source for agent listing (no throw)

FileAgentTeamDefinitionProvider.getAll()
  │  source root exists but "{root}/agent-teams" does not
  └─ skip that source for team listing (no throw)
```

**Coverage**: Primary ✓ | Fallback ✓ | Error N/A

---

## DR-005 — Duplicate IDs Across Sources Resolve By Deterministic Precedence

**Source**: Design-Risk — same `id` can exist in default and custom sources
**Technical Objective**: Ensure deterministic `first-hit-wins` ordering with default source as highest precedence.
**Expected Outcome**: `agentDefinition(id)` and `agentTeamDefinition(id)` always resolve from default when duplicated.

### Call Stack

```
FileAgentDefinitionProvider.getById(id)
  │  candidateRoots = [defaultAgentsDir, ...additionalRoots/agents]
  │  for root in candidateRoots:
  │    if {root}/{id}/agent.md exists → load and return immediately
  └─ returns first match only

FileAgentTeamDefinitionProvider.getById(id)
  │  candidateRoots = [defaultTeamsDir, ...additionalRoots/agent-teams]
  │  same first-match lookup pattern
  └─ returns first match only
```

**Coverage**: Deterministic precedence ✓

---

## DR-006 — Invalid Source Path Or Structure Rejected Before Registration

**Source**: Design-Risk — malformed source roots can degrade listing stability if accepted
**Technical Objective**: Block invalid source registration at API boundary.
**Expected Outcome**: Invalid paths are rejected without mutating settings state.

### Call Stack

```
DefinitionSourceService.addDefinitionSource(path)
  │  normalize path
  │  checks:
  │    - path is absolute
  │    - path exists
  │    - path is directory
  │    - contains agents/ OR agent-teams/
  │  on any failure: throw before updateSetting()
  └─ AUTOBYTEUS_DEFINITION_SOURCE_PATHS remains unchanged
```

**Coverage**: Validation-first guard ✓
