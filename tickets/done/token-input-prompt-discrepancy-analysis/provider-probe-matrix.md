# Provider / Runtime Live Probe Matrix

Date: 2026-06-25  
Scope rule: every built-in paid/managed provider/runtime where the user may pay provider/API money must be confirmed from a two-round live probe unless explicitly excluded by the user. Local/no-bill, arbitrary custom endpoints, and remote AutoByteus-provider config are not live-probe targets for this task.

## Final Status

| Provider / runtime | Live two-round status | Evidence | Cache/input semantic conclusion | Pricing/accounting conclusion | Implementation findings |
| --- | --- | --- | --- | --- | --- |
| OpenAI Responses API | Confirmed | `/Users/normy/autobyteus_org/autobyteus-worktrees/token-input-prompt-discrepancy-analysis/tickets/token-input-prompt-discrepancy-analysis/experiment-evidence/2026-06-25T17-20-36-099Z-openai-two-call.json` | `gross_includes_cache`; `input_tokens` gross, `input_tokens_details.cached_tokens` subset. | Cache-aware formula works; reasoning is subset of `output_tokens`. | Current normalizer covers OpenAI shape. |
| Codex App Server runtime | Confirmed | `/Users/normy/autobyteus_org/autobyteus-worktrees/token-input-prompt-discrepancy-analysis/tickets/token-input-prompt-discrepancy-analysis/experiment-evidence/2026-06-25T17-33-27-472Z-codex-runtime-two-round.json` | `gross_includes_cache`; `tokenUsage.last.inputTokens` gross, `cachedInputTokens` subset; `tokenUsage.total` cumulative. | Cache-aware server pricing worked in emitted payload; reasoning is subset of output. | Runtime adapter correctly maps cache/reasoning/context; UI still hides cache detail. |
| Anthropic direct API | Confirmed | `/Users/normy/autobyteus_org/autobyteus-worktrees/token-input-prompt-discrepancy-analysis/tickets/token-input-prompt-discrepancy-analysis/experiment-evidence/2026-06-25T17-27-56-521Z-anthropic-anthropic-cache.json` | `base_excludes_cache`; `input_tokens` is base/non-cache; cache read/write are additive buckets. | Requires additive formula and cache-write subtype pricing. | Current global subtraction formula is wrong for Anthropic; cache creation 5m/1h subtype must be preserved. |
| Claude Agent SDK runtime | Confirmed | `/Users/normy/autobyteus_org/autobyteus-worktrees/token-input-prompt-discrepancy-analysis/tickets/token-input-prompt-discrepancy-analysis/experiment-evidence/2026-06-25T17-29-53-376Z-claude-agent-sdk-two-round.json` | Terminal `result.usage`/`modelUsage` is canonical; cache buckets were reported as zero in two-round resumed session. If future cache positive, use Anthropic additive semantics. | SDK `modelUsage.costUSD` did not match public Sonnet pricing; preserve as raw diagnostic, not canonical estimate. | Do not sum duplicate assistant rows; use terminal result only. |
| Gemini / Vertex API-key runtime | Confirmed | `/Users/normy/autobyteus_org/autobyteus-worktrees/token-input-prompt-discrepancy-analysis/tickets/token-input-prompt-discrepancy-analysis/experiment-evidence/2026-06-25T17-22-00-848Z-gemini-two-call.json` | `gross_includes_cache`; `promptTokenCount` gross, `cachedContentTokenCount` subset. | Cache pricing is catalog/tier dependent; current catalog missing/stale cache prices. | Normalizer gap: `thoughtsTokenCount`-only payload can make output/billable output missing even though total implies output. |
| DeepSeek | Confirmed | `/Users/normy/autobyteus_org/autobyteus-worktrees/token-input-prompt-discrepancy-analysis/tickets/token-input-prompt-discrepancy-analysis/experiment-evidence/2026-06-25T17-13-27-750Z-deepseek-two-call.json` | `gross_includes_cache`; `prompt_tokens` gross, hit/miss fields explicit. | Catalog/docs match; cache-aware formula works. | Consider preserving provider-reported `prompt_cache_miss_tokens` explicitly. |
| Grok / xAI | Confirmed | `/Users/normy/autobyteus_org/autobyteus-worktrees/token-input-prompt-discrepancy-analysis/tickets/token-input-prompt-discrepancy-analysis/experiment-evidence/2026-06-25T17-15-40-733Z-grok-two-call.json` | `gross_includes_cache`; `prompt_tokens` gross, `cached_tokens` subset. | Reasoning tokens are billable output and included in provider `total_tokens`/cost ticks, but not in current normalized `output_tokens`. | Bug: set `billable_output_tokens = completion_tokens + reasoning_tokens` or provider-specific output semantic for xAI. |
| Kimi | Confirmed | `/Users/normy/autobyteus_org/autobyteus-worktrees/token-input-prompt-discrepancy-analysis/tickets/token-input-prompt-discrepancy-analysis/experiment-evidence/2026-06-25T17-14-30-238Z-kimi-two-call.json` | `gross_includes_cache`; `prompt_tokens` gross, `cached_tokens` subset. | Standard K2.7 Code pricing works; highspeed catalog missing. | Add highspeed pricing or mark missing. |
| Qwen / DashScope International | Confirmed | `/Users/normy/autobyteus_org/autobyteus-worktrees/token-input-prompt-discrepancy-analysis/tickets/token-input-prompt-discrepancy-analysis/experiment-evidence/2026-06-25T17-15-02-158Z-qwen-two-call.json` | `gross_includes_cache`; `prompt_tokens` gross, `prompt_tokens_details.cached_tokens` subset. | Pricing depends on endpoint/region/tier; cache hits are discounted by provider policy. | Current catalog has no Qwen trusted pricing. Add policy or mark missing/partial. |
| GLM / BigModel CN | Confirmed | `/Users/normy/autobyteus_org/autobyteus-worktrees/token-input-prompt-discrepancy-analysis/tickets/token-input-prompt-discrepancy-analysis/experiment-evidence/2026-06-25T17-14-01-577Z-glm-two-call.json` | `gross_includes_cache`; `prompt_tokens` gross, cached subset. | BigModel CN CNY pricing works for current endpoint. | Keep endpoint/pricing identity separate from global Z.AI USD pricing. |
| Mistral | Excluded by user | N/A | N/A | Docs/catalog-safe handling only. | Excluded from live probes by user on 2026-06-25. |
| MiniMax | Excluded by user | N/A | N/A | Docs/catalog-safe handling only. | Excluded from live probes by user on 2026-06-25. |
| Ollama / LMStudio | Out of live scope | N/A | Local/no provider bill. | UI should show local/no API bill. | No paid-provider experiment needed. |
| Arbitrary OpenAI-compatible custom | Out of live scope | N/A | Unknown by definition. | Must require configured pricing or show price missing. | Do not default to trusted zero. |
| Remote AutoByteus provider config | Out of live scope | N/A | Depends on remote metadata. | Safe status handling only. | No generic live probe in this task. |

## Cross-Provider Design Conclusions

1. Cache confirmation requires at least two sequential calls/turns with a stable repeated prefix.
2. There are at least two input semantics:
   - `gross_includes_cache`: OpenAI, Codex runtime, DeepSeek, GLM, Kimi, Qwen, Grok, Gemini.
   - `base_excludes_cache`: Anthropic direct; Claude SDK should use this if future positive cache buckets appear.
3. Reasoning/thinking is provider-specific:
   - OpenAI/Codex/Qwen/GLM: reasoning is a subset of output tokens in observed payloads.
   - Grok/xAI: reasoning is billable output but current normalized output omits it; needs billable-output handling.
   - Gemini: thoughts can be the only output-like token field; current normalizer needs a safe fallback.
   - Claude Agent SDK: no numeric thinking tokens exposed in the tested runtime path; output tokens remain canonical.
4. Cache-write pricing requires subtype support:
   - Anthropic direct emitted 5-minute cache creation subtype on warmup.
   - The canonical model must preserve cache creation subtype tokens or mark pricing partial.
5. Frontend must show gross input, cache hit tokens/rate, uncached input, cache-write when present, effective input cost, output/reasoning, and pricing status; raw `events` should be hidden or demoted.
