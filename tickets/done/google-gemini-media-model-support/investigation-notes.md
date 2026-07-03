# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: User re-approved narrow current-ticket scope after CR-002: deliver correct `generate_video` creation support now; defer `edit_video`, uploaded/source-video editing, and stateful editing to future work. Requirements/design revised and ready for architecture re-review.
- Investigation Goal: Verify current AutoByteus Google media model/tool support and determine the clean implementation scope for Nano Banana 2 Lite image support plus Gemini Omni Flash video generation support.
- Scope Classification (`Small`/`Medium`/`Large`): Large
- Scope Classification Rationale: Nano Banana 2 Lite is a small image catalog addition, but Gemini Omni Flash requires a new first-class video generation capability spanning `autobyteus-ts` multimedia clients, server-owned media tools, server model catalogs/settings, GraphQL, frontend settings/model browsing, file-change semantics, and tests.
- Scope Summary: Add current Gemini image IDs, decommission shut-down preview image IDs, and add initial text/image-to-video generation through Gemini Omni Flash using the Interactions API.
- Primary Questions To Resolve:
  - What are the exact Google model identifiers and API surfaces for Nano Banana 2 Lite and Gemini Omni Flash? Answer: `gemini-3.1-flash-lite-image` and `gemini-omni-flash-preview`; Gemini Omni Flash uses Interactions API.
  - Does AutoByteus already support Nano Banana image generation/editing, and where? Answer: yes for `gemini-2.5-flash-image` and stale preview IDs in `ImageClientFactory`; no Lite/GA current IDs yet.
  - Does AutoByteus agent tooling already support generated video output? Answer: output/file/display plumbing supports video, but there is no video generation client/catalog/tool.
  - Which files own model registration, media generation calls, output persistence, and tool exposure? Answer: `autobyteus-ts/src/multimedia/*` for model clients/factories; `autobyteus-server-ts/src/agent-tools/media/*` for server-owned media tool surfaces; GraphQL/model catalog/UI files for settings selection; file-change semantics for generated output classification.

## Request Context

User reported Google released "google gemini omni flash" and "nana banan light or something" and provided a screenshot reading: "Start building with Nano Banana 2 Lite and Gemini Omni Flash... Introducing Nano Banana 2 Lite: Our fastest, most cost-efficient image model..." User wants analysis and likely support for the Lite image model and Omni Flash video model. User believes existing support includes Nano Banana under image/audio models and asks to check agent tools for generate video support.

