# Provider Usage Probe Matrix

Date: 2026-06-25
Workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-pricing-ui`
Environment file used: `autobyteus-ts/.env.test` (secret values were not printed or stored in this artifact)

## Probe Safety

- Real provider calls were opt-in and run manually with minimal prompts/output budgets.
- Sanitized JSON summaries were written under `tickets/done/token-usage-pricing-ui/probe-results/`.
- Raw assistant text and API keys were not stored; artifacts retain token usage field shapes and status/error summaries only.

## Priority Provider Matrix

| Provider | Probe attempted | Credential/API status | Runtime/API path tested | Raw usage fields observed | Reasoning/thinking evidence | Output includes reasoning? | Cache fields observed | Normalizer/accounting decision |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Claude / Anthropic | Yes | Valid key; HTTP 200 | Messages API non-stream and HTTP stream, `claude-sonnet-4-6`, `thinking: enabled` | Non-stream usage: `input_tokens`, `cache_creation_input_tokens`, `cache_read_input_tokens`, nested `cache_creation`, `output_tokens`, `output_tokens_details.thinking_tokens`, `service_tier`, `inference_geo`. Stream `message_delta.usage` carries final `output_tokens_details.thinking_tokens`. | Content blocks include `thinking` + `text`; stream deltas include `thinking_delta`, `signature_delta`, `text_delta`. Observed `output_tokens_details.thinking_tokens: 7`, `output_tokens: 13`. | Yes. Claude reports thinking as a breakdown inside `output_tokens`; do not add thinking tokens again to output cost. | Top-level cache creation/read token counts plus nested `cache_creation.ephemeral_5m_input_tokens` / `ephemeral_1h_input_tokens`. | Anthropic normalizer must extract `output_tokens_details.thinking_tokens` into `reasoning_output_tokens`. Cache read/create fields are present; precise cache-write cost needs TTL-specific split or partial status because Claude has 5m vs 1h write rates. |
| OpenAI | Yes | Valid `.env.test` key; earlier failures were caused by inherited shell `OPENAI_API_KEY` overriding the updated `.env.test` value. | Responses API non-stream and stream, `gpt-5.4-mini`, `reasoning.effort: low`; `/v1/models` sanity check. | Non-stream usage: `input_tokens`, `input_tokens_details.cached_tokens`, `output_tokens`, `output_tokens_details.reasoning_tokens`, `total_tokens`. Stream final `response.completed.response.usage` has the same shape. | Output includes a `reasoning` output item and numeric `output_tokens_details.reasoning_tokens` (observed examples: output `18`, reasoning `11`; stream output `20`, reasoning `13`). | Yes. `output_tokens` includes reasoning tokens; reasoning is a subset/breakdown. | `input_tokens_details.cached_tokens: 0` observed. | Current OpenAI-compatible usage normalizer covers nested reasoning/cache fields for Responses usage. Probe harness now lets `.env.test` override stale shell env for deterministic retests. |
| GLM | Yes | Valid key; HTTP 200 | OpenAI-compatible chat completions and stream, `glm-5.2`, thinking enabled | Non-stream: `prompt_tokens`, `completion_tokens`, `total_tokens`, `prompt_tokens_details.cached_tokens`, `completion_tokens_details.reasoning_tokens`. Stream final usage same shape. | Message/stream deltas include `reasoning_content`; observed examples include `completion_tokens: 64`, `reasoning_tokens: 64` non-stream and `completion_tokens: 64`, `reasoning_tokens: 62` stream. | Yes. `completion_tokens` includes reasoning tokens; reasoning is a subset/breakdown. | `prompt_tokens_details.cached_tokens: 0` observed. | Current OpenAI-compatible reasoning extraction covers nested reasoning details. Treat reasoning as output sub-breakdown. Cache-read field is nested and should remain mapped. |
| DeepSeek | Yes | Valid key; HTTP 200 | OpenAI-compatible chat completions and stream, `deepseek-v4-flash`, thinking enabled | `prompt_tokens`, `completion_tokens`, `total_tokens`, `prompt_tokens_details.cached_tokens`, `completion_tokens_details.reasoning_tokens`, `prompt_cache_hit_tokens`, `prompt_cache_miss_tokens`. Stream final usage same shape. | Message/stream deltas include `reasoning_content`; observed `completion_tokens: 24-39`, `reasoning_tokens: 22-37` depending run. | Yes. `completion_tokens` includes reasoning tokens; reasoning is a subset/breakdown. | Both nested `prompt_tokens_details.cached_tokens` and top-level `prompt_cache_hit_tokens` / `prompt_cache_miss_tokens` observed. | Map reasoning from `completion_tokens_details.reasoning_tokens`; map cache read from nested cached tokens and consider preserving top-level hit/miss fields for cache-hit statistics. Also fix DeepSeek request shaping: direct API accepted root `thinking:{type:'disabled'}` but ignored manual `extra_body.thinking`, while current TS adapter moves config `thinking_type` into `extra_body`. |
| Gemini / Vertex | Yes | Valid Vertex API key; HTTP 200 through `@google/genai` Vertex Express mode | Vertex SDK `models.generateContent`, `gemini-3.5-flash`, `gemini-3-flash-preview`, `gemini-3.1-pro-preview`, `thinkingConfig.includeThoughts: true` | `usageMetadata.promptTokenCount`, `candidatesTokenCount`, `totalTokenCount`, `promptTokensDetails`, `candidatesTokensDetails`, and for thinking prompts `thoughtsTokenCount`. | Parts include a thought part (`text`, `thought`) and answer part (`text`, `thoughtSignature`) when thinking is used. Observed examples: `prompt=15`, `candidates=3`, `thoughts=112/201/151`, `total=130/219/169`. | No for `candidatesTokenCount`; yes for `totalTokenCount`. `totalTokenCount = prompt + candidates + thoughts`, so billable output must be `candidatesTokenCount + thoughtsTokenCount` when `thoughtsTokenCount` is present. | No cache field observed in these simple Vertex generateContent probes. | Gemini normalizer must set `reasoning_output_tokens = thoughtsTokenCount` and `billable_output_tokens = candidatesTokenCount + thoughtsTokenCount` for this API shape; otherwise output cost is undercounted. Existing normalizer currently maps output to candidates only and does not set billable output. |
| Kimi / Moonshot | Yes | Valid key; HTTP 200 | OpenAI-compatible chat completions and stream, `kimi-k2.7-code`, `prompt_cache_key` set | Initial call: `prompt_tokens`, `completion_tokens`, `total_tokens`; second call with same cache key: top-level `cached_tokens` and nested `prompt_tokens_details.cached_tokens` appeared. Stream final usage same shape. | Message/stream deltas include `reasoning_content`, but usage did **not** expose numeric `reasoning_tokens` / `thinking_tokens` in tested K2.7 Code responses. | Inference from usage: `completion_tokens` is the only output-side numeric total; because no separate reasoning count is exposed, treat completion tokens as the billable output total and do not fabricate reasoning token count. | `cached_tokens: 14` and `prompt_tokens_details.cached_tokens: 14` observed after cache hit. | OpenAI-compatible normalizer must read top-level `cached_tokens` fallback as cache-read input tokens. Preserve reasoning text, but leave `reasoning_output_tokens` null when Kimi does not provide a numeric count. |

## Additional Non-Priority Probe

| Provider | Probe result | Note |
| --- | --- | --- |
| Qwen / DashScope-compatible | Valid key; HTTP 200. Usage shape matches OpenAI-compatible reasoning fields: `completion_tokens_details.reasoning_tokens`, `prompt_tokens_details.cached_tokens`, and stream final usage. | Useful fixture for OpenAI-compatible reasoning; not a primary user priority for this refinement. |

## Key Evidence Files

- Anthropic non-stream: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-pricing-ui/tickets/done/token-usage-pricing-ui/probe-results/2026-06-25T10-10-17-100Z-anthropic.json`
- Anthropic stream: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-pricing-ui/tickets/done/token-usage-pricing-ui/probe-results/2026-06-25T10-11-42-693Z-anthropic-stream-http.json`
- OpenAI invalid-key probe: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-pricing-ui/tickets/done/token-usage-pricing-ui/probe-results/2026-06-25T10-10-17-100Z-openai.json`
- OpenAI model-list invalid-key probe: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-pricing-ui/tickets/done/token-usage-pricing-ui/probe-results/2026-06-25T10-12-22-301Z-openai-model-list.json`
- GLM stream: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-pricing-ui/tickets/done/token-usage-pricing-ui/probe-results/2026-06-25T08-31-17-829Z-glm-stream.json`
- DeepSeek stream: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-pricing-ui/tickets/done/token-usage-pricing-ui/probe-results/2026-06-25T08-31-17-829Z-deepseek-stream.json`
- Gemini Vertex thinking models: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-pricing-ui/tickets/done/token-usage-pricing-ui/probe-results/2026-06-25T10-11-15-493Z-gemini-vertex-sdk-models.json`
- Kimi stream/cache: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-pricing-ui/tickets/done/token-usage-pricing-ui/probe-results/2026-06-25T08-31-17-829Z-kimi-stream.json`
- Kimi cache second call: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-pricing-ui/tickets/done/token-usage-pricing-ui/probe-results/2026-06-25T08-28-07-873Z-kimi.json`

