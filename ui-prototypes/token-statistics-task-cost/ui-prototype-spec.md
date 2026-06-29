# Token Statistics Task-Cost UI Prototype Spec

## Purpose

Redesign Settings > Token Statistics so the primary view answers the user's main question:

> "How much did this agent run or agent team run cost?"

Keep model-level statistics as a secondary diagnostic view.

## Platform / Fidelity

- Platform: Web desktop first
- Viewport assumption: Electron desktop / browser, 1280px+ width
- Fidelity: implementation-ready wireframe / product spec
- Existing style: keep current Settings page layout, date range control, table-first information density, neutral gray table styling, blue primary action.

## Information Architecture

### Page title

`Token Statistics`

### Top controls

1. Date range picker
2. Static range meaning label/help text:
   - `Usage during period`
   - Help text: `Shows token usage ledger events observed in the selected dates. Long-running tasks may show partial period cost.`
   - MVP must not render a dropdown, selector, or `Tasks created in period` option.
3. Primary action: `Fetch Statistics`
4. View tabs:
   - `By Task` (default)
   - `By Model`

## Default View: By Task

### Goal

Show one row per task-level unit:

- standalone agent run
- root agent team run

Team rows are expandable and reveal member rows.

Concrete example rows, member expansion examples, cost-breakdown examples, fallback timestamp examples, repeated-run chronology examples, and the preserved `By Model` example are specified normatively in the requirements doc section `Required UI Example Data`.

### Table columns

Visible columns must appear in this order for MVP:

| Column | Required? | Meaning | Display Rules |
| --- | --- | --- | --- |
| Created Time | Yes | When the run/team was created, from run history when available; fallback to first usage timestamp | Local time; default sort newest first; enough precision to distinguish runs on same day |
| Task / Run | Yes | Human-readable task identity | Agent/team name, summary snippet, workspace, shortened run/team id |
| Type | Yes | `Team` or `Agent` | Badge style; team rows have chevron |
| Runtime | Yes | Runtime used by the run/member | Single runtime label, or `Mixed` for team rows with multiple runtimes |
| Model(s) | Yes | LLM model(s) used | Single model, or `Mixed` with details in expanded panel |
| Input | Yes | Gross input tokens | Subline: cache hit rate and cached token count when present |
| Output | Yes | Output tokens | Subline: thinking tokens included in output when present |
| Input Cost | Yes | Backend estimated input cost | Includes uncached + cache read/write costs; status suffix if partial/mixed |
| Output Cost | Yes | Backend estimated output cost | Thinking is included in output, not added again |
| Total Cost | Yes | Main cost scan column | Bold; default optional sort high-to-low available |
| Status | Yes | Pricing confidence | Complete / Partial / Missing / Mixed / Local |

Optional advanced columns behind column picker or expanded details:

- Uncached input tokens
- Cache read tokens
- Cache write tokens
- Cache hit rate
- Usage report count
- Runtime kind(s) raw id

### Row visual hierarchy

#### Team top-level row

- Left chevron for expand/collapse
- Team icon/badge
- Primary text: team definition name, e.g. `Software Engineering Team`
- Secondary text: run summary or first user prompt snippet
- Tertiary metadata: `Created Jun 28, 2026 · workspace-name · teamRunId suffix`
- Model(s): `Mixed: gpt-5.5, deepseek-v4-flash`
- Total cost bold

#### Expanded member row

Indented under team row.

- Member role/name, e.g. `solution_designer`, `implementation_engineer`
- Member path if nested team exists
- Member model/runtime
- Same token/cost columns as parent
- No separate top-level row for member agent runs, to avoid double-counting

#### Standalone agent row

- Agent icon/badge
- Agent name and summary
- Same metrics as team row
- No expander unless future detailed turn/call breakdown is added

## Expanded Details Panel / Row

When a row is expanded or clicked, show a compact detail panel below the row.

### Team detail panel

- Cost composition cards:
  - Input cost
  - Output cost
  - Total
  - Cache savings estimate: `(cache_read_tokens * input_price) - cache_read_cost` when single trusted price policy exists
- Input breakdown:
  - Uncached/full-price input
  - Cache hits/discounted input
  - Cache writes, if any
- Output breakdown:
  - Visible output tokens
  - Thinking tokens included in output
- Member table nested below, or member rows inline.

### Agent detail panel

Same cost composition and input/output breakdown, without member table.

## Secondary View: By Model

Keep current table behavior but reposition as a tab labelled `By Model`.

