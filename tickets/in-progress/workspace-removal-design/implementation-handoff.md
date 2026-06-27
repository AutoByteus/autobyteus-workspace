# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-removal-design/tickets/in-progress/workspace-removal-design/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-removal-design/tickets/in-progress/workspace-removal-design/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-removal-design/tickets/in-progress/workspace-removal-design/design-spec.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-removal-design/tickets/in-progress/workspace-removal-design/design-review-report.md`
- Code review report / Local Fix trigger: `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-removal-design/tickets/in-progress/workspace-removal-design/code-review-report.md`

## What Changed

Implemented the reviewed workspace-removal design as a registry/visibility removal feature.

- Backend workspace registry is now the authoritative source for visible filesystem workspace rows.
- Added a `removeWorkspace(input: { workspaceId })` GraphQL mutation that routes through `WorkspaceManager.removeRegisteredWorkspace`.
- Added workspace-scoped history query support through `workspaceRunHistory(workspaceId, limitPerAgent)`.
- Added active-use blocking for standalone agent runs and team runs, including nested team member workspace roots, using canonical root comparisons.
- Preserved files, run/team history, memories, and artifacts during workspace removal.
- Frontend desktop Workspaces top-level rows now project only registered filesystem workspaces, not arbitrary historical workspace groups.
- Workspace history loads on row expansion via `fetchWorkspaceHistory(workspaceId)` and refreshes only expanded rows.
- Added row-level `Remove from Workspaces` action with confirmation and success/error toasts.
- Added frontend cleanup/pruning after successful removal for workspace metadata, file explorer live state/cache, workspace history cache, and expansion state.
- Kept global/mobile recent-history capability separate from the desktop Workspaces top-level row projection.
- Code Review Round 1 Local Fix CR-001: scoped `fetchWorkspaceHistory` no longer invokes global `reconcileDiscoveredActiveRuns`, so expanding/refreshing one workspace cannot offline or disconnect active contexts in another workspace.
- Code Review Round 1 Local Fix CR-002: pruning a removed workspace history group now also clears the authoritative `AgentSelectionStore` selection when the selected agent run or team run belongs to that removed workspace.

## Key Files Or Areas

Backend:

- Added: `autobyteus-server-ts/src/workspaces/workspace-registry-store.ts`
- Added: `autobyteus-server-ts/src/workspaces/workspace-removal-guard.ts`
- Removed: `autobyteus-server-ts/src/workspaces/workspace-id-mapping-store.ts`
- Modified: `autobyteus-server-ts/src/workspaces/workspace-manager.ts`
- Modified: `autobyteus-server-ts/src/api/graphql/types/workspace.ts`
- Modified: `autobyteus-server-ts/src/api/graphql/types/run-history.ts`
- Modified: `autobyteus-server-ts/src/run-history/services/workspace-run-history-service.ts`
- Modified imports/tests that referenced the old mapping-store path.

Frontend:

- Added: `autobyteus-web/composables/useWorkspaceHistoryWorkspaceRemoval.ts`
- Added: `autobyteus-web/stores/workspaceRemovalActions.ts`
- Added: `autobyteus-web/stores/runHistoryWorkspaceHistoryActions.ts`
- Added: `autobyteus-web/utils/__tests__/runTreeProjection.spec.ts`
- Modified: `autobyteus-web/stores/workspace.ts`
- Modified: `autobyteus-web/stores/runHistoryStore.ts`
- Modified: `autobyteus-web/stores/runHistoryReadModel.ts`
- Modified: `autobyteus-web/utils/runTreeProjection.ts`
- Modified: `autobyteus-web/composables/useWorkspaceHistoryTreeState.ts`
- Modified: `autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue`
- Modified: `autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue`
- Modified GraphQL docs and localization files for the removal workflow.

## Important Assumptions

- `Remove from Workspaces` means unregister/hide the workspace from the app workspace list; it does not delete filesystem contents, run/team history, memories, or artifacts.
- `workspaceRootPath` is the canonical root path field for new code. Existing `absolutePath` is used only as a legacy fallback where existing store payloads still contain it.
- Historical open/restore helpers that call `ensureWorkspaceByRootPath` intentionally re-add/load the workspace root. This is the designed re-add behavior, not silent history-driven desktop row projection.
- Desktop Workspaces rows and mobile/global recent-history are separate flows. The global `listWorkspaceRunHistory` query remains available for global recent-style surfaces, but desktop top-level Workspaces rows no longer use it as their authority.
- Temp and skill workspaces can still appear in the backend visible workspace list for existing consumers; the desktop Workspaces row projection filters to real filesystem workspaces and excludes temp rows.

## Known Risks

