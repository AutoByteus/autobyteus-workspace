# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Refined — self-contained token-statistics usage-row display fields clarified on 2026-06-29.

## Goal / Problem Statement

Redesign Settings > Token Statistics so users can understand token/cost consumption by real work units: standalone agent runs and agent team runs. The current per-model table is useful for diagnostics, but it is not intuitive for answering “how much did this task/team cost?”

## Investigation Findings

- Current Settings > Token Statistics is model-first: backend groups token ledger events by `model_identifier ?? model_value`, GraphQL exposes `usageStatisticsInPeriod`, and the frontend renders one row per LLM model.
- Persisted token usage records already contain the usage/cost facts and grouping identities needed for run/team aggregation: `run_id`, `root_team_run_id`, `member_agent_run_id`, `member_route_key`, timestamps, runtime/model fields, token counts, cache fields, and cost fields.
- Existing backend summary APIs already aggregate by agent run, team run, and team member for live/focused Token Meter use (`getAgentRunSummary`, `getTeamRunSummary`, `getTeamMemberSummary`).
- Run-history metadata can currently provide user-readable row labels: agent/team names, summaries, created time, and team member tree. However, token statistics should not depend on live run-history/team-definition data forever because those definitions or metadata can be renamed, deleted, archived, exported, imported, or merged across nodes.
- The main design issue is not data availability; it is that the historical Settings page has the wrong primary grouping for the user's task-cost question.
- Post-user-verification decision: Settings > Token Statistics is a usage/cost report, not a team roster viewer. Expanded team rows shall show only members that have usage events in the selected period; inactive/no-usage roster members may be omitted.
- Additional design correction: the target token-statistics dataset must be self-contained for the frontend fields it renders. That means persisting only the user-visible/task-display fields needed by the Settings token statistics UI, not broad technical metadata such as workspace IDs, workspace paths, source-node IDs, full agent/team definitions, or other fields that are not displayed or used by this UI.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Feature / Product UX improvement analysis plus post-build behavior correction
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes, at product/reporting-view level
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary/Ownership Issue for historical display fields: token-statistics data must retain the display fields needed to render usage rows without live run-history/team-definition dependencies.
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Targeted projection refinement and minimal token-usage-owned usage-row display fields are needed; no token price-formula change.
- Evidence basis: Persisted ledger fields, `TokenUsageStatisticsProvider`, `TokenUsageLedgerStore`, GraphQL statistics API, run-history metadata services, and current settings UI.
- Requirement or scope impact: Existing persisted data supports run/team grouped statistics for enriched records; implementation should add a run/team grouping API/UI while keeping model grouping as a secondary view.

## Recommendations

- Make task/run-oriented statistics the primary user-facing view: one row per standalone agent run or root team run.
- For team rows, provide expandable member rows using `member_route_key` / `member_agent_run_id`, with totals that sum to the team row and do not appear again as standalone rows.
- For team rows, expanded members are usage-derived: show members that have token usage observed in the selected date range. Do not add zero/no-usage roster-only rows in MVP.
- Include `Created Time` as a visible column, but place it at the far right of the `By Task` table so users can scan task/cost first. Default sorting still uses `Created Time` newest-first because multiple runs can share the same agent/team name and must be distinguishable chronologically. This must be the run/team creation timestamp when run-history metadata is available, not a later token-ledger observation timestamp.
- Include `Runtime` as a visible column. Team rows show a single runtime if all members match, otherwise `Mixed`.
- Keep the current per-model table as a secondary `By Model` diagnostics tab because it is still useful for runtime/provider/model cost comparisons.
- Include richer input breakdown fields (uncached/cache-read/cache-write) in the new run/team view; current model statistics collapse this detail.
- Date range semantics must be available but visually lightweight. MVP shall show a compact non-paragraph `Usage during period` label or tooltip near the date range because it matches existing ledger filtering by `observed_at`. It shall not render a prominent explanatory box, selectable range-mode control, or `Tasks created in period` option. A later follow-up can add `Tasks created in period` for full task-cost analysis.
- Add only the minimal self-contained usage-row display fields needed by Settings > Token Statistics: `teamName`, `agentName`, `runSummary`, `runCreatedAt`, and `memberName`. Runtime/model/tokens/costs continue to come from existing ledger fields.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium.

