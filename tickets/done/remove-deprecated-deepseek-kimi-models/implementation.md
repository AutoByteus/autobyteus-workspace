# Implementation Plan: Remove Deprecated DeepSeek and Kimi Model Support

Status: Implementation Complete

## Solution Sketch

This change removes three deprecated built-in model identifiers at the catalog/default boundary while keeping provider support for retained DeepSeek and Kimi models.

## Data-Flow Spine Inventory

| Spine ID | Entry | Flow | Ownership |
| --- | --- | --- | --- |
| SP-001 | `LLMFactory.initializeRegistry()` | `supportedModelDefinitions` -> `ModelMetadataResolver` -> `LLMModel` registration -> model listing/creation | `src/llm/supported-model-definitions.ts` owns built-in model availability. |
| SP-002 | Provider constructor defaults | `new DeepSeekLLM()` / `new KimiLLM()` -> default `LLMModel` -> OpenAI-compatible request model value | Provider classes own safe no-argument defaults. |
| SP-003 | Metadata resolution | supported definition lookup -> curated/live metadata merge -> `ModelInfo` limits | `src/llm/metadata/*` owns model limit enrichment but must not advertise removed built-ins. |
| SP-004 | Docs/tests | source behavior -> unit/integration tests -> durable docs | Tests/docs must reflect current supported catalog. |

## Component Changes

| Component | Planned Change |
| --- | --- |
| `src/llm/supported-model-definitions.ts` | Delete `deepseek-chat`, `deepseek-reasoner`, and `kimi-k2.5` definitions. Keep retained DeepSeek/Kimi definitions unchanged. |
| `src/llm/api/deepseek-llm.ts` | Change implicit default from `deepseek-chat` to retained `deepseek-v4-flash`. Keep `DeepSeekChatRenderer` because retained DeepSeek models still use the provider's chat-completions transport and reasoning-content replay. |
| `src/llm/api/kimi-llm.ts` | Change implicit default from `kimi-k2.5` to `kimi-k2.6`; remove `kimi-k2.5` from Kimi tool-safe non-thinking normalization. |
| `src/llm/metadata/curated-model-metadata.ts` | Delete curated metadata entries for removed identifiers. |
| Unit/integration tests | Update expectations to retained defaults/catalog and add negative assertions for removed identifiers. |
| `autobyteus-ts/docs/**` | Stage 9: sync model catalog and provider behavior docs after validation passes. |

## Separation of Concerns

- Model availability remains centralized in `supported-model-definitions.ts`.
- Provider constructor defaults only select retained safe defaults; they do not maintain deprecated aliases.
- Metadata providers enrich only models explicitly listed by the catalog; removing curated entries prevents docs/tests from preserving deprecated support intent.
- Historical ticket evidence is immutable and excluded from docs cleanup.

## Validation Plan

- Run targeted Vitest suites:
  - `tests/unit/llm/api/kimi-llm.test.ts`
  - `tests/unit/llm/api/openai-compatible-llm.test.ts`
  - `tests/unit/llm/metadata/model-metadata-resolver.test.ts`
  - `tests/integration/llm/llm-factory-metadata-resolution.test.ts`
- Run `pnpm --dir autobyteus-ts build`.
- Run repository grep outside archived ticket history for removed identifiers.

## Execution Tracking

| Item | Status | Evidence |
| --- | --- | --- |
| Remove built-in `deepseek-chat` / `deepseek-reasoner` definitions | Complete | `src/llm/supported-model-definitions.ts` |
| Remove built-in `kimi-k2.5` definition | Complete | `src/llm/supported-model-definitions.ts` |
| Remove curated metadata for removed identifiers | Complete | `src/llm/metadata/curated-model-metadata.ts` |
| Change no-argument defaults to retained models | Complete | `src/llm/api/deepseek-llm.ts`, `src/llm/api/kimi-llm.ts` |
| Remove Kimi 2.5-specific normalization coverage | Complete | `src/llm/api/kimi-llm.ts`, `tests/unit/llm/api/kimi-llm.test.ts` |
| Update model metadata/factory tests with absence assertions | Complete | `tests/unit/llm/metadata/model-metadata-resolver.test.ts`, `tests/integration/llm/llm-factory-metadata-resolution.test.ts` |
| Rename Kimi stream-boundary test away from K2.5-specific naming | Complete | `tests/integration/agent/streaming/kimi-tool-id-event-stream-boundary.test.ts` |

## Stage 6 Verification

- `pnpm --dir autobyteus-ts exec vitest --run tests/unit/llm/api/kimi-llm.test.ts tests/unit/llm/api/openai-compatible-llm.test.ts tests/unit/llm/metadata/model-metadata-resolver.test.ts tests/integration/llm/llm-factory-metadata-resolution.test.ts tests/integration/agent/streaming/kimi-tool-id-event-stream-boundary.test.ts` — Pass, 5 files / 29 tests.
- `pnpm --dir autobyteus-ts build` — Pass, including runtime dependency verification.

