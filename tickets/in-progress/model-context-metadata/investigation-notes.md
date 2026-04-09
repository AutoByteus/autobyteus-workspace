# Investigation Notes

## Investigation Status

- Current Status: `In Progress`
- Scope Triage: `Medium`
- Triage Rationale: The ticket crosses `autobyteus-ts`, `autobyteus-server-ts`, and `autobyteus-web`, and it requires provider-specific external API research. The scope is still bounded to model metadata contracts and discovery/normalization rather than full runtime execution changes.
- Investigation Goal: Determine how model context metadata should be normalized, sourced, and exposed end to end before implementing context-based abort/cancel behavior.
- Primary Questions To Resolve:
  - Where does context-window metadata already exist in the current codebase, and where is it lost?
  - Which providers/runtimes expose machine-readable context or output ceilings through official APIs?
  - Which providers require curated catalog metadata because the official API does not expose the needed fields?
  - What shared contract changes are needed so server and frontend can use the metadata?

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-04-09 | Code | `autobyteus-ts/src/llm/models.ts` | Check the canonical shared model contract | `LLMModel` already stores `maxContextTokens`, but `ModelInfo` and `toModelInfo()` do not expose it; unknown models silently inherit `defaultConfig.tokenLimit ?? 200000` | Yes |
| 2026-04-09 | Code | `autobyteus-ts/src/agent/token-budget.ts` | Verify whether token budgeting already depends on model metadata | Budgeting already prefers `model.maxContextTokens`, so the system conceptually expects trustworthy model ceilings | No |
| 2026-04-09 | Code | `autobyteus-ts/src/llm/llm-factory.ts` | Audit hardcoded cloud catalog behavior | Only some hardcoded models set `tokenLimit`; many rely on the implicit `200000` fallback, making the metadata inconsistent and likely inaccurate | Yes |
| 2026-04-09 | Code | `autobyteus-ts/src/llm/lmstudio-provider.ts` | Check how LM Studio models are discovered | Discovery uses the OpenAI-compatible `/v1/models` path via the OpenAI client, which only yields OpenAI-style basic model identity and drops LM Studio native context metadata | Yes |
| 2026-04-09 | Code | `autobyteus-ts/src/llm/ollama-provider.ts` | Check how Ollama models are discovered | Discovery uses `list()` only and does not call `show()` per model, so model-specific context metadata is never populated | Yes |
| 2026-04-09 | Code | `autobyteus-ts/src/llm/autobyteus-provider.ts` | Check how Autobyteus server-provided models are normalized | Provider parses `LLMConfig.tokenLimit`, but if absent it forces `8192`, which can hide unknown metadata behind an inaccurate default | Yes |
| 2026-04-09 | Code | `autobyteus-server-ts/src/api/graphql/types/llm-provider.ts` | Determine whether the server exposes model context data today | GraphQL `ModelDetail` maps only the current `ModelInfo` fields; there is no context metadata in the server contract | Yes |
| 2026-04-09 | Code | `autobyteus-web/stores/llmProviderConfig.ts`, `autobyteus-web/graphql/queries/llm_provider_queries.ts` | Determine whether the frontend can consume model context data today | Frontend query/store types mirror the GraphQL shape and currently have nowhere to carry context metadata | Yes |
| 2026-04-09 | Code | `autobyteus-ts/tests/integration/llm/models.test.ts`, `autobyteus-server-ts/tests/unit/api/graphql/types/llm-provider.test.ts` | Identify baseline test coverage for the shared model contract | Tests cover only the minimal existing fields, so this ticket will need contract and mapping test expansion | Yes |
| 2026-04-09 | Command | `rg -n "tokenLimit|maxContextTokens|defaultMaxContext|200000|8192" autobyteus-ts/src/llm autobyteus-ts/src/agent` | Locate fallback behavior and token-budget usage | Confirmed the `200000` and `8192` fallback paths and the current budget consumer | No |
| 2026-04-09 | Web | `https://platform.openai.com/docs/api-reference/models/list` | Confirm whether OpenAI’s Models API exposes context metadata | The official Models API returns only basic model object fields such as `id`, `created`, and `owned_by`; context/output ceilings are not part of the machine-readable endpoint | Yes |
| 2026-04-09 | Web | `https://developers.openai.com/api/docs/models`, `https://developers.openai.com/api/docs/models/gpt-5` | Check whether OpenAI publishes context/output limits elsewhere officially | OpenAI model docs pages publish context window and max output tokens, but that information is in model docs/catalog pages rather than the generic Models API | Yes |
| 2026-04-09 | Web | `https://ai.google.dev/api/models` | Confirm Gemini machine-readable model metadata | Gemini `models.get` / `models.list` explicitly document `inputTokenLimit` and `outputTokenLimit` in the `Model` resource | No |
| 2026-04-09 | Web | `https://docs.mistral.ai/api/endpoint/models` | Confirm Mistral machine-readable model metadata | Mistral `/v1/models` and `/v1/models/{model_id}` document `max_context_length` in the response body | No |
| 2026-04-09 | Web | `https://docs.ollama.com/api-reference/show-model-details`, `https://docs.ollama.com/api/ps` | Confirm Ollama machine-readable model metadata | `POST /api/show` exposes serialized `parameters` including `num_ctx` and structured `model_info` fields such as `<architecture>.context_length`; `GET /api/ps` exposes loaded model `context_length` | No |
| 2026-04-09 | Web | `https://lmstudio.ai/docs/developer/rest/list`, `https://lmstudio.ai/docs/developer/openai-compat/models`, `https://lmstudio.ai/docs/typescript/model-info/get-context-length` | Confirm LM Studio native vs OpenAI-compatible metadata behavior | LM Studio native `GET /api/v1/models` exposes `max_context_length` and loaded-instance `config.context_length`; the OpenAI-compatible `GET /v1/models` docs only promise standard model listing semantics | No |
| 2026-04-09 | Web | `https://docs.x.ai/developers/rest-api-reference/inference/models` | Check whether xAI exposes richer machine-readable model metadata | `/v1/models` is minimal and `/v1/language-models` adds pricing/modality fields, but the documented language-model response does not clearly advertise context-window or max-output fields | Yes |
| 2026-04-09 | Web | `https://docs.anthropic.com/en/docs/about-claude/models`, `https://docs.anthropic.com/en/docs/build-with-claude/context-windows` | Check Anthropic context/output metadata availability | Anthropic publishes context window and max output in docs/overview pages and documents context-window behavior, but the investigation has not found an official machine-readable models endpoint carrying those limits | Yes |
| 2026-04-09 | Web | `https://platform.kimi.ai/docs/models`, `https://platform.kimi.ai/docs/api/list-models` | Verify whether Kimi exposes machine-readable token metadata | Kimi publishes model context in both docs and `GET /v1/models`, which returns `context_length`; the docs also note that `kimi-latest` was discontinued on January 28, 2026 | Yes |
| 2026-04-09 | Web | `https://api-docs.deepseek.com/quick_start/pricing`, `https://api-docs.deepseek.com/api/list-models` | Verify whether DeepSeek exposes machine-readable token metadata | DeepSeek docs publish current context and output limits for `deepseek-chat` and `deepseek-reasoner`, but the list-models API is too thin to serve as a reliable metadata source | Yes |
| 2026-04-09 | Web | `https://developers.openai.com/api/docs/models/gpt-5.2`, `https://developers.openai.com/api/docs/models/gpt-5.2-chat-latest` | Re-check whether OpenAI token limits are API-readable or docs-only | OpenAI still publishes context window and max output on per-model docs pages rather than through `GET /v1/models`; `gpt-5.2-chat-latest` is documented separately as a ChatGPT model line | Yes |
| 2026-04-09 | Web | `https://developers.openai.com/api/docs/guides/latest-model`, `https://developers.openai.com/api/docs/models/gpt-5.4-mini`, `https://developers.openai.com/api/docs/models/all` | Refresh current OpenAI support policy and limits | OpenAI now documents GPT-5.4 as the latest model and GPT-5.4 mini as the current low-cost sibling; GPT-5.4 introduces a 1M context window, so stale GPT-5.2 registry entries should be retired | Yes |
| 2026-04-09 | Web | `https://docs.anthropic.com/en/docs/about-claude/models/overview`, `https://platform.claude.com/docs/en/api/models` | Refresh Anthropic supported model names and API capabilities | Anthropic’s current overview centers on Claude Opus 4.1 and Claude Sonnet 4, while the public Models API and current SDK typings still expose only basic model identity fields, so token-limit metadata remains better handled as curated data for now | Yes |
| 2026-04-09 | Web | `https://ai.google.dev/gemini-api/docs/models`, `https://ai.google.dev/api/models` | Refresh Gemini supported model names and metadata strategy | Gemini 3 preview entries are deprecated or preview-only; the current stable text lineup is Gemini 2.5 Pro plus Gemini 2.5 Flash / Flash-Lite, and the official API still provides machine-readable token limits | Yes |
| 2026-04-09 | Web | `https://platform.moonshot.ai/docs/api/partial`, `https://platform.moonshot.ai/blog/posts/what-is-openclaw/` | Refresh Kimi supported model names and verify API host usage | Current Kimi usage examples point at `https://api.moonshot.ai/v1`; `kimi-latest` is stale, and the current public lineup centers on Kimi K2.5 plus current thinking variants | Yes |
| 2026-04-09 | Web | `https://api-docs.deepseek.com/updates` | Refresh DeepSeek current model naming | `deepseek-chat` and `deepseek-reasoner` remain the current API model names, but the underlying base model revisions change behind those stable identifiers | No |
| 2026-04-09 | Web | `https://docs.mistral.ai/getting-started/models`, `https://docs.mistral.ai/models/devstral-2-25-12` | Refresh Mistral supported model names and current IDs | The current Mistral lineup highlights Mistral Large 3 and Devstral 2; the registry should stop presenting `mistral-large-latest` as if it were the explicit current model ID | Yes |
| 2026-04-09 | Web | `https://docs.x.ai/developers/models`, `https://docs.x.ai/docs/guides/chat`, `https://docs.x.ai/docs/models?cluster=us-east-1%2F` | Refresh xAI/Grok supported model naming | xAI now documents Grok 4.20 as the newest flagship and still documents current fast/code entries such as `grok-code-fast-1`; the older `grok-4` and `grok-4-1-fast-*` entries are stale | Yes |
| 2026-04-09 | Web | `https://www.alibabacloud.com/help/doc-detail/2841718.html` | Refresh Qwen supported model naming | Alibaba Cloud Model Studio documents Qwen-Max as the best-performing model in the Qwen3 series, so the repo’s older preview/default mismatch should be cleaned up | Yes |
| 2026-04-09 | Web | `https://docs.bigmodel.cn/cn/guide/start/model-overview` | Refresh GLM supported model naming and limits | GLM-5.1 is the current flagship model and supersedes the registry’s older `glm-5` entry; the docs publish `200K` context and `128K` max output | Yes |
| 2026-04-09 | Web | `https://platform.minimax.io/docs/api-reference/text-m2-function-call-refer`, `https://platform.minimax.io/docs/guides/text-ai-coding-tools` | Refresh MiniMax supported model naming | The current MiniMax text coding lineup centers on `MiniMax-M2.7`, making the repo’s `MiniMax-M2.1` entry stale | Yes |
| 2026-04-09 | Code | `autobyteus-ts/src/llm/api/*.ts`, `autobyteus-ts/src/utils/gemini-model-mapping.ts`, targeted live tests | Identify all code paths that hardcode stale cloud-model IDs outside the shared registry | Several provider defaults, runtime mappings, and live/integration fixtures still reference removed or stale model IDs; the registry refresh must update those together to avoid hidden stale-entry regressions | Yes |

