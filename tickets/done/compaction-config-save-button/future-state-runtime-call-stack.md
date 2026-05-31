# Future-State Runtime Call Stacks: Compaction Config Save Button Styling

## Conventions

- Frame format: `path/to/file.vue:functionName(args?)`
- Boundary tags: `[ENTRY]`, `[STATE]`, `[ASYNC]`, `[IO]`, `[FALLBACK]`, `[ERROR]`
- This is the target (`to-be`) model, not a trace of current behavior.

## Design Basis

- Scope Classification: `Small`
- Call Stack Version: `v1`
- Requirements: `tickets/in-progress/compaction-config-save-button/requirements.md` (status `Design-ready`)
- Source Artifact: `tickets/in-progress/compaction-config-save-button/implementation.md` (Stage 3 solution sketch)
- Source Design Version: `v1`
- Referenced Sections:
  - Spine inventory: `DS-001`, `DS-002`, `DS-003` in implementation solution sketch.
  - Ownership: `CompactionConfigCard.vue` owns form draft/dirty/save-button presentation; `useServerSettingsStore` owns persistence.

## Future-State Modeling Rule

The target state removes the current permanently-active save-button presentation. It introduces no compatibility branch for the old always-blue button. The component derives the save affordance from normalized draft-vs-current values.

## Use Case Index

| use_case_id | Spine ID(s) | Spine Scope | Governing Owner | Source Type | Requirement ID(s) | Design-Risk Objective | Use Case Name | Coverage Target |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| UC-001 | DS-001 | Primary End-to-End | `CompactionConfigCard.vue` | Requirement | R-001, R-003 | N/A | Initial idle save affordance | Primary |
| UC-002 | DS-001 | Primary End-to-End | `CompactionConfigCard.vue` | Requirement | R-002, R-003 | N/A | Dirty ready save affordance | Primary |
| UC-003 | DS-002 | Primary End-to-End | `CompactionConfigCard.vue` + `useServerSettingsStore` | Requirement | R-004 | N/A | Save normalized compaction settings | Primary/Error |
| UC-004 | DS-003 | Bounded Local | `CompactionConfigCard.spec.ts` | Requirement | R-005 | N/A | Component regression validation | Primary |

## Transition Notes

- Temporary migration behavior needed: None.
- Retirement plan for temporary logic: N/A.
- Old behavior (always blue/enabled while not saving) is replaced directly by dirty-state-gated behavior.

## Use Case: UC-001 Initial idle save affordance

### Spine Context

- Spine ID(s): `DS-001`
- Spine Scope: Primary End-to-End
- Governing Owner: `CompactionConfigCard.vue`
- Why This Use Case Matters: It is the user-reported discrepancy. On initial render with no unsaved changes, the button should look idle like peer cards.

### Goal

Render the Compaction config save button as disabled and gray/white when local draft values equal normalized current settings.

### Preconditions

- Server settings store has current values for ratio, compactor agent id, active context override, and debug logs.
- Component is mounted and `syncFromStore` has populated local refs.

### Expected Outcome

- `isDirty` is `false`.
- `canSave` is `false`.
- Save button `disabled` is `true`.
- Save button class includes idle style: `border-slate-200 bg-white text-slate-400 hover:border-slate-200 hover:bg-white`.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-web/components/settings/CompactionConfigCard.vue:setup()
├── stores/serverSettings.ts:useServerSettingsStore()                  # authoritative settings store boundary
├── vue:watch(store.settings, syncFromStore, immediate=true) [STATE]
│   └── autobyteus-web/components/settings/CompactionConfigCard.vue:syncFromStore()
│       ├── normalizeStoredTriggerRatioToPercent(setting.value) [STATE]
│       ├── normalizeStoredAgentDefinitionId(setting.value) [STATE]
│       ├── normalizeStoredActiveContextOverride(setting.value) [STATE]
│       └── normalizeStoredDetailedLogs(setting.value) [STATE]
├── autobyteus-web/components/settings/CompactionConfigCard.vue:isDirty computed [STATE]
│   └── compare normalized draft values with normalized current store values
├── autobyteus-web/components/settings/CompactionConfigCard.vue:canSave computed [STATE]
│   └── return isDirty && !isSaving
└── template render
    └── button[data-testid="compaction-config-save"]
        ├── :disabled="!canSave || isSaving"
        └── :class="saveButtonBaseClass + saveButtonIdleClass"
