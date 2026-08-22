# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-analytics/tickets/in-progress/token-statistics-analytics/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-analytics/tickets/in-progress/token-statistics-analytics/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-analytics/tickets/in-progress/token-statistics-analytics/design-spec.md`
- Supplemental Task Artifacts Reviewed: `ui-ux-spec.md`, `prototype.html`, `token-usage-analytics-data-contract.md`, `evidence/prototype-desktop.png`, `evidence/prototype-mobile.png`, user-supplied populated field screenshot `ctx_91a98260defe__image.png`
- Solution Revision Record Reviewed: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-analytics/tickets/in-progress/token-statistics-analytics/solution-revision-record.md`
- Relevant Solution Revision IDs: `SR-001`, `SR-002`
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-analytics/tickets/in-progress/token-statistics-analytics/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-002`
- Current Review Round: `2`
- Trigger: SR-002 re-review after CRR-008 / API-REV-004 `F-006` / `FIELD-F-002` was returned as a Requirement Gap and the user clarified the observed first-run lifecycle.
- Prior Review Round Reviewed: `1` / `ARCH-REV-001`
- Latest Authoritative Round: `2`
- Current-State Evidence Basis: The `ARCH-REV-001` code and artifact basis remains valid. Round 2 additionally reviewed SR-002 deltas, CRR-008/CRR-009, API-REV-004 coverage/field diagnosis, live GraphQL and fresh-current-frontend results, the user-supplied populated screenshot, and IR-005 tab evidence. The evidence shows the initial empty view preceded any post-coverage contribution; later admitted contributions populated the approved daily projection.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood: The approved change remains observation-time UTC analytics with preserved created-run/lifetime Run details and established accounting semantics. SR-002 records that no retained-lifetime Analytics expansion or automatic refresh contract was approved.
- Relevant existing behavior and evidence confirmed: The round-1 paths remain confirmed. Field evidence now also proves that the daily projection and current frontend return post-coverage usage; the first empty state occurred before the first admitted post-coverage contribution. CRR-009 separately verifies the tab-fidelity correction, so the older populated screenshot is used only for analytics-data/coverage evidence, not current tab styling.
- Scope guardrail confirmed: `UC-001`–`UC-008` are in scope; provider quota/invoice/rate-limit claims, fabricated pre-feature history, raw event retention, currency conversion, alerts, cloud export, and task/workspace analytics filters are out of scope; BEH-001 Run details and BEH-004 accounting semantics are preserved; technical review authority is explicit.
- Approved change, preserved behavior, and outside scope understood: `Yes`
- Every prospective blocking `Design Impact` finding is traceable to an approved requirement, acceptance criterion, or preserved-behavior ID: `Yes` — no blocking finding remains.
- Remaining material ambiguity, if any: None. `F-006` / `FIELD-F-002` is resolved as a mistaken-premise gap, not an open design decision.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Pass | Pass — Settings/Vue/store/Apollo path verified | Pass — DS-002/DS-003 separate default Analytics from preserved Run details | Confirmed | None |
| BEH-002 | User | Pass | Pass — current table plus sole-use cost chart verified | Pass — DS-002/DS-004 produce summary, trend, pace, attribution, and exact rows from one result | Confirmed | None |
| BEH-003 | Contract | Pass | Pass — current run-created/lifetime limitation plus first-empty/later-populated field lifecycle verified | Pass — daily observation-time projection, coverage marker, and DS-002/DS-005 remain coherent; SR-002 adds no new path | Confirmed | None |
| BEH-004 | Contract | Pass | Pass — current aggregate, nullable pricing, and mixed-currency semantics verified | Pass — shared aggregate extraction and server-owned cost quality preserve the contract | Confirmed | None |
| BEH-005 | User | Pass | Pass — current product has no analytics export | Pass — DS-003 derives deterministic local CSV from the applied successful result | Confirmed | None |
| BEH-006 | System | Pass | Pass — runtime event → store → accumulator → fold → run repository verified | Pass — DS-001/DS-006 extend the governing transaction only for `CHANGED` folds | Confirmed | None |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `ui-ux-spec.md` | Pass | Pass | Pass | Pass | Pass — approved intended-behavior authority | None |
| `prototype.html` | Pass | Pass | Pass | Pass | Pass — approved hierarchy/interaction reference; fixture is explicitly illustrative | None |
| `token-usage-analytics-data-contract.md` | Pass | Pass | Pass | Pass | Pass — approved field/read-contract constraint | None |
| `evidence/prototype-desktop.png` | Pass | Pass | Pass | Pass | Pass — validation evidence, not behavior authority | None |
| `evidence/prototype-mobile.png` | Pass | Pass | Pass | Pass | Pass — validation evidence, not behavior authority | None |
| User populated field screenshot `ctx_91a98260defe__image.png` | Pass | Pass | Pass | Pass | Pass — SR-002 lifecycle evidence only; older dark tab styling is superseded by CRR-009/IR-005 evidence | None |

