# Product Design Revision Request — chat-interface-entry (Chat box only)

- Result classification: `Product Design Requested`
- Purpose: `Result Correction` (user-directed revision of the returned package; continues the existing requested scope)
- Package identifier: `chat-interface-entry`
- Current solution revision: `SR-003` (requirements `Approved` 2026-09-28)
- From: Solution Designer (`/software_engineering_team/solution_designer`)
- Date: 2026-09-28

## References

- Original user request reference: Product Design request SR-001 — `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/product-design-request-handoff.md`
- Returned package: `/Users/normy/autobyteus_org/autobyteus-web-prototype/tickets/done/chat-interface-entry/` — `ui-ux-spec.md` (Approved), VIS-001–VIS-025, prototype `personal@1579886` (ticket result `27f9b74`). Solution Designer verified all 25 visual-reference SHA-256 hashes (25/25 match).
- Approved requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/requirements-doc.md` (SR-003)

## Why

After reviewing the returned package, the user made decisions in the Solution Designer conversation (2026-09-28) that change the Chat box and the model menu. The approved spec and visuals now disagree with the approved requirements in the items below.

In the user's words: "we make sure the two box looks as much UI as this styling side … the chat box have much more functionality. But on the styling side, the context area … will be the same", and "Yes, I think that's more consistent design … chat just adds features to it."

## Requested Changes (Chat only)

1. **DEC-014 — The Chat box looks like the existing message box.**
   - The Chat box on the New chat page and in the chat view reuses the product's existing message box styling.
   - It also reuses the existing **"Context Files (N) (drag, paste, or upload) +"** area, with the same styling and the same drag/paste/upload behavior.
   - This replaces the attachment chips and thumbnails (📎 button, image thumbnails, "Clear all", drop overlay) shown in VIS-001, VIS-011, and in UXJ-008 and UIS-002.
   - Chat keeps only its extra features on top of that box:
     - footer controls: workspace (New chat only), Auto-approve / Ask first, runtime + model, and thinking
     - `/` skill tags (skill chips stay; they are not attachments)
     - `@` addressing of an agent or team
     - the mic, following the Voice Input extension rule
2. **DEC-011 — No Recent list in the model menu.**
   - Remove the `Recent` section from UIS-003, VIS-002 and VIS-022.
   - The menu becomes: search across enabled runtimes (results labelled by runtime), then runtime rows, then that runtime's models, keeping the loading, error + Retry and Not installed states.
   - A New chat preselects the last-used runtime + model (one value remembered on this device). If there is none, it uses Daily Assistant's default launch config, and otherwise the runtime default.
3. **DEC-009 — Thinking is schema-driven.**
   - Show only the parameters the selected model exposes (on/off, effort, budget or level), and hide the control when the model has none.
   - The illustrative levels can stay illustrative. Please state the rule in the spec.

## Not Requested (user direction: no Product work for the unchanged part)

- **DEC-013:** team-member and org-member run views remain completely unchanged, keeping their existing box and changing the model through the existing gear settings editor.
  - UXJ-010, UIS-010 and VIS-020 are therefore out of scope for implementation.
  - No redesign is requested. It is enough to mark them out of scope or superseded so that the spec does not contradict the requirements.

## Other Approved Decisions (FYI, no UI change needed unless you see an inconsistency)

- **DEC-005:** the app lands on Chat (New chat) at startup.
- **DEC-010:** Daily Assistant is an internal agent in the platform Built-in agent package. It sees all installed skills and is visible and configurable like any agent in the Agents list and the Workspaces tree.
- **DEC-012:** the skill instruction wording is accepted.
- **DEC-008:** the old `codex/general-chat-entry` branch has been deleted.
- **Delivery shape:** one ticket.

## Expected Output

A revised, user-confirmed Chat-box supplement: an updated `ui-ux-spec.md` and the affected final visual references (at least VIS-001, VIS-002, VIS-011 and VIS-022, plus any others that show the attachment area or the Recent list), with the new revision/commit and the user-confirmation reference. Return it to Solution Designer for integration. Architecture design starts after that.

## Applied Handoff Route

- Matching rule: "Product Design Requested …" → `/product_team/product_prototyper`
- No other rule matches: no architecture package exists yet, there is no delivery receipt, and there is no marketing need.
