# Investigation Notes

## Investigation Status

- Bootstrap Status: Completed in dedicated task worktree.
- Current Status: Analysis updated with live Anthropic runtime failure reproduction; implementation changes exist in the worktree but require design-review rerouting for the new provider-boundary bug.
- Investigation Goal: Verify Anthropic's current model support/pricing, inspect AutoByteus's Anthropic model/pricing definitions, and diagnose the reported Anthropic `logicalConversationId` runtime error.
- Scope Classification (`Small`/`Medium`/`Large`): Medium if implemented.
- Scope Classification Rationale: Current model catalog update would be small by line count, but safe support requires request-shape, pricing, metadata, tests, and docs updates.
- Scope Summary: User screenshot shows Anthropic provider with `claude-opus-4.7`, `claude-opus-4.8`, and `claude-sonnet-4.6`; user asks whether Anthropic now supports Sonnet 4.8 and mentions Fable/cost concerns.
- Primary Questions Resolved:
  - Does Anthropic currently support `claude-sonnet-4.8`? No official source found; current latest Sonnet is `claude-sonnet-5`.
  - Does Anthropic support Fable? Yes, official docs show `claude-fable-5` generally available on the Claude API.
  - What Anthropic models does AutoByteus currently support? Built-in API catalog has `claude-opus-4.8`, `claude-opus-4.7`, `claude-sonnet-4.6`.
  - Where is pricing maintained? Built-in `LLMConfig.pricingConfig` entries in `autobyteus-ts/src/llm/supported-model-definitions.ts`, consumed by `LLMFactory.getModelPricingInfo` and server token usage pricing.
  - Why does the live Claude runtime fail with `logicalConversationId: Extra inputs are not permitted`? `LlmPhase` intentionally passes `logicalConversationId` as an internal runtime kwarg, but `AnthropicLLM` forwards raw kwargs into the Anthropic Messages API request instead of filtering internal coordination fields.

## Request Context

User request on 2026-07-07: "we support anthropic models. as you can see, does anthropic support sonnet 4.8 now? could you have a look, they even support  fable now, but api costs are damn expensive, please analyse."

Follow-up user request on 2026-07-07: reported a live Claude LLM error and asked to investigate by running Claude LLM integration tests. The screenshot error text was:

`Error in Anthropic streaming: Error: 400 {"type":"error","error":{"type":"invalid_request_error","message":"logicalConversationId: Extra inputs are not permitted"}...}`

Reference image: `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_89f0d9facfa64cbb9094770ff865c45e/solution_designer_ffedfa3362ac4b1281a4373281032034/context_files/ctx_8e96f0707f4b__image.png`