## In-Scope Use Cases

- UC-001: A user wants to see cost per standalone agent run over a selected date range.
- UC-002: A user wants to see cost per agent team run over a selected date range, expandable into individual member agent costs.
- UC-003: A user wants to distinguish multiple runs of the same team/agent by created time and run summary.
- UC-004: A user wants to compare typical cost for repeated task/team runs.
- UC-005: A user wants to understand which runtime/model was used for each task/run.
- UC-006: A user may still want runtime/model-level cost breakdown for provider/model budget diagnostics.
- UC-007: A user wants historical token statistics to remain meaningful after an agent/team definition is renamed or removed.

## Out of Scope

- Changing token cost calculation formulas.
- Persisting unrelated technical metadata not shown or used by the token statistics UI, including workspace IDs, workspace paths, source-node IDs, full agent/team definitions, full conversation content, tool schemas, or package configuration.
- Fully reconstructing missing historical display fields if legacy runs did not persist it and live metadata is already gone.
- Per-turn/per-model-call drilldown inside a run; this can be a later enhancement.
- CSV export; later enhancement.

## Functional Requirements

- REQ-001: Settings > Token Statistics shall default to a `By Task` tab rather than the model-grouped table.
- REQ-002: The page shall keep a `By Model` tab that preserves the current model-grouped statistics use case while adding runtime visibility.
- REQ-003: The `By Task` tab shall render one top-level row for each standalone agent run in the selected range.
- REQ-004: The `By Task` tab shall render one top-level row for each root team run in the selected range.
- REQ-005: Team-member agent usage shall appear only as expanded children of its team row and shall not appear as separate top-level standalone rows.
- REQ-006: Each top-level task row shall show `Created Time` as a visible last column and default sorting shall be `Created Time` newest first unless the user changes sort.
- REQ-007: Rows for repeated runs of the same agent/team shall remain separate rows; they shall not be merged by team definition name, agent definition name, runtime, or model.
- REQ-008: Each top-level row shall include the following visible columns in order: `Task / Run`, `Type`, `Runtime`, `Model(s)`, `Input`, `Output`, `Input Cost`, `Output Cost`, `Total Cost`, `Status`, `Created Time`.
- REQ-009: `Task / Run` shall display a human-readable agent/team name, run summary/snippet, and a shortened run/team id. Workspace name/path is not part of the MVP row identity and shall not be persisted solely for this UI.
- REQ-010: `Type` shall be `Team` or `Agent`.
- REQ-011: `Runtime` shall display the runtime for standalone rows and member rows; team rows shall display `Mixed` when member runtimes differ.
- REQ-012: `Model(s)` shall display the single model when all events in the row use one model; otherwise display `Mixed` with the distinct models available in row details.
- REQ-013: `Input` shall display gross input tokens and a subline for cache hit rate when cache data exists.
- REQ-014: `Output` shall display output tokens and a subline for thinking/reasoning tokens when present.
- REQ-015: `Input Cost`, `Output Cost`, and `Total Cost` shall use backend-estimated costs and preserve existing price status semantics (`estimated`, `partial_price_missing`, `price_missing`, `mixed`, `local_no_api_bill`).
- REQ-016: Expanding a team row shall show indented member rows with the same metric columns as the parent row, except member rows do not require a separate member-created-time value. The `Created Time` cell for member rows may show `—`, `same as team`, or the parent team run time as a muted inherited value; it shall not imply a separately persisted member creation timestamp.
- REQ-017: Expanding a row or clicking a cost cell shall reveal detailed input/output cost composition: uncached input, cache reads, cache writes, total input, output, thinking included in output, total cost, missing price dimensions.
- REQ-018: The date range controls shall remain at the top of the page and apply to both `By Task` and `By Model` tabs.
- REQ-019: MVP date range semantics shall be labelled `Usage during period` and shall group token ledger events observed within the selected date range.
- REQ-020: The UI shall support sorting top-level task rows by `Created Time`, `Total Cost`, `Input`, `Output`, `Runtime`, and `Task / Run`; member rows remain attached to their parent team row.
- REQ-021: Empty, loading, error, partial-price, and mixed-status states shall have explicit user-facing copy.
- REQ-022: `Created Time` for top-level rows shall be sourced from token-statistics `runCreatedAt` when available: team rows use the root team run creation time and standalone agent rows use the standalone agent run creation time. Member rows do not introduce or require a separate member-created-time field.
- REQ-023: If run-history creation metadata is missing, the UI may fall back to the first ledger `observed_at` timestamp, but the row detail or tooltip shall label this as `First usage observed` so it is not confused with true task creation time.
- REQ-024: Date/time display shall use the user's local timezone and include enough detail for repeated same-day runs, e.g. `Jun 28, 2026, 14:37` or the existing project-equivalent locale format with date and minute precision.
- REQ-025: The task table shall keep chronological identity separate from cost sorting: default sort is newest-first by created time, while total-cost sorting is available as an explicit user action.
- REQ-026: The `By Model` tab shall include `Runtime` as a visible column.
- REQ-027: The `By Model` tab shall group rows by runtime/model pair for normal rows, so the same model used through different runtimes appears as separate rows rather than being collapsed into one ambiguous model-only row.
- REQ-028: If runtime data is unavailable for legacy model-stat rows, the `Runtime` column shall show `Unknown` or an equivalent explicit fallback, not a blank cell.
- REQ-029: The MVP UI shall render `Usage during period` only as compact non-prominent static text, tooltip text, or an info affordance near the date picker. It shall not include a full-width paragraph/box, `Tasks created in period` selector option, range-mode dropdown, or `rangeMode` GraphQL argument.
- REQ-030: Expanding a team row shall show only team members with token-usage ledger events observed in the selected date range; members with no usage events in that range may be omitted.
- REQ-031: Token statistics persistence shall add only the following self-contained display fields needed by the `By Task` UI: `teamName`, `agentName`, `runSummary`, `runCreatedAt`, and `memberName`.
- REQ-032: `teamName` shall be populated for usage events belonging to a root team run and used as the team row title. It shall not be populated solely for standalone agent rows.
- REQ-033: `agentName` shall be populated for standalone agent-run usage rows and used as the standalone agent row title. It is not required for team member rows unless the UI later displays the underlying member agent name separately.
- REQ-034: `runSummary` shall store the task/run summary shown under the team or standalone agent row title.
- REQ-035: `runCreatedAt` shall store the root team run creation time for team usage and the agent run creation time for standalone agent usage. If missing for legacy data, the backend may fall back to earliest `observedAt` and label it `First usage observed`.
- REQ-036: `memberName` shall store the visible member label for team member usage rows, e.g. `solution_designer`.
- REQ-037: Runtime/model fields shall not be duplicated in the new display fields. The UI shall use the existing ledger runtime/model fields: `runtimeKind`, `modelProvider`, `modelIdentifier`, and `modelValue`.
- REQ-038: Persisted usage event rows remain the source of truth for token and cost facts and shall keep existing token/cost fields, including existing names such as `accounting_input_tokens`, `accounting_output_tokens`, cache token fields, reasoning token fields, and estimated API cost fields. This task shall not rename existing ledger fields.
- REQ-039: The implementation shall not add display fields for workspace id/path/name, source-node id/name, full agent/team definitions, full conversation content, tool schemas, package configuration, team/member roster order, configured member runtime/model for no-usage members, member created time, or generic snapshot ids.
- REQ-040: A token-statistics export/import bundle is out of MVP UI scope, but the persisted token-statistics data shall be shaped so a future export can include usage event rows with these display fields and remain meaningful without separate agent/team definition exports.
- REQ-041: Nested team/member hierarchy shall use existing ledger path fields (`teamRunPathJson` / `memberPathJson`, exposed as `team_run_path` / `member_path`) when available. The implementation shall not add a new hierarchy or roster structure for MVP.

