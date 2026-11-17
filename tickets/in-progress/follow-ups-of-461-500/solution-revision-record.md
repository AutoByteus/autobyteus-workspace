# Solution Revision Record: follow-ups-of-461-500

| SR | Date | Kind | Summary | Status after |
| --- | --- | --- | --- | --- |
| SR-006 | 2026-11-17 | Requirements and design (scope reduced by the user) | The user dropped the code-only "task execution" → "delegated run" rename: REQ-003 dropped, all of FU-007 is FU-500-01; the design's N4 rows removed | Approved; design `Ready` |
| SR-005 | 2026-11-17 | Design | Delivery 1's design: FU-020 migration with backup and one late-predecessor follow-up; one stream attach; explicit composition for silent lookups and optional collaborators; team-only total; naming rules N1 … N6; refusal style; FU-021 cause reproduced; FU-035 reproduction step | Design `Ready`, Large / High |
| SR-004 | 2026-11-17 | Requirements | D-5 decided by the user: the Task record's stored names stay (no migration); the code-only rename "task execution" → "delegated run" is done this round; the stored-name part becomes a follow-up | Approved |
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

### SR-004

- **Trigger:** the user, on whether FU-007's renaming is needed this round. The Solution Designer recommended no stored-name rename (no bug, mapping confined to one module, a second migration for a name) and the code-only rename now; the user: "Yeah", adding that the attachment work (FU-020) is needed because it is a leftover that needs refactoring.
- **Change:** D-5 and REQ-003 rewritten; AC-001 keeps the schema module's one documented mapping. FU-007's stored-name part recorded in `follow-ups.md`.
- **Approval:** D-5 by the user. Requirements `Approved` at SR-004.
- **Next:** the design of delivery 1.

### SR-005

- **Trigger:** requirements approved at SR-004.
- **Design:** `design-spec.md`. Decisions the Solution Designer made within the direction:
  - "root" stays where it means a run at the top of its own membership tree (N1);
  - the team total serves team runs only, since no client asks for an org's;
  - process getters that throw stay (FU-500-02);
  - text mentions, closed journals, the search index, logs and the `imports/` mirror are inert residue.
- **Evidence:** FU-021 reproduced under CPU contention (investigation notes). FU-035 needs a live run, which is the implementation's step 0.
- **Classification:** `Large`, `High`.
- **Next:** architecture review.

### SR-006

- **Trigger:** the user, on the scope summary: "i guess we could drop this as well" (the code-only rename of the Task record's names).
- **Change:** REQ-003 dropped; D-5 now "no change this round"; AC-001 no longer covers `TaskExecution…`; the design's N4 rename rows and change-sequence step removed; FU-500-01 covers stored and code names.
- **Approval:** the user. **Classification:** unchanged (`Large`, `High`: the migration, the route removal, the composition changes).
- **Next:** the architecture reviewer is told of the reduced scope.

### Review of SR-005 / SR-006

- ARCH-REV-001: **Pass** (`design-review-report.md`, `architecture-review-revision-record.md`). The classification stays `Large` / `High`. The reviewer sent the package to the implementation engineer.
- The reviewer settled three "to verify" items:
  - both hosts initialize `ProjectTaskService` through `composeCollaboration`;
  - `delegated_copy_own_file_complete_v1` is classed `none`;
  - `getAgentRunCommandCoordinator()` is called from `agent-stream-handler.ts:86, 502`.
- Note to the implementation: M-1 matches exact folder depths and never descends into `agents/{run}/collaboration/…`.
