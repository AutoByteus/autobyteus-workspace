# Investigation Notes

## Investigation Meta

- Package identifier: `astra-fable-pricing-support`
- Request / ticket: User request of 2026-09-22 to investigate and add missing pricing support for Codex App Server model Astra and Claude Fable 5.1.
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/astra-fable-pricing-support`
- Repository mode: `Git`
- Task worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/astra-fable-pricing-support` / `codex/astra-fable-pricing-support`
- Resolved base remote / branch / revision: `origin/personal` / `personal` / `d883f5620a0abaed147209ad0e42a8960df70e68`
- Finalization target remote / branch: `origin` / `personal`
- Bootstrap result: Dedicated clean task worktree created after refreshing `origin/personal`.
- Bootstrap blocker: None.
- Current solution revision ID: `SR-001`
- Investigation status: Requirements investigation complete; requirements are ready for explicit user approval. Architecture investigation has not started.

## Initial Request And Clarifications

- Original request: Investigate absent Astra pricing when Astra is selected through the Codex App Server runtime, verify whether Claude Fable 5.1 is also unsupported, and add correct support. The user does not require real billable model calls because the existing framework is considered sufficiently robust.
- Clarifications received: `continue please` after the initial investigation turn was interrupted; no behavior change was requested.
- User-supplied facts and constraints:
  - Sol and Luna already have support.
  - Astra is selectable through the Codex App Server runtime but its price is missing.
  - Claude Fable 5.1 is suspected to have the same support gap.
  - Do not perform real paid-model inference solely for this change.
- Initial ambiguity and resolution:
  - The exact provider IDs and current prices were verified from first-party provider documentation.
  - “Support” is scoped to exact model catalog/pricing recognition, metadata, and compatibility with the existing request/pricing pipeline. New provider features, fallbacks, or pricing modes are not implied.
  - The intended price basis is first-party Standard API pricing, consistent with the existing catalog. Fast, Batch, Flex, regional/inference-geography, private-contract, and subscription-credit variants require separate identity/policy support and are not silently inferred.

## Product And Domain Understanding

