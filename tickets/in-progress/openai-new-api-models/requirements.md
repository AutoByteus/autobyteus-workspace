# OpenAI GPT-5.6 API Model Integration Requirements

## Status

`Design-ready — approved`

## Goal / Problem Statement

Add the three newly released OpenAI GPT-5.6 API models shown in the supplied Codex screenshot—GPT-5.6 Sol, GPT-5.6 Terra, and GPT-5.6 Luna—to the built-in OpenAI API catalog in `autobyteus-ts`, and ensure their distinct cache-write charges reach the existing frontend Token Meter as visible cache-write tokens, unit price, and calculated cost.

Official OpenAI API documentation now publishes all three model pages, canonical API identifiers, capabilities, limits, reasoning-effort values, and prices. The models therefore meet the user's condition for integration. Access is still account-dependent: the API credential available during investigation was not entitled to this rollout even though the public API contracts are published.

## Investigation Findings

### Availability and canonical mapping

| Requested display name | Canonical API model ID | Public API evidence | Current investigation credential |
| --- | --- | --- | --- |
| GPT-5.6 Sol | `gpt-5.6-sol` | Official model page and model catalog | Recognized by the Responses API, but returned `model_not_found` with a limited-preview/not-enabled-for-account explanation |
| GPT-5.6 Terra | `gpt-5.6-terra` | Official model page and model catalog | Recognized by the Responses API, but returned `model_not_found` with a limited-preview/not-enabled-for-account explanation |
| GPT-5.6 Luna | `gpt-5.6-luna` | Official model page and model catalog | Recognized by the Responses API, but returned `model_not_found` with a limited-preview/not-enabled-for-account explanation |

The official catalog also documents `gpt-5.6` as an alias for Sol. That alias is not a fourth model and is intentionally not proposed as a separate catalog row.

### Published contract shared by all three models

- API path: Responses API is supported and is the recommended path for reasoning/tool workflows.
- Inputs/outputs: text and image input; text output.
- Context window: `1,050,000` tokens.
- Maximum output: `128,000` tokens.
- Knowledge cutoff: 2026-02-16 (informational; the current internal metadata contract does not expose this field).
- Reasoning effort: `none`, `low`, `medium`, `high`, `xhigh`, `max`; omitted effort defaults to `medium`.
- Standard input/output/cache-read prices per 1M tokens:
  - Sol: `$5.00` / `$30.00` / `$0.50`.
  - Terra: `$2.50` / `$15.00` / `$0.25`.
  - Luna: `$1.00` / `$6.00` / `$0.10`.
- Cache writes: `1.25x` the uncached input price.
- Long-context pricing: requests above `272,000` input tokens use `2x` input and `1.5x` output pricing for the full request.

### Current repository shape

- `autobyteus-ts/src/llm/supported-model-definitions.ts` is the authoritative built-in model catalog owner for model IDs, provider class, parameter schema, and pricing.
- `autobyteus-ts/src/llm/metadata/curated-model-metadata.ts` owns documentation-backed context/output limits for OpenAI models.
- `LLMFactory` constructs and registers catalog rows, exposes them to the server catalog, and creates `OpenAILLM` instances by identifier.
- `OpenAILLM` already delegates to the Responses API through `OpenAIResponsesLLM`; arbitrary current model strings and the existing reasoning mapping do not require an SDK or provider rewrite.
- GPT-5.6 adds `max` reasoning effort, while the current shared OpenAI schema stops at `xhigh`; a family-specific schema is required so older models do not incorrectly advertise `max`.
- GPT-5.6 charges cache writes, and the existing token/pricing domain already represents generic cache-creation tokens and cache-write price. The OpenAI-compatible usage normalizer does not yet map the published `cache_write_tokens` field into that existing domain shape.
- The server, GraphQL/live-event protocol, frontend types, `tokenUsageMeterStore`, and `TokenUsageMeterPanel` already carry and render the generic cache-write dimension as `cacheCreationInputTokens`, `unitPrices.cacheCreationInput`, and `estimatedApiCacheCreationInputCost`. The current frontend production path is therefore capable; it receives no OpenAI GPT-5.6 write data only because the upstream OpenAI normalizer and model pricing facts are missing.

## Supplemental Solution Artifacts

None. The mapping and contract table above is compact enough to remain authoritative in this requirements doc. A separate UI/UX supplement is unnecessary because this task does not create a new screen or interaction: `REQ-010`, `AC-011`, and `AC-012` precisely preserve the existing Token Meter states and accessible Calculation details disclosure.

## Design Health Assessment (Mandatory)

