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

### Page title

`Token Statistics`

### Top controls

1. Date range picker.
2. Compact range meaning affordance near the date picker:
   - visible label: `Usage during period`
   - optional info tooltip: `Uses token usage observed in the selected dates; long-running tasks may show partial period cost.`
   - do **not** render a full-width explanatory paragraph/box.
   - do **not** render a dropdown, selector, or `Tasks created in period` option in MVP.
3. Primary action: `Fetch Statistics`.
4. View tabs:
   - `By Task` (default)
   - `By Model`

## Default View: By Task

### Goal

Show one top-level row per task-level unit:

- standalone agent run
- root agent team run

Team rows are expandable. Expansion shows **usage-derived member rows only**: members that emitted token-usage ledger events in the selected date range. The page is a usage/cost report, not a roster viewer, so inactive/no-usage team members are omitted in MVP.

Concrete row examples, expanded team examples, cost-breakdown examples, fallback timestamp examples, repeated-run chronology examples, and the preserved `By Model` example are specified normatively in the requirements doc section `Required UI Example Data`.

### Table columns

Visible columns must appear in this order for MVP:

| Column | Required? | Meaning | Display Rules |
| --- | --- | --- | --- |
| Task / Run | Yes | Human-readable task identity | Team rows use `teamName`; standalone rows use `agentName`; show `runSummary` and shortened run/team id. Member rows use `memberName` and shortened member run id. |
| Type | Yes | `Team`, `Agent`, or child `Member` indicator | Team rows have chevron. Member rows are visually child rows, not top-level rows. |
| Runtime | Yes | Runtime used by the run/member | Single runtime label, or `Mixed` for rows with multiple runtimes. Uses existing ledger runtime fields. |
| Model(s) | Yes | LLM model(s) used | Single model, or `Mixed` with distinct models available in row details. Uses existing ledger model fields. |
| Input | Yes | Gross input tokens | Subline: cache hit rate and cached token count when present. |
| Output | Yes | Output tokens | Subline: thinking/reasoning tokens included in output when present. |
| Input Cost | Yes | Backend-estimated input cost | Includes uncached + cache read/write costs; status suffix if partial/mixed. |
| Output Cost | Yes | Backend-estimated output cost | Thinking is included in output, not added again. |
| Total Cost | Yes | Main cost scan column | Bold; sortable. |
| Status | Yes | Pricing confidence | Complete / Partial / Missing / Mixed / Local. No `No usage` status in MVP because no-usage members are omitted. |
| Created Time | Yes for top-level rows | Root team run or standalone agent run creation time | Last column; local time; default sort newest first. Member rows may show `—`, `same as team`, or muted inherited parent time, but do not require or imply a separate member-created-time field. |

Optional advanced values belong in details, not extra default columns:

- Uncached input tokens
- Cache read tokens
- Cache write tokens
- Cache hit rate
- Usage report count
- Raw runtime/model identifiers
- Existing `memberPath` label for nested team usage rows

### Row visual hierarchy

#### Team top-level row

- Left chevron for expand/collapse.
- Team icon/badge.
- Primary text: `teamName`, e.g. `Software Engineering Team`.
- Secondary text: `runSummary` or first user prompt snippet.
- Tertiary metadata: shortened root team run id; optional `Created <date>` text may appear here, but the visible date column remains last.
- Runtime/model: single value or `Mixed`.
- Total cost: bold.

#### Expanded member row

Indented under the team row.

- Primary text: `memberName`, e.g. `solution_designer`.
- Optional subline: shortened `memberAgentRunId` and existing `memberPath` when present.
- Runtime/model from actual usage ledger events.
- Same token/cost/status metric columns as the parent.
- `Created Time` cell is not a separate member run creation time in MVP; render `—`, `same as team`, or muted inherited parent time.
- No separate top-level row for member agent runs, to avoid double-counting.
- Members with no token usage observed in the selected date range are omitted.

#### Standalone agent row

- Agent icon/badge.
- Primary text: `agentName`.
- Secondary text: `runSummary`.
- Shortened run id.
- Same metrics as team row.
- No expander unless future turn/call drilldown is added.

## Expanded Details Panel / Row

When a row is expanded or a cost cell/detail affordance is clicked, show a compact detail panel below the row.

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

## Secondary View: By Model

Keep current model diagnostics as a tab labelled `By Model`.

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

- For `By Task`: `No agent or team usage found for this date range.`
- Help text: `Try a wider date range or switch to By Model.`

### Partial pricing

- Show cost amount with `partial est.` suffix.
- Status cell or detail panel lists missing price dimensions.

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
- Type

Sorting applies only to top-level rows. Expanded member rows stay attached to their parent team.

## Filtering

Recommended after MVP:

- Type: `All`, `Team`, `Agent`
- Agent/team name
- Pricing status
- Model
- Runtime

## MVP Interaction Behavior

| Interaction | Behavior |
| --- | --- |
| Click `By Task` | Shows task/team run rows; default view. |
| Click `By Model` | Shows runtime/model grouped diagnostics table. |
| Click team chevron | Expands/collapses usage-derived member rows. |
| Click a cost cell | Opens/expands breakdown details. |
| Hover/click pricing status | Shows missing dimensions / mixed reasons. |
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

| Task / Run | Type | Runtime | Total Cost | Created Time |
| --- | --- | --- | ---: | --- |
| Software Engineering Team · "fix token meter…" | Team | Mixed | $10.30 | Jun 28, 2026, 15:42 |
| Software Engineering Team · "build electron…" | Team | Codex | $3.12 | Jun 28, 2026, 12:08 |
| Software Engineering Team · "review API…" | Team | Mixed | $7.84 | Jun 27, 2026, 18:51 |

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
      teamName
      agentName
      runSummary
      runCreatedAt
      createdTimeSource # RUN_CREATED_AT | FIRST_USAGE_OBSERVED
      models
      runtimeKinds
      aggregate { ...TokenUsageCostSummaryAggregateFields }
      members {
        memberRouteKey
        memberAgentRunId
        memberName
        memberPath
        models
        runtimeKinds
        aggregate { ...TokenUsageCostSummaryAggregateFields }
      }
    }
  }
}
```

Important backend constraints:

- `teamName`, `agentName`, `runSummary`, `runCreatedAt`, and `memberName` are the only new self-contained display fields.
- Runtime/model come from existing ledger fields and are not duplicated in the display fields.
- `memberPath` comes from the existing ledger `memberPathJson` / `member_path` field.
- There is no `rangeMode` argument.
- There is no no-usage member state, no roster order, no configured no-usage member runtime/model, no workspace field, and no generic snapshot/display-context object.

## MVP / Later Split

### MVP

- Add tabs: `By Task` and `By Model`.
- Default to `By Task`.
- Render `Usage during period` only as a compact date-range label/tooltip, not as a paragraph/box.
- Query task rows by usage observed during date range.
- Show expandable team rows with usage-derived member rows.
- Add only the five self-contained display fields needed by the UI: `teamName`, `agentName`, `runSummary`, `runCreatedAt`, `memberName`.
- Keep existing model statistics under `By Model`, grouped by runtime/model pair.

### Later

- Add `Tasks created in period` mode for full task-cost analysis as a future selectable range mode.
- Add CSV/export/import tooling.
- Add row click-through to run history.
- Add per-turn/per-model detail inside a task row.
- Add separate member-created-time only if a future UI requirement needs it.
