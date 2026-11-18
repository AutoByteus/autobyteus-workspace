# Handoff SR-003 — Architecture Design Complete, revised for ARCH-REV-001 (memory-sync-large-files)

- Package: `memory-sync-large-files`; Project Task `autobyteus-workspace-7` (Project `project_3165230d-b602-4efc-ac42-fb61a03f1ed5`)
- From: Solution Designer (run `solution_designer_701e101b5b534002b91d94fca7efaad7`); requested by `/project_task_manager`
- Classification: `Architecture Design Complete`, `task_size: Large`, `architectural_risk: High` (unchanged)
- Status: requirements `Approved` (SR-003, clarification within the direction, user informed 2026-11-15); design `Ready` (SR-003); nothing implemented.
- Worktree: `/Users/normy/autobyteus-org/autobyteus-task-worktrees/memory-sync-large-files`, branch `task/memory-sync-large-files`; base `origin/personal` @ `3d738de6e`; finalization target `origin/personal`; no release.
- Ticket folder: `/Users/normy/autobyteus-org/autobyteus-task-worktrees/memory-sync-large-files/tickets/in-progress/memory-sync-large-files/`
- Previous round: `handoff-sr-002.md` → ARCH-REV-001 Fail (`design-review-report.md`).

## RELEASE ORDER

Release before or with `autobyteus-workspace-6` (unchanged; see `handoff-sr-002.md`).

## What changed (design-spec.md "ARCH-REV-001 Resolution")

- **AR-001:** the import store groups staged operations by SHA-256. It verifies each content once and verifies every operation before any write, refusing the batch before writing if one cannot be written. `placeStagedFile` puts one content at every target (copy to all but the last, rename to the last). A split re-send calls the stager again.
- **AR-002:** the run trigger is `manual` or `background`, passed as data to the change planner and `isDue`. A Sync now during a run waits for it, then starts one manual run; a background start joins the running run.
- **AR-003:** `sweepStale()` covers every source folder, under each source's manifest lock. It is called by the ingestion service on every hub call and by a new startup loader once Memory Sync is ready.
- **AR-004:** the stager hashes the received prefix locally and reads exactly `size` bytes; the resume example is fixed.
- **AR-005:** a lost connection is run-level and the next run resumes. Requirements REQ-005, SCN-004, DEC-006 and AC-005 are aligned.
- **AR-006:** each batch's outcomes are recorded right after its send, as today.
- **R-AR-1:** a 4 GiB staged-bytes budget per batch. The order is stated: inside the lock, batchId check, verify, write, manifest. `requireMemorySyncReady()` guards the staged store.

## Documents

`requirements-doc.md`, `investigation-notes.md`, `design-spec.md`, `solution-revision-record.md` (SR-003), `follow-ups.md`; review: `design-review-report.md`, `architecture-review-revision-record.md`.

## Expected next action

ARCH-REV-002 by the architecture reviewer.

## Route record

- Handoff rules checked 2026-11-15: "Architecture Design Complete with task_size=Large or architectural_risk=High" → `/software_engineering_team/architecture_reviewer`.
- Sent with `send_message_to` to `/software_engineering_team/architecture_reviewer` (run `architecture_reviewer_60670f8f6eb84995b4139723af54d0fe`) on 2026-11-15: delivered.
