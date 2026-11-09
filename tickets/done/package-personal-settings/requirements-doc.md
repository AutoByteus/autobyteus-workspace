# Requirements Document

## Document Status

- Status: `Approved` at `SR-006`
- Current solution revision ID: `SR-006`
- Package identifier: `package-personal-settings`
- Request: Project Task autobyteus-95
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), on the user's requests of 2026-10-14, 2026-10-24 and 2026-11-01
- Requirements owner: Solution Designer
- Date: 2026-11-09
- Approved by and reference: `User`, in the Solution Designer conversation:
  - 2026-11-06: "is a way to store it somewhere … instead of updating the original file" (the personal settings file);
  - 2026-11-07: the data contract, after its validation;
  - 2026-11-09: "if it works then I would say continue with your work", taken as approval of the contract with its four recommendations (Q1–Q4), and stated back to him.
- Exact approved baseline: this document at SR-004, with the contract below, approved by the user. SR-006 adds only the built-in wording of REQ-004's reset label (AR-005): a wording change within the approved direction, made by the Solution Designer and reported to the user.
- Behavior-defining supplement: `personal-settings-file-contract.md` (storage, shape, reading/writing rules, effective values, update capture and backup), approved 2026-11-09, validated by `evidence/validate-personal-settings-file.mjs` (`evidence/personal-settings-file-validation-run.log`).

## Problem And Desired Outcome

- Problem:
  - Agents, Teams and Orgs from agent packages are edited in the app, and the edits are written into the package folder (F-03).
  - A package update replaces the whole folder (F-04), so the user's changes are lost at every update, now also automatically. What he changes is almost always tools: he enables an MCP server's tools on an agent (F-01). Today he must re-add them after every update (F-06).
  - In a git checkout (a local package), app edits show up as uncommitted changes (the user, 2026-11-06).
  - Saves also add empty fields and normalize untouched files (F-03, FT-5/O-2).
- Desired outcome: the user's own choices live in AutoByteus, outside the package files, and are applied on top of the package. Updates never lose them, checkouts stay clean, and a save changes only what the user changed.
- Success:
  - after a GitHub package update, by click or automatic, the user's tools, skills, avatar and runtime/model are kept, and the package content is the latest;
  - the user's changes to these four settings never appear in a package checkout;
  - nothing is lost silently.

## Relevant Current And Desired Behavior

| ID | Current | Desired | Preserved |
| --- | --- | --- | --- |
| BEH-001 | A package update overwrites edited configs; no backup (F-04, F-06) | Personal settings are untouched by updates. At each GitHub update, edits of the four settings found in package files are captured into personal settings, and every overwritten changed file is backed up | Update validation, rollback, automatic updates, notifications (209/210) |
| BEH-002 | Editing tools, skills, avatar or runtime/model of a package definition writes its config file | Stored in the personal settings file; the effective definition = package + personal (contract §5) | Tool availability gating; skill resolution |
| BEH-003 | The avatar is written into package files | Personal, as BEH-002 | — |
| BEH-004 | No personal runtime/model choice for package definitions | Personal, as BEH-002; launch order intact | Launch precedence (Tasks e2060dfd, 025b20cb) |
| BEH-005 | A save writes every field and normalizes untouched files (F-03, O-2) | A save writes only changed fields; untouched files stay byte-identical (stage 2) | Validation |

## Scope Guardrail

### In-Scope Use Cases

| ID | Use case | Stage |
| --- | --- | --- |
| UC-001 | Personal tools and skills for agents (including Team and Org members) from GitHub and local packages, and for built-in agents (Daily Assistant, Model Router) | 1 |
| UC-002 | Personal avatar for agents, Teams and Orgs from packages | 1 |
| UC-003 | Personal runtime/model choice for agents, Teams and Orgs from packages | 1 |
| UC-004 | Capture of package-file edits of the four settings at every GitHub update, plus a backup of overwritten changed files | 1 |
| UC-005 | The editor shows which settings are personal and offers "reset to the package's setting" | 1 |
| UC-006 | Clean package writes for the remaining fields, including FT-5/O-2 | 2 |

### Out Of Scope

- Merging instructions or skill content on update.
- Skill sources (separate GitHub sources).
- The user's own agents in the app's storage (`<app-data>/agents`); built-in agents synced there are in scope (DEC-009).
- Application-owned agents.
- Syncing personal settings between nodes.
- Undo of an update.

### Non-Goals

- Changing a package for everyone through the app. The author edits the package files and commits.

### Preserved Behavior Boundary

- The package update pipeline and automatic updates (209/210).
- Launch precedence.
- Definition IDs and the duplicate rules.
- Folder watching and definition reloads.

### Prerequisites

None known.

### Review Authority

Standard: blocking findings cite these IDs; new behavior is a Requirement Gap for the user.

## Requirements

