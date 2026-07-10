# OpenAI GPT-5.6 API Model Integration Investigation Notes

## Investigation Status

- Bootstrap Status: `Complete`
- Current Status: `Complete; expanded requirements, frontend path, and Codex runtime probe resolved`
- Investigation Goal: determine whether GPT-5.6 Sol, Terra, and Luna have public OpenAI API contracts, define the exact `autobyteus-ts` integration boundary, verify the existing frontend data/display path for their cache-write price and cost, and probe whether the current Codex runtime emits a write count.
- Scope Classification: `Medium`
- Scope Classification Rationale: three catalog additions fit the existing architecture, but correct integration also requires family-specific reasoning metadata, documented token limits, tiered/cache-write pricing, cache-write usage normalization, frontend data-path verification, and focused coverage.
- Scope Summary: add the three canonical GPT-5.6 API models to the AutoByteus OpenAI API runtime catalog; retain existing Responses API routing; feed the existing generic cache-write Token Meter path; do not change Codex runtime discovery or redesign the frontend.
- Primary Questions Resolved:
  1. All three models now have official public API pages and canonical IDs.
  2. The canonical IDs are `gpt-5.6-sol`, `gpt-5.6-terra`, and `gpt-5.6-luna`.
  3. Built-in definition and curated metadata owners are healthy and can absorb the change.
  4. Existing Responses API routing can invoke the models without a new provider or SDK path.
  5. A GPT-5.6-specific reasoning schema and cache-write normalization are needed for a truthful integration.
  6. The frontend data model, live-event store, GraphQL hydration, and Token Meter already support generic cache-write tokens, unit price, and cost; the remaining frontend gap is explicit positive-write component coverage, not production capability.
  7. Current Codex app-server `gpt-5.6-sol` events expose cached reads but no cache-write field; AutoByteus is not dropping one, so the Codex adapter must retain cache creation as unknown/null rather than fabricate it.

## Request Context

The user supplied a Codex model-menu screenshot showing `GPT-5.6-Luna`, `GPT-5.6-Sol`, and `GPT-5.6-Terra` and asked to investigate and integrate them into `autobyteus-ts` if their APIs are available.

Reference image: `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_fc1c5b67be974539812159024d2c9edb/solution_designer_4763cfe7e121471b9473ba0a9fa13844/context_files/ctx_4803a8f28926__image.png`

Screenshot observations:

- GPT-5.6 Luna — Codex display default reasoning `medium`.
- GPT-5.6 Sol — Codex display default reasoning `low`.
- GPT-5.6 Terra — Codex display default reasoning `medium`.

These are Codex product defaults, not authoritative API defaults. Official API guidance states that omitted GPT-5.6 reasoning effort defaults to `medium`.

## Environment Discovery / Bootstrap Context

- Project Type: `Git` monorepo; `autobyteus-ts` is a tracked subtree rather than a separate git repository.
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/openai-new-api-models`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/openai-new-api-models`
- Current Branch: `codex/openai-new-api-models`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/openai-new-api-models`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin personal` succeeded on 2026-07-10; refreshed base commit `3effb76ab56d4d1bb876ad0623a8e5eb7093a584`.
- Task Branch: `codex/openai-new-api-models` tracking the bootstrap base.
- Expected Base Branch: `personal`
- Expected Finalization Target: `personal`
- Bootstrap Blockers: none.
- Notes For Downstream Agents: use this dedicated worktree only. The shared checkout `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` contains unrelated untracked work and is not authoritative for this task.

## Supplemental Solution Artifact Inventory

