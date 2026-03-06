# Proposed Design Document — Agent-MD-Centric Definition

## Design Version

- Current Version: `v2`

## Revision History

| Version | Trigger | Summary Of Changes | Related Review Round |
| --- | --- | --- | --- |
| v1 | Initial draft | Full design from user requirements and codebase investigation | Round 1 |
| v2 | Round 1 blockers B-001, B-002, B-003 | (1) Corrected DR-003 atomicity claim; (2) Added UC-011 absent-config export sub-path; (3) Added UC-019 team template listing + C-033 `agentTeamTemplates` query + C-034 `writeRawFile` store-util; (4) Added DR-004 design risk | Round 2 |

## Artifact Basis

- Investigation Notes: `tickets/in-progress/agent-md-centric-definition/investigation-notes.md`
- Requirements: `tickets/in-progress/agent-md-centric-definition/requirements.md`
- Requirements Status: `Design-ready`

---

## Summary

Replace the current two-concept model (agents + separate prompt engineering) with a single, self-contained file pair per agent (`agent.md` + `agent-config.json`) and per team (`team.md` + `team-config.json`). The entire prompt-engineering module is removed. Agent instructions live directly in the agent's markdown file body. The `PromptLoader` is updated to read from `agent.md` instead of `prompt-v{N}.md` files. Node-sync bundle format is updated to carry raw file contents. The frontend removes all prompt-engineering UI and adds an instructions textarea to agent and team forms.

---

## Goals

1. Make each agent fully self-contained in two files: `agent.md` + `agent-config.json`
2. Make each team fully self-contained in two files: `team.md` + `team-config.json`
3. Remove the prompt-engineering module and all its data stores entirely
4. Enable agent/team folder packaging and sharing as a git repository
5. Support agent duplication as a first-class operation
6. Support `_templates/` convention for discoverable instruction templates

---

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- The following legacy paths MUST be deleted cleanly with no compatibility shims:
  - `prompt-v{N}.md` files (no new writes, no reads)
  - `prompts.json` store and all code that reads/writes it
  - `prompt-mappings.json` store and all code that reads/writes it
  - `agent.json` files (replaced by `agent.md` + `agent-config.json`)
  - `team.json` files (replaced by `team.md` + `team-config.json`)
  - `activePromptVersion` field everywhere
  - Entire `prompt-engineering/` backend module
  - All prompt GraphQL types/resolvers/mutations
  - All prompt-engineering frontend components, stores, GraphQL documents

---

## Requirements And Use Cases

| Requirement ID | Description | Acceptance Criteria ID(s) | Acceptance Criteria Summary | Use Case IDs |
| --- | --- | --- | --- | --- |
| REQ-001 | `agent.md` format | AC-001, AC-002 | Parses correctly, throws on malformed | UC-001, UC-002, UC-003, UC-007 |
| REQ-002 | `agent-config.json` schema | AC-003 | Round-trips correctly | UC-004 |
| REQ-003 | `team.md` format | AC-009 | Parses correctly | UC-008, UC-009 |
| REQ-004 | `team-config.json` schema | AC-010 | Members round-trip with refType | UC-010 |
| REQ-005 | Template subfolder convention | AC-013 | Templates excluded from regular listing | UC-017 |
| REQ-006 | `FileAgentDefinitionProvider` rewrite | AC-004, AC-005 | Create produces correct files, no `prompt-v{N}.md` | UC-001–UC-006 |
| REQ-007 | `AppConfig` path helpers | — | Supporting infrastructure | All |
| REQ-008 | `AgentDefinition` domain model | AC-006 | No `activePromptVersion` in new code | UC-001–UC-007 |
| REQ-009 | `AgentTeamDefinition` domain model | AC-009, AC-010 | Team model updated | UC-008–UC-012 |
| REQ-010 | `PromptLoader` replacement | AC-008 | Reads `agent.md` body | UC-007 |
| REQ-011 | Remove prompt-engineering module | AC-006, AC-007 | No prompt API, no `activePromptVersion` | Cleanup |
| REQ-012 | Updated `AgentDefinition` GraphQL type | AC-004 | `instructions` + `category` present | UC-001, UC-003, UC-005 |
| REQ-013 | Updated GraphQL input types | AC-015 | Frontend submits instructions | UC-001, UC-003 |
| REQ-014 | Updated `AgentTeamDefinition` GraphQL type | AC-009 | Team type has instructions | UC-008–UC-011 |
| REQ-015 | Remove all prompt GraphQL API | AC-007 | Prompt queries return error | Cleanup |
| REQ-016 | `SyncAgentDefinition` bundle | AC-011 | Bundle has `agentMdContent` + `agentConfigContent` | UC-013, UC-014 |
| REQ-017 | `SyncAgentTeamDefinition` bundle | — | Bundle has `teamMdContent` + `teamConfigContent` | UC-015, UC-016 |
| REQ-018 | Node sync import writes correct files | AC-012 | Import writes `.md` + `-config.json` | UC-014, UC-016 |
| REQ-019 | Remove prompt-engineering frontend | AC-016, AC-017 | No prompt UI, no prompt fields in store | Cleanup |
| REQ-020 | Agent form instructions field | AC-015 | Form submits instructions | UC-001, UC-002 |
| REQ-021 | Agent detail shows instructions | — | Detail view shows body | UC-005 |
| REQ-022 | Team form instructions field | — | Form submits team instructions | UC-008, UC-009 |
| REQ-023 | Frontend GraphQL documents updated | AC-015 | Queries/mutations include instructions | UC-001–UC-012 |
| REQ-024 | `agentDefinitionStore` updated | AC-017 | No prompt fields | UC-001–UC-004 |

