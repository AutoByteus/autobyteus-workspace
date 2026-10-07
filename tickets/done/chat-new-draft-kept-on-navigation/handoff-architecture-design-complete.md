# Handoff — Architecture Design Complete

- Result: `Architecture Design Complete`
- Package identifier: `chat-new-draft-kept-on-navigation`
- Current solution revision: `SR-005`
- From: Solution Designer (`/solution_designer`), 2026-10-07
- Route applied: matching rule "Architecture Design Complete with task_size=Small or Medium and architectural_risk=Low" → `/implementation_engineer` (direct implementation route; independent architecture review not applicable)

## Original Request And Goal

The user lost their New chat input (text, attached files, team target, settings) whenever they left the New chat surface to copy details from another run and came back through the Chat item.

Goal: keep each unsent New chat with typed text as a one-line Draft row directly under the Chat row. Clicking a row re-enters the draft exactly as left. Chat, the pencil, Run and "+" always open a blank New chat without destroying drafts.

## Approval Basis

- Requirements: Approved 2026-10-07 (SR-003 content + DEC-002 = A, session-only; user reply "no do not survide. no need"; recorded SR-004).
- UI/UX: Product-owned spec, user-confirmed 2026-10-07 ("i am satisfied. i confirm now"), design revision `21643c2` (ticket closed `5e93a70`).

## Classification

- task_size: `Medium`. About 7 production files plus 2 localization catalogs and tests, all in `autobyteus-web`.
- architectural_risk: `Low`. Frontend session state inside existing owners; no API, persistence, security or deployment change.
- Escalation trigger: see design-spec.md "Task Size And Architectural Risk".

## Workspace

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-composer-draft-persistence`
- Branch: `codex/chat-composer-draft-persistence`
- Base: `origin/personal` @ `cfeda548b`
- Finalization target: `origin/personal`

## Artifacts (absolute paths)

- Requirements (Approved): `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-composer-draft-persistence/tickets/in-progress/chat-new-draft-kept-on-navigation/requirements-doc.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-composer-draft-persistence/tickets/in-progress/chat-new-draft-kept-on-navigation/investigation-notes.md`
- Design spec (Ready): `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-composer-draft-persistence/tickets/in-progress/chat-new-draft-kept-on-navigation/design-spec.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-composer-draft-persistence/tickets/in-progress/chat-new-draft-kept-on-navigation/solution-revision-record.md`
- Product design request (history): `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-composer-draft-persistence/tickets/in-progress/chat-new-draft-kept-on-navigation/product-design-request.md`
- External, Product-owned (read-only, normative):
  - UI/UX spec: `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/chat-new-draft-kept-on-navigation/ui-ux-spec.md`
  - Final visual references: `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/chat-new-draft-kept-on-navigation/visual-references/` (VIS-001..VIS-008)
  - Product ticket: `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/chat-new-draft-kept-on-navigation/product-ticket.md`
  - Runnable UI reference: `/Users/normy/autobyteus_org/autobyteus-web-design` @ `5e93a70` (`corepack pnpm dev --port 3210`, open `/chat`). Reference files are not prescriptive; the design spec lists the production tightening.
- Architecture review artifacts: `N/A — not applicable` (direct route)

## Design Summary

- **`chatDraftStore`**:
  - replace the single draft with `drafts` + `openDraftId`;
  - add a stable `ChatDraft.id` and a store-owned `listed` flag;
  - `install()` leaves the open draft first, removing it only if it is not starting and has no text;
  - new actions `openDraft`, `discardDraft`, `finishSentDraft`;
  - per-draft model-choice generation;
  - exported `chatDraftHasText`.
- **`useRunStart.openChatDraft(id)`**: opens the draft and routes to `/chat`.
- **New `useChatDraftRows` composable and `ChatDraftRows.vue`**: row projection and rendering per the UI/UX spec.
- **`AppLeftPanel`**:
  - places the rows under the Chat row;
  - the Chat row is not active while a Draft row is selected;
  - opening a row closes the narrow drawer.
- **`ChatNewSurface`**: composer keyed by `draft.id`.
- **`chatLaunchService`**: calls `finishSentDraft(draft)` instead of `startNewChat()` after a successful launch.
- **Localization**: 4 new shell keys (en / zh-CN).

## Design Interpretation To Respect

REQ-006 "failed send":
- When the launch throws and the user stays on New chat (any team failure, or an agent failure before registration), the draft and its row stay.
- When an agent first send fails after its temp run is registered, today's presentation is kept: the error shows in that run. The draft is finished (row removed); the content lives in the run.
- This interpretation has been reported to the user.

## Open Risks

- Server-side draft attachment uploads of dropped or discarded drafts are not deleted, same as today. Out of scope.

## Expected Output

Implementation per design-spec.md with focused tests and rendered-frontend verification against VIS-001..008 and SCN-001..005 (TESTING.md), plus `implementation-handoff.md`.
