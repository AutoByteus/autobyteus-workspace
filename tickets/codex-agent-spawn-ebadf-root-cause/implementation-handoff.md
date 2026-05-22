# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/design-spec.md`
- Root-cause report: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/root-cause-report.md`
- Design-impact rework artifact: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/design-impact-rework-history-lazy-workspace.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/design-review-report.md`
- Prior code review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/review-report.md`
- Prior API/E2E validation report: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/api-e2e-validation-report.md`
- Delivery docs sync report from prior pass: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/docs-sync-report.md`
- Delivery/release report from prior pass: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/release-deployment-report.md`
- Prior handoff summary: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/handoff-summary.md`
- Delivery round-9 Electron build blocker: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/delivery-blocker-round9-electron-build-localization.md`

## What Changed

Implemented the architecture-review-round-4 lazy workspace-reference rework on top of the existing watcher lifecycle refactor:

- Added a backend `workspaceReference(rootPath:)` GraphQL query that canonicalizes a filesystem root path and returns a deterministic workspace reference without creating or initializing a workspace.
- Added frontend `WorkspaceReference` types and reference utilities; `AgentRunConfig.workspaceId` and `TeamRunConfig.workspaceId` now represent deterministic reference IDs, with `workspaceReference` carrying root/display data and not implying initialization.
- Extended `WorkspaceStore` with a reference cache and explicit activation owner: `resolveWorkspaceReferenceByRootPath()` is cheap, while `ensureWorkspaceInitialized(reference)` is the only UI activation path that calls workspace creation/initialization.
- Updated standalone run hydration so inactive/historical open paths resolve references only; active run recovery may activate explicitly.
- Split team run hydration into live vs historical helpers. Historical team viewing builds member shells and per-member workspace references without calling `workspaceStore.createWorkspace()`, backend `WorkspaceManager.createWorkspace()`, or `FileSystemWorkspace.initialize()` just to display history.
- Updated the historical team/member path through `openTeamMemberRunFromHistory -> openTeamRun -> loadTeamRunContextHydrationPayload -> loadHistoricalTeamRunContextHydrationPayload -> buildHistoricalTeamMemberContextShells` with `primaryWorkspaceReference` and member reference storage.
- Made workspace-dependent UI surfaces reference-aware:
  - `FileExplorer.vue` explicitly activates the requested reference before tree/search/live-session work.
  - `Terminal.vue` explicitly activates the requested reference before terminal connection.
  - context-file path opening, right-side tabs, mobile setup/launch, run config forms, workspace selector, and workspace/mobile layout now use references where workspace identity is needed before initialization.
- Preserved the previous file-explorer watcher lifecycle work: visible file-explorer consumers own live sessions, search remains snapshot-only, backend watcher leases are reference-counted/awaited, close-before-connect cleanup is present, connected send/loop failures clean up sessions/leases, and the real WebSocket lifecycle E2E remains green locally.
- Added/updated focused tests for historical standalone/team reference-only opening, workspace surface activation, config/reference propagation, route/open coordinators, mobile launch/setup, and type fixtures impacted by `workspaceReference`.
- Addressed round-6 code review Local Fix items:
  - `CR-005`: `WorkspaceSelector` is now side-effect-free when disabled/read-only/locked. It does not call `fetchAllWorkspaces()`, auto-select temp workspaces, or emit `select-existing` in display-only mode, while still showing the supplied path/reference metadata.
  - `CR-006`: team launch serialization now carries `workspaceReference.workspaceRootPath`; frontend launch readiness blocks deterministic reference IDs without a usable root path; backend `TeamRunService.createTeamRun()` activates/normalizes from `workspaceRootPath` even when `workspaceId` is present and rejects filesystem reference IDs that arrive without a root path.
  - `CR-007`: frontend workspace-reference root-path cache keys now preserve canonical path case, matching backend deterministic ID semantics on case-sensitive filesystems.
- Addressed round-7 code review Local Fix item:
  - `CR-008`: backend team launch now dedupes workspace activation per distinct canonical workspace root within a single create-team request. Same-root members share one `ensureWorkspaceByRootPath()` activation promise, distinct roots still activate once each, and filesystem reference IDs without root paths remain rejected.
- Addressed delivery round-9 Electron build Local Fix item:
  - Localized the `Terminal.vue` activation retry label that blocked `pnpm audit:localization-literals`. The activation retry button now uses `workspace.components.workspace.tools.Terminal.retry_workspace_load`, with English and zh-CN catalog entries, instead of the hard-coded `Retry workspace load` literal.

## Key Files Or Areas

Backend:

- `autobyteus-server-ts/src/api/graphql/types/workspace.ts`
- `autobyteus-server-ts/src/agent-team-execution/services/team-run-service.ts`

