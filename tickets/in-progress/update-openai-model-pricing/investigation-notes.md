# Investigation Notes

## Investigation Status

- Bootstrap Status: `Complete`
- Current Status: `Claude price audit complete; user selected durable standard pricing and the revised combined package is ready for architecture re-review`
- Investigation Goal: Verify both providers' current model/pricing contracts and map them to existing `autobyteus-ts` catalog, metadata, runtime-policy, test, and documentation owners.
- Scope Classification (`Small`/`Medium`/`Large`): `Medium`
- Scope Classification Rationale: The OpenAI change is a centralized data refresh; Claude Opus 5 adds one catalog row, curated metadata, an existing adapter-policy allowlist entry, focused tests, and active docs, without a new subsystem or public interface.
- Scope Summary: Refresh GPT-5.6 Terra/Luna prices effective 2026-07-30, keep Sol unchanged, and add exact Claude Opus 5 support with standard pricing, metadata, adaptive request policy, tests, and docs.
- Primary Questions Resolved:
  1. What exact prices, dates, IDs, cache dimensions, and model limits do first-party sources publish?
  2. Where are the authoritative catalog, metadata, runtime-policy, lookup, and documentation owners?
  3. Is Opus 5 already supported, and does either provider require a server, persistence, or interface change?

## Claude Price Audit Addendum (2026-07-31)

The current first-party Anthropic pricing page was rechecked against every
active Claude row in the source catalog and the planned Opus 5 row. Prices below
are per million tokens; cache columns are input-cache prices.

| Model | Catalog/source state | Catalog standard input/output | Catalog cache read / 5m write / 1h write | First-party current standard | Audit result |
| --- | --- | ---: | ---: | ---: | --- |
| Claude Fable 5 | Active source row | `$10 / $50` | `$1 / $12.50 / $20` | `$10 / $50`, `$1 / $12.50 / $20` | Match |
| Claude Opus 5 | Planned in approved design; not yet in source | `$5 / $25` | `$0.50 / $6.25 / $10` | `$5 / $25`, `$0.50 / $6.25 / $10` | Planned values match |
| Claude Opus 4.8 | Active source row | `$5 / $25` | `$0.50 / $6.25 / $10` | `$5 / $25`, `$0.50 / $6.25 / $10` | Match |
| Claude Opus 4.7 | Active source row | `$5 / $25` | `$0.50 / $6.25 / $10` | `$5 / $25`, `$0.50 / $6.25 / $10` | Match |
| Claude Sonnet 5 | Active source row | `$3 / $15` | `$0.30 / $3.75 / $6` | Standard `$3 / $15`, `$0.30 / $3.75 / $6`; temporary intro `$2 / $10`, `$0.20 / $2.50 / $4` through 2026-08-31 | Standard match; current temporary discount is not represented |
| Claude Sonnet 4.6 | Active source row | `$3 / $15` | `$0.30 / $3.75 / $6` | `$3 / $15`, `$0.30 / $3.75 / $6` | Match |

The only discrepancy is policy scope, not a wrong standard-price literal:
Anthropic currently advertises Sonnet 5 introductory pricing of `$2/$10`
through August 31, 2026, then `$3/$15` standard pricing from September 1.
The catalog intentionally records durable standard pricing and has only one
`pricingEffectiveDate`; it has no expiry date or temporal-policy selector.
Changing the row to the introductory rate would make the static catalog
understate costs after August 31 unless it is refreshed again or the pricing
model gains an explicit validity interval.

**Decision resolved on 2026-07-31:** the user selected final durable standard
Sonnet 5 pricing. Keep the current `$3/$15` row and corresponding standard cache
rates; do not encode the temporary introductory rate. Fast mode, Batch,
regional/data-residency, and cloud-platform modifiers remain separate from
these base catalog prices.

## Request Context

