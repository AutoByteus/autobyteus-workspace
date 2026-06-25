# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Refined

## Goal / Problem Statement

Improve AutoByteus token accounting and presentation so users understand tokens and estimated API cost without mentally joining separate UI blocks or relying on stale model prices. The change must rename user-facing "Usage" language to token-oriented language, redesign the token meter cards so related token counts and costs are paired, remove MiniMax M2.7 support, verify and correct built-in non-Mistral model pricing, and make billable thinking/reasoning tokens visible and costed correctly when providers report them.

## Investigation Findings

- The runtime right-side tab is user-labeled `Usage` through `autobyteus-web/localization/messages/*/shell.ts`; the internal tab id is `usage` in `autobyteus-web/composables/useRightSideTabs.ts` and can stay internal-only for this scope.
- `TokenUsageMeterPanel.vue` currently renders six independent cards in two rows: input/output/total token counts, then input/output/total cost estimates. This is the UI mismatch described by the user.
- Settings currently exposes `Token Usage Statistics` in `autobyteus-web/localization/messages/*/settings.ts` and generated localization files.
- MiniMax M2.7 is still supported from the authoritative model registry in `autobyteus-ts/src/llm/supported-model-definitions.ts`; `MiniMax-M2.7` metadata also exists in `autobyteus-ts/src/llm/metadata/curated-model-metadata.ts`.
- Built-in model pricing is owned in `autobyteus-ts` through `TokenPricingConfig` and surfaced to the server through `LLMFactory.getModelPricingInfo`. The current pricing shape is flat input/output only, hardcodes USD in the factory, and cannot represent cache-read/cache-write prices, provider currency, or long-context/input-size tiers.
- Server token events already include `reasoning_output_tokens`, `billable_input_tokens`, `billable_output_tokens`, and `estimated_api_reasoning_output_cost`, but `TokenCostCalculator` always leaves reasoning cost null and prices `accounting_output_tokens` rather than billable output tokens.
- Gemini Vertex probes confirmed `usageMetadata.candidatesTokenCount` excludes `thoughtsTokenCount` while `totalTokenCount` includes prompt + candidates + thoughts; Google prices output including thinking tokens, so current accounting can undercount billable output unless normalized or priced via `billable_output_tokens`.
- Anthropic Claude probes confirmed `output_tokens_details.thinking_tokens` appears in both non-stream usage and final stream `message_delta.usage`; current Anthropic normalization does not extract that reasoning count.
- Kimi/Moonshot's OpenAI-compatible usage can expose top-level `cached_tokens`; current OpenAI-compatible normalization only reads nested cached-token fields.
- DeepSeek HTTP probes confirmed root `thinking` controls thinking mode, while manual `extra_body.thinking` did not; current DeepSeek TS adapter maps configured `thinking_type` into `extra_body`, so request shaping needs correction.
- Run summaries and GraphQL types expose input/output/total tokens and input/output/total estimated costs only; they do not expose reasoning token/cost breakdowns to the frontend.
- Codex app-server runtime schema generation and upstream source inspection confirmed `thread/tokenUsage/updated` includes `cachedInputTokens` and `reasoningOutputTokens`, but current AutoByteus Codex token usage normalization maps only input/output/total first-class fields.
- A real Claude Agent SDK runtime probe (`@anthropic-ai/claude-agent-sdk` 0.2.71) emitted thinking and text assistant chunks plus terminal `result.usage`; the terminal result exposed input/output/cache totals and `modelUsage` but no separate numeric thinking-token count in that runtime path.
- Public pricing research as of 2026-06-25 found these notable corrections: DeepSeek V4-Pro is stale (`$0.435/$0.87` official, not current `1.74/3.48`); Anthropic Opus 4.8 is missing (`$5/$25`); Grok prices are missing (`grok-4.3` `$1.25/$2.50`, `grok-build-0.1` `$1/$2`); MiniMax M3 prices are missing and tiered; Kimi K2.6/K2.7 Code prices are missing; GLM-5.2 current official BigModel price is CNY-denominated; Qwen prices are regional/tiered and should not be blindly represented by a single universal flat price. Mistral was intentionally not checked per user instruction.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Larger Requirement / Behavior Change / Cleanup
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant + Shared Structure Looseness + Legacy Or Compatibility Pressure
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Needed
- Evidence basis: The DTO/event model already has richer usage dimensions, but pricing/summaries/UI flatten or omit them; the model registry still exposes a legacy MiniMax model; the pricing config cannot express current provider pricing dimensions needed for correctness.
- Requirement or scope impact: This must be handled as a coordinated shared-model/server/frontend change, not as copy-only UI work. Frontend remains presentation-only; authoritative token/cost semantics stay in shared model definitions and server token accounting.

