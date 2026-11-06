# Code Review Revision Record

## Revision Index

| Revision ID | Canonical Review Report | Entry Point / Trigger | Prior Result | Current Result | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| CRR-001 | `code-review-report.md` | API/E2E Failure-Origin Review / API-REV-001 Fail (API-03, RXM-001) | N/A | Fail: Design Impact → Solution Designer | CR-001 |

## Revision Entries

### CRR-001 — Late Task lines move the rows after a `v-if` expand

- Canonical review report updated: `code-review-report.md` (new)
- Review entry point and round: API/E2E Failure-Origin Review, round 1. This is the ticket's first code review (direct route, Small/Low).
- Review scope: `N/A` (failure-origin)
- Triggering role, report path, and finding or scenario IDs: API/E2E Engineer, `api-e2e-execution-coverage-report.md`; RXM-001; AC-001
- Relevant solution revision IDs: SR-001
- Relevant architecture-review revision IDs: N/A
- Relevant implementation revision IDs: IR-001
- Relevant API/E2E revision IDs: API-REV-001
- Relevant delivery revision IDs: N/A
- Prior authoritative result: N/A
- Current authoritative result: `Fail`, `Design Impact`
- What changed in the review result and why:
  - Collapse now unmounts `AgentRunTaskRows`. Its `useTaskWorkerTasks` scope releases the workers, and `taskWorkerTaskStore` forgets the answers.
  - On expand, the Task lines arrive after mount, the rows grow, and the mounted `tree-row` group slides them. The frames show −18/−36/−54 and 30 → 48 px spacing.
  - The base's `v-show` kept the answers, so the change introduced this.
  - Every fix changes an owner or a motion the design keeps fixed, so it goes back to the design.
- Supported product scenario / material-premise basis changes: the design's E-06 control (rows in place with `v-if`) holds only for rows without late content. That premise is now qualified.

#### Prior Finding Resolution

None

- New or remaining finding IDs: CR-001
- Material score or classification changes: N/A (failure-origin). The designer may need to revisit Small/Low with the revised fix.
- Recommended recipient: Solution Designer
- Remaining risks or uncertainty: OBS-2 (the Workspaces tree likely shows the same effect) is not verified.
