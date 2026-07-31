# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

`Design-ready` (the user explicitly selected durable standard Claude pricing; the temporary Sonnet 5 introductory discount is intentionally excluded)

## Goal / Problem Statement

Refresh the built-in OpenAI GPT-5.6 prices in `autobyteus-ts` and add the newly requested Claude Opus 5 model to the same project. The OpenAI catalog currently overstates GPT-5.6 Terra/Luna prices. The Anthropic catalog currently has Fable 5, Opus 4.8/4.7, Sonnet 5, and older retained rows, but no Claude Opus 5 row or current-model request-policy recognition.

## Current And Desired Behavior (Mandatory)

| Behavior ID | Current Behavior | Desired Behavior | Preserved / Unchanged Behavior | Related Requirement / Acceptance-Criteria IDs |
| --- | --- | --- | --- | --- |
| BEH-001 | The static OpenAI catalog exposes exact GPT-5.6 Sol, Terra, and Luna rows through `LLMFactory`; Terra is `$2.50/$15` and Luna `$1/$6` per million input/output tokens, with derived cache and long-context values based on those launch prices. Sol is `$5/$30`. | The same exact rows expose current pricing: Sol `$5/$30`, Terra `$2/$12`, and Luna `$0.20/$1.20`; cache-read, cache-write, and `>272K` tier values follow the current GPT-5.6 rules. | Model IDs, provider/runtime identity, OpenAI adapter, reasoning schema, metadata limits, tier threshold, trust/source, and Sol prices remain unchanged. | REQ-001–REQ-003; AC-001–AC-004 |
| BEH-002 | `LLMFactory.getModelPricingInfo` supplies stale OpenAI policy data to the generic server token-cost path. | The existing lookup and server accounting path returns the refreshed trusted values without provider-specific server branches or API changes. | Server policy adaptation, tier selection, cost calculation, and historical usage snapshots remain unchanged. | REQ-004; AC-005–AC-006 |
| BEH-003 | The Anthropic static catalog has no `claude-opus-5` row and no active-model request-policy recognition for API value `claude-opus-5`. | The catalog exposes exactly `claude-opus-5` with provider/API identity, standard cache-aware pricing, and the existing adaptive-thinking schema. `AnthropicLLM` recognizes it as an adaptive/no-sampling model. | Existing Anthropic rows, exact IDs, provider adapter, message transport, older fixed-budget behavior, and current adaptive-model behavior remain unchanged. | REQ-005, REQ-007; AC-008, AC-011 |
| BEH-004 | Curated metadata has no Opus 5 row, although the existing metadata resolver and Anthropic cache-pricing fields already support the required shape. | Add official 1M context/input and 128k output metadata plus standard Opus 5 cache-aware pricing/date. | Existing metadata resolution and pricing dimensions remain unchanged. | REQ-006; AC-009–AC-010 |
| BEH-005 | Current provider catalog and module-design documentation list current Anthropic rows without Opus 5 and describe only the older adaptive-model set. | Durable docs list Opus 5, its exact API ID, standard prices, limits, adaptive-thinking behavior, and effective/verification date, while documenting Fast mode as a separate out-of-scope processing price. | Historical tickets remain historical; documentation remains descriptive rather than a runtime authority. | REQ-006; AC-007, AC-012 |
| BEH-006 | The active Sonnet 5 row records durable standard `$3/$15` pricing, while Anthropic's current page advertises a temporary `$2/$10` introductory rate through 2026-08-31. | Retain the durable standard `$3/$15` row and corresponding standard cache rates; do not encode a temporary promotion in the static catalog. | No expiry/temporal pricing path is introduced; existing Sonnet 5 identity, schema, and transport remain unchanged. | REQ-008; AC-013 |

## Investigation Findings

