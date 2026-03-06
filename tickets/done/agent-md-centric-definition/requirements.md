# Requirements — Agent-MD-Centric Definition

- **Status**: `Design-ready` (2026-03-06 addendums integrated)
- **Ticket**: `agent-md-centric-definition`
- **Branch**: `codex/json-file-persistence-sync-parity`
- **Date**: 2026-03-06
- **Triage**: `Large`

---

## Goal / Problem Statement

The current system has a structurally flawed split between **prompt engineering** and **agent definitions**:

1. Agent instructions (system prompt) live in versioned `prompt-v{N}.md` files inside each agent folder, while prompt metadata lives in a separate `prompts.json` store.
2. A `prompt-mappings.json` file cross-links agents to prompt families.
3. When a prompt is activated, its content is **copied** into the agent folder — making agent folders not self-contained.
4. This makes agent and agent-team sharing extremely difficult.

The redesign eliminates this split entirely:

- **An agent is fully defined by two files**: `agent.md` (identity + instructions) and `agent-config.json` (capabilities: processor config, tools, skills).
- **An agent team is fully defined by two files**: `team.md` (identity + orchestrator instructions) and `team-config.json` (member agent references, workflow config).
- **The separate prompt engineering module is removed entirely.**
- **Agents and teams folders are self-contained** and shareable as git repositories.

---

## Triage Rationale

`Large`: multi-layer impact across —
- Backend file persistence format (agent + team)
- Backend GraphQL API (agent type, team type, remove prompt API)
- Backend runtime system-prompt loading (`PromptLoader`)
- Backend node-sync bundle format and I/O
- Full removal of `prompt-engineering` module
- Frontend: remove all prompt-engineering components + stores + GraphQL documents
- Frontend: update agent and team forms to include instructions

---

## In-Scope Use Cases

### UC-001 — User Creates an Agent
User provides name, description, optional category, optional role, and agent instructions (system prompt body). Backend creates:
- `agents/{agent-id}/agent.md` — frontmatter (name, description, category, role) + instructions body
- `agents/{agent-id}/agent-config.json` — default empty config (empty skillNames, toolNames, processor config)

### UC-002 — User Updates Agent Instructions
User edits agent instructions. Backend updates the body section of `agent.md` in place. Frontmatter fields remain unchanged unless also edited.

### UC-003 — User Updates Agent Identity (Name / Description / Category / Role)
User edits agent metadata fields. Backend updates only the frontmatter section of `agent.md`.

### UC-004 — User Configures Agent Capabilities (Tools / Skills / Processor)
User selects tools, skills, and optionally configures the processor (LLM model, processor pipeline names). Backend writes `agent-config.json`.

### UC-005 — User Reads / Lists Agents
Backend scans `agents/` directory, reads `agent.md` frontmatter for each agent, returns list. Template subfolders (starting with `_`) are excluded from the regular list and returned separately.

### UC-006 — User Deletes an Agent
Backend removes the entire `agents/{agent-id}/` directory.

### UC-007 — Agent Runtime Loads System Prompt
When an agent is executed, the runtime reads the body of `agents/{agent-id}/agent.md` as the system prompt content (replaces current `PromptLoader` logic that reads `prompt-v{N}.md`).

### UC-008 — User Creates an Agent Team
User provides team name, description, optional category, and orchestrator instructions. Backend creates:
- `agent-teams/{team-id}/team.md` — frontmatter (name, description, category) + orchestrator instructions body
- `agent-teams/{team-id}/team-config.json` — member agents list (initially empty or with provided members), coordinator reference

### UC-009 — User Updates Team Instructions
User edits orchestrator instructions. Backend updates body of `team.md` in place.

### UC-010 — User Updates Team Membership
User adds/removes member agents from the team. Backend updates `team-config.json`.

### UC-011 — User Reads / Lists Teams
Backend scans `agent-teams/` directory, reads `team.md` frontmatter, returns list (excluding `_templates/`).

### UC-012 — User Deletes a Team
Backend removes the entire `agent-teams/{team-id}/` directory.

### UC-013 — Node Sync Exports Agent Bundle
Node sync export produces a bundle where each agent entry contains: `agentId`, raw `agent.md` file content (string), raw `agent-config.json` file content (string).

