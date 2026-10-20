# Handoff — mcp-sdk-v2-migration, SR-003: Architecture Design Complete

- Status: **Architecture Design Complete**; `task_size=Medium`, `architectural_risk=High`
- Package: `mcp-sdk-v2-migration`; Project Task `autobyteus-182` (FU-9 of `autobyteus-175`)
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`)
- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/mcp-sdk-v2-migration/tickets/in-progress/mcp-sdk-v2-migration/`
- Workspace: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/mcp-sdk-v2-migration`, branch `codex/mcp-sdk-v2-migration`, base `origin/personal` @ `dc530fdcb0` (fetched 2026-10-20). Finalization target `origin/personal`. No product code changed; the ticket documents are uncommitted in the worktree.

## Original request

Move from `@modelcontextprotocol/sdk` v1.x (maintenance line: spec ≤ 2025-11-25, fixes until ≥ 2027-01-27) to the v2 packages (`@modelcontextprotocol/client` 2.3.1) per the official upgrade guide. Investigation and design first; the user approves the plan (what changes, risk, order relative to OAuth). Also: remove the dead `ClaudeSdkClient.createMcpServer()` (O-002); low priority, a same-host http→https redirect test. Done when both packages run on the v2 client with stdio, streamable HTTP with authentication, tools list and call working; tests rerun; merged; a beta; the user's check.

## Approval basis

- `requirements-doc.md` at SR-002, approved by **the user** on 2026-10-20 in the Solution Designer conversation. His words are quoted in the doc.
- DEC-001: do it now, before OAuth (FU-3).
- DEC-002: keep the 2025 handshake (`legacy` negotiation, the SDK default), **with the user's condition (REQ-013/AC-012)**: if validation shows a server that works on 1.32.1 but fails on v2 because of the protocol era, that is a defect of this ticket and the client must adopt the needed negotiation.
- Decided by the Solution Designer: DEC-003 (accept v2 error wording), DEC-004 (all-pages tool listing), DEC-005 (test servers on v2), DEC-006 (no direct v1 dependency; v1 stays only as the Claude Agent SDK's peer), DEC-007 (no http→https test: needs ports 80/443 and a trusted certificate), DEC-008 (O-002 here), DEC-009 (keep `requestInit.headers`, no `authProvider`).

## What the design does

- **Client.** Three files in `autobyteus-ts/src/tools/mcp/server/` switch to `@modelcontextprotocol/client` and `/stdio`. `callTool` options move to the second argument; the v1 three-argument shape would silently drop the 6-minute timeout and the signal. No negotiation, redirect, fetch or auth options are set.
- **Manifests.** `autobyteus-ts` deps get `client` 2.3.1; its devDeps get `server` 2.3.1 and `node` 2.1.1. `autobyteus-server-ts` drops the v1 dependency; its devDeps get `client`, `server`, `node` and `core`.
- **Dead code.** O-002 is removed from `claude-sdk-client.ts`, together with its live-test case.
- **Tests.** 14 test files and fixtures move to v2. New cases:
  - AC-005: a paged `tools/list` returns all tools.
  - AC-006: one server start per stdio connect, and the HTTP handshake starts with `initialize` with no `server/discover`.
  - AC-007: a v2 client in `auto` mode works against the Agent Tools endpoint and `/mcp/gateway`.
- **Docs.** `mcp_server_management.md` and `agent_execution.md`.
- **Validation.** Before/after parity, as the user required in autobyteus-181: real servers (including published v1- and v2-based ones), the token HTTP server, exit and hang servers, the gateway, the runtime matrix, and packaged isolated apps.

## Evidence

- `investigation-notes.md`: Source Log, probes, Architecture Investigation Findings.
- `probes/` with `probe-output.txt`:
  - the v2 client works against v1 servers (stdio env/cwd; HTTP header on every request);
  - it works against published `server-filesystem` 2026.8.31 (v1) and 2.0.0 (v2);
  - `auto` mode starts a stdio server twice;
  - our endpoint shape (`-32601` for `server/discover`) falls back correctly;
  - the v2 test-server shapes work.

## Risks and open items

- R-002: the packaged app could miss a v2 dependency.
- R-003: v2 could be stricter with some real server.
- Both are settled only by the packaged before/after run. Their escalation triggers are in the design spec.
- Follow-ups (not sent yet; they go to the requester when the ticket leaves the team): FU-001 (opt into 2026-07-28 negotiation), FU-002 (show the HTTP status in remote MCP errors).

## Route record

- 2026-10-20: `get_handoff_rules` returned 3 rules. The matching rule is "Architecture Design Complete with task_size=Large or architectural_risk=High … ready for independent architecture review" → `/software_engineering_team/architecture_reviewer`.
- Expected next action: independent architecture review of `design-spec.md` against the approved requirements.
