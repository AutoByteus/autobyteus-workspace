# Design Rework Response - Round 1 Architecture Review

## Context

- Review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/tickets/in-progress/streamable-mcp-runtime-tools/design-review-report.md`
- Review decision: `Fail / Design Impact`
- Rework date: 2026-06-13
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools`
- Branch/base: `codex/streamable-mcp-runtime-tools` at `origin/personal` commit `08078c265902955e5a570721e03763c5f39398f6`

## AR-001 Streamable HTTP compliance / auth / error matrix

Status: addressed in revised design.

Updated artifacts:

- `design-spec.md`
  - Added Round-2 review status and AR rework log.
  - Expanded DS-005 unauthorized/unconfigured denial so all non-OPTIONS request classes are gated before identity/list/ping/SSE/DELETE/tool behavior.
  - Expanded DS-007 with:
    - protocol/auth/status matrix,
    - all non-OPTIONS app `:sessionId` + bearer auth rule,
    - Origin policy,
    - content/accept handling,
    - `MCP-Protocol-Version` policy,
    - v1 no-`MCP-Session-Id` decision,
    - GET/SSE behavior,
    - notifications `202` no-body,
    - DELETE authenticated `405`,
    - protocol-vs-tool execution error classification.
- `requirements-doc.md`
  - Added `REQ-MCP-019` and `AC-MCP-015`.
- `investigation-notes.md`
  - Added architecture review and official protocol recheck source-log rows.
  - Updated backend endpoint contract notes with v1 route/auth/session/protocol conclusions.

Key v1 decisions:

- `OPTIONS` is the only unauthenticated route path.
- Every non-OPTIONS request validates Origin, bearer auth, app session, token hash, expiry/revocation, and protocol/content expectations before method dispatch.
- V1 does not emit MCP transport `MCP-Session-Id`; incoming values are ignored for identity.
- `DELETE` validates auth/session then returns `405`; app-session revocation remains run/member lifecycle-owned.

## AR-002 Secret-bearing descriptor lifecycle

Status: addressed in revised design.

Updated artifacts:

- `design-spec.md`
  - Added `Secret-Bearing Descriptor Policy` under DS-009.
  - Marked `AgentToolMcpDescriptor` as runtime-only/secret-bearing because it carries `headers.Authorization`.
  - Added `RedactedAgentToolMcpDescriptor` and `redactAgentToolMcpDescriptor(...)` expectation.
  - Added non-persistence/no-logging rules for raw descriptor, raw bearer token, raw materialized config, and secret-bearing URLs.
  - Added materializer cleanup/redaction rules for Claude Agent SDK, Claude Code CLI, Codex App Server, Antigravity CLI, and durable project configs.
- `requirements-doc.md`
  - Added `REQ-MCP-020` and `AC-MCP-016`.
- `investigation-notes.md`
  - Updated endpoint/security notes to classify the descriptor as secret-bearing and runtime-only.

Key v1 decisions:

- Registry stores token hash only; raw token is returned once through the secret descriptor.
- Raw descriptor must not be stored in run history, `AgentRunContext`, events, handoff artifacts, logs, or serialized platform state.
- Logs/events/debug views use redacted descriptor only.

## AR-003 Session lifetime / revocation / DELETE / restore semantics

Status: addressed in revised design.

Updated artifacts:

- `design-spec.md`
  - Expanded DS-008 with v1 session granularity and a session lifetime/revocation/restore policy table.
  - Added cleanup hook guidance and owner-based revocation APIs.
  - Rejected client DELETE as app-session revoke in the backward-compatibility rejection log.
- `requirements-doc.md`
  - Added `REQ-MCP-021` and `AC-MCP-017`.
  - Added assumptions for per-run/member session granularity, active turn end behavior, no v1 `MCP-Session-Id`, and authenticated DELETE no app revoke.
- `investigation-notes.md`
  - Updated security/capability notes and open coverage question for restored run/member simulation.

Key v1 decisions:

- `AgentToolMcpSession` is per external runtime run/member runtime session, not per tool call.
- Active turn end does not revoke by default.
- Normal run/member cleanup revokes owned sessions.
- Server restart clears memory sessions; restored runs/team members must create fresh sessions and rematerialize config.
- Expired/revoked/stale configs cannot list/call tools.

## Files updated in this rework

- `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/tickets/in-progress/streamable-mcp-runtime-tools/design-spec.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/tickets/in-progress/streamable-mcp-runtime-tools/requirements-doc.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/tickets/in-progress/streamable-mcp-runtime-tools/investigation-notes.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/tickets/in-progress/streamable-mcp-runtime-tools/design-rework-response-round-1.md`
