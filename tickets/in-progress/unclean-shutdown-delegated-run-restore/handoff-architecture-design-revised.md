# Handoff — Architecture Design Complete (revised, SR-002)

- Package: `unclean-shutdown-delegated-run-restore`, solution revision `SR-002`
- Result: `Architecture Design Complete` (revised after ARCH-REV-001 Fail) — `task_size: Medium`, `architectural_risk: High` (unchanged)
- Route applied (get_handoff_rules): High risk → `/software_engineering_team/architecture_reviewer` (re-review).
- Requested by: `/project_task_manager`, Project Task `project_task_08d76577-e89b-484d-9f38-cc1ed94ef95e`.
- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/unclean-shutdown-delegated-run-restore/tickets/in-progress/unclean-shutdown-delegated-run-restore/`
- Worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/unclean-shutdown-delegated-run-restore`, `codex/unclean-shutdown-delegated-run-restore`; base `origin/personal` @ `f171032e88`; documents uncommitted.
- Original request, findings, constraints: unchanged; see `handoff-architecture-design-complete.md` in this folder.

## Resolution of ARCH-REV-001

| Finding | Resolution | Where |
| --- | --- | --- |
| AR-001 (High) | Zero bytes count as absent only as whole lines (with whitespace) or as leading/trailing runs of a line. A line with a `0x00` left between other bytes is never a complete record: the damaged end if it is the last non-empty line, otherwise `JsonlLogDamagedError` (file + line). `completeByteLength` ends right after the last complete record's line; empty/whitespace/zero-only lines after it are cut with the damaged end; lines before it are never rewritten. | requirements REQ-001, DEC-004, External Contracts, AC-002 example; design Terminology, bounded spine, examples (new "Interior zeros" row), change-sequence step 1 tests, Key Tradeoffs |
| AR-002 (Low) | The end check is kept per file path within a store instance (raw traces, episodic, semantic separately); `recordSystemInstructionSupply` shares the raw-trace path's state; implemented as a per-instance set of verified paths. | design DS-002 spine and narrative, Ownership Map, step 2, Guidance |
| R-1 | New "Refusal reasons" table: every `indeterminate` cause has a plain-words reason (damaged line, unknown memory folder, damaged index, missing archive file, read error with code). | design Interface Boundary Mapping + table |

## Approval basis

REQ-001/DEC-004 are narrowed (safer, no acceptance outcome changed). Approved by the Solution Designer within the Task's direction; the user is informed. DEC-008 (repairing his real file now) is still `Needs user`, outside the basis.

## Expected output

Re-review limited to the sections above.

## Attached

This file, `requirements-doc.md`, `investigation-notes.md`, `solution-revision-record.md`, `design-spec.md`.
