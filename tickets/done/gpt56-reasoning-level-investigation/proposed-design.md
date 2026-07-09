# Design Spec

## Current-State Read

AutoByteus already uses the correct upstream discovery entrypoint: `CodexModelCatalog.listModels()` calls Codex App Server `model/list`. The defect is introduced inside the existing translation boundary. `mapCodexModelListRowToModelInfo()` routes every advertised effort through `normalizeCodexReasoningEffort()`, whose global closed set permits only `none`, `low`, `medium`, `high`, and `xhigh`. The same function also normalizes explicit launch configuration before `CodexThread` sends `turn/start.effort`.

The current paths are:

- Catalog: frontend model request -> GraphQL provider query -> `ModelCatalogService` -> `CodexModelCatalog` -> App Server `model/list` -> `codex-app-server-model-normalizer` -> GraphQL `configSchema` -> frontend generic schema renderer.
- Runtime: selected schema enum value -> `llmConfig.reasoning_effort` -> `AgentRunConfig` -> `CodexThreadBootstrapper` -> `CodexThreadConfig` -> `CodexThread.sendTurn()` -> App Server `turn/start.effort`.

Codex 0.144.0 defines reasoning effort as a non-empty open string, includes known `max` and `ultra` variants, supports future `Custom(String)` values, and advertises the values supported by each model. The frontend already renders arbitrary backend enum values and validates explicit UI config against the selected model schema. No frontend Codex-specific list exists.

The target design must preserve:

- the App Server as the authoritative owner of per-model capabilities;
- model-specific differences such as Sol advertising `ultra` while Luna does not;
- the existing generic GraphQL and frontend schema path;
- `null`/unset behavior so App Server can apply the model default;
- the intentionally scoped `service_tier === "fast"` product policy, which is separate from the open reasoning-effort contract.

## Intended Change

Replace closed reasoning-effort validation with open-string wire-value normalization at the Codex adapter boundary:

- remove `VALID_REASONING_EFFORTS`;
- make `normalizeCodexReasoningEffort(value)` return a trimmed non-empty string or null, preserving the advertised/submitted value rather than lowercasing or enumerating it;
- keep catalog order and deduplication exactly as currently implemented;
- keep using the same normalized wire value for explicit `llmConfig.reasoning_effort` so `max`, `ultra`, and future values survive to `turn/start.effort`;
- do not introduce a second model-capability cache or query `model/list` again during thread bootstrap;
- keep selectable-value restriction model-scoped through the schema already returned to the frontend, while direct callers rely on the authoritative App Server to accept, normalize, reject, or default open-string values.

## Task Design Health Assessment (Mandatory)

- Change posture: `Bug Fix`
- Current design issue found: `Yes`
- Root cause classification: `Duplicated Policy Or Coordination`
- Refactor needed now: `Yes` (small, local policy removal)
- Evidence: The App Server raw row carries six Sol values and its protocol accepts future custom values, while AutoByteus's adapter narrows them through a five-value global set. The packaged mapper proves the same set drops values in both catalog and launch paths.
- Design response: Make the adapter normalize the wire shape only. Leave model-support policy with App Server and user-selectable capability policy with each returned model schema.
- Refactor rationale: Adding `max` and `ultra` to the set would fix only today's snapshot and preserve the duplicated-policy failure mode. Removing the set restores the existing authoritative boundary instead of creating new structure.
- Intentional deferrals and residual risk: Per-option descriptions and an `ultra` warning UI are not added. `ultra` behavior is validated as part of runtime coverage, but the generic schema UI remains unchanged.

## Terminology

- **Advertised effort**: a non-empty reasoning-effort wire value in one App Server `model/list` row.
- **Explicit effort**: the non-empty value supplied in `llmConfig.reasoning_effort` for a run.
- **Selectable effort schema**: the model-specific `reasoning_effort.enum_values` delivered to the frontend.
- **Wire-value normalization**: type/empty/whitespace normalization only; it is not a supported-value decision.

## Design Reading Order

The design first follows capability discovery and runtime application, then assigns authority to App Server, the existing catalog adapter, and the existing runtime adapter. File changes remain deliberately local after the ownership model is established.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Obsolete in-scope behavior: the global closed reasoning-effort allowlist and the silent conversion of non-enumerated non-empty values to null.
- Required action: delete the set and replace its filtering semantics directly. Do not retain a fallback branch, a deprecated constant, or a second “legacy” normalizer.

## Data-Flow Spine Inventory

