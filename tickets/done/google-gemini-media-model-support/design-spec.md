# Design Spec

## Current-State Read

The authoritative task worktree is `/Users/normy/autobyteus_org/autobyteus-worktrees/google-gemini-media-model-support` on branch `codex/google-gemini-media-model-support`, fast-forwarded to `98db9e8b` from `origin/personal` before this design.

Current AutoByteus generated-media support has two relevant layers:

1. **Provider/client layer in `autobyteus-ts`:**
   - Audio generation uses `AudioModel` -> `AudioClientFactory` -> `BaseAudioClient` -> provider client (`GeminiAudioClient`, `OpenAIAudioClient`, `AutobyteusAudioClient`) -> `SpeechGenerationResponse(audio_urls)`.
   - Image generation/editing uses `ImageModel` -> `ImageClientFactory` -> `BaseImageClient` -> provider client (`GeminiImageClient`, `OpenAIImageClient`, `AutobyteusImageClient`) -> `ImageGenerationResponse(image_urls)`.
   - Model factories own built-in registrations and expose `listModels()` for server catalog consumers.
   - Model-specific generation parameters live on model `parameterSchema`; model default config is built from schema default values.
   - There is no `VideoModel`, `VideoClientFactory`, `BaseVideoClient`, provider video client, or `VideoGenerationResponse`.

2. **Server-owned media tool layer in `autobyteus-server-ts/src/agent-tools/media`:**
   - `media-tool-contract.ts` owns tool names, tool-kind mapping, input DTOs, and result DTOs.
   - `media-tool-input-parsers.ts` owns raw tool argument normalization and validation.
   - `media-tool-parameter-schemas.ts` owns public tool parameter schemas and adds model-specific nested `generation_config` from the current default model catalog entry.
   - `media-tool-manifest.ts` is the manifest owner connecting name, description, schema, parser, and service execution.
   - `MediaAutobyteusTool` is a thin local-tool wrapper that delegates to the manifest and `MediaGenerationService`.
   - `MediaGenerationService` owns default model resolution, output path resolution, factory-based client creation, provider call, first returned media URL/path extraction, final write/copy via `MediaPathResolver`, and per-call client cleanup.
   - Existing server-owned tools are `generate_image`, `edit_image`, and `generate_speech`; there is no `generate_video`.

Current Gemini image support is stale relative to Google's current docs:

- `ImageClientFactory` registers `gemini-2.5-flash-image`, `gemini-3.1-flash-image-preview`, and `gemini-3-pro-image-preview`.
- It does not register `gemini-3.1-flash-lite-image`, `gemini-3.1-flash-image`, or `gemini-3-pro-image`.
- `GeminiImageClient` already owns the provider call and can use newly registered Gemini image IDs because it sends `this.model.value` through `resolveModelForRuntime(..., 'image', runtime)` and calls Google GenAI image generation with inline image parsing.
- `gemini-model-mapping.ts` has image mappings for preview IDs and legacy `gemini-2.5-flash-image`; it has no active GA image IDs and no video modality.

Current video support exists only around generated media, not generation:

- LLM messages and stream payloads have `video_urls`.
- Context files and media formatters can classify video through `media-file-kind.ts`.
- Gemini prompt rendering can inline video input for model understanding.
- Run-file artifact inference and web UI viewers can display video outputs once a file exists.
- `file-change-tool-semantics.ts` recognizes generated-output tools only for image and speech names.

External/current Google API facts that drive the design:

- The official image docs list active Nano Banana image IDs: `gemini-3.1-flash-lite-image`, `gemini-3.1-flash-image`, `gemini-3-pro-image`, and legacy `gemini-2.5-flash-image`.
- The Gemini API changelog says `gemini-omni-flash-preview` and `gemini-3.1-flash-lite-image` were released on 2026-06-30, and preview image IDs `gemini-3.1-flash-image-preview` / `gemini-3-pro-image-preview` were deprecated with shutdown on 2026-06-25.
- Gemini Omni Flash video generation uses the Interactions API (`client.interactions.create`) and returns `output_video.data` for inline output or `output_video.uri` for URI delivery. URI delivery must be polled/downloaded through the Google GenAI Files API/SDK, not treated as a public unauthenticated URL.
- CR-002 official-doc recheck confirmed Omni docs also document `video_config.task` values (`text_to_video`, `image_to_video`, `reference_to_video`, `edit`), stateful editing with `previous_interaction_id`, and uploaded-video editing through Files API. The user re-approved the current ticket as creation-only: deliver correct `generate_video` now; defer `edit_video`, uploaded/source-video editing, and stateful editing to future work.

## Intended Change

Implement the approved scope as a clean extension of current owners:

1. Replace built-in Gemini image preview entries with current direct GA image IDs and add Nano Banana 2 Lite.
2. Add a first-class video multimedia subsystem in `autobyteus-ts` for Gemini Omni Flash Preview.
3. Add the server-owned `generate_video` tool using the same contract/parser/schema/manifest/service path as `generate_image` and `generate_speech`; current-ticket behavior is creation-only: text-to-video plus image/reference-image-to-video.
4. Add a video default-model setting, model catalog service/query, frontend store state, provider model browser section, and Server Settings Basics selector.
5. Reuse existing downstream output-file, file-change, and video viewer paths instead of adding a separate artifact/display path.

## CR-002 Scope Reconfirmation

Code review round 3 correctly identified that the official Omni docs include broader editing/source-video flows than the original narrow `generate_video` contract. The user has now re-approved the current ticket scope as follows:

- **In this ticket:** correct `generate_video` creation support for text-to-video and image/reference-image-to-video.
- **Expose now:** non-edit creation task values in model-specific `generation_config`: `text_to_video`, `image_to_video`, and `reference_to_video`.
- **Defer:** `edit_video`, `task=edit`, uploaded/source-video editing, `previous_interaction_id`, and stateful/multi-turn editing.
- **Do not add:** audio-reference upload or voice editing, because official docs currently say those are unsupported.

This resolves CR-002 as a scoped deferral rather than an expansion of the current ticket.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Feature plus cleanup/behavior change for obsolete Gemini image preview model IDs.
- Current design issue found (`Yes`/`No`/`Unclear`): Yes for generated-video capability; no for adding current Gemini image model IDs to the existing image owner.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue for video generation absence; Legacy Or Compatibility Pressure for removed Google preview image IDs; No Design Issue Found for Nano Banana Lite using the existing image path.
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes, bounded to adding a video media subsystem and catalog/tool extensions; broad multimedia base-class unification is deferred.
- Evidence:
  - `autobyteus-ts/src/multimedia` has audio/image folders and no video folder.
  - `autobyteus-server-ts/src/agent-tools/media` has a coherent media tool manifest/service path for image and speech, but no video tool entry.
  - `MediaGenerationService` currently depends on image/audio factories only.
  - Server/GraphQL/web model catalogs are split into LLM/audio/image and lack video.
  - Google docs/changelog make the current preview image IDs obsolete and identify `gemini-omni-flash-preview` as a video model.
  - CR-002 recheck identified official editing/source-video features beyond the original narrow design; the user explicitly deferred those editing capabilities to future work and reaffirmed current-ticket `generate_video` creation support.
