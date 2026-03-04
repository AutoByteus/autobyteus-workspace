# Implementation Progress — JSON File Persistence Sync Parity

## Kickoff Checklist

- Stage 5 gate `Go Confirmed`: `Yes`
- Requirements `Design-ready`: `Yes`
- Implementation plan finalized: `Yes`
- Code edit permission unlocked: `Yes`

## Progress Log

- 2026-03-03: Implemented folder-based JSON providers for agents and teams (`agent.json`, `team.json`) with deterministic file writes and stable ID generation.
- 2026-03-03: Added `activePromptVersion` to agent domain and switched runtime prompt loading to `prompt-vN.md` file reads.
- 2026-03-03: Switched MCP persistence to global `<data-dir>/mcps.json` using `mcpServers` map format and removed runtime profile-based MCP provider selection.
- 2026-03-03: Reworked node sync contract to three entities and embedded prompt-version synchronization into `agent_definition` payloads.
- 2026-03-03: Fixed MCP configure regression by returning parsed `BaseMcpConfig` instances from file provider `create/update` paths.
- 2026-03-03: Removed `parentPromptId` from GraphQL `Prompt` type output contract to match prompt-version model direction.
- 2026-03-03: Updated Stage 7 integration/e2e sync suites from legacy `PROMPT` sync entity scope to `AGENT_DEFINITION` payload contract.
- 2026-03-03: Executed targeted Stage 7 verification suites; all passed.
- 2026-03-03: Added no-mock real E2E contract coverage for on-disk agent/team/MCP JSON files and sync prompt-version reconstruction at `tests/e2e/sync/json-file-persistence-contract.e2e.test.ts`.
- 2026-03-03: Re-ran expanded Stage 7 suite including new contract E2E; all passed (`5 files`, `17 tests`).
- 2026-03-03: Replaced `node-sync-control-graphql.e2e` fetch-mock style with real local HTTP fake-node topology (no `fetch` mocking).
- 2026-03-03: Added no-mock integration coverage for runtime prompt fallback behavior (`agent-run-prompt-fallback.integration.test.ts`).
- 2026-03-03: Re-ran expanded suite after real-test hardening; all passed (`6 files`, `18 tests`).
- 2026-03-03: Removed in-scope legacy SQL persistence implementations for agent definition, agent-team definition, and prompt domains; runtime provider registries now resolve to file-based providers for supported profiles.
- 2026-03-03: Removed legacy SQL integration test files for removed persistence paths and aligned unit coverage to file-persistence behavior.
- 2026-03-03: Fixed web regression in `applicationStore` by restoring `enableApplications` feature-flag guards for fetch/run actions.
- 2026-03-03: Stabilized cross-package test reliability by fixing stale prompt-loader mock leakage and hardening message-gateway filesystem/e2e polling races.
- 2026-03-03: Executed full package-level real test gates (`message-gateway`, `server-ts`, `web`) with all tests passing.
- 2026-03-03: Re-entry cycle: removed dormant Prisma schema models for migrated definition domains (`AgentDefinition`, `AgentPromptMapping`, `Prompt`, `AgentTeamDefinition`, `McpServerConfiguration`) and removed `SyncTombstone` model (runtime tombstones are not persisted).
- 2026-03-03: Re-entry cycle: removed remaining MCP SQL production artifacts (SQL provider/repository/converter) and switched MCP provider registry aliases (`sqlite`/`postgresql`) to file provider loader.
- 2026-03-03: Re-entry cycle: removed migrated-domain dormant Prisma converters for agent/team/prompt.
- 2026-03-03: Re-entry cycle: pruned MCP SQL-only integration/unit test files and legacy JS duplicates.
- 2026-03-03: Re-entry cycle: executed full package-level real test gates after schema cleanup; all packages passing.
- 2026-03-03: Re-entry local-fix cycle: aligned real tests to refined requirement contract by removing legacy `systemPromptCategory/systemPromptName` GraphQL input usage, removing deprecated prompt CRUD setup from run-history e2e, and updating prompt deprecation assertions to one-mutation-per-request behavior.
- 2026-03-03: Re-entry local-fix cycle: executed full `autobyteus-server-ts` real suite twice (`1` prompt e2e assertion drift found then fixed); final gate passed with `239 files: 234 passed, 5 skipped` and `1051 tests: 1030 passed, 21 skipped`.
- 2026-03-04: Re-entry requirement-gap cycle: removed MCP Server Management wrapper tools from runtime agent tool loader and deleted redundant wrapper source modules.
- 2026-03-04: Re-entry requirement-gap cycle: pruned MCP wrapper-only unit tests under `tests/unit/agent-tools/mcp-server-management`.
- 2026-03-04: Re-entry requirement-gap cycle: added real GraphQL e2e coverage (`tool-catalog-cleanup.e2e`) asserting LOCAL runtime catalog excludes MCP wrapper category/tool names.
- 2026-03-04: Re-entry requirement-gap cycle: executed full `autobyteus-server-ts` real suite; gate passed with `234 files: 229 passed, 5 skipped` and `1038 tests: 1017 passed, 21 skipped`.
- 2026-03-04: Re-entry local-fix cycle: restored frontend Prompts menu item in primary nav (`AppLeftPanel`, `LeftSidebarStrip`) with route `/prompt-engineering` and active-state support.
- 2026-03-04: Re-entry local-fix cycle: restoring standalone Prompt Engineering GraphQL resolver behavior (query + mutation CRUD path) and fixture prompt seeding so Reload shows initial prompt data.
- 2026-03-04: Re-entry local-fix cycle: restoring prompt activation propagation to linked agents by reactivating agent↔prompt-family binding and synchronizing `activePromptVersion` + `prompt-vN.md` writes on `markActivePrompt`.
- 2026-03-04: Re-entry requirement-gap cycle: removed per-agent prompt-family override from agent GraphQL create/update inputs (`systemPromptCategory/systemPromptName`) and kept default linkage + global `markActivePrompt` propagation behavior only.
- 2026-03-04: Stage 7 rerun for user-mandated real verification: integration and API/E2E suites executed with serialized workers (`--maxWorkers=1`) to eliminate SQLite contention; both suites passed.