```

### Branching / Fallback Paths

```text
[FALLBACK] missing/invalid stored trigger ratio
CompactionConfigCard.vue:currentTriggerRatioPercent()
└── return '80' # preserves existing default display/normalization behavior
```

### State And Data Transformations

- Store ratio decimal string (`0.75`) -> draft percent string (`75`).
- Store debug string (`true`, `1`, `yes`, `on`) -> draft boolean (`true`).
- Draft values and current values are normalized before comparison to avoid false dirty states.

### Observability And Debug Points

- Component test asserts disabled attribute and idle classes.

### Design Smells / Gaps

- Legacy/backward-compatibility branch present: `No`.
- Tight coupling or cycle introduced: `No`.
- Naming-to-responsibility drift detected: `No`.

### Coverage Status

- Primary Path: `Covered by planned AV-001`
- Fallback Path: `Covered indirectly by existing sync test/default logic; no new behavior`
- Error Path: `N/A`

## Use Case: UC-002 Dirty ready save affordance

### Spine Context

- Spine ID(s): `DS-001`
- Spine Scope: Primary End-to-End
- Governing Owner: `CompactionConfigCard.vue`
- Why This Use Case Matters: The save button should become prominent only when the user has actionable changes.

### Goal

Enable and visually activate the save button when any draft field differs from normalized current store values.

### Preconditions

- UC-001 initial state completed.
- User edits at least one draft input.

### Expected Outcome

- `isDirty` is `true`.
- `canSave` is `true` when not currently saving.
- Save button `disabled` is `false`.
- Save button class includes ready style: `border-blue-600 bg-blue-600 text-white shadow-md shadow-blue-600/25 ring-2 ring-blue-200 hover:border-blue-700 hover:bg-blue-700`.

### Primary Runtime Call Stack

```text
[ENTRY] Browser input event -> autobyteus-web/components/settings/CompactionConfigCard.vue:v-model update [STATE]
├── triggerRatioPercent / compactionAgentDefinitionId / activeContextTokensOverride / detailedLogsEnabled changes [STATE]
├── autobyteus-web/components/settings/CompactionConfigCard.vue:isDirty computed [STATE]
│   └── compare normalized draft values with normalized current store values
├── autobyteus-web/components/settings/CompactionConfigCard.vue:canSave computed [STATE]
│   └── return true when isDirty && !isSaving
└── template render
    └── button[data-testid="compaction-config-save"]
        ├── :disabled="false"
        └── :class="saveButtonBaseClass + saveButtonReadyClass"
```

### Branching / Fallback Paths

```text
[FALLBACK] user enters invalid ratio or blank ratio
CompactionConfigCard.vue:normalizedDraftTriggerRatio()
└── compare/save using existing fallback behavior ('0.8' on save) without changing scope semantics
```

### State And Data Transformations

- Draft strings are trimmed for comparison where applicable.
- Ratio uses the same decimal conversion semantics as save so dirty-state truth matches persisted payload intent.

### Observability And Debug Points

- Component test mutates an input and asserts enabled attribute plus ready classes.

### Design Smells / Gaps

- Legacy/backward-compatibility branch present: `No`.
- Tight coupling or cycle introduced: `No`.
- Naming-to-responsibility drift detected: `No`.

### Coverage Status

- Primary Path: `Covered by planned AV-002`
- Fallback Path: `N/A for visual style; save normalization covered by AV-003`
- Error Path: `N/A`

## Use Case: UC-003 Save normalized compaction settings

### Spine Context

- Spine ID(s): `DS-002`
- Spine Scope: Primary End-to-End
- Governing Owner: `CompactionConfigCard.vue` for orchestration; `useServerSettingsStore` for persistence.
- Why This Use Case Matters: Styling changes must not alter the existing persistence contract.

### Goal

When the dirty/ready button is clicked, write the same four settings with the same normalized values as before.

### Preconditions

- Draft state differs from current normalized settings.
- `canSave` is `true` and `isSaving` is `false`.

### Expected Outcome

- `save()` sets `isSaving=true`, writes all four settings through `store.updateServerSetting`, then sets `isSaving=false`.
- Save is ignored if `!canSave` or already saving.

### Primary Runtime Call Stack

```text
[ENTRY] button[data-testid="compaction-config-save"] click
└── autobyteus-web/components/settings/CompactionConfigCard.vue:save()
    ├── if !canSave || isSaving: return [FALLBACK]
    ├── isSaving.value = true [STATE]
    ├── normalize ratio percent -> decimal string [STATE]
    ├── trim compactor agent definition id [STATE]
    ├── trim active context override [STATE]
    ├── map detailed logs boolean -> 'true'/'false' [STATE]
    ├── stores/serverSettings.ts:updateServerSetting(COMPACTION_TRIGGER_RATIO_KEY, normalizedRatio) [ASYNC][IO]
    ├── stores/serverSettings.ts:updateServerSetting(COMPACTION_AGENT_DEFINITION_ID_KEY, normalizedAgentDefinitionId) [ASYNC][IO]
    ├── stores/serverSettings.ts:updateServerSetting(ACTIVE_CONTEXT_TOKENS_OVERRIDE_KEY, normalizedActiveContextOverride) [ASYNC][IO]
    ├── stores/serverSettings.ts:updateServerSetting(COMPACTION_DEBUG_LOGS_KEY, detailedLogsEnabled ? 'true' : 'false') [ASYNC][IO]
    └── finally isSaving.value = false [STATE]
