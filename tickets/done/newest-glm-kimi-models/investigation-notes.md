# Investigation Notes

## Investigation Status

- Bootstrap Status: Dedicated ticket worktree reused.
- Current Status: Refined after user pivot; schema-boundary work removed from current-project scope and deferred to a future RPA ticket.
- Investigation Goal: Define the clean AutoByteus TS model-catalog/request-policy change for newest GLM and Kimi models.
- Scope Classification (`Small`/`Medium`/`Large`): Medium.
- Scope Classification Rationale: Multiple source, docs, and tests areas change, but ownership remains in existing model catalog, metadata, provider adapter, and schema-driven UI areas.
- Scope Summary: Replace active GLM 5.1 with GLM 5.2; keep Kimi K2.6; add Kimi K2.7 Code; remove active Kimi K2 Thinking; keep request-shape policy provider-local; do not change current-project parameter schema/tool-schema boundaries.
- Primary Questions To Resolve: Which model IDs remain active; which provider request-shape constraints apply; which current source/docs/tests assert stale model IDs.

## Request Context

The user first requested support for newest GLM and Kimi models, then clarified that Kimi K2.6 must remain because Kimi K2.7 is coding-focused. Later runtime investigation found a Daily Assistant/Kimi failure caused by RPA media model schemas emitted in snake_case. The user subsequently clarified that the clean fix is in the RPA project, so current-project schema-boundary design and implementation changes must be reverted.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git.
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/newest-glm-kimi-models`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/newest-glm-kimi-models/tickets/newest-glm-kimi-models`
- Current Branch: `codex/newest-glm-kimi-models`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/newest-glm-kimi-models`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: Already performed during original ticket bootstrap.
- Task Branch: `codex/newest-glm-kimi-models`
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): personal branch / project integration target.
- Bootstrap Blockers: None.
- Notes For Downstream Agents: Do not reintroduce current-project `ParameterSchema` or OpenAI-compatible tool-schema normalization changes for the Daily Assistant/RPA Kimi failure. That bug is now owned by a future RPA ticket.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-06-16 | Setup | `git worktree add ... newest-glm-kimi-models` from `origin/personal` | Bootstrap isolated current-project ticket worktree | Worktree/branch established at `/Users/normy/autobyteus_org/autobyteus-worktrees/newest-glm-kimi-models`. | No |
| 2026-06-16 | Other | User clarification: `i guess we need to still support kimi-k2.6, because kimi 2.7 is actually for coding` | Resolve Kimi scope | Kimi scope is explicit dual active rows: `kimi-k2.6` general-purpose and `kimi-k2.7-code` coding. `kimi-k2-thinking` is removed. | Implement/test |
| 2026-06-16 | Command | `rg -n "\\b(GLM|glm|zhipu|Zhipu|Kimi|kimi|moonshot|Moonshot)\\b" --glob '!node_modules' --glob '!*.lock'` | Find current GLM/Kimi support | Active support is mainly in `autobyteus-ts/src/llm/api/{glm,kimi}-llm.ts`, `supported-model-definitions.ts`, `metadata/curated-model-metadata.ts`, docs, and tests. | Update required |
| 2026-06-16 | Code | `autobyteus-ts/src/llm/supported-model-definitions.ts` | Identify authoritative built-in model catalog | Registers `kimi-k2.6`, `kimi-k2-thinking`, and `glm-5.1`; GLM schema only has `thinking_type`. | Update required |
| 2026-06-16 | Code | `autobyteus-ts/src/llm/api/kimi-llm.ts` | Inspect Kimi adapter default and request normalization owner | Defaults to `kimi-k2.6`; contains K2.6-specific tool-safe disabled-thinking and sampling behavior. This remains valid for K2.6 but is invalid for K2.7 Code. | Update required |
| 2026-06-16 | Code | `autobyteus-ts/src/llm/api/glm-llm.ts` | Inspect GLM adapter default and request-shape owner | Defaults to `glm-5.1`; maps flat `thinking_type` to provider-native `thinking.type`. | Update required |
| 2026-06-16 | Code | `autobyteus-ts/src/llm/metadata/curated-model-metadata.ts` | Inspect docs-backed model metadata | Contains Kimi metadata for `kimi-k2.6` and `kimi-k2-thinking`; GLM metadata for `glm-5.1`. | Update required |
| 2026-06-16 | Code | `autobyteus-ts/src/llm/api/openai-compatible-request-builder.ts` and `autobyteus-ts/src/llm/utils/llm-config.ts` | Check shared default sampling behavior | `LLMConfig.temperature` defaults to `0.7`; request builder applies non-null temperature before kwargs. Kimi adapter must locally normalize K2.7 Code request config. | Update Kimi adapter |
| 2026-06-16 | Code | `autobyteus-web/utils/llmThinkingConfigAdapter.ts` | Check frontend schema-driven thinking behavior | Detection for `thinking_type` plus `reasoning_effort` needs to remain schema-driven and not DeepSeek-only once GLM 5.2 exposes effort. | Update/test if needed |
| 2026-06-16 | Web | `https://platform.kimi.ai/docs/guide/kimi-k2-7-code-quickstart` | Verify Kimi target and constraints | `kimi-k2.7-code` is coding-focused, 256K context, always-on thinking, fixed sampling; high-speed variant is a separate identifier. | Use non-highspeed model only |
| 2026-06-16 | Web | `https://platform.kimi.ai/docs/guide/use-kimi-k2-thinking-model` | Verify Kimi thinking/tool constraints | K2.7 Code always uses thinking; disabled thinking is invalid; multi-step tool workflows must preserve `reasoning_content`. | Adapter/API-E2E must cover |
| 2026-06-16 | Web | `https://docs.bigmodel.cn/cn/guide/start/model-overview` | Verify GLM latest model overview | Official overview lists GLM-5.2 as latest flagship with 1M context and 128K max output. | Use `glm-5.2` |
| 2026-06-16 | Web | `https://docs.bigmodel.cn/cn/guide/models/text/glm-5.2` | Verify GLM 5.2 request shape | Official examples use model `glm-5.2`, `thinking: { type: "enabled" }`, `reasoning_effort: "max"`, max output, and temperature `1.0`. | Update adapter/schema/tests |
| 2026-06-16 | Web | `https://docs.bigmodel.cn/cn/guide/start/migrate-to-glm-new` | Verify GLM migration guidance | Migration guidance includes GLM-5.1 to GLM-5.2 and `reasoning_effort` values `high`/`max`. | Update docs/schema |
| 2026-06-17 | Log/Trace | User-provided Electron screenshot and logs under `$HOME/.autobyteus` | Analyze Daily Assistant Kimi failure | Failure came from Moonshot rejecting `generation_config.speaker_mapping.items` generated from RPA media schema. Later RPA inspection showed the root cause is RPA media model endpoints emitting snake_case `parameter_schema` while TS consumers expect camelCase. | Deferred to future RPA ticket |
| 2026-06-17 | Code | `autobyteus-server-ts/src/agent-tools/media/media-tool-parameter-schemas.ts`; `autobyteus-ts/src/multimedia/audio/audio-client-factory.ts` | Check whether current TS/server schemas follow the contract | Local TS/server media schemas use camelCase `arrayItemSchema` and follow the TS contract. | No current-project schema change |
| 2026-06-17 | Code | RPA `/models/audio`, `/models/image`, `/models/video` endpoint serialization in `/Users/normy/autobyteus_org/autobyteus_rpa_llm_workspace` | Determine owning project for schema failure | RPA `/models/llm` already uses `to_camel_config_dict()` but media endpoints use `to_dict()` for `parameter_schema`. | New RPA ticket |
| 2026-06-17 | Command | `git checkout -- autobyteus-ts/src/tools/usage/formatters/openai-tool-schema-normalizer.ts autobyteus-ts/src/utils/parameter-schema.ts autobyteus-ts/tests/unit/tools/usage/formatters/openai-json-schema-formatter.test.ts autobyteus-ts/tests/unit/tools/usage/providers/tool-schema-provider.test.ts autobyteus-ts/tests/unit/utils/parameter-schema.test.ts` | Revert wrong current-project schema implementation changes | Current-project source/test schema-boundary modifications were reverted, leaving model-catalog changes intact. | No |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: `LLMFactory.listAvailableModels()` / `listModelsByProvider()` for catalog listing, and `LLMFactory.createLLM()` or direct adapter construction for invocation.
- Current execution flow:
  - Catalog: `supported-model-definitions.ts` -> `ModelMetadataResolver` -> `LLMModel.toModelInfo()` -> server `AutobyteusLlmModelProvider` -> frontend/runtime model selectors.
  - Invocation: runtime/agent config -> `LLMFactory` model lookup -> provider adapter (`KimiLLM`/`GlmLLM`) -> `OpenAICompatibleRequestBuilder` -> provider Chat Completions API.
  - Config: model `config_schema` -> frontend schema controls -> persisted `llmConfig` -> `LLMConfig.extraParams` -> provider adapter normalization.