- Product area: Runtime model discovery, built-in model metadata, and server-owned token-cost estimation.
- Affected actors or systems: Users selecting Codex or Claude runtime models; dynamic runtime model catalogs; the shared built-in model/pricing registry; token-usage accounting; existing token-meter and statistics views.
- Existing user or operational purpose: Runtime-owned catalogs decide which models users may select, while server-side usage accounting resolves the emitted provider/model identity against trusted built-in pricing and displays estimated API cost. Static price support can be validated without sending billable prompts.
- Relevant terminology:
  - `gpt-6-astra`: exact OpenAI API/Codex model ID.
  - `claude-fable-5-1`: exact Claude API/Claude runtime model ID.
  - Standard pricing: first-party, non-Batch/non-Flex/non-Fast, default-global pricing used by the existing built-in catalog.
  - `price_missing`: current observable cost status when positive usage has no trusted matching catalog price.

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-09-22 | User | Current conversation | Establish symptom and constraints | Astra lacks a shown price; Fable 5.1 is suspected missing; paid-model calls are not desired | Define non-billable verification |
| 2026-09-22 | Command | `git fetch origin personal`; `git worktree add -b codex/astra-fable-pricing-support ... origin/personal` | Establish isolated authoring context | Base refreshed to `d883f5620`; clean dedicated task worktree created | None |
| 2026-09-22 | Code | `autobyteus-server-ts/src/llm-management/services/codex-model-catalog.ts`; `.../codex-app-server-model-normalizer.ts` | Trace Codex selection identity | Codex `model/list` rows remain exact runtime IDs and are not owned by the AutoByteus static catalog | Price support must recognize the exact emitted ID without altering discovery |
| 2026-09-22 | Runtime | Non-billable `codex app-server` JSON-RPC `initialize` + `model/list` using `codex-cli 0.155.1` | Verify the installed runtime's exact Astra identity and capabilities without inference | Visible row is `gpt-6-astra`; default effort `medium`; advertised efforts are `low`, `medium`, `high`, `xhigh`, `max`, `ultra`; priority service tier is exposed as Fast | Preserve dynamic capability ownership; do not duplicate its effort list in runtime normalization |
| 2026-09-22 | Code | `autobyteus-server-ts/src/llm-management/services/claude-model-catalog.ts`; `.../claude-sdk-model-normalizer.ts`; `.../claude-sdk-client.ts` | Trace Claude selection identity | Claude SDK discovery preserves the exact descriptor identifier and does not use the static catalog as the runtime availability authority | Pricing must recognize `claude-fable-5-1` when the runtime emits it |
| 2026-09-22 | Code | `.../codex/thread/codex-thread-token-usage.ts:169-195`; `.../claude/session/claude-session-token-usage.ts:248-291` | Trace usage identity | Codex reports `OPENAI` plus `input.model`; Claude reports `ANTHROPIC` plus the terminal/payload/usage model, so both exact IDs reach token accounting | Existing adapters need no identity rewrite |
| 2026-09-22 | Code | `autobyteus-server-ts/src/token-usage/pricing/token-price-config-provider.ts`; `autobyteus-ts/src/llm/llm-model-pricing.ts`; `.../llm-factory.ts` | Trace price resolution | Pricing delegates to `LLMFactory.getModelPricingInfo`; lookup is exact across identifier/value/name/canonical name and provider; no match returns `model_not_found` and ultimately `price_missing` | Add trustworthy exact catalog recognition; do not use fuzzy aliases |
| 2026-09-22 | Code | `autobyteus-ts/src/llm/supported-model-definitions.ts:196-336` and exact-ID `rg` probe | Verify present/absent catalog rows | `gpt-5.6-sol`, `gpt-5.6-terra`, `gpt-5.6-luna`, and `claude-fable-5` are present; `gpt-6-astra` and `claude-fable-5-1` are absent | Confirms the reported root cause for both models |
| 2026-09-22 | Code / Doc | `autobyteus-server-ts/docs/modules/token_usage.md`; `autobyteus-web/components/workspace/usage/tokenUsageFormatting.ts`; token usage projections | Trace observable result and persistence | Unknown pricing is intentionally rendered as “Price missing”/“price missing”; captured estimates are observation-time facts and are not retroactively repriced | Preserve historical rows; new support applies prospectively |
| 2026-09-22 | Contract / Web | `https://developers.openai.com/api/docs/models/gpt-6-astra` | Verify Astra ID, limits, capabilities, and price | Exact ID `gpt-6-astra`; 1,050,000 context; 128,000 max output; Standard prices per MTok: input 10, cached input 1, cache write 12.5, output 50; above 272K input, full request uses 2x input/cache and 1.5x output | Encode exact standard and long-context pricing with source date 2026-09-22 |
| 2026-09-22 | Contract / Web | `https://platform.claude.com/docs/en/models/fable-5-1/overview`; `https://platform.claude.com/docs/en/about-claude/pricing` | Verify Fable 5.1 ID, limits, request facts, and price | Exact ID `claude-fable-5-1`; 1M context; 128K output; input 10, output 50, 5m cache write 12.5, 1h cache write 20, cache read 0.25 per MTok; adaptive thinking always on | Add an exact row and retain correct cache dimensions |
| 2026-09-22 | Code | `autobyteus-ts/src/llm/api/anthropic-llm.ts:56-169` | Check direct-provider request compatibility | Existing family matching treats `claude-fable-5-1` as part of `claude-fable-5-*`; it already strips fixed-budget/disabled-thinking-invalid shapes and sampling params for current Fable models | Architecture should preserve this behavior and add targeted non-live regression coverage only if the shared catalog exposes direct selection |
| 2026-09-22 | Code / History | Prior GPT-5.6 and Anthropic catalog changes (`b95c795b3`, `0ff6c7849`, `777079e62`) and their ticket artifacts | Identify established change pattern | Existing changes update centralized definitions, metadata/pricing tests, server price-policy tests, model-list coverage, and durable docs; paid Fable model calls were explicitly excluded before | Reuse the established non-live validation pattern |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger Or Governing Contract | Current Supported Product Behavior Path / Lifecycle | Current Outcome / Invariants | Evidence | Confidence / Unknown |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User/System | User selects a visible Codex App Server model and the runtime emits token usage | Codex `model/list` supplies exact selection ID → run sends ID to App Server → usage adapter emits `OPENAI` + exact model → server pricing performs exact built-in lookup → token meter/statistics show the captured estimate or missing status | `gpt-6-astra` is selectable and emitted exactly, but absent from the static pricing catalog, so its policy resolves missing | User report; non-billable live `model/list` probe; listed code paths | High |
| BEH-002 | User/System | User selects an SDK-advertised Claude model and Claude emits per-turn usage | Claude SDK catalog preserves descriptor ID → SDK run returns exact model → usage adapter emits `ANTHROPIC` + exact model → shared pricing lookup → existing UI | `claude-fable-5-1` has an official exact ID and price, but that ID is absent from the built-in catalog, so matching usage cannot receive trusted price metadata | First-party Claude docs; exact code path; static-catalog absence | High on catalog gap; actual account/runtime visibility remains runtime-owned |
| BEH-003 | Contract | A token-usage observation has an exact provider/model identity | `TokenPriceConfigProvider` resolves the latest built-in price policy and persists the contribution/summary at observation time | Exact recognized rows produce trusted prices; missing rows fail closed as unpriced; existing stored estimates are not repriced later | Pricing and token-usage modules/docs | High |
| BEH-004 | Operational | A new expensive model row is delivered | Repository tests exercise catalog/pricing/request shapes with synthetic data; optional provider runs are separately gated | Prior Fable work explicitly prohibited paid Fable matrix calls while retaining deterministic coverage | Prior ticket/design and current user instruction | High |

