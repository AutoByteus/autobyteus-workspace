# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Design spec revised after architecture review round 1; ready for round 2 review
- Investigation Goal: Analyze feasibility and product/design merit of task/run-oriented token statistics rows, especially agent team rows expandable by member.
- Scope Classification (`Small`/`Medium`/`Large`): Medium
- Scope Classification Rationale: Requires understanding persisted ledger data, statistics grouping API, current settings UI, and run/team metadata availability.
- Scope Summary: Inspect current token statistics implementation and ledger schema to decide whether run/team grouping is possible and recommended.
- Primary Questions To Resolve:
  - What does Settings > Token Statistics currently group by?
  - What identities are persisted in token usage ledger events?
  - Can we aggregate by root team run / member run without double counting?
  - What metadata is available for human-readable task rows?

## Request Context

User observed that the Settings > Token Statistics page groups by LLM model, but a more intuitive user view may be cost per agent run or agent team run. For team runs, the user suggests one team row that expands to individual member rows, helping users understand average task/team costs.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git monorepo
- Task Workspace Root: /Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-run-team-analysis
- Task Artifact Folder: /Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-run-team-analysis/tickets/in-progress/token-statistics-run-team-analysis
- Current Branch: codex/token-statistics-run-team-analysis
- Current Worktree / Working Directory: /Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-run-team-analysis
- Bootstrap Base Branch: origin/personal
- Remote Refresh Result: `git fetch origin --prune` succeeded on 2026-06-28.
- Task Branch: codex/token-statistics-run-team-analysis
- Expected Base Branch (if known): origin/personal
- Expected Finalization Target (if known): personal
- Bootstrap Blockers: None
- Notes For Downstream Agents: User approved requirements on 2026-06-29 and requested design kickoff. Implementation should proceed only after architecture review passes.

## Source Log

| Date | Source Type | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-06-28 | Command | Dedicated worktree bootstrap commands | Create isolated task context | Worktree created from origin/personal. | No |
| 2026-06-29 | Skill read | `solution-designer/design-principles.md` | Required shared design reference for design kickoff. | Confirmed spine-first, ownership-first, explicit boundary and reusable-structure rules. | Use in design spec. |
| 2026-06-29 | Skill read | `solution-designer/references/design-examples.md` | User requested design examples before kickoff. | Relevant examples: CRUD/request flow, generic list surface avoidance, team/member identity split. | Use in design spec. |
| 2026-06-29 | Source read | `autobyteus-server-ts/src/token-usage/providers/statistics-provider.ts` | Confirm current historical stats owner. | Current model grouping is model-only and should be extended to runtime/model pair. | Design provider changes. |
| 2026-06-29 | Source read | `autobyteus-server-ts/src/token-usage/providers/token-usage-ledger-store.ts` | Confirm summary-building owner. | Private `buildSummary` already computes cache-aware run summaries; target design should extract/reuse this instead of duplicating aggregation. | Design reusable summary builder. |
| 2026-06-29 | Source read | `autobyteus-server-ts/src/api/graphql/types/token-usage-stats.ts` | Confirm GraphQL entrypoints. | Existing resolver exposes model stats and run/team summary queries; new historical task rows need a new explicit query. | Design GraphQL shapes. |
| 2026-06-29 | Source read | `autobyteus-web/components/settings/TokenUsageStatistics.vue`, `autobyteus-web/stores/tokenUsageStatistics.ts`, `autobyteus-web/graphql/queries/token_usage_statistics_queries.ts` | Confirm frontend current view. | Current Settings page has a single model table/chart and single store/query. | Design tabbed store/query split. |
| 2026-06-29 | Source read | Run-history catalog/metadata services and types | Confirm metadata join sources. | Catalog rows provide createdAt/name/summary/workspace; metadata provides runtime/model/member tree. | Design metadata enricher. |
| 2026-06-29 | Architecture review report | `tickets/in-progress/token-statistics-run-team-analysis/design-review-report.md` | Round 1 architecture review. | Failed with AR-001 range-mode artifact conflict and AR-002 run-summary-specific shared aggregate contract. | Rework completed in `design-rework-round2.md`. |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: Settings page `TokenUsageStatistics.vue` date range form.
- Current execution flow: Settings page calls Pinia `tokenUsageStatistics.fetchStatistics` -> GraphQL `usageStatisticsInPeriod` -> `TokenUsageStatisticsProvider.getStatisticsPerModel` -> ledger `listEventsInPeriod` -> model-only grouping.
- Ownership or boundary observations: `TokenUsageStatisticsProvider` owns historical aggregate grouping; `TokenUsageLedgerStore` owns ledger reads and focused run/team/member summaries; run-history services own human-readable run/team metadata.
- Current behavior summary: Current page answers "which model consumed tokens/cost in this period?" but not "which task/team consumed cost?".

