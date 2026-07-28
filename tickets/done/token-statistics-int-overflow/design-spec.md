# Design Spec

## Current-State Read

The supported user path begins in `autobyteus-web/components/settings/TokenUsageStatistics.vue`. On initial mount and manual Fetch Statistics, the component delegates to `useTokenUsageStatisticsStore.fetchStatistics`, which concurrently executes the existing task- and model-statistics GraphQL documents. The Pinia store owns loading/result/error state and normalizes the returned aggregate values as JavaScript `number`.

The backend GraphQL entrypoints and transport object types are co-located in `autobyteus-server-ts/src/api/graphql/types/token-usage-stats.ts`. `TokenUsageStatisticsResolver` delegates period report construction to `TokenUsageStatisticsProvider`; the provider reads normal ledger events through `TokenUsageLedgerStore`/the SQL repository and delegates summation to `buildTokenUsageCostSummaryAggregate`. The domain ingestion path normalizes token components as non-negative numbers, SQLite stores them as `INTEGER`, and the aggregate projection returns JavaScript numbers.

At the authoritative GraphQL transport boundary, token-valued fields in `UsageStatistics`, `TokenUsageCostSummaryAggregateGraphql`, and `TokenUsageRunSummaryGraphql` are declared with built-in `Int`. That scalar rejects signed values above `2_147_483_647` during response serialization even though the stored and computed value is correct. The actual application log proves failure at `usageStatisticsInPeriod[0].inputTokens`; read-only SQL reproduces the exact `3_136_827_911` aggregate from ordinary events for the screenshot period.

The transport return path would otherwise remain valid: Apollo carries JSON numbers and the Pinia store accepts finite numbers. The Model table and cost breakdown already use full `Intl.NumberFormat`, but the primary input/output cells in `TokenUsageTaskStatisticsTable.vue` use `formatCompactInteger`, which renders `3_136_827_911` as `3.14B`; that contradicts the approved exact-decimal display criterion. The generated client contract is also part of the defect boundary: `autobyteus-web/generated/graphql.ts` currently assigns token fields to `Scalars['Int']`, and a verified GraphQL Code Generator probe shows a new scalar would degrade to `any` unless `autobyteus-web/codegen.ts` maps it explicitly.

Current task-worktree note: uncommitted candidate source/codegen/generated/test edits appeared while this initial solution package was being finalized. They are not treated as reviewed baseline or as solution-designer-owned changes; the implementation owner must reconcile their provenance and content against this design.

## Intended Change

Use `GraphQLSafeInt` from the already-installed `graphql-scalars` package for every token-valued output field in the shared token-usage GraphQL type family. Keep the domain ingestion/projection path as the owner of non-negativity; make the transport scalar responsible for exact ECMAScript safe-integer serialization beyond the built-in GraphQL 32-bit range.

Add an explicit `SafeInt` input/output mapping to TypeScript `number` in `autobyteus-web/codegen.ts` and regenerate `autobyteus-web/generated/graphql.ts` from the matching backend schema. Change only the primary input/output token cells in `TokenUsageTaskStatisticsTable.vue` from `formatCompactInteger` to the existing `formatInteger`; supporting cache/thinking sublines may remain compact. Preserve the existing resolver mappings, statistics provider, aggregate builder, persistence schema/data, query documents, Pinia behavior, table structure, and UI state.

Do not cap, round, stringify, drop, or migrate token data. Do not add a dual `Int`/`SafeInt` path or compatibility wrapper.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Approved In-Scope Use Case(s) | Kind (`User`/`System`/`Operational`/`Contract`) | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Use case 1: fetch supported report; use case 2: display exact large count | User | REQ-001–REQ-004; AC-001–AC-005 | User opens Settings → Token Statistics and invokes the existing fetch for a date range/grouping. | Investigation notes: screenshot, app-log lines 307/380, read-only SQL reproduction, and downstream coverage finding for `TokenUsageTaskStatisticsTable.vue`. | Replace the too-narrow token transport scalar, align generated client types, and use full formatting in primary Task input/output cells; exact report succeeds while existing smaller-value, grouping, pricing, loading/empty, and unrelated-error behavior remains unchanged. | Request/projection spine DS-001 plus response/render spine DS-002. |

The behavior map contains the complete approved product scope. Shared run-summary token fields change only because they use the same authoritative token-valued transport contract; no new run-summary user behavior is introduced.

## Material Design Premises (Only When Needed)

