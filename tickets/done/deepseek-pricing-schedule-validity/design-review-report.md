# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/home/autobyteus/workspace/autobyteus-workspace-deepseek-pricing-schedule-validity/tickets/in-progress/deepseek-pricing-schedule-validity/requirements.md`
- Upstream Investigation Notes: `/home/autobyteus/workspace/autobyteus-workspace-deepseek-pricing-schedule-validity/tickets/in-progress/deepseek-pricing-schedule-validity/investigation-notes.md`
- Reviewed Design Spec: `/home/autobyteus/workspace/autobyteus-workspace-deepseek-pricing-schedule-validity/tickets/in-progress/deepseek-pricing-schedule-validity/design-spec.md`
- Supplemental Task Artifacts Reviewed: None.
- Solution Revision Record Reviewed: `/home/autobyteus/workspace/autobyteus-workspace-deepseek-pricing-schedule-validity/tickets/in-progress/deepseek-pricing-schedule-validity/solution-revision-record.md`
- Relevant Solution Revision IDs: `SR-001`
- Architecture Review Revision Record: `/home/autobyteus/workspace/autobyteus-workspace-deepseek-pricing-schedule-validity/tickets/in-progress/deepseek-pricing-schedule-validity/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-001`
- Current Review Round: 1
- Trigger: Initial solution package submitted by `/solution_designer` for pre-implementation review.
- Prior Review Round Reviewed: None.
- Latest Authoritative Round: 1
- Current-State Evidence Basis: Approved requirements and investigation evidence; source at `fd9b33e20ace3e7c221f931dbbcd5f4acf1df65f`; direct reads of the current catalog/config/factory, server provider/calculator, event enrichment, accumulator/fold, analytics projection, policy snapshot, tests, and durable pricing contract; repository history at the parent of `115dcd7d06df03c35e37381f289e5959704470f2`; and an independently rerun focused provider test on 2026-08-27 (`7/7` passing), which confirms the stale pre-cutover expectations documented upstream.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status (`Confirmed`/`Contradicted`/`Blocked`): `Confirmed`
- Approved requirements / intended behavior understood: Yes. The approved change is bounded to known DeepSeek V4 effective-dated history, configured weekday/calendar evaluation, provenance, stale coverage removal, and durable contract alignment.
- Relevant existing behavior and evidence confirmed: Yes. Current code carries one schedule through `TokenPricingConfig -> ModelPricingInfo`, selects only by UTC minute inside `TokenPriceConfigProvider`, applies policy through `TokenCostCalculator`, and persists resulting policy/cost snapshots through the accumulator/projection path. Repository history independently retains the prior flat Flash and Pro rates.
- Scope guardrail confirmed (`In-Scope Use Cases` / `Out of Scope` / `Preserved Behavior Boundary` / `Review Authority`): Yes; UC-001–UC-005, the explicit exclusions, BEH-003/non-DeepSeek preservation, REQ-010 no-rewrite boundary, and review authority are coherent.
- Approved change, preserved behavior, and outside scope understood: Yes. Remote catalog refresh and repair of already-persisted bug-affected aggregates remain outside scope and do not drive this design.
- Every prospective blocking `Design Impact` finding is traceable to an approved requirement, acceptance criterion, or preserved-behavior ID (`Yes`/`No`): `Yes`; no blocking finding remains.
- Remaining material ambiguity, if any: None.

| Behavior ID | Kind | Design Alignment With Approved Intent (`Pass`/`Fail`) | Approved Trigger / Contract And Current-State Evidence (`Pass`/`Fail`/`Unclear`) | Target Outcome / Path / Spine Coherence (`Pass`/`Fail`/`Unclear`) | Status (`Confirmed`/`Needs Correction`/`Unclear`) | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `BEH-001` | Contract | Pass | Pass — supported DeepSeek observation reaches the current minute-only selector through enrichment or accumulation. | Pass — DS-001/DS-004 select a data-owned eligible version, ISO day, timezone, and half-open period. | Confirmed | None. |
| `BEH-002` | Contract | Pass | Pass — the same supported path carries historical `observed_at`; current `effectiveFrom` is not consulted. | Pass — the unbounded flat, daily, and weekday-only versions are selected by maximum eligible effective instant independently of declaration order. | Confirmed | None. |
| `BEH-003` | Contract | Pass | Pass — current provider returns `pricing_schedule_time_invalid` for an invalid scheduled timestamp. | Pass — DS-004 returns invalid-time failure and the provider retains the current missing-policy result without a price fallback. | Confirmed | None. |
| `BEH-004` | Contract | Pass | Pass — selected schedule metadata currently enters `ResolvedTokenPricingPolicy`, the policy key, and `pricing_snapshot_json`. | Pass — selected version/period identity plus separate window and peak-day calendar provenance are explicit. | Confirmed | None. |
| `BEH-005` | System | Pass | Pass — current event/accumulator writers persist resolved outcomes and current dashboard/statistics readers consume stored aggregates without catalog lookup. | Pass — DS-002/DS-003 preserve old records and apply the corrected policy only while processing new observations/replays. | Confirmed | None. |

