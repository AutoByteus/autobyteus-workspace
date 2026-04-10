# Design Spec

## Current-State Read

`autobyteus-web` currently renders product UI text directly from many ownership points:
- app root (`app.vue`) mounts root product surfaces such as `AppUpdateNotice`, `UiErrorPanel`, `ToastContainer`, and `NuxtLayout`
- layouts (`layouts/default.vue`)
- shell navigation (`components/AppLeftPanel.vue`, `components/layout/LeftSidebarStrip.vue`)
- route shells (`pages/settings.vue`, other pages)
- feature components
- stores/composables that emit toast/error/loading text

There is no app-wide localization subsystem, no persisted app-locale owner, no `Language` settings surface, and no renderer-accessible system-locale bridge in Electron. As a result, English copy is fragmented across templates, inline arrays, store messages, and modal/toast payloads.

Current execution path is effectively:
`Nuxt bootstrap -> app.vue/root consumers mount -> hard-coded component/store string -> visible English UI`

Current ownership problems:
- product copy ownership is fragmented across components/stores instead of one localization boundary
- non-component message producers cannot localize through a shared runtime because none exists
- system/default locale resolution would currently require ad hoc consumer-level browser/Electron checks
- adding a third language would require repeated manual edits across many files instead of resource registration
- app root has no localization-ready gate, so v1 design must explicitly prevent wrong-locale first product paint
- the current touched settings surface `components/settings/ProviderAPIKeyManager.vue` is a 627 effective non-empty-line mixed owner combining provider/model browser presentation, Gemini setup, generic provider key editing, and notification/reload orchestration

Constraints the target design must respect:
- client-side Nuxt 3 app (`ssr: false`)
- Electron + browser-style runtime support
- all product-owned UI is in scope
- no route-prefixed locale mode
- no translation of user-authored/model-generated content
- first product UI paint must already be in the resolved locale

## Intended Change

Introduce a new app-wide localization subsystem that becomes the authoritative boundary for product-owned UI copy.

The target behavior is:
- default mode is `System Default`
- supported locales in v1 are `en` and `zh-CN`
- users can override language in `Settings -> Language`
- the selected mode persists across restart
- the first product UI paint is gated until localization is ready, so there is no wrong-locale flash
- live UI rerenders when language mode changes
- components, stores, and composables all resolve localized strings through the same boundary
- English remains the source/fallback catalog
- Simplified Chinese is delivered as locale overrides merged over the English base
- completion requires an authoritative migration inventory plus mandatory boundary/audit closure
- settings-scope closure also requires structural decomposition of `ProviderAPIKeyManager.vue` rather than shipping one oversized mixed-concern SFC

## Terminology

- `Locale Preference Mode`: user-selected language mode: `system | en | zh-CN`
- `Resolved Locale`: actual runtime locale after system normalization and fallback: `en | zh-CN`
- `Localization Runtime`: authoritative app-owned boundary that exposes translation, active locale state, initialization, and preference updates
- `Catalog Registry`: internal mechanism that registers locale resources and builds merged catalogs
- `Translation Catalog`: nested product-copy resource tree
- `Translation Key`: stable path-like key resolved through the Localization Runtime
- `Localization Bootstrap State`: runtime initialization state: `booting | ready | failed`
- `First Product UI Paint`: first render of any product-owned textual surface from app root or below

## Design Reading Order

Read and write this design from abstract to concrete:

1. data-flow spine
2. subsystem / capability-area allocation
3. draft file responsibilities -> extract reusable owned structures -> finalize file responsibilities
4. folder/path mapping

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: identify obsolete legacy paths/files included in this scope.
- Treat removal as first-class design work: when clearer subsystem ownership, reusable owned structures, or tighter file responsibilities make fragmented or duplicated pieces unnecessary, name and remove/decommission them in scope.
- Decision rule: the design is invalid if it depends on compatibility wrappers, dual-path behavior, or legacy fallback branches kept only for old behavior.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | `Primary End-to-End` | `Nuxt client bootstrap` | `First localized product UI paint` | `LocalizationRuntime` | Establishes the active locale before any product-owned UI text is allowed to render |
| DS-002 | `Primary End-to-End` | `Settings Language section` | `Reactive product UI rerender` | `LocalizationRuntime` | Defines manual override behavior and persistence |
| DS-003 | `Return-Event` | `Store / composable / component action` | `Localized toast / modal / feedback message` | `LocalizationRuntime` | Covers non-component copy emission through the same localization boundary |
| DS-004 | `Bounded Local` | `Preference mode or startup source locale` | `Resolved locale + merged catalog publication` | `LocalizationRuntime` | Internal resolution loop that normalizes system locale, fallback, and reactivity |
| DS-005 | `Primary End-to-End` | `Scope inventory row` | `Audit-closed migration area` | `LocalizationMigrationAudit` | Makes all-product-owned-UI closure explicit and enforceable instead of informal |
| DS-006 | `Bounded Local` | `Settings provider-management intent` | `Localized provider-settings feedback + refreshed section state` | `ProviderAPIKeySectionRuntime` | Keeps reload/save/notification orchestration out of the oversized rendering owner and makes `M-002` structurally closable |

## Primary Execution Spine(s)

- `Nuxt client bootstrap -> localization plugin -> LocalizationRuntime.initialize() -> app root localization gate -> first localized product UI paint`
- `LanguageSettingsManager -> LocalizationRuntime.setPreference(mode) -> preference persistence -> resolved locale state -> reactive UI rerender`
- `Migration inventory row -> boundary guard + literal audit -> area closure -> full-scope completion`
- `pages/settings.vue -> ProviderAPIKeyManager (thin shell) -> ProviderAPIKeySectionRuntime -> ProviderModelBrowser / GeminiSetupForm / ProviderApiKeyEditor -> store actions -> localized notification + refreshed provider state`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| `DS-001` | On startup, a thin plugin triggers `LocalizationRuntime.initialize()`. `app.vue` composes the runtime's bootstrap state into a root localization gate and withholds all product-owned UI surfaces until the runtime has resolved the active locale, activated the merged catalog, and published `ready`. The fallback boot surface is locale-neutral and contains no product-owned copy, so the first product UI paint is already in the resolved locale. | `LocalizationPlugin`, `LocalizationRuntime`, `AppLocalizationGate`, `Localized UI Consumers` | `LocalizationRuntime` | `PreferenceStorage`, `SystemLocaleResolver`, `CatalogRegistry`, `CatalogMerge` |
| `DS-002` | In Settings, the Language section captures user intent (`system`, `en`, `zh-CN`), hands it to the Localization Runtime, which persists the mode, resolves the active locale, and causes already-mounted UI to rerender. | `LanguageSettingsManager`, `LocalizationRuntime`, `Localized UI Consumers` | `LocalizationRuntime` | `PreferenceStorage`, `CatalogRegistry` |
| `DS-003` | When a store/composable/component needs user-facing feedback, it asks the Localization Runtime for text and then passes the resolved string into the existing toast/modal display boundary. | `Action Owner`, `LocalizationRuntime`, `Toast / Modal Display` | `LocalizationRuntime` | `useToasts`, local notification components |
| `DS-004` | Inside the Localization Runtime, initialization or preference changes trigger a bounded local resolution flow: determine effective source locale(s), normalize to a supported locale, build the merged catalog, activate locale state, publish `ready`, and persist mode when appropriate. | `LocalizationRuntime` | `LocalizationRuntime` | `SystemLocaleResolver`, `CatalogMerge`, `PreferenceStorage` |
| `DS-005` | Each migration area is tracked in an authoritative scope matrix. The area is not closed until boundary guard checks pass, the raw-literal audit reports zero unresolved product literals for that scope, and the implementation checklist for that area is complete. | `LocalizationMigrationInventory`, `BoundaryGuard`, `LiteralAudit` | `LocalizationMigrationAudit` | `package.json` scripts, audit-scope config |
| `DS-006` | Inside the settings `api-keys` section, a thin section shell delegates local provider-management state and async workflows to `ProviderAPIKeySectionRuntime`. Presentation stays in `ProviderModelBrowser`, Gemini-specific editing stays in `GeminiSetupForm`, and non-Gemini credential editing stays in `ProviderApiKeyEditor`. Save/reload outcomes return as localized notification state without re-expanding the parent SFC into a mixed owner. | `ProviderAPIKeyManager`, `ProviderAPIKeySectionRuntime`, `ProviderModelBrowser`, `GeminiSetupForm`, `ProviderApiKeyEditor` | `ProviderAPIKeySectionRuntime` | `useLLMProviderConfigStore`, localized notification display |

