# Investigation Notes — openai-gpt-6-1-terra (autobyteus-336)

- Task `autobyteus-336` (project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`), requested by `/project_task_manager`. Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/openai-gpt-6-1-terra`, branch `codex/openai-gpt-6-1-terra`, base `origin/personal` `8df659441f`; finalization target `origin/personal`. Install exit 0.
- Authorities read: requirements-engineering, finding-the-cause, ticket-scope, handoff; architecture-design, design-principles; `DESIGN.md`, `TESTING.md` (read in this conversation).

## Model facts (OpenAI, fetched 2026-10-30)

| Source | Finding |
| --- | --- |
| https://developers.openai.com/api/docs/models/gpt-6.1-terra | id `gpt-6.1-terra` (only snapshot); context 1,050,000; max input 922,000; max output 128,000; knowledge cutoff 2026-06-01; per 1M tokens: input $1, cached input $0.05, cache writes $1.25 (30-minute retention) or $2.50 (12-hour), output $5; above 272K input tokens: 2x input and cache rates, 1.5x output for the whole request; Batch/Flex -50%; Fast mode 2x, no separate id or parameter named; reasoning effort none/low/medium/high/xhigh/max, default medium; input text and image, output text, no audio/video; Responses, Chat Completions, Batch; tool calling requires Responses; streaming, structured outputs, function calling, prompt caching |
| https://developers.openai.com/api/docs/models | gpt-6 ids listed: `gpt-6-astra`, `gpt-6.1-sol`, `gpt-6.1-terra`, `gpt-6-luna`; not listed: `gpt-6.1-luna`, `gpt-6-sol` |
| https://developers.openai.com/api/docs/models/gpt-6-sol | cached input $0.20 = 10% of input, cache writes 1.25x, same long-context rule (the helper's 10% is right for the existing models) |
| https://developers.openai.com/api/docs/deprecations | none of gpt-6-*, gpt-5.6-*, gpt-5.5, gpt-5.4, gpt-5.4-mini listed as deprecated |

## Code facts

| Source | Finding |
| --- | --- |
| `autobyteus-ts/src/llm/supported-model-definitions.ts` L25-82, L152-184 | OpenAI models use `createOpenAIReasoningSchema` (`openaiGpt56ReasoningSchema`: none..max, default medium) and `createOpenAILongContextPricing(input, output, date)`, which fixes cache read at 10% of input and cache write at 1.25x, with the 272K tier (2x input/cache, 1.5x output) |
| `autobyteus-ts/src/llm/supported-model-static-metadata.ts` L4-35 | `createStaticModelMetadata(context, maxInput, maxOutput, url, verifiedAt, capabilities = BUILTIN: image supported, audio and video unsupported)` |
| `autobyteus-ts/tests/unit/llm/supported-model-definitions.test.ts` L19-42 | asserts the exact model list and a pricing table per OpenAI model |
| `autobyteus-server-ts/src/token-usage/pricing/token-price-config-provider.ts` L148-157 | token prices for every runtime (Codex included) are looked up in the AutoByteus catalog by model; adding terra gives Codex runs on gpt-6.1-terra a price |
| `autobyteus-server-ts/tests/integration/runtime-management/codex/client/codex-native-multi-agent-disabled.integration.test.ts` L18; `tests/e2e/runtime/codex-native-multi-agent-disabled.e2e.test.ts` L33 | live Codex defaults `gpt-6.1-sol` |
| `TESTING.md` | no rule for a Codex test model |
| test vault | `provider.openai.api-key` configured with credits (used 2026-10-30, autobyteus-328 SD-02) |

## Scope decisions recorded with the user (2026-10-30)

Removing the OpenAI models below 6 was considered and dropped by the user ("let's do not remove those models for now … just add the new model"): the catalog is also the price table for Codex runs, and the built-in applications' Codex default `gpt-5.6-luna` would lose cost estimates.