## Open Follow-Up

- OpenAI initially failed because the inherited shell `OPENAI_API_KEY` differed from the updated `.env.test` value; after forcing `.env.test` precedence, `/v1/responses` and `/v1/models` succeeded.
- If implementation wants exact Anthropic cache-write cost, preserve separate 5-minute and 1-hour cache creation token counts or mark cache-write pricing partial when only an aggregate creation token count is available.
- If implementation wants Gemini cache stats, add a separate cached-content probe; the simple Vertex generateContent probes did not exercise caching.


## OpenAI Retest Update (2026-06-25)

After the user updated `OPENAI_API_KEY`, the probe was rerun. `autobyteus-ts/.env.test` contains exactly one `OPENAI_API_KEY` entry, but OpenAI still returned HTTP 401 `invalid_api_key` for both the Responses API probe and `/v1/models` sanity check. Sanitized output files were written under `probe-results/` with timestamps from this retest.

## OpenAI Authentication Investigation Update (2026-06-25)

Official OpenAI docs still use bearer API keys for ordinary application requests. They document `OpenAI-Organization` and `OpenAI-Project` headers for multi-organization or legacy-user-key routing, not as a mandatory extra field for every project API key. The installed OpenAI Node SDK also supports optional `OPENAI_ORG_ID` and `OPENAI_PROJECT_ID` and sends those headers when set. Current `.env.test` has only `OPENAI_API_KEY`; it is a single `sk-proj-` value, but OpenAI returns `invalid_api_key` for both `/v1/responses` and `/v1/models`. The probe harness has been updated to include optional org/project headers if those env vars are provided for future retests.


