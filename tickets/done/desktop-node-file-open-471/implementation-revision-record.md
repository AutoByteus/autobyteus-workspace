# Implementation Revision Record — desktop-node-file-open-471 (autobyteus-471)

The current code and `implementation-handoff.md` remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Solution Designer, `handoff-implementation.md` (SR-002, direct route) | N/A | `Initial Baseline` | SR-002 | Implemented; ready for API/E2E |
| IR-002 | Code Reviewer, `code-review-report.md` CRR-001 (failure-origin of API-REV-001) | CR-001, CR-002, CR-003 (F-1, F-2, F-3) | `Local Fix` | SR-002, CRR-001, API-REV-001 | Fixed; back to API/E2E |

## Revision Entries

### IR-001 — Desktop opens node files; remote-run paths name their node; no phone size limit

- Triggering role, report path, and round: Solution Designer, `tickets/in-progress/desktop-node-file-open-471/handoff-implementation.md`, initial round (direct route, Medium/Low).
- Triggering finding IDs: N/A
- Classification: `Initial Baseline`
- Prior authoritative result: N/A
- Current authoritative result: REQ-001…REQ-004 implemented on `codex/desktop-node-file-open-471` (commits `12ccdcc116`, `e04b875f78`, `a64f407954`, `7917df2a15`, `c686acfaff`, `2e2b9ed436`); implementation-scoped checks in `implementation-handoff.md`.
- Related solution revision IDs: SR-002
- Related architecture-review revision IDs: N/A (direct route)
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline or implementation revision is recorded: the initial implementation handoff.
- Approved behavior or requirement IDs affected: BEH-001, BEH-004, BEH-005; REQ-001…REQ-004; AC-001…AC-005.
- Implementation delta:
  1. `utils/fileExplorer/nodeFileContent.ts` (new): one node-file loader for both clients (URL, fetch with `authorizedFetch`, text or blob, refusal → `not-found` / `folder` / `failed`, message keys, the Files panel's coded error `node-file-preview:<refusal>`). `useMobileNodeFile` uses it.
  2. `stores/fileExplorerContentActions.ts`: one routing rule (`loadRouteOf`): an absolute path is local in the embedded window with the local-file capability and a node file in every other window. `_loadNodeFile` loads it; object URLs are revoked on close, close-all, close-others, deleted-scope close and reload. A file closed mid-load keeps nothing.
  3. `FileExplorerTabs.vue` words the node-file refusals with the 436 messages.
  4. `useEventMonitorFilePreview.ts`: a remote run's path shows `file_on_other_node`; any absolute path outside the run's folder opens as a node file; `file_available_on_host` removed. `mobileFileOpening.ts` / `useMobileAttachmentOpening.ts`: `unavailable` carries `nodeName`. Locales (en, zh-CN) updated.
  5. `MobileFileViewer.vue`: `MOBILE_FILE_VIEW_MAX_CHARS`, `isTooLarge` and the "too large" line removed.
  6. Probes: MSP-37 (desktop window, node files and reasons), MSP-16 (130,000-character Markdown), MSP-29 (node name), and the event-monitor probe's negative check. Docs: `file_explorer.md`, `content_rendering.md`, `remote_access.md`.
- Changed files or areas: `autobyteus-web` only (see the handoff's Key Files).
- Local validation and result: all pass. IMP-01…IMP-05 ran on `7917df2a15` (typecheck at baseline; 750 web spec files; guards; builds); the later commits change only probe files. IMP-06b (phone and desktop probe cases MSP-16, 28–31, 37) and IMP-07 (removed-text grep) ran on `2e2b9ed436`. See `implementation-handoff.md` § Checks Run. The probe also needed the duplicate MSP-32 renumbered to MSP-38 (handoff assumption 6).
- Next recipient or routing: `/software_engineering_team/api_e2e_engineer` (direct route).
- Remaining limitations or risks: the Electron + test-owned Docker node run (AC-001's stated verification) is left to API/E2E. MSP-37 covers the same Files panel path in a non-embedded browser window with the owner credential attached.

### IR-002 — One remote-run file rule for links and attachments; node files always read-only

- Triggering role, report path, and round: Code Reviewer, `tickets/in-progress/desktop-node-file-open-471/code-review-report.md` (CRR-001, failure-origin review of API-REV-001), round 2.
- Triggering finding IDs: CR-001 (F-1), CR-002 (F-2), CR-003 (F-3)
- Classification: `Local Fix`
- Prior authoritative result: IR-001, ready for API/E2E; API-REV-001 Fail (F-1, F-2, F-3)
- Current authoritative result: CR-001…CR-003 fixed in `b0f3d1c42b`; checks in `implementation-handoff.md` § Checks Run (IMP-11…IMP-16).
- Related solution revision IDs: SR-002
- Related architecture-review revision IDs: N/A
- Related code-review revision IDs: CRR-001
- Related API/E2E revision IDs: API-REV-001
- Related delivery revision IDs: N/A
- Why this implementation revision is recorded: the three API/E2E failures had implementation origins. In each, a real caller (the run view, a message's attachment chip) bypassed the rules the specs tested in isolation.
- Approved behavior or requirement IDs affected: REQ-001 (read-only, on the run's node), REQ-003 (links and path attachments, desktop and phone); AC-001, AC-003.
- Implementation delta:
  1. CR-001: `AgentEventMonitor.vue` no longer answers a remote run's link itself (its autobyteus-278 branch and `useRemoteRun` use are removed). It passes its run as `originRunId` to `useEventMonitorFilePreview`. The composable decides first, on desktop and phone, through `remoteRunFileNode(originRunId)`: the conversation's run, not the window's selected target. `remote.filePath` is removed (en, zh-CN); `git grep` finds no other use.
  2. CR-002: `composables/remoteRuns/remoteRunFile.ts` (new) holds the one decision, `remoteRunFileNode(agentRunId)`, used by the link opener, the phone's `openMobileFilePath` and the run view. It also holds the run view's injection (`RUN_VIEW_FILES_KEY`, `useRunViewFiles`). `AgentEventMonitor` provides `refuseRemoteRunPath()`: in a remote run it puts "This file is on <node>, where this run runs." on its existing file status line and answers true. On the desktop, `UserMessage` asks it before opening a path attachment (`kind === 'workspace_path'`) and reads nothing when it answers true. Uploaded and external attachments are unchanged. On the phone, attachments keep `useMobileAttachmentOpening` (same decision through `openMobileFilePath`).
  3. CR-003: `fileExplorerContentActions._openFileWithMode` decides the load route first. A `node-file` route gets a read-only access intent (`{ source: 'node-file', readOnly: true }`) when the caller gave none, on first open and on reopen, so the file is `preview`, `setFileMode('edit')` keeps it in preview, and `updateEditorDraft` refuses. `FilePreviewAccessIntent.source` gains `'node-file'`.
  4. Docs: `docs/file_explorer.md` names both rules.
- Changed files or areas: `components/workspace/agent/AgentEventMonitor.vue`, `components/conversation/UserMessage.vue`, `composables/remoteRuns/remoteRunFile.ts` (new), `composables/useEventMonitorFilePreview.ts`, `composables/mobile/{mobileFileOpening,useMobileAttachmentOpening}.ts`, `stores/fileExplorerContentActions.ts`, `stores/fileExplorerState.ts`, `localization/messages/{en,zh-CN}/remoteRuns.ts`, `docs/file_explorer.md`. Specs:
  - `components/workspace/agent/__tests__/AgentEventMonitor.remoteRunFiles.spec.ts` (new; real run view, feed, user message, renderer and link opener).
  - `stores/__tests__/fileExplorerNodeRouting.spec.ts` (+3 cases), `AgentEventMonitor.spec.ts` (origin run id).
  - The composable, `WorkspaceToolShell` and `RightSideTabs` specs pass the new `originRunId`.
- Local validation and result:
  - The new run-view spec fails 3 of 4 without the fix (desktop link, desktop attachment, phone link) and passes with it.
  - The two store cases without an intent fail without the fix and pass with it.
  - The affected folders pass (299 files, 2644 tests).
  - Full checks: IMP-11…IMP-16 (see the handoff).
- Next recipient or routing: `/software_engineering_team/api_e2e_engineer` (direct route; classification unchanged, Medium / Low).
- Remaining limitations or risks: uploaded and external-URL attachments keep their existing open path in every run. REQ-003 names path attachments; I did not check uploaded attachments of a remote run here.
