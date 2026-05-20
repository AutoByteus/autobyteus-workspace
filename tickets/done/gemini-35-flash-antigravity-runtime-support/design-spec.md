# Design Spec

## Current-State Read

Built-in LLM model support is centralized in `autobyteus-ts`. The relevant current path is:

`autobyteus-ts/src/llm/supported-model-definitions.ts` -> `ModelMetadataResolver` -> `LLMFactory` -> `LLMModel.toModelInfo()` -> server `AutobyteusModelCatalog` -> runtime-scoped model list.

Gemini already has:

- a `GeminiLLM` implementation;
- a model-specific config schema containing `thinking_level` and `include_thoughts`;
- curated metadata support;
- runtime-specific model ID mapping for API-key/Vertex modes.

`gemini-3.5-flash` is missing from the model definition list, curated metadata, and Gemini runtime mapping. No runtime/backend design issue is involved.

## Intended Change

Add `gemini-3.5-flash` to the existing Gemini model registry path in `autobyteus-ts` and verify the server can surface it through the existing Autobyteus model catalog.

Antigravity runtime support is removed from this ticket by user instruction.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Feature
- Current design issue found (`Yes`/`No`/`Unclear`): No
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): No Design Issue Found
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): No
- Evidence: Existing Gemini registry, metadata resolver, config schema, runtime mapping, and server catalog delegation are correctly owned and only need a new model entry plus tests.
- Design response: Extend the existing owner files; no new subsystem.
- Refactor rationale: No refactor needed because the current owner, API shape, file placement, and metadata structures remain healthy for this scope.
- Intentional deferrals and residual risk, if any: Antigravity runtime support is not deferred as part of this ticket; it is explicitly out of scope. Future Vertex naming changes may require a separate follow-up.

## Terminology

- `gemini-3.5-flash`: Official Google Gemini model API identifier to add.
- `Curated metadata`: Offline fallback model token limits stored in `autobyteus-ts`.
- `Runtime mapping`: Gemini model ID normalization for API-key and Vertex modes.

## Design Reading Order

1. model definition
2. metadata
3. runtime mapping
4. tests

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: None. Existing Gemini preview model entries are not compatibility wrappers and should not be removed in this ticket.
- Do not alias `gemini-3.5-flash` to any older preview ID.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | `supportedModelDefinitions` entry | Server/Web model selection sees `gemini-3.5-flash` | `LLMFactory` / model catalog owners | Ensures model support lands in the existing authoritative model path. |

## Primary Execution Spine(s)

`SupportedModelDefinition -> ModelMetadataResolver -> LLMModel -> LLMFactory -> AutobyteusModelCatalog -> ModelCatalogService -> UI/API model list`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The model is declared once in `autobyteus-ts`, enriched with curated metadata, and exposed through existing server model catalog flow. | Model definition, metadata resolver, model catalog | `LLMFactory` | Official limits, pricing, runtime mapping, tests. |

## Spine Actors / Main-Line Nodes

- `supportedModelDefinitions`: declares the built-in model.
- `ModelMetadataResolver`: overlays curated metadata.
- `LLMModel`: carries identifier/schema/metadata into `ModelInfo`.
- `LLMFactory`: registers and lists models.
- `AutobyteusModelCatalog`: server facade over `LLMFactory`.

## Ownership Map

- `supported-model-definitions.ts` owns the built-in model definition and default pricing/config schema.
- `curated-model-metadata.ts` owns offline token limits.
- `gemini-model-mapping.ts` owns Gemini runtime-specific model IDs.
- Server model catalog owns runtime-scoped listing only; it must not duplicate Gemini model definitions.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `ModelCatalogService` | `AutobyteusModelCatalog` / `LLMFactory` | Server runtime-scoped model list facade | Gemini model definitions. |
| GraphQL/provider model resolvers | LLM provider/model catalog services | API transport | Model metadata truth. |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| N/A | No obsolete code path is replaced. | N/A | N/A | Do not remove existing Gemini preview entries. |

## Return Or Event Spine(s) (If Applicable)

N/A.

## Bounded Local / Internal Spines (If Applicable)

