# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready

## Goal / Problem Statement

Google's current Gemini native image model line now includes a 3.1 Flash image model. Add support for the official latest Gemini image-generation model to the existing Autobyteus Gemini image provider path so users can select and run it through existing image-generation and image-editing surfaces.

The user's guessed name was approximate ("3.1 image model or something"). Official Google docs identify the target as **Gemini 3.1 Flash Image Preview / Nano Banana 2**, with provider model ID `gemini-3.1-flash-image-preview`.

## Investigation Findings

- Official Gemini API docs list three Gemini native image-generation models:
  - Nano Banana 2: `gemini-3.1-flash-image-preview`.
  - Nano Banana Pro: `gemini-3-pro-image-preview`.
  - Nano Banana: `gemini-2.5-flash-image`.
- The Gemini 3.1 Flash Image model page says the model code is `gemini-3.1-flash-image-preview`, supports text/image inputs and image/text outputs, supports image generation, and was last updated on 2026-04-28 UTC.
- Vertex AI docs confirm the same model ID `gemini-3.1-flash-image-preview`, text/image input, text/image output, image generation/editing capabilities, public preview status, global availability, and release date February 26, 2026.
- Local code already has Gemini image support through `GeminiImageClient` and already registers `gemini-2.5-flash-image` and `gemini-3-pro-image-preview`; `gemini-3.1-flash-image-preview` is absent.
- The existing `GeminiImageClient` sends model values through `@google/genai` `models.generateContent`, with runtime-specific name resolution in `src/utils/gemini-model-mapping.ts`. The new model can reuse this provider path; no new transport/client is required.
- The dedicated task worktree does not currently have local `node_modules`; a baseline focused Vitest command failed before test execution with `Command "vitest" not found`. Downstream implementation should install/link dependencies or otherwise use an available project test environment before validation.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Feature
- Initial design issue signal (`Yes`/`No`/`Unclear`): No
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): No Design Issue Found
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Not Needed
- Evidence basis: `ImageClientFactory` is the existing owned static image-model catalog; `GeminiImageClient` is the existing Gemini image request owner; `gemini-model-mapping.ts` is the existing runtime-name mapping owner. The missing support is a local catalog/mapping omission, not an ownership or API-boundary problem.
- Requirement or scope impact: Keep the change additive and provider-owned. Do not add speculative aliases or a new Gemini image client path.

## Recommendations

- Register `gemini-3.1-flash-image-preview` as a built-in Gemini image model in `autobyteus-ts/src/multimedia/image/image-client-factory.ts`.
- Add `gemini-3.1-flash-image-preview` to the image section of `autobyteus-ts/src/utils/gemini-model-mapping.ts` for both `api_key` and `vertex` runtimes, using the same official model ID for both unless implementation finds a current official runtime-specific alias.
- Add deterministic unit tests for catalog registration and runtime mapping.
- Keep existing Gemini image IDs (`gemini-2.5-flash-image`, `gemini-3-pro-image-preview`) and Imagen/OpenAI image IDs unchanged.
- Do not add unverified aliases such as `gemini-3.1-image`, `gemini-3.1-flash-image`, or `gemini-3.1-pro-image`.
- Do not change default image-generation or image-editing models in this task.

## Scope Classification (`Small`/`Medium`/`Large`)

Small

## In-Scope Use Cases

- UC-001: A user or server setting can select `gemini-3.1-flash-image-preview` as an image-generation model and receive a `GeminiImageClient` through the existing `ImageClientFactory` path.
- UC-002: A caller can use the new model for image editing/reference-image workflows through the existing Gemini image client path.
- UC-003: API-key and Vertex runtime modes both resolve `gemini-3.1-flash-image-preview` consistently through `resolveModelForRuntime`.
- UC-004: Existing Gemini image models and non-Gemini image models remain available.

## Out of Scope

- Adding a new image provider or a new Gemini-specific transport layer.
- Changing default image-generation or image-editing model settings.
- Removing existing Gemini 2.5 / Gemini 3 Pro / Imagen / OpenAI image models.
- Adding speculative or undocumented model aliases.
- Broad redesign of image parameter-schema ownership.
- Full live provider validation with paid credentials; API/E2E validation may classify missing or blocked provider access separately from catalog support.

## Functional Requirements

