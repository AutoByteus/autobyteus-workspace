# Design Spec

## Round 2 Revision Notes

This design revision resolves architecture review round 1 findings:

- AR-001: MVP range UI is now static `Usage during period` help text only. The UI prototype, behavior matrix, and GraphQL candidate shape no longer include a range-mode selector or `rangeMode` argument. `Tasks created in period` remains future-only.
- AR-002: Shared aggregation is now an identity-free token/cost/cache aggregate core plus a run-summary adapter. Runtime/model diagnostics compose the aggregate under runtime/model identity and never reuse run/team/member identity fields.

## Current-State Read

Settings > Token Statistics currently has one historical reporting path:

`TokenUsageStatistics.vue -> tokenUsageStatistics Pinia store -> usageStatisticsInPeriod GraphQL -> TokenUsageStatisticsProvider.getStatisticsPerModel -> TokenUsageLedgerStore.listEventsInPeriod -> SqlTokenUsageLedgerRepository.listEventsInPeriod -> token_usage_ledger_events`

Current behavior is model-first. `TokenUsageStatisticsProvider` groups ledger records by `model_identifier ?? model_value ?? "unknown"`; GraphQL exposes `llmModel`, `promptTokens`, `assistantTokens`, `reasoningTokens`, and cost fields; the frontend renders one row per model.

The accounting foundation already supports the desired task view:

- `TokenUsageLedgerEvent` stores run/team/member identities (`runId`, `rootTeamRunId`, `memberAgentRunId`, `memberRouteKey`), runtime/model fields, workspace/agent fields, token/cache/reasoning fields, price/cost/status fields, and `observedAt`.
- `TokenUsageLedgerStore` already exposes focused summaries for agent runs, team runs, and team members.
- Its current private summary logic already calculates correct cache-aware token/cost totals, but it is bound to `TokenUsageRunSummaryPayload`, which includes run/team/member identity fields.
- Run-history catalog/metadata services already own human-readable labels: agent/team names, summaries, workspaces, created times, and team member tree metadata.

The current design gap is reporting projection, not ledger persistence or price calculation:

1. task/run reporting is missing;
2. model diagnostics collapse different runtimes that share the same model name;
3. reusable aggregation must be extracted without forcing runtime/model rows to inherit run-summary identity fields.

## Intended Change

Add a task-first historical statistics experience.

- `By Task` tab is default.
  - Top-level rows are standalone agent runs and root team runs.
  - Team rows expand to member rows.
  - Member usage is not also shown as a standalone top-level row.
  - Default sort is `Created Time` descending.
  - Date semantics are static `Usage during period`: ledger events observed in the selected date range.
- `By Model` tab remains secondary diagnostics.
  - Rows are grouped by runtime/model pair.
  - Runtime is a visible column.
  - Cache-aware input and output/reasoning semantics are displayed.

MVP does not include a range-mode dropdown or `Tasks created in period` behavior.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Feature / product UX improvement with targeted projection refactor.
- Current design issue found (`Yes`/`No`/`Unclear`): Yes at the reporting projection/shared-structure layer; no issue in core ledger/cost accounting.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Shared Structure Looseness if the existing run-summary DTO is reused for runtime/model diagnostics; otherwise the product issue is a missing task-oriented projection.
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes, targeted: extract identity-free aggregate calculation and adapt it into run summaries where run identity is meaningful.
- Evidence:
  - Existing `statistics-provider.ts` groups by model only.
  - Existing `TokenUsageLedgerStore.buildSummary` combines both metric aggregation and run/team/member identity projection.
  - Runtime/model diagnostics are not run/team/member subjects.
  - Requirements explicitly require `Codex + gpt-5.5` and `Autobyteus + gpt-5.5` to remain separate.
- Design response:
  - Keep `TokenUsageStatisticsProvider` as authoritative owner of historical statistics projections.
  - Extract `TokenUsageCostSummaryAggregate` and `buildTokenUsageCostSummaryAggregate(events)` as the identity-free core.
  - Add a run-summary adapter `buildTokenUsageRunSummary(...)` that composes the aggregate with run/team/member identity for existing focused summary queries.
  - Compose `TokenUsageTaskStatisticsRow` and `TokenUsageRuntimeModelStatisticsRow` around explicit subject identities plus the aggregate.
