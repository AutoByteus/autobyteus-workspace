# Requirements — JSON File Persistence Sync Parity

**Status**: `Design-ready`

## Goal / Problem Statement

Use JSON + Markdown file persistence aligned with AI-agent editing behavior, while preserving existing synchronization capability.

The previous direction to drop parts of sync behavior is invalid for this ticket. Existing sync behavior on `personal` is baseline behavior and must be preserved functionally.
Prompt/agent/team definition management for AI agents is file-first in this ticket, so dedicated agent-facing management tool groups are no longer required in the runtime tool catalog.

## Target Storage Layout

```
<data-dir>/
├── agents/
│   └── <agent-id>/
│       ├── agent.json
│       ├── prompt-v1.md
│       └── prompt-vN.md
├── agent-teams/
│   └── <team-id>/
│       └── team.json
├── memory/
├── media/
└── mcps.json
```

Notes:
- MCP file is global at `<data-dir>/mcps.json` (no `persistence/` subfolder).
- Prompt files remain Markdown by design.

## Canonical JSON File Examples

### `agents/<agent-id>/agent.json`

```json
{
  "name": "Professor Agent",
  "role": "Professor",
  "description": "Fixture professor agent.",
  "avatarUrl": null,
  "activePromptVersion": 2,
  "toolNames": ["send_message_to"],
  "inputProcessorNames": [],
  "llmResponseProcessorNames": [],
  "systemPromptProcessorNames": [],
  "toolExecutionResultProcessorNames": [],
  "toolInvocationPreprocessorNames": [],
  "lifecycleProcessorNames": [],
  "skillNames": []
}
```

Field contract:
- Required: `name`, `role`, `description`, `activePromptVersion`
- Optional nullable: `avatarUrl`
- Optional arrays (default `[]`): `toolNames`, `inputProcessorNames`, `llmResponseProcessorNames`, `systemPromptProcessorNames`, `toolExecutionResultProcessorNames`, `toolInvocationPreprocessorNames`, `lifecycleProcessorNames`, `skillNames`

### `agent-teams/<team-id>/team.json`

```json
{
  "name": "Professor Student Team",
  "description": "Team for Professor/Student communication.",
  "coordinatorMemberName": "Professor",
  "role": null,
  "avatarUrl": null,
  "members": [
    {
      "memberName": "Professor",
      "agentId": "professor-agent"
    },
    {
      "memberName": "Student",
      "agentId": "student-agent"
    }
  ]
}
```

Field contract:
- Required: `name`, `description`, `coordinatorMemberName`, `members[]`
- Optional nullable: `role`, `avatarUrl`
- `members[]` required fields: `memberName`, `agentId`
- `members[].agentId` must reference an existing agent folder ID

### `<data-dir>/mcps.json`

```json
{
  "mcpServers": {
    "codex-cli": {
      "command": "npx",
      "args": ["-y", "@openai/codex"],
      "env": {},
      "cwd": null
    },
    "internal-http": {
      "url": "http://localhost:8080/mcp",
      "headers": {
        "Authorization": "Bearer ${MCP_TOKEN}"
      }
    }
  }
}
```

Field contract:
- Top-level required: `mcpServers` object map
- Map key is `server_id`
- Use de-facto industry MCP config shape:
  - `stdio`: `command`, optional `args`, optional `env`, optional `cwd`
  - HTTP: `url`, optional `headers`
- Do not require custom transport marker fields in persisted file
- Sensitive connection material remains out of sync payloads
- `serverId` canonical value equals the `mcpServers` map key

## Team ID Policy (Required)

`teamId` is distinct from display `name`. It is the canonical stable key used for team folder names and sync identifiers.

Generation and stability rules mirror `agentId` policy:
1. Slug from `name` using lowercase + dash normalization
2. Collision suffixes (`-2`, `-3`, ...)
3. Rename of `name` does not auto-change existing `teamId`

## Agent ID Policy (Required)

`agentId` is distinct from display `name`. It is the canonical stable key used for folder names, team references, and sync identifiers.