- Ownership or boundary observations:
  - `supported-model-definitions.ts` is the built-in catalog owner.
  - Provider adapters own provider-native request-shape details.
  - `curated-model-metadata.ts` owns docs-backed fallback metadata.
  - Frontend config adapter owns schema-driven display/toggle behavior, not provider API request conversion.
- Current behavior summary:
  - GLM active built-in was `glm-5.1`; Kimi active built-ins were `kimi-k2.6` and `kimi-k2-thinking`.
  - Kimi adapter carries K2.6-specific compatibility behavior that conflicts with K2.7 Code unless scoped by model ID.
  - GLM schema lacked the GLM 5.2 `reasoning_effort` surface.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change / Catalog Modernization.
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Legacy Or Compatibility Pressure.
- Refactor posture evidence summary: Existing owner layout is healthy; old model support is present across several owner files. Kimi request policy must be split by active model ID, and GLM schema/request normalization must be updated for 5.2.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| User request + clarification | Wants newest GLM, wants Kimi K2.6 retained because K2.7 is coding-focused | Clean-cut removal applies to GLM 5.1 and Kimi K2-thinking, not to Kimi K2.6 | Enforce explicit K2.6 + K2.7 Code rows, no aliases/fallbacks |
| `supported-model-definitions.ts` | Old IDs are active catalog rows | Built-in catalog owner needs replacement, not additive legacy retention | Modify |
| `kimi-llm.ts` | K2.6-only tool workflow disables thinking | Behavior conflicts with K2.7 Code always-on thinking unless scoped | Modify |
| Kimi K2.7 docs | K2.7 rejects disabled thinking and non-default sampling values | Adapter must own provider-safe normalization | Modify/tests |
| GLM 5.2 docs | GLM 5.2 has `reasoning_effort` and 1M context | Schema and metadata must change | Modify/tests |
| RPA runtime failure | RPA media endpoints emit snake_case public `parameter_schema` | Not current-project defect; belongs in RPA media schema ticket | Track in a future RPA ticket |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-ts/src/llm/supported-model-definitions.ts` | Built-in LLM catalog and config schemas | Old GLM/Kimi rows; GLM schema only had `thinking_type` | Replace rows and extend GLM schema |
| `autobyteus-ts/src/llm/api/kimi-llm.ts` | Kimi provider adapter/default/request normalization | Defaults to `kimi-k2.6`; K2.6 tool-safe non-thinking normalization | Keep K2.6 policy scoped to K2.6 and add K2.7 Code-safe normalization |
| `autobyteus-ts/src/llm/api/glm-llm.ts` | GLM provider adapter/default/request normalization | Defaults to `glm-5.1`; maps `thinking_type` to `thinking.type` | Update default and ensure effort is omitted when disabled |
| `autobyteus-ts/src/llm/metadata/curated-model-metadata.ts` | Docs-backed fallback model metadata | K2.6/K2-thinking/GLM 5.1 metadata | Keep/update K2.6, add K2.7 Code, remove K2-thinking, replace GLM 5.1 with GLM 5.2 |
| `autobyteus-ts/src/llm/metadata/kimi-model-metadata-provider.ts` | Live Kimi `/models` metadata reader | Generic and model-ID agnostic | No design change needed; tests should mock K2.7 Code |
| `autobyteus-ts/src/llm/llm-factory.ts` | Builds `LLMModel`s and registry | Correct owner; model definitions drive output | No design change needed |
| `autobyteus-ts/src/llm/api/openai-compatible-request-builder.ts` | Shared OpenAI-compatible request construction | Applies generic config temperature before kwargs | Do not globalize provider policy; allow provider adapter to pass normalized config if needed |
| `autobyteus-web/utils/llmThinkingConfigAdapter.ts` | Schema-driven Thinking UI state/toggle | DeepSeek-named path already handles `thinking_type + reasoning_effort` | Generalize/update tests if GLM schema includes effort |
| `autobyteus-ts/src/utils/parameter-schema.ts` | Current-project schema model | Earlier schema-boundary changes were reverted | No change for this ticket |
| `autobyteus-ts/src/tools/usage/formatters/openai-tool-schema-normalizer.ts` | Current-project tool schema normalizer | Earlier schema-boundary changes were reverted | No change for this ticket |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-06-16 | Static trace | Read `OpenAICompatibleRequestBuilder.build()` and `LLMConfig` defaults | Generic temperature default `0.7` would be sent unless provider adapter overrides via kwargs/config | Kimi K2.7 Code must normalize provider-fixed sampling locally |
| 2026-06-16 | Static trace | Read `LLMFactory` -> model provider flow | Server/frontends consume `ModelInfo` from `autobyteus-ts`; no duplicate GLM/Kimi active server catalog found | Catalog owner remains `autobyteus-ts` |
| 2026-06-17 | Repro/Trace | Daily Assistant with `kimi-k2.6`, logs under `$HOME/.autobyteus`, plus RPA/TS schema inspection | Moonshot rejected a media tool schema generated from RPA snake_case `parameter_schema`; local TS/server schemas follow camelCase contract | Fix belongs in RPA project public media-model API, not current TS schema parser |

## External / Public Source Findings

- Kimi K2.7 Code quickstart: `https://platform.kimi.ai/docs/guide/kimi-k2-7-code-quickstart` consulted 2026-06-16. Relevant facts: `kimi-k2.7-code`, 256K context, coding focus, high-speed variant is separate.
- Kimi thinking guide: `https://platform.kimi.ai/docs/guide/use-kimi-k2-thinking-model` consulted 2026-06-16. Relevant facts: K2.7 Code always-on thinking, no disabled thinking, preserve `reasoning_content` in multi-step tool loops.
- GLM model overview: `https://docs.bigmodel.cn/cn/guide/start/model-overview` consulted 2026-06-16. Relevant facts: GLM-5.2 latest flagship, 1M context, 128K max output.
- GLM 5.2 model page: `https://docs.bigmodel.cn/cn/guide/models/text/glm-5.2` consulted 2026-06-16. Relevant facts: API model `glm-5.2`, `thinking.type`, `reasoning_effort`.
- GLM migration guide: `https://docs.bigmodel.cn/cn/guide/start/migrate-to-glm-new` consulted 2026-06-16. Relevant facts: migrate GLM-5.1 and earlier to GLM-5.2; effort values `high`/`max`.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: None for design investigation. Implementation/API-E2E may need `GLM_API_KEY` and `KIMI_API_KEY` for live provider validation.
- Required config, feature flags, env vars, or accounts: `GLM_API_KEY`, `KIMI_API_KEY` for live integration; unit tests can mock OpenAI client/fetch.
- External repos, samples, or artifacts cloned/downloaded for investigation: RPA workspace inspected separately for the new RPA ticket.
- Setup commands that materially affected the investigation: Dedicated worktree creation; later source-level schema-file reverts in this current project.
- Cleanup notes for temporary investigation-only setup: None.

