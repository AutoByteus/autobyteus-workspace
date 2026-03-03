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