## Required UI Example Data

The following examples are illustrative data, but the layout, hierarchy, labels, sorting behavior, fallback semantics, and double-counting rules are normative for implementation.

### Example A: Default `By Task` table

Date range: `21.06.2026` to `28.06.2026`  
Compact range meaning affordance near date picker: `Usage during period`
Default sort: `Created Time` descending.

| Task / Run | Type | Runtime | Model(s) | Input | Output | Input Cost | Output Cost | Total Cost | Status | Created Time |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | --- | --- |
| Software Engineering Team<br/>`"investigate Codex cached token pricing…"`<br/>`team …9665` | Team | Mixed | Mixed<br/>`gpt-5.5, deepseek-v4-flash` | 11.96M<br/>`cache hit 94.7% · 11.33M cached` | 49,349<br/>`11,945 thinking included` | 8.82 $ | 1.48 $ | **10.30 $** | Complete | Jun 28, 2026, 15:42 |
| Software Engineering Team<br/>`"build Electron so I can test…"`<br/>`team …44b1` | Team | Codex | gpt-5.5 | 3.24M<br/>`cache hit 86.2% · 2.79M cached` | 18,420<br/>`4,210 thinking included` | 2.32 $ | 0.55 $ | **2.87 $** | Complete | Jun 28, 2026, 12:08 |
| Software Engineering Team<br/>`"review API/E2E coverage…"`<br/>`team …a8f0` | Team | Mixed | Mixed<br/>`gpt-5.5, gemini-3.1-pro-preview` | 4.88M<br/>`cache hit 72.4% · 3.53M cached` | 31,260<br/>`7,800 thinking included` | mixed est. | mixed est. | **mixed est.** | Mixed | Jun 27, 2026, 18:51 |
| Research Agent<br/>`"summarize token ledger schema…"`<br/>`run …91c2` | Agent | Autobyteus | deepseek-v4-flash | 420,300<br/>`no cache data` | 9,840<br/>`1,600 thinking included` | 0.0010 $ | 0.0025 $ | **0.0035 $** | Complete | Jun 27, 2026, 09:16 |
| Standalone Codex Agent<br/>`"prototype settings statistics UI…"`<br/>`run …72dd` | Agent | Codex | gpt-5.5 | 890,100<br/>`cache hit 61.0% · 543,000 cached` | 12,300<br/>`2,900 thinking included` | partial est. | 0.37 $ | **partial est.** | Partial | Jun 26, 2026, 21:04 |