The investigation notes contain the canonical supplement inventory, and each material supplement is linked from requirements and design with purpose, scope, status, and approval applicability.

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Design identifies a large feature with a persisted projection | None |
| Root-cause classification is explicit and evidence-backed | Pass | Boundary/ownership, placement drift, and limited shared-structure looseness are tied to current code | None |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Refactor-now is explicit; quota/history/cardinality concerns are intentionally deferred or residual | None |
| Refactor decision is supported by concrete design sections or residual-risk rationale | Pass | Separate write/read/UI owners, shared aggregate extraction, removal plan, and change sequence implement the decision | None |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | Ownership Is Clear? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary write | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Primary read/render | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Secondary view/export actions | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 | Return/render event | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-005 | Provider-local read plan | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-006 | Accumulator-local transaction | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-007 | Store-local request lifecycle | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

The primary spines extend from supported production triggers through meaningful outcomes; bounded-local spines add sequencing detail rather than replacing the end-to-end paths.

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Run admission / `TokenUsageRunAccumulator.recordObservation` | Pass | Pass | Pass | Pass | Store and event pipeline cannot write analytics directly |
| Analytics projection command / writer | Pass | Pass | Pass | Pass | Accumulator supplies only authoritative changed contribution; startup only initializes coverage |
| SQL analytics repository | Pass | Pass | Pass | Pass | Raw SQL/Prisma shapes remain behind domain snapshot/facet records |
| Analytics read / provider | Pass | Pass | Pass | Pass | Resolver and UI cannot bypass to repository or lifetime statistics |
| Frontend analytics store/view | Pass | Pass | Pass | Pass | Child charts consume one store result and do not query independently |
| Run details view | Pass | Pass | Pass | Pass | Preserved run store/query remain isolated from observation-time analytics |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Runtime → run store → accumulator | Pass | Pass | Pass | Pass | No repository/GraphQL dependency from runtime event code |
| Accumulator → fold/run repository/projection writer | Pass | Pass | Pass | Pass | One governing transaction, no duplicate admission policy |
| Projection writer → identity projection/repository | Pass | Pass | Pass | Pass | Domain canonicalization stays out of raw SQL caller code |
| Repository → Prisma/codecs | Pass | Pass | Pass | Pass | No comparison, display, or transport policy |
| Provider → range/repository/aggregate/display | Pass | Pass | Pass | Pass | Resolver remains transport-only |
| Web store → generated query/types → components | Pass | Pass | Pass | Pass | No Apollo calls from charts or server-policy reconstruction in UI |
| Analytics versus Run details | Pass | Pass | Pass | Pass | Explicitly forbids fallback or mixed date semantics |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `initializeCoverage(now)` | Pass | Pass | Pass | Low | Pass |
| Projection writer `record(tx, payload)` | Pass | Pass | Pass | Low | Pass |
| Repository `incrementFacet(tx, facet)` | Pass | Pass | Pass | Low | Pass |
| Repository `readSnapshot(plan)` | Pass | Pass | Pass | Low | Pass |
| Provider `getAnalytics(input)` | Pass | Pass | Pass | Low | Pass |
| GraphQL `tokenUsageAnalytics(input)` | Pass | Pass | Pass | Low | Pass |
| Pinia `fetch(selection)` | Pass | Pass | Pass | Low | Pass |
| CSV serializer | Pass | Pass | Pass | Low | Pass |
| Preserved run statistics queries | Pass | Pass | Pass | Low | Pass |