| Premise ID | Related Behavior ID(s) | Initiating Basis Kind (`User`/`System`/`Operational`/`Contract`) | Independent Product-Supported Trigger Or Applicable Contract And Support Evidence | Forward Production Path To Claimed State | Lifecycle Preconditions And Material Consequence | Reachability (`Reachable`/`Not Reachable`/`Unclear`) | Design Consequence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| PREM-001 | BEH-001 | User | Existing Token Statistics page and Fetch Statistics action; screenshot and app log prove the request. | UI fetch → store/Apollo → statistics resolver/provider → normal ledger aggregation → `UsageStatistics.inputTokens = 3136827911` → built-in `Int` serialization. | Ordinary persisted usage within the chosen bounds sums above signed 32-bit maximum; response fails and no report renders. | Reachable | Use a safe-integer token scalar at the transport owner and verify the real GraphQL path; no synthetic state or database repair is justified. |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related Requirement / Acceptance-Criteria IDs (When Applicable) | Relationship To This Design | Status / Approval Applicability |
| --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-int-overflow/tickets/done/token-statistics-int-overflow/graphql-token-count-contract.md` | Exact token scalar, field-family scope, codegen mapping, invariants, rejected alternatives, and coverage shape. | REQ-001, REQ-002; AC-001, AC-002, AC-005 | Supplies the protocol-level details projected into the file/interface design below. | Current; approved with requirements basis on 2026-07-28. |

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): `Bug Fix`
- Current design issue found (`Yes`/`No`/`Unclear`): `Yes`
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): `Local Implementation Defect`
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): `No`
- Evidence: Correct data crosses healthy provider, projection, storage, and client boundaries. The GraphQL scalar declaration/generated mapping is too narrow for the supported number range, and the primary Task table's compact presentation is too lossy for the approved exact-display behavior. Both defects have existing coherent owners.
- Design response: Reuse `GraphQLSafeInt` at the existing transport owner, map it explicitly in the existing codegen owner, regenerate the client contract, remove obsolete token-field `Int` references, and switch only the primary Task token cells to the existing full integer formatter.
- Refactor rationale: `token-usage-stats.ts` remains the coherent owner of token-usage GraphQL types/mapping/resolvers; `codegen.ts` remains the coherent owner of client scalar policy; `TokenUsageTaskStatisticsTable.vue` remains the coherent owner of its primary cell presentation. No new owner, generic helper, folder, or service is needed. The shared data shape remains a JavaScript `number`, so provider, persistence, store, query, and UI APIs stay healthy.
- Intentional deferrals and residual risk, if any: Secondary explanatory cache/thinking sublines may remain compact because the primary cells carry the exact value. Values beyond `Number.MAX_SAFE_INTEGER` would require a different approved cross-client contract; no current supported evidence approaches that bound. Packaged-app rollout belongs downstream.

## Terminology

- `Token-valued field`: A GraphQL output whose value represents a token quantity, including aggregate components and context/prompt token counts; excludes `usageReportCount` and monetary/rate fields.
- `SafeInt`: The `graphql-scalars` scalar that serializes exact signed ECMAScript safe integers as JSON numbers. Supported token-domain paths remain non-negative before this boundary.

## Design Reading Order

This spec follows current production behavior → approved change → material premise → spine/ownership → scalar/codegen interfaces → concrete files → sequence/readiness. No greenfield subsystem or migration is introduced.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Obsolete in-scope representation: built-in `Int` decorators on token-valued fields and generated `Scalars['Int']` references for those fields.
- Required action: replace them directly with the current `SafeInt` contract and regenerated numeric client types.
- No wrapper, alias scalar, dual schema, conditional serializer, capped fallback, or old generated token type remains.
- Existing API field names and report behavior are preserved because they remain the current supported contract, not because a legacy path is retained.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject, location, representative shape, and approximate volume: Token usage ledger table `token_usage_ledger_events` in `/Users/normy/.autobyteus/server-data/db/production.db`; 88,617 rows at final probe; token columns are SQLite `INTEGER`; selected-period runtime/model aggregate is `3_136_827_911`.
- Relevant code-model, serialization, semantic, or physical-store change: GraphQL output scalar and generated client schema types only. No Prisma, SQLite, domain-event, or aggregation change.
- Normal reader/writer behavior and representative evidence: SQL repository reads/writes normal events; provider/aggregate builder returns the exact value; read-only SQL and app log align.
- Required semantics and invariants under direct use: Preserve all ledger rows, non-negative token meaning, period/grouping semantics, and exact safe-integer sums.
- Physical-store, privacy/security, disposal/rebuild, and operational constraints: Data is authoritative and must not be rewritten or discarded; no identifiers/raw payloads are copied into artifacts.
- Decision (`Not Affected`/`Directly Usable — No Migration`/`Discard or Rebuild`/`Migration Required`/`Undetermined`): `Not Affected`
- Decision rationale, including concrete benefit versus I/O, downtime, corruption, recovery, and rollout cost: Storage is already correct and unchanged. Any migration would provide zero functional benefit while adding needless data-touch and recovery risk.
- Acceptance criteria or design constraints supported by this decision: REQ-001, REQ-002; AC-001, AC-002.

### Migration Plan (Only When Decision Is `Migration Required`)

N/A — persisted data is not affected and no transformation is permitted.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001 | Token Statistics fetch action | GraphQL token-usage DTO built from authoritative period aggregates | `TokenUsageStatisticsProvider` for report projection, entered through `TokenUsageStatisticsResolver` | Exposes the supported request, storage read, grouping, aggregation, and transport mapping that produce the large value. |
| DS-002 | Return-Event | BEH-001 | Token-usage GraphQL DTO output fields | Exact report row rendered or existing unrelated error displayed | `useTokenUsageStatisticsStore` for client request/result/error lifecycle; GraphQL scalar owns serialization invariant; Task/Model tables own primary cell formatting | Contains the failing serialization point and proves exact numeric delivery to the user-visible outcome. |

## Primary Execution Spine(s)

`TokenUsageStatistics.vue fetch -> useTokenUsageStatisticsStore.fetchStatistics -> Apollo task/model queries -> TokenUsageStatisticsResolver -> TokenUsageStatisticsProvider -> TokenUsageLedgerStore / SqlTokenUsageLedgerRepository -> buildTokenUsageCostSummaryAggregate -> token-usage GraphQL DTO mapping`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The settings component delegates one date-range fetch to the Pinia owner. Apollo invokes the existing task/model GraphQL queries. The resolver enters the provider, which reads normal ledger events and builds grouped token/cost aggregates before mapping them to GraphQL DTOs. No layer clamps or converts the token numbers. | Token Statistics request, period ledger events, runtime/model or task aggregate, GraphQL token-usage DTO | `TokenUsageStatisticsProvider` behind the GraphQL resolver boundary | Pricing projection is preserved; persistence remains unchanged. |
| DS-002 | Each token-valued DTO field is serialized through `GraphQLSafeInt`, returned as an exact JSON number, normalized by the Pinia store, and formatted by the Model table or the primary Task-table input/output cells with the existing full `formatInteger` formatter. Secondary cache/thinking sublines may remain compact. Genuine request errors continue into the same store/UI error state. | GraphQL token quantity, client aggregate, rendered report row | Pinia token statistics store for response state; GraphQL schema for serialization; Task/Model tables for presentation | Codegen keeps `SafeInt` numeric at build time; only the primary Task cells change from compact to exact formatting. |

## Spine Actors / Main-Line Nodes

- `TokenUsageStatistics.vue`: supported user trigger and observable UI outcome.
- `useTokenUsageStatisticsStore`: client request, loading, result, and error lifecycle owner.
- Apollo query boundary: carries existing task/model documents and variables.
- `TokenUsageStatisticsResolver`: authoritative public GraphQL entry and DTO mapping boundary.
- `TokenUsageStatisticsProvider`: period grouping/report projection owner.
- `TokenUsageLedgerStore` / `SqlTokenUsageLedgerRepository`: authoritative persisted-event access.
- `buildTokenUsageCostSummaryAggregate`: token/cost summation transformation owner.
- `GraphQLSafeInt`: token output serialization range owner.
- `TokenUsageTaskStatisticsTable.vue` / `TokenUsageModelStatisticsTable.vue`: primary token-cell presentation; Task primary cells use full integer formatting, with compact secondary explanatory text retained.

## Ownership Map

| Main-Line Node | Owns | Explicitly Does Not Own |
| --- | --- | --- |
| `TokenUsageStatistics.vue` | Control inputs and selection among loading/empty/error/table states | GraphQL queries, aggregation, numeric coercion |
| Pinia `tokenUsageStatistics` store | Concurrent query orchestration, normalized client state, error propagation | Backend range validation, SQL, presentation formatting |
| `TokenUsageStatisticsResolver` / GraphQL DTO types | Public query contract, scalar declarations, domain-to-transport field mapping | Period grouping policy or storage |
| `TokenUsageStatisticsProvider` | Supported date-range grouping and report rows | GraphQL scalar policy or UI state |
| Ledger store/repository | Persisted event access and period filter | GraphQL representation |
| Aggregate builder | Token/cost sums and aggregate invariants | Transport serialization or UI |
| `GraphQLSafeInt` | Exact safe-integer serialization/parsing contract | Domain non-negativity or aggregation semantics |
| Codegen configuration | Client custom-scalar TypeScript mapping | Runtime serialization or manual generated-file business logic |

`TokenUsageStatisticsResolver` is a thin public GraphQL entry around the provider for period statistics, but the same file is also the authoritative owner of the output schema and DTO mapping. It must not absorb provider or persistence logic.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| GraphQL `usageStatisticsInPeriod` / `tokenUsageTaskStatisticsInPeriod` resolver methods | `TokenUsageStatisticsProvider` | Expose typed public queries and map results into GraphQL DTOs | Grouping, arithmetic, SQL, migration |
| Apollo client invocation in the Pinia store | Pinia token statistics state owner and backend GraphQL boundary | Execute stable query documents under one UI lifecycle | Scalar fallback, value capping, UI formatting |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Built-in `Int` decorators on every token-valued field in `token-usage-stats.ts` | They reject valid supported aggregates. | `GraphQLSafeInt` in the same authoritative GraphQL type owner. | In This Change | Keep `Int` import/use for non-token `usageReportCount`. |
| Generated `Scalars['Int']` references for affected token fields | They no longer describe the backend schema. | Regenerated `Scalars['SafeInt']['output']` references with explicit numeric mapping. | In This Change | Generated output must not be hand-maintained. |
| Any proposed cap/string/fallback/migration workaround | It would corrupt values or create a parallel path. | Single clean `SafeInt` response contract. | In This Change | Do not add temporarily. |

## Return Or Event Spine(s) (If Applicable)

`GraphQL token-usage DTO -> GraphQLSafeInt serialization -> Apollo JSON response -> Pinia normalizeAggregate/state -> TokenUsageTaskStatisticsTable or TokenUsageModelStatisticsTable -> Intl.NumberFormat -> exact visible token count`

For unrelated failures, the preserved branch is:

`GraphQL/request error -> Pinia catch/error state -> TokenUsageStatistics.vue existing error banner`

## Bounded Local / Internal Spines (If Applicable)

N/A — no event loop, worker cycle, state machine, dispatcher, or callback lifecycle is changed or needed.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Frontend GraphQL codegen scalar mapping | DS-002 | Client GraphQL contract owner | Map `SafeInt` input/output to TypeScript `number` and generate accurate artifacts. | Endpoint introspection omits scalar package extensions; otherwise types degrade to `any`. | Runtime store/UI would acquire schema-policy work or generated output would be hand-edited. |
| Token pricing projection | DS-001 | Aggregate builder/provider | Preserve existing cost fields while token counts change transport scalar. | Report includes prices/costs but they are not part of this defect. | Scalar fix could accidentally alter unrelated accounting semantics. |
| Locale number formatting | DS-002 | Report table | Display exact safe-integer digits with locale separators. | Existing user-facing formatting already satisfies AC-002. | Transport/domain code would start owning presentation. |

## Ownership Boundaries

- The UI component must continue to call the Pinia store rather than Apollo directly.
- The Pinia store must continue to use the public GraphQL queries rather than backend/internal numeric fallbacks.
- Period GraphQL resolvers must continue to delegate grouping and aggregate construction to `TokenUsageStatisticsProvider` and its owned projection/persistence collaborators.
- Token range serialization belongs only to GraphQL scalar declarations in the DTO owner; provider, aggregate, repository, and UI must not cap or stringify values.
- Client scalar typing belongs in `codegen.ts`; `generated/graphql.ts` is an output, not a second policy owner.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| Pinia token statistics store | Apollo calls, response normalization, loading/error state | `TokenUsageStatistics.vue` | Component invokes Apollo and locally coerces large values | Strengthen store types/normalization, not component workarounds |
| `TokenUsageStatisticsResolver` GraphQL contract | Output DTO mappings and scalar declarations | Apollo/public GraphQL callers | Client assumes a hidden alternate large-number endpoint or parses server error text | Correct the public field scalar directly |
| `TokenUsageStatisticsProvider` | Period event grouping and aggregate construction | Period statistics resolver methods | Resolver reads repository and recomputes/caps sums | Extend provider if report policy changes; no such change here |
| `TokenUsageLedgerStore` | SQL repository and display-field capture | Provider and run-summary paths | GraphQL resolver executes ad hoc SQL | Extend store/repository only for storage needs; none here |
| `autobyteus-web/codegen.ts` | Custom scalar mapping policy | GraphQL generator | Hand-edit generated scalar types or add local `as number` casts | Add/adjust generator config and regenerate |

## Dependency Rules

Allowed:

- Settings component → Pinia statistics store → Apollo query documents.
- GraphQL resolver/DTO file → provider/store domain APIs and `graphql-scalars`.
- Provider → ledger store and aggregate projection.
- Ledger store → SQL repository.
- Frontend codegen configuration → backend exposed schema; generated output → client compile-time consumers.

Forbidden:

- UI/store/provider/repository-side value capping, string conversion, or GraphQL error suppression.
- Resolver-side SQL/Prisma access for period statistics.
- Manual `generated/graphql.ts` type policy that differs from `codegen.ts`.
- Database schema/migration dependency for this transport-only fix.
- Dual old/new scalar fields, fallback queries, or compatibility wrappers.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `usageStatisticsInPeriod(startTime, endTime)` | Runtime/model period statistics | Return grouped statistics with safe-integer token quantities. | Explicit start/end DateTime bounds | Logged failing query; exact field names remain. |
| `tokenUsageTaskStatisticsInPeriod(startTime, endTime)` | Task/team period statistics | Return hierarchy rows whose shared aggregates use safe token quantities. | Explicit start/end DateTime bounds | Concurrently invoked by the page. |
| `getAgentRunTokenUsageSummary(runId)` | Agent run token summary | Return the shared aggregate and context token fields safely. | Explicit run ID | Same transport type family; no new behavior. |
| `getTeamRunTokenUsageSummary(teamRunId)` | Team run token summary | Same shared token contract for a team run. | Explicit team-run ID | Preserve subject-specific method. |
| `getTeamMemberTokenUsageSummary(teamRunId, memberAgentRunId/memberRouteKey)` | Team member token summary | Same shared token contract for explicit member identity. | Existing explicit compound selectors | No identity redesign in this task. |
| GraphQL `SafeInt` scalar | Token quantities | Serialize exact safe integers beyond signed 32-bit range. | JavaScript safe integer | Non-negativity already owned upstream. |
| Codegen scalar mapping | Client representation of `SafeInt` | Produce numeric input/output types. | Scalar name `SafeInt` | Must not map to `any`, `string`, or `bigint`. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `usageStatisticsInPeriod` | Yes | Yes | Low | Scalar-only correction. |
| `tokenUsageTaskStatisticsInPeriod` | Yes | Yes | Low | Reuse shared aggregate contract. |
| Subject-specific run-summary methods | Yes | Yes | Low | Preserve separate APIs; do not introduce a generic guessed-ID query. |
| `SafeInt` | Yes | Yes | Low | Explicitly map same scalar name in codegen. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Period statistics owner | `TokenUsageStatisticsProvider` | Yes | Low | No rename. |
| Aggregate structure | `TokenUsageCostSummaryAggregate` | Yes | Low | No rename. |
| Transport scalar | `GraphQLSafeInt` / schema `SafeInt` | Yes | Low | Reuse package name consistently. |
| Report count | `usageReportCount` | Yes | Low | Do not misclassify as a token value. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Serialize token quantities above signed 32-bit range | `graphql-scalars` dependency | Reuse | `GraphQLSafeInt` matches the current JS-number domain. | N/A |
| Own token GraphQL schema/mapping | Existing token-usage GraphQL type/resolver file | Extend | Already the authoritative transport owner. | N/A |
| Own custom scalar client types | Existing web codegen configuration | Extend | Central policy owner for generated GraphQL types. | N/A |
| Prove real GraphQL behavior | Existing token-usage E2E infrastructure | Extend | Already builds schema and uses ledger fixtures. | N/A; durable coverage owned downstream. |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Server token-usage GraphQL API | Query entrypoints, DTO mapping, output scalar declarations | DS-001, DS-002 | Resolver/provider | Extend | Only token-valued decorators change. |
| Token-usage domain/projection/persistence | Non-negative ingestion, grouping, sums, ledger access | DS-001 | Provider/aggregate/store | Reuse | No source or data change. |
| Web GraphQL contract generation | Custom scalar TypeScript mapping and generated artifacts | DS-002 | Pinia/client compile-time contract | Extend | Explicit `SafeInt` number mapping. |
| Settings token-statistics UI | Fetch state and exact display | DS-001, DS-002 | Pinia store/component | Extend | Narrow Task-table primary-cell formatting correction; no control/state/table-structure redesign. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/api/graphql/types/token-usage-stats.ts` | Server token-usage GraphQL API | Public GraphQL DTO/resolver boundary | Apply `GraphQLSafeInt` consistently to token-valued outputs while retaining `Int` for report count. | Existing coherent type-family and mapping owner. | Yes — package scalar and existing domain DTOs. |
| `autobyteus-web/codegen.ts` | Web GraphQL contract generation | Generator policy | Map schema `SafeInt` input/output to TypeScript `number`. | Existing single generator configuration. | Yes — scalar name from backend schema. |
| `autobyteus-web/generated/graphql.ts` | Web GraphQL contract generation | Generated output | Reflect schema `SafeInt` and affected field types. | Canonical generated artifact consumed by web build. | Yes — generated from schema/config. |
| `autobyteus-web/components/settings/token-usage/TokenUsageTaskStatisticsTable.vue` | Settings token-statistics UI | Task report presentation owner | Render primary input/output token values with full `formatInteger`; retain compact secondary sublines. | It is the existing owner of the contradicted presentation behavior. | Yes — reuses formatter API and normalized aggregate. |

