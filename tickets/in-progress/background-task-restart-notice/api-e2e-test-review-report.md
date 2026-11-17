# API/E2E Test Review Report

## Latest Round: Part 2, round 2 (CRR-007) — Pass

### Review Meta

- Review Round: `2` (part 2; round 1 below is part 1's)
- Trigger: API/E2E engineer, API-REV-003 Pass (part 2, round 3 of API/E2E), 2026-11-17
- Basis: `requirements-doc.md` REQ-006, REQ-007, AC-005, AC-006, DEC-004, DEC-005; `design-spec.md` Part 2 (SR-006, example sequence); `code-review-report.md` CRR-006 Pass; IR-004
- Coverage Investigation / Execution Report / API/E2E Revision Record: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-revision-record.md` (API-REV-003)
- Final Validation Confidence: 94% (as reported)
- Code tested: `ce06c415cc` (at `4c93deaa8f`); tests commit `97230cfdce`
- Prior unresolved test-review findings rechecked: None
- Project testing guideline(s) applied: `/TESTING.md`, as recorded in the coverage investigation. Checked: clean environment, gates for live runtimes (Claude, Codex) with their sign-ins, scripted runtimes for credential-free runs, test-owned data roots and ports, and servers and sockets stopped in `afterAll`. No conflict.
- Supported Product Scenario Basis Confirmed: `Yes` (SCN-005, SCN-006)

### Changed Durable Test Scope

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/runtime/background-task-status-count.e2e.test.ts` | Added | REQ-006 (routes 1 and 3, team stream, sum), AC-005 per runtime (native, Team, AGY scripted, Claude live, Codex live), AC-006 | The count on every status route through the real studio server | 314 lines; BTS-01..05 indexed in the header; gates per runtime |
| `autobyteus-server-ts/tests/e2e/remote-collaboration/peer-background-task-status.e2e.test.ts` | Added | REQ-006 peer route (route 5 / `RemoteRunSummary`) | Two built, paired nodes; the delegator's feed shows the peer run's count | 168 lines; PBS-01 |
| `autobyteus-server-ts/tests/e2e/agent/agent-command-correlated-status.e2e.test.ts` | Updated | REQ-006 (the required field) | Four exact `AGENT_STATUS` payloads gain `background_tasks_running: 0` | A test this change made untrue, rewritten to the approved behavior (ticket-scope.md); it failed in the E2E suite and passes now |
| `autobyteus-web/tests/e2e/interrupt-result-presentation-probe.mjs` | Updated | contract shape | The fixture status follows the contract | One field |

- No durable test file changed: `No`

### Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | Case IDs and the header index name the runtime and the route; one file per surface (single node vs peer) |
| Assertions prove approved requirements | Pass | BTS-01 asserts the design's example sequence: `running:0 → running:1` (the turn wins) `→ idle:1`. It also checks the status before the task event, the feed snapshot and run state, the reconnect snapshot, AC-006 delivery (< 5 s, measured 25 ms), counts 2 → 1 → 0, and the feed's last state `idle:0`. BTS-02 checks per-member counts and the summed Team run state. PBS-01 checks the peer run `idle:1 → idle:0` on the delegator's feed. **Strictness:** every feed message goes through the contract's strict parser, and every stream `AGENT_STATUS` without an integer count fails (`statuses()`). BTS-05 asserts Codex stays 0, which is the design's accepted behavior (R-11), not an incidental detail |
| Fixtures, setup, helpers reuse | Pass | The shared live harness and `pairNodes`; one scripted model per file; `feed`, `statuses`, `feedAgent` and `path_` helpers |
| Isolation and determinism for the boundary | Pass | Scripted inference and fixed `sleep N` tasks bound timing; waits are condition-based (`until`). Each case has its own run and workspace. PBS-01 gives each node its own root, ports and HOME, removed in `afterAll`. BTS-02's final Team-state wait tolerates a timeout but is then asserted (`runStates.at(-1)`) |
| Large files coherent and navigable | Pass | Navigable |
| No stale, duplicated, disabled-without-reason or compat-only tests | Pass | The one stale test was rewritten; skips are gate-based, with the reason in the header |
| Coverage agrees with the coverage investigation and execution evidence | Pass | Matches API-REV-003's Cases (BTS-01..05, PBS-01, P2-05) |
| Callers and fixtures exercise an established scenario | Pass | SCN-005 per runtime; SCN-006 via BTS-01; the peer case is REQ-006's route 5 |
| Real trigger, no setup real use does not produce | Pass | Runs are created and driven through GraphQL, the agent/team WebSockets and `/ws/run-status`, as the app does. Native tasks are real `run_bash(run_in_background)` processes. The peer delegation is a real `delegate_task` between two built, paired nodes. AGY uses the established scripted CLI (`BACKGROUND_STEP`). Claude and Codex are live |

### Findings

None.

Non-blocking notes, readability only: in `background-task-status-count.e2e.test.ts`, `inOrder` and `path_` (L139-140) are not indented like the surrounding helpers. `open()` attaches the socket to the frames array through a cast; returning `{ frames, socket }` would read more plainly.

### Follow-ups

None added by this review. FU-008 (three web probes failing identically on base) and FU-009 (a pre-existing runtime-list E2E expectation) were recorded by API/E2E; FU-006 and FU-007 stand.

### Latest Authoritative Result

- Result: `Pass`
- Changed durable test paths reviewed: the four paths above
- Unresolved finding IDs: None
- Recommended Recipient: `delivery_engineer`
- Notes: Part 2 is proven at the server boundary on every route the client reads, across native, Team, Antigravity, Claude live, Codex live and two peer nodes. Desktop, phone and zh-CN were proven by the probes and the isolated app (P2-10). Residual risks:
  - ACP live is Not Tested.
  - The failed-member Team display is proven at unit level only, because an `error` member could not be produced live (P2-07a).
  - The Org view's status access is unit-level.
  - Codex idle shows Idle, by design.

---

## Earlier Round: Part 1, round 1 (CRR-004) — Pass

### Review Meta

- Review Round: `1`
- Trigger: API/E2E engineer, API-REV-002 Pass (round 2 of API/E2E; F-1 resolved by DEC-008), 2026-11-17
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-004, DEC-008)
- Investigation Notes Reviewed As Context: through the coverage investigation
- Solution Revision Record Reviewed As Context: SR-004
- Design Spec Reviewed As Context: `design-spec.md` (part 1)
- Supplemental Task Artifacts Reviewed As Context: N/A
- Architecture Review Revision Record Reviewed As Context: ARCH-REV-003 (context)
- Implementation Revision Record Reviewed As Context: IR-002
- Original Code Review Report: `code-review-report.md` (CRR-003, Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-004`
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- Execution Coverage Report: `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed As Context: `api-e2e-revision-record.md` (API-REV-001, API-REV-002)
- Delivery Revision Record Reviewed As Context: N/A
- API/E2E Result: Pass (API-REV-002)
- Final Validation Confidence: 94% (as reported)
- Prior unresolved test-review findings rechecked: None (first test review of this ticket; round 1 of API/E2E failed and went to failure-origin review)
- Project testing guideline(s) applied: `/TESTING.md`, as the coverage investigation records it. Checked: clean environment (`env -i`), keys only from the test vault (RR-09 through `capturedTestVaultSetting`), test-owned data roots, the user's app and data untouched, and stopping what the test started (`afterAll` kills its servers, tagged processes and RR-09's process groups). No conflict or discrepancy.
- Supported Product Scenario Basis Confirmed: `Yes` (SCN-001..SCN-004; REQ-001..REQ-005; DEC-008)

