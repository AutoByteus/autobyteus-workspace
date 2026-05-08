# Design Spec

## Current-State Read

`generate_image`, `edit_image`, and `generate_speech` are currently owned by `autobyteus-ts` as `BaseTool` classes. They are registered in `autobyteus-ts/src/tools/register-tools.ts`, so AutoByteus runtime agents can instantiate them through `defaultToolRegistry`. The tools also directly own mixed responsibilities: default model lookup, model-specific schema composition, client creation/caching, input path parsing, output path resolution, media URL download, and result shaping.

The server already owns first-party cross-runtime tools through a different pattern:

- Browser tools live under `autobyteus-server-ts/src/agent-tools/browser/*`, define a server-owned contract/manifest/service, register AutoByteus local wrappers, and project into Codex and Claude through explicit runtime adapters.
- `publish_artifacts` lives under `autobyteus-server-ts/src/agent-tools/published-artifacts/*`, with Codex dynamic and Claude MCP projection builders.
- Codex and Claude do not generically expose every `defaultToolRegistry` local tool. They only receive tool surfaces explicitly projected at bootstrap.

This means the current media tools are below the boundary that governs multi-runtime tool exposure. Moving provider/client code wholesale into the server would be wrong because `autobyteus-ts` already owns reusable multimedia provider infrastructure. The needed refactor is to move the **agent tool boundary and orchestration** into the server while keeping multimedia factories/clients/models in `autobyteus-ts`.

Constraints the target design must respect:

- Keep public tool names: `generate_image`, `edit_image`, `generate_speech`.
- Keep reusable provider/client infrastructure in `autobyteus-ts`; do not make `autobyteus-ts` depend on the server.
- Avoid duplicate tool-name registration in `defaultToolRegistry`.
- Preserve generated-output artifact/file-change behavior from explicit output paths and `{ file_path }` results.
- Preserve server setting keys: `DEFAULT_IMAGE_EDIT_MODEL`, `DEFAULT_IMAGE_GENERATION_MODEL`, `DEFAULT_SPEECH_GENERATION_MODEL`.
- Make path handling safe and consistent for all runtime projections.

## Intended Change

Create a server-owned media tool subsystem that owns canonical media tool contracts, input parsing, model-default resolution, path policy, execution orchestration, and runtime projections. The subsystem will reuse `ImageClientFactory` and `AudioClientFactory` from `autobyteus-ts` for provider-specific work.

The target behavior is:

