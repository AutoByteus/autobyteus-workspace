# Design Spec

## Revision Note

2026-06-20 architecture review round 1 raised AR-001 against the reload return path. This revision assigns open-modal selected-tool synchronization to `ToolsManagementWorkspace.vue`, defines the `ToolDetailsModal` `schema-reloaded` event contract, and adds tests proving the modal updates after Reload Schema without close/reopen.

## Current-State Read

The current Tool Details path is flat even though the underlying tool schema can be nested:

`Tool registry ParameterSchema -> GraphQL ToolDefinitionConverter -> frontend tool queries/store -> ToolDetailsModal flat table`

Current facts from the investigation:

- `gpt-4o-mini-tts` is the persisted default speech model in `/Users/normy/.autobyteus/server-data/.env`.
- The live audio model catalog exposes `gpt-4o-mini-tts.configSchema.properties.voice`, `format`, and `instructions`.
- The live `generate_speech` local tool schema includes top-level `generation_config` for configured `gpt-4o-mini-tts`.
- `autobyteus-ts/src/utils/parameter-schema.ts` can render nested object schema through `ParameterDefinition.toJsonSchemaProperty()` and `ParameterSchema.toJsonSchema()`.
- `autobyteus-server-ts/src/api/graphql/types/tool-definition.ts` exposes only flat `ToolParameterDefinition` fields: `name`, `paramType`, `description`, `required`, `defaultValue`, and `enumValues`.
- `autobyteus-server-ts/src/api/graphql/converters/tool-definition-converter.ts` drops `objectSchema`/JSON-schema details during GraphQL projection.
- `autobyteus-web/components/tools/ToolDetailsModal.vue` renders only the flat `argumentSchema.parameters` array.
- `autobyteus-web/components/tools/ToolsManagementWorkspace.vue` passes the modal `:tool="selectedTool"`, where `selectedTool` is a standalone `ref<Tool | null>` set when details open.
- `autobyteus-web/stores/toolManagementStore.ts` `reloadToolSchema()` returns the updated tool but replaces store collection entries immutably, so an already-open modal will not automatically receive the new object unless the parent replaces `selectedTool`.

The target design must keep the actual invocation contract unchanged: `voice` remains nested under `generation_config`, not promoted to a top-level `voice` argument.

Runtime Agent Tools MCP schema cache behavior is intentionally out of scope for this change.

## Intended Change

Expose nested per-parameter JSON Schema through the tool-definition GraphQL boundary, query it from the web frontend, render nested object properties under their parent object parameter in Tool Details, and explicitly synchronize the parent-owned selected tool after Reload Schema returns an updated tool.

For the reported case, the Tool Details modal should make this visible:

```text
generation_config  OBJECT  No
  voice             STRING  No   enum: alloy, ash, ...
  format            STRING  No   enum: mp3, wav
  instructions      STRING  No
```

This is display/projection only. The execution input remains:

