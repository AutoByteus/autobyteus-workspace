# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready — re-approved by user on 2026-07-03 after CR-002 scope recheck. Current ticket must deliver `generate_video` creation support; `edit_video`, uploaded/source-video editing, and stateful `previous_interaction_id` editing are explicitly deferred to future work.

## Goal / Problem Statement

Add current Google generative-media model support to AutoByteus so agents can use:

1. **Nano Banana 2 Lite** / **Gemini 3.1 Flash-Lite Image** (`gemini-3.1-flash-lite-image`) through existing image generation/editing media paths.
2. **Gemini Omni Flash** (`gemini-omni-flash-preview`) through a new video generation path and agent tool.

The change must first account for current repository reality: AutoByteus already has image and speech media clients/tools, and it can display/read/pass video media, but it does **not** currently have a video generation client/model catalog/tool.

## Investigation Findings

- Google announced Nano Banana 2 Lite and Gemini Omni Flash on **June 30, 2026**. The Google blog says Nano Banana 2 Lite is available in Google AI Studio, Gemini API, and Gemini Enterprise Agent Platform, and Gemini Omni Flash is available to developers for video generation and conversational editing.
- Official Gemini API docs identify:
  - Nano Banana 2 Lite: `gemini-3.1-flash-lite-image`; GA; fast/cost-efficient image generation/editing; only 1K output; supports aspect ratios `1:1`, `3:2`, `2:3`, `3:4`, `4:3`, `4:5`, `5:4`, `9:16`, `16:9`, `21:9`; not optimized for multiple reference inputs or multi-turn sequential editing.
  - Nano Banana 2: `gemini-3.1-flash-image`; GA.
  - Nano Banana Pro: `gemini-3-pro-image`; GA.
  - Legacy Nano Banana: `gemini-2.5-flash-image`; Google recommends moving to Nano Banana 2 Lite for lower cost/faster output.
  - Gemini Omni Flash: `gemini-omni-flash-preview`; public preview; video generation/editing through the Interactions API.
- Google changelog says the old `gemini-3.1-flash-image-preview` and `gemini-3-pro-image-preview` preview image models were shut down on **June 25, 2026**.
- Current AutoByteus image support exists in `autobyteus-ts/src/multimedia/image/*` and server-owned tools exist for `generate_image`, `edit_image`, and `generate_speech`; the approved video design must follow this manifest/parser/schema/service/factory pattern instead of adding a one-off provider call.
- Current image catalog has `gemini-2.5-flash-image`, `gemini-3.1-flash-image-preview`, and `gemini-3-pro-image-preview`, but **does not** have `gemini-3.1-flash-lite-image`, `gemini-3.1-flash-image`, or `gemini-3-pro-image`.
- Current Gemini image request owner (`GeminiImageClient`) already accepts arbitrary registered Gemini image model values, applies `resolveModelForRuntime(..., 'image', runtime)`, calls `client.models.generateContent`, and parses inline image parts. The Lite model can reuse this path.
- There is no `VideoClientFactory`, `VideoModel`, `BaseVideoClient`, `GeminiVideoClient`, default video model setting, video model GraphQL catalog query, or server-owned `generate_video` media tool.
- Existing video support is downstream/adjacent only: context files can be video, LLM messages can carry `video_urls`, Gemini prompt rendering can inline video input for understanding, run-file/media storage classifies video, and the web UI can display video artifacts.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Feature plus cleanup of obsolete Gemini image preview IDs.
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes for video generation; No for additive image model support.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue for video generation capability gap; Legacy Or Compatibility Pressure for stale Gemini image preview IDs; No Design Issue Found for adding Lite to the existing image path.
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Needed, bounded to introducing the missing video media client/catalog/tool boundary and removing stale preview image catalog entries. Broad unification of audio/image/video model classes can be deferred if the design preserves clear ownership.
- Evidence basis: Code inspection of `autobyteus-ts/src/multimedia`, `autobyteus-server-ts/src/agent-tools/media`, model catalog GraphQL/UI paths, plus official Google API docs and changelog.
- Requirement or scope impact: Implementation must not be a one-off direct Google API call inside a tool. Gemini Omni Flash needs a video generation subsystem parallel to existing image/audio media boundaries, while Nano Banana 2 Lite should extend the existing image subsystem.

## Recommendations

1. **Image support:** Update the Gemini image catalog and runtime mapping to current official image IDs:
   - Add `gemini-3.1-flash-lite-image`.
   - Add/keep current GA `gemini-3.1-flash-image` and `gemini-3-pro-image`.
   - Remove/decommission preview IDs `gemini-3.1-flash-image-preview` and `gemini-3-pro-image-preview` from built-in catalog/mapping because Google says they were shut down on June 25, 2026.
   - Keep `gemini-2.5-flash-image` unless separately directed to remove legacy Nano Banana, because Google recommends migration but did not identify this ID as shut down.