## Changed Durable Test Scope

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/restart-resume/restart-reminder-built-server.e2e.test.ts` | Added in `4cec9abfea` (RR-01..08). Updated in `b78555d7bb` (RR-02 assertion to DEC-008, by the implementation engineer) and `eef8ed6195` (RR-09 live; evidence-only fields) | AC-001 (restart, kill, update), AC-002, AC-003 (native, Antigravity, Claude, Codex), AC-004; REQ-001..005; DEC-008 | The restart reminder across real restarts of the built server, one case per cause and runtime | 678 lines, one surface; header index of cases and gates. Reviewed as a whole, because this is its first test review |

- No durable test file changed: `No`

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | RR-01..09 named by cause and runtime, with AC IDs in the header; shared helpers (`TestNode`, `ScriptedModel`, `updateCase`, `liveRestart`) sit above the cases |
| Assertions prove approved requirements instead of incidental details | Pass | Each case asserts what the requirements name. **Record:** live entry within one 2 s check, no `shutdownAt` until a graceful stop. **Take:** record removed, pending reminder with its cause. **Wake:** woken only after an update. **Text:** reminder text per cause (DEC-003 line for restart/update, DEC-008 line and not the "stopped" line after a kill). **Delivery:** exactly once (`model.reminded(...)` length 1, a second input carries none), a control run without a task gets nothing, reminders file emptied after delivery. Live cases assert the agent's reaction loosely (regex on the answer), proportionate for a live model |
| Fixtures, setup, helpers, and data builders reuse meaningful repetition | Pass | `updateCase` serves RR-03/04/05; `liveRestart` serves RR-07/08; `busyNativeRun`, `recordEntry` and `expectBackgroundStarted` are shared |
| Test isolation and determinism appropriate for the boundary | Pass | Each case has its own data root and server process; the scripted model makes turns deterministic. Waits are recorded first and asserted at the end, so a build without the behavior still completes the restart. Fixed waits (5–8 s) back only negative checks ("nothing woken"), which is proportionate at this boundary. The known start-under-load failure is named as a precondition (`expectBackgroundStarted`), not hidden. Test-owned processes are cleaned by tag and, for RR-09's orphans, by process group |
| Large files remain coherent and navigable | Pass | One surface; navigable with its header index |
| No stale, duplicated, disabled-without-reason, or compatibility-only tests remain | Pass | RR-02's stale "stopped" assertion was corrected to DEC-008 in this ticket (ticket-scope.md: tests a change makes untrue). The API/E2E engineer's search found no other test asserting the old unexpected-stop line. Live cases skip by gate or a missing vault setting, with the reason in the header |
| Coverage agrees with the coverage investigation and execution evidence | Pass | Cases match the report's Cases table and `evidence/API-R2-restart-suite/` (RR-02 and RR-09 JSON spot-checked by path) |
| Test callers and fixtures exercise an independently established supported scenario | Pass | Every case maps to SCN-001..SCN-004. The update case's previous-release copy (`previousReleaseOf`) changes only the release stamp, which is the one fact the cause rule reads. It produces the same initiating state a real update does (a record written by another release) and does not create a scenario |
| Each test enters through its scenario's real trigger without setup real use does not produce | Pass | The built `dist/app.js` runs as its own process. Runs are driven through GraphQL and the agent WebSocket, as the app does. SIGTERM stands for the graceful quit, SIGKILL for a crash; the desktop Restart server and quit were proven separately (API-15). The next input comes from a real client message, and restore uses the app's mutation. The scripted model and the scripted AGY CLI replace only inference |

## Findings

None.

Non-blocking note: `previousReleaseOf` creates `.restart-reminder-e2e-previous-*` inside the server package, and `afterAll` removes it. A test process killed mid-run would leave it in the package folder. This is cosmetic and test-owned.

## Follow-ups

- Follow-ups this review added: None (FU-002 and FU-004 stand as recorded by API/E2E and the Solution Designer)

## Latest Authoritative Result

- Result: `Pass`
- Changed durable test paths reviewed: `autobyteus-server-ts/tests/e2e/restart-resume/restart-reminder-built-server.e2e.test.ts`
- Unresolved finding IDs: None
- Recommended Recipient: `delivery_engineer`
- Notes: The suite proves part 1 at the built-server boundary across every cause, the exactly-once race and four runtimes. RR-09 shows a real model acting correctly on the DEC-008 line. Residual: FU-002 (pre-existing duplicate reminder card in the web view; the designer may pull it in), FU-004 (crash orphans, out of scope by the user's decision), ACP live Not Tested, and the watcher integration files failing for environmental reasons (API-01).
