# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-run-members-missing-regression/tickets/in-progress/team-run-members-missing-regression/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-run-members-missing-regression/tickets/in-progress/team-run-members-missing-regression/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-run-members-missing-regression/tickets/in-progress/team-run-members-missing-regression/design-spec.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-run-members-missing-regression/tickets/in-progress/team-run-members-missing-regression/design-review-report.md`
- Prior code review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-run-members-missing-regression/tickets/in-progress/team-run-members-missing-regression/review-report.md`
- API/E2E validation report with Local Fix failure: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-run-members-missing-regression/tickets/in-progress/team-run-members-missing-regression/api-e2e-validation-report.md`
- Reproduction screenshot: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-run-members-missing-regression/tickets/in-progress/team-run-members-missing-regression/reproduction-only-solution-designer.png`
- Backend runtime probe summary: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-run-members-missing-regression/tickets/in-progress/team-run-members-missing-regression/runtime-probe-summary.json`
- API/E2E active-run focus control evidence: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-run-members-missing-regression/tickets/in-progress/team-run-members-missing-regression/api-e2e-member-focus-click-evidence.json`
- API/E2E inactive/offline focus failure evidence: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-run-members-missing-regression/tickets/in-progress/team-run-members-missing-regression/api-e2e-offline-member-focus-failure.json`
- API/E2E inactive/offline focus failure screenshot: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-run-members-missing-regression/tickets/in-progress/team-run-members-missing-regression/api-e2e-offline-member-focus-failure.png`

## What Changed

Initial implementation:

- Restored live team roster row construction to use the authoritative structured `AgentTeamContext.memberTree` directly.
- Removed the local active-execution member-tree filter from `runHistoryTeamRows.ts` so live history/tree rows include inactive and unmessaged logical roster members.
- Switched `TeamGridView.vue` and `TeamSpotlightView.vue` from `flattenActiveExecutionMemberNodesForDisplay(...)` to `flattenTeamMemberNodesForDisplay(...)` for roster display inclusion.
- Kept active-execution targeting semantics intact by leaving `teamActiveExecutionMembers.ts` unchanged for composer target fallback, task-agent activity, and running-row/task-agent surfaces.
- Made Grid/Spotlight roster focus explicit via `activeTeamContext.focusedMemberRouteKey` while active-execution getters remained the send/composer target boundary.

API/E2E Local Fix rework:

- Removed active-execution normalization from the run-history team-member selection reuse path. A clicked history-tree roster member now remains the requested visual/historical focus route key.
- Updated run-history team-node projection so live/local context merge uses `teamContext.focusedMemberRouteKey` for roster selected-row highlighting instead of `activeExecutionFocusedMemberRouteKey`.
- Preserved the persisted history row workspace root when a local/hydrated historical team context is merged back into the history tree, preventing a selected historical team from disappearing from its workspace group when the hydrated config lacks a workspace root.
- Updated `TeamWorkspaceView.vue` to display roster focus in the top header while labeling the shared composer with the safe active-execution target.
- Updated `AgentTeamEventMonitor.vue` to display the roster-focused member's Focus history/conversation while active context, composer, interrupt, and send paths continue to resolve through active-execution getters.
- Added durable coverage for inactive/all-offline Software Engineering Team history selection from `solution_designer` to `api_e2e_engineer` and then `delivery_engineer`, including selected-row focus projection.
- Added/updated tests proving Focus display can use roster focus while composer/active context remains on the safe active-execution target.

## Key Files Or Areas

- `autobyteus-web/stores/runHistorySelectionActions.ts`
- `autobyteus-web/stores/runHistoryTeamHelpers.ts`
- `autobyteus-web/stores/runHistoryTeamRows.ts`
- `autobyteus-web/components/workspace/team/TeamWorkspaceView.vue`
- `autobyteus-web/components/workspace/team/AgentTeamEventMonitor.vue`
- `autobyteus-web/components/workspace/team/TeamGridView.vue`
- `autobyteus-web/components/workspace/team/TeamSpotlightView.vue`
- `autobyteus-web/stores/__tests__/runHistoryStore.spec.ts`
- `autobyteus-web/stores/__tests__/activeContextStore.spec.ts`
- `autobyteus-web/components/workspace/team/__tests__/TeamWorkspaceView.spec.ts`
- `autobyteus-web/components/workspace/team/__tests__/AgentTeamEventMonitor.spec.ts`
- `autobyteus-web/components/workspace/history/__tests__/HistoricalTeamLazyHydration.integration.spec.ts`

## Important Assumptions

- Backend `memberTree` remains authoritative for team roster/topology in both active and inactive historical rows.
- History-tree clicks and Focus-pane display are roster/history visual focus operations; they must not be rewritten by active-execution eligibility.
- Composer/send/interrupt active context remains active-execution-owned and can intentionally differ from visual roster focus when a clicked member is inactive, all-offline, or task-agent-only.
- Active-execution filtering is still correct for safe composer/send target fallback and task-agent activity surfaces; it should not be used for roster inclusion or selected-row highlighting.

## Known Risks

- Browser validation against the Electron-started backend must rerun the inactive/all-offline historical rows from API/E2E Round 3.
- The UI now intentionally distinguishes visual Focus/header/history from the shared composer target in grid/spotlight mode; API/E2E should verify this is understandable and that send still targets the active-execution route.
- `TeamWorkspaceView.vue` was already above 220 effective non-empty lines; this rework stayed below the changed-line split threshold and below the hard 500-line guardrail, but future changes should avoid growing it further without extraction.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Bug Fix
- Reviewed root-cause classification: Boundary Or Ownership Issue
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): Refactor Needed Now
- Implementation matched the reviewed assessment (`Yes`/`No`): Yes
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): N/A
- Evidence / notes: The Local Fix confirmed another active-execution boundary leak in history selection and Focus display. The rework keeps roster/history visual focus on roster boundaries while leaving composer/send/interrupt on active-execution boundaries.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes`
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): `Yes`
- Notes: Removed the obsolete `resolveActiveExecutionFocusedMemberRouteKey(...)` dependency from `runHistorySelectionActions.ts` and `runHistoryTeamHelpers.ts`. No flags, team special cases, backend fallback paths, or compatibility wrappers were added.

