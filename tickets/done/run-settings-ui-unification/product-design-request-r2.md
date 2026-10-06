# Product Design Request (Revision 2) — run-settings-ui-unification

- Result classification: `Product Design Requested`
- Purpose: `Result Correction` (a user-directed revision within the same requested scope)
- Package identifier: `run-settings-ui-unification`
- Current SR: `SR-003`
- From: `/software_engineering_team/solution_designer`
- To: `/product_team/product_ui_ux_designer` (handoff rule "Product Design Requested")
- Date: 2026-10-05
- Original user request: `product-design-request.md` (SR-001), in this folder
- Returned package being corrected: `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/run-settings-ui-unification/`
  - `ui-ux-spec.md`, `VIS-001..011`, `product-ticket.md`, `review-round-30.md`
  - Design `personal` = `b8ce240`
- Approval state:
  - The returned UI is user-approved for everything except the Org parts listed below.
  - Requirements are `Draft` until this revision is confirmed by the user and the requirements
    baseline is approved.

## What Changed And Why (user decision, 2026-10-05)

While reviewing the requirements, the user pointed out that an **Agent Org has no coordinator**, so a
chat message has no one to go to. Product contract: `autobyteus-web/docs/agent_orgs.md:56`, "AgentOrg
has no coordinator field, initial recipient, or implicit first member". Also `:192-211`: Org launch
intentionally has no focused recipient, and the workspace then asks the user to choose an exact Agent
or Team.

The user's words:
- "one organization doesn't have a coordinator … on the @, it can only add one agent or agent team."
- "the @ can only be agent or agent team … it doesn't matter you're on the chat page or … a live agent
  run … But organization can only be started from the organization page when user click run or with
  the plus on the running org."
- "I don't think it's a good idea … to start the organization from the chat. Because now the whole UI
  is already consistent."

When offered (A) a short Org launch page in the new visual language or (B) keeping the old Org form,
the user chose **A** ("Yeah").

## Gaps In The Returned Package (to correct)

1. UXJ-003 and UIS-001 "Org" have Org Run open **New chat**, with `launchOrgChat` and the first message
   starting the Org. This is superseded: **Orgs are not a chat target.**
2. Org copy in New chat is superseded: the placeholder "Message {{org}}…", `chat.launch.orgUnavailable`
   ("This org is not available. Choose another org."), and the `@` footer's "the focused agent is …
   or the org".
3. UXJ-005 / TR-007: Org "+" opens New chat prefilled. It must instead open the new Org launch page,
   prefilled with the run's workspace, approval, model+thinking and member overrides.
4. `@` (UXJ-007): already lists only agents and teams. Keep that explicit: **Orgs never appear in the
   `@` list** on any surface.
5. Removed-surfaces list: the old Org form is still replaced, but by the Org launch page rather than
   by chat.

## Focused Decision For Product

Design the **Org launch page**, reached from Agent Orgs → Run (list and detail) and from "+" on a
running/stored Org run. Reuse the approved language and components; this is not a new style.

- **Heading:** the Org name, consistent with the New chat heading and the saved-run header.
- **Settings card:** the four settings with the chat controls: Workspace, Model (+runtime), Thinking,
  Tool approval. Use the same row/card style as the saved-run settings (UIS-003), but editable.
- **Members:** the members line "All N members use these settings · Customize members" /
  "● n of N customized · Edit · Reset", and the same Member settings drawer (UIS-002), with placed
  teams + workspace, their members, and direct agents.
- **Primary action:** **Run Agent Org**. There is no message box, because an Org has no recipient.
  - Disabled with the existing reason when no model is selected.
  - On success the user lands in the Org run view, where they choose an exact Agent or Team, as today.
  - Launch failure keeps the page and values. Org unavailable: provide copy.
- **"+" from an Org run:** the same page, prefilled.
- **States to cover:** default, customized, model missing, launching, launch failed, Org unavailable,
  phone 390 px.
- REQ-003: no raw addresses, e.g. not "Select a model for / before launch.".

## Unchanged (user-approved; do not reopen)

- Agent and Team: Run / "+" open New chat; the first message starts the run.
- The members line and drawer for Teams.
- `@` = bring in a collaborator, current target excluded.
- Saved-run settings (UIS-003), except the stop wording: the user chose the workspace tree's existing
  labels (Agent "Terminate run", Team "Terminate team", Org "Stop Agent Org"). Pending/failure text
  uses the same verb: "Terminating…" / "Couldn't terminate this run. Try again." for Agent/Team;
  "Stopping…" / "Couldn't stop this org. Try again." for Org (requirements REQ-014, DEC-003). Please
  reflect this in the spec copy too.

## Related Requirement IDs (requirements-doc.md, SR-003)

- REQ-002, REQ-005..008, REQ-010, REQ-011, REQ-013, REQ-014, REQ-018
- AC-001..003, AC-007, AC-008
- SCN-003, SCN-008, SCN-009 (unsupported: Org from chat / `@` Org)
- DEC-003, DEC-004

## Canonical Paths

- Requirements (Draft, SR-003): `/Users/normy/autobyteus_org/autobyteus-worktrees/run-settings-ui-unification/tickets/in-progress/run-settings-ui-unification/requirements-doc.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/run-settings-ui-unification/tickets/in-progress/run-settings-ui-unification/investigation-notes.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/run-settings-ui-unification/tickets/in-progress/run-settings-ui-unification/solution-revision-record.md`
- Source base: `origin/personal@02d6ddf05`

## Expected Output From Product

A revised, user-confirmed UI/UX package:
- the Org launch page spec and visual references (desktop 880 px and phone 390 px);
- corrected Org/`@`/stop copy;
- the updated design repository revision;
- the user-confirmation reference.

Return it to `/software_engineering_team/solution_designer`. Solution Designer will integrate it,
obtain requirements approval and proceed to architecture.

## Route Record

- `get_handoff_rules` (2026-10-05): matching rule → `/product_team/product_ui_ux_designer`
  ("Product Design Requested"). No other rule applies.
