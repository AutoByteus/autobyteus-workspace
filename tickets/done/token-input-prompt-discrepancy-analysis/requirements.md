# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready — user authorized proceeding to design after live two-round provider/runtime probes on 2026-06-25.

## Goal / Problem Statement

Make token usage and cost accounting accurate, explainable, and provider-aware across the application. The current backend already captures and prices cached-input data for several runtimes/providers, but the frontend Token Meter collapses that information into broad `Input`, `Output`, and `Total` cards. This hides why cumulative input tokens can be high while cost is lower due to cache-hit pricing, and it makes users suspect the accounting is wrong.

The feature should expose the same cache-aware accounting components used by the server cost calculator so users can understand:

- gross input tokens sent to providers;
- uncached/standard input tokens charged at normal input price;
- cache-read/hit input tokens charged at discounted cache-read price;
- cache-creation/write input tokens when a provider charges for cache creation;
- output tokens and reasoning/thinking sub-breakdown when available;
- estimated costs for each priced component and whether any component is missing trusted pricing.

The frontend must answer the questions a user actually has while looking at the Token Meter:

- "Why is the input number so large?"
- "How much of that input was full-price versus cache-hit discounted?"
- "What cache hit rate did this run/provider achieve?"
- "How much did cache reduce the input price?"
- "Is this price complete, partial, missing, local/free, or only estimated?"
- "If an event count is shown, what does it mean, and why should the user care?"
- "Is this the latest prompt/context size or cumulative usage across model calls?"

Guiding scope rule: **care about every built-in provider/runtime path where the user may pay provider/API money**. Local/no-provider-bill runtimes do not need live pricing experiments. Unknown arbitrary custom endpoints cannot be exhaustively experimented by definition, but the product must not show misleading zero-cost estimates for them; it must require configured pricing or mark price missing.

## Investigation Findings

The observed GLM run is not a core counting bug:

- The frontend Token Meter `Input` field is a **cumulative gross input-token summary**. It sums accounting input deltas across all token-usage events already emitted for the run/focused member/team.
- The log field `compaction_budget_evaluated.prompt_tokens` is the **latest single LLM call's prompt/input tokens** used for context-window/compaction pressure.
- The screenshot's frontend values exactly match the first ten persisted ledger events for run `daily_assistant_8cd560e03a494393a5df01ca127a149c`:
  - event count: `10`
  - gross input tokens: `115,908`
  - output tokens: `5,979`
  - total tokens: `121,887`
  - total estimated API cost: `0.479892 CNY` (displayed as `0,4799 ¥ est`)
- The first ten events also prove cache-aware cost calculation was applied:
  - gross input tokens: `115,908`
  - cached input tokens: `102,464`
  - uncached input tokens: `13,444`
  - standard input cost: `0.107552 CNY`
  - cache-read input cost: `0.204928 CNY`
  - total input cost: `0.31248 CNY`
  - output cost: `0.167412 CNY`
  - total cost: `0.479892 CNY`
- The current backend formula is structurally correct for OpenAI-compatible GLM/DeepSeek cache-hit semantics:
  - `standard_input_tokens = gross_input_tokens - cache_read_input_tokens - cache_creation_input_tokens`
  - `input_cost = standard_input_tokens * standard_input_price + cache_read_input_tokens * cache_read_price + cache_creation_input_tokens * cache_write_price`
