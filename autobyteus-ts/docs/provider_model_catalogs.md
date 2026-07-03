# Provider Model Catalogs and Latest Model Support

This document records the long-lived ownership boundaries for built-in provider
model catalogs in `autobyteus-ts`. Keep it current when adding provider models
or changing provider-specific request-shaping behavior.

## Source-of-Truth Files

| Surface | Catalog / Metadata Source | Runtime / Request-Shape Owner | Notes |
| --- | --- | --- | --- |
| LLM API models | `src/llm/supported-model-definitions.ts` | Provider adapters under `src/llm/api/` | `LLMFactory` builds registry entries from supported definitions and metadata. |
| LLM metadata | `src/llm/metadata/curated-model-metadata.ts` | `src/llm/metadata/model-metadata-resolver.ts` | Add docs-backed context/output limits and verification dates for known API models. |
| Gemini LLM runtime names | `src/utils/gemini-model-mapping.ts` | `GeminiLLM` | Add API-key and Vertex mappings when Gemini LLM provider values differ or need explicit identity coverage. |
| Audio / TTS models | `src/multimedia/audio/audio-client-factory.ts` | `src/multimedia/audio/api/*` | Built-in TTS models are registered by the audio factory. |
| Gemini TTS runtime names | `src/utils/gemini-model-mapping.ts` | `GeminiAudioClient` | User-facing names can map to API-key and Vertex-specific model values. |
| Image models | `src/multimedia/image/image-client-factory.ts` | `src/multimedia/image/api/*` | Built-in image models are registered by the image factory. |
| Gemini image runtime names | `src/utils/gemini-model-mapping.ts` | `GeminiImageClient` | Official Gemini image IDs can map per API-key or Vertex runtime before request dispatch. |
| Video models | `src/multimedia/video/video-client-factory.ts` | `src/multimedia/video/api/*` | Built-in video models are registered by the video factory. |
| Gemini video runtime names | `src/utils/gemini-model-mapping.ts` | `GeminiVideoClient` | Gemini Omni video IDs map through the video modality before Interactions API request dispatch. |
| OpenAI image request shape | `src/multimedia/image/api/openai-image-client.ts` | `OpenAIImageClient` | Keep GPT Image vs. non-GPT image edit payload differences provider-owned. |

## Latest Catalog Additions