## Spine Actors / Main-Line Nodes

- `LocalizationPlugin`
- `LocalizationRuntime`
- `AppLocalizationGate`
- `LanguageSettingsManager`
- `Localized UI Consumers`
- `Toast / Modal Display Boundary`
- `LocalizationMigrationInventory`
- `BoundaryGuard`
- `LiteralAudit`
- `ProviderAPIKeyManager`
- `ProviderAPIKeySectionRuntime`
- `ProviderModelBrowser`
- `GeminiSetupForm`
- `ProviderApiKeyEditor`

## Ownership Map

- `LocalizationPlugin`
  - thin bootstrap facade only
  - owns one-time client initialization trigger into Nuxt
  - must not own locale policy, persistence, or translation lookup

- `LocalizationRuntime`
  - governing owner
  - owns locale preference state, resolved locale state, system-default normalization, fallback policy, translation lookup contract, bootstrap state publication, and reactive locale changes
  - encapsulates the underlying Vue i18n engine instance and catalog registry/merge

- `AppLocalizationGate`
  - thin entry facade at app root
  - owns withholding of product-owned UI surfaces until `LocalizationRuntime.bootstrapState === 'ready'`
  - must not own locale resolution, persistence, or translation lookup

- `LanguageSettingsManager`
  - owns the user-facing language-selection form and help text
  - must not own locale persistence or direct dictionary access

- `Localized UI Consumers`
  - own rendering of their local UI surfaces
  - must not own locale resolution, catalog imports, or resource registration

- `Toast / Modal Display Boundary`
  - owns transient feedback display only
  - must not become a second localization owner

- `LocalizationMigrationAudit`
  - owns scope inventory closure rules, boundary guard execution contract, and literal-audit closure
  - must not become a second translation runtime

- `ProviderAPIKeyManager`
  - thin settings-section entry facade for the `api-keys` page section
  - composes provider browser, credential editor, Gemini form, loading/empty shells, and notification display
  - must not own store mutation bodies, timer lifecycle, or large repeated model-panel rendering

- `ProviderAPIKeySectionRuntime`
  - governing local owner for the settings provider-management subsection
  - owns section boot loading, selected-provider state, provider configuration hydration, reload/save orchestration, and localized notification lifecycle
  - must not become a second backend provider store or a large render owner

- `ProviderModelBrowser`
  - owns provider/model browser presentation only
  - must not own store access, Gemini form state, or notification timers

- `GeminiSetupForm`
  - owns Gemini setup local field state, validation, and submit intent for the selected provider
  - must not own provider-list presentation or global reload orchestration

- `ProviderApiKeyEditor`
  - owns non-Gemini provider API-key local field state, visibility toggle, and submit intent
  - must not own provider browsing, Gemini-specific state, or notification timers

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `plugins/05.localization.client.ts` | `LocalizationRuntime` | Trigger app-localization initialization once during client startup | locale policy, translation lookup, preference storage |
| `components/app/AppLocalizationGate.vue` or equivalent `app.vue` root gate block | `LocalizationRuntime` | Hard-gate first product UI paint until localization is ready | locale resolution, persistence, translation lookup |
| `composables/useLocalization.ts` | `LocalizationRuntime` | Give Vue consumers ergonomic reactive access | duplicate localization state or direct catalog ownership |
| `components/settings/ProviderAPIKeyManager.vue` | `ProviderAPIKeySectionRuntime` | Keep `pages/settings.vue` mounted contract stable while reducing the section entry file to a composition shell | store mutation logic, notification timers, or large child-specific templates |

## First Localized Paint Contract (Mandatory)

The design uses a **hard app-root gate**, not a best-effort plugin race.

Concrete contract:
1. `plugins/05.localization.client.ts` triggers `LocalizationRuntime.initialize()` during client startup.
2. `LocalizationRuntime.initialize()` is idempotent and sets `bootstrapState = 'booting'` until locale resolution and catalog activation are complete.
3. `app.vue` composes existing server readiness with localization readiness:
   - `isProductUiReady = isServerReady && localizationRuntime.bootstrapState === 'ready'`
4. Product-owned root surfaces stay behind this gate:
   - `AppUpdateNotice`
   - `UiErrorPanel`
   - `ToastContainer`
   - `NuxtLayout` / `NuxtPage`
5. While booting, app root renders only a locale-neutral boot surface (logo/spinner/skeleton; no language-specific product copy).
6. Therefore, the first product UI paint occurs only after `LocalizationRuntime` has already resolved `ResolvedLocale`, activated the merged catalog, and published `ready`.

This is the authoritative answer to `DI-001`.

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Hard-coded shell/navigation/settings literals | Product copy should no longer live directly in templates/inline arrays | `LocalizationRuntime` + message catalogs | `In This Change` | Includes `app.vue` root text surfaces, `layouts/default.vue`, `AppLeftPanel.vue`, `LeftSidebarStrip.vue`, `pages/settings.vue` |
| Hard-coded product-owned toast/error/loading strings in scoped stores/composables/components | Non-component copy must use the same localization boundary | `LocalizationRuntime.translate(...)` | `In This Change` | Existing toast display helper remains, but callers stop passing English literals |
| Consumer-level locale detection attempts | Locale resolution must be authoritative and centralized | `SystemLocaleResolver` behind `LocalizationRuntime` | `In This Change` | No direct `navigator.language` / `navigator.languages` / `electronAPI.getAppLocale()` in feature code |
| Direct resource imports into feature code | Resource files are internal runtime inputs, not public APIs | `useLocalization()` / `LocalizationRuntime` | `In This Change` | Boundary guard must fail these bypass imports |

## Return Or Event Spine(s) (If Applicable)

- `LocalizationRuntime -> reactive locale refs / i18n engine locale -> mounted UI rerender`
- `Action Owner -> LocalizationRuntime.translate(key, params) -> useToasts / modal notification -> displayed feedback`
- `BoundaryGuard / LiteralAudit -> migration inventory row status -> area closure`

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `LocalizationRuntime`
- Short arrow chain:
  - `Preference mode or startup source locale -> determine authoritative host input list -> normalize to supported locale -> build merged catalog -> activate locale -> publish bootstrapState/refs -> persist mode`