| Spine ID | Scope | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | `Primary End-to-End` | Frontend runtime/model configuration request | Rendered model-specific reasoning options | `CodexModelCatalog` at the AutoByteus translation boundary | Carries authoritative App Server capabilities into the product UI |
| DS-002 | `Primary End-to-End` | User-selected explicit effort | Codex App Server turn execution | Codex agent-run backend, with `CodexThreadBootstrapper` owning config construction | Ensures an advertised selected value reaches the runtime unchanged |
| DS-003 | `Return-Event` | App Server `model/list` result | GraphQL `configSchema` and frontend selection state | `CodexModelCatalog` | Makes the capability return path and loss point explicit |

## Primary Execution Spine(s)

- DS-001: `RuntimeModelConfigFields -> GraphQL availableLlmProvidersWithModels -> ModelCatalogService -> CodexModelCatalog -> Codex App Server model/list -> ModelInfo config schema -> ModelConfigAdvanced`
- DS-002: `ModelConfigAdvanced selection -> launch config llmConfig -> AgentRunConfig -> CodexThreadBootstrapper -> CodexThreadConfig -> CodexThread.sendTurn -> Codex App Server turn/start`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The frontend requests models for the Codex runtime. The catalog adapter asks App Server for its current model rows, translates each advertised effort into the existing generic config schema without narrowing it, and the generic frontend renders the returned enum. | Runtime-scoped model request, Codex model catalog, model config schema, advanced selector | `CodexModelCatalog` | JSON shape normalization, GraphQL mapping, frontend schema normalization |
| DS-002 | A user selects one of the returned effort values. Existing launch state carries it into the Codex backend, which normalizes it as a non-empty wire string and sends it on every turn. | Selected effort, run config, Codex thread config, Codex turn | Codex agent-run backend | Persisted config, unset/default semantics |
| DS-003 | App Server returns model capability metadata; AutoByteus maps it to `ModelInfo`, GraphQL transports it unchanged, and the frontend derives selectable values and sanitization from that schema. | App Server model row, `ModelInfo`, GraphQL model detail, UI schema | `CodexModelCatalog` | Ordering/deduplication, default value mapping |

## Spine Actors / Main-Line Nodes

- `RuntimeModelConfigFields`: initiates runtime-scoped catalog loading and selects a model schema.
- `ModelCatalogService`: runtime-kind router; thin dispatch boundary.
- `CodexModelCatalog`: authoritative AutoByteus adapter for Codex model discovery.
- Codex App Server `model/list`: authoritative provider boundary for per-model capabilities.
- `ModelConfigAdvanced`: generic schema enum renderer and explicit selection emitter.
- `AgentRunConfig`: immutable run configuration carrier.
- `CodexThreadBootstrapper`: Codex thread-config construction owner.
- `CodexThread`: turn transport owner.

## Ownership Map

- Codex App Server owns which efforts each model advertises and whether a submitted open-string effort is usable for that model.
- `CodexModelCatalog` owns translating App Server model rows into AutoByteus `ModelInfo` without adding product-wide capability policy.
- `codex-app-server-model-normalizer.ts` owns safe JSON-to-wire-value conversion, schema construction, and Codex-specific field mapping. It does not own the list of supported reasoning efforts.
- GraphQL owns transport naming only and must not reinterpret config schema values.
- The frontend model-config subsystem owns generic rendering and schema-based editable-value sanitization; it must not gain a Codex list.
- `CodexThreadBootstrapper` owns converting `AgentRunConfig` to `CodexThreadConfig`, including unset versus explicit effort.
- `CodexThread` owns sending the already-resolved effort to App Server; it must not revalidate model capabilities.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `ModelCatalogService.listLlmModels(runtimeKind)` | Runtime-specific catalog such as `CodexModelCatalog` | Routes by runtime kind | Provider capability mapping |
| GraphQL `availableLlmProvidersWithModels` | `LlmProviderService` plus runtime catalog | Public transport entry | Reasoning enum policy |
| `RuntimeModelConfigFields` schema lookup | Backend model schema | Shared frontend composition | Codex-specific supported values |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope | Notes |
| --- | --- | --- | --- | --- |
| `VALID_REASONING_EFFORTS` | Duplicates and drifts from App Server per-model capability metadata | App Server `model/list` plus open-string normalization in the existing normalizer | `In This Change` | Delete outright |
| Closed-set rejection in `normalizeCodexReasoningEffort` | Silently drops valid current/future values | `asString(value)` non-empty wire normalization | `In This Change` | Preserve exact trimmed case/value |
| Live-test assertion against the old five-value union | Validates the defect instead of upstream parity | Advertised-value preservation assertions | `In This Change` | Coverage ownership handled in API/E2E stage if repository-resident integration coverage changes |

