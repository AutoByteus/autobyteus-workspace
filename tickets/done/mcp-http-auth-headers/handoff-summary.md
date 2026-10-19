# Handoff Summary — mcp-http-auth-headers

## Ticket

- Package: `mcp-http-auth-headers`; Project Task `autobyteus-179` (FU-1 of `autobyteus-175`, `jira-mcp-server-presets`)
- Classification: `task_size=Small`, `architectural_risk=Low`; route: direct low-risk (architecture, source and test-code review `Not Applicable`)
- Revisions: SR-001 (requirements + design), IR-001 (implementation), API-REV-001 (API/E2E, Pass 95.3%), DR-001 (delivery)
- Archived ticket folder: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/mcp-http-auth-headers/` on `personal` (worktree removed after finalization)

## What Changed For Users

- Configured headers of a remote (Streamable HTTP) MCP server are sent on every request: initialize, tool listing, preview and tool calls, for every agent runtime.
- The Token field is saved and sent as `Authorization: Bearer <token>`; blank means none; a hint under the field says so and points to the JSON view for other schemes.
- Form → JSON view now shows and keeps headers.
- Token + `Authorization` header (any case) is rejected on save, preview and import, with a value-free message.

## Code

- `autobyteus-ts/src/tools/mcp/types.ts`: token normalization, conflict rejection, `requestHeaders()`
- `autobyteus-ts/src/tools/mcp/server/http-managed-mcp-server.ts`: `requestInit.headers`; dead fallbacks removed
- `autobyteus-server-ts/src/mcp-server-management/providers/file-provider.ts`: persists `token`
- `autobyteus-web/components/tools/McpServerFormModal.vue` + en / zh-CN locale: JSON view headers, token hint
- Tests: core real-SDK client test, config/types tests, server save → reload test, web component spec; durable e2e `tests/e2e/tool-management/mcp-http-auth-remote-server.e2e.test.ts` (ungated, needs a current server build) and `tests/e2e/runtime/mcp-http-auth-agent-tool-call.e2e.test.ts` (gated per runtime)
- Docs: `autobyteus-server-ts/docs/modules/mcp_server_management.md`, `autobyteus-web/docs/tools_and_mcp.md`

## Integration

- Method: merge of `origin/personal` @ `8d40ba3b6c` (17 commits ahead of bootstrap base `d6f2d6ceb5`) into `codex/mcp-http-auth-headers` → `cebd751772`; no conflicts, no overlapping files
- Post-integration checks (all Pass): server typecheck + build (DR-01); built-server credentials e2e incl. real restart (DR-02, 2/2); scripted AGY agent tool call through `autobyteus_agent_tools` (DR-03; base had extended that fixture); server MCP management units (DR-04, 18/18); web tools components (DR-05, 16/16)

## Verification

- Judged from the evidence; no user check needed (details in `release-deployment-report.md`). Every critical AC is directly proven at the remote server's boundary, including four agent runtimes (native LM Studio, live Codex, live Claude, scripted AGY), a real process restart and a mutation run that goes red without the fix.

## Release

- Decision: `Beta`, requested by the user after finalization. Published `v1.5.6-beta.10` (release commit `b35259e5b5`): GitHub pre-release with 17 assets, Android APK, TestFlight upload, Docker `autobyteus/autobyteus-server:1.5.6-beta.10` and `:beta`; all four workflows succeeded.
- Beta users get it with **Settings > Updates > Receive beta updates** on, or `autobyteus-docker upgrade --all --tag beta`. The Task's user check can be done on this beta.
- `release-notes.md` holds user-facing notes for the next stable release (betas use generated notes).

## Residual Risks And Follow-ups

- R-001 / FU-2: token and headers stored in plain text in `mcps.json` (accepted).
- O-001: WebSocket MCP transport likely has the same header drop; not a product path. Follow-up for the Project Task Manager.
- Each registry tool call opens a fresh MCP session (existing behavior, outside scope).
- Token hint at narrow widths / dark theme not inspected (cosmetic).
- No real third-party server used (REQ-007 forbids real credentials); FU-4 presets will exercise one.
