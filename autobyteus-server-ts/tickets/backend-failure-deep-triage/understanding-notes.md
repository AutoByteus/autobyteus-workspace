# Understanding Notes

## Sources Consulted
- Local tests:
  - `pnpm test -- --run`
  - `pnpm exec vitest run tests/e2e/memory/memory-index-graphql.e2e.test.ts`
  - `pnpm exec vitest run tests/unit/distributed/member-placement-resolver.test.ts`
  - `pnpm exec vitest run tests/integration/external-channel/providers/sql-channel-idempotency-provider.integration.test.ts tests/integration/external-channel/providers/sql-channel-callback-idempotency-provider.integration.test.ts`
  - `pnpm exec vitest run tests/integration/api/rest/channel-ingress.integration.test.ts`
  - `pnpm exec vitest run tests/integration/prompt-engineering/services/prompt-service.integration.test.ts`
- Local files:
  - `tests/e2e/memory/memory-index-graphql.e2e.test.ts`
  - `src/config/app-config.ts`
  - `src/agent-memory-view/store/memory-file-store.ts`
  - `src/agent-memory-view/services/agent-memory-index-service.ts`
  - `src/api/graphql/types/memory-index.ts`
  - `src/external-channel/providers/sql-channel-idempotency-provider.ts`
  - `src/external-channel/providers/sql-channel-callback-idempotency-provider.ts`
  - `src/external-channel/services/channel-idempotency-service.ts`
  - `src/external-channel/services/channel-ingress-service.ts`
  - `tests/unit/distributed/member-placement-resolver.test.ts`
  - `.env.test`

## Key Findings

### 1) Memory index e2e failure is deterministic and caused by shared memory path contamination
- Failure: `tests/e2e/memory/memory-index-graphql.e2e.test.ts:101` expected `agent-beta` but got `member_...`.
- Root cause chain:
  - `.env.test` sets `AUTOBYTEUS_MEMORY_DIR=/Users/normy/autobyteus_org/autobyteus-server-ts/memory`.
  - test sets temp app data dir (`setCustomAppDataDir`) but `AppConfig.getMemoryDir()` prioritizes `AUTOBYTEUS_MEMORY_DIR` from env.
  - memory index resolver uses that shared dir, not test temp dir.
- Design impact:
  - test isolation policy is broken for memory-index tests.

### 2) SQL idempotency provider tests fail deterministically (not flake)
- Failing tests:
  - `tests/integration/external-channel/providers/sql-channel-idempotency-provider.integration.test.ts`
  - `tests/integration/external-channel/providers/sql-channel-callback-idempotency-provider.integration.test.ts`
- Behavior:
  - second `reserveKey` on same key throws Prisma unique constraint (`P2002`) instead of returning duplicate (`firstSeen=false`).
- Code smell:
  - provider catches only `error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"`.
  - In workspace-linked setup (`repository_prisma` + local `@prisma/client`), strict `instanceof` can fail across package boundaries.
- Design impact:
  - ingress duplicate suppression depends on this path.

### 3) Channel ingress duplicate suppression failure is downstream of idempotency provider
- Failing test:
  - `tests/integration/api/rest/channel-ingress.integration.test.ts:239` expected 202 got 500.
- `channel-ingress` route catches and returns 500 when provider throws uncaught duplicate key.
- This is a functional blocker for external-channel reliability.

### 4) Member placement resolver unit test fixture drift
- Failing test:
  - `tests/unit/distributed/member-placement-resolver.test.ts` "maps embedded-local homeNodeId to default node id"
- Fixture includes `leader.homeNodeId=node-a`, `helper.homeNodeId=node-b`, but node snapshots used in that test only include `node-runtime`, `node-remote`.
- New ownership validation correctly throws unknown-home-node for `leader` before observer mapping is checked.
- This is test fixture mismatch after placement policy hardening.

### 5) Prompt-service timeout in full suite appears load-related
- `prompt-service` passes in isolation.
- Current evidence points to full-suite timing pressure, not deterministic service logic defect.

## Unknowns / Questions
- Should `AUTOBYTEUS_MEMORY_DIR` remain globally pinned in `.env.test`, or should tests that require file isolation explicitly override it per-suite?
- Should idempotency providers use a shared DB-level upsert/insert-ignore pattern (preferred) instead of exception-driven control flow?
- For member-placement test, should fixture be re-scoped minimally, or should resolver test include all home nodes always?

## Implications for Design
- This task is cross-cutting (config/test isolation + provider reliability + REST behavior + unit fixture consistency).
- Scope classification should be at least Medium.
- Fixes should include both code and test hardening; otherwise regressions will continue to escape.
