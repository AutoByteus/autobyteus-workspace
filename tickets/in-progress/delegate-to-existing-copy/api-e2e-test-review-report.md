# API/E2E Test Review Report

## Review Meta

- Review Round: 1 (proportional test-code review)
- Trigger: api_e2e_engineer, API-REV-002 round 2, `Pass`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-003; AC-001..018, QR-001..003)
- Investigation Notes Reviewed As Context: `investigation-notes.md`
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-006)
- Design Spec Reviewed As Context: `design-spec.md` (SR-006)
- Supplemental Task Artifacts Reviewed As Context: None (`N/A — not applicable`)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md` (ARCH-REV-003)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md` (IR-001, IR-002)
- Original Code Review Report: `code-review-report.md` (latest round 3, `Pass`, CRR-003)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-004`
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- Execution Coverage Report: `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed As Context: `api-e2e-revision-record.md` (API-REV-001..002)
- Delivery Revision Record Reviewed As Context: N/A
- API/E2E Result: `Pass` (API-REV-002)
- Final Validation Confidence: 95.4% (as reported by API/E2E)
- Prior unresolved test-review findings rechecked: None. This is the first test review.
- Project testing guideline(s) applied: repository `TESTING.md`. No conflict with this skill and no discrepancy found.
- Supported Product Scenario Basis Confirmed: `Yes`. Each case enters through an approved AC/REQ/QR scenario (see the checks below).

## Changed Durable Test Scope

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/projects/task-existing-copy-assignment.e2e.test.ts` | Added (849 lines) | AC-001..010, 012, 013, 018; QR-001/002; REQ-005/009 | Follow-up Tasks to an existing copy over the real HTTP/WS/scoped-MCP server with the scripted AGY actor, in all three roots | One coherent surface. A shared `rootScenario(kind)` drives EXC-E2E-001..003; focused cases cover the race (004), cross-root (005), never-started (006), lost conversation (007) and the gated real model (008). |
| `autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs` | Updated (+9/−1) | QR-001 (parallel tool calls in one turn) | Scripted actor route `CALL_TOOLS:[…]` → `CALLED_ALL:[…]` | Additive branch; `CALL_TOOL:` is unaffected (distinct prefix). The routing unit test and the native-argument E2E were rerun by API/E2E. |
| `autobyteus-web/tests/e2e/task-closure-tree-probe.mjs` | Updated (+241) | REQ-008, AC-002..005, AC-011, AC-013 / REQ-005 (damaged data) | Rendered tree and board, real backend restarts: BR-012..016 | Follows the existing BR-001..011 structure; the `openRoot` `requireTaskTree` option has a default that keeps the existing cases' behavior. |
| `TESTING.md` | Updated (+64) | — | Documents the commands, the scope of the new suite, the gating (`RUN_AGY_FAILURE_E2E`, `RUN_CLAUDE_E2E`) and the BR-015/016 ordering dependency | Accurate against the code. |

- No durable test file changed: `No`
- Nothing removed.

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | Case names carry EXC/BR IDs plus AC/QR IDs. `rootScenario` is commented step by step with the AC each block proves. |
| Assertions prove approved requirements instead of incidental implementation details | Pass | The suite asserts: exact result keys (AC-001); exact refusal texts (AC-006/008/010 wording is the approved contract); byte-identical Project files for "nothing changes"; no closure frame, the same process and no relaunch for AC-004; `--conversation` resume plus earlier markers before the new Task for AC-002; A's file keeping the earlier period exactly for AC-018; at most one open entry per round for QR-001. One assertion, the unknown-Task text "must identify exactly one current node-local Task (found 0)" at l.484, pins the existing `resolveAssignment` wording. That is acceptable: it is a stable, agent-facing message. |
| Fixtures, setup, helpers, and data builders reuse meaningful repetition | Pass | Within the file, `startRoot`/`rootScenario` remove three-way repetition, and the race loop is data-driven. `taskNodes` and the `pgrep`/`lsof` live-process helper are again inlined per file, as in the five existing `tests/e2e/projects` suites. That follows the local convention, so it is not raised here (see Notes). |
| Test isolation and determinism are appropriate for the exercised boundary | Pass | The suite uses a private temp data dir, its own server, and a unique Project per case. Created roots are tracked and terminated, and env vars are restored. EXC-E2E-004 accepts either race outcome and asserts the invariants per outcome; it deliberately does not require both outcomes, which avoids flakiness. Fixed sleeps (1.5–2.5 s) are used only to prove that something did *not* happen (no stop, no closure), which is appropriate for negative checks at this boundary. BR-015 now waits for `started` instead of reading the documented `starting` window. |
| Large files remain coherent and navigable rather than mixing unrelated scenarios | Pass | 849 lines, one feature surface. Shared readers are at the top, then root setup, the per-root journey and the focused cases. |
| No stale, duplicated, disabled-without-reason, or compatibility-only tests remain | Pass | EXC-E2E-008 is skipped unless `RUN_CLAUDE_E2E=1` and `claude` is present. The gate is documented in TESTING.md. There are no old-shape assertions or aliases. |
| Added, updated, and removed coverage agrees with the coverage investigation and execution evidence | Pass | The ledger and execution report list EXC-E2E-001..008 and BR-012..016. The round-2 evidence JSON matches the asserted shapes, for example `neverStarted` now carries "This copy never started…". |
| Test callers and fixtures exercise an independently established supported scenario rather than proving one by themselves | Pass | Every scenario maps to an approved AC/QR. BR-016's damaged file is written while the backend is stopped. That is the only way to create the REQ-005 "Task data is unreadable" state, which REQ-005 and MP-002 establish independently. |
| Each test enters through its scenario's real trigger and follows the real actor's or event's steps, without a setup real use does not produce | Pass | Every status change and delegation is the Manager's own tool call through scoped MCP. The never-started copy comes from a real start failure, discovered through `list_project_tasks`, and QR-001 uses real parallel tool calls in one turn. EXC-E2E-007 removes the memory folder of a stopped copy to stand in for a lost saved conversation, an explicit REQ-005 refusal state. In the standalone root, AC-007 uses a Task-owned sender, the only non-assigner kind that root produces; this is documented in the test. |

## Findings

None.

Non-blocking notes (not actionable for this ticket):
- `taskNodes` and the live-AGY-process lookup are duplicated across about six `tests/e2e/projects` files, now including this one. Moving them into `tests/e2e/helpers/` would be a good separate cleanup.
- `afterAll` records `leftoverProcesses` in the evidence JSON without asserting it. Termination of every root is asserted. Asserting it is optional.

## Latest Authoritative Result

- Result: `Pass`
- Changed durable test paths reviewed:
  - `autobyteus-server-ts/tests/e2e/projects/task-existing-copy-assignment.e2e.test.ts` (added)
  - `autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs` (updated)
  - `autobyteus-web/tests/e2e/task-closure-tree-probe.mjs` (updated)
  - `TESTING.md` (updated)
- Unresolved finding IDs: None
- Recommended Recipient: `/software_engineering_team/delivery_engineer`
- Notes:
  - The durable test changes are still uncommitted in the server worktree, so delivery must commit them with the package.
  - Agents repo commit `0bd84e0` (PTM skill) is still unpushed and must ship with the server change.
  - Classification is unchanged: Large / High.