```

### Branching / Fallback Paths

```text
[FALLBACK] no dirty changes or duplicate click while saving
CompactionConfigCard.vue:save()
└── return before any updateServerSetting call
```

```text
[ERROR] updateServerSetting rejects
CompactionConfigCard.vue:save()
└── finally isSaving.value = false # current error propagation behavior preserved
```

### State And Data Transformations

- Percent input -> decimal setting string.
- Checkbox boolean -> string setting.
- Text/select values -> trimmed strings.

### Observability And Debug Points

- Existing component test verifies four `updateServerSetting` calls and values.

### Design Smells / Gaps

- Legacy/backward-compatibility branch present: `No`.
- Tight coupling or cycle introduced: `No`.
- Naming-to-responsibility drift detected: `No`.

### Coverage Status

- Primary Path: `Covered by planned AV-003`
- Fallback Path: `Covered by planned idle disabled/no save assertion if added; click on disabled button not necessary`
- Error Path: `Existing behavior preserved; no new error handling scope`

## Use Case: UC-004 Component regression validation

### Spine Context

- Spine ID(s): `DS-003`
- Spine Scope: Bounded Local
- Governing Owner: `CompactionConfigCard.spec.ts`
- Why This Use Case Matters: Prevents reintroducing a permanently active save button.

### Goal

Validate the component contract in executable tests.

### Preconditions

- Component mounted with Pinia test store fixtures.

### Expected Outcome

- Initial render test proves idle/disabled state.
- Dirty-state test proves enabled/ready classes.
- Save payload test continues to pass.

### Primary Runtime Call Stack

```text
[ENTRY] vitest -> autobyteus-web/components/settings/__tests__/CompactionConfigCard.spec.ts:mountComponent()
├── @pinia/testing:createTestingPinia(initialState) [STATE]
├── @vue/test-utils:mount(CompactionConfigCard) [STATE]
├── flushPromises() [ASYNC]
├── wrapper.get('[data-testid="compaction-config-save"]')
├── assertions for idle/disabled state
├── wrapper.get('[data-testid="compaction-ratio-input"]').setValue('60') [STATE]
├── assertions for ready/enabled state
└── click/save payload assertions for unchanged persistence semantics
```

### Branching / Fallback Paths

N/A.

### State And Data Transformations

- Test fixture values mirror server settings store shape.
- DOM attributes/classes reflect computed component state.

### Observability And Debug Points

- Targeted command output from Nuxt/Vitest.

### Design Smells / Gaps

- Legacy/backward-compatibility branch present: `No`.
- Tight coupling or cycle introduced: `No`.
- Naming-to-responsibility drift detected: `No`.

### Coverage Status

- Primary Path: `Covered by planned AV-004`
- Fallback Path: `N/A`
- Error Path: `N/A`