## Supplemental Artifact Coherence Verdict

None. The investigation notes contain the canonical supplement inventory and explicitly state that the external vectors are evidence rather than a repository-owned supplemental artifact.

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Design spec identifies a bounded bug fix plus behavior change and addresses current structure, target response, and deferrals. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | `Missing Invariant` is supported by ignored `effectiveFrom`; `Shared Structure Looseness` is supported by the literal singular schedule without history or weekday/calendar axes. | None. |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | `Refactor needed now: Yes`; remote refresh and existing-record repair are explicitly deferred. | None. |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | The discriminated shared history, clean-cut transport change, bounded selector extraction, file mapping, removal list, and sequence implement the stated bounded refactor without changing the healthy catalog/factory/provider/calculator chain. | None. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `DS-001` | Observation to enriched cost/policy | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-002` | Enriched observation to persisted run/analytics state | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| `DS-003` | Resolved/missing return and stored-query projection | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-004` | Provider-owned local history selector | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Catalog/model pricing | Pass | Pass | Pass | Pass | Server continues to use `LLMFactory.getModelPricingInfo`, not built-in DeepSeek definitions. |
| Server pricing policy | Pass | Pass | Pass | Pass | `TokenPriceConfigProvider.resolvePolicy` remains authoritative; the pure selector is an internal mechanism and the calculator receives only resolved policy. |
| Token-usage persistence/query | Pass | Pass | Pass | Pass | Writers store selected outcomes; query providers do not bypass stored state to consult current catalog history. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Shared catalog/config/factory | Pass | Pass | Pass | Pass | Owns types and DeepSeek facts; does not depend on server evaluation. |
| Server selector/provider | Pass | Pass | Pass | Pass | May consume shared history types and factory output; may not import built-in definitions or provider IDs. |
| Calculator | Pass | Pass | Pass | Pass | Depends on resolved policy, with no history/provider/calendar branch. |
| Persistence/query | Pass | Pass | Pass | Pass | Depends on enriched outcomes only; current-history repricing is explicitly forbidden. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `LLMFactory.getModelPricingInfo(input)` | Pass | Pass | Pass | Low | Pass |
| `selectTokenPricingSchedulePeriod(history, observedAt)` | Pass | Pass | Pass | Low | Pass |
| `TokenPriceConfigProvider.resolvePolicy(payload)` | Pass | Pass | Pass | Low | Pass |
| `TokenPricingConfig.fromDict/toDict` | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Pricing facts/history | Pass | Pass | N/A | Pass | Extend the existing `autobyteus-ts` catalog owner. |
| Observation-time policy | Pass | Pass | N/A | Pass | Extend the existing server pricing subsystem/provider. |
| Temporal/calendar evaluation | Pass | Pass | Pass | Pass | One pure file is proportionate and directly supports AC-007 without creating a new service. |
| Cost arithmetic and tiers | Pass | Pass | N/A | Pass | Reuse `TokenCostCalculator` unchanged. |
| Persisted results/query | Pass | Pass | N/A | Pass | Existing storage/projection paths remain authoritative. |
| Remote freshness | Pass | Pass | N/A | Pass | Correctly deferred rather than partially implemented in the observation path. |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts` LLM pricing/config | Pass | Pass | Pass | Pass | Owns canonical data, serialization, factory projection, and built-in facts. |
| Server token-usage pricing | Pass | Pass | Pass | Pass | Owns evaluation, resolved-policy mapping, and unchanged arithmetic. |
| Server persistence/projection | Pass | Pass | Pass | Pass | Reused without history interpretation or schema work. |
| Durable pricing contract | Pass | Pass | Pass | Pass | Existing authoritative document is the correct update target. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Fixed/time-window versions and periods | Pass | Pass | Pass | Pass | One canonical type family replaces the singular schedule. |
| Shared DeepSeek rule versions across Flash/Pro | Pass | Pass | Pass | Pass | Catalog creator shares rules/cutovers while accepting model-specific rates. |
| Calendar coordinate evaluation | Pass | Pass | Pass | Pass | Selector-owned, not promoted into an unrelated global timezone utility. |
| Trusted pricing dimensions | Pass | Pass | Pass | Pass | Reuses the existing supported dimension shape. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `TokenPricingScheduleHistory` | Pass | Pass | Pass | Pass | Sole scheduled-policy representation; declaration order is non-authoritative. |
| `TokenPricingFixedSchedule` | Pass | Pass | Pass | Pass | Carries only identity/effective/flat period; no meaningless window/calendar fields. |
| `TokenPricingTimeWindowSchedule` | Pass | Pass | Pass | Pass | Window clock, peak-day set, calendar timezone, windows/default, and periods are mandatory and distinct. |
| Current flat catalog summary plus history | Pass | Pass | Pass | Pass | Summary remains for generic current catalog consumers; non-empty history is authoritative for observation pricing and cannot fall back to summary values. |
| Resolved selected provenance | Pass | Pass | Pass | N/A | Stores the selected outcome only; fixed-version window/day provenance is explicitly `null`. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/llm/utils/token-pricing-schedule.ts` | Pass | Pass | Pass | Pass | Canonical types and compact DeepSeek static-history construction cohere at current scale. |
| `autobyteus-ts/src/llm/utils/llm-config.ts` | Pass | Pass | Pass | Pass | Plural history lifecycle/serialization only. |
| `autobyteus-ts/src/llm/model-pricing-types.ts` | Pass | Pass | Pass | Pass | Public factory result contract only. |
| `autobyteus-ts/src/llm/llm-model-pricing.ts` | Pass | Pass | Pass | Pass | Factory projection only. |
| `autobyteus-ts/src/llm/supported-model-definitions.ts` | Pass | Pass | Pass | Pass | Model-specific rate facts and history attachment. |
| `autobyteus-server-ts/src/token-usage/pricing/token-pricing-schedule-selector.ts` | Pass | Pass | Pass | Pass | Pure effective/date/calendar/period selection. |
| `autobyteus-server-ts/src/token-usage/pricing/token-price-config-provider.ts` | Pass | Pass | Pass | Pass | Lookup/selection sequencing and resolved-policy mapping. |
| `autobyteus-server-ts/src/token-usage/pricing/token-pricing-policy.ts` | Pass | Pass | Pass | Pass | Resolved selected-policy contract. |
| Focused catalog/selector/provider tests | Pass | Pass | N/A | Pass | Responsibilities are divided by catalog facts, pure invariants, and boundary mapping. |
| `provider-error-and-pricing-contract.md` | Pass | Pass | N/A | Pass | Existing durable pricing contract is updated rather than duplicated. |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/llm/utils/token-pricing-schedule.ts` | Pass | Pass | Low | Pass | Extends the existing shared pricing/config value-object location. |
| `autobyteus-ts/src/llm/utils/llm-config.ts` | Pass | Pass | Low | Pass | Existing config serialization owner. |
| `autobyteus-ts/src/llm/model-pricing-types.ts` / `llm-model-pricing.ts` | Pass | Pass | Low | Pass | Existing factory contract/projection depth. |
| `autobyteus-ts/src/llm/supported-model-definitions.ts` | Pass | Pass | Low | Pass | Existing catalog facts owner. |
| `autobyteus-server-ts/src/token-usage/pricing/token-pricing-schedule-selector.ts` | Pass | Pass | Low | Pass | Beside its provider owner; a new module/service layer would over-split the bounded concern. |
| Existing server pricing files/tests | Pass | Pass | Low | Pass | Compact folder remains coherent with distinct file responsibilities. |
| `provider-error-and-pricing-contract.md` | Pass | Pass | Low | Pass | Existing root durable contract remains canonical. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Singular config/serialized schedule fields | Pass | Pass | Pass | Pass | Plural history replaces both camel/snake fields cleanly. |
| Singular `ModelPricingInfo` field | Pass | Pass | Pass | Pass | Replaced by plural history/empty history. |
| One-version literal type/creator | Pass | Pass | Pass | Pass | Replaced by discriminated history types/creator. |
| Embedded private selector | Pass | Pass | Pass | Pass | Replaced by provider-owned pure selector. |
| Ambiguous timezone provenance | Pass | Pass | Pass | Pass | Replaced for new snapshots by explicit window/day fields; stored JSON is untouched. |
| Stale pre-effective tests | Pass | Pass | Pass | Pass | Replacement scenarios and AC-012 are explicit. |
| Obsolete durable no-history claims | Pass | Pass | Pass | Pass | Existing contract update is explicitly sequenced. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| Singular schedule transport | No | Pass | Pass | No dual field or singular-to-history normalization. |
| Base-price fallback for history | No | Pass | Pass | Explicit unbounded flat version replaces fallback. |
| Provider-specific weekend branch | No | Pass | Pass | Days/timezone remain data-owned. |
| Old provenance alias in new snapshots | No | Pass | Pass | Old opaque snapshots remain untouched, not runtime-compatible aliases. |
| Read-time old-record repricing | No | Pass | Pass | Explicitly rejected. |
| Old stale test/doc contract | No | Pass | Pass | Removed/replaced in this change. |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? (`Pass`/`Fail`) | Direct Use, Rebuild, Or Migration Choice Is Proportionate? (`Pass`/`Fail`) | Migration Safety Is Complete If Required? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Existing cumulative run records, analytics facets, and legacy snapshot JSON | `Not Affected` | Pass | Pass | N/A | Pass | Current readers consume stored totals/opaque keys and do not decode the static schedule or re-resolve pricing. Existing records remain byte-for-byte. New snapshots may use the new selected provenance without a schema migration. |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Shared history through server selector/policy/tests/docs | Pass | Pass — no temporary dual shape is required because the shared package and server are changed together. | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Discriminated history shape | Yes | Pass | Pass | Pass | Illustrates fixed versus time-window versions and all three DeepSeek versions. |
| Version selection | Yes | Pass | Pass | Pass | Maximum eligible date contrasts with order/current-time selection. |
| Separate calendar/window axes | Yes | Pass | Pass | Pass | Concrete example prevents UTC-day or hard-coded-weekend implementation. |
| Provider boundary | Yes | Pass | Pass | Pass | Contrasts provider-owned selector with calculator/provider-ID branching. |
| Current summary versus history | Yes | Pass | Pass | Pass | Explicitly forbids pre-history fallback to current summary values. |

## Material Premise Validation (Only When Needed)

None. No review finding or in-scope recovery/lifecycle mechanism depends on an assumed production scenario outside BEH-001–BEH-005. Remote vendor changes and already-persisted incorrect outcomes are established residual risks but explicitly excluded from this design; they do not drive hidden refresh, migration, or read-time recovery machinery.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Pass` — the approved behavior basis is confirmed, the data-flow spines and authoritative boundaries are coherent, the clean-cut history transition is actionable in the current codebase, and the persisted-data/no-rewrite decision is evidence-backed.

## Findings

None.

## Classification

N/A — no failing finding.

## Recommended Recipient

`/implementation_engineer`

## Residual Risks

- Static catalog freshness remains release-bound; future vendor changes still require a separately designed trusted refresh/distribution mechanism or an application release.
- Existing records created under the defective selector remain unchanged and may retain wrong historical/weekend costs; the approved scope does not authorize lossy aggregate rerating.
- Historical cutover facts no longer fully exposed by the live vendor page continue to rely on repository history plus the dated CC0/source evidence recorded upstream.
- Implementation must keep empty/no-history distinct from a non-empty scheduled history so preserved non-DeepSeek resolution does not enter the selector; the design's preservation rules and focused regression plan already establish this invariant.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate (`Pass`/`Fail`/`Blocked`): `Pass`
- Notes: `ARCH-REV-001` is the initial authoritative architecture-review result for `SR-001`. Implementation may proceed from the cumulative reviewed package.
