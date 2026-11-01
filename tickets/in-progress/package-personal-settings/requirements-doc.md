# Requirements Document

## Document Status

- Status: `Ready for Approval` (the user approves the model; DEC-001 and DEC-005 need him)
- Current solution revision ID: `SR-002` (draft: the user's "simple merge" idea, 2026-11-01)
- Package identifier: `package-personal-settings`
- Request: Project Task autobyteus-95
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), on the user's requests of 2026-10-14 and 2026-10-24
- Requirements owner: Solution Designer
- Date: 2026-10-24
- Approved by and reference: pending
- Behavior-defining supplements: none yet

## Problem And Desired Outcome

- Problem:
  - Agents, Teams and Orgs from agent packages are edited in the app, and the edits are written into the package folder (F-03).
  - A package update replaces the whole folder (F-04), so the user's personal changes are lost at every update, now also automatically (v1.5.9-beta.3).
  - What the user changes is almost always tools: he enables an MCP server's tools on an agent (F-01). Today he must re-add them after each update (F-06).
  - Also:
    - the avatar is saved into the package, where it means nothing on other machines (F-10);
    - there is no way to choose a runtime/model for someone else's package without editing it;
    - saves add empty fields and normalize untouched files, so package diffs are noisy (F-03, FT-5/O-2).
- Desired outcome: one model of what is the package's and what is the user's.
  - Personal choices (tool changes, avatar, runtime/model choice) live in the app and survive every package update.
  - The package files stay the author's, and a save changes only what the user changed.
- Success:
  - after an update of a GitHub package, by click or automatic, the user's added tools and MCP choices are still active, and the agent has the package's latest content;
  - nothing is lost silently;
  - a package save changes only the edited fields.

## The Proposed Model

| What | Where it lives | Why |
| --- | --- | --- |
| Instructions (`agent.md`, `team.md`), skills, the package's tool list, team members and handoffs, the author's recommended runtime/model | The package | The author's content; updates bring the latest |
| The user's tool changes (added or removed tools and MCP tools) on a definition from a GitHub-installed package | Personal settings in the app (per node) | Survive updates; applied on top of the package's tool list (DEC-001) |
| The avatar of any agent, Team or Org | Personal settings in the app | Meaningless on other machines (F-10) |
| A runtime/model choice for a definition from someone else's (GitHub-installed) package | Personal settings in the app | Item 2; launch precedence intact: the user's launch choice > personal default > package default > routing > inherit |
| Edits to a local package the user owns (his own checkout) | The package files, written cleanly | He is the author |
| Other edits to a GitHub-installed package (instructions, skills) | The package files; replaced by the next update, with a backup | The user: "everything else may simply be overwritten"; the backup keeps nothing from being lost silently |

## Relevant Current And Desired Behavior

| ID | Current | Desired | Preserved |
| --- | --- | --- | --- |
| BEH-001 | A package update overwrites edited configs; nothing is kept or backed up (F-04, F-06) | Personal tool changes survive; every overwritten file that differs from the installed revision is backed up | Update validation, rollback, automatic updates |
| BEH-002 | Editing tools on a GitHub package's agent writes `agent-config.json` | Stored as personal tool changes; effective tools = package tools + added − removed | Tool availability gating |
| BEH-003 | The avatar is written into package files | Stored in the app; a package's existing avatar is shown until the user sets one | — |
| BEH-004 | No personal runtime/model choice for package definitions | A personal default for GitHub-package definitions | Launch precedence (Tasks e2060dfd, 025b20cb) |
| BEH-005 | A save writes every field and normalizes untouched files (F-03, O-2) | A save writes only changed fields; untouched files stay byte-identical | Validation |

## Scope Guardrail

### In-Scope Use Cases

| ID | Use case |
| --- | --- |
| UC-001 | The user's tool and MCP choices on agents (and Team or Org members) from GitHub packages survive package updates (stage 1) |
| UC-002 | No silent loss at update: a backup of overwritten files that differ from the installed revision (stage 1) |
| UC-003 | One-time carry-over of tool changes the user made before this change (stage 1; DEC-005) |
| UC-004 | Avatar as a personal setting (stage 2) |
| UC-005 | Personal runtime/model default for GitHub-package definitions (stage 2) |
| UC-006 | Clean package writes, including FT-5/O-2 (stage 2) |

