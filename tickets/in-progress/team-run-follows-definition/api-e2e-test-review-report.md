# API/E2E Test Review Report

## Review Meta

- Review Round: 1
- Trigger: API/E2E validation passed on the final source `6c7af4a384` (API-REV-003, round 3); proportional review of the durable tests API/E2E added
- Requirements Doc Reviewed As Context: `requirements-doc.md` (Approved; REQ-001..REQ-009, AC-001..AC-010)
- Investigation Notes Reviewed As Context: through the design's citations
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (through SR-010)
- Design Spec Reviewed As Context: `design-spec.md` (SR-010; § Exact Texts, Member States, DS-004, DS-007)
- Supplemental Task Artifacts Reviewed As Context: `follow-ups.md` (FU-001..FU-005)
- Architecture Review Revision Record Reviewed As Context: ARCH-REV-004
- Implementation Revision Record Reviewed As Context: IR-001..IR-004
- Original Code Review Report: `code-review-report.md` (CRR-006, Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-007`
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- Execution Coverage Report: `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed As Context: `api-e2e-revision-record.md` (API-REV-001..API-REV-003)
- Delivery Revision Record Reviewed As Context: N/A
- API/E2E Result: Pass, final confidence 95.4%
- Prior unresolved test-review findings rechecked: None (first test review of this ticket)
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

- No durable test file changed: `No`

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | Each `it` names its case ID, criteria and outcome. The file header lists every case, the prerequisites, gates and the exact command. The live suite does the same. |
| Assertions prove approved requirements instead of incidental implementation details | Pass | Notice and refusal texts are copied from design § Exact Texts, so they check the source independently. The stored tree (`formerMembers`, `leaving`, `copiedFrom`) is read from the file. Run-tree rows are read through the app's `runTree` query. Delivery is proven in the receiver's memory, and non-delivery too (`reviewerGotStop`). TFL-02 proves the approved command ran (file on disk). |
| Fixtures, setup, helpers, and data builders reuse meaningful repetition | Pass | Existing helpers are reused (`collaboration-root-harness`, `websocket-command-helpers`, `built-server-launch-credential`, `run-tree-delegated`, `until`). Local helpers each remove repetition (`calls`, `echo`, `stored`, `storedLeaving`, `leavingRows`, `removeWhileHeld`). Starting the built server inline matches the codebase's existing built-server suites (about 20 files do the same). |
| Test isolation and determinism are appropriate for the exercised boundary | **Fail** | **TR-001.** Several cases wait for package-folder-watcher events with fixed sleeps and fixed windows, against `TESTING.md` "File watching on a busy Mac". Details under Findings. The rest is sound: a test-owned data root and HOME, unique IDs, real SIGTERM with a forced-kill fallback, cleanup in `afterAll`, and HOLD_TURN for the leaving cases in TF-04, TF-11 and TF-12. |
| Large files remain coherent and navigable rather than mixing unrelated scenarios | Pass | One file per boundary (scripted built server, real runtimes) plus one case in the two-server suite. Cases build on one Team run, as the header states ("in order on one Team run unless named"), which suits an E2E journey. |
| No stale, duplicated, disabled-without-reason, or compatibility-only tests remain | Pass | Skips are only the documented gates. No duplicated cases. |
| Added, updated, and removed coverage agrees with the coverage investigation and execution evidence | Pass | Case IDs match the execution report's AC-proof and Cases tables. I checked the evidence values myself: TF-03 `openedProjection`/`openedFileChanges` "ok"; TFU-04 `approvalShown: true`, `approvedByStream: []`; IMP-20 and r3 TF 12/12. |
| Test callers and fixtures exercise an independently established supported scenario rather than proving one by themselves | Pass | Every case realizes a requirements scenario (SCN-001..006 and the SR-010 additions) through supported surfaces |
| Each test enters through its scenario's real trigger and follows the real actor's or event's steps, without a setup real use does not produce | Pass | The definition changes through the package file on disk (package update, the Agent Package Creator) and the app editor's `updateAgentTeamDefinition`. Users act through the team WebSocket (`SEND_MESSAGE`, `INTERRUPT_GENERATION`, `APPROVE_TOOL`). Agents act through real agent tools (scripted AGY is sanctioned by `TESTING.md`; real models in TFL). Reopen goes through the user's message; restart through SIGTERM of the built server. |

## Findings

| Finding ID | Test Path / Scenario | Evidence | Required Action | Classification / Owner |
| --- | --- | --- | --- | --- |
| TR-001 | `team-run-follows-definition.e2e.test.ts`: TF-07, TF-03, TF-05 (and the wait limits of both new suites) | (1) **TF-07** (`:477-520`) writes `team-config.json`, then `await wait(6_000)` (also `wait(4_000)` and `wait(5_000)` between steps), then asserts *positive* outcomes in that window: `runWarnings(lines).toHaveLength(1)` for four breakages, and `loadIssues` not empty. The next step's measuring window (`from = server.output().length`) starts after a fixed sleep, so a late event from the previous edit (the valid restore, which clears the warn-once entry) can fall into or miss the window. `TESTING.md` records watcher events arriving up to ~14.5 s late on a busy Mac and requires waiting until the condition holds, with limits from `os-latency-under-load.ts`, never against a fixed bound. Here a late event yields 0 warnings or a shifted count with no product fault. (2) **TF-03** (`:352-356`) and **TF-05** (`:437-439`) make the member busy with a scripted send delayed 8 s, then write the removal after a 1–1.5 s sleep. The case is valid only if the watcher event lands before the 8 s send fires. With a late event the member is idle at removal, no `leaving` is written, and the `until(… leaving, 30_000)` fails, again with no product fault. TF-04, TF-11 and TF-12 already use `HOLD_TURN`, which has no such window. (3) Wait limits for watcher events are literals (`60_000`, `30_000`), not `OS_FILE_EVENT_WAIT_MS` / `FILE_EVENT_TEST_TIMEOUT_MS` as `TESTING.md` names. | (1) In TF-07, wait for each positive outcome with `until(…, OS_FILE_EVENT_WAIT_MS)` (the warning line for this run and reason; the load issue). To assert *exactly one*, write a sentinel change after the breakage and wait for its effect, then count warnings before it, as `TESTING.md` describes, or use a short quiet window after the first warning only for the "no second warning" part. Start each measuring window from a known settled state (wait for the valid restore's effect, e.g. the warn-once reset or its reload, before the next breakage). (2) In TF-03 and TF-05, keep the member busy independently of watcher latency: `HOLD_TURN` and release it after the leaving state is observed, or a delay well above `OS_FILE_EVENT_WAIT_MS` with the send asserted after the leaving state. (3) Take the watcher-event wait limits and the affected vitest timeouts from `os-latency-under-load.ts`. No assertion is weakened: the same outcomes are proven, only without timing windows. Rerun TF-03, TF-05 and TF-07 (and the whole file once) after the change. | `Local Fix` / `api_e2e_engineer` |

TR-001 is a test-code determinism defect against an established project rule. It is not a product defect: every case passed on Linux, where watcher events are fast, and the behavior it proves is unchanged.

## Follow-ups

- Follow-ups this review added: None. FU-005 (episodic-catalog EC-04 as root) was added by API/E2E.

## Latest Authoritative Result

- Result: `Fail`
- Changed durable test paths reviewed: the three listed above
- Unresolved finding IDs: TR-001
- Recommended Recipient: `api_e2e_engineer` (bounded test-code correction). After it: rerun the affected cases, then this review again; then delivery.
- Notes: Classification Large/High is preserved. Every other check passes, and the source review result (CRR-006 Pass) is unaffected. Residual risks for delivery are carried from API-REV-003: API-NF (configured-placement copy and application run "not followed" are proven only by unit tests), the declared follower-step risk, root-container limits, FU-003, FU-004 and FU-005.
