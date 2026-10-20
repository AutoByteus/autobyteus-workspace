# API/E2E Test Progress

Working log while tests run. Only add rows.

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: the coverage investigation's Planned Cases (same case IDs)

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 2026-10-20 15:00 | (setup) | Completed | — | Packaged build `pnpm -C autobyteus-web build:electron:mac` at d76332c669 (code c42bf2abc4), exit 0, 5m30s; log /tmp/sun-api-e2e/build.log |
| 2026-10-20 15:22 | API-01 | Started | — | full server unit suite in background, log /tmp/sun-api-e2e/API-01.log |
| 2026-10-20 15:25 | API-08 | Started | — | pnpm -C autobyteus-web exec vitest run __tests__/app.spec.ts |
| 2026-10-20 15:26 | API-08 | Completed | Pass | 6 passed; mutation control fails as expected |
| 2026-10-20 15:27 | API-13 | Started | — | isolated-app start --from-worktree --keep --test-update-feed http://127.0.0.1:58466 (instance A) |
| 2026-10-20 15:28 | API-13 | Completed | Pass | feed checked by packaged isolated build; app row 1.5.7-beta.4→1.5.8, notes, no Release page link, no card, no toast |
| 2026-10-20 15:28 | API-09 | Started | — | instance A: import real GitHub package + skill via renderer GraphQL; connection sampler on pids 73531 (server), 69819 (main) |
| 2026-10-20 15:32 | API-01 | Completed | Pass | 757 passed, 4 skipped files; 6224 tests passed |
| 2026-10-20 15:32 | API-09 | Checkpoint | — | first pass 13:30:55 created both real-GitHub notifications; pill 3 updates sky-700 without reload; compare links 200; panel still open on instance A2 (iso-58636-d7b5) |
| 2026-10-20 15:32 | API-10 | Started | — | instance A2: skill Update → Cancel; then confirm; package Update |
| 2026-10-20 15:33 | API-10 | Completed | Pass | skill Cancel no change; confirm → updating → handled 8c307f3; package → handled 074dc24, row UP_TO_DATE; codeload only after presses |
| 2026-10-20 15:33 | API-09 | Completed | Pass | (evidence compiled after API-11) |
| 2026-10-20 15:33 | API-11 | Started | — | live Clear from another client, then restart persistence on A2 |
| 2026-10-20 15:35 | API-11 | Completed | Pass | live Clear from other client removed row w/o reload; restart kept app read+waiting, package handled, skill cleared; UI Clear + restart → [] |
| 2026-10-20 15:35 | API-12 | Started | — | Update checks card on A2 |
| 2026-10-20 15:39 | API-12 | Completed | Pass | off: no request 79 s after start, on-open check notifies; on + restart: first pass checks the due skill only |
| 2026-10-20 15:40 | API-02..07,17,18 | Started | — | server E2E update-notifications-live (first run) |
| 2026-10-20 15:49 | API-02..07,17,18 | Completed | Pass | 3×8/8 after harness fix (schema built once per process, type-graphql paramsCache cause) and corrected API-07 expectation |
| 2026-10-20 15:49 | API-01b | Started | — | existing GitHub package/skill E2E suites, clean env |
| 2026-10-20 16:05 | API-01b | Completed | Pass | 45 passed on 5/8 HEAD runs; DCF-E2E-002 intermittent on HEAD 3/8 and BASE 1/8 (identical assertion) → pre-existing, FU-003 |
| 2026-10-20 16:06 | API-14 | Started | — | copy of the worktree build with bundle id com.autobyteus.app.apie2e, cache autobyteus-updater-apie2e, ad-hoc re-signed; feed-b |
| 2026-10-20 16:09 | API-14 | Completed | Pass | Download 0→100%→downloaded, Install and restart offered; zip only after press; user caches unchanged; Install not pressed (safety) |
| 2026-10-20 16:09 | API-15 | Started | — | isolated-app start --from-worktree (no --test-update-feed) |
| 2026-10-20 16:10 | API-15 | Completed | Pass | disabled state, notification null, no pill/card/toast, 0 updater lines |