## Recommendations

1. Keep the internal right-tab id `usage` unless implementation has a strong reason to rename every internal callsite; the user-facing label should become `Token`.
2. Replace the six independent token meter cards with three paired cards: Input, Output, and Total. Each card should show the token count and related cost estimate together.
3. Add a small reasoning/thinking subline under Output only when reasoning tokens are non-zero, e.g. "includes N thinking tokens"; do not add a permanent empty thinking card.
4. Remove MiniMax M2.7 from the supported model registry and curated metadata without aliases or compatibility wrappers.
5. Extend pricing metadata rather than pretending all supported models can be represented as flat USD input/output rates. Support currency, cached input read/write prices, and input-size tiers where providers require them.
6. Treat thinking/reasoning tokens as output-priced unless a provider publishes a distinct rate. Preserve `estimated_api_reasoning_output_cost` as a sub-breakdown of output cost, not as a separately added cost that would double count.
7. Do not mark a model price as trusted if the exact provider/region/tier/dimension is not verified. A visible `price_missing` or `partial_price_missing` state is preferable to a wrong estimate.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium

## In-Scope Use Cases

- Runtime user reads the Token Meter for an active or completed run and can see input tokens with input cost, output tokens with output cost, and total tokens with total estimated cost.
- Runtime user can see when output includes provider-reported thinking/reasoning tokens and understands those tokens are included in output cost.
- Settings/API-key user views MiniMax supported models and no longer sees `minimax-m2.7`.
- Backend/shared runtime consumers resolve verified built-in non-Mistral model prices accurately enough for server-side estimates, including cache/tier/currency where represented.
- Token statistics and run summaries include billable reasoning output where providers report it.
- Runtime-native token event paths for Codex app-server and Claude Agent SDK preserve cache/reasoning fields when those runtimes expose them.
- Historical token ledger rows remain readable; existing old events for removed models are not rewritten or migrated.

## Out of Scope

- Mistral pricing verification or Mistral pricing changes, per user instruction.
- Provider invoice reconciliation, account-level billing export, or currency conversion service.
- Unapproved paid provider API probing in environments without explicit keys/budget. Probe scripts must be opt-in and safe by default.
- Adding new providers or unrelated new models beyond correcting current supported model registry/pricing.
- A broad redesign of unrelated settings pages, right-panel navigation architecture, or non-token statistics screens.
- Backfilling historical ledger events to recompute past costs.

## Functional Requirements

- `REQ-001` Runtime right-panel navigation must rename the user-visible `Usage` tab to `Token` in all supported localizations touched by this feature.
- `REQ-002` Settings navigation and token statistics headings should prefer token-oriented wording (`Token Statistics`) over `Token Usage Statistics`, unless a phrase explicitly refers to usage-based pricing.
- `REQ-003` Token Meter primary metrics must render as three conceptual cards: Input, Output, and Total. Each card must pair the relevant token count with the related cost/estimate.
- `REQ-004` The Output card must show provider-reported thinking/reasoning token detail when non-zero, without double-counting cost.
- `REQ-005` Frontend token meter must remain a presentation layer. It may aggregate streaming deltas for display, but it must not implement provider pricing rules independently from server/shared catalog fields.
- `REQ-006` MiniMax M2.7 support must be removed from the authoritative supported model registry and curated metadata. The model must no longer appear in API key/model management.
- `REQ-007` Built-in model prices in `autobyteus-ts` must be updated for supported non-Mistral models where official pricing is verified as of 2026-06-25.
- `REQ-008` Pricing metadata must represent the dimensions needed by current supported providers: currency, input price, output price, cached input read price, cached input write price, and input-size/long-context tiers where the provider price changes by request input size.
- `REQ-009` A model/dimension must remain missing/partial rather than trusted when official pricing is ambiguous, region-specific without a chosen region, tiered without tier rules, or only partially verified.
- `REQ-010` Server cost calculation must use billable output tokens when present, otherwise accounting output tokens. Reasoning output cost must be reported as an output-cost sub-breakdown.
- `REQ-011` Provider token normalizers must preserve provider-reported reasoning/thinking and cache-read token fields that affect cost, including Gemini `thoughtsTokenCount` and Kimi top-level `cached_tokens`.
- `REQ-012` Run summaries, GraphQL fields, frontend types, and store aggregation must expose/sum reasoning output tokens and estimated reasoning output cost where available.
- `REQ-013` Cost summaries must not silently sum amounts across different currencies under one currency label. Mixed-currency summaries must be represented safely (for example by null aggregate cost with `mixed` status or an equivalent explicit mixed-currency state).
- `REQ-014` Existing ledgers/events must remain readable after schema/type changes, but no compatibility alias should preserve MiniMax M2.7 as a selectable supported model.
- `REQ-015` The change must include implementation-scoped unit/component tests for model registry/pricing lookup, provider token normalization, server cost calculation/summary fields, and frontend copy/layout aggregation.
- `REQ-016` The implementation must include a provider usage-observation probe plan or harness that can inspect real provider responses for supported providers when credentials are available, specifically checking whether raw responses include reasoning/thinking token counts, whether output token counts already include reasoning tokens, and whether cache-hit/cache-write token fields are exposed.
- `REQ-017` Probe execution must be safe and explicit: no real billable provider calls should run by default in ordinary tests; real probes should require provider API keys and an opt-in flag, and skipped probes must be recorded with reason.
- `REQ-018` Provider normalizer tests must include documented raw-response fixtures or captured sanitized probe fixtures for reasoning/cache fields where real probes or official docs show those fields.
- `REQ-019` Runtime-native token usage normalizers must cover Codex app-server and Claude Agent SDK event streams, not only generic LLM provider adapter responses. Codex must map `cachedInputTokens` and `reasoningOutputTokens` when present. Claude Agent SDK must account from terminal `result.usage`/`modelUsage` rather than summing assistant chunks, and must map numeric thinking details only when the SDK exposes them.
- `REQ-020` Runtime-token probe evidence must remain durable alongside provider probe evidence, including exact sources/commands and sanitized output for any real runtime call.

