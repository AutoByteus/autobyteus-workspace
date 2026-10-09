# API/E2E Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | code_reviewer, `code-review-report.md` CRR-001, round 1 | SR-003, SR-006, ARCH-REV-003, IR-001, CRR-001 | N/A | Fail / 92% |
| API-REV-002 | code_reviewer, `code-review-report.md` CRR-003, round 3 (CR-001 fix) | IR-002, CRR-003 | Fail / 92% | Pass / 95.4% |
| API-REV-003 | code_reviewer CRR-005 (round 4, re-entry after DR-001 merge) + user request for a packaged Electron run | DR-001, IR-003, CRR-005 | Pass / 95.4% | Pass / ~96% |

## Revision Entries

### API-REV-001 — Baseline: real-wire, browser and restart validation of follow-up Tasks to an existing copy

- Triggering role, report path, and round: code_reviewer, `tickets/in-progress/delegate-to-existing-copy/code-review-report.md`, CRR-001 round 1 (Pass).
- Triggering finding or case IDs: none (first validation).
- Related revision IDs: SR-003 (requirements), SR-006 (design), ARCH-REV-003, IR-001, CRR-001.
- Why recorded: first completed API/E2E result.
- Coverage decisions or durable test paths changed:
  - Added `autobyteus-server-ts/tests/e2e/projects/task-existing-copy-assignment.e2e.test.ts` (EXC-E2E-001..007).
  - Updated `autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs` (`CALL_TOOLS:[…]`).
  - Updated `autobyteus-web/tests/e2e/task-closure-tree-probe.mjs` (BR-012..BR-016, `openRoot` `requireTaskTree` option).
  - Updated `TESTING.md`.
- Cases added: EXC-E2E-001..007, BR-012..BR-016. Rechecked: all existing project E2E suites, BR-001..011, AGY fixture regressions, the full unit/integration baseline, and the live-model suites whose assertions changed.
- Commands / environment: see execution report → Ledger Reconciliation and Live-model suites.

#### Prior Failure Resolution

None.

- Canonical artifacts updated:
  - `api-e2e-coverage-investigation.md`
  - `api-e2e-execution-coverage-report.md`
  - `api-e2e-test-case-ledger.md`
  - `api-e2e-evidence/`
- Prior result and confidence: N/A.
- Current result and confidence: `Fail`, 92%.
- New or remaining failure IDs: F-001 (EXC-E2E-006, AC-009 never-started reason).
- Recommended owner: implementation_engineer (`Local Fix`, preliminary), via code_reviewer failure-origin review.
- Remaining risks, blocked evidence, or untested scope:
  - MP-003 residual window, exercised probabilistically (24 parallel-call rounds crossing the boundary on both copy kinds; no violation).
  - O-001 intermittent idle-lifetime timing/catalog flake (unrelated).
  - O-003 base-stale `@`-mention live assertions and Claude catalog drift in two live suites (unrelated).
  - O-002 agent-facing "Agent run resource data" wording.
  - Packaged Electron not exercised (no shell change).

### API-REV-002 — Rerun after the F-001 fix; real-model AC-002 case added

- Triggering role, report path, and round: code_reviewer, `code-review-report.md` CRR-003 (round 3, targeted delta), after implementation fix `88e59f500` (IR-002).
- Triggering finding or case IDs: F-001 / CR-001 (EXC-E2E-006).
- Related revision IDs: IR-002, CRR-003.
- Why recorded: rerun after rework.
- Coverage decisions or durable test paths changed:
  - `task-existing-copy-assignment.e2e.test.ts`: added EXC-E2E-008 (gated `RUN_CLAUDE_E2E`; a real Claude copy recalls Task A's codeword in follow-up Task B, AC-002). `startRoot` gained an Org `agentOverrides` parameter.
  - `task-closure-tree-probe.mjs`: BR-015 now waits for the B3 root's `start: started` instead of asserting once, because the work message can be visible before `markStarted` commits.
  - `TESTING.md`: documents EXC-E2E-008.
- Cases rechecked:
  - EXC-E2E-006 first;
  - EXC-E2E-001..008;
  - `task-reactivation-root-visibility` (6/6);
  - BR-012..016 on the rebuilt backend;
  - typecheck and focused unit layers (1116).
- Commands / environment delta: `pnpm -C autobyteus-server-ts build` before the probe; `RUN_CLAUDE_E2E=1` added to the suite run. Evidence: `api-e2e-evidence/round-2/`.

#### Prior Failure Resolution

| Prior Case / Failure Reference | Previous Classification | Current Resolution | Evidence |
| --- | --- | --- | --- |
| F-001 / EXC-E2E-006 (AC-009 never-started reason) | Local Fix → implementation (confirmed as CR-001) | Resolved: the refusal names "never started"; Project files are unchanged. Generic refusal unchanged for unknown IDs and other roots' copies | `round-2/exc-e2e-final/task-existing-copy-assignment.json` → `neverStarted`, `crossRoot`, `team.idRefusals.unknown` |

- Canonical artifacts and sections updated:
  - execution report → Round 2 delta, Ledger, Matrix, Scorecard, Result;
  - ledger events 16–21;
  - investigation → Ambiguities.
- Prior result and confidence: Fail, 92%.
- Current result and confidence: Pass, 95.4%.
- New or remaining failure IDs: none.
- Recommended owner: code_reviewer (proportional test-code review), then delivery per the handoff rules.
- Remaining risks:
  - MP-003 residual (probabilistic coverage).
  - C-09 accepted residual.
  - O-001, O-002 and O-003.
  - Packaged Electron not exercised.
  - Agents-repo skill commit must ship together with the server change.
- One round-2 attempt failed on a probe timing assertion (BR-015). Fixed in the probe and rerun to pass; not a product failure.

### API-REV-003 — Integrated-base re-entry pass, plus a packaged Electron real-model journey

- Trigger:
  - code_reviewer CRR-005: delivery merged `origin/personal` @ `927796780` (`97b767186`), and IR-003 aligned two base tests (`17a5f2125`).
  - The user asked for a run in a real test Electron app.
- Rechecked on the integrated base:
  - typecheck;
  - the standalone root unit test (21/21);
  - `delegated-copy-member-contact-host` E2E (DCM-005);
  - `task-existing-copy-assignment` E2E (8/8, including the real-Claude case). All pass.
- Added evidence: an isolated packaged app built from this worktree after the merge, driven through the UI.
  - The real Project Task Manager (agents-repo worktree, `0bd84e0`) ran on Claude haiku 5.5. It delegated Task A to a Team, marked it DONE, then gave the user-requested follow-up Task B to the same copy with `delegate_task({target_team_run_id, task_id})`.
  - The result had the explicit IDs. The copy received "New Task assigned to you" and recalled Task A's codeword. The board shows both Tasks with the same Team root.
  - Evidence: `api-e2e-evidence/electron/` (screenshots, `journey.mp4`, `manager-conversation.json`, start/stop receipts).
- Durable coverage changed: none this round.

#### Prior Failure Resolution

None open (F-001 was resolved in API-REV-002).

- Current result and confidence: Pass, ~96%.
- Test-code review: Not Applicable (no API/E2E-owned durable test changes).
- Remaining risks:
  - MP-003, probabilistic.
  - C-09 accepted residual.
  - O-001 to O-003.
  - The Electron run did not restart the app; restarts are covered by BR-015.
  - The agents-repo skill must ship with the server change.
