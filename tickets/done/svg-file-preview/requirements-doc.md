# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready

## Goal / Problem Statement

SVG files are currently treated as unsupported when selected from the workspace
File Explorer, so the right-side Files surface shows “Preview not available for
this file type.” The central Event Monitor uses the same supported-file policy to
decide whether an absolute path can become an action, so SVG paths are currently
not offered the existing right-side preview behavior either.

Enable SVG rendering by adding SVG to the existing image family at the shared
filename-policy boundary. All three entry points must continue through the
existing authorized content-loading path and shared `FileViewer`/`ImageViewer`;
this is not a request for a second renderer or inline SVG source execution.
The same shared-policy change must also cover SVG files selected in the
existing right-side Artifacts tab: its ArtifactContentViewer must resolve
artifact metadata or an SVG path to Image, use the existing artifact content
route for bytes, and render through the same FileViewer/ImageViewer boundary.

## Current And Desired Behavior (Mandatory)

| Behavior ID | Current Behavior | Desired Behavior | Preserved / Unchanged Behavior | Related Requirement / Acceptance-Criteria IDs |
| --- | --- | --- | --- | --- |
| BEH-001 | Selecting a workspace `.svg` creates an `Unsupported` file state because the shared image extension allowlist omits `.svg`; `FileViewer` has no active component and the Files pane shows its unsupported message. | Selecting a lower- or upper-case SVG classifies it as `Image`, obtains the existing local/workspace media URL, and renders it in the right-side Files surface through `ImageViewer`. | Existing image loading, zoom/pan, tab, full-view, loading, and error behavior remain unchanged. SVG remains a read-only media preview and is not opened as source text. | REQ-001, REQ-002, REQ-004, AC-001, AC-002, AC-004, AC-005 |
| BEH-002 | Event Monitor path actions use the same policy; an absolute SVG path or supported absolute `file:` link is classified `Unsupported` and does not become a clickable preview action. | An eligible SVG path/link becomes the existing typed action. On explicit click/Enter/Space, the existing launcher opens the right-side panel with Files active, requests a read-only shared File Explorer preview, and renders SVG through `ImageViewer`. | Event Monitor remains opt-in, path mapping and authorization boundaries remain unchanged, the central feed remains visible, and unsupported/invalid/out-of-workspace paths remain inert or unavailable. | REQ-001, REQ-003, REQ-004, REQ-005, AC-001, AC-003, AC-004, AC-006, AC-007 |
| BEH-003 | Existing supported image, text, audio, video, spreadsheet, and PDF paths use their established policy, loaders, and viewers; unknown/binary paths are intentionally unsupported. | SVG joins only the established `Image` family; no other classification or action policy changes. | No unsupported binary is sent through a text reader; no unauthenticated URL, direct filesystem read, inline `v-html`, persisted reference, or new renderer is introduced. | REQ-004, REQ-005, AC-004, AC-005, AC-006 |
| BEH-006 | In the right-side Artifacts tab, artifact metadata already recognizes many image artifacts, but an artifact whose metadata relies on its .svg path can still be classified Unsupported by the frontend shared policy and show the ArtifactContentViewer fallback. | Selecting an available SVG artifact in the Artifacts tab resolves it as Image, fetches its existing authorized run-file-change content, and renders it through the tab's existing ArtifactContentViewer -> FileViewer -> ImageViewer path. | Artifact pending/streaming/failed/deleted states, read-only artifact presentation, blob URL lifecycle, artifact route authorization, and non-SVG artifact behavior remain unchanged. | REQ-001, REQ-004, REQ-007; AC-001, AC-004, AC-005, AC-006, AC-009, AC-010 |

## Investigation Findings

- The current root cause is a local implementation omission, not a fragmented
  renderer: `autobyteus-web/utils/fileExplorer/fileTypePolicy.ts` has an
  authoritative `IMAGE_EXTENSIONS` set without `.svg`.
- `determineFilePreviewType()` lowercases the basename and extension before
  classification, so adding `.svg` to that set covers case variants without a
  second predicate.