| Surface | User-Facing Model ID | Provider API Value | Provider | Verified On | Implementation Notes |
| --- | --- | --- | --- | --- | --- |
| LLM | `gpt-5.5` | `gpt-5.5` | OpenAI | 2026-04-25 | Uses the official OpenAI Responses path and the shared OpenAI reasoning schema. |
| LLM | `claude-opus-4.7` | `claude-opus-4-7` | Anthropic | 2026-04-25 | Uses adaptive-thinking schema; see request-shape notes below. |
| LLM | `deepseek-v4-flash` | `deepseek-v4-flash` | DeepSeek | 2026-04-25 | Uses the existing OpenAI-compatible DeepSeek adapter with a flat V4 thinking schema and adapter-owned provider request mapping. |
| LLM | `deepseek-v4-pro` | `deepseek-v4-pro` | DeepSeek | 2026-04-25 | Uses the existing OpenAI-compatible DeepSeek adapter with a flat V4 thinking schema and adapter-owned provider request mapping. |
| LLM | `gemini-3.5-flash` | `gemini-3.5-flash` | Gemini | 2026-05-20 | Uses the existing Gemini LLM adapter, shared Gemini thinking schema, explicit API-key/Vertex identity mapping, and docs-backed token-limit metadata. |
| LLM | `kimi-k2.6` | `kimi-k2.6` | Moonshot / Kimi | 2026-06-16 | General-purpose Kimi model; keeps K2.6-specific tool-workflow normalization. |
| LLM | `kimi-k2.7-code` | `kimi-k2.7-code` | Moonshot / Kimi | 2026-06-16 | Standard K2.7 Code serving route; always-on thinking and fixed sampling constraints are shared through the Kimi K2.7 policy and enforced in `KimiLLM`. |
| LLM | `kimi-k2.7-code-highspeed` | `kimi-k2.7-code-highspeed` | Moonshot / Kimi | 2026-06-26 | High-speed K2.7 Code serving route; distinct official provider ID that shares the Kimi K2.7 fixed sampling/tool policy. |
| LLM | `glm-5.2` | `glm-5.2` | Zhipu GLM | 2026-06-16 | Replaces `glm-5.1`; uses GLM thinking schema and adapter-owned request mapping. |
| LLM | `minimax-m3` | `MiniMax-M3` | MiniMax | 2026-06-24 | Replaces removed MiniMax M2.7 support; uses tiered pricing metadata and the MiniMax OpenAI-compatible adapter. |
| Image | `gpt-image-2` | `gpt-image-2` | OpenAI | 2026-04-25 | Supports generation and editing through `OpenAIImageClient`. |
| Image | `gemini-3.1-flash-lite-image` | `gemini-3.1-flash-lite-image` | Gemini | 2026-07-03 | Fast Gemini image generation model; registered in the image catalog and mapped identically for API-key and Vertex Gemini runtimes. |
| Image | `gemini-3.1-flash-image` | `gemini-3.1-flash-image` | Gemini | 2026-07-03 | Current Gemini 3.1 Flash Image / Nano Banana 2 model ID; replaces the shut-down preview catalog ID without an alias. |
| Image | `gemini-3-pro-image` | `gemini-3-pro-image` | Gemini | 2026-07-03 | Current Gemini 3 Pro Image model ID; replaces the shut-down preview catalog ID without an alias. |
| Video | `gemini-omni-flash-preview` | `gemini-omni-flash-preview` | Gemini | 2026-07-03 | Docs-backed registration for creation-only `text_to_video`, `image_to_video`, and `reference_to_video` through `GeminiVideoClient` and the Gemini Interactions API; live provider generation was not validated in the delivery environment. |
| Audio / TTS | `gemini-3.1-flash-tts-preview` | `gemini-3.1-flash-tts-preview` | Gemini | 2026-04-25 | Registered in audio catalog and Gemini runtime mapping. |
| Audio / TTS | `gemini-2.5-pro-tts` | `gemini-2.5-pro-preview-tts` | Gemini | 2026-04-25 | User-facing compact ID maps to the documented preview API value. |

## Frontend Schema-Default Display And Disclosure Contract

Runtime/model configuration UI is schema-driven. The frontend uses explicit
`llmConfig` first, then a valid schema default, to decide displayed control
values and the top-level **Thinking** state. Displaying a schema default does not
materialize it into `llmConfig`; only an explicit user action or an existing
apply-defaults flow may write a config value.

Editable primary/global agent and team launch configuration initializes
**Advanced** from effective **Thinking** state:

- effective **Thinking** ON -> **Advanced** opens by default;
- effective **Thinking** OFF or unavailable -> **Advanced** starts collapsed but
  remains openable; and
- toggling a supported **Thinking** control ON opens **Advanced** automatically.

Compact member override rows may remain collapsed for density. They should sync
inherited effective values/state with the global config, but not blindly inherit
the global expanded/collapsed disclosure state. Explicit member-local runtime or
model selections that resolve to an effective-ON model may open that member's
**Advanced** controls; displaying inherited/default values must not create member
`llmConfig` or `memberOverrides` entries.

Read-only historical runs are different: if backend metadata does not include a
recorded `llmConfig`, the frontend may show an explicit not-recorded state and
must not infer current catalog defaults as historical truth.

The **Thinking** row must reflect schema-backed provider semantics rather than
model/display names. Supported ON/OFF gates include `thinking_enabled`,
`thinking_type`, `include_thoughts`, `thinking_level`, `reasoning_summary`, and
`reasoning_effort` according to the provider schema shape. If a schema advertises
reasoning enabled by default but no supported off value, the UI may show an ON
read-only/non-disable-capable state, but it must not invent values such as
`reasoning_effort: "none"`. Catalog rows whose names contain `thinking` or
`reasoning` but expose no schema/default metadata must not get a guessed
**Thinking** state; provider or catalog owners should add machine-readable
metadata if that state should be visible.

