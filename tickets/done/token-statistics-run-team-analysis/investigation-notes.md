# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Round 5 field-policy correction complete; requirements/design/UI specs revised for usage-derived member expansion and minimal self-contained display fields
- Investigation Goal: Analyze feasibility and product/design merit of task/run-oriented token statistics rows, especially agent team rows expandable by member.
- Scope Classification (`Small`/`Medium`/`Large`): Medium
- Scope Classification Rationale: Requires understanding persisted ledger data, statistics grouping API, current settings UI, and run/team metadata availability.
- Scope Summary: Inspect current token statistics implementation and ledger schema to decide whether run/team grouping is possible and recommended.
- Primary Questions To Resolve:
  - What does Settings > Token Statistics currently group by?
  - What identities are persisted in token usage ledger events?
  - Can we aggregate by root team run / member run without double counting?
  - What metadata is available for human-readable task rows?
  - After the Electron build, should expanded team rows be usage-derived or roster-complete?

## Request Context

User observed that the Settings > Token Statistics page groups by LLM model, but a more intuitive user view may be cost per agent run or agent team run. For team runs, the user suggests one team row that expands to individual member rows, helping users understand average task/team costs.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git monorepo
- Task Workspace Root: /Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-run-team-analysis
- Task Artifact Folder: /Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-run-team-analysis/tickets/done/token-statistics-run-team-analysis
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
| 2026-06-29 | Source read | Run-history catalog/metadata services and types | Confirm metadata sources for display fields. | Catalog rows provide createdAt/name/summary; metadata provides member names/tree while available. | Design display-field capture/backfill without permanent Settings joins. |
| 2026-06-29 | Architecture review report | `tickets/done/token-statistics-run-team-analysis/design-review-report.md` | Round 1 architecture review. | Failed with AR-001 range-mode artifact conflict and AR-002 run-summary-specific shared aggregate contract. | Rework completed in `design-rework-round2.md`. |
| 2026-06-29 | Runtime probe | `curl -H 'content-type: application/json' --data @/tmp/token_task_query.json http://127.0.0.1:29695/graphql` | Reproduce user-reported Electron Settings > Token Statistics `By Task` team-expansion issue using the embedded Electron server backend. | GraphQL response for several Software Engineering Team runs returned only one expanded member (`solution_designer`) when only that member had period usage events. | Design/provider rework required. |
| 2026-06-29 | Data inspection | `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_06adab49fe4e484a969cca87c110d9ab/team_run_metadata.json` and related team metadata files | Compare GraphQL child rows with persisted team roster metadata. | Metadata for `software_engineering_team_06adab49fe4e484a969cca87c110d9ab` contains six leaf agent members while GraphQL returned only `solution_designer`. This initially looked like missing roster data, but the user later accepted usage-derived member rows and rejected no-usage roster rows for MVP. | Round 5 field policy supersedes roster-complete expansion. |
| 2026-06-29 | Focused evidence artifact | `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-run-team-analysis/tickets/done/token-statistics-run-team-analysis/user-verification-member-roster-probe.json` | Preserve concise reproduction evidence without storing the full GraphQL payload. | Captures three Software Engineering Team examples where returned member count is `1` and metadata roster count is `6`. | Include in handoff package. |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: Settings page `TokenUsageStatistics.vue` date range form.
- Current execution flow: Settings page calls Pinia `tokenUsageStatistics.fetchStatistics` -> GraphQL `usageStatisticsInPeriod` -> `TokenUsageStatisticsProvider.getStatisticsPerModel` -> ledger `listEventsInPeriod` -> model-only grouping.
- Ownership or boundary observations: `TokenUsageStatisticsProvider` owns historical aggregate grouping; `TokenUsageLedgerStore` owns ledger reads and focused run/team/member summaries; run-history services own human-readable run/team metadata.
- Current behavior summary: Current page answers "which model consumed tokens/cost in this period?" but not "which task/team consumed cost?".

## Design Health Assessment Evidence

