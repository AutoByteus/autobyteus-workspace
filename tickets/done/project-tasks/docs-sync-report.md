# Docs Sync Report

## Scope

- Ticket: `project-tasks` (`PROJ-TASKS-20260926-001`): description-only Project Tasks, SR-008 UI (released grid, full-width Project page, three-column Task board)
- Trigger: delivery round DR-002, the cumulative SR-008 package from `code_reviewer` (CRR-004 Pass test-code, CRR-003 Pass source, API-REV-002 Pass); design Change Sequence step 7
- Supersedes: the DR-001 docs sync, which described the rejected two-pane UI. Those uncommitted edits were reset to HEAD and rewritten. The DR-001 patch is kept for reference only at `/tmp/ptasks-delivery/r2/dr001-docs-edits.patch`, which is not durable.
- Classification (preserved): `task_size=Medium`, `architectural_risk=High`; route: full independent review
- Bootstrap base: `origin/personal@e06080b00` (v1.4.86)
- Integrated base used for docs sync: `origin/personal@8bffda045` (v1.4.88), merged as `f3029d30d`
- Post-integration verification reference: `release-deployment-report.md`; `delivery-logs/dr-002/`

## Why Docs Were Updated

- Summary:
  - Project Tasks is a new concept in the released Projects subsystem.
  - The persisted `projects.json` shape changes additively. Released rows are Directly Usable, with no migration.
  - The GraphQL contract gains Task operations and `Project.openTaskCount`. There is deliberately no status mutation.
  - The web UI keeps the released grid, adds a count line to each card, makes the Project page full-width with Back, and adds Tasks/Workspaces tabs and a width-driven three-column board.
- Why long-lived: the Task-admission ticket depends on three facts recorded here: there is no status mutation, the delete confirmation counts only open Tasks, and Tasks share the single-file lock. The container-query layout rule (752 px on the board's own width, no viewport breakpoint) is a non-obvious, approved behavior (stack, don't squeeze) that future UI work must preserve.

## Long-Lived Docs Reviewed

| Doc Path | Why Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-web/docs/projects.md` | Frontend module doc; HEAD still listed the IR-001 two-pane files | Updated | Scope, Main Files, stores, Pages And Components, new Project Task Board section, Testing |
| `autobyteus-server-ts/docs/modules/projects.md` | Server module doc | Updated | Server code is unchanged since review (`git diff a0fd103af..HEAD -- src/projects …` is empty), so the reviewed DR-001 server edits were re-applied verbatim; they describe only server behavior |
| `autobyteus-web/AGENTS.md` | Catalogue line | Updated | Mentions Tasks on a three-column board |
| `autobyteus-server-ts/docs/modules/README.md` | Module index | No change | Projects row already present |
| `autobyteus-web/docs/settings.md`, `applications.md` | Capability mechanism | No change | Gating unchanged |
| Delegated-task docs | Name-collision risk | No change | Separation documented on the Projects side; enforced by the architecture test |

## Docs Updated

| Doc Path | What Changed | Why |
| --- | --- | --- |
| `autobyteus-web/docs/projects.md` | Scope: Tasks, distinct from delegated tasks; no status change. Main Files: flat routes, `ProjectsList`/`ProjectCard`, `ProjectTaskBoard`/`ProjectTaskCard`; removed two-pane files and `relativeTime.ts`. Stores: `openTaskCount`, `setOpenTaskCount`, `projectTaskStore`, `forget`. Pages: grid with "N open tasks · N workspaces" (singular/zero forms); full-width Project page with **← Projects**, 2-line description clamp, Tasks (default) and Workspaces tabs (`?tab=workspaces`), cascade delete with the open-count caveat, Back from not-found and error states. New Project Task Board section: toolbar, fixed three columns with search-filtered counts, newest-first, "No tasks" and a global no-match with **Clear search**, loading and error with retry; search with no status filter; the container query (`container-type: inline-size`, `@container project-task-board (min-width: 752px)`, 3 × 240 + 2 × 16), no viewport breakpoint, stacking at about 1140 px / 1340 px windows with the default / 520 px side panel; description-only cards (3-line clamp, summary as accessible name); dialog modes, with status label and browser-locale time in view. Testing: E2E-001 to E2E-029 and the `ENABLE_*` note | Replaced UI; new concept |
| `autobyteus-server-ts/docs/modules/projects.md` | Scope; files; embedded `tasks` storage shape; Directly Usable read of v1.4.86 rows with no migration and no rewrite while browsing; `ProjectService` init/preserve/cascade/`openTaskCount`; `ProjectTaskService` invariants and ordering; deliberately no status mutation, and the two future triggers; GraphQL Task operations and types; error codes; tests (hermetic `ENABLE_*`) | New storage shape, contract and owner |
| `autobyteus-web/AGENTS.md` | Projects catalogue line | Discoverability |

## Durable Design / Runtime Knowledge Promoted

| Topic | Future-Reader Knowledge | Source | Target Doc |
| --- | --- | --- | --- |
| Board layout rule | The board switches on its own width (752 px container query), stacks rather than squeezing, and uses no viewport breakpoint or Tailwind plugin | `design-spec.md` SR-008 Ownership Map; `ARCH-REV-003` | web `projects.md` |
| Released navigation retained | Grid → full-width page → **← Projects**; the two-pane layout was rejected in user testing | `solution-revision-record.md` SR-005/SR-007 | web `projects.md` (current state only) |
| Embedded Task aggregate and no-migration read | One lock, atomic cascade; a missing `tasks` field means an empty list | `design-spec.md` Persisted Data | server `projects.md` |
| No status mutation | Status is always `TODO`; the admission ticket must revisit the delete count and write contention | design Interface/Risks; review carry-forwards | server and web `projects.md` |
| Project Task vs delegated task | Distinct names, and no imports in either direction | `REQ-012`; architecture test | server and web `projects.md` |

## Removed / Replaced Components Recorded

| Old Component / Concept | Replacement | Documented In |
| --- | --- | --- |
| Released card line (linked-workspace count only) | "N open tasks · N workspaces" | web `projects.md` › Pages |
| Released max-width Project page | Full-width page with **← Projects** and tabs | web `projects.md` › Pages |
| Two-pane components (`pages/projects.vue`, `ProjectListPane`, `ProjectListItem`, `ProjectTasksPanel`, `ProjectTaskRow`, `relativeTime.ts`) from the rejected IR-001 | Removed; they never shipped, so they are listed here only, not described in long-lived docs | this report |

## Delivery Continuation

- Result: `Pass`
- Next: handoff summary and release notes, then hold for explicit user verification of the SR-008 build.
- Notes: every claim was checked against the integrated source. Examples: the exact card wording and zero/singular forms, the 752 px rule and its CSS, the 2-line and 3-line clamps, the status label and time in the dialog's view mode, the list of probe cases, the unchanged server code, and the removal of `relativeTime.ts`.