2. **Video support:** Add first-class video generation support rather than embedding Omni Flash directly in the tool layer:
   - New `autobyteus-ts/src/multimedia/video/*` capability with `VideoModel`, `BaseVideoClient`, `VideoClientFactory`, `GeminiVideoClient`, and `VideoGenerationResponse`.
   - Register `gemini-omni-flash-preview` as the first built-in video model.
   - Use `@google/genai` `client.interactions.create` in `GeminiVideoClient`.
3. **Tool support:** Add server-owned local tool `generate_video` with `prompt`, optional `input_images`, `output_file_path`, and `generation_config`.
4. **Settings/catalog support:** Add `DEFAULT_VIDEO_GENERATION_MODEL`, a video model catalog service/query, and a Server Settings Basics selector so model choice is not hardcoded.
5. **Scope control:** Current ticket covers `generate_video` creation only: text-to-video plus optional image/reference-image-to-video. Official `video_config.task` generation values (`text_to_video`, `image_to_video`, `reference_to_video`) may be exposed in `generation_config`; `edit`, uploaded/source-video editing, and stateful `previous_interaction_id` editing are deferred to a future `edit_video` design.

## Scope Classification (`Small`/`Medium`/`Large`)

Large.

Rationale: Image support alone would be small, but Gemini Omni Flash requires a new video media generation capability that crosses `autobyteus-ts` multimedia clients, server-owned media tools, server model catalogs/settings, GraphQL, frontend settings/model browsing, file-change semantics, and tests.

## In-Scope Use Cases

- UC-001: User selects/uses `gemini-3.1-flash-lite-image` for image generation or editing through existing media tools/default-model settings.
- UC-002: User sees current Gemini image GA model IDs in available image model catalogs and no longer sees shut-down preview IDs as built-in catalog options.
- UC-003: Agent calls `generate_video` with a text prompt and output path; AutoByteus generates an MP4 using Gemini Omni Flash and writes it to the requested path.
- UC-004: Agent calls `generate_video` with a text prompt plus one or more image references; AutoByteus sends image reference parts to Gemini Omni Flash and writes the resulting MP4.
- UC-005: User configures the default video generation model from Server Settings Basics and future `generate_video` tool calls use that setting.
- UC-006: Generated video files are classified as generated output/video artifacts in run-file changes and can be displayed by existing web video viewers.

## Out of Scope

- `edit_video` or any video editing operation.
- Conversational/multi-turn video editing with persisted `previous_interaction_id`.
- Editing uploaded source/source videos through the Files API.
- Voice/audio-reference editing; Google docs currently list audio references and voice editing as unsupported.
- Video extension/interpolation.
- Provisioned throughput configuration.
- Replacing all Gemini image generation with the Interactions API; existing `generateContent` path remains acceptable because Google still documents legacy Generate Content image generation for these models.
- Removing `gemini-2.5-flash-image` unless explicitly requested.
- Adding third-party/non-Google video providers.

## Functional Requirements

