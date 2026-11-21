# API/E2E Test Progress

| Time | Case | Status | Result | Notes |
| --- | --- | --- | --- | --- |
| 2026-11-21 04:05 | API-00 | Started | | server build at 56c61c3ecb |
| 2026-11-21 04:05 | API-00 | Completed | exit 0 | |
| 2026-11-21 04:06 | API-02 | Started | | personal-settings run 1 |
| 2026-11-21 04:10 | API-02 | Completed | Pass | personal-settings run 1, exit 0 |
| 2026-11-21 04:10 | API-02 | Started | | personal-settings run 2 |
| 2026-11-21 04:13 | API-02 | Completed | Pass | personal-settings run 2, exit 0 |
| 2026-11-21 04:13 | API-02 | Started | | personal-settings run 3 |
| 2026-11-21 04:17 | API-02 | Completed | Pass | personal-settings run 3, exit 0 |
| 2026-11-21 04:17 | API-03 | Started | | agent-semantic-memory |
| 2026-11-21 04:20 | API-03 | Completed | Fail | agent-semantic-memory, exit 1 |
| 2026-11-21 04:20 | API-04 | Started | | live-refresh run 1 |
| 2026-11-21 04:24 | API-04 | Completed | Fail | live-refresh run 1, exit 1 |
| 2026-11-21 04:24 | API-04 | Started | | live-refresh run 2 |
| 2026-11-21 04:29 | API-04 | Completed | Fail | live-refresh run 2, exit 1 |
| 2026-11-21 04:29 | API-04 | Started | | live-refresh run 3 |
| 2026-11-21 04:31 | API-04 | Completed | Fail | live-refresh run 3, exit 1 |
| 2026-11-21 04:31 | API-01 | Started | | application-import-codex-launch |
| 2026-11-21 04:32 | API-01 | Completed | Fail | application-import-codex-launch, exit 1 |
| 2026-11-21 04:32 | API-05 | Started | | grok-build-runtime-replay |
| 2026-11-21 04:33 | API-05 | Completed | Fail | grok-build-runtime-replay, exit 1 |
| 2026-11-21 04:33 | API-05 | Started | | grok-build-compaction-replay |
| 2026-11-21 04:34 | API-05 | Completed | Pass | grok-build-compaction-replay, exit 0 |
| 2026-11-21 04:34 | API-05 | Started | | own-stream-turns-read-once |
| 2026-11-21 04:35 | API-05 | Completed | Pass | own-stream-turns-read-once, exit 0 |
| 2026-11-21 04:39 | API-03 | Rerun | Pass | 10/10 incl. SM-12; run 1's SM-04 error not captured |
| 2026-11-21 04:39 | API-05 | Checkpoint | FAIL (product) | Grok catalog: bound timer fired at 7720 ms for a 3000 ms bound with exitCode null; exit came at 7730 ms with 0 (API-05b): FU-008's exited check misses a timer delayed by a blocked loop |
| 2026-11-21 04:39 | API-01 | Restarted | | test:integration:prepare first (Brief Studio package missing in this worktree) |
| 2026-11-21 04:40 | API-01 | Completed | Pass | IC-01..03 3/3 after prepare |
| 2026-11-21 04:40 | API-09 | Started | | whole web unit suite (test:nuxt run + test:electron run) |
| 2026-11-21 04:48 | API-09 | Completed | Pass for this change | nuxt 790 files 5954 tests pass; electron 1 failed (PortOwnerInspectorFaults receipt not written before its 1000 ms deadline under suite load; 11/11 alone twice; no electron change) |
| 2026-11-21 04:48 | API-10 | Started | | rendered probe |
| 2026-11-21 04:49 | API-10 | Completed | Pass | 41/41 incl. SMV-100 (274 bytes, shortened), SMV-103..105, SMV-091 |
| 2026-11-21 04:49 | API-11 | Started | | isolated desktop instance (--build), FU-002 journey |
| 2026-11-21 04:56 | API-11 | Completed | Pass | desktop journey 5/5 (EL-001..005); stopped, ports released, data root removed, not listed |
| 2026-11-21 04:56 | API-06 | Started | | server test:unit |
| 2026-11-21 05:09 | API-06 | Completed | Pass | 1039 files, 8626 tests |
| 2026-11-21 05:09 | Round 1 | Closed | Fail | AC-008 (API-05b); report and API-REV-001; failure-origin review requested |
| 2026-11-21 05:19 | Round 2 | Started | | IR-002 / SR-002 at 3b39828501 (records a4ed4455fa); plan in the investigation's Round 2 |
| 2026-11-21 05:20 | API-00 | Completed | exit 0 | round 2 |
| 2026-11-21 05:20 | API-05 | Started | | diagnostic repeats (temporary print in probe-time-bound.ts) |
| 2026-11-21 05:25 | API-05 | Checkpoint | | diagnostic repeats done; source restored |
| 2026-11-21 05:26 | API-05 | Completed | Pass | grok-build-runtime-replay run 1 |
| 2026-11-21 05:26 | API-05 | Completed | Pass | grok-build-compaction-replay run 1 |
| 2026-11-21 05:27 | API-05 | Completed | Pass | own-stream-turns-read-once run 1 |
| 2026-11-21 05:27 | API-05 | Completed | Pass | grok-build-runtime-replay run 2 |
| 2026-11-21 05:28 | API-05 | Completed | Pass | grok-build-compaction-replay run 2 |
| 2026-11-21 05:29 | API-05 | Completed | Pass | own-stream-turns-read-once run 2 |
| 2026-11-21 05:29 | API-05 | Completed | Pass | grok-build-runtime-replay run 3 |
| 2026-11-21 05:30 | API-05 | Completed | Fail | grok-build-compaction-replay run 3 |
| 2026-11-21 05:31 | API-05 | Completed | Pass | own-stream-turns-read-once run 3 |
| 2026-11-21 05:32 | API-03 | Completed | Pass | agent-semantic-memory run 1 |
| 2026-11-21 05:33 | API-03 | Completed | Pass | agent-semantic-memory run 2 |
| 2026-11-21 05:34 | API-03 | Completed | Pass | agent-semantic-memory run 3 |
| 2026-11-21 05:38 | API-05 | Completed | Pass | diagnostic x10: 7 late timer firings (4.1-22.5 s for a 3 s bound), each exitedAtFire false / exitedAtDecision true, all pass; clean x3: runtime replay 10/10 x3, own-stream 2/2 x3, compaction suite hook failed once (afterAll app.close blocked the loop, API-05d) -> baseline fix adda171de8, 3/3 x3 (API-05e) |
| 2026-11-21 05:38 | API-03 | Completed | Pass | SM file 10/10 x3 (SM-04 included), CF-05 |
| 2026-11-21 05:39 | API-07 | Started | | test:integration |
| 2026-11-21 05:52 | API-07 | Completed | Pass for this change | 505 passed / 9 failed: 8 file-system-watcher self-labelled ENVIRONMENT/INCONCLUSIVE, package-auto-refresh AC-012 (restore event not delivered): no OS file events on this host |
| 2026-11-21 05:52 | API-08 | Started | | root pnpm test:e2e |
| 2026-11-21 06:36 | API-08 | Checkpoint | | 118 passed / 10 failed files; the 2 RUNTIME_PROBE_TIMED_OUT lines are available-agent-runtimes' deliberate AGY hang (file passed); rerunning the 10 one at a time |
| 2026-11-21 06:45 | API-13 | Started | | Linux container: live-refresh x3, websocket-lifecycle x3 |
| 2026-11-21 06:51 | API-13 | Completed | see log | Linux container runs done |
| 2026-11-21 06:56 | API-07 | Completed | Pass for this change | (see report) |
| 2026-11-21 06:56 | API-08 | Completed | Pass for this change | 118 passed / 10 failed; one at a time 4 pass; rest classified, none on a changed path; FU-002 |
| 2026-11-21 06:56 | API-13 | Completed | Pass | Linux live-refresh 10/10 x3; websocket-lifecycle WATCHER_UNAVAILABLE = container without server build (my setup) |
| 2026-11-21 06:56 | Round 2 | Closed | Pass | API-REV-002; to delivery |
