# API/E2E Revision Record — memory-sync-large-files (Project Task autobyteus-workspace-7)

The latest `api-e2e-coverage-investigation.md` and `api-e2e-execution-coverage-report.md` remain authoritative; this record holds the baseline and each round's delta.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | `code_reviewer`, `code-review-report.md` CRR-002 (Pass), round 1 | SR-004 / ARCH-REV-003 / IR-002 / CRR-001, CRR-002 | N/A | `Fail` on AC-003 only (Requirement Gap, routed to Solution Designer); final confidence 90% |
| API-REV-002 | `solution_designer`, `handoff-sr-005.md` (SR-005, DEC-008), round 2 | SR-005 (requirements AC-003/QR-002); design SR-004 unchanged | `Fail` / 90% | `Fail` on OBS-1 only (Local Fix); AC-003 Proven; final confidence 91% |
| API-REV-003 | `code_reviewer`, `code-review-report.md` CRR-004 (Pass), round 3 | IR-003, CRR-003/CRR-004; SR-005 | `Fail` / 91% | `Pass` / 93% |

## Revision Entries

### API-REV-001 — Baseline: independent validation of the large-file Memory Sync package

- Triggering role, report path, and round: Code Reviewer, `code-review-report.md`, review round 2 (CRR-002, Pass); API/E2E round 1.
- Triggering finding or case IDs: residual risks 1-4 of CRR-002: AC-003/QR-002 cold vs warm RSS; the card checked only under jsdom; the checks the implementation did not run (full server unit suite, web typecheck, `agent-semantic-memory.e2e`); suggested scenarios (Sync now during a background upload, hub restart during an upload, hub as the user's own node).
- Related architecture-design, architecture-review, implementation, code-review, or delivery revision IDs: SR-004, ARCH-REV-003, IR-001/IR-002, CRR-001/CRR-002; no delivery revision.
- Why this baseline was recorded: first API/E2E round on code `077fa6853` (documents at `bfcd82366`).
- Coverage decisions or durable test paths changed: none. All durable memory-sync unit and e2e coverage stayed `Still Valid`; no durable test was added, updated or removed. `TESTING.md` gained a "Node version" rule (own commit).
- Cases added, changed, removed, or rechecked: API-01, 02, 02b, 03, 03b, 05, 05b, 06a-c, 07, 08, 09, 10, 11, 12 run; API-04 `Reused` (IMP-03). Temporary probes (AC-003 measurement, rendered card, lifecycle/gate) stored in `evidence/probes-api-e2e/`.
- Commands, environment, fixture, or broader-validation delta: Node 22 (release), Node 24 (desktop runtime) and Node 26 (machine default); two real built servers; Chrome on a Nuxt dev server; fresh clone with frozen install; broader validation `Required` and executed.

#### Prior Failure Resolution

None. (CRR-001's CR-001 was resolved by the implementation in `077fa6853` before this round.)

- Canonical artifacts and sections updated: created `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-progress.md`; `follow-ups.md` FU-003; evidence under `evidence/`.
- Prior result and confidence: N/A
- Current result and confidence: `Fail` on AC-003 as written; all other acceptance criteria proven; final confidence 90% (requirement proof 75%, the rest 90-95%).
- New or remaining failure IDs: AC-003 (case API-07). Observations OBS-1 (card word breaks), OBS-2 (hub reason repeats path), OBS-3 (zero-byte partial after a refused piece) are non-blocking. FU-003 (web typecheck gate fails on base) is out of scope and urgent for delivery.
- Recommended owner: Solution Designer (`Requirement Gap`: cold or steady-state, which Node). A `Design Impact` follows only if cold on Node 24 binds.
- Remaining risks, blocked evidence, or untested scope: packaged desktop build (stops at FU-003; signing needs the runner); Electron-embedded Node approximated by Node 24.15.0; a torn piece after a kill mid-write not hit; 24 h staging expiry by unit clock; no remote network (FU-002).

### API-REV-002 — SR-005 ruling on AC-003/QR-002, and OBS-1 promoted to a Local Fix

- Triggering role, report path, and round: Solution Designer, `handoff-sr-005.md`, API/E2E round 2.
- Triggering finding or case IDs: API-07 (AC-003); OBS-1, OBS-2, OBS-3 of API-08/API-11.
- Related architecture-design, architecture-review, implementation, code-review, or delivery revision IDs: SR-005 (requirements restated; design SR-004, ARCH-REV-003 unchanged); IR-002; CRR-002.
- Why this revision was recorded: the Solution Designer ruled DEC-008: the first transfer of a fresh process counts, on Node 22 and the desktop's Node 24; AC-003/QR-002 now require peak RSS growth over idle below 400 MiB for 2 GiB and ≥ 4 GiB files with equal SHA-256. OBS-1 belongs to this ticket (REQ-007, AC-010); OBS-2 is FU-005; OBS-3 is accepted.
- Coverage decisions or durable test paths changed: none; no durable test added, updated or removed.
- Cases added, changed, removed, or rechecked: API-07 rejudged against the new wording on the round-1 data, not rerun (the code did not change since `077fa6853`; `git diff --name-only 077fa6853 HEAD` is documents only): `Pass`. API-08 `Fail` (OBS-1). API-06a (card spec) and API-08 will rerun on the fix's commit.
- Commands, environment, fixture, or broader-validation delta: none this round.

#### Prior Failure Resolution

| Prior Case / Failure Reference | Previous Classification | Current Resolution | Case IDs Now Proving It |
| --- | --- | --- | --- |
| API-REV-001 AC-003 (cold growth above 200 MiB on Node 24/26) | `Requirement Gap` | Resolved by SR-005: the bound is 400 MiB, first transfer included; Node 22 max 171.8 / 103.8 and Node 24 max 362.9 / 270 MiB (source / hub) are below it | API-07 |
| API-REV-001 OBS-1 (card row words split) | non-blocking observation | Promoted to `Local Fix` by SR-005; open until the fix is re-validated | API-08 (to rerun) |

- Canonical artifacts and sections updated: execution report (Round, API-07, API-08, Acceptance-Criteria Proof, scorecard, Observations, Classification, Result), coverage investigation (round, ambiguities).
- Prior result and confidence: `Fail` / 90%
- Current result and confidence: `Fail` (OBS-1 only) / 91%
- New or remaining failure IDs: OBS-1 (API-08).
- Recommended owner: implementation engineer (`Local Fix`), through the code reviewer's failure-origin review.
- Remaining risks, blocked evidence, or untested scope: unchanged from API-REV-001 except AC-003, which is closed. FU-003, FU-004, FU-005 are follow-ups.

### API-REV-003 — OBS-1 Local Fix re-validated

- Triggering role, report path, and round: Code Reviewer, `code-review-report.md` CRR-004 (targeted delta review of IR-003, Pass); API/E2E round 3.
- Triggering finding or case IDs: API-08 (OBS-1 / CR-002).
- Related architecture-design, architecture-review, implementation, code-review, or delivery revision IDs: IR-003 (code `542bf871f`), CRR-003/CRR-004, SR-005.
- Why this revision was recorded: the implementation fixed the failing card case; rerun on the fix.
- Coverage decisions or durable test paths changed: none; the card spec was not changed.
- Cases added, changed, removed, or rechecked: API-08 rerun with new DOM assertions (computed `word-break` per row and per path span; per-character line check for split short Latin words) and a negative control; API-06a rerun. Not rerun: all others (change = two class names in `MemorySyncCard.vue`).
- Commands, environment, fixture, or broader-validation delta: probe extended (`evidence/probes-api-e2e/card-probe.mjs`, `CONTROL_BREAK_ALL=1` for the control); evidence `API-08-card-browser-round2-after-fix/`, `API-08-card-browser-round2-negative-control/`, `API-06a-web-specs-round2.log`.

#### Prior Failure Resolution

| Prior Case / Failure Reference | Previous Classification | Current Resolution | Case IDs Now Proving It |
| --- | --- | --- | --- |
| API-REV-002 OBS-1 (card row words split) | `Local Fix` | Fixed in `542bf871f`: rows `word-break: normal` + `overflow-wrap: break-word`, path span `break-all`; 0 split short Latin words of 476 (en) / 436 (zh-CN); the control detects 21 / 2 | API-08, API-06a |

- Canonical artifacts and sections updated: execution report (Round, Tested Builds, API-08, Acceptance-Criteria Proof, scorecard, Observations, Result), coverage investigation round.
- Prior result and confidence: `Fail` / 91%
- Current result and confidence: `Pass` / 93%
- New or remaining failure IDs: None.
- Recommended owner: N/A.
- Remaining risks, blocked evidence, or untested scope: packaged desktop build blocked by the base typecheck failure (FU-003); Electron's own Node approximated by Node 24.15.0; torn piece after a kill mid-write not hit; 24 h expiry by unit clock.
