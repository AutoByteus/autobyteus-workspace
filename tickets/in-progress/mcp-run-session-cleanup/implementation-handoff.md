# Implementation Handoff — mcp-run-session-cleanup

- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/mcp-run-session-cleanup/tickets/in-progress/mcp-run-session-cleanup/`
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/mcp-run-session-cleanup`, branch `codex/mcp-run-session-cleanup`, base `origin/personal` @ `fc93276e6f`
- Implementation commit: `a8b849af79`. Ticket artifacts and evidence follow in the next commit; its hash is in the handoff message.

## Upstream Artifact Package

- Handoff-rule result: Small / Low, direct route. My `get_handoff_rules` result: direct API/E2E.
- Requirements doc: `requirements-doc.md` (SR-001)
- Investigation notes: `investigation-notes.md`
- Solution revision record: `solution-revision-record.md`
- Design spec: `design-spec.md` (SR-001)
- Supplemental artifacts: none. The real test server is from autobyteus-189.
- Design review report / architecture review revision record: `N/A — not applicable`
- Triggering rework: N/A (initial)

## Current Implementation Summary

- Implementation cycle: `Initial`
- Implementation revision record: `implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: `SR-001`
- Related ARCH-REV / CRR / API-REV / DR: `N/A`
- Triggering finding IDs: `N/A`

What now happens:

- **When a run is released**, `AgentRunResourceManager.release(runId, run)` starts `mcpServerInstances.cleanupMcpServerInstancesForAgent(runId)`. Every run removal goes through `release()`.
  - It runs once per run (the `mcpServersReleased` flag), right after the run's Agent Tools sessions are deactivated, and is **not awaited**.
  - The flag is set before the call, so a `failed` release that is later retried does not close twice.
  - A rejected promise or a synchronous throw is caught and warned: `Closing the MCP server instances of agent run '<runId>' failed: <error>`. It never changes the release result.
  - The existing flag `mcpReleased` is now `mcpSessionsReleased`, next to the new `mcpServersReleased`, so the two MCP resources are clearly named.
- **The dependency** is `mcpServerInstances: Pick<McpServerInstanceManager, "cleanupMcpServerInstancesForAgent">`. It is required, so neither composition can omit it.
  - Both compositions pass `McpServerInstanceManager.getInstance()`: `general-process-run-supervisor.ts` and `application-execution-scope-kernel-builder.ts`.
  - Every test construction passes a no-op closer.
- **`McpServerInstanceManager.cleanupMcpServerInstancesForAgent(agentId)`**:
  1. takes the agent's map and deletes it at once;
  2. closes all its instances with `Promise.allSettled`;
  3. warns for each failed close: `Closing MCP server '<serverId>' for agent '<agentId>' failed: <error>`.

  A `getServerInstance` call during the close creates new instances. Errors were silently ignored before.
- **`cleanupAllMcpServerInstances` is removed.** No product caller existed. Its three test users now clean up exactly what they open:
  - the registrar integration test cleans up `'agent-1'`;
  - the gateway routes integration test cleans up `MCP_GATEWAY_EXECUTION_SCOPE_ID`;
  - the config-service integration test opened only self-closing discovery sessions, so its call was dropped.
- **Docs:** a new "Server Instance Lifetime" section in `autobyteus-server-ts/docs/modules/mcp_server_management.md`.
- **Unchanged:** the gateway's shared scope (DEC-004), `managedDiscoverySession`, and the native shutdown step (DEC-005; both cleanups are idempotent).

## Routing Classification (Mandatory)

- Task size: `Small`. Architecture risk: `Low`.
- Design classification section: `design-spec.md` → "Task Size And Architectural Risk"
- Classification confirmed or changed: `Confirmed`
- Evidence, checked against the escalation triggers:
  - **Every run-removal path calls `release()`.** In `agent-run-activation-registry.ts`, `removeIfCurrent`, `releasePrepared` and `releaseRuntimeAttachments` all call `resourceManager.release`. A run going offline is discovered as inactive and removed the same way.
  - **One path skips `release()`:** `agent-run-activation-operation.ts` calls its own `deactivateMcp()` when activation fails **before an AgentRun or its attachments exist**. No run has been published there, so no Agent Tools session can make an MCP call under that `runId`. The only instances possible are a native agent's bootstrap prewarm, which its own shutdown step closes (DEC-005). This is not a removal of a run, and it is recorded here as an observation.
  - **Instance keys:** every runtime keys instances by the AgentRun `runId`, as the e2e proves for AGY through the Agent Tools endpoint.
- Selected route: `Direct API/E2E`
- Lightweight implementation self-review completed: `Yes`
- New design impact or escalation trigger: `None`

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001/002 | A run's MCP instances close on release, on every end path, without delaying release | `AgentRunResourceManager.release` → `closeMcpServerInstances` → `McpServerInstanceManager.cleanupMcpServerInstancesForAgent` → `StdioManagedMcpServer.close` | IMP-07 (green after IMP-00 red): termination, delete, idle shutdown. IMP-08: AGY matrix cell. Unit: AC-001, AC-007 |
| BEH-003 | Wake right after termination gets new working instances | Detach before close in `cleanupMcpServerInstancesForAgent` | Core unit (pending close; new instance); IMP-07 wake case (new pid, old gone) |
| BEH-004 | Other runs and the gateway are unaffected | Per-agent map; gateway scope untouched | Core unit (`agent_b` unchanged); IMP-07 pair case (B alive and working; gateway call works) |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

- `autobyteus-ts/src/tools/mcp/server-instance-manager.ts`
- `autobyteus-server-ts/src/agent-execution/services/agent-run-resource-manager.ts`
- `autobyteus-server-ts/src/agent-execution/runtime/general-process-run-supervisor.ts`
- `autobyteus-server-ts/src/application-platform/execution/application-execution-scope-kernel-builder.ts`
- `autobyteus-server-ts/docs/modules/mcp_server_management.md`
- Tests:
  - `autobyteus-ts/tests/unit/tools/mcp/server-instance-manager.test.ts`
  - `autobyteus-server-ts/tests/unit/agent-execution/agent-run-resource-manager.test.ts`
  - `autobyteus-server-ts/tests/e2e/runtime/mcp-run-session-cleanup.e2e.test.ts` (new)
  - `autobyteus-server-ts/tests/e2e/runtime/mcp-runtime-tool-matrix.e2e.test.ts` (each cell now terminates its run and requires the stdio pid gone within 10 s; the pid comes from `MCP_TEST_SERVER_PID_FILE`)
  - the three former `cleanupAll` users
  - nine test constructions given a no-op closer

## Important Assumptions

- The stdio pid file holds the latest started server process. The e2e reads it right after each run's first call, waits for a changed value whenever it expects a new process, and does the gateway call last, because the gateway's shared instance also writes the file.

## Known Risks

- A tool call still in flight when its run is terminated fails as its server closes. This is accepted, since the run is ending (design Risks).
- The close is asynchronous, so a process may outlive its release briefly. Here it was gone within about 0.1–0.8 s (QR-001 bound: 10 s).

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Bug Fix (resource leak)
- Reviewed root-cause classification: Missing Invariant
- Reviewed refactor decision: `No Refactor Needed`
- Implementation matched: `Yes`. The existing owner of run removal gained the missing resource.
- If challenged, routed as `Design Impact`: `N/A`

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead code in touched files removed: `Yes`. `cleanupAllMcpServerInstances` (grep: no caller in `src` of either package).
- Dead code found elsewhere: none
- Shared structures remain tight: `Yes`. The two MCP flags have distinct names and meanings.
- Size guardrails: `Yes`. `agent-run-resource-manager.ts` is 175 lines, `server-instance-manager.ts` is 120.

## Persisted Data Transition Check

`Not Affected` (in-memory only).

## Environment Or Dependency Notes

- In the fresh worktree:
  - `pnpm install --frozen-lockfile`;
  - `pnpm -C autobyteus-server-ts prebuild`;
  - `pnpm -C autobyteus-server-ts prepare:shared`.
- Server tests resolve `autobyteus-ts` from source (tsconfig paths), so the red and green runs needed no core rebuild.

## Checks Run

Evidence is in `tickets/in-progress/mcp-run-session-cleanup/evidence/`. Every log has a header with the command, commit, environment and date. Environment: macOS 26, node v22.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-00 | `env -i PATH HOME=<temp> TMPDIR RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>/agy-failure-cli.mjs pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/mcp-run-session-cleanup.e2e.test.ts --no-watch` | `fc93276e6f` (base source) + the new e2e | clean env, scripted AGY | base release path | AC-002, AC-004, AC-005, AC-006 (red proof) | Fail (expected) | `IMP-00-e2e-cleanup-red-on-base.log` | `Tests  5 failed (5)`; each failure at its process assertion: terminate/delete/pair/idle `exitsWithin(...)` false (lines 168, 176, 197, 226); wake `Timed out: a new stdio server pid` (the old process was reused) |
| IMP-01 | `pnpm -C autobyteus-ts exec vitest run tests/unit` | `a8b849af79` | local | core incl. the new detach and logging tests | AC-005 (core), REQ-002 | Pass | `IMP-01-core-unit.log` | `Tests  2049 passed (2049)` |
| IMP-02 | `env -i … pnpm -C autobyteus-ts exec vitest run tests/integration/tools/mcp` | `a8b849af79` | clean env, uv | registrar test's new cleanup | — | Pass | `IMP-02-core-integration-mcp.log` | `Tests  22 passed \| 1 skipped (23)` |
| IMP-03 | `pnpm -C autobyteus-ts build` | `a8b849af79` | local | core | — | Pass | `IMP-03-core-build.log` | exit 0 |
| IMP-04 | `pnpm -C autobyteus-server-ts typecheck` | `a8b849af79` | local | server src (required dependency wired in both compositions) | — | Pass | `IMP-04-server-typecheck.log` | exit 0 |
| IMP-05 | `pnpm -C autobyteus-server-ts test:unit` | `a8b849af79` | isolated env | server units incl. the resource manager | AC-001, AC-007 | Pass | `IMP-05-server-unit.log` | `Tests  6086 passed \| 7 skipped (6093)` |
| IMP-06 | `test:integration:prepare` then `test:integration` | `a8b849af79` | isolated env | server integration incl. gateway routes | BEH-004 | Pass | `IMP-06a-…`, `IMP-06-server-integration.log` | `Tests  419 passed \| 70 skipped (489)` |
| IMP-07 | as IMP-00 | `a8b849af79` | clean env, scripted AGY | the fix end to end | AC-002, AC-004, AC-005, AC-006, QR-001 | Pass | `IMP-07-e2e-mcp-run-session-cleanup.log` | `Tests  5 passed (5)`: terminate 824 ms, delete 789 ms, wake 1423 ms, pair 1852 ms, idle shutdown 61008 ms |
| IMP-08 | `env -i … RUN_AGY_FAILURE_E2E=1 … MCP_MATRIX_E2E_EVIDENCE_DIR=<evidence>/matrix-observations vitest run tests/e2e/runtime/mcp-runtime-tool-matrix.e2e.test.ts` | `a8b849af79` | clean env, scripted AGY | the matrix with the termination check | AC-003 (AGY) | Pass (AGY; the live runtimes are gated off) | `IMP-08-…log`, `matrix-observations/agy.json` | `"stdioProcessGoneAfterTermination": true` |
| IMP-09 | the 179 e2e `mcp-http-auth-remote-server` + `mcp-http-auth-agent-tool-call` (AGY gate) | `a8b849af79` | clean env | MCP credential paths unchanged | preserved | Pass | `IMP-09-e2e-mcp-http-auth.log` | `Tests  3 passed \| 3 skipped (6)` |
| AC-005 (repo) | `git status --short`; `ps` for fixture processes after all runs | `a8b849af79` | local | — | — | Pass | (this row) | only the ticket folder untracked; no fixture processes |

- Not run, and why:
  - AC-003 on the live runtimes (native via LM Studio, Claude, Codex, Grok): gated, uses models or paid plans; for API/E2E.
  - AC-008 isolated-app child-process count with a copied user-kind `uv` server: API/E2E per the design.
  - The full server e2e (`pnpm test:e2e`): for API/E2E.

## Frontend Rendered-Result Check

`Not Applicable`: no frontend change.

## Downstream Coverage Hints / Suggested Scenarios

- AC-003: rerun the matrix with `RUN_LMSTUDIO_E2E=1`, `RUN_CLAUDE_E2E=1`, `RUN_CODEX_E2E=1` or `RUN_CODEX_MCP_E2E=1`, and `RUN_GROK_E2E=1` where available. Each cell now asserts `stdioProcessGoneAfterTermination`.
  - The native cell is the interesting one: both the native shutdown step and the release close run, and both are idempotent.
- AC-008: an isolated app of this worktree build, with a copied `pptx-mcp` (list only).
  1. Record the baseline child-process count.
  2. Run two runs on two runtimes that list or call the server.
  3. Stop both.
  4. The count should be back to the baseline before the app stops.
- Optionally, a team or org root with members using a stdio tool: terminating the root releases each member run. That exercises the same `release()` path through team and org removal.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- AC-003 on the live runtimes, AC-008, the full server e2e, and independent confirmation of AC-002 and AC-004–AC-006 (reuse IMP-07 while the code is unchanged).
