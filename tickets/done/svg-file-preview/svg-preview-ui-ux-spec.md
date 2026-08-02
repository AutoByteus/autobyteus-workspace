# UI/UX Specification

## Status (`Draft`/`Requirements-ready`/`Refined`)

Requirements-ready

## UX Goal

Make a supported SVG behave like the other supported image files: selecting it from
Workspace Files or activating an eligible SVG path in the central Event Monitor
should show the rendered image in the existing right-side Files surface. The
change must not add a second viewer, source editor, overlay, or new navigation
model.
The same behavior applies to an available SVG selected in the existing
right-side Artifacts tab. Its ArtifactContentViewer should use the artifact's
existing authorized content and shared ImageViewer rather than a separate
artifact renderer.

The supplied screenshot is the visual reference for the current failure state:
`ambrosia.svg` is selected while the right pane displays “Preview not available
for this file type.”

## Related Requirements And Acceptance Criteria

- Requirements: REQ-001, REQ-002, REQ-003, REQ-004, REQ-005, REQ-007.
- Acceptance criteria: AC-001 through AC-010 in the requirements doc.
- The supplement defines intended interaction/state behavior only; its approval
  basis is the user's explicit request and screenshot. It does not introduce a
  new product decision.

## Users / Personas / Contexts

- Workspace user browsing source files in the desktop/web File Explorer.
- Workspace user reading an agent Event Monitor message containing an absolute
  SVG path or supported `file:` link.
- Event Monitor previews are read-only and preserve the central feed while the
  normal right-side Files panel is opened.
- User reviewing an available agent artifact in the existing right-side
  Artifacts tab and its ArtifactContentViewer.

## User-Journey Inventory

| Journey ID | User / Context | Starting State | User Goal | Completion State | Related Requirement / Acceptance-Criteria IDs |
| --- | --- | --- | --- | --- | --- |
| UXJ-001 | Workspace Files user | File tree is visible; an SVG exists in the active workspace | Select the SVG and inspect the rendered artwork | Existing Files content surface shows the SVG through the shared ImageViewer; file remains read-only as a media preview | REQ-001, REQ-002, REQ-004; AC-001, AC-002, AC-004, AC-005 |
| UXJ-002 | Desktop/web Event Monitor user | Central feed contains an eligible absolute SVG path or empty-authority absolute `file:` URI | Activate the path and inspect the file without leaving the feed | Right-side panel is visible with Files active, the SVG tab is active/focused, and the shared ImageViewer renders the SVG read-only | REQ-001, REQ-003, REQ-004, REQ-005; AC-001, AC-003, AC-004, AC-006, AC-007 |
| UXJ-003 | Right-side Artifacts-tab user | The Artifacts tab shows an available artifact with an SVG path or image metadata and its run content is accessible | Select the artifact and inspect the rendered artwork | ArtifactContentViewer fetches existing content, passes a blob URL to shared FileViewer, and ImageViewer renders SVG read-only while preserving artifact lifecycle states | REQ-001, REQ-004, REQ-007; AC-001, AC-004, AC-005, AC-006, AC-009, AC-010 |

## Journey Details

### UXJ-001 — Workspace Files

1. The user clicks an SVG file row in the workspace file tree. Keyboard
   activation, where already supported by the file-row control, follows the same
   path.
2. The existing File Explorer store classifies the path as `Image`, creates or
   reuses its open-file tab, and requests the existing local or workspace media
   URL.
3. While the resource is being resolved, the existing loading state remains
   visible and is announced through the existing status region.
4. On success, `FileViewer` dispatches to `ImageViewer`; the SVG is shown as an
   image with the existing contain/zoom/pan behavior. No text editor controls
   are shown for the media file.
5. The user can switch tabs, close the tab, zoom, pan when zoomed, reset zoom,
   or use the existing full-view affordance. No new SVG-specific action is
   required.

### UXJ-002 — Event Monitor SVG path

1. The user clicks an eligible SVG path action in the central Event Monitor, or
   activates it with Enter/Space.
2. The existing Event Monitor launcher resolves the path using the active
   workspace/runtime boundary and requests the shared File Explorer preview with
   `source: 'event-monitor'` and `readOnly: true`.
3. The right-side panel is opened idempotently, the Files tab is selected, and
   the active file tab receives focus after the panel is mounted. The central
   feed remains in place.
4. The existing File Explorer loading/error states apply while the content URL is
   resolved. On success, the same `FileViewer` -> `ImageViewer` path renders the
   SVG.
5. If the path is outside the active workspace, unavailable in the current
   runtime, unsupported by the trusted content boundary, or cannot be loaded,
   the Event Monitor shows its existing localized unavailable/failed status and
   the original feed content remains unchanged.

### UXJ-003 — Artifact SVG

1. The user opens the right-side Artifacts tab and selects an available SVG
   artifact in its existing ArtifactContentViewer.
2. ArtifactContentViewer preserves its existing metadata mapping and fallback
   determineFileType call. The shared policy returns Image for an SVG path
   when fallback classification is needed.
3. The existing authorized run-file-change content request returns the artifact
   bytes. ArtifactContentViewer creates its existing blob URL and passes it to
   FileViewer.
