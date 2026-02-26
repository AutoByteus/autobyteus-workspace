# Requirements

## Status
Design-ready

## Triage
- Scope: Medium
- Rationale:
  - Cross-layer impact across configuration, memory-index query behavior, external-channel idempotency providers, REST ingress behavior, and failing unit/integration/e2e tests.
  - More than 3 files and includes design-level isolation and error-classification concerns.

## Goal / Problem Statement
Stabilize backend test reliability and restore functional correctness for duplicate suppression and memory indexing by removing shared-state contamination and making idempotency duplicate handling robust across runtime/package boundaries.

## In-Scope Use Cases
1. Memory index GraphQL e2e isolation
- Given test-created memory entries in a temporary scope, `listAgentMemorySnapshots` returns only those entries, ordered by newest.

2. SQL ingress idempotency duplicate handling
- Given the same idempotency key is reserved twice before expiry, provider returns `firstSeen=false` without throwing.

3. SQL callback idempotency duplicate handling
- Given the same callback idempotency key is reserved twice before expiry, provider returns `firstSeen=false` without throwing.

4. REST channel-ingress duplicate suppression
- Given duplicate inbound message (same routing identity + externalMessageId), route returns `202` with `duplicate=true` and does not crash.

5. Member placement unit consistency
- Embedded-local mapping test validates embedded-local behavior without unrelated unknown-home-node fixture breakage.

## Acceptance Criteria
- `tests/e2e/memory/memory-index-graphql.e2e.test.ts` passes deterministically.
- `tests/integration/external-channel/providers/sql-channel-idempotency-provider.integration.test.ts` passes deterministically.
- `tests/integration/external-channel/providers/sql-channel-callback-idempotency-provider.integration.test.ts` passes deterministically.
- `tests/integration/api/rest/channel-ingress.integration.test.ts` passes deterministically, including duplicate suppression case.
- `tests/unit/distributed/member-placement-resolver.test.ts` passes with updated fixture expectations.
- Targeted subset run covering all above passes in one command.

## Constraints / Dependencies
- Do not introduce backward-compat or fallback legacy paths.
- Keep runtime behavior natural and robust; avoid brittle type checks tied to module identity.
- Preserve current external API contract for channel-ingress response payload.

## Assumptions
- `.env.test` remains shared for other suites; per-test override in isolated suites is acceptable.
- Idempotency duplicate classification should rely on structural error shape (`code`/`name`) instead of strict `instanceof`.

## Risks / Open Questions
- If other suites rely on global shared memory dir semantics, local override may need explicit cleanup.
- If Prisma error shape differs by engine/runtime, guard must remain strict enough to avoid false-positive duplicate classification.
