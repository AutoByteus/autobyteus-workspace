# Proposed Design — JSON File Persistence Sync Parity

## Design Version

- Current Version: `v1`
- Requirements Source: `tickets/in-progress/json-file-persistence-sync-parity/requirements.md`

## Architecture Decisions

1. Agent storage switches from flat `definitions.json` rows to per-folder files:
   - `<data-dir>/agents/<agentId>/agent.json`
   - `<data-dir>/agents/<agentId>/prompt-vN.md`
2. Team storage switches from flat `definitions.json` rows to per-folder files:
   - `<data-dir>/agent-teams/<teamId>/team.json`
3. MCP storage uses global standard map file:
   - `<data-dir>/mcps.json`
4. Sync scope remains functionally equivalent for:
   - `agent_definition`
   - `agent_team_definition`
   - `mcp_server_configuration`
5. Prompt synchronization is carried through `agent_definition.promptVersions` payload, not standalone prompt entities.

## Domain Contracts

### Agent

- Canonical key: `agentId` (folder name)
- Metadata source: `agent.json`
- Prompt source: `prompt-vN.md` where `N = activePromptVersion`

### Team

- Canonical key: `teamId` (folder name)
- Team members reference `agentId` (never agent display name)

### MCP

- Canonical key: `serverId = Object.keys(mcpServers)[i]`
- Entry shape follows de-facto MCP format (`command`/`url` based)

## Sync Contract (Target)

### `agent_definition`

```json
{
  "agentId": "professor-agent",
  "agent": { "name": "Professor Agent", "activePromptVersion": 2 },
  "promptVersions": {
    "1": "prompt v1 markdown",
    "2": "prompt v2 markdown"
  }
}
```

### `agent_team_definition`

```json
{
  "teamId": "professor-student-team",
  "team": {
    "name": "Professor Student Team",
    "members": [{ "memberName": "Professor", "agentId": "professor-agent" }]
  }
}
```

### `mcp_server_configuration`

```json
{
  "serverId": "codex-cli",
  "config": {
    "command": "npx",
    "args": ["-y", "@openai/codex"]
  }
}
```

## Service/Provider Changes

1. Add JSON folder provider for agent definitions:
   - read/write `agent.json`
   - read/write prompt markdown version files
2. Add JSON folder provider for team definitions:
   - read/write `team.json`
3. Extend cached providers with explicit cache refresh/invalidate hooks for sync import paths.
4. Update NodeSync service:
   - remove standalone `prompt` sync entity handling
   - export/import agent payload including `promptVersions`
   - keep team and MCP sync handling
   - maintain selective dependency expansion (`team -> agent -> promptVersions`)
5. MCP provider:
   - rename file path to `<data-dir>/mcps.json`
   - persist and load standard `mcpServers` map structure

## ID Policies

1. `agentId` generation:
   - slug(name), deterministic, collision suffix
2. `teamId` generation:
   - slug(name), deterministic, collision suffix
3. rename does not auto-change IDs

## Non-Goals

1. No UI behavior redesign beyond data-contract compatibility adjustments.
2. No backward-compat dual path.
3. No YAML persistence path.

## Initial Change Inventory (v1)

| Change ID | Type | Area | Summary |
| --- | --- | --- | --- |
| D-001 | Modify | `agent-definition` providers/services | Move to `agent.json` + prompt markdown folder contract |
| D-002 | Modify | `agent-team-definition` providers/services | Move to `team.json` folder contract with `agentId` references |
| D-003 | Modify | `sync/node-sync-service` | Replace prompt entity sync with agent-embedded promptVersions |
| D-004 | Modify | `sync/node-sync-selection-service` | Update dependency checks to use `agentId` + promptVersions presence |
| D-005 | Modify | `mcp-server-management/file-provider` | Switch file to `<data-dir>/mcps.json` + `mcpServers` map |
| D-006 | Modify | GraphQL sync type contracts | Align payload types with new sync entity shapes |
| D-007 | Modify | tests | Rebaseline unit/integration/e2e on new file and sync contracts |

## Risks And Mitigations

1. Risk: sync payload mismatch across nodes during rollout.
   - Mitigation: versioned payload parsers with strict validation and failure reporting.
2. Risk: stale cache after import writes.
   - Mitigation: explicit cache refresh hooks after successful import operation.
3. Risk: ID drift if name-based references leak into team files.
   - Mitigation: enforce `agentId`-only member schema and validation.