Reference image path: `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_369c416e18fd45da8bbeb3ee90150f75/solution_designer_993ebfc76bbe4f5fa8494264a558d08b/context_files/ctx_474bb1eefaca__image.png`.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/google-gemini-media-model-support`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/google-gemini-media-model-support/tickets/in-progress/google-gemini-media-model-support`
- Current Branch: `codex/google-gemini-media-model-support`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/google-gemini-media-model-support`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin --prune` succeeded on 2026-07-03; `origin/personal` advanced from `61deb879` to `71adb8bb`.
- Task Branch: `codex/google-gemini-media-model-support` created from `origin/personal` at `71adb8bb1afe031d96b5427abea183d3825cc56a`.
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None
- Notes For Downstream Agents: Branch was fast-forwarded from `71adb8bb` to `98db9e8b` after user approval; post-sync inspection confirmed the media tool and catalog gaps still apply, and the upstream `gemini-media-tool-result-input` changes added generic video file-kind/input support rather than video generation. Use the dedicated task worktree above, not the shared superrepo checkout, for authoritative artifacts and implementation.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-07-03 | Command | `pwd && git rev-parse --show-toplevel && git status --short --branch && git remote -v && git branch --show-current && git symbolic-ref refs/remotes/origin/HEAD` from `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` | Discover starting repository state before bootstrap | Shared checkout was on `personal`, tracking `origin/personal`, with untracked user files. Remote HEAD points to `origin/personal`. | No |
| 2026-07-03 | Command | `git fetch origin --prune && git worktree list --porcelain` | Refresh remote and inspect existing worktrees | Fetch succeeded; many existing worktrees but none for this exact task. | No |
| 2026-07-03 | Command | `git worktree add -b codex/google-gemini-media-model-support /Users/normy/autobyteus_org/autobyteus-worktrees/google-gemini-media-model-support origin/personal` | Create dedicated task worktree/branch from refreshed base | Worktree and branch created at `71adb8bb1afe031d96b5427abea183d3825cc56a`. | No |
| 2026-07-03 | Command | `pwd && git status --short --branch && git rev-parse HEAD && git branch --show-current && git remote -v` in task worktree | Confirm dedicated workspace state | Branch `codex/google-gemini-media-model-support`, tracking `origin/personal`, clean at `71adb8bb`. | No |
| 2026-07-03 | Web | Search queries: `site:developers.googleblog.com "Nano Banana 2 Lite" "Gemini Omni Flash"`; `site:ai.google.dev "Nano Banana 2 Lite" "Gemini Omni Flash"`; `"Nano Banana 2 Lite" "Gemini Omni Flash" Google` | Verify recent release from official/current sources | Found official Google blog and Gemini API docs. | No |
| 2026-07-03 | Web | `https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-omni-flash-nano-banana-2-lite/` | Confirm release and product positioning | Google blog dated Jun 30, 2026 says Nano Banana 2 Lite and Gemini Omni Flash are available to developers; Nano Banana 2 Lite ID `gemini-3.1-flash-lite-image`; Omni Flash for high-quality video generation/conversational editing. | No |
| 2026-07-03 | Web | `https://ai.google.dev/gemini-api/docs/image-generation` | Verify official image model IDs/capabilities | Docs list `gemini-3.1-flash-lite-image`, `gemini-3.1-flash-image`, `gemini-3-pro-image`, and legacy `gemini-2.5-flash-image`; Lite supports 1K and many aspect ratios; not optimized for multi-ref/multi-turn. | No |
| 2026-07-03 | Web | `https://ai.google.dev/gemini-api/docs/omni` | Verify Gemini Omni Flash API model ID and request/response shape | Model ID `gemini-omni-flash-preview`; JS examples use `ai.interactions.create`; supports text-to-video, image-to-video, conversational edits, inline base64 video, URI delivery, and Files API download/polling. | No |
| 2026-07-03 | Web | `https://ai.google.dev/gemini-api/docs/video` | Verify Gemini API video overview | Gemini API offers video generation through Gemini Omni Flash and Veo. | No |
| 2026-07-03 | Web | `https://ai.google.dev/gemini-api/docs/changelog` | Verify release/deprecation timing | June 30 changelog released `gemini-omni-flash-preview` public preview and `gemini-3.1-flash-lite-image` GA; May 28 changelog says `gemini-3.1-flash-image-preview` and `gemini-3-pro-image-preview` were deprecated/shut down on June 25, 2026. | No |
| 2026-07-03 | Web | `https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/gemini/omni-flash-preview`; `https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/gemini/3-1-flash-lite-image` | Cross-check Cloud/Agent Platform model cards | Cloud docs describe Omni Flash as optimized for video generation and 3.1 Flash-Lite Image as fastest image generation model; Agent Platform setup may use ADC/enterprise env. | Note credential/runtime risk. |
| 2026-07-03 | Command | `find . -maxdepth 2 -type d`; `find autobyteus-ts/src/multimedia -maxdepth 5 -type f`; `find autobyteus-ts/src/tools -maxdepth 6 -type f` | Map repository and media/tool layout | Monorepo with `autobyteus-ts`, `autobyteus-server-ts`, `autobyteus-web`; multimedia has audio/image only, no video folder. | No |
| 2026-07-03 | Command | `rg -n "Nano|banana|gemini.*image|...|generate.*video|..."` across repo | Locate relevant model/tool/video support | Found image catalog/Gemini image client, server media tools, video artifact/read/display paths; no video generation client/tool. | No |
| 2026-07-03 | Code | `autobyteus-ts/src/multimedia/image/image-client-factory.ts` | Inspect built-in image model catalog | Registers OpenAI `gpt-image-1.5`, `gpt-image-2`, Gemini `imagen-4`, `gemini-2.5-flash-image`, `gemini-3.1-flash-image-preview`, and `gemini-3-pro-image-preview`. Missing Lite/current GA Gemini image IDs. | Add/remove entries. |
| 2026-07-03 | Code | `autobyteus-ts/src/multimedia/image/api/gemini-image-client.ts` | Inspect Gemini image request owner | Uses `@google/genai` `models.generateContent`, default `responseModalities`, `resolveModelForRuntime(..., 'image', runtime)`, and parses inline image parts. Suitable for new image IDs. | No new image client needed. |
| 2026-07-03 | Code | `autobyteus-ts/src/utils/gemini-model-mapping.ts` and unit tests | Inspect Gemini runtime mapping owner | Image map contains preview and legacy IDs; no Lite/current GA image IDs or video modality. | Extend active mappings and remove preview mappings. |
| 2026-07-03 | Code | `autobyteus-ts/src/multimedia/audio/*`, `autobyteus-ts/src/multimedia/image/*` | Understand media subsystem pattern | Audio and image each use model/factory/base-client/provider-client shapes; video subsystem should follow same ownership pattern. | Add video subsystem. |
| 2026-07-03 | Code | `autobyteus-server-ts/src/agent-tools/media/*` | Inspect server-owned media tools | Server-owned tools exist for `generate_image`, `edit_image`, `generate_speech`; manifest/service/parser/schema/resolver pattern can be extended. | Add `generate_video`. |
| 2026-07-03 | Code | `autobyteus-server-ts/src/config/media-default-model-settings.ts`; `autobyteus-server-ts/src/services/server-settings-service.ts` | Inspect default media model settings | Defaults/settings exist for image edit, image generation, speech generation only. | Add video generation default. |
| 2026-07-03 | Code | `autobyteus-server-ts/src/multimedia-management/providers/*`; `autobyteus-server-ts/src/llm-management/services/model-catalog-service.ts`; `autobyteus-server-ts/src/api/graphql/types/llm-provider.ts` | Inspect server model catalog exposure | Audio/image model providers/services and GraphQL queries exist; no video catalog path. | Add video provider/service/query/reload. |
| 2026-07-03 | Code | `autobyteus-web/graphql/queries/llm_provider_queries.ts`; `autobyteus-web/stores/llmProviderConfig.ts`; `autobyteus-web/components/settings/*` | Inspect frontend model catalog/settings UI | Store/query/UI supports LLM/audio/image models and media default selectors for image/speech only; no video. | Add video providers and default model selector/labels. |
| 2026-07-03 | Code | `autobyteus-server-ts/src/agent-execution/events/processors/file-change/file-change-tool-semantics.ts`; `file-change-payload-builder.ts`; `artifact-utils.ts` | Inspect generated output classification | Generated-output tool set includes image/speech only; artifact type inference already supports video extensions. | Add `generate_video` tool names. |
| 2026-07-03 | Code | `autobyteus-web/components/conversation/segments/MediaSegment.vue`; `VideoPlayer.vue`; run hydration/projection files | Verify downstream video rendering | UI can render video segments/artifacts when video file locators exist. | No new viewer likely needed. |
| 2026-07-03 | Code | `autobyteus-ts/src/clients/autobyteus-client.ts`; `autobyteus-ts/src/llm/prompt-renderers/gemini-prompt-renderer.ts` | Check remote/client and video input support | Autobyteus client normalizes video inputs for LLM messages and has remote generate image/speech methods only; Gemini prompt renderer can inline video input for understanding. | Do not confuse video input support with generation support. |
| 2026-07-03 | Doc | `autobyteus-ts/docs/provider_model_catalogs.md` | Check durable docs to sync | Docs list current model catalog ownership and a previous `gemini-3.1-flash-image-preview` entry; will need update for Lite/GA IDs and video catalog. | Delivery docs sync. |
| 2026-07-03 | Command | `pnpm --version`; `node --version`; package script inspection | Assess local validation environment | pnpm 10.28.2 and Node v22.23.1 available; no tests run at solution-design stage. | Downstream should install/link deps and run focused tests. |
| 2026-07-03 | Other | User conversation approval/clarification | Confirm requirement basis before design | User stated existing support is preview image IDs, directed replacing preview names with direct image IDs, required `generate_video`, and approved kicking off design. | No |
| 2026-07-03 | Command | `git pull --ff-only` in `/Users/normy/autobyteus_org/autobyteus-worktrees/google-gemini-media-model-support` | Refresh task worktree before approved design | Fast-forwarded branch from `71adb8bb` to `98db9e8b`; upstream `gemini-media-tool-result-input` was merged into `personal`. | No |
| 2026-07-03 | Command | `git status --short --branch && git rev-parse HEAD && git log --oneline -5` | Verify authoritative worktree state after sync | Worktree on `codex/google-gemini-media-model-support...origin/personal`, current head `98db9e8b`, only untracked task artifacts. | No |
| 2026-07-03 | Code | `autobyteus-server-ts/src/agent-tools/media/{media-tool-contract,media-tool-input-parsers,media-tool-manifest,media-tool-parameter-schemas,media-generation-service,media-tool-model-resolver,media-tool-path-resolver,register-media-tools,media-autobyteus-tools}.ts` | Re-read how `generate_image`, `edit_image`, and `generate_speech` are created | Media tools are manifest-owned local tools: names/kinds live in contract; parsers normalize arguments; schemas add dynamic model-specific `generation_config`; `MediaAutobyteusTool` delegates to `MediaGenerationService`; service resolves default model, creates media client through factory, writes first returned URL/path, and cleans up. | Use this exact pattern for `generate_video`. |
| 2026-07-03 | Code | `autobyteus-ts/src/multimedia/{audio,image}/*`; `autobyteus-ts/src/multimedia/utils/response-types.ts` | Re-read multimedia model/client/factory pattern | Audio/image each have `Model`, `BaseClient`, `ClientFactory`, provider clients, `parameterSchema`/`defaultConfig`, and response DTOs. | Add parallel video subsystem without broad shared-base refactor. |
| 2026-07-03 | Code | `autobyteus-ts/src/utils/media-file-kind.ts`; `autobyteus-ts/src/agent/message/context-file-type.ts`; `autobyteus-ts/src/llm/prompt-renderers/gemini-prompt-renderer.ts` | Check impact of recent upstream media input changes | Upstream added shared image/audio/video file-kind classification and Gemini prompt rendering can inline video input for understanding; no `VideoClientFactory`/`generate_video` exists. | Reuse existing video artifact/input support; still add generation path. |
| 2026-07-03 | Code | `autobyteus-web/components/settings/{MediaDefaultModelsCard.vue,useMediaDefaultModelsCard.ts,mediaDefaultModelSettings.ts}` and provider API key browser files | Re-read frontend settings/model browser pattern | Default media model card is driven by a setting spec array and chooses audio/image catalog groups; provider API key browser counts and displays LLM/audio/image models only. | Extend spec/store/query/UI with video groups. |
| 2026-07-03 | Other | Code review round 3 report `/Users/normy/autobyteus_org/autobyteus-worktrees/google-gemini-media-model-support/tickets/done/google-gemini-media-model-support/code-review-report.md` | Process design-impact reroute | CR-002 found official Gemini Omni docs cover `video_config.task`, stateful editing via `previous_interaction_id`, and uploaded-video editing via Files API; current approved design only covers text/image-to-video. | User scope decision required. |
| 2026-07-03 | Web | `https://ai.google.dev/gemini-api/docs/omni` | Recheck official docs after CR-002 | Docs describe native multimodality; examples include text-to-video and image/reference-image-to-video; allowed task values are `text_to_video`, `image_to_video`, `reference_to_video`, `edit`; docs also include stateful editing and uploaded-video editing, while limitations say audio references/voice editing are unsupported and uploaded-video editing is region-limited. | Update requirements/design after user scope decision. |
| 2026-07-03 | Other | `/Users/normy/autobyteus_org/autobyteus-worktrees/google-gemini-media-model-support/tickets/done/google-gemini-media-model-support/solution-rework-notes.md` | Record solution rework options | Created scope-decision note with options: keep narrow v1, expand now with `edit_video`, or finish creation and follow up for editing. | Await user decision. |
| 2026-07-03 | Other | User scope decision after CR-002 | Resolve requirement gap | User confirmed video editing can be future work, but current ticket definitely must deliver correct `generate_video`; therefore source-video editing/stateful editing are explicitly deferred and current ticket remains creation-only. | Route revised package to architecture review. |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary:
  - Image generation/editing: server-owned `generate_image`/`edit_image` tools or direct `ImageClientFactory` callers.
  - Speech generation: server-owned `generate_speech` or direct `AudioClientFactory` callers.
  - Video: only as input/display/artifact media; no generation entrypoint.
