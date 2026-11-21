# API/E2E Test Review Report

## Review Meta

- Review Round: 2 (round 1 = CRR-007, Fail: TR-001)
- Trigger: API/E2E's TR-001 test-code correction (API-REV-004; tests `6f76db6332`, reports and evidence `26d3d688a5`). Product source unchanged at `6c7af4a384`.
- Requirements Doc Reviewed As Context: `requirements-doc.md` (Approved; REQ-001..REQ-009, AC-001..AC-010)
- Investigation Notes Reviewed As Context: through the design's citations
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (through SR-010)
- Design Spec Reviewed As Context: `design-spec.md` (SR-010; § Exact Texts, Member States, DS-004, DS-007)
- Supplemental Task Artifacts Reviewed As Context: `follow-ups.md` (FU-001..FU-005)
- Architecture Review Revision Record Reviewed As Context: ARCH-REV-004
- Implementation Revision Record Reviewed As Context: IR-001..IR-004
- Original Code Review Report: `code-review-report.md` (CRR-006, Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-008`
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- Execution Coverage Report: `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed As Context: `api-e2e-revision-record.md` (API-REV-001..API-REV-004)
- Delivery Revision Record Reviewed As Context: N/A
- API/E2E Result: Pass, final confidence 95.4%
- Prior unresolved test-review findings rechecked: TR-001 → Resolved (below)
- Project testing guideline(s) applied (from the coverage investigation): root `TESTING.md`. Rules used here:
  - "File watching on a busy Mac": a test that waits for a file-watcher event takes its wait limit and vitest timeouts from `tests/helpers/os-latency-under-load.ts`, waits until its condition holds, never compares an event with a fixed bound, and proves a non-event with a short quiet window or a sentinel.
  - "Gates": a skip is not a pass.
  - Built-server E2E conventions.

  No conflict with this skill.
- Supported Product Scenario Basis Confirmed: `Yes` (SCN-001..SCN-006, SCN-003a/b, SCN-010; AC-001..AC-010)

## Changed Durable Test Scope

The ticket-owned rendered probe `tickets/in-progress/team-run-follows-definition/probes/team-follows-ui-probe.mjs` (TFU-01..06) is an execution probe, not a package test, so it is evidence and not reviewed here. The three one-line constructor updates in other e2e files (`studio-application-api-services.ts`, `recent-run-projection-graphql`, `run-projection-toolcalls-graphql`) came with the implementation (IR-001) and were covered by source review.

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/agent-team-runs/team-run-follows-definition.e2e.test.ts` (689 lines; `443f1c2c0f`, `8789b97a41`, `44fd8d073a`) | Added | TF-01..TF-12: AC-001..AC-010, DEC-002, DEC-006, DEC-007, REQ-002, SR-010 | One Team run following its definition through the built server: package file edits, the app editor's save, restarts. Scripted AGY. | Gated on `RUN_AGY_FAILURE_E2E` and the scripted CLI |
| `autobyteus-server-ts/tests/e2e/runtime/team-run-follows-definition-live.e2e.test.ts` (240 lines) | Added | TFL-01 (AC-001, AC-006, DEC-005), TFL-02 (AC-003, AC-010) | The same feature with real Codex and native AutoByteus members | Gated on `RUN_CODEX_E2E`, `RUN_AUTOBYTEUS_TEAM_FOLLOWS_E2E` and the test vault |
| `autobyteus-server-ts/tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts`, case RC-51 (+36) | Updated | AC-005 (peer-started copy, `copiedFrom: team_definition`) | One case in the existing two-server suite | Uses the app editor's GraphQL save on beta |

| `autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs` (+5/−2, round 2) | Updated | Shared scripted AGY fixture: opt-in `untilFile` on a `CALL_TOOLS` call | Lets a test keep a scripted turn busy until it opens a gate, with no timing bound | Opt-in. Existing users are unaffected: `task-existing-copy-assignment.e2e.test.ts` passed 7 with 2 gated skips (`API-TF-r4-fixture-regression.log`). |

Round 2 also changed the two new suites (`6f76db6332`: TF suite +117/−64, live suite +13/−5).

- No durable test file changed: `No`

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | Each `it` names its case ID, criteria and outcome. The file header lists every case, the prerequisites, gates and the exact command. The live suite does the same. |
| Assertions prove approved requirements instead of incidental implementation details | Pass | Notice and refusal texts are copied from design § Exact Texts, so they check the source independently. The stored tree (`formerMembers`, `leaving`, `copiedFrom`) is read from the file. Run-tree rows are read through the app's `runTree` query. Delivery is proven in the receiver's memory, and non-delivery too (`reviewerGotStop`). TFL-02 proves the approved command ran (file on disk). |
| Fixtures, setup, helpers, and data builders reuse meaningful repetition | Pass | Existing helpers are reused (`collaboration-root-harness`, `websocket-command-helpers`, `built-server-launch-credential`, `run-tree-delegated`, `until`). Local helpers each remove repetition (`calls`, `echo`, `stored`, `storedLeaving`, `leavingRows`, `removeWhileHeld`). Starting the built server inline matches the codebase's existing built-server suites (about 20 files do the same). |
| Test isolation and determinism are appropriate for the exercised boundary | Pass (round 2) | TR-001 resolved. Every wait for an outcome of a package-file edit now ends when the outcome holds, limited by `OS_FILE_EVENT_WAIT_MS`. Busy members are held by a gate the test opens (`untilFile`, `HOLD_TURN`) after `untilBusy`, not by a delay. TF-07 starts each breakage from a settled valid state the run visibly followed (`settleValid`) and counts "exactly one" warning after a sentinel edit has visibly landed. The one remaining fixed window, TF-04's 3 s, proves a non-event (a held turn keeps the member leaving), which `TESTING.md` allows. Test timeouts derive from `FILE_EVENT_TEST_TIMEOUT_MS`. The rest as in round 1: a test-owned data root and HOME, unique IDs, real SIGTERM with a forced-kill fallback, `afterAll` cleanup. |
| Large files remain coherent and navigable rather than mixing unrelated scenarios | Pass | One file per boundary (scripted built server, real runtimes) plus one case in the two-server suite. Cases build on one Team run, as the header states ("in order on one Team run unless named"), which suits an E2E journey. |
| No stale, duplicated, disabled-without-reason, or compatibility-only tests remain | Pass | Skips are only the documented gates. No duplicated cases. |
| Added, updated, and removed coverage agrees with the coverage investigation and execution evidence | Pass | Case IDs match the execution report's AC-proof and Cases tables. I checked these evidence values myself: TF-03 `openedProjection`/`openedFileChanges` "ok"; TFU-04 `approvalShown: true`, `approvedByStream: []`. Round 2: `API-TF-r4-run.log` 12/12 with TF-07 at 9.9 s; `TF-07.json` shows exactly one run-named `TEAM_RUN_DEFINITION_NOT_FOLLOWED` for each of broken, brokenAgain, ghost and gone; `API-TFL-r4-run.log` 2/2. TF-05 gained an assertion (the swapped-out member is leaving while its turn runs). |
| Test callers and fixtures exercise an independently established supported scenario rather than proving one by themselves | Pass | Every case realizes a requirements scenario (SCN-001..006 and the SR-010 additions) through supported surfaces |
| Each test enters through its scenario's real trigger and follows the real actor's or event's steps, without a setup real use does not produce | Pass | The definition changes through the package file on disk (package update, the Agent Package Creator) and the app editor's `updateAgentTeamDefinition`. Users act through the team WebSocket (`SEND_MESSAGE`, `INTERRUPT_GENERATION`, `APPROVE_TOOL`). Agents act through real agent tools (scripted AGY is sanctioned by `TESTING.md`; real models in TFL). Reopen goes through the user's message; restart through SIGTERM of the built server. |

## Findings

| Finding ID | Test Path / Scenario | Evidence | Required Action | Classification / Owner |
| --- | --- | --- | --- | --- |
| TR-001 | `team-run-follows-definition.e2e.test.ts` TF-07, TF-03, TF-05; wait limits of both suites | Round 1 (CRR-007): fixed sleeps and fixed windows around package-folder-watcher events, against `TESTING.md` "File watching on a busy Mac". Round 2: `6f76db6332`. TF-07 uses `settleValid` (stored-tree marker), `untilWarned`, a `loadIssues` wait and `sentinelLanded`, with no sleeps. TF-03 and TF-05 use an `untilFile` gate after `untilBusy`, opened after the leaving state is seen. TF-04, TF-08, TF-11 and TF-12 have positive waits; TF-04's 3 s window proves a non-event. All watcher waits use `OS_FILE_EVENT_WAIT_MS`; timeouts use `caseTimeout(n)` and `STEP_MS + FILE_EVENT_TEST_TIMEOUT_MS`. No assertion is weakened; TF-05 gained one. | — | **Resolved** (round 2) |

No open findings.

Notes, not findings:
- The `untilFile` poll in the shared fixture has no time limit, like `HOLD_TURN`'s `sleep 600`. A test that fails before opening its gate leaves the scripted turn waiting until the built server's teardown ends it, which `afterAll` does.
- TF-03, TF-05 and TF-07 depend on the state earlier cases leave, as the header states ("in order on one Team run"). The whole-file run proves them.

## Follow-ups

- Follow-ups this review added: None. FU-005 (episodic-catalog EC-04 as root) was added by API/E2E.

## Latest Authoritative Result

- Result: `Pass`
- Changed durable test paths reviewed: `team-run-follows-definition.e2e.test.ts`, `team-run-follows-definition-live.e2e.test.ts`, RC-51 in `remote-delegation-two-server.e2e.test.ts`, and the shared fixture `tests/fixtures/agy-failure-cli.mjs` (`untilFile`)
- Unresolved finding IDs: None (TR-001 resolved)
- Recommended Recipient: `delivery_engineer`
- Notes: Classification Large/High is preserved. Source review CRR-006 Pass; product source unchanged at `6c7af4a384`. Residual risks for delivery, from API-REV-004:
  - API-NF: the configured-placement copy and the application team run "not followed" are proven by unit tests only;
  - a follower step that throws after a commit skips the rest of that change (declared);
  - root-container limits: the release job's signing-record unit tests refuse uid 0, and FU-005;
  - FU-003, and FU-004 (urgent: the arm64 AppImage needs `libz.so`).
