# API/E2E Test Progress — autobyteus-526 round 2 (`follow-ups-448-final`)

| Time (local) | Case | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 2026-11-20 15:25 | V | Started | | plan in api-e2e-coverage-investigation.md; HEAD 03d3ff8e04; load ~100 |
| 2026-11-20 15:27 | V-01 | Completed | Pass | no code reference to RunningTeamGroup/RunningTeamRow/TeamActivityDot; the 8 keys absent (en, zh-CN); TeamMemberRow keys kept; mentions only in tracked historical logs (frontend-execution-evidence/) and an old ticket's notes |
| 2026-11-20 15:34 | V-02 | Completed | Pass | web typecheck 86 in 36 (baseline 86 in 36) PASS; three guards exit 0 |
| 2026-11-20 15:36 | V-07 | Completed | Pass | watcher unit test 10/10 (22 tests, ~150 ms each) at load 64-66, fseventsd ~157%; unit folder 95/95; mutation (no fake event delivered, reverted): 16 of 22 fail |
| 2026-11-20 15:37 | V-09 | Completed | Pass | server typecheck 1006 in 315 (baseline) PASS |
| 2026-11-20 15:42 | V-08 | Completed | Fail (environment) | package-auto-refresh 14/15: AC-012 timed out waiting for the restore event; fs.watch probe 1.7-4.3 s, 3 of 8 lost (no AutoByteus code); test and watcher source unchanged since base |
| 2026-11-20 15:58 | V-04/V-05/V-06 | Completed | Pass | team-activity SR006-BR-001..004; background-contention BG-BROWSER-000..007; Org draft-retention API-E2E-003-A..E; team-status-live TS-001..009; no failures, no console errors |
| 2026-11-20 16:20 | V-03 | Completed | Pass for this change | web unit 780/781 files, 5877 passed; the one failure (ServerSettingsBasicsPanel, "GitHub") identical on base 8f2d209b2c (temporary worktree, removed); branch does not touch components/settings |
| 2026-11-20 16:30 | V | Completed | Pass | report and API-REV-001 written |
