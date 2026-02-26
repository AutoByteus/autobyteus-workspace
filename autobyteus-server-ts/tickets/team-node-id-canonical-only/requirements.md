# Requirements - team-node-id-canonical-only

## Status

`Design-ready`

## Scope Classification

- Classification: `Small`
- Rationale: localized refactor to remove compatibility layer and preserve strict canonical runtime validation.

## Goal

Use canonical node IDs only. Remove runtime alias translation behavior.

## In-Scope Use Cases

- `UC-001`: Remote catalog responses use canonical runtime node IDs.
- `UC-002`: Placement resolver validates only canonical/known node IDs (plus existing `embedded-local` mapping to default node).
- `UC-003`: Non-canonical/stale `homeNodeId` values fail fast (`UnknownHomeNodeError`).

## Acceptance Criteria

1. Alias service and alias resolution logic are removed from runtime path.
2. Federated catalog still canonicalizes remote node IDs using discovery identity matching by base URL.
3. Member placement does not translate stale IDs; strict validation remains.
4. Unit/integration tests reflect canonical-only behavior.
5. No compatibility fallback code remains for stale node IDs.

## Constraints

- No backward compatibility branches.
- Keep changes focused and minimal.

## Assumptions

- Users will re-save/recreate old team definitions that carry stale node IDs.

## Risks

- Existing stale team definitions may fail until corrected.
