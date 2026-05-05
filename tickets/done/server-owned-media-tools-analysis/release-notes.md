## What's New
- Added server-owned media generation tools for AutoByteus, Codex, and Claude so `generate_image`, `edit_image`, and `generate_speech` are managed consistently by the server runtime.
- Added Settings controls for default image, image-edit, and speech models used by media tools.
- Added a team communication messages UI with readable message details and referenced artifact/file context.

## Improvements
- Improved generated media output handling so image and speech results are surfaced as file changes across runtimes.
- Improved artifact/reference handling for team messages and published artifacts.
- Improved team message readability and spacing in the desktop/web UI.

## Fixes
- Fixed media image input handling around `input_images` by using a single array-shaped contract across runtime projections.
- Fixed generated-output normalization for Claude MCP media tool calls.
- Fixed several team communication UI edge cases around nested controls and reference viewing.
