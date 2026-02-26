# Design Document (Server Binding Target Options For Setup UX)

## Summary
`targetId` is currently a raw input in web. This is error-prone because external-channel dispatch requires a running agent/team instance id. This ticket adds a setup-focused query in `external-channel` GraphQL resolver to provide active target options for dropdown selection.

## Goals
- Provide deterministic active target options for binding setup UI.
- Keep target-option logic in external-channel setup boundary.
- Avoid changing channel ingress runtime behavior.

## Non-Goals
- No auto-start of agents/teams from external-channel setup.
- No changes to binding DB schema.
- No dispatch fallback changes.

## Use Cases
- Use Case 1: Web queries active targets and renders dropdown for `AGENT`.
- Use Case 2: Web queries active targets and renders dropdown for `TEAM`.
- Use Case 3: No active instances; empty list returned with no server error.
- Use Case 4: User submits stale `targetId`; mutation rejects with deterministic validation error.

## File-Level Design (Separation of Concerns)

| File | Concern | APIs | Input -> Output |
| --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-server-ts/src/external-channel/services/channel-binding-target-options-service.ts` (new) | Aggregate and validate runtime targets for setup | `listActiveTargetOptions()`, `isActiveTarget(targetType, targetId)` | runtime managers + selected target -> options/validation |
| `/Users/normy/autobyteus_org/autobyteus-server-ts/src/external-channel/domain/models.ts` | External-channel setup contracts | add `ChannelBindingTargetOption` type | runtime state -> GraphQL DTO contract |
| `/Users/normy/autobyteus_org/autobyteus-server-ts/src/api/graphql/types/external-channel-setup.ts` | Setup GraphQL surface | add query `externalChannelBindingTargetOptions` | query -> target option list |
| `/Users/normy/autobyteus_org/autobyteus-server-ts/src/api/graphql/schema.ts` | Resolver registration continuity | keep `ExternalChannelSetupResolver` registration (updated fields) | resolver set -> schema |
| `/Users/normy/autobyteus_org/autobyteus-server-ts/tests/e2e/external-channel/external-channel-setup-graphql.e2e.test.ts` | GraphQL setup contract coverage | add target-options query coverage | GraphQL request -> validated shape |
| `/Users/normy/autobyteus_org/autobyteus-server-ts/tests/unit/external-channel/services/channel-binding-target-options-service.test.ts` (new) | Service behavior/filters | `listActiveTargetOptions` test suite | mocked managers -> sorted options |

## GraphQL Contract Addition

### Query
- `externalChannelBindingTargetOptions: [ExternalChannelBindingTargetOption!]!`

### Type
```graphql
type ExternalChannelBindingTargetOption {
  targetType: String!
  targetId: String!
  displayName: String!
  status: String!
}
```

### Semantics
- `targetType` is `AGENT` or `TEAM`.
- `targetId` is runtime instance id (the actual dispatch id required by ingress facade).
- `displayName` is human-friendly name from runtime instance metadata.
- `status` mirrors runtime `currentStatus` for operator clarity.

## Behavior Rules
- Only currently active runtime instances are returned.
- Stale ids from manager list are skipped if instance lookup returns null.
- Result sorted by:
  1. `targetType` (`AGENT` before `TEAM`),
  2. `displayName` ascending.
- `upsertExternalChannelBinding` validates that selected `(targetType, targetId)` is active at save-time.

## Error Handling
- Manager lookup failures return GraphQL error (existing resolver behavior).
- Partial stale ids do not fail the query; stale entries are filtered out.
- Mutation rejects stale targets with explicit validation error (`TARGET_NOT_ACTIVE`).

## Security
- Reuses existing authenticated GraphQL boundary.
- Exposes only non-sensitive metadata (`id`, name, status).

## Defaults
- Query returns `[]` when no active targets exist.
- No pagination in phase 1 (instance counts are operationally small).
- Runtime snapshot scope is local server process (single-node truth for current deployment model).

## Notes
This is intentionally setup-only. Message dispatch still fails fast when selected target is later terminated, which preserves runtime truth.
