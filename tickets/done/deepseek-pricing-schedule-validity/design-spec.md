# Design Spec

## Current-State Read

DeepSeek pricing facts are owned by the built-in `autobyteus-ts` catalog and projected through the provider-neutral `LLMFactory.getModelPricingInfo` boundary. `autobyteus-server-ts` owns observation-time policy resolution through `TokenPriceConfigProvider`; `TokenCostCalculator` then applies the resolved unit prices without provider-specific branches. This ownership chain is healthy and must remain authoritative.

The defect is inside the data shape and its bounded evaluator:

- `TokenPricingSchedule` is one DeepSeek-specific literal version.
- `TokenPricingConfig`, serialized config, and `ModelPricingInfo` can carry only that singular version.
- `scheduleSelection` is embedded privately in `token-price-config-provider.ts`, reads UTC minute-of-day only, and ignores `effectiveFrom`.
- The provider later reports the ignored effective instant as if it governed selection.
- Current unit tests expect the single schedule for pre-effective dates.

The real supported path computes policy when a token-usage observation is enriched or accumulated. Stored run/analytics results are later read without current-catalog repricing. No database migration or dashboard-time selector belongs in this design. See BEH-001–BEH-005 and the investigation source/probe tables.

## Intended Change

Replace the singular schedule representation with a clean effective-dated pricing history composed of semantically distinct fixed and time-window versions. Keep provider facts in `autobyteus-ts`; add one pure, provider-neutral history/period selector inside the server pricing subsystem; make `TokenPriceConfigProvider` map its result into the existing resolved-policy/cost path.

The built-in DeepSeek history will contain:

1. an unbounded prior flat version;
2. the daily time-window version effective `2026-08-16T16:00:00Z`;
3. the weekday-only time-window version effective `2026-08-22T16:00:00Z`.

Window clock and weekday calendar are separate fields. Both current time-window versions use UTC window time; the first explicitly permits ISO days 1–7, while the second permits 1–5 using `Asia/Shanghai` for the weekday calendar.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Contract | REQ-001–REQ-004, REQ-007; AC-001–AC-003, AC-006–AC-007 | Supported DeepSeek token-usage observation with valid `observed_at`. | Investigation BEH-001; current selector/probe. | Latest eligible version is selected; peak eligibility consumes explicit ISO days in the configured calendar timezone before applying half-open windows. | Observation -> policy provider -> factory history -> pure selector -> calculator -> result; DS-001, DS-004. |
| BEH-002 | Contract | REQ-001, REQ-005–REQ-007; AC-003–AC-005 | Supported backdated/replayed DeepSeek observation. | Investigation BEH-002; stale unit cases and cutover probe. | Select prior flat, daily, or weekday-only version by `observed_at`; never by process time. | Same primary spine with history version choice; DS-001, DS-004. |
| BEH-003 | Contract | REQ-008; AC-008 | DeepSeek observation with invalid timestamp. | Investigation BEH-003; current invalid-time test. | Preserve fail-closed missing pricing and no selected period/version. | Provider -> selector invalid result -> missing resolved policy -> calculator price-missing result; DS-001, DS-003, DS-004. |
| BEH-004 | Contract | REQ-009; AC-009 | Successful history/period resolution. | Investigation BEH-004; resolved policy/snapshot mapping. | Policy key and snapshot identify selected version/period plus distinct window and weekday-calendar provenance. | Selector result -> provider policy mapping -> payload/snapshot -> persistence/live return; DS-001–DS-003. |
| BEH-005 | System | REQ-010; AC-010–AC-011 | Observation persistence and later cost query. | Investigation BEH-005 and persisted-data evidence. | Correct newly processed observations; preserve existing snapshots and stored totals without read-time reprice. | Enriched observation -> accumulator/fold -> repositories -> query projection; DS-002, DS-003. |

## Relevant Supplemental Task Artifacts

None.

## Task Design Health Assessment (Mandatory)

- Change posture: `Bug Fix` plus `Behavior Change`
- Current design issue found: `Yes`
- Root cause classification: `Missing Invariant` and `Shared Structure Looseness`
- Refactor needed now: `Yes`
- Evidence: One literal schedule is treated as both current catalog metadata and an all-time rule; the selecting consumer ignores its effective instant and cannot receive weekday/calendar data. Private embedded selection prevents mutation-resistant parameterized coverage.
- Design response: Introduce a tight discriminated effective-dated history in the shared pricing owner, replace singular transport fields, and extract a pure server-owned selector while retaining the existing factory/provider/calculator boundaries.
- Refactor rationale: The fix cannot be correct as a local `getDay()` condition. History, prior flat prices, and separate calendars must be representable before the consumer can enforce them. Extraction is bounded to the schedule-evaluation concern and avoids making `TokenPriceConfigProvider` a mixed mapping/temporal-policy blob.
- Intentional deferrals and residual risk: Remote catalog refresh/freshness and repair of already-persisted costs are separate approved follow-ups. Until a pricing-data refresh mechanism exists, an old application can still be unaware of a future provider rule; this design only makes known versions additive and correctly selectable.