## File-Level Progress (Stage 6)

| Change ID | File/Area | Status | Unit Test Status | Integration Status | Notes |
| --- | --- | --- | --- | --- | --- |
| C-001 | json folder agent provider | Completed | Pass | Pass | `agent.json` + prompt versions |
| C-002 | json folder team provider | Completed | Pass | Pass | `team.json` with `members[].agentId` |
| C-003 | cached providers refresh hooks | Completed | Pass | Pass | post-import consistency |
| C-004 | service wiring | Completed | Pass | Pass | route reads/writes to folder providers |
| C-005 | prompt loader | Completed | Pass | Pass | active version + fallback |
| C-006 | node-sync service | Completed | Pass | Pass | agent payload contains promptVersions |
| C-007 | node-sync selection service | Completed | Pass | Pass | team->agent->prompt dependency |
| C-008 | MCP file provider | Completed | Pass | Pass | `<data-dir>/mcps.json` + `mcpServers` |
| C-009 | MCP config service | Completed | Pass | Pass | standard map consume/persist |
| C-010 | GraphQL sync DTOs | Completed | Pass | Pass | payload contract alignment |
| C-011 | tests | Completed | Pass | Pass | unit/integration/e2e updated and passing |
| C-012 | real no-mock API/E2E contracts | Completed | N/A | Pass | on-disk file contract + sync reconstruction verified |
| C-013 | real no-mock sync control e2e | Completed | N/A | Pass | removed mocked fetch from e2e sync control path |
| C-014 | real prompt fallback runtime integration | Completed | N/A | Pass | missing `prompt-vN.md` falls back to agent description |
| C-015 | SQL legacy removal (agent/team/prompt) | Completed | Pass | Pass | SQL provider impls removed; file path is active runtime path |
| C-016 | web feature-flag regression fix | Completed | Pass | N/A | `enableApplications=false` no longer invokes GraphQL |
| C-017 | flaky test stabilization | Completed | Pass | Pass | prompt-loader and gateway cleanup/polling race fixed |
| C-018 | Prisma dormant model cleanup | Completed | Pass | Pass | removed migrated-domain + tombstone models from schema |
| C-019 | MCP SQL artifact removal | Completed | Pass | Pass | MCP SQL provider/repository/converter + SQL tests removed |
| C-020 | stale migrated-domain converter pruning | Completed | Pass | Pass | removed dormant Prisma converters for agent/team/prompt |
| C-021 | real test contract alignment (final re-entry) | Completed | Pass | Pass | updated e2e/integration expectations to refined file-first + prompt-deprecation contract |
| C-022 | MCP wrapper tool-catalog cleanup | Completed | Pass | Pass | removed MCP wrapper tools from runtime loader + removed wrapper modules/tests + added real tool-catalog e2e |
| C-023 | frontend prompt menu regression fix | Completed | N/A | N/A | re-added Prompts menu entry in primary navigation to preserve prompt page discoverability |
| C-024 | prompt resolver + fixture seeding continuity fix | In Progress | N/A | N/A | re-enable prompt GraphQL CRUD/list path and seed deterministic initial prompt entries |
| C-025 | active-prompt propagation to linked agents | In Progress | N/A | N/A | update linked agents to active prompt version and on-disk prompt file on mark-active flow |
| C-026 | remove per-agent prompt override API path | Completed | N/A | N/A | removed `systemPromptCategory/systemPromptName` from agent GraphQL create/update inputs; default prompt-family binding retained |

## Stage 7 Acceptance Matrix (Initialized)

| Acceptance Criteria | Scenario ID | Status |
| --- | --- | --- |
| AC-001, AC-011 | AV-001 | Pass |
| AC-002, AC-012, AC-016 | AV-002 | Pass |
| AC-003, AC-018 | AV-003 | Pass |
| AC-004, AC-013 | AV-004 | Pass |
| AC-006, AC-014 | AV-005 | Pass |
| AC-007, AC-008 | AV-006 | Pass |
| AC-009 | AV-007 | Pass |
| AC-010 | AV-008 | Pass |
| AC-015 | AV-009 | Pass |
| AC-017 | AV-010 | Pass |
| AC-019 | AV-011 | Pass |
| AC-020 | AV-012 | Pass |
| AC-021 | AV-013 | Pass |
| AC-022 | AV-014 | Pass |
| AC-023 | AV-015 | Pass |
