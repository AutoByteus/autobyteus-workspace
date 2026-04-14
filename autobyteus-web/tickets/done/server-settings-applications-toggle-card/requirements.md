# Requirements

- Ticket: `server-settings-applications-toggle-card`
- Status: `Design-ready`
- Scope: `Small`

## User Intent

Update Server Settings -> Basics so the Applications control is no longer rendered as a special top panel. It should appear as a normal settings card like the other cards on the page and use a single toggle interaction for enabled/disabled instead of separate Enable and Disable buttons.

## Functional Requirements

1. In the Server Settings Basics experience, the Applications control must render as a normal card within the same card layout used by the rest of the page.
2. The Applications control must use a single toggle-style control to switch between enabled and disabled states.
3. Toggling Applications must keep using the existing typed capability boundary and continue refreshing raw server settings after a successful update.
4. Existing status and error feedback for the Applications capability must remain visible.
5. Opening `Settings -> Server Settings -> Basics` in the built Electron app must not remain stuck on the loading spinner because the bound backend is still becoming ready.

## Acceptance Criteria

1. The Applications card is no longer mounted above the Server Settings Basics content as a standalone top panel.
2. The Applications card renders inside the Basics card grid with the same visual treatment as the other cards.
3. Clicking the toggle when Applications is disabled calls the existing enable flow once; clicking it when enabled calls the existing disable flow once.
4. Existing component tests are updated or extended to cover the toggle behavior and the new placement.
5. When the bound backend is not ready yet, server settings loads wait for readiness and then either resolve or surface a deterministic error; the Basics area must not stay loading indefinitely.

## Notes

- No backend or GraphQL contract changes are required for this ticket.
- The reopened regression fix should land in the server-settings load boundary, not by reintroducing the old top-mounted Applications card behavior.
