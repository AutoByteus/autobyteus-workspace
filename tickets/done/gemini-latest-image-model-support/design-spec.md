# Design Spec

## Current-State Read

Autobyteus already has an image-model execution spine that separates model catalog ownership from provider request execution:

- `autobyteus-ts/src/multimedia/image/image-client-factory.ts` owns built-in `ImageModel` registration and lookup.
- `autobyteus-ts/src/multimedia/image/image-model.ts` owns image model identity (`name`, `value`, `provider`, `clientClass`, `parameterSchema`, runtime metadata).
- `autobyteus-ts/src/multimedia/image/api/gemini-image-client.ts` owns Gemini image request/response shaping through `@google/genai` `models.generateContent`.
- `autobyteus-ts/src/utils/gemini-model-mapping.ts` owns runtime-specific Gemini provider model-name mapping.
- Server model-listing code (`autobyteus-server-ts/src/multimedia-management/providers/image-model-provider.ts` and service callers) consumes `ImageClientFactory`; it does not duplicate built-in model registration.
- Tools (`autobyteus-ts/src/tools/multimedia/image-tools.ts`) consume the catalog through `ImageClientFactory` and do not own provider-specific model enumeration.

Official Google docs now identify Gemini 3.1 Flash Image Preview / Nano Banana 2 as the current high-efficiency Gemini native image model with model ID `gemini-3.1-flash-image-preview`. The current catalog registers `gemini-2.5-flash-image` and `gemini-3-pro-image-preview`, but not `gemini-3.1-flash-image-preview`; selecting the new official ID would currently fail as an unregistered model.

The existing provider boundary is sufficient. `GeminiImageClient` already accepts a model value, resolves it through `resolveModelForRuntime(..., 'image', runtime)`, and sends it to `client.models.generateContent`. No new Gemini client or server model-listing path is needed.

## Intended Change

Add built-in support for `gemini-3.1-flash-image-preview` by:

1. Registering a new Gemini `ImageModel` in `ImageClientFactory` with:
   - `name: 'gemini-3.1-flash-image-preview'`
   - `value: 'gemini-3.1-flash-image-preview'`
   - `provider: MultimediaProvider.GEMINI`
   - `clientClass: GeminiImageClient`
   - description naming Gemini 3.1 Flash Image Preview / Nano Banana 2 and its speed/high-volume image generation/editing role.
2. Adding explicit image runtime mappings in `gemini-model-mapping.ts`:
   - `api_key: 'gemini-3.1-flash-image-preview'`
   - `vertex: 'gemini-3.1-flash-image-preview'`
3. Adding unit coverage for image model catalog membership/client creation and Gemini image runtime mapping.
4. Leaving defaults and existing model IDs unchanged.
5. Prohibiting speculative aliases such as `gemini-3.1-image`, `gemini-3.1-flash-image`, or `gemini-3.1-pro-image`.

Optional within this scope: expose a model-specific generation-config schema for the new Gemini 3.1 model if implementation keeps it catalog-owned and passes existing `GeminiImageClient` config unchanged. Do not redesign all Gemini image schemas for this ticket.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Feature
- Current design issue found (`Yes`/`No`/`Unclear`): No
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): No Design Issue Found
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): No
- Evidence: Current code already has centralized image model registration, a Gemini image provider adapter, and Gemini runtime model mapping. The new official model is absent from those existing extension points.
- Design response: Use the existing extension points; add one model entry and one runtime-mapping entry plus tests.
- Refactor rationale: No refactor needed because current owner, boundary, API shape, file placement, and data structures are healthy for an additive provider model registration.
- Intentional deferrals and residual risk, if any: Broad Gemini image parameter-schema modernization is deferred. The new model can work with default generation behavior and arbitrary programmatic `generationConfig`; exposing full advanced Gemini 3.1 options is allowed but not required beyond a clean catalog-owned schema if implementation chooses to add it.

## Terminology

- `Image model catalog`: the built-in model registry owned by `ImageClientFactory`.
- `Provider API value`: the model string sent to Google through `GeminiImageClient`; for this task it is `gemini-3.1-flash-image-preview`.
- `Runtime mapping`: API-key vs Vertex model-value resolution owned by `gemini-model-mapping.ts`.
- `Gemini image request boundary`: `GeminiImageClient`; callers above it must not bypass it and call `@google/genai` directly.