- Why this bounded local spine matters:
  - It is the internal policy loop that guarantees `System Default`, fallback, and runtime switching all behave consistently through one owner.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| `CatalogRegistry` | `DS-001`, `DS-002`, `DS-004` | `LocalizationRuntime` | Register locale resources and expose merged catalog inputs | Keeps resource assembly off the main policy line | Main spine would become a mixed policy/data bag |
| `CatalogMerge` | `DS-001`, `DS-004` | `LocalizationRuntime` | Merge English base catalog with locale overrides | Enables safe fallback and future partial locales | Translation fallback logic would leak into consumers |
| `SystemLocaleResolver` | `DS-001`, `DS-004` | `LocalizationRuntime` | Resolve host locale from Electron/browser and normalize to supported locales | Keeps system-default behavior authoritative | Consumers would duplicate detection logic |
| `PreferenceStorage` | `DS-001`, `DS-002`, `DS-004` | `LocalizationRuntime` | Persist and restore locale mode | Keeps persistence out of UI components | Settings UI would become a storage owner |
| `AppLocalizationGate` boot surface | `DS-001` | `AppLocalizationGate` | Render non-product neutral boot placeholder while localization boots | Prevents wrong-locale flash | Runtime would become a UI renderer |
| Existing toast/modal display helpers | `DS-003` | action owners | Continue rendering transient feedback after translation lookup | Reuses existing display mechanisms | Toast subsystem would incorrectly become translation owner |
| `BoundaryGuard` | `DS-005` | `LocalizationMigrationAudit` | Fail forbidden imports and bypasses | Makes developer guardrail enforceable | Consumers could silently erode boundary |
| `LiteralAudit` | `DS-005` | `LocalizationMigrationAudit` | Scan scoped surfaces for remaining raw product literals and report unresolved rows | Makes app-wide migration closure measurable | Large-scope completion would remain informal |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| App startup bootstrap | `plugins/` | `Extend` | Existing client plugins are the correct thin boot surface | — |
| App-root readiness gate | `app.vue` existing `isAppReady` gating pattern | `Extend` | Existing root gate already owns first render coordination | — |
| Settings entry surface | `pages/settings.vue` + `components/settings/` | `Extend` | Correct current owner for user-facing preferences | — |
| Preference persistence pattern | `stores/nodeStore.ts`, `stores/applicationLaunchProfileStore.ts` patterns | `Extend` | Existing localStorage patterns are useful references | — |
| Toast/modal display | `useToasts.ts` and existing notification components | `Reuse` | Display boundary already exists and should stay display-only | — |
| Boundary guard precedent | `scripts/guard-web-boundary.mjs` + `package.json` script wiring | `Extend` | Existing repo already enforces architectural boundaries by script | — |
| App-wide localization runtime | none | `Create New` | No authoritative localization subsystem exists today | Existing app layers are consumers, not suitable owners |
| Literal-audit workflow for migration closure | none | `Create New` | No current migration-closure mechanism exists for app-wide localization | Existing guards do not audit raw copy coverage |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `localization/runtime` | locale mode state, resolved locale, bootstrap state, translation API, fallback policy, system resolution, persistence orchestration | `DS-001`, `DS-002`, `DS-003`, `DS-004` | `LocalizationRuntime` | `Create New` | Core authoritative boundary |
| `localization/messages` | English source catalog and locale override catalogs organized by product domain | `DS-001`, `DS-002`, `DS-003` | `LocalizationRuntime` | `Create New` | Resource ownership stays outside feature components |
| `app root bootstrap gate` | first product UI paint gating | `DS-001` | `AppLocalizationGate` | `Extend` | Implemented at app root using current gating pattern |
| `components/settings` + `pages/settings.vue` | user-facing Language section and Settings nav entry | `DS-002` | `LanguageSettingsManager` | `Extend` | Adds `Language` menu item/section |
| shell/layout components | localized shell rendering | `DS-001`, `DS-002` | local UI consumers | `Extend` | Replace hard-coded nav/header/settings labels |
| stores/composables/components with user-facing feedback | translated toasts/errors/loading/empty states | `DS-003` | action owners | `Extend` | Message producers call localization boundary before display |
| Electron bridge | app-locale IPC for system-default mode | `DS-001`, `DS-004` | `SystemLocaleResolver` | `Extend` | Electron-specific host locale source |
| `localization/audit` | migration inventory scope config, boundary guard contract, raw-literal audit closure | `DS-005` | `LocalizationMigrationAudit` | `Create New` | Makes full-scope migration enforceable |
| `settings/providerApiKey` local section runtime + child components | provider settings section-local loading, selection, form ownership, reload/save orchestration, notification lifecycle | `DS-006` | `ProviderAPIKeySectionRuntime` | `Create New` | Structural cleanup required to close the touched `ProviderAPIKeyManager.vue` surface |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/localization/runtime/types.ts` | `localization/runtime` | shared runtime structures | locale modes, resolved locales, bootstrap states, catalog helpers, interpolation types | Shared runtime contracts should not be duplicated | Yes |
| `autobyteus-web/localization/runtime/localizationRuntime.ts` | `localization/runtime` | `LocalizationRuntime` | governing owner for initialization, active locale, bootstrap state, translation, preference updates | One authoritative boundary file | Yes |
| `autobyteus-web/localization/runtime/catalogRegistry.ts` | `localization/runtime` | internal mechanism | register and expose locale catalogs by locale id | Keeps catalog assembly isolated | Yes |
| `autobyteus-web/localization/runtime/catalogMerge.ts` | `localization/runtime` | internal mechanism | merge English base with locale overrides | Reusable policy detail | Yes |
| `autobyteus-web/localization/runtime/systemLocaleResolver.ts` | `localization/runtime` | internal adapter | resolve Electron/browser locale and normalize it | Separate adapter concern | Yes |
| `autobyteus-web/localization/runtime/preferenceStorage.ts` | `localization/runtime` | internal adapter | read/write locale preference mode | Separate persistence concern | Yes |
| `autobyteus-web/localization/messages/en/index.ts` | `localization/messages` | English source catalog | authoritative complete English catalog composition | One source-of-truth root per locale | Yes |
| `autobyteus-web/localization/messages/zh-CN/index.ts` | `localization/messages` | locale override catalog | Simplified Chinese overrides composed by domain | One root per locale | Yes |
| `autobyteus-web/localization/audit/migrationScopes.ts` | `localization/audit` | scope inventory owner | authoritative scope inventory / path clusters / done rules | Keeps migration closure concrete | Yes |
| `autobyteus-web/scripts/guard-localization-boundary.mjs` | `localization/audit` | boundary guard | fail forbidden raw imports and bypass patterns | Mandatory enforcement should be one script | Yes |
| `autobyteus-web/scripts/audit-localization-literals.mjs` | `localization/audit` | literal audit | scan scoped surfaces and report unresolved product literals | Mandatory audit should be one script | Yes |
| `autobyteus-web/composables/useLocalization.ts` | Vue consumer boundary | thin facade | ergonomic consumer access to runtime refs and translate function | Avoids direct consumer imports of internals | Yes |
| `autobyteus-web/plugins/05.localization.client.ts` | bootstrap | thin facade | trigger runtime initialization once | Keeps bootstrap concerns out of runtime | Yes |
| `autobyteus-web/components/app/AppLocalizationGate.vue` (or equivalent root-local gate block in `app.vue`) | app root gate | `AppLocalizationGate` | withhold product UI until localization runtime ready | Makes first-paint contract explicit | Yes |
| `autobyteus-web/components/settings/LanguageSettingsManager.vue` | settings UI | `LanguageSettingsManager` | selector UI for system/en/zh-CN | One user-facing preference surface | Yes |
| `autobyteus-web/components/settings/ProviderAPIKeyManager.vue` | settings UI | thin section facade | compose the provider settings section without re-owning all browser/form/orchestration concerns | preserves current settings page mount contract while shrinking the owner | Yes |
| `autobyteus-web/components/settings/providerApiKey/ProviderModelBrowser.vue` | settings provider-management UI | `ProviderModelBrowser` | provider sidebar, model groups, selected-provider panel, reload-selected CTA | presentation concern should be isolated from save flows | Yes |
| `autobyteus-web/components/settings/providerApiKey/GeminiSetupForm.vue` | settings provider-management UI | `GeminiSetupForm` | Gemini mode selection, credential/project fields, validation, submit intent | Gemini workflow is a distinct settings concern | Yes |
| `autobyteus-web/components/settings/providerApiKey/ProviderApiKeyEditor.vue` | settings provider-management UI | `ProviderApiKeyEditor` | generic provider API-key entry/update, visibility toggle, submit intent | generic non-Gemini credential editing is a separate concern | Yes |
| `autobyteus-web/components/settings/providerApiKey/useProviderApiKeySectionRuntime.ts` | settings provider-management runtime | `ProviderAPIKeySectionRuntime` | section-local boot loading, selected provider, provider-config hydration, reload/save orchestration, notification lifecycle | bounded local workflow owner extracted from the SFC | Yes |
| `autobyteus-web/pages/settings.vue` | settings UI shell | settings page owner | add `Language` nav item and render manager | Existing settings owner should stay authoritative for section routing | No |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| locale modes, resolved locales, bootstrap state | `localization/runtime/types.ts` | `localization/runtime` | used by runtime, settings UI, and Electron bridge typing | `Yes` | `Yes` | generic app-settings catch-all types file |
| translation catalog shape and key ownership | `localization/runtime/types.ts` + English source catalog export | `localization/runtime` | keeps locale resources structurally aligned | `Yes` | `Yes` | duplicated ad hoc key maps in feature code |
| system-locale normalization logic | `localization/runtime/systemLocaleResolver.ts` | `localization/runtime` | should be reused by init and future refresh hooks | `Yes` | `Yes` | consumer-level browser/Electron checks |
| locale preference persistence key/read-write | `localization/runtime/preferenceStorage.ts` | `localization/runtime` | one preference owner only | `Yes` | `Yes` | direct `localStorage` usage across components |
| migration scope inventory | `localization/audit/migrationScopes.ts` | `localization/audit` | shared by literal audit and implementation closure checklist | `Yes` | `Yes` | ad hoc hard-coded path lists duplicated across scripts/docs |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `LocalePreferenceMode` | `Yes` | `Yes` | `Low` | Keep it limited to `system | en | zh-CN` |
| `ResolvedLocale` | `Yes` | `Yes` | `Low` | Keep it limited to supported runtime locales only |
| `LocalizationBootstrapState` | `Yes` | `Yes` | `Low` | Keep it limited to `booting | ready | failed` |
| `TranslationCatalog` | `Yes` | `Yes` | `Medium` | Derive non-English override shape from English source catalog rather than free-form objects |
| `TranslationKey` | `Yes` | `Yes` | `Low` | Keep one runtime-owned key helper or source-derived key space; do not duplicate string-union definitions in feature code |
| `MigrationScopeRow` | `Yes` | `Yes` | `Low` | Keep columns explicit: scope id, paths, done criteria, status |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/localization/runtime/types.ts` | `localization/runtime` | shared runtime structures | locale ids, preference ids, bootstrap state, catalog helpers, interpolation params | central shared contract | Yes |
| `autobyteus-web/localization/runtime/catalogRegistry.ts` | `localization/runtime` | internal registry | locale-resource registration and retrieval | one concern, no policy spillover | Yes |
| `autobyteus-web/localization/runtime/catalogMerge.ts` | `localization/runtime` | internal merger | English-base + override merge | isolated fallback assembly | Yes |
| `autobyteus-web/localization/runtime/systemLocaleResolver.ts` | `localization/runtime` | internal adapter | Electron/browser locale resolution + normalization | host-specific concern separated from runtime owner | Yes |
| `autobyteus-web/localization/runtime/preferenceStorage.ts` | `localization/runtime` | internal adapter | persist/restore locale preference mode | single persistence concern | Yes |
| `autobyteus-web/localization/runtime/localizationRuntime.ts` | `localization/runtime` | `LocalizationRuntime` | authoritative state + bootstrap state + translate API + initialization + boundary methods | core owner file | Yes |
| `autobyteus-web/localization/messages/en/*.ts` + `index.ts` | `localization/messages` | English source catalog | complete product-copy source grouped by feature domain | keeps catalog maintainable for all-product UI scope | Yes |
| `autobyteus-web/localization/messages/zh-CN/*.ts` + `index.ts` | `localization/messages` | Simplified Chinese override catalog | translated product copy grouped by feature domain | mirrors domain structure without flattening everything | Yes |
| `autobyteus-web/localization/audit/migrationScopes.ts` | `localization/audit` | `LocalizationMigrationAudit` | authoritative migration scope inventory and done rules | makes repo-wide completion measurable | Yes |
| `autobyteus-web/scripts/guard-localization-boundary.mjs` | `localization/audit` | boundary guard | fail raw imports of `localization/messages/**`, raw `vue-i18n` consumer usage, and direct locale-detection bypasses outside allowed files | mandatory guardrail | Yes |
| `autobyteus-web/scripts/audit-localization-literals.mjs` | `localization/audit` | literal audit | audit inventory paths for unresolved product-owned literals and produce zero-unresolved closure signal | mandatory closure audit | Yes |
| `autobyteus-web/composables/useLocalization.ts` | Vue consumer boundary | thin facade | expose runtime refs, locale mode setter, and translate method to components | convenience without bypass | Yes |
| `autobyteus-web/plugins/05.localization.client.ts` | bootstrap | thin facade | trigger localization runtime initialization during client startup | keeps boot trigger thin | Yes |
| `autobyteus-web/components/app/AppLocalizationGate.vue` or equivalent `app.vue` root block | app root gate | `AppLocalizationGate` | gate all product-owned root surfaces until `LocalizationRuntime` ready | first-paint contract owner | Yes |
| `autobyteus-web/components/settings/LanguageSettingsManager.vue` | settings UI | `LanguageSettingsManager` | selector UI and explanatory copy for language mode | dedicated settings concern | Yes |
| `autobyteus-web/components/settings/ProviderAPIKeyManager.vue` | settings provider-management UI | thin section facade | compose the localized provider settings section, loading/empty shells, and notification display without owning the underlying workflows | keeps `pages/settings.vue` stable while removing the mixed owner | Yes |
| `autobyteus-web/components/settings/providerApiKey/ProviderModelBrowser.vue` | settings provider-management UI | `ProviderModelBrowser` | provider sidebar/model browser presentation and selected-provider model panel | isolates the large repeated template concern | Yes |
| `autobyteus-web/components/settings/providerApiKey/GeminiSetupForm.vue` | settings provider-management UI | `GeminiSetupForm` | Gemini-specific setup mode + local fields + validation + submit intent | keeps Gemini workflow isolated | Yes |
| `autobyteus-web/components/settings/providerApiKey/ProviderApiKeyEditor.vue` | settings provider-management UI | `ProviderApiKeyEditor` | non-Gemini provider API-key entry/update + visibility toggle + submit intent | keeps generic credential editing isolated | Yes |
| `autobyteus-web/components/settings/providerApiKey/useProviderApiKeySectionRuntime.ts` | settings provider-management runtime | `ProviderAPIKeySectionRuntime` | section-local initialization, provider selection, provider-config hydration, reload/save orchestration, and notification lifecycle | keeps async/timer workflow out of the SFC and child forms | Yes |
| `autobyteus-web/pages/settings.vue` | settings UI shell | settings page owner | add Language menu item and render LanguageSettingsManager | section routing stays where it already lives | No |
| representative shell + feature consumer files | existing feature owners | local UI consumers | replace hard-coded literals with translation keys / runtime translate calls | preserves feature ownership while removing copy ownership | Yes |
| `autobyteus-web/electron/preload.ts`, `autobyteus-web/types/electron.d.ts`, `autobyteus-web/electron/types.d.ts`, `autobyteus-web/electron/main.ts` | Electron bridge | system-locale bridge | expose `getAppLocale()` for Electron runtime | host-locale access belongs in the bridge | No |
| `autobyteus-web/package.json` | delivery hooks | build/test script owner | make localization boundary guard and literal audit first-class scripts | current repo already centralizes such commands here | No |

