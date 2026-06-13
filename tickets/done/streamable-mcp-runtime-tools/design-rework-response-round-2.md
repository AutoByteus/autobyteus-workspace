# Design Rework Response - Round 2 Architecture Review

## Context

- Updated review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/tickets/in-progress/streamable-mcp-runtime-tools/design-review-report.md`
- Round 2 review decision: `Fail / Design Impact`
- Remaining issue: narrow AR-001 precision in DS-007 protocol/auth/status matrix
- Rework date: 2026-06-13
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools`
- Branch/base: `codex/streamable-mcp-runtime-tools` at `origin/personal` commit `08078c265902955e5a570721e03763c5f39398f6`

## Round 2 findings addressed

### 1. Unsupported HTTP method row vs all-non-OPTIONS auth rule

Status: addressed.

DS-007 now states unsupported HTTP methods use:

```text
Origin -> auth syntax -> registry resolve -> method guard
```

With valid auth/session, the response is `405 Method Not Allowed` and no JSON-RPC/tool dispatch. If auth/session fails, the normal auth/session error is returned first. This keeps the rule that `OPTIONS` is the only unauthenticated route path.

### 2. Unknown/unconfigured `tools/call` result ambiguity

Status: addressed.

DS-007 now chooses one exact behavior:

- Unknown tool name: `200 application/json` JSON-RPC error `-32602 Invalid params`, redacted message such as `Unknown MCP tool`, no MCP tool result, no domain dispatch.
- Unconfigured tool: `200 application/json` JSON-RPC error `-32602 Invalid params`, redacted message such as `Tool is not enabled for this session`, no MCP tool result, no domain dispatch.

MCP tool `isError` results are now explicitly reserved for valid/configured tool calls that reached the owning dispatcher/service and failed semantically.

### 3. Invalid JSON-RPC envelope stage rule

Status: addressed.

DS-007 now pins the stage rule:

- Malformed JSON: HTTP `400` with JSON-RPC `-32700 Parse error`, `id: null`.
- Gross JSON-RPC envelope failure before a valid request/notification/response object exists: HTTP `400` with JSON-RPC `-32600 Invalid Request`, `id` copied only if safely inferable, otherwise `null`.
- Valid request envelope with invalid method params: HTTP `200` JSON-RPC `-32602` in the relevant method row.

## Requirements update

`AC-MCP-015` now requires tests for these exact choices:

- unsupported HTTP method authenticated/session-resolved then `405`,
- unknown/unconfigured tools as `200` JSON-RPC `-32602` with no MCP tool result,
- invalid request envelope `400`/`-32600`,
- method-level invalid params `200`/`-32602`.

## Files updated in this rework

- `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/tickets/in-progress/streamable-mcp-runtime-tools/design-spec.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/tickets/in-progress/streamable-mcp-runtime-tools/requirements-doc.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/tickets/in-progress/streamable-mcp-runtime-tools/investigation-notes.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/tickets/in-progress/streamable-mcp-runtime-tools/design-rework-response-round-2.md`
