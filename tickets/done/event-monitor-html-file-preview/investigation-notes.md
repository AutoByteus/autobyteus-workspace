# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete; dedicated task worktree created from refreshed `origin/personal`.
- Current Status: Investigation complete; requirements refined and design-ready; implementation not started.
- Investigation Goal: Determine why Event Monitor `.md` links open while `.html` links show an error, identify the exact UI/backend route and root cause, and define a safe verifiable fix.
- Scope Classification (`Small`/`Medium`/`Large`): Small-to-medium.
- Scope Classification Rationale: The defect is one frontend viewer identity/URL-selection mismatch, but it crosses Event Monitor action launch, File Explorer state, HTML viewer, and the existing workspace boundary contract; no new backend API is required.
- Scope Summary: Event Monitor file-link click -> typed preview launcher -> File Explorer local/workspace content loading -> `FileViewer` type/mode selection -> Markdown or HTML viewer resource strategy -> rendered content/error.
- Primary Questions To Resolve:
  1. What exact URL/error is produced for `.html` versus `.md`?
  2. Which frontend component classifies file extensions and creates the preview target?
  3. Does the backend file route support HTML and return the correct media type/content disposition?
  4. Is HTML intentionally unsupported for local preview, or accidentally routed to the workspace static URL?
  5. What tests and prior Event Monitor preview changes define the supported contract?

## Request Context

