# API/E2E Revision Record — task-run-resources-workspace-cleanup

The latest coverage investigation and execution coverage report remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | `/code_reviewer`, `code-review-report.md` CRR-002 Pass, round 1 | SR-008, ARCH-REV-003, IR-002, CRR-002 | N/A | Fail / 88% |
| API-REV-002 | `/code_reviewer` CRR-004, round 2 | IR-003 | Fail / 88% | Pass on `3570b8c10` (superseded before handoff) |
| API-REV-003 | `/code_reviewer` CRR-005, round 3 | SR-009, ARCH-REV-004, IR-003, IR-004, CRR-004, CRR-005 | Fail / 88% | **Pass / 95%** |

## Revision Entries

### API-REV-001 — Baseline: real-boundary closure across three roots; Team-tree leave motion fails

- Triggering role, report, round: `/code_reviewer`, `/Users/normy/autobyteus_org/autobyteus-worktrees/task-run-resources-workspace-cleanup/tickets/in-progress/task-run-resources-workspace-cleanup/code-review-report.md` (CRR-002), round 1.
- Triggering finding/case IDs: CRR-002 asks C-07 (codegen), real Manager DONE journeys AC-001–AC-010 for all roots, AC-009 incl. CR-001 last-row, AC-010 browser motion for Agent/Team, SP-3.
- Related revision IDs: SR-008; ARCH-REV-002/003; IR-001/IR-002; CRR-001/CRR-002.
- Why recorded: first completed API/E2E result.
- Coverage decisions / durable paths changed:
  - Added `autobyteus-server-ts/tests/e2e/projects/task-closure-root-visibility.e2e.test.ts`.
  - Updated (`afterLeave` around post-collapse absence checks; expectations unchanged) `autobyteus-web/tests/e2e/{agent-org-task-team-disclosure-probe,task-agent-peer-sidebar-probe,nested-team-hierarchy-probe}.mjs`. Their decision moved from `Still Valid` to `Needs Update` against the approved collapse animation.
- Cases: REPO-001–004, C-07, API-E2E-001a–d, BR-001–BR-007, REG-001, REG-002.
- Commands/environment: see the execution report. Owned browser stack: built backend + scripted AGY CLI + Nuxt dev + headless Chrome; real backend restart via SIGUSR2.

#### Prior Failure Resolution

None.

- Canonical artifacts updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-case-ledger.md`, `api-e2e-evidence/`.
- Prior result and confidence: N/A.
- Current result and confidence: **Fail / 88%**.
- New failure IDs: **API-F-001 (BR-002)**: AC-010 under the Team root. Leaving rows lose the 200 ms fade/collapse when a stale `tree-row-move` is present: its `transition: transform` overrides `.tree-row-leave-active`. Reproduced 4/4 in the AC-009 journey.
- Recommended owner: `implementation_engineer` (`Local Fix`, preliminary), via `/code_reviewer` failure-origin review.
- Remaining risks:
  - AC-003's failing stop is unit-only;
  - Packaged Electron was not run (no shell change);
  - the Team REQ-009 scope residual is accepted;
  - a cosmetic codegen doc comment.

### API-REV-002 — Round 2: IR-003 fix verified (superseded before handoff)

- Trigger: `/code_reviewer` CRR-004 (IR-003 `3570b8c10`), round 2.
- Prior failure resolution: API-F-001 resolved. BR-002 passed with the stale `tree-row-move` on the leaving rows at leave start (natural R1/R2, forced BR-002M, durable probe): 213–233 ms, 9 fade frames each.
- Coverage change: added the durable `autobyteus-web/tests/e2e/task-closure-tree-probe.mjs` + `test:e2e:task-closure-tree`. Probe attempt 1 had a probe selector defect (Org tab label); it was fixed and the rerun passed 7/7.
- Result: Pass on `3570b8c10`. Not handed off, because CRR-005 (IR-004) arrived during the run.

### API-REV-003 — Round 3: IR-003 + IR-004 (per-root closed index) validated

- Trigger: `/code_reviewer` CRR-005 (IR-004 `50b08001d`, SR-009, ARCH-REV-004), round 3.
- Related: SR-009; ARCH-REV-004; IR-003, IR-004; CRR-004, CRR-005.

#### Prior Failure Resolution

| Prior Failure | Previous Classification | Current Resolution | Evidence |
| --- | --- | --- | --- |
| API-F-001 (BR-002, AC-010 Team root) | Local Fix (implementation) | Resolved (IR-003); re-proven on HEAD: 211 ms, 9 frames with the move class present | `api-e2e-evidence/round3/task-closure-tree-probe/evidence.json` |

- Coverage changes: `task-closure-root-visibility.e2e.test.ts` extended with repeated DONE after reopen + redelegate (IR-004 re-swap path).
- Commands: server prebuild/build, server affected suites, the gated durable E2E, the durable probe (all 7 cases).
- Canonical artifacts updated: investigation (round 2–3 updates), report (round 3 authoritative section), ledger (reconciliation), `api-e2e-evidence/round3/`.
- Prior result: Fail / 88% (API-REV-001); Pass on `3570b8c10` (API-REV-002).
- Current result: **Pass / 95%**.
- New or remaining failure IDs: none.
- Recommended next: `/code_reviewer`, proportional test-code review of the server E2E, the new browser probe + package script, and the 3 updated probes.
- Remaining risks:
  - AC-003's real failing stop is unit-proven only;
  - Packaged Electron was not run;
  - a `TESTING.md` entry for the new durable probe and E2E is a Delivery docs follow-up.
