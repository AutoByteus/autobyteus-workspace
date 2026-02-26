# Proposed Design

## Scope Classification

- Classification: `Medium`
- Why upgraded from `Small`:
  - The change is UI-heavy with non-trivial state modeling and serialization rules in one component.
  - Separation-of-concerns quality is a key acceptance criterion (explicitly requested), requiring a design-first pass and call-stack validation against that design.

## Requirements Mapping

- Primary goals:
  - Replace Quick Setup free-form comma text editing with provider-scoped endpoint rows (host/port focused).
  - Keep backend contract unchanged (`updateServerSetting(key, value)` string payload).
  - Simplify Advanced top structure by removing redundant heading while preserving panel behavior.
- Non-goals:
  - No backend GraphQL schema mutation.
  - No change to `ServerMonitor` logic.

## Current-State Summary (As-Is)

- `components/settings/ServerSettingsManager.vue`
  - Quick Setup stores and edits provider settings as free-form strings.
  - Advanced section includes redundant heading (`Developer Tools`) and segmented control.
- `components/settings/__tests__/ServerSettingsManager.spec.ts`
  - Test expectations are tied to single text input quick fields.

## Target-State Summary (To-Be)

- Quick Setup uses provider cards with endpoint row editors:
  - URL providers (`LMSTUDIO_HOSTS`, `OLLAMA_HOSTS`, `AUTOBYTEUS_LLM_SERVER_HOSTS`): protocol + host + port (+ optional path in state model).
  - Host:port provider (`AUTOBYTEUS_VNC_SERVER_HOSTS`): host + port.
- Save flow serializes row model back into existing string format before calling store actions.
- Advanced section removes redundant heading and keeps:
  - helper line: `Raw environment settings and server diagnostics.`
  - segmented control: `All Settings` / `Server Status & Logs`.

## Change Inventory

| Change ID | Type | File/Module | Summary |
| --- | --- | --- | --- |
| C-001 | Modify | `components/settings/ServerSettingsManager.vue` | Introduce endpoint-row model/parser/serializer and replace quick free-form input UI. |
| C-002 | Modify | `components/settings/ServerSettingsManager.vue` | Simplify advanced top section by removing redundant heading while preserving segmented controls and panels. |
| C-003 | Modify | `components/settings/__tests__/ServerSettingsManager.spec.ts` | Update tests from free-form input expectations to row-based quick setup and advanced top text expectations. |
| C-004 | Remove | `components/settings/ServerSettingsManager.vue` | Remove legacy quick free-form input rendering path (no dual UI). |

## File/Module Design (Separation Of Concerns)

### 1) `components/settings/ServerSettingsManager.vue` (Modify)

- Responsibility:
  - Present settings UI.
  - Maintain local editing state.
  - Convert between persisted setting strings and quick-setup row model.
- Internal responsibilities split:
  - `parseQuickSettingValue(key, rawValue)` and helpers: deserialize persisted strings to row objects.
  - `serializeQuickRows(key)`: serialize row objects to persisted string.
  - row operations: add/remove/change row per provider.
  - save orchestration: per-card save and save-all save using existing store API.
- Inputs:
  - `store.settings`, `store.searchConfig`, embedded window context.
- Outputs:
  - calls to `store.updateServerSetting` and `store.setSearchConfig`.
- Dependencies:
  - `stores/serverSettings.ts`
  - `stores/windowNodeContextStore.ts`
  - `components/server/ServerMonitor.vue`

### 2) `components/settings/__tests__/ServerSettingsManager.spec.ts` (Modify)

- Responsibility:
  - Assert quick setup render/edit/save behavior and advanced panel switching.
- Delta:
  - Replace legacy selector assumptions for quick text field inputs.
  - Assert row-based quick UI presence and advanced heading removal.

## Data Model And Transform Rules

- Row model (`QuickEndpointRow`):
  - `{ id, protocol, host, port, path }`
- Per-provider format:
  - `url`: serialized as `protocol://host:port[/path]`
  - `hostPort`: serialized as `host:port`
- Tokenization:
  - Comma-separated persisted strings -> trimmed tokens -> parsed rows.
- Validation:
  - For non-empty rows: host required, numeric port required in `1..65535`.

## Dependency Flow

```text
ServerSettingsManager.vue
  -> store.fetchServerSettings/fetchSearchConfig (load)
  -> parse to quick row model (local state)
  -> user edits row model
  -> serialize back to string per key
  -> store.updateServerSetting(key, string)
```

- No new cycles introduced.
- No compatibility wrappers retained.

## Error Handling And UX Feedback

- Save failures continue to use notification toast (`showNotification`).
- Validation errors block quick save actions and show inline guidance.
- Search config validation remains unchanged.

## Decommission / Cleanup Intent

- Remove quick legacy free-form input rendering and related assumptions in tests in the same change set.
- Keep only one quick setup rendering path (row-based), no feature flag fallback.

## Risks And Mitigations

- Risk: serialization differences may alter stored values.
  - Mitigation: add test assertions for stable, expected serialized outputs.
- Risk: parser edge cases for malformed historical values.
  - Mitigation: conservative parser fallback preserving raw host token when strict parse fails.

## Verification Plan

- Targeted unit tests:
  - `pnpm test:nuxt components/settings/__tests__/ServerSettingsManager.spec.ts --run`
- Manual sanity:
  - Quick tab: add/remove/save endpoint rows per provider.
  - Advanced tab: helper line + segmented control layout and panel switching.
