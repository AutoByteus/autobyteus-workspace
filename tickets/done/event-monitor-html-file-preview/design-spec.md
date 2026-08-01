# Design Spec

## Current-State Read

The relevant production path is:

`AgentEventMonitor -> AgentConversationFeed/segments -> MarkdownRenderer -> typed file action -> useEventMonitorFilePreview -> fileExplorerStore.openFilePreview -> FileViewer -> viewer adapter`

Event Monitor action parsing, launch, File Explorer state, and trusted content boundaries are already separate and healthy. The Event Monitor launcher marks the preview as read-only and selects a trusted Electron local locator for an embedded local path. `fileExplorerContentActions` loads local text through Electron IPC and leaves `relativeResourceContext` null; workspace-routed files receive an explicit workspace context. `FileViewer` classifies HTML as `Text` and selects `HtmlPreviewer` in preview mode.

The defect is in the final viewer boundary. `HtmlPreviewer` currently treats the presence of any globally active workspace and any `path` as proof that the path is workspace-relative. For a trusted local absolute HTML path, it therefore creates a workspace static URL containing the absolute path instead of using the already-loaded `content`. The server correctly rejects that URL as outside the workspace boundary. Markdown does not have this defect because `MarkdownPreviewer` renders the supplied content and only uses explicit workspace context for relative image resolution.

Evidence: `investigation-notes.md`, BEH-002/003/004; the temporary mount probe; `autobyteus-server-ts/src/workspaces/workspace-path-utils.ts`.

## Intended Change

Make HTML resource selection explicit and identity-driven:

1. Extend `HtmlPreviewer`'s props with the existing `FileRelativeResourceContext | null`.
2. Forward `file.relativeResourceContext` from `FileViewer.vue` to `HtmlPreviewer` in the same Text/preview prop branch already used for `MarkdownPreviewer`.
3. In `HtmlPreviewer`, build a static workspace URL only when `relativeResourceContext.kind === 'workspace'`, the context contains a workspace ID, and the document path is the workspace-relative path associated with that state.
4. Build that static URL from `relativeResourceContext.workspaceId` and `windowNodeContextStore.getBoundEndpoints().rest`; do not derive identity from `workspaceStore.activeWorkspace`.
5. When context is absent—specifically the trusted Electron/local absolute-path case—use the existing loaded-content Blob URL path. Do not issue a workspace static request.
6. Keep the existing iframe sandbox, Blob cleanup, and HTML content construction unchanged except for the source-selection guard. Do not change the server route or local-file boundary.

This is a clean-cut correction to the existing viewer identity seam, not a compatibility wrapper or a second HTML viewer.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind (`User`/`System`/`Operational`/`Contract`) | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Preserve Markdown Event Monitor preview; RQ-001, RQ-004; AC-001 | Explicit click/keyboard activation of a valid `.md` action | Existing launcher and MarkdownPreviewer path; focused suite 70/70 passed | Preserve exactly; no Markdown or Event Monitor action changes | `SP-PRIMARY` Event Monitor activation -> File Explorer -> MarkdownPreviewer |
| BEH-002 | User/System | Local absolute HTML renders from loaded content; RQ-002/003/004; AC-002/003 | Explicit click/keyboard activation of a valid `.html` action in trusted Electron | HTML is Text and reaches HtmlPreviewer, but current static URL contains absolute path and yields workspace boundary error | Use content Blob when resource context is absent; no workspace static request | `SP-PRIMARY` launcher -> local IPC-loaded state -> FileViewer -> HtmlPreviewer |
| BEH-003 | System/Contract | Workspace HTML static route remains supported through explicit identity; RQ-003/004; AC-004 | Normal workspace-relative HTML preview with `{kind:'workspace', workspaceId}` | Existing static route works for relative paths; current viewer guesses active workspace | Use explicit context workspace ID and bound REST endpoint; preserve relative resources and server checks | `SP-RESOURCE` explicit workspace state -> HtmlPreviewer static URL -> workspace static route |
| BEH-004 | Contract/Security | Existing rejection and containment remain authoritative; RQ-004; AC-005 | Any missing, malformed, unsupported, or unauthorized candidate | Server rejects absolute route input; File Explorer/Electron validate trusted reads | Do not broaden access; keep existing errors and sandbox/type policy | `SP-BOUNDARY` action policy -> trusted loader/server -> viewer error |

