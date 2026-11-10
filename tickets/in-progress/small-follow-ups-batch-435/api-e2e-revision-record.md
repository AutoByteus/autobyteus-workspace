# API/E2E Revision Record — small-follow-ups-batch-435 (autobyteus-435)

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | code reviewer CRR-002 pass / round 1 | SR-003, ARCH-REV-003, IR-002, CRR-002 | N/A | Fail / 79% (F1, F2) |

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