API/E2E test files are not implementation-engineer-owned source in this team flow. The downstream API/E2E engineer will select and own proportionate durable test changes using the coverage intent in the requirements and supplement.

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Safe-integer scalar behavior across token fields | Existing `GraphQLSafeInt` export from `graphql-scalars`; no new local file | Server GraphQL transport | One established scalar enforces the same range for every token field. | Yes — no per-field serializer | Yes — one scalar contract | A local wrapper, cap helper, or dual scalar family |
| Client scalar type mapping | `autobyteus-web/codegen.ts` | Web GraphQL contract generation | One generator policy prevents repeated casts/`any`. | Yes | Yes | Hand-maintained generated types |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| GraphQL `SafeInt` for token quantities | Yes — exact safe integer range; upstream domain owns non-negativity | Yes — replaces per-field built-in `Int` mismatch | Low | Keep numeric codegen mapping identical. |
| `TokenUsageCostSummaryAggregate` | Yes for this scope | N/A — structure unchanged | Low | Do not add string/bigint mirrors. |
| Generated `Scalars['SafeInt']` | Yes — TypeScript `number` input/output | Yes — no `any` or manual alias | Low | Regenerate from one config. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/api/graphql/types/token-usage-stats.ts` | Server token-usage GraphQL API | Token-usage GraphQL schema/mapping boundary | Import `GraphQLSafeInt`; replace token-valued `Int` decorators in aggregate, usage-statistics, and run-summary token fields; retain `usageReportCount: Int`. | Current type family is the single authoritative transport owner. | `GraphQLSafeInt`, current DTO/domain types |
| `autobyteus-web/codegen.ts` | Web GraphQL contract generation | Generator policy owner | Configure `SafeInt` scalar input/output as `number`. | Centralizes client scalar policy. | Backend schema scalar name |
| `autobyteus-web/generated/graphql.ts` | Web GraphQL contract generation | Generated artifact | Regenerated `SafeInt` scalar entry and field references. | Single canonical generated client schema. | Codegen config/backend schema |
| `autobyteus-web/components/settings/token-usage/TokenUsageTaskStatisticsTable.vue` | Settings token-statistics UI | Task table presentation boundary | Use `formatInteger` for primary gross input/output cells; preserve compact sublines and all sorting/structure/state. | Existing file owns the narrow UI correction; no new formatter abstraction is needed. | Existing `createTokenUsageStatisticsFormatter` and normalized `number` fields |

No production source file is added, moved, renamed, or deleted; one existing UI file is modified for the approved exact-display correction.

## Applied Patterns (If Any)

- Existing custom GraphQL scalar reuse: range semantics live at the transport schema boundary rather than in ad hoc resolver/UI conversions.
- Generated-contract policy: custom scalar mapping lives in generator configuration; generated output remains derived.
- Thin transport facade: resolver methods continue to delegate statistics composition to the provider.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/api/graphql/types/token-usage-stats.ts` | File | Server token-usage GraphQL API | Token stats object types, scalar declarations, DTO mappings, resolver entrypoints | Existing established flat GraphQL type organization is proportionate for a three-file correction. | SQL, caps, string conversion, migration logic |
| `autobyteus-web/codegen.ts` | File | Web GraphQL generator | Custom scalar → TypeScript policy | Existing generator configuration owner | Runtime parsing, UI logic, generated field declarations |
| `autobyteus-web/generated/graphql.ts` | File | Generated web contract | Derived schema/operation types | Existing generator output path | Hand-authored compatibility or business logic |

