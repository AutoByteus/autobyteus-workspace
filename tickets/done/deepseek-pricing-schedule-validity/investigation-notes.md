# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete; dedicated ticket worktree created from refreshed `origin/personal`.
- Current Status: Requirements approved and the initial solution package completed on 2026-08-27; pending architecture review.
- Investigation Goal: Verify issue #2, trace the supported pricing path, establish vendor/history semantics, assess storage consequences, and produce a design-ready requirements basis.
- Scope Classification: `Medium`
- Scope Classification Rationale: The defect crosses a shared serialized pricing shape, built-in provider catalog data, server policy version/period selection, pricing provenance, stale unit coverage, durable documentation, and the observation-to-persistence path. It does not require a new public product surface or database schema.
- Scope Summary: Effective-dated DeepSeek V4 pricing history plus explicit weekday/calendar-timezone evaluation; no retroactive rewrite of stored costs.
- Primary Questions Resolved:
  1. Is the report reproducible? **Yes.**
  2. Can the current shared type express the rule/history? **No.**
  3. What are the correct cutovers/rates? **Prior flat -> daily time-of-use at `2026-08-16T16:00:00Z` -> weekday-only at `2026-08-22T16:00:00Z`.**
  4. Which calendar owns weekdays? **`Asia/Shanghai`; hours remain UTC.**
  5. Do dashboard reads reprice? **No; they aggregate stored results.**
  6. Is stored-data migration in scope/feasible? **No; no schema change is needed and general lossless aggregate rerating is not established.**

## Request Context

