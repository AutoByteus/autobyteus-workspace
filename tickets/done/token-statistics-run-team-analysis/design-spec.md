# Design Spec

## Current-State Read

Settings > Token Statistics currently has one historical reporting path:

`TokenUsageStatistics.vue -> tokenUsageStatistics Pinia store -> usageStatisticsInPeriod GraphQL -> TokenUsageStatisticsProvider.getStatisticsPerModel -> TokenUsageLedgerStore.listEventsInPeriod -> SqlTokenUsageLedgerRepository.listEventsInPeriod -> token_usage_ledger_events`

Current behavior is model-first. `TokenUsageStatisticsProvider` groups ledger records by `model_identifier ?? model_value ?? "unknown"`; GraphQL exposes model rows; the frontend renders one row per model. This is useful for diagnostics but does not answer “how much did this agent run or team run cost?”

Existing ledger facts that must be reused rather than duplicated:

- Run/team/member grouping: `runId`, `rootTeamRunId`, `memberAgentRunId`, `memberRouteKey`.
- Nested hierarchy hints: `teamRunPathJson` / `memberPathJson`, exposed as `team_run_path` / `member_path`.
- Runtime/model: `runtimeKind`, `modelProvider`, `modelIdentifier`, `modelValue`.
- Tokens/cache/output/thinking and estimated cost fields, including existing `accounting_input_tokens` / `accounting_output_tokens` names.

Current missing historical display data:

- team name for team-run usage rows;
- standalone agent name for standalone-agent usage rows;
- run/task summary;
- true run/team created time;
- member name for team-member usage rows.

Run-history metadata can currently provide those labels, but Settings token statistics should not depend permanently on live run-history/team-definition data because those definitions or metadata can later be renamed, deleted, archived, exported, imported, or merged across nodes.

Post-user-verification product decision: Settings > Token Statistics is a usage/cost report, not a roster viewer. Expanded team rows shall show members that have selected-period usage events. Members with no usage events in the selected period may be omitted in MVP.

Current paused implementation artifacts also show the concrete defect that prompted this rework: `TokenUsageRunHistoryEnricher.listTeamAgentMemberRoster`, `TokenUsageTeamMemberRosterEntry`, no-usage aggregate builders, workspace display metadata, and member-created-time fields turn the usage table into a live roster merge. The target design removes that roster merge from Settings statistics and tightens the metadata capture to the five user-visible display fields only.

## Intended Change

Add a task-first historical statistics experience.

- `By Task` tab is default.
  - Top-level rows are standalone agent runs and root team runs.
  - Team rows expand to team-member usage rows derived from selected-period ledger events.
  - Member usage is not also shown as standalone top-level usage.
  - Default sort is `Created Time` descending.
  - `Created Time` is the last visible table column.
  - Date semantics are static `Usage during period`: ledger events observed in the selected date range.
  - UI renders no prominent explanatory paragraph/box and no range-mode selector.
- `By Model` tab remains secondary diagnostics.
  - Rows are grouped by runtime/model pair.
  - Runtime is a visible column.
  - Cache-aware input and output/reasoning semantics are displayed.
- Add exactly five self-contained persisted display fields to token-usage data: `teamName`, `agentName`, `runSummary`, `runCreatedAt`, `memberName`.
- Do not add workspace/source-node/full-definition/conversation/roster-order/no-usage-member-runtime-model/snapshot fields.

MVP does not include `Tasks created in period`, CSV export, or no-usage roster rows.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Feature / product UX improvement with targeted projection refactor and data-shape tightening.
- Current design issue found (`Yes`/`No`/`Unclear`): Yes at the reporting projection/shared-structure layer and historical display-data boundary.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Shared Structure Looseness if existing run-summary DTOs are reused for runtime/model diagnostics; Boundary Or Ownership Issue if Settings statistics keeps depending on mutable/deletable run-history metadata for names/summaries/created time.
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes, targeted.
- Evidence:
  - Existing Settings stats group by model only.
  - Existing private summary logic combines metric aggregation with run/team/member identity.
  - Runtime/model diagnostics are not run/team/member subjects.
  - Existing ledger already stores runtime/model, token, cost, team/member identity, and path fields.
  - User clarified that the page may omit no-usage members and should add only fields needed to render usage rows meaningfully.
- Design response:
  - Keep `TokenUsageStatisticsProvider` as authoritative owner of historical statistics projections.
  - Extract identity-free `TokenUsageCostSummaryAggregate` and a focused run-summary adapter.
  - Add the task-statistics projection and runtime/model projection around the aggregate.
  - Persist exactly five usage-row display fields: `teamName`, `agentName`, `runSummary`, `runCreatedAt`, `memberName`.
  - Use existing `memberPathJson` / `teamRunPathJson` for optional nested hierarchy display; do not add a new hierarchy structure.