## Relevant Supplemental Task Artifacts

None. No separate supplement is required; the requirements, investigation notes, and design spec fully capture the evidence and intended behavior.

## Task Design Health Assessment (Mandatory)

### Change posture

Bug fix / local implementation correction exposed by the Event Monitor absolute-path preview feature.

### Root-cause classification

Local implementation defect with a narrow boundary identity omission. `HtmlPreviewer` has the correct presentation responsibility but chooses its resource authority from global workspace state rather than the open file's explicit resource context.

### Ownership and boundary health

- Event Monitor action policy owns eligibility only.
- `useEventMonitorFilePreview` owns activation-time environment mapping.
- `fileExplorerContentActions` owns local/workspace loading and `OpenFileState` identity.
- `FileViewer` owns viewer selection and prop composition.
- `HtmlPreviewer` owns HTML presentation and its static-versus-Blob source selection.
- Electron main/preload and the workspace server own file bytes and validation.

These owners remain appropriate. No cross-owner coordination blob, new endpoint, or subsystem split is needed.

### Refactor posture

`No refactor needed`. The existing `relativeResourceContext` is the intended identity shape and already flows through `OpenFileState` and `FileViewer`; this change completes its use at the HTML viewer boundary. No compatibility wrapper, legacy absolute-path static behavior, or second resource authority should remain.

### Residual risk if refactor is deferred

None for the reported hard error after this fix. A separate risk remains that relative local HTML assets may not resolve from the existing Blob base, but expanding local HTML asset authorization is outside this bug's scope and must not be solved by permitting absolute workspace static URLs.

## Data-Flow Spine Inventory

### `SP-PRIMARY` — Event Monitor HTML activation

`Event Monitor segment -> typed AbsoluteFilePathAction -> AgentEventMonitor explicit handler -> useEventMonitorFilePreview -> fileExplorerStore.openFilePreview -> fileExplorerContentActions -> OpenFileState -> FileViewer -> HtmlPreviewer -> Blob iframe`

- Governing node: `useEventMonitorFilePreview` for activation and `fileExplorerContentActions` for content loading.
- Return path: `HtmlPreviewer` displays content or the existing File Explorer error state; Event Monitor remains visible.
- Side effects occur only after explicit activation; Markdown rendering remains passive.

### `SP-RESOURCE` — Workspace-relative HTML resource path

`OpenFileState.relativeResourceContext(kind=workspace) -> FileViewer prop composition -> HtmlPreviewer explicit context guard -> bound REST static URL -> workspace static route -> HTML iframe`

- Governing node: `HtmlPreviewer` owns presentation source selection; server owns path containment.
- The context workspace ID is the identity for the URL; active global workspace state is not consulted.

### `SP-BOUNDARY` — Trusted access/error path

`AbsoluteFilePathAction eligibility -> Electron local validation or workspace mapping -> local IPC/content route -> OpenFileState error -> FileExplorerTabs error surface`

- No change to boundary validation.
- A path that is local and trusted is not converted into a server-relative path by the viewer.

## Main-Line Nodes And Owners

| Node | Owner | Governing responsibility | Must not own |
| --- | --- | --- | --- |
| Event Monitor action emission | `MarkdownRenderer` / `useMarkdownSegments` | Pure scoped path/type policy and explicit action event | File reads, URL construction, workspace inference |
| Runtime locator selection | `useEventMonitorFilePreview` | Electron/local vs workspace/mobile mapping | HTML rendering or server route changes |
| File content state | `fileExplorerContentActions` | Load type/content and attach `relativeResourceContext` | HTML URL construction |
| Viewer selection/props | `FileViewer.vue` | Select adapter and pass complete file identity | Filesystem access |
| HTML source strategy | `HtmlPreviewer.vue` | Context-gated static URL or loaded-content Blob | Authorization, workspace inference, direct IPC |
| Workspace static route | `autobyteus-server-ts/src/api/rest/workspaces.ts` | Serve relative workspace files and enforce boundary | Accepting absolute paths |
| Local file bytes | Electron main/preload | Validate and read local file | Renderer-side filesystem reads |

