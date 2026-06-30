# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agents-workspace-tree-ux/tickets/in-progress/task-agents-workspace-tree-ux/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agents-workspace-tree-ux/tickets/in-progress/task-agents-workspace-tree-ux/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agents-workspace-tree-ux/tickets/in-progress/task-agents-workspace-tree-ux/design-spec.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agents-workspace-tree-ux/tickets/in-progress/task-agents-workspace-tree-ux/design-review-report.md`
- UX recommendation: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agents-workspace-tree-ux/tickets/in-progress/task-agents-workspace-tree-ux/ux-recommendation.md`

## What Changed

- Added a pure Workspaces execution display-row adapter at `autobyteus-web/utils/workspaceTeamExecutionDisplayRows.ts`.
  - It composes stable durable rows from `TeamTreeNode.memberTree` / `members` with transient task execution rows derived from live `AgentTeamContext.memberTree`.
  - It preserves live runtime ordering and uses explicit `stable_member` / `transient_execution` discriminants.
  - Transient rows carry render/focus identity and visual metadata only; task body/reference/technical fields are not copied into Workspaces rows.
- Preserved `buildTeamRowsFromContext()` transient filtering as the durable stable-row boundary.
- Wired `WorkspaceAgentRunsTreePanel.vue` / `WorkspaceHistoryWorkspaceSection.vue` to render the new display rows for expanded teams.
  - Stable rows keep the existing solid avatar/normal row treatment.
  - Transient rows render inline through new `WorkspaceTransientExecutionRow.vue` with dashed/dotted circular treatment, ghost background, explicit row-kind data markers, and sr-only/tooltip temporary semantics.
  - Transient row selection uses the existing team member focus path through a minimal `TeamMemberFocusTarget` identity.
  - Live focused route keys are used for row highlighting so transient rows can highlight after being focused.
- Simplified right Team -> Tasks rendering.
  - `TeamActiveTaskNavigator.vue` now renders task summary/detail selection, references, and technical details only.
  - Actor rows, task-team member hierarchy rows, and right-side focus emits were removed.
  - `ActiveTaskEntry.members` and its flattening helper were removed as dead execution-hierarchy read-model data.
- Updated localization for accessible temporary execution text.
- Updated focused unit/component tests around display-row mapping, Workspaces transient row rendering/focus identity, right-side detail-only task UI, run-history selection, and existing stable row filtering.

## Key Files Or Areas

- `autobyteus-web/utils/workspaceTeamExecutionDisplayRows.ts`
- `autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue`
- `autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue`
- `autobyteus-web/components/workspace/history/WorkspaceTransientExecutionRow.vue`
- `autobyteus-web/components/workspace/history/workspaceHistorySectionContracts.ts`
- `autobyteus-web/components/workspace/team/TeamActiveTaskNavigator.vue`
- `autobyteus-web/components/workspace/team/TeamActiveTasksSection.vue`
- `autobyteus-web/components/workspace/team/TeamOverviewPanel.vue`
- `autobyteus-web/utils/teamActiveTaskEntries.ts`
- `autobyteus-web/stores/runHistoryTypes.ts`
- `autobyteus-web/stores/runHistorySelectionActions.ts`
- `autobyteus-web/stores/runHistoryStore.ts`
- `autobyteus-web/composables/useWorkspaceHistorySelectionActions.ts`
- `autobyteus-web/localization/messages/en/workspace.ts`
- `autobyteus-web/localization/messages/zh-CN/workspace.ts`
- Tests added/updated:
  - `autobyteus-web/utils/__tests__/workspaceTeamExecutionDisplayRows.spec.ts`
  - `autobyteus-web/components/workspace/history/__tests__/WorkspaceHistoryWorkspaceSection.spec.ts`
  - `autobyteus-web/components/workspace/team/__tests__/TeamActiveTaskNavigator.spec.ts`
  - `autobyteus-web/components/workspace/team/__tests__/TeamActiveTasksSection.spec.ts`
  - `autobyteus-web/components/workspace/team/__tests__/TeamFocusSendWorkflow.spec.ts`

## Important Assumptions

- Live task-agent/task-team placement in `AgentTeamContext.memberTree` remains authoritative.
- Workspaces transient rows should be focusable by `teamRunId + memberRouteKey`; no durable history DTO is required for the click path.
- Right Team -> Tasks may keep a task selector/list for summaries, references, and technical details, but not actor/member execution hierarchy.
- Documentation sync is still expected downstream; implementation did not update durable docs.

## Known Risks

- Visual contrast for the dashed/ghost treatment was validated by unit/component assertions, not by browser visual review.
- Broad `tsc --noEmit --project tsconfig.json` is not currently a useful full-repo check in this worktree: it exits with existing project-wide `.vue` module-resolution/type issues across many unrelated tests and files. Focused Vitest and guards passed.
- Downstream API/E2E coverage still needs to validate real runtime projection cleanup and click-to-focus behavior against live app state.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Behavior Change / UX Information Architecture Refactor
- Reviewed root-cause classification: Boundary Or Ownership Issue; Legacy Or Compatibility Pressure
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): Refactor Needed Now
- Implementation matched the reviewed assessment (`Yes`/`No`): Yes
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): N/A
- Evidence / notes:
  - Stable durable row construction still filters transient projection nodes.
  - A new pure display-row adapter is the renderer-facing mixed stable/transient boundary.
  - Workspaces renders execution identity/hierarchy/focus rows only.
  - Team Tasks no longer renders actor/member execution hierarchy or emits focus from right-side task rows.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes`
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): `Yes`
- Notes:
  - Removed right-side task actor/member hierarchy rows and `ActiveTaskEntry.members` dead read-model data.
  - Did not restore `TeamActiveTaskContextTree` or raw transient-as-stable row behavior.
  - Largest changed implementation source files remain below 500 effective non-empty lines; largest checked were `runHistoryStore.ts` at 445 and `WorkspaceHistoryWorkspaceSection.vue` at 394.

