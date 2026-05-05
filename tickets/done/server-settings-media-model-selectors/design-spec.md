# Design Spec

## Current-State Read

`ServerSettingsManager.vue` is the current product-facing settings entrypoint for the Server Settings section. Its `quick` tab already uses typed cards for common settings (`ApplicationsFeatureToggleCard`, `CodexFullAccessCard`, `CompactionConfigCard`) and hard-coded quick endpoint fields. Its `advanced` tab renders every `useServerSettingsStore().settings` item in a raw key/value table.

The three requested media defaults are currently only visible when they exist in the raw settings table:

- `DEFAULT_IMAGE_EDIT_MODEL`
- `DEFAULT_IMAGE_GENERATION_MODEL`
- `DEFAULT_SPEECH_GENERATION_MODEL`

Because `ServerSettingsService` does not register those keys, they are treated as custom settings with `Custom user-defined setting` metadata and can be deleted. The multimedia tools already consume these keys directly from `process.env`, with built-in fallbacks:

- image generation: `gpt-image-1.5`
- image editing: `gpt-image-1.5`
- speech generation: `gemini-2.5-flash-tts`

The existing settings persistence path is healthy and should be reused:

`Card/UI -> useServerSettingsStore.updateServerSetting -> GraphQL updateServerSetting -> ServerSettingsResolver -> ServerSettingsService.updateSetting -> appConfigProvider.config.set -> configData + process.env + .env file`

The model catalog path is also already present and should be reused:

`useLLMProviderConfigStore.fetchProvidersWithModels('autobyteus') -> availableAudioProvidersWithModels / availableImageProvidersWithModels GraphQL fields -> ModelCatalogService -> AudioModelService / ImageModelService -> AudioClientFactory / ImageClientFactory`

The Codex full-access card currently owns the right domain mapping but the wrong visual control: it renders a native checkbox, while the Applications card renders the polished accessible switch style the user wants.

## Intended Change

Add a typed `Default media models` card to Server Settings Basics. It exposes provider-grouped searchable dropdowns for the three default media model settings and saves through the existing server settings store. Register the three media setting keys as known predefined backend settings so Advanced no longer presents them as opaque custom rows.

Replace the Codex full-access checkbox with an accessible switch/toggle UI that matches the Applications switch presentation while preserving the existing Codex save semantics.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Feature + UI behavior change.
- Current design issue found (`Yes`/`No`/`Unclear`): Yes, narrowly: the switch UI primitive is embedded in one card while another settings card needs the same control style. No design issue was found in settings persistence or model catalog ownership.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): File Placement Or Responsibility Drift for the reusable switch visual; No Design Issue Found for server settings persistence and model catalog boundaries.
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes, but only a narrow local UI extraction is recommended if implementation touches both switch consumers. No backend/model architecture refactor is needed.
- Evidence: `ApplicationsFeatureToggleCard.vue` owns the desired switch markup; `CodexFullAccessCard.vue` owns a native checkbox for a similar settings toggle. Existing stores/services already provide the required settings and model catalog boundaries.
- Design response: Add a typed media defaults card; register backend metadata; optionally extract `SettingsToggleSwitch.vue` and migrate Applications/Codex switch markup to it. If implementation keeps Applications unchanged, Codex must still visually and semantically match the Applications switch.
- Refactor rationale: A tiny switch primitive prevents the Applications card from being the hidden owner of a reusable UI pattern and avoids copying the same `role="switch"`/track/thumb markup into Codex.
- Intentional deferrals and residual risk, if any: Do not add image edit/generation capability filtering until `ImageModel` exposes explicit capability metadata. Do not change active media tool client caching; saved defaults are for future tool use/new sessions under current lifecycle behavior.

## Terminology

- `Subsystem` / `capability area`: a larger functional area that owns a broader category of work and may contain multiple files plus optional module groupings.
- `Module`: an optional intermediate grouping inside a subsystem when the codebase benefits from it. Do not use `module` as a synonym for one file or as the default ownership term.
- `Folder` / `directory`: a physical grouping used to organize files and any optional module groupings.
- `File`: one concrete source file and the primary unit where one concrete concern should land.

