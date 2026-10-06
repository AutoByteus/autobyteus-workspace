# Implementation Handoff — collaboration-member-artifact-hydration

Ticket folder: `/home/autobyteus/workspace/.codex/worktrees/collaboration-member-artifact-hydration/tickets/in-progress/collaboration-member-artifact-hydration/` (`<T>`). Source paths below are under `autobyteus-web/`.

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: independent architecture review was selected (Medium + High) and passed (`ARCH-REV-001`, on SR-003). The handoff rule for a completed High-risk implementation routes to `/code_reviewer`.
- Requirements doc: `<T>/requirements-doc.md`. The approved basis is REQ-001..REQ-004 with AC-001..AC-007. REQ-005 is withdrawn; REQ-006 (collaborators) is pending and out of scope.
- Investigation notes: `<T>/investigation-notes.md`
- Solution revision record: `<T>/solution-revision-record.md` (SR-003 is authoritative; SR-001 and SR-002 are history)
- Design spec: `<T>/design-spec.md` (SR-003)
- Supplemental task artifacts: `<T>/design-principles-recheck.md`; predecessor evidence (read-only) in `/home/autobyteus/workspace/autobyteus-workspace/tickets/done/run-file-change-live-projection-ownership/`
- Design review report: `<T>/design-review-report.md` (Pass; advisory IMPL-NOTE-001 and DOC-001)
- Architecture review revision record: `<T>/architecture-review-revision-record.md`
- Solution handoff: `<T>/solution-handoff.md`
- Triggering rework report: N/A (first completed round). The earlier SR-001 pause (DI-001) and SR-002 pause are recorded in the revision record.

## Current Implementation Summary

Team and AgentOrg members now load their recorded artifacts together with their run state and commit them at the same guarded commit point. One shared owner does this for every member path.

- **New owner `services/runHydration/memberRunStateHydration.ts`:**
  - `fetchMemberRunState({ runId, fetchProjection })` runs the caller's projection query and `fetchRunFileChanges(runId)` in parallel, and throws if either fails.
  - `MemberRunStateCommit` holds `{ runId, expectedActivityRevision, activities, fileChanges }`.
  - `commitMemberRunStates(states)` makes one revision-guarded activity replacement for all states, then merges each member's artifacts with `mergeHydratedRunFileChanges`. On `conflict` it writes nothing, artifacts included, and returns `conflict` to the caller.
- **`runFileChangeHydrationService.fetchRunFileChanges(runId)`:** network-only. It throws on GraphQL errors and returns `[]` for a missing payload, which is the existing standalone behavior. The standalone path (`runContextHydrationService`) uses it in place of its inline query; its commit is unchanged.
- **Team open** (`teamRunContextHydrationService.hydrateCurrentTeamRunContext`):
  - The focused member, and every member during stream recovery, use the exact fetch through the owner.
  - The other members use a best-effort fetch that wraps the whole member fetch. If the projection or the artifacts fail, that member becomes `null` as a whole. Its projection stays `null` in `projectionByAgentRunId`, so it is not marked authoritative and the lazy path hydrates it on selection (IMPL-NOTE-001).
  - `TeamRunHydrationCandidate.memberRunStates` replaces `activityReplacements`.
  - `commitTeamRunHydrationActivities` is renamed `commitTeamRunHydration` and now commits through the owner. All 4 call sites are updated: `teamRunOpenCoordinator.ts` ×2 and `agentTeamRunStore.ts` ×2. `markCommittedTeamRunHydrationAuthority` is unchanged.
- **Team lazy** (`teamMemberProjectionHydrationService.attemptHydration`):
  - It fetches through the owner (exact).
  - After the existing guards and live-tool reconciliation, it commits activities and artifacts with `commitMemberRunStates`.
  - On `conflict` it returns `null` and retries, as before. The conversation commit still happens only after `applied`.
- **AgentOrg** (`agentOrgContextHydration.stageAgentOrgExecutionContext`):
  - Each member is fetched through the owner (exact). The activity revision is still captured after the fetch, in `applyProjection`.
  - The staged callback `commitActivities` is renamed `commit` and commits through the owner. Its callers are updated: `agentOrgContextsStore.ts` and `agentOrgStreamingService.ts`.
- **Collaborators:** unchanged. The SR-002 collaborator edits were reverted, and `commitActivities` remains there.