Screenshot visible observations:
- API Key Management page.
- Provider list includes Anthropic count `3` and provider panel status `Not Configured`.
- Anthropic model cards shown: `claude-opus-4.7`, `claude-opus-4.8`, `claude-sonnet-4.6`.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git.
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-model-pricing-analysis`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-model-pricing-analysis/tickets/done/anthropic-model-pricing-analysis`
- Current Branch: `codex/anthropic-model-pricing-analysis`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-model-pricing-analysis`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin personal` succeeded on 2026-07-07.
- Task Branch: `codex/anthropic-model-pricing-analysis`
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None.
- Notes For Downstream Agents: Do not use the user's shared checkout at `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` for authoritative task artifacts or code changes.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-07-07 | Command | `pwd && git rev-parse --show-toplevel && git status --short --branch` in `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` | Bootstrap environment discovery | User checkout is branch `personal`; untracked local files exist, so a dedicated worktree is required. | No |
| 2026-07-07 | Command | `git remote show origin`, `git branch -vv --list personal`, `git worktree list --porcelain` | Resolve base branch and existing task worktree state | Remote default/base is `personal`; no exact existing Anthropic analysis worktree was found. | No |
| 2026-07-07 | Command | `git fetch origin personal` | Refresh tracked remote base | Fetch succeeded. | No |
| 2026-07-07 | Setup | `git worktree add -b codex/anthropic-model-pricing-analysis /Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-model-pricing-analysis origin/personal` | Create dedicated task worktree/branch | Worktree created at commit `06e0985b`. | No |
| 2026-07-07 | File | `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_89f0d9facfa64cbb9094770ff865c45e/solution_designer_ffedfa3362ac4b1281a4373281032034/context_files/ctx_8e96f0707f4b__image.png` | User-provided screenshot evidence | Shows Anthropic model cards `claude-opus-4.7`, `claude-opus-4.8`, `claude-sonnet-4.6`. | Compared with local code. |
| 2026-07-07 | Web | Search queries: `site:docs.anthropic.com Claude models Sonnet 4.8 Anthropic model names pricing`, `site:docs.anthropic.com claude-sonnet-4.8`, `Anthropic API pricing Claude Sonnet 4.8 Opus 4.8 official`; then official Anthropic/Claude docs. | Verify current Anthropic model names/pricing. | Official docs list latest models as Fable 5, Opus 4.8, Sonnet 5, Haiku 4.5; no official `claude-sonnet-4.8` found. | Re-check immediately before implementation. |
| 2026-07-07 | Web | `https://platform.claude.com/docs/en/about-claude/models/overview` | Official model IDs and current latest comparison. | Lists `claude-fable-5`, `claude-opus-4-8`, `claude-sonnet-5`, `claude-haiku-4-5-20251001`; notes model IDs are pinned snapshots. | Use for catalog/metadata. |
| 2026-07-07 | Web | `https://www.anthropic.com/news/claude-sonnet-5` | Official Sonnet 5 launch and API ID. | Sonnet 5 available on Claude Platform; developers can use `claude-sonnet-5`; introductory pricing through 2026-08-31. | Decide launch vs standard pricing representation. |
| 2026-07-07 | Web | `https://platform.claude.com/docs/en/about-claude/pricing` | Official token pricing. | Fable/Mythos 5 $10/$50 per MTok; Opus 4.8/4.7 $5/$25; Sonnet 5 $2/$10 through 2026-08-31 then $3/$15; Sonnet 4.6 $3/$15; current newer tokenizer can produce ~30% more tokens for same text. | Encode costs carefully. |
| 2026-07-07 | Web | `https://platform.claude.com/docs/en/about-claude/models/introducing-claude-fable-5-and-claude-mythos-5`; `https://www.anthropic.com/claude/fable` | Official Fable availability and behavior. | `claude-fable-5` generally available; $10/$50; 1M context/128k output; safety-classifier refusals/fallback/billing changes; 30-day data retention. | Decide if refusal/data-retention UX is in scope. |
| 2026-07-07 | Web | `https://platform.claude.com/docs/en/build-with-claude/adaptive-thinking`; `https://platform.claude.com/docs/en/build-with-claude/effort`; `https://platform.claude.com/docs/en/build-with-claude/extended-thinking` | Request-shape compatibility for current Anthropic models. | Opus 4.8/4.7 only support adaptive thinking, manual enabled budget returns 400; Sonnet 5 adaptive on by default and manual returns 400; Fable/Mythos adaptive always on; current models reject non-default sampling params. | Fix `AnthropicLLM` request-shaping. |
| 2026-07-07 | Code | `autobyteus-ts/src/llm/supported-model-definitions.ts` | Locate built-in Anthropic catalog and pricing source. | Anthropic rows currently are Opus 4.8, Opus 4.7, Sonnet 4.6. Pricing helper uses `pricingEffectiveDate: 2026-06-25`; Opus $5/$25, Sonnet 4.6 $3/$15 with cache dimensions. | Add Sonnet 5/Fable rows if approved. |
| 2026-07-07 | Code | `autobyteus-ts/src/llm/metadata/curated-model-metadata.ts` | Locate model context/output metadata. | Anthropic metadata currently covers Opus 4.8/4.7 and Sonnet 4.6 only. | Add Sonnet 5/Fable metadata if approved. |
| 2026-07-07 | Code | `autobyteus-ts/src/llm/api/anthropic-llm.ts` | Inspect provider request-shape owner. | `isClaudeOpus47` is the only adaptive/no-temperature predicate; all other Claude models can receive manual fixed-budget thinking and/or injected `temperature: 0`. This conflicts with official docs for Opus 4.8 and any Sonnet 5/Fable support. | Fix before adding new models. |
| 2026-07-07 | Code | `autobyteus-ts/src/llm/llm-factory.ts`; `autobyteus-server-ts/src/llm-management/providers/autobyteus-llm-model-provider.ts` | Inspect reload behavior. | Built-in models are constructed from static `supportedModelDefinitions`; targeted reload only supports LM Studio, AutoByteus, Ollama. Anthropic target reload returns current count. | Document/adjust UX copy if desired. |
| 2026-07-07 | Code | `autobyteus-ts/src/multimedia/audio/audio-client-factory.ts` | Check local `fable` occurrence. | `fable` is an OpenAI TTS voice string, not Claude Fable 5 model support. | No, unless adding Claude Fable. |
| 2026-07-07 | Code | `autobyteus-ts/docs/provider_model_catalogs.md`; `autobyteus-ts/docs/llm_module_design_nodejs.md` | Durable docs current-state check. | Docs mention Opus 4.7 request shape and latest model list but are stale for Opus 4.8/Sonnet 5/Fable. | Update docs during implementation. |
| 2026-07-07 | Setup | `cp /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-ts/.env.test /Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-model-pricing-analysis/autobyteus-ts/.env.test` | User said the main repo `.env.test` likely contains an Anthropic key; copy into ticket worktree for live integration tests. | Copied without printing secret values. A key-name-only check confirmed `ANTHROPIC_API_KEY` is present. | Keep secrets out of logs. |
| 2026-07-07 | Command | `pnpm exec vitest run tests/integration/llm/api/anthropic-llm.test.ts --reporter=verbose` in `autobyteus-ts` | Run existing Anthropic live integration coverage. | Passed all 4 existing tests. These tests call Anthropic without `logicalConversationId`, so they do not cover the reported runtime path. | Add runtime-kwarg coverage. |
| 2026-07-07 | Probe | Temporary live test `tmp-anthropic-logical-conversation-probe.test.ts` calling `llm.streamUserMessage(userMessage, { logicalConversationId: "agent_probe" })` with `claude-opus-4.7` | Reproduce reported error with a minimal runtime-style invocation. | Probe reproduced the expected Anthropic rejection pattern (`logicalConversationId` / extra input / invalid request). Temporary file was removed after the run. | Fix Anthropic kwarg filtering and add durable coverage. |
| 2026-07-07 | Code | `autobyteus-ts/src/agent/loop/llm-phase.ts` | Trace where `logicalConversationId` enters LLM calls. | `streamKwargs` is initialized as `{ logicalConversationId: agentId }` and then passed to `llmInstance.streamMessages(...)`; this is intentional for hosted AutoByteus LLM conversations. | External providers must filter it. |
| 2026-07-07 | Code | `autobyteus-ts/src/llm/api/anthropic-llm.ts` | Trace Anthropic request construction. | `applyAnthropicRequestParams()` copies provider extra params, then spreads all `kwargs` except `stream` into the SDK request before applying Anthropic policy. | Direct root cause of the live 400. |
| 2026-07-07 | Code | `autobyteus-ts/src/llm/api/openai-compatible-request-builder.ts` | Compare existing provider-boundary behavior. | Already filters `logicalConversationId`, `logical_conversation_id`, `conversationId`, `agentId`, `turnId`, `requestId`, and `renderedPayload`. | Shared sanitizer should own this repeated policy. |
| 2026-07-07 | Code | `autobyteus-ts/src/llm/api/mistral-llm.ts`, `autobyteus-ts/src/llm/api/gemini-llm.ts`, `autobyteus-ts/src/llm/api/ollama-llm.ts`, `autobyteus-ts/src/llm/api/openai-responses-llm.ts` | Check whether the leak is Anthropic-only. | Gemini/Ollama/OpenAI Responses do not generically spread arbitrary kwargs into a provider request in the same way. `MistralLLM` also spreads raw kwargs and has a latent similar risk. | Anthropic fix is mandatory; shared sanitizer can also prevent latent Mistral leak if kept small. |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: API Key Management UI `ProviderAPIKeyManager` / `ProviderModelBrowser` driven by `useLLMProviderConfigStore` querying `availableLlmProvidersWithModels`.
- Current execution flow:
  - Frontend store calls GraphQL `availableLlmProvidersWithModels` / reload mutations.
  - Server `LlmProviderService` / `AutobyteusModelCatalog` reads models from `AutobyteusLlmModelProvider`.
  - `AutobyteusLlmModelProvider` lists `LLMFactory.listAvailableModels()`.
  - `LLMFactory.initializeRegistry()` constructs models from static `supportedModelDefinitions`, merging live/curated metadata for those definitions only.
  - `ProviderModelBrowser` displays `model.modelIdentifier` in the default runtime.
