# API/E2E Test Review Report — busy-quit-shutdown-orphan (autobyteus-284)

All ticket paths are under `/Users/normy/autobyteus_org/autobyteus-worktrees/busy-quit-shutdown-orphan/tickets/in-progress/busy-quit-shutdown-orphan/`.

## Review Meta

- Review Round: 1
- Trigger:
  - API/E2E engineer, API-REV-002 (round 2), `Pass`, final confidence 94.1%.
  - Code `83a73f24d7`, validated from a clean checkout of `68cff9e385`.
  - Durable tests `55ddc71839`; round 2 reports `4531043498`.
- Requirements Doc Reviewed As Context: `requirements-doc.md` (REQ-001 to REQ-005, AC-001 to AC-011, DEC-005, BEH-007)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (as cited by the design)
- Solution Revision Record Reviewed As Context: SR-008
- Design Spec Reviewed As Context: `design-spec.md` (SR-008)
- Supplemental Task Artifacts Reviewed As Context: `follow-ups.md` (FU-008 now recorded by API/E2E)
- Architecture Review Revision Record Reviewed As Context: ARCH-REV-003
- Implementation Revision Record Reviewed As Context: IR-001, IR-002
- Original Code Review Report: `code-review-report.md` (CRR-001 to CRR-003)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-004`
- Coverage Investigation: `api-e2e-coverage-investigation.md` (including § Round 2)
- Execution Coverage Report: `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed As Context: API-REV-001, API-REV-002
- Delivery Revision Record Reviewed As Context: N/A
- API/E2E Result: `Pass` (API-REV-002)
- Final Validation Confidence: 94.1%, every category ≥ 93%. The gap to 95% is bounded and is not a test-code issue: the update install could not be run safely (N-5/FU-007), FU-008, and Windows.
- Prior unresolved test-review findings rechecked: None (first test review)
- Project testing guideline applied: `TESTING.md`. Rule 2: no user app or data. Rule 5: stop what you started. Rule 6: assertions first. Rule 9: cause first; F-API-002 is recorded as FU-008. No conflicts.
- Supported Product Scenario Basis Confirmed: `Yes`. SCN-001 (user Terminate through the GraphQL mutation the UI uses), SCN-001 application (DEC-005, `context.agentExecution.terminate`), SCN-002 (SIGTERM to a real `dist/app.js` started in the desktop's spawn shape), SCN-004 (relaunch on the same data).

## Changed Durable Test Scope

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/shutdown/busy-run-stop-now.e2e.test.ts` | Added | AC-001 (native), AC-002 (native + background), AC-008, AC-010; REQ-001 to REQ-003, BEH-007 | Gated runner: two cases (server, application) that run the private fixtures and assert their receipts | Gated by `RUN_BUSY_STOP_NOW_E2E=1` and non-win32, with the reason in its header; same convention as the existing `native-standalone-host-shutdown.e2e.test.ts` |
| `autobyteus-server-ts/tests/e2e/shutdown/busy-run-stop-now-fixture.mjs` | Added | AC-001, AC-002, AC-010 | A real server process; busy native run → Terminate ≤ 10 s with its foreground command gone → SIGTERM with a busy foreground and background command, exit 0 ≤ 10 s, no survivors → relaunch: `terminatedAt` on the user-terminated run only | Only inference is emulated (a scripted LM Studio SSE). Passes on R1 and R2; fails on the base build (API-02) |
| `autobyteus-server-ts/tests/e2e/shutdown/busy-application-terminate-fixture.mjs` | Added | AC-008 (DEC-005) | A real standalone application host; the application's `end` command terminates its busy run ≤ 10 s, the foreground command is gone, the host closes 0 | Fails on the base build with a 20 s timeout (API-03) |
| `autobyteus-server-ts/tests/unit/utils/process-tree.test.ts` | Updated (IR-002) | CR-001 / BEH-003 | Reader: `spawnSync`, its own row dropped, throws on error or non-zero exit | Already reviewed as source-review test evidence in CRR-003 |
| `autobyteus-server-ts/tests/unit/shutdown/server-process-tree-sweep.test.ts` | Updated (IR-002) | CR-001 / BEH-003 | Idle server whose only child is the reader → `confirmed, 0`, no signal, no log line | Already reviewed in CRR-003 |

- No durable test file changed: `No`

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | Two `it` cases named by their surface (`server:`, `application:`). Each fixture's header lists its numbered steps with REQ/BEH IDs, and the step comments in the body match them (`// 1. Terminate a busy run.`, and so on). |
| Assertions prove approved requirements instead of incidental implementation details | Pass | They assert outcomes only: Terminate `success` and ≤ 10 s; foreground pid absent (`kill(pid, 0)` ESRCH); server exit code 0 and ≤ 10 s; no surviving recorded descendants and no tagged commands; `terminatedAt` set on the terminated run and `null` on the shutdown-stopped one; idle relaunch exit 0. Nothing asserts internal call order or log text. `sweepLines` is recorded as evidence but not asserted, which is right, because REQ-003's contract is the outcome. |
| Fixtures, setup, helpers, and data builders reuse meaningful repetition | Pass | Inside each fixture, the repeated parts are factored (`owned()`, `busyRun()`, `startServer()`, `wait()`). The small helpers (`alive`, `wait`, `delay`, `quote`, the scripted LM Studio SSE responder) are repeated across the three `tests/e2e/shutdown/*-fixture.mjs` files. These are standalone node processes that can also run against another server build (`BUSY_STOP_SERVER_DIR`), and the folder's existing fixture is self-contained the same way. Each copy is a few lines and they differ per scenario, so this is not a finding (see the note under Findings). |
| Test isolation and determinism are appropriate for the exercised boundary | Pass | Owned temp roots (data, `HOME`, `TMPDIR`, workspace), free ports, a minimal env (`PATH` only plus explicit vars), `APP_ENV=test`, no credentials. Processes are matched by a run-unique tag or by recorded pids (fallback cleanup kills only those); `rootRemoved: true`. The time assertions have wide margins over the observed results (Terminate 72–98 ms, shutdown about 0.8–1.3 s, against a 10 s bound), and the waits are bounded. |
| Large files remain coherent and navigable rather than mixing unrelated scenarios | Pass | One file per surface: server stop-now (165 lines) and application terminate (105 lines). The dense one-line style matches the existing fixture in the folder. |
| No stale, duplicated, disabled-without-reason, or compatibility-only tests remain | Pass | The gate is documented (it needs a current build and real processes; macOS/Linux process-table checks). Nothing overlaps the unit coverage (IMP-02/03): these tests cover the real-process boundary that the units mock. |
| Added, updated, and removed coverage agrees with the coverage investigation and execution evidence | Pass | API-02 and API-03, R1 and R2 (`API-02-03-R2-vitest-clean.log`, `API-02-R2-server-fixture-clean.json`, `API-03-R2-application-fixture-clean.json`), plus the base fail-before files. |
| Test callers and fixtures exercise an independently established supported scenario rather than proving one by themselves | Pass | SCN-001, SCN-001 application, SCN-002 and SCN-004 are established by the requirements (E8, E-A8, E1–E9, T-08c). The fixtures only reproduce them. |
| Each test enters through its scenario's real trigger and follows the real actor's or event's steps, without a setup real use does not produce | Pass | Terminate goes through `terminateAgentRun` GraphQL, the UI's mutation (`api/graphql/types/agent-run.ts:184`). Input goes through the agent websocket `SEND_MESSAGE`. Shutdown is a SIGTERM to `node dist/app.js --port --data-dir` (the desktop's spawn shape). The application path is a real host, app worker, `context.agentExecution.terminate`. Relaunch reuses the same data dir. The only emulation is inference, which this ticket does not change. |

## Findings

None.

Non-blocking note, not a finding: if more real-process shutdown fixtures are added to `tests/e2e/shutdown/`, a small shared helper module there (scripted LM Studio responder, `wait`/`alive`, tagged process lookup) would avoid a fourth copy. That is a reasonable step for the next fixture, and not required here.

## Follow-ups

- Follow-ups this review added: None. FU-008 (F-API-002) was already recorded by the failure-origin review and is now in the API/E2E report as out of scope.

## Latest Authoritative Result

- Result: `Pass`
- Changed durable test paths reviewed: the five paths above
- Unresolved finding IDs: None
- Recommended Recipient: delivery engineer
- Notes: code under delivery is `83a73f24d7`. The architecture reviewer's ARCH-REV-003 edits to `design-review-report.md` and `architecture-review-revision-record.md` are still uncommitted in the worktree. Delivery should get them committed by their owner, or confirm their status, before finalizing.