### UC-014 — Node Sync Imports Agent Bundle
Node sync import receives agent bundle entries and writes `agent.md` and `agent-config.json` to the target node's `agents/{agentId}/` folder.

### UC-015 — Node Sync Exports Team Bundle
Node sync export produces a bundle where each team entry contains: `teamId`, raw `team.md` file content (string), raw `team-config.json` file content (string).

### UC-016 — Node Sync Imports Team Bundle
Node sync import receives team bundle entries and writes `team.md` and `team-config.json` to the target node's `agent-teams/{teamId}/` folder.

### UC-017 — Agent Template Listing
Backend lists all `_templates/` subfolders within `agents/` as available agent templates (read-only). Frontend can present them as starting points when creating a new agent.

### UC-019 — List Agent Team Templates
Backend lists all `_templates/` subfolders within `agent-teams/` as available team templates. Frontend can present them as starting points when creating a new team.

### UC-018 — Agent Duplication
User duplicates an existing agent. Backend copies `agent.md` and `agent-config.json` from source agent folder to a new agent folder with a new name/ID.

### UC-020 — User Registers a Definition Source Path in Settings
User enters an absolute source root path in Settings (`Definition Sources`). Backend validates and stores the source path for future scans.

### UC-021 — User Removes a Definition Source Path
User removes a custom definition source from Settings. Backend updates source-path config and cached definitions from that source are no longer listed.

### UC-022 — User Reloads Agents/Teams After Source Changes
User edits files under a registered source root (or changes source registration) and clicks Reload in Agents/Teams pages; lists refresh to latest source-managed definitions.

### UC-023 — User Duplicates an Agent and Immediately Edits It
From Agent detail view, user clicks Duplicate. UI duplicates using an auto-generated collision-safe copy name, then navigates directly to edit view for the duplicated agent so user can adjust and save.

---

## Requirements

### File Format Requirements

#### REQ-001 — `agent.md` Frontmatter + Body Format
`agent.md` MUST use a SKILL.md-style frontmatter block followed by the instruction body:

```markdown
---
name: My Agent
description: Does X, Y, Z
category: software-engineering
role: Backend Engineer
---

You are a backend engineer specialised in TypeScript...
(rest of the system instructions)
```

- `name` — required string
- `description` — required string
- `category` — optional string (free-form)
- `role` — optional string (free-form)
- Body (after closing `---`) — required; the system instructions / prompt content
- Malformed frontmatter (missing `name` or `description`, unclosed `---`) MUST produce a logged parse error and a clear thrown exception; the file must NOT be silently skipped or partially read

#### REQ-002 — `agent-config.json` Schema
`agent-config.json` stores all agent capability/pipeline configuration:

```json
{
  "toolNames": [],
  "skillNames": [],
  "inputProcessorNames": [],
  "llmResponseProcessorNames": [],
  "systemPromptProcessorNames": [],
  "toolExecutionResultProcessorNames": [],
  "toolInvocationPreprocessorNames": [],
  "lifecycleProcessorNames": [],
  "avatarUrl": null
}
```

- All array fields default to `[]` when not present
- `avatarUrl` defaults to `null`
- Unknown fields MUST be preserved (round-trip safe) to allow forward compatibility
- `activePromptVersion` MUST NOT appear in this file

#### REQ-003 — `team.md` Frontmatter + Body Format

```markdown
---
name: My Dev Team
description: Full-stack development team
category: software-engineering
---

You are the coordinator for a full-stack development team.
Delegate backend tasks to the Backend Engineer and frontend tasks to the Frontend Engineer...
```

- `name` — required string
- `description` — required string
- `category` — optional string (free-form)
- Body — required; orchestrator/coordinator instructions
- Same parse error rules as `agent.md`

#### REQ-004 — `team-config.json` Schema

```json
{
  "coordinatorMemberName": "string",
  "members": [
    {
      "memberName": "string",
      "ref": "string",
      "refType": "agent" | "agent_team"
    }
  ],
  "avatarUrl": null
}
```

- `coordinatorMemberName` — required string; MUST match one of the `memberName` values in `members`
- `members` — array of member references
- `ref` — the target agent/team ID
- `refType` — `"agent"` or `"agent_team"` (enables future team-of-teams support)
- `avatarUrl` defaults to `null`