## Design Reading Order

1. data-flow spine
2. subsystem / capability-area allocation
3. draft file responsibilities -> extract reusable owned structures -> finalize file responsibilities
4. folder/path mapping

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove the native checkbox presentation from `CodexFullAccessCard.vue`; stop treating known media model default keys as custom/deletable settings by registering predefined metadata.
- Treat removal as first-class design work: the Advanced raw table stays because it remains the canonical power-user surface, but the custom classification for these known keys is no longer correct.
- Decision rule: the target behavior must not add alternate/duplicate media default keys. The existing env var keys remain canonical.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | User opens Server Settings Basics | Media defaults card shows current/default model selections | `MediaDefaultModelsCard` | Establishes the read/display path and model-option source. |
| DS-002 | Primary End-to-End | User selects and saves a default media model | Env-backed setting is persisted and reflected after reload | `useServerSettingsStore` + `ServerSettingsService` | This is the core persistence path for the requested dropdowns. |
| DS-003 | Primary End-to-End | User toggles Codex full access and saves | `CODEX_APP_SERVER_SANDBOX` is persisted as existing canonical value | `CodexFullAccessCard` | Preserves existing behavior while replacing visual control. |
| DS-004 | Return-Event | Settings/model catalog reload completes | Cards resync cleanly without overwriting dirty local edits | Individual typed cards | Prevents stale server refreshes from clobbering unsaved user selections. |
| DS-005 | Bounded Local | Card computes dropdown options | Current unknown model is preserved as a stale/current option | `MediaDefaultModelsCard` | Required for dynamic remote model identifiers that may not be in the current catalog. |

## Primary Execution Spine(s)

- DS-001: `Settings page -> ServerSettingsManager quick tab -> MediaDefaultModelsCard -> LLMProviderConfigStore -> GraphQL model catalog -> grouped dropdown UI`
- DS-002: `Dropdown selection -> MediaDefaultModelsCard save -> ServerSettingsStore -> GraphQL ServerSettingsResolver -> ServerSettingsService -> AppConfig/process.env/.env`
- DS-003: `Codex switch click -> CodexFullAccessCard dirty state -> save -> ServerSettingsStore -> ServerSettingsService -> AppConfig/process.env/.env`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | Server Settings renders the Basic tab. The new media defaults card reads current server settings, resolves absent values to tool fallback defaults, loads image/audio model catalogs, and builds provider-grouped dropdown options. | Settings page, ServerSettingsManager, MediaDefaultModelsCard, LLMProviderConfigStore, model catalog, dropdown | `MediaDefaultModelsCard` for field mapping; `LLMProviderConfigStore` for catalog state | Localization, stale current option injection, loading/error state |
| DS-002 | When the user changes one or more media selectors and saves, the card persists each changed canonical key through the existing settings store. Backend service writes env-backed config and the store reloads settings. | Selector, MediaDefaultModelsCard, ServerSettingsStore, ServerSettingsResolver, ServerSettingsService, AppConfig | `ServerSettingsStore` for frontend persistence; `ServerSettingsService` for backend setting metadata/update | Dirty-state preservation, notifications, save error handling |
| DS-003 | Codex card presents the same full-access setting as a switch. Clicking changes local dirty state; saving writes the same sandbox mode values as before. | CodexFullAccessCard, SettingsToggleSwitch, ServerSettingsStore, ServerSettingsService | `CodexFullAccessCard` owns Codex-specific mapping | Switch visual primitive, warning copy, future-session note |
| DS-004 | Store reloads and model catalog reloads arrive asynchronously. Cards update original/current values only when local edits are not dirty. | Store reload, card watch, local draft/original state | Individual typed cards | Bound-node cache invalidation from existing store, stale option handling |
| DS-005 | Dropdown option construction starts from provider groups and appends/prepends a current custom/stale group if the current selected identifier is absent. | Provider groups, current setting value, grouped options | `MediaDefaultModelsCard` | Labeling helpers, duplicate avoidance |

## Spine Actors / Main-Line Nodes

