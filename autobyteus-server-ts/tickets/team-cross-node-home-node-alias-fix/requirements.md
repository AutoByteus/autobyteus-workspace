# Requirements - team-cross-node-home-node-alias-fix

## Status

`Design-ready`

## Goal / Problem Statement

When a team member is configured on a remote node, sending the first message to bootstrap the team must not fail with `UnknownHomeNodeError` caused by node ID mismatch between persisted `homeNodeId` and discovery runtime node IDs.

## Scope Classification

- Classification: `Small`
- Rationale:
  - Behavior bug is centered on node ID canonicalization and placement validation.
  - Expected implementation touch points are limited and cohesive (catalog canonicalization + placement canonicalization + tests).

## In-Scope Use Cases

- `UC-001` New remote team run bootstrap succeeds when frontend provided a stale/manual node ID alias for the selected remote node.
- `UC-002` Existing team definition with aliased remote `homeNodeId` can bootstrap successfully in the same server session after catalog resolution registers canonical alias mapping.
- `UC-003` Existing strict error path remains intact for truly unknown node IDs with no alias mapping.

## Acceptance Criteria

1. Remote catalog resolution canonicalizes remote node identity against runtime discovery identity when available.
2. When canonical differs from input node ID, alias mapping is registered (`input -> canonical`).
3. Placement resolution canonicalizes member `homeNodeId` using alias mapping before ownership validation.
4. Team bootstrap with aliased `homeNodeId` succeeds when canonical node exists and is healthy.
5. Strict `UnknownHomeNodeError` still throws when no canonical/alias mapping exists.
6. Automated tests cover canonicalization and placement behavior.

## Constraints / Dependencies

- No legacy compatibility branches spread across call sites.
- Keep changes localized and single-responsibility.
- Preserve current public GraphQL contract.

## Assumptions

- Federated catalog query is executed during normal UI workflows before run bootstrap.
- In-memory alias map per server process is sufficient for runtime behavior and current UX.

## Open Questions / Risks

- Alias map is process-local; server restart clears aliases.
- If two remote nodes expose same definitions, reference-ID-based recovery is intentionally out-of-scope.

## Non-Goals

- Full persistence migration of historical team definitions in database.
- Changing frontend data model in this task unless backend-only fix proves insufficient.