## Runtime Config Composition Contract

Factory-created LLMs compose runtime configuration in one path:

```text
base `LLMConfig` defaults
-> `LLMModel.defaultConfig`
-> explicit user/run raw `llmConfig` overrides
-> provider/model invariant enforcement
-> request builder/provider SDK
```

`LLMFactory.createLLM(modelId, configInput?)` clones the selected model's
`defaultConfig` when one exists, otherwise it starts from a normal `LLMConfig`.
If `configInput` is already an `LLMConfig`, it is treated as an effective config
and merged over those defaults. If `configInput` is a plain run/default-launch
record, it is interpreted as a sparse override: missing standard fields do not
override model defaults, standard keys such as `temperature`, `top_p`,
`max_tokens`, penalties, and stop sequences become first-class `LLMConfig`
fields, and unknown provider-specific keys flow through `extraParams`.
Standard/reserved keys are filtered out of nested `extra_params`/`extraParams`
so they cannot accidentally override the first-class values later in request
construction.

Server/runtime boundaries should therefore pass persisted raw `llmConfig`
records directly to `LLMFactory`; they should not wrap those records as
`new LLMConfig({ extraParams: llmConfig })`. Provider adapters still own hard
invariants after composition. Catalog defaults are normal defaults unless the
provider adapter also enforces them as fixed constraints.

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

### OpenAI Responses Models

Official OpenAI text models such as `gpt-5.5` use the `OpenAIResponsesLLM` path
and the Responses API input-item history format. For native tool continuation,
the adapter requests `reasoning.encrypted_content` when tools or prior Responses
tool/reasoning items are present, merges that request with any caller-supplied
`include` entries, and replays captured `response.output` items exactly once
when available. This preserves provider-required reasoning items before their
matching `function_call` items while still using the normalized final
`ToolCallSpec` for call id, name, and arguments.

### DeepSeek V4

DeepSeek V4 models keep using the DeepSeek OpenAI-compatible Chat Completions
endpoint. The registered user-facing V4 schema exposes only flat, renderable
configuration keys:

- `reasoning_effort: "high" | "max"`.
- `thinking_type: "enabled" | "disabled"` with default `enabled`.

The schema must not expose the provider-native top-level `thinking` object to
UI/catalog consumers. In the frontend, the basic `Thinking` toggle owns visible
DeepSeek enable/disable state and reads the schema default, so default
`thinking_type: "enabled"` displays as **Thinking** on and opens **Advanced**.
Advanced renders `reasoning_effort` with its effective schema default (normally
`high`), not a second `Thinking Type` control. `DeepSeekLLM` owns the
request-shape conversion: it removes the flat `thinking_type` key, drops any
stale raw top-level or `extra_body.thinking` value supplied by callers, and
sends the provider switch as top-level `thinking.type`. When `thinking_type` is
`disabled`, the adapter omits `reasoning_effort` instead of sending an
OpenAI-style `reasoning_effort: "none"`.

No new DeepSeek transport path is required for these models.

Forced native tool choice remains provider/model dependent. The retained
DeepSeek V4 registrations should be validated against the provider's current
capability matrix before forcing `tool_choice: "required"`; if the provider
rejects forced tool choice, treat it as a model capability constraint rather
than a shared request-builder contract.

### Zhipu GLM 5.2

`glm-5.2` is the active built-in GLM model. Its catalog schema exposes flat,
renderable keys while `GlmLLM` owns provider-native conversion:

- `thinking_type: "enabled" | "disabled"` maps to top-level
  `thinking.type`;
- `reasoning_effort: "high" | "max"` defaults to `max` and is sent only
  while thinking is enabled; and
- `GlmLLM` removes the flat `thinking_type` key before calling the shared
  OpenAI-compatible request builder.

