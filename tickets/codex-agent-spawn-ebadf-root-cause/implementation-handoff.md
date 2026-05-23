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
- API/E2E round-6 Terminal FD failure evidence and durable validation: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/api-e2e-validation-report.md`, `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/autobyteus-server-ts/tests/e2e/terminal/terminal-websocket-lifecycle.e2e.test.ts`

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

## Key Files Or Areas

Backend:

- `autobyteus-ts/src/tools/terminal/pty-session.ts`
- `autobyteus-ts/tests/unit/tools/terminal/pty-session.test.ts`
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
- Full API/E2E validation remains downstream-owned after code review.

## Known Risks

- Full frontend/backend typechecks were not rerun for this implementation pass because prior validation recorded baseline blockers. The current implementation evidence uses backend `build:full`, targeted backend runtime tests, frontend Nuxt targeted tests, frontend guards, and static greps.
- The committed `autobyteus-web/generated/graphql.ts` was updated to match the changed workspace operation documents; a full schema-driven codegen pass can be rerun in a validation environment with a live schema endpoint if desired.
- Historical display and explicit activation behavior has targeted unit/integration coverage; downstream API/E2E should still exercise real UI/API flows across history display, Files activation, Terminal activation, and repeated watcher open/close.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: refactor/behavior change for lazy workspace metadata plus file-explorer capability acquisition, continuing the `spawn EBADF` watcher lifecycle fix.
- Reviewed root-cause classification: boundary/ownership issue; metadata/history/runtime paths and file-explorer watcher paths were previously too coupled.
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): `Refactor Needed Now`.
- Implementation matched the reviewed assessment (`Yes`/`No`): `Yes`.
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): `N/A`; round-7 design was sufficient for implementation.
- Evidence / notes: source/tests no longer contain the legacy steady-state concepts listed by architecture review; metadata APIs and file-explorer acquisition paths are split in backend and frontend.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`.
- Legacy old-behavior retained in scope: `No`.
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes`.
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`; metadata and file-explorer capability state are separate.
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`.
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): `Yes`.
- Notes: frontend file-explorer store was split into concern-owned action/state modules to keep the store shell small; final size audit passed with no changed implementation source file over 500 effective non-empty lines.

## Environment Or Dependency Notes

- No dependency/package changes were made.
- Validation logs for this implementation pass are under `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/`.
- The localization audit still emits the existing Node `MODULE_TYPELESS_PACKAGE_JSON` warning for `localization/audit/migrationScopes.ts`; the audit result is pass with zero unresolved findings.

## Local Implementation Checks Run

Implementation-scoped checks only; this is not downstream API/E2E sign-off.

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
- Terminal desktop/mobile: verify Terminal uses metadata/root path for runtime cwd and only activates workspace-dependent behavior at the explicit terminal action boundary; rerun the focused built-backend FD probe to confirm close-before-connect churn does not retain PTY descriptors.
- Context file browser/search/read/write and skill file explorer: verify these remain intended file-explorer acquisition paths.
- WebSocket lifecycle: repeat real close-before-connected and repeated open/close tests to confirm watcher leases release promptly and child-process spawn remains healthy.
- Team launch: verify same-root members activate once, distinct roots activate once each, and filesystem metadata IDs without root paths reject.

## API / E2E / Executable Validation Still Required

Code review should run before API/E2E resumes. After re-review, API/E2E should validate the full integrated behavior for metadata-only history/workspace paths, explicit Files/Terminal/context acquisition, watcher lifecycle stability, and the delivery Electron build path that previously failed at localization audit.