## Current Behavior / Codebase Findings

### Entrypoints And Boundaries

- Primary entrypoints:
  - `autobyteus-ts/src/llm/llm-factory.ts` initializes the model registry and registers both hardcoded cloud models and runtime-discovered local models.
  - `autobyteus-ts/src/llm/models.ts` defines `LLMModel` and the shared exported `ModelInfo` shape.
  - `autobyteus-server-ts/src/api/graphql/types/llm-provider.ts` projects `ModelInfo` into GraphQL `ModelDetail`.
  - `autobyteus-web/graphql/queries/llm_provider_queries.ts` and `autobyteus-web/stores/llmProviderConfig.ts` consume the GraphQL shape.
- Execution boundaries:
  - `autobyteus-ts` owns discovery, provider normalization, and token-budget source data.
  - `autobyteus-server-ts` owns API exposure of the model catalog.
  - `autobyteus-web` owns client-side consumption and display/selection.
- Owning subsystems / capability areas:
  - LLM runtime catalog and provider discovery in `autobyteus-ts/src/llm/`
  - runtime model catalog API in `autobyteus-server-ts/src/llm-management/` and GraphQL mapping
  - settings/runtime-selection UI in `autobyteus-web`
- Optional modules involved:
  - `autobyteus-ts/src/llm/utils/llm-config.ts`
  - `autobyteus-server-ts/src/llm-management/services/model-catalog-service.ts`
