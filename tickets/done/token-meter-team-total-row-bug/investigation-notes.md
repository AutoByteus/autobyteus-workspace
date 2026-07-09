# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Investigation complete; requirements approved by user on 2026-07-09; design spec produced and ready for architecture review.
- Investigation Goal: Determine whether the Token tab `Team total` row incorrectly aliases `solution_designer`/first-member/focused-member data and identify the owning frontend/backend data path.
- Scope Classification (`Small`/`Medium`/`Large`): Small
- Scope Classification Rationale: Root cause is isolated to frontend team total hydration/store provenance. Backend persisted aggregate data and GraphQL boundaries are present.
- Scope Summary: Diagnose and design a fix for the Token tab team aggregate row showing `solution_designer`/partial live values rather than the actual aggregate.
- Primary Questions To Resolve:
  - Which API endpoint or state provider supplies Token tab data? Resolved.
  - Does backend data contain a correct team aggregate distinct from member usage? Resolved: yes.
  - Does frontend derive `Team total` from the wrong source? Resolved: it accepts any in-memory team summary, including live partial stream summaries, as sufficient and skips ledger hydration.
  - What tests already cover team totals and focused-member behavior? Existing tests cover focused primary and static team total rendering, but not partial-live-summary blocking aggregate hydration.

## Request Context

User reported that in the right-side Token tab, the `Team total` row always appears to use `solution_designer` values. Provided screenshots show:

- Image #1 (`/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_1ff472be6bf4411fb5f07b522ce7e116/solution_designer_03cb8e0a682f4987baefb197fb5fa7d8/context_files/ctx_0265b7515dc2__image.png`): focused `solution_designer`; `Team total` row equals `solution_designer` row (`6.67 Mio.` gross input, `30,267` output, `6.7 Mio.` total).
- Image #2 (`/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_1ff472be6bf4411fb5f07b522ce7e116/solution_designer_03cb8e0a682f4987baefb197fb5fa7d8/context_files/ctx_3b8be75834f8__image.png`): focused `code_reviewer`; `Team total` row still equals `solution_designer` row (`7.97 Mio.` gross input, `33,815` output, `8 Mio.` total), not `code_reviewer` and not the sum of all members.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-team-total-row-bug`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-team-total-row-bug/tickets/done/token-meter-team-total-row-bug`
- Current Branch: `codex/token-meter-team-total-row-bug`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-team-total-row-bug`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin --prune` completed successfully on 2026-07-09 before worktree creation.
- Task Branch: `codex/token-meter-team-total-row-bug`
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None.
- Notes For Downstream Agents: This task was created after prior completed branch `codex/token-meter-team-member-focus`; `origin/personal` already contains that feature commit.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-07-09 | Command | `pwd && ls -la && git rev-parse --show-toplevel && git status --short --branch && git remote -v` from `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` | Bootstrap workspace discovery | Superrepo git checkout on branch `personal`; user checkout has unrelated untracked files. | No |
| 2026-07-09 | Command | `git remote show origin`; `git branch -r`; `git worktree list --porcelain` | Resolve base branch and existing task worktrees | Remote default branch is `personal`; prior worktree `token-meter-team-member-focus` exists and is already merged to `origin/personal`. | No |
| 2026-07-09 | Command | `git fetch origin --prune` | Refresh tracked remote refs before creating task worktree | Completed successfully. | No |
| 2026-07-09 | Command | `git worktree add /Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-team-total-row-bug -b codex/token-meter-team-total-row-bug refs/remotes/origin/personal` | Create dedicated task worktree/branch | Worktree created from `origin/personal` at `2a193907`. | No |
| 2026-07-09 | Data | User-provided screenshots at context file paths listed in request context | Confirm reported visible behavior | Screenshot table values show `Team total` matching `solution_designer` row even when `code_reviewer` is focused. | Source/data path inspected below. |
| 2026-07-09 | Command | `rg -n "Team total|Token Meter|Calculation details|Usage reports|Per-member tokens|focused|memberReports|team" autobyteus-web/components/workspace/usage autobyteus-web/stores/tokenUsageStatistics* autobyteus-web/stores/__tests__/tokenUsageStatistics.spec.ts autobyteus-server-ts/src/token-usage -S` | Locate Token tab UI/store/backend owners | Found `TokenUsageMeterPanel.vue`, `TeamTokenUsageSummary.vue`, `useTokenUsageWorkspaceScope.ts`, `tokenUsageMeterStore.ts`, GraphQL queries, backend token usage store. | No |
| 2026-07-09 | Code | `autobyteus-web/components/layout/RightSideTabs.vue` | Confirm right-side tab entrypoint | Token tab renders `TokenUsageMeterPanel`. | No |
| 2026-07-09 | Code | `autobyteus-web/components/workspace/usage/TokenUsageMeterPanel.vue` | Inspect Token tab panel | Consumes `isTeamContext`, `primarySummary`, `teamRows`, `teamTotalSummary`, `teamTotalLoading`, `teamTotalError` from `useTokenUsageWorkspaceScope`; passes `teamTotalSummary` to `TeamTokenUsageSummary`. | No |
| 2026-07-09 | Code | `autobyteus-web/components/workspace/usage/TeamTokenUsageSummary.vue` | Inspect `Team total` rendering | Presentational component renders `teamTotalSummary` fields directly. No local summing or focus logic in the component. | No |
| 2026-07-09 | Code | `autobyteus-web/composables/useTokenUsageWorkspaceScope.ts` | Inspect Token tab data-source selection and hydration | `teamTotalSummary = meterStore.getTeamSummary(activeTeamRunId)`; `hydrateTeamTotalSummary()` returns early if `meterStore.getTeamSummary(normalizedTeamRunId)` exists, so any existing team summary suppresses `fetchTeamRunSummary()`. | Fix should target this guard/provenance. |
| 2026-07-09 | Code | `autobyteus-web/stores/tokenUsageMeterStore.ts` | Inspect frontend token store | `applyTokenUsageUpdated()` applies live stream deltas to both `runSummaries[runId]` and `teamSummaries[root_team_run_id]`. The same `teamSummaries` map also stores ledger-backed `fetchTeamRunSummary()` results. There is no source/completeness metadata. | Need make partial live summaries unable to block ledger hydration. |
| 2026-07-09 | Code | `autobyteus-web/services/agentStreaming/handlers/tokenUsageHandler.ts`; `autobyteus-web/services/agentStreaming/teamStreamGenericMessageDispatcher.ts` | Inspect live stream ingestion path | Live `TOKEN_USAGE_UPDATED` messages call `meterStore.applyTokenUsageUpdated()`. In a running team, frontend may have partial in-memory team summary before a ledger aggregate is fetched. | No |
| 2026-07-09 | Code | `autobyteus-web/graphql/queries/token_usage_meter_queries.ts` | Inspect frontend GraphQL summary queries | Frontend has `GET_AGENT_RUN_TOKEN_USAGE_SUMMARY`, `GET_TEAM_RUN_TOKEN_USAGE_SUMMARY`, and `GET_TEAM_MEMBER_TOKEN_USAGE_SUMMARY`. | No |
| 2026-07-09 | Code | `autobyteus-server-ts/src/api/graphql/types/token-usage-stats.ts`; `autobyteus-server-ts/src/token-usage/providers/token-usage-ledger-store.ts`; `autobyteus-server-ts/src/token-usage/repositories/sql/token-usage-ledger-repository.ts` | Inspect backend GraphQL data provider | `getTeamRunTokenUsageSummary(teamRunId)` uses `TokenUsageLedgerStore.getTeamRunSummary()`, which calls `listEventsByTeamRunId(rootTeamRunId)` and builds a cost/token aggregate over all matching events. | Backend identity shape may be worth tightening later (`run_id` currently uses first event run id), but value aggregation path is correct. |
| 2026-07-09 | Command/Data | `sqlite3 /Users/normy/.autobyteus/server-data/db/production.db` queries over `token_usage_ledger_events` grouped by `root_team_run_id` and member | Verify actual persisted data for the team visible in screenshots | Team `software_engineering_team_057fd30efa5f4bd3843c744698ee7699` matches screenshot rows (`implementation_engineer` 106,022,570 input; `code_reviewer` 50,679,831 input). Current persisted aggregate is 300,875,782 input, 1,332,498 output, 302,208,280 total, 2,316 reports. | No |
| 2026-07-09 | Command | `curl -sS -m 5 -X POST http://localhost:8000/graphql ...` | Check whether local server was available for direct GraphQL probe | Server was not running on localhost:8000 in this shell, so direct live GraphQL query was unavailable. SQLite plus source inspection were sufficient. | No |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: Token tab in right-side panel for an agent team.
- Current execution flow:
  1. `RightSideTabs.vue` renders `TokenUsageMeterPanel` when Token tab is active.
  2. `TokenUsageMeterPanel.vue` calls `useTokenUsageWorkspaceScope()`.
  3. `useTokenUsageWorkspaceScope` builds `teamRows` from active team leaf member identities and exposes `teamTotalSummary = meterStore.getTeamSummary(activeTeamRunId)`.
  4. `hydrateTeamTotalSummary(activeTeamRunId)` is intended to call `meterStore.fetchTeamRunSummary(teamRunId)` but returns early when `meterStore.getTeamSummary(teamRunId)` already exists.
  5. `tokenUsageMeterStore.applyTokenUsageUpdated()` can create `teamSummaries[teamRunId]` from live stream events before the ledger aggregate fetch has ever happened.
  6. `TeamTokenUsageSummary.vue` renders the supplied `teamTotalSummary` directly.
