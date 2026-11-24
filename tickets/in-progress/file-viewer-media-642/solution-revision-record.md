# Solution Revision Record

## SR-001 (2026-11-24)

- Trigger: autobyteus-642 from `/project_task_manager`.
- Prior status: N/A. Current status: requirements Approved.
- Approval: Solution Designer within the direction (the Task names each item); user informed. DEC-001 (stack by width), DEC-002 (one table, two engine names) and DEC-003 (rename to media, since 574 is unreleased).
- Next: design.

## SR-001 design (2026-11-24)

- Design: D-1…D-4, with the data contract first (the bridge rename `playMedia`/`mediaPlayer`, the reference reader result, the language table).
- Classification: `Large` / `High`. Routing: architecture review.

## SR-002 (2026-11-24)

- Trigger: ARCH-REV-001 Fail.
  - AR-001: the page decided per-platform audio types without knowing the platform.
  - N-1…N-3.
- Requirements: REQ-002 now says each app states the types its player plays (the outcome is unchanged: native where the app can play it, the page path otherwise). This is within the direction.
- Design:
  - `hello.mediaPlayer` becomes `{ video: string[], audio: string[] }`, written by each app and read by the composable;
  - the walks: `.ogg` on Android and iOS, `.mp3` on both, and `.webm` video on iOS (a 574 correction);
  - the split rule uses the tree minimum, and a dragged tree is clamped;
  - Monaco `shell`;
  - rule 12 noted.
- Classification: unchanged, `Large` / `High`. Routing: architecture review.
- Design case: docs/design-cases.md Case 3 (a fact decided by a reader that does not own it).

Review note: ARCH-REV-002 passed SR-002 (2026-11-24). The reviewer routed it to `/implementation_engineer`. N-4 (take the extension from the file path the URL names, its `path` query) is for implementation; N-5 (the iOS `.webm` correction) is recorded.

## SR-003 (2026-11-24)

- Trigger: CRR-001 (code review of IR-001).
  - CR-001, a Requirement Gap: the reference viewer still reads media whole, so item 1's user outcome was not met.
  - C-2: the iOS audio screen is blank while its controls hide.
- Requirements:
  - REQ-001 states the user outcome (desktop by range, apps native, browser unchanged, other types unchanged, the not-found messages kept);
  - REQ-002 accepts AVKit's auto-hide over a placeholder;
  - AC-001 is extended.
  - Approved by the Solution Designer within the direction (the Task's item 1 is "a video reached via a message reference still downloads whole"); user informed.
- Design: D-1b (the viewer probes one byte, then hands the URL to `FileViewer`'s players for Video and Audio); the iOS audio overlay.
- Classification: unchanged, `Large` / `High`. Routing: architecture review, then implementation (IR-002), then code review.
- Design case: Case 3.

## SR-004 (2026-11-24)

- Trigger: ARCH-REV-003 Fail, AR-002. The native-playback owner derived the file name from the URL, and a reference URL names none (`…/content`), so phone apps would have downloaded references whole and titled them "content".
- Design: the file name is an explicit input from its owner. `FileViewer` passes `file.path` to the players, and `MediaSegment` passes its URL's file name. The URL guess is removed, which also replaces round 2's N-4 rule. Walks: an mp4 and an m4a reference, a workspace file, a chat media URL, an iOS `.ogg`.
- Requirements: unchanged. Classification: unchanged, `Large` / `High`. Routing: architecture review.
- Design case: docs/design-cases.md Case 5 (a claim that every media URL names its file, taken on trust).

Review note: ARCH-REV-004 passed SR-004, with SR-003 (2026-11-24). The reviewer routed it to `/implementation_engineer` (IR-002). N-6 (the chat tile label uses the same file name) is for implementation.

## SR-005 (2026-11-25)

- Trigger: API/E2E's evidence request (AC-002 on iOS, whether the audio is heard). The app sets no audio session, so the Ring/Silent switch would silence the native player on a real iPhone.
- Requirements: REQ-002 says the sound is heard also on silent; background playback is out of scope. DEC-007 (b) was decided by the Solution Designer within REQ-002, with the user informed.
- Design: `NativeMediaPlayer` makes the audio session `.playback`/`.moviePlayback` while it is open and deactivates it on close.
- Classification: unchanged, `Large` / `High`. Routing: architecture review (a design change), then implementation. API/E2E is told the decision.

Review note: ARCH-REV-005 passed SR-005 (2026-11-25). The reviewer routed it to `/implementation_engineer`. N-7 (deactivate in the existing `viewDidDisappear` teardown) and N-8 (restore the previous category) are for implementation.
