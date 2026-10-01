# Solution Handoff — Architecture Design Complete

- Package identifier: `agy-mcp-tool-call-presentation`
- Result classification: `Architecture Design Complete`
- Current solution revision: `SR-002`
- Classification: `task_size=Small`, `architectural_risk=Low`
- Route applied (from `get_handoff_rules`, 2026-09-30): Small/Medium + Low → direct implementation, recipient `/implementation_engineer`. Independent architecture review: `N/A — not applicable` (direct route; this skips independent review, not design).

## Original request

In Antigravity (AGY) runs, MCP tool calls appear in the Activity panel as `call_mcp_tool` with wrapper arguments `{Arguments, ServerName, ToolName}`. The user wants them unwrapped and mapped to normal platform tool calls so the frontend shows the real tool name, its arguments and its result, as other runtimes do.

## Goals

- AutoByteus agent tools called by AGY show under their bare canonical name (`delegate_task`, `send_message_to`) with only their own arguments.
- Tools on other MCP servers show as `mcp__<server>__<tool>`.
- The result keeps `{provider_state, output}`; JSON object/array output text becomes structured JSON in `output`.
- An unusable wrapper (missing server or tool name) falls back to today's `call_mcp_tool` presentation.
- Native AGY tools and native image handling are unchanged. Old stored runs are not relabelled.

## Approval basis

Requirements `Approved` by the user in conversation on 2026-09-30, accepting the Solution Designer's suggestions for DEC-001..005 ("I agree, for the old history runs, leave them alone. No need to update."). No behavior-defining supplements. Product Design: `N/A — not applicable`.

## Workspace

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-mcp-tool-call-presentation`
- Branch: `codex/agy-mcp-tool-call-presentation`
- Base: `origin/personal` @ `5c6fb95ea1c841938326f75d83f6689680df70e6`
- Finalization target: `origin/personal`
- Ticket documents are untracked in the worktree (not committed).

## Artifacts (absolute paths)

- Requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-mcp-tool-call-presentation/tickets/in-progress/agy-mcp-tool-call-presentation/requirements-doc.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-mcp-tool-call-presentation/tickets/in-progress/agy-mcp-tool-call-presentation/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-mcp-tool-call-presentation/tickets/in-progress/agy-mcp-tool-call-presentation/design-spec.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-mcp-tool-call-presentation/tickets/in-progress/agy-mcp-tool-call-presentation/solution-revision-record.md`
- Evidence supplement (not behavior-defining): `.../agy-mcp-call-shape-probe.py` and `.../agy-mcp-call-shape-probe/` (`stdout.jsonl`, `summary.json`, `mcp-server-messages.jsonl`) — raw AGY 1.2.14 stream for nested arguments, JSON output and an MCP error; use as unit-test fixtures.
- Architecture review artifacts: `N/A — not applicable`.

## Scope for implementation

Files, per `design-spec.md` "Target Subsystem / Folder / File Mapping":

- Add `autobyteus-server-ts/src/agent-execution/backends/antigravity/stream/agy-mcp-tool-call.ts`
- Modify `autobyteus-server-ts/src/agent-execution/backends/antigravity/stream/agy-stream-event-converter.ts`
- Add `autobyteus-server-ts/tests/unit/agent-execution/backends/antigravity/agy-mcp-tool-call.test.ts`
- Modify `autobyteus-server-ts/tests/unit/agent-execution/backends/antigravity/agy-stream-event-converter.test.ts`
- Modify `autobyteus-server-ts/tests/e2e/runtime/agy-team-inter-agent-roundtrip.e2e.test.ts` (assertions near lines 496, 519, 873)
- Modify `autobyteus-server-ts/docs/modules/antigravity_cli_runtime.md`

No frontend, processor, history or shared MCP helper changes. If one seems necessary, return a Design Impact.

## Constraints to keep in view

- Decide native image handling from the provider tool name before projection (AC-007).
- Same name and arguments on start and terminal events (REQ-006).
- Keep the `{provider_state, output}` result shape; trace sequencing and history replay read it.

## Evidence and open risks

- Provider wrapper shape verified live on AGY 1.2.14 and against 1.2.10 evidence; it is undocumented (RSK-001), mitigated by the fallback.
- The live AGY e2e test needs the local AGY CLI and model quota; it was not run during design.
- Scenarios: SCN-001..SCN-004 in the requirements document.

## Expected output

Implementation per the design with implementation-scoped checks, then the implementation handoff along the team's configured route.
