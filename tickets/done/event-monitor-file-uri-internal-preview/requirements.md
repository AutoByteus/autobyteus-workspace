# Requirements Doc

## Status

Refined — design-ready for architecture review

## Goal / Problem Statement

Standard Markdown links with local `file:///` destinations are common in Event Monitor output. The existing renderer presents them as ordinary links, and activation can fall through to browser/native `file:` handling. The user wants the visible file label to use the already implemented Event Monitor Files preview flow when the destination is a valid, complete, supported local file path. Invalid or unsupported destinations must remain displayed as they are but must not be actionable.

This ticket is a small follow-up to the finalized [`event-monitor-absolute-path-file-preview`](../../done/event-monitor-absolute-path-file-preview/task.md) ticket. It adds protocol-form Markdown-link recognition only; it does not redesign the Files viewer, mobile bridge, Electron boundary, path policy, or artifact ownership.

The user-visible display decision is recorded in [`user-verification-file-uri-display-preservation-report.md`](./user-verification-file-uri-display-preservation-report.md).

## Current And Desired Behavior

| Behavior ID | Current Behavior | Desired Behavior | Preserved / Unchanged Behavior | Evidence / Requirements |
| --- | --- | --- | --- | --- |
| BEH-URI-001 | Event Monitor opts into `useMarkdownSegments` file actions, but `normalizeMarkdownLinkPath` only accepts decoded POSIX or Windows paths. A raw `file:///...` destination is not classified as an action. | A supported `file:///` destination is parsed from the raw Markdown link token and becomes the same typed Event Monitor file action used for absolute-path links. | Bare absolute-path recognition and the Event Monitor-only opt-in remain unchanged. | `useMarkdownSegments.ts`; `task.md`; REQ-URI-001/002 |
| BEH-URI-002 | The generic link handler intercepts HTTP(S) links. An unrecognized `file:` link can retain browser/native navigation semantics. | In Event Monitor mode, every `file:` link is either a valid typed action or an inert link. No invalid file URI reaches browser/native navigation. | Non-Event-Monitor Markdown consumers and non-file protocols retain their current behavior. | `MarkdownRenderer.vue`; REQ-URI-003/007 |
| BEH-URI-003 | The predecessor renders supported path actions as compact underlined controls and uses the existing `useEventMonitorFilePreview` launcher. | A valid file URI keeps the authored Markdown label and normal link-like visual treatment, emits the typed action on pointer/Enter/Space, and opens the same read-only Files preview when an owner is available. No generated visible `Open`/`in Files` wording or second button is introduced. | Existing right-panel, Files, tab-deduplication, read-only, Electron, mobile, and active-workspace mapping behavior remains the owner. | Prior ticket completed artifacts; supplement; REQ-URI-004/005/010 |
| BEH-URI-004 | Placeholder/traversal components and unsupported extensions are rejected for bare absolute-path actions, but protocol links have no equivalent classification. | Decode and validate the URI path with the shared absolute-path and supported-preview policies. Reject malformed escapes, non-empty hosts, query/fragment ambiguity, NUL, root-only paths, `.`, `..`, `...`, Unicode `…`, unsupported families, and other incomplete candidates. | A normal filename containing dots remains eligible when its path is complete and its type is supported. | `absoluteFilePathAction.ts`; `fileTypePolicy.ts`; REQ-URI-002/006 |
| BEH-URI-005 | A raw Markdown link has a browser-resolved `href` after rendering; the existing action model does not retain a file-URI token contract. | The render model retains a stable action ID and raw destination metadata before sanitization. Sanitized HTML contains only the safe action marker needed to resolve the typed action; launcher code never authorizes from `anchor.href`. | DOMPurify, Markdown rendering, code/source copying, and managed-image behavior remain intact. | `useMarkdownSegments.ts`; REQ-URI-003/008 |
| BEH-URI-006 | Electron/local preview and browser/remote active-workspace mapping already exist for predecessor absolute-path actions. | A valid URI only enters those existing owners after explicit activation: Electron uses trusted local validation; browser/remote/mobile uses active-workspace relative mapping. No URI authority or raw absolute path grants access. | No new server endpoint, persistence, artifact/reference row, or direct renderer filesystem read is added. | `useEventMonitorFilePreview.ts`; REQ-URI-009/010 |
| BEH-URI-007 | Rendering can create actions only when the source happens to parse as a supported bare path; passive rendering itself does not launch the preview. | URI classification is pure and side-effect free. Message arrival, rerender, hydration, and route changes do not open Files, read bytes, switch panels, or steal focus. | Explicit activation keeps existing focus and panel semantics. | Predecessor tests and launcher; REQ-URI-005/011 |
| BEH-URI-008 | Ordinary HTTP(S), relative, data, blob, mailto, and other non-file links use existing generic behavior. | Those links remain unchanged. Only Event Monitor-enabled Markdown file links receive the new protocol policy. | Shared Markdown renderer defaults remain off outside Event Monitor. | `MarkdownRenderer.vue`; REQ-URI-012 |
| BEH-URI-009 | Browser/remote activation may fail to map an otherwise syntactically valid absolute path into the active workspace. | The valid link remains activatable, but mapping failure returns the existing localized host-only/unavailable result before Files/mobile preview or content access. It is not rendered as a lexical-invalid inert marker. | Electron-local valid paths still use the trusted native path; no runtime may treat a URI authority as authorization. | `useEventMonitorFilePreview.ts`; REQ-URI-010; AC-URI-009/010 |

