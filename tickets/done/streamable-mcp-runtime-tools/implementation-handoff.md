# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/tickets/in-progress/streamable-mcp-runtime-tools/requirements-doc.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/tickets/in-progress/streamable-mcp-runtime-tools/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/tickets/in-progress/streamable-mcp-runtime-tools/design-spec.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/tickets/in-progress/streamable-mcp-runtime-tools/design-review-report.md`
- Code review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/tickets/in-progress/streamable-mcp-runtime-tools/code-review-report.md`

## Code Review Local Fix Response

- CR-001 fixed: all requests to `/mcp/agent-tools/:sessionId` now pass through an early MCP request gate before Fastify can emit its default not-found response for unsupported methods.
- The route now registers with `mcpApp.all(...)` for Fastify-supported methods, and the early gate also catches methods outside Fastify's route-supported set, such as `CONNECT`.
- Unsupported non-OPTIONS methods now follow `Origin -> bearer auth -> registry session resolve -> 405` ordering. Missing auth returns `401`, bad credentials return redacted `404 session_unavailable`, and valid auth/session returns `405`.
- Added regression coverage using `CONNECT` to prove missing auth returns `401`, wrong token returns redacted `404`, valid auth/session returns `405`, and no default `Route METHOD:/mcp/agent-tools/... not found` body or session path is exposed.

## What Changed

Implemented the v1 AutoByteus Agent Tools MCP Server surface for `send_message_to`:

- Added an in-memory `AgentToolMcpSession` subsystem with cryptographic session IDs, bearer token generation, token-hash-only storage, TTL expiry, explicit revoke, owner-based revoke, and descriptor redaction.
- Added the canonical secret-bearing `AgentToolMcpDescriptor` shape for runtime materializers and a non-secret `RedactedAgentToolMcpDescriptor` view.
- Added MCP catalog/schema/provider seams. V1 `tools/list` is produced through a `send_message_to` definition provider reading the existing server-owned send-message contract/schema, not runtime wrapper introspection.
- Added an MCP tool executor that delegates `send_message_to` to `SendMessageToDispatcher` and exposes a small observer hook for start/complete/error projection.
- Added a Streamable HTTP Fastify route at `/mcp/agent-tools/:sessionId` with the DS-007 auth/protocol/content/status matrix: POST JSON-RPC, GET SSE compatibility, authenticated DELETE 405, unauthenticated OPTIONS-only CORS path, no v1 `MCP-Session-Id`, unknown/unconfigured tools as JSON-RPC `-32602`, and malformed/invalid envelope handling.
- Added a dedicated MCP HTTP request gate that owns origin, OPTIONS, auth/session-before-unsupported-method, CORS headers, and HTTP error response shaping for the route.
- Registered the MCP route in `buildApp()` before global CORS so the MCP-specific OPTIONS/origin gate runs before `@fastify/cors` preflight handling.
- Added run/member cleanup integration by revoking owner sessions from `AgentRunManager.unregisterActiveRun()` and `MixedAgentMemberHandle.dispose()`.
- Added focused unit/integration coverage for session/descriptor/token handling, `send_message_to` executor delegation, route matrix behavior, and no raw token exposure through redacted descriptors/error paths.

## Key Files Or Areas

- Added `autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-session.ts`
- Added `autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-session-registry.ts`
- Added `autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-session-service.ts`
- Added `autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-catalog.ts`
- Added `autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-definition-provider.ts`
- Added `autobyteus-server-ts/src/agent-tools/mcp/providers/send-message-to-mcp-definition-provider.ts`
- Added `autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-tool-executor.ts`
- Added `autobyteus-server-ts/src/agent-tools/mcp/agent-tools-mcp-method-dispatcher.ts`
- Added `autobyteus-server-ts/src/agent-tools/mcp/agent-tools-mcp-result-mapper.ts`
- Added `autobyteus-server-ts/src/agent-tools/mcp/agent-tools-mcp-schema-mapper.ts`
- Added `autobyteus-server-ts/src/agent-tools/mcp/agent-tools-mcp-http-gate.ts`
- Added `autobyteus-server-ts/src/agent-tools/mcp/agent-tools-mcp-routes.ts`
- Modified `autobyteus-server-ts/src/server-runtime.ts`
- Modified `autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts`
- Modified `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-agent-member-handle.ts`
- Added `autobyteus-server-ts/tests/unit/agent-tools/mcp/agent-tool-mcp-session-service.test.ts`
- Added `autobyteus-server-ts/tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts`

## Important Assumptions

- Production runtime materializers for AGY, Claude Code CLI, Codex App Server, and Claude Agent SDK remain deferred; this implementation provides the canonical descriptor/service boundary they must consume.
- V1 remains memory-only. Server restart clears sessions; restored external runtimes must create fresh sessions and rematerialize config.
- V1 does not emit MCP transport `MCP-Session-Id`; incoming values are ignored for identity, and DELETE is authenticated `405` without app-session revocation.
- GET SSE is a compatibility response for observed clients. Current tool results are returned through POST JSON-RPC; broad streaming/resumability remains out of scope.

## Known Risks

- Manual Streamable HTTP implementation still needs downstream compatibility validation against the official MCP SDK client and target clients.
- The GET SSE path currently returns a short compatibility stream response rather than a durable server-push channel. This matches current request/response tool posture but should be verified with real clients.
- Runtime materializers must preserve the secret-handling rules when added; AGY workspace `.agents/mcp_config.json` remains the highest-risk future token-bearing artifact.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Feature plus enabling infrastructure and targeted refactor.
- Reviewed root-cause classification: Boundary/ownership issue plus duplicated policy/coordination risk.
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): Refactor Needed Now for route/session/catalog/redaction and `send_message_to` adapter; future materializers and non-send-message tool adapters deferred.
- Implementation matched the reviewed assessment (`Yes`/`No`): Yes.
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): N/A.
- Evidence / notes: The route remains protocol/session-only; the new HTTP gate owns only route-level origin/CORS/auth/session/method response gating; `send_message_to` execution goes through `AgentToolMcpToolExecutor -> SendMessageToDispatcher`; catalog definitions come from server-owned contract/schema; runtime materializers consume only the descriptor/service boundary when added later. CR-001 was a local route-gate coverage defect and was fixed without changing the reviewed design.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes`
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): `Yes`
- Notes: New MCP implementation files are all under 220 effective non-empty lines after the CR-001 gate split (`agent-tools-mcp-routes.ts` 147; `agent-tools-mcp-http-gate.ts` 117; `agent-tools-mcp-method-dispatcher.ts` 197). Existing modified source files remain under 500 effective non-empty lines and changed only narrowly.

