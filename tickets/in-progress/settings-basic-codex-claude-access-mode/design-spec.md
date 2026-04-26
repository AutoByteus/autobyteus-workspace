# Design Spec

## Current-State Read

Server Settings currently has two visible surfaces in `autobyteus-web/components/settings/ServerSettingsManager.vue`:

- Basics: friendly cards for endpoint quick setup, Applications, Web Search, and Compaction.
- Advanced: raw key/value table backed by `serverSettingsStore.fetchServerSettings()` and `ServerSettingsService.getAvailableSettings()`.

`CODEX_APP_SERVER_SANDBOX` is a real Codex runtime setting, but it is not registered in `ServerSettingsService`. When present in config data, it is therefore returned with `Custom user-defined setting`, editable/deletable custom metadata, and no value validation. That is why the user sees a low-level key in Advanced Settings instead of a guided Basic control.

The Codex runtime already consumes the setting in `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts` through `normalizeSandboxMode()`. Valid values are `read-only`, `workspace-write`, and `danger-full-access`; the current default is `workspace-write`. The history/resume path also relies on `normalizeSandboxMode()`, and `CodexThreadManager` passes the resolved sandbox into `thread/start` and `thread/resume` requests.

The main fragmentation problem is that Codex sandbox semantics are local constants inside the runtime bootstrapper while server settings metadata has no predefined descriptor/validator for the same key. A UI-only fix would improve discoverability but still allow invalid values through Advanced Settings. A server-only fix would improve metadata but not solve the end-user discoverability problem. The target must align both without introducing a parallel persistence path.

Claude remains out of scope by user decision. Current Claude code maps `autoExecuteTools` to permission mode, and upstream Claude permission/sandbox concepts are not equivalent to Codex sandbox mode.

## Intended Change

Add a Codex-only Basic Settings card for `Codex Sandbox Mode` that:

1. Displays the three supported Codex sandbox modes with friendly labels and descriptions.
2. Initializes from the server settings store's valid persisted/effective value, or `workspace-write` when absent/invalid.
3. Saves the canonical value through `serverSettingsStore.updateServerSetting('CODEX_APP_SERVER_SANDBOX', value)`.
4. Communicates that changes apply to new/future Codex sessions.

On the server side:

1. Extract Codex sandbox key/default/valid-value normalization into a reusable Codex runtime-management owned file.
2. Make Codex runtime bootstrap/history resolution consume that shared owner instead of maintaining private duplicate constants.
3. Register `CODEX_APP_SERVER_SANDBOX` as a predefined editable, non-deletable server setting with Codex-specific description and value validation.
4. Keep custom settings behavior unchanged for unrelated keys.

No Claude selector, Claude resolver change, or Claude sandbox setting is part of this design.

## Terminology

- `Subsystem` / `capability area`: a larger functional area that owns a broader category of work and may contain multiple files plus optional module groupings.
- `Module`: an optional intermediate grouping inside a subsystem when the codebase benefits from it. Do not use `module` as a synonym for one file or as the default ownership term.
- `Folder` / `directory`: a physical grouping used to organize files and any optional module groupings.
- `File`: one concrete source file and the primary unit where one concrete concern should land.
- `Codex sandbox mode`: the canonical Codex runtime filesystem sandbox setting sent to the Codex app server; values are `read-only`, `workspace-write`, and `danger-full-access`.
- `Auto-approve Tools`: existing app-level tool approval shortcut. It maps to Codex approval policy but is not sandbox mode.

## Design Reading Order

Read and write this design from abstract to concrete:

