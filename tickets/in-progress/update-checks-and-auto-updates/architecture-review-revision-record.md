# Architecture Review Revision Record — update-checks-and-auto-updates

The latest `design-review-report.md` is authoritative. This record keeps the review history.

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / Architecture Design Complete (Large / High), 2026-10-23 | SR-004 | N/A | Fail (Design Impact) | AR-001..AR-007 |

## Revision Entries

### ARCH-REV-001 — Initial review: the core approach holds; the automation, app-check and node-kind sequences need work

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/update-checks-and-auto-updates/tickets/in-progress/update-checks-and-auto-updates/design-review-report.md`
- Review round and trigger: round 1; Architecture Design Complete from the Solution Designer (`handoff-architecture-review.md`), commit `1b338eabe9`.
- Triggering role, report path, and finding IDs: Solution Designer, `design-spec.md`; N/A.
- Relevant solution revision IDs: SR-004.
- Prior authoritative decision: N/A.
- Current authoritative decision: `Fail` (Design Impact).
- What changed in the review result or what baseline was established: baseline.
  - The behavior basis is confirmed. The code citations hold, except the composition "handle" (AR-006).
  - AF-08 and AF-09 were confirmed by the reviewer's own probes (ls-refs 84 bytes; 401 for a missing repository; Codex 302; codeload for a renamed repository).
  - Four reachable premises (MP-001..MP-004) drive the blocking findings.

#### Prior Finding Resolution

None.

- New or remaining finding IDs:
  - AR-001 (blocking): runtime refusals are skipped by the automatic `runUpdate`, and the running-agents rule has two owners.
  - AR-002 (blocking): the automation step does not re-check the switch, checks setting and gate per candidate (TR-107).
  - AR-003 (blocking): DS-008 outcome transitions are incomplete (handled with a stale outcome; `AUTO_UPDATED` cases).
  - AR-004 (blocking): the app check's launch and settings entry forms have no single owner; `startAutoCheck` is not addressed.
  - AR-005 (blocking): the runtime category is not traced per node kind; a requirements revision may be needed.
  - AR-006 (non-blocking): composition order and the runtime service handle.
  - AR-007 (non-blocking): the background runtime check should read versions only.
- Material classification changes: none (Large / High confirmed).
- Recommended recipient: Solution Designer.
- Remaining risks or uncertainty: R-1..R-4 in the report.
