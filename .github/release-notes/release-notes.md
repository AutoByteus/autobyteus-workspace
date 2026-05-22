# Release Notes: Context File Reference Paths

## What's New
- Attached context files now add a `Reference files:` section to the runtime-visible user message when the server can resolve them to local absolute paths.

## Improvements
- Native AutoByteus, Codex, and Claude runs can expose the same resolved context-file paths in message text, making follow-up agent handoffs and validation easier.
- Native AutoByteus and Codex keep their existing multimodal/image payload behavior while also showing the text references.

## Notes
- Absolute server-side file paths are intentionally visible to the selected runtime/model provider for resolved local context files.
- HTTP/data URLs and unresolved context-file locators are omitted from `Reference files:` so they are not mistaken for local files.