## Design Reading Order

1. Data-flow spine
2. Capability-area allocation
3. File responsibility mapping
4. Dependency and boundary rules
5. Validation and docs-sync expectations

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: No legacy code path is introduced or removed in this scope. The implementation must not add compatibility aliases for guessed model names.
- Decision rule: Support only the official model ID `gemini-3.1-flash-image-preview`; do not keep dual-path aliases for unofficial names.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | User/tool/server selects `gemini-3.1-flash-image-preview` | Gemini API image response returned as `ImageGenerationResponse` | `ImageClientFactory` + `GeminiImageClient` | Shows the main model selection and image generation path that the new model must join. |
| DS-002 | Primary End-to-End | Server/UI lists image models | Model list includes `gemini-3.1-flash-image-preview` | `ImageClientFactory` consumed by `ImageModelProvider` | Ensures the new model is selectable through existing model-listing surfaces. |
| DS-003 | Bounded Local | `GeminiImageClient.generateImage()` starts request shaping | `@google/genai` receives runtime-adjusted model value | `GeminiImageClient` | Captures the internal request-shaping loop where runtime mapping is applied. |

## Primary Execution Spine(s)

- DS-001: `Generate/Edit Image Caller -> ImageClientFactory -> ImageModel -> GeminiImageClient -> Gemini Runtime Model Mapping -> @google/genai generateContent -> ImageGenerationResponse`
- DS-002: `Model Catalog Caller -> ImageModelService/ImageModelProvider or direct ImageClientFactory -> ImageClientFactory static registry -> ImageModel list -> UI/settings/tool selection`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | A caller provides the official model ID. `ImageClientFactory` resolves it to an `ImageModel`. The model constructs `GeminiImageClient`. The client resolves the provider value for API-key or Vertex runtime, sends the prompt/images through `@google/genai`, and returns inline image data as `ImageGenerationResponse`. | Caller, ImageClientFactory, ImageModel, GeminiImageClient, Gemini runtime mapping, Google GenAI client, ImageGenerationResponse | `GeminiImageClient` governs provider request execution; `ImageClientFactory` governs catalog lookup. | MIME guessing, inline image loading, generation config merge, provider credential initialization. |
| DS-002 | Server/UI/catalog callers request available image models. The provider/service wrapper waits for Autobyteus remote discovery, then returns `ImageClientFactory.listModels()`. The new static Gemini model must appear without server duplication. | Model catalog caller, ImageModelProvider, ImageClientFactory, ImageModel list | `ImageClientFactory` | Remote Autobyteus image discovery; provider/runtime summary logging. |
| DS-003 | Inside `GeminiImageClient`, prompt and optional input images are normalized into content parts, response modalities are defaulted according to current runtime policy, and `resolveModelForRuntime` maps the model value before the SDK call. | GeminiImageClient, runtime mapping, Google GenAI SDK | `GeminiImageClient` | Config merge, safety/error handling, image URI extraction. |

## Spine Actors / Main-Line Nodes

- `GenerateImageTool` / `EditImageTool` / direct library caller: initiates image generation or editing with a model identifier.
- `ImageClientFactory`: authoritative built-in image model catalog and client creation boundary.
- `ImageModel`: identity/config object for one image model.
- `GeminiImageClient`: Gemini image request/response owner.
- `resolveModelForRuntime`: runtime-value mapper for Gemini model IDs.
- `@google/genai` client: external provider SDK call.
- `ImageGenerationResponse`: returned image data shape.
- `ImageModelProvider` / `ImageModelService`: server-side catalog consumers.

## Ownership Map

