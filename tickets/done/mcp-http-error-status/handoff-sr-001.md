# Handoff — mcp-http-error-status, SR-001

- Result: `Architecture Design Complete`
- Package identifier: `mcp-http-error-status`
- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/mcp-http-error-status/tickets/in-progress/mcp-http-error-status`
- Worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/mcp-http-error-status`, `codex/mcp-http-error-status`
- Base: `origin/personal` at `66d834b0acc3caa4e81d2e62c34d35ff0ad38bd1`; finalization target `origin/personal`
- Requested by: `/project_task_manager` (run id `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`)
- Classification: `task_size: Small`, `architectural_risk: Low` (design spec, Task Size And Architectural Risk)
- Approval: requirements approved by the Solution Designer within the Task's direction (user informed, 2026-10-20); no `Needs user` decision

## Original request

"Show the HTTP status in remote MCP connection errors" (FU-002 of autobyteus-182). A 401 reads `Error POSTing to endpoint: unauthorized`; the status is only on the error object. Where the MCP preview/registration error is turned into the GraphQL message, include `SdkHttpError.status` (e.g. "HTTP 401: …"). Done when a 401, 403, 404 and 500 from a remote MCP server each show their HTTP status in the message the user sees, with tests.

## What to build (summary; the design spec is authoritative)

- `autobyteus-ts/src/tools/mcp/server/http-managed-mcp-server.ts`: when `client.connect(transport)` throws `SdkHttpError`, rethrow `new Error("HTTP <status>[ <statusText>]: <SDK message>", { cause })`. Other errors pass unchanged. Keep the SDK lazy-loaded (take `SdkHttpError` from the existing dynamic import).
- Tests: new real-SDK cases in `autobyteus-ts/tests/unit/tools/mcp/http-managed-mcp-server.test.ts` (401/403/404/500, empty-body 404, refused, tool call that connects; extend wrong-credential and cross-origin cases) and a new built-server e2e `autobyteus-server-ts/tests/e2e/tool-management/mcp-http-error-status.e2e.test.ts` (preview and discover for 401/403/404/500).
- Expected visible text: `Failed to preview tools for MCP server: Error: HTTP 401 Unauthorized: Error POSTing to endpoint: unauthorized`.

## Evidence and reproduction

- Probe (before-state, real SDK through `McpToolRegistrar.listRemoteTools`): `probes/http-status-message.probe.test.ts`, output `probes/probe-output.txt`. Command from the worktree root: `pnpm -C autobyteus-ts exec vitest run --root ../tickets/in-progress/mcp-http-error-status/probes --no-watch`.

## Scope

- In scope: UC-001 preview, UC-002 save & discover / reload, UC-003 agent tool call that connects.
- Out of scope: resolver/web changes, stdio, post-connect HTTP errors (U-001), SDK text changes, our own MCP endpoints.
- Follow-ups: none found.

## Open risks

- None material. Escalation trigger: a consumer inspecting the thrown error's type/`code`, or an in-scope HTTP failure that does not arrive as `SdkHttpError`.

## Documents

- `requirements-doc.md`, `investigation-notes.md`, `design-spec.md`, `solution-revision-record.md` (this folder)

## Route

- Handoff rule applied (Small/Medium and Low → direct implementation): sent to `/software_engineering_team/implementation_engineer` on 2026-10-20. Architecture review not selected. Implementation self-checks and API/E2E validation still apply.
