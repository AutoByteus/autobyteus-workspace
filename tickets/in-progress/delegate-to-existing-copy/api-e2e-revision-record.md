# API/E2E Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | code_reviewer, `code-review-report.md` CRR-001, round 1 | SR-003, SR-006, ARCH-REV-003, IR-001, CRR-001 | N/A | Fail / 92% |
| API-REV-002 | code_reviewer, `code-review-report.md` CRR-003, round 3 (CR-001 fix) | IR-002, CRR-003 | Fail / 92% | Pass / 95.4% |

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