```json
{
  "prompt": "Hello",
  "output_file_path": "speech.wav",
  "generation_config": {
    "voice": "coral",
    "format": "wav"
  }
}
```

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix / UX Improvement
- Current design issue found (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Shared Structure Looseness
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes, narrow schema-boundary refactor
- Evidence: The core schema source can express nested object properties, but the GraphQL DTO and frontend type/rendering boundary flatten away nested shape. The UI screenshot shows the consequence: a generic `generation_config` row with no nested options.
- Design response: Extend the existing tool-definition schema projection with an additive JSON Schema field per parameter, then render that nested schema in the existing Tool Details modal through a small tool-display row mapper.
- Refactor rationale: Keeping the flat-only DTO would require hard-coding media-specific details or adding a one-off UI lookup against audio model schemas, which would bypass the authoritative tool schema boundary. The correct boundary is the tool-definition projection itself.
- Intentional deferrals and residual risk, if any: Agent Tools MCP runtime schema cache refresh is out of scope by user decision. Existing runtime sessions may still require restart/recreation for their own schema snapshot behavior, but this ticket only fixes the Tools UI/schema projection.

## Terminology

- Tool parameter: one `ParameterDefinition` inside a tool `ParameterSchema`.
- Parameter JSON Schema: the JSON Schema property produced by `ParameterDefinition.toJsonSchemaProperty()` for one parameter.
- Display row: a frontend-only row derived from top-level tool parameters plus nested JSON Schema properties for rendering.
- Nested object parameter: a tool parameter whose JSON Schema `type` is `object` and whose schema contains `properties`.

## Design Reading Order

1. Preserve the tool registry as source of truth.
2. Extend GraphQL projection to carry nested schema.
3. Extend frontend query/type/store boundaries to receive nested schema.
4. Convert nested schema into display rows in the Tool Details UI.
5. Add backend and frontend regression coverage.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove the implicit flat-only assumption from the tool details projection/display path.
- No public tool execution behavior is replaced; this is an additive schema projection and UI rendering fix.
- Do not create media-specific compatibility branches such as `if tool.name === "generate_speech" then fetch audio model config`. The clean-cut replacement is generic nested schema projection from the existing tool schema source.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | User opens Tool Details for a tool | Modal displays flat and nested parameter rows | Tools UI + tool-definition GraphQL boundary | This is the reported user-visible path. |
| DS-002 | Primary End-to-End | User clicks Reload Schema | Open modal receives the returned updated tool and rerenders nested rows without close/reopen | Tool Management store + `ToolsManagementWorkspace` selected-tool owner | Existing refresh behavior must continue with the expanded schema and cannot rely on stale object references. |
| DS-003 | Bounded Local | Tool parameter list enters frontend display mapper | Ordered display rows with depth/path metadata | Tool schema display row mapper | Keeps recursive JSON Schema traversal out of the Vue template. |

## Primary Execution Spine(s)

- DS-001: `Tool registry ParameterSchema -> ToolDefinitionConverter -> GraphQL tool query -> ToolManagementStore -> ToolDetailsModal -> user-visible nested rows`
- DS-002: `Reload Schema button -> ToolDetailsModal.reloadSchema -> reloadToolSchema mutation -> ToolDefinitionConverter -> ToolManagementStore collection update -> ToolDetailsModal emits schema-reloaded(updatedTool) -> ToolsManagementWorkspace replaces selectedTool -> ToolDetailsModal receives fresh tool prop and rerenders`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The backend converts the authoritative tool `ParameterSchema` into a GraphQL tool definition that preserves each parameter's JSON Schema. The web query and store carry that schema to the modal, where a display mapper expands object properties into nested rows. | ParameterSchema, ToolDefinitionConverter, GraphQL tool query, ToolManagementStore, ToolDetailsModal | Tool-definition GraphQL boundary and Tools UI | Codegen, generated TypeScript types, JSON Schema parsing, component styling |
| DS-002 | Reloading a tool schema continues to use the existing mutation path. The returned `ToolDefinitionDetail` now carries `jsonSchema`; after the store updates its collections, the modal emits `schema-reloaded` with the returned tool and the parent workspace replaces its `selectedTool` ref so the still-open modal receives the new prop and rerenders nested rows. | ReloadToolSchema mutation, ToolManagementStore, ToolDetailsModal, ToolsManagementWorkspace selected-tool state | ToolManagementStore for collections; ToolsManagementWorkspace for selected open-modal state | Toasts/loading state, generated mutation types, local component event payload |
| DS-003 | A pure mapper takes `ToolParameter[]` and emits rows. Top-level rows come from GraphQL parameter fields; nested rows come from `jsonSchema.properties`, required arrays, default, enum, and type data. | ToolParameter[], ToolSchemaDisplayRow[] | Frontend display row mapper | Type normalization, recursion limit/guard, array item handling |

## Spine Actors / Main-Line Nodes

- Core `ParameterSchema` / `ParameterDefinition`
- Backend `ToolDefinitionConverter`
- GraphQL `ToolParameterDefinition`
- Frontend GraphQL tool operations and generated types
- `ToolManagementStore`
- `ToolsManagementWorkspace` selected-tool state
- Tool schema display row mapper
- `ToolDetailsModal`

## Ownership Map

| Node | Owns |
| --- | --- |
| Core `ParameterSchema` / `ParameterDefinition` | Authoritative tool argument schema and JSON Schema conversion. |
| `ToolDefinitionConverter` | Transport projection from core tool definitions to GraphQL DTOs. |
| GraphQL `ToolParameterDefinition` | Public GraphQL shape for one tool parameter, including additive raw JSON Schema property data. |
| Frontend GraphQL operations/generated types | Transport contract consumed by web stores. |
| `ToolManagementStore` | Fetching/reloading tool definitions, replacing tool collections with returned schema data, and returning the updated tool from reload actions. |
| `ToolsManagementWorkspace` | Parent-owned open modal selection state; replaces `selectedTool` when reload returns the currently selected tool. |
| Tool schema display row mapper | Frontend-only transformation from schema data to renderable nested rows. |
| `ToolDetailsModal` | User-facing presentation, reload button state, and emitting `schema-reloaded(updatedTool)` after a successful reload; it does not own selected-tool state. |

The Tool Details modal is a presentation boundary, not the owner of schema interpretation logic beyond consuming display rows.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| GraphQL `tools` query | Tool Management resolver + `ToolDefinitionConverter` | Public web query entrypoint for tool definitions. | JSON Schema generation logic. |
| GraphQL `reloadToolSchema` mutation | Tool registry reload + `ToolDefinitionConverter` | Public web command to refresh one tool definition. | Frontend display transformation. |
| `ToolDetailsModal` | Tool schema display row mapper for row derivation plus parent `schema-reloaded` event contract | User-facing modal shell and reload initiator. | Backend schema projection, media-model-specific rules, or parent selected-tool ownership. |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Flat-only tool parameter projection assumption | It hides valid nested object properties. | `ToolParameterDefinition.jsonSchema` populated by `ToolDefinitionConverter`. | In This Change | Additive field; no existing flat fields removed. |
| Flat-only modal row derivation | It cannot represent `generation_config.voice`. | Tool schema display row mapper and updated modal table. | In This Change | Existing flat rows remain represented as depth 0 rows. |
| Media-specific workaround idea | It would bypass the tool schema boundary and duplicate model-catalog policy in UI. | Generic nested schema projection. | In This Change | Do not implement special-case `generate_speech`. |
| Stale selected-tool reload assumption | Current modal assumes reactive props update after store replacement, but the parent keeps a separate selected object. | `ToolDetailsModal` emits `schema-reloaded(updatedTool)`; `ToolsManagementWorkspace` replaces `selectedTool`. | In This Change | Remove/update the misleading comment in `ToolDetailsModal.vue`. |

## Return Or Event Spine(s) (If Applicable)

- DS-002 local component return/event spine: `ToolDetailsModal.reloadSchema() -> store.reloadToolSchema(name) returns { success, tool } -> modal emits schema-reloaded(updatedTool) -> ToolsManagementWorkspace.handleToolSchemaReloaded(updatedTool) -> selectedTool.value = updatedTool -> modal prop updates`.
- This is not a backend pub/sub event; it is a local Vue component event that makes the reload return path explicit across the modal/parent boundary.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: Tool schema display row mapper
- Chain: `Top-level ToolParameter -> read parameter jsonSchema -> append top-level row -> recursively read object properties/items -> append child rows with depth/path -> return ordered rows`
- Why it matters: JSON Schema traversal can become template clutter or be inconsistently implemented if left inside the modal. The mapper keeps this bounded local flow testable and reusable within the Tools UI.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| GraphQL JSON scalar exposure | DS-001, DS-002 | ToolDefinitionConverter / GraphQL DTO | Carry raw JSON Schema objects through GraphQL. | Avoids hand-modeling every JSON Schema field recursively in GraphQL. | Recursive DTO overbuild or incomplete field projection. |
| Codegen/generated types | DS-001, DS-002 | Frontend GraphQL operations/store | Keep frontend types aligned with backend schema. | Prevents manual type drift. | Runtime fields present but TypeScript/store cannot safely use them. |
| Display row normalization | DS-003 | ToolDetailsModal | Convert schema data into rows with depth/path/default/enum. | Keeps rendering simple and testable. | Vue template becomes a schema parser. |
| Component styling | DS-001 | ToolDetailsModal | Visually distinguish nested rows. | Users must see nesting, not a fake top-level parameter. | UI misrepresents invocation shape. |
| Regression tests | DS-001, DS-002, DS-003 | Backend projection and frontend display owners | Verify nested schema projection and rendering. | Prevents recurrence for object parameters. | Future schema changes can silently flatten again. |
| Selected-tool synchronization | DS-002 | `ToolsManagementWorkspace` | Replace the open modal's selected tool after successful reload. | Store collection replacement does not mutate the old selected object. | Modal displays stale schema until close/reopen. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Backend schema transport | `autobyteus-server-ts/src/api/graphql/types/tool-definition.ts` and converter | Extend | Existing GraphQL tool-definition boundary already owns this projection. | N/A |
| Core nested schema source | `autobyteus-ts/src/utils/parameter-schema.ts` | Reuse | Already converts object schemas into JSON Schema. | N/A |
| Frontend tool data | `autobyteus-web/graphql/*`, `generated/graphql.ts`, `stores/toolManagementStore.ts` | Extend | Existing Tools UI data path already owns tool definitions. | N/A |
| Nested row derivation | Tools UI component area | Create New small helper | No existing helper owns display rows for nested tool schemas. | Generic LLM config schema utilities target different settings-form behavior, not read-only tool parameter display. |
| Modal rendering | `ToolDetailsModal.vue` | Extend | Existing modal owns user-facing parameter display and reload button action. | N/A |
| Open-modal selected-tool refresh | `ToolsManagementWorkspace.vue` | Extend | Existing workspace owns `selectedTool` passed to the modal. | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Backend Tool Management GraphQL | Tool definition DTO and converter projection | DS-001, DS-002 | ToolDefinitionConverter | Extend | Add `jsonSchema` field to parameter DTO. |
| Core Tool Schema | Source JSON Schema conversion | DS-001, DS-002 | ParameterSchema | Reuse | No core changes expected unless type helpers are needed. |
| Frontend Tools Data | GraphQL operations, generated types, store interfaces | DS-001, DS-002 | ToolManagementStore | Extend | Add `jsonSchema` to selections and types. |
| Frontend Tools Presentation | Display rows and ToolDetailsModal rendering | DS-001, DS-003 | ToolDetailsModal + row mapper | Extend/Create New helper | Keep mapper near Tools UI. |
| Frontend Tools Workspace State | Open Tool Details modal selection and post-reload selected-tool replacement | DS-002 | ToolsManagementWorkspace | Extend | Parent workspace already owns the modal's `selectedTool`; reload synchronization belongs here, not in the store or modal prop mutation. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/api/graphql/types/tool-definition.ts` | Backend Tool Management GraphQL | GraphQL DTO | Add JSON scalar field for parameter JSON Schema. | Existing type owner for tool parameter DTO. | Reuses GraphQLJSON. |
| `autobyteus-server-ts/src/api/graphql/converters/tool-definition-converter.ts` | Backend Tool Management GraphQL | Projection converter | Populate `jsonSchema` from `coreParam.toJsonSchemaProperty()`. | Existing converter owner. | Reuses core `ParameterDefinition`. |
| `autobyteus-web/graphql/queries/toolQueries.ts` | Frontend Tools Data | Tool queries | Select `jsonSchema` in tool queries. | Existing query definitions. | Reuses GraphQL field. |
| `autobyteus-web/graphql/mutations/toolMutations.ts` | Frontend Tools Data | Tool reload mutation | Select `jsonSchema` in reload return. | Existing mutation definition. | Reuses GraphQL field. |
| `autobyteus-web/graphql/mutations/mcpServerMutations.ts` | Frontend Tools Data | MCP discovery mutation | Select `jsonSchema` for discovered tools if they share `ToolDefinitionDetail`. | Keeps shared shape complete. | Reuses GraphQL field. |
| `autobyteus-web/generated/graphql.ts` | Frontend generated artifacts | Generated GraphQL types | Reflect backend schema and operation changes. | Canonical generated output. | N/A generated. |
| `autobyteus-web/stores/toolManagementStore.ts` | Frontend Tools Data | Store type boundary | Add `jsonSchema` to `ToolParameter`. | Existing local store interface. | Reuses generated type shape. |
| `autobyteus-web/components/tools/toolParameterDisplayRows.ts` | Frontend Tools Presentation | Display mapper | Convert tool parameters with JSON Schema into nested display rows. | Keeps schema traversal out of modal. | Reuses store `ToolParameter` type. |
| `autobyteus-web/components/tools/ToolDetailsModal.vue` | Frontend Tools Presentation | Modal UI | Render display rows with indentation/path/default/enum and emit `schema-reloaded(updatedTool)` after successful reload. | Existing presentation owner. | Reuses display rows and store reload result. |
| `autobyteus-web/components/tools/ToolsManagementWorkspace.vue` | Frontend Tools Workspace State | Parent modal state owner | Listen for `schema-reloaded` and replace `selectedTool` when the returned tool matches the current selected tool. | Existing owner of `selectedTool`. | Reuses store `Tool` type. |
| Backend converter test | Backend Tool Management GraphQL | Projection coverage | Verify nested object schema is projected. | Focused unit coverage. | N/A |
| Frontend modal/mapper test | Frontend Tools Presentation | Rendering/mapper coverage | Verify nested `generation_config.voice` display. | Focused UI or utility coverage. | N/A |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Nested schema to display row conversion | `autobyteus-web/components/tools/toolParameterDisplayRows.ts` | Frontend Tools Presentation | Used by modal and directly testable; avoids embedding recursion in template. | Yes | Yes | A generic form renderer or media-model-specific parser. |
| Parameter JSON Schema transport | Existing `ToolParameterDefinition.jsonSchema` field | Backend Tool Management GraphQL | All tool parameters can share one additive schema field. | Yes | Yes | A duplicate custom schema vocabulary unrelated to JSON Schema. |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `ToolParameterDefinition.jsonSchema` | Yes | Yes | Low | Define it as the JSON Schema property for this parameter, not the whole tool schema. |
| `ToolSchemaDisplayRow` | Yes | Yes | Low | Derive from source schema; include only render-oriented fields: path/name/depth/type/required/description/default/enum. |
| Existing flat fields plus `jsonSchema` | Yes | N/A | Medium | Treat flat fields as backward-compatible top-level summary; nested display should use `jsonSchema` only for details, not introduce conflicting values. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/api/graphql/types/tool-definition.ts` | Backend Tool Management GraphQL | GraphQL DTO | Add nullable `jsonSchema: GraphQLJSON` to `ToolParameterDefinition`. | Existing DTO owner. | Yes, GraphQLJSON. |
| `autobyteus-server-ts/src/api/graphql/converters/tool-definition-converter.ts` | Backend Tool Management GraphQL | Projection converter | Add `jsonSchema: coreParam.toJsonSchemaProperty()` in `paramToGraphql`. | Existing projection owner. | Yes, core schema conversion. |
| `autobyteus-web/graphql/queries/toolQueries.ts` | Frontend Tools Data | Tool queries | Add `jsonSchema` selection to `GET_TOOLS` and grouped query. | Existing operation owner. | Yes. |
| `autobyteus-web/graphql/mutations/toolMutations.ts` | Frontend Tools Data | Tool reload mutation | Add `jsonSchema` selection. | Existing operation owner. | Yes. |
| `autobyteus-web/graphql/mutations/mcpServerMutations.ts` | Frontend Tools Data | MCP discovery mutation | Add `jsonSchema` selection for discovered tool details. | Keeps shared shape consistent. | Yes. |
| `autobyteus-web/generated/graphql.ts` | Frontend generated artifacts | Codegen output | Regenerate or minimally align generated types/documents. | Canonical generated artifact. | N/A. |
| `autobyteus-web/stores/toolManagementStore.ts` | Frontend Tools Data | Store type boundary | Add `jsonSchema` to `ToolParameter`; avoid manual transformation if GraphQL shape already matches. | Existing store interface owner. | Yes. |
| `autobyteus-web/components/tools/toolParameterDisplayRows.ts` | Frontend Tools Presentation | Display row mapper | Build ordered nested rows from `ToolParameter[]`. | One focused pure helper. | Yes. |
| `autobyteus-web/components/tools/ToolDetailsModal.vue` | Frontend Tools Presentation | Modal UI | Render `displayRows` instead of raw `parameters`; indent child rows and show enum/default; emit `schema-reloaded(updatedTool)` after successful reload. | Existing modal owner. | Yes. |
| `autobyteus-web/components/tools/ToolsManagementWorkspace.vue` | Frontend Tools Workspace State | Selected-tool owner | Bind `@schema-reloaded="handleToolSchemaReloaded"`; replace `selectedTool` only when it still refers to the same selected tool name. | Existing parent workspace owner. | Yes. |
| `autobyteus-server-ts/tests/unit/api/graphql/converters/tool-definition-converter.test.ts` or nearest existing converter test location | Backend tests | Projection coverage | Assert nested object parameter JSON schema is present. | Focused backend regression. | N/A. |
| `autobyteus-web/components/tools/__tests__/ToolDetailsModal.spec.ts` and/or `toolParameterDisplayRows.spec.ts` | Frontend tests | UI/mapper coverage | Assert nested `generation_config.voice` appears with enum and not as top-level-only. | Focused frontend regression. | N/A. |
| `autobyteus-web/components/tools/__tests__/ToolsManagementWorkspace.spec.ts` or a parent-wired modal integration test | Frontend tests | Reload synchronization coverage | Assert an already-open modal displays nested rows from the returned tool after Reload Schema without close/reopen. | Covers AR-001. | N/A. |

## Ownership Boundaries

- Core `ParameterSchema` remains the authoritative owner of tool parameter semantics.
- Backend GraphQL owns transport projection, not schema reinterpretation.
- Frontend store owns retrieval and storage of tool definitions, not nested schema parsing policy or open modal selection state.
- `ToolsManagementWorkspace` owns the selected open-modal tool reference and must synchronize it after reload.
- The display mapper owns UI-oriented row derivation.
- The modal owns presentation, reload button state, row rendering, and emitting the successful reload payload to the parent.

No caller should bypass the tool-definition boundary to fetch media model config only to explain a tool parameter. That would mix UI display with provider/model catalog internals.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `ToolDefinitionConverter` / GraphQL `ToolDefinitionDetail` | Core `ParameterSchema` and JSON Schema conversion | Web tool queries, tool reload mutation consumers | Frontend directly correlates `generate_speech` with audio model catalog to infer `generation_config` keys | Add schema data to `ToolDefinitionDetail`, as designed. |
| `ToolManagementStore` | GraphQL query/mutation result handling | Tool management components | Components issuing ad hoc duplicate tool queries for nested schema | Extend store type/query shape. |
| `ToolsManagementWorkspace` selected-tool state | The currently open Tool Details modal selection | `ToolDetailsModal` via event contract | Modal mutates props or assumes store replacement mutates the selected object | Emit returned tool and replace `selectedTool` in the parent. |
| Tool schema display row mapper | JSON Schema traversal details | `ToolDetailsModal` | Modal template recursively interpreting raw schema inline | Keep traversal in pure helper. |

## Dependency Rules

Allowed:

- `ToolDefinitionConverter` may call `ParameterDefinition.toJsonSchemaProperty()`.
- GraphQL type definitions may depend on `GraphQLJSON` for raw schema payloads.
- Frontend queries/mutations may select `jsonSchema` from `ToolParameterDefinition`.
- `ToolDetailsModal` may depend on the display row mapper.
- `ToolDetailsModal` may emit `schema-reloaded` with the returned `Tool` after `store.reloadToolSchema` succeeds.
- `ToolsManagementWorkspace` may replace its `selectedTool` ref from the emitted updated tool.

Forbidden:

- Do not special-case `generate_speech` in the modal or store.
- Do not query `availableAudioProvidersWithModels` from Tool Details to explain `generation_config`.
- Do not flatten `generation_config.voice` into a top-level tool argument.
- Do not duplicate OpenAI or Gemini voice lists in frontend display code.
- Do not make generated GraphQL types diverge from query documents.
- Do not rely on immutable store collection replacement to mutate the object already held in `selectedTool`.
- Do not let the modal mutate its `tool` prop or directly own parent selection state.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| GraphQL `ToolParameterDefinition.jsonSchema` | One tool parameter's JSON Schema property | Expose nested schema details for display | Field nested inside one parameter object | Additive nullable field. |
| `GET_TOOLS` | Tool definitions by origin/source | Fetch tool list with parameter schemas | Optional `origin`, optional `sourceServerId` | Add `jsonSchema` selection. |
| `GET_TOOLS_GROUPED_BY_CATEGORY` | Tool definitions grouped by category | Fetch grouped tool list with parameter schemas | Required `origin` | Add `jsonSchema` selection. |
| `RELOAD_TOOL_SCHEMA` | One tool definition by name | Reload and return current tool schema | `name: string` | Returned tool should include `jsonSchema`. |
| `ToolDetailsModal` `schema-reloaded` event | Updated open-modal tool definition | Notify parent that a reload returned a replacement tool object | Payload: `Tool` from `reloadToolSchema` result | Emitted only on successful reload with a returned tool. |
| `ToolsManagementWorkspace.handleToolSchemaReloaded(updatedTool)` | Current Tool Details selection | Replace parent-owned `selectedTool` for the open modal | Payload: `Tool`; guard by current selected tool name | No store lookup needed; use returned authoritative mutation payload. |
| `buildToolParameterDisplayRows(parameters)` | Tool parameter display rows | Derive nested rows for display | `ToolParameter[]` | Pure frontend function; no network/model lookup. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `ToolParameterDefinition.jsonSchema` | Yes | Yes | Low | Field means this parameter's JSON Schema property only. |
| Tool queries/mutation | Yes | Yes | Low | Preserve existing args. |
| Display row mapper | Yes | Yes | Low | Accepts already-fetched parameters only. |
| `schema-reloaded` event | Yes | Yes | Low | Carries one updated `Tool`; parent validates against current selected tool before replacement. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Parameter schema field | `jsonSchema` | Yes | Low | Document as per-parameter JSON Schema property. |
| Display mapper | `toolParameterDisplayRows.ts` / `buildToolParameterDisplayRows` | Yes | Low | Keep tool-display-specific. |
| Display row type | `ToolParameterDisplayRow` | Yes | Low | Include `path` and `depth` to clarify nested rendering. |

## Applied Patterns (If Any)

- Adapter/projection pattern: `ToolDefinitionConverter` adapts core tool schema to GraphQL DTOs.
- Pure mapper pattern: `toolParameterDisplayRows.ts` maps transport data into render-oriented rows.

Both remain local patterns under clear owners; no new broad framework is introduced.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/api/graphql/types/tool-definition.ts` | File | Backend Tool Management GraphQL | Tool GraphQL DTOs, including per-parameter JSON Schema field. | Existing GraphQL type owner. | Core schema generation logic. |
| `autobyteus-server-ts/src/api/graphql/converters/tool-definition-converter.ts` | File | Backend Tool Management GraphQL | Projection from core `ToolDefinition` to GraphQL DTO. | Existing converter owner. | Frontend display decisions. |
| `autobyteus-web/graphql/queries/toolQueries.ts` | File | Frontend GraphQL operations | Tool query document selections. | Existing query owner. | UI display parsing. |
| `autobyteus-web/graphql/mutations/toolMutations.ts` | File | Frontend GraphQL operations | Reload mutation selection. | Existing mutation owner. | UI display parsing. |
| `autobyteus-web/graphql/mutations/mcpServerMutations.ts` | File | Frontend GraphQL operations | MCP discovery returned tool selection. | Existing operation owner for discovered tool definitions. | UI display parsing. |
| `autobyteus-web/generated/graphql.ts` | File | Generated GraphQL artifacts | Generated schema/operation types and documents. | Existing generated output location. | Hand-authored business logic. |
| `autobyteus-web/stores/toolManagementStore.ts` | File | ToolManagementStore | Tool parameter type shape and tool list/reload state. | Existing store owner. | Recursive JSON Schema rendering logic. |
| `autobyteus-web/components/tools/toolParameterDisplayRows.ts` | File | Tools presentation helper | Convert parameters into nested display rows. | Tool UI-specific and testable. | Network calls, model-catalog lookups, execution parsing. |
| `autobyteus-web/components/tools/ToolDetailsModal.vue` | File | Tools presentation | Render nested rows, run reload action, and emit returned updated tool. | Existing modal. | Provider/model-specific hard-coding or selected-tool ownership. |
| `autobyteus-web/components/tools/ToolsManagementWorkspace.vue` | File | Tools workspace state | Own selected Tool Details modal state and synchronize selected tool after reload. | Existing parent that owns `selectedTool`. | JSON Schema parsing or provider/model-specific hard-coding. |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/api/graphql/types` | Transport | Yes | Low | GraphQL DTO definitions only. |
| `autobyteus-server-ts/src/api/graphql/converters` | Transport adapter/projection | Yes | Low | Existing converter location. |
| `autobyteus-web/graphql` | Transport documents | Yes | Low | Existing GraphQL operation location. |
| `autobyteus-web/stores` | Frontend state | Yes | Low | Existing tool store. |
| `autobyteus-web/components/tools` | Presentation + local display helper + parent workspace state | Yes | Low | Helper is local to tools presentation; workspace keeps existing selected-tool ownership. No broader store-selected-tool owner is introduced for this narrow modal path. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Invocation shape | `{ generation_config: { voice: "coral" } }` shown as nested under `generation_config` | `{ voice: "coral" }` implied as top-level | Prevents users/agents from calling the tool incorrectly. |
| Schema source | `jsonSchema` from `ParameterDefinition.toJsonSchemaProperty()` | UI hard-codes OpenAI voice list | Keeps provider schema authoritative in backend/catalog. |
| UI rendering | Parent `generation_config` row followed by indented child rows `voice`, `format`, `instructions` | Only a generic `OBJECT` row | Makes model-specific options discoverable. |
| Boundary shape | Tool Details consumes `ToolDefinitionDetail.argumentSchema.parameters[].jsonSchema` | Tool Details calls audio model catalog to enrich `generate_speech` | Avoids cross-boundary coupling and media-specific UI logic. |
| Reload state sync | Modal emits `schema-reloaded(updatedTool)` and workspace sets `selectedTool = updatedTool` when names match | Modal assumes old prop object updates because store arrays changed | Ensures Reload Schema refreshes the open modal without close/reopen. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Hard-code `generate_speech` nested options in frontend | Fast way to show OpenAI voice. | Rejected | Generic JSON Schema projection and nested rendering. |
| Add a separate frontend lookup to audio model config when tool is `generate_speech` | Could reuse media model setting UI data. | Rejected | Tool schema boundary already owns argument schema; expose it there. |
| Flatten nested fields into top-level table entries without visual nesting | Simpler rendering. | Rejected | Indented/path-aware rows preserve invocation contract. |
| Change tool parser to accept top-level `voice` | Would avoid nested display. | Rejected | Execution contract remains `generation_config` object. |

## Derived Layering (If Useful)

- Core schema layer: `autobyteus-ts` `ParameterSchema` / `ParameterDefinition`.
- Backend transport projection layer: server GraphQL DTO and converter.
- Frontend transport layer: GraphQL operations and generated types.
- Frontend state layer: `ToolManagementStore`.
- Frontend presentation layer: display row mapper and modal.

## Migration / Refactor Sequence

1. Backend GraphQL projection:
   - Import/use `GraphQLJSON` in `tool-definition.ts`.
   - Add nullable `jsonSchema` to `ToolParameterDefinition`.
   - Populate `jsonSchema` in `ToolDefinitionConverter.paramToGraphql()` using `coreParam.toJsonSchemaProperty()`.
   - Add backend unit coverage for an object parameter with nested enum field.
2. Frontend transport alignment:
   - Add `jsonSchema` selection to tool queries and mutations that return `ToolParameterDefinition`.
   - Regenerate `autobyteus-web/generated/graphql.ts` against the updated backend schema where feasible; if codegen cannot be run locally, manually align generated artifacts and record that implementation caveat.
   - Update `ToolParameter` type in `toolManagementStore.ts`.
3. Frontend row derivation:
   - Add `toolParameterDisplayRows.ts` with a pure mapper and type definitions.
   - Support object properties recursively; at minimum handle JSON Schema `type: object`, `properties`, `required`, `default`, `enum`, and basic primitive type inference.
   - Optionally handle arrays with object `items.properties` as `field[]` child paths if straightforward.
4. Modal rendering and reload event:
   - Replace raw `parameters` table rows with display rows from the mapper.
   - Indent nested rows and/or show path/parent context so `voice` is visibly under `generation_config`.
   - Preserve enum/default display and reload button behavior.
   - Update `defineEmits` to include `schema-reloaded` with a `Tool` payload.
   - After `store.reloadToolSchema` succeeds and returns `result.tool`, emit `schema-reloaded(result.tool)` and remove/update the stale comment that props will update by themselves.
5. Parent selected-tool synchronization:
   - Update `ToolsManagementWorkspace.vue` modal binding to listen for `@schema-reloaded`.
   - Add `handleToolSchemaReloaded(updatedTool: Tool)` that replaces `selectedTool.value` only if `selectedTool.value?.name === updatedTool.name`.
   - Leave store collection update behavior in `toolManagementStore.ts` as the list owner; do not move selected-modal state into the store for this narrow path.
6. Tests and checks:
   - Add/update backend converter test.
   - Add frontend mapper/modal test for `generation_config.voice` with enum values.
   - Add a parent-wired modal or `ToolsManagementWorkspace` test proving that after Reload Schema returns an updated tool with nested `jsonSchema`, the already-open modal displays the updated nested row without close/reopen.
   - Run targeted server and web tests; run typecheck/codegen checks as practical.
7. Documentation follow-up:
   - Delivery/docs sync should consider updating `autobyteus-web/docs/tools_and_mcp.md` to mention nested schema display if this is durable user/developer behavior.

## Key Tradeoffs

- `jsonSchema` field vs recursive GraphQL DTO:
  - Chosen: `jsonSchema` per parameter.
  - Why: JSON Schema already exists as the internal representation and can carry object/array details without recursively modeling every JSON Schema keyword in GraphQL.
  - Cost: Frontend must parse a small subset of JSON Schema for display.
- Local display helper vs inline Vue logic:
  - Chosen: local helper.
  - Why: Easier to test recursion/path formatting and keeps modal readable.
- Generic display vs media-specific display:
  - Chosen: generic nested schema display.
  - Why: Applies to all object parameters and respects the tool schema boundary.

## Risks

- Codegen may require a running updated backend. If not available, generated artifacts may need careful manual alignment plus later codegen validation.
- JSON Schema can contain shapes beyond the initial display subset. The mapper should degrade gracefully: show known properties and leave unknown details out rather than failing.
- Adding `jsonSchema` increases GraphQL payload size slightly. Tool schemas are small enough for this UI path; no pagination or lazy detail endpoint is warranted for this scope.
- Existing tests may snapshot generated GraphQL output; implementation should update snapshots/types consistently.
- The reload synchronization test should guard against false positives by starting with an open modal backed by a stale tool lacking nested `jsonSchema`, then returning an updated tool that contains `generation_config.properties.voice`, and asserting the visible modal changes without closing.

## Guidance For Implementation

- Keep `jsonSchema` nullable and additive to avoid breaking existing GraphQL consumers.
- Use `coreParam.toJsonSchemaProperty()` rather than manually reconstructing nested schema in the converter.
- Suggested frontend row shape:

```ts
export type ToolParameterDisplayRow = {
  id: string;
  name: string;
  path: string;
  depth: number;
  paramType: string;
  required: boolean;
  description: string;
  defaultValue: string | null;
  enumValues: string[] | null;
};
```

- `ToolDetailsModal` emit shape should be explicit in TypeScript, for example `defineEmits<{ close: []; 'schema-reloaded': [tool: Tool] }>()` if project Vue tooling supports typed emits, otherwise keep the equivalent runtime declaration.
- `ToolsManagementWorkspace.handleToolSchemaReloaded` should be the only selected-tool synchronization owner; it should guard by tool name so a late reload cannot replace an unrelated current selection.
- For top-level rows, prefer existing GraphQL fields for summary values and attach `jsonSchema` only for child extraction.
- For nested rows, derive:
  - `path`: `${parentPath}.${propertyName}`
  - `paramType`: schema `type`, mapping JSON Schema `number` to `FLOAT` if the UI keeps enum labels aligned with current values; otherwise uppercase string is sufficient.
  - `required`: whether property name is in parent schema `required` array.
  - `defaultValue`: stringified `default` when defined.
  - `enumValues`: string enum values when schema `enum` is an array.
- Render indentation using `depth` and keep `path` available via title/subtext if only the leaf name is displayed.
- Test the exact reported shape: parent `generation_config` with nested `voice` enum and default.
