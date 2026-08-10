## What's New

- Agent tools now use provider-native API tool calls exclusively. Legacy XML,
  JSON-text, sentinel-text, and `[TOOL_CALL]` invocation modes and the Streaming
  Parser setting have been removed.

## Improvements

- Background agents and teams now avoid unrelated renderer work through
  transition-only status presentation, bounded Event Monitor updates, and a
  cached indexed Workspaces navigation projection.
- Files, Teams, Workspaces, image paste, voice startup, task hierarchy, and
  progressive rich Markdown remain responsive while many background streams
  are active.
- Image generation now has bounded operation deadlines, cancellation-safe
  artifact publication, and deterministic recovery for interrupted native tool
  calls instead of allowing late results to overwrite newer work.

## Fixes

- Fixed the Workspaces sidebar incorrectly showing an empty state after startup
  or reload even though saved workspaces were returned by the backend.
- Fixed repeated identical status traffic and unrelated background stream events
  causing avoidable UI projection and navigation work.
- Fixed stalled or interrupted image generation leaving tool calls pending or
  reporting success after timeout or cancellation.

## Compatibility

- Existing workspaces, run history, settings, traces, and attachments remain
  directly usable without migration or backfill.
- External consumers of the intentionally removed legacy text-tool parser
  exports must move to provider-native tool schemas and call/result history.
