# Requirements Doc

## Status

`Design-ready`

## Goal / Problem Statement

Fix the Event Monitor file-preview regression in which a valid `.md` path opens but a valid `.html` path shows an access-denied error. HTML is already an explicitly supported FileViewer family and has a dedicated `HtmlPreviewer`; the failure is in how the HTML viewer chooses its resource URL for an Electron/local absolute-path preview.

The change must make a valid HTML Event Monitor path render through the existing read-only preview without weakening workspace boundaries or changing the already-working Markdown path.

## Current And Desired Behavior (Mandatory)

| Behavior ID | Current Behavior | Desired Behavior | Preserved / Unchanged Behavior | Related Requirement / Acceptance-Criteria IDs |
| --- | --- | --- | --- | --- |
| BEH-001 | A central Event Monitor absolute `.md` action reaches `useEventMonitorFilePreview`, opens the Files tab, reads the file, and renders Markdown content. | A central Event Monitor absolute `.md` action continues to use the same read-only preview path and renders its content. | No change to Markdown rendering, action eligibility, path safety, or panel behavior. | RQ-001, AC-001 |
| BEH-002 | A central Event Monitor absolute `.html` action is classified as `Text`, content is loaded through the trusted local bridge in Electron, and `FileViewer` selects `HtmlPreviewer`; `HtmlPreviewer` then constructs a workspace static URL from the absolute local path whenever an active workspace exists. The server interprets that absolute path as a workspace-relative request and returns `Access denied: Path resolves outside the workspace boundary.` | A valid local absolute HTML preview uses the content already loaded by the trusted local bridge and renders it from an in-memory Blob URL. It does not construct a workspace static URL or request the server with an absolute path. | HTML remains read-only, sandboxed, and rendered by `HtmlPreviewer`; trusted local file loading remains owned by Electron/File Explorer. | RQ-002, RQ-003, AC-002, AC-003 |
| BEH-003 | A workspace-relative HTML file can use the existing static workspace route, but the viewer derives the workspace ID from the globally active workspace rather than the file's explicit resource identity. | A workspace-relative HTML preview may use the static route only when an explicit workspace resource context is present, and it uses that context's workspace ID and the bound REST endpoint. | Existing workspace-relative HTML preview and relative-resource loading remain available; server containment remains authoritative. | RQ-003, RQ-004, AC-004 |
| BEH-004 | Missing, unreadable, malformed, or unauthorized files are surfaced by the existing File Explorer error path; workspace static routes reject absolute paths. | Error and authorization behavior remains unchanged for invalid or inaccessible files; the fix does not turn an absolute local path into a server-relative path or bypass containment. | Existing localized/structured errors, supported-type policy, and server boundary remain intact. | RQ-004, AC-005 |

## Investigation Findings

- `.html` and `.htm` are in the shared `TEXT_EXTENSIONS` allowlist and therefore classify as `Text`.
- `FileViewer.vue` selects `HtmlPreviewer` for `Text` files in preview mode.
- `fileExplorerContentActions` already stores `relativeResourceContext: null` for trusted Electron local absolute paths, while workspace-routed files receive `{ kind: 'workspace', workspaceId }`.
- `FileViewer` forwards `relativeResourceContext` to `MarkdownPreviewer`, but `HtmlPreviewer` currently does not declare or consume it.
- `HtmlPreviewer` uses `workspaceStore.activeWorkspace?.workspaceId` plus `props.path` alone to choose `/workspaces/:workspaceId/static/...`, even when `props.path` is an absolute local filesystem path.
- `FileSystemWorkspace.getAbsolutePath()` rejects absolute inputs in `resolveWorkspaceRelativePath()` with the exact boundary error shown in the user screenshot.
- A temporary Vitest mount probe reproduced the URL-selection defect: with an active workspace and `/Users/normy/.autobyteus/server-data/temp_workspace/hitl-approach-demo.html`, the current component emits a workspace static iframe URL containing the absolute path. The probe was removed after execution; its result is retained in `investigation-notes.md`.