- OpenAI's July 30, 2026 announcement and current official model pages verify Sol `$5/$30`, Terra `$2/$12`, and Luna `$0.20/$1.20` per million input/output tokens, with cache-read at 10%, cache-write at 1.25x, and the existing `>272K` tier multipliers. The existing `createOpenAIGpt56Pricing` helper is the correct owner.
- Anthropic's July 24, 2026 Opus 5 announcement and current Claude Platform docs verify API ID `claude-opus-5`, standard `$5` input / `$25` output, 5-minute cache write `$6.25`, 1-hour cache write `$10`, cache hit `$0.50`, adaptive thinking, 1M context, and 128k maximum output.
- `autobyteus-ts` currently has no `claude-opus-5` source, test, or documentation match. The current Anthropic request-policy allowlist in `src/llm/api/anthropic-llm.ts` recognizes Opus 4.8/4.7, Sonnet 5, and Fable 5, but not Opus 5.
- The existing adaptive schema and request-policy boundary are reusable. The implementation should add Opus 5 to the catalog and to the adaptive-model family allowlist rather than create a new provider adapter or schema.
- `autobyteus-server-ts` resolves pricing through `LLMFactory.getModelPricingInfo`; no duplicate OpenAI or Anthropic price table was found. Its generic cache dimensions and token-cost calculator already support the required values.
- A 2026-07-31 audit of every active Claude row shows Fable 5, Opus 4.8, Opus 4.7, and Sonnet 4.6 match Anthropic's current standard prices. Opus 5's planned values also match. Sonnet 5 is the only policy difference: Anthropic currently advertises temporary `$2/$10` input/output pricing (and corresponding cache prices) through 2026-08-31, while the catalog intentionally records durable standard `$3/$15` pricing from 2026-09-01.
- The user resolved that policy choice on 2026-07-31 by selecting final durable standard pricing; this is now an approved preserved behavior, not an open requirement.

## Relevant Supplemental Task Artifacts

None. External OpenAI and Anthropic evidence is retained in the investigation source log and linked directly from these core artifacts.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): `Feature` plus `Behavior Change` (new catalog/runtime support and OpenAI pricing refresh)
- Initial design issue signal (`Yes`/`No`/`Unclear`): `No`
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): `Local Implementation Defect` / `Missing Invariant` for the absent catalog row and adaptive-policy allowlist entry; no boundary defect
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): `Likely Not Needed`
- Evidence basis: model identity/pricing is centralized in the static catalog, curated limits are centralized in the metadata file, and provider request invariants are already owned by `AnthropicLLM`; the server lookup boundary is generic and healthy.
- Requirement or scope impact: Extend existing catalog, metadata, Anthropic policy recognition, focused tests, and active docs. Do not change server accounting, persistence, provider transport, or create a compatibility layer.

## Recommendations

- Keep the GPT-5.6 family pricing helper and update only its effective date and row inputs; preserve Sol and the existing tier formulas.
- Add Claude Opus 5 as an exact catalog row with API value `claude-opus-5`, reuse `claudeAdaptiveThinkingSchema`, add curated metadata, and extend the existing Anthropic adaptive-model allowlist.
- Use standard Claude API pricing only: input `$5`, output `$25`, cache read `$0.50`, 5-minute write `$6.25`, 1-hour write `$10` per million tokens.
- Retain Sonnet 5's durable standard `$3/$15` row as explicitly selected by the user; do not introduce a time-bounded promotional path.
- Do not add Fast mode, Batch API, data-residency premiums, automatic fallback, cloud-specific aliases, or effort controls; those require a separate processing/product contract and are not represented by the current static catalog.

## Scope Classification (`Small`/`Medium`/`Large`)

`Medium` (two providers, one new catalog/runtime model path, metadata and durable documentation, but no new subsystem or public interface)

## In-Scope Use Cases

1. Built-in OpenAI discovery and pricing lookup for `gpt-5.6-sol`, `gpt-5.6-terra`, and `gpt-5.6-luna`.
2. Future server token-cost estimation through the existing provider-neutral `LLMFactory` pricing contract.
3. Built-in Claude discovery, metadata resolution, pricing lookup, and Anthropic message requests for exact model `claude-opus-5`.
4. Adaptive-thinking request shaping for Opus 5 through the existing `AnthropicLLM` policy.
5. Maintainer-facing provider catalog and module-design documentation.

## Out of Scope

- Adding/removing/renaming OpenAI models or aliases.
- Adding Claude Opus 5 aliases, version snapshots, cloud-specific IDs, fallback routing, or changing existing Claude rows.
- Implementing Claude Fast mode, Batch API pricing, data-residency premiums, subscription pricing, or automatic safety fallback.
- Adding a new Anthropic adapter, changing the Messages API transport, or exposing a new effort/config dimension beyond the existing adaptive schema.
- Changing `autobyteus-server-ts` accounting algorithms or persisted ledger schema.
- Rewriting historical usage records or archived ticket documentation.

## Functional Requirements

