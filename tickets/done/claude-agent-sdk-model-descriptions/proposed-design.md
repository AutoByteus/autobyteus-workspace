# Design Spec

Canonical path: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/claude-agent-sdk-model-descriptions/proposed-design.md`

## Current-State Read

The runtime-scoped model picker already has a coherent end-to-end owner chain:

```text
Runtime model selector
-> useRuntimeScopedModelSelection
-> llmProviderConfig store / GraphQL query
-> LlmProviderResolver / LlmProviderService
-> ModelCatalogService / ClaudeModelCatalog
-> ClaudeSdkClient
-> Claude Agent SDK query control
```

The return path is where the defect occurs. Claude's `supportedModels()` result contains `value`, `displayName`, `description`, and capability flags. `normalizeModelDescriptors()` retains the identifier, display name, and thinking fields but drops `description`. The shared `autobyteus-ts` `ModelInfo`, GraphQL `ModelDetail`, frontend model query/store, option projection, and `SearchableGroupedSelect.SelectItem` also have no description member, so the lost data cannot be recovered later.

Current ownership boundaries remain correct:

- `ClaudeSdkClient` and `claude-sdk-model-normalizer.ts` own adaptation from the first-party SDK.
- `ModelInfo` owns common model-catalog metadata.
- GraphQL `ModelDetail` owns server-to-client projection.
- `useRuntimeScopedModelSelection` owns conversion from catalog rows into model-picker options.
- `SearchableGroupedSelect` owns generic grouped-option filtering and rendering.

No caller bypass, duplicate discovery policy, mixed owner, or misplaced file was found. The target design extends these existing boundaries instead of adding a new service or Claude-specific frontend policy.

## Intended Change

Preserve the live SDK model description as one optional plain-text catalog attribute, carry it through the existing server/frontend model contract, and let the shared grouped selector render and search it. Keep display name, description, and executable model identifier semantically separate:

```text
identifier:  "sonnet"                              # execution and persistence
name:        "Sonnet"                              # primary label
description: "Sonnet 5 · Efficient for routine tasks" # dynamic selection guidance
```

The selected/closed trigger remains compact and unchanged. The open option row shows the description as wrapped secondary text. A missing description produces the current one-line row.

## Supplemental Solution Artifacts

| Artifact Path | Purpose | Related Requirement / Acceptance-Criteria IDs | Relationship To This Design | Status / Approval |
| --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/claude-agent-sdk-model-descriptions/ui-ux-spec.md` | Defines option hierarchy, search, wrapping, selected-label behavior, fallback, and responsive states | REQ-003–REQ-006, REQ-008, REQ-010; AC-003–AC-005, AC-007–AC-009 | Constrains frontend option projection and shared selector rendering | `Refined`; approved by user on 2026-07-13 |

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): `Bug Fix / Behavior Change`
- Current design issue found (`Yes`/`No`/`Unclear`): `No`
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): `Missing Invariant`
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): `No`
- Evidence: The SDK already supplies the required description. The established adapter and transport path drops it; all affected callers already use the correct catalog and selector owners. The investigation found no duplicated Claude table, direct SDK access from UI, or mixed-level dependency.
- Design response: Add a semantically singular optional description member through the existing adapter/DTO/API/option chain and extend the existing generic renderer.
- Refactor rationale: The current owner, boundary, API subject, file placement, and identity model remain healthy. A new subsystem or file split would fragment a small mapping concern.
- Intentional deferrals and residual risk, if any: Full keyboard/listbox accessibility modernization of `SearchableGroupedSelect` is outside this approved scope. The description is still placed in the option's visible text subtree, rendered as plain text, and does not worsen current focus/pointer behavior.

## Terminology

- `Model identifier`: Stable value used for selection, persistence, and runtime invocation, such as `sonnet`.
- `Display name`: Short primary label, such as `Sonnet`.
- `Description`: Optional, dynamic, vendor-provided plain-text selection guidance, such as `Sonnet 5 · Efficient for routine tasks`.
- `Catalog model`: Shared `ModelInfo` representation transported from a runtime catalog to GraphQL.
- `Select item`: Generic frontend option representation consumed by `SearchableGroupedSelect`.