- Change posture: `Feature`
- Initial design issue signal: `No`
- Root cause classification: `No Design Issue Found`
- Refactor posture: `Likely Not Needed`
- Evidence basis: the built-in model definition, curated metadata, OpenAI Responses adapter, usage normalizer, server pricing/projection, frontend summary store, and Token Meter each already have clear owners. The new family fits those boundaries without bypasses or duplicated coordination.
- Requirement or scope impact: use a GPT-5.6-specific schema rather than broadening the older-family schema; extend the existing usage normalizer for the new cache-write field rather than introducing another accounting path; preserve the provider-neutral frontend contract rather than adding browser pricing logic.

## Recommendations

1. Integrate all three canonical API IDs now because official OpenAI API pages and contracts are public.
2. Keep the integration entitlement-neutral: catalog visibility should not depend on the local API key, matching the existing static built-in provider model pattern. Runtime access errors remain the OpenAI account's responsibility.
3. Reuse `OpenAILLM`/Responses API unchanged for standard invocation.
4. Add a GPT-5.6-specific reasoning schema with the published six efforts and `medium` default.
5. Record standard, cache-read, cache-write, and long-context prices using the existing pricing model.
6. Normalize OpenAI `cache_write_tokens` into the existing generic cache-creation token field so cost reporting remains truthful for GPT-5.6.
7. Preserve the existing server-authoritative frontend disclosure: positive GPT-5.6 cache writes must appear in Input breakdown and Calculation details with the server-provided generic write unit price and cost; do not add a frontend model-price table or recompute provider cost in the browser.
8. Add focused frontend regression evidence for a positive OpenAI-style generic cache write because the current component coverage proves calculation details generally but does not explicitly assert the generic cache-write row.
9. Do not add the unsuffixed `gpt-5.6` alias as a duplicate fourth catalog choice.

## Scope Classification

`Medium`

The registry addition is small, but truthful GPT-5.6 support also touches family-specific configuration, curated limits, tiered/cache-write pricing, usage normalization, frontend propagation/visibility, and focused durable coverage.

## In-Scope Use Cases

- `UC-001 — Catalog discovery`: an AutoByteus API-runtime user can discover Sol, Terra, and Luna as three built-in OpenAI models with accurate identifiers, limits, and reasoning options.
- `UC-002 — Standard invocation`: an entitled user can select any of the three identifiers and invoke it through the existing OpenAI Responses API adapter.
- `UC-003 — Configuration`: a user can choose every published GPT-5.6 reasoning effort, including `max`, while the exposed default matches the public API default (`medium`).
- `UC-004 — Cost metadata`: downstream token accounting can resolve evidence-backed standard, long-context, cache-read, cache-write, and output prices for each model.
- `UC-005 — Usage normalization`: a GPT-5.6 response reporting cache writes maps those tokens into the existing cache-creation usage dimension.
- `UC-006 — Frontend cost disclosure`: a user viewing the focused run's Token Meter can see positive GPT-5.6 cache-write tokens and their server-accounted unit price and estimated cost without double counting them as standard input.

## Out of Scope

- Adding `gpt-5.6` as a separate fourth catalog row; it is an alias of Sol.
- Adding or exposing GPT-5.6 Pro as a separate model slug; official guidance says pro is a reasoning mode on the selected model.
- Implementing new optional GPT-5.6 features such as `reasoning.mode`, `reasoning.context`, explicit cache breakpoints, programmatic tool calling, multi-agent, or original image-detail controls.
- Changing Codex-runtime discovery or the Codex frontend; the screenshot is request context, while this task targets the AutoByteus OpenAI API runtime.
- Redesigning the AutoByteus Token Meter, adding a new pricing screen, or changing the Settings Token Statistics information architecture. This task preserves the existing Token Meter interaction and fills its existing generic cache-write row.
- Fixing unrelated older OpenAI catalog metadata or pricing, changing the default global model, or removing existing models.
- Gating built-in catalog rows by the currently configured API key's entitlement.
- Upgrading the OpenAI SDK unless implementation proves the existing runtime path cannot submit the new model IDs or effort value.

## Functional Requirements