- **REQ-001 — Preserve OpenAI identity:** Keep exactly one canonical row for each existing `gpt-5.6-sol`, `gpt-5.6-terra`, and `gpt-5.6-luna`; do not add an unsuffixed alias.
- **REQ-002 — Apply current GPT-5.6 prices:** Set standard per-million-token prices to Sol `$5` / `$30`, Terra `$2` / `$12`, and Luna `$0.20` / `$1.20`; derive cache-read at 10%, cache-write at 1.25x, and `>272K` input/cache at 2x with output at 1.5x.
- **REQ-003 — Record OpenAI price effective date:** All GPT-5.6 rows must report trusted USD pricing effective `2026-07-30`; Sol's unchanged values remain a regression contract.
- **REQ-004 — Preserve provider-neutral pricing contract:** Continue returning the complete trusted pricing shape through `LLMFactory.getModelPricingInfo`; no server-specific fallback or caller compatibility path is allowed.
- **REQ-005 — Add exact Claude Opus 5 catalog support:** Add one Anthropic row with `name`/`canonicalName` `claude-opus-5`, provider `ANTHROPIC`, runtime value `claude-opus-5`, `AnthropicLLM`, and the existing adaptive-thinking schema.
- **REQ-006 — Apply current Claude Opus 5 metadata/pricing:** Record standard input `$5`, output `$25`, cache read `$0.50`, 5-minute cache write `$6.25`, 1-hour cache write `$10`, effective date `2026-07-24`, trusted USD source, 1M context, and 128k maximum output. Documentation must identify the July 31 verification and first-party sources.
- **REQ-007 — Enforce Opus 5 request invariants:** Extend `resolveAnthropicModelRequestPolicy` so `claude-opus-5` uses adaptive thinking, strips fixed-budget/manual sampling fields, and reuses current adaptive request behavior without changing older-model policy.
- **REQ-008 — Preserve durable Sonnet 5 pricing:** Keep Sonnet 5 at standard `$3` input / `$15` output, cache read `$0.30`, 5-minute cache write `$3.75`, and 1-hour cache write `$6` per million tokens. Do not add the temporary `$2/$10` introductory pricing or an expiry/temporal selector in this change.

## Acceptance Criteria

- **AC-001 — OpenAI exact rows:** Built-in definitions contain exactly one row for each GPT-5.6 suffix and no unsuffixed `gpt-5.6` alias.
- **AC-002 — OpenAI standard prices:** Lookup returns Sol `(5, 30, 0.5, 6.25)`, Terra `(2, 12, 0.2, 2.5)`, and Luna `(0.2, 1.2, 0.02, 0.25)` for input, output, cache-read, and generic cache-write.
- **AC-003 — OpenAI long-context prices:** `standard_le_272k` matches AC-002; `long_context_gt_272k` returns Sol `(10,45,1,12.5)`, Terra `(4,18,0.4,5)`, and Luna `(0.4,1.8,0.04,0.5)`.
- **AC-004 — OpenAI trust/date:** All GPT-5.6 rows remain trusted USD catalog prices with effective date `2026-07-30`; Sol remains unchanged.
- **AC-005 — Existing lookup path:** Existing `LLMFactory.getModelPricingInfo` and server accounting coverage pass with refreshed values and no server ownership change.
- **AC-006 — No persistence impact:** No persisted records are migrated or rewritten; historical snapshots remain as recorded and future policy resolutions use the current catalog.
- **AC-007 — OpenAI docs consistency:** Active provider docs contain no stale GPT-5.6 Terra/Luna launch-price table and identify the July 30 source/effective date.
- **AC-008 — Exact Claude identity:** Lookup discovers exactly `claude-opus-5` with name/value/canonical name `claude-opus-5`, provider `ANTHROPIC`, `AnthropicLLM`, and no Opus 5 alias.
- **AC-009 — Claude standard pricing:** Lookup returns trusted USD `(5,25,0.5,6.25,10)` for input, output, cache read, 5-minute cache write, and 1-hour cache write, with effective date `2026-07-24`.
- **AC-010 — Claude metadata/schema:** Model metadata resolves 1,000,000 context/input tokens and 128,000 output tokens from the official Claude overview; schema exposes `thinking_enabled` and `thinking_display` and does not expose the old fixed-budget field.
- **AC-011 — Claude request policy:** Default Opus 5 requests omit temperature/top-p/top-k; explicit `thinking_enabled: true` maps to `thinking: { type: "adaptive" }` (with optional summarized display); fixed-budget/manual `thinking` is not sent.
- **AC-012 — Claude docs and preservation:** Active docs list Opus 5 and standard/cache-aware pricing, explicitly separate Fast mode from this catalog, and existing Anthropic rows/transport/server path remain intact.
- **AC-013 — Durable Sonnet 5 policy:** The catalog and tests retain Sonnet 5 standard `(3,15,0.3,3.75,6)` pricing, do not encode the temporary `$2/$10` promotion, and introduce no expiry-based pricing behavior.

## Constraints / Dependencies

