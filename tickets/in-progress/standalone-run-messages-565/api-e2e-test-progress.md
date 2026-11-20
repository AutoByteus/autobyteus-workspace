# API/E2E Test Progress — standalone-run-messages-565 (autobyteus-565)

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: `api-e2e-coverage-investigation.md` § Planned Cases

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 2026-11-20T15:43:19Z | API-04 | Started | — | test:integration, log /tmp/api565/API-04.log |
| 2026-11-20T15:55:53Z | API-04 | Completed | Pass for the change | 506 passed; 8 failed in 2 watcher files, each self-reported ENVIRONMENT/INCONCLUSIVE (no OS file events) |
| 2026-11-20T15:55:53Z | API-02 | Started | — | server + web typecheck |
| 2026-11-20T15:58:06Z | API-02 | Completed | Pass | server 1006 = baseline; web 87 = baseline |
| 2026-11-20T15:58:06Z | API-06 | Started | — | two-server suite, log /tmp/api565/API-06.log |
| 2026-11-20T16:08:45Z | API-06 | Completed | Pass | 50/50 |
| 2026-11-20T16:08:49Z | API-07 | Started | — | standalone-messages probe, out /tmp/api565/API-07 |
| 2026-11-20T16:16:16Z | API-07 | Checkpoint | Fail (probe) | run 1: SMP-01, SMP-04 Pass; SMP-02/03: probe clicked the tab before the selected run's own tab (default Activity) settled; fixed. Rerun |
| 2026-11-20T16:17:40Z | API-07 | Completed | Pass | SMP-01..04 Pass (run 2) |
| 2026-11-20T16:17:40Z | API-08 | Started | — | mobile-shell --cases=MSP-08, out /tmp/api565/API-08 |
| 2026-11-20T16:20:04Z | API-08 | Checkpoint | Pass (run 1) | MSP-08 Pass; extended with phone Load more (55 more); rerun |
| 2026-11-20T16:21:33Z | API-08 | Completed | Pass | MSP-08 Pass (run 2 with phone Load more) |
| 2026-11-20T16:21:33Z | API-09 | Started | — | large-hub seed --teams 12 then --live --cases L-012 |
| 2026-11-20T16:23:21Z | API-09 | Checkpoint | — | large-hub seed fails at its own stale read (view.execution_tree.taskExecutions, gone since 461 SR-084): L-012 Not Tested (FU). Running large-runs-load-less next |
| 2026-11-20T16:28:45Z | API-09 | Completed | Pass (LRL 5/5); L-012 Not Tested (FU-003); cross-scope Not Tested (real runtime) | — |
| 2026-11-20T16:28:56Z | API-05 | Started | — | pnpm test:e2e (env -i), log /tmp/api565/API-05.log |
| 2026-11-20T17:27:07Z | API-05 | Completed | Fail (16 tests / 21 files, load) | 547 passed; 5 s timeouts, 10 s close hooks, FSEvents waits, CLI probe UNKNOWN; rerun the 21 files: API-05b |
| 2026-11-20T17:45:58Z | API-05 | Completed (rerun) | Pass for the change | 7 of 21 pass alone; the rest time out at load 66-89; none reaches the change; 492 FU-005 |
| 2026-11-20T17:46:07Z | API-10 | Completed | Pass | 100135 files |
| 2026-11-20T17:46:07Z | API-12 | Started | — | fresh clone /tmp/api565/fresh at bae91e808f |
| 2026-11-20T17:51:24Z | API-12 | Completed | Pass | install, web typecheck PASS (87), prepare-server, contracts dist reproduces; clone removed |
| 2026-11-20T17:52:22Z | API-11 | Started | — | gated open-task-tree-upgrade-startup (my edit; skipped in API-05) |
| 2026-11-20T17:54:28Z | API-11 | Completed | Pass | OT-1..3, CRA-1 |
