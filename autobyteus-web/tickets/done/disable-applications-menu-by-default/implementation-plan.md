# Implementation Plan - Disable Applications Menu By Default

- **Ticket**: disable-applications-menu-by-default
- **Scope**: Small

## Solution Sketch (Design Basis)
1. **Configuration**: Modify `autobyteus-web/nuxt.config.ts` to add `enableApplications` to `runtimeConfig.public`. It will read from `process.env.ENABLE_APPLICATIONS`.
2. **Navigation**: Modify `autobyteus-web/components/AppLeftPanel.vue` to filter `primaryNavItems` based on the `enableApplications` flag from `useRuntimeConfig()`.
3. **Route Guard**: Create a Nuxt middleware `applications-guard.global.ts` (or named middleware applied to the applications page) to redirect users if the feature flag is disabled. Actually, a named middleware for the applications pages is cleaner.

## Proposed Architecture
- **Layer**: Configuration / UI / Routing
- **Decoupling**: The UI and Routing layers will depend on the configuration layer (runtimeConfig).

## Change Inventory
| File Path | Change Type | Responsibility |
| --- | --- | --- |
| `nuxt.config.ts` | Modify | Add `enableApplications` feature flag to public runtime config. |
| `components/AppLeftPanel.vue` | Modify | Filter navigation items based on `enableApplications`. |
| `components/layout/LeftSidebarStrip.vue` | Modify | Filter navigation items based on `enableApplications`. |
| `middleware/applications.ts` | Add | Redirect to `/workspace` if `enableApplications` is false. |
| `pages/applications/index.vue` | Modify | Apply `applications` middleware. |
| `pages/applications/[id].vue` | Modify | Apply `applications` middleware. |

## Verification Plan
- **Unit/Integration**: Check if `AppLeftPanel` filters items correctly (if tests exist).
- **Manual/E2E**:
  - Start app without `ENABLE_APPLICATIONS` env var: "Applications" should be hidden, and direct navigation to `/applications` should redirect.
  - Start app with `ENABLE_APPLICATIONS=true`: "Applications" should be visible and accessible.