Implementation notes from the example:

- The first three rows are separate rows even though they share the same team definition name.
- Team rows have a chevron/expander in the `Task / Run` cell or at the far-left row edge.
- Member agent runs belonging to a team are not repeated as standalone top-level agent rows.
- `Output` shows thinking tokens as a subline because thinking tokens are part of output usage/cost handling, not a separate extra cost added to total.
- `mixed est.` is acceptable only when the backend aggregate genuinely contains mixed currency/pricing status that cannot be represented as one trusted amount.
- `partial est.` is acceptable only when some price dimensions are missing; details must expose what is missing.

### Example B: Expanded team row

When the first row above is expanded, member rows appear directly underneath it, indented and visually attached to the parent team row.

| Task / Run | Type | Runtime | Model(s) | Input | Output | Input Cost | Output Cost | Total Cost | Status | Created Time |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ▾ Software Engineering Team<br/>`"investigate Codex cached token pricing…"` | Team | Mixed | Mixed | 11.96M<br/>`cache hit 94.7%` | 49,349<br/>`11,945 thinking included` | 8.82 $ | 1.48 $ | **10.30 $** | Complete | Jun 28, 2026, 15:42 |
| ↳ `solution_designer`<br/>`member run …b239` | Member | Codex | gpt-5.5 | 5.98M<br/>`cache hit 96.0%` | 26,000<br/>`6,000 thinking included` | 4.42 $ | 0.78 $ | **5.20 $** | Complete | — |
| ↳ `implementation_engineer`<br/>`member run …c812` | Member | Codex | gpt-5.5 | 3.58M<br/>`cache hit 94.0%` | 16,000<br/>`4,500 thinking included` | 2.66 $ | 0.48 $ | **3.14 $** | Complete | — |
| ↳ `delivery_engineer`<br/>`member run …4fe0` | Member | Autobyteus | deepseek-v4-flash | 2.40M<br/>`cache hit 92.8%` | 7,349<br/>`1,445 thinking included` | 1.74 $ | 0.22 $ | **1.96 $** | Complete | — |

