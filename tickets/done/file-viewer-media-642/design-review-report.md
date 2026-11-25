# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/file-viewer-media-642/tickets/in-progress/file-viewer-media-642/requirements-doc.md` (SR-003, Approved; REQ-001/REQ-002/AC-001 revised within the direction after CRR-001)
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/file-viewer-media-642/tickets/in-progress/file-viewer-media-642/investigation-notes.md`
- Upstream Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/file-viewer-media-642/tickets/in-progress/file-viewer-media-642/solution-revision-record.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/file-viewer-media-642/tickets/in-progress/file-viewer-media-642/design-spec.md` (SR-006; round 6 reviews its SR-006 section)
- Supplemental Task Artifacts Reviewed: `handoff-architecture-design-complete.md`; `code-review-report.md` (CRR-001, CR-001, C-2)
- Relevant Solution Revision IDs: SR-001…SR-006
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/file-viewer-media-642/tickets/in-progress/file-viewer-media-642/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-006`
- Current Review Round: 6
- Trigger: Solution Designer's revised design SR-002 after ARCH-REV-001 (committed at `a5fd87067e`), 2026-11-24
- Round 3 trigger: SR-003 after code review CRR-001 (committed at `f270e067dd`; implementation IR-001 at `fcc5aa5cd8`), 2026-11-24
- Round 4 trigger: SR-004 after ARCH-REV-003 AR-002 (committed at `5de17dc4b4`), 2026-11-24
- Round 5 trigger: SR-005 (DEC-007, iOS audio session) from API/E2E's evidence request (committed at `0bcba9ed6a`), 2026-11-25
- Round 6 trigger: SR-006 (DEC-008) from API/E2E's Unclear on AC-004 (committed at `b0dcf5e94b`), 2026-11-25
- Prior Review Round Reviewed: 5 (ARCH-REV-005, Pass)
- Latest Authoritative Round: 6
- Current-State Evidence Basis (round 6):
  - `rg FileDisplay` and Nuxt auto-import names (`…RendererFileDisplay`): no template or dynamic use; only `tests/integration/app-font-size-fixed-px-audit.integration.test.ts:29` lists it;
  - `rg getPrismLanguage`: `FileDisplay.vue:19,29` and the table's spec only;
  - `utils/markdownItPrism.ts` (used by `composables/useMarkdownSegments.ts`) → `services/highlightService.ts:55-75` (`Prism.languages[lang.toLowerCase()] || plaintext`).
- Current-State Evidence Basis (round 5): `git grep -n "setCategory\|AVAudioSession" -- autobyteus-ios` is empty, so the app runs in the default Solo Ambient category; `AutoByteusMobile/Media/NativeMediaPlayer.swift:12,29,205` (`NativeMediaPlayerViewController` owns the `AVPlayerViewController`; an explicit `dismiss` at `:205`).
- Current-State Evidence Basis (round 4):
  - web `components/conversation/segments/MediaSegment.vue:25-55` (audio and video tiles call `modeFor(url)`/`play(url)`; the title is from the URL today);
  - `FileViewer.vue:39-40,86-87` (the only host of `VideoPlayer`/`AudioPlayer`);
  - media segment sources: `runProjectionConversation.ts:184-190`, `eventMonitorActiveTraceBrowsePresentation.ts:57`, `segmentTypes.ts:185` (`ASSISTANT_COMPLETE` `*_urls`). These are node `/rest/files/<relativePath>` URLs (`media-storage-service.ts:241`) or external URLs.
- Current-State Evidence Basis (round 3): implemented tree at `f270e067dd`.
  - `api/rest/collaboration-message-references.ts:25` (route `…/messages/:messageId/references/:referenceId/content`: no file name in the URL);
  - web `components/workspace/collaboration/CollaborationMessageReferenceViewer.vue:60-72,111,124,177-205` (the viewer knows `reference.path` and passes it to `FileViewer` as `file.path`);
  - `composables/mobile/useNativeMediaPlayback.ts:44-91` (`mediaTitleOf`/`mediaExtensionOf` read the URL's `path` query, else its pathname; `modeFor` answers `page` for an empty extension);
  - `components/fileExplorer/viewers/VideoPlayer.vue:36-66` (`modeFor(props.url)`, `play(props.url, title)`).
- Round 1 basis: branch `codex/file-viewer-media-642` at `922e0f067f` (base `origin/personal` `5c0db3a801`). Checked:
  - `git fetch --tags; git tag --contains 7cbab1f7c2`: empty, so 574 is unreleased;
  - web `utils/remoteAccess/shellBridge.ts:11-19,81-88` (`ShellHello` = `nodeCount`, `deviceName`, `nodeName`, `videoPlayer`; no platform field) and `composables/mobile/useNativeVideoPlayback.ts:57`.
  The investigation's citations for items 1, 3 and 4 were taken as read and are consistent with 574's merged code.

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Classification rationale reviewed: the web↔app bridge contract changes across three codebases (the rename); a server route changes; the web layout and both highlighting engines change. No security change (NA-8 unchanged).
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: None.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed` (round 4: the file name is an explicit input from each caller; AR-002 resolved. Round 2: each app states the extensions its player plays per kind; REQ-002 matches; AR-001 resolved).
- Approved requirements / intended behavior understood: Yes (REQ-001…004; DEC-001…003).
- Relevant existing behavior and evidence confirmed: Yes. 574's native path, `sendUserFile`'s `kind: 'file'`, the split-by-mode layout and the one map with Prism names are all as described.
- Scope guardrail confirmed: Yes.
- Every prospective blocking `Design Impact` finding is traceable: `Yes` (AR-001 → REQ-002, AC-002).
- Statements about existing code the design relies on:
  - "574 is unreleased": confirmed (no tag contains `7cbab1f7c2` after fetching tags), so the clean `playVideo` → `playMedia` rename needs no compatibility path (Principle 8, DESIGN.md rule 9).
  - "On iOS, an `.ogg` or `.opus` keeps the page path (the composable's audio kind accepts only types AVPlayer plays)": the composable runs in the page, and the page cannot tell iOS from Android. `ShellHello` has no platform field, and `mediaPlayer` is designed as a plain boolean. See AR-001.