N/A.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Curated token metadata | DS-001 | `LLMFactory` / `LLMModel` | Provide official limits without live metadata call. | Model selection/context planning need limits. | Missing or inconsistent model limits. |
| Runtime model ID mapping | DS-001 | `GeminiLLM` | Preserve correct API/Vertex model ID. | Gemini helper resolves runtime-specific IDs. | Wrong provider model name at execution. |
| Pricing config | DS-001 | Model definition | Provide default token pricing. | Existing model definitions include pricing. | Cost estimates inconsistent. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Model definition | `autobyteus-ts` LLM registry | Extend | Existing exact owner. | N/A |
| Official token limits | Curated model metadata | Extend | Existing exact owner. | N/A |
| API/Vertex ID mapping | Gemini model mapping utility | Extend | Existing exact owner. | N/A |
| Server visibility | Server Autobyteus model catalog | Reuse | It already delegates to `LLMFactory`. | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts` LLM registry | Model definition/config/pricing | DS-001 | `LLMFactory` | Extend | Add one entry. |
| `autobyteus-ts` model metadata | Official token limits | DS-001 | `ModelMetadataResolver` | Extend | Add one curated key. |
| Gemini runtime mapping | API/Vertex ID preservation | DS-001 | `GeminiLLM` | Extend | Add one mapping/test. |
| Server LLM management | Runtime-scoped listing | DS-001 | `ModelCatalogService` | Reuse | No duplicate model entry. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/llm/supported-model-definitions.ts` | LLM registry | Built-in model definitions | Add `gemini-3.5-flash` definition. | Existing exact owner. | Gemini schema/pricing helper. |
| `autobyteus-ts/src/llm/metadata/curated-model-metadata.ts` | LLM metadata | Curated metadata lookup | Add official limits/source. | Existing exact owner. | Metadata lookup. |
| `autobyteus-ts/src/utils/gemini-model-mapping.ts` | Gemini mapping | Runtime ID resolver | Add identity mapping. | Existing exact owner. | Mapping tests. |
| `autobyteus-ts/tests/integration/llm/llm-factory-metadata-resolution.test.ts` | Tests | Metadata/factory coverage | Assert new curated metadata. | Existing coverage location. | N/A |
| `autobyteus-ts/tests/unit/utils/gemini-model-mapping.test.ts` | Tests | Mapping coverage | Assert API/Vertex mapping. | Existing coverage location. | N/A |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| N/A | N/A | N/A | Existing structures are sufficient. | Yes | Yes | N/A |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `SupportedModelDefinition` | Yes | Yes | Low | Add one entry only. |
| Curated metadata entry | Yes | Yes | Low | Add official limits. |
| Gemini runtime mapping row | Yes | Yes | Low | Add identity mapping. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/llm/supported-model-definitions.ts` | LLM registry | Model definition owner | Add `gemini-3.5-flash` with `GeminiLLM`, `geminiSchema`, and pricing. | Existing exact owner. | Yes. |
| `autobyteus-ts/src/llm/metadata/curated-model-metadata.ts` | LLM metadata | Curated metadata owner | Add `gemini-3.5-flash` token limits. | Existing exact owner. | Yes. |
| `autobyteus-ts/src/utils/gemini-model-mapping.ts` | Gemini mapping | Runtime model resolver | Add API-key/Vertex identity mapping. | Existing exact owner. | Yes. |
| `autobyteus-ts/tests/integration/llm/llm-factory-metadata-resolution.test.ts` | Tests | Metadata behavior | Assert model and limits. | Existing coverage location. | N/A |
| `autobyteus-ts/tests/unit/utils/gemini-model-mapping.test.ts` | Tests | Mapping behavior | Assert identity mapping. | Existing coverage location. | N/A |

## Ownership Boundaries

- `autobyteus-ts` owns model support.
- Server owns model catalog transport/listing only.
- No runtime-management, agent-execution backend, team-execution, or web runtime-kind changes are in scope.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `LLMFactory` | Supported definitions, metadata resolver, `LLMModel` | Server model catalogs | Hard-coding Gemini model in server | Extend `LLMFactory`/model structures. |
| `resolveModelForRuntime` | Gemini runtime-specific model IDs | `GeminiLLM` and media clients | Inline Gemini ID branching in LLM execution | Add mapping row/test. |

## Dependency Rules

- `autobyteus-ts` model files must not import server code.
- Server model catalog must not add duplicate Gemini model definitions.
- Tests should avoid real Google API calls for curated metadata validation.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `SupportedModelDefinition` entry | Built-in Gemini model | Register model/config/pricing | `name/value/canonicalName = gemini-3.5-flash` | Provider `GEMINI`. |
| Curated metadata lookup | Model limits | Provide offline token limits | lookup keys include name/value/canonical | Add exact key. |
| `resolveModelForRuntime(model, 'llm', runtime)` | Provider model ID | Map model ID for Gemini runtime | `api_key`, `vertex` | Return same ID. |
| `LLMFactory.listModelsByProvider(GEMINI)` | Model list | Expose model info | Provider enum | Main test target. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `SupportedModelDefinition` | Yes | Yes | Low | Use exact official ID. |
| Curated metadata lookup | Yes | Yes | Low | Add exact key. |
| `resolveModelForRuntime` | Yes | Yes | Low | Add test. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Model | `gemini-3.5-flash` | Yes | Low | Use official ID exactly. |

## Applied Patterns (If Any)

- Existing supported model definition pattern.
- Existing curated metadata pattern.
- Existing Gemini runtime mapping pattern.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/llm/supported-model-definitions.ts` | File | LLM registry | Add model definition | Existing exact owner | Server/runtime logic |
| `autobyteus-ts/src/llm/metadata/curated-model-metadata.ts` | File | LLM metadata | Add curated limits | Existing exact owner | Runtime availability |
| `autobyteus-ts/src/utils/gemini-model-mapping.ts` | File | Gemini mapping | Add identity mapping | Existing exact owner | Pricing/metadata |
| `autobyteus-ts/tests/integration/llm/llm-factory-metadata-resolution.test.ts` | File | Tests | Metadata/factory assertions | Existing test file | Real API dependency |
| `autobyteus-ts/tests/unit/utils/gemini-model-mapping.test.ts` | File | Tests | Mapping assertions | Existing test file | Model registry setup |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `autobyteus-ts/src/llm` | Main-Line Domain-Control | Yes | Low | Existing LLM registry and metadata owner. |
| `autobyteus-ts/src/utils` | Off-Spine Concern | Yes | Low | Existing Gemini runtime mapping utility. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Model entry | `{ name: 'gemini-3.5-flash', value: 'gemini-3.5-flash', provider: LLMProvider.GEMINI, llmClass: GeminiLLM, canonicalName: 'gemini-3.5-flash', configSchema: geminiSchema }` | Server-only model row | Keeps model ownership centralized. |
| Runtime mapping | `'gemini-3.5-flash': { vertex: 'gemini-3.5-flash', api_key: 'gemini-3.5-flash' }` | Implicitly relying on fallback without test | Makes runtime behavior explicit and verified. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Alias `gemini-3.5-flash` to `gemini-3-flash-preview` | Preview is listed as predecessor. | Rejected | Add stable model as its own entry. |
| Remove `gemini-3-flash-preview` | Stable model supersedes preview for many users. | Rejected for this ticket | Keep existing preview entry; separate deprecation if desired later. |

## Derived Layering (If Useful)

N/A. Existing model registry layering is sufficient.

## Migration / Refactor Sequence

1. Add `gemini-3.5-flash` to `supported-model-definitions.ts`.
2. Add curated metadata entry with official limits and source URL.
3. Add Gemini runtime mapping row.
4. Extend existing metadata and mapping tests.
5. Run targeted `autobyteus-ts` tests/build and any lightweight server model catalog test if needed.

## Key Tradeoffs

- Explicit runtime mapping vs relying on fallback: explicit mapping adds small maintenance cost but gives clear test coverage for API-key/Vertex behavior.
- Not changing default model: avoids unintended product behavior change while still adding selectable support.

## Risks

- Official model details may change in future; curated metadata source/date should make the current basis explicit.

## Guidance For Implementation

- Keep the change minimal.
- Do not touch Antigravity files/runtime code.
- Do not change server runtime enum/backend code.
- Do not remove existing Gemini models.
- Validate with targeted tests:
  - `pnpm -C autobyteus-ts exec vitest run tests/integration/llm/llm-factory-metadata-resolution.test.ts tests/unit/utils/gemini-model-mapping.test.ts`
  - `pnpm -C autobyteus-ts build` if time permits.