4. FileViewer dispatches Image to ImageViewer. The artifact remains read-only;
   no artifact-specific SVG controls or source editor are introduced.
5. Pending, streaming, failed, deleted, unavailable, and non-SVG artifact states
   retain their existing messages and lifecycle.

## Screen / Surface / Component Inventory

| Surface / Component | Purpose | Entry Conditions | Important States | Exit / Next Action |
| --- | --- | --- | --- | --- |
| `FileItem.vue` / workspace file tree | File selection entry point | A file row is rendered in the active workspace | Idle, active/selected, click or existing keyboard activation | Delegates to the workspace file-explorer composable; no SVG-specific branching is added |
| `FileExplorerTabs.vue` / right-side Files surface | Tab and content-shell owner | An open file exists for the workspace | No file, loading, error, active content, unsupported fallback | Tab switching, close, zoom/full-view through existing controls |
| `FileViewer.vue` | Shared type-to-viewer dispatcher | File state has a resolved `type` | Loading, error, Image, text/media, unsupported | Selects `ImageViewer` for `type: 'Image'` |
| `ImageViewer.vue` | Rendered image presentation | `FileViewer` has `type: 'Image'` and a URL | Loading via authorized URL helper, rendered image, missing/error placeholder, zoom/pan | Existing image interactions; no inline SVG DOM or source editing |
| Event Monitor `MarkdownRenderer.vue` action | Scoped path-action surface | Event Monitor opt-in is enabled and policy recognizes the path | Inert ordinary text, eligible action, invalid/unsupported inert path, focus/activation | Emits the existing typed action on click/Enter/Space |
| `useEventMonitorFilePreview.ts` | Event Monitor launch coordinator | Typed action is explicitly activated | Opened, unavailable, failed | Opens Files/right panel or reports existing localized status |
| ArtifactContentViewer.vue / right-side Artifacts tab | Artifact selection/content adapter | Available artifact selected in the Artifacts tab | Loading, pending, failed, deleted, blob fetch error, Image content | Existing artifact-tab controls; shared ImageViewer renders the resource |

## Interaction And State-Transition Specification

| Scenario / State | User Action Or Trigger | Immediate Feedback | Resulting UI State | Data / Side Effect | Next Available Actions |
| --- | --- | --- | --- | --- | --- |
| SVG row idle | Click or existing row activation | Selection highlight/tab transition | File tab becomes active; `Image` load begins | File Explorer creates or reuses transient open-file state | Wait, switch tab, close, or inspect image |
| SVG loading | Store/authorized resource request in flight | Existing `Loading file content...`/status region | Right Files content shell is loading | No persisted write; one authorized content request | Wait or leave the surface |
| SVG render success | Resource resolves | No unsupported warning; image appears | Shared `ImageViewer` displays SVG with existing contain/zoom/pan | URL/object URL is held by existing viewer lifecycle and revoked when applicable | Zoom, pan, reset, full view, tab controls |
| Event Monitor SVG activation | Click, Enter, or Space on action | Action is consumed; feed does not navigate | Right panel opens, Files tab active, SVG tab focused, read-only viewer loads | Transient open-file state; no artifact/reference/persisted record | Inspect, close/switch tab, return attention to feed |
| Missing/unreadable SVG | Resource boundary fails | Existing File Explorer error or Event Monitor unavailable/failed message | No crash; feed and shell remain usable | No unsafe fallback read or URL; no persisted state | Close/retry through existing controls or continue reading |
| Unsupported/non-SVG path | Passive render or activation attempt | Existing inert/source-faithful behavior | No Event Monitor file action; ordinary unsupported file keeps fallback | No file read/media URL/panel switch solely from the unsupported path | Continue reading/copying source |
| Read-only Event Monitor file | Attempt to edit | No edit control is offered | Media remains preview-only | `readOnly` intent remains attached to transient state | Inspect or close only |
| Artifact SVG selection | Open the right-side Artifacts tab and select an available artifact | Existing artifact loading/content status | Artifacts tab shows shared ImageViewer output and remains read-only | Authorized blob URL only; no persisted write | Inspect, maximize, or select another artifact |
| Artifact pending/failed/deleted | Artifact lifecycle or content boundary reports non-success | Existing artifact-specific message | Artifacts tab keeps pending/failed/deleted state visible; no unsupported fallback caused by lifecycle | No unsafe fallback fetch | Continue or select another artifact |

## Markdown Wireframes / Visual Structure

The target layout intentionally reuses the existing surface:

```text
+----------------------+--------------------------+-------------------------+
| Workspace navigation | Central Event Monitor    | Right-side Files panel  |
|                      |                          | [files tabs]            |
|  ... ambrosia.svg    | ... /workspace/logo.svg | ----------------------- |
|       [selected]     |      [Open action]      | [SVG rendered image]    |
|                      |                          | zoom / existing controls|
+----------------------+--------------------------+-------------------------+
```

For direct File Explorer selection, the central Event Monitor column is
unchanged. For Event Monitor activation, the panel becomes visible and Files is
selected; there is no modal or separate preview overlay. For an artifact
selection, the existing right-side Artifacts tab is selected and its
ArtifactContentViewer remains the content adapter; no separate overlay is
introduced.

