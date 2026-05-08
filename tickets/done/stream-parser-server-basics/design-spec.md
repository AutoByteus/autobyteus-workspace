# Design Spec

## Current-State Read

Server Settings is organized around one settings persistence boundary, but the current UI composition file has grown beyond the code-review hard source-size gate.

Current functional flow:

- `pages/settings.vue` selects the `server-settings` section and passes `sectionMode="quick" | "advanced"` to `ServerSettingsManager`.
- `ServerSettingsManager.vue` currently owns too many concerns: global loading/error display, Basics endpoint cards, standalone Basics behavior-card composition, Web Search form state, Advanced raw table state, server status tab selection, and notification handling.
- `serverSettingsStore` owns frontend settings transport/cache/reload behavior. It waits for bound backend readiness, fetches `GET_SERVER_SETTINGS`, exposes `getSettingByKey`, updates via `UPDATE_SERVER_SETTING`, and reloads after successful updates.
- `ServerSettingsService` owns backend settings metadata, edit/delete permissions, value validation/normalization, and persistence through `AppConfig`.
- `AppConfig.set` writes both in-memory `process.env` and the `.env` file when available.
- `autobyteus-ts` owns runtime interpretation of `AUTOBYTEUS_STREAM_PARSER`. `resolveToolCallFormat()` supports the runtime value set and defaults to `api_tool_call` when unset/invalid.

Original feature gap:

- `AUTOBYTEUS_STREAM_PARSER` could be added manually in Advanced as a custom setting, but there was no Basics card and no backend predefined metadata/validation.

Design-impact re-entry gap from code review:

- Code review round 1 found that direct import/render edits leave `autobyteus-web/components/settings/ServerSettingsManager.vue` as a changed source implementation file with `886` effective non-empty lines, above the hard `500` line gate.
- The original no-refactor decision is therefore revised. The feature remains the same, but implementation must now split the Server Settings UI composition into focused files before returning to code review.

## Intended Change

Product behavior remains:

- Add a Server Settings → Basics card that presents the XML stream parser override as one boolean switch.
- Switch on: save `AUTOBYTEUS_STREAM_PARSER=xml`.
- Switch off: save `AUTOBYTEUS_STREAM_PARSER=api_tool_call` as the canonical default/non-XML provider-native mode.
- Only a trimmed, case-insensitive `xml` value displays as on.
- Absent, blank, invalid, `api_tool_call`, `json`, and `sentinel` display as off.
- Advanced remains the expert surface for valid runtime values.
- Register `AUTOBYTEUS_STREAM_PARSER` as a backend predefined setting with validation/normalization so the Advanced table shows typed metadata and rejects unsupported values.

Source-size-safe implementation change now required:

- Extract Basics composition and form logic out of `ServerSettingsManager.vue` before adding/rendering the Streaming parser card.
- Final changed source implementation files must each be at or below `500` effective non-empty lines.
- `ServerSettingsManager.vue` must no longer own Basics endpoint parsing, standalone Basics card-grid composition, or Web Search form logic.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Feature with required structural refactor
- Current design issue found (`Yes`/`No`/`Unclear`): Yes, after code-review re-entry
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): File Placement Or Responsibility Drift
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes
- Evidence: `ServerSettingsManager.vue` is a changed implementation file with `886` effective non-empty lines. The direct-card-addition design left the oversized composition owner in the changed source set and failed code review.
- Design response: Split Server Settings UI ownership. Keep `ServerSettingsManager.vue` as a shell/Advanced owner, create a focused Basics panel, and extract endpoint quick setup and Web Search form concerns into separate components. Add the streaming parser card inside the extracted Basics composition owner.
- Refactor rationale: The feature itself fits existing settings boundaries, but any implementation path that directly changes the current manager violates the source-size gate. Extracting Basics concerns is the smallest ownership-preserving refactor that removes the oversized-file blocker and improves separation of concerns.
- Intentional deferrals and residual risk, if any: A full Server Settings rewrite remains out of scope. If Basics extraction unexpectedly leaves `ServerSettingsManager.vue` above `500` effective non-empty lines, implementation must also extract `ServerSettingsAdvancedPanel.vue` before returning to code review.

## Terminology

- `Subsystem` / `capability area`: a larger functional area that owns a broader category of work and may contain multiple files plus optional module groupings.
- `Module`: an optional intermediate grouping inside a subsystem when the codebase benefits from it. Do not use `module` as a synonym for one file or as the default ownership term.
- `Folder` / `directory`: a physical grouping used to organize files and any optional module groupings.
- `File`: one concrete source file and the primary unit where one concrete concern should land.

## Design Reading Order

