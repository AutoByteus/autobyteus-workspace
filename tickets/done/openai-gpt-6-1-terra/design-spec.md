# Design Spec — openai-gpt-6-1-terra (autobyteus-336)

## Solution And Approval Basis

- Current solution revision ID: `SR-001`; requirements approved (requirements-doc Document Status). Design status: `Ready`.
- Investigation notes: `investigation-notes.md`. Authorities read: `references/architecture-design.md`, `references/design-principles.md`, `/DESIGN.md`. No conflict.

## Current-State Read

The AutoByteus model catalog (`autobyteus-ts/src/llm/supported-model-definitions.ts`) defines each OpenAI model with static metadata, a pricing config from `createOpenAILongContextPricing` and a reasoning schema. `LLMFactory` serves the catalog to the native runtime, to the server's model catalog (Settings and pickers) and to token pricing for every runtime. Nothing outside the catalog needs to know a new model.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Small` — one catalog entry, one optional helper argument, one unit test update, two test default strings, one TESTING.md rule, one docs line.
- Architectural risk: `Low` — data-only catalog addition in the existing owner; no API, persistence, runtime or contract change; existing models unchanged.
- Escalation trigger: an existing model's price changes (AC-005), or the server catalog/web list needs code to show the model.

## Change Scope (Mandatory)

- In scope: `autobyteus-ts/src/llm/supported-model-definitions.ts`; `autobyteus-ts/tests/unit/llm/supported-model-definitions.test.ts`; `autobyteus-ts/docs/provider_model_catalogs.md` (if it lists OpenAI models: add terra); the two Codex test files; `TESTING.md`.
- Derived consumers: `LLMFactory` model list → server catalog → web model menus (no change); token pricing lookup (gains a price for gpt-6.1-terra runs on any runtime).
- Deliberately left alone: every existing model; native OpenAI live test defaults (FU-001); `gpt-6.1-sol`.
- Follow-ups: FU-001.

## Task Design Health Assessment (Mandatory)

- Change posture: `Feature` (catalog data). Design issue: `No` — the catalog owner absorbs it; the helper's fixed 10% cache-read ratio becomes an optional argument (terra is 5%), default unchanged so no existing price moves.
- Root cause classification: `No Design Issue Found`. Refactor needed now: `No`.

## Persisted Data / State Transition Decision

`Not Affected`.

## Final File Responsibility Mapping

| File | Change |
| --- | --- |
| `autobyteus-ts/src/llm/supported-model-definitions.ts` | `createOpenAILongContextPricing(input, output, date, options?: { cachedInputReadTokenPricing?: number })`: cache read = the option when given, else `input * 0.1` (unchanged default); add before `gpt-6-astra`: `{ name: 'gpt-6.1-terra', value: 'gpt-6.1-terra', provider: LLMProvider.OPENAI, llmClass: OpenAILLM, canonicalName: 'gpt-6.1-terra', staticMetadata: createStaticModelMetadata(1_050_000, 922_000, 128_000, 'https://developers.openai.com/api/docs/models/gpt-6.1-terra', '2026-10-30'), defaultConfig: new LLMConfig({ pricingConfig: createOpenAILongContextPricing(1, 5, '2026-10-30', { cachedInputReadTokenPricing: 0.05 }) }), configSchema: openaiGpt56ReasoningSchema }` (default media capabilities: image supported, audio/video unsupported) |
| `autobyteus-ts/tests/unit/llm/supported-model-definitions.test.ts` | the expected list starts with `'gpt-6.1-terra'`; pricing rows: standard input 1, output 5, cache read 0.05, cache write 1.25; long-context tier input 2, output 7.5, cache read 0.1, cache write 2.5; metadata 1,050,000 / 922,000 / 128,000; capabilities image supported, audio/video unsupported; reasoning default medium with max |
| `autobyteus-server-ts/tests/integration/runtime-management/codex/client/codex-native-multi-agent-disabled.integration.test.ts` L18, `autobyteus-server-ts/tests/e2e/runtime/codex-native-multi-agent-disabled.e2e.test.ts` L33 | default `gpt-6.1-terra` (env override kept); header comments that name the model updated |
| `TESTING.md` | under the gated runtime suites / test-only runtime CLI settings: "Live Codex tests use `gpt-6.1-terra`, with reasoning effort `medium` unless the test needs more (the cheapest current model; override a test's model variable only when the test needs another)." Commit as `docs(testing): live Codex tests use gpt-6.1-terra` |
| `autobyteus-ts/docs/provider_model_catalogs.md` | add terra where OpenAI models are listed |

## Removal / Decommission Plan (Mandatory)

None (the user kept every model).

## Backward-Compatibility Rejection Log (Mandatory)

N/A.

## Change / Refactor Sequence

1. Helper option + catalog entry + unit test. 2. Codex test defaults. 3. TESTING.md (own commit). 4. Docs. 5. Checks: `pnpm -C autobyteus-ts test` (unit), server `typecheck` and `test:unit`; one live call to `gpt-6.1-terra` through autobyteus-ts with the test vault (`RUN_LIVE_PROVIDER_TESTS=1`, small input, never print the key), for example the existing OpenAI live flow with its model variable set to terra; optionally one live Codex run of the integration test on terra.

## Guidance For Implementation

Keep every existing price identical (the helper default). No other file needs the model name.