- Ownership or boundary observations:
  - Static built-in catalog owner: `autobyteus-ts/src/llm/supported-model-definitions.ts`.
  - Model limit metadata owner: `autobyteus-ts/src/llm/metadata/*`.
  - Provider request-shape owner: `autobyteus-ts/src/llm/api/anthropic-llm.ts`.
  - Provider reload policy owner: `LLMFactory.reloadModels()` + server wrapper.
- Current behavior summary: UI now reflects worktree changes showing the expanded Anthropic catalog, but the live runtime path can still fail because agent-loop invocation kwargs leak into Anthropic request payloads. Reload still does not dynamically discover Anthropic API models.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Feature + bug fix.
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing invariant plus duplicated provider-boundary policy. The adapter must distinguish internal AutoByteus invocation kwargs from provider request kwargs.
- Refactor posture evidence summary: Existing provider adapter has a too-specific `isClaudeOpus47` predicate and no safe kwarg filtering boundary. New/current Anthropic models share adaptive-thinking/sampling restrictions that should be represented as provider-owned model capability predicates, and all external provider adapters need the same internal-kwarg deny-list behavior currently duplicated in the OpenAI-compatible request builder.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| User screenshot | Anthropic model list includes only three 4.x models. | Screenshot reflects current static catalog, not official latest Anthropic list. | Add models if approved. |
| `supported-model-definitions.ts` | Catalog includes Opus 4.8/4.7/Sonnet 4.6 only. | Missing Sonnet 5/Fable 5 support is local catalog staleness. | Yes |
| `anthropic-llm.ts` | Only `claude-opus-4-7` maps to adaptive thinking/no injected temp. | Opus 4.8 support is likely provider-invalid for default requests or thinking-enabled requests; adding Sonnet 5/Fable would inherit invalid behavior. | Yes |
| User runtime screenshot + live probe | Anthropic rejects `logicalConversationId` as an extra input. | Runtime-only kwargs are crossing the external provider boundary. | Yes |
| `agent/loop/llm-phase.ts` | `logicalConversationId` is attached for all LLM invocations. | The kwarg is intentional upstream and must be filtered by external adapters, not removed from the runtime. | Yes |
| `openai-compatible-request-builder.ts` | Maintains an internal kwarg deny-list for OpenAI-compatible providers. | The policy exists but is duplicated/fragmented; Anthropic missed it. | Yes |
| Official Anthropic adaptive thinking docs | Opus 4.8/4.7 reject manual thinking; Sonnet 5 rejects manual thinking and defaults adaptive; Fable always adaptive. | Provider adapter needs model-family request-shape invariants. | Yes |
| Official Anthropic pricing docs | Fable $10/$50, Opus $5/$25, Sonnet 5 intro $2/$10 then $3/$15. | Cost metadata must be explicit and Fable must not become a hidden default. | Yes |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-ts/src/llm/supported-model-definitions.ts` | Built-in API LLM model catalog, config schema, default pricing config. | Anthropic rows: Opus 4.8, Opus 4.7, Sonnet 4.6; no Sonnet 5/Fable 5. | Extend here if approved. |
| `autobyteus-ts/src/llm/metadata/curated-model-metadata.ts` | Docs-backed model context/output fallback metadata. | Anthropic metadata lacks Sonnet 5/Fable 5. | Extend here if approved. |
| `autobyteus-ts/src/llm/api/anthropic-llm.ts` | Anthropic Messages API request building, thinking params, streaming/sync handling, usage normalization hook. | Predicate only covers Opus 4.7; default temperature injection and manual thinking are wrong for Opus 4.8/latest models. | Fix provider invariant here. |
| `autobyteus-ts/src/agent/loop/llm-phase.ts` | Agent-loop LLM invocation assembly and runtime kwargs. | Adds `logicalConversationId` to `streamKwargs`. | Do not remove; this is required by `AutobyteusLLM`. |
| `autobyteus-ts/src/llm/api/openai-compatible-request-builder.ts` | OpenAI-compatible request payload construction. | Already filters internal runtime kwargs and controlled tool fields. | Reuse/extract this boundary rule instead of duplicating it again. |
| `autobyteus-ts/src/llm/api/mistral-llm.ts` | Mistral SDK request construction. | Also spreads raw kwargs; latent equivalent leak risk. | Consider applying the shared sanitizer if within small-scope implementation. |
| `autobyteus-ts/src/llm/llm-factory.ts` | Registry assembly, pricing lookup, dynamic reload policy. | Static catalog builds models; targeted reload excludes Anthropic. | Do not expect reload to discover Sonnet 5/Fable. |
| `autobyteus-server-ts/src/llm-management/providers/autobyteus-llm-model-provider.ts` | Server model provider wrapper and targeted reload policy. | Reloadable built-in providers are only LM Studio, AutoByteus, Ollama. | UI copy/docs may need clarity. |
| `autobyteus-ts/docs/provider_model_catalogs.md` | Durable provider catalog docs and request-shape contract. | Stale for current Anthropic rules/models. | Update during implementation. |
| `autobyteus-ts/src/multimedia/audio/audio-client-factory.ts` | Audio/TTS provider model definitions and voices. | `fable` is an OpenAI TTS voice. | Not relevant to Claude Fable 5. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-07-07 | Static probe | `rg -n "claude-(opus|sonnet|haiku|fable|mythos)|Anthropic|anthropic|Fable|fable" autobyteus-ts/src autobyteus-server-ts/src autobyteus-web` | Only code-level Fable hit in source is OpenAI TTS voice; Anthropic built-in model rows are static. | No current Claude Fable 5 support. |
| 2026-07-07 | Static probe | `nl -ba` on model and adapter files | Confirmed exact current rows/predicates/pricing. | Use as implementation evidence. |
| 2026-07-07 | Live integration test | `pnpm exec vitest run tests/integration/llm/api/anthropic-llm.test.ts --reporter=verbose` after copying `.env.test` | Existing direct Anthropic integration tests passed: simple completion, streaming, public send, public stream. | Existing coverage is valid but incomplete for agent-loop kwargs. |
| 2026-07-07 | Live focused probe | Temporary Vitest probe calling `streamUserMessage(..., { logicalConversationId: "agent_probe" })` | Anthropic rejected the request because `logicalConversationId` reached the provider request. | Confirms the screenshot root cause. |

## External / Public Source Findings

- `https://platform.claude.com/docs/en/about-claude/models/overview`
  - Freshness: consulted 2026-07-07.
  - Relevant contract: latest model comparison lists `claude-fable-5`, `claude-opus-4-8`, `claude-sonnet-5`, `claude-haiku-4-5-20251001` and their pricing/context/output summaries. Model IDs are pinned snapshots.
  - Why it matters: `claude-sonnet-4.8` is not the current documented Sonnet; `claude-sonnet-5` is.
