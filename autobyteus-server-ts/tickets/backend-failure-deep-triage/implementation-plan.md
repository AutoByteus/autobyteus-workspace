# Implementation Plan

## Scope
Stabilize backend failures identified in deep triage:
- memory-index e2e isolation contamination
- SQL idempotency duplicate classification
- channel-ingress duplicate suppression regression (downstream)
- member-placement resolver unit fixture mismatch

## Plan (Bottom-Up)

1. Idempotency provider robustness (core first)
- Update duplicate detection helper in:
  - `src/external-channel/providers/sql-channel-idempotency-provider.ts`
  - `src/external-channel/providers/sql-channel-callback-idempotency-provider.ts`
- Replace strict `instanceof`-only check with structural Prisma-known-request detection (`code === "P2002"` + name guard) to survive package/runtime identity differences.
- Ensure non-duplicate errors are still rethrown.

2. Memory-index e2e isolation fix
- Update `tests/e2e/memory/memory-index-graphql.e2e.test.ts` to override `AUTOBYTEUS_MEMORY_DIR` with suite temp path and restore original env in teardown.
- Keep existing test intent; remove dependency on shared repo memory state.

3. Placement resolver test fixture alignment
- Update `tests/unit/distributed/member-placement-resolver.test.ts` embedded-local case fixture so unrelated members satisfy ownership validation.
- Preserve explicit unknown-home-node coverage in dedicated test.

4. Validation
- Run targeted tests:
  - memory-index e2e
  - both idempotency provider integrations
  - channel-ingress integration
  - member-placement resolver unit
- Run full backend suite:
  - `pnpm test -- --run`

## Non-Goals
- No production API contract changes.
- No schema migrations.
- No backward-compat shims.

## Risks and Mitigations
- Risk: overly broad duplicate error guard could hide unrelated errors.
  - Mitigation: require both Prisma known-request name and `P2002` code; rethrow otherwise.
- Risk: env override leaks to other suites.
  - Mitigation: save/restore prior env value in `afterAll`.
