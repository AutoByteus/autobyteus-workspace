# Future-State Runtime Call Stack

## Use Case 1: Server Settings Basics renders Applications as a normal card

1. User opens `Settings -> Server Settings -> Basics`.
2. `pages/settings.vue` renders `ServerSettingsManager` for the server settings section without mounting a separate top-level Applications card.
3. `ServerSettingsManager.vue` renders the Basics card grid.
4. The Basics card grid includes `ApplicationsFeatureToggleCard` as one grid item alongside the other settings cards.
5. `ApplicationsFeatureToggleCard.vue` resolves the Applications capability and displays the current state within its card body.

## Use Case 2: User enables or disables Applications with a single switch

1. User clicks the switch control inside `ApplicationsFeatureToggleCard`.
2. The card computes the next desired enabled state from the current resolved capability.
3. The card calls `applicationsCapabilityStore.setEnabled(nextEnabled)`.
4. After the mutation succeeds, the card runs the existing best-effort raw server settings refresh through `serverSettingsStore.reloadServerSettings()`.
5. The card updates its switch position, inline state label, and status/error messaging from the store state.

## Invariants

1. The typed Applications capability boundary remains the authoritative source of truth.
2. No new server setting write path is introduced.
3. The visual placement change does not alter the existing server settings tabs or route structure.