- Folder / file placement observations:
  - The metadata source of truth should stay in `autobyteus-ts` and flow outward; server and web should map or consume, not invent provider-specific limit logic.

### Relevant Files / Symbols

| Path | Symbol / Area | Current Responsibility | Finding / Observation | Ownership / Placement Implication |
| --- | --- | --- | --- | --- |
| `autobyteus-ts/src/llm/models.ts` | `LLMModel`, `ModelInfo`, `toModelInfo()` | Shared model contract and exported model info | `maxContextTokens` exists on the model instance but is absent from the exported model info contract | This file should own any normalized context metadata fields |
| `autobyteus-ts/src/llm/llm-factory.ts` | `initializeRegistry()` | Hardcoded cloud catalog + runtime discovery registration | Hardcoded models mix explicit limits with implicit generic fallback behavior | Curated metadata likely belongs here for docs-only providers |
| `autobyteus-ts/src/llm/lmstudio-provider.ts` | `getModels()` | LM Studio runtime discovery | Uses OpenAI-compatible list API, which is the wrong metadata source for LM Studio context details | Provider should switch to LM Studio native model-list endpoint or direct SDK/API access |
| `autobyteus-ts/src/llm/ollama-provider.ts` | `getModels()` | Ollama runtime discovery | Lists models but never queries per-model details via `/api/show` | Provider should enrich discovery with per-model detail calls |
| `autobyteus-ts/src/llm/autobyteus-provider.ts` | `parseLLMConfig()` | Autobyteus server model normalization | Fallback `8192` masks missing token metadata | Unknown should likely remain unknown unless the server guarantees a real limit |
| `autobyteus-ts/src/agent/token-budget.ts` | `resolveTokenBudget()` | Calculates compaction/input budgets | Already uses `model.maxContextTokens`, which means metadata fixes unlock better budgeting immediately | Keep this logic consuming normalized metadata rather than per-provider special cases |
| `autobyteus-ts/src/llm/api/*.ts`, `autobyteus-ts/src/utils/gemini-model-mapping.ts`, provider live tests | direct provider defaults / runtime mappings / fixtures | Hardcoded provider model IDs outside the central registry | Several of these direct call sites still point at stale or deprecated cloud-model IDs | The latest-only support policy must sweep these alongside the authoritative registry |
| `autobyteus-server-ts/src/api/graphql/types/llm-provider.ts` | `ModelDetail`, `mapLlmModel()` | Server API projection of model info | No fields exist for context or output ceilings | Server contract must expand when `ModelInfo` expands |
| `autobyteus-web/graphql/queries/llm_provider_queries.ts` | `GET_AVAILABLE_LLM_PROVIDERS_WITH_MODELS` | Fetches provider/model catalog | Query currently requests only identity/runtime/config-schema fields | Query and generated types must expand with new metadata |
| `autobyteus-web/stores/llmProviderConfig.ts` | `ModelInfo` store interface | Frontend catalog storage and model lookup helpers | Store contract currently cannot carry context metadata | Frontend model-selection/state code can consume new metadata once exposed |
| `autobyteus-ts/tests/integration/llm/models.test.ts` | `toModelInfo includes identifier and provider` | Minimal shared-model contract test | Existing test coverage is too narrow for new metadata | Add tests here for shared model contract expansion |

### Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-04-09 | Probe | `rg -n "tokenLimit|maxContextTokens|defaultMaxContext|200000|8192" autobyteus-ts/src/llm autobyteus-ts/src/agent` | Located the exact fallback and budgeting paths in `models.ts`, `token-budget.ts`, `llm-factory.ts`, and `autobyteus-provider.ts` | The codebase already has a single place to normalize the metadata, but current defaults are too optimistic |
| 2026-04-09 | Probe | Read `autobyteus-ts/src/llm/lmstudio-provider.ts` against LM Studio docs | The provider uses the OpenAI-compatible list endpoint, not LM Studio’s richer native model-list endpoint | LM Studio metadata enrichment likely requires a provider implementation change, not just a type change |
| 2026-04-09 | Probe | Read `autobyteus-ts/src/llm/ollama-provider.ts` against Ollama docs | The provider never calls `show()` for the listed models | Ollama discovery likely needs a secondary per-model detail fetch |
| 2026-04-09 | Probe | Read `autobyteus-server-ts/src/api/graphql/types/llm-provider.ts`, `autobyteus-web/graphql/queries/llm_provider_queries.ts`, and `autobyteus-web/stores/llmProviderConfig.ts` together | The shared contract expansion will require parallel updates in server GraphQL mapping, web query documents, and frontend store/types | This ticket is inherently cross-package even if the source of truth remains in `autobyteus-ts` |

