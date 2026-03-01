# Future-State Runtime Call Stack - Disable Applications Menu By Default

- **Ticket**: disable-applications-menu-by-default
- **Design Basis**: Implementation Plan Sketch (v1)

## Use Case: UC-001 (Applications menu item is hidden by default)
- **Source**: Requirement
- **Status**: Target

```
autobyteus-web/components/AppLeftPanel.vue:setup()
  -> useRuntimeConfig()
  -> primaryNavItems (constant)
  -> filteredPrimaryNavItems (computed)
    -> if (!config.public.enableApplications) filter out 'applications' item
autobyteus-web/components/AppLeftPanel.vue:template
  -> v-for="item in filteredPrimaryNavItems"
    -> 'Applications' item is NOT rendered
```

## Use Case: UC-002 (Applications menu item is visible when enabled)
- **Source**: Requirement
- **Status**: Target

```
autobyteus-web/nuxt.config.ts:runtimeConfig
  -> public.enableApplications = process.env.ENABLE_APPLICATIONS === 'true' (e.g. true)
autobyteus-web/components/AppLeftPanel.vue:setup()
  -> useRuntimeConfig()
  -> filteredPrimaryNavItems (computed)
    -> if (config.public.enableApplications) keep 'applications' item
autobyteus-web/components/AppLeftPanel.vue:template
  -> v-for="item in filteredPrimaryNavItems"
    -> 'Applications' item IS rendered
```

## Use Case: UC-003 (Direct navigation to /applications is redirected)
- **Source**: Requirement
- **Status**: Target

```
autobyteus-web/middleware/applications.ts:anonymous function
  -> useRuntimeConfig()
  -> if (!config.public.enableApplications)
    -> navigateTo('/workspace')
autobyteus-web/pages/applications/*.vue:definePageMeta({ middleware: 'applications' })
```