## Provider API Key Settings Structural Refactor Contract (Mandatory)

This is the authoritative answer to `CR-003`.

`pages/settings.vue` continues to mount `ProviderAPIKeyManager.vue` for `activeSection === 'api-keys'`, but that file is no longer allowed to remain the full provider-management owner.

### Required owner split

1. `ProviderAPIKeyManager.vue`
   - remains the settings-section entry file
   - becomes a thin composition shell only
   - may render the section header, top-level reload-all button, loading/empty shells, child composition, and notification display
   - must not own store mutation bodies, timeout lifecycle, or the full provider/model browser template

2. `components/settings/providerApiKey/ProviderModelBrowser.vue`
   - owns provider sidebar presentation, selected-provider badge/status, grouped model rendering, and selected-provider reload button
   - emits user intent (`select-provider`, `reload-selected-provider`) upward
   - does not call the store directly

3. `components/settings/providerApiKey/GeminiSetupForm.vue`
   - owns Gemini mode selection, Gemini/Vertex local form fields, validation, API-key visibility toggle, and submit intent
   - receives the selected-provider Gemini state as inputs and emits a normalized save payload
   - does not own notifications or provider browsing

4. `components/settings/providerApiKey/ProviderApiKeyEditor.vue`
   - owns non-Gemini API-key local field state, visibility toggle, and submit intent
   - receives configured/not-configured status and emits save intent
   - does not own provider browsing, Gemini mode logic, or notification timers

