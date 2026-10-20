# API/E2E Test Progress

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: the coverage investigation's Planned Cases (same case IDs)

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 21:16 | AE-02 | Started | | `/private/tmp/tv-apie2e/run-e2e.sh base /private/tmp/tv-apie2e/home-base` in background; log /private/tmp/tv-apie2e/logs/base.log |
| 21:17 | AE-01 | Completed | Pass | v-full + v-nods created via built CLI; hashes in /private/tmp/tv-apie2e/hashes-initial.txt |
| 21:18 | AE-04 | Completed | Pass | 2 files passed, 5 tests; evidence AE-04-autobyteus-ts-key-identity-probe.log |
| 21:19 | AE-05 | Completed | Pass | 1 file, 2 tests; evidence AE-05-server-key-identity-probe.log. NOTE: its globalSetup reset tests/.tmp/autobyteus-server-test.db during AE-02 |
| 21:19 | AE-02 | Checkpoint | Not Tested | first AE-02 run aborted (DB reset by concurrent AE-05); log base-aborted.log; restarting. Rule: no server vitest while an E2E run is going |
| 21:19 | AE-02 | Started | | rerun: run-e2e.sh base, log /private/tmp/tv-apie2e/logs/base.log |
| 21:19 | AE-06 | Started | | grok-llm live file x3 (missing / strict / no selector) |
| 21:19 | AE-06 | Completed | Pass | evidence AE-06-autobyteus-ts-missing-and-strict.log |
| 21:28 | AE-02 | Completed | Pass | 91 passed / 91 skipped product files; only failure = my AE-05 probe file left in tests/e2e (expected without selector), moved out to /private/tmp/tv-apie2e/probes |
| 21:28 | AE-03 | Started | | run-e2e.sh sel with AUTOBYTEUS_TEST_VAULT=/private/tmp/tv-apie2e/v-full; log logs/sel.log; no other server vitest meanwhile |
| 21:37 | AE-03 | Completed | Pass | 182 files: 0 differ vs AE-02; v-full hash unchanged; evidence AE-03-* |
| 21:37 | AE-07 | Started | | collaborators RUN_DEEPSEEK_E2E=1 with v-nods, then strict |
| 21:37 | AE-07 | Completed | Pass | not strict: 36 skipped, exit 0, reason lines; strict: 3 failed LIVE_PROVIDER_UNAVAILABLE, exit 1 |
| 21:37 | AE-08 | Started | | test:e2e:real:preflight with v-full, then without selector |
| 21:38 | AE-08 | Completed | Pass | Vault line both ways; configured vs missing; hash unchanged; exit 0 both |
| 21:38 | AE-08b | Started | | test:e2e:real --scenarios=deepseek.llm with v-full (fake key -> 401) |
| 21:39 | AE-08b | Completed | Pass (expected failure) | Vault line; preflight passes; execute fails LIVE_E2E_PROVIDER_OPERATION_FAILED on fake key (not a pass); compaction file 0 tests skipped (F-08); exit=1 |
| 21:39 | AE-09 | Started | | isolated-app start --build with v-full; stdout /private/tmp/tv-apie2e/ae09-start.json, build stderr ae09-build.log |
| 21:46 | AE-09 | Completed | Pass | start --build w/ v-full: test vault line, 4 providers configured, UI save refused (toast + console SECRET_VAULT_READ_ONLY), GraphQL SECRET_VAULT_READ_ONLY, restart keeps vault, stop clean, hash unchanged; missing vault -> APP_EXITED_BEFORE_READY + TEST_VAULT_NOT_FOUND; no selector -> application database, none configured |
| 21:46 | AE-01 | Checkpoint | | root-script check: pnpm test-vault status |
| 21:47 | AE-01 | Completed | Pass | root-script status exit 0 appended |
| 21:47 | AE-10 | Completed | Pass | 39 files; 0 real / 0 synthetic / 0 env canary matches |
| 21:49 | AE-11..AE-14 | Completed | Not Tested | Blocked: no standing test vault (DEC-003); round result Blocked; resume = run AE-11..14 after the user's pnpm test-vault setup |
| 10-20 05:03 | — | Checkpoint | | HOLD from code_reviewer (2026-10-20): user requested a revision (autobyteus-ts reads AUTOBYTEUS_TEST_VAULT at its own key-source point); package returns via implementation + code review. No real-key runs on head 12a23e7b8a. On return: recheck AE-04/AE-06/AE-11/AE-12 and AC-005/009/013 against the revised package |
| 10-20 06:03 | — | Checkpoint | | ROUND 2 start (CRR-003, head a525ca02ac); hold lifted; no standing vault yet; plan in investigation § Round 2 Delta |
| 10-20 06:05 | AE-01 | Completed | Pass | round 2 vaults v-full/v-nods under /private/tmp/tv-r2 |
| 10-20 06:05 | AE-15 | Completed | Pass | 4 runs; evidence AE-15-plain-node-script-probe.log |
| 10-20 06:05 | AE-04 | Started | | vitest probe restored from evidence |
| 10-20 06:05 | AE-04 | Completed | Pass | gate: 2 passed (vault key, not env); no gate: selector removed -> MissingApiKeyError (expected control failure, 3 x); probe removed |
| 10-20 06:05 | AE-06 | Started | | grok strict + missing-dir vault failure |
| 10-20 06:05 | AE-06 | Completed | Pass | 4 runs (run 3 rerun after wrapper bug) |
| 10-20 06:05 | AE-17 | Started | | autobyteus-ts default suite, no selector -> /tmp/tv-r2/logs/ts-base.log |
| 10-20 06:06 | AE-17 | Completed | Pass | 413 files, 0 differ; 392 passed/21 skipped both |
| 10-20 06:06 | AE-02 | Started | | run-e2e.sh base (round 2), log /tmp/tv-r2/logs/base.log; nothing else on server meanwhile |
| 10-20 06:16 | AE-02 | Completed | Pass | 92 passed / 91 skipped (183), exit 0 |
| 10-20 06:16 | AE-03 | Started | | run-e2e.sh sel with v-full; log /tmp/tv-r2/logs/sel.log |
| 10-20 06:25 | AE-03 | Completed | Pass | 183 files, 0 differ; hash unchanged |
| 10-20 06:25 | AE-05 | Started | | server probe round 2 (+AC-018) |
| 10-20 06:26 | AE-05 | Completed | Pass | 3 passed incl. AC-018 check; probe moved out |
| 10-20 06:26 | AE-07 | Started | | collaborators with v-nods, then strict |
| 10-20 06:26 | AE-07 | Completed | Pass | 36 skipped exit 0; strict 3 failed exit 1 |
| 10-20 06:26 | AE-08 | Started | | preflight with/without selector + AE-08b single scenario fake key |
| 10-20 06:28 | AE-08 | Completed | Pass | vault line both ways; configured vs missing; hash unchanged; AE-08b fake key fails (not pass), compaction 0 tests skipped |
| 10-20 06:28 | AE-09 | Started | | isolated-app start --build (fresh build of a525ca02ac) with v-full; stdout /tmp/tv-r2/ae09-start.json |
| 10-20 06:37 | AE-09 | Completed | Pass | fresh build; same outcomes as round 1; evidence AE-09-* |
| 10-20 06:37 | AE-10 | Completed | Pass | 0 real / 0 synthetic / 0 env matches (scanner script excluded; it lists the fake values by design) |
| 10-20 06:39 | AE-11..AE-14 | Completed | Not Tested | round 2: still Blocked (no ~/.autobyteus-test/vault); result Blocked, API-REV-002 |
| 10-20 06:51 | AE-18 | Completed | Pass | standing vault ~/.autobyteus-test/vault from user-named source; 9 secrets; setup output: 0 real values |
| 10-20 06:51 | AE-11 | Started | | deepseek-llm live + setup isolation test, agent shell with inherited keys |
| 10-20 06:51 | AE-11 | Completed | Pass | 7 passed (6 DeepSeek live); hash unchanged |
| 10-20 06:51 | AE-12 | Started | | plain node probe live |
| 10-20 06:52 | AE-12 | Completed | Pass | real completion (length 2), no credential env, hash unchanged |
| 10-20 06:52 | AE-13 | Started | | test:e2e:real preflight + --scenarios=deepseek.llm with the standing vault |
| 10-20 06:53 | AE-13 | Completed | Pass | preflight exit 0; deepseek.llm executed, exit 0; hash unchanged |
| 10-20 06:54 | — | Completed | Pass | API-REV-003: AE-18, AE-11..AE-13 pass on the standing vault; AE-14 not requested; vault kept |
