# API/E2E Testing — JSON File Persistence Sync Parity

## Stage 7 Gate Result

- Gate Status: `Pass`
- Date: `2026-03-03`

## Executed Commands

1. `pnpm -C autobyteus-server-ts test tests/integration/sync/node-sync-control.integration.test.ts tests/integration/api/graphql/node-sync-control.graphql-endpoint.integration.test.ts tests/e2e/sync/node-sync-graphql.e2e.test.ts tests/e2e/sync/node-sync-control-graphql.e2e.test.ts`
2. Re-run after prompt GraphQL cleanup:
   `pnpm -C autobyteus-server-ts test tests/integration/sync/node-sync-control.integration.test.ts tests/integration/api/graphql/node-sync-control.graphql-endpoint.integration.test.ts tests/e2e/sync/node-sync-graphql.e2e.test.ts tests/e2e/sync/node-sync-control-graphql.e2e.test.ts`
3. New real no-mock file-contract E2E:
   `pnpm -C autobyteus-server-ts test tests/e2e/sync/json-file-persistence-contract.e2e.test.ts`
4. Expanded Stage 7 suite (including new real contract E2E):
   `pnpm -C autobyteus-server-ts test tests/e2e/sync/json-file-persistence-contract.e2e.test.ts tests/integration/sync/node-sync-control.integration.test.ts tests/integration/api/graphql/node-sync-control.graphql-endpoint.integration.test.ts tests/e2e/sync/node-sync-graphql.e2e.test.ts tests/e2e/sync/node-sync-control-graphql.e2e.test.ts`
5. Real-test hardening suite (no mocked fetch + prompt fallback runtime integration):
   `pnpm -C autobyteus-server-ts test tests/e2e/sync/json-file-persistence-contract.e2e.test.ts tests/e2e/sync/node-sync-graphql.e2e.test.ts tests/e2e/sync/node-sync-control-graphql.e2e.test.ts tests/integration/sync/node-sync-control.integration.test.ts tests/integration/api/graphql/node-sync-control.graphql-endpoint.integration.test.ts tests/integration/agent-execution/agent-run-prompt-fallback.integration.test.ts`

## Results

- Test files: `4 passed`
- Tests: `15 passed`
- Failures: `0`
- Additional real contract run: `1 file`, `2 tests`, `0 failures`
- Expanded gate run: `5 files`, `17 tests`, `0 failures`
- Real-test hardening run: `6 files`, `18 tests`, `0 failures`

## Coverage Notes

- Sync scope contract validated for:
  - `AGENT_DEFINITION`
  - `AGENT_TEAM_DEFINITION`
  - `MCP_SERVER_CONFIGURATION`
- Selective sync dependency closure validated for team -> agent export/import path.
- MCP secure sync behavior validated:
  - export omits HTTP token/headers
  - import ignores HTTP token/headers
- Node sync control flow validated:
  - success across targets
  - partial-success target failure path
  - preflight health/configuration failure handling
  - e2e transport path uses real local HTTP fake nodes (no global `fetch` mocking)
- Real on-disk file persistence contracts validated without mocks:
  - `memory/agents/<agent-id>/agent.json` shape + deterministic no-op rewrite
  - `memory/agent-teams/<team-id>/team.json` shape + `members[].agentId`
  - `memory/mcps.json` top-level `mcpServers` map + standard per-entry schema
  - no YAML files emitted for agent/team persistence paths
- Real sync reconstruction validated without mocks:
  - `importSyncBundle(AGENT_DEFINITION)` writes `prompt-vN.md` files
  - active prompt version and updated agent metadata visible immediately via GraphQL query
- Runtime fallback behavior validated in no-mock integration path:
  - missing active `prompt-vN.md` causes runtime configuration to use agent description fallback
