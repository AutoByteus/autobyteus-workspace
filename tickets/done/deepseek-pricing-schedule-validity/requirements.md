# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

`Design-ready` — approved by the user on 2026-08-27 for solution design and implementation of the bounded effective-dated schedule fix.

## Goal / Problem Statement

Make DeepSeek V4 token-cost policy resolution historically and calendrically correct. The resolver must select the pricing rule version effective at the usage observation instant, apply peak windows only on the configured ISO weekdays evaluated in the vendor's configured calendar timezone, and retain accurate selected-policy provenance.

The report identifies two real defects, but one impact statement needs correction: applying the current off-peak rate to July usage does not understate the old flat rate by half. Repository history and the vendor's pre-cutover rate card show that the old flat rates were lower than both new time-of-use tiers. The correctness requirement is therefore to restore the actual prior flat rate, not to substitute the later peak rate.

## Current And Desired Behavior (Mandatory)

| Behavior ID | Current Behavior | Desired Behavior | Preserved / Unchanged Behavior | Related Requirement / Acceptance-Criteria IDs |
| --- | --- | --- | --- | --- |
| BEH-001 | For any valid `observed_at`, the single DeepSeek schedule selects by UTC minute-of-day only. A Saturday or Sunday inside either peak window is priced `peak`. | After the weekend-rule cutover, peak windows apply only Monday through Friday as evaluated in the configured `Asia/Shanghai` calendar; weekends resolve `off_peak`. | Published UTC half-open windows and current rate values remain unchanged. | REQ-001–REQ-004, REQ-007; AC-001–AC-003, AC-006–AC-007 |
| BEH-002 | `effectiveFrom` is returned as policy metadata but never gates selection. Instants before the first time-of-use schedule and instants before the weekend-rule revision are all evaluated by the one current schedule. | Resolve the latest pricing rule version whose effective instant is not after `observed_at`, including the pre-time-of-use flat rule, the daily-window rule, and the later weekday-only rule. | Exact cutover instants remain `2026-08-16T16:00:00Z` and `2026-08-22T16:00:00Z`; schedule selection remains deterministic from `observed_at`, not wall-clock "now". | REQ-001, REQ-005–REQ-007; AC-003–AC-005 |
| BEH-003 | An invalid scheduled timestamp yields a missing pricing policy with `pricing_schedule_time_invalid` rather than guessing. | Preserve the fail-closed invalid-timestamp behavior across version selection and period selection. | No fallback to current prices for an invalid observation timestamp. | REQ-008; AC-008 |
| BEH-004 | Selected schedule ID, period ID, effective instant, and the UTC window timezone are carried in the resolved policy and policy key. The calendar-day timezone is not representable or recorded. | The resolved policy and persisted pricing snapshot identify the actual selected version and period and record enough timezone provenance to distinguish the UTC window clock from the calendar-day clock. | Existing price/cost computation and the policy-key identity role remain unchanged. | REQ-009; AC-009 |
| BEH-005 | Token-usage dashboards read stored cumulative run and analytics costs; they do not re-resolve current catalog pricing on query. Policy resolution happens when an observation is enriched or accumulated. | Newly processed observations, including supported replays carrying historical `observed_at` values, use the corrected policy. Existing stored snapshots/aggregates are not silently rewritten by this change. | Snapshot-based accounting remains immutable; no read-time repricing is introduced. | REQ-010; AC-010–AC-011 |

## Investigation Findings

