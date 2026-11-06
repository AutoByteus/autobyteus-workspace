# API/E2E Revision Record — mobile-experience-redesign (autobyteus-277)

The coverage investigation and the execution coverage report are the current truth; this file is the history.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | code_reviewer, code-review-report.md CRR-002 Pass, round 1 | SR-003, SR-004, ARCH-REV-002, IR-002, CRR-002 | N/A | Fail / 81% |

## Revision Entries

### API-REV-001 — Baseline: the rebuilt phone shell on real nodes, the Android shell, WebKit and the desktop regression

- Triggering role, report path, and round: code_reviewer, [code-review-report.md](code-review-report.md) CRR-002 (Pass), round 1.
- Triggering finding or case IDs: the handoff's "Not run" list (browser probe, two-server remote case, Android, iOS, R-001/R-002, 401, fresh-run-auto-approval, desktop regression).
- Related revision IDs: SR-003 (requirements), SR-004 (design), ARCH-REV-002, IR-002, CRR-002.
- Why recorded: the first completed API/E2E result.
- Coverage decisions or durable test paths changed: added `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` (`test:e2e:mobile-shell`); updated the phone paths of `node-vocabulary-probe.mjs` (NVP-04), `large-runs-load-less-cases.mjs` (LRL-004), `workspace-views-chooser-cases.mjs` (WVC-004) and `owner-scoped-file-reads-probe.mjs` (B-006, B-007), which still drove the removed Home, tabs and work picker.
- Cases: API-01…05, MSP-01…14, UPD-NVP, UPD-LRL-004, UPD-WVC-004, UPD-OSR, DSK-01…03, ADR-01…05, IOS-01, IOS-02.
- Commands, environment, broader validation: real two-node stack from this worktree's server build with the production phone bundle; Android 15 emulator with this worktree's debug APK; WebKit 26.0; iOS 26.1 Safari.

#### Prior Failure Resolution

None.

- Canonical artifacts updated: coverage investigation, execution coverage report, test progress log, `follow-ups.md` (FU-002…FU-006).
- Prior result and confidence: N/A.
- Current result and confidence: Fail, 81% (requirement proof 50%, user surface 60%).
- New or remaining failure IDs: F-01…F-09 (execution report, Findings).
- Recommended owner: code_reviewer for failure-origin review; preliminary: implementation for F-01…F-06, Solution Designer for F-07, F-08 (Design Impact) and F-09 (prerequisite candidate).
- Remaining risks, blocked evidence, or untested scope: QR-003 and AC-005's confirmation on the user's phone; his Android device; a paired iOS Safari session (IOS-02 in WebKit covers the paired screens).