## Return Or Event Spine(s) (If Applicable)

DS-003: `Codex App Server model/list response -> CodexModelCatalog row mapper -> ModelInfo.config_schema -> GraphQL ModelDetail.configSchema -> llmConfigSchema normalization -> ModelConfigAdvanced options`

## Bounded Local / Internal Spines (If Applicable)

None. Pagination inside `CodexModelCatalog` is a small loop but does not materially alter ownership or the reasoning-capability policy.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| JSON value normalization | DS-001, DS-002, DS-003 | Codex adapter | Reject non-string/empty values and trim boundary whitespace | Protect internal contracts from malformed JSON | Could become an accidental capability policy again |
| Schema ordering/deduplication | DS-001, DS-003 | `CodexModelCatalog` mapper | Preserve first advertised order and remove duplicates | Stable selector behavior | A new sorter/global union would erase provider intent |
| Frontend schema sanitization | DS-001, DS-002 | Frontend model-config owner | Remove explicit values not present in the selected model schema | Prevent stale UI config across model changes | Provider-specific code would duplicate catalog policy |
| Runtime default handling | DS-002 | `CodexThreadBootstrapper` | Keep unset effort as null | Let App Server apply model default | Materializing a UI default would change persistence semantics |
| Executable parity coverage | DS-001, DS-002 | Catalog/runtime owners | Detect any future advertised-value loss | Guard dynamic boundary | Fixed-value assertions recreate the bug |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Codex model discovery | `CodexModelCatalog` | `Extend` | Already owns App Server model rows and pagination | N/A |
| Codex row/wire normalization | `codex-app-server-model-normalizer.ts` | `Extend` | Correct existing adapter boundary | N/A |
| Model config rendering | Generic frontend model-config subsystem | `Reuse` | Already renders arbitrary enum schemas | N/A |
| Run effort transport | `CodexThreadBootstrapper` and `CodexThread` | `Reuse` | Already carry string/null to `turn/start` | N/A |
| Model capability cache | None needed | `Reuse` upstream App Server | App Server/model manager already owns cache and authority | Do not create one |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| Codex model catalog adapter | Discovery and schema translation | DS-001, DS-003 | `CodexModelCatalog` | `Extend` | Remove narrowing policy |
| Codex run backend | Explicit effort propagation | DS-002 | Codex agent-run backend | `Extend` through changed normalizer semantics | No new query/cache |
| GraphQL model transport | Schema delivery | DS-001, DS-003 | Catalog | `Reuse` | No production changes expected |
| Frontend model configuration | Schema rendering/sanitization | DS-001, DS-002 | Launch form | `Reuse` | No production changes expected |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `codex-app-server-model-normalizer.ts` | Codex adapter | App Server translation boundary | Non-empty wire normalization, model-row mapping, config-schema mapping, run field resolution | These are cohesive Codex JSON contract translations | Yes, existing `asString` |
| `codex-app-server-model-normalizer.test.ts` | Codex adapter coverage | Same boundary | Open-string preservation, current and future values, malformed rejection | Focused pure-function coverage | Yes |
| `codex-model-catalog.integration.test.ts` | Catalog executable coverage | `CodexModelCatalog` | Live advertised-to-schema parity | Existing live transport test | Yes |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Non-empty JSON string parsing | Existing `codex-app-server-json.ts` | Codex adapter | Already used across Codex protocol mapping | N/A | N/A | A reasoning capability registry |
| Reasoning wire normalization | Existing `codex-app-server-model-normalizer.ts` | Codex adapter | Catalog and run paths need identical string/null semantics | Yes: removes closed enum | Yes: one App Server wire representation | A second model catalog |

No new file or shared type is warranted. `type CodexReasoningEffort = string` would add empty indirection without strengthening the contract.

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Parallel / Overlapping Representation Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `reasoning_effort` in `llmConfig` | `Yes` | `Yes` | `Low` | Keep one exact string/null representation |
| App Server reasoning option object | `Yes` | `Yes` | `Low` | Read `reasoningEffort`/snake-case compatibility at the JSON boundary only |
| AutoByteus config-schema enum | `Yes` | `Yes` | `Low` | Preserve one ordered array from the advertised row |

## Final File Responsibility Mapping

