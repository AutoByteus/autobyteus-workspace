# Non-AGY failure separation (SR-006 non-goal)

Candidate full E2E: **195 pass / 43 fail / 133 skipped**. Full production-equivalent baseline: **197 pass / 41 fail / 133 skipped**. All 41 baseline failing assertion identities occur in the candidate. Two analytics failures pass in isolation (candidate5/5); ordered four-file token cohort reproduces both with current AND exact base converter: **12 pass /2 fail each**. All43 candidate failure identities now have baseline reproduction.

## Exact basis and limits
Git base b0b077b02571098a6bf7993ab46b67a69fdb8f9d; only existing changed production file is AGY converter. Temporarily replace source and corresponding transpiled dist with its exact base content; new MCP helper remains unused. All other production source and failing tests byte-identical to base. Current source/dist backed up and restored in finally, with SHA256 receipts; final tracked diff empty. This is production-equivalent base behavior, not a separately installed clean base worktree. The unchanged fake/live test additions remain present; unrelated disabled opt-ins are not passes.

## Ordered analytics diagnosis
`token-usage-unit-prices-graphql` writes a 1,000,000-output-token August usage facet; `token-usage-ledger-provider-semantics` writes an overflow-size July facet. Their cleanup deletes run records but not every analytics facet. Analytics assertions query unfiltered date windows. The first failure contains exactly the extra1,000,000 output tokens/report; the second reports TOKEN_USAGE_SAFE_INTEGER_EXCEEDED:accounting_input_tokens. `token-order.config.mts` orders unchanged unit-prices → provider-semantics → ledger → analytics; candidate and base reproduce the same two identities. This is test database/order pollution, not execution of the AGY projection. No cleanup fix, blacklist or assertion weakening applied. Config initial .ts loading failure was temporary CJS/ESM scaffold mismatch; .mts corrects module mode only.

| Failing file | Count | Base reproduction |
| --- | ---: | --- |
| `e2e/agent-definitions/agent-packages-graphql.e2e.test.ts` | 2 | Full baseline-equivalent suite |
| `e2e/agent-definitions/json-file-persistence-contract.e2e.test.ts` | 1 | Full baseline-equivalent suite |
| `e2e/agent-team-definitions/agent-team-definitions-graphql.e2e.test.ts` | 5 | Full baseline-equivalent suite |
| `e2e/agent-team-runs/hierarchical-team-run-config-graphql.e2e.test.ts` | 7 | Full baseline-equivalent suite |
| `e2e/app-data-migrations/team-run-v1-production-upgrade.e2e.test.ts` | 3 | Full baseline-equivalent suite |
| `e2e/file-explorer/workspace-content-rest.e2e.test.ts` | 5 | Full baseline-equivalent suite |
| `e2e/memory-sync/memory-sync-multiprocess.e2e.test.ts` | 1 | Full baseline-equivalent suite |
| `e2e/run-history/nested-team-history-restart.e2e.test.ts` | 2 | Full baseline-equivalent suite |
| `e2e/run-history/recent-run-projection-graphql.e2e.test.ts` | 9 | Full baseline-equivalent suite |
| `e2e/run-history/run-projection-toolcalls-graphql.e2e.test.ts` | 5 | Full baseline-equivalent suite |
| `e2e/token-usage/token-usage-analytics-graphql.e2e.test.ts` | 2 | Ordered token cohort, both candidate/base |
| `e2e/workspaces/workspaces-graphql.e2e.test.ts` | 1 | Full baseline-equivalent suite |

These remain **failed tests**, not passed or waived assertions. Under approved SR-006, unrelated inherited repairs are excluded; they do not establish an AGY regression. API-F001 also remains deferred per user scope and CRR-002; no new unit/architecture Pass claimed. Delivery must retain disclosure and its own release gates.