#### REQ-005 — Template Subfolder Convention
Any agent or team subfolder whose name begins with `_` (underscore) is a **template**, not a regular entity:
- Templates MUST be excluded from the regular `agentDefinitions` and `agentTeamDefinitions` queries
- Agent templates MUST be returned by a dedicated `agentTemplates` GraphQL query
- Team templates MUST be returned by a dedicated `agentTeamTemplates` GraphQL query
- Templates follow the exact same file format (`agent.md` + `agent-config.json` or `team.md` + `team-config.json`)
- If the `_templates/` subdirectory is absent or empty, both queries MUST return an empty list without throwing

---

### Backend Persistence Requirements

#### REQ-006 — `FileAgentDefinitionProvider` Rewrite
The provider MUST read/write `agent.md` + `agent-config.json` instead of `agent.json` + `prompt-v{N}.md`:
- `create`: write `agent.md` (frontmatter + body) + write `agent-config.json` (defaults)
- `read` / `getAll`: parse frontmatter + body from `agent.md`, parse config from `agent-config.json`
- `update`: update `agent.md` frontmatter and/or body in place; update `agent-config.json` in place
- `delete`: remove entire agent folder

#### REQ-007 — `AppConfig` New Path Helpers
`AppConfig` MUST expose:
- `getAgentMdPath(agentId: string): string`
- `getAgentConfigPath(agentId: string): string`
- `getTeamMdPath(teamId: string): string`
- `getTeamConfigPath(teamId: string): string`

#### REQ-008 — `AgentDefinition` Domain Model Update
The `AgentDefinition` class MUST:
- Add `instructions: string` field (the body of `agent.md`)
- Add `category?: string` field
- Remove `activePromptVersion: number` field
- Remove `systemPromptCategory` and `systemPromptName` runtime-only fields

#### REQ-009 — `AgentTeamDefinition` Domain Model Update
`AgentTeamDefinition` MUST:
- Add `instructions: string` field (the body of `team.md`)
- Add `category?: string` field
- `TeamMember.referenceId` replaces `agentId`; `TeamMember.referenceType` uses `"agent" | "agent_team"`

#### REQ-010 — `PromptLoader` Replacement
`PromptLoader.getPromptTemplateForAgent(agentId)` MUST:
- Read `agents/{agentId}/agent.md`
- Parse the frontmatter
- Return only the body (the system instructions content)
- NOT read any `prompt-v{N}.md` file

#### REQ-011 — Full Removal of Prompt Engineering Module
The following MUST be deleted with no replacement or compatibility shim:
- `autobyteus-server-ts/src/prompt-engineering/` (entire directory)
- `autobyteus-server-ts/src/agent-definition/providers/file-agent-prompt-mapping-provider.ts`
- `autobyteus-server-ts/src/agent-definition/providers/agent-prompt-mapping-persistence-provider.ts`
- All prompt mapping references from `AgentDefinitionService`
- `prompt-mappings.json` persistence path and all code that reads/writes it
- All `prompt-v{N}.md` write paths (they MUST NOT be created for new agents)

---

### GraphQL API Requirements

#### REQ-012 — Updated `AgentDefinition` GraphQL Type

```graphql
type AgentDefinition {
  id: String!
  name: String!
  role: String
  description: String!
  category: String
  instructions: String!
  avatarUrl: String
  toolNames: [String!]!
  inputProcessorNames: [String!]!
  llmResponseProcessorNames: [String!]!
  systemPromptProcessorNames: [String!]!
  toolExecutionResultProcessorNames: [String!]!
  toolInvocationPreprocessorNames: [String!]!
  lifecycleProcessorNames: [String!]!
  skillNames: [String!]!
}
```

- `activePromptVersion` MUST be removed
- `instructions` MUST be added as required field
- `category` MUST be added as optional field
- `role` becomes optional (was required)

#### REQ-013 — Updated `CreateAgentDefinitionInput` and `UpdateAgentDefinitionInput`
Both input types MUST include `instructions: String!` and `category: String`.
`activePromptVersion` MUST be removed from both.

#### REQ-014 — Updated `AgentTeamDefinition` GraphQL Type

