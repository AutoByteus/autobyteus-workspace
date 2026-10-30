# Code Review Revision Record — autobyteus-305

The latest `code-review-report.md` (or `api-e2e-test-review-report.md`) is authoritative for its current result.

## Revision Index

| Revision ID | Canonical Review Report | Entry Point / Trigger | Prior Result | Current Result | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| CRR-001 | `code-review-report.md` | Implementation Review, round 1 / IR-001 (build step 1) | N/A | Pass | None blocking; notes CR-N1..CR-N3 |
| CRR-002 | `api-e2e-test-review-report.md` | Proportional test-code review / API-REV-001 Pass | Pass (CRR-001, source) | Pass | None |
| CRR-003 | `code-review-report.md` | Implementation Review, round 2 (build step 2) / IR-002 | Pass (CRR-001 step 1; CRR-002 tests) | Pass | None blocking; note CR2-N1 |
| CRR-004 | `api-e2e-test-review-report.md` | Proportional test-code review, build step 2 / API-REV-002 Pass | Pass (CRR-003) | Not Applicable | None |
| CRR-005 | `code-review-report.md` | Implementation Review, round 3 (build step 3) / IR-003 | Pass (CRR-003 step 2) | Pass | None blocking; note CR3-N1 |
| CRR-006 | `api-e2e-test-review-report.md` | Proportional test-code review, build step 3 / API-REV-003 Pass | Pass (CRR-005) | Not Applicable | None |

## Revision Entries

### CRR-001 — Build step 1 (signed server package): implementation review, Pass

- Canonical review report updated: `code-review-report.md`
- Review entry point and round: Implementation Review, round 1
- Review scope: `Full Review`
- Triggering role, report path, and finding or scenario IDs: Implementation Engineer, `implementation-handoff.md` (IR-001); scenarios CR-S1..CR-S5
- Relevant solution revision IDs: `SR-005`
- Relevant architecture-review revision IDs: `ARCH-REV-002`
- Relevant implementation revision IDs: `IR-001`
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: N/A
- Current authoritative result: `Pass`, 9.5/10, all categories ≥ 9.3
- What changed in the review result and why: initial baseline. Commits `01c56f1b95`, `5c33c1b7b0`, `4a968218e9` reviewed against SR-005 step 1. The handoff's assumptions A-1, A-2, the frozen C3 details and `CONFIG_HASH_VERSION` v6 are confirmed.
- Supported product scenario / material-premise basis changes: none. CR-S4 notes that the Android workflow, not only the Desktop workflow, can create the GitHub release; the wait loop covers both.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: none blocking. Non-blocking notes: CR-N1 (zh variant input missing from the A-1 way-out command), CR-N2 (release creator wording), CR-N3 (GLOSSARY built-in package clause for zh images)
- Material score or classification changes: N/A
- Recommended recipient: API/E2E engineer (primary); implementation engineer informed
- Remaining risks or uncertainty: the real release path (secret/key pair, 30-minute wait, runner disk) is proven only by the first release

### CRR-002 — Build step 1: proportional review of the changed Prisma Docker probe, Pass

- Canonical review report updated: `api-e2e-test-review-report.md`
- Review entry point and round: Successful API/E2E test-code review, round 1
- Review scope: `N/A` (test review)
- Triggering role, report path, and finding or scenario IDs: API/E2E Engineer, `api-e2e-execution-coverage-report.md` (API-10, round 2)
- Relevant solution revision IDs: `SR-005`
- Relevant architecture-review revision IDs: `ARCH-REV-002`
- Relevant implementation revision IDs: `IR-001`
- Relevant API/E2E revision IDs: `API-REV-001`
- Relevant delivery revision IDs: N/A
- Prior authoritative result: CRR-001 `Pass` (source review)
- Current authoritative result: `Pass`
- What changed in the review result and why: `prisma-engine-discovery.docker.mjs` (`4c356d69b7`) drops the pre-fix baseline resolver comparison. That precondition is stale in the package layout, where the pnpm store sits inside the app root (`evidence/API-10-cause.log`). The fixture is now proven directly: wrong revision, RPC `-32601`. The assertion that guards the regression (the current resolver picks the bundled engines despite the HOME cache) is unchanged.
- Supported product scenario / material-premise basis changes: none