5. `components/settings/providerApiKey/useProviderApiKeySectionRuntime.ts`
   - is the bounded local runtime owner behind this section
   - owns initial hydration (`fetchProvidersWithModels`, `fetchGeminiSetupConfig`, provider key mask lookup), selected-provider state, configured-provider resolution, reload-all / reload-selected orchestration, save orchestration, and localized notification lifecycle
   - reuses the existing `useLLMProviderConfigStore` as the only backend-facing owner
   - does not become a new Pinia store or a second provider data authority

### Dependency direction

- `pages/settings.vue` -> `ProviderAPIKeyManager.vue` only
- `ProviderAPIKeyManager.vue` -> `useProviderApiKeySectionRuntime.ts` + child presentation/forms
- child presentation/forms -> emit intent to the section shell/runtime; they do not call store mutations directly
- `useProviderApiKeySectionRuntime.ts` -> `useLLMProviderConfigStore` + `useLocalization()`

### Additional closure rules

- Existing localization catalog ownership stays in the settings catalog boundary; the split must not create direct message imports in the children.
- `ProviderAPIKeyManager.vue` should fall back under the changed-surface readability bar after extraction; child owners and the local runtime must remain separately testable and comfortably below the hard source-file limit.
- `M-002` is not closed until this structural split exists alongside the already-passing localization behavior.

### Target shape

`pages/settings.vue -> ProviderAPIKeyManager.vue -> useProviderApiKeySectionRuntime() -> ProviderModelBrowser + (GeminiSetupForm | ProviderApiKeyEditor) + notification display`

## Ownership Boundaries

The authoritative boundary is `LocalizationRuntime`.

Everything above it—components, pages, stores, composables, modal/toast callers, and app-root gate consumers—must depend on that boundary for product-owned text.
They must not mix:
- direct catalog imports
- direct locale resolution
- direct persistence of locale mode
- raw use of a lower-level i18n engine API
- direct host-locale access (`navigator.language`, `navigator.languages`, or `window.electronAPI.getAppLocale()`)

`LocalizationRuntime` encapsulates:
- the underlying Vue i18n engine instance
- catalog registration and merged-catalog activation
- system locale resolution policy
- preference persistence
- bootstrap readiness state

`AppLocalizationGate` is only a render gate. It is not a localization owner.

`LocalizationMigrationAudit` is only an enforcement/audit owner. It is not a translation runtime.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `LocalizationRuntime` | Vue i18n engine instance, catalog registry, catalog merge, preference storage, system locale resolver, bootstrap state | components, pages, stores, composables, app-root gate, notification emitters | consumer imports `messages/en/*`, raw `useI18n`, `navigator.language`, `navigator.languages`, `window.electronAPI.getAppLocale()`, or direct `localStorage` locale writes | expanding `LocalizationRuntime` / `useLocalization()` API |
| `AppLocalizationGate` | gating/render details | `app.vue` | root shell directly reimplements localization-ready logic using internal runtime pieces | strengthening gate props/composable contract |
| `LanguageSettingsManager` | selector rendering details | `pages/settings.vue` | page directly reimplements locale option logic and persistence | strengthening component props/composable contract |
| Electron `getAppLocale()` bridge | `app.getLocale()` / Electron host access | `SystemLocaleResolver` only | feature code calling Electron locale APIs directly | adding needed method to resolver, not bypassing it |
| `LocalizationMigrationAudit` | scope inventory, guard scripts, audit report logic | build/CI/implementation closure flow | ad hoc manual spot checks with no authoritative inventory | strengthening audit scope data or guard messages |
| `ProviderAPIKeySectionRuntime` | section-local loading, selected-provider state, provider-config hydration, reload/save orchestration, localized notification timer state | `ProviderAPIKeyManager.vue` and its child forms/browser | child components or the section shell calling store mutations/timers directly | expanding the local runtime API instead of re-bloating the SFC |
| `ProviderAPIKeyManager.vue` | section composition/render shell | `pages/settings.vue` | page-level inline reimplementation of provider browser/forms/runtime state | strengthening section-shell props and events instead of pushing logic back into the page |

## Dependency Rules

- UI consumers may depend on `useLocalization()` or `LocalizationRuntime` public methods only.
- Stores/composables that need product-owned feedback text may call runtime translation helpers directly.
- App root gating may depend on runtime `bootstrapState` only.
- UI consumers must not import locale resource files.
- UI consumers must not call raw locale detection (`navigator.language`, `navigator.languages`, or Electron locale IPC) directly.
- Only `PreferenceStorage` persists locale mode.
- Only `LocalizationRuntime` activates the i18n engine locale.
- Existing toast/modal helpers remain display boundaries and must not start owning translation catalogs.
- `BoundaryGuard` must fail:
  - imports from `localization/messages/**` outside `localization/runtime/**`
  - raw `vue-i18n` consumer usage outside the runtime/composable boundary
  - direct host-locale access outside `SystemLocaleResolver`