## Terminology

- **Pricing schedule history:** The complete static set of known rule versions for one model pricing config.
- **Fixed version:** A version with one period/rate set and no window/day axes.
- **Time-window version:** A version that selects a window period or default period using a configured window clock and configured weekday calendar.
- **Unbounded baseline:** A fixed version whose `effectiveFrom` is `null`, making it eligible before every dated version.
- **Latest eligible version:** The version with the greatest valid `effectiveFrom` not after `observed_at`; the unbounded baseline sorts before every dated version.

## Design Reading Order

1. Approved behavior map and three-version DeepSeek history.
2. Persisted-data/no-rewrite decision.
3. Primary observation-to-cost spine and bounded selector spine.
4. Shared discriminated history ownership and server evaluation boundary.
5. File mapping, removals, and sequence.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Remove singular `pricingSchedule` / `pricing_schedule` / `ModelPricingInfo.pricing_schedule` fields.
- Remove the old one-version creator and embedded `scheduleSelection` function.
- Replace ambiguous `pricing_schedule_timezone` provenance with explicit window and weekday-calendar fields.
- Replace pre-effective unit expectations and the durable statement that date-based history is intentionally absent.
- Do not dual-read singular and plural schedule shapes, copy old fields into the new history, or fall back from history selection to current flat catalog values.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject, location, representative shape, and approximate volume: SQLite cumulative `token_usage_run_records`, analytics facets, and legacy ledger pricing snapshot JSON; deployed volume is unknown.
- Relevant code-model, serialization, semantic, or physical-store change: Transient/shared LLM pricing config changes from a singular schedule to history. Resolved policy provenance names change for newly created snapshots. No database schema changes.
- Normal reader/writer behavior and representative evidence: Writers resolve pricing while processing observations. Current run/analytics readers consume generic stored totals, unit-price summaries, and opaque policy keys; they do not deserialize the static schedule object or re-run catalog resolution.
- Required semantics and invariants under direct use: Existing cost outcomes remain immutable and readable; new observations use corrected history and get distinct policy identity.
- Physical-store, privacy/security, disposal/rebuild, and operational constraints: Compact run aggregates lack guaranteed per-observation price allocation; silent rerating risks corrupting accounting history. No maintenance window is authorized.
- Decision: `Not Affected`
- Decision rationale: This design changes future transient resolution only. A migration provides no necessary schema benefit and cannot guarantee correct reconstruction, while adding I/O, recovery, and corruption risk.
- Acceptance criteria or design constraints supported by this decision: REQ-010; AC-010–AC-011.

### Migration Plan

N/A — no persisted-data migration is required or authorized.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001–BEH-004 | Supported token-usage observation with provider/model/`observed_at` | Cost-enriched authoritative observation carrying selected policy identity | Server token-pricing subsystem, through `TokenPriceConfigProvider` | Carries catalog history into the meaningful per-observation cost outcome. |
| DS-002 | Primary End-to-End | BEH-004–BEH-005 | Correctly cost-enriched observation | Persisted cumulative run/analytics state | `TokenUsageRunAccumulator` and persistence/projection owners | Proves corrected identity/cost reaches storage without a new reprice path. |
| DS-003 | Return-Event | BEH-003–BEH-005 | Resolved/missing policy and calculated payload | Live token event and later API/statistics result | Existing event/persistence projection owners | Preserves observable missing/trusted behavior and snapshot-based queries. |
| DS-004 | Bounded Local | BEH-001–BEH-004 | Pricing history plus observed instant | Selected version/period or invalid-time failure | Pure schedule-history selector serving `TokenPriceConfigProvider` | Owns temporal/calendar invariants and permits direct synthetic coverage. |

## Primary Execution Spine(s)

`Runtime token-usage event -> TokenUsageEventEnrichmentTransformer / TokenUsageRunAccumulator -> TokenCostCalculator -> TokenPriceConfigProvider -> LLMFactory.getModelPricingInfo -> schedule-history selector -> resolved pricing policy -> TokenCostCalculator.applyPolicy -> enriched observation`