GitHub issue [AutoByteus/autobyteus-workspace#2](https://github.com/AutoByteus/autobyteus-workspace/issues/2) reports:

1. `TokenPricingSchedule` lacks a day-of-week axis, so the current minute-only selector applies peak rates during weekend window hours.
2. `effectiveFrom` is projected to policy output but never compared with `observedAt`, so the current time-of-use rule is applied to earlier observations.
3. The weekend restriction became effective at Beijing midnight on 2026-08-23 (`2026-08-22T16:00:00Z`) and should be a second effective-dated rule version.
4. Weekdays must be evaluated in the vendor calendar (`Asia/Shanghai`), separately from the UTC window clock.

The issue's mechanical diagnosis is accurate. Its statement that pre-August usage is "understated by half" is not. The prior flat price card was lower than the later off-peak card, so the current bug overstates those investigated historical prices. Correctness still requires effective-date enforcement and the actual prior flat rate.

## Environment Discovery / Bootstrap Context

- Project Type: `Git`
- Task Workspace Root: `/home/autobyteus/workspace/autobyteus-workspace-deepseek-pricing-schedule-validity`
- Task Artifact Folder: `/home/autobyteus/workspace/autobyteus-workspace-deepseek-pricing-schedule-validity/tickets/in-progress/deepseek-pricing-schedule-validity`
- Current Branch: `codex/deepseek-pricing-schedule-validity`
- Current Worktree / Working Directory: `/home/autobyteus/workspace/autobyteus-workspace-deepseek-pricing-schedule-validity`
- Bootstrap Base Branch: refreshed `origin/personal` at `fd9b33e20ace3e7c221f931dbbcd5f4acf1df65f`
- Remote Refresh Result: `git fetch origin --prune` succeeded on 2026-08-27; `origin/personal` advanced from `b52fe5aeb` to `fd9b33e20` before worktree creation.
- Task Branch: `codex/deepseek-pricing-schedule-validity`, tracking `origin/personal`
- Expected Base Branch: `origin/personal`
- Expected Finalization Target: `personal`
- Bootstrap Blockers: None.
- Notes For Downstream Agents: Use only this dedicated worktree for authoritative task artifacts and changes. Dependencies were installed with the pinned pnpm 10.28.2 via Corepack for focused investigation; generated untracked build outputs were removed after probing.

## Supplemental Task Artifact Inventory

None. The external CC0 vector repository is retained as a source, not copied into the task package.

## Source Log

| Date | Source Type | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-08-27 | Command | `git fetch origin --prune`; `git worktree add -b codex/deepseek-pricing-schedule-validity /home/autobyteus/workspace/autobyteus-workspace-deepseek-pricing-schedule-validity origin/personal` | Establish isolated, current ticket workspace. | Dedicated branch starts from refreshed `origin/personal` at `fd9b33e20`. | No |
| 2026-08-27 | Issue | `https://github.com/AutoByteus/autobyteus-workspace/issues/2` | Verify the pasted report and current issue state. | Open issue; no assignee, labels, linked PR, or visible comments. Body matches the user report. | No |
| 2026-08-27 | Spec/Web | `https://api-docs.deepseek.com/quick_start/pricing/` | Verify current vendor rule and rates. | Current page lists peak windows `01:00–04:00` and `06:00–10:00` UTC, Monday–Friday, with the exact Flash/Pro peak/off-peak rates in the requirements. | No |
| 2026-08-27 | Repo/Web | `https://github.com/xyzs996/deepseek-peak-offpeak-vectors` and raw `deepseek-peak-offpeak-vectors.json` / `check_vectors.py` | Check dated weekend cutover and mutation-resistant calendar cases. | CC0 source records announcement effective `2026-08-22T16:00:00Z`, ISO peak weekdays, `Asia/Shanghai` calendar timezone, pre-rule Saturday cases, synthetic timezone-disagreement schedule, and the config-mutation check. | No |
| 2026-08-27 | Web | Search: `site:api-docs.deepseek.com ... DeepSeek V4 pricing` and `DeepSeek V4 pricing August 17 2026 flat price off peak` | Recover the old official rate-card facts no longer present on the live page. | Indexed official-page capture lists old flat Flash `$0.0028/$0.14/$0.28`, Pro `$0.003625/$0.435/$0.87`, and announced daily Beijing peak windows before the effective date. Secondary dated articles corroborate the initial cutover. Repository history independently contains the same old values. | No |
| 2026-08-27 | Code | `autobyteus-ts/src/llm/utils/token-pricing-schedule.ts` | Verify representable schedule axes. | Literal one-ID/one-effective-date type; UTC minute windows only; no weekday or history collection. | No |
| 2026-08-27 | Code | `autobyteus-server-ts/src/token-usage/pricing/token-price-config-provider.ts` | Verify selection and policy projection. | `scheduleSelection` parses `observedAt`, reads UTC minute only, never checks `effectiveFrom`, and `toPolicy` projects `effectiveFrom`/schedule metadata after selection. | No |
| 2026-08-27 | Code | `autobyteus-ts/src/llm/utils/llm-config.ts`, `llm-model-pricing.ts`, `model-pricing-types.ts`, `supported-model-definitions.ts` | Trace shared schedule serialization/catalog projection. | Singular camel `pricingSchedule` / snake `pricing_schedule` flows from built-in config through `ModelPricingInfo`; flat fields carry current off-peak values. | No |
| 2026-08-27 | Doc | `provider-error-and-pricing-contract.md`, especially sections 3–4 | Check durable intended behavior. | Contract explicitly chose one current schedule, no historical collection/date selector, current flat fields as latest off-peak, and immutable old snapshots. Weekday rule changed after that design. This ticket must update the durable contract. | No |
| 2026-08-27 | Command | `git log`, `git blame`, and `git show` for commit `115dcd7d06df03c35e37381f289e5959704470f2` and its parent | Establish feature origin and prior values. | Schedule/selector introduced 2026-08-22. Parent catalog held the old flat Flash and Pro values. Current schedule feature is included in tags `v1.4.55`–`v1.4.59`. | No |
| 2026-08-27 | Test | `pnpm --filter autobyteus-server-ts test --run tests/unit/token-usage/pricing/token-price-config-provider.test.ts` | Verify current focused suite. | 7/7 passes. Two cases deliberately expect the 2026-08-17 schedule in 2025/January 2026, thereby protecting the effective-date defect. | Yes — replace stale cases downstream |
| 2026-08-27 | Probe | Temporary Vitest probe (removed after run): `pnpm --filter autobyteus-server-ts exec vitest --run tests/unit/token-usage/pricing/deepseek-pricing-investigation.tmp.test.ts --reporter=verbose` | Capture current output across cutovers/weekend. | July and pre-cutover instants return later off-peak values; post-rule weekend peak-window instants return peak. Exact result table is in Runtime / Probe Findings. | No |
| 2026-08-27 | Command | `rg -n "pricing_schedule|pricingSchedule|TokenPriceConfigProvider|resolvePolicy" ...` | Find all owners/callers and possible duplicated policy. | One active server selector; one shared catalog schedule; no second production weekday selector or dashboard-time reprice path. | No |
| 2026-08-27 | Code | Event enrichment, `TokenCostCalculator`, `TokenUsageRunAccumulator`, fold/state/projection files, Prisma schema | Trace production lifecycle and persisted consequences. | Resolver is called during observation enrichment/accumulation; selected costs/policy identity are accumulated into run and analytics storage. Query providers consume stored aggregates. | No |
| 2026-08-27 | Runtime | Node `Intl.DateTimeFormat` probe with `timeZone:'Asia/Shanghai'`; `node --version`; `process.versions.icu` | Verify IANA calendar capability. | Node 22.23.1 / ICU 78.2 maps `2026-08-28T16:30Z` to Shanghai Saturday 00:30 and `2026-08-30T16:30Z` to Monday 00:30. | No |
| 2026-08-27 | Code | `autobyteus-ts/src/llm/utils/token-usage-tracker.ts` plus caller search | Apply product-reachability check to adjacent flat cost helper. | Only test callers were found; it does not establish a supported production pricing path and is outside scope. | No |
| 2026-08-27 | Other | User approval in this conversation | Lock the requirements basis before architecture design. | User explicitly authorized proceeding to fix the verified problem. Approval follows the recommended bounded interpretation: known effective-dated history/calendar correctness now; remote catalog freshness and persisted-record repair remain linked follow-ups. | No |

## Relevant Existing Behavior And Production Paths

| Behavior ID | Kind | Current Supported Trigger Or Governing Contract | Current Production Path And Lifecycle | Meaningful Current Outcome / Invariants | Evidence |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | Contract | A supported DeepSeek token-usage observation carries provider/model identity and `observed_at`. | Runtime token event -> `TokenUsageEventEnrichmentTransformer` -> `TokenCostCalculator.enrichCost/resolvePolicy` -> `TokenPriceConfigProvider.resolvePolicy` -> `LLMFactory.getModelPricingInfo` -> singular schedule minute selection -> selected policy/cost payload -> persistence/live event. Accumulator paths independently resolve policy before fold. | Any valid date inside a UTC peak window resolves peak, including weekends. Published half-open window semantics otherwise hold. | Source files above plus probe results. |
| BEH-002 | Contract | The same supported observation path may carry a historical `observed_at`; accumulator/fold uses that timestamp to mark the observation. | `observed_at` reaches `scheduleSelection`, but only its UTC hour/minute is consumed; `effectiveFrom` is projected later and never gates. | Later time-of-use rates/period are applied to earlier instants. No schedule history can be carried through `TokenPricingConfig`/`ModelPricingInfo`. | Type, provider, current test, and probe. |
| BEH-003 | Contract | A DeepSeek observation has an invalid timestamp. | `scheduleSelection` -> invalid `Date` -> `null` period -> `toPolicy` marks scheduled pricing missing -> calculator returns price-missing costs. | No guessed scheduled rates; reason is `pricing_schedule_time_invalid`. | Provider unit test and provider source. |
| BEH-004 | Contract | A valid schedule period is selected during observation processing. | Selector result -> `ResolvedTokenPricingPolicy` -> `pricing_snapshot_json`/policy key -> contribution/fold/analytics signature. | Schedule ID/period/effective/timezone provenance exists, but has no day-set/calendar-timezone fields and always identifies the one current schedule. | `token-pricing-policy.ts`, provider, calculator, analytics contribution. |
| BEH-005 | System | GraphQL/statistics/dashboard consumers request run or analytics cost data. | GraphQL/provider -> token-usage run/analytics repository -> stored aggregate/projection -> output. | Readers return stored totals/pricing summaries; no current-catalog lookup or read-time reprice occurs. | Provider/repository searches, schema, run/analytics projection code. |

## Design Health Assessment Evidence

- Change posture: `Bug Fix` plus `Behavior Change`
- Candidate root cause classification: `Missing Invariant` and `Shared Structure Looseness`
- Refactor posture evidence summary: Refactoring is likely needed now, but only inside the pricing subsystem. A single schedule literal and an embedded private selector are inadequate for version selection and mutation-resistant timezone testing. The existing catalog -> factory -> server provider -> calculator ownership chain remains healthy and should be extended, not bypassed.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| Shared schedule type | Schedule ID, effective instant, windows, and periods are literal one-version tuples. | Effective-dated rules and weekday axes are structurally unrepresentable; data model must evolve cleanly. | Design history/version shape. |
| Server provider | Selection ignores a field it later reports and mixes schedule evaluation with policy projection. | Missing validity invariant; bounded evaluation concern should become directly testable without moving provider facts into server code. | Design owner/file responsibility. |
| Current tests | Pre-effective timestamps expect current schedule; no weekend or timezone-axis mutation tests. | Coverage is stale and false-positive; test structure helped the defect survive. | Downstream coverage investigation must replace/expand. |
| Catalog/factory boundary | Provider facts are centralized and server consumes provider-neutral `ModelPricingInfo`. | No boundary bypass or duplicated pricing table is needed; preserve this ownership. | Reuse/extend. |
| Persistence path | Costs are computed on observation processing and then compacted. | Do not introduce read-time reprice. Existing aggregate repair is a separate data problem. | Preserve immutability; document residual risk. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-ts/src/llm/utils/token-pricing-schedule.ts` | Defines and creates DeepSeek V4 schedule/rate periods. | One literal version; no weekday/calendar axis; rates and rule structure share this owner. | Extend/replace with semantically tight effective-dated shared data; do not hard-code weekdays in server. |
| `autobyteus-ts/src/llm/utils/llm-config.ts` | Holds, serializes, merges pricing config. | Singular `pricingSchedule` / `pricing_schedule`; object is cast without schedule validation. | Clean-cut plural/history projection; no compatibility dual field. |
| `autobyteus-ts/src/llm/model-pricing-types.ts` | Public factory pricing-result shape. | Singular `pricing_schedule`. | Carry the canonical history shape to the server. |
| `autobyteus-ts/src/llm/llm-model-pricing.ts` | Maps registered model config to provider-neutral `ModelPricingInfo`. | Passes the singular schedule unchanged; flat fields are current off-peak. | Preserve factory as authoritative lookup boundary while projecting history. |
| `autobyteus-ts/src/llm/supported-model-definitions.ts` | Built-in model facts and default pricing config. | Both DeepSeek rows use current off-peak base fields plus the same singular schedule. Parent commit preserves actual old flat values. | Catalog must own all three historical rule/rate states for both models. |
| `autobyteus-server-ts/src/token-usage/pricing/token-price-config-provider.ts` | Adapts factory pricing to resolved server policy. | Private selector reads UTC minute only; effective date ignored; policy mapping/provenance happens in same file. | Retain provider as authoritative server boundary; extract or isolate schedule evaluation for direct parameterized coverage if design confirms. |
| `autobyteus-server-ts/src/token-usage/pricing/token-pricing-policy.ts` | Resolved policy/snapshot contract. | Carries only schedule ID/period/effective and one timezone. | Add unambiguous selected weekday/calendar provenance without duplicating the entire catalog. |
| `autobyteus-server-ts/src/token-usage/pricing/token-cost-calculator.ts` | Applies resolved unit prices and generic tiers to token components. | Correctly delegates policy lookup and has no provider rule. | Preserve unchanged; forbid DeepSeek branches. |
| `autobyteus-server-ts/src/agent-execution/events/processors/token-usage/token-usage-event-enrichment-transformer.ts` | Enriches supported runtime token events with context, deltas, and cost. | Real production caller of calculator/policy resolution. | End-to-end coverage should prove corrected `observed_at` behavior here or at accumulator boundary. |
| `autobyteus-server-ts/src/token-usage/services/token-usage-run-accumulator.ts` and `projections/token-usage-run-fold.ts` | Resolve/fold/persist authoritative observations. | Re-resolves policy and accumulates cost; historical instants are supported inputs. | Correct selector automatically serves both live and accumulator paths. |
| `autobyteus-server-ts/prisma/schema.prisma` and token-usage projections/repositories | Store compact run/analytics totals and pricing summaries. | Normal current storage is aggregate, not lossless per-observation history. | No migration; preexisting rerating requires separate evidence/contract. |
| `autobyteus-server-ts/tests/unit/token-usage/pricing/token-price-config-provider.test.ts` | Focused policy behavior. | Includes two stale pre-effective expectations and no weekend/calendar cases. | Replace stale expectations and add cutover/calendar coverage. |
| `autobyteus-ts/tests/unit/llm/supported-model-definitions.test.ts` | Catalog/factory projection contract. | Expects one "latest" schedule. | Update to assert complete effective-dated history and prior/current prices. |
| `provider-error-and-pricing-contract.md` | Durable provider/pricing design contract. | Explicitly rejects the historical/date selector now required. | Must be updated in this change. |

## Runtime / Probe Findings

| Date | Method | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-08-27 | Test | `pnpm --filter autobyteus-server-ts test --run tests/unit/token-usage/pricing/token-price-config-provider.test.ts` | 7/7 passed. Existing 2025/2026-pre-cutover cases expect the current schedule. | Passing suite does not mean current behavior is correct; two expectations are stale. |
| 2026-08-27 | Probe | Temporary focused Vitest probe, removed after execution. | Current Flash results: `2026-07-15T12:00Z` -> schedule `deepseek-v4-2026-08-17`, `off_peak`, `$0.22/$0.66/$0.007`; `2026-08-16T15:59:59.999Z` same; exact initial cutover -> same; `2026-08-22T02:00Z` -> `peak`; `2026-08-23T02:00Z` -> `peak`; `2026-08-26T02:00Z` -> `peak`; `2026-08-29T02:00Z` -> `peak`. | Both reported defects reproduced. The effective boundary currently changes metadata only in theory; no selection changes because there is one unconditional version. |
| 2026-08-27 | Probe | `Intl.DateTimeFormat('en-US-u-ca-iso8601', { timeZone:'Asia/Shanghai', ... }).formatToParts(...)` | `2026-08-28T16:30Z` -> Sat 00:30; `2026-08-30T16:30Z` -> Mon 00:30. | Current runtime can evaluate IANA calendar days without a new timezone dependency. |

## External / Public Source Findings

- **Current first-party rate/rule source:** [DeepSeek Models & Pricing](https://api-docs.deepseek.com/quick_start/pricing/), read 2026-08-27. It lists:
  - peak `01:00–04:00` and `06:00–10:00` UTC, Monday–Friday; all other hours off-peak;
  - Flash off/peak cache hit `$0.007/$0.014`, cache miss `$0.22/$0.44`, output `$0.66/$1.32`;
  - Pro off/peak cache hit `$0.022/$0.044`, cache miss `$0.66/$1.32`, output `$1.98/$3.96`.
- **Dated rule-change evidence:** [xyzs996/deepseek-peak-offpeak-vectors](https://github.com/xyzs996/deepseek-peak-offpeak-vectors), current repository viewed 2026-08-27. Its source record preserves the vendor announcement making weekends off-peak at Beijing midnight Sunday 2026-08-23 (`2026-08-22T16:00:00Z`). It uses ISO weekdays and `Asia/Shanghai` for the calendar axis.
- **Calendar-language ambiguity:** The live English page says UTC hours and Monday–Friday but does not explicitly qualify the weekday timezone. The issue and CC0 repository retain the Chinese text that places Monday–Friday in Beijing time. The requirements follow that vendor-calendar interpretation.
- **Old price evidence:** Indexed capture of the official DeepSeek pricing page plus repository parent commit agree on old flat Flash `$0.0028/$0.14/$0.28` and Pro `$0.003625/$0.435/$0.87`. Those rates were replaced, not doubled. Therefore the issue's "understated by half" sentence is inaccurate even though its effective-date diagnosis is correct.
- **Vector applicability:** The external next-boundary/countdown vectors are not relevant because AutoByteus exposes no in-scope next-change calculator. The pricing phase vectors and synthetic calendar/config mutation are relevant.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: No live provider account or external service. Focused Vitest bootstraps the repository's normal test database and mocks Ollama/LM Studio discovery.
- Required config, feature flags, env vars, or accounts: Repository test setup only; no DeepSeek API key.
- External repos, samples, or artifacts cloned/downloaded for investigation: None cloned. GitHub/raw files were read through web access.
- Setup commands that materially affected the investigation:
  - `corepack pnpm install --frozen-lockfile`
  - `corepack enable` to make the pinned pnpm available to package scripts.
  - Focused test and temporary probe commands listed above.
- Cleanup notes for temporary investigation-only setup: Temporary probe source was deleted after execution. Untracked build outputs from shared-package preparation were removed. `node_modules` is ignored and remains for downstream work.

## Findings From Code / Docs / Data / Logs

1. **The shared type is the first defect boundary.** It cannot state weekday eligibility or multiple rule versions. Fixing only `getUTCDay()` in the consumer would embed provider policy in code and cannot enforce history correctly.
2. **`effectiveFrom` currently has descriptive, not governing, semantics.** It appears only after selection in `effective_from` and `pricing_schedule_effective_from`.
3. **The one-current-schedule choice was deliberate in the prior durable contract.** The weekend policy revision invalidated that assumption; the new ticket is a requirements change, not merely a missed line in an otherwise sufficient design.
4. **The issue's proposed two schedule versions are necessary but insufficient by themselves for pre-initial-cutover correctness.** The catalog must also retain/select the pre-time-of-use flat rate state; otherwise a pre-cutover observation can only fall back to current off-peak, current peak, or missing.
5. **UTC and Shanghai weekday reads happen to produce the same result for every current published peak window.** Robust coverage must use a synthetic schedule/window plus configured-day mutation; otherwise an implementation can ignore the new timezone/day fields and still pass live-vector tests.
6. **Pricing is determined at observation processing, not dashboard query.** This narrows the real effect of the effective-date bug: live post-cutover observations are not pre-cutover, but supported replay/backdated ingestion is; already stored wrong outcomes remain stored.
7. **No supported production caller for `TokenUsageTracker` was found.** Its flat price calculation is an adjacent test-only legacy concern and cannot expand this ticket under the product-reachability rule.

## Persisted Data Transition Evidence (When Applicable)

- Current stored subject, location, representative shape, and approximate volume:
  - SQLite `token_usage_run_records` stores one cumulative record per canonical run, including token totals, cost totals, pricing summary JSON, policy keys, and unit-price summaries.
  - Analytics storage groups contributions by day/identity/cache/pricing signature and stores token/cost totals per facet.
  - Legacy `token_usage_ledger_events` remains declared for bounded historical schema migration, but it is not the normal current writer.
  - No representative user database is present in the ticket worktree, so affected row volume is unknown.
- Relevant code-model, serialization, semantic, or physical-store change: Shared transient pricing configuration changes from one schedule to effective-dated history. No database column or stored pricing-summary decoder change is required for future selected policy keys/metadata.
- Normal readers and writers, including unknown/extra-field behavior: Writers resolve and snapshot pricing during observation processing. Readers use stored totals/summaries and do not deserialize the current schedule catalog. JSON pricing provenance is opaque to storage.
- Representative direct-read or compatibility evidence: Repository/provider searches found no dashboard-time `TokenPriceConfigProvider` call. `TokenUsageRunRecord` codecs read generic distinct policy keys and unit-price summaries, not schedule objects.
- Required semantics and invariants preserved by direct use: `Yes` for the approved no-rewrite scope — existing snapshots remain immutable and readable; new observations carry corrected policy identities.
- Physical storage, privacy/security, disposal, rebuild, or operational constraints: Compact run aggregates can mix multiple observations and do not preserve lossless per-observation token-to-price allocation. Repricing them from aggregate totals risks inventing allocation. No migration is authorized.
- Concrete benefit, cost, and risk of migration if it remains a candidate: A targeted repair could correct some affected records, but scope, source recovery, affected-version/time bounds, mixed runs, idempotency, analytics/run consistency, and user expectation all require separate investigation. Silent migration risks corrupting accounting history.
- Existing migration framework or lifecycle constraints: An app-data migration framework exists, but framework availability is not evidence that deterministic repair data exists.
- Decision: `Not Affected` for this change; no persisted-data transformation.

## Constraints / Dependencies / Compatibility Facts

- `autobyteus-ts` owns built-in provider facts and passes provider-neutral pricing data through `LLMFactory`; server pricing must not import or duplicate the built-in definition table.
- `TokenPriceConfigProvider` is the authoritative server adaptation boundary; `TokenCostCalculator` consumes resolved policy and must remain provider-neutral.
- `pricing_schedule` has no evidenced independently persisted/user-edited production owner. The active portable application pricing schema does not include it; raw LLM overrides reserve pricing keys. This supports a clean-cut internal shape replacement without a legacy reader.
- Existing resolved policy snapshots/keys are immutable historical outputs, not input schemas that runtime must reinterpret.
- IANA calendar handling can use current Node ICU; no third-party timezone library is required by current evidence.
- Current durable documentation must change because it explicitly says a historical/date selector is absent.
- No backward-compatibility wrapper, dual singular/plural schedule fields, legacy fallback, or read-time price reinterpretation is allowed.

## Open Unknowns / Risks

- The user approved proceeding under the presented bounded scope; already-persisted cost repair and remote catalog freshness remain separate follow-ups.
- Exact count of affected stored records in deployed installations is unknown; no representative production data is available in the worktree.
- The weekend announcement is no longer on the live vendor page. Its exact effective instant relies on the dated issue/vector evidence; the steady-state weekday rule is first-party current.
- Design must ensure that a baseline flat state is selected without making current catalog consumers report obsolete flat prices as the "current" default.
- Design must specify whether flat-state provenance uses empty/null weekday fields and how resolved policy types express this without ambiguous meanings.

## Notes For Architecture Reviewer

Requirements are approved. The architecture design must focus on:

- canonical effective-dated history ownership in `autobyteus-ts`;
- deterministic latest-eligible version selection;
- semantically tight representation of flat and time-window versions;
- explicit ISO weekday plus IANA calendar timezone;
- separation between schedule evaluation and policy projection sufficient for parameterized mutation-resistant tests;
- selected provenance without storing duplicate catalog blobs;
- removal of singular schedule fields and stale tests/document claims;
- no database migration or existing snapshot rewrite.
