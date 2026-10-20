# API/E2E Revision Record — autobyteus-191

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code Reviewer, `code-review-report.md` CRR-002; round 1, cut short by the Solution Designer's hold (ARCH-REV-003) | SR-014, SR-015, ARCH-REV-002, ARCH-REV-003, IR-002, CRR-002 | N/A | Fail (F-001; partial round) / 49% |
| API-REV-002 | Code Reviewer, `code-review-report.md` CRR-004; round 2 | SR-015, SR-016, ARCH-REV-004, ARCH-REV-006, IR-003, CRR-003, CRR-004 | Fail (F-001; partial) / 49% | Fail (F-002) / 85% |
| API-REV-003 | Code Reviewer, `code-review-report.md` CRR-006; round 3 | SR-017, ARCH-REV-007, IR-004, CRR-005, CRR-006 | Fail (F-002) / 85% | Pass / 95% |

## Revision Entries

### API-REV-001 — Baseline: two-server E2E written; settings and gateway validated; delegation held

- Triggering role, report path, and round: Code Reviewer, `code-review-report.md` (CRR-002, Pass), round 1. During the round the Solution Designer held change-sequence steps 3–6 (ARCH-REV-003 Fail / Design Impact; SR-015 `f1d7dd9337`, documents only).
- Triggering finding or case IDs: none on entry; F-001 found in this round.
- Related revision IDs: SR-014, SR-015, ARCH-REV-002, ARCH-REV-003, IR-002, CRR-002.
- Why this baseline was recorded: the first API/E2E result (a partial one).
- Coverage decisions or durable test paths changed: added `autobyteus-server-ts/tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts` (RC-01 … RC-20; RC-01, RC-03 and RC-20 executed).
- Cases added, changed, removed, or rechecked: API-00, API-01, API-03, API-20 run; API-R1 … API-R4 reused; the rest held.
- Commands, environment, fixture, or broader-validation delta: two built server processes with clean environments and capturing proxies (ENV-1).

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md` (Planned Cases, Ambiguities), `api-e2e-execution-coverage-report.md`, `api-e2e-test-progress.md`, `evidence/api-e2e/`.
- Prior result and confidence: N/A
- Current result and confidence: Fail (partial) / 49%
- New or remaining failure IDs: F-001
- Recommended owner: Implementation Engineer (`Local Fix`, after the code reviewer's failure-origin review)
- Remaining risks, blocked evidence, or untested scope: every delegation and messaging case, the switch-on regression suites and the browser journey wait for the SR-015 code; AC-113 is the user's.

### API-REV-002 — Full two-server run on IR-003; F-001 resolved; F-002 found

- Triggering role, report path, and round: Code Reviewer, `code-review-report.md` (CRR-004, Pass of IR-003 `31d46978ad`), round 2.
- Triggering finding or case IDs: F-001 (recheck); every case held in round 1.
- Related revision IDs: SR-015, SR-016, ARCH-REV-004, ARCH-REV-006, IR-003, CRR-003 (failure-origin review of F-001), CRR-004.
- Why this revision was recorded: the first full execution of the slice.
- Coverage decisions or durable test paths changed:
  - `remote-delegation-two-server.e2e.test.ts` was fixed after its first full execution. These were expectation and sequencing errors in the test (listed in the report's Durable Coverage section).
  - RC-15 … RC-19 now use the standalone delegator.
  - `REMOTE_E2E_KEEP_DATA_DIR` was added for diagnosis.
- Cases added, changed, removed, or rechecked:
  - API-01 … API-20: all executed. The authoritative run is r2-3: 19 pass, and API-13 fails on F-002.
  - API-22 (switch on) executed: 36/37 files pass. The failing file is FU-003, outside this ticket.
  - API-23 (browser) executed.
  - API-21 moves to round 3.
- Commands, environment, fixture, or broader-validation delta: ENV-2/3/4 (report); dist rebuilt at API-00 round 2.

#### Prior Failure Resolution

| Prior Case / Failure Reference | Previous Classification | Current Resolution | Case IDs Now Proving It |
| --- | --- | --- | --- |
| F-001 (API-03, round 1) | Local Fix (CRR-003: CR-002) | Resolved: a reached non-AutoByteus URL (HTML page or 404) is refused `PEER_NOT_AUTOBYTEUS` "<url> is not an AutoByteus node." | API-03 (RC-03, run r2-3) |

- Canonical artifacts and sections updated:
  - `api-e2e-coverage-investigation.md`: meta, Planned Cases, Ambiguities.
  - `api-e2e-execution-coverage-report.md`: rewritten for round 2.
  - `api-e2e-test-progress.md`, `follow-ups.md` (FU-003), `evidence/api-e2e/`.
- Prior result and confidence: Fail (F-001, partial round) / 49%
- Current result and confidence: Fail (F-002) / 85%
- New or remaining failure IDs: F-002
- Recommended owner: Solution Designer, then the Implementation Engineer (preliminary `Design Impact`), after the code reviewer's failure-origin review.
- Remaining risks, blocked evidence, or untested scope:
  - API-21 (switch-off same-node suites) waits for the F-002 fix.
  - AC-113 is the user's check.

### API-REV-003 — F-002 fix validated; Pass

- Triggering role, report path, and round: Code Reviewer, `code-review-report.md` (CRR-006, Pass of IR-004 `7a5a9af077`), round 3.
- Triggering finding or case IDs: F-002 (recheck in API-13); the planned API-21.
- Related revision IDs: SR-017, ARCH-REV-007, IR-004, CRR-005 (failure-origin review of F-002), CRR-006.
- Why this revision was recorded: rerun by impact after the F-002 fix.
- Coverage decisions or durable test paths changed:
  - RC-13 checks that the Team and Org runs reopen after alpha's restart and after a new root, and that the woken delegators follow up.
  - The RC-20 key-shape heuristic is anchored and case-sensitive, after a false positive on a random message ID in r3-2.
- Cases added, changed, removed, or rechecked:
  - API-00 and API-01 … API-20 (four runs: r3-1 20/20, r3-2 19/20 on the test's false positive, r3-3 and r3-4 20/20 with the final file);
  - API-21 (new) and API-22 (rerun);
  - API-23 reused (by diff);
  - API-24 tried, not run.
- Commands, environment, fixture, or broader-validation delta:
  - ENV-5/6 on `7a5a9af077`;
  - ENV-7, a temporary base worktree, to bisect the race in `task-reactivation-root-visibility` (FU-004).

#### Prior Failure Resolution

| Prior Case / Failure Reference | Previous Classification | Current Resolution | Case IDs Now Proving It |
| --- | --- | --- | --- |
| F-002 (API-13, round 2) | Design Impact (CRR-005 → SR-017, IR-004) | Resolved. After alpha restarts, replies from beta restore the Team and Org roots and wake their delegators. The runs reopen after a new root re-scans the packages, and the delegators follow up. | API-13 (r3-1, r3-3, r3-4); API-21/22 |

- Canonical artifacts and sections updated:
  - `api-e2e-coverage-investigation.md`: meta, Planned Cases (API-24), Ambiguities;
  - `api-e2e-execution-coverage-report.md`: rewritten for round 3;
  - `api-e2e-test-progress.md`;
  - `follow-ups.md` (FU-004);
  - `evidence/api-e2e/`.
- Prior result and confidence: Fail (F-002) / 85%
- Current result and confidence: Pass / 95%
- New or remaining failure IDs: none in scope. FU-003 and FU-004 are outside this ticket.
- Recommended owner: the Code Reviewer, for the proportional test-code review.
- Remaining risks, blocked evidence, or untested scope:
  - AC-113 (only the user can check);
  - RSK-106 (accepted, FU-002).