## Non-Happy-Path States

### Loading

Use the existing `FileExplorerTabs`/`FileViewer` loading status. Do not render
partial SVG source text or an untrusted inline fragment while the URL is pending.
The status remains a polite live region as it is for other files.

### Empty

If there is no active file, retain the existing Files empty state. An SVG file
with no usable URL is not considered a successful empty preview; it uses the
existing image URL unavailable placeholder or store error.

### Error And Recovery

A missing, deleted, unreadable, malformed, or failed-to-fetch SVG uses the
existing content error/placeholder behavior. Event Monitor path mapping failures
use the existing localized host-only/unavailable or preview-failed status. The
central Event Monitor message is not rewritten and remains usable.
Artifact failures in the right-side Artifacts tab continue to use
ArtifactContentViewer's existing pending, deleted, error, and unavailable
states. The SVG policy change must not bypass those states or fetch content
through a new route.

### Disabled / Unavailable

Unsupported extensions, relative paths, non-empty-authority `file:` URIs,
truncated/incomplete candidates, and paths outside the authorized active
workspace remain inert or unavailable under the existing policy. Only `.svg`
(and case variants) joins the established Image family.

### Permission / Authentication

Workspace and remote resources continue through the existing authorized REST /
object-URL flow; trusted embedded Electron resources continue through the
existing `local-file://` capability and validation boundary. SVG rendering must
not add an unauthenticated static URL, browser-resolved `file:` URL, inline
`v-html`, or direct filesystem read.

## Responsive And Platform Behavior

- Desktop/web: use the existing right-side Files panel and shared `FileViewer`.
- Embedded Electron: use the existing trusted local media URL and local protocol
  response; no SVG-specific protocol is introduced.
- Browser/remote: use the existing workspace-relative REST content URL and
  authorized object URL helper where credentials require it.
- Phone-first/mobile flows inherit the shared `Image` classification and existing
  mobile preview request behavior; this task does not change the mobile layout
  or add a desktop-only fork. The desktop Event Monitor requirement remains the
  primary acceptance journey.
- The existing contained image sizing prevents an SVG from expanding the panel
  beyond its current bounds.
- The right-side Artifacts tab and its existing zen/full-view presentation
  retain current responsive behavior; SVG uses the same contained image
  presentation as other artifact images.

## Accessibility And Keyboard Behavior

- Preserve the existing file-row and tab focus behavior.
- Preserve Event Monitor action semantics: native link-like action, visible focus,
  localized label/title, and click/Enter/Space activation.
- After an Event Monitor activation, focus the active file tab using the existing
  `data-event-monitor-active-file-tab` hook; the image itself remains a
  presentation element with a localized `alt` label.
- Loading and error statuses remain announced by existing `role="status"` /
  `aria-live` and `role="alert"` regions.
- Do not add keyboard-only behavior that differs between SVG and other images.

## Content, Labels, And Validation Messages

No new user-facing copy is required. Reuse the existing localized labels and
messages for loading, image URL unavailable, File Explorer errors, host-only
availability, and Event Monitor preview failure. The unsupported message should
no longer appear for a successfully classified SVG.

## Data And API Dependencies

- Shared filename policy returns `Image` for `.svg` and case variants.
- File Explorer store retains the existing local/media URL branches.
- Workspace REST and Electron local protocol boundaries provide existing MIME and
  regular-file/access validation; no API shape or persisted record changes are
  required.
- `ImageViewer` consumes the existing URL/object-URL contract.
- The right-side Artifacts tab's ArtifactContentViewer uses authorizedFetch
  on the existing run-file-change content route, creates a blob URL for media,
  and passes it to FileViewer.

## Out Of Scope

- SVG source editing, XML/DOM inspection, sanitization redesign, SVG-specific
  controls, conversion to PNG, thumbnails, download/export, annotations, or a
  separate Event Monitor renderer.
- Changing generic Markdown rendering or enabling filesystem actions outside the
  existing Event Monitor opt-in.
- Adding a new backend route, local protocol, persisted schema, migration, or
  authorization shortcut.

## Open Decisions / Risks

- The design deliberately uses `<img>` through the existing `ImageViewer` rather
  than inline SVG or `HtmlPreviewer`; this preserves the established media and
  authorization boundary. If future product scope requires interactive SVG DOM,
  it needs a separate security/design review.
- Existing tests may need a focused SVG matrix expansion at policy, Event Monitor
  action, viewer dispatch, and/or content-route coverage. The downstream coverage
  investigation owns the final durable-test edit decision.
- The right-side Artifacts tab's artifact metadata already recognizes SVG in
  the normal image metadata path; the shared policy change primarily protects
  path-based fallback classification. Artifact component and run-file-change
  coverage should verify both paths.

## Approval Status

The explicit user request, follow-up artifact clarification, and supplied
screenshot establish the intended behavior basis. This supplement is
requirements-ready for architecture review and introduces no product decision
beyond rendering SVG in File Explorer, Event Monitor, and the right-side
Artifacts tab.
