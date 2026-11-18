# Solution Designer Handoff: autobyteus-232 (agent-tools-mcp-tool-error-result)

- Result: `Architecture Design Complete`, `task_size=Small`, `architectural_risk=Low` → direct implementation route
- Package: `agent-tools-mcp-tool-error-result`, Project Task `autobyteus-232`, SR-001
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`) for the user
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-tools-mcp-tool-error-result`, branch `fix/agent-tools-mcp-tool-error-result`, base `origin/personal` @ `1138e8fbef`; finalization target `origin/personal`; no release unless the user asks
- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-tools-mcp-tool-error-result/tickets/in-progress/agent-tools-mcp-tool-error-result/`
- Approval: requirements approved by the Solution Designer within the Task's direction; user informed (2026-10-24)

## Original request (summary)

Return a configured MCP tool's failure to Agent Tools MCP callers (AGY, Codex, Claude) as an `isError` tool result carrying the failure text (credential-free: no tokens, headers or URLs with secrets), instead of JSON-RPC `Internal error`. Then extend the revoked-token case in `mcp-http-auth-agent-tool-call.e2e.test.ts` to the scripted AGY runtime. Done when an agent on each external runtime sees the real, credential-free reason, the revoked-token e2e passes on scripted AGY, and the work is finalized on personal.

## Finding

- Reproduced on scripted AGY (`evidence/SD-01-repro-base.log`): the turn ends `AGY_TURN_ERROR "Internal error"`.
- Cause: `ConfiguredMcpRegistryToolAdapter.execute` lets the tool failure throw. The dispatcher turns any throw into JSON-RPC `-32603 Internal error`. The browser and media adapters already return error results instead.
- Control (`evidence/SD-02-control-iserror-result.log`): returning the caught error as an `isError` result makes the AGY agent read `HTTP 401 Unauthorized: Error POSTing to endpoint: unauthorized`, with no token on the wire.

## Design (see design-spec.md)

The adapter returns an `isError` result with the failure message for a failed call, and for the "no longer available" race. Add a unit test for the adapter. In the e2e, add a revoked-token case for each enabled runtime (scripted AGY mandatory; Codex/Claude live under their gates, both CLIs installed on this machine) and update its header. No redaction layer: the text is the native runtime's existing credential-free message (the autobyteus-179/223 contract); the tests assert no token.

## Validation expectations

AC-001 (AGY scripted e2e), AC-002 (Codex/Claude live, gated; a skip is recorded as not run), AC-003 (unit), AC-004 (existing suites).

## Follow-ups

None.

## Route

Handoff rule "Architecture Design Complete with task_size=Small or Medium and architectural_risk=Low" → `/software_engineering_team/implementation_engineer` (2026-10-24).