The input uses explicit half-open UTC instants and opaque provider/model keys; display labels do not become identities.

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Admission/dedup/pricing | Pass | Pass | N/A | Pass | Existing fold/accumulator remain authoritative |
| Atomic persistence | Pass | Pass | N/A | Pass | Existing Prisma transaction is extended |
| Accounting aggregate/SafeInt | Pass | Pass | N/A | Pass | Tight shared builder is extracted rather than duplicated |
| Identity display | Pass | Pass | N/A | Pass | Existing captured/custom/Unknown projection is extended |
| Schema rollout/readiness | Pass | Pass | N/A | Pass | Existing migration and fatal readiness path is extended |
| Visualization | Pass | Pass | N/A | Pass | Chart.js retained; feature-owned semantic charts replace sole-use wrapper |
| Observation-time history | Pass | Pass | Pass | Pass | A sibling projection is necessary because lifetime records cannot answer period usage |
| Frontend analytics lifecycle | Pass | Pass | Pass | Pass | A sibling store prevents mixed subjects and stale-response leakage |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Server token-usage accounting | Pass | Pass | Pass | Pass | Fold/run authority retained; only shared vocabulary extracted |
| Server token-usage analytics | Pass | Pass | Pass | Pass | Projection writer and read provider are distinct owners |
| SQL persistence/startup | Pass | Pass | Pass | Pass | Tables, readiness, coverage marker, and upsert have explicit owners |
| GraphQL token usage | Pass | Pass | Pass | Pass | Shared DTO plus separate analytics/run resolver subjects |
| Web analytics | Pass | Pass | Pass | Pass | Store/view/charts/export follow the approved hierarchy |
| Web Run details | Pass | Pass | Pass | Pass | Current workflow is repositioned without semantic reuse by Analytics |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Accounting token/cost fields and aggregate source | Pass | Pass | Pass | Pass | Domain-owned, not run- or GraphQL-specific |
| Cost-summary aggregation and SafeInt rules | Pass | Pass | Pass | Pass | One projection builder serves run and analytics sources |
| GraphQL cost DTO/mapper | Pass | Pass | Pass | Pass | Transport-only reuse |
| Frontend cost type/normalizer/fragment | Pass | Pass | Pass | Pass | Shared transport view model, not shared state |
| Formatting | Pass | Pass | Pass | Pass | Existing utility reused without gaining range/chart authority |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `TokenUsageAccountingSummarySource` | Pass | Pass | Pass | Pass | Only aggregate-consumed fields belong in the shared source |
| `TokenUsageAnalyticsDailyFacet` | Pass | Pass | Pass | Pass | One homogeneous identity/pricing/cache facet; no raw event/run/user content |
| Opaque provider/model/full/facet keys | Pass | Pass | Pass | Pass | Fixed, versioned, length-delimited canonical tuples avoid display/null ambiguity |
| `TokenUsageAnalyticsCostQuality` | Pass | Pass | Pass | Pass | One status enum; no overlapping booleans |
| Analytics result/buckets/breakdown | Pass | Pass | Pass | Pass | Transport result is distinct from persisted facets and generated client types remain authoritative |
| Coverage singleton | Pass | Pass | Pass | N/A | One persisted activation instant independent of first usage |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Responsibilities Were Re-Tightened After Shared-Structure Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Prisma schema + new migration | Pass | Pass | N/A | Pass | Physical tables/indexes only |
| Current-schema readiness + `server-runtime.ts` hook | Pass | Pass | N/A | Pass | Verify schema and initialize coverage before serving |
| Accounting-summary/run-record/analytics domain files | Pass | Pass | Pass | Pass | Shared, run, and analytics subjects are separated |
| Aggregate/run/contribution projection files | Pass | Pass | Pass | Pass | Shared aggregate, run adapter, and analytics mapping are distinct |
| Projection writer/range policy/accumulator | Pass | Pass | Pass | Pass | Lifecycle, pure read policy, and write governor remain distinct |
| Analytics repository + codec | Pass | Pass | Pass | Pass | Storage boundary and serialization validation are explicit |
| Analytics provider | Pass | Pass | Pass | Pass | One coherent read use case |
| GraphQL shared cost/run stats/analytics files | Pass | Pass | Pass | Pass | Transport reuse does not merge subjects |
| Web types/queries/stores for analytics and Run details | Pass | Pass | Pass | Pass | Each subject owns its contract/lifecycle |
| Page, Run details view, Analytics view | Pass | Pass | Pass | Pass | Page selects; children own workflows |
| Analytics control/coverage/cards/chart/breakdown components | Pass | Pass | Pass | Pass | Split by observable responsibility without artificial layers |
| CSV utility/localization/generated GraphQL | Pass | Pass | Pass | Pass | Each follows an established boundary |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Server `token-usage/domain` | Pass | Pass | Low | Pass | Pure semantic subjects |
| Server `token-usage/projections` | Pass | Pass | Low | Pass | Deterministic transforms/aggregates |
| Server `token-usage/services` and `providers` | Pass | Pass | Low | Pass | Write/policy control and read use cases follow local convention |
| Server `repositories/sql` | Pass | Pass | Low | Pass | Prisma/raw SQL isolated |
| Server GraphQL `types` | Pass | Pass | Medium | Pass | Existing flat convention is controlled by shared/run/analytics file split |
| Web token-usage analytics component folder | Pass | Pass | Low | Pass | One feature presentation depth |
| Web types/queries/stores | Pass | Pass | Low | Pass | Separate analytics and Run details subjects |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Embedded model-table chart | Pass | Pass | Pass | Pass | Exact Run details table remains |
| Sole-use `components/common/BarChart.vue` | Pass | Pass | Pass | Pass | Replaced by three purpose-owned chart components |
| Monolithic page-owned run workflow | Pass | Pass | Pass | Pass | Moved to Run details owner |
| Combined task/model web store/query naming | Pass | Pass | Pass | Pass | Renamed by preserved subject; public GraphQL names remain |
| Run-record-only shared accounting definitions | Pass | Pass | Pass | Pass | Moved to domain-owned accounting summary |
| Any proposed cumulative-row analytics fallback | Pass | Pass | Pass | Pass | Explicitly prohibited rather than implemented |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Analytics history | No | Pass | Pass | No raw-ledger read, guessed backfill, dual write, or lifetime fallback |
| Run details | No | Pass | Pass | Preserved approved behavior is not legacy compatibility machinery |
| Migration-owned old ledger declaration | No runtime retention | Pass | Pass | Remains isolated under existing skip-version migration ownership |
| Frontend chart path | No | Pass | Pass | Old embedded/sole-use chart is deleted |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? | Direct Use, Rebuild, Or Migration Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Existing `token_usage_run_records` | Directly Usable — No Migration | Pass | Pass | N/A | Pass | Current records remain authoritative/readable and cannot truthfully be backfilled into time buckets |
| New analytical facets/coverage | Additive empty schema; no application-data transformation | Pass | Pass | N/A | Pass | Checked-in Prisma migration, fatal schema readiness, and once-only pre-serve coverage initialization are explicit |