- `https://www.anthropic.com/news/claude-sonnet-5`
  - Freshness: published 2026-06-30, consulted 2026-07-07.
  - Relevant contract: Sonnet 5 available on Claude Platform and developers can use `claude-sonnet-5`; launch price $2/$10 per MTok through 2026-08-31 then $3/$15.
  - Why it matters: corrects user question from Sonnet 4.8 to Sonnet 5.
- `https://platform.claude.com/docs/en/about-claude/pricing`
  - Freshness: consulted 2026-07-07.
  - Relevant contract: Fable/Mythos 5 $10 input/$50 output per MTok; Opus 4.8/4.7 $5/$25; Sonnet 5 intro $2/$10 then standard $3/$15; cache prices and batch discounts listed. Newer tokenizer produces about 30% more tokens for same text on newer models.
  - Why it matters: Fable is expensive; Sonnet 5 is the cost-aware latest Sonnet replacement.
- `https://platform.claude.com/docs/en/about-claude/models/introducing-claude-fable-5-and-claude-mythos-5` and `https://www.anthropic.com/claude/fable`
  - Freshness: consulted 2026-07-07.
  - Relevant contract: `claude-fable-5` generally available on Claude API; 1M context, 128k output, $10/$50; safety classifiers/refusal and fallback billing; data-retention caveat.
  - Why it matters: Fable support is more than a simple catalog row if product wants good UX.
