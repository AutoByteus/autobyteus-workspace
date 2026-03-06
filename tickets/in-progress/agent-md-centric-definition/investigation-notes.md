# Investigation Notes — Agent-MD-Centric Definition

- **Status**: Complete (updated for 2026-03-06 definition-source addendum)
- **Stage**: 1
- **Date**: 2026-03-06
- **Triage Result**: `Large` — existing md-centric migration remains large; new addendum scope is `Medium` (settings + backend source registration + provider scan paths + API/UI tests)

---

## Sources Consulted

| Path | Purpose |
|---|---|
| `autobyteus-server-ts/src/agent-definition/` | Full agent definition domain, provider, service chain |
| `autobyteus-server-ts/src/agent-team-definition/` | Full team definition domain, provider, service chain |
| `autobyteus-server-ts/src/prompt-engineering/` | Current prompt system (to be removed) |
| `autobyteus-server-ts/src/skills/` | Skills/versioning — model for new design |
| `autobyteus-server-ts/src/config/app-config.ts` | Runtime path resolution |
| `autobyteus-server-ts/src/sync/services/` | Node sync bundle format and I/O |
| `autobyteus-server-ts/src/api/graphql/types/` | All GraphQL resolvers, types, mutations |
| `autobyteus-web/components/` | All frontend component inventory |
| `autobyteus-web/stores/` | All Pinia stores |
| `autobyteus-web/graphql/` | All frontend GraphQL documents |

---

## Key Findings

### 1. Current Agent Definition On-Disk Format

Each agent lives at `{APP_DATA_DIR}/agents/{agent-id}/` with:

```
agents/
  my-agent/
    agent.json          ← identity + config (machine-readable)
    prompt-v1.md        ← system instructions for version 1
    prompt-v2.md        ← system instructions for version 2
    ...
```

**`agent.json` schema:**
```json
{
  "name": "string",
  "role": "string",
  "description": "string",
  "avatarUrl": "string | null",
  "activePromptVersion": 1,
  "toolNames": ["string"],
  "inputProcessorNames": ["string"],
  "llmResponseProcessorNames": ["string"],
  "systemPromptProcessorNames": ["string"],
  "toolExecutionResultProcessorNames": ["string"],
  "toolInvocationPreprocessorNames": ["string"],
  "lifecycleProcessorNames": ["string"],
  "skillNames": ["string"]
}
```

**Problems:**
- Identity/config (`agent.json`) and instructions (`prompt-v{N}.md`) are split
- `activePromptVersion` creates fragile integer pointer between two representations
- Prompt versioning via numbered files creates clutter
- There is NO explicit per-agent LLM model field — only named processor lists
- System prompt content is NOT included in `agent.json`; it lives only in `prompt-v{N}.md`

### 2. Separate Prompt Engineering System

All prompts stored in a single JSON array:
```
{APP_DATA_DIR}/memory/persistence/prompt-engineering/prompts.json
```

**Record schema:**
```json
{
  "id": "1",
  "name": "my-prompt",
  "category": "my-category",
  "promptContent": "...",
  "version": 1,
  "isActive": true,
  "createdAt": "...",
  "updatedAt": "..."
}
```

**Additional mapping file:**
```
{APP_DATA_DIR}/memory/persistence/agent-definition/prompt-mappings.json
```
Links `agentDefinitionId → (promptName, promptCategory)`.

**Provider chain:**
```
PromptService → CachedPromptProvider → PromptPersistenceProvider → PromptPersistenceProviderRegistry → FilePromptProvider → prompts.json
```

**Problems:**
- `markActivePrompt` propagates changes by writing to agent's `prompt-v{N}.md` — tight coupling
- Two persistence stores must stay in sync (`prompts.json` + per-agent `.md` files)
- Concepts (prompt family, version, category, isActive) overlap with agent concepts
- `systemPromptCategory` and `systemPromptName` on `AgentDefinition` domain model are runtime-only (not persisted in `agent.json`) — dead fields

### 3. PromptLoader (Critical Path for Runtime)

`PromptLoader.getPromptTemplateForAgent(agentId)`:
1. Reads `agent.json` to get `activePromptVersion`
2. Reads `{APP_DATA_DIR}/agents/{agentId}/prompt-v{activePromptVersion}.md`
3. Returns content as the system prompt

**This is the only runtime consumer of `prompt-v{N}.md` files. Target: read body of `agent.md` directly.**

### 4. Skills Versioning — The Model to Follow

**Skill on-disk format:**
```
skills/
  my-skill/
    SKILL.md          ← frontmatter (name, description) + body content
    .git/             ← optional git-based versioning
```

**`SKILL.md` frontmatter format:**
```markdown
---
name: MySkillName
description: A description of what this skill does
---

Skill content body here...
```

