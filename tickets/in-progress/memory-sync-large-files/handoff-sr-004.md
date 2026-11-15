# Handoff SR-004 — Architecture Design Complete, revised for ARCH-REV-002 (memory-sync-large-files)

- Package: `memory-sync-large-files`; Project Task `autobyteus-workspace-7`; requested by `/project_task_manager`
- From: Solution Designer (run `solution_designer_701e101b5b534002b91d94fca7efaad7`)
- Classification: `Architecture Design Complete`, `task_size: Large`, `architectural_risk: High` (unchanged)
- Status: requirements `Approved` (SR-003, unchanged); design `Ready` (SR-004); nothing implemented.
- Worktree: `/Users/normy/autobyteus-org/autobyteus-task-worktrees/memory-sync-large-files`, branch `task/memory-sync-large-files`; base `origin/personal` @ `3d738de6e`; finalization target `origin/personal`; no release.
- Ticket folder: `/Users/normy/autobyteus-org/autobyteus-task-worktrees/memory-sync-large-files/tickets/in-progress/memory-sync-large-files/`
- Previous rounds: `handoff-sr-002.md` (ARCH-REV-001 Fail), `handoff-sr-003.md` (ARCH-REV-002 Fail).

## RELEASE ORDER

Release before or with `autobyteus-workspace-6` (unchanged).

## What changed (design-spec.md, resolution table rows AR-007, AR-008)

- **AR-007:** `placeStagedFile` copies to a `.tmp` sibling of each extra target and renames it into place; the last target gets the staged file by rename. No partial copy is ever visible.
- **AR-008:** the sweep is off the request path. Its single cadence owner is `MemoryHubIngestionService.requestStagingSweep()`, which starts `sweepStale()` in the background at most once per hour (`MEMORY_SYNC_STAGING_SWEEP_INTERVAL_MS`), never two at once, and is not awaited. Every ingestion call and the startup loader call it. The per-source manifest lock stays inside the sweep, taken one folder at a time. New tests: a piece request completes while a sweep waits on another source's lock; no second sweep within the hour; no partial target is visible during placement.

## Documents

`requirements-doc.md`, `investigation-notes.md`, `design-spec.md`, `solution-revision-record.md` (SR-004), `follow-ups.md`; review: `design-review-report.md`, `architecture-review-revision-record.md`.

## Expected next action

ARCH-REV-003 by the architecture reviewer.

## Route record

- Handoff rules checked 2026-11-15: "Architecture Design Complete with task_size=Large or architectural_risk=High" → `/software_engineering_team/architecture_reviewer`.