- Change posture: Feature / Product UX improvement.
- Candidate root cause classification: No design issue in core ledger token/cost calculation; missing task-oriented and runtime/model reporting projections.
- Refactor posture evidence summary: Targeted extraction needed: split private `TokenUsageLedgerStore.buildSummary` into an identity-free `TokenUsageCostSummaryAggregate` builder plus a run-summary adapter so task/model projections do not duplicate aggregation policy or inherit false run identity fields.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `TokenUsageStatisticsProvider` | Groups only by model. | Current page is model-diagnostic, not task-cost-oriented; also collapses same model across runtimes. | Add task projection and runtime/model projection. |
| `TokenUsageLedgerEvent` schema | Stores run/team/member identities and rich cost/cache fields. | Historical run/team grouping is feasible; self-contained display requires only five additional display fields. | Add/backfill five fields and handle legacy missing metadata with explicit fallback. |
| `TokenUsageLedgerStore` | Private `buildSummary` computes correct run/team/member totals but mixes metrics with run identity. | Reuse by extracting identity-free aggregate core plus run-summary adapter; do not duplicate cost math. | Add aggregate builder and adapter. |
| Run-history services | Store agent/team names, summaries, createdAt, member tree. | Human-readable task rows are feasible while metadata exists, but token-statistics should capture only the five UI display fields for historical self-containment. | Add/tighten display-field capture/backfill; avoid permanent Settings joins. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/token-usage/providers/statistics-provider.ts` | Historical token usage statistics provider. | Model-only grouping. | Extend as authoritative owner for task rows and runtime/model rows. |
| `autobyteus-server-ts/src/token-usage/providers/token-usage-ledger-store.ts` | Ledger access and focused run/team/member summaries. | Has private cache-aware `buildSummary` that mixes metrics and run identity. | Extract identity-free aggregate builder plus run-summary adapter and delegate to adapter. |
| `autobyteus-server-ts/src/token-usage/repositories/sql/token-usage-ledger-repository.ts` | SQL ledger persistence/read adapter. | Existing period read is sufficient for MVP grouping, but persistence must carry the five display fields. | Add/map `teamName`, `agentName`, `runSummary`, `runCreatedAt`, `memberName`. |
| `autobyteus-server-ts/src/api/graphql/types/token-usage-stats.ts` | GraphQL token usage stats boundary. | Existing model stats plus focused summary queries. | Add task stats query/types and runtime/model fields. |
| Run-history catalog/metadata services | Human-readable run/team metadata. | Provide names, summaries, createdAt, member tree while metadata exists. | Use only as source for token-usage display-field capture/backfill; GraphQL must not bypass provider. |
| `autobyteus-web/components/settings/TokenUsageStatistics.vue` | Current single table settings UI. | Model table only. | Refactor into page shell + task/model tables. |
| `autobyteus-web/stores/tokenUsageStatistics.ts` | Frontend stats state/query action. | Model-only state. | Add task rows, model rows, loading/error fetch actions. |

## Runtime / Probe Findings

### 2026-06-29 Electron backend reproduction of missing expanded team members

Setup:

- User had an Electron build running from this ticket branch.
- Embedded backend was listening at `http://127.0.0.1:29695/graphql`.
- Queried `tokenUsageTaskStatisticsInPeriod(startTime: "2026-06-21T22:00:00.000Z", endTime: "2026-06-29T21:59:59.999Z")`, matching the visible one-week Settings date range.
- Durable focused evidence: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-run-team-analysis/tickets/done/token-statistics-run-team-analysis/user-verification-member-roster-probe.json`.

Observed:

- The backend returned `113` task rows for the range.
- Many fully active Software Engineering Team rows returned all six members.
- Several Software Engineering Team rows returned exactly one expanded member: `solution_designer`.
- For example, `software_engineering_team_06adab49fe4e484a969cca87c110d9ab` returned one child row, `solution_designer`, with `410,863` total tokens and three usage reports.
- The corresponding team metadata file exists and contains six leaf agent members: `solution_designer`, `architecture_reviewer`, `implementation_engineer`, `code_reviewer`, `api_e2e_engineer`, and `delivery_engineer`.

Final product interpretation after user clarification:

- The observed one-member expansion is acceptable when only `solution_designer` has selected-period token usage.
- Settings > Token Statistics is a usage/cost report, not a roster viewer.
- The earlier roster-complete/no-usage-member idea was rejected because it requires extra fields that are not needed for the current UI.

Current paused implementation issue:

- The later implementation attempted to solve the probe by adding roster-backed member rows, no-usage aggregates, configured member runtime/model, workspace display fields, and member-created-time fields.
- That overcorrects the UI into a roster view and violates the final minimal self-contained field policy.

Classification:

- `Design Impact / Boundary Or Ownership Issue` for the post-build implementation direction, not a price-calculation bug.
- Token-statistics should own only the five user-visible display fields needed for historical usage rows; run-history/team metadata remains a capture/backfill source, not a permanent Settings statistics dependency.

Required correction:

- Requirements/design must state that team expansion is usage-derived for MVP.
- Remove roster-complete/no-usage-member semantics from the Settings statistics shape.
- Remove unnecessary fields from DTO/API/UI (`workspaceName`, `workspaceRootPath`, `periodUsageState`, roster order, configured no-usage runtime/model, member-created-time).
- Build member rows from selected-period ledger events, grouped by `memberAgentRunId` then `memberRouteKey`, and carry existing `memberPath` when present.

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

Design spec has been revised again after user verification at `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-run-team-analysis/tickets/done/token-statistics-run-team-analysis/design-spec.md`.

Round 1 rework notes are at `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-run-team-analysis/tickets/done/token-statistics-run-team-analysis/design-rework-round2.md`.

Post-user-verification rework notes are at `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-run-team-analysis/tickets/done/token-statistics-run-team-analysis/design-rework-round3-user-verification.md`.

Key review focus:

- AR-001: UI prototype now shows only a compact `Usage during period` label/tooltip; no range-mode dropdown, no full explanatory paragraph/box, and no `rangeMode` query argument.
- AR-002: Shared aggregation is now an identity-free `TokenUsageCostSummaryAggregate` plus a separate run-summary adapter for existing focused run/team/member summaries.
- Provider boundary remains: GraphQL delegates to `TokenUsageStatisticsProvider`; it does not assemble ledger/run-history internals directly.
- Grouping policy remains: task rows avoid member double counting; model diagnostics group by runtime/model pair.
- Round 5 correction: Settings token statistics is a usage/cost report, not a roster viewer. Expanded team rows are usage-derived and may omit no-usage roster members.


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

Therefore token ledger can provide usage/cost facts and run history can provide names/summaries.

### Key design constraint: avoid double counting

For top-level historical rows:

- Standalone agent rows should group events where `root_team_run_id` is null, keyed by `run_id`.
- Team rows should group events where `root_team_run_id` is present, keyed by `root_team_run_id`.
- Team-member rows should be children of the team row, grouped by `member_route_key` or `member_agent_run_id`, and should not also appear as standalone top-level rows.

### Key product constraint: date range semantics

There are two different user questions:

1. Billing-period question: "How much cost happened between dates?" Filter token events by `observed_at` and group those event deltas by run/team. A long-running task may show a partial cost for that period.
2. Task-cost question: "How much did each task cost?" Filter runs by run/team `createdAt` or completion/termination date, then show the full run/team cost. This better supports average task cost analysis.

The user's wording leans toward task-cost analysis, while the current settings date range is billing-period oriented. MVP makes this available through a compact `Usage during period` label/tooltip; a selectable `Tasks created in period` mode is future-only.

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
| `TokenUsageLedgerEvent` schema | Stores run/team/member/runtime/model identities and rich cost/cache fields. | Historical run/team grouping and runtime/model grouping are feasible; only five display fields are added for self-contained UI labels. | Use explicit legacy fallbacks. |
| `TokenUsageLedgerStore` | Already builds run/team/member summaries by ID through private identity-specific logic. | Aggregation logic should be extracted as identity-free aggregate core plus run-summary adapter. | Need list-by-period grouping API and shared aggregate builder. |
| Run-history services | Store agent/team names, summaries, createdAt, member tree. | They can populate the five display fields while metadata exists. | Need display-field capture/backfill and missing-metadata fallback. |

## Self-Contained Token-Statistics Design Correction — 2026-06-29

User clarified that token usage statistics should be historical usage/cost data that remains meaningful if live agent/team definitions or run-history metadata are later renamed, deleted, archived, exported, imported, or merged across nodes.

Important interpretation correction:

- Self-contained does **not** mean storing every nearby technical field.
- Self-contained means token-statistics persistence stores the fields needed to construct the current frontend statistics UI without permanently joining mutable live metadata.
- The design must therefore avoid unrelated fields such as workspace id/path/name, source-node id/name, full agent/team definition JSON, full conversation text, tool schemas, package configuration, generic snapshot identifiers, team/member roster order, configured runtime/model for no-usage members, and member-created-time.

Existing ledger fields that should be reused, not duplicated:

- run/team/member grouping: `runId`, `rootTeamRunId`, `memberAgentRunId`, `memberRouteKey`;
- nested hierarchy hints: `teamRunPathJson` / `memberPathJson` (`team_run_path` / `member_path` payload fields);
- runtime/model: `runtimeKind`, `modelProvider`, `modelIdentifier`, `modelValue`;
- token/cost facts: existing accounting input/output, cache, reasoning, estimated cost, status, and currency fields.

Final minimal new display fields:

1. `teamName` — title for root team run rows.
2. `agentName` — title for standalone agent run rows.
3. `runSummary` — summary/snippet shown under a top-level team/agent row title.
4. `runCreatedAt` — root team run or standalone agent run creation time for top-level sort/display.
5. `memberName` — visible label for usage-derived team member rows.

Important exclusions and rationale:

- No `workspaceName`, `workspaceRootPath`, or `workspaceId`: not part of the requested Token Statistics UI and not useful for the self-contained table.
- No `memberOrder`, `periodUsageState`, configured no-usage member runtime/model, or roster entries: the page is not a roster viewer and no-usage members may be omitted.
- No `memberCreatedAt`: the selected UI does not need a separate member-run creation timestamp; member rows may show `—`, `same as team`, or muted inherited team time in the last column.
- No `agentName` for team members unless a future UI explicitly displays underlying member agent names; current member rows use `memberName`.
- No new hierarchy tree: existing `teamRunPathJson` / `memberPathJson` can support optional nested labels or indentation.

Current paused implementation evidence:

- `autobyteus-server-ts/src/token-usage/providers/token-usage-run-history-enricher.ts` currently contains roster-oriented methods/fields (`listTeamAgentMemberRoster`, `TokenUsageTeamMemberRosterEntry`, workspace display fields, member-created-time, configured runtime/model for no-usage members).
- `autobyteus-server-ts/src/token-usage/providers/statistics-provider.ts` currently has roster-backed member-row construction and a no-usage aggregate path.
- `autobyteus-server-ts/src/token-usage/domain/statistics-models.ts` currently includes `workspaceName`, `workspaceRootPath`, `TokenUsagePeriodUsageState`, `TokenUsageTeamMemberRosterEntry`, member `createdAt`, and `agentDefinitionId` in task/member DTOs.

Round 5 design implication:

- Remove/tighten the roster-backed Settings statistics path.
- Keep run-history/team metadata only as a source to capture/backfill the five token-usage-owned display fields while metadata exists.
- Build Settings member rows from selected-period ledger events only, grouped by `memberAgentRunId` then `memberRouteKey`, with existing `memberPath` carried through when present.
- Runtime/model columns continue to come from existing ledger runtime/model fields.
- Legacy rows whose fields were never captured and whose metadata is already gone use explicit fallback labels such as `Unknown` / `First usage observed`.
