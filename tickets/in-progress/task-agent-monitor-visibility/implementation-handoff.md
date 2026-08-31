# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/in-progress/task-agent-monitor-visibility/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/in-progress/task-agent-monitor-visibility/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/in-progress/task-agent-monitor-visibility/design-spec.md`
- Supplemental task artifacts:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/in-progress/task-agent-monitor-visibility/ui-ux-spec.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/in-progress/task-agent-monitor-visibility/investigation-evidence/live-node-8001/live-selection-comparison.json`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/in-progress/task-agent-monitor-visibility/investigation-evidence/live-node-8001/configured-parent-selected.png`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/in-progress/task-agent-monitor-visibility/investigation-evidence/live-node-8001/task-run-selected.png`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/in-progress/task-agent-monitor-visibility/investigation-evidence/live-node-8001/deterministic-reproduction/deterministic-reproduction-summary.json`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/in-progress/task-agent-monitor-visibility/investigation-evidence/live-node-8001/deterministic-reproduction/reproduce-nested-sibling-task.cjs`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/in-progress/task-agent-monitor-visibility/investigation-evidence/live-node-8001/deterministic-reproduction/student-two-monitor-probe-round3-reproduction.json`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/in-progress/task-agent-monitor-visibility/investigation-evidence/live-node-8001/deterministic-reproduction/student-two-monitor-probe-round3-before-click.png`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/in-progress/task-agent-monitor-visibility/investigation-evidence/live-node-8001/deterministic-reproduction/student-two-monitor-probe-round3-after-click.png`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/in-progress/task-agent-monitor-visibility/investigation-evidence/live-node-8001/deterministic-reproduction/round3-backend-projection.json`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/in-progress/task-agent-monitor-visibility/investigation-evidence/live-node-8001/deterministic-reproduction/round3-backend-topology.json`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/in-progress/task-agent-monitor-visibility/investigation-evidence/live-node-8001/deterministic-reproduction/round2-fresh-open-control.json`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/in-progress/task-agent-monitor-visibility/investigation-evidence/live-node-8001/deterministic-reproduction/round2-fresh-open-control-after-click.png`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/in-progress/task-agent-monitor-visibility/solution-revision-record.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/in-progress/task-agent-monitor-visibility/design-review-report.md`
- Architecture review revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/in-progress/task-agent-monitor-visibility/architecture-review-revision-record.md`
- Triggering rework report, revision record, or evidence, when applicable: `N/A` for this initial implementation baseline. The implementation follows the `ARCH-REV-005` Pass and the `SR-005` design basis; `ARCH-F-006`/`MP-006` were resolved upstream by the deterministic-reproduction artifacts listed above.

## Current Implementation Summary

The frontend now treats retained projection authority as an explicit property, not as a consequence of a task row, mounted context, or activation shell existing. Mounted task inspection single-flights an exact projection request, stages conversation and Activity, validates composite context and revision witnesses, and commits before focus/navigation/outer selection. Fresh Team open resolves the requested exact focus, treats nonfocused projections as best effort, applies an all-or-none Activity batch, and only then mounts/selects/connects. Conflicts and fetch/validation errors keep the previous coherent selection.

Task execution rows and the selected header now show task context plus separate lifecycle and execution status. Loading, retryable failure, and authoritative-empty states are distinct. Focus is derived from `TeamExecutionViewState`, task activation cannot steal focus, snapshot/reconnect invalidates projection authority, and standalone Agent open retains its existing `KEEP_LIVE_CONTEXT` behavior through staged projection commits. Under `IR-002`, incremental task settlement now emits the existing focused-projection reconciliation effect only when focus repair changes the exact AgentRun; the stream dispatcher immediately enters the existing loading/error-capable reconciliation path for the repaired fallback.