1. data-flow spine
2. subsystem / capability-area allocation
3. draft file responsibilities -> extract reusable owned structures -> finalize file responsibilities
4. folder/path mapping

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove/decommission duplicated Codex sandbox constants from the bootstrapper once the shared Codex sandbox setting owner exists.
- No compatibility wrapper, alias path, or parallel setting key is introduced. The only supported key remains `CODEX_APP_SERVER_SANDBOX` and the Basic UI saves canonical values only.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | User opens Server Settings -> Basics | Codex Sandbox Mode card renders selected canonical mode | `ServerSettingsManager` page composition plus `CodexSandboxModeCard` presentation owner | Solves the discoverability problem in the Basic area. |
| DS-002 | Primary End-to-End | User saves Codex sandbox mode in Basics | `AppConfig` persists/updates `process.env.CODEX_APP_SERVER_SANDBOX` | `ServerSettingsService` validation/persistence boundary | Ensures friendly UI uses the existing authoritative settings write path. |
| DS-003 | Primary End-to-End | New/resumed Codex runtime session bootstraps | Codex app server receives resolved `sandbox` value | Codex runtime bootstrap/history owners using shared Codex sandbox setting owner | Ensures saved mode affects future Codex sessions. |
| DS-004 | Return-Event | Server settings query returns settings | Advanced table shows predefined Codex metadata instead of custom metadata | `ServerSettingsService.getAvailableSettings()` | Ensures raw Advanced view no longer mislabels the Codex setting. |

## Primary Execution Spine(s)

- DS-001: `User -> ServerSettingsManager Basics -> serverSettingsStore settings state -> CodexSandboxModeCard -> rendered Codex mode options`
- DS-002: `User -> CodexSandboxModeCard -> serverSettingsStore.updateServerSetting -> GraphQL updateServerSetting -> ServerSettingsService.updateSetting -> AppConfig.set`
- DS-003: `Codex run create/restore -> CodexThreadBootstrapper or CodexThreadHistoryReader -> Codex sandbox setting resolver -> CodexThreadConfig.sandbox / resume request -> CodexThreadManager -> Codex app server`
- DS-004: `serverSettingsStore.fetchServerSettings -> GraphQL getServerSettings -> ServerSettingsService.getAvailableSettings -> predefined Codex setting metadata -> Advanced raw table`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The settings page loads server settings through the existing store. The new Codex card reads the current `CODEX_APP_SERVER_SANDBOX` setting from the store and presents a user-friendly selector in Basics. | Settings page, settings store state, Codex card | `ServerSettingsManager` for page composition; `CodexSandboxModeCard` for local presentation state | Localization/copy, option labels, dirty-state protection |
| DS-002 | When the user saves a selected mode, the card sends the canonical value to the existing server settings store. GraphQL delegates to `ServerSettingsService`, which validates the predefined key and persists through `AppConfig`. | Codex card, settings store, GraphQL resolver, server settings service, app config | `ServerSettingsService` for validation and write authority | Notification/error display, canonical value normalization |
| DS-003 | Future Codex bootstraps resolve sandbox mode from the same shared Codex sandbox setting owner. The resolved value enters `CodexThreadConfig` and is sent to the Codex app server. | Codex bootstrap/history, Codex sandbox setting owner, Codex thread config, Codex thread manager | Codex runtime bootstrap/history path, with shared setting owner for valid values/default | Invalid env fallback warning, existing approval-policy mapping remains separate |
| DS-004 | Advanced Settings asks for all settings. Because the Codex key is predefined, `ServerSettingsService` returns a Codex-specific description and non-deletable metadata instead of custom metadata. | Settings store, server settings service, Advanced table | `ServerSettingsService.getAvailableSettings()` | Sorting, hiding API keys, preserving custom rows |

## Spine Actors / Main-Line Nodes

- User-facing Settings page (`ServerSettingsManager.vue`)
- Codex Sandbox Mode card (`CodexSandboxModeCard.vue`)
- Frontend server settings store (`serverSettingsStore`)
- GraphQL server settings query/mutation boundary
- `ServerSettingsService`
- `AppConfig`
- Codex sandbox setting owner (new shared server-side file)
- Codex bootstrap/history readers
- Codex thread config/manager
- Codex app server

## Ownership Map