- Refactor rationale:
  - Prevents duplicated cost/cache math.
  - Prevents runtime/model diagnostics from carrying false run/member identity fields.
  - Makes Settings statistics self-contained for displayed names and created time without adding unrelated metadata.
- Intentional deferrals and residual risk, if any:
  - `Tasks created in period` full-lifetime mode is future-only.
  - CSV/export/import UI is future-only.
  - Legacy rows captured before the five display fields exist may still need `Unknown` / `First usage observed` fallbacks if live metadata is gone.
  - Fully nested visual grouping can be a UI enhancement using existing path fields; MVP may render a flat member list with path labels.

## Terminology

- `TokenUsageCostSummaryAggregate`: identity-free token/cost/cache aggregate for a set of ledger events. It contains metric components, cost components, status/currency, missing price dimensions, pricing metadata, event count, latest observed timestamp, and observed runtime/model sets. It contains no row identity.
- `Run summary adapter`: composes a `TokenUsageCostSummaryAggregate` with run/team/member identity and latest event identity fields to produce the existing focused `TokenUsageRunSummaryPayload`.
- `Task row`: a `By Task` top-level row with explicit subject identity (`TEAM_RUN` or `AGENT_RUN`) plus an aggregate.
- `Member row`: a child row under a team row with selected-period usage events, explicit member identity, optional existing member path, and an aggregate.
- `Runtime/model row`: a `By Model` row with explicit `{ runtimeKind, modelIdentifier }` identity plus an aggregate.
- `Token usage display fields`: exactly `teamName`, `agentName`, `runSummary`, `runCreatedAt`, and `memberName`.
- `Usage during period`: static MVP date semantics; ledger events are filtered by `observedAt`.

## Design Reading Order

1. data-flow spine;
2. authoritative provider boundary;
3. identity-free aggregate core and run-summary adapter;
4. five-field display-data capture;
5. task/runtime-model DTO composition;
6. GraphQL and frontend tables.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action:
  - Replace model-only grouping with runtime/model grouping for `By Model`.
  - Replace the model-only Settings default view with task-first tabs.
  - Remove private-only `TokenUsageLedgerStore.buildSummary` as a monolithic identity+metric builder; replace with aggregate core + run-summary adapter.
  - Remove old UI wording `Prompt Tokens` / `Assistant Tokens` from Settings stats display in favor of `Input Tokens` / `Output Tokens` while preserving backend legacy aliases only where API compatibility still requires them.
- Explicit rejection:
  - No fake `Tasks created in period` selector.
  - No `rangeMode` GraphQL argument.
  - No no-usage member state/rows in MVP.
  - No broad metadata snapshot or generic snapshot ID.

## Data-Flow Spine Inventory

| Spine ID | Scope | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Settings `By Task` fetch | Rendered task/team/member rows | `TokenUsageStatisticsProvider` | Main user path for task cost. |
| DS-002 | Primary End-to-End | Settings `By Model` fetch | Rendered runtime/model diagnostics | `TokenUsageStatisticsProvider` | Preserves diagnostics without runtime ambiguity. |
| DS-003 | Bounded Local | Ledger event group | Identity-free aggregate | `TokenUsageCostSummaryAggregateBuilder` | Shared cost/cache/token math. |
| DS-004 | Bounded Local | Identity-free aggregate + run identity | Existing focused run summary payload | `TokenUsageRunSummaryAdapter` | Keeps existing focused summaries coherent without polluting aggregate core. |
| DS-005 | Bounded Local | Runtime/run-history context | Five token-usage display fields | `TokenUsageDisplayFieldCapturer` | Historical row labels remain meaningful after metadata changes/deletion. |

## Primary Execution Spine(s)

### DS-001 — By Task statistics

`Settings Token Statistics UI -> tokenUsageStatistics store -> tokenUsageTaskStatisticsInPeriod GraphQL query -> TokenUsageStatisticsResolver -> TokenUsageStatisticsProvider.getTaskStatisticsInPeriod -> TokenUsageLedgerStore.listEventsInPeriod -> task/team grouping -> member usage grouping by memberAgentRunId/memberRouteKey -> buildTokenUsageCostSummaryAggregate -> task/member row DTOs -> Task table`

### DS-002 — Runtime/model diagnostics