- Current GraphQL run summaries and frontend store/UI do **not** expose these component token/cost fields, even though ledger events persist them. This is the main user-facing gap.
- The second screenshot showing `gpt-5.5 · codex_app_server · 4 events` has the same UI ambiguity: `events` means server token-usage events / model usage reports for that runtime, usually one usage report per model turn or model call. It does **not** mean user messages, chat rows, or unique prompts. If this count is not directly useful to a normal user, the primary UI should hide it or demote it into details; if shown, it must be labeled `usage reports` / `model calls` with explanatory copy.
- Provider audit found additional correctness risks beyond the GLM screenshot:
  - OpenAI/Codex cache-read pricing is represented, but model catalog freshness and context-tier assumptions need source-backed audit.
  - Anthropic/Claude cache-read prices are represented, but cache-write prices and cache-write TTL subtypes are missing, and Anthropic's `input_tokens` semantics appear to be base/non-cache input rather than gross input. A global `gross - cache` formula can undercount Anthropic standard input if used without provider semantics.
  - Gemini normalizers capture cached-content tokens, but the pricing catalog lacks cache pricing for inspected Gemini models and appears stale for Gemini 3.1 Pro Preview.
  - DeepSeek V4 Flash/Pro cache-hit/miss/output pricing matches current official docs.
  - GLM-5.2 pricing in the current code appears correct for the BigModel China endpoint shown in logs, but global Z.AI USD pricing differs, so pricing identity must be endpoint/provider specific.
  - Kimi K2.6/K2.7 prices mostly match official docs, but `kimi-k2.7-code-highspeed` has no pricing in the current catalog despite official pricing.
  - Qwen models have no trusted in-repo pricing despite official Alibaba pricing; pricing is region- and context-tier-dependent and cache discounts exist.
  - Grok pricing is present for base tiers, but higher-context pricing tiers are not represented.
  - MiniMax-M3 Standard pricing is represented, but Priority service-tier pricing is not represented.
  - OpenAI-compatible custom endpoints default to trusted zero pricing, which is unsafe for arbitrary paid endpoints. They should be `price_missing` unless a trusted/user-configured pricing config exists.
  - Ollama/LMStudio local runtimes can remain zero-cost, but the UI should label them as local/no API bill instead of implying a paid provider estimated at `$0`.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Feature / UX Observability Fix with accounting invariant tightening.
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue plus Missing Invariant for exposed accounting components.
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Small targeted extension/refactor likely needed in the token usage summary boundary; no broad ledger rewrite.
- Evidence basis: Code inspection of provider normalizers, `TokenCostCalculator`, ledger store, GraphQL summary type, frontend token store/panel, persisted SQLite ledger rows, and official DeepSeek/Z.AI cache pricing docs.
- Requirement or scope impact: Extend server-owned token summary contract to include cache/standard component fields, expose them in frontend, and keep all pricing computation server-owned.

## Recommendations

1. Keep cumulative gross input tokens as a first-class metric, but rename/label it as `Gross input` or `Cumulative input` instead of ambiguous `Input`.
2. Add a clear input breakdown:
   - `Standard input` / `uncached input`
   - `Cached input` / `cache hit`
   - `Cache write` / `cache creation` when present
   - input cache hit ratio where meaningful
3. Show cost breakdown next to token breakdown:
   - standard input estimated cost
   - cache-read estimated cost
   - cache-write estimated cost when present
   - output estimated cost
   - total estimated cost
4. Keep the frontend presentation-only. It should render server-provided totals and costs; it must not recalculate prices.
5. Tighten backend semantics so every summary field has one meaning. Avoid ambiguous “billable input” subtraction behavior; the canonical summary should expose component token counts explicitly.
6. Add/extend durable tests so cache-aware totals survive live events, GraphQL hydration, reload, and UI rendering.

## Scope Classification (`Small`/`Medium`/`Large`)

Large.

Rationale: the ledger already stores many component fields and the cost calculator already computes component costs, but this request now includes a provider-by-provider pricing/cache correctness audit across all supported providers, provider-specific accounting semantics where a global formula is unsafe, server summary and GraphQL contract expansion, frontend store/type/UI changes, provider catalog corrections, durable tests, and documentation. The implementation should still be staged so the core summary/UI path remains coherent, but the correctness surface crosses multiple providers and runtimes.

## In-Scope Use Cases

- UC-001: User views a token-heavy agent/tool run and can tell gross input from uncached and cached input.
- UC-002: User sees why a high gross input-token count does not imply full-price input cost when most tokens are cached.
- UC-003: User can inspect per-component estimated API cost and cost status without reading logs or the database.
- UC-004: Reopened/historical runs hydrate the same token/cost breakdown through GraphQL summaries.
- UC-005: Live runtime events update the same breakdown during an active run.
- UC-006: Developers can verify provider cache fields are mapped consistently for supported runtimes/providers.
- UC-007: User can see cache hit rate and cost-saving context for a run/provider, including when cache is zero, unsupported, not reported, or unknown.
- UC-008: User can understand that `usage events` are token-usage/model-call reports, not user messages.
- UC-008A: Normal users are not distracted by implementation-oriented usage-event counts in the primary Token Meter when those counts do not help explain money or tokens.
- UC-009: User can tell whether a displayed price is complete/trusted, partial because one component lacks price, missing, local/no API bill, or mixed/incompatible due to currency/provider aggregation.
- UC-010: Developer can audit every supported provider's pricing source, cache fields, cache pricing support, tiering assumptions, and remaining unsupported dimensions.