### External Code / Dependency Findings

- Upstream docs / APIs examined:
  - OpenAI Models API and model catalog pages
  - Gemini `models` API reference
  - Mistral models API reference
  - Ollama show-model-details API reference
  - LM Studio native REST and model-info docs
  - xAI inference model docs
  - Anthropic model/context-window docs
- Version / tag / commit / release:
  - Web docs as of `2026-04-09`
- Relevant behavior, contract, or constraint learned:
  - OpenAI publishes model context/output in docs pages, but the generic Models API does not include those fields.
  - OpenAI’s current latest text lineup is GPT-5.4 plus GPT-5.4 mini, and GPT-5.4 now exposes a 1M context window in the official docs.
  - Gemini exposes `inputTokenLimit` and `outputTokenLimit` machine-readably.
  - Gemini 3 preview model entries are no longer the right supported defaults; current stable text entries are in the Gemini 2.5 family.
  - Mistral exposes `max_context_length` machine-readably.
  - Kimi exposes `context_length` machine-readably via `GET /v1/models`.
  - DeepSeek publishes current limits in docs pages, but its list-models endpoint does not document matching machine-readable fields.
  - Anthropic’s current supported model names are newer than the repo’s `4.5` entries, but the public Models API/SDK typing remains too thin to replace curated token metadata safely in this ticket.
  - xAI, Qwen, GLM, and MiniMax all have stale supported IDs in the registry today; each needs either a refreshed current ID plus curated metadata or a stronger live resolver in a later ticket.
  - Ollama exposes both runtime `num_ctx` settings and model `context_length` metadata via `show`.
  - LM Studio exposes native context metadata through its own REST/SDK surfaces, but its OpenAI-compatible model list is not the rich metadata path.
  - Kimi’s provider wrapper and metadata resolver currently disagree on the official API host, so the latest-only refresh should align them on the current Moonshot endpoint.
- Confidence and freshness:
  - High confidence for the cited official docs above.

### Reproduction / Environment Setup

- Required services, mocks, or emulators:
  - None for the initial investigation; this phase was documentation and code-path analysis.
- Setup commands that materially affected the investigation:
  - `git remote show origin`
  - `git fetch origin --prune`
  - `git worktree add -b codex/model-context-metadata /Users/normy/autobyteus_org/autobyteus-worktrees/model-context-metadata origin/personal`
- Cleanup notes for temporary investigation-only setup:
  - Dedicated worktree created at `/Users/normy/autobyteus_org/autobyteus-worktrees/model-context-metadata`

## External / Internet Findings

