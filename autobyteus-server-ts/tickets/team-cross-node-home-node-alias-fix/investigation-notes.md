# Investigation Notes - team-cross-node-home-node-alias-fix

## Problem Summary

Cross-node team message dispatch fails during team bootstrap with:

- `UnknownHomeNodeError: Team member 'student' references unknown homeNodeId 'remote-...'.`

Observed reproduction (from user screenshots):

1. Team definition member `professor` uses embedded node.
2. Team definition member `student` uses Docker node (`8001`).
3. First message to coordinator triggers team bootstrap.
4. Backend throws `UnknownHomeNodeError` for `student.homeNodeId`.

## Sources Consulted

- `src/distributed/policies/placement-constraint-policy.ts`
- `src/distributed/member-placement/member-placement-resolver.ts`
- `src/distributed/ingress/team-run-locator.ts`
- `src/federation/catalog/federated-catalog-service.ts`
- `src/federation/catalog/node-catalog-remote-client.ts`
- `src/discovery/services/node-discovery-registry-service.ts`
- `src/discovery/services/node-identity-service.ts`
- `src/api/rest/node-discovery.ts`
- `tests/unit/distributed/member-placement-resolver.test.ts`
- `tests/unit/federation/federated-catalog-service.test.ts`
- Frontend:
  - `stores/nodeStore.ts`
  - `stores/federatedCatalogStore.ts`
  - `stores/agentTeamRunStore.ts`
  - `utils/remoteNodeIdentityResolver.ts`

## Key Findings

1. Placement validation is strict and currently only accepts exact node IDs from runtime node snapshots.
   - `PlacementConstraintPolicy.validateHomeNodeOwnership(...)` throws if `homeNodeId` is not in `knownNodeIds`.

2. Team run bootstrap uses runtime node snapshots from distributed node directory.
   - `TeamRunLocator.resolveOrCreateRun(...)` -> `TeamRunOrchestrator.startRunIfMissing(...)`.
   - Node snapshots come from discovery-backed `NodeDirectoryService` entries.

3. Federated catalog currently trusts the caller-provided `nodeId` for remote scopes.
   - `FederatedCatalogService` passes input `nodeId` through.
   - `NodeCatalogRemoteClient` sets `homeNodeId` for remote refs to input `node.nodeId`.

4. Frontend can hold historical/manual remote IDs (e.g., `remote-<uuid>`) that do not match backend discovery identity.
   - Team definition stores `homeNodeId` from catalog scope.
   - If catalog scope uses stale/manual ID, persisted team definition carries stale ID.

5. Discovery self identity can be different and is runtime authoritative for transport routing.
   - `/rest/node-discovery/self` returns runtime `nodeId`.
   - Runtime node identity currently defaults to random UUID when no persisted identity/env is present.

## Root Cause Hypothesis (High Confidence)

`homeNodeId` persisted in team definition can come from a non-canonical remote ID path (caller-provided/manual/stale), while runtime placement validates against discovery runtime IDs. This creates an ID-space mismatch:

- persisted team member `homeNodeId`: `remote-...`
- runtime known node ID: `node-...` (or other discovery canonical ID)

Result: immediate `UnknownHomeNodeError` on bootstrap.

## Scope Implications

- Primary fix surface: backend canonicalization + alias bridging between caller-provided node IDs and runtime node IDs.
- Frontend changes are optional if backend canonicalization/alias handling is robust.

## Open Questions

1. Should node identity fallback remain random UUID, or should fallback be deterministic for containerized stateless environments?
2. Should alias mapping be persisted or in-memory only? (in-memory likely enough for runtime compatibility and low complexity.)
3. Any risk if two legacy aliases point to same canonical ID? (should be tolerated.)

## Design Implications

- Introduce explicit node ID alias canonicalization at runtime placement boundary.
- Register aliases during federated catalog resolution when remote runtime canonical ID differs from input node ID.
- Keep no-backward-compat wrappers; instead canonicalize at a single shared boundary.
