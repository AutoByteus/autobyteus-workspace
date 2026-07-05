# Token Statistics Task-Cost UI Prototype Spec

## Purpose

Redesign Settings > Token Statistics so the primary view answers:

> "How much did this standalone agent run or agent team run cost?"

The model table remains available as a secondary diagnostic view for runtime/model spending.

## Platform / Fidelity

- Platform: Web desktop first, Electron/browser width 1280px+.
- Fidelity: implementation-ready wireframe/product spec.
- Existing style: keep the current Settings page layout, date range control, table-first density, neutral table styling, and blue primary action.

## Information Architecture

### Page identity

The selected Settings sidebar item remains the visible page identity: `Token Statistics`.
Do not render a second visible `Token Statistics` page title/header at the top of the main content area.

### Top controls

Use one compact filter/control card with controls in this order:

1. Result grouping select with visible options `Task` (default) and `Model`.
2. Start date and end date inputs.
3. Primary action: `Fetch Statistics`.

Visible control copy should stay minimal: do **not** show `Usage during period`, `Select Date Range:`, `Group by:`, `By Task`, `By Model`, a separate lower tab row, a full explanatory paragraph/box, or a `Tasks created in period` selector in MVP. Use ARIA/non-visible labels when controls need accessible names.

## Default Grouping: Task

### Goal

Show one top-level row per task-level unit:

- standalone agent run
- root agent team run

Team rows are expandable. Expansion shows **usage-derived member rows only**: members that emitted token-usage ledger events in the selected date range. The page is a usage/cost report, not a roster viewer, so inactive/no-usage team members are omitted in MVP.

Concrete row examples, expanded team examples, cost-breakdown examples, fallback timestamp examples, repeated-run chronology examples, and the preserved `Model` grouping example are specified normatively in the requirements doc section `Required UI Example Data`.

### Table columns

Visible columns must appear in this order for MVP:

| Column | Required? | Meaning | Display Rules |
| --- | --- | --- | --- |
| Task / Run | Yes | Human-readable task identity | Team rows use `teamName`; standalone rows use `agentName`; show `runSummary` and shortened run/team id. Child rows use backend `displayName`/`memberName` and the relevant shortened member/task run id. |
| Runtime | Yes | Runtime used by the run/member | Single runtime label, or `Mixed` for rows with multiple runtimes. Uses existing ledger runtime fields. |
| Model(s) | Yes | LLM model(s) used | Single model, or `Mixed` with distinct models available in row details. Uses existing ledger model fields. |
| Input | Yes | Gross input tokens | Subline: cache hit rate and cached token count when present. |
| Output | Yes | Output tokens | Subline: thinking/reasoning tokens included in output when present. |
| Input Cost | Yes | Backend-estimated input cost | Includes uncached + cache read/write costs; renders as a plain value, not a separate detail toggle. |
| Output Cost | Yes | Backend-estimated output cost | Thinking is included in output, not added again; renders as a plain value, not a separate detail toggle. |
| Total Cost | Yes | Main cost scan column | Bold; sortable; includes one always-visible `Details` control for the row cost breakdown. Non-complete price statuses render inline in this cell. |
| Created Time | Yes for top-level rows | Root team run or standalone agent run creation time | Last column; local time; default sort newest first. Member rows may show `—`, `same as team`, or muted inherited parent time, but do not require or imply a separate member-created-time field. |

Optional advanced values belong in details, not extra default columns:

- Uncached input tokens
- Cache read tokens
- Cache write tokens
- Cache hit rate
- Usage report count
- Raw runtime/model identifiers
- Backend `executionAddress` details for nested member/task-team/task-agent usage rows
- Row-kind/status diagnostics that are already conveyed by hierarchy, metadata,
  inline non-complete status badges, and the expanded cost breakdown

### Row visual hierarchy

#### Team top-level row

- Left chevron for expand/collapse.
- Team icon/badge.
- Primary text: `teamName`, e.g. `Software Engineering Team`.
- Secondary text: `runSummary` or first user prompt snippet.
- Tertiary metadata: shortened root team run id. This metadata replaces the old
  standalone `Type` column: row kind is conveyed by hierarchy, chevrons, icons,
  indentation, and run/member/task identifiers rather than a repeated badge.
  Optional `Created <date>` text may appear here, but the visible date column
  remains last.
- Runtime/model: single value or `Mixed`.
- Total cost: bold.

#### Expanded child row

Indented under the team row.

