# Architecture Review Revision Record — autobyteus-638

The latest `design-review-report.md` is authoritative.

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / Architecture Design Complete (Medium, High) | SR-001, SR-002 | N/A | Fail | AR-001 |

## Revision Entries

### ARCH-REV-001 — Initial review: the restore window has no owner

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/idle-run-discovery-638/tickets/in-progress/idle-run-discovery-638/design-review-report.md`
- Review round and trigger: round 1; Solution Designer handoff 2026-11-24, design commit `abd6ab8ffa` (base `c1147c8917`).
- Triggering role, report path, and finding IDs: Solution Designer; N/A.
- Relevant solution revision IDs: SR-001, SR-002.
- Prior authoritative decision: N/A.
- Current authoritative decision: `Fail`.
- What baseline was established:
  - The behavior basis is confirmed.
  - The busy recorder's `record()` stops its timer before the final write; the cleanup order holds; `resumeAfterRestart` never throws.
  - `RunningAgents`, `ensureAgentReady` and `startedByPerson` exist as cited.
  - One finding was opened.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: AR-001 (Design Impact, Medium): `take()` removes the record before the runs are restored, so a stop or crash in the restore window loses them (the busy path persists before it removes).
- Material classification changes: None (`Medium`/`High`).
- Recommended recipient: Solution Designer.
- Remaining risks or uncertainty: the final write and pending person-started reads; `error` entry agents; skipping Org roots explicitly; the startup load peak.
