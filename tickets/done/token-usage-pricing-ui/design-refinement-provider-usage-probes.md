# Design Refinement: Provider Usage Probes for Reasoning and Cache Tokens

## Trigger

On 2026-06-25, the user clarified that provider documentation research is not enough. The implementation must also verify, where practical, what raw provider responses actually contain for reasoning/thinking token counts and cache token counts.

## Requirement Change

The requirements doc has been updated from `Design-ready` to `Refined` and now includes:

- `REQ-016`: add a provider usage-observation probe plan or harness for supported providers when credentials are available.
- `REQ-017`: real provider probes must be explicit/opt-in, low-budget, and skipped with reasons when credentials are unavailable.
- `REQ-018`: provider normalizer tests must include documented or sanitized raw-response fixtures for reasoning/cache fields.
- `AC-018` through `AC-020`: require a provider probe matrix and fixture/probe evidence for reasoning and cache token handling.

## Design Change

The design spec now includes `DS-006`, a bounded local provider usage-probe spine:

`opt-in probe config + provider key -> minimal provider call -> raw usage capture -> sanitized evidence row -> normalizer fixture/test decision`

The probe is not a production runtime path. It exists to prevent incorrect assumptions about whether:

- reasoning/thinking token counts are exposed numerically,
- output/completion token counts already include reasoning tokens,
- reasoning counts appear only in final streaming usage events,
- cache-hit/cache-write token fields are exposed and under which names.

## Provider-Specific Evidence To Verify

- OpenAI/OpenAI-compatible: check `output_tokens_details.reasoning_tokens`, `output_tokens_details.thinking_tokens`, `input_tokens_details.cached_tokens`, and provider variants.
- DeepSeek: check thinking-mode OpenAI-compatible usage shape and whether reasoning count is present or only reasoning content is returned.
- Kimi: check `reasoning_content`/thinking behavior and numeric usage fields such as `cached_tokens` for the exact Kimi API path.
- Anthropic: check final usage for `output_tokens_details.thinking_tokens` where available, plus `cache_creation_input_tokens` and `cache_read_input_tokens`.
- Gemini: check both existing generateContent `usageMetadata` fields and newer Interactions usage fields such as `total_thought_tokens` and `total_cached_tokens`.

## Safety Constraint

Real probes may incur provider cost. They must not run in ordinary unit tests or CI by default. They require explicit API keys and opt-in flags, use minimal prompts/output budgets, and record skip reasons if unavailable.

## Updated Artifacts

- `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-pricing-ui/tickets/done/token-usage-pricing-ui/requirements.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-pricing-ui/tickets/done/token-usage-pricing-ui/investigation-notes.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-pricing-ui/tickets/done/token-usage-pricing-ui/design-spec.md`

## Completed Probe Evidence Update (2026-06-25)

The priority provider probes have now been run where credentials were valid. Durable matrix:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-pricing-ui/tickets/done/token-usage-pricing-ui/provider-usage-probe-matrix.md`

Key conclusions:

- Claude/Anthropic exposes `output_tokens_details.thinking_tokens` in non-stream and final stream usage; `output_tokens` already includes thinking tokens.
- Gemini Vertex exposes `thoughtsTokenCount`; `candidatesTokenCount` excludes thoughts, so billable output must be candidates plus thoughts.
- DeepSeek and GLM expose OpenAI-compatible `completion_tokens_details.reasoning_tokens`; `completion_tokens` already includes reasoning tokens.
- Kimi exposes `reasoning_content` but did not expose numeric reasoning-token counts in tested usage; cache hits appear as `cached_tokens` and `prompt_tokens_details.cached_tokens`.
- OpenAI real probe now succeeds after fixing local env precedence; Responses non-stream and stream final usage expose `output_tokens_details.reasoning_tokens`, and `output_tokens` includes reasoning.
- DeepSeek request shaping needs correction because the real HTTP API probe showed root `thinking` controls the mode, while manual `extra_body.thinking` did not.


### OpenAI Retest Correction

Earlier OpenAI failures were caused by a stale inherited shell `OPENAI_API_KEY` overriding the updated `.env.test` value in the probe harness. After changing the harness to let `.env.test` override inherited env values, OpenAI Responses and `/v1/models` succeeded. No mandatory `OPENAI_PROJECT_ID` requirement was found for the tested `sk-proj-` key.
