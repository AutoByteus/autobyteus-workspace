# Requirements Document: remove-skill-improvement

## Document Status

- Status: `Approved`
- Current solution revision ID: SR-004
- Package identifier: `remove-skill-improvement`
- Request / ticket: Project Task autobyteus-205
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), on the user's decision of 2026-10-20
- Requirements owner: Solution Designer
- Date: 2026-10-20
- Approved by and reference: `User` for DEC-001, 2026-10-20 in the Solution Designer conversation: "regarding the old data for self-improvements, let's just remove them … it was really bad user experience". The rest is approved by the Solution Designer within the direction, with the user informed in the same conversation (Work Journal kept, DEC-005).
- Behavior-defining supplements: `release-notes.md` (draft)

## Problem And Desired Outcome

- Problem: skill improvement was built too early and is unused. It adds a hidden helper-run mechanism and a direct-message grant mechanism, both used only by this feature, and it blocks a cleanup left by autobyteus-197.
- Desired outcome: the feature and everything only it uses are gone from server, web, docs and tests. Other features work as before, and the app starts normally with old data present and with a fresh data folder. The user's data is changed only as he approves (DEC-001).

## Behavior

| BEH | Current | Desired | Preserved |
| --- | --- | --- | --- |
| BEH-001 | Settings toggle card | Gone | Other Server Settings cards |
| BEH-002 | Composer "Improve skills" CTA; improver helper runs | Gone | Agent and team composers otherwise unchanged |
| BEH-003 | Temporary message grant for the improver | Gone (mechanism removed) | `send_message_to` between runs, unchanged |
| BEH-004 | Improver bootstrapped as a built-in; two predefined settings | No longer bootstrapped or predefined | Other built-ins (the default chat agent) |
| BEH-005 | The improver is hidden from `@` mentions; its definition and runs are on disk | Its definition, runs and records are deleted once at upgrade (DEC-001 C) | Work Journal, memory views, run history of other runs |

## Scope Guardrail

### In-Scope Use Cases

| UC | Use case |
| --- | --- |
| UC-001 | Remove the feature from server, web, docs and tests, including code that becomes dead because of it (grants, helper-run launch purpose, built-in registration, settings) |
| UC-002 | Startup with old feature data present, and with a fresh data folder |
| UC-003 | One-time removal of the feature's data on every install (DEC-001 C) |
| UC-004 | Release-notes text for the next release |

### Out Of Scope

- Any new self-improvement or memory feature (autobyteus-233 decides that later).
- The Skill Self-Evolver agent package (an agent, not server code).
- Changing how the memory targets or the location services resolve a task copy's definition (FU-001).
- Released migrations that mention the feature's paths (frozen history).
- A release (none unless the user asks).

### Non-Goals

- Rewriting the Work Journal or other shared code beyond removing what only this feature used.

### Preserved Behavior Boundary

- Work Journal, agent memory views and memory location, `send_message_to`, agent runs and run history, Server Settings, built-in default chat agent: all unchanged, with their tests passing.

### Prerequisites

None.

## Requirements

| REQ | Requirement | BEH | Source |
| --- | --- | --- | --- |
| REQ-001 | No skill-improvement UI, API (GraphQL), settings, built-in agent registration, services, tests or docs remain. No compatibility shim | BEH-001, 002, 004 | Task; DESIGN.md |
| REQ-002 | Code that only this feature used is removed too: the direct-message grant mechanism and the `server_helper` launch purpose with its readers | BEH-003 | Core Principle 7; F-03, F-04 |
| REQ-003 | Shared code other features use keeps working, with its tests | Preserved | Task |
| REQ-004 | The server and the app start and work on an install with the old feature data, and on a fresh data folder. Nothing in the old data, nor a failed removal step, blocks startup or other runs | — | Task; DESIGN rule 7 |
| REQ-005 | At the first start, a one-time step removes the feature's data, including leftovers from its earlier name "self evolution" (SR-003, A-01..A-03): the records under `memory/skill_improvement/` and `memory/self_evolution/`; the per-run session folders `skill_improvement/` (`improver_session.json`) and `self_evolution/` (`evolver_session.json`); the settings `ENABLE_SKILL_IMPROVEMENT`, `AUTOBYTEUS_RETROSPECTIVE_SKILL_IMPROVER_AGENT_DEFINITION_ID` and `ENABLE_SELF_EVOLUTION`; the built-in improver's definition `agents/autobyteus-retrospective-skill-improver/`; and every helper run of the feature (runs of that definition, runs marked `server_helper`, runs the records name as improver or evolver runs), with their history entries. The "Skill Self-Evolver" definition (`agents/autobyteus-skill-evolver/`) is kept, as the Task says. Nothing else is touched. Any other run, agent or setting stays byte-identical. The user backs up first; tests never run on his data or a copy of it | — | DEC-001 (user); TESTING.md |
| REQ-006 | The next release's notes say that the feature is gone, that its records, helper agent, the agent's runs and its two settings are deleted at the first start, and to back up first | — | Task; DEC-001 |

