# Handoff Summary — stopped-run-edit-root-check (FU-008 of autobyteus-348)

## Ticket
- `task_size=Small`, `architectural_risk=Low`; direct route (reviews Not Applicable). API/E2E Pass (94%). Archived at `tickets/done/stopped-run-edit-root-check/`.

## What Changed
- Fix: after a host Agent run crashed while its collaboration root stayed registered, a saved edit of the host (a model or runtime change) did not reach that root, so copies it delegated next carried the old launch. `AgentRunService.updateStoppedSelection` now calls `refreshInheritedLaunch` on the root (manager, then root `setInheritedLaunch`) after an `UPDATED` result; a failed follow is logged and never fails the edit. The edit of an offline host with a registered root is allowed; a live host is still refused (`RUN_ACTIVE`).
- Tests: unit and integration tests; one gated built-server case (`tests/e2e/runtime/stopped-run-edit-root-built-server.e2e.test.ts`) with a scripted Antigravity host and a real `SIGKILL` of the host process, mutation-checked three ways.
- Docs: `standalone_agent_run_root.md`, `run_history.md`.

## Integration
- Merged `origin/personal` @ `dc4e0880ac` (RELEASE.md and a delivery record only), no conflicts; typecheck, build, 1733 unit/integration tests and 6 built-server tests pass.

## Verification
- From the evidence; no user check. Every critical AC is proven (API/E2E: the saved model reaches copy two, the pending switch and marker at the host's next input, refusal while live and edit allowed after the kill; X-A..X-C mutations fail the case). AC-003 (edit while the root is loading) is unit-covered only, because a built server cannot stage it.

## Release
- `No release`: not requested; an internal behavior fix. A release is available on request.

## For The Solution Designer
- FU-1 (the root file is at the 500-line guardrail; split before its next change). FU-004 and FU-001 of autobyteus-316 are Task autobyteus-396; FU-005 is covered (notes F-08).
- Residual: AC-003 unit-only; runtimes scripted.