- Current image execution flow:
  1. Tool/service resolves default model from `MEDIA_DEFAULT_MODEL_SETTINGS`.
  2. `ImageClientFactory.createImageClient(modelIdentifier)` resolves a registered `ImageModel`.
  3. For Gemini models, `GeminiImageClient.generateImage()` loads optional image inputs, merges config, resolves runtime model value, calls `client.models.generateContent`, and returns data URI image URLs.
  4. Server `MediaGenerationService` writes the first returned URL to `output_file_path` using `MediaPathResolver.writeGeneratedMediaFromUrl()`.
- Current media tool flow:
  1. `registerMediaTools()` registers manifest entries from `MEDIA_TOOL_MANIFEST` into the local tool registry.
  2. `MediaAutobyteusTool` parses inputs through manifest-owned parsers and delegates to `MediaGenerationService`.
  3. `MediaGenerationService` owns model-resolution/client creation/output writing for image/audio.
- Current video-related flow:
  - Context files can classify video, message payloads can contain `video_urls`, Gemini prompt renderer can inline video media for model understanding, server media storage/run-file changes classify video, and UI can play video files.
  - There is no `VideoClientFactory`, video model list, or `generate_video` tool.
- Ownership or boundary observations:
  - `ImageClientFactory` owns built-in image model registration.
  - `GeminiImageClient` owns Gemini image request/response shaping.
  - `MediaGenerationService` owns server-owned media tool execution and should be extended for video.
  - The tool manifest/schema/parser files own public tool arguments and should not be bypassed.
  - GraphQL/model catalog/UI paths consume factories; they should not duplicate model IDs.
