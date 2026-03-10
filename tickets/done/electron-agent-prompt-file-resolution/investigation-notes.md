# Investigation Notes

## Summary

The `Prompt file not found or unreadable` warning is emitted by `PromptLoader` after it tries to read only the primary app data path `agents/<agentId>/agent.md`. In the installed Electron environment, the affected Bible agent definitions are not stored under the primary server-data directory. They are loaded successfully from the external definition source root configured in `.env`, which explains the preceding cache hits. The warning is therefore a false negative caused by inconsistent read-root resolution between the definition provider and `PromptLoader`.

## User-Reported Log Evidence

- App log file: `/Users/normy/.autobyteus/logs/app.log`
- Repeated sequence observed on `2026-03-10`:
  - Cache hit for team definition `bible-learning-team`
  - Cache hit for agent definitions `bible-researcher`, `bible-teaching-preparer`, `bible-teaching-reviewer`
  - Warning/error line: `Prompt file not found or unreadable for agent_definition_id='<id>'`
  - Team run still created successfully (`team_bible-learning-team_4ae0ba32`, `team_bible-learning-team_77bd12a4`)

Representative log locations:
- `/Users/normy/.autobyteus/logs/app.log:392`
- `/Users/normy/.autobyteus/logs/app.log:400`
- `/Users/normy/.autobyteus/logs/app.log:408`
- `/Users/normy/.autobyteus/logs/app.log:1437`
- `/Users/normy/.autobyteus/logs/app.log:1445`
- `/Users/normy/.autobyteus/logs/app.log:1455`

## Exact Logging Site

Source file:
- `autobyteus-server-ts/src/agent-definition/utils/prompt-loader.ts`

Observed behavior:
- `PromptLoader.getPromptTemplateForAgent(agentId)` resolves `mdPath` with `appConfigProvider.config.getAgentMdPath(agentId)`.
- `getAgentMdPath(agentId)` always points to the primary app data directory: `path.join(this.getAgentsDir(), agentId, "agent.md")`.
- Any `fs.readFile` failure falls into a broad `catch` and emits:
  - `Prompt file not found or unreadable for agent_definition_id='<agentId>'`

## Config and Storage Findings

Installed app config:
- `/Users/normy/.autobyteus/server-data/.env`
- Relevant setting:
  - `AUTOBYTEUS_DEFINITION_SOURCE_PATHS=/Users/normy/autobyteus_org/autobyteus-agents`

Meaning:
- The server is configured to read agent/team definitions not only from the primary data dir, but also from `/Users/normy/autobyteus_org/autobyteus-agents`.

Primary-path existence check for affected agents:
- `/Users/normy/.autobyteus/server-data/agents/bible-researcher/agent.md` -> missing
- `/Users/normy/.autobyteus/server-data/agents/bible-teaching-preparer/agent.md` -> missing
- `/Users/normy/.autobyteus/server-data/agents/bible-teaching-reviewer/agent.md` -> missing

External-source existence check for affected agents:
- `/Users/normy/autobyteus_org/autobyteus-agents/agents/bible-researcher/agent.md` -> present
- `/Users/normy/autobyteus_org/autobyteus-agents/agents/bible-teaching-preparer/agent.md` -> present
- `/Users/normy/autobyteus_org/autobyteus-agents/agents/bible-teaching-reviewer/agent.md` -> present

Team definition evidence:
- `/Users/normy/autobyteus_org/autobyteus-agents/agent-teams/bible-learning-team/team-config.json`
- The team references the three affected agent IDs as `refType: "agent"`.

## Source-Code Trace

### Definition providers support external roots

Agent definitions:
- `autobyteus-server-ts/src/agent-definition/providers/file-agent-definition-provider.ts`
- `getReadAgentRoots()` returns:
  - primary root: `appConfigProvider.config.getAgentsDir()`
  - additional roots: `path.join(sourceRoot, "agents")` for each configured source root