## Out of Scope

- Replacing the token usage ledger table.
- Changing provider billing semantics or pretending to know provider invoice totals beyond exposed usage/pricing data.
- Frontend-side price calculation.
- Changing compaction to use cumulative historical spend.
- Adding a full per-event invoice viewer with raw request/response payloads. A compact provider/model summary table or expandable aggregate detail is in scope; raw event drilldown can remain future work.
- Reconciling against provider invoices, taxes, enterprise discounts, prepaid credits, or post-hoc billing adjustments.
- Guessing pricing for custom paid endpoints without a trusted pricing source or user-configured price.
- Live experiments for local/no-provider-bill runtimes (`OLLAMA`, `LMSTUDIO`), arbitrary `OPENAI_COMPATIBLE` custom endpoints, and the remote `AUTOBYTEUS` provider pricing-config path. These still need safe UI/status behavior, but they do not need paid-provider cache/pricing experiments in this task.

## Functional Requirements

- REQ-001: The server-owned run/team/member token usage summary must include cumulative gross input tokens, standard/uncached input tokens, cache-read input tokens, cache-creation input tokens, output tokens, reasoning output tokens, and total tokens.
- REQ-002: The server-owned run/team/member token usage summary must include estimated component costs for standard input, cache-read input, cache-creation input, total input, output, reasoning output, and total API estimate when pricing is trusted for those dimensions.
- REQ-003: The cost calculator must continue to price cached input separately from standard input and must mark cost status `partial_price_missing` when positive cache-read or cache-creation tokens are observed but the relevant trusted cache price is missing.
- REQ-004: Provider/runtime token normalizers must map supported cache fields into canonical component fields before persistence. At minimum, preserve existing mappings for OpenAI-compatible (`prompt_tokens_details.cached_tokens`, `cached_tokens`, `prompt_cache_hit_tokens`), Anthropic/Claude cache read/write fields, Gemini cached content fields, Codex cached input fields, GLM, DeepSeek, and Kimi where exposed.
- REQ-005: The frontend Token Meter must display a cache-aware breakdown instead of only broad Input/Output/Total cards.
- REQ-006: The frontend Token Meter must label gross/cumulative input clearly and must not imply it is full-price input or current active context size.
- REQ-007: The frontend must render server-provided component token/cost fields and cost statuses without recalculating prices locally.
- REQ-008: Historical GraphQL hydration and live WebSocket `TOKEN_USAGE_UPDATED` updates must produce consistent displayed breakdowns.
- REQ-009: The UI must gracefully hide zero/unknown component rows while still exposing enough detail when cache/reasoning/cost components are present.
- REQ-010: Documentation must record the meaning of gross input, standard input, cached input, cache creation, output, reasoning output, cumulative usage, and active context/compaction prompt tokens.
- REQ-011: The server-owned summary must include cache ratios derived from authoritative component counts:
  - `cacheReadInputTokenRate = cacheReadInputTokens / grossInputTokens` when gross input is positive and cache-read tokens are meaningful.
  - `standardInputTokenRate = standardInputTokens / grossInputTokens` when gross input is positive.
  - Cache-creation/write ratio when cache-creation tokens are positive or provider-supported.
- REQ-012: The summary and UI must distinguish cache states instead of collapsing them into one zero value:
  - `positive`: provider reported positive cache tokens.
  - `zero_reported`: provider reported cache-capable fields but they were zero.
  - `not_reported`: provider response did not include cache fields.
  - `unsupported_or_local`: provider/runtime has no provider-side paid cache concept in this context.
  - `unknown`: the system cannot determine support/reporting from the current event.
