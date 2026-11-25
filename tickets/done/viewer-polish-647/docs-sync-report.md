# Docs Sync Report — autobyteus-647 (viewer-polish-647)

## Scope

- Ticket: `viewer-polish-647` (Project Task `autobyteus-647`): six small viewer fixes. REQ-001, the file viewer shows no line numbers (a 6 px margin, no folding column or glyph margin). REQ-002 (restated in SR-003), a zero-byte media reference reaches the media viewer, which says "This video could not be played.", instead of "Failed to fetch reference content (416)". REQ-003, on iOS the player is iOS's own player screen, not under an app bar, and every close path ends the playback and the audio session. REQ-004, the iOS loader's queue label names media. REQ-005, one shared pdf.js worker serves every PDF (autobyteus-471 FU-001). REQ-006, the run view's file status line clears when the run changes (471 FU-002).
- Trigger: API-REV-002 `Pass` (round 2, 95 %, the direct low-risk route: no test-code review required). The failure-origin review CRR-001 on API-REV-001's AC-002 failure was `Fail` (Design Impact and Requirement Gap), resolved by the Solution Designer's SR-003 and implementation's IR-002. `task_size` `Medium`, `architectural_risk` `Low`, route `Direct Low-Risk`.
- Bootstrap base reference: `origin/personal` `bc4351cad7`.
- Integrated base reference used for docs sync: `origin/personal` `2bdfea0444` (autobyteus-649, server only), merged as `694896a154`.
- Post-integration verification reference: `evidence/delivery/` on the merged tree; the release/deployment report lists it.

## Why Docs Were Updated

- Summary: the ticket updated `docs/design-cases.md` (three cases) and `docs/ios_mobile_access.md` (the iOS player). Delivery's review of the merged tree found what the change left false or missing:
  - `content_rendering.md` told readers that "line numbers appear once per line" and that line numbers do not depend on wrap; the editor now has none;
  - the web's Phone Access doc said the iOS player keeps "the app's Back bar" over a wide video; the app's bar is gone;
  - no doc named the shared pdf.js worker, the direct `pdfjs-dist` dependency or the reason for the essential build, so the next change to `PdfViewer.vue` could bring back a worker per document;
  - no doc said that a `416` to the reference viewer's `bytes=0-0` probe means an empty file, or why the viewer decides on the status alone;
  - the `design-cases.md` bullet said the desktop could not read the `Content-Range` header; only the dev window's `http://` origin cannot, and the packaged `file://` window can (implementation measured it);
  - the status line's doc did not say it clears on a run change;
- Why this should live in long-lived project docs: a later change to the viewer's media probe must keep deciding on the status (a header is readable only where the origin allows it); a later PDF change must keep one worker owner or leak a blob per document; a later iOS player change must keep AVKit's own screen on top, with the app's screen owning the playback.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `DESIGN.md` | Project design rules; rule 12 (build-only runs), Principle 7 (no dead code), Principle 15 (names) | No change | The ticket applies existing rules; the queue label (REQ-004) is a naming fix |
| `TESTING.md` | Test layers; Fresh-start build (a `package.json` and the lockfile changed) | No change | Its rule covers the build-input change (API/E2E's fresh clones at both heads, IMP-007's build-only desktop run); the base's own edit to it (autobyteus-649) came with the merge |
| `RELEASE.md` | Finalization and release rules | No change | Read from the merged tree; unchanged by the ticket |
| `docs/design-cases.md` | Design cases | Updated in the ticket; one sentence corrected by delivery | Three bullets and a case from the ticket; the bullet on the 416 header now says only the dev window's `http://` origin could not read `Content-Range` |
| `docs/ios_mobile_access.md` | The iOS app's player | Updated in the ticket (kept) | The player paragraph names `AVPlayerViewController` presented full screen, the close paths and the session; checked against `NativeMediaPlayer.swift`'s header |
| `autobyteus-web/docs/content_rendering.md` | The editor's options; the file status line | Updated by delivery | Gutter sentence corrected, status line clears on a run change, new "PDF Worker" section |
| `autobyteus-web/docs/agent_artifacts.md` | The reference viewer's probe | Updated by delivery | A paragraph on the empty reference (the `416` rule) |
| `autobyteus-web/docs/remote_access.md` | The shell bridge's full-screen paragraph | Updated by delivery | "the app's Back bar stays over it" replaced |
| `autobyteus-web/docs/file_explorer.md`, `docs/android_mobile_access.md`, `autobyteus-ios/README.md` | The viewers, the Android player, how to run iOS tests | No change | None names the gutter, the worker or the app's bar; the Android player and the apps' test commands are not touched by this ticket |
| `tickets/done/phone-video-574/release-notes.md`, `tickets/done/file-viewer-media-642/release-notes.md` | Their "Back bar" and zero-byte notes say what this ticket changes | No change | Both tickets shipped in `v1.5.15-beta.1` (a tag contains both merges, delivery checked), so their notes record what was released and stay as written; this ticket's own release note says what changed since |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-web/docs/content_rendering.md` | Behavior | "Text And Code Wrapping": the editor shows no line numbers, folding column or glyph margin, only a 6 px margin (`lineNumbers: 'off'`, `folding: false`, `glyphMargin: false`, `lineDecorationsWidth: 6`), and a caller's `options` override those defaults (`...restOptions` comes after them); the false "line numbers appear once per line" is gone. The status line paragraph: it clears when the shown run changes (`AgentEventMonitor` watches `effectiveRunId`). New section "PDF Worker": one inline module worker and one pdf.js `PDFWorker` wrapper (`utils/pdf/sharedPdfWorker.ts`), each document loaded as `{ url, worker }`, a loading task given a worker does not own it, one `text/javascript` blob per session, the essential build (`vue-pdf-embed/dist/index.essential.mjs`) and `pdfjs-dist` as a direct dependency at the same version (4.10.38), `GlobalWorkerOptions` unset, `PdfJsWorkerUnavailableError` | REQ-001, REQ-005, REQ-006 |
| `autobyteus-web/docs/agent_artifacts.md` | Behavior | A zero-byte video or audio reference is an empty file: the node answers the probe `416`, only an empty file can make `bytes=0-0` unsatisfiable, the viewer decides on that status alone and the media viewer says "This video could not be played." with Retry (the apps' player shows "could not be played"); why it does not read `Content-Range` (the dev window's `http://` origin cannot, the packaged window can); any other error and a `416` without a range stay errors; a deleted reference still says "unavailable" | REQ-002, SR-003 |
| `autobyteus-web/docs/remote_access.md` | Behavior | The iOS player is iOS's own player screen (its close button and the file's name on top, no bar of the app over its controls) and turns a wide video to landscape; replaces "the app's Back bar stays over it" | REQ-003 |
| `docs/design-cases.md` | Correction | Only the dev window's `http://` origin read `null` for `Content-Range`; the packaged `file://` window reads every header | Implementation's measurement (IMP-008) |

