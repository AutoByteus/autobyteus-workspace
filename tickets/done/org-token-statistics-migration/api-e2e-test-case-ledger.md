# API/E2E Test-Case Ledger

Round 1. Worktree and canonical coverage investigation/report/revision record: same package paths as api-e2e-coverage-investigation.md. Multi-case execution; initialized before tests. No prior completed API result.

## Planned cases
| Case | Scenario / AC | Entry / expectation | State |
| --- | --- | --- | --- |
| API-C01 | SCN-001–005 / AC-001–008 partial | prepare:shared and existing focused migration/registry tests; pass independent controls | Planned |
| API-C02 | SCN-003/004 / AC-004/005 | new SQL 250-row/root boundary tests; exact pagination, rollback/retry/readiness | Planned |
| API-C03 | SCN-005 / AC-007 | exact current-Org referenced attachment proof without global content traversal | Planned |
| API-C04 | SCN-001–005 / regression | affected unit/integration/E2E suites; source compiler/diff checks | Planned |
| API-C05 | SCN-001 / AC-001/003/006 | legacy ledger materialization → same family → full current restore → continuation/token presentation | Planned |
| API-C06 | SCN-002 / AC-002/003/006 | stale token-only ordinary rerun → full continuation, no history content I/O | Planned |

## Execution events
No execution started. Append started/checkpoint/completed events and exact logs immediately as work proceeds.

## Reconciliation
Pending; execution report owns round outcome. No completed API revision exists yet.

- API-C01 Started: prepare:shared; generated shared dependencies under this worktree only. Test DB path confirmed tests/.tmp/autobyteus-server-test.db.

- API-C01 Completed Pass: shared preparation complete; focused command in api-e2e-focused.log: 54 tests / 4 files passed. The planned registry filename did not select a file; registry coverage will use discovered actual path in API-C04. No broader proof inferred.
- API-C02 Started: pnpm -C autobyteus-server-ts exec vitest run tests/integration/app-data-migrations/agent-org-token-batch-boundaries.integration.test.ts --no-watch.

- API-C02 Checkpoint: initial seed failed before migration with duplicate SQL surrogate id copied from seed (test fixture error, not implementation). Corrected each seeded id; retained initial output in api-e2e-batches.log; rerun appends below.

- API-C02 Completed Pass: two durable tests pass after correcting fixture surrogate ids; 501-root pagination, 501-member exact rollback/conversion/zero-write rerun and readiness rejection on third page proven (api-e2e-batches.log).
- API-C03 Started: pnpm -C autobyteus-server-ts exec vitest run tests/integration/app-data-migrations/agent-org-exact-reference.integration.test.ts --no-watch.

- API-C03 Completed Pass: exact referenced current Org integration test passed; metadata read only, no owner descendant enumeration or history reads/writes, unchanged attachment and source trace bytes (api-e2e-exact-reference.log).

- API-C04 Started: affected unit, token integration and no-secret token query/restart E2E suites; exact command below in api-e2e-regression.log.

- API-C04 Checkpoint: 389 tests passed / 74 files; built-server restart test failed before launching with TEST_SERVER_BUILD_REQUIRED. Source-only compiler and diff check pass. Setup omission, not behavior defect. Read isolated child bootstrap; run documented server build then rerun only restart case before completing C04.

- API-C04 Completed Pass: 389/74 passed plus focused restart 1/1 after documented full build; full server build, source compiler, diff pass. Initial build-required setup error resolved. Intermediate confidence 82.86%; broader lifecycle validation Required (investigation scorecard).
- API-C05 Started: pnpm -C autobyteus-server-ts exec vitest run tests/e2e/app-data-migrations/agent-org-token-continuation.e2e.test.ts -t first-upgrade --no-watch.

- API-C05 Checkpoint: initial assertion timed out after full Org restore and Agent publication. Test inspected wrong event envelope/DTO (RootEventPublisher delivers {event,changeSequence}; message uses type/payload). Corrected fixture assertions, increased total lifecycle test timeout to 20s, no production change. Targeted test compiler also found scripted backend terminal snapshot types; corrected to actual offline/idle contract.

- API-C05 Checkpoint: lifecycle replay/advance/response/history assertions now pass; final summary assertion used persisted accounting field instead of public total_tokens DTO field. Corrected test-only expectation; prior output retained.

- API-C05 Completed Pass: legacy ledger materialized/deleted by real old token migration; same family transformed exact three fields; full manager/scope/mounted-Team/Agent restore preserved thread; default token pipeline replay zero-write then 240 tokens / 0.0714 cost; Org stayed active with two response/token DTOs and real recorded history. Scripted external backend, not live provider (api-e2e-continuation-first.log).
- API-C06 Started: pnpm -C autobyteus-server-ts exec vitest run tests/e2e/app-data-migrations/agent-org-token-continuation.e2e.test.ts -t token-only-rerun --no-watch.

- API-C06 Completed Pass: token-only migrated continuation passed independently, including no-content/no-write history phase and preserved external thread/cost/usage/response (api-e2e-continuation-rerun.log).
- API-C07 Started: finalize added test compiler and combined regression. Strengthened token DTO numeric assertions. Found fixture default /workspace caused metadata-only registration in assigned worktree workspaces.json, not live profile; changed selected fixture workspaceRootPath to null to avoid ambient registry. Cleanup evidence recorded separately.

- API-C07 Completed Pass (2026-09-15 16:19:15 +02:00): final combined command in api-e2e-final-tests.log passes **402 tests / 79 files**, zero skipped/failed, 66.50s. All new tests run together; targeted test compiler exit 0 after nullable fixture metadata update. Full build/source compiler already pass. No surviving owned built-server child found by exact command-path inspection. Final whitespace check pass.

## Final reconciliation
API-C01–07 all Pass. No running/interrupted/unstarted cases. API-C02 seed error and API-C05 DTO assertion mistakes corrected locally; C04 missing build resolved by documented build. No implementation failure retained or suppressed. Filtered C05/C06 runs intentionally skipped their counterpart, then final combined suite ran both without skips. Canonical report: api-e2e-execution-coverage-report.md, API-REV-001. Every meaningful completion/checkpoint recorded before subsequent case execution; compiler probe ran alongside C05 and was finalized in C07.
