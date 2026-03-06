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
6. Full real package gate after SQL-legacy removal and regression fixes:
   `cd autobyteus-message-gateway && pnpm test`
7. Full real package gate after SQL-legacy removal and regression fixes:
   `cd autobyteus-server-ts && pnpm test`
8. Full real package gate after SQL-legacy removal and regression fixes:
   `cd autobyteus-web && pnpm test`
9. Re-entry cycle full package gate after Prisma schema + MCP SQL artifact cleanup:
   `cd autobyteus-server-ts && pnpm test`
10. Re-entry cycle full package gate after Prisma schema + MCP SQL artifact cleanup:
   `cd autobyteus-message-gateway && pnpm test`
11. Re-entry cycle full package gate after Prisma schema + MCP SQL artifact cleanup:
   `cd autobyteus-web && pnpm test`
12. Re-entry local-fix full backend gate (initial run after test-contract alignment):
   `cd autobyteus-server-ts && pnpm test`
13. Re-entry local-fix full backend gate (rerun after prompt e2e assertion correction):
   `cd autobyteus-server-ts && pnpm test`
14. Re-entry requirement-gap full backend gate (after MCP wrapper-tool removal and cleanup e2e addition):
   `cd autobyteus-server-ts && pnpm test`
15. Re-entry Stage 7 integration suite (initial parallel/normal worker run):
   `pnpm -C autobyteus-server-ts test tests/integration`
16. Re-entry Stage 7 integration suite (serialized worker rerun for SQLite stability):
   `pnpm -C autobyteus-server-ts test tests/integration -- --maxWorkers=1`
17. Re-entry Stage 7 API/E2E suite (serialized worker run):
   `pnpm -C autobyteus-server-ts test tests/e2e -- --maxWorkers=1`

## Results

- Test files: `4 passed`
- Tests: `15 passed`
- Failures: `0`
- Additional real contract run: `1 file`, `2 tests`, `0 failures`
- Expanded gate run: `5 files`, `17 tests`, `0 failures`
- Real-test hardening run: `6 files`, `18 tests`, `0 failures`
- Full package gate (`autobyteus-message-gateway`): `80 files`, `225 tests`, `0 failures`
- Full package gate (`autobyteus-server-ts`): `237 files passed`, `5 skipped`; `1042 tests passed`, `21 skipped`; `0 failures`
- Full package gate (`autobyteus-web`): Nuxt `147 files`, `723 tests`; Electron `6 files`, `38 tests`; `0 failures`
- Re-entry gate (`autobyteus-server-ts`): `234 files passed`, `5 skipped`; `1028 tests passed`, `21 skipped`; `0 failures`
- Re-entry gate (`autobyteus-message-gateway`): `80 files`, `225 tests`, `0 failures`
- Re-entry gate (`autobyteus-web`): Nuxt `147 files`, `723 tests`; Electron `6 files`, `38 tests`; `0 failures`
- Re-entry local-fix gate attempt 1 (`autobyteus-server-ts`): `1` failure in `tests/e2e/prompts/prompts-graphql.e2e.test.ts` due to multi-mutation GraphQL error-count assumption.
- Re-entry local-fix gate attempt 2 (`autobyteus-server-ts`): `239 files` (`234 passed`, `5 skipped`); `1051 tests` (`1030 passed`, `21 skipped`); `0 failures`.
- Re-entry requirement-gap gate (`autobyteus-server-ts`): `234 files` (`229 passed`, `5 skipped`); `1038 tests` (`1017 passed`, `21 skipped`); `0 failures`.
- Re-entry Stage 7 integration attempt 1 (`tests/integration`): `36 files`; `7 failed`, `26 passed`, `3 skipped`; failures were timeout/SQLite contention under default worker scheduling.
- Re-entry Stage 7 integration attempt 2 (`tests/integration -- --maxWorkers=1`): `36 files`; `33 passed`, `3 skipped`; `141 passed`, `7 skipped`; `0 failures`.
- Re-entry Stage 7 API/E2E run (`tests/e2e -- --maxWorkers=1`): `23 files`; `21 passed`, `2 skipped`; `59 passed`, `14 skipped`; `0 failures`.

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
- Real API/E2E no-mock verification confirmed after re-opened requirement cycle:
  - message-gateway webhook-forwarding path and reliability queue completion
  - server-side sync/entity/runtime flows after SQL legacy provider removal
  - web store/runtime behavior for application feature gating
- Re-entry verification confirms schema/legacy cleanup does not regress real E2E/API behavior:
  - server package remains green after dormant model pruning and MCP SQL artifact removal
  - gateway/web package suites remain green unchanged
- Final re-entry verification confirms refined requirement contract is enforced in real tests:
  - agent-definition GraphQL tests no longer assert removed prompt metadata fields
  - sync and run-history e2e flows avoid deprecated standalone prompt CRUD path
  - prompt GraphQL e2e validates deprecated mutation behavior with real resolver error responses
- MCP wrapper-tool removal verification (real e2e):
  - `tests/e2e/tool-management/tool-catalog-cleanup.e2e.test.ts` validates LOCAL runtime catalog excludes `MCP Server Management` group and wrapper tool names (`apply/delete/discover/get/list/preview` MCP wrapper tools).
- Current Stage 7 rerun confirms prompt behavior paths are real and green in API/E2E:
  - `tests/e2e/prompts/prompts-graphql.e2e.test.ts` passes end-to-end for list/create/revision/activate/update/delete prompt flows.
  - Serialized worker mode is required in this environment to avoid intermittent SQLite timeout contention in broad integration runs.