### Out Of Scope

- Merging instructions or skills on update.
- Skill sources (separate GitHub sources).
- Personal overlays for application-owned agents.
- Syncing personal settings between machines.

### Prerequisites

None known.

## Requirements (Draft)

| ID | Requirement | Behaviors |
| --- | --- | --- |
| REQ-001 | For a definition from a GitHub-installed package, the user's tool changes (added and removed tool names, including MCP tools) are stored as personal settings on that node, not in the package files. The effective tool list is the package's list plus the user's additions, minus the user's removals. | BEH-002 |
| REQ-002 | A package update, manual or automatic, never changes personal settings. After it, the effective tools are the new package's list with the user's changes applied. A tool the package newly adds is included unless the user removed it. | BEH-001 |
| REQ-003 | Before an update replaces a package, every file whose content differs from the installed revision is copied to a backup on that node, and the update's notification links it. | BEH-001 |
| REQ-004 | One time, at the first update after this change, a package's `toolNames` differences against its installed revision become personal tool changes, with the original files backed up (DEC-005). | BEH-001 |
| REQ-005 | Avatars of agents, Teams and Orgs are personal settings stored in the app and are never written into package files. A package's existing `avatarUrl` is shown until the user sets one. | BEH-003 |
| REQ-006 | The user can set a personal runtime/model default for a GitHub-package definition. Precedence: launch choice > personal default > package default > routing > inherit. | BEH-004 |
| REQ-007 | Saving a definition writes only the fields the user changed. Untouched files, key order, unknown keys and trailing newlines stay as they were (FT-5/O-2). | BEH-005 |
| REQ-008 | The editor of a GitHub-package definition shows which changes are personal (kept across updates) and which change the package (replaced by updates, backed up). | BEH-001, 002 |
| REQ-009 | Any change to stored user data is approved by the user and has a backup. | — |

Acceptance criteria follow after the model is approved.

## Decisions

| ID | Question | Reasoning And Recommendation | Owner | Status |
| --- | --- | --- | --- | --- |
| DEC-001 | How tool changes survive updates: (A) a personal overlay in the app; (B) the user's "simple merge" (2026-11-01): at update time, the user's added and removed tools and skills, found by comparing his files with the previously installed version, are applied to the new version's lists | **(B, the list merge)** changes only the update step. It needs no new store and no editor change. Lists have no conflicts. It also keeps tools added before this change, so DEC-005 needs no separate step. It needs the previously installed version at each update: a copy kept at install time, or one download from GitHub (no API quota). It cannot make the avatar or a runtime/model choice personal, but those are stage 2 and not urgent. **(A)** does all of that, but it is a larger change (store, overlay at load, editor notes) for the same urgent result. **Recommendation, revised 2026-11-01: (B) for stage 1.** Decide the avatar and runtime/model choice in stage 2 (a small personal store for those two only). | User | **Needs user** |
| DEC-002 | Personal tool changes: additions only, or additions and removals | Removing a tool you don't want should survive an update too, and it costs nothing extra. Both. | Solution Designer | Decided |
| DEC-003 | Other edits to a GitHub package (instructions, skills) | The user: "everything else may simply be overwritten". They stay editable; the update replaces them; a backup keeps them; the editor says so (REQ-008). | Solution Designer (the user's direction) | Decided |
| DEC-004 | The user's own local packages | He is the author: edits keep going into the files, written cleanly (REQ-007). Only the avatar is personal there too. | Solution Designer | Decided |
| DEC-005 | Tools already added before this change | With (B), they are kept at the first update without a separate step: the merge compares with the installed version downloaded once from GitHub. The merge writes the user's tools into the new config files, and a backup keeps the replaced files (REQ-003). It changes stored data, so it needs his approval. **Recommendation: yes.** | User | **Needs user** |
| DEC-006 | Staging | Stage 1: UC-001..003 (the user's urgent case), merged and released as a beta first. Stage 2: UC-004..006. Both within autobyteus-95. | Solution Designer (the Project Task Manager's direction) | Decided |
| DEC-007 | Existing avatars in package files | Stop writing them; keep showing them until a personal one is set. No change to existing files. | Solution Designer | Decided |