`Enriched observation -> TokenUsageRunAccumulator/fold -> run record and analytics projection writers -> SQLite repositories -> statistics/GraphQL projections`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The supported observation supplies `observed_at` and model identity. The provider obtains catalog history only through `LLMFactory`, delegates version/period evaluation to its pure selector, maps the selected rates/provenance into a resolved policy, and the calculator applies existing component arithmetic. | Observation, calculator, price-config provider, factory pricing result, resolved policy | `TokenPriceConfigProvider` governs server resolution; catalog governs facts; calculator governs arithmetic. | Catalog history construction, pure calendar evaluation, focused tests. |
| DS-002 | The authoritative enriched payload is folded into cumulative run state and analytics facets using existing writers and signatures. New version/period policy keys naturally separate pricing summaries; no storage reader understands schedule internals. | Enriched payload, run accumulator/fold, analytics writer, repositories | Existing token-usage persistence subsystem | Opaque JSON/key provenance and immutable old records. |
| DS-003 | Trusted selection returns selected prices and identity to live/persisted consumers; invalid time returns the existing price-missing outcome. Later queries project stored aggregates rather than consulting current catalog data. | Resolved policy, enriched event, stored aggregate, API projection | Event and projection owners | Missing reason, summary distinctness, GraphQL field preservation. |
| DS-004 | The selector parses the observation instant, validates/chooses the latest eligible version, returns the fixed period directly or evaluates the time-window version's ISO weekday in its calendar timezone and minute in its independent window timezone, then resolves a referenced period. | History, version, weekday/minute coordinates, period | Schedule-history selector | IANA formatter construction and fail-closed malformed configuration. |

## Spine Actors / Main-Line Nodes

- Supported token-usage observation and its authoritative `observed_at`.
- `TokenCostCalculator` as cost-application owner.
- `TokenPriceConfigProvider` as server policy-resolution boundary.
- `LLMFactory.getModelPricingInfo` as provider-neutral catalog boundary.
- Selected history version and pricing period.
- Token-usage accumulator/fold and persistence projections.

The pure selector is a bounded local concern attached to the provider, not a separate top-level business actor.

## Ownership Map

| Main-Line Node | Owns |
| --- | --- |
| Built-in DeepSeek catalog/history creator | Provider facts: rule versions, effective instants, rates, clocks, weekdays, stable schedule IDs. |
| `TokenPricingConfig` / `ModelPricingInfo` | Provider-neutral storage/serialization/projection of pricing history; not selection. |
| `LLMFactory.getModelPricingInfo` | Authoritative model identity lookup and pricing projection. |
| `TokenPriceConfigProvider` | Server sequencing from model lookup through history evaluation to resolved policy/missing outcome and policy-key construction. |
| Schedule-history selector | Pure version eligibility, calendar coordinate calculation, window/default period choice, and fail-closed selection result. |
| `TokenCostCalculator` | Existing token-tier and component price application; no schedule/provider facts. |
| Accumulator/projections/repositories | Existing immutable cost aggregation and query state. |

`LLMFactory` is a thin public lookup facade over registered model/catalog state. `TokenPriceConfigProvider` is not merely a wrapper: it governs the server policy-resolution sequence and resolved-policy contract.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `LLMFactory.getModelPricingInfo` | Registered model and `TokenPricingConfig` projection | Stable provider-neutral lookup by explicit model identity. | Observation-time selection, server missing reasons, or DeepSeek-specific branching. |
| Statistics/GraphQL providers | Stored run/analytics projections | Stable query surfaces over stored outcomes. | Current-catalog lookup or read-time repricing. |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope | Notes |
| --- | --- | --- | --- | --- |
| Singular `pricingSchedule` and serialized `pricing_schedule` | Cannot represent effective-dated history. | `pricingScheduleHistory` / `pricing_schedule_history` in `llm-config.ts`. | In This Change | No dual field. |
| `ModelPricingInfo.pricing_schedule` | Carries obsolete single-version contract. | `pricing_schedule_history`. | In This Change | Missing pricing still uses an empty history. |
| One-version DeepSeek creator and literal schedule type | Cannot express prior flat or weekend revision. | Discriminated history types and `createDeepSeekV4PricingScheduleHistory`. | In This Change | Retain existing `deepseek-v4-2026-08-17` ID only as the correct middle version. |
| Private `scheduleSelection` in provider | Mixes evaluation into policy mapping and ignores version validity. | `token-pricing-schedule-selector.ts`. | In This Change | Provider still sequences the call. |
| Ambiguous `pricing_schedule_timezone` | Cannot identify which calendar it describes. | Explicit window and peak-day provenance fields. | In This Change | Old stored JSON is not rewritten or decoded. |
| Stale pre-effective tests | Protect incorrect behavior. | Cutover/history/calendar test tables. | In This Change | AC-012. |
| Durable no-history/no-date-selection claims | Contradict approved behavior. | Updated `provider-error-and-pricing-contract.md`. | In This Change | Preserve immutable-snapshot statement. |

## Return Or Event Spine(s) (If Applicable)

`Selected version/period -> ResolvedTokenPricingPolicy -> TokenCostCalculator.applyPolicy -> enriched TOKEN_USAGE_UPDATED payload -> live event and accumulator`

`Invalid observed instant -> selector invalid result -> missing resolved policy -> price-missing payload -> live/persisted projection`

`Stored run/analytics state -> existing statistics/GraphQL provider -> cost result` remains unchanged and does not return to the catalog.

## Bounded Local / Internal Spines (If Applicable)

**DS-004; parent owner: `TokenPriceConfigProvider`.**

