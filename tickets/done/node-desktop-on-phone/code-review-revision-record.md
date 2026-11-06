# Code Review Revision Record — S3 (autobyteus-407)

The latest `code-review-report.md` or `api-e2e-test-review-report.md` remains authoritative for its current result.

## Revision Index

| Revision ID | Canonical Review Report | Entry Point / Trigger | Prior Result | Current Result | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| CRR-001 | `code-review-report.md` | Implementation Review, round 1; Implementation Engineer IR-001 | N/A | Fail, Local Fix (9.3/10) | CR-001 |
| CRR-002 | `code-review-report.md` | Implementation Review, round 2 (Targeted Delta); Implementation Engineer IR-002 | Fail (CRR-001) | Pass (9.5/10) | CR-001 (resolved) |
| CRR-003 | `api-e2e-test-review-report.md` | Proportional test-code review after API/E2E Pass (API-REV-001) | Pass (CRR-002) | Not Applicable (no durable test changed) | None |

## Revision Entries

### CRR-001 — Initial implementation review of the phone node desktop, viewer limits and live revocation

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/node-desktop-on-phone/tickets/in-progress/node-desktop-on-phone/code-review-report.md`
- Review entry point and round: Implementation Review, round 1
- Review scope: `Full Review`
- Triggering role, report path, and finding or scenario IDs: Implementation Engineer, `implementation-handoff.md` (IR-001)
- Relevant solution revision IDs: SR-001, SR-002
- Relevant architecture-review revision IDs: ARCH-REV-001, ARCH-REV-002
- Relevant implementation revision IDs: IR-001
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: N/A
- Current authoritative result: Fail. One Local Fix (CR-001). Reviewed at `2a90f99cf8`; source at `d84d2d0fdd`.
- What changed in the review result and why: this is the initial result. The full diff was reviewed against DS-S3-1 … DS-S3-4, the ownership map and the removal plan. The server registry, re-check bound, close mapping move, connection-policy extraction, mode-switch wait, keyboard bridge and zoom all pass. CR-001: `useNodeDesktopAvailability` keeps a failed fetch as the shared answer, and the phone never reloads it, so the VNC Viewer entry stays hidden until the app restarts.
- Supported product scenario / material-premise basis changes: SCN-004a was added, a phone opening a run while its node is briefly unreachable (Supported Normal). Candidates CR-C-02 … CR-C-08 were recorded and rejected.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: CR-001
- Material score or classification changes: N/A (initial)
- Recommended recipient: `/software_engineering_team/implementation_engineer`
- Remaining risks or uncertainty: AC-021 has not been rendered on a device; only Gboard was used for the keyboard bridge.

### CRR-002 — CR-001 resolved: an availability error is asked again

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/node-desktop-on-phone/tickets/in-progress/node-desktop-on-phone/code-review-report.md`
- Review entry point and round: Implementation Review, round 2
- Review scope: `Targeted Delta Review`. Outside `tickets/`, the only changes since `2a90f99cf8` are `useNodeDesktopAvailability.ts` and its spec, the file and behavior of CR-001.
- Triggering role, report path, and finding or scenario IDs: Implementation Engineer, `implementation-handoff.md` (IR-002), CR-001
- Relevant solution revision IDs: SR-002
- Relevant architecture-review revision IDs: ARCH-REV-002
- Relevant implementation revision IDs: IR-002
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Fail (CRR-001)
- Current authoritative result: Pass. Reviewed at `165de82af4`; source at `0baf15a981`.
- What changed in the review result and why: `stateFor` asks the node again when the cached state is `error` and reloads the shared ref, so every viewer of that node gets the new answer. `available`/`unavailable` stay cached and `reload` is unchanged. Scores 7 and 8 rise to 9.3 and 9.4, so every category is ≥ 9.3.
- Supported product scenario / material-premise basis changes: None

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-001 | Open (Local Fix) | Resolved | IR-002, `0baf15a981` | `useNodeDesktopAvailability.ts:38-40`; the spec case "does not keep an error as the shared answer" sees error, then a later caller fetches and both see available, and a third caller does not fetch (2 fetches); it fails on the IR-001 code per the handoff; IMP-S3-30 shows 1182 tests passed |

- New or remaining finding IDs: None
- Material score or classification changes: Fail → Pass; overall 9.3 → 9.5
- Recommended recipient: `/software_engineering_team/api_e2e_engineer`
- Remaining risks or uncertainty: AC-021 has not been rendered on a device; only Gboard was used for the keyboard bridge.

### CRR-003 — Proportional test-code review after API/E2E Pass

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/node-desktop-on-phone/tickets/in-progress/node-desktop-on-phone/api-e2e-test-review-report.md`
- Review entry point and round: Successful API/E2E test-code review, round 1
- Review scope: `N/A` (test review)
- Triggering role, report path, and finding or scenario IDs: API/E2E engineer, `api-e2e-execution-coverage-report.md` (API-REV-001, Pass, 95.0%), commit `bc173d3528`
- Relevant solution revision IDs: SR-002
- Relevant architecture-review revision IDs: N/A
- Relevant implementation revision IDs: IR-002
- Relevant API/E2E revision IDs: API-REV-001
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Pass (CRR-002, implementation review)
- Current authoritative result: Not Applicable. `git diff --name-only 165de82af4 bc173d3528` lists only `tickets/` files; the probes are temporary evidence.
- What changed in the review result and why: this is the first test-review result. It is Not Applicable because the API/E2E round changed no durable test code.
- Supported product scenario / material-premise basis changes: None

#### Prior Finding Resolution

None.

- New or remaining finding IDs: None
- Material score or classification changes: None
- Recommended recipient: `/software_engineering_team/delivery_engineer`
- Remaining risks or uncertainty: a physical phone is optional and only the user can run it; iOS is out of scope.