- Refactor rationale:
  - Prevents duplicated cost/cache math.
  - Prevents runtime/model rows from carrying false `run_id`/`member_*` meanings.
- Intentional deferrals and residual risk:
  - `Tasks created in period` full-lifetime mode is future-only.
  - CSV export and per-turn/per-call drilldown are future-only.
  - Very large date ranges may need repository-level grouping later; current MVP follows existing in-memory period read behavior.

## Terminology

- `TokenUsageCostSummaryAggregate`: identity-free token/cost/cache aggregate for a set of ledger events. It contains metric components, cost components, status/currency, missing price dimensions, pricing metadata, event count, latest observed timestamp, and observed runtime/model sets. It contains no `runId`, `rootTeamRunId`, `memberRouteKey`, or row identity.
- `Run summary adapter`: composes a `TokenUsageCostSummaryAggregate` with run/team/member identity and latest event identity fields to produce the existing `TokenUsageRunSummaryPayload` for focused summary queries.
- `Task row`: a `By Task` top-level row with explicit subject identity (`TEAM_RUN` or `AGENT_RUN`) plus an aggregate.
- `Member row`: a child row under a team row with explicit member identity plus an aggregate.
- `Runtime/model row`: a `By Model` row with explicit `{ runtimeKind, modelIdentifier }` identity plus an aggregate.
- `Usage during period`: static MVP date semantics; ledger events are filtered by `observedAt`.

## Design Reading Order

1. data-flow spines;
2. authoritative provider boundary;
3. identity-free aggregate core and run-summary adapter;
4. task/runtime-model DTO composition;
5. GraphQL and frontend tables.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action:
  - Replace model-only grouping with runtime/model grouping.
  - Remove private-only `TokenUsageLedgerStore.buildSummary` as a monolithic identity+metric builder.
  - Replace the model-only Settings default view with task-first tabs.
  - Remove old UI wording `Prompt Tokens` / `Assistant Tokens` from Settings stats display in favor of `Input Tokens` / `Output Tokens`.
- Explicit rejection:
  - Do not add a fake `Tasks created in period` selector for MVP.
  - Do not add a `rangeMode` GraphQL argument for MVP.
  - Do not use a run/team/member summary DTO as the shared runtime/model diagnostics shape.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Settings `By Task` fetch | Rendered task/team/member rows | `TokenUsageStatisticsProvider` | Main user path for task cost. |
| DS-002 | Primary End-to-End | Settings `By Model` fetch | Rendered runtime/model diagnostics | `TokenUsageStatisticsProvider` | Preserves diagnostics without runtime ambiguity. |
| DS-003 | Bounded Local | Ledger event group | Identity-free aggregate | `TokenUsageCostSummaryAggregateBuilder` | Shared cost/cache/token math. |
| DS-004 | Bounded Local | Identity-free aggregate + run identity | Existing run summary payload | `TokenUsageRunSummaryAdapter` | Keeps existing focused summaries coherent without polluting aggregate core. |
| DS-005 | Bounded Local | Task/member group identity | Human-readable display metadata | `TokenUsageRunHistoryEnricher` | Correct names, summaries, created-time source, and fallback labels. |

## Primary Execution Spine(s)

### DS-001 — By Task statistics

`Settings Token Statistics UI -> tokenUsageStatistics store -> tokenUsageTaskStatisticsInPeriod GraphQL query -> TokenUsageStatisticsResolver -> TokenUsageStatisticsProvider.getTaskStatisticsInPeriod -> TokenUsageLedgerStore.listEventsInPeriod -> task/team/member grouping -> buildTokenUsageCostSummaryAggregate -> TokenUsageRunHistoryEnricher -> task/member row DTOs -> Task table`

### DS-002 — Runtime/model diagnostics

