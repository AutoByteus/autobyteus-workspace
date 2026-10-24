# API/E2E Revision Record — Agent Input Delivery Simplification

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code Reviewer CRR-002 Pass, round 1 | SR-003, SR-004, SR-005, ARCH-REV-002, IR-003, CRR-002 | N/A | Pass / 95% |
| API-REV-002 | Code Reviewer CRR-003 (TR-001 Local Fix, N-1), round 2 | IR-003, CRR-003 | Pass / 95% (test-review Fail on TR-001) | Pass / 95% |
| API-REV-003 | Code Reviewer CRR-005 Pass (v3 rewrite IR-004), round 3 | SR-006, SR-007, DEC-005, ARCH-REV-003, IR-004, CRR-005 | Superseded (v2 rounds validated IR-001..003 on another branch) | Pass / 95% |

## Revision Entries

### API-REV-001 — Baseline: unified teammate delivery and the REQ-012 race at the real server boundary

- Triggering role, report, round: `/software_engineering_team/code_reviewer`, `code-review-report.md` (CRR-002), round 1
- Triggering finding or case IDs: N/A (initial)
- Related revision IDs: SR-003/004/005, ARCH-REV-002, IR-003, CRR-002
- Coverage decisions or durable test paths changed:
  - Added `autobyteus-server-ts/tests/e2e/projects/teammate-delivery-task-closure-race.e2e.test.ts` (TDR-001..003).
  - Updated `tests/fixtures/agy-failure-cli.mjs` with opt-in `AGY_FAKE_TOOL_TIMEOUT_MS` and `AGY_FAKE_TOOL_LOG`.
  - Updated `TESTING.md`.
- Cases: R-01..R-03, TDR-001..003, TDR-B, REG-E2E, LIVE-RT.
- Commands, environment, fixture, or broader-validation delta: gated scripted-AGY server E2E with one history write held at the store, a cross-root Task closure, and gated real Claude/Codex suites. The host was shared under heavy load.

#### Prior Failure Resolution

None.

- Canonical artifacts updated: coverage investigation, execution coverage report, ledger.
- Prior result and confidence: N/A
- Current result and confidence: Pass, 95%
- New or remaining failure IDs: none in scope.
- Recommended owner: Code Reviewer (proportional test-code review, Large/High).
- Remaining risks:
  - CAND-002 is unit-only.
  - The opaque MCP error for thrown delivery errors is pre-existing (observation 1).
  - Stale gated round-trip suites and a machine-dependent unit test are pre-existing and need owners.
  - `task-copy-idle-lifetime` is timing-sensitive under load.

### API-REV-002 — TR-001: exact agent-visible outcome matching; N-1 precondition

- Trigger: `/software_engineering_team/code_reviewer` CRR-003 (`api-e2e-test-review-report.md`), TR-001 Local Fix, optional N-1.
- Change (test code only, `teammate-delivery-task-closure-race.e2e.test.ts`):
  - `toolOutcome`/`awaitToolOutcome` now match exactly one `send_message_to` call by exact `content` and the intended target (run ID or recipient address). Before, a substring anywhere in the arguments matched, so the blocker case picked up the Manager's wrapper call to A's lead.
  - The blocking-message assertion now also requires `target_agent_run_id` = A's mate.
  - N-1: the delivery spy records start times, and TDR-002 asserts that B's delivery started before Task B closed.
- Rerun: 3/3 roots pass (`api-e2e-evidence/tdr-run7/`).
  - `blockerAgentSaw.target_agent_run_id` equals A's mate in all three roots.
  - B's delivery started about 3.06–3.07 s before Task B closed.

#### Prior Failure Resolution

| Prior Case / Failure Reference | Previous Classification | Current Resolution | Evidence |
| --- | --- | --- | --- |
| TR-001: TDR-002 blocking-message assertion matched the Manager → A lead wrapper call | `Local Fix` (test code), CRR-003 | Fixed: exact matching plus a target assertion; receipt shows A's mate | `tdr-run7/teammate-delivery-task-closure-race.json` |

- Canonical artifacts updated: execution coverage report (TDR-002 row, E-01, durable coverage), ledger, this record.
- Prior result: Pass, 95% (test review Fail on TR-001). Current result: Pass, 95%.
- New or remaining failure IDs: none.
- Recommended owner: Code Reviewer (re-review of the changed lines).

### API-REV-003 — v3 rewrite (IR-004): DEC-005 refusal, remote paths and regressions at the real boundaries

- Trigger: `/software_engineering_team/code_reviewer` CRR-005 Pass on IR-004 (`a3391c924f`; source `dbc27db9df`), branch `codex/agent-input-delivery-simplification-v3`, round 3.
- Why recorded: the v3 rewrite supersedes IR-001..003. API-REV-001/002 validated the v2 code on another branch, and none of their evidence is carried over. Evidence for this round is in `api-e2e-evidence-v3/`.
- Coverage decisions or durable test paths changed:
  - Added `autobyteus-server-ts/tests/e2e/projects/teammate-delivery-task-closure-race.e2e.test.ts`, ported from v2:
    - an `appendMessage` gate on the single message;
    - Task keys with `create_task`/`update_task`;
    - a JSONL log reader across the coordinating and Task agents' logs;
    - the DEC-005 readable refusal;
    - the TDR-001 record shown in the root view.
  - Updated `tests/fixtures/agy-failure-cli.mjs` with opt-in `AGY_FAKE_TOOL_TIMEOUT_MS` and `AGY_FAKE_TOOL_LOG`.
  - Baseline fix `67ec5ac6ca` (rule 9): `tests/e2e/runtime/team-busy-member-mid-turn-delivery.e2e.test.ts` also reads `SEGMENT_CONTENT_BATCH` items.
  - TESTING.md is unchanged: suite descriptions belong in test headers, per its current rules.
- Cases: R-01..R-03, TDR-001..003, TDR-B, REM, REG-E2E, LIVE-RT (see ledger).

#### Prior Failure Resolution

None for v3 (first round on IR-004).

- Canonical artifacts updated: coverage investigation, execution coverage report and ledger, all rewritten for v3.
- Prior result: superseded. Current result: Pass, 95%.
- New or remaining failure IDs: none caused by this change.
- Failures found and diagnosed outside this change (owners needed):
  - `delegated-launch-config-defaults.e2e.test.ts` ×2: stale against the `followsTeam` member record (`71d51a1608`) and the task-agent own-run restore (`52f2837ca7`).
  - `task-existing-copy-assignment` EXC-E2E-004: a reopen-after-DONE race in the live-lease restore (`a18fe714cd`); intermittent.
- Recommended owner: Code Reviewer (proportional test-code review, Large/High).
