# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/tickets/server-configured-mcp-runtime-materialization/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/tickets/server-configured-mcp-runtime-materialization/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/tickets/server-configured-mcp-runtime-materialization/design-spec.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/tickets/server-configured-mcp-runtime-materialization/design-review-report.md`

## What Changed

Implemented configured MCP-origin tool exposure through the existing run-scoped `autobyteus_agent_tools` MCP boundary for Codex and Claude provider runtimes.

- Added configured MCP source snapshots with redaction-safe `{ kind, registeredToolName, mcpServerId }` state on Agent Tools MCP sessions.
- Added registry-backed configured MCP source resolution under `agent-tools/mcp/configured-mcp/`.
- Extended `AgentToolMcpCatalog` so session exposure, `tools/list`, and `tools/call` include selected MCP-origin registry tools alongside built-in adapters.
- Added a configured MCP registry adapter that creates/executes the selected registry tool and delegates transport/remote-name semantics to the existing `GenericMcpTool` / MCP proxy path.
- Refactored Agent Tools MCP adapter execution into a typed result union so raw MCP tool results are preserved instead of flattened through `AgentOperationResult`.
- Updated result mapping and observer completion semantics for raw MCP `isError` results.
- Fixed Claude's pre-session tooling gate so configured MCP-only tool selections still create/use an Agent Tools MCP descriptor and enter `allowedTools`.

## Key Files Or Areas

- `autobyteus-server-ts/src/agent-tools/mcp/configured-mcp/configured-mcp-agent-tool-source.ts`
- `autobyteus-server-ts/src/agent-tools/mcp/configured-mcp/configured-mcp-agent-tool-source-resolver.ts`
- `autobyteus-server-ts/src/agent-tools/mcp/configured-mcp/configured-mcp-registry-tool-adapter.ts`
- `autobyteus-server-ts/src/agent-tools/mcp/configured-mcp/configured-mcp-tool-result-normalizer.ts`
- `autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-catalog.ts`
- `autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-session*.ts`
- `autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-adapter.ts`
- `autobyteus-server-ts/src/agent-tools/mcp/agent-tools-mcp-result-mapper.ts`
- `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session*.ts`
- Focused tests under `autobyteus-server-ts/tests/unit/agent-tools/mcp/`, `tests/integration/agent-tools/mcp/`, and Claude/Codex Agent Tools MCP materializer/session tests.

## Important Assumptions

- Selected configured MCP tools are represented by registered tool names in `agentDefinition.toolNames`.
- `ToolOrigin.MCP` plus `metadata.mcp_server_id` remains the authoritative registry signal for configured MCP-origin tools.
- Remote MCP tool name mapping remains private to the registry-created `GenericMcpTool` / `McpToolFactory` path.

## Known Risks

- Direct provider-native external MCP materialization remains intentionally out of scope.
- `tools/list` skips stale configured MCP snapshots when registry definitions no longer validate; `tools/call` fails closed with `unknown_tool` before remote execution.
- The existing `autobyteus-server-ts` `tsconfig.json` direct typecheck command still includes tests outside `rootDir`; use `tsconfig.build.json` for implementation source typecheck in this repo state.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Larger Requirement / Feature
- Reviewed root-cause classification: Boundary Or Ownership Issue with Shared Structure Looseness
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): Refactor Needed Now
- Implementation matched the reviewed assessment (`Yes`/`No`): Yes
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): N/A
- Evidence / notes: The implementation keeps provider code descriptor-driven, adds the configured MCP bridge inside Agent Tools MCP, validates registry state at call availability/adapter execution, and preserves raw MCP tool result shape via a typed execution result union.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes`
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): `Yes`
- Notes: `claude-session.ts` is 494 effective non-empty lines after a small local gate fix; no source implementation file exceeds 500 effective non-empty lines.

## Environment Or Dependency Notes

- No dependency changes.
- No direct reads of persisted MCP config files or provider-local materialization of external MCP server configs were added.
- Existing unrelated `open-tab` regression-ticket files were not touched; current modified files are scoped to this ticket and its artifacts/tests.

## Local Implementation Checks Run

- Passed: `cd /Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/autobyteus-server-ts && pnpm exec tsc -p tsconfig.build.json --noEmit`
- Passed: `cd /Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/autobyteus-server-ts && pnpm exec vitest run tests/unit/agent-tools/mcp/agent-tool-mcp-catalog.test.ts tests/unit/agent-tools/mcp/agent-tool-mcp-session-service.test.ts tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts tests/unit/agent-execution/backends/claude/session/claude-session-tool-gating.test.ts tests/unit/agent-execution/backends/codex/agent-tools-mcp/codex-agent-tools-mcp-materializer.test.ts tests/unit/agent-execution/backends/claude/agent-tools-mcp/claude-agent-tools-mcp-materializer.test.ts tests/unit/agent-execution/backends/claude/session/build-claude-session-mcp-servers.test.ts`
- Informational/blocked by existing repo config: `pnpm exec tsc -p tsconfig.json --noEmit` fails because existing `tsconfig.json` includes `tests` while `rootDir` is `src`; this is unrelated to the implementation changes.

## Downstream Coverage Hints / Suggested Scenarios

- Verify a selected MCP-origin registered tool appears in `autobyteus_agent_tools` `tools/list` for Codex/Claude sessions.
- Verify prefixed registered names (for example `db_query`) are exposed while execution still delegates through `GenericMcpTool` to the remote unprefixed tool.
- Verify stale registry changes after session creation fail closed.
- Verify raw MCP results with `content`, `isError`, `structuredContent`, and `_meta` preserve shape in JSON-RPC `tools/call` responses.
- Verify Claude MCP-only configured tools create a descriptor and allowed tool aliases.

## API / E2E / Executable Coverage Investigation And Execution Still Required

Yes. API/E2E coverage investigation and broader executable validation remain owned by `api_e2e_engineer` after code review.
