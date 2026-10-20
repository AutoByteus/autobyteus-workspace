# Handoff Summary — mcp-bulk-import-errors

## Ticket

- Package: `mcp-bulk-import-errors`; Project Task `autobyteus-190`
- Classification: `task_size=Small`, `architectural_risk=Low`; route: direct low-risk (architecture, source and test-code review `Not Applicable`)
- Revisions: SR-001, IR-001, API-REV-001 (Pass, 95.9%), DR-001
- Archived ticket folder: `tickets/done/mcp-bulk-import-errors/` on `personal` (worktree removed after finalization)

## What Changed

- Core, `autobyteus-ts/src/tools/mcp/config-service.ts`: one transport rule for imported JSON and stored `mcps.json`:
  - an explicit `transport_type`/`transportType` is used as given;
  - else `url` → streamable HTTP, `command` → stdio;
  - else a named error.
- Server:
  - `importMcpServerConfigs` returns `failures` `{ serverId, reason }` next to the counts, with value-free reasons;
  - `mcp-config-service.ts` delegates to the core rule;
  - `file-provider.ts` loads with the same rule, keeping 181's tolerance for WebSocket-era stored entries.
- Web:
  - `McpBulkImportView.vue` lists the failures, scrolls them into view and stays open when any entry failed;
  - the store refreshes the list when at least one entry was imported;
  - the toast tells full, partial and none apart (en and zh-CN);
  - GraphQL mutation and generated types updated.
- Tests:
  - core, server and web unit tests (red first: IMP-00 and the store spec);
  - new GraphQL e2e `tests/e2e/tool-management/mcp-bulk-import.e2e.test.ts`.
- Docs:
  - `autobyteus-web/docs/tools_and_mcp.md` (implementation);
  - `autobyteus-server-ts/docs/modules/mcp_server_management.md` "Supported Transports" (delivery).

## Integration

- Merge of `origin/personal` @ `3d4d9d0a95` (two ticket-only delivery records ahead of `41be799edb`) → `59637ac3af`; no conflicts.
- DR-01, all Pass:
  - core and server builds;
  - MCP GraphQL e2e, 6/6 (bulk import, 181 redirect/transport, 179 auth);
  - web tools and import specs, 22/22.

## Verification

- Judged from the evidence; no user check needed. Details in `release-deployment-report.md`.

## Release

- `No release` (RELEASE.md default; not requested). The change is user-visible and ships with the next release; `release-notes.md` is ready. `v1.5.7-beta.5` is available on request.

## Follow-ups

- **O-1 (needs routing, pre-existing on `personal`):** two server e2e files fail on `origin/personal`:
  - `tests/e2e/memory/memory-collaboration-graphql.e2e.test.ts`: `rootTeam.taskExecutions[0] is missing required field(s): source.`;
  - `tests/e2e/runtime/team-task-event-current-contract.e2e.test.ts`: `TASK_EXECUTION_STARTED` payload `source` undefined.

  Commit `65ae647bc9` (autobyteus-197, delegated copies restore from their own file) made `source` required without updating these fixtures. This branch touches neither, and no later commit on `personal` fixes them. Sent to the Project Task Manager as a follow-up.
- O-2 (pre-existing): stray `autobyteus-server-ts/workspaces.json` from an e2e test, and `autobyteus-server-ts/autobyteus-web/resources/server/node_modules` from the Electron build.
- O-3: unrelated `autobyteus-web/generated/graphql.ts` drift (about 400 lines), from the implementation handoff.
- Not inspected: narrow widths and the dark theme; zh-CN checked by DOM only.
