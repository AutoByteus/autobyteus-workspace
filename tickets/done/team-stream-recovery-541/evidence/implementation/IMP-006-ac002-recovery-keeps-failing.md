# IMP-006 — AC-002: a recovery that keeps failing, desktop and phone

- Date: 2026-11-27. Cases: desktop `send-delivery-probe.mjs --cases SDD-14,SDD-15`; phone
  `mobile-shell-probe.mjs --cases=MSP-119,MSP-120`. Each ran on its own temp stack (removed after; 0 unknown browser
  errors).
- How the node is made unreachable for the recovery: `refuseTeamRecoveryReads` (`fixtures/team-stream-gap.mjs`) aborts
  the page's `GetTeamRunExecutionCheckpoint` GraphQL requests, as a dropped request would; every other request passes.
  The recovery's verified read starts with that checkpoint, so each attempt fails. The phone probe lists the five
  resulting `Failed to load resource: net::ERR_FAILED` lines as expected for MSP-120 (`EXPECTED_BY_CASE`).
- How the gap is made: `withhold: 'first'`. The wire withholds the first numbered frame of another window's turn, so the
  member keeps its last status (Idle) and Send is offered.
  - A gap that withheld the frame before the idle status instead leaves the member at its last applied status, Running.
    The composer then offers only Stop, which answers "Stop was not sent: not connected…" (REQ-002, 533). The first
    SDD-15 run did that, clicked Stop instead of sending, and failed waiting for the not-sent notice.
  - That was the probe's setup; the case now makes the gap that leaves the member Idle.

| | Desktop SDD-15 | Phone MSP-120 |
| --- | --- | --- |
| Refused reads | 5 | 5 |
| A send while recovering (Send offered: yes) | text (a) after **10.06 s**, the text back in the box, the message not in the conversation | text (a) after **10.04 s**, the text back, not shown |
| The notice "Live updates could not recover automatically. Select this Team member again to reload the complete conversation." | shown **15.04 s** after the gap, at the **5th** failed attempt (attempts at +0, +1, +3, +7, +15 s) | shown **15.03 s** after the gap, at the 5th failed attempt |
| The member meanwhile | Idle (its last status) | "Idle · in Delivery Team" |
| Reads pass again | the next attempt (+31 s) recovers: replacement snapshot **31.05 s** after the gap | **31.06 s** after the gap |
| After | the notice gone; Idle; the other window's message shown; the not-sent notice carried with its draft (D-A6) | the notice gone; Idle; the message shown |
| Base (`80420a8bf6` web code), desktop | **Fail**: "Timed out: the notice". The send during the failure is refused at once (`TEAM_STREAM_REOPEN_REQUIRED`, an error row), and no automatic recovery runs | (not run on the base: same code and fixture as desktop) |

Screenshots at the notice: `IMP-006-SDD-15-desktop-exhausted.png`, `IMP-006-MSP-120-phone-exhausted.png` (probe data only).
The phone shows the notice under its header, above the conversation, in the same `WorkspaceRecoveryNotice` style as the
desktop, and the not-sent notice above the message box.
