# API/E2E Test Progress

Read it first whenever you pick the run back up. Only add rows.

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: the coverage investigation's Planned Cases (same case IDs)

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 2026-11-05T20:55:00Z | round 1 | Started | | code a5fc23849e / 0d3c31c4ae / 71ce23ced8, head c764619bd2; server dist rebuilt (exit 0); base worktree wtvc-385-base at 3ef5e33eec installed and built (exit 0) |
| 2026-11-05T20:55:00Z | API-01 | Completed | Pass | Reused IMP-01..03 (server, 0d3c31c4ae) and IMP-09/10 (web, 71ce23ced8): no code change after them |
| 2026-11-05T21:03:07Z | API-02 | Checkpoint | | seed through public APIs: 40 Agent (20/12/8), 200 Team (5 members), 10 Org runs, one turn each, stopped; 35 s. Two trial seeds before it fixed the probe (snake_case tree keys; terminateAgentOrgRun argument) |
| 2026-11-05T21:03:59Z | API-02 | Completed | Pass | poll read p95: current null 151.2 ms, current 6 148.9 ms, base 6 57.6 ms (+91.3 ms); RB-C1..C4, RB-B1..B3 Pass; load average ~70 |
| 2026-11-05T21:09:48Z | API-03, API-04 | Completed | Pass | WVC-001, WVC-002 (r1) |
| 2026-11-05T21:09:48Z | API-05, API-06 | Checkpoint | Fail (test) | WVC-003: the tree showed the running run beside the newest 6 (the app holds it live); WVC-004: counted the page's first read before the switch to Runs. Both causes in the case code; fixed |
| 2026-11-05T21:12:22Z | API-05, API-06 | Completed | Pass | WVC-003, WVC-004 (r2) after the case fixes |
| 2026-11-05T21:13:30Z | API-07 | Started | | projects-left-navigation PLN-01..10, out /tmp/wtvc-385/pln |
| 2026-11-05T21:20:30Z | API-07 | Checkpoint | Fail (probe) | r1: PLN-01..07, 09, 10 Pass; PLN-08 expects a Project created with no run to be listed live (contradicts REQ-009; the implementation's probe update missed PLN-08). Probe updated |
| 2026-11-05T21:23:20Z | API-07 | Checkpoint | Fail (probe) | r2: PLN-08 still times out: a run started by another client (API) under the new Project is not read; the Projects view re-reads only on connected, a Project change, its own run actions and when shown (353 REQ-003). Observation OBS-1; PLN-08 now shows the view again to see it |
| 2026-11-05T21:27:00Z | API-08 | Checkpoint | Fail (baseline) | fixture probes r1: task-agent-sibling-sidebar, team-activity-presentation Pass; agent-org-task-team-disclosure (fixture lacks a Team copy's `source`, 7d689455ad), background-contention and standalone-error-stop (unanswered update-notifications / agent-package-definitions sockets, autobyteus-210) fail for causes outside this ticket. Baseline fixes applied |
| 2026-11-05T21:31:00Z | API-07, API-08, API-10 | Started | | chain: PLN r3, the three fixed fixture probes, task-closure-tree and team-status-live (their wait for two folder rows needs Temp listed, which REQ-009 no longer guarantees; changed to wait for their own folder) |
| 2026-11-05T21:30:37Z | API-07 | Completed | Pass | r3: PLN-01..10 Pass (PLN-08 lateProjectUnlistedWithoutRun, liveInSamePage, lateProjectListed) |
| 2026-11-05T21:34:28Z | API-08 | Completed | Pass | r2: the three fixed fixture probes Pass (baseline fixes 25769bc969); the other two passed in r1 |
| 2026-11-05T21:42:00Z | API-10 | Completed | Pass | task-closure-tree BR-001..016, team-status-live TS-001..007 Pass |
| 2026-11-05T21:45:00Z | round 1 | Completed | Pass | base worktree and seed removed; no probe process left; commits 25769bc969 (baseline), 450fe43929 (coverage); API-09 Not Tested (real AGY) |