## Environment Or Dependency Notes

- Ran `pnpm install --frozen-lockfile` in `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agents-workspace-tree-ux` because the worktree did not have dependencies installed.
- Ran `pnpm exec nuxi prepare` in `autobyteus-web` to create `.nuxt/tsconfig.json` before Vitest.
- `node_modules` and `.nuxt` are generated/ignored and not part of the intended source diff.

## Local Implementation Checks Run

- `git diff --check` — passed.
- `pnpm guard:web-boundary` from `autobyteus-web` — passed.
- `pnpm guard:localization-boundary && pnpm audit:localization-literals` from `autobyteus-web` — passed.
- Focused Vitest run — passed: `17` tests across `6` files.
  - Command: `pnpm test:nuxt run utils/__tests__/workspaceTeamExecutionDisplayRows.spec.ts components/workspace/history/__tests__/WorkspaceHistoryWorkspaceSection.spec.ts components/workspace/team/__tests__/TeamActiveTaskNavigator.spec.ts components/workspace/team/__tests__/TeamActiveTasksSection.spec.ts components/workspace/team/__tests__/TeamFocusSendWorkflow.spec.ts stores/__tests__/runHistoryTeamRows.spec.ts`
- Run-history selection regression tests — passed: `57` tests.
  - Command: `pnpm test:nuxt run stores/__tests__/runHistoryStore.spec.ts`
- Workspaces tree panel tests — passed: `49` tests across `2` files.
  - Command: `pnpm test:nuxt run components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.regressions.spec.ts`
- Broad TypeScript check attempted:
  - Command: `pnpm exec tsc --noEmit --project tsconfig.json --pretty false`
  - Result: exits `2` due existing project-wide `.vue` module-resolution/typecheck issues across unrelated files/tests; not treated as implementation sign-off.

## Downstream Coverage Hints / Suggested Scenarios

- With a live task-agent projection, confirm the left Workspaces tree shows a dashed/ghost transient row inline under/near its logical member and clicking it focuses the task agent in the center workspace.
- With a live task-team projection, confirm the left Workspaces tree shows the task-team root near the structural team and scoped child projection rows beneath it.
- Confirm transient Workspaces rows disappear when runtime projection cleanup removes backing nodes.
- Confirm Workspaces tree never renders task body, references, raw task arguments, technical details, or approval controls.
- Confirm right Team -> Tasks shows task summary/body/references/technical details and no actor/member execution hierarchy rows.

## API / E2E / Executable Coverage Investigation And Execution Still Required

Required. Implementation-scoped unit/component checks passed, but API/E2E coverage investigation and execution still need to validate the live projection lifecycle, real click-to-focus path, cleanup disappearance, and integrated left/right UX split.