- `codex-cache-write-probe.md`
  - Path: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/openai-new-api-models/codex-cache-write-probe.md`
  - Scope/status: complete factual protocol, live-session, ledger, and adapter evidence.
  - Related IDs: `REQ-011`, `AC-013`, `AC-014`.

No UI/UX supplement is needed because the user-facing requirement preserves an existing Token Meter interaction and its states are fully specified by `REQ-010`, `AC-011`, and `AC-012`.

## Source Log

| Date | Source Type | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-07-10 | Setup | `git fetch origin personal` | Refresh tracked base before task isolation | Succeeded; `origin/personal` resolved to `3effb76a...` | No |
| 2026-07-10 | Setup | `git worktree add -b codex/openai-new-api-models /Users/normy/autobyteus_org/autobyteus-worktrees/openai-new-api-models origin/personal` | Create dedicated task branch/worktree | Succeeded | No |
| 2026-07-10 | Other | Supplied screenshot at the absolute path above | Identify the three requested candidates | Sol, Terra, and Luna visible under the Codex OpenAI menu | No |
| 2026-07-10 | Command | `codex mcp add openaiDeveloperDocs --url https://developers.openai.com/mcp` | Follow the OpenAI docs skill source route | MCP server installed globally; tools require a later session/restart, so this turn used official-domain web fallback | Later sessions may use Docs MCP |
| 2026-07-10 | Web | Search: `site:developers.openai.com \"GPT-5.6-Luna\" OR \"gpt-5.6-luna\"` and equivalent Sol/Terra queries | Establish public developer-doc availability | Initial search cache showed preview messaging; direct official docs later exposed all model pages | No |
| 2026-07-10 | Web | `https://developers.openai.com/api/docs/models` | Verify official catalog and summary contract | Lists all three IDs, 1.05M context, 128K output, six reasoning efforts, prices, and Sol alias | Recheck during API/E2E because rollout is fresh |
| 2026-07-10 | Web | `https://developers.openai.com/api/docs/models/gpt-5.6-sol` | Verify Sol contract | Canonical ID, alias, limits, prices, modalities, Responses support, cache-write uplift | Recheck during API/E2E |
| 2026-07-10 | Web | `https://developers.openai.com/api/docs/models/gpt-5.6-terra` | Verify Terra contract | Canonical ID, limits, prices, modalities, Responses support, cache-write uplift | Recheck during API/E2E |
| 2026-07-10 | Web | `https://developers.openai.com/api/docs/models/gpt-5.6-luna` | Verify Luna contract | Canonical ID, limits, prices, modalities, Responses support, cache-write uplift | Recheck during API/E2E |
| 2026-07-10 | Web | `https://developers.openai.com/api/docs/guides/latest-model` | Verify GPT-5.6 migration/API behavior | Responses recommended; efforts include `max`; omitted effort defaults to `medium`; cache write field/cost and optional features documented | No for core scope |
| 2026-07-10 | Web | `https://developers.openai.com/api/docs/guides/prompt-caching` | Resolve the technical and billing meaning of GPT-5.6 cache writes | A cache write persists a newly processed prompt prefix for later exact-prefix reuse; GPT-5.6 reports write tokens in the input/prompt token details, charges them at `1.25x`, and can cache complete message arrays including assistant messages when those messages are later part of the input | No |
| 2026-07-10 | Web | `https://openai.com/index/previewing-gpt-5-6-sol/` (published 2026-06-26) | Cross-check launch naming and rollout | Sol flagship, Terra balanced, Luna fast/affordable; initial limited preview and public prices | No |
| 2026-07-10 | Command / API | `GET https://api.openai.com/v1/models` with configured `OPENAI_API_KEY`; output filtered to `gpt-5.6*` | Check current account entitlement without exposing secrets | HTTP 200; no GPT-5.6 IDs in this account's model list | Yes—entitled live smoke later |
| 2026-07-10 | Command / API | Minimal `POST https://api.openai.com/v1/responses` for each canonical ID, `reasoning.effort=none`, `max_output_tokens=16` | Verify slugs and current account access | Each returned HTTP 404, `model_not_found`, explaining limited preview/not available on this account and suggesting GPT-5.5 | Yes—entitled live smoke later |
| 2026-07-10 | Code | `autobyteus-ts/src/llm/supported-model-definitions.ts` | Find model catalog owner and schema/pricing pattern | Authoritative built-in definitions; current OpenAI schema lacks `max` and defaults to `none` | Yes—design/implementation |
| 2026-07-10 | Code | `autobyteus-ts/src/llm/metadata/curated-model-metadata.ts` | Find limits owner | OpenAI limits are curated from official per-model pages | Yes—design/implementation |
| 2026-07-10 | Code | `autobyteus-ts/src/llm/llm-factory.ts` and `src/llm/models.ts` | Trace registration/discovery/invocation identity | Definitions become `LLMModel` instances; factory owns identifier lookup and `ModelInfo` output | No |
| 2026-07-10 | Code | `autobyteus-ts/src/llm/api/openai-llm.ts` and `openai-responses-llm.ts` | Verify runtime API path | `OpenAILLM` already targets `https://api.openai.com/v1` and uses Responses API; reasoning effort is forwarded generically | No provider rewrite needed |
| 2026-07-10 | Code | `autobyteus-ts/src/llm/api/openai-compatible-token-usage-normalizer.ts` and `llm-token-usage-observation.ts` | Check cache-write usage support | Domain has `cache_creation_input_tokens`, but OpenAI-compatible normalizer does not read `cache_write_tokens` | Yes—design/implementation |
| 2026-07-10 | Code | `autobyteus-ts/src/llm/utils/llm-config.ts` and `autobyteus-ts/src/llm/llm-factory.ts` pricing APIs | Check price-shape support | Existing config supports standard/cache-read/generic-cache-write prices and input-token tiers | No new pricing abstraction needed |
| 2026-07-10 | Code | `autobyteus-server-ts/src/llm-management/...`, GraphQL `llm-provider.ts`, and AutoByteus backend factory | Stretch discovery and invocation spines beyond the local files | Server already delegates catalog discovery and runtime construction to `LLMFactory`; no server changes required | No |
| 2026-07-10 | Repo | `git log -S\"gpt-5.5\" ...` and commit `149e7035` | Compare prior OpenAI model integration pattern | Prior model additions modified definitions, curated metadata, and focused tests without a new provider path | No |
| 2026-07-10 | Command | `rg` searches for model definitions, reasoning, pricing, normalizers, factory list/create calls, and server catalog consumers | Inventory affected boundaries and tests | No duplicate AutoByteus API catalog owner found; Codex catalog is a separate runtime boundary | No |
| 2026-07-10 | User approval | User stated: the requirement is clear and the team can proceed | Lock the refined requirements basis before design | Approved all three model integrations and the cache-write pricing/normalization scope after technical clarification | No |
| 2026-07-10 | User scope clarification | User explicitly required cache-write price and cost to appear in the frontend Calculation details | Verify the user-visible end of the accounting spine before review | Existing behavior should be preserved and explicitly covered; previous review package was superseded pending this analysis | No |
| 2026-07-10 | Code / docs | `autobyteus-web/AGENTS.md` and `autobyteus-web/docs/agent_execution_architecture.md` | Read frontend project rules and authoritative token-meter architecture | Frontend is presentation-only; server owns accounting/pricing; live events and ledger-backed GraphQL summaries converge in the Token Meter store | No |
| 2026-07-10 | Code | `autobyteus-web/types/tokenUsageMeter.ts`, `graphql/queries/token_usage_meter_queries.ts`, `stores/tokenUsageUnitPriceSummary.ts`, and `stores/tokenUsageMeterStore.ts` | Trace frontend cache-write data shape for live and hydrated paths | Types/query/store already preserve `cacheCreationInputTokens`, `unitPrices.cacheCreationInput`, `cached_input_write_price_per_million`, and `estimatedApiCacheCreationInputCost`; positive-token prices merge without frontend model knowledge | No production change expected |
| 2026-07-10 | Code | `autobyteus-web/components/workspace/usage/TokenUsageMeterPanel.vue` and localization catalogs | Verify observable cache-write behavior | Positive writes appear as `Cache writes` in Input breakdown; generic writes appear in Calculation details with tokens, unit price, and cost when 5m/1h subtype counts are zero; zero writes stay hidden; mixed/missing prices use status text | Preserve behavior and add focused evidence |
| 2026-07-10 | Tests | `TokenUsageMeterPanel.spec.ts`, `tokenUsageMeterStore.spec.ts`, and server `token-usage-unit-prices-graphql.e2e.test.ts` | Assess durable proof of the end-to-end display contract | Store and GraphQL coverage already prove generic cache-write unit prices and live/hydrated convergence; component coverage proves calculation details generally but does not explicitly assert the positive generic cache-write row | Coverage investigation should add/confirm focused component evidence |
| 2026-07-10 | Code | Server token-usage component basis, cost calculator, unit-price projection, GraphQL types, and live payload domain | Verify that frontend fields are server-accounted rather than browser-derived | Generic write tokens, price, component cost, input cost, and total cost already flow through server events/ledger/GraphQL; no server or frontend production schema change is required once OpenAI normalization emits the existing dimension | No production change expected |
| 2026-07-10 | User probe request | User asked whether the active Codex GPT-5.6 runtime token event contains a cache-write field and whether AutoByteus drops it | Resolve a possible second runtime-normalizer gap before review | Triggered generated-protocol, live-session, ledger, and source probe | No |
| 2026-07-10 | Command / generated protocol | `codex --version`; `codex app-server generate-ts --experimental --out <tmp>`; equivalent commands for `/Applications/Codex.app/Contents/Resources/codex`; `rg -i 'cache.?write|write.?cache'` | Inspect the authoritative installed Codex app-server type contract | PATH CLI `0.144.1`, Codex.app resource `0.144.0-alpha.4`; both `TokenUsageBreakdown` types contain only total/input/cached-input/output/reasoning-output; no write field | Recheck during API/E2E |
| 2026-07-10 | Runtime session probe | Latest `/Users/normy/.codex/sessions/2026/07/10/*.jsonl`; `jq` selected session metadata, `turn_context.model`, token-count key sets, and numeric usage only | Inspect a real current Codex run without retaining conversation content | AutoByteus-originated run selected `gpt-5.6-sol`; token records contained `cached_input_tokens` but no cache-write key; positive cached reads were present | No |
| 2026-07-10 | Read-only database probe | `sqlite3 -readonly /Users/normy/.autobyteus/server-data/db/production.db`; aggregate/query raw key sets for `codex_app_server` + `gpt-5.6-sol` | Determine whether any write field reached raw or canonical ledger data | 2,676 events in ledger ID range 29,598–32,647; 2,676 read fields, 2,671 positive reads, zero non-null cache creation, zero raw cache-write-like keys. Active solution-designer boundary: 99 events, all no write | Point-in-time evidence; recheck later protocol versions |
| 2026-07-10 | Code | `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-token-usage.ts`, notification handler, and backend event projection | Verify whether AutoByteus discards an upstream field | Parser maps the exact upstream fields, persists full raw usage/event JSON, and leaves cache creation null; there is no received write field to drop | Preserve no-fabrication behavior |