- The report is reproducible on the current `personal` branch. `2026-08-29T02:00:00Z` resolves `peak`, and `2026-07-15T12:00:00Z` resolves the later schedule's `off_peak` tier while reporting `effectiveFrom=2026-08-16T16:00:00Z`.
- Current unit coverage explicitly expects schedule selection for 2025 and January 2026, dates before the schedule's effective instant. That test currently protects the defect and must be replaced, not merely supplemented.
- The shared schedule type is a DeepSeek-specific literal containing one schedule ID, one effective instant, two UTC windows, and no weekday dimension. `TokenPricingConfig` and `ModelPricingInfo` also expose only one schedule, so a second effective-dated rule version cannot currently be represented.
- DeepSeek's current official pricing page confirms the two UTC windows, Monday-through-Friday applicability, and current rates. The dated CC0 vectors retain the weekend announcement effective at `2026-08-22T16:00:00Z` and identify `Asia/Shanghai` as the calendar timezone.
- Repository history and the official pre-cutover rate-card capture establish the prior flat prices: Flash cache/input/output `$0.0028/$0.14/$0.28`; Pro `$0.003625/$0.435/$0.87` per million tokens. These—not a later peak rate—apply before `2026-08-16T16:00:00Z`.
- The two timezone-disagreement instants at `16:30Z` cannot distinguish the correct day calendar under DeepSeek's live windows because they lie outside those windows. A parameterized synthetic window is required to prove that selection reads the configured timezone and configured day set instead of hard-coding weekends or using UTC day.
- Pricing output is persisted into compact cumulative run and analytics records. Ordinary dashboard reads aggregate those stored costs; they do not call `TokenPriceConfigProvider`. Existing bug-affected records therefore require a separate explicit correction policy, and current compacted run records do not retain enough per-observation allocation to guarantee a general lossless rerating.

## Relevant Supplemental Task Artifacts

None. External vectors remain evidence, not an authoritative repository supplement; exact sources and relevant rows are retained in the investigation notes.

## Design Health Assessment (Mandatory)

- Change posture: `Bug Fix` plus `Behavior Change`
- Initial design issue signal: `Yes`
- Root cause classification: `Missing Invariant` and `Shared Structure Looseness`
- Refactor posture: `Likely Needed`
- Evidence basis: The shared shape encodes one current schedule as literal types, cannot represent rule history or weekday/calendar axes, and permits an effective instant that the selecting consumer ignores. The selector is a private function embedded in policy mapping, which prevents direct parameterized coverage of the calendar-timezone axis.
- Requirement or scope impact: Replace the single-schedule representation with a clean effective-dated history shape, move/retain schedule evaluation behind one testable pricing owner, and update policy projection. Do not refactor unrelated provider pricing or token-cost arithmetic.

## Recommendations

1. Treat pricing history as ordered-by-effective-instant data and choose the maximum eligible version; do not infer correctness from array order or from the current wall clock.
2. Keep current provider facts in the shared pricing catalog and generic selection in the server pricing subsystem. Do not add a DeepSeek model-name branch to the calculator.
3. Make peak weekdays explicit ISO values and make their IANA calendar timezone explicit. Do not default absent fields to Monday–Friday or hard-code Saturday/Sunday in selection code.
4. Represent the prior flat policy as part of the same selectable history, so pre-cutover observations resolve actual old prices rather than current defaults or `missing`.
5. Extract or expose the bounded schedule-selection concern sufficiently for synthetic parameterized tests to prove both configured weekday and timezone behavior.
6. Preserve immutable stored snapshots in this ticket. If correcting already-persisted bug-affected records is wanted, authorize a separate data-repair investigation with explicit acceptable-loss and source-recovery rules.
7. Update `provider-error-and-pricing-contract.md`; it currently states that no historical collection or date-based selection exists, which this bug fix intentionally supersedes.

## Scope Classification (`Small`/`Medium`/`Large`)

`Medium` — the runtime change is bounded to shared pricing data, schedule selection, policy provenance, tests, and one durable contract document, but the fix requires a clean model evolution rather than a one-line conditional.

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

- **UC-001:** Resolve a DeepSeek V4 observation on or after the weekend-rule cutover using the configured vendor calendar weekdays and timezone.
- **UC-002:** Resolve a DeepSeek V4 observation between the time-of-use cutover and the weekend-rule cutover using the original daily peak windows.
- **UC-003:** Resolve a DeepSeek V4 observation before the time-of-use cutover using the prior flat rate card.
- **UC-004:** Reject an invalid DeepSeek pricing observation timestamp without guessing a price.
- **UC-005:** Persist explainable identity/provenance for the selected DeepSeek pricing version and period.

