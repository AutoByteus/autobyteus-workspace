# Docs Sync

## Scope

- Ticket: `preview-popup-tab-browser-behavior`
- Trigger Stage: `9`
- Workflow state source: [workflow-state.md](/Users/normy/autobyteus_org/autobyteus-worktrees/preview-popup-tab-browser-behavior/tickets/in-progress/preview-popup-tab-browser-behavior/workflow-state.md)

## Why Docs Were Updated

- Summary:
  - the long-lived Preview architecture doc needed to describe popup/new-window behavior, bounded popup policy, and the remaining best-effort OAuth limitation
- Why this change matters to long-lived project understanding:
  - without this update, the durable doc would still imply Preview is only a session/tab surface opened by tools and would not explain why popup-based login flows now create Preview tabs instead of being denied

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| [preview_sessions.md](/Users/normy/autobyteus_org/autobyteus-worktrees/preview-popup-tab-browser-behavior/autobyteus-web/docs/preview_sessions.md) | canonical durable doc for Preview session ownership/runtime behavior | Updated | added popup/new-tab behavior, bounded popup policy, popup-created tab semantics, and OAuth limitation notes |

## Docs Updated

| Doc Path | Type Of Update | What Was Added / Changed | Why |
| --- | --- | --- | --- |
| [preview_sessions.md](/Users/normy/autobyteus_org/autobyteus-worktrees/preview-popup-tab-browser-behavior/autobyteus-web/docs/preview_sessions.md) | Architecture/runtime behavior update | documented in-app popup/new-tab behavior, bounded popup policy, popup-created first-class preview sessions, and best-effort OAuth limits | make the durable Preview doc truthful after popup-tab support landed |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Popup to Preview-tab behavior | `window.open()` from Preview content now becomes another Preview tab rather than being denied or opening a separate OS window | [proposed-design.md](/Users/normy/autobyteus_org/autobyteus-worktrees/preview-popup-tab-browser-behavior/tickets/in-progress/preview-popup-tab-browser-behavior/proposed-design.md), [future-state-runtime-call-stack.md](/Users/normy/autobyteus_org/autobyteus-worktrees/preview-popup-tab-browser-behavior/tickets/in-progress/preview-popup-tab-browser-behavior/future-state-runtime-call-stack.md) | [preview_sessions.md](/Users/normy/autobyteus_org/autobyteus-worktrees/preview-popup-tab-browser-behavior/autobyteus-web/docs/preview_sessions.md) |
| Bounded popup policy | popup requests are only allowed from leased opener sessions and popup fan-out is capped per opener | [implementation.md](/Users/normy/autobyteus_org/autobyteus-worktrees/preview-popup-tab-browser-behavior/tickets/in-progress/preview-popup-tab-browser-behavior/implementation.md), [code-review.md](/Users/normy/autobyteus_org/autobyteus-worktrees/preview-popup-tab-browser-behavior/tickets/in-progress/preview-popup-tab-browser-behavior/code-review.md) | [preview_sessions.md](/Users/normy/autobyteus_org/autobyteus-worktrees/preview-popup-tab-browser-behavior/autobyteus-web/docs/preview_sessions.md) |
| Embedded OAuth limitation | popup support fixes the in-app popup block, but provider-side embedded OAuth rejection can still happen and is not a Preview-shell regression | [investigation-notes.md](/Users/normy/autobyteus_org/autobyteus-worktrees/preview-popup-tab-browser-behavior/tickets/in-progress/preview-popup-tab-browser-behavior/investigation-notes.md), [api-e2e-testing.md](/Users/normy/autobyteus_org/autobyteus-worktrees/preview-popup-tab-browser-behavior/tickets/in-progress/preview-popup-tab-browser-behavior/api-e2e-testing.md) | [preview_sessions.md](/Users/normy/autobyteus_org/autobyteus-worktrees/preview-popup-tab-browser-behavior/autobyteus-web/docs/preview_sessions.md) |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| blanket popup deny in Preview | in-app popup/new-tab support with a bounded popup policy | [preview_sessions.md](/Users/normy/autobyteus_org/autobyteus-worktrees/preview-popup-tab-browser-behavior/autobyteus-web/docs/preview_sessions.md) |

## Final Result

- Result: `Updated`
- If `Blocked` because earlier-stage work is required, classification: `N/A`
- Required return path or unblock condition: `N/A`
- Follow-up needed:
  - future browser-surface renaming work, if chosen later, should revisit this doc because it currently keeps `Preview` as the user-facing term and `preview_session_id` as the tool/runtime handle
