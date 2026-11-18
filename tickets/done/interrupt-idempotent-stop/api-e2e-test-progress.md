# API/E2E Test Progress

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: the coverage investigation's Planned Cases (same case IDs)

| Time | Case ID | Event (`Started`/`Checkpoint`/`Completed`) | Result (`Pass`/`Fail`/`Blocked`/`Not Tested`) | Note (what is running and where, what to do next) |
| --- | --- | --- | --- | --- |
| 13:01 | API-05 | Started | | prepare + whole server test:integration, background; log evidence/api-e2e/API-05-server-integration.log |
| 13:09 | API-05 | Checkpoint | | 7 package-watcher tests failed so far; fseventsd 154% CPU, load 55; measuring FSEvents after the run |
| 13:13 | API-05 | Completed | Fail (environment) | 16 failed in package-auto-refresh + file-system-watcher; FSEvents measured: no event in 10 s 2/3, close 1.2-4.8 s (API-05b); diff touches no watcher code; rerun the 2 files when fseventsd is calm |
| 13:13 | API-07 | Started | | desktop probe trial run, loopback, /tmp/api533/sgd-trial1 |
| 13:30 | API-07 | Checkpoint | | desktop probe trials pass after harness fixes (/tmp/api533/sgd-trial6,7); formal run after the phone cases are final |
| 13:40 | API-07 | Started | | formal: test:e2e:stop-generation loopback, evidence/api-e2e/API-07-desktop-loopback, commit f8fad0fc6a |
| 13:44 | API-07 | Completed | Fail (harness) | SGD-03, SGD-05: status via unrouted /ws/run-status; fixed: all /ws/ through the wire, whole-path drops, node answers logged; evidence kept as API-07-desktop-loopback-run1 |
| 13:47 | API-07 | Started | | formal rerun at ed921d57c6, evidence/api-e2e/API-07-desktop-loopback |
| 13:50 | API-07 | Completed | Pass | 8/8, 20 sends, 0 stalls, cleanup ok |
| 13:50 | API-08 | Started | | --latency-ms 150, gaps 0,150,300,450,700,1000, evidence/api-e2e/API-08-desktop-latency-150ms |
| 14:02 | API-08 | Completed | Fail (run 1) | SGD-06: Team stream entered explicit recovery (page closed it, no reopen) after a blip -> Stop 'not sent'; SGD-07: harness press on a just-disabled button; SGD-08 cascade. Kept as API-08-...-run1. Reruns sgd-lat1/lat2 pass. Probe fixed; formal rerun next |
| 14:02 | API-08 | Started | | formal rerun at 28de6a0ee9 |
| 14:05 | API-08 | Completed | Pass | formal rerun 8/8 at 28de6a0ee9; 20 sends, 0 stalls |
| 14:05 | API-10 | Started | | CG-07: SGD-01 + SGD-02 with 40 gaps each (80 Stop->send cycles), loopback |
| 14:12 | API-10 | Checkpoint | | 80 sends 0 stalls, but rounds keyed by gap overwrote repeats (evidence moved out); fixed key, rerun at 6744d786c6 |
| 14:20 | API-10 | Checkpoint | | rerun interrupted by the app restart (13:19 UTC); partial evidence moved out; temp data root removed; restarting |
| 14:29 | API-10 | Completed | Pass (CG-07 reproduced, cause found) | 80 rounds asserted, 0 bad; 1 send stall of 80: SEND_MESSAGE before the node's CONNECTED -> SESSION_NOT_READY, dropped silently; send path unchanged since base -> FU-006 |
| 14:29 | API-09 | Started | | whole test:e2e:mobile-shell at 6744d786c6, evidence/api-e2e/API-09-mobile-shell |
| 15:14 | API-09 | Completed | Pass for 79/79 cases; probe Fail on 1 unknown browser error | MSP-50 desktop window: 'Failed to open run: … changed before projection commit' (run-open race guard, code not in the diff); rerunning MSP-50..52 alone |
| 15:18 | API-06 | Started | | whole pnpm test:e2e, AGY gate, clean env; log evidence/api-e2e/API-06-server-e2e-whole.log |
| 17:15 | API-06 | Completed | 21 files failed (cause: AGY model discovery timeouts / test timeouts under load 70-80, watcher files) | 175 passed, 80 skipped; Tests 16 failed / 866 passed; rerunning the 21 files serially (API-06b) |
| 17:15 | API-06b | Started | | 21 files, --fileParallelism=false |
| 17:59 | API-06b | Completed | 13/21 pass (incl. stop-nothing-to-stop 2/2); 8 fail: AGY discovery/hook timeouts, FSEvents watcher files, OT-2 background journal writes | |
| 17:59 | API-06c | Started | | 6 non-watcher files at load ~40 |
| 18:04 | API-06c | Completed | 3/6 pass | agy-background (hook), work-journal-restore, open-task-tree: AGY discovery timeouts; rerun at load ~20 (API-06d) |
| 18:10 | API-06c | Completed | 3/6 pass | see API-06d |
| 18:10 | API-06d | Completed | 3 fail (causes outside the ticket) | agy-background/work-journal-restore afterAll timeouts (also on follow-ups-of-461-500 today); OT-2 stale on base (fix 8d14de45e3 not in base) |
| 18:10 | API-06e | Completed | Pass | agy-background Stop test alone passes |
| 18:10 | API-02 | Completed | Pass | agentOrgRetainedRecovery.spec 20/20 |
| 18:10 | API-05b | Completed | Pass (cause measured); watcher rerun Not Tested | FSEvents still broken at 17:06 UTC |
| 18:10 | — | Checkpoint | | reports written; committing docs and evidence; handoff next |