- Implementation cycle: `Rework`
- Implementation revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/in-progress/task-agent-monitor-visibility/implementation-revision-record.md`
- Current implementation revision ID: `IR-002`
- Related solution revision IDs: `SR-005`
- Related architecture-review revision IDs: `ARCH-REV-005`
- Related code-review revision IDs: `CRR-001`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: `CR-F-001` / `CR-MP-001`

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | Every current task row and focused surface resolves one exact AgentRun. | `stores/runHistorySelectionActions.ts` branches on mounted root; `services/runOpen/teamMemberInspectionCoordinator.ts` and `services/runHydration/teamMemberProjectionHydrationService.ts` hydrate before `TeamExecutionViewState.focusAgent`; `stores/runHistoryNavigationPatches.ts` rebuilds navigation from the view. | Implemented. Target selection is committed only after exact projection authority succeeds. |
| BEH-002 | Incomplete local task content loads the exact retained projection and exposes loading/error/true-empty states. | `teamMemberProjectionHydrationService.ts` stages and guardedly applies exact content; `stores/runHistoryTeamMemberInspectionActions.ts` owns compound-key attempt state; `TeamMembersPanel.vue`, `AgentTeamEventMonitor.vue`, and `ActivityFeed.vue` render loading, retry, and authoritative-empty presentation. | Implemented. Failure preserves prior selection and exposes retry. |
| BEH-003 | One focused-run invariant governs user selection and structural stream changes without activation focus theft. | `services/teamExecution/teamExecutionViewState.ts`, `TeamStreamingService.ts`, `runHistoryNavigationPatches.ts`, and `workspaceNavigationService.ts`. | Implemented. View focus is authoritative; navigation is derived; activation invalidates the new shell without focusing it; snapshots invalidate authority and reconcile current focus; settlement that repairs focus also reconciles the repaired fallback projection. |
| BEH-004 | Task rows and selected-task header expose non-color-only lifecycle and execution labels and a Task marker. | `services/teamExecution/taskDelegationPresentation.ts`, `teamExecutionViewModels.ts`, `WorkspaceTransientExecutionRow.vue`, `TeamWorkspaceView.vue`, and localized `workspace.ts` catalogs. | Implemented for lifecycle values including active, awaiting review, revision requested, accepted, and interrupted, combined with exact execution status. |
| BEH-005 | Retained/live conversation and Activity render independently of lifecycle state or collaboration-tool choice. | `runProjectionActivityHydration.ts` is a pure adapter; `agentActivityStore.ts` owns revisioned replacement; Team and standalone open/hydration coordinators commit content without lifecycle gating. | Implemented. Ordinary messages and tool content remain visible; no completion inference was added. |
| BEH-006 | Configured parents and same-address task AgentRuns remain distinct by exact run identity. | `teamExecutionTreeSelectors.ts`, `runHistoryTeamExecutionRows.ts`, `teamMemberProjectionHydrationService.ts`, and exact compound identities throughout selection. | Implemented. Browser inspection repeatedly switched between same-address parent/task contexts without content transfer. |
| PB-001 / DS-008 | Preserve standalone active subscribed context while making replaceable projection commits coherent. | `runContextHydrationService.ts` returns a pure staged candidate; `agentRunOpenCoordinator.ts` recomputes strategy after load and keeps live Activity/conversation on `KEEP_LIVE_CONTEXT`, otherwise commits Activity/context/baseline/files before selection/stream. | Preserved and covered by focused unit/integration checks. |

## Key Files Or Areas

- Exact mounted Team-member projection ownership: `autobyteus-web/services/runHydration/teamMemberProjectionHydrationService.ts`, `autobyteus-web/services/runOpen/teamMemberInspectionCoordinator.ts`, and `autobyteus-web/stores/runHistoryTeamMemberInspectionActions.ts`.
- Fresh Team and standalone candidate/commit sequencing: `autobyteus-web/services/runHydration/teamRunContextHydrationService.ts`, `autobyteus-web/services/runHydration/teamRunHydrationCommit.ts`, `autobyteus-web/services/runOpen/teamRunOpenCoordinator.ts`, `autobyteus-web/services/runHydration/runContextHydrationService.ts`, and `autobyteus-web/services/runOpen/agentRunOpenCoordinator.ts`.
- Activity revision/atomic replacement boundary: `autobyteus-web/stores/agentActivityStore.ts` and `autobyteus-web/services/runHydration/runProjectionActivityHydration.ts`.
- Focus/topology/stream convergence: `autobyteus-web/services/teamExecution/teamExecutionViewState.ts`, `autobyteus-web/services/agentStreaming/TeamStreamingService.ts`, and the run-history navigation/selection store modules.
- Task lifecycle presentation and UI: `autobyteus-web/services/teamExecution/taskDelegationPresentation.ts`, Team/history row components, monitor/feed components, and English/Chinese localization catalogs.
- Removed obsolete production path: `autobyteus-web/services/runHydration/teamRunMemberStatusHydration.ts` and the old Activity writer/focus-patch/false-hydration actions.

## Important Assumptions

- The existing exact `GetTeamMemberRunProjection` GraphQL operation and Team stream snapshot/task contracts remain the production authorities.
- Backend lifecycle values remain authoritative; execution state and message text never mutate or infer lifecycle.
- Mounted Team root presence, rather than target-row/context presence, selects the mounted-inspection branch.
- Exact task projection authority is context-bound and is invalidated by context replacement or authoritative snapshot/reconnect changes.

## Known Risks

- Independent API/E2E coverage investigation and execution remain outstanding.
- `autobyteus-web/tests/e2e/fixtures/background-agent-renderer-contention.page.vue` still calls the removed `applyRunNavigationTeamFocus` action. It is repository-resident durable E2E coverage and therefore intentionally left for the API/E2E engineer's required coverage investigation and update/removal decision; any durable edit must return through code review.
- The repository's broad typography audit currently fails on 14 pre-existing fixed-pixel declarations in untouched token-usage components. No task file participates in that failure.
- The standard Nuxt typecheck entrypoint is blocked by the installed `vue-tsc`/TypeScript package-export incompatibility on Node 22. A direct TypeScript fallback still reports broad baseline diagnostics; filtering its output to changed production files reports zero diagnostics.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: frontend bug fix and behavior correction.
- Reviewed root-cause classification: `Boundary Or Ownership Issue`, `Missing Invariant`, and `Shared Structure Looseness`; the primary defect was missing exact retained-projection authority for live-created task shells.
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): `Refactor Needed Now`.
- Implementation matched the reviewed assessment (`Yes`/`No`): `Yes`.
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): `N/A`.
- Evidence / notes: the implementation creates one inspection/hydration authority, derives navigation focus from `TeamExecutionViewState`, makes Activity replacement atomic and revision-guarded, and removes the ambiguous/duplicate production actions rather than layering a compatibility path over them.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes`
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): `Yes`
- Notes: repository-wide production search is empty for `hydrateActivitiesFromProjection`, `teamRunMemberStatusHydration`, `focusTeamMemberAndEnsureHydrated`, and `applyRunNavigationTeamFocus`. The only old focus-action reference is the downstream-owned E2E fixture identified under Known Risks.

