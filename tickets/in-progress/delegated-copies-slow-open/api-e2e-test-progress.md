# API/E2E Test Progress — delegated-copies-slow-open

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: the coverage investigation's Planned Cases (same case IDs)

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 2026-10-18 14:11 | API-02 | Started | | server E2E new query, in-process server, scripted AGY |
| 2026-10-18 14:12 | API-02 | Completed | Pass | attempt 1 failed on my own expectation (type file vs image), fixed test; attempt 2 3/3 pass |
| 2026-10-18 14:12 | API-03 | Started | | integration prepare + run-file-changes-api integration test |
| 2026-10-18 14:13 | API-03 | Completed | Pass | 6/6 |
| 2026-10-18 15:16 | API-04 | Checkpoint | | probe debugged on an 8-Team seed (fix + base); out-of-scope observation: running hub live view lists 4 of 42 stored messages |
| 2026-10-18 15:16 | API-04 | Started | | full seed --teams 50 --unrelated 300 -> /tmp/dcso-api-e2e/seed |
| 2026-10-18 15:18 | API-04 | Completed | Pass | seed 50 Teams/300 children, 300 unrelated team runs, hub log 2.63 MB; manifest /tmp/dcso-api-e2e/seed.manifest.json |
| 2026-10-18 15:18 | API-05 | Started | | base build 5ceb43039a, stopped hub, 2 samples |
| 2026-10-18 15:20 | API-05 | Completed | Pass | base observed: T-1 7.3 s with 312+312 member requests; evidence /tmp/dcso-api-e2e/API-05-base |
| 2026-10-18 15:20 | API-06 | Started | | fix build, stopped hub, 3 samples, --compare-with base |
| 2026-10-18 15:21 | API-06 | Completed | Pass | fix: T-1 47-56 ms, 0 member requests; T-3 1+1; rows equal base; /tmp/dcso-api-e2e/API-06-fix |
| 2026-10-18 15:21 | API-07 | Started | | fix live run on the large hub: L-001..L-008 (API-07 L-001/L-002/L-003, API-08 L-007, API-09 L-004, API-10 L-005/L-006, status L-008) |
| 2026-10-18 15:24 | API-07 | Completed | Pass | L-001..L-008 all Pass on the large hub (/tmp/dcso-api-e2e/API-07-fix-live); L-009 busy copy Pass (/tmp/dcso-api-e2e/API-07b-fix-busy). API-08 (L-007), API-09 (L-004), API-10 (L-005, L-006) are in the same run |
| 2026-10-18 15:24 | API-11 | Started | | isolated-app start --build --data-root /private/tmp/dcso-api-e2e/desktop-root (copy of seed) |
| 2026-10-18 15:30 | API-11 | Completed | Pass | iso-49384-a072: T-1 45 ms, T-2 225 ms, T-3 55 ms (1+1), rows equal base; instance stopped, ports released |
| 2026-10-18 15:31 | API-12 | Started | | regression: existing linked_skills E2E with the changed fixture CLI |
| 2026-10-18 15:31 | API-12 | Completed | Pass | 2 files, 5 tests |
| 2026-10-18 15:33 | API-14 | Started | | L-010 large-conversation copy open: seed 10 Teams/3 unrelated, then L-001,L-010 on fix |
| 2026-10-18 15:43 | API-14 | Completed | Pass | prose 2.37 MB copy opens in 262 ms (1+1); unbroken 60 KB-token copy 86.7 s on fix and page frozen on base -> OBS-3 out of scope |
| 2026-10-18 15:44 | API-15 | Started | | L-011 load failure on the real stack + L-010 rerun with final probe; fresh 10-Team seed |
| 2026-10-18 15:58 | API-15 | Completed | Pass | L-011 failure logged/unloaded/other copy ok/retry 1+1; L-010 258 ms; first attempt stuck on my own readiness check (empty conversation), fixed |
| 2026-10-18 16:00 | — | Completed | Pass | round complete; report and revision record written |
| 2026-10-18 16:32 | R2 | Started | | round 2 (DR-001 rerun on merged state 05ab1c4790): probe path fix for append-only hub log, rebuild, base 2763e7c678 + merged S cases, L-001/L-002/L-004 |
| 2026-10-18 16:34 | API-02/API-12 | Started | | merged state rerun |
| 2026-10-18 16:34 | API-02/API-12 | Completed | Pass | 5/5 on merged build |
| 2026-10-18 16:34 | API-04 | Started | | R2 seed 50 Teams/300 unrelated with merged server -> /tmp/dcso-api-e2e/r2-seed |
| 2026-10-18 16:36 | API-04 | Completed | Pass | R2 seed: 300 children, 300 unrelated, hub log 2.61 MB (append-only active file) |
| 2026-10-18 16:36 | API-05 | Started | | R2 base 2763e7c678 S cases, 2 samples |
| 2026-10-18 16:37 | API-05 | Completed | see report | base2 run exit recorded |
| 2026-10-18 16:37 | API-06 | Started | | R2 merged S cases, 3 samples, compare base2 |
| 2026-10-18 16:39 | API-06 | Completed | Pass | merged T-1 54-69 ms 0 member reqs; T-3 1+1; rows equal base2 |
| 2026-10-18 16:39 | API-07 | Started | | R2 merged live L-001..L-011 on large hub |
| 2026-10-18 16:41 | API-07 | Completed | Pass | R2 merged live L-001..L-011 all Pass; batches seen in L-002; base2 worktree and seed removed |
| 2026-10-18 16:42 | R2 | Completed | Pass | round 2 report and revision record updated |