```graphql
type AgentTeamDefinition {
  id: String!
  name: String!
  description: String!
  category: String
  instructions: String!
  coordinatorMemberName: String!
  avatarUrl: String
  nodes: [TeamNode!]!
}
```

`instructions` MUST be added. `role` can be removed or kept as optional.

#### REQ-015 — Remove All Prompt GraphQL API
The following MUST be fully removed from the GraphQL schema with no deprecation period:
- Types: `Prompt`, `PromptDetails`, `PromptCategory`, `CreatePromptInput`, `UpdatePromptInput`, `AddNewPromptRevisionInput`, `MarkActivePromptInput`, `DeletePromptInput`, `DeletePromptResult`
- Queries: `prompts`, `promptDetails`, `availablePromptCategories`, `promptDetailsByNameAndCategory`
- Mutations: `createPrompt`, `updatePrompt`, `addNewPromptRevision`, `markActivePrompt`, `deletePrompt`
- Resolver file: `autobyteus-server-ts/src/api/graphql/types/prompt.ts`

---

### Node Sync Requirements

#### REQ-016 — Updated `SyncAgentDefinition` Bundle Payload
```typescript
interface SyncAgentDefinition {
  agentId: string;
  agentMdContent: string;      // full text of agent.md
  agentConfigContent: string;  // full text of agent-config.json
}
```

The old `agent` object and `promptVersions` record MUST be removed from the bundle format.

#### REQ-017 — Updated `SyncAgentTeamDefinition` Bundle Payload
```typescript
interface SyncAgentTeamDefinition {
  teamId: string;
  teamMdContent: string;       // full text of team.md
  teamConfigContent: string;   // full text of team-config.json
}
```

#### REQ-018 — Node Sync Import Writes Correct Files
On import:
- Agent bundle entry: write `agentMdContent` to `agents/{agentId}/agent.md` and `agentConfigContent` to `agents/{agentId}/agent-config.json`
- Team bundle entry: write `teamMdContent` to `agent-teams/{teamId}/team.md` and `teamConfigContent` to `agent-teams/{teamId}/team-config.json`
- Call `refreshCache()` on respective services after writing

---

### Frontend Requirements

#### REQ-019 — Remove All Prompt-Engineering Frontend Code
The following MUST be deleted with no replacement:
- Components: `CreatePromptView.vue`, `PromptCard.vue`, `PromptDetails.vue`, `PromptCompare.vue`, `DraftsList.vue`, `PromptMarketplace.vue`, `CanonicalModelSelector.vue`, `CreatableCategorySelect.vue`
- Stores: `promptStore.ts`, `promptEngineeringViewStore.ts`
- GraphQL documents: `graphql/mutations/prompt_mutations.ts`, `graphql/queries/prompt_queries.ts`
- Any route that renders a prompt-engineering component

#### REQ-020 — Agent Form Includes Instructions Field
`AgentDefinitionForm.vue` MUST include a `instructions` textarea (multiline, large):
- Placeholder: "Enter the agent's system instructions..."
- Required field validation
- Bound to `agentDefinitionStore.instructions`

#### REQ-021 — Agent Detail View Shows Instructions
Agent detail/view component MUST render the `instructions` field alongside other agent metadata.

#### REQ-022 — Team Form Includes Instructions Field
`AgentTeamDefinitionForm.vue` MUST include an `instructions` textarea:
- Placeholder: "Enter the team coordinator's instructions..."
- Required field validation

#### REQ-023 — Frontend GraphQL Documents Updated
All agent definition queries and mutations MUST include the `instructions` and `category` fields.
`activePromptVersion` MUST be removed from all frontend GraphQL documents.
All team definition queries and mutations MUST include `instructions` and `category`.

#### REQ-024 — `agentDefinitionStore` Updated
- Add `instructions: string` state field
- Add `category: string` state field
- Remove all prompt-related state, actions, and getters (e.g., `promptVersion`, `activePromptVersion`)

---

### Definition Source Requirements (V1 Addendum)

#### REQ-025 — Settings-Managed Definition Sources API
Backend GraphQL MUST expose settings-level source management for definition packages:
- `definitionSources: [DefinitionSource!]!`
- `addDefinitionSource(path: String!): [DefinitionSource!]!`
- `removeDefinitionSource(path: String!): [DefinitionSource!]!`