---

## Codebase Understanding Snapshot (Pre-Design Mandatory)

| Area | Findings | Evidence (files/functions) | Open Unknowns |
| --- | --- | --- | --- |
| Agent persistence entrypoint | `FileAgentDefinitionProvider` reads/writes `agent.json` + `prompt-v{N}.md` | `src/agent-definition/providers/file-agent-definition-provider.ts` | None |
| Team persistence entrypoint | `FileAgentTeamDefinitionProvider` reads/writes `team.json` | `src/agent-team-definition/providers/file-agent-team-definition-provider.ts` | None |
| System prompt loading | `PromptLoader.getPromptTemplateForAgent()` reads `activePromptVersion` from `agent.json` then `prompt-v{N}.md` | `src/prompt-engineering/utils/prompt-loader.ts` | None |
| Skills format (model) | `SKILL.md` with YAML frontmatter (`name:`, `description:`) + body; same pattern to use | `src/skills/loader.ts` | None |
| Node sync I/O | Direct file writes in `NodeSyncService`, bypasses provider chain | `src/sync/services/node-sync-service.ts` | None |
| GraphQL agent type | `activePromptVersion` on type; no `instructions` or `category` | `src/api/graphql/types/agent-definition.ts` | None |
| Prompt module scope | Full stack: domain, providers (file, cache, registry), service, GraphQL resolver | `src/prompt-engineering/` | None |
| Frontend prompt components | 8 components, 2 stores, full GraphQL document set | `autobyteus-web/components/promptEngineering/` | None |

---

## Current State (As-Is)

```
agents/{agent-id}/
  agent.json           ← identity + config + activePromptVersion
  prompt-v1.md         ← system instructions (v1)
  prompt-v2.md         ← system instructions (v2, if any)

agent-teams/{team-id}/
  team.json            ← team identity + members[]

memory/persistence/prompt-engineering/
  prompts.json         ← all prompt records (family-versioned)

memory/persistence/agent-definition/
  prompt-mappings.json ← agentId → promptName/category links
```

Runtime system-prompt loading:
```
PromptLoader.getPromptTemplateForAgent(agentId)
  → reads agent.json (activePromptVersion = N)
  → reads agents/{agentId}/prompt-vN.md
  → returns content
```

---

## Target State (To-Be)

```
agents/
  _templates/
    {template-name}/
      agent.md         ← template instructions (excluded from regular listing)
      agent-config.json
  {agent-id}/
    agent.md           ← frontmatter (name, description, category, role) + instructions body
    agent-config.json  ← toolNames, skillNames, processorNames, avatarUrl

agent-teams/
  _templates/
    {template-name}/
      team.md
      team-config.json
  {team-id}/
    team.md            ← frontmatter (name, description, category) + orchestrator instructions body
    team-config.json   ← coordinatorMemberName, members[] (memberName, ref, refType)
```

Runtime system-prompt loading:
```
PromptLoader.getPromptTemplateForAgent(agentId)
  → reads agents/{agentId}/agent.md
  → parses frontmatter (name, description, category, role)
  → returns body (system instructions)
```

No `prompts.json`, no `prompt-mappings.json`, no `prompt-v{N}.md` files.

---

## Architecture Direction Decision (Mandatory)

- **Chosen direction**: Replace the two-file (JSON identity + versioned MD prompt) agent model with a single MD-file-centric model (frontmatter identity + MD body instructions). Companion JSON config for capabilities. Same pattern for teams.
- **Rationale**:
  - *Complexity*: Eliminates the three-way coupling between `agent.json`, `prompt-v{N}.md`, and `prompts.json`. Single source of truth per entity.
  - *Testability*: Each entity is a self-contained file pair. No cross-store dependencies to mock.
  - *Operability*: Agent folders are fully self-contained. Can be copied, shared, git-packaged without external dependencies.
  - *Evolution cost*: Template pattern and duplication are trivial with file-pair model. Future versioning (git-based, like skills) is straightforward.
- **Layering fitness**: `Yes` — same provider → service → GraphQL layering is kept; only the file I/O format changes within the provider layer.
- **Decoupling assessment**: `Yes` — prompt-engineering module is fully removed, eliminating the cross-module coupling that caused the copy-on-associate problem.
- **Outcome**: `Modify` (agent/team providers), `Remove` (prompt-engineering module), `Add` (md parser utility, template query)

---

## Change Inventory (Delta)

### Backend