## OpenAI Successful Retest Update (2026-06-25)

Root cause of the earlier OpenAI failure was not project ID configuration. The local shell had an inherited `OPENAI_API_KEY` ending in a different suffix than the updated `.env.test` key, and the original probe loader preserved process env over `.env.test`. After forcing `.env.test` precedence, OpenAI `/v1/responses`, `/v1/models`, and a Responses streaming probe all succeeded. Observed usage includes `output_tokens_details.reasoning_tokens`; `output_tokens` includes reasoning.

## Runtime-Native Event Probe Addendum

The generic provider matrix above does not cover all runtime-native token event paths. Additional evidence for Codex app-server and Claude Agent SDK runtime streams is recorded in:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-pricing-ui/tickets/done/token-usage-pricing-ui/runtime-token-event-probe-matrix.md`

Key addendum decisions:

- Codex app-server `thread/tokenUsage/updated` schema includes `cachedInputTokens` and `reasoningOutputTokens` in each `last`/`total` token breakdown. AutoByteus must map those first-class fields instead of leaving them only in raw JSON.
- Claude Agent SDK real probe emitted thinking content but no numeric thinking-token count; terminal `result.usage.output_tokens` / `result.modelUsage[model].outputTokens` are the billable output total. AutoByteus should emit one usage event from terminal `result` usage, not sum assistant chunks, and should map any future numeric thinking detail if it appears.
