# API/E2E Local Fix Reroute: Mixed Runtime Restore Metadata Lookup

## Summary

Live API/E2E coverage for the all-active-runtime communication matrix was added and the direct mixed-runtime matrix passed. During the updated existing AutoByteus+Codex mixed-runtime restore E2E, the pre-restore communication rows succeeded, but `restoreAgentTeamRun` failed because the restore path read team metadata from the wrong memory root.

This is classified as `Local Fix` for implementation, not stale coverage:

- The scenario remains required by the reviewed design/acceptance criteria, especially restore/rematerialization and Codex Agent Tools MCP session recreation coverage.
- The E2E has been updated to start Agent Tools MCP routes and seed `AUTOBYTEUS_INTERNAL_SERVER_BASE_URL` before Codex bootstrap.
- The failing restore behavior occurs after successful live AutoByteus -> Codex and Codex -> AutoByteus delivery/projection evidence.

## Failing Scenario

- File: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/autobyteus-server-ts/tests/e2e/runtime/mixed-team-runtime-graphql.e2e.test.ts`
- Scenario: `creates a live mixed-runtime team, proves cross-runtime delivery in both directions, restores, and continues with the persisted runtime/model/workspace configuration`
- Command:

```bash
RUN_LMSTUDIO_E2E=1 RUN_CODEX_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/mixed-team-runtime-graphql.e2e.test.ts -t "creates a live mixed-runtime team, proves cross-runtime delivery in both directions" --no-watch
```

## Evidence

Observed repeatedly:

- AutoByteus -> Codex pre-restore delivery succeeded.
- Codex -> AutoByteus pre-restore delivery succeeded.
- Team communication projections were inserted under the test app-data memory root.
- `getTeamRunResumeConfig(teamRunId)` returned two member metadata records before restore.
- `restoreAgentTeamRun(teamRunId)` returned `success: false`.
- Runtime stderr reported:

```text
Error restoring agent team run with ID <teamRunId>: Error: Team run '<teamRunId>' cannot be restored because metadata is missing.
```

A temporary diagnostic probe, removed from the repository after use, showed the root mismatch during the failing run:

```text
memoryDir: <tmp>/mixed-team-runtime-e2e-appdata-*/memory
teamRunServiceMetadataBaseDir: /Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/autobyteus-server-ts/memory/agent_teams
teamRunServiceCatalogBaseDir: <tmp>/mixed-team-runtime-e2e-appdata-*/memory/agent_teams
globalMetadataBaseDir: /Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/autobyteus-server-ts/memory/agent_teams
```

That means the catalog/create path was using the test memory root, while `TeamRunService.restoreTeamRun(...)` read metadata through a `TeamRunMetadataService` singleton cached against the default repository memory root.

Likely contributing source path:

- `autobyteus-server-ts/src/run-history/services/team-run-metadata-service.ts` caches `TeamRunMetadataService` as a single global instance, unlike `TeamRunHistoryCatalogService`, which is keyed by `memoryDir`.
- Codex modules can instantiate metadata-dependent helpers at module load before E2E `appConfigProvider.config.setCustomAppDataDir(...)`, e.g. `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-user-input-mapper.ts` creates a top-level `ContextFileLocalPathResolver`, whose default `ContextFileOwnerResolver` calls `getTeamRunMetadataService()`.

## Expected Fix Direction

Implementation should make restore and metadata lookup memory-root-safe without adding compatibility fallbacks or legacy paths. Likely acceptable fixes include one or both of:

1. Key `getTeamRunMetadataService()` by the current `appConfigProvider.config.getMemoryDir()` or otherwise reset/recreate it when the memory root changes.
2. Remove or defer top-level construction paths that capture memory-root-sensitive services before the app/test data directory is configured.

Do not fix by:

- adding a fallback read from the repository default memory root;
- persisting Agent Tools MCP descriptors or bearer headers;
- restoring Codex dynamic `send_message_to`;
- bypassing the reviewed `TeamRunMetadataMapper` / restore ownership boundaries.

## Passing Related Evidence

The new all-active-runtime direct communication matrix passed live with all three runtime gates enabled:

```bash
RUN_LMSTUDIO_E2E=1 RUN_CODEX_E2E=1 RUN_CLAUDE_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/all-runtime-send-message-matrix.e2e.test.ts --no-watch
```

Result: `1` test passed. It covered direct AutoByteus -> Claude, Claude -> AutoByteus, Codex -> Claude, Claude -> Codex, AutoByteus -> Codex, and Codex -> AutoByteus rows in one top-level team.