| Change ID | Change Type | Current Path | Target Path | Rationale | Impacted Areas |
| --- | --- | --- | --- | --- | --- |
| C-001 | Modify | `src/agent-definition/domain/models.ts` | same | Add `instructions`, `category`; remove `activePromptVersion`, `systemPromptCategory`, `systemPromptName` | Domain model |
| C-002 | Modify | `src/agent-definition/providers/file-agent-definition-provider.ts` | same | Rewrite to read/write `agent.md` + `agent-config.json` | Persistence |
| C-003 | Remove | `src/agent-definition/providers/file-agent-prompt-mapping-provider.ts` | — | Prompt mappings eliminated | Persistence |
| C-004 | Remove | `src/agent-definition/providers/agent-prompt-mapping-persistence-provider.ts` | — | Prompt mappings eliminated | Persistence |
| C-005 | Modify | `src/agent-definition/services/agent-definition-service.ts` | same | Remove all prompt-mapping logic; add `duplicate` method | Service |
| C-006 | Modify | `src/agent-team-definition/domain/models.ts` | same | Add `instructions`, `category`; update `TeamMember` to `ref`/`refType` | Domain model |
| C-007 | Modify | `src/agent-team-definition/providers/file-agent-team-definition-provider.ts` | same | Rewrite to read/write `team.md` + `team-config.json` | Persistence |
| C-008 | Remove | `src/prompt-engineering/` (entire directory) | — | Module removed | Module removal |
| C-009 | Modify | `src/prompt-engineering/utils/prompt-loader.ts` | `src/agent-definition/utils/prompt-loader.ts` | Move into agent-definition module; rewrite to read `agent.md` body | Runtime loading |
| C-010 | Modify | `src/api/graphql/types/agent-definition.ts` | same | Add `instructions`, `category`; remove `activePromptVersion`; add `duplicateAgentDefinition` mutation | GraphQL API |
| C-011 | Remove | `src/api/graphql/types/prompt.ts` | — | Entire prompt resolver removed | GraphQL API |
| C-012 | Modify | `src/api/graphql/types/agent-team-definition.ts` | same | Add `instructions`, `category`; update member node type | GraphQL API |
| C-013 | Modify | `src/sync/services/node-sync-service.ts` | same | Update bundle format: `agentMdContent`+`agentConfigContent` for agents; `teamMdContent`+`teamConfigContent` for teams | Sync |
| C-014 | Modify | `src/config/app-config.ts` | same | Add `getAgentMdPath`, `getAgentConfigPath`, `getTeamMdPath`, `getTeamConfigPath` | Config |
| C-015 | Add | — | `src/agent-definition/utils/agent-md-parser.ts` | New parser for `agent.md` frontmatter + body (reuse/adapt SKILL.md parser logic) | Parser utility |
| C-016 | Add | — | `src/agent-team-definition/utils/team-md-parser.ts` | New parser for `team.md` frontmatter + body | Parser utility |

### Frontend

| Change ID | Change Type | Current Path | Target Path | Rationale |
| --- | --- | --- | --- | --- |
| C-017 | Remove | `components/promptEngineering/` (all 8 components) | — | Prompt engineering UI removed |
| C-018 | Remove | `stores/promptStore.ts` | — | Prompt store removed |
| C-019 | Remove | `stores/promptEngineeringViewStore.ts` | — | Prompt view store removed |
| C-020 | Remove | `graphql/mutations/prompt_mutations.ts` | — | Prompt mutations removed |
| C-021 | Remove | `graphql/queries/prompt_queries.ts` | — | Prompt queries removed |
| C-022 | Modify | `components/agentDefinition/AgentDefinitionForm.vue` | same | Add `instructions` textarea + `category` field |
| C-023 | Modify | `components/agentDefinition/AgentDetail.vue` (or equivalent) | same | Show `instructions` field |
| C-024 | Modify | `stores/agentDefinitionStore.ts` | same | Add `instructions`, `category`; remove all prompt fields |
| C-025 | Modify | `graphql/mutations/agentDefinitionMutations.ts` | same | Add `instructions`, `category`; remove `activePromptVersion` |
| C-026 | Modify | `graphql/queries/agentDefinitionQueries.ts` | same | Add `instructions`, `category`; remove `activePromptVersion` |
| C-027 | Modify | `components/agentTeamDefinition/AgentTeamDefinitionForm.vue` | same | Add `instructions` textarea + `category` field |
| C-028 | Modify | `stores/agentTeamDefinitionStore.ts` | same | Add `instructions`, `category` |
| C-029 | Modify | `graphql/mutations/agentTeamDefinitionMutations.ts` | same | Add `instructions`, `category` |
| C-030 | Modify | `graphql/queries/agentTeamDefinitionQueries.ts` | same | Add `instructions`, `category` |
| C-031 | Add | — | `components/agentDefinition/AgentDuplicateButton.vue` | New duplicate action |
| C-032 | Remove | Any route component that renders prompt-engineering pages | — | Routes removed |
| C-033 | Add | — | `agentTeamTemplates` query in `src/api/graphql/types/agent-team-definition.ts` | REQ-005 requires team template listing |
| C-034 | Add | — | `writeRawFile(path, content)` helper in `src/persistence/file/store-utils.ts` | Extends temp+rename pattern for non-JSON files (agent.md, team.md) |

---

## Target Architecture Shape And Boundaries (Mandatory)