| ID | Requirement | Behaviors | Stage |
| --- | --- | --- | --- |
| REQ-001 | Each node keeps the user's personal settings for definitions from registered packages (GitHub and local) in one file, exactly as `personal-settings-file-contract.md` §2–§4 defines. | BEH-002 | 1 |
| REQ-002 | Every read of an agent, Team or Org definition from a package returns the effective values of contract §5 (tools, skills, avatar, runtime/model). This includes lists, details, editing, run start, Team and Org member resolution and delegated copies. | BEH-002..004 | 1 |
| REQ-003 | In the app, changing tools, skills, avatar or runtime/model of a package definition writes the personal settings file (contract §6) and never the package files. | BEH-002..004 | 1 |
| REQ-004 | The editor shows, for each of the four settings, whether it is personal, and offers "Reset to the package's setting" (for built-in agents: "Reset to the built-in setting"), which removes that personal field. | BEH-002 | 1 |
| REQ-005 | A package update or reinstall never changes the personal settings file. | BEH-001 | 1 |
| REQ-006 | At every GitHub package update (click or automatic), before replacing the folder: download the installed revision; capture edits of the four settings into personal settings (contract §7.2); back up every file that differs from the installed revision (contract §7.3; the latest 5 backups per package are kept). If the installed revision cannot be downloaded, the update stops and nothing changes. | BEH-001 | 1 |
| REQ-007 | The texts that warn about local changes (the automatic-update switch and its confirmation, autobyteus-210) say that personal tools, skills, avatar and runtime/model are kept, that other local changes are replaced, and that a backup is kept. | BEH-001 | 1 |
| REQ-008 | Saving other fields of a package definition writes only the changed fields; untouched files, key order, unknown keys and trailing newlines stay as they were. | BEH-005 | 2 |
| REQ-009 | All new user-visible text in English and Simplified Chinese. | — | 1, 2 |

## Acceptance Criteria

| ID | Requirements | Check | Expected |
| --- | --- | --- | --- |
| AC-001 | REQ-001, 003 | Add an MCP tool to an agent of a local package (e.g. a test copy of `autobyteus-agents`) in the app | `personal-settings.json` gets `toolsAdded`; `git status` of the package shows no change; the agent's runs have the tool |
| AC-002 | REQ-002, 005, 006 | Isolated instance, GitHub package installed at an older revision; add a tool, remove a tool, enable a skill, set avatar and runtime/model; update to the latest revision (by click and automatically) | All five kept; the package's new tools and content present; the personal settings file unchanged by the update |
| AC-003 | REQ-006 | The same, but the edits were made inside the package files (as before this change) | Captured into personal settings; the old files are in `backups/<install key>/<time>/`; the result equals AC-002 |
| AC-004 | REQ-006 | The installed revision cannot be downloaded | The update stops, nothing changes, the automatic update reports failure |
| AC-005 | REQ-004 | Reset one personal setting | That field is removed; the package's value shows again |
| AC-006 | REQ-002 | A Team or Org whose member agents have personal tools; start a run, and a delegated copy | Members run with the effective tools |
| AC-007 | REQ-001 | An unreadable or wrongly shaped `personal-settings.json` | Definitions load with package values; a warning is logged; the file is not deleted |
| AC-008 | REQ-007, 009 | Read the automatic-update texts in en and zh-CN | They state what is kept, what is replaced, and the backup |
| AC-009 | REQ-008 | Save a description change on an agent of a local package | Only that field changes in the files (`git diff`) |

## Decisions

| ID | Decision | Owner | Status |
| --- | --- | --- | --- |
| DEC-001 | The personal settings file (contract), not a merge inside package files; the user's reason: clean commits (2026-11-06). Supersedes the SR-002 "simple merge" | User | Decided |
| DEC-002 | Tools and skills: additions and removals | Solution Designer, user approved (Q3) | Decided |
| DEC-003 | Other edits of a GitHub package (instructions, skill content) are replaced by updates, with a backup | User (2026-10-24 direction) | Decided |
| DEC-004 | Local packages also use personal settings for the four settings; the author changes the package by editing files (Q2) | User | Decided |
| DEC-005 | Capture at every GitHub update with backups; no separate one-time step (Q4) | User | Decided |
| DEC-006 | Staging: stage 1 = UC-001..005 (personal settings and update capture), merged and released as a beta first; stage 2 = UC-006 (clean writes) | Solution Designer (the Project Task Manager's direction) | Decided |
| DEC-007 | Avatars already in package files remain the package's value; a personal avatar replaces it | Solution Designer | Decided |
| DEC-008 | Backups: the latest 5 per package | Solution Designer | Decided |
| DEC-009 | Built-in agents use personal settings like package agents: their files are replaced at every server start, and personal settings are applied on top when read (Q5) | User, 2026-11-09 ("they are actually also agents … treat them like other agent") | Decided |

## Traceability

| Requirement | Use cases | ACs |
| --- | --- | --- |
| REQ-001 | UC-001..003 | AC-001, AC-007 |
| REQ-002 | UC-001..003 | AC-002, AC-006 |
| REQ-003 | UC-001..003 | AC-001 |
| REQ-004 | UC-005 | AC-005 |
| REQ-005 | UC-004 | AC-002 |
| REQ-006 | UC-004 | AC-002..004 |
| REQ-007 | UC-004 | AC-008 |
| REQ-008 | UC-006 | AC-009 |
| REQ-009 | all | AC-008 |

## Readiness

- Content ready: `Yes`. Approval recorded: `Yes` (the user, SR-003 and SR-004; SR-006 wording by the Solution Designer, reported to the user). Ready for architecture design: `Yes` (stage 1 first).
