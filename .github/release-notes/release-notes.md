## What's New

- Alibaba/Qwen is now a native configurable provider. Settings can validate and
  save a Qwen-compatible Base URL and API key, and the built-in catalog includes
  `qwen3.8-max`, DeepSeek V4 Pro, DeepSeek V4 Flash 0731, and GLM-5.2.
- Qwen-hosted DeepSeek and GLM models use friendly `(Qwen)` labels while retaining
  collision-safe internal selectors and exact provider request values.

## Improvements

- Custom OpenAI-compatible providers now use deterministic readable identities
  derived from their canonical names instead of opaque UUID-based selectors.
- Provider and model context metadata now remains explicit through selection,
  persistence, launch, resume, token usage, and provider routing boundaries.
- Qwen endpoint configuration is persisted through the application-owned config
  path and restored on restart without requiring a process-level override.

## Fixes

- Fixed ambiguous duplicate model labels when Qwen and direct DeepSeek or GLM
  providers expose the same underlying model value.
- Fixed stale or missing model selections being silently relabeled or replaced;
  unavailable selectors remain visible and block launch until repaired.
- Fixed legacy custom-provider credentials and UUID aliases surviving the
  readable-identity transition.

## Compatibility And Migration

- Existing built-in-provider settings and ordinary non-Qwen model selections
  remain compatible.
- On first startup after upgrading, legacy custom providers are intentionally
  reset. Recreate each desired custom provider with its prior name and Base URL
  and enter a new API key. Legacy keys are not copied forward.
- Missing migrated selections remain visible as unavailable. Recreate the
  provider with the same canonical name or manually choose a replacement model.
