# Proposed Design (v1)

## 1. Current State (As-Is)

### A. Memory index test isolation
- `MemoryIndexResolver` constructs `MemoryFileStore` with `appConfigProvider.config.getMemoryDir()`.
- `.env.test` pins `AUTOBYTEUS_MEMORY_DIR` to a shared repository path.
- `memory-index-graphql.e2e` sets temp app data dir but does not override memory dir env, so resolver reads shared memory.

### B. Idempotency duplicate handling
- SQL providers rely on exception-first flow: try `create`, catch unique violation, then `findUnique`.
- Duplicate detection uses strict `instanceof Prisma.PrismaClientKnownRequestError` and `code === "P2002"`.
- In workspace-linked package boundaries, thrown errors still have P2002 shape but may fail strict `instanceof`, escaping catch.

### C. Channel ingress behavior
- `ChannelIngressService` depends on idempotency provider; uncaught duplicate-key bubbles to route-level error handler -> 500.

### D. Placement unit test
- Fixture for embedded-local mapping includes unrelated home node constraints that now fail ownership validation.

## 2. Target State (To-Be)

### A. Deterministic memory-index e2e isolation
- Memory-index e2e explicitly scopes `AUTOBYTEUS_MEMORY_DIR` to test temp directory during suite lifecycle.
- Test no longer reads global memory state.

### B. Robust duplicate-key classification
- SQL idempotency providers classify unique-constraint violations via structural Prisma error detection, not fragile runtime identity checks.
- Duplicate reservation returns `firstSeen=false` and existing record.

### C. Stable ingress duplicate suppression
- Duplicate inbound requests return `202` + duplicate response reliably.

### D. Valid placement fixture
- Embedded-local unit test isolates target behavior by using a fixture consistent with ownership validation requirements.

## 3. Change Inventory

| Type | File | Change |
|---|---|---|
| Modify | `tests/e2e/memory/memory-index-graphql.e2e.test.ts` | Override/restore `AUTOBYTEUS_MEMORY_DIR` within suite for strict isolation. |
| Modify | `src/external-channel/providers/sql-channel-idempotency-provider.ts` | Replace strict `instanceof` duplicate guard with structural Prisma error guard. |
| Modify | `src/external-channel/providers/sql-channel-callback-idempotency-provider.ts` | Same structural duplicate guard update as ingress provider. |
| Modify | `tests/unit/distributed/member-placement-resolver.test.ts` | Adjust embedded-local case fixture to satisfy ownership validation while testing embedded-local mapping intent. |

## 4. File/Module Responsibilities and APIs

### `tests/e2e/memory/memory-index-graphql.e2e.test.ts`
- Responsibility: verify memory-index query ordering/filtering behavior with isolated test data.
- Inputs: temp memory files and GraphQL query.
- Output: deterministic assertions against snapshot list.

### `src/external-channel/providers/sql-channel-idempotency-provider.ts`
- Responsibility: reserve ingress idempotency keys and return first-seen/duplicate state.
- API: `reserveKey(key, ttlSeconds)`.
- Dependency: Prisma repository.

### `src/external-channel/providers/sql-channel-callback-idempotency-provider.ts`
- Responsibility: reserve callback idempotency keys.
- API: `reserveKey(key, ttlSeconds)`.
- Dependency: Prisma repository.

### `tests/unit/distributed/member-placement-resolver.test.ts`
- Responsibility: validate placement policy outcomes by scenario.
- Inputs: team definition + node snapshots.
- Output: placement or expected error.

## 5. Naming Decisions
- Keep existing names; responsibilities still align.
- No rename needed for this ticket.

## 6. Naming-Drift Check
- `sql-channel-idempotency-provider`: name matches responsibility (`ReserveKey` duplicate handling).
- `memory-index-graphql.e2e`: name matches scope.
- `member-placement-resolver` test: name still aligned.
- Drift result: N/A (no rename/split/move required).

## 7. Dependency Flow / Cycle Risk
- `channel-ingress-message-route` -> `ChannelIngressService` -> `ChannelIdempotencyService` -> SQL provider.
- Change stays inside provider error classification and test isolation; no new dependencies.
- No cycle risk introduced.

## 8. Data/Error Handling Expectations
- Duplicate insert path must map DB unique violation to domain duplicate decision.
- Non-duplicate DB failures must still throw.
- Memory-index test must not observe external memory directories.

## 9. Use-Case Coverage Matrix

| use_case_id | Primary | Fallback | Error | Runtime Call Stack Section |
|---|---|---|---|---|
| UC-1 memory-index-isolation | Yes | N/A | N/A | 3.1 |
| UC-2 ingress-idempotency-duplicate | Yes | N/A | Yes | 3.2 |
| UC-3 callback-idempotency-duplicate | Yes | N/A | Yes | 3.3 |
| UC-4 channel-ingress-duplicate | Yes | N/A | Yes | 3.4 |
| UC-5 placement-embedded-local-fixture | Yes | N/A | Yes | 3.5 |

## 10. Version Notes
- v1: initial proposed design from deep failure triage.
