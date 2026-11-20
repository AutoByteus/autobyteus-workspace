# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-003`
- Package identifier: `chat-media-path-playback`
- Request: Project Task autobyteus-572; requested by `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), the founder's report of 2026-11-20
- Requirements owner: Solution Designer; date 2026-11-20
- Approved by and reference: `User`; the user's answers in the Solution Designer's conversation, 2026-11-20: "Security is really important here", then, on the recommendation "A for this ticket, C as a follow-up": "You know the best for our product I follow by our recommendation".
- Exact approved baseline: this document at SR-003 (DEC-001 = A by the user; SR-003 corrects REQ-002's path forms to what chat makes tappable, DEC-003 by the Solution Designer within the direction, user informed).

## Problem And Desired Outcome

- Problem: on the phone, tapping a video path in chat shows "Video URL is not available." (Reproduced: it is shown for the whole time the phone downloads the file, 9.6 s for a 9.7 MB video at 8 Mbit/s, then the video plays.) The phone must download every media file whole before playing it, because a media element cannot send the phone's credential and the node's file routes do not serve parts of a file. Audio inside the run's folder shows "Audio URL is not available." the same way. Root cause: `investigation-notes.md`.
- Desired outcome: tapping a video or audio path in chat (any conversation, delegated runs included; inside or outside the run's folder) plays it on the phone and the desktop without a misleading message; a real failure says so plainly; authentication and path-security rules stay intact.

## Relevant Current And Desired Behavior

| BEH | Current | Desired | Preserved |
| --- | --- | --- | --- |
| BEH-001/002 | Phone: whole download first; "URL is not available." (inside) or "Opening…" (outside) meanwhile | The same download (DEC-001 = A), shown as loading with progress ("Loading video… 4.1 of 9.7 MB") on both routes, then play | Who may read which file (node access gate, path rules, read-only node files); how the phone sends its key |
| BEH-003 | Images/PDF downloaded whole | Unchanged (small) | — |
| BEH-004 | Desktop embedded absolute path streams | Unchanged | — |
| BEH-005 | Desktop workspace media: plays, cannot seek past the loaded part | Unchanged (streaming and seeking: FU-001) | — |
| BEH-007 | Failure: "Video could not be played." + Retry | Unchanged, plain words | — |

## Scope Guardrail

- In scope: UC-001 phone: tap a video/audio path in chat (any run kind's conversation, delegated runs included; an absolute path inside or outside the run's folder) and play it; UC-002 the same on desktop (no regression); UC-003 the loading and failure states of video/audio viewers.
- Out of scope: making relative paths in chat tappable (they have never been file links, for any file type: DEC-003, FU-003); how images and PDFs load; paths on another node (they say which node, autobyteus-471); file attachments' own routes beyond sharing the media player.
- Preserved: the node access model's gate, route permissions and revocation; the path rules (workspace confinement, node-file reader limits); read-only node files.
- Prerequisites: None.

## Requirements

| REQ | Requirement | Priority | Source |
| --- | --- | --- | --- |
| REQ-001 | A media viewer never shows "URL is not available." while its file is loading; it shows that it is loading (with progress where the size is known) and then plays; the "not available" text appears only when there is truly no file to show | Must | Founder report; reproduced |
| REQ-002 | On the phone, a tapped video or audio path plays after a visible download (DEC-001 = A): an absolute path inside or outside the run's folder, in any run's conversation (delegated runs included) | Must | Founder report; user decision; DEC-003 |
| REQ-003 | Desktop: video/audio paths keep playing as today (embedded absolute paths, workspace paths, node files) | Must | Task: check desktop |
| REQ-004 | Authentication and path security unchanged: no new credential, grant or URL-borne key; every read is still decided by the node gate and the path rules for the same client, with the phone's key in the request header as today | Must | Task constraint; NA-8; the user's "Security is really important here" |
| REQ-005 | A failure shows a plain message with Retry; no internal words | Must | 533/540 precedent |
| REQ-006 | Tests: phone probe cases (video and audio inside and outside the folder, a delegated run's conversation, a large video on a throttled link, a failure); desktop cases; unit tests for the viewer states; synthetic media only | Must | Task |

## Acceptance Criteria

| AC | REQ | Outcome | Verification |
| --- | --- | --- | --- |
| AC-001 | REQ-001 | During loading the viewer shows a loading state, never "URL is not available."; after loading it plays | Phone probe (throttled), unit |
| AC-002 | REQ-002 | A ~10 MB video at 8 Mbit/s, inside and outside the folder: progress shown and rising (bytes of total), then it plays | Phone probe (throttled) |
| AC-003 | REQ-002 | Video and audio: inside and outside the folder, in a delegated run's conversation, all play on the phone | Phone probe |
| AC-004 | REQ-003 | Desktop windows play the same links as before | Desktop probe |
| AC-005 | REQ-004 | No URL carries a key; the gate still refuses an unpaired or revoked client on the media routes; the path rules still refuse a path outside what they allow | Probe network record + existing server tests |
| AC-006 | REQ-005 | A missing/refused file: plain message + Retry | Unit + probe |

## Decisions

| ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | How should the phone play a video from the node? | Decides whether videos start at once or after a full download, and whether the node's security model changes | **A** — keep today's security rules: the phone downloads the whole file, now with an honest "Loading video… 4.1 of 9.7 MB" and progress, then plays. Small change. A 100 MB video over a slow link takes minutes and sits in the phone's memory; nothing plays before it is all there. **B** — stream it like a normal video site: the phone asks the node for a short-lived link to that one file (read-only, a few minutes, only for that phone, revoked with it, never logged); the node serves the file in parts (Range). Playback starts in about a second and seeking works, on the phone and in desktop windows. It adds a new kind of URL grant to the node access model (NA-8 today allows only the phone's WebSocket token in a URL) | **Recommend B**: it is what "plays properly" means for real videos (the Product Video Producer's files will grow), it is how video sites protect media (signed, expiring per-file URLs), and its risk is bounded to one file, read-only, minutes, one phone. It is a security-model change, so it is your decision. Either way REQ-001's honest loading state is done | User | Decided: **A** (2026-11-20) |
| DEC-003 | Relative paths (implementation DI-001) | The Task asked to check them; SR-002 assumed they open on the workspace route | Checked: chat makes only absolute paths file links (`resolveEventMonitorMarkdownFileDestination` returns `not-file` for a relative destination; `openMobileFilePath` takes absolute paths); a relative link is a plain `<a href>` for every file type on phone and desktop, before and after this change (MSP-89 `relativeLink`) | Not part of this bug; making them tappable needs its own decision (which run's folder they resolve against, delegated runs included) and a change to the shared link classifier. **REQ-002 means absolute paths; relative links → FU-003** | Solution Designer (within the direction; the Task asked to check, not to add) | Decided |
| DEC-002 | Images and PDFs | Same download path | Small files; viewers need the whole file anyway | Leave as they are | Solution Designer | Decided |

## Readiness Check

- Content ready: `Yes`. Approval recorded: `Yes` (User, 2026-11-20). Ready for design: `Yes`.

## Follow-ups from the decision

- FU-001 (follow-ups.md): streaming without keys in links (a service worker that adds the phone's key to media requests, and Range support on the node's file routes); prove it in the Android and iOS apps first.