## Persisted Data Transition Check (When Applicable)

- Approved decision (`Not Affected`/`Directly Usable — No Migration`/`Discard or Rebuild`/`Migration Required`): `Directly Usable — No Migration`
- Design-spec decision reference: design spec Persisted Data / State Transition Decision; requirements R-009 and AC-007/AC-013/AC-015.
- Implementation follows the approved decision without an unapproved migration or version-specific runtime fallback: `Yes`
- Direct-use evidence or discard/rebuild result, when applicable: existing execution trees, task records, communication history, raw projections, and current DTOs are read as-is by exact identity. Browser validation used retained Docker node-8001 data without rewrite or migration.
- Migration implementation and focused checks, only when `Migration Required`: `N/A`
- Deviation from the reviewed transition decision: `None`

## Environment Or Dependency Notes

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility`
- Branch/base: `codex/task-agent-monitor-visibility`, based on `origin/personal` at `80e2bd195c42ea3ced778dbc051d4d00edaef16f`.
- Local runtime: Node `v22.23.1`, pnpm workspace dependencies already installed.
- The frontend build/tests require generated `@autobyteus/application-sdk-contracts/dist`; it was created with `pnpm --filter @autobyteus/application-sdk-contracts build` for checks and removed afterward as ignored generated output.
- Browser feedback used the project Nuxt dev surface on port 3100, proxied through `BACKEND_NODE_BASE_URL=http://127.0.0.1:8001`; the temporary dev server was stopped.

## Local Implementation Checks Run

- `pnpm --filter @autobyteus/application-sdk-contracts build` — passed.
- `pnpm build` from `autobyteus-web` — passed; Nuxt production static build transformed 3,756 modules and prerendered 15 routes.
- Changed-test selection across 27 spec files — passed, 27 files / 257 tests.
- Follow-up `taskDelegationPresentation.spec.ts` after aligning the mapper to the current `awaiting_review` DTO value — passed, 1 file / 5 tests.
- Full `pnpm test:nuxt --run` — 436 files and 2,432 tests passed, 2 files/tests skipped; one unrelated existing fixed-pixel typography audit failed on 14 declarations in five untouched token-usage files.
- `IR-002` focused settlement/view-stream check — passed, 2 files / 22 tests. The view assertion requires navigation plus focused-projection reconciliation after exact focus repair; the stream assertion requires dispatch to `reconcileFocusedTeamMemberProjection(rootTeamRunId, repairedAgentRunId)`.
- `IR-002` Nuxt production build — passed after the focused correction; 3,756 modules transformed and 15 routes prerendered.
- `IR-002` direct TypeScript fallback — the unchanged repository baseline remains 465 diagnostics; changed-production-file filtering found 0 diagnostics.
- `pnpm exec nuxi typecheck` — could not start diagnostics because `vue-tsc` requests the unexported TypeScript subpath `./lib/tsc` (`ERR_PACKAGE_PATH_NOT_EXPORTED`).
- Fallback `pnpm exec tsc --noEmit -p .nuxt/tsconfig.json --pretty false` — exited with 465 repository-baseline diagnostics; changed-production-file filtering found 0 diagnostics.
- `git diff --check` — passed.
- Frontend-only guard — `git diff --name-only -- autobyteus-server-ts` returned empty.
- Removal/import search — no production references to the four superseded helpers/actions; one E2E fixture reference recorded for downstream coverage ownership.
- Changed production source size check — every changed implementation file is below 500 effective non-empty lines; no changed source delta exceeded the implementation pressure threshold after responsibility splits.

