# Handoff Summary — mcp-run-session-cleanup

## Ticket

- Package: `mcp-run-session-cleanup`; Project Task `autobyteus-193`
- Classification: `task_size=Small`, `architectural_risk=Low`; route: direct low-risk (architecture, source and test-code review `Not Applicable`)
- Revisions: SR-001, IR-001, API-REV-001 (Pass, 95.1%), DR-001
- Archived ticket folder: `tickets/done/mcp-run-session-cleanup/` on `personal` (worktree removed after finalization)

## What Changed

- `AgentRunResourceManager.release(runId)`, the single path every run ending goes through, now also starts `McpServerInstanceManager.cleanupMcpServerInstancesForAgent(runId)`:
  - once per run;
  - not awaited, so it never delays or fails the release;
  - a failed close is logged with the run id.

  This covers native, Claude, Codex, AGY and Grok, which all key instances by `runId`.
- `cleanupMcpServerInstancesForAgent` detaches the run's instances before closing them, so a run woken during the close gets new ones. It closes them in parallel and logs per-server failures. The unused `cleanupAllMcpServerInstances` was removed.
- The gateway's shared instances (`mcp-gateway/default`), preview and discovery are unchanged.
- Tests:
  - unit tests for the release step and the detach order;
  - new `tests/e2e/runtime/mcp-run-session-cleanup.e2e.test.ts` (scripted AGY gate; red on base): terminate, delete, wake, two runs plus the gateway, idle shutdown of a delegated copy;
  - the 181 matrix suite now requires the stdio pid gone after each cell's termination.
- Docs:
  - `mcp_server_management.md` "Server Instance Lifetime" (fix);
  - release-step sentences in `agent_execution.md` and `agent_tools_mcp_server.md` (delivery).

## Integration

- Merge of `origin/personal` @ `b5e4dd6cdc` (search-model-settings and its records, 51 non-ticket files in embeddings, projects, GraphQL and web) → `98365d815d`. No conflicts and no overlapping files.
- Checks, all Pass:
  - DR-01: core build, server typecheck and build;
  - DR-02: full server unit suite, 6116 passed;
  - DR-03: cleanup e2e, 5/5;
  - DR-04: matrix AGY cell with `stdioProcessGoneAfterTermination: true`, and core MCP unit tests, 75/75.

## Verification

- Judged from the evidence; no user check needed. Details in `release-deployment-report.md`.

## Release

- `No release` (RELEASE.md default; not requested). The fix is user-visible, and the Task says it ships with the next release. `release-notes.md` is ready, and a beta (`v1.5.7-beta.2`) can be cut on request.

## Follow-ups

- AC-003's Grok cell was not run: Grok's plan returned 429 `subscription:free-usage-exhausted`. Grok uses the same release path and Agent Tools endpoint as the proven runtimes. Codex was covered through its MCP client (model usage limited until 25 Oct).
- O-2 (pre-existing): a server e2e test writes `autobyteus-server-ts/workspaces.json` during `pnpm test:e2e`.
- O-3 (pre-existing): the Electron build leaves `autobyteus-server-ts/autobyteus-web/resources/server/node_modules`.
- O-4: an activation that fails before an AgentRun exists uses `deactivateMcp()`, not `release()`. No run is published, so no instances can open under that id.
