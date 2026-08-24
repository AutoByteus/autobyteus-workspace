# Multimedia Management

## Scope

Audio/image/video model catalogs and media-serving integration.

## TS Source

- `src/multimedia-management`
- `src/services/media-storage-service.ts`
- `src/api/rest/media.ts`

## Catalog Owners

- `autobyteus-ts/src/multimedia/audio/audio-client-factory.ts`
- `autobyteus-ts/src/multimedia/image/image-client-factory.ts`
- `autobyteus-ts/src/multimedia/video/video-client-factory.ts`
- `src/llm-management/services/model-catalog-service.ts`
- `src/llm-management/services/model-availability-service.ts`

The SDK factories are the authoritative in-process audio/image/video row
registries. Static rows initialize without network access. AutoByteus-discovered
audio and image rows are atomically replaced under exact source IDs by the
provider-targeted model catalog lifecycle; video remains static. The deleted
audio/image/video model-service and cached-provider facades have no replacement
aggregate cache or global Reload API.

Media construction first accepts an already registered model. A missing
persisted AutoByteus audio/image identifier may ensure only its exact configured
source after restart and then recheck the registry. Full normalized endpoint
identity is required; zero or ambiguous matches remain unavailable. See
[LLM Management](./llm_management.md) for snapshot, ensure, invalidation,
deadline, and partial/stale semantics shared with LLM discovery.

## Agent Tool Integration

Server-owned media agent tools live in `src/agent-tools/media` and reuse the
multimedia client factories/model catalogs for provider-specific execution.
The server-owned tool layer is responsible for agent-facing contracts,
runtime projection, default-model resolution, media-local path handling, and
result shaping. AutoByteus uses local wrappers; Codex App Server and Claude
Agent SDK receive configured media tools through the unified
`autobyteus_agent_tools` Agent Tools MCP descriptor.

The active first-party agent tool names are:

- `generate_image`
- `edit_image`
- `generate_speech`
- `generate_video`

`generate_image`, `edit_image`, and `generate_video` accept `input_images` only
as an optional array of image-reference strings. A single reference should be
passed as a one-element array. String or comma-separated `input_images` input is
not accepted, including as a compatibility fallback, because data URIs can
contain commas and must stay intact as individual array entries.

`generate_video` is currently a creation-only video tool. Its
`generation_config.task` may select `text_to_video`, `image_to_video`, or
`reference_to_video`; `image_to_video` and `reference_to_video` require at least
one `input_images` entry. Video editing, uploaded/source-video editing,
stateful `previous_interaction_id` flows, audio-reference upload, and voice
editing are intentionally outside the current server-owned media tool contract
and should be added through a future explicit tool/schema expansion rather than
hidden behind `generate_video`.

Media local-path handling is intentionally scoped to the server-owned media tool
fields. Relative local paths resolve inside the active workspace and may not
traverse outside it. Absolute `output_file_path` values may target any local path
writable by the server process. Absolute local `input_images` entries,
`input_images` `file:` URLs, and `edit_image.mask_image` local paths or `file:`
URLs may target any existing local file readable by the server process. URL and
data URI image references continue to pass through unchanged.

## Synchronous Image-Generation Completion Boundary

`generate_image` is the bounded synchronous media capability. Its
`MediaGenerationService` deadline begins before model/provider resolution and
covers provider generation, returned-media transfer, and cleanup performed
before the service settles. Timeout resolution uses the first valid integer in
this order:

1. the service-internal `mediaOperationTimeoutMs` execution option;
2. the saved `MEDIA_OPERATION_TIMEOUT_MS` server setting; and
3. the 300,000 ms default.

Valid values are 10,000 through 3,600,000 ms. Invalid explicit or saved values
are diagnosed and skipped. This policy belongs only to synchronous
`generate_image`; it is not a runtime-wide tool timeout, and this ticket does
not add a duration bound to `edit_image`, `generate_speech`, or
`generate_video`.

The native tool wrapper passes the active turn signal and invocation identity
into the service. The child signal reaches provider and returned-media
transports where their SDKs support cancellation. A provider that cannot cancel
may settle late, but the service observes its rejection and a revoked
`MediaOperationLease` prevents the late operation from publishing success.
Every generated image is downloaded to a per-invocation sibling staging path;
publication to the requested final path is serialized per output path and
requires the current active lease immediately before and after atomic rename.
A newer retry for the same path revokes the older lease, so timeout,
cancellation, or late completion cannot overwrite a pre-existing or newer
artifact. Staging and client cleanup waits are bounded to five seconds and do
not turn a failed operation into `{ file_path }` success.

The remaining media operations still propagate an available abort signal to
their provider and transfer adapters, but otherwise preserve their existing
duration semantics. All successful public media tool results remain
`{ file_path }`.

Saved default model server settings apply to future/new media tool schema
construction and invocation:

- `DEFAULT_IMAGE_GENERATION_MODEL`
- `DEFAULT_IMAGE_EDIT_MODEL`
- `DEFAULT_SPEECH_GENERATION_MODEL`
- `DEFAULT_VIDEO_GENERATION_MODEL`

`MEDIA_OPERATION_TIMEOUT_MS` is a separate capability-policy setting for
future `generate_image` invocations; it does not affect model selection.