**Versioning:**
- Git-based: `git tag -a {version} -m {message}` per version
- Activate: `git reset --hard {commitSha}`
- Enable/disable: `disabled_skills.json` array of skill names

**This is the exact pattern to use for `agent.md` and `team.md`.**

### 5. Agent Team Definition — Current On-Disk Format

```
agent-teams/
  my-team/
    team.json
```

**`team.json` schema:**
```json
{
  "name": "string",
  "description": "string",
  "coordinatorMemberName": "string",
  "role": "string | null",
  "avatarUrl": "string | null",
  "members": [
    { "memberName": "string", "agentId": "string" }
  ]
}
```

**Problems:**
- No team-level instructions/system prompt for the orchestrator
- `coordinatorMemberName` identifies the orchestrator by member name (indirection)
- `members[].agentId` couples team to agent IDs (becomes `members[].ref` in new model)

### 6. Node Sync — Entities Synced

`SyncAgentDefinition` bundle payload:
```typescript
{
  agentId: string;
  agent: { name, role, description, avatarUrl, activePromptVersion, toolNames, ... };
  promptVersions: Record<string, string>;  // { "1": "md content" }
}
```

`SyncAgentTeamDefinition` bundle payload:
```typescript
{
  teamId: string;
  team: { name, description, coordinatorMemberName, ... };
}
```

**Must be updated to:**
- Agent bundle: `agentId` + `agentMdContent` + `agentConfigContent`
- Team bundle: `teamId` + `teamMdContent` + `teamConfigContent`

### 7. GraphQL API Surface (Current)

**AgentDefinition fields on the type:**
`id, name, role, description, avatarUrl, activePromptVersion, toolNames, inputProcessorNames, llmResponseProcessorNames, systemPromptProcessorNames, toolExecutionResultProcessorNames, toolInvocationPreprocessorNames, lifecycleProcessorNames, skillNames`

**To remove:** `activePromptVersion`
**To add:** `instructions` (string — body of `agent.md`)

**Prompt types/queries/mutations — all to be removed:**
`Prompt, PromptDetails, PromptCategory, createPrompt, updatePrompt, addNewPromptRevision, markActivePrompt, deletePrompt, prompts, promptDetails, availablePromptCategories, promptDetailsByNameAndCategory`

**AgentTeamDefinition type:**
`id, name, description, coordinatorMemberName, role, avatarUrl, nodes[]`
**To add:** `instructions` (string — body of `team.md`)

### 8. Frontend Components — What to Remove vs Update

**Remove entirely:**
- `CreatePromptView.vue`, `PromptCard.vue`, `PromptDetails.vue`, `PromptCompare.vue`, `DraftsList.vue`, `PromptMarketplace.vue`, `CanonicalModelSelector.vue`, `CreatableCategorySelect.vue`
- `promptStore.ts`, `promptEngineeringViewStore.ts`
- All prompt GraphQL documents (`prompt_mutations.ts`, `prompt_queries.ts`)

**Update (add instructions field):**
- `AgentDefinitionForm.vue` — add instructions textarea
- `AgentDetail.vue` — show instructions
- `AgentTeamDefinitionForm.vue` — add instructions textarea
- `AgentTeamDetail.vue` (or equivalent) — show orchestrator instructions
- `agentDefinitionStore.ts` — add instructions field, remove prompt-related fields
- `agentTeamDefinitionStore.ts` — add instructions field
- GraphQL `agentDefinitionQueries.ts` + `agentDefinitionMutations.ts` — add instructions

### 9. Templates Folder

Skills use a pattern where skill directories are scanned. The same can apply to `_templates/` inside `agents/` and `agent-teams/` — they are excluded from the normal listing but available as template sources for duplication.

**Template resolution rule:** any agent/team subfolder whose name starts with `_` is treated as a template, not a regular agent/team.

### 10. AppConfig Path Methods (New paths needed)

Current `AppConfig` exposes:
- `getAgentsDir()` → `{APP_DATA_DIR}/agents/`
- `getAgentTeamsDir()` → `{APP_DATA_DIR}/agent-teams/`
- `getMemoryDir()` → `{APP_DATA_DIR}/memory/`

New paths needed (added to `AppConfig`):
- `getAgentMdPath(agentId)` → `{agents}/{agentId}/agent.md`
- `getAgentConfigPath(agentId)` → `{agents}/{agentId}/agent-config.json`
- `getTeamMdPath(teamId)` → `{agentTeams}/{teamId}/team.md`
- `getTeamConfigPath(teamId)` → `{agentTeams}/{teamId}/team-config.json`

---

## Constraints and Risks