## Interface And Data-Shape Design

### Existing `FileRelativeResourceContext`

Reuse the existing shape:

```ts
type FileRelativeResourceContext = {
  kind: 'workspace'
  workspaceId: string
}
```

`null` means the file content is not authorized by a workspace-relative route, including trusted Electron local absolute loading. It is a resource identity signal, not authorization by itself.

### `HtmlPreviewer` props

Add:

```ts
relativeResourceContext?: FileRelativeResourceContext | null
```

The viewer receives `content` and `path` as before. The context is optional to preserve non-FileViewer callers that only provide content; those callers use the Blob path.

### Static URL rule

```text
if context.kind === 'workspace' && context.workspaceId && path is present:
    iframeSrc = boundRest + /workspaces/<context.workspaceId>/static/<encoded relative path>
else:
    iframeSrc = Blob(content, text/html)
```

The design does not authorize or normalize arbitrary paths in the viewer. The normal File Explorer state owns the relative-path contract; the server remains authoritative.

### Blob rule

Keep the existing content-to-Blob behavior and cleanup. For local HTML, `content` is already obtained by trusted Electron IPC before `HtmlPreviewer` mounts. The Blob path must be selected without a static URL computation.

## Target Subsystem / Folder / File Mapping

| Target path | Responsibility after change | Change |
| --- | --- | --- |
| `autobyteus-web/components/fileExplorer/FileViewer.vue` | Compose viewer props including resource identity | Pass `relativeResourceContext` to `HtmlPreviewer`. |
| `autobyteus-web/components/fileExplorer/viewers/HtmlPreviewer.vue` | HTML preview source selection and iframe presentation | Declare context; gate static URL by explicit workspace context; use context workspace ID; retain Blob fallback and sandbox. |
| `autobyteus-web/components/fileExplorer/__tests__/FileViewer.spec.ts` | Viewer selection/prop contract | Add HTML context forwarding regression. |
| `autobyteus-web/components/fileExplorer/viewers/__tests__/HtmlPreviewer.spec.ts` | HTML source-selection contract | Add workspace-static and content-Blob scenarios, including absolute local path without context. |
| `autobyteus-web/docs/content_rendering.md` | File viewer architecture | Document explicit context for workspace static HTML and Blob fallback for local/content-only HTML. |
| `autobyteus-web/docs/file_explorer.md` | Event Monitor/File Explorer behavior | Clarify that HTML local absolute preview uses loaded content and never workspace static absolute paths. |
| `autobyteus-server-ts/src/api/rest/workspaces.ts` | Server boundary | No code change. Existing tests remain the authority for relative-only behavior. |

No new folders, public APIs, persistence fields, or endpoint routes are needed.

## Boundary Encapsulation Map

| Boundary | Input | Output | Validation / invariant |
| --- | --- | --- | --- |
| File Explorer state -> FileViewer | `OpenFileState` with content/path/context | adapter props | Preserve explicit `relativeResourceContext`; do not infer it. |
| FileViewer -> HtmlPreviewer | content/path/context | HTML preview source | Viewer can choose only context-backed static or content Blob. |
| HtmlPreviewer -> workspace static route | relative path + explicit workspace ID | iframe response | Only context-backed relative files reach static route; server containment remains final. |
| Electron/File Explorer -> local HTML content | absolute local path | string content | Existing trusted local validation; viewer never reads local path directly. |
| HtmlPreviewer -> iframe | Blob/static URL | sandboxed rendered HTML | Keep existing `sandbox="allow-scripts allow-same-origin"`. |

## Dependency Rules / Forbidden Shortcuts