`Parse observed instant -> rank eligible versions -> choose latest -> fixed: return fixed period | time-window: compute ISO weekday in peakDaysTimezone -> if in peakDays compute minute in windowTimezone -> match half-open window or default -> resolve referenced period -> selection result`

The selector must not read `Date.now()`, model/provider identity, user timezone, process locale, or stored pricing snapshots.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| DeepSeek history construction | DS-001, DS-004 | Catalog | Build three exact versions for Flash/Pro from shared rule constants and model-specific rates. | Keeps provider facts out of server policy code. | Server would duplicate vendor literals/model branches. |
| Calendar coordinate formatting | DS-004 | Selector | Derive ISO weekday and minute-of-day independently for configured IANA zones. | Correctly separates clocks and enables synthetic coverage. | Provider mapping would become temporal utility code. |
| History/selector unit tests | DS-001, DS-004 | Catalog and selector | Assert rates, cutovers, weekday/timezone mutation, declaration-order independence, invalid time. | Executable invariant. | Tests must not become runtime data fetches. |
| Policy provenance mapping | DS-001–DS-003 | Provider | Map selection to selected IDs/effective/clocks/days and policy key. | Explainability and aggregate distinctness. | Storing whole history would duplicate catalog blobs. |
| Durable contract documentation | All | Maintainers | Record current static-history behavior and freshness limitation. | Prevents old no-history design from remaining authoritative. | Docs must not drive runtime parsing. |
| Remote catalog freshness | N/A follow-up | Future pricing-data distribution owner | Detect/distribute vendor changes independently of app releases. | User-identified residual risk. | Adding partial fetching here would mix trust/network/update policy into observation pricing. |

## Ownership Boundaries

- `autobyteus-ts` owns pricing facts and canonical shared data types. It does not interpret `observed_at` for server accounting.
- `LLMFactory` is the only model pricing lookup boundary used by the server. The server must not import `supportedModelDefinitions` or the DeepSeek history creator.
- `TokenPriceConfigProvider` owns resolution sequencing and resolved policy semantics. Its selector is an internal mechanism, not another public pricing service.
- `TokenCostCalculator` owns arithmetic after policy resolution and must not inspect histories, schedules, weekdays, or provider identities.
- Persistence/query owners store/project resolved outcomes and must not consult current history.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `LLMFactory.getModelPricingInfo` | Model registry, default `TokenPricingConfig`, history projection | `TokenPriceConfigProvider` | Server imports built-in catalog/helper directly. | Extend provider-neutral `ModelPricingInfo`, as designed. |
| `TokenPriceConfigProvider.resolvePolicy` | History selector, dimension mapping, missing outcome, policy key/provenance | `TokenCostCalculator` | Calculator calls selector/factory or branches on DeepSeek. | Extend resolved-policy mapping inside provider. |
| Token-usage persistence/query boundary | Run fold, analytics signatures, codecs/repositories | Live and GraphQL/statistics consumers | Query path calls price provider to reprice old data. | Add explicit separately approved repair/rebuild boundary, not a read shortcut. |

## Dependency Rules