## Supplemental Artifact Inventory

| Artifact | Purpose | Status | Approval applicability | Related requirements |
| --- | --- | --- | --- | --- |
| [`user-verification-file-uri-display-preservation-report.md`](./user-verification-file-uri-display-preservation-report.md) | Records the user's screenshot evidence, valid-label/internal-preview versus lexical-invalid-inert display decision, and the distinct remote-unmapped activation status. | Current | Applicable for visible/lexical-invalid behavior; runtime mapping outcome is an architecture boundary decision | REQ-URI-003/004/010 |

## Functional Requirements

### REQ-URI-001 — Event Monitor-only protocol capability

Recognize local file URI destinations only when `MarkdownRenderer` is enabled with the existing Event Monitor file-action capability. The default shared Markdown renderer behavior must remain unchanged for file links outside the central Event Monitor.

### REQ-URI-002 — Safe `file:///` destination grammar

At the raw Markdown link-token boundary, accept only a `file` scheme (case-insensitive) with an empty authority and an absolute decoded path:

- POSIX form: `file:///Users/name/report.md`;
- Windows drive form: `file:///C:/Work/report.md` after URI decoding.

Percent-encoded spaces and Windows separators may be decoded once. Reject malformed percent escapes, NUL, root-only paths, non-empty hosts/authorities, query or fragment components, protocol-relative/relative forms, and path components exactly equal to `.`, `..`, `...`, or Unicode `…`. A normal extension dot inside a filename is not a rejection condition. The resulting path must pass the existing absolute-path normalizer and shared supported-preview-type policy.

### REQ-URI-003 — Raw-token action contract and inert invalid links

The Event Monitor Markdown render model must classify the raw destination before sanitization and retain a typed action descriptor containing at least the action ID, raw destination, canonical absolute path, source kind, display label, and preview type. A valid action must not be reconstructed from `anchor.href`.

When Event Monitor mode encounters a lexically invalid or unsupported `file:` link that does not produce a valid action, it must preserve the current source-faithful visible representation while making the link inert. Pointer, Enter, and Space must not navigate to a browser/native file handler, emit a file action, or initiate a content request. Invalid links must not receive the valid-action visual/keyboard affordance. A syntactically valid supported action is not made inert merely because a browser/remote workspace mapping is unavailable; that case is handled after explicit activation by REQ-URI-010.

### REQ-URI-004 — Preserve the agreed visual presentation

For a valid supported URI, preserve the normal authored Markdown label and the predecessor compact underlined link-style treatment. Do not add a separate bordered button, generate visible `Open`/`in Files` wording, or duplicate the long URI as a generated label. The valid label remains copyable and has an accessible descriptive name/title containing the file context.

For an invalid/unsupported URI, retain the current visible Markdown/source representation rather than replacing it with a fallback action or error button; only its Event Monitor activation semantics become inert. A valid but unmapped browser/remote URI keeps the normal valid-link label/affordance and reports host-only/unavailable only after explicit activation. No unrelated prose, inline code, or fenced code is reformatted.

### REQ-URI-005 — Explicit activation and no passive effects