## Design Reading Order

This design uses the required order:

1. persisted state remains directly usable without migration;
2. request and return spines remain on existing owners;
3. existing catalog/API/frontend capability areas are extended;
4. reusable shared structures gain one optional property;
5. current folders/files remain the clearest path mapping.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: Remove the information-dropping behavior and description-blind UI assumption in this scope.
- No compatibility wrapper, duplicate display-name encoding, hard-coded fallback table, dual query, or legacy runtime identifier is allowed.
- Optional description is a real domain condition because many model sources do not provide descriptive text; it is not a compatibility mechanism.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject, location, representative shape, and approximate volume: Existing agent/team/application/messaging launch and run configurations store runtime kind, model identifier, and optional model configuration. They do not persist catalog names or descriptions. Volume is irrelevant because no stored record changes.
- Relevant code-model, serialization, semantic, or physical-store change: Add transient catalog/UI description metadata only.
- Normal reader/writer behavior and representative evidence: Existing selection resolution and launch paths key by `modelIdentifier`; writers continue emitting only that identifier plus existing configuration.
- Required semantics and invariants under direct use: Existing identifiers must resolve exactly as today. Description must never become a second identity, persisted value, or invocation parameter.
- Physical-store, privacy/security, disposal/rebuild, and operational constraints: None. Description is plain text returned by the existing catalog read.
- Decision (`Not Affected`/`Directly Usable — No Migration`/`Discard or Rebuild`/`Migration Required`/`Undetermined`): `Directly Usable — No Migration`
- Decision rationale, including concrete benefit versus I/O, downtime, corruption, recovery, and rollout cost: Existing data already contains the complete canonical identity required after the change. Rewriting it would provide no correctness benefit and would wrongly persist dynamic vendor metadata.
- Acceptance criteria or design constraints supported by this decision: REQ-007, REQ-009; AC-006, AC-010.

No migration plan applies.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | `Primary End-to-End` | User opens a runtime model picker | Claude SDK query control receives `supportedModels()` request | Runtime-scoped model catalog path, with `ModelCatalogService` governing runtime dispatch | Proves the current request path is reused and no new discovery path is introduced |
| DS-002 | `Return-Event` | Claude SDK model descriptor | User sees a described model option | Catalog metadata contract projected through existing adapter/API/UI owners | This is the defective return path and the primary change surface |
| DS-003 | `Bounded Local` | User changes search text in open grouped selector | Matching option rows or no-results state render | `SearchableGroupedSelect` | Description-aware search and fallback must remain local to the selector owner |
| DS-004 | `Return-Event` | User selects a described option | Existing run/launch config receives the model identifier | `SearchableGroupedSelect` emission plus owning config form | Protects the identity/persistence invariant |

## Primary Execution Spine(s)

### DS-001 — Runtime catalog request

`RuntimeModelConfigFields or another runtime-scoped consumer -> useRuntimeScopedModelSelection.ensureModelsForRuntime -> llmProviderConfig.fetchProvidersWithModels -> GraphQL availableLlmProvidersWithModels -> LlmProviderService -> ModelCatalogService -> ClaudeModelCatalog -> ClaudeSdkClient -> Claude SDK supportedModels()`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The selected runtime drives one existing catalog request through the frontend store and GraphQL into the server catalog dispatcher, which delegates Claude discovery to the SDK client. | Runtime selection, model catalog query, runtime catalog dispatch, Claude discovery | `ModelCatalogService` for runtime dispatch; `ClaudeSdkClient` for SDK adaptation | Runtime availability, provider grouping, SDK spawn/auth environment |
| DS-002 | The SDK row is normalized into shared `ModelInfo`, projected as GraphQL `ModelDetail`, stored in frontend catalog state, mapped into a `SelectItem`, and rendered as primary name plus optional description. | SDK model descriptor, catalog model, API model, select item, visible option | Each existing boundary owns its projection; `useRuntimeScopedModelSelection` governs model-option mapping | Trimming/null normalization, GraphQL codegen, responsive text layout |
| DS-003 | Selector search normalizes the query and matches it against id, name, selected label, and description, then preserves the current grouped/no-results behavior. | Search term, filtered option group, rendered row | `SearchableGroupedSelect` | Case normalization, empty descriptions |
| DS-004 | Clicking the row emits its unchanged id; config forms continue storing and launching with the identifier, while the description stays transient. | Select item id, emitted model value, config model identifier | Owning config form/store after selector emission | Picker close/search reset |