- REQ-013: The UI must rename or explain `events` as `usage events` / `model usage reports`, with concise copy explaining that each event is a token-usage update from a runtime/provider, usually corresponding to one model call or model turn, not a user message.
- REQ-014: Provider pricing definitions must be audited and corrected for every supported provider: `OPENAI`, `OPENAI_COMPATIBLE`, `ANTHROPIC`, `MISTRAL`, `GEMINI`, `OLLAMA`, `DEEPSEEK`, `GROK`, `AUTOBYTEUS`, `KIMI`, `QWEN`, `LMSTUDIO`, `GLM`, and `MINIMAX`.
- REQ-015: The pricing system must not use a single implicit input-token semantic for all providers. It must encode whether the provider's reported input token count is:
  - gross prompt/input including cache-read/cache-write tokens; or
  - base/non-cache input with cache-read/cache-write reported as separate additive buckets.
  The cost calculator/projection must use that semantic to avoid subtracting cache tokens twice or undercounting gross input.
- REQ-016: Where providers distinguish cache creation/write subtypes with different prices, the canonical usage shape must preserve enough subtype detail to price correctly, or else the affected component must be marked `partial_price_missing`/`pricing_dimension_missing` rather than guessed.
- REQ-017: The UI must display cache-aware cost insight in an understandable way:
  - top-level gross/cumulative input and output remain visible;
  - input expands into uncached/full-price, cache-hit/read, and cache-write/creation rows;
  - cache hit rate is shown when meaningful;
  - input cost shows effective cost after cache and, when price data is complete, optional `saved vs no-cache` context.
- REQ-018: The UI must make price status understandable:
  - `complete estimate` when all observed priced components have trusted prices;
  - `partial estimate` when some observed component price is missing;
  - `price missing` when no trusted price exists for a paid provider/model;
  - `local/no API bill` for local zero-cost runtimes;
  - `mixed currency/provider` when an aggregate cannot be safely summed into one monetary total.
- REQ-019: OpenAI-compatible custom endpoints must not default to trusted zero pricing for arbitrary remote endpoints. They must either use explicit configured pricing or surface `price_missing`/no estimate.
- REQ-020: The implementation must produce a durable provider pricing/cache audit artifact or documentation section listing for each supported provider: normalized usage fields, input-token semantic, cache support/reporting fields, cache pricing dimensions, official/source pricing date, known tier/service-region assumptions, implementation status, and open gaps.
- REQ-021: Historical and live summaries must be consistent for provider/model/currency grouping. If a run mixes multiple providers, models, runtimes, or currencies, the UI must preserve aggregate token totals but avoid presenting an unsafe single monetary estimate unless the server marks it safe.
- REQ-022: Price calculation must be modeled as a provider/model/runtime pricing policy rather than one global flat formula. Each policy must declare the dimensions it supports, including standard input/miss, cache read/hit, cache creation/write, output, reasoning/thinking handling, context-length tiers, service tiers, region/endpoint/currency, and whether prices are trusted, missing, partial, or local/no-bill.
- REQ-023: The cost calculator must evaluate usage through the selected pricing policy and must return a structured result with component token counts, component costs, missing dimensions, applied tier/region/service metadata, and overall estimate status. It must not silently coerce missing cache prices, missing tier policy, or custom endpoint prices to zero.
- REQ-024: The Token Meter primary UI should not show implementation-oriented event counts by default unless they help explain a visible token/cost number. If retained, event counts belong in an expandable `Details` / `Calculation details` section and must be labeled as `usage reports` or `model calls`, not raw `events`.
- REQ-025: The implementation/validation plan must include controlled live usage-payload experiments for every in-scope paid/managed provider or runtime path where API access is available:
  - `OPENAI` including Codex app-server usage mapping;
  - `ANTHROPIC` including Claude Agent SDK usage mapping;
  - `GEMINI`;
  - `DEEPSEEK`;
  - `GROK`;
  - `KIMI`;
  - `QWEN`;
  - `GLM`.
  `MISTRAL` and `MINIMAX` are excluded from live experiments by explicit user instruction on 2026-06-25 and should use docs/catalog-safe status handling for this task.
  These experiments must capture real provider/runtime usage payloads, identify returned cache fields, identify whether input tokens are gross or additive/base, and compare the result against the provider pricing policy. Local/no-bill runtimes, arbitrary custom OpenAI-compatible endpoints, and the remote AutoByteus-provider pricing-config path are excluded from live experiment requirements unless separately prioritized.