The existing layout stays flat because the affected responsibilities already have clear owners and no new structural depth is introduced.

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/api/graphql/types/` | Transport | Yes | Low | Scalar/type mapping stays at public GraphQL boundary. |
| `autobyteus-server-ts/src/token-usage/` | Main-Line Domain-Control plus established provider/persistence subfolders | Yes | Low | Reused unchanged; do not leak scalar concerns inward. |
| `autobyteus-web/` root `codegen.ts` + `generated/` | Off-Spine contract generation | Yes | Low | Existing separation of policy and generated output. |
| `autobyteus-web/components/settings/token-usage/` | Transport/presentation | Yes | Low | Existing task table owns a narrow exact-format correction; no schema workaround or new folder. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Exact response | `grossInputTokens: 3_136_827_911` → `GraphQLSafeInt` → JSON number → Task primary cell `3,136,827,911` display | `Math.min(value, 2_147_483_647)`, `3.14B` as the only primary value, rounding, row deletion, or string fallback | Demonstrates that success means exact digits, not merely absence of an error. |
| Scalar ownership | `@Field(() => GraphQLSafeInt) inputTokens!: number` with `SafeInt` codegen mapping | Provider-specific cap helper plus client `parseInt` | Keeps range policy at the authoritative transport boundary. |
| Client contract | Codegen produces `SafeInt: { input: number; output: number }` and affected fields reference it | Generated scalar is `any` or hand-edited to `number` | Prevents silent loss of type safety. |
| Persistence decision | Existing SQLite rows read unchanged | New migration/backfill rewrites token columns | Makes clear that this is not a database repair. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep `Int` plus add duplicate `safe...` fields | Avoid schema scalar change for old clients | Rejected | Change current token fields directly to `SafeInt`; JSON remains numeric and field names stay stable. |
| Resolver fallback after `Int` error | Localize workaround | Rejected | GraphQL scalar must be correct before serialization; no dual path. |
| Cap at `2_147_483_647` | Would avoid exception | Rejected | Preserve exact value through `SafeInt`. |
| Convert token counts to `String` | Bypasses numeric range | Rejected | Keep current numeric domain and formatter. |
| Adopt `GraphQLBigInt`/string-bigint client contract | Covers values above JS safe range | Rejected | Not required for observed or approved range; would create a broader client/runtime change. |
| Database migration/backfill | User suspected database issue | Rejected | No persistence change; remove no data and rewrite nothing. |
| Leave generated token fields on `Int` or `any` | Could make runtime appear fixed quickly | Rejected | Explicit mapping and regenerated `SafeInt` types are part of completion. |

## Derived Layering (If Useful)

N/A — the spine and ownership maps already show the necessary transport → domain/projection → persistence and return-to-UI relationships. Additional layer terminology would not improve this local change.

## Change / Refactor Sequence

1. Reconcile the existing uncommitted candidate diff and establish which implementation-owned files are intentional; do not discard unrelated work or claim unowned E2E changes.
2. In `token-usage-stats.ts`, import `GraphQLSafeInt` and replace built-in `Int` only on the enumerated token-valued fields. Keep non-token `usageReportCount` on `Int`.
3. In `autobyteus-web/codegen.ts`, configure schema scalar `SafeInt` with TypeScript `number` input/output.
4. Expose/build the matching backend schema and run the existing web codegen command; accept `generated/graphql.ts` only as generator output. Verify no affected token field retains `Scalars['Int']` and `SafeInt` is not `any`.
5. Change `TokenUsageTaskStatisticsTable.vue` primary gross input/output cells to the existing `formatInteger` formatter; retain compact formatting in secondary cache/thinking sublines and preserve task sorting, structure, state, and model-table behavior.
6. Run implementation-scoped server/web compile/type/build checks. Preserve provider, aggregate, store, query, and persistence files unless new evidence triggers a design-impact return.
7. Remove the obsolete token-field `Int` references as part of the same clean cut; do not leave compatibility branches.
8. Hand implementation source/codegen/generated/UI changes to source review with the cumulative artifact package and explicit note about any pre-existing E2E diff.
9. After source review passes, the API/E2E engineer owns durable above-32-bit GraphQL, primary task-query, exact-render, and error-regression coverage, execution environment, cleanup, and evidence.

## Key Tradeoffs

- `GraphQLSafeInt` retains the existing JavaScript `number` contract and fixes the reachable defect with minimal surface area; it intentionally does not solve hypothetical values above `Number.MAX_SAFE_INTEGER`.
- Applying the scalar to the whole token-valued GraphQL family changes more declarations than the single logged field but enforces one coherent transport invariant and prevents equivalent failures in the concurrently invoked task query and shared run summaries.
- Explicit codegen configuration adds one small policy entry but avoids unsafe `any` types that endpoint introspection would otherwise generate.
- Full formatting in the primary Task cells trades the former compact-at-a-glance presentation for exact user-visible values required by AC-002; compact supporting sublines preserve useful density where they are not the sole value representation.
- No refactor keeps the change proportional because existing owners and file placement are healthy for this task.

## Risks

- The installed 1.4.26 packaged app will continue to reproduce the error until a source build is run or a new artifact is installed.
- Generated output can drift if codegen runs against a mismatched/stale backend endpoint; implementation/API-E2E evidence must record the matching schema environment.
- A stray token-valued `Int` declaration could leave another shared path vulnerable; field-family inventory/schema assertions should detect this.
- If only the model table is changed, the primary Task report remains non-compliant; source review and component coverage must include `TokenUsageTaskStatisticsTable.vue`.
- Values above JavaScript's safe-integer maximum remain outside the approved contract; `SafeInt` rejects rather than corrupts them.
- Current worktree source/test edits have concurrent provenance and must be reconciled explicitly in the implementation handoff.

## Implementation Readiness (Mandatory)

- Status: `Implementation Ready`
- Approved use-case and behavior-map coverage: `Pass` — BEH-001 maps both approved fetch/render use cases to REQ-001–REQ-004 and AC-001–AC-005; no unsupported product use case was added.
- Production-path and data-flow-spine coverage for every mapped use case and behavior: `Pass` — DS-001 covers user trigger through ledger aggregation/DTO mapping; DS-002 covers the failing scalar through Pinia state and exact visible outcome or preserved unrelated error.
- Complete shared-design-principles validation: `Pass` — current owners and authoritative boundaries are preserved; scalar/codegen policy is centralized; no bypass, generic selector, compatibility wrapper, legacy token `Int`, data migration, new subsystem, or disproportionate refactor remains; removal and dependency rules are explicit.
- Corrections made and affected checks repeated: Added the downstream AC-002 exact-display finding to the current-state read; changed the target to full formatting in primary Task input/output cells; expanded behavior, spine, ownership, file, sequence, and coverage mappings to include that correction; retained compact secondary sublines; rechecked behavior, data decision, boundaries, removal, and proportionality.
- Remaining non-blocking risks: Packaged-app rollout, matching-schema codegen setup, current worktree edit provenance, and the intentionally bounded safe-integer domain.
- Blocking requirement, evidence, or design gaps: `None`

## Guidance For Implementation

- Work only in `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-int-overflow` on `codex/token-statistics-int-overflow`.
- Treat the requirements doc, investigation notes, this design, and `graphql-token-count-contract.md` as the approved canonical package.
- Reconcile existing uncommitted changes before editing; do not overwrite or discard unexplained work.
- Required implementation-owned production files are limited to:
  - `autobyteus-server-ts/src/api/graphql/types/token-usage-stats.ts`
  - `autobyteus-web/codegen.ts`
  - generated `autobyteus-web/generated/graphql.ts`
- Also modify `autobyteus-web/components/settings/token-usage/TokenUsageTaskStatisticsTable.vue`: use `formatter.formatInteger` for the primary gross input/output token cells; retain `formatCompactInteger` only for secondary explanatory sublines. Add/adjust the owning durable table/store assertions through the downstream API/E2E stage.
- Token-valued target fields are all token components in `TokenUsageCostSummaryAggregateGraphql`, the token aliases/components in `UsageStatistics`, and `latestPromptTokens` / `effectiveContextWindowTokens` in `TokenUsageRunSummaryGraphql`. `usageReportCount` remains built-in `Int`.
- Keep `GraphQLSafeInt` numeric in codegen. Do not hand-edit generated field types without running and recording the generator.
- Do not change Prisma/SQLite schema/data, providers, aggregate arithmetic, query documents, Pinia normalization/error behavior, or any UI formatting beyond the explicitly scoped primary Task-cell correction above.
- Implementation checks should prove source/schema/codegen/type consistency; broader API/E2E test ownership remains downstream.
- In the implementation handoff, report the exact origin/disposition of the pre-existing E2E test diff and list all commands/results. If it exposes a requirement/design gap, return to `solution_designer`; do not silently redesign.
