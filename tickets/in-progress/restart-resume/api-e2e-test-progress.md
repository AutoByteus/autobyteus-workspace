# API/E2E Test Progress — restart-resume (autobyteus-285)

Read this first when picking the run back up. Only add rows. **Temporary data roots only.**

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: `api-e2e-coverage-investigation.md` § Planned Cases
- Run temp root: `/private/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/rr285-api.r8VrPh`

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 2026-11-01 07:28 | API-R1 | Completed | Pass | reused IMP-01..06: no code change since b50e2354ab |
| 2026-11-01 07:28 | API-00 | Started |  | clean checkout + builds |
| 2026-11-01 07:38 | API-00 | Completed | Pass | server + desktop built from 400e4d5b9c (stamp 1.5.11-beta.9) |
| 2026-11-01 07:38 | API-01 | Started |  | N-2 packaging checks |
| 2026-11-01 07:42 | API-01 | Completed | Pass | desktop bundle and pnpm deploy package carry release-identity.json 1.5.11-beta.9; reader returns it |
| 2026-11-01 07:42 | API-03 | Started |  | scripted phases P1-P3 |
| 2026-11-01 07:43 | API-03 | Completed | Pass (AR-003 refused copy not reachable: Task closure stops the copy) | P1 not-an-update; AR-001 1 notice no list; host lists copy; copy notice reached model (memory none, FU-004); idle untouched; AR-005 record survives early quit; P3 corrupt removed, healthy |
| 2026-11-01 07:43 | API-02 | Started |  | live-update |
| 2026-11-01 07:45 | API-02 | Checkpoint |  | first run kept as API-02a: recorded 6 (all kinds), 6 resumed 0 skipped 0 failed, hosts 1 notice, host lists copy; member/copy projection needs member queries -> rerun with them |
| 2026-11-01 07:51 | API-02 | Completed | Pass | live: recorded 6 (agent host x3, team member, org member, delegated), 6 resumed 0/0; every run continued (projections); hosts 1 notice, host lists copy; members/copy notice not in memory (FU-004) but their replies reference the restart |
| 2026-11-01 07:51 | API-04 | Started |  | queue-race |
| 2026-11-01 07:53 | API-04 | Checkpoint |  | sample 1: t-message got notice+user msg, t-archive (archived ~24.41) got notice at 24.69; check happens before restore -> sample 2 with 6 slow entries (targets truly queued) |
| 2026-11-01 07:55 | API-04B | Completed | Observed | 6 slow: archive before check -> skipped 'its root is archived'; message concurrent with check (37.60 vs check ~37.6) -> notice then user turn |
| 2026-11-01 07:55 | API-04C | Started |  | SLOW=12 so the message activation completes before the target's check |
| 2026-11-01 07:56 | API-04C | Completed | FAIL (F-API-001) | 12 slow: archive before check skipped; user message sent 0.3 s before the target's resume post still got the notice first (activation in progress not 'live') |
| 2026-11-01 07:56 | API-04D | Started |  | crash-resume |
| 2026-11-01 07:57 | API-04D | Completed | Pass | SIGKILL after first resume: record already deleted; next start resumes nothing; no second notice |
| 2026-11-01 07:57 | API-05 | Started |  | desktop AC-002 on app copy /private/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/rr285-api.r8VrPh/desk-app |
| 2026-11-01 08:00 | API-05 | Checkpoint |  | first run kept as API-05a: recorded 6 at quit, 6 resumed 0/0 at X1, hosts 1 notice, host lists copy; UI step failed (workspace folder collapsed); rerun with fixes |
| 2026-11-01 08:02 | API-05 | Completed | Pass (AC-002 desktop) | recorded 6, 6 resumed 0/0, every run continued (member/copy projections), hosts 1 notice, host lists copy; UI step opened the team group but not the run row |
| 2026-11-01 08:02 | API-05T | Started |  | team-only desktop journey for the CR-C2 display check |
| 2026-11-01 08:03 | API-05T | Completed | Observed | team member resumed (1 resumed), member view shows the resumed turn but no notice live or after reload; never as a user message |
| 2026-11-01 08:03 | API-05H | Started |  | host-only desktop display check |
| 2026-11-01 08:05 | API-05H | Completed | Pass | host: 1 notice rendered as system-task-notification-segment (all text inside it), live and after reload |
| 2026-11-01 08:05 | API-06 | Started |  | 284 gated E2E |
| 2026-11-01 08:05 | API-06 | Completed | Pass | 2 passed; SIGTERM 766 ms exit 0; recorder line present |
| 2026-11-01 08:20 | Round 1 | Completed | Fail | F-API-001 (AC-003 queue races, API-04/04C); report and API-REV-001 written; failure-origin review requested |
