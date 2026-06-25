# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-pricing-ui/tickets/done/token-usage-pricing-ui/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-pricing-ui/tickets/done/token-usage-pricing-ui/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-pricing-ui/tickets/done/token-usage-pricing-ui/design-spec.md`
- Current Review Round: 3
- Trigger: Runtime-token-event refinement after user asked whether Codex runtime and Claude Agent SDK runtime token events were investigated.
- Prior Review Round Reviewed: Round 2, pass.
- Latest Authoritative Round: 3
- Current-State Evidence Basis: Updated requirements, investigation notes, design spec, provider probe matrix, runtime token event probe matrix, Claude Agent SDK sanitized runtime probe output/script, and spot checks of current Codex/Claude token event resolver boundaries in `autobyteus-server-ts`.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Refined package with provider probe evidence | N/A | No blocking findings | Pass | No | OpenAI was recorded as blocked by invalid key at that time; residual risk noted. |
| 2 | OpenAI successful probe correction after `.env.test` env precedence fix | No prior findings; prior OpenAI-blocked residual risk rechecked | No blocking findings | Pass | No | OpenAI Responses non-stream, stream, and model-list evidence existed; OpenAI-blocked risk became obsolete. |
| 3 | Runtime-native Codex and Claude Agent SDK token-event refinement | Rounds 1-2 had no unresolved findings; rechecked that prior provider/OpenAI decisions still hold under runtime-event scope | No blocking findings | Pass | Yes | DS-007 adds runtime-native event spine and evidence; existing downstream implementation/review artifacts may be stale relative to this accepted design. |

## Reviewed Design Spec

