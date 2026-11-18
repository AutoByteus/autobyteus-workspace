# Architecture Review Revision Record

The latest `design-review-report.md` remains authoritative.

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / initial architecture review | SR-001 | N/A | Fail (Design Impact) | AR-001, AR-002 |
| ARCH-REV-002 | Round 2 / re-review of SR-002 | SR-002 | Fail | Pass | AR-001, AR-002 (resolved) |

## Revision Entries

### ARCH-REV-001 — Initial review: order fix sound; crashed-worker end state missing

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-reentry-worker-stopped/tickets/in-progress/application-reentry-worker-stopped/design-review-report.md`
- Review round and trigger: round 1, Solution Designer handoff (Architecture Design Complete, Medium / High), 2026-10-24
- Triggering role, report path, and finding IDs: Solution Designer, `solution-designer-handoff.md`; N/A
- Relevant solution revision IDs: `SR-001`
- Prior authoritative decision: N/A
- Current authoritative decision: `Fail`, `Design Impact`
- What changed in the review result or what baseline was established:
  - Baseline established. Behavior basis confirmed. Routing classification confirmed.
  - The reentry order, readiness as the text owner, and the reasons map pass.
  - AR-001: removing reentry's `ensureReady` leaves a crashed (`failed`) worker failed after repair or reload. The tool invoker refuses a failed worker, and the prior approved contract names reentry as the path that restores it (MP-001).
  - AR-002: the decision on `getDiagnosticsByApplicationId` is left open.

#### Prior Finding Resolution

None

- New or remaining finding IDs: AR-001 (Medium, blocking), AR-002 (Low)
- Material classification changes: none (task_size=Medium, architectural_risk=High)
- Recommended recipient: Solution Designer
- Remaining risks or uncertainty: an ACTIVE-before-tools-open window, the same as at startup (accepted)

### ARCH-REV-002 — Re-review of SR-002: stop ends in `stopped`; diagnostics getter removed

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-reentry-worker-stopped/tickets/in-progress/application-reentry-worker-stopped/design-review-report.md`
- Review round and trigger: round 2, Solution Designer re-review request (SR-002), 2026-10-25, branch @ `9f6982ce0b`
- Triggering role, report path, and finding IDs: Solution Designer, `solution-designer-handoff.md` (SR-002 section); AR-001, AR-002
- Relevant solution revision IDs: `SR-002`
- Prior authoritative decision: `Fail` (ARCH-REV-001)
- Current authoritative decision: `Pass`
- What changed in the review result:
  - Behavior basis reconfirmed; requirements are unchanged.
  - DS-003 now traces the worker state for `ready`, `failed` and `stopped`.
  - Every SR-002 citation was opened and matches.
  - The verdicts that failed in round 1 now pass: DS-003, reuse, `application-engine` allocation, removal.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Open (Medium, blocking) | Resolved | SR-002 | The design's controller `stopEngine` sets the base `stopped` status with or without a handle (target mapping; the current early return is at `application-engine-controller.ts:204-206`). Reentry still has `Pick<"stop">` only. The stop callers are listed and each was checked (`application-reentry-service.ts:61,161,198`; `application-engine-launcher.ts:76-88`). The guard anchor at `application-framework-boundaries.test.ts:3090` follows the rename, with its assertion unchanged. A new invoker unit and a controller unit are planned. E-08 is corrected. |
| AR-002 | Open (Low) | Resolved | SR-002 | Startup quarantines each selected app with a non-null `getSetupRequiredDetail`. The selected set equals readiness `activeApplicationIds` (`create-application-orchestration-services.ts:241`). `getDiagnosticsByApplicationId` and its stubs (`application-platform-lifecycle.test.ts:22`, `application-execution-event-journal-recovery.test.ts:258`) are in the removal plan. |

- New or remaining finding IDs: none
- Material classification changes: none (task_size=Medium, architectural_risk=High)
- Recommended recipient: Implementation Engineer; informational notice to the Solution Designer
- Remaining risks or uncertainty: `lastFailure` cleared by a stop (accepted); an ACTIVE-before-tools-open window, the same as at startup (accepted)