- Shared pricing history types and DeepSeek facts may depend only on `autobyteus-ts` pricing types/config.
- `llm-config.ts` and `ModelPricingInfo` may reference the canonical history type; they must not import server selectors.
- Server selector may import canonical history/version types from `autobyteus-ts`; it must not import built-in definitions or provider IDs.
- `TokenPriceConfigProvider` may call `LLMFactory` and its internal selector.
- `TokenCostCalculator` may depend on `TokenPriceConfigProvider` and resolved policy only.
- Persistence/query code may depend on enriched payload/policy summaries, never static history.
- No runtime HTTP fetch, vendor-document parsing, singular-shape fallback, or current-time branch is allowed.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `LLMFactory.getModelPricingInfo(input)` | Model pricing facts | Return provider-neutral current flat summary plus canonical schedule history. | Existing explicit provider + model identifier/value/canonical name. | Output changes singular history field cleanly. |
| `selectTokenPricingSchedulePeriod(history, observedAt)` | History evaluation | Return selected version/period or an explicit invalid-time/unusable-history result. | Canonical history plus timestamp string; no provider/model identity. | Internal server module, pure and directly unit-testable. |
| `TokenPriceConfigProvider.resolvePolicy(payload)` | Observation pricing policy | Lookup history, evaluate observation time, map selected policy/missing outcome. | Existing runtime/provider/model/`observed_at` payload. | Authoritative server boundary remains unchanged to callers. |
| `TokenPricingConfig.fromDict/toDict` | Pricing config serialization | Read/write only the canonical plural history shape. | Current snake/camel config forms. | No singular compatibility read/write. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `LLMFactory.getModelPricingInfo` | Yes | Yes | Low | Replace only the history field; preserve lookup semantics. |
| History selector | Yes | Yes | Low | Accept no model/provider/current-time inputs. |
| `TokenPriceConfigProvider.resolvePolicy` | Yes | Yes | Low | Keep selector internal and resolved policy explicit. |
| Config serialization | Yes | Yes | Low | Canonical plural field only. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Complete version set | `TokenPricingScheduleHistory` | Yes | Low | Use for the collection, not one version. |
| One rule version | `TokenPricingFixedSchedule` / `TokenPricingTimeWindowSchedule` | Yes | Low | Discriminated by `kind`. |
| Bounded evaluator | `selectTokenPricingSchedulePeriod` | Yes | Low | Name both version and period result in docs/types. |
| Server owner | `TokenPriceConfigProvider` | Yes | Low | Keep; do not rename to a generic manager. |
| Window clock | `windowTimezone` | Yes | Low | Remove ambiguous generic `timezone`. |
| Day calendar | `peakDaysTimezone` | Yes | Low | Keep distinct from window clock. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Provider pricing facts/history | `autobyteus-ts` LLM pricing catalog | Extend | Already authoritative for exact rates/source/model identity. | N/A |
| Observation-time policy | Server token-usage pricing | Extend | Already owns model lookup, missing status, policy identity. | N/A |
| Calendar/history evaluation | Server token-usage pricing | Create bounded file inside existing subsystem | Current provider file mixes this logic; a pure owned concern is needed for direct synthetic coverage. | It is not a new subsystem/service. |
| Cost arithmetic | `TokenCostCalculator` | Reuse unchanged | Existing generic component/tier calculation is healthy. | N/A |
| Persisted results | Existing run/analytics storage | Reuse unchanged | Stores resolved outcomes generically. | N/A |
| Pricing freshness | No current distribution subsystem | Defer | Requires trust, refresh, cache, stale UX, and operational policy beyond approved scope. | Separate larger requirement. |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts` LLM pricing/config | Canonical history types, serialization, factory projection, DeepSeek history facts | DS-001, DS-004 | Catalog and factory | Extend | No remote fetch. |
| Server token-usage pricing | History evaluation, resolved-policy mapping/provenance, cost application | DS-001, DS-003, DS-004 | `TokenPriceConfigProvider` / calculator | Extend | Add one pure selector file. |
| Server token-usage persistence/projection | Store and query resolved outcomes | DS-002, DS-003 | Accumulator/repositories | Reuse | No source/schema change expected. |
| Durable provider/pricing docs | Current contract and residual freshness risk | All | Maintainers | Extend | Supersede no-history statement. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/llm/utils/token-pricing-schedule.ts` | LLM pricing | Catalog/shared type owner | Discriminated history/version/period types and exact DeepSeek history creator. | Rule structure and its built-in data already cohere here at current scale. | Canonical structure. |
| `autobyteus-ts/src/llm/utils/llm-config.ts` | LLM config | Config serialization | Store/serialize/merge plural history. | Existing pricing config owner. | Yes. |
| `autobyteus-ts/src/llm/model-pricing-types.ts` | LLM pricing | Factory output contract | Expose history in `ModelPricingInfo`. | Existing result type owner. | Yes. |
| `autobyteus-ts/src/llm/llm-model-pricing.ts` | LLM pricing | Factory projection | Map config history to pricing result. | Existing provider-neutral mapper. | Yes. |
| `autobyteus-ts/src/llm/supported-model-definitions.ts` | Catalog | Built-in facts | Supply old/current model-specific rates to history creator. | Existing DeepSeek rows. | Yes. |
| `autobyteus-server-ts/src/token-usage/pricing/token-pricing-schedule-selector.ts` | Server pricing | Provider-owned internal concern | Pure version/period/calendar selection. | Separates temporal invariant from policy mapping and enables direct tests. | Yes. |
| `autobyteus-server-ts/src/token-usage/pricing/token-price-config-provider.ts` | Server pricing | Authoritative resolution boundary | Sequence lookup/selection and map policy/missing/provenance. | Existing owner remains cohesive after extraction. | Yes. |
| `autobyteus-server-ts/src/token-usage/pricing/token-pricing-policy.ts` | Server pricing | Resolved policy contract | Explicit selected history provenance fields. | Existing policy type owner. | Yes. |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Fixed/time-window schedule fields and periods | Existing `token-pricing-schedule.ts` | LLM pricing | Both model rows and factory/server boundary need one canonical type. | Yes — fixed version omits meaningless windows/days/timezones. | Yes — singular and history shapes do not coexist. | Kitchen-sink optional schedule object. |
| DeepSeek rule versions across Flash/Pro | Same history creator | Catalog | Rule/cutovers are identical; only price triples differ. | Yes | Yes | Server provider-fact helper. |
| Calendar coordinate derivation | New selector file | Server pricing | Both configured window and weekday axes require consistent IANA handling. | Yes | Yes | Global timezone utility unrelated to pricing. |
| Trusted dimensions | Existing schedule trusted-dimension type/constant | LLM pricing | Same supported dimensions across periods/models. | Yes | Yes | Generic loosely typed metadata bag. |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Parallel / Overlapping Representation Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `TokenPricingScheduleHistory` | Yes | Yes | Low | History is the only scheduled policy representation. |
| `TokenPricingFixedSchedule` | Yes | Yes | Low | Contains ID/effective/one period only; no dummy calendar fields. |
| `TokenPricingTimeWindowSchedule` | Yes | Yes | Low | Requires window timezone, peak days, day timezone, windows/default/periods. |
| Base flat fields plus history | Yes, if documented | N/A | Medium | Base fields remain current catalog summary for existing generic consumers; observation-time server pricing must use history exclusively when history exists and must never treat base fields as historical fallback. |
| Resolved provenance | Yes | Yes | Low | Store selected facts only, not entire history. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/llm/utils/token-pricing-schedule.ts` | LLM pricing | Shared data/catalog helper | Tight discriminated types, stable DeepSeek version IDs/cutovers/rules, creator parameterized by model rates. | Compact single capability; no need for a new folder. | Canonical. |
| `autobyteus-ts/src/llm/utils/llm-config.ts` | LLM config | Config | Canonical plural history lifecycle/serialization. | Existing pricing config behavior lives here. | Yes. |
| `autobyteus-ts/src/llm/model-pricing-types.ts` | LLM pricing | Public type contract | `pricing_schedule_history`. | Existing pricing result owner. | Yes. |
| `autobyteus-ts/src/llm/llm-model-pricing.ts` | LLM pricing | Factory mapping | Project history/empty history. | Existing projection owner. | Yes. |
| `autobyteus-ts/src/llm/supported-model-definitions.ts` | Catalog | Built-in facts | Exact prior/current Flash/Pro triples and history attachment. | Existing model rows. | Yes. |
| `autobyteus-ts/tests/unit/llm/supported-model-definitions.test.ts` | Catalog tests | Factory/catalog contract | Assert three versions, exact rates/cutovers/rules, current flat summary. | Existing focused test. | Yes. |
| `autobyteus-server-ts/src/token-usage/pricing/token-pricing-schedule-selector.ts` | Server pricing | Provider internal mechanism | Pure latest-eligible and fixed/window period selection with IANA coordinates. | One concrete concern. | Yes. |
| `autobyteus-server-ts/src/token-usage/pricing/token-price-config-provider.ts` | Server pricing | Authoritative boundary | Map selector result to resolved policy and missing state. | Mapping/sequencing only after extraction. | Yes. |
| `autobyteus-server-ts/src/token-usage/pricing/token-pricing-policy.ts` | Server pricing | Policy contract | Selected version/period/window/day provenance. | Existing type owner. | Yes. |
| `autobyteus-server-ts/tests/unit/token-usage/pricing/token-pricing-schedule-selector.test.ts` | Server pricing tests | Selector contract | Synthetic timezone/day mutation, order independence, boundary and invalid input cases. | Direct pure invariant coverage. | Yes. |
| `autobyteus-server-ts/tests/unit/token-usage/pricing/token-price-config-provider.test.ts` | Server pricing tests | Provider contract | Real DeepSeek history/rates/cutovers/missing/provenance. | Existing end boundary coverage. | Yes. |
| `provider-error-and-pricing-contract.md` | Durable docs | Maintainer contract | Replace single-current schedule with history behavior; record no-rewrite and freshness deferral. | Existing authoritative pricing doc. | N/A |

## Applied Patterns (If Any)

- **Discriminated union:** Fixed and time-window versions share identity/effective fields but do not force meaningless optional calendar/window attributes into one base object.
- **Effective-dated version selection:** Derived validity interval; only `effectiveFrom` is stored and the next version implicitly closes the prior one.
- **Pure policy evaluator:** Calendar/temporal selection is deterministic data-in/result-out and remains internal to the governing provider boundary.
- **Immutable resolved snapshot:** Persistence records the selected outcome/identity, not a live link to current catalog history.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/llm/utils/token-pricing-schedule.ts` | File | LLM pricing catalog/shared type | History versions and DeepSeek static construction. | Existing provider pricing utility location; compact scope. | Observation parsing, server missing status, HTTP refresh. |
| `autobyteus-ts/src/llm/utils/llm-config.ts` | File | Config | Plural history serialization/merge. | Existing config owner. | Historical selection. |
| `autobyteus-ts/src/llm/model-pricing-types.ts` | File | Factory contract | History result field. | Existing provider-neutral result type. | DeepSeek constants. |
| `autobyteus-ts/src/llm/llm-model-pricing.ts` | File | Factory projection | Project history. | Existing lookup mapping. | Server policy/missing reasons. |
| `autobyteus-ts/src/llm/supported-model-definitions.ts` | File | Catalog | Model-specific rate arguments. | Existing exact model definitions. | Selector logic. |
| `autobyteus-server-ts/src/token-usage/pricing/` | Folder | Server pricing subsystem | Provider, selector, calculator, resolved policy. | Existing compact subsystem is the correct structural depth. | Catalog facts, persistence query logic. |
| `.../token-pricing-schedule-selector.ts` | File | Provider-owned internal concern | Pure selector. | Beside owning provider, not in generic utilities. | Provider IDs/rates, policy mapping, storage. |
| `.../token-price-config-provider.ts` | File | Authoritative server boundary | Lookup, selection orchestration, mapping. | Existing boundary. | Calendar implementation details after extraction. |
| `provider-error-and-pricing-contract.md` | File | Durable contract | Current behavior/source/design limits. | Existing contract owner. | Runtime data. |