- REQ-026: Live experiments must be designed as small, cost-bounded, optionally executable diagnostics rather than mandatory CI checks. Durable CI should use sanitized fixtures captured from docs/live payloads so validation does not require API keys or incur provider charges.
- REQ-027: Each in-scope provider/runtime experiment must be performed and documented independently before that provider/runtime is marked confirmed. The investigation notes must record, immediately after each experiment:
  - provider/runtime/model tested;
  - API endpoint or SDK path used;
  - whether cache was expected and how the prompt was structured to create a cache opportunity;
  - sanitized raw usage payload or exact usage fields returned;
  - observed gross/base input tokens, cache-read/cache-hit tokens, cache-miss/uncached tokens, cache-write/cache-creation tokens, output tokens, and reasoning/thinking tokens when present;
  - concluded input-token semantic (`gross_includes_cache`, `base_excludes_cache`, or provider-specific alternative);
  - pricing policy applied and component-cost calculation;
  - remaining uncertainty, if any.
- REQ-028: If a required API key, account, model access, or provider-side cache feature is unavailable, the agent must ask the user for the specific missing credential/access before marking that provider/runtime confirmed. The provider/runtime may only be recorded as `blocked_pending_key_or_access` with the exact missing item until the user provides it or explicitly removes that provider/runtime from scope.
- REQ-029: Every live provider/runtime experiment intended to confirm cache behavior must use at least two sequential calls/turns with a stable repeated prefix and a small changed suffix. The first call may warm/create cache; only the second or later call can confirm cache-read/cache-hit semantics. Single-call probes may be used only for initial response-shape reconnaissance and must not mark cache behavior confirmed.
- REQ-030: The Token Meter must include a separate statistics-only current context section when server context fields are available. It should show the latest/current prompt tokens over the effective context window and the context-window usage percentage. It must remain separate from cumulative cost usage and must not display compaction/compression decision text such as `compression not needed`.
- REQ-031: Frontend Token Meter implementation must include implementation-time visual validation in a running app, not only unit/static checks. The implementation engineer must start the backend/server and frontend, run or use a real token-emitting agent run (a dummy/test agent is acceptable if it exercises the real token usage path), open the Token Meter area, inspect the layout with realistic data, and iterate on the frontend until the Token Meter is visually usable and not cramped, broken, or confusing. The implementation handoff must record the commands/environment used, the agent/run used, and visual QA evidence or notes; a screenshot should be captured when practical.


## Agreed Token Meter UI Shape

User approved this Token Meter structure on 2026-06-25. Implementation must preserve the same information hierarchy even if exact styling changes.

```text
Token Meter
Live server-accounted usage and estimated API price.

Current prompt
12,625 / 1,000,000 ctx tokens
1.3% used

Gross input              Output                 Total estimate
650,712 tokens           3,985 tokens           654,697 tokens
Cache hit 88.4%          Thinking 1,548         $0.5300 est
Cost $0.4104             Cost $0.1195

Input breakdown
Uncached / full-price input    75,480 tok    $0.1887
Cache hits / discounted input  575,232 tok   $0.2217
Cache writes                   —             —
Total input cost                             $0.4104

Pricing details
Model              gpt-5.5
Runtime            codex_app_server
Price status       Complete estimate
Usage reports      4 model calls
```

Required display semantics:

- `Current prompt` is the latest/current prompt size over the effective context window. It is not cumulative usage and must not show compaction/compression decision text.
- `Gross input` is cumulative input usage/cost accounting across usage reports/model calls. It includes cached tokens.
- Input breakdown must separate uncached/full-price input, cache hits/discounted input, cache writes when reported, and total input cost.
- Cache writes should be hidden or shown as `—`/not reported when the provider does not report them; the UI must not imply every request writes cache.
- `events` must not be shown as an unexplained primary label. If the count is shown, use `Usage reports` or `model calls` in the details section with explanatory copy.
- Missing/partial pricing must show token counts but mark the relevant cost component as `price missing`/`partial estimate`; do not silently treat missing price dimensions as zero.
- Local runtimes must show `Local / no API bill` instead of a paid-provider `$0 est`.


