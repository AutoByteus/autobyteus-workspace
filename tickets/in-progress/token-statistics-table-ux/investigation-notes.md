# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Investigation complete; requirements/design prepared for architecture review.
- Investigation Goal: Understand the current Token Statistics table implementation, data shape, interactions, sortable/clickable affordances, and whether `Type`/`Status` columns are redundant before finalizing requirements and design.
- Scope Classification (`Small`/`Medium`/`Large`): Medium
- Scope Classification Rationale: The code change is localized to the Token Statistics task table and adjacent tests/localization, but it changes visible table columns, interaction affordances, and accessibility semantics.
- Scope Summary: Improve Settings > Token Statistics task-table affordances and remove redundant `Type`/normal `Status` columns while preserving row hierarchy and non-complete price-status information.
- Primary Questions Resolved:
  1. Which table headers are sortable and how is sort state currently represented? Resolved: `Task / Run`, `Runtime`, `Input`, `Output`, `Total Cost`, and `Created Time` are sortable; only the active sort header shows `↑`/`↓`, inactive sortable headers are plain buttons.
  2. Which table cells/values are clickable and what behavior do they trigger? Resolved: `Input Cost`, `Output Cost`, and `Total Cost` are buttons toggling the same row cost breakdown; visible affordance is only `hover:underline`.
  3. Does `Type` carry unique information beyond row context? Resolved: `Type` is derived from `rowKind`, while hierarchy, row metadata, and expand/collapse affordances already expose team/run/member/task context.
  4. Does `Status` ever carry values other than `Complete estimate`? Resolved: Yes. `apiCostStatus` supports `estimated`, `price_missing`, `partial_price_missing`, `mixed`, and `local_no_api_bill`; therefore the column can be removed only if non-`estimated` statuses remain visible elsewhere.
  5. Which frontend components, i18n entries, and tests own this table? Resolved: `TokenUsageTaskStatisticsTable.vue`, `tokenUsageStatisticsUi.ts`, `TokenUsageCostBreakdown.vue`, English/Chinese localization catalogs, and task-table specs are the relevant scope.

## Request Context

User requested backend Token Statistics table UI improvements with screenshots in English and Chinese locales. Key concerns:

- Sortable/clickable headers are not visibly discoverable; users cannot know they can sort ascending/descending.
- Some row numbers/cost values are clickable only after hover reveals link styling; this makes drill-down affordances unclear.
- The `Type` column may be redundant because agent/team rows are already clear by context/expandability.
- The `Status` column may be redundant because it appears to always show `Complete estimate`.

Reference screenshots supplied by user:

- `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_922eb8462ab44339a687cd5e440bfa15/solution_designer_af58dfd7a6db4e7fb4ab4f5f80e06e4b/context_files/ctx_c112ceaccd84__image.png`
- `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_922eb8462ab44339a687cd5e440bfa15/solution_designer_af58dfd7a6db4e7fb4ab4f5f80e06e4b/context_files/ctx_575374e8c148__image.png`
- `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_922eb8462ab44339a687cd5e440bfa15/solution_designer_af58dfd7a6db4e7fb4ab4f5f80e06e4b/context_files/ctx_0c06df270198__image.png`
- `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_922eb8462ab44339a687cd5e440bfa15/solution_designer_af58dfd7a6db4e7fb4ab4f5f80e06e4b/context_files/ctx_79d0e46d6a2d__image.png`
- `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_922eb8462ab44339a687cd5e440bfa15/solution_designer_af58dfd7a6db4e7fb4ab4f5f80e06e4b/context_files/ctx_e91ab5321f51__image.png`

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-table-ux`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-table-ux/tickets/in-progress/token-statistics-table-ux`
- Current Branch: `codex/token-statistics-table-ux`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-table-ux`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch --prune origin` completed successfully on 2026-07-05 before worktree creation.
- Task Branch: `codex/token-statistics-table-ux`, created from `origin/personal` at commit `56e4fadc6084a60ae423d72e8f4b2797066120f5`.
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None.
- Notes For Downstream Agents: The original checkout `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` is on `personal` with unrelated untracked files and must not be used for this task's authoritative artifacts or implementation.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-07-05 | Command | `pwd && git rev-parse --show-toplevel && git status --short --branch && git remote -v && git branch --show-current && git symbolic-ref --quiet --short refs/remotes/origin/HEAD` in `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` | Discover initial repo/worktree/base context | Main checkout is git repo on `personal`, tracking `origin/personal`, with unrelated untracked files. | No |
| 2026-07-05 | Command | `git worktree list --porcelain && git fetch --prune origin` | Check reusable task worktrees and refresh remote refs before creating dedicated worktree | Many existing worktrees; no exact `token-statistics-table-ux` worktree. Remote refresh succeeded. | No |
| 2026-07-05 | Command | `git worktree add -b codex/token-statistics-table-ux /Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-table-ux origin/personal` | Create mandatory dedicated task worktree/branch | Worktree created successfully from `origin/personal` at `56e4fadc...`. | No |
| 2026-07-05 | Other | User-provided screenshots listed in Request Context | Understand visible current Token Statistics UI issues | Screenshots show task table with sortable-looking `Created time` active arrow only, `Type` badges, `Status` pills, and hover-only clickable numeric cost styling. | No |
| 2026-07-05 | Command | `rg -n "Token Statistics|TokenUsageStatistics|Complete estimate|Fetch Statistics|获取统计数据|token usage" autobyteus-web autobyteus-server-ts autobyteus-ts -S` | Locate Token Statistics implementation and related docs/tests | Relevant files are under `autobyteus-web/components/settings`, `autobyteus-web/stores`, `autobyteus-web/graphql`, and `autobyteus-server-ts/src/token-usage`. | No |
| 2026-07-05 | Code | `autobyteus-web/components/settings/TokenUsageStatistics.vue` | Identify page entrypoint and owner | Page owns grouping/date/fetch controls and delegates to task/model table components. | No |
| 2026-07-05 | Code | `autobyteus-web/components/settings/token-usage/TokenUsageTaskStatisticsTable.vue` | Inspect task table columns and interactions | Sort buttons are inline in headers; inactive sortable headers have no persistent indicator. `Type` and `Status` columns are rendered here. Cost cells are three duplicate buttons with only `hover:underline`, all toggling the same details row. | Yes: implement local table changes here. |
| 2026-07-05 | Code | `autobyteus-web/components/settings/token-usage/tokenUsageStatisticsUi.ts` | Inspect formatting/status helpers | `formatCostCell` already appends or returns non-complete cost status for many cases; `formatStatus`/`statusClass` support status badges. | Yes: reuse helpers for inline non-complete status and breakdown. |
| 2026-07-05 | Code | `autobyteus-web/components/settings/token-usage/TokenUsageCostBreakdown.vue` | Confirm expanded details preserve status | Breakdown header already renders `formatter.statusClass(aggregate.apiCostStatus)` and `formatter.formatStatus(...)`, so removing the row-level status column does not remove detail-level status. | No |
| 2026-07-05 | Code | `autobyteus-web/stores/tokenUsageStatistics.ts` | Check data normalization boundary | Store normalizes `apiCostStatus`, `rowKind`, `children`, `createdTimeSource`, and aggregate fields. No API or store change needed for presentation-only UX. | No |
| 2026-07-05 | Code | `autobyteus-web/graphql/queries/token_usage_statistics_queries.ts` | Check GraphQL query shape | Query already fetches `rowKind`, `children`, and aggregate `apiCostStatus`/missing price fields. No query change required. | No |
| 2026-07-05 | Code | `autobyteus-server-ts/src/token-usage/domain/statistics-models.ts` | Confirm backend statistics row kind/status model | Backend task rows include `rowKind`; aggregate status is separate from row identity. | No |
| 2026-07-05 | Code | `autobyteus-server-ts/src/token-usage/projections/token-usage-cost-summary-aggregate.ts` | Confirm possible status values and aggregate behavior | Aggregates can be `estimated`, `mixed`, or inherit event statuses including missing/partial/local. Status is meaningful but should be exception-oriented in UI. | No |
| 2026-07-05 | Code | `autobyteus-server-ts/src/agent-execution/domain/agent-run-token-usage.ts` | Confirm `TokenUsageApiCostStatus` enum | Supported statuses are `estimated`, `price_missing`, `partial_price_missing`, `mixed`, `local_no_api_bill`. | No |
| 2026-07-05 | Code | `autobyteus-web/localization/messages/en/settings.ts`, `autobyteus-web/localization/messages/zh-CN/settings.ts`, `autobyteus-web/localization/messages/en/shell.ts`, `autobyteus-web/localization/messages/zh-CN/shell.ts` | Inspect current labels | Task table labels and status strings exist in English/Chinese; `priceStatusComplete` is `Complete estimate` / `完整预估`. New sort/detail action strings should be localized. | Yes: update locale catalogs if new labels are introduced. |
| 2026-07-05 | Code | `autobyteus-web/components/settings/token-usage/__tests__/TokenUsageTaskStatisticsTable.spec.ts` | Inspect existing durable coverage | Tests cover created-time default sorting, expansion, child attachment after total-cost sorting, cost breakdown, mixed runtime/model labels, first-usage fallback, cache/thinking sublines. Expectations mention old headers/columns and must be updated. | Yes |
| 2026-07-05 | Doc | `autobyteus-web/docs/settings.md` and `autobyteus-web/docs/agent_execution_architecture.md` Settings Token Statistics sections | Check current documented ownership and constraints | Docs state Settings token statistics is owned by `tokenUsageStatisticsStore`, uses backend `children`/`executionAddress`, keeps Model secondary, and preserves server-owned cost/status semantics. | Delivery should decide if docs need update after implementation. |
| 2026-07-05 | Command | `test -d node_modules; test -d autobyteus-web/node_modules` | Check whether tests can run locally during design investigation | No root or web `node_modules` in dedicated worktree. | Implementation should run tests in available dependency environment. |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: Settings sidebar item `Token Statistics` renders `TokenUsageStatistics.vue`.
- Current execution flow:
  1. `TokenUsageStatistics.vue` renders grouping/date/fetch controls and defaults to task grouping.
  2. On fetch, `useTokenUsageStatisticsStore.fetchStatistics(startTime, endTime)` queries task statistics and model statistics in parallel.
  3. The store normalizes GraphQL payloads into `TokenUsageTaskStatisticsRow[]` and `TokenUsageRuntimeModelStatisticsRow[]`.
  4. `TokenUsageTaskStatisticsTable.vue` receives task rows, locally sorts top-level rows, flattens expanded children, renders columns, and toggles cost details.
  5. `TokenUsageCostBreakdown.vue` renders the expanded row's cost/status breakdown.
