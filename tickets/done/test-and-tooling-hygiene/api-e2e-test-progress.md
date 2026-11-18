# API/E2E Test Progress — test-and-tooling-hygiene (autobyteus-253)

Your own progress log while tests run. Read it first whenever you pick the run back up, or are unsure what has already run. Only add rows.

- Execution coverage report: `api-e2e-execution-coverage-report.md` (same folder)
- Planned cases: `api-e2e-coverage-investigation.md`, Planned Cases (same case IDs)
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/test-and-tooling-hygiene`, head `959b5cc048` (code `af81b3d7d2`)
- Raw logs while running: `/tmp/api253/` (excerpts copied into `evidence/` when a case completes)

| Time | Case ID | Event (`Started`/`Checkpoint`/`Completed`) | Result (`Pass`/`Fail`/`Blocked`/`Not Tested`) | Note (what is running and where, what to do next) |
| --- | --- | --- | --- | --- |
| 2026-10-24 10:56 | setup | Completed | Pass | `pnpm -C autobyteus-server-ts test:integration:prepare` rebuilt server `dist` + SDK dists at head (rc=0, `/tmp/api253/build.log`) |
| 2026-10-24 10:57 | API-10 | Started | — | `pnpm test:e2e` (whole `tests/e2e`, 192 files) in background, clean env, log `/tmp/api253/API-10-e2e.log` |
| 2026-10-24 10:58 | API-16 | Started | — | doc commands vs package.json |
| 2026-10-24 10:58 | API-16 | Completed | Pass | 6/6 scripts exist, 0 `ts-node`; `evidence/API-16-doc-commands.txt` |
| 2026-10-24 10:59 | API-17 | Started | — | find/grep dead tests |
| 2026-10-24 10:59 | API-17 | Completed | Pass | 0 files left, 0 config entries; `evidence/API-17-dead-tests.txt` |
| 2026-10-24 10:59 | API-12 | Started | — | guard mutation (temporary src file) |
| 2026-10-24 11:00 | API-12 | Completed | Pass | fails with temp caller, passes after removal; src clean; `evidence/API-12-guard-mutation.txt` |
| 2026-10-24 11:00 | API-14 | Started | — | real-chokidar probe `tests/tmp-probe/api253-watcher-coverage.test.ts` |
| 2026-10-24 11:02 | API-14 | Checkpoint | — | first version passed but B's edit check was not discriminating (FSEvents replayed pre-arm writes); tightened with quiet period + mark + C negative control |
| 2026-10-24 11:03 | API-14 | Completed | Pass | 3/3 runs, 5/5 cases each; `evidence/API-14-watcher-coverage-real-chokidar.txt` |
| 2026-10-24 11:04 | API-19 | Started | — | LM Studio suite, closed port, clean env |
| 2026-10-24 11:04 | API-19 | Completed | Pass | 7 skipped with reason, 0 passed; `evidence/API-19-lmstudio-closed-port.txt` |
| 2026-10-24 11:05 | API-18 | Started | — | vue-tsc in autobyteus-web, filtered to the five files |
| 2026-10-24 11:12 | API-10 | Completed | Pass | 99 files passed, 93 skipped (gated), 0 failed; 430 tests passed; rc=0; 9m56s |
| 2026-10-24 11:12 | API-10b | Started | — | 38 AGY-scripted gated E2E files (RUN_AGY_FAILURE_E2E=1, scripted CLI, no provider), background, log /tmp/api253/API-10b-agy.log |
| 2026-10-24 11:12 | API-18 | Completed | Pass | 0 errors in the five files (16 GB heap; extra errors are ignored build outputs); 49 tests pass; `evidence/API-18-vue-tsc-five-specs.txt` |
| 2026-10-24 11:13 | API-11 | Checkpoint | — | rc.4 half done (SDL of two builds written to /tmp/api253/sdl); rc.3 half waits for API-10b to finish (needs a node_modules symlink swap) |
| 2026-10-24 11:16 | API-21 | Checkpoint | — | clean clone of branch head at /tmp/api253/clone (959b5cc048, 0 changes); install waits for API-10b |
| 2026-10-24 11:18 | API-13 | Checkpoint | — | planned new case: live-refresh E2E file with RUN_AGY_FAILURE_E2E=1 (DCF-E2E-007 Creator journey, DCF-E2E-008); after API-10b |
| 2026-10-24 11:57 | API-10b | Checkpoint | — | 35/38 files passed; 3 files failed (4 cases): delegated-launch-config-defaults x2 (= FU-002 cause, lines 382/353), agy-native-image-multi-artifact-preview E-002/E-004, agy-skill-update-notice-roots SUN-E2E-003; both latter reproduce alone; finding causes (Rule 9) |
| 2026-10-24 12:00 | API-10b | Completed | Pass (in scope) | 35/38 files pass; 4 failed cases in 3 files, all causes found outside this branch: FU-002 (x2), FU-003 (SUN-E2E-003, proven by temp stub), FU-004 (image preview, owner-scoped reads 5d6127cee4); `evidence/API-10b-agy-scripted-e2e.txt` |
| 2026-10-24 12:00 | API-11 | Checkpoint | — | rc.3 half: swapping autobyteus-server-ts/node_modules/type-graphql symlink to rc.3, restore right after |
| 2026-10-24 12:00 | API-11 | Completed | Pass | 4 SDLs identical (sha256 81d67097…), rc.4 restored; `evidence/API-11-schema-sdl-rc3-vs-rc4.txt` |
| 2026-10-24 12:00 | API-13 | Started | — | live-refresh E2E with RUN_AGY_FAILURE_E2E=1 x5, /tmp/api253/API-13.out |
| 2026-10-24 12:03 | API-13 | Completed | Pass | 5/5 + 1 kept run, 10/10 cases incl. DCF-E2E-007/008; `evidence/API-13-live-refresh-with-agy.txt` |
| 2026-10-24 12:03 | API-15 | Started | — | /tmp/api253/scripts/api15.sh: 20 x yes, integ x40 then e2e x40; outputs /tmp/api253/API-15-{integ,e2e}.out; yes PIDs in /tmp/api253/API-15-yes-pids.txt |
| 2026-10-24 12:04 | API-21 | Checkpoint | — | clone: pnpm install --frozen-lockfile rc=0 (18.9 s), only type-graphql rc.4 in .pnpm; prepare + suites wait for API-15 |
| 2026-10-24 12:22 | API-15 | Checkpoint | — | integ RESULT pass=40 fail=0 of 40 (load avg 30-316); e2e loop started 12:22 |
| 2026-10-24 12:44 | API-15 | Completed | Pass | integ 40/40, e2e 40/40 under load; yes left 0; `evidence/API-15-ac004-loops-under-load.txt` |
| 2026-10-24 12:44 | API-21 | Started | — | clone prepare + suites, /tmp/api253/API-21-suites.log |
| 2026-10-24 13:03 | API-21 | Completed | Pass | clone: install rc0; typecheck rc0; unit 6736 passed; integration 421 passed; nuxt 4858; electron 237; guards rc0; node tests 15/15 (after fixing my own command form); `evidence/API-21-clean-clone-suites.txt` |
| 2026-10-24 13:04 | all | Completed | Pass | report, revision record written; committing |
