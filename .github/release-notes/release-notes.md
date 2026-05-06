# Release Notes — remove-media-output-path-restriction

## Improvements

- Server-owned `generate_image`, `edit_image`, and `generate_speech` can now save generated media to explicit absolute local paths outside the active workspace when the server process can write there.
- `generate_image` and `edit_image` local `input_images` now accept absolute filesystem paths and `file:` URLs for existing files readable by the server process.
- `edit_image.mask_image` now follows the same local input policy, so masks can live in task-specific folders outside the active workspace.

## Fixes

- Fixed the common generate-then-edit workflow where an image generated to an external absolute path could not be reused as a later `edit_image` input.
- Updated media tool descriptions and durable docs so they no longer advertise the old workspace/Downloads/system-temp allowlist for server-owned media paths.

## Compatibility / Migration Notes

- Relative media paths still resolve inside the active workspace, and relative traversal outside that workspace remains rejected.
- URL and data URI image references continue to pass through unchanged.
- Normal OS/runtime filesystem permissions remain the final authority for local media reads and writes.
- The generic safe-path helper remains unchanged for unrelated tools.