- `ServerSettingsManager.vue` owns page layout/composition and places the new card in Basics. It must not own Codex sandbox mode semantics.
- `CodexSandboxModeCard.vue` owns user-facing presentation, local selected value, dirty-state behavior, and save action dispatch. It must not persist outside `serverSettingsStore`.
- `serverSettingsStore` owns frontend settings fetch/update/reload state. It is the only frontend write path.
- GraphQL resolver is a thin transport boundary over the server settings service.
- `ServerSettingsService` owns predefined setting metadata, edit/delete policy, and value validation before persistence.
- `AppConfig` owns process/config/.env persistence effects.
- The new Codex sandbox setting file owns Codex sandbox key/default/valid-mode semantics and pure normalization/type guards.
- Codex bootstrap/history owners own when runtime sessions resolve sandbox mode. They consume the shared setting owner but do not redefine values.
- `CodexThreadConfig` owns the typed runtime config shape passed downstream.
- `CodexThreadManager` owns Codex app-server request adaptation and should only forward `config.sandbox`.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| GraphQL `getServerSettings` / `updateServerSetting` | `ServerSettingsService` | Transport boundary for web client | Validation semantics or Codex-specific value lists |
| `serverSettingsStore.updateServerSetting` | GraphQL mutation + `ServerSettingsService` | Frontend state/action wrapper | Alternative persistence, env mutation, backend validation |
| `normalizeSandboxMode()` export in Codex bootstrapper, if retained | New Codex sandbox setting owner | Preserve existing imports such as history reader during cleanup | Private duplicate default/valid-value list |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Local `DEFAULT_SANDBOX_MODE` constant in `codex-thread-bootstrapper.ts` | Duplicates shared setting default | New Codex sandbox setting file | In This Change | Bootstrapper should import default/normalizer. |
| Local `VALID_SANDBOX_MODES` set in `codex-thread-bootstrapper.ts` | Duplicates server validation list | New Codex sandbox setting file | In This Change | Avoid UI/server/runtime drift. |
| Any implicit custom-row treatment for `CODEX_APP_SERVER_SANDBOX` | Mislabels a known runtime setting | `ServerSettingsService` predefined descriptor | In This Change | Advanced table will naturally change through metadata. |
| Claude Basic Settings work from earlier exploratory idea | User explicitly deferred Claude | Separate future requirements/design if needed | In This Change | Do not add hidden Claude stubs. |

## Return Or Event Spine(s) (If Applicable)

- DS-004 is the relevant return spine: `ServerSettingsService.getAvailableSettings -> GraphQL result -> serverSettingsStore.settings -> Advanced table / Codex card reactive sync`.
- The Codex card should sync from returned settings only when local value is not dirty, mirroring the existing quick-card/compaction behavior so refreshes do not clobber unsaved user edits.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `CodexSandboxModeCard.vue`
  - Chain: `store.settings change -> derive valid current mode/default -> if not dirty, update selected/original -> render mode state`
  - Why it matters: settings reloads happen after saves and node binding changes; unsaved local edits should not be overwritten unexpectedly.
- Parent owner: `ServerSettingsService.updateSetting`
  - Chain: `lookup predefined descriptor -> normalize/validate value -> reject or AppConfig.set -> return mutation result`
  - Why it matters: invalid predefined values must be blocked at the authoritative server boundary even if Advanced Settings or another client sends them.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Localization/copy | DS-001, DS-002 | Codex card | User-facing labels, warnings, new-session copy | Keeps presentation text out of runtime/server owners | Runtime files become mixed with UI copy |
