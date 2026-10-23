# API/E2E Test Progress — task-comments

Your own progress log while tests run. Only add rows; never change earlier ones.

- Execution coverage report: `tickets/in-progress/task-comments/api-e2e-execution-coverage-report.md`
- Planned cases: the coverage investigation's Planned Cases (same case IDs)

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 2026-10-22 20:41 | API-00 | Started | | Gated whole projects folder + app-data-migrations on HEAD 1b83434652 (background); log /tmp/tc-e2e/baseline-folder.log. No edits to existing test files until it completes |
| 2026-10-22 20:58 | API-00 | Completed | Pass | Baseline recorded: 9 failed; 7 additive pins (CTX-E2E-001 keys, API-007 mutations, API-011 key set, change-feed x4 snapshot); delegated-launch-config-defaults x2 = stale vs autobyteus-197 (base), FU-003 |
| 2026-10-22 20:58 | API-01..05 | Started | | Ungated: project-task-boundaries, projects-graphql, project-task-search; log /tmp/tc-e2e/run1-ungated.log |
| 2026-10-22 20:58 | API-01..05 | Completed | Pass | 3 files / 33 tests pass incl. CMT-API-001, CMT-API-002, API-012, CMT-SEARCH-001 |
| 2026-10-22 20:58 | API-06 | Started | | project-task-comments-live (gated); log /tmp/tc-e2e/run2-live.log |
| 2026-10-22 20:59 | API-06 | Completed | Pass | 4/4; evidence /tmp/tc-e2e/live-ev/run2-copy.json |
| 2026-10-22 20:59 | API-07 | Started | | Folder run gated after edits (background), log /tmp/tc-e2e/run3-folder.log; Electron build in parallel, log /tmp/tc-e2e/electron-build.log |
| 2026-10-22 21:09 | API-09 | Started | | Electron build exit=0; isolated-app start --from-worktree --data-root /tmp/tc-e2e/desktop-root |
| 2026-10-22 21:14 | API-07 | Checkpoint | | Folder run after edits: 34 files pass, delegated-launch-config-defaults 2 failed (FU-003, same as baseline) |
| 2026-10-22 21:14 | API-09 | Completed | Pass | Fresh run J1-J8 Pass, errors []; old task.json unchanged; instance stopped, root removed. Script fixes during runs: Settings at panel bottom; tab via 'Show tools' (tab reachable without a run) |
| 2026-10-22 21:14 | API-08 | Started | | comments-live-probe.mjs, out /tmp/tc-e2e/api08-run1 |
| 2026-10-23 04:44 | API-08 | Completed | Pass | page+tab live, 5 comments, board search quokka, errors [] |
| 2026-10-23 04:44 | API-07 | Checkpoint | | Browser probes: test:e2e:projects then project-manager-ux |
| 2026-10-23 04:58 | API-07 | Completed | Pass | Projects probe 17/17; PMU 24/25, PMU-021 browser error traced (FU-004 repro), reruns 3/3; folder 34 files pass, 2 FU-003 |
| 2026-10-23 04:58 | — | Checkpoint | | Report, revision record, follow-ups written; next commits and handoff |
| 2026-10-23 04:58 | — | Completed | Pass | Test code committed e9e4fba0b4 |