## Environment Or Dependency Notes

- The dedicated worktree did not have local `node_modules` or `.nuxt` generated files. Focused Vitest checks were run by temporarily using local generated dependency/build folders; those generated folders were removed after checks.
- No backend or GraphQL source changes were made.

## Local Implementation Checks Run

Record only implementation-scoped checks here, such as build, typecheck, unit tests, and narrow integration checks around the changed code.
Do not stand up API/E2E validation environments or treat that work as part of this section.
Do not report API, E2E, or broader executable validation as passed in this artifact.

Initial implementation checks:

- `git diff --check` — passed.
- `NUXT_TEST=true pnpm --dir autobyteus-web exec vitest run stores/__tests__/runHistoryTeamRows.spec.ts components/workspace/team/__tests__/TeamGridView.spec.ts components/workspace/team/__tests__/TeamSpotlightView.spec.ts components/workspace/team/__tests__/TeamWorkspaceView.spec.ts utils/__tests__/teamActiveExecutionMembers.spec.ts stores/__tests__/runHistoryStore.spec.ts` — passed, 6 files / 80 tests.
- `NUXT_TEST=true pnpm --dir autobyteus-web exec vitest run components/workspace/team/__tests__/TeamTaskAgentActivityBar.spec.ts components/workspace/running/__tests__/RunningTeamRow.spec.ts components/workspace/team/__tests__/AgentTeamEventMonitor.spec.ts components/workspace/team/__tests__/TeamMemberMonitorTile.spec.ts` — passed, 4 files / 14 tests.

Local Fix rework checks:

- `NUXT_TEST=true pnpm --dir autobyteus-web exec vitest run stores/__tests__/runHistoryStore.spec.ts stores/__tests__/runHistoryTeamRows.spec.ts components/workspace/team/__tests__/TeamWorkspaceView.spec.ts components/workspace/team/__tests__/AgentTeamEventMonitor.spec.ts stores/__tests__/activeContextStore.spec.ts utils/__tests__/teamActiveExecutionMembers.spec.ts components/workspace/team/__tests__/TeamGridView.spec.ts components/workspace/team/__tests__/TeamSpotlightView.spec.ts components/workspace/team/__tests__/TeamTaskAgentActivityBar.spec.ts components/workspace/running/__tests__/RunningTeamRow.spec.ts components/workspace/team/__tests__/TeamMemberMonitorTile.spec.ts components/workspace/history/__tests__/HistoricalTeamLazyHydration.integration.spec.ts services/runOpen/__tests__/teamRunOpenCoordinator.spec.ts` — passed, 13 files / 107 tests.
- `git diff --check` — passed.

## Downstream Validation Hints / Suggested Scenarios

- Re-run API/E2E Round 3 inactive/all-offline historical rows: `team_software-engineering-team_9d74beaa`, `team_software-engineering-team_fa10eacd`, and `team_software-engineering-team_89989caf`.
- For each inactive row, verify all six roster rows remain visible, clicking `api_e2e_engineer` and `delivery_engineer` moves selected-row highlighting and Focus-pane header/history to the clicked member.
- Verify active/running control row `team_software-engineering-team_b8abf03c` still switches focus to `api_e2e_engineer` and offline `delivery_engineer`.
- Verify shared composer/send/interrupt target still resolves through active-execution getters and does not target stale task-agent-only logical worker rows.
- Verify task-agent activity bar still renders active transient task-agent entities and pending approvals.
- Verify selected historical teams remain under the original workspace group after hydration.

## API / E2E / Executable Validation Still Required

- Browser/API/E2E validation against the Electron-started backend for both the original active-row scenario and the inactive/all-offline historical-row focus scenario remains required.
- Any broader API/E2E validation and validation-environment setup belongs to `api_e2e_engineer` after code review passes again.