## Findings From Code / Docs / Data / Logs

- Active built-in GLM/Kimi provider support is concentrated in `autobyteus-ts`; server/frontend mostly consume generated model info.
- Kimi K2.7 Code introduces provider constraints incompatible with current K2.6 auto-disable-thinking behavior unless the adapter branches by model ID.
- GLM 5.2 introduces `reasoning_effort`; current GLM flat `thinking_type` schema must be extended and adapter must avoid stale effort when thinking is disabled.
- Tests currently encode old model IDs and old Kimi behavior; they should be replaced, not retained as compatibility tests.
- The Daily Assistant/Kimi media schema failure is not caused by current TS/server schemas; RPA media endpoints are emitting the public `parameter_schema` in snake_case.

## Constraints / Dependencies / Compatibility Facts

- No compatibility aliases or fallback wrappers for removed identifiers. `kimi-k2.6` is retained as an explicit first-class general-purpose model, not as compatibility fallback.
- Do not update generated `dist` outputs in design; implementation should follow repository conventions for source/build artifacts.
- Exclude archival `tickets/done` from stale-reference enforcement.
- Kimi K2.7 Code HighSpeed is a same-model variant but is out of this one-row target unless explicitly requested.
- Current-project schema parser/tool-schema normalizer changes are out of scope and were reverted.

## Open Unknowns / Risks

- Live Kimi K2.7 tool-call loop behavior must be validated because docs require preserving `reasoning_content`; current `OpenAICompatibleLLM` extracts reasoning chunks but renderer/history handling needs coverage.
- Official Kimi pricing value was not captured from the text snapshot; implementation should verify before setting nonzero pricing.
- GLM endpoint base URL currently uses `/api/coding/paas/v4/`; official examples also show `/api/paas/v4/chat/completions` in some places. Current endpoint may remain correct for coding-plan model use, but API/E2E should validate with available credentials.
- RPA media schema migration must happen in the separate RPA ticket before Kimi native tool calls can use RPA-generated media model schemas reliably.

## Notes For Architect Reviewer

- This is the corrected current-project scope: model-catalog/request-policy only. The schema-boundary design path is superseded and must not be reviewed as part of this ticket.
- The target design intentionally rejects aliases or fallback rows for removed model IDs (`glm-5.1`, `kimi-k2-thinking`).
- The only meaningful current-project refactor is bounded: keep Kimi K2.6 request policy scoped to K2.6, add Kimi K2.7 Code-safe request policy, and make schema-driven typed-thinking UI behavior healthy for GLM 5.2 `reasoning_effort`.