## Implementation-Time Frontend Visual Validation Requirement

Because the Token Meter change is a visible UI/layout change, implementation is not complete until the implementer has inspected it in the running product with realistic token data.

Required implementation-engineer workflow:

1. Start the backend/server.
2. Start the frontend.
3. Run or select a real token-emitting agent run. A dummy/test agent is acceptable only if it goes through the real agent/token usage path and produces realistic Token Meter data.
4. Open the Token Meter area in the app.
5. Visually inspect the approved layout:
   - `Current prompt`
   - `Gross input`
   - `Output`
   - `Total estimate`
   - `Input breakdown`
   - `Pricing details`
6. Iterate on frontend spacing, wrapping, labels, responsiveness, and readability until the layout is good-looking and understandable.
7. Record the verification in the implementation handoff, including commands/environment, agent/run used, and visual QA evidence or notes. Capture a screenshot when practical.

Static tests, store tests, or component unit tests alone are not enough for this frontend change.

## Acceptance Criteria

- AC-001: Given the screenshot GLM run's first ten token usage events, the run summary exposes `grossInputTokens=115,908`, `cacheReadInputTokens=102,464`, `standardInputTokens=13,444`, `outputTokens=5,979`, and `totalTokens=121,887` or equivalent canonical names.
- AC-002: Given the same run, the run summary exposes `estimatedApiStandardInputCost=0.107552 CNY`, `estimatedApiCacheReadInputCost=0.204928 CNY`, `estimatedApiInputCost=0.31248 CNY`, `estimatedApiOutputCost=0.167412 CNY`, and `estimatedApiTotalCost=0.479892 CNY`, subject to normal floating-point tolerances.
- AC-003: The Token Meter displays the above cache-aware breakdown after live events and after GraphQL reload/hydration.
- AC-004: A run with no cache fields still displays standard/gross input and output clearly without empty noisy cache rows.
- AC-005: A run with cache tokens but missing trusted cache pricing shows token counts and marks cost status as partial/missing for that component rather than silently treating it as zero-cost.
- AC-006: The frontend does not compute component costs from prices; it only formats server summary fields.
- AC-007: Existing total cost and total token displays remain numerically compatible with the ledger summary and do not regress.
- AC-008: Durable tests cover server summary aggregation, GraphQL fields, frontend store live updates, and Token Meter rendering for cached input.
- AC-009: Documentation explains that cumulative input tokens contribute to gross usage while cached input may be discounted, and separately explains that compaction prompt tokens are latest active-context tokens.
- AC-010: Given the screenshot GLM first-ten-event aggregate, the summary/UI shows cache hit rate `102,464 / 115,908 = 88.4%` rounded consistently, and makes clear that only `13,444` tokens were uncached/full-price input.
- AC-011: Given the same aggregate, when all GLM prices are trusted and same-currency, the UI shows a complete CNY estimate and an input breakdown: standard input cost `0.107552 CNY`, cache-hit input cost `0.204928 CNY`, total input cost `0.31248 CNY`, output cost `0.167412 CNY`, total `0.479892 CNY`.
- AC-012: Given a provider event with cache tokens but no cache-read price, token counts and cache hit rate still render, but the cost label is `partial estimate` and identifies the missing cache-read price rather than silently treating cache as free.
- AC-013: Given Anthropic/Claude usage with `input_tokens=100`, `cache_read_input_tokens=900`, and output tokens, the canonical gross input is `1,000`, standard/base input is `100`, cache hit rate is `90%`, and pricing does not subtract `900` from `100`.
- AC-014: Given Anthropic/Claude usage with cache creation tokens where the response distinguishes 5-minute and 1-hour cache-write buckets, those buckets are priced with their distinct official rates. If the response only exposes an undifferentiated cache-creation total and both prices are possible, the component is marked partial/missing instead of guessed.
- AC-015: Given an OpenAI-compatible custom endpoint model without explicit trusted pricing, the UI does not show `$0 est`; it shows price missing/no estimate while still showing tokens.
- AC-016: Given `kimi-k2.7-code-highspeed`, the pricing catalog uses official highspeed rates or marks pricing missing; it must not silently fall back to the standard Kimi K2.7 Code rate or zero.
- AC-017: Given Gemini models that report cached-content tokens, cache tokens are shown and priced when the current model catalog has trusted cache pricing; otherwise the price status is partial with the missing cache-price dimension visible.
- AC-018: Given Qwen models, the system either applies the correct configured official region/tier/cache pricing policy or marks the price missing/partial. It must not show a trusted flat estimate when the required region/tier/cache policy is unknown.
- AC-019: Given a Token Meter line like `gpt-5.5 · codex_app_server · 4 usage events`, a tooltip or helper text explains that a usage event is a runtime/provider token-usage report, usually corresponding to one model call/turn, not a chat message.
- AC-020: Given a local Ollama/LMStudio run, the UI labels price as local/no API bill instead of complete paid-provider estimate.
- AC-021: Given a mixed-currency aggregate, token totals remain visible but monetary totals are grouped by currency/provider or marked mixed instead of summed into one fake total.
- AC-022: Given any provider with supported cache-hit pricing, positive cached tokens lower the input cost according to that provider's pricing policy, and the UI exposes both cache-hit tokens/rate and cache-hit cost.
- AC-023: Given any provider whose pricing requires endpoint, region, service tier, or context tier that the system cannot determine, the cost result is partial/missing with an explicit missing dimension; it is not shown as a complete estimate.
- AC-024: Given a normal Token Meter view, raw `events` is not shown as unexplained primary information. It is either hidden from the primary view or shown only in calculation details as `usage reports` / `model calls` with explanatory text.
- AC-025: For each in-scope paid/managed provider/runtime listed in REQ-025, the investigation or validation artifact includes either a captured live usage payload with cache/pricing interpretation or an explicit blocker explaining why the live experiment could not be run.
- AC-026: CI/regression tests for provider usage/pricing semantics use deterministic sanitized fixtures and do not require live API keys, local paid accounts, or provider network access.
- AC-027: No provider/runtime in REQ-025 is labeled `confirmed`, `complete`, or `100% clear` unless its investigation entry includes a captured usage payload/fields and the semantic/pricing conclusion listed in REQ-027.
- AC-028: When a provider key/access is missing, the investigation notes identify the exact missing key/access and the workflow asks the user for it instead of substituting docs-only assumptions.
- AC-029: For every provider/runtime marked cache-confirmed, the evidence includes at least two sequential calls/turns and the confirming call shows either positive cache-hit/cache-read tokens or a provider-specific explicit absence/unsupported result after a real cache opportunity.
- AC-030: Given a summary with `latestPromptTokens=12,625`, `effectiveContextWindowTokens=1,000,000`, and `contextWindowUsagePercent=1.3`, the Token Meter shows a separate current prompt/context statistic such as `12,625 / 1,000,000 context tokens` and `1.3% used`, without showing compaction/compression status text.
- AC-031: After frontend implementation, the implementation handoff includes evidence that the engineer started the server and frontend, exercised a real token-emitting agent run, opened the Token Meter UI, inspected the approved `Current prompt`, `Gross input`, `Input breakdown`, and `Pricing details` layout with realistic data, and either confirmed the layout is visually acceptable or iterated until it is.