- Design response:
  - Use the existing generated-media ownership pattern and create the missing video equivalent: `VideoModel`, `BaseVideoClient`, `VideoClientFactory`, `GeminiVideoClient`, `VideoGenerationResponse`.
  - Extend the current media tool manifest path with creation-only `generate_video` instead of direct Google calls in a tool wrapper.
  - Remove preview image registrations/mappings and replace with current direct GA image IDs without compatibility aliases.
- Refactor rationale:
  - Directly calling Google Omni from `MediaAutobyteusTool` or `MediaGenerationService` would bypass the provider/client boundary already used by image and audio and would duplicate model config/catalog behavior.
  - A bounded video subsystem preserves the current factory/client ownership model while avoiding a broad refactor of audio/image internals.
- Intentional deferrals and residual risk, if any:
  - Defer a generic `MultimediaModel`/`BaseMediaClient` abstraction. Audio and image model classes are similar, but forcing a shared base now would touch public exports and unrelated provider code. Residual risk: minor duplication across audio/image/video model classes remains.
  - Defer remote AutoByteus video model discovery and remote `/generate-video` client/server endpoints. Current `AutobyteusClient` only supports remote image/speech endpoints. Residual risk: networked AutoByteus hosts will not advertise video models until a follow-up adds remote contracts.
  - Defer `edit_video`, `task=edit`, video editing sessions, `previous_interaction_id`, uploaded/source-video editing, and audio-reference/voice editing. This is user-approved after CR-002. Residual risk: users get initial video creation, not full conversational video editing, until the future edit-video ticket.

## Terminology

- `Image direct GA IDs`: `gemini-3.1-flash-lite-image`, `gemini-3.1-flash-image`, and `gemini-3-pro-image`.
- `Image preview IDs`: `gemini-3.1-flash-image-preview` and `gemini-3-pro-image-preview`.
- `Video model`: Gemini Omni Flash Preview, `gemini-omni-flash-preview`.
- `Media tool layer`: server-owned local tools that expose generated-media capabilities to agents.
- `Provider/client layer`: `autobyteus-ts` multimedia model/factory/client code that knows how to talk to a provider SDK/API.

## Design Reading Order

Read this design in this order:

1. Data-flow spines and ownership.
2. Capability-area allocation.
3. File responsibilities and reusable owned structures.
4. Folder/path mapping, migration sequence, and validation guidance.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove built-in preview image registrations/mappings/tests/docs for `gemini-3.1-flash-image-preview` and `gemini-3-pro-image-preview`.
- Do not add aliases from preview IDs to GA IDs. The model identifier is an external provider identity and must remain exact.
- Existing UI behavior that shows a persisted setting as a “current value not in catalog” may remain because it is not an execution compatibility path; it helps users replace stale settings. Runtime execution must not silently translate preview IDs.
- Keep `gemini-2.5-flash-image` because it remains documented as legacy and the user did not request removal.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-IMG-001 | Primary End-to-End | User/tool/default model selection for image | Generated image file written through existing image path | `ImageClientFactory` + `GeminiImageClient` + `MediaGenerationService` | Shows image work is catalog/mapping cleanup, not a new image provider path. |
| DS-VID-001 | Primary End-to-End | Agent invokes creation-only `generate_video` | MP4 file at requested output path | `MediaGenerationService` with `VideoClientFactory`/`GeminiVideoClient` | Defines the current-ticket product capability: text-to-video and image/reference-image-to-video. |
| DS-CAT-001 | Primary End-to-End | Server/frontend model catalog request | UI-visible video model groups and default-model selector | `ModelCatalogService` and frontend `llmProviderConfig` store | Makes video model selection configurable instead of hardcoded. |
| DS-FILE-001 | Return-Event | Tool result/file write observation | Run-file generated-output video artifact visible in web UI | File-change processor/payload builder | Confirms generated videos enter existing artifact/viewer flow. |
| DS-GEMINI-VID-LOCAL | Bounded Local | `GeminiVideoClient.generateVideo` request construction | Inline data URI or downloaded temp MP4 path | `GeminiVideoClient` | Encapsulates Interactions API request/response, URI polling, SDK download, and temp cleanup. |

## Primary Execution Spine(s)

- **Image model update spine:** `Media default/tool caller -> MediaGenerationService -> ImageClientFactory -> GeminiImageClient -> Google image generation -> ImageGenerationResponse -> MediaPathResolver output file`
- **Generate video spine:** `Agent tool invocation -> MediaAutobyteusTool -> MEDIA_TOOL_MANIFEST -> MediaGenerationService.generateVideo -> VideoClientFactory -> GeminiVideoClient -> Google Interactions API (text/image/reference task) -> VideoGenerationResponse -> MediaPathResolver output file`
- **Video catalog/settings spine:** `Settings/model browser UI -> GraphQL availableVideoProvidersWithModels -> ModelCatalogService -> VideoModelService -> VideoClientFactory.listModels -> ProviderWithModels -> frontend store -> media default selector/provider browser`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-IMG-001 | Existing image tool/service flow remains authoritative. The image catalog swaps preview Gemini image entries for current direct IDs and adds Lite. Runtime mapping resolves current IDs for API-key/Vertex modes. | MediaGenerationService, ImageClientFactory, GeminiImageClient, Google GenAI image API | Image media subsystem and server media service | Model catalog cleanup, runtime mapping tests, docs sync. |
| DS-VID-001 | A creation-only `generate_video` tool parses prompt/images/output path/config, optionally accepts non-edit task values (`text_to_video`, `image_to_video`, `reference_to_video`), resolves the default video model, creates a video client through the video factory, writes the first returned video URL/path to the requested path, and cleans up. | MediaAutobyteusTool, MEDIA_TOOL_MANIFEST, MediaGenerationService, VideoClientFactory, GeminiVideoClient | Server media tool subsystem plus video media subsystem | Path resolution, config schema, task validation, first-media extraction, cleanup. |
| DS-CAT-001 | Video models are listed separately from LLM/audio/image, grouped by provider in GraphQL, stored in the frontend catalog store, displayed in provider browser totals, and selectable as the default video model. | ModelCatalogService, VideoModelService, LlmProviderResolver, frontend store/settings UI | Model catalog service and frontend store | GraphQL generated types, localization, tests. |
| DS-FILE-001 | When the tool writes an MP4 and returns `{ file_path }`, generated-output tool detection marks the change as generated output and artifact type inference classifies `.mp4` as video for existing UI viewers. | File-change tool semantics, payload builder, web artifact viewer | Agent file-change processing | Add tool names only; do not rebuild video viewer. |
| DS-GEMINI-VID-LOCAL | `GeminiVideoClient` converts local/remote/data URI image references into Interactions API image parts, sends text/image input, asks for video response format, handles inline or URI output, polls/downloads URI output to a temp file, and tracks temp files for cleanup after service copy. | GeminiVideoClient, Google GenAI Interactions API, Google Files API | Gemini video provider adapter | Media reference loading, mime detection, timeout/poll policy, temp-file lifecycle. |

## Spine Actors / Main-Line Nodes

- `MediaAutobyteusTool`: thin local tool wrapper for server-owned media tools.
- `MEDIA_TOOL_MANIFEST`: media tool manifest authority connecting tool name, description, schema, parser, and execution.
- `MediaGenerationService`: server-side generated-media execution owner.
- `VideoClientFactory`: video model registry and client construction owner.
- `GeminiVideoClient`: Gemini Omni Interactions API adapter and response/download owner.
- `VideoGenerationResponse`: video media response boundary object.
- `ModelCatalogService`: server runtime model catalog aggregator.
- `LlmProviderResolver`: GraphQL provider/model query boundary.
- `useLLMProviderConfigStore`: frontend catalog state owner.
- `MediaDefaultModelsCard` helpers: default media model setting UI owner.
- File-change processor/payload builder: generated-output event classification owner.