On pointer click, Enter, or Space for a valid action, prevent default link navigation, stop the generic link handler, and emit the typed action exactly once for the activation. Reuse the existing Event Monitor launcher: when an owner is available it opens the normal Files surface, selects the file, preserves the conversation, and requests read-only preview behavior; when browser/remote mapping is unavailable it returns the host-only/unavailable status without Files/mobile/content access. Rendering, message arrival, rerender, and hydration must not open panels, switch tabs, read bytes, or change focus.

### REQ-URI-006 — Shared file-type policy

Use the existing pure `determineFilePreviewType` policy before creating an action. Supported text/code, image, audio, video, PDF, CSV, and Excel families may produce actions. Unknown binaries, archives, installers, `.zip`, `.dmg`, and other unsupported types remain source-faithful and inert without Electron text IPC, local-file media URL creation, workspace content fetch, or Files navigation.

### REQ-URI-007 — Existing generic link behavior and scoped sanitization

HTTP(S), relative, data, blob, mailto, and other non-file links retain their existing behavior. DOMPurify must continue to sanitize the rendered HTML. Any action or inert-file marker added to sanitized HTML must be a safe, renderer-owned data attribute; no raw filesystem path is trusted from a browser-resolved URL.

### REQ-URI-008 — Preserve Markdown and copying behavior

The change must not regress Markdown headings, lists, nested link labels, inline/fenced code copying, syntax highlighting, math, Mermaid, managed image resolution, selection, or text rendering. A standard Markdown link's authored label remains the visible label; code tokens remain literal and are not treated as URI actions unless the existing predecessor code-path behavior independently applies.

### REQ-URI-009 — Trusted Electron boundary

When the existing embedded Electron runtime owns a valid activated local URI, route it through the existing trusted main/preload/local-file capability. The trusted boundary must continue to validate absolute shape, existence, readability, and regular-file status before returning bytes. The renderer must not read the filesystem directly.

### REQ-URI-010 — Remote/mobile authorization boundary

In browser/remote/mobile runtimes, map the decoded absolute path only to an authorized relative locator inside the active workspace and use the existing authorized workspace content route. A syntactically valid supported action remains explicitly activatable; if mapping is absent or the URI is outside the active workspace, the launcher returns the existing localized unavailable/host-only status before opening Files, issuing a mobile preview request, or fetching bytes. Do not accept a URI host or arbitrary absolute path as authorization.

### REQ-URI-011 — No persistence or ownership change

An activated URI is either a transient read-only preview or an activation-time unavailable result. Neither outcome may create or mutate Message references, Team Message references, Agent artifacts, context-file rows, or persisted records. Existing structured references and artifact ownership remain unchanged.

### REQ-URI-012 — Compatibility boundary

The new behavior must be opt-in through the existing Event Monitor capability. Existing bare absolute path actions from the predecessor remain valid and follow their current policy. Ordinary Markdown consumers and all non-file link classes retain their current behavior.

## Acceptance Criteria

### Recognition and valid activation

- **AC-URI-001:** In Event Monitor mode, `[requirements.md](file:///tmp/requirements.md)` creates one typed file action with a canonical `/tmp/requirements.md` path and authored visible label `requirements.md`.
- **AC-URI-002:** A Windows link such as `[report.md](file:///C:/Work/report.md)` resolves to `C:/Work/report.md` and creates the same action type.
- **AC-URI-003:** Encoded spaces and Windows separators decode once and are preserved in the canonical path; malformed percent encoding produces no action.
- **AC-URI-004:** Clicking a valid link prevents browser/native navigation and emits the typed action; Enter and Space provide the same result without duplicate emission.
- **AC-URI-005:** The valid link uses the compact underlined label treatment from the predecessor, has no visible `Open`/`in Files` wording or second action button, and retains accessible name/title metadata.

### Invalid, unsupported, and authorization behavior