## Acceptance Criteria

| AC | REQ | Expected outcome | Verification |
| --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-002 | A grep for the feature's names, `self_evolution`, `server_helper`, `launchPurpose`, direct-message grants and `ENABLE_SELF_EVOLUTION` in current server and web code and docs finds nothing outside the allowed locations: the new removal migration and its tests (frozen names), `retiredSettingNames` in `app-config-setting-policy.ts` and its tests, released migrations, and `tickets/`. Typecheck and lint pass | grep, typecheck |
| AC-002 | REQ-003 | Server and web unit and integration suites pass, including Work Journal, memory, messaging and settings | test suites |
| AC-003 | REQ-004 | On a synthesized data folder shaped like the user's (records, helper definition, 3 helper runs with and without `launchPurpose`, `.env` keys, plus unrelated runs and settings), the server starts and other runs list and open. Same on a fresh folder. A removal step that cannot finish does not block startup | startup test |
| AC-004 | REQ-005 | After the first start the feature's records, the two settings keys, the improver's definition and its runs (folders and history entries) are gone; unrelated runs, agents, history entries and `.env` lines are byte-identical; a second start changes nothing | migration test on synthesized data; the user's check after backup |
| AC-005 | REQ-006 | `release-notes.md` exists with the approved text | review |

## Decisions

| DEC | Question | Reasoning And Recommendation | Owner | Status |
| --- | --- | --- | --- | --- |
| DEC-001 | What happens to the old feature data? **Decided by the user: C, remove it all.** On your machine: 4 improvement records (`memory/skill_improvement/`, 20 KB, nothing will read them), the helper agent "Retrospective Skill Improver" (`agents/autobyteus-retrospective-skill-improver/`), its 3 runs (about 1.9 MB, already visible in history), and the 2 settings in `.env` (they would show as custom settings in Settings) | **(A) Leave everything (recommended).** The app ignores the records. The helper agent and its runs stay as ordinary items you can use or delete in the app. The two settings show as custom settings you can delete in Settings. No migration, no data code, nothing to undo. The only leftover nobody can see in the app is the 20 KB records folder; you can delete `memory/skill_improvement/` yourself at any time. **(B)** A registered startup migration deletes the records folder and the two `.env` keys on every install, and leaves the helper agent and its runs (visible, user-owned). Cleaner data, but a migration that deletes data, to be retired later. **(C)** Like B, plus deleting the helper agent and its 3 runs. Most complete, but it deletes things users can see and may want | User | Decided (C) |
| DEC-002 | The grant mechanism and `launchPurpose` become dead | Remove them in this ticket: this change makes them dead (Core Principle 7). Old `server_helper` metadata is simply ignored on read. No user data has it (F-09); on other installs such runs become ordinary runs | Solution Designer | Decided |
| DEC-003 | autobyteus-197's F-1 (`configuredPlacement` filled by address for copies) | Skill improvement's use goes away with the feature. The remaining use, the memory target's definition id, changes how the Memory page attributes copies: a separate decision, recorded as FU-001 | Solution Designer | Decided |
| DEC-004 | The improver's id in the web's built-in list | Remove it: its definition is deleted (DEC-001 C) | Solution Designer | Decided |
| DEC-005 | The Work Journal (the user asked whether Skill Improvement introduced it) | It was built for the memory program, with Skill Improvement as its first reader; every live run keeps one, and the Task's replacement idea (an agent reads Work Journals and asks the Agent Package Creator to update a skill) depends on it. Keep it; its future belongs to the memory investigation (autobyteus-233) | Solution Designer (user informed) | Decided |

## Readiness Check

- Content ready: `Yes`. Approved (SR-002).
