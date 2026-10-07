# Requirements Document

## Document Status
- Status: `Approved`
- Current solution revision ID: `SR-002`
- Package identifier: `task-card-compact-summary`
- Request: Task cards show their entire description (user, 2026-10-07, via `/delivery_engineer`)
- Owner: Solution Designer; Date: 2026-10-07
- Approval: approved by the user 2026-10-07: "Yeah, I think we don't need a separate UI, right? I think you should follow the best practice, I mean industry practices. Obviously you shouldn't show the complete content when it's like 10,000 words…" The user delegated the presentation choice to the Solution Designer under "best practice" with no new UI. Resolved: DEC-001 → (a); DEC-002 → deferred (not in this ticket).
- Exact approved baseline: SR-002 (BEH-001..003, REQ-001..004, AC-001..006)
- Supplements: none (screenshot = evidence)

## Problem And Desired Outcome
- Problem: On every Task board (Project boards and Temp tasks), a card renders the Task's complete description. Agent-written descriptions are long briefs, so one card can fill the screen and the board cannot be scanned.
- Desired outcome: Each card is short and scannable at a glance. The full text stays available on the Task page.
- Success: With real-length descriptions, a card is at most the agreed number of text lines plus its worker line, on both boards. The Task page still shows everything.

## Behavior
| ID | Current | Desired | Preserved |
| --- | --- | --- | --- |
| BEH-001 | Whole description on the card | Summary clamped (see DEC-001) | Row link, worker line, live highlight, file count |
| BEH-002 | Task page shows the full description | — | Unchanged |
| BEH-003 | Search covers the full description | — | Unchanged |

## Scope
- In scope: UC-001: scan a board whose Tasks have long descriptions (Project boards and Temp tasks).
- Out of scope (unless DEC-002 says otherwise): Task titles as a new field; changes to agent tools or Task data.
- Preserved: everything else on the boards and Task pages (`project-manager-ux` REQ-002..016).

## Requirements
| ID | Requirement |
| --- | --- |
| REQ-001 | On every Task board (Project boards and Temp tasks), a card shows the summary (first non-empty line) in at most 2 lines and the preview (remaining lines) in at most 2 lines, each cut with an ellipsis. Worker line, file count and live highlight are unchanged. |
| REQ-002 | Wherever a Task's summary appears as a single label or sentence (the card's accessible name, the Task delete confirmation), it is shortened to a bounded length ending in "…", never the whole first line of a long description |
| REQ-003 | The Task page still shows the full description; board search still matches the full text |
| REQ-004 | Verification uses a rendered browser with real-length descriptions (one very long paragraph, about 10,000 words; multi-line text) on both boards, at wide and narrow widths, asserting rendered line counts |

## Acceptance Criteria
| ID | REQ | Outcome |
| --- | --- | --- |
| AC-001 | REQ-001 | A Task whose description is one ~10,000-word paragraph shows a 2-line bold summary ending in "…" and no preview, on the Project board and the Temp tasks board |
| AC-002 | REQ-001 | A multi-line description shows a ≤2-line summary and a ≤2-line grey preview |
| AC-003 | REQ-002 | The card's accessible name and the delete confirmation show a shortened summary ending in "…" for a long first line, and the full summary for a short one |
| AC-004 | REQ-003 | Opening the card shows the full description; search finds text from beyond the visible lines |
| AC-005 | REQ-004 | The browser probe asserts AC-001/002 line counts on both boards at 1440 and 1024 widths |
| AC-006 | Preserved | Short descriptions render exactly as in VIS-001..018 |

## Open Decisions
| ID | Question | Options | Recommendation |
| --- | --- | --- | --- |
| DEC-001 (Resolved: (a), user delegated "best practice") | How much text per card? | (a) the original intent: 2-line summary + 2-line preview; (b) more compact: 2-line summary only, no preview; (c) a Product round to redesign the card | (a). It restores the approved design: a single-paragraph brief becomes 2 lines + worker line. |
| DEC-002 (Deferred: not in this ticket; follow-up candidate (b) agent guidance) | Should Tasks get short titles? | (a) no, not now; (b) agent guidance only: tool descriptions ask agents to start a description with a short one-line summary, which becomes the bold line; (c) a real `title` field (tools, data, UI): separate ticket | (b) as a follow-up, or with this ticket if wanted; (c) only if titles are wanted beyond guidance |