| Layer/Boundary | Purpose | Owns | Must Not Own | Notes |
| --- | --- | --- | --- | --- |
| Domain models (`agent-definition/domain/`) | Entity definitions and value types | `AgentDefinition`, `AgentTeamDefinition`, `TeamMember` | Persistence I/O, GraphQL types | Clean domain types only |
| MD Parser utilities (`*/utils/*-md-parser.ts`) | Parse/serialize `.md` frontmatter + body | Frontmatter parsing, body extraction, error handling | Domain logic, file I/O | Stateless pure functions |
| File providers (`*/providers/file-*.ts`) | Disk I/O for agent/team files | Read/write `agent.md`, `agent-config.json`, `team.md`, `team-config.json` | Business logic, caching, GraphQL | Uses `AppConfig` path helpers |
| Cached providers (`*/providers/cached-*.ts`) | In-memory cache layer | Full entity cache, cache invalidation | File I/O, GraphQL | Delegates to file provider on miss |
| Services (`*/services/*-service.ts`) | Business logic + orchestration | CRUD orchestration, `duplicate` operation, processor filtering | File I/O, GraphQL types | Singleton, uses provider chain |
| PromptLoader (`agent-definition/utils/prompt-loader.ts`) | Runtime system-prompt resolution | Read `agent.md` body for given `agentId` | Caching, business logic | Used by autobyteus-ts runtime |
| GraphQL resolvers (`api/graphql/types/`) | API boundary | Input validation, domain → GraphQL type mapping, error serialization | Business logic, file I/O | Thin layer over service |
| NodeSyncService (`sync/services/`) | Bundle export/import I/O | Raw file content serialization + direct file writes for sync | Business logic, caching (refreshes cache after write) | Bypasses provider chain by design |
| AppConfig (`config/app-config.ts`) | Path resolution | All path helper methods | Entity logic | Extended with new path methods |
| Frontend stores (`stores/`) | Client-side state | Agent/team CRUD state, Apollo cache integration | API calls (via Apollo), routing | No prompt fields |
| Frontend components (`components/`) | UI rendering + user interaction | Form rendering, instructions textarea, detail views | Store logic, API calls | Import from stores |
| Frontend GraphQL documents (`graphql/`) | API contract | Query/mutation documents | Component logic | Include `instructions`, `category` |

---

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Replacement Clean-Cut Design |
| --- | --- | --- | --- |
| Keep `agent.json` alongside `agent.md` | Migration path for existing installs | `Rejected` | Clean install assumed; `FileAgentDefinitionProvider` reads only `agent.md` + `agent-config.json` |
| Keep `prompt-v{N}.md` read path | Avoid breaking existing agents on disk | `Rejected` | `PromptLoader` reads only `agent.md` body; old `.md` files ignored |
| Keep prompt GraphQL API but mark deprecated | Avoid breaking clients | `Rejected` | Prompt types removed entirely from schema; no deprecation period |
| Keep `activePromptVersion` in `agent-config.json` | Minimal change | `Rejected` | Field removed from all models and files; no remnant |
| Dual-write `team.json` + `team.md` | Safe migration | `Rejected` | `FileAgentTeamDefinitionProvider` writes only `team.md` + `team-config.json` |

---

## File And Module Breakdown