## Relevant Codebase And Technical Facts

| Path / Component / Contract | Current Responsibility Or Behavior | Requirement Implication | Architecture Question / Design Implication |
| --- | --- | --- | --- |
| `autobyteus-ts/src/llm/supported-model-definitions.ts` | Central built-in identities, static limits, schemas, and `TokenPricingConfig` | Exact trusted rows are missing for both targets | Add model definitions or a comparably centralized exact price source without fuzzy aliases; avoid duplicating runtime capability ownership |
| `autobyteus-ts/src/llm/llm-model-pricing.ts` | Exact model/provider price lookup and missing status | Existing matching is sufficient once exact definitions exist | No algorithm change appears necessary |
| `autobyteus-server-ts/src/token-usage/pricing/token-price-config-provider.ts` | Converts catalog pricing into persisted server price policy | Existing server path is sufficient; variants not represented in the usage identity must not be guessed | Prove standard policy for both exact IDs using synthetic observations |
| Codex model catalog/normalizer | Runtime-owned availability, effort list, and Fast capability | Static support must not replace or filter current runtime discovery | Keep Codex `model/list` authoritative; static direct-API schema may differ from runtime-advertised `ultra` without changing Codex selection behavior |
| Claude model catalog/normalizer | Runtime-owned exact descriptors and optional reasoning metadata | Pricing support should work if/when the installed/authenticated runtime exposes Fable 5.1 | Do not hardcode Claude runtime availability in the frontend |
| Codex and Claude token-usage adapters | Preserve exact model IDs and provider IDs | No identity transformation is needed | Target tests can start at synthetic usage/policy boundaries rather than paid inference |
| `autobyteus-ts/src/llm/api/anthropic-llm.ts` | Direct Anthropic request policy; family-prefix match already covers Fable 5.1 | Shared catalog exposure must not introduce invalid fixed-budget/disabled thinking behavior | Confirm existing family rule with non-network request-payload tests if direct selection is affected |
| Existing frontend token usage components/stores | Render server-owned cost status and unit prices | No new UI is needed; existing “Price missing” becomes trusted estimates for new observations | Frontend source changes are not expected unless evidence disproves current projection behavior |
| `autobyteus-server-ts/docs/modules/token_usage.md` | Captured estimates are immutable observation-time accounting facts | Do not migrate or retroactively reprice existing rows | Document prospective behavior explicitly |

## Structural And Payload Surface Inventory

### Payload Or Content Surfaces

- Static model-definition rows for `gpt-6-astra` and `claude-fable-5-1`.
- Pricing payloads:
  - Astra Standard base and >272K tier prices, including cache read/write.
  - Fable 5.1 base, cache read, 5-minute cache write, and 1-hour cache write prices.
- Static metadata provenance, context/input/output limits, and durable provider-catalog documentation.
- Test fixtures/expectations for exact identities and price dimensions.
- Existing readers: `LLMFactory`, server token pricing, AutoByteus built-in model listing, and direct provider construction.

### Structural Surfaces

- Existing runtime discovery normalizers and usage adapters already preserve exact identities.
- Existing shared exact-match pricing/factory boundary already accepts catalog rows.
- Existing server price-policy and frontend cost-summary contracts already represent trusted/missing pricing.
- Existing structural surfaces are sufficient; no new API, GraphQL field, persistence schema, store, or UI component is evidenced.

### Potential Structural Impacts To Investigate