| Source | Fact / Constraint | Why It Matters | Confidence / Freshness |
| --- | --- | --- | --- |
| `https://platform.openai.com/docs/api-reference/models/list` | OpenAI `GET /v1/models` returns basic model object fields such as `id`, `created`, and `owned_by` | OpenAI model context limits cannot be sourced generically from the Models API today | High / 2026-04-09 |
| `https://developers.openai.com/api/docs/models` | OpenAI model catalog pages publish per-model context window and max output tokens | OpenAI metadata likely needs curated docs-backed catalog values rather than runtime API discovery | High / 2026-04-09 |
| `https://developers.openai.com/api/docs/guides/latest-model`, `https://developers.openai.com/api/docs/models/gpt-5.4-mini` | GPT-5.4 is the documented latest OpenAI model and GPT-5.4 mini is the current low-cost sibling; GPT-5.4 introduces a 1M context window | The supported OpenAI registry should retire GPT-5.2-era entries and move to the current GPT-5.4 family | High / 2026-04-09 |
| `https://ai.google.dev/api/models` | Gemini `Model` includes `inputTokenLimit` and `outputTokenLimit` | Gemini can use official machine-readable discovery for both input and output limits | High / 2026-04-09 |
| `https://ai.google.dev/gemini-api/docs/models` | Gemini 2.5 Pro, Gemini 2.5 Flash, and Gemini 2.5 Flash-Lite are current stable text models, while Gemini 3 preview entries are deprecated or preview-only | The supported Gemini registry should move off stale preview IDs and onto current stable text-model IDs | High / 2026-04-09 |
| `https://docs.mistral.ai/api/endpoint/models` | Mistral model responses include `max_context_length` | Mistral can use official machine-readable discovery for context limit | High / 2026-04-09 |
| `https://docs.mistral.ai/getting-started/models`, `https://docs.mistral.ai/models/devstral-2-25-12` | Current Mistral featured models are Mistral Large 3 and Devstral 2, with Devstral 2 publishing explicit context/pricing on its model page | The supported Mistral registry should use current explicit model IDs rather than stale/latest aliases | High / 2026-04-09 |
| `https://docs.ollama.com/api-reference/show-model-details`, `https://docs.ollama.com/api/ps` | Ollama `POST /api/show` returns supported/default metadata including `num_ctx` and `<architecture>.context_length`, while `GET /api/ps` returns currently loaded `context_length` | Ollama can expose both supported and active context when the model is loaded | High / 2026-04-09 |
| `https://lmstudio.ai/docs/developer/rest/list` | LM Studio native list endpoint documents `max_context_length` and loaded-instance `config.context_length` | LM Studio provider should use native REST metadata rather than the OpenAI-compatible model list when context data is needed | High / 2026-04-09 |
| `https://platform.moonshot.ai/docs/api/partial`, `https://platform.moonshot.ai/blog/posts/what-is-openclaw/` | Kimi’s current docs use `api.moonshot.ai` and current public model examples center on Kimi K2.5 plus current thinking families | The Kimi provider default and metadata resolver should align on the same official API host and current model IDs | High / 2026-04-09 |
| `https://api-docs.deepseek.com/updates` | `deepseek-chat` and `deepseek-reasoner` remain the current stable API model IDs while the backing base-model revisions evolve behind them | DeepSeek registry entries can stay on those stable IDs while curated metadata is refreshed as needed | High / 2026-04-09 |
| `https://docs.x.ai/developers/rest-api-reference/inference/models` | xAI `/v1/models` is minimal and `/v1/language-models` documents pricing/modality but not a clear context-window field | xAI may still require curated metadata or deeper provider-specific investigation | Medium / 2026-04-09 |
| `https://docs.anthropic.com/en/docs/about-claude/models/overview`, `https://platform.claude.com/docs/en/api/models` | Anthropic’s current model overview centers on Claude Opus 4.1 and Claude Sonnet 4, but the public Models API and current SDK typings still expose basic identity fields only | Anthropic model support should move to current IDs, but token-limit metadata is still safer as curated official data in this ticket | Medium / 2026-04-09 |
| `https://platform.kimi.ai/docs/api/list-models`, `https://platform.kimi.ai/docs/models` | Kimi `GET /v1/models` returns `context_length`, and the docs list current model contexts plus deprecations such as `kimi-latest` | Kimi is a good candidate for live metadata resolution while keeping support allowlisting explicit | High / 2026-04-09 |
| `https://api-docs.deepseek.com/quick_start/pricing`, `https://api-docs.deepseek.com/api/list-models` | DeepSeek currently documents `128K` context and current output defaults/maximums for `deepseek-chat` and `deepseek-reasoner`, but not through a rich model-metadata endpoint | DeepSeek likely needs curated official metadata rather than runtime discovery | High / 2026-04-09 |
| `https://www.alibabacloud.com/help/doc-detail/2841718.html` | Qwen-Max is documented as the best-performing model in the Qwen3 series | Qwen support should use the current Qwen3-series identifier set rather than stale preview/default mismatches | Medium / 2026-04-09 |
| `https://docs.bigmodel.cn/cn/guide/start/model-overview` | GLM-5.1 is the current flagship with published 200K context and 128K max output | GLM support should move from `glm-5` to `glm-5.1` and can use curated official metadata in the interim | High / 2026-04-09 |
| `https://platform.minimax.io/docs/api-reference/text-m2-function-call-refer`, `https://platform.minimax.io/docs/guides/text-ai-coding-tools` | MiniMax current examples use `MiniMax-M2.7` | MiniMax support should move from `MiniMax-M2.1` to the current M2.7 entry | High / 2026-04-09 |

