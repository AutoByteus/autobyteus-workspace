# API/E2E Test Progress

Progress log while tests run. Read it first when picking the run back up. Only add rows.

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: the coverage investigation's Planned Cases

| Time | Case ID | Event (`Started`/`Checkpoint`/`Completed`) | Result | Note |
| --- | --- | --- | --- | --- |
| 2026-10-19T09:18:45Z | (setup) | Checkpoint | — | server build exit 0; nuxt prepare exit 0 (HEAD e44a2de1b1, code c2bd6991b0) |
| 2026-10-19T09:18:45Z | API-02 | Started | — | original FU-C probe on the fix |
| 2026-10-19T09:18:51Z | API-02 | Completed | Pass | exit=0, evidence/API-02-fu-c-probe-on-fix.log |
| 2026-10-19T09:19:10Z | API-03 | Started | — | 10-run loop; per-run logs /tmp/rflcr-api/api03-run-N.log |
| 2026-10-19T09:19:23Z | API-03 | Checkpoint | — | run 1 exit=0 |
| 2026-10-19T09:19:38Z | API-03 | Checkpoint | — | run 2 exit=0 |
| 2026-10-19T09:19:52Z | API-03 | Checkpoint | — | run 3 exit=0 |
| 2026-10-19T09:20:06Z | API-03 | Checkpoint | — | run 4 exit=0 |
| 2026-10-19T09:20:19Z | API-03 | Checkpoint | — | run 5 exit=0 |
| 2026-10-19T09:20:33Z | API-03 | Checkpoint | — | run 6 exit=0 |
| 2026-10-19T09:20:47Z | API-03 | Checkpoint | — | run 7 exit=0 |
| 2026-10-19T09:21:00Z | API-03 | Checkpoint | — | run 8 exit=0 |
| 2026-10-19T09:21:13Z | API-03 | Checkpoint | — | run 9 exit=0 |
| 2026-10-19T09:21:26Z | API-03 | Checkpoint | — | run 10 exit=0 |
| 2026-10-19T09:21:26Z | API-03 | Completed | Pass | 10/10, evidence/API-03-owner-scoped-e2e-loop-10.log |
| 2026-10-19T09:21:26Z | API-04 | Started | — | tests/e2e/projects/agent-run-collaboration-member-file-changes.e2e.test.ts |
| 2026-10-19T09:21:38Z | API-04 | Completed | Pass | exit=0, evidence/API-04-agent-run-collaboration-member-file-changes.log |
| 2026-10-19T09:21:38Z | API-04 | Started | — | tests/e2e/run-history/standalone-unreadable-tree-containment.e2e.test.ts |
| 2026-10-19T09:21:55Z | API-04 | Completed | Pass | exit=0, evidence/API-04-standalone-unreadable-tree-containment.log |
| 2026-10-19T09:22:12Z | API-05 | Started | — | probe on 4667ec6613: seed small (10 unrelated) → /tmp/rflcr-api/seed-small, then check → evidence/API-05-probe-check |
| 2026-10-19T09:22:21Z | API-05 | Checkpoint | — | seed exit=0 |
| 2026-10-19T09:23:40Z | API-05 | Completed | Pass | seed exit=0, check exit=0 |
| 2026-10-19T09:24:45Z | (all) | Checkpoint | — | All cases complete; temp data removed; committing |