- Reuse existing `TokenPricingConfig`, Anthropic cache dimensions, `ParameterSchema`, `LLMFactory`, and `AnthropicLLM` boundaries; do not invent new fields.
- The `autobyteus-server-ts` workspace dependency consumes `autobyteus-ts`'s provider-neutral pricing lookup and must remain source-compatible.
- First-party sources: OpenAI GPT-5.6 announcement/model pages; Anthropic Opus 5 announcement, Claude models overview, and Claude pricing pages.
- Deterministic tests do not require provider credentials; live provider access is not necessary to prove catalog registration or request-shape policy.

## Persisted Data Outcome (When Applicable)

- Stored subject / location: Existing token-usage ledger events and snapshots in `autobyteus-server-ts` contain historical price/cost snapshots; the built-in catalog is not a versioned persisted record.
- Required outcome: `Directly Usable — No Migration`
- Existing data to preserve: All historical usage events and recorded price snapshots remain unchanged. New model/policy resolution applies only to future events.
- Unacceptable data loss or corruption: Repricing historical rows, mutating stored cost snapshots, or making old model IDs resolve to a different historical meaning.
- Rollout constraint: Static package/catalog change only; no maintenance window or data job.
- Related IDs: REQ-004, AC-006.

## Assumptions

- The user's follow-up explicitly authorizes adding Claude Opus 5; current first-party sources are authoritative for its identity, pricing, capabilities, and limits.
- `2026-07-24` is the Opus 5 pricing effective/launch date; documentation verification is recorded as `2026-07-31`.
- The user's 2026-07-31 decision selects durable standard Claude pricing for Sonnet 5; the temporary introductory promotion is intentionally not represented.
- Reusing the existing adaptive schema is sufficient for current project behavior; no new effort control is added because that would expand the config contract.
- OpenAI's existing GPT-5.6 cache/tier formulas and Claude's cache subtype fields remain the catalog's current representations.

## Risks / Open Questions

- Provider pricing or model availability may change again; source/effective dates make future refreshes auditable but no remote pricing fetch is introduced.
- Anthropic Fast mode and Batch API have distinct prices, but the current catalog lacks a processing-mode selector; representing them now would create ambiguous accounting.
- The temporary Sonnet 5 introductory rate is intentionally excluded by the user's durable-pricing decision; future pricing changes require an explicit catalog refresh.
- Opus 5's provider availability is documented, but no credentialed live call is claimed; access entitlement remains an environment/provider concern.
- Historical reports intentionally retain prior snapshots and will not be retroactively repriced.

## Requirement-To-Use-Case Coverage

| Use Case | Covered Requirements | Expected Outcome |
| --- | --- | --- |
| UC-001 — Resolve current GPT-5.6 pricing | REQ-001–REQ-004 | Exact rows return current trusted standard/cache/tier prices through the existing lookup. |
| UC-002 — Account for future OpenAI usage | REQ-004 | Existing server path receives current policy without source/schema changes. |
| UC-003 — Discover and price Claude Opus 5 | REQ-005–REQ-006 | Exact model identity, metadata, standard/cache pricing, and date resolve correctly. |
| UC-004 — Send an Opus 5 request | REQ-007 | Anthropic adapter emits provider-valid adaptive/no-sampling request shape. |
| UC-005 — Maintain catalog documentation | REQ-003, REQ-006 | Active docs match both providers and their official source/date policy. |
| UC-006 — Preserve durable Sonnet 5 accounting policy | REQ-008 | Future Sonnet 5 policy resolution uses standard pricing rather than a time-bounded promotional rate. |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criteria | Scenario Intent |
| --- | --- |
| AC-001–AC-004 | Unit: GPT-5.6 identity, trust/date, standard/cache/tier values. |
| AC-005–AC-006 | Existing factory/server pricing checks and static inspection for no migration. |
| AC-007 | Documentation search/review for stale OpenAI values and source date. |
| AC-008–AC-010 | Unit/integration: Opus 5 catalog identity, pricing, metadata, and schema. |
| AC-011 | Anthropic adapter unit tests for default, adaptive-thinking, sampling sanitization, and streaming request shapes. |
| AC-012 | Documentation review plus regression coverage for existing Anthropic rows and provider-neutral server path. |
| AC-013 | Unit/static review: Sonnet 5 retains standard cache-aware pricing and no temporal promotion path is added. |

## Approval Status

`Original and follow-up model requests, plus the durable Sonnet 5 pricing decision, approved by the user on 2026-07-31; exact OpenAI and Anthropic values independently verified against first-party sources. No intended-behavior supplement requires separate approval.`