User reports: “when i click the md file in the event monitor area, it could be opened, but when i click the html, then it shows error.” The supplied screenshot shows an Event Monitor/message area containing absolute paths to a Markdown artifact and an HTML artifact. The Files pane displays a JSON error: `{"detail":"Access denied: Path resolves outside the workspace boundary."}`. The visible error is consistent with the HTML path being sent to the workspace static route as an absolute path. The screenshot also contains an external DOCX path and a separate Files-pane interaction; the screenshot does not provide browser/Electron console or network logs, so the source trace below is the primary evidence.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git monorepo/superrepo.
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-html-file-preview`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-html-file-preview/tickets/done/event-monitor-html-file-preview`
- Current Branch: `codex/event-monitor-html-file-preview`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-html-file-preview`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin personal` succeeded before worktree creation.
- Task Branch: `codex/event-monitor-html-file-preview`
- Base SHA / Task HEAD at bootstrap: `9615dcc88e73f0584e67623a3cfe1f0d2afd4617`
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal` / recorded base branch, subject to downstream delivery process.
- Bootstrap Blockers: None.
- Notes For Downstream Agents: No production code has been changed. Symlinked dependencies and generated Nuxt output were used temporarily for the focused frontend test/probe and removed before handoff; they are not task artifacts.

## Exact Sources Consulted

### User-provided evidence

- `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_a6cd7349ef974c33a5355224052174b9/solution_designer_76bf2c21d2a0435a875b16e749c5c321/context_files/ctx_fb8e6e70679c__image.png`

### Prior task artifacts

- `tickets/done/event-monitor-absolute-path-file-preview/requirements.md`
- `tickets/done/event-monitor-absolute-path-file-preview/design-spec.md`
- `tickets/done/event-monitor-absolute-path-file-preview/implementation-handoff.md`
- `tickets/done/event-monitor-absolute-path-file-preview/user-verification-unsupported-file-preview-report.md`
- `tickets/done/event-monitor-file-uri-internal-preview/requirements.md`
- `tickets/done/event-monitor-file-uri-internal-preview/investigation-notes.md`
- `tickets/done/event-monitor-markdown-link-clickability/design-spec.md`
- `tickets/done/event-monitor-markdown-link-clickability/investigation-notes.md`

### Current frontend sources

- `autobyteus-web/utils/fileExplorer/fileTypePolicy.ts`
- `autobyteus-web/utils/fileExplorer/fileUtils.ts`
- `autobyteus-web/utils/eventMonitorFilePaths/absoluteFilePathAction.ts`
- `autobyteus-web/composables/useEventMonitorFilePreview.ts`
- `autobyteus-web/stores/fileExplorerState.ts`
- `autobyteus-web/stores/fileExplorerContentActions.ts`
- `autobyteus-web/components/fileExplorer/FileViewer.vue`
- `autobyteus-web/components/fileExplorer/viewers/MarkdownPreviewer.vue`
- `autobyteus-web/components/fileExplorer/viewers/HtmlPreviewer.vue`
- `autobyteus-web/components/fileExplorer/__tests__/FileViewer.spec.ts`
- `autobyteus-web/components/fileExplorer/viewers/__tests__/MarkdownPreviewer.spec.ts`
- `autobyteus-web/components/mobile/MobileFileViewer.vue`
- `autobyteus-web/components/mobile/__tests__/MobileFileViewer.spec.ts`

### Current backend sources/tests

- `autobyteus-server-ts/src/api/rest/workspaces.ts`
- `autobyteus-server-ts/src/workspaces/filesystem-workspace.ts`
- `autobyteus-server-ts/src/workspaces/workspace-path-utils.ts`
- `autobyteus-server-ts/tests/unit/api/rest/workspaces.test.ts`
- `autobyteus-server-ts/tests/e2e/file-explorer/workspace-content-rest.e2e.test.ts`

### Current documentation

- `autobyteus-web/docs/content_rendering.md`
- `autobyteus-web/docs/file_explorer.md`
- `autobyteus-web/docs/electron_packaging.md`

## Commands / Setup Used

- `git status --short --branch`
- `git fetch origin personal`
- `git worktree add -b codex/event-monitor-html-file-preview /Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-html-file-preview origin/personal`
- `git log --all --oneline --grep='event monitor|event-monitor|html.*preview|file.*preview' -i`
- `rg -n -i 'event monitor|event-monitor|determineFilePreviewType|absoluteFilePathAction|file URI|fileUri|FileViewer|previewType' ...`
- Focused source reads with `sed`, `rg`, and `git log --follow` for the files listed above.
- Temporary setup for frontend checks: symlinks to the clean base checkout's `node_modules` and `autobyteus-web/.nuxt`; all symlinks removed after checks.
- `pnpm exec vitest --run components/fileExplorer/__tests__/FileViewer.spec.ts components/fileExplorer/viewers/__tests__/MarkdownPreviewer.spec.ts utils/eventMonitorFilePaths/__tests__/absoluteFilePathAction.spec.ts components/conversation/segments/renderer/__tests__/MarkdownRenderer.spec.ts`
- Temporary probe mount for current `HtmlPreviewer` URL selection; executed with Vitest and removed after the result was captured.
- Attempted `pnpm -C autobyteus-server-ts exec vitest --run tests/unit/api/rest/workspaces.test.ts tests/unit/workspaces/workspace-path-utils.test.ts`; blocked because this worktree has no server `vitest` installation. Server behavior was verified by source and existing checked-in tests instead.

## Stable Relevant Behaviors

| Behavior ID | Kind | Current Evidence-Backed Behavior | Desired / Preserved Outcome | Current Production Path / Evidence |
| --- | --- | --- | --- | --- |
| BEH-001 | User | Markdown Event Monitor actions open successfully through the existing Files preview path. | Markdown remains unchanged and read-only for Event Monitor activation. | `useEventMonitorFilePreview.ts` -> `fileExplorerContentActions` -> `MarkdownPreviewer.vue`; prior Event Monitor ticket artifacts; focused suite passed. |
| BEH-002 | User/System | HTML is classified as Text, selects `HtmlPreviewer`, then incorrectly uses a workspace static URL for an absolute local path because the viewer checks only for a global active workspace and `path`. | Absolute local HTML renders from loaded content without a static workspace request. | `fileTypePolicy.ts`, `FileViewer.vue`, `fileExplorerContentActions.ts`, `HtmlPreviewer.vue`; temporary mount probe. |
| BEH-003 | Contract/System | Workspace static/content routes accept workspace-relative paths and reject absolute paths with `Access denied: Path resolves outside the workspace boundary.` | The frontend must only invoke the static route with explicit workspace-relative identity; backend containment remains unchanged. | `workspaces.ts`, `filesystem-workspace.ts`, `workspace-path-utils.ts`; existing unit/E2E tests. |
| BEH-004 | System/Contract | Open file state already distinguishes local absolute loading (`relativeResourceContext: null`) from workspace-routed loading (`{ kind: 'workspace', workspaceId }`). Markdown consumes this identity; HTML does not. | Viewer resource selection must honor the existing explicit identity. | `fileExplorerState.ts`, `fileExplorerContentActions.ts`, `MarkdownPreviewer.vue`, `FileViewer.vue`. |

## Current-State Production Trace

### Shared Event Monitor entry and launch

1. `AgentEventMonitor.vue` enables `enableEventMonitorFileActions` on `AgentConversationFeed`.
2. The feed/segment chain reaches `MarkdownRenderer.vue`, which emits a typed `AbsoluteFilePathAction` only after the shared supported-file policy classifies the path.
3. On explicit activation, `AgentEventMonitor.vue` lazily invokes `useEventMonitorFilePreview().openPath(action)`.
4. In embedded Electron with the trusted local bridge, `useEventMonitorFilePreview` selects a `local-absolute` locator. In browser/remote/mobile, it maps inside the active workspace or reports unavailable before opening.
5. The launcher calls `fileExplorerStore.openFilePreview(path, workspaceId, { accessIntent: { source: 'event-monitor', readOnly: true } })`, then opens/selects the Files panel on desktop.

### File Explorer loading and viewer selection

6. `fileExplorerContentActions._openFileWithMode` classifies the candidate through `determineFileType()`, which delegates to `determineFilePreviewType()`.
7. `.html` is in `TEXT_EXTENSIONS`, so the type is `Text`.
8. For an absolute local path in trusted Electron, `_loadLocalFile` calls `window.electronAPI.readLocalTextFile(filePath)` and stores the returned content; `relativeResourceContext` remains `null`.
9. `FileViewer.vue` receives `type: 'Text'`, `mode: 'preview'`, and the content. It selects `HtmlPreviewer` for `.html`/`.htm`. It passes `content` and `path`, but the viewer has no explicit resource-context prop.

### Why Markdown succeeds and HTML fails

10. `MarkdownPreviewer.vue` renders the supplied `content` directly through `MarkdownRenderer`. It only creates a workspace-relative image resolver when `relativeResourceContext` is explicitly present. A local absolute Markdown document therefore renders from content and does not call the workspace file route for the document itself.
11. `HtmlPreviewer.vue` computes `staticUrl` as:

    `bound REST + /workspaces/${workspaceStore.activeWorkspace.workspaceId}/static/${encodePath(props.path)}`

    whenever an active workspace ID and any path exist. It does not check whether the path is workspace-relative or whether `relativeResourceContext` exists.
12. For the reported path, the computed URL is structurally equivalent to:

    `.../rest/workspaces/<active-workspace-id>/static//Users/normy/.autobyteus/server-data/temp_workspace/hitl-approach-demo.html`

    The exact slash/encoding presentation may vary, but the path payload remains absolute.