| File/Module | Change Type | Layer / Boundary | Concern / Responsibility | Public APIs | Key Dependencies |
| --- | --- | --- | --- | --- | --- |
| `src/agent-definition/domain/models.ts` | Modify | Domain | `AgentDefinition` class: name, description, category, role, instructions, toolNames, skillNames, processorNames | `AgentDefinition`, `AgentDefinitionUpdate` | None |
| `src/agent-definition/utils/agent-md-parser.ts` | Add | Parser Utility | Parse `agent.md` frontmatter (name, description, category, role) + extract body as instructions | `parseAgentMd(content: string): AgentMdFields`, `serializeAgentMd(fields, instructions): string` | None (pure) |
| `src/agent-definition/providers/file-agent-definition-provider.ts` | Modify | File Provider | CRUD against `agent.md` + `agent-config.json` on disk | `create`, `getById`, `getAll`, `update`, `delete` | `AppConfig`, `AgentMdParser`, `store-utils` |
| `src/agent-definition/providers/file-agent-prompt-mapping-provider.ts` | Remove | — | — | — | — |
| `src/agent-definition/providers/agent-prompt-mapping-persistence-provider.ts` | Remove | — | — | — | — |
| `src/agent-definition/services/agent-definition-service.ts` | Modify | Service | CRUD orchestration, processor filtering, `duplicate(sourceId, newName)` | `create`, `getById`, `getAll`, `update`, `delete`, `duplicate`, `refresh` | CachedProvider, AppConfig |
| `src/agent-definition/utils/prompt-loader.ts` | Modify (Move from `src/prompt-engineering/utils/`) | Runtime Utility | Read `agent.md` body for runtime system prompt | `getPromptTemplateForAgent(agentId): Promise<string>` | `AppConfig`, `AgentMdParser` |
| `src/agent-team-definition/domain/models.ts` | Modify | Domain | `AgentTeamDefinition`: add `instructions`, `category`; `TeamMember`: `memberName`, `ref`, `refType` | `AgentTeamDefinition`, `TeamMember` | None |
| `src/agent-team-definition/utils/team-md-parser.ts` | Add | Parser Utility | Parse `team.md` frontmatter + body | `parseTeamMd(content: string): TeamMdFields`, `serializeTeamMd(fields, instructions): string` | None (pure) |
| `src/agent-team-definition/providers/file-agent-team-definition-provider.ts` | Modify | File Provider | CRUD against `team.md` + `team-config.json` on disk | `create`, `getById`, `getAll`, `update`, `delete` | `AppConfig`, `TeamMdParser`, `store-utils` |
| `src/api/graphql/types/agent-definition.ts` | Modify | GraphQL Resolver | Add `instructions`, `category` to type + inputs; add `duplicateAgentDefinition` mutation; remove `activePromptVersion` | Queries: `agentDefinition`, `agentDefinitions`, `agentTemplates`; Mutations: `createAgentDefinition`, `updateAgentDefinition`, `deleteAgentDefinition`, `duplicateAgentDefinition` | `AgentDefinitionService` |
| `src/api/graphql/types/prompt.ts` | Remove | — | — | — | — |
| `src/api/graphql/types/agent-team-definition.ts` | Modify | GraphQL Resolver | Add `instructions`, `category` to type + inputs | Same CRUD mutations | `AgentTeamDefinitionService` |
| `src/sync/services/node-sync-service.ts` | Modify | Sync I/O | Export/import raw file contents for agents + teams | `exportBundle`, `importBundle` | `AppConfig` |
| `src/config/app-config.ts` | Modify | Config | Path resolution | `getAgentMdPath(id)`, `getAgentConfigPath(id)`, `getTeamMdPath(id)`, `getTeamConfigPath(id)` | None |
| `src/prompt-engineering/` | Remove | — | Entire module removed | — | — |
| `autobyteus-web/components/promptEngineering/` | Remove | — | — | — | — |
| `autobyteus-web/stores/promptStore.ts` | Remove | — | — | — | — |
| `autobyteus-web/stores/promptEngineeringViewStore.ts` | Remove | — | — | — | — |
| `autobyteus-web/graphql/mutations/prompt_mutations.ts` | Remove | — | — | — | — |
| `autobyteus-web/graphql/queries/prompt_queries.ts` | Remove | — | — | — | — |
| `autobyteus-web/components/agentDefinition/AgentDefinitionForm.vue` | Modify | UI Component | Agent creation/edit form with instructions textarea | Props: `agentId?` (edit mode) | `agentDefinitionStore` |
| `autobyteus-web/stores/agentDefinitionStore.ts` | Modify | Frontend Store | Agent CRUD state with instructions + category | All existing actions + instructions/category state | Apollo, GraphQL documents |
| `autobyteus-web/graphql/mutations/agentDefinitionMutations.ts` | Modify | GraphQL Document | Add instructions, category; add duplicateAgentDefinition | — | — |
| `autobyteus-web/graphql/queries/agentDefinitionQueries.ts` | Modify | GraphQL Document | Add instructions, category; remove activePromptVersion | — | — |
| `autobyteus-web/components/agentTeamDefinition/AgentTeamDefinitionForm.vue` | Modify | UI Component | Team creation/edit form with instructions textarea | — | `agentTeamDefinitionStore` |
| `autobyteus-web/stores/agentTeamDefinitionStore.ts` | Modify | Frontend Store | Team CRUD state with instructions + category | — | Apollo, GraphQL documents |

---

## Layer-Appropriate Separation Of Concerns Check

- **Parser utilities** (`agent-md-parser.ts`, `team-md-parser.ts`): pure stateless functions, no I/O or business logic. Dependency direction: parser ← provider. ✓
- **File providers**: own only disk I/O. Delegate all path resolution to `AppConfig`. Delegate parsing to parser utilities. ✓
- **Services**: own only business logic and orchestration. No direct file I/O. Delegate to providers. ✓
- **GraphQL resolvers**: thin API boundary. No business logic. Maps domain ↔ GraphQL types. ✓
- **NodeSyncService**: direct file I/O by design (bypasses provider chain). Only consumer of `AppConfig` path helpers outside the provider chain. Acceptable — sync is a special cross-cutting infra concern. ✓
- **Frontend stores**: own client-side state and Apollo mutations. No direct rendering logic. ✓
- **Frontend components**: own rendering. All state mutations via store actions. ✓
- **Decoupling**: `prompt-engineering` module is completely removed, breaking the cross-module coupling. No new cycles introduced. ✓

---

## Naming Decisions (Natural And Implementation-Friendly)

| Item Type | Current Name | Proposed Name | Reason |
| --- | --- | --- | --- |
| File | `agent.json` | `agent.md` | Identity + instructions are human-readable markdown; frontmatter for structured fields |
| File | `agent-config.json` | `agent-config.json` (new) | Capability/pipeline config is machine-readable JSON |
| File | `team.json` | `team.md` | Same rationale as agent |
| File | `team-config.json` | `team-config.json` (new) | Same rationale as agent-config |
| Module | `src/prompt-engineering/utils/prompt-loader.ts` | `src/agent-definition/utils/prompt-loader.ts` | PromptLoader is fundamentally an agent concern, not a prompt-engineering concern |
| Class | `AgentDefinition.activePromptVersion` | (removed) | No longer meaningful |
| Field | `AgentDefinition.systemPromptCategory/Name` | (removed) | Runtime-only dead fields |
| Field | `TeamMember.agentId` | `TeamMember.ref` + `TeamMember.refType` | More generic; supports future team-of-teams |
| Utility | (new) | `agent-md-parser.ts` | Clear: parses agent markdown files |
| Utility | (new) | `team-md-parser.ts` | Clear: parses team markdown files |

