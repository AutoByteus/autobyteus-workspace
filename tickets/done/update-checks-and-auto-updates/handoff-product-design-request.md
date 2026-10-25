# Handoff — Product Design Requested (New Request)

- Package: `update-checks-and-auto-updates`, Project Task autobyteus-210 (requested by `/project_task_manager`, on the user's requests of 2026-10-20, 21 and 23)
- From: Solution Designer (`/software_engineering_team/solution_designer`), 2026-10-23
- SR entry: SR-002; requirements `Approved` (the user's own answers for the key decisions; the rest within the direction, user informed)
- The UI must be approved by the user before building.

## The User's Words

- 2026-10-20: "only when the user has agreed, then we'll do that … a lot of software provide features to ask for human approval, so we can have a setting there; if the user wants to automatically upgrade, they check a toggle … they don't have to care about."
- 2026-10-23 (Task comment): "a lot of users, when an agent package has been updated, did not even see a notification." A different, configurable check interval per notification category. A toggle in the notification area itself: "some users don't even know the setting exists"; the Settings card stays the full home; one setting, two places; the explanation of what turning it on means must be visible at the toggle.
- 2026-10-23 (to the Solution Designer): "for software, of course, we do not do automatic updates." "The automatic update is a toggle for agent packages and the skill sources." "I want to also have another notification … agent runtimes … so user can also enable just automatic updates … a lot of users, they don't know that they need to update those."

## What The Design Must Answer

Baseline: the approved Notification Center of autobyteus-209 (`/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/settings-update-notifications/ui-ux-spec.md`, final references VIS-001..028), the Update checks card in Server Settings → Basics, Settings → Updates, Settings → Agent Runtimes.

1. **Notification categories**
   - Today there are three: Software update, agent package updates, skill updates.
   - Add a fourth, **Agent runtimes** (Codex, Claude, Antigravity, Grok). It appears only in windows of the desktop's own node (REQ-020, DEC-017).
   - Runtime rows: installed → newest version; Update runs the vendor's update (as on Settings → Agent Runtimes). It is unavailable, with the reason, while that runtime has running agents (REQ-021).
2. **Automatic-update switches in the Notification Center**, at their categories:
   - one for agent packages, one for skill sources, one for agent runtimes (desktop's own node only); none for software;
   - each off by default;
   - the explanation at the switch: what is downloaded and from where, that the content can change what agents do, that local changes are never replaced, how to turn it off (REQ-010);
   - the same settings as in the card.
3. **Rows for automatic outcomes** (REQ-008, REQ-009, REQ-007, REQ-022):
   - "updated automatically to <revision/version>", with what changed;
   - "automatic update failed, nothing was changed", with the reason and a manual Update;
   - "not updated automatically: local changes", with a manual Update (skill sources keep their confirmation);
   - runtimes: waiting while agents run.
4. **The indicator** must show while any automatic outcome is unread, even when nothing waits (REQ-008, DEC-007).
5. **The Update checks card** (Server Settings → Basics, per node):
   - the existing switch;
   - one interval control per category for agent packages, skill sources and agent runtimes (default 30 / 30 / 60 minutes; minimum 15 minutes; maximum 24 hours), with a short note about GitHub's limits;
   - the three automatic-update switches with the full explanation;
   - "GitHub asked this node to wait until HH:MM" when GitHub refuses (REQ-004, DEC-006);
   - when Update checks is off, the automatic-update switches show they have no effect (REQ-017);
   - an honest network description (REQ-016).
6. **Settings → Updates (desktop app):**
   - a switch "check for app updates automatically" (on by default; when off, no request at launch or periodically; "Check for Updates" still works) (REQ-013);
   - the app check interval (default 60 minutes, minimum 15, maximum 24 h) (REQ-012);
   - truthful status and Last Checked: up to date / available / check failed / automatic checks off (REQ-015).
7. All strings in en and zh-CN.

## Constraints And Non-Goals

- The app itself is never updated automatically (REQ-023).
- No undo, pin or skip-version (DEC-003, the user).
- No per-package or per-source exceptions (DEC-001).
- No runtime category, switch or Update for remote or Docker nodes.
- No pop-ups; failures of checks stay quiet (only automatic update outcomes are notified).

## Related Questions From 209 (not in scope unless the user approves them in this design)

- PQ-1: Settings pages show no update indicator, because the Settings layout has no sidebar Settings row.
- PQ-2: in windows narrower than about 1100 px, the skill-source update confirmation overlaps the open panel (209 evidence `IMP-10-skill-confirmation-overlap.png` in `tickets/done/settings-update-notifications/evidence/` at origin/personal).

## Canonical Paths

- Requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/update-checks-and-auto-updates/tickets/in-progress/update-checks-and-auto-updates/requirements-doc.md`
- Investigation notes: `.../investigation-notes.md`
- Solution revision record: `.../solution-revision-record.md`
- Source to base the UI on: `/Users/normy/autobyteus_org/autobyteus-worktrees/update-checks-and-auto-updates` (branch `codex/update-checks-and-auto-updates` at `origin/personal` `d2820672c3`)

## Expected Output

A Product-owned UI/UX package (spec, runnable reference, final references, en/zh-CN strings) with the user's explicit approval, reported to this Solution Designer (run ID in the delegation).

## Route Record

- The Task names the Product Team for the design, through the Solution Designer.
- Delegated with `delegate_task` to `/product_team` (description mode).
- Delegated 2026-10-23: team run `product_team_c8bc4fa1130b42aaa2699dbd8d6ef023`, coordinator `product_ui_ux_designer_d3a466b2a14542698fcb2a9b4ab76b32`. No separate Task: this Solution Designer works on a delegated Task, so the design work is part of autobyteus-210.
