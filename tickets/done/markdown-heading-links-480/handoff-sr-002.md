# Handoff — autobyteus-480, SR-002: Architecture Design Complete

- Package: `markdown-heading-links-480` (Project Task `autobyteus-480`)
- Result: `Architecture Design Complete`; `task_size: Small`, `architectural_risk: Low`
- Route (`get_handoff_rules`, 2026-11-12): `/software_engineering_team/implementation_engineer` (Small with Low risk → direct implementation)
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`) for the user
- Workspace: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/markdown-heading-links-480`, branch `codex/markdown-heading-links-480`, base `origin/personal` at `931a1feeb6`; finalization target `origin/personal`. Dependencies are installed; builds are not yet run. No product code is changed. The ticket documents are on disk, not committed.
- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/markdown-heading-links-480/tickets/in-progress/markdown-heading-links-480/`

## Request

A Contents entry such as `[…](#the-approach-spine-first-practices-in-context)` in `design-principles.md` opens a 404 page in the Skills file preview. Goal:
- same-document heading links scroll to the heading on every surface (Skills preview, Files panel, phone viewer, conversations), with no route change;
- headings get GitHub-compatible ids;
- relative links to other files are decided by the SD;
- a broken anchor does nothing.

Release only on the user's word.

## Cause (`investigation-notes.md`)

- Headings render without ids (measured).
- `MarkdownRenderer.handleLinkClick` handles only file actions and external `http(s)` links, so `#…` falls to the browser and the hash router reads it as a route.

## Build (`design-spec.md`)

- `utils/markdown/headingAnchors.ts`: the GitHub slug rule, a per-document slugger and the `user-content-` id prefix.
- `useMarkdownSegments`: give `heading_open` tokens their ids after `md.parse`.
- `MarkdownRenderer.handleLinkClick`: a `#anchor` link prevents the default, finds the heading within this renderer's root and scrolls to it (does nothing if missing); a link with no scheme that is not an anchor or a file action is prevented and does nothing (DEC-001). External, file-action and other-scheme links are unchanged.

## Decisions (`requirements-doc.md`)

- DEC-001: relative links to other files do nothing (FU-001 to open them).
- DEC-002: no URL change.
- DEC-003: own slug function, no new package.

## Documents

`requirements-doc.md`, `investigation-notes.md`, `design-spec.md`, `solution-revision-record.md`, `follow-ups.md`.
