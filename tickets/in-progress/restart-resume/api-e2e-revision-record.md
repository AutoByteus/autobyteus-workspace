# API/E2E Revision Record — restart-resume (autobyteus-285)

The latest coverage investigation and execution coverage report remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code reviewer, `code-review-report.md`, CRR-001 Pass, round 1 | SR-004, ARCH-REV-002, IR-001, CRR-001 | N/A | `Fail` / 89.9% (F-API-001 `Design Impact`) |
| API-REV-002 | Code reviewer, `code-review-report.md`, CRR-003 Pass on IR-002, round 2 | SR-005, ARCH-REV-003, IR-002, CRR-002, CRR-003 | `Fail` / 89.9% | `Pass` / 95.1% |

## Revision Entries

### API-REV-001 — Baseline: two-stamp update restarts on real servers and the real desktop

- Triggering role, report path, and round: code reviewer; `code-review-report.md` (CRR-001); round 1.
- Triggering finding or case IDs: N/A.
- Related revision IDs: SR-004; ARCH-REV-002; IR-001; CRR-001.
- Why recorded: first complete API/E2E result for code `b50e2354ab`.
- Coverage decisions or durable test paths changed: none. Temporary probes `evidence/API-285-server-probe.mjs`, `evidence/API-285-desktop-probe.mjs`.
- Cases: API-R1, API-00, API-01, API-02a/API-02, API-03, API-04/04B/04C/04D, API-05a/API-05/API-05T/API-05H, API-06.
- Commands, environment, fixture, or broader-validation delta: clean checkout of `400e4d5b9c` (removed afterwards); temporary data roots only; X+1 by stamp edit (design method).

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: investigation, report, progress log.
- Prior result and confidence: N/A.
- Current result and confidence: `Fail`, 89.9%.
- New or remaining failure IDs: F-API-001 (eligibility checked before the restore; an activation in progress is not live). O-1 recorded (member notice invisible; FU-004).
- Recommended owner: failure-origin review by the code reviewer.
- Remaining risks, blocked evidence, or untested scope: Docker in-place update (infeasible); real Squirrel install (user-only); AR-003 refused copy (unit only).

### API-REV-002 — SR-005 recheck: races, member and copy display, AC-002 smoke

- Triggering role, report path, and round: code reviewer; `code-review-report.md` (CRR-003 Pass on IR-002); round 2.
- Triggering finding or case IDs: F-API-001, O-1 (via CRR-002 → SR-005 → IR-002).
- Related revision IDs: SR-005; ARCH-REV-003; IR-002; CRR-002; CRR-003.
- Why recorded: the second complete API/E2E result, for code `82932a8b48` and `7d9a305627` (review `8fd49bd25a`).
- Coverage decisions or durable test paths changed: none in the repository. The temporary probes gained:
  - `RACE_SPEC` with per-target verdicts;
  - a model call log of order and kind;
  - the copy member projection in P2;
  - a `CONNECTED` wait;
  - `WITH_COPY` and `CASE_ID`.
- Cases:
  - Reused: API-R2 (IMP-07..10), API-01 (plus the bundle reread), API-04D.
  - Rerun: API-00, API-03-r2, API-04-r2, API-04B-r2, API-04C-r2 (first run kept as `-r2a`), API-02-r2, API-05T-r2, API-06-r2.
  - New: API-04E, in samples s1, s2 and s3.
- Commands, environment, fixture, or broader-validation delta: a new clean checkout of `8fd49bd25a` in `rr285-api2.fcgHSg`, removed afterwards; temporary data roots only; the desktop journey adds the host and its copy.

#### Prior Failure Resolution

| Prior failure | Recheck | Result |
| --- | --- | --- |
| F-API-001 (a): archived during restore, still resumed | API-04-r2, 04B-r2, 04C-r2; API-04E (21 archive targets) | Resolved: archive succeeded → not resumed (10), no notice, no model call; archive refused while active → resumed (11); two live cases `skipped … archived (after the restore)` |
| F-API-001 (b): user's message before the post, notice turn ran first | API-04-r2, 04B-r2, 04C-r2; API-04E (21 message targets) | Resolved: input admitted first refuses the notice (`already had input`; first model call is the user's message, with no notice in history) in 7 sweep cases and in all 3 live cases; otherwise notice → user (14) |
| O-1: member notice invisible | API-03-r2, API-02-r2, API-05T-r2 | Resolved: member, Org agent and copy have 1 notice in memory; shown once as a system notice when opened later and after a reload |

- Canonical artifacts and sections updated:
  - investigation, § Round 2;
  - report, rewritten for round 2, with round 1 kept as history;
  - progress log.
- Prior result and confidence: `Fail`, 89.9%.
- Current result and confidence: `Pass`, 95.1%.
- New or remaining failure IDs: none.
  - O-2 (observation): an archive during the restore is logged "could not resume", not "skipped".
  - API-04C-r2a probe artifact: a send before the server's `CONNECTED` is not handled.
- Recommended owner: code reviewer, for proportional test-code review (probes only).
- Remaining risks, blocked evidence, or untested scope: Docker in-place update (infeasible); real Squirrel install (user-only); AR-003 refused copy (unit only).
