# Release Notes — Faster API Key Management And Provider-Local Model Discovery

## Improvements

- API Key Management now renders provider navigation and credential controls without waiting for external model discovery.
- Static provider models are available immediately from local registries and no longer show a misleading Reload action.
- AutoByteus, Ollama, LM Studio, and custom provider discovery is isolated to the selected provider, with provider-local loading, Retry, and Reload states.
- Current model rows remain visible during refresh, while partial, stale, unavailable, and authoritative-empty states are presented distinctly.
- AutoByteus gateway hosts are attempted concurrently with a bounded per-host deadline and deterministic partial results.

## Fixes

- Saving credentials no longer waits for or reports failure from unrelated model discovery.
- Changing an AutoByteus, Ollama, or LM Studio endpoint now clears and converges only the affected provider, including same-authority scheme/path/query changes.
- Persisted dynamic model selections can ensure their exact provider after restart without requiring a prior visit to API Key Management.
- Custom provider creation seeds its discovered rows immediately; deletion removes only that provider's credential, metadata, lifecycle, and models.
- Removed obsolete aggregate/global model queries and Reload operations instead of retaining compatibility aliases.

## Operational Notes

- No persisted-data migration or rebuild is required; existing credential, endpoint, custom-provider, and model-identifier representations remain directly usable.
- Current built-in GLM uses `glm-5.3`; Qwen's separate `qwen:glm-5.2` selection remains supported and continues to route raw `glm-5.2` to Qwen.
