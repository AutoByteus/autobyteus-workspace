# Investigation Notes: Remove Deprecated DeepSeek and Kimi Model Support

Status: Complete

## Investigation Scope

- Locate `autobyteus-ts` model identifiers and provider definitions for DeepSeek Chat, DeepSeek Reasoner, and Kimi 2.5.
- Identify tests, docs, and adjacent package references that must change to keep repository behavior consistent.
- Preserve non-target provider/model support.

## Current-State Findings

### Model registry and defaults

- `autobyteus-ts/src/llm/supported-model-definitions.ts` is the static built-in model catalog consumed by `LLMFactory`.
  - Contains target entries: `deepseek-chat`, `deepseek-reasoner`, `kimi-k2.5`.
  - Also contains retained entries: `deepseek-v4-flash`, `deepseek-v4-pro`, `kimi-k2.6`, `kimi-k2-thinking`.
- `autobyteus-ts/src/llm/api/deepseek-llm.ts` defaults to `deepseek-chat`; this would keep model support reachable even if the catalog entry is removed.
- `autobyteus-ts/src/llm/api/kimi-llm.ts` defaults to `kimi-k2.5` and includes `kimi-k2.5` in `KIMI_TOOL_SAFE_NON_THINKING_MODELS`.

### Metadata

- `autobyteus-ts/src/llm/metadata/curated-model-metadata.ts` has curated entries for all target identifiers.
- Kimi live metadata resolution can still return metadata for `kimi-k2.5`, but `LLMFactory` only resolves supported definitions; removing the definition stops built-in publication.

### Tests requiring updates

- `tests/unit/llm/api/kimi-llm.test.ts` covers Kimi normalization for `kimi-k2.5` and should be reduced to retained Kimi models.
- `tests/unit/llm/api/openai-compatible-llm.test.ts` expects the default `DeepSeekLLM` model to be `deepseek-chat`; this must change to a retained DeepSeek model.
- `tests/unit/llm/metadata/model-metadata-resolver.test.ts` uses `kimi-k2.5` as the live-metadata target; update it to a retained model or make removed model absence explicit elsewhere.
- `tests/integration/llm/llm-factory-metadata-resolution.test.ts` mocks and asserts `kimi-k2.5` as a built-in model; update it and add absence assertions for removed identifiers.
- Provider live integration tests currently use retained `deepseek-v4-flash` and `kimi-k2.6`; no target identifier removal needed there.

### Documentation requiring Stage 9 sync

- `docs/provider_model_catalogs.md` mentions `deepseek-chat`, `deepseek-reasoner`, and `kimi-k2.5` support.
- `docs/llm_module_design.md`, `docs/llm_module_design_nodejs.md`, and `docs/api_tool_call_streaming_design.md` mention Kimi 2.5 and/or examples using `deepseek-chat`.
- Historical tickets under `autobyteus-ts/tickets/**` mention these identifiers but are archived evidence; they should not be rewritten.

## Initial Impact Assessment

Scope is small/medium but cross-cutting across the model registry, provider defaults, metadata tests, and docs. The implementation should remove target identifiers from supported built-ins and defaults without deleting DeepSeek/Kimi provider classes, retained DeepSeek V4 support, retained Kimi 2.6/thinking support, or DeepSeek reasoning-content renderer behavior.
