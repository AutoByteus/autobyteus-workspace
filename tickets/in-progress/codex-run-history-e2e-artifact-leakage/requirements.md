# Requirements

- Ticket: `codex-run-history-e2e-artifact-leakage`
- Status: `Design-ready`
- Last Updated: `2026-02-28`

## Goal / Problem Statement

Prevent Codex live E2E tests from polluting developer-visible run-history workspace groups (for example `codex-continue-workspace-e2e-*`) and provide a safe remediation path for already-polluted historical entries.

## Scope Triage

- Final Triage: `Medium`
- Rationale: requires coordinated changes across live E2E runtime test harness + run-history data hygiene tooling; impacts user-visible workspace history behavior indirectly.

## In-Scope Use Cases

- `UC-001` Developer runs Codex live E2E tests and later opens the app workspace sidebar.
  - Expected: no new persistent `codex-continue-workspace-e2e-*` workspace groups appear in normal history data.
- `UC-002` Existing polluted run-history entries need cleanup without deleting legitimate user runs.
  - Expected: cleanup targets only known E2E artifact prefixes.
- `UC-003` Regression protection must ensure prevention behavior stays enforced.
  - Expected: automated tests verify isolated persistence root and/or explicit cleanup behavior.

## Out of Scope

- Broad redesign of run-history domain model.
- Automatic deletion of arbitrary historical user data.
- Frontend-only filtering hacks that hide data while leaving persistent pollution unresolved.

## Functional Requirements

- `REQ-001` Codex live E2E runtime suites must run against isolated app data/memory roots, separate from default developer runtime memory.
- `REQ-002` Test teardown must avoid leaving run-history artifacts in default persistence used by normal app runs.
- `REQ-003` Provide explicit remediation for existing known artifact entries (`codex-continue-workspace-e2e-*`, and related codex runtime E2E prefixes if present).
- `REQ-004` Document cleanup operation in a ticket artifact and/or executable test-safe utility path.

## Acceptance Criteria

- `AC-001` Root cause evidence is documented with file references proving source of `codex-continue-workspace-e2e-*` values.
- `AC-002` After running targeted Codex E2E tests, default local run-history index does not receive new entries with E2E workspace prefixes.
- `AC-003` Existing polluted entries can be removed via deterministic cleanup command/script that only targets approved test prefixes.
- `AC-004` Automated regression tests for changed code paths pass.
- `AC-005` Backend and frontend test suites remain green for affected areas.

## Constraints / Dependencies

- Must preserve legitimate run-history persistence for real user runs.
- Cleanup must be prefix-scoped and non-destructive beyond known E2E artifacts.
- Live Codex E2E remains gated by `RUN_CODEX_E2E=1` and local Codex availability.

## Assumptions

- Pollution observed in UI came from historical local test runs in shared memory dir.
- Prefix-based targeting is sufficient for already-observed artifact classes.

## Risks

- If test harness isolation is incomplete, pollution may continue via another suite.
- If cleanup prefix list is too narrow, old artifacts may remain.
- If cleanup prefix list is too broad, legitimate data could be removed.

## Requirement Coverage Map

- `REQ-001` -> `UC-001`, `AC-002`, `AC-004`, `AC-005`
- `REQ-002` -> `UC-001`, `AC-002`, `AC-004`
- `REQ-003` -> `UC-002`, `AC-003`, `AC-004`
- `REQ-004` -> `UC-002`, `UC-003`, `AC-003`, `AC-004`

## Acceptance Criteria -> Stage 7 Scenario Coverage Map

- `AC-001` -> Stage 7 Scenario `S7-001` (investigation reproducibility + source mapping evidence)
- `AC-002` -> Stage 7 Scenario `S7-002` (run codex E2E in isolated profile, verify no writes in default index)
- `AC-003` -> Stage 7 Scenario `S7-003` (execute cleanup, verify targeted entries removed and non-target entries retained)
- `AC-004` -> Stage 7 Scenario `S7-004` (unit/integration tests for cleanup/isolation helpers)
- `AC-005` -> Stage 7 Scenario `S7-005` (affected frontend/backend tests pass)