- API or external-contract change: Absent; existing internal response shapes remain unchanged.
- Persistence schema or invariant change: Absent; new observations use existing pricing snapshots, and historical data remains immutable.
- Security or privacy boundary change: Absent.
- Concurrency or lifecycle change: Absent.
- Deployment, migration, ownership-boundary, architectural-pattern, or structural-refactoring change: Expected absent. Architecture should decide whether a narrowly named pricing helper is generalized for Astra rather than left GPT-5.6-specific.
- Confirmed absent, present, or unknown: Structural impacts are confirmed absent from requirements evidence; helper naming and exact test/doc file list remain architecture decisions.

## Runtime, Probe, Or Reproduction Findings

| Method / Command | Scenario | Observation | Requirement Implication | Artifact / Evidence Path |
| --- | --- | --- | --- | --- |
| Non-billable JSON-RPC metadata probe against `codex app-server` 0.155.1 | List visible models without starting a turn | Returned exact model `gpt-6-astra`, display name `GPT-6-Astra`, default reasoning `medium`, efforts through `ultra`, and `priority`/Fast service tier | Exact ID is proven; Codex runtime remains capability authority; no paid inference is needed | Recorded in this investigation source log |
| `rg` exact-ID checks against `supported-model-definitions.ts` | Determine current static pricing recognition | Both target IDs absent; Sol/Terra/Luna and Fable 5 present | Root cause is missing exact catalog data rather than a broken dynamic selector | `autobyteus-ts/src/llm/supported-model-definitions.ts` |
| Static call-path review from usage adapter to price resolver | Determine why UI shows no price | Unknown exact ID returns `model_not_found`; accounting surfaces `price_missing`; UI renders “Price missing” | Adding trusted exact pricing should flow through the existing framework without frontend changes | Listed code/doc paths above |
| Paid inference | Real Astra/Fable 5.1 generation | Not run by explicit user constraint | Verification must use static, unit, mocked request-payload, and synthetic token-usage tests | N/A |

## Stakeholder And User Evidence

| Source / Actor | Need, Problem, Or Constraint | Evidence Strength | Requirement Implication | Open Question |
| --- | --- | --- | --- | --- |
| User | Astra selected through Codex App Server should show pricing | Direct observed problem | `gpt-6-astra` must resolve to trusted standard pricing in token accounting | None after identifier/price verification |
| User | Investigate and support Claude Fable 5.1 | Direct request plus first-party confirmation | Exact `claude-fable-5-1` must receive current metadata and cache-aware pricing | Actual runtime visibility remains controlled by the installed/authenticated Claude runtime |
| User | Avoid real tests because these models are expensive | Explicit constraint | No paid inference; deterministic non-live coverage is required | None |
| Existing product contract | Unknown prices fail closed rather than guess | Strong code/doc evidence | New rates must be official and exact; variants remain out of scope unless identity is available | None |

## External Contracts, Standards, And Dependencies

| Contract / Dependency | Version / Authority | Relevant Behavior Or Constraint | Evidence | Unknown / Risk |
| --- | --- | --- | --- | --- |
| OpenAI GPT-6 Astra model contract | Official OpenAI documentation, verified 2026-09-22 | Exact ID; 1.05M context/128K output; Standard $10 input, $1 cache read, $12.50 cache write, $50 output; >272K full-request multipliers 2x input/cache and 1.5x output | `https://developers.openai.com/api/docs/models/gpt-6-astra` | Fast is 2x and Batch/Flex 0.5x, but current usage identity does not safely select those variants |
| Claude Fable 5.1 model contract | Official Claude Platform documentation, verified 2026-09-22 | Exact ID; 1M context/128K output; Standard $10 input, $50 output, $0.25 cache read, $12.50 5m write, $20 1h write; adaptive thinking always on | `https://platform.claude.com/docs/en/models/fable-5-1/overview`; `https://platform.claude.com/docs/en/about-claude/pricing` | Batch and inference-geo/partner pricing differ and are not inferred |
| Codex App Server `model/list` | Installed `codex-cli 0.155.1` | Dynamic exact ID and capabilities are runtime-owned | Non-billable metadata probe | Catalog content may change with CLI/account; exact target row was present during probe |
| Claude Agent SDK `supportedModels` | Installed runtime plus authenticated account | Dynamic exact model availability is runtime-owned | `claude-sdk-client.ts` and normalizer | No live/authenticated discovery probe was required for the price-catalog defect |

## Persisted Data And State Facts

