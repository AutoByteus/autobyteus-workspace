# Handoff — Architecture Design Complete

- Package: `agy-empty-mcp-config-activation`
- Result: `Architecture Design Complete`
- Current SR: `SR-002`
- Classification: `task_size=Small`, `architectural_risk=Low` (rationale in design-spec.md §Task Size And Architectural Risk)
- Route applied: get_handoff_rules → Small/Low rule → `/implementation_engineer` (direct implementation; architecture review N/A — not applicable)
- Approval: Requirements SR-001 approved by user 2026-09-25 ("continue" after the presentation, plus the original "if it's our code issue, you have to fix it"). OD-001 (better error surfacing) is excluded.

## Original Request

The user's Software Development Department org on the `antigravity_cli` runtime shows "Failed to prepare agent run 'product_prototyper_8128…'" for every message. They asked for investigation and a fix if the cause is our code.

## Root Cause (confirmed)

`~/.gemini/config/mcp_config.json` is 0 bytes (created by AGY tooling on 2026-08-08). `checkCollision` in `autobyteus-server-ts/src/agent-execution/backends/antigravity/capsule/agy-mcp-config-materializer.ts` runs `JSON.parse` on it → `SyntaxError: Unexpected end of JSON input` → activation aborts. `agy` 1.2.11 itself treats empty and whitespace-only files as "No MCP servers configured" and rejects malformed JSON (probed).

## Workspace

- Worktree: `/Users/normy/autobyteus-org/autobyteus-workspace-agy-empty-mcp-config`
- Branch: `codex/agy-empty-mcp-config-activation`
- Base: `origin/personal` @ `a2694ed453e353550d8b345fa82ef489634dcaf2`
- Finalization target: `origin/personal`

## Artifacts (absolute paths)

- Requirements (Approved): `/Users/normy/autobyteus-org/autobyteus-workspace-agy-empty-mcp-config/tickets/in-progress/agy-empty-mcp-config-activation/requirements-doc.md`
- Investigation notes: `/Users/normy/autobyteus-org/autobyteus-workspace-agy-empty-mcp-config/tickets/in-progress/agy-empty-mcp-config-activation/investigation-notes.md`
- Design spec (Ready): `/Users/normy/autobyteus-org/autobyteus-workspace-agy-empty-mcp-config/tickets/in-progress/agy-empty-mcp-config-activation/design-spec.md`
- Solution revision record: `/Users/normy/autobyteus-org/autobyteus-workspace-agy-empty-mcp-config/tickets/in-progress/agy-empty-mcp-config-activation/solution-revision-record.md`
- Architecture review artifacts: N/A — not applicable (direct route)
- Supplements: None

## Expected Output

- In `checkCollision`, treat trim-empty content as "no servers" (REQ-001). Keep ENOENT, malformed-JSON and name-collision behavior unchanged (REQ-002). Never modify user config files (REQ-003).
- Unit tests for AC-001..AC-004 in `tests/unit/agent-execution/backends/antigravity/agy-run-capsule.test.ts`, including one global-path case with the home directory isolated. Prefer isolating the home directory for all descriptor-bearing tests: the developer machine's real 0-byte global file currently leaks into them.
- AC-005 (real environment) is for delivery/user verification. Leave the user's 0-byte file as is.

## Open Risks / Notes

- OD-001 (generic UI error hides the real cause, which only reaches `~/.autobyteus/logs/app.log`) is deferred and can become a separate ticket.
- U-001: unrelated earlier `codex_*` ACTIVATION_FAILED entries were not investigated.
- Escalate to Solution Designer with Design Impact if AGY startup still fails after the guard passes.