- `https://platform.claude.com/docs/en/build-with-claude/adaptive-thinking`, `https://platform.claude.com/docs/en/build-with-claude/effort`, `https://platform.claude.com/docs/en/build-with-claude/extended-thinking`
  - Freshness: consulted 2026-07-07.
  - Relevant contract: adaptive thinking rules by model; Opus 4.8/4.7 reject manual fixed-budget thinking; Sonnet 5 defaults adaptive and rejects manual; Fable/Mythos adaptive always on. Current models reject non-default sampling parameters.
  - Why it matters: AutoByteus adapter must change before adding latest models safely.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: Existing Anthropic integration tests require Anthropic API access; unit coverage should still mock the SDK.
- Required config, feature flags, env vars, or accounts: `.env.test` was copied from the main checkout into the ticket worktree as user requested. `ANTHROPIC_API_KEY` was confirmed by key name only; no secret value was printed.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: dedicated worktree setup commands in source log.
- Cleanup notes for temporary investigation-only setup: Temporary live probe test file was removed after reproduction. Dedicated worktree can remain for implementation/review.

## Findings From Code / Docs / Data / Logs

### Official Anthropic support answer

- No official current model named `claude-sonnet-4.8` was found.
- Official current Sonnet model is `claude-sonnet-5`.
- Official current Fable model is `claude-fable-5` and it is expensive relative to Opus/Sonnet.

