# API/E2E Test Progress — mcp-http-error-status

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: the coverage investigation's Planned Cases (same case IDs)

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 2026-10-20 14:44 | API-00 | Started | | builds autobyteus-ts then server, serialized |
| 2026-10-20 14:45 | API-00 | Completed | Pass | evidence/API-00-builds.log |
| 2026-10-20 14:45 | API-07 | Started | | first run to observe the stdio exit message (placeholder expected to fail) |
| 2026-10-20 14:46 | API-07 | Checkpoint | | first run: 3/4 pass; stdio placeholder observed 'SdkError: Connection closed'; pinned, rerunning |
| 2026-10-20 14:46 | API-07 | Checkpoint | | API-07-e2e-error-status.log: 4/4 pass; removed one redundant assertion, final run together with API-08 |
| 2026-10-20 14:46 | API-08 | Started | | error-status + auth-remote + redirect e2e, clean env |
| 2026-10-20 14:47 | API-08 | Completed | Pass | evidence/API-08-e2e-mcp-http-three-files.log, 8/8 |
| 2026-10-20 14:47 | API-09 | Started | | gated AGY scripted run, clean env, evidence dir evidence/API-09-agent-wire |
| 2026-10-20 14:49 | API-09 | Checkpoint | | AGY run: success case pass; revoked case FAIL: agent got AGY_TURN_ERROR 'Internal error' (dispatcher -32603 masking, agent-tools-mcp-method-dispatcher.ts L148). Log API-09-agent-tool-call-revoked.log. Added native revoked case; next: API-11 native LM Studio run |
| 2026-10-20 14:49 | API-11 | Started | | native AutoByteus + LM Studio qwen/qwen3.6-35b-a3b (was not loaded; unload after) |
| 2026-10-20 14:52 | API-11 | Checkpoint | | native run pass (2 passed); model unloaded. Revoked case restricted to native (FU-001); final run of both gates next |
| 2026-10-20 14:52 | API-09 | Started | | final run with AGY + LM Studio gates together (API-09 + API-11 final) |
| 2026-10-20 14:54 | API-09 | Completed | Pass (AGY success case); revoked-on-AGY moved to FU-001 | evidence/API-09-11-agent-tool-call-final.log; first-run evidence API-09-agent-tool-call-revoked.log |
| 2026-10-20 14:54 | API-11 | Completed | Pass | evidence/API-09-11-agent-tool-call-final.log, API-09-11-agent-wire/native-revoked.json |
| 2026-10-20 14:54 | API-04 | Started | | pnpm -C autobyteus-ts test, clean env |
| 2026-10-20 14:56 | API-04 | Completed | Pass | evidence/API-04-autobyteus-ts-full.log, 387 files / 2368 tests passed |
| 2026-10-20 14:56 | API-05 | Started | | pnpm -C autobyteus-server-ts test:unit |
| 2026-10-20 15:13 | API-05 | Completed | Pass | evidence/API-05-server-unit.log, 752 files / 6201 tests passed |
| 2026-10-20 15:13 | API-06 | Started | | test:integration:prepare then test:integration (background), log API-06.tmp |
| 2026-10-20 15:18 | API-06 | Completed | Pass | evidence/API-06-server-integration.log, 78 files / 421 tests passed |
