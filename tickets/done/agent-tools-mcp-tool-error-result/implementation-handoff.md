# Implementation Handoff

Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-tools-mcp-tool-error-result/tickets/in-progress/agent-tools-mcp-tool-error-result/` (paths below are relative to it unless absolute).
Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-tools-mcp-tool-error-result`, branch `fix/agent-tools-mcp-tool-error-result`, base `origin/personal` @ `1138e8fbef`. Code commit `253854bf8d`. Untracked SDK `dist/` folders are build outputs (not committed).

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: Architecture Design Complete, `Small` + `Low` → direct implementation, per `solution-designer-handoff.md`
- Requirements doc: `requirements-doc.md` (SR-001, Approved)
- Investigation notes: `investigation-notes.md`
- Solution revision record: `solution-revision-record.md`
- Design spec: `design-spec.md` (SR-001, Ready)
- Supplemental task artifacts: `evidence/repro-agy-revoked-mcp-tool.e2e.test.ts`, `evidence/SD-01-repro-base.log`, `evidence/SD-02-control-iserror-result.log`
- Design review report: `N/A — not applicable`
- Architecture review revision record: `N/A — not applicable`
- Triggering rework report: N/A (initial)

## Current Implementation Summary

`ConfiguredMcpRegistryToolAdapter.execute` no longer throws for a failed call:

- The tool is no longer available for the session at call time (missing, not MCP-origin, other server) → `isError` result: "Configured MCP tool '<name>' is no longer available for this session." `createTool` is not called.
- `createTool`/`execute` throws → `isError` result with `error.message` (non-Error: `String(error)`).
- Success and the tool's own `isError` results → unchanged (`normalizeConfiguredMcpToolResult`).

The result keeps the adapter's `mcp_tool_result` kind (`toAgentToolMcpToolResult`). The dispatcher is unchanged; it now sends a JSON-RPC success carrying the tool result. The executor maps `isError` to `onToolComplete({ accepted: false })` (`agent-tool-mcp-tool-executor.ts:116`), as the design's E-04 says.

- Implementation cycle: `Initial`
- Implementation revision record: `implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: `SR-001`
- Related architecture-review / code-review / API/E2E / delivery revision IDs: `N/A`
- Triggering finding IDs: `N/A`

## Routing Classification (Mandatory)

- Task size: `Small`
- Architecture risk: `Low`
- Design classification section / evidence reference: `design-spec.md` "Task Size And Architectural Risk"
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale: one adapter method, one new unit test file, one e2e file extended. No contract shape beyond the MCP tool result the sibling adapters already return. No persistence or deployment change.
- Selected route: `Direct API/E2E`
- Lightweight implementation self-review completed for the direct route: `Yes` (below)
- New design impact or escalation trigger: `None` yet. The live Codex/Claude handling of `isError` (U-01) is unverified here (gated live runs, left to API/E2E).

### Lightweight self-review

- The failure translation stays in the adapter; the dispatcher doesn't inspect tool kinds (the design's forbidden shape is avoided).
- No redaction or logging added. The text is the native path's message, and the e2e asserts that no `test-dummy` value appears on the agent wire.
- No version handling for older runtimes (DESIGN.md rule 9).
- The removed `throw` for "no longer available" has no other reader. The integration routes test (unavailable/unconfigured cases) still passes, because the catalog filters unavailable adapters before `execute`.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | External-runtime call failure → `isError` result with the reason | DS-001: runtime MCP client → Agent Tools MCP route → `AgentToolsMcpMethodDispatcher.dispatchToolsCall` → `AgentToolMcpToolExecutor` → **`ConfiguredMcpRegistryToolAdapter.execute` (catch → `toolFailure`)** → JSON-RPC success → client | AGY revoked e2e passes (failed on base, IMP-00); unit AC-003 passes |
| BEH-002 | Native path unchanged | not touched | Native revoked case kept, now one entry of the per-runtime loop with unchanged assertions (gate `RUN_LMSTUDIO_E2E` not run here) |
| BEH-003 | No credentials in the text | adapter forwards the existing message | e2e `not.toContain(DUMMY)`, `not.toContain(tok.marker)` |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

- `autobyteus-server-ts/src/agent-tools/mcp/configured-mcp/configured-mcp-registry-tool-adapter.ts`
- `autobyteus-server-ts/tests/unit/agent-tools/mcp/configured-mcp/configured-mcp-registry-tool-adapter.test.ts` (new; 6 cases)
- `autobyteus-server-ts/tests/e2e/runtime/mcp-http-auth-agent-tool-call.e2e.test.ts`: the revoked case now loops over every runtime (AGY prompt `CALL_TOOLS:`, others the live prompt). For AGY/Codex/Claude it also asserts no `ERROR` and `TURN_COMPLETED`, and the header is updated (the stale "Native only… Internal error (FU-001)" sentence is removed). Evidence summary files are now `<runtime>-revoked.json`.

## Important Assumptions

- The remote MCP server's own body text is not redacted (R-01, out of scope as the requirements say).

## Known Risks

- U-01: live Codex/Claude presentation of an `isError` result. The revoked cases exist under `RUN_CODEX_E2E` / `RUN_CLAUDE_E2E` but did not run here.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: `Bug Fix`
- Reviewed root-cause classification: `Local Implementation Defect`
- Reviewed refactor decision: `No Refactor Needed`
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files removed: `Yes` (the unused `currentDefinition` binding is gone; the stale e2e header sentence is replaced)
- Dead code found elsewhere, added to `follow-ups.md`: None
- Shared structures remain tight: `Yes`
- Canonical shared design guidance was reapplied: `Yes`
- Changed source files within size guardrails: `Yes` (adapter ~70 lines)

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected`; followed; no deviation.

