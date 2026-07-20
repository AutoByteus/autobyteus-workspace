# Implementation Handoff

## Ticket / Review Gate

- Ticket: `event-monitor-file-uri-internal-preview`
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-file-uri-internal-preview`
- Branch: `codex/event-monitor-file-uri-internal-preview`
- Architecture review: **Pass, round 2**
- Implementation status: **URI resolver and inert invalid-link local fix complete; resubmission required for implementation source review**

## Upstream Artifact Package

- Requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-file-uri-internal-preview/tickets/done/event-monitor-file-uri-internal-preview/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-file-uri-internal-preview/tickets/done/event-monitor-file-uri-internal-preview/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-file-uri-internal-preview/tickets/done/event-monitor-file-uri-internal-preview/design-spec.md`
- User verification / display-preservation supplement: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-file-uri-internal-preview/tickets/done/event-monitor-file-uri-internal-preview/user-verification-file-uri-display-preservation-report.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-file-uri-internal-preview/tickets/done/event-monitor-file-uri-internal-preview/design-review-report.md`

Finalized predecessor package:

- Predecessor requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-file-uri-internal-preview/tickets/done/event-monitor-absolute-path-file-preview/requirements.md`
- Predecessor investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-file-uri-internal-preview/tickets/done/event-monitor-absolute-path-file-preview/investigation-notes.md`
- Predecessor design: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-file-uri-internal-preview/tickets/done/event-monitor-absolute-path-file-preview/design-spec.md`
- Predecessor design review: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-file-uri-internal-preview/tickets/done/event-monitor-absolute-path-file-preview/design-review-report.md`
- Predecessor implementation handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-file-uri-internal-preview/tickets/done/event-monitor-absolute-path-file-preview/implementation-handoff.md`
- Predecessor source review: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-file-uri-internal-preview/tickets/done/event-monitor-absolute-path-file-preview/code-review-report.md`
- Predecessor API/E2E execution: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-file-uri-internal-preview/tickets/done/event-monitor-absolute-path-file-preview/api-e2e-execution-coverage-report.md`
- Predecessor API/E2E test review: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-file-uri-internal-preview/tickets/done/event-monitor-absolute-path-file-preview/api-e2e-test-review-report.md`
- Predecessor delivery handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-file-uri-internal-preview/tickets/done/event-monitor-absolute-path-file-preview/handoff-summary.md`
- Predecessor user verification supplements: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-file-uri-internal-preview/tickets/done/event-monitor-absolute-path-file-preview/user-verification-file-link-label-report.md`, `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-file-uri-internal-preview/tickets/done/event-monitor-absolute-path-file-preview/user-verification-invalid-absolute-path-report.md`, `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-file-uri-internal-preview/tickets/done/event-monitor-absolute-path-file-preview/user-verification-unsupported-file-preview-report.md`

## What Changed

- Added `resolveEventMonitorMarkdownFileDestination()` as a pure three-way raw-destination policy: `not-file`, `valid`, or `invalid-file`.
- Valid `file:` destinations require case-insensitive `file` scheme, empty authority, no query/fragment, one URI decode, absolute POSIX or Windows-drive path, complete components, and a supported FileViewer family. `file:///C:/...` and encoded Windows separators normalize to `C:/...`.
- Added optional `rawDestination` provenance to the existing `AbsoluteFilePathAction`; it remains in the in-memory action map/event payload and is never emitted into sanitized HTML.
- Enabled MarkdownIt to retain `file:` link tokens only for the Event Monitor capability. Generic Markdown stays on its existing validation path.
- Valid file URI links use the existing compact authored-label action anchor and existing launcher boundary. Invalid or unsupported Event Monitor file links render their child content inside a non-anchor inert span with a sanitizer-safe boolean marker, so generic/native navigation cannot run.
- Invalid, incomplete, malformed, non-empty-authority, query/fragment, root-only, NUL-containing, and unsupported URI candidates receive no action, no focusable control, and no runtime access request. Runtime workspace mapping remains activation-time launcher behavior and was not added to rendering.
- Extended the existing Windows root normalization guard so drive-root-only paths are rejected lexically without filesystem checks.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-URI-001 | Valid supported `file:///` links become the existing Event Monitor action | `absoluteFilePathAction.ts`; `useMarkdownSegments.ts`; `MarkdownRenderer.vue` | Raw token resolver registers the existing `AbsoluteFilePathAction`; authored labels remain visible. |
| BEH-URI-002 | Invalid file links are inert rather than browser/native links | `useMarkdownSegments.ts` link metadata and renderer `link_open`/`link_close` rules | Invalid links become non-anchor spans with `data-event-monitor-invalid-file-link`; no action marker or generic fallback remains. |
| BEH-URI-003 | Valid URI label and preview presentation reuse predecessor behavior | Existing action anchor and `file-path-action` event; existing `useEventMonitorFilePreview.ts` boundary | No launcher/viewer change; pointer/Enter/Space and read-only Files flow remain predecessor-owned. |
| BEH-URI-004 | Shared path completeness/type policy applies | `resolveEventMonitorMarkdownFileDestination()` -> `normalizeAbsoluteFilePath()` -> `determineFilePreviewType()` | Placeholder/traversal, root-only, malformed, authority, query/fragment, NUL, and unsupported candidates are rejected. Dotted complete names remain valid. |
| BEH-URI-005 | Raw destination is retained only in memory | `AbsoluteFilePathAction.rawDestination`; opaque action ID/data marker in `useMarkdownSegments.ts` | Renderer tests confirm raw URI is absent from sanitized HTML while emitted action retains provenance. |
| BEH-URI-006 | Trusted Electron/remote/mobile boundaries remain authoritative | Existing `useEventMonitorFilePreview.ts`, File Explorer, Electron, and workspace owners | No filesystem, store, network, endpoint, or mapping call was added to render-time classification. |
| BEH-URI-007 | Rendering is pure and passive | `absoluteFilePathAction.ts`; computed `useMarkdownSegments` model | Resolver performs no I/O. Invalid activation emits no action; valid activation remains explicit-event only. |
| BEH-URI-008 | Non-file and generic Markdown behavior remains compatible | Capability-gated validator override and existing generic renderer path | File URI token support is enabled only when Event Monitor actions are enabled; HTTP(S), relative, data, blob, mailto, and generic consumers retain their existing path. |
| BEH-URI-009 | Valid but remote-unmapped URI remains a valid action | Existing `useEventMonitorFilePreview.ts` activation mapping branch | No mapping behavior was changed; source review/API-E2E must verify unavailable status occurs before Files/mobile/content access. |