## Current Behavior / Current Flow

### Catalog/discovery primary spine (`SPINE-001`)

`GraphQL LLM catalog query -> ModelCatalogService(AUTOBYTEUS) -> AutobyteusModelCatalog/cache -> AutobyteusLlmModelProvider -> LLMFactory.listAvailableModels -> buildSupportedModels(supported definitions + metadata resolver) -> LLMModel.toModelInfo -> GraphQL model detail`

- Start: an AutoByteus-runtime model catalog request.
- End: model rows exposed to the frontend/client.
- Governing owner: `LLMFactory` owns the runtime registry; `supported-model-definitions.ts` owns built-in row declarations.
- Current result: GPT-5.5, GPT-5.4, and GPT-5.4 mini are present; no GPT-5.6 rows exist.

### Invocation primary spine (`SPINE-002`)

`Agent run configuration model identifier -> AutoByteusAgentRunBackendFactory -> LLMFactory.createLLM -> OpenAILLM -> OpenAIResponsesLLM request assembly -> OpenAI /v1/responses -> CompleteResponse/ChunkResponse`

- Start: a selected API-runtime model identifier.
- End: provider response mapped into the shared response and token-usage domain.
- Governing owner: `LLMFactory` owns model-to-adapter resolution; `OpenAIResponsesLLM` owns OpenAI Responses request/response translation.
- Current result: any registered OpenAI model value follows the correct API path. The missing GPT-5.6 behavior is registration/metadata, not transport selection.

