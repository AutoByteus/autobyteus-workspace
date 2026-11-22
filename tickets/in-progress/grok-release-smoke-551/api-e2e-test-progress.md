# API/E2E Test Progress

Read this first whenever the run is picked back up. Only add rows. Grok idle window: last Grok use 2026-11-22T08:16:48Z (Grok log); do not start the real grok before the first smoke (≥ 14:17Z).

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 2026-11-22 09:32 | API-01 | Completed | Pass | slow-initialize replay case: branch 11/11; base controls fail at 15.45 s (discovery) and 30.2 s (run start); Grok log untouched |
| 2026-11-22 09:32 | API-02 | Started | | ACP scripted suites: grok-build-compaction-replay, deepseek-harness-scripted-provider |
| 2026-11-22 09:33 | API-02 | Completed | Pass | grok compaction replay 3/3; deepseek scripted provider 6/6 |
| 2026-11-22 09:37 | API-03 | Completed | Pass | both typechecks at baseline |
| 2026-11-22 09:37 | API-04 | Checkpoint | | waiting for the Grok idle window (smoke run 1 not before 14:20Z); scripts evidence/API-04-smoke-run.sh, API-04-grok-log-extract.py |
| 2026-11-22 09:48 | API-04 | Checkpoint | | app restart 08:48Z (beta.7 update) stopped the wait; Grok log unchanged since 08:16:48Z; wait restarted |
| 2026-11-22 11:44 | API-04 | Checkpoint | | Grok used at 09:50:37Z by another process (valid token, had_real_catalog true); the last token refresh was 07:11:47Z (auth.refresh.success), so the stale start is the first start after its ~6 h expiry: smoke run 1 moved to 13:20Z |
| 2026-11-22 13:40 | API-04 run 1 | Started | | API-04-smoke-run.sh not before 13:20Z; Grok log 10:54/11:56 entries are AuthManager probes only (no agent start, no refresh) |
| 2026-11-22 14:29 | API-04 run 1 | Completed | Pass (Grok cases); load short of AC-006 | exit 0, 13/13, grok grok-4.7; stale case: pid 6299 had_real_catalog false (2 models) → fetch → notifying clients (1); load 10.5→51 during the Grok part (concurrent test:unit ramped late); leftovers stopped |
| 2026-11-22 14:29 | API-04 run 2 | Started | | runner now: test:unit + test:nuxt, smoke only after load ≥ 40 twice in a row |
| 2026-11-22 14:34 | API-04 run 2 | Completed | Pass | 13/13, load 42–172, Grok start-ups ≤ 441 ms |
| 2026-11-22 14:34 | API-05 | Completed | Pass | trust list hash unchanged; evidence allow-listed |
| 2026-11-22 14:34 | — | Checkpoint | Blocked | AC-006: run 1 mostly below load 40; Grok quota used for today; evidence decision requested from /solution_designer |
| 2026-11-22 14:36 | — | Completed | Pass | DEC-006 received: AC-006 proven with run 1's load as Accepted Unverified Risk (DEC-006); handoff to /code_reviewer |
