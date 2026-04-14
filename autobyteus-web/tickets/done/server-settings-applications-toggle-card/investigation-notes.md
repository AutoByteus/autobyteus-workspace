# Investigation Notes

- Date: `2026-04-14`
- Scope Triage: `Small`

## Relevant Surface

- `autobyteus-web/pages/settings.vue` mounts `ApplicationsFeatureToggleCard` above `ServerSettingsManager` whenever the active section is `server-settings`.
- `autobyteus-web/components/settings/ServerSettingsManager.vue` owns the Basics card grid where the normal server settings cards render.
- `autobyteus-web/components/settings/ApplicationsFeatureToggleCard.vue` currently renders the Applications control as a card with a status badge and two separate action buttons.
- `autobyteus-web/components/settings/__tests__/ApplicationsFeatureToggleCard.spec.ts` currently verifies the separate enable and disable buttons.
- `autobyteus-web/pages/__tests__/settings.spec.ts` currently expects the Applications card to be mounted from the settings page shell.

## Current Behavior

1. The Applications card is visually elevated because it sits in `pages/settings.vue` above the Server Settings manager instead of inside the Basics card grid.
2. The card uses separate Enable and Disable buttons, which does not match the simpler toggle interaction used elsewhere in the product.
3. The component already owns the typed capability fetch/update behavior and refreshes raw server settings after successful updates, so the behavioral change is mostly presentational and interaction-focused.

## Implementation Direction

1. Move the Applications card placement into `ServerSettingsManager.vue` so it renders inside the Basics grid like the other cards.
2. Refactor `ApplicationsFeatureToggleCard.vue` from dual buttons to a single switch-style control while keeping capability status, error display, and server settings refresh behavior intact.
3. Update the focused component/page tests to reflect the new placement and toggle semantics.