Frontend reference and activation model:

- `autobyteus-web/types/workspace/WorkspaceReference.ts`
- `autobyteus-web/utils/workspaceReference.ts`
- `autobyteus-web/stores/workspaceReferenceActions.ts`
- `autobyteus-web/stores/workspace.ts`
- `autobyteus-web/graphql/queries/workspace_queries.ts`
- `autobyteus-web/types/graphql-tag.d.ts`

Run/team config and hydration:

- `autobyteus-web/types/agent/AgentRunConfig.ts`
- `autobyteus-web/types/agent/TeamRunConfig.ts`
- `autobyteus-web/types/agent/AgentTeamContext.ts`
- `autobyteus-web/services/runHydration/runContextHydrationService.ts`
- `autobyteus-web/services/runHydration/teamRunContextHydrationService.ts`
- `autobyteus-web/services/runHydration/teamRunStatusHydration.ts`
- `autobyteus-web/services/runOpen/agentRunOpenCoordinator.ts`
- `autobyteus-web/services/runOpen/teamRunOpenCoordinator.ts`
- `autobyteus-web/stores/runHistoryLoadActions.ts`
- `autobyteus-web/stores/runHistorySelectionActions.ts`
- `autobyteus-web/stores/runHistoryStore.ts`
- `autobyteus-web/stores/runHistoryTeamHelpers.ts`
- `autobyteus-web/utils/teamRunConfigUtils.ts`
- `autobyteus-web/utils/teamRunMemberConfigBuilder.ts`
- `autobyteus-web/utils/teamRunLaunchReadiness.ts`
- `autobyteus-web/stores/agentTeamRunStore.ts`

Workspace-dependent UI surfaces:

- `autobyteus-web/components/fileExplorer/FileExplorer.vue`
- `autobyteus-web/components/workspace/tools/Terminal.vue`
- `autobyteus-web/localization/messages/en/workspace.ts`
- `autobyteus-web/localization/messages/zh-CN/workspace.ts`
- `autobyteus-web/components/agentInput/ContextFilePathInputArea.vue`
- `autobyteus-web/components/workspace/config/RunConfigPanel.vue`
- `autobyteus-web/components/workspace/config/WorkspaceSelector.vue`
- `autobyteus-web/components/workspace/config/AgentRunConfigForm.vue`
- `autobyteus-web/components/workspace/config/TeamRunConfigForm.vue`
- `autobyteus-web/components/layout/RightSideTabs.vue`
- `autobyteus-web/components/layout/WorkspaceMobileLayout.vue`
- `autobyteus-web/components/mobile/MobileRunSetup.vue`
- `autobyteus-web/composables/mobile/useMobileRunLaunchCoordinator.ts`

Watcher lifecycle helper splits retained from earlier implementation:

- `autobyteus-web/stores/workspaceFileExplorerLiveActions.ts`

## Important Assumptions

- `workspaceId` is now a deterministic reference ID, not proof that a workspace has been initialized.
- Historical run/team display must remain cheap and side-effect-light; only explicit workspace-dependent surfaces/actions activate from a `WorkspaceReference`.
- Read-only/locked config display is intentionally passive and must not fetch workspace lists or auto-select a temp/default workspace.
- Team launch is an explicit workspace-dependent boundary and must carry/activate the canonical root path rather than relying on a reference ID being pre-initialized or mapped.
- Within a single team launch, each distinct canonical workspace root should be activated once and reused for all member configs referencing that root.
- Active run recovery can still initialize because live stream recovery is an active runtime path, not passive history display.
- The Codex app-server client changes from the previous watcher lifecycle implementation remain diagnostic-only on failure paths.
- The durable real WebSocket lifecycle E2E added by API/E2E stays in the repository state and should continue to be reviewed/executed downstream.

## Known Risks

- Full frontend `nuxi typecheck` still fails because of broad existing/baseline project type issues outside the changed files. Final grep of the typecheck log found no errors in changed frontend files and no remaining `workspaceReference` missing-fixture errors.
- The history lazy-workspace behavior is primarily guarded by store/service/component unit tests; downstream API/E2E should still exercise actual UI flows for historical run/team display and then explicit Files/Terminal activation.
- `WorkspaceReference` is a new client-visible shape; generated GraphQL types were not regenerated in this implementation pass. The frontend query uses a local typed result through Apollo.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: refactor/behavior change for lazy historical workspace references on top of the watcher lifecycle refactor.
- Reviewed root-cause classification: boundary/ownership issue; historical display paths were treating workspace IDs as initialized-workspace proof and could trigger filesystem initialization merely to view history.
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): `Refactor Needed Now`.
- Implementation matched the reviewed assessment (`Yes`/`No`): `Yes`.
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): `N/A`; round-4 design was sufficient for implementation.
- Evidence / notes: hydration/opening tests assert reference resolution without `createWorkspace` for historical standalone/team paths; workspace surfaces now activate explicitly via `ensureWorkspaceInitialized(reference)`.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`.
- Legacy old-behavior retained in scope: `No`.
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes` for implementation-owned source/tests.
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`; `WorkspaceReference` is a focused filesystem reference shape and activation state is separate.
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`; helper splits were used to keep owners tight.
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): `Yes`.
- Notes: final source-size guard found no changed source implementation file over 500 effective non-empty lines. Largest changed implementation files: `runHistoryTeamHelpers.ts` 498, `workspace.ts` 490, `teamRunContextHydrationService.ts` 479.

