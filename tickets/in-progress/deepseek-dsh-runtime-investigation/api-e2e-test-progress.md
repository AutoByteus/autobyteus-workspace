# API/E2E Test Progress

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: the coverage investigation's Planned Cases (same case IDs)

| Time | Case ID | Event (`Started`/`Checkpoint`/`Completed`) | Result (`Pass`/`Fail`/`Blocked`/`Not Tested`) | Note (what is running and where, what to do next) |
| --- | --- | --- | --- | --- |
| 2026-11-06 09:24 | API-06 | Started | | `pnpm -C autobyteus-web test:nuxt` in background; log evidence/api-e2e/API-06-web-test-nuxt.log |
| 2026-11-06 09:33 | API-06 | Completed | Pass | 5085 passed, 1 failed (voice-input integration test timeout at 5 s; cause: real worker processes under suite load; baseline fix + single-test rerun pass). Next: API-01 typecheck |
| 2026-11-06 09:33 | API-01 | Started | | server typecheck with the new suites |
| 2026-11-06 09:34 | API-01 | Completed | Pass | typecheck PASS, test errors 1182 = baseline |
| 2026-11-06 09:34 | API-10…API-16 | Started | | scripted-provider suite, first run (debug) |
| 2026-11-06 09:38 | API-10…API-16 | Checkpoint | | run1: 4 pass; 2 test bugs (stall waited for first terminal; process match by wrapper path matched nothing). Fixed; rerunning the file (helper used by API-10/15/16 and afterAll changed) |
| 2026-11-06 09:40 | API-10…API-16 | Checkpoint | | run2: API-11…API-15 Pass; API-16 found 0 processes: pgrep pattern '--profile acp' parsed as option (also made API-10 'no dsh started' + afterAll vacuous). Fixed; rerunning API-10 and API-16 only (-t) |
| 2026-11-06 09:41 | API-10…API-16 | Completed | Pass | final: API-11…15 in run2 log, API-10/16 in rerun log; RSS 330-351 MB per dsh |
| 2026-11-06 09:41 | API-25 | Started | | server build (dist) then standalone-host suite |
| 2026-11-06 09:42 | API-25 | Completed | Pass | availability disabled with reason; launch refused PROVIDER_RELAY_UNAVAILABLE; dshStarts [] |
| 2026-11-06 09:42 | API-20…API-22 | Started | | collaboration live suite (flash, test vault), background |
| 2026-11-06 09:45 | API-20…API-22 | Checkpoint | | run1: API-21 Org Pass; API-20 Team relay+restore ran but reply read missed SEGMENT_CONTENT_BATCH (test bug); API-22 real agy used since ANTIGRAVITY_CLI_COMMAND is read at module import (test bug). Fixed; rerunning API-20 and API-22 (-t) |
| 2026-11-06 09:47 | API-20…API-22 | Completed | Pass | API-21 run1 log; API-20/22 rerun log |
| 2026-11-06 09:47 | API-07 | Started | | pnpm -C autobyteus-web test:electron |
| 2026-11-06 09:48 | API-07 | Completed | Pass | 60 files / 407 tests passed |
| 2026-11-06 09:48 | API-35 | Started | | fresh clone /tmp/ab387-api35-fresh at 145ae81d06; frozen install; hygiene; licensing; build:electron:mac -- --arm64 (background) |
| 2026-11-06 09:57 | API-35 | Completed | Pass | fresh clone 145ae81d06: frozen install, hygiene, licensing, guards, typecheck PASS, prepare-server, builds, packaging (GITHUB_REPOSITORY as on runner) -> DMG+zip |
| 2026-11-06 09:57 | API-30 | Started | | isolated instance of the fresh-clone app; state A installed+key set |
| 2026-11-06 10:05 | API-30 | Completed | Pass | A: API key set; B: API key not set + hint; C: Not installed + install link; instances stopped, data roots and fresh clone removed. FU-002 recorded (prerelease version shown as x.y.z) |
| 2026-11-06 10:05 | API-08 | Started | | dsh found as 'dsh' on PATH (no DEEPSEEK_HARNESS_COMMAND): live suite case 1 |
| 2026-11-06 10:06 | API-08 | Completed | Pass | models + row SIGNED_IN with dsh from PATH |