| Node | Owns |
| --- | --- |
| `ImageClientFactory` | Static built-in image model registration, model lookup by identifier, client creation dispatch. |
| `ImageModel` | Model identity, provider, runtime, optional host URL, parameter schema, default multimedia config. |
| `GeminiImageClient` | Gemini content-parts construction, provider SDK request shape, response parsing, provider error normalization. |
| `resolveModelForRuntime` / `gemini-model-mapping.ts` | Runtime-specific Gemini model value resolution across modalities. |
| `ImageModelProvider` / `ImageModelService` | Server model-listing cache/provider behavior; not static model ownership. |
| `GenerateImageTool` / `EditImageTool` | Tool argument schema composition and execution using configured model identifiers; not provider model ownership. |

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `ImageModelProvider.listModels()` | `ImageClientFactory` | Server-side model listing with discovery/logging/cache integration. | Built-in model IDs. |
| `GenerateImageTool` / `EditImageTool` | `ImageClientFactory` and provider clients | Tool-facing image generation/editing commands. | Gemini provider request shape or Gemini catalog membership. |
| `imageClientFactory` singleton export | `ImageClientFactory` class | Convenient public singleton. | Separate registry state. |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| None | This is an additive model registration. | N/A | In This Change | Do not add unofficial aliases that would later need decommissioning. |
| Any speculative local alias accidentally introduced during implementation | Official docs only support `gemini-3.1-flash-image-preview`. | Official model ID in `ImageClientFactory` and `gemini-model-mapping.ts` | In This Change | Search for `gemini-3.1-image`, `gemini-3.1-flash-image` aliases before handoff. |

## Return Or Event Spine(s) (If Applicable)

- `@google/genai generateContent response -> GeminiImageClient response parser -> ImageGenerationResponse -> caller/tool downloads first image`: Existing return path remains unchanged. The new model must return through the same `ImageGenerationResponse` shape.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `GeminiImageClient`
  - Chain: `prompt/inputImageUrls -> contentParts -> configDict -> resolveModelForRuntime -> models.generateContent -> inlineData extraction -> ImageGenerationResponse`
  - Why it matters: The new model must only change the model value registered/mapped into this flow, not add a parallel request path.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Official docs verification | DS-001, DS-002 | `ImageClientFactory` | Confirm exact provider model ID. | Prevent speculative aliases. | Wrong model strings become user-facing API. |