## Acceptance Criteria

- `AC-001` In the runtime workspace, the right-side tab label reads `Token`; no user-visible tab remains labeled only `Usage` for the token meter.
- `AC-002` Settings navigation/headings for the token statistics screen use token-focused wording and tests/localization generated files are updated consistently.
- `AC-003` The Token Meter displays one Input card containing input token count and input cost, one Output card containing output token count and output cost, and one Total card containing total token count and total estimate.
- `AC-004` Given a summary/event with `reasoningOutputTokens > 0`, the Output card displays a thinking/reasoning token subline and the output/total cost already includes those tokens exactly once.
- `AC-005` Given no reasoning tokens, the Output card does not show a noisy empty thinking-token line.
- `AC-006` `minimax-m2.7` / `MiniMax-M2.7` is absent from the MiniMax provider model list and from curated model metadata.
- `AC-007` Registry tests fail if MiniMax M2.7 is reintroduced without a deliberate new requirement.
- `AC-008` DeepSeek V4-Pro resolves to official `$0.435` input and `$0.87` output per 1M tokens; DeepSeek V4-Flash remains `$0.14/$0.28` plus cache-read metadata if implemented.
- `AC-009` Anthropic Opus 4.8 resolves to `$5/$25`; Opus 4.7 and Sonnet 4.6 remain correct; Anthropic cache dimensions are represented where supported by the pricing config.
- `AC-010` Grok `grok-4.3` and `grok-build-0.1` resolve to official input/output prices and cache-read price if the cache dimension is trusted.
- `AC-011` Gemini pricing preserves base/tier correctness and treats `thoughtsTokenCount` as output-priced thinking tokens.
- `AC-012` Kimi K2.6 and K2.7 Code have verified prices; Kimi cache-hit tokens from top-level `cached_tokens` are normalized as cache-read input tokens.
- `AC-013` Qwen and GLM catalog entries are not marked trusted with stale or ambiguous flat prices; either explicit region/currency/tier rules are encoded or the price remains missing/partial.
- `AC-014` MiniMax M3 pricing handles the <=512k and >512k input-token tiers, or else explicitly refuses to mark the long-context price as fully trusted.
- `AC-015` Server cost-calculator tests cover standard input, cache read/write input, reasoning output sub-cost, billable output fallback, missing dimensions, and mixed-currency summary handling.
- `AC-016` Frontend store/GraphQL tests cover fetched summaries and streaming deltas with reasoning output fields.
- `AC-017` The implementation handoff records the exact commands run and any pricing entries intentionally left untrusted because public pricing was ambiguous.
- `AC-018` A provider usage probe matrix exists in the implementation handoff or a durable artifact, with rows for OpenAI-compatible, DeepSeek, Kimi, Anthropic, Gemini, and MiniMax/Qwen/GLM where applicable, and columns for: probe attempted, credentials available, raw usage fields observed, reasoning field observed, whether output includes reasoning, cache fields observed, and resulting normalizer decision.
- `AC-019` Real provider probes are skipped rather than silently mocked when credentials are unavailable; the skip reason is explicit. Synthetic/unit fixtures remain required to test normalizers.
- `AC-020` At least one low-cost real probe path or documented fixture must validate that cached-token fields are captured for a provider that exposes them, and at least one reasoning-token fixture/probe must validate that reasoning tokens are included in billable output handling.
- `AC-021` A Codex app-server token usage fixture/schema shape containing `cachedInputTokens` and `reasoningOutputTokens` maps those values to first-class cache/reasoning fields in the canonical token usage event instead of preserving them only in `raw_usage_json`.
- `AC-022` A Claude Agent SDK runtime fixture/probe with duplicate assistant thinking/text chunks and terminal `result.usage` emits one canonical usage event from the terminal result. If no numeric thinking-token count is present, `reasoningOutputTokens` remains null while output tokens/cost remain populated; if a future numeric thinking detail appears, it maps to the reasoning sub-breakdown.
- `AC-023` Runtime-token evidence for Codex and Claude Agent SDK exists as a durable artifact and is referenced from the implementation handoff.

