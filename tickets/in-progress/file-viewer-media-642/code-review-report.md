# Code Review Report

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-001; REQ-001…004, AC-001…004, DEC-001…003)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (Items 1–4)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-001, SR-002)
- Design Spec Reviewed As Context: `design-spec.md` (SR-002, D-1…D-4, the data contract)
- Supplemental Task Artifacts Reviewed As Context: none (no `follow-ups.md`)
- Relevant Solution Revision IDs: SR-001, SR-002
- Design Review Report Reviewed As Context: `design-review-report.md` (round 2 Pass; N-1…N-5)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md` (ARCH-REV-001, ARCH-REV-002)
- Implementation Handoff Reviewed As Context: `implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md` (IR-001)
- Code Review Revision Record: `tickets/in-progress/file-viewer-media-642/code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-003`
- Current Review Round: `3`, a `Targeted Delta Review` of `292ea71db5..af2b65c2c0`. The only source change is `36881a6734`: `CollaborationMessageReferenceViewer.vue` and its spec. Rounds 1 and 2 below stay as recorded except where a later round updates them.
- Review Scope: round 2 is a `Targeted Delta Review` of `4313640f6e..26ebb05729`. Round 1 was a `Full Review`.
- Round 2 scope evidence: the source delta is two commits.
  - `dc350be435` (web): `CollaborationMessageReferenceViewer.vue`, `useNativeMediaPlayback.ts`, `VideoPlayer.vue`, `AudioPlayer.vue`, `FileViewer.vue`, `MediaSegment.vue`, and their specs.
  - `fff1b0af0c` (iOS): `NativeMediaPlayer.swift` and its UI test.

  The server, Android, iOS Core, layout and highlighting code is unchanged since round 1.
- Trigger: implementation engineer, IR-002, implementing:
  - SR-003, after CRR-001 CR-001 and C-2;
  - SR-004, after ARCH-REV-003 AR-002 (ARCH-REV-004 Pass).
- Prior Review Round Reviewed: round 1 (CRR-001)
- Latest Authoritative Round: 2
- Failure-origin fields: N/A

## Routing Classification Review

- Task size: `Large`. Architectural risk: `High`. Reasons:
  - a bridge contract rename across three platforms;
  - the credential handoff now covers audio too;
  - a server reply type change;
  - a layout rule;
  - the shared language map.
- Selected route: `Implementation Review`. Independent source review required: `Yes`. No correction to the classification.

## Review Scope

- **Reviewed:** branch `codex/file-viewer-media-642`, base `5c0db3a801`, head `fcc5aa5cd8`; code commits `76b29d70a9` through `4024239e07`. Every changed source file was read:
  - **Server:** `user-file-reply.ts`, the six routes, `message-reference-content-reader.ts`.
  - **Web:**
    - `useNativeMediaPlayback.ts`, `shellBridge.ts`;
    - `VideoPlayer.vue`, `AudioPlayer.vue`, `MediaSegment.vue`;
    - `FileExplorerLayout.vue`;
    - `languageDetector.ts`, `FileViewer.vue`, `FileDisplay.vue`, `highlightService.ts`.
  - **Android:** `media/*` (with the renames), `ShellBridge.kt`, `MainActivity.kt`, the manifest.
  - **iOS:**
    - `Media/NativeMediaPlayer.swift`, `ShellBridgeHandler.swift`, `WebShellViewController.swift`, `DemoWebViewController.swift`;
    - Core `Media/*`: `MediaKind`, `NodeMediaPlayRequest`, `NodeMediaURL`, `NodeMediaHTTP`, `AuthorizedMediaLoader`.
  - **Consumers of D-1's route:** `CollaborationMessageReferenceViewer.vue` and `MobileTeamReferenceViewer.vue`, read to check whether they use the new ranges.
- **Re-run by me at `fcc5aa5cd8`:**
  - server: the reply, routes, ranges and architecture tests, 43 passed; `message-reference-content-reader`, 10 passed;
  - web: the media, layout, viewer, highlighting, bridge and segment specs, 24 files and 257 tests passed;
  - Android: all JVM tests, 130 with 0 failures;
  - iOS: the whole Core suite on my own simulator (`cr642-review`, since deleted), 86 executed with 0 failures and 1 skipped (the AVPlayer video test needs a host video).
- **Environment note:** the run-history test files that import `@autobyteus/application-sdk-contracts` fail to load in this worktree because that sibling package is not built. This is an environment issue, not the change: the handoff ran the whole unit suite (9078 passed).
- **Explicit exclusions:** the Android instrumented tests and the iOS UI tests (IMP evidence used); the rendered probes (API/E2E).

## Round 3 Delta Verification (CRR-003)

**CR-002 is Resolved.**

- **The change:** the viewer's refetch watch is now multi-source. Its six getters (`contentPath`, `referenceId`, `path`, `type`, `updatedAt`, `refreshSignal ?? 0`) are each compared by value, so an equal new `reference` object no longer reloads or remounts the viewer.
- **What still reloads it:** a new `updatedAt`, and desktop's re-click (`referenceRefreshSignal`).
- **The spec:** two equal new objects give no fetch and no remount; `updatedAt` and `refreshSignal` each fetch.
  - IMP-13 shows it red on `26ebb05729` (`{ fetches: 3, mounts: 3 }`) and green after.
  - The double mount on first load is the pre-probe render with no URL, which the native player ignores (mode `page` for a null URL). One `playMedia` per open.
- **Re-run by me:** collaboration, mobile and viewer specs, 31 files and 308 tests passed.

## Round 2 Delta Review (CRR-002)

**CR-001 (round 1) is Resolved, and C-2 is resolved.**

- **The reference viewer (SR-003):** a Video or Audio reference sends one probe, `Range: bytes=0-0`. The 404 / `REFERENCE_NOT_FOUND` handling is unchanged. The probe's body is cancelled, and `contentUrl` itself goes to `FileViewer`, so the players' own paths apply:
  - desktop: the URL is streamed by range;
  - phone app: the native player, through `playMedia`;
  - phone browser: a blob, as before.

  Text, PDF and image references are unchanged.
- **The file name as input (SR-004):** `modeFor(url, fileName)` and `play(url, fileName)`. The URL-derived name is removed, and every caller passes the name it owns:
  - `FileViewer` passes `file.path` to the players;
  - `MediaSegment.fileNameOf` passes its `/rest/files/…` URL's last segment, decoded.

  `git grep` finds no other caller of `modeFor`, `play`, `VideoPlayer` or `AudioPlayer`.
- **C-2 (iOS):** audio gets a black, non-interactive cover with a `waveform` symbol and the file name over `contentOverlayView`. The screenshot `IMP-12-audio-playing.png` shows it: never blank, and a tap still reaches AVKit.
- **Re-run by me:** the web specs (collaboration, composables, fileExplorer, segments), 48 files and 397 tests passed.

### CR-002: on the phone, the native player re-opens by itself whenever the open reference's message list updates (Local Fix)

- **Severity:** Medium. 574's F-1 symptom (a player opening without a tap, and on Android a second player stacked on top) comes back by a new route, introduced by SR-003's native path for references.
- **Where:** `autobyteus-web/components/workspace/collaboration/CollaborationMessageReferenceViewer.vue:252-256`:
  `watch(() => [props.contentPath, props.reference.referenceId, props.reference.path, props.reference.type, props.reference.updatedAt, props.refreshSignal ?? 0], () => { void syncReferenceView(); }, { immediate: true })`.
- **Mechanism:**
  1. The getter returns a new array, and Vue fires a getter-source watch whenever the getter re-runs (`hasChanged` on a new array). The getter re-runs whenever `props.reference` is a new object, even one with the same values.
  2. The phone's host `MobileMessages.openReference` is a computed over `messagesView.listMessages()`. That re-projects every row, with new frozen reference objects (`participantMessageRows.ts:30`), whenever the participant messages change: a new message, or a counterpart or identity update.
  3. Each such update therefore runs `syncReferenceView` → `fetchContent`. Through `isLoading` that unmounts and remounts `FileViewer`.
  4. A remounted `VideoPlayer`/`AudioPlayer` in `native` mode calls `playNatively()` from its `immediate` watch.
- **Scenario:** S-1, the phone app. A user opens a video or audio reference while the team is still running, and the next message in that view arrives.
  - Android: a second `MediaPlayerActivity` starts over the first, so two Backs are needed.
  - Both apps, after Back: the player opens again by itself.

  Before IR-002 the same refetch only re-downloaded a blob into the page player.
- **Evidence:** a throwaway spec, deleted, not committed. It mounted the viewer for a video reference, then gave it `setProps({ reference: { ...reference } })` (equal values, new object). Probe fetches went 1 → 2 and `FileViewer` mounts went 2 → 3. With 574's `VideoPlayer` native spec (mount in `native` → `playMedia`), that is the re-open.
- **Required action (Local Fix, implementation):**
  - Make the viewer refetch only when a value changes, for example `watch([() => props.contentPath, () => props.reference.referenceId, () => props.reference.path, () => props.reference.type, () => props.reference.updatedAt, () => props.refreshSignal ?? 0], …)` (multi-source: each compared by value).
  - That also stops today's needless refetch of a text, PDF or image reference on every message.
  - Add a viewer spec: an equal new `reference` object neither refetches nor remounts the viewer, while a new `updatedAt` or `refreshSignal` does.
  - Keep desktop's explicit re-click (`referenceRefreshSignal`) working.
- **Not part of this:** desktop's `CollaborationMessagesPanel` passes the selected reference the same way. The value-compare fix covers it too (today a refetch there restarts the `<video>` element).
- **Held, not findings:**
  - A zero-byte media reference answers the `bytes=0-0` probe with 416, which shows as an error rather than as "could not be played". Contrived: an empty media file.
  - The iOS Back bar sits over AVKit's top buttons when the controls show, as for video since 574 (handoff Known Risks).

## Upstream Behavior And Production-Path Basis Confirmation

- **Approved requirements basis understood:**
  - message references served by range (REQ-001);
  - native audio in both apps, with per-app type lists (REQ-002);
  - the Files tab split by width (REQ-003);
  - the listed types highlighted in both engines (REQ-004).
- **Design-spec behavior map verified against the implementation:** D-1…D-4 are as designed. The implementation decisions 1–6 are judged below.
- **Design review report and round confirmed:** ARCH-REV-002 Pass, with N-1…N-5 applied:
  - N-1: the rule uses the tree minimum;
  - N-3: Monaco's `shell`;
  - N-4: the extension comes from the file the URL names;
  - N-5: iOS WebM goes to the page.
- Behavior-basis status: `Contradicted` for UC-001 (see CR-001). `Confirmed` for UC-002, UC-003 and UC-004.

| Behavior / UC | Status | Implementation Path And Evidence | Contradicting Evidence |
| --- | --- | --- | --- |
| UC-001 / REQ-001 (route) | Confirmed | The reader returns `{ mimeType, path, size, modifiedMs }` from one `statSync`; the route sets `no-store`, then `sendUserFile` serves ranges, an ETag and 304. The reader no longer opens an unused stream | — |
| UC-001 (the user opening a reference) | **Contradicted** | The route is ready, but its only client does not use it. On desktop and phone (`MobileTeamReferenceViewer` → `CollaborationMessageReferenceViewer`), `CollaborationMessageReferenceViewer.fetchContent` still reads the whole file with `authorizedFetch(contentUrl, { cache: 'no-store' })` into a blob, and the viewers play that blob. Neither file is in the change | The problem statement's item 1 ("a video or audio file reached through a message reference downloads whole") is unchanged for users. CR-001 |
| UC-002 / REQ-002 | Confirmed | The page owner `useNativeMediaPlayback(kind)` returns `native` only when the extension is in the app's list for that kind. The bridge sends `playMedia{kind,…}`; Android and iOS validate the kind, origin and `/rest/`; the kind chooses the screen (audio: portrait, title, controls) | — |
| UC-003 / REQ-003 | Confirmed | A `ResizeObserver` measures the layout. It splits only at ≥ 150 + 1 + 400 px, shows the tree at `min(treeWidth, width − 401)`, and clamps the divider to that | — |
| UC-004 / REQ-004 | Confirmed | One table with two lookups; Prism components are loaded after `clike`; Monaco is the full CDN build (`@monaco-editor/loader`), so every Monaco id used exists | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related IDs | Kind | Actor | Goal | Entry Surface | Shape | Forward Path | Expected Outcome | Evidence | Validity | Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S-1 | UC-001, REQ-001, problem item 1 | User | A desktop or phone user | Watch or listen to a file an agent referenced in a message | Messages: a reference's viewer (615) | Normal | `CollaborationMessageReferenceViewer.fetchContent` → `authorizedFetch` (whole) → blob → `FileViewer` | It plays without downloading the whole file first, which is the stated problem | Code read | Supported Normal Scenario | Use |
| S-2 | UC-002, REQ-002 | User | A phone user in the app | Play a node audio file | Files, chat link, media message | Normal | owner → `playMedia{audio}` → native player | Native player, portrait, title and controls | Code, IMP evidence | Supported Normal Scenario | Use |
| S-3 | UC-003 | User | A desktop user | Read a file in the Files tab | Right panel | Normal | `FileExplorerLayout` | Viewer ≥ 400 px | Code, spec | Supported Normal Scenario | Use |
| S-4 | UC-004 | User | Any user | See highlighted code | The viewer and chat previews | Normal | the table → Monaco / Prism | Highlighted | Code, specs | Supported Normal Scenario | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation | Scenario | Trigger | Consequence | Evidence | Disposition | Scope | Reason |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-1 | No client of the message-reference route sends `Range`. The reference viewer downloads the whole file into a blob on desktop and phone, so D-1 changes nothing a user sees | S-1 | Opening a video or audio reference | The ticket's problem item 1 stays unsolved, while AC-001 passes literally | `CollaborationMessageReferenceViewer.vue` (`fetchContent`, unchanged); the design's UC-001 validation stops at the route; the investigation's Item 1 read the server only | **Promote** → CR-001 | This ticket (UC-001 is in scope) | The intended user behavior is not stated. On desktop, should the viewer stream by URL (Electron adds the credential, as `useAuthorizedObjectUrl` already does for Files)? On the phone, should the native player be used (`playMedia`; the route now sends an ETag) or the page? That is a requirement decision |
| C-2 | iOS: AVKit hides its controls while audio plays (a tap shows them); Android keeps them shown | S-2 | Any iOS audio playback | REQ-002 says "the player shows … standard audio controls". On iOS the screen is black with the Back/title bar until tapped | Handoff Known Risks | Hold for Evidence | — | API/E2E should capture a frame for the user's judgement. I raise it with CR-001 as a question for the Solution Designer, not a finding |
| C-3 | `UserFileContent` lost its `stream` variant and its `kind` tag (the design said `kind: 'file'`) | Contract | — | After D-1 no route sends a stream, so the variant was dead and the one-value tag pointless | `grep` shows no `stream` writer | Reject (deviation holds) | — | Principle 7; the design's intent (served by range) is kept |
| C-4 | The iOS asset is typed by the file's extension instead of the probe's MIME type | S-2 | `.caf` sent as `audio/x-caf` | Without this, a listed type would not play | `NodeMediaURL.fileType`; `MediaKindTests` | Reject (deviation holds) | — | The lists are by extension, so the type matches the list |
| C-5 | Android passes the kind in the Intent | S-2 | — | Not secret, and it survives a process end | `MediaPlayerActivity.intent` | Reject (deviation holds) | — | The credential still goes only by token |
| C-6 | The cache folder is renamed to `media-cache`. A 574 build's `video-cache` would be orphaned | — | — | No installed app has it: no tag contains 574 (checked, `git tag --contains` empty) | DEC-003 | Reject | — | Holds while 574 stays unreleased; delivery ships 574 and 642 together |
| C-7 | iOS 26 also plays Ogg, Opus and FLAC, but they are kept off the list | S-2 | — | The app supports iOS 17, and REQ-002 sends Ogg/Opus to the page on iOS | `MediaKindTests` | Reject | — | Per the requirement; a later product choice |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment preserved | Pass | Handoff assessment | — |
| Matches behavior-defining supplemental artifacts | **Fail** | UC-001's outcome is not reached (CR-001) | Upstream: CR-001 |
| Data-flow spine clarity | Pass | D-2 spine: owner → bridge → app → player. D-1: reader → reply | — |
| Ownership boundaries | Pass | The media owner is the only bridge/credential user; the layout owns its own rule; the language table has one owner | — |
| Off-spine concerns | Pass | — | — |
| Existing capability reuse | Pass | 574's data source, loader, cache and redirect rules are reused unchanged | — |
| Reusable owned structures | Pass | `MediaKind` on each platform holds both the lists and the wire name | — |
| Shared-structure tightness | Pass | `UserFileContent` has one shape; `ShellMediaPlayer` is a record of lists | — |
| Repeated coordination ownership | Pass | Extension parsing: one helper per platform (`mediaTitleOf` / `fileName`) | — |
| Empty indirection | Pass | — | — |
| Separation of concerns / file responsibility | Pass | — | — |
| Ownership-driven dependencies | Pass | — | — |
| Visible dependencies | Pass | — | — |
| Authoritative Boundary Rule | Pass | — | — |
| File placement | Pass | `video/` → `media/`, `Video/` → `Media/` | — |
| Flat-vs-over-split layout | Pass | — | — |
| Interface clarity | Pass | `playMedia{kind,url,title,credential}` and `mediaPlayer{video[],audio[]}` are identical on all three sides | — |
| Naming | Pass | "Media" is used consistently (DEC-003, Principle 15). One leftover: the loader's queue label `org.autobyteus.video-loader` (cosmetic) | Optional |
| No unjustified duplication | Pass | — | — |
| Patch-on-patch control | Pass | — | — |
| Dead code removed | Pass | `getLanguage`, the `stream` variant, `useNativeVideoPlayback` and the probe's `contentType` are removed | — |
| Test scenarios clear and aligned | Pass | Each new case is red on the old code (IMP evidence) | — |
| Test fixtures coherent | Pass | — | — |
| No stale or compatibility tests | Pass | The `video` specs are renamed or replaced | — |
| API/E2E readiness | Blocked by CR-001 | — | — |

## Source File Size And Structure Audit

Every changed source file is under 500 effective lines. The largest are `MainActivity.kt` (395), `context-files.ts` (241) and `AuthorizedMediaLoader.swift` (225). No file grew by more than 220 lines.

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms | Pass | There is no `playVideo` path (DEC-003). Old app with new page, and new app with old page, both fall back to the page path, because each side ignores the other's names |
| No legacy retention | Pass | — |
| Dead code removed | Pass | — |
| Persisted-data transition | Pass | The renamed cache folder needs no migration (574 unreleased, C-6) |
| No dual reads/writes | Pass | — |
| Transition mechanics | Pass | — |

## Dead / Obsolete / Legacy Items Requiring Removal

None.

## Docs-Impact Verdict

- `Yes`, done in the change: NA-8, `remote_access.md`, `file_explorer.md`, `android_mobile_access.md`, `ios_mobile_access.md`, `design-cases.md`.
- CR-001's resolution may touch `file_explorer.md` or the Messages docs.

## Additional Material Premise Validation

None beyond the gate.

## Review Scorecard (Mandatory)

- Overall score: 8.9 / 10 (simple average; not the decision rule)

| Priority | Category | Score | Why | Weak | Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 8.0 | D-2, D-3 and D-4 spines are clear | UC-001's spine stops at the route; its client was never on it (CR-001) | Take the spine to the reference viewer |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.4 | One owner per rule | — | — |
| 3 | API / Interface / Query / Command Clarity | 9.4 | The bridge contract is identical on three sides | — | — |
| 4 | Separation of Concerns and File Placement | 9.3 | — | — | — |
| 5 | Shared-Structure / Data-Model Tightness | 9.4 | One-shape `UserFileContent`; `MediaKind` | — | — |
| 6 | Naming Quality and Local Readability | 9.2 | A clean rename | The loader's queue label still says `video-loader` | — |
| 7 | API/E2E Readiness | 8.5 | — | UC-001 cannot pass as a user scenario | After CR-001 |
| 8 | Runtime Correctness And Behavioral Fidelity | 8.0 | D-2, D-3 and D-4 correct; my re-runs are green | UC-001's outcome is not reached; iOS audio controls held (C-2) | CR-001 |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.5 | — | — | — |
| 10 | Cleanup Completeness | 9.4 | — | — | — |

## Findings

### CR-001: a message reference still downloads whole for every user. The route serves ranges, but no client asks for them (Requirement Gap)

- **Severity:** Medium. No regression, but the ticket's problem item 1 is not solved.
- **Where:** `autobyteus-web/components/workspace/collaboration/CollaborationMessageReferenceViewer.vue` (`fetchContent`: `authorizedFetch(contentUrl, { cache: 'no-store' })`, then `response.blob()` into an object URL). It is used on desktop and on the phone (`MobileTeamReferenceViewer`). Neither file is in the change.
- **Consequence:** after D-1 the route answers `Range` with 206, but the viewer never sends `Range`. A reference video or audio file still downloads whole before it plays:
  - on desktop, where `useAuthorizedObjectUrl` already lets Files stream by URL;
  - on the phone, where it neither streams nor reaches the native player.

  AC-001 passes, because it tests only the route.
- **Why upstream:** the requirements made the route behavior the requirement (REQ-001) but did not state what the user gets when opening a reference. The design's UC-001 validation stops at the route, and the investigation's Item 1 read only the server. Choosing the viewer behavior is a requirement decision:
  - desktop: hand the viewer the reference URL (stream, Range, Electron's credential) instead of a blob;
  - phone: hand a reference video or audio to the native player through `useNativeMediaPlayback`, since the route now sends the ETag the probe needs, or keep the page path;
  - and what text, PDF and image references keep, since today's blob path serves those too.
- **Required action:** route to `/solution_designer`. State UC-001's user outcome on desktop and phone, and extend the design to `CollaborationMessageReferenceViewer`, the route's only viewer: it builds the URL from `contentPath` (line 126) for both the desktop Messages panel and the phone's `MobileTeamReferenceViewer`. Then implementation adds it with its tests.

## Follow-ups

- Follow-ups this review added: None.

## Classification

`Requirement Gap` (CR-001), owned by `/solution_designer`. The rest of IR-001 (D-2, D-3, D-4 and the route itself) passes review and need not change.

## Recommended Recipient

`/solution_designer`

## Residual Risks

- **C-2:** iOS audio controls auto-hide. Raised to the Solution Designer as a question under REQ-002; API/E2E should capture a frame.
- **C-6:** the renamed cache folder holds only while 574 stays unreleased. Ship 574 and 642 in the same release.
- **Optional:** the loader's queue label still says `video-loader`.

## Latest Authoritative Result

- Review Decision: `Pass` (round 3, CRR-003). CR-001 and CR-002 are resolved.
- Review Entry Point: `Implementation Review` (Targeted Delta Review)
- Score Summary: 9.3 / 10. Runtime correctness is back to 9.3; every category is ≥ 9.2.
- Recommended Recipient: `/api_e2e_engineer`. Run:
  - AC-001 to AC-004 as written, including the reference journeys on the desktop (ranged requests) and in both apps (native);
  - a reference opened while new messages arrive (CR-002);
  - the iOS audio screen frame;
  - AC-002 timings on a throttled node with latency (574's lesson).
- Round 2 result (CRR-002, superseded):
- Review Decision: `Fail` (round 2, CRR-002). CR-001 is resolved; CR-002 is a new `Local Fix`, owned by implementation.
- Review Entry Point: `Implementation Review` (Targeted Delta Review)
- Score Summary: 9.1 / 10. Runtime correctness is 8.5 (CR-002); data-flow spine is back to 9.3 (CR-001 resolved).
- Recommended Recipient: `/implementation_engineer`, then a targeted delta code review.
- Round 1 result (CRR-001, superseded):
- Review Decision: `Fail`
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Fail` (S-1 not reached)
- Material-Premise Gate: `Pass`
- Score Summary: 8.9 / 10. Data-flow spine and runtime correctness are 8.0 (CR-001).
- Failure Origin: Requirement Gap (CR-001)
- Recommended Recipient: `/solution_designer`
- Notes:
  - D-1's route and all of D-2, D-3 and D-4 are sound. I re-ran server, web, Android JVM and iOS Core: all green.
  - Implementation's decisions 1–6 hold.
