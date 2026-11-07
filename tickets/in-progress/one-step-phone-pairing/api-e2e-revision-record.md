# API/E2E Revision Record — one-step-phone-pairing

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code reviewer, code-review-report.md CRR-001, round 1 | SR-014, ARCH-REV-003, IR-001, CRR-001 | N/A | Fail / 91% |

## Revision Entries

### API-REV-001 — Baseline: desktop, Docker, remote, Linux, Android and pre-change data; one locale defect

- Triggering role, report path, and round: code reviewer, [code-review-report.md](code-review-report.md), round 1 (head `27b24037dd`, code `55fdae0a34`).
- Triggering finding or case IDs: CR-C07 (stale MSP-09); the handoff's unrun list (AC-004, AC-005, AC-013, AC-014, Linux, `file://`, Serve, QR-004, bridge abuse, camera).
- Related revision IDs: SR-014, ARCH-REV-003, IR-001, CRR-001.
- Why recorded: first API/E2E result.
- Coverage decisions or durable test paths changed: `mobile-shell-probe.mjs` setup, MSP-06, MSP-09 updated (REQ-011, REQ-019, DEC-018, AC-015, AC-016); `TESTING.md` fresh-start rule for the Android build.
- Cases: API-01…API-18 and the QR-001 log check (investigation plus API-17 and API-18 added during execution).
- Commands, environment, fixture, or broader-validation delta: baseline (report's Tested Builds And Environments).

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: coverage investigation, execution coverage report, test progress log, follow-ups.md (FU-004, FU-005), evidence `API-05`…`API-18`.
- Prior result and confidence: N/A
- Current result and confidence: `Fail`, 91%
- New or remaining failure IDs: API-17 (phones list dates in the OS locale)
- Recommended owner: implementation engineer (`Local Fix`), after the code reviewer's failure-origin review
- Remaining risks, blocked evidence, or untested scope: AC-006 after-setup (U-006), Scan with a real camera (API-13), AC-005 on a second physical computer — user checks.