Generation rule (when creating a new agent and `agentId` is not provided):
1. Start from `name`
2. Lowercase
3. Trim leading/trailing whitespace
4. Replace spaces/underscores with `-`
5. Remove characters outside `[a-z0-9-]`
6. Collapse repeated dashes
7. Trim leading/trailing dashes
8. If empty, use `agent`
9. Resolve collisions with numeric suffixes (`-2`, `-3`, ...)

Examples:
- `"Professor Agent"` -> `professor-agent`
- `"Professor   Agent"` -> `professor-agent`
- `"Professor_Agent"` -> `professor-agent`
- `"AI+Coach v2"` -> `aicoach-v2`
- Duplicate `professor-agent` -> `professor-agent-2`

Stability rule:
- Renaming `name` must **not** auto-change existing `agentId`.
- `agentId` changes are explicit operations only (to avoid breaking team references and sync mappings).

## Canonical Sync Payload Examples

### `agent_definition` entity payload

```json
{
  "agentId": "professor-agent",
  "agent": {
    "name": "Professor Agent",
    "role": "Professor",
    "description": "Fixture professor agent.",
    "avatarUrl": null,
    "activePromptVersion": 2,
    "toolNames": ["send_message_to"],
    "inputProcessorNames": [],
    "llmResponseProcessorNames": [],
    "systemPromptProcessorNames": [],
    "toolExecutionResultProcessorNames": [],
    "toolInvocationPreprocessorNames": [],
    "lifecycleProcessorNames": [],
    "skillNames": []
  },
  "promptVersions": {
    "1": "You are a helpful professor (v1).",
    "2": "You are a strict professor (v2)."
  }
}
```

### `agent_team_definition` entity payload

```json
{
  "teamId": "professor-student-team",
  "team": {
    "name": "Professor Student Team",
    "description": "Team for Professor/Student communication.",
      "coordinatorMemberName": "Professor",
      "role": null,
      "avatarUrl": null,
      "members": [
      { "memberName": "Professor", "agentId": "professor-agent" },
      { "memberName": "Student", "agentId": "student-agent" }
    ]
  }
}
```

### `mcp_server_configuration` entity payload

```json
{
  "serverId": "codex-cli",
  "transportType": "stdio",
  "enabled": true,
  "toolNamePrefix": "codex",
  "command": "npx",
  "args": ["-y", "@openai/codex"],
  "env": {},
  "cwd": null
}
```

## In-Scope Use Cases

| use_case_id | Description |
| --- | --- |
| UC-001 | Agent definitions loaded from `<data-dir>/agents/<agent-id>/agent.json` |
| UC-002 | Prompt content loaded from `<data-dir>/agents/<agent-id>/prompt-vN.md` using active version in `agent.json` |
| UC-003 | Agent-team definitions loaded from `<data-dir>/agent-teams/<team-id>/team.json` |
| UC-004 | MCP configs loaded from `<data-dir>/mcps.json` |
| UC-005 | MCP config mutations persist to `<data-dir>/mcps.json` |
| UC-006 | Sync export/import for `agent_definition` remains functional |
| UC-007 | Sync export/import for `agent_team_definition` remains functional |
| UC-008 | Sync export/import for `mcp_server_configuration` remains functional |
| UC-009 | Agent sync payload includes prompt-version data needed to reconstruct prompt markdown files |
| UC-010 | Selective sync dependency handling remains correct across team -> agent -> prompt-version data |
| UC-011 | Runtime agent tool catalog excludes Prompt Management, Agent Management, and Agent Team Management groups |

## Functional Requirements