13. `autobyteus-server-ts/src/api/rest/workspaces.ts` calls `workspace.getAbsolutePath(filePath)`. `FileSystemWorkspace` delegates to `resolveWorkspaceRelativePath()`, which rejects `path.isAbsolute(relativePath)` with `Access denied: Path resolves outside the workspace boundary.` The server error therefore appears in the Files pane.
14. The current HTML viewer chooses this iframe URL instead of the already-loaded local content Blob. This is why the `.md` and `.html` experiences diverge despite both being supported text families.

## Runtime / Probe Findings

| Date | Method | Exact command / method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-07-31 | Focused test | `pnpm exec vitest --run ...` for FileViewer, MarkdownPreviewer, Event Monitor path policy, MarkdownRenderer | 4 files / 70 tests passed on current source. | Existing relevant baseline is green; no current test covers HTML resource selection. |
| 2026-07-31 | Temporary Vue mount probe | Mounted `HtmlPreviewer` with mocked active workspace `workspace-1`, bound REST `http://node.example/rest`, and absolute path `/Users/normy/.autobyteus/server-data/temp_workspace/hitl-approach-demo.html`; inspected iframe `src`. | 1 probe passed because current `iframe.src` contains `/rest/workspaces/workspace-1/static/` and the absolute path segments. | The viewer is proven to select a workspace static route for an absolute local path. This is the direct frontend defect matching the screenshot's boundary error. Probe file was removed after execution. |
| 2026-07-31 | Source trace | `workspace-path-utils.ts` + `workspaces.ts` | Absolute route inputs are rejected with the exact error shown by the user. | No backend relaxation is appropriate; frontend must avoid sending absolute local paths to workspace static route. |
| 2026-07-31 | History read | `git log --follow -- autobyteus-web/components/fileExplorer/viewers/HtmlPreviewer.vue` | `HtmlPreviewer` has historically selected static URL based on global active workspace and path; no identity guard was added when Event Monitor local absolute previews were introduced. | This is a local viewer integration gap exposed by the Event Monitor absolute-path feature, not an intentional HTML policy. |