#### Prior Finding Resolution

None (CRR-001 had no blocking findings; its non-blocking notes CR-N1..CR-N3 stay with implementation).

- New or remaining finding IDs: none
- Material score or classification changes: N/A
- Recommended recipient: delivery engineer
- Remaining risks or uncertainty: AC-011's GitHub part is proven only by the first release (API-16, user-only)

### CRR-003 — Build step 2 (starter and server-packages volume): implementation review, Pass

- Canonical review report updated: `code-review-report.md` (now holds the step-2 result)
- Review entry point and round: Implementation Review, round 2 (first for step 2)
- Review scope: `Full Re-Audit` of the step-2 delta. The change is a new process owner and new contracts across 44 files; step 1 was merged unchanged except for CR-N1.
- Triggering role, report path, and finding or scenario IDs: Implementation Engineer, `implementation-handoff.md` (IR-002); scenarios CR2-S1..CR2-S5
- Relevant solution revision IDs: `SR-005`, `SR-006`, `SR-007`
- Relevant architecture-review revision IDs: `ARCH-REV-003`
- Relevant implementation revision IDs: `IR-002`
- Relevant API/E2E revision IDs: N/A (step 2)
- Relevant delivery revision IDs: N/A (step 2; step 1 DR-001)
- Prior authoritative result: `Pass` (CRR-001 step 1; CRR-002 tests)
- Current authoritative result: `Pass`, 9.5/10, all categories ≥ 9.3
- What changed in the review result and why: the step-2 starter, C1/C2 status, launcher volume and hash v7 reviewed against SR-005. D-1, D-2, D-3 and the C2 `version` meaning confirmed.
- Supported product scenario / material-premise basis changes: CR2-S4. `NEEDS_NEW_IMAGE` is reachable in step 2 through `upgrade --all --tag <older>`.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-N1 (non-blocking) | Open | Resolved | IR-002 | `release-server-docker.yml` "Check system level" adds ` -f publish_zh=true` for zh; step test (IMP2-02) |
| CR-N2 (non-blocking) | Open | Resolved | DR-001 (step-1 delivery) | per IR-002 handoff; wording fixed in step-1 delivery |
| CR-N3 (non-blocking) | Open | Resolved | DR-001 (step-1 delivery) | per IR-002 handoff; GLOSSARY fixed in step-1 delivery |

- New or remaining finding IDs: none blocking. Non-blocking: CR2-N1 (interim `NEEDS_NEW_IMAGE` visibility until the launcher `status` arrives in step 3)
- Material score or classification changes: N/A
- Recommended recipient: API/E2E engineer (primary); implementation engineer informed
- Remaining risks or uncertainty: launcher v7 recreation on a real node, and PowerShell execution, are still to be run by API/E2E

### CRR-004 — Build step 2: proportional test-code review, Not Applicable

- Canonical review report updated: `api-e2e-test-review-report.md` (now holds the step-2 result; step 1 = CRR-002)
- Review entry point and round: Successful API/E2E test-code review, round 2 (build step 2)
- Review scope: `N/A` (test review)
- Triggering role, report path, and finding or scenario IDs: API/E2E Engineer, `api-e2e-execution-coverage-report.md` (API-REV-002, round 2)
- Relevant solution revision IDs: `SR-005`
- Relevant architecture-review revision IDs: `ARCH-REV-003`
- Relevant implementation revision IDs: `IR-002`
- Relevant API/E2E revision IDs: `API-REV-002`
- Relevant delivery revision IDs: N/A
- Prior authoritative result: CRR-003 `Pass` (source review)
- Current authoritative result: `Not Applicable`. No durable test changed; `5939cc48be..c052bb1aff` touches only ticket files.
- What changed in the review result and why: nothing to review. FU-006 (pre-existing PowerShell port-pick defect) is noted as consistent with ticket-scope rules.
- Supported product scenario / material-premise basis changes: none