## Environment Or Dependency Notes

- Ran `pnpm install --frozen-lockfile` to restore workspace dependencies in this worktree; lockfile was unchanged.
- No new runtime dependencies were added.

## Local Implementation Checks Run

Implementation-scoped checks only; the first three were rerun after the CR-001 local fix:

- `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-tools/mcp/agent-tool-mcp-session-service.test.ts tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts --no-watch` — passed (`2` files, `10` tests).
- `pnpm -C autobyteus-server-ts run build` — passed, including shared package builds, Prisma client generation, `tsc -p tsconfig.build.json`, managed messaging asset copy, and built-in agents bootstrap smoke check.
- `git diff --check` — passed.
- Attempted `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.json --noEmit`; it fails on the current repository `tsconfig.json` because `include: ["src", "tests"]` conflicts with `rootDir: "src"` for existing test files. The build script's `tsconfig.build.json` check passed and is the usable implementation compile check.

## Downstream Coverage Hints / Suggested Scenarios

- Exercise the full DS-007 route matrix through API/E2E or broader executable coverage, including with an official MCP SDK Streamable HTTP client.
- Verify real-client behavior for Codex App Server / Claude Code-style initialize, GET SSE, resources probes, tools/list, DELETE, and tools/call sequences.
- Add/verify lifecycle coverage for run cleanup, mixed-member deactivation, TTL expiry, stale descriptor use, and restored run/member rematerialization once production materializers exist.
- Verify no raw bearer token or full secret descriptor appears in logs/events/debug surfaces or runtime materializer artifacts.
- When future browser/media/task-delegation/publish-artifacts adapters are added, require definition provider + executor adapter + owning service/dispatcher coverage before exposing them.

## API / E2E / Executable Coverage Investigation And Execution Still Required

Required. This handoff includes implementation-scoped unit/integration confidence only. API/E2E engineer still owns coverage investigation, any durable coverage expansion, real client compatibility checks, environment setup, and final executable classification.