1. Settings load and shell routing spine.
2. Basics composition spine after extraction.
3. Toggle save spine.
4. Runtime consumption spine.
5. File-responsibility mapping and source-size constraints.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action for this re-entry: remove Basics ownership from the oversized `ServerSettingsManager.vue` file in this change. This is not compatibility cleanup; it is source-structure cleanup required by review.
- First-class metadata change: after implementation, `AUTOBYTEUS_STREAM_PARSER` must no longer be treated as an opaque custom setting when present. It should be predefined, editable, non-deletable, and validated.
- The Advanced raw table remains intentional current functionality, not a legacy path.
- The design does not add compatibility wrappers or dual persistence paths.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | User opens Server Settings | Manager shell routes to Basics or Advanced panel | `ServerSettingsManager` | Shows the reduced shell responsibility after source-size rework. |
| DS-002 | Primary End-to-End | Basics panel renders | Endpoint cards, standalone behavior cards, Web Search, Compaction, Streaming parser card are visible | `ServerSettingsBasicsPanel` | Shows where the new card belongs without overloading the manager. |
| DS-003 | Primary End-to-End | User toggles/saves XML parser option | `AUTOBYTEUS_STREAM_PARSER` is persisted and settings reload | `StreamingParserCard` + `serverSettingsStore` + `ServerSettingsService` | Main requested behavior. |
| DS-004 | Primary End-to-End | Future agent streaming handler is constructed | Runtime chooses XML parser or API tool-call mode | `autobyteus-ts` streaming runtime | Shows downstream runtime effect without changing runtime behavior. |
| DS-005 | Return-Event | Backend mutation result/reload | Card dirty/error state and Advanced table update | `serverSettingsStore` | Ensures UI consistency after save/failure. |
| DS-006 | Bounded Local | Endpoint quick setup edit cycle | Serialized endpoint setting values save through the shared store | `ServerSettingsEndpointCards` | Extracted local loop that previously lived inside the oversized manager. |
| DS-007 | Bounded Local | Web Search form edit/save cycle | Search config saves through `serverSettingsStore.setSearchConfig(...)` | `WebSearchConfigurationCard` | Extracted local form loop that previously lived inside the oversized manager. |

## Primary Execution Spine(s)

- DS-001: `Settings page -> ServerSettingsManager shell -> ServerSettingsBasicsPanel or Advanced table/server status`
- DS-002: `ServerSettingsBasicsPanel -> ServerSettingsEndpointCards + standalone cards + WebSearchConfigurationCard + CompactionConfigCard`
- DS-003: `StreamingParserCard switch/save -> serverSettingsStore.updateServerSetting -> GraphQL updateServerSetting -> ServerSettingsService.updateSetting -> AppConfig.set -> serverSettingsStore.reloadServerSettings`
- DS-004: `Future agent response setup -> StreamingResponseHandlerFactory -> resolveToolCallFormat -> parser/api-tool-call handler selection -> streamed tool-call behavior`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The Settings page mounts `ServerSettingsManager`, which handles shared loading/error state and delegates Basics mode to `ServerSettingsBasicsPanel` while keeping Advanced raw settings/status concerns in the shell or a later advanced panel if needed for size. | Settings page, ServerSettingsManager, Basics panel, Advanced table/status | `ServerSettingsManager` | Bound backend readiness, mode prop sync. |
| DS-002 | Basics composition moves to a dedicated panel. The panel lays out endpoint cards and standalone behavior cards, including the new Streaming parser card, without owning each card's internals. | ServerSettingsBasicsPanel, endpoint cards, standalone cards, Web Search card | `ServerSettingsBasicsPanel` | Basics notifications and layout classes. |
| DS-003 | The Streaming parser card keeps a local draft boolean. Save maps the boolean to `xml` or `api_tool_call`, calls the shared store mutation, backend validates and persists the value, and the store reloads raw settings so Basics and Advanced stay consistent. | StreamingParserCard, serverSettingsStore, GraphQL resolver, ServerSettingsService, AppConfig | `StreamingParserCard` for UI semantics; `ServerSettingsService` for backend authority | Value normalization, validation errors, dirty-state preservation. |
| DS-004 | Future runtime code reads `process.env.AUTOBYTEUS_STREAM_PARSER` through the existing tool-call format resolver. `xml` selects parser-backed XML streaming; `api_tool_call` selects provider-native API tool calls. | Agent runtime setup, StreamingResponseHandlerFactory, tool-call format resolver, streaming handler | `autobyteus-ts` streaming runtime | No in-place mutation of active streams. |
| DS-006 | Endpoint quick setup owns row parsing/serialization/validation for host/url settings, emits save notifications, and persists through the same settings store. | ServerSettingsEndpointCards, quick endpoint rows, serverSettingsStore | `ServerSettingsEndpointCards` | Port validation, unsaved edit preservation. |
| DS-007 | Web Search configuration owns provider selection, credential/id fields, validation, search-config fetch/save, and raw settings refresh through the store. | WebSearchConfigurationCard, search config form, serverSettingsStore | `WebSearchConfigurationCard` | Provider-specific validation and configured-key hints. |