No historical data migration is authorized or needed. Atomic future writes share the current run transaction, and startup failure cannot silently enable divergent analytical writes.

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Shared accounting extraction | Pass | Pass | Pass | Pass |
| Schema/readiness/coverage/write projection | Pass | Pass | Pass | Pass |
| Read provider/GraphQL contract | Pass | Pass | Pass | Pass |
| Frontend contract/store/view split | Pass | Pass | Pass | Pass |
| Charts/export/localization | Pass | Pass | Pass | Pass |
| Final decommission | Pass | Pass | Pass | Pass |

The design explicitly prohibits leaving a temporary dual read/write or compatibility wrapper after the sequence.

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Atomic write/rollback | Yes | Pass | Pass | Pass | Good and asynchronous bad shapes are contrasted |
| Exact opaque identity | Yes | Pass | Pass | Pass | Label-as-identity and nullable unique tuples are rejected |
| Cost quality/mixed currency | Yes | Pass | Pass | Pass | Mixed/unpriced examples prevent false totals |
| UI ownership/chart reuse | Yes | Pass | Pass | Pass | Purpose-owned components are contrasted with universal optional-prop wrapper |
| Persisted history | Yes | Pass | Pass | Pass | Empty projection plus coverage is contrasted with fabricated backfill |
| Daily facet shape | Yes | Pass | N/A | Pass | Concrete domain shape exposes the storage/query inputs |

