# Implementation Progress

## Completed

- `src/distributed/member-placement/member-placement-resolver.ts`
  - Added canonicalization for placement node hints.
  - `embedded-local` now resolves to runtime `defaultNodeId` before validation and placement.
- `tests/unit/distributed/member-placement-resolver.test.ts`
  - Added regression tests for `embedded-local` alias on `homeNodeId` and `requiredNodeId`.
- `tests/integration/distributed/federated-composition.integration.test.ts`
  - Added integration coverage for mixed-node placement where local ownership is `embedded-local` and host node ID differs.

## Verification

- `pnpm exec vitest --run tests/unit/distributed/member-placement-resolver.test.ts tests/unit/distributed/placement-constraint-policy.test.ts`
- `pnpm exec vitest --run tests/integration/distributed/federated-composition.integration.test.ts tests/unit/distributed/member-placement-resolver.test.ts tests/unit/distributed/placement-constraint-policy.test.ts`

Result:
- `3 files passed`
- `16 tests passed`
