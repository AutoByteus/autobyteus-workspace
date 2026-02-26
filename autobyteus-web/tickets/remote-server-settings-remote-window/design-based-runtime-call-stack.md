# Design-Based Runtime Call Stacks (Debug-Trace Style)

## Conventions

- Frame format: `path/to/file.ts:functionName(args?)`
- Boundary tags:
  - `[ENTRY]` external entrypoint
  - `[ASYNC]` async boundary
  - `[STATE]` in-memory mutation
  - `[IO]` network/file IO
  - `[FALLBACK]` non-primary branch
  - `[ERROR]` error path

## Design Basis

- Scope Classification: `Small`
- Source Artifact:
  - `tickets/remote-server-settings-remote-window/implementation-plan.md`
- Referenced Sections:
  - Solution Sketch
  - Dependency And Sequencing Map

## Use Case Index

- Use Case 1: Remote window opens Server Settings and edits settings.
- Use Case 2: Embedded window retains startup default route behavior.
- Use Case 3: Remote advanced panel hides embedded diagnostics controls.

## Use Case 1: Remote window opens Server Settings and edits settings

### Goal
Allow server settings access/edit flow in a remote node window.

### Preconditions
- Window context bound to non-embedded node.
- Bound Apollo client already points to remote node endpoint.

### Expected Outcome
- Server settings section is selectable.
- Settings list/search config loads and save actions call remote GraphQL.

### Primary Runtime Call Stack

```text
[ENTRY] pages/settings.vue:onMounted()
├── pages/settings.vue:normalizeSection(sectionParam) [STATE]
├── pages/settings.vue:activeSection.value = 'server-settings' (when query requests it) [STATE]
└── pages/settings.vue:<ServerSettingsManager v-if="activeSection==='server-settings'" />

[ENTRY] components/settings/ServerSettingsManager.vue:onMounted() [ASYNC]
├── stores/serverSettings.ts:fetchServerSettings() [ASYNC]
│   ├── utils/apolloClient.ts:getApolloClient()
│   └── plugins/30.apollo.client.ts:buildBoundApolloClient(graphqlHttpEndpoint) [IO]
├── stores/serverSettings.ts:fetchSearchConfig() [ASYNC]
└── components/settings/ServerSettingsManager.vue:applySearchConfigToForm() [STATE]

[ENTRY] components/settings/ServerSettingsManager.vue:saveQuickSetting(key) [ASYNC]
└── stores/serverSettings.ts:updateServerSetting(key, value) [ASYNC][IO]
```

### Branching / Fallback Paths

```text
[ERROR] components/settings/ServerSettingsManager.vue:onMounted()
└── components/settings/ServerSettingsManager.vue:showNotification('Failed to load quick setup configuration') [STATE]
```

### State And Data Transformations
- Route query -> normalized section value.
- Store server settings array -> `editedSettings` / `quickEditedSettings` maps.
- Form field values -> GraphQL mutation variables.

### Observability And Debug Points
- Existing error logs from `serverSettings` store fetch/update actions.

### Design Smells / Gaps
- None.

### Open Questions
- None.

## Use Case 2: Embedded window retains startup default route behavior

### Goal
Keep embedded startup fallback to server settings when embedded process is not running.

### Preconditions
- Embedded window context.

### Expected Outcome
- `activeSection` defaults to `server-settings` when `serverStore.status !== 'running'`.

### Primary Runtime Call Stack

```text
[ENTRY] pages/settings.vue:onMounted()
├── pages/settings.vue:isEmbeddedWindow(computed) [STATE]
└── pages/settings.vue:if (isEmbeddedWindow && serverStore.status !== 'running') activeSection='server-settings' [STATE]
```

### Branching / Fallback Paths

```text
[FALLBACK] if embedded server is already running
pages/settings.vue:onMounted()
└── activeSection remains requested section or default api-keys [STATE]
```

### State And Data Transformations
- Embedded status + server status -> initial active section.

### Observability And Debug Points
- Existing settings page tests validate this branch.

### Design Smells / Gaps
- None.

### Open Questions
- None.

## Use Case 3: Remote advanced panel hides embedded diagnostics controls

### Goal
Prevent remote windows from showing embedded-only monitor controls while preserving all settings editing flows.

### Preconditions
- Remote window context.

### Expected Outcome
- Advanced panel shows raw settings only; no `Server Status & Logs` selector.

### Primary Runtime Call Stack

```text
[ENTRY] components/settings/ServerSettingsManager.vue:setup()
├── components/settings/ServerSettingsManager.vue:canAccessEmbeddedDiagnostics = windowNodeContextStore.isEmbeddedWindow [STATE]
└── template render
    ├── show 'All Settings' button always
    └── show 'Server Status & Logs' button only when canAccessEmbeddedDiagnostics
```

### Branching / Fallback Paths

```text
[FALLBACK] embedded window
components/settings/ServerSettingsManager.vue:template
└── render both advanced subpanel options (raw-settings, server-status)
```

### State And Data Transformations
- Node context -> diagnostics panel visibility.

### Observability And Debug Points
- Component test assertions on button text and advanced panel state.

### Design Smells / Gaps
- None.

### Open Questions
- None.
