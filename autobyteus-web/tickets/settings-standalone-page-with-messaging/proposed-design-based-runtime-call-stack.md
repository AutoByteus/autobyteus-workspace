# Proposed-Design-Based Runtime Call Stacks (Debug-Trace Style)

## Design Basis

- Scope Classification: `Medium`
- Call Stack Version: `v3`
- Source Artifact: `/Users/normy/autobyteus_org/autobyteus-web/tickets/settings-standalone-page-with-messaging/proposed-design.md`
- Source Design Version: `v3`

## Use Case Index

- UC-001: Open standalone settings shell.
- UC-002: Use top-left back arrow to return to `/workspace`.
- UC-003: Open messaging setup inside settings section.
- UC-004: Global navigation no longer exposes messaging as top-level route.
- UC-005: Settings query normalization supports `section=messaging`.

## Use Case: UC-001 Open standalone settings shell

### Goal

Render settings without the global app-left panel chrome.

### Primary Runtime Call Stack

```text
[ENTRY] vue-router:route('/settings')
└── pages/settings.vue:definePageMeta({ layout: 'settings' })
    └── layouts/settings.vue:render(slot)
        ├── layouts/settings.vue:renderTopBar(backButton)
        └── pages/settings.vue:mount()
            ├── pages/settings.vue:onMounted()
            └── pages/settings.vue:renderActiveSection(activeSection)
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `N/A`

## Use Case: UC-002 Back arrow returns to workspace

### Goal

Provide explicit deterministic return path from settings.

### Primary Runtime Call Stack

```text
[ENTRY] layouts/settings.vue:onBackClick()
└── [ASYNC] vue-router:router.push('/workspace')
    └── pages/workspace.vue:mount()
```

### Branching / Fallback Paths

```text
[FALLBACK] if already on '/workspace'
layouts/settings.vue:onBackClick()
└── router.push('/workspace') # idempotent route push; no UI error
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `N/A`

## Use Case: UC-003 Messaging setup under settings section

### Goal

Expose Messaging setup as a settings section instead of a standalone page.

### Primary Runtime Call Stack

```text
[ENTRY] pages/settings.vue:onMounted()
├── [STATE] pages/settings.vue:normalizeSection(route.query.section)
├── decision: normalizedSection === 'messaging'
└── pages/settings.vue:renderActiveSection('messaging')
    └── components/settings/MessagingSetupManager.vue:mount()
        └── composables/useMessagingSetupBootstrap.ts:bootstrap()
```

### Branching / Fallback Paths

```text
[FALLBACK] user toggles from another section to messaging
pages/settings.vue:onSectionClick('messaging')
├── [STATE] activeSection = 'messaging'
└── render MessagingSetupManager
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `N/A`

## Use Case: UC-004 Global nav removes messaging top-level item

### Goal

Prevent duplicated IA between global nav and settings sections.

### Primary Runtime Call Stack

```text
[ENTRY] components/AppLeftPanel.vue:setup()
├── [STATE] primaryNavItems = [agents, agentTeams, applications, prompts, skills, tools, memory, media]
└── components/AppLeftPanel.vue:renderPrimaryNav()

[ENTRY] components/layout/LeftSidebarStrip.vue:setup()
├── [STATE] primaryNavItems = [agents, agentTeams, applications, prompts, skills, tools, memory, media]
└── components/layout/LeftSidebarStrip.vue:renderIcons()
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `N/A`

## Use Case: UC-005 Query normalization supports messaging section

### Goal

Ensure deep links to settings messaging section are deterministic.

### Primary Runtime Call Stack

```text
[ENTRY] vue-router:route('/settings?section=messaging')
└── pages/settings.vue:onMounted()
    ├── normalizeSection('messaging') -> 'messaging'
    ├── [STATE] activeSection = 'messaging'
    └── renderActiveSection('messaging')
```

### Branching / Fallback Paths

```text
[FALLBACK] invalid section query
pages/settings.vue:normalizeSection('unknown') -> null
└── [STATE] activeSection = 'api-keys' # default
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `N/A`
