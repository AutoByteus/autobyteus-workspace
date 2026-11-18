# API/E2E Test Progress — phone-text-size-three-steps-534

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: the coverage investigation's Planned Cases

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 11:20 | API-05 | Started | | base bd2053ee51 served → Small → update → reload |
| 11:21 | API-05 | Completed | Pass | Standard from the first screen; Standard marked; storage unchanged; no errors |
| 11:21 | API-06 | Started | | zh-CN menu |
| 11:21 | API-06 | Completed | Pass | zh-CN header/labels; no 本机设置 text; menu inside 360 at Largest |
| 11:21 | API-07 | Started | | base/head walks Standard, Largest |
| 11:27 | API-07 | Completed | Pass | Standard 254 matched / Largest 238 matched; differences only the menu (intended), ages, pulsing dot, icon timing, 4 px anti-aliasing |
| 11:28 | API-02 | Started | | full web unit suite |
| 11:46 | API-02 | Completed | Not Tested | run 11:28–11:45 overlapped SR-002 commits 087f800237/a8f2680e2a (11:35–11:37, MobileRunMenu.vue + spec) in this worktree: 2 failures in MobileRunMenu.spec.ts "Settings always, and last (…534)" from a mixed old/new file state; result discarded, rerun on IR-002 |
| 11:46 | API-03 | Completed | Pass | server typecheck at baseline (ran on a8f2680e2a; server untouched by both) |
| 11:47 | — | Checkpoint | | PAUSED for IR-002 (SR-002: Settings last in the run's ⋮; solution-revision-record: API/E2E covers SR-001 + SR-002 together). On IR-002: API-02 full suite; API-04 reuse IMP of IR-002 (probe incl. 522's run-menu cases); API-07 rerun (run-menu screen changes); API-05/06 stay valid (they never open the run's ⋮; recheck by diff); add a case for SR-002 (run ⋮ order with and without VNC Viewer, Messages) |
| 11:49 | — | Checkpoint | | resumed on IR-002 (code a8f2680e2a, HEAD 6df3a5c12f); diff since IR-001: run menu + specs + probe only; API-05/06/07 stay valid |
| 11:49 | API-02 | Started | | rerun on IR-002 |
| 12:03 | API-02 | Completed | Pass | IR-002: 767 files, 5772 passed, 2 skipped; HEAD stable |
| 12:03 | API-08 | Started | | node-534 (desktop + Team) + container abtest534-desktop |
| 12:05 | API-08 | Completed | Pass | agent run and Team lead: Settings last after VNC Viewer, at Standard 412 and Largest 360; Settings and VNC Viewer open; cleanup done |
| 12:06 | API-09 | Started | | device check (added to reach the target): APK, AVD, node-534 + container |
| 12:12 | API-09 | Completed | Pass | device: three steps exact by taps; run ⋮ Settings last (agent run, Team lead); cleanup done |