`DefinitionSource` MUST include:
- `path: String!`
- `agentCount: Int!`
- `agentTeamCount: Int!`
- `isDefault: Boolean!`

#### REQ-026 — Source Root Structure and Scope
A definition source path is a root directory that may contain:
- `agents/`
- `agent-teams/`

Rules:
- Input path must be absolute (relative paths are rejected at mutation boundary).
- At least one of those subdirectories must exist.
- Missing one subdirectory is allowed (count = 0 for that side).
- v1 accepts only filesystem paths (no GitHub URL clone/fetch support).

#### REQ-027 — AppConfig Definition Source Paths
`AppConfig` MUST expose parsing for additional source roots from:
- `AUTOBYTEUS_DEFINITION_SOURCE_PATHS` (comma-separated absolute paths)

Rules:
- Non-existent / non-directory entries are ignored with warnings.
- Default app-data source is always present and marked `isDefault=true`.

#### REQ-028 — Multi-Source Read Aggregation for Agents and Teams
Agent/team file providers MUST aggregate read surfaces across:
1. default app-data directories,
2. additional definition source roots.

Aggregation rules:
- Default source has precedence.
- Then additional sources in configured order.
- Duplicate IDs are de-duplicated by precedence (first hit wins).

#### REQ-029 — Source Change Refresh Semantics
After add/remove source mutations:
- agent definition cache MUST refresh,
- agent team definition cache MUST refresh,
- subsequent list/get queries MUST reflect updated sources without restart.

#### REQ-030 — Write Semantics Stay Default-Only
Create/update/delete/duplicate operations remain default-directory owned:
- "Import" semantics in v1 mean **register external source path for read aggregation only**.
- No automatic copy/import into default directory when adding a source.
- No Git clone/mirror behavior in v1.
- External sources are read-only from the definition-management API surface.

#### REQ-031 — Settings UI for Definition Sources
Frontend Settings page MUST add a `Definition Sources` section with:
- current source list,
- per-source counts (`agentCount`, `agentTeamCount`),
- add path input,
- remove custom source action,
- error and success feedback.

#### REQ-032 — Reload Compatibility
Existing `Reload` actions in Agents/Teams pages MUST continue to work and reflect source-managed items after source changes.

#### REQ-033 — Duplicate Agent UX Flow (No Browser Prompt + Direct Edit)
Agent duplication from frontend detail view MUST follow this flow:
- MUST NOT use browser-native blocking dialogs (`window.prompt`, `window.alert`, `window.confirm`) for duplicate naming flow.
- MUST derive a collision-safe duplicate name automatically (e.g., `"{name} Copy"`, `"{name} Copy 2"` when needed).
- MUST navigate directly to agent edit view for the duplicated agent after duplicate mutation succeeds.
- MUST keep duplicate action asynchronous with in-flight disabled state to prevent accidental double-submit.

---

## Acceptance Criteria

### AC-001 — `agent.md` Parses Correctly
- **Given**: `agents/my-agent/agent.md` with valid frontmatter (name, description, body)
- **When**: `FileAgentDefinitionProvider.getById("my-agent")` is called
- **Then**: returned `AgentDefinition` has correct `name`, `description`, `category`, `role`, and `instructions` matching file content

### AC-002 — `agent.md` Parse Error Is Thrown on Malformed File
- **Given**: `agent.md` with missing `name` or unclosed `---`
- **When**: provider attempts to read it
- **Then**: a descriptive exception is thrown and logged; application does not silently return partial/null data

### AC-003 — `agent-config.json` Round-Trips Correctly
- **Given**: an agent with `skillNames: ["web-search"]` and `toolNames: ["bash"]`
- **When**: read back from disk
- **Then**: `AgentDefinition.skillNames` = `["web-search"]`, `AgentDefinition.toolNames` = `["bash"]`

### AC-004 — Creating Agent Produces Correct Files
- **Given**: `createAgentDefinition` mutation with name, description, instructions, category, and role
- **When**: mutation resolves
- **Then**: `agents/{id}/agent.md` exists with correct frontmatter and instructions body; `agents/{id}/agent-config.json` exists with all arrays defaulting to `[]`