`Settings Token Statistics UI -> tokenUsageStatistics store -> usageStatisticsInPeriod GraphQL query -> TokenUsageStatisticsResolver -> TokenUsageStatisticsProvider.getStatisticsPerRuntimeModel -> TokenUsageLedgerStore.listEventsInPeriod -> runtime/model grouping -> buildTokenUsageCostSummaryAggregate -> runtime/model row DTOs -> Model table`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The task view requests period statistics. The provider groups period ledger events into standalone-agent and root-team subjects. For teams, it groups member usage events by `memberAgentRunId` first and `memberRouteKey` as fallback, carries existing `memberPath` when present, builds aggregates, and returns usage rows. | UI, store, resolver, provider, ledger store, aggregate builder | `TokenUsageStatisticsProvider` | Display field population, fallback labels, formatting. |
| DS-002 | The model view requests period diagnostics. The provider groups period ledger events by runtime/model pair and builds one aggregate per pair. | UI, store, resolver, provider, ledger store, aggregate builder | `TokenUsageStatisticsProvider` | Runtime/model normalization. |
| DS-003 | For any event group, the aggregate builder sums tokens, cache components, costs, status, currency, missing price dimensions, event count, and observed descriptor sets. | Aggregate builder | `TokenUsageCostSummaryAggregateBuilder` | Currency/status helpers, cache-state summary. |
| DS-004 | Focused summary queries pass run/team/member identity and events to a run-summary adapter. The adapter composes identity + aggregate into the existing focused summary payload. | Run-summary adapter | `TokenUsageRunSummaryAdapter` | Latest event identity mapping. |
| DS-005 | On new token-usage persistence, the token-usage boundary captures five display fields from runtime/run-history context into usage records. Legacy backfill may populate the same fields while metadata still exists. | Display field capturer/backfill | `TokenUsageDisplayFieldCapturer` | Run-history/team metadata read source. |

## Spine Actors / Main-Line Nodes

| Node | Role |
| --- | --- |
| `TokenUsageStatistics.vue` | Settings page shell: date controls, compact range-semantics label/tooltip, tabs, loading/error/empty state. |
| `tokenUsageStatistics` Pinia store | Frontend query/state owner for task rows and runtime/model rows. |
| `TokenUsageStatisticsResolver` | GraphQL transport boundary and mapper. |
| `TokenUsageStatisticsProvider` | Governing historical statistics projection owner. |
| `TokenUsageLedgerStore` | Ledger read/write boundary and focused summary input source. |
| `TokenUsageCostSummaryAggregateBuilder` | Identity-free metric/cost aggregation owner. |
| `TokenUsageRunSummaryAdapter` | Existing focused run/team/member summary adapter. |
| `TokenUsageDisplayFieldCapturer` | Five-field display-data capture/backfill owner. |

## Ownership Map

| Node | Owns |
| --- | --- |
| `TokenUsageStatistics.vue` | UI composition and interaction state only. It does not own grouping or cost math. |
| `tokenUsageStatistics` store | Apollo query execution and frontend state normalization. It does not recalculate costs. |
| `TokenUsageStatisticsResolver` | GraphQL schema mapping only. It delegates to provider. |
| `TokenUsageStatisticsProvider` | Historical period grouping, task/member double-count prevention, runtime/model grouping. |
| `TokenUsageLedgerStore` | Ledger event reads/writes and existing focused summary query orchestration. |
| `TokenUsageCostSummaryAggregateBuilder` | Identity-free aggregation policy over event groups. |
| `TokenUsageRunSummaryAdapter` | Composition of aggregate + run/team/member identity into focused summaries. |
| `TokenUsageDisplayFieldCapturer` | Capture/backfill of `teamName`, `agentName`, `runSummary`, `runCreatedAt`, and `memberName`; it does not aggregate cost. |

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `TokenUsageStatisticsResolver` | `TokenUsageStatisticsProvider` | GraphQL transport and type mapping. | Ledger grouping, display-field capture/backfill, cost aggregation. |
| `TokenUsageStatistics.vue` | Store/provider path | Settings visual shell. | Backend cost or grouping policy. |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope | Notes |
| --- | --- | --- | --- | --- |
| Model-only grouping helper | Collapses same model across runtimes. | Runtime/model grouping in `TokenUsageStatisticsProvider`. | In This Change | Key is `{ runtimeKind, modelIdentifier }`. |
| Monolithic private `TokenUsageLedgerStore.buildSummary` | Mixes metric aggregation with run identity and cannot be shared with runtime/model diagnostics. | Aggregate builder + run-summary adapter. | In This Change | Existing public summary methods remain. |
| Single default model-only Settings table | Does not answer task/run cost. | Task-first tabs. | In This Change | `By Model` stays secondary. |
| Fake range-mode selector / `rangeMode` query input | MVP supports only `Usage during period`. | Compact static label/tooltip; future follow-up for created-period mode. | In This Change | Must not render `Tasks created in period` option or prominent explanatory paragraph/box. |
| No-usage roster expansion | User accepted usage-derived member rows and wants minimal fields. | Event-derived member usage rows. | In This Change | Do not add member roster order or configured no-usage member runtime/model. |
| Current roster-backed Settings member merge (`listTeamAgentMemberRoster`, `TokenUsageTeamMemberRosterEntry`, no-usage aggregate path) | It renders inactive members and forces unnecessary roster/runtime/member-created-time metadata. | Usage-derived member grouping from selected-period ledger events. | In This Change | Keep run-history reads only as a source for the five display fields/backfill. |

## Return Or Event Spine(s) (If Applicable)

No async event spine is in scope. These are GraphQL request/response reads plus normal ledger-write display-field capture.

