# Requirements - team-members-node-visibility-detail

## Status
Refined

## Goal / Problem Statement
In Agent Team detail view, member cards do not clearly show which node each member belongs to. Users cannot distinguish embedded-node members from remote-node members, which causes confusion for cross-node teams.

## Scope Triage
- Size: `Small`
- Rationale: Frontend-only behavior change in Agent Team detail members area, with localized resolver cleanup and unit-test updates.
- Workflow depth: `Small` path (implementation-plan solution sketch + future-state runtime call stack + iterative review gate).

## In-Scope Use Cases
1. User opens Agent Team detail and can identify each member's node source from the member card.
2. User can still see blueprint/member type/coordinator indicators without losing existing signals.
3. Remote members with unavailable node metadata still present understandable source text.
4. Team member runtime naming remains node-aware for cross-node members.

## Acceptance Criteria
1. Each member card in Agent Team detail shows a node/source indicator derived from `homeNodeId`.
2. Node/source indicator is shown for all members to keep scanning consistent.
3. Remote members use a distinct visual style from embedded members.
4. Source indicator text uses resolved node name when available; otherwise falls back to `homeNodeId` (never blank).
5. Existing member info (`memberName`, `Blueprint`, type/coordinator chips) remains intact.
6. Detail view continues to resolve blueprint name by `(homeNodeId, referenceId)` (no cross-node ID collision regression).
7. Team context member naming remains node-aware for remote members.
8. Unit tests cover node/source indicator behavior for embedded and remote members.
9. `embedded-local` is rendered as `Embedded Node` (never as raw ID text).

## Constraints / Dependencies
- No backend/API schema changes.
- Reuse existing node registry and federated catalog data already available in web app.
- Do not reintroduce required/preferred node hint controls removed in prior ticket.
- Keep members card layout readable on desktop and mobile breakpoints.

## Assumptions
- Node names from `nodeStore` are user-friendly when available.
- `embedded-local` should display as `Embedded Node` for readability.

## Open Questions / Risks
- Risk: if node registry is stale/unavailable, source indicator may fall back to technical node ID.
- Risk: duplicated member-reference resolver logic can drift; this ticket will reduce local duplication where practical without broad refactor.
