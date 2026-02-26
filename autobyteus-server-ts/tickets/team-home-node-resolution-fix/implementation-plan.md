# Implementation Plan

## Scope (Small)

Fix team run startup failure when team member `homeNodeId` is `embedded-local` but the backend runtime local node identity differs (for example `node-disabled`, `node-local`, or a persisted discovery node id).

## Root Cause

During first team message dispatch, distributed placement validates `homeNodeId` against runtime node snapshots. Team definitions frequently store `homeNodeId = embedded-local` while runtime host node id comes from `AUTOBYTEUS_NODE_ID` (or persisted discovery identity). When these differ, placement throws `UnknownHomeNodeError` and team launch fails.

## Design

1. Canonicalize placement hint node IDs (`homeNodeId`, `requiredNodeId`, `preferredNodeId`) before policy validation.
2. Map `embedded-local` to `defaultNodeId` when `defaultNodeId` exists.
3. Keep strict validation behavior for other unknown node IDs.

## Tasks

1. Update `src/distributed/member-placement/member-placement-resolver.ts` to canonicalize member node hints with alias mapping.
2. Add a regression test in `tests/unit/distributed/member-placement-resolver.test.ts` that proves `embedded-local` resolves to runtime default host node.
3. Run targeted distributed-placement unit tests.

## Verification

- `pnpm exec vitest --run tests/unit/distributed/member-placement-resolver.test.ts tests/unit/distributed/placement-constraint-policy.test.ts`