- `HtmlPreviewer` may depend on `FileRelativeResourceContext` and `useWindowNodeContextStore`; it must not derive file identity from `useWorkspaceStore.activeWorkspace`.
- `HtmlPreviewer` must not call Electron APIs, Apollo, REST fetch, or filesystem APIs directly.
- `FileViewer` must not add a second special-case loader for HTML; it only forwards the existing state identity.
- The Event Monitor launcher must remain unchanged; it already sends the correct local/workspace locator and read-only intent.
- The server must not be relaxed to accept absolute paths on `/static/*`.
- Do not render raw local absolute paths into iframe URLs as a fallback.
- Do not switch all HTML previews to raw text merely to hide the error; workspace HTML rich preview remains supported.
- Do not change mobile HTML behavior in this ticket; its raw read-only mode is an existing security-conscious path.

## Compatibility And Cleanup

This is a direct replacement of the incorrect `HtmlPreviewer` source-selection condition:

- Remove the use of global active workspace as the sole static URL gate.
- Add explicit context gating and use context workspace ID.
- No compatibility branch should preserve static URL generation for a path when context is null.
- Keep existing Blob URL revocation on source changes and unmount.

## Change / Refactor Sequence

1. Add the HTML viewer context prop and update `FileViewer` prop composition.
2. Replace `HtmlPreviewer.staticUrl` identity source with explicit context gating.
3. Add focused viewer and prop-forwarding tests for local absolute, workspace-relative, and no-context content-only cases.
4. Run focused frontend tests and type/build checks owned by implementation.
5. Run API/E2E coverage for Event Monitor `.md`/`.html`, workspace static route safety, and Electron/local preview; keep server boundary tests unchanged unless coverage investigation identifies a missing regression.
6. Update durable rendering/File Explorer docs with the final behavior and record no migration.

## Test Intent For Downstream Coverage Investigation

| Scenario ID | Intent | Expected result |
| --- | --- | --- |
| SC-HTML-001 | Mount HtmlPreviewer with `path='/Users/.../demo.html'`, content, no context | Blob iframe source; no static URL derived from absolute path. |
| SC-HTML-002 | Mount HtmlPreviewer with `path='docs/demo.html'`, content, explicit workspace context and bound REST | Static iframe source uses context workspace ID and encoded relative path. |
| SC-HTML-003 | Change context/path/content and inspect source cleanup | Old Blob URL is revoked; new source reflects current identity/content. |
| SC-HTML-004 | Mount FileViewer for `.html` preview with workspace context | HtmlPreviewer receives the context. |
| SC-HTML-005 | Existing Event Monitor `.md` action | Files preview remains read-only and renders Markdown. |
| SC-HTML-006 | Existing server static route absolute-path violation | Server still returns the boundary error; no frontend path bypass is added. |
| SC-HTML-007 | Mobile HTML path | Mobile remains raw read-only and does not gain an unauthenticated static iframe. |

## Persistence / Migration

No persisted data or schema changes. File paths, content, workspace state, run history, artifacts, and message references remain directly usable. No migration, rebuild, or compatibility data layer is required.

## Documentation / Operational Impact

Documentation impact is expected but limited to `autobyteus-web/docs/content_rendering.md` and `autobyteus-web/docs/file_explorer.md`: describe that static HTML preview requires explicit workspace resource context, while local/content-only HTML uses the loaded-content Blob path. No deployment, server configuration, or release migration is needed.

## Risks And Tradeoffs

- **Local relative assets:** A Blob preview may not resolve local relative CSS/images/scripts exactly as a file-backed document. The existing implementation already has a Blob fallback; this fix chooses it for local content instead of sending an invalid workspace URL. A future local-asset design must go through the trusted local resource boundary.
- **Static workspace security:** Keeping static URL generation context-gated avoids introducing an absolute-path exception and preserves the existing server boundary.
- **Global workspace changes:** Using explicit context prevents an open file from silently switching to a different active workspace's URL.
- **No backend change:** This keeps the fix proportional and avoids turning a frontend identity bug into a broader file-serving policy change.

## Implementation Guidance

Prefer a small computed `staticUrl` condition based on `props.relativeResourceContext?.kind === 'workspace'` and `workspaceId`, with the existing `updateSrc`/Blob cleanup retained. Add no new generic URL abstraction unless implementation proves the encoding logic is duplicated by another owner. Keep the static path encoding behavior compatible with the existing route and add tests for spaces/absolute-path exclusion.
