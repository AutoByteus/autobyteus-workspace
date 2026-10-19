# Follow-up Task Request (one ticket) — from `imported-team-defaults-edit`

- Requested by: the user, in the Solution Designer conversation, 2026-10-14 ("the follow up should only be one ticket … later ticket should fix those")
- Origin: urgent Task `project_task_70a4e762-6aa2-4e87-88da-43b8cdd80900` (SR-003, "all registered-package definitions are editable, keep it simple")
- Suggested title: **Personal settings vs package content for imported agents, teams and Orgs**

## Items To Address In This One Ticket

1. **Avatar as a personal setting.**
   - The user's view: an avatar saved into a public package means nothing on other machines (the picture is not on their system).
   - The avatar for agents, teams and Orgs from agent packages should be a private setting kept in the app, not written into the package.
2. **Personal runtime/model overrides for other people's packages.**
   - Packages are now editable, and their runtime/model default is the author's recommended, tested combination (it saves money).
   - A user of someone else's package may want a different runtime/model just for themselves, without editing the package.
   - Design a personal override kept in the app on top of the package default, with launch precedence intact: user's launch choice > personal/configured default > routing > inherit.
   - Context: an earlier design for this (an app-data "agent launch preference" store with a service-level overlay) was drafted and reviewed in `imported-team-defaults-edit` SR-001/SR-002 (`design-spec.md` history, `design-review-report.md`). It was withdrawn only to keep the urgent fix simple.
3. **Clean package writes.** Saving an agent writes extra empty fields into the package's `agent-config.json` (`skillScope`, empty processor lists, `avatarUrl: null`). This was seen as uncommitted noise in `/Users/normy/autobyteus_org/autobyteus-agents/agent-teams/software-engineering-team/agents/*/agent-config.json`. Saves should write only real content, so package diffs stay clean.
4. **GitHub-installed packages.** Packages installed from GitHub are now editable like local ones, but a later package update overwrites those edits. Decide what editing such packages should mean (e.g. only personal settings, or a clear warning) consistently for agents, teams and Orgs.

## Notes

- The user wants these handled as **one** Task, not four.
- Precedence and the launch-defaults behavior from Tasks `e2060dfd` / `025b20cb` must stay intact.
