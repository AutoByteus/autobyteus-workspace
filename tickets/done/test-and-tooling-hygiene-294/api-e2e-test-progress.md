# API/E2E Test Progress — test-and-tooling-hygiene-294

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: the coverage investigation's Planned Cases (same case IDs)

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 2026-10-27 20:55 | API-01 | Started | | clean clone to $TMPDIR/ab294-clone, frozen install, prebuild, nuxt prepare |
| 2026-10-27 20:56 | API-01 | Completed | Pass | frozen install, prebuild, nuxt prepare exit 0; Brief Studio file fails naming the package and the prepare command |
| 2026-10-27 20:56 | API-02 | Started | | clone: server typecheck |
| 2026-10-27 20:57 | API-02 | Completed | Pass | |
| 2026-10-27 20:57 | API-03 | Started | | clone: server test:unit (background) |
| 2026-10-27 20:58 | API-10 | Completed | Pass | greps 0 matches; release-manifest hits only in committed old build logs under test-results/ |
| 2026-10-27 20:58 | API-26 | Completed | Pass | doc lists all 12 providers; TESTING.md rule in ef5a18f4d4 |
| 2026-10-27 21:10 | API-03 | Completed | Pass | 864 passed / 5 skipped files; 7 architecture + 7 journal files collected; SD-07's 3 tests pass |
| 2026-10-27 21:10 | API-04 | Started | | clone: test:integration:prepare then test:integration (background) |
| 2026-10-27 21:15 | API-04 | Checkpoint | | run 1: 1 failed (retired-PTM startup test, stale built-in list since 930597c730); baseline fix dfef14abc6; rerun on clone |
| 2026-10-27 21:19 | API-04 | Completed | Pass | run 2 at dfef14abc6: 80 passed, 20 skipped files |
| 2026-10-27 21:19 | API-05 | Started | | clone: web test:nuxt --run, then API-06 test:electron (background, serial) |
| 2026-10-27 21:23 | API-05 | Completed | Pass |  Test Files 666 passed (666) |
| 2026-10-27 21:23 | API-06 | Completed | Fail |  Test Files 1 failed | 47 passed | 1 skipped (49) |
| 2026-10-27 21:24 | API-06 | Checkpoint | | run 1 failed: Electron 42 lazy binary download raced between two workers on the fresh clone (EEXIST); rerun |
| 2026-10-27 21:24 | API-06 | Completed | Pass | run 2: 48 passed, 1 skipped; run 1 cause recorded as FU-011 |
| 2026-10-27 21:24 | API-07 | Started | | clone: web typecheck (no vitest running) |
| 2026-10-27 21:25 | API-07 | Completed | Pass | |
| 2026-10-27 21:25 | API-08 | Started | | clone: three web guards |
| 2026-10-27 21:25 | API-08 | Completed | 3/3 exit 0 | |
| 2026-10-27 21:25 | API-09 | Started | | clone: gateway install/build/typecheck/test, then docker build |
| 2026-10-27 21:26 | API-09 | Completed | Pass | gateway build/typecheck/test 86 files pass; docker build exit 0; image removed |
| 2026-10-27 21:26 | API-13 | Started | | worktree: server build |
| 2026-10-27 21:27 | API-13 | Completed | Pass | |
| 2026-10-27 21:27 | API-14 | Started | | probe output /Users/normy/autobyteus_org/autobyteus-worktrees/test-and-tooling-hygiene-294/autobyteus-web/test-results/ab294-api14-agent-runtimes-212717 |
| 2026-10-27 21:29 | API-14 | Completed | Pass | result Pass; ARP-08 Not applicable; cleanup all terminated/removed |
| 2026-10-27 21:29 | API-15 | Started | | projects probe, output /Users/normy/autobyteus_org/autobyteus-worktrees/test-and-tooling-hygiene-294/autobyteus-web/test-results/ab294-api15-projects-212943 |
| 2026-10-27 21:31 | API-15 | Completed | Pass | 17/17 Pass; PT-E2E-013 meaningSearch UNAVAILABLE; node-a refused huggingface.co x2 |
| 2026-10-27 21:32 | API-16 | Started | | tests/e2e/app-data-migrations/team-run-v1-production-upgrade.e2e.test.ts |
| 2026-10-27 21:32 | API-16 | Completed | Pass |  Tests 4 passed (4) |
| 2026-10-27 21:32 | API-17 | Started | | tests/e2e/projects/delegated-launch-config-defaults.e2e.test.ts |
| 2026-10-27 21:33 | API-17 | Completed | Pass |  Tests 3 passed (3) |
| 2026-10-27 21:33 | API-18 | Started | | tests/e2e/runtime/agy-skill-update-notice-roots.e2e.test.ts |
| 2026-10-27 21:34 | API-18 | Completed | Pass |  Tests 3 passed (3) |
| 2026-10-27 21:34 | API-19 | Started | | tests/e2e/runtime/agy-native-image-multi-artifact-preview.e2e.test.ts |
| 2026-10-27 21:35 | API-19 | Completed | Pass |  Tests 2 passed (2) |
| 2026-10-27 21:35 | API-20 | Started | | worktree root: env -i pnpm test:e2e (background), HOME=/private/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/tmp.JeibQQDjy8 |
| 2026-10-28 03:32 | API-20 | Checkpoint | | run 1 (full pnpm test:e2e) stopped at the 2 h tool limit after 62/207 files: one file hung silently; workspaces-graphql 4 failed (stale config double since d384968700) -> baseline fix a001e645c7 |
| 2026-10-28 03:32 | API-20 | Checkpoint | | run 2: per-file runner (/tmp/ab294-scripts/run-e2e-per-file.mjs), clean env, 900 s deadline per file; summary evidence/API-20-server-e2e-per-file.log |
| 2026-10-28 05:34 | API-20 | Checkpoint | | run 2 stopped at the 2 h tool limit at index 99/207; the Mac slept 03:32-05:16 (pmset), inflating times; failures: index 1 and 8 started at sleep boundaries (rerun), index 21 stale built-in folder list -> baseline fix bce2f8b4e3; resuming from 99 under caffeinate -is |
| 2026-10-28 05:52 | API-20 | Completed | Pass | 207/207 files: 204 PASS + index 1, 8 PASS on awake rerun + index 21 PASS after baseline fix bce2f8b4e3 (API-20b); 0 TIMEOUT |
| 2026-10-28 05:52 | API-21 | Started | | RUN_CODEX_E2E=1 tests/e2e/runtime/codex-standalone-send-message-global-routing.e2e.test.ts, CODEX_HOME=/private/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/ab294-codex-home.ibD5k0FEao |
| 2026-10-28 05:52 | API-21 | Completed | Pass | 1 passed; DELIVERED then TARGET_AGENT_RUN_NOT_ACTIVE |
| 2026-10-28 05:52 | API-22 | Started | | RUN_CODEX_E2E=1 tests/integration/runtime-management/codex/client/codex-app-server-client-manager.integration.test.ts |
| 2026-10-28 05:53 | API-22 | Completed | Pass | 2 passed |
| 2026-10-28 05:53 | API-23 | Started | | RUN_CLAUDE_E2E=1 claude-sdk-client.integration -t cancels a queued |
| 2026-10-28 05:56 | API-23 | Completed | Pass | run 1-2 failed on the stale helper (openStreamingSession/close removed by 028cca2312); baseline fix e60f4d89a0; run 3: 2 passed; run 4 whole file 5 passed |
| 2026-10-28 05:56 | API-24 | Started | | test:e2e:electron:isolation (builds via build:electron:mac), output /Users/normy/autobyteus_org/autobyteus-worktrees/test-and-tooling-hygiene-294/autobyteus-web/test-results/ab294-api24-electron-isolation-055645 |
| 2026-10-28 06:04 | API-24 | Checkpoint | | run 1: build PASS with [typecheck] PASS in chain; E2E-PKG-001..003 pass, 004 fail (occupied-port expects removed 'is unavailable' text, since f34ad8749f); probe expectation updated; run 2 --skip-build on the run-1 package |
| 2026-10-28 06:05 | API-24 | Completed | Pass | run 2: E2E-PKG-001..005 pass, failures 0; baseline fix 6af8819ede |
| 2026-10-28 06:06 | API-25 | Started | | isolated-app start --from-worktree (package of API-24) |
| 2026-10-28 06:10 | API-25 | Completed | Pass | D-01..D-06 Pass, 0 leftover classes, 0 console errors; instance stopped |
| 2026-10-28 06:14 | — | Completed | Pass | round 1 result recorded; documents and evidence committed next |
| 2026-10-28 07:56 | API-27 | Checkpoint | | round 2 diagnosis (before planning): CI macOS jobs of 40640209395 ended vue-tsc by SIGABRT (not TS2307); local: vue-tsc OOMs at heap caps <=3072 MB with contracts built; and the gate sweeps in resources/server + electron-dist after a local build. Build outputs restored. |
| 2026-10-28 07:56 | API-31 | Completed | Pass | macOS ARM64 + Intel: vue-tsc SIGABRT; Linux x64/ARM64 + Windows: 292 errors (TS2307) |
| 2026-10-28 07:57 | API-27 | Started | | fresh clone /private/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/ab294r-clone.NhA2wmjY8t, CI order |
| 2026-10-28 07:58 | API-27 | Completed | Pass | PASS 0 production, 298/139 |
| 2026-10-28 07:58 | API-28 | Started | | same clone, NODE_OPTIONS=--max-old-space-size=1792 (+ 2048, 3072, 4096 bracket) |
| 2026-10-28 08:01 | API-28 | Completed | Fail | 1792 and 2048 MB: SIGABRT exactly as the CI macOS jobs; 3072, 4096: PASS |
| 2026-10-28 08:01 | API-29 | Started | | same clone: test:nuxt then test:electron |
| 2026-10-28 08:05 | API-29 | Checkpoint | | run 1 (install only, no prebuild): test:nuxt 2 failed = the FU-003 cross-package specs (need autobyteus-ts dist); test:electron 1 failed = FU-011 Electron download race; run 2 in TESTING.md order (prebuild first) |
| 2026-10-28 08:09 | API-29 | Completed | Pass | run 2 (TESTING.md order): test:nuxt 666 passed; test:electron 48 passed 1 skipped |
| 2026-10-28 08:09 | API-30 | Started | | worktree gate with resources/server + electron-dist from API-24 present |
| 2026-10-28 08:10 | API-30 | Completed | Fail | gate FAIL: Nuxt vue-tsc SIGABRT (resources/server + electron-dist swept in; not excluded) |
| 2026-10-28 08:12 | — | Completed | Fail | round 2 result recorded (F-1 macOS heap, F-2 build outputs in scope); committing |
| 2026-10-28 08:23 | API-30 | Started | | round 3 rerun: worktree gate with both build trees, default and NODE_OPTIONS=1792 |
| 2026-10-28 08:25 | API-30 | Completed | Pass | round 3: PASS with both build trees; PASS under NODE_OPTIONS 1792 |
| 2026-10-28 08:25 | API-28 | Started | | round 3: fresh clone /private/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/ab294s-clone.mG9pqOimcI, CI order; gate default + NODE_OPTIONS 1792 |
| 2026-10-28 08:27 | API-28 | Completed | Pass | round 3: default PASS; NODE_OPTIONS 1792 PASS |
| 2026-10-28 08:27 | API-29 | Started | | round 3: same clone, prebuild then test:nuxt |
| 2026-10-28 08:33 | API-29 | Completed | Pass | round 3: test:nuxt 666 passed |
| 2026-10-28 08:33 | API-32 | Started | | docker node:22-bookworm --memory=7g --memory-swap=7g: clone, install, control + gate |
| 2026-10-28 08:40 | API-32 | Completed | Pass | 7 GB container: default heap 2096 MB; control vue-tsc aborts (FATAL heap) like CI macOS; gate PASS, peak anon 3.12 GB, oom_kill 0; container, volume, clone, bundle removed |
| 2026-10-28 08:41 | — | Completed | Pass | round 3 result recorded (95.0%); committing |
