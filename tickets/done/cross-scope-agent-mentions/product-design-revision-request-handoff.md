# Product Design Requested — cross-scope-agent-mentions (user-directed revision)

- Classification: `Product Design Requested`
- Purpose: `New Request`, a user-directed revision of the previously approved package after an approved requirements
  change. It is not a correction of an evidence gap.
- Package ID: `cross-scope-agent-mentions`; current SR: `SR-008` (Approved 2026-10-01)
- From: `/software_engineering_team/solution_designer`, 2026-10-01
- User request (exact words): "approved. ask product prototyper to update UI thanks"
- Prior Product package (approved 2026-09-30, "Okay, finally I confirm now. All good now."):
  `/Users/normy/autobyteus_org/autobyteus-web-prototype/tickets/done/cross-scope-agent-mentions/ui-ux-spec.md`,
  VIS-001–014. Prototype repository `/Users/normy/autobyteus_org/autobyteus-web-prototype` @ `personal` (c4d4764, record
  9ca5651), source pin `e9aa4a74c`.

## Why
During API/E2E testing, a Team brought in with `@` could not follow its own handoff rules: messaging a teammate's address
failed (DI-001). The user chose a different collaborator model, approved as SR-008:
- **One collaborator instance per run.** It is added when the user sends the `@` message. It shows as Offline until its
  first message, and a second `@` of the same definition reuses it.
- **The run's agents talk to it with `send_message_to`** by address (`/product_team`, `/product_team/<member>`), like
  normal communication. `delegate_task` is no longer the way to bring it in.
- **The first message that briefs the collaborator is an ordinary message.** It appears as a **Team/Org tab row** and as
  an inter-agent message in the collaborator's conversation. It is no longer the system task notice.
- **Adding is checked when the user presses send.** On failure: nothing is added, **the message is not sent**, the draft
  (text and chips) stays in the composer, and the red notice "Couldn't add <name> to this run … Nothing was added."
  appears (D-R1).
- **Collaborator rows keep the approved look** (VIS-006/009/012, dashed task-row style) and show Offline until first
  contact (D-R2).
- **Extra copies** via `delegate_task` remain possible as ordinary delegated children. The UI is unchanged for those.

## Focused decisions / what to update
1. **VIS-004** (Team run after send): the focused agent's reply shows a `send_message_to` tool card to `/product_team`, not
   `delegate_task`. The Team tab shows the briefing row (from the focused agent to the collaborator), then the later report.
2. **VIS-005, VIS-010, VIS-013** (collaborator conversation): the conversation starts with the briefing as an inter-agent
   message, matching how the product shows `send_message_to` deliveries today (F-003 noted that inter-agent deliveries
   render user-style; please confirm against the current product). The system task notice is removed for collaborators.
3. **VIS-007** (failure): the failure now happens on send. There is no agent turn and no `delegate_task` card. The draft and
   chips remain in the composer, and the red notice is shown above it.
4. **Team/Org tab views** that now include the briefing row (e.g. VIS-009, VIS-012), plus the Offline status before
   first contact on collaborator rows where it is visible.
5. Any copy in the `@` menu footer that implies delegation ("<agent> gets your message and brings them into this run") can
   stay, unless you or the user prefer different wording. It is still accurate.

Unchanged: the `@` menu, chips, inline mentions, empty states, standalone-run rows, the Team tab presence, the
product-wide task-row changes, the small window, and accessibility.

## Requirements context
- REQ-001/003/005/006/008/011/013, AC-003/004/005/006/008/011/015, SC-001/002/006/008 in `requirements-doc.md` (SR-008,
  Approved).
- Non-goals: no global Org; no linking across roots; Orgs are not mentionable; no change to how delegated copies of mounted
  Org Teams address teammates (E-20, separate ticket candidate).
- Server behavior is being redesigned in parallel after your result (design revision follows). Mocked boundaries stay
  local in the prototype.

## Open questions
- None from the user. Please bring any presentation question for the briefing row or the failure state to the user.

## Expected output
A revised, user-confirmed `ui-ux-spec.md` with updated final references and an approval reference, returned to
`/software_engineering_team/solution_designer`.

## Artifacts
- /Users/normy/autobyteus_org/autobyteus-worktrees/cross-scope-agent-mentions/tickets/in-progress/cross-scope-agent-mentions/requirements-doc.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/cross-scope-agent-mentions/tickets/in-progress/cross-scope-agent-mentions/solution-revision-record.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/cross-scope-agent-mentions/tickets/in-progress/cross-scope-agent-mentions/investigation-notes.md (E-20)
- /Users/normy/autobyteus_org/autobyteus-worktrees/cross-scope-agent-mentions/tickets/in-progress/cross-scope-agent-mentions/code-review-report.md (DI-001 context)
- /Users/normy/autobyteus_org/autobyteus-worktrees/cross-scope-agent-mentions/tickets/in-progress/cross-scope-agent-mentions/api-e2e-evidence/c-02-observation.log
- Prior Product package: /Users/normy/autobyteus_org/autobyteus-web-prototype/tickets/done/cross-scope-agent-mentions/

## Route
Matched rule: `Product Design Requested` → `/product_team/product_prototyper` (2026-10-01).
