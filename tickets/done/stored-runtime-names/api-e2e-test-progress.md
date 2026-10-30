# API/E2E Test Progress

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: `api-e2e-coverage-investigation.md` (Planned Cases)

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 2026-10-30T18:45:08Z | build | Completed | Pass | pnpm -C autobyteus-server-ts build at dd56f6de6c, exit 0 (/tmp/stored-runtime-names-build.log) |
| 2026-10-30T18:46:05Z | API-02/API-03 | Started | — | new startup E2E, first run (built dist at dd56f6de6c) |
| 2026-10-30T18:47:30Z | API-02/API-03 | Completed | Pass | 2/2; mutations M1-M3 fail the matching journeys (M2 needed a stronger fixture); evidence API-02-03 |
| 2026-10-30T18:47:32Z | API-04 | Started | — | scripted AGY auto_compaction (RUN_AGY_FAILURE_E2E) |
| 2026-10-30T18:48:30Z | API-04 | Completed | Pass | scripted AGY auto_compaction 1/1; manifest assertion added; mutation (payload spells old label) fails it |
| 2026-10-30T18:50:13Z | API-05 | Completed | Pass | Grok replay 3/3; manifest assertion added; mutation fails all 3 |
| 2026-10-30T18:50:13Z | API-06 | Started | — | new Memory Sync E2E first run |
| 2026-10-30T18:51:00Z | API-06 | Completed | Pass | 1/1; S1,S2 mutations fail it |
| 2026-10-30T18:51:00Z | API-07 | Started | — | existing memory-sync suite (it rebuilds dist with tsc itself) |
| 2026-10-30T18:51:36Z | API-07 | Completed | Pass | memory-sync folder 3/3 |
| 2026-10-30T18:51:36Z | API-01 | Started | — | sanity rerun of migration/architecture/writer unit suites |
| 2026-10-30T18:54:36Z | API-01 | Completed | Pass | server focused 203 files/2076 tests, library memory 42 files/312 tests; same as IMP-03 |
| 2026-10-30T18:54:41Z | API-08 | Started | — | live Grok compaction (RUN_GROK_E2E=1, temp GROK_HOME by the suite, real HOME for auth symlink) |
| 2026-10-30T18:58:20Z | API-08 | Checkpoint | Fail | live Grok 1.0.70: 'Timed out waiting for automatic compaction start' after dump B (no COMPACTION_STATUS reached the WebSocket); before any assertion on runtime_kind. Diagnosing (Rule 9) with GROK_E2E_EVIDENCE_DIR rerun |
| 2026-10-30T19:00:36Z | API-08 | Completed | Pass (on rerun) | first run failed before any runtime_kind assertion (no compaction event emitted by the live provider; cause not isolated); rerun 1/1 pass 95 s including the grok_build assertion. AGY live not run (see report) |
