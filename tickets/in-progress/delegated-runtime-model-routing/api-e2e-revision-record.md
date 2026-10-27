# API/E2E Revision Record — autobyteus-32

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code Reviewer, `code-review-report.md` (CRR-002 Pass), round 1 | SR-017, ARCH-REV-003, IR-002, CRR-002 | N/A | Fail / 81% |
| API-REV-002 | Code Reviewer, `code-review-report.md` (CRR-004 Pass, Full Re-Audit), round 2 | SR-018, ARCH-REV-004, IR-003, CRR-004 | Fail / 81% | Pass / 95% |

## Revision Entries

### API-REV-001 — Baseline: routing E2E, peer contract, live router checks, Docker peer; confinement fails on Codex and Claude

- Triggering role, report path, and round: `/software_engineering_team/code_reviewer`, `code-review-report.md` CRR-002, round 1
- Triggering finding or case IDs: the review's API/E2E asks: live confinement (Codex, Claude), a ~45 s routed delegation per runtime, the Docker peer, the 303 live-agents fold, C-05, the user's desktop check
- Related revision IDs: SR-017, ARCH-REV-003, IR-002, CRR-002
- Why recorded: the first completed validation result
- Coverage decisions or durable test paths changed:
  - added `tests/e2e/model-routing/model-routing-delegation.e2e.test.ts` (MR-01…09);
  - the scripted router in `tests/fixtures/agy-failure-cli.mjs`;
  - RC-39…41, plus older RC expectations brought to the ticket's peer contract;
  - IA-01;
  - the 303 live-agents test folded (cherry-picked) with LR-3 added.
- Cases added, changed, removed, or rechecked: as above; API-14 and API-15 Not Tested (deferred to the fixed build)
- Commands, environment, fixture, or broader-validation delta: ENV-1…ENV-5 and ENV-B (base comparison) in the report

#### Prior Failure Resolution

None

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-progress.md`, `evidence/api-e2e/*`, `follow-ups.md` (FU-007…FU-009)
- Prior result and confidence: N/A
- Current result and confidence: Fail, 81%
- New or remaining failure IDs:
  - F-1: Codex router sandbox widened by a workspace `.codex/config.toml`.
  - F-2: the Claude router has the user's claude.ai connector tools and `Skill`.
  - F-3: a failed router turn leaves routing "busy" for 40 s per delegation, with the status shown as active.
- Recommended owner: implementation engineer, through the code reviewer's failure-origin review
- Remaining risks, blocked evidence, or untested scope:
  - API-14 (UI on real data) and API-15 (desktop check preparation).
  - Claude with a user-level Write allow rule (only the user can check).

### API-REV-002 — Round 2: no confinement (SR-018), router recovery (CR-005), every runtime live, UI on real data, desktop prepared

- Triggering role, report path, and round: `/software_engineering_team/code_reviewer`, `code-review-report.md` CRR-004, round 2 (code `424e9bdd62`)
- Triggering finding or case IDs: F-1, F-2 (withdrawn by SR-018); F-3 (CR-005); the request to rerun MR-09, live routing per runtime, AC-007, AC-011 as reworded, API-14 and API-15
- Related revision IDs: SR-018, ARCH-REV-004, IR-003, CRR-004
- Why recorded: the rerun after rework
- Coverage decisions or durable test paths changed:
  - MR-09 now asserts recovery after a crash and after a failed turn (with a per-step log);
  - LR-3's model-pick message;
  - new browser probe `autobyteus-web/tests/e2e/model-routing-decisions-probe.mjs` with its package script.
- Cases:
  - added: L-05 (router on five runtimes), API-14 (MRD-01…07), API-15 (desktop instance);
  - rerun: MR-01…09, RC-01…41, API-13, LR-3, L-03/L-04, API-09;
  - withdrawn: L-01/L-02 confinement (SR-018).
- Commands, environment, fixture, or broader-validation delta:
  - ENV-6 (Nuxt + Chrome on two scripted nodes) and ENV-7 (isolated Electron instance) added;
  - the test vault for AutoByteus/DeepSeek in L-05;
  - heavy runs serialized after one concurrent run.

#### Prior Failure Resolution

| Prior Case / Failure Reference | Previous Classification | Current Resolution | Case IDs Now Proving It |
| --- | --- | --- | --- |
| F-1 Codex router sandbox widened by a workspace config (AC-011) | Local Fix (High) | Withdrawn: the user decided the router is not confined (SR-018, ARCH-REV-004); AC-011 reworded | L-05, MR-08 (AC-011 as reworded) |
| F-2 Claude router has claude.ai connector tools and Skill (AC-011) | Local Fix (Medium) | Withdrawn: SR-018 allows the runtime's own tools; collaboration tools absent | L-05 (`routerSessionInit`), MR-08 |
| F-3 a failed router turn leaves routing "busy" (C-05) | Local Fix / Unclear (Medium) | Fixed by CR-005 (stopped run restored; `isIdle` treats a stopped run as free) | MR-09 (After throw ≈ 8.4 s, routed), L-04 live |

- Canonical artifacts and sections updated: the investigation (round-2 cases), the execution report (rewritten for round 2), the progress log, `evidence/api-e2e/*-r2*`, `API-14-model-routing-decisions/`, `API-15-desktop/`
- Prior result and confidence: Fail, 81%
- Current result and confidence: Pass, 95%
- New or remaining failure IDs: none in scope. FU-007, FU-008 and FU-009 are pre-existing.
- Recommended owner: code reviewer (proportional test-code review)
- Remaining risks, blocked evidence, or untested scope:
  - the user's desktop verification (Done-when; prepared);
  - the one-off MR-09 time-out under concurrent load;
  - Claude's transient report read.
