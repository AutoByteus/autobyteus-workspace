# Implementation Handoff

Ticket autobyteus-647 (viewer-polish-647). Worktree `<worktree>` (`autobyteus-worktrees/viewer-polish-647`), branch `codex/viewer-polish-647`, base `bc4351cad7`. Paths below are relative to the worktree.

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: `Medium` / `Low`, direct implementation (no architecture review). The route is API/E2E.
- Requirements doc: `tickets/in-progress/viewer-polish-647/requirements-doc.md` (REQ-001…REQ-006, AC-001…AC-006).
- Investigation notes: `tickets/in-progress/viewer-polish-647/investigation-notes.md` (the D-5 premise corrected in SR-002).
- Solution revision record: `tickets/in-progress/viewer-polish-647/solution-revision-record.md` (SR-001, SR-002, SR-003).
- Design spec: `tickets/in-progress/viewer-polish-647/design-spec.md` (D-1…D-6; D-5 revised in SR-002, D-2 in SR-003). REQ-002 and AC-002 restated in SR-003.
- Triggering rework:
  - IR-001: my Design Impact DI-001 (IMP-003, first run), resolved as SR-002.
  - IR-002: API-REV-001 (Fail on AC-002, API-011), the code reviewer's failure-origin review CRR-001 (F-1 Design Impact, F-2 Requirement Gap), resolved as SR-003.

## Current Implementation Summary

- Implementation cycle: `Rework` (IR-002, SR-003). IR-001 was the initial round.
- Implementation revision record: `tickets/in-progress/viewer-polish-647/implementation-revision-record.md`.
- Current implementation revision ID: `IR-002`.
- Related solution revision IDs: SR-001, SR-002, SR-003.
- Related code-review revision IDs: CRR-001 (failure-origin: Design Impact F-1, Requirement Gap F-2).
- Related API/E2E revision IDs: API-REV-001 (Fail on AC-002).
- Related architecture-review and delivery revision IDs: N/A.
- Commits: `b3602c4156` (D-1, D-2, D-6), `0b88e1e761` (D-5 as SR-001), `9072eb89c4` (D-5 as SR-002), `da70e7f049` (D-3, D-4), `812760b2ec` (IR-001 docs); IR-002: `9e33adbf10` (D-2 as SR-003), `9278fca6ff` (MSP-115 to the restated AC-002), and the docs commit carrying this update.

What the change does:

