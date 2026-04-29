# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Requirements refined; code/provider investigation complete enough for design and architecture review.
- Investigation Goal: Identify current `autobyteus-ts` provider model-catalog ownership, verify newest relevant model identifiers from current official sources, and design a focused catalog/test update path.
- Scope Classification (`Small`/`Medium`/`Large`): Medium
- Scope Classification Rationale: Multi-provider catalog update plus one provider-specific Anthropic request-shape adjustment and credential-gated integration testing. No broad provider subsystem redesign is needed.
- Scope Summary: Add latest confirmed model identifiers for Moonshot/Kimi, DeepSeek, OpenAI LLM/image, Google/Gemini TTS, and Anthropic into `autobyteus-ts`.
- Primary Questions Resolved:
  - Which model names are confirmed current public/API identifiers as of 2026-04-25?
  - Where does `autobyteus-ts` own model definitions for LLM, audio/TTS, and image providers?
  - Which tests assert model catalogs and provider integrations?
  - Does any new model require request-shape or SDK-version changes?

## Request Context

The user reported recent model launches: Kimi 2.6, a new DeepSeek model, a new OpenAI API model, OpenAI `gpt-image-2`, Gemini TTS 2.0 preview, and Anthropic 4.7. The user requested investigation of the newest models and support for them in `autobyteus-ts`. They also requested copying `.env.test` from the main checkout into the ticket worktree after bootstrap for later credential-gated integration tests; if credentials are invalid, catalog support should still be implemented without blocking on integration tests.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git superrepo
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-latest-provider-models`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-latest-provider-models/tickets/in-progress/autobyteus-ts-latest-provider-models`
- Current Branch: `codex/autobyteus-ts-latest-provider-models`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-latest-provider-models`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin --prune` completed successfully on 2026-04-25.
- Task Branch: `codex/autobyteus-ts-latest-provider-models`
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Base Commit: `cef8446452af13de1f97cf5c061c11a03443e944`
- Bootstrap Blockers: None.
- Notes For Downstream Agents: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-ts/.env.test` was copied to `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-latest-provider-models/autobyteus-ts/.env.test`, `chmod 600`, and remains ignored/untracked. Do not print or commit its contents.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-04-25 | Command | `pwd && git rev-parse --show-toplevel && git status --short --branch && git remote -v && git branch -vv --all --no-abbrev && git worktree list --porcelain` | Bootstrap repository/worktree state | Main checkout is branch `personal` tracking `origin/personal`; repo root is `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`; dedicated task worktree did not yet exist. | No |
| 2026-04-25 | Command | `git fetch origin --prune` | Refresh tracked refs before creating task branch/worktree | Completed successfully. `origin/HEAD` points to `origin/personal`. | No |
| 2026-04-25 | Command | `git worktree add -b codex/autobyteus-ts-latest-provider-models /Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-latest-provider-models origin/personal` | Create dedicated task worktree/branch | Worktree created at `origin/personal` commit `cef8446452af13de1f97cf5c061c11a03443e944`. | No |
| 2026-04-25 | Setup | `cp /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-ts/.env.test /Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-latest-provider-models/autobyteus-ts/.env.test && chmod 600 ...` | Satisfy user request for test credentials in ticket worktree | Copied `.env.test`; destination size 1629 bytes; status remained clean because file is ignored/untracked. | Use only for tests; do not disclose contents. |
| 2026-04-25 | Doc | `/Users/normy/autobyteus_org/autobyteus-agents/agent-teams/software-engineering-team/agents/solution-designer/SKILL.md` | Follow role workflow | Requires draft requirements and investigation notes during bootstrap, current-state read, design-principles-based design, and architecture reviewer handoff. | No |
| 2026-04-25 | Doc | `/Users/normy/autobyteus_org/autobyteus-agents/agent-teams/software-engineering-team/agents/solution-designer/design-principles.md` | Shared design authority | Emphasizes spine-first design, ownership boundaries, no backward-compatibility wrappers, explicit removal/decommission plan. | Applied in design. |
| 2026-04-25 | Web | https://developers.openai.com/api/docs/models | Verify current OpenAI model list | Official docs recommend `gpt-5.5` as flagship, show `gpt-5.5` model ID, 1M context, 128K max output, $5/$30 per 1M tokens, and list GPT Image 2 under image models. Speech-generation list still shows `gpt-4o-mini-tts`. | Add `gpt-5.5`; no new OpenAI speech endpoint model in scope. |
| 2026-04-25 | Web | https://developers.openai.com/api/docs/models/gpt-image-2 | Verify OpenAI image model | Official docs confirm `gpt-image-2`, image generation endpoint, image edit endpoint, image input/output, and snapshot `gpt-image-2-2026-04-21`. | Add `gpt-image-2`; verify image-size schema during implementation. |
| 2026-04-25 | Web | https://developers.openai.com/api/docs/models/gpt-5.5-pro | Check whether another new OpenAI model should be included | Official page confirms `gpt-5.5-pro` but documents long-running/background-mode guidance and says streaming is not supported on the model page. This conflicts with general compare table wording, so adding it would require capability/streaming handling beyond the normal catalog add. | Out of scope unless explicitly added with adapter guard/capability work. |
| 2026-04-25 | Web | https://platform.claude.com/docs/en/about-claude/models/overview | Verify latest Anthropic model, metadata, pricing | Official docs list Claude Opus 4.7, API ID/alias `claude-opus-4-7`, $5/$25 pricing, 1M context, 128K max output, adaptive thinking, no extended thinking. | Add `claude-opus-4.7` with value `claude-opus-4-7`. |
| 2026-04-25 | Web | https://platform.claude.com/docs/en/about-claude/models/whats-new-claude-4-7 | Verify Opus 4.7 request-shape changes | Official docs say fixed extended-thinking budgets return 400; use `thinking: { type: "adaptive" }`; non-default `temperature`, `top_p`, and `top_k` return 400; thinking content omitted by default unless display is requested. | Update `AnthropicLLM` request building/tests. |
| 2026-04-25 | Web | https://api-docs.deepseek.com/updates | Verify latest DeepSeek model IDs/deprecation | Official changelog dated 2026-04-24 says API supports V4-Pro and V4-Flash with model parameters `deepseek-v4-pro` and `deepseek-v4-flash`; legacy `deepseek-chat` and `deepseek-reasoner` discontinue on 2026-07-24 and currently map to V4 Flash modes. | Add V4 models; keep legacy names for now. |
| 2026-04-25 | Web | https://api-docs.deepseek.com/quick_start/pricing | Verify DeepSeek V4 metadata/pricing | Official docs list `deepseek-v4-flash`/`deepseek-v4-pro`, OpenAI base URL unchanged, Anthropic base URL alternative, 1M context, 384K max output, thinking/non-thinking support, pricing. | Add metadata/pricing; no base URL change. |
| 2026-04-25 | Web | https://api-docs.deepseek.com/guides/thinking_mode | Verify DeepSeek V4 config semantics | Official docs show OpenAI-format `thinking: { type: "enabled/disabled" }` and `reasoning_effort: "high/max"`; thinking mode defaults to enabled and ignores sampling parameters. | Optional config schema can expose these exact fields; adapter can already pass extra params. |
| 2026-04-25 | Web | https://platform.kimi.ai/docs/models | Verify Kimi latest model ID/deprecation | Official docs confirm `kimi-k2.6`, 256K context, visual/text input, thinking and non-thinking modes. They also note K2 series discontinuation on 2026-05-25. | Add `kimi-k2.6`; keep current K2 entries until deprecation task. |
| 2026-04-25 | Web | https://platform.kimi.ai/docs/pricing/chat-k26 | Verify Kimi K2.6 metadata/pricing context | Official docs describe Kimi K2.6 as latest/intelligent, 256K context, text/image/video input, thinking/non-thinking, ToolCalls, JSON Mode, Partial Mode, and search. Visible page did not expose numeric pricing values in fetched text. | Add metadata; do not invent unavailable pricing. |
| 2026-04-25 | Web | https://ai.google.dev/gemini-api/docs/speech-generation | Verify Gemini TTS model IDs | Official docs and examples use `gemini-3.1-flash-tts-preview`; supported-models list includes Gemini 3.1 Flash TTS Preview, Gemini 2.5 Flash Preview TTS, and Gemini 2.5 Pro Preview TTS. No official `gemini-2.0-tts-preview` ID was found. | Add current official Gemini TTS catalog entries and mappings. |
| 2026-04-25 | Code | `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-latest-provider-models/autobyteus-ts/package.json` | Determine package and test tooling | Package uses TypeScript, `openai ^6.16.0`, `@anthropic-ai/sdk ^0.78.0`, `@google/genai ^1.38.0`; `test` script is placeholder, but Vitest tests exist and can be run with `pnpm exec vitest run ...`. | Use focused Vitest commands and `pnpm run build`. |
| 2026-04-25 | Code | `autobyteus-ts/src/llm/supported-model-definitions.ts` | Locate static LLM catalog ownership | Current static entries include OpenAI `gpt-5.4`, `gpt-5.4-mini`; Anthropic `claude-opus-4.6`, `claude-sonnet-4.6`, `claude-haiku-4.5`; DeepSeek `deepseek-chat`, `deepseek-reasoner`; Gemini current LLMs; Kimi `kimi-k2.5`, `kimi-k2-thinking`. | Add new LLM definitions/schemas here. |
| 2026-04-25 | Code | `autobyteus-ts/src/llm/metadata/curated-model-metadata.ts` | Locate docs-backed token metadata | OpenAI and DeepSeek rely on curated metadata; current entries verified 2026-04-09. Anthropic/Gemini/Kimi also have curated fallback entries. | Add metadata entries for new static model values with `verifiedAt: '2026-04-25'`. |
| 2026-04-25 | Code | `autobyteus-ts/src/llm/api/openai-responses-llm.ts` and `autobyteus-ts/src/llm/api/openai-llm.ts` | Verify OpenAI adapter compatibility | OpenAI LLMs use Responses API; `OpenAIResponsesLLM` supports `reasoning_effort` and `reasoning_summary`. | `gpt-5.5` can follow existing adapter; `gpt-5.5-pro` would need extra capability decisions. |
| 2026-04-25 | Code | `autobyteus-ts/src/llm/api/anthropic-llm.ts` | Verify Anthropic adapter compatibility | Current code builds fixed-budget extended thinking from `thinking_enabled`/`thinking_budget_tokens` and injects `temperature = 0` when no thinking param. These are invalid for Opus 4.7. Current code also assigns internal extra params directly unless filtered. | Refactor request-building helpers for model-aware Opus 4.7 behavior and internal-param filtering. |
| 2026-04-25 | Code | `autobyteus-ts/src/llm/api/deepseek-llm.ts` and `autobyteus-ts/src/llm/api/openai-compatible-llm.ts` | Verify DeepSeek adapter compatibility | DeepSeek adapter uses `OpenAICompatibleLLM` with base URL `https://api.deepseek.com`; generic adapter passes `kwargs` and `config.extraParams` through and extracts `reasoning_content`. | V4 models are catalog/metadata/schema additions; no base URL change. |
| 2026-04-25 | Code | `autobyteus-ts/src/llm/api/kimi-llm.ts` | Verify Kimi adapter compatibility | Kimi adapter uses base URL `https://api.moonshot.ai/v1`; tool workflows auto-disable thinking for `kimi-k2.5` if no explicit thinking override. | Add `kimi-k2.6` to the safe non-thinking set and tests. |
| 2026-04-25 | Code | `autobyteus-ts/src/multimedia/audio/audio-client-factory.ts` | Locate audio/TTS catalog ownership | Current static audio models are OpenAI `gpt-4o-mini-tts` and Gemini user-facing `gemini-2.5-flash-tts` value `gemini-2.5-flash-preview-tts`; shared Gemini TTS voices/schema exist. | Register new Gemini TTS entries reusing shared schema. |
| 2026-04-25 | Code | `autobyteus-ts/src/utils/gemini-model-mapping.ts` | Locate Gemini runtime mapping | TTS map already includes `gemini-2.5-flash-preview-tts` and `gemini-2.5-pro-preview-tts`; no 3.1 TTS mapping currently exists. | Add `gemini-3.1-flash-tts-preview` mapping; keep/add 2.5 Pro test coverage. |
| 2026-04-25 | Code | `autobyteus-ts/src/multimedia/image/image-client-factory.ts` and `autobyteus-ts/src/multimedia/image/api/openai-image-client.ts` | Locate image catalog/client ownership | Current OpenAI image model is `gpt-image-1.5`; client calls `images.generate` and `images.edit`, already passes model value, size/quality, output format/compression if present. | Add `gpt-image-2` in factory; client likely needs no API-shape change. |
| 2026-04-25 | Code | `autobyteus-ts/tests/...` | Locate affected tests | Unit/integration tests exist for model metadata, factories, Kimi, Anthropic, Gemini mapping/audio, OpenAI image, and provider smoke tests. | Update focused tests listed in design. |