## Spine Actors / Main-Line Nodes

- `Runtime-scoped model selection surface`: Initiates catalog loading and renders the shared picker.
- `useRuntimeScopedModelSelection`: Owns runtime-specific catalog caching and projection into grouped model options.
- `llmProviderConfig` / GraphQL query: Owns frontend catalog retrieval/state.
- `LlmProviderResolver` / `LlmProviderService`: Owns API exposure and provider grouping.
- `ModelCatalogService`: Owns dispatch to runtime-specific catalogs.
- `ClaudeSdkClient` / normalizer: Owns Claude SDK discovery/adaptation.
- `ModelInfo` / `ModelDetail`: Own shared and transport metadata shapes.
- `SearchableGroupedSelect`: Owns generic rendering, filtering, and id emission.

## Ownership Map

| Main-Line Node | Concrete Ownership |
| --- | --- |
| `ClaudeSdkClient` | SDK module lifecycle, zero-turn catalog query, raw control cleanup |
| `claude-sdk-model-normalizer.ts` | Normalization, deduplication, trimming, and mapping of vendor descriptors |
| `ModelInfo` | Runtime-neutral catalog metadata semantics; identifier/name/description remain separate |
| `LlmProviderResolver` | Nullable GraphQL field definition and transport projection |
| `llmProviderConfig` | Frontend catalog state typed to the GraphQL model contract |
| `useRuntimeScopedModelSelection` | Model-specific projection into generic grouped select items |
| `SearchableGroupedSelect` | Optional description display, search matching, selection emission, and no-result state |

`LlmProviderResolver` is a thin transport boundary; it does not govern discovery. `ClaudeSdkClient` and `ModelCatalogService` remain the deeper owners for runtime discovery/dispatch.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| GraphQL `availableLlmProvidersWithModels` | `LlmProviderService` and `ModelCatalogService` | Stable client transport/query boundary | Claude copy, model discovery, UI formatting |
| `RuntimeModelConfigFields` | `useRuntimeScopedModelSelection` and config form/store | Reusable launch/config surface | Runtime-specific description tables or catalog normalization |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Description loss in `normalizeModelDescriptors()` | SDK metadata is required for informed selection | `NormalizedModelDescriptor.description` and `ModelInfo.description` | `In This Change` | No raw-row side channel |
| Description-blind selector filter/render assumption | Generic options can now include meaningful secondary text | Optional `SelectItem.description` handled by `SearchableGroupedSelect.vue` | `In This Change` | Name-only behavior remains for true absence |
| Any proposed hard-coded Claude description table | It would drift with account/auth/version-dependent discovery | Live SDK `supportedModels()` description | `In This Change` | Such a table must not be introduced |

No source file is removed.

## Return Or Event Spine(s) (If Applicable)

### DS-002 — Descriptive catalog return

`Claude SDK descriptor -> normalizeModelDescriptors -> ModelInfo -> mapLlmModel / GraphQL ModelDetail -> llmProviderConfig ModelInfo -> useRuntimeScopedModelSelection grouped option -> SearchableGroupedSelect option row`

### DS-004 — Selection return

`SearchableGroupedSelect row click -> emit update:modelValue(item.id) -> RuntimeModelConfigFields/config consumer -> existing llmModelIdentifier field -> existing launch/runtime path`

The description stops at catalog/selection display. It is not included in DS-004 data.

## Bounded Local / Internal Spines (If Applicable)

### DS-003 — Selector filtering