## Key Files Or Areas

- `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-file-uri-internal-preview/autobyteus-web/utils/eventMonitorFilePaths/absoluteFilePathAction.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-file-uri-internal-preview/autobyteus-web/composables/useMarkdownSegments.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-file-uri-internal-preview/autobyteus-web/components/conversation/segments/renderer/MarkdownRenderer.vue`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-file-uri-internal-preview/autobyteus-web/utils/eventMonitorFilePaths/__tests__/absoluteFilePathAction.spec.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-file-uri-internal-preview/autobyteus-web/components/conversation/segments/renderer/__tests__/MarkdownRenderer.spec.ts`
- Existing launcher boundary: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-file-uri-internal-preview/autobyteus-web/composables/useEventMonitorFilePreview.ts`

## Important Assumptions

- A `file:` destination is classified from the raw Markdown token, never from browser-resolved `anchor.href`.
- Non-empty URI authorities are never treated as local authorization, including `localhost`.
- A syntactically valid supported URI remains an action even if runtime browser/remote mapping later reports unavailable.
- Rendering performs no existence, readability, workspace, Electron, or network check.
- Raw URI provenance is transient and is not emitted into DOM attributes, persisted records, artifact/reference rows, or API requests.

## Known Risks

- Browser/Electron differences in `file:` URL parsing and Windows drive/backslash encoding still require downstream browser/native validation.
- DOMPurify post-sanitization behavior for valid action IDs and inert markers is covered in component tests but needs browser-level confirmation.
- No authenticated Event Monitor, packaged Electron, Windows, or remote-unmapped live journey was run by this implementation stage.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: feature extension plus navigation-safety correction.
- Reviewed root-cause classification: local implementation defect at the protocol-link parsing/activation seam.
- Reviewed refactor decision: No Refactor Needed.
- Implementation matched the reviewed assessment: Yes.
- If challenged, routed as Design Impact: N/A; no design mismatch was found.
- Evidence / notes: Existing action identity, renderer event authority, launcher, File Explorer, and trusted native/server owners were reused. The only new shared structure is the narrow pure three-way resolver result and optional raw provenance field.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: None.
- Legacy old-behavior retained in scope: No; Event Monitor `file:` fall-through is replaced by explicit valid-action or inert behavior.
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: Yes; the old absolute-only Markdown-link normalizer path was replaced by the shared three-way resolver.
- Shared structures remain tight: Yes; no second action/viewer model or arbitrary URL shape was introduced.
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: Yes.
- Changed source implementation files stayed within proactive size-pressure guardrails: Yes; changed source files remain below 500 effective non-empty lines and no large split signal was introduced.
- Notes: The validator override is capability-gated so generic Markdown behavior is not broadened.

## Persisted Data Transition Check

- Approved decision: Directly Usable — No Migration.
- Design-spec decision reference: `design-spec.md` Persisted Data / State Transition Decision.
- Implementation follows the approved decision without an unapproved migration or version-specific runtime fallback: Yes.
- Direct-use evidence: URI actions and inert markers are transient render-model state only; existing File Explorer tabs and structured ownership are untouched.
- Deviation from the reviewed transition decision: None.

## Environment Or Dependency Notes