---

## Naming Drift Check (Mandatory)

| Item | Current Responsibility | Does Name Still Match? | Corrective Action | Mapped Change ID |
| --- | --- | --- | --- | --- |
| `prompt-loader.ts` in `prompt-engineering/utils/` | Loads agent system prompt from `prompt-v{N}.md` | No — it's an agent concern, not a prompt-engineering concern | Move to `agent-definition/utils/` | C-009 |
| `FileAgentPromptMappingProvider` | Maps agent to prompt family | N/A — removed | Remove | C-003 |
| `AgentDefinition.activePromptVersion` | Points to active prompt-v{N}.md | N/A — removed | Remove | C-001 |

---

## Existing-Structure Bias Check (Mandatory)

| Candidate Area | Current-File-Layout Bias Risk | Architecture-First Alternative | Decision |
| --- | --- | --- | --- |
| Keeping `agent.json` + `prompt-v{N}.md` | High — existing structure is the problem | Unified `agent.md` (frontmatter + body) | Change |
| Keeping `PromptLoader` in `prompt-engineering/` | Medium — file is in wrong module | Move to `agent-definition/utils/` | Change |
| Reusing `prompts.json` for instructions | High — separate store is the root cause | Remove entirely | Change |
| Keeping `team.json` structure | High — same split problem as agents | `team.md` + `team-config.json` | Change |

---

## Anti-Hack Check (Mandatory)

| Candidate Change | Shortcut/Hack Risk | Proper Structural Fix | Decision |
| --- | --- | --- | --- |
| Add `instructions` field to `agent.json` but keep `.json` format | Medium — avoids reformatting but keeps file split | Full `agent.md` rewrite | Proper fix chosen |
| Keep prompt API but mark deprecated | High — extends the broken model's lifetime | Clean removal | Proper fix chosen |
| Keep `activePromptVersion = 0` as sentinel | High — dead field creates confusion | Field removed entirely | Proper fix chosen |
| `PromptLoader` reads both `agent.md` and `prompt-v{N}.md` with fallback | High — dual-read path | Read only `agent.md` | Proper fix chosen |

---

## Dependency Flow And Cross-Reference Risk

| Module/File | Upstream Dependencies | Downstream Dependents | Cross-Reference Risk | Mitigation |
| --- | --- | --- | --- | --- |
| `agent-md-parser.ts` | None | `file-agent-definition-provider.ts`, `prompt-loader.ts` | Low | Pure function, no I/O |
| `file-agent-definition-provider.ts` | `AppConfig`, `agent-md-parser.ts`, `store-utils` | `cached-agent-definition-provider.ts` | Low | Clear one-way dependency |
| `agent-definition-service.ts` | `CachedProvider` | `GraphQL resolver`, `NodeSyncService` (refresh only) | Low | Service is terminal for business logic |
| `prompt-loader.ts` (moved) | `AppConfig`, `agent-md-parser.ts` | `autobyteus-ts` runtime | Medium | Runtime dependency; must be tested |
| `prompt-engineering/` (removed) | — | `agent-definition-service.ts` (mapping calls) | Removed | All references deleted |
| `node-sync-service.ts` | `AppConfig` | None (called by coordinator) | Low | Direct I/O isolated to sync |

---

## Allowed Dependency Direction (Mandatory)

```
GraphQL Resolver → Service → CachedProvider → FileProvider → AppConfig + Parser Utilities
                                                                         ↑
NodeSyncService → AppConfig + Parser Utilities (direct, by design)
PromptLoader → AppConfig + AgentMdParser (runtime, direct read)
```

- No cycles allowed
- No provider importing from service layer
- No parser utilities importing from providers or services
- Temporary violations: None

---

## Decommission / Cleanup Plan

| Item To Remove | Cleanup Actions | Verification |
| --- | --- | --- |
| `src/prompt-engineering/` | Delete entire directory; remove all imports from `agent-definition-service.ts`, GraphQL resolvers, app bootstrap | No remaining imports in `tsconfig` |
| `src/api/graphql/types/prompt.ts` | Delete file; remove from GraphQL schema registration | Server starts without prompt types |
| `src/agent-definition/providers/file-agent-prompt-mapping-provider.ts` | Delete file + update `definition-persistence-provider-registry.ts` | No remaining usages |
| `src/agent-definition/providers/agent-prompt-mapping-persistence-provider.ts` | Delete file | No remaining usages |
| `agent.json` (runtime) | Provider reads `agent.md` + `agent-config.json` only; never writes `agent.json` | No `agent.json` created on new agent |
| `prompt-v{N}.md` files (runtime) | Provider never writes; `PromptLoader` never reads | No `prompt-vN.md` created on new agent |
| `prompts.json` + `prompt-mappings.json` (runtime) | No write paths remain | Files become stale; not read by new code |
| `autobyteus-web/components/promptEngineering/` | Delete all 8 component files; remove routes | No import warnings |
| `autobyteus-web/stores/promptStore.ts` | Delete; remove all usages in components | No import warnings |
| `autobyteus-web/graphql/mutations/prompt_mutations.ts` + `prompt_queries.ts` | Delete both | No import warnings |

---

## Data Models

### `agent.md` (on-disk format)