| Risk | Impact | Mitigation |
|---|---|---|
| `PromptLoader` is used in agent runtime — must be updated atomically | High: agents break if loader reads wrong file | Update loader first, keep tests |
| NodeSyncService does direct file I/O (bypasses provider chain) | High: sync bundle format changes | Update sync service in same PR |
| `markActivePrompt` propagation logic tightly coupled to agent folders | Medium: must be fully deleted, not patched | Delete cleanly with no backward compat |
| Frontend has many prompt engineering components | Medium: large delete surface area | Delete all, no compatibility shims |
| `agent.md` parser must handle malformed frontmatter gracefully | Medium: risk of silent data corruption | Strict parser with error logging |
| No per-agent LLM model field currently exists | Low: no migration needed, just add to `agent-config.json` | Add to new config schema |
| E2E tests reference prompt creation flows | Medium: tests must be rewritten | Full test rewrite for new flows |

---

## Open Questions Resolved by Investigation

| Question | Answer |
|---|---|
| OQ-1: Remove prompt engineering? | **Yes, fully.** No use case survives that requires a separate prompt store. |
| OQ-2: agent-teams folder structure | Uses same two-file pattern: `team.md` + `team-config.json` |
| OQ-3: How does skits versioning work? | Git-based per-folder with tags + `git reset --hard`. Same approach can apply to agents if needed. |
| OQ-4: Migration of existing agents? | No migration; clean cut. Old `agent.json` + `prompt-v{N}.md` files are replaced entirely. |
| OQ-5: Git-repo import UI in scope? | Out of scope for this ticket; node-sync handles inter-node sharing for now |
| OQ-6: Agent categories — fixed or free-form? | Free-form string (same as skill `description` — no enum registry) |

---

## Open Questions Remaining

| ID | Question | Impact |
|---|---|---|
| OQ-7 | Should `role` field be kept in `agent.md` frontmatter or folded into `description`? | Minor — schema decision |
| OQ-8 | Should `team-config.json` members use `agentId` or a more generic `ref` + `type` pair? | Medium — affects future team-of-teams support |
| OQ-9 | Should `agent-config.json` include explicit LLM model field now, or keep named processor lists only? | Medium — UX and runtime impact |
| OQ-10 | Should `_templates/` live inside `agents/` and `agent-teams/` or be a sibling? | Low — convention decision |

---

## 2026-03-06 Addendum — Settings-Based Definition Sources (V1)

### Scope Trigger

User requested a new import UX aligned with skills-source behavior:
- Configure source folders in Settings,
- Source folder contains `agents/` and `agent-teams/`,
- No GitHub clone in v1,
- No copy/import mode in v1,
- `Reload` remains the refresh action.

### Investigation Findings

1. Settings placement is appropriate for global scope
- Current settings nav has no section for agent/team source management.
- Existing list pages already have `Reload` for agents and teams:
  - `autobyteus-web/components/agents/AgentList.vue`
  - `autobyteus-web/components/agentTeams/AgentTeamList.vue`

2. Skills already implement source-path registration pattern
- Backend supports `skillSources`, `addSkillSource(path)`, `removeSkillSource(path)` and persists via server settings key `AUTOBYTEUS_SKILLS_PATHS`.
- Frontend has path-entry UX and store pattern:
  - `autobyteus-web/components/skills/SkillSourcesModal.vue`
  - `autobyteus-web/stores/skillSourcesStore.ts`
- This is the direct pattern to mirror for definitions.

3. Current agent/team providers only read default app-data folders
- `FileAgentDefinitionProvider` scans only `getAgentsDir()`.
- `FileAgentTeamDefinitionProvider` scans only `getAgentTeamsDir()`.
- No existing support for additional source roots.

4. Existing sync behavior is already API/E2E covered
- `node-sync-graphql.e2e` verifies import/export payload behavior for agents and teams.
- `node-sync-control-graphql.e2e` verifies orchestration success/partial-failure/preflight checks.
- This is separate from filesystem source registration, but confirms sync surfaces are stable.

### Proposed Technical Direction (V1)

- New config key: `AUTOBYTEUS_DEFINITION_SOURCE_PATHS` (comma-separated absolute roots).
- New AppConfig helper: parse/validate additional definition source roots.
- New GraphQL resolver for settings:
  - `definitionSources`
  - `addDefinitionSource(path)`
  - `removeDefinitionSource(path)`
- Provider read paths:
  - Aggregate default + external sources for `getAll`, `getById`, `getTemplates`.
  - Keep default directory as write target for create/update/delete.
- New settings UI section: `Definition Sources` with add/remove path and counts.

### Risks / Edge Cases

- Duplicate IDs across sources and default directory:
  - deterministic precedence rule needed (default first).
- Source paths missing expected subfolders:
  - should not throw; return zero count with safe warnings.
- Reload consistency:
  - source add/remove should trigger cache refresh in agent/team services.

### Investigation Exit Decision

- Stage 1 for this addendum scope is complete.
- Proceed to Stage 2 requirements refinement for definition sources v1.
