# API/E2E Revision Record — automatic-app-node-updates (autobyteus-356)

The latest coverage investigation and execution coverage report remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code reviewer, `code-review-report.md`, CRR-001 Pass, round 1 | SR-003, ARCH-REV-002, IR-001, CRR-001 | N/A | `Fail` / 86.1% (F-API-001 `Local Fix`; F-API-002 `Local Fix` + `Design Impact` part) |
| API-REV-002 | Code reviewer, `code-review-report.md`, CRR-003 Pass on IR-002, round 2 | SR-003, IR-002, CRR-002, CRR-003 | `Fail` / 86.1% | `Fail` / 88.7% (F-API-003 `Design Impact`) |
| API-REV-003 | Code reviewer, `code-review-report.md`, CRR-005 Pass on IR-003, round 3 | SR-004..SR-006, IR-003, CRR-004, CRR-005 | `Fail` / 88.7% | `Pass` / 93.9% (residual O-6) |

## Revision Entries

### API-REV-001 — Baseline: real automatic install on isolated copies; real nodes

- Triggering role, report path, and round: code reviewer; `code-review-report.md` (CRR-001); round 1.
- Triggering finding or case IDs: N/A.
- Related revision IDs: SR-003; ARCH-REV-002; IR-001; CRR-001.
- Why recorded: first complete API/E2E result for code `31d38080fc` (review `e8b51df9ad`).
- Coverage decisions or durable test paths changed: none. Temporary harness `evidence/API-356-*`:
  - feed, copy preparation, watch, drive, busy agent;
  - node proxy, nodes, Dockerfile, package maker, release source.
- Cases: API-R1, API-00, API-01..API-10.
- Commands, environment, fixture, or broader-validation delta:
  - a clean checkout of `e8b51df9ad`, with V1 and V2 builds;
  - test copies with their own identity, `LSEnvironment` and an explicit-requirement ad hoc signature, so the real Squirrel install and relaunch stay isolated (discovery in the investigation);
  - test-owned nodes on the published 1.5.11-beta.7 image with a throwaway key.

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: investigation, report, progress log.
- Prior result and confidence: N/A.
- Current result and confidence: `Fail`, 86.1%.
- New or remaining failure IDs:
  - F-API-001: the sidebar entry says "0 updated" after an automatic app update.
  - F-API-002: after a native install refusal the old version stays open without its server and is not relaunched; the state message is also overwritten by a download error.
- Recommended owner: failure-origin review by the code reviewer.
- Remaining risks, blocked evidence, or untested scope:
  - Windows/Linux;
  - Developer ID signed install (user-only);
  - the quit-bound and catch paths (unit only);
  - switching on while downloaded or staged (unit only).

### API-REV-002 — IR-002 recheck; a busy-machine failure of the quit bound

- Triggering role, report path, and round: code reviewer; `code-review-report.md` (CRR-003 Pass on IR-002); round 2.
- Triggering finding or case IDs: F-API-001, F-API-002.
- Related revision IDs: SR-003; IR-002; CRR-002; CRR-003.
- Why recorded: second complete result, for code `6a94169f4f` (review `f1c4641b08`).
- Coverage decisions or durable test paths changed: none in the repository. Added `evidence/API-356-ro-samples.sh` and `evidence/API-356-page-*.js`.
- Cases:
  - Rerun: API-00, API-01 (app), API-02, API-03, API-04, API-05 (9 samples), API-10.
  - New: API-02B (idle), API-02C (throttled), API-02D (busy machine), API-05C (broken package).
  - Reused: API-R2, API-01 (nodes), API-06..09.
  - Planned but not run: API-05B (see the report's Deviations).
- Commands, environment, fixture, or broader-validation delta: new clean checkout and run root, removed afterwards; no Docker this round.

#### Prior Failure Resolution

| Prior failure | Recheck | Result |
| --- | --- | --- |
| F-API-001: sidebar "0 updated" | API-02-r2, on a real automatic restart, no record edit | Resolved: "1 updated"; name "1 update applied automatically: 1 updated automatically"; kept while the panel is open; gone after close |
| F-API-002: no relaunch, app without its server | API-05-r2 (9 samples), API-05C | Resolved: a read-only refusal cancels before anything stops (server stays, 9 of 9); a broken-package refusal after the stop relaunches once with its server. Failure recorded once as `install`; the message stays the install failure; V2 is not downloaded again |

- Corrections to round 1: see the report's § Corrections To Round 1, including one point that differs from CRR-003 (the refusal's timing).
- Canonical artifacts and sections updated: investigation § Round 2, report, progress log.
- Prior result and confidence: `Fail`, 86.1%.
- Current result and confidence: `Fail`, 88.7%.
- New or remaining failure IDs: F-API-003 (the 60 s quit bound fails a normal install on a busy machine). Observations O-3, O-4, O-5.
- Recommended owner: failure-origin review by the code reviewer.
- Remaining risks, blocked evidence, or untested scope: see the report's Not Tested.

### API-REV-003 — The macOS install wait on real Squirrel

- Triggering role, report path, and round: code reviewer; `code-review-report.md` (CRR-005 Pass on IR-003); round 3.
- Triggering finding or case IDs: F-API-003; CR-C19 (F-15, N-13, N-19).
- Related revision IDs: SR-004..SR-006; IR-003; CRR-004; CRR-005.
- Why recorded: third complete result, for code `2e64cbb3d9` (review `99b53b84e8`).
- Coverage decisions or durable test paths changed: none in the repository. Added `evidence/API-356-journey.sh`, `API-356-staged.sh` and `API-356-sampler.mjs`.
- Cases:
  - Run: API-00, API-02B, API-02D, API-03, API-05, API-05C, API-10, API-11 (with API-11a/b/c), API-12a/b/c, API-13.
  - Reused: API-01, API-04, API-06..09.

#### Prior Failure Resolution

| Prior failure | Recheck | Result |
| --- | --- | --- |
| F-API-003: the quit bound fails a normal install on a busy machine | API-02D-r3 under a full build (load up to ~400), API-02B-r3, API-03-r3 | Resolved: the wait absorbed 81 s; the bound now measures 0.1 s from stop to quit; no false failure |

- Canonical artifacts and sections updated: investigation § Round 3, report (round 3 current, rounds 1 and 2 kept), progress log.
- Prior result and confidence: `Fail`, 88.7%.
- Current result and confidence: `Pass`, 93.9%.
- New or remaining failure IDs: none.
  - Residual O-6 (N-19): a second native fetch over a running one blocks V, cleanly.
- Recommended owner: code reviewer, for proportional test-code review.
- Remaining risks, blocked evidence, or untested scope:
  - the live 15-minute bound;
  - path (a);
  - Windows/Linux;
  - Developer ID (user-only).
