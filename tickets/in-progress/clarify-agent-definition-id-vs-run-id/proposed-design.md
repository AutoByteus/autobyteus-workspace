# Proposed Design

## Summary

The active messaging / external-channel runtime already dispatches with explicit `agentRunId` / `teamRunId`.

The remaining naming inconsistency lives in the binding control-plane boundary:

- server GraphQL binding APIs expose `targetId`
- server target-option contracts expose `targetId`
- web messaging types/stores/composables/components/tests propagate `targetId`

Those values are always runtime target IDs, never definition IDs.

This design renames the boundary contract to `targetRunId` everywhere in the messaging / external-channel feature while preserving the existing internal runtime model:

- generic runtime selection boundary: `targetType` + `targetRunId`
- server runtime/storage internals: `agentRunId` / `teamRunId`
- definition identity elsewhere: `agentDefinitionId` / `teamDefinitionId`

## Goals

- Remove the semantic blur between generic target identity and runtime identity in the messaging feature.
- Keep run-vs-definition naming consistent across the messaging server/web control-plane.
- Avoid runtime behavior changes.

## Non-Goals

- No broad repo-wide identity rename outside the messaging / external-channel feature.
- No change to `autobyteus-ts` contracts in this ticket.
- No database schema rename unless required by existing provider abstractions.

## Design Decisions

### 1. Rename `targetId` to `targetRunId` at the control-plane boundary

Affected contract owners:

- server external-channel domain option types
- server GraphQL external-channel setup types
- web messaging models
- web messaging stores/composables/components/tests

Rationale:

- `targetType` stays as the discriminator (`AGENT` or `TEAM`)
- the paired value is always a run identity, so `targetRunId` is the correct generic name

### 2. Preserve explicit `agentRunId` / `teamRunId` in server runtime/storage internals

No rename is required in:

- channel binding domain storage
- runtime dispatch facade
- turn receipt binding persistence
- ingress dispatch target normalization

Rationale:

- those internals already encode the runtime target precisely

### 3. Do not rename valid definition-ID references

Definition naming remains unchanged outside this feature:

- `agentDefinitionId`
- `teamDefinitionId`
- `agentTeamDefinitionId`

Rationale:

- the investigation found no active messaging path that mislabels a definition ID
- renaming valid definition references would increase scope without improving clarity

### 4. Break the GraphQL schema cleanly for this field

Default plan:

- replace `targetId` with `targetRunId`
- update all in-repo consumers in the same change
- do not keep a long-lived compatibility alias unless a concrete external consumer is discovered

Rationale:

- requirements explicitly allow breaking API/schema changes
- retaining both fields would weaken the naming cleanup and prolong ambiguity

## Change Set

### Server

#### `external-channel` domain

- Rename `ChannelBindingTargetOption.targetId -> targetRunId`

#### `external-channel` services

- Rename target-option service method parameters/local names:
  - `targetId -> targetRunId`
- Keep `agentRunId` / `teamRunId` unchanged internally

#### GraphQL `external-channel-setup`

- Rename output fields:
  - `ExternalChannelBindingGql.targetId -> targetRunId`
  - `ExternalChannelBindingTargetOptionGql.targetId -> targetRunId`
- Rename mutation input:
  - `UpsertExternalChannelBindingInput.targetId -> targetRunId`
- Update resolver validation and mapping accordingly

### Web

#### Types

- Rename:
  - `ExternalChannelBindingModel.targetId -> targetRunId`
  - `ExternalChannelBindingDraft.targetId -> targetRunId`
  - `ExternalChannelBindingTargetOption.targetId -> targetRunId`
  - `SetupBlockerAction.targetId -> targetRunId`

#### GraphQL documents

- Replace all `targetId` query/mutation selections and variables with `targetRunId`

#### Stores / composables / components

- Rename state, validators, error fields, selections, watchers, and UI labels from `targetId` to `targetRunId`
- Update UI placeholder/help text so users see `targetRunId`, not `targetId`

#### Tests

- Update all impacted messaging binding specs and store tests

## Compatibility / Migration

- Server runtime/storage data model remains compatible because stored bindings already use `agentRunId` / `teamRunId`
- No migration is required for persisted binding rows
- GraphQL clients must update to the new field name in the same change

## Validation Strategy

- Focused server unit tests for external-channel GraphQL mapping / target options
- Focused web tests for:
  - messaging binding setup store
  - binding options store/composables
  - channel binding setup component
  - verification store where target runtime activity is checked
- Repo scan proving no `targetId` remains in active messaging / external-channel server/web code

## Risks

1. A non-web GraphQL consumer may still depend on `targetId`.
2. Some tests may need more updates than the initial rename set suggests because the binding flow is shared across multiple composables.
3. Any generated schema/type caches may need rebuild/sync after the rename.