## Ownership Map

- `ImageClientFactory` owns built-in image model registration and must be the only built-in image catalog edit point for this task.
- `GeminiImageClient` owns Gemini image request construction and response parsing; it should not be forked for Lite/GA ID support.
- `VideoClientFactory` owns built-in video model registration and creation. It does not execute provider calls.
- `GeminiVideoClient` owns provider-specific Interactions API details, URI polling/download, and temp video files.
- `MediaGenerationService` owns server media operation sequencing and output writing, but does not know Google Interactions API request fields.
- `MediaPathResolver` owns workspace/absolute path policy and final write/copy through `downloadFileFromUrl`; it does not know Google authenticated file URIs.
- `MediaModelResolver` owns default setting lookup and catalog entry lookup by media kind.
- `ModelCatalogService` owns server-side catalog aggregation by runtime kind; GraphQL consumes it.
- Frontend `llmProviderConfig` owns query results and provider/model state for UI; components consume the store.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `MediaAutobyteusTool` | `MEDIA_TOOL_MANIFEST` and `MediaGenerationService` | Adapts the local tool registry contract to server media execution. | Provider calls, model selection, path policy. |
| GraphQL `availableVideoProvidersWithModels` | `ModelCatalogService` / `VideoModelService` | Exposes catalog rows to frontend. | Built-in model IDs or direct factory construction beyond catalog service call. |
| `ProviderModelBrowser.vue` | `useProviderApiKeySectionRuntime` and store state | Renders selected-provider model lists. | Provider/model aggregation policy. |
| `MediaDefaultModelsCard.vue` | `useMediaDefaultModelsCard` and `mediaDefaultModelSettings.ts` | Renders default media selectors. | Catalog-kind routing or setting-key definitions outside helpers. |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Built-in `gemini-3.1-flash-image-preview` image model registration | Google says preview models were shut down; built-in catalog option is obsolete. | `ImageClientFactory` active `gemini-3.1-flash-image` entry | In This Change | No alias. Update tests/docs. |
| Built-in `gemini-3-pro-image-preview` image model registration | Google says preview models were shut down; built-in catalog option is obsolete. | `ImageClientFactory` active `gemini-3-pro-image` entry | In This Change | No alias. Update tests/docs. |
| Runtime mappings for the two preview image IDs | Runtime mapping should not preserve obsolete execution paths. | Active image ID mappings in `gemini-model-mapping.ts` | In This Change | Unknown model fallback remains generic, but no explicit preview mapping. |
| Tests expecting preview image IDs | They assert obsolete behavior. | Tests for Lite/current GA IDs and absence of preview IDs | In This Change | Required to make cleanup durable. |
| Docs/examples listing preview image IDs | They would direct users to broken model IDs. | Updated provider catalog docs | In This Change or delivery docs sync | Delivery owns final doc sync, but implementation should update obvious repo docs if touched. |
| One-off/direct Gemini Omni call inside server media tool | Would bypass provider/client layer and duplicate model config/catalog behavior. | `VideoClientFactory` + `GeminiVideoClient` | In This Change | This is an avoided design, not existing code. |

## Return Or Event Spine(s) (If Applicable)

- `GeminiVideoClient -> VideoGenerationResponse(video_urls) -> MediaGenerationService -> MediaPathResolver.writeGeneratedMediaFromUrl -> { file_path }`
- `Tool execution result/file write -> file-change event processor -> isGeneratedOutputTool(generate_video) -> FileChangePayloadBuilder -> artifact type video -> existing web video viewer`

The event spine does not require a new viewer. The only necessary change is recognizing `generate_video`/`mcp__autobyteus_agent_tools__generate_video` as generated-output sources; `.mp4` inference is already available.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `GeminiVideoClient`
  - `Normalize config -> Build Interactions input -> Create interaction -> Extract inline data or URI -> Poll file state -> SDK download to temp MP4 -> Return video URL/path -> Cleanup temp files`
  - Why it matters: URI-delivered video is not a normal public URL. Keeping this loop inside `GeminiVideoClient` prevents server path/output code from depending on Google file lifecycle details.

- Parent owner: `MediaGenerationService.generateVideo`
  - `Resolve model -> Resolve output path -> Resolve image reference paths -> Create client -> Generate -> Write first video -> Cleanup client`
  - Why it matters: Mirrors image/speech sequencing and keeps provider details behind the client factory.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Model-specific `generation_config` schema | DS-VID-001, DS-CAT-001 | Video model/factory and media tool schema builder | Expose `aspect_ratio`, `delivery`, non-edit `task` values (`text_to_video`, `image_to_video`, `reference_to_video`), and local polling controls for the configured video model. | Keeps tool schema dynamic like image/speech while resolving CR-002's task-value gap for creation. | Tool schema would hardcode provider params or diverge from catalog. |
