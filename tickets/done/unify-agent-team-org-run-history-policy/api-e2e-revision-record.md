# API/E2E Revision Record

## Revision Index

| Revision ID | Trigger / basis | Prior result / confidence | Current result / confidence |
| --- | --- | --- | --- |
| API-REV-001 | CRR-001 Pass; SR-004 design, IR-001 | N/A / N/A | Fail / 86% |
| API-REV-002 | CRR-003 Pass; SR-005/ARCH-REV-003, IR-002 | Fail / 86% | Pass / 95% |
| API-REV-003 | User-requested live browser import/Team/Org; CRR-004 test-code Pass | Pass / 95% | Pass / 95% (runtime caveat) |

## Revision Entries

### API-REV-001 — Initial executable validation of unified Team/Org history policy

- Trigger: `/code_reviewer` CRR-001 implementation-source Pass of `b68847a8c`; first API/E2E round. Related revisions: SR-002 approved requirements, SR-004 design, ARCH-REV-002, IR-001, CRR-001.
- Scenarios: SCN-001–004; AC-001–005; PM-001. New failure F-001 concerns SCN-003 / AC-003.
- Coverage decision: updated two existing workspace GraphQL E2E harnesses (paths in execution report), no tests added or removed. R-03's initial failures were resolved by those fixture updates and building the server; final R-03 passed 6 files/13 tests.
- Execution: R-01 28 tests, R-02 26 tests, R-03 13 tests and R-04 typecheck/build passed. L-01 direct existing-index copy and L-02 offline repair CLI passed. L-03 imported Team source kept 80 files byte-identical but read 3 trees 12 times (4/root), failing AC-003's ≤1/root bound.

#### Prior Failure Resolution

None — first completed API/E2E result. R-03's same-round setup/build failures were corrected and rerun; they are not a prior API/E2E revision.

- Canonical artifacts: `api-e2e-coverage-investigation.md` (validity, scorecard, F-001), `api-e2e-test-case-ledger.md` (case events), `api-e2e-execution-coverage-report.md` (latest authoritative result).
- Prior result/confidence: N/A / N/A. Current result/confidence: **Fail / 86%**.
- Preliminary classification: Design Impact / Requirement Gap; Code Reviewer to confirm failure origin. The unmerged Org memory-source adapter remains conditional N/A, not falsely credited. No user profile was mutated.
- Recommended recipient: `/code_reviewer` for focused failure-origin review, not successful-test-code review.

### API-REV-002 — Independent imported-Team bounded-read revalidation

- Trigger: `/code_reviewer` CRR-003 source-review Pass at `49ce0d173`, after SR-005/ARCH-REV-003 and IR-002 corrected current Team Memory DS-004. Requirements approval remains SR-002; task classification remains Medium/High.
- Prior result/confidence: API-REV-001 **Fail / 86%**. Current result/confidence: **Pass / 95%**.
- Coverage delta: added `autobyteus-server-ts/tests/e2e/memory/imported-team-memory-graphql.e2e.test.ts` (G-01), covering both imported-source GraphQL list methods with after-readiness tree counters, computed recursive SHA-256 maps, cards/run/member results. Reran the two API-REV-001-owned workspace E2E harness edits; no test removed and no product source changed by API/E2E.
- Execution delta: built IR-002 backend; L-03 copied current index + three real Team roots and independently measured three tree reads for each of Team-list and Team-run-list, 44 actual file hashes identical after both. G-01 passed (1 test). H-01 built isolated HTTP GraphQL returned 1 card/3 runs and kept 45 imported files byte-identical. R-01 35 tests, R-02 26 tests, R-03 15 tests and build/targeted typechecks passed. The generic `tsconfig.json` command has an existing TS6059 rootDir/include conflict; authoritative build config and isolated new-test config passed.

#### Prior Failure Resolution

| Prior scenario/failure | Prior classification | Current resolution | Evidence |
| --- | --- | --- | --- |
| F-001 / L-03 / AC-003: 12 tree reads for 3 admitted roots, versus ≤3 | API-REV-001 Fail; Code Reviewer CRR-002 Design Impact/CR-001 | Resolved by SR-005 design and IR-002 implementation, independently validated as 3 reads for 3 roots per request | `/tmp/api-e2e-unified-history/l03-rerun.log`; G-01 durable GraphQL test/log; H-01 built HTTP log |
| L-03 reported byte identity using a hard-coded flag | Evidence invalid for that subclaim | Replaced by actual before/after SHA-256 map comparisons | `l03-rerun-probe.mjs` (44 files), G-01 test, `h01-http.mjs` (45 files) |

- Canonical artifacts updated: `api-e2e-coverage-investigation.md` (round-2 basis/scorecard), `api-e2e-test-case-ledger.md` (events 19–34), `api-e2e-execution-coverage-report.md` (latest authoritative Pass). Earlier API-REV-001 entry is preserved.
- Remaining scope: Org imported-memory root adapter is conditional N/A until the separate memory branch merges; do not credit it now. No critical current-branch AC remains unproved; no new finding ID.
- Recommended recipient: `/code_reviewer` for proportional test-code review of G-01 and the two carried workspace E2E edits, not a new implementation-source review.

### API-REV-003 — User-requested real browser/package/Team/Org validation

- Trigger: user's explicit request to import `/Users/normy/autobyteus_org/autobyteus-agents` and `/Users/normy/autobyteus_org/autobyteus-private-agents` and execute the classroom Team and nested classroom Org in a real browser using Codex App Server / GPT-6-Luna. CRR-004 had already passed the unchanged API/E2E durable test code.
- Prior result/confidence: API-REV-002 **Pass / 95%**. Current result/confidence: **Pass / 95% with runtime caveat**. The prior F-001 remains resolved; this round did not rerun or alter its durable assertions.
- Coverage delta: added temporary browser journeys B-01–B-07; no product source, test code or CI fixture changed. Chrome imported both package roots through the UI, exercised a real professor/student file-backed Team run and nested Org delegation lifecycle. Safari verified browser reload, Team/Org persisted history, Team Memory card/member raw traces and stop/archive lifecycle. Actual SHA-256 maps of four index/tree files and 16 imported classroom definition files were unchanged across Memory reads.
- Team caveat: after the student replied, professor generation showed no new trace for about eight minutes and required browser **Stop generation** before the queued continuation ran. Professor then reviewed the student's correct 24 answer and returned `CLASSROOM_BROWSER_OK`. Do not characterize this as an autonomous no-intervention Team pass or a confirmed history-policy defect. The nested Org delegation independently completed and was accepted without this intervention.
- Confidence gate: seven applicable categories, scores 100/95/95/95/90/95/95, mean **95%**; no current-branch critical AC failure. Browser became applicable in this user-requested round. Org Memory imported-source adapter remains conditional N/A until its separate branch merges.
- Environment/cleanup: owned documented `pnpm dev` stack at 8000/3000 and isolated worktree profile; stopped and verified listeners free. UI-stopped/archived the two test histories; rows and physical trees retained in isolated profile. Safari test tab closed; inert localhost Chrome tab left to avoid the user's unrelated API-key tab. Evidence in the canonical ledger/report and `/tmp/api-e2e-unified-history/browser-*` logs/hash maps.
- Route: apply current handoff rules. CRR-004 already reviewed the only three durable API/E2E test files; no new test-code review is required for this live-only round.