- Settings page: selects Server Settings and quick/advanced mode.
- `ServerSettingsManager`: lays out quick cards and advanced raw table.
- `MediaDefaultModelsCard`: owns media default setting presentation, fallback defaults, option grouping, dirty state, and save orchestration for the three media keys.
- `useLLMProviderConfigStore`: owns frontend provider/model catalog state.
- `useServerSettingsStore`: owns frontend server settings persistence and reload.
- `ServerSettingsResolver`: GraphQL transport boundary for settings operations.
- `ServerSettingsService`: backend owner for known setting metadata, edit/delete policy, and update validation.
- `AppConfig`: runtime/environment/file persistence owner.
- `CodexFullAccessCard`: owns Codex-specific full-access boolean-to-sandbox-value mapping.
- Optional `SettingsToggleSwitch`: reusable visual/ARIA switch primitive.

## Ownership Map

- `ServerSettingsManager` owns placement, not the semantics of media defaults or Codex sandbox mapping.
- `MediaDefaultModelsCard` owns the three user-facing media default selectors and maps each selector to exactly one canonical env key.
- `mediaDefaultModelSettings.ts` owns static field definitions: setting key, fallback model identifier, catalog kind, and localization key references.
- `useLLMProviderConfigStore` owns loading/caching model catalog rows; the card must not query GraphQL directly unless the store API is insufficient.
- `useServerSettingsStore` owns frontend setting updates/reloads; the card must not call GraphQL settings mutations directly.
- `ServerSettingsService` owns backend metadata and validation for server settings; GraphQL must not duplicate metadata policy.
- `CodexFullAccessCard` owns Codex-specific value conversion and messaging.
- `SettingsToggleSwitch` owns only the switch button/thumb markup, ARIA surface, and toggle event. It must not own setting persistence, status labels, or domain-specific colors beyond classes passed by the caller.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `ServerSettingsResolver.updateServerSetting` | `ServerSettingsService` | GraphQL transport boundary | Validation policy beyond delegating to service |
| `useServerSettingsStore.updateServerSetting` | Server settings GraphQL + store state | Frontend action boundary and reload/cache handling | Media-specific field mapping |
| `SearchableGroupedSelect` | Calling card/composable | Generic grouped dropdown UI | Model catalog loading or persistence |
| `SettingsToggleSwitch` | Calling card | Shared switch markup/ARIA | Applications/Codex domain state or save semantics |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Native checkbox markup in `CodexFullAccessCard.vue` | User explicitly requested toggle UI and Applications already establishes switch pattern | `SettingsToggleSwitch` or equivalent `button role="switch"` markup in `CodexFullAccessCard` | In This Change | Tests must no longer assert `input[type="checkbox"]`. |
| Custom/deletable metadata classification for the three media keys | They are known product settings, not arbitrary custom settings | `ServerSettingsService.registerPredefinedSetting(...)` entries | In This Change | Advanced table remains; only metadata changes. |
| Duplicate switch button/thumb markup, if extraction is used | Avoid hidden UI primitive ownership in Applications card | `components/settings/SettingsToggleSwitch.vue` | In This Change | If not extracted, implementation must justify local duplication in handoff. |

## Return Or Event Spine(s) (If Applicable)

- DS-004: `ServerSettingsStore reload -> settings array changes -> MediaDefaultModelsCard watch -> sync original/draft only when not dirty -> selector display updates`
- DS-004 Codex: `ServerSettingsStore reload -> settings array changes -> CodexFullAccessCard syncFromStore -> update original/current only when not dirty`
- Model catalog reload: `LLMProviderConfigStore fetch/reload -> audio/image provider groups update -> MediaDefaultModelsCard groupedOptions recompute -> dropdown options refresh without clearing current stale value`

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `MediaDefaultModelsCard`
  - `store.settings/model groups -> effective current values -> local draft/original maps -> grouped options with stale current option -> save changed fields -> sync originals`
  - Matters because both settings and model catalogs are asynchronous and dynamic.
- Parent owner: `CodexFullAccessCard`
  - `store setting -> boolean fullAccessEnabled/originalFullAccessEnabled -> switch click -> dirty state -> save -> original sync`
  - Matters because the visual change must not alter existing delayed-save behavior.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Localization messages | DS-001, DS-002, DS-003 | Settings cards | User-facing labels/descriptions/status strings | Existing cards use localization | Hard-coded copy drift and poor zh-CN support |
