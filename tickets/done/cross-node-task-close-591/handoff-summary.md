# Handoff Summary — cross-node-task-close-591

## What Changed

Project Task `autobyteus-591`. When a Task closes (DONE or CANCELLED) on node A, the run it delegated to paired node B stops (a Team whole, a mid-turn member included), unless another open Task names it; B lists it no more and A's Task page shows it offline. An unreachable B gets the stop as an owed notice, delivered when B returns, after either node restarts. A third node cannot stop it. The assigner's message continues a closed remote run, as locally (SR-010, DEC-007); a Task reopen alone still stops it.

## Classification And Route

- `task_size` `Medium`, `architectural_risk` `High`, route `Reviewed`.
- Architecture review (`design-review-report.md`); code review CRR-001 … CRR-006 (CRR-002 Requirement Gap → SR-010; merge review CRR-005).
- API/E2E: API-REV-001 … API-REV-003, final 95%.

## Code State

- Branch `codex/cross-node-task-close-591`; base `origin/personal` `6533d7be04` (v1.5.14-beta.6, 22, 583, …) merged by IR-003 as `037e6bec5c`. No migration on either side. No build input changed by this ticket.

## Verification

From the evidence: AC-001 … AC-007 proven on two built nodes (two-server suite 55/55 on the merged state; MSP-93 desktop and phone). AC-002's real runtime as the mid-turn member: not tested; AC-002's verification is a two-node E2E, met with a real scripted process held mid-turn; recorded as residual risk. No user check.

## Release

No release (not requested). `release-notes.md` is ready, with "update paired nodes together".

## Residual Risk And Follow-ups

- A real runtime as the mid-turn team member (not tested).
- FU-591-01 (base-side: the contract fixture lacks 565's `counterpart`; stories stop at S18 / U9).
- Both nodes must run the same release: an older peer answers 404 and the notice stays owed (logged once).