`Settings Token Statistics UI -> tokenUsageStatistics store -> usageStatisticsInPeriod GraphQL query -> TokenUsageStatisticsResolver -> TokenUsageStatisticsProvider.getStatisticsPerRuntimeModel -> TokenUsageLedgerStore.listEventsInPeriod -> runtime/model grouping -> buildTokenUsageCostSummaryAggregate -> runtime/model row DTOs -> Model table/chart`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The Settings task view requests period statistics. The provider groups events into standalone-agent and team-run subjects, creates member groups under each team, builds one identity-free aggregate per row subject, enriches display metadata from run history, and returns rows. | UI, store, resolver, provider, ledger store, aggregate builder, enricher | `TokenUsageStatisticsProvider` | Aggregate builder, run-history enricher, fallback labels. |
| DS-002 | The model view requests period diagnostics. The provider groups events by runtime/model pair, builds an aggregate for each pair, and returns rows keyed by explicit runtime/model identity. | UI, store, resolver, provider, ledger store, aggregate builder | `TokenUsageStatisticsProvider` | Runtime/model key normalization, chart labels. |
| DS-003 | For any event group, the aggregate builder sums tokens, cache components, costs, status, currency, missing price dimensions, event count, and observed descriptor sets. | Aggregate builder | `TokenUsageCostSummaryAggregateBuilder` | Currency/status helpers, cache-state summary. |
| DS-004 | Existing focused summary queries pass run/team/member identity and events to a run-summary adapter. The adapter builds the aggregate, reads latest event identity fields, and returns the existing `TokenUsageRunSummaryPayload`. | Run-summary adapter | `TokenUsageRunSummaryAdapter` | Latest event identity mapping. |
| DS-005 | The enricher resolves display metadata for task/member identities and marks whether time is true run-history creation time or first observed usage. | Run-history enricher | `TokenUsageRunHistoryEnricher` | Public run-history catalog/metadata services. |

## Spine Actors / Main-Line Nodes

| Node | Role |
| --- | --- |
| `TokenUsageStatistics.vue` | Settings page shell: date controls, static range-help label, tabs, loading/error/empty state. |
| `tokenUsageStatistics` Pinia store | Frontend query/state owner for task rows and runtime/model rows. |
| `TokenUsageStatisticsResolver` | GraphQL transport boundary and mapper. |
| `TokenUsageStatisticsProvider` | Governing historical statistics projection owner. |
| `TokenUsageLedgerStore` | Ledger read boundary; lists period events and focused summary inputs. |
| `TokenUsageCostSummaryAggregateBuilder` | Identity-free metric/cost aggregation owner. |
| `TokenUsageRunSummaryAdapter` | Existing focused run/team/member summary shape adapter. |
| `TokenUsageRunHistoryEnricher` | Display metadata and created-time fallback owner. |

## Ownership Map

| Node | Owns |
| --- | --- |
| `TokenUsageStatistics.vue` | UI composition and interaction state only. It does not own grouping or cost math. |
| `tokenUsageStatistics` store | Apollo query execution and frontend state normalization. It does not recalculate costs. |
| `TokenUsageStatisticsResolver` | GraphQL schema mapping only. It delegates to provider. |
| `TokenUsageStatisticsProvider` | Historical period grouping, double-count prevention, runtime/model grouping. |
| `TokenUsageLedgerStore` | Ledger event reads/writes and existing focused summary query orchestration. |
| `TokenUsageCostSummaryAggregateBuilder` | Identity-free aggregation policy over event groups. |
| `TokenUsageRunSummaryAdapter` | Composition of aggregate + run/team/member identity into `TokenUsageRunSummaryPayload`. |
| `TokenUsageRunHistoryEnricher` | Metadata lookup, created-time source selection, fallback labels. |

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `TokenUsageStatisticsResolver` | `TokenUsageStatisticsProvider` | GraphQL transport and type mapping. | Ledger grouping, run-history enrichment, cost aggregation. |
| `TokenUsageStatistics.vue` | Store/provider path | Settings visual shell. | Backend cost or grouping policy. |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Model-only grouping helper | Collapses same model across runtimes. | Runtime/model grouping in `TokenUsageStatisticsProvider`. | In This Change | Key is `{ runtimeKind, modelIdentifier }`. |
| Monolithic private `TokenUsageLedgerStore.buildSummary` | Mixes metric aggregation with run identity and cannot be shared with runtime/model diagnostics. | Aggregate builder + run-summary adapter. | In This Change | Existing public summary methods remain. |
| Single default model-only Settings table | Does not answer task/run cost. | Task-first tabs. | In This Change | `By Model` stays secondary. |
| Fake range-mode selector / `rangeMode` query input | MVP supports only `Usage during period`. | Static help label; future follow-up for created-period mode. | In This Change | Must not render `Tasks created in period` option. |

