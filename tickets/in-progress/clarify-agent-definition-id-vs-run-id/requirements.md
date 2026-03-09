# Requirements

## Status

- Current Status: `Design-ready`
- Previous Status: `Draft`

## Goal / Problem Statement

Naming is still mixed between runtime IDs and definition IDs in `autobyteus-server-ts` and `autobyteus-web`.

This round focuses specifically on the messaging / external-channel flows that were developed across the gateway, server, and frontend before the run-vs-definition naming model was fully stabilized.

The user has confirmed the intended model:

- There is no generic runtime `agentId` / `teamId` in server/web messaging flows anymore.
- Runtime targets must be expressed as `agentRunId` and `teamRunId`.
- Definition-owned references must be expressed as `agentDefinitionId`, `teamDefinitionId`, or `agentTeamDefinitionId` based on the owning entity.

This ticket establishes a strict identity model:

- Runtime execution identity must use `runId` / `teamRunId`.
- Definition identity must use `agentDefinitionId` / `teamDefinitionId` / `agentTeamDefinitionId`.
- Ambiguous `agentId` usage must be removed from frontend/server active code paths.

Exception boundary:

- `autobyteus-ts` may continue exposing `agentId` in core contracts for now.
- Frontend/server adapters must map core `agentId` values to explicit local names immediately (`runId` or `agentDefinitionId` based on semantics).

## Scope Classification

- Classification: `Medium`
- Rationale:
  - The active mismatch is cross-layer across the messaging binding control-plane (`server domain boundary -> GraphQL -> web`).
  - The audited runtime/storage internals are already mostly correct on `agentRunId` / `teamRunId`.
  - The required work is a naming-consistency refactor, not a broader architectural rewrite.

## In-Scope Use Cases

- `UC-000`: Messaging/external-channel review identifies every remaining ambiguous runtime-vs-definition identifier in active server/web messaging flows before implementation begins.
- `UC-001`: External-channel binding GraphQL queries/mutations/types expose `targetRunId` rather than `targetId`.
- `UC-002`: Web messaging binding stores, composables, and components use `targetRunId` consistently for runtime target selection and verification.
- `UC-003`: Server target-option contracts use `targetRunId` consistently for active agent/team runtime options.
- `UC-004`: Server runtime execution internals continue using `agentRunId` / `teamRunId` without regression.
- `UC-005`: Definition selection/config APIs outside the messaging runtime path keep valid `agentDefinitionId` / `teamDefinitionId` naming and are not falsely renamed.
- `UC-006`: Core boundary mapping remains explicit where `autobyteus-ts` still emits `agentId`.

## Out Of Scope / Non-Goals

- No rename of `autobyteus-ts` core public contracts in this ticket.
- No runtime behavior changes beyond naming/contract clarity.
- No physical DB column rename unless strictly required; prefer ORM field mapping where needed.
- No broad repo-wide rename outside the messaging / external-channel active path in this round.

## Acceptance Criteria

1. Active messaging / external-channel GraphQL binding APIs no longer expose `targetId`; they expose `targetRunId`.
2. Active messaging / external-channel web models, stores, composables, UI text, and tests no longer use `targetId`; they use `targetRunId`.
3. Server-side active target-option contracts no longer use `targetId`; they use `targetRunId`.
4. Server runtime execution/storage paths continue using `agentRunId` / `teamRunId` and are not regressed by the boundary rename.
5. No valid definition-ID paths are incorrectly renamed during this round.
6. Remaining `agentId` references in server/web messaging-adjacent active paths, if any, are documented and limited to explicit compatibility boundaries with immediate normalization.
7. Focused server/web tests for the renamed messaging/external-channel path are updated and passing.
8. Validation includes scoped scan evidence proving no `targetId` remains in active messaging/external-channel server/web code.

## Constraints / Dependencies

- Breaking API/schema renames are acceptable in this ticket.
- Repos in scope:
  - `autobyteus-server-ts`
  - `autobyteus-web`
  - `autobyteus-message-gateway` compatibility surfaces where server/web naming is consumed or normalized
- External dependency boundary:
  - `autobyteus-ts` (read-only compatibility boundary in this ticket)

## Assumptions

- The active messaging runtime/storage model is already correct on `agentRunId` / `teamRunId`.
- The main remaining semantic blur is the generic binding/control-plane field name `targetId`.
- User intent is strict naming clarity, not backward alias retention for ambiguous runtime naming in the messaging feature.

## Open Questions / Risks

1. Should GraphQL compatibility aliases be explicitly rejected everywhere, or allowed temporarily in isolated adapter layers?
2. Are there any non-web GraphQL consumers that still depend on `targetId`?
3. Codegen/schema synchronization may temporarily fail if local/generated schema sources lag behind refactor changes.

## Requirement IDs

- `R-000`: Messaging/external-channel active paths are explicitly audited for runtime-vs-definition naming semantics before rename decisions are applied.
- `R-001`: Messaging/external-channel binding control-plane APIs expose runtime target identity as `targetRunId`, not `targetId`.
- `R-002`: Server runtime internals continue using `agentRunId` / `teamRunId` only.
- `R-003`: Definition identities remain explicit and are not conflated with runtime target identities.
- `R-004`: Any required `agentId` compatibility is confined to explicit core-boundary adapters with immediate local normalization.
- `R-005`: Validation artifacts prove naming compliance and no regressions in impacted tests.