- Branch status at updated handoff: `codex/workspace-removal-design` is behind `origin/personal` (last observed: 13 commits). Delivery owns integrated-state refresh against the recorded base branch.
- Full frontend `nuxi typecheck` still fails on existing repo-wide baseline type issues. Relevant changed-area grep showed the existing `HistoricalTeamLazyHydration.integration.spec.ts` `AgentTeamContext.members` errors; no changed production area type error was identified from that pass.
- Generated GraphQL types were not regenerated; the implementation uses local typed GraphQL document interfaces consistent with nearby existing patterns.
- No live browser smoke or API/E2E sign-off was performed by implementation. API/E2E coverage investigation and execution remain required.
- `WorkspaceRemovalGuard` lazily resolves singleton active-run managers in production. Unit tests inject managers; some workspace-manager tests can log unrelated singleton initialization warnings, but the focused checks pass.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Feature plus required refactor.
- Reviewed root-cause classification: Boundary Or Ownership Issue + Missing Invariant.
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): Refactor Needed Now.
- Implementation matched the reviewed assessment (`Yes`/`No`): Yes.
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): N/A.
- Evidence / notes:
  - GraphQL removal goes only through `WorkspaceManager.removeRegisteredWorkspace`; GraphQL does not mutate the registry or guard directly.
  - `WorkspaceRegistryStore` replaces the old `WorkspaceIdMappingStore` mapping helper as the durable registry owner while preserving the JSON `workspaceId -> rootPath` shape.
  - Desktop top-level workspace projection now comes from registered filesystem descriptors in `workspaceStore.allWorkspaces`; history-only and draft-only roots are ignored unless registered.
  - Workspace-scoped history is fetched on expansion by `workspaceId` and resolved through `WorkspaceManager.getRegisteredWorkspaceRootPath` before the history service reads by root.
  - After CR-001, scoped workspace-history fetches update only scoped history cache/loading/error/avatar state and do not reuse the global active-run reconciliation policy.
  - After CR-002, removal-time history pruning clears both run-history-local selected IDs and the authoritative global selected agent/team run when that selected history is in the removed workspace.
  - Active-use blocking covers standalone active agent runs by workspace ID/expected filesystem workspace ID/root resolver, and active team runs by canonical member workspace roots.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`.
- Legacy old-behavior retained in scope: `No`.
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes`.
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`.
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`.
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): `Yes`.
- Notes:
  - Removed `workspace-id-mapping-store.ts` and updated old imports/references; `rg "workspace-id-mapping-store|WorkspaceIdMappingStore|saveWorkspaceIdMapping"` returns no active references.
  - No hidden-root suppression list or frontend-only persistence workaround was added.
  - Desktop mount-time global `fetchTree()` was removed from `WorkspaceAgentRunsTreePanel`; the panel now fetches registered workspaces/definitions on mount and history only for expanded rows.
  - Largest changed source implementation files by non-empty line count remained under 500, including `runHistoryStore.ts` (445), `workspace.ts` (433), `WorkspaceHistoryWorkspaceSection.vue` (375), `useWorkspaceHistoryTreeState.ts` (360), and `WorkspaceAgentRunsTreePanel.vue` (358).

