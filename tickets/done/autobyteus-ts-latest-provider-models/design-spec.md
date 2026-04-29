# Design Spec: Latest Provider Model Support in `autobyteus-ts`

## Design Status

Pending architecture review.

## Inputs / Upstream Artifacts

- Requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-latest-provider-models/tickets/done/autobyteus-ts-latest-provider-models/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-latest-provider-models/tickets/done/autobyteus-ts-latest-provider-models/investigation-notes.md`
- Target package: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-latest-provider-models/autobyteus-ts`

## Design Summary

Implement this as a focused registry + adapter-correctness update across the existing model-selection spines:

1. Extend static LLM definitions and curated metadata for confirmed new OpenAI, Anthropic, DeepSeek, and Kimi models.
2. Add Anthropic Opus 4.7-specific request-shaping logic so the adapter no longer sends fixed thinking budgets or adapter-injected sampling params for that model.
3. Extend Kimi’s existing tool-workflow thinking normalization to `kimi-k2.6`.
4. Extend static multimedia audio/image registries for Gemini TTS and OpenAI `gpt-image-2`.
5. Extend focused unit/integration tests and run credential-gated live smoke tests only when `.env.test` credentials allow them.

No new provider abstraction, compatibility alias layer, or UI-specific implementation is required.

## Confirmed Model Additions

### LLM models

| User-facing identifier (`name`) | Provider API value (`value`) | Provider | Adapter | Metadata / pricing guidance |
| --- | --- | --- | --- | --- |
| `gpt-5.5` | `gpt-5.5` | OpenAI | `OpenAILLM` / Responses API | Context 1M, max output 128K, pricing $5 input / $30 output per 1M tokens from OpenAI docs. Reuse `openaiReasoningSchema`. |
| `claude-opus-4.7` | `claude-opus-4-7` | Anthropic | `AnthropicLLM` / Messages API | Context 1M, max output 128K, pricing $5 input / $25 output per 1M tokens from Anthropic docs. Use Opus 4.7 adaptive-thinking schema/logic, not old fixed-budget schema. |
| `deepseek-v4-flash` | `deepseek-v4-flash` | DeepSeek | `DeepSeekLLM` / OpenAI-compatible Chat Completions | Context 1M, max output 384K, pricing $0.14 input cache-miss / $0.28 output per 1M tokens. Add optional DeepSeek V4 config schema. |
| `deepseek-v4-pro` | `deepseek-v4-pro` | DeepSeek | `DeepSeekLLM` / OpenAI-compatible Chat Completions | Context 1M, max output 384K, pricing $1.74 input cache-miss / $3.48 output per 1M tokens. Add optional DeepSeek V4 config schema. |
| `kimi-k2.6` | `kimi-k2.6` | Kimi | `KimiLLM` / OpenAI-compatible Chat Completions | Context 256K. If numeric pricing is not verified during implementation, omit pricing rather than inventing it. |

### Audio/TTS models

| User-facing identifier (`name`) | Provider API value (`value`) | Provider | Adapter | Notes |
| --- | --- | --- | --- | --- |
| `gemini-3.1-flash-tts-preview` | `gemini-3.1-flash-tts-preview` | Gemini | `GeminiAudioClient` | Current official latest Gemini TTS preview. Reuse existing Gemini TTS schema/voices. |
| `gemini-2.5-pro-tts` | `gemini-2.5-pro-preview-tts` | Gemini | `GeminiAudioClient` | Official supported TTS model already present in runtime mapping but missing from catalog. Reuse schema/voices. |

No new OpenAI speech-generation model is required. Keep `gpt-4o-mini-tts` registered.

### Image models

| User-facing identifier (`name`) | Provider API value (`value`) | Provider | Adapter | Notes |
| --- | --- | --- | --- | --- |
| `gpt-image-2` | `gpt-image-2` | OpenAI | `OpenAIImageClient` | Official current image generation/edit model. Reuse the existing OpenAI image client; verify size/quality enum before changing schema. |