## Current Behavior / Current Flow

### LLM model selection/use spine

1. Callers select a model identifier through runtime config or factory methods.
2. `src/llm/llm-factory.ts` builds `LLMModel` instances from `src/llm/supported-model-definitions.ts`.
3. `ModelMetadataResolver` enriches static definitions from live providers where available or from `src/llm/metadata/curated-model-metadata.ts`.
4. `LLMFactory.createLLM(modelIdentifier, configOverride)` instantiates the provider-specific `llmClass`.
5. Provider adapters call their APIs:
   - OpenAI uses `OpenAIResponsesLLM` via `OpenAILLM` and the Responses API.
   - Anthropic uses `AnthropicLLM` and the Messages API.
   - DeepSeek and Kimi extend `OpenAICompatibleLLM` and use OpenAI-compatible Chat Completions.

### Audio/TTS selection/use spine

1. Callers select audio model identifiers through tool/runtime config.
2. `AudioClientFactory.initializeRegistry()` registers static `AudioModel`s plus any Autobyteus-discovered remote models.
3. `AudioClientFactory.createAudioClient()` creates `OpenAIAudioClient` or `GeminiAudioClient`.
4. OpenAI calls `client.audio.speech.create`; Gemini calls `@google/genai` `generateContent` with `responseModalities: ['AUDIO']` and `speechConfig`.