| Model label formatting | DS-001, DS-005 | Media card | Use existing model selection labels | Keeps custom OpenAI-compatible labels readable | Inconsistent labels vs other model selectors |
| Stale current model option | DS-001, DS-005 | Media card | Preserve current value if missing from catalog | Dynamic remote models can disappear | Silent clearing/overwriting of user config |
| Backend setting metadata | DS-002 | ServerSettingsService | Descriptions and edit/delete policy | Advanced table reflects known settings correctly | Opaque custom rows and accidental deletion |
| Switch visual primitive | DS-003 | Codex and Applications cards | Accessible `role="switch"` markup | Shared UI pattern | Checkbox recurrence or duplicated markup drift |
| Notifications/status | DS-002, DS-003 | Cards | Save success/error/dirty/loading feedback | Users need action feedback | Persistence flow becomes opaque |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Env-backed settings persistence | `useServerSettingsStore`, `ServerSettingsResolver`, `ServerSettingsService`, `AppConfig` | Reuse | Exactly matches target persistence path | N/A |
| Image/audio model options | `useLLMProviderConfigStore`, `ModelCatalogService` | Reuse | Existing APIs already return grouped audio/image model catalogs | N/A |
| Searchable provider-grouped dropdown | `SearchableGroupedSelect` | Reuse | Existing UI fits model selection | N/A |
| Settings toggle UI | Applications switch markup | Create small reusable UI primitive or mirror exactly | Current owner is a card, not a shared component | New `SettingsToggleSwitch` is justified if both Applications and Codex consume it |
| Known setting metadata | `ServerSettingsService` | Extend | Service already owns predefined settings and edit/delete policy | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Frontend Settings UI | Basic card layout, media defaults card, Codex card toggle | DS-001, DS-002, DS-003 | ServerSettingsManager, MediaDefaultModelsCard, CodexFullAccessCard | Extend | Add one card and a possible switch primitive. |
| Frontend Server Settings Store | Bound-node aware setting fetch/update/reload | DS-002, DS-003, DS-004 | useServerSettingsStore | Reuse | No media-specific store mutation needed. |
| Frontend Model Catalog Store | Provider/model groups | DS-001, DS-005 | useLLMProviderConfigStore | Reuse | Fetch with runtime kind `autobyteus`. |
| Backend Server Settings | Metadata and update validation | DS-002 | ServerSettingsService | Extend | Add predefined media default keys. |
| Backend Model Catalog | Image/audio model lists | DS-001 | ModelCatalogService | Reuse | No new API. |
| Localization | User-facing strings | DS-001, DS-002, DS-003 | settings messages | Extend | Add EN and zh-CN settings messages. |
| Documentation | Settings user docs | All | docs/settings.md | Extend | Document new media defaults card and Codex toggle style. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `components/settings/MediaDefaultModelsCard.vue` | Frontend Settings UI | Media defaults card | Render/load/save three media model default selectors | One cohesive card over three related env-backed media defaults | Yes, field specs and existing stores/dropdown |
| `components/settings/mediaDefaultModelSettings.ts` | Frontend Settings UI | Media default field definitions | Canonical key/fallback/catalog-kind metadata for card and tests | Avoid duplicate key/default literals across card/tests | N/A |
| `components/settings/SettingsToggleSwitch.vue` | Frontend Settings UI | Settings switch primitive | Shared `button role="switch"` markup and thumb movement | Prevent Applications card from being implicit switch owner | N/A |
| `components/settings/CodexFullAccessCard.vue` | Frontend Settings UI | Codex full-access card | Use switch primitive; keep save/value conversion | Existing owner for Codex behavior | Yes, switch primitive |
| `components/settings/ApplicationsFeatureToggleCard.vue` | Frontend Settings UI | Applications card | Optionally use switch primitive; keep capability logic | Existing owner for Applications behavior | Yes, switch primitive |
| `components/settings/ServerSettingsManager.vue` | Frontend Settings UI | Server settings layout | Include media defaults card in Basic grid | Existing layout owner | Yes, media card |
| `services/server-settings-service.ts` | Backend Settings | ServerSettingsService | Register media default predefined metadata | Existing metadata owner | No static allowed-values validation |
| Test files | Validation | Test owners | Cover new UI, metadata, and switch behavior | Existing test locations mirror owners | Yes |
| Localization and docs files | UX/docs | Localized copy/docs | New labels/help/status docs | Existing copy/doc owners | N/A |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Media setting key/default/catalog-kind triples | `components/settings/mediaDefaultModelSettings.ts` | Frontend Settings UI | Card, tests, and future docs can use one source of truth | Yes | Yes | A generic arbitrary settings registry |
| Switch button/thumb markup | `components/settings/SettingsToggleSwitch.vue` | Frontend Settings UI | Applications and Codex use same switch UI | Yes | Yes | A domain-aware settings persistence component |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `MediaDefaultModelSettingSpec` | Yes | Yes | Low | Include only `id`, `key`, `catalogKind`, `fallbackModelIdentifier`, and localization keys. |
| `SettingsToggleSwitch` props | Yes | Yes | Medium | Keep props visual/ARIA only: `checked`, `disabled`, `ariaLabel`, `dataTestId`, optional `trackClass`; no persistence props. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/settings/MediaDefaultModelsCard.vue` | Frontend Settings UI | Media defaults card | Render card, load catalog, sync setting values, preserve unknown current values, save changed defaults | One typed card owns one user-facing media defaults feature | `mediaDefaultModelSettings`, stores, dropdown |
| `autobyteus-web/components/settings/mediaDefaultModelSettings.ts` | Frontend Settings UI | Media defaults metadata | Static specs and fallback constants for the three keys | Centralizes repeated key/default/catalog metadata | N/A |
| `autobyteus-web/components/settings/SettingsToggleSwitch.vue` | Frontend Settings UI | Switch primitive | Shared accessible settings switch UI | Prevents duplicate switch markup drift | N/A |
| `autobyteus-web/components/settings/CodexFullAccessCard.vue` | Frontend Settings UI | Codex full access | Switch presentation, dirty/save state, sandbox value mapping | Existing card remains domain owner | `SettingsToggleSwitch` |
| `autobyteus-web/components/settings/ApplicationsFeatureToggleCard.vue` | Frontend Settings UI | Applications capability card | Optionally consume switch primitive without changing capability behavior | Keeps Applications logic in place while sharing switch markup | `SettingsToggleSwitch` |
| `autobyteus-web/components/settings/ServerSettingsManager.vue` | Frontend Settings UI | Settings layout | Place media defaults card in Basic grid and stub/import tests | Existing layout owner | `MediaDefaultModelsCard` |
| `autobyteus-server-ts/src/services/server-settings-service.ts` | Backend Settings | ServerSettingsService | Register media model defaults as predefined editable non-deletable settings | Existing metadata owner | N/A |
| `autobyteus-web/localization/messages/en/settings.ts` | Localization | EN settings messages | Card labels/status/copy | Existing settings manual catalog | N/A |
| `autobyteus-web/localization/messages/zh-CN/settings.ts` | Localization | zh-CN settings messages | Card labels/status/copy | Existing settings manual catalog | N/A |
| `autobyteus-web/docs/settings.md` | Docs | Settings docs | Document media defaults card and Codex switch UI | Existing settings docs owner | N/A |
| `autobyteus-web/components/settings/__tests__/MediaDefaultModelsCard.spec.ts` | Tests | Card tests | Validate defaults/catalog/stale/save behavior | Mirrors new component | Yes |
| `autobyteus-web/components/settings/__tests__/ServerSettingsManager.spec.ts` | Tests | Layout tests | Assert media card is present/stubbed | Existing manager coverage | N/A |
| `autobyteus-web/components/settings/__tests__/CodexFullAccessCard.spec.ts` | Tests | Codex card tests | Update from checkbox to switch assertions | Existing card coverage | `SettingsToggleSwitch` if mounted |
| `autobyteus-web/components/settings/__tests__/ApplicationsFeatureToggleCard.spec.ts` | Tests | Applications card tests | Ensure switch behavior is not regressed if refactored | Existing card coverage | `SettingsToggleSwitch` if mounted |
| `autobyteus-server-ts/tests/unit/services/server-settings-service.test.ts` | Tests | Backend settings service tests | Validate media keys are predefined/non-deletable/editable | Existing service coverage | N/A |

## Ownership Boundaries

The new basic media card is a typed editor over existing canonical env keys. It must not create a second media defaults domain model in the backend. The backend remains the server-setting metadata/persistence owner; the frontend card owns only friendly presentation and selector-to-key mapping.

The model catalog remains owned by `useLLMProviderConfigStore`/`ModelCatalogService`; the media card must consume the store and should not directly own GraphQL query text or factory initialization.

The Codex full-access card remains the owner of Codex-specific sandbox conversion. A reusable switch primitive, if added, owns only the control markup and accessibility semantics.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `useServerSettingsStore.updateServerSetting` | GraphQL mutation and reload | MediaDefaultModelsCard, CodexFullAccessCard | Cards importing GraphQL mutation directly | Add store helper only if needed |
| `ServerSettingsService` | Metadata, editability, validation, config writes | GraphQL resolver | Resolver duplicating predefined setting metadata | Add/extend service API |
| `useLLMProviderConfigStore.fetchProvidersWithModels` | Model GraphQL query/cache | MediaDefaultModelsCard | Card querying `availableImageProvidersWithModels` directly | Add store getter/helper for media groups |
| `SettingsToggleSwitch` | Button/thumb/ARIA | Applications and Codex cards | Switch primitive knowing setting keys or persistence | Keep domain props/events in cards |

## Dependency Rules

- `MediaDefaultModelsCard` may depend on `useServerSettingsStore`, `useLLMProviderConfigStore`, `SearchableGroupedSelect`, localization, and model label helpers.
- `MediaDefaultModelsCard` must not depend on backend GraphQL documents directly.
- `ServerSettingsManager` may import the media card but must not duplicate its media key/default logic.
- `ServerSettingsService` may register the media keys but must not import frontend media metadata.
- `CodexFullAccessCard` may depend on `SettingsToggleSwitch` but must keep Codex sandbox values local or in the existing Codex sandbox constants if already accessible.
- `SettingsToggleSwitch` must not depend on stores, GraphQL, localization, or setting keys.
- Do not create alternate env var names, compatibility aliases, or dual-save behavior for media defaults.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `useServerSettingsStore.updateServerSetting(key, value)` | One server setting key/value | Persist env-backed setting and reload | Exact setting key string and value string | Reuse for media defaults and Codex. |
| `ServerSettingsService.registerPredefinedSetting(key, description, ...)` | Known server setting metadata | Declare edit/delete policy and optional validation | Exact key string | Add media keys with no static allowed values. |
| `useLLMProviderConfigStore.fetchProvidersWithModels(runtimeKind)` | Runtime-scoped model catalogs | Fetch LLM/audio/image grouped models | Runtime kind string; use `autobyteus` for media catalogs | Existing query fetches all model kinds. |
| `SearchableGroupedSelect` | Dropdown UI | Select one model identifier from grouped options | `modelValue` string and `GroupedOption[]` | Options use model identifiers as ids. |
| `SettingsToggleSwitch` | Switch UI primitive | Toggle visual control | `checked: boolean`, `disabled?: boolean`, ARIA/test ids, event | No setting-specific semantics. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `updateServerSetting` | Yes | Yes: key/value | Low | Use exact env keys. |
| `fetchProvidersWithModels` | Yes | Yes: runtime kind | Low | Use `autobyteus`; do not add media-specific API. |
| `SearchableGroupedSelect` | Yes | Yes: option ids | Low | Use modelIdentifier as id. |
| `SettingsToggleSwitch` | Yes | Yes: boolean checked | Low | Keep domain mapping outside. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Media defaults card | `MediaDefaultModelsCard` | Yes | Low | Use title `Default media models`. |
| Media setting specs | `mediaDefaultModelSettings.ts` | Yes | Low | Keep scoped to media defaults only. |
| Switch primitive | `SettingsToggleSwitch` | Yes | Medium | Ensure it remains UI-only, not a settings store wrapper. |
| Codex card | `CodexFullAccessCard` | Yes | Low | Existing name remains accurate. |

## Applied Patterns (If Any)

- Typed settings card pattern: follows existing `CodexFullAccessCard` and `CompactionConfigCard` pattern for common env-backed settings.
- Small UI primitive: optional `SettingsToggleSwitch` extraction for shared switch markup.
- Dirty-state preservation: same local draft/original pattern already used in `CodexFullAccessCard` and quick endpoint fields.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/settings/MediaDefaultModelsCard.vue` | File | Frontend settings UI | Media default dropdown card | Existing settings card folder | Backend validation, direct GraphQL documents |
| `autobyteus-web/components/settings/mediaDefaultModelSettings.ts` | File | Frontend settings UI | Field specs/defaults | Scoped to the new card and tests | General model catalog logic |
| `autobyteus-web/components/settings/SettingsToggleSwitch.vue` | File | Frontend settings UI primitive | Shared switch markup/ARIA | Existing settings cards need common control | Setting keys, stores, save logic |
| `autobyteus-web/components/settings/ServerSettingsManager.vue` | File | Settings layout | Include new card | Existing layout owner | Media field mapping duplicated from specs |
| `autobyteus-web/components/settings/CodexFullAccessCard.vue` | File | Codex full access | Use switch visual | Existing Codex setting owner | Applications capability logic |
| `autobyteus-web/components/settings/ApplicationsFeatureToggleCard.vue` | File | Applications capability | Optionally use shared switch primitive | Existing Applications setting owner | Codex sandbox mapping |
| `autobyteus-server-ts/src/services/server-settings-service.ts` | File | Backend settings | Register media key metadata | Existing service owner | Model catalog allowed value validation |
| `autobyteus-web/localization/messages/en/settings.ts` | File | EN localization | New settings strings | Existing manual settings catalog | Generated-only extracted literals |
| `autobyteus-web/localization/messages/zh-CN/settings.ts` | File | zh-CN localization | New settings strings | Existing manual settings catalog | English-only new copy |
| `autobyteus-web/docs/settings.md` | File | Settings docs | Update user docs | Existing docs owner | Implementation-only details that users do not need |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `autobyteus-web/components/settings` | Main-Line Domain-Control UI | Yes | Low | Existing location for settings cards. |
| `autobyteus-web/stores` | Frontend persistence/catalog state | Yes | Low | Reused only; no new store required. |
| `autobyteus-server-ts/src/services` | Backend service | Yes | Low | Existing settings metadata owner. |
| `autobyteus-web/localization/messages` | Off-Spine Concern | Yes | Low | Existing localization structure. |
| `autobyteus-web/docs` | Off-Spine Concern | Yes | Low | Existing user docs. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Media selector save | `DEFAULT_IMAGE_EDIT_MODEL -> select modelIdentifier -> updateServerSetting('DEFAULT_IMAGE_EDIT_MODEL', modelIdentifier)` | Save to a new key such as `BASIC_IMAGE_EDIT_MODEL` and translate later | Keeps one canonical setting key. |
| Unknown current model | Dropdown group `Current setting` with item `nano-banana-pro-app-rpa@host` | Clearing the selector because the model is not in `imageProvidersWithModels` | Prevents data loss when remote catalogs are stale/offline. |
| Image edit/generation options | Both selectors use `imageProvidersWithModels` | Guessing edit capability from model name | The domain model has no capability flag. |
| Switch UI | `SettingsToggleSwitch` or exact Applications switch markup with `role="switch"` and `aria-checked` | Native checkbox styled minimally | Matches user request and improves accessibility/consistency. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep Codex checkbox and add a second decorative toggle | Could avoid changing tests | Rejected | Replace checkbox with one real switch control. |
| Add new friendly media default keys and mirror to old env keys | Could isolate UI from env names | Rejected | Use existing canonical env keys directly. |
| Static allowed-values validation for media default keys | Could prevent invalid raw entries | Rejected for first pass | Dynamic remote model identifiers require catalog-aware UI preservation; backend metadata stays non-deletable/editable without static validation. |
| Separate image edit vs generation filtering by name | Could appear more precise | Rejected | Wait for explicit media capability metadata. |

