# Handoff Summary: agent-tools-mcp-tool-error-result (autobyteus-232)

- Status: verified from the evidence, archived and finalized on `personal`. No release. The final repository state is in `release-deployment-report.md`.
- Classification: `task_size=Small`, `architectural_risk=Low`, route Direct Low-Risk. Architecture review, code review and test-code review: `N/A — not applicable`.
- Revisions: SR-001 / IR-001 / API-REV-001 / DR-001.
- Worktree (removed after finalization): `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-tools-mcp-tool-error-result`, branch `fix/agent-tools-mcp-tool-error-result`.

## What Changed

- Problem: when a configured (remote or stdio) MCP tool failed, for example after a revoked token, agents on AGY, Codex and Claude got JSON-RPC `-32603 Internal error` from the run's Agent Tools MCP endpoint. Scripted AGY ended the turn with `AGY_TURN_ERROR "Internal error"`. The native runtime already showed `HTTP 401 Unauthorized: …`.
- Fix (`253854bf8d`): `ConfiguredMcpRegistryToolAdapter.execute` returns a failed call as a tool result, with `isError: true` and one text item holding the failure message. The same applies when the tool is no longer available at call time. Protocol errors, other adapters and the native path are unchanged.
- Tests: new unit test `autobyteus-server-ts/tests/unit/agent-tools/mcp/configured-mcp/configured-mcp-registry-tool-adapter.test.ts` (6 cases). `tests/e2e/runtime/mcp-http-auth-agent-tool-call.e2e.test.ts` now has a revoked-token case for each runtime, asserting the status text, no credential on the wire, and no `ERROR` / a `TURN_COMPLETED` for external runtimes.
- Docs (delivery): `autobyteus-server-ts/docs/modules/agent_tools_mcp_server.md` and `mcp_server_management.md`.

## Integration

- Method: merge. `origin/personal` @ `ea817b2431` (autobyteus-290 node vocabulary incl. agent-tools renames, autobyteus-253, autobyteus-265, beta bumps) merged into the ticket branch as `7df5b0a3f3`, with no conflicts. The base touched none of the three changed files. `pnpm install --frozen-lockfile` was run for the base's lockfile change.
- Post-integration checks on `7df5b0a3f3`:
  - DEL-01: `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-tools --no-watch` → 46 files / 372 tests passed.
  - DEL-02: clean-env `vitest run tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts` → 10 passed.
  - DEL-03: `pnpm -C autobyteus-server-ts typecheck` → exit 0.
  - DEL-04: clean-env `RUN_AGY_FAILURE_E2E=1` e2e → `Tests 2 passed | 6 skipped (8)`. Both AGY cases (credentials, and revoked token) pass, with the same assertions as API-05.
- Live Codex/Claude and the LM Studio native cases were not rerun after integration. The base did not change the adapter, the e2e file or the runtimes' MCP client paths. DEL-04 drives the same integrated endpoint, dispatcher and adapter. A rerun would spend the user's paid model sign-ins again for no new coverage.

## Verification From Evidence

- AC-001: proven. API-05's `agy-revoked.json` shows `statusInToolResult: true`, `dummyValueOnAgentWire: false`, remote requests only `initialize` with a refused credential, events ending in `TURN_COMPLETED`, and no `ERROR`. IMP-00 fails on base and passes with the fix. DEL-04 reran it on the integrated state.
- AC-002: proven. API-05's Codex and Claude `*-revoked.json` show `TOOL_EXECUTION_FAILED` then `TURN_COMPLETED`, no `ERROR`, `statusInToolResult: true` and no dummy value. Codex's events carry the agent's reply text `HTTP 401 Unauthorized: Error POSTing to endpoint: unautho…`. The test asserts the text over the whole wire.
- AC-003: proven by IMP-02 (adapter unit 6/6) and DEL-01.
- AC-004: proven. IMP-02/03/04 and DEL-01…03 pass. All four credential cases pass in API-05. The native revoked case is unchanged (`ERROR` with the same text, as on base).
- API/E2E final confidence: 97%, every category ≥ 95%. No user check is needed; no acceptance criterion requires one.

## Notes

- Cosmetic: the change wrote `export const resolveExecutionAgentId =(session` (missing space) in `configured-mcp-registry-tool-adapter.ts`. No lint or behavior impact, so it was accepted as is rather than spending a rework round on a space.
- Residual R-01 (text a remote server puts in its own response body) is out of scope, as in the requirements. The "tool gone at call time" race is proven by the unit test only.
- Follow-ups: none.

## Release

- Decision: no release, the RELEASE.md default (the Task asks for "finalized on personal"). A beta or stable release is available on request.