| Runtime model mapping | DS-001, DS-003 | `GeminiImageClient` | Resolve API-key/Vertex model values. | Runtime-specific names can differ. | Provider request code would hardcode runtime policy. |
| Optional generation-config schema | DS-001 | `ImageClientFactory` / `ImageModel` | Expose model-specific optional config to tools. | Allows structured tool args if implemented. | Tool layer would own provider-specific image config. |
| Server model cache/listing | DS-002 | Server settings/UI model selection | Surface catalog model list to users. | Keeps server/UI selection in sync. | Server could duplicate catalog IDs and drift. |
| Credential-gated validation | DS-001 | API/E2E validation | Prove live provider access when available. | Preview provider access may be environment-dependent. | Implementation would conflate missing credentials with catalog failure. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Built-in image model catalog | `autobyteus-ts/src/multimedia/image/image-client-factory.ts` | Extend | Existing source of truth for image model registration. | N/A |
| Gemini image request path | `autobyteus-ts/src/multimedia/image/api/gemini-image-client.ts` | Reuse | Already implements official JS SDK `generateContent` path. | N/A |
| Runtime-specific model value mapping | `autobyteus-ts/src/utils/gemini-model-mapping.ts` | Extend | Existing mapping owner for Gemini modalities. | N/A |
| Server model listing | `autobyteus-server-ts/src/multimedia-management/...` | Reuse | It consumes factory output and should not duplicate static IDs. | N/A |
| Documentation | `autobyteus-ts/docs/provider_model_catalogs.md` | Extend during delivery | Existing durable docs for provider model catalog additions. | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts` multimedia image catalog | Static model registration and schemas | DS-001, DS-002 | `ImageClientFactory` | Extend | Add one Gemini image model. |
| `autobyteus-ts` Gemini runtime utilities | Runtime-specific model value mapping | DS-001, DS-003 | `GeminiImageClient` | Extend | Add new image mapping. |
| `autobyteus-ts` Gemini image adapter | Provider request/response shaping | DS-001, DS-003 | `GeminiImageClient` | Reuse | No client changes expected. |
| `autobyteus-server-ts` multimedia model listing | Server-facing list/cache/reload | DS-002 | `ImageModelProvider` | Reuse | No change expected. |
| Durable docs | Provider model catalog documentation | DS-002 | Delivery/docs sync | Extend | Delivery should record latest addition. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/multimedia/image/image-client-factory.ts` | Multimedia image catalog | `ImageClientFactory` | Add `gemini-3.1-flash-image-preview` `ImageModel`. | Existing static built-in catalog lives here. | Reuses `ImageModel`, `GeminiImageClient`, provider enum. |
| `autobyteus-ts/src/utils/gemini-model-mapping.ts` | Gemini runtime utilities | `resolveModelForRuntime` | Add image runtime mapping for new model. | Existing runtime map lives here. | Reuses existing map shape. |
| `autobyteus-ts/tests/unit/multimedia/image/image-client-factory.test.ts` | Unit tests | Image catalog validation | Assert listing/client creation for new model. | Existing image factory coverage lives here. | Reuses factory mocks. |
| `autobyteus-ts/tests/unit/utils/gemini-model-mapping.test.ts` | Unit tests | Gemini runtime mapping validation | Assert API-key/Vertex image mapping for new model. | Existing runtime map tests live here. | Reuses `resolveModelForRuntime`. |
| `autobyteus-ts/docs/provider_model_catalogs.md` | Durable docs | Provider model catalog docs | Add the new Gemini image model during delivery. | Existing provider catalog doc lives here. | Reuses existing latest additions format. |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Runtime map entry shape | Existing `MODEL_RUNTIME_MAP` in `gemini-model-mapping.ts` | Gemini runtime utilities | Already shared across TTS, LLM, image. | Yes | Yes | A second image-specific mapping table. |
| Optional Gemini image config schema | Local helper inside `image-client-factory.ts`, only if implementation exposes schema | Multimedia image catalog | Avoid repeated enum values if more than one Gemini image model gets schema in future. | Yes | Yes | A broad schema refactor or tool-owned provider config. |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `ImageModel` | Yes | Yes | Low | Use existing `name=value=official ID`; do not add aliases. |
| `MODEL_RUNTIME_MAP.image` | Yes | Yes | Low | Add one exact key with explicit runtime values. |
| Optional `imageConfig` schema | Yes if nested as `imageConfig.aspectRatio`/`imageConfig.imageSize` | Yes | Medium if snake_case and camelCase are both accepted | Use JavaScript SDK field names only (`imageConfig`, `aspectRatio`, `imageSize`) if implemented. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/multimedia/image/image-client-factory.ts` | Multimedia image catalog | `ImageClientFactory` | Register `gemini-3.1-flash-image-preview` using `GeminiImageClient`; optional catalog-owned parameter schema. | Existing built-in image model source of truth. | Yes |
| `autobyteus-ts/src/utils/gemini-model-mapping.ts` | Gemini runtime utilities | `resolveModelForRuntime` | Add `image['gemini-3.1-flash-image-preview']` mapping for `api_key` and `vertex`. | Existing Gemini runtime model map. | Yes |
| `autobyteus-ts/tests/unit/multimedia/image/image-client-factory.test.ts` | Tests | Image catalog tests | Assert the new model is listed and creates a Gemini-backed client. | Existing image factory test. | Yes |
| `autobyteus-ts/tests/unit/utils/gemini-model-mapping.test.ts` | Tests | Mapping tests | Assert new image mapping. | Existing mapping test. | Yes |
| `autobyteus-ts/docs/provider_model_catalogs.md` | Docs | Provider catalog docs | Delivery docs-sync entry for `gemini-3.1-flash-image-preview`. | Existing catalog doc. | Yes |

## Ownership Boundaries

- `ImageClientFactory` is the authoritative public boundary for built-in image model registration. Any caller that needs an image model must depend on factory APIs, not duplicated hardcoded model lists.
- `GeminiImageClient` is the authoritative Gemini image request boundary. The implementation must not add a parallel direct `@google/genai` call for this model outside the client.
- `gemini-model-mapping.ts` is the authoritative runtime model-name mapping. The implementation must not bury runtime-specific model string selection inside `ImageClientFactory` or tools.
- Server/UI wrappers should consume `ImageClientFactory` output; they must not add a separate Gemini 3.1 list item manually.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `ImageClientFactory` | `modelsByIdentifier`, static initialization, `ImageModel` registration | Tools, server model providers, direct library callers | UI/server hardcoding `gemini-3.1-flash-image-preview` outside the factory list | Add/adjust factory model metadata. |
| `GeminiImageClient` | Content parts, response modalities, runtime model mapping call, SDK response parsing | `ImageModel.createClient()` callers | A special-case direct SDK call for Gemini 3.1 image in tools/server | Extend `GeminiImageClient` only if request shape actually changes. |
| `resolveModelForRuntime` | `MODEL_RUNTIME_MAP` | Gemini image/audio/LLM clients | Local runtime mapping objects in provider clients | Add entries to `MODEL_RUNTIME_MAP`. |

## Dependency Rules

Allowed:

- `ImageClientFactory` may depend on `ImageModel`, provider enums, and concrete image client classes.
- `GeminiImageClient` may depend on `initializeGeminiClientWithRuntime`, `resolveModelForRuntime`, image loading utilities, and `@google/genai`.
- Server model providers may depend on `ImageClientFactory` and Autobyteus image discovery.
- Tests may import the factory/mapping utilities directly.

Forbidden:

- Tools, server code, or UI code must not duplicate the new Gemini image model as a separate hardcoded list outside the factory-owned catalog.
- `ImageClientFactory` must not take over Gemini runtime credential/request shaping.
- `GeminiImageClient` must not own static catalog membership.
- Do not add speculative aliases or compatibility fallback names for `3.1`.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `ImageClientFactory.listModels()` | Image model catalog | Return available built-in/discovered image models. | None | New model must appear. |
| `ImageClientFactory.createImageClient(modelIdentifier)` | Image model client creation | Resolve identifier and instantiate owned client. | Exact `ImageModel.modelIdentifier`, here `gemini-3.1-flash-image-preview` | No aliases. |
| `resolveModelForRuntime(modelValue, modality, runtime)` | Gemini provider model value | Map model value per modality/runtime. | `modelValue='gemini-3.1-flash-image-preview'`, `modality='image'`, `runtime='api_key'|'vertex'` | Same official value for both runtimes unless implementation finds official contrary docs. |
| `GeminiImageClient.generateImage(prompt, inputImageUrls?, generationConfig?)` | Gemini image request | Generate images using provider model. | `this.model.value` from `ImageModel` | No new method. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `createImageClient` | Yes | Yes | Low | Use exact official model ID; no aliases. |
| `resolveModelForRuntime` | Yes | Yes | Low | Add image mapping tests. |
| `GeminiImageClient.generateImage` | Yes | Yes | Low | Leave unchanged unless optional schema needs no client change. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| New model | `gemini-3.1-flash-image-preview` | Yes, official provider ID | Low | Use exact docs-backed ID. |
| Catalog owner | `ImageClientFactory` | Yes | Low | Keep catalog entry here. |
| Request owner | `GeminiImageClient` | Yes | Low | Reuse existing owner. |
| Runtime mapper | `resolveModelForRuntime` | Yes | Low | Add image mapping row. |

## Applied Patterns (If Any)

- Factory/registry: `ImageClientFactory` registers and creates image clients by exact model identifier.
- Adapter: `GeminiImageClient` adapts Autobyteus image requests to Google GenAI SDK calls and parses provider responses.
- Mapping table: `MODEL_RUNTIME_MAP` is a small owned lookup table for provider runtime name differences.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/multimedia/image/image-client-factory.ts` | File | `ImageClientFactory` | New `ImageModel` registration for `gemini-3.1-flash-image-preview`. | Existing built-in image model catalog. | Provider SDK call logic; server/UI model lists. |
| `autobyteus-ts/src/utils/gemini-model-mapping.ts` | File | `resolveModelForRuntime` | New runtime mapping row under `image`. | Existing Gemini runtime model map. | Catalog registration or request execution. |
| `autobyteus-ts/tests/unit/multimedia/image/image-client-factory.test.ts` | File | Unit tests | Verify listing and client creation. | Existing image factory test file. | Live provider calls. |
| `autobyteus-ts/tests/unit/utils/gemini-model-mapping.test.ts` | File | Unit tests | Verify runtime mapping. | Existing mapping test file. | Live provider calls. |
| `autobyteus-ts/docs/provider_model_catalogs.md` | File | Docs sync | Document new latest Gemini image catalog addition. | Existing durable provider catalog doc. | Unverified future model names. |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `src/multimedia/image/` | Main-Line Domain-Control plus provider adapters | Yes | Low | Existing compact image subsystem; adding catalog entry here is clear. |
| `src/utils/gemini-model-mapping.ts` | Off-Spine Concern | Yes | Low | Shared Gemini runtime utility intentionally spans modalities. |
| `tests/unit/multimedia/image/` | Tests | Yes | Low | Mirrors image catalog subsystem. |
| `tests/unit/utils/` | Tests | Yes | Low | Mirrors utility mapping owner. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