| requirement_id | Requirement |
| --- | --- |
| R-001 | Agent persistence is per-folder JSON (`agent.json`) with stable schema and deterministic writes |
| R-002 | Agent-team persistence is per-folder JSON (`team.json`) with stable schema and deterministic writes |
| R-003 | Prompt persistence remains versioned Markdown (`prompt-vN.md`) and no parent prompt ID model |
| R-004 | MCP persistence uses single global `<data-dir>/mcps.json` with de-facto `mcpServers` standard shape |
| R-005 | No YAML for agent/team persistence |
| R-006 | No runtime dependency on SQL persistence for agent/team/prompt/MCP definitions |
| R-007 | Sync import/export parity with current behavior is preserved for all in-scope entity domains |
| R-008 | Sync import writes refresh runtime caches so behavior is visible without restart |
| R-009 | Existing UI behavior remains effectively unchanged unless strictly required by data model contract cleanup |
| R-010 | Agent ID is stable and distinct from name, generated by slug policy with deterministic collision handling |
| R-011 | Team ID is stable and distinct from name, generated by slug policy with deterministic collision handling |
| R-012 | Team membership references use `agentId` (not display name) to avoid rename coupling |
| R-013 | JSON writes are deterministic (UTF-8, stable key order, 2-space indentation) for predictable diffs and tooling |
| R-014 | Active prompt version resolution is explicit: `activePromptVersion` selects `prompt-vN.md`; if missing, runtime falls back to agent description |
| R-015 | Runtime agent tool catalog must not expose Prompt Management, Agent Management, or Agent Team Management tool groups; AI-agent management of these definitions is file-based |

## Acceptance Criteria

| acceptance_criteria_id | Criterion | Expected Outcome |
| --- | --- | --- |
| AC-001 | Agent file format | Provider reads/writes `agent.json` in each agent folder |
| AC-002 | Team file format | Provider reads/writes `team.json` in each team folder |
| AC-003 | Prompt file format | Prompt resolver/loader reads `prompt-vN.md` from agent folder |
| AC-004 | MCP file location/name | MCP provider reads/writes `<data-dir>/mcps.json` |
| AC-005 | No YAML path usage | No runtime agent/team persistence path uses YAML |
| AC-006 | Sync entity parity | `agent_definition`, `agent_team_definition`, `mcp_server_configuration` export/import remain functional |
| AC-007 | Prompt-version sync | Agent sync import reconstructs prompt markdown version files accurately |
| AC-008 | Dependency-safe selective sync | Team selective sync includes required agent and prompt-version dependencies |
| AC-009 | Cache coherence after import | Imported entities are visible via services/APIs without process restart |
| AC-010 | No SQL runtime dependency | In-scope runtime flows do not require SQL provider path |
| AC-011 | Agent JSON contract stability | `agent.json` matches required/optional field contract above |
| AC-012 | Team JSON contract stability | `team.json` matches required/optional field contract above |
| AC-013 | MCP JSON contract stability | `mcps.json` top-level map and per-entry schema are validated |
| AC-014 | Sync payload contract stability | Export/import payloads match canonical entity examples above |
| AC-015 | Agent ID generation and stability | New agents get deterministic slug IDs; rename does not auto-change existing IDs |
| AC-016 | Team ID generation and reference integrity | New teams get deterministic slug IDs; `members[].agentId` references resolve to agents |
| AC-017 | Deterministic JSON serialization | Same semantic content produces stable file output |
| AC-018 | Prompt version fallback behavior | Missing `prompt-vN.md` for active version falls back to agent description path |
| AC-019 | Runtime tool catalog cleanup | `list_available_tools` and tool-config UI no longer include Prompt Management, Agent Management, or Agent Team Management groups |

## Constraints / Clarifications

1. Agent/team files are edited by AI agents, not humans.
2. Prompts remain Markdown because content semantics are document-like.
3. `memory/` and `media/` directories remain existing peers under `<data-dir>`.
4. This ticket is a new clean line from `personal` baseline; previous in-progress ticket content is superseded for this scope.
5. Earlier UI button removals do not change these JSON contracts; contracts are source-of-truth for integration tests.
6. AI agents manage prompt/agent/team definitions through direct file operations in this scope, not dedicated management tool wrappers.
7. Discovery/meta tools remain allowed (for example, `list_available_tools` and MCP tooling); removal scope is limited to Prompt/Agent/Agent-Team management tool groups.
