# Proposed-Design-Based Runtime Call Stack (v1)

## Scope
Future-state call stacks for backend failure stabilization.

## UC-1 (`UC-1 memory-index-isolation`): memory index e2e reads only test-owned entries

### Primary Path
1. `tests/e2e/memory/memory-index-graphql.e2e.test.ts:beforeAll(...)`
   - create `tempRoot`.
   - set `process.env.AUTOBYTEUS_MEMORY_DIR = <tempRoot>/memory` (test-owned scope).
   - build GraphQL schema.
2. `tests/e2e/memory/memory-index-graphql.e2e.test.ts:it("lists...")`
   - write raw trace files under `<tempRoot>/memory/agents/agent-alpha|agent-beta`.
3. `src/api/graphql/types/memory-index.ts:listAgentMemorySnapshots(...)`
   - call `appConfigProvider.config.getMemoryDir()`.
   - returns `<tempRoot>/memory` due env override.
4. `src/agent-memory-view/store/memory-file-store.ts:listAgentDirs()`
   - returns only `agent-alpha`, `agent-beta`.
5. `src/agent-memory-view/services/agent-memory-index-service.ts:listSnapshots(...)`
   - builds summaries and mtimes.
   - sorts by mtime desc.
6. test assertion verifies deterministic order: `agent-beta`, `agent-alpha`.

### Cleanup/Fallback
- `afterAll`: restore previous `AUTOBYTEUS_MEMORY_DIR` env value.

### Error Path
- If query errors, test fails immediately with GraphQL error.

---

## UC-2 (`UC-2 ingress-idempotency-duplicate`): ingress provider duplicate classification

### Primary Path
1. caller invokes `src/external-channel/providers/sql-channel-idempotency-provider.ts:reserveKey(key, ttl)`.
2. provider executes repository `create`.
3. on first insert:
   - create succeeds.
   - return `{ firstSeen: true, record }`.

### Duplicate Path (fallback branch)
1. second call with same key executes `create` and DB throws unique violation.
2. catch block runs structural duplicate-check helper:
   - verifies error has Prisma known-request shape with `code === "P2002"`.
3. provider loads existing row via `findUnique({ key })`.
4. if unexpired:
   - return `{ firstSeen: false, record: existing }`.
5. if expired:
   - update row (`firstSeenAt`, `expiresAt`) and return `{ firstSeen: true, record: refreshed }`.

### Error Path
- Any non-duplicate DB error is re-thrown.

---

## UC-3 (`UC-3 callback-idempotency-duplicate`): callback provider duplicate classification

### Primary Path
- Same structure as UC-2 in
  - `src/external-channel/providers/sql-channel-callback-idempotency-provider.ts:reserveKey(...)`.

### Duplicate/Error Branches
- Same as UC-2, including structural duplicate detection and non-duplicate rethrow.

---

## UC-4 (`UC-4 channel-ingress-duplicate`): REST duplicate suppression returns 202

### Primary Path
1. `src/api/rest/channel-ingress-message-route.ts:POST /api/channel-ingress/v1/messages` parses envelope.
2. `src/external-channel/services/channel-ingress-service.ts:handleInboundMessage(...)`.
3. calls `idempotencyService.ensureFirstSeen(...)`.
4. if provider returns duplicate:
   - service returns `{ disposition: "DUPLICATE", duplicate: true, ... }`.
5. route sends `202` with duplicate payload.

### Error Path
- If provider throws non-duplicate infra error, route catches and returns 500.

---

## UC-5 (`UC-5 placement-embedded-local-fixture`): embedded-local mapping test

### Primary Path
1. `tests/unit/distributed/member-placement-resolver.test.ts` builds fixture where non-target home nodes are included in snapshots.
2. sets target member home node to `embedded-local`.
3. `src/distributed/member-placement/member-placement-resolver.ts:resolvePlacement(...)`
4. `src/distributed/policies/placement-constraint-policy.ts:validateHomeNodeOwnership(...)`
   - passes ownership checks.
5. embedded-local mapping resolves to default runtime node.
6. assertion verifies source `home` and nodeId equals default node.

### Error Path
- unknown home node scenarios remain covered in separate explicit test.

## Version
- v1.