| Behavior / REQ | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-001 (SR-003: a reference's media not downloaded whole) | User | Pass | Pass | Pass (SR-004: `FileViewer` passes `file.path` = `reference.path`; mp4/m4a references native in the apps, ranged on the desktop) | Confirmed | AR-002 resolved |
| REQ-002 (native audio by the app's stated types) | User | Pass | Pass | Pass (SR-002 walks: `.ogg` Android native, iOS page; `.mp3` both native; `.webm` video iOS page) | Confirmed | AR-001 resolved |
| REQ-003 (Files layout by width) | User | Pass | Pass | Pass (note N-1) | Confirmed | — |
| REQ-004 (one language table, two engine names) | User | Pass | Pass | Pass | Confirmed | — |

## Supplemental Artifact Coherence Verdict

None beyond the handoff (consistent).

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment present | Pass | Each item's cause is read: references open a stream; split chosen by mode; one map with two vocabularies (Principle 15) | — |
| Refactor decision explicit | Pass | The rename (Principle 15), and one table with two lookups | — |

## Data Contract Verdict

| Record / Message | Each Field Has A Meaning, A Writer And A Reader? | Identities, Relationships And Lifecycle Are Explicit? | Each In-Scope Flow Walked Through It, With An Example Per Case? | Checked Against Existing Data And Real Dependencies It Relies On? | The Layers Above Follow It Without Mappings, Recomputed Facts Or Second Copies? | Verdict |
| --- | --- | --- | --- | --- | --- | --- |
| Bridge `playMedia {kind,url,title,credential}` | Pass | Pass (574's lifecycle) | Pass for formats both players play | Pass | Pass | Pass |
| Bridge `hello.mediaPlayer: { video: string[], audio: string[] }` | Pass (each app writes its own player's extensions; the composable reads them) | Pass (absent = page path) | Pass (four walks) | Pass (lists to be confirmed against each platform by implementation) | Pass (the app owns the fact; no platform guess) | Pass |
| `MessageReferenceContent` → `kind: 'file'` | Pass | Pass | Pass | Pass (`sendUserFile` from 574) | Pass | Pass |
| Language table entry `{ext/names, monaco, prism}` | Pass | Pass | Pass (examples) | Pass (Monaco 0.52.2 basic languages; Prism components) | Pass (one table, two lookups) | Pass |

## Spine Inventory Verdict

| Spine ID | Scope | Readable? | Narrative Clear? | Facade Vs Owner? | Naming? | One Owner Per Node, In Order? | Off-Spine Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Reference read (D-1) | Primary | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| Media play (D-2) | Primary | Pass | Pass (native only when the extension is in the app's list for its kind) | Pass | Pass | Pass | Pass | Pass |
| Files layout (D-3) | Local | Pass | Pass | N/A | Pass | Pass (the layout owns the rule) | Pass | Pass |
| Highlighting (D-4) | Primary | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Entry Point Clear? | Internals Stay Internal? | Bypass Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `useNativeMediaPlayback` | Pass | Pass | Pass | Pass | Decides native vs page; needs AR-001's input |
| `FileExplorerLayout` (width rule) | Pass | Pass | Pass | Pass | — |
| `languageDetector` (table) | Pass | Pass | Pass | Pass | — |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner | Allowed Clear? | Forbidden Explicit? | Coherent? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Components → playback composable → bridge | Pass | Pass | Pass | Pass | — |

Principle 16: `Pass`.

## Interface Boundary Verdict

| Interface | Subject Clear? | Singular? | Identity Explicit? | Generic Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `getMonacoLanguage(path)`, `getPrismLanguage(path)` | Pass | Pass | Pass | Low | Pass (Principle 15: one word, one meaning) |
| `useNativeMediaPlayback(kind)` | Pass | Pass | Pass | Low | Pass |
| `MessageReferenceContentReader.resolve` → file | Pass | Pass | Pass | Low | Pass |

Empty indirection check: `N/A`.

## Existing Capability / Subsystem Reuse Verdict

| Need | Checked? | Decision Sound? | New Piece Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Ranged replies | Pass (574's `sendUserFile`) | Pass | N/A | Pass | — |
| Native audio | Pass (574's players, data sources, caches) | Pass | N/A | Pass | — |
| Stacked layout | Pass (existing) | Pass | N/A | Pass | — |

## Subsystem / Capability-Area Allocation Verdict

| Area | Allocation Clear? | Decision Sound? | Supports Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Server, web (media, layout, highlighting), Android `media/`, iOS `Media/` | Pass | Pass | Pass | Pass | — |

## Reusable Owned Structures Verdict

| Structure | Evaluated? | Shared File Sound? | Ownership Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Language table | Pass | Pass | Pass | Pass | Replaces one map with a second meaning |

## Shared Structure Tightness Verdict

| Structure | One Meaning Per Field? | Redundant Removed? | Overlap Controlled? | Core Vs Variant | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Language table entry | Pass | Pass | Pass | N/A | Pass | — |

Derived consumers listed: `Pass` (the rename's readers on three sides and the docs; the table's two readers; the layout's mode source).

Vocabulary: `Pass` (`media` for a player of video and audio; `getMonacoLanguage`/`getPrismLanguage` end the one name with two meanings).

## File Responsibility Mapping Verdict

| File | Singular? | Matches Owner? | Re-Tightened? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Final File Responsibility Mapping | Pass | Pass | N/A | Pass | — |

## Subsystem / Folder / File Placement Verdict

| Path | Clear? | Folder Matches Owner? | Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Android `media/`, iOS `Media/`, `composables/mobile/useNativeMediaPlayback.ts` | Pass | Pass | Low | Pass | — |

## Removal / Decommission Completeness Verdict

| Item | Named? | Replacement Clear? | Scope Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `Video`-named files, types and messages; `getLanguage`; the stream branch of the reference reader | Pass | Pass | Pass | Pass | — |

## Legacy / Backward-Compatibility Verdict

| Area | Retention Exists? | Clean-Cut Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| `playVideo` / `videoPlayer` | No (574 unreleased, verified) | Pass | Pass | — |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Evidence Sufficient? | Choice Proportionate? | Migration Safety | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 574's app caches (directory may follow the rename) | No migration | Pass (unreleased: no installed caches) | Pass | N/A | Pass | — |

## Change / Refactor Safety Verdict

| Area | Realistic? | Seams Explicit? | Cleanup Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Mechanical rename, then the audio branch; both app suites and the web suite | Pass | Pass | Pass | Pass (note N-2 on rule 12) |

## Example Adequacy Verdict

| Topic | Needed? | Present? | Bad Shape? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `playMedia`, `hello.mediaPlayer`, table rows | Yes | Pass | N/A | Pass | — |

## Material Premise Validation (Only When Needed)

None. AR-001 rests on the approved requirement itself (REQ-002's iOS-only exclusion) and on the cited contract.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Pass` (round 6)

## Findings

None open. AR-002 and AR-001 below are `Resolved` and kept for traceability.

### AR-002 — A reference's media never reaches the native player: its URL names no file, and the composable takes the type from the URL

- Status: `Resolved` (SR-004; verified in ARCH-REV-004)
- Type: Design Impact
- Severity: Medium (blocking in round 3; small fix)
- Protects: REQ-001 (SR-003: "in the phone apps it plays in the native player"), AC-001 (the apps play a reference natively, with ranged requests), REQ-002 (the player's title is the file name).
- Scope status: Within Approved Scope. Changes approved behavior: No.
- Concrete problem: D-1b passes the reference's `contentUrl` to `FileViewer` → `VideoPlayer`/`AudioPlayer`, and says a phone app "uses `useNativeMediaPlayback` (`playMedia`)".
  - The composable decides the type, and so native or page, from the file the URL names: its `path` query, else its pathname (`useNativeMediaPlayback.ts:44-62,77-82`). This is the rule my round-2 note N-4 asked for, without considering references.
  - A reference URL is `…/messages/:messageId/references/:referenceId/content` (`collaboration-message-references.ts:25`). Its last segment is `content`, with no extension, so `modeFor` answers `page` (`:82`). The phone app then downloads the file whole through the page path, which is exactly what SR-003 removes.
  - The native title would also be `content`.
  - SR-003's validation row "Phone app: an `mp4` reference → `playMedia{kind:'video'}`" therefore does not hold.
- Evidence: the files and lines above. The viewer already holds the real file path (`reference.path`, `:111`) and passes it as `file.path` (`:60-72`).
- Required update: make the file's name an explicit input of the decision, written by the owner that knows it, instead of a fact recovered from the URL.
  - Example: `useNativeMediaPlayback` takes the file name, as `modeFor(url, fileName)` and `play(url, fileName)`, or `VideoPlayer`/`AudioPlayer` take a `fileName` prop.
  - `FileViewer` passes `file.path` to its players. The reference viewer already gives `reference.path` there; the workspace and node viewers give their file paths.
  - The URL-based name stays only where no caller has one (for example a chat media URL), or is removed if every caller passes the name.
  - Walk an `mp4` and an `m4a` reference on the phone app (native, title = file name), the same on the desktop (ranged), and a workspace file (unchanged).
  - Add a viewer or composable spec with a reference URL.
- Why proportionate: one argument, from the owner of the fact (Principle 11: do not recompute a fact from a URL that does not carry it).
- Recommended recipient: Solution Designer.

### AR-001 — The page cannot apply REQ-002's per-app audio format rule: `hello.mediaPlayer` is a boolean and `hello` names no platform

- Status: `Resolved` (SR-002; verified in ARCH-REV-002)
- Type: Design Impact
- Severity: Medium (blocking in round 1; small fix)
- Protects: REQ-002 ("In both apps, a node audio file plays through the app's native player … On iOS, a format AVPlayer cannot play (Ogg, Opus) keeps the page path"); AC-002.
- Scope status: Within Approved Scope. Changes approved behavior: No.
- Concrete problem: the native-or-page decision is made in the page (`useNativeMediaPlayback`). The design says its audio kind "accepts only types AVPlayer plays". But the page cannot tell the iOS app from the Android app: `ShellHello` has no platform, and `mediaPlayer` is a plain boolean. That leaves two outcomes, both wrong:
  - the AVPlayer list is applied on both apps, so an Ogg/Opus on Android takes the page path, against "in both apps … plays through the native player";
  - or the page guesses the platform (a user-agent sniff: a second, hidden source of an app fact).
  If an unsupported file were sent to the iOS player anyway, `playMedia` has no reply, so the failure would be on the native screen instead of the page path REQ-002 requires.
- Evidence: `shellBridge.ts:11-19,81-88`; design-spec Data Contract (`mediaPlayer: boolean`) and Risks ("the composable's audio kind accepts only types AVPlayer plays").
- Required update: let the app, which owns its player's abilities, tell the page what it plays, and let the page decide from that.
  - For example, `hello.mediaPlayer: { video: true, audioTypes: ['audio/mpeg','audio/mp4','audio/aac','audio/wav', …] }`, or a list of extensions, written by each app from its own player's support.
  - Name the writer on each app and the reader (`useNativeMediaPlayback`).
  - Walk an `.ogg` on Android (native) and on iOS (page path), and an `.mp3` on both (native).
  - Absent or false still means today's page path.
  - Alternatively, if one shared list is preferred, revise REQ-002 so Ogg/Opus keep the page path on both apps. That is a requirement change, for the Solution Designer within the direction.
- Why proportionate: one field in the existing `hello`, written by the owner of the fact.
- Recommended recipient: Solution Designer.

## Classification

N/A (Pass). Round 3: `Design Impact` (AR-002, resolved); round 1: `Design Impact` (AR-001, resolved).

## Recommended Recipient

Implementation Engineer (`/implementation_engineer`); informational pass notice to the Solution Designer.

## Residual Risks

- Round 6 (SR-006, DEC-008), verified:
  - **The surface does not exist.** `FileDisplay.vue` is mounted nowhere: no template use, no Nuxt auto-import name, no dynamic reference. So `getPrismLanguage` has no product reader; SR-001's chat file preview was not a real surface. Removing both, the table's Prism column and the audit list entry is required by Principle 7 (dead code in a touched module), and nothing reachable changes.
  - **The real chat path is code blocks.** `markdownItPrism` → `highlightService.highlight(code, fence)` looks the fence name up in `Prism.languages`, so the grammar loads and the two aliases Prism lacks (`rs` → rust, `zsh` → bash) belong in the highlighting service, the one owner. `yml`, `sh`, `shell` and `dockerfile` are Prism's own aliases.
  - **The table** becomes extension/name → Monaco id with one reader (`getMonacoLanguage`). That is tighter than two columns, one of which was unread (Principle 11).
  - **REQ-004 and AC-004** name the reachable surface (code blocks by language name) with the same intent.
- N-9 (round 6, non-blocking): `highlightService.ts:28`'s comment still says "Chat file previews … `getPrismLanguage`"; update it to message code blocks.

- Round 5 (SR-005, DEC-007), verified:
  - **The problem is real.** No category is set anywhere in the iOS app, so the Ring/Silent switch silences the native player.
  - **The owner is right.** `NativeMediaPlayer`, the player's lifetime owner, sets `.playback`/`.moviePlayback` and activates on present, then deactivates with `.notifyOthersOnDeactivation` on close.
  - **Scope and verification.** No background mode, so lock and background stay out of scope (REQ-002 as revised). Android is unchanged. The physical-iPhone check is named for what a simulator cannot show.
- N-7 (round 5, implementation precision): deactivate in the owner's disappearance (`viewDidDisappear`, or the presentation's dismissal callback), not only beside the explicit `dismiss(animated:)` at `NativeMediaPlayer.swift:205`. Then every way the player leaves (an interactive swipe-down, AVKit's own close, the app taking the screen) ends the session. A `setActive(false)` that fails because other audio is still running (`isBusy`) is logged and ignored, like the activation failure.
- N-8 (round 5, non-blocking): the design deactivates but leaves the category at `.playback` after close. In-page media played later in the WebView (an iOS `.ogg` on the page path) would then also ignore the silent switch, unless WebKit sets its own category, which it may. Either restore the category in effect before present (read it on present, set it back on close), or record that in-page media after a native playback plays under `.playback`. The first keeps the change confined to the player, as DEC-007 intends.

- Round 4 (SR-004), verified:
  - `useNativeMediaPlayback` takes the type and title from the caller's file name (`modeFor(url, fileName)`, `play(url, fileName)`), and the URL-derived name is removed.
  - `VideoPlayer`/`AudioPlayer` have a required `fileName`, filled by their only host `FileViewer` from `file.path`, which is `reference.path` in the reference viewer.
  - `MediaSegment` names its own URLs. Its media URLs are generated-media `/rest/files/<relativePath>` (named by their last segment) or external (page path). 572's absolute paths open through the file viewer, not `MediaSegment`.
  - The walks (mp4 and m4a references, a workspace file, chat media, an `.ogg` on iOS) hold.
  - N-6 (non-blocking): `MediaSegment.vue:37` shows `mediaTitleOf(url)` as the tile's label. When the URL-derived helper is removed, the label should use the same name `MediaSegment` passes to `play`, so the label and the native title agree.

- Round 3, otherwise verified:
  - **The probe** (`Range: bytes=0-0`, `no-store`) keeps today's `REFERENCE_NOT_FOUND`/404 handling at one byte, against D-1's ranged route.
  - **The desktop** hands the URL to the element (`useAuthorizedObjectUrl`: "else the URL itself"), so it streams by range.
  - **Text, PDF and image** keep their whole read.
  - **C-2:** the iOS audio overlay (symbol and file name) over AVKit's standard auto-hide is sound. Its title should come from AR-002's file name, not the URL.
- Correction of my round-2 note N-4: "take the extension from the file path the URL names" holds only for URLs that name a file. A reference URL does not; AR-002 replaces the rule with an explicit name.

- Round 2: N-1 (the split rule uses the tree minimum; in split the tree is `min(treeWidth, width − 401)`), N-2 (rule 12 for `project.yml`/Gradle) and N-3 (Monaco `shell`) are adopted in SR-002.
- N-4 (round 2, implementation precision): the composable's extension check must read the file's name, not the URL path. For workspace content URLs the file is in the `path` query (`…/content?path=notes%2Fmemo.m4a`), and for `static/*` and node-file routes it is in the path or the `path` query. Take the extension from the file path the URL names, lowercase. A URL whose file has no extension takes the page path.
- N-5 (round 2, recorded): `.webm` video on iOS now takes the page path, where 574 sent it to AVPlayer, which cannot play it. That changes 574's video behavior for that one type, which the Preserved list covers in general. It corrects a broken path, so the outcome is acceptable; note it in the implementation handoff and the iOS docs.

- N-1 (non-blocking, D-3 precision): "split when `width ≥ treeWidth + 1 + 400`". State which tree width: the current, possibly dragged, width or the minimum (150).
  - With the current width, shrinking a 700 px panel to 600 px with a 250 px tree switches to stacked. Clamping the tree to 199 px would still give a 400 px viewer.
  - Either choice meets REQ-003. Write the chosen rule down, so the spec and the probe test the same thing, and say whether the tree's dragged width is clamped or kept when the panel narrows.
- N-2 (non-blocking, rule 12): renaming Android source folders and iOS groups does not change a gate by itself. If `project.yml` (XcodeGen) or a Gradle file changes, run the fresh-start build and the build-only release run, as 574 did.
- N-3 (non-blocking): Monaco's id for `.sh`/`.bash`/`.zsh` is `shell`, not `bash`. The table should carry `monaco: 'shell'` and `prism: 'bash'` for those rows, which is the point of the two columns. Prism `go`/`java` need `clike`, which is already loaded.

## Latest Authoritative Result

- Review Decision: `Pass` (round 6, SR-006)
- Round 6 notes: DEC-008 removes the unreachable `FileDisplay.vue` and `getPrismLanguage` with the table's Prism column (Principle 7), keeps the Prism grammars for message code blocks with the `rs`/`zsh` aliases in the highlighting service, and retargets AC-004 to the reachable surface. N-9 (a stale comment) is non-blocking.
- Round 5 decision: `Pass` (SR-005)
- Round 5 notes: DEC-007's audio session belongs to the player's lifetime owner, is scoped to the player being open, adds no background mode, and is verified on the test host plus the physical-iPhone check. N-7 (deactivate on every close path) and N-8 (restore the prior category) are implementation notes.
- Round 4 decision: `Pass` (SR-004)
- Round 4 notes: AR-002 resolved. The file name is an explicit input of the native decision, from each caller that owns it (`FileViewer` → players; `MediaSegment` for its own `/rest/files` URLs), and the URL-derived name is removed. With SR-003 (probe, desktop range, unchanged text/PDF/image, iOS C-2), the package is ready for implementation IR-002. N-6 is non-blocking.
- Round 3 decision: `Fail` (SR-003, AR-002)
- Round 2 decision: `Pass` (SR-002)
- Material-Premise Gate: `Pass` (no added premise)
- Round 2 notes: AR-001 is resolved with `hello.mediaPlayer: { video, audio }` extension lists written by each app and read by `useNativeMediaPlayback`, with REQ-002 revised to match. N-1…N-3 are adopted. N-4 (read the extension from the file path the URL names) and N-5 (the `.webm` correction) are notes. Classification Large / High.
- Round 1 decision: `Fail`
- Notes: D-1 (ranged references), D-3 (split by the layout's own width, one owner) and D-4 (one table, two engine names) pass. D-2's rename is clean, since 574 is unreleased (verified). Only the per-app audio format input is missing from the bridge contract.