Implementation notes from the example:

- Parent team totals equal the sum of member totals when all member prices are complete and currency-compatible.
- Members with no selected-period usage are omitted from the expanded usage table in MVP.
- Member rows use `Type = Member` or an equivalent visually distinct member indicator, but they remain child rows, not top-level rows.
- Sorting applies to top-level rows only; member rows stay attached to the expanded parent even after sorting. Member row order may follow usage grouping order or a stable backend-defined order. The member `Created Time` cells are intentionally blank/placeholder in MVP because the self-contained dataset does not add member-created-time.

### Example C: Row cost breakdown panel

Clicking the first team row's cost cell or detail affordance should show a compact breakdown similar to:

| Section | Label | Tokens | Cost |
| --- | --- | ---: | ---: |
| Input breakdown | Uncached / full-price input | 630,876 | 3.15 $ |
| Input breakdown | Cache hits / discounted input | 11,329,024 | 5.66 $ |
| Input breakdown | Cache writes | 0 | 0.00 $ |
| Input breakdown | Total input cost | 11,959,900 | **8.82 $** |
| Output breakdown | Output tokens | 49,349 | **1.48 $** |
| Output breakdown | Thinking tokens included in output | 11,945 | included |
| Total | Estimated API cost | 12,009,249 total tokens | **10.30 $** |

Implementation notes from the example:

- The output breakdown must not add thinking cost on top of output cost. Thinking is displayed as an included subset when the backend reports it.
- If cache-write tokens are unsupported or absent for a provider/model, the row may omit the cache-write line or show `0`.
- If a price is missing, the affected line shows `price missing`; the total row shows `partial est.` or `price missing` according to existing backend status semantics.

### Example D: Created-time fallback row

If run-history metadata is missing but ledger usage exists, the row may still appear, but it must clearly distinguish fallback time:

| Task / Run | Type | Runtime | Model(s) | Input | Output | Total Cost | Status | Created Time |
| --- | --- | --- | --- | ---: | ---: | ---: | --- | --- |
| Unknown agent run<br/>`run …99fa · creation metadata unavailable` | Agent | Codex | gpt-5.5 | 120,000 | 3,800 | 0.41 $ | Complete | Jun 25, 2026, 08:22<br/>`First usage observed` |

Implementation notes from the example:

- Do not label ledger `observed_at` as true `Created Time` when run-history creation metadata is unavailable.
- The fallback should be understandable without requiring the user to know the token ledger schema.

### Example E: Repeated team-run chronology

If the same team definition ran five times in the selected range, the top-level table must show five separate rows:

| Task / Run | Type | Runtime | Total Cost | Created Time |
| --- | --- | --- | ---: | --- |
| Software Engineering Team · `"investigate Codex cached token pricing…"` | Team | Mixed | 10.30 $ | Jun 28, 2026, 15:42 |
| Software Engineering Team · `"build Electron so I can test…"` | Team | Codex | 2.87 $ | Jun 28, 2026, 12:08 |
| Software Engineering Team · `"review API/E2E coverage…"` | Team | Mixed | mixed est. | Jun 27, 2026, 18:51 |
| Software Engineering Team · `"fix token meter display…"` | Team | Codex | 6.42 $ | Jun 26, 2026, 14:11 |
| Software Engineering Team · `"prepare release handoff…"` | Team | Mixed | 1.76 $ | Jun 25, 2026, 10:03 |

Implementation notes from the example:

- These rows must not collapse into one `Software Engineering Team` row.
- They must not collapse by runtime, model, or date.
- The user should be able to scan this list and understand typical cost per task execution.

### Example F: `By Model` secondary tab

The `By Model` tab keeps the current diagnostic purpose but should use clearer token terminology and runtime visibility. Rows are grouped by runtime/model pair, not only by model name, so runtime-specific cost differences remain visible.

