# API/E2E Revision Record — small-follow-ups-batch-435 (autobyteus-435)

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | code reviewer CRR-002 pass / round 1 | SR-003, ARCH-REV-003, IR-002, CRR-002 | N/A | Fail / 79% (F1, F2) |
| API-REV-002 | code reviewer CRR-004 pass / round 2 | SR-004, SR-005, ARCH-REV-004/005, IR-003, IR-004, CRR-003, CRR-004 | Fail / 79% | Pass / 95% |

## Revision Entries

### API-REV-001 — baseline: items 1–12 on devices, the desktop app and live nodes; two design-level failures

- Triggering role, report path, and round: `/software_engineering_team/code_reviewer`, `code-review-report.md` (CRR-002, Pass), round 1.
- Triggering finding or case IDs: — (baseline)
- Related architecture-design, architecture-review, implementation, code-review, or delivery revision IDs: SR-003, ARCH-REV-003, IR-002, CRR-002.
- Why this baseline or coverage/execution revision was recorded: first API/E2E result for head `d37397b40d` (code `f9cb6f7153`).
- Coverage decisions or durable test paths changed: added MSP-33 (`mobile-shell-probe.mjs`), MSP-34 and MSP-35 (`mobile-closed-task-rows-cases.mjs`); MSP-05's label now says "Org entry (AC-005-4)".
- Cases added, changed, removed, or rechecked: API-01…API-18. API-18 was added during execution. API-17 (full probe) was deferred to the rework round.
- Commands, environment, fixture, or broader-validation delta: fresh-clone desktop and server-package builds; test Docker node; ticket-owned API 35 and API 34 AVDs; test proxy; isolated desktop instance; phone probe selections r1/r2. All owned resources were removed after the round.

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-progress.md`, `evidence/api-e2e/`.
- Prior result and confidence (`N/A` for `API-REV-001`): N/A
- Current result and confidence: `Fail`, 79% overall (requirement proof 50%, desktop-shell/user surface 50%).
- New or remaining failure IDs: F1 (REQ-004 on Android 9–14, API-18), F2 (AC-003-1 in the Electron window, API-13).
- Recommended owner: Solution Designer (preliminary `Design Impact` for both), through failure-origin review.
- Remaining risks, blocked evidence, or untested scope: API-17 at the final commit; items 13–14 (`432d1c3af2`, IR-003) not in this round; vendor phone cutouts (user-only).

### API-REV-002 — round 2: F1 and F2 resolved; items 13–14 covered; full phone probe at the final commit

- Triggering role, report path, and round: `/software_engineering_team/code_reviewer`, `code-review-report.md` (CRR-004, Full Re-Audit, Pass), round 2; head `b5da2d15a0`.
- Triggering finding or case IDs: F1 (API-18), F2 (API-13); new items 13 (REQ-013) and 14 (REQ-014).
- Related architecture-design, architecture-review, implementation, code-review, or delivery revision IDs: SR-004, SR-005 (DEC-019, DEC-020), ARCH-REV-004/005, IR-003, IR-004, CRR-003 (CR-002, CR-003), CRR-004.
- Why this baseline or coverage/execution revision was recorded: the rework of round 1's failures, and two new items.
- Coverage decisions or durable test paths changed: added MSP-36 (item 13, `mobile-shell-probe.mjs`). MSP-33 waits for the node's stored message and opens the older-runs fold after each return to the list (two test-only causes found in this round's runs).
- Cases added, changed, removed, or rechecked: rerun API-06 (API 35), API-07, API-18, API-13. New API-08b (Clipboard with the keyboard on API 34) and API-19 (MSP-36). API-17 full probe run (deferred in round 1). Reused IMP-16…20. API-02…05 and API-08…12 still valid (no build input changed; code on their paths unchanged or not reached on API 35).
- Commands, environment, fixture, or broader-validation delta: worktree builds (no fresh clone needed); new test Docker node, AVDs `abx435r2_api35/34`, isolated instance of the worktree's packaged app, a plain 403 server. All removed after the round.

#### Prior Failure Resolution

| Prior Case / Failure Reference | Previous Classification | Current Resolution | Case IDs Now Proving It |
| --- | --- | --- | --- |
| F1, API-18 (REQ-004 on Android 9–14) | Design Impact (confirmed as CR-002) | DEC-020: below API 35, full screen turns the decor's system-window fitting off and back on | API-18 (r2), API-07 (r2), API-08b, IMP-20 |
| F2, API-13 (AC-003-1 in the Electron window) | Design Impact (confirmed as CR-003) | DEC-019: a readable 403 with `REMOTE_ACCESS_HOST_REFUSED` gives `host_refused` | API-13 (r2) |

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md` (Round 2 Plan), `api-e2e-execution-coverage-report.md`, `api-e2e-test-progress.md`, `evidence/api-e2e/round2/`.
- Prior result and confidence: Fail, 79%.
- Current result and confidence: Pass, 95%.
- New or remaining failure IDs: none.
- Recommended owner: code reviewer (proportional test-code review of MSP-33…36 and MSP-05's label).
- Remaining risks, blocked evidence, or untested scope: API 26–28 not on a device; vendor cutouts (user-only); AC-009-1 is delivery's docs review; delivery note C-09 (`autobyteus-web/docs/chat.md` lines 359, 555).
