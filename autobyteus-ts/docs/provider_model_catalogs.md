# Provider Model Catalogs and Latest Model Support

This document records the long-lived ownership boundaries for built-in provider
model catalogs in `autobyteus-ts`. Keep it current when adding provider models
or changing provider-specific request-shaping behavior.

## Source-of-Truth Files

| Surface | Catalog / Metadata Source | Runtime / Request-Shape Owner | Notes |
| --- | --- | --- | --- |
| LLM API models | `src/llm/supported-model-definitions.ts` | Provider adapters under `src/llm/api/` | Each definition owns static numeric limits, multimodal capabilities, and provenance; `LLMFactory` explicitly maps resolved runtime fields. |
| LLM static metadata | `staticMetadata` on each supported definition, with helpers in `src/llm/supported-model-static-metadata.ts` | `src/llm/metadata/model-metadata-resolver.ts` and `src/llm/metadata/openai-compatible-endpoint-model-metadata.ts` | Built-ins resolve live values over static definitions field-by-field. Custom endpoints resolve advertised live values, exact built-in-value inference, then unknown. `activeContextTokens` remains dynamic and is not resolved here. |
| LLM media capability/recovery | `src/llm/multimodal-capabilities.ts`, `src/llm/utils/media-input-sanitizer.ts` | `LLMRequestAssembler`, `LlmPhase`, and `MemoryManager` | Capability filtering and empty-media validation happen on a provider-facing message copy; failed request preparation/streaming rolls back without automatic retry. |
| Gemini LLM runtime names | `src/utils/gemini-model-mapping.ts` | `GeminiLLM` | Add API-key and Vertex mappings when Gemini LLM provider values differ or need explicit identity coverage. |
| Audio / TTS models | `src/multimedia/audio/audio-client-factory.ts` | `src/multimedia/audio/api/*` | Built-in TTS models are registered by the audio factory. |
| Gemini TTS runtime names | `src/utils/gemini-model-mapping.ts` | `GeminiAudioClient` | User-facing names can map to API-key and Vertex-specific model values. |
| Image models | `src/multimedia/image/image-client-factory.ts` | `src/multimedia/image/api/*` | Built-in image models are registered by the image factory. |
| Gemini image runtime names | `src/utils/gemini-model-mapping.ts` | `GeminiImageClient` | Official Gemini image IDs can map per API-key or Vertex runtime before request dispatch. |
| Video models | `src/multimedia/video/video-client-factory.ts` | `src/multimedia/video/api/*` | Built-in video models are registered by the video factory. |
| Gemini video runtime names | `src/utils/gemini-model-mapping.ts` | `GeminiVideoClient` | Gemini Omni video IDs map through the video modality before Interactions API request dispatch. |
| OpenAI image request shape | `src/multimedia/image/api/openai-image-client.ts` | `OpenAIImageClient` | Keep GPT Image vs. non-GPT image edit payload differences provider-owned. |

## Custom OpenAI-Compatible Model Metadata

Saved custom OpenAI-compatible providers use the `/models` discovery response
as a bounded, secret-free model catalog. The discovery owner accepts the usual
`data` or `models` arrays, extracts a model ID from `id`, `name`, or `model`,
and recognizes only positive integer aliases for context, input, and output
limits. Duplicate model rows merge missing recognized fields; raw response
objects and API keys are never persisted or projected into `ModelInfo`.

Each numeric field resolves independently using this precedence:

1. endpoint-advertised metadata (`live`);
2. an exact `SupportedModelDefinition.value` match as an explicitly inferred
   fallback (`inferred_builtin`); and
3. `unknown` with a null value.

The resolver receives no endpoint URL and applies no endpoint/region/plan
profile or provider-wire alias. No suffix stripping, family/substring matching,
display-name matching, case folding, or nearest-model inference is allowed.
The server exposes only numeric limits and the coarse GraphQL provenance values
`LIVE`, `CURATED_FALLBACK`, or `CURATED_ONLY`; it does not expose raw payloads
or credentials.

## Latest Catalog Additions

