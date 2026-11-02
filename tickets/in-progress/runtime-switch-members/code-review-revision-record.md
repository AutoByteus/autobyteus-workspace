# Code Review Revision Record

## Revision Index

| Revision ID | Canonical Review Report | Entry Point / Trigger | Prior Result | Current Result | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| CRR-001 | `code-review-report.md` | Implementation Review, round 1, from IR-001 | N/A | Pass (superseded by CRR-002) | None (FU-C2 follow-up) |
| CRR-002 | `code-review-report.md` | API/E2E Failure-Origin Review, from the API/E2E failure (RSM-02/03/04) | Pass (CRR-001) | Fail | F-1, F-2 (Local Fix) |

## Revision Entries

### CRR-001 — Initial source review of runtime-switch-members

- Canonical review report updated: `code-review-report.md`
- Review entry point and round: Implementation Review, round 1; scope `Full Review`
- Triggering role, report path, and finding or scenario IDs: implementation engineer, `implementation-handoff.md`; none
- Relevant solution revision IDs: SR-001; architecture-review: ARCH-REV-001, ARCH-REV-002; implementation: IR-001; API/E2E and delivery: N/A
- Prior authoritative result: N/A
- Current authoritative result: Pass (9.4 / 10)
- What changed in the review result and why: first result. The rule, records, commit kind, shared handle, holder refresh, saves, readers, contracts and web match the approved design and ARCH-F-007…010; no finding.
- Supported product scenario / material-premise basis changes: None

#### Prior Finding Resolution

None.

- New or remaining finding IDs: none; follow-up FU-C2 (stale probe scenarios, pre-existing)
- Material score or classification changes: Large / High confirmed
- Recommended recipient: API/E2E engineer; implementation engineer informed
- Remaining risks or uncertainty: live Claude/Codex pair; rendered rows; built-server failed start for an Org member or a copy; restart for a copy

### CRR-002 — Failure-origin review of RSM-02, RSM-03, RSM-04

- Canonical review report updated: `code-review-report.md`
- Review entry point and round: API/E2E Failure-Origin Review, round 2; review scope `N/A`
- Triggering role, report path, and scenario IDs: API/E2E engineer, `api-e2e-execution-coverage-report.md` (commit `1269820159`); RSM-02, RSM-03, RSM-04
- Relevant solution / architecture-review / implementation / API/E2E / delivery revision IDs: SR-001 / ARCH-REV-001, 002 / IR-001 / the API/E2E Fail round / N/A
- Prior authoritative result: Pass (CRR-001)
- Current authoritative result: Fail
- What changed in the review result and why: F-1: the Org Settings read and Save result return the stored Org tree as raw JSON, now including `pendingRuntimeSwitch`; the web's strict Org tree schema rejects it, so Settings show a raw schema error after Save. The design says the pending switch is not on the wire; these two Org paths bypass the projections that honor that. F-2: the copy row stays stale after a copy Save (probable cause: the cached collaboration view; not proven). Both are implementation-owned Local Fixes. Scorecard categories 7 and 8 lowered.
- Supported product scenario / material-premise basis changes: the premise "the pending switch is not on the wire" is contradicted for the Org Settings read and Save result.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| (round 1) none | n/a | n/a | CRR-001 | CRR-001 had no findings; it is superseded |

- New or remaining finding IDs: F-1, F-2
- Material score or classification changes: overall 9.4 → 8.8; Large / High unchanged
- Recommended recipient: implementation engineer
- Remaining risks or uncertainty: other Org raw-tree emission sites; whether F-2 is a regression of the model-only copy refresh; AC-003 and AC-009 in the rendered surface
