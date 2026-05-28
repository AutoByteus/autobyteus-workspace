# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/design-spec.md`
- Root-cause report: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/root-cause-report.md`
- Same-ticket design-impact rework artifact: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/design-impact-rework-history-lazy-workspace.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/design-review-report.md`
- Prior/current code review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/review-report.md`
- Prior API/E2E validation report: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/api-e2e-validation-report.md`
- Prior delivery docs sync report: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/docs-sync-report.md`
- Prior delivery/release report: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/release-deployment-report.md`
- Prior handoff summary: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/handoff-summary.md`
- Prior delivery blocker artifact: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/delivery-blocker-round9-electron-build-localization.md`
- Latest-base merge-conflict delivery blocker artifact: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/delivery-blocker-round13-latest-personal-merge-conflicts.md`
- Round-18 latest-base merge-conflict delivery blocker artifact: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/delivery-blocker-round18-latest-personal-merge-conflict.md`
- Round-19 latest-base merge-conflict delivery blocker artifact: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/delivery-blocker-round19-latest-personal-merge-conflicts.md`
- Round-20 latest-base merge-conflict delivery blocker artifact: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/delivery-blocker-round20-latest-personal-merge-conflicts.md`
- API/E2E round-6 Terminal FD failure evidence and durable validation: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/api-e2e-validation-report.md`, `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/autobyteus-server-ts/tests/e2e/terminal/terminal-websocket-lifecycle.e2e.test.ts`
- API/E2E round-9 Terminal descriptor failure analysis: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/terminal-server-e2e-failure-analysis-20260524.md`
- API/E2E round-9 Terminal descriptor evidence: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round9-terminal-server-connect-timing-v2-20260524.json`, `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round9-terminal-server-connect-timing-v2-20260524-final-lsof.log`, `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round9-terminal-server-connect-failure-20260524.json`

## What Changed

Implemented the architecture-review-round-7 steady-state target:

- Backend now has a tight `WorkspaceMetadata` shape in `autobyteus-server-ts/src/workspaces/workspace-metadata.ts` and GraphQL exposes `WorkspaceMetadata` for workspace list/create/metadata resolution.
- `WorkspaceManager.createWorkspace()` remains the top-level product API, but it is metadata-only: creating/listing/resolving workspaces no longer builds a file tree or starts a watcher.
- `FileSystemWorkspace` is now metadata plus an optional lazy `WorkspaceFileExplorer`; `acquireFileExplorer(reason)` is the explicit acquisition boundary.
- Replaced the old `BaseFileExplorer`/`LocalFileExplorer` hierarchy with one internal `WorkspaceFileExplorer` capability boundary for tree/search/operations/watcher leases.
- File-explorer GraphQL resolvers, search, mutations, and WebSocket streaming explicitly acquire/release `WorkspaceFileExplorer`; non-file-explorer paths remain metadata/root-path only.
- Preserved the prior watcher lifecycle fixes: reference-counted watcher leases, awaited close, close-before-connect cleanup, connected send/loop failure cleanup, snapshot search split from live monitoring, and real WebSocket lifecycle coverage.
- Frontend workspace state is split into metadata (`WorkspaceMetadata`) and separate file-explorer state (`fileExplorerState` plus action modules). Workspace list/create/historical display/config/sidebars/Terminal runtime cwd/resume/rerun stay metadata/root-path only.
- Visible Files surfaces and file actions explicitly own file-explorer loading/live-session behavior. Desktop collapsed right panel and mobile tools do not keep hidden Files content/live consumers; mobile dedicated explorer remains the live mobile file surface.
- Historical standalone/team open/hydration paths use `workspaceMetadata` and do not activate workspaces merely to display history. Workspace-dependent UI/actions activate explicitly and own loading/error UI.
- Team launch preserves the explicit activation boundary: member config serialization carries `workspaceRootPath`, backend launch rejects filesystem metadata IDs without a root path, and same-root members dedupe activation once per create-team request.
- Removed steady-state legacy concepts from implementation source/tests: `WorkspaceReference`, `workspaceReference`, `WorkspaceActivation`, `ensureWorkspaceInitialized`, `BaseFileExplorer`, `LocalFileExplorer`, old direct `getFileExplorer()`/`workspace.searchFiles()` call sites.
- Updated committed frontend GraphQL operation types/documents to match the `WorkspaceMetadata` API/query documents.
- Kept the earlier delivery localization fix: `Terminal.vue` no longer has the hard-coded `Retry workspace load` literal; localization audit passes.
- Round-10 local fix: Terminal now uses an explicit root-path `TerminalTarget`; `useTerminalSession` opens `/ws/terminal/{sessionId}?cwd=...` instead of workspace-id/materialized-workspace URLs, and `Terminal.vue` no longer calls workspace activation before connecting.
- Round-10 local fix: backend Terminal WebSocket validates/canonicalizes cwd directly, has route-level close/error/close-before-connect cleanup, disconnects late sessions if close wins the connect race, and terminal handler/PTY manager clean up partially created sessions and send/read-loop failures.
- Round-10/13 local fix: mobile Files activates from metadata/root path only when the visible Files surface opens, uses the file-explorer store/composable, and owns/releases visible live-session ownership. After merging latest `origin/personal`, the mobile Tools/Terminal/VNC surface remains deleted per the latest mobile shell architecture; interactive Terminal is desktop/workspace-tool only for mobile Phone Access.
- Round-12 local fix for `E2E-TERMFD-001`: terminal close-before-connect now aborts pending startup through an `AbortSignal`, exposes in-flight sessions to `PtySessionManager.closeSession()` so cleanup can close them before `start()` resolves, suppresses expected startup-abort error handling, and hardens `autobyteus-ts` `PtySession.close()` to destroy node-pty socket/write-stream resources, dispose listeners, resolve pending reads, and reject startup if close wins.
- Round-13 delivery local fix: integrated latest `origin/personal@74218467a2f7786c82f3e97b9190058d2cb83bd2`, resolved mobile/terminal/test/docs merge conflicts, preserved the Round-12/7 Terminal FD lifecycle fixes, kept latest-base deletion of `MobileTools.vue`, and reconciled `autobyteus-web/docs/terminal.md` to describe root-path desktop Terminal plus no mobile Phone Access Terminal/VNC page.
- Round-14 user-prompted run API coverage fix: rechecked GraphQL/run-history/run-service integration coverage, found `agent-run-service.integration.test.ts` still wired the legacy `historyIndexService` mock instead of the current `historyCatalogService` prepared/start/terminate boundary, updated that durable integration test to exercise the current run-history catalog lifecycle, and reran the focused GraphQL/run integration subset successfully.
- Round-15 CR-011 local fix: removed the remaining stale negative-test `historyIndexService`, `recordRunCreated`, and `recordRunRestored` setup blocks from `agent-run-service.integration.test.ts`; all test setups now use the current `historyCatalogService` harness where a history dependency is supplied.
- Round-16 `E2E-TERMFD-002` local fix: added a descriptor-safe Darwin `IsolatedPtySession` backend in `autobyteus-ts` that runs `node-pty` inside a short-lived helper child process and bridges data over pipes/IPC. The server process no longer owns `node-pty` PTY master/slave descriptors for macOS Terminal WebSocket sessions; normal command-output close terminates the helper, shell, read loop, streams, IPC, and pending reads.
- Round-16 Terminal tests/evidence update: `getDefaultSessionFactory()` selects `IsolatedPtySession` on Darwin, keeps `PtySession` for non-Darwin Unix, and falls back from the isolated backend to `PtySession`/`DirectShellSession` for tool-session startup fallback. The durable Terminal E2E waits for actual cwd output instead of matching the echoed command literal.
- Round-17 CR-012 local fix: `IsolatedPtySession.start()` now reuses the existing `ensureNodePtySpawnHelperExecutable()` bootstrap invariant before spawning the isolated bridge child, so the Darwin isolated backend repairs a non-executable `node-pty` `spawn-helper` just like the in-process `PtySession` path. It also rechecks closed state after the awaited bootstrap step to avoid spawning a late bridge if close wins during helper repair.
- Round-17 CR-012 regression coverage: added a real integration test that temporarily removes execute bits from the installed `node-pty` `spawn-helper`, starts an `IsolatedPtySession`, verifies helper permission repair and real command output, and restores the original mode in `finally`; unit coverage also asserts bootstrap-before-spawn and no bridge spawn after close-during-bootstrap.
- Round-18 delivery latest-base local fix: integrated latest `origin/personal@03d7880b45afd2b032de6e842e41429fad0a2cb0` after API/E2E Round 10 and code review Round 17 passed. Resolved the `MobileRemoteAccessShell.spec.ts` merge conflict by preserving the ticket-side mobile work-picking/post-pair checks and the latest-base mobile safe-container QR session replacement plus 401 authorized-catalog session-drop coverage. The Round 17 Terminal FD lifecycle implementation files were not changed by the merge resolution.
- Round-19 delivery latest-base local fix: integrated latest `origin/personal@56c6d4bfa27ced68678e4d21dccd4acbcb31aa76` (`v1.3.31`) for the user's 2026-05-28 Electron rebuild request. Resolved conflicts in `MobileRunSetup.vue`, `MobileContextSelectionRegression.spec.ts`, `MobileRemoteAccessShell.spec.ts`, and `MobileUxRefinement.spec.ts` by preserving ticket-side metadata/root-path Files and Terminal lifecycle expectations while adopting latest-base mobile artifacts tab, run setup parity, launch workspace picker, and auto-approve run options behavior.
- Round-20 delivery latest-base local fix: integrated latest `origin/personal@832b6f7cdbf77166576ff69c36803fd4125ff090` (`v1.3.32`) for the user's 2026-05-28 latest-base Electron rebuild request. Resolved conflicts in `MobileFiles.vue`, `MobileRemoteAccessShell.spec.ts`, and `useMobileFileContextCoordinator.ts` by preserving the ticket-side metadata/root-path file-explorer activation and visible live-session ownership while adopting latest-base mobile file/reference controls (`MobileFileViewer`, `MobileTeamReferenceViewer`, protected read-only file previews, mobile attachment rows, and v1.3.32 version artifacts). `useMobileWorkspaceFileExplorer.ts` was reconciled to the ticket architecture: it delegates through `useWorkspaceFileExplorer`, resolves/ensures workspace metadata by root path at visible Files activation, owns mobile folder/search/open-file state, and does not depend on legacy `WorkspaceInfo.fileExplorer` or `workspaceStore.allWorkspaces`. Round 17 Terminal FD lifecycle files were not modified by this merge resolution; focused terminal backend tests still pass.

## Key Files Or Areas

Backend:

- `autobyteus-ts/src/tools/terminal/pty-session.ts`
- `autobyteus-ts/src/tools/terminal/isolated-pty-session.ts`
- `autobyteus-ts/src/tools/terminal/isolated-pty-bridge-source.ts`
- `autobyteus-ts/src/tools/terminal/session-factory.ts`
- `autobyteus-ts/tests/unit/tools/terminal/pty-session.test.ts`
- `autobyteus-ts/tests/unit/tools/terminal/isolated-pty-session.test.ts`
- `autobyteus-ts/tests/integration/tools/terminal/isolated-pty-session.test.ts`
- `autobyteus-ts/tests/unit/tools/terminal/session-factory.test.ts`
- `autobyteus-server-ts/src/workspaces/workspace-metadata.ts`
- `autobyteus-server-ts/src/workspaces/filesystem-workspace.ts`
- `autobyteus-server-ts/src/workspaces/workspace-manager.ts`
- `autobyteus-server-ts/src/file-explorer/file-explorer.ts`
- `autobyteus-server-ts/src/file-explorer/file-name-indexer.ts`
- `autobyteus-server-ts/src/file-explorer/watcher/file-system-watcher.ts`
- `autobyteus-server-ts/src/api/graphql/types/workspace.ts`
- `autobyteus-server-ts/src/api/graphql/types/file-explorer.ts`
- `autobyteus-server-ts/src/api/graphql/converters/workspace-converter.ts`
- `autobyteus-server-ts/src/services/file-explorer-streaming/file-explorer-session.ts`
- `autobyteus-server-ts/src/services/file-explorer-streaming/file-explorer-session-manager.ts`
- `autobyteus-server-ts/src/services/file-explorer-streaming/file-explorer-stream-handler.ts`
- `autobyteus-server-ts/src/agent-team-execution/services/team-run-service.ts`
- `autobyteus-server-ts/src/api/websocket/terminal.ts`
- `autobyteus-server-ts/src/services/terminal-streaming/terminal-handler.ts`
- `autobyteus-server-ts/src/services/terminal-streaming/pty-session-manager.ts`

Frontend:

- `autobyteus-web/types/workspace/WorkspaceMetadata.ts`
- `autobyteus-web/utils/workspaceMetadata.ts`
- `autobyteus-web/stores/workspace.ts`
- `autobyteus-web/stores/workspaceMetadataActions.ts`
- `autobyteus-web/stores/fileExplorer.ts`
- `autobyteus-web/stores/fileExplorerState.ts`
- `autobyteus-web/stores/fileExplorerContentActions.ts`
- `autobyteus-web/stores/fileExplorerTreeActions.ts`
- `autobyteus-web/stores/fileExplorerMutationActions.ts`
- `autobyteus-web/stores/fileExplorerSearchActions.ts`
- `autobyteus-web/composables/useWorkspaceFileExplorer.ts`
- `autobyteus-web/types/terminal/TerminalTarget.ts`
- `autobyteus-web/utils/terminalTarget.ts`
- `autobyteus-web/composables/useTerminalSession.ts`
- `autobyteus-web/components/fileExplorer/FileExplorer.vue`
- `autobyteus-web/components/workspace/tools/Terminal.vue`
- `autobyteus-web/components/mobile/MobileFiles.vue`
- `autobyteus-web/components/mobile/MobileFileViewer.vue`
- `autobyteus-web/components/mobile/MobileTeamReferenceViewer.vue`
- `autobyteus-web/composables/mobile/useMobileWorkspaceFileExplorer.ts`
- `autobyteus-web/composables/mobile/useMobileFileContextCoordinator.ts`
- `autobyteus-web/components/mobile/__tests__/MobileFiles.spec.ts`
- `autobyteus-web/components/mobile/__tests__/MobileFileViewer.spec.ts`
- `autobyteus-web/components/mobile/__tests__/MobileTeamMessages.spec.ts`
- `autobyteus-web/components/mobile/MobileRunSetup.vue`
- `autobyteus-web/components/mobile/__tests__/MobileRemoteAccessShell.spec.ts`
- `autobyteus-web/components/mobile/__tests__/MobileContextSelectionRegression.spec.ts`
- `autobyteus-web/components/mobile/__tests__/MobileUxRefinement.spec.ts`
- `autobyteus-web/components/workspace/config/*`
- `autobyteus-web/services/runHydration/*`
- `autobyteus-web/services/runOpen/*`
- `autobyteus-web/stores/runHistory*`
- `autobyteus-web/types/agent/AgentRunConfig.ts`
- `autobyteus-web/types/agent/TeamRunConfig.ts`
- `autobyteus-web/generated/graphql.ts`
- `autobyteus-web/docs/file_explorer.md`
- `autobyteus-web/docs/terminal.md`

Removed obsolete source/test paths:

- `autobyteus-server-ts/src/file-explorer/base-file-explorer.ts`
- `autobyteus-server-ts/src/file-explorer/local-file-explorer.ts`
- `autobyteus-web/components/mobile/MobileTools.vue`
- `autobyteus-web/types/workspace/WorkspaceReference.ts`
- `autobyteus-web/utils/workspaceReference.ts`
- `autobyteus-web/stores/workspaceReferenceActions.ts`

## Important Assumptions

- `AgentRunConfig.workspaceId` and `TeamRunConfig.workspaceId` are deterministic metadata IDs, not initialized-workspace proof.
- History/team history, runtime cwd, resume/rerun, sidebars, and workspace list/create must stay metadata/root-path only.
- Files, skill file explorer, context file browser/search/read/write, and file-explorer WebSocket are the intended file-explorer acquisition paths.
- Search can acquire a `WorkspaceFileExplorer` for snapshot indexing but must not acquire or retain a live watcher unless a watcher lease is explicitly requested.
- Team launch is an explicit workspace-dependent boundary, so it may activate filesystem workspaces from canonical root paths.
- On Darwin/macOS, Terminal WebSocket sessions use an isolated helper-process PTY backend so the backend server process does not retain `node-pty` `/dev/ptmx` or `(revoked)` descriptors after normal command-output close. The helper still owns real `node-pty` interactive PTY semantics while it is alive.
- The isolated Darwin PTY path must continue to reuse the shared `node-pty` bootstrap owner for `spawn-helper` executable-bit repair before any bridge/helper spawn.
- Full API/E2E validation remains downstream-owned after code review.

## Known Risks

- Full frontend/backend typechecks were not rerun for this implementation pass because prior validation recorded baseline blockers. The current implementation evidence uses backend `build:full`, targeted backend runtime tests, frontend Nuxt targeted tests, frontend guards, and static greps.
- The committed `autobyteus-web/generated/graphql.ts` was updated to match the changed workspace operation documents; a full schema-driven codegen pass can be rerun in a validation environment with a live schema endpoint if desired.
- Historical display and explicit activation behavior has targeted unit/integration coverage; downstream API/E2E should still exercise real UI/API flows across history display, Files activation, Terminal activation, and repeated watcher open/close.
- The isolated PTY backend intentionally changes macOS Terminal backend placement from in-process `node-pty` to helper-process `node-pty`; code review/API-E2E should verify interactive Terminal semantics alongside descriptor cleanup.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: refactor/behavior change for lazy workspace metadata plus file-explorer capability acquisition, continuing the `spawn EBADF` watcher lifecycle fix and the Round-9 Terminal descriptor lifecycle local fix.
- Reviewed root-cause classification: boundary/ownership issue for workspace/file-explorer coupling; local low-level Terminal backend descriptor ownership issue for `E2E-TERMFD-002`.
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): `Refactor Needed Now`.
- Implementation matched the reviewed assessment (`Yes`/`No`): `Yes`.
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): `N/A`; round-7 design was sufficient for implementation.
- Evidence / notes: source/tests no longer contain the legacy steady-state concepts listed by architecture review; metadata APIs and file-explorer acquisition paths are split in backend and frontend. Round-17 built-backend probe returned from baseline `36` FDs to final `32` FDs, with `0` children and no `/dev/ptmx`/`(revoked)` descriptors in final `lsof` after normal command-output churn; the new integration test forced `spawn-helper` non-executable and restored it after successful isolated PTY startup/output.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`.
- Legacy old-behavior retained in scope: `No`.
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes`.
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`; metadata and file-explorer capability state are separate.
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`.
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): `Yes`.
- Notes: frontend file-explorer store was split into concern-owned action/state modules to keep the store shell small. Round-17 Terminal backend code keeps parent session lifecycle split from bridge source; final size audit passed with no changed implementation source file over 500 effective non-empty lines (`isolated-pty-session.ts` 319 effective non-empty lines, bridge source 89).

## Environment Or Dependency Notes

- No implementation-owned dependency changes were made. The latest-base merge carries upstream v1.3.32 version/package/release-manifest updates that delivery requested for the Electron rebuild.
- Validation logs for this implementation pass are under `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/`.
- The localization audit still emits the existing Node `MODULE_TYPELESS_PACKAGE_JSON` warning for `localization/audit/migrationScopes.ts`; the audit result is pass with zero unresolved findings.

## Local Implementation Checks Run

Implementation-scoped checks only; this is not downstream API/E2E sign-off.

Round-20 delivery latest-base merge-conflict local-fix checks:

- `pnpm -C autobyteus-web test:nuxt run components/mobile/__tests__/MobileFiles.spec.ts components/mobile/__tests__/MobileFileViewer.spec.ts components/mobile/__tests__/MobileRemoteAccessShell.spec.ts components/mobile/__tests__/MobileUxRefinement.spec.ts components/mobile/__tests__/MobileContextSelectionRegression.spec.ts components/mobile/__tests__/MobileArtifacts.spec.ts components/mobile/__tests__/MobileArtifactsContentViewerIntegration.spec.ts components/mobile/__tests__/MobileTeamMessages.spec.ts composables/mobile/__tests__/useMobileFileContextCoordinator.spec.ts composables/mobile/__tests__/useMobileFocusedRunIdentity.spec.ts composables/mobile/__tests__/useMobileLaunchWorkspaces.spec.ts stores/__tests__/mobileWorkStore.spec.ts`
  - Result: pass, 12 files / 71 tests.
  - Covers the Round-20 conflicted mobile Files/file-reference shell plus prior mobile UX/context regression surfaces and latest-base team-reference rows.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round20-frontend-mobile-file-reference-tests-20260528.log`
- `pnpm -C autobyteus-web guard:web-boundary`
  - Result: pass.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round20-frontend-web-boundary-20260528.log`
- `pnpm -C autobyteus-web guard:localization-boundary`
  - Result: pass.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round20-frontend-localization-boundary-20260528.log`
- `pnpm -C autobyteus-web audit:localization-literals`
  - Result: pass, zero unresolved findings.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round20-frontend-localization-audit-20260528.log`
- `pnpm -C autobyteus-ts exec vitest run tests/unit/tools/terminal/session-factory.test.ts tests/unit/tools/terminal/isolated-pty-session.test.ts tests/unit/tools/terminal/node-pty-bootstrap.test.ts tests/integration/tools/terminal/isolated-pty-session.test.ts`
  - Result: pass, 4 files / 18 tests.
  - Confirms the latest-base integration did not disturb isolated PTY spawn-helper repair, Darwin backend selection, or isolated-session command-output coverage.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round20-autobyteus-ts-terminal-focused-20260528.log`
- `git diff --check` and `git diff --cached --check`
  - Result: pass.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round20-diff-check-20260528.log`
- Changed-source size audit for touched frontend implementation files.
  - Result: pass; no changed source implementation file exceeds 500 effective non-empty lines (`MobileFiles.vue` 318, `useMobileWorkspaceFileExplorer.ts` 295).
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round20-source-size-20260528.log`

Round-19 delivery latest-base merge-conflict local-fix checks:

- `pnpm -C autobyteus-web test:nuxt run components/mobile/__tests__/MobileContextSelectionRegression.spec.ts components/mobile/__tests__/MobileRemoteAccessShell.spec.ts components/mobile/__tests__/MobileUxRefinement.spec.ts components/mobile/__tests__/MobileArtifacts.spec.ts components/mobile/__tests__/MobileArtifactsContentViewerIntegration.spec.ts composables/mobile/__tests__/useMobileFocusedRunIdentity.spec.ts composables/mobile/__tests__/useMobileLaunchWorkspaces.spec.ts stores/__tests__/mobileWorkStore.spec.ts`
  - Result: pass, 8 files / 57 tests.
  - Covers all conflicted mobile tests plus latest-base mobile artifacts/run-setup composables and store behavior.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round19-frontend-mobile-conflict-tests-20260528.log`
- `pnpm -C autobyteus-web audit:localization-literals`
  - Result: pass, zero unresolved findings.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round19-frontend-localization-audit-20260528.log`
- `pnpm -C autobyteus-ts exec vitest run tests/unit/tools/terminal/session-factory.test.ts tests/unit/tools/terminal/isolated-pty-session.test.ts tests/unit/tools/terminal/pty-session.test.ts tests/integration/tools/terminal/isolated-pty-session.test.ts`
  - Result: pass, 4 files / 27 tests.
  - Confirms latest-base integration did not disturb the isolated PTY spawn-helper and Terminal backend selection coverage.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round19-autobyteus-ts-terminal-unit-integration-20260528.log`
- `pnpm -C autobyteus-server-ts test tests/e2e/terminal/terminal-websocket-lifecycle.e2e.test.ts`
  - Result: pass, 1 file / 3 tests.
  - Confirms root-path Terminal WebSocket lifecycle and close-before-connect cleanup coverage still passes after latest-base integration.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round19-server-terminal-e2e-20260528.log`
- Source/test/ticket-artifact scoped diff check for the resolved mobile files, ticket handoff/blocker artifact, and Round-19 evidence logs.
  - Result: pass.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round19-source-test-diff-check-20260528.log`

Round-18 delivery latest-base merge-conflict local-fix checks:

- `pnpm -C autobyteus-web test:nuxt run components/mobile/__tests__/MobileRemoteAccessShell.spec.ts`
  - Result: pass, 1 file / 15 tests.
  - Covers the resolved mobile shell test set: ticket-side mobile work selection/post-pair behavior plus latest-base safe-container QR session replacement and 401 authorized-catalog session-drop behavior.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round18-frontend-mobile-remote-access-shell-20260524.log`
- `pnpm -C autobyteus-ts exec vitest run tests/unit/tools/terminal/session-factory.test.ts tests/unit/tools/terminal/isolated-pty-session.test.ts tests/unit/tools/terminal/pty-session.test.ts tests/integration/tools/terminal/isolated-pty-session.test.ts`
  - Result: pass, 4 files / 27 tests.
  - Confirms latest-base integration did not disturb the Round 17 isolated PTY spawn-helper and Terminal backend selection coverage.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round18-autobyteus-ts-terminal-unit-integration-20260524.log`
- `pnpm -C autobyteus-server-ts test tests/e2e/terminal/terminal-websocket-lifecycle.e2e.test.ts`
  - Result: pass, 1 file / 3 tests.
  - Confirms latest-base integration did not disturb root-path Terminal WebSocket lifecycle and close-before-connect cleanup coverage.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round18-server-terminal-e2e-20260524.log`
- Source/docs scoped diff check for the resolved file, ticket handoff/blocker artifact, and Round-18 evidence logs.
  - Result: pass.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round18-source-doc-diff-check-20260524.log`

Round-17 CR-012 isolated PTY spawn-helper bootstrap local-fix checks:

- `pnpm -C autobyteus-ts exec vitest run tests/unit/tools/terminal/session-factory.test.ts tests/unit/tools/terminal/isolated-pty-session.test.ts tests/unit/tools/terminal/pty-session.test.ts tests/integration/tools/terminal/isolated-pty-session.test.ts`
  - Result: pass, 4 files / 27 tests.
  - Covers Darwin backend selection/fallback ordering, isolated PTY bridge startup/write/resize/read/close semantics, existing `PtySession` cleanup behavior, bootstrap-before-spawn ordering, close-during-bootstrap no-spawn cleanup, and real `spawn-helper` chmod repair with original mode restoration.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round17-autobyteus-ts-terminal-unit-integration-20260524.log`
- `pnpm -C autobyteus-server-ts test tests/e2e/terminal/terminal-websocket-lifecycle.e2e.test.ts`
  - Result: pass, 1 file / 3 tests.
  - Covers root-path Terminal cwd, unavailable-cwd rejection before session creation, close-before-connect/repeated churn cleanup, and real Terminal output.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round17-server-terminal-e2e-20260524.log`
- `pnpm -C autobyteus-server-ts build:full`
  - Result: pass.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round17-backend-build-full-20260524.log`
- Focused built-backend macOS Terminal descriptor/timing probe copied from the Round-9 API/E2E failure harness.
  - Command: `node tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round17-terminal-server-connect-timing-v2-20260524.mjs`
  - Result: pass; baseline after health `36` FDs, after 8 normal real command-output sessions `32` FDs, after 25 early-close sessions `32` FDs, final after abort-before-open churn `32` FDs, final child count `0`, and final `lsof` contains no `/dev/ptmx` or `(revoked)` descriptors.
  - Probe script: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round17-terminal-server-connect-timing-v2-20260524.mjs`
  - Probe JSON: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round17-terminal-server-connect-timing-v2-20260524.json`
  - Probe run log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round17-terminal-server-connect-timing-v2-20260524.run.log`
  - Final lsof: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round17-terminal-server-connect-timing-v2-20260524-final-lsof.log`
  - Server log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round17-terminal-server-connect-timing-v2-20260524-server.log`
- `git diff --check`
  - Result: pass.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round17-source-doc-diff-check-20260524.log`
- Changed implementation source size audit.
  - Result: pass; changed round-17 implementation source files are all <= 500 effective non-empty lines (`isolated-pty-session.ts` 319 effective non-empty lines, bridge source 89).
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round17-source-size-20260524.log`

Round-16 `E2E-TERMFD-002` normal Terminal command-output descriptor local-fix checks:

- `pnpm -C autobyteus-ts exec vitest run tests/unit/tools/terminal/session-factory.test.ts tests/unit/tools/terminal/isolated-pty-session.test.ts tests/unit/tools/terminal/pty-session.test.ts`
  - Result: pass, 3 files / 25 tests.
  - Covers Darwin backend selection, fallback ordering, isolated PTY child-process startup/write/resize/read/close semantics, stream destruction on normal child exit, pending-read flush, idempotent close, and existing in-process `PtySession` cleanup behavior.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round16-autobyteus-ts-terminal-unit-20260524.log`
- `pnpm -C autobyteus-server-ts test tests/e2e/terminal/terminal-websocket-lifecycle.e2e.test.ts`
  - Result: pass, 1 file / 3 tests.
  - Covers root-path Terminal cwd, unavailable-cwd rejection before session creation, close-before-connect/repeated churn cleanup, and the durable output assertion now waits for actual cwd output instead of the echoed command literal.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round16-server-terminal-e2e-20260524.log`
- `pnpm -C autobyteus-server-ts build:full`
  - Result: pass.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round16-backend-build-full-20260524.log`
- Focused built-backend macOS Terminal descriptor/timing probe copied from the Round-9 API/E2E failure harness.
  - Command: `node tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round16-terminal-server-connect-timing-v2-20260524.mjs`
  - Result: pass; baseline after health `36` FDs, after 8 normal real command-output sessions `32` FDs, final after early-close/abort churn `32` FDs, final child count `0`, and final `lsof` contains no `/dev/ptmx` or `(revoked)` descriptors.
  - Probe script: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round16-terminal-server-connect-timing-v2-20260524.mjs`
  - Probe JSON: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round16-terminal-server-connect-timing-v2-20260524.json`
  - Probe run log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round16-terminal-server-connect-timing-v2-20260524.run.log`
  - Final lsof: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round16-terminal-server-connect-timing-v2-20260524-final-lsof.log`
  - Server log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round16-terminal-server-connect-timing-v2-20260524-server.log`
- `git diff --check`
  - Result: pass.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round16-diff-check-20260524.log`
- Changed implementation source size audit.
  - Result: pass; changed round-16 implementation source files are all <= 500 effective non-empty lines (`isolated-pty-session.ts` 313 effective non-empty lines, bridge source 89).
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round16-source-size-20260524.log`

Round-13 latest-base merge-conflict integration checks:

- `git diff --check HEAD -- autobyteus-web autobyteus-server-ts autobyteus-android autobyteus-message-gateway docs scripts .github README.md`
  - Result: pass.
  - Scope note: source/docs scoped because the merge brings upstream `tickets/done/**` validation logs from `origin/personal`; those upstream archived logs are not source/docs and were not edited for this ticket.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round13-diff-check-20260523.log`
- `git diff --check origin/personal...HEAD -- autobyteus-web autobyteus-server-ts autobyteus-ts autobyteus-android autobyteus-message-gateway docs scripts .github README.md`
  - Result: pass after committing the latest-base merge.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round13-post-merge-source-docs-diff-check-20260523.log`
- `pnpm -C autobyteus-web test:nuxt run components/mobile/__tests__/MobileContextSelectionRegression.spec.ts components/mobile/__tests__/MobileRemoteAccessShell.spec.ts components/mobile/__tests__/MobileUxRefinement.spec.ts components/workspace/tools/__tests__/Terminal.spec.ts composables/__tests__/useTerminalSession.spec.ts`
  - Result: pass, 5 files / 48 tests.
  - Covers the merged mobile shell with no `MobileTools.vue`, mobile Files metadata/file-explorer/live-session ownership, cwd-based Terminal frontend session behavior, and Terminal component root-path target behavior.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round13-frontend-mobile-terminal-tests-20260523.log`
- `pnpm -C autobyteus-server-ts test tests/unit/services/terminal/pty-session-manager.test.ts tests/unit/services/terminal/terminal-handler.test.ts tests/integration/terminal/terminal-websocket.integration.test.ts tests/e2e/terminal/terminal-websocket-lifecycle.e2e.test.ts`
  - Result: pass, 4 files / 26 tests.
  - Covers the preserved backend Terminal FD lifecycle behavior after latest-base integration: close-before-connect churn, invalid cwd rejection, partial setup cleanup, and real PTY close/release.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round13-backend-terminal-targeted-20260523.log`
- `pnpm -C autobyteus-web audit:localization-literals`
  - Result: pass, zero unresolved findings.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round13-frontend-localization-audit-20260523.log`

Round-14 run GraphQL/API-layer and run-service integration checks:

- `pnpm -C autobyteus-server-ts test tests/unit/api/graphql/types/agent-run.test.ts tests/unit/api/graphql/types/agent-team-run.test.ts tests/e2e/workspaces/workspace-run-history-graphql.e2e.test.ts tests/e2e/workspaces/archive-run-history-graphql.e2e.test.ts tests/e2e/run-history/run-projection-toolcalls-graphql.e2e.test.ts tests/integration/agent-execution/agent-run-service.integration.test.ts tests/integration/agent-team-execution/team-run-service.integration.test.ts`
  - Initial result: failed because `agent-run-service.integration.test.ts` still used a stale legacy `historyIndexService` dependency shape and therefore did not exercise the current prepared-run/history-catalog lifecycle correctly.
  - Fix: updated the durable integration test to use an in-memory `historyCatalogService`/metadata harness matching the current `recordPreparedRun -> recordRunStarted -> recordRunTerminated` boundary.
  - Final result: pass, 7 files / 36 tests.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round14-run-graphql-integration-tests-20260523.log`
- `git diff --check -- autobyteus-server-ts/tests/integration/agent-execution/agent-run-service.integration.test.ts tickets/codex-agent-spawn-ebadf-root-cause/implementation-handoff.md`
  - Result: pass.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round14-diff-check-20260523.log`

Round-15 CR-011 local-fix checks:

- `rg -n "historyIndexService|recordRunCreated|recordRunRestored" autobyteus-server-ts/tests/integration/agent-execution/agent-run-service.integration.test.ts`
  - Result: pass; no stale legacy run-history mock references remain.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round15-legacy-run-history-grep-20260523.log`
- `pnpm -C autobyteus-server-ts test tests/unit/api/graphql/types/agent-run.test.ts tests/unit/api/graphql/types/agent-team-run.test.ts tests/e2e/workspaces/workspace-run-history-graphql.e2e.test.ts tests/e2e/workspaces/archive-run-history-graphql.e2e.test.ts tests/e2e/run-history/run-projection-toolcalls-graphql.e2e.test.ts tests/integration/agent-execution/agent-run-service.integration.test.ts tests/integration/agent-team-execution/team-run-service.integration.test.ts`
  - Result: pass, 7 files / 36 tests.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round15-run-graphql-integration-tests-20260523.log`
- `git diff --check -- autobyteus-server-ts/tests/integration/agent-execution/agent-run-service.integration.test.ts tickets/codex-agent-spawn-ebadf-root-cause/implementation-handoff.md`
  - Result: pass.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round15-diff-check-20260523.log`

Round-12 local-fix checks for `E2E-TERMFD-001`:

- `pnpm -C autobyteus-ts exec vitest --run tests/unit/tools/terminal/pty-session.test.ts`
  - Result: pass, 1 file / 12 tests.
  - Covers idempotent PTY close, node-pty resource destruction/listener disposal, and close-during-startup rejection/cleanup.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round12-autobyteus-ts-pty-session-unit-20260523.log`
- `pnpm -C autobyteus-server-ts test tests/unit/services/terminal/pty-session-manager.test.ts tests/unit/services/terminal/terminal-handler.test.ts tests/integration/terminal/terminal-websocket.integration.test.ts tests/e2e/terminal/terminal-websocket-lifecycle.e2e.test.ts`
  - Result: pass, 4 files / 26 tests.
  - Covers in-flight session close during startup, Terminal handler startup-abort behavior, cwd-based WebSocket integration, invalid cwd rejection, real PTY close/release, and repeated close-before-connect churn.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round12-backend-terminal-targeted-20260523.log`
- `pnpm -C autobyteus-server-ts build:full`
  - Result: pass.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round12-backend-build-full-20260523.log`
- Focused built-backend macOS Terminal FD probe copied from API/E2E failure harness.
  - Command: `node tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round12-terminal-fd-probe-20260523.mjs`
  - Result: pass; baseline `36` FDs, normal attached close `38` FDs, final after 25 close-before-connect cycles `39` FDs with `0` child processes. This removes the previous linear growth to `111` FDs.
  - Probe script: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round12-terminal-fd-probe-20260523.mjs`
  - Probe log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round12-terminal-fd-probe-20260523.log`
  - Probe JSON: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round12-terminal-fd-probe-20260523.json`
  - Final lsof: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round12-terminal-fd-probe-20260523-final-lsof.log`
  - Server log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round12-terminal-fd-probe-20260523-server.log`
- `git diff --check`
  - Result: pass.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round12-diff-check-20260523.log`
- Changed implementation source size audit for the round-12 Terminal lifecycle files.
  - Result: pass; changed round-12 implementation files are all <= 500 effective non-empty lines.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round12-source-size-audit-20260523.log`

Round-10 local-fix checks:

- `git diff --check`
  - Result: pass.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round10-diff-check-20260523.log`
- Focused Terminal/mobile boundary grep.
  - Result: pass; no old terminal workspace-id route/materialized-workspace lookup, no Terminal component workspace activation, and no Mobile Files `.fileExplorer`/`allWorkspaces`/workspace-id Terminal prop path. Positive grep confirms root-path `TerminalTarget`, `useWorkspaceFileExplorer`, and mobile visible live-session ownership.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round10-boundary-grep-20260523.log`
- Legacy steady-state concept grep after round-10 changes.
  - Result: pass; no `WorkspaceReference`, `workspaceReference`, `WorkspaceActivation`, `ensureWorkspaceInitialized`, `WorkspaceInfo.fileExplorer`, `BaseFileExplorer`, `LocalFileExplorer`, direct `getFileExplorer()`, or direct `workspace.searchFiles()` matches in backend/frontend source/test scope.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round10-legacy-name-grep-20260523.log`
- Changed implementation source size audit.
  - Result: pass; changed implementation source files in the round-10 area are all <= 500 effective non-empty lines.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round10-source-size-audit-20260523.log`
- `pnpm -C autobyteus-server-ts test tests/unit/services/terminal/pty-session-manager.test.ts tests/unit/services/terminal/terminal-handler.test.ts tests/integration/terminal/terminal-websocket.integration.test.ts`
  - Result: pass, 3 files / 22 tests.
  - Covers terminal unit behavior plus cwd-based Terminal WebSocket, invalid cwd rejection, close-while-connect-pending cleanup, and partial PTY setup cleanup.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round10-backend-terminal-unit-integration-tests-20260523.log`
- `pnpm -C autobyteus-server-ts build:full`
  - Result: pass.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round10-backend-build-full-20260523.log`
- `pnpm -C autobyteus-web test:nuxt composables/__tests__/useTerminalSession.spec.ts components/workspace/tools/__tests__/Terminal.spec.ts components/mobile/__tests__/MobileUxRefinement.spec.ts components/mobile/__tests__/MobileContextSelectionRegression.spec.ts components/mobile/__tests__/MobileRemoteAccessShell.spec.ts`
  - Result: pass, 5 files / 47 tests.
  - Covers cwd terminal URL, no Terminal workspace activation, then-current Mobile Tools root-path targets with empty workspace store, Mobile Files metadata activation/file-explorer store/live-session ownership, and mobile static boundary guards. Round-13 latest-base integration superseded the Mobile Tools surface by keeping it deleted.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round10-frontend-terminal-mobile-tests-20260523.log`
- `pnpm -C autobyteus-web audit:localization-literals`
  - Result: pass, zero unresolved findings.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round10-frontend-localization-audit-20260523.log`
- `pnpm -C autobyteus-web guard:web-boundary && pnpm -C autobyteus-web guard:localization-boundary`
  - Result: pass.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round10-frontend-boundary-guards-20260523.log`

Prior round-7 implementation checks retained as upstream confidence evidence:

- `git diff --check`
  - Result: pass.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round7-diff-check-20260523.log`
- Legacy steady-state concept grep across backend source/tests and frontend source/tests/generated docs scope.
  - Result: pass; no `WorkspaceReference`, `workspaceReference`, `WorkspaceActivation`, `ensureWorkspaceInitialized`, `WorkspaceInfo.fileExplorer`, `BaseFileExplorer`, `LocalFileExplorer`, old explorer module names, direct `getFileExplorer()`, direct `workspace.searchFiles()`, or old reference-backed naming found.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round7-legacy-name-grep-20260523.log`
- Changed implementation source size audit.
  - Result: pass; no changed implementation source file over 500 effective non-empty lines.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round7-source-size-audit-20260523.log`
- `pnpm -C autobyteus-server-ts build:full`
  - Result: pass.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round7-backend-build-full-20260523.log`
- `pnpm -C autobyteus-server-ts test` with targeted workspace/file-explorer/team-run suite.
  - Result: pass, 12 files / 71 tests.
  - Covered unit, integration, and the existing real file-explorer WebSocket lifecycle E2E as local implementation confidence.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round7-backend-targeted-tests-20260523.log`
- `pnpm -C autobyteus-web test:nuxt` with targeted workspace metadata/file-explorer/config/history/mobile suite.
  - Result: pass, 21 files / 166 tests.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round7-frontend-targeted-tests-20260523.log`
- `pnpm -C autobyteus-web guard:web-boundary && pnpm -C autobyteus-web guard:localization-boundary`
  - Result: pass.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round7-frontend-boundary-guards-20260523.log`
- `pnpm -C autobyteus-web audit:localization-literals`
  - Result: pass, zero unresolved findings.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/implementation-round7-frontend-localization-audit-20260523.log`

## Downstream Validation Hints / Suggested Scenarios

- Historical standalone run display: verify no backend workspace creation/file-explorer acquisition until an explicit workspace-dependent action is invoked.
- Historical team run/member display: verify team/member metadata is shown without workspace initialization, including per-member workspace metadata.
- Files desktop/mobile: verify first visible file-explorer surface acquires file-explorer capability and live watcher, and close/collapse/unmount releases live watcher ownership.
- Terminal desktop/mobile: verify Terminal uses metadata/root path for runtime cwd and only activates workspace-dependent behavior at the explicit terminal action boundary; rerun the focused built-backend FD probe to confirm normal command-output churn and close-before-connect churn do not retain server-owned PTY/revoked descriptors.
- Context file browser/search/read/write and skill file explorer: verify these remain intended file-explorer acquisition paths.
- WebSocket lifecycle: repeat real close-before-connected and repeated open/close tests to confirm watcher leases release promptly and child-process spawn remains healthy.
- Team launch: verify same-root members activate once, distinct roots activate once each, and filesystem metadata IDs without root paths reject.

## API / E2E / Executable Validation Still Required

Code review should run before API/E2E resumes. After re-review, API/E2E should validate the full integrated behavior for metadata-only history/workspace paths, explicit Files/Terminal/context acquisition, watcher lifecycle stability, the macOS built-backend Terminal descriptor probe for `E2E-TERMFD-002`, and the delivery Electron build path that previously failed at localization audit.
