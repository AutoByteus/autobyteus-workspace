# Team Member Node Hint Removal - Requirements

## Status
Design-ready

## Goal / Problem Statement
Agent team members are selected from a concrete source node (ownership via `homeNodeId`), but legacy fields `requiredNodeId` and `preferredNodeId` still exist in backend and API surfaces. This creates ambiguous modeling and user confusion because ownership and placement hint can conflict.

## Scope Triage
- Scope: Medium
- Rationale:
  - Cross-layer contract change (GraphQL input/output + frontend generated types/queries).
  - Backend runtime placement logic and policy simplification.
  - Multiple unit/integration/e2e tests in server and frontend need updates.

## In-scope Use Cases
1. Create team definition from frontend/member library where each member has `homeNodeId` only.
2. Update team definition and preserve ownership-only model (no node hint fields).
3. Start distributed team run with placement resolved by ownership (`homeNodeId`) or default fallback if ownership absent in legacy data.
4. Existing stored team definitions containing legacy hint keys still load safely without runtime breakage.

## Acceptance Criteria
1. Backend domain, GraphQL schema, and converters no longer expose `requiredNodeId` or `preferredNodeId`.
2. Distributed placement uses `homeNodeId` as authoritative node pin; no hint precedence branch remains.
3. Frontend team-definition query/store/types no longer depend on removed fields.
4. Create/update flows in frontend send only `homeNodeId` for member node placement metadata.
5. Legacy persisted JSON that still includes `required_node_id` / `preferred_node_id` can be parsed without failure; values are ignored.
6. Relevant tests in `autobyteus-server-ts` and `autobyteus-web` are updated and pass.

## Constraints / Dependencies
- No backward-compat retention for old API fields (workflow policy).
- Must not regress current distributed team startup behavior.
- Existing dirty worktrees must be respected; only targeted files updated.

## Assumptions
- Current UX intentionally binds member ownership to selected catalog node.
- `homeNodeId` remains required/non-empty at API boundary.
- Fallback default placement remains only as defensive handling for malformed/legacy data paths.

## Risks / Open Questions
- Regenerating frontend GraphQL types may affect unrelated generated sections.
- Some distributed tests may implicitly rely on legacy hint behavior and need behavior-oriented rewrite.