### Token usage return spine (`SPINE-003`)

`OpenAI Responses usage -> OpenAIResponsesLLM.createTokenUsage -> openai-compatible-token-usage-normalizer -> LlmTokenUsageObservation -> agent usage event -> server pricing policy/cost calculator`

- Start: provider usage payload.
- End: normalized token/cost dimensions persisted and shown downstream.
- Governing owner: provider normalizer owns external-to-domain field mapping; generic observation and pricing owners already represent cache creation.
- Current result: cached reads and reasoning tokens map correctly, but GPT-5.6 `cache_write_tokens` would be retained only in raw JSON and omitted from the typed cache-creation dimension.

### Frontend token/cost presentation spine (`SPINE-004`)

`Priced token-usage event -> TOKEN_USAGE_UPDATED live payload and ledger -> tokenUsageMeterStore live aggregation or GraphQL TokenUsageRunSummary hydration -> useTokenUsageWorkspaceScope -> TokenUsageMeterPanel Input breakdown / Calculation details`

- Start: provider-neutral server fields for generic cache-write tokens, write unit price, write cost, input cost, and total cost.
- End: the focused run's Token Meter displays `Cache writes` with tokens and cost; expanded Calculation details also displays the generic per-million write price.
- Governing owners: the server token-usage subsystem owns values; `tokenUsageMeterStore` owns live/hydrated frontend projection; `TokenUsageMeterPanel` owns presentation only.
- Current result: the full generic path already exists. For OpenAI GPT-5.6, 5m/1h subtype tokens remain zero, so the component selects the generic `cacheCreationInput` row. The missing upstream normalizer currently prevents those fields from becoming positive for OpenAI responses.

### Codex runtime usage source spine (`SPINE-005`)

`Codex app-server thread/tokenUsage/updated -> handleAppServerNotification -> resolveCodexThreadTokenUsage -> CodexReadyTokenUsageUpdate -> TOKEN_USAGE_UPDATED -> generic server accounting`

- Start: installed Codex app-server `ThreadTokenUsage` containing cumulative `total`, per-turn/call `last`, and model context window.
- End: provider-neutral Codex token event with gross input, cached-read input, output, reasoning output, and retained raw payloads.
- Governing owner: Codex runtime adapter owns the external protocol mapping; generic server accounting owns downstream semantics.
- Current result: `cachedInputTokens` maps to cache read. The upstream type and real Sol events have no cache-write field, so `cache_creation_input_tokens` remains `null`. This is correct unknown/not-reported behavior, not a missed mapping.