### AutoByteus model catalog answer

- Base-branch AutoByteus static catalog supported Anthropic:
  - `claude-opus-4.8` -> provider value `claude-opus-4-8`; price $5/$25 per MTok.
  - `claude-opus-4.7` -> provider value `claude-opus-4-7`; price $5/$25 per MTok.
  - `claude-sonnet-4.6` -> provider value `claude-sonnet-4-6`; price $3/$15 per MTok.
- The screenshot model list matches current code.
- The current task worktree now has unreviewed implementation edits that add `claude-fable-5` and `claude-sonnet-5`; those edits still need to incorporate the `logicalConversationId` boundary fix before downstream review can continue.

### Anthropic live runtime error answer

- The screenshot's `logicalConversationId: Extra inputs are not permitted` error is not an Anthropic model-catalog issue and not caused by Fable/Sonnet pricing metadata.
- Root cause: `LlmPhase` adds `logicalConversationId` as an internal runtime coordination kwarg; `AnthropicLLM.applyAnthropicRequestParams()` forwards raw kwargs into the Anthropic SDK request after deleting only `stream`.
- Expected target behavior:
  - `AutobyteusLLM` continues to require/use `logicalConversationId`.
  - External provider adapters filter internal kwargs before SDK request construction.
  - Anthropic still accepts provider-valid kwargs such as tools and valid `thinking` overrides.
