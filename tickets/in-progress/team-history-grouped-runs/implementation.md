# Implementation

## Scope Classification

- Classification: `Medium`
- Reasoning: This re-entry redesigns the inactive historical team hydration boundary, adds runtime load-state tracking for partially hydrated team contexts, reroutes selection through the store-owned lazy-hydration boundary, and updates focused validation without changing the grouped backend history contract.

## Upstream Artifacts (Required)

- Workflow state: `tickets/in-progress/team-history-grouped-runs/workflow-state.md`
- Investigation notes: `tickets/in-progress/team-history-grouped-runs/investigation-notes.md`
- Requirements: `tickets/in-progress/team-history-grouped-runs/requirements.md`
  - Current Status: `Design-ready`
- Runtime call stacks: `tickets/in-progress/team-history-grouped-runs/future-state-runtime-call-stack.md`
- Future-state runtime call stack review: `tickets/in-progress/team-history-grouped-runs/future-state-runtime-call-stack-review.md`
- Proposed design: `tickets/in-progress/team-history-grouped-runs/proposed-design.md`

## Document Status

- Current Status: `Complete`
- Notes: The re-entry is closed. Inactive historical team runs now hydrate only the focused or coordinator member initially, additional members hydrate on demand through the store boundary, and the dormant-context pruning workaround has been removed.

## Runtime Call Stack Review Gate Summary

| Round | Review Result | Findings Requiring Persisted Updates | New Use Cases Discovered | Persisted Updates Completed | Classification (`Design Impact`/`Requirement Gap`/`Unclear`/`N/A`) | Required Re-Entry Path | Round State (`Reset`/`Candidate Go`/`Go Confirmed`) | Clean Streak After Round |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 7 | Pass | No | No | Yes | N/A | N/A | Candidate Go | 1 |
| 8 | Pass | No | No | N/A | N/A | N/A | Go Confirmed | 2 |

### Go / No-Go Decision

- Decision: `Go`
- Evidence:
  - Final review round: `8`
  - Clean streak at final round: `2`
  - Final review gate line (`Implementation can start`): `Yes`

## Spine-Led Dependency And Sequencing Map

| Order | Spine ID | Owner | Task / File | Depends On | Why This Order |
| --- | --- | --- | --- | --- | --- |
| 1 | DS-001 | `runHistoryTeamHelpers.ts` + `teamRunContextHydrationService.ts` | Split live eager hydration from historical lazy hydration and add single-member historical projection fetch/apply helpers | approved design | The hydration boundary had to change before open and selection flows could stop preloading every member |
| 2 | DS-004 | `AgentTeamContext.ts` + `agentTeamContextsStore.ts` | Add historical member load-state tracking and store-owned lazy-hydration actions | C-001 | The runtime store needed to distinguish shell members from hydrated members before callers could safely reuse one team context |
| 3 | DS-001, DS-002 | `teamRunOpenCoordinator.ts` + `runHistorySelectionActions.ts` | Route historical team opens and member switches through the store-owned lazy-hydration path | C-001, C-002 | Open and selection orchestration had to stop reopening or preloading the full team |
| 4 | DS-003 | `TeamWorkspaceView.vue` | Trigger progressive historical member hydration only after `grid` or `spotlight` mode entry | C-002, C-003 | Broader views should not reintroduce eager first-open cost |
| 5 | DS-001, DS-002, DS-003 | focused tests | Lock in focused historical open, lazy member switching, and broader-view hydration demand | source changes | The redesign needed executable evidence on the exact runtime path that regressed |

## File Placement Plan

| Item | Current Path | Target Path | Owning Concern / Platform | Action (`Keep`/`Move`/`Split`/`Promote Shared`) | Verification |
| --- | --- | --- | --- | --- | --- |
| Historical team runtime model | `autobyteus-web/types/agent/AgentTeamContext.ts` | same | shared team runtime state shape | Keep | focused store/service tests |
| Historical team hydration helpers | `autobyteus-web/stores/runHistoryTeamHelpers.ts` | same | persisted projection-to-runtime conversion | Keep | focused store/service tests |
| Team hydration boundary | `autobyteus-web/services/runHydration/teamRunContextHydrationService.ts` | same | live/historical team hydration orchestration | Keep | focused store/service tests |
| Team open orchestration | `autobyteus-web/services/runOpen/teamRunOpenCoordinator.ts` | same | run-open sequencing | Keep | focused store tests |
| Team runtime store | `autobyteus-web/stores/agentTeamContextsStore.ts` | same | team runtime focus/load-state owner | Keep | focused store tests |
| Team workspace broader-view demand signal | `autobyteus-web/components/workspace/team/TeamWorkspaceView.vue` | same | team workspace mode behavior | Keep | component tests |

## Implementation Work Table

