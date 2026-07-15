# Markdown Preview Relative Images — Requirements

## Status (`Draft`/`Design-ready`/`Refined`)

`Refined`

## Goal / Problem Statement

AutoByteus workspace file preview correctly renders Markdown text but fails to display valid images referenced relative to the Markdown/README file, such as `assets/card.png`. The same document renders correctly in VS Code because VS Code retains the document URI as resource-resolution context. AutoByteus currently discards that context before Markdown rendering, so the browser resolves the image against the AutoByteus application URL rather than the Markdown document directory.

The target behavior is secure, document-relative image rendering in desktop and mobile workspace Markdown preview, using the existing authorized workspace-content boundary and without changing the meaning of generic conversation Markdown.

## Investigation Findings

- `FileViewer.vue` recognizes Markdown and passes `content` plus `path` to `MarkdownPreviewer.vue`.
- `MarkdownPreviewer.vue` declares `path` but does not use it; it forwards only `content` to the generic `MarkdownRenderer.vue`.
- `useMarkdownSegments.ts` uses `markdown-it`, which preserves `assets/card.png` as `<img src="assets/card.png">`; DOMPurify also preserves that relative value.
- The resulting `v-html` content is attached to the AutoByteus application document. Chromium therefore resolves the image against the renderer URL (`file:///.../renderer/` in a packaged desktop build or the web application origin in development/mobile), not against the Markdown file.
- A focused component probe confirmed that supplying `.article-work/topic/article.md` still produces the raw `src="assets/...png"` and does not produce `.article-work/topic/assets/...png`.
- AutoByteus already has the correct protected file-delivery capability: workspace media is loaded from `/rest/workspaces/:workspaceId/content?path=...`, and the frontend already has authorized object-URL helpers for mobile bearer-authenticated resources.
- The current REST workspace path boundary contains a sibling-prefix weakness (`/root-other` passes a naive `startsWith('/root')` check). The image change must not rely on that weak check; boundary hardening is in scope because Markdown can trigger resource requests automatically.

## Supplemental Solution Artifacts

`None`. The intended UI behavior and failure states are sufficiently bounded in this requirements document.

| Artifact Path | Type / Purpose | Related Requirement IDs | Related Acceptance-Criteria IDs | Status / Approval | Authoritative Relationship |
| --- | --- | --- | --- | --- | --- |
| None | N/A | N/A | N/A | N/A | N/A |

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): `Bug Fix`
- Initial design issue signal (`Yes`/`No`/`Unclear`): `Yes`
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): `Boundary Or Ownership Issue`
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): `Likely Needed` — bounded boundary correction, not a broad renderer rewrite.
- Evidence basis: The workspace-file preview owner has document path/workspace identity, but its delegation to the shared Markdown renderer carries content only. The browser cannot reconstruct the lost document base safely. The same renderer is used for conversation text, thought segments, task descriptions, and team messages, where workspace-relative resolution would be incorrect.
- Requirement or scope impact: Resolution must be explicitly enabled by the workspace-file preview boundary. The generic Markdown renderer must remain context-neutral unless a caller supplies an explicit resource-resolution context.

## Recommendations

- Preserve the shared Markdown parser/renderer rather than creating a second Markdown implementation.
- Add an explicit workspace Markdown resource context at the file-preview boundary, resolve relative image paths against the previewed document directory, and convert them to the existing workspace content route.
- Reuse the authorized-resource/object-URL mechanism so the same behavior works with Phone Access credentials and does not issue an unauthenticated image request first.
- Keep remote/data image sources on their existing path and do not guess a workspace for generic Markdown surfaces.
- Harden the server workspace-relative path boundary with segment-aware containment and focused tests.

## Scope Classification (`Small`/`Medium`/`Large`)

`Medium`

The visible defect is narrow, but the correct fix spans the workspace preview boundary, shared Markdown rendering as an opt-in capability, authenticated resource loading, path normalization, and server containment enforcement.

## In-Scope Use Cases

- Preview a workspace Markdown/README file containing a valid sibling, child, or parent-directory relative image path that remains inside the workspace.
- Preview the same workspace Markdown through the desktop Files surface and the mobile read-only Files surface.
- Continue displaying HTTP(S) and data-backed images already supported by Markdown rendering.
- Handle missing, unreadable, malformed, or out-of-workspace relative image references without breaking the rest of the document.
- Re-render correctly when the Markdown content, document path, workspace identity, node endpoint, or remote-access credential changes.