## Spine Actors / Main-Line Nodes

- Settings page: navigation entry and mode selection.
- ServerSettingsManager: reduced shell/routing owner and Advanced owner unless Advanced is extracted for size.
- ServerSettingsBasicsPanel: Basics composition owner.
- ServerSettingsEndpointCards: endpoint quick setup owner.
- WebSearchConfigurationCard: web search form owner.
- StreamingParserCard: product-facing XML toggle owner.
- serverSettingsStore: frontend settings transport/cache owner.
- ServerSettings GraphQL resolver: transport entrypoint delegating to backend settings service.
- ServerSettingsService: backend metadata/validation/persistence owner.
- AppConfig: process/env-file persistence mechanism.
- StreamingResponseHandlerFactory / tool-call format resolver: runtime consumption owner.

## Ownership Map

- `ServerSettingsManager` owns mode routing, shared server-settings load/error state, and Advanced table/status concerns that remain after extraction. It must not own Basics endpoint parsing, Basics behavior-card composition, or Web Search form state.
- `ServerSettingsBasicsPanel` owns the Basics layout and composition order. It may own a Basics-level notification surface for child save events.
- `ServerSettingsEndpointCards` owns quick endpoint row state, parsing, serialization, validation, dirty state, and save behavior for endpoint host/url settings.
- `WebSearchConfigurationCard` owns search provider form state, validation, store synchronization, and save behavior.
- `StreamingParserCard` owns the boolean XML UX, local draft state, dirty state, and mapping between toggle and canonical string values.
- `serverSettingsStore` owns frontend query/mutation/reload behavior and should remain the only frontend settings transport dependency.
- `ServerSettingsService` owns whether `AUTOBYTEUS_STREAM_PARSER` is predefined, editable, deletable, valid, and normalized.
- `AppConfig` owns persistence side effects to `process.env` and `.env`.
- `autobyteus-ts` owns runtime parser selection and must not be bypassed by settings UI code.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `ServerSettingsManager` | Basics panel / Advanced table/status owners | Page-level shell and mode routing | Basics endpoint parsing, Web Search form state, or standalone card internals. |
| `ServerSettingsResolver.updateServerSetting` | `ServerSettingsService` | GraphQL transport entrypoint | Validation or persistence rules. |
| `serverSettingsStore.updateServerSetting` | Server Settings GraphQL boundary / `ServerSettingsService` | Frontend mutation wrapper with reload behavior | Runtime parser semantics or local persistence. |
| `StreamingParserCard` | `serverSettingsStore` / `ServerSettingsService` | Product-facing card for common XML toggle | Direct Apollo calls, `.env` writes, or parser strategy implementation. |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Basics endpoint quick setup ownership inside `ServerSettingsManager.vue` | Leaves a changed oversized manager and mixes local endpoint form loops into the shell. | `ServerSettingsEndpointCards.vue` | In This Change | Move parsing/serialization/validation/save logic and tests. |
| Basics standalone card-grid composition inside `ServerSettingsManager.vue` | Direct card additions make the oversized manager fail code review. | `ServerSettingsBasicsPanel.vue` | In This Change | New card is rendered here, not directly in the manager. |
| Web Search form ownership inside `ServerSettingsManager.vue` | Web Search form state/validation is a distinct card concern and contributes to manager size. | `WebSearchConfigurationCard.vue` | In This Change | Preserve current provider validation and save semantics. |
| Opaque custom treatment of `AUTOBYTEUS_STREAM_PARSER` when present | The setting becomes first-class and should have typed metadata/validation. | Predefined registration in `ServerSettingsService` plus stream parser setting helper. | In This Change | Do not remove the Advanced raw table. |
| Advanced table ownership inside `ServerSettingsManager.vue` | Only necessary if Basics extraction does not bring the manager below the hard limit. | `ServerSettingsAdvancedPanel.vue` | Conditional In This Change | Implementation must extract if final manager remains >500 effective non-empty lines. |

## Return Or Event Spine(s) (If Applicable)

- DS-005: `ServerSettingsService.updateSetting result -> GraphQL mutation response -> serverSettingsStore success/error branch -> reloadServerSettings -> StreamingParserCard watcher -> dirty/error/original state update`
- Basics notification event: `Endpoint/WebSearch child save result -> ServerSettingsBasicsPanel notification surface -> auto-clear`.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `StreamingParserCard`
  - `store.settings watcher -> derive current XML enabled -> if not dirty, update draft -> always update original -> save button dirty state`
  - This mirrors `CodexFullAccessCard` and matters because settings reloads should not erase unsaved user edits.
- Parent owner: `ServerSettingsEndpointCards`
  - `store.settings watcher -> parse current endpoint strings -> preserve unsaved row edits -> validate rows -> serialize -> save key/value through store`