- REQ-001: The image model catalog must register `gemini-3.1-flash-lite-image` as a Gemini image model using `GeminiImageClient`.
- REQ-002: The image model catalog must register current GA Gemini image IDs `gemini-3.1-flash-image` and `gemini-3-pro-image` using `GeminiImageClient`.
- REQ-003: Built-in Gemini image preview IDs `gemini-3.1-flash-image-preview` and `gemini-3-pro-image-preview` must be removed/decommissioned from built-in static registration and runtime mappings; do not add compatibility aliases for them.
- REQ-004: Existing `gemini-2.5-flash-image` support must remain available unless the user separately requests removal.
- REQ-005: Gemini runtime model mapping must include explicit API-key and Vertex identity mappings for active Gemini image IDs and for `gemini-omni-flash-preview` under a video modality.
- REQ-006: A video media subsystem must exist in `autobyteus-ts` with a public factory/client/model shape analogous to image/audio media generation boundaries.
- REQ-007: `VideoGenerationResponse` must return video media references through a `video_urls` array, compatible with existing file-writing/copy behavior.
- REQ-008: `GeminiVideoClient` must generate videos with `client.interactions.create`, model `gemini-omni-flash-preview`, and a video response format.
- REQ-009: `GeminiVideoClient` must support text-to-video prompts.
- REQ-010: `GeminiVideoClient` must support optional image-to-video reference images by loading image references as base64 and constructing Interactions API image/text inputs.
- REQ-011: `GeminiVideoClient` must handle both inline base64 video output and URI-delivered video output. URI output must be downloaded through authenticated Google GenAI SDK file download behavior rather than assuming a public URL.
- REQ-012: Server-owned media tools must include `generate_video`, registered through the existing media tool manifest/registry ownership path.
- REQ-013: `generate_video` must resolve output paths with the existing media path resolver policy and write/copy the generated MP4 to the requested local path.
- REQ-014: `generate_video` must accept `prompt`, optional `input_images`, `output_file_path`, and optional `generation_config` arguments.
- REQ-014A: `generate_video` generation config must expose creation task values only where supported by the current tool input contract: `text_to_video`, `image_to_video`, and `reference_to_video`; it must not expose or accept `edit` for the creation tool.
- REQ-015: Default model settings must include `DEFAULT_VIDEO_GENERATION_MODEL` with fallback `gemini-omni-flash-preview`.
- REQ-016: Server model catalogs/GraphQL must expose video models separately from LLM, audio, and image models.
- REQ-017: Frontend provider/model browser and default-media-model settings must display/configure video generation models.
- REQ-018: Run-file generated-output semantics must treat `generate_video` and `mcp__autobyteus_agent_tools__generate_video` as generated output tools.
- REQ-019: Existing image, edit-image, and speech tool behavior must remain unchanged except for catalog contents and schema reload coverage.
- REQ-020: Durable docs must be updated or explicitly marked no-impact during delivery.

## Acceptance Criteria

- AC-001: `ImageClientFactory.listModels()` includes `gemini-3.1-flash-lite-image`, `gemini-3.1-flash-image`, and `gemini-3-pro-image`, and each creates a `GeminiImageClient`.
- AC-002: `ImageClientFactory.listModels()` no longer includes `gemini-3.1-flash-image-preview` or `gemini-3-pro-image-preview` as built-in API models.
- AC-003: `resolveModelForRuntime(modelId, 'image', 'api_key' | 'vertex')` returns the exact active Gemini image model ID for each active ID.
- AC-004: A focused unit test proves `gemini-3.1-flash-lite-image` image generation uses the existing `GeminiImageClient` request path without adding a parallel image client.
- AC-005: `VideoClientFactory.listModels()` includes `gemini-omni-flash-preview`, and `VideoClientFactory.createVideoClient('gemini-omni-flash-preview')` returns a `GeminiVideoClient`.
- AC-006: `resolveModelForRuntime('gemini-omni-flash-preview', 'video', runtime)` returns `gemini-omni-flash-preview` for supported Gemini runtimes.
- AC-007: A `GeminiVideoClient` unit test with mocked `@google/genai` verifies text-to-video calls `interactions.create` with model `gemini-omni-flash-preview`, video response format, and prompt input.
- AC-008: A `GeminiVideoClient` unit test with mocked image loading verifies image-to-video sends image parts plus a text part.
- AC-009: A `GeminiVideoClient` unit test verifies inline base64 video output becomes a processable video media reference.
- AC-010: A `GeminiVideoClient` unit test verifies URI delivery polls/downloads through `client.files` and returns a temporary local file reference that is cleaned up after service copy.
- AC-011: `MEDIA_TOOL_NAME_LIST` includes `generate_video`; `registerMediaTools()` registers it as a server-owned Multimedia tool.
- AC-012: `generate_video` GraphQL/tool schema exposes `prompt`, `input_images`, `output_file_path`, and nested `generation_config` for the current default video model.
- AC-012A: The nested video `generation_config` schema exposes non-edit creation task values (`text_to_video`, `image_to_video`, `reference_to_video`) and does not expose `edit`.
- AC-013: `MediaGenerationService.generateVideo()` resolves `DEFAULT_VIDEO_GENERATION_MODEL`, creates a video client through `VideoClientFactory`, writes the first generated video reference to `output_file_path`, returns `{ file_path }`, and cleans up the client.
- AC-014: End-to-end/server-owned media tool coverage proves `generate_video` writes expected MP4 bytes in a mocked local-registry flow.
- AC-015: Changing `DEFAULT_VIDEO_GENERATION_MODEL` and reloading schemas changes future `generate_video` schemas/invocations, matching current image/speech behavior.
- AC-016: `availableVideoProvidersWithModels(runtimeKind: 'autobyteus')` returns Gemini video model catalog rows through GraphQL.
- AC-017: `useLLMProviderConfigStore.fetchProvidersWithModels()` stores video providers/models in addition to LLM/audio/image providers/models.
- AC-018: Provider API key/model browser shows a Video Models section and counts video models in provider totals.
- AC-019: Server Settings Basics shows a Video generation default model selector using video model groups.
- AC-020: `isGeneratedOutputTool('generate_video')` and `isGeneratedOutputTool('mcp__autobyteus_agent_tools__generate_video')` return true, and generated `.mp4` paths infer artifact type `video`.
- AC-021: Existing tests for `generate_image`, `edit_image`, `generate_speech`, model catalog listing, and default media model settings continue to pass.
- AC-022: Live Gemini video generation integration, if attempted, is credential/access/region gated and classifies missing credentials, preview access, quota, billing, or region failures as provider-access skips rather than implementation failures.

