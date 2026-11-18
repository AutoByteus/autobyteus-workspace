# API/E2E Revision Record — list-running-agents (autobyteus-492)

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code reviewer, `code-review-report.md` CRR-002 Pass, round 1 | SR-009, ARCH-REV-004, IR-002, CRR-002 | N/A | Pass / 95.3% |

## Revision Entries

### API-REV-001 — Baseline: two-node and one-node E2E of the run-ID-is-the-address rule and `list_running_agents`

- Triggering role, report path, and round: code reviewer, `tickets/in-progress/list-running-agents/code-review-report.md` (CRR-002 Pass), round 1.
- Triggering finding or case IDs: the handoff's coverage hints (UNK-001; AC-004, AC-006, rows 8/11/13/14, DS-006, QR-003; stale E2E assertions; U9 timing; G-1).
- Related revision IDs: SR-006 … SR-009, ARCH-REV-003/004, IR-001/002, CRR-001/002.
- Why this baseline was recorded: first API/E2E validation of the package.
- Coverage decisions or durable test paths changed: two-server suite (new RC-47, RC-48, RC-49; RC-06, RC-08, RC-20, RC-22, RC-26, RC-27, RC-28 updated), collaboration-prompt-wording (CPW-R1/R2/R3), contract stories (O9 driver) with the fixture and the 461 model's U9 ID, MCP route integration test (`node`). Commits `9fc0df5db3`, `ec66ee7d01`.
- Cases added, changed, removed, or rechecked: API-01 … API-12 (execution report § Cases).
- Commands, environment, fixture, or broader-validation delta: built `dist` of this worktree, Node 22.23.1, scripted AGY, `env -i`; machine shared with other worktrees (load 48–170, FSEvents stalled).

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-progress.md`, `evidence/API-*`, `follow-ups.md` (FU-005).
- Prior result and confidence: N/A
- Current result and confidence: Pass, 95.3%
- New or remaining failure IDs: None in scope. Outside the change: the FSEvents/close/timeout-sensitive suites (FU-005).
- Recommended owner: code reviewer (proportional test-code review of the changed test code).
- Remaining risks, blocked evidence, or untested scope: API-04b not run (FSEvents delivered no events); BEH-007 (a busy receiver) on built servers is proven in process only; `workspace` carries a local path to the peer (DEC-013, by design).