| File | Owning Subsystem | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/backends/codex/codex-app-server-model-normalizer.ts` | Codex adapter | App Server translation boundary | Preserve non-empty effort wire values and build existing config schema/run field | Existing correct placement and cohesive responsibility | `asString` |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/codex-app-server-model-normalizer.test.ts` | Codex adapter tests | Pure mapping boundary | Regression coverage for max, ultra, future custom values, order, defaults, malformed values, explicit run propagation | Mirrors production boundary | Production exports |
| `autobyteus-server-ts/tests/integration/services/codex-model-catalog.integration.test.ts` | Catalog integration tests | Live transport boundary | Assert normalized catalog does not narrow advertised non-empty values | Existing live test owner | `CodexModelCatalog`/App Server client |
| `autobyteus-server-ts/docs/modules/codex_integration.md` | Durable integration docs | Codex integration contract | State that advertised reasoning efforts are preserved and App Server remains authoritative | Existing canonical Codex doc | N/A |

## Ownership Boundaries

The App Server is authoritative for the model capability contract. AutoByteus's catalog adapter may validate JSON shape but must not maintain a competing closed supported-value list. The frontend and GraphQL consumers depend on the normalized `ModelInfo.config_schema`, not directly on App Server internals. The run backend accepts the exact non-empty string from `AgentRunConfig` and delegates model-support behavior to App Server on `turn/start`.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| Codex App Server model catalog | Remote `/models`, cache, bundled metadata, per-model effort support | `CodexModelCatalog` | AutoByteus closed union alongside `model/list` | Preserve additional advertised metadata through the adapter |
| `CodexModelCatalog` | App Server client acquisition, pagination, row mapping | `ModelCatalogService`/GraphQL | GraphQL/frontend calling App Server or owning Codex enums | Extend `ModelInfo` mapping |
| Codex agent-run backend | Thread config construction and turn transport | `AgentRun` | UI/GraphQL constructing App Server payloads | Strengthen backend config input if needed, not bypass it |

## Dependency Rules

- `CodexModelCatalog` may depend on the App Server client manager and the Codex row mapper.
- The row mapper may depend on generic Codex JSON shape helpers; it may not depend on frontend or GraphQL policy.
- GraphQL/frontend may depend on `ModelInfo.config_schema`; they may not add a Codex effort union.
- `CodexThreadBootstrapper` may use the same wire normalizer; it may not query catalog internals or own a duplicate capability cache.
- `CodexThread` sends string/null; it may not reinterpret effort values.
- Do not change the separate `fast` service-tier allowlist in this ticket.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `CodexModelCatalog.listModels(cwd?)` | Codex model catalog | Return current mapped models | Optional working-directory path | Thin public catalog boundary |
| `mapCodexModelListRowToModelInfo(row)` | One Codex model row | Translate row to `ModelInfo` | Unknown JSON row with model/id | Must preserve advertised efforts |
| `normalizeCodexReasoningEffort(value)` | One effort wire value | Return trimmed non-empty string or null | Unknown JSON value | Open string, not capability validation |
| GraphQL `availableLlmProvidersWithModels(runtimeKind)` | Runtime-scoped model catalog | Transport grouped models/schema | Explicit runtime kind | No effort policy |
| App Server `turn/start.effort` | One Codex turn | Apply explicit or default reasoning effort | String or null | App Server remains authoritative |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `normalizeCodexReasoningEffort` | `Yes` after change | `Yes` | `Low` | Document open-string semantics in tests |
| `mapCodexModelListRowToModelInfo` | `Yes` | `Yes` | `Low` | None beyond preserving values |
| `CodexModelCatalog.listModels` | `Yes` | `Yes` | `Low` | None |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Catalog owner | `CodexModelCatalog` | `Yes` | Low | Keep |
| Wire normalizer | `normalizeCodexReasoningEffort` | `Yes` | Medium if read as capability validation | Tests/docs must state non-empty wire normalization; optional rename only if reviewer finds ambiguity material |
| Row mapper | `mapCodexModelListRowToModelInfo` | `Yes` | Low | Keep |

## Applied Patterns (If Any)

- **Adapter**: the existing normalizer maps App Server JSON to AutoByteus `ModelInfo` and runtime wire fields. It owns translation, not provider capability policy.
- No new registry, manager, facade, cache, or strategy is introduced.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/backends/codex/codex-app-server-model-normalizer.ts` | `File` | Codex adapter | Open-string effort normalization and existing row/run mapping | Current Codex backend boundary | Closed effort registry |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/codex-app-server-model-normalizer.test.ts` | `File` | Codex adapter tests | Pure regression cases | Mirrors production placement | Live/environment setup |
| `autobyteus-server-ts/tests/integration/services/codex-model-catalog.integration.test.ts` | `File` | Catalog integration | Live parity coverage | Existing runtime catalog coverage | Fixed global effort union |
| `autobyteus-server-ts/docs/modules/codex_integration.md` | `File` | Integration documentation | Durable capability-authority contract | Canonical Codex integration doc | Version-specific hardcoded option list |

