## What's New
- Added reliable direct Gemini support for `.m4a` audio returned by `read_media_file` so audio tool results are sent to Gemini as media input instead of text-only context.

## Improvements
- Unified media file classification for image, audio, and video paths so context-file handling and provider payload rendering share the same supported extension policy.
- Added env-gated live Gemini coverage for the `.m4a` path with a synthetic spoken fixture and response assertion.

## Fixes
- Fixed direct Gemini request rendering for local `.m4a` files by sending `inlineData` with `audio/mp4` MIME data.
- Fixed silent media drops by failing declared media conversion errors before provider invocation.