The layouts remain flat inside the already-cohesive pricing folders because the target adds one bounded concern, not a new subsystem depth. A new nested module would over-split three tightly related pricing files.

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Boundary Is Clear? | Mixed-Layer Or Over-Split Risk | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `autobyteus-ts/src/llm/utils` | Mixed Justified | Yes | Low | Existing config/pricing value objects live here; history is part of that model. |
| `autobyteus-server-ts/src/token-usage/pricing` | Main-Line Domain-Control | Yes | Low | Provider, policy, selector, and calculator form one compact pricing subsystem with distinct files. |
| Server token-usage repositories/projections | Persistence-Provider | Yes | Low | No changes; kept outside pricing selection. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Tight history versions | `{kind:'fixed', effectiveFrom:null, period:flat}` and `{kind:'time_window', effectiveFrom:'...', windowTimezone:'UTC', peakDays:[1,2,3,4,5], peakDaysTimezone:'Asia/Shanghai', ...}` | One object with optional `peakDays?`, `timezone?`, `flatPrice?`, `windows?` where invalid combinations are possible. | Fixed history has no meaningless calendar fields. |
| Version choice | Choose maximum parsed `effectiveFrom <= observedAt`; `null` baseline is least. | `history.find(...)`, relying on declaration order, or compare against `new Date()` now. | Meets deterministic historical semantics. |
| Calendar evaluation | Compute minute in `windowTimezone` and ISO weekday independently in `peakDaysTimezone`. | `instant.getUTCDay()` plus hard-coded weekend branch. | Prevents the wrong-calendar implementation. |
| Provider boundary | `TokenPriceConfigProvider -> selectTokenPricingSchedulePeriod(history, observedAt)` | `TokenCostCalculator` branches when model ID starts with `deepseek-v4`. | Preserves authoritative ownership. |
| Current summary vs history | Base price fields remain current off-peak catalog summary; server uses history exclusively for observed pricing. | Before first version, silently fall back to base current off-peak. | Avoids repeating the effective-date defect. |