Original user request: “open ai models prices has been updated, please update teh prices from autobyteus-ts project.” The supplied screenshot identifies GPT-5.6 Terra/Luna reductions and a separate Sol Fast mode, but not exact rates.

Follow-up user request: “by the way, could you also add support for claude opus 5 model for claude as well, or we already add it?” Investigation confirms it is not already supported in the active `autobyteus-ts` catalog/runtime/docs.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): `Git`
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/update-openai-model-pricing`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/update-openai-model-pricing/tickets/in-progress/update-openai-model-pricing`
- Current Branch: `codex/update-openai-model-pricing`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/update-openai-model-pricing`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin --prune` succeeded on 2026-07-31; `origin/personal` was `dfc0468b137cd231b79ff8096fa46750611b06e2` before worktree creation.
- Task Branch: `codex/update-openai-model-pricing`
- Expected Finalization Target: `personal` / tracked remote `origin/personal`, subject to delivery-stage refresh and user authorization.
- Bootstrap Blockers: None.
- Notes For Downstream Agents: The shared checkout was dirty with unrelated changes; all authoritative task work remains in this dedicated clean worktree.

## Supplemental Task Artifact Inventory

No supplemental artifact was promoted. The supplied screenshot and first-party evidence are durable enough in this notes file and are linked from the requirements/design artifacts.

| Artifact Path | Purpose And Scope | Evidence, Context, Or Decision Captured | Core Artifact(s) Supported | Related IDs | Status | Approval Applicability / State | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| None | N/A | External OpenAI/Anthropic evidence and design decisions are recorded here. | Requirements, design | REQ-002, REQ-005–REQ-007; AC-002–AC-004, AC-008–AC-012 | N/A | N/A | No |

## Source Log