- Existing Anthropic integration tests passed because they did not include runtime-style kwargs.

### Cost comparison snapshot (official docs consulted 2026-07-07)

| Model | API ID | Base input / MTok | Output / MTok | Cache read / MTok | 5m cache write / MTok | 1h cache write / MTok | Cost comment |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| Claude Fable 5 | `claude-fable-5` | $10 | $50 | $1 | $12.50 | $20 | 2x Opus 4.8 and ~3.33x standard Sonnet output price; only for hardest long-running work. |
| Claude Opus 4.8 | `claude-opus-4-8` | $5 | $25 | $0.50 | $6.25 | $10 | Premium but half of Fable. |
| Claude Opus 4.7 | `claude-opus-4-7` | $5 | $25 | $0.50 | $6.25 | $10 | Same price as Opus 4.8, likely less attractive if 4.8 is available. |
| Claude Sonnet 5 launch | `claude-sonnet-5` | $2 | $10 | $0.20 | $2.50 | $4 | Through 2026-08-31 only; best cost-performance if launch pricing applies. |
| Claude Sonnet 5 standard | `claude-sonnet-5` | $3 | $15 | $0.30 | $3.75 | $6 | Same headline price as Sonnet 4.6 after launch. |
| Claude Sonnet 4.6 | `claude-sonnet-4-6` | $3 | $15 | $0.30 | $3.75 | $6 | Current AutoByteus Sonnet; official docs now position Sonnet 5 as latest. |

Important cost caveats:
- Output tokens include thinking/reasoning tokens when adaptive thinking is used.
- `thinking.display: "omitted"` reduces visible thinking/latency, not billing.
- Newer tokenizer for Fable, Opus 4.7+, Mythos, and Sonnet 5 can produce about 30% more tokens for the same text, so effective workload cost may be higher than rate-card ratios alone imply.
- Fast mode for Opus is premium-priced and should not be defaulted.


### Detailed Anthropic pricing addendum (2026-07-07)

Anthropic pricing is not only base input/output. Official pricing includes prompt-cache dimensions and other modifiers:

- Standard model pricing columns: base input tokens, 5-minute cache writes, 1-hour cache writes, cache hits/refreshes, and output tokens.
- Prompt caching multipliers relative to base input:
  - 5-minute cache write = 1.25x base input price.
  - 1-hour cache write = 2x base input price.
  - Cache read/hit = 0.1x base input price.
  - Cache write is charged when content is first stored; cache read is charged on subsequent retrieval.
- Detailed current prices for target models:

| Model | API ID | Base input / MTok | 5m cache write / MTok | 1h cache write / MTok | Cache hit/read / MTok | Output / MTok | Batch input / MTok | Batch output / MTok | Notes |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Claude Fable 5 | `claude-fable-5` | $10 | $12.50 | $20 | $1 | $50 | $5 | $25 | Highest-cost GA Claude; 1M context at standard pricing; 30-day retention / refusal behavior. |
| Claude Opus 4.8 | `claude-opus-4-8` | $5 | $6.25 | $10 | $0.50 | $25 | $2.50 | $12.50 | Already in catalog, but request-shape fix needed. Fast Mode exists at $10/$50 before other modifiers. |
| Claude Sonnet 5 launch through 2026-08-31 | `claude-sonnet-5` | $2 | $2.50 | $4 | $0.20 | $10 | $1 | $5 | Introductory price only through 2026-08-31. |
| Claude Sonnet 5 standard from 2026-09-01 | `claude-sonnet-5` | $3 | $3.75 | $6 | $0.30 | $15 | $1.50 | $7.50 | Same headline standard rate as Sonnet 4.6, but newer tokenizer can increase token count. |

