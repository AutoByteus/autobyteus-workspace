# Product Design Request — chat-composer-menus-open-upward

- Result classification: `Product Design Requested`
- Purpose: `New Request`
- Package identifier: `chat-composer-menus-open-upward`
- Current solution revision: `SR-001`
- Requirements status: `Draft` (the user wants Product Prototyper to fix the UI first; approval comes after)
- From: Solution Designer (`/software_engineering_team/solution_designer`)
- Date: 2026-09-30

## User's Requested Outcome (user's words)

> "look on the chat page, the input message box area is too hihg, causing the workspace dropdown goes down. i feel like its better to always make them go up and move down the input message box a bit. please talk to product prototyper for first fixing UI"

Screenshot: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-composer-menus-open-upward/tickets/in-progress/chat-composer-menus-open-upward/user-screenshot-2026-09-30.png`
(new-chat page, `@` typed. The "Chat with @" menu drops **below** the composer, covers the temp-workspace hint line and is cut off at the window bottom.)

## Focused Decision

On the new-chat page:
1. Composer menus (`@` agent/team, `/` skill, Workspace, Model, Thinking) **always open upward**.
2. Move the composer (heading + subtitle + composer + hint group) **down a bit**, so upward menus have room.

Please produce the UI fix and say how far the composer should move, plus how upward menus behave in short windows.

## Requirements Context (Draft IDs)

- REQ-001 menus always open up (BEH-001, SCN-001/002)
- REQ-002 composer moves down somewhat (BEH-002, SCN-003)
- REQ-003 short window: upward menu shrinks and scrolls, never flips down (SCN-004, proposal)
- REQ-004 preserve narrow-window bottom sheet and running-conversation input (BEH-003/004)
- Open questions: OQ-001 minimum menu height above / behavior in very short windows; OQ-002 amount of downward move; OQ-003 hint line position.

## Established Constraints And Non-Goals

- Only the new-chat page. The running-conversation input and its `/` menu stay as they are. They are already at the bottom and open up.
- Menu contents, search, keyboard navigation and selection stay the same.
- Narrow windows (<640px) keep the bottom-sheet presentation unless you recommend otherwise.
- No redesign of the composer itself.

## Existing Product Context (evidence)

- Placement logic: `autobyteus-web/composables/popover/useAnchoredPopover.ts` `measure()` picks **below** whenever space below ≥ the menu's preferred height (`@`/`/` 300px, workspace 420px). The composer is vertically centered, so desktop windows usually have that space below. This is the root cause.
- Layout: `autobyteus-web/components/chat/ChatNewSurface.vue:3`: column `justify-center pb-[6vh] pt-10`, composer `max-w-3xl` with `mt-8`, workspace hint line `mt-2.5` under it.
- History: the `chat-composer-polish` ticket already lowered the upward bias from 14vh to 6vh (its REQ-007). The user still finds the composer too high. `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/chat-composer-polish/requirements-doc.md`
- Chat entry product design history: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/chat-interface-entry/`

## Canonical Artifacts

- Requirements (Draft): `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-composer-menus-open-upward/tickets/in-progress/chat-composer-menus-open-upward/requirements-doc.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-composer-menus-open-upward/tickets/in-progress/chat-composer-menus-open-upward/investigation-notes.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-composer-menus-open-upward/tickets/in-progress/chat-composer-menus-open-upward/solution-revision-record.md`
- Workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-composer-menus-open-upward` (branch `codex/chat-composer-menus-open-upward`, base `origin/personal@57df63f07`, finalization target `personal`)

## Expected Output / Next Action

Product Prototyper returns a UI result: prototype/spec for upward menus and the new composer position, with answers to OQ-001–003. Solution Designer then updates the requirements, gets the user's explicit approval and does the design.

## Route

`get_handoff_rules` matched "Product Design Requested" → `/product_team/product_prototyper`.