| Surface | User-Facing Model ID | Provider API Value | Provider | Verified On | Implementation Notes |
| --- | --- | --- | --- | --- | --- |
| LLM | `gpt-5.6-sol` | `gpt-5.6-sol` | OpenAI | 2026-07-30 | Exact limited-preview ID; uses the Responses path, GPT-5.6 reasoning schema, 1.05M-token metadata, and current tiered cache-read/cache-write-aware pricing effective 2026-07-30. |
| LLM | `gpt-5.6-terra` | `gpt-5.6-terra` | OpenAI | 2026-07-30 | Exact limited-preview ID; uses the Responses path, GPT-5.6 reasoning schema, 1.05M-token metadata, and current tiered cache-read/cache-write-aware pricing effective 2026-07-30. |
| LLM | `gpt-5.6-luna` | `gpt-5.6-luna` | OpenAI | 2026-07-30 | Exact limited-preview ID; uses the Responses path, GPT-5.6 reasoning schema, 1.05M-token metadata, and current tiered cache-read/cache-write-aware pricing effective 2026-07-30. |
| LLM | `gpt-5.5` | `gpt-5.5` | OpenAI | 2026-04-25 | Uses the official OpenAI Responses path and the shared OpenAI reasoning schema. |
| LLM | `grok-4.5` | `grok-4.5` | xAI / Grok | 2026-07-09 | Sole built-in Grok row; uses xAI Chat Completions, always-on low/medium/high reasoning (default high), 500k-token curated context metadata, and source-dated cache-aware pricing. |
| LLM | `claude-fable-5` | `claude-fable-5` | Anthropic | 2026-07-07 | High-cost catalog-available model; uses adaptive-thinking request policy, standard cache-aware pricing, and Fable data-retention/cost caveats below. |
| LLM | `claude-opus-5` | `claude-opus-5` | Anthropic | 2026-07-31 | Exact API ID; standard pricing is effective 2026-07-24, with 1M context / 128k output metadata and the adaptive-thinking/no-sampling request policy. |
| LLM | `claude-opus-4.8` | `claude-opus-4-8` | Anthropic | 2026-07-07 | Retained latest Opus row; uses the current adaptive-thinking/no-sampling request policy. |
| LLM | `claude-sonnet-5` | `claude-sonnet-5` | Anthropic | 2026-07-07 | Latest Sonnet row; exact provider ID only, with no `claude-sonnet-4.8` alias. |
| LLM | `claude-opus-4.7` | `claude-opus-4-7` | Anthropic | 2026-04-25 | Uses adaptive-thinking schema; see request-shape notes below. |
| LLM | `deepseek-v4-flash` | `deepseek-v4-flash` | DeepSeek | 2026-04-25 | Uses the existing OpenAI-compatible DeepSeek adapter with a flat V4 thinking schema and adapter-owned provider request mapping. |
| LLM | `deepseek-v4-pro` | `deepseek-v4-pro` | DeepSeek | 2026-04-25 | Uses the existing OpenAI-compatible DeepSeek adapter with a flat V4 thinking schema and adapter-owned provider request mapping. |
| LLM | `qwen3.8-max` | `qwen3.8-max` | Qwen / Alibaba | 2026-08-06 | Native Qwen offering with source-dated 1M context metadata; input/output limits remain unknown. |
| LLM | `DeepSeek V4 Pro (Qwen)` | `deepseek-v4-pro` | Qwen / Alibaba | 2026-08-06 | Friendly live-catalog label with collision-safe identifier `qwen:deepseek-v4-pro`, exact unprefixed provider value, and 1M context metadata; no alias or producer field. |
| LLM | `DeepSeek V4 Flash 0731 (Qwen)` | `deepseek-v4-flash-0731` | Qwen / Alibaba | 2026-08-06 | Friendly live-catalog label with collision-safe identifier `qwen:deepseek-v4-flash-0731`, exact unprefixed provider value, and 1M context metadata; no alias or producer field. |
| LLM | `GLM-5.2 (Qwen)` | `glm-5.2` | Qwen / Alibaba | 2026-08-06 | Friendly live-catalog label with collision-safe identifier `qwen:glm-5.2`, exact unprefixed provider value, and conservative 198k context metadata; no alias or producer field. |
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