## Material Premise Validation (Only When Needed)

### MP-001 — Different runs can concurrently increment the same daily analytical facet

- Related approved requirement or established contract: REQ-013–REQ-016; AC-017–AC-020; current concurrent run execution contract.
- Relevant behavior ID(s): BEH-006.
- Initiating basis kind: `System`
- Independent product-supported initiating trigger or applicable governing contract: Two supported agent/runtime runs execute concurrently and each emits an admitted token observation on the same UTC day with the same analytical identity/pricing facet.
- Support evidence: Runtime observations are normal supported system events; the current `runQueues` map serializes by `runId`, so different run IDs are intentionally not in one in-process queue.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: Runtime adapters/event pipelines → `TokenUsageRunStore.recordObservation` → separate per-run accumulator work → `CHANGED` folds → both target the same `(bucketStart, facetKey)` row.
- Lifecycle preconditions and material consequence at the claimed point: Same-day/same-facet observations overlap across different runs; application read-modify-write could lose an increment and violate run/projection consistency.
- Reachability: `Reachable`
- Review consequence / proportionate response: The specified SQL `INSERT ... ON CONFLICT DO UPDATE` inside each enclosing run transaction is necessary and proportionate; application-level facet read/merge/save is correctly forbidden.

### MP-002 — Coverage can begin before the installation records its first analytical usage

- Related approved requirement or established contract: REQ-017–REQ-018; AC-021–AC-023; additive schema rollout/startup contract.
- Relevant behavior ID(s): BEH-003.
- Initiating basis kind: `Operational`
- Independent product-supported initiating trigger or applicable governing contract: A normal application upgrade/start initializes the new schema, after which the user may simply perform no token-producing run until a later time.
- Support evidence: `startConfiguredServer` runs checked-in Prisma migrations and current-schema checks before opening the HTTP listener; token observations require later supported runtime activity and are not guaranteed at startup.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: Upgrade/start → schema migration/readiness → coverage initialization → no usage interval → later Settings analytics query.
- Lifecycle preconditions and material consequence at the claimed point: No daily facet exists during a legitimately covered zero-usage interval; deriving coverage from the earliest facet would falsely label that interval unavailable.
- Reachability: `Reachable`
- Review consequence / proportionate response: One persisted, create-if-absent coverage singleton initialized after schema verification and before request serving is the minimal correct mechanism.

### MP-003 — Supported observations can have nullable provider/model identity fields

- Related approved requirement or established contract: REQ-005, REQ-013, REQ-016; AC-014, AC-017–AC-020; existing Unknown display contract.
- Relevant behavior ID(s): BEH-003, BEH-006.
- Initiating basis kind: `System`
- Independent product-supported initiating trigger or applicable governing contract: A supported runtime emits a valid normalized usage payload whose optional provider/model raw fields are absent while `runtime_kind` and usage accounting remain valid.
- Support evidence: `TokenUsageUpdatedPayload` and `createTokenUsageUpdatedPayload` explicitly allow null provider/model fields, and current UI/domain behavior has Unknown fallbacks.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: Runtime observation → payload normalization with null optional identity fields → fold `CHANGED` → analytical contribution projection → daily facet uniqueness/filter identity.
- Lifecycle preconditions and material consequence at the claimed point: SQLite unique tuples containing nullable columns can admit duplicate logical rows, splitting totals and creating unstable filters.
- Reachability: `Reachable`
- Review consequence / proportionate response: Versioned, non-null canonical digest keys plus retained raw nullable snapshots are proportionate and avoid both nullable uniqueness and label-as-identity errors.

