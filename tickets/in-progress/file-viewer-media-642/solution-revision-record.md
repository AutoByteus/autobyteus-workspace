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