## Bounded Local / Internal Spines (If Applicable)

### DS-003 — Aggregate core

Parent owner: `TokenUsageCostSummaryAggregateBuilder`

`Event group -> token sums -> cache component sums/rates/state -> output/reasoning sums -> nullable cost sums -> currency/status/missing-dimension summary -> observed runtime/model descriptor sets -> aggregate`

### DS-004 — Run-summary adapter

Parent owner: `TokenUsageRunSummaryAdapter`

`Run/team/member identity + event group -> build aggregate -> read latest event identity/context fields -> TokenUsageRunSummaryPayload`

### DS-005 — Display-field capture/backfill

Parent owner: `TokenUsageDisplayFieldCapturer`

`Runtime/run-history context -> select exactly five fields -> persist on token-usage record/payload -> statistics provider reads the fields -> fallback labels only when missing`

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Identity-free aggregation | DS-001, DS-002, DS-003 | Statistics provider, ledger store | Shared token/cost/cache aggregation. | Prevent duplicated math. | Runtime/model rows inherit false run identity or recalculate incorrectly. |
| Run-summary adaptation | DS-004 | Ledger store focused summary methods | Existing focused summary payload compatibility by composition. | Existing APIs need run identity. | Aggregate core becomes polluted by run fields. |
| Display-field capture/backfill | DS-001, DS-005 | Ledger store/provider | Populate `teamName`, `agentName`, `runSummary`, `runCreatedAt`, `memberName`. | Historical display survives metadata changes/deletion. | Provider performs scattered live metadata joins forever, or UI shows `Unknown` for valid history. |
| Runtime/model key normalizer | DS-002 | Statistics provider | Normalize missing runtime/model values and keep pair identity. | Same model can have different runtimes. | Costs collapse incorrectly. |
| Frontend formatting | DS-001, DS-002 | UI tables/details | Display tokens/cost/status/cache sublines. | Keeps UI display-only. | UI may recalculate or hide backend status semantics. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Period ledger events | `TokenUsageLedgerStore` | Reuse | Existing period read supports MVP. | N/A |
| Token/cost/cache aggregation | private `TokenUsageLedgerStore.buildSummary` | Extend by extraction | Correct policy exists but is identity-specific. | New extracted files are ownership tightening, not new policy. |
| Display labels at write/backfill time | run-history catalog/metadata services | Reuse as source only | They know current names/summaries/created time/member names. | Token usage must own the persisted five display fields. |
| GraphQL token usage boundary | `TokenUsageStatisticsResolver` | Extend | Existing token usage stats entrypoint. | N/A |
| Frontend formatting | `tokenUsageFormatting.ts` | Reuse/extend | Existing cost/status/cache display rules. | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| `token-usage/projections` | Aggregate builder and run-summary adapter. | DS-003, DS-004 | Provider, ledger store | Extend | Projection folder already exists. |
| `token-usage/providers` | Historical statistics provider, ledger store, and display-field capture/backfill. | DS-001, DS-002, DS-005 | GraphQL resolver | Extend | Provider remains authoritative. |
| `token-usage/domain` | Statistics DTOs and aggregate type if not colocated. | DS-001, DS-002 | Provider/resolver | Extend | Keep subject identity explicit. |
| `run-history` | Source for display-field capture/backfill. | DS-005 | Display field capturer | Reuse | Not a permanent Settings statistics dependency. |
| `api/graphql/types` | Schema and transport mapping. | DS-001, DS-002 | UI/store | Extend | No direct ledger/run-history composition. |
| `autobyteus-web/settings` | Page shell and tables. | DS-001, DS-002 | User UI | Extend/split | Task-first UI. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `token-usage/projections/token-usage-cost-summary-aggregate.ts` | token-usage projections | Aggregate core | Define aggregate type and builder. | Single identity-free aggregation policy. | Event payload types. |
| `token-usage/projections/token-usage-run-summary-adapter.ts` | token-usage projections | Run-summary adapter | Compose aggregate + run/team/member identity into focused summary payload. | Keeps identity adapter separate. | Aggregate core. |
| `token-usage/domain/statistics-models.ts` | token-usage domain | Statistics DTOs | Task rows, member rows, runtime/model rows. | Subject-specific identities stay explicit. | Aggregate type. |
| `token-usage/providers/token-usage-display-field-capturer.ts` or a tightened/renamed `token-usage-run-history-enricher.ts` | token-usage providers | Display-field owner | Populate/backfill exactly five persisted display fields. | Clear owner for self-contained historical labels. | Run-history source, ledger payload. |
| `token-usage/providers/statistics-provider.ts` | token-usage providers | Historical projection owner | Group period events into task rows and runtime/model rows. | Existing authoritative stats owner. | Aggregate builder. |
| `token-usage/providers/token-usage-ledger-store.ts` | token-usage provider/store | Ledger boundary | Persist/read ledger events; delegate focused summaries to adapter. | Existing boundary. | Run-summary adapter, display-field capturer. |
| `api/graphql/types/token-usage-stats.ts` | GraphQL | Transport boundary | Task stats query/types and runtime/model fields. | Existing token usage GraphQL boundary. | Provider DTOs. |
| `autobyteus-web/components/settings/token-usage/*` | frontend settings | Tables/details | Task table, model table, cost breakdown. | Avoid one large mixed component. | Formatter/types. |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Token/cost/cache aggregation | `token-usage-cost-summary-aggregate.ts` | token-usage projections | Used by task rows, model rows, and run-summary adapter. | Yes | Yes | A run/team/member identity DTO. |
| Existing focused run summary | `token-usage-run-summary-adapter.ts` | token-usage projections | Existing GraphQL summaries need old payload shape. | Yes | Yes | A generic row model for diagnostics. |
| Task/runtime-model DTOs | `statistics-models.ts` | token-usage domain | Provider/resolver need typed row contracts. | Yes | Yes | A mixed generic list without subject identity. |
| Five display fields | display-field capturer + ledger payload mapping | token-usage providers/domain | Same fields are needed at persistence, provider DTO, and GraphQL mapping. | Yes | Yes | A broad metadata snapshot. |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Parallel / Overlapping Representation Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `TokenUsageCostSummaryAggregate` | Yes | Yes | Low | Keep no run/team/member identity fields. |
| `TokenUsageRunSummaryPayload` | Yes for focused summaries | N/A existing | Low if only used via adapter | Do not use it for runtime/model rows. |
| `TokenUsageTaskStatisticsRow` | Yes | Yes | Low | Compose explicit row identity + display fields + aggregate. |
| `TokenUsageTaskMemberStatisticsRow` | Yes | Yes | Low | Compose explicit member identity, existing member path, `memberName`, aggregate. No no-usage state and no member-created-time field. |
| `TokenUsageRuntimeModelStatisticsRow` | Yes | Yes | Low | Compose `{ runtimeKind, modelIdentifier, aggregate }`. |
| Five persisted display fields | Yes | Yes | Low | Add only `teamName`, `agentName`, `runSummary`, `runCreatedAt`, `memberName`. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/token-usage/projections/token-usage-cost-summary-aggregate.ts` | token-usage projections | Aggregate core | Identity-free token/cache/cost aggregation over event groups. | Prevents duplicated math and false identity fields. | `TokenUsageUpdatedPayload`. |
| `autobyteus-server-ts/src/token-usage/projections/token-usage-run-summary-adapter.ts` | token-usage projections | Run-summary adapter | Existing focused run/team/member summary composition. | Keeps focused summary shape separate from aggregate core. | Aggregate core. |
| `autobyteus-server-ts/src/token-usage/domain/statistics-models.ts` | token-usage domain | DTO contracts | Task/member/runtime-model row types and top-level created-time source. | Subject-specific contracts; member rows do not carry member-created-time. | Aggregate type. |
| `autobyteus-server-ts/src/token-usage/providers/token-usage-display-field-capturer.ts` or tightened/renamed `token-usage-run-history-enricher.ts` | token-usage providers | Display-field capture/backfill | Populate exactly five display fields from runtime/run-history context. | Self-contained reporting owner; not a broad metadata snapshot. If the current enricher file is retained, remove roster/workspace/no-usage/member-created-time responsibilities from it. | Public run-history services as source only. |
| `autobyteus-server-ts/src/token-usage/providers/statistics-provider.ts` | token-usage providers | Historical statistics provider | Period grouping, no-double-count task rows, usage-derived team member rows, runtime/model rows. | Existing authoritative stats owner. | Aggregate builder. |
| `autobyteus-server-ts/src/token-usage/providers/token-usage-ledger-store.ts` | token-usage providers | Ledger boundary | Existing focused summary methods delegate to run-summary adapter; persistence includes five display fields. | Keeps public API stable while removing private monolith. | Run-summary adapter, display-field capturer. |
| `autobyteus-server-ts/src/api/graphql/types/token-usage-stats.ts` | GraphQL | Transport mapper | Task stats object types/query, runtime/model fields, aggregate GraphQL type. | Existing token usage GraphQL boundary. | Provider DTOs. |
| `autobyteus-web/graphql/queries/token_usage_statistics_queries.ts` | frontend GraphQL | Query definitions | Task stats query without `rangeMode`; model stats with runtime/cache fields. | Existing query file. | Generated types. |
| `autobyteus-web/stores/tokenUsageStatistics.ts` | frontend store | State owner | Task/model fetches, loading/error state. | Existing store. | Generated types. |
| `autobyteus-web/types/tokenUsageStatistics.ts` | frontend types | UI row contracts | UI row, sort, expansion, top-level created-time source types. | Keeps components clean. | GraphQL/generated types. |
| `autobyteus-web/components/settings/TokenUsageStatistics.vue` | frontend page shell | Settings section | Date controls, compact label/tooltip, tabs, state routing. | Existing page entry. | Child components. |
| `autobyteus-web/components/settings/token-usage/TokenUsageTaskStatisticsTable.vue` | frontend UI | Task table | Sort/expand/detail rows. | Table-specific interaction. | Formatter/types. |
| `autobyteus-web/components/settings/token-usage/TokenUsageModelStatisticsTable.vue` | frontend UI | Runtime/model table | Diagnostics table/chart. | Secondary view isolation. | Formatter/types. |
| `autobyteus-web/components/settings/token-usage/TokenUsageCostBreakdown.vue` | frontend UI | Detail panel | Input/cache/output/thinking/missing-price breakdown. | Shared details display. | Aggregate fields. |

## Ownership Boundaries

- GraphQL resolver delegates to `TokenUsageStatisticsProvider` and maps DTOs only.
- `TokenUsageStatisticsProvider` owns period grouping, task/member double-count prevention, runtime/model grouping, and usage-derived team expansion.
- `TokenUsageLedgerStore` remains the ledger persistence/read boundary.
- `TokenUsageDisplayFieldCapturer` owns capture/backfill of exactly five display fields; no caller should add ad hoc run-history joins for those same labels.
- `TokenUsageCostSummaryAggregateBuilder` owns metric aggregation, not row identity.
- Frontend components render and sort only; they do not compute backend prices.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `TokenUsageStatisticsProvider` | Ledger grouping, aggregate builder, display-field reads | GraphQL resolver | Resolver queries ledger repository or run-history stores directly. | Add provider DTO/method. |
| `TokenUsageLedgerStore` | SQL repository and run-summary adapter usage | Provider/focused summary queries | Provider calls SQL repository directly. | Add store method. |
| `TokenUsageDisplayFieldCapturer` | Run-history/team metadata source reads for exactly five fields | Ledger persistence/backfill paths | Statistics provider/UI reads raw metadata for row labels when display fields exist. | Add capture/backfill method. |
| `TokenUsageCostSummaryAggregateBuilder` | Aggregation helpers | Provider and run-summary adapter | Provider duplicates sum/cost/cache logic. | Extend aggregate core. |
| `tokenUsageStatistics` frontend store | Apollo query execution | Settings components | Components call Apollo directly. | Add store action. |

## Dependency Rules

Allowed:

- Resolver -> statistics provider.
- Statistics provider -> ledger store, aggregate builder.
- Ledger store -> SQL repository, display-field capturer, run-summary adapter.
- Display-field capturer -> public run-history services as data source.
- Run-summary adapter -> aggregate builder.
- Settings page -> Pinia store and child table components.

Forbidden:

- Runtime/model row -> `TokenUsageRunSummaryPayload` identity fields.
- GraphQL resolver -> ledger repository or run-history stores directly.
- Frontend -> local price calculation from token counts.
- Model grouping by model alone.
- Member usage as both team child and standalone top-level row.
- No-usage roster rows in MVP.
- New display fields beyond `teamName`, `agentName`, `runSummary`, `runCreatedAt`, `memberName` without a new requirement.
- MVP query -> `rangeMode` variable.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `buildTokenUsageCostSummaryAggregate(events)` | Identity-free aggregate | Compute metric/cost/cache aggregate. | Event group only. | No run/team/member IDs. |
| `buildTokenUsageRunSummary({ runId, rootTeamRunIdOverride?, events })` | Focused run/team/member summary | Existing focused summary payload. | Explicit run/team/member identity input. | Composes aggregate. |
| `TokenUsageDisplayFieldCapturer.capture(payload, context)` or equivalent | Five display fields | Populate `teamName`, `agentName`, `runSummary`, `runCreatedAt`, `memberName`. | Token usage payload + runtime/run-history context. | Must not capture broad metadata. |
| `TokenUsageStatisticsProvider.getTaskStatisticsInPeriod(startDate, endDate)` | Task statistics | Return task/member rows for observed period. | Date range only. | No range mode in MVP. |
| `TokenUsageStatisticsProvider.getStatisticsPerRuntimeModel(startDate, endDate)` | Runtime/model diagnostics | Return runtime/model rows. | Date range only. | Group by runtime/model pair. |
| `tokenUsageTaskStatisticsInPeriod(startTime, endTime)` GraphQL | Task statistics | Settings `By Task` data. | `startTime + endTime`. | No `rangeMode`. |
| `usageStatisticsInPeriod(startTime, endTime)` GraphQL | Runtime/model diagnostics | Settings `By Model` data. | `startTime + endTime`. | Include `runtimeKind`. |
| Focused summary queries | Run/team/member summary | Existing focused Token Meter summaries. | Existing explicit run/team/member args. | Use run-summary adapter. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `buildTokenUsageCostSummaryAggregate` | Yes | Yes, identity-free by design | Low | Keep no row identity fields. |
| Display-field capture | Yes | Yes, usage payload + context | Low | Keep exactly five fields. |
| `buildTokenUsageRunSummary` | Yes | Yes | Low | Keep focused-summary only. |
| `tokenUsageTaskStatisticsInPeriod` | Yes | Yes | Low | Date range only. |
| `usageStatisticsInPeriod` | Yes | Yes if runtime included | Low | Runtime/model grouping. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Aggregate core | `TokenUsageCostSummaryAggregate` | Yes | Low | Do not call it run summary. |
| Run-summary adapter | `TokenUsageRunSummaryAdapter` / `buildTokenUsageRunSummary` | Yes | Low | Keep focused summary responsibility. |
| Historical provider | `TokenUsageStatisticsProvider` | Yes | Low | Existing stats owner. |
| Display-field capture | `TokenUsageDisplayFieldCapturer` | Yes | Low | Name by concrete concern; avoid generic snapshot/context naming. |

## Applied Patterns (If Any)

- Projection builder: identity-free aggregate builder for event groups.
- Adapter: run-summary adapter composes aggregate into existing focused run/team/member summary shape.
- Repository: existing SQL ledger repository remains token/cost event persistence adapter.
- Transport mapper: GraphQL resolver maps provider DTOs to schema types.
- Capture/backfill: display-field capturer copies five fields from metadata sources into token usage persistence.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/token-usage/projections/token-usage-cost-summary-aggregate.ts` | File | Aggregate core | Identity-free event aggregation. | Projection from ledger events to metrics. | Run/team/member IDs. |
| `autobyteus-server-ts/src/token-usage/projections/token-usage-run-summary-adapter.ts` | File | Run summary adapter | Compose aggregate with run identity. | Adapter around existing payload. | Runtime/model diagnostics rows. |
| `autobyteus-server-ts/src/token-usage/domain/statistics-models.ts` | File | DTO contracts | Task/member/model row contracts. | Subject identities are explicit. | UI formatting. |
| `autobyteus-server-ts/src/token-usage/providers/token-usage-display-field-capturer.ts` or tightened/renamed `token-usage-run-history-enricher.ts` | File | Display-field capture/backfill | Exactly five display fields. | Token usage reporting concern. If retaining the current file name, strip it down to this concern. | Workspace/source-node/full definition/roster/no-usage/member-created-time fields. |
| `autobyteus-web/components/settings/token-usage/` | Folder | Settings token usage UI | Task/model tables and detail panel. | Keeps page shell slim. | Apollo queries or cost math. |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Boundary Is Clear? | Mixed-Layer Or Over-Split Risk | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `token-usage/projections` | Off-Spine Concern | Yes | Low | Owns reusable event projections. |
| `token-usage/providers` | Main-Line Domain-Control / Persistence-Provider | Yes | Low | Existing token-usage provider area owns stats provider, ledger store, and display-field capture. |
| `token-usage/domain` | Domain contracts | Yes | Low | Owns row/aggregate DTO contracts. |
| `api/graphql/types` | Transport | Yes | Medium | Existing large file; keep only mapping. |
| `components/settings/token-usage` | UI feature subfolder | Yes | Low | Task/model/detail split is meaningful. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Five display fields | Persist `{ teamName: "Software Engineering Team", runSummary: "investigate…", runCreatedAt: "2026-06-28T15:42:00Z", memberName: "solution_designer" }` on relevant usage events. | Persist full team definition, workspace path, source node, roster order, configured no-usage member model. | Keeps self-contained UI without metadata creep. |
| Team grouping | Group top-level row by `rootTeamRunId`; child rows by `memberAgentRunId` then `memberRouteKey`; carry existing `memberPath`. | Show member events as standalone rows and children. | Prevents double counting. |
| Nested team display | Use existing `memberPathJson` such as `["planning_team", "solution_designer"]` as a path label or indentation hint. | Add a new persisted hierarchy tree for MVP. | Existing ledger already has path fields. |
| Identity-free aggregate | `aggregate = buildTokenUsageCostSummaryAggregate(events)` returns token/cache/cost summary only. | `aggregate` returns `{ runId, memberRouteKey, ...metrics }`. | Runtime/model rows are not run/member subjects. |
| Runtime/model row | `{ runtimeKind: "codex", modelIdentifier: "gpt-5.5", aggregate }` | `{ runId: "codex:gpt-5.5", summaryTotals: TokenUsageRunSummaryPayload }` | Prevents pseudo IDs. |
| MVP range UI | Date range + compact `Usage during period` label/tooltip. | Dropdown with disabled `Tasks created in period` or a prominent explanatory paragraph/box. | Avoids ambiguous unimplemented mode. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep model-only grouping and add runtime as subtext | Smaller change. | Rejected | Runtime/model pair grouping. |
| Duplicate private `buildSummary` math in stats provider | Fast implementation. | Rejected | Identity-free aggregate core. |
| Use `TokenUsageRunSummaryPayload` for runtime/model rows | Reuses existing GraphQL fields. | Rejected | Runtime/model row composes aggregate under runtime/model identity. |
| Add range-mode dropdown now | Anticipates future full-task mode. | Rejected | Compact static `Usage during period` label/tooltip only. |
| Add no-usage roster rows | Earlier idea for full team roster. | Rejected for MVP | Usage-derived member rows only. |
| Store broad metadata “just in case” | Could help future reports. | Rejected | Persist only five display fields. |
| Add new nested hierarchy tree | Could reconstruct nested teams. | Rejected for MVP | Use existing `teamRunPathJson` / `memberPathJson`. |

