# Handoff Summary — server-configured-mcp-runtime-materialization

## Status

- Delivery status: Finalized directly on `codex/streamable-mcp-runtime-tools` after explicit user verification.
- User verification: User reported on 2026-06-16, "i have tested. its working. lets finalize the ticket. since its based on the streamable-mcp-runtime-tools branch directly. lets finalizae directly on this branch."
- Branch/worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools` on `codex/streamable-mcp-runtime-tools`.
- Finalization target: same branch, `origin/codex/streamable-mcp-runtime-tools`.
- Latest tracked remote checked before finalization: `origin/codex/streamable-mcp-runtime-tools` at `ca16a9ca788772343a985ff925e28ad036a321ba`; local branch matched upstream before final commit.
- Integration method: Already current after `git fetch --all --prune`; no merge/rebase was required.
- Ticket archived to: `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/tickets/done/server-configured-mcp-runtime-materialization/`.

## Implemented Behavior Summary

Configured MCP-origin tools selected on an agent definition now materialize for Codex App Server and Claude Agent SDK through the existing run-scoped `autobyteus_agent_tools` Streamable HTTP MCP route.

Key properties:

- The selected tool identity is the registered AutoByteus tool name, including any configured prefix such as `db_query`.
- Provider runtimes do not receive direct raw external MCP server config copies.
- The Agent Tools MCP catalog resolves eligible configured MCP-origin tools from the shared registry using `ToolOrigin.MCP` and `metadata.mcp_server_id`.
- Execution delegates through the registry-created configured MCP tool and existing MCP proxy path.
- Built-in Agent Tools MCP adapter families continue to coexist in the same session.
- Collisions/stale registry state fail closed.
- Raw MCP result fields (`content`, `isError`, `structuredContent`, `_meta`) are preserved for configured MCP-origin calls.
- Capability tokens, headers, session URLs, configured MCP env/header secrets, and provider wire names remain out of application-facing events/history/memory.

## Long-Lived Docs Updated

- `autobyteus-server-ts/docs/modules/agent_tools_mcp_server.md`
- `autobyteus-server-ts/docs/modules/agent_tools.md`
- `autobyteus-server-ts/docs/modules/mcp_server_management.md`
- `autobyteus-server-ts/docs/modules/codex_integration.md`
- `autobyteus-server-ts/docs/modules/agent_execution.md`
- `autobyteus-web/docs/tools_and_mcp.md`

Docs sync report: `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/tickets/done/server-configured-mcp-runtime-materialization/docs-sync-report.md`.

## Verification Checks

Delivery and finalization checks:

- `git fetch --all --prune` — Passed before delivery and again before finalization.
- `git diff --check` — Passed before docs edits, after docs/artifact edits, and during finalization.
- `cd autobyteus-server-ts && pnpm exec tsc -p tsconfig.build.json --noEmit` — Passed before docs edits, after docs edits, and during finalization.
- `NO_TIMESTAMP=1 APPLE_TEAM_ID= pnpm build:electron:mac` from `autobyteus-web` — Passed; produced local test artifacts in `autobyteus-web/electron-dist/`.

Previously passed upstream checks retained as evidence:

- Code review reran `git diff --check` — Passed.
- Code review reran `pnpm exec tsc -p tsconfig.build.json --noEmit` — Passed.
- Code review reran focused Vitest matrix: 8 files, 58 tests passed.
- API/E2E execution report passed focused coverage including official MCP SDK client route exercise and provider materializer/session unit coverage.

## Residual Notes / Risks

- Real external MCP transport and live Codex/Claude provider-process execution were not launched in the focused API/E2E suite. Route behavior was exercised with the official MCP SDK client; provider materializer/session policy was covered by focused tests.
- External configured MCP transport was represented by deterministic fake `ToolOrigin.MCP` registry/tool fixtures in durable route/session coverage. Existing env-gated real MCP config tests remain available separately.

## Cumulative Artifact Package

- Requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/tickets/done/server-configured-mcp-runtime-materialization/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/tickets/done/server-configured-mcp-runtime-materialization/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/tickets/done/server-configured-mcp-runtime-materialization/design-spec.md`
- Supporting analysis summary: `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/tickets/done/server-configured-mcp-runtime-materialization/analysis-summary.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/tickets/done/server-configured-mcp-runtime-materialization/design-review-report.md`
- Implementation handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/tickets/done/server-configured-mcp-runtime-materialization/implementation-handoff.md`
- Code review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/tickets/done/server-configured-mcp-runtime-materialization/code-review-report.md`
- Coverage investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/tickets/done/server-configured-mcp-runtime-materialization/api-e2e-coverage-investigation.md`
- Execution coverage report: `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/tickets/done/server-configured-mcp-runtime-materialization/api-e2e-execution-coverage-report.md`
- Docs sync report: `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/tickets/done/server-configured-mcp-runtime-materialization/docs-sync-report.md`
- Delivery/release/deployment report: `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/tickets/done/server-configured-mcp-runtime-materialization/release-deployment-report.md`