Keep `gpt-image-1.5` registered. Do not switch image defaults unless the implementation receives a separate product/defaults instruction.

## Spine Inventory

### Spine A: LLM catalog to provider request

- Entrypoint: caller/model configuration -> `LLMFactory.listModels*` / `LLMFactory.createLLM`.
- Catalog owner: `autobyteus-ts/src/llm/supported-model-definitions.ts`.
- Metadata owner: `autobyteus-ts/src/llm/metadata/curated-model-metadata.ts` and `ModelMetadataResolver`.
- Request owners:
  - OpenAI: `autobyteus-ts/src/llm/api/openai-responses-llm.ts` via `OpenAILLM`.
  - Anthropic: `autobyteus-ts/src/llm/api/anthropic-llm.ts`.
  - DeepSeek: `autobyteus-ts/src/llm/api/deepseek-llm.ts` and `OpenAICompatibleLLM`.
  - Kimi: `autobyteus-ts/src/llm/api/kimi-llm.ts` and `OpenAICompatibleLLM`.

### Spine B: Audio model catalog to TTS provider request

- Entrypoint: caller/tool config -> `AudioClientFactory.listModels` / `AudioClientFactory.createAudioClient`.
- Catalog/schema owner: `autobyteus-ts/src/multimedia/audio/audio-client-factory.ts`.
- Runtime mapping owner: `autobyteus-ts/src/utils/gemini-model-mapping.ts`.
- Request owner: `autobyteus-ts/src/multimedia/audio/api/gemini-audio-client.ts` for Gemini TTS.

### Spine C: Image model catalog to image provider request

- Entrypoint: caller/tool config -> `ImageClientFactory.listModels` / `ImageClientFactory.createImageClient`.
- Catalog/schema owner: `autobyteus-ts/src/multimedia/image/image-client-factory.ts`.
- Request owner: `autobyteus-ts/src/multimedia/image/api/openai-image-client.ts`.

### Spine D: Validation and credential gating

- Env loading owner: `autobyteus-ts/tests/setup.ts`.
- Credential source: copied local `autobyteus-ts/.env.test` in ticket worktree.
- Unit/integration test runner: Vitest via `pnpm exec vitest run ...`.
- Build/type validation: `pnpm run build` or equivalent project typecheck/build command.

## Ownership / Boundary Decisions

1. **Catalogs remain the source of truth.** Do not scatter hard-coded new model IDs in tools or tests except where a test is intentionally asserting a catalog entry.
2. **Provider adapters own request legality.** Catalog entries should not encode request-shape hacks. Anthropic Opus 4.7 legality belongs in `AnthropicLLM`.
3. **No fuzzy aliases.** Add only exact provider IDs or the project’s established display-name pattern (`claude-opus-4.7` -> `claude-opus-4-7`, `gemini-2.5-pro-tts` -> `gemini-2.5-pro-preview-tts`). Do not add unconfirmed names such as `kimi-2.6`, `gemini-tts-2.0-preview`, or `claude-4.7`.
4. **No default switching without explicit instruction.** The change adds selectable support. Existing defaults in tools remain unchanged unless tests reveal a broken default.
5. **No secret handling changes.** `.env.test` remains local-only and untracked.

## File-Level Implementation Plan

### 1. `src/llm/supported-model-definitions.ts`

Add definitions for the LLM model table above.

Recommended schema changes:

- Reuse `openaiReasoningSchema` for `gpt-5.5`.
- Add a new `claudeAdaptiveThinkingSchema` for Opus 4.7, separate from the existing fixed-budget `claudeSchema`:
  - `thinking_enabled` boolean, default `false`, description indicates adaptive thinking.
  - `thinking_display` enum `['omitted', 'summarized']`, default `omitted`, optional.
  - Do **not** include `thinking_budget_tokens` for Opus 4.7.