### AC-005 — No `prompt-v{N}.md` Files Are Created
- **Given**: a newly created agent
- **When**: the `agents/{id}/` directory is inspected
- **Then**: no files matching `prompt-v*.md` exist

### AC-006 — `activePromptVersion` Does Not Appear Anywhere in New Code
- **Given**: codebase after implementation
- **When**: code review is performed
- **Then**: no references to `activePromptVersion` exist in source, tests, or GraphQL schema

### AC-007 — Prompt Engineering GraphQL API Is Gone
- **Given**: the running server
- **When**: a client sends `query { prompts { id } }`
- **Then**: server returns a GraphQL error: field `prompts` does not exist on type `Query`

### AC-008 — `PromptLoader` Reads `agent.md` Body
- **Given**: `agents/my-agent/agent.md` with instructions body "You are a helpful agent..."
- **When**: `PromptLoader.getPromptTemplateForAgent("my-agent")` is called
- **Then**: returns "You are a helpful agent..."

### AC-009 — Team Definition Parses Correctly
- **Given**: `agent-teams/my-team/team.md` with valid frontmatter and body
- **When**: `FileAgentTeamDefinitionProvider.getById("my-team")` is called
- **Then**: `AgentTeamDefinition` has correct `name`, `description`, `instructions`

### AC-010 — Team Config Members Round-Trip
- **Given**: `team-config.json` with two members, one of `refType: "agent"`, one of `refType: "agent_team"`
- **When**: read back and the team is returned via GraphQL
- **Then**: both members are present with correct `ref` and `refType`

### AC-011 — Node Sync Export Includes `agentMdContent` and `agentConfigContent`
- **Given**: an agent with `agent.md` and `agent-config.json`
- **When**: `exportSyncBundle` is called with `scope: "agent_definition"`
- **Then**: the exported bundle contains `agentMdContent` (string matching `agent.md`) and `agentConfigContent` (string matching `agent-config.json`); no `promptVersions` field

### AC-012 — Node Sync Import Writes Correct Files
- **Given**: an import bundle with `agentMdContent` and `agentConfigContent` for agent ID `"test-agent"`
- **When**: `importSyncBundle` is called
- **Then**: `agents/test-agent/agent.md` exists with content matching `agentMdContent`; `agents/test-agent/agent-config.json` exists with content matching `agentConfigContent`

### AC-013 — Templates Excluded from Regular Agent Listing
- **Given**: `agents/_templates/code-reviewer/agent.md` and `agents/my-agent/agent.md` both exist
- **When**: `agentDefinitions` query is called
- **Then**: only `my-agent` is in the result; `_code-reviewer` is NOT included

### AC-014 — Agent Duplication Copies Both Files
- **Given**: `agents/original/agent.md` and `agents/original/agent-config.json`
- **When**: duplicate agent mutation is called with new name
- **Then**: `agents/{new-id}/agent.md` and `agents/{new-id}/agent-config.json` exist with identical content to originals

### AC-015 — Frontend Agent Form Submits Instructions
- **Given**: user fills agent name, description, and instructions in the create form
- **When**: form is submitted
- **Then**: `createAgentDefinition` mutation is called with `instructions` field populated correctly

### AC-016 — No Prompt Engineering UI Remains
- **Given**: the running frontend
- **When**: all navigation paths are inspected
- **Then**: no prompt engineering routes, components, or menu items are accessible

### AC-018 — `agentTeamTemplates` Excludes Regular Teams
- **Given**: `agent-teams/_templates/dev-team/team.md` and `agent-teams/my-team/team.md` both exist
- **When**: `agentTeamTemplates` query is called
- **Then**: only the `_templates/dev-team` entry is returned; `my-team` is NOT included

### AC-019 — Agent Team Template Listing Returns Team Metadata
- **Given**: `agent-teams/_templates/` contains one or more `team.md` files with valid frontmatter
- **When**: `agentTeamTemplates` query is called
- **Then**: each result entry has `name`, `description`, `category`, and `instructions` populated from `team.md`

### AC-017 — `agentDefinitionStore` Has No Prompt Fields
- **Given**: the compiled frontend codebase
- **When**: `agentDefinitionStore.ts` is inspected
- **Then**: no references to `activePromptVersion`, `promptName`, `promptCategory`, or prompt-related actions

