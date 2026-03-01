# Investigation Notes - Disable Applications Menu By Default

- **Ticket**: disable-applications-menu-by-default
- **Date**: 2026-02-28

## Key Findings
- The sidebar is implemented in `autobyteus-web/components/AppLeftPanel.vue`.
- The menu items are defined in a constant `primaryNavItems`.
- The `applications` route is handled by `autobyteus-web/pages/applications/index.vue` and `autobyteus-web/pages/applications/[id].vue`.
- Environment variables are managed in `autobyteus-web/nuxt.config.ts` via `runtimeConfig.public`.
- The project uses Nuxt 3.

## Entrypoints & Boundaries
- `AppLeftPanel.vue`: The UI entrypoint for the Applications link.
- `nuxt.config.ts`: The configuration entrypoint for the feature flag.
- `pages/applications/*`: The route entrypoints for the Applications feature.

## Proposed Naming
- Environment variable: `ENABLE_APPLICATIONS` (maps to `VITE_ENABLE_APPLICATIONS` if using Vite prefixing, but Nuxt 3 `runtimeConfig` can use plain `ENABLE_APPLICATIONS` and map it to `public.enableApplications`).
- Runtime config key: `enableApplications`.

## Unknowns / Questions
- Should I also restrict access to the `/applications` routes using middleware, or just hide the link? The user only asked to "disable it" and "it should not be shown by default". Hiding the link is the primary request. Adding a middleware is safer.

## Triage
- **Scope**: Small.
- **Rationale**: Only 2-3 files need modification (`nuxt.config.ts`, `AppLeftPanel.vue`, and optionally a middleware).