`glm-5.1` is no longer an active built-in model and must not be retained as an
alias or fallback row.

### Kimi K2.6

`kimi-k2.6` is retained as the general-purpose Kimi model and follows safe
request normalization for Moonshot tool workflows:

- when a request uses tools and the caller has not explicitly supplied a
  thinking override, the Kimi adapter sends `thinking: { type: "disabled" }` to
  avoid strict ordering errors in tool-call continuations;
- config-level/default temperatures are normalized to provider-safe values
  before the shared OpenAI-compatible request builder runs: tool workflows use
  `temperature: 0.6`, non-tool requests use `temperature: 1`, and explicit
  per-request `temperature` kwargs are preserved.

### Kimi K2.7 Code and HighSpeed

`kimi-k2.7-code` and `kimi-k2.7-code-highspeed` are both active built-in Kimi
K2.7 Code rows. They use distinct official provider identifiers/routes; the
HighSpeed row is the faster serving variant of the same K2.7 Code model family,
not an alias, fallback, or accidental duplicate. Keep both rows visible and do
not collapse either ID into the other.

The shared Kimi K2.7 family policy lives in
`src/llm/api/kimi-k2-7-code-policy.ts`. It owns the two model IDs, fixed
sampling constants, allowed tool-choice values, the family predicate used by
`KimiLLM`, and the default-config helper used by the catalog rows. Both catalog
rows seed the same provider-fixed defaults while preserving their separate
pricing metadata.

K2.7 Code variants use the same Kimi OpenAI-compatible endpoint but have
different request constraints from K2.6:

- the adapter never auto-injects `thinking: { type: "disabled" }` for K2.7
  Code because thinking is always on;
- the model default config starts from the provider-fixed
  `temperature: 1.0`, `top_p: 0.95`, `n: 1`, `presence_penalty: 0`, and
  `frequency_penalty: 0` values;
- explicit non-default fixed sampling controls are normalized to documented
  fixed values (`top_p: 0.95`, `n: 1`, `presence_penalty: 0`,
  `frequency_penalty: 0`); and
- unsupported forced tool choices for tool requests are normalized to `auto`.

`kimi-k2-thinking` is no longer an active built-in model and must not be
retained as an alias for K2.7 Code.

### MiniMax M3

`minimax-m3` is the active built-in MiniMax LLM entry. MiniMax M2.7 was removed
from supported model definitions and curated metadata without an alias or
compatibility fallback, so model-list/API surfaces should no longer expose
`minimax-m2.7` / `MiniMax-M2.7`.

MiniMax M3 keeps provider value `MiniMax-M3`, uses the MiniMax
OpenAI-compatible adapter, and carries docs-backed tiered pricing metadata. The
catalog expresses the standard tier up to 512k input tokens and the higher tier
above that threshold so server-side accounting can choose the trusted tier
instead of flattening provider-specific pricing.

### Gemini LLM Models

Gemini LLM catalog entries are registered in
`src/llm/supported-model-definitions.ts`, with docs-backed limits in
`src/llm/metadata/curated-model-metadata.ts`. Add an explicit LLM runtime
mapping in `src/utils/gemini-model-mapping.ts` so both API-key and Vertex modes
are covered by tests even when the provider value is currently identical.

`gemini-3.5-flash` is the supported Gemini 3.5 Flash LLM ID verified on
2026-05-20. It uses the exact same user-facing ID and provider API value for
API-key and Vertex runtimes, reuses the shared Gemini thinking schema
(`thinking_level` and `include_thoughts`), and reports curated limits of
1,048,576 input/context tokens and 65,536 output tokens. Its default pricing
configuration is the verified 2026-05-20 paid-tier rate of `1.5` input and
`9.0` output per 1M tokens.

Do not add aliases or compatibility wrappers for older preview IDs when adding
Gemini LLM models. Use the official model ID unless Google documents a distinct
Vertex-specific value.

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

### Gemini Image Models