## Derived Layering (If Useful)

- UI: Settings page, task/model tables, formatting/localization.
- GraphQL transport: resolver/types.
- Projection/provider: statistics provider, display-field capturer.
- Projection core: aggregate builder and run-summary adapter.
- Persistence/read: ledger store/repository.

Layering is explanatory only; ownership boundaries above are authoritative.

## Migration / Refactor Sequence

1. Add `TokenUsageCostSummaryAggregate` and `buildTokenUsageCostSummaryAggregate(events)`.
2. Add `buildTokenUsageRunSummary(...)` adapter and move existing `TokenUsageLedgerStore.buildSummary` identity-specific output into it.
3. Update `TokenUsageLedgerStore` focused summary methods to delegate to the adapter.
4. Add statistics DTOs that compose explicit identities with the aggregate:
   - task row identity + aggregate;
   - member row identity + existing member path + aggregate, without member-created-time/no-usage state;
   - runtime/model identity + aggregate.
5. Add exactly five nullable token-usage display fields to persistence and payload mapping: `teamName`, `agentName`, `runSummary`, `runCreatedAt`, `memberName`.
6. Add a display-field capture/backfill step that populates those five values from current run-history/team metadata while it exists.
7. Extend `TokenUsageStatisticsProvider` with task grouping, usage-derived team member expansion, existing-path handling, and runtime/model grouping.
8. Extend GraphQL types/queries:
   - `tokenUsageTaskStatisticsInPeriod(startTime, endTime)`;
   - runtime field/cache fields on model diagnostics;
   - existing `memberPath` for optional nested display;
   - no `rangeMode` argument;
   - no no-usage member state and no member-created-time field.