- Parent owner: `SearchableGroupedSelect`.
- Chain: `searchTerm -> lowercase normalized query -> id/name/selectedLabel/description match -> nonempty groups -> option rows or existing no-results state`.
- Why it matters: Searching by concrete version or suitability phrase is an approved user behavior and belongs in the generic selector, not in each model-selection caller.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Runtime availability | DS-001 | Runtime-scoped selection | Enables/disables runtimes | Existing prerequisite | Would mix availability with metadata mapping |
| Provider grouping/sorting | DS-001, DS-002 | `LlmProviderService` | Groups mapped rows under provider records | Existing catalog organization | UI or Claude adapter would own generic grouping |
| SDK auth/spawn environment | DS-001 | `ClaudeSdkClient` | Determines live catalog context | Descriptions can vary by context | Hard-coded UI would disagree with live entitlement |
| String normalization | DS-002, DS-003 | Normalizer and selector | Treats whitespace-only description as absent | Stable nullable semantics | Raw whitespace could create blank rows/search matches |
| GraphQL code generation | DS-002 | API/client contract | Synchronizes tracked client types | Prevents schema/query drift | Handwritten divergent client types |
| Responsive wrapping | DS-002 | `SearchableGroupedSelect` | Keeps vendor text readable | Descriptions vary in length | Per-screen CSS divergence |
| Durable coverage | All | Owning files/boundaries | Proves preservation, API projection, option mapping, rendering/search, and identity invariant | Prevent recurrence | Only screenshot/manual confidence |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Vendor descriptor adaptation | Claude runtime management client/normalizer | `Extend` | Already owns all other supported-model fields | N/A |
| Shared catalog metadata | `autobyteus-ts` LLM models | `Extend` | `ModelInfo` is the canonical catalog record | N/A |
| Client API exposure | LLM provider GraphQL types/resolver | `Extend` | Already projects every catalog field | N/A |
| Runtime model UI projection | `useRuntimeScopedModelSelection` | `Extend` | Shared owner across all relevant surfaces | N/A |
| Optional secondary option content | `SearchableGroupedSelect` | `Extend` | Generic grouped picker already owns row/search behavior | N/A |
| Claude description copy | None | `Reuse` live SDK; do not create | SDK already supplies authoritative text | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Shared LLM catalog domain | Optional description semantics | DS-002 | Model catalogs and GraphQL | `Extend` | One field only |
| Claude runtime adapter | Read/merge/map SDK description | DS-001, DS-002 | `ClaudeSdkClient` | `Extend` | No curated table |
| LLM GraphQL transport | Nullable description field | DS-002 | Client catalog consumers | `Extend` | Additive schema field |
| Frontend catalog state | Typed description storage | DS-002 | Runtime selection projection | `Extend` | No persistence |
| Runtime-scoped model selection | Map description to select item | DS-002, DS-004 | All launch/config surfaces | `Extend` | No per-screen mapping |
| Generic grouped selector | Render/search optional description | DS-002, DS-003, DS-004 | Runtime model selection and other generic consumers | `Extend` | Missing description stays one-line |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/llm/models.ts` | Shared LLM catalog | `ModelInfo` | Declare optional catalog description | Existing catalog type owner | N/A |
| `autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-model-normalizer.ts` | Claude adapter | Descriptor normalizer | Preserve, deduplicate, and map description | Existing vendor-field mapper | Yes, `ModelInfo` |
| `autobyteus-server-ts/src/api/graphql/types/llm-provider.ts` | LLM GraphQL transport | `ModelDetail`/mapper | Expose nullable description | Existing API type/projection | Yes, `ModelInfo` |
| `autobyteus-web/graphql/queries/llm_provider_queries.ts` | Frontend catalog transport | LLM query | Request description | Existing catalog query | Yes, GraphQL schema |
| `autobyteus-web/generated/graphql.ts` | Generated client contract | Codegen output | Reflect field/type in operation | Existing tracked output | Yes, GraphQL schema/query |
| `autobyteus-web/stores/llmProviderConfig.ts` | Frontend catalog state | Frontend `ModelInfo` | Type optional description | Existing catalog state type | Yes, GraphQL model concept |
| `autobyteus-web/composables/useRuntimeScopedModelSelection.ts` | Runtime-scoped selection | Option projection | Pass description into select item | Existing shared projection | Yes, `SelectItem` |
| `autobyteus-web/components/agentTeams/SearchableGroupedSelect.vue` | Generic selector | Row/filter owner | Render and search description | Existing option behavior owner | Yes, `SelectItem` |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Catalog description metadata | Existing `ModelInfo` in `autobyteus-ts/src/llm/models.ts` | Shared LLM catalog | All runtime catalog transports use this record | `Yes` — no separate Claude DTO after normalization | `Yes` — description is not embedded in id/name | A kitchen-sink vendor descriptor |
| Optional selector secondary text | Existing `SelectItem` in `SearchableGroupedSelect.vue` | Generic selector | Multiple consumers may safely omit or use it | `Yes` — no alternate `subtitle`/`detail` fields | `Yes` — name remains primary, description secondary | Model-specific option type or arbitrary HTML slot for this task |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `ModelInfo.description` | `Yes` — optional plain-text model selection guidance | `Yes` | `Low` if not concatenated into identity fields | Keep id/name/description separate; trim empty to absence |
| GraphQL `ModelDetail.description` | `Yes` | `Yes` | `Low` | Map directly from shared catalog field, nullable |
| `SelectItem.description` | `Yes` — optional secondary row text | `Yes` | `Low` | Do not duplicate `name` or `selectedLabel` |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/llm/models.ts` | Shared LLM catalog | `ModelInfo` | Add `description?: string | null` | Canonical catalog type already lives here | N/A |
| `autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-model-normalizer.ts` | Claude runtime adapter | Normalizer | Add `description: string | null` to normalized descriptor; parse `payload.description`; merge first nonempty; map to `ModelInfo.description` | All SDK field adaptation stays together | `ModelInfo` |
| `autobyteus-server-ts/src/api/graphql/types/llm-provider.ts` | API transport | `ModelDetail` and `mapLlmModel` | Add nullable `description` and map `model.description ?? null` | One API model projection | `ModelInfo` |
| `autobyteus-web/graphql/queries/llm_provider_queries.ts` | Frontend transport | Catalog operation | Request `description` for LLM models | Existing operation owns requested fields | GraphQL schema |
| `autobyteus-web/generated/graphql.ts` | Generated contract | Codegen | Regenerate updated `ModelDetail` and LLM operation result | Tracked generated source | GraphQL schema/query |
| `autobyteus-web/stores/llmProviderConfig.ts` | Frontend catalog | Store `ModelInfo` | Add optional nullable description | Existing client catalog record | GraphQL model |
| `autobyteus-web/composables/useRuntimeScopedModelSelection.ts` | Runtime selection | Grouped option projection | Add description without changing selected label | One projection covers every runtime surface | `SelectItem` |
| `autobyteus-web/components/agentTeams/SearchableGroupedSelect.vue` | Generic UI | `SelectItem`, filter, row | Add optional description; normalize for display/search; render wrapped secondary line | Generic selector owns generic option presentation | `SelectItem` |
| `autobyteus-server-ts/tests/unit/runtime-management/claude/client/claude-sdk-model-normalizer.test.ts` | Claude adapter coverage | Normalizer tests | Prove description trim/preserve/merge/map and no-description fallback | Existing focused suite | Production descriptor/model types |
| `autobyteus-web/components/agentTeams/__tests__/SearchableGroupedSelect.spec.ts` | Selector coverage | Component tests | Prove render, wrapping semantics, search, missing-description fallback, and identifier emission | New focused test beside owner | `SelectItem` |
| Existing GraphQL/frontend runtime-selection tests selected during implementation | Boundary regression coverage | API/projection tests | Prove API field and grouped option propagation | Extend existing most-local suites rather than create redundant broad suites | Shared contracts |