- Parent owner: `WebSearchConfigurationCard`
  - `fetchSearchConfig -> apply to form -> user edits provider fields -> validate provider requirements -> setSearchConfig -> reset form from store`

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Source-size compliance | DS-001, DS-002, DS-006, DS-007 | All changed source owners | Ensure no changed implementation file exceeds 500 effective non-empty lines | Code-review hard gate. | Direct manager edits fail review even when functional behavior is correct. |
| Localization copy | DS-002, DS-003 | StreamingParserCard and extracted cards | Product text in EN/ZH catalogs | UI copy must pass localization guard. | Hardcoded literals create translation/audit issues. |
| Value validation/normalization | DS-003 | ServerSettingsService | Accept only runtime-supported values and persist lowercase canonical strings | Keeps Advanced/API consistent with Basics. | Frontend-only validation leaves Advanced/API inconsistent. |
| Tests | All DS | New owners | Guard render, state mapping, save values, metadata validation, and split behavior | Refactor must not regress existing Basics/Advanced behavior. | Manager-only tests become too broad and brittle. |
| Documentation | DS-002, DS-003, DS-004 | Delivery/docs owner | Update durable settings docs if needed | Operators need to know what Basic toggle does and what Advanced values remain. | Feature becomes undiscoverable. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Settings shell and Advanced mode | Server Settings UI | Refactor Existing | Existing manager remains page shell/Advanced owner, but must shed Basics concerns. | N/A |
| Basics card placement | Server Settings UI | Create focused extracted owner | Existing grid is correct conceptually, but current file is too large to keep changing directly. | `ServerSettingsManager` is over the hard source-size limit. |
| Endpoint quick setup | Server Settings UI | Create focused extracted owner | Endpoint parsing/validation is a bounded local form loop. | Keeping it in manager overloads shell. |
| Web Search card | Server Settings UI | Create focused extracted owner | Web Search has provider-specific form state and validation. | Keeping it in manager overloads shell. |
| Frontend settings persistence | `serverSettingsStore` | Reuse | Already owns readiness, GraphQL mutations, and reload. | N/A |
| Backend settings metadata/validation | `ServerSettingsService` | Extend | Existing owner for predefined editable settings and validation. | N/A |
| Runtime stream parser behavior | `autobyteus-ts` streaming runtime | Reuse | Existing resolver/factory already implements behavior. | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Web Settings UI shell | Mode routing, shared load/error, Advanced table/status unless extracted | DS-001 | `ServerSettingsManager` | Refactor Existing | Must end below 500 effective non-empty lines. |
| Web Settings Basics composition | Basics layout and child card composition | DS-002 | `ServerSettingsBasicsPanel` | Create New | New card render belongs here. |
| Web Settings endpoint quick setup | Endpoint cards and endpoint row form loop | DS-006 | `ServerSettingsEndpointCards` | Create New | Extract from manager. |
| Web Search configuration | Search provider form loop | DS-007 | `WebSearchConfigurationCard` | Create New | Extract from manager. |
| Web Settings Store | Fetch/update/reload server settings and search config | DS-001, DS-003, DS-006, DS-007 | `serverSettingsStore` | Reuse | No new persistence store. |
| Server Settings Service | Predefined setting metadata, validation, persistence | DS-003 | `ServerSettingsService` | Extend | Add stream parser predefined setting. |
| AutoByteus Runtime Streaming | Interpret `AUTOBYTEUS_STREAM_PARSER` during future handler creation | DS-004 | `autobyteus-ts` resolver/factory | Reuse | No runtime behavior changes. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `ServerSettingsManager.vue` | Web Settings UI shell | Settings shell / Advanced owner | Shared load/error, mode sync, Advanced table/status unless extracted | Keeps page entry small. | Existing store. |
| `ServerSettingsBasicsPanel.vue` | Web Settings Basics composition | Basics composition owner | Layout and ordering of Basics endpoint cards and standalone cards | Extracted composition concern. | Child cards. |
| `ServerSettingsEndpointCards.vue` | Web Settings endpoint quick setup | Endpoint quick setup owner | Endpoint rows, parsing, serialization, validation, save, notify | One bounded local form concern. | `serverSettingsStore`. |
| `WebSearchConfigurationCard.vue` | Web Search configuration | Web Search card owner | Provider selection, form validation, configured hints, save, notify | One card concern. | `serverSettingsStore`. |
| `StreamingParserCard.vue` | Web Settings UI | Streaming parser card | Boolean XML override UI and save mapping | One product-facing card concern. | `serverSettingsStore`. |
| `stream-parser-setting.ts` | Server Settings Service / config metadata | Stream parser setting metadata helper | Key, allowed values, default value, normalization/validation helper | Keeps service concise and tests aligned. | Runtime constants. |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Backend/runtime stream parser key/value set and normalization | `autobyteus-server-ts/src/config/stream-parser-setting.ts` plus exported runtime constants | Server Settings Service / runtime contract | Service and tests need the same key/value list and normalization contract. | Yes | Yes | A second runtime parser implementation. |
| Basics notification event shape | Local emits only | Web Settings Basics composition | Simple one-off `{message,type}` events do not justify a shared abstraction. | N/A | N/A | Generic settings event bus. |
| Card button classes | No new shared file | Web Settings UI | Existing cards duplicate small Tailwind class strings; not enough to block this task. | N/A | N/A | Premature UI framework refactor. |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| Stream parser backend constants | Yes | Yes | Low | Keep to key, allowed values, default/off value, normalizer. Do not include UI labels. |
| Extracted endpoint row model | Yes | Yes | Low | Keep local to endpoint component unless reused elsewhere. |
| `ServerSetting` DTO | Yes | N/A | Low | Reuse existing DTO; no schema change. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/settings/ServerSettingsManager.vue` | Web Settings UI shell | Settings shell / Advanced owner | Shared loading/error state, mode prop sync, Advanced raw table/status unless extracted, and Advanced notifications | Keeps page entry point small and source-size safe. | `serverSettingsStore`, optional `ServerSettingsBasicsPanel`. |
| `autobyteus-web/components/settings/ServerSettingsBasicsPanel.vue` | Web Settings Basics composition | Basics composition owner | Basics max-width shell, endpoint cards, standalone card grid, Web Search, Compaction, Basics-level notifications | Allows adding streaming card without changing oversized manager. | Child cards. |
| `autobyteus-web/components/settings/ServerSettingsEndpointCards.vue` | Web Settings endpoint quick setup | Endpoint quick setup owner | Quick endpoint field definitions, endpoint row parsing/serialization/validation/save, unsaved edit preservation | Extracted bounded local loop. | `serverSettingsStore`. |
| `autobyteus-web/components/settings/WebSearchConfigurationCard.vue` | Web Search configuration | Web Search card owner | Search provider options, form state, validation, search config load/save, configured-key copy | Extracted card-level form. | `serverSettingsStore`. |
| `autobyteus-web/components/settings/StreamingParserCard.vue` | Web Settings UI | Streaming parser card | Render title/description, switch, save button, note/dirty/error text; map current setting to boolean; save canonical string value. | One product-facing card concern. | `serverSettingsStore`, localization. |
| `autobyteus-web/localization/messages/en/settings.ts` | Localization | English settings messages | Add Streaming parser card messages and any extracted-card copy retained/moved | Existing English catalog. | N/A |
| `autobyteus-web/localization/messages/zh-CN/settings.ts` | Localization | Chinese settings messages | Add Streaming parser card messages and any extracted-card copy retained/moved | Existing Chinese catalog. | N/A |
| `autobyteus-server-ts/src/config/stream-parser-setting.ts` | Server Settings Service / config metadata | Stream parser setting contract | Export setting key, supported values, default/off value, and normalize-for-persistence helper. | Keeps service registration concise and tests aligned. | Runtime constants. |
| `autobyteus-server-ts/src/services/server-settings-service.ts` | Server Settings Service | Backend settings authority | Register `AUTOBYTEUS_STREAM_PARSER` as predefined editable/non-deletable with normalization. | Existing authority for settings metadata. | Stream parser helper. |
| `autobyteus-web/components/settings/__tests__/ServerSettingsManager.spec.ts` | Web Settings UI tests | Shell/Advanced test | Cover manager shell, mode routing, Advanced raw table/status behavior | Tests follow reduced manager ownership. | N/A |
| `autobyteus-web/components/settings/__tests__/ServerSettingsBasicsPanel.spec.ts` | Web Settings UI tests | Basics composition test | Verify child composition includes endpoint cards, existing standalone cards, Streaming parser card, Web Search, and Compaction | Tests new composition owner. | N/A |
| `autobyteus-web/components/settings/__tests__/ServerSettingsEndpointCards.spec.ts` | Web Settings UI tests | Endpoint quick setup test | Move endpoint parsing/validation/save/dirty-preservation tests from manager | Tests new endpoint owner. | N/A |
| `autobyteus-web/components/settings/__tests__/WebSearchConfigurationCard.spec.ts` | Web Settings UI tests | Web Search card test | Move provider validation/save tests from manager | Tests new search owner. | N/A |
| Existing streaming parser/backend tests | Component/backend tests | Feature coverage | Keep focused XML toggle and backend validation coverage | Already coherent. | N/A |

## Ownership Boundaries

- Frontend UI must depend on `serverSettingsStore`, not GraphQL client directly.
- `ServerSettingsManager` must not depend on child card internals after extraction.
- Basics child components may emit narrow notify events upward to `ServerSettingsBasicsPanel`; they must not mutate manager state directly.
- Backend GraphQL resolver must delegate to `ServerSettingsService`, not validate parser values itself.
- `ServerSettingsService` may validate known supported values but must not implement streaming parser selection.
- Runtime parser selection remains in `autobyteus-ts`; settings UI only persists environment values consumed by that runtime.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `ServerSettingsBasicsPanel` | Child card ordering and Basics notification surface | `ServerSettingsManager` | Manager imports every Basics card directly or re-owns endpoint/search form logic | Add a narrow prop/event to the Basics panel. |
| `ServerSettingsEndpointCards` | Endpoint row parsing/serialization/validation | Basics panel | Manager or Basics panel reaches into endpoint rows | Add explicit event or method only if needed. |
| `WebSearchConfigurationCard` | Provider form state and validation | Basics panel | Manager or Basics panel owns search form fields | Keep form inside card; emit notifications only. |
| `serverSettingsStore` | Apollo client queries/mutations, readiness wait, reload | Settings cards | Card imports `getApolloClient` or writes localStorage/process env | Add store method only if needed. |
| `ServerSettingsService` | Predefined metadata, validation, `AppConfig.set/delete` | GraphQL resolver, package root stores | Resolver validates `AUTOBYTEUS_STREAM_PARSER` directly or writes `AppConfig` directly | Extend service registration/normalization. |
| `autobyteus-ts` runtime resolver/factory | Parser strategy interpretation and handler selection | Agent runtime setup | Settings UI assumes runtime internals beyond canonical env values | Update runtime resolver only in a separate runtime behavior task. |

## Dependency Rules

Allowed:

- `ServerSettingsManager.vue` → `ServerSettingsBasicsPanel.vue`, `ServerMonitor.vue`, `serverSettingsStore`, `windowNodeContextStore`.
- `ServerSettingsBasicsPanel.vue` → `ServerSettingsEndpointCards.vue`, `WebSearchConfigurationCard.vue`, existing standalone cards including `StreamingParserCard.vue`.
- `ServerSettingsEndpointCards.vue` / `WebSearchConfigurationCard.vue` / `StreamingParserCard.vue` → `useServerSettingsStore`, localization, Vue/Icon.
- `ServerSettingsService` → server-side stream parser setting helper.
- Tests → constants/helpers where they are part of the owned public testable contract.

Forbidden:

- Any changed source implementation file above `500` effective non-empty lines.
- `StreamingParserCard.vue` must not import or call Apollo client directly.
- `StreamingParserCard.vue` must not write `.env`, `process.env`, localStorage, or Electron APIs.
- `ServerSettingsManager.vue` must not continue to own extracted Basics endpoint/search form state.
- `ServerSettingsResolver` must not duplicate stream parser validation.
- Backend settings service must not change `StreamingResponseHandlerFactory` or parser construction behavior.
- Basics card must not remove Advanced support for valid expert values.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `serverSettingsStore.getSettingByKey(key)` | Frontend settings state | Read current raw setting by key | Exact setting key string | Cards read relevant settings. |
| `serverSettingsStore.updateServerSetting(key, value)` | Frontend setting mutation | Persist key/value through GraphQL and reload | Exact key string + canonical value string | Streaming card saves `xml` or `api_tool_call`. |
| `serverSettingsStore.setSearchConfig(input)` | Search config mutation | Persist provider-specific search config and refresh settings | Explicit search provider input | Owned by Web Search card. |
| `ServerSettingsService.updateSetting(key, value)` | Backend setting mutation | Validate/normalize and persist | Exact key string + raw input value | Adds predefined validation for stream parser key. |
| `resolveToolCallFormat()` | Runtime parser/tool-call mode | Resolve env to runtime format | `process.env.AUTOBYTEUS_STREAM_PARSER` | Existing runtime API; unchanged. |
| `notify` emit from Basics children | Basics notification | Surface save success/error to Basics panel | `{ message, type }` or equivalent narrow shape | Should not expose child internals. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `ServerSettingsBasicsPanel` | Yes | Yes | Low | Keep to composition/notification only. |
| `ServerSettingsEndpointCards` | Yes | Yes | Low | Keep endpoint keys explicit in local field list. |
| `WebSearchConfigurationCard` | Yes | Yes | Low | Keep provider-specific input shape explicit. |
| `StreamingParserCard` save behavior | Yes | Yes | Low | Use explicit `AUTOBYTEUS_STREAM_PARSER` constant. |
| `serverSettingsStore.updateServerSetting` | Yes | Yes | Low | Reuse existing generic settings key/value interface. |
| `ServerSettingsService.updateSetting` | Yes | Yes | Low | Register key-specific validation internally. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Basics panel | `ServerSettingsBasicsPanel` | Yes | Low | Owns Basics composition only. |
| Endpoint cards | `ServerSettingsEndpointCards` | Yes | Low | Owns endpoint quick setup only. |
| Web Search card | `WebSearchConfigurationCard` | Yes | Low | Owns search config form. |
| UI card | `StreamingParserCard` | Yes | Low | Title copy: `Streaming parser`; toggle label: `Use XML streaming parser`. |
| Setting key | `AUTOBYTEUS_STREAM_PARSER` | Existing | Low | Preserve existing key. |
| Off/default value | `api_tool_call` | Existing | Medium for non-technical users | Hide value behind Basics copy; keep Advanced for experts. |

## Applied Patterns (If Any)

- Component extraction by owned form/composition concern: split shell, Basics composition, endpoint local loop, Web Search local loop.
- Boolean-to-canonical-string settings card: same local pattern as `CodexFullAccessCard`.
- Predefined settings validation: same backend pattern as `CODEX_APP_SERVER_SANDBOX` and `AUTOBYTEUS_FEATURED_CATALOG_ITEMS`.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/settings/ServerSettingsManager.vue` | File | Settings shell / Advanced owner | Mode routing, shared load/error, Advanced table/status unless extracted | Existing page component, now reduced. | Basics endpoint/search/card internals; >500 effective non-empty lines. |
| `autobyteus-web/components/settings/ServerSettingsBasicsPanel.vue` | File | Basics composition | Compose Basics child cards and notification surface | Settings Basics UI. | Endpoint parsing, search provider validation, GraphQL/env writes. |
| `autobyteus-web/components/settings/ServerSettingsEndpointCards.vue` | File | Endpoint quick setup | Endpoint rows, validation, save | Extracted endpoint form concern. | Web Search, Streaming parser, Advanced table. |
| `autobyteus-web/components/settings/WebSearchConfigurationCard.vue` | File | Web Search config | Search provider form/load/save | Extracted card concern. | Endpoint row handling or Advanced table. |
| `autobyteus-web/components/settings/StreamingParserCard.vue` | File | Streaming parser card | Product-facing XML parser toggle | Settings cards live here. | Direct GraphQL/env/runtime parser logic. |
| `autobyteus-web/localization/messages/*/settings.ts` | File | Localization | Settings copy | Existing settings copy owner. | Component behavior. |
| `autobyteus-server-ts/src/config/stream-parser-setting.ts` | File | Server settings config metadata | Key/value constants and normalizer | Config folder contains typed setting helpers. | Runtime handler selection. |
| `autobyteus-server-ts/src/services/server-settings-service.ts` | File | Server settings service | Register predefined setting | Existing authority. | UI behavior. |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `autobyteus-web/components/settings` | UI component concern | Yes | Medium | Multiple settings UI components already live here; the split clarifies ownership and source size. |
| `autobyteus-web/stores` | Frontend state/transport | Yes | Low | Reused only; no new store file. |
| `autobyteus-server-ts/src/config` | Config metadata helpers | Yes | Low | Good fit for setting constants/normalizers. |
| `autobyteus-server-ts/src/services` | Backend service boundary | Yes | Medium | Service remains correct authority; helper avoids bloat. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Source-size-safe composition | `ServerSettingsManager -> ServerSettingsBasicsPanel -> StreamingParserCard` | `ServerSettingsManager` imports/renders every Basics card directly while remaining 886 lines | Prevents repeat code-review failure. |
| Endpoint split | `ServerSettingsEndpointCards` owns `parseQuickSettingValue`, `serializeQuickRows`, `saveQuickSetting` | Manager owns endpoint row models and save loops | Keeps shell out of bounded local form logic. |
| Web Search split | `WebSearchConfigurationCard` owns provider validation and `setSearchConfig` | Manager owns search form state and validation | Keeps search concern in one card. |
| Toggle mapping | `checked ? 'xml' : 'api_tool_call'` | `checked ? 'xml' : ''` or deleting a predefined setting | Predefined settings are non-deletable; `api_tool_call` is canonical default/non-XML. |
| Initial state | `isXmlValue(value) = value.trim().toLowerCase() === 'xml'` | `Boolean(value)` | `json`/`sentinel`/invalid values are configured but should show XML toggle off. |
| Persistence path | `await store.updateServerSetting(STREAM_PARSER_KEY, canonicalValue)` | `getApolloClient().mutate(...)` inside card | Keeps frontend boundary encapsulated. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep direct manager edit because it is only two lines | Minimal implementation delta | Rejected | Split Basics ownership so the changed manager passes source-size gate. |
| Keep `AUTOBYTEUS_STREAM_PARSER` as a custom deletable Advanced key | Minimal backend change | Rejected | Register predefined metadata/validation. |
| Disable XML by deleting the setting | Matches current custom-setting cleanup behavior | Rejected | Save `api_tool_call`, because predefined settings are non-deletable and this is canonical default/non-XML. |
| Add separate typed GraphQL mutation only for this toggle | Could hide raw key from UI | Rejected | Reuse generic settings boundary like Codex full-access; no separate domain capability exists. |
| Add a full Basics strategy selector | Exposes all values | Rejected for this task | Keep Advanced as expert surface; Basics is single XML toggle per user request. |