- File Explorer and Event Monitor converge on the same policy. `fileUtils.ts`
  delegates `determineFileType()` to it; Event Monitor action resolution and
  action creation also call it. `FileViewer.vue` already maps `Image` to
  `ImageViewer.vue`.
- The existing content owners already support image-family URL transport:
  Electron uses `local-file://` after trusted regular-file validation; browser/
  remote workspace previews use the authorized workspace content route and
  object-URL helper. Both MIME boundaries use the installed `mime-types`
  package, which resolves `.svg` to `image/svg+xml`.
- `FileItem.vue` has a text-only `isPreviewable` predicate. SVG need not be added
  there: media files opened through its normal `openFile()` path are classified
  and rendered by `FileViewer`, while the predicate only chooses text preview
  versus edit mode.
- Event Monitor activation already opens the right panel idempotently, selects
  Files, applies readOnly true, and focuses the active file tab. No separate
  Event Monitor renderer is needed.
- The right-side Artifacts tab already uses ArtifactItem.vue and
  ArtifactContentViewer. ArtifactItem.vue and server artifact-type inference
  recognize .svg as an image in the normal metadata path. ArtifactContentViewer
  also uses determineFileType as a fallback and passes fetched blob URLs to the
  shared FileViewer. Extending the shared policy closes that fallback gap without
  a new artifact renderer; the existing run-file-change REST route already
  returns MIME-aware bytes.
- No persisted data, API schema, authorization contract, or migration is
  affected. Durable docs currently list the older image extension set and need
  a documentation sync after implementation.
- See the canonical investigation notes for exact source paths, line references,
  commands, tests, and security-boundary evidence.

## Relevant Supplemental Task Artifacts

| Artifact Path | Type / Purpose | Related Requirement IDs | Related Acceptance-Criteria IDs | Status / Approval | Relationship To Requirements |
| --- | --- | --- | --- | --- | --- |
| /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/svg-file-preview/svg-preview-ui-ux-spec.md | UI/UX journey and state specification for direct File Explorer, Event Monitor, and SVG selection in the right-side Artifacts tab | REQ-002, REQ-003, REQ-004, REQ-005, REQ-007 | AC-002, AC-003, AC-004, AC-006, AC-007, AC-009, AC-010 | Requirements-ready; approval basis is the explicit request, clarification, and supplied screenshot | Defines observable states, read-only/right-panel/Artifacts-tab behavior, loading/error/unavailable handling, accessibility, and out-of-scope UI changes; it does not supersede the core requirements |

## Design Health Assessment (Mandatory)

- Change posture: Bug Fix / Behavior Change
- Initial design issue signal: Yes — the supported-type policy is missing a file
  family that the existing shared renderer and loaders already handle.
- Root cause classification: Local Implementation Defect
- Refactor posture: No refactor needed now.
- Evidence basis: `fileTypePolicy.ts` is the single shared classifier used by
  File Explorer type routing, Event Monitor action eligibility, and the
  ArtifactContentViewer fallback; `FileViewer` already has the `Image` ->
  `ImageViewer` dispatch. The content boundaries already return MIME-correct
  media responses.
- Requirement or scope impact: Extend the existing image-family allowlist and
  focused regression coverage; do not introduce a new component, path, API,
  protocol, or Event Monitor-specific branch.

## Recommendations

Make the smallest coherent change at the shared policy owner, then verify the
existing File Explorer, Event Monitor, and right-side Artifacts-tab
ArtifactContentViewer spines. Add focused
unit/component coverage for SVG classification, Event Monitor action
eligibility, artifact fallback classification, shared ImageViewer dispatch, and
the relevant transport boundaries as the downstream coverage investigation
finds appropriate. Update durable rendering/File Explorer/Artifact
documentation to list SVG and preserve the shared policy/viewer statement.

## Scope Classification (`Small`/`Medium`/`Large`)

Small

## In-Scope Use Cases