## Root-Cause Classification

- **Change posture:** Bug fix / local implementation correction.
- **Primary root cause:** Local implementation defect: `HtmlPreviewer` uses a workspace static URL based on global active-workspace presence instead of the open file's explicit resource identity.
- **Contributing boundary issue:** The existing local-vs-workspace distinction is represented in `OpenFileState.relativeResourceContext` but is not carried into the HTML viewer. This creates a viewer-specific identity omission, not a need for a new subsystem.
- **Not the root cause:** HTML is not unsupported; `.html` is allowlisted as Text, `FileViewer` has a dedicated HTML adapter, and trusted local text loading succeeds before the iframe is selected.
- **Not the root cause:** The backend boundary is operating correctly. It rejects the absolute path because workspace routes are intentionally relative-only.
- **Refactor posture:** No broad refactor needed. Extend the existing `FileViewer` -> viewer props seam and make `HtmlPreviewer` choose static versus Blob from explicit context. Do not add a permissive absolute-path server route or duplicate Electron reading in the viewer.

## Target Design Direction

- Add `relativeResourceContext?: FileRelativeResourceContext | null` to `HtmlPreviewer`.
- In `FileViewer.vue`'s Text/preview component props, pass the existing `relativeResourceContext` to `HtmlPreviewer` just as the current code does for `MarkdownPreviewer`.
- `HtmlPreviewer` uses the static workspace URL only when `relativeResourceContext?.kind === 'workspace'` and `path` is a workspace-relative document path. The URL uses `relativeResourceContext.workspaceId` and `windowNodeContextStore.getBoundEndpoints().rest`; it must not consult `workspaceStore.activeWorkspace` for resource identity.
- When the context is absent (trusted Electron/local absolute path, or another content-only caller), render the already-loaded HTML content through the existing Blob URL path. Keep the iframe sandbox attributes unchanged.
- Preserve all server-side path validation, trusted Electron IPC validation, FileViewer type policy, and read-only Event Monitor intent.
- Add focused component tests for workspace context/static URL, no-context absolute local path/Blob URL, and `FileViewer` context forwarding. Add or retain regression checks for Markdown, mobile raw HTML behavior, and backend boundary tests as appropriate to the downstream coverage investigation.

## Relevant Files / Components And Ownership

| File | Current owner / responsibility | Required design impact |
| --- | --- | --- |
| `autobyteus-web/components/fileExplorer/FileViewer.vue` | Chooses viewer and builds viewer props | Forward existing resource context to HTML preview. |
| `autobyteus-web/components/fileExplorer/viewers/HtmlPreviewer.vue` | HTML iframe/blob presentation | Gate static URL by explicit context; use context workspace ID; fallback to content Blob. |
| `autobyteus-web/components/fileExplorer/viewers/MarkdownPreviewer.vue` | Markdown content presentation and workspace image resolver | No behavior change; reference pattern for explicit context. |
| `autobyteus-web/stores/fileExplorerContentActions.ts` | Local/workspace load and `OpenFileState` identity | No behavior change; its context distinction is the source of truth. |
| `autobyteus-server-ts/src/api/rest/workspaces.ts` | Workspace content/static route and containment | No change; retain relative-only boundary. |
| `autobyteus-web/components/mobile/MobileFileViewer.vue` | Mobile read-only shared viewer shell | Preserve current raw HTML edit-mode behavior; no rich static iframe change in mobile scope. |
| `autobyteus-web/docs/content_rendering.md` / `docs/file_explorer.md` | Durable viewer and Event Monitor behavior documentation | Delivery should document local HTML content-Blob versus workspace-context static strategy if implementation lands. |

