# Implementation Progress - team-member-history-persistence-fix

## 2026-02-16
- [x] Requirements and call-stack review artifacts completed (Go confirmed).
- [x] Implement resolver deterministic member ID wiring.
- [x] Implement continuation restore config alignment.
- [x] Update/add tests.
- [x] Execute verification test suite.

## Verification
- `pnpm -s vitest run tests/unit/config/app-config.test.ts tests/unit/api/graphql/types/agent-team-run-resolver.test.ts tests/unit/run-history/team-run-continuation-service.test.ts tests/integration/run-history/team-run-continuation-lifecycle.integration.test.ts tests/e2e/run-history/team-run-restore-lifecycle-graphql.e2e.test.ts` -> pass (22 tests).

## Notes
- Existing historical team rows created before this fix can still be empty if their manifest member IDs do not match persisted runtime agent IDs.
- New team runs created after this fix use deterministic member IDs consistently across runtime + manifest + projection lookups.