## Constraints / Dependencies

- Preserve provider/API usage accounting semantics for cost calculation.
- Preserve compaction semantics tied to active context capacity.
- Respect current agent runtime event model and frontend Token Meter data flow.
- Avoid dual authoritative definitions for the same token scope.
- Preserve mixed-currency behavior: aggregate token counts may remain visible, but incompatible currencies must not be summed into a fake total.
- Current ledger already stores component fields; prefer summary/API/UI extension over schema rewrite unless implementation discovers a missing persisted field.
- Pricing docs change frequently; implementation must record source/date metadata for price catalog entries where practical.
- Provider usage semantics differ; canonical usage fields must include enough metadata to avoid applying OpenAI-compatible assumptions to Anthropic/Gemini/Qwen/etc.

## Assumptions

- GLM run used the BigModel/Zhipu China endpoint and the current CNY pricing catalog is intended for that endpoint.
- DeepSeek V4 official pricing remains as observed on 2026-06-25: cache hit/miss/output dimensions per 1M tokens.
- The Token Meter should remain an aggregate summary rather than a full event-by-event invoice viewer for this scope.
- The UX should prioritize understandable aggregate insight over exhaustive raw provider payload display.
- Showing cache rate is possible wherever the runtime/provider reports cache-read tokens or the system can infer them from canonical component counts.

