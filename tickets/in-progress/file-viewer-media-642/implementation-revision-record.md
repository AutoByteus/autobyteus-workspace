# Implementation Revision Record

The current code and `implementation-handoff.md` remain authoritative. This record locates the implementation baseline.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture Reviewer, design-review-report.md round 2 (ARCH-REV-002); Solution Designer, design-spec.md SR-002 | N/A (N-4, N-5 applied) | `Initial Baseline` | SR-001, SR-002, ARCH-REV-001, ARCH-REV-002 | D-1…D-4 implemented and checked locally; ready for code review |
| IR-002 | Code Reviewer, code-review-report.md CRR-001 (CR-001, C-2) via Solution Designer SR-003; Architecture Reviewer ARCH-REV-003 (AR-002) via SR-004; ARCH-REV-004 Pass | CR-001, C-2, AR-002, N-6 | `Requirement Gap` (resolved upstream; implemented here) | CRR-001, SR-003, SR-004, ARCH-REV-003, ARCH-REV-004 | Message references stream video and audio; the native player takes the file name from its caller; the iOS audio screen shows a symbol and the name |
| IR-003 | Code Reviewer, code-review-report.md Round 2 Delta Review (CRR-002) | CR-002 | `Local Fix` | CRR-002 | The reference viewer reloads only when a reference changes by value; a native player no longer re-opens on a message update |
| IR-004 | Architecture Reviewer, design-review-report.md ARCH-REV-005 (Pass); Solution Designer, design-spec.md SR-005 (DEC-007, from API/E2E's evidence request) | N/A (N-7, N-8 applied) | `Design Impact` (decided upstream; implemented here) | SR-005, ARCH-REV-005, CRR-003 | The iOS media player plays in the playback audio session while it shows; the switch no longer mutes it |
| IR-005 | Architecture Reviewer, design-review-report.md ARCH-REV-006 (Pass); Solution Designer, design-spec.md SR-006 (DEC-008, from API/E2E's finding that FileDisplay is mounted nowhere) | N/A (N-9 applied) | `Design Impact` (decided upstream; implemented here) | SR-006, ARCH-REV-006, CRR-004 | Chat highlighting is message code blocks (with rs, zsh); FileDisplay and its now-dead path removed; the table is Monaco only |

## Revision Entries

### IR-001 — Ranged message references, native audio with the media rename, the Files layout by width, one language table

- Triggering role, report path, and round: Architecture Reviewer, `tickets/in-progress/file-viewer-media-642/design-review-report.md`, round 2 (ARCH-REV-002, Pass); Solution Designer, `design-spec.md` at SR-002.
- Triggering finding IDs: N/A (baseline). Reviewer notes applied: N-1…N-3 (already in SR-002), N-4 (the extension is read from the file the URL names), N-5 (WebM video on iOS now takes the page path; recorded in the iOS docs and the handoff).
- Classification: `Initial Baseline`.
- Prior authoritative result: N/A.
- Current authoritative result: implemented and checked locally; `Large` / `High`, routed to code review.
- Related solution revision IDs: SR-001, SR-002.
- Related architecture-review revision IDs: ARCH-REV-001, ARCH-REV-002.
- Related code-review, API/E2E and delivery revision IDs: N/A.
- Why this baseline is recorded: the ticket's first implementation handoff.
- Approved behavior or requirement IDs affected: UC-001…UC-004; REQ-001…REQ-004; AC-001…AC-004; DEC-001…DEC-003.
- Implementation delta (commits on `codex/file-viewer-media-642`, base `5c0db3a801`):
  - `76b29d70a9` D-1: the reference reader returns the file (path, size, modification time from one `stat`), and the route serves it through `sendUserFile` with its `no-store`. That was the last `stream` content, so `UserFileContent` is the file shape alone: its `stream` variant and `kind` tag are removed.
  - `531af6cea7` D-4: `languageDetector.ts` is one table of file types with each engine's name; `getMonacoLanguage` and `getPrismLanguage` replace `getLanguage`; `highlightService.ts` loads the Prism grammars of the new types (`ini` too, which REQ-004 lists).
  - `3d8326eb83` D-3: `FileExplorerLayout.vue` measures its own width and splits only at 150 + 1 + 400 px or more; in split the tree is shown at `min(treeWidth, width − 401)` and the divider stops there.
  - `8d27fb14f5` D-2 web: `useNativeMediaPlayback(kind)`, `playMedia`, `hello.mediaPlayer: { video, audio }`; the audio viewer and the chat's audio tile.
  - `18163b3c1b` D-2 Android: `video/` → `media/`; `MediaKind` with Media3's extension lists; the bridge's `playMedia` and `hello.mediaPlayer`; the player screen's audio branch, its kind in the Intent.
  - `2e2a98a51e` D-2 iOS: `Video/` → `Media/`; `MediaKind` with AVPlayer's lists; `NodeMediaPlayRequest.kind`; the player's audio branch; the loader types the asset by the file's extension.
  - `c2f93e7c2b` docs; `4024239e07` the org-units migration test that read a reference as a stream.
- Changed files or areas: see the handoff's Key Files.
- Local validation and result: IMP-01…IMP-10 in the handoff's Checks Run table.
- Next recipient or routing: `/code_reviewer` (Large/High).
- Remaining limitations or risks: see the handoff's Known Risks.

### IR-002 — The reference viewer streams video and audio; the file name is the native player's input; the iOS audio screen

- Triggering role, report path, and round: Code Reviewer, `code-review-report.md` CRR-001 (CR-001, Requirement Gap; C-2), resolved by the Solution Designer in `design-spec.md` SR-003; Architecture Reviewer, `design-review-report.md` round 3 (ARCH-REV-003, AR-002), resolved in SR-004; round 4 (ARCH-REV-004) Pass, with N-6.
- Triggering finding IDs: CR-001, C-2, AR-002, N-6.
- Classification: `Requirement Gap` (decided upstream; this round implements SR-003 and SR-004).
- Prior authoritative result: IR-001; CRR-001 Fail (CR-001).
- Current authoritative result: implemented and checked locally; `Large` / `High`, back to code review.
- Related solution revision IDs: SR-003, SR-004.
- Related architecture-review revision IDs: ARCH-REV-003, ARCH-REV-004.
- Related code-review revision IDs: CRR-001.
- Related API/E2E and delivery revision IDs: N/A.
- Why this implementation revision is recorded:
  - D-1 made the route ranged, but its only client, the reference viewer, still read every file whole.
  - The native path named a file from its URL, and a reference's URL names none.
- Approved behavior or requirement IDs affected: UC-001 / REQ-001 (the user-visible part); UC-002 / REQ-002 (references and chat media on the phone; the iOS audio screen).
- Implementation delta:
  - `dc350be435` (web):
    - `CollaborationMessageReferenceViewer.fetchContent`: for a Video or Audio type, one probe (`Range: bytes=0-0`, `no-store`) keeps the 404/`REFERENCE_NOT_FOUND`/error handling; its body is cancelled, and `resolvedUrl` is the route's own URL. Text, PDF and image are unchanged.
    - `useNativeMediaPlayback`: `modeFor(url, fileName)` and `play(url, fileName)` take the type from `fileName`'s extension and the title from its base name; `mediaTitleOf` is removed.
    - `VideoPlayer` and `AudioPlayer`: a required `fileName` prop, which `FileViewer` fills from `file.path` for Video and Audio only.
    - `MediaSegment`: `fileNameOf(url)`, the last decoded path segment of its own `/rest/files/…` URL, for `modeFor`, `play` and the tile's label (N-6).
  - `fff1b0af0c` (iOS): for `kind == .audio`, `NativeMediaPlayerViewController.addAudioPlaceholder` puts a black view over the `contentOverlayView` with a `waveform` symbol and the file's name. It is not interactive, so a tap reaches AVKit; AVKit's control auto-hide stays.
  - `4395650f18` docs (`agent_artifacts.md`, `file_explorer.md`, `docs/ios_mobile_access.md`).
- Changed files or areas: the files above, their specs (`CollaborationMessageReferenceViewer.spec.ts`, `useNativeMediaPlayback.spec.ts`, `FileViewer.spec.ts`, `FileViewer.touchZoom.spec.ts`, `MediaViewers.native.spec.ts`, the two player specs) and `NativeMediaPlayerUITests.swift`.
- Local validation and result: IMP-11 and IMP-12.
  - 8 new web cases are red on IR-001; the affected specs pass (428). The whole web suite passes once the contracts package I had deleted is rebuilt (cause recorded). Both typechecks and the guards pass.
  - iOS UI tests pass 3 of 3: the symbol and the name show with the controls hidden, and a tap shows the scrubber.
- Next recipient or routing: `/code_reviewer` (Large/High).
- Remaining limitations or risks:
  - The desktop's ranged reading of a reference was not rendered here: the viewer gives the element the route URL, as Files does (`useAuthorizedObjectUrl`), and API/E2E checks it on the built stack.
  - With iOS's controls shown, the app's Back bar sits over AVKit's top buttons, as for a video since 574.

### IR-003 — The reference viewer reloads only when a reference changes by value

- Triggering role, report path, and round: Code Reviewer, `tickets/in-progress/file-viewer-media-642/code-review-report.md`, "Round 2 Delta Review" (CRR-002).
- Triggering finding IDs: CR-002.
- Classification: `Local Fix`.
- Prior authoritative result: IR-002; CRR-002 Fail (CR-002); CR-001 and C-2 resolved.
- Current authoritative result: fixed and checked; `Large` / `High`, back to code review for the delta.
- Related solution and architecture-review revision IDs: N/A.
- Related code-review revision IDs: CRR-002.
- Related API/E2E and delivery revision IDs: N/A.
- Why this implementation revision is recorded: the viewer's watch returned a new array, so it fired whenever the getter re-ran. A new reference object with equal values made it re-run.
  - The phone's message list re-projects every reference as a new frozen object on each participant-message update. The viewer then refetched, unmounted and remounted `FileViewer`, and the remounted player in native mode called `playNatively()`.
  - On Android a second player stacked on top; on both apps, after Back, the player popped up by itself.
- Approved behavior or requirement IDs affected: UC-001, UC-002 (574's F-1 rule: the player opens on a tap or a first open, never by itself).
- Implementation delta (`36881a6734`): `CollaborationMessageReferenceViewer.vue` watches its six sources as a multi-source watch: `contentPath`, `referenceId`, `path`, `type`, `updatedAt`, `refreshSignal`. Each is compared by value.
  - This also ends the refetch of text, PDF and image references on every message update, and the desktop `<video>` restart.
- Changed files or areas: that file and its spec (a new case, and a mount counter on the `FileViewer` stub).
- Local validation and result: IMP-13.
  - Red before: 3 probes and 3 mounts after two equal objects.
  - Green: the equal objects change nothing; `updatedAt` and `refreshSignal` each reload.
  - 31 files / 308 tests in the collaboration, mobile and viewer folders; web typecheck PASS.
- Next recipient or routing: `/code_reviewer` (Large/High), the targeted delta review.
- Remaining limitations or risks: the held notes stay held: a zero-byte media reference answers the probe with 416 and shows the error state; the iOS Back bar sits over AVKit's top buttons.

### IR-004 — The iOS media player's audio session

- Triggering role, report path, and round: Solution Designer, `design-spec.md` SR-005 (DEC-007, after API/E2E's evidence request on the iOS Ring/Silent switch); Architecture Reviewer, `design-review-report.md` ARCH-REV-005 (Pass) with N-7 and N-8.
- Triggering finding IDs: N/A (a design change). Notes applied: N-7 (end the session in the teardown, however the screen goes), N-8 (restore the category in effect before).
- Classification: `Design Impact` (decided upstream; this round implements SR-005).
- Prior authoritative result: IR-003, CRR-003 Pass.
- Current authoritative result: implemented and checked; `Large` / `High`, to code review.
- Related solution and architecture-review revision IDs: SR-005, ARCH-REV-005.
- Related code-review revision IDs: CRR-003.
- Related API/E2E and delivery revision IDs: N/A.
- Why this implementation revision is recorded: the app set no audio session category, so on an iPhone the Ring/Silent switch muted the native player (audio, and 574's video).
- Approved behavior or requirement IDs affected: REQ-002 / AC-002 (iOS); 574's video sound.
- Implementation delta (`38f318021c`):
  - New `AutoByteusMobileCore/Media/MediaAudioSession.swift`.
    - `begin()` records the category, mode and options in effect, then sets `.playback` / `.moviePlayback` and `setActive(true)`.
    - `end()` calls `setActive(false, options: .notifyOthersOnDeactivation)` and restores what `begin` recorded.
    - Failures, `isBusy` included, are logged with their code and never stop playback. A second `begin` or `end` does nothing.
  - `NativeMediaPlayerViewController` calls `begin()` in `viewDidLoad`, on present. It calls `end()` in its `viewDidDisappear` teardown beside `loader?.invalidate()`, which runs however the screen goes (N-7).
  - `docs/ios_mobile_access.md` describes it.
  - Info.plist (no background mode) and Android are unchanged.
- Placement: the session is in Core, not the app. The Core tests have the test host's real `AVAudioSession`; the app layer has no unit-test target, and its UI tests cannot read the app's session.
- Changed files or areas: the above, and `MediaAudioSessionTests.swift` (new).
- Local validation and result: IMP-14. `MediaAudioSessionTests` covers the category during, the restore after, and that repeated calls change nothing; the Core suite passes 88 of 88; `NativeMediaPlayerUITests` passes 3 of 3, with no session failure in the log.
- Next recipient or routing: `/code_reviewer` (Large/High).
- Remaining limitations or risks: the switch and the sound themselves need a physical iPhone, which is the check before release (SR-005).

### IR-005 — Chat highlighting is message code blocks; the dead FileDisplay removed

- Triggering role, report path, and round: Solution Designer, `design-spec.md` SR-006 (DEC-008, after API/E2E found `FileDisplay.vue` is mounted nowhere); Architecture Reviewer, `design-review-report.md` ARCH-REV-006 (Pass) with N-9.
- Triggering finding IDs: N/A (a design change). Note applied: N-9 (the service's comment names message code blocks).
- Classification: `Design Impact` (decided upstream; this round implements SR-006).
- Prior authoritative result: IR-004, CRR-004 Pass.
- Current authoritative result: implemented and checked; `Large` / `High`, to code review.
- Related solution and architecture-review revision IDs: SR-006, ARCH-REV-006.
- Related code-review revision IDs: CRR-004.
- Related API/E2E and delivery revision IDs: N/A.
- Why this implementation revision is recorded: D-4's second reader of the language table, "chat file previews" (`FileDisplay.vue`), is not reached, so `getPrismLanguage` had no reader. Chat highlighting is the message's code blocks, named by their fences.
- Approved behavior or requirement IDs affected: REQ-004 / AC-004 (the chat leg).
- Implementation delta (`339b8d0ddb`):
  - **Removed, as SR-006 says:** `components/conversation/segments/renderer/FileDisplay.vue`, `getPrismLanguage`, the table's `prism` column, and the audit test's `FileDisplay` entry.
  - **Removed because they became dead with it** (Principle 7; each search finds no other caller):
    - `utils/highlighting/segmentHighlighter.ts` (`highlightWriteFileSegment`, `FileDisplay`'s only path);
    - `highlightService.highlightVue` (only `segmentHighlighter`);
    - `utils/highlighting/vueCodeHighlight.ts` (no caller at all, already dead, in the folder this change touches);
    - `WriteFileSegment.highlightedContent` (written and read only by `segmentHighlighter`), and the unused `ParsedFile` type beside it.
  - **Kept:** the Prism grammar loads. `highlightService.ts` registers `Prism.languages.rs` (rust) and `Prism.languages.zsh` (bash) beside them, and its comment names message code blocks (N-9).
  - **The table:** extension or name → Monaco id, read by `getMonacoLanguage` alone.
- Changed files or areas: the above; `utils/highlighting/__tests__/languageDetector.spec.ts` (Monaco only); `services/__tests__/highlightService.fences.spec.ts` (new).
- Local validation and result: IMP-15.
  - Every listed fence and the `rs`/`zsh`/`yml`/`sh`/`dockerfile` names give several token classes; the unchanged languages too; a message through `markdownItPrism` too.
  - Red: without the aliases, `zsh`, `rs` and the markdown-it case fail.
  - The whole web suite (808 files), both typechecks and the guards pass.
- Next recipient or routing: `/code_reviewer` (Large/High).
- Remaining limitations or risks: none new.

