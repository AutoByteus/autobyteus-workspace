## What's New

- Codex turns now continue normally after retryable provider-stream errors instead of being falsely marked failed.

## Improvements

- Retry diagnostics remain visible while subsequent reasoning, tools, assistant output, and completion continue through live and replay views.
- Stale terminal events from an older Codex turn no longer settle a newer active turn.

## Fixes

- Use the Codex App Server `willRetry` signal to distinguish retry diagnostics from real terminal errors.
- Preserve reasoning and tool correlation across retry diagnostics while retaining existing cleanup for non-retryable and runtime failures.
