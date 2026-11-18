# Design Review Report — phone-viewer-pinch-zoom-472 (autobyteus-472)

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-viewer-pinch-zoom-472/tickets/in-progress/phone-viewer-pinch-zoom-472/requirements-doc.md` (Approved by the user 2026-11-11; REQ-001…006)
- Upstream Investigation Notes: `…/tickets/in-progress/phone-viewer-pinch-zoom-472/investigation-notes.md`
- Upstream Solution Revision Record: `…/tickets/in-progress/phone-viewer-pinch-zoom-472/solution-revision-record.md`
- Reviewed Design Spec: `…/tickets/in-progress/phone-viewer-pinch-zoom-472/design-spec.md` (SR-003; "Zoom state across reloads" revised for AR-001)
- Supplemental Task Artifacts Reviewed: `handoff-architecture-review.md`; no supplements
- Relevant Solution Revision IDs: SR-001, SR-002, SR-003
- Architecture Review Revision Record: `…/tickets/in-progress/phone-viewer-pinch-zoom-472/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-002`
- Current Review Round: 2
- Trigger: Solution Designer round 2 (SR-003) answering ARCH-REV-001
- Prior Review Round Reviewed: 1 (ARCH-REV-001, Fail, AR-001)
- Latest Authoritative Round: 2
- Current-State Evidence Basis: worktree `codex/phone-viewer-pinch-zoom-472` @ `ed481ae4ca` (with autobyteus-471); documents uncommitted; no source changes.

## Routing Classification Review

- Task size: `Medium`. Web: the zoom composable is moved, two viewers change, plus the bar, a download composable and the bridge client. Android: one action, a saver, tests.
- Architectural risk: `High`: a new page→app bridge action that writes files on the phone, and a new APK.
- Independent review required: `Yes`.
- Design approval: `Not required`, with a reason (no visible behavior beyond REQ-001…006), so no routing inconsistency.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`. REQ-006 now has an owner whose lifetime spans a same-path reload (AR-001 resolved).
- Approved intent: pinch, pan and double-tap zoom for PDFs (1–3×, sharp) and images (fit to 4×). A Download button saves the already-fetched bytes to Downloads (Android 10+ directly, 8–9 through the Save dialog), with a browser fallback. No credential in any URL, name, message or log. Zoom survives a same-path reload (REQ-006).
- Scope guardrail: other types, desktop viewers, iOS and the share sheet are out of scope. Preserved: back arrow, PDF page scrolling, the unzoomable page, desktop mouse zoom, VNC zoom.
- Statements about existing code, opened:
  - `MobileScreenBar` has an `actions` slot.
  - `PdfViewer` renders with `vue-pdf-embed` from `useAuthorizedObjectUrl` and resets loading on a URL or revision change (`PdfViewer.vue:40,52-55`).
  - `ShellBridgeMessages.read` ignores subframes, other origins and unknown types (`ShellBridge.kt:94-105`), so an older APK ignores `saveFile`, as the design says.
  - The manifest has no storage permission (`AndroidManifest.xml:3-5`).
  - All match the design.
- Round 2: the design now cites the unmount itself (`MobileFileViewer.vue:7-9`, `fileExplorerContentActions.ts:213`, `useMobileNodeFile.ts:47-51`) and places the state in `MobileFileViewer`. That component is mounted per open file in `MobileFiles.vue` (`v-if="openPath"`, `v-else-if="nodeFileSource"`, lines 69-84) and is not keyed by URL, so it survives the reload.

| Behavior / REQ | Kind | Design Alignment | Trigger / Evidence | Target Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-001 PDF zoom | User | Pass | Pass | Pass (gesture mechanism to prove first, R-1) | Confirmed | — |
| REQ-002 Image zoom | User | Pass | Pass | Pass | Confirmed | — |
| REQ-003 Page not zoomable | User | Pass | Pass (WebView zoom off) | Pass | Confirmed | — |
| REQ-004/005 Download | User / Security | Pass | Pass | Pass (R-2 hardening) | Confirmed | — |
| REQ-006 Zoom kept on reload | User | Pass | Pass | Pass (`useViewerZoomMemory` owned by `MobileFileViewer`) | Confirmed | — |

## Supplemental Artifact Coherence Verdict

None.

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment present | Pass | Change posture, triggers and refactor decision are given through the change-scope and rename sections. There is no separate health section | — |
| Root cause / refactor decision | Pass | Feature. Reuse of `useNodeDesktopZoom` under a truthful name (`usePictureZoom`, Principle 15) is the only refactor | — |

## Spine Inventory Verdict

| Spine ID | Scope | Readable? | Narrative Clear? | Facade Vs Owner? | Naming Clear? | One Owner Per Node, In Order? | Off-Spine Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 PDF zoom | Bounded (in `PdfViewer`) | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-002 Image zoom | Bounded (in `ImageViewer`) | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-003 Download | Primary (page → app → Downloads) | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| Zoom across a same-path reload (REQ-006) | Lifecycle | Pass | Pass | Pass (`MobileFileViewer` owns; viewers apply on loaded/load and write back on committed gestures) | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Entry Point Clear? | Internals Internal? | Bypass Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Shell bridge (`ShellBridgeMessages.read`) | Pass | Pass | Pass | Pass | Main frame, node origin and type rules are kept in one JVM-testable place |
| `DownloadsSaver` | Pass | Pass | Pass | Pass | `MainActivity` wires it and the document result |
| `useMobileFileDownload` | Pass | Pass | Pass | Pass | Bar button → composable → `shellBridge.saveFile` or `<a download>` |