- Ownership or boundary observations:
  - Backend ledger is the authoritative aggregate owner.
  - Frontend store owns live/hydrated summary cache, but does not distinguish provisional live aggregate from ledger-backed aggregate.
  - UI component is presentational and does not own aggregation.
- Current behavior summary: A partial live summary, often only containing `solution_designer` deltas observed by the current browser session, can occupy `teamSummaries[teamRunId]`; the team-total hydrator then skips server aggregate fetch and the UI displays that partial as `Team total`.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant / Shared Structure Looseness
- Refactor posture evidence summary: A small local refactor is likely needed to add source/completeness distinction or change hydration guard semantics so provisional live summaries do not block ledger hydration.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| User screenshot #2 | Focused row is `code_reviewer`, but `Team total` equals `solution_designer`, not focused member. | Bug is unlikely to be a pure focused-row highlight issue; likely cached/provisional source aliasing. | Resolved by source inspection. |
| `useTokenUsageWorkspaceScope.ts` | Team total fetch guard returns when any team summary exists. | Missing invariant: existing summary must be complete/ledger-backed before it can suppress aggregate fetch. | Design fix. |
| `tokenUsageMeterStore.ts` | Same `teamSummaries` map stores live deltas and server fetch results without provenance. | Shared structure is too loose for the team-total use case. | Design fix. |
| SQLite ledger query | Persisted team aggregate is much larger than displayed `Team total`; per-member rows are present. | Backend aggregate data exists; frontend is not using it in this state. | No backend value-aggregation fix needed by default. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-web/components/layout/RightSideTabs.vue` | Right-side tabs container | Token tab mounts `TokenUsageMeterPanel`. | Entry wrapper only. |
| `autobyteus-web/components/workspace/usage/TokenUsageMeterPanel.vue` | Token tab detailed panel | Delegates data selection to composable and passes `teamTotalSummary` to team component. | Keep presentational. |
| `autobyteus-web/components/workspace/usage/TeamTokenUsageSummary.vue` | Team per-member table and total row rendering | Renders `teamTotalSummary` directly; no aggregation logic. | Not root cause. |
| `autobyteus-web/composables/useTokenUsageWorkspaceScope.ts` | Token tab scope resolver and hydration orchestration | `hydrateTeamTotalSummary` skips fetch if any store team summary exists. | Primary frontend fix location unless store metadata handles it. |
| `autobyteus-web/stores/tokenUsageMeterStore.ts` | Run/team summary cache, live token usage update merge, GraphQL fetches | Live partial and ledger aggregate share `teamSummaries` without source metadata. | Needs invariant/metadata or fetch policy adjustment. |
| `autobyteus-web/graphql/queries/token_usage_meter_queries.ts` | Frontend GraphQL summary documents | Exposes needed agent/team/member summary queries. | Reuse. |
| `autobyteus-server-ts/src/api/graphql/types/token-usage-stats.ts` | GraphQL resolver for token usage summaries | `getTeamRunTokenUsageSummary(teamRunId)` delegates to ledger store. | Backend value path is correct. |
| `autobyteus-server-ts/src/token-usage/providers/token-usage-ledger-store.ts` | Server ledger summary provider | `getTeamRunSummary()` lists all events by root team id and builds aggregate. | Backend source of truth. |
| `autobyteus-server-ts/src/token-usage/repositories/sql/token-usage-ledger-repository.ts` | SQLite/Prisma token ledger access | `listEventsByTeamRunId()` filters by `rootTeamRunId`. | Backend data query is correct. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-07-09 | Probe | `sqlite3 /Users/normy/.autobyteus/server-data/db/production.db "with member_sums as (...) select root_team_run_id, member_count, team_input, team_output, team_total, reports, max_member_input ..."` | Team `software_engineering_team_057fd30efa5f4bd3843c744698ee7699` has 6 members and `max_member_input` 106,022,570, matching screenshot implementation row. | Identified the screenshot team in persisted ledger. |
| 2026-07-09 | Probe | `sqlite3 ... group by member_route_key, member_agent_run_id where root_team_run_id='software_engineering_team_057fd30efa5f4bd3843c744698ee7699'` | Member rows: solution_designer current 63,764,615 input after continued usage; architecture 14,610,493; implementation 106,022,570; code 50,679,831; api 28,928,571; delivery 36,869,702. Team total current 300,875,782 input / 1,332,498 output / 302,208,280 total. | Persisted aggregate is not the screenshot `Team total`; screenshot showed partial/live solution row. |
| 2026-07-09 | Probe | `curl -sS -m 5 -X POST http://localhost:8000/graphql ...` | No server listening on localhost:8000. | Direct GraphQL runtime probe unavailable; source + SQLite enough. |

