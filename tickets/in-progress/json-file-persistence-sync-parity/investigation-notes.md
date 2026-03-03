# Investigation Notes

## Scope

- Ticket: `json-file-persistence-sync-parity`
- Date: `2026-03-03`
- Triage: `Medium`

## Baseline Verified On `personal`

1. Sync behavior is active and functional for:
   - `prompt`
   - `agent_definition`
   - `agent_team_definition`
   - `mcp_server_configuration`
2. `NodeSyncService` currently exports and imports all four entity types.
3. Selective sync dependency expansion currently includes prompt family dependency through agent prompt mapping.

## Current Persistence Snapshot

1. Agent definitions are file-backed JSON array records (`definitions.json`) via `FileAgentDefinitionProvider`.
2. Agent team definitions are file-backed JSON array records (`definitions.json`) via `FileAgentTeamDefinitionProvider`.
3. MCP configs are file-backed JSON array records at `mcp-server-configs.json`.
4. Prompts are managed via prompt service/model and synchronized as first-class `prompt` entities.

## Confirmed Requirement Corrections

1. No YAML for agent/team.
2. Prompts remain Markdown files (`prompt-vN.md`) in agent folders.
3. MCP file is global under data directory root: `<data-dir>/mcps.json`.
4. No `<data-dir>/persistence/` folder requirement for MCP.
5. Existing synchronization capability should be preserved, not dropped.

## Implications For Design Stage

1. Agent/team model can move to per-folder JSON (`agent.json`, `team.json`) without reducing sync scope.
2. Prompt synchronization should be represented through agent-level prompt version payloads instead of standalone prompt DB entities.
3. Node sync selection logic must keep dependency safety for team-to-agent and agent-to-prompt-version coverage.
