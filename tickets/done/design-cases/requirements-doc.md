# Requirements Document — design-cases (autobyteus-293)

- Status: `Approved` by the Solution Designer within the Task's direction (no `Needs user` decision); the user asked for it ("Let's work on updates of the documents first … it's a very quick task", 2026-10-24).
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), Task autobyteus-293.

## Problem And Outcome

The software engineering team package moves to general case studies (autobyteus-agents-54) and will no longer carry this project's cases. The project needs its own design cases file, named from the root `DESIGN.md`, so no case and no provenance is lost.

## Requirements

| ID | Requirement |
| --- | --- |
| REQ-1 | `docs/design-cases.md` holds the project's design cases 1 … 6 as the package carried them, every ticket's "again in" entry included, plus Case 7 "One Word, Two Meanings" (191, 261; completed by autobyteus-290). |
| REQ-2 | The root `DESIGN.md` names the file in "Project-specific design documents", with what it records and who adds to it. |
| REQ-3 | No `DESIGN-*.md` file in the root (the package reads those as design rules). |

## Acceptance Criteria

| ID | Check |
| --- | --- |
| AC-1 | The file has Cases 1 … 7 with their tickets; its text matches the package's cases at `autobyteus-agents` `56daf38` (plus Case 7) |
| AC-2 | `DESIGN.md` links it; the link resolves from a clean clone |

## Scope Guardrail

Docs only; no code. Case 7's final fixes are added by autobyteus-290. `DESIGN.md`'s rule 10 change is in autobyteus-290 (different lines; both merge cleanly).