### Out of Scope

- Repricing or mutating already-persisted token-usage run records, analytics facets, legacy ledger rows, or archived snapshots.
- Adding a read-time dashboard repricing path, a user-facing pricing editor, next-boundary/countdown behavior, provider billing reconciliation, or remote vendor-price fetching.
- General historical price catalogs for providers other than the two built-in DeepSeek V4 models.
- Changing DeepSeek model identity, endpoints, token accounting, cache categorization, currency, rates after the stated 2026 cutovers, or the token-cost formula.
- Fixing the test-only `TokenUsageTracker`, which has no supported production caller and separately uses flat config values.
- Retaining the old singular schedule contract through a compatibility wrapper or dual-read path.

### Preserved Behavior Boundary

- Preserve BEH-003 and the non-DeepSeek policy paths.
- Preserve the exact half-open UTC windows, current DeepSeek rates, trusted dimensions, generic tier selection, cost arithmetic, local-runtime zero-bill policy, and missing-model behavior.
- Preserve stored snapshot immutability per BEH-005/REQ-010; the corrected selector applies at observation processing time only.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, or operational contract is a `Requirement Gap`; it must return for explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or separate-ticket candidate. It must not be treated as a required design correction.
- A downstream reviewer comment does not amend this requirements basis. The solution designer must update the canonical requirements and obtain renewed user approval before a scope-changing proposal can govern design or implementation.

## Functional Requirements

- **REQ-001 — Effective-dated history:** DeepSeek pricing resolution must select the latest pricing rule version whose effective instant is less than or equal to the valid `observed_at`. Selection must be based on `observed_at`, not process time, and deterministic independently of declaration order.
- **REQ-002 — Data-owned peak days:** A time-of-use version must explicitly declare the ISO weekdays on which peak windows can apply. Selection code must consume that declaration and must not infer or hard-code Monday–Friday.
- **REQ-003 — Data-owned calendar timezone:** The weekday must be evaluated in the version's declared IANA calendar timezone. For the current weekend-aware DeepSeek rule, it is `Asia/Shanghai`; UTC day and user/local machine time are not substitutes.
- **REQ-004 — Current weekday-only rule:** At and after `2026-08-22T16:00:00Z`, DeepSeek V4 peak windows apply only on ISO weekdays 1–5 in the `Asia/Shanghai` calendar; all other instants use `off_peak`.
- **REQ-005 — Original daily rule:** From `2026-08-16T16:00:00Z` up to but excluding `2026-08-22T16:00:00Z`, both published UTC peak windows apply every calendar day, including weekends.
- **REQ-006 — Prior flat rule:** Before `2026-08-16T16:00:00Z`, Flash must use cache-hit/input/output rates `$0.0028/$0.14/$0.28`, and Pro must use `$0.003625/$0.435/$0.87`, with trusted USD pricing and no peak/off-peak period substitution.
- **REQ-007 — Window semantics and current rates:** Preserve half-open UTC peak windows `[01:00,04:00)` and `[06:00,10:00)`. Current Flash off-peak/peak cache-input/output triples remain `$0.007/$0.22/$0.66` and `$0.014/$0.44/$1.32`; Pro remains `$0.022/$0.66/$1.98` and `$0.044/$1.32/$3.96`.
- **REQ-008 — Invalid timestamps fail closed:** An invalid `observed_at` must produce missing pricing with reason `pricing_schedule_time_invalid`, null scheduled prices, untrusted scheduled dimensions, and no selected schedule period.
- **REQ-009 — Selected-policy provenance:** A successfully resolved scheduled policy must carry the selected version ID, period ID, effective instant, UTC window timezone, configured peak weekdays, and configured weekday-calendar timezone in its pricing snapshot/provenance. The pricing policy key must distinguish versions and periods.
- **REQ-010 — Stored snapshot immutability:** Apply corrected resolution to newly processed observations and supported replays. Do not mutate or recalculate already-persisted cost snapshots/aggregates or introduce read-time repricing.
- **REQ-011 — Provider-neutral ownership:** Shared pricing data must express the rule; server selection must remain model/provider-neutral over that data. No DeepSeek identifier branch or hard-coded weekend rule may be introduced into `TokenCostCalculator` or dashboard readers.
- **REQ-012 — Contract alignment:** Update the active provider/pricing contract to describe effective-dated history, weekday/timezone selection, prior flat rates, and immutable existing snapshots; remove its now-obsolete claim that historical/date-based selection is intentionally absent.