Additional modifiers and implementation facts:

- Batch API is a 50% discount on input/output tokens. Official table gives batch rows above. Need decide whether AutoByteus token usage pricing should support batch-specific pricing now or document it as out of scope if AutoByteus does not use Anthropic Batch API.
- Long-context pricing: Fable 5, Opus 4.8/4.7/4.6, Sonnet 5, and Sonnet 4.6 include the full 1M-token context window at standard pricing; a 900k-token request is billed at the same per-token rate as a 9k-token request.
- Data residency: for Opus 4.6, Sonnet 4.6, and later models, `inference_geo` US-only inference applies a 1.1x multiplier to all token categories, including input, output, cache writes, and cache reads.
- Fast Mode: Opus 4.8 fast mode is priced $10 input / $50 output per MTok, and modifiers stack. Fast Mode is not available with Batch API. AutoByteus should not enable this by default and should not represent fast-mode prices as base model prices.
- Tool use: tool schemas, tool_use blocks, and tool_result blocks add input/output tokens. Anthropic also lists tool-use system prompt overhead, e.g. Opus 4.8 with tools has 290 tokens for `auto`/`none` and 410 for `any`/`tool`; Sonnet 5 has 354 and 474 respectively. The Bash tool definition adds extra input tokens for Opus 4.7/4.8.
- Tokenizer: Opus 4.7+, Opus 4.8, Fable 5, Mythos, and Sonnet 5 use a newer tokenizer that can produce approximately 30% more tokens for the same text, depending on workload.

Implementation implication: the model catalog must store at least base input/output plus Anthropic-specific cache dimensions for the three target models. Batch/fast/data-residency may be separate pricing modes rather than the default `pricingConfig`; if not implemented immediately, docs should explicitly state that default token estimates are standard Claude API pricing, not Batch/Fast/US-only pricing.

## Constraints / Dependencies / Compatibility Facts

- Anthropic model names/prices can change; re-verify official docs at implementation time.
- Avoid compatibility aliases (`claude-sonnet-4.8` -> `claude-sonnet-5`) because the codebase's catalog docs reject fuzzy/unverified aliases.
- No backward compatibility wrapper is needed; this is a catalog/request-shape modernization.
- Do not default to Fable 5 because of cost and data-retention implications.
- Do not remove `logicalConversationId` from the agent loop; it belongs to the internal hosted-AutoByteus provider path.
- Do not print `.env.test` contents or API keys in logs.
- Do not use Fable for live validation because it is expensive and the reproduced bug is provider-boundary related, not Fable-specific.

## Open Unknowns / Risks

- Whether AutoByteus should include Fable 5 in the general model list or gate it behind explicit user opt-in/disclosure.
- Whether pricing should encode Sonnet 5 launch price, standard price, or a time-aware effective date transition.
- Whether Fable refusal handling should be minimal (surface `stop_reason: refusal`) or full fallback orchestration.
- Whether docs/UI copy should change the Reload Models wording for non-dynamic built-in providers.
- Whether to apply the shared internal-kwarg sanitizer to the latent `MistralLLM` raw-kwargs spread in this change or record it as a follow-up. Anthropic is mandatory because it is reproduced and user-reported.

## Notes For Architect Reviewer

Architecture review now needs to account for the new runtime-boundary bug. The design should keep the Anthropic model support already in scope, add a provider-kwarg filtering invariant, and avoid removing `logicalConversationId` from `LlmPhase` because `AutobyteusLLM` owns that internal conversation identity. Prefer a small shared sanitizer over copying the OpenAI-compatible deny-list into Anthropic.