- Ownership or boundary observations:
  - Page/store/backend boundaries are healthy for this scope; the UX issues live in table presentation.
  - `TokenUsageTaskStatisticsTable.vue` is the correct owner for table columns, sort affordances, row expansion, and details-toggle presentation.
  - `tokenUsageStatisticsUi.ts` is the correct existing owner for formatting cost/status labels and should be reused rather than duplicating status formatting.
- Current behavior summary:
  - Sortable headers are buttons but mostly indistinguishable from static headers until a column is active.
  - Three cost cells are clickable, but only hover underline reveals interactivity.
  - `Type` duplicates `rowKind` context already available in row hierarchy/metadata.
  - `Status` repeats `Complete estimate` for ordinary estimated rows; non-estimated statuses are meaningful and must be preserved outside a standalone status column.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change / UI Cleanup
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Local Implementation Defect at presentation/affordance level.
- Refactor posture evidence summary: Existing owners remain correct; no backend/store/schema refactor is needed. A small local component cleanup is appropriate, including removing unused `rowTypeLabel` if the Type column is removed and adding localized/accessibility helper functions in the table.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `TokenUsageTaskStatisticsTable.vue` | Sort/cost/detail/column rendering all live in one table component. | Correct local owner for this UX change. | Implement there. |
| `tokenUsageStatisticsUi.ts` | Cost/status formatting already centralized. | Reuse existing formatter for inline non-complete status instead of duplicating status mapping. | Possibly add a small helper if useful. |
| `TokenUsageCostBreakdown.vue` | Expanded details already show status. | Standalone `Status` column can be removed while retaining detailed status. | Preserve. |
| Server status enum | Status has non-complete values. | Do not simply delete all status visibility; only suppress normal complete copy. | Inline exceptions. |
| Store/query files | Required data is already fetched and normalized. | Backend/API change would be unnecessary scope expansion. | Avoid. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-web/components/settings/TokenUsageStatistics.vue` | Settings token statistics page controls and grouping delegation. | Not responsible for task table columns/affordances. | No direct change expected unless tests need stub updates. |
| `autobyteus-web/components/settings/token-usage/TokenUsageTaskStatisticsTable.vue` | Task table sorting, hierarchy expansion, cost-detail toggling, row metadata, columns. | Main affected file. Contains hidden sort/cost affordances and redundant columns. | Modify locally. |
| `autobyteus-web/components/settings/token-usage/tokenUsageStatisticsUi.ts` | Formatting for cost, status, runtime/model, cache/thinking sublines. | Reusable status/cost helpers exist. | Reuse/extend if inline exception status needs helper. |
| `autobyteus-web/components/settings/token-usage/TokenUsageCostBreakdown.vue` | Expanded cost breakdown. | Already shows status badge and missing price dimensions. | Preserve behavior. |
| `autobyteus-web/stores/tokenUsageStatistics.ts` | GraphQL fetch and normalization. | No presentation issue here. | No change expected. |
| `autobyteus-web/graphql/queries/token_usage_statistics_queries.ts` | GraphQL statistics queries. | Required fields already fetched. | No change expected. |
| `autobyteus-web/types/tokenUsageStatistics.ts` | Frontend task/model row types and sort key types. | Sort keys are `createdAt`, `totalCost`, `input`, `output`, `runtime`, `task`; no `type` or `status` sort. | No type change expected unless helper types are added locally. |
| `autobyteus-web/localization/messages/en/settings.ts` and `zh-CN/settings.ts` | Settings localization. | New sort/cost-detail action labels need locale entries. | Update if implementation introduces new labels. |
| `autobyteus-web/components/settings/token-usage/__tests__/TokenUsageTaskStatisticsTable.spec.ts` | Durable task-table component coverage. | Current expectations include old column/header assumptions and hidden cost controls. | Update/add assertions. |
| `autobyteus-web/docs/settings.md`, `autobyteus-web/docs/agent_execution_architecture.md` | Durable architecture/settings docs. | Existing docs mention Settings Token Statistics ownership and status semantics, but not this table simplification. | Delivery should sync if implementation changes documented behavior. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-07-05 | Probe | User screenshots, visual inspection | Sort and clickable cost affordances are not persistently visible; `Type` and `Status` consume width. | Confirms user-reported UX issue. |
| 2026-07-05 | Probe | `test -d node_modules && ...; test -d autobyteus-web/node_modules && ...` | No dependencies installed in dedicated worktree. | Solution design did not execute tests; implementation should. |

## External / Public Source Findings

No external sources consulted.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: None required for code investigation; component tests use mocked localization and fixture rows.
- Required config, feature flags, env vars, or accounts: None identified.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Dedicated git worktree creation only.
- Cleanup notes for temporary investigation-only setup: None.

## Findings From Code / Docs / Data / Logs

- `TokenUsageTaskStatisticsTable.vue` currently renders 11 columns: `Task / Run`, `Type`, `Runtime`, `Model(s)`, `Input`, `Output`, `Input Cost`, `Output Cost`, `Total Cost`, `Status`, `Created Time`.
- Removing `Type` and `Status` changes the task table to 9 columns. The detail row `colspan` must change from `11` to `9`.
- `rowTypeLabel()` becomes unused if the `Type` column is removed and should be removed in the same change.
- `formatter.formatStatus()` and `formatter.statusClass()` remain used by `TokenUsageCostBreakdown.vue`; they must not be removed.
- `formatter.formatCostCell()` already conveys several non-complete statuses in cost cells: local/no-bill returns local status text; null mixed returns mixed estimate; null missing returns unpriced; partial/mixed with a value appends a suffix. An explicit non-estimated badge in/near total cost can use existing `formatStatus`/`statusClass` semantics.
- Existing docs emphasize that Settings token statistics must consume backend-provided hierarchy (`children`, `executionAddress`) and server-owned cost/status semantics. The target design preserves that boundary.

## Constraints / Dependencies / Compatibility Facts

- The frontend must not infer hierarchy from display names or reconstruct backend row grouping; it should continue to render backend-provided rows/children.
- The backend `apiCostStatus` remains authoritative for status. UI may suppress the normal `estimated` status in the main table but must not reinterpret status semantics.
- No backward-compatibility wrapper or dual path is needed; this is a clean presentation update.
- The model diagnostics table is out of primary scope.

## Open Unknowns / Risks

- Implementation should verify exact localization update workflow. Source `settings.ts` and generated `settings.generated.ts` both contain overlapping historical keys, but `settings.ts` overrides generated messages at runtime. Existing project pattern should be followed.
- Implementation should check if removing duplicate cost buttons affects any keyboard tab-order expectation. The target behavior intentionally simplifies to one row-level details control.
- Implementation should run focused component tests after dependency setup; design work did not run tests because dependencies were absent.

## Notes For Architect Reviewer

- The recommended design is intentionally local: no backend, GraphQL, store, or data-model changes.
- The only potentially debatable product decision is replacing three hover-only cost buttons with one explicit Total Cost details control. This is deliberate because all three current buttons toggle the same row detail and duplicate hidden action.
- Do not approve a design that simply removes the `Status` column without preserving non-`estimated` status visibility.