## Relevant Supplemental Task Artifacts

None. The mandatory artifacts contain the evidence and target UI states without needing a separate behavior authority.

## Design Health Assessment (Mandatory)

This is a local implementation defect at an existing viewer boundary, not a new API or architecture redesign. The current owners are healthy: File Explorer owns loading/state, `FileViewer` selects viewers, `HtmlPreviewer` owns HTML presentation, and the server owns workspace containment. The fix should pass explicit file-resource identity into the existing HTML viewer and select a resource strategy from that identity. No broad refactor is needed.

## Requirements

### RQ-001 — Preserve Markdown Event Monitor preview

A valid supported Markdown path clicked in the central Event Monitor continues to open the existing read-only Files preview and render the Markdown content.

### RQ-002 — Render local absolute HTML from loaded content

When a valid supported HTML path is opened from an embedded Electron/local absolute-path Event Monitor action, `HtmlPreviewer` must render the already-loaded HTML content using its in-memory preview path. It must not construct a workspace static URL from the absolute path and must not issue an absolute-path request to the workspace route.

### RQ-003 — Use explicit resource identity for HTML static URLs

`HtmlPreviewer` may use the workspace static URL only when the open file carries explicit workspace resource context. The URL must use that context's workspace ID and the bound REST endpoint, not a guessed global active workspace. Without workspace context, the viewer must fall back to the loaded-content Blob preview.

### RQ-004 — Preserve access and preview safety

The change must not relax FileViewer type gating, trusted Electron validation, server workspace containment, HTML sandboxing, or existing error handling. Unsupported, missing, unreadable, directory, and unauthorized candidates remain rejected through the existing paths.

## Acceptance Criteria

### AC-001 — Markdown regression guard

Given a valid central Event Monitor Markdown action, clicking it still selects/reuses the Files tab, marks the preview read-only, and displays the Markdown content.

### AC-002 — Reported HTML case opens

Given a valid central Event Monitor HTML action with an absolute local path outside the active workspace root, clicking it loads and displays the HTML content in the read-only HTML preview instead of showing the workspace boundary error.

### AC-003 — No incorrect static request for local HTML

For the AC-002 path, the rendered HTML iframe source is a Blob URL (or equivalent in-memory content URL), not `/rest/workspaces/<id>/static/<absolute-path>`, and no workspace static route is needed to render the file.

### AC-004 — Workspace HTML remains supported

Given a workspace-relative HTML file opened through the normal File Explorer/workspace path with explicit `{ kind: 'workspace', workspaceId }` resource context, the HTML viewer uses the bound workspace static URL and preserves relative resource behavior.

### AC-005 — Boundary regression guard

Given a malformed, missing, unreadable, directory, unauthorized, or unsupported Event Monitor candidate, existing rejection/error behavior remains in force; no new arbitrary filesystem or server access is introduced.

## Use-Case Coverage

| Use Case | Requirement IDs | Acceptance-Criteria IDs |
| --- | --- | --- |
| Click valid `.md` in Event Monitor | RQ-001, RQ-004 | AC-001 |
| Click valid absolute `.html` outside active workspace in Electron | RQ-002, RQ-003, RQ-004 | AC-002, AC-003 |
| Open workspace-relative `.html` | RQ-003, RQ-004 | AC-004 |
| Open invalid/unauthorized/unsupported file | RQ-004 | AC-005 |

## Persisted-Data Decision

`Directly Usable — No Migration`. This change only selects the correct in-memory HTML presentation source for an already-loaded file. No persisted schema, message record, workspace record, or stored file transformation is required.

## Approval State

The user explicitly reported the broken HTML click and asked for investigation. The intended outcome is directly supported by the existing HTML FileViewer contract and the user-visible Markdown precedent. Requirements are refined and design-ready for architecture review; no implementation has started.