- Implementation cycle: `Initial` (first completed round on SR-003)
- Implementation revision record: `<T>/implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: `SR-003` (history: `SR-001`, `SR-002`)
- Related architecture-review revision IDs: `ARCH-REV-001`
- Related code-review revision IDs: `N/A`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: N/A. Advisory IMPL-NOTE-001 was applied.

## Routing Classification (Mandatory)

- Task size: `Medium`
- Architecture risk: `High`
- Design classification section / evidence reference: `design-spec.md` § Task Size And Architectural Risk (SR-003)
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale:
  - 10 production files changed (+118/−82) plus 1 new owner file (50 lines); no server, API or persistence change.
  - The High-risk parts are exactly what the design named: the new shared owner on three member hydration paths, the candidate shape change, and the renamed commit functions at 6 call sites.
- Selected route: `Code Review`
- Lightweight implementation self-review completed for the direct route: `Not Applicable`
- New design impact or escalation trigger: `None`

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001/002 (REQ-001; AC-001, AC-002) | Team member artifacts listed after reload and on historical runs | Team open: `hydrateCurrentTeamRunContext` → `fetchMemberRunState` per member → `memberRunStates` → `commitTeamRunHydration` → `commitMemberRunStates` (merge). Lazy path for members not hydrated at open: `attemptHydration` → owner | Unit: Team open commits both members' artifacts (active and historical); lazy selection commits them. All fail on base. |
| BEH-003 (REQ-002; AC-003, AC-004) | Org member artifacts listed, including nested Team members | `stageAgentOrgExecutionContext` → owner per member → staged `commit()` → `commitMemberRunStates` | Unit: active and historical staging, including `agent-task-lead` in a nested Team. Store open path: a historical Org opened through `openForInspection` with the real Apollo harness. All fail on base. |
| BEH-005 (REQ-003; AC-005) | No dropped, duplicated or reverted live entries | Store `mergeRunProjection` (`updatedAt >=` wins), via the owner | Unit: a live entry with a newer `updatedAt` is kept, hydrated rows are added, and nothing is duplicated. A conflicting commit writes no artifacts (Team open, Team lazy, Org). |
| BEH-004 (REQ-004; AC-006) | Standalone unchanged | `runContextHydrationService` → `fetchRunFileChanges`; commit unchanged | Unit: artifacts carried on the candidate, missing payload gives `[]`, GraphQL error fails the open. All pass on base too. |
| AC-007 | Artifact failure behaves like a projection failure on each path | The owner throws when either fetch fails | Team focused: the open fails. Team non-focused: the member is left unhydrated and not authoritative. Team lazy: the attempt fails and nothing is committed. Org: staging fails. |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes` (collaborators untouched, no server change)

## Key Files Or Areas

- Production: the 11 files listed above.
- New and extended specs:
  - `services/runHydration/__tests__/memberRunStateHydration.spec.ts` (new, 7 tests)
  - `teamRunContextHydrationService.spec.ts` (+5)
  - `teamMemberProjectionHydrationService.spec.ts` (+3)
  - `agentOrgContextHydration.spec.ts` (+5)
  - `stores/__tests__/agentOrgInspectionApollo.spec.ts` (+1, open path)
  - `runContextHydrationService.spec.ts` (+3, standalone)
- Test-harness updates for the new artifact query (these test doubles were not answering it):
  - `test-support/agentOrgApolloFixture.ts`: `ControlledOrgApollo.fileChangesByRunId`, which answers `GetRunFileChanges` immediately without queueing it.
  - `GetRunFileChanges` branches added to the mocks in `useWorkspaceHistorySubjectActions.coldHistory.spec.ts`, `HistoricalTeamLazyHydration.integration.spec.ts`, `WorkspaceAgentOrgActivityPublication.spec.ts` and `TeamCanonicalPlus.spec.ts`.
  - An artifact-query pass-through in the `vi.mock` of `agentOrgInspection.spec.ts` and `agentOrgRetainedRecovery.spec.ts`, so their existing call-count assertions stay exact.
  - Fixture rename `activityReplacements` → `memberRunStates` in 4 specs, and an exact per-document query count in `agentOrgContextHydration.spec.ts` (7 projection plus 7 artifact queries).
  - Rename `commitActivities` → `commit` in the Org specs.

## Important Assumptions

- The server resolves `getRunFileChanges` for Team and Org member runIds. The design probe confirmed this for an Org member, and the predecessor ticket covers the server path.

## Known Risks