## Out of Scope

- Relative links to other Markdown documents or arbitrary files; this change is limited to inline image resources.
- Relative-image resolution for conversation messages, reasoning/thought segments, delegated-task descriptions, team-message bodies, artifacts, or team reference Markdown. Those surfaces do not currently carry a verified workspace-document identity and must not guess one.
- Relative images in standalone absolute local Markdown files opened outside a registered workspace.
- Editing or rewriting the Markdown source file to contain application URLs.
- General-purpose arbitrary local filesystem access or a new unauthenticated static-file route.
- Changing VS Code behavior.

## Functional Requirements

- `REQ-MPRI-001` — Workspace Markdown preview shall resolve relative inline image sources against the containing directory of the Markdown document being previewed.
- `REQ-MPRI-002` — Supported relative forms shall include `image.png`, `./image.png`, nested paths such as `assets/image.png`, and parent paths such as `../assets/image.png` only when the normalized result remains inside the same workspace.
- `REQ-MPRI-003` — Resolved workspace images shall load through the existing workspace content boundary identified by both `workspaceId` and normalized workspace-relative file path.
- `REQ-MPRI-004` — Phone Access/mobile preview shall attach the active credential through authorized fetch and use managed object URLs when a protected resource cannot be loaded directly by an `<img>` request.
- `REQ-MPRI-005` — Existing supported non-relative sources, including HTTP(S) and image data URLs, shall retain their current rendering behavior and shall not be rewritten as workspace paths.
- `REQ-MPRI-006` — Missing, unreadable, malformed, unsupported, or rejected relative image sources shall fail locally at the image while preserving the remainder of the Markdown preview and its alt text.
- `REQ-MPRI-007` — Generic Markdown consumers without an explicit workspace-document resource context shall retain current context-neutral behavior; the fix shall not infer the active workspace globally.
- `REQ-MPRI-008` — Preview resource loading shall react to document/content/context changes and to Phone Access credential establishment, replacement, or removal even when image source URLs are unchanged; obsolete direct/blob results shall be invalidated and obsolete blob/object URLs revoked on every transition and unmount.
- `REQ-MPRI-009` — The server workspace content boundary shall reject normalized paths outside the selected workspace, including sibling paths that merely share the workspace root's string prefix.
- `REQ-MPRI-010` — Previewing shall not mutate Markdown source or referenced image files.
- `REQ-MPRI-011` — Existing Markdown features—prose, code highlighting, KaTeX, Mermaid, sanitization, and external-link handling—shall continue to work.

## Acceptance Criteria

- `AC-MPRI-001` — Given `docs/readme.md` containing `![Diagram](assets/diagram.png)` and an existing `docs/assets/diagram.png`, workspace preview displays the image rather than a broken-image indicator.
- `AC-MPRI-002` — Given a nested document and valid `./` or `../` references whose normalized targets remain within the workspace, preview resolves each target relative to the document directory.
- `AC-MPRI-003` — A valid workspace-relative image with spaces or percent-encoded path characters resolves to the intended workspace file without double encoding.
- `AC-MPRI-004` — Desktop workspace preview loads a resolved image from the currently bound node's workspace content endpoint using the explicit workspace identity.
- `AC-MPRI-005` — Mobile workspace preview with an active Phone Access credential loads the same resolved image through authorized fetch/object-URL handling.
- `AC-MPRI-006` — A relative path that normalizes outside the workspace is rejected before display, and a direct sibling-prefix traversal request to the server content boundary is rejected.
- `AC-MPRI-007` — A missing or rejected image leaves the Markdown document visible and preserves meaningful alt text; it does not crash or blank preview.
- `AC-MPRI-008` — HTTP(S) and data-backed images continue to render without being converted into workspace content URLs.
- `AC-MPRI-009` — Conversation/task/team Markdown without workspace resource context is not silently resolved against the active workspace.
- `AC-MPRI-010` — Changing files, workspaces, bound nodes, or establishing/replacing/removing the Phone Access credential does not retain a previous image binding, credential-classification result, content, or unreleased object URL; unchanged source URLs are reclassified and reloaded using only the current credential state.
- `AC-MPRI-011` — Existing MarkdownRenderer and FileViewer coverage continues to pass, with new focused coverage for URL classification, path resolution, rendering, authorized loading, cleanup, and server containment.