- Add a `deepseekV4Schema` (optional but recommended) that matches official OpenAI-format fields:
  - `reasoning_effort` enum `['high', 'max']`, optional/default `high`.
  - `thinking` object with nested `type` enum `['enabled', 'disabled']`, optional. The schema must use a nested `ParameterSchema`, not a string alias that requires adapter translation.
- Assign `configSchema: deepseekV4Schema` to `deepseek-v4-flash` and `deepseek-v4-pro`.
- Assign `configSchema: claudeAdaptiveThinkingSchema` only to `claude-opus-4.7`.
- For Kimi K2.6, do not add a custom schema unless implementation verifies exact Kimi request parameters; `KimiLLM` already passes extra params for advanced users.

Pricing/default config:

- Use `pricing(5.0, 30.0)` for `gpt-5.5`.
- Use `pricing(5.0, 25.0)` for `claude-opus-4.7`.
- Use `pricing(0.14, 0.28)` for `deepseek-v4-flash` and `pricing(1.74, 3.48)` for `deepseek-v4-pro`.
- For `kimi-k2.6`, either omit `defaultConfig` or set pricing only if implementation verifies numeric values from an official source. Do not copy old Kimi pricing without verification.

### 2. `src/llm/metadata/curated-model-metadata.ts`

Add entries keyed by provider API `value`:

- OpenAI `gpt-5.5`: `maxContextTokens: 1000000`, `maxOutputTokens: 128000`, source `https://developers.openai.com/api/docs/models`, `verifiedAt: '2026-04-25'`.
- Anthropic `claude-opus-4-7`: `maxContextTokens: 1000000`, `maxInputTokens: 1000000`, `maxOutputTokens: 128000`, source `https://platform.claude.com/docs/en/about-claude/models/overview`, `verifiedAt: '2026-04-25'`.
- DeepSeek `deepseek-v4-flash` and `deepseek-v4-pro`: `maxContextTokens: 1000000`, `maxOutputTokens: 384000`, source `https://api-docs.deepseek.com/quick_start/pricing`, `verifiedAt: '2026-04-25'`.
- Kimi `kimi-k2.6`: `maxContextTokens: 256000`, source `https://platform.kimi.ai/docs/models`, `verifiedAt: '2026-04-25'`.

Do not remove current entries.

### 3. `src/llm/api/anthropic-llm.ts`

Refactor request-building helpers so Opus 4.7 is model-aware and internal schema fields do not leak to the provider.

Required behavior:

- Add an `isClaudeOpus47(modelValue: string): boolean` helper for `claude-opus-4-7` and dated snapshots if a user chooses one later.
- Replace `buildThinkingParam(extraParams)` with a helper that receives `model.value` and returns:
  - For non-Opus-4.7 Claude models: existing `{ type: 'enabled', budget_tokens: N }` when `thinking_enabled === true`.
  - For Opus 4.7: `{ type: 'adaptive' }` when `thinking_enabled === true`, plus `display: 'summarized'` only when requested.
- Add a filter for internal schema keys before assigning `extraParams` into API params. Internal keys include at least `thinking_enabled`, `thinking_budget_tokens`, and `thinking_display`.
- Preserve explicit advanced provider params not owned by the internal schema.
- Preserve caller override precedence: if `kwargs.thinking` or an explicit provider `thinking` object is supplied, do not overwrite it with schema-generated thinking.
- For Opus 4.7 only, do not set the adapter’s fallback `params.temperature = 0`. This avoids the official 400 error for non-default sampling parameters.
- Keep the existing fallback `temperature = 0` behavior for older Claude models unless architecture review directs otherwise.
- Apply the same helper/order in both `_sendMessagesToLLM` and `_streamMessagesToLLM`.

### 4. `src/llm/api/kimi-llm.ts`

- Add `kimi-k2.6` to `KIMI_TOOL_SAFE_NON_THINKING_MODELS`.
- Preserve existing behavior:
  - Only tool workflows trigger auto-disable.
  - Existing explicit `kwargs.thinking` or `config.extraParams.thinking` wins; do not overwrite.

