# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: SR-001
- Package identifier: `phone-video-574`
- Request: autobyteus-574 (absorbs autobyteus-636), Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), for the founder
- Requirements owner: Solution Designer
- Date: 2026-11-24
- Approved by and reference: **the user**, in conversation 2026-11-24: "I trust your recommended solutions". That approves DEC-001 (b), the native player, and DEC-002 (a), the per-playback credential handoff. The other decisions are the Solution Designer's within the direction.
- Exact approved baseline: this document at SR-001

## Problem And Desired Outcome

- **Problem:**
  - On the phone apps, a video is downloaded whole into memory before it plays, and again on every reopen (22.7 MB from 0).
  - On Android, the player's fullscreen button is disabled. The founder's screenshots show a small portrait letterbox.
- **Desired outcome:**
  - In the Android and iOS apps, a video starts playing at once, seeks anywhere quickly, and on reopen does not download again what it already has.
  - Fullscreen fills the screen in landscape and returns to portrait without losing the position.
  - The phone's credential never appears in a URL, a log or a stored record.

## Relevant Current And Desired Behavior

| Behavior | Current (evidence) | Desired | Preserved |
| --- | --- | --- | --- |
| BEH-001 | Whole download before play (`useAuthorizedObjectUrl.ts:41-75`) | Starts at once (progressive), seeks by range | The node access gate: the credential in a header |
| BEH-002 | Reopen downloads all again | Reopen of an unchanged file reuses what is cached; a changed file is fetched fresh | — |
| BEH-003 | Android fullscreen button disabled (no `onShowCustomView`) | Fullscreen in landscape, bars hidden; exit to portrait at the same position | The desktop-view fullscreen (autobyteus-432) |
| BEH-004 | Node file routes: whole file, no Range | Range/206 with a validator | Route permissions; the path rules |

## Scope Guardrail

### In-Scope Use Cases

| ID | Use case |
| --- | --- |
| UC-001 | Open a video in the Android app or the iOS app: from a file, a chat link or a media message |
| UC-002 | Seek, and reopen the same video |
| UC-003 | Watch fullscreen in landscape and return |

### Out Of Scope

- The phone web app in a plain browser (not the apps): it keeps today's download.
- Audio files: they keep today's path; the same player could take them later (follow-up).
- Desktop.
- Images and PDFs.

### Prerequisites

None.

## Requirements

| ID | Requirement | Priority | Basis | Feasibility |
| --- | --- | --- | --- | --- |
| REQ-001 | In both apps a video starts playing without downloading the whole file first, and a seek fetches only the part needed | Must | Task Part 1 | Measured: P2 (Android) and P3 (iOS) |
| REQ-002 | Reopening an unchanged video does not download again what was already fetched; a changed file (new validator) is fetched fresh. The cache is bounded and is cleared when its node is removed from the app | Must | Task Part 1, PM comment | P2 measured (0 bytes on reopen); iOS needs a range cache in the loader (not yet prototyped) |
| REQ-003 | The credential travels only in the `Authorization` header; it is never in a URL, a log or a stored record | Must | Task constraint; NA-8; the founder ("Security is really important here") | P2, P3: header only |
| REQ-004 | Fullscreen: landscape, system bars hidden, the video fills the screen; exit returns to portrait with the playing position kept | Must | Task Part 2 (636) | Native players provide it (P2, P3); Android web fullscreen via `onShowCustomView` (autobyteus-432 pattern) |
| REQ-005 | The node's file routes answer Range requests with 206, `Content-Range`, `Accept-Ranges` and a validator (`ETag`), and tell every client to revalidate before reusing a copy; an unchanged validator lets the app reuse its cache, and a changed file is never shown stale | Must | Needed by REQ-001/002 | Standard HTTP; server-side |

## Acceptance Criteria

