# Implementation Handoff

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: direct implementation route (Small + Low); independent architecture review not selected. `get_handoff_rules` (2026-09-30) returns `/api_e2e_engineer` for a completed Small/Medium + Low implementation.
- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-mcp-tool-call-presentation/tickets/in-progress/agy-mcp-tool-call-presentation/requirements-doc.md` (Approved, SR-002)
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-mcp-tool-call-presentation/tickets/in-progress/agy-mcp-tool-call-presentation/investigation-notes.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-mcp-tool-call-presentation/tickets/in-progress/agy-mcp-tool-call-presentation/solution-revision-record.md`
- Design spec (required on every route): `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-mcp-tool-call-presentation/tickets/in-progress/agy-mcp-tool-call-presentation/design-spec.md`
- Supplemental task artifacts: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-mcp-tool-call-presentation/tickets/in-progress/agy-mcp-tool-call-presentation/solution-handoff.md`; evidence only: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-mcp-tool-call-presentation/tickets/in-progress/agy-mcp-tool-call-presentation/agy-mcp-call-shape-probe.py`, `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-mcp-tool-call-presentation/tickets/in-progress/agy-mcp-tool-call-presentation/agy-mcp-call-shape-probe/`
- Design review report: `N/A — not applicable`
- Architecture review revision record: `N/A — not applicable`
- Triggering rework report, revision record, or evidence, when applicable: N/A

## Current Implementation Summary

AGY `call_mcp_tool` steps with a non-blank `ServerName` and `ToolName` are now emitted by `AgyStreamEventConverter` as the real tool: the bare `ToolName` for the `autobyteus_agent_tools` server, `mcp__<ServerName>__<ToolName>` for any other server, with `Arguments` as the event arguments (`{}` when absent or not an object). For those calls, output text that parses to a JSON object or array becomes structured JSON in `result.output`; the `{provider_state, output}` shape is kept. Any other step, including a wrapper missing either name, is emitted as before.

Committed on `codex/agy-mcp-tool-call-presentation` as `34b310118` (base `5c6fb95ea`). Ticket documents remain untracked, as received.

- Implementation cycle: `Initial`
- Implementation revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-mcp-tool-call-presentation/tickets/in-progress/agy-mcp-tool-call-presentation/implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: `SR-002`
- Related architecture-review revision IDs: `N/A`
- Related code-review revision IDs: `N/A`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: `N/A`

## Routing Classification (Mandatory)

- Task size (`Small`/`Medium`/`Large`): `Small`
- Architecture risk (`Low`/`High`): `Low`
- Design classification section / evidence reference: `design-spec.md` → "Task Size And Architectural Risk"
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale for confirmation or change: one new 33-line source file, a 13-line change in one converter method, unit tests, three e2e assertion sites and one doc paragraph. No event schema, processor, history, frontend or shared MCP helper change was needed.
- Selected route (`Direct API/E2E`/`Code Review`/`Solution Designer`): `Direct API/E2E`
- Lightweight implementation self-review completed for the direct route: `Yes`
- New design impact or escalation trigger: `None`

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | AutoByteus agent tool shown under bare name, own arguments, JSON output structured | `AgyStreamEventConverter.tool()` → `projectAgyMcpToolCall` / `projectAgyMcpToolOutput` (`stream/agy-mcp-tool-call.ts`) | Implemented; unit-tested for `delegate_task`, `send_message_to`, empty arguments (AC-001, 002, 004, 008) |
| BEH-002 | Third-party tool shown as `mcp__<server>__<tool>` | Same | Implemented; unit-tested with the probe's `shape-test` / `echo_args` shape (AC-003) |
| BEH-003 | Native tool presentation preserved | Same method, non-projected branch | Unchanged; existing fixture tests pass, plus a `view_file` test with JSON-looking output left as text |
| BEH-004 | Failure/denial under the real name; unusable wrapper falls back | Same; the projected `common` payload is reused by the failed/denied event | Implemented; unit-tested with the probe's ERROR shape, a denial, and missing/blank names (AC-005, 006) |
| BEH-005 | Native image handling only for the native tool | `nativeImage` is taken from the provider tool name before projection | Preserved; unit-tested with an `autobyteus_agent_tools` `generate_image` call (resolver not called) (AC-007) |
| BEH-006 | Old runs keep their stored presentation | No replay or history code changed | Preserved by not touching it; not exercised locally |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

All under `autobyteus-server-ts/`:

- `src/agent-execution/backends/antigravity/stream/agy-mcp-tool-call.ts` (added)
- `src/agent-execution/backends/antigravity/stream/agy-stream-event-converter.ts` (`tool()` only)
- `tests/unit/agent-execution/backends/antigravity/agy-mcp-tool-call.test.ts` (added)
- `tests/unit/agent-execution/backends/antigravity/agy-stream-event-converter.test.ts` (new `MCP calls` describe block; existing tests untouched)
- `tests/e2e/runtime/agy-team-inter-agent-roundtrip.e2e.test.ts` (assertion sites near lines 496, 515, 869)
- `docs/modules/antigravity_cli_runtime.md` (one paragraph in "Tools, permissions, and events")

## Important Assumptions