- `LiteralAudit` must run against the authoritative migration scope inventory and report zero unresolved in-scope product literals before closure.
- No new hard-coded English product-copy literals in migrated surfaces.
- `ProviderAPIKeyManager.vue` must stay a composition shell; reload/save workflows and notification timers live in `useProviderApiKeySectionRuntime.ts`.
- `ProviderModelBrowser`, `GeminiSetupForm`, and `ProviderApiKeyEditor` must not call `useLLMProviderConfigStore` directly.
- `useLLMProviderConfigStore` remains the single backend-facing owner for provider/model fetch and mutation behavior.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `localizationRuntime.initialize()` | app localization | bootstrap runtime from persisted/system mode and publish readiness | none | idempotent; resolves only when locale + catalog are active |
| `localizationRuntime.setPreference(mode)` | locale preference | accept user-selected language mode and activate it | `system | en | zh-CN` | persists and rerenders |
| `localizationRuntime.translate(key, params?)` | product-owned UI copy | resolve localized string for active locale | `TranslationKey` + optional interpolation map | used by stores/composables/components |
| `localizationRuntime.bootstrapState` | app localization bootstrap | expose booting/ready/failed state to app root gate | `booting | ready | failed` | read-only outside runtime |
| `useLocalization()` | Vue consumer access | expose reactive locale state + translate/setter/bootstrap refs | none | thin wrapper only |
| `useProviderApiKeySectionRuntime().initialize()` | settings provider-management runtime | hydrate provider/model state, Gemini setup state, provider config masks, and initial selection | none | local settings section boot only |
| `useProviderApiKeySectionRuntime().reloadAllModels()` | settings provider-management runtime | run all-provider reload and publish localized notification result | none | wraps existing store action; no duplicate policy |
| `useProviderApiKeySectionRuntime().reloadSelectedProvider(provider)` | settings provider-management runtime | run selected-provider reload and publish localized notification result | provider name | called from browser child intent |
| `useProviderApiKeySectionRuntime().saveGeminiSetup(input)` | settings provider-management runtime | persist Gemini setup and publish localized notification result | `GeminiSetupConfigInput` | called from Gemini form intent |
| `useProviderApiKeySectionRuntime().saveProviderApiKey(provider, apiKey)` | settings provider-management runtime | persist a non-Gemini provider key and publish localized notification result | provider name + api key | called from generic provider editor intent |
| `window.electronAPI.getAppLocale()` | Electron host locale bridge | return host locale string to renderer | none | used only via resolver |
| `pnpm guard:localization-boundary` | migration enforcement | fail forbidden bypass imports/usages | none | mandatory |
| `pnpm audit:localization-literals` | migration audit | report unresolved product literals across scope inventory | none | mandatory closure audit |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `initialize()` | `Yes` | `Yes` | `Low` | document promise-resolve contract explicitly |
| `setPreference(mode)` | `Yes` | `Yes` | `Low` | keep union narrow |
| `translate(key, params?)` | `Yes` | `Yes` | `Low` | keep key space runtime-owned and non-duplicated |
| `bootstrapState` | `Yes` | `Yes` | `Low` | keep read-only to consumers |
| `getAppLocale()` | `Yes` | `Yes` | `Low` | keep bridge locale-only |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| localization owner | `LocalizationRuntime` | `Yes` | `Low` | keep as authoritative boundary |
| root gate | `AppLocalizationGate` | `Yes` | `Low` | avoid vague names like `BootHelper` |
| settings surface | `LanguageSettingsManager` | `Yes` | `Low` | avoid vague names like `LanguageHelper` |
| host adapter | `SystemLocaleResolver` | `Yes` | `Low` | keep resolver focused on host normalization |
| enforcement owner | `LocalizationMigrationAudit` | `Yes` | `Low` | avoid generic `auditUtils` ownership |

## Applied Patterns (If Any)

- `Registry`
  - lives in `localization/runtime/catalogRegistry.ts`
  - solves locale-resource lookup and registration by locale id
  - belongs to an internal off-spine concern serving `LocalizationRuntime`

- `Adapter`
  - lives in `localization/runtime/systemLocaleResolver.ts`
  - solves Electron/browser host-locale translation into supported app locales
  - belongs to an internal off-spine concern serving `LocalizationRuntime`

- `Thin facade`
  - lives in `plugins/05.localization.client.ts`, `composables/useLocalization.ts`, and `AppLocalizationGate`
  - solves ergonomic app/bootstrap access without moving authority out of `LocalizationRuntime`

- `Guard + Audit`
  - live in `scripts/guard-localization-boundary.mjs` and `scripts/audit-localization-literals.mjs`
  - solve enforceable migration closure for a large cross-cutting rollout
  - belong to `LocalizationMigrationAudit`, not the runtime itself

## System Locale Resolution Contract (Mandatory)

This is the authoritative answer to `DI-003`.

### Precedence Algorithm

1. If `LocalePreferenceMode` is `en`, resolve immediately to `en`.
2. If `LocalePreferenceMode` is `zh-CN`, resolve immediately to `zh-CN`.
3. If `LocalePreferenceMode` is `system`:
   - if `window.electronAPI.getAppLocale()` exists and returns a non-empty value, use **only that Electron locale** as the authoritative host locale input
   - else use browser locale inputs in order:
     - `navigator.languages[]` in listed order, if available
     - then `navigator.language` as fallback if not already included
4. Normalize candidates in order; the first candidate that maps to a supported locale wins.
5. If no candidate maps to a supported locale, resolve to `en`.

### Supported Mapping Rules

| Host Locale Input | Normalized Result | Notes |
| --- | --- | --- |
| `en` | `en` | supported |
| `en-*` (for example `en-US`, `en-GB`) | `en` | supported English family |
| `zh` | `zh-CN` | bare Chinese defaults to supported Simplified Chinese in v1 |
| `zh-CN` | `zh-CN` | supported |
| `zh-SG` | `zh-CN` | treated as Simplified Chinese family |
| `zh-Hans` | `zh-CN` | Simplified Chinese script tag |
| `zh-Hans-*` | `zh-CN` | Simplified Chinese script family |
| `zh-TW` / `zh-HK` / `zh-MO` | `en` | Traditional Chinese family unsupported in v1; fallback to English |
| `zh-Hant` / `zh-Hant-*` | `en` | Traditional Chinese script unsupported in v1; fallback to English |
| any unsupported non-English locale (for example `fr-FR`, `de-DE`, `ja-JP`) | `en` | v1 fallback |
| empty / malformed locale strings | `en` | deterministic fallback |

### Examples

| Runtime Context | Inputs | Result |
| --- | --- | --- |
| Electron + system mode | `getAppLocale() -> zh-CN` | `zh-CN` |
| Electron + system mode | `getAppLocale() -> en-GB` | `en` |
| Electron + system mode | `getAppLocale() -> fr-FR` | `en` |
| Browser + system mode | `navigator.languages = ['zh-Hans-SG', 'en-US']` | `zh-CN` |
| Browser + system mode | `navigator.languages = ['de-DE', 'en-US']` | `en` |
| Browser + system mode | `navigator.language = zh` and no languages array | `zh-CN` |

## Mandatory Migration Coverage Matrix

This is the authoritative answer to `DI-002`.

A migration area is not complete until all rows in this matrix are closed.