#### Prior Finding Resolution

None (CR2-N1 remains an open non-blocking note for the Solution Designer and delivery).

- New or remaining finding IDs: none
- Material score or classification changes: N/A
- Recommended recipient: delivery engineer
- Remaining risks or uncertainty: RU-23 (a node recreated by an installed v6 launcher keeps starter state in the container layer, which matters from step 3); CR2-N1

### CRR-005 — Build step 3 (in-place update by command): implementation review, Pass

- Canonical review report updated: `code-review-report.md` (now holds the step-3 result)
- Review entry point and round: Implementation Review, round 3 (first for step 3)
- Review scope: `Full Re-Audit` of the step-3 delta: the update state machine, verification, data copy and restore, C2 POST and the launchers (36 files)
- Triggering role, report path, and finding or scenario IDs: Implementation Engineer, `implementation-handoff.md` (IR-003); SCN-002..SCN-005, CR3-S1, CR3-S2
- Relevant solution revision IDs: `SR-009`, `SR-010`
- Relevant architecture-review revision IDs: `ARCH-REV-004`
- Relevant implementation revision IDs: `IR-003`
- Relevant API/E2E revision IDs: N/A (step 3)
- Relevant delivery revision IDs: N/A (step 3; steps 1–2 DR-001, DR-002)
- Prior authoritative result: `Pass` (CRR-003, step 2)
- Current authoritative result: `Pass`, 9.5/10, all categories ≥ 9.3
- What changed in the review result and why: the step-3 code was reviewed against SR-009. Each await in `#switch` was traced for a stop (halt), and every recorded state has a boot recovery. Confirmed: refused versus failed, the frozen step names, the boot `deleteOthers`, the status during the trial, tar after the SHA check, and the launcher JSON handling.
- Supported product scenario / material-premise basis changes: CR3-S1 (stops during an update, per the DS-007 table) and CR3-S2 (RU-23) added

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR2-N1 (non-blocking) | Open | Resolved | SR-009, IR-003 | `print_starter_line` / `Write-StarterLine` show `needsNewImage` and the message in launcher `status`; launcher tests (IMP3-02) |

- New or remaining finding IDs: none blocking. Non-blocking: CR3-N1 (SelfCheck failure detail and output)
- Material score or classification changes: N/A
- Recommended recipient: API/E2E engineer (primary); implementation engineer informed
- Remaining risks or uncertainty: the real launcher on Docker and PowerShell execution are not yet run; the real GitHub path and production key; RU-23 release-notes instruction

### CRR-006 — Build step 3: proportional test-code review, Not Applicable

- Canonical review report updated: `api-e2e-test-review-report.md` (now holds the step-3 result)
- Review entry point and round: Successful API/E2E test-code review, round 3 (build step 3)
- Review scope: `N/A` (test review)
- Triggering role, report path, and finding or scenario IDs: API/E2E Engineer, `api-e2e-execution-coverage-report.md` (API-REV-003; API-31..API-36)
- Relevant solution revision IDs: `SR-009`, `SR-010`
- Relevant architecture-review revision IDs: `ARCH-REV-004`
- Relevant implementation revision IDs: `IR-003`
- Relevant API/E2E revision IDs: `API-REV-003`
- Relevant delivery revision IDs: N/A
- Prior authoritative result: CRR-005 `Pass` (source review)
- Current authoritative result: `Not Applicable`. No durable test changed; `a17033dc30..e7e76ac2c0` touches only ticket files.
- What changed in the review result and why: nothing to review. Two API/E2E observations (polling may skip step lines; a stale built-in `previous` after a recreate) were judged as not findings.
- Supported product scenario / material-premise basis changes: none

#### Prior Finding Resolution

None (CR3-N1 remains an open non-blocking note for implementation).

- New or remaining finding IDs: none
- Material score or classification changes: N/A
- Recommended recipient: delivery engineer
- Remaining risks or uncertainty: production key and GitHub source only at the first release; RU-23 release-notes instruction; CR3-N1