- **D-1, the editor.** `MonacoEditor.vue` creates the editor with no line numbers, glyph margin or folding, and a 6 px decorations margin (`lineNumbers: 'off'`, `lineNumbersMinChars: 0`, `glyphMargin: false`, `folding: false`, `lineDecorationsWidth: 6`), before `...restOptions`. Desktop and phone share the component.
- **D-2, an empty media reference (SR-003).** `CollaborationMessageReferenceViewer` treats a `416` to its media probe (`Range: bytes=0-0`) as an empty file. Only an empty file makes `0-0` unsatisfiable. The status alone decides, because the dev desktop cannot read `Content-Range` cross-origin (CRR-001 F-1). It hands the URL on as for a 206, and the media viewer reports that the file cannot be played (F-2, AC-002 restated). A 416 to a fetch with no Range, and every other error, is unchanged.
- **D-3, iOS's own player screen.** `NativeMediaPlayer.swift`'s screen keeps the playback: the loader, the cache, the audio session, landscape and the failure. Once the item is ready and the screen has finished appearing, it presents `AVPlayerViewController` full screen, with iOS's close button and the file's name as its title (the item's `externalMetadata`). The app's Back bar is gone: Back shows only with "could not be played". When iOS's player closes, by its close button or a swipe down, the screen sees itself appear again and closes too. Landscape for a wide video is asked for once iOS's player shows, through the player's own window scene.
- **D-4.** The loader's queue is `org.autobyteus.media-loader`.
- **D-5, one pdf.js worker (SR-002).** `utils/pdf/sharedPdfWorker.ts`'s `getSharedPdfWorker()` makes, once, an inline module worker from `pdfjs-dist`'s worker script (4.10.38) and one `PDFWorker` wrapper on it, from the essential build's own pdf.js (`globalThis.pdfjsLib`). It throws `PdfJsWorkerUnavailableError` if that class is gone. `PdfViewer.vue` imports `vue-pdf-embed/dist/index.essential.mjs` and passes `source` as a computed `{ url, worker }` that changes only with the URL. `GlobalWorkerOptions` stays unset. `pdfjs-dist` 4.10.38 is a direct dependency, one copy (`pnpm why`).
- **D-6.** `AgentEventMonitor` clears `filePreviewStatus` when the shown run changes.

## Routing Classification (Mandatory)

- Task size: `Medium`.
- Architecture risk: `Low`.
- Design classification section / evidence reference: `design-spec.md` "Task Size And Architectural Risk".
- Classification confirmed or changed: `Confirmed`. SR-002 kept it: one owner (`sharedPdfWorker.ts`) and one prop changed.
- Selected route: `API/E2E` (direct).
- Lightweight implementation self-review for the direct route: `Done` (below).
- New design impact or escalation trigger:
  - **D-5's trigger fired.** It was returned as DI-001 and resolved in SR-002: a shared `workerPort` could not serve the next PDF while vue-pdf-embed's un-awaited destroy was running (IMP-003).
  - **The D-3 triggers did not fire.** AVKit accepts landscape when asked through its own scene, and its close is seen reliably (IMP-005).

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| REQ-001 / AC-001 | No line numbers; a 6 px margin; the text uses the width | `components/fileExplorer/MonacoEditor.vue` (create options) | IMP-001 spec (red → green); IMP-004 packaged window: margin 6 px, text 6 px from the edge, 0 line numbers, 0 fold controls |
| REQ-002 / AC-002 (SR-003) | A zero-byte media reference: no fetch error; the media viewer is reached and reports that it cannot be played; not-found unchanged | `components/workspace/collaboration/CollaborationMessageReferenceViewer.vue` (`emptyMedia = streams && status === 416`) | IMP-008: spec red → green, with an unreadable header; MSP-115 Pass (dev desktop cross-origin and phone page: "This video could not be played." with Retry, deleted still "unavailable"); packaged `file://`: probe 416, viewer could-not-play with Retry. IMP-006 iOS: the app's player says it could not be played |
| REQ-003 / AC-003 | iOS's player screen with its close and title, no app bar; every close path ends the playback; landscape for wide video | `autobyteus-ios/AutoByteusMobile/Media/NativeMediaPlayer.swift` (`presentPlayerIfReady`, `viewDidAppear`, `applyOrientation`, `titleItem`, `showCouldNotPlay`, teardown in `viewDidDisappear`) | IMP-005 4/4, IMP-006 10/10 and 8/8; screenshots with controls shown; landscape seen in a real frame |
| REQ-004 / AC-004 | Queue label | `autobyteus-ios/AutoByteusMobileCore/Media/AuthorizedMediaLoader.swift` | Code check; Core 91/91 |
| REQ-005 / AC-005 | One worker, ≤ 1 JS blob, PDFs render on desktop (packaged) and phone | `utils/pdf/sharedPdfWorker.ts` → `components/fileExplorer/viewers/PdfViewer.vue` (`pdfSource`) | IMP-003 after SR-002: 5 rounds of fresh opens alpha:3 beta:2 gamma:4, 5 switches, 1 worker, 1 JS blob, no errors; IMP-006 phone PDF in WKWebView |
| REQ-006 / AC-006 | Status line clears on a run change | `components/workspace/agent/AgentEventMonitor.vue` (`watch(effectiveRunId, …)`) | IMP-001 spec (red → green): it clears on the switch and stays gone on the way back |
| Preserved | Desktop editing, 574/642 iOS behavior (header credential, cache, the audio placeholder, the session) | Unchanged loader, cache and session code; the teardown in `viewDidDisappear` unchanged | Web suite 6264 passed; Core 91; 574/642 real-node classes pass |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`.

## Key Files Or Areas

- Web:
  - `autobyteus-web/components/fileExplorer/MonacoEditor.vue`
  - `autobyteus-web/components/workspace/collaboration/CollaborationMessageReferenceViewer.vue`
  - `autobyteus-web/components/workspace/agent/AgentEventMonitor.vue`
  - `autobyteus-web/utils/pdf/sharedPdfWorker.ts` (new)
  - `autobyteus-web/components/fileExplorer/viewers/PdfViewer.vue`
  - `autobyteus-web/package.json`, `pnpm-lock.yaml` (`pdfjs-dist` 4.10.38, the importer entry only)
- Web specs:
  - `MonacoEditor.spec.ts`, `CollaborationMessageReferenceViewer.spec.ts` (2 cases), `AgentEventMonitor.remoteRunFiles.spec.ts` (1 case).
  - `utils/pdf/__tests__/sharedPdfWorker.spec.ts` (new, 2 cases) and `viewers/__tests__/PdfViewer.sharedWorker.spec.ts` (new).
  - `PdfViewer.touchLayout.spec.ts` and `mobile/views/__tests__/MobileFileViewer.zoom.spec.ts` now double the essential build and the shared worker.
- iOS:
  - `AutoByteusMobile/Media/NativeMediaPlayer.swift`
  - `AutoByteusMobileCore/Media/AuthorizedMediaLoader.swift`
  - UI tests: `NativeMediaPlayerUITests.swift` (mine), `NativeMediaRealNodeUITests.swift` and `NativeVideoRealNodeUITests.swift` (API/E2E's, changed as below).
- Docs: `docs/ios_mobile_access.md` (the Player bullet).

## Important Assumptions

- **D-5 premise corrected (DI-001, SR-002).** The essential build bundles its own pdf.js 4.10.38. The wrapper comes from `globalThis.pdfjsLib.PDFWorker`, and `pdfjs-dist` supplies only the worker script, of the same version.
- **D-5 typing.** The wrapper's constructor is typed locally, `new (params: { port: Worker }) => PDFWorker`. pdfjs-dist's generated constructor type says `port?: null`, contradicting its own `PDFWorkerParameters`.
- **D-3, in the API/E2E-owned real-node classes:**
  - Every `media.back` tap on a playing file became `closePlayer(app)`, which uses iOS's close.
  - testH walks a swipe down, then iOS's close.
  - testF now checks the empty video (D-2): the app's player screen says it could not be played, and Back closes it.
  - Before this, testF's comment expected a page error, and its page-Back step got past that row only because the row was last.
- **D-2 on iOS.** AC-002's "the apps show their native screen" is met: the app's screen opens. A zero-byte file cannot play, so the screen shows its existing could-not-play state with Back.
- **D-2 after SR-003, on each surface (IMP-008):**
  - Dev desktop (`http://` origin, cross-origin): `Content-Range` is unreadable, as F-1 found.
  - Packaged `file://` window: every header is readable, so IR-001's header check would have passed there.
  - Either way the status decides now.
  - The apps were not run again: SR-003's condition matches wherever IR-001's did (IMP-006).
- **MSP-115 (API/E2E's case), changed in IR-002 for the restated AC-002:**
  - It asserts the media viewer's "could not be played" with Retry and no fetch error.
  - It classifies the phone browser's `net::ERR_REQUEST_RANGE_NOT_SATISFIABLE` on the downloaded `blob:` as that outcome: the empty file reaching the player. It was API-REV-001's one unknown error.
  - Its waits end on the viewer's answer.
- **The D-2 spec (IR-002):** the "416 for a file with bytes is still an error" case was removed, since a 416 to the probe now means empty. A new case covers a 416 to a fetch that sent no Range.

## Known Risks

- **D-5 reads a global, not an export.** It depends on vue-pdf-embed's bundle setting `globalThis.pdfjsLib`. An upgrade that drops it fails `sharedPdfWorker.spec.ts` (it then throws the named error) rather than failing silently.
- **A future second PDF viewer** must pass `{ url, worker: getSharedPdfWorker() }`. With `GlobalWorkerOptions` unset, a `getDocument` without it throws "No workerSrc" (SR-002's intent).
- **D-3 timing.** Presentation waits for the host's `viewDidAppear`. A failure that arrives while the player is still being presented calls `playerController.dismiss(animated: false)` mid-presentation. Not reproduced: the missing-file case fails before the item is ready.

## Task Design Health Assessment Implementation Check

- The design held, except for D-5's premise, which went back as DI-001 and came back as SR-002.
- D-3's two bugs, presenting during the host's own presentation and asking for landscape through a view outside the window, were in my implementation, not the design. Each is fixed in `NativeMediaPlayer.swift`, with a comment.

## Legacy / Compatibility Removal Check

- Removed:
  - the iOS app bar (`addBackButton`), the child embed and `entersFullScreenWhenPlaybackBegins`;
  - the full-build vue-pdf-embed import, which brought a second pdf.js and its 1.9 MB worker;
  - `ensureSharedPdfWorker`/`workerPort`, from SR-001;
  - the stale teardown comment.
- No compatibility path.

## Persisted Data Transition Check (When Applicable)

- N/A. Nothing persisted changed.

## Environment Or Dependency Notes

- `pdfjs-dist` 4.10.38 added to `autobyteus-web` (exact; vue-pdf-embed's version).
- The fresh-start build passed for `0b88e1e761` and `9072eb89c4` (IMP-002).
- The build-only Desktop Release run passed on `da70e7f049` (IMP-007).
- Every command ran under `env -i` (my shell carries a live app's `AUTOBYTEUS_*`). The real-node secrets file stayed under `<tmp>`, outside the evidence.

## Checks Run

| Check | Result | Evidence |
| --- | --- | --- |
| Web specs red → green (D-1, D-2, D-6; D-5 SR-002) | 3 red → 33 green; 2 red → 177 green | IMP-001 |
| Whole web suite `pnpm test:nuxt` | 810 files; 6264 passed, 2 skipped | IMP-001 |
| Web typecheck | production 0; tests 86 (= baseline); PASS | IMP-001 |
| `guard:web-boundary`, `guard:localization-boundary` | Passed | IMP-001 |
| Fresh-start build + the job's ARM64 verify steps | Pass ×2 | IMP-002 |
| Packaged `file://` PDFs (AC-005) | First run: DI-001. After SR-002: Pass | IMP-003 |
| Packaged editor gutter (AC-001) | Pass | IMP-004 |
| iOS Core (`AutoByteusMobileCoreTests`, 60 s video) | 91 passed | IMP-005 |
| iOS `NativeMediaPlayerUITests` (fake node) | First run 1/4: two D-3 bugs, fixed. Then 4/4 | IMP-005 |
| iOS real-node classes | 10/10, 8/8 | IMP-006 |
| Build-only Desktop Release run (run 45584353228, `da70e7f049`) | all five builds success; sign and publish skipped | IMP-007 |
| IR-002: D-2 spec red → green (unreadable header) | 1 red → collaboration 42 green | IMP-008 |
| IR-002: whole web suite, typecheck | 810 files, 6264 passed, 2 skipped; typecheck PASS (baseline) | IMP-008 |
| IR-002: MSP-115 (dev desktop cross-origin, phone page) | Pass, 0 unknown browser errors | IMP-008 |
| IR-002: packaged `file://` (fresh clone at `9278fca6ff`) | probe 416 → the media viewer's "could not be played" with Retry | IMP-008 |
| `bash scripts/check_secrets.sh` | PASS | before each push |

Not run:
- The iOS smoke script: it skips the media classes, and only the media screen changed.
- The server typecheck and tests: no server change.
- Android: untouched.

## Frontend Rendered-Result Check (When Applicable)

- Desktop packaged window:
  - the PDFs (`IMP-003/after-sr002-gamma.png`);
  - the editor without a gutter (`IMP-004/editor-no-gutter.png`);
  - the empty video (`IMP-008/packaged-empty-video.png`).
- Dev desktop and phone page: the empty and the deleted references (`IMP-008/MSP-115-*.png`).
- iOS:
  - landscape with iOS's controls and title (`IMP-005/player-landscape-as-seen.png`);
  - the audio screen with its controls (`IMP-005/audio-controls.png`);
  - the page again in portrait;
  - could-not-play with Back;
  - the phone PDF (`IMP-006/phone-pdf-ref-642.png`);
  - the empty video reference (`IMP-006/phone-empty-video-reference.png`).

## Lightweight Self-Review (Direct Route)

- Each change maps to one D-item and one owner; no file outside the design's table except specs, the iOS UI tests and the Player doc.
- Comments state real paths only (REQ-003): the teardown comment names iOS's close, a swipe down, Back after a failure and the app dismissing it.
- No credential or URL in logs; the title metadata carries only the file's name.
- Re-read DESIGN.md:
  - rule 12 (fresh-start build, build-only run) is done;
  - rule 13 (fail loudly) is met by the named error and the unset `GlobalWorkerOptions`.
- Temporary diagnostics (the NSLog lines and the diagnostic UI test) were removed before the commit; `grep IE647DIAG` finds nothing.

## Downstream Coverage Hints / Suggested Scenarios

- **AC-001 at its stated sizes:** desktop 1440×900 and the phone at 390×844 with a JSON file (first character within 12 px), plus edit and save on the desktop. I measured the packaged window at 1200×768 with a TS file only.
- **AC-005 on the phone with three PDFs one after another,** measured: I saw one PDF rendering in the iOS WKWebView, without the blob count.
- **AC-003's session:** that the audio session deactivates after a swipe down and after iOS's close. `MediaAudioSessionTests` covers `end()`. The teardown that calls it ran on close (a temporary log showed `viewDidDisappear` with `isBeingDismissed`), but no test asserts the session's state in the app.
- **Android:** D-1, D-2 and D-5 reach the Android app's page too (its WebView), and D-5's inline worker runs there.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- The hints above, and API/E2E's own coverage of AC-001…AC-006.
- AC-002 in the packaged window through an actual message reference. I checked the probe request and the media viewer's answer for an empty video opened from Files; the reference viewer's own path ran on the dev desktop (MSP-115).