| Date | Source Type | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-07-31 | Command | `pwd; git status --short --branch; git remote -v; find . -maxdepth 2 -type d` | Resolve repository/workspace and shared-checkout state | Superrepo contains `autobyteus-ts`; original shared `personal` checkout had unrelated dirty files. | No |
| 2026-07-31 | Command | `git fetch origin --prune` | Refresh remote refs before task worktree creation | Succeeded; `origin/personal` resolved to `dfc0468b137cd231b79ff8096fa46750611b06e2`. | No |
| 2026-07-31 | Setup | `git worktree add -b codex/update-openai-model-pricing /Users/normy/autobyteus_org/autobyteus-worktrees/update-openai-model-pricing origin/personal` | Create isolated task branch/worktree | Dedicated clean worktree created successfully. | No |
| 2026-07-31 | Code | `autobyteus-ts/src/llm/supported-model-definitions.ts` | Locate both provider catalog/pricing owners | GPT-5.6 uses `createOpenAIGpt56Pricing`; Anthropic rows declare identity, config schema, and cache-aware pricing in this file. Current GPT-5.6 inputs are Sol 5/30, Terra 2.5/15, Luna 1/6; current Anthropic rows include Fable 5, Opus 4.8/4.7, Sonnet 5, but no Opus 5. | No |
| 2026-07-31 | Code | `autobyteus-ts/src/llm/api/anthropic-llm.ts` | Verify runtime request-shape ownership | `resolveAnthropicModelRequestPolicy` recognizes Opus 4.8/4.7, Sonnet 5, and Fable 5 as adaptive/no-sampling models; `claude-opus-5` is absent. Existing adaptive schema/request code is reusable. | Add Opus 5 to the allowlist in implementation. |
| 2026-07-31 | Command | `rg -i 'claude-opus-5|opus 5|opus-5' autobyteus-ts/src autobyteus-ts/tests autobyteus-ts/docs` | Check whether Opus 5 is already supported | No active source, test, or docs match for Opus 5. | No |
| 2026-07-31 | Code | `autobyteus-ts/src/llm/metadata/curated-model-metadata.ts` | Locate curated model-limit owner | Anthropic model limits are centralized here; Opus 5 is absent. Existing current rows use 1,000,000 context/input and 128,000 output. | Add Opus 5 metadata with official source/date. |
| 2026-07-31 | Code | `autobyteus-ts/tests/unit/llm/supported-model-definitions.test.ts` | Locate catalog and pricing assertions | Tests exact GPT-5.6 tiers/dates and current Anthropic IDs/cache pricing; expected GPT-5.6 values are stale and Opus 5 coverage is absent. | Extend focused assertions. |
| 2026-07-31 | Code | `autobyteus-ts/tests/unit/llm/api/anthropic-llm.test.ts` | Locate durable Anthropic request-policy coverage | Parameterized adaptive-model tests cover Opus 4.8, Sonnet 5, and Fable 5; no Opus 5 case exists. | Add Opus 5 to current adaptive coverage or a focused regression. |
| 2026-07-31 | Code | `autobyteus-ts/tests/integration/llm/llm-factory-metadata-resolution.test.ts` | Verify factory metadata contract | Anthropic rows assert provider value, context/output limits, and adaptive schema; no Opus 5 assertion. | Add exact Opus 5 metadata/schema assertion. |
| 2026-07-31 | Code/Docs | `autobyteus-ts/docs/provider_model_catalogs.md`, `docs/llm_module_design.md`, `docs/llm_module_design_nodejs.md` | Identify active documentation that enumerates current models/policies | Provider catalog and module-design docs enumerate older current Claude rows and GPT-5.6 launch pricing. | Update active current-model/policy/pricing text; do not rewrite historical tickets. |
| 2026-07-31 | Code | `autobyteus-ts/src/llm/llm-factory.ts`; `autobyteus-server-ts/src/token-usage/pricing/token-price-config-provider.ts` | Verify public lookup and downstream ownership | Factory projects generic trusted pricing/metadata; server consumes it without duplicate model-price constants. | No server change. |
| 2026-07-31 | Code | `autobyteus-server-ts/src/token-usage/pricing/token-cost-calculator.ts` | Verify cache/tier application | Calculator is provider-neutral and already applies cache dimensions and input tiers. | No algorithm change. |
| 2026-07-31 | Code/Test | `autobyteus-server-ts/tests/e2e/token-usage/gpt56-token-usage-accounting-graphql.e2e.test.ts` | Check downstream stale fixtures | Exercises GPT-5.6 Sol, whose prices remain unchanged; no Terra/Luna stale constants found. | No change expected. |
| 2026-07-31 | Web | `https://openai.com/index/advancing-the-price-performance-frontier-with-gpt-5-6/` | Verify OpenAI announcement/effective date | Published July 30, 2026; Terra `$2/$12`, Luna `$0.20/$1.20`, Sol unchanged; Fast mode is a separate processing option. | No |
| 2026-07-31 | Web | `https://developers.openai.com/api/docs/models/gpt-5.6-sol`, `.../gpt-5.6-terra`, `.../gpt-5.6-luna` | Verify cache-read and tier rules | Sol `$5/$30` with `$0.50` cached input; Terra `$2/$12` with `$0.20`; Luna `$0.20/$1.20` with `$0.02`; existing cache-write/tier relationships remain. | No |
| 2026-07-31 | Web | `https://www.anthropic.com/news/claude-opus-5` | Verify launch, availability, base price, and API ID | Published July 24, 2026; Opus 5 is available on all platforms, API ID `claude-opus-5`, `$5` input / `$25` output; Fast mode is twice base and separate. | No |
| 2026-07-31 | Web | `https://platform.claude.com/docs/en/about-claude/models/overview` | Verify current Claude identity/capabilities/limits | API ID and alias are `claude-opus-5`; pricing `$5/$25`; adaptive thinking yes; 1M context and 128k max output. | No |
| 2026-07-31 | Web | `https://platform.claude.com/docs/en/about-claude/pricing` | Verify cache subtype prices and out-of-scope modifiers | Opus 5: `$5` input, `$6.25` 5m write, `$10` 1h write, `$0.50` cache hit, `$25` output; cache multipliers are 1.25x/2x/0.1x; Fast mode and Batch are separate. | No |
| 2026-07-31 | Other | User attachment `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_7d554777dd0b4dfa93e4b00393e10bd9/solution_designer_c0159e29b0cf4bdd871f98ff75e76340/context_files/ctx_6520ea6bcf74__image.png` | Preserve the supplied change signal | Screenshot identifies OpenAI reductions/Fast mode but not exact values. | No |
| 2026-07-31 | Other | User decision: “we will use the final durable pricing of course. because later we dont want to change anymore” | Resolve `REQ-GAP-001` / Sonnet 5 promotional-versus-standard policy choice | Durable standard Sonnet 5 pricing is approved; no expiry/temporal pricing feature is required. | No |

