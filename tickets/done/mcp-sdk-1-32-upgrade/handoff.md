# Handoff — mcp-sdk-1-32-upgrade (SR-001): Architecture Design Complete

- Result: **Architecture Design Complete**, `task_size=Medium`, `architectural_risk=Low`
- Package: `mcp-sdk-1-32-upgrade`; Project Task `autobyteus-181` (FU-8 of `autobyteus-175`)
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), on the user's approval of 2026-10-19
- Workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/mcp-sdk-1-32-upgrade`, branch `codex/mcp-sdk-1-32-upgrade`, base `origin/personal` @ `436b85ce93f9013b1b1dca4dfa3b662a546fbbb0` (contains the autobyteus-179 merge); finalization target `origin/personal`
- Approval: requirements approved by the Solution Designer within the Task's direction (user informed 2026-10-19); no `Needs user` decision
- Artifacts (in `tickets/in-progress/mcp-sdk-1-32-upgrade/`): `requirements-doc.md`, `investigation-notes.md`, `design-spec.md`, `solution-revision-record.md`, this file
- Architecture review artifacts: `N/A — not applicable` (Medium / Low, direct route)

## Original request

Bump `@modelcontextprotocol/sdk` 1.30.0 → 1.32.1 in `autobyteus-ts` and `autobyteus-server-ts`, without setting `redirectPolicy: 'follow'`. Remove the dead loader fallbacks and `setSdkLoader` seams and use the SDK's real types. Decide WebSocket. Done when: lockfile updated, full suites rerun, the autobyteus-179 auth tests green, dead code gone, WebSocket decided; merged; next beta.

## Decisions (requirements-doc DEC-001..004)

- **Remove the WebSocket MCP transport.** The SDK transport takes only a URL, v2 has no WebSocket client, it is not an MCP spec transport, and the product neither offers nor persists it.
- Keep lazy loading, as typed `import()`.
- Keep the SDK's default `'same-origin'` redirect policy.
- Replace the mock tests with real-server tests.

## Verification intent

- AC-001…AC-009, including:
  - a redirect test that fails on 1.30.0 and passes on 1.32.1 (server B sees no request);
  - a real stdio fixture test for env/cwd;
  - the WebSocket rejection message;
  - the full rerun (shared foundation).
- API/E2E: the autobyteus-179 e2e (`mcp-http-auth-remote-server`, `mcp-http-auth-agent-tool-call`) on the new SDK, plus the scripted and available runtime suites.

## Constraints

Dummy values only; stay within the Change Scope (no server source changes, no Claude client cleanup, no v2 work).

## Open risks and follow-ups

- R-001: cross-origin-redirecting endpoints now fail (intended).
- R-002: the Claude Agent SDK peer (unused in-process MCP).
- O-002: `ClaudeSdkClient.createMcpServer` is dead.
- The external-toy integration tests could move to the new fixtures.

## Route Record
- 2026-10-19: `get_handoff_rules` matched "Architecture Design Complete with task_size=Small or Medium and architectural_risk=Low". Recipient: `/software_engineering_team/implementation_engineer` (direct implementation).