| Runtime | LLM Model | Input Tokens | Cached Input | Output Tokens | Thinking Tokens | Input Cost | Output Cost | Thinking Cost | Total Cost |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Codex | gpt-5.5 | 81,003,555 | 74,200,000<br/>`cache hit 91.6%` | 307,957 | 110,193<br/>`included` | 52.6964 $<br/>`mixed est.` | 9.2387 $<br/>`mixed est.` | 3.3058 $<br/>`included / diagnostic` | 61.9351 $<br/>`mixed est.` |
| Autobyteus | deepseek-v4-flash | 10,513,028 | —<br/>`no cache data` | 176,753 | 51,958<br/>`included` | 0.0194 $<br/>`mixed est.` | 0.0456 $<br/>`mixed est.` | 0.0103 $<br/>`included / diagnostic` | 0.065 $<br/>`mixed est.` |
| Autobyteus | gemini-3.1-pro-preview | 2,825,475 | —<br/>`no cache data` | 76,825 | 19,100<br/>`included` | 2.1292 $<br/>`est.` | 1.3829 $<br/>`est.` | 0.3438 $<br/>`included / diagnostic` | 3.512 $<br/>`est.` |
| Unknown | gpt-5.4 | 18,295 | — | 128 | 0 | price missing | 0.0019 $<br/>`partial est.` | price missing | 0.0019 $<br/>`partial est.` |

Implementation notes from the example:

- `By Model` is secondary; it does not replace task/run rows.
- Existing model-level calculations and status semantics remain valid.
- The model tab should not be used to answer per-task cost because it aggregates unrelated runs together.
- Runtime is mandatory because the same model identifier can be used through different runtimes or execution backends.
- Runtime/model rows should remain separate; do not collapse `Codex + gpt-5.5` and `Autobyteus + gpt-5.5` into one `gpt-5.5` row.

## Acceptance Criteria

- AC-001: Opening Settings > Token Statistics shows `By Task` selected by default and displays task/team rows if data exists.
- AC-002: If the same team definition ran five times in the selected range, the table shows five separate rows, ordered by `Created Time` newest first by default.
- AC-003: Each top-level task row has a visible `Created Time` value formatted in local time with enough precision to distinguish nearby runs; member rows are not required to show separate created-time values.
- AC-004: A team row can be expanded and collapsed with a chevron.
- AC-005: Expanded team member rows are indented and remain visually attached to their team parent.
- AC-006: The sum of expanded member costs equals the team row total, subject to mixed currency/partial pricing status rules.
- AC-007: Team member rows are not also shown as standalone top-level rows.
- AC-008: The `Runtime` column shows `Codex`, `Claude`, `Autobyteus`, etc. for single-runtime rows and `Mixed` for mixed team rows.
- AC-009: The `Input` column shows gross input tokens and cache rate/subline when cache data is present.
- AC-010: The `Output` column shows output tokens and thinking tokens as included output, not an extra cost added to total.
- AC-011: Clicking `By Model` switches to the current model-level statistics table without changing the selected date range.
- AC-012: Clicking `By Task` returns to the task/team table without changing the selected date range.
- AC-013: A `partial est.` status exposes missing price dimensions in row details or status tooltip.
- AC-014: An empty result shows `No agent or team usage found for this date range.` and does not show a blank table.
- AC-015: Sorting by total cost reorders only top-level rows; expanded member rows stay under their original team row.
- AC-016: For a run with both run-history `created_at` and ledger `observed_at`, the visible `Created Time` uses `created_at`; the ledger observation time only appears in details if needed.
- AC-017: For a legacy row without run-history metadata, the visible time is marked or explained as `First usage observed`.
- AC-018: On first page load, five consecutive runs of the same team appear as five top-level rows ordered by true `Created Time` descending, independent of model, runtime, or cost.
- AC-019: The `By Model` tab includes a visible `Runtime` column.
- AC-020: If the same model appears under two runtimes in the selected period, the `By Model` tab shows two separate runtime/model rows.
- AC-021: Legacy model-stat rows without runtime metadata show `Unknown` or equivalent explicit fallback in the `Runtime` column.
- AC-022: The MVP page shows `Usage during period` only as a compact label/tooltip near the date picker, renders no full explanatory paragraph/box, and provides no range-mode dropdown or selectable `Tasks created in period` option.
- AC-023: For a Software Engineering Team run whose live team roster contains six members but only `solution_designer` has token events during the selected period, expanding the row may show only `solution_designer`; inactive/no-usage roster members are not required in the usage statistics MVP.
- AC-024: A task/team row whose live run-history metadata has been renamed or removed after the token-statistics display fields were captured still renders the persisted `teamName` or `agentName`, `runSummary`, and `runCreatedAt`; a member row still renders persisted `memberName` from token-statistics data.
- AC-025: Runtime/model columns continue to render from existing ledger runtime/model fields; the new display fields do not duplicate runtime/model.
- AC-026: The token-statistics persistence layer does not add or require workspace id/path, source-node id, full agent/team definition JSON, full conversation content, team/member roster order, configured no-usage member runtime/model, generic snapshot id, or other non-displayed technical metadata for the MVP token statistics UI.
- AC-027: For nested-team usage events with existing `memberPathJson`, the backend can expose the path so the frontend may show a nested-path label or indentation; no additional persisted hierarchy field is required.