- **AC-URI-006:** `file:///Users/name/.../report.md`, `file:///tmp/../report.md`, `file:///tmp/./report.md`, `file:///tmp/…/report.md`, and root-only or NUL-containing paths remain visible in their current representation with no action marker or Files preview.
- **AC-URI-007:** `file://other-host/tmp/report.md`, URI query/fragment variants, malformed schemes/escapes, relative forms, and non-empty authorities are inert and never navigate externally.
- **AC-URI-008:** `.zip`, `.dmg`, installer, archive, unknown binary, and other unsupported file families remain source-faithful and do not switch Files, invoke Electron text/media loading, or request workspace content.
- **AC-URI-009:** A syntactically valid supported URI outside the active browser/remote workspace remains a valid action. Explicit activation returns the existing localized host-only/unavailable result before `fileExplorerStore.openFilePreview`, mobile preview request, Files-panel switching, or workspace content fetch.
- **AC-URI-010:** A syntactically valid Electron-local URI that is missing, unreadable, or a directory reaches only the existing trusted activation-time failure/unavailable flow; it does not return arbitrary bytes. 

### Reuse and regression boundaries

- **AC-URI-011:** A valid URI with an available owner reuses the existing read-only Event Monitor launcher, normal Files panel/tab behavior, shared FileViewer, repeat-open deduplication, trusted Electron validation, and active-workspace remote/mobile mapping.
- **AC-URI-012:** Rendering or message arrival alone causes no Files panel change, file fetch, byte read, or focus change.
- **AC-URI-013:** Bare absolute paths, HTTP(S), relative, data, blob, mailto, Mermaid, images, math, code blocks, and non-Event-Monitor Markdown retain their existing behavior.
- **AC-URI-014:** No Message reference, Agent artifact, context-file record, or other persisted ownership row is created by URI activation or mapping failure.

## Constraints / Dependencies

- Existing owners: `useMarkdownSegments`, `MarkdownRenderer`, `absoluteFilePathAction`, `fileTypePolicy`, `useEventMonitorFilePreview`, `fileExplorerContentActions`, and trusted Electron/local-file code.
- The action descriptor must remain semantically tight and must not expose a generic arbitrary-URL launcher.
- Event Monitor invalid-file neutralization must occur before the generic external-link fallback.
- The implementation must use repository localization and existing accessibility conventions.
- The implementation must not broaden file URI support to remote host authorities or introduce a raw absolute-path API.

## Persisted Data Outcome

- **Outcome:** Directly usable — no migration
- **Stored data:** None added or transformed. Actions and preview state remain in-memory.
- **Preserve:** Existing File Explorer tabs, Message references, Agent artifacts, and context-file state.
- **Unacceptable loss:** Any mutation of existing artifact/reference ownership or accidental external/native navigation that bypasses the app's preview boundary.

## Scope Classification

Small-to-medium bounded feature. The visual change is minimal, but raw-token handling and inert invalid-link behavior cross the Markdown render boundary and must preserve the predecessor's security and ownership boundaries.

## Design Health Assessment

- **Change posture:** Feature extension and safety behavior change.
- **Root-cause classification:** Local implementation defect at the protocol-link parsing/activation seam; no new subsystem boundary is needed.
- **Refactor posture:** No broad refactor needed. Extend the existing typed render-model seam and launcher; do not duplicate the viewer or create a second link authority.
- **Residual risk:** Browser differences in `file:` URL parsing and Windows URI decoding require focused component tests and browser-level validation. The implementation must neutralize invalid Event Monitor file links explicitly rather than relying on browser defaults.

## Requirement-To-Use-Case Coverage

- REQ-URI-001/002/003/004 -> UC-URI-001 valid label and raw-token classification.
- REQ-URI-003/005/007/008 -> UC-URI-002 pointer and keyboard activation plus inert invalid links.
- REQ-URI-006/009/010 -> UC-URI-003 supported-type, Electron, and remote authorization behavior.
- REQ-URI-010 -> UC-URI-004 activation-time remote mapping status without Files/content access.
- REQ-URI-011/012 -> UC-URI-005 persistence and compatibility regressions.

## Acceptance-Criteria-To-Scenario Intent

- AC-URI-001–005 -> Markdown render-model and browser component scenarios.
- AC-URI-006–009 -> malformed/unsupported/authorization and no-read scenarios.
- AC-URI-009–012 -> launcher integration, mapping-failure no-request behavior, trusted local failure, and browser/live validation scenarios.
- AC-URI-013–014 -> regression and persistence scenarios.

## Approval Status

The user explicitly requested this new ticket from the finalized `origin/personal` predecessor and confirmed the valid-label/internal-preview versus invalid-inert behavior in the conversation. This requirements basis and its intended-behavior supplement are ready for architecture review; no implementation work has started.
