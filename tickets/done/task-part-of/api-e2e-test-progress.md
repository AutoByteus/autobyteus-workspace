# API/E2E Test Progress — task-part-of

Your own progress log while tests run. Only add rows; never change earlier ones.

- Execution coverage report: `tickets/in-progress/task-part-of/api-e2e-execution-coverage-report.md`
- Planned cases: the coverage investigation's Planned Cases (same case IDs)

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 2026-10-19 07:52 | API-00 | Started | | Ungated baseline: project-task-boundaries, projects-graphql, project-task-search on HEAD 399303d039; log /tmp/pof-e2e/baseline-before-update.log |
| 2026-10-19 07:53 | API-00 | Checkpoint | | Ungated part done: 6 failed / 20 passed, all additive shape pins (boundaries 173, 482, 690, 760; graphql 540; search 94) |
| 2026-10-19 07:55 | API-00 | Checkpoint | | Gated part started in background: context-files-delegation, change-feed, reactivation, closure, ad-hoc, existing-copy; log /tmp/pof-e2e/baseline-gated.log |
| 2026-10-19 08:01 | API-00 | Completed | Pass | Baseline recorded: ungated 6 failed (additive pins), gated 5 failed (feed snapshot query lacks partOfTaskId; existing-copy ack pins); /tmp/pof-e2e/baseline-*.log |
| 2026-10-19 08:01 | API-01..04 | Started | | Ungated: project-task-boundaries, projects-graphql, project-task-search after edits |
| 2026-10-19 08:04 | API-01..04 | Checkpoint | | Ungated run 1: 28 pass, API-011 failed on my own test step (both dependency directions = a loop); fixed; API-011 rerun pass. /tmp/pof-e2e/run1-ungated.log, run1b.log |
| 2026-10-19 08:04 | API-05 | Started | | New gated suite project-task-parts-live.e2e.test.ts, scripted AGY; log /tmp/pof-e2e/run2-live.log |
| 2026-10-19 08:05 | API-05 | Completed | Pass | 3/3 pass; evidence /tmp/pof-e2e/live-evidence/project-task-parts-live.json (closedParts, fenced TASK_AGENT_RESOURCE_CLOSED) |
| 2026-10-19 08:05 | API-06 | Started | | Whole tests/e2e/projects + tests/e2e/app-data-migrations, gated AGY, background; log /tmp/pof-e2e/run3-folder.log |
| 2026-10-19 08:08 | API-09 | Checkpoint | | Desktop build started (background): pnpm -C autobyteus-web build:electron:mac (what isolated-app --build runs); log /tmp/pof-e2e/electron-build.log |
| 2026-10-19 08:14 | API-09 | Started | | Electron build exit=0; isolated-app start --from-worktree --data-root /tmp/pof-e2e/desktop-root (seed phase 1) |
| 2026-10-19 08:25 | API-06 | Completed | Pass | 29 files / 118 passed / 4 skipped, exit=0; HEAD context-files version fails at 160 (proves the earlier baseline pass loaded my edit) |
| 2026-10-19 08:25 | API-09 | Completed | Pass | Final fresh-data run J1-J11 all Pass, no renderer errors; step-1 bytes unchanged; instance stopped, list empty, data root removed. J7: tab not reachable without a run (covered by API-08) |
| 2026-10-19 08:25 | API-08 | Started | | parts-live-probe.mjs, output /tmp/pof-e2e/api08-run1 |
| 2026-10-19 08:26 | API-08 | Completed | Pass | closedParts [2,3]; worker stopped; board/parent/part/tab live; 0 board GraphQL requests during cascade; cleanup ok |
| 2026-10-19 08:26 | API-07 | Started | | test:e2e:projects then test:e2e:project-manager-ux, fresh output dirs /tmp/pof-e2e/api07-* |
| 2026-10-19 08:47 | API-07 | Completed | Pass | projects probe 17/17; PMU first 23/25 (PMU-002, PMU-021 probe races), fixed in probe, reruns 3/3, full rerun 25/25 |
| 2026-10-19 08:47 | — | Checkpoint | | Evidence copied into evidence/API-*; report, revision record written; next: commits and handoff |
| 2026-10-19 08:47 | — | Completed | Pass | Test code committed f1902e8a7b, ca37919cdf; ticket artifacts commit next |