- Current behavior summary: AutoByteus supports old/current-at-the-time Gemini image entries but lacks Nano Banana 2 Lite/current GA image IDs and lacks generated video support entirely.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Feature plus obsolete preview cleanup.
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue for video generation gap; Legacy Or Compatibility Pressure for shut-down preview image IDs; No Design Issue Found for Lite image support via existing image path.
- Refactor posture evidence summary: Bounded refactor is needed to add video as a first-class media generation subsystem instead of stuffing provider calls inside a tool. Broad multimedia model class unification is optional/deferred because image/audio duplication pre-exists and does not block coherent video ownership if the new subsystem follows established boundaries.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `image-client-factory.ts` | Centralized image model catalog already exists. | Nano Banana 2 Lite is an additive catalog/mapping change; no image subsystem refactor needed. | Add active Gemini image IDs; remove preview IDs. |
| `gemini-image-client.ts` | Gemini image request path accepts model values and uses existing SDK call. | Reuse; do not create one-off Lite client. | Unit coverage. |
| Google changelog | Preview image IDs were shut down on 2026-06-25. | Built-in preview entries create broken choices and should be removed as cleanup. | Remove/decommission static entries. |
| `autobyteus-ts/src/multimedia` | Audio/image only; no video model/client/factory. | Generated video needs new capability boundary. | Add video subsystem. |
| `agent-tools/media` | Manifest/service/parser pattern already governs server-owned media tools. | `generate_video` should extend this owner, not bypass it. | Add manifest/parser/schema/service path. |
| Frontend/GraphQL model catalogs | LLM/audio/image lists only. | User-configurable default video model requires catalog UI extension. | Add video query/store/UI. |
| File-change semantics | Generated-output tools hardcoded for image/speech; type inference supports video. | Only generated-output tool name set needs extension for videos. | Add `generate_video` names. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-ts/src/multimedia/image/image-client-factory.ts` | Built-in image catalog and image client creation | Missing Lite/current GA Gemini image IDs; includes shut-down preview IDs. | Modify for active image model support/cleanup. |
| `autobyteus-ts/src/multimedia/image/api/gemini-image-client.ts` | Gemini image request/response shaping | Current path can support new image IDs. | Reuse; no direct tool-level Gemini image calls. |
| `autobyteus-ts/src/utils/gemini-model-mapping.ts` | Runtime-specific Gemini model IDs by modality | Needs active image IDs and new video modality mapping. | Extend and test. |
| `autobyteus-ts/src/multimedia/video/` | N/A | Folder/subsystem absent. | Add `VideoModel`, `BaseVideoClient`, `VideoClientFactory`, `GeminiVideoClient`, exports. |
| `autobyteus-ts/src/multimedia/utils/response-types.ts` | Image/speech response DTOs | No `VideoGenerationResponse`. | Add video response DTO. |
| `autobyteus-server-ts/src/agent-tools/media/media-tool-contract.ts` | Media tool names/input/result contracts | Image/speech only. | Add `generate_video`, `GenerateVideoInput`, mapping to `video_generation`. |
| `media-tool-input-parsers.ts` | Tool argument parsing | Image/speech parsers only. | Add `parseGenerateVideoInput`; can reuse image input parsing for `input_images`. |
| `media-tool-parameter-schemas.ts` | Tool argument schemas and dynamic generation_config schema | Image/speech only. | Add video schema branch and description suffix. |
| `media-tool-manifest.ts` | Server media tool manifest | Three tool entries only. | Add `generate_video` entry. |
| `media-generation-service.ts` | Model resolution, client creation, generated output writing | Image/audio only. | Add video client dependency and `generateVideo`. |
| `media-tool-path-resolver.ts` | Output path and image input path resolution | Output path generic; input references image-only. | Existing image reference resolver can serve image-to-video; optional generic media ref refactor if implementation chooses. |
| `autobyteus-server-ts/src/config/media-default-model-settings.ts` | Default media model keys/kinds | No video kind/setting. | Add `video_generation` kind and `DEFAULT_VIDEO_GENERATION_MODEL`. |
| `server-settings-service.ts` | Settings descriptions | No video default description. | Add setting export/description. |
| `multimedia-management/providers/services` | Audio/image model list/cache services | No video. | Add video provider/service/cache or minimal service equivalent. |
| `llm-management/services/model-catalog-service.ts` | Runtime model catalog aggregation | Audio/image list/reload only. | Add list/reload video models. |
| `api/graphql/types/llm-provider.ts` | Provider/model GraphQL queries | Available LLM/audio/image queries only. | Add `availableVideoProvidersWithModels`; include video in reload. |
| `autobyteus-web/graphql/queries/llm_provider_queries.ts` | Frontend provider/model query | Requests audio/image only. | Add video models. |
| `autobyteus-web/stores/llmProviderConfig.ts` | Frontend model catalog state | Stores LLM/audio/image only. | Add video providers/models. |
| `MediaDefaultModelsCard` and helpers | Default media model selector UI | Image edit, image generation, speech generation only. | Add Video generation selector. |
| `ProviderModelBrowser` / runtime | Provider API key model browser | Counts/lists LLM/audio/image only. | Add video model count/list section. |
| `file-change-tool-semantics.ts` | Generated-output tool name set | Missing `generate_video`. | Add local/MCP tool names. |
| `autobyteus-ts/docs/provider_model_catalogs.md` | Durable provider catalog docs | Contains stale image preview entry and no video catalog row. | Delivery docs sync. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-07-03 | Probe | `rg -n "VideoClient|BaseVideo|VideoModel|...|generate_video|..." autobyteus-ts/src autobyteus-server-ts/src autobyteus-web ...` | No matches for video generation client/tool/model identifiers. | Confirms generated video is unsupported. |
| 2026-07-03 | Probe | `rg -n "video" ...` | Found video input/display/artifact support across LLM messages, context files, media storage, run-file changes, and UI viewers. | Generated video can likely reuse downstream artifact/display plumbing once output file exists. |
| 2026-07-03 | Probe | `pnpm --version`, `node --version` | pnpm 10.28.2 and Node v22.23.1 available. | Downstream validation can use existing package scripts after dependency setup. |

## External / Public Source Findings

- Public API / spec / issue / upstream source: Google blog, `https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-omni-flash-nano-banana-2-lite/`
  - Version / freshness: Published June 30, 2026; opened July 3, 2026.
  - Relevant contract, behavior, or constraint learned: Nano Banana 2 Lite and Gemini Omni Flash are developer-available; Lite is fastest/cost-efficient image model; Omni Flash is high-quality/cost-efficient video generation/conversational editing model; Interactions API enables chaining and up to three sequential edits.
  - Why it matters: Confirms user screenshot and intended capabilities.
- Public API / spec / issue / upstream source: Gemini API image generation docs, `https://ai.google.dev/gemini-api/docs/image-generation`
  - Version / freshness: Opened July 3, 2026.
  - Relevant contract, behavior, or constraint learned: Active image IDs are `gemini-3.1-flash-lite-image`, `gemini-3.1-flash-image`, `gemini-3-pro-image`; legacy `gemini-2.5-flash-image` remains documented; Lite output constrained to 1K; aspect ratios listed.
  - Why it matters: Drives exact catalog updates and avoids guessed aliases.