Use case:

> "Which runtime/model pair is costing the most in this period?"

Improvements to current model table:

- Add `Runtime` as a visible first or second column.
- Group by runtime/model pair for normal rows, not by model name alone.
- Rename `Prompt Tokens` to `Input Tokens`.
- Rename `Assistant Tokens` to `Output Tokens`.
- Show cache fields or cache rate, because model-cost view currently hides cached-token economics.
- Keep chart by total cost per runtime/model row.

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
- CTA/help text: `Try a wider date range or switch to By Model.`

### Partial pricing

- Show cost amount with `partial est.` suffix.
- Status cell lists missing dimensions on hover/click.

### Mixed currency/model/pricing

- Cost cells show `mixed est.` when currencies or pricing statuses differ.
- Expanded panel shows member rows so the user can see which member/model caused mixed status.

## Recommended Default Sorting

Default: `Created Time desc` (newest run/team first).

Rationale: the user is comparing real task executions, and repeated executions of the same agent team must appear as separate chronological rows. Cost sorting is still available as an explicit user action, but it should not be the initial table order.

User-sortable columns:

- Created date
- Total cost
- Input tokens
- Output tokens
- Cache hit rate
- Type

## Filtering

Recommended filters after MVP:

- Type: `All`, `Team`, `Agent`
- Workspace
- Agent/team definition
- Pricing status
- Model

## MVP Interaction Behavior

| Interaction | Behavior |
| --- | --- |
| Click `By Task` | Shows task/team run rows; default view |
| Click `By Model` | Shows runtime/model grouped diagnostics table |
| Click team chevron | Expands/collapses member rows |
| Click a cost cell | Opens/expands breakdown details |
| Hover pricing status | Shows missing dimensions / mixed reasons |
| Sort total cost | Reorders top-level rows only; member rows stay attached to team |

## Created Time Semantics

Created time is a first-class identity column, not just secondary metadata.

Source priority:

1. Team top-level row: root team run-history `createdAt`.
2. Standalone agent top-level row: agent run-history `createdAt`.
3. Team member row: member agent run-history `createdAt`, when shown.
4. Fallback only: earliest token ledger `observedAt` for that row.

Fallback display rule:

- If using fallback `observedAt`, show the same visible date/time but include a tooltip/detail label: `First usage observed; run creation time unavailable.`

Formatting rule:

- Display in the user's local timezone.
- Include date and minute precision, e.g. `Jun 28, 2026, 14:37`.

Chronological example:

| Created Time | Task / Run | Type | Runtime | Total Cost |
| --- | --- | --- | --- | --- |
| Jun 28, 2026, 15:42 | Software Engineering Team · "fix token meter…" | Team | Mixed | $10.30 |
| Jun 28, 2026, 12:08 | Software Engineering Team · "build electron…" | Team | Codex | $3.12 |
| Jun 27, 2026, 18:51 | Software Engineering Team · "review API…" | Team | Mixed | $7.84 |

These rows remain separate even if they share the same team definition, runtime, or model set.

## Backend Shape Needed

A new query should return historical task-cost rows, not only per-model rows.

Candidate GraphQL query:

```graphql
query TokenUsageTaskStatistics($startTime: DateTime!, $endTime: DateTime!) {
  tokenUsageTaskStatisticsInPeriod(startTime: $startTime, endTime: $endTime) {
    rows {
      rowId
      rowKind # TEAM_RUN | AGENT_RUN
      runId
      rootTeamRunId
      displayName
      summary
      workspaceName
      workspaceRootPath
      createdAt
      createdTimeSource # RUN_HISTORY | FIRST_USAGE_OBSERVED
      models
      runtimeKinds
      aggregate { ...TokenUsageCostSummaryAggregateFields }
      members {
        memberRouteKey
        memberAgentRunId
        memberName
        memberPath
        agentDefinitionId
        modelIdentifier
        runtimeKind
        aggregate { ...TokenUsageCostSummaryAggregateFields }
      }
    }
  }
}
```

## MVP / Later Split

### MVP

- Add tabs: `By Task` and `By Model`.
- Default to `By Task`.
- Render `Usage during period` as static help text only.
- Query task rows by usage observed during date range.
- Show team expandable member rows.
- Keep existing model statistics under `By Model`.

### Later

- Add `Tasks created in period` mode for full task-cost analysis as a future selectable range mode.
- Add cache savings estimate.
- Add export CSV.
- Add row click-through to run history.
- Add per-turn/per-model detail inside a task row.
