# Handoff Summary — busy-quit-shutdown-orphan (autobyteus-284: bounded, awaited shutdown; Terminate stops now)

## Ticket

- Package: `busy-quit-shutdown-orphan`; Project Task `autobyteus-284` (step 0, prerequisite of restart-and-resume autobyteus-283/285).
- Classification: `task_size=Medium`, `architectural_risk=High`; route `Reviewed`.
- Gates: architecture review ARCH-REV-003 Pass; code review CRR-001 Pass, CRR-002 failure-origin (CR-001 Local Fix, F-API-002 → FU-008), CRR-003 Pass, CRR-004 test-code review Pass; API/E2E API-REV-002 Pass, final confidence 94.1% (every category ≥ 93%).
- Archived ticket folder: `tickets/done/busy-quit-shutdown-orphan/` on `personal`.

## What Changed

- **Terminate stops now (D1).** `AgentRunManager.terminateAgentRun` (user Terminate, an application's terminate, history delete/archive) and `stopAllAgentRuns` (server shutdown) first run the root-shutdown fence: interrupt the active turn, cancel queued input that has not started, then finish termination. Shutdown never writes `terminatedAt`, so runs stopped by a quit stay resumable.
- **Bounded server shutdown (D2).** `ServerProcessShutdown` gives `app.close()` at most 10 s after startup settles, then always runs one process-tree sweep (`src/shutdown/server-process-tree-sweep.ts`): SIGTERM the server's descendants and the groups they lead, ≤ 1.5 s, SIGKILL survivors, ≤ 0.5 s confirmation. Outcomes `not-applicable` (Windows) / `confirmed` / `unconfirmed`; exit 1 only on a failed cleanup, an expired bound or `unconfirmed`. The `ps` reader drops its own row (CR-001).
- **Desktop force of the whole tree (D3).** On macOS/Linux, when the server has not exited in the 20 s window, `BaseServerManager.forceStop` snapshots the tree asynchronously, SIGTERMs the descendants, SIGKILLs the server and then the survivors. Windows keeps `taskkill /f /t`.
- AGY's process-table helper moved to `src/utils/process-tree.ts` (shared with the sweep).
- Tests: unit (manager, shutdown, sweep, reader, AGY, gate wiring), Electron force-tree spec with real processes, gated real-process E2E `tests/e2e/shutdown/busy-run-stop-now.e2e.test.ts` (server SIGTERM + application terminate).
- Docs: `agent_execution.md`, `antigravity_cli_runtime.md`, `electron_packaging.md`, `codex_integration.md` (see `docs-sync-report.md`).

## Integration

- Merge of `origin/personal` @ `9d59ab82ec` (31 commits: Work Journal neutral vocabulary, gpt-6.1-terra catalog, `1.5.11-beta.5` bump; no file overlap with this change) → `927f7e846c`; no conflicts. Before it, the architecture reviewer's uncommitted ARCH-REV-003 record was committed as a checkpoint (`cfa15cfb53`).
- Post-integration checks, all Pass (details in `release-deployment-report.md`): server typecheck; focused server suites (409 passed); Electron force-tree spec (6 passed); server build + gated stop-now E2E (2 passed; Terminate 84 ms, busy SIGTERM exit 0 in 775 ms, no survivors, no sweep lines, shutdown-stopped run `terminatedAt` null; application terminate 85 ms); full server unit suite; artifact hygiene; licensing.

## Verification

- Judged from the evidence; no user check needed. Every critical AC is directly proven on the fixed build (API-02/03 R2 durable E2E, API-04/05/06 R2 live Codex and Claude Terminate and busy SIGTERM with 4 root types, API-10/11 R2 desktop idle and busy quit + relaunch + continue, API-12 SIGTERM to the app, API-13 forced desktop path, API-17 bound expiry with real targets), and the integrated-state rerun repeats API-02/03. Details: `release-deployment-report.md` § Verification.

## Release

- No release (the release guide's default; the request did not ask for one). The change ships with the next beta or stable release.

## For The Solution Designer

- Follow-ups FU-001 to FU-008 in `follow-ups.md`; FU-006 already sent (absorbed into autobyteus-336), the rest not sent.
  - FU-008 (intermittent Org root-shutdown stall, contained by the bound and sweep; leading Read-only candidate: `AgentOrgRun.terminateOnce` drains the gate before the member fence) and FU-007 (an incomplete shutdown blocks "Install update and restart") matter before autobyteus-285's unattended update and resume.
  - FU-004's worst-case number corrected by delivery to ≈ 14.25 s (the sweep's 0.5 s kill confirmation, CR-C1).
- Not tested: the update install while busy (unsafe outside the isolated profile; N-5/FU-007); Windows (outside the platform guardrail).
- The live Claude runs added sessions to the user's Claude project history (recorded by API/E2E).
