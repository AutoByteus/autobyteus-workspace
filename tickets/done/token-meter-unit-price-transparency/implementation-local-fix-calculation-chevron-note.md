# Implementation Local Fix Note — Calculation Details Chevron Placement

## Source

- User feedback on Token Meter UI screenshots: the `Calculation details` disclosure chevron was at the far right edge, making it easy to miss.
- Requested change: move the chevron to the beginning of the disclosure label and use the same chevron style as the Activity section header.

## Local Fix Scope

This is a scoped UI polish fix inside the existing Token Meter `Pricing details` / `Calculation details` disclosure. It does not change server pricing authority, GraphQL shape, codegen output, token accounting, or calculation semantics.

## Change Made

- Updated `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-unit-price-transparency/autobyteus-web/components/workspace/usage/TokenUsageMeterPanel.vue`:
  - moved the disclosure chevron before `Calculation details` instead of at the far end of the row;
  - replaced the text glyph chevron with the same inline SVG stroke style used by `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-unit-price-transparency/autobyteus-web/components/progress/ActivityFeed.vue`;
  - matched the Activity header interaction pattern: downward chevron when expanded, `-rotate-90` when collapsed;
  - kept the full row as the click target and preserved `aria-expanded` / `aria-controls`.
- Updated `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-unit-price-transparency/autobyteus-web/components/workspace/usage/__tests__/TokenUsageMeterPanel.spec.ts` to assert:
  - the chevron is the first child in the disclosure button;
  - the collapsed state applies `-rotate-90`;
  - the expanded state removes `-rotate-90`.

## Focused Verification

- `pnpm -C autobyteus-web exec vitest run components/workspace/usage/__tests__/TokenUsageMeterPanel.spec.ts` — Passed, 6 tests.
- `pnpm -C autobyteus-web exec vitest run stores/__tests__/tokenUsageMeterStore.spec.ts components/workspace/usage/__tests__/TokenUsageMeterPanel.spec.ts` — Passed, 13 tests across 2 files.
- `git diff --check` — Passed.

## Residual Notes

- No frontend provider/model price table, fake blended mixed rate, compatibility fallback, or runtime workaround was introduced.
- No server, GraphQL, generated artifact, docs, or release/deployment files were changed by this local fix.