```markdown
---
name: My Backend Engineer
description: Specializes in TypeScript backend development
category: software-engineering
role: Backend Engineer
---

You are a senior backend engineer specializing in TypeScript and Node.js.
Your task is to implement clean, testable backend code following SOLID principles.

When given a task:
1. Analyze the requirements carefully
2. Design the solution with appropriate layers
3. Implement with full test coverage
```

### `agent-config.json` (on-disk format)

```json
{
  "toolNames": ["bash", "file-editor"],
  "skillNames": ["web-search"],
  "inputProcessorNames": [],
  "llmResponseProcessorNames": [],
  "systemPromptProcessorNames": [],
  "toolExecutionResultProcessorNames": [],
  "toolInvocationPreprocessorNames": [],
  "lifecycleProcessorNames": [],
  "avatarUrl": null
}
```

### `team.md` (on-disk format)

```markdown
---
name: Full-Stack Development Team
description: Handles end-to-end development tasks
category: software-engineering
---

You are the coordinator for a full-stack development team.
Your role is to analyze tasks and delegate to the right specialist.

Available team members:
- Backend Engineer: TypeScript/Node.js backend tasks
- Frontend Engineer: Vue.js/Nuxt frontend tasks
- QA Engineer: Testing and quality assurance

When given a task:
1. Determine which specialist(s) are needed
2. Delegate with clear, scoped sub-tasks
3. Synthesize results into a coherent response
```

### `team-config.json` (on-disk format)

```json
{
  "coordinatorMemberName": "coordinator",
  "members": [
    { "memberName": "backend-engineer", "ref": "my-backend-engineer", "refType": "agent" },
    { "memberName": "frontend-engineer", "ref": "my-frontend-engineer", "refType": "agent" },
    { "memberName": "qa-engineer", "ref": "my-qa-engineer", "refType": "agent" }
  ],
  "avatarUrl": null
}
```

### `AgentDefinition` domain model (updated)

```typescript
class AgentDefinition {
  id?: string | null;
  name: string;
  description: string;
  category?: string;
  role?: string;
  instructions: string;          // body of agent.md
  avatarUrl?: string | null;
  toolNames: string[];
  skillNames: string[];
  inputProcessorNames: string[];
  llmResponseProcessorNames: string[];
  systemPromptProcessorNames: string[];
  toolExecutionResultProcessorNames: string[];
  toolInvocationPreprocessorNames: string[];
  lifecycleProcessorNames: string[];
  // REMOVED: activePromptVersion, systemPromptCategory, systemPromptName
}
```

### Updated `SyncAgentDefinition` bundle type

```typescript
interface SyncAgentDefinition {
  agentId: string;
  agentMdContent: string;       // raw text of agent.md
  agentConfigContent: string;   // raw text of agent-config.json
  // REMOVED: agent object, promptVersions record
}

interface SyncAgentTeamDefinition {
  teamId: string;
  teamMdContent: string;        // raw text of team.md
  teamConfigContent: string;    // raw text of team-config.json
  // REMOVED: team object
}
```

---

## Error Handling And Edge Cases

| Scenario | Handling |
| --- | --- |
| `agent.md` missing `name:` in frontmatter | Throw `AgentMdParseError` with path; log at ERROR level; do not return partial result |
| `agent.md` has unclosed `---` | Throw `AgentMdParseError`; log at ERROR level |
| `agent-config.json` missing or corrupt | Default to empty config (`{}` treated as all-defaults); log WARN |
| `agent.md` body is empty | Allow (some agents may have minimal instructions); no error |
| Agent folder exists but `agent.md` missing | Skip agent in listing, log WARN; do not crash listing |
| Duplicate agent: target name already exists | Service generates unique slug (append `-2`, `-3`, etc.) |
| Node sync imports agent: target folder already exists with `source_wins` policy | Overwrite both `agent.md` and `agent-config.json` |
| Template subfolder (`_xxx`) accessed via `agentDefinition(id)` query | Return null / not-found error (templates are invisible to the regular `agentDefinition` resolver) |
| `agent-config.json` absent on source during node sync export | Apply same default-config logic as regular read (DR-002): serialize `defaultAgentConfig()` as `agentConfigContent`; do not throw |
| Partial write failure during regular update (agent.md succeeds, agent-config.json fails) | Each file write is individually atomic via temp+rename. A crash between the two writes leaves a brief inconsistency. On server restart `refreshCache()` re-reads both files from disk, restoring consistency. No explicit rollback implemented — consistency window is accepted. |

---

## Use-Case Coverage Matrix (Design Gate)

