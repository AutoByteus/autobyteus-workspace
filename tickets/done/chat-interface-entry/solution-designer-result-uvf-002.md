# Solution Designer Result: Chat run view layout and strip tab (user feedback via API/E2E)

- Package: `chat-interface-entry`
- Current solution revision: SR-012 (ARCH-REV-008 Pass)
- Date: 2026-09-29
- Trigger: API/E2E Engineer (run `api_e2e_engineer_2705306ac78d43b399ef3f3165491f9f`) relayed a user request: ask the Product Prototyper to update the Chat UI so the Chat run view matches the Agent Team / Agent Org views.
  - Evidence: `api-e2e-evidence/round4-desktop/USER-Q1-chat-strip-collapsed.png`, `USER-Q1-chat-panel-open.png`, `USER-Q1-strip-files-click.png` (HEAD `3c062a180`).

## Classification

**Not a Product or requirements change.** It is an implementation fidelity defect against the already-approved R2 supplement.

### Evidence

- **Header and right column.**
  - The approved R2 references define the Team/Org-like three-column structure:
    - VIS-018 (panel open) and VIS-019 / VIS-015 (strip collapsed): the right strip or panel is a full-height column starting at the top of the window, and the chat header spans only the centre column.
  - The build deviates: the header spans the full width (right edge = window width), and the tool shell starts below the header at y = 56.
  - Likely cause: `autobyteus-web/components/chat/ChatRunView.vue` renders `ChatRunHeader` above `WorkspaceToolShell` instead of inside its centre slot. D-07 already requires "`WorkspaceToolShell` wrapping" the chat centre.
  - Requirements protected: REQ-018 / AC-015 (fidelity to VIS-001–025) and REQ-012 / AC-010 (the chat view uses the product tool strip and panel).
- **Clicked strip tab.**
  - UIS-009, TR-013 and spec CHK-015 require the panel to open on the clicked tab.
  - The build opens Activity for both the Files and Terminal clicks (`USER-Q1-strip-files-click.png`).
  - It is not yet known whether the shared Team view has the same pre-existing behavior; API/E2E should check it.

## Required Action (owner: the API/E2E → implementation chain)

1. Record both items as API/E2E findings (Local Fix, REQ-018/AC-015 and REQ-012/AC-010; UIS-009/TR-013) and route them per the API/E2E handoff rules.
   - Expected fix: render `ChatRunHeader` inside the `WorkspaceToolShell` centre slot, so the header stops at the right column and the strip/panel start at y = 0.
   - Make the strip click open the clicked tab.
   - If the strip-tab defect also exists in the Team view (shared component), fix it in the shared owner and record it as pre-existing.
2. No design or requirements revision is needed. No Product Prototyper request is needed, because the approved references already specify this layout.
   - If the user still wants a Product review after being told this, Solution Designer will send a Product Design request on the user's confirmation.

## Status

- Requirements: Approved (unchanged). Design: SR-012 (unchanged).
- Handoff rules: no Solution Designer rule matches a local implementation defect. This result is returned to the calling workflow (API/E2E) and to the user.

## Update (2026-09-29): user direction supersedes the classification above

- The user explicitly directed: "you need to send to product prototype to fix the UI for the chat page … the right side tabs are not the same as other area, workspace area."
- The item is reclassified as `Product Design Requested` (Result Correction, R3). Request: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/product-design-revision-request-r3-handoff.md`, sent to `/product_team/product_prototyper`.
- The **layout fix is on hold** until the user-confirmed R3 supplement returns. Solution Designer will then integrate R3 and route the implementation fix.
- The strip-tab click defect (UIS-009/TR-013) is included in R3 as part of the right-tabs behavior. API/E2E may still record it as a finding, but should not route a separate layout fix against R2.