## Existing Coverage / Test Evidence

- `autobyteus-web/utils/eventMonitorFilePaths/__tests__/absoluteFilePathAction.spec.ts`: 45 tests passed.
- `autobyteus-web/components/conversation/segments/renderer/__tests__/MarkdownRenderer.spec.ts`: 18 tests passed.
- `autobyteus-web/components/fileExplorer/__tests__/FileViewer.spec.ts`: 5 tests passed; it verifies Markdown context forwarding but has no HTML context case.
- `autobyteus-web/components/fileExplorer/viewers/__tests__/MarkdownPreviewer.spec.ts`: 2 tests passed; it verifies explicit workspace context pattern.
- `autobyteus-web/components/mobile/__tests__/MobileFileViewer.spec.ts`: existing test states mobile HTML remains raw read-only/edit-mode path; preserve it.
- `autobyteus-server-ts/tests/unit/api/rest/workspaces.test.ts`: checked-in unit tests cover static workspace assets and path violations; server dependencies were unavailable in this task worktree, so not executed here.
- `autobyteus-server-ts/tests/e2e/file-explorer/workspace-content-rest.e2e.test.ts`: checked-in E2E tests cover rejection of absolute candidates; not executed here due missing server Vitest installation.

## Supplemental Artifact Inventory

None. No separate supplement was promoted: the bug evidence is concise, code-local, and fully captured here; the intended behavior is authoritative in `requirements.md` and `design-spec.md`.

## Persisted Data / Migration Assessment

No persisted data or schema is touched. The HTML file path/content already exist and are read by the current File Explorer flow. Only the in-memory viewer resource strategy changes. Decision: `Directly Usable — No Migration`.

## Constraints / Dependencies / Compatibility Facts

- Do not change `resolveWorkspaceRelativePath()` or permit absolute paths through `/workspaces/:workspaceId/static/*`.
- Do not let the renderer read arbitrary local files. Local content must continue to arrive through the trusted Electron/File Explorer path.
- Do not use global active workspace as a substitute for explicit file-resource identity.
- Keep HTML iframe sandboxing (`allow-scripts allow-same-origin`) unchanged unless a separate security review requires a new decision.
- Keep MobileFileViewer's current raw HTML behavior and authorized mobile path; this ticket is the desktop/Event Monitor HTML error only.
- Keep Markdown and all other FileViewer families unchanged.
- No new endpoint, persistence, artifact/reference row, or compatibility wrapper is required.

## Open Unknowns / Residual Risks

- A local HTML document's relative assets may not resolve identically from a Blob URL because the existing Blob fallback uses the app origin as its base. The reported failure is the hard error before rendering; preserving existing content rendering is in scope, while complete local asset semantics may require a separate follow-up if user verification exposes it.
- HTML content may contain scripts/resources subject to the existing iframe sandbox and CSP behavior. This ticket should not broaden sandbox permissions.
- The exact user's runtime was inferred as Electron from the macOS window and absolute host path; browser/remote behavior remains covered by the explicit workspace-context branch and should be validated downstream.

## Design Handoff Readiness

- Mandatory bootstrap artifacts: present in this ticket folder.
- Requirements: refined/design-ready with explicit acceptance criteria.
- Current-state owner and security boundaries: identified with exact source paths.
- Root cause: reproduced by focused component probe and matched to backend boundary code.
- New API/server/persistence scope: none.
- Expected next gate: architecture review of the design spec, then implementation only after approval.