## Return Or Event Spine(s) (If Applicable)

No async event spine is in scope. These are GraphQL request/response reads.

## Bounded Local / Internal Spines (If Applicable)

### DS-003 — Aggregate core

Parent owner: `TokenUsageCostSummaryAggregateBuilder`

`Event group -> token sums -> cache component sums/rates/state -> output/reasoning sums -> nullable cost sums -> currency/status/missing-dimension summary -> observed runtime/model descriptor sets -> aggregate`

### DS-004 — Run-summary adapter

Parent owner: `TokenUsageRunSummaryAdapter`

`Run/team/member identity + event group -> build aggregate -> read latest event identity/context fields -> TokenUsageRunSummaryPayload`

### DS-005 — Metadata enrichment

Parent owner: `TokenUsageRunHistoryEnricher`

`Task/member identity -> catalog lookup -> metadata lookup -> created-time source decision -> display metadata/fallbacks`

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Identity-free aggregation | DS-001, DS-002, DS-003 | Statistics provider, ledger store | Shared token/cost/cache aggregation. | Prevent duplicated math. | Runtime/model rows inherit false run identity or recalculate incorrectly. |
| Run-summary adaptation | DS-004 | Ledger store focused summary methods | Existing GraphQL summary payload compatibility by composition, not compatibility wrapper. | Existing focused summary APIs need run identity fields. | Aggregate core becomes polluted by run fields. |
| Run-history metadata enrichment | DS-001, DS-005 | Statistics provider | Resolve display names, summaries, workspaces, created times. | Ledger events do not own labels. | Provider becomes a metadata blob or UI guesses labels. |
| Runtime/model key normalizer | DS-002 | Statistics provider | Normalize missing runtime/model values and keep pair identity. | Same model can have different runtimes. | Costs collapse incorrectly. |
| Frontend formatting | DS-001, DS-002 | UI tables/details | Display tokens/cost/status/cache sublines. | Keeps UI display-only. | UI may recalculate or hide backend status semantics. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Period ledger events | `TokenUsageLedgerStore` | Reuse | Existing period read supports MVP. | N/A |
| Token/cost/cache aggregation | private `TokenUsageLedgerStore.buildSummary` | Extend by extraction | Correct policy exists but is currently identity-specific. | New extracted files are ownership tightening, not new policy. |
| Run/team metadata | run-history catalog/metadata services | Reuse | They own names/summaries/created times/member tree. | N/A |
| GraphQL token usage boundary | `TokenUsageStatisticsResolver` | Extend | Existing token usage stats entrypoint. | N/A |
| Frontend formatting | `tokenUsageFormatting.ts` | Reuse/extend | Existing cost/status/cache display rules. | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `token-usage/projections` | Aggregate builder and run-summary adapter. | DS-003, DS-004 | Provider, ledger store | Extend | Projection folder already exists. |
| `token-usage/providers` | Historical statistics provider and run-history enricher. | DS-001, DS-002, DS-005 | GraphQL resolver | Extend | Provider stays authoritative. |
| `token-usage/domain` | Statistics DTOs and aggregate type if not colocated with builder. | DS-001, DS-002 | Provider/resolver | Extend | Keep subject identity explicit. |
| `run-history` | Metadata source. | DS-005 | Enricher | Reuse | Use public services only. |
| `api/graphql/types` | Schema and transport mapping. | DS-001, DS-002 | UI/store | Extend | No direct ledger/run-history composition. |
| `autobyteus-web/settings` | Page shell and tables. | DS-001, DS-002 | User UI | Extend/split | Task-first UI. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `token-usage/projections/token-usage-cost-summary-aggregate.ts` | token-usage projections | Aggregate core | Define `TokenUsageCostSummaryAggregate` and `buildTokenUsageCostSummaryAggregate(events)`. | Single identity-free aggregation policy. | Event payload types. |
| `token-usage/projections/token-usage-run-summary-adapter.ts` | token-usage projections | Run-summary adapter | Compose aggregate + run/team/member identity into `TokenUsageRunSummaryPayload`. | Keeps identity adapter separate. | Aggregate core. |
| `token-usage/domain/statistics-models.ts` | token-usage domain | Statistics DTOs | Task rows, member rows, runtime/model rows. | Subject-specific identities stay explicit. | Aggregate type. |
| `token-usage/providers/token-usage-run-history-enricher.ts` | token-usage providers | Metadata enricher | Display metadata/fallbacks. | Separate from grouping and aggregation. | Run-history services. |
| `token-usage/providers/statistics-provider.ts` | token-usage providers | Historical projection owner | Group period events into task rows and runtime/model rows. | Existing owner for stats. | Aggregate builder/enricher. |
| `token-usage/providers/token-usage-ledger-store.ts` | token-usage provider/store | Ledger boundary | Delegate existing summaries to run-summary adapter. | Preserves public summary methods. | Run-summary adapter. |
| `api/graphql/types/token-usage-stats.ts` | GraphQL | Transport boundary | Add task stats query/types and runtime/model fields. | Existing file. | Provider DTOs. |
| `autobyteus-web/components/settings/token-usage/*` | frontend settings | Tables/details | Task table, model table, cost breakdown. | Avoid one large mixed component. | Formatter/types. |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Token/cost/cache aggregation | `token-usage-cost-summary-aggregate.ts` | token-usage projections | Used by task rows, model rows, and run-summary adapter. | Yes | Yes | A run/team/member identity DTO. |
| Existing focused run summary | `token-usage-run-summary-adapter.ts` | token-usage projections | Existing GraphQL summaries need old payload shape. | Yes | Yes | A generic row model for diagnostics. |
| Task/runtime-model DTOs | `statistics-models.ts` | token-usage domain | Provider/resolver need typed row contracts. | Yes | Yes | A mixed generic list without subject identity. |
| Created-time source | field on task/member DTOs | token-usage domain/provider | UI must distinguish true created time from fallback. | Yes | Yes | Implicit tooltip-only behavior. |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `TokenUsageCostSummaryAggregate` | Yes | Yes | Low | Keep no run/team/member identity fields. |
| `TokenUsageRunSummaryPayload` | Yes for focused summaries | N/A existing | Low if only used via adapter | Do not use it for runtime/model rows. |
| `TokenUsageTaskStatisticsRow` | Yes | Yes | Low | Compose `{ rowKind, IDs, metadata, aggregate }`. |
| `TokenUsageRuntimeModelStatisticsRow` | Yes | Yes | Low | Compose `{ runtimeKind, modelIdentifier, aggregate }`. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/token-usage/projections/token-usage-cost-summary-aggregate.ts` | token-usage projections | Aggregate core | Identity-free token/cache/cost aggregation over event groups. | Prevents duplicated math and false identity fields. | `TokenUsageUpdatedPayload`. |
| `autobyteus-server-ts/src/token-usage/projections/token-usage-run-summary-adapter.ts` | token-usage projections | Run-summary adapter | Existing `TokenUsageRunSummaryPayload` composition. | Keeps focused summary shape separate from aggregate core. | Aggregate core. |
| `autobyteus-server-ts/src/token-usage/domain/statistics-models.ts` | token-usage domain | DTO contracts | Task/member/runtime-model row types and created-time source type. | Subject-specific contracts. | Aggregate type. |
| `autobyteus-server-ts/src/token-usage/providers/token-usage-run-history-enricher.ts` | token-usage providers | Metadata enricher | Names/summaries/workspaces/created-time/member labels. | Metadata-only owner. | Public run-history services. |
| `autobyteus-server-ts/src/token-usage/providers/statistics-provider.ts` | token-usage providers | Historical statistics provider | Period grouping, no-double-count task rows, runtime/model rows. | Existing authoritative stats owner. | Aggregate builder/enricher. |
| `autobyteus-server-ts/src/token-usage/providers/token-usage-ledger-store.ts` | token-usage providers | Ledger boundary | Existing focused summary methods delegate to run-summary adapter. | Keeps public API stable while removing private monolith. | Run-summary adapter. |
| `autobyteus-server-ts/src/api/graphql/types/token-usage-stats.ts` | GraphQL | Transport mapper | Task stats object types/query, runtime/model fields, aggregate GraphQL type. | Existing token usage GraphQL boundary. | Provider DTOs. |
| `autobyteus-web/graphql/queries/token_usage_statistics_queries.ts` | frontend GraphQL | Query definitions | Task stats query without `rangeMode`; model stats with runtime/cache fields. | Existing query file. | Generated types. |
| `autobyteus-web/stores/tokenUsageStatistics.ts` | frontend store | State owner | Task/model fetches, loading/error state. | Existing store. | Generated types. |
| `autobyteus-web/types/tokenUsageStatistics.ts` | frontend types | UI row contracts | UI row, sort, expansion, created-time source types. | Keeps components clean. | GraphQL/generated types. |
| `autobyteus-web/components/settings/TokenUsageStatistics.vue` | frontend page shell | Settings section | Date controls, static `Usage during period` help, tabs, state routing. | Existing page entry. | Child components. |
| `autobyteus-web/components/settings/token-usage/TokenUsageTaskStatisticsTable.vue` | frontend UI | Task table | Sort/expand/detail rows. | Table-specific interaction. | Formatter/types. |
| `autobyteus-web/components/settings/token-usage/TokenUsageModelStatisticsTable.vue` | frontend UI | Runtime/model table | Diagnostics table/chart. | Secondary view isolation. | Formatter/types. |
| `autobyteus-web/components/settings/token-usage/TokenUsageCostBreakdown.vue` | frontend UI | Detail panel | Input/cache/output/thinking/missing-price breakdown. | Shared details display. | Aggregate fields. |
| localization files | frontend copy | User-facing labels | Tabs, static range help, statuses, fallback copy. | Existing copy system. | N/A |

## Ownership Boundaries

- GraphQL resolver delegates to `TokenUsageStatisticsProvider` and maps DTOs only.
- `TokenUsageStatisticsProvider` owns period grouping, task/member double-count prevention, and runtime/model grouping.
- `TokenUsageCostSummaryAggregateBuilder` owns metric aggregation, not row identity.
- `TokenUsageRunSummaryAdapter` owns existing run summary payload composition, not generic diagnostics.
- Run-history services remain authoritative for metadata and are accessed through `TokenUsageRunHistoryEnricher`.
- Frontend components render and sort only; they do not compute backend prices.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `TokenUsageStatisticsProvider` | Ledger grouping, aggregate builder, enricher | GraphQL resolver | Resolver queries ledger repository and run-history stores directly. | Add provider DTO/method. |
| `TokenUsageLedgerStore` | SQL repository and run-summary adapter usage | Provider/focused summary queries | Provider calls SQL repository directly. | Add store method. |
| `TokenUsageCostSummaryAggregateBuilder` | Aggregation helpers | Provider and run-summary adapter | Provider duplicates sum/cost/cache logic. | Extend aggregate core. |
| Run-history catalog/metadata services | JSON stores | Enricher | Enricher reads raw stores directly. | Add service method. |
| `tokenUsageStatistics` frontend store | Apollo query execution | Settings components | Components call Apollo directly. | Add store action. |

## Dependency Rules

Allowed:

- Resolver -> statistics provider.
- Statistics provider -> ledger store, aggregate builder, run-history enricher.
- Ledger store -> SQL repository and run-summary adapter.
- Run-summary adapter -> aggregate builder.
- Run-history enricher -> public run-history services.
- Settings page -> Pinia store and child table components.

Forbidden:

- Runtime/model row -> `TokenUsageRunSummaryPayload` identity fields.
- GraphQL resolver -> ledger repository or run-history stores directly.
- Frontend -> local price calculation from token counts.
- Model grouping by model alone.
- Member usage as both team child and standalone top-level row.
- MVP query -> `rangeMode` variable.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `buildTokenUsageCostSummaryAggregate(events)` | Identity-free aggregate | Compute metric/cost/cache aggregate. | Event group only. | No run/team/member IDs. |
| `buildTokenUsageRunSummary({ runId, rootTeamRunIdOverride?, events })` | Run/team/member summary | Existing focused summary payload. | Explicit run/team/member identity input. | Composes aggregate. |
| `TokenUsageStatisticsProvider.getTaskStatisticsInPeriod(startDate, endDate)` | Task statistics | Return task/member rows for observed period. | Date range only. | No range mode in MVP. |
| `TokenUsageStatisticsProvider.getStatisticsPerRuntimeModel(startDate, endDate)` | Runtime/model diagnostics | Return runtime/model rows. | Date range only. | Group by runtime/model pair. |
| `tokenUsageTaskStatisticsInPeriod(startTime, endTime)` GraphQL | Task statistics | Settings `By Task` data. | `startTime + endTime`. | No `rangeMode`. |
| `usageStatisticsInPeriod(startTime, endTime)` GraphQL | Runtime/model diagnostics | Settings `By Model` data. | `startTime + endTime`. | Include `runtimeKind`. |
| Focused summary queries | Run/team/member summary | Existing focused Token Meter summaries. | Existing explicit run/team/member args. | Use run-summary adapter. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `buildTokenUsageCostSummaryAggregate` | Yes | Yes, identity-free by design | Low | Keep no row identity fields. |
| `buildTokenUsageRunSummary` | Yes | Yes | Low | Keep focused-summary only. |
| `tokenUsageTaskStatisticsInPeriod` | Yes | Yes | Low | Date range only. |
| `usageStatisticsInPeriod` | Yes | Yes if runtime included | Low | Runtime/model grouping. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Aggregate core | `TokenUsageCostSummaryAggregate` | Yes | Low | Do not call it run summary. |
| Run-summary adapter | `TokenUsageRunSummaryAdapter` / `buildTokenUsageRunSummary` | Yes | Low | Keep focused summary responsibility. |
| Historical provider | `TokenUsageStatisticsProvider` | Yes | Low | Existing stats owner. |
| Metadata enricher | `TokenUsageRunHistoryEnricher` | Yes | Medium | Keep metadata-only. |

## Applied Patterns (If Any)

- Projection builder: identity-free aggregate builder for event groups.
- Adapter: run-summary adapter composes aggregate into existing focused run/team/member summary shape.
- Repository: existing SQL ledger repository remains persistence adapter.
- Transport mapper: GraphQL resolver maps provider DTOs to schema types.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/token-usage/projections/token-usage-cost-summary-aggregate.ts` | File | Aggregate core | Identity-free event aggregation. | Projection from ledger events to metrics. | Run/team/member IDs. |
| `autobyteus-server-ts/src/token-usage/projections/token-usage-run-summary-adapter.ts` | File | Run summary adapter | Compose aggregate with run identity. | Adapter around existing payload. | Runtime/model diagnostics rows. |
| `autobyteus-server-ts/src/token-usage/domain/statistics-models.ts` | File | DTO contracts | Task/member/model row contracts. | Subject identities are explicit. | UI formatting. |
| `autobyteus-server-ts/src/token-usage/providers/token-usage-run-history-enricher.ts` | File | Metadata enrichment | Run-history display metadata. | Provider support concern. | Cost aggregation. |
| `autobyteus-web/components/settings/token-usage/` | Folder | Settings token usage UI | Task/model tables and detail panel. | Keeps page shell slim. | Apollo queries or cost math. |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `token-usage/projections` | Off-Spine Concern | Yes | Low | Owns reusable event projections. |
| `token-usage/providers` | Main-Line Domain-Control | Yes | Low | Owns historical stats projection. |
| `token-usage/domain` | Domain contracts | Yes | Low | Owns row/aggregate DTO contracts. |
| `api/graphql/types` | Transport | Yes | Medium | Existing large file; keep only mapping. |
| `components/settings/token-usage` | UI feature subfolder | Yes | Low | Task/model/detail split is meaningful. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Identity-free aggregate | `aggregate = buildTokenUsageCostSummaryAggregate(events)` returns `{ grossInputTokens, cacheReadInputTokens, outputTokens, estimatedApiTotalCost, apiCostStatus, observedRuntimeKinds, observedModelIdentifiers }` | `aggregate` returns `{ runId, memberRouteKey, rootTeamRunId, ...metrics }` | Runtime/model rows are not run/member subjects. |
| Runtime/model row | `{ runtimeKind: "codex_app_server", modelIdentifier: "gpt-5.5", aggregate }` | `{ runId: "codex:gpt-5.5", memberRouteKey: null, summaryTotals: TokenUsageRunSummaryPayload }` | Prevents pseudo IDs and false identity semantics. |
| Focused run summary | `buildTokenUsageRunSummary({ runId, events })` -> existing `TokenUsageRunSummaryPayload` | Runtime/model diagnostics reuse `TokenUsageRunSummaryPayload` | Existing summaries keep identity; diagnostics stay identity-specific. |
| MVP range UI | Date range + static `Usage during period` help text | Dropdown with `Tasks created in period` disabled or fake behavior | Avoids ambiguous unimplemented mode. |
| Team grouping | Team row by `rootTeamRunId`, members only as children | Member usage also appears as standalone top-level rows | Prevents double counting. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep model-only grouping and add runtime as subtext | Smaller change. | Rejected | Runtime/model pair grouping. |
| Duplicate private `buildSummary` math in stats provider | Fast implementation. | Rejected | Identity-free aggregate core. |
| Use `TokenUsageRunSummaryPayload` for runtime/model rows | Reuses existing GraphQL fields. | Rejected | Runtime/model row composes aggregate under runtime/model identity. |
| Add range-mode dropdown now | Anticipates future full-task mode. | Rejected | Static `Usage during period` text only. |
| Show team members as standalone rows and children | Easier list construction. | Rejected | Members only under team row. |