| Media reference loading | DS-GEMINI-VID-LOCAL, DS-IMG-001 | Provider clients | Decode `data:` URIs, read local files, fetch HTTP(S), and report mime/base64 for image references. | Video image-to-video and Gemini image references share this concern. | Each provider client would reimplement inconsistent data URI/path handling. |
| Runtime model mapping | DS-IMG-001, DS-VID-001 | Gemini provider adapters | Resolve model IDs for API-key/Vertex runtimes. | Existing Gemini helper expects this boundary. | Provider clients would embed runtime-specific maps. |
| Default setting descriptions | DS-CAT-001 | Server settings service | Register `DEFAULT_VIDEO_GENERATION_MODEL` as a known editable setting. | User can configure default in Server Settings Basics. | Hidden setting with no metadata/description. |
| Frontend localization | DS-CAT-001 | Settings UI | Labels/loading text for video models. | Required by existing localization boundary. | Hardcoded UI strings or missing labels. |
| Generated-output tool set | DS-FILE-001 | File-change semantics | Identify media generation tool names. | Allows output file events to be typed as generated outputs. | Tool result would appear as ordinary write/edit or miss artifact grouping. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Gemini image Lite/current IDs | Image multimedia subsystem | Reuse/Extend | Existing `ImageClientFactory` and `GeminiImageClient` already own this. | N/A |
| Gemini Omni video generation | No video multimedia subsystem exists | Create New | Video has distinct output DTO, model catalog kind, provider request/response, and tool operation. | Image/audio clients cannot represent video generation without ownership drift. |
| Server media tool entry | Server `agent-tools/media` | Extend | Existing manifest/service pattern exactly owns generated media tools. | N/A |
| Final file writing | `MediaPathResolver` + `downloadFileFromUrl` | Reuse | It already writes data URIs/local paths/HTTP to output path. | N/A; Google URI download remains inside `GeminiVideoClient` before returning local temp path. |
| Model catalog exposure | `ModelCatalogService`, multimedia-management services | Extend | Existing audio/image services provide the pattern for model listing/caching. | N/A |
| Video artifact rendering | Existing run-file + web video display | Reuse | Video type inference/viewers already exist. | N/A |
| Remote AutoByteus video provider discovery | Autobyteus remote image/audio provider pattern | Deferred | Would require new remote endpoints/client contracts beyond the immediate local Gemini Omni capability. | Current areas are image/audio-specific and remote video API does not exist. |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts` image multimedia | Active Gemini image catalog/mapping and existing Gemini image client path | DS-IMG-001 | Image factory/client | Extend | Remove preview IDs; add Lite/GA IDs. |
| `autobyteus-ts` video multimedia | Video model/client/factory and Gemini Omni adapter | DS-VID-001, DS-GEMINI-VID-LOCAL | Video factory/client | Create New | Mirrors audio/image without broad shared-base refactor. |
| `autobyteus-ts` multimedia utils | Shared media reference loading and response DTOs | DS-IMG-001, DS-VID-001 | Provider clients | Extend | Add tight loader and `VideoGenerationResponse`. |
| Server media tools | Public tool contract/schema/manifest/execution | DS-VID-001 | MediaGenerationService | Extend | Add `generate_video`. |
| Server settings/model catalog | Default video model setting and video model list | DS-CAT-001 | ModelCatalogService, ServerSettingsService | Extend | Separate video catalog from LLM/audio/image. |
| Frontend settings/provider browser | Video model query state and UI selection | DS-CAT-001 | Store + settings components | Extend | Add video provider groups and defaults selector. |
| Agent file-change processing | Generated-output classification | DS-FILE-001 | File-change processor | Extend | Add tool names only. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/multimedia/video/video-model.ts` | Video multimedia | Video model | Model metadata, parameter schema, default config, client creation | Mirrors image/audio model owner. | `MultimediaConfig`, `ParameterSchema` |
| `autobyteus-ts/src/multimedia/video/base-video-client.ts` | Video multimedia | Video client contract | Abstract `generateVideo` and cleanup | Keeps provider contract separate from factory. | `VideoGenerationResponse` |
| `autobyteus-ts/src/multimedia/video/video-client-factory.ts` | Video multimedia | Video factory/catalog | Register `gemini-omni-flash-preview`, list/create clients | Central built-in video catalog. | `VideoModel`, `ParameterSchema` |
| `autobyteus-ts/src/multimedia/video/api/gemini-video-client.ts` | Video multimedia | Gemini video adapter | Interactions API request/response, URI download, temp cleanup | Provider-specific and stateful temp files belong together. | Media reference loader, runtime mapping |
| `autobyteus-ts/src/multimedia/utils/media-reference-loader.ts` | Multimedia utils | Media reference loader | Decode/fetch/read media references with mime/base64 helpers | Reusable by Gemini image/video without bloating `api-utils.ts`. | `mime-types`, Node fs/axios |
| `autobyteus-ts/src/multimedia/utils/response-types.ts` | Multimedia utils | Response DTOs | Add `VideoGenerationResponse(video_urls)` | Existing response DTO owner. | N/A |
| `media-tool-contract.ts` | Server media tools | Tool contract | Add `generate_video`, `GenerateVideoInput`, video kind mapping | Existing tool name/input owner. | `MediaDefaultModelKind` |
| `media-tool-manifest.ts` | Server media tools | Manifest | Add video entry and description | Existing media tool manifest owner. | Parser/schema/service |
| `media-generation-service.ts` | Server media tools | Service | Add `generateVideo` sequencing and video client dependency | Existing execution owner. | `VideoGenerationResponse`, `VideoClientFactory` |
| `media-tool-model-resolver.ts` | Server media tools | Model resolver | Resolve video default model against `VideoClientFactory` | Existing default model lookup owner. | `VideoModel` |
| `media-default-model-settings.ts` | Server config | Default media setting catalog | Add `video_generation` kind/key/fallback | Existing setting-kind owner. | N/A |
| `video-model-provider.ts` / cache / service | Server multimedia-management | Video model catalog | List/reload video models from `VideoClientFactory` | Mirrors audio/image catalog shape. | `VideoModel` |
| `llm-provider.ts` GraphQL resolver | Server GraphQL | Provider/model query | Add `availableVideoProvidersWithModels` and reload video | Existing provider/model API owner. | `mapMultimediaModel` updated with `VideoModel` |
| Frontend store/settings files | Frontend settings | UI catalog/defaults | Add video provider groups and selector | Existing UI ownership. | Generated GraphQL types |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Media reference loading for data URI/HTTP/local image refs | `autobyteus-ts/src/multimedia/utils/media-reference-loader.ts` | Multimedia utils | Gemini image and video both need exact bytes/base64/mime from references. | Yes | Yes | A provider API wrapper or path-policy owner. |
| Video response DTO | `response-types.ts` | Multimedia utils | Service output writer expects URL/path arrays like image/audio. | Yes | Yes | A generic kitchen-sink response with optional image/audio/video fields. |
| Gemini video generation config normalization | Local functions in `gemini-video-client.ts` | Gemini video adapter | Only Gemini Omni needs these fields now. | Yes | Yes | Cross-provider config schema before another video provider exists. |
| Multimedia model mapping to GraphQL `ModelDetail` | Existing `mapMultimediaModel` in `llm-provider.ts` | GraphQL model query | Audio/image/video share UI-facing model metadata shape. | Yes | Yes | A generic model domain owner replacing real catalog services. |
| Audio/Image/Video model class shape | Potential future shared base | Multimedia | Similar but not required for correctness now. | N/A | N/A | Deferred broad abstraction with mostly-optional fields. |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `GenerateVideoInput` | Yes | Yes | Low | Fields are `prompt`, optional `input_images`, `output_file_path`, optional `generation_config`; `generation_config.task` is limited to creation values; do not add source video/session/edit fields. |
| `VideoGenerationResponse` | Yes | Yes | Low | Only `video_urls`; do not combine with image/audio response arrays. |
| Video model parameter schema | Yes | Yes | Low | Expose only supported `aspect_ratio`, `delivery`, and bounded local poll controls if implemented. Do not expose unsupported temperature/top_p/negative prompts. |
| `ProviderWithModels` GraphQL shape | Yes | Yes | Low | Reuse existing provider+models shape; do not create a video-specific GraphQL object unless fields diverge later. |
| Media reference loader result | Yes | Yes | Low | Use `{ bytes, base64, mimeType }` or equivalent; avoid both `mime_type` and `mimeType` internally except at provider request boundary. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/multimedia/image/image-client-factory.ts` | Image multimedia | Image factory | Replace preview Gemini image entries; add Lite/GA image entries; keep legacy 2.5 and Imagen/OpenAI entries. | Existing image catalog owner. | `ImageModel` |
| `autobyteus-ts/src/multimedia/image/api/gemini-image-client.ts` | Image multimedia | Gemini image adapter | Continue existing image generation path; optionally use shared media reference loader for input image bytes. | Provider image request owner. | Media reference loader |
| `autobyteus-ts/src/utils/gemini-model-mapping.ts` | Gemini utils | Runtime model mapper | Add active image ID mappings and `video` modality mapping; remove preview image mappings. | Existing runtime-map owner. | N/A |
| `autobyteus-ts/src/multimedia/video/video-model.ts` | Video multimedia | Video model | Model metadata, default config, client creation. | Mirrors existing media model pattern. | `ParameterSchema`, `MultimediaConfig` |
| `autobyteus-ts/src/multimedia/video/base-video-client.ts` | Video multimedia | Video client contract | Abstract `generateVideo(prompt, inputImageUrls?, generationConfig?)`. | Keeps provider adapters behind a typed boundary. | `VideoGenerationResponse` |
| `autobyteus-ts/src/multimedia/video/video-client-factory.ts` | Video multimedia | Video factory/catalog | Register `gemini-omni-flash-preview`; list/create video clients; define model schema/description. | Central video catalog owner. | `GeminiVideoClient` |
| `autobyteus-ts/src/multimedia/video/api/gemini-video-client.ts` | Video multimedia | Gemini video adapter | Interactions API call, config normalization, image part construction, inline/URI output extraction, temp file lifecycle. | Provider-specific and stateful. | Media reference loader, runtime mapper |
| `autobyteus-ts/src/multimedia/video/api/index.ts` | Video multimedia | Export barrel | Export video provider clients. | Existing pattern. | N/A |
| `autobyteus-ts/src/multimedia/video/index.ts` | Video multimedia | Export barrel | Export model/base/factory/api. | Existing pattern. | N/A |
| `autobyteus-ts/src/multimedia/index.ts` / `autobyteus-ts/src/index.ts` | Package exports | Public package surface | Export video subsystem. | Makes new client/factory available to server package. | N/A |
| `autobyteus-ts/src/multimedia/utils/media-reference-loader.ts` | Multimedia utils | Reference loader | Load data URI, HTTP(S), and local media refs; derive mime/base64. | Avoids duplicated loader code. | N/A |
| `autobyteus-ts/src/multimedia/utils/index.ts` | Multimedia utils | Export barrel | Export loader if public within package. | Existing pattern. | N/A |
| `autobyteus-ts/src/multimedia/utils/response-types.ts` | Multimedia utils | Response DTOs | Add `VideoGenerationResponse`. | Existing response DTO owner. | N/A |
| `autobyteus-server-ts/src/agent-tools/media/media-tool-contract.ts` | Server media tools | Tool contract | Add `GENERATE_VIDEO_TOOL_NAME`, list entry, model kind, input DTO. | Existing contract owner. | `MediaDefaultModelKind` |
| `media-tool-input-parsers.ts` | Server media tools | Parser | Add `parseGenerateVideoInput`, reuse `parseMediaInputImages`. | Existing parser owner. | N/A |
| `media-tool-parameter-schemas.ts` | Server media tools | Tool schema | Add video case with prompt/input_images/output_file_path; dynamic nested `generation_config`. | Existing schema owner. | `MediaModelResolver` |
| `media-tool-manifest.ts` | Server media tools | Manifest | Add `generate_video` manifest entry and description suffix. | Existing manifest owner. | Parser/schema/service |
| `media-generation-service.ts` | Server media tools | Execution service | Add video client dependency and `generateVideo`. | Existing generated-media execution owner. | `VideoClientFactory` |
| `media-tool-model-resolver.ts` | Server media tools | Default model resolver | Add video kind lookup via `VideoClientFactory`. | Existing default model resolver owner. | `VideoModel` |
| `media-tool-path-resolver.ts` | Server media tools | Path resolver | Reuse output and input-image references. Optional rename/add generic wrappers only if needed without breaking existing API. | Existing path policy owner. | N/A |
| `media-autobyteus-tools.ts` / `register-media-tools.ts` | Server media tools | Tool registration | No special-case code; list/manifest extension should auto-register video. | Confirms manifest owns tool set. | N/A |
| `autobyteus-server-ts/src/config/media-default-model-settings.ts` | Server config | Default media settings | Add `DEFAULT_VIDEO_GENERATION_MODEL` key and fallback. | Existing setting kind owner. | N/A |
| `server-settings-service.ts` | Server settings | Setting metadata | Export/register video default setting description. | Existing setting metadata owner. | N/A |
| `autobyteus-server-ts/src/multimedia-management/providers/video-model-provider.ts` | Server catalog | Video provider | List/reload `VideoClientFactory` models. | Mirrors image/audio services; no remote discovery. | `VideoModel` |
| `cached-video-model-provider.ts` | Server catalog | Video cache | Cache video model list. | Existing cache pattern. | `VideoModel` |
| `services/video-model-service.ts` | Server catalog | Video model service | Singleton get/reload available video models. | Existing service pattern. | `CachedVideoModelProvider` |
| `llm-management/services/model-catalog-service.ts` | Server model catalog | Runtime model aggregator | Add video service dependency/list/reload. | Existing catalog owner. | `VideoModelService` |
| `api/graphql/types/llm-provider.ts` | Server GraphQL | Provider/model API | Add `VideoModel` to mapper, `availableVideoProvidersWithModels`, reload video. | Existing model query owner. | `ModelDetail` |
| `autobyteus-web/graphql/queries/llm_provider_queries.ts` | Web GraphQL docs | Query document | Query video provider/model rows. | Existing query owner. | N/A |
| `autobyteus-web/generated/graphql.ts` | Web generated types | Codegen output | Include video query/types after codegen. | Generated contract. | N/A |
| `autobyteus-web/stores/llmProviderConfig.ts` | Web model catalog store | Store | Add video providers state/getters/fetch/reload/reset; merge media-only providers into UI summaries. | Existing state owner. | `ProviderWithModels` |
| `mediaDefaultModelSettings.ts` | Web settings | Media setting specs | Add `DEFAULT_VIDEO_GENERATION_MODEL`, `video` catalog kind and fallback. | Existing specs owner. | N/A |
| `useMediaDefaultModelsCard.ts` | Web settings | Defaults selector logic | Add draft/original video key and video provider groups. | Existing defaults logic owner. | Store video groups |
| `MediaDefaultModelsCard.vue` | Web settings | Render | Likely no structural change because it loops setting specs. | Existing render owner. | N/A |
| `ProviderModelBrowser.vue` | Web provider browser | Render | Add video models prop, section, `hasModels`. | Existing browser render owner. | N/A |
| `ProviderAPIKeyManager.vue` / `useProviderApiKeySectionRuntime.ts` | Web provider browser | Runtime orchestration | Add selected provider video models and totals. | Existing provider UI runtime owner. | Store video groups |
| Localization files | Web localization | Labels | Add video settings/provider labels and loading text. | Existing localization owner. | N/A |
| `file-change-tool-semantics.ts` | Agent file changes | Generated-output tool set | Add local/MCP `generate_video` names. | Existing generated-output owner. | N/A |
| Relevant tests | Test suites | Coverage | Update/add focused unit/e2e/UI tests. | Makes behavior durable. | N/A |
| `autobyteus-ts/docs/provider_model_catalogs.md` | Docs | Durable docs | Update image IDs and video catalog/tool notes. | Existing docs owner. | N/A |

## Ownership Boundaries

- **Media tool boundary:** Tool callers may only invoke `generate_video`; they must not call `MediaGenerationService` internals or provider SDKs directly.
- **Server execution boundary:** `MediaGenerationService` is the only server owner that sequences default model resolution, client creation, provider call, output writing, and cleanup for media tools.
- **Provider/client boundary:** `GeminiVideoClient` is the only owner that knows `client.interactions.create`, `response_format`, `output_video`, Files API polling/download, and temp video file cleanup.
- **Catalog boundary:** Server GraphQL queries must call `ModelCatalogService`, not `VideoClientFactory` directly.
- **Frontend state boundary:** UI components must consume store state/composables, not repeat provider/model aggregation logic or hardcode model IDs.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `MediaGenerationService.generateVideo` | Model resolver, path resolver, `VideoClientFactory`, output writer, cleanup | `MediaAutobyteusTool` manifest execution | Tool wrapper directly constructing `GeminiVideoClient` or writing files itself | Add a service method/typed dependency. |
| `VideoClientFactory` | Video model registry and `VideoModel.createClient` | Server service/catalog providers | Server code directly instantiating `GeminiVideoClient` with string IDs | Add factory registration/list/create capability. |
| `GeminiVideoClient` | Google Interactions API, URI polling/download/temp cleanup | Video factory/service through `BaseVideoClient` | `MediaPathResolver` downloading Google `output_video.uri` as HTTP | Return local temp file/data URI from client. |
| `ModelCatalogService` | Video/audio/image catalog services | GraphQL resolver | Resolver directly calling factories for one media kind | Add catalog list/reload method. |
| `llmProviderConfig` store/composable | Provider/model aggregation and selected provider media lists | Settings components | Components manually merging GraphQL query arrays | Add store/composable computed values. |

## Dependency Rules

Allowed:

- Server media tools may import `VideoClientFactory` and `VideoGenerationResponse` from `autobyteus-ts` through `MediaGenerationService` and resolver files.
- `GeminiVideoClient` may import `initializeGeminiClientWithRuntime`, `resolveModelForRuntime`, and multimedia reference-loading utilities.
- `VideoModelService` may depend on `VideoModelProvider`/`CachedVideoModelProvider`; `ModelCatalogService` may depend on `VideoModelService`.
- GraphQL resolver may map `VideoModel` to existing `ModelDetail`.
- Frontend settings components may depend on `llmProviderConfig` store and setting spec helpers.

Forbidden:

- No direct `@google/genai` calls from `autobyteus-server-ts/src/agent-tools/media/*` except through `autobyteus-ts` provider clients.
- No hardcoded video model IDs in frontend components or GraphQL resolver; built-in model ID belongs in `VideoClientFactory` and setting fallback specs.
- No compatibility aliases from preview image IDs to GA image IDs.
- No Google URI download in `MediaPathResolver`; URI authentication/polling belongs to `GeminiVideoClient`.
- No generic mixed media response object with optional image/audio/video fields replacing the existing typed response DTOs.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `BaseVideoClient.generateVideo(prompt, inputImageUrls?, generationConfig?)` | Video generation provider call | Provider-neutral video generation contract | Model already bound in client; input image references are resolved strings | No editing/session IDs in initial scope. |
| `VideoClientFactory.createVideoClient(modelIdentifier, configOverride?)` | Video client construction | Resolve registered video model and create client | Exact model identifier string | Throws for unknown ID. |
| `MediaGenerationService.generateVideo(context, input)` | Server media tool execution | Resolve model/path, call client, write output | `GenerateVideoInput` plus execution context | Returns `{ file_path }`. |
| `generate_video` tool | Agent-facing video creation | Text-to-video and image/reference-image-to-video to local MP4 file | Tool arguments: `prompt`, `input_images`, `output_file_path`, `generation_config`; creation-only `task` values allowed | Similar to `generate_image`/`generate_speech`; excludes `edit` and source-video inputs. |
| `availableVideoProvidersWithModels(runtimeKind)` | Video model catalog query | Return provider-grouped video models | Runtime kind string | Only AUTOBYTEUS runtime returns local media catalogs. |
| `DEFAULT_VIDEO_GENERATION_MODEL` server setting | Default video model | Select configured video model for future tool calls | Exact model identifier string | Fallback `gemini-omni-flash-preview`. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `generate_video` tool | Yes | Yes | Low | Keep image references named `input_images`; validate task/input compatibility; do not add `input_video` or `input_media` until future `edit_video` design. |
| `VideoClientFactory.createVideoClient` | Yes | Yes | Low | Use exact registered model identifier only. |
| `MediaModelResolver.resolve('video_generation')` | Yes | Yes | Low | Add explicit media kind; no inference from model string. |
| `availableVideoProvidersWithModels` | Yes | Yes | Low | Separate query from audio/image; no mixed `availableMediaProvidersWithModels` now. |
| `VideoGenerationResponse.video_urls` | Yes | Yes | Low | Return video-only references. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| New tool | `generate_video` | Yes | Low | Matches existing `generate_image`/`generate_speech`. |
| Video model factory | `VideoClientFactory` | Yes | Low | Mirrors image/audio factories. |
| Gemini video adapter | `GeminiVideoClient` | Yes | Low | Provider + media kind clear. |
| Default setting | `DEFAULT_VIDEO_GENERATION_MODEL` | Yes | Low | Mirrors default image/speech setting keys. |
| Video model catalog service | `VideoModelService` | Yes | Low | Mirrors image/audio services. |
| Image GA entries | `gemini-3.1-flash-image`, `gemini-3-pro-image` | Yes | Low | Use official IDs exactly. |

## Applied Patterns (If Any)

- **Factory:** `VideoClientFactory` indexes registered video models and creates provider clients, matching existing image/audio patterns.
- **Manifest:** `MEDIA_TOOL_MANIFEST` remains the owner for server media tool name/schema/parser/execution wiring.
- **Adapter:** `GeminiVideoClient` adapts Google Interactions/Files API contracts into `VideoGenerationResponse`.
- **Service:** `MediaGenerationService` owns media tool execution sequencing; `VideoModelService` owns model catalog access/caching.
- **Cache:** `CachedVideoModelProvider` mirrors audio/image cached model providers.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/multimedia/video/` | Folder | Video multimedia subsystem | Video model/client/factory/provider-client files | Structural parity with audio/image media kinds. | Server tool code or frontend code. |
| `autobyteus-ts/src/multimedia/video/api/` | Folder | Video provider adapters | Gemini video provider adapter exports | Existing media kind provider-adapter pattern. | Model catalog services. |
| `autobyteus-ts/src/multimedia/video/video-client-factory.ts` | File | Video factory | Built-in video catalog and client creation | Factory pattern already used by audio/image. | Google Interactions request code beyond client class reference. |
| `autobyteus-ts/src/multimedia/video/api/gemini-video-client.ts` | File | Gemini video adapter | Interactions request and URI output handling | Provider detail must stay behind video client boundary. | Server path resolution or UI schemas. |
| `autobyteus-ts/src/multimedia/utils/media-reference-loader.ts` | File | Multimedia utility | Loading refs into bytes/base64/mime | Cross-provider utility within multimedia. | Workspace security/path policy; that stays server-side. |
| `autobyteus-server-ts/src/agent-tools/media/` | Folder | Server media tools | Tool contract/parser/schema/manifest/service extensions | Existing generated-media tool subsystem. | Provider SDK details. |
| `autobyteus-server-ts/src/multimedia-management/providers/` | Folder | Media model providers | Video provider/cache files next to audio/image | Existing catalog provider folder. | GraphQL resolvers. |
| `autobyteus-server-ts/src/multimedia-management/services/` | Folder | Media model services | `video-model-service.ts` | Existing service folder. | Factory registration code. |
| `autobyteus-web/components/settings/` | Folder | Settings UI | Default model settings and provider API key browser changes | Existing settings ownership. | Server model ID definitions. |
| `autobyteus-web/graphql/queries/` | Folder | GraphQL query documents | Add video query fields | Existing frontend query document owner. | Store aggregation logic. |
| `autobyteus-web/generated/graphql.ts` | File | Generated types | Codegen output | Existing generated GraphQL contract. | Manual business logic. |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `autobyteus-ts/src/multimedia/video` | Main-Line Domain-Control + Provider | Yes | Low | Mirrors established audio/image split; provider adapter is in `api/`. |
| `autobyteus-server-ts/src/agent-tools/media` | Main-Line Domain-Control | Yes | Low | Already owns media tool manifest/service; video is an extension. |
| `autobyteus-server-ts/src/multimedia-management` | Off-Spine Concern | Yes | Low | Catalog service/cache separate from tool execution. |
| `autobyteus-web/components/settings` | Transport/UI | Yes | Medium | Settings folder is broad but existing helpers isolate media defaults/provider browser responsibilities. |
| `autobyteus-ts/src/multimedia/utils` | Off-Spine Concern | Yes | Low | Shared media loader belongs under multimedia, not generic utils. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Tool execution | `generate_video -> manifest.parseInput -> service.generateVideo -> VideoClientFactory -> GeminiVideoClient` | `generate_video -> new GoogleGenAI().interactions.create(...)` inside tool wrapper | Preserves existing media tool ownership. |
| Video response | `GeminiVideoClient` returns `new VideoGenerationResponse([tempPathOrDataUri])`; service writes first URL/path | Service receives Google `output_video.uri` and tries normal HTTP download | Google URI needs authenticated SDK/polling. |
| Image model cleanup | `gemini-3.1-flash-image-preview` removed, `gemini-3.1-flash-image` registered | Keep both preview and GA IDs to avoid breaking saved settings | Preview was shut down; dual paths preserve obsolete behavior. |
| Config schema | `generation_config: { aspect_ratio: '16:9', delivery: 'uri', task: 'reference_to_video' }` | Expose unsupported `temperature`, `top_p`, `negative_prompt`, or `task: 'edit'` in `generate_video` | Google Omni docs list some controls as unsupported, and user deferred edit-video. |
| Catalog UI | Store has `videoProvidersWithModels`; components receive `videoModels` prop | Components hardcode `gemini-omni-flash-preview` label | Keeps model selection dynamic and provider-based. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Alias preview image IDs to GA IDs | Could preserve stale saved defaults. | Rejected | Remove preview entries/mappings; UI may show stale current value until user selects a current ID, but runtime does not translate. |
| Keep preview IDs alongside GA IDs in built-in catalog | Avoids visible removal. | Rejected | Register only current GA IDs and legacy 2.5 image model. |
| Add `generate_video` by copying Google API calls into server tool code | Fastest implementation path. | Rejected | Add `autobyteus-ts` video subsystem and call through factory/client. |
| Add broad `generate_media` generic tool | Could unify media types. | Rejected | Existing user/product model has explicit `generate_image`, `generate_speech`; add explicit `generate_video`. |
| Add full conversational video editing storage now | Could expose all Omni features. | Rejected for this scope | User re-approved current ticket as creation-only after CR-002; follow-up can add persisted interaction sessions. |
| Overload `generate_video` with `input_video`, `previous_interaction_id`, and `task=edit` | Could avoid adding a future separate tool. | Rejected for this scope | Keep current tool singular: creation. Future design should add explicit `edit_video` or another edit-specific boundary. |
| Add remote AutoByteus video provider discovery now | Symmetry with image/audio remote discovery. | Rejected/deferred | Local Gemini video model catalog only until remote `/models/video` and `/generate-video` contracts are designed. |

## Derived Layering (If Useful)

- **Provider layer:** `autobyteus-ts/src/multimedia/video/*` and Gemini adapter.
- **Server tool orchestration layer:** `autobyteus-server-ts/src/agent-tools/media/*`.
- **Catalog/settings API layer:** server model catalog services and GraphQL resolver.
- **Frontend settings layer:** GraphQL query, store, settings components.
- **Artifact/event layer:** file-change generated-output classification and existing web display.

Layering is descriptive only; ownership remains with the boundaries named above.

## Migration / Refactor Sequence

1. **Image catalog cleanup first:**
   - Update `ImageClientFactory` registrations to add `gemini-3.1-flash-lite-image`, `gemini-3.1-flash-image`, `gemini-3-pro-image`.
   - Remove preview image registrations.
   - Update `gemini-model-mapping.ts` active image mappings and tests.

2. **Add video provider/client subsystem:**
   - Add video model/base/factory files and exports.
   - Add `VideoGenerationResponse`.
   - Add `GeminiVideoClient` with config normalization, Interactions API call, inline output handling, URI poll/download, temp cleanup.
   - Add multimedia reference loader if needed and update Gemini image/video clients to use it where appropriate.

3. **Add server-owned `generate_video`:**
   - Add tool contract constants/input/kind mapping.
   - Add input parser and parameter schema case.
   - Add manifest entry.
   - Add video client dependency and `generateVideo` method to `MediaGenerationService`.
   - Extend model resolver with `video_generation`.
   - Add default video model setting and server setting description.

4. **Add server catalog/GraphQL video exposure:**
   - Add video model provider/cache/service.
   - Extend `ModelCatalogService` with list/reload video methods.
   - Extend GraphQL resolver with `availableVideoProvidersWithModels` and reload video in global model reload.

5. **Add frontend catalog/settings UI:**
   - Add video query field and regenerate `autobyteus-web/generated/graphql.ts`.
   - Add store state/getters/actions for `videoProvidersWithModels`.
   - Add video default setting spec and selector routing.
   - Add provider browser video totals/section/props.
   - Add localization strings.

6. **Add generated-output semantics:**
   - Add `generate_video` and `mcp__autobyteus_agent_tools__generate_video` to generated-output tool set.

7. **Tests/docs:**
   - Update/add focused tests listed below.
   - Update durable docs or record no-impact during delivery.
   - Ensure no preview image ID expectations remain except explicit absence tests.

## Key Tradeoffs

- **Parallel video model class vs shared media base:** Parallel class is intentionally chosen for bounded scope and consistency with existing audio/image; shared base is deferred.
- **URI delivery default:** Default video model schema should prefer `delivery: 'uri'` because Google recommends URI delivery for larger videos. This adds SDK poll/download code but avoids payload-size issues.
- **No multi-turn/edit-video initially:** Reconfirmed by the user after CR-002. Keeps first capability easy to use and test; future `edit_video` can build on `GeminiVideoClient` once basic generation is stable.
- **No remote video provider discovery:** Avoids designing a remote API contract inside a Google Omni feature ticket.
- **No image Interactions rewrite:** Existing `GeminiImageClient` path remains because the user asked for naming/current model support, not an image architecture rewrite.

## Risks

- `@google/genai` TypeScript typings may differ slightly from docs examples for `interactions.create`, `response_format`, and file download; keep casts localized inside `GeminiVideoClient` and validate with focused unit/type checks.
- Gemini Omni Flash Preview access may depend on account, region, billing, quota, or runtime mode. Live tests must be credential/access gated.
- URI output may take significant time; unit tests should mock polling/download and not hit live Google by default.
- Frontend GraphQL generated types must be regenerated after adding the video query field.
- Persisted stale image preview defaults may still exist in user settings. The UI can display them as missing from catalog, but execution should fail clearly until replaced.
- Official Omni editing/source-video capabilities are intentionally deferred. User-facing docs/tool descriptions should not imply `generate_video` edits uploaded videos or resumes previous interactions.
- If users choose a non-video file extension for output, bytes will still be MP4 but artifact inference may not classify as video. Tool description should recommend `.mp4`; stricter enforcement can be considered if implementation/review wants a hard invariant.

## Guidance For Implementation

### Model IDs and schemas

- Register these Gemini image models in `ImageClientFactory`:
  - `gemini-3.1-flash-lite-image` — description should mention fastest/cost-efficient Lite image model, 1K output, not optimized for multiple references/multi-turn edits.
  - `gemini-3.1-flash-image` — description should mention GA Nano Banana 2 / versatile image model.
  - `gemini-3-pro-image` — description should mention GA Nano Banana Pro / high-quality complex image tasks.
  - Keep `gemini-2.5-flash-image`.
- Remove built-in preview image IDs and explicit preview runtime mappings.
- Register one video model: `gemini-omni-flash-preview` with `GeminiVideoClient`.
- Suggested video parameter schema:
  - `aspect_ratio`: enum `['16:9', '9:16']`, default `'16:9'`.
  - `delivery`: enum `['uri', 'inline']`, default `'uri'`.
  - `task`: enum `['text_to_video', 'image_to_video', 'reference_to_video']`, optional/default omitted so Gemini may infer. Do not include `edit` in `generate_video`.
  - Optional local controls if useful for tests/operation: `poll_interval_ms` integer default `5000`, min `1000`, max `60000`; `max_poll_ms` integer default `600000`, min `60000`, max `1200000`.
- Do not expose unsupported Omni controls such as `temperature`, `top_p`, stop sequences, system instructions, or negative prompts. Do not expose source-video editing fields or `previous_interaction_id` in this current tool.

### `GeminiVideoClient` behavior

- Use `initializeGeminiClientWithRuntime()` and `resolveModelForRuntime(this.model.value, 'video', this.runtimeInfo?.runtime)`.
- Build Interactions input as:
  - Text-to-video: the prompt string is acceptable.
  - Image-to-video: array of image parts `{ type: 'image', data: base64, mime_type: mimeType }` followed by `{ type: 'text', text: prompt }`.
- Build `response_format` with `{ type: 'video', delivery, aspect_ratio }`.
- If `generation_config.task` is provided, validate it is one of `text_to_video`, `image_to_video`, or `reference_to_video`; write it to `generationConfig.videoConfig.task` / provider-equivalent shape.
- Validate task/input compatibility: `text_to_video` should not require images; `image_to_video` and `reference_to_video` require at least one `input_images` entry. Reject `edit` with a clear message directing users to future `edit_video` support.
- Prefer synchronous non-edit defaults in the request (`background: false`, `store: false`, `stream: false`) if typings/API accept them; keep any required casts local.
- Output extraction order:
  1. If `interaction.output_video.data` is a non-empty string, return `data:<mime || video/mp4>;base64,<data>`.
  2. If `interaction.output_video.uri` is present, poll `client.files.get` until `ACTIVE`, fail on `FAILED`, download with `client.files.download({ file: outputVideo, downloadPath })`, return temp path.
  3. Optionally inspect step content for `type: 'video'` with `data`/`uri` as a robustness fallback.
- Track temp files on the client and delete them in `cleanup()` after `MediaGenerationService` copies the first returned video to the final output path.

### `generate_video` tool contract

- Tool name: `generate_video`.
- Inputs:
  - `prompt: string` required.
  - `input_images?: string[] | null` optional; use the same reference semantics as image tools.
  - `output_file_path: string` required; description should recommend `.mp4` and retain existing path-resolution wording.
  - `generation_config?: Record<string, unknown> | null` optional, nested from current default video model schema, including creation-only `task` values.
- Result: `{ file_path: string }`.

### Tests to update/add

Minimum focused coverage:

- `autobyteus-ts/tests/unit/multimedia/image/image-client-factory.test.ts`
  - Active image IDs included.
  - Preview image IDs absent.
  - Lite/current IDs create `GeminiImageClient`.
- `autobyteus-ts/tests/unit/utils/gemini-model-mapping.test.ts`
  - Active image ID mapping for `api_key` and `vertex`.
  - `gemini-omni-flash-preview` mapping under `video`.
  - Preview mapping expectations removed or replaced with absence/no-explicit-mapping checks.
- New `autobyteus-ts/tests/unit/multimedia/video/video-client-factory.test.ts`
  - Lists/creates `gemini-omni-flash-preview` with `GeminiVideoClient` and default schema values.
- New `autobyteus-ts/tests/unit/multimedia/video/api/gemini-video-client.test.ts`
  - Text-to-video Interactions request shape.
  - Image-to-video image parts + text part.
  - Inline base64 output returns video data URI.
  - URI output polls/downloads through mocked `files` API and cleanup deletes temp file.
  - Unsupported/invalid generation config values throw clear errors, including `task: 'edit'`.
  - Creation task values are passed as provider video config, and image/reference task values require images.
- `autobyteus-server-ts/tests/unit/agent-tools/media/media-generation-service.test.ts`
  - `generateVideo` resolves `video_generation`, writes first `video_urls` entry, and cleans up.
- `media-tool-input-parsers.test.ts`
  - `parseGenerateVideoInput` preserves `input_images` array and rejects invalid shapes.
- `media-tool-model-resolver.test.ts`
  - `DEFAULT_VIDEO_GENERATION_MODEL` fallback/configured lookup and `VideoClientFactory` lookup.
- `register-media-tools.test.ts`
  - `MEDIA_TOOL_NAME_LIST` includes/registers `generate_video`; schema has prompt/input_images/output path/generation_config with non-edit task enum.
- `autobyteus-server-ts/tests/e2e/media/server-owned-media-tools.e2e.test.ts`
  - Mock video factory/client and prove `generate_video` writes expected MP4 bytes and honors default setting changes/schema reload.
- `autobyteus-server-ts/tests/unit/api/graphql/types/llm-provider.test.ts`
  - `availableVideoProvidersWithModels` grouping and global reload calls `reloadVideoModels`.
- `autobyteus-web/tests/stores/llmProviderConfigStore.test.ts`
  - Query response stores `videoProvidersWithModels`, reset/error paths clear it.
- `MediaDefaultModelsCard.spec.ts`
  - Video default selector appears and uses video catalog/fallback.
- `ProviderModelBrowser.spec.ts` / `useProviderApiKeySectionRuntime.spec.ts`
  - Video Models section, model totals, selected provider video model computed value.

### Validation commands

Implementation should run the focused test commands that match changed packages. Suggested commands:

- `pnpm -C autobyteus-ts exec vitest --run tests/unit/multimedia/image/image-client-factory.test.ts tests/unit/utils/gemini-model-mapping.test.ts tests/unit/multimedia/video`
- `pnpm -C autobyteus-server-ts exec vitest --run tests/unit/agent-tools/media tests/unit/api/graphql/types/llm-provider.test.ts tests/e2e/media/server-owned-media-tools.e2e.test.ts`
- `pnpm -C autobyteus-web codegen` after GraphQL schema is available in the local setup, or update generated types using the project-approved codegen workflow.
- `pnpm -C autobyteus-web test:nuxt --run components/settings/__tests__/MediaDefaultModelsCard.spec.ts components/settings/providerApiKey/__tests__/ProviderModelBrowser.spec.ts components/settings/providerApiKey/__tests__/useProviderApiKeySectionRuntime.spec.ts tests/stores/llmProviderConfigStore.test.ts`
- Package build/type checks as feasible after focused tests.

Live Gemini video generation should be optional/credential gated. Missing credentials, preview access, quota, billing, or region restrictions should be reported as provider-access skips rather than implementation failures.
