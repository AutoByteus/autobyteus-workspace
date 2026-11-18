# Architecture Review Revision Record — list-running-agents (autobyteus-492)

The latest `design-review-report.md` is authoritative.

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / Architecture Design Complete (Large, High); basis replaced by SR-005 during the review | SR-001 … SR-005 | N/A | Fail | AR-001, AR-003, AR-004, AR-005, AR-006 |

## Revision Entries

### ARCH-REV-001 — Initial review (SR-005): closed-Task rule on the `node` path

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/list-running-agents/tickets/in-progress/list-running-agents/design-review-report.md`
- Review round and trigger: round 1. Solution Designer handoff 2026-11-18 at SR-003 (`95e9e8f5f3`). During the review the Solution Designer asked for SR-005 (`322fe8ed32`) to be reviewed instead: SR-004 keeps today's team-run-ID refusal and adds `coordinator_agent_run_id`; SR-005 removes Org entries. This result covers SR-005.
- Triggering role, report path, and finding IDs: Solution Designer; N/A.
- Relevant solution revision IDs: SR-001 … SR-005.
- Prior authoritative decision: N/A.
- Current authoritative decision: `Fail`.
- What baseline was established: the behavior basis is confirmed, except the paths of BEH-004/005 (closed-Task rule) and BEH-006 (the peer's coordinator source). The code citations hold. AR-002 (a team run ID across nodes) was drafted against SR-003 and withdrawn before this result, because SR-004 removed that routing. Its ID is not reused.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: AR-001 (Design Impact, High), AR-003 (Requirement Gap — stale texts, Low), AR-004 (Design Impact, Low), AR-005 (Requirement Gap, Medium), AR-006 (Design Impact, Low).
- Material classification changes: None (`Large`/`High` confirmed).
- Recommended recipient: Solution Designer.
- Remaining risks or uncertainty: two-node behavior until the two-server E2E runs (UNK-001); `RunningAgents.rootOf` must use the root's own statuses, not `placeOf` alone.
