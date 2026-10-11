# Product Design Request — Manage Skill Sources popup

- Classification: `Product Design Requested`
- Purpose: `New Request`
- Package identifier: `skill-sources-dialog-redesign` (SR-001)
- Requested by: user, via Solution Designer (`/software_engineering_team/solution_designer`), 2026-10-10 — "@Product Team here is can delegate a task to product team"
- Origin: Project Task `project_task_957c30cd-001d-4766-9bbe-47ee71700ef1`

## User's requested outcome (user's terms)

The user finds the "Manage Skill Sources" popup (Skills page → Sources) "really ugly" and wants a better UI. They want an improved popup that fits the app's existing visual language (other dialogs, Settings pages, list rows), and to **approve the design from visual references / screenshots before anything is implemented**.

## What the user sees today

Screenshot: `/Users/normy/autobyteus_org/autobyteus-worktrees/skill-sources-dialog-redesign/tickets/in-progress/skill-sources-dialog-redesign/design-reference/00-current-user-screenshot.png`

User observations (not prescriptions): each source takes a lot of vertical space; the paths dominate; Remove buttons are heavy and repeated; little hierarchy between important info (which source, how many skills) and secondary detail; doesn't feel like the rest of the app. Big blue Done; with 4+ sources the list scrolls and the add form is below the fold.

Things the user asked to be considered: compact rows; readable path display (e.g. folder name prominent, full path secondary, truncated with tooltip/copy); lighter destructive actions (icon or row menu, with confirmation); clear skill counts and a clear empty state for 0-skill sources; an obvious way to add a source; good behaviour with many sources (scrolling, fixed header/footer); keyboard and accessibility basics; consistent light/dark behaviour if the app supports it.

## Focused decision

The visual and interaction design of this one popup (and its remove/update confirmation presentation), ready for the user to approve with screenshots.

## Behaviour that must stay the same (requirements context)

See `requirements-doc.md` (BEH-001..007, REQ-001..009). In short, the popup must still support every state and action it has today:

- Sources: **Default** (built-in, never removable), **Local folder**, **GitHub repository**. Ordered Default first, then by path. Each shows its skill count (may be 0).
- Add: Local folder (absolute path) or GitHub (public repo URL, with the trust hint "Import only sources you trust…"). Duplicate-skill-name conflicts open a separate existing conflict dialog; the typed value is kept on failure.
- Remove (non-default only) always needs confirmation; message differs: local = unlink (files not deleted), GitHub = delete downloaded copy.
- GitHub rows: status (Not checked / Up to date / Update available / Check failed / Update failed / Removal incomplete, and transient Checking… / Updating… / Removing…), installed revision + branch, latest revision, last checked time, last error; actions Check again, Update (confirmation, overwrites local edits), Retry removal.
- Busy state disables actions; inline error / registry error / success / warning messages.
- Close via ×, Done, clicking outside, Esc.

## Established context and constraints

- Code: `autobyteus-web/components/skills/SkillSourcesModal.vue`, `SkillSourceRow.vue`; confirmation uses `components/common/ConfirmationModal.vue`.
- Closest in-app analogue: Settings → Agent Packages (`components/settings/AgentPackagesManager.vue`) — compact divided list rows, truncated mono path with tooltip, small badges and actions.
- Icons in use: heroicons via Iconify (trash, folder, plus, arrow-path…); existing `CopyButton`.
- The app has **no app-wide dark theme** (only a few renderer components react to dark); light design is what applies.
- A native folder picker (`showFolderDialog`) exists in the desktop app and is used elsewhere; offering a "Browse…" button would be a small behaviour addition and is an open user decision (DEC-002) — you may show it as an option for the user to decide.
- Non-goals: no store/server changes, no new source types, no reordering/renaming, no bulk actions.

## Open questions for the user

- DEC-001: which design.
- DEC-002: include a desktop "Browse…" folder picker or not.

## Expected output

A review-ready design package with production-quality visual references (screenshots) covering at least: populated list (mixed kinds, 0-skill and 56-skill sources, long paths), GitHub states, many sources (scrolling), add local + add GitHub, remove confirmation, and alert/busy states — with **explicit user confirmation** recorded, a UI/UX spec linking the runnable reference and final screenshots, and any illustrative-vs-normative details identified. Return the result to Solution Designer (`/software_engineering_team/solution_designer`) for integration into the requirements and implementation.

## Canonical artifacts

- Requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/skill-sources-dialog-redesign/tickets/in-progress/skill-sources-dialog-redesign/requirements-doc.md`
- Investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/skill-sources-dialog-redesign/tickets/in-progress/skill-sources-dialog-redesign/investigation-notes.md`
- Revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/skill-sources-dialog-redesign/tickets/in-progress/skill-sources-dialog-redesign/solution-revision-record.md`
- Code worktree (read-only reference for Product; branch `codex/skill-sources-dialog-redesign` from `origin/personal` @ `d28c56d5d`): `/Users/normy/autobyteus_org/autobyteus-worktrees/skill-sources-dialog-redesign`

## Delegation Record

- 2026-10-10: `delegate_task` to `/product_team` succeeded — team run `product_team_db1fcde8a1ec440bbda4a2bc0d0a83a0`, coordinator agent run `product_ui_ux_designer_faf0bee5857d43d58ad71add42fbc5e8`. No task_id returned (sub-work of the Project Task).