## Derived Layering (If Useful)

- UI shell layer: `ServerSettingsManager`.
- UI composition layer: `ServerSettingsBasicsPanel`.
- UI card/form layer: endpoint cards, Web Search card, standalone behavior cards.
- Frontend state/transport layer: `serverSettingsStore`.
- Backend transport layer: GraphQL resolver.
- Backend settings domain/service layer: `ServerSettingsService` and stream-parser setting helper.
- Persistence mechanism: `AppConfig`.
- Runtime consumption: `autobyteus-ts` streaming handler factory and tool-call format resolver.

## Migration / Refactor Sequence

1. Before further feature edits, extract Basics ownership from `ServerSettingsManager.vue`:
   - create `ServerSettingsBasicsPanel.vue` for Basics composition;
   - create `ServerSettingsEndpointCards.vue` for endpoint quick setup;
   - create `WebSearchConfigurationCard.vue` for Web Search configuration.
2. Move the existing quick endpoint tests from `ServerSettingsManager.spec.ts` to `ServerSettingsEndpointCards.spec.ts`.
3. Move Web Search validation/save tests from `ServerSettingsManager.spec.ts` to `WebSearchConfigurationCard.spec.ts`.
4. Add `ServerSettingsBasicsPanel.spec.ts` for composition/placement, including `StreamingParserCard`.
5. Reduce `ServerSettingsManager.spec.ts` to shell/mode/loading/error/Advanced table/server-status behavior.
6. Verify effective non-empty line counts for every changed source implementation file; if `ServerSettingsManager.vue` remains above `500`, extract `ServerSettingsAdvancedPanel.vue` before returning to code review.
7. Keep or add the already-implemented backend stream parser setting helper and service registration.
8. Keep or add `StreamingParserCard.vue` in the extracted Basics panel.
9. Run focused frontend tests for the split and streaming card, backend settings service tests, server build/type checks used by implementation, and then return to code review before API/E2E.

