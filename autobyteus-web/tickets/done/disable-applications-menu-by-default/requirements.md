# Requirements - Disable Applications Menu By Default

- **Status**: Design-ready
- **Ticket**: disable-applications-menu-by-default
- **Date**: 2026-02-28

## Goal / Problem Statement
The "Applications" menu item is currently visible in the frontend sidebar by default. However, this feature is not yet fully functional and should be hidden by default. It should only be visible if explicitly enabled via a feature flag (environment variable).

## In-Scope Use Cases
- UC-001: Applications menu item is hidden by default in the sidebar.
- UC-002: Applications menu item is visible when the feature flag is enabled.
- UC-003: Direct navigation to `/applications` is redirected to `/workspace` (or another default page) when the feature flag is disabled.

## Acceptance Criteria
- AC-001: The "Applications" link in `AppLeftPanel.vue` is NOT visible when `runtimeConfig.public.enableApplications` is `false`.
- AC-002: The "Applications" link in `AppLeftPanel.vue` IS visible when `runtimeConfig.public.enableApplications` is `true`.
- AC-003: Accessing `/applications` directly redirects to `/workspace` when `runtimeConfig.public.enableApplications` is `false`.
- AC-004: `runtimeConfig.public.enableApplications` is initialized from `process.env.ENABLE_APPLICATIONS === 'true'` in `nuxt.config.ts`, defaulting to `false`.

## Constraints / Dependencies
- Must use Nuxt 3 `runtimeConfig`.
- Environment variable: `ENABLE_APPLICATIONS`.

## Assumptions
- Hiding the menu item and adding a route guard is sufficient to "disable" the feature for users.

## Open Questions / Risks
- None.

## Triage
- **Scope**: Small.
- **Rationale**: Minimal changes to configuration, navigation component, and addition of a simple middleware.