| Change ID | Spine ID(s) | Owner | Concern | Current Path | Target Path | Action (`Create`/`Modify`/`Move`/`Split`/`Remove`) | Depends On | Implementation Status (`Planned`/`In Progress`/`Completed`/`Blocked`) | Unit Test File | Unit Test Status (`Planned`/`Passed`/`Failed`/`N/A`) | Integration Test File | Integration Test Status (`Planned`/`Passed`/`Failed`/`N/A`) | Stage 8 Review Status (`Planned`/`Passed`/`Failed`/`N/A`) | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-001 | DS-001 | hydration helpers | Build shell member contexts and reusable targeted member-projection helpers for historical teams | `autobyteus-web/stores/runHistoryTeamHelpers.ts`, `autobyteus-web/services/runHydration/teamRunContextHydrationService.ts` | same | Modify | approved design | Completed | `runHistoryStore.spec.ts` | Passed | N/A | N/A | Passed | Live team eager hydration remains unchanged; inactive historical teams fetch only one member initially |
| C-002 | DS-004 | runtime store + shared type | Add per-member historical projection-load state and store-owned `ensure...hydrated` actions | `autobyteus-web/types/agent/AgentTeamContext.ts`, `autobyteus-web/stores/agentTeamContextsStore.ts` | same | Modify | C-001 | Completed | `agentTeamContextsStore.spec.ts` | Passed | N/A | N/A | Passed | The store is now the authoritative boundary for historical member hydration demand |
| C-003 | DS-001, DS-002 | open + selection flow | Open inactive teams with only one loaded member and lazy load later selected members without reopening the whole team | `autobyteus-web/services/runOpen/teamRunOpenCoordinator.ts`, `autobyteus-web/stores/runHistorySelectionActions.ts`, `autobyteus-web/stores/runHistoryStore.ts` | same | Modify | C-001, C-002 | Completed | `runHistoryStore.spec.ts` | Passed | N/A | N/A | Passed | Historical local contexts are reused and member switches hydrate only the missing member |
| C-004 | DS-003 | team workspace view | Trigger progressive missing-member hydration only after `grid` or `spotlight` mode entry | `autobyteus-web/components/workspace/team/TeamWorkspaceView.vue` | same | Modify | C-002 | Completed | `TeamWorkspaceView.spec.ts` | Passed | N/A | N/A | Passed | Focus mode stays the cheap initial path |
| C-005 | DS-001, DS-002, DS-003 | cleanup + validation | Remove the dormant historical-context pruning workaround and cover the redesigned flow with focused tests | `autobyteus-web/stores/agentTeamContextsStore.ts`, focused frontend/backend tests | same | Modify/Remove | C-001, C-002, C-003, C-004 | Completed | mixed focused frontend tests | Passed | `workspace-run-history-graphql.e2e.test.ts` and unit run-history suites | Passed | Passed | The redesign removes the workaround by fixing the actual eager-hydration boundary |

## Test Strategy

- Focused frontend tests:
  - store/spec coverage for per-member load-state, store-owned ensure/focus actions, historical member switching, and broader-view demand behavior
  - focused history/store coverage for shell-first historical open and targeted member-projection fetches
- Backend/API safety net:
  - rerun the grouped workspace-history contract tests to prove the frontend redesign did not drift the canonical history payload
- Live probe:
  - verify the worktree frontend and backend are both serving and the grouped workspace-history schema remains live

## Execution Tracking

### Kickoff Preconditions Checklist

- Workflow state is current (`tickets/in-progress/<ticket-name>/workflow-state.md`): `Yes`
- `workflow-state.md` showed `Current Stage = 6` and `Code Edit Permission = Unlocked` before source edits: `Yes`
- Scope classification confirmed (`Small`/`Medium`/`Large`): `Yes`
- Investigation notes are current (`tickets/in-progress/<ticket-name>/investigation-notes.md`): `Yes`
- Requirements status is `Design-ready` or `Refined`: `Yes`
- Future-state runtime call stack review final gate is `Implementation can start: Yes`: `Yes`
- No unresolved blocking findings: `Yes`

### Progress Log

- 2026-04-12: Requirement-gap re-entry reopened the ticket because inactive historical team runs still eagerly hydrated every member projection on first open.
- 2026-04-12: Investigation confirmed that the historical hydrator fetched projections for every member up front even though focus mode only needed one member conversation immediately.
- 2026-04-12: Live payload measurements against real stored runs showed about `28.30 MB` and `18.07 MB` of serialized member projection data for the first two software-engineering team runs, confirming that eager historical hydration was the root cause.
- 2026-04-12: `AgentTeamContext` gained `historicalHydration` state with per-member projection load states so shell members can exist without full projection payloads.
- 2026-04-12: `runHistoryTeamHelpers.ts` now exposes single-member projection fetch/apply helpers and reusable shell-context builders.
- 2026-04-12: `teamRunContextHydrationService.ts` now keeps live eager hydration for active teams, but historical teams fetch only the focused or coordinator member projection initially and defer the rest.
- 2026-04-12: `agentTeamContextsStore.ts` became the authoritative boundary for historical member hydration demand through `focusMemberAndEnsureHydrated(...)` and `ensureHistoricalMembersHydratedForView(...)`.
- 2026-04-12: `runHistorySelectionActions.ts` and `TeamWorkspaceView.vue` were rerouted to the store-owned lazy-hydration boundary so member switching and broader views no longer reopen or preload the whole team.
- 2026-04-12: The dormant historical-context pruning workaround was removed because the redesign fixes the real cost center instead of masking accumulation.
- 2026-04-12: Focused frontend validation passed `81/81`, backend/API validation passed `14/14`, and live worktree probes confirmed the frontend on `3000`, backend on `8000`, and grouped workspace-history schema availability.
- 2026-04-12: Repo-wide Nuxt typecheck was attempted but remains unusable as a gate because it still fails on numerous pre-existing unrelated errors outside the team-history slice.

## Implementation Result

- Result: `Complete`
- Summary:
  - inactive historical team open now hydrates one member first
  - later member selection lazy loads only the requested member
  - grid/spotlight modes progressively hydrate remaining historical members on demand
  - live team hydration behavior and the grouped backend history contract remain intact
