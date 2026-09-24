# Design Spec — Claude Agent SDK Canonical Model IDs In Model Pickers

## Solution And Approval Basis

- Current solution revision ID: `SR-003`
- Approved requirements baseline: `requirements-doc.md` approved by the user 2026-09-24 ("great. this is what user want to see. approved") at SR-002; SR-003 applies an evidence-only correction to BEH-006/REQ-010 (see `solution-revision-record.md`) that keeps the approved intent "same as today".
- Behavior-defining supplements: `dropdown-preview.md` (approved SR-002; §2 note on pre-selection corrected in SR-003, same intent).
- Design status: `Ready`
- Canonical investigation notes: `investigation-notes.md` (same folder)

## Current-State Read

- The Claude model list comes from `ClaudeSdkClient.listModels()` → Claude SDK `query(...).supportedModels()` → `normalizeModelDescriptors` → `toModelInfo` (`autobyteus-server-ts/src/runtime-management/claude/client/`). `toModelInfo` sets `model_identifier = value = canonical_name = row.value` and `display_name = row.displayName`; `resolvedModel` is parsed but discarded.
- `ModelCatalogService.listLlmModels("claude_agent_sdk")` returns that list un-cached; GraphQL `mapLlm` maps it to `ModelDetail` (sorted by `name`); the web store keeps the rows as-is.
- The web builds picker options in two duplicated places — `composables/useRuntimeScopedModelSelection.ts` (`groupedModelOptions`) and `composables/messaging-binding-flow/launch-preset-model-selection.ts` — using `utils/modelSelectionLabel.ts` (runtime-keyed label rule; only AutoByteus runtime uses identifiers). `components/agentTeams/SearchableGroupedSelect.vue` matches the selected item by `item.id === modelValue`.
- **Saved model identifiers are validated by exact catalog-identifier lookups in many places**: server `RunModelSelectionService.validate` (`row.model_identifier === selection.llmModelIdentifier`), `application-launch-host-capability-validator.ts`, `model-availability-service.ts`, capacity lookups keyed by SDK `value`; web `hasModelIdentifier`, `modelConfigSchemaByIdentifier`, `RuntimeModelConfigFields` replacement filtering. Definitions store `defaultLaunchConfig.llmModelIdentifier` (e.g. `default`), which seeds new run configs (`AgentOrgRunConfigPanel.vue` → `configStore.begin`).
- Constraint derived from the above: removing `default` from the **catalog** would break every exact lookup for saved `default` values (REQ-007). The merge must therefore be a **picker presentation** concern, not a catalog-identity change.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Medium`
- Size rationale: ~5 server files (Claude normalizer, new Claude presentation derivation, new small domain type, GraphQL catalog type) and ~10 web files (query + generated types, store model type, label util, new options builder, select-item matcher, `SearchableGroupedSelect.vue`, two option-building composables, `RuntimeModelConfigFields.vue`, two locale files) plus focused tests. All within existing owners (Claude runtime client, model catalog GraphQL, web model-selection utilities).
- Architectural risk: `Low`
- Risk rationale: Catalog identities, validation, persistence, run launch, capacity and token-usage paths are unchanged (every saved identifier stays a catalog identifier). GraphQL change is purely additive (one nullable object field on `ModelDetail`). Claude `canonical_name` changes from alias to resolved ID; all readers were checked: pricing uses the `LLMFactory` registry, not runtime catalogs; `ModelMetadataProvisioningService.enrichBestEffort` has no production caller; web `canonicalModels()` has no caller. No concurrency, security, deployment or migration surface.
- Escalation trigger: return `Design Impact` if implementation finds (a) any production reader of Claude `canonical_name`/`canonicalName` other than those listed, (b) a model-picker surface for Claude that does not go through the shared options builder or `SearchableGroupedSelect`, or (c) a need to change catalog identifiers or saved values.

## Architecture Investigation Evidence

| Source | Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Live SDK probe | investigation-notes Source Log 2026-09-24 | Rows carry `value`, `resolvedModel`, `displayName`, `description`; `default` and `opus[1m]` share `claude-opus-5-5[1m]`; Fable `resolvedModel` drops `[1m]` | Label from `resolvedModel`; send/store only SDK `value` | Future SDK may omit `resolvedModel` → fallback (REQ-008) |
| Code | `run-model-selection-service.ts:41`, `application-launch-host-capability-validator.ts:122`, web `hasModelIdentifier` | Exact identifier lookups against catalog | Keep catalog identities unchanged; merge only in picker | None |
| Code | `SearchableGroupedSelect.vue` `selectedItemLabel`, `aria-selected`, check mark, `filteredOptions` | Single matching rule `item.id === modelValue`; search covers name/id/selectedLabel/description | Add `aliasIds` + shared matcher; add recommended badge to search | None |
| Code | `RuntimeModelConfigFields.vue` `selectableModelOptions` | Filters items by `ids.has(item.id)` and adds a "Saved / selected model" raw row when the current id has no item | Use the shared matcher so saved `default` maps to the Opus option | None |
| Code | `AgentOrgRunConfigPanel.vue:180,238`, `agentOrgRunConfigStore.begin` | New configs are seeded from the definition's `defaultLaunchConfig`; there is no automatic model pre-selection | REQ-010 corrected to "same as today" (SR-003) | None |
| Code | `token-price-config-provider.ts`, `model-metadata-provisioning-service.ts`, `stores/llmProviderConfig.ts canonicalModels` | No production reader of Claude runtime `canonical_name` | Safe to set Claude `canonical_name = resolvedModel` | See escalation trigger |
| Code | `llm-provider-model-catalog.ts` `ModelInfoWithMetadata` | Established pattern: server-local optional extras carried on `ModelInfo` rows to GraphQL mapping | Carry `selection_presentation` the same way; do not modify `autobyteus-ts` `ModelInfo` (dist-consumed library) | None |

## Intended Change

1. **Server (Claude runtime client)** derives, from the full SDK row set, per-row picker presentation hints and the canonical name:
   - `canonical_name` = `resolvedModel` when present and unambiguous, else the row `value`.
   - `selection_presentation` = `{ recommended, aliasOfModelIdentifier }`:
     - Find the SDK `default` row. If another row (first in SDK order) has the same non-null, unambiguous `resolvedModel`, then `default` → `{ recommended: false, aliasOfModelIdentifier: <that row's value> }` and that row → `{ recommended: true, aliasOfModelIdentifier: null }`.
     - If no such sibling exists, `default` → `{ recommended: true, aliasOfModelIdentifier: null }` (it stays its own option).
     - All other rows → `{ recommended: false, aliasOfModelIdentifier: null }`.
   - All rows (including `default`) remain in the catalog with unchanged `model_identifier`/`value`.
2. **GraphQL** exposes `ModelDetail.selectionPresentation { recommended aliasOfModelIdentifier }` (nullable; null for non-Claude and media rows).
3. **Web** builds picker options through one shared builder:
   - Rows whose `aliasOfModelIdentifier` target exists in the same provider group are not listed; their identifier is added to the target option's `aliasIds`.
   - For runtime `claude_agent_sdk`: primary label = `canonicalName` (fallback `modelIdentifier`); secondary text = `name · description`; selected label = `<Provider> / <canonicalName>`; options ordered recommended-first, then by primary label.
   - `recommended` rows render a localized "Recommended" badge (searchable).
   - `SearchableGroupedSelect` treats a value as selecting an item when it equals `item.id` or is in `item.aliasIds`; choosing the item that already represents the current value emits nothing (so a saved `default` is not silently rewritten or its config reset).

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Requirement / AC | Trigger | Existing Behavior | Approved Change / Preserved Outcome | Target Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | REQ-001..004, 008, 009 / AC-001, 005, 006 | Open Claude Agent SDK model picker | 5 rows labeled by display name | 4 options labeled by canonical ID, secondary text, Recommended badge, fallback label | DS-001, DS-002 |
| BEH-002 | User | REQ-005 / AC-002 | Select an option | `Anthropic / Default (recommended)` | `Anthropic / <canonical ID>` | DS-002 |
| BEH-003 | System | REQ-006, 007 / AC-003, 004 | Save / launch / reopen | Saved value = SDK value; exact lookups | Unchanged identities; picker resolves aliases for display; re-selecting the same option emits nothing | DS-002 (display), existing launch path unchanged |
| BEH-004 | System | AC-008 | Claude turn | Per-turn alias→resolved binding | Unchanged | Not touched |
| BEH-005 | User | AC-008 | Other runtimes' pickers | Existing labels | Unchanged (builder applies Claude label policy only for `claude_agent_sdk`; no other runtime emits `selectionPresentation`) | DS-002 |
| BEH-006 | User | REQ-010 / AC-007 (SR-003) | Start a new config | Seeded from definition default (e.g. `default`) | Unchanged seeding; a seeded `default` displays as the Recommended option | DS-002 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related IDs | Relationship | Status |
| --- | --- | --- | --- | --- |
| `dropdown-preview.md` | Approved picker preview | REQ-001..010 | Normative label/secondary/badge/selected-field rules; model strings illustrative | Approved SR-002, pre-selection note corrected SR-003 |
| `investigation-notes.md` | Evidence | all | Evidence basis | Current |

## Task Design Health Assessment (Mandatory)

- Change posture: `Behavior Change`
- Current design issue found: `Yes`
- Root cause classification: `Duplicated Policy Or Coordination` (picker-option building duplicated in two composables) + `Missing Invariant` (canonical model name for Claude rows set to the alias instead of the resolved ID).
- Refactor needed now: `Yes` (small)
- Evidence: `useRuntimeScopedModelSelection.ts` and `launch-preset-model-selection.ts` each map provider groups → `GroupedOption[]`; adding folding/badge/ordering in both would duplicate a new policy. `toModelInfo` writes `canonical_name: descriptor.identifier` although `resolvedModel` is available.
- Design response: extract `utils/modelSelectionOptions.ts` as the single owner of provider-groups → picker options; both composables call it. Fix Claude `canonical_name`.
- Refactor rationale: one owner for picker policy prevents the messaging/application surfaces from diverging (they receive the same catalog and must fold aliases too).
- Intentional deferrals: token-usage/analytics labels (out of scope per requirements).

## Terminology

- **SDK value**: Claude SDK row `value` — what AutoByteus stores and sends (e.g. `default`, `opus[1m]`, `claude-fable-5[1m]`).
- **Canonical model ID**: SDK `resolvedModel` (e.g. `claude-opus-5-5[1m]`), carried as `canonical_name`/`canonicalName`.
- **Alias row**: a catalog row whose `selectionPresentation.aliasOfModelIdentifier` names another row that represents it in pickers.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Removed in scope: the duplicated inline option-mapping blocks in `useRuntimeScopedModelSelection.ts` and `launch-preset-model-selection.ts` (replaced by the shared builder).
- Not a compatibility wrapper: keeping `default` in the catalog is the approved current behavior (REQ-007: saved values keep running unchanged), not a legacy fallback. Alias folding is a single-path presentation rule applied to every catalog.

## Persisted Data / State Transition Decision

- Stored subject: run configs, definition `defaultLaunchConfig`, member overrides, application launch profiles, messaging presets — `llmModelIdentifier` strings such as `default`, `opus[1m]`, `sonnet`.
- Change: none to stored shape or values; catalog identities unchanged.
- Decision: `Not Affected` — every stored identifier remains a catalog identifier and is validated/launched by the unchanged exact-lookup paths; only picker display resolves aliases.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001 | Claude SDK `supportedModels()` | GraphQL `ModelDetail` rows | `ClaudeSdkClient.listModels` (catalog production) | Canonical name + presentation hints are derived here from the full row set |
| DS-002 | Bounded Local (web) | BEH-001, 002, 003, 006 | Store provider groups for a runtime | Rendered picker + emitted selection | `buildModelSelectionGroups` + `SearchableGroupedSelect` | Folding, labels, badge, ordering, alias-aware matching |

## Primary Execution Spine(s)

- DS-001: `Claude SDK supportedModels() -> normalizeModelDescriptors -> deriveClaudeModelSelectionPresentation + toModelInfo -> ClaudeSdkClient.listModels -> ModelCatalogService.listLlmModels -> GraphQL mapLlm (ModelDetail.canonicalName, selectionPresentation) -> web llmProviderConfig store`
- DS-002: `store.providersWithModelsForSelection(runtime) -> buildModelSelectionGroups(groups, runtime) -> GroupedOption[] (id, aliasIds, name, description, selectedLabel, recommended) -> SearchableGroupedSelect (selectItemMatches) -> update:modelValue (SDK value)`

## Spine Narratives (Mandatory)

| Spine ID | Narrative | Main Nodes | Owner | Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The Claude client asks the SDK for its rows, normalizes them, derives canonical names and which row the `default` alias folds into, and returns catalog rows whose identities are unchanged but enriched with presentation hints; GraphQL exposes them. | SDK rows, `NormalizedModelDescriptor`, `ModelInfo` + `selection_presentation`, `ModelDetail` | `ClaudeSdkClient` | Ambiguous `resolvedModel` handling (normalizer already flags) |
| DS-002 | The web builder turns provider groups into picker options: alias rows fold into their target option, Claude options get canonical-ID labels and secondary text, recommended-first ordering; the select renders, searches and matches selection including aliases, emitting only real changes. | `ProviderWithModels`, `GroupedOption`/`SelectItem` | `buildModelSelectionGroups`; `SearchableGroupedSelect` | Localization of the badge |

## Spine Actors / Main-Line Nodes

`ClaudeSdkClient.listModels`, `deriveClaudeModelSelectionPresentation`, `toModelInfo`, GraphQL `mapLlm`, web `buildModelSelectionGroups`, `SearchableGroupedSelect`.

## Ownership Map

- `claude-sdk-model-normalizer.ts`: per-row normalization and `ModelInfo` projection, incl. `canonical_name`.
- `claude-sdk-model-selection-presentation.ts` (new): the Claude-specific rule "which row is recommended and which alias folds into which row" over the full descriptor set.
- `llm-management/domain/model-selection-presentation.ts` (new): runtime-neutral type of the hint carried on catalog rows.
- GraphQL `llm-provider-model-catalog.ts`: transport mapping only.
- Web `utils/modelSelectionOptions.ts` (new): the only place that turns provider groups into picker options (folding, ordering, label/description/badge flags).
- Web `utils/modelSelectionLabel.ts`: runtime-keyed label/description text rules.
- Web `utils/selectItemMatch.ts` (new): the one rule "does value V select item I" (`id` or `aliasIds`).
- `SearchableGroupedSelect.vue`: generic rendering/search/selection; uses the matcher; renders the badge.

## Thin Entry Facades / Public Wrappers

| Facade | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `ClaudeModelCatalog.listModels` | `ClaudeSdkClient.listModels` | Catalog adapter | Presentation derivation |
| `useRuntimeScopedModelSelection.groupedModelOptions` / `launch-preset-model-selection.groupedModelOptions` | `buildModelSelectionGroups` | Reactive wiring | Any folding/label policy |

## Removal / Decommission Plan (Mandatory)

| Item | Why Unnecessary | Replaced By | Scope | Notes |
| --- | --- | --- | --- | --- |
| Inline `providerGroup.models.map(...)` option blocks in `useRuntimeScopedModelSelection.ts` and `launch-preset-model-selection.ts` | Duplicated picker policy | `buildModelSelectionGroups` | In This Change | — |
| `item.id === modelValue` / `ids.has(item.id)` comparisons in `SearchableGroupedSelect.vue` and `RuntimeModelConfigFields.vue` | Not alias-aware | `selectItemMatches` | In This Change | — |

## Return Or Event Spine(s)

N/A — no event flow changes.

## Bounded Local / Internal Spines

DS-002 (above), owner `SearchableGroupedSelect`: `modelValue -> selectItemMatches -> selectedItemLabel / check mark`; `click item -> if selectItemMatches(item, modelValue) close without emit else emit item.id`.

## Off-Spine Concerns Around The Spine

| Concern | Spine | Serves | Responsibility | Why | Risk If Misplaced |
| --- | --- | --- | --- | --- | --- |
| Badge localization | DS-002 | `SearchableGroupedSelect` | Render `t('…SearchableGroupedSelect.recommended')` for `item.recommended` | Keeps builder i18n-free | Hard-coded English text |
| Ambiguous `resolvedModel` | DS-001 | normalizer | Existing `resolvedModelAmbiguous` → treated as no canonical ID | Never guess an ID (REQ-008) | Wrong label |

## Ownership Boundaries

- Claude-specific knowledge (the `default` alias semantics, `resolvedModel`) stays in `runtime-management/claude/client`. The web never tests for `value === "default"`; it only follows `selectionPresentation`.
- Catalog identity (`model_identifier`) remains the single selection/storage key for server validation and launch.
- The web picker builder is the only producer of `GroupedOption[]` for LLM model pickers.

## Boundary Encapsulation Map

| Boundary | Internal Mechanism | Callers | Forbidden Bypass | Fix If Too Thin |
| --- | --- | --- | --- | --- |
| `ClaudeSdkClient.listModels` | normalizer + presentation derivation | `ClaudeModelCatalog`, session manager | Deriving presentation in GraphQL mapper or web | Extend the hint type |
| `buildModelSelectionGroups` | folding, ordering, label rules | model-selection composables | Components mapping `ProviderWithModels` to options directly | Add builder params |
| `selectItemMatches` | id/alias equality | `SearchableGroupedSelect`, `RuntimeModelConfigFields` | Inline `item.id === value` for model pickers | — |

## Dependency Rules

- `runtime-management/claude/client/*` may import `llm-management/domain/model-selection-presentation.ts`; not vice versa.
- GraphQL types may import the domain type; must not import Claude client code.
- Web `SearchableGroupedSelect.vue` may import `utils/selectItemMatch.ts`; it must not import model-specific utils.
- Web builder may import `modelSelectionLabel.ts` and `selectItemMatch.ts`; components must not re-implement folding.

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity Shape | Notes |
| --- | --- | --- | --- | --- |
| `ModelInfo.selection_presentation?: ModelSelectionPresentation \| null` (server-local extension, like `metadata_provenance`) | Catalog row | Picker hint | `aliasOfModelIdentifier` = a catalog `model_identifier` in the same runtime catalog | Optional; absent → null |
| GraphQL `ModelDetail.selectionPresentation: ModelSelectionPresentation` (nullable) `{ recommended: Boolean!, aliasOfModelIdentifier: String }` | Catalog row | Transport | same | Additive |
| Web `SelectItem` `+ aliasIds?: string[]`, `+ recommended?: boolean` | Picker option | Rendering/matching | `id` = SDK value; `aliasIds` = other SDK values | Generic, optional |
| `buildModelSelectionGroups(groups: ProviderWithModels[], runtimeKind: string): GroupedOption[]` | Picker options | Single builder | runtime kind string | Pure function |
| `selectItemMatches(item: Pick<SelectItem,'id'|'aliasIds'>, value: string \| null \| undefined): boolean` | Selection | Matching | — | Pure |

## Interface Boundary Check

| Interface | Singular? | Identity Explicit? | Ambiguous Selector Risk | Action |
| --- | --- | --- | --- | --- |
| `selectionPresentation` | Yes | Yes | Low | Alias target must be same-runtime catalog id |
| `buildModelSelectionGroups` | Yes | Yes | Low | — |
| `selectItemMatches` | Yes | Yes | Low | An id appears in at most one item (builder guarantees: alias folded into exactly one target) |

## Main Domain Subject Naming Check

| Subject | Name | Natural? | Drift Risk | Action |
| --- | --- | --- | --- | --- |
| Picker hint | `ModelSelectionPresentation` / `selectionPresentation` | Yes | Low | — |
| Alias target | `aliasOfModelIdentifier` | Yes | Low | — |
| Builder | `buildModelSelectionGroups` | Yes | Low | — |

## Existing Capability / Subsystem Reuse Check

| Need | Existing Area | Decision | Why |
| --- | --- | --- | --- |
| Resolved ID per row | `normalizeModelDescriptors` (`resolvedModel`, `resolvedModelAmbiguous`) | Reuse | Already parsed |
| Canonical name transport | `ModelDetail.canonicalName` | Reuse | Field exists with matching meaning |
| Label rules | `utils/modelSelectionLabel.ts` | Extend | Already runtime-keyed |
| Option matching | `SearchableGroupedSelect` | Extend | Generic select used by all run-config pickers |
| Picker hint type | none | Create New | No existing runtime-neutral hint type |

## Subsystem / Capability-Area Allocation

| Area | Owns | Spine | Decision |
| --- | --- | --- | --- |
| Claude runtime client | canonical name, presentation derivation | DS-001 | Extend |
| LLM management domain | hint type | DS-001 | Create New (one type file) |
| GraphQL catalog types | transport field | DS-001 | Extend |
| Web model-selection utils | builder, labels, matcher | DS-002 | Extend + Create New |
| Web generic select | render/match/badge | DS-002 | Extend |

## Draft → Final File Responsibility Mapping

| File | Owner | Concern |
| --- | --- | --- |
| `autobyteus-server-ts/src/llm-management/domain/model-selection-presentation.ts` (new) | LLM domain | `export type ModelSelectionPresentation = { recommended: boolean; aliasOfModelIdentifier: string \| null }` and `export type ModelInfoWithSelectionPresentation = ModelInfo & { selection_presentation?: ModelSelectionPresentation \| null }` |
| `autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-model-selection-presentation.ts` (new) | Claude client | `deriveClaudeModelSelectionPresentation(descriptors): Map<string, ModelSelectionPresentation>` implementing the rule in Intended Change §1 |
| `autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-model-normalizer.ts` | Claude client | `toModelInfo`: `canonical_name = (!resolvedModelAmbiguous && resolvedModel) \|\| identifier` |
| `autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-client.ts` | Claude client | `listModels()` returns `ModelInfoWithSelectionPresentation[]`: `toModelInfo(row)` + `selection_presentation` from the derived map |
| `autobyteus-server-ts/src/api/graphql/types/llm-provider-model-catalog.ts` | GraphQL | `ModelSelectionPresentationObject` `@ObjectType`; `ModelDetail.selectionPresentation` nullable; `mapLlm` maps `selection_presentation ?? null`; `mapMedia` null; widen `ModelInfoWithMetadata` with the optional field |
| `autobyteus-web/graphql/queries/llm_provider_queries.ts` + `generated/graphql.ts` (codegen) | Web transport | Request `selectionPresentation { recommended aliasOfModelIdentifier }` on `llmModels` |
| `autobyteus-web/stores/llmProviderConfigSupport.ts` | Web store type | `ModelInfo.selectionPresentation?: { recommended: boolean; aliasOfModelIdentifier: string \| null } \| null` |
| `autobyteus-web/utils/modelSelectionLabel.ts` | Label rules | `claude_agent_sdk` → option label `canonicalName \|\| modelIdentifier`; new `getModelSelectionOptionDescription(model, runtimeKind)` → for Claude `[name, description].filter(Boolean).join(' · ')`, else `description`; selected label uses the option label (existing composition) |
| `autobyteus-web/utils/selectItemMatch.ts` (new) | Matching | `selectItemMatches` |
| `autobyteus-web/utils/modelSelectionOptions.ts` (new) | Picker builder | `buildModelSelectionGroups`: per provider group, fold rows whose `aliasOfModelIdentifier` target is present in the same group into `target.aliasIds`; otherwise list; set `recommended`; label/description/selectedLabel via `modelSelectionLabel`; for Claude, stable sort recommended-first then by label; other runtimes keep order |
| `autobyteus-web/components/agentTeams/SearchableGroupedSelect.vue` | Generic select | `SelectItem` gains `aliasIds?`, `recommended?`; use `selectItemMatches` for `selectedItemLabel`, `aria-selected`, highlight, check mark; render badge; include badge text in search; `selectItem` closes without emitting when the item already matches `modelValue` |
| `autobyteus-web/composables/useRuntimeScopedModelSelection.ts` | Wiring | `groupedModelOptions` = `buildModelSelectionGroups(availableProviderGroups, runtimeKind)` |
| `autobyteus-web/composables/messaging-binding-flow/launch-preset-model-selection.ts` | Wiring | same |
| `autobyteus-web/components/launch-config/RuntimeModelConfigFields.vue` | Replacement filtering | Filter with `[item.id, ...(item.aliasIds ?? [])].some(id => ids.has(id))`; add the "Saved / selected model" raw row only if no item `selectItemMatches(item, current)` |
| `autobyteus-web/localization/messages/{en,zh-CN}/agentTeams.generated.ts` (+ source catalog if generated) | i18n | `…SearchableGroupedSelect.recommended` = "Recommended" / "推荐" |

## Reusable Owned Structures Check

| Structure | File | Owner | Why Shared | Must Not Become |
| --- | --- | --- | --- | --- |
| `ModelSelectionPresentation` | server domain file | LLM domain | Claude producer + GraphQL mapper | A Claude-specific type |
| `selectItemMatches` | web util | generic select | component + RuntimeModelConfigFields | Model-specific |
| `buildModelSelectionGroups` | web util | model selection | two composables | A component |

## Shared Structure / Data Model Tightness Check

| Structure | One Meaning Per Field? | Redundancy Removed? | Overlap Risk | Action |
| --- | --- | --- | --- | --- |
| `ModelSelectionPresentation` | Yes | Yes | Low | — |
| `SelectItem.aliasIds` | Yes (other values that select this item) | Yes | Low | — |
| `canonicalName` | Yes (canonical model ID) | Yes | Low | Claude now matches Codex/API meaning |

## Applied Patterns

- Server-local optional extras on catalog `ModelInfo` rows mapped in GraphQL (existing `metadata_provenance` pattern).
- Pure builder function for derived view models.

## Target Subsystem / Folder / File Mapping

See the file table above; no new folders. New files sit next to their owners (`llm-management/domain/`, `runtime-management/claude/client/`, `autobyteus-web/utils/`).

## Folder Boundary Check

| Path | Depth | Ownership Clear? | Risk | Justification |
| --- | --- | --- | --- | --- |
| `runtime-management/claude/client/` | Provider adapter | Yes | Low | Claude semantics stay here |
| `llm-management/domain/` | Domain types | Yes | Low | Runtime-neutral type |
| `autobyteus-web/utils/` | Off-spine pure helpers | Yes | Low | Matches existing `modelSelectionLabel.ts` |

## Concrete Examples / Shape Guidance

| Topic | Good | Avoided | Why |
| --- | --- | --- | --- |
| Catalog rows (server output, 2026-09-24 data) | `default` {canonical `claude-opus-5-5[1m]`, sp `{recommended:false, aliasOf:"opus[1m]"}`}; `opus[1m]` {canonical `claude-opus-5-5[1m]`, sp `{recommended:true, aliasOf:null}`}; `claude-fable-5[1m]` {canonical `claude-fable-5`}; `sonnet` {`claude-sonnet-5`}; `haiku` {`claude-haiku-4-5-20251001`} | Dropping `default` from the catalog | Saved `default` must stay valid everywhere |
| Web options | `{id:"opus[1m]", aliasIds:["default"], name:"claude-opus-5-5[1m]", description:"Opus (1M context) · Opus 5.5 with 1M context · …", selectedLabel:"Anthropic / claude-opus-5-5[1m]", recommended:true}` | `id:"claude-opus-5-5[1m]"` | Emitted/stored value must be an SDK value (REQ-006) |
| Re-click | Saved `default`, user clicks the checked Opus option → popover closes, no emit | Emitting `opus[1m]` and resetting config | REQ-007 |
| Web rule | Follow `selectionPresentation` | `if (model.value === 'default')` in web | Claude semantics stay server-side |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why Considered | Decision | Replacement |
| --- | --- | --- | --- |
| Rewrite saved `default` to `opus[1m]` on open | Simplify matching | Rejected | Alias-aware display matching; saved value untouched (REQ-007) |
| Keep old inline option builders alongside the new builder | Lower diff | Rejected | Single builder |
| Server alias map consulted by validators | Would be needed if catalog dropped `default` | N/A | Catalog keeps `default` |

## Change / Refactor Sequence

1. Server: domain type → presentation derivation (+ unit tests) → normalizer `canonical_name` → `listModels` → GraphQL field (+ mapper test).
2. Web: query + codegen → store type → `selectItemMatch.ts` → label util → builder (+ unit tests) → `SearchableGroupedSelect` (+ component tests) → rewire both composables (remove inline builders) → `RuntimeModelConfigFields` → locale keys.
3. Run existing web/server suites for model selection, run config, messaging binding and application launch profiles.

## Key Tradeoffs

- Presentation-only merge keeps every identity/validation path untouched (low risk) at the cost of a small alias-awareness in the generic select.
- Claude label policy remains runtime-keyed in `modelSelectionLabel.ts` (consistent with the AutoByteus precedent) rather than a new server label field.

## Risks

- SDK changes the alias name `default` → derivation marks nothing recommended/folded; list still correct, just no badge/merge. Covered by unit tests with and without `default`.
- Two non-default rows sharing a canonical ID (not observed) remain separate options with identical primary labels, distinguished by secondary text (ASM-001).
- Application launch profile / messaging preset pickers also receive the merged list (shared builder) — intended consistency; they already share the catalog.

## Guidance For Implementation

- Server tests: presentation derivation (default + sibling, default without sibling, missing/ambiguous `resolvedModel`, no default row); `toModelInfo` canonical fallback; GraphQL mapping null for non-Claude/media.
- Web tests: builder (fold, orphan alias listed, recommended-first sort for Claude only, non-Claude unchanged), `selectItemMatches`, `SearchableGroupedSelect` (alias check mark + selected label, badge search `recommended`, re-click no emit), `RuntimeModelConfigFields` original `default` keeps Opus option and no raw "Saved / selected model" row; update existing `modelSelectionLabel.spec.ts` for Claude.
- Browser validation: team run config with Claude Agent SDK must match `dropdown-preview.md` §2–§4a.
- Do not touch launch, validation, capacity, token-usage or persistence code.