## Constraints / Dependencies

- Must combine token ledger usage/cost data with token-usage-owned display fields for human-readable labels; run-history metadata may be used only to capture/backfill that context when available.
- Must avoid double-counting team-member events.
- Must account for mixed currencies and partial/missing price status.
- Must use existing ledger/run-history fields where possible to populate the concrete token-statistics display fields.
- Must preserve the current per-model statistics capability.

## Assumptions

- Current token usage ledger already stores run/team/member identity fields for new runs.
- Run history can resolve agent/team names, summaries, created times, and member names for most current rows, and can be used to backfill compact display fields for legacy rows while metadata still exists.
- Missing run-history metadata can fall back to raw run/team id and ledger timestamps.

## Risks / Open Questions

- Some legacy token usage rows may lack `root_team_run_id` or member metadata.
- Some rows may have ledger usage but missing run-history metadata.
- Legacy rows whose display fields were never captured may remain partially self-contained and need explicit `Unknown` / `First usage observed` fallbacks.
- Long-running/resumed runs may span date boundaries; MVP `Usage during period` should clearly indicate it may show period usage, not necessarily full task lifetime cost.
- `Tasks created in period` mode is desirable but must remain a follow-up outside the MVP implementation.

## Requirement-To-Use-Case Coverage

- REQ-001 through REQ-007 cover UC-001, UC-002, UC-003, UC-004.
- REQ-008 through REQ-017 cover UC-003, UC-005, and detailed cost comprehension.
- REQ-018 through REQ-025 cover navigation, date behavior, created-time semantics, sorting, and states.
- REQ-026 through REQ-028 cover runtime visibility in the secondary model diagnostics view.
- REQ-029 covers MVP range-control shape and prevents accidental implementation of a fake range-mode selector.
- REQ-030 through REQ-041 cover usage-derived team member display, existing-path hierarchy support, and the concrete self-contained display-field requirement while preventing unrelated metadata creep.
- REQ-002 covers UC-006.
- REQ-031 through REQ-041 also cover UC-007.

## Acceptance-Criteria-To-Scenario Intent

- AC-001 validates default task-oriented entry.
- AC-002 and AC-003 validate chronological repeated-run clarity.
- AC-004 through AC-007 validate team expansion and no double-counting.
- AC-023 validates usage-derived member expansion. AC-024 through AC-026 validate self-contained display fields and the no-unnecessary-fields constraint.
- AC-008 validates runtime visibility.
- AC-009 and AC-010 validate token breakdown semantics.
- AC-011 and AC-012 validate model view preservation.
- AC-013 through AC-018 validate status, empty state, created-time source semantics, repeated-run chronology, and sorting behavior.
- AC-019 through AC-021 validate runtime visibility and runtime/model grouping in the secondary model diagnostics view.
- AC-022 validates the compact `Usage during period` MVP control shape.
- AC-026 and AC-027 validate the self-contained token-statistics dataset, no-unnecessary-fields constraint, and existing-path nested hierarchy support.

## Approval Status

Approved by user on 2026-06-29 for design kickoff.
