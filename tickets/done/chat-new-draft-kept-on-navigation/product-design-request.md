# Product Design Request — New chat Draft rows under the Chat row

- Classification: `Product Design Requested`
- Purpose: `New Request`
- Package identifier: `chat-new-draft-kept-on-navigation`
- Current solution revision: `SR-002` (requirements `Ready for Approval`, not yet approved by the user)
- Requesting role: Solution Designer (`/solution_designer`)
- Date: 2026-10-07
- User request reference: User message 2026-10-07: "could you delegate a task to @Product Team to work on the UI first?"

## User's Requested Outcome (user's own terms)

The user wants the Product Team to "work on the UI first" for the Draft feature before technical design starts.

Original problem in the user's words: "When I click chat, I input something and then, because I need to copy extra content from some existing agent run ... I navigate away and when I navigate back, the earlier input I gave is already gone ... I have to remember all the things, collect them first, and cannot navigate away ... very inconvenient."

User's proposed solution in the user's words: "Create a draft ... the draft is basically under the chat row directly ... when you start a draft, it's under the chat row directly, and then I can click that draft to enter ... the edit new chat [pencil] is always starting a new chat ... a very common design in some kind of software."

## Product Decision / Experience To Design

How unsent New chat drafts look and behave in the AutoByteus left panel, directly under the **Chat** primary nav row, and how the user re-enters, recognizes, and discards them, while **Chat** and the pencil ("New chat") always start a new chat.

## Requirements Context (proposed, pending user approval)

Canonical: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-composer-draft-persistence/tickets/in-progress/chat-new-draft-kept-on-navigation/requirements-doc.md`

- REQ-001: A New chat becomes a Draft once it has user content (text, attachment, `/` skill, `@` mention). Choosing only target/model/workspace does not create one.
- REQ-002: Draft rows directly under the Chat row, newest first; each shows a "Draft" marker, the target agent/team, and a one-line text preview (or attachment count when no text).
- REQ-003: Clicking a Draft row reopens the New chat surface with that draft exactly as left (text, attachments, skills, mentions, target, workspace, model/thinking, Auto-approve, team member customizations); the open row shows as selected.
- REQ-004 / REQ-005: Chat, pencil, Run and "+" always open a fresh New chat; any existing draft with content is kept as a row.
- REQ-006: Sending removes the row; a failed send keeps it.
- REQ-007: Each row has a discard action (e.g. hover ✕); discarding the open draft shows a fresh New chat.
- REQ-008: A draft whose content is fully cleared stops being listed once left.
- Scenarios: SCN-001 (compose → open another run → copy → re-enter draft → send), SCN-002 (start another chat while a draft is kept), SCN-003 (send), SCN-004 (discard).

## Critical Journey And States

- Journey: compose New chat (e.g. targeted at "Software Engineering Team" with text + an attached image) → click a running team member in the Workspaces tree → copy text → click the Draft row under Chat → paste → send.
- States to consider: no drafts; one draft; several drafts (primary nav section is height-resizable and scrolls); draft currently open (selected); Chat/pencil active vs draft active; draft with text only / attachments only / Team vs Agent target; long text preview; hover discard; collapsed left panel; narrow/mobile layout if relevant.

## Established Constraints And Non-Goals

- Chat and the pencil always mean "start a new chat"; starting a new chat never destroys a draft with content.
- No confirmation dialog when starting a new chat.
- Out of scope: drafts for existing runs (their composers already keep text per run), Org launch drafts, server/cross-device storage.

## Open Questions (user has not decided yet)

- DEC-002: Do drafts survive app restart? Solution Designer recommends yes (on this device).
- DEC-004: Draft creation threshold (recommended: any text/attachment/skill/mention).
- DEC-005: Multiple drafts vs one (recommended: multiple).

## Existing Product Context

- Current left panel: primary nav (Chat with pencil and collapse buttons, Agents, Agent Teams, Agent Orgs) in a resizable top section; Workspaces/Teams run tree below; Settings footer. Source: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-composer-draft-persistence/autobyteus-web/components/AppLeftPanel.vue`.
- New chat surface: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-composer-draft-persistence/autobyteus-web/components/chat/ChatNewSurface.vue`.
- User screenshot of the lost-draft situation: `/private/tmp/claude-501/-Users-normy-autobyteus-org-autobyteus-workspace-superrepo/d4ac5337-98f4-46f0-b256-2eda793ad6e4/images/1.png`.
- Evidence: `investigation-notes.md` in the same ticket folder.

## Expected Output

The Product Team's own result package for the user's review, returned to `/solution_designer` with its artifact paths, user-confirmation reference (if any), and open questions. Solution Designer will integrate the user-approved UI decisions into the requirements before seeking final approval and starting architecture design.