The existing flat placement within the focused Codex backend folder remains clearer than adding a new module for one corrected adapter policy.

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Boundary Is Clear? | Mixed-Layer Or Over-Split Risk | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `agent-execution/backends/codex/` | `Persistence-Provider` / runtime adapter | `Yes` | Low | Existing provider boundary is appropriate |
| `llm-management/services/` | `Main-Line Domain-Control` | `Yes` | Low | Catalog service and runtime-specific catalog roles remain clear |
| `components/workspace/config/` | `Transport` / UI configuration | `Yes` | Low | Reused unchanged |

## Concrete Examples / Shape Guidance

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Sol capability preservation | raw `low, medium, high, xhigh, max, ultra` -> same schema enum | raw six -> filter through AutoByteus union -> four | Shows the exact repaired return spine |
| Per-model differences | Luna raw through `max` -> UI through `max`, no `ultra` | Add `ultra` to every Codex model from a product-wide union | Prevents invented capabilities |
| Future value | App Server advertises `future` -> schema and turn carry `future` | Add a new constant/release for every upstream value | Preserves the upstream open-string contract |
| Direct invalid input | non-empty direct value -> App Server decides support | query/cache model list again inside bootstrap | Keeps one authoritative owner |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Append `max` and `ultra` to the old set | Minimal immediate patch | `Rejected` | Remove the set; preserve all non-empty advertised values |
| Keep old normalizer plus a catalog-only bypass | Could limit runtime behavior change | `Rejected` | One wire-normalization contract for catalog and run paths |
| Add a legacy fallback when App Server returns an unknown value | Fear of future protocol drift | `Rejected` | Unknown non-empty values are valid upstream custom effort strings |
| Add a second capability cache in AutoByteus | Could validate direct launch input locally | `Rejected` | App Server already owns caching and support decisions |

## Derived Layering (If Useful)

`Frontend schema UI -> GraphQL transport -> runtime catalog service -> Codex catalog adapter -> Codex App Server` for discovery, and `Frontend launch state -> AgentRun -> Codex backend -> Codex App Server` for execution. This layering is explanatory only; authority follows the boundaries above.

## Migration / Refactor Sequence

1. Change `normalizeCodexReasoningEffort` to trimmed non-empty open-string normalization and delete `VALID_REASONING_EFFORTS`.
2. Add focused unit coverage for current (`max`, `ultra`) and future custom values, malformed values, mapping order/defaults, and explicit run resolution.
3. Run implementation-scoped typecheck/unit checks.
4. After code review, update/investigate live catalog and GraphQL/runtime coverage so raw advertised values and mapped values cannot diverge silently.
5. Re-review any durable coverage changes.
6. Update canonical Codex integration documentation after the integrated-state refresh.

No temporary compatibility seam is required.

## Key Tradeoffs

- **Open pass-through versus closed validation**: Open non-empty strings match the upstream contract and avoid drift. The tradeoff is that direct callers can submit unadvertised custom values; App Server is the correct owner to decide them.
- **No bootstrap model lookup**: Avoids latency, duplicate cache ownership, and mixed-level dependency from runtime bootstrap into catalog internals.
- **No frontend production edit**: The generic renderer is already correct. Adding Codex-specific code would weaken the schema boundary.
- **No broad service-tier generalization**: `fast` is a separate explicitly scoped product feature and is unchanged.

## Risks

- `ultra` activates automatic task delegation in Codex 0.144.0; realistic team-runtime coverage must ensure it does not break AutoByteus communication/tool invariants.
- Existing persisted arbitrary non-empty effort values will reach App Server instead of being silently nulled. This is intended authoritative-boundary behavior but should be visible in unit/runtime evidence.
- A live integration test tied only to current named models could become flaky as the remote catalog changes; parity-based assertions are preferred over a permanent Sol-only fixture.

## Guidance For Implementation

- Do not add `max`, `ultra`, `minimal`, or `future` to a new AutoByteus constant.
- Preserve case and exact content after boundary trimming; upstream custom values are open strings.
- Continue rejecting null, non-string, and whitespace-only inputs.
- Preserve first-seen App Server order and current deduplication.
- Keep `defaultReasoningEffort` behavior: append a valid default only when absent from the advertised enum.
- Keep unset `llmConfig.reasoning_effort` as null so App Server applies its model default.
- Do not modify frontend production code unless implementation evidence disproves the current schema pass-through trace.
- Keep `VALID_CODEX_SERVICE_TIERS` unchanged.
- Ensure tests demonstrate both catalog mapping and runtime resolution; a selector-only fix is incomplete.