### AC-020 — Add Definition Source Registers and Exposes Counts
- **Given**: a valid source root path containing `agents/` and `agent-teams/`
- **When**: `addDefinitionSource(path)` is executed
- **Then**: `definitionSources` includes that path with non-negative `agentCount` and `agentTeamCount`, and no files are copied into the default app-data directory

### AC-021 — Remove Definition Source Detaches Source
- **Given**: a previously added custom source
- **When**: `removeDefinitionSource(path)` is executed
- **Then**: the source no longer appears in `definitionSources`, and agent/team list queries no longer include items unique to that source

### AC-022 — Invalid Source Path Is Rejected
- **Given**: a non-existent path or a path that is not a directory
- **When**: `addDefinitionSource(path)` is executed
- **Then**: operation fails with a descriptive error

### AC-023 — Agent and Team Providers Read Additional Sources
- **Given**: a valid source path with one external agent and one external team
- **When**: `agentDefinitions` and `agentTeamDefinitions` queries are executed
- **Then**: both external entities appear without server restart

### AC-024 — Default Source Precedence on Duplicate IDs
- **Given**: an ID exists in both default app-data and a custom source
- **When**: `agentDefinition(id)` or `agentTeamDefinition(id)` is queried
- **Then**: the default app-data version is returned

### AC-025 — Settings UI Manages Definition Sources
- **Given**: user opens Settings > Definition Sources
- **When**: user adds/removes a source path
- **Then**: UI updates source list and shows success/error feedback

### AC-026 — Reload Reflects Source-Managed Definitions
- **Given**: definitions changed under an already registered source path
- **When**: user clicks Reload in Agents or Teams list
- **Then**: list reflects latest source content

### AC-027 — No GitHub Clone Surface in V1
- **Given**: user tries to provide an HTTP/HTTPS GitHub URL as source path
- **When**: v1 source add flow validates input
- **Then**: input is rejected because only filesystem paths are supported

### AC-028 — Duplicate Action Avoids System Prompt and Lands in Edit
- **Given**: user is on an agent detail page and clicks Duplicate
- **When**: duplicate mutation succeeds
- **Then**: no browser-native prompt/alert is shown, duplicated agent is created with collision-safe generated name, and navigation goes directly to `view=edit&id={duplicatedId}`

---

## Constraints / Dependencies

- MUST NOT introduce backward-compatibility shims or dual-read/dual-write paths
- MUST NOT retain any `prompt-v{N}.md` write paths even for migration
- The `autobyteus-ts` runtime SDK reads agent definitions via `PromptLoader` — this is the critical interface to update
- Skills versioning (git-based) is not being applied to agents in this ticket — out of scope
- Agent duplication (UC-018) is in scope as a new mutation
- git-repo import UI is out of scope
- Definition-source v1 is filesystem-path only (no GitHub clone/fetch in this phase)
- Migration of existing on-disk agent data is out of scope (clean install assumed)

---

## Assumptions

- A1: `SKILL.md`-style frontmatter parser can be reused or replicated for `agent.md` and `team.md`
- A2: Agent `role` field is kept as optional in frontmatter (for backwards conceptual compatibility)
- A3: `avatarUrl` moves from `agent.json` to `agent-config.json`
- A4: All arrays in `agent-config.json` default to `[]`; `avatarUrl` defaults to `null`
- A5: The `autobyteus-ts` SDK dependency on `PromptLoader` is the only place the system prompt is loaded at runtime

---

## Requirement Coverage Map