## Acceptance Criteria

- **AC-001 — Post-cutover weekend:** `2026-08-29T02:00:00Z` resolves `off_peak`; DeepSeek V4 Pro output is `$1.98` per million, not `$3.96`.
- **AC-002 — Post-cutover weekday:** `2026-08-26T02:00:00Z` resolves `peak`; DeepSeek V4 Pro output is `$3.96` per million.
- **AC-003 — Weekend rule is not retroactive:** `2026-08-22T01:30:00Z` and `2026-08-22T09:59:59Z` resolve `peak` under the original daily version, while `2026-08-23T01:30:00Z` resolves `off_peak` under the weekday-only version. The selected version changes exactly at `2026-08-22T16:00:00Z`, even when the period on both sides is `off_peak`.
- **AC-004 — Time-of-use rule is not retroactive:** `2026-07-15T12:00:00Z` and `2026-08-16T15:59:59.999Z` resolve the prior flat rule. Flash returns `$0.0028/$0.14/$0.28`; Pro returns `$0.003625/$0.435/$0.87` for cache hit/input/output.
- **AC-005 — Initial cutover boundary:** At exactly `2026-08-16T16:00:00Z`, resolution changes from the prior flat version to the initial time-of-use version and returns that version's current off-peak prices for the instant.
- **AC-006 — Window boundaries:** On an eligible weekday, `01:00` and `06:00` UTC are peak starts; `04:00` and `10:00` UTC are off-peak starts. The gap `[04:00,06:00)` remains off-peak.
- **AC-007 — Configured calendar axis is proved:** With a synthetic parameterized schedule whose window includes `16:30Z`, `2026-08-28T16:30:00Z` is off-peak because Shanghai is Saturday and `2026-08-30T16:30:00Z` is peak because Shanghai is Monday. Expanding the same schedule's configured peak days to include Saturday flips the first result to peak, proving both timezone and day-set fields are consumed.
- **AC-008 — Invalid timestamp:** `not-a-timestamp` returns `pricing_status=missing`, `missing_reason=pricing_schedule_time_invalid`, null scheduled prices, and no selected period.
- **AC-009 — Explainability:** For AC-001–AC-005, the resolved policy key and pricing snapshot identify the actually selected rule version and period and expose both the UTC window clock and the weekday-calendar timezone/day set.
- **AC-010 — End-to-end observation path:** A supported token-usage observation processed through the existing event/accumulator path uses its `observed_at`, persists the selected version/period policy identity, and computes cost from the selected rates without a dashboard-time catalog lookup.
- **AC-011 — Preserved behavior:** Focused regression coverage shows non-DeepSeek catalog policy resolution, local-runtime zero billing, generic token-cost arithmetic/tier behavior, and invalid/missing pricing behavior remain unchanged.
- **AC-012 — Stale test removal:** No durable test continues to expect the 2026-08-17 schedule for 2025, January 2026, or any other pre-cutover instant.

## Constraints / Dependencies

- Runtime Node/ICU must support `Intl.DateTimeFormat` with IANA zone `Asia/Shanghai`; the investigated Node 22.23.1 / ICU 78.2 environment does.
- `observed_at` remains the authoritative event instant supplied to the pricing resolver.
- The source rate values and cutovers are static catalog data; runtime must not depend on external HTTP availability.
- Clean-cut model evolution is required: no singular-schedule compatibility field, dual reader, or fallback branch retained solely for the old internal shape.
- The external CC0 vectors are useful evidence, but repository-owned tests must be durable and self-contained rather than fetching them at test runtime.