Reviewed updated `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-pricing-ui/tickets/done/token-usage-pricing-ui/design-spec.md`, with supporting artifacts:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-pricing-ui/tickets/done/token-usage-pricing-ui/requirements.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-pricing-ui/tickets/done/token-usage-pricing-ui/investigation-notes.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-pricing-ui/tickets/done/token-usage-pricing-ui/design-refinement-provider-usage-probes.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-pricing-ui/tickets/done/token-usage-pricing-ui/provider-usage-probe-matrix.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-pricing-ui/tickets/done/token-usage-pricing-ui/provider-usage-probe.mjs`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-pricing-ui/tickets/done/token-usage-pricing-ui/runtime-token-event-probe-matrix.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-pricing-ui/tickets/done/token-usage-pricing-ui/probe-results/2026-06-25-claude-agent-sdk-runtime.json`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-pricing-ui/tickets/done/token-usage-pricing-ui/claude-agent-sdk-runtime-probe.mjs`

Runtime re-review focus:

- Codex app-server `thread/tokenUsage/updated` schema/source evidence exposes `cachedInputTokens` and `reasoningOutputTokens` in `last`/`total` token usage breakdowns.
- Claude Agent SDK runtime probe shows duplicate assistant thinking/text chunks plus terminal `result.usage`/`modelUsage`; terminal result is the correct accounting event and no separate numeric thinking-token field was observed.
- The design now adds `REQ-019`, `REQ-020`, `AC-021`-`AC-023`, and DS-007 to route runtime-native fields into the same canonical token usage accounting pipeline.

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Design classifies the task as a larger requirement / behavior change / cleanup spanning UI, model registry, pricing, provider normalization, runtime-native event normalization, server accounting, GraphQL, and frontend display. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | Missing Invariant + Shared Structure Looseness + Legacy Or Compatibility Pressure are backed by current code/artifact evidence: rich usage fields exist but are not fully propagated/costed, pricing config is too flat, MiniMax M2.7 is stale, and runtime-native events bypass generic provider normalizers. | None. |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Refactor needed now remains explicit; DS-007 adds runtime backend resolver changes without creating a parallel token-statistics path. | None. |
| Refactor decision is supported by concrete design sections or residual-risk rationale | Pass | Pricing type/factory changes, provider normalizer changes, Codex/Claude resolver changes, snapshot delta/cost calculator/projection/GraphQL/frontend updates, migration order, and tests are mapped to concrete files and owners. | None. |

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | N/A | N/A | No findings to resolve | Round 1 findings were `None`. | Prior OpenAI-blocked residual risk was later addressed in Round 2. |
| 2 | N/A | N/A | No findings to resolve | Round 2 findings were `None`. | Runtime-native event investigation is a new refinement, not an unresolved prior finding. |
| 2 | Residual risk: OpenAI key/probe availability | Residual, non-blocking | Obsolete | Updated OpenAI artifacts from Round 2 showed successful Responses/model-list probes after env precedence fix. | No action. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Provider usage to Token Meter display | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Model/pricing catalog to server cost calculation | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | UI tab/copy/layout | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 | Live event to frontend store summary | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-005 | MiniMax removal through model listing | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-006 | Opt-in provider usage probes to evidence/fixtures | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-007 | Runtime-native Codex/Claude token events to canonical token usage event | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Shared LLM catalog / provider normalization (`autobyteus-ts`) | Pass | Pass | Pass | Pass | Correct home for supported model facts, pricing facts/rules, provider raw-response normalization, and opt-in provider probe tooling. |
| Runtime backends (`autobyteus-server-ts/src/agent-execution/backends/{codex,claude}`) | Pass | Pass | Pass | Pass | Correct home for Codex app-server usage-shape parsing and Claude Agent SDK terminal-result usage handling; they should produce canonical events, not frontend/provider-normalizer bypasses. |
| Server token usage accounting (`autobyteus-server-ts/src/token-usage`) | Pass | Pass | Pass | Pass | Correct home for snapshot deltas, cost application, billable output, reasoning subcost, currency-safe aggregation, and cost status. |
| GraphQL token usage API | Pass | Pass | Pass | Pass | Correct transport boundary for server-owned summary fields. |
| Web token meter UI (`autobyteus-web`) | Pass | Pass | Pass | Pass | Correctly kept presentation-only. |
| Settings model management | Pass | Pass | Pass | Pass | MiniMax M2.7 disappearance should flow from authoritative registry removal. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Pricing dimensions and tier rules | Pass | Pass | Pass | Pass | Extending `TokenPricingConfig` / `ModelPricingInfo` avoids a parallel server catalog. |
| Model pricing lookup output | Pass | Pass | Pass | Pass | `LLMFactory.getModelPricingInfo` remains the authoritative catalog lookup. |
| Reasoning/billable/cache token fields | Pass | Pass | Pass | Pass | Existing `LlmTokenUsageObservation` and `TokenUsageUpdatedPayload` remain the right shared structures; no separate thinking event is introduced. |
| Runtime-native cache/reasoning fields | Pass | Pass | Pass | Pass | Reuse canonical event fields; Codex/Claude-specific raw parsing stays in runtime backend resolvers. |
| Provider/runtime probe evidence / fixtures | Pass | Pass | Pass | Pass | Evidence tooling is non-production and opt-in; durable matrices make response-shape assumptions reviewable. |
| Paired metric UI shape | Pass | N/A | Pass | Pass | Local component decision remains appropriate until another screen needs it. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `TokenPricingConfig` / `ModelPricingInfo` | Pass | Pass | Pass | Pass | Explicit currency/cache/tier dimensions and trusted/missing/partial status are required. |
| `LlmTokenUsageObservation` | Pass | Pass | Pass | Pass | Provider normalizers own provider response semantics; Gemini uses billable output when candidate tokens exclude thoughts. |
| `TokenUsageUpdatedPayload` | Pass | Pass | Pass | Pass | Existing billable/reasoning/cache fields are reused for provider and runtime-native events. |
| `TokenUsageSnapshotDeltaNormalizer` source/delta fields | Pass | Pass | Pass | N/A | Design requires cost calculation from accounting deltas, not cumulative totals; runtime cumulative snapshots keep `snapshot_series_key`. |
| `TokenUsageRunSummaryPayload` / GraphQL summary | Pass | Pass | Pass | Pass | Add reasoning token/cost fields and currency-safe summary behavior. |
| Frontend `TokenUsageRunSummary` | Pass | Pass | Pass | N/A | Mirror server/GraphQL; no local pricing policy. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `minimax-m2.7` supported model definition | Pass | Pass | Pass | Pass | Clean removal, no compatibility alias. |
| `MiniMax-M2.7` curated metadata | Pass | Pass | Pass | Pass | Clean removal, no ledger migration. |
| Stale flat prices / blind ambiguous prices | Pass | Pass | Pass | Pass | Correct exact trusted values; otherwise missing/partial. |
| Six independent metric cards | Pass | Pass | Pass | Pass | Replaced by three paired cards. |
| Runtime-specific raw-field-only retention for Codex cache/reasoning | Pass | Pass | Pass | Pass | Replaced by first-class canonical cache/reasoning event fields while preserving raw JSON for diagnostics. |
| Claude assistant chunk summing for accounting | Pass | Pass | Pass | Pass | Design explicitly rejects assistant-chunk summing and uses terminal result usage. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/llm/utils/llm-config.ts` | Pass | Pass | Pass | Pass | Pricing config shape only; no cost formulas. |
| `autobyteus-ts/src/llm/supported-model-definitions.ts` | Pass | Pass | Pass | Pass | Built-in registry and default pricing facts. |
| `autobyteus-ts/src/llm/llm-factory.ts` | Pass | Pass | Pass | Pass | Public catalog lookup boundary. |
| Provider normalizer files | Pass | Pass | Pass | Pass | Provider-specific raw field extraction only. |
| Provider probe script / fixtures under shared LLM package/test tooling | Pass | Pass | N/A | Pass | Investigation/test support only; real calls opt-in. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-token-usage.ts` | Pass | Pass | Pass | Pass | Codex app-server token usage resolver should map cache/reasoning/model context and last-vs-total semantics. |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-token-usage.ts` | Pass | Pass | Pass | Pass | Claude SDK usage resolver should emit terminal result usage, map cache, defensively map future numeric thinking details, and preserve raw/modelUsage diagnostics. |
| `autobyteus-server-ts/src/token-usage/pricing/*` | Pass | Pass | Pass | Pass | Server-owned price adaptation and event cost calculation. |
| `autobyteus-server-ts/src/token-usage/providers/*` | Pass | Pass | Pass | Pass | Ledger/statistics projections and currency-safe summary aggregation. |
| `autobyteus-server-ts/src/api/graphql/types/token-usage-stats.ts` | Pass | Pass | N/A | Pass | Transport schema/resolvers only. |
| `autobyteus-web/graphql/queries/token_usage_meter_queries.ts` | Pass | Pass | N/A | Pass | Fetches summary fields; no policy. |
| `autobyteus-web/types/tokenUsageMeter.ts` | Pass | Pass | Pass | Pass | Frontend DTO mirror. |
| `autobyteus-web/stores/tokenUsageMeterStore.ts` | Pass | Pass | Pass | Pass | Live/fetched aggregation, no provider pricing. |
| `autobyteus-web/components/workspace/usage/TokenUsageMeterPanel.vue` | Pass | Pass | N/A | Pass | Presentation-only paired card layout. |
| Localization files | Pass | Pass | N/A | Pass | Copy-only. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Server pricing -> `LLMFactory.getModelPricingInfo` | Pass | Pass | Pass | Pass | Server must not duplicate model price tables. |
| Provider normalizers / probe tooling -> raw provider responses | Pass | Pass | Pass | Pass | Raw provider parsing remains below normalizer boundary. |
| Runtime backend resolvers -> raw Codex/Claude runtime events | Pass | Pass | Pass | Pass | Runtime-specific raw parsing stays in runtime backends and emits canonical events. |
| Server calculator -> normalized event + price config | Pass | Pass | Pass | Pass | Server calculator must not parse provider/runtime raw JSON for billing fields. |
| Ledger/GraphQL/frontend -> summary fields | Pass | Pass | Pass | Pass | GraphQL/frontend must not recompute provider costs. |
| Frontend UI -> GraphQL/live event data | Pass | Pass | Pass | Pass | Presentation-only. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `LLMFactory.getModelPricingInfo` | Pass | Pass | Pass | Pass | Extend lookup contract, no direct server catalog import. |
| Provider normalizer functions | Pass | Pass | Pass | Pass | Server does not parse raw provider fields such as `thoughtsTokenCount` / `cached_tokens`. |
| Runtime backend token resolvers | Pass | Pass | Pass | Pass | Codex/Claude raw runtime events map once into `TokenUsageUpdatedPayload`; frontend and provider normalizers are not bypassed/misused. |
| `TokenUsageSnapshotDeltaNormalizer` | Pass | Pass | Pass | Pass | Cumulative snapshots are converted to deltas before cost/ledger effects. |
| `TokenCostCalculator.applyPrice` | Pass | Pass | Pass | Pass | Cost formula, tier selection, and reasoning subcost stay server-owned. |
| `TokenUsageLedgerStore` summary methods | Pass | Pass | Pass | Pass | GraphQL delegates aggregation to ledger store. |
| GraphQL token usage summary | Pass | Pass | Pass | Pass | Web consumes summary contract only. |
| Probe harnesses | Pass | Pass | Pass | Pass | Non-production evidence/fixture support only. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `LLMFactory.getModelPricingInfo(input)` | Pass | Pass | Pass | Medium | Pass |
| `TokenPriceConfigProvider.resolvePrice(payload)` | Pass | Pass | Pass | Low | Pass |
| `TokenCostCalculator.applyPrice(payload, price)` | Pass | Pass | Pass | Low | Pass |
| `resolveCodexThreadTokenUsage(input)` | Pass | Pass | Pass | Low | Pass |
| `buildClaudeTokenUsageEvent(input)` / terminal emit path | Pass | Pass | Pass | Low | Pass |
| GraphQL token usage summary queries | Pass | Pass | Pass | Low | Pass |
| `tokenUsageMeterStore.applyTokenUsageUpdated(payload)` | Pass | Pass | Pass | Low | Pass |
| Provider/runtime probe commands | Pass | Pass | Pass | Low | Pass |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/llm` | Pass | Pass | Low | Pass | Shared LLM ownership already established. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread` | Pass | Pass | Low | Pass | Existing Codex thread runtime owner. |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session` | Pass | Pass | Low | Pass | Existing Claude session runtime owner. |
| `autobyteus-server-ts/src/token-usage/pricing` | Pass | Pass | Low | Pass | Calculator/provider split is clear. |
| `autobyteus-server-ts/src/token-usage/providers` | Pass | Pass | Low | Pass | Summary projections remain here. |
| `autobyteus-web/components/workspace/usage` | Pass | Pass | Low | Pass | UI-only folder despite historical folder name. |
| `autobyteus-web/localization/messages` | Pass | Pass | Low | Pass | Copy-only. |
| Ticket probe artifacts | Pass | Pass | Low | Pass | Durable evidence belongs in ticket folder; production harness location should be near package test tooling. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Provider token extraction | Pass | Pass | N/A | Pass | Extend existing provider normalizers. |
| Runtime-native token extraction | Pass | Pass | N/A | Pass | Extend existing Codex/Claude runtime backends. |
| Provider/runtime probing | Pass | Pass | Pass | Pass | Probe harness/evidence is justified because docs alone were insufficient and runtime paths differ. |
| Shared token observation/event fields | Pass | Pass | N/A | Pass | Existing canonical fields are reused. |
| Built-in price metadata | Pass | Pass | N/A | Pass | Extend existing catalog/factory. |
| Server price application | Pass | Pass | N/A | Pass | Extend `TokenCostCalculator`. |
| Ledger summaries/statistics | Pass | Pass | N/A | Pass | Extend existing projection owners. |
| Frontend meter state/UI | Pass | Pass | N/A | Pass | Extend existing store/panel. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| MiniMax M2.7 supported model | No | Pass | Pass | Remove selectable definition and metadata; historical ledger rows remain records only. |
| User-visible `Usage` wording | No | Pass | Pass | Visible token copy changes; internal id may stay stable. |
| Flat USD-only pricing | No | Pass | Pass | Replace with explicit dimensions/status rather than compatibility guesses. |
| Frontend cost adjustment for thinking tokens | No | Pass | Pass | Rejected; server summaries remain authoritative. |
| Claude assistant chunk accounting | No | Pass | Pass | Rejected; terminal result usage is canonical for Claude Agent SDK runtime. |

## Migration / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Pricing config/factory/model registry | Pass | Pass | Pass | Pass |
| Provider normalizers/probe fixtures | Pass | Pass | Pass | Pass |
| Runtime-native Codex/Claude event resolvers | Pass | Pass | Pass | Pass |
| Server delta/cost/ledger/GraphQL | Pass | Pass | Pass | Pass |
| Frontend store/UI/localization | Pass | Pass | Pass | Pass |
| MiniMax M2.7 removal | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Paired Token Meter cards | Yes | Pass | Pass | Pass | Good/bad UI shapes are clear. |
| Reasoning output subcost | Yes | Pass | Pass | Pass | Explicitly treats reasoning as output sub-breakdown, not additive double cost. |
| Gemini billable output | Yes | Pass | Pass | Pass | Probe-derived billable-output example is actionable. |
| Codex runtime mapping | Yes | Pass | Pass | Pass | Matrix and migration step identify `cachedInputTokens`/`reasoningOutputTokens`, `last` vs `total`, and `snapshot_series_key`. |
| Claude Agent SDK terminal-result accounting | Yes | Pass | Pass | Pass | Probe output shows duplicate assistant chunks and terminal result; design forbids summing assistant chunks. |
| Tiered/ambiguous pricing | Yes | Pass | Pass | Pass | Clear trusted/partial/missing behavior. |
| MiniMax removal | Yes | Pass | Pass | Pass | Clean removal/no alias example is clear. |

## Missing Use Cases / Open Unknowns

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| Live billable Codex turn not run | Schema generation and upstream source are strong enough for design; a live turn could still validate deployed runtime behavior. | Not required for design pass. If implementation performs a live Codex runtime probe, keep it opt-in/low-cost and record evidence. | Non-blocking residual risk. |
| Claude Agent SDK did not expose numeric thinking-token count | UI cannot show a reasoning subline for this runtime unless the SDK provides numeric tokens. | Leave `reasoning_output_tokens` null when absent; preserve raw event and map future numeric details defensively. | Addressed by requirements/design. |
| Provider pricing volatility after 2026-06-25 | Prices may change after implementation begins. | Keep source/effective notes lightweight and do not mark ambiguous prices trusted. | Non-blocking residual risk. |
| Existing downstream implementation/review artifacts in this ticket folder may be stale | Implementation/code review artifacts may predate DS-007 and runtime requirements. | Implementation engineer must treat this Round 3 report and updated design package as authoritative and update/re-run implementation handoff/checks accordingly. | Explicit handoff note required. |

## Review Decision

- `Pass`: the design is ready for implementation.

## Findings

None.

## Classification

No blocking design findings. The runtime-token-event refinement is a design-impact update that has already been incorporated into the design and is implementation-ready.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- Codex runtime evidence is schema/source based rather than a live billable turn. This is acceptable for design readiness because the generated app-server schema and upstream source define the contract; any live probe should remain opt-in.
- Claude Agent SDK exposes thinking content without numeric thinking-token counts in the observed runtime path. The design correctly treats this as field availability, not a cost gap, because terminal output tokens remain populated.
- Pricing remains time-sensitive; implementation must keep ambiguous dimensions untrusted/partial rather than guessing.
- Prior implementation/code review/API-E2E artifacts in the ticket folder may need refresh because DS-007 changes runtime backend responsibilities.

## Latest Authoritative Result

- Review Decision: Pass
- Notes: Round 3 is the authoritative design review. Requirements/design now cover provider API usage probes and runtime-native Codex/Claude token events, including Codex cache/reasoning first-class mapping and Claude terminal-result-only accounting. Proceed to implementation from the updated package, not from stale downstream artifacts.
