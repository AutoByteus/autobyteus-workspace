# Requirements Document

## Document Status

- Status: `Ready for Approval` (DEC-001 needs the user)
- Current solution revision ID: `SR-001`
- Package identifier: `chat-media-path-playback`
- Request: Project Task autobyteus-572; requested by `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), the founder's report of 2026-11-20
- Requirements owner: Solution Designer; date 2026-11-20
- Approved by and reference: pending (DEC-001)

## Problem And Desired Outcome

- Problem: on the phone, tapping a video path in chat shows "Video URL is not available." (Reproduced: it is shown for the whole time the phone downloads the file, 9.6 s for a 9.7 MB video at 8 Mbit/s, then the video plays.) The phone must download every media file whole before playing it, because a media element cannot send the phone's credential and the node's file routes do not serve parts of a file. Audio inside the run's folder shows "Audio URL is not available." the same way. Root cause: `investigation-notes.md`.
- Desired outcome: tapping a video or audio path in chat (any conversation, delegated runs included; inside or outside the run's folder) plays it on the phone and the desktop without a misleading message; a real failure says so plainly; authentication and path-security rules stay intact.

## Relevant Current And Desired Behavior

| BEH | Current | Desired | Preserved |
| --- | --- | --- | --- |
| BEH-001/002 | Phone: whole download first; "URL is not available." (inside) or "Opening…" (outside) meanwhile | Per DEC-001: (A) a loading state with progress, then play; or (B) play starts within a few seconds and seeking works | Who may read which file (node access gate, path rules, read-only node files) |
| BEH-003 | Images/PDF downloaded whole | Unchanged (small) | — |
| BEH-004 | Desktop embedded absolute path streams | Unchanged | — |
| BEH-005 | Desktop workspace media: plays, cannot seek past the loaded part | Under (B): seeking works (the node serves parts) | — |
| BEH-007 | Failure: "Video could not be played." + Retry | Unchanged, plain words | — |

## Scope Guardrail

- In scope: UC-001 phone: tap a video/audio path in chat (any run kind's conversation, delegated runs included; inside/outside the folder; relative paths that resolve to the folder) and play it; UC-002 the same on desktop (no regression; seeking per DEC-001); UC-003 the loading and failure states of video/audio viewers.
- Out of scope: how images and PDFs load; paths on another node (they say which node, autobyteus-471); file attachments' own routes beyond sharing the media player.
- Preserved: the node access model's gate, route permissions and revocation; the path rules (workspace confinement, node-file reader limits); read-only node files.
- Prerequisites: None.

## Requirements

| REQ | Requirement | Priority | Source |
| --- | --- | --- | --- |
| REQ-001 | A media viewer never shows "URL is not available." while its file is loading; it shows that it is loading (with progress where the size is known) and then plays; the "not available" text appears only when there is truly no file to show | Must | Founder report; reproduced |
| REQ-002 | On the phone, a tapped video or audio path plays: (A) after a visible download, or (B) streamed: playback starts within a few seconds on a normal link and seeking works (DEC-001) | Must | Founder report |
| REQ-003 | Desktop: video/audio paths keep playing as today (embedded absolute paths, workspace paths, node files); under (B) seeking also works for node-served files | Must | Task: check desktop |
| REQ-004 | Authentication and path security unchanged in effect: every read is still decided by the node gate and the path rules for the same client; under (B) any grant that lets a media element load a file reaches one file, read-only, for a short time, for the phone that asked, is revoked with that phone, and is never logged or shown | Must | Task constraint; NA-8 |
| REQ-005 | A failure shows a plain message with Retry; no internal words | Must | 533/540 precedent |
| REQ-006 | Tests: phone probe cases (video and audio inside and outside the folder, a delegated run's conversation, a large video on a throttled link, a failure); desktop cases; unit tests for the viewer states; synthetic media only | Must | Task |

## Acceptance Criteria

| AC | REQ | Outcome | Verification |
| --- | --- | --- | --- |
| AC-001 | REQ-001 | During loading the viewer shows a loading state, never "URL is not available."; after loading it plays | Phone probe (throttled), unit |
| AC-002 | REQ-002 | (A) a 10 MB video at 8 Mbit/s: progress shown, plays after the download; (B) playback starts ≤ 3 s at 8 Mbit/s, seeking to 75% plays from there | Phone probe |
| AC-003 | REQ-002 | Video and audio: inside and outside the folder, in a delegated run's conversation, all play on the phone | Phone probe |
| AC-004 | REQ-003 | Desktop embedded and non-embedded windows play the same links; (B) seeking works | Desktop probe |
| AC-005 | REQ-004 | (B) a grant opens only its file, expires, does not work for another file or after the phone is revoked; it appears in no log; the gate still refuses an unpaired client | Server unit + e2e |
| AC-006 | REQ-005 | A missing/refused file: plain message + Retry | Unit + probe |

## Decisions

| ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | How should the phone play a video from the node? | Decides whether videos start at once or after a full download, and whether the node's security model changes | **A** — keep today's security rules: the phone downloads the whole file, now with an honest "Loading video… 4.1 of 9.7 MB" and progress, then plays. Small change. A 100 MB video over a slow link takes minutes and sits in the phone's memory; nothing plays before it is all there. **B** — stream it like a normal video site: the phone asks the node for a short-lived link to that one file (read-only, a few minutes, only for that phone, revoked with it, never logged); the node serves the file in parts (Range). Playback starts in about a second and seeking works, on the phone and in desktop windows. It adds a new kind of URL grant to the node access model (NA-8 today allows only the phone's WebSocket token in a URL) | **Recommend B**: it is what "plays properly" means for real videos (the Product Video Producer's files will grow), it is how video sites protect media (signed, expiring per-file URLs), and its risk is bounded to one file, read-only, minutes, one phone. It is a security-model change, so it is your decision. Either way REQ-001's honest loading state is done | Needs user (security model) | Open |
| DEC-002 | Images and PDFs | Same download path | Small files; viewers need the whole file anyway | Leave as they are | Solution Designer | Decided |

## Readiness Check

- Content ready for approval: `Yes`, except DEC-001 (needs the user). Approval: pending.