## Risks / Open Questions

- Naming: `Gross input`, `Cumulative input`, or `Total input sent` needs product copy choice.
- For future providers that expose a field named `billable_input_tokens`, we need a precise invariant: does it mean gross input basis, net non-cache billable input, or provider-final billable equivalent? The design should avoid subtracting cache twice.
- Z.AI global USD pricing differs from BigModel CN CNY pricing. If both endpoints are selectable for `glm-5.2`, model identity/pricing identity must be explicit enough that the wrong catalog is not used.
- UI density: compact cards likely need an expandable details section or grouped breakdown rows to avoid overcrowding the side panel.
- Qwen pricing depends on Alibaba region and context tier; provider configuration may need a pricing-region/service-tier dimension.
- Grok and Gemini have context-length pricing tiers; the design must define whether tier selection uses per-request input tokens, total input tokens, model context window, or provider-specific billing rule.
- MiniMax has Standard/Priority service tiers; if runtime can request Priority, pricing must include service tier or mark partial.

## Requirement-To-Use-Case Coverage

- UC-001: REQ-001, REQ-005, REQ-006
- UC-002: REQ-001, REQ-002, REQ-005
- UC-003: REQ-002, REQ-003, REQ-007, REQ-009
- UC-004: REQ-001, REQ-002, REQ-008
- UC-005: REQ-001, REQ-002, REQ-008
- UC-006: REQ-003, REQ-004, REQ-010
- UC-007: REQ-011, REQ-012, REQ-017
- UC-008: REQ-013
- UC-008A: REQ-024
- UC-009: REQ-002, REQ-003, REQ-018, REQ-021
- UC-010: REQ-014, REQ-015, REQ-016, REQ-019, REQ-020, REQ-022, REQ-023
  - Live provider/runtime validation: REQ-025, REQ-026
- UC-011: REQ-030
- UC-012: REQ-031

## Acceptance-Criteria-To-Scenario Intent

- AC-001: Token component aggregation correctness scenario.
- AC-002: Cost component aggregation correctness scenario.
- AC-003: UI live/reload visibility scenario.
- AC-004: No-cache provider/runtime scenario.
- AC-005: Partial pricing/missing cache-price safety scenario.
- AC-006: Frontend presentation-only boundary scenario.
- AC-007: Backward-compatible total summary scenario without preserving misleading UI semantics.
- AC-008: Durable regression coverage scenario.
- AC-009: Documentation/operational clarity scenario.
- AC-010: Cache-rate explanation scenario.
- AC-011: Complete GLM cache-aware monetary breakdown scenario.
- AC-012: Missing cache price safety scenario.
- AC-013: Provider-specific input-token semantic scenario.
- AC-014: Provider-specific cache-write subtype scenario.
- AC-015: Custom OpenAI-compatible endpoint no-false-zero scenario.
- AC-016: Kimi highspeed pricing completeness scenario.
- AC-017: Gemini cache-aware pricing scenario.
- AC-018: Qwen region/tier/cache safety scenario.
- AC-019: Usage-event terminology scenario.
- AC-020: Local runtime price-status scenario.
- AC-021: Mixed-currency aggregate safety scenario.
- AC-022: Provider cache discount application scenario.
- AC-023: Provider pricing-policy missing-dimension safety scenario.
- AC-024: Event-count demotion/removal UX scenario.
- AC-025: Paid/managed provider live-payload validation scenario.
- AC-026: Fixture-based CI validation scenario.
- AC-027: Provider confirmation evidence scenario.
- AC-028: Missing API key/access escalation scenario.
- AC-029: Two-round cache confirmation scenario.
- AC-030: Current context statistics scenario.
- AC-031: Frontend visual validation scenario.

## Approval Status

Approved for design by user instruction on 2026-06-25 after completion of the two-round live probe matrix. Downstream implementation remains gated on architecture review of the design spec.