Team definitions:
- `autobyteus-server-ts/src/agent-team-definition/providers/file-agent-team-definition-provider.ts`
- `getReadTeamRoots()` applies the same primary-plus-additional-root strategy for team definitions

Cache behavior:
- `autobyteus-server-ts/src/agent-definition/providers/cached-agent-definition-provider.ts`
- Cache hits are real: the cached provider is populated from the persistence provider, which already reads across external roots

### Prompt loading does not support external roots

Prompt loader:
- `autobyteus-server-ts/src/agent-definition/utils/prompt-loader.ts`
- Current behavior:
  - reads only `appConfigProvider.config.getAgentMdPath(agentId)`
  - does not search `AUTOBYTEUS_DEFINITION_SOURCE_PATHS`
  - logs warning on any read failure

Runtime callers:
- `autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts`
- `autobyteus-server-ts/src/agent-team-execution/services/agent-team-run-manager.ts`
- `autobyteus-server-ts/src/runtime-execution/single-agent-runtime-metadata.ts`

Impact:
- Imported/external agent definitions can be loaded and cached successfully, but prompt loading still fails because it assumes the agent lives in the primary data dir.
- Runtime continues because callers fall back to `agentDef.description` when prompt loading returns `null`, so the false warning does not block run creation.

## Root Cause

Read-root resolution is inconsistent:

- `FileAgentDefinitionProvider` reads agents from primary and external definition roots.
- `PromptLoader` reads only from the primary data-dir root.

For external/imported agent definitions, the cache and team-definition resolution succeed, but `PromptLoader` re-reads the wrong location and emits a misleading missing/unreadable warning.

## Follow-Up Design Review Finding

A second review found a more fundamental design issue beyond the path-resolution bug:

- `FileAgentDefinitionProvider` already parses `agent.md` and populates `AgentDefinition.instructions`.
- `CachedAgentDefinitionProvider` already caches that parsed `AgentDefinition`.
- Runtime entry points still re-read `agent.md` from disk through `PromptLoader` instead of using the loaded `AgentDefinition.instructions`.

Concrete runtime duplicates:
- `autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts`
- `autobyteus-server-ts/src/agent-team-execution/services/agent-team-run-manager.ts`
- `autobyteus-server-ts/src/runtime-execution/single-agent-runtime-metadata.ts`

Why this is architecturally weak:
- It duplicates source-root resolution logic outside the provider layer.
- It allows runtime to observe a different instruction source than the cached `AgentDefinition`.
- It mixes two data sources in one runtime build:
  - provider/cache for metadata and tools/processors
  - direct disk read for instructions
- If cache and disk diverge, runtime behavior becomes internally inconsistent instead of more correct.

Observed implication:
- `PromptLoader` is not a strong design boundary for runtime prompt resolution.
- The better runtime boundary is the loaded `AgentDefinition` object, using `AgentDefinition.instructions` as the in-memory form of `agent.md`.

Design direction selected for re-entry:
- Keep `agent.md` as the persisted source of truth.
- Remove runtime dependence on `PromptLoader`.
- Have runtime consumers use `AgentDefinition.instructions` directly, with description fallback only when instructions are blank.
- Limit file-reading concerns to provider/persistence flows rather than runtime prompt composition.

## Scope Triage

- Scope: `Small`
- Rationale:
  - The redesign remains localized to runtime instruction resolution.
  - The provider layer already exposes the data needed for the runtime path.
  - The change removes a duplicate runtime dependency instead of introducing a new subsystem.

## Adjacent Risks / Follow-Ups

- `autobyteus-server-ts/src/sync/services/node-sync-service.ts` also contains direct `getAgentMdPath()` reads. Those paths may have the same external-root blind spot for imported definitions, but that is separate from the current warning path and should be evaluated as follow-up scope unless the implementation stage proves it is part of the same bug.
- Current prompt-loader logging conflates missing-file, unreadable-file, and parse errors into one warning. That is pre-existing behavior and not required to fix the false-negative path-resolution bug.