| Requirement ID | Description Summary | Mapped Use Cases |
|---|---|---|
| REQ-001 | `agent.md` frontmatter + body format | UC-001, UC-002, UC-003, UC-007 |
| REQ-002 | `agent-config.json` schema | UC-004 |
| REQ-003 | `team.md` format | UC-008, UC-009 |
| REQ-004 | `team-config.json` schema | UC-010 |
| REQ-005 | Template subfolder convention | UC-017 |
| REQ-006 | `FileAgentDefinitionProvider` rewrite | UC-001, UC-002, UC-003, UC-004, UC-005, UC-006 |
| REQ-007 | `AppConfig` path helpers | UC-001 through UC-016 |
| REQ-008 | `AgentDefinition` domain model update | UC-001 through UC-007 |
| REQ-009 | `AgentTeamDefinition` domain model update | UC-008 through UC-012 |
| REQ-010 | `PromptLoader` replacement | UC-007 |
| REQ-011 | Full removal of prompt engineering module | All (cleanup) |
| REQ-012 | Updated `AgentDefinition` GraphQL type | UC-001, UC-003, UC-005 |
| REQ-013 | Updated GraphQL input types | UC-001, UC-003 |
| REQ-014 | Updated `AgentTeamDefinition` GraphQL type | UC-008, UC-009, UC-011 |
| REQ-015 | Remove all prompt GraphQL API | All (cleanup) |
| REQ-016 | Updated `SyncAgentDefinition` bundle | UC-013, UC-014 |
| REQ-017 | Updated `SyncAgentTeamDefinition` bundle | UC-015, UC-016 |
| REQ-018 | Node sync import writes correct files | UC-014, UC-016 |
| REQ-019 | Remove prompt-engineering frontend | All (cleanup) |
| REQ-020 | Agent form instructions field | UC-001, UC-002 |
| REQ-021 | Agent detail shows instructions | UC-005 |
| REQ-022 | Team form instructions field | UC-008, UC-009 |
| REQ-023 | Frontend GraphQL documents updated | UC-001 through UC-012 |
| REQ-024 | `agentDefinitionStore` updated | UC-001, UC-002, UC-003, UC-004 |
| REQ-025 | Settings-managed definition source GraphQL API | UC-020, UC-021, UC-022 |
| REQ-026 | Source root structure + filesystem-only v1 scope | UC-020, UC-022 |
| REQ-027 | AppConfig source-path parsing | UC-020, UC-021 |
| REQ-028 | Multi-source read aggregation with precedence | UC-020, UC-021, UC-022 |
| REQ-029 | Cache refresh after add/remove source | UC-020, UC-021 |
| REQ-030 | Write semantics remain default-only | UC-020, UC-021, UC-022 |
| REQ-031 | Settings UI section for definition sources | UC-020, UC-021 |
| REQ-032 | Reload behavior stays compatible with source-managed items | UC-022 |
| REQ-033 | Duplicate action avoids system prompts and routes directly to edit | UC-018, UC-023 |

---

## Acceptance Criteria Coverage Map (Preliminary)

| AC ID | Description | Mapped Stage 7 Scenarios |
|---|---|---|
| AC-001 | `agent.md` parses correctly | S-001 (TBD at Stage 7) |
| AC-002 | Parse error on malformed file | S-002 |
| AC-003 | `agent-config.json` round-trips | S-003 |
| AC-004 | Create agent produces correct files | S-004 |
| AC-005 | No `prompt-v{N}.md` files created | S-005 |
| AC-006 | No `activePromptVersion` in new code | S-006 |
| AC-007 | Prompt GraphQL API removed | S-007 |
| AC-008 | `PromptLoader` reads `agent.md` body | S-008 |
| AC-009 | Team definition parses correctly | S-009 |
| AC-010 | Team config members round-trip | S-010 |
| AC-011 | Node sync export bundle format | S-011 |
| AC-012 | Node sync import writes correct files | S-012 |
| AC-013 | Templates excluded from listing | S-013 |
| AC-014 | Agent duplication copies both files | S-014 |
| AC-015 | Frontend form submits instructions | S-015 |
| AC-016 | No prompt engineering UI remains | S-016 |
| AC-017 | `agentDefinitionStore` has no prompt fields | S-017 |
| AC-020 | Add source registers and exposes counts | S-020 |
| AC-021 | Remove source detaches source definitions | S-021 |
| AC-022 | Invalid source path rejected | S-022 |
| AC-023 | Agent/team providers read additional sources | S-023 |
| AC-024 | Default source precedence for duplicate IDs | S-024 |
| AC-025 | Settings UI manages definition sources | S-025 |
| AC-026 | Reload reflects source-managed definitions | S-026 |
| AC-027 | No GitHub clone surface in v1 | S-027 |
| AC-028 | Duplicate avoids native prompt and routes directly to edit | S-028 |
