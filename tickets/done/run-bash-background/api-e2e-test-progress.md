# API/E2E Test Progress

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: the coverage investigation's Planned Cases (same case IDs)

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 2026-11-10 12:08 | setup | Completed | Pass | `pnpm -C autobyteus-server-ts test:integration:prepare` at `b09e5fdbb7` (code = `ddd594d07b`): exit 0, prerequisites present |
| 2026-11-10 12:20 | API-01 | Started | | `pnpm -C autobyteus-server-ts test:integration`, log `/tmp/api338/API-01.log`; next: write the transport suite meanwhile (no other heavy run) |
| 2026-11-10 12:14 | API-01 | Completed | Pass | 90 passed, 20 skipped files; 524 tests; evidence/API-01-server-integration.log |
| 2026-11-10 12:15 | API-02 | Started | | busy-run-stop-now e2e, evidence dir evidence/API-02-busy-run-stop-now |
| 2026-11-10 12:15 | API-01 | Checkpoint | | note: the API-01 Started row says 12:20; the run actually started 12:10:15 (log header) |
| 2026-11-10 12:15 | API-02 | Completed | Pass | 2/2; receipts in evidence/API-02-busy-run-stop-now/ |
| 2026-11-10 12:15 | API-03 | Started | | native standalone host shutdown e2e |
| 2026-11-10 12:16 | API-03 | Checkpoint | | run 1 failed: stale fixture assertion "ordinary agent end retains previews" (old behavior, REQ-009 changed it); fixture updated; rerun |
| 2026-11-10 12:17 | API-03 | Completed | Pass | rerun after fixture update: 1/1; run end stopped turn-1 commands in 757 ms |
| 2026-11-10 12:17 | API-04 | Started | | transport suite, BGT-01 only (-t BGT-01) to shake out the harness |
| 2026-11-10 12:29 | API-04 | Checkpoint | | debug runs: harness gql lacked the owner credential (baseline fix in native-runtime-live-harness.ts); notice-turn helper fixed; BGT-06 tag filter fixed (wrapper argv); BGT-09 rewritten (teammate delegation is refused: COLLABORATION_SELF_TARGET_REJECTED) and passed alone |
| 2026-11-10 12:29 | API-17 | Completed | Pass | server typecheck: production 0; test files 1182 = baseline |
| 2026-11-10 12:29 | API-04..API-12 | Started | | authoritative full transport suite run on the final test code |
| 2026-11-10 12:34 | API-04..API-12 | Completed | Pass | 9/9 on the final test code (commit e4e106f93a); evidence/API-04-12-transport/ |
| 2026-11-10 12:34 | API-13 | Started | | live suite, Anthropic + OpenAI, test vault |
| 2026-11-10 12:36 | API-13 | Checkpoint | | run 1: Anthropic Pass; OpenAI two notices because gpt-5.4-mini started the builds 4.6 s apart (ends 4.7 s apart: separate notices per REQ-004, each end once); test assumption fixed (builds released together after turn 1); evidence/API-13-live-run1-spaced-ends/; rerun both |
| 2026-11-10 12:37 | API-13 | Completed | Pass | rerun: 2/2 (Anthropic, OpenAI); both used tail -n 3 <outputFile>; evidence/API-13-live/ |
| 2026-11-10 12:37 | API-14 | Started | | last-lines probe, macOS host then Linux container |
| 2026-11-10 12:38 | API-14 | Completed | Pass | macOS bash 3.2 200/200, Linux bash 5.2 200/200: lastLines ends with the last line and equals the file tail |
| 2026-11-10 12:38 | API-15 | Started | | isolated desktop instance build (isolated-app start --build) for the panel journey |
| 2026-11-10 12:48 | API-15 | Completed | Pass | desktop: native row Running → Completed exit code 0; notice + woken reply; instance stopped, list empty |
| 2026-11-10 12:48 | API-16 | Completed | Not Tested | WSL: no Windows host (user-only) |
| 2026-11-10 12:48 | cleanup | Completed | | api14 temp workspaces removed; no tagged processes left |