All statements were checked against the code at the merged state: `MonacoEditor.vue` (the option block and `...restOptions`), `sharedPdfWorker.ts`, `PdfViewer.vue` (`pdfSource`, the essential build import), `AgentEventMonitor.vue` (the `watch`), `CollaborationMessageReferenceViewer.vue` (`emptyMedia = streams && response.status === 416`), `NativeMediaPlayer.swift`'s header, and the measured origins in implementation's IMP-008 and API/E2E's API-020 and API-021.

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| One pdf.js worker | One shared worker made once; each document gets it as `{ url, worker }`; the essential build and `pdfjs-dist` at one version; `GlobalWorkerOptions` unset | `design-spec.md` D-5, SR-002; DEC-002 | `content_rendering.md` (PDF Worker), `design-cases.md` |
| An empty media reference | The `bytes=0-0` probe's `416` alone means an empty file; a header is part of the premise only if every caller's origin can read it | `design-spec.md` D-2, SR-003 | `agent_artifacts.md`, `design-cases.md` |
| A reading-first editor | No line numbers, folding or glyph margin by default; a caller's options override | `design-spec.md` D-1; DEC-003 | `content_rendering.md` |
| The iOS player's owner | The app's screen owns the playback; iOS's own player screen is presented full screen on top; a close of either closes both | `design-spec.md` D-3; DEC-001 | `ios_mobile_access.md` (kept from the ticket), web `remote_access.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| The editor's line numbers, folding column and glyph margin | a 6 px margin | `content_rendering.md` |
| The app's Back bar over iOS's player controls | iOS's own player screen (close button, title) | `ios_mobile_access.md`, web `remote_access.md` |
| A pdf.js worker per PDF (and the full build's duplicate worker) | one shared worker from the essential build | `content_rendering.md` (PDF Worker) |
| The reference viewer's `Content-Range` header check for an empty file | the probe's `416` status alone | `agent_artifacts.md` |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

Not used: docs changed (above).

## Delivery Continuation

- Result: `Pass` for the docs.
- Next delivery action: the verification record and the iOS build-only run's result, handoff summary, archive, finalization.
- Notes: a comment this ticket added in `CollaborationMessageReferenceViewer.vue` says "the desktop calls the node cross-origin, and the node exposes no headers, so `Content-Range` is unreadable there"; it is true of the dev window and not of the packaged window. The code is right (it needs no header); delivery does not edit production code, so the comment is recorded in the handoff summary. The requirements doc's DEC-002 text still describes SR-001's `workerPort`; SR-002 replaced it with `{ url, worker }` (the Solution Designer's document, left as written).