## Constraints / Dependencies

- Use official model IDs only. Do not create aliases for user typos such as "nana banan light" or unofficial IDs.
- Gemini Omni Flash is public preview as of June 30, 2026; availability, quota, region, and account access may vary.
- Google docs say Interactions API is required/recommended for Gemini Omni Flash video generation.
- For videos larger than 4MB, Google recommends URI delivery and polling/downloading through the Files API/SDK; direct unauthenticated URL download must not be assumed.
- Existing workspace/output path policy should be reused: relative output paths resolve under the agent workspace, absolute paths may target writable local paths.
- The frontend GraphQL generated types may need regeneration after adding a query field.

## Assumptions

- The user wants initial usable video generation, not the full conversational video editing/session feature set.
- Text-to-video and optional image-to-video cover the immediate Gemini Omni Flash need.
- Keeping legacy `gemini-2.5-flash-image` is acceptable because Google recommends migration but does not mark it shut down in the consulted docs.
- Removing shut-down preview IDs from built-in catalogs is acceptable as cleanup; if a user has persisted defaults pointing to preview IDs, existing stale-setting UI behavior can preserve visibility until they choose a current model, but the runtime should not keep compatibility aliases.

## Risks / Open Questions

- RISK-001: Exact `@google/genai` TypeScript typings for `interactions.create`, `response_format`, and file download may require minor implementation adjustment even though official JS examples show the API shape.
- RISK-002: Gemini Enterprise Agent Platform setup may require `GOOGLE_GENAI_USE_ENTERPRISE=True`/ADC for some enterprise paths; current AutoByteus Gemini helper supports API key and Vertex-style configuration. Initial implementation should use the Gemini API path already supported by current helper unless expanded.
- RISK-003: Generated videos can be large/slow; tests should prefer mocks and credential-gated live checks.
- RISK-004: Adding a video model catalog touches multiple UI/API surfaces; missed generated GraphQL/type updates could break build.
- OPEN-001: Should this ticket also update image model default from `gpt-image-1.5` to Nano Banana 2 Lite? Recommendation: no, do not change defaults without explicit user request.
- OPEN-002: Should multi-turn video editing be included now? Recommendation: no, defer to a follow-up after basic generation works.

## Requirement-To-Use-Case Coverage

| Use Case | Covered Requirements |
| --- | --- |
| UC-001 | REQ-001, REQ-004, REQ-005, REQ-019 |
| UC-002 | REQ-002, REQ-003, REQ-005 |
| UC-003 | REQ-006, REQ-007, REQ-008, REQ-009, REQ-011, REQ-012, REQ-013, REQ-014, REQ-014A, REQ-015 |
| UC-004 | REQ-006, REQ-008, REQ-010, REQ-011, REQ-012, REQ-014, REQ-014A |
| UC-005 | REQ-015, REQ-016, REQ-017 |
| UC-006 | REQ-013, REQ-018 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criteria | Scenario Intent |
| --- | --- |
| AC-001 - AC-004 | Image catalog/mapping and existing image path support for Nano Banana 2 Lite/current Gemini image IDs. |
| AC-005 - AC-010 | New video client/model subsystem and Gemini Omni Flash provider adapter behavior. |
| AC-011 - AC-015 | Server-owned `generate_video` tool registration, schema including creation task values, execution, output writing, and setting-driven behavior. |
| AC-016 - AC-019 | Server/frontend model catalog and default model selector visibility for video generation. |
| AC-020 | Run-file/generated-output artifact semantics for generated video files. |
| AC-021 | Regression guard for existing media tools and settings. |
| AC-022 | Live-provider validation classification. |

## Approval Status

Re-approved by user on 2026-07-03 after CR-002. User confirmed current ticket definitely needs correct `generate_video` support, while video editing can be done in a future `edit_video` effort. Current ticket remains creation-only: text-to-video plus image/reference-image-to-video; no uploaded/source-video editing, no `previous_interaction_id`, and no `task=edit`.
