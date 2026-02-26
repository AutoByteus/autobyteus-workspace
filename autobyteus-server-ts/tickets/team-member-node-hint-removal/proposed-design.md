# Proposed Design - Team Member Node Hint Removal (v1)

## 1. Current State (As-Is)
- Team member model carries three placement-related fields: `homeNodeId`, `requiredNodeId`, `preferredNodeId`.
- Placement resolver evaluates in order: required -> home -> preferred -> default.
- Constraint policy validates hint fields and ownership/hint mismatch.
- GraphQL `TeamMember` and `TeamMemberInput` expose both hint fields.
- Frontend query/store types still request/store hint fields even though the form now normalizes them to `null`.

## 2. Target State (To-Be)
- Team member ownership is single-source: `homeNodeId`.
- `requiredNodeId` and `preferredNodeId` are removed from runtime domain and GraphQL contracts.
- Placement resolver resolves by `homeNodeId` first; default placement remains only defensive fallback for missing/invalid legacy ownership.
- Constraint policy validates ownership node only (known + available).
- Frontend contract/query/store no longer requests or stores hint fields.

## 3. Change Inventory

| Type | File/Area | Change |
|---|---|---|
| Modify | `src/agent-team-definition/domain/models.ts` | Remove hint properties from `TeamMember`.
| Modify | `src/api/graphql/types/agent-team-definition.ts` | Remove hint fields from GraphQL object/input and resolver mapping.
| Modify | `src/api/graphql/converters/agent-team-definition-converter.ts` | Stop serializing hint fields.
| Modify | `src/agent-team-definition/converters/prisma-converter.ts` | Ignore legacy hint keys on read; stop writing hint keys.
| Modify | `src/distributed/member-placement/member-placement-resolver.ts` | Remove hint-based precedence branches and sources.
| Modify | `src/distributed/policies/placement-constraint-policy.ts` | Remove hint-validation error classes and logic; keep ownership checks.
| Remove | Hint-focused tests | Remove/replace tests tied only to required/preferred behavior.
| Modify | Frontend query/store/types/tests | Remove hint fields from query, types, and assertions.

## 4. Naming Decisions
- Keep `homeNodeId` name because it directly matches ownership semantics.
- Remove `requiredNodeId` and `preferredNodeId` names entirely to avoid dual-source ambiguity.

## 5. Separation of Concerns
- Domain model owns persistent shape and meaning (`homeNodeId` only).
- Placement policy owns only ownership validity checks.
- Placement resolver owns routing decision order, no cross-field conflict logic.
- GraphQL layer reflects the simplified domain contract.
- Frontend store mirrors API contract (no additional placement semantics).

## 6. Dependency Flow
GraphQL resolver -> Domain model -> Placement resolver/policy -> Team run orchestrator.

No cycle changes expected.

## 7. Use-case Coverage Matrix

| use_case_id | Primary | Fallback | Error | Runtime Stack Section |
|---|---|---|---|---|
| UC1-create-team-definition | Yes | N/A | Yes | Section 1 |
| UC2-update-team-definition | Yes | N/A | Yes | Section 2 |
| UC3-start-distributed-team-run | Yes | Yes | Yes | Section 3 |
| UC4-load-legacy-json-with-hints | Yes | N/A | N/A | Section 4 |

## 8. Cleanup / Decommission
- Delete obsolete hint-only error classes and tests.
- Remove hint fields from frontend generated/types query shape.
- Remove hint persistence writes in Prisma converter output payload.
