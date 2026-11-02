# Code Review Revision Record

## Revision Index

| Revision ID | Canonical Review Report | Entry Point / Trigger | Prior Result | Current Result | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| CRR-001 | `code-review-report.md` | API/E2E Failure-Origin Review / API-REV-001 Fail (API-03, AFS-002) | N/A | Fail: Local Fix → Implementation | CR-001, CR-002 |

## Revision Entries

### CRR-001 — Org focus closes Settings; an Org copy's stored selection is refused on reload

- Canonical review report updated: `code-review-report.md` (new)
- Review entry point and round: API/E2E Failure-Origin Review, round 1. This is the ticket's first code review (direct route, Medium/Low).
- Review scope: `N/A` (failure-origin)
- Triggering role, report path, and finding or scenario IDs: API/E2E Engineer, `api-e2e-execution-coverage-report.md` "Failure Detail (API-03)"; AFS-002; AC-003, AC-005
- Relevant solution revision IDs: SR-002
- Relevant architecture-review revision IDs: N/A
- Relevant implementation revision IDs: IR-001
- Relevant API/E2E revision IDs: API-REV-001
- Relevant delivery revision IDs: N/A
- Prior authoritative result: N/A
- Current authoritative result: `Fail`. Origin is implementation, `Local Fix`.
- What changed in the review result and why:
  - CR-001: the Org tree's select and inspect path still calls `clearSelection()`, which always shows the chat. D-IMP-1 covered `selectRun` and the Org watcher only. Reproduced: a same-Org trial patch gives `settingsClosedBy []` and `pendingEditKept true`.
  - CR-002: `assertAgentOrgRunConfigChange` compares copies verbatim, so the Save's own stored `userLaunchSelection` makes the reload and Refresh throw. Reproduced from the browser console. The defect is pre-existing (by reading the base), but it blocks AC-003, so it belongs to this ticket.
- Supported product scenario / material-premise basis changes: None. Both scenarios are approved acceptance criteria reached through real UI triggers.

#### Prior Finding Resolution

None

- New or remaining finding IDs: CR-001, CR-002
- Material score or classification changes: N/A (failure-origin round). Medium/Low stays.
- Recommended recipient: Implementation Engineer, then API/E2E (direct route)
- Remaining risks or uncertainty:
  - The second-tab "Running" badge observation is not investigated.
  - CR-002's base behaviour was established by reading only.
  - The temporary diagnostics were reverted (`evidence/code-review/CRR-001-failure-origin-diagnostics.log`).