Gemini image model registration and runtime mapping are separate in the same
way as Gemini TTS. Add the model to `ImageClientFactory` first, then add the
image modality mapping in `src/utils/gemini-model-mapping.ts` so
`GeminiImageClient` resolves the correct provider value for both API-key and
Vertex runtime modes.

As of the 2026-07-03 verification, the active built-in Gemini image IDs are
`gemini-3.1-flash-lite-image`, `gemini-3.1-flash-image`,
`gemini-3-pro-image`, and the retained legacy `gemini-2.5-flash-image`.
`gemini-3.1-flash-image-preview` and `gemini-3-pro-image-preview` were removed
from the built-in catalog without aliases after Google shut down those preview
IDs. The active IDs use the same provider API value for API-key and Vertex
runtimes and reuse the existing `GeminiImageClient` generation/editing request
path.

### Gemini Video Models

Gemini video model registration lives in `VideoClientFactory`, with runtime
mapping in `src/utils/gemini-model-mapping.ts`. `GeminiVideoClient` owns the
Gemini Omni Interactions API request shape, Files API polling/download, inline
base64 handling, and temporary download cleanup. Server media tools call the
video client boundary and must not call `@google/genai` directly.

`gemini-omni-flash-preview` is the docs-backed Gemini Omni Flash video model ID
checked on 2026-07-03. The current AutoByteus surface is creation-only:
`generation_config.task` accepts `text_to_video`, `image_to_video`, or
`reference_to_video`, with image/reference creation driven by `input_images`.
There is no current `edit_video`, uploaded/source-video editing,
`previous_interaction_id` continuation, audio-reference upload, or voice-editing
contract. Add those through a future explicit tool/schema expansion rather than
as permissive hidden fields on `generate_video`.

The exposed generation configuration is intentionally narrow: `task`,
`aspect_ratio`, `delivery`, `poll_interval_ms`, and `max_poll_ms`. Unsupported
provider controls such as temperature, top-p, negative prompts, audio
references, and voice editing must not be exposed unless Gemini documents
support for them. Do not treat the catalog row as proof of live Gemini
generation: the 2026-07-03 delivery probe could not validate live Interactions
generation with the available Vertex API-key-only credential mode.

## Defaults, Deprecations, and Removals

- Adding a newly supported provider model should not silently change default
  models unless a separate product decision explicitly calls for that.
- Deprecated provider identifiers should be removed by a dedicated
  deprecation/removal task rather than kept as hidden aliases.
- MiniMax M2.7 is intentionally removed; do not reintroduce it as a hidden alias,
  compatibility shim, or selectable fallback for MiniMax M3.
- Do not add fuzzy aliases for unverified model names. Prefer exact provider
  API values plus a single intentional user-facing ID when the project already
  uses a compact display convention.

## Pricing Metadata Contract

Built-in LLM price metadata lives on `LLMConfig.pricingConfig` and is consumed by
server-side token usage accounting. Pricing metadata can include:

- currency, including non-USD provider billing such as CNY-denominated GLM
  prices;
- trusted input/output prices per million tokens;
- optional trusted cache-read and cache-write prices, including provider
  subtypes such as Anthropic 5-minute and 1-hour cache creation prices;
- provider source/effective-date identifiers; and
- input-token tier rows with tier-specific input/output/cache prices.

Missing price dimensions must remain untrusted rather than being represented as
free. When provider pricing is regional, ambiguous, quota-specific, or otherwise
not safely represented by a single catalog value, leave the pricing dimension
missing and let server summaries surface `price_missing` or
`partial_price_missing`.

Pricing metadata is a policy input, not a frontend display shortcut. The server
selects a pricing policy by provider/model/runtime and applies it to normalized
component tokens (`standard_input`, `cache_read_input`, cache write subtypes,
output, and reasoning/billable output). Custom OpenAI-compatible endpoints must
not inherit trusted zero pricing by default; they need explicit trusted pricing
or they surface `price_missing`. Local runtimes such as Ollama and LM Studio
should use `local_no_api_bill` status when there is no provider API bill rather
than pretending a remote paid model cost is `$0`.

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