## Dependency Direction / Forbidden Shortcut Verdict

Pass. Page → `shellBridge.ts` → bridge → app. `ImageViewer` (shared, desktop too) depends on `usePictureZoom` only when `touchZoom` is set. Desktop behavior is unchanged.

## Interface Boundary Verdict

| Interface | Subject Clear? | Singular? | Identity Explicit? | Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| Bridge `saveFile { fileName, mimeType, base64 }` | Pass | Pass | Pass | Low (R-2) | Pass |
| `FileViewer` prop `touchZoom` | Pass | Pass | N/A | Low | Pass |
| Bar `actions` slot Download | Pass | Pass | N/A | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

Pass. Reused: the VNC touch zoom (renamed and moved to a shared place), the bridge's origin and frame rules, the open file state's `url`, and `authorizedFetch`. No second loading path is added.

## Subsystem / Capability-Area Allocation Verdict

Pass. `usePdfPinchZoom` is in `composables/` (R-3 settled).

## Reusable Owned Structures Verdict

Pass.

## Shared Structure / Data Model Tightness Verdict

Pass. Derived consumers of the rename (`MobileNodeDesktop.vue` and its tests) and of the bridge message set (`ShellBridgeMessages.read`, `shellBridge.ts`) are listed. Vocabulary: `usePictureZoom` now says what it does (`Pass`).

## File Responsibility Mapping Verdict

Pass. `useViewerZoomMemory` (new, `composables/mobile/`) holds the path-keyed state; `usePdfPinchZoom` sits in `composables/` next to `usePictureZoom`.

## Subsystem / Folder / File Placement Verdict

Pass.

## Removal / Decommission Completeness Verdict

Pass. `composables/mobile/useNodeDesktopZoom.ts` is moved and renamed, with no alias left behind.

## Legacy / Backward-Compatibility Verdict

Pass. No capability negotiation (DESIGN.md rule 9). An older APK ignores the unknown `saveFile`, and the release note asks for the new APK.

## Persisted-Data Transition Verdict

N/A (`Not Affected`).

## Change / Refactor Safety Verdict

Pass. Sequence: rename, viewers, download, Android, probe.

## Example Adequacy Verdict

| Topic | Needed? | Present? | Bad Shape? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Bridge message | Yes | Pass | N/A | Pass | — |
| PDF zoom flow | Yes | Pass | N/A | Pass | — |
| Zoom kept across reload | Yes | Pass | Pass ("cannot live in the viewers", with the reason) | Pass | Shape, reset rule, apply and write-back points, test |

## Material Premise Validation

- P-001 — a same-path reload happens while a file is zoomed on the phone.
  - Basis: User / System. REQ-006 names it: a live refresh (452), an explicit open again (450), a node-file reload (471).
  - Path, workspace file: `_reloadOpenFile` sets `fileState.isLoading = true` (`stores/fileExplorerContentActions.ts:213`) before loading again. `MobileFileViewer`'s `v-else-if="isLoading"` replaces `<FileViewer>` with "Opening…" (`MobileFileViewer.vue:7-9`, `isLoading` at `:40`), so `PdfViewer`/`ImageViewer` unmount.
  - Path, node file: `useMobileNodeFile.load` sets a new state with `isLoading: true` (`useMobileNodeFile.ts:47-51`), with the same result.
  - Reachability: `Reachable`. It drove AR-001 in round 1. The round-2 design handles it: the holder in `MobileFileViewer` survives, and the viewers re-apply after `loaded`/`load`.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Pass`

## Findings

None open. AR-001 is resolved (ARCH-REV-002). R-1, R-2 and R-3 are now in the design's Guidance For Implementation, and the design follows them:
- prove the WebView pinch first, with the non-passive touch fallback;
- the file name's extension must match the MIME type;
- decode and write off the main thread;
- Android 8–9 activity re-creation;
- ArrayBuffer messages optional, base64 as the baseline;
- `usePdfPinchZoom` in `composables/`.

## Classification

N/A (Pass).

## Recommended Recipient

Implementation engineer (`/software_engineering_team/implementation_engineer`).

## Residual Risks

- RSK-001: memory at 3× on long PDFs.
- RSK-002: a single large base64 message.
- RSK-003: iOS not built.
- autobyteus-452 (another copy) edits `FileViewer.vue` and the reload path. This design changes `MobileFileViewer.vue` and `FileViewer.vue` (props), so coordinate at merge.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass` (P-001 Reachable and handled by the round-2 owner)
- Notes: Ready for implementation in its stated sequence. A new APK is needed for Download, and release happens only on the user's word.
