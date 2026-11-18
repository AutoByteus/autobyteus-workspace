# API/E2E Test Progress — list-running-agents (autobyteus-492)

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: `api-e2e-coverage-investigation.md` § Planned Cases (same case IDs)

| Time | Case ID | Event (`Started`/`Checkpoint`/`Completed`) | Result (`Pass`/`Fail`/`Blocked`/`Not Tested`) | Note (what is running and where, what to do next) |
| --- | --- | --- | --- | --- |
| 2026-11-18T11:04:24Z | API-04 | Started | — | `pnpm -C autobyteus-server-ts test:integration` in background; log /tmp/api492/API-04.log |
| 2026-11-18T11:26:21Z | API-04 | Completed | Fail→rerun | 17 failed: 1 stale schema assertion (node) fixed + rerun 14/14; 16 FSEvents (fseventsd 184%, event 4.8 s/none) — rerun the 3 watcher files alone when quieter |
| 2026-11-18T11:26:27Z | API-06 | Started | — | two-server suite, log /tmp/api492/API-06.log, evidence dir /tmp/api492/API-06-ev |
| 2026-11-18T11:37:06Z | API-06 | Completed | Fail (1 test) | 48 passed; RC-47 failed at the unknown-address assertion: agent reads {} (tool-result rule drops []), test expectation wrong; fixed. Next: rerun -t RC-01..RC-11 + RC-47 |
| 2026-11-18T11:37:12Z | API-06 (RC-47 rerun) | Started | — | -t 'RC-(0[1-9]|1[01]|47) ', log /tmp/api492/API-06-rc47.log |
| 2026-11-18T11:40:05Z | API-06 (RC-47 rerun) | Completed | Pass | 12 passed, 37 skipped by filter; RC-47 Pass. API-06 complete. Next: API-07 CPW E2E |
| 2026-11-18T11:40:11Z | API-07 | Started | — | CPW suite, log /tmp/api492/API-07.log |
| 2026-11-18T11:42:49Z | API-07 | Completed | Pass | 14/14 |
| 2026-11-18T11:42:49Z | API-08 | Started | — | contract stories, log /tmp/api492/API-08.log |
| 2026-11-18T12:07:08Z | API-08 | Completed | Fail (2 stories) | §5.1 Pass; §5.2 U9 disk mismatch: fixture message ID 'x' spliced into 'examples' by ID binding (fixture defect) → model U9 id collabmsg_U9, fixture regenerated, --check ok; §5.3 O0 AGY model discovery timeout (15 s) under load avg ~50. Next: rerun -t §5.2/§5.3 |
| 2026-11-18T12:07:08Z | API-08 (5.2/5.3 rerun) | Started | — | log /tmp/api492/API-08b.log |
| 2026-11-18T12:21:41Z | API-08 (5.2/5.3 rerun) | Completed | 5.2 Pass; 5.3 Fail | 5.3 O0…O8 ok, then 'no driver for O9': base fixture lagged the 461 model (O9 added by 7163160ece); regeneration in deacacf948 added O9 → driver added. Next: rerun -t §5.3 |
| 2026-11-18T12:21:41Z | API-08 (5.3 rerun) | Started | — | log /tmp/api492/API-08c.log |
| 2026-11-18T12:28:26Z | API-08 (5.3 rerun) | Completed | Pass | O0…O9 pass. API-08 complete: 5.1 (run 1), 5.2 (run b), 5.3 (run c) |
| 2026-11-18T12:28:46Z | API-03 | Started | — | server typecheck at ec66ee7d01 |
| 2026-11-18T12:31:07Z | API-03 | Completed | Pass | production 0; tests 1009 = baseline |
| 2026-11-18T12:31:59Z | API-05 | Started | — | pnpm test:e2e (env -i), log /tmp/api492/API-05.log; load avg ~120-170 from other worktrees |
| 2026-11-18T13:13:13Z | API-05 | Completed | Fail (10 tests, 11 files) | 554 passed; failures: 5 s timeouts, FSEvents waits, child-suite exits, Grok version probe; load 120-170. Next: API-05b rerun the 11 files |
| 2026-11-18T13:13:13Z | API-05b | Started | — | 11 failed E2E files, log /tmp/api492/API-05b.log; load ~70 |
| 2026-11-18T13:26:39Z | API-05b | Checkpoint | — | interrupted by app restart after personal-settings ✓, live-refresh ✗(FSEvents), E-008 ✗; E-008 cause found (fastify.close 1.2–6.2 s under load vs 10 s bound; nothing in the change's close path). Rerunning the 8 files not reached: log /tmp/api492/API-05d.log |
| 2026-11-18T13:32:26Z | API-05 | Completed (reruns) | Pass for the change | after reruns 4 files still fail on FSEvents/5 s/close bounds (FSEvents: no event within 20 s now); none reaches the change; FU-005 |
| 2026-11-18T13:32:26Z | API-10 | Started | — | tracked imports |
| 2026-11-18T13:32:40Z | API-10 | Completed | Pass | 98546 files |
| 2026-11-18T13:32:40Z | API-12 | Started | — | fresh clone /tmp/api492/fresh, log /tmp/api492/API-12.log |
| 2026-11-18T13:39:22Z | API-12 | Completed | Pass | frozen install, web typecheck PASS (87 = baseline), prepare-server ok; clone removed |
| 2026-11-18T13:40:58Z | API-04b | Completed | Not Tested | FSEvents delivered no event within 20 s (3/3) at 13:31; outside the change; FU-005 |