### Image selection/use spine

1. Callers select image model identifiers through tool/runtime config.
2. `ImageClientFactory.initializeRegistry()` registers static `ImageModel`s plus any Autobyteus-discovered remote models.
3. `ImageClientFactory.createImageClient()` creates `OpenAIImageClient` or `GeminiImageClient`.
4. OpenAI calls `images.generate` for text-to-image and `images.edit` for edit workflows.

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-ts/src/llm/supported-model-definitions.ts` | Static LLM definitions, provider class selection, config schemas, default pricing | Single source for static LLM catalog | Add OpenAI, Anthropic, DeepSeek, and Kimi definitions here. |
| `autobyteus-ts/src/llm/metadata/curated-model-metadata.ts` | Docs-backed token/context metadata fallback | Current new-generation entries verified 2026-04-09 | Add 2026-04-25 metadata for new model values. |
| `autobyteus-ts/src/llm/api/anthropic-llm.ts` | Anthropic Messages API request shaping/response parsing | Current fixed-budget thinking and default temperature injection are incompatible with Opus 4.7 | Refactor request helpers and tests before adding Opus 4.7. |
| `autobyteus-ts/src/llm/api/kimi-llm.ts` | Kimi API base URL plus Kimi-specific tool workflow normalization | Auto-disable thinking set currently contains only `kimi-k2.5` | Include `kimi-k2.6` and test no override clobbering. |
| `autobyteus-ts/src/llm/api/deepseek-llm.ts` | DeepSeek API base URL and OpenAI-compatible adapter selection | Base URL remains correct for V4 | Catalog/schema/metadata additions only. |
| `autobyteus-ts/src/llm/api/openai-responses-llm.ts` | OpenAI Responses API request shaping/streaming | Supports `reasoning_effort`/`reasoning_summary` | `gpt-5.5` can use existing path. |
| `autobyteus-ts/src/multimedia/audio/audio-client-factory.ts` | Static audio model catalog and TTS parameter schemas | Only registers OpenAI `gpt-4o-mini-tts` and Gemini 2.5 Flash TTS | Register Gemini 3.1 Flash TTS Preview and 2.5 Pro TTS using shared schema. |
| `autobyteus-ts/src/utils/gemini-model-mapping.ts` | Runtime-specific Gemini model IDs for API-key vs Vertex | Has 2.5 Pro TTS mapping but no catalog entry; no 3.1 TTS mapping | Add/test 3.1 TTS mapping and cover 2.5 Pro mapping. |
| `autobyteus-ts/src/multimedia/image/image-client-factory.ts` | Static image model catalog and schema | Only OpenAI image model is `gpt-image-1.5` | Add `gpt-image-2`; keep 1.5. |
| `autobyteus-ts/src/multimedia/image/api/openai-image-client.ts` | OpenAI image generation/edit request path | Already uses model value dynamically and supports generate/edit endpoints | No expected API-shape change for `gpt-image-2`; verify size/quality schema. |
| `autobyteus-ts/tests/setup.ts` | Loads `.env.test` for Vitest | Finds local `.env.test` in package root | Copied env enables credential-gated integration tests without exposing values. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-04-25 | Setup | Copy `.env.test` to ticket worktree | Credential file available locally and untracked for later tests. | Integration validation can be credential-gated in the ticket worktree. |
| 2026-04-25 | Code read | `sed`/`rg` over target package files | Confirmed catalog ownership and provider adapter paths above. | Implementation can be tightly scoped. |

## External / Public Source Findings

| Provider | Confirmed Latest / Relevant Model(s) | Official Source | Notes |
| --- | --- | --- | --- |
| OpenAI LLM | `gpt-5.5` | https://developers.openai.com/api/docs/models | Add to OpenAI LLM catalog using Responses API path. |
| OpenAI image | `gpt-image-2` | https://developers.openai.com/api/docs/models/gpt-image-2 | Supports image generation and edit endpoints. |
| OpenAI speech | Existing `gpt-4o-mini-tts` remains the speech-generation model shown in current docs | https://developers.openai.com/api/docs/models | Do not add unrelated Chat Completions audio models to speech client. |
| Anthropic | `claude-opus-4-7` | https://platform.claude.com/docs/en/about-claude/models/overview and `/whats-new-claude-4-7` | Requires Opus 4.7 request-shape guard/refactor. |
| DeepSeek | `deepseek-v4-flash`, `deepseek-v4-pro` | https://api-docs.deepseek.com/updates and `/quick_start/pricing` | Existing base URL unchanged; legacy names deprecate 2026-07-24. |
| Kimi/Moonshot | `kimi-k2.6` | https://platform.kimi.ai/docs/models | 256K context, thinking/non-thinking modes; older K2 series deprecates 2026-05-25. |
| Gemini TTS | `gemini-3.1-flash-tts-preview`, `gemini-2.5-flash-preview-tts`, `gemini-2.5-pro-preview-tts` | https://ai.google.dev/gemini-api/docs/speech-generation | No official `gemini-2.0-tts-preview` ID found. |

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: Provider API access for live integration tests only.
- Required config, feature flags, env vars, or accounts: `.env.test` copied into `autobyteus-ts/.env.test` in the ticket worktree. Do not log values.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Dedicated worktree creation and `.env.test` copy recorded above.
- Cleanup notes for temporary investigation-only setup: `.env.test` should remain ignored and not be committed.

## Findings From Code / Docs / Data / Logs

1. Static LLM registration is centralized enough for catalog additions in `supported-model-definitions.ts` plus metadata additions in `curated-model-metadata.ts`.
2. Anthropic Opus 4.7 is the only confirmed model requiring adapter logic changes. Reusing the old fixed-budget thinking schema would be incorrect.
3. DeepSeek V4, Kimi K2.6, OpenAI `gpt-5.5`, and OpenAI `gpt-image-2` appear compatible with existing adapter/client families.
4. Gemini TTS support is catalog/mapping-driven; the shared TTS schema/voices can be reused for both new Gemini TTS entries.
5. Current tests are focused enough to extend rather than replace.
6. Current package `test` script is not useful; implementation should run targeted `pnpm exec vitest run ...` commands and build/type checks.

## Constraints / Dependencies / Compatibility Facts

- Work must occur in dedicated branch/worktree, not the main checkout.
- Latest model identifiers are time-sensitive and require current official verification if this task is picked up after a delay.
- Invalid/missing provider API credentials should not block catalog support.
- No secrets should be printed or committed.
- No fuzzy aliases should be added for unconfirmed names.
- Do not remove old DeepSeek/Kimi models in this task; schedule cleanup near/after official deprecation dates.

## Open Unknowns / Risks

- Some copied credentials may be invalid, expired, quota-limited, or lack access to the newest model IDs.
- OpenAI `gpt-5.5-pro` may be requested later, but adding it correctly may require model capability/streaming/background-mode handling beyond this catalog task.
- OpenAI image size/quality schema may need adjustment for `gpt-image-2`; implementation should verify against SDK/docs before widening or reusing enums.
- Numeric Kimi K2.6 pricing did not appear in fetched official docs text; avoid inventing pricing if implementation cannot verify it.

## Notes For Architecture Reviewer

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-latest-provider-models/tickets/done/autobyteus-ts-latest-provider-models/requirements.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-latest-provider-models/tickets/done/autobyteus-ts-latest-provider-models/design-spec.md`
- Key review focus: Anthropic Opus 4.7 request-shape design, whether excluding `gpt-5.5-pro` is acceptable for this scoped task, and whether Gemini TTS naming (`name` vs API `value`) is clear enough for the catalog surface.
