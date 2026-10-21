# Code Review Revision Record — remote-nodes-page (autobyteus-267)

## Revision Index

| Revision ID | Canonical Review Report | Entry Point / Trigger | Prior Result | Current Result | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| CRR-001 | `code-review-report.md` | API/E2E Failure-Origin Review, API-REV-001 F-001 | N/A | Fail, Local Fix (implementation) | F-001 |

## Revision Entries

### CRR-001 — Failure origin of F-001: an in-flight peer is not asked again

- Canonical review report updated: `code-review-report.md`
- Review entry point and round: API/E2E Failure-Origin Review, round 1. This is the ticket's first code review (direct route).
- Review scope: `N/A` (failure-origin)
- Triggering role, report path, and finding or scenario IDs: API/E2E engineer, `api-e2e-execution-coverage-report.md`, F-001 / RNP-06 / AC-505
- Relevant solution revision IDs: SR-003
- Relevant architecture-review revision IDs: N/A
- Relevant implementation revision IDs: IR-001
- Relevant API/E2E revision IDs: API-REV-001
- Relevant delivery revision IDs: N/A
- Prior authoritative result: N/A
- Current authoritative result: Fail. Local Fix, owned by the implementation engineer.
- What changed in the review result and why: `remoteCollaborationOffersStore.ask` uses Apollo's `query` with `network-only`, which still deduplicates an identical in-flight query. A re-ask on tab return or switch-on therefore sends nothing, and the newer token applies the earlier answer. The diagnostic with `context: {queryDeduplication: false}` passes all 9 probe cases.
- Supported product scenario / material-premise basis changes: SCN-F001 is a supported explicit edge (UI/UX spec L285, TR-009).

#### Prior Finding Resolution

None.

- New or remaining finding IDs: F-001 (Low)
- Material score or classification changes: N/A
- Recommended recipient: `/software_engineering_team/implementation_engineer`
- Remaining risks or uncertainty:
  - after the fix, rerun the probe and the store specs;
  - AC-506 is the user's check.
