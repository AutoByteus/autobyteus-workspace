# Docs Sync

## Decision

- Result: `Docs Updated`

## Updated Docs

1. `autobyteus-web/docs/settings.md`
   - Updated the Server Settings section so the Applications feature toggle is described as a normal Basics-grid card instead of a panel above the settings content.

## Rationale

- The existing settings documentation explicitly described the old placement, so a no-impact decision would have left long-lived docs inaccurate.
- The reopened readiness and lifecycle fixes were internal store/runtime hardening changes. They did not change the user-facing settings contract beyond preserving the corrected Basics behavior, so no additional long-lived doc update was required.