| AC | REQ | Trigger | Expected | Alternate / failure | Verification |
| --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-003 | In the Android app (emulator) and the iOS app (simulator), paired to a test node throttled to about 1.5 MB/s, open a 20+ MB MP4: from Files, from a chat link to a file, and from a media message | The native player shows and plays in under 2 s; a seek to the middle plays within 2 s; the node's log shows ranged requests (206), each with the phone's `Authorization` header | A missing file: the player says it could not play, with Back; no crash | The apps' instrumented or UI tests, and a probe reading the test node's request log |
| AC-002 | REQ-002 | Close and reopen the same video; then change the file on the node and reopen | The reopen fetches 0 bytes for the parts already played. After the change (new `ETag`), the new content plays | The cache is full: the least-recently-used entries are dropped; playback is unaffected | Request log byte counts; the apps' cache unit tests |
| AC-003 | REQ-003 | Every AC-001/002 run | No credential in any URL (node log, app logs, `adb logcat`, simulator log); nothing written to disk contains it (cache files hold only video bytes and range maps) | A page that asks to play a URL of another origin or another route: refused, and no request is sent | Log scans; the bridge's unit tests (origin and route allowlist) |
| AC-004 | REQ-004 | Tap fullscreen in the native player; then exit. Android only: an in-page video's fullscreen button (DEC-004) | Landscape, bars hidden, the video fills the screen; exit returns to portrait with the position kept | — | UI tests with orientation and position read back; screenshots |
| AC-005 | REQ-005 | `GET` a node file with `Range: bytes=a-b`, `bytes=a-`, `bytes=-n`, an invalid range, and `If-None-Match` | 206 with the exact bytes, `Content-Range`, `Accept-Ranges: bytes`, `ETag` and `Cache-Control: no-cache` (routes that set `no-store` keep it); 416 for an unsatisfiable range; 304 for a matching validator; 200 for a multi-range request and without Range. The same on every file route (workspace content, static, node files). A rewritten file reopened on the desktop shows its new content | Access refusals unchanged (401/403/400) | Server unit and integration tests |
| AC-006 | Preserved | The phone web app in a browser; an app without the native player (older); desktop | Unchanged: the page keeps today's download path when the app does not offer the player | — | Web unit tests; the phone probe's existing media cases (MSP-89…92) |

## Decisions

| ID | Question | Options / Evidence | Reasoning And Recommendation | Owner | Status |
| --- | --- | --- | --- | --- | --- |
| DEC-001 | How the apps play videos (**approved: b**) | (a) Keep the in-page web player and intercept its requests (the Task's example). Measured: on Android, seeking loops or fails (P1, P1b, P1c); service workers cannot work on iOS and need `https`. (b) **A native player in each app** (Android Media3, iOS AVPlayer), opened when a video is tapped. Measured: plays at once, seeks, header only (P2, P3) | **(b).** It is the only way that seeks reliably on Android, and it gives native fullscreen and rotation, a cache and the platform's familiar controls. The visible change: a tapped video opens the phone's own full-screen video player (with Back) instead of the in-page player. Inline previews in chat open it too | User | Decided (user, 2026-11-24) |
| DEC-002 | How the native player gets the credential (**approved: a**) | The credential lives only in the web app's storage today, by design (`SavedNodeEntry.kt:6-7`). (a) **The web app hands it to native over the existing node-bound bridge when it opens a video; native keeps it in memory for that playback only**, never logged or stored. (b) Move the credential into native secure storage (Keychain or Keystore), with native as its owner: a larger change to pairing | **(a).** It is the smallest change that keeps the credential out of URLs, logs and storage. The bridge is already bound to the node's origin. Native drops it when the player closes | User (security) | Decided (user, 2026-11-24) |
| DEC-003 | Cache | The founder asked for no re-download on reopen | Android: Media3's cache. iOS: a range cache in the loader. Keyed by node, file and validator; bounded (for example 500 MB, least-recently-used); in app-private storage; cleared when the node is removed. Files are the user's own; no credential is stored | Solution Designer | Decided |
| DEC-004 | Android web fullscreen for other in-page media | The fullscreen button is disabled for any in-page video | Also add `onShowCustomView`/`onHideCustomView` (landscape, bars hidden, the 432 pattern), so no in-page player has a dead fullscreen button | Solution Designer | Decided |
| DEC-005 | An app older than the page | The phone apps update through the stores, separately from the node and its page; the bridge already tolerates older apps ("An app older than this ignores the message", `shellBridge.ts`) | The app's `hello` reply says whether it has the native player. The page uses it only then; otherwise today's path stays. This is not a compatibility path between node versions (DESIGN.md rule 9 covers the desktop, web, server and nodes): it is the store-distributed app's capability, as the bridge already handles | Solution Designer | Decided |
| DEC-006 | Evidence decision (API/E2E, 2026-11-24): AC-001 "from a media message" on a live stack | A real video media segment needs a video-generating model (paid, non-deterministic; the scripted Antigravity CLI makes only images). Options: (a) accept as low risk; (b) one paid video-generation run; (c) test-only injection into the node (DESIGN.md rule 11 forbids production code for tests) | **(a) Accept the unverified risk.** The media segment's URL form is established by Read: native AutoByteus stores generated media and emits `/rest/files/<relativePath>` (`services/media-storage-service.ts:241-243`, `media-url-transformer-processor.ts:61,102`). That is the `files.ts` route, which D-1 makes a ranged `kind: 'file'` route (AC-005 covers it). The web tile calls the same `useNativeVideoPlayback().play(url)` as Files (IMP-02), and the bridge, player and routes are proven live from Files and a chat link. Untested scope: a real video-generation model's media message on a live run reaching the native player. Low risk: a non-node URL keeps today's in-page path by design (AC-003). No follow-up. | Solution Designer | Decided; user informed |
