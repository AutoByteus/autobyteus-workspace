# Investigation Notes — autobyteus-450

## Investigation Meta

- Package identifier: `conversation-file-open-450` (Project Task `autobyteus-450`, two bugs at the user's word)
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-file-open-450`
- Repository mode: `Git`; branch `codex/conversation-file-open-450`
- Resolved base: `origin/personal` at `6884309283` (v1.5.13-beta.1), fetched 2026-11-09; finalization target `origin/personal`
- Bootstrap result: worktree created; install, server `prebuild` + `build`, `nuxt prepare`, `build:mobile-web` passed.
- Bootstrap blocker: None
- Current solution revision ID: `SR-002` (requirements unchanged since SR-001)
- Authorities read (requirements gate; read in this conversation): `references/requirements-engineering.md`, `references/finding-the-cause.md`, `references/ticket-scope.md`, `references/handoff.md`, `TESTING.md`, `AGENTS.md`
- Investigation status: both bugs reproduced; causes established.

## Initial Request And Clarifications

- BUG 1: on the phone, tapping an attached image (a context-file chip) in a conversation shows the Android app's "Pair this phone again: The node rejected the current mobile credential", though the phone is paired. The desktop works. This is a regression in v1.5.12.
- BUG 2: a file link opened again after the agent rewrote the file shows the OLD content. The user has seen it "for a very long time".
- The PM relayed the user's words (2026-11-09): bug 2 is probably a general bug, so test the desktop first and say which surfaces are affected.
- Constraints: no new Android permission; no weaker key rules for file routes (no credential in URLs, no query-string tokens, no cookies); the phone keeps reading what its key allows (436: any file by path, read-only); no stored-data change; isolated nodes and test files only; DESIGN.md and TESTING.md; release only on the user's word.
- Privacy: screenshots 44–47 show the user's real post and paths. Not copied into evidence.

## Source Log

| Date | Source Type | Exact Source / Command | Why | Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-11-09 | User | Screenshots 42, 43 | What he saw | The chips show **names, not thumbnails** (a thumbnail falls back to a name when its image fails to load); the tap leads to the app's full-screen "Pair this phone again" | — |
| 2026-11-09 | Code | `autobyteus-web/components/conversation/UserMessage.vue:36-70, 113-160` | Chip render and tap | Thumbnail = plain `<img :src="previewUrl">`; `@error` marks it failed → name chip. Tap → `contextAttachmentPresentation.openAttachment` | — |
| 2026-11-09 | Code | `autobyteus-web/utils/contextFiles/contextAttachmentPresentation.ts:112-197` | Open logic | Image with a preview and a workspace id → `openFilePreview`; a failed preview (`failedKeys`) or non-image → **`window.open(url, '_blank')`** of the node URL | — |
| 2026-11-09 | Code | `autobyteus-android/.../web/AutoByteusWebView.kt:52, 105-145` | Android handling | `setSupportMultipleWindows(false)`: `window.open` navigates the **main frame**; `onReceivedHttpError` maps a main-frame 401 to `ConnectionDiagnosticMapper.fromHttpStatus(401)` = "Pair this phone again" (`ConnectionDiagnosticMapper.kt:60-65`) | — |
| 2026-11-09 | Code | `autobyteus-android/.../web/TrustedNavigationPolicy.kt` (`isAllowedAutoByteusPath`) and `TrustedNavigationPolicyTest.kt:13-26` | Navigation allowlist | Main-frame navigations to same-origin `/rest/…` and `/graphql` are allowed in the WebView. Since autobyteus-437 a page navigation cannot carry the phone's key (the phone sends it as a header from script), so such a navigation always gets 401. Nothing loads the WebView's main frame with `/rest/` on purpose (node reachability uses its own HTTP client, `NodeReachability.kt`) | Design |
| 2026-11-09 | Code | `autobyteus-web/composables/useAuthorizedObjectUrl.ts`, used by `MarkdownRenderer.vue`, `MediaSegment.vue`, file viewers | How the phone shows node images elsewhere | Fetch with the credential → blob URL. `UserMessage.vue` does not use it | Design |
| 2026-11-09 | Code | `autobyteus-web/composables/useEventMonitorFilePreview.ts:48-75`, `components/workspace/agent/AgentEventMonitor.vue:87, 107`, `composables/mobile/useMobileNavigation.ts:99`, `composables/mobile/useMobileNodeFile.ts:43-78` | How the phone opens a conversation's file link (427, 436) | On the phone, file links go to the phone's Files screen (`openFile` workspace / `openNodeFile` path), loaded with `authorizedFetch`. Context-file chips do not use this path | Design |
| 2026-11-09 | Code | `autobyteus-web/stores/fileExplorerContentActions.ts:60-104` (`_openFileWithMode`) | Why old content shows | Opening a path that is **already in `openFiles`** only switches to it (`existingFile` branch); nothing reloads its content. Used by the desktop's link click and Files tree, and by the phone's workspace-file viewer (`useMobileWorkspaceFileExplorer.ts:216-221`) | Design |
| 2026-11-09 | Code | `autobyteus-web/stores/fileExplorerTreeActions.ts:75-96`, `fileExplorerContentActions.ts:280-287` | Live refresh | The live file feed reloads an open file only on a `modify` event for a node **already in the loaded tree**, and only **Text** files (`invalidateFileContent`). A file in an unexpanded folder, an agent's atomic rewrite (delete+add) or an image/PDF is not refreshed | FU |
| 2026-11-09 | Code | `autobyteus-web/stores/fileExplorerContentActions.ts:242-268` | Text read | `GetFileContent` with `fetchPolicy: 'network-only'`: a fresh open reads current text | — |
| 2026-11-09 | Code | `autobyteus-server-ts/src/api/rest/workspaces.ts:39, 86`, `files.ts:41` | HTTP cache? | File routes stream with no `Cache-Control`, `ETag` or `Last-Modified`: no browser cache hit expected | — |
| 2026-11-09 | Code | `autobyteus-web/composables/mobile/useMobileWorkspaceFileExplorer.ts` (no `closeFile`), `components/mobile` (grep `closeFile`: none) | Phone lifetime | The phone never closes a file in the store: an opened workspace file stays at its first content until the page reloads | — |
| 2026-11-09 | Command | `node evidence/repro/file-open-repro.mjs --output-dir=evidence/repro-run-1` | Reproduce | See below | — |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Trigger | Current Path | Current Outcome | Evidence | Confidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Phone: a message with an attached image | Thumbnail `<img>` without key → 401 → name chip | No thumbnail on the phone | Repro: three image requests 401, `chipKind: name-chip` | Reproduced |
| BEH-002 | User | Phone: tap an attached file | `window.open(node URL)` → main-frame navigation → 401 → Android "Pair this phone again" | Wrong pairing screen; file not shown | Repro: new window/document `/rest/runs/<run>/context-files/<file>` 401 `mainFrame: true`; Android mapping read | Reproduced (bundle) + Read (app) |
| BEH-003 | User | Desktop: tap an attached image | Thumbnail loads (the desktop attaches its key); tap opens the file preview | Works | User; code | Read |
| BEH-004 | User | Desktop: a file link clicked again after the file was rewritten (tab still open) | Already-open tab reused, not reloaded | Old content; still old after 10 s with the viewer open; current after a page reload (or after closing the tab, by code) | Repro D1 ONE, D2 ONE, D3 ONE, D5 TWO | Reproduced |
| BEH-005 | User | Phone: the same | Same store path; the phone never closes files | Old content until the page reloads | Repro P1 TWO, P2 TWO (file was THREE), P3 THREE | Reproduced |
| BEH-006 | User | Phone: a file outside the workspace (436 node file) opened again | `useMobileNodeFile` fetches each time | Current content | Code | Read |
| BEH-007 | System | Real credential rejection | The page's credential check → pairing screen in the page (autobyteus-426 E-27) | Unchanged | Code | Read |

## Runtime, Probe, Or Reproduction Findings

| Method | Scenario | Observation | Established | Implication | Evidence |
| --- | --- | --- | --- | --- | --- |
| `file-open-repro.mjs` (isolated node with owner credential, scripted AGY `ECHO_INPUT` links, `nuxt dev` desktop window carrying the credential, paired phone bundle) | Bug 2 desktop | `D1_firstOpen: VERSION-ONE`, `D2_newLinkAfterRewrite: VERSION-ONE` (file was TWO), `D3_after10sOpen: VERSION-ONE`, `D5_afterReload: VERSION-TWO` | Reproduced | REQ-003 | `evidence/repro-run-1/repro-summary.json`, `desktop-D*.png` |
| same | Bug 2 phone | `P1: TWO`, `P2_newLinkAfterRewrite: TWO` (file was THREE), `P3_afterReload: THREE` | Reproduced | REQ-003 | `phone-P2.png` |
| same | Bug 1 phone | Thumbnail requests to `/rest/drafts/…/context-files/…` and `/rest/runs/…/context-files/…`: 401 (image); chip shows the name; tap opens `/rest/runs/<run>/context-files/<file>` as a new document: 401 | Reproduced | REQ-001, REQ-002 | `phone-bug1-*.png` |

- Temporary diagnostics: None.
- Reproduction for implementation to start from: `node <worktree>/tickets/in-progress/conversation-file-open-450/evidence/repro/file-open-repro.mjs --output-dir=<fresh>` after `pnpm -C autobyteus-server-ts build` and `pnpm -C autobyteus-web build:mobile-web` (about 2 min; starts `nuxt dev`). Today: `D2: VERSION-ONE`, `P2: VERSION-TWO`, `bug1.chipKind: name-chip`, `afterTap.newWindow: /rest/…`. After the fix: `D2: TWO`, `P2: THREE`, `thumbnail`, viewer open, no navigation. The D4 close-button selector found nothing: closing a tab is covered by code reading (`closeFile` removes the state).

## Stakeholder And User Evidence

| Source | Need | Strength | Implication |
| --- | --- | --- | --- |
| User, bug 1 | Open his attached screenshots on the phone | Strong; reproduced | REQ-001, REQ-002 |
| User, bug 2 | "When I click it, it shows the latest content" | Strong; reproduced on the desktop and the phone | REQ-003 |

## Persisted Data And State Facts

Not affected.

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related AC | Status | Approval |
| --- | --- | --- | --- | --- | --- | --- |
| `evidence/repro/file-open-repro.mjs` | Solution Designer | Reproduction | Both bugs | AC-001…AC-005 | Current | Evidence |
| `evidence/repro-run-1/` | Solution Designer | Results (isolated node, test files only) | — | — | Current | Evidence |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Resolution | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | Assumption | In the Android app, the bundle's `window.open` becomes the main-frame navigation that produces the screen in screenshot 42 | Read (WebView settings + mapper); confirmed on the emulator in validation | Open |
| RSK-001 | Risk | A reload on open could discard unsaved edits | Existing rule: `editorDraft` survives committed refreshes (`fileExplorerState.ts:27-28`) | Handled in design |

## Architecture Investigation Findings

- The phone's file-opening paths: `useEventMonitorFilePreview` (file links: workspace → `mobileNavigation.openFile`, else `openNodeFile`), `MobileFileViewer` with `useMobileWorkspaceFileExplorer` (store-based) or `useMobileNodeFile` (fetch per open). Context-file chips use neither.
- `AgentEventMonitor.vue:87` decides "the phone" with `isMobileRemoteAccessRuntime()` and obtains `useMobileNavigation()` in setup; `UserMessage` is rendered inside the same monitor.
- The context-file URL is resolved by `resolveContextAttachmentUrl(locator)` (`useContextAttachmentComposer.ts:236`, already fetched with `authorizedFetch` there).
- Media viewers load through `useAuthorizedObjectUrl(source)`. The same URL string does not refetch, so a reload of an image or PDF needs a changed input (a revision).

## Requirement Implications

- Bug 1 is two defects: the page opens a node URL in a way that cannot carry the key, and the app shows a pairing screen for any main-frame 401.
- Bug 2 is general (desktop and phone): an explicit open of an already-open file does not reload it.

## Notes For Architecture Design

- Reuse the phone's existing file-viewing path (Files screen, `authorizedFetch`) and the authorized object URL helper; no credential in URLs.
- Keep unsaved edits (`editorDraft`) on reload.