## Environment Or Dependency Notes

- The scripted AGY CLI is `tests/fixtures/agy-failure-cli.mjs` (`AGY_FAKE_CASE=linked_skills`, set by the test).

## Checks Run

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-00 | Reproduction, adapter fix stashed, then with fix | base adapter `1138e8fbef` / fix | macOS, Node 22, scripted AGY | AGY → Agent Tools MCP → adapter | AC-001 | Fail on base, pass with fix | `evidence/IMP-00-repro-on-base.log` | `== BASE … Tests  1 failed (1)` / `== FIX … Tests  1 passed (1)` |
| IMP-01 | `RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/mcp-http-auth-agent-tool-call.e2e.test.ts --no-watch --reporter=verbose` | `253854bf8d` | macOS, Node 22, scripted AGY; other gates unset | real studio server, two auth MCP servers, AGY via Agent Tools MCP | AC-001; AC-004 (AGY credential case) | Pass (2 run, 6 skipped by gate) | `evidence/IMP-01-e2e-mcp-http-auth-agy.log` | `✓ … agy: after the server revokes the token…`; `Tests  2 passed \| 6 skipped (8)` |
| IMP-02 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-tools --no-watch` (+ adapter file verbose) | `253854bf8d` | macOS, Node 22 | all Agent Tools units incl. other providers | AC-003, AC-004 | Pass | `evidence/IMP-02-unit-agent-tools.log` | `Tests  6 passed (6)`; `Test Files  46 passed (46)`, `Tests  372 passed (372)` |
| IMP-03 | `env -i … pnpm -C autobyteus-server-ts exec vitest run tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts --no-watch` | `253854bf8d` | macOS, Node 22 | MCP route/dispatcher with a fake configured tool | AC-004 | Pass | `evidence/IMP-03-integration-agent-tools-mcp-routes.log` | `Tests  10 passed (10)` |
| IMP-04 | `pnpm -C autobyteus-server-ts typecheck` | `253854bf8d` | macOS, Node 22 | server `src` | AC-004 | Pass | `evidence/IMP-04-server-typecheck.log` | `exit=0` |

- Not run, and why: AC-002 is the live Codex (`RUN_CODEX_E2E=1`) and Claude (`RUN_CLAUDE_E2E=1`) revoked and credential cases. They need signed-in CLIs, a real HOME/USER/LOGNAME and paid model use, so they are left to API/E2E as live executable validation. The native case (`RUN_LMSTUDIO_E2E=1`) needs a local LM Studio model. Both are AC-004 regressions for the native path.

## Frontend Rendered-Result Check (When Applicable)

`Not Applicable`: server-only change.

## Downstream Coverage Hints / Suggested Scenarios

- AC-002: `RUN_CODEX_E2E=1` and `RUN_CLAUDE_E2E=1`, with the real HOME/USER/LOGNAME, on the same e2e file (header has the gates). Expect, on both revoked cases, `HTTP 401 Unauthorized: Error POSTing to endpoint: unauthorized` on the wire, no `test-dummy`, `TURN_COMPLETED` and no `ERROR`. If a live runtime mishandles `isError` → Design Impact (design escalation trigger). A skip counts as not run.
- Optional: `RUN_LMSTUDIO_E2E=1` for the native cases (unchanged path).

## API / E2E / Executable Coverage Investigation And Execution Still Required

- AC-002 live runs; the AC-004 native gate if available.
