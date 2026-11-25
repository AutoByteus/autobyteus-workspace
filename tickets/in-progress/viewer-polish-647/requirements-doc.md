# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: SR-001
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), for the founder
- Approved by: Solution Designer within the direction (the Task fixes each outcome); user informed 2026-11-25
- Baseline: this document at SR-001

## Requirements

| ID | Requirement | Basis |
| --- | --- | --- |
| REQ-001 | The file viewer shows no line numbers, on the phone and the desktop. The left gutter keeps only a small margin, about 6 px: no folding column, no glyph margin. The content uses the reclaimed width. Editing on the desktop works as before | Founder via Task item 1 |
| REQ-002 | A zero-byte media reference opens as an empty file (the player, no error), not "Failed to fetch reference content (416)". Other errors and not-found cases are unchanged | Task 2a |
| REQ-003 | On iOS, the media player's top controls are never covered by an app bar. Close and the file's title come from iOS's own player screen. The player keeps 574/642's behavior: header-only credential, cache, landscape for wide video, the audio placeholder, the audio session ended on close. Every close path (its close button, a swipe down, the app) ends the playback and the session. Code comments state only real paths | Task 2b; DEC-001 |
| REQ-004 | The iOS loader's queue label names media (`org.autobyteus.media-loader`) | Task 2c |
| REQ-005 | Opening PDFs repeatedly does not grow memory: one pdf.js worker serves every PDF, and no per-document worker blob URL is created. PDFs render as today on the desktop (the packaged window included) and the phone | Task 3a (471 FU-001) |
| REQ-006 | The run view's file status line clears when the shown run changes | Task 3b (471 FU-002) |

## Acceptance Criteria

| AC | REQ | Expected | Verification |
| --- | --- | --- | --- |
| AC-001 | REQ-001 | Desktop at 1440×900 and the phone at 390×844: no line numbers; the gutter is ≤ 10 px; a JSON file's first character starts within 12 px of the editor's left edge; editing and save work (desktop) | Rendered probes with measured offsets and screenshots; web spec of the editor options |
| AC-002 | REQ-002 | A zero-byte `.mp4` reference: no error text; the player shows (desktop; the phone's page path), or the native player opens (apps). A missing reference still shows "not found" | Web spec; a probe with a zero-byte reference |
| AC-003 | REQ-003 | iOS simulator: a video and an audio file open in iOS's player screen with its close button and the title. No app bar over its controls (screenshot with controls shown). Close, swipe down and a failure each end the playback and deactivate the session; a wide video plays in landscape. 574/642's iOS tests pass | XCUITests and screenshots; the session check |
| AC-004 | REQ-004 | Label string | Unit test or code check |
| AC-005 | REQ-005 | Desktop (Electron build) and phone: open three PDFs. Each renders, and the count of `text/javascript` blob URLs created for workers is ≤ 1 for the whole session (471's measurement method) | Probe with `URL.createObjectURL` instrumentation; a packaged-window check |
| AC-006 | REQ-006 | Show the "on node X" status in run A, then switch to run B: the line is gone; back to A: gone (it was a one-off message) | Web spec |

## Decisions

| ID | Question | Reasoning And Recommendation | Owner | Status |
| --- | --- | --- | --- | --- |
| DEC-001 | How to stop the app bar covering AVKit's controls | AVKit has no public signal for its controls' visibility, so syncing the app bar is guesswork. **Present `AVPlayerViewController` itself full screen**: iOS's own close button, title (from the item's metadata) and swipe-down close; no app bar. The app's screen stays underneath as the playback's owner (loader, cache, session, landscape) and closes when the player closes. A failure shows the app's "could not be played" with Back, as today. Visible change: the standard iOS player top bar replaces the app's Back bar on the player | Solution Designer (within the Task: "hide the app bar under AVKit's controls") | Decided; user informed |
| DEC-002 | How to stop the PDF worker leak | A worker file URL is unsafe in the `file://` packaged window. **The essential build plus one shared worker**: the web creates one pdf.js module worker on first use (Vite inline worker, a blob made once) and sets pdf.js's `workerPort`, so every document reuses it. This also drops the full build's duplicate 1.9 MB worker. `pdfjs-dist` becomes the web's direct dependency at the same version as vue-pdf-embed's (one copy) | Solution Designer | Decided |
| DEC-003 | Folding | A read-mostly viewer rarely folds, and the folding column takes width on every screen. **Off**, with line numbers and the glyph margin. The toggle question stays with autobyteus-640 | Solution Designer (within the founder's direction) | Decided |