| use_case_id | Requirement | Use Case | Primary Path | Fallback Path | Error Path | Runtime Call Stack Section |
| --- | --- | --- | --- | --- | --- | --- |
| UC-001 | REQ-001, REQ-006, REQ-012 | Create agent | Yes | N/A | Yes (parse error, duplicate name) | CS-001 |
| UC-002 | REQ-001, REQ-006 | Update agent instructions | Yes | N/A | Yes (agent not found) | CS-002 |
| UC-003 | REQ-001, REQ-006 | Update agent metadata | Yes | N/A | Yes | CS-002 |
| UC-004 | REQ-002, REQ-006 | Configure agent capabilities | Yes | N/A | Yes | CS-003 |
| UC-005 | REQ-005, REQ-006 | List agents | Yes | N/A | Yes (malformed agent.md) | CS-004 |
| UC-006 | REQ-006 | Delete agent | Yes | N/A | Yes (not found) | CS-005 |
| UC-007 | REQ-010 | Runtime loads system prompt | Yes | N/A | Yes (agent.md missing) | CS-006 |
| UC-008 | REQ-003, REQ-004 | Create team | Yes | N/A | Yes | CS-007 |
| UC-009 | REQ-003 | Update team instructions | Yes | N/A | Yes | CS-008 |
| UC-010 | REQ-004 | Update team membership | Yes | N/A | Yes | CS-008 |
| UC-011 | REQ-005 | List teams | Yes | N/A | Yes | CS-009 |
| UC-012 | REQ-004 | Delete team | Yes | N/A | Yes | CS-010 |
| UC-013 | REQ-016 | Node sync export agents | Yes | N/A | Yes | CS-011 |
| UC-014 | REQ-018 | Node sync import agents | Yes | N/A | Yes (conflict) | CS-012 |
| UC-015 | REQ-017 | Node sync export teams | Yes | N/A | Yes | CS-011 |
| UC-016 | REQ-018 | Node sync import teams | Yes | N/A | Yes | CS-012 |
| UC-017 | REQ-005 | List agent templates | Yes | N/A | N/A | CS-004 |
| UC-018 | REQ-006 | Duplicate agent | Yes | N/A | Yes (name collision) | CS-013 |

---

## Performance / Security Considerations

- `getAll()` scans the `agents/` directory on each cold-cache call. For large numbers of agents this is O(N) file reads. Acceptable — the cache layer makes this one-time per server restart.
- `agent.md` and `agent-config.json` contain user-provided content. No injection risk as content is read/written as plain strings and not executed.
- Template subfolders (`_xxx`) must be excluded by convention in the provider's directory scan, not just the GraphQL layer, to prevent data leakage.

---

## Migration / Rollout

- No automated migration is in scope. Clean install assumed.
- Existing `agent.json` + `prompt-v{N}.md` files will be ignored by the new provider (not read, not written, not deleted).
- Users with existing data should expect to recreate agents after upgrade. This is acceptable for the current development phase.

---

## Open Questions

| ID | Question | Decision |
| --- | --- | --- |
| OQ-7 | Keep `role` field in `agent.md`? | Yes — kept as optional field |
| OQ-8 | `team-config.json` use `ref`+`refType` or just `agentId`? | Use `ref`+`refType` for forward compatibility |
| OQ-9 | Explicit LLM model field in `agent-config.json`? | Not in this ticket — named processor lists are the current mechanism; LLM model config is a separate concern |
| OQ-10 | `_templates/` inside `agents/` or sibling? | Inside `agents/` and `agent-teams/` — keeps folder self-contained |

---

## Addendum (2026-03-06) — Settings-Based Definition Sources V1

### Scope Decision

- Add filesystem source-path registration for definition packages in Settings.
- Source root can contain `agents/` and/or `agent-teams/`.
- No GitHub clone/fetch workflow in v1.
- No copy-to-default import mode in v1.

### Architecture Delta

1. Configuration Layer
- Add `AUTOBYTEUS_DEFINITION_SOURCE_PATHS` parsing in `AppConfig`.
- Provide `getAdditionalDefinitionSourceRoots()` with path validation and warnings for invalid entries.

2. Source Management Service
- New service to expose:
  - list definition sources with counts,
  - add source path,
  - remove source path,
  - refresh agent/team caches after source updates.
- Persistence mechanism mirrors Skills source pattern through server settings updates.

3. GraphQL API Surface
- New settings-level GraphQL resolver:
  - `definitionSources`
  - `addDefinitionSource(path)`
  - `removeDefinitionSource(path)`
- Returned object includes: `path`, `agentCount`, `agentTeamCount`, `isDefault`.

4. Provider Read Path Aggregation
- `FileAgentDefinitionProvider` and `FileAgentTeamDefinitionProvider` read from:
  1) default app-data directory,
  2) additional source roots.
- Precedence: default first, then sources in configured order.
- Duplicate IDs resolved by first-hit precedence.
- Writes remain default-directory owned.

5. Frontend Settings UX
- Add `Definition Sources` section in Settings navigation.
- Add manager UI with:
  - list existing sources and counts,
  - add path input,
  - remove custom source,
  - success/error feedback.

### Runtime Implications

- Existing `Reload` in Agents/Teams views remains the refresh trigger for source-backed content.
- After source add/remove mutation, backend service-level cache refresh ensures next reads are current.

### Risks And Mitigations

- Duplicate IDs across sources/default:
  - deterministic precedence (default first) documented and tested.
- Missing `agents/` or `agent-teams/` in source:
  - tolerate missing side with zero count; require at least one side exists.
- Invalid path inputs:
  - reject at source registration boundary with descriptive errors.

### Addendum Open Questions

| ID | Question | Decision |
| --- | --- | --- |
| OQ-11 | Should v1 accept GitHub URLs directly? | No — defer to future phase. |
| OQ-12 | Should v1 auto-copy imported sources to default app-data? | No — source-path mode only in v1. |
| OQ-13 | Should write operations target external sources? | No — writes remain default-directory owned. |
