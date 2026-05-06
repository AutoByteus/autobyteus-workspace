# Multimedia Management

## Scope

Audio/image model catalogs and media-serving integration.

## TS Source

- `src/multimedia-management`
- `src/services/media-storage-service.ts`
- `src/api/rest/media.ts`

## Main Services

- `src/multimedia-management/services/audio-model-service.ts`
- `src/multimedia-management/services/image-model-service.ts`

## Agent Tool Integration

Server-owned media agent tools live in `src/agent-tools/media` and reuse the
multimedia client factories/model catalogs for provider-specific execution.
The server-owned tool layer is responsible for agent-facing contracts,
runtime-specific projection, default-model resolution, media-local path
handling, and result shaping.

The active first-party agent tool names are:

- `generate_image`
- `edit_image`
- `generate_speech`

`generate_image` and `edit_image` accept `input_images` only as an optional
array of image-reference strings. A single reference should be passed as a
one-element array. String or comma-separated `input_images` input is not
accepted, including as a compatibility fallback, because data URIs can contain
commas and must stay intact as individual array entries.

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