- Affected stored or external subject: Existing token-usage run records and analytical facets contain captured observation-time pricing/cost status.
- Location and representative shape: Server token-usage persistence under `autobyteus-server-ts/src/token-usage` and Prisma models documented in `autobyteus-server-ts/docs/modules/token_usage.md`.
- Approximate volume: Not required; no rewrite is proposed.
- Current readers and writers: Token-usage accumulator writes; GraphQL/event projections and frontend stores read.
- Current unknown/extra-field behavior: Not applicable; catalog rows do not change stored schema.
- Required semantics or data that must be preserved: Existing rows, costs, missing-price status, policy keys, and analytics remain unchanged.
- Acceptable loss, reset, rebuild, or regeneration: None authorized or needed.
- Privacy, retention, compliance, downtime, or operational constraints: No new data is stored; no downtime or migration should be required.
- Remaining evidence gap: None material for requirements. Architecture must explicitly preserve prospective-only pricing.

## Product Design Request Context

- Product Design request in the current input: `Not stated`
- User's requested outcome, in the user's own terms: N/A.
- Requirement / behavior IDs involved: N/A.
- Product decision, uncertainty, or experience to understand or evolve: Existing price presentation is retained; no new experience requested.
- Critical journey and states: N/A beyond the existing Token Meter/Statistics price state.
- Known constraints and non-goals: No UI redesign.
- Relevant existing-product or frontend context supplied or established: Existing UI already renders trusted, partial, local/no-bill, and missing statuses from server summaries.
- Product Design request artifact / message reference: N/A.
- Established separate prototype repository/root and ticket reference, when applicable: N/A.

## Product Design Findings

N/A — not applicable.

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/astra-fable-pricing-support/tickets/in-progress/astra-fable-pricing-support/requirements-doc.md` | Solution Designer | Canonical intended behavior and acceptance criteria | This package | All | Ready for Approval | Requires explicit user approval |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/astra-fable-pricing-support/tickets/in-progress/astra-fable-pricing-support/solution-revision-record.md` | Solution Designer | Cumulative solution-round index | This package | All | Current at SR-001 | Approval record pending |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| RISK-001 | Risk | Codex Fast, OpenAI Batch/Flex, Claude Batch, inference-geo, partner, private-contract, subscription-credit, or negotiated pricing differs from Standard | Applying a variant without a captured variant identity would create false precision | Explicitly out of scope; preserve Standard-only catalog behavior | Controlled pending user approval |
| RISK-002 | Risk | Adding a built-in row may also make the model available through the AutoByteus direct provider catalog | Shared catalog ownership has both pricing and direct-model effects | Architecture must confirm the existing adapter/schema is provider-valid and cover it without paid calls | Open for architecture, not a requirements blocker |
| RISK-003 | Risk | Official provider pricing can change after this source date | Static prices may later become stale | Record exact source/effective/verified dates and keep normal catalog maintenance responsibility | Accepted operational risk |
| RISK-004 | Risk | Existing Claude Sonnet 5 catalog/docs use $3/$15, while current official pricing says $2/$10 is permanent | Adjacent stale data exists but is not part of the Astra/Fable request | Record as separate-ticket candidate; do not silently expand this scope | Open separate concern |
| UNK-001 | Unknown | Exact implementation file set and whether the GPT-5.6 pricing helper should be renamed/generalized | Affects design cleanliness, not intended behavior | Resolve during architecture design after approval | Open |

## Architecture Investigation Findings

Architecture design has not started because explicit approval of SR-001 is pending. Requirements-phase feasibility evidence shows the existing production path can support the requested behavior without new API or persistence structures.

## Requirement Implications

- The defect is an exact catalog-recognition gap for two model IDs, not a dynamic runtime-selection or frontend-rendering defect.
- Official Standard pricing, including all currently supported cache dimensions and Astra's long-context tier, must be encoded rather than input/output-only approximations.
- Runtime-owned model availability and capability schemas remain authoritative; no frontend hardcoding or fuzzy aliasing is authorized.
- Existing price-missing behavior remains the correct fallback for unknown models.
- New pricing applies to new observations only; previously captured summaries must not be rewritten.
- Validation must be deterministic and non-billable. A metadata-only Codex list probe is evidence, not a paid model test.
- Variant pricing and the adjacent Sonnet 5 stale-price issue remain outside this package unless the user changes scope.

## Notes For Architecture Design

After approval, map `SCN-001` and `SCN-002` through the exact runtime model IDs, usage adapters, `TokenPriceConfigProvider`, `LLMFactory`, and existing UI projections. Prefer the established centralized model-definition/pricing path. Verify that any shared catalog exposure is valid for direct OpenAI/Anthropic construction; retain dynamic runtime schema ownership and existing Fable-family request safeguards. No new UI, API, database migration, or paid live-model path is currently justified.
