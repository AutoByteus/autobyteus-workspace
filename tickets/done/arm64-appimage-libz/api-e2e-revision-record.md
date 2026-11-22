# API/E2E Revision Record — arm64-appimage-libz (autobyteus-28)

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code Reviewer, `code-review-report.md` CRR-001, round 1 | SR-002, ARCH-REV-002, IR-002, CRR-001 | N/A | `Fail` on AE-11 (rerouted, `Design Impact`), AC-001..AC-005 proven / 91% |
| API-REV-002 | Solution Designer, `handoff-sr003-evidence-decision.md` DEC-006, round 1 finalization | SR-003 | `Fail` (AE-11 reroute) / 91% | `Pass` / 95% |

## Revision Entries

### API-REV-001 — Baseline validation: arm64 static runtime proven; extract-and-run leaves the extracted app behind

- Triggering role, report path, and round: `/code_reviewer`, `code-review-report.md` (CRR-001 Pass), round 1.
- Triggering finding or case IDs: none (baseline); new finding AE-11.
- Related revision IDs: SR-002, ARCH-REV-002, IR-002, CRR-001.
- Why this baseline was recorded: first API/E2E result.
- Coverage decisions or durable test paths changed: added `scripts/tests/test_desktop_release_clean_image_step.py` (AE-08).
- Cases added, changed, removed, or rechecked: AE-01..AE-08 and AE-11 run; AE-09 and AE-10 reused (IMP-08, IMP-10/IMP-03).
- Commands, environment, fixture, or broader-validation delta: clean Ubuntu 24.04 arm64 roots (ENV-3, ENV-4), CI artifacts of run 44956618584, published v1.5.14-beta.6 assets.

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md` (plan; AE-11 added under Ambiguities Or Reroute Triggers), `api-e2e-execution-coverage-report.md`, `api-e2e-test-progress.md`, `evidence/api-e2e/`.
- Prior result and confidence: N/A
- Current result and confidence: `Fail` on AE-11 (rerouted as `Design Impact`); AC-001..AC-005 proven; 91% overall, lifecycle 75%.
- New or remaining failure IDs: AE-11.
- Recommended owner: Solution Designer.
- Remaining risks, blocked evidence, or untested scope: FUSE 3 mount start (DEC-005); x64 same-commit electron-builder 25 baseline not built (no x64 host); RSK-003, R-3, R-5, R-6 as recorded upstream.

### API-REV-002 — Round 1 finalized: AE-11 accepted (DEC-006)

- Triggering role, report path, and round: `/solution_designer`, `handoff-sr003-evidence-decision.md` (SR-003, DEC-006), round 1.
- Triggering finding or case IDs: AE-11.
- Related revision IDs: SR-003 (requirements, ACs and design SR-002 unchanged).
- Why this coverage/execution revision was recorded: the evidence decision accepts the extract-and-run leftover (RSK-004, FU-004, docs note), so round 1 can be finalized.
- Coverage decisions or durable test paths changed: None.
- Cases added, changed, removed, or rechecked: AE-11 result changed from `Fail` to `Accepted Unverified Risk (DEC-006)`. No case was rerun; the source and the build are unchanged (`git diff --name-only a84bb94011 433c2abbd4` touches only `tickets/`).
- Commands, environment, fixture, or broader-validation delta: none. The test environment `/tmp/ae28` was removed.

#### Prior Failure Resolution

| Prior Case / Failure Reference | Previous Classification | Current Resolution | Case IDs Now Proving It |
| --- | --- | --- | --- |
| AE-11 extract-and-run leaves `$TMPDIR/appimage_extracted_*` | `Design Impact` | Accepted risk DEC-006 / RSK-004; docs note (delivery docs sync); FU-004 | AE-11 (behavior measured), AE-06 (start proven) |

- Canonical artifacts and sections updated: execution report (Round, Cases AE-11, Acceptance-Criteria Proof AC-002, Scorecard, Cleanup, Preliminary Classification, Latest Authoritative Result); test progress log.
- Prior result and confidence: `Fail` (AE-11 reroute) / 91%.
- Current result and confidence: `Pass` / 95%.
- New or remaining failure IDs: None.
- Recommended owner: `/code_reviewer` (proportional test-code review).
- Remaining risks, blocked evidence, or untested scope:
  - DEC-005 (FUSE 3 mount), DEC-006 (extract-and-run leftover).
  - RSK-003, R-3, R-5, R-6.
  - No same-commit x64 electron-builder 25 baseline.