- `UC-001`: A user selects a lower-case or upper-case SVG in the workspace File
  Explorer and sees the rendered artwork in the existing right-side Files
  viewer.
- `UC-002`: A user clicks or keyboard-activates an eligible absolute SVG path or
  empty-authority absolute `file:` link in the central Event Monitor and sees it
  rendered in the existing right-side Files panel with Files active and the
  preview read-only.
- `UC-003`: A user encounters a missing, unreadable, malformed, unauthorized, or
  out-of-workspace SVG/path and receives the existing loading/error/unavailable
  behavior without an unsafe fallback or application crash.
- UC-004: A user continues using existing non-SVG previews and unsupported-file
  behavior without classification or routing regressions.
- UC-005: A user opens the right-side Artifacts tab, selects an available SVG
  artifact, and sees the rendered artwork in its existing ArtifactContentViewer
  through the shared ImageViewer.

## Out of Scope

- SVG source editing, XML/DOM inspection, sanitization redesign, conversion to
  another image format, thumbnails, annotations, download/export, or
  SVG-specific controls.
- A second renderer, Event Monitor-only viewer, inline SVG DOM/`v-html`, or
  generic Markdown filesystem actions outside the existing Event Monitor opt-in.
- New REST endpoints, local protocols, authorization shortcuts, persisted
  records, schema changes, or migrations.
- Changing `FileItem.vue`'s text-only edit/preview mode predicate unless a
  downstream implementation check proves an unrelated regression; media opening
  must remain on the existing `Image` dispatch path.

## Functional Requirements

- `REQ-001` — Shared classification: `determineFilePreviewType()` MUST classify
  `.svg` and case variants as `Image` through the existing `IMAGE_EXTENSIONS`
  policy. It MUST remain a filename policy and MUST NOT read file bytes or
  authorize access.
- `REQ-002` — Workspace File Explorer rendering: when a workspace SVG is
  selected, the existing store MUST create/reuse its open-file state, use the
  existing local or workspace media URL branch, and expose the file to
  `FileViewer` as `type: 'Image'`. The visible successful state MUST be the
  existing `ImageViewer` presentation in the right-side Files surface.
- `REQ-003` — Event Monitor rendering: when the Event Monitor recognizes an
  eligible absolute SVG path or supported absolute `file:` link, it MUST create
  the existing typed file action and, on explicit activation, use the existing
  Event Monitor launcher and File Explorer store. The right-side panel MUST be
  opened idempotently with Files active and the resulting preview MUST be
  read-only and rendered by the same `ImageViewer`.
- `REQ-004` — Existing behavior and boundary preservation: the change MUST
  preserve existing classifications, unsupported/inert path behavior, tab
  reuse, loading/error/unavailable states, authorization/path containment,
  trusted Electron capability checks, and image zoom/pan/full-view behavior.
  SVG MUST NOT be routed through a text reader, HTML renderer, inline DOM
  injection, direct filesystem read, or unauthenticated URL.
- `REQ-005` — Interaction/accessibility: direct file selection and Event Monitor
  activation MUST retain existing click/keyboard semantics, visible selection or
  active-tab focus, read-only Event Monitor intent, and existing status-region
  announcements. No new SVG-specific interaction is required.
- `REQ-006` — Documentation alignment: durable frontend rendering/File Explorer
  documentation MUST list SVG as an Image family member and describe the shared
  policy/viewer behavior after the source change is integrated. This is a
  delivery/docs-sync responsibility, not a new runtime path.

- REQ-007 — Right-side Artifacts-tab rendering: when an available artifact
  whose file is SVG is selected in the right-side Artifacts tab, it MUST resolve
  to Image through its existing metadata or shared path policy, fetch bytes only
  through the existing authorized run-file-change content route, and render
  through the existing ArtifactContentViewer -> FileViewer -> ImageViewer path.
  Pending/streaming/failed/deleted artifact states and artifact read-only
  behavior MUST remain unchanged.

## Acceptance Criteria

