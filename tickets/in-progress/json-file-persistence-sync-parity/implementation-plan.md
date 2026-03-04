# Implementation Plan — JSON File Persistence Sync Parity

## Preconditions

- Requirements status: `Design-ready`
- Runtime review gate: `Go Confirmed`
- Code Edit Permission: `Locked` until Stage 6 transition is persisted

## Change Inventory

| Change ID | Type | Target | Summary |
| --- | --- | --- | --- |
| C-001 | Add | `src/agent-definition/providers/json-folder-agent-definition-provider.ts` | Per-folder `agent.json` read/write + promptVersions file helpers |
| C-002 | Add | `src/agent-team-definition/providers/json-folder-agent-team-definition-provider.ts` | Per-folder `team.json` read/write |
| C-003 | Modify | cached providers (agent/team) | Add `refresh()` / cache invalidation hooks |
| C-004 | Modify | agent/team services | Use new JSON folder providers |
| C-005 | Modify | prompt loader | Keep `prompt-vN.md` resolution + fallback behavior |
| C-006 | Modify | node-sync service | Replace standalone prompt sync with `agent_definition.promptVersions` |
| C-007 | Modify | node-sync selection service | Dependency closure with `agentId` and prompt versions |
| C-008 | Modify | MCP file provider | File path `<data-dir>/mcps.json` + `mcpServers` map contract |
| C-009 | Modify | MCP config service | Consume standard MCP map format consistently |
| C-010 | Modify | GraphQL sync types | Align payload DTOs with new contracts |
| C-011 | Modify | tests (unit/integration/e2e) | Update for JSON folder contracts and sync parity |

## Execution Sequence

1. Implement new folder JSON providers (`C-001`, `C-002`).
2. Wire services/caches (`C-003`, `C-004`, `C-005`).
3. Implement sync contract updates (`C-006`, `C-007`, `C-010`).
4. Implement MCP standard map migration (`C-008`, `C-009`).
5. Update tests (`C-011`).

## Requirement Traceability

| Requirement | Planned Changes |
| --- | --- |
| R-001, R-010 | C-001, C-004 |
| R-002, R-011, R-012 | C-002, C-004, C-007 |
| R-003, R-014 | C-001, C-005, C-006 |
| R-004 | C-008, C-009 |
| R-005, R-006 | C-001, C-002, C-004 |
| R-007, R-008 | C-003, C-006, C-007, C-010 |
| R-013 | C-001, C-002, C-008 |

## Verification Plan (Stage 6 + Stage 7)

1. Unit:
- agent/team folder providers
- node sync service payload conversion
- MCP file provider map contract
2. Integration:
- sync import/export roundtrip for all three entity types
- service read paths from folder files
3. E2E/API (Stage 7):
- GraphQL sync endpoints acceptance criteria matrix