## Design Health Assessment Evidence

- Change posture: Feature / Product UX improvement.
- Candidate root cause classification: No design issue in core ledger/cost accounting; missing task-oriented and runtime/model reporting projections.
- Refactor posture evidence summary: Targeted extraction needed: split private `TokenUsageLedgerStore.buildSummary` into an identity-free `TokenUsageCostSummaryAggregate` builder plus a run-summary adapter so task/model projections do not duplicate aggregation policy or inherit false run identity fields.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `TokenUsageStatisticsProvider` | Groups only by model. | Current page is model-diagnostic, not task-cost-oriented; also collapses same model across runtimes. | Add task projection and runtime/model projection. |
| `TokenUsageLedgerEvent` schema | Stores run/team/member identities and rich cost/cache fields. | Historical run/team grouping is feasible without schema migration for new records. | Handle legacy missing metadata with explicit fallback. |
| `TokenUsageLedgerStore` | Private `buildSummary` computes correct run/team/member totals but mixes metrics with run identity. | Reuse by extracting identity-free aggregate core plus run-summary adapter; do not duplicate cost math. | Add aggregate builder and adapter. |
| Run-history services | Store agent/team names, summaries, createdAt, member tree. | Human-readable task rows are feasible by joining/enriching with run history metadata. | Add metadata enricher. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/token-usage/providers/statistics-provider.ts` | Historical token usage statistics provider. | Model-only grouping. | Extend as authoritative owner for task rows and runtime/model rows. |
| `autobyteus-server-ts/src/token-usage/providers/token-usage-ledger-store.ts` | Ledger access and focused run/team/member summaries. | Has private cache-aware `buildSummary` that mixes metrics and run identity. | Extract identity-free aggregate builder plus run-summary adapter and delegate to adapter. |
| `autobyteus-server-ts/src/token-usage/repositories/sql/token-usage-ledger-repository.ts` | SQL ledger persistence/read adapter. | Existing period read is sufficient for MVP. | No schema/persistence change planned. |
| `autobyteus-server-ts/src/api/graphql/types/token-usage-stats.ts` | GraphQL token usage stats boundary. | Existing model stats plus focused summary queries. | Add task stats query/types and runtime/model fields. |
| Run-history catalog/metadata services | Human-readable run/team metadata. | Provide names, summaries, createdAt, member tree. | Use via metadata enricher; GraphQL must not bypass provider. |
| `autobyteus-web/components/settings/TokenUsageStatistics.vue` | Current single table settings UI. | Model table only. | Refactor into page shell + task/model tables. |
| `autobyteus-web/stores/tokenUsageStatistics.ts` | Frontend stats state/query action. | Model-only state. | Add task rows, model rows, loading/error fetch actions. |

## Runtime / Probe Findings

None yet.

## External / Public Source Findings

No external sources consulted.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: None for static analysis.
- Required config, feature flags, env vars, or accounts: None.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Dedicated git worktree creation.
- Cleanup notes for temporary investigation-only setup: None.

## Findings From Code / Docs / Data / Logs

- The ledger schema already has run/team/member/runtime/model/cache/cost fields.
- Current settings GraphQL model stats are model-only and use historical `promptTokens` / `assistantTokens` names.
- Focused run/team/member summary GraphQL already exposes rich cache-aware summary fields.
- Frontend Token Meter formatting already has useful status/cost/cache formatting helpers that should be reused or extended for Settings statistics.

## Constraints / Dependencies / Compatibility Facts

- No token price formula changes are in scope.
- No ledger schema migration is expected for MVP.
- Existing model-only grouping should be replaced with runtime/model grouping rather than preserved as a legacy path.
- The MVP date range semantics remain ledger `observedAt` filtering and must be labelled `Usage during period`.
- Frontend generated GraphQL types must be regenerated after schema/query changes.

## Open Unknowns / Risks

- Some legacy rows may lack run/team/member/runtime metadata. Design uses `Unknown` and `First usage observed` fallbacks.
- Very large date ranges may require repository-level grouping later; existing model stats already read events into memory, so this is not a new MVP blocker.
- Member agent created time may require fallback if member runs are not indexed as standalone agent runs.


## Design Kickoff Notes — 2026-06-29

- User approved the refined requirements and asked to read design principles/examples before kicking off implementation design.
- Required reads completed: `design-principles.md`, `references/design-examples.md`, and `templates/design-spec-template.md`.
- Most relevant design principles for this task:
  - Preserve an authoritative statistics provider boundary; GraphQL should not assemble ledger + run-history internals directly.
  - Split subject boundaries: task/run statistics and runtime/model diagnostics should be explicit surfaces, not one generic mixed list.
  - Extract shared summary-building logic instead of duplicating cache/cost aggregation in a new provider.
  - Keep team and member identity separate to prevent double counting.
- Most relevant design examples:
  - CRUD/request flow: `Frontend -> API -> Service/Provider -> Repository -> Data`, with metadata enrichment as an off-spine concern.
  - Team run orchestration: team run and member run identities must not collapse into generic run identity.
  - Generic list surface anti-example: avoid a generic `listRuns(filter)`-style API for mixed subject rows unless identity type is explicit.

## Notes For Architect Reviewer

Design spec has been revised for round 2 at `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-run-team-analysis/tickets/in-progress/token-statistics-run-team-analysis/design-spec.md`.

Round 1 rework notes are at `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-run-team-analysis/tickets/in-progress/token-statistics-run-team-analysis/design-rework-round2.md`.

Key round 2 review focus:

- AR-001: UI prototype now shows static `Usage during period` help text only; no range-mode dropdown and no `rangeMode` query argument.
- AR-002: Shared aggregation is now an identity-free `TokenUsageCostSummaryAggregate` plus a separate run-summary adapter for existing focused run/team/member summaries.
- Provider boundary remains: GraphQL delegates to `TokenUsageStatisticsProvider`; it does not assemble ledger/run-history internals directly.
- Grouping policy remains: task rows avoid member double counting; model diagnostics group by runtime/model pair.


## Findings From Current-State Inspection

### Current settings statistics are model-first

- `autobyteus-server-ts/src/token-usage/providers/statistics-provider.ts` groups ledger records with `groupByModel`, using `model_identifier ?? model_value ?? "unknown"`.
- `usageStatisticsInPeriod(startTime, endTime)` in `autobyteus-server-ts/src/api/graphql/types/token-usage-stats.ts` exposes only `UsageStatistics` rows keyed by `llmModel`.
- `autobyteus-web/components/settings/TokenUsageStatistics.vue` renders one row per `stat.llmModel` and labels the primary column "LLM Model".

### Persisted ledger already has run/team identity

`autobyteus-server-ts/prisma/schema.prisma` persists enough identity fields for run/team grouping:

- `runId`
- `rootTeamRunId`
- `teamRunPathJson`
- `memberAgentRunId`
- `memberPathJson`
- `memberRouteKey`
- `agentDefinitionId`
- `workspaceId`
- `taskAgentInstanceId`, `taskAgentRunId`, `taskId`
- token/cost fields including cache and reasoning breakdowns

The context enricher populates these fields from runtime/team context before persistence.

### Existing summary builder already supports live run/team/member totals

`TokenUsageLedgerStore` already has:

- `getAgentRunSummary(runId)`
- `getTeamRunSummary(rootTeamRunId)`
- `getTeamMemberSummary({ rootTeamRunId, memberAgentRunId?, memberRouteKey? })`

These build rich summaries with gross input, standard input, cache read/write, output, reasoning, cost, currency, status, model/provider, and usage report count. This is close to the shape needed for historical run/team rows, but the current settings statistics API does not list summaries by date range.

### Run-history metadata can provide user-readable row labels

- Agent run index rows contain `runId`, `agentDefinitionId`, `agentName`, `workspaceRootPath`, `summary`, `createdAt`, archive/termination timestamps.
- Team run index rows contain `teamRunId`, `teamDefinitionId`, `teamDefinitionName`, `workspaceRootPath`, `summary`, `createdAt`, archive/termination timestamps.
- Team metadata contains member tree entries with `memberRouteKey`, `memberName`, `memberRunId`, `agentDefinitionId`, `llmModelIdentifier`, runtime kind, and workspace path.

Therefore token ledger can provide accounting and run history can provide names/summaries.

### Key design constraint: avoid double counting

For top-level historical rows:

- Standalone agent rows should group events where `root_team_run_id` is null, keyed by `run_id`.
- Team rows should group events where `root_team_run_id` is present, keyed by `root_team_run_id`.
- Team-member rows should be children of the team row, grouped by `member_route_key` or `member_agent_run_id`, and should not also appear as standalone top-level rows.

### Key product constraint: date range semantics

There are two different user questions:

1. Billing-period question: "How much cost happened between dates?" Filter token events by `observed_at` and group those event deltas by run/team. A long-running task may show a partial cost for that period.
2. Task-cost question: "How much did each task cost?" Filter runs by run/team `createdAt` or completion/termination date, then show the full run/team cost. This better supports average task cost analysis.

The user's wording leans toward task-cost analysis, while the current settings date range is billing-period oriented. MVP makes this explicit with static `Usage during period` help text; a selectable `Tasks created in period` mode is future-only.

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: Settings page `TokenUsageStatistics.vue` date range form.
- Current execution flow: Settings page calls Pinia `tokenUsageStatistics.fetchStatistics` -> GraphQL `usageStatisticsInPeriod` -> `TokenUsageStatisticsProvider.getStatisticsPerModel` -> ledger `listEventsInPeriod` -> group by model.
- Ownership or boundary observations: `TokenUsageStatisticsProvider` owns historical aggregate grouping; `TokenUsageLedgerStore` owns ledger summary access; the revised design separates identity-free metric aggregation from run-summary identity adaptation; run-history services own human-readable run/team metadata.
- Current behavior summary: Current page answers "which model consumed tokens/cost in this period?" but not "which task/team consumed cost?".

## Design Health Assessment Evidence

- Change posture: Feature / Product UX improvement
- Candidate root cause classification: No design issue in cost ledger; product/reporting view is missing the user-centered grouping dimension.
- Refactor posture evidence summary: Existing data is sufficient, but the private run-summary builder must be split into identity-free aggregate core plus run-summary adapter before adding historical task/runtime-model projections.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `TokenUsageStatisticsProvider` | Groups only by model. | Current page is model-diagnostic, not task-cost-oriented, and collapses runtime/model differences. | Add task projection and runtime/model projection. |
| `TokenUsageLedgerEvent` schema | Stores run/team/member/runtime/model identities and rich cost/cache fields. | Historical run/team grouping and runtime/model grouping are feasible without schema migration for new records. | Use explicit legacy fallbacks. |
| `TokenUsageLedgerStore` | Already builds run/team/member summaries by ID through private identity-specific logic. | Aggregation logic should be extracted as identity-free aggregate core plus run-summary adapter. | Need list-by-period grouping API and shared aggregate builder. |
| Run-history services | Store agent/team names, summaries, createdAt, member tree. | Human-readable task rows are feasible by joining/enriching with run history metadata. | Need join strategy and missing-metadata fallback. |