## Ownership Boundaries

1. The Claude adapter is authoritative for interpreting raw SDK descriptor fields. It outputs runtime-neutral `ModelInfo`; downstream code must not inspect raw Claude rows.
2. `ModelInfo` is authoritative for catalog metadata semantics. GraphQL maps it but does not synthesize description text.
3. GraphQL `ModelDetail` is the server/client boundary. Frontend code must not obtain Claude metadata through filesystem, CLI, or SDK access.
4. `useRuntimeScopedModelSelection` is authoritative for model-to-option projection. Individual agent/team/application/messaging screens must not create their own description mapping.
5. `SearchableGroupedSelect` is authoritative for generic row rendering/filtering. It must not contain `claude_agent_sdk` checks.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `ClaudeSdkClient.listModels()` | Query control and `normalizeModelDescriptors` | `ClaudeModelCatalog` | Catalog/UI calling SDK `supportedModels()` directly | Extend returned `ModelInfo` metadata |
| `ModelCatalogService.listLlmModels(runtimeKind)` | Runtime-specific catalogs | `LlmProviderService` | Resolver branching directly on Claude | Extend catalog contract |
| GraphQL `availableLlmProvidersWithModels` | Provider grouping and catalog projection | Frontend store | Frontend invoking CLI/SDK or server-private endpoint | Add nullable GraphQL field |
| `useRuntimeScopedModelSelection` | Runtime catalog cache and option projection | Shared runtime model surfaces | Per-screen Claude description mapping | Extend `GroupedOption` projection |
| `SearchableGroupedSelect` | Filter/render/select behavior | Model and non-model picker consumers | Caller preformatting description into HTML/name | Extend optional `SelectItem.description` |