## Relevant Existing Behavior And Production Paths

| Behavior ID | Kind | Current Supported Trigger Or Governing Contract | Current Production Path And Lifecycle | Meaningful Current Outcome / Invariants | Evidence |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | Contract | Built-in GPT-5.6 definition and `LLMFactory` lookup | Definitions -> `LLMModel` registration -> `LLMFactory.getModelPricingInfo` -> server price provider -> calculator | Exact rows/trust/cache/tier shape exists; Terra/Luna values are stale. | Catalog source, factory, focused unit test |
| BEH-002 | System | Non-local token usage with model identity | Usage payload -> server policy resolution -> tier selection -> cost calculation -> snapshot/projection | Generic accounting is provider-neutral; historical snapshots are not recomputed. | Server pricing source/calculator/E2E |
| BEH-003 | Contract | Anthropic catalog lookup and message request | Definition -> `LLMFactory.createLLM` -> `AnthropicLLM` -> Messages API | Opus 5 is mechanically absent; current adaptive policy is an existing adapter boundary. | Catalog source, Anthropic adapter/tests |
| BEH-004 | Contract | Anthropic pricing/metadata lookup | Definition -> curated metadata/factory projection | Opus 5 metadata is absent; existing cache-aware pricing/metadata shape is sufficient. | Catalog source, metadata map, factory tests |
| BEH-005 | Operational | Maintainer reads current provider/module-design docs | Official source -> active catalog docs/module-design docs | Docs omit Opus 5 and retain stale GPT-5.6 table values. | Active docs |
| BEH-006 | Contract | Sonnet 5 standard catalog policy | Static catalog -> factory pricing lookup -> future server policy | Current standard row is correct for the selected durable policy; temporary promotion is intentionally excluded. | Catalog source, official pricing page, user decision |

## Design Health Assessment Evidence