- `AC-001` — Policy matrix: focused policy tests show `determineFileType()` /
  `determineFilePreviewType()` returns `Image` for `diagram.svg`, `DIAGRAM.SVG`,
  and a nested path, while existing archive/binary examples remain
  `Unsupported`.
- `AC-002` — File Explorer success: selecting a real or representative workspace
  SVG results in an open-file state of `type: 'Image'`, a URL from the existing
  local/workspace media branch, and a mounted `ImageViewer`; the unsupported
  message and text editor are not shown for the successful SVG case.
- `AC-003` — Event Monitor success: an eligible SVG path/link is rendered as the
  existing action, and explicit click plus keyboard activation produce the
  existing typed action/launcher flow; the right-side panel is visible, Files is
  active, the SVG tab is active/focused, and the shared viewer renders it
  read-only without changing the feed.
- `AC-004` — Failure and boundary safety: missing/unreadable/invalid/out-of-scope
  SVG content follows the existing error/unavailable/inert behavior; no
  unauthorized URL, direct text read, raw `file:` navigation, filesystem probe
  from the classifier, or application crash occurs.
- `AC-005` — Regression matrix: existing supported image, text, audio, video,
  spreadsheet, and PDF routing remains unchanged; unsupported archives,
  installers, application bundles, generic binaries, and unknown extensions
  remain unsupported/inert.
- `AC-006` — Shared renderer/security shape: the successful SVG path is dispatched
  by `FileViewer` to the existing `ImageViewer` and uses the existing URL/object
  URL and trusted content boundaries; no new SVG-specific renderer or inline
  SVG injection path is present.
- `AC-007` — Observable interaction quality: loading and error states remain
  announced by existing status/alert regions; Event Monitor action remains
  keyboard activatable and focuses the active file tab; direct file selection
  retains the existing active-row/tab behavior.
- `AC-008` — Documentation: the durable supported-file documentation no longer
  contradicts the runtime image allowlist and identifies SVG as rendered by
  `ImageViewer`.

- AC-009 — Right-side Artifacts-tab success: selecting an available SVG
  artifact in the Artifacts tab results in Image type, an authorized
  run-file-change content request/blob URL, and a rendered ImageViewer state;
  ArtifactContentViewer must not show its unsupported fallback or a text
  editor.
- AC-010 — Artifact regression/failure: pending, streaming, failed, deleted,
  unavailable, and non-SVG artifact states retain their existing messages and
  lifecycle; SVG content is not fetched by an alternate or unauthenticated
  route.

## Constraints / Dependencies

- The implementation MUST stay inside the existing `autobyteus-web` file
  explorer/type-policy and test ownership boundaries unless review evidence
  requires otherwise.
- The classifier is intentionally pure and extension-based; file existence,
  regular-file validation, readability, workspace containment, credentials, and
  MIME responses remain the responsibility of native/server content boundaries.
- The same shared policy must govern File Explorer routing and Event Monitor
  action eligibility so the Event Monitor cannot expose a type the viewer cannot
  render.
- `ImageViewer` renders through `<img>` and the existing authorized object URL
  helper. Interactive inline SVG is not part of this requirement.
- Durable docs synchronization follows implementation and code review; API/E2E
  coverage decisions belong to the downstream coverage investigation.
- ArtifactContentViewer in the right-side Artifacts tab continues to use
  authorizedFetch against the existing run-file-change content route, creates the
  existing blob URL for media, and passes it to FileViewer. No new artifact URL
  or metadata schema is required.

## Persisted Data Outcome (When Applicable)

- Stored subject / location: None; preview state is transient Pinia/UI state and
  the SVG bytes remain in the existing workspace/local content source.
- Required outcome: Not Affected
- Existing data to preserve, discard/rebuild, transform, or quarantine: No
  persisted records or schemas change; no bytes are rewritten.
- Unacceptable data loss or corruption: Existing workspace files and existing
  persisted application data must remain untouched.
- Relevant availability, maintenance-window, or rollout constraints: None beyond
  the normal frontend rollout; no migration or maintenance window is needed.