| Scope ID | Path Cluster / Surface | Representative Ownership Areas | Done When |
| --- | --- | --- | --- |
| `M-001` | `app.vue`, `pages/index.vue`, `components/app/**`, `layouts/**`, `components/AppLeftPanel.vue`, `components/layout/**` | app root, landing/redirect shell, navigation, root notices | all product-owned literals replaced; root gate wired; representative tests updated |
| `M-002` | `pages/settings.vue`, `components/settings/**` | settings shell + settings feature surfaces | all settings labels/help/notifications localized; Language section added; `ProviderAPIKeyManager` split into section shell + browser/form/runtime owners; tests updated |
| `M-003` | `pages/agents.vue`, `components/agents/**` | agent-management UI | all product-owned literals localized; no bypass imports; tests updated |
| `M-004` | `pages/agent-teams.vue`, `components/agentTeams/**` | team-management UI | all product-owned literals localized; no bypass imports; tests updated |
| `M-005` | `pages/applications/**`, `components/applications/**` | applications UI | all product-owned literals localized; no bypass imports; tests updated |
| `M-006` | `pages/skills.vue`, `components/skills/**` | skills UI | all product-owned literals localized; no bypass imports; tests updated |
| `M-007` | `pages/memory.vue`, `pages/media.vue`, `components/memory/**` | memory/media UI | all product-owned literals localized; no bypass imports; tests updated |
| `M-008` | `pages/workspace.vue`, `components/workspace/**`, `components/conversation/**`, `components/progress/**`, `components/tabs/**` | workspace, running, history, config, team, progress, conversation product UI | all product-owned literals localized; no bypass imports; tests updated |
| `M-009` | `pages/tools.vue`, `components/tools/**`, `components/sync/**`, `components/fileExplorer/**` | tools/MCP/sync/file explorer UI | all product-owned literals localized; no bypass imports; tests updated |
| `M-010` | `components/common/**`, `components/ui/**`, shared modals/panels, route-level empty/loading/error states | shared UI building blocks and debug/error panels | all product-owned literals localized; no bypass imports; tests updated |
| `M-011` | `components/agentInput/**` | agent/team input forms, grouped selectors, draft-entry product copy | all product-owned literals localized; no bypass imports; tests updated |
| `M-012` | `components/server/**` | server startup/shutdown/status/log UI surfaces | all product-owned literals localized; no bypass imports; tests updated |
| `M-013` | `stores/**`, `composables/**`, `services/**` user-facing feedback emitters | toast/error/loading/empty-state message producers and service-like UI feedback | all product-owned emitted strings localized; no bypass imports; tests updated |

### Known In-Scope Path Cluster Assignment Check

This check exists so the matrix remains truly authoritative for current repo reality.

| Known Current Path Cluster | Assigned Matrix Row |
| --- | --- |
| `app.vue` | `M-001` |
| `pages/index.vue` | `M-001` |
| `layouts/**` | `M-001` |
| `components/app/**` | `M-001` |
| `components/layout/**` + `components/AppLeftPanel.vue` | `M-001` |
| `pages/settings.vue` + `components/settings/**` | `M-002` |
| `components/settings/ProviderAPIKeyManager.vue` + `components/settings/providerApiKey/**` | `M-002` |
| `pages/agents.vue` + `components/agents/**` | `M-003` |
| `pages/agent-teams.vue` + `components/agentTeams/**` | `M-004` |
| `pages/applications/**` + `components/applications/**` | `M-005` |
| `pages/skills.vue` + `components/skills/**` | `M-006` |
| `pages/memory.vue`, `pages/media.vue`, `components/memory/**` | `M-007` |
| `pages/workspace.vue`, `components/workspace/**`, `components/conversation/**`, `components/progress/**`, `components/tabs/**` | `M-008` |
| `pages/tools.vue`, `components/tools/**`, `components/sync/**`, `components/fileExplorer/**` | `M-009` |
| `components/common/**`, `components/ui/**` | `M-010` |
| `components/agentInput/**` | `M-011` |
| `components/server/**` | `M-012` |
| `stores/**`, `composables/**`, `services/**` user-facing feedback emitters | `M-013` |

If a newly discovered in-scope user-facing path cluster is found during implementation, the matrix must be updated before that scope can be marked complete.

## Mandatory Enforcement / Audit Contract

1. Add `pnpm guard:localization-boundary`
   - implemented by `scripts/guard-localization-boundary.mjs`
   - **must fail** if any file outside allowed localization boundaries:
     - imports from `localization/messages/**`
     - imports raw `vue-i18n` consumer APIs
     - calls `navigator.language`, `navigator.languages`, or `window.electronAPI.getAppLocale()` directly

2. Add `pnpm audit:localization-literals`
   - implemented by `scripts/audit-localization-literals.mjs`
   - reads `localization/audit/migrationScopes.ts`
   - scans each scope row for unresolved raw product-owned literals in user-facing contexts
   - emits an auditable report with `scope_id`, `file`, `finding`, and `status`

3. Closure rule
   - The change is **not complete** until:
     - every `M-*` row is marked closed
     - `pnpm guard:localization-boundary` passes
     - `pnpm audit:localization-literals` reports zero unresolved findings for in-scope areas

4. Delivery integration
   - `package.json` adds the new scripts
   - CI / implementation validation must run both commands
   - the boundary guard is a hard fail; the literal audit is also a hard closure requirement for this ticket