## Key Tradeoffs

- Refactor now vs defer: previously deferred as unnecessary for the functional feature, but code review proved direct manager edits cannot pass; refactor is now required.
- Basics panel plus endpoint/search extraction vs one large Basics component: splitting endpoint and Web Search loops prevents creating another near-limit component and clarifies ownership.
- Toggle vs selector: Toggle remains simpler and matches the user request; Advanced keeps precision for non-XML strategies.
- Off = `api_tool_call` vs unset/delete: `api_tool_call` is explicit, works for predefined non-deletable settings, and mirrors Codex full-access saving a default value when off.
- No runtime change: preserves existing behavior and limits risk.

## Risks

- Refactoring Server Settings UI could regress endpoint quick setup, Web Search, or Advanced raw table behavior if tests are not moved with ownership.
- Users with `json`/`sentinel` configured through Advanced will see the Basics toggle off. Copy should make clear the card controls XML override, not every parser strategy.
- A user who turns XML on and then off from Basics will canonicalize to `api_tool_call`, not restore a previous `json`/`sentinel` value. This is acceptable for a two-state card but should be clear in tests/design.
- Backend value normalization will reject unsupported future parser names until the supported list is updated.

## Guidance For Implementation

- Required source-size invariant: no changed source implementation file may exceed `500` effective non-empty lines. Use a small local counting script before handoff.
- Required new/extracted components:
  - `autobyteus-web/components/settings/ServerSettingsBasicsPanel.vue`
  - `autobyteus-web/components/settings/ServerSettingsEndpointCards.vue`
  - `autobyteus-web/components/settings/WebSearchConfigurationCard.vue`
- Keep `StreamingParserCard.vue` focused as currently implemented:
  - on saves `xml`;
  - off saves `api_tool_call`;
  - only trimmed/lowercase-normalized `xml` displays on.
- Suggested data-testids for extracted components:
  - `server-settings-basics-panel`
  - `server-settings-endpoint-cards`
  - `web-search-configuration-card`
  - preserve existing quick endpoint and search field testids where practical to reduce test churn.
- Suggested focused test commands after rework:
  - `pnpm -C autobyteus-web exec vitest run components/settings/__tests__/StreamingParserCard.spec.ts components/settings/__tests__/ServerSettingsBasicsPanel.spec.ts components/settings/__tests__/ServerSettingsEndpointCards.spec.ts components/settings/__tests__/WebSearchConfigurationCard.spec.ts components/settings/__tests__/ServerSettingsManager.spec.ts`
  - `pnpm -C autobyteus-server-ts exec vitest run tests/unit/services/server-settings-service.test.ts`
  - `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit`
- Do not proceed to API/E2E until the updated implementation returns to and passes `code_reviewer`.
