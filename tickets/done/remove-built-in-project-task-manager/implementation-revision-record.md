# Implementation Revision Record

The current code and `implementation-handoff.md` remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture Reviewer / `design-review-report.md` / ARCH-REV-001 pass | N/A (REC-001 non-blocking, applied) | `Initial Baseline` | SR-001, SR-002, ARCH-REV-001 | Implemented; commit `62af418df` |

## Revision Entries

### IR-001 — Remove built-in Project Task Manager and add the one-time installed-copy cleanup

- Triggering role, report path, and round: Architecture Reviewer pass handoff, `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-built-in-project-task-manager/tickets/in-progress/remove-built-in-project-task-manager/design-review-report.md`, ARCH-REV-001
- Triggering finding IDs: N/A
- Classification: `Initial Baseline`
- Prior authoritative result: `N/A`
- Current authoritative result: Implementation complete. Local checks pass. Ready for code review.
- Related solution revision IDs: SR-001, SR-002
- Related architecture-review revision IDs: ARCH-REV-001
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline or implementation revision is recorded: The initial implementation of the approved design.
- Approved behavior or requirement IDs affected: REQ-001..REQ-008 / BEH-001..BEH-007 (BEH-004, BEH-005 preserved with no code change)
- Implementation delta:
  - Registry constant, row and template removed.
  - New `RemoveBuiltInProjectTaskManagerMigration` (`20261006_remove_built_in_project_task_manager`, required, `STARTUP_ONLY` per REC-001), registered last with the exact `<agentsDir>/autobyteus-project-task-manager` path.
  - Web mirror, spec and probe updated.
  - Retirement assertions added to the bootstrapper/templates tests and the dist smoke.
  - Node-locality E2E manager lookup removed.
  - Docs updated.
- Changed files or areas: See `implementation-handoff.md` → Key Files Or Areas (18 files in commit `62af418df`).
- Local validation and result:
  - Server unit plus new integration: 70 files, 581 tests pass.
  - `build:full` with the smoke: pass.
  - tsc: 0 non-preexisting errors.
  - `tests/e2e/projects`: 21/21 pass.
  - Web targeted: 57/57 pass.
  - Grep sweep: expected hits only.
- Next recipient or routing: Code Reviewer (per `get_handoff_rules`).
- Remaining limitations or risks:
  - AC-008 and entry-point-level startup checks are left to API/E2E.
  - The `typecheck` script fails on base with TS6059 (pre-existing).
