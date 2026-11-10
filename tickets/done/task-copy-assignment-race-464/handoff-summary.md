# Handoff Summary

## Summary Meta

- Ticket: `task-copy-assignment-race-464` (Project Task `autobyteus-464`, FU-005 of autobyteus-447)
- Date: `2026-11-10`
- Classification: `task_size: Small`, `architectural_risk: High`, reviewed route. Architecture review ARCH-REV-001 Pass; code review CRR-001 Pass; API/E2E API-REV-001 Pass; test-code review CRR-002 Pass.
- Current Status: `Verified from evidence / finalized on personal; no release`
- Branch: `codex/task-copy-assignment-race-464`. Base `origin/personal` @ `c8f303af70` at bootstrap; `16947ba681` merged at delivery (`a966ed4754`).

## Delivery Summary

- Delivered scope: when a Manager, in one turn, closes a copy's Task (DONE or CANCELLED) and gives the same copy its next Task in parallel tool calls, the assignment is delivered in either order and the copy stays live. Before the fix, it could be refused with "already active or reserved", or stopped right after it was reopened. The same holds for reactivating a closed copy by message.
- Mechanism: the root's lifecycle queue now also runs a copy's closure release, and each reopening step runs together with its commit (`root-task-execution-lifecycle.ts`, `-resource-scope.ts`, `-command-queue.ts`). A release after root termination or fail-stop runs directly.
- Unchanged: every agent-facing text and tool result; Task records.
- Docs: `projects.md`, `agent_team_execution.md`, `docs/design-cases.md` Case 1 (implementation).

## Verification Summary

- Verified from evidence (delivery's judgement; no user check needed). AC-001…AC-006 are directly proven; final confidence 95%.
- Key evidence:
  - `evidence/implementation/IMP-01-d4-cases-on-base.log`: the new cases fail on the base with "already active or reserved".
  - `evidence/implementation/IMP-07-gated-existing-copy-assignment.log`: EXC-E2E-004 passes in 3 runs at load 34–59.
  - `evidence/api-e2e/API-03-mutation-probe.log`: each part of the fix, reverted, fails tests.
  - `evidence/api-e2e/API-04-scripted-agy-gated-set-summary.log`: 60 gated files, 0 "already active" lines.
  - `evidence/implementation/IMP-09-full-e2e-summary.log`: full server E2E, 0 failed.
  - On the integrated state: `evidence/delivery/DEL-02` (focused unit 1237/1237, typecheck at baseline) and `DEL-03` (the race and closure suites, 16 passed).

## Residual Risks For The User

1. Under root fail-stop, a queued release is rejected (MP-002 / C-02). It is out of scope; the DONE is logged and can be retried.
2. A hosted copy's Stop waits for its turn in the root's queue (RSK-001, accepted in the design). A native stop itself does not wait for an in-flight tool (API-01, 77 ms).
3. `root-task-execution-lifecycle.ts` is at 494 of 500 effective lines; the next change there should split it.
4. Follow-up FU-001: the gated `collaboration-model-contract` CM-E2E-2 still expects the self-delegation words from before autobyteus-435. It is not caused by this ticket.
5. The fix runs where this server code runs. Docker nodes and the desktop app get it with the next release (none made; available on request).

## Delivery Documents

- `docs-sync-report.md`, `release-deployment-report.md`, `delivery-revision-record.md` (this folder). Release notes: not required (no release).