- `REQ-001 — Exact model set`: register exactly `gpt-5.6-sol`, `gpt-5.6-terra`, and `gpt-5.6-luna` as built-in `OPENAI` API-runtime models. For each row, `name`, `value`, and `canonicalName` must be the canonical API model ID, and `llmClass` must remain `OpenAILLM`.
- `REQ-002 — Curated limits`: resolve `maxContextTokens = 1_050_000` and `maxOutputTokens = 128_000` for all three models from their individual official model pages.
- `REQ-003 — Family-specific reasoning schema`: expose `reasoning_effort` values `none`, `low`, `medium`, `high`, `xhigh`, and `max` with default `medium`, plus the existing supported `reasoning_summary` choices. Do not add `max` to older OpenAI model schemas through this task.
- `REQ-004 — Evidence-backed pricing`: provide trusted USD pricing for each model's standard input, output, cached input read, and generic cached input write dimensions. Cache-write price must equal `1.25x` standard uncached input.
- `REQ-005 — Long-context pricing`: provide a standard tier through `272_000` input tokens and a greater-than-`272_000` tier that applies `2x` input, cache-read, and cache-write prices and `1.5x` output price for the full request.
- `REQ-006 — Cache-write usage normalization`: when OpenAI usage reports a non-negative `cache_write_tokens` value in `usage.input_tokens_details` (Responses API) or `usage.prompt_tokens_details` (Chat Completions shape), map it to `cache_creation_input_tokens` without changing gross-input semantics or fabricating a value when the field is absent. A top-level fallback may be retained only as a harmless compatibility fallback in the shared OpenAI-compatible normalizer.
- `REQ-007 — Existing Responses path`: resolve and instantiate every new model through `LLMFactory -> OpenAILLM -> OpenAIResponsesLLM`, and submit the canonical model ID to `/v1/responses` without an alias translation layer.
- `REQ-008 — Entitlement-neutral catalog`: keep all three built-in catalog rows visible independent of the configured OpenAI key's model-list result. Provider access failures must remain explicit runtime/API errors rather than silently removing or substituting a model.
- `REQ-009 — Clean scope`: do not add the unsuffixed alias as another row, do not change existing model defaults, and do not introduce compatibility wrappers or duplicate provider paths.
- `REQ-010 — Frontend cache-write disclosure`: keep the server as the authoritative accounting and price owner. For a focused Token Meter summary with positive generic `cacheCreationInputTokens` and no 5m/1h cache-write subtype, Input breakdown must display `Cache writes` with the server-provided token count and `estimatedApiCacheCreationInputCost`; expanded Calculation details must display the same generic write component with `unitPrices.cacheCreationInput`, token count, and cost under the existing `tokens ÷ 1,000,000 × unit price` disclosure. Zero or absent writes remain hidden, and missing/mixed unit-price states must render the existing non-numeric status rather than a fabricated price.

## Acceptance Criteria

- `AC-001 — Availability decision`: durable investigation evidence records each display name, canonical API ID, official source, and the current credential's entitlement result.
- `AC-002 — Catalog identity`: normal `LLMFactory` OpenAI discovery returns exactly one row for each of `gpt-5.6-sol`, `gpt-5.6-terra`, and `gpt-5.6-luna`, with provider `OPENAI`, runtime `api`, and matching value/canonical name.
- `AC-003 — No alias duplication`: OpenAI discovery contains no separate new row whose identifier is only `gpt-5.6`.
- `AC-004 — Limits`: each new model reports `max_context_tokens = 1_050_000` and `max_output_tokens = 128_000` through the model-info boundary.
- `AC-005 — Reasoning contract`: each new model's configuration schema reports default `medium` and enum `['none', 'low', 'medium', 'high', 'xhigh', 'max']`; existing OpenAI model schemas retain their current enum set.
- `AC-006 — Pricing contract`: trusted pricing lookup returns the correct standard prices, cache-read prices, cache-write prices, and two long-context tiers for all three new identifiers.
- `AC-007 — Invocation resolution`: `LLMFactory.createLLM` resolves each identifier to `OpenAILLM`, and focused request-construction coverage proves `reasoning_effort: 'max'` becomes Responses API `reasoning.effort: 'max'` with the selected canonical model ID.
- `AC-008 — Cache usage contract`: focused usage-normalizer coverage proves nested Responses/Chat `cache_write_tokens` maps to `cache_creation_input_tokens`, participates in positive cache-state classification, and remains `null` when the field is absent.
- `AC-009 — Regression safety`: relevant existing model catalog, metadata resolution, OpenAI request construction, token usage, and TypeScript build checks pass without unrelated catalog churn.
- `AC-010 — Live API evidence`: with a credential entitled to GPT-5.6, a minimal non-destructive Responses API invocation succeeds for each model. If no entitled credential is available, execution must preserve the official contract evidence plus the exact `model_not_found`/entitlement result and report live success as unverified rather than failing or claiming a pass.
- `AC-011 — Frontend data-path contract`: both a live `TOKEN_USAGE_UPDATED` event and an equivalent ledger-backed GraphQL summary preserve generic cache-write tokens, generic cache-write unit price, generic cache-write cost, input cost, and total cost into the same `TokenUsageRunSummary` shape without frontend provider-specific branching.
- `AC-012 — Frontend visible result`: for a server-backed GPT-5.6-style summary with positive generic cache-write tokens, the focused Token Meter shows a `Cache writes` row in Input breakdown and, after the existing accessible Calculation details toggle is expanded, shows the cache-write tokens, per-million unit price, and estimated cost. With zero/absent writes the row is absent; with mixed or missing pricing no fake numeric unit price is shown.