### 5. `src/multimedia/audio/audio-client-factory.ts`

Register new Gemini TTS models while reusing the existing `geminiTtsSchema` and voices.

Recommended shape:

- Extract a tiny local helper inside `initializeRegistry()` to construct Gemini TTS models, or directly instantiate all three without duplicating schema construction.
- Keep existing `gemini-2.5-flash-tts` as-is.
- Add:
  - `name: 'gemini-3.1-flash-tts-preview'`, `value: 'gemini-3.1-flash-tts-preview'`.
  - `name: 'gemini-2.5-pro-tts'`, `value: 'gemini-2.5-pro-preview-tts'`.
- Do not remove `gpt-4o-mini-tts`.

### 6. `src/utils/gemini-model-mapping.ts`

- Add TTS mapping for `gemini-3.1-flash-tts-preview`:
  - `api_key: 'gemini-3.1-flash-tts-preview'`.
  - `vertex: 'gemini-3.1-flash-tts-preview'` unless implementation verifies a different Vertex ID from official Vertex docs.
- Keep the existing `gemini-2.5-pro-preview-tts` mapping and add tests that prove the new catalog entry uses it correctly.

### 7. `src/multimedia/image/image-client-factory.ts`

- Add a second OpenAI `ImageModel` for `gpt-image-2` using `OpenAIImageClient`.
- Reuse the existing OpenAI image schema initially unless implementation verifies different supported enum values.
- Update the `gpt-image-1.5` description if needed so it no longer says “latest”.
- Add `gpt-image-2` description reflecting current docs: state-of-the-art image generation/editing model.
- Keep `gpt-image-1.5` registered.

### 8. Tests

Update or add focused tests under the existing test structure.

Required unit/integration-test file targets:

- `tests/unit/llm/metadata/model-metadata-resolver.test.ts`
- `tests/integration/llm/llm-factory-metadata-resolution.test.ts`
- `tests/unit/llm/api/anthropic-llm.test.ts`
- `tests/unit/llm/api/kimi-llm.test.ts`
- `tests/unit/multimedia/audio/audio-client-factory.test.ts`
- `tests/unit/multimedia/image/image-client-factory.test.ts`
- `tests/unit/utils/gemini-model-mapping.test.ts`
- `tests/integration/llm/api/openai-llm.test.ts`
- `tests/integration/llm/api/anthropic-llm.test.ts`
- `tests/integration/llm/api/deepseek-llm.test.ts`
- `tests/integration/llm/api/kimi-llm.test.ts`
- `tests/integration/multimedia/audio/api/gemini-audio-client.test.ts`
- `tests/integration/multimedia/image/api/openai-image-client.test.ts`

Test scenarios:

- Catalog/model-list tests assert the new identifiers are present with expected `provider`, `value`, and metadata.
- Anthropic request tests assert:
  - Opus 4.7 without thinking does not send fallback `temperature`.
  - Opus 4.7 with `thinking_enabled` sends `thinking: { type: 'adaptive' }` and no `budget_tokens`.
  - Opus 4.7 does not leak `thinking_enabled`, `thinking_display`, or `thinking_budget_tokens` top-level params.
  - Existing Opus/Sonnet 4.6 fixed-budget thinking behavior remains intact, but internal schema keys do not leak.
- Kimi tests assert `kimi-k2.6` tool workflows auto-disable thinking only when no explicit override exists.
- Gemini mapping tests assert `gemini-3.1-flash-tts-preview` and `gemini-2.5-pro-preview-tts` resolve correctly for `api_key` and `vertex` runtimes.
- OpenAI image tests assert `gpt-image-2` is listable/creatable and uses `OpenAIImageClient`.

## Integration Test Policy

Follow the user’s instruction exactly:

- If the provider API key is present and valid, run focused live smoke tests for the newly added models.
- If the key is missing, invalid, quota-limited, or model-access-blocked, record the skip/block reason and continue; do not block catalog support.
- Do not print API key values.

