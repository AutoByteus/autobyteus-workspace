# Handoff — mcp-http-auth-headers (SR-001): Architecture Design Complete

- Result: **Architecture Design Complete**, `task_size=Small`, `architectural_risk=Low`
- Package: `mcp-http-auth-headers`; Project Task `autobyteus-179` (FU-1 of `autobyteus-175`)
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), on the user's decision of 2026-10-19
- Workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/mcp-http-auth-headers`, branch `codex/mcp-http-auth-headers`, base `origin/personal` @ `d6f2d6ceb5933b441902eb5b1e4d67fca73658ac`; finalization target `origin/personal`
- Approval: requirements approved by the Solution Designer within the Task's direction (user informed 2026-10-19); no `Needs user` decision
- Artifacts (all in `tickets/in-progress/mcp-http-auth-headers/`): `requirements-doc.md`, `investigation-notes.md`, `design-spec.md`, `solution-revision-record.md`, this file
- Predecessor evidence: `/Users/normy/autobyteus_org/autobyteus-worktrees/jira-mcp-server-presets/tickets/in-progress/jira-mcp-server-presets/investigation-notes.md`, probes in `…/probes/`
- Architecture review artifacts: `N/A — not applicable` (Small / Low, direct route)

## Original request and goal

The Task: "Fix authentication for remote (streamable HTTP) MCP servers". Configured headers and the token must reach the server on every request (initialize, list tools, call tool), proven by a test against a real local MCP server that requires a header. The token is saved and sent as Bearer, so nothing is silently dropped. Unauthenticated servers keep working. No real credentials anywhere. Merged; a user-visible fix ships with the next beta, with the user's check.

## What to build (summary; the design spec is authoritative)

1. `autobyteus-ts/src/tools/mcp/types.ts`: token normalization (trim; blank → none); reject token + `Authorization` header (any case) with a value-free message; new `requestHeaders()`.
2. `autobyteus-ts/src/tools/mcp/server/http-managed-mcp-server.ts`: `new sdk.Transport(new URL(config.url), { requestInit: { headers: config.requestHeaders() } })`; remove the dead fallback and ignored keys.
3. `autobyteus-server-ts/src/mcp-server-management/providers/file-provider.ts`: persist `token`.
4. `autobyteus-web/components/tools/McpServerFormModal.vue`: include headers in the JSON view; add the token hint (en + zh-CN locale files).
5. Tests:
   - real-SDK unit test (in-process server requiring a header; header, token, none, wrong-value cases);
   - config validation tests;
   - save → reload test;
   - web component test.
6. Docs note in `autobyteus-server-ts/docs/modules/mcp_server_management.md`.

## Constraints

- Dummy values only (for example `test-dummy`), local servers only, no logging of values.
- Stay within the Change Scope: no vault work (FU-2), no OAuth, no presets, no WebSocket changes.

## Verification intent

- AC-001..AC-006, AC-008 in implementation and unit/integration tests.
- AC-007 in API/E2E validation: a selected agent calls a tool on a header-protected local MCP server through the AutoByteus server; native runtime at least, Claude or Codex where the environment allows.
- Then the user's check in the next beta.

## Open risks

- R-001: the token is stored in plain text until FU-2 (accepted, by the user's ordering).
- O-001: the WebSocket MCP transport is likely to have the same header drop and a stdio-shaped persistence. It is not a product path; this is a follow-up for the Project Task Manager at the delivery receipt.

## Next expected action

Implementation Engineer implements per `design-spec.md` and hands off per its own route.

## Route Record
- 2026-10-19: `get_handoff_rules` matched the rule "Architecture Design Complete with task_size=Small or Medium and architectural_risk=Low". Route: direct implementation; recipient `/software_engineering_team/implementation_engineer`. No other rule matches (not Large/High; not a delivery receipt).