- **Stricter coupling (design Risk).** An artifact fetch error now fails a member exactly as a projection error does:
  - an Org open fails;
  - a Team focused member fails the open;
  - a non-focused Team member falls back to lazy hydration.
- **Extra queries.** Each member hydration adds one `GetRunFileChanges` request (QR-001).
- **Equal-`updatedAt` transient `content` edge case.** Pre-existing; out of scope.
- **Pre-existing failures.** These web tests fail on base `db39803d4`, unrelated to this change, and are listed in the check results below.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Bug Fix
- Reviewed root-cause classification: per `design-spec.md` SR-003 (missing per-member artifact hydration; one shared member-run state owner)
- Reviewed refactor decision: `Refactor Needed Now`. The shared owner is in place; `activityReplacements` was replaced, not kept beside the new field.
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A` (DI-001 was resolved earlier, in SR-002 and SR-003)

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`. There are no aliases for `commitActivities` (Org) or `commitTeamRunHydrationActivities`, and no `activityReplacements` alongside `memberRunStates`.
- Legacy old-behavior retained in scope: `No`. The standalone inline `GetRunFileChanges` query and its type are removed.
- Dead or obsolete code removed in scope: `Yes`. The SR-002 shapes are gone: `fetchMemberRunFileChanges`, `fileChangesByAgentRunId` and the collaborator edits.
- Shared structures remain tight: `Yes`. `MemberRunStateCommit` has 4 fields, with no parallel artifacts map.
- Canonical shared design guidance reapplied: `Yes`
- Changed source files within size guardrails: `Yes`. The largest are `agentTeamRunStore.ts` (489 effective lines, +3/−3) and `agentOrgStreamingService.ts` (478, rename only); every per-file delta is at most +46/−23.

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected` (frontend in-memory stores only)
- Deviation: `None`

## Environment Or Dependency Notes

- The worktree needed `pnpm install` (through a temporary `/tmp/pnpm-shim/pnpm` → `corepack pnpm`) and `pnpm exec nuxt prepare` to generate `.nuxt/tsconfig.json`.
- `vue-tsc` is not installed. The typecheck used `tsc --noEmit -p tsconfig.json`. It reports about 1000 pre-existing errors, mostly in spec files, and none in the changed source files.

## Local Implementation Checks Run

- Typecheck: none of the `tsc` errors are in the changed production files.
- Related suites (`services/runHydration`, `services/runOpen`, `services/agentOrgExecution`, `services/agentCollaboration`, and the affected store and composable specs): the failure set is identical to base (19 pre-existing failures, in `teamTaskApprovalHydration.spec.ts` and `runHistoryStore`), with no new failures.
- New tests on base: every new AC-001..AC-004 and AC-007 Team/Org test fails against base source; the standalone AC-006 tests pass on base.
- Full web unit suite (`pnpm -C autobyteus-web test:nuxt --run`): 565 files, 3692 tests:
  - With the change: 33 failed, 3655 passed, 4 skipped.
  - Base `db39803d4`: 36 failed (564 files, 3669 tests).
  - **No new failures.** The 3 base-only failures are FileExplorer activation timing tests, which also passed on the first change run, so they are flaky rather than fixed.
  - An earlier run exposed 17 failures in 5 specs whose Apollo doubles rejected the new `GetRunFileChanges` query. Those harnesses were updated; see Key Files.

## Frontend Rendered-Result Check (When Applicable)

- Affected surfaces: the Artifacts tab for Team and Org members. No UI, layout or rendering code changed; only the store hydration that feeds the existing list.
- Rendered inspection: not performed at this stage. The rendered journeys (reload and historical, Team and Org; AC-001..AC-004 "Browser E2E") are planned for API/E2E (design-spec Change Sequence step 7).
- Remaining uncertainty: the rendered previews depend on the predecessor server fix (merged).

## Downstream Coverage Hints / Suggested Scenarios

- Reload a page with an active Team, select a non-coordinator member, open Artifacts: all artifacts are listed and preview. Also check a historical Team. (AC-001, AC-002)
- An active Org and a historical Org, including a member of a nested Team. (AC-003, AC-004)
- A live `FILE_CHANGE` arriving while a member hydrates. (AC-005)
- A standalone agent reload. (AC-006)

## API / E2E / Executable Coverage Investigation And Execution Still Required

- Browser E2E for AC-001..AC-004 on a real stack.
- Live race check for AC-005, if feasible.