## Dependency Rules

Allowed direction:

```text
Claude SDK
-> Claude adapter
-> shared ModelInfo
-> server catalog/provider service
-> GraphQL ModelDetail
-> frontend catalog store
-> runtime model option projection
-> generic selector
```

Forbidden shortcuts:

- Frontend must not import or call Claude SDK/CLI code.
- GraphQL resolver must not own Claude-specific hard-coded descriptions.
- `useRuntimeScopedModelSelection` must not infer descriptions from identifiers.
- `SearchableGroupedSelect` must not branch on runtime/provider/model type.
- Description must not be concatenated into `modelIdentifier`, `canonicalName`, `value`, or persisted config.
- Do not introduce a second `subtitle`, `resolvedModelLabel`, or preformatted HTML representation for the same guidance.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `normalizeModelDescriptors(value)` | Claude model descriptor | Normalize id/name/description/capabilities and deduplicate by identifier | SDK `value`/existing fallback identifiers | Description trimmed independently |
| `toModelInfo(descriptor)` | Catalog model | Produce runtime-neutral metadata | `descriptor.identifier` | Description optional; identity unchanged |
| `availableLlmProvidersWithModels(runtimeKind)` | Runtime model catalog | Expose provider-grouped `ModelDetail` rows | Runtime kind string | Description nullable/additive |
| `useRuntimeScopedModelSelection.groupedModelOptions` | Model selection option | Project model fields into generic option | `modelIdentifier` | Selected label remains provider/name |
| `SearchableGroupedSelect` props/emission | Generic grouped option | Render/filter optional description; emit selected id | `SelectItem.id` | Description never emitted |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| Claude normalizer | `Yes` | `Yes` | `Low` | Keep dedupe key as identifier only |
| GraphQL catalog query | `Yes` | `Yes` | `Low` | Description remains metadata |
| Grouped option projection | `Yes` | `Yes` | `Low` | Preserve `id=modelIdentifier` |
| Selector emission | `Yes` | `Yes` | `Low` | Emit only item id |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Shared catalog metadata | `ModelInfo.description` | `Yes` | Low | Do not rename to vendor-specific wording |
| Normalized Claude row | `NormalizedModelDescriptor.description` | `Yes` | Low | Keep aligned with SDK term |
| GraphQL transport | `ModelDetail.description` | `Yes` | Low | Keep same semantic name |
| Selector item | `SelectItem.description` | `Yes` | Low | Avoid generic `extra`/`metadata` |

## Applied Patterns (If Any)

