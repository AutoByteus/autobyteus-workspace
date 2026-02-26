# Investigation Notes - team-node-id-canonical-only

## Goal

Remove alias compatibility behavior and keep a strict canonical node ID model.

## Findings

- Alias bridge was introduced to map non-canonical/stale `homeNodeId` values to runtime node IDs.
- This is compatibility behavior and conflicts with no-legacy policy.
- Canonicalization by authoritative discovery identity is already available in `FederatedCatalogService` via remote node resolution by base URL.
- Runtime placement should remain strict: only known runtime node IDs pass.

## Sources

- `src/federation/catalog/federated-catalog-service.ts`
- `src/distributed/member-placement/member-placement-resolver.ts`
- `src/distributed/policies/placement-constraint-policy.ts`
- `tests/unit/federation/federated-catalog-service.test.ts`
- `tests/unit/distributed/member-placement-resolver.test.ts`
- `tests/integration/distributed/run-placement.integration.test.ts`

## Implication

- Remove alias service and all alias-based runtime translation.
- Keep canonical remote-node normalization in catalog path only.
- Persisted stale definitions will fail fast and must be corrected by re-saving definitions with canonical node IDs.