## Persisted Data Outcome (When Applicable)

- Stored subject / location: Token-usage cumulative run records and analytics facets in SQLite; legacy ledger rows may also retain pricing snapshots.
- Required outcome: `Not Affected`
- Existing data to preserve, discard/rebuild, transform, or quarantine: Preserve all existing stored price/cost snapshots and aggregates byte-for-byte; do not transform them in this change.
- Unacceptable data loss or corruption: Any silent rewrite, destructive rerating, or recomputation that cannot reproduce each original observation's token allocation and selected policy.
- Relevant availability, maintenance-window, or rollout constraints: No migration or maintenance window. Corrected selection applies only as observations are processed after deployment.
- Related requirement and acceptance-criteria IDs: REQ-010; AC-010–AC-011.

## Assumptions

- The issue author's dated copy of DeepSeek's weekend announcement and CC0 vector set accurately preserve the `2026-08-22T16:00:00Z` weekend-rule cutover, which is no longer shown on the steady-state vendor page.
- Repository history accurately preserves the built-in pre-cutover flat rates already used by AutoByteus before the 2026-08-17 catalog update.
- No supported product surface persists or edits `pricing_schedule` independently of the built-in model catalog; investigation found only static catalog construction and transient config serialization.

## Risks / Open Questions

- **Approved boundary:** This requirements basis excludes repair of already-persisted bug-affected records; requesting historical data correction requires a separate requirement and investigation.
- **Freshness follow-up:** The user identified the broader risk that an installed application may lag later provider pricing changes. This fix makes known rule versions additive and historically selectable but does not add remote catalog refresh, signatures, caching, or stale-status UX; those remain a linked larger requirement.
- The prior durable contract explicitly prohibited historical/date-based selection. This ticket reverses that choice for DeepSeek because the newly reported vendor rule version makes the single-current-schedule assumption incorrect.
- Existing records produced by releases `v1.4.55`–`v1.4.59` may retain incorrect weekend or replayed historical prices. The compact run record does not retain a lossless per-observation price allocation, so a general repair cannot be safely inferred from aggregate totals alone.
- The current live windows cannot expose the UTC-versus-Shanghai calendar bug at the two disagreement instants; omitting the synthetic parameterized selector coverage would leave that implementation error undetectable.

## Requirement-To-Use-Case Coverage

| Use Case | Covered Requirements |
| --- | --- |
| UC-001 | REQ-001–REQ-004, REQ-007, REQ-009, REQ-011 |
| UC-002 | REQ-001, REQ-005, REQ-007, REQ-009, REQ-011 |
| UC-003 | REQ-001, REQ-006, REQ-009–REQ-011 |
| UC-004 | REQ-008 |
| UC-005 | REQ-009–REQ-012 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion | Scenario Intent |
| --- | --- |
| AC-001–AC-002 | Distinguish post-cutover weekend from eligible weekday at the same peak-window time. |
| AC-003 | Prove the weekend restriction is effective-dated and not retroactive. |
| AC-004–AC-005 | Prove initial time-of-use pricing is effective-dated and restores actual old flat prices before cutover. |
| AC-006 | Preserve all half-open UTC window edges. |
| AC-007 | Mutation-resistant proof of configured weekday/timezone evaluation, independent of the live-window coincidence. |
| AC-008 | Preserve fail-closed invalid-time behavior. |
| AC-009 | Prove selected history is explainable and identity-distinct. |
| AC-010 | Prove the real observation-to-persistence path, not only a synthetic selector call. |
| AC-011 | Guard the preserved provider-neutral pricing boundary. |
| AC-012 | Remove executable expectations that canonize the defect. |

## Approval Status

Approved by the user on 2026-08-27 through an explicit go-ahead to fix the verified problem. The approved interpretation follows the recommended bounded scope presented immediately beforehand: correct known effective-dated pricing history and calendar selection now; do not rewrite existing stored costs; keep remote pricing-catalog refresh/freshness infrastructure as a linked follow-up rather than expanding this fix.
