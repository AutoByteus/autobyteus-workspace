# Code Review Revision Record — update-checks-and-auto-updates

## Revision Index

| Revision ID | Canonical Review Report | Entry Point / Trigger | Prior Result | Current Result | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| CRR-001 | `code-review-report.md` | Implementation Review, round 1 (IR-001) | N/A | Fail — Local Fix (implementation) | CR-001, CR-002 |
| CRR-002 | `code-review-report.md` | Implementation Review, round 2, Targeted Delta Review (IR-002) | Fail — Local Fix | Pass | CR-001, CR-002 (resolved) |

## Revision Entries

### CRR-001 — Initial implementation review of IR-001

- Canonical review report updated: `tickets/in-progress/update-checks-and-auto-updates/code-review-report.md`
- Review entry point and round: Implementation Review, round 1
- Review scope: `Full Review`
- Triggering role, report path, and finding or scenario IDs: implementation engineer, `implementation-handoff.md` (IR-001); range `3a0ea2238e..9f4dea898e`
- Relevant solution revision IDs: SR-005
- Relevant architecture-review revision IDs: ARCH-REV-002
- Relevant implementation revision IDs: IR-001
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: N/A
- Current authoritative result: Fail, `Local Fix` owned by implementation; score 9.2/10 (Runtime Correctness 8.6)
- What changed in the review result and why: initial result. CR-001: the Update checks card reads the GitHub wait from a cache resolved at connect time, so a wait learned later never shows (REQ-004, AC-004). CR-002: a runtime row keeps "It will be updated automatically once no agent is running." after the runtime switch is turned off (REQ-022, REQ-010).
- Supported product scenario / material-premise basis changes: added RSC-001 (Supported Explicit Edge) and RSC-002 (Supported Normal).

#### Prior Finding Resolution

None.

- New or remaining finding IDs: CR-001, CR-002
- Material score or classification changes: N/A (initial)
- Recommended recipient: `/software_engineering_team/implementation_engineer`
- Remaining risks or uncertainty: the 209 E2E suite needs API/E2E's revision; packaged-build and own-node checks are API/E2E's.

### CRR-002 — Targeted Delta Review of the CR-001 and CR-002 fixes (IR-002)

- Canonical review report updated: `tickets/in-progress/update-checks-and-auto-updates/code-review-report.md`
- Review entry point and round: Implementation Review, round 2
- Review scope: `Targeted Delta Review` — `62082fc36e..985246c53b` changes only `UpdateChecksCard.vue`, `NotificationRow.vue`, their tests and one docs clause.
- Triggering role, report path, and finding or scenario IDs: implementation engineer, `implementation-handoff.md` (IR-002); CR-001, CR-002; RSC-001, RSC-002
- Relevant solution revision IDs: SR-005
- Relevant architecture-review revision IDs: ARCH-REV-002
- Relevant implementation revision IDs: IR-002
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Fail — Local Fix (CRR-001)
- Current authoritative result: Pass; score 9.3/10 (Runtime Correctness 8.6 → 9.2)
- What changed in the review result and why: the card re-reads the node's settings when it opens, so a wait learned after connect shows; the runtime row's automatic promise depends on the current switch. Both meet the required outcomes, with tests that fail without the fix.
- Supported product scenario / material-premise basis changes: None.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-001 | Open (Local Fix) | Resolved | IR-002, `985246c53b` | `UpdateChecksCard.vue` mount read; `UpdateChecksCard.githubWait.spec.ts` (real store, second read, banner); IMP-13 fails without the fix |
| CR-002 | Open (Local Fix) | Resolved | IR-002, `985246c53b` | `NotificationRow.vue` `runtimeAutomatic` condition; new switch-off case in `NotificationCenter.automation.spec.ts`; IMP-13 fails without the fix |

- New or remaining finding IDs: None
- Material score or classification changes: Runtime Correctness 8.6 → 9.2; classification none (Pass)
- Recommended recipient: `/software_engineering_team/api_e2e_engineer`; informational notice to `/software_engineering_team/implementation_engineer`
- Remaining risks or uncertainty: the 209 server E2E suite needs API/E2E's revision; packaged-build, own-node and real-throttling checks are API/E2E's.