- Overall design issue: `No` for ownership/boundaries. The Opus 5 gap is a local missing catalog row plus a missing runtime invariant entry, not a reason to create a new adapter or registry.
- Root cause classification: `Local Implementation Defect` / `Missing Invariant` for absent Opus 5 support; `No Design Issue Found` for the existing pricing/lookup architecture.
- Refactor posture: `Likely Not Needed`. The static catalog, curated metadata resolver, Anthropic request-policy function, and generic server lookup each have singular responsibilities.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `supported-model-definitions.ts` | One static catalog owns provider model identity and default pricing/config. | Add Opus 5 beside existing rows and refresh GPT-5.6 inputs in place. | No |
| `curated-model-metadata.ts` | Curated context/output limits have one owner. | Add one docs-backed Opus 5 metadata row; no metadata refactor. | No |
| `anthropic-llm.ts` | Adaptive/no-sampling behavior is a private model-family policy boundary. | Extend the allowlist; reuse policy/schema and preserve older model behavior. | No |
| Factory/server pricing path | Generic lookup projects all required dimensions without duplicate prices. | No server source or interface change. | No |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-ts/src/llm/supported-model-definitions.ts` | Built-in provider catalog/pricing/config schemas | GPT-5.6 helper has stale Terra/Luna inputs; Opus 5 row absent. | Extend existing catalog owner. |
| `autobyteus-ts/src/llm/api/anthropic-llm.ts` | Anthropic request construction and model invariants | Opus 5 is absent from adaptive policy family list. | Extend existing policy allowlist only. |
| `autobyteus-ts/src/llm/metadata/curated-model-metadata.ts` | Curated context/input/output limits | Opus 5 absent. | Add official docs-backed row. |
| `autobyteus-ts/tests/unit/llm/supported-model-definitions.test.ts` | Catalog identity/pricing executable contract | GPT-5.6 expectations stale; Opus 5 coverage absent. | Extend. |
| `autobyteus-ts/tests/unit/llm/api/anthropic-llm.test.ts` | Anthropic request-shape contract | Current adaptive model parameterization omits Opus 5. | Extend. |
| `autobyteus-ts/tests/integration/llm/llm-factory-metadata-resolution.test.ts` | Factory metadata/schema contract | Anthropic metadata assertions omit Opus 5. | Extend. |
| `autobyteus-ts/docs/provider_model_catalogs.md` | Durable provider catalog/policy docs | GPT-5.6 table stale; active Claude list omits Opus 5. | Update current source/date/pricing/policy text. |
| `autobyteus-ts/docs/llm_module_design.md` and `docs/llm_module_design_nodejs.md` | Active module/design guidance | Current Anthropic lists omit Opus 5. | Update current model/policy references. |
| `autobyteus-ts/src/llm/llm-factory.ts` | Public catalog registration/lookup | Already generic and sufficient. | Reuse unchanged. |
| `autobyteus-server-ts/src/token-usage/pricing/*` | Server policy adaptation/calculation | No duplicate price or model-specific branch. | Reuse unchanged. |

## Runtime / Probe Findings

| Date | Method | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-07-31 | Search | `rg -i 'claude-opus-5|opus 5|opus-5' autobyteus-ts/src autobyteus-ts/tests autobyteus-ts/docs` | No active match. | Opus 5 is not already added. |
| 2026-07-31 | Trace | Read `resolveAnthropicModelRequestPolicy`, `buildThinkingParam`, and `applyAnthropicRequestParams` | Adaptive family membership controls adaptive thinking, manual-thinking sanitization, and sampling removal. | Adding `claude-opus-5` to the family list supplies the required runtime behavior. |
| 2026-07-31 | Trace | Read `LLMFactory.getModelPricingInfo`, `TokenPriceConfigProvider`, `TokenCostCalculator` | Provider-neutral lookup and cost application already carry Anthropic cache subtypes and OpenAI tiers. | No downstream algorithm/interface change. |
| 2026-07-31 | Search | `rg -n 'gpt-5.6-(sol|terra|luna)|2026-06-26|2.5.*15|1.*6' autobyteus-ts/tests autobyteus-ts/src autobyteus-ts/docs` | Active source/test/docs contain stale GPT-5.6 values; archived tickets also contain historical launch evidence. | Update active artifacts only; preserve historical records. |
| 2026-07-31 | Setup | Dedicated clean worktree from refreshed remote | No task-local runtime setup or credentials were needed. | Deterministic catalog/policy tests are suitable downstream. |

## External / Public Source Findings

### OpenAI

- Announcement: `https://openai.com/index/advancing-the-price-performance-frontier-with-gpt-5-6/`, published 2026-07-30. Terra is `$2` input / `$12` output, Luna `$0.20` / `$1.20`, Sol unchanged; Fast mode is separate.
- Model pages: `https://developers.openai.com/api/docs/models/gpt-5.6-sol`, `.../gpt-5.6-terra`, `.../gpt-5.6-luna`. Cached input is `$0.50`, `$0.20`, `$0.02`; existing cache-write and `>272K` relationships remain applicable.

### Anthropic

- Announcement: `https://www.anthropic.com/news/claude-opus-5`, published 2026-07-24. Opus 5 is available today, API ID `claude-opus-5`, and standard API price is `$5` input / `$25` output. Fast mode is separately priced at twice base.
- Models overview: `https://platform.claude.com/docs/en/about-claude/models/overview`. API ID/alias `claude-opus-5`; adaptive thinking supported; 1M context; 128k max output; standard `$5/$25` pricing.
- Pricing: `https://platform.claude.com/docs/en/about-claude/pricing`. Standard Opus 5 is `$5` input, `$6.25` 5m cache write, `$10` 1h cache write, `$0.50` cache hit, `$25` output. Prompt-cache multipliers are 1.25x, 2x, and 0.1x. Fast mode, Batch, and data residency are separate pricing dimensions.
- Freshness: First-party pages fetched/verified on 2026-07-31; Opus 5 launch/effective date is 2026-07-24.

## Findings From Code / Docs / Data / Logs

- OpenAI standard values: Sol `(5,30,0.5,6.25)`, Terra `(2,12,0.2,2.5)`, Luna `(0.2,1.2,0.02,0.25)` as input/output/cache-read/cache-write per million tokens.
- OpenAI `>272K` values: Sol `(10,45,1,12.5)`, Terra `(4,18,0.4,5)`, Luna `(0.4,1.8,0.04,0.5)`.
- Claude Opus 5 values: `(5,25,0.5,6.25,10)` as input/output/cache-read/5m-write/1h-write per million tokens.
- Existing Claude adaptive schema uses `thinking_enabled` and `thinking_display`; runtime generates `thinking: { type: 'adaptive' }` and removes unsupported sampling fields for recognized current models.
- Existing historical ticket artifacts and historical ledger snapshots must remain unchanged.

## Persisted Data Transition Evidence

- Token-usage events store price/cost snapshots; the catalog is static package code, not a mutable persisted policy record.
- Normal readers return recorded snapshots; future policy resolution asks the current factory catalog.
- Required semantics/invariants are preserved without transformation: historical events remain immutable and future events may use the new current policy.
- Migration is unnecessary and harmful because it would rewrite historical accounting. Decision: `Directly Usable — No Migration`.

## Constraints / Dependencies / Compatibility Facts

- Keep static, deterministic pricing; do not add remote fetch or runtime fallback.
- Keep exact model identities: OpenAI existing IDs and Claude `claude-opus-5`; no aliases.
- Reuse existing cache fields: OpenAI generic cache-write/tier fields and Anthropic 5m/1h cache-write fields.
- Keep Fast mode, Batch, data residency, and fallback processing out of this catalog change because no corresponding processing-mode identity is present.
- `npm test` is not configured in `autobyteus-ts`; downstream should use the repository's installed Vitest/package commands and record any environment blocker precisely.

## Open Unknowns / Risks

- Provider pricing/model availability can change; source dates make updates auditable but no remote runtime fetch is desired.
- Live provider access and entitlement are not validated by deterministic unit/integration catalog tests.
- No known requirements/design gap remains after the durable-pricing decision; the main implementation risk is forgetting one active current-model test/doc reference when adding the Opus 5 row.

## Notes For Architecture Reviewer

The initial SR-001 package covered only the OpenAI refresh. The user's follow-up superseded that scope; SR-002 and SR-003 record the combined rework/audit, and SR-004 records the resolved durable Sonnet 5 policy. Please re-review the complete package for: (1) GPT-5.6 standard/cache/tier/date values; (2) exact Claude Opus 5 catalog/API identity and standard cache-aware prices; (3) reuse of existing adaptive thinking policy via one allowlist extension; (4) curated 1M/128k metadata; (5) active docs/test coverage; (6) explicit preservation of Sonnet 5 durable standard pricing; and (7) exclusion of Fast mode, Batch, fallback, cloud variants, server changes, and migration.