## Derived Layering (If Useful)

- UI layer: settings cards and switch/dropdown primitives.
- Frontend state layer: server settings store and model catalog store.
- Transport layer: existing GraphQL queries/mutations.
- Backend service layer: server settings metadata/update service and model catalog service.
- Runtime config layer: `AppConfig` writes process/env file.

Layering is descriptive only; ownership and existing boundaries above govern implementation.

## Migration / Refactor Sequence

1. Add frontend media default setting specs with canonical keys and fallback model identifiers.
2. Add `MediaDefaultModelsCard.vue` using existing server settings and model catalog stores.
3. Insert the media card into the Server Settings Basics grid in `ServerSettingsManager.vue`.
4. Register the three media keys in `ServerSettingsService` as predefined editable, non-deletable settings with clear descriptions and no static allowed-values validation.
5. Replace Codex checkbox with switch UI. Prefer extracting `SettingsToggleSwitch.vue` and migrating Applications/Codex to it in the same change; otherwise duplicate the Applications switch style exactly in Codex and note why extraction was skipped.
6. Add/update frontend tests for media card, ServerSettingsManager placement, Codex switch behavior, and Applications non-regression if refactored.
7. Add/update backend service tests for predefined media metadata.
8. Update settings documentation and localization messages.
9. Run targeted validation before implementation handoff: relevant frontend vitest files and backend service test.