Target catalog shape:

```ts
const gemini31FlashImageModel = new ImageModel({
  name: 'gemini-3.1-flash-image-preview',
  value: 'gemini-3.1-flash-image-preview',
  provider: MultimediaProvider.GEMINI,
  clientClass: GeminiImageClient,
  parameterSchema: null,
  description: 'Fast Gemini 3.1 Flash Image Preview model for conversational image generation and editing.'
});
```

Target runtime map shape:

```ts
image: {
  'gemini-3.1-flash-image-preview': {
    vertex: 'gemini-3.1-flash-image-preview',
    api_key: 'gemini-3.1-flash-image-preview'
  },
  // existing entries remain
}
```

Optional catalog-owned schema shape if implementation exposes Gemini 3.1 image sizing controls:

```ts
const gemini31ImageSchema = new ParameterSchema([
  new ParameterDefinition({
    name: 'imageConfig',
    type: ParameterType.OBJECT,
    description: 'Gemini 3.1 image output configuration.',
    objectSchema: new ParameterSchema([
      new ParameterDefinition({
        name: 'aspectRatio',
        type: ParameterType.ENUM,
        enumValues: ['1:1', '1:4', '1:8', '3:2', '2:3', '3:4', '4:1', '4:3', '4:5', '5:4', '8:1', '9:16', '16:9', '21:9'],
        description: 'Output aspect ratio.'
      }),
      new ParameterDefinition({
        name: 'imageSize',
        type: ParameterType.ENUM,
        enumValues: ['0.5K', '1K', '2K', '4K'],
        description: 'Output image size.'
      })
    ])
  })
]);
```

