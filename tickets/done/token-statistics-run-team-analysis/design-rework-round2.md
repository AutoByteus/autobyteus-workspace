# Design Rework Round 2 Notes

## Trigger

Architecture review round 1 failed with two Design Impact findings in:

`/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-run-team-analysis/tickets/done/token-statistics-run-team-analysis/design-review-report.md`

## AR-001 Resolution — MVP Range UI Conflict

Changes made:

- `requirements.md`
  - Added REQ-029 and AC-022.
  - Clarified MVP renders static `Usage during period` help text only.
  - Clarified `Tasks created in period` is follow-up only.
- `ui-prototype-spec.md`
  - Replaced range-meaning selector with static `Usage during period` label/help text.
  - Removed `Change date range meaning` interaction.
  - Removed `rangeMode` from the candidate GraphQL query.
- `ui-behavior-test-matrix.md`
  - Fetch acceptance now says selected date range only; no `rangeMode` variable.
  - Default load acceptance now requires no range-mode selector.
- `design-spec.md`
  - Round 2 notes added.
  - MVP explicitly rejects range-mode dropdown and `rangeMode` GraphQL argument.

## AR-002 Resolution — Shared Aggregate Contract

Changes made:

- `design-spec.md`
  - Replaced the prior shared `TokenUsageRunSummaryPayload`-centered extraction with two layers:
    1. `TokenUsageCostSummaryAggregate` / `buildTokenUsageCostSummaryAggregate(events)`, an identity-free token/cost/cache aggregate core.
    2. `TokenUsageRunSummaryAdapter` / `buildTokenUsageRunSummary(...)`, which composes the aggregate with run/team/member identity for existing focused summary queries only.
  - Updated file responsibility mapping, reusable-structure checks, interface boundaries, migration sequence, and examples.
  - Added explicit good/bad example: good runtime/model row is `{ runtimeKind, modelIdentifier, aggregate }`; bad shape is pseudo run/member IDs or `TokenUsageRunSummaryPayload` reuse for diagnostics.
- `ui-prototype-spec.md`
  - Candidate task statistics query now uses `aggregate { ...TokenUsageCostSummaryAggregateFields }`, not `summaryTotals { ...TokenUsageRunSummaryFields }`.

## Remaining Intended Scope

- No token price formula changes.
- No ledger schema migration expected.
- `By Task` default and `By Model` runtime/model grouping remain unchanged.
