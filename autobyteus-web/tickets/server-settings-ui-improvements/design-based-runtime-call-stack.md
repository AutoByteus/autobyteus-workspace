# Design-Based Runtime Call Stacks (Debug-Trace Style)

## Conventions

- Frame format: `path/to/file.ts:functionName(args?)`
- Boundary tags: `[ENTRY]`, `[ASYNC]`, `[STATE]`, `[FALLBACK]`, `[ERROR]`

## Design Basis

- Scope Classification: `Medium`
- Source Artifact:
  - `tickets/server-settings-ui-improvements/proposed-design.md`
- Referenced Sections:
  - `File/Module Design (Separation Of Concerns)`
  - `Data Model And Transform Rules`
  - `Decommission / Cleanup Intent`

## Use Case Index

- Use Case 1: Quick Setup renders provider-scoped endpoint rows from persisted settings.
- Use Case 2: Quick Setup row edits serialize into existing server setting keys and save.
- Use Case 3: Advanced mode renders simplified top section and switches inner panel.

## Use Case 1: Quick Setup Row Rendering From Persisted Settings

### Goal

Deserialize persisted string settings into provider-specific endpoint rows.

### Preconditions

- Settings page mounted.
- `store.fetchServerSettings()` completed.

### Expected Outcome

- Each quick provider card shows row editors.
- Empty values yield one default row.

### Primary Runtime Call Stack

```text
[ENTRY] components/settings/ServerSettingsManager.vue:onMounted()
└── stores/serverSettings.ts:fetchServerSettings() [ASYNC][IO]

[ENTRY] components/settings/ServerSettingsManager.vue:watch(() => store.settings)
├── components/settings/ServerSettingsManager.vue:syncQuickRowsFromValue(field.key, currentValue) [STATE]
│   └── components/settings/ServerSettingsManager.vue:parseQuickSettingValue(key, rawValue) [STATE]
│       ├── components/settings/ServerSettingsManager.vue:splitEndpointTokens(rawValue)
│       ├── components/settings/ServerSettingsManager.vue:parseUrlTokenToRow(...) [FALLBACK: url parse fail]
│       └── components/settings/ServerSettingsManager.vue:parseHostPortTokenToRow(...) [FALLBACK: host:port parse fail]
└── components/settings/ServerSettingsManager.vue:quickEndpointRows[key] = rows [STATE]
```

### Branching / Fallback Paths

```text
[FALLBACK] raw value missing/empty
parseQuickSettingValue(...)
└── createQuickEndpointRow(field)
```

```text
[ERROR] malformed token
parse*TokenToRow(...)
└── fallback to row.host = raw token (preserve editability)
```

### State And Data Transformations

- `"https://host:51739,https://host:51740"` -> two row objects.
- `"localhost:6088,localhost:6089"` -> two hostPort rows.

## Use Case 2: Quick Setup Save Serialization

### Goal

Serialize edited row model into persisted strings and save via existing store API.

### Preconditions

- User changes one or more row values.

### Expected Outcome

- `quickEditedSettings[key]` reflects serialized output.
- Save actions call `updateServerSetting(key, value)` with serialized strings.

### Primary Runtime Call Stack

```text
[ENTRY] components/settings/ServerSettingsManager.vue:onQuickEndpointRowChange(key) [STATE]
└── components/settings/ServerSettingsManager.vue:serializeQuickRows(key) [STATE]
    ├── components/settings/ServerSettingsManager.vue:quickRowHasAnyValue(...)
    ├── components/settings/ServerSettingsManager.vue:normalizePath(...)
    └── components/settings/ServerSettingsManager.vue:quickEditedSettings[key] = serialized [STATE]

[ENTRY] components/settings/ServerSettingsManager.vue:saveQuickSetting(key) [ASYNC]
├── components/settings/ServerSettingsManager.vue:hasQuickSettingValidationErrors(key)
└── stores/serverSettings.ts:updateServerSetting(key, quickEditedSettings[key]) [ASYNC][IO]

[ENTRY] components/settings/ServerSettingsManager.vue:saveAllQuickSettings() [ASYNC]
└── loop changed keys -> stores/serverSettings.ts:updateServerSetting(...) [ASYNC][IO]
```

### Branching / Fallback Paths

```text
[FALLBACK] invalid rows present
hasQuickSettingValidationErrors(key)
└── disable save and show inline hint
```

```text
[ERROR] mutation failure
stores/serverSettings.ts:updateServerSetting(...)
└── components/settings/ServerSettingsManager.vue:showNotification(error, 'error')
```

### State And Data Transformations

- Row model -> comma-separated persisted string per provider key.

## Use Case 3: Advanced Top Section Simplification

### Goal

Remove redundant heading while preserving advanced panel switching behavior.

### Preconditions

- User selects `Advanced / Developer` tab.

### Expected Outcome

- Helper line appears without `Developer Tools` heading.
- Segmented control still switches raw settings and server monitor panel.

### Primary Runtime Call Stack

```text
[ENTRY] components/settings/ServerSettingsManager.vue:<button @click="activeTab='advanced'"> [STATE]

[ENTRY] components/settings/ServerSettingsManager.vue:<template advanced>
├── render helper line
├── render segmented control
└── branch on advancedPanel [STATE]
    ├── raw-settings -> render table path
    └── server-status -> render components/server/ServerMonitor.vue
```

### Branching / Fallback Paths

```text
[FALLBACK] remote context hides diagnostics
canAccessEmbeddedDiagnostics === false
└── Server Status & Logs button not rendered
```

### Design Smells / Gaps

- No cross-component responsibility leak detected; concerns remain localized to UI composition and transformation helpers.