Use JavaScript SDK camelCase names (`imageConfig`, `aspectRatio`, `imageSize`) if this optional schema is implemented. Do not add parallel snake_case fields.

## Migration / Refactor Sequence

1. Prepare the dedicated worktree dependency environment if needed (`pnpm install` or existing project-approved setup) so focused tests can run.
2. Add the new `ImageModel` in `ImageClientFactory.initializeRegistry()` near existing Gemini image entries.
3. Include the new model in `modelsToRegister` without removing or reordering existing IDs in a way that breaks expectations.
4. Add the new `image` mapping in `gemini-model-mapping.ts`.
5. Update deterministic unit tests.
6. Run focused unit checks and build if feasible.
7. Handoff to code review; API/E2E may run credential-gated live Gemini image validation if credentials/model access exist.
8. Delivery updates provider catalog docs after integrated-state validation.

## Validation Plan

Implementation-scoped deterministic checks:

- `pnpm exec vitest run tests/unit/multimedia/image/image-client-factory.test.ts tests/unit/utils/gemini-model-mapping.test.ts --reporter verbose` from `autobyteus-ts` after dependency setup.
- `pnpm run build` from `autobyteus-ts` if dependency setup permits.
- Repo search to confirm no speculative aliases were added:
  - `rg -n "gemini-3\.1-(image|flash-image)(['\"@]|$)|gemini-3\.1-pro-image" autobyteus-ts autobyteus-server-ts autobyteus-web --glob '!node_modules'`
  - This should return no added unsupported alias usage; the official `gemini-3.1-flash-image-preview` will appear.

API/E2E validation (owned downstream):

- If credentials are present, create an image client for `gemini-3.1-flash-image-preview` and generate a small image prompt, verifying non-empty data URI or URL response.
- If credentials/model access are missing, classify as provider-access skip and rely on deterministic catalog/mapping checks for implementation correctness.

## Documentation / Delivery Notes

- Delivery should update `autobyteus-ts/docs/provider_model_catalogs.md` to add an Image row for `gemini-3.1-flash-image-preview` with provider Gemini and note that it uses `GeminiImageClient` and `gemini-model-mapping.ts`.
- If delivery finds `autobyteus-ts/docs/llm_module_design_nodejs.md` or another durable doc references current provider model additions, update it or record explicit no-impact.

## Open Risks / Questions

- Live Gemini 3.1 Flash Image Preview access may be blocked by credentials, billing, preview access, or region. Treat these as validation-environment findings unless deterministic catalog/mapping behavior fails.
- Google may publish a future GA ID; this task intentionally supports only the current official preview ID verified on 2026-05-05.
- Optional image sizing/config schema could be useful but should not become a broad redesign of all Gemini image model schemas in this task.