1. Agent definitions continue configuring the same tool names.
2. The server resolves configured media tool names into a media exposure group.
3. AutoByteus receives server-owned local-tool wrappers through `defaultToolRegistry`.
4. Codex receives server-owned dynamic tools for the enabled media tool names.
5. Claude receives server-owned MCP tools, using the stable media MCP server name `autobyteus_image_audio` so known generated-output MCP names remain aligned.
6. All projections delegate to one `MediaGenerationService` instead of duplicating model/path/client/download behavior.
7. The old `autobyteus-ts` tool classes and registrations are removed/decommissioned as in-scope legacy paths.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Refactor / Larger Requirement
- Current design issue found (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue, with duplicated coordination risk if implemented by copying logic per runtime
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes
- Evidence:
  - Media tools are `autobyteus-ts` local tools and are only automatically visible to AutoByteus runtime.
  - Browser and Published Artifact tools are server-owned and explicitly projected into Codex/Claude.
  - Codex/Claude bootstrap code has explicit dynamic/MCP projection builders; there is no generic local-tool projection.
  - Current media tool classes own execution details that would be duplicated if Codex/Claude adapters were added independently.
- Design response: Introduce one server-owned media tool manifest/service and three thin runtime projection layers.
- Refactor rationale: Cross-runtime tool availability is governed by the server. The tool boundary must move to the server so provider selection, path safety, execution, and result semantics are authoritative in one place.
- Intentional deferrals and residual risk, if any:
  - Fine-grained model capability metadata for “generation-capable” vs “edit-capable” image models is deferred unless implementation discovers an existing field. The first pass may use the existing image catalog for both image dropdowns/tools and rely on provider errors for unsupported combinations.
  - Long-lived media client pooling is deferred. The first server-owned service should create/use/cleanup clients per invocation or through a short-lived lease to avoid stale default-model behavior. A future pool may be added only behind the service boundary.

## Terminology

Use the shared design terminology from `design-principles.md`. In this design:

- “Media tool subsystem” means the server-owned `autobyteus-server-ts/src/agent-tools/media/*` capability area.
- “Projection” means a runtime-specific adapter from the server-owned media manifest into AutoByteus local tools, Codex dynamic tools, or Claude MCP tools.
- “Provider/client infrastructure” means reusable `autobyteus-ts/src/multimedia/*` models, factories, and API clients.

## Design Reading Order

Read this design in this order:

1. Data-flow spine and ownership model.
2. Server media subsystem allocation.
3. Runtime projection mapping.
4. File responsibilities and migration/removal sequence.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove direct `autobyteus-ts` media tool ownership for `generate_image`, `edit_image`, and `generate_speech` once server-owned wrappers exist.
- In-scope obsolete paths:
  - `autobyteus-ts/src/tools/register-tools.ts` imports and registrations for `GenerateImageTool`, `EditImageTool`, `GenerateSpeechTool`.
  - Public exports for those tool classes from `autobyteus-ts/src/tools/index.ts` if they only exist as local agent tool classes.
  - Tests whose purpose is the old `autobyteus-ts` tool boundary; migrate equivalent behavior tests to server-owned media subsystem tests.
- Not obsolete:
  - `autobyteus-ts/src/multimedia/image/*` and `autobyteus-ts/src/multimedia/audio/*` provider/client infrastructure.
  - Generic `ParameterSchema`, `download`/file utility infrastructure when reused by the server.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Agent definition configured with media tool names | Runtime session exposes the enabled media tool surface | Server runtime tool exposure layer | Shows why server, not `autobyteus-ts`, must own the tool boundary. |
| DS-002 | Primary End-to-End | Runtime media tool call | Output media file written and `{ file_path }` returned | `MediaGenerationService` | Core execution path that must be shared by all runtime projections. |
| DS-003 | Return-Event | Media tool result/lifecycle event | `FILE_CHANGE` / artifact projection sees generated output | Agent execution event pipeline | Preserves current generated-output UX. |
| DS-004 | Bounded Local | Server setting / default model lookup | Tool schema/client model selection for future invocations | Media model resolver | Keeps model selection authoritative and avoids duplicated env-var logic. |
| DS-005 | Bounded Local | Raw media input/output paths | Safe provider input references and output path | Media path resolver | Path safety must not differ by runtime. |

## Primary Execution Spine(s)

Cross-runtime exposure spine:

`AgentDefinition.toolNames -> resolveConfiguredAgentToolExposure -> media projection builder for runtime -> runtime tool surface -> MediaToolManifest entry`

Media execution spine:

`Runtime tool call -> thin runtime projection handler -> MediaToolManifest parse/execute -> MediaGenerationService -> ImageClientFactory/AudioClientFactory -> provider client -> output file download -> { file_path }`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The server reads an agent definition’s configured tool names, classifies enabled media tool names, and builds only the runtime-specific tool surface needed by that runtime. | Agent definition, configured tool exposure, runtime projection builder, runtime session config | Server runtime tool exposure layer | Tool-name allowlists, runtime-specific schema conversion, allowed-tools lists |
| DS-002 | A media tool call enters through AutoByteus/Codex/Claude, is parsed by the canonical manifest, and delegates to one media service that resolves model, paths, client, provider call, download, and result. | Runtime handler, manifest entry, media generation service, multimedia client factory, provider client | `MediaGenerationService` | Model default resolution, path safety, provider-specific generation_config, client cleanup |
| DS-003 | A successful media tool returns `{ file_path }`; runtime event converters emit canonical or allowlisted tool lifecycle events; file-change processing creates generated-output projections. | Runtime event converter, file-change event processor, artifact/run-file-change projection | Agent execution event pipeline | Tool-name normalization, result JSON parsing, output-path extraction |
| DS-004 | Schema and execution resolve a default model through shared media config keys and the current catalog, adding model-specific `generation_config` where available. | Media model resolver, app config, multimedia model catalog | Media model resolver | Settings UI, schema cache invalidation, fallback defaults |
| DS-005 | Input image paths and output file paths are normalized once inside the server media subsystem before provider calls and downloads occur. | Input parser, path resolver, workspace root | Media path resolver | URL/data URI passthrough, workspace-relative resolution, allowed absolute roots |

## Spine Actors / Main-Line Nodes

- `AgentDefinition.toolNames`
- `ConfiguredAgentToolExposure`
- AutoByteus / Codex / Claude media projection builders
- `MediaToolManifest`
- `MediaGenerationService`
- `ImageClientFactory` / `AudioClientFactory`
- Provider client (`OpenAIImageClient`, `GeminiImageClient`, `OpenAIAudioClient`, `GeminiAudioClient`, remote AutoByteus providers)
- File-change/generated-output event pipeline

## Ownership Map

| Main-Line Node | Owns |
| --- | --- |
| `AgentDefinition.toolNames` | User/admin selection of allowed tool names for an agent definition. It does not own runtime projection or execution. |
| `ConfiguredAgentToolExposure` | Categorization of configured tool names into server-owned exposure groups. It does not build schemas or execute tools. |
| Runtime media projection builders | Runtime transport shape only: AutoByteus `BaseTool`, Codex dynamic tool spec/handler, Claude SDK MCP tool definition/allowed names. They do not own model lookup, path policy, provider calls, or result semantics. |
| `MediaToolManifest` | Canonical public tool contract: name, description, schema builder, parser, and service dispatch target. |
| `MediaGenerationService` | Governing execution owner for model resolution, path normalization, client invocation, download/copy to output path, cleanup, and returned result shape. |
| `MediaModelResolver` | Default-model setting lookup, fallback selection, catalog lookup, and model-specific schema/description fragments. |
| `MediaPathResolver` | URL/data URI passthrough, file input normalization, output path safety, and workspace root requirement. |
| `ImageClientFactory` / `AudioClientFactory` | Provider/client creation and model catalog infrastructure. These remain library-level reusable owners. |
| File-change event pipeline | Derived generated-output projections from tool events/results. It does not execute media tools. |

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| Server AutoByteus `BaseTool` wrappers | `MediaGenerationService` via `MediaToolManifest` | Adapts canonical media tools into `defaultToolRegistry` for AutoByteus runtime. | Model lookup, path policy, provider calls, client caching. |
| Codex dynamic tool registrations | `MediaGenerationService` via `MediaToolManifest` | Adapts canonical media tools into Codex app-server dynamic tools. | Per-tool business logic or provider-specific behavior. |
| Claude MCP tool definitions | `MediaGenerationService` via `MediaToolManifest` | Adapts canonical media tools into Claude SDK MCP tools. | Per-tool business logic or output-path extraction. |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| `GenerateImageTool` direct registration in `autobyteus-ts/src/tools/register-tools.ts` | Server-owned wrapper becomes the authoritative local-tool projection. | `autobyteus-server-ts/src/agent-tools/media/register-media-tools.ts` | In This Change | Remove import and `registerToolClass` call. |
| `EditImageTool` direct registration in `autobyteus-ts/src/tools/register-tools.ts` | Same. | Server media AutoByteus wrapper | In This Change | Remove import and `registerToolClass` call. |
| `GenerateSpeechTool` direct registration in `autobyteus-ts/src/tools/register-tools.ts` | Same. | Server media AutoByteus wrapper | In This Change | Remove import and `registerToolClass` call. |
| `autobyteus-ts/src/tools/multimedia/image-tools.ts` local tool classes | Tool orchestration moves to server. | `MediaGenerationService`, manifest, wrappers | In This Change | Delete or reduce only if no reusable non-tool logic remains; do not leave compatibility wrappers. |
| `autobyteus-ts/src/tools/multimedia/audio-tools.ts` local tool class | Tool orchestration moves to server. | `MediaGenerationService`, manifest, wrappers | In This Change | Delete or reduce only if no reusable non-tool logic remains. |
| `autobyteus-ts/src/tools/index.ts` exports for old media tool classes | Exporting removed classes would preserve old boundary. | Server-owned tool registration | In This Change | Keep multimedia client/factory exports as-is if present. |
| Old media tool unit/integration tests under `autobyteus-ts/tests/*/tools/multimedia/*` | They test the wrong owner after refactor. | Server media unit/integration tests | In This Change | Keep separate tests for client factories if they exist independently. |

## Return Or Event Spine(s) (If Applicable)

Generated-output event spine:

`MediaGenerationService result { file_path } -> runtime tool completion event -> event converter normalizes tool name/result -> FileChangeEventProcessor.extractGeneratedOutputPathForKnownTool -> FILE_CHANGE(status=available, sourceTool=generated_output) -> run artifacts/media UI`

Design requirements for this return spine:

- All projections must return JSON/object content equivalent to `{ file_path: absoluteResolvedPath }`.
- Codex dynamic handlers may return text content, but it must be JSON text so `CodexToolPayloadParser` can parse it into an object result.
- Claude MCP handlers may return MCP text content, but media result normalization should unwrap JSON text envelopes the same way browser results are normalized.
- Use canonical tool names for server internal events where possible. If Claude transport emits `mcp__autobyteus_image_audio__...`, normalize it to the canonical tool name for UI while keeping generated-output allowlist coverage for the MCP-prefixed form.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `MediaModelResolver`
  - Arrow chain: `tool name -> setting key/fallback -> appConfigProvider.config.get -> ImageClientFactory/AudioClientFactory catalog lookup -> model-specific schema/description`
  - Why it matters: prevents every projection from reimplementing default-model and generation_config schema logic.

- Parent owner: `MediaPathResolver`
  - Arrow chain: `raw output_file_path -> workspace root requirement -> resolveSafePath -> target directory creation by download utility`
  - Why it matters: output file writes are the side effect that creates artifacts and must be equally safe across runtimes.

- Parent owner: `MediaPathResolver`
  - Arrow chain: `raw input_images/mask_image -> URL/data URI passthrough OR workspace-relative resolution OR allowed absolute file resolution -> provider-ready references`
  - Why it matters: current AutoByteus-only preprocessing cannot be relied on by Codex/Claude.

- Parent owner: `MediaClientLease` or direct service client lifecycle
  - Arrow chain: `resolved model -> create client -> provider call -> optional cleanup -> result`
  - Why it matters: avoids stale clients after server setting changes. Do not introduce long-lived caches in the first refactor unless they are keyed by exact model identifier and invalidated behind the service boundary.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Model default settings constants | DS-004 | Media model resolver, server settings UI/service | Single source for setting keys and fallback model identifiers. | Prevents duplicated string constants. | Settings and media tools drift on key/default names. |
| Schema conversion for Codex | DS-001, DS-004 | Codex projection builder | Convert `ParameterSchema`/manifest schema into Codex JSON schema. | Codex needs transport-specific schema. | Media service would know Codex transport details. |
| Schema conversion for Claude | DS-001, DS-004 | Claude projection builder | Convert manifest schema into Zod/Claude SDK tool definitions. | Claude SDK requires tool definitions/MCP server shape. | Media service would depend on Claude. |
| Tool result serialization | DS-002, DS-003 | Projection builders | Return runtime-compatible success/error payloads while preserving `{ file_path }`. | Runtimes have different result surfaces. | Execution service would become transport-specific. |
| Event normalization | DS-003 | Event converters | Normalize MCP-prefixed media tool names/results into canonical events where applicable. | UI should not infer provider prefixes. | Frontend would need transport-specific hacks. |
| Tests / provider doubles | All | Implementation and validation | Mock provider clients/factories where real credentials are unavailable. | Media providers are external and may be slow. | E2E validation becomes flaky or credential-dependent. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Provider image/audio clients | `autobyteus-ts/src/multimedia/*` | Reuse | Already owns OpenAI/Gemini/AutoByteus multimedia clients and model catalogs. | N/A |
| Server-owned tool loading | `autobyteus-server-ts/src/startup/agent-tool-loader.ts` | Extend | Existing loader already loads Browser and Published Artifact server tools. | N/A |
| AutoByteus local-tool registry | `defaultToolRegistry` | Reuse | AutoByteus runtime still consumes local tool definitions. | N/A |
| Codex dynamic tool path | `agent-execution/backends/codex/*dynamic*` | Extend | Existing dynamic-tool contract handles server-owned tools. | N/A |
| Claude MCP projection | `agent-execution/backends/claude/*mcp*` | Extend | Existing SDK helpers create in-process MCP servers. | N/A |
| Server settings persistence | `ServerSettingsService` / `appConfigProvider` | Extend | Existing settings keys are persisted to env/.env. | N/A |
| Canonical media execution service | None | Create New | No server owner currently owns media tool execution across runtimes. | Existing Browser/Published Artifact services are different domains. |
| Cross-runtime media tool manifest | None | Create New | Browser manifest is browser-specific; media needs distinct params/results/model behavior. | Browser manifest parameter types are too narrow and semantically browser-owned. |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Server media tools | Canonical media contracts, parsing, model resolving, path resolving, execution service, AutoByteus wrappers | DS-001, DS-002, DS-004, DS-005 | `MediaGenerationService`, `MediaToolManifest` | Create New | Lives under `autobyteus-server-ts/src/agent-tools/media`. |
| Codex runtime projection | Codex dynamic tool specs/handlers for media tools | DS-001, DS-003 | Codex bootstrapper | Extend | No media business logic here. |
| Claude runtime projection | Claude MCP tool definitions/server and allowed tools for media tools | DS-001, DS-003 | Claude session bootstrap | Extend | Use MCP server name `autobyteus_image_audio`. |
| AutoByteus runtime local tools | Registry wrappers for server-owned media tools | DS-001, DS-002 | AutoByteus backend factory | Extend | Wrappers should be thin. |
| Multimedia provider library | Provider clients/factories/model catalogs | DS-002, DS-004 | Media service | Reuse | Remains in `autobyteus-ts`. |
| Event/file-change pipeline | Generated-output detection and artifact projection | DS-003 | Agent execution events | Extend if needed | Add/normalize media MCP prefix only if not already covered. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `src/config/media-default-model-settings.ts` | Server config | Config constants | Setting keys and fallback model identifiers | Shared by settings service and media tool resolver without depending on either owner. | N/A |
| `src/agent-tools/media/media-tool-contract.ts` | Server media tools | Manifest contract | Tool name constants, tool input/result types, tool name set guards | Canonical media tool public contract. | Config constants |
| `src/agent-tools/media/media-tool-model-resolver.ts` | Server media tools | Model resolver | Read defaults, resolve catalog model, produce model-specific schema/description | One owner for model selection. | Multimedia factories |
| `src/agent-tools/media/media-tool-parameter-schemas.ts` | Server media tools | Schema builder | Build `ParameterSchema` for all media tools | Keeps schema construction out of wrappers/projections. | Model resolver |
| `src/agent-tools/media/media-tool-input-parsers.ts` | Server media tools | Input parser | Normalize raw tool arguments into typed inputs | One parser for all runtimes. | Contract types |
| `src/agent-tools/media/media-tool-path-resolver.ts` | Server media tools | Path resolver | Output safe path and input media reference normalization | Path policy is shared and security-sensitive. | `resolveSafePath` or equivalent |
| `src/agent-tools/media/media-generation-service.ts` | Server media tools | Execution service | Orchestrate model/path/client/provider/download/result | Governing owner for execution. | Model/path resolvers, factories |
| `src/agent-tools/media/media-tool-manifest.ts` | Server media tools | Canonical manifest | Entry list mapping names to descriptions/schemas/parsers/service dispatch | One source for projections. | All media owned structures |
| `src/agent-tools/media/register-media-tools.ts` | AutoByteus projection | Registry entrypoint | Register all server-owned media wrappers | Mirrors existing server-owned tool loaders. | Manifest/service |
| `src/agent-tools/media/*.ts` wrapper files or one `media-autobyteus-tools.ts` | AutoByteus projection | Thin wrappers | Implement `BaseTool` classes or `tool(...)` functions delegating to manifest/service | AutoByteus-specific adapter. | Manifest/service |
| `src/agent-execution/backends/codex/media/build-media-dynamic-tool-registrations.ts` | Codex projection | Dynamic tool builder | Convert manifest to Codex specs/handlers | Runtime-specific projection. | Manifest/service |
| `src/agent-execution/backends/claude/media/*` | Claude projection | MCP builder | Convert manifest to Claude SDK tool definitions and MCP server | Runtime-specific projection. | Manifest/service |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Tool name constants and type guards | `media-tool-contract.ts` | Server media tools | Used by exposure resolver, projections, wrappers, event normalization. | Yes | Yes | Generic all-tools registry. |
| Default model keys/fallbacks | `config/media-default-model-settings.ts` | Server config | Used by settings service, UI-adjacent backend metadata, and media resolver. | Yes | Yes | Tool execution service. |
| Model-specific schema/description lookup | `media-tool-model-resolver.ts` | Server media tools | Needed by AutoByteus, Codex, Claude schema builders. | Yes | Yes | Runtime projection helper. |
| Path normalization | `media-tool-path-resolver.ts` | Server media tools | Needed by all media execution calls. | Yes | Yes | Generic file explorer utility. |
| Runtime result serialization/parsing helpers | Projection-local files | Runtime projection subsystems | Runtime-specific result surface differs. | Yes | Yes | Shared media service concern. |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `MediaToolName` | Yes | Yes | Low | Use exact union from `MEDIA_TOOL_NAME_LIST`. |
| `GenerateImageInput` | Yes | Yes | Low | Final delivery contract: `input_images` is an optional `string[]` public argument across AutoByteus, Codex, and Claude projections; string/comma-shaped input is rejected rather than compatibility-parsed. |
| `EditImageInput` | Yes | Yes | Low | Final delivery contract: `input_images` is an optional `string[]` public argument and `mask_image` remains `string | null`; local/data URI image references stay array entries through parsing and path normalization. |
| `GenerateSpeechInput` | Yes | Yes | Low | Keep `prompt`, `outputFilePath`, `generationConfig`. |
| `MediaToolExecutionContext` | Yes | Yes | Medium | Fields should be only `runId`, `agentId`, `workspaceRootPath`; do not copy whole runtime context. |
| `MediaToolResult` | Yes | Yes | Low | Single field `file_path` remains canonical for downstream generated-output extraction. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/config/media-default-model-settings.ts` | Server config | Media default setting constants | Export setting keys, fallback model identifiers, and key set. | Neutral shared config file avoids settings-service/media-tool dependency inversion. | N/A |
| `autobyteus-server-ts/src/agent-tools/media/media-tool-contract.ts` | Server media tools | Canonical media tool contract | Export tool names, tool-name guards, input/result/context types. | One public media tool contract. | Config constants |
| `autobyteus-server-ts/src/agent-tools/media/media-tool-input-parsers.ts` | Server media tools | Input parsing boundary | Reject missing required fields, normalize optional images/config/mask, produce typed internal inputs. | Separates validation from execution. | Contract types |
| `autobyteus-server-ts/src/agent-tools/media/media-tool-model-resolver.ts` | Server media tools | Default model and schema resolver | Resolve configured model from `appConfigProvider`, fallback defaults, model catalog, generation_config schema, model descriptions. | Single owner for all default-model logic. | Factories and config constants |
| `autobyteus-server-ts/src/agent-tools/media/media-tool-parameter-schemas.ts` | Server media tools | Argument schema builder | Build `ParameterSchema` for each canonical media tool from base params plus model-specific config. | Reused by AutoByteus/Codex/Claude projections. | Model resolver |
| `autobyteus-server-ts/src/agent-tools/media/media-tool-path-resolver.ts` | Server media tools | Path safety | Resolve output path, input image paths, and mask path against workspace/allowed roots; pass URLs/data URIs through. | Security-sensitive and shared. | `resolveSafePath` or equivalent |
| `autobyteus-server-ts/src/agent-tools/media/media-generation-service.ts` | Server media tools | Execution owner | Execute generate/edit/speech using model resolver, path resolver, client factories, download utility, and cleanup. | Governing owner for media side effects. | All media owned structures |
| `autobyteus-server-ts/src/agent-tools/media/media-tool-manifest.ts` | Server media tools | Canonical manifest | List tool entries with name, description provider, schema provider, parser, and service dispatcher. | Single projection input. | Contract/schema/parser/service |
| `autobyteus-server-ts/src/agent-tools/media/media-autobyteus-tools.ts` | AutoByteus projection | Thin local-tool wrappers | Define/register `BaseTool` classes or functional tools that delegate to manifest/service. | Keeps AutoByteus adaptation in one file unless size forces split. | Manifest/service |
| `autobyteus-server-ts/src/agent-tools/media/register-media-tools.ts` | AutoByteus projection | Startup registration | Register all server-owned media tools and expose schema refresh helper if needed. | Matches existing server-owned tool loading pattern. | Wrapper definitions |
| `autobyteus-server-ts/src/agent-execution/backends/codex/media/build-media-dynamic-tool-registrations.ts` | Codex projection | Codex dynamic media tools | Convert manifest schemas to JSON schemas and bind handlers with working directory. | Codex-specific transport only. | Manifest/service |
| `autobyteus-server-ts/src/agent-execution/backends/claude/media/build-claude-media-tool-definitions.ts` | Claude projection | Claude tool definitions | Convert manifest schemas to Zod fields and bind handlers with working directory. | Claude-specific schema/tool shape. | Manifest/service |
| `autobyteus-server-ts/src/agent-execution/backends/claude/media/build-claude-media-mcp-server.ts` | Claude projection | Claude MCP server builder | Create `autobyteus_image_audio` in-process MCP server when media tools are enabled. | Mirrors browser/publish MCP builders. | Tool definitions |
| `autobyteus-server-ts/src/agent-execution/backends/claude/media/claude-media-tool-result-normalizer.ts` | Claude projection/events | Result normalization | Unwrap media MCP text result envelopes and return parsed `{ file_path }` where possible. | Avoids browser-specific normalizer expansion. | Media tool-name guard |

## Ownership Boundaries

The authoritative media execution boundary is `MediaGenerationService`. Runtime projections must call it through manifest entries and must not reach into `ImageClientFactory`, `AudioClientFactory`, path utilities, or default-model settings directly except through manifest/schema builders.

The authoritative public media tool contract boundary is `MediaToolManifest` plus `media-tool-contract.ts`. Any runtime projection above this boundary must use the manifest rather than duplicating names/descriptions/schemas.

The provider/client boundary remains `autobyteus-ts` multimedia factories and clients. Server media tools may depend downward on those factories, but provider implementations must not import server code.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `MediaToolManifest` | Tool-specific schema builders, parsers, service dispatch mapping | AutoByteus/Codex/Claude projection builders | Projection redefines media argument schemas or descriptions. | Add fields/methods to manifest entry. |
| `MediaGenerationService` | Model lookup, path resolving, client creation, provider call, download, cleanup | All runtime handlers | Codex/Claude wrappers call `ImageClientFactory` directly. | Add service method/context parameter. |
| `MediaModelResolver` | Config setting lookup, fallback defaults, model catalog lookup, generation_config schema | Schema builders and service | Runtime projection reads `process.env.DEFAULT_*` directly. | Add resolver method. |
| `MediaPathResolver` | Workspace/allowed-root path normalization and URL passthrough | Service/parser as needed | Wrapper resolves paths before service or lets provider read arbitrary raw local paths. | Add path resolver method. |
| `ImageClientFactory` / `AudioClientFactory` | Provider-specific client creation | Media service only | Runtime projections create clients. | Add media service capability. |

## Dependency Rules

Allowed dependencies:

- `autobyteus-server-ts/src/agent-tools/media/*` may import `autobyteus-ts` multimedia factories, `ParameterSchema`, and generic file/download utilities.
- Runtime projection builders may import media manifest/contracts and runtime-specific SDK/dynamic-tool helpers.
- `configured-agent-tool-exposure.ts` may import media tool-name guards.
- `ServerSettingsService` may import neutral config constants from `src/config/media-default-model-settings.ts`.

Forbidden shortcuts:

- `autobyteus-ts` must not import anything from `autobyteus-server-ts`.
- Do not keep direct `autobyteus-ts` media tool registration and server media registration active at the same time.
- Do not copy the media execution logic into Codex or Claude projection builders.
- Do not make frontend settings components infer media tool behavior; the backend contract remains authoritative.
- Do not expose new alternate public tool names for the same tools.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `getMediaToolManifestEntry(toolName)` | Media tool entry | Retrieve canonical tool metadata/dispatch by exact tool name. | `MediaToolName` | Throws for unknown names. |
| `MediaGenerationService.generateImage(context, input)` | Image generation execution | Generate image and write output file. | `MediaToolExecutionContext`, `GenerateImageInput` | Uses generation default model. |
| `MediaGenerationService.editImage(context, input)` | Image editing execution | Edit image and write output file. | `MediaToolExecutionContext`, `EditImageInput` | Uses edit default model. |
| `MediaGenerationService.generateSpeech(context, input)` | Speech generation execution | Generate speech and write output file. | `MediaToolExecutionContext`, `GenerateSpeechInput` | Uses speech default model. |
| `resolveMediaDefaultModel(toolName or media kind)` | Model selection | Resolve configured/fallback model and catalog model. | Explicit media tool/model kind | Do not accept arbitrary env key strings from callers. |
| `buildMediaDynamicToolRegistrationsForEnabledToolNames(options)` | Codex media projection | Build Codex dynamic registrations for exact enabled names. | `enabledToolNames`, `workingDirectory` | Returns null if none enabled. |
| `buildClaudeMediaMcpServer(options)` | Claude media projection | Build in-process MCP server for enabled media tools. | `enabledToolNames`, `workingDirectory`, `sdkClient` | Uses MCP server name `autobyteus_image_audio`. |
| `registerMediaTools()` | AutoByteus media projection | Register server-owned media local tools. | No external input | Called by startup loader. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `MediaGenerationService.generateImage` | Yes | Yes | Low | N/A |
| `MediaGenerationService.editImage` | Yes | Yes | Low | N/A |
| `MediaGenerationService.generateSpeech` | Yes | Yes | Low | N/A |
| `resolveMediaDefaultModel` | Yes | Yes if it accepts a media kind/tool enum | Medium if arbitrary strings are accepted | Use typed media model kind, not raw env var from callers. |
| Codex/Claude projection builders | Yes | Yes | Low | Pass explicit enabled names and working directory. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Server execution owner | `MediaGenerationService` | Yes | Low | Keep provider-neutral but media-specific. |
| Canonical contract | `MediaToolManifest` | Yes | Low | Mirrors browser manifest pattern. |
| Model resolver | `MediaToolModelResolver` or `MediaModelResolver` | Yes | Low | Prefer shorter `MediaModelResolver` if scoped under media folder. |
| Path resolver | `MediaToolPathResolver` or `MediaPathResolver` | Yes | Low | Prefer shorter `MediaPathResolver` if scoped under media folder. |
| Claude MCP server name | `autobyteus_image_audio` | Acceptable/stable | Medium | Use because existing MCP-prefixed generated-output forms already use this name. Document it. |

## Applied Patterns (If Any)

- Manifest-driven projection: Reuse the browser pattern where a canonical manifest feeds AutoByteus, Codex, and Claude adapters.
- Thin runtime adapters: Projection files own only transport shape and runtime context binding.
- Service-owned side effects: File writes/downloads and provider calls happen only in `MediaGenerationService`.
- Clean-cut replacement: Remove old `autobyteus-ts` local media tool classes/registrations instead of wrapping both old and new paths.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-tools/media/` | Folder | Server media tools | Canonical media tool contract, parsing, model/path/service, AutoByteus wrappers. | Same server-owned tool area as browser/published-artifacts. | Codex/Claude SDK-specific projection internals except shared manifest. |
| `autobyteus-server-ts/src/config/media-default-model-settings.ts` | File | Server config | Shared setting keys/fallbacks. | Neutral config location reused by settings and tools. | Tool execution logic. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/media/` | Folder | Codex projection | Dynamic media tool registrations. | Runtime-specific backend folder. | Provider calls or default model logic. |
| `autobyteus-server-ts/src/agent-execution/backends/claude/media/` | Folder | Claude projection | MCP media tool definitions/server and result normalization. | Runtime-specific backend folder. | Provider calls or default model logic. |
| `autobyteus-ts/src/multimedia/` | Existing folder | Multimedia provider library | Keep provider/client/model infrastructure. | Correct reusable library layer. | Server runtime/tool projection logic. |
| `autobyteus-ts/src/tools/multimedia/` | Existing folder | Legacy local tool classes | Remove/decommission media tool classes in scope. | No longer correct owner. | Compatibility wrappers. |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `agent-tools/media` | Main-Line Domain-Control plus AutoByteus thin facade | Yes | Low | Mirrors browser server-owned tool subsystem; projection-specific Codex/Claude files live outside. |
| `backends/codex/media` | Transport | Yes | Low | Contains only Codex dynamic projection. |
| `backends/claude/media` | Transport | Yes | Low | Contains only Claude MCP projection and event/result normalization. |
| `config/media-default-model-settings.ts` | Off-Spine Concern | Yes | Low | Neutral shared constants avoid cyclic ownership. |
| `autobyteus-ts/src/multimedia` | Persistence-Provider / Provider | Yes | Low | Provider/client infrastructure remains library-owned. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Runtime projection | Codex handler: `entry.parseInput(args) -> entry.execute(mediaService, input, { workspaceRootPath })`. | Codex handler manually reads `DEFAULT_IMAGE_GENERATION_MODEL`, creates `ImageClientFactory`, downloads file. | Keeps execution policy in one server owner. |
| Tool registration | `registerMediaTools()` registers server-owned wrappers after old `autobyteus-ts` registrations are removed. | Registering server media tools while `autobyteus-ts/registerTools()` also registers old media tools and relying on overwrite warnings. | Avoids duplicate ownership. |
| Model settings | `MediaModelResolver.resolveForTool(GENERATE_IMAGE_TOOL_NAME)` maps to the configured key/fallback. | Runtime projection passes arbitrary env var strings into a generic resolver. | Keeps identity explicit. |
| Claude MCP naming | MCP server `autobyteus_image_audio`, tool `generate_image`, event normalized to canonical `generate_image`. | New random MCP name plus unnormalized frontend display of `mcp__...` names. | Preserves current generated-output semantics and UI clarity. |
| Path handling | Service resolves `output_file_path` against the run workspace and allowed safe roots. | Letting each runtime accept arbitrary raw absolute paths. | Cross-runtime tools should not broaden filesystem access. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep old `autobyteus-ts` media tool classes registered and add server tools with same names | Would minimize removal work. | Rejected | Remove old direct registrations/classes and register server-owned wrappers. |
| Register server-owned media tools under new names like `server_generate_image` | Would avoid collision with old tools. | Rejected | Preserve public tool names and remove old owners. |
| Copy current media tool implementation into Codex and Claude projection files | Fastest way to expose runtime-specific tools. | Rejected | One `MediaGenerationService` used by all projections. |
| Keep model default lookup as raw `process.env` reads scattered across files | Matches current implementation. | Rejected | `MediaModelResolver` reads defaults through server config boundary. |
| Depend on an external/user-configured `autobyteus_image_audio` MCP server for Codex/Claude | It exists in some environments and can expose similar tools. | Rejected | Server-owned built-in projection is first-party and does not require users to configure an external MCP server. |

## Derived Layering (If Useful)

Layering after ownership:

1. Runtime selection/config: `AgentDefinition`, `ConfiguredAgentToolExposure`.
2. Runtime transport projections: AutoByteus local wrapper, Codex dynamic, Claude MCP.
3. Canonical server media tool boundary: manifest, parser, model/path resolvers, service.
4. Provider/client infrastructure: `autobyteus-ts` multimedia factories/clients.
5. Return/event projection: runtime event converters and file-change processor.

Layering is explanatory only; the authoritative rule is that projections call the media manifest/service and must not bypass it.

## Migration / Refactor Sequence

1. Add `src/config/media-default-model-settings.ts` and update `ServerSettingsService` to import media setting constants from it.
2. Add server media contract, input parsers, model resolver, parameter schema builder, path resolver, and `MediaGenerationService` with unit tests using mocked factories/provider responses.
3. Add `MediaToolManifest` and AutoByteus wrapper registration under `autobyteus-server-ts/src/agent-tools/media/*`.
4. Add the media tool loader entry to `autobyteus-server-ts/src/startup/agent-tool-loader.ts`.
5. Remove old `autobyteus-ts` media tool imports/registrations/exports/classes/tests, and migrate behavior tests to `autobyteus-server-ts`.
6. Extend `ConfiguredAgentToolExposure` with `enabledMediaToolNames` using `MEDIA_TOOL_NAMES`.
7. Add Codex media dynamic projection and wire it into `CodexThreadBootstrapper` with the resolved working directory. Add unit tests for gating/schema/result and an integration test with a mocked or lightweight media service.
8. Add Claude media MCP projection using MCP server name `autobyteus_image_audio`, wire it into session MCP server building and allowed-tool names. Add unit/integration tests for enabled names and result/event normalization.
9. Update Claude event normalization to canonicalize media MCP tool names and parse media MCP result envelopes where needed. Verify file-change generated-output extraction still succeeds from `{ file_path }`.
10. Run targeted tests for server media tools, Codex bootstrap/projection, Claude bootstrap/projection, file-change generated output, server settings, and relevant `autobyteus-ts` build/typecheck after removals.

Temporary seams allowed during implementation:

- A branch-local intermediate state may add server media files before removing old `autobyteus-ts` registrations, but the final reviewed state must not leave both active.
- Provider execution tests may use injected/mocked factories before API/E2E performs real or higher-level validation.

## Key Tradeoffs

- Keeping provider clients in `autobyteus-ts` preserves dependency direction and reuse, but requires server tool code to import library internals already exported through package wildcard exports.
- Per-invocation client creation is simpler and avoids stale model cache risk; if performance suffers later, add a service-owned cache keyed by exact model identifier.
- Using MCP server name `autobyteus_image_audio` for Claude is less semantically broad than `autobyteus_media`, but it aligns with existing generated-output MCP forms and avoids extra prefix drift.
- Delivery update after F-001 validation: product clarified that `input_images` should be array-shaped. The final advertised schema is `array<string>` across AutoByteus, Codex, and Claude, and string/comma-shaped input is rejected rather than compatibility-parsed.

## Risks

- Real provider calls require API keys/remote hosts; API/E2E should use mocks where possible and one credentialed smoke path only when configured.
- Model-specific schemas can become stale if default model settings change after schema cache population. Mitigation: update setting changes to invalidate media tool schemas for future AutoByteus sessions or reload schemas before run bootstrap.
- Image model capability metadata does not clearly distinguish edit-capable vs generation-only models. Mitigation: keep existing catalog semantics in this refactor and record a follow-up if capability filtering is needed.
- Path policy may be stricter than previous behavior for arbitrary absolute input image paths. Mitigation: document allowed roots and validate acceptance against existing workflows.
- Removing `autobyteus-ts` tool class exports can affect out-of-server consumers. This is intentional for this refactor if those classes only represented the old local tool boundary; if package consumers require a standalone tool bundle, that should be a separate explicit product requirement, not a compatibility wrapper hidden here.

## Guidance For Implementation

- Start with the server media service and unit tests before touching runtime bootstrap paths.
- Keep all runtime handlers thin; if a handler starts reading settings, resolving paths, or creating image/audio clients, move that code back into media-owned files.
- Prefer manifest-driven iteration for Codex/Claude builders so adding/removing a media tool is one manifest change plus projection tests.
- Return `{ file_path: resolvedPath }` from the media service for all three tools.
- For Codex dynamic tools, wrap that object as JSON text using `createCodexDynamicToolTextResult(JSON.stringify(result), true)` so existing parser logic recovers an object result.
- For Claude MCP tools, return text JSON content and normalize result envelopes in the Claude media result normalizer.
- Do not finish with registry overwrite warnings for media tool names; duplicates indicate the old boundary was not removed.
