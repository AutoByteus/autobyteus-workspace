# Requirements Document

## Document Status

- Status: `Ready for Approval` (DEC-001 and DEC-002 need the user)
- Current solution revision ID: SR-001
- Package identifier: `phone-video-574`
- Request: autobyteus-574 (absorbs autobyteus-636), Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), for the founder
- Requirements owner: Solution Designer
- Date: 2026-11-24
- Approved by and reference: pending (the user: DEC-001, DEC-002)

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
| REQ-005 | The node's file routes answer Range requests with 206, `Content-Range`, `Accept-Ranges` and a validator (`ETag`); an unchanged validator lets the app reuse its cache | Must | Needed by REQ-001/002 | Standard HTTP; server-side |

## Acceptance Criteria (summary; full table after approval)

- **AC-001:** in each app (emulator and simulator), a 20+ MB video on a throttled node plays in under 2 s and seeks to its middle with a Range request.
- **AC-002:** a reopen of the unchanged file downloads 0 bytes for parts already fetched. After the file changes, the new content plays.
- **AC-003:** the node's request log shows the `Authorization` header on every media request, and no credential in any URL. App logs contain no credential.
- **AC-004:** fullscreen enter and exit on both apps: landscape, bars hidden, back to portrait, the same position.
- **AC-005:** the node's Range/206 behavior (server tests); the browser phone path and desktop unchanged.

## Decisions

| ID | Question | Options / Evidence | Reasoning And Recommendation | Owner | Status |
| --- | --- | --- | --- | --- | --- |
| DEC-001 | How the apps play videos | (a) Keep the in-page web player and intercept its requests (the Task's example). Measured: on Android, seeking loops or fails (P1, P1b, P1c); service workers cannot work on iOS and need `https`. (b) **A native player in each app** (Android Media3, iOS AVPlayer), opened when a video is tapped. Measured: plays at once, seeks, header only (P2, P3) | **(b).** It is the only way that seeks reliably on Android, and it gives native fullscreen and rotation, a cache and the platform's familiar controls. The visible change: a tapped video opens the phone's own full-screen video player (with Back) instead of the in-page player. Inline previews in chat open it too | User | Needs user |
| DEC-002 | How the native player gets the credential | The credential lives only in the web app's storage today, by design (`SavedNodeEntry.kt:6-7`). (a) **The web app hands it to native over the existing node-bound bridge when it opens a video; native keeps it in memory for that playback only**, never logged or stored. (b) Move the credential into native secure storage (Keychain or Keystore), with native as its owner: a larger change to pairing | **(a).** It is the smallest change that keeps the credential out of URLs, logs and storage. The bridge is already bound to the node's origin. Native drops it when the player closes | User (security) | Needs user |
| DEC-003 | Cache | The founder asked for no re-download on reopen | Android: Media3's cache. iOS: a range cache in the loader. Keyed by node, file and validator; bounded (for example 500 MB, least-recently-used); in app-private storage; cleared when the node is removed. Files are the user's own; no credential is stored | Solution Designer | Decided |
| DEC-004 | Android web fullscreen for other in-page media | The fullscreen button is disabled for any in-page video | Also add `onShowCustomView`/`onHideCustomView` (landscape, bars hidden, the 432 pattern), so no in-page player has a dead fullscreen button | Solution Designer | Decided |