## Frontend Rendered-Result Check (When Applicable)

- Affected surfaces / journeys: already-open Team execution tree; exact task selection; selected task header; center conversation monitor; Activity pane; same-address configured-parent/task comparison; 1024px responsive layout.
- Approved UI/UX, interaction, requirement, or design references: `ui-ux-spec.md` UXJ-001–UXJ-006; requirements BEH-001–BEH-006 and AC-001–AC-015; design spines DS-001–DS-008.
- Existing design system, shared components, and adjacent product surfaces reviewed: stable and transient execution rows, Team member panel/header, Agent/Team event monitors, Activity feed, responsive workspace shell, existing status dot/badge/typography patterns, and English/Chinese catalogs.
- Project development / preview instructions and rendered surface used: Nuxt browser development renderer at `http://127.0.0.1:3100`, backed by Docker node 8001.
- States, layouts, viewports, and interactions inspected: opened retained `Nested Classroom Test Team`; expanded the hierarchy; selected exact task `student_one_8e5ffe4a8dbb479294f7f0cd785b6bbd`; switched to configured same-address parent `student_one_88bc7221b197477388fc88e73874ae07`; reselected the task; inspected 1680x1050 and 1024x768. Each state had exactly one current row. The task rendered 2 conversation items and 5 Activity items, the parent rendered 22/12, and one exact task projection request was observed.
- Visual or interaction issues found and corrected: task identity/status wording, full-description access, false-empty presentation, loading/error/retry ownership, responsive truncation, and current/busy accessibility were implemented and iterated until the desktop and 1024px surfaces remained coherent. The final state showed a visible `Task` marker and `Interrupted · Offline` without losing retained content.
- Supporting evidence and remaining unverified states or limitations:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/in-progress/task-agent-monitor-visibility/implementation-evidence/task-monitor-browser-check.json`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/in-progress/task-agent-monitor-visibility/implementation-evidence/task-selected-desktop.png`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/in-progress/task-agent-monitor-visibility/implementation-evidence/task-selected-1024.png`
  - The initial implementation check used an existing retained interrupted task and did not create a new live task. `IR-002` changes no component, styling, label, or layout code; its settlement-only stream effect was verified at the view/dispatcher boundary rather than by creating a new live formal settlement during implementation. Upstream deterministic evidence establishes the supported live-created defect; downstream API/E2E still owns independent reproduction and broader state coverage.

## Downstream Coverage Hints / Suggested Scenarios

- Re-run the supported live-created nested-task journey on node 8001 and select the task without reload; assert one exact projection request occurs before the target becomes current and retained content is non-empty.
- Force exact projection fetch/validation failure and confirm previous row/header/monitor/Activity remain coherent while the target row shows localized retry state; verify retry succeeds.
- Select configured parent and two same-address task AgentRuns repeatedly; assert each exact conversation/Activity/status/lifecycle remains isolated and exactly one row is current.
- Exercise active+Running, active+Idle, awaiting-review, revision-requested, accepted, and interrupted presentation without gating monitor content or inferring lifecycle from ordinary text.
- Exercise task activation while another member is focused, snapshot/reconnect invalidation, and settlement removal of the current task; assert activation does not steal focus and settlement repair converges all surfaces.
- Exercise fresh Team target validation and Activity-revision conflict; assert no partial mount, focus, selection, config clearing, or stream connection.
- Recheck standalone active subscribed `KEEP_LIVE_CONTEXT` and replaceable history/deep-link opens for replacement-before-selection/stream ordering.
- Investigate and update/remove `tests/e2e/fixtures/background-agent-renderer-contention.page.vue`'s call to the removed focus action before running that durable fixture.

## API / E2E / Executable Coverage Investigation And Execution Still Required

Yes. This handoff reports implementation-scoped unit/build/static/render checks only. The API/E2E engineer must first produce the required coverage investigation, then own durable coverage decisions, environment setup, broader execution, and independent evidence. Any repository-resident durable coverage edit must return through code review before delivery.
