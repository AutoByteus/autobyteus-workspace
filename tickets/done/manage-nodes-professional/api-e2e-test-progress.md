# API/E2E Test Progress — manage-nodes-professional

Working log. Read it first when resuming. Rows are only added.

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: `api-e2e-coverage-investigation.md` § Planned Cases

| Time (UTC) | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 2026-11-02T09:14Z | API-01 | Started | — | Electron build (background), log evidence/api-e2e/API-01-electron-build.log |
| 2026-11-02T09:17Z | API-03 | Completed | Pass | stores/utils/localization/server/electron diff empty |
| 2026-11-02T09:20Z | API-01 | Completed | Pass | build exit=0 |
| 2026-11-02T09:20Z | API-02 | Started | — | desktop journey run1 (includes a 5-min grace wait for EL-06) |
| 2026-11-02T09:21Z | API-02 | Checkpoint | — | run1 stopped in setup: this base's identity page answers nodeId (journey read serverInstanceId); fixed; run2 started |
| 2026-11-02T09:28Z | API-02 | Checkpoint | — | run2: EL-01/02/03/05/07/08/09/10 Pass; EL-04 'Copied' not shown (instrumented: focus, clipboard, console); EL-06 not reached because EL-08 reloads ended the follow (reordered); run3 started |
| 2026-11-02T09:36Z | API-02 | Completed | Pass | run3: EL-01…EL-10 Pass (EL-06 after the 5-min grace) |
| 2026-11-02T09:36Z | API-04 | Completed | Pass | visual comparison with VIS-016/019/037/036 and medium |
| 2026-11-02T09:36Z | — | Completed | Pass | round 1 recorded (API-REV-001), 95% |
| 2026-11-02T09:59Z | — | Checkpoint | — | round 2 (IR-002 merge 35e5853a22): rule 4 shared foundations changed → rerun API-01, API-02, API-03, API-04 |
| 2026-11-02T09:59Z | API-03 | Completed | Pass | round 2: empty for stores/utils/localization/server/electron over 84ea944ac5; ticket files unchanged by the merge |
| 2026-11-02T09:59Z | API-01 | Started | — | round 2 Electron build of 35e5853a22 (background) |
| 2026-11-02T10:06Z | API-01 | Completed | Pass | round 2 build exit=0 |
| 2026-11-02T10:06Z | API-02 | Started | — | round 2 run4 on the merged build |
| 2026-11-02T10:13Z | API-02 | Completed | Pass | round 2 run4: EL-01…EL-10 Pass |
| 2026-11-02T10:13Z | API-04 | Completed | Pass | round 2: run4 screenshots unchanged, match VIS-019/033 |
| 2026-11-02T10:13Z | — | Completed | Pass | round 2 recorded (API-REV-002), 95% |
