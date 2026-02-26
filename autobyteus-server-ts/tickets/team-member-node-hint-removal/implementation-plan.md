# Implementation Plan

## Scope
Cross-project implementation in:
- `autobyteus-server-ts` (domain/API/placement/runtime tests)
- `autobyteus-web` (query/generated types/store/form/tests)

## Work Items (Bottom-Up)
1. Backend domain + persistence shape cleanup
- Remove `requiredNodeId` / `preferredNodeId` from team member domain and GraphQL converter output.
- Stop writing hint keys in Prisma converter payload.
- Keep legacy read compatibility by ignoring legacy hint keys if present.

2. Backend placement runtime simplification
- Remove hint-based branches from member placement resolver.
- Simplify placement constraint policy to ownership (`homeNodeId`) validation only.
- Update dependent tests (unit/integration/e2e) to ownership-only semantics.

3. Backend API contract cleanup
- Remove hint fields from GraphQL types/input mapping for team definitions.
- Update GraphQL e2e tests accordingly.

4. Frontend contract/store cleanup
- Remove hint fields from team-definition query and store interfaces/normalization.
- Remove remaining form payload placeholder fields for hints.
- Regenerate frontend GraphQL types.

5. Verification
- Run targeted backend tests for placement, converter, GraphQL team definitions.
- Run targeted frontend tests for team-definition form/store/integration.

## Risks
- Generated GraphQL type drift after query changes.
- Existing tests may rely on old hint fields and require semantic rewrite, not only assertion edits.