- Public API / spec / issue / upstream source: Gemini API Omni docs, `https://ai.google.dev/gemini-api/docs/omni`
  - Version / freshness: Opened July 3, 2026.
  - Relevant contract, behavior, or constraint learned: `gemini-omni-flash-preview` uses Interactions API; supports text-to-video and image-to-video; returns `interaction.output_video.data` inline or `output_video.uri`; URI delivery requires polling `files.get` and SDK file download; aspect ratios `16:9`, `9:16`; limitations include uploaded video editing restrictions in EEA/CH/UK, unsupported audio references, unsupported multi-video reasoning, no extension/interpolation, no voice editing, no provisioned throughput, no system instructions/temperature/top_p/negative prompts.
  - Why it matters: Defines initial video client/tool scope and risks.
- Public API / spec / issue / upstream source: Gemini API changelog, `https://ai.google.dev/gemini-api/docs/changelog`
  - Version / freshness: Opened July 3, 2026.
  - Relevant contract, behavior, or constraint learned: June 30 release of `gemini-omni-flash-preview` and `gemini-3.1-flash-lite-image`; May 28 deprecation/shutdown date for preview image IDs was June 25, 2026.
  - Why it matters: Supports removing preview image IDs as obsolete.
- Public API / spec / issue / upstream source: Gemini Enterprise Agent Platform model docs for Omni Flash and Flash-Lite Image
  - Version / freshness: Opened July 3, 2026.
  - Relevant contract, behavior, or constraint learned: Cloud docs describe Omni Flash as optimized for video output plus text, and Flash-Lite Image as fastest image generation model. Agent Platform start docs show enterprise/ADC environment setup may differ.
  - Why it matters: Confirms model availability but highlights runtime/credential risk.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: Unit tests can mock `@google/genai`; server tool tests can mock media factories. Live checks require Google credentials and model access.
