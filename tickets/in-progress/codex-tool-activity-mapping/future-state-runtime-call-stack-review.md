# Future-State Runtime Call Stack Review

## Scope
- Ticket: `codex-tool-activity-mapping`
- Requirements: `tickets/in-progress/codex-tool-activity-mapping/requirements.md`
- Design: `tickets/in-progress/codex-tool-activity-mapping/proposed-design.md` (`v3`)
- Call stack: `tickets/in-progress/codex-tool-activity-mapping/future-state-runtime-call-stack.md`

## Review Criteria
- Requirement coverage completeness (`R-001..R-007`)
- Separation of concerns (runtime-specific mapping in backend, runtime-agnostic frontend handlers)
- Event-order robustness (missing/out-of-order segment starts)
- Canonical lifecycle monotonicity and terminal-state correctness
- Testability and regression coverage per use case

## Round 1
- Round status: `Candidate Go`
- Result summary:
  - Requirement coverage is complete across UC-001..UC-005.
  - Architecture remains cleanly separated:
    - backend adapter owns codex item/method normalization,
    - frontend lifecycle handler owns canonical upsert/state transitions.
  - No blocking gaps found.
- Required write-backs: none

## Round 2
- Round status: `Go Confirmed`
- Result summary:
  - Re-checked with strict SoC and anti-mixing criteria.
  - No new blockers found and no required write-backs.
  - Stability rule satisfied (two consecutive clean rounds).
- Required write-backs: none

## Round 3
- Round status: `No-Go`
- Result summary:
  - Re-opened production symptom found: `edit_file` arguments can be empty (`path=""`, `patch=""`) while real change data exists in `item.changes[]`.
  - Existing call stack/design lacked explicit extraction precedence for nested file-change payloads.
  - This is blocking for reliable Activity/tool detail rendering.
- Required write-backs:
  - Updated `requirements.md`: add `R-006`/`AC-006`.
  - Updated `proposed-design.md` to `v2`: add `C-005` extraction design.
  - Updated `future-state-runtime-call-stack.md`: add `UC-006`.

## Round 4
- Round status: `Candidate Go`
- Result summary:
  - Re-reviewed updated artifacts with strict SoC criteria.
  - Backend-only runtime-specific extraction is cleanly isolated; frontend remains canonical and runtime-agnostic.
  - No additional blockers found.
- Required write-backs: none

## Round 5
- Round status: `Go Confirmed`
- Result summary:
  - Second consecutive clean round after write-backs.
  - Stability rule satisfied with `R-006` coverage confirmed.
- Required write-backs: none

## Round 6
- Round status: `No-Go`
- Result summary:
  - Re-opened production symptom found: `run_bash` Activity argument `command=""` while runtime command execution clearly occurred.
  - Existing design/call stack did not explicitly require command metadata hydration for segment start/end projection.
  - Blocking for tool argument fidelity in Activity pane.
- Required write-backs:
  - Updated `requirements.md`: add `R-007`/`AC-007`.
  - Updated `proposed-design.md` to `v3`: add command normalization/hydration change inventory.
  - Updated `future-state-runtime-call-stack.md`: add `UC-007`.

## Round 7
- Round status: `Go Confirmed`
- Result summary:
  - Re-reviewed updated artifacts with strict SoC criteria.
  - Command normalization stays backend-centric and frontend remains canonical (no runtime-specific UI logic).
  - Live Codex E2E coverage now includes explicit non-empty `run_bash.command` assertion.
- Required write-backs: none

## Final Gate Decision
- `Go Confirmed`

## Traceability
| Requirement | Use Cases Reviewed | Status |
| --- | --- | --- |
| R-001 | UC-001 | Covered |
| R-002 | UC-002 | Covered |
| R-003 | UC-002, UC-003, UC-004 | Covered |
| R-004 | UC-005 | Covered |
| R-005 | UC-001..UC-005 | Covered |
| R-006 | UC-006 | Covered |
| R-007 | UC-007 | Covered |