Illustrative canonical history shape:

```ts
readonly [
  { kind: "fixed", scheduleId: "deepseek-v4-before-2026-08-17", effectiveFrom: null, period: flatPeriod },
  {
    kind: "time_window",
    scheduleId: "deepseek-v4-2026-08-17",
    effectiveFrom: "2026-08-16T16:00:00Z",
    windowTimezone: "UTC",
    peakDays: [1, 2, 3, 4, 5, 6, 7],
    peakDaysTimezone: "Asia/Shanghai",
    peakWindows,
    defaultPeriodId: "off_peak",
    periods,
  },
  {
    kind: "time_window",
    scheduleId: "deepseek-v4-2026-08-23",
    effectiveFrom: "2026-08-22T16:00:00Z",
    windowTimezone: "UTC",
    peakDays: [1, 2, 3, 4, 5],
    peakDaysTimezone: "Asia/Shanghai",
    peakWindows,
    defaultPeriodId: "off_peak",
    periods,
  },
]
```

Names are normative unless implementation uncovers an existing naming collision; behavior and identity distinctness are mandatory.

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep singular `pricing_schedule` alongside history | Existing internal serializer/type uses it. | Rejected | Replace every active producer/consumer/test in one change. No persisted reader depends on it. |
| Treat singular schedule as one-element history | Would reduce edits. | Rejected | Removes the obsolete shape rather than normalizing it at runtime. |
| Fall back to base price before first dated version | Easy `effectiveFrom` gate. | Rejected | Include explicit unbounded flat version with correct old rates. |
| Hard-code weekends in provider | Minimal current fix. | Rejected | Store ISO days/timezone in time-window version and consume them generically. |
| Preserve `pricing_schedule_timezone` alias | Existing snapshot key. | Rejected | New snapshots use explicit window/day fields; old opaque snapshots remain untouched. |
| Reprice old stored records on read | Could appear to fix dashboards. | Rejected | Preserve stored results; separately investigate repair with recoverable source data. |

## Derived Layering (If Useful)

`Catalog facts/shared history -> factory projection -> server history evaluation/resolved policy -> cost arithmetic -> persistence/projection`

This is explanatory only. The authoritative boundaries are `LLMFactory`, `TokenPriceConfigProvider`, `TokenCostCalculator`, and persistence owners; callers must not skip them.

## Change / Refactor Sequence

