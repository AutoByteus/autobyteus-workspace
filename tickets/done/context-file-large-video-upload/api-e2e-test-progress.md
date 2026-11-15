# API/E2E Test Progress

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: `api-e2e-coverage-investigation.md` Planned Cases (same case IDs)

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 2026-11-15 14:27 | API-00 | Completed | Pass | Rebuilt the server from this worktree (`pnpm -C autobyteus-server-ts build`, exit 0): the earlier `dist` predated two source files; evidence/API-00-build-server.log |
| 2026-11-15 14:31 | API-01 | Started | | Built-server e2e (small limits) file tests/e2e/context-files/context-file-size-limits-built-server.e2e.test.ts, first run |
| 2026-11-15 14:32 | API-01 | Completed | Pass | 7 passed, 1 skipped (gated BS-10) |
| 2026-11-15 14:32 | API-02 | Started | | RUN_LARGE_CONTEXT_FILE_E2E=1, 1536 MiB + 2 GiB+1 MiB |
| 2026-11-15 14:32 | API-02 | Completed | Pass | first run failed only the sample-count assertion (sampler 250 ms too coarse for a 1.5 s upload, harness defect); interval set to 50 ms; rerun passed: RSS +102 MiB for 1536 MiB, +108 MiB for the refused 2 GiB+1 MiB |
| 2026-11-15 14:35 | API-03 | Started | | mobile-shell-probe --cases=MSP-53,MSP-54,MSP-55 first run, output /tmp/api-e2e-ws6/msp-run1 |
| 2026-11-15 14:35 | API-03 | Checkpoint | | run 1 stopped at stack start (machine has no corepack; added a corepack shim outside the repo); rerun as msp-run2 |
| 2026-11-15 14:38 | API-03 | Checkpoint | | run 2: MSP-53 Pass, MSP-54 Pass, MSP-55 Fail (cancel case: no progress seen in 30 s; case-code diagnosis added). MSP-53 strengthened to use the scripted CLI's context_files case (agent input and file hash); rerun as msp-run3 |
| 2026-11-15 14:50 | API-03 | Checkpoint | | run 3 failed on a variable-shadowing bug in my case code (MSP-53); run 4: MSP-53 Pass (agent opened the whole file, SHA-256 equal), MSP-54 Pass, MSP-55 Fail: harness defect (the setting cannot be deleted; "defaults" must be written as values 2048/25). run 4 hung in teardown, killed its own processes. Rerun as msp-run5 |
| 2026-11-15 14:52 | API-03 | Checkpoint | | run 5: MSP-53, 54 Pass; MSP-55 cancel Pass, drop Fail: Chrome's CDP offline mode does not end an in-flight XHR (harness limit). Replaced with a TCP forwarder in front of the node that resets every connection mid-body (a real link drop); rerun as msp-run6 |
| 2026-11-15 14:55 | API-03 | Checkpoint | | run 7 (MSP-55 alone): the drop-step upload had already finished (200) because Chrome's CDP throttle does not slow loopback; the forwarder now paces the upload direction itself (cancel Pass earlier only needed >0 %); rerun all three as msp-run8 |
| 2026-11-15 15:03 | API-03 | Checkpoint | | run 8 same MSP-55 drop failure: Chrome retries a POST once when a reused connection is reset, and the retry went through (200). Forwarder now keeps the link down (resets new connections) until restored; rerun as msp-run9 |
| 2026-11-15 15:09 | API-03 | Checkpoint | | run 10: MSP-53/54/55 all Pass; the probe's browser-error gate failed on two console lines of the deliberate link reset (case-code filter); filter extended; final rerun as msp-run11 |
| 2026-11-15 15:11 | API-03 | Completed | Pass | msp-run11: MSP-53, MSP-54, MSP-55 Pass, probe Pass, cleanup clean; evidence copied to evidence/API-03-* |
| 2026-11-15 15:11 | API-04 | Started | | composer probe --cases CF-014 first run |
| 2026-11-15 15:16 | API-04 | Completed | Pass | first runs failed on harness defects only: English-only selectors in zh-CN; the setting is not listed until it has a value (so the case adds it with the list's new-setting row); two deliberate console errors of the refused saves; final cf-run5 Pass |
| 2026-11-15 15:16 | API-05 | Completed | Pass | built autobyteus-ts + Gemini renderer on real files; evidence/API-05-* |
| 2026-11-15 15:16 | API-08 | Started | | server typecheck with the new e2e test file |
| 2026-11-15 15:17 | API-08 | Completed | Pass | production errors 0; test errors 1180 = baseline (the new file adds none) |
| 2026-11-15 15:19 | API-01, API-02 | Completed | Pass | rerun at the committed test file (de0250122): 7 passed 1 skipped; gated BS-10 passed, RSS +123 MiB (1536 MiB accepted), +135 MiB (2 GiB+1 MiB refused). API-09 architecture suite 13 files / 72 tests Pass |
