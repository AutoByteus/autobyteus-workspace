# Handoff: architecture review of autobyteus-500, combined package (SR-009)

- **From:** Solution Designer (run `solution_designer_65a93db823284ad5b4e87726a5b250a2`).
- **Classification:** Architecture Design Complete, combined `task_size=Large`, `architectural_risk=High`.
- **Branch:** `codex/follow-ups-of-461-500`. Implementation hasn't started: the user stopped it so both deliveries go as one package.

## What's new since ARCH-REV-001 (which passed delivery 1 at SR-005/SR-006)

1. **Delivery 2** (`design-spec.md`, section "Delivery 2", G-1 … G-4; requirements REQ-012 … REQ-015, AC-009 … AC-011):
   - **G-1:** the release script records the released migration order in a file in the release commit, and the order test reads that file (D-11).
   - **G-2:** a same-ID repair of `20260521_team_run_history_index_v2` keeps the exact rows of team runs whose folder exists (FU-029).
   - **G-3:** the probe's data now names its helper run (FU-033).
   - **G-4:** FU-028 is dropped as not a defect (D-10; evidence in `investigation-notes.md`, "Delivery 2 investigation").
2. **Delivery 1 naming additions (SR-008)**, from the implementation engineer's sizing (`design-spec.md`, Naming, "Added at SR-008"):
   - the full list of "copy" names;
   - `TASK_COPY_NOT_ASSIGNABLE` becomes `TASK_DELEGATED_RUN_NOT_ASSIGNABLE`;
   - the stored `copyAddress` / `copyKind` stay (FU-500-04);
   - the GraphQL argument `hostRunId` becomes `runId`;
   - `TaskExecutionHostIdentity` is kept.

## Scope decisions by the user since then

- SR-006: the Task record's code rename was dropped.
- SR-007: FU-032 was dropped.
- SR-009: D-10 was left to the Solution Designer.

## Files

All in the ticket folder: `requirements-doc.md`, `design-spec.md`, `investigation-notes.md`, `solution-revision-record.md` and `follow-ups.md`, plus your `design-review-report.md`.