### Ownership or boundary observations

- The server and frontend consume `ModelInfo` and provider-neutral token-usage fields and do not need model-specific conditionals.
- Codex model discovery is deliberately separate from AutoByteus API model discovery; the requested API integration belongs only in the latter.
- No caller bypasses `LLMFactory` to instantiate `OpenAILLM` in the product flow.
- The model catalog file is broad but remains the established owner for static provider definitions. Three related additions do not justify a refactor.
- The Token Meter is already the correct user-facing owner. Adding a second pricing calculation or a GPT-5.6-specific frontend branch would violate the existing server-authoritative boundary.
- Direct OpenAI API usage and Codex app-server usage are two separate provider boundaries. A write field documented for Responses API cannot be assumed to exist in the Codex client protocol.

## Design Health Assessment Evidence

- Change posture: `Feature`
- Candidate root cause classification: `No Design Issue Found`
- Refactor posture evidence summary: existing owners and dependency direction are correct. New facts fit as extensions within those owners.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `supported-model-definitions.ts` | One authoritative static catalog holds IDs, adapter class, schema, and prices | Add the three rows here; no parallel registry | Yes |
| `curated-model-metadata.ts` | OpenAI documentation-backed limits already live here | Extend existing map | Yes |
| `LLMFactory` | Registration, discovery, and creation share one identifier owner | No server-specific model wiring | No |
| `OpenAIResponsesLLM` | Model value and effort are mapped generically into Responses API | Existing adapter is reusable | Focused coverage only |
| Current OpenAI schema | `max` is absent; schema is shared with older models | Create a family-specific schema rather than weakening accuracy for old models | Yes |
| Token usage normalizer/domain | Domain supports generic cache creation; adapter omits new external field | Local adapter extension; no new domain or server path | Yes |
| Pricing types/cost calculator | Generic cache-write price and tier selection already exist | Reuse current structures | Yes |
| Server GraphQL/live-event and frontend Token Meter | Generic cache-write tokens, unit price, and cost already cross both transport shapes and render conditionally | Preserve production path; add focused positive generic-write evidence | Coverage only |
| Codex generated protocol + live/ledger probe | Current TokenUsageBreakdown has a cached-read field but no cache-write field; raw retention confirms absence before parsing | Preserve null/unknown, reject inference; protocol recheck is an evidence gate | No production change now |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-ts/src/llm/supported-model-definitions.ts` | Built-in model rows, config schemas, trusted prices | No GPT-5.6 rows; older OpenAI schema lacks `max` | Modify; keep a distinct GPT-5.6 schema |
| `autobyteus-ts/src/llm/metadata/curated-model-metadata.ts` | Docs-backed token limits | No GPT-5.6 metadata | Modify with three official source URLs |
| `autobyteus-ts/src/llm/llm-factory.ts` | Registry construction, discovery, identifier resolution, pricing lookup | Existing generic behavior is sufficient | No production change expected |
| `autobyteus-ts/src/llm/api/openai-llm.ts` | OpenAI API defaults and base URL | Delegates to Responses adapter | No production change expected |
| `autobyteus-ts/src/llm/api/openai-responses-llm.ts` | OpenAI Responses request/stream mapping | Forwards effort generically and uses model value unchanged | No production change expected; test if needed |
| `autobyteus-ts/src/llm/api/openai-compatible-token-usage-normalizer.ts` | OpenAI-shaped usage to shared observation | Missing `cache_write_tokens` mapping | Modify within owner |
| `autobyteus-ts/src/llm/utils/llm-token-usage-observation.ts` | Shared typed usage shape | Already has `cache_creation_input_tokens` | Reuse; no change expected |
| `autobyteus-ts/src/llm/utils/llm-config.ts` | Trusted pricing and tier data shape | Already supports generic write price and tiers | Reuse; no change expected |
| `autobyteus-ts/tests/unit/llm/supported-model-definitions.test.ts` | Catalog/pricing contract | No current OpenAI family-specific assertions | Extend |
| `autobyteus-ts/tests/unit/llm/metadata/model-metadata-resolver.test.ts` | Curated metadata resolver behavior | Covers GPT-5.5 only for OpenAI | Extend to GPT-5.6 |
| `autobyteus-ts/tests/integration/llm/llm-factory-metadata-resolution.test.ts` | Registry-level model info | Covers older OpenAI rows | Extend to all three |
| `autobyteus-ts/tests/unit/llm/api/token-usage-normalizers.test.ts` | Provider usage mapping | Covers cache reads/reasoning but not cache writes | Extend |
| `autobyteus-ts/tests/unit/llm/api/provider-native-request-payloads.test.ts` | Native request shape | Existing Responses coverage can host `max` effort assertion | Extend if the most focused durable location |
| `autobyteus-ts/tests/integration/llm/api/openai-llm.test.ts` | Credential-gated OpenAI live behavior | Defaults to GPT-5.5 and already classifies access errors | Coverage engineer to decide whether to add parameterized GPT-5.6 smoke |
| `autobyteus-server-ts/src/token-usage/pricing/token-cost-calculator.ts` | Provider-neutral component costs | Already prices generic cache creation separately and includes it in input/total cost | Reuse; no production change expected |
| `autobyteus-server-ts/src/token-usage/projections/token-usage-unit-price-summary.ts` | Ledger-backed unit-price aggregation | Already projects `cached_input_write_price_per_million` for positive generic write tokens | Reuse; no production change expected |
| `autobyteus-server-ts/src/api/graphql/types/token-usage-stats.ts` | Token-usage GraphQL schema/adapters | Already exposes generic write tokens, generic write cost, and `unitPrices.cacheCreationInput` | Reuse; no production change expected |
| `autobyteus-server-ts/tests/e2e/token-usage/token-usage-unit-prices-graphql.e2e.test.ts` | GraphQL unit-price contract | Already asserts generic cache-write price `6` through run/statistics projections | Existing proof; API/E2E decides whether GPT-5.6-specific price needs additional coverage |
| `autobyteus-web/types/tokenUsageMeter.ts` | Frontend live/hydrated token-usage contract | Already includes generic write token, price, and cost fields | Reuse; no production change expected |
| `autobyteus-web/graphql/queries/token_usage_meter_queries.ts` | Focused-run ledger hydration | Already requests generic write tokens, cost, and unit price | Reuse; no production change expected |
| `autobyteus-web/stores/tokenUsageUnitPriceSummary.ts` and `tokenUsageMeterStore.ts` | Live/hydrated frontend aggregation | Already merges generic cache-write price only for positive generic write tokens and accumulates server-provided cost | Reuse; no production change expected |
| `autobyteus-web/components/workspace/usage/TokenUsageMeterPanel.vue` | Focused Token Meter presentation | Already shows positive cache writes in Input breakdown and generic write price/cost in Calculation details | Preserve; no production change expected |
| `autobyteus-web/components/workspace/usage/__tests__/TokenUsageMeterPanel.spec.ts` | Component-visible contract | Calculation rows are covered, but positive generic cache-write visibility/price is not directly asserted | Candidate focused durable test extension |
| `autobyteus-web/stores/__tests__/tokenUsageMeterStore.spec.ts` | Live-event projection contract | Already covers generic/5m/1h write unit prices and live/hydrated convergence | Existing proof; exact durable changes belong to coverage investigation |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-token-usage.ts` | Codex external usage mapping | Reads `cachedInputTokens`; upstream has no write field; provider-delta cache creation is explicitly null; raw records retained | Preserve; no speculative mapping |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/thread/codex-thread.test.ts` and `.../codex-agent-run-backend.test.ts` | Codex usage/event contract | Existing fixtures cover cached reads and current no-write shape | Coverage engineer should make no-fabrication intent explicit if not already durable enough |
| `codex-cache-write-probe.md` | Task evidence | Sanitized installed-protocol/live-session/ledger conclusion | Include in every downstream handoff |

## Runtime / Probe Findings

| Date | Method | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-07-10 | Probe | Authenticated `GET /v1/models`, filter IDs beginning `gpt-5.6` | HTTP 200; empty filtered list | Current API organization is not entitled; list absence is not contrary to public docs |
| 2026-07-10 | Probe | Minimal Responses request per model with `max_output_tokens=8` | HTTP 400 minimum-value validation (`>=16`) for every slug | Request reached current API validation; rerun corrected to 16 |
| 2026-07-10 | Probe | Minimal Responses request per model with `max_output_tokens=16` | HTTP 404 `model_not_found`; message states limited preview/not available on account | Canonical slugs are recognized, but live success cannot be proven with this credential |

No source/build tests were run during solution design because the dedicated worktree has no installed `node_modules`. Implementation and API/E2E stages own environment setup and executable coverage.

## External / Public Source Findings

### Official model catalog (verified 2026-07-10)

- Sol ID `gpt-5.6-sol`; alias `gpt-5.6`.
- Terra ID `gpt-5.6-terra`.
- Luna ID `gpt-5.6-luna`.
- All three: efforts `none/low/medium/high/xhigh/max`, context 1.05M, max output 128K, knowledge cutoff 2026-02-16, text+image input and text output.

### Individual official model pages

| Model | Input | Cached read | Output | Cache write | >272K tier |
| --- | ---: | ---: | ---: | ---: | --- |
| Sol | 5.00 | 0.50 | 30.00 | 6.25 | input/read/write `2x`; output `1.5x` |
| Terra | 2.50 | 0.25 | 15.00 | 3.125 | input/read/write `2x`; output `1.5x` |
| Luna | 1.00 | 0.10 | 6.00 | 1.25 | input/read/write `2x`; output `1.5x` |

Prices are USD per 1M tokens. Cache-write values are derived directly from the official `1.25x uncached input` rule; long-context values apply the official multipliers.

### Latest model guidance

- Use Responses API for reasoning, tools, and multi-turn workflows.
- `reasoning.effort` supports six values through `max`.
- Omitted GPT-5.6 effort defaults to `medium` in standard and pro modes.
- Track `cached_tokens` and `cache_write_tokens`; implicit caching continues without request changes.
- Optional new features exist but are not necessary for standard model integration.

### Prompt-cache write semantics

- The per-generation decoder KV cache and the cross-request prompt cache are related but have different lifetimes. Output-token KV state grows during one generation; a prompt-cache write is the provider making selected prefill/input-prefix KV state reusable by later requests.
- A write is a logical provider-cache operation measured in prompt tokens, not an application database write and not an extra copy of generated text.
- On a miss, newly cacheable prefix tokens are reported as `cache_write_tokens` and are billed at the cache-write rate. On a later exact-prefix hit, reused tokens are reported as `cached_tokens` and billed at the cached-read rate.
- Generated assistant output is not automatically counted as a prompt-cache write in the response that generated it. If a later request resends that assistant output as part of the conversation input, it is then eligible to participate in a new/extended cached prefix.
- OpenAI documents `usage.input_tokens_details.cache_write_tokens` for Responses API and `usage.prompt_tokens_details.cache_write_tokens` for the Chat Completions shape.
- The cache may remain in volatile GPU memory or provider-managed local storage; the API contract exposes token counts and lifetime/policy, not physical bytes written.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: none for static catalog and unit coverage.
- Required config, feature flags, env vars, or accounts: `OPENAI_API_KEY` for live verification; an OpenAI organization entitled to GPT-5.6 is required for success.
- External repos, samples, or artifacts cloned/downloaded for investigation: none.
- Setup commands that materially affected the investigation: worktree setup and Docs MCP install are logged above.
- Cleanup notes for temporary investigation-only setup: API response bodies were written to temporary files and removed immediately; no secret or response artifact was retained.

## Findings From Code / Docs / Data / Logs

1. API availability is confirmed at the public-contract level for all three models.
2. Current account entitlement is not confirmed; the valid API key receives explicit rollout errors.
3. Static registration is consistent with existing built-in model behavior and should not be coupled to a credential probe.
4. No OpenAI SDK upgrade is currently justified: the existing adapter casts the Responses request to a permissive record and submits model values as strings.
5. A global addition of `max` to `openaiReasoningSchema` would falsely advertise an effort that older models do not publish; family-specific schema ownership is the clean solution.
6. GPT-5.6 pricing is not representable truthfully with only flat input/output values because the repository already exposes detailed price metadata and GPT-5.6 has cache-write and long-context dimensions. Existing tier/write structures are sufficient.
7. The normalizer gap is bounded: nested external `cache_write_tokens` should map to the already-owned generic `cache_creation_input_tokens` field and must participate in cache-state classification.
8. Without that adapter mapping, current accounting would treat write tokens as ordinary uncached input under the `gross_includes_cache` semantic, pricing them at `1.0x` instead of `1.25x` and understating GPT-5.6 input cost by `0.25x` for every write token.
9. The frontend data model does support cache-write price: live events use `cached_input_write_price_per_million`, hydrated summaries use `unitPrices.cacheCreationInput`, and both project into the same `TokenUsageRunSummary.unitPrices.cacheCreationInput` shape.
10. The frontend visible path also already supports the user's requested disclosure. `TokenUsageMeterPanel` shows positive aggregate cache writes in Input breakdown and, for GPT-5.6's generic/no-subtype case, renders a Calculation details row from `cacheCreationInputTokens`, `unitPrices.cacheCreationInput`, and `estimatedApiCacheCreationInputCost`.
11. No frontend model-price calculation should be added. The browser formats server-accounted values and displays the existing formula; the server remains authoritative for standard/read/write decomposition, tier selection, and monetary cost.
12. Existing GraphQL E2E and frontend store tests cover the generic fields and live/hydrated unit-price convergence. A focused component scenario is still warranted because current component tests do not explicitly prove a positive generic cache-write row and its unit price.
13. The current Codex runtime does not expose cache-write token counts. Generated app-server types, the active Sol session, retained raw event JSON, and 2,676 point-in-time Sol ledger events agree on the same five usage fields and no write key.
14. AutoByteus is not dropping Codex write data: its adapter maps the available fields and preserves the full raw records. `cache_creation_input_tokens = null` is the correct representation of unavailable source data.
15. The remainder `inputTokens - cachedInputTokens` cannot be used as cache writes because it combines normal uncached input with any unexposed write category. Inferring it would charge all uncached input at the 1.25x write rate and be as incorrect as treating all of it as known zero writes.
16. Adding GPT-5.6 write pricing to the shared model catalog makes the rate available to both direct API and Codex price resolution, but Codex cannot apply/display a write component without an observed count. The direct API normalizer change remains necessary and distinct.

## Persisted Data Transition Evidence (When Applicable)

- Current stored subject, location, representative shape, and approximate volume: no persisted schema is changed. Model/pricing definitions are static runtime code.
- Relevant code-model, serialization, semantic, or physical-store change: three additional identifiers and metadata rows; one additional normalized usage input field feeding an existing output property.
- Normal readers and writers, including unknown/extra-field behavior: saved existing model identifiers remain unchanged; new identifiers become selectable. Usage raw JSON already tolerates extra provider fields.
- Representative direct-read or compatibility evidence: `LLMFactory` registers by exact unique identifier and server catalog mapping is generic.
- Required semantics and invariants preserved by direct use: `Yes` — no existing identifier or stored record needs rewriting.
- Physical storage, privacy/security, disposal, rebuild, or operational constraints: none.
- Concrete benefit, cost, and risk of migration if it remains a candidate: no migration benefit; migration is not a candidate.
- Existing migration framework or lifecycle constraints, only if migration may be required: not applicable.

## Constraints / Dependencies / Compatibility Facts

- Official developer docs are the model-contract authority; Codex display labels/defaults are product-context evidence only.
- API entitlement can differ from Codex entitlement and must not be inferred from the screenshot.
- Existing built-in catalog rows are not dynamically filtered by provider-account model lists.
- No backward-compatibility wrapper or alias translation is needed: use canonical slugs directly.
- The unsuffixed official alias should not create a duplicate selector choice.
- Current Responses request construction already supports the minimum integration; optional new request features remain out of scope.
- Frontend production contracts already contain the generic cache-write dimension. Any implementation proposal to add a GPT-5.6-specific frontend field or import provider pricing metadata into the web app is incompatible with the existing architecture.
- Current Codex app-server protocol evidence is authoritative only for the installed supported versions. A future protocol may add a field; the raw-payload boundary and generated-schema recheck are the correct detection mechanism.

## Open Unknowns / Risks

- The entitled live response usage shape remains unobserved with the current credential, although official documentation now fixes the expected nested field names.
- Official docs changed during the investigation window from limited-preview emphasis to fully published model pages. API/E2E and delivery should recheck the direct pages for rollout or contract changes.
- Live success remains dependent on another organization/credential receiving GPT-5.6 API access.
- Live API success still requires an entitled credential; this does not block the approved static integration and deterministic contract coverage.
- The frontend component currently shows a generic cache-write Calculation details row only when 5m/1h subtype counts are both zero; that is correct for GPT-5.6, whose documented write category is generic. A future provider with simultaneous generic and subtype write tokens would need separate analysis, not a change in this task.
- Codex may internally write prompt-cache state even though app-server does not expose the count. AutoByteus therefore cannot currently provide a separately observed Codex write cost. Absence must remain unknown/null, not zero.

## Notes For Architecture Reviewer

The previous review handoff was explicitly superseded while this frontend requirement was investigated. The revised package is ready for a fresh review after handoff. Review should pay particular attention to:

- keeping `max` scoped to GPT-5.6 rather than mutating older model schemas;
- accurate standard/long-context/cache-write pricing without a new pricing subsystem;
- mapping `cache_write_tokens` at the provider adapter boundary;
- avoiding the `gpt-5.6` alias as a duplicate row;
- treating account entitlement as an API/E2E evidence limitation, not a reason to omit officially documented models.
- preserving the existing server-authoritative generic cache-write frontend path rather than adding browser pricing logic;
- ensuring focused durable evidence proves positive GPT-5.6-style generic write tokens, unit price, and cost are visible in the Token Meter.
- keeping the direct OpenAI API cache-write mapping separate from the Codex runtime source contract;
- rejecting speculative Codex field aliases or inference, while retaining the generated-protocol recheck as an API/E2E design-impact gate.
