# Official OpenAI GPT-5.6 Contract Verification — API/E2E Round 2

- Reverified: `2026-07-10`
- Sources: official OpenAI developer pages only
- Result: unchanged from the reviewed implementation and round-1 evidence.

## Direct contract

| Model | Official page | Context / max output | Standard input / cached read / output (USD per 1M) | Current rules |
| --- | --- | --- | --- | --- |
| `gpt-5.6-sol` | https://developers.openai.com/api/docs/models/gpt-5.6-sol | 1,050,000 / 128,000 | 5.00 / 0.50 / 30.00 | Responses listed; `>272K` uses 2x input and 1.5x output for the full request; cache writes use 1.25x uncached input. |
| `gpt-5.6-terra` | https://developers.openai.com/api/docs/models/gpt-5.6-terra | 1,050,000 / 128,000 | 2.50 / 0.25 / 15.00 | Same. |
| `gpt-5.6-luna` | https://developers.openai.com/api/docs/models/gpt-5.6-luna | 1,050,000 / 128,000 | 1.00 / 0.10 / 6.00 | Same. |

The current model guide, https://developers.openai.com/api/docs/guides/latest-model, still states that the unsuffixed alias routes to Sol, Responses is the recommended workflow API, efforts are `none`, `low`, `medium`, `high`, `xhigh`, and `max`, and omission defaults to `medium`.

The current prompt-caching guide, https://developers.openai.com/api/docs/guides/prompt-caching, still states that GPT-5.6 writes are reported as `cache_write_tokens` at 1.25x uncached input, reads as `cached_tokens`, Responses details under `usage.input_tokens_details`, and Chat details under `usage.prompt_tokens_details`.

## Composed rates

The arithmetic remains: standard write = input x 1.25; long-context input/read/write = standard x 2; long-context output = standard x 1.5.

| Model | Standard input / read / write / output | `>272K` input / read / write / output |
| --- | --- | --- |
| Sol | 5.00 / 0.50 / 6.25 / 30.00 | 10.00 / 1.00 / 12.50 / 45.00 |
| Terra | 2.50 / 0.25 / 3.125 / 15.00 | 5.00 / 0.50 / 6.25 / 22.50 |
| Luna | 1.00 / 0.10 / 1.25 / 6.00 | 2.00 / 0.20 / 2.50 / 9.00 |

No contract or rate drift requires a production or design change in round 2.
