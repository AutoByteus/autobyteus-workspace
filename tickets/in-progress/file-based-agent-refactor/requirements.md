# Requirements — File-Based Agent Refactoring

**Status**: `Design-ready`

## Goal / Problem Statement

Currently agents, prompts, and agent-teams are stored in database tables (or JSON-array files mimicking tables). This requires complex indirection: separate `Prompt` table, `AgentPromptMapping` to link agents to prompts, 23 agent-tools for LLM-driven CRUD, and a full prompt-engineering UI.

**Target**: Replace with a **folder-based approach** where each agent is a self-contained folder containing its config (`agent.yaml`) and versioned prompt files (`prompt-vN.md`). Agent-teams are similarly stored as folders with a `team.yaml`. This eliminates database tables, removes agent-tools for CRUD management, and makes agents shareable/portable (copy folder = install agent).

## Target Folder Structure

```
<data-dir>/
├── agents/
│   ├── professor-agent/
│   │   ├── agent.yaml          # metadata + activePromptVersion
│   │   ├── prompt-v1.md        # version 1 of system prompt
│   │   └── prompt-v2.md        # version 2
│   └── student-agent/
│       ├── agent.yaml
│       └── prompt-v1.md
└── agent-teams/
    └── professor-student-team/
        └── team.yaml           # references agents by folder name
```

### agent.yaml format

```yaml
name: Professor Agent
role: Professor
description: Fixture professor agent.
activePromptVersion: 1
toolNames:
  - send_message_to
inputProcessorNames: []
llmResponseProcessorNames: []
systemPromptProcessorNames: []
toolExecutionResultProcessorNames: []
toolInvocationPreprocessorNames: []
lifecycleProcessorNames: []
skillNames: []
```

### team.yaml format

```yaml
name: Professor Student Team
description: Team for Professor/Student communication.
coordinatorMemberName: Professor
members:
  - memberName: Professor
    agentName: professor-agent
  - memberName: Student
    agentName: student-agent
```

## In-Scope Use Cases

| use_case_id | Description                                                                                    |
| ----------- | ---------------------------------------------------------------------------------------------- |
| UC-001      | Agent definitions loaded from `<data-dir>/agents/<name>/agent.yaml`                            |
| UC-002      | System prompt read from `<data-dir>/agents/<name>/prompt-vN.md` based on `activePromptVersion` |
| UC-003      | Agent-team definitions loaded from `<data-dir>/agent-teams/<name>/team.yaml`                   |
| UC-004      | Teams reference agents by folder name (not database ID)                                        |
| UC-005      | GraphQL read-only queries return agents/teams parsed from folders                              |
| UC-006      | All CRUD mutations for prompts, agents, and agent-teams removed from GraphQL                   |
| UC-007      | All agent-tools for prompt-engineering, agent-management, agent-team-management removed        |
| UC-008      | Prisma models `Prompt`, `AgentPromptMapping`, `AgentDefinition`, `AgentTeamDefinition` removed |
| UC-009      | Frontend prompt-engineering UI removed                                                         |
| UC-010      | Frontend agent/team create/edit UI removed (read-only display kept)                            |

## Acceptance Criteria

| acceptance_criteria_id | Criterion                                     | Expected Outcome                                                                                                                                                  |
| ---------------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-001                 | Agent definitions loaded from YAML files      | `AgentDefinitionService` reads from `<data-dir>/agents/*/agent.yaml`                                                                                              |
| AC-002                 | System prompt read from versioned MD files    | Prompt content loaded from `prompt-vN.md` where N = `activePromptVersion` in `agent.yaml`                                                                         |
| AC-003                 | Agent-team definitions loaded from YAML files | `AgentTeamDefinitionService` reads from `<data-dir>/agent-teams/*/team.yaml`                                                                                      |
| AC-004                 | Teams reference agents by folder name         | `team.yaml` uses `agentName` field, resolved against `agents/` directory                                                                                          |
| AC-005                 | Agent-tools for prompt-engineering removed    | `agent-tools/prompt-engineering/` (11 files) deleted; registration removed from `agent-tool-loader.ts`                                                            |
| AC-006                 | Agent-tools for agent-management removed      | `agent-tools/agent-management/` (6 files) deleted; registration removed                                                                                           |
| AC-007                 | Agent-tools for agent-team-management removed | `agent-tools/agent-team-management/` (6 files) deleted; registration removed                                                                                      |
| AC-008                 | Prisma `Prompt` model removed                 | No `Prompt` table in schema.prisma                                                                                                                                |
| AC-009                 | Prisma `AgentPromptMapping` model removed     | No `AgentPromptMapping` table in schema.prisma                                                                                                                    |
| AC-010                 | Prisma `AgentDefinition` model removed        | No `AgentDefinition` table in schema.prisma                                                                                                                       |
| AC-011                 | Prisma `AgentTeamDefinition` model removed    | No `AgentTeamDefinition` table in schema.prisma                                                                                                                   |
| AC-012                 | GraphQL prompt CRUD mutations removed         | No createPrompt, updatePrompt, deletePrompt, addNewPromptRevision, markActivePrompt mutations                                                                     |
| AC-013                 | GraphQL agent/team CRUD mutations removed     | No createAgentDefinition, updateAgentDefinition, deleteAgentDefinition, createAgentTeamDefinition, updateAgentTeamDefinition, deleteAgentTeamDefinition mutations |
| AC-014                 | GraphQL read-only queries still work          | `agentDefinitions`, `agentDefinition`, `agentTeamDefinitions` queries return data from folder-based storage                                                       |
| AC-015                 | Frontend prompt-engineering page removed      | `pages/prompt-engineering.vue`, `stores/promptStore.ts`, `stores/promptEngineeringViewStore.ts`, prompt queries/mutations removed                                 |
| AC-016                 | Frontend agent/team create/edit UI removed    | `AgentCreate.vue`, `AgentEdit.vue`, `AgentTeamCreate.vue`, `AgentTeamEdit.vue` removed; list/detail views kept (read-only)                                        |
| AC-017                 | PromptLoader updated to read from folder      | System prompt at runtime loaded from `prompt-vN.md` file                                                                                                          |
| AC-018                 | Existing tests updated or removed             | Tests pass with no reference to removed models/APIs                                                                                                               |

## Constraints / Dependencies

- The `autobyteus-ts` library defines agent/prompt interfaces; may need coordination
- Existing seed script (`seed-personal-test-fixtures.py`) must be updated
- `<data-dir>` is the app's configured memory directory (`appConfigProvider.config.getMemoryDir()`)

## Assumptions

- Agent folders use kebab-case naming convention (folder name = agent identifier)
- `activePromptVersion` in `agent.yaml` determines which `prompt-vN.md` file to use
- All processor name arrays default to `[]` if omitted from YAML
- Sync infrastructure (`syncId`/`syncRevision`) is removed for agents/prompts/teams

## Triage Result

**Scope**: `Large` — Touches Prisma schema, services, providers, GraphQL API, agent-tools, frontend pages/stores/queries, tests, and runtime execution across server-ts and web sub-projects.