## Constraints / Dependencies

- Use the existing `markdown-it` + DOMPurify rendering pipeline; do not introduce a parallel Markdown parser.
- Use the existing bound-node REST endpoint owner and remote-access authorized transport/object-URL mechanisms.
- Do not weaken DOMPurify URL sanitization globally or enable unknown protocols merely to support workspace images.
- Do not use the globally active workspace as an implicit resource base; identity must be supplied by the owning workspace file surface.
- Browser-generated blob URLs must be revoked deterministically.
- Server containment remains authoritative even when frontend normalization rejects obvious traversal.

## Persisted Data Outcome (When Applicable)

- Stored subject / location: Markdown source and referenced workspace images remain ordinary files; no stored model changes.
- Required outcome (`Not Affected`/`Directly Usable — No Migration`/`Discard or Rebuild`/`Migration Required`/`Undetermined`): `Not Affected`
- Existing data to preserve, discard/rebuild, transform, or quarantine: Preserve all source and asset files unchanged.
- Unacceptable data loss or corruption: Any source rewrite, asset mutation, or persisted application URL inserted into the Markdown file.
- Relevant availability, maintenance-window, or rollout constraints: None.
- Related requirement and acceptance-criteria IDs: `REQ-MPRI-001`–`REQ-MPRI-011`; `AC-MPRI-001`–`AC-MPRI-011`

## Assumptions

- The reported files are workspace-relative paths, as shown by the Files tree and the sample `.article-work/.../article-product-first.md`.
- Browser-supported image formats can be streamed by the existing workspace content route with the detected MIME type.
- A missing image may retain the browser's broken-image presentation as long as alt text and the surrounding Markdown remain usable.

## Risks / Open Questions

- Artifact and team-reference Markdown may need their own resource identity contracts in a future task; applying workspace guessing now would cross ownership boundaries.
- The existing `local-file://` protocol is intentionally not enabled through DOMPurify for this scope; standalone absolute local Markdown remains unsupported for relative images.
- Query strings and SVG fragment identifiers on local relative sources need precise path/fragment handling in design; they must never become part of the filesystem path accidentally.
- Symlink semantics remain governed by the existing workspace content policy and are not redefined by this task.

## Requirement-To-Use-Case Coverage

| Use Case | Covered Requirements |
| --- | --- |
| Desktop workspace relative image preview | `REQ-MPRI-001`, `REQ-MPRI-002`, `REQ-MPRI-003`, `REQ-MPRI-005`, `REQ-MPRI-008`, `REQ-MPRI-010`, `REQ-MPRI-011` |
| Mobile authorized workspace relative image preview | `REQ-MPRI-001`, `REQ-MPRI-003`, `REQ-MPRI-004`, `REQ-MPRI-008` |
| Missing/rejected image resilience | `REQ-MPRI-006`, `REQ-MPRI-009` |
| Non-workspace Markdown no-regression | `REQ-MPRI-005`, `REQ-MPRI-007`, `REQ-MPRI-011` |
| Workspace traversal prevention | `REQ-MPRI-002`, `REQ-MPRI-009` |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion | Intended Scenario Class |
| --- | --- |
| `AC-MPRI-001` | Primary happy path using the reported `assets/...` shape |
| `AC-MPRI-002` | Nested path normalization matrix |
| `AC-MPRI-003` | Encoding/path-character regression |
| `AC-MPRI-004` | Bound-node desktop resource URL integration |
| `AC-MPRI-005` | Mobile authorized resource integration |
| `AC-MPRI-006` | Frontend and server traversal/security matrix |
| `AC-MPRI-007` | Missing/rejected resource failure isolation |
| `AC-MPRI-008` | Remote/data source regression |
| `AC-MPRI-009` | Shared Markdown consumer boundary regression |
| `AC-MPRI-010` | Reactive context and object-URL lifecycle |
| `AC-MPRI-011` | Existing and new durable coverage |

## Approval Status

`Approved by the user on 2026-07-12`. The user confirmed that workspace Markdown/README preview must resolve images automatically so VS Code is no longer needed for correct preview, and explicitly authorized production of a design following the shared design principles.