## Constraints

- Technical constraints:
  - The shared `ModelInfo` contract is consumed across packages, so schema expansion must be coordinated.
  - Token budgeting already depends on `maxContextTokens`, so silent fallback values can cause incorrect runtime decisions.
  - Local runtime providers differ materially in what they expose through OpenAI-compatible versus native APIs.
- Environment constraints:
  - The repo has existing unrelated changes in the original worktree, so this ticket is isolated in a dedicated worktree/branch.
- Third-party / API constraints:
  - Not every provider exposes machine-readable context or output ceilings.
  - Some providers publish limits only in docs pages, which means runtime discovery cannot be the only strategy.

## Unknowns / Open Questions

- Unknown: Should the shared contract expose only `maxContextTokens`, or also `activeContextTokens`, `maxInputTokens`, and `maxOutputTokens` when available?
- Why it matters: The contract shape determines whether local runtime-loaded ceilings and provider max-output limits can be used directly by later tickets such as abort/cancel and compaction policies.
- Planned follow-up: Resolve during requirements/design after inventorying the provider-specific data that can actually be sourced reliably.

- Unknown: Which of `DEEPSEEK`, `GROK`, `KIMI`, `QWEN`, `GLM`, and `MINIMAX` have official machine-readable limit endpoints suitable for discovery?
- Why it matters: These providers are represented in the hardcoded catalog today and may need either runtime fetchers or curated values.
- Planned follow-up: Continue provider-specific doc review during Stage 1 before locking requirements.

- Unknown: Should the product registry remain a static supported-model allowlist even when some providers expose live model metadata endpoints?
- Why it matters: A live resolver can remove hardcoded token ceilings without forcing the app to auto-support every newly released provider model.
- Planned follow-up: Resolve in Stage 2 requirements and Stage 3 design so support policy and metadata sourcing are not conflated.

- Unknown: Should unknown provider metadata remain `null` in the shared contract, or should the system maintain a smaller curated fallback table as a compatibility bridge?
- Why it matters: This determines whether existing model-selection and compaction flows become more truthful immediately or risk breaking assumptions about always-present numbers.
- Planned follow-up: Resolve in Stage 2 requirements and Stage 3 design with explicit backward-compatibility handling.

## Implications

### Requirements Implications

- The ticket should explicitly require truthful metadata over optimistic defaults.
- The requirements should distinguish supported-model registry ownership from provider metadata sourcing.
- The requirements should also cover refreshing the explicit supported cloud-model registry itself, not only the metadata plumbing beneath it.
- The requirements should distinguish provider-discovered metadata from curated catalog metadata.
- The requirements should specify how unknown values are represented and consumed.

### Design Implications

- The source of truth should remain `autobyteus-ts` `LLMModel` / `ModelInfo`, with provider-specific discovery/normalization populating the contract there.
- The design should keep a static supported-model registry while moving token-limit sourcing into provider-specific metadata resolvers where official endpoints exist.
- The design should apply a latest-only support policy to that static cloud registry, removing deprecated or stale cloud-model IDs and updating provider defaults/tests in lockstep.
- The design likely needs separate fields for maximum supported context and currently active runtime context where local runtimes expose both.
- The design should avoid treating OpenAI-compatible `/v1/models` as sufficient for providers that have richer native model-list endpoints.

### Implementation / Placement Implications

- LM Studio implementation likely needs a native REST client path rather than the current OpenAI-compatible model list.
- Ollama implementation likely needs per-model `show` enrichment after `list()`.
- Supported cloud-model implementation work now also needs one coordinated stale-ID sweep across the static registry, provider defaults, metadata lookup keys, and hardcoded live/integration fixtures.
- Server GraphQL types, frontend query documents, generated GraphQL types, and frontend store interfaces must all be updated together with the shared contract.

## Re-Entry Additions

Append new dated evidence here when later stages reopen investigation.
