# Architecture Review Revision Record — autobyteus-638

The latest `design-review-report.md` is authoritative.

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / Architecture Design Complete (Medium, High) | SR-001, SR-002 | N/A | Fail | AR-001 |
| ARCH-REV-002 | Round 2 / SR-003 (fix for AR-001; R-1..R-3) | SR-003 | Fail | Pass | AR-001 resolved; AR-002 new (non-blocking) |

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

### ARCH-REV-002 — SR-003: the restore window is owned; Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/idle-run-discovery-638/tickets/in-progress/idle-run-discovery-638/design-review-report.md` (§ Round 2 Delta Review)
- Review round and trigger: round 2. SR-003 at `affa990598` (Solution Designer's message, 2026-11-24).
- Triggering role, report path, and finding IDs: Solution Designer; `solution-revision-record.md` § SR-003; AR-001, R-1..R-3.
- Relevant solution revision IDs: SR-003.
- Prior authoritative decision: `Fail` (ARCH-REV-001).
- Current authoritative decision: `Pass`.
- What changed in the review result: I redrew DS-001 with `∪ pending()` and DS-002 with the pending set shrinking per outcome. Walk 4b holds. The residuals are taken in. I checked the copied recorder's initial state (`written = "[]"`, `busy-run-recorder.ts:25`) against the new lifecycle and found AR-002.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Open (Medium) | Resolved | SR-003 | C-1 Lifecycle (`take()` reads only; `running ∪ pending`; final write includes pending); Validation 4b; DS-001; Ownership Map; Interface Boundary Mapping (`pending()`); server-runtime row; test guidance |

- New or remaining finding IDs: AR-002 (Design Impact, Low, non-blocking): the recorder's first write may not happen when the set is empty at the first check, so a stale or invalid file stays. Start `written` as "unknown" so the first check always reconciles.
- Material classification changes: None (`Medium`/`High`).
- Recommended recipient: implementation engineer (primary); Solution Designer (informational).
- Remaining risks or uncertainty: failed restores are not retried; the startup load; peers refused during the restore window.
