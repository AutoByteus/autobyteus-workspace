# Design Rework Round 3 — User Verification Team Member Roster

## Status

Ready for architecture review.

## Trigger

During user verification of the Electron build produced from `codex/token-statistics-run-team-analysis`, the user opened Settings > Token Statistics > `By Task`, expanded some Software Engineering Team rows, and saw only `solution_designer` even though the team has other members.

## Runtime Evidence

- Embedded Electron backend queried: `http://127.0.0.1:29695/graphql`
- Query: `tokenUsageTaskStatisticsInPeriod(startTime: "2026-06-21T22:00:00.000Z", endTime: "2026-06-29T21:59:59.999Z")`
- Focused evidence artifact: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-run-team-analysis/tickets/done/token-statistics-run-team-analysis/user-verification-member-roster-probe.json`

Key example:

- `software_engineering_team_06adab49fe4e484a969cca87c110d9ab` returned one child member: `solution_designer`.
- Its team metadata file exists at `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_06adab49fe4e484a969cca87c110d9ab/team_run_metadata.json` and contains six leaf agent members:
  - `solution_designer`
  - `architecture_reviewer`
  - `implementation_engineer`
  - `code_reviewer`
  - `api_e2e_engineer`
  - `delivery_engineer`

## Root Cause Classification

- Classification: `Design Impact / Missing Invariant`.
- The implementation followed the prior design literally: team child rows were built from event-derived member groups in the selected period.
- The prior design did not state that metadata-backed team expansion must show all known roster members, including members with zero usage in the period.
- This is not a token price formula problem and not a ledger schema problem.

## Reworked Product Invariant

For metadata-backed root team runs, expanded member rows must be roster-complete:

1. Use the team-run metadata member tree as the canonical leaf-agent roster.
2. Match selected-period token usage events onto roster members by `member_agent_run_id` first, then `member_route_key`.
3. Render roster members with no matched period usage as `No usage in period` rows with zero input/output/cost and configured runtime/model labels from metadata.
4. Append unmatched legacy/incomplete event groups as fallback child rows so parent totals remain explainable.
5. If no readable team metadata exists, event-derived child rows remain the allowed fallback.

## Additional UI Refinements From User Discussion

After pausing architecture review for discussion, the user also clarified two UI expectations:

1. The visible `Usage during period` explanatory paragraph/box is redundant and makes the page look strange. The date-range semantics should remain available only as a compact label/tooltip near the date range.
2. `Created Time` should move from the first `By Task` column to the last visible column. The table still defaults to `Created Time` descending, but users should scan task identity and cost first.

## Artifacts Updated

- Requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-run-team-analysis/tickets/done/token-statistics-run-team-analysis/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-run-team-analysis/tickets/done/token-statistics-run-team-analysis/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-run-team-analysis/tickets/done/token-statistics-run-team-analysis/design-spec.md`
- UI prototype spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-run-team-analysis/ui-prototypes/token-statistics-task-cost/ui-prototype-spec.md`
- UI behavior matrix: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-run-team-analysis/ui-prototypes/token-statistics-task-cost/ui-behavior-test-matrix.md`
- Probe evidence: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-run-team-analysis/tickets/done/token-statistics-run-team-analysis/user-verification-member-roster-probe.json`

## Required Backend Design Changes

- Add a provider-facing team roster method on `TokenUsageRunHistoryEnricher`, e.g. `listTeamAgentMemberRoster(teamRunId)`.
- Keep raw team metadata store reads inside the enricher/run-history boundary; `TokenUsageStatisticsProvider` must not read `team_run_metadata.json` directly.
- Add `periodUsageState` to member DTOs, with at least:
  - `HAS_USAGE_IN_PERIOD`
  - `NO_USAGE_IN_PERIOD`
- Extend created-time source semantics with a roster-derived source such as `TEAM_ROSTER_METADATA` for no-usage rows whose member-run created timestamp is unavailable.
- Add an explicit no-usage aggregate factory rather than using `buildTokenUsageCostSummaryAggregate([])` if that would return `price_missing`/null semantics.
- For metadata-backed team rows:
  - build child rows from roster entries first;
  - attach matched event groups;
  - create zero/no-usage rows for roster entries without matched events;
  - append unmatched event groups as fallback child rows.

## Required Frontend/UI Changes

- Query/normalize member `periodUsageState`.
- Render `NO_USAGE_IN_PERIOD` rows with:
  - `No usage in period` status/copy;
  - zero token/cost cells;
  - configured runtime/model values when present;
  - no price-missing warning just because there are no events.
- Keep top-level sorting only; metadata-backed member order should follow the team member tree order.

## Required Coverage Updates

- Backend provider integration: metadata roster has six members, selected-period events only for one member, result includes all six child rows and parent total remains unchanged.
- Backend GraphQL E2E: `periodUsageState` and no-usage roster rows are mapped through GraphQL.
- Frontend store/component tests: no-usage child row normalizes and renders as `No usage in period` with zero metrics.
- Regression check: missing team metadata still uses event-derived fallback members; unmatched event groups are not dropped.

## Out Of Scope / Accepted Fallbacks

- Reconstructing missing team metadata for legacy rows remains out of scope.
- `Unknown team run` remains acceptable when no readable run-history/team metadata exists.
- The date range mode remains `Usage during period`; `Tasks created in period` remains future-only.