| Invalid-value fallback logging | DS-003 | Codex runtime bootstrap/history | Warn when env/config value is invalid and fallback is used | Maintains current runtime observability | Server settings service becomes responsible for runtime logging context |
| Advanced custom setting preservation | DS-004 | Server settings service | Keep unrelated unknown keys editable/deletable custom rows | Prevents regression outside Codex key | Generic custom behavior gets overfit to Codex |
| Frontend dirty-state handling | DS-001, DS-002 | Codex card | Avoid overwriting unsaved selection on store refresh | Matches existing quick settings UX | Page-level manager accumulates per-card state |
| Tests | all | Implementation/review | Lock backend validation, frontend card behavior, and page integration | Prevents UI-only or server-only partial fix | Tests become broad E2E-only and miss ownership boundaries |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Friendly Basic settings card | `autobyteus-web/components/settings` | Extend | Existing card patterns and tests live here. | N/A |
| Frontend settings persistence | `autobyteus-web/stores/serverSettings.ts` | Reuse | Already fetches, updates, and reloads server settings. | N/A |
| Server setting metadata/validation | `ServerSettingsService` | Extend | This is the current owner for predefined/custom setting metadata and edit/delete policy. | N/A |
| Codex sandbox semantics | `runtime-management/codex` + Codex backend | Create small shared Codex setting file under runtime-management/codex | Need a reusable owner not trapped inside bootstrapper and not owned by generic settings service. | Existing bootstrapper-local constants are too narrow; generic settings service is too broad for Codex runtime semantics. |
| Runtime bootstrap consumption | Codex backend bootstrap/history | Extend | Existing flows already resolve sandbox at create/resume time. | N/A |
| Localization | `autobyteus-web/localization/messages` | Extend | Existing localized card pattern uses message catalogs. | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Web Settings UI | Basic card layout, Codex card component, card tests | DS-001, DS-002 | `ServerSettingsManager`, `CodexSandboxModeCard` | Extend | Keep card self-contained. |
| Web Settings Store | Existing fetch/update/reload action | DS-001, DS-002, DS-004 | `serverSettingsStore` | Reuse | No new store needed. |
| Server Settings Service | Predefined descriptor, validation, custom-row preservation | DS-002, DS-004 | `ServerSettingsService` | Extend | Add validation capability for predefined keys. |
| Config Persistence | `AppConfig.set` process/.env persistence | DS-002 | `AppConfig` | Reuse | No direct frontend use. |
| Codex Runtime Management | Shared Codex sandbox key/type/default/normalizer | DS-002, DS-003, DS-004 | Codex runtime and server settings service | Create small file | Prevent duplicate accepted-value lists. |
| Codex Execution Backend | Session create/restore sandbox resolution | DS-003 | `CodexThreadBootstrapper`, `CodexThreadHistoryReader` | Extend | Consume shared normalizer. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/runtime-management/codex/codex-sandbox-mode-setting.ts` | Codex Runtime Management | Codex sandbox setting owner | Key, default, valid values, type guard, pure normalizer | One cohesive Codex-specific setting semantics file | N/A |
| `autobyteus-server-ts/src/services/server-settings-service.ts` | Server Settings Service | Settings metadata/validation owner | Register Codex setting and validate predefined allowed values | Existing owner for predefined/custom settings | Yes, Codex setting constants |
| `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts` | Codex Execution Backend | Bootstrap owner | Resolve env sandbox using shared normalizer; remove duplicate constants | Existing runtime bootstrap point | Yes, Codex setting normalizer |
| `autobyteus-server-ts/src/agent-execution/backends/codex/history/codex-thread-history-reader.ts` | Codex Execution Backend | History resume owner | Continue using bootstrapper wrapper or import shared resolver directly | Existing resume path | Yes |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-config.ts` | Codex Execution Backend | Thread config type owner | Use imported `CodexSandboxMode` type if type moves | Existing config shape owner | Yes |
| `autobyteus-web/components/settings/CodexSandboxModeCard.vue` | Web Settings UI | Card presentation owner | Render options, sync selected value, save canonical value, show new-session copy | One card = one friendly setting block | Frontend option constants mirror backend canonical values but backend validates |
| `autobyteus-web/components/settings/ServerSettingsManager.vue` | Web Settings UI | Page composition owner | Import/render card in Basics grid | Existing page composition point | N/A |
| `autobyteus-web/localization/messages/en/settings.ts` and `zh-CN/settings.ts` (+ generated catalogs if required) | Localization | Message catalog owner | Card title, descriptions, option labels/warnings | Existing localized settings-copy home | N/A |
| `autobyteus-server-ts/tests/unit/services/server-settings-service.test.js` | Backend tests | Service test suite | Assert predefined metadata and validation | Existing service tests | Yes |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/...` or existing suitable Codex tests | Backend tests | Runtime normalization tests | Assert shared normalizer/default/fallback behavior | Keeps runtime behavior locked | Yes |
| `autobyteus-web/components/settings/__tests__/CodexSandboxModeCard.spec.ts` | Frontend tests | Card test suite | Assert rendering, defaults, dirty sync, save value | Focused component behavior | N/A |
| `autobyteus-web/components/settings/__tests__/ServerSettingsManager.spec.ts` | Frontend tests | Page integration test | Assert Codex card renders in Basics | Existing page suite | N/A |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Codex sandbox setting key/default/valid modes/type guard/normalizer | `autobyteus-server-ts/src/runtime-management/codex/codex-sandbox-mode-setting.ts` | Codex Runtime Management | Needed by runtime normalization and server settings validation | Yes | Yes | Generic multi-runtime access-mode abstraction that accidentally includes Claude |
| Frontend option labels/descriptions | Keep local to `CodexSandboxModeCard.vue` plus localization catalogs | Web Settings UI | Labels are presentation copy, not runtime authority | Yes | Yes | Backend validation source or separate duplicated runtime owner |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `CodexSandboxMode` | Yes | Yes | Low after extraction | Define from readonly mode list or export one type source; import wherever needed. |
| `CODEX_APP_SERVER_SANDBOX_SETTING_KEY` | Yes | Yes | Low | Use in server settings service and runtime resolver; avoid raw repeated key strings except tests. |
| `ServerSettingDescription` validation fields | Yes if limited to predefined-value normalization/validation | Yes | Medium | Add narrowly-scoped allowed-values/normalization support; do not turn service into runtime config owner. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/runtime-management/codex/codex-sandbox-mode-setting.ts` | Codex Runtime Management | Codex sandbox setting owner | Export `CODEX_APP_SERVER_SANDBOX_SETTING_KEY`, `CODEX_SANDBOX_MODES`, `DEFAULT_CODEX_SANDBOX_MODE`, `CodexSandboxMode`, `isCodexSandboxMode`, and pure normalization helper | Cohesive Codex-specific runtime setting semantics | N/A |
| `autobyteus-server-ts/src/services/server-settings-service.ts` | Server Settings Service | Settings metadata/validation owner | Register Codex setting with description and allowed-values validation; reject invalid predefined values before `AppConfig.set`; keep custom behavior unchanged | Existing authoritative settings metadata/persistence boundary | Yes |
| `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts` | Codex Execution Backend | Bootstrap owner | Read env key, delegate mode normalization to shared owner, keep/adjust exported `normalizeSandboxMode()` for current imports, log invalid fallback | Existing create path and exported helper | Yes |
| `autobyteus-server-ts/src/agent-execution/backends/codex/history/codex-thread-history-reader.ts` | Codex Execution Backend | History resume owner | Continue using normalized Codex sandbox value for resume | Existing restore path | Yes |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-config.ts` | Codex Execution Backend | Thread config owner | Import/use shared `CodexSandboxMode` type if moved | Maintains runtime config shape | Yes |
| `autobyteus-web/components/settings/CodexSandboxModeCard.vue` | Web Settings UI | Card presentation owner | User-friendly Codex mode selector/card, dirty-state sync, save action, future-session copy | One card owns one Basic block | Backend validation via store/API |
| `autobyteus-web/components/settings/ServerSettingsManager.vue` | Web Settings UI | Page composition owner | Import/render `CodexSandboxModeCard` in the second Basics grid near existing runtime/config cards | Keeps page composition centralized | N/A |
| `autobyteus-web/localization/messages/en/settings.ts`, `autobyteus-web/localization/messages/zh-CN/settings.ts`, generated settings catalogs if required by repo workflow | Localization | Settings message catalogs | Add card/option copy | Existing catalog ownership | N/A |
| Tests listed in Draft Mapping | Validation | Test suites | Cover backend validation/runtime normalization/frontend card/page integration | Existing test ownership | Yes where relevant |

## Ownership Boundaries

- Frontend card boundary: may present labels and choose canonical values, but backend validation remains authoritative. The card cannot assume a save succeeded until `serverSettingsStore.updateServerSetting` resolves.
- Store/GraphQL boundary: transports settings updates. It must not special-case Codex sandbox mode beyond normal update behavior.
- Server settings boundary: the only place that decides whether `CODEX_APP_SERVER_SANDBOX` is editable/deletable and whether a submitted value is allowed.
- Codex sandbox setting owner boundary: the only server-side source for Codex sandbox key/default/valid values/type guard. Both `ServerSettingsService` and Codex runtime consume it.
- Codex runtime boundary: decides when to resolve mode for a session and how to pass it to Codex app server; it must not own UI copy or server settings metadata.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `serverSettingsStore` | GraphQL settings mutation/query | Vue settings cards/pages | Card writes directly to GraphQL client or local env | Add store helper only if repeated frontend behavior appears. |
| `ServerSettingsService` | Descriptor lookup, predefined validation, `AppConfig.set` | GraphQL resolver | Resolver or frontend validates/persists Codex setting separately | Extend service descriptor validation. |
| Codex sandbox setting file | Key/default/mode list/type guard/normalizer | `ServerSettingsService`, Codex bootstrap/history/config | Separate hardcoded mode lists in service and bootstrapper | Add missing exported helper/type to shared file. |
| Codex bootstrap/history | Runtime timing and fallback warning | Codex run orchestration | Settings service triggering runtime updates directly | Keep setting as future-session bootstrap input. |

## Dependency Rules

- `CodexSandboxModeCard.vue` may depend on `serverSettingsStore` and localization; it must not depend on GraphQL documents, `AppConfig`, or runtime files.
- `ServerSettingsManager.vue` may import the Codex card for page layout; it must not duplicate card local state.
- `ServerSettingsService` may import Codex sandbox setting constants/validators from the shared Codex runtime-management file; it must not import Codex bootstrapper internals.
- Codex bootstrap/history may import the shared Codex sandbox setting owner; they must not duplicate valid values/defaults.
- `CodexThreadManager` should continue consuming `CodexThreadConfig.sandbox`; it should not read env/settings directly.
- Claude files must not be changed for this ticket except if a mechanical type import is unavoidable (not expected).

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `serverSettingsStore.updateServerSetting(key, value)` | Frontend settings update | Send one setting update and refresh store | `key: string`, `value: string` | Codex card passes canonical key/value. |
| GraphQL `updateServerSetting` | Server settings mutation transport | Delegate update to service | Setting key/value strings | Thin boundary only. |
| `ServerSettingsService.updateSetting(key, value)` | Server-side setting update | Validate predefined values and persist | Setting key string; raw submitted value string | Must reject invalid Codex sandbox value before `AppConfig.set`. |
| `ServerSettingsService.getAvailableSettings()` | Server-side setting list | Return setting value/description/edit/delete metadata | No caller-supplied identity | Must return predefined metadata for Codex key when present/effective. |
| `normalizeCodexSandboxMode(rawValue)` or equivalent | Codex sandbox semantic normalization | Return a valid `CodexSandboxMode` from raw config/env input | `string | null | undefined` | Pure; logging can remain in bootstrapper wrapper. |
| `buildCodexThreadConfig({ sandbox })` | Codex thread config | Carry resolved sandbox to thread manager | `CodexSandboxMode` | Should use shared type. |

Rule:
- Do not use one generic boundary when the subject or identity meaning differs.
- Split boundaries by subject or require an explicit compound identity shape.

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `serverSettingsStore.updateServerSetting` | Yes | Yes | Low | Reuse as-is. |
| `ServerSettingsService.updateSetting` | Yes | Yes | Medium currently because all predefined/custom values are accepted | Add descriptor-based validation for predefined Codex key. |
| Codex sandbox normalizer | Yes | Yes | Low | Keep Codex-specific; do not generalize to Claude. |
| `CodexSandboxModeCard` save action | Yes | Yes | Low | Only sends `CODEX_APP_SERVER_SANDBOX`. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Basic UI card | `CodexSandboxModeCard` | Yes | Low | Avoid vague `AccessModeCard` because Claude is out of scope. |
| Shared server-side semantics file | `codex-sandbox-mode-setting.ts` | Yes | Low | Name Codex-specific; avoid generic multi-runtime access-mode naming. |
| Setting key constant | `CODEX_APP_SERVER_SANDBOX_SETTING_KEY` | Yes | Low | Use in service/runtime. |
| Mode type | `CodexSandboxMode` | Yes | Low | Single source imported by thread config. |

## Applied Patterns (If Any)

- Existing settings-card pattern from `CompactionConfigCard.vue`: local typed/friendly state, sync from `serverSettingsStore`, save canonical values through `store.updateServerSetting`, and keep persistence in the existing store/service path.
- Existing server settings metadata pattern from `ServerSettingsService`: predefined settings are registered centrally and unknown keys remain custom.
- Existing Codex runtime bootstrap pattern: resolve env-backed runtime options at session/thread bootstrap so changes apply to new/future runs.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/runtime-management/codex/codex-sandbox-mode-setting.ts` | File | Codex sandbox setting owner | Shared Codex sandbox key/default/modes/type guard/normalizer | Runtime-management/codex is the existing shared Codex runtime capability area outside one bootstrapper file | UI labels, Claude permissions, GraphQL logic |
| `autobyteus-server-ts/src/services/server-settings-service.ts` | File | Server settings service | Descriptor validation and Codex predefined registration | Existing owner of settings metadata/update/delete | Runtime bootstrap sequencing, UI copy |
| `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts` | File | Codex create bootstrap | Consume shared normalizer and remove duplicate constants | Existing create-session runtime owner | Server settings metadata |
| `autobyteus-server-ts/src/agent-execution/backends/codex/history/codex-thread-history-reader.ts` | File | Codex resume/history | Keep sandbox normalization in resume path | Existing resume-session runtime owner | Setting validation/persistence |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-config.ts` | File | Codex config type | Use shared `CodexSandboxMode` type | Existing config data contract | Env reads |
| `autobyteus-web/components/settings/CodexSandboxModeCard.vue` | File | Web settings card | Render/select/save Codex mode | Existing settings component folder | Claude selector, direct API/env writes |
| `autobyteus-web/components/settings/ServerSettingsManager.vue` | File | Settings page composition | Place Codex card in Basics | Existing page component | Codex mode validation lists beyond child import/render |
| `autobyteus-web/localization/messages/en/settings.ts` and `zh-CN/settings.ts` plus generated settings catalogs if required | Files | Localization | User-facing card copy | Existing settings message catalogs | Runtime/server constants |
| `autobyteus-web/components/settings/__tests__/CodexSandboxModeCard.spec.ts` | File | Frontend component tests | Card sync/save/render behavior | Existing test folder | Backend validation tests |
| `autobyteus-server-ts/tests/unit/services/server-settings-service.test.js` | File | Backend service tests | Predefined metadata/value validation | Existing service test suite | Frontend rendering tests |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `autobyteus-web/components/settings` | Main-Line UI composition/presentation | Yes | Low | Existing settings components live here. One new card is appropriate. |
| `autobyteus-web/stores` | Frontend state/persistence boundary | Yes | Low | Reused only; no new file needed. |
| `autobyteus-server-ts/src/services` | Server application service | Yes | Medium | Extend existing service carefully; keep Codex semantics imported from shared owner. |
| `autobyteus-server-ts/src/runtime-management/codex` | Runtime shared capability | Yes | Low | Existing shared Codex client/runtime area; new setting file prevents bootstrapper-local duplication. |
| `autobyteus-server-ts/src/agent-execution/backends/codex` | Runtime execution backend | Yes | Low | Consumes resolved setting at session create/resume. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Codex-only UI | `CodexSandboxModeCard` with options `Read only`, `Workspace write`, `Full access` | Generic `RuntimeAccessModeCard` containing a hidden/empty Claude section | Keeps approved scope clear and avoids misleading Claude semantics. |
| Shared mode owner | `CODEX_SANDBOX_MODES` imported by service and runtime normalizer | Separate `VALID_SANDBOX_MODES` in service and bootstrapper | Prevents drift between UI/server validation and runtime behavior. |
| Save path | Card -> `serverSettingsStore.updateServerSetting` -> GraphQL -> `ServerSettingsService` | Card writes directly to Apollo mutation or local env | Preserves existing authoritative boundary. |
| Future-session copy | “Applies to new Codex sessions.” | “Changes current Codex permissions immediately.” | Avoids false runtime expectation. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Accepting arbitrary `CODEX_APP_SERVER_SANDBOX` values as before | Advanced Settings currently accepts any custom key/value | Rejected | Once predefined, reject invalid values and persist only valid canonical modes. |
| Supporting Basic UI aliases such as `full access` or `danger_full_access` | Could make manual input forgiving | Rejected | Basic UI is a selector saving canonical values; no text input aliases. |
| Keeping duplicate bootstrapper constants for compatibility | Minimizes edits | Rejected | Move/import shared constants so service and runtime use one value list. |
| Adding Claude selector now but disabling or hiding it behind unclear copy | Initial user wondered about Claude parity | Rejected | User approved Codex-only scope; Claude requires separate requirements/design. |
| Legacy setting key migration | Not needed because key remains `CODEX_APP_SERVER_SANDBOX` | N/A | Reuse same key. |

## Derived Layering (If Useful)

Layering is intentionally simple:

- Presentation: `CodexSandboxModeCard.vue` and localized copy.
- Frontend settings boundary: `serverSettingsStore`.
- Transport: GraphQL settings resolver/mutation.
- Server settings authority: `ServerSettingsService` with descriptor validation.
- Persistence/environment: `AppConfig`.
- Codex runtime semantics: `runtime-management/codex/codex-sandbox-mode-setting.ts`.
- Codex execution: bootstrap/history resolves and thread manager forwards sandbox.

The critical rule is that runtime semantics are not owned by the UI, and persistence is not owned by runtime bootstrap.

## Migration / Refactor Sequence

1. Add the shared Codex sandbox setting owner under `autobyteus-server-ts/src/runtime-management/codex/` with key/default/modes/type guard/normalizer.
2. Update `CodexThreadConfig` and Codex bootstrap/history imports so Codex runtime consumes the shared type/normalizer and bootstrapper-local duplicate constants are removed.
3. Extend `ServerSettingDescription`/`ServerSettingsService` with narrowly scoped predefined value validation and register `CODEX_APP_SERVER_SANDBOX` using the shared key/modes.
4. Add backend tests for valid/invalid Codex setting values and predefined metadata.
5. Add `CodexSandboxModeCard.vue` with localized user-facing option copy, dirty-state sync, default behavior, and save through `serverSettingsStore.updateServerSetting`.
6. Render the card from `ServerSettingsManager.vue` in the Basics area.
7. Add frontend component and manager integration tests.
8. Run targeted backend/frontend tests; then let downstream validation decide broader E2E coverage and docs updates.

No temporary dual path should remain after step 2; the old bootstrapper-local constants are removed or replaced by imported shared constants.

## Key Tradeoffs

- Selector vs toggle: a selector is chosen because Codex has three valid modes, and a binary toggle would hide `read-only` or require unclear mapping.
- Shared Codex-specific setting file vs generic access-mode abstraction: Codex-specific is chosen because Claude semantics are different and explicitly out of scope.
- Backend validation vs UI-only guard: backend validation is required because Advanced Settings and future clients can still submit raw setting values.
- Local card state vs page-level state: card state is chosen to avoid further bloating `ServerSettingsManager.vue` and to match specialized-card patterns.

## Risks

- Product copy for `danger-full-access` could be too soft; implementation should explicitly warn that it disables filesystem sandboxing.
- If invalid `CODEX_APP_SERVER_SANDBOX` already exists in `.env`, the card should show default `workspace-write` until a valid value is saved, while server/runtime fallback continues to protect Codex sessions.
- If localization generated files are expected to be regenerated rather than edited manually, implementation must follow the repository's localization workflow.
- If concurrent runtime refactors move Codex configuration ownership, implementation must preserve this design's single-source-of-truth requirement.

## Guidance For Implementation

- Keep the UI card Codex-specific. Do not include Claude copy, placeholders, disabled controls, or hidden feature flags.
- Use clear option copy. Suggested English labels:
  - `Read only` -> canonical `read-only`; “Codex can inspect files but cannot write to the workspace.”
  - `Workspace write` -> canonical `workspace-write`; “Codex can edit files inside the workspace. Recommended default.”
  - `Full access` -> canonical `danger-full-access`; “No filesystem sandboxing. Use only when you trust the task and environment.”
- Include a short note: “Applies to new Codex sessions.”
- Preserve current `autoExecuteTools` behavior and terminology. Do not couple it to this card.
- In `ServerSettingsService`, reject invalid values before calling `AppConfig.set`; error message should include the allowed canonical values.
- Prefer trimming submitted predefined values before validation/persistence for `CODEX_APP_SERVER_SANDBOX`. Do not alter custom setting value preservation globally unless tests are updated intentionally.
- Keep tests focused at the right boundaries: server validation in service tests, runtime normalizer/default in Codex tests, and UI sync/save behavior in component tests.