- REQ-001: Register the official Gemini 3.1 Flash Image Preview model ID `gemini-3.1-flash-image-preview` in the built-in image model catalog.
- REQ-002: The registered model must use provider `GEMINI` and `GeminiImageClient`, preserving the existing Gemini image request boundary.
- REQ-003: Add image runtime mapping coverage for `gemini-3.1-flash-image-preview` for both `api_key` and `vertex` runtimes.
- REQ-004: Preserve support for existing built-in image models: `gpt-image-1.5`, `gpt-image-2`, `imagen-4`, `gemini-2.5-flash-image`, and `gemini-3-pro-image-preview`.
- REQ-005: Do not add undocumented aliases or guessed model names for the user's approximate `3.1` reference.
- REQ-006: Do not change default image generation/editing model selection.
- REQ-007: Add deterministic unit coverage that proves catalog registration and runtime mapping for the new model.
- REQ-008: Keep durable provider-model documentation in sync during delivery, or record explicit no-impact if docs already cover the final state.

## Acceptance Criteria

- AC-001: `ImageClientFactory.listModels()` includes an `ImageModel` whose `modelIdentifier`, `name`, and `value` are `gemini-3.1-flash-image-preview`.
- AC-002: `ImageClientFactory.createImageClient('gemini-3.1-flash-image-preview')` returns a `GeminiImageClient`-backed image client without requiring a new client class.
- AC-003: `resolveModelForRuntime('gemini-3.1-flash-image-preview', 'image', 'api_key')` returns `gemini-3.1-flash-image-preview`.
- AC-004: `resolveModelForRuntime('gemini-3.1-flash-image-preview', 'image', 'vertex')` returns `gemini-3.1-flash-image-preview`, unless implementation finds a newer official Vertex-specific alias and documents it.
- AC-005: Existing image-model unit expectations still pass and existing model identifiers remain present.
- AC-006: A repo search after implementation finds no speculative aliases added for this model.
- AC-007: Focused unit checks for image catalog and Gemini model mapping pass in a prepared test environment.
- AC-008: If credential-gated live Gemini image validation is attempted, missing/invalid/quota/model-access-blocked credentials are reported as provider-access skips rather than catalog support failures.

## Constraints / Dependencies

- Model information is temporally unstable; official Google docs must remain the source of truth.
- Current official target on 2026-05-05 is `gemini-3.1-flash-image-preview`.
- The existing provider boundary is `GeminiImageClient`; callers above it should not bypass the image client to call `@google/genai` directly.
- The ticket worktree is `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-latest-image-model-support` on branch `codex/gemini-latest-image-model-support` from `origin/personal`.
- Local dependency setup is incomplete in the ticket worktree until downstream runs install/link steps.

## Assumptions

- The user's phrase "3.1 image model or something" refers to the currently documented Gemini 3.1 Flash Image Preview / Nano Banana 2 model.
- Support means built-in model catalog/mapping support through existing tools and server model-listing paths, not changing product defaults.
- The current `@google/genai` dependency and `GeminiImageClient` request shape are sufficient for this model because official JavaScript examples use the same `models.generateContent` method with a model string.

## Risks / Open Questions

- The model is Preview/Pre-GA; availability may depend on region, account, billing, or model-access flags.
- If live validation credentials are unavailable, implementation can still complete deterministic catalog/mapping support; API/E2E should record provider-access skips separately.
- Google may later publish a GA non-preview ID; this task should not invent it preemptively.
- Optional model-specific image-generation parameters (`imageConfig.aspectRatio`, `imageConfig.imageSize`) are supported by docs but existing Gemini image models do not currently expose parameter schemas. Exposing these for the new model is allowed if implemented inside the image catalog/provider boundary, but broad schema redesign is out of scope.

## Requirement-To-Use-Case Coverage

| Use Case | Requirements |
| --- | --- |
| UC-001 | REQ-001, REQ-002, REQ-004, REQ-006, REQ-007 |
| UC-002 | REQ-001, REQ-002, REQ-004, REQ-007 |
| UC-003 | REQ-003, REQ-007 |
| UC-004 | REQ-004, REQ-005, REQ-006 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion | Scenario Intent |
| --- | --- |
| AC-001 | Proves the new model is visible to registry/listing callers. |
| AC-002 | Proves the existing Gemini image client remains the governing request owner. |
| AC-003 | Proves API-key runtime mapping is covered. |
| AC-004 | Proves Vertex runtime mapping is covered or a newer official alias is documented. |
| AC-005 | Proves additive registration did not regress existing image catalog support. |
| AC-006 | Proves the implementation does not normalize guessed/non-official aliases into the API. |
| AC-007 | Proves deterministic local validation exists. |
| AC-008 | Separates provider-access failures from support/registration failures. |

## Approval Status

Design-ready. The user's request explicitly asked to add support if the model exists; official Google docs confirm the condition and identify the exact target model ID. No separate user sign-off was requested because scope is narrow, additive, and directly resolves the conditional request.