## Draft File Responsibility Mapping Addendum: Validation / Tests

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/__tests__/app.spec.ts` and/or new root-gate tests | validation | app-root localization gate validation | verify no wrong-locale first product paint | root-gate behavior should be tested close to app root | Yes |
| `autobyteus-web/localization/runtime/__tests__/*.spec.ts` | validation | runtime validation | resolver precedence, fallback, bootstrap state, preference persistence, catalog activation | runtime policy deserves focused tests | Yes |
| `autobyteus-web/pages/__tests__/settings.spec.ts` + `components/settings/__tests__/LanguageSettingsManager.spec.ts` | validation | settings validation | Language section render, options, persistence-triggered updates | settings behavior must be user-verifiable | Yes |
| `autobyteus-web/components/settings/__tests__/ProviderAPIKeyManager.spec.ts` + `components/settings/providerApiKey/__tests__/*.spec.ts` | validation | provider settings section validation | provider browser render, Gemini save path, generic provider key save path, localized notifications, and extracted child contracts | structural split must preserve round-8 behavior while making owners individually testable | Yes |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Shell navigation label | `label: t('shell.navigation.agents')` | `label: 'Agents` | shows copy ownership moving to localization runtime |
| Non-component toast | `addToast(localizationRuntime.translate('workspace.history.runDeleted'), 'success')` | `addToast('Run deleted permanently.', 'success')` | shows stores/composables using the same boundary |
| First localized paint gate | `app.vue -> AppLocalizationGate(bootstrapState==='ready') -> AppUpdateNotice/UiErrorPanel/ToastContainer/NuxtLayout` | `plugin initialize() fires asynchronously after app root renders English copy` | makes no-flash startup behavior explicit |
| System default resolution | `LocalizationRuntime -> SystemLocaleResolver -> getAppLocale() or navigator.languages -> normalize to en/zh-CN` | `component -> navigator.language -> if/else literals` | prevents boundary bypass and duplicated locale policy |
| Migration closure | `M-008 closed only after guard passes + literal audit zero unresolved + tests updated` | `workspace domain visually spot-checked and assumed complete` | large-scope rollout needs enforceable closure |
| Settings provider split | `ProviderAPIKeyManager shell -> ProviderModelBrowser + GeminiSetupForm/ProviderApiKeyEditor + useProviderApiKeySectionRuntime` | `one 600+ line settings SFC owns browser, forms, reloads, and notifications together` | makes the CR-003 structural cleanup explicit instead of implied |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep hard-coded English strings beside translation calls during steady state | tempting during broad migration | `Rejected` | migrate each scoped surface fully to translation keys before completion |
| Allow consumers to import locale dictionaries directly for convenience | easy for inline arrays | `Rejected` | consumers use `useLocalization()` / `LocalizationRuntime.translate()` only |
| Let feature code resolve system locale directly from browser/Electron APIs | seems simple for `System Default` | `Rejected` | centralize in `SystemLocaleResolver` behind runtime boundary |
| Allow migration closure by spot check without audit | tempting for broad scope | `Rejected` | require authoritative scope inventory + mandatory guard/audit closure |
| Add locale-prefixed routes now | common web i18n pattern | `Rejected` | this change is app-UI localization only, not route/SEO localization |

## Derived Layering (If Useful)

- `UI Consumer Layer`
  - pages, layouts, components, stores, composables that need product-owned copy
- `App Root Gate Layer`
  - `AppLocalizationGate` / `app.vue` readiness composition
- `Localization Boundary Layer`
  - `LocalizationRuntime`, `useLocalization()`, bootstrap plugin
- `Internal Localization Mechanisms`
  - catalog registry, catalog merge, preference storage, system locale resolver, underlying Vue i18n engine
- `Migration Enforcement Layer`
  - migration scope inventory, boundary guard, literal audit
- `Host Bridge Layer`
  - Electron locale IPC (`getAppLocale()`)

## Migration / Refactor Sequence

1. **Create the localization subsystem skeleton**
   - add runtime types, catalog registry, merge helper, preference storage, system locale resolver, and authoritative `LocalizationRuntime`
   - add English source catalog and Simplified Chinese override catalog roots

2. **Install bootstrap and root gate**
   - add `plugins/05.localization.client.ts`
   - add `composables/useLocalization.ts`
   - add `AppLocalizationGate` or equivalent `app.vue` root gate block
   - keep product-owned root surfaces behind `bootstrapState === 'ready'`

3. **Add host-locale resolution support**
   - extend Electron main/preload/type files with `getAppLocale()`
   - implement the exact precedence/mapping contract from the System Locale Resolution section

4. **Add migration enforcement artifacts early**
   - add `localization/audit/migrationScopes.ts`
   - add `scripts/guard-localization-boundary.mjs`
   - add `scripts/audit-localization-literals.mjs`
   - add `package.json` scripts so boundary/audit drift is blocked during migration rather than after it

5. **Add Settings language surface**
   - add `components/settings/LanguageSettingsManager.vue`
   - update `pages/settings.vue` to include the `Language` menu item/section and selector UI

6. **Decompose the touched provider settings owner before closing M-002**
   - keep `pages/settings.vue -> ProviderAPIKeyManager.vue` mount contract stable
   - extract `components/settings/providerApiKey/ProviderModelBrowser.vue`
   - extract `components/settings/providerApiKey/GeminiSetupForm.vue`
   - extract `components/settings/providerApiKey/ProviderApiKeyEditor.vue`
   - extract `components/settings/providerApiKey/useProviderApiKeySectionRuntime.ts`
   - move reload/save/notification orchestration behind the local runtime owner
   - keep `useLLMProviderConfigStore` as the backend-facing owner

7. **Migrate root + shell + settings first**
   - `app.vue`
   - `components/app/**`
   - `layouts/default.vue`
   - `components/AppLeftPanel.vue`
   - `components/layout/LeftSidebarStrip.vue`
   - settings shell labels and settings managers
   - close `M-001` and `M-002`

8. **Migrate non-component feedback producers early**
   - stores/composables/components emitting product-owned toasts/errors/loading text switch to runtime translation lookup
   - do not modify user-content payloads
   - close `M-013` as areas complete

9. **Migrate remaining product-owned feature UI by scope row**
   - close `M-003` through `M-013` one row at a time
   - each row must satisfy its done criteria before closure

10. **Add/refresh tests in parallel with each row**
   - runtime tests for preference persistence, system-default resolution, fallback, and live switching
   - root-gate tests for no wrong-locale first paint
   - settings UI tests for Language section
   - representative shell/feature tests for translated render and runtime switching

11. **Final closure**
   - every `M-*` row closed
   - `pnpm guard:localization-boundary` passing
   - `pnpm audit:localization-literals` zero unresolved
   - no temporary dual-path migration code remains

## Key Tradeoffs

- **Use one app-owned Localization Runtime over ad hoc per-feature translation helpers**
  - Pros: one authoritative boundary, works for components and non-components, cleaner future locale addition
  - Cons: introduces a new cross-cutting subsystem and migration effort

- **Use a hard root gate for first localized paint instead of optimistic plugin timing**
  - Pros: deterministic no-flash behavior, explicit ownership, testable
  - Cons: requires a boot placeholder state before product UI appears

- **Wrap one underlying Vue i18n engine instance rather than exposing it directly**
  - Pros: keeps framework details internal, preserves authoritative boundary, supports future formatting needs
  - Cons: slightly more wrapper code up front

- **Organize catalogs by product domain instead of one giant locale file**
  - Pros: maintainable for all-product UI scope, better reviewability
  - Cons: more files to manage

- **Use English as full source catalog and merge locale overrides over it**
  - Pros: deterministic fallback and easier future incremental locale rollout
  - Cons: requires careful catalog-shape discipline

- **Add mandatory guard + audit for migration closure**
  - Pros: makes large-scope rollout enforceable instead of subjective
  - Cons: requires script design and occasional audit tuning to avoid noisy findings

## Risks

- Full UI migration volume is large and may uncover inconsistent existing copy.
- Literal-audit heuristics may need tuning to avoid false positives, but the scope inventory and closure rule still need to remain authoritative.
- Some feature folders may still hide user-facing literals in inline arrays/config objects that are easy to miss.
- If feature code bypasses the runtime and imports raw resources, the boundary will erode quickly; this is why the guard is mandatory.
- The required ProviderAPIKeyManager split must preserve the already-passing round-8 behavior while reducing file/owner size pressure; regression risk is structural, not behavioral.
- System-locale semantics differ slightly between Electron host locale and browser locale; the explicit contract above must remain the single authority.

## Guidance For Implementation

- Keep `LocalizationRuntime` as the single public localization owner.
- Use the app-root gate to guarantee first localized product paint.
- Do not let feature code import locale files or raw framework-localization APIs directly.
- Add the `Language` section in `Settings`; default it to `System Default`.
- Follow the explicit locale precedence/mapping contract; do not improvise consumer-level locale handling.
- For the settings `api-keys` section, keep `ProviderAPIKeyManager.vue` thin and push reload/save/notification workflow into `useProviderApiKeySectionRuntime.ts`; keep browser and forms in dedicated child owners.
- Prefer translation keys grouped by domain (`shell`, `settings`, `workspace`, etc.), not generic keys.
- Migrate product-owned copy only; do not touch user-authored/model-generated content.
- Close migration by matrix row, not by vague “mostly done” judgment.
- Finish each migrated surface cleanly; do not leave permanent dual-path literal/translation behavior.
- Validate four core flows early:
  1. first boot with `System Default` resolving to English
  2. first boot with `System Default` resolving to Simplified Chinese
  3. switch to Simplified Chinese at runtime
  4. restart and confirm persisted manual override
