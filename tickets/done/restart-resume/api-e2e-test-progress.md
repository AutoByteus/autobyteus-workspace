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
| 2026-11-01 09:10 | Round 2 | Started |  | CRR-003 Pass on IR-002 (code 82932a8b48 + 7d9a305627; review 8fd49bd25a). New run temp root /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/rr285-api2.fcgHSg |
| 2026-11-01 09:10 | API-00 | Started |  | round 2: clean checkout 8fd49bd25a; install, server + desktop builds |
| 2026-11-01 09:22 | API-R2 | Completed | Pass | reused IMP-07..IMP-10 on 7d9a305627 (167 passed; mutations fail; typecheck; full suite after test fix) |
| 2026-11-01 09:28 | API-00 | Completed | Pass | round 2: install, server build, desktop build (6 m 2 s) from 8fd49bd25a; stamp 1.5.11-beta.9 in both |
| 2026-11-01 09:28 | API-01 | Completed | Pass (reused + bundle reread) | API-01-r2-desktop-stamp.log |
| 2026-11-01 09:28 | API-03 | Started |  | API-03-r2 scripted |
| 2026-11-01 09:34 | API-03 | Completed | Pass | r2: P1 not-an-update 0 notices; copy first; AR-001 1 notice no list; host lists copy; copy 1 system_task_notification in memory; idle 0; AR-005 record kept (3); P3 removed, healthy |
| 2026-11-01 09:34 | API-04E | Started |  | sample 1: 14 native targets, message/archive alternating, 0-2.6 s |
| 2026-11-01 09:37 | API-04E | Checkpoint |  | s1: 0 violations; queue done in 0.8 s; e1 notice refused (already had input), e2 archived during restore -> not resumed (failed: root not accepting), rest after post. s2/s3 denser (50 ms steps) |
| 2026-11-01 09:42 | API-04E | Completed | Pass | 3 samples, 42 targets, 0 violations: msg not-first 7, msg notice-then-user 14, archive ok -> not resumed 10, archive refused (active) -> resumed 11 |
| 2026-11-01 09:42 | API-04 | Started |  | r2: 3 slow Claude + t-message/t-stop/t-archive at start |
| 2026-11-01 09:46 | API-04 | Completed | Pass | r2: t-message notice refused (already had input), first model call = user; t-archive skipped (archived), no turn; t-stop not found -> resumed |
| 2026-11-01 09:04 | API-04B | Started |  | r2: SLOW=6 ACT_DELAY_MS=100 |
| 2026-11-01 09:05 | API-04C | Started |  | r2: SLOW=12 ACT_DELAY_MS=0 |
| 2026-11-01 09:55 | API-04B | Completed | Pass | r2: t-message notice refused, first model call = user; t-archive skipped "archived (after the restore)"; t-stop terminated an active run -> not resumed (root not accepting) |
| 2026-11-01 09:55 | API-04C | Checkpoint |  | r2a (kept): t-archive skipped; t-message flagged "user message lost": probe sent 0 ms after WS open, before the server session existed (attached 31.24, session 31.25, no handling logged); probe artifact. Probe now waits for CONNECTED; rerun |
| 2026-11-01 10:00 | API-04C | Completed | Pass | r2: t-message notice refused, first model call = user; t-archive skipped "archived (after the restore)"; 13 resumed 2 skipped 0 failed |
| 2026-11-01 10:00 | API-02 | Started |  | r2 live-update |
| 2026-11-01 10:10 | API-02 | Completed | Pass | r2 live: recorded 6 (agent host x3, team member, org member, delegated); 6 resumed 0/0; every run 1 notice in its own projection (members and copy too); host lists copy; all continued |
| 2026-11-01 10:10 | API-05T | Started |  | r2 desktop: Team member + Claude host with Codex copy (WITH_COPY=1) |
| 2026-11-01 10:16 | API-05T | Completed | Pass | r2 desktop: recorded 3 (team member, host, delegated); 3 resumed 0/0 (copy first); member, host and copy each show 1 notice inside system-task-notification-segment when opened later and after reload; host lists copy; screenshots confirm the member/copy/host views |
| 2026-11-01 10:16 | API-06 | Started |  | r2 284 gated E2E |
| 2026-11-01 10:20 | API-06 | Completed | Pass | r2: Tests 2 passed (2) |
| 2026-11-01 10:20 | Cleanup | Completed |  | no isolated instances, no RR285 processes; clean worktree and run root rr285-api2.fcgHSg removed |
| 2026-11-01 10:30 | Round 2 | Completed | Pass | 95.1%; F-API-001 and O-1 resolved; report, investigation and API-REV-002 written |