- Related requirement and acceptance-criteria IDs: REQ-004, REQ-006, REQ-007; AC-004,
  AC-008, AC-009, AC-010.

## Assumptions

- SVG files are already served by the existing workspace REST route or trusted
  Electron local protocol used for other media; the investigation verifies both
  MIME and access boundaries.
- The requested result is rendered artwork in the existing image presentation,
  not editable SVG source or an interactive SVG document.
- Event Monitor “middle area” refers to the existing opt-in absolute-path/file
  action capability, including supported Markdown link destinations.
- Existing viewer and content-boundary failure states are the intended UX for
  malformed or unavailable SVG files.

- The right-side Artifacts tab exposes an available SVG artifact, its metadata
  or path classification, and the existing run-file-change content route can
  resolve the artifact path for an available run.

## Risks / Open Questions

- SVG can be a richer document format than raster images. This design avoids
  inline SVG/HTML execution and uses the existing `<img>` media boundary; any
  future need for interactive SVG DOM or embedded-resource policy requires a
  separate security/design decision.
- A syntactically valid SVG may still fail browser decoding; this is intentionally
  handled by the existing image error/placeholder path rather than a new parser.
- Existing mobile/read-only artifact/reference consumers also reuse the shared
  policy and `FileViewer`; they may gain SVG support as a controlled shared-policy
  consequence. The downstream coverage investigation must verify that this
  inheritance is acceptable and covered or explicitly documented.
- The right-side Artifacts tab's ArtifactContentViewer has an additional
  explicit metadata mapping and authorized blob-fetch lifecycle. The design
  preserves it and uses the shared policy only for the fallback path.
- The backend and Electron routes have generic MIME fallback behavior. The
  installed MIME package resolves `.svg` to `image/svg+xml`; an end-to-end test
  may be added if coverage evidence calls for it.

## Requirement-To-Use-Case Coverage

| Requirement ID | UC-001 | UC-002 | UC-003 | UC-004 | UC-005 |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | X | X | X | X |  |
| REQ-002 | X |  | X | X |  |
| REQ-003 |  | X | X | X |  |
| REQ-004 | X | X | X | X | X |
| REQ-005 | X | X | X |  |  |
| REQ-006 | X | X |  | X | X |
| REQ-007 |  |  | X |  | X |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criteria ID | Scenario Intent | Primary Evidence / Coverage Owner |
| --- | --- | --- |
| AC-001 | Pure lower/upper-case SVG classification and unsupported regression matrix | Frontend unit coverage; `api_e2e_engineer` decides final durable edits |
| AC-002 | Workspace File Explorer state, URL branch, shared `ImageViewer` dispatch | Component/store coverage plus realistic browser or desktop validation as applicable |
| AC-003 | Event Monitor action eligibility, click/keyboard launch, right-panel Files activation, read-only state | Markdown/action unit coverage plus browser-level flow; final matrix owned downstream |
| AC-004 | Missing/invalid/out-of-scope behavior and no unauthorized fallback | Existing boundary tests, focused negative tests, and runtime evidence |
| AC-005 | Existing supported and unsupported type regression | Existing policy/store/action suite with focused additions if needed |
| AC-006 | Shared renderer and transport/security shape | Component dispatch and content-boundary review/tests |
| AC-007 | Loading/error announcements, focus, click/keyboard semantics | UI/component/browser evidence |
| AC-008 | Runtime/docs alignment | Delivery documentation sync report |
| AC-009 | Available artifact SVG classification, authorized blob fetch, and shared ImageViewer render | Artifact component/store coverage plus realistic artifact/browser validation |
| AC-010 | Artifact lifecycle/error and non-SVG regression behavior | Artifact component/API coverage and execution evidence |

## Approval Status

The user's explicit request, follow-up clarification, and supplied screenshot
provide the approval basis for the intended scope: render SVG from the workspace
File Explorer, central Event Monitor, and an SVG selected in the right-side
Artifacts tab. The linked UI supplement is requirements-ready and introduces no
additional product choice.
No unresolved user decision blocks the revised architecture handoff.