9. Update frontend queries and regenerate generated GraphQL types.
10. Refactor Settings UI into page shell + task table + model table + cost breakdown.
11. Add localization copy for compact `Usage during period` label/tooltip and fallback labels.
12. Add backend/provider/GraphQL and frontend component tests.
13. Update docs if current docs still describe model-only Settings statistics.

## Key Tradeoffs

- MVP uses `observedAt` period usage instead of full created-period task cost.
  - Pro: aligns with current ledger period reads.
  - Con: long-running tasks may show partial period cost.
  - Mitigation: compact `Usage during period` label/tooltip near date controls.
- Only five display fields are persisted.
  - Pro: self-contained UI without metadata creep.
  - Con: cannot reconstruct full historical team definitions or no-usage members after metadata deletion.
  - Mitigation: page is a usage report; existing path fields support enough hierarchy for usage rows.
- Nested hierarchy uses existing paths.
  - Pro: no new hierarchy persistence.
  - Con: UI may initially render a path label rather than a full tree.
  - Mitigation: full nested visual tree can be added later using the same existing fields if needed.

## Risks

- Legacy metadata may be missing; use `Unknown` and `First usage observed` fallbacks if five display fields cannot be backfilled.
- Very old rows may lack `rootTeamRunId` or member identity; they remain best-effort.
- Large ranges may be slow because existing stats read all period events; defer repository grouping unless necessary.
- GraphQL generated types/localization generated files may need project-specific regeneration.

## Guidance For Implementation

- Backend aggregate is authoritative; frontend must not compute prices.
- Thinking/reasoning tokens are displayed as included output, not extra total cost.
- Task rows and runtime/model rows must compose `TokenUsageCostSummaryAggregate`; only focused summary queries use `TokenUsageRunSummaryPayload`.
- Team members are child rows only, derived from selected-period usage events.
- Group team child rows by `memberAgentRunId` first, then `memberRouteKey`; carry existing `memberPath` if available.
- Do not add no-usage roster rows, member roster order, member-created-time, or configured runtime/model for no-usage members.
- Do not persist workspace id/path/name, source-node id/name, full agent/team definitions, full conversation content, or generic snapshot IDs.
- Add only `teamName`, `agentName`, `runSummary`, `runCreatedAt`, `memberName` as new display fields.
- Top-level task sorting must not detach expanded member rows.
- `By Model` row key is runtime/model pair.
- MVP UI shows only a compact `Usage during period` label/tooltip; no paragraph/box, range dropdown, or `rangeMode` query variable.
- `Created Time` remains the default sort key but is rendered as the last visible `By Task` column.