## xAI Grok 4.5

`grok-4.5` is the only built-in Grok model. It keeps the existing xAI
OpenAI-compatible Chat Completions endpoint at `https://api.x.ai/v1`, including
streaming and function-tool calls. The model always reasons and accepts only
`reasoning_effort: low | medium | high`, defaulting to `high`; `none` is not a
supported value.

The Grok adapter strips xAI-invalid `presence_penalty`, `frequency_penalty`,
and `stop` request fields, including their snake_case and camelCase/raw stop
spellings, before the shared compatible request builder runs. Provider-safe
extra parameters, tools, `tool_choice`, and stream controls remain supported.

The catalog records `$2.00` input, `$6.00` output, and `$0.50` cached-input-read
pricing per million tokens effective 2026-07-08. Curated metadata records a
500,000-token context limit verified 2026-07-09; no maximum output limit is
asserted without official evidence.

`grok-4.3` and `grok-build-0.1` were intentionally removed from active support
without aliases, redirect fallbacks, or compatibility wrappers. The retired
`grok-code-fast-1` identifier has no active catalog/runtime/docs support or
alias; only a labeled absence assertion and historical ticket/audit evidence
may mention it.

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

## Provider Request Kwarg Boundary

Agent/runtime invocation kwargs can contain AutoByteus-internal coordination
fields. External provider SDK payloads must filter those fields at the provider
request boundary rather than asking upstream callers to know each provider's
wire contract.

`src/llm/api/provider-request-kwargs.ts` owns the shared internal kwarg deny-list
for external provider requests: `logicalConversationId`,
`logical_conversation_id`, `conversationId`, `agentId`, `turnId`, `requestId`,
and `renderedPayload`. It drops null/undefined values and lets each adapter name
its own controlled request fields such as `stream`, `tools`, or `tool_choice`.

`logicalConversationId` remains required for `AutobyteusLLM` hosted/browser
conversations. The filtering rule applies when requests leave AutoByteus for
external providers such as Anthropic, Mistral, or OpenAI-compatible endpoints.
Do not remove the internal kwarg from `LlmPhase` to fix an external provider
request error.

## Provider-Specific Runtime Notes

### Current Anthropic Claude models

The built-in Anthropic catalog is static. Provider-scoped reload does not
discover new Anthropic API model IDs; it returns the existing static Anthropic
count until `src/llm/supported-model-definitions.ts` is updated.