- The worktree initially had no frontend dependencies or generated Nuxt config. A temporary ignored symlink to the existing predecessor worktree's `autobyteus-web/node_modules` was used, followed by `pnpm --dir autobyteus-web exec nuxt prepare` to generate ignored `.nuxt` types.
- The temporary dependency symlink must be removed before final handoff/commit cleanup; it is ignored and is not part of the implementation commit.
- No API/E2E environment or packaged/native runtime was started by this implementation stage.

## Local Implementation Checks Run

- `pnpm --dir autobyteus-web exec nuxt prepare` — passed.
- Focused URI/path and MarkdownRenderer suite: `2 files, 55 tests passed`.
- Combined URI/path, renderer, composable, File Explorer policy/routing suite: `5 files, 85 tests passed`.
- Broader changed-chain suite including predecessor Markdown, conversation, mobile, File Explorer, store, and panel tests: `15 files, 137 tests passed`.
- `git diff --check` — passed.
- `pnpm --dir autobyteus-web audit:localization-literals` — passed with zero unresolved findings.
- `pnpm --dir autobyteus-web guard:localization-boundary` — passed.
- `pnpm --dir autobyteus-web guard:web-boundary` — passed.
- These are implementation-scoped checks only; no API/E2E or executable coverage sign-off is claimed.

## Frontend Rendered-Result Check

- Affected surfaces / journeys: Event Monitor Markdown authored file-URI labels, valid action anchors, invalid inert links, and generic Markdown compatibility.
- Approved references: `requirements.md` REQ-URI-003/004/005/007/008; `design-spec.md` BEH-URI-001/002/003/005/007/008; `user-verification-file-uri-display-preservation-report.md`.
- Existing design system / adjacent surfaces reviewed: predecessor compact underlined file-action anchor, MarkdownRenderer delegated events/accessibility, DOMPurify markers, and existing launcher/read-only preview path.
- Rendered surface used: Vue Test Utils mounted `MarkdownRenderer` with DOMPurify output and pointer/keyboard interactions; no independent browser/dev server was started.
- States/interactions inspected: valid POSIX/Windows URI actions, authored-label preservation, aria/title metadata, invalid/unsupported/authority/query/fragment links, no-anchor inertness, raw URI absence, click/Enter/Space no-op for invalid links, default-off rendering.
- Visual/interaction issues corrected: implemented the inert non-anchor shell and prevented invalid file links from reaching generic/native navigation; preserved label-only compact action presentation.
- Remaining limitations: real browser file-URI parsing, packaged Electron, Windows, authenticated Event Monitor, and runtime remote-unmapped status remain downstream validation responsibilities.

## Downstream Coverage Hints / Suggested Scenarios

- Raw-token valid `file:///tmp/report.md` action with authored label, raw provenance in emitted action, no raw URI in DOM, compact anchor, aria/title, click/Enter/Space.
- Windows `file:///C:/Work/report.md`, encoded spaces, encoded backslashes, uppercase scheme, malformed percent escapes, root-only paths, and separator normalization.
- Inert invalid/unsupported file links for placeholder/traversal components, Unicode ellipsis, NUL, query/fragment, `file:/`, empty/non-empty authority, `.zip`, `.dmg`, installer, archive, and unknown binary; verify no anchor navigation, action event, panel switch, read, URL, workspace request, or mobile request.
- Valid but active-workspace-unmapped URI remains an action and returns existing localized unavailable status before Files/mobile/content access.
- Generic/default-off Markdown and HTTP(S), relative, data, blob, mailto, images, code, math, Mermaid, and authored-label regressions.

## API / E2E / Executable Coverage Investigation And Execution Still Required

API/E2E must independently investigate and execute browser, remote/mobile, Electron/native, and realistic Event Monitor activation coverage after implementation source review passes. This handoff claims no API/E2E pass and no packaged-artifact verification.

## Source Review Rework — CR-F-001

- Code review finding: the URI action call supplied `rawDestination` through an inline object type that did not declare the optional field in `registerFileAction()`.
- Bounded fix: added the exported `AbsoluteFilePathActionCandidate` input contract with `rawDestination?: string`; both `registerFileAction()` and `createAbsoluteFilePathAction()` now use that shared type, preserving raw provenance in the transient `AbsoluteFilePathAction`.
- Changed-scope TypeScript check: `pnpm --dir autobyteus-web exec tsc -p /tmp/event-monitor-file-uri-changed-tsconfig.json --pretty false` — passed for `absoluteFilePathAction.ts` and `useMarkdownSegments.ts`.
- Focused URI suites after the fix: 3 files, 58 tests passed (`absoluteFilePathAction.spec.ts`, `MarkdownRenderer.spec.ts`, `useMarkdownSegments.spec.ts`).
- Full project `tsc --noEmit` still reports pre-existing repository-wide diagnostics, including unresolved Vue test-component modules; no diagnostics were reported for the changed production files in the filtered output. The focused changed-scope project excludes those unrelated tests and passes.
