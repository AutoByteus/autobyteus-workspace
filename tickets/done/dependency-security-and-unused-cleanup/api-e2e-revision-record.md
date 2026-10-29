# API/E2E Revision Record — dependency-security-and-unused-cleanup

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code Reviewer, `code-review-report.md` (CRR-001), round 1 | SR-005 (DEC-001…DEC-008), ARCH-REV-005, IR-003, CRR-001 | N/A | Pass / 95.0% |

## Revision Entries

### API-REV-001 — Design step 7: full rerun on base and branch, packaged app, Docker, fresh audit

- Triggering role, report path, and round: Code Reviewer, `code-review-report.md` (CRR-001, Pass), round 1
- Triggering finding or case IDs: none (initial validation)
- Related revision IDs: SR-005, ARCH-REV-005, IR-003, CRR-001
- Why this baseline was recorded: first complete API/E2E result for AC-001…AC-008.
- Coverage decisions or durable test paths changed: none.
- Cases:
  - reused: API-R01 (IMP-05, IMP-11);
  - added: API-01…API-13 (install, audit, every build and suite on base and branch, LM Studio `undici`, DEC-007 over real HTTP), API-20 (packaged app and harness), API-21 (isolated instance conversation rendering), API-30 (Docker).
- Commands, environment, fixture, or broader-validation delta: test-owned base worktree at `3b2c86ca9e`; LM Studio model loaded just in time; packaged harness with `--skip-build` (FU-013).

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-progress.md` (new); `follow-ups.md` (FU-011, FU-012, FU-013); `evidence/API-*`
- Prior result and confidence: N/A
- Current result and confidence: Pass, 95.0% (94.7% before API-13 closed the axios gap)
- New or remaining failure IDs: none in scope. The diagnosed pre-existing ones are FU-011, base load timeout, FU-013.
- Recommended owner: N/A
- Remaining risks, blocked evidence, or untested scope: packaged Linux/Windows builds not run (no host; CI at release); no live paid-provider call; FU-008/FU-010 did not recur in this run.