The active current-model rows are `claude-opus-5`, `claude-fable-5`,
`claude-opus-4.8`, `claude-opus-4.7`, `claude-sonnet-5`, and retained
`claude-sonnet-4.6`. Opus 5 uses the exact provider API value
`claude-opus-5`, with standard pricing effective 2026-07-24 and model limits
verified 2026-07-31 against the [Claude models overview](https://platform.claude.com/docs/en/about-claude/models/overview).
Do not add `claude-sonnet-4.8` unless Anthropic publishes that exact API ID.

Claude Opus 5, Claude Opus 4.8, Claude Opus 4.7, Claude Sonnet 5, and Claude Fable 5 must not
reuse the older fixed-budget extended-thinking request shape. Their built-in
schemas expose adaptive thinking:

- `thinking_enabled: true` maps to `thinking: { type: "adaptive" }`.
- `thinking_display: "summarized"` adds `display: "summarized"`.
- The adapter does not send schema-generated fixed budgets and strips
  provider-invalid manual `thinking: { type: "enabled", budget_tokens: ... }`
  for these models.
- The adapter does not inject its usual default `temperature` and removes
  `temperature`, `top_p`, and `top_k` request fields for these models.

Claude Opus 5 standard pricing is input `$5`, output `$25`, cache read `$0.50`,
5-minute cache write `$6.25`, and 1-hour cache write `$10` per million tokens.
Anthropic Fast mode is a separate processing price (input `$10`, output `$50`)
and remains explicitly outside this standard catalog row; the catalog does not
infer Fast mode without a processing-mode identity.

Claude Fable 5 is catalog-available only; it is not a default or fallback.
It carries standard pricing of `$10` input / `$50` output per MTok plus
Anthropic prompt-cache dimensions, is materially more expensive than Opus 4.8,
and has Fable-specific caveats such as 30-day data-retention requirements and
refusal behavior. Add fallback/UX handling only through a separate product
decision.

### OpenAI Responses Models

Official OpenAI text models such as `gpt-5.5`, `gpt-5.6-sol`,
`gpt-5.6-terra`, and `gpt-5.6-luna` use the `OpenAIResponsesLLM` path and the
Responses API input-item history format. The three GPT-5.6 rows preserve their
exact provider IDs; do not add the unsuffixed `gpt-5.6` alias as a fourth
selectable row. Their family-specific schema exposes reasoning efforts `none`,
`low`, `medium`, `high`, `xhigh`, and `max`, with `medium` as the default,
without advertising `max` on older OpenAI rows. Curated metadata records a
`1,050,000`-token context window and `128,000`-token maximum output for each of
the three exact IDs.

For native tool continuation, the adapter requests `reasoning.encrypted_content`
when tools or prior Responses tool/reasoning items are present, merges that
request with any caller-supplied `include` entries, and replays captured
`response.output` items exactly once when available. This preserves
provider-required reasoning items before their matching `function_call` items
while still using the normalized final `ToolCallSpec` for call id, name, and
arguments.

OpenAI usage normalization keeps gross input semantics and maps a non-negative
`cache_write_tokens` value from `input_tokens_details` or
`prompt_tokens_details` into the generic `cache_creation_input_tokens`
component. A top-level value is only a shared external-shape fallback. The
server remains the pricing owner, and the frontend consumes the resulting
generic cache-write token, unit-price, and cost fields without an OpenAI-specific
branch.

Built-in catalog visibility is entitlement-neutral. Verification on 2026-07-10
confirmed that the available OpenAI credential was valid but not entitled to
any of the three exact GPT-5.6 IDs: each minimal Responses request returned the
limited-preview `model_not_found` result. Catalog support therefore does not
claim a successful live invocation or an observed provider payload containing
real `cache_write_tokens`; repeat that smoke with an entitled account when one
is available.

#### Direct OpenAI API vs. Codex app-server usage

The direct OpenAI API and Codex app-server are separate token-usage source
contracts. The direct Responses/compatible path above can normalize a reported
`cache_write_tokens` quantity. By contrast, the Codex app-server protocol
verified on 2026-07-10 exposes total, input, cached-input, output, and reasoning
token counts, but no cache-write count. Codex `cachedInputTokens` is a cache-read
quantity only; the uncached remainder must not be relabeled as cache creation.

For current Codex events, `cache_creation_input_tokens` therefore stays
unknown/null. A trusted GPT-5.6 cache-write unit price alone must not create a
write token count, cost, or frontend row. Source-field conclusions must use the
upstream `tokenUsage` object and retained `raw_usage_json`; enriched
`raw_event_json` may contain AutoByteus-added canonical reconciliation metadata
with a null write value and is not proof that Codex emitted such a field.

Re-generate the supported Codex protocol before adding a future write mapping.
If an official field appears, review its `total`/`last` cumulative semantics at
the Codex runtime adapter boundary instead of adding speculative aliases or
reusing the direct OpenAI normalizer.

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
`src/llm/supported-model-definitions.ts`, with docs-backed limits and
capabilities in each definition's `staticMetadata` (helpers live in
`src/llm/supported-model-static-metadata.ts`). Add an explicit LLM runtime
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

#### Native Gemini image output controls

The image catalog is also the durable owner of the model-specific image output
schema. `ImageClientFactory` defines each native Gemini model's
`parameterSchema`; `media-tool-parameter-schemas.ts` projects that metadata as
the optional `generation_config` object on both `generate_image` and
`edit_image`. `GeminiImageClient` owns the provider request-shape conversion.
The supported catalog matrix verified on 2026-07-29 is:

| Model | `generation_config.aspect_ratio` | `generation_config.image_size` |
| --- | --- | --- |
| `gemini-3.1-flash-image` | `1:1`, `1:4`, `1:8`, `2:3`, `3:2`, `3:4`, `4:1`, `4:3`, `4:5`, `5:4`, `8:1`, `9:16`, `16:9`, `21:9` | `512`, `1K`, `2K`, `4K` |
| `gemini-3.1-flash-lite-image` | The same 14-value allowlist, including `1:4`, `1:8`, `4:1`, and `8:1` | `1K` only |
| `gemini-3-pro-image` | Standard 10-value allowlist: `1:1`, `2:3`, `3:2`, `3:4`, `4:3`, `4:5`, `5:4`, `9:16`, `16:9`, `21:9` | `1K`, `2K`, `4K` |
| `gemini-2.5-flash-image` | Standard 10-value allowlist | No configurable size |

The tool uses repository snake_case names. With the installed
`@google/genai` Generate Content SDK, `GeminiImageClient` removes those tool
keys from the direct config and sends them as
`config.imageConfig.aspectRatio` and `config.imageConfig.imageSize`. This is
the current SDK serialization boundary; do not document or reintroduce the
older `responseFormat.image` spelling. When neither value is provided, the
existing provider-default behavior is preserved. Generation and editing share
this normalization, while reference-image assembly and response extraction
remain in the existing client path.

The 2026-07-29 provider-doc review retains a known documentation discrepancy:
Google's Gemini 3.1 Flash Lite model page claims a discrete set of 14 aspect
ratios but its visible bullet list contains ten standard values. The catalog
keeps the full 14-value allowlist based on the provider capability statement,
the Generate Content guide, and live 1:4/4:1 validation; it remains
conservative at 1K because the same model page and guide prose state that 2K
and 4K are unsupported. Refresh this section and the schema matrix if Google
resolves or changes that discrepancy.

Provider references (rechecked 2026-07-29): [Gemini image generation guide](https://ai.google.dev/gemini-api/docs/image-generation),
[Gemini 3.1 Flash Image model](https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-image),
and [Gemini 3.1 Flash Lite Image model](https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite-image).

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

Anthropic Claude rows use standard first-party Claude API pricing in the static
catalog, not Batch API, Opus Fast Mode, data-residency premiums, or temporary
launch discounts. Claude Sonnet 5 deliberately uses the
durable standard `$3` input / `$15` output per MTok row even though Anthropic's
introductory `$2` / `$10` pricing runs through 2026-08-31. Cache dimensions must
remain explicit:

- Fable 5: input `10`, output `50`, cache read `1`, 5-minute cache write
  `12.5`, 1-hour cache write `20`.
- Opus 4.8: input `5`, output `25`, cache read `0.5`, 5-minute cache write
  `6.25`, 1-hour cache write `10`.
- Opus 5 (effective 2026-07-24; verified 2026-07-31): input `5`, output `25`,
  cache read `0.5`, 5-minute cache write `6.25`, 1-hour cache write `10`.
- Sonnet 5: input `3`, output `15`, cache read `0.3`, 5-minute cache write
  `3.75`, 1-hour cache write `6`.

OpenAI GPT-5.6 prices are first-party standard API prices per million tokens
effective 2026-07-30 and verified against the [GPT-5.6 Sol](https://developers.openai.com/api/docs/models/gpt-5.6-sol),
[GPT-5.6 Terra](https://developers.openai.com/api/docs/models/gpt-5.6-terra), and
[GPT-5.6 Luna](https://developers.openai.com/api/docs/models/gpt-5.6-luna) model
pages. The standard tier applies through `272,000` input tokens;
above that threshold the full request uses `2x` input/cache-read/cache-write and
`1.5x` output prices:

| Model | Standard Input | Standard Output | Cache Read | Cache Write | >272K Input | >272K Output | >272K Cache Read | >272K Cache Write |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `gpt-5.6-sol` | `5` | `30` | `0.5` | `6.25` | `10` | `45` | `1` | `12.5` |
| `gpt-5.6-terra` | `2` | `12` | `0.2` | `2.5` | `4` | `18` | `0.4` | `5` |
| `gpt-5.6-luna` | `0.2` | `1.2` | `0.02` | `0.25` | `0.4` | `1.8` | `0.04` | `0.5` |

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