Suggested live smoke coverage:

- OpenAI LLM: short `gpt-5.5` `sendUserMessage` smoke.
- OpenAI image: minimal `gpt-image-2` generation smoke; edit smoke can be included if the current test fixture already supports cheap local input image editing.
- Anthropic: short `claude-opus-4.7` smoke with no temperature override.
- DeepSeek: short `deepseek-v4-flash` smoke; run `deepseek-v4-pro` only if existing test pattern/cost guidance permits.
- Kimi: short `kimi-k2.6` smoke.
- Gemini TTS: short `gemini-3.1-flash-tts-preview` audio smoke.

A shared credential/access-error classifier in test helpers is acceptable if it reduces duplicated skip logic, but do not add a broad test framework redesign.

Suggested local commands from `autobyteus-ts/`:

```bash
pnpm run build
pnpm exec vitest run \
  tests/unit/llm/metadata/model-metadata-resolver.test.ts \
  tests/unit/llm/api/anthropic-llm.test.ts \
  tests/unit/llm/api/kimi-llm.test.ts \
  tests/unit/multimedia/audio/audio-client-factory.test.ts \
  tests/unit/multimedia/image/image-client-factory.test.ts \
  tests/unit/utils/gemini-model-mapping.test.ts
pnpm exec vitest run \
  tests/integration/llm/llm-factory-metadata-resolution.test.ts \
  tests/integration/llm/api/openai-llm.test.ts \
  tests/integration/llm/api/anthropic-llm.test.ts \
  tests/integration/llm/api/deepseek-llm.test.ts \
  tests/integration/llm/api/kimi-llm.test.ts \
  tests/integration/multimedia/audio/api/gemini-audio-client.test.ts \
  tests/integration/multimedia/image/api/openai-image-client.test.ts
```

If integration tests are skipped for credentials/access, the implementation handoff must state which provider/model was skipped and why.

## Removal / Decommission Plan

No model removals in this task.

Track but defer:

- DeepSeek docs state `deepseek-chat` and `deepseek-reasoner` discontinue on 2026-07-24. They currently map to `deepseek-v4-flash` modes, so keep them until a deprecation/removal task.
- Kimi docs state older K2 series models discontinue on 2026-05-25. Keep current entries now; future cleanup should be explicit and dated.
- Do not add compatibility aliases for pre-deprecation names. Existing names remain only because they already exist and are still provider-supported on 2026-04-25.

## Explicit Non-Goals / Rejected Designs

- **Rejected: adding `gemini-tts-2.0-preview`.** No official API ID was found. Add current documented Gemini TTS IDs instead.
- **Rejected: adding fuzzy aliases such as `kimi-2.6` or `claude-4.7`.** They would create ambiguous selection and maintenance debt.
- **Rejected: switching tool defaults to latest models by default.** This could change cost, latency, and behavior without a product decision.
- **Rejected: adding `gpt-5.5-pro` as a simple catalog row in this task.** Official OpenAI model-specific docs indicate long-running/background-mode and streaming constraints. Add it later only with explicit capability/streaming design, or if implementation re-verifies that normal streaming is officially supported.
- **Rejected: swallowing provider request errors broadly in integration tests.** Only missing/invalid/quota/model-access credential conditions should be converted to skips. Implementation errors should fail.

## Risk Controls

- Use official docs URLs in curated metadata `sourceUrl` fields.
- Keep provider request changes isolated to `AnthropicLLM` and `KimiLLM`; do not touch unrelated adapters.
- Update tests before running live integration to catch catalog/request-shape issues locally.
- Preserve `.env.test` as ignored/untracked and never log values.

## Handoff Notes For Implementation Engineer

- The highest-risk code change is `AnthropicLLM`; implement and unit-test that first.
- `gpt-image-2`, DeepSeek V4, Kimi K2.6, and Gemini TTS are expected to be low-risk registry additions plus focused tests.
- Re-check current provider docs immediately before coding if the implementation starts after 2026-04-25.
