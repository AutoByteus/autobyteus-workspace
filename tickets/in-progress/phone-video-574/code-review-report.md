# Code Review Report

## Review Round Meta

- Review Entry Point: `API/E2E Failure-Origin Review` (round 4, API-REV-003 F-3). The earlier rounds:
  - round 1 (CRR-001, Pass): implementation review;
  - round 2 (CRR-002, Fail): failure-origin review;
  - round 3 (CRR-003, Pass): targeted delta review;
  - CRR-004 (Pass): the test review, in `api-e2e-test-review-report.md`.

  Their sections below stay as recorded except where a later round updates them.
- Requirements Doc Reviewed As Context: `tickets/in-progress/phone-video-574/requirements-doc.md` (SR-001; REQ-001…005, AC-001…006, DEC-001 (b) and DEC-002 (a) approved by the user)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (P1–P3)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-001, SR-002)
- Design Spec Reviewed As Context: `design-spec.md` (SR-002, D-1…D-7, the data contract)
- Supplemental Task Artifacts Reviewed As Context: `probes/`, `follow-ups.md` (FU-001, FU-002)
- Relevant Solution Revision IDs: SR-001, SR-002
- Design Review Report Reviewed As Context: `design-review-report.md` (round 2 Pass; N-1…N-4)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-001, ARCH-REV-002
- Implementation Handoff Reviewed As Context: `implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001
- Code Review Revision Record: `tickets/in-progress/phone-video-574/code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-005`
- Current Review Round: `4` (failure-origin). The entries for round 3 follow.
- Round 4 scope and trigger:
  - API/E2E round 3 (API-REV-003, commit `ef3107bb3e`, on top of delivery `ad813b4e6d`) failed with F-3. Delivery DR-001 had asked API/E2E to attribute O-4.
  - Product code is unchanged since `64a99bbcd2`.
  - Re-read: `AuthorizedMediaLoader.swift` (content information and cache serving), `NativeVideoPlayer.swift` (`start`), and the evidence in `evidence/api-e2e/R3-O4/`. That evidence comprises the strips, `loader-requests-during-scrub.txt`, `on-demand-runs.log`, `b-c-frames-and-bytes.log` and `picture-check.log`.
  - Failing scenario: `NativeVideoRealNodeUITests.testAWideVideoFromTheChatLink`, which fails at line 49 (`pictureMoves`) on the clean tree.
- Review Scope: `Targeted Delta Review`. Round 1 was a `Full Review`; round 2 was failure-origin.
- Review Scope Evidence (round >1): the source delta `b0a2eeacc0..64a99bbcd2` is two fix commits:
  - `fb2357dc09`: `VideoPlayer.vue` and its spec;
  - `6479a28f4b`: `NodeVideoHttp.kt`, `NodeVideoURL.swift` and their tests.

  No other source changed: API/E2E's `cf3d344ff4` added only tests, scripts and a README. A delta review suffices because the rest of the round-1 audit is untouched.
- Trigger: the implementation engineer, IR-002 (the fixes for CR-001 and CR-002).
- Prior Review Round Reviewed: round 2 (CRR-002)
- Latest Authoritative Round: 3
- Coverage Investigation Reviewed: `api-e2e-coverage-investigation.md`
- Execution Coverage Report Reviewed: `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed: `api-e2e-revision-record.md`
- Relevant API/E2E Revision IDs: API-REV-001
- Delivery fields: N/A
- Failing Scenario IDs: AND-9 and IOS-11 (F-1); AND-8 and IOS-9 (F-2)
- Exact Failing Commands / Execution Mode:
  - `NativeVideoRealNodeUITests/testDARewriteDoesNotOpenThePlayerByItself` (iOS, real node);
  - the Android rewrite journey (adb + CDP);
  - `ac003.mjs` (Android bridge);
  - a temporary route-check XCTest against the real proxy (iOS).