1. Define discriminated fixed/time-window version types, history type, stable IDs, and a three-version DeepSeek history creator in `autobyteus-ts`.
2. Replace singular config/model-pricing fields with plural history throughout config construction, serialization, merge, missing results, and factory projection.
3. Update both built-in DeepSeek rows to provide actual prior flat and current rate triples while retaining current off-peak base summary fields.
4. Add the pure server selector and focused synthetic/history tests first; implement latest-eligible selection, fixed-period return, separate IANA coordinates, half-open window matching, and fail-closed result.
5. Update `TokenPriceConfigProvider` to use history exclusively when present, map selected rates/dimensions, and create version/period-distinct policy identity/provenance. Preserve non-history policy behavior.
6. Update resolved policy type/local policy and affected typed fixtures/mocks for renamed provenance fields.
7. Replace stale provider/catalog tests with prior-flat, both cutovers, weekend/weekday, boundary, declaration-order, synthetic timezone/day mutation, invalid time, and preserved non-DeepSeek assertions.
8. Run focused typechecks/unit tests and let downstream API/E2E coverage investigation decide whether additional repository-resident observation-to-persistence coverage must be added.
9. Update `provider-error-and-pricing-contract.md` to the new history contract and explicitly record immutable existing snapshots plus remote-freshness deferral.
10. Remove all old singular field/helper/selector/test/doc references; verify `rg` finds no active compatibility path.

No temporary dual shape is needed because shared library and server are built and delivered together in this workspace.

## Key Tradeoffs

- **Discriminated union over one optional-field object:** Slightly more type code, but it prevents meaningless flat-version calendars and invalid field combinations.
- **Static history over remote refresh:** Correct and deterministic for known versions without introducing network/trust failure modes; does not solve future catalog freshness.
- **Base current summary plus history:** Preserves generic current catalog consumers while supplying complete observation-time history. The provider must never use base values as a history fallback.
- **IANA evaluation through built-in `Intl`:** Avoids a new dependency and correctly expresses vendor calendars; tests must pin locale-independent ISO mapping and invalid zone behavior.
- **No stored-data repair:** Protects accounting immutability and avoids unverifiable aggregate reconstruction; known wrong historical records can remain until a separately authorized repair exists.

## Risks

- Malformed serialized history could produce ambiguous versions or invalid period references. The selector must return an unusable-history/missing result rather than guess; built-in history tests must prove valid construction.
- A naïve `Array.find` makes declaration order authoritative. Tests must shuffle history and still select the same version.
- A hard-coded weekend branch can pass live rules. Synthetic day-set mutation coverage is mandatory.
- `Intl` weekday parsing can become locale-fragile if implementation uses display text without a fixed locale/mapping. Use fixed `en-US-u-ca-iso8601` parts or an equivalently deterministic method.
- Current base prices and historical fixed prices overlap semantically unless documented. Tests must assert the base remains current off-peak while pre-cutover resolver returns the fixed historical version.
- Remote pricing freshness remains unresolved. A future vendor update will still require application/catalog delivery until a separate signed-refresh capability exists.
- Existing releases may have persisted incorrect outcomes. This change intentionally does not repair them.

## Guidance For Implementation

- Keep all DeepSeek IDs, cutovers, windows, weekdays, timezones, and rates in the catalog history creator; the server selector must be data-driven.
- Use ISO weekday values `1..7`, never JavaScript `0..6`, in the shared contract.
- Parse `observedAt` once. Do not compare date strings lexically and do not read current time.
- Treat the unbounded fixed baseline as less recent than every dated version. Reject ambiguous duplicate effective instants rather than relying on order.
- Evaluate `windowTimezone` and `peakDaysTimezone` independently. Current values are `UTC` and `Asia/Shanghai` respectively.
- For time-window versions: if the calendar day is not eligible, select the default period without matching windows; otherwise match `[startMinute,endMinute)`.
- Return the canonical period object from the selector so policy mapping does not re-find or infer rates.
- When history exists, a selection failure must produce missing scheduled prices/dimensions; never fall back to `ModelPricingInfo` base price fields.
- Preserve the existing `deepseek-v4-2026-08-17` ID for the middle rule because it remains a real selected historical identity, not for compatibility.
- For fixed provenance, set window/day fields to `null`; do not invent empty timezone strings. The selected period ID should be `flat`.
- New selected provenance should include:
  - `pricing_schedule_id`
  - `pricing_schedule_period_id`
  - `pricing_schedule_effective_from`
  - `pricing_schedule_window_timezone`
  - `pricing_schedule_peak_days`
  - `pricing_schedule_peak_days_timezone`
- Policy key suffix remains `:<scheduleId>:<periodId>` so different historical rules aggregate distinctly.
- Keep unit tests self-contained. Do not download GitHub vectors or vendor docs during tests; copy only the approved scenario instants/expectations with source comments as appropriate.
- Do not create `implementation-handoff.md`; that remains the implementation engineer's responsibility.
