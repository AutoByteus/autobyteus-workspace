# Delivery / Release / Deployment Report — mcp-run-session-cleanup

## Release / Publication / Deployment Scope

Repository finalization of `codex/mcp-run-session-cleanup` into `origin/personal`. No release, tag or deployment (Release Decision below). `task_size=Small`, `architectural_risk=Low`, direct low-risk route; review artifacts `Not Applicable`.

## Project Release Guide

- `RELEASE.md` at `origin/personal` @ `b5e4dd6cdc` (last changed in `c64a45b871`); deviations: `None`; proposed fixes: `None`

## Handoff Summary

- `tickets/done/mcp-run-session-cleanup/handoff-summary.md` (`Updated`); revision record `delivery-revision-record.md`, `DR-001`

## Initial Delivery Integration Refresh

- Bootstrap base: `origin/personal` @ `fc93276e6f`
- Latest base checked: `origin/personal` @ `b5e4dd6cdc` (fetched 2026-10-19). It had advanced by the search-model-settings merge (autobyteus-146) and its records, which touch 51 non-ticket files in embeddings, projects, GraphQL and web.
- Checkpoint commit: `Not needed` (validated state committed at `477152956c`)
- Integration method: `Merge` → `98365d815d`; no conflicts; no file changed on both sides
- Post-integration checks rerun: `Yes`, all Pass. The full server unit suite was included because the base changed server `src`.

| Check | Command | Result | Evidence |
| --- | --- | --- | --- |
| DR-01 | `pnpm -C autobyteus-ts build`; `pnpm -C autobyteus-server-ts typecheck`; `pnpm -C autobyteus-server-ts build` | Pass, no `error TS` (the removed `cleanupAllMcpServerInstances` has no callers) | `evidence/DR-01-integrated-builds-typecheck.log` |
| DR-02 | `pnpm -C autobyteus-server-ts test:unit` (clean env) | Pass: `Test Files 745 passed \| 4 skipped`, `Tests 6116 passed \| 7 skipped`, 0 failed files; `agent-run-resource-manager.test.ts (8 tests)` | `evidence/DR-02-integrated-server-unit.log` |
| DR-03 | `RUN_AGY_FAILURE_E2E=1 … vitest run tests/e2e/runtime/mcp-run-session-cleanup.e2e.test.ts` | Pass, 5/5: terminate 805 ms, delete 761 ms, wake 1399 ms, pair + gateway 1603 ms, idle shutdown 60987 ms | `evidence/DR-03-integrated-cleanup-e2e.log` |
| DR-04 | matrix AGY cell; `pnpm -C autobyteus-ts exec vitest run tests/unit/tools/mcp` | Pass: `stdioProcessGoneAfterTermination: true`, task DONE, HTTP `expected`; core MCP unit 75/75 | `evidence/DR-04-integrated-matrix-and-core-mcp-unit.log` |

- After the runs: no fixture process left; no stray `workspaces.json` (O-2 comes from `pnpm test:e2e`, which delivery did not rerun).
- Not repeated: the live runtimes, the full server e2e and the packaged-app process count (API-02..04). The base changed no MCP, agent-execution or runtime code. DR-02..04 cover the release path on the merged code.
- Delivery edits started only after the integrated state was current: `Yes`

## Verification

- Evidence judged: `Sufficient`. Sources: the execution report's Acceptance-Criteria Proof and Cases (95.1%, no category below 90%), the files below, and DR-01..04.

| Acceptance-Criteria ID | Cases And Files Checked | What You Saw | Judgement |
| --- | --- | --- | --- |
| AC-001 closer asked once; not on `already_released` | IMP-05; DR-02 | `agent-run-resource-manager.test.ts` passes (8 tests) | Proven |
| AC-002 pid gone after termination; red first | `API-01-cleanup-e2e.log`; `IMP-00-e2e-cleanup-red-on-base.log`; DR-03 | `✓ ends the run's stdio server process when the run is terminated 816ms`; on base `×` with `expect(await exitsWithin(run.pid, EXIT_BOUND_MS)).toBe(true)` | Proven |
| AC-003 per available runtime | `API-02-matrix-termination.log`; DR-04 | `stdioProcessGoneAfterTermination: true` for agy, codex-mcp-client, native, claude. Grok: 429 `subscription:free-usage-exhausted` after its calls succeeded | Proven for the available runtimes. Grok is reported not run with its reason, as AC-003 allows. It shares the release path and the Agent Tools endpoint with Claude, Codex and AGY |
| AC-004 delete; idle shutdown of a delegated copy | API-01; DR-03 | `✓ leaves no stdio server process once a terminated run is deleted`; `✓ ends a delegated copy's … after the idle grace period` | Proven |
| AC-005 wake gets a new working process | API-01; API-04; DR-03 | `✓ gives a run woken right after termination a new, working stdio server process`; packaged `"newProcess":true`, `toolSucceeded:true` | Proven |
| AC-006 other run and gateway unaffected | API-01; DR-03 | `✓ leaves another run's stdio server process and the gateway working when one run ends` | Proven |
| AC-007 throwing closer doesn't fail release | IMP-05, IMP-01 | unit tests pass; per-server and per-run warnings in source | Proven |
| AC-008 isolated app back to baseline | `API-04-isolated-app-process-count.txt` | `baseline total=6 mcp=0` → `both runs alive total=11 mcp=4` → `after terminating both runs total=6 mcp=0`; `mcpGoneMs 1078`; wake then terminate → `total=6 mcp=0`; `finalBackToBaseline: true` | Proven |
| QR-001 gone within 10 s | API-01, API-02, API-04 | under 1 s in-process; 1.08 s packaged | Proven |
| Regression | `API-03-server-e2e-full.log`; DR-02 | `89 passed \| 90 skipped`, 0 failed, `exit 0`; unit 6116 passed | Proven |

- More evidence requested: `None`; user check needed: `No`

## Release Decision

- Decision: `No release`
- Decided by: the `RELEASE.md` default; the user has not asked for a release of this ticket. The earlier "release a beta for the next version" was fulfilled by `v1.5.7-beta.1`. The fix is user-visible and the Task says it ships with the next release. `release-notes.md` is ready, and `v1.5.7-beta.2` is available on request.

## Docs Sync Result

- `docs-sync-report.md`: `Updated` (`agent_execution.md`, `agent_tools_mcp_server.md`; `mcp_server_management.md` from the fix, checked)

## Ticket State Transition

- Moved to `tickets/done/mcp-run-session-cleanup/`: `Yes`

## Version / Tag / Release Commit

- None.

## Release / Publication / Deployment

- Applicable: `No`; result: `Not required`; release notes archived for the next release

## Release Notes Summary

- `tickets/done/mcp-run-session-cleanup/release-notes.md` (`Updated`), for the next stable release; betas use generated notes

## Environment Or Persisted-Data Transition Notes

- Persisted data: `Not Affected`; delivery action: `None`

## Rollback Criteria

- If runs lose their MCP tools after a wake, or other runs' servers close unexpectedly, revert the merge on `personal` and cut the next release. No data is converted, so an earlier build works with the same data.

## Finalization Record

| Step | Result |
| --- | --- |
| Ticket archive | pending |

## Final Status

- pending