### MP-004 — A post-coverage contribution existed before the observed first-run empty Analytics query

- Related approved requirement or established contract: REQ-013–REQ-018; AC-017–AC-023; approved no-backfill and coverage-state contract.
- Relevant behavior ID(s): BEH-003, BEH-006.
- Initiating basis kind: `User`
- Independent product-supported initiating trigger or applicable governing contract: The user opens Settings > Token Statistics immediately after the additive analytics schema/coverage activation, before any later runtime contribution has been admitted.
- Support evidence: The exposed surface is Settings > Token Statistics and the supported action is opening Analytics. The persisted coverage start is `2026-08-22T10:52:04.812Z`; the field diagnosis distinguishes 26.27B retained lifetime tokens from initially absent post-coverage facets. Later live GraphQL/browser results and the user screenshot show post-coverage contributions in the August 22 bucket, growing from 1.07M/6 reports to 10.26M/53 reports and then 87.94M/one active day.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: Upgrade/start → additive schema and coverage initialization → user opens Analytics before any post-coverage token observation → analytics query reads zero daily facets and reports coverage state; later runtime observations → accumulator/fold `CHANGED` → atomic daily-facet increments → subsequent Analytics query renders non-zero usage.
- Lifecycle preconditions and material consequence at the claimed point: The initial query had no supported post-coverage contribution to render. Retained lifetime rows are intentionally owned by Run details and cannot establish observation-time monthly allocation.
- Reachability: `Not Reachable` for the claimed observed precondition: the verified first-run lifecycle had no admitted post-coverage contribution before the empty query. The initial empty pre-contribution state itself is `Reachable` and approved; abstract future implementation defects are not inferred from it.
- Review consequence / proportionate response: The mistaken premise cannot drive a finding or new machinery. Do not add a retained-lifetime snapshot/table, dynamic lifetime merge, guessed backfill, polling, or refresh spine under F-006. Preserve coverage-aware empty/partial/unavailable behavior and the existing Run details lifetime path.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Pass` — SR-002 resolves F-006 without changing approved behavior or design. The round-1 structural verdict remains valid, persisted-data handling remains proportionate, and the withdrawn retained-lifetime/polling machinery is neither required nor authorized.

## Findings

None.

## Classification

N/A — no finding.

## Recommended Recipient

`/implementation_engineer`

## Residual Risks

- Arbitrary custom identity and pricing-signature cardinality can increase facet and exact-breakdown volume. This is a reachable but currently proportionately mitigated operational risk through daily homogeneous facets, indexes, SQL aggregation, and no raw-event retention; it does not authorize merging distinct identities. Implementation evidence should measure representative query/write behavior.
- Extreme aggregate volume can exceed GraphQL SafeInt. The design correctly requires checked conversion and explicit failure rather than rounding; downstream implementation and coverage should exercise the boundary.
- SQLite cross-run write contention can still surface transactional busy/timeout errors under sufficiently heavy local concurrency. Atomic rollback preserves correctness; performance/timeout behavior remains an implementation and executable-coverage concern, not a reason for best-effort divergence.
- Cost-mode presentation is sensitive to partial/missing/local/mixed-currency combinations. The server-owned quality contract and exact currency-partitioned rows are sound, but rendered and executable coverage must verify that no false zero or combined currency slips through.
- Prototype values are illustrative. Implementation must remain generated-contract-driven and must not copy fixture arithmetic.
- Pre-coverage monthly distribution remains unknowable. The product must continue to distinguish unavailable/partial coverage from covered zero usage; retained lifetime totals remain available only through Run details.
- The downstream stale-mounted-result subtype mentioned in API-REV-004 was not the observed F-006 lifecycle and is not an approved automatic-refresh requirement; it does not drive this design revision.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass`
- Notes: `ARCH-REV-002` confirms `SR-002` has no design impact and resolves `F-006` / `FIELD-F-002` as a mistaken-premise gap. No implementation of the withdrawn lifetime proposal is authorized; the existing IR-005 implementation should resume the normal source/API-E2E verification chain.