- `Adapter normalization`: Claude-specific raw fields are converted once at the runtime boundary.
- `Nullable metadata propagation`: One optional field crosses existing typed boundaries without becoming identity/state.
- `Shared projection`: Model-specific catalog data is projected once into a generic UI option.
- `Graceful capability absence`: Runtimes without descriptions retain their compact current row; no fake fallback is created.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/llm/models.ts` | `File` | Shared catalog domain | Optional catalog description type | Existing canonical model metadata | UI or Claude parsing |
| `autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-model-normalizer.ts` | `File` | Claude adapter | Vendor description normalization | Existing SDK descriptor mapper | UI formatting/hard-coded copy |
| `autobyteus-server-ts/src/api/graphql/types/llm-provider.ts` | `File` | API boundary | Nullable transport field/mapping | Existing GraphQL model object | Discovery policy |
| `autobyteus-web/graphql/queries/llm_provider_queries.ts` | `File` | Client API operation | Request field | Existing catalog document | UI formatting |
| `autobyteus-web/generated/graphql.ts` | `File` | Generated API contract | Generated types/operation | Existing tracked output | Hand-authored business logic |
| `autobyteus-web/stores/llmProviderConfig.ts` | `File` | Client catalog state | Typed metadata storage | Existing store contract | Claude-specific rules |
| `autobyteus-web/composables/useRuntimeScopedModelSelection.ts` | `File` | Model option projection | Pass description into select items | Existing shared runtime surface owner | Rendering/CSS |
| `autobyteus-web/components/agentTeams/SearchableGroupedSelect.vue` | `File` | Generic selector | Optional description search/render | Existing generic picker | Runtime/provider branches or raw HTML |

The current relatively flat placement within each established capability area is clearer than creating new one-file folders. Each file remains within its existing owner and no new structural depth is introduced.

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `autobyteus-ts/src/llm/` | `Main-Line Domain-Control` | `Yes` | Low | Shared catalog type remains with LLM domain |
| `autobyteus-server-ts/src/runtime-management/claude/client/` | `Persistence-Provider` (external runtime adapter) | `Yes` | Low | Raw SDK knowledge stays here |
| `autobyteus-server-ts/src/api/graphql/types/` | `Transport` | `Yes` | Low | Only schema/projection changes |
| `autobyteus-web/graphql/` | `Transport` | `Yes` | Low | Query/codegen remain transport-owned |
| `autobyteus-web/stores/` and `composables/` | `Main-Line Domain-Control` (client state/projection) | `Yes` | Low | Existing split between state and UI projection remains useful |
| `autobyteus-web/components/agentTeams/` | `Off-Spine Concern` (shared picker UI) | `Yes` | Low | Despite historical folder name, component is established shared owner; moving it is unrelated and unnecessary |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Metadata shape | `{ model_identifier: "sonnet", display_name: "Sonnet", description: "Sonnet 5 · Efficient for routine tasks" }` | `{ model_identifier: "sonnet — Sonnet 5..." }` | Protects execution identity |
| UI projection | `{ id: model.modelIdentifier, name: model.name, description: model.description }` | `{ name: model.name + " — " + hardCodedClaudeCopy[id] }` | Preserves authority and separation |
| Missing description | Render only `item.name` | Render blank subtitle or `No description available` | Keeps non-description consumers unchanged |
| Search | Match normalized `item.description` beside existing fields | Caller-specific Claude search branch | Keeps generic selector behavior coherent |
| Selected value | `Anthropic / Sonnet` in closed trigger; full description when open | Persist or emit `Sonnet 5 · ...` | Keeps approved compact UI and runtime value invariant |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Concatenate description into existing `display_name` to avoid API changes | Minimal visible patch | `Rejected` | Add the actual optional description field through canonical contracts |
| Hard-code screenshot descriptions when SDK field is missing | Would display something without transport work | `Rejected` | Preserve live SDK descriptions; name-only when genuinely absent |
| Add a Claude-only frontend branch/table | Avoid generic selector extension | `Rejected` | Extend `SelectItem` generically and project through shared composable |
| Persist resolved concrete model/description beside alias | Could make closed display stable | `Rejected` | Keep catalog metadata transient and saved identifier unchanged |
| Dual old/new GraphQL queries | Incremental rollout concern | `Rejected` | Update server schema and tracked client operation together in this product repository |

## Derived Layering (If Useful)

```text
External runtime adapter: Claude SDK -> Claude normalizer
Shared catalog domain: ModelInfo
Server application/API: ModelCatalogService -> LlmProviderService -> GraphQL ModelDetail
Client data/projection: GraphQL query -> llmProviderConfig -> useRuntimeScopedModelSelection
Presentation: SearchableGroupedSelect
```

This is explanatory only; ownership and spine rules above are authoritative.

## Change / Refactor Sequence

1. Extend the shared catalog `ModelInfo` with optional nullable `description` semantics.
2. Extend `NormalizedModelDescriptor`; normalize SDK `payload.description` with `asString`, preserve the first nonempty value when duplicate identifiers merge, and map it to `ModelInfo`.
3. Update focused Claude normalizer coverage for preservation, whitespace absence, duplicate merge, and `toModelInfo` output.
4. Add nullable GraphQL `ModelDetail.description` and `mapLlmModel` projection; add/extend the most local server API coverage.
5. Request `description` in the frontend LLM catalog query and regenerate the tracked GraphQL client output from the updated schema/query.
6. Extend the frontend catalog `ModelInfo` type and `useRuntimeScopedModelSelection` option projection.
7. Extend `SelectItem` and `SearchableGroupedSelect` filtering/rendering with optional plain-text description, responsive wrapping, and unchanged identifier emission/closed label.
8. Add focused component coverage and extend one runtime-selection projection test so description propagation is proven without duplicating every consuming screen.
9. Run implementation-scoped type/build/unit checks. Downstream API/E2E owns broader GraphQL execution and browser/live validation decisions.
10. Remove any temporary probe/test setup; do not leave a curated description table, compatibility query, or generated-source drift.

No temporary production seam or migration phase is required.

## Key Tradeoffs

- **Separate field vs concatenated name:** A separate field requires a small cross-contract change but preserves identity, supports secondary styling/search, and avoids overloading display name. This is chosen.
- **Live vendor text vs curated copy:** Live text can change and may include usage/pricing information, but it matches the actual runtime/account catalog. Hard-coded copy would drift. Live text is chosen.
- **Shared selector extension vs per-screen rendering:** A shared optional property changes one generic component but yields consistent behavior across all runtime surfaces and keeps non-model consumers unchanged. Shared extension is chosen.
- **Compact closed label vs full description:** Keeping the current selected label prevents unstable/truncated controls; the approved user goal is informed comparison in the open list. Compact closed label is chosen.
- **No full accessibility rewrite:** The approved task stays bounded. Visible text association and current focus behavior are preserved, with broader listbox semantics left outside scope.

## Risks

- Vendor descriptions may become much longer or include different separators/content. Mitigation: plain-text wrapped secondary line with no horizontal overflow.
- Generated GraphQL output can drift if edited manually. Mitigation: use the established codegen path and review the generated delta.
- A test that proves only rendering could miss adapter/API loss. Mitigation: cover normalizer, API projection, option projection, and component behavior proportionately.
- Generic selector styling can regress name-only consumers. Mitigation: conditional secondary line and explicit name-only component test.
- SDK returns whitespace/duplicate descriptor rows. Mitigation: reuse `asString` and current identifier-based merge, preserving first nonempty description.

## Guidance For Implementation

- Treat the SDK `description` as untrusted plain text: render with Vue interpolation only.
- Do not add `resolvedModel` solely to reconstruct the description; the SDK already provides complete user-facing guidance.
- Keep `description` optional/nullable at shared boundaries because absence is a valid current runtime capability state, not legacy compatibility.
- Do not change sorting: current server sorting by `name` remains authoritative.
- Do not change selected labels: `getModelSelectionSelectedLabel` continues producing provider/name only.
- Use a flexible `min-w-0` text container and non-shrinking checkmark; allow description wrapping.
- Description-aware filtering must preserve current id/name/selected-label matching and current grouped/no-results behavior.
- Add no Claude condition to frontend presentation code.
- Keep test edits proportional: focused owner tests plus one boundary/projection test are preferable to copying the same assertion across every consumer.
