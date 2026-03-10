# Future-State Runtime Call Stack

## Scope

- Scope classification: `Small`
- In-scope use cases: `UC-001`, `UC-002`, `UC-003`
- Focus: runtime should build from one fresh definition snapshot per run instead of mixing cached metadata with separate instruction rereads.

## Design Intent

Move runtime instruction resolution fully behind the definition service/provider boundary:

- persisted source of truth remains `agent.md` / `team.md` + config files
- provider layer resolves source roots and parses files
- service layer exposes explicit fresh-read methods for runtime
- runtime consumers use returned definition objects directly
- `PromptLoader` is not part of runtime bootstrap

## Use Case `UC-001` Fresh Single-Agent Run After Manual File Edit

1. Agent definition may already be cached from earlier reads.
2. User edits persisted definition files on disk (`agent.md`, `agent-config.json`).
3. Runtime creates a new agent run.
4. `AgentRunManager` calls `AgentDefinitionService.getFreshAgentDefinitionById(agentDefinitionId)`.
5. The service delegates to persistence/provider path resolution and returns a freshly parsed `AgentDefinition`.
6. `AgentRunManager` builds the runtime config from that one object:
   - `instructions` -> system prompt (if non-blank)
   - `description` -> fallback prompt when instructions are blank
   - `toolNames`, processors, skills, role, description -> same fresh snapshot
7. New run reflects edited files without a global cache refresh.

## Use Case `UC-002` Fresh Agent-Team Run After Manual File Edit

1. Team and/or member definitions may already be cached from earlier reads.
2. User edits persisted team/member definition files on disk.
3. Runtime creates a new team run.
4. `AgentTeamRunManager` calls:
   - `AgentTeamDefinitionService.getFreshDefinitionById(teamDefinitionId)` for team expansion
   - `AgentDefinitionService.getFreshAgentDefinitionById(agentDefinitionId)` for member configs
5. Team structure and member configs are built from those fresh definition snapshots.
6. Team run reflects edited team/member files on the next run without mixing stale cached metadata and fresh instruction reads.

## Use Case `UC-003` Blank-Instructions Fallback

1. Runtime requests a fresh agent definition for a new run.
2. Persistence/provider successfully returns the definition, but `definition.instructions` is blank after normalization.
3. Runtime falls back to `definition.description`.
4. No separate file reread path is attempted.

## Runtime Model

```text
createAgentRun(agentDefinitionId)
  -> AgentDefinitionService.getFreshAgentDefinitionById(agentDefinitionId)
     -> AgentDefinitionPersistenceProvider.getById(agentDefinitionId)
        -> FileAgentDefinitionProvider.readAgentFromRoot(...)
           -> resolve source root
           -> read agent.md + agent-config.json
           -> parse AgentDefinition { instructions, description, tools, processors, skills, ... }
  -> build AgentConfig from fresh AgentDefinition
  -> systemPrompt = normalized(definition.instructions) ?? normalized(definition.description)
  -> create runtime agent
```

```text
createTeamRun(teamDefinitionId)
  -> AgentTeamDefinitionService.getFreshDefinitionById(teamDefinitionId)
  -> expand team members from fresh team definition
  -> for each agent member:
       AgentDefinitionService.getFreshAgentDefinitionById(agentDefinitionId)
       build AgentConfig from fresh AgentDefinition
  -> create runtime team
```

## Behavioral Guarantees

- Runtime uses one coherent definition snapshot per new run.
- Next-run file edits are observed without global cache refresh.
- Source-root resolution remains centralized in the provider layer.
- Runtime no longer depends on `PromptLoader`.
- Blank instructions still fall back to description.

## Files And Modules Touched By This Runtime Path

- `autobyteus-server-ts/src/agent-definition/services/agent-definition-service.ts`
- `autobyteus-server-ts/src/agent-team-definition/services/agent-team-definition-service.ts`
- `autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts`
- `autobyteus-server-ts/src/agent-team-execution/services/agent-team-run-manager.ts`
- `autobyteus-server-ts/src/runtime-execution/single-agent-runtime-metadata.ts`
- `autobyteus-server-ts/src/agent-team-execution/services/member-runtime-instruction-source-resolver.ts`
- `autobyteus-server-ts/src/agent-team-execution/services/team-member-runtime-session-lifecycle-service.ts`
- targeted runtime integration/unit tests

## Acceptance Coverage Mapping

| Use Case | Requirements | Acceptance Criteria | Planned Verification |
| --- | --- | --- | --- |
| UC-001 | REQ-001, REQ-003, REQ-004 | AC-001, AC-003 | single-agent runtime integration test |
| UC-002 | REQ-002, REQ-003, REQ-004 | AC-002, AC-003 | team runtime targeted tests |
| UC-003 | REQ-005 | AC-004 | runtime fallback test |