## Constraints / Dependencies

- Pricing findings must be based on current public provider documentation as of 2026-06-25; pricing is volatile and downstream implementation should keep source notes/comments lightweight but traceable.
- Mistral is excluded from pricing verification and should not be changed unless needed for type compatibility.
- GraphQL schema/type changes may require frontend code generation (`pnpm -C autobyteus-web codegen`) depending on project conventions and schema availability.
- Real provider probes may incur cost and require API keys; they must be opt-in and should use minimal prompts/max-output budgets.
- If repository-resident tests or generated localization/codegen artifacts are updated after initial code review, the normal team review loop must re-review those durable changes.

## Assumptions

- "M2.7" in the user request refers to `minimax-m2.7` / `MiniMax-M2.7` shown in the screenshot.
- User-facing wording should favor "Token" and "Token Statistics"; internal route/tab names can stay stable if hidden from users.
- Provider-reported reasoning/thinking tokens are billable as output tokens unless a provider publishes a distinct rate. Public docs checked for Anthropic, DeepSeek, Gemini, xAI, Kimi, Qwen, GLM, and MiniMax all point to output-token billing or output-inclusive thinking billing rather than a separate reasoning rate.
- Current ledger persistence can store nullable added columns/fields or JSON-derived fields without requiring historical backfill.

## Risks / Open Questions

- Kimi K2.7 Code HighSpeed is described as the same model/high-speed variant, but exact public pricing dimensions were less directly exposed than K2.7 Code in fetched documentation. It should remain untrusted unless implementation verifies exact dimensions.
- Qwen pricing is region- and tier-dependent. A default deployment region must be explicit before marking Qwen prices trusted.
- GLM direct BigModel pricing is CNY-denominated; using USD relay prices may be wrong for direct BigModel billing. Currency-safe aggregation is required if CNY remains in the catalog.
- Tier selection usually depends on per-request input tokens. Cumulative snapshot events may not always retain enough per-call request input information; cost calculation should use reported/accounting input tokens for the event and mark uncertainty with quality flags where needed.
- Public provider pricing can change after this design. The implementation should avoid over-promising exactness beyond the recorded effective date.
- Some providers or runtimes may report reasoning/thinking text but not a separate reasoning token count, or may report a reasoning token count only in a final streaming/terminal event. The provider and runtime probe matrices must record this instead of assuming all paths behave like OpenAI.

## Requirement-To-Use-Case Coverage

- Runtime meter readability: `REQ-001`, `REQ-003`, `REQ-004`, `REQ-005`, `REQ-012`.
- Token statistics wording/readability: `REQ-002`, `REQ-012`.
- MiniMax M2.7 removal: `REQ-006`, `REQ-014`.
- Price correctness: `REQ-007`, `REQ-008`, `REQ-009`, `REQ-010`, `REQ-011`, `REQ-013`.
- Provider response evidence/probing: `REQ-016`, `REQ-017`, `REQ-018`, `REQ-020`.
- Runtime-native token-event coverage: `REQ-019`, `REQ-020`.
- Maintainability and reviewability: `REQ-005`, `REQ-014`, `REQ-015`.

## Acceptance-Criteria-To-Scenario Intent

- UI copy/layout scenarios: `AC-001` through `AC-005`.
- Model registry and pricing scenarios: `AC-006` through `AC-014`.
- Accounting/API/frontend data scenarios: `AC-004`, `AC-011`, `AC-012`, `AC-015`, `AC-016`.
- Delivery evidence scenario: `AC-017`.
- Provider probe evidence scenarios: `AC-018`, `AC-019`, `AC-020`.
- Runtime event evidence scenarios: `AC-021`, `AC-022`, `AC-023`.

## Approval Status

Refined after user follow-up on 2026-06-25. The user explicitly requested enough provider response experimentation/searching to determine whether reasoning/cache usage fields are available and whether reasoning tokens are included in output counts. A later follow-up requested Codex runtime and Claude Agent SDK runtime token-event investigation; requirements now include runtime-native token-event coverage. Updated package resent for architecture review.
