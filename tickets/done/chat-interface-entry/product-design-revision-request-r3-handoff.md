# Product Design Revision Request (R3): Chat run view top area and right-side tabs consistency

- Result classification: `Product Design Requested`
- Purpose: `Result Correction`. This is a user-directed revision of the returned, approved R2 package and continues the existing requested scope (UIS-008 / UIS-009, DEC-007).
- Package identifier: `chat-interface-entry`
- Current solution revision: SR-012 (requirements Approved; design ARCH-REV-008 Pass; implementation at API/E2E round 4, not delivered)
- From: Solution Designer (`/software_engineering_team/solution_designer`)
- Date: 2026-09-29

## Original request and returned package

- Original request: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/product-design-request-handoff.md` (SR-001); R2 correction request: `.../product-design-revision-request-handoff.md`
- Returned package: `/Users/normy/autobyteus_org/autobyteus-web-prototype/tickets/done/chat-interface-entry/` (`ui-ux-spec.md` R2, VIS-001–025 without VIS-020), prototype `origin/personal@8ac6cad`

## User's request, in the user's words (2026-09-29)

> "you need to send to product prototype to fix the UI for the chat page, because the chat page on top is not ... in line with the other page, because the right side tabs should be, and the right side tabs are not the same as other area, workspace area."

Earlier feedback, relayed by API/E2E: "The Chat run view is not consistent with the other run views (Agent Team / Agent Org), especially at the top."

## What the user wants

The Chat run view (a single-agent run, UIS-008/UIS-009) should use **the same top structure and the same right-side tabs area as the workspace run views** (Agent Team / Agent Org / workspace):

- **Three-column structure.** The right-side tabs area is a full-height column that starts at the top of the window. The chat header spans only the middle column.
- **The right-side tabs match the workspace area.** Same tab bar, tab set/order, height and alignment with the header row, borders, collapse control, and the collapsed-strip versus opened-panel appearance and behavior.
- **Clicking a strip icon opens that tab** (already UIS-009 / TR-013).

## Evidence

- Current build (isolated desktop instance, HEAD `3c062a180`):
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/api-e2e-evidence/round4-desktop/USER-Q1-chat-strip-collapsed.png`
  - `.../USER-Q1-chat-panel-open.png`: the header spans the full width, and the panel sits under the header.
  - `.../USER-Q1-strip-files-click.png`: clicking Files or Terminal opened Activity.
- R2 references: `/Users/normy/autobyteus_org/autobyteus-web-prototype/tickets/done/chat-interface-entry/visual-references/VIS-015`, `VIS-018`, `VIS-019`.
  - These show a right column from the top.
  - The user nevertheless judges the chat page's top and right-side tabs as not matching the workspace area.
  - Please compare them against the real workspace Team/Org views in the product baseline, not only against the R2 references.
- The user's original screenshot of the workspace Team view (first message of this ticket) shows the reference look: right tabs Files / Team / Terminal / Activity at the top, and the header in the middle column only.

## Established constraints and non-goals

- The approved behavior is unchanged:
  - Single-agent runs open in the chat view, and team/org runs keep their view (DEC-007).
  - The right side reuses the product's own `RightSidebarStrip` / `RightSideTabs`, collapsed to the strip by default in chat.
  - Footer rules, the Chat box R2 and the model labels (REQ-021) are unchanged.
- Team and org views are not to be changed; they are the reference.
- The New chat page (UIS-001) has no right column and stays as is, unless you find it inconsistent too.

## Requirement / supplement impact

- REQ-012 / AC-010 and REQ-018 / AC-015 reference the approved visuals. A user-confirmed R3 supplement will supersede the affected references (VIS-015, VIS-017, VIS-018, VIS-019 and any others that show the chat run view).
- Solution Designer will integrate R3, update the requirements and design references, and route the implementation fix.

## Expected output

A revised, user-confirmed R3 of `ui-ux-spec.md` and the affected final visual references, with the new revision/commit and the user-confirmation reference. Return it to Solution Designer.

## Applied handoff route

- Rule: "Product Design Requested because the user explicitly … asks Product Team to help" → `/product_team/product_prototyper`
