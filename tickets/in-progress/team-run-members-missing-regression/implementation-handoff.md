# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-run-members-missing-regression/tickets/in-progress/team-run-members-missing-regression/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-run-members-missing-regression/tickets/in-progress/team-run-members-missing-regression/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-run-members-missing-regression/tickets/in-progress/team-run-members-missing-regression/design-spec.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-run-members-missing-regression/tickets/in-progress/team-run-members-missing-regression/design-review-report.md`
- Reproduction screenshot: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-run-members-missing-regression/tickets/in-progress/team-run-members-missing-regression/reproduction-only-solution-designer.png`
- Backend runtime probe summary: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-run-members-missing-regression/tickets/in-progress/team-run-members-missing-regression/runtime-probe-summary.json`

## What Changed

- Restored live team roster row construction to use the authoritative structured `AgentTeamContext.memberTree` directly.
- Removed the local active-execution member-tree filter from `runHistoryTeamRows.ts` so live history/tree rows include inactive and unmessaged logical roster members.
- Switched `TeamGridView.vue` and `TeamSpotlightView.vue` from `flattenActiveExecutionMemberNodesForDisplay(...)` to `flattenTeamMemberNodesForDisplay(...)` for roster display inclusion.
- Kept active-execution targeting semantics intact by leaving `teamActiveExecutionMembers.ts` unchanged for composer target fallback, task-agent activity, and running-row/task-agent surfaces.
- Made team workspace roster focus explicit: Grid/Spotlight now receive `activeTeamContext.focusedMemberRouteKey`, while the header, shared composer, and send path continue to use `activeExecutionFocusedMemberRouteKey`.
- Updated regression tests so roster views and live run-history rows prove the full six-member Software Engineering Team roster remains visible even when only `solution_designer` has active context.
- Preserved active-execution/task-agent safety coverage through existing focused active-execution, task-agent activity, running-row, event monitor, and tile preview tests.

## Key Files Or Areas

- `autobyteus-web/stores/runHistoryTeamRows.ts`
- `autobyteus-web/components/workspace/team/TeamGridView.vue`
- `autobyteus-web/components/workspace/team/TeamSpotlightView.vue`
- `autobyteus-web/components/workspace/team/TeamWorkspaceView.vue`
- `autobyteus-web/stores/__tests__/runHistoryTeamRows.spec.ts`
- `autobyteus-web/stores/__tests__/runHistoryStore.spec.ts`
- `autobyteus-web/components/workspace/team/__tests__/TeamGridView.spec.ts`
- `autobyteus-web/components/workspace/team/__tests__/TeamSpotlightView.spec.ts`
- `autobyteus-web/components/workspace/team/__tests__/TeamWorkspaceView.spec.ts`

## Important Assumptions

- The backend `memberTree` remains authoritative for team roster/topology in the reproduced Electron-started backend path.
- Active-execution filtering is still correct for safe composer/send target fallback and task-agent activity surfaces; it should not be used for roster inclusion.
- If transient task-agent instance nodes are present in `memberTree`, roster views will render them according to topology order; task-agent activity continues to use active-execution filtering for the activity-specific UI.

## Known Risks

- Browser validation against the Electron-started backend was not run in this implementation pass; API/E2E should verify the original `/workspace` scenario displays all six members.
- Roster visual focus and composer target can intentionally differ when an inactive/task-only member is selected. The header/composer still show the active-execution target for send safety, while Grid/Spotlight can visually focus the selected roster member.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Bug Fix
- Reviewed root-cause classification: Boundary Or Ownership Issue
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): Refactor Needed Now
- Implementation matched the reviewed assessment (`Yes`/`No`): Yes
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): N/A
- Evidence / notes: The implementation reasserts separate roster/topology and active-execution boundaries. Roster row/view callers now depend on `memberTree` / `flattenTeamMemberNodesForDisplay`; active-execution helpers remain only on safe-target and activity-specific surfaces.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes`
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): `Yes`
- Notes: Removed the now-obsolete local `filterActiveExecutionMemberTree(...)` helper and its `isActiveExecutionMemberNode` import from `runHistoryTeamRows.ts`. No compatibility flags, team special cases, or backend fallback paths were added.

## Environment Or Dependency Notes

- The dedicated worktree did not have local `node_modules` or `.nuxt` generated files. Focused Vitest checks were run by temporarily symlinking the shared checkout's `node_modules` and `.nuxt`; those temporary symlinks and generated `.nuxtrc` were removed after checks.
- No backend or GraphQL source changes were made.

## Local Implementation Checks Run

Record only implementation-scoped checks here, such as build, typecheck, unit tests, and narrow integration checks around the changed code.
Do not stand up API/E2E validation environments or treat that work as part of this section.
Do not report API, E2E, or broader executable validation as passed in this artifact.

- `git diff --check` — passed.
- `NUXT_TEST=true pnpm --dir autobyteus-web exec vitest run stores/__tests__/runHistoryTeamRows.spec.ts components/workspace/team/__tests__/TeamGridView.spec.ts components/workspace/team/__tests__/TeamSpotlightView.spec.ts components/workspace/team/__tests__/TeamWorkspaceView.spec.ts utils/__tests__/teamActiveExecutionMembers.spec.ts stores/__tests__/runHistoryStore.spec.ts` — passed, 6 files / 80 tests.
- `NUXT_TEST=true pnpm --dir autobyteus-web exec vitest run components/workspace/team/__tests__/TeamTaskAgentActivityBar.spec.ts components/workspace/running/__tests__/RunningTeamRow.spec.ts components/workspace/team/__tests__/AgentTeamEventMonitor.spec.ts components/workspace/team/__tests__/TeamMemberMonitorTile.spec.ts` — passed, 4 files / 14 tests.

## Downstream Validation Hints / Suggested Scenarios

- Reproduce the Electron-backend `/workspace` scenario from the investigation and verify the selected Software Engineering Team run displays all six route keys: `solution_designer`, `architecture_reviewer`, `implementation_engineer`, `code_reviewer`, `api_e2e_engineer`, `delivery_engineer`.
- Verify expanded history tree rows for live team contexts list all authoritative `memberTree` members even when only the coordinator has active conversation/status.
- Verify Grid and Spotlight render inactive/unmessaged roster members and preserve recursive subteam ordering.
- Verify composer/header/send targeting still normalizes stale task-agent-only logical members to a safe active-execution target.
- Verify the task-agent activity bar still renders active transient task-agent entities and pending approvals without treating settled task-only logical worker rows as active execution targets.

## API / E2E / Executable Validation Still Required

- Browser/component or E2E validation against an Electron-started backend for the original user path remains required.
- Any broader API/E2E validation and validation-environment setup belongs to `api_e2e_engineer` after code review passes.