- Unit fixtures are written inline from the probe's `summary.json` shapes rather than read from the ticket folder, so they do not break when the ticket folder moves from `in-progress` to `done`.
- The `delegate_task` result fixture (`{"target_agent_run_id": ...}`) follows the design spec's example; it was not captured from a live AGY run.

## Known Risks

- RSK-001 (undocumented wrapper shape) stands; the fallback covers a missing name only.
- `tests/e2e/runtime/agy-native-image-app-chat.e2e.test.ts:182` asserts that no tool started as `call_mcp_tool`, as a guard that the native image tool was used. With this change a well-formed MCP call no longer carries that name, so the guard can no longer catch an MCP `generate_image` call. The file is outside the design's file list and I did not change it. The same test's other assertions on the native result are unaffected. For API/E2E to weigh.
- The three updated e2e assertion sites were not run (live AGY CLI and model quota needed).

## Task Design Health Assessment Implementation Check

- Reviewed change posture: `Behavior Change`
- Reviewed root-cause classification: `No Design Issue Found`
- Reviewed refactor decision: `No Refactor Needed`
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes: the converter was the only translation point; no consumer needed a change.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No` (the unusable-wrapper fallback is REQ-004 behavior)
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes`
- Shared structures remain tight: `Yes`
- Canonical shared design guidance was reapplied during implementation: `Yes`
- Changed source implementation files stayed within size-pressure guardrails: `Yes` (converter 198 non-empty lines, new file 33)
- Notes: prompt text in the e2e test that tells the model to use `call_mcp_tool` is kept, per the design's removal plan.

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Directly Usable — No Migration`
- Design-spec decision reference: "Persisted Data / State Transition Decision"
- Implementation follows the approved decision without an unapproved migration or version-specific runtime fallback: `Yes`
- Direct-use evidence or discard/rebuild result, when applicable: no reader or writer changed; `result` keeps `{provider_state, output}`. Replay of an old stored run was not exercised.
- Migration implementation and focused checks: N/A
- Deviation from the reviewed transition decision: `None`

## Environment Or Dependency Notes

- The worktree had no dependencies. I ran `pnpm install --frozen-lockfile --prefer-offline` at the worktree root and `prisma generate` in `autobyteus-server-ts`.
- Running the server `typecheck` script built `autobyteus-application-backend-sdk/dist/` and `autobyteus-application-sdk-contracts/dist/`. They show as untracked and are not part of the commit.

## Local Implementation Checks Run

Run from the worktree, per `TESTING.md` (server tests, one file/folder via `pnpm -C autobyteus-server-ts exec vitest run <path> --no-watch`):

- `agy-mcp-tool-call.test.ts` and `agy-stream-event-converter.test.ts`: 63 of 63 passed (21 + 42).
- `tests/unit/agent-execution/backends/antigravity` after `prisma generate`: covered by the wider run below. Before `prisma generate`, `agy-mcp-team-live.test.ts` failed to load for lack of the generated Prisma client.
- `tests/unit/agent-execution`: 983 passed, 5 failed, 5 skipped. `tests/unit/agent-memory` + `tests/unit/run-history`: 264 passed, 14 failed.
- The 19 failures are in six files unrelated to AGY (`agent-run-provisioning-service`, `codex-tool-log-correlation`, `agent-memory-location-service`, `team-memory-explorer-service`, `published-artifact-projection-service`, `team-run-history-catalog-service`). I re-ran those six files with my tracked changes stashed: the same 19 fail. I did not investigate their cause.
- `tsc -p tsconfig.build.json --noEmit` (source): passes.
- `pnpm -C autobyteus-server-ts typecheck` (`tsconfig.json`, includes tests): exits non-zero with 789 `TS6059` errors (test files outside `rootDir`) and no other error kind. I did not run it on the unmodified base, so I have not confirmed the count there; the error is a config one that applies to every test file.

Not run: any e2e test, any live AGY run, the web app.

## Frontend Rendered-Result Check (When Applicable)

`Not Applicable` — no frontend code changed. The Activity panel shows the new values through existing generic rendering; that was not rendered or inspected here (AC-001's "observed in the app" part is still open).

## Downstream Coverage Hints / Suggested Scenarios

- SCN-001 / AC-001, AC-002: live AGY Team run calling `send_message_to` and `delegate_task`; one Activity item per call titled with the bare name, arguments without the wrapper, structured JSON result. `agy-team-inter-agent-roundtrip.e2e.test.ts` now expects `send_message_to` with unwrapped arguments and rejects arguments that still contain `ServerName`/`ToolName`/`Arguments`.
- SCN-002 / AC-003: a third-party MCP server (the probe script sets one up as `shape-test`).
- SCN-003 / AC-005: a failing MCP tool (probe's `always_fails`).
- DEC-005: an AutoByteus media tool called through MCP from AGY should now be recognized as a generated-output tool and may add a Files entry.
- SCN-004: reopen an AGY run recorded before this change; items should still read `call_mcp_tool`.
- The `agy-native-image-app-chat` guard noted under Known Risks.

## API / E2E / Executable Coverage Investigation And Execution Still Required

All of it. No API, E2E or live-provider check was run during implementation.