## Constraints / Dependencies

- Official OpenAI model pages and model guidance are authoritative for identifiers, limits, efforts, and prices.
- OpenAI account/model entitlement is independent from Codex product visibility and may roll out at a different time.
- The current available API credential is valid but does not list or permit the three models as of 2026-07-10.
- Secrets must remain in environment variables and must not be copied into artifacts, logs, fixtures, or source.
- The existing OpenAI Responses adapter uses a permissive request shape, so model integration should not require SDK migration.
- The existing server GraphQL/live-event and frontend Token Meter contracts remain the authority for user-visible component values; the web app must not import provider pricing metadata.

## Persisted Data Outcome (When Applicable)

- Stored subject / location: no stored schema changes. Static model definitions and pricing metadata are read into runtime catalogs.
- Required outcome: `Not Affected`
- Existing data to preserve, discard/rebuild, transform, or quarantine: saved configurations for all existing model identifiers remain unchanged; new identifiers become valid choices.
- Unacceptable data loss or corruption: modifying or reinterpreting an existing saved model identifier or pricing record.
- Relevant availability, maintenance-window, or rollout constraints: none; provider entitlement is evaluated by OpenAI when invoked.
- Related requirement and acceptance-criteria IDs: `REQ-008`, `REQ-009`, `AC-003`, `AC-009`.

## Assumptions

- The user intends the three screenshot entries `GPT-5.6-Luna`, `GPT-5.6-Sol`, and `GPT-5.6-Terra`.
- Static registration before every account is entitled is acceptable and consistent with the current built-in model catalog.
- Standard GPT-5.6 invocation, model discovery, model-specific reasoning effort, limits, and truthful token pricing/usage are the intended integration boundary; optional new GPT-5.6 platform features are separate follow-up work.

## Risks / Open Questions

- `RISK-001`: current live credentials cannot prove a successful invocation until the API organization receives GPT-5.6 access. Mitigation: official contract evidence, deterministic request coverage, preserved entitlement error evidence, and a later entitled live smoke.
- `RISK-002`: public docs are changing rapidly during rollout. Mitigation: record verification date and direct model-page URLs, then recheck during API/E2E and delivery integration.
- `RISK-003`: the officially documented nested usage shape remains unobserved with the current non-entitled credential. Mitigation: cover both documented detail-object names deterministically and validate against an entitled response when available.
- `RISK-004`: the generic frontend transport/store path is already covered, but current Token Meter component tests do not directly assert a positive generic write-price row. Mitigation: add/confirm focused component-visible evidence without changing production UI ownership.

## Requirement-To-Use-Case Coverage

| Use Case | Requirements |
| --- | --- |
| `UC-001` Catalog discovery | `REQ-001`, `REQ-002`, `REQ-003`, `REQ-008`, `REQ-009` |
| `UC-002` Standard invocation | `REQ-001`, `REQ-007`, `REQ-008` |
| `UC-003` Configuration | `REQ-003`, `REQ-007` |
| `UC-004` Cost metadata | `REQ-004`, `REQ-005` |
| `UC-005` Usage normalization | `REQ-006` |
| `UC-006` Frontend cost disclosure | `REQ-004`, `REQ-005`, `REQ-006`, `REQ-010` |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion | Scenario Intent |
| --- | --- |
| `AC-001` | Evidence/mapping review for all three candidates |
| `AC-002`, `AC-003`, `AC-004`, `AC-005` | Static catalog discovery and metadata contract |
| `AC-006` | Pricing lookup at standard and long-context tiers |
| `AC-007` | Factory resolution and Responses request construction |
| `AC-008` | Cache-write usage normalization edge cases |
| `AC-009` | Focused regression and build execution |
| `AC-010` | Entitled live smoke or explicit entitlement-limited evidence |
| `AC-011` | Live-event and GraphQL-hydration convergence for generic cache-write fields |
| `AC-012` | Focused Token Meter positive/zero/mixed cache-write display states and calculation disclosure |

## Approval Status

Approved by the user on 2026-07-10 after detailed clarification of request-local KV cache, cross-request prompt-cache reads, prompt-cache writes, and the current AutoByteus cache-write pricing gap. The user explicitly stated that the requirement was clear and authorized the team to proceed. The same day, the user expanded the approved basis with an explicit observable requirement that cache-write price and calculated cost be shown in the existing frontend calculation details; `REQ-010`, `AC-011`, and `AC-012` record that direction without introducing a new UI design.
