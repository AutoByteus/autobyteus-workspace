# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready

## Goal / Problem Statement

The Token tab's team usage table renders the `Team total` row with values that match `solution_designer`/the currently live partial team summary instead of the aggregate for all team members. The issue is visible in the provided screenshots: focusing `solution_designer` makes `Team total` match `solution_designer`; focusing `code_reviewer` still leaves `Team total` matching `solution_designer`, not the `code_reviewer` row and not the sum of all members.

## Investigation Findings

- This is a real frontend data-hydration/provenance bug, not missing persisted token data.
- Token tab path: `RightSideTabs.vue` renders `TokenUsageMeterPanel.vue`; that panel consumes `useTokenUsageWorkspaceScope`; that composable reads/writes `useTokenUsageMeterStore`; the store hydrates via Apollo GraphQL queries from `token_usage_meter_queries.ts` and also applies live `TOKEN_USAGE_UPDATED` stream events.
- Backend persisted aggregate path is healthy for the reported team: GraphQL `getTeamRunTokenUsageSummary(teamRunId)` resolves through `TokenUsageLedgerStore.getTeamRunSummary()`, which queries `token_usage_ledger_events` by `root_team_run_id` and builds a sum across all events.
- Local ledger evidence for the team visible in the screenshots (`software_engineering_team_057fd30efa5f4bd3843c744698ee7699`, identified by matching member values such as `implementation_engineer` = `106,022,570` gross input and `code_reviewer` = `50,679,831` gross input) has a current persisted total of `300,875,782` gross input, `1,332,498` output, `302,208,280` total tokens, and `2,316` reports. The displayed `Team total` in the screenshot is therefore not the backend aggregate.
- Root cause in current frontend code: `useTokenUsageWorkspaceScope.hydrateTeamTotalSummary()` skips `fetchTeamRunSummary()` whenever `meterStore.getTeamSummary(teamRunId)` returns any value. `tokenUsageMeterStore.applyTokenUsageUpdated()` creates/updates `teamSummaries[teamRunId]` from live stream deltas. If the browser has only observed live events from `solution_designer` for that team, that partial live summary is treated as a complete team total and blocks the ledger-backed aggregate fetch.
- `TeamTokenUsageSummary.vue` is presentational and renders whatever `teamTotalSummary` it receives; the incorrect value is supplied before rendering.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant / Shared Structure Looseness
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Needed, small/local
- Evidence basis: The store has one `teamSummaries` map for both provisional live deltas and ledger-backed aggregate snapshots, while the hydration guard treats any entry as authoritative and complete. Local SQLite ledger proves the backend aggregate exists and differs from the visible row.
- Requirement or scope impact: The frontend must either distinguish ledger-backed team aggregates from provisional live aggregates or always fetch/refresh the ledger aggregate for active team totals despite a preexisting live entry.

## Recommendations

- Fix the frontend Token tab/store boundary so a provisional live team summary cannot block the persisted team aggregate fetch for the `Team total` row.
- Prefer a small source/provenance invariant in `tokenUsageMeterStore` or the composable: a team summary should only suppress `fetchTeamRunSummary(teamRunId)` after it is known to be ledger-backed/current for that team total purpose.
- Keep `TeamTokenUsageSummary.vue` presentational; do not compute totals in the component.
- Preserve live updates by continuing to apply later `TOKEN_USAGE_UPDATED` deltas to the team summary after the ledger snapshot has hydrated.
- Add durable frontend coverage for the exact failure mode: partial live team summary exists for only `solution_designer`; opening the Token tab still fetches and displays the full ledger aggregate.

## Scope Classification (`Small`/`Medium`/`Large`)

Small

## In-Scope Use Cases

- A user opens the Token tab for an agent team and sees a per-member usage table.
- A user focuses any team member row and expects the detail panel to focus that member without changing the aggregate `Team total` row.
- A user has an in-memory live partial team summary from recently observed stream events, then opens/reopens a historical or long-running team and expects `Team total` to use persisted aggregate data.

## Out of Scope

- Changing token accounting semantics, persisted token ledger data, or price calculation policy.
- Redesigning the entire Token tab UX.
- Reintroducing the old aggregate-primary Token Meter behavior for focused team members.

## Functional Requirements

- `REQ-001`: In team context, the Token tab must render `Team total` as the server-owned aggregate for the team run, not as any individual member row or partial live-only summary.
- `REQ-002`: Focusing a member row must only affect focused-row highlighting and the detail context above the table; it must not replace or alias the aggregate `Team total` row.
- `REQ-003`: The data path must keep per-member values and team-aggregate values distinct at the API response/selector/view-model/rendering boundary that owns the team table.
- `REQ-004`: A live/in-memory team summary created from stream deltas must not be treated as a complete ledger-backed team total until the store/composable has hydrated or refreshed the team aggregate from the server for that team run.
- `REQ-005`: The fix must preserve live updates: after the ledger-backed aggregate is loaded, later `TOKEN_USAGE_UPDATED` events for that team should still update the displayed aggregate without double-counting known events.

## Acceptance Criteria

- `AC-001`: Given a team with multiple members and unequal token totals, the displayed `Team total` input/output/total token values equal the server-owned team aggregate, not any individual member row.
- `AC-002`: When the user focuses `solution_designer`, `code_reviewer`, or any other member, the `Team total` row remains unchanged except for legitimate new team usage and still reflects the team aggregate.
- `AC-003`: Given `tokenUsageMeterStore.teamSummaries[teamRunId]` already contains only a live partial summary for `solution_designer`, opening the Token tab for that team still invokes the team aggregate hydration path and replaces/refreshes the `Team total` row with the persisted aggregate.
- `AC-004`: The frontend does not compute authoritative team totals inside `TeamTokenUsageSummary.vue`; it renders a store summary that is known to be a team aggregate for the active team run.
- `AC-005`: Durable coverage fails on the current bug shape and passes after the fix.

## Constraints / Dependencies

- Must preserve existing per-member token/cost display and focused-row detail behavior.
- Must preserve server-accounted usage and estimated price semantics.
- Must not introduce backward-compatible dual behavior for the incorrect total row.
- GraphQL/backend aggregate APIs already exist and should be reused unless implementation discovers an API contract defect.

## Assumptions

- The intended `Team total` is the aggregate for the selected root team run.
- Provisional live team deltas are useful for responsiveness, but are not sufficient to prove completeness for historical members/events.

## Risks / Open Questions

- Need decide exact implementation shape: minimal composable guard change versus explicit `teamSummarySource` metadata in the store.
- If a network fetch races with a just-received live event that has not yet persisted server-side, implementation should avoid permanently dropping that live delta.

## Requirement-To-Use-Case Coverage

- Team Token tab table: `REQ-001`, `REQ-002`, `REQ-003`, `REQ-004`
- Member focus behavior in team Token tab: `REQ-002`
- Live plus persisted team-total convergence: `REQ-004`, `REQ-005`

## Acceptance-Criteria-To-Scenario Intent

- `AC-001`: Detects aliasing of the aggregate row to a member row.
- `AC-002`: Detects accidental coupling between focus selection and aggregate row values.
- `AC-003`: Detects the current real bug: partial live summary blocks persisted aggregate fetch.
- `AC-004`: Preserves the existing server-owned accounting/pricing boundary.
- `AC-005`: Ensures durable regression protection.

## Approval Status

Approved by user on 2026-07-09 to proceed into design after root-cause analysis.
