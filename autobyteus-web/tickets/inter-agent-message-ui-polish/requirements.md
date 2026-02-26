# Requirements - inter-agent-message-ui-polish

## Goal / Problem
Inter-agent message segments currently surface raw sender IDs such as `member_<hex>`, which is hard to read. The segment also renders inside a prominent boxed card that feels heavier than the surrounding fluid conversation UI.

## Scope Triage
- Size: `Small`
- Rationale: Frontend-only rendering/data-mapping improvement across a few conversation components and tests.

## In-Scope Use Cases
1. Inter-agent segment shows member display name (e.g., `Professor`) instead of raw `member_<id>` when mapping is available.
2. When mapping is unavailable, sender label remains readable and does not expose noisy IDs as primary UI text.
3. Inter-agent segment uses a lighter inline visual style (reduced boxed-card feel) while preserving expandable metadata details.

## Acceptance Criteria
1. Team conversation inter-agent segments resolve sender label via active team member map keyed by `agentId`.
2. Segment header shows `From <memberName>:` when resolved, with content inline on the same row.
3. Segment visual style is de-emphasized (no heavy card container) and keeps chevron detail toggle behavior.
4. Existing unit tests are updated/extended to validate sender-name resolution and compact rendering.

## Constraints / Dependencies
- Keep existing streaming payload contract (no required backend API change).
- Preserve details disclosure UX (chevron + optional metadata row).
- No legacy/compatibility branch retention.

## Assumptions
- Active team context includes member runtime `agentId` values sufficient to build a sender-name map.
- Inter-agent segments are rendered within active team event monitor context when this mapping is needed.

## Open Questions / Risks
- Historical edge cases with unresolved sender IDs may still need fallback labeling (`Teammate`) until backend provides explicit sender display name.
