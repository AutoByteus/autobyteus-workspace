# API/E2E Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | code reviewer, `code-review-report.md` CRR-001 Pass, round 1 | SR-003, ARCH-REV-002, IR-001, CRR-001 | N/A | Fail / 89% (F-1 Requirement Gap) |
| API-REV-002 | code reviewer, `code-review-report.md` CRR-003 Pass, round 2 | SR-004 (DEC-008), ARCH-REV-003, IR-002, CRR-003 | Fail / 89% | Pass / 94% |

## Revision Entries

### API-REV-001 — Baseline: restart reminder across real restarts; crash leaves tasks running

- Triggering role, report path, and round: code reviewer, `code-review-report.md` (CRR-001), round 1
- Triggering finding or case IDs: none (first validation)
- Related revision IDs: SR-003, ARCH-REV-002, IR-001, CRR-001
- Why recorded: first API/E2E validation of autobyteus-448 part 1 (product code `d5e9f350cf`)
- Coverage decisions or durable test paths changed: added `autobyteus-server-ts/tests/e2e/restart-resume/restart-reminder-built-server.e2e.test.ts` (RR-01..06 scripted, RR-07/08 live)
- Cases: API-R01..R03 reused (IMP-01..03); API-01..17 new
- Commands, environment, fixture, or broader-validation delta: built server sessions with a previous-release stamped copy; base build in a temporary worktree for the before; live Claude/Codex; isolated desktop instance with the test vault

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-progress.md`, `follow-ups.md` (FU-002), `evidence/API-*`
- Prior result and confidence: N/A
- Current result and confidence: Fail, 89% (post-repository 88%)
- New or remaining failure IDs: F-1 (after an unexpected stop the reminder says the background tasks were stopped; they keep running)
- Recommended owner: Solution Designer (Requirement Gap), after the code reviewer's failure-origin review
- Remaining risks, blocked evidence, or untested scope: ACP live (dsh not installed); Linux crash behavior; API-01 watcher files not green while `fseventsd` is saturated (environment); FU-002

### API-REV-002 — Rerun after DEC-008: F-1 resolved

- Triggering role, report path, and round: code reviewer, `code-review-report.md` (CRR-003), round 2
- Triggering finding or case IDs: F-1 (API-06 / RR-02)
- Related revision IDs: SR-004 (DEC-008, the user), ARCH-REV-003, IR-002 (`b78555d7bb`), CRR-003
- Why recorded: the reminder's background-task line now depends on the cause
- Coverage decisions or durable test paths changed: RR-02's assertion rewritten to DEC-008 by the implementation engineer (reviewed, correct); RR-09 added (live native agent on gpt-5.4-mini after a kill); RR-01/RR-02 evidence-only additions kept. Stale-test search (the updated skill rule): no other test asserted the old line for an unexpected stop
- Cases rechecked: rerun by impact. RR-01..08, DRO and both typechecks rerun. API-04, API-12 and API-15 are still valid (no reminder delivered, base unchanged, restart text unchanged). RR-09 is new
- Commands, environment, fixture, or broader-validation delta: server rebuilt at `92f4a1b3a6`; the built server reads the test vault for RR-09 (`capturedTestVaultSetting`)

#### Prior Failure Resolution

| Prior Case / Failure Reference | Previous Classification | Current Resolution | Case IDs Now Proving It |
| --- | --- | --- | --- |
| F-1 (API-06 / RR-02): after a crash the reminder said the tasks were stopped while they kept running | Requirement Gap | DEC-008 cause-specific line (IR-002); stopping the survivors is FU-004 (out of scope, the user) | API-06 (text, survivors 10 s after the kill), API-18 (the agent checks with `ps`: "Yes — process … is still running.") |

- Canonical artifacts and sections updated: `api-e2e-execution-coverage-report.md` (rewritten for round 2), `api-e2e-coverage-investigation.md` (round-2 plan), `api-e2e-test-progress.md`, `evidence/API-R2-*`
- Prior result and confidence: Fail, 89%
- Current result and confidence: Pass, 94% (every category ≥ 90%; the remaining gap is FU-002, outside this ticket)
- New or remaining failure IDs: none
- Recommended owner: code reviewer (proportional test-code review)
- Remaining risks, blocked evidence, or untested scope: FU-002; FU-004; ACP live (dsh not installed); API-01 watcher files environmental (saturated `fseventsd`)

### API-REV-003: Part 2, show an agent with a running background task (round 3)

- Triggering role, report path, and round: code reviewer, `code-review-report.md` (CRR-006 Pass, Large/High), round 3.
- Triggering finding or case IDs: none (new behavior: REQ-006, REQ-007, AC-005, AC-006, DEC-004, DEC-005).
- Related revision IDs: SR-006, IR-003/IR-004 (code `895cf3992d..ce06c415cc`), CR-002, CRR-005, CRR-006.
- Why recorded: part 2 is new, so this is a full round for it. Part 1 was rerun by impact, because its recorder now reads the same count derivation.
- Coverage decisions and durable test paths changed:
  - New `tests/e2e/runtime/background-task-status-count.e2e.test.ts` (BTS-01..05).
  - New `tests/e2e/remote-collaboration/peer-background-task-status.e2e.test.ts` (PBS-01).
  - Stale tests this ticket made untrue, rewritten: `agent-command-correlated-status.e2e.test.ts` (four exact payloads) and the `interrupt-result-presentation-probe.mjs` status fixture.
  - Tried and reverted (P2-07a), with the reasons recorded:
    - A failed Team member: a native provider 400 is a turn diagnostic, so the member returns to idle.
    - A direct read of `/ws/agent-collaboration`: it carries only the tree and messages; statuses reach the client through the run-status feed.
- Cases rechecked:
  - P2-01..P2-12 and P2-17.
  - P2-12 is part 1's RR-01..09 on the part 2 build.
- Commands, environment, fixture, or broader-validation delta:
  - A fresh-start build, because contract packages changed.
  - An isolated desktop instance with a real model.
  - Two paired built servers.
  - The full server E2E suite, compared with base `4cbf9e7881` and `895cf3992d` in temporary worktrees.
- Canonical artifacts and sections updated:
  - `api-e2e-execution-coverage-report.md` (Part 2 section).
  - `api-e2e-coverage-investigation.md` (Part 2 plan).
  - `api-e2e-test-progress.md`.
  - `follow-ups.md` (FU-008, FU-009).
  - `evidence/P2-*`.
- Prior result and confidence: N/A for part 2. Part 1 stays Pass, 94%.
- Current result and confidence: Pass, 94%. Every category is ≥ 92%, and every critical AC is directly proven.
- New or remaining failure IDs: none.
- Recommended owner: code reviewer (proportional test-code review).
- Remaining risks, blocked evidence, or untested scope:
  - Proven only at unit or component level:
    - a Team error member live (P2-07a);
    - the Org view's status access.
  - Not tested:
    - ACP live (`dsh` not installed);
    - Linux desktop and amd64.
  - Pre-existing or environmental failures:
    - FU-008 (three changed probes fail identically on base);
    - FU-009 (E2E failures from base and load);
    - P2-02 watcher failures (`fseventsd`).

### API-REV-004: Part 2 on the merged base (round 4)

- Triggering role, report path, and round: code reviewer, `code-review-report.md` (CRR-008 Pass, round 6), round 4.
- Triggering finding or case IDs: none. This reconfirms DR-002's Local Fix (IR-005: merge `990ff9a3d4`, `ca1979b206`).
- Related revision IDs: DR-002, IR-005, CRR-008.
- Why recorded: the base brought in 483 (task end reasons and exit codes, the count's inputs) and 458 (a phone Settings screen that uses the phone status line).
- Coverage decisions and durable test paths changed:
  - BTS-06 added: 483's three ends beside the count.
  - MSP-67 extended with the Settings screen.
  - No stale tests found.
- Cases rechecked:
  - Rerun: BTS-01..04, BTS-06, PBS-01, MSP-67 / MSP-59 / MSP-63, 483's panel probe, RR-01..09, the server typecheck.
  - Reused: IMP-16..IMP-20.
  - Not rerun: Codex (unchanged; RR-08 passed live).
- Commands, environment, fixture, or broader-validation delta: `dist/` and the phone bundle rebuilt at `a9e5676630`. Load was 70–215.
- Canonical artifacts and sections updated:
  - `api-e2e-execution-coverage-report.md` ("Part 2 on the merged base");
  - `api-e2e-coverage-investigation.md` (round-4 plan);
  - `api-e2e-test-progress.md`;
  - `evidence/R4-*`.
- Prior result and confidence: Pass, 94% (round 3).
- Current result and confidence: Pass, 94%.
- New or remaining failure IDs: none.
- Recommended owner: code reviewer (proportional test-code review).
- Remaining risks: as round 3 (a Team error member and the Org status access at unit level; ACP; Linux).