## Environment Or Dependency Notes

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-removal-design`
- Branch: `codex/workspace-removal-design`
- Base/tracking branch: `origin/personal`
- Current branch status at updated handoff: behind `origin/personal` (last observed: 13 commits).
- No dependency or lockfile changes were made.
- `pnpm install --frozen-lockfile`, backend shared prep, and Prisma generation completed successfully during implementation checks.

## Local Implementation Checks Run

Implementation-scoped checks run locally:

- `pnpm install --frozen-lockfile` — passed.
- `pnpm -C autobyteus-server-ts run prepare:shared` — passed.
- `pnpm -C autobyteus-server-ts exec prisma generate --schema ./prisma/schema.prisma` — passed.
- `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit` — passed.
- `pnpm -C autobyteus-server-ts exec vitest run tests/unit/workspaces/filesystem-workspace-id.test.ts tests/unit/workspaces/workspace-manager.test.ts tests/unit/workspaces/workspace-removal-guard.test.ts tests/unit/agent-team-execution/team-run-service.test.ts tests/unit/run-history/services/workspace-run-history-service.test.ts` — passed, 5 files / 30 tests.
- `pnpm -C autobyteus-web exec vitest --run utils/__tests__/runTreeProjection.spec.ts utils/__tests__/runTreeLiveStatusMerge.spec.ts composables/__tests__/useWorkspaceHistoryTreeState.spec.ts` — passed, 3 files / 10 tests. Existing KaTeX quirks warning only.
- `pnpm -C autobyteus-web exec vitest --run components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.regressions.spec.ts` — passed, 2 files / 41 tests. Existing expected stderr from an error-toast test only.
- `pnpm -C autobyteus-web exec vitest --run stores/__tests__/runHistoryStore.spec.ts` — passed, 1 file / 50 tests. Existing KaTeX quirks warning only.
- `pnpm -C autobyteus-web run guard:localization-boundary` — passed.
- `pnpm -C autobyteus-web run audit:localization-literals` — passed with existing non-blocking Node module-type warning.
- `git diff --check` — passed.
- `rg "workspace-id-mapping-store|WorkspaceIdMappingStore|saveWorkspaceIdMapping" -n autobyteus-server-ts autobyteus-web autobyteus-ts --glob '!dist/**' --glob '!node_modules/**'` — passed/no results.
- Local Fix check after CR-001/CR-002: `pnpm -C autobyteus-web exec vitest --run stores/__tests__/runHistoryStore.spec.ts` — passed, 1 file / 53 tests.
- Local Fix focused frontend suite after CR-001/CR-002: `pnpm -C autobyteus-web exec vitest --run utils/__tests__/runTreeProjection.spec.ts composables/__tests__/useWorkspaceHistoryTreeState.spec.ts components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.regressions.spec.ts stores/__tests__/runHistoryStore.spec.ts` — passed, 5 files / 100 tests. Existing KaTeX quirks warnings and expected terminate-error stderr only.
- Local Fix `git diff --check` — passed.
- Local Fix legacy store reference scan — passed/no results.

Attempted but not passed due existing baseline:

- `pnpm -C autobyteus-web exec nuxi typecheck` — failed on existing repo-wide type errors. Changed-area grep showed existing `components/workspace/history/__tests__/HistoricalTeamLazyHydration.integration.spec.ts` `AgentTeamContext.members` errors; no API/E2E or broad typecheck sign-off is claimed here.

## Downstream Coverage Hints / Suggested Scenarios

Suggested focus for code review and API/E2E coverage investigation:

- Backend GraphQL:
  - `workspaces()` returns registered filesystem workspaces from the registry and does not require history to create rows.
  - `removeWorkspace` removes only registry visibility, preserves files/history/memory/artifacts, and returns actionable failure messages.
  - `workspaceRunHistory(workspaceId)` rejects missing/unregistered workspace IDs and returns scoped history for registered workspace roots.
- Persistence/restart:
  - Remove a workspace, restart/reload, confirm it stays absent from the Workspaces section.
  - Re-add/load the same root and confirm the row returns and old history can be revealed on expansion.
- Active-use blocking:
  - Block removal when a standalone active agent run uses the workspace.
  - Block removal when an active team run or nested team member uses the workspace root.
  - Confirm canonical root comparison handles path normalization.
- Frontend UI:
  - Row-level remove action is discoverable on hover/focus/touch-visible states, keyboard accessible, and does not toggle expansion when clicked.
  - Confirmation cancel leaves state unchanged.
  - Confirmation success removes the row, prunes cached children/selection/expansion, clears file explorer workspace state, and shows success copy.
  - Failure/active-run block leaves the row visible and shows an actionable error.
  - Expanded-row loading/error/empty states render correctly for workspace-scoped history fetches.
- Projection boundaries:
  - History-only roots and draft-only roots for unregistered/removed workspaces do not create top-level desktop Workspaces rows.
  - Global/mobile recent-history flow remains separate and still uses the global history query if applicable.
- Historical open/restore:
  - Opening a preserved historical run/team for a removed root should only create a visible Workspaces row if that action intentionally loads/re-adds the workspace.


## Delivery Local Fix Note

During delivery's mandatory latest-base refresh, `git merge --no-edit origin/personal` conflicted in `autobyteus-web/stores/workspace.ts` after checkpoint commit `19828ad2`. The conflict was resolved by keeping the workspace-removal `removeWorkspaceForStore` import and latest-base `resolveTeamConversationTargetAddress` import/usage, removing obsolete `resolveTeamUserMessageTarget` and conflict markers.

Additional artifact: `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-removal-design/tickets/in-progress/workspace-removal-design/implementation-delivery-local-fix.md`.

Delivery-local focused checks after the merge-conflict fix:

- `git diff --check` — passed.
- `pnpm -C autobyteus-web exec vitest --run stores/__tests__/workspaceStore.spec.ts stores/__tests__/runHistoryStore.spec.ts components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.regressions.spec.ts utils/__tests__/teamConversationTargetAddress.spec.ts` — passed, 5 files / 122 tests.

## API / E2E / Executable Coverage Investigation And Execution Still Required

Yes. Implementation completed local unit/build/component/store checks only. API/E2E coverage investigation, durable coverage decisions, realistic execution, and final pass/fail classification remain owned by `api_e2e_engineer` after code review.
