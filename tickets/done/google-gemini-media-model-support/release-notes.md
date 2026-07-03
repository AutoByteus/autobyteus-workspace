## What's New
- Added server-owned `generate_video` support for Gemini Omni Flash video creation, including text-to-video and image/reference-image-to-video tasks.
- Added video model catalog/default-model settings surfaces so Gemini video models can appear alongside LLM, image, and audio models.

## Improvements
- Video outputs now participate in generated-output artifact tracking for local and Agent Tools MCP media calls.
- Media docs now clarify the creation-only video contract and future boundary for editing/source-video/stateful flows.
- Updated built-in Gemini image catalog entries to current non-preview IDs without adding hidden aliases.

## Notes
- Live Gemini generation was not validated in this delivery environment; the available Vertex API-key-only credential mode was rejected by the Gemini Interactions endpoint. Use supported credentials before claiming live provider success.
