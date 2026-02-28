# Requirements

## Status

- Current Status: `Draft`
- Previous Status: `N/A`

## Goal / Problem Statement

Naming is still mixed between runtime IDs and definition IDs in `autobyteus-server-ts` and `autobyteus-web`.

This ticket establishes a strict identity model:

- Runtime execution identity must use `runId` / `teamRunId`.
- Definition identity must use `agentDefinitionId` / `teamDefinitionId` / `agentTeamDefinitionId`.
- Ambiguous `agentId` usage must be removed from frontend/server active code paths.

Exception boundary:

- `autobyteus-ts` may continue exposing `agentId` in core contracts for now.
- Frontend/server adapters must map core `agentId` values to explicit local names immediately (`runId` or `agentDefinitionId` based on semantics).

## Scope Classification

- Classification: `Large`
- Rationale:
  - Cross-layer refactor across API contracts, GraphQL schema/docs, services, stores, components, and tests in both server and web repos.
  - Requires semantic audit to avoid mis-renaming true definition IDs vs runtime IDs.

## In-Scope Use Cases

- `UC-001`: Runtime execution APIs/events/state in server/web use `runId` semantics only.
- `UC-002`: Definition selection/config APIs/events/state in server/web use `agentDefinitionId` semantics only.
- `UC-003`: GraphQL operations/types/variables clearly distinguish run identity vs definition identity.
- `UC-004`: Streaming/session/history/artifact/memory flows in server/web remove ambiguous `agentId` naming where values are runtime IDs.
- `UC-005`: Core boundary mapping remains explicit where `autobyteus-ts` still emits `agentId`.

## Out Of Scope / Non-Goals

- No rename of `autobyteus-ts` core public contracts in this ticket.
- No runtime behavior changes beyond naming/contract clarity.
- No physical DB column rename unless strictly required; prefer ORM field mapping where needed.

## Acceptance Criteria

1. No ambiguous `agentId` identifiers remain in active `autobyteus-server-ts` and `autobyteus-web` code paths, except explicit core-boundary adapters.
2. Runtime execution identity surfaces use `runId` / `teamRunId` naming end-to-end.
3. Definition identity surfaces use `agentDefinitionId` / `teamDefinitionId` / `agentTeamDefinitionId` naming end-to-end.
4. Remaining `agentId` references in server/web are documented and limited to `autobyteus-ts` compatibility boundaries with immediate normalization.
5. GraphQL schema, resolvers, queries/mutations/subscriptions, generated typings, and store/component consumers are aligned to the new naming.
6. Tests are updated and passing for impacted server/web modules.
7. Validation includes scoped scan evidence proving no unauthorized `agentId` usage remains in server/web.

## Constraints / Dependencies

- Breaking API/schema renames are acceptable in this ticket.
- Repos in scope:
  - `autobyteus-server-ts`
  - `autobyteus-web`
- External dependency boundary:
  - `autobyteus-ts` (read-only compatibility boundary in this ticket)

## Assumptions

- Current code already contains partial `runId` migration; this task is the completion and hardening pass.
- User intent is strict naming clarity, not backward alias retention for ambiguous runtime `agentId` names in server/web.

## Open Questions / Risks

1. Should GraphQL compatibility aliases be explicitly rejected everywhere, or allowed temporarily in isolated adapter layers?
2. Some `agentId` occurrences may represent true ownership/entity identity; these must be semantically verified before rename.
3. Codegen/schema synchronization may temporarily fail if local/generated schema sources lag behind refactor changes.

## Requirement IDs

- `R-001`: Server/web runtime identities use `runId` / `teamRunId` only.
- `R-002`: Server/web definition identities use `agentDefinitionId` / `teamDefinitionId` / `agentTeamDefinitionId` only.
- `R-003`: Ambiguous `agentId` usage is eliminated from server/web active paths.
- `R-004`: Any required `agentId` compatibility is confined to explicit core-boundary adapters with immediate local normalization.
- `R-005`: Validation artifacts prove naming compliance and no regressions in impacted tests.
