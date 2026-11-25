# Handoff Summary

## Summary Meta

- Ticket: `viewer-polish-647` (Project Task `autobyteus-647`; requested by `/project_task_manager`, 2026-11-25; it takes up 471's two follow-ups, 642's held iOS item and 644)
- Date: `2026-11-25`
- Classification: `task_size: Medium`, `architectural_risk: Low`; route: direct low-risk (no architecture review, no source or test-code review after the fix). The failure-origin review CRR-001 on API-REV-001's AC-002 failure was `Fail` (Design Impact and Requirement Gap), resolved by the Solution Designer's SR-003 and implementation's IR-002; API/E2E `API-REV-001` `Fail` (AC-002 on the desktop), `API-REV-002` `Pass`, final confidence 95 %, no category below 90 %.
- Current Status: `Verified from evidence; finalized on personal; no release` (the finalization record is in `release-deployment-report.md`).
- Branch: `codex/viewer-polish-647`, base `origin/personal` `bc4351cad7` at bootstrap (the release record of `v1.5.15-beta.1`); integrated once with `origin/personal` `2bdfea0444` (autobyteus-649, server only; merge `694896a154`, no conflict).
- Delivery rounds: `DR-001` delivered (`delivery-revision-record.md`).

## Delivery Summary

- Delivered scope:
  - **No line numbers in the file viewer** (REQ-001, the founder's screenshot): the editor shows no line numbers, folding column or glyph margin, only a 6 px margin, on the phone and the desktop; editing and saving on the desktop work as before (DEC-003: folding off).
  - **An empty media reference says so** (REQ-002, autobyteus-642's held item): a zero-byte video or audio reference no longer shows "Failed to fetch reference content (416)". The reference viewer decides on the probe's `416` alone (only an empty file can make `bytes=0-0` unsatisfiable), so the media viewer says "This video could not be played." with Retry on the dev desktop, the packaged window and the phone page, and the apps' own player shows its "could not be played" screen. A deleted reference still says "unavailable".
  - **The iOS player is iOS's own screen** (REQ-003, DEC-001, 642's held item): `AVPlayerViewController` presented full screen over the app's screen, so iOS's close button and the file's name sit on top and no bar of the app covers its controls. The app's screen owns the playback (loader, cache, audio session, landscape, failure). iOS's close button, a swipe down, Back after a failure and the app replacing its screen each end playback and the audio session.
  - **The loader's queue label** is `org.autobyteus.media-loader` (REQ-004).
  - **One pdf.js worker for every PDF** (REQ-005, 471 FU-001, DEC-002 as revised in SR-002): `vue-pdf-embed`'s essential build with one shared module worker and one `PDFWorker` wrapper owned by `sharedPdfWorker.ts`; `pdfjs-dist` is now a direct dependency at the bundled copy's version. One `text/javascript` blob per session instead of one per document.
  - **The file status line clears on a run switch** (REQ-006, 471 FU-002).
  - **Found after the first pass, fixed:** implementation found that a shared `workerPort` fails the next PDF and that the essential build bundles its own pdf.js (DI-001, SR-002); API/E2E found that the dev desktop still showed the fetch error because the node's CORS lets a cross-origin caller read no header (AC-002, CRR-001; SR-003 decides on the status alone and restates AC-002 as "the media viewer says it cannot be played").
- Docs synced (`docs-sync-report.md`): web `content_rendering.md` (the editor's gutter, the status line, new "PDF Worker" section), `agent_artifacts.md` (the empty reference), `remote_access.md` (the iOS player's full screen), a correction in `docs/design-cases.md` (only the dev window's `http://` origin cannot read `Content-Range`); kept from the ticket: three design cases, `docs/ios_mobile_access.md`.
- Durable coverage: `mobile-viewer-polish-cases.mjs` (MSP-115 empty reference, MSP-116 and 117 PDF worker on desktop and phone, MSP-118 status line); MSP-108 to 110 updated (their line-number assertions became "no line numbers", margin 6 px); `mobile-file-zoom-cases.mjs` exports `multiPagePdf`; web specs for the editor options, the shared worker, the reference viewer's 416 rule and the status line; the iOS UI tests of 574/642 updated for iOS's own screen.

## Delivery's round

- **DR-001** merged the base, reran what the web viewers, the build input and the iOS source could affect, ran the build-only iOS release run on the final head, read the evidence, corrected the docs (above) and finalized. It found no defect. Delivery first drafted corrections to the archived release notes of 574 and 642 and withdrew them when it found that `v1.5.15-beta.1` already holds both tickets: their notes record what shipped.

## Verification Summary

- Verified from evidence by delivery. Every critical acceptance criterion (AC-001, AC-002, AC-003, AC-005) and the others are directly proven; nothing needs the user's check. No evidence decision (`DEC-*`) accepted an unverified risk.
- Final confidence 95 % (the default target met; no category below 90 %).
- Key evidence opened by delivery (details in `release-deployment-report.md`):
  - AC-001: the packaged window's JSON editor: `lineNumbers: 0`, `foldControls: 0`, `marginWidth: 6`, first character at offset 6; after an edit and save the file on disk is the original plus `\nEDITED-647.` (read with `od -c`; a `false` flag in the result file is API/E2E's comparison, not the product: MSP-110's own check is `true`).
  - AC-002: the packaged `file://` window on a remote node's Team reference: probe `bytes=0-0` answered `416 bytes */0`, the viewer reads "This video could not be played." with Retry (screenshot opened), the deleted reference "Reference file unavailable"; delivery's MSP-115 run: the same on desktop and phone.
  - AC-003: the iOS landscape screenshot: iOS's ✕ and AirPlay, the file's name and scrubber, no app bar; fake-node class 4 of 4, real-node classes 10 of 10 and 8 of 8; diagnostics per close path show `session end: deactivated=1`; the runner's iOS Core tests and smoke script pass on the final head.
  - AC-005: the packaged window, five rounds of three PDFs and five switches: one module worker, one `text/javascript` blob, no worker error; delivery's MSP-117: the same on the phone.
  - AC-004 and AC-006: the queue label's line; MSP-118.
- Integrated-state checks by delivery (`evidence/delivery/`): both typechecks at baseline (server 972 in 299 files, web 86 in 36 files, 0 production errors); `check:contract-dist` `PASS`; whole web suite `810 files`, `6264 tests`; server and phone bundle rebuilt; fifteen phone cases `Pass`, `unknownBrowserErrors: 0`; build-only iOS release run `45619979408` on the final head `694896a154` (`Build And Test iOS App` success on Xcode 27, including the Core tests and the simulator smoke script), nothing published. Build inputs (`autobyteus-web/package.json`, `pnpm-lock.yaml`): API/E2E's fresh clones at two heads and implementation's build-only Desktop Release run `45584353228` pass.

## Residual Risks For The User

- **The apps' empty-reference screen was not rerun on IR-002's bundle.** The change is a strict superset of the earlier header check (`status === 416` includes every case `416` with `Content-Range: bytes */0` matched) on a probe only an empty file can make unsatisfiable, and the apps' page is the same page code that API/E2E and delivery ran on the phone page; the apps' own screen was proven on IR-001's code (iOS `testF`, Android).
- **The audio session on a device:** the iOS session ends on every close path (diagnostics on a simulator), but a device's Ring/Silent switch and a lock were not exercised (autobyteus-642's known limit, still open).
- **The iOS player change needs a new iPhone app build:** the page changes reach every client with the node and the desktop app; an older app keeps its own player.
- **A code comment this ticket added** in `CollaborationMessageReferenceViewer.vue` says the desktop calls the node cross-origin and `Content-Range` is unreadable there; that is true of the dev window and not of the packaged window. The code is right (it needs no header); delivery does not edit production code.
- **A ticket document is stale:** the requirements doc's DEC-002 text still describes SR-001's `workerPort`; SR-002 replaced it with `{ url, worker }` (the Solution Designer's document, left as written).
- **Not tested here:** the release job's macOS signing-policy step (needs the runner's identity), signing and notarization.
- **Environment (outside this ticket):** the whole phone probe is red on MSP-17, 58, 61, 65, 82 and 87, the same on the base (autobyteus-628's FU-002 and autobyteus-609's FU-006; this ticket's FU-001), and MSP-92 can fail by chance (FU-002).

## Follow-ups

`follow-ups.md` lists, for the Solution Designer to send (none sent yet; none urgent):

- **FU-001:** phone probe cases MSP-17, 58, 61, 65, 82 and 87 fail on the base too (MSP-61 is autobyteus-609's FU-006; the other five are autobyteus-628's FU-002): the whole phone probe is red on the base.
- **FU-002:** the Team reference viewer first shows "Video URL is not available." (then "Loading reference file...", then "Loading video…") for a video reference; autobyteus-572's MSP-92 says it must never, and its 100 ms sampling misses the flash, so MSP-92 can fail by chance. Same on the base.

## Release

- No release: no release was asked for and `RELEASE.md` makes none the default. A release is available: `release-notes.md` holds the user-facing notes (no `## What you need to do`). `v1.5.15-beta.1` already holds autobyteus-574 and 642; this ticket changes what that beta did for the Back bar, the empty reference, line numbers and PDFs, and its note says so.