- Primary text: backend `displayName` / `memberName`, e.g. `solution_designer`.
- Optional subline: shortened `memberAgentRunId`, `taskTeamRunId`, or
  `taskAgentRunId`, plus a compact backend `executionAddress` detail when it is
  useful for disambiguation.
- Runtime/model from actual usage ledger events.
- Same token/cost metric columns as the parent. There is no standalone `Type` or
  `Status` cell; meaningful row-kind/status information stays in metadata, the
  inline total-cost status badge, and details.
- `Created Time` cell is not a separate member run creation time in MVP; render `—`, `same as team`, or muted inherited parent time.
- No separate top-level row for nested member/task-team/task-agent runs, to avoid double-counting.
- Members with no token usage observed in the selected date range are omitted.

#### Standalone agent row

- Agent icon/badge.
- Primary text: `agentName`.
- Secondary text: `runSummary`.
- Shortened run id.
- Same metrics as team row.
- No expander unless future turn/call drilldown is added.

## Expanded Details Panel / Row

When the row's `Total Cost` `Details` affordance is clicked, show a compact
detail panel below the row. Do not rely on hover-only clickable numeric cost
cells; `Input Cost` and `Output Cost` stay plain values in the table.

### Shared cost composition

- Input cost card.
- Output cost card.
- Total cost card.
- Optional cache savings estimate only when a single trusted price policy exists.

### Input breakdown

- Uncached/full-price input.
- Cache hits/discounted input.
- Cache writes, if any.
- Total input cost.

### Output breakdown

- Output tokens.
- Thinking/reasoning tokens included in output.
- Output cost.

### Team details

- Expanded member rows remain inline below the team row, or a nested member table may appear inside details.
- Only members with selected-period usage appear.
- Missing/partial price dimensions are listed in the detail panel.

### Agent details

Same cost composition and input/output breakdown, without member rows.

## Secondary Grouping: Model

Keep current model diagnostics available through the top grouping select option labelled `Model`.

Use case:

> "Which runtime/model pair is costing the most in this period?"

Required behavior:

- Add `Runtime` as a visible first column.
- Group by runtime/model pair, not by model name alone.
- Rename `Prompt Tokens` to `Input Tokens`.
- Rename `Assistant Tokens` to `Output Tokens`.
- Show cached input or cache rate because cached-token economics matter.
- Keep model-level cost/status semantics.

Example columns:

`Runtime | LLM Model | Input Tokens | Cached Input | Output Tokens | Thinking Tokens | Input Cost | Output Cost | Thinking Cost | Total Cost`

If the same model is used through two runtimes, show two rows:

- `Codex | gpt-5.5`
- `Autobyteus | gpt-5.5`

If runtime is unavailable for legacy rows, show `Unknown`, not a blank cell.

## Empty / Loading / Error States

### Loading

- Preserve spinner.
- Text: `Loading token usage statistics…`

### Empty

- For `Task`: `No agent or team usage found for this date range.`
- Help text: `Try a wider date range or switch to Model.`

### Partial pricing

- Show cost amount with `partial est.` suffix.
- The main table has no standalone `Status` column. Non-complete statuses such
  as partial/missing/mixed/local render inline in the `Total Cost` cell, and the
  detail panel lists missing price dimensions.

### Mixed currency/model/pricing

- Cost cells show `mixed est.` when currencies or pricing statuses differ.
- Expanded panel/member rows help identify which member/model caused mixed status.

## Recommended Default Sorting

Default: `Created Time desc` (newest root team run / standalone agent run first).

Rationale: the user is comparing real task executions, and repeated executions of the same team or agent must remain separate chronological rows. Cost sorting remains available as an explicit user action.

User-sortable top-level columns:

- Created Time
- Total Cost
- Input
- Output
- Runtime
- Task / Run

Every sortable header shows a persistent sort glyph: neutral for inactive
sortable columns and directional for the active sort. The active header exposes
the current direction with accessible sort state. `Model(s)`, `Input Cost`, and
`Output Cost` are not sortable in MVP and must not render as header buttons.

Sorting applies only to top-level rows. Expanded member rows stay attached to their parent team.

## Filtering

Recommended after MVP:

- Row scope: `All`, `Team runs`, `Agent runs`
- Agent/team name
- Pricing status
- Model
- Runtime

## MVP Interaction Behavior

| Interaction | Behavior |
| --- | --- |
| Select `Task` | Shows task/team run rows; default grouping. |
| Select `Model` | Shows runtime/model grouped diagnostics table. |
| Click team chevron | Expands/collapses usage-derived member rows. |
| Click `Details` in `Total Cost` | Opens/expands the row breakdown details. |
| View inline non-complete price status or expanded details | Shows missing dimensions / mixed reasons. |
| Sort total cost | Reorders top-level rows only; member rows stay attached to team. |