## Key Tradeoffs

- One card with three selectors vs three separate cards: one card is clearer because all settings govern media tool defaults and share save/loading behavior.
- Reusing `fetchProvidersWithModels('autobyteus')` vs adding media-specific queries: reuse avoids duplicate catalog ownership and already returns audio/image groups.
- No backend allowed-value validation: necessary because dynamic remote models can legitimately appear/disappear and include host-qualified identifiers.
- Switch primitive extraction vs local copy: extraction is cleaner if both Applications and Codex are touched; local copy is lower-risk but leaves UI markup duplication.

## Risks

- A saved remote model may be missing from the current catalog because the remote host is offline. The stale/current option requirement mitigates data loss.
- Users may expect current active sessions to switch defaults immediately. Copy should clarify defaults apply to future/new media tool use under current lifecycle behavior.
- Refactoring Applications to consume a switch primitive could accidentally alter capability toggle behavior. Keep status logic in Applications card and preserve existing tests.
- The model catalog fetch can fail. The card should surface an error and preserve/display current setting values rather than blocking the whole Server Settings page.

## Guidance For Implementation

- Do not edit the shared/base worktree. Work in `/Users/normy/autobyteus_org/autobyteus-worktrees/server-settings-media-model-selectors`.
- Use `model.modelIdentifier` as the saved value, not `model.value`.
- Build dropdown labels with existing `getModelSelectionOptionLabel` / `getModelSelectionSelectedLabel` helpers where practical.
- Use runtime kind `autobyteus` for fetching image/audio model groups.
- Preserve dirty local state on store refresh, following the existing pattern in `CodexFullAccessCard.vue` and quick endpoint settings.
- Suggested data-test IDs:
  - `media-default-models-card`
  - `media-default-model-select-DEFAULT_IMAGE_EDIT_MODEL`
  - `media-default-model-select-DEFAULT_IMAGE_GENERATION_MODEL`
  - `media-default-model-select-DEFAULT_SPEECH_GENERATION_MODEL`
  - `media-default-models-save`
  - `settings-toggle-switch-*` only if a reusable switch component exposes test ids.
- Targeted tests to run after implementation:
  - `pnpm -C autobyteus-web test:nuxt -- components/settings/__tests__/MediaDefaultModelsCard.spec.ts components/settings/__tests__/ServerSettingsManager.spec.ts components/settings/__tests__/CodexFullAccessCard.spec.ts components/settings/__tests__/ApplicationsFeatureToggleCard.spec.ts`
  - `pnpm -C autobyteus-server-ts test -- tests/unit/services/server-settings-service.test.ts`