- Failure Evidence Paths: `evidence/api-e2e/android/rewrite/*.png`, `ios/strips/f1-*.png`, `android/ac003/ac003-android-2.json`, `ios/route-check/route-check.txt`

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`. The phone credential reaches native code, there is a new bridge message, a new HTTP behaviour on every file route, disk caches of user files, and Media3 as a build input.
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: confirmed, no correction.

## Review Scope

- **Changed implementation and behavior reviewed:** branch `codex/phone-video-574`, base `4b73fccae2`, head `b0a2eeacc0`, five code commits:
  - `66534ef01c` (D-1 node);
  - `2c5673f890` (D-2 web);
  - `a526d58a7e` (Android D-3, D-5, D-6, D-7);
  - `648073efd9` (iOS D-4, D-5, D-7);
  - `8e666f6c78` (NA-8).
- **Files / areas reviewed (every changed source file, read in full):**
  - Server:
    - `api/rest/user-file-reply.ts`;
    - the routes `workspaces.ts`, `files.ts`, `context-files.ts`, `node-files.ts`, `run-file-changes.ts`, `collaboration-message-references.ts`;
    - `node-files/node-file-reader.ts`.
  - Web:
    - `composables/mobile/useNativeVideoPlayback.ts`;
    - `utils/remoteAccess/shellBridge.ts`;
    - `VideoPlayer.vue`, `MediaSegment.vue`;
    - the other viewers that mount `FileViewer` (artifacts, team and message references), which I checked to confirm they pass blob URLs.
  - Android:
    - `web/ShellBridge.kt`, `AutoByteusChromeClient.kt`, `WebMediaFullScreen.kt`, `WebFileChooserCoordinator.kt`, `AutoByteusWebView.kt`;
    - `MainActivity.kt`, the manifest and Gradle;
    - `video/NativeVideoPlayback.kt`, `NodeVideoHttp.kt`, `NodeVideoDataSource.kt`, `VideoCache.kt`, `VideoCacheKeys.kt`, `VideoPlayerActivity.kt`.
  - iOS:
    - `Shell/ShellBridgeHandler.swift`, `WebShellViewController.swift`, `DemoWebViewController.swift`, `AppShellCoordinator.swift`;
    - `Video/NativeVideoPlayer.swift`;
    - `AutoByteusMobileCore/Video/AuthorizedMediaLoader.swift`, `MediaRangeCache.swift`, `NodeVideoHTTP.swift`, `NodeVideoPlayRequest.swift`, `NodeVideoURL.swift`.
  - Docs: the NA-8 rows and the `docs/design-cases.md` entry.
  - Tests: the server range suite, the web owner, viewer and bridge specs, and the redirect cases on both platforms.
- **Re-run by me at `b0a2eeacc0`:**
  - server: `user-file-ranges`, `user-file-routes` and `node-file-reader` (37 passed);
  - web: `useNativeVideoPlayback`, `VideoPlayer.native`, `VideoPlayer` and `shellBridge` specs (27 passed).
  - The Android and iOS suites I took from IMP-03…IMP-06.
- **Explicit exclusions:** none of the platform suites were re-run (emulator and simulator runs belong to IMP-04/06 and API/E2E). Probes and test-fixture scripts (`fake-mobile-server.py`) were read only for intent.

## Upstream Behavior And Production-Path Basis Confirmation

- **Approved requirements basis understood:** the apps play a node video natively by range, with the credential only in a header. They cache by version and go fullscreen in landscape. The node serves Range, an ETag and `no-cache`. The browser, older apps and the desktop keep today's path.
- **Design-spec behavior map verified against the implementation:** yes. DS-1…DS-4 match the code.
- **Design review report and round confirmed:** ARCH-REV-002 Pass. N-1…N-4 are implemented:
  - N-1: both HTTP layers refuse redirects and are tested over real sockets.
  - N-2: a multi-range request gets 200.
  - N-3: the iOS cache tests exist.
  - N-4: cache keys are SHA-256 hashes.
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior: none.
- Remaining material ambiguity: none.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting / New Evidence |
| --- | --- | --- | --- |
| BEH-004 (REQ-005, AC-005) | Confirmed | `sendUserFile` → `sendFile` (`user-file-reply.ts`): ETag `"<size>-<floor mtimeMs>"`; `no-cache` unless the route set `no-store`; 304 before the range; `parseRange` gives one range, `ignore` (200) or `unsatisfiable` (416 with `*/size`); `If-Range` must equal the version. Every `kind: 'file'` route passes its `stat`. Message references stay `stream` (FU-001) | — |
| BEH-001 (REQ-001, AC-001) | Confirmed | Web: `useNativeVideoPlayback.modeFor` is `native` only with a bridge whose `hello.videoPlayer === true`, a credential, a protected URL and the same origin. `VideoPlayer.vue` plays at once and shows Play; `MediaSegment.vue` shows a tile. Android: probe `bytes=0-1` → `NodeVideoDataSource` (ranges, `If-Range`) under `CacheDataSource`. iOS: probe → `AuthorizedMediaLoader` serves the cache and then fetches only the gaps | — |
| BEH-002 (REQ-002, AC-002) | Confirmed | Key = node, path+query and ETag, hashed (Android `VideoCacheKeys`, iOS `MediaRangeCache.key`). Bounded LRU of 500 MB on both platforms. Node removal deletes by the node prefix (Android `MainActivity.openRemoveSheet`, iOS `AppShellCoordinator.presentRemove`) | — |
| REQ-003 (AC-003) | Confirmed | Web: the credential goes from the session store to `playVideo` only in the owner. Android: `ShellBridgeMessages.playVideoOf` requires the page's origin and `/rest/`; `toString` is redacted; an in-memory token is used, and the Intent carries only the token; `NodeVideoHttp` re-checks the origin, has `instanceFollowRedirects=false` and treats 3xx as an error. iOS: the handler checks `isFor(nodeOrigin:)`; `description` is redacted; an ephemeral session; `RedirectRefusingDelegate` returns `nil`; the credential is dropped in `viewDidDisappear`. The caches hold only bytes and range maps | — |
| BEH-003 (REQ-004, AC-004) | Confirmed | Android: the player's fullscreen button → 432's controller, and Back leaves fullscreen first; in-page video through `AutoByteusChromeClient` → `WebMediaFullScreen`. iOS: a wide video → `requestGeometryUpdate(.landscape)`, status bar hidden, Back → portrait | — |
| AC-006 (preserved) | Confirmed | No bridge, no `videoPlayer`, another origin, a blob URL or no credential all mean `page`. The artifact, team-reference and message-reference viewers hand `FileViewer` a blob URL, so they keep today's path | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related IDs | Kind | Actor | Goal / Event | Entry Surface | Shape | Forward Path | Expected Outcome | Evidence | Validity | Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S-1 | UC-001, BEH-001, REQ-003 | User | Phone user in the app | Watch a node video | Files viewer, chat link, media tile | Normal | page owner → `playVideo` → bridge check → player → probe → ranged reads | Plays at once; credential only in the header | Code; IMP-04/06 | Supported Normal Scenario | Use |
| S-2 | UC-002, BEH-002 | User | Same | Reopen; reopen after a change | Same | Normal | Probe ETag → same key (cache hit) or a new key | 0 bytes for cached spans; new bytes for a new version | Code; IMP-04/05 | Supported Normal Scenario | Use |
| S-3 | UC-003, BEH-003 | User | Same | Fullscreen and back | Player button / Back; in-page fullscreen | Normal | Controller / geometry update | Landscape with bars hidden; portrait with the position kept | Code; IMP-04/06 | Supported Normal Scenario | Use |
| S-4 | BEH-004, AC-005 | Contract | Any client | Ranged and conditional GET | Every `kind: 'file'` route | Normal | `sendUserFile` | 206/416/304/200 per contract | Code; tests re-run | Supported Normal Scenario | Use |
| S-5 | AC-003 alternate | Contract | Node page | A `playVideo` for another origin or route | Bridge | Explicit Edge | Bridge parser / handler | Nothing sent | Code; JVM and XCTest cases | Supported Explicit Edge Scenario | Use |
| S-6 | D-7 | User | Phone user | Remove a node | Remove sheet | Normal | Delete by node prefix | That node's cache gone | Code; IMP-04/05 | Supported Normal Scenario | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract | Independent Trigger | Forward Path / Consequence | Evidence | Disposition | Scope | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-1 | iOS: the app's own Back/title bar stays over the video in landscape. Android's bar hides with the controls | S-3 | Any iOS playback | Visible overlay at the top-left; the video still fills the screen and the system bars are hidden | `NativeVideoPlayer.swift` `addBackButton`; handoff Known Risks | Hold for Evidence | — | REQ-004's wording holds. Whether it is acceptable is a rendered-result judgment: API/E2E should capture a landscape frame for the user. Possible remedy: AVPlayerViewController's own close control, or hiding the bar with a tap or timer. Residual risk R-1 |
| C-2 | Android: a config change not in `configChanges` (`uiMode`, `fontScale`, `locale`, `density`) recreates `VideoPlayerActivity`; `take(token)` is then empty, so it shows "could not play" | S-1 | The system switches dark mode during playback | A loud failure with Back; a re-tap plays from the cache | `AndroidManifest.xml`; `NativeVideoPlayback.take` | Reject | — | The design accepts the loud failure for a recreated player ("finds nothing and says it could not play"). The same `configChanges` set as `MainActivity`. Noted as residual risk R-2 |
| C-3 | Android: two `playVideo` messages in quick succession; the second `put` replaces the first token, so the activity underneath shows "could not play" | S-1 | A double tap on Play or the tile | After Back from the playing activity, a "could not play" screen | `NativeVideoPlayback` holds one pending item | Hold for Evidence | — | Needs two clicks to reach the WebView. No evidence that it happens; iOS refuses a second `present`. Not prescribed |
| C-4 | iOS `MediaRangeCache.write` reads every entry's map (`evict` → `entries()`) on each received chunk | S-1, S-2 | Every network chunk | Disk work per chunk grows with the number of entries (bounded by 500 MB) | `MediaRangeCache.swift` | Hold for Evidence | — | No measured cost; the empty-cache start time is not explained by it. Hint for API/E2E if the iOS start time misses 2 s (R-3) |
| C-5 | `NodeFileReader` closes its handle and the reply re-opens the real path (it used to stream the checked handle) | S-4 | A local swap of the path between the check and the read | The route serves whatever is now at that path; it already serves any absolute node path to an owner or phone | `node-file-reader.ts`; design Interface Boundary Mapping | Reject | — | The design approved it; no access is gained. The workspace routes already used stat-then-open |
| C-6 | Android: a read at position 0 has no `Range`/`If-Range`; a file changed between the probe and that read caches new bytes under the old key | S-2 | An agent rewrites the file in that window | That key is never served again (the next probe gives a new ETag); later ranged reads fail loudly | `NodeVideoDataSource.open` | Reject | — | Nothing stale is ever shown. Not worth machinery |
| C-7 | The `/rest/` prefix check accepts `/rest/../x` or an encoded path | S-5, AC-003 | A page's `playVideo` with dot segments | **Round 2:** the URL is normalized (Android, OkHttp) or sent as is (iOS), so `GET /graphql` and `GET /mobile/` reach the node with the phone's header | API/E2E AND-8, IOS-9 | **Promote (round 2; was Reject)** | This ticket | AC-003 is an explicit contract: "another route: refused, and no request is sent". Rejecting it on impact grounds ignored that contract (review gap, CRR-002). → CR-002 |
| C-10 | `VideoPlayer.vue` re-opens the native player whenever `contentRevision` changes | S-1 | An agent rewrites the open file: live refresh (`fileExplorerTreeActions.ts:94` → `_reloadOpenFile` → `contentRevision += 1`) | The player opens by itself, or a second Android player stacks on top | API/E2E AND-9, IOS-11; code read | **Promote (round 2)** | This ticket | → CR-001. Round 1 trusted `FileViewer`'s comment ("an explicit open bumps `contentRevision`") without tracing the tree-change caller (review gap, CRR-002) |
| C-8 | iOS loader, cache and HTTP placed in `AutoByteusMobileCore` (design: the app) | Design file map | — | Enables the N-3 XCTests; only Foundation, AVFoundation and CryptoKit are used | handoff Important Assumptions | Reject (deviation holds) | — | Pass, deviation recorded, reason holds |
| C-9 | Android uses its own `NodeVideoDataSource` instead of `DefaultHttpDataSource` | N-1 | — | `DefaultHttpDataSource` re-sends properties on a same-protocol redirect; the design allowed "a custom redirect check in the data source" | handoff; `NodeVideoHttp` | Reject (deviation holds) | — | Pass, deviation recorded, reason holds |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment present and preserved | Pass | Handoff "Task Design Health"; no refactor needed; matches | — |
| Matches behavior-defining supplemental artifacts | Pass | The P2/P3 approach is kept; the N-1 gap from the prototypes is closed | — |
| Data-flow spine clarity | Pass | DS-1 is one line on each platform: owner → bridge → player → data source/loader → cache → route | — |
| Ownership boundary preservation | Pass | Components never touch the bridge or the credential (`useNativeVideoPlayback` is the one owner); `sendUserFile` owns Range and validators; the routes own resolution | — |
| Off-spine concerns | Pass | Cache, keys and fullscreen are separate owned files serving the player | — |
| Existing capability reuse | Pass | 432's `DesktopFullScreenController` reused; existing bridge, session store and `isProtectedRemoteAccessResourceUrl` | — |
| Reusable owned structures | Pass | One reply owner for 10 call sites; each platform has one HTTP class shared by its probe and reads | — |
| Shared-structure tightness | Pass | `UserFileContent` is a two-kind union, not optional fields; `OpenedNodeFile` dropped `stream` | — |
| Repeated coordination ownership | Pass | The origin and `/rest/` rule has one owner per platform (`NodeVideoHttp.isNodeFileUrl` / `NodeVideoURL.isNodeFileURL`), used by both bridge and HTTP | — |
| Empty indirection | Pass | `AutoByteusChromeClient` combines two real concerns; no forwarding-only wrappers | — |
| Separation of concerns / file responsibility | Pass | Each new file has one subject | — |
| Ownership-driven dependencies | Pass | Bridge → handoff → player → cache; the cache never sees the credential | — |
| Visible dependencies | Pass | The one process-wide holder (`NativeVideoPlayback`) is the design's; a missing entry fails loudly. `VideoCache`/`MediaRangeCache.shared` are single disk-cache owners | — |
| Authoritative Boundary Rule | Pass | Viewers call only the owner; the activity and view controller call only the HTTP class and the cache | — |
| File placement | Pass, deviation recorded, reason holds | iOS Core placement (C-8) | — |
| Flat-vs-over-split layout | Pass | `video/` folder per platform; small files | — |
| Interface clarity | Pass | `sendUserFile(reply, content, request)`; `modeFor`/`play`; `playVideo{url,title,credential}` the same on all three sides | — |
| Naming | Pass | `NodeVideoHttp`/`NodeVideoHTTP`, `VideoCacheKeys`, `MediaRangeCache`: one meaning each | — |
| No unjustified duplication | Pass | The platform twins are unavoidable (Kotlin/Swift) | — |
| Patch-on-patch control | Pass | — | — |
| Dead code removed | Pass | `NodeFileReader` stream gone; `chromeClient()` became `showFileChooser` | — |
| Test scenarios clear and requirement-aligned | Pass | Server AC-005 matrix incl. HEAD, If-Range and the rewrite; web owner matrix incl. older app, other site, unpaired; redirect over real sockets on both platforms | — |
| Test fixtures coherent | Pass | `TinyHttpServer`, `RangeFileServer`, `StubNodeProtocol`, `TinyHTTPListener` each serve one suite | — |
| No stale or compatibility-only tests | Pass | `VideoPlayer.spec.ts` pins `page` mode explicitly | — |
| API/E2E readiness | Pass | Handoff lists real-node journeys, AC-003 log scans and the iOS start time | — |

## Source File Size And Structure Audit

All changed source files are under 500 effective non-empty lines. Largest after: `MainActivity.kt` 395 (was 370), `context-files.ts` 242, `AppShellCoordinator.swift` 223. Largest delta: `VideoPlayerActivity.kt` +175 (new). No delta exceeds 220. Ownership and placement are as described above. No action.

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms | Pass | The `videoPlayer` hello capability is the store-distributed app's capability (DEC-005), not a node-version path |
| No legacy old-behavior retention | Pass | The blob path stays only for the browser and apps without the player (AC-006, by design) |
| Dead code removed | Pass | See above |
| Persisted-data transition followed | Pass | Rebuildable caches in the app-private cache folders; no migration |
| No dual reads/writes or old-shape fallback | Pass | — |
| Transition mechanics match design | Pass | — |

## Dead / Obsolete / Legacy Items Requiring Removal

None.

## Docs-Impact Verdict

- Docs impact: `Yes`, already done in this change: NA-8 (model and status rows), `docs/design-cases.md` (Case 3 again), both app READMEs.
- Delivery may add a video step to `docs/android_mobile_access.md` (handoff note).

## Additional Material Premise Validation

None new or reclassified.

## Review Scorecard (Mandatory)

- Overall score: 9.4 / 10 (simple average; not the decision rule)

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.5 | DS-1…DS-4 are each one readable line per platform | — | — |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.5 | One owner for playback (web), replies (node), HTTP and cache per platform; the credential path is narrow and redacted | — | — |
| 3 | API / Interface / Query / Command Clarity | 9.4 | Two-kind `UserFileContent`; `playVideo` the same on three sides | — | — |
| 4 | Separation of Concerns and File Placement | 9.3 | Small single-subject files | iOS Core placement differs from the file map (reason holds) | — |
| 5 | Shared-Structure / Data-Model Tightness | 9.4 | Union types; hashed keys; range map only bytes | — | — |
| 6 | Naming Quality and Local Readability | 9.4 | Clear names and comments that state the security rule | — | — |
| 7 | API/E2E Readiness | 9.3 | Concrete journeys and log scans listed | The iOS in-app start time (AC-001 < 2 s) is unmeasured; the headless test gives 2.2–2.4 s | API/E2E measures it in the app |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.3 | Range/ETag/If-Range correct; If-Range guards versions; redirects refused; tests re-run green | C-1 (iOS overlay) and C-4 are held for evidence | Evidence from API/E2E |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.5 | — | — | — |
| 10 | Cleanup Completeness | 9.5 | Reader stream and `chromeClient()` removed | — | — |

## Findings

Round 3 status: **CR-001 and CR-002 are Resolved** (CRR-003). The texts below are kept as found in round 2.

### CR-001: a rewrite of the open video re-opens the native player by itself (F-1)

- **Severity:** Medium. A user-visible regression of D-2 on both apps.
- **Where:** `autobyteus-web/components/fileExplorer/viewers/VideoPlayer.vue:62-65`, the watcher on `[playbackMode, url, contentRevision]`. It treats every `contentRevision` change as "reopened".
- **Cause:** `contentRevision` is bumped by two paths:
  - an explicit re-open of an open file (`fileExplorerContentActions.ts:139`);
  - live refresh when the file changes (`fileExplorerTreeActions.ts:94`), both through `_reloadOpenFile` (`:160`).
- **Consequence:** an agent rewriting the file:
  - Android, with the player open: a second `VideoPlayerActivity` stacks on top, so it takes two Backs to leave.
  - Both apps, after Back with the viewer still showing: the full-screen player pops up by itself (AND-9, IOS-11).
- **Required action (Local Fix, implementation):**
  - Open the player automatically only when the viewer first reaches `native` for a URL: on mount, on a URL change, or on the `pending` → `native` transition. Not on `contentRevision`.
  - The Play button stays for any later open.
  - Add a web spec: a `contentRevision` change while mounted in `native` mode posts no `playVideo`.
  - An explicit re-tap of the same, already-open file in Files then shows the viewer with Play. That is acceptable: the store cannot tell the two bumps apart, and the viewer must not guess.
  - `NativeVideoRealNodeUITests.testDARewriteDoesNotOpenThePlayerByItself` is the end-to-end check.

### CR-002: the route check in both apps lets dot segments through (F-2)

- **Severity:** Medium. AC-003's refusal leg fails. The credential stays on the same node, but it is sent to routes the contract excludes.
- **Where:**
  - Android: `NodeVideoHttp.isNodeFileUrl` (`rawPath.startsWith("/rest/")`).
  - iOS: `NodeVideoURL.isNodeFileURL` (`url.path`/`percentEncodedPath` `hasPrefix("/rest/")`).
- **Consequence:** `/rest/../graphql`, `/rest/%2e%2e/graphql` and `/rest/../mobile/` pass. Android's HTTP stack normalizes them, and iOS sends them unchanged, so the node receives `GET /graphql` and `GET /mobile/` with the phone's `Authorization` header (AND-8, IOS-9).
- **Required action (Local Fix, implementation), in each platform's one owner of the rule:**
  - Refuse a path when any segment, after percent-decoding, is `.` or `..` or contains `/` or `\`.
  - Then check the `/rest/` prefix on the raw path. Refusing is simpler and safer than normalizing, because the bridge, the probe and every read use the same check.
  - Add unit cases on both platforms: the three URLs above, an encoded slash `/rest/a%2f..%2f..%2fgraphql`, and a control (a legitimate `/rest/workspaces/…/content?path=a%2F..%2Fb.mp4`, whose dots are in the query and must stay allowed).

## Follow-ups

- Follow-ups this review added: None. FU-001 and FU-002 are unchanged. FU-001's premise holds: the message-reference viewer hands `FileViewer` a blob URL, so it keeps today's path.

## Classification

`Local Fix`, for both CR-001 and CR-002, owned by implementation.
- The design's rules are right: "a tapped video opens the player" (D-2), and "a non-`/rest/` URL is ignored, nothing is sent" (D-5, AC-003).
- The code does not meet them. No requirement or design change is needed.

## Recommended Recipient

`/implementation_engineer`. After the fixes, the route is code review (a targeted delta) and then API/E2E.

## Residual Risks

- **R-1 (C-1): the iOS Back/title bar stays over the video in landscape.** API/E2E should capture a landscape frame on the simulator so the user can judge it. If it is not acceptable, the bounded remedy is AVPlayerViewController's own close control, or hiding the bar with the controls (a tap or a timer).
- **R-2 (C-2): Android "could not play" after a config change outside `configChanges`** (for example a scheduled dark-mode switch during playback). It fails loudly, and a re-tap plays from the cache.
- **R-3: the iOS start time.** The headless test gives 2.2–2.4 s against AC-001's < 2 s. If the in-app measurement misses, check these first:
  - AVPlayer's `automaticallyWaitsToMinimizeStalling` and `preferredForwardBufferDuration`;
  - the cache's per-chunk map and eviction work (C-4).
- **The disclosed iOS risks:**
  - a range can be fetched twice on a first play (bandwidth only);
  - Apple's simulator log shows the request path, never the credential (a device redacts it).
- **Not run by me:** the Android and iOS suites (IMP-03…06 evidence used).

## Round 4 Failure-Origin Finding (CRR-005)

### CR-003: an iOS scrubber drag freezes the picture of a node video, while the clock runs on (F-3)

- **Severity:** Medium. AC-001's "a seek to the middle plays within 2 s" fails on iOS for the platform's own scrubber, the main way a user seeks. The skip buttons and precise seeks work.
- **Where:** `autobyteus-ios/AutoByteusMobileCore/Video/AuthorizedMediaLoader.swift`, `resourceLoader(_:shouldWaitForLoadingOfRequestedResource:)`. The `contentInformationRequest` gets the content type, the length and `isByteRangeAccessSupported = true`, but not `isEntireLengthAvailableOnDemand`.
- **Attribution (API/E2E controls, same simulator, stack and file).** It is the loader path:
  - **The path decides.** Through the loader the picture stops (2/2, on both a first open and a cached video). A byte-identical plain file in the same screen plays on (2/2).
  - **Not the data.** The frames are pixel-identical to the plain file's, and the served bytes and the cache are byte-identical to the file.
  - **Not starvation.** AVFoundation sends no request during or after the scrub.
  - **The flag flips it.** Setting `isEntireLengthAvailableOnDemand = true` makes the same drag play on (2/2), and a run without it in between froze again.
- **Why the flag is correct and not a workaround:** this loader can serve any byte range at any time, from the cache or by a ranged fetch. That is exactly what the property declares (iOS 16+; the app targets iOS 17.0, so no availability check is needed). Without it, AVFoundation treats the resource as a progressive download, and its scrubbing path then stalls.
- **Required action (Local Fix, implementation):**
  1. Set `information.isEntireLengthAvailableOnDemand = true` beside `isByteRangeAccessSupported`, with a one-line reason.
  2. Verify on your own simulator with the durable `NativeVideoRealNodeUITests.testAWideVideoFromTheChatLink` (its `pictureMoves` check). Run it on a first open and again with the video cached.
  3. Re-run the Core suite (`AuthorizedMediaLoaderTests`, reopen 0 bytes).
- **Consider, not required:** for a cached video, a to-end request is answered by pushing the whole file in one synchronous loop: 22.9 MB in 17 ms, per `loader-requests-during-scrub.txt`. A cancel cannot arrive until the loop ends, so a large cached video is handed to AVFoundation all at once. If you touch this area, serving the cache in bounded steps (re-entering `advance` through `queue.async`) lets a cancel in between. I held this for evidence (no memory measurement), so it is not part of the finding.
- **Review gap:** round 1 read these content-information lines and did not compare their declaration with what the loader actually supports. The symptom shows only in an interactive scrub, which no review or unit test exercised. Recorded in CRR-005.

### Test-code note for the next test review (T-2, non-blocking)

`pictureMoves` compares two full-screen screenshots. If the player's controls are still showing, the moving time label alone makes them differ, which would be a false pass. On the defect it did fail (2/2), so the controls were hidden at this timing. Making it robust is cheap: compare a crop of the video's centre, or wait until the scrubber is gone or not hittable first. That is for API/E2E; I will review it after the next pass.

## Round 3 Delta Verification (CRR-003)

| Finding | Fix | Verification |
| --- | --- | --- |
| CR-001 | `VideoPlayer.vue` watches `[playbackMode, url]` only. It plays when the mode becomes `native` or the URL changes (`immediate` covers mount); `contentRevision` no longer triggers anything, and Play still does | The new spec case (two `contentRevision` bumps: no `playVideo`; Play: one; no download) fails on the pre-fix code (IMP-11) and passes. I re-ran `VideoPlayer.native.spec.ts`: 5 passed |
| CR-002 | One rule per platform (`NodeVideoHttp.isNodeFileUrl`, `NodeVideoURL.isNodeFileURL`), used by the bridge, the probe and every read. It refuses a raw-path segment that percent-decodes to `.` or `..`, contains `/` or `\`, or does not decode, then checks `/rest/`. Android keeps `+` literal (`replace("+","%2B")` before `URLDecoder`) | The cases include all three API/E2E URLs, encoded slash and backslash, `.`/`%2E`, a query with dots and `my..clip.mp4` (allowed), and on Android "nothing sent" against a real local server. They fail on the old rule on both platforms (IMP-11). I re-ran Android `NodeVideoHttpTest` (8) and `ShellBridgeMessagesTest` (17): all pass. For iOS I used IMP-11 (75 Core tests, 0 failed) |

- **Structure:** the fix stays in each platform's existing single owner of the rule, with no new mechanism. Sizes are unchanged in effect (`NodeVideoHttp.kt` 110 → about 118).
- **Cosmetic, not a finding:** the iOS test's `guard let url = URL(string:) else { continue }` would skip a case silently if a URL did not parse. All listed URLs do parse.

## Latest Authoritative Result

- Review Decision: `Fail` (round 4, CRR-005). The failure origin is implementation: CR-003, `Local Fix` in the iOS loader.
- Review Entry Point: `API/E2E Failure-Origin Review`
- Recommended Recipient: `/implementation_engineer`. After the fix: a targeted delta code review, then an API/E2E rerun (`testAWideVideoFromTheChatLink` on a first open and cached; the iOS journeys of round 2).
- No requirement or design change is needed: the design's "AVPlayer with a key-adding resource loader" holds.
- Round 3 result (CRR-003, superseded):
- Review Decision: `Pass` (round 3, CRR-003). CR-001 and CR-002 are resolved.
- Review Entry Point: `Implementation Review` (Targeted Delta Review)
- Score Summary: 9.4 / 10. Runtime correctness is back to 9.3 now that both findings are fixed; the other categories are as in round 1.
- Recommended Recipient: `/api_e2e_engineer`. Rerun AND-8, AND-9, IOS-9 and IOS-11 (including `testDARewriteDoesNotOpenThePlayerByItself`).
- Round 2 result (CRR-002, superseded):
- Review Decision: `Fail`. The failure origin is implementation (CR-001, CR-002).
- Review Entry Point: `API/E2E Failure-Origin Review` (round 2)
- Failure Origin: implementation defects, `Local Fix`. Both were review gaps of mine in round 1, recorded in CRR-002.
- Recommended Recipient: `/implementation_engineer`
- Round 1 result (CRR-001, superseded):
- Review Decision: `Pass`
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`
- Score Summary: 9.4 / 10 in round 1. A failure-origin round has no scorecard. CR-001 and CR-002 lower "Runtime Correctness And Behavioral Fidelity" below 9.2 until they are fixed.
- Notes: the credential path holds on both platforms:
  - checked against the page's origin and `/rest/` at the bridge, and again before every send;
  - sent only as a header, with no redirect followed;
  - redacted in `toString`/`description`;
  - kept out of Intents, URLs and caches.

  The two placement deviations are sound. R-1…R-3 are for API/E2E to observe; none of them blocks.
