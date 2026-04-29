# Provider Model Catalogs and Latest Model Support

This document records the long-lived ownership boundaries for built-in provider
model catalogs in `autobyteus-ts`. Keep it current when adding provider models
or changing provider-specific request-shaping behavior.

## Source-of-Truth Files

| Surface | Catalog / Metadata Source | Runtime / Request-Shape Owner | Notes |
| --- | --- | --- | --- |
| LLM API models | `src/llm/supported-model-definitions.ts` | Provider adapters under `src/llm/api/` | `LLMFactory` builds registry entries from supported definitions and metadata. |
| LLM metadata | `src/llm/metadata/curated-model-metadata.ts` | `src/llm/metadata/model-metadata-resolver.ts` | Add docs-backed context/output limits and verification dates for known API models. |
| Audio / TTS models | `src/multimedia/audio/audio-client-factory.ts` | `src/multimedia/audio/api/*` | Built-in TTS models are registered by the audio factory. |
| Gemini TTS runtime names | `src/utils/gemini-model-mapping.ts` | `GeminiAudioClient` | User-facing names can map to API-key and Vertex-specific model values. |
| Image models | `src/multimedia/image/image-client-factory.ts` | `src/multimedia/image/api/*` | Built-in image models are registered by the image factory. |
| OpenAI image request shape | `src/multimedia/image/api/openai-image-client.ts` | `OpenAIImageClient` | Keep GPT Image vs. non-GPT image edit payload differences provider-owned. |

## Latest Catalog Additions Verified On 2026-04-25

| Surface | User-Facing Model ID | Provider API Value | Provider | Implementation Notes |
| --- | --- | --- | --- | --- |
| LLM | `gpt-5.5` | `gpt-5.5` | OpenAI | Uses the official OpenAI Responses path and the shared OpenAI reasoning schema. |
| LLM | `claude-opus-4.7` | `claude-opus-4-7` | Anthropic | Uses adaptive-thinking schema; see request-shape notes below. |
| LLM | `deepseek-v4-flash` | `deepseek-v4-flash` | DeepSeek | Uses the existing OpenAI-compatible DeepSeek adapter and V4 thinking schema. |
| LLM | `deepseek-v4-pro` | `deepseek-v4-pro` | DeepSeek | Uses the existing OpenAI-compatible DeepSeek adapter and V4 thinking schema. |
| LLM | `kimi-k2.6` | `kimi-k2.6` | Moonshot / Kimi | Uses the existing Kimi OpenAI-compatible adapter. |
| Image | `gpt-image-2` | `gpt-image-2` | OpenAI | Supports generation and editing through `OpenAIImageClient`. |
| Audio / TTS | `gemini-3.1-flash-tts-preview` | `gemini-3.1-flash-tts-preview` | Gemini | Registered in audio catalog and Gemini runtime mapping. |
| Audio / TTS | `gemini-2.5-pro-tts` | `gemini-2.5-pro-preview-tts` | Gemini | User-facing compact ID maps to the documented preview API value. |

## Provider-Specific Runtime Notes

### Anthropic Claude Opus 4.7

Claude Opus 4.7 must not reuse the older fixed-budget extended-thinking
request shape. The built-in `claude-opus-4.7` schema exposes adaptive thinking:

- `thinking_enabled: true` maps to `thinking: { type: "adaptive" }`.
- `thinking_display: "summarized"` adds `display: "summarized"`.
- The adapter does not inject its usual default `temperature` when calling
  Opus 4.7.

Callers should not pass provider-invalid non-default sampling parameters for
this model unless Anthropic documents support for them.

### DeepSeek V4

DeepSeek V4 models keep using the DeepSeek OpenAI-compatible Chat Completions
endpoint. The registered V4 schema exposes:

- `reasoning_effort: "high" | "max"`.
- `thinking: { type: "enabled" | "disabled" }`.

No new DeepSeek transport path is required for these models.

### Kimi K2.6

`kimi-k2.6` follows the same safe tool-workflow normalization as `kimi-k2.5`:
when a request uses tools and the caller has not explicitly supplied a
thinking override, the Kimi adapter sends `thinking: { type: "disabled" }` to
avoid strict ordering errors in tool-call continuations.

### OpenAI GPT Image 2

`gpt-image-2` is registered separately from `gpt-image-1.5` because its option
surface differs. `OpenAIImageClient` owns the request-shape split:

- GPT Image edit requests use the current SDK file-array payload shape.
- GPT Image edit requests can forward supported `quality`,
  `output_format`, and `output_compression` options.
- Non-GPT / DALL-E edit requests retain the single-file payload shape and do
  not receive GPT-only fields.

### Gemini TTS

Gemini TTS model registration and runtime mapping are separate. Add the model
to `AudioClientFactory` first, then add any API-key or Vertex-specific mapping
to `resolveGeminiRuntimeModelName` through `src/utils/gemini-model-mapping.ts`.

## Defaults, Deprecations, and Removals

- Adding a newly supported provider model should not silently change default
  models unless a separate product decision explicitly calls for that.
- Existing DeepSeek and Kimi identifiers remain available until a dedicated
  deprecation/removal task removes them.
- Do not add fuzzy aliases for unverified model names. Prefer exact provider
  API values plus a single intentional user-facing ID when the project already
  uses a compact display convention.

## Validation and Secret Hygiene

- Unit tests should cover catalog membership, metadata resolution, provider
  request payloads, and runtime mappings for newly added models.
- Credential-gated integration tests should use `.env.test` without printing
  secret values. Missing, invalid, quota-blocked, or model-access-blocked
  credentials should be recorded as provider-access skips rather than catalog
  failures.
- `.env.test` is intentionally ignored/untracked and must not be committed or
  copied into artifacts.

## Maintenance Checklist for Future Model Additions

1. Re-check current official provider documentation before coding because
   model availability changes quickly.
2. Add the model to the owned catalog file for its surface.
3. Add curated metadata and pricing when the LLM path uses metadata-based
   context/cost reporting.
4. Keep provider-specific request-shape rules inside the provider adapter.
5. Add deterministic unit coverage and minimal credential-gated integration
   coverage when credentials are available.
6. Update this document and any affected module-design docs before delivery.
