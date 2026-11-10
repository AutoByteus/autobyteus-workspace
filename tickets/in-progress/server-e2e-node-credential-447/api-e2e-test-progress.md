# API/E2E Test Progress — server-e2e-node-credential-447

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: `api-e2e-coverage-investigation.md` Planned Cases (same case IDs)

| Time | Case ID | Event (`Started`/`Checkpoint`/`Completed`) | Result (`Pass`/`Fail`/`Blocked`/`Not Tested`) | Note (what is running and where, what to do next) |
| --- | --- | --- | --- | --- |
| 2026-11-10T06:46:40Z | API-12 | Completed | Pass | diff has no src/ or web-app path; 0 own_/mcpg_ matches in the ticket folder |
| 2026-11-10T06:46:40Z | API-09 | Started | | pnpm -C autobyteus-server-ts test:unit, background, log evidence/api-e2e/API-09-server-test-unit.log; nothing else heavy meanwhile |
| 2026-11-10T06:58:24Z | API-09 | Completed | Pass | Test Files 970 passed, 5 skipped; exit 0 |
| 2026-11-10T06:58:24Z | API-07 | Started | | new tests/e2e/mcp/mcp-gateway-token.e2e.test.ts, clean env |
| 2026-11-10T06:59:17Z | API-07 | Completed | Pass | 4 tests passed; rerun after making case 1 also send the owner credential explicitly |
| 2026-11-10T06:59:17Z | API-08 | Started | | planting autobyteus-server-ts/tests/e2e/zz-api08-probe.e2e.test.ts, then guard; must remove the file after |
| 2026-11-10T06:59:34Z | API-08 | Completed | Pass | planted file flagged by both rules with file:line, cause, helper; removed; clean rerun 4 passed |
| 2026-11-10T06:59:34Z | API-11 | Started | | codex-native-multi-agent-disabled with gates, fake codex /tmp/api11-fake-codex-MR0Y (version only), placeholder auth; evidence dir /tmp/api11-evidence |
| 2026-11-10T06:59:51Z | API-11 | Completed | Fail | child's first /graphql (createAgentDefinition) 401 NODE_CREDENTIAL_REQUIRED, fixture :65 via :145/:148; no Codex call; gap reproduced |
| 2026-11-10T06:59:51Z | API-10 | Started | | 59 RUN_AGY_FAILURE_E2E files, scripted AGY, clean env, background; log evidence/api-e2e/API-10-scripted-agy-gated-all.full.log |
| 2026-11-10T07:38:15Z | API-10 | Checkpoint | | 59 files done: 54 passed, 2 skipped, 3 failed (5 tests), no credential refusals; diagnosing (Rule 9): rerun the 3 files alone as API-10b |
| 2026-11-10T07:40:24Z | API-10 | Completed | Fail | 54 passed, 2 skipped, 3 failed (5 tests); 0 credential/token refusals; causes: RPE stale since autobyteus-95 (deterministic, API-10b), DCF-02 test reads a capsule before its manifest exists, DCM-009 stop success:false under load (outcome not printed); none from this change; follow-ups FU-002..FU-004 |
| 2026-11-10T07:40:24Z | API-14 | Started | | server typecheck with the new e2e test file |
| 2026-11-10T07:41:17Z | API-14 | Completed | Pass | test-file errors 1182 in 365 files = baseline; PASS |
| 2026-11-10T07:43:17Z | — | Completed | Fail | round result Fail (API-11, REQ-003); reports written; next: commit, hand off to code reviewer for failure-origin review |