## Environment Or Dependency Notes

- No package dependency changes were made.
- Added `autobyteus-web/types/graphql-tag.d.ts` to provide a local type declaration for the already-used `graphql-tag` dependency so changed query files no longer surface the existing missing-module type error.
- Validation logs for this implementation pass are under `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/`.

## Local Implementation Checks Run

Latest delivery round-9 localization Local Fix checks:

- `pnpm -C autobyteus-web audit:localization-literals`
  - Result: pass, zero unresolved findings.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/frontend-localization-literals-round9-localfix.log`
- `pnpm -C autobyteus-web test:nuxt components/workspace/tools/__tests__/Terminal.spec.ts`
  - Result: pass, 1 file / 2 tests.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/frontend-terminal-spec-round9-localfix.log`
- `git diff --check`
  - Result: pass.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/diff-check-round9-localization-localfix.log`
- Changed-source size guard.
  - Result: pass, no changed source implementation file over 500 effective non-empty lines.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/source-size-guard-round9-localization-localfix.log`
- Frontend/backend full typechecks were not rerun for this narrow localization Local Fix, preserving the API/E2E-recorded baseline-blocker distinction.

Latest round-7 Local Fix checks:

- `pnpm -C autobyteus-server-ts test tests/unit/agent-team-execution/team-run-service.test.ts`
  - Result: pass, 1 file / 11 tests.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/backend-team-run-service-round7-localfix.log`
- `pnpm -C autobyteus-server-ts build:full`
  - Result: pass.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/backend-build-full-round7-localfix.log`
- `git diff --check`
  - Result: pass.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/diff-check-round7-localfix.log`
- Changed-source size guard.
  - Result: pass, no changed source implementation file over 500 effective non-empty lines.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/source-size-guard-round7-localfix.log`

Latest round-6 Local Fix checks:

- `pnpm -C autobyteus-web test:nuxt components/workspace/config/__tests__/WorkspaceSelector.spec.ts components/workspace/config/__tests__/RunConfigPanel.spec.ts components/workspace/config/__tests__/MemberOverrideItem.spec.ts stores/__tests__/agentTeamRunStore.spec.ts stores/__tests__/workspaceReferenceActions.spec.ts stores/__tests__/teamRunConfigStore.spec.ts utils/__tests__/teamRunConfigUtils.spec.ts`
  - Result: pass, 7 files / 69 tests.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/frontend-round6-localfix-tests.log`
- `pnpm -C autobyteus-server-ts test tests/unit/agent-team-execution/team-run-service.test.ts`
  - Result: pass, 1 file / 10 tests.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/backend-team-run-service-round6-localfix.log`
- `pnpm -C autobyteus-server-ts build:full`
  - Result: pass.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/backend-build-full-round6-localfix.log`
- `git diff --check`
  - Result: pass.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/diff-check-round6-localfix.log`
- Changed-source size guard.
  - Result: pass, no changed source implementation file over 500 effective non-empty lines.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/source-size-guard-round6-localfix.log`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm -C autobyteus-web exec nuxi typecheck`
  - Result: fail due existing/baseline project-wide type errors outside this local fix.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/frontend-nuxi-typecheck-round6-localfix.log`
  - Changed-file grep: `changed_file_error_count=0`.
  - Grep log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/frontend-nuxi-typecheck-round6-localfix-changed-file-grep.log`

Earlier implementation checks retained from the round-4 handoff:

- `pnpm -C autobyteus-server-ts build:full`
  - Result: pass.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/backend-build-full-rerun.log`
- `pnpm -C autobyteus-server-ts test tests/e2e/file-explorer/file-explorer-websocket-lifecycle.e2e.test.ts`
  - Result: pass, 1 file / 3 tests. This is a local implementation confidence rerun of the durable API/E2E reproduction, not downstream sign-off.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/backend-file-explorer-websocket-lifecycle-e2e-impl-rerun.log`