- Required config, feature flags, env vars, or accounts:
  - Image/video live Gemini API-key mode: `GEMINI_API_KEY`.
  - Current AutoByteus Gemini helper also supports `VERTEX_AI_API_KEY` or `VERTEX_AI_PROJECT` + `VERTEX_AI_LOCATION`; Gemini Omni Flash availability through Vertex/Enterprise may need validation.
  - Possible Enterprise Agent Platform setup: `GOOGLE_GENAI_USE_ENTERPRISE=True` + ADC per Cloud docs, if that runtime path is later required.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: `git fetch origin --prune`; dedicated worktree creation.
- Cleanup notes for temporary investigation-only setup: None.

## Findings From Code / Docs / Data / Logs

- Current AutoByteus media generation is split by media type, with the model factory/client subsystem in `autobyteus-ts` and server-owned tool orchestration in `autobyteus-server-ts`.
- Image model support is centrally owned and easy to update for Nano Banana 2 Lite.
- The current image catalog is stale relative to Google’s July 2026 docs: it still exposes shut-down preview model IDs.
- Video support is present only for consumption/display/input, not generation. This means Gemini Omni Flash cannot be added as a mere model row under existing image/audio catalogs.
- The existing generated-output writer can already handle data URIs and local file paths through `downloadFileFromUrl`, so a video client can return either a video data URI or a temp local downloaded MP4 path for the service to copy.
- Because Google URI delivery may require authenticated SDK download, `GeminiVideoClient` should own URI polling/download and return a local temp path rather than handing an authenticated Google file URI to `MediaPathResolver`.

