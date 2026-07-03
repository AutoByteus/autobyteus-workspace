# Multimedia Management

## Scope

Audio/image/video model catalogs and media-serving integration.

## TS Source

- `src/multimedia-management`
- `src/services/media-storage-service.ts`
- `src/api/rest/media.ts`

## Main Services

- `src/multimedia-management/services/audio-model-service.ts`
- `src/multimedia-management/services/image-model-service.ts`
- `src/multimedia-management/services/video-model-service.ts`

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

Saved default model server settings apply to future/new media tool schema
construction and invocation:

- `DEFAULT_IMAGE_GENERATION_MODEL`
- `DEFAULT_IMAGE_EDIT_MODEL`
- `DEFAULT_SPEECH_GENERATION_MODEL`
- `DEFAULT_VIDEO_GENERATION_MODEL`
