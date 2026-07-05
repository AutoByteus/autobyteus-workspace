# Implementation Local Fix — CR-001

## Trigger

Code review round 3 failed on CR-001 because the Total Cost value-plus-solid-triangle control used an `aria-label` containing only the show/hide action and row name. Since `aria-label` overrides the button contents, assistive technology could miss the visible Total Cost amount/status even though the whole value is now clickable.

## Fix Performed

- Kept the visually approved value-plus-solid-triangle Total Cost control unchanged.
- Added a `formattedTotalCost(row)` helper so the visible Total Cost text and the accessibility label use the same formatter-owned value/status string.
- Updated the localized show/hide label payload to include both the row name and formatted Total Cost, for example: `Show cost details for Standalone Agent, total cost $2.20 partial est.`
- Updated English and Chinese locale strings to include the `cost` placeholder.
- Updated focused component coverage to assert:
  - the show-state accessible label includes the same visible Total Cost text;
  - the non-complete status suffix (`partial est.`) remains in the accessible label;
  - the hide-state label also includes the visible Total Cost text/status;
  - `aria-expanded` still changes when the details row opens.

## Files Changed For This Fix

- `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-table-ux/autobyteus-web/components/settings/token-usage/TokenUsageTaskStatisticsTable.vue`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-table-ux/autobyteus-web/components/settings/token-usage/__tests__/TokenUsageTaskStatisticsTable.spec.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-table-ux/autobyteus-web/localization/messages/en/settings.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-table-ux/autobyteus-web/localization/messages/zh-CN/settings.ts`

## Local Checks After Fix

- `pnpm -C autobyteus-web exec vitest run components/settings/token-usage/__tests__/TokenUsageTaskStatisticsTable.spec.ts components/settings/__tests__/TokenUsageStatistics.spec.ts` — Passed (`2` files, `5` tests).
- `pnpm -C autobyteus-web run guard:localization-boundary` — Passed.
- `pnpm -C autobyteus-web run audit:localization-literals` — Passed with zero unresolved findings. Benign Node module-type warning unchanged.
- `git diff --check` — Passed.

## Notes For Review

- This is an accessibility-only local fix; the visual triangle/value presentation is unchanged from the accepted value-plus-solid-triangle variant.
- Backend/store/token-cost semantics remain untouched.
- API/E2E coverage investigation and execution are still downstream-owned after code review passes.