## Derived Layering (If Useful)

- UI: Settings page, task/model tables, formatting/localization.
- GraphQL transport: resolver/types.
- Projection/provider: statistics provider, run-history enricher.
- Projection core: aggregate builder and run-summary adapter.
- Persistence/read: ledger store/repository and run-history services.

Layering is explanatory only; ownership boundaries above are authoritative.

## Migration / Refactor Sequence

1. Add `TokenUsageCostSummaryAggregate` and `buildTokenUsageCostSummaryAggregate(events)`.
2. Add `buildTokenUsageRunSummary(...)` adapter and move existing `TokenUsageLedgerStore.buildSummary` identity-specific output into it.
3. Update `TokenUsageLedgerStore` existing focused summary methods to delegate to the adapter.
4. Add statistics DTOs that compose explicit identities with the aggregate:
   - task row identity + aggregate;
   - member row identity + aggregate;
   - runtime/model identity + aggregate.
5. Add `TokenUsageRunHistoryEnricher` for display metadata and created-time fallback.
6. Extend `TokenUsageStatisticsProvider` with task grouping and runtime/model grouping.
7. Extend GraphQL types/queries:
   - `tokenUsageTaskStatisticsInPeriod(startTime, endTime)`;
   - runtime field/cache fields on model diagnostics;
   - no `rangeMode` argument.
