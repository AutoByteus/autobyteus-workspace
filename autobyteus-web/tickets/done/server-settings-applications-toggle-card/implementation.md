# Implementation

## Solution Sketch

1. Remove the dedicated Applications card mount from `autobyteus-web/pages/settings.vue` so the page shell no longer treats it as a special top-level panel.
2. Render `ApplicationsFeatureToggleCard` from `autobyteus-web/components/settings/ServerSettingsManager.vue` inside the Basics card grid so it inherits the same page rhythm as the other cards.
3. Replace the dual action buttons inside `autobyteus-web/components/settings/ApplicationsFeatureToggleCard.vue` with a single switch-style button that:
   - reflects the resolved enabled state,
   - shows a disabled/busy state while capability data is loading or saving,
   - reuses the existing `setEnabled(...)` path and raw server settings refresh.
4. Update the focused Vue tests to validate:
   - the card is no longer mounted from `pages/settings.vue`,
   - the switch toggles the capability on and off through the existing store method.

## Execution Notes

- This is a presentation and interaction refactor only.
- No API, GraphQL, store contract, or localization-domain expansion is expected unless the switch UI needs one small accessibility label.

## Completed Work

- Removed the top-level Applications card mount from `autobyteus-web/pages/settings.vue`.
- Added `ApplicationsFeatureToggleCard` to the Basics card grid owned by `autobyteus-web/components/settings/ServerSettingsManager.vue`.
- Replaced the card's dual-button controls with a switch-style button in `autobyteus-web/components/settings/ApplicationsFeatureToggleCard.vue`.
- Updated the page and component tests that cover placement and toggle interaction.

## Implementation Validation

- `pnpm exec vitest run components/settings/__tests__/ApplicationsFeatureToggleCard.spec.ts`
- `pnpm exec vitest run pages/__tests__/settings.spec.ts`
- `pnpm exec vitest run components/settings/__tests__/ServerSettingsManager.spec.ts`
