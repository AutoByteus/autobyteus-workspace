# API/E2E Revision Record

## API-REV-001 — Initial API/E2E validation
- Round: 1
- Trigger: CRR-006 source-review pass.
- Prior result: `N/A`; prior confidence: `N/A` (no prior record existed).
- Investigation: `api-e2e-coverage-investigation.md` completed before execution.
- Result: `Blocked`.
- Final confidence: `80.0%`.
- Evidence: focused build/pricing/catalog checks passed (32 pricing tests, 5 catalog tests); temporary real provider/calculator probe passed 1/1; Prisma-backed E2E/store suites blocked during import by `repository_prisma` requesting named `Prisma` export from CJS `@prisma/client`.
- Critical gap: AC-010 persistence/GraphQL observation-to-storage proof.
- Durable coverage changes: none; temporary probe deleted.
- Cleanup: test-owned SQLite setup/teardown completed; no shared processes/data touched.
- Recommended routing: `/code_reviewer` for focused failure-origin review of the environment/test-harness blocker. Do not infer implementation failure from this module-load error.

## API-REV-002 — Prisma dependency rerun
- Round: 2
- Trigger: repository_prisma upgraded to 1.0.10; CRR-008 passes and requests rerun of API-004/API-005.
- Prior result: `Blocked`; prior confidence: `80.0%`.
- Resolution: the prior repository_prisma ESM/CJS import blocker is resolved. A required documented `prepare:shared` build was run to generate workspace package dist artifacts.
- Evidence: token-usage GraphQL E2E `1 passed, 3 skipped`; token-usage integration `6/6 passed`; persistence lifecycle `3/3 passed`; pricing summary `2/2 passed`. Logs: `api-e2e-evidence/08-rerun-token-usage-e2e.log`, `09-prepare-shared.log`, `10-rerun-token-usage-e2e-after-shared-build.log`, `11-rerun-token-usage-integration.log`, `12-rerun-persistence-lifecycle.log`.
- Remaining limitation: the runtime GraphQL suite's 3 live-runtime tests are skipped by its environment gate, and the passing unit-price E2E uses pre-shaped observations; a DeepSeek-specific provider-to-persistence assertion is not directly present. AC-010 is therefore not fully direct.
- Result: `Blocked` for clean acceptance, not an implementation failure; additional durable or temporary provider-to-store coverage is needed.
- Final confidence: `88.0%`.
- Durable coverage changes: none.

## API-REV-003 — Direct DeepSeek provider-to-persistence E2E
- Round: 3
- Trigger: User requested continuation after repository_prisma fix; AC-010 direct evidence gap identified in API-REV-002.
- Prior result: `Blocked`; prior confidence: `88.0%`.
- Durable coverage: updated `autobyteus-server-ts/tests/e2e/token-usage/token-usage-unit-prices-graphql.e2e.test.ts` with a DeepSeek observed_at → real TokenCostCalculator → Prisma TokenUsageRunStore scenario.
- Result: `Pass` for the changed pricing/persistence boundary. New targeted E2E passed 2/2, including DeepSeek post-cutover weekend off-peak policy key, snapshot provenance, and $1.98 output cost. Existing integration and lifecycle suites remain 6/6 and 5/5 passed; runtime GraphQL suite loads but 3 live-runtime tests are skipped by its gate.
- Final confidence: `95.3%` (572 / 6, rounded to one decimal).
- Remaining risk: runtime live-agent journey is not exercised because it requires the gated live environment; deterministic provider-to-store and GraphQL hydration are directly covered.
- Required routing: `/code_reviewer` for proportional review of the changed durable E2E test.