8. Update frontend queries and regenerate generated GraphQL types.
9. Refactor Settings UI into page shell + task table + model table + cost breakdown.
10. Add localization copy for static `Usage during period` help and fallback labels.
11. Add backend/provider/GraphQL and frontend component tests.
12. Update docs if current docs still describe model-only Settings statistics.

## Key Tradeoffs

- MVP uses `observedAt` period usage instead of full created-period task cost.
  - Pro: aligns with current ledger period reads.
  - Con: long-running tasks may show partial period cost.
  - Mitigation: static `Usage during period` help text.
- Aggregate core is separate from run summary payload.
  - Pro: semantically tight for both task and runtime/model rows.
  - Con: one extra adapter file.
  - Mitigation: clear file responsibility and tests.

## Risks

- Legacy metadata may be missing; use `Unknown` and `First usage observed` fallbacks.
- Member created time may require fallback if member run history is absent.
- Large ranges may be slow because existing stats read all period events; defer repository grouping unless necessary.
- GraphQL generated types/localization generated files may need project-specific regeneration.

## Guidance For Implementation

- Backend aggregate is authoritative; frontend must not compute prices.
- Thinking/reasoning tokens are displayed as included output, not extra total cost.
- Task rows and runtime/model rows must compose `TokenUsageCostSummaryAggregate`; only existing focused summary queries use `TokenUsageRunSummaryPayload`.
- Team members are child rows only.
- Top-level task sorting must not detach expanded member rows.
- `By Model` row key is runtime/model pair.
- MVP UI shows static `Usage during period` help text only; no range dropdown and no `rangeMode` query variable.
