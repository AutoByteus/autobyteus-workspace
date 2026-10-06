# Implementation Revision Record

The current code and `implementation-handoff.md` remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | architecture_reviewer / `design-review-report.md` / ARCH-REV-001 pass on SR-003 | N/A (advisory IMPL-NOTE-001 applied) | `Initial Baseline` | `SR-003` (history `SR-001`, `SR-002`), `ARCH-REV-001`, CRR N/A, API-REV N/A, DR N/A | Implemented; ready for code review |
| IR-002 | delivery_engineer / `release-deployment-report.md`, `delivery-revision-record.md` / post-integration check after merging `origin/personal@3c8e49ad5` | Delivery `Local Fix`: Team open artifact spec fixture missing `closedTaskExecutions` | `Local Fix` | `SR-003`, `ARCH-REV-001`, `CRR-001`, API/E2E round (see its report), delivery record | Fixed (test fixture only); composition with closed-task filtering confirmed |

## Revision Entries

### IR-001 — Shared member-run state owner for Team and AgentOrg member artifacts

- Triggering role, report path, and round: `/architecture_reviewer`, `design-review-report.md`, ARCH-REV-001 pass on SR-003.
- Triggering finding IDs: N/A. Advisory IMPL-NOTE-001 (keep a failed best-effort member's projection `null`; revert the collaborator edits) was applied.
- Classification: `Initial Baseline`
- Prior authoritative result: `N/A`. No implementation round was completed before this one:
  - SR-001 stopped at the design read with Design Impact DI-001.
  - SR-002 work was paused uncommitted at the Solution Designer's request and then reworked here.
- Current authoritative result: implemented; local checks show no new failures against base.
- Related solution revision IDs: `SR-003` (history `SR-001`, `SR-002`)
- Related architecture-review revision IDs: `ARCH-REV-001`
- Related code-review revision IDs: `N/A`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Why this baseline is recorded: the initial implementation of the approved SR-003 design.
- Approved behavior or requirement IDs affected: REQ-001, REQ-002, REQ-003 (changed); REQ-004 (preserved); AC-001..AC-007.
- Implementation delta:
  - New `memberRunStateHydration.ts` owner (`fetchMemberRunState`, `MemberRunStateCommit`, `commitMemberRunStates`).
  - `fetchRunFileChanges`.
  - Team open staging through the owner, with `memberRunStates` replacing `activityReplacements` and `commitTeamRunHydration` replacing `commitTeamRunHydrationActivities` (4 call sites).
  - Team lazy path through the owner.
  - Org staging through the owner, with the staged callback `commitActivities` renamed `commit` (2 caller files).
  - Standalone path reuses the shared fetch.
  - SR-002 work-in-progress shapes removed and collaborator edits reverted.
- Changed files or areas: 10 modified production files plus 1 new one, new and extended specs, and the test harnesses for the new query (see the handoff, Key Files).
- Local validation and result: see the handoff, Local Implementation Checks. The related suites and the full web unit suite show no new failures against base, and the new AC-001..AC-004 tests fail on base.
- Next recipient or routing: `/code_reviewer` (Medium + High).
- Remaining limitations or risks:
  - Browser E2E for AC-001..AC-004 is owned by API/E2E.
  - The stricter artifact failure coupling noted in the design Risks.
  - Pre-existing base test failures.

### IR-002 — Post-integration fixture fix (`closedTaskExecutions`)

- Triggering role, report path, and round: `/delivery_engineer`, `release-deployment-report.md` and `delivery-revision-record.md`, from the post-integration check after merge `692509f83` of `origin/personal@3c8e49ad5`.
- Triggering finding IDs: delivery `Local Fix`. The 5 tests in "Team open loads each member artifact list with its run state" failed with `ZodError: expected array, received undefined`.
- Classification: `Local Fix`
- Prior authoritative result: IR-001, commit `404ec96da`, CRR-001 Pass.
- Current authoritative result: the fixture is fixed and the merged branch has no new failures.
- Related solution revision IDs: `SR-003`
- Related architecture-review revision IDs: `ARCH-REV-001`
- Related code-review revision IDs: `CRR-001`
- Related API/E2E revision IDs: the API/E2E round in this folder, which is unchanged.
- Related delivery revision IDs: see `delivery-revision-record.md`.
- Why recorded: the base (`task-run-resources-workspace-cleanup`) added a required `closedTaskExecutions` field to the `getTeamRunResumeConfig` payload, parsed at `teamRunContextHydrationService.ts:250`. The new spec mock written in IR-001 lacked it. The base had updated every other mock in that spec the same way.
- Approved behavior or requirement IDs affected: none changed. Test fixture only.
- Implementation delta:
  - `services/runHydration/__tests__/teamRunContextHydrationService.spec.ts`: added `closedTaskExecutions: []` to the Team open artifact mock.
  - No production change.
- Composition check (merged code read):
  - `closedTaskExecutions` is parsed and passed only to `createTeamExecutionViewState`, which decides sidebar and Workspaces visibility.
  - Member locations, `fetchMemberRunState` per member, `memberRunStates`, `commitTeamRunHydration` and `markCommittedTeamRunHydrationAuthority` do not depend on it.
  - The base did not change Org staging (`agentOrgContextHydration`) or its `commit`; base Org changes are in history rows only.
  - So artifacts are still loaded and committed per member runId, and closed-task filtering stays presentation-only.
- Changed files or areas: the one spec above.
- Local validation and result (merged branch with the fix): `pnpm -C autobyteus-web test:nuxt services/runHydration services/runOpen services/agentOrgExecution services/agentCollaboration services/teamExecution stores composables components/workspace --run` gives 20 failed and 1625 passed (192 files).
  - The 20 failures are exactly the pre-existing set delivery listed: `teamTaskApprovalHydration` ×18, `AgentCompactionLiveFlow` ×1, `workspaceSelectionComposition` ×1.
  - All Team, Org and owner artifact tests pass.
- API/E2E browser evidence (AC-001..AC-004): no production code changed in this round. The merged base changes Team sidebar visibility for closed Task runs, which the AC journeys touch only when a selected member belongs to a closed Task. Re-running the browser journeys is advisable but not required by this delta; that call belongs to API/E2E and delivery through the normal route.
- Next recipient or routing: `/code_reviewer` (High-risk Local Fix rule).
- Remaining limitations or risks: unchanged from IR-001.