## External / Public Source Findings

- Public API / spec / issue / upstream source: N/A
- Version / tag / commit / freshness: N/A
- Relevant contract, behavior, or constraint learned: N/A
- Why it matters: N/A

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: No running service needed for root-cause investigation; SQLite persisted data inspected directly.
- Required config, feature flags, env vars, or accounts: None for source/data inspection.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Dedicated worktree creation.
- Cleanup notes for temporary investigation-only setup: None.

## Findings From Code / Docs / Data / Logs

1. The data shown in the Token tab is provided by a combination of live stream events and GraphQL summary hydration:
   - Live: `TOKEN_USAGE_UPDATED` -> `tokenUsageHandler.handleTokenUsageUpdated()` / `teamStreamGenericMessageDispatcher` -> `tokenUsageMeterStore.applyTokenUsageUpdated()`.
   - Hydrated: `useTokenUsageWorkspaceScope` -> `tokenUsageMeterStore.fetchTeamRunSummary()` -> GraphQL `GET_TEAM_RUN_TOKEN_USAGE_SUMMARY` -> resolver `getTeamRunTokenUsageSummary()` -> ledger store/repository.
2. The persisted backend aggregate is correct for the team identified from screenshot values.
3. The frontend hydration guard is wrong for `Team total` because it does not distinguish partial live summaries from complete ledger-backed team aggregate snapshots.
4. Existing frontend tests cover static team total rendering and focused-member primary behavior, but do not cover the state where a partial live team summary already exists and should not block aggregate hydration.

## Constraints / Dependencies / Compatibility Facts

- The team member focus behavior is an existing feature from prior branch `codex/token-meter-team-member-focus` merged into `origin/personal`.
- The token meter title indicates usage should be live server-accounted usage and estimated API price.
- No compatibility fallback should preserve the wrong `Team total` behavior.

## Open Unknowns / Risks

- Implementation detail: whether to fix by always fetching team aggregate on active team id change, or by storing explicit source/provenance (`live_partial` vs `ledger_snapshot`) for `teamSummaries` and only skipping fetch for ledger-backed summaries.
- Race risk: persistence of live token events is asynchronous on the server; a ledger fetch can theoretically return before a just-streamed event is persisted. The implementation should avoid permanently dropping live deltas after a server refresh.

## Notes For Architect Reviewer

Design spec produced at `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-team-total-row-bug/tickets/done/token-meter-team-total-row-bug/design-spec.md`. Architecture review should focus on the frontend store/composable boundary: `Team total` needs an authoritative aggregate hydration invariant. The UI component should remain presentational, and backend ledger aggregation should be reused rather than recalculating team totals in the component.
