## What's New
- Added Codex Fast mode as a launch/runtime model configuration option for Codex models that advertise the `fast` speed tier.

## Improvements
- Codex Fast mode now persists through the existing model config path as `service_tier: "fast"` and remains separate from reasoning effort.
- Fast-mode configuration is applied when starting, restoring, and continuing Codex app-server threads.
- Runtime model configuration now supports non-thinking schema parameters instead of treating advanced model config as thinking-only.

## Fixes
- Removed stale Fast-mode config when switching to a model whose schema no longer supports it.
- Dropped unsupported Codex service-tier values before app-server requests are sent.
