# Solution Revision Record: follow-ups-of-461-500

| SR | Date | Kind | Summary | Status after |
| --- | --- | --- | --- | --- |
| SR-003 | 2026-11-17 | Requirements (from design investigation) | FU-020's evidence (231 structured links, all in the child's own folder; beta.7 writes none; 111 likely broken today); D-5 reopened: the stored `agentRun` holds team runs, so the approved code-takes-stored-names rename moves a wrong meaning into the code | D-5 `Ready for Approval` (needs the user); the rest stays `Approved` |
| SR-002 | 2026-11-17 | Requirements | D-8 decided by the user, (b): clean code and data for attachment links, with a migration and a backup; requirements approved | Approved |
| SR-001 | 2026-11-17 | Requirements | Delivery 1's baseline (groups 1, 3, 4, 5, 6); the staging (D-2); the decisions D-3 … D-7, D-9; the user's FU-027 decision (D-1: guards only); D-8 (FU-020) put to the user | Ready for Approval |

### SR-001

- **Trigger:** Task `autobyteus-500`, from `/project_task_manager`, at the founder's word.
- **Investigation:** `investigation-notes.md`. The founder's data was counted read-only (D-8's 425 links).
- **Decisions:** D-1 by the user (option 1); D-2 … D-7 and D-9 by the Solution Designer within the direction; D-8 `Needs user`.
- **Next:** the user's answer on D-8, then approval and design.

### SR-002

- **Trigger:** the user's answer on D-8: "the code and the data both should be clean … the data migration guideline mentioned this."
- **Change:** REQ-011 and AC-008 now require a conversion of the 425 stored links, with a backup first.
- **Approval:** D-1 and D-8 by the user; the rest by the Solution Designer within the direction, user informed. Requirements `Approved`.
- **Next:** architecture investigation and design for delivery 1.


### SR-003

- **Trigger:** the architecture investigation of delivery 1 (`investigation-notes.md`, "Architecture investigation").
- **Evidence-only clarifications (no renewed approval):** D-8's note corrected: beta.7 no longer writes host-scoped links. The 425 counted earlier include text mentions; the migration's items are the 231 structured links in `media.images[]`, every one in the child's own folder with its file present.
- **Requirement change (needs the user):** D-5. Stored `agentRun` names a team run too, so renaming the code to the stored names (SR-002) gives a team run the code name `agentRun`. Recommended: clean names in code and data (`delegated_runs.json`, `delegatedRuns`, `run`), by a migration with a backup first, in the same release as FU-020's.
- **Design impact:** REQ-003's design waits for the user's answer; every other part of delivery 1 proceeds.