## Constraints / Dependencies / Compatibility Facts

- Official IDs to use:
  - `gemini-3.1-flash-lite-image`
  - `gemini-3.1-flash-image`
  - `gemini-3-pro-image`
  - `gemini-2.5-flash-image` retained as legacy existing support
  - `gemini-omni-flash-preview`
- Preview IDs to remove/decommission:
  - `gemini-3.1-flash-image-preview`
  - `gemini-3-pro-image-preview`
- `generate_video` should initially be text-to-video and image-to-video only.
- Existing media output path policy allows absolute writable paths and workspace-relative paths.
- Do not change default image model from `gpt-image-1.5` without explicit user instruction.
- Live Gemini video generation may be slow/large and preview-gated.

## Open Unknowns / Risks

- Exact `@google/genai` TypeScript type spellings for `interactions.create` request fields may differ from docs examples; implementation should confirm against installed `@google/genai` v1.42.0 types after dependency setup.
- Whether the user's configured Gemini runtime has access to `gemini-omni-flash-preview`.
- Whether Vertex/Enterprise-specific configuration changes are needed for Omni Flash in the user's environment.
- Whether future follow-up should add video editing/multi-turn sessions and previous interaction storage.

## Notes For Architect Reviewer

- Requirements are re-approved as of 2026-07-03 after CR-002 for creation-only `generate_video`; treat `edit_video`/source-video/stateful editing as explicit future work unless user expands scope again.
- The main architectural decision is to add a first-class video media subsystem instead of direct Google calls in the tool layer.
- Image support should be a catalog/mapping update with stale-preview cleanup; no new image request path is needed.
- Current downstream video display/artifact plumbing is reusable and should not be reimplemented.
