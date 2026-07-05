# Implementation Visual Rework Note

## Trigger

The user reviewed the implemented Token Statistics task table UI and reported that the first visual pass was too heavy/ugly: the sort indicators looked like oversized header icons and the `Details` text button in the Total Cost column made the table visually noisy.

## Rework Performed

- Replaced the text/glyph header sort marker with a compact two-triangle sort indicator rendered at `3px/4px` scale.
  - Neutral sortable columns show subtle gray up/down triangles.
  - The active direction uses the header text color.
  - Existing `aria-sort`, localized action labels, and keyboard/focus support remain intact.
- Replaced the boxed `Details` text button with a subtle inline value-plus-solid-triangle button, for example `0,1942 $ ▶`.
  - The control remains always visible, but no longer dominates the cell.
  - `aria-label`, `title`, `aria-expanded`, and `aria-controls` remain intact.
- Removed the extra inline status badge that duplicated `price missing`/partial status copy and made rows visually busier.
  - Non-`estimated` status remains visible in the formatted cost text (for example `price missing`, `partial est.`, `mixed est.`, `Local`) and in the expanded breakdown status badge.
- Removed the now-unused `Details` localization entry from English/Chinese settings messages and test mocks.

## Visual Fixture Validation

Used a temporary Nuxt fixture route (`autobyteus-web/pages/__token-usage-task-table-fixture.vue`) with deterministic task-table rows, served it through the local Nuxt frontend, and inspected screenshots with headless Chrome/Playwright. The temporary route was removed after capture and is not part of the git diff.

Evidence screenshots:

- Table close-up: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-table-ux/tickets/in-progress/token-statistics-table-ux/visual-fixture-token-table-solid-triangle-closeup.png`
- Expanded detail state: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-table-ux/tickets/in-progress/token-statistics-table-ux/visual-fixture-token-table-solid-triangle-expanded.png`


## Post-Review Accessibility Fix

After code review CR-001, the value-plus-solid-triangle control keeps the same visual design but its localized accessible label now includes the same formatted Total Cost value/status shown in the button, for example `Show cost details for Standalone Agent, total cost $2.20 partial est.` Focused tests assert the show/hide labels include that visible value/status while `aria-expanded` still changes.

## Checks After Rework

- `pnpm -C autobyteus-web exec vitest run components/settings/token-usage/__tests__/TokenUsageTaskStatisticsTable.spec.ts components/settings/__tests__/TokenUsageStatistics.spec.ts` — Passed (`2` files, `5` tests).
- `pnpm -C autobyteus-web run guard:localization-boundary` — Passed.
- `pnpm -C autobyteus-web run audit:localization-literals` — Passed with zero unresolved findings.
- `git diff --check` — Passed.
- `pnpm -C autobyteus-web exec nuxi typecheck 2>&1 | rg "TokenUsageTaskStatisticsTable|token-usage/__tests__/TokenUsageTaskStatisticsTable|localization/messages/(en|zh-CN)/settings"` — No changed-file matches in the known broad typecheck failure output.

## Current Implementation Scope

Changed source/test/localization files remain:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-table-ux/autobyteus-web/components/settings/token-usage/TokenUsageTaskStatisticsTable.vue`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-table-ux/autobyteus-web/components/settings/token-usage/__tests__/TokenUsageTaskStatisticsTable.spec.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-table-ux/autobyteus-web/localization/messages/en/settings.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-table-ux/autobyteus-web/localization/messages/zh-CN/settings.ts`

## Notes For Review

- The UI now prioritizes visual cleanliness while keeping persistent discoverability and accessibility semantics.
- The cost detail action is intentionally rendered as the full Total Cost value plus a small solid triangle, for example `0,1942 $ ▶`, so the affordance is visible without becoming a separate noisy button; accessibility is carried by labels/state.
- The temporary visual fixture route was not retained as durable code.