## Created Time Semantics

Created time is visible but intentionally placed as the last column. It remains the default sort key, but the first scan path is task identity and cost.

Top-level source priority:

1. Token-statistics `runCreatedAt` captured from root team run creation time for team rows.
2. Token-statistics `runCreatedAt` captured from standalone agent run creation time for standalone rows.
3. Fallback only: earliest token ledger `observedAt` for the row.

Member row rule:

- MVP does not add or require `memberCreatedAt`.
- Member row `Created Time` may render `—`, `same as team`, or a muted inherited parent team time.
- The UI must not label a member row value as member-run creation time unless a future requirement adds that field.

Fallback display rule:

- If using fallback `observedAt` for a top-level row, show the same visible date/time but include a tooltip/detail label: `First usage observed; run creation time unavailable.`

Formatting rule:

- Display in the user's local timezone.
- Include date and minute precision, e.g. `Jun 28, 2026, 14:37`.

Chronological example:

| Task / Run | Runtime | Total Cost | Created Time |
| --- | --- | ---: | --- |
| Software Engineering Team · "fix token meter…" | Mixed | $10.30 | Jun 28, 2026, 15:42 |
| Software Engineering Team · "build electron…" | Codex | $3.12 | Jun 28, 2026, 12:08 |
| Software Engineering Team · "review API…" | Mixed | $7.84 | Jun 27, 2026, 18:51 |

These rows remain separate even if they share the same team definition, runtime, or model set.

## Backend Shape Needed

A task query should return historical usage rows, not live roster rows and not only model rows.

Candidate GraphQL query:

```graphql
query TokenUsageTaskStatistics($startTime: DateTime!, $endTime: DateTime!) {
  tokenUsageTaskStatisticsInPeriod(startTime: $startTime, endTime: $endTime) {
    rows {
      rowId
      rowKind # TEAM_RUN | AGENT_RUN
      runId
      rootTeamRunId
      memberRouteKey
      memberAgentRunId
      taskAgentRunId
      taskTeamRunId
      taskId
      executionAddress
      teamName
      agentName
      displayName
      runSummary
      runCreatedAt
      createdTimeSource # RUN_CREATED_AT | FIRST_USAGE_OBSERVED
      models
      runtimeKinds
      aggregate { ...TokenUsageCostSummaryAggregateFields }
      children {
        rowId
        rowKind # MEMBER_RUN | TASK_TEAM_RUN | TASK_AGENT_RUN
        runId
        rootTeamRunId
        memberRouteKey
        memberAgentRunId
        taskAgentRunId
        taskTeamRunId
        taskId
        executionAddress
        displayName
        models
        runtimeKinds
        aggregate { ...TokenUsageCostSummaryAggregateFields }
        children {
          rowId
          rowKind
          displayName
          executionAddress
          aggregate { totalTokens estimatedApiTotalCost }
        }
      }
    }
  }
}
```

Important backend constraints:

- `teamName`, `agentName`, `runSummary`, `runCreatedAt`, and `memberName` are the only new self-contained display fields.
- Runtime/model come from existing ledger fields and are not duplicated in the display fields.
- Hierarchy comes from backend-provided recursive `children` and
  `executionAddress`; the UI must not rebuild hierarchy from legacy
  `memberPathJson`, `member_path`, task records, memory paths, or display names.
- There is no `rangeMode` argument.
- There is no no-usage member state, no roster order, no configured no-usage member runtime/model, no workspace field, and no generic snapshot/display-context object.

## MVP / Later Split

### MVP

- Add one compact grouping select with visible options `Task` and `Model`; do not add a separate tab row.
- Default to `Task`.
- Do not render visible `Usage during period`, `Select Date Range:`, or `Group by:` copy.
- Query task rows by usage observed during date range.
- Show expandable team rows with usage-derived recursive member/task-team/task-agent rows.
- Add only the five self-contained display fields needed by the UI: `teamName`, `agentName`, `runSummary`, `runCreatedAt`, `memberName`.
- Keep existing model statistics under the `Model` grouping, grouped by runtime/model pair.

### Later

- Add an explicit created-time filtering mode in the future only if a backend contract is designed; do not repurpose the current observed-period date range.
- Add CSV/export/import tooling.
- Add row click-through to run history.
- Add per-turn/per-model detail inside a task row.
- Add separate member-created-time only if a future UI requirement needs it.