- `pnpm -C autobyteus-web test:nuxt stores/__tests__/runHistoryStore.spec.ts`
  - Result: pass, 45 tests.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/frontend-runhistorystore-rerun5.log`
- `pnpm -C autobyteus-web test:nuxt services/runOpen/__tests__/agentRunOpenCoordinator.spec.ts services/runOpen/__tests__/teamRunOpenCoordinator.spec.ts services/runOpen/__tests__/agentRunOpenCoordinator.integration.spec.ts`
  - Result: pass, 7 tests.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/frontend-runopen-rerun2.log`
- `pnpm -C autobyteus-web test:nuxt services/runRecovery/__tests__/activeRunRecoveryCoordinator.spec.ts`
  - Result: pass, 2 tests.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/frontend-runrecovery-rerun3.log`
- `pnpm -C autobyteus-web test:nuxt components/fileExplorer/__tests__/FileExplorer.spec.ts components/workspace/tools/__tests__/Terminal.spec.ts components/layout/__tests__/RightSideTabs.spec.ts components/workspace/config/__tests__/RunConfigPanel.spec.ts components/workspace/config/__tests__/AgentRunConfigForm.spec.ts components/workspace/config/__tests__/TeamRunConfigForm.spec.ts components/workspace/config/__tests__/WorkspaceSelector.spec.ts components/agentInput/__tests__/ContextFilePathInputArea.spec.ts stores/__tests__/workspaceStore.spec.ts services/workspace/__tests__/workspaceNavigationService.spec.ts`
  - Result: pass, 10 files / 72 tests.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/frontend-workspace-surfaces-rerun3.log`
- `pnpm -C autobyteus-web test:nuxt components/mobile/__tests__/MobileContextSelectionRegression.spec.ts components/mobile/__tests__/MobileRemoteAccessShell.spec.ts components/mobile/__tests__/MobileUxRefinement.spec.ts composables/mobile/__tests__/useMobileWorkCatalog.spec.ts`
  - Result: pass, 4 files / 37 tests.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/frontend-mobile-rerun.log`
- `pnpm -C autobyteus-web test:nuxt components/workspace/config/__tests__/MemberOverrideItem.spec.ts`
  - Result: pass, 8 tests.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/frontend-memberoverride-rerun3.log`
- `pnpm -C autobyteus-web test:nuxt utils/__tests__/teamRunConfigUtils.spec.ts services/workspace/__tests__/workspaceNavigationService.spec.ts`
  - Result: pass, 13 tests.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/frontend-config-workspacenav-rerun.log`
- `pnpm -C autobyteus-web test:nuxt types/agent/__tests__/AgentContext.spec.ts types/agent/__tests__/AgentRunConfig.spec.ts`
  - Result: pass, 5 tests.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/frontend-agent-types-rerun.log`
- Final changed-source size guard.
  - Result: pass, no changed source implementation file over 500 effective non-empty lines.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/source-size-guard-final.log`

Attempted / not passing because of existing baseline issues:

- `NODE_OPTIONS=--max-old-space-size=8192 pnpm -C autobyteus-web exec nuxi typecheck`
  - Result: fail due existing/baseline project-wide type errors in unrelated build scripts/components/tests/stores.
  - Final log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/frontend-nuxi-typecheck-final.log`
  - Follow-up grep result: no errors in changed frontend files; no remaining `workspaceReference` missing-fixture errors.
- `pnpm -C autobyteus-server-ts typecheck`
  - Earlier result remains fail due existing `TS6059` rootDir/tests include issue. `build:full` passed against `tsconfig.build.json`.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/backend-typecheck-rerun.log`

## Downstream Validation Hints / Suggested Scenarios

- Historical standalone run: open from history and verify no workspace initialization happens until Files/Terminal/context workspace action is invoked.
- Historical team run/member: open from history through the focused member path and verify per-member references exist but no workspace is created just for display or lazy member hydration.
- Files surface: open Files from a historical selection and verify `ensureWorkspaceInitialized(reference)` happens once, loading/error UI is visible, and live file-explorer session ownership starts only after activation.
- Terminal surface: open Terminal from a historical selection and verify activation is explicit before session connect.
- Mobile: verify setup/launch carries references, mobile Tools still excludes Files, and dedicated mobile Explorer remains the only mobile file-explorer live surface.
- Regression from previous watcher work: repeat collapse/switch/unmount/close-before-connect and real WebSocket lifecycle checks to confirm watcher leases still release promptly.

## API / E2E / Executable Validation Still Required

Code review should run before API/E2E resumes. After re-review, API/E2E should validate the full user flow for historical display without workspace initialization and explicit Files/Terminal activation, plus the existing high-churn watcher lifecycle scenarios.
