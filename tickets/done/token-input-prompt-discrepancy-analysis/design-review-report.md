# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-input-prompt-discrepancy-analysis/tickets/token-input-prompt-discrepancy-analysis/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-input-prompt-discrepancy-analysis/tickets/token-input-prompt-discrepancy-analysis/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-input-prompt-discrepancy-analysis/tickets/token-input-prompt-discrepancy-analysis/design-spec.md`
- Current Review Round: 1
- Trigger: Initial architecture review of latest design package after user-approved Token Meter UI shape and REQ-031 implementation-time visual validation requirement.
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Current-State Evidence Basis: Reviewed the requirements, investigation notes, provider probe matrix, design spec, and current code in `TokenCostCalculator`, token usage event/domain DTOs, snapshot delta normalizer, ledger store, SQL mapper/schema, GraphQL token usage types, frontend store/UI, provider normalizers, Codex/Claude runtime usage adapters, and native AutoByteus compaction/context-budget path.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Latest design package after UI and visual-QA refinements | N/A | No | Pass | Yes | Design is implementation-ready; residual risks are implementation vigilance items, not design blockers. |

## Reviewed Design Spec

The reviewed design specifies a provider-aware token usage and pricing path that introduces explicit input token semantics, a component-basis resolver before pricing, policy-driven cost calculation, expanded ledger/API/frontend summary fields, and an approved Token Meter UI hierarchy. It also separates cumulative gross usage from latest/current prompt context-window statistics and requires running-app visual validation during implementation.

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Design lines up front classify this as a larger requirement: bug fix, behavior change, UI explainability, and targeted refactor. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | Design names Missing Invariant, Boundary/Ownership Issue, Duplicated Policy/Coordination, and Shared Structure Looseness, backed by Anthropic additive input, xAI reasoning, Gemini thoughts-only, and GLM UI evidence. | None. |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Design states refactor is needed now and names the targeted refactor: component basis resolver plus pricing policy/cost calculator changes. | None. |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | Migration steps, file mapping, removal plan, and provider policy table all reflect the refactor decision; Mistral/MiniMax live probes and historical-row precision are explicitly deferred/safely handled. | None. |

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| N/A | N/A | N/A | N/A | N/A | No prior architecture-review findings exist. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Provider/runtime usage to enriched ledger event | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Ledger events to run/team/member summary | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Provider/model/runtime pricing policy to cost result | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 | Live/hydrated summary to Token Meter UI | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-005 | Provider fixtures to deterministic tests | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-006 | Latest prompt/context usage to current prompt statistic | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts` LLM provider layer | Pass | Pass | Pass | Pass | Correct owner for raw provider usage parsing and model catalog metadata. |
| Server token usage domain/projections | Pass | Pass | Pass | Pass | Correct owner for canonical usage fields, semantic basis, and delta normalization. |
| Server token usage pricing | Pass | Pass | Pass | Pass | Existing calculator remains the math owner but is demoted from semantic inference. |
| Server persistence and ledger summary | Pass | Pass | Pass | Pass | Extends current ledger instead of replacing it. |
| API GraphQL/WebSocket transport | Pass | Pass | Pass | Pass | Transport-only contract expansion is appropriate. |
| Web token usage state/UI | Pass | Pass | Pass | Pass | Display-only boundary is preserved. |
| Docs/tests/probe artifacts | Pass | Pass | Pass | Pass | Live probes remain artifacts; durable coverage uses sanitized fixtures. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Input token semantic and component basis | Pass | Pass | Pass | Pass | New server domain/projection split prevents provider if/else drift in calculator/UI. |
| Pricing dimensions/trusted flags | Pass | Pass | Pass | Pass | Policy type is the right shared structure for trusted/missing/tier metadata. |
| Cache state vocabulary | Pass | Pass | Pass | Pass | Server-owned state avoids UI-only inference of zero/unknown cache. |
| Missing price dimensions | Pass | Pass | Pass | Pass | Structured list supports transparent status and avoids silent zero pricing. |
| Cost group summary | Pass | Pass | Pass | Pass | Needed for mixed provider/model/currency aggregation safety. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `accounting_input_tokens` / public `grossInputTokens` | Pass | Pass | Pass | N/A | Pass | Internal name remains for schema continuity, but public summary/UI name becomes unambiguous. |
| `standard_input_tokens`, cache read/write, cache subtypes | Pass | Pass | Pass | Pass | Pass | Aggregate + subtype invariant is stated; missing subtype dimensions become partial rather than guessed. |
| `reasoning_output_tokens` and `billable_output_tokens` | Pass | Pass | Pass | Pass | Pass | Design distinguishes explanatory reasoning from total billable output to avoid double charging. |
| `api_cost_status` plus `missingPriceDimensions` | Pass | Pass | Pass | N/A | Pass | Status vocabulary covers complete, partial, missing, local/no-bill, and mixed. |
| Current prompt context fields | Pass | Pass | Pass | N/A | Pass | `latestPromptTokens`, `effectiveContextWindowTokens`, and percent stay separate from cumulative usage. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Global cache-subtraction pricing invariant | Pass | Pass | Pass | Pass | Replaced by component basis + policy-aware calculator. |
| Custom OpenAI-compatible trusted-zero pricing | Pass | Pass | Pass | Pass | Replaced by configured pricing or `price_missing`. |
| Ambiguous primary `Input` UI copy | Pass | Pass | Pass | Pass | Replaced by `Gross input` plus breakdown. |
| Unexplained primary `events` label | Pass | Pass | Pass | Pass | Replaced by details-only `Usage reports` / `model calls`. |
| Silent zero for missing cache price dimensions | Pass | Pass | Pass | Pass | Replaced by partial/missing statuses and missing dimensions. |
| Output-cost undercount for separate reasoning payloads | Pass | Pass | Pass | Pass | Replaced by provider-specific billable output basis. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/llm/utils/llm-token-usage-observation.ts` | Pass | Pass | Pass | Pass | Provider observation schema remains raw-usage oriented. |
| `autobyteus-ts/src/llm/api/*token-usage-normalizer.ts` and runtime usage adapters | Pass | Pass | Pass | Pass | Provider/runtime parsing stays separate from pricing. |
| `autobyteus-server-ts/src/token-usage/domain/token-usage-component-basis.ts` | Pass | Pass | Pass | Pass | New shared domain structure is justified and tight. |
| `autobyteus-server-ts/src/token-usage/projections/token-usage-component-basis-resolver.ts` | Pass | Pass | Pass | Pass | Correct place for semantic component conversion before delta/pricing. |
| `autobyteus-server-ts/src/token-usage/pricing/token-pricing-policy.ts` and `token-price-config-provider.ts` | Pass | Pass | Pass | Pass | Correct owner for policy dimensions and trusted status. |
| `autobyteus-server-ts/src/token-usage/pricing/token-cost-calculator.ts` | Pass | Pass | Pass | Pass | Calculator applies components and policy only. |
| `autobyteus-server-ts/prisma/schema.prisma` and SQL ledger repository | Pass | Pass | Pass | Pass | Persistence extensions are explicit and scoped. |
| `autobyteus-server-ts/src/token-usage/providers/token-usage-ledger-store.ts` | Pass | Pass | Pass | Pass | Summary aggregation owner remains authoritative. |
| `autobyteus-server-ts/src/api/graphql/types/token-usage-stats.ts` | Pass | Pass | Pass | Pass | Transport shape remains DTO-only. |
| `autobyteus-web/types/tokenUsageMeter.ts`, `stores/tokenUsageMeterStore.ts`, `TokenUsageMeterPanel.vue`, `TokenUsageHeaderChip.vue` | Pass | Pass | Pass | Pass | Frontend remains presentation/merge-only; no provider price logic. |
| `autobyteus-server-ts/docs/modules/token_usage.md` | Pass | Pass | N/A | Pass | Durable docs are in the existing token usage documentation owner. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Provider observation builder | Pass | Pass | Pass | Pass | Providers may parse raw fields but not price. |
| Component basis resolver | Pass | Pass | Pass | Pass | Calculator no longer infers raw provider semantics. |
| Pricing policy resolver | Pass | Pass | Pass | Pass | UI/store must not import catalog or hardcode provider prices. |
| Ledger summary | Pass | Pass | Pass | Pass | GraphQL/UI consume summary instead of raw event recomputation. |
| Frontend Token Meter | Pass | Pass | Pass | Pass | Display-only rule is explicit. |
| Test fixtures | Pass | Pass | Pass | Pass | Production must not depend on ticket probe files. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Provider observation builder | Pass | Pass | Pass | Pass | Server semantics come through observation fields, not raw JSON scraping. |
| Component basis resolver | Pass | Pass | Pass | Pass | Explicitly prevents calculator/UI bypass. |
| Pricing policy resolver | Pass | Pass | Pass | Pass | Policy selection stays behind one boundary. |
| Ledger store summary | Pass | Pass | Pass | Pass | Summary aggregation remains server-owned. |
| GraphQL/WebSocket DTOs | Pass | Pass | Pass | Pass | Hydration/live paths share the expanded contract. |
| Context-size owner | Pass | Pass | Pass | Pass | Current prompt statistic does not expose compaction decision text. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `buildLlmTokenUsageObservation` | Pass | Pass | Pass | Low | Pass |
| `createTokenUsageUpdatedPayload` | Pass | Pass | Pass | Low | Pass |
| `TokenUsageComponentBasisResolver.resolve(payload)` | Pass | Pass | Pass | Low | Pass |
| `TokenUsageSnapshotDeltaNormalizer.normalizeAccountingDelta(payload)` | Pass | Pass | Pass | Low | Pass |
| `TokenPriceConfigProvider.resolvePolicy(payload)` | Pass | Pass | Pass | Medium | Pass |
| `TokenCostCalculator.applyPolicy(payload, policy)` | Pass | Pass | Pass | Low | Pass |
| GraphQL `get*TokenUsageSummary` | Pass | Pass | Pass | Low | Pass |
| WebSocket `TOKEN_USAGE_UPDATED` payload | Pass | Pass | Pass | Low | Pass |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/token-usage/domain` | Pass | Pass | Low | Pass | Appropriate for shared enums/types. |
| `autobyteus-server-ts/src/token-usage/projections` | Pass | Pass | Low | Pass | Appropriate for basis and delta normalization. |
| `autobyteus-server-ts/src/token-usage/pricing` | Pass | Pass | Low | Pass | Pricing policy/calculator stays isolated. |
| `autobyteus-server-ts/src/token-usage/providers` | Pass | Pass | Medium | Pass | Existing name is imperfect but design correctly avoids adding unrelated pricing there. |
| `autobyteus-web/components/workspace/usage` | Pass | Pass | Low | Pass | Token Meter UI belongs in existing usage components. |
| Ticket artifact folder | Pass | Pass | Low | Pass | Probe scripts/evidence are investigation artifacts only. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Provider usage parsing | Pass | Pass | N/A | Pass | Extend existing normalizers/adapters. |
| Canonical event contract | Pass | Pass | N/A | Pass | Extend `agent-run-token-usage.ts`. |
| Semantic component basis | Pass | Pass | Pass | Pass | New resolver is justified to avoid duplicated provider semantics. |
| Pricing policy | Pass | Pass | Pass | Pass | New policy type is justified; existing lookup boundary remains. |
| Ledger summary | Pass | Pass | N/A | Pass | Extend existing store. |
| Token Meter UI | Pass | Pass | N/A | Pass | Extend/refactor current components and store. |
| Provider validation | Pass | Pass | Pass | Pass | Ticket probes feed fixture-backed tests, not live CI. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| Pricing semantics | No | Pass | Pass | Flat global formula is removed in target design. |
| Custom endpoint zero pricing | No | Pass | Pass | Existing behavior is rejected, not wrapped. |
| Token Meter labels | No | Pass | Pass | Ambiguous labels are replaced. |
| Raw events UI | No | Pass | Pass | Count survives only as explained details if shown. |
| Historical ledger rows | Yes, data must still be readable | Pass | Pass | Historical rows without semantics are safely unknown/partial, not guessed. |

## Migration / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Domain structures and normalizers | Pass | Pass | Pass | Pass |
| Component basis before delta/pricing | Pass | Pass | Pass | Pass |
| Pricing policy and calculator refactor | Pass | Pass | Pass | Pass |
| Persistence migration and historical rows | Pass | Pass | Pass | Pass |
| Ledger/API/frontend expansion | Pass | Pass | Pass | Pass |
| UI redesign and visual validation | Pass | Pass | Pass | Pass |
| Tests/docs/provider audit | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Anthropic additive input | Yes | Pass | Pass | Pass | Good/bad formula examples are concrete. |
| OpenAI-compatible gross input | Yes | Pass | Pass | Pass | Prevents double counting. |
| xAI/Grok reasoning | Yes | Pass | Pass | Pass | Clarifies billable output. |
| Gemini thoughts-only | Yes | Pass | Pass | Pass | Clarifies fallback. |
| Token Meter approved hierarchy | Yes | Pass | Pass | Pass | User-approved UI example is explicit. |
| Current prompt/context statistic | Yes | Pass | Pass | Pass | Clear example excludes compaction decision text. |
| Usage reports label | Yes | Pass | Pass | Pass | Replaces raw events. |

## Missing Use Cases / Open Unknowns

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| Mistral and MiniMax live probes | User explicitly excluded live probes; pricing still must be safe. | Implement docs/catalog-safe status handling; do not mark live-confirmed. | Residual risk, not blocker. |
| Provider pricing/catalog freshness | Pricing pages and model tiers can change. | Record source/date metadata and use missing/partial where untrusted. | Residual risk, not blocker. |
| Historical rows without semantic fields | Old rows cannot always be exactly reinterpreted. | Mark unknown/partial unless safe inference exists; no legacy flat formula for new calculations. | Residual risk, not blocker. |
| Frontend layout density | More information can crowd the panel. | REQ-031 running-app visual validation and iteration is required. | Covered. |

## Review Decision

Pass: the design is ready for implementation.

## Findings

None.

## Classification

N/A — no blocking findings.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- Pricing catalog freshness remains an ongoing maintenance risk; implementation should preserve source/date metadata and conservative missing/partial statuses.
- Mixed provider/model/currency summaries require careful implementation so token totals remain visible while monetary totals are not falsely summed.
- The `effectiveContextWindowTokens` denominator must remain the effective total context window, not input budget after reservations or compaction trigger threshold.
- Running-app Token Meter visual QA is mandatory because this is a dense UI change; unit tests alone are insufficient.

## Latest Authoritative Result

- Review Decision: Pass
- Notes: Design has clear spines, ownership, reusable structures, removal plan, migration sequence, provider policy decisions, current-context refinement, approved UI hierarchy, and implementation-time visual validation requirement. Proceed to implementation.
