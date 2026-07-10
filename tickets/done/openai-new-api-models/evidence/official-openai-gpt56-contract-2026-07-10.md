# Official OpenAI GPT-5.6 Contract Verification

- Verified at: `2026-07-10` (Europe/Berlin task date)
- Sources: official OpenAI pages only
- Verification purpose: fresh API/E2E recheck of canonical IDs, limits, Responses support, reasoning efforts/default, standard pricing, cache-write billing/reporting, and composed `>272K` cached rates.

## Direct official facts

| Model | Official page | Context | Max output | Standard input / cached read / output (USD per 1M) | Page pricing rules |
| --- | --- | ---: | ---: | --- | --- |
| `gpt-5.6-sol` | https://developers.openai.com/api/docs/models/gpt-5.6-sol | 1,050,000 | 128,000 | 5.00 / 0.50 / 30.00 | `>272K` input uses 2x input and 1.5x output for the full request; writes use 1.25x uncached input; Responses endpoint listed. |
| `gpt-5.6-terra` | https://developers.openai.com/api/docs/models/gpt-5.6-terra | 1,050,000 | 128,000 | 2.50 / 0.25 / 15.00 | Same published tier/write rules; Responses endpoint listed. |
| `gpt-5.6-luna` | https://developers.openai.com/api/docs/models/gpt-5.6-luna | 1,050,000 | 128,000 | 1.00 / 0.10 / 6.00 | Same published tier/write rules; Responses endpoint listed. |

The current official GPT-5.6 guide, https://developers.openai.com/api/docs/guides/latest-model, states:

- choose the three canonical IDs above; the unsuffixed `gpt-5.6` is an alias routing to Sol rather than a fourth distinct model;
- use the Responses API for reasoning/tool/multi-turn workflows;
- `reasoning.effort` supports `none`, `low`, `medium`, `high`, `xhigh`, and `max`;
- omitted effort defaults to `medium`.

The current prompt-caching guide, https://developers.openai.com/api/docs/guides/prompt-caching, states:

- GPT-5.6 cache writes are billed at 1.25x uncached input;
- writes are reported as `cache_write_tokens` and reads as `cached_tokens`;
- Responses reports token details under `usage.input_tokens_details`; Chat Completions reports them under `usage.prompt_tokens_details`;
- caching is eligible at 1,024 tokens or more.

## Composed rates verified from the published rules

These are arithmetic derivations, not separately printed price-table rows. The standard write rate is `standard input × 1.25`; the long-context rules then double every input-category rate and multiply output by `1.5` for the full request.

| Model | Standard input | Standard read | Standard write | Standard output | `>272K` input | `>272K` read | `>272K` write | `>272K` output |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Sol | 5.00 | 0.50 | 6.25 | 30.00 | 10.00 | 1.00 | 12.50 | 45.00 |
| Terra | 2.50 | 0.25 | 3.125 | 15.00 | 5.00 | 0.50 | 6.25 | 22.50 |
| Luna | 1.00 | 0.10 | 1.25 | 6.00 | 2.00 | 0.20 | 2.50 | 9.00 |

The implementation catalog and server accounting E2E assertions match these direct and composed facts.
