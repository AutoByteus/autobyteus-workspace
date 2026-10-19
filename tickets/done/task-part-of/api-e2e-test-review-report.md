# API/E2E Test Review Report — task-part-of

## Review Meta

- Review Round: 1
- Trigger: API/E2E validation passed (API-REV-001), from `/software_engineering_team/api_e2e_engineer`
- Requirements Doc Reviewed As Context: `tickets/in-progress/task-part-of/requirements-doc.md` (SR-004)
- Investigation Notes Reviewed As Context: through the design spec (AF-001–AF-009)
- Solution Revision Record Reviewed As Context: SR-004, SR-005 (as in CRR-001)
- Design Spec Reviewed As Context: `tickets/in-progress/task-part-of/design-spec.md` (SR-005)
- Supplemental Task Artifacts Reviewed As Context: Product UI/UX spec (Approved), as in CRR-001
- Architecture Review Revision Record Reviewed As Context: ARCH-REV-001
- Implementation Revision Record Reviewed As Context: IR-001
- Original Code Review Report: `tickets/in-progress/task-part-of/code-review-report.md` (CRR-001, Pass)
- Code Review Revision Record: `tickets/in-progress/task-part-of/code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-002`
- Coverage Investigation: `tickets/in-progress/task-part-of/api-e2e-coverage-investigation.md`
- Execution Coverage Report: `tickets/in-progress/task-part-of/api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed As Context: `tickets/in-progress/task-part-of/api-e2e-revision-record.md` (API-REV-001)
- Delivery Revision Record: N/A
- API/E2E Result: Pass (all 20 ACs proven; API-08 browser probe of the live cascade and API-09 isolated desktop instance executed)
- Final Validation Confidence: 96%
- Prior unresolved test-review findings rechecked: none (first test review)
- Project testing guideline applied: the worktree's `TESTING.md` (the copy the coverage investigation records). Its Rule 6 is "Assertions first" and its Rule 9 is "Fix every failure; baseline fix as its own commit". The browser-probe rules also apply. Conflicts or discrepancies: none.
- Supported Product Scenario Basis Confirmed: `Yes`. SCN-001 to SCN-011 were confirmed in CRR-001, and product code is unchanged since `179ddb9f77` (verified: `git diff 179ddb9f77..HEAD` shows no changes to server `src` or web product files).

Reviewed commits: `f1902e8a7b` (server E2E) and `ca37919cdf` (web probe baseline fix).

## Changed Durable Test Scope

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/projects/project-task-parts-live.e2e.test.ts` | Added | SCN-011, SCN-007, SCN-006, SCN-005; AC-018, AC-008, AC-007, AC-006, AC-003, AC-014 | The cascade's live effect on really running task agents, plus the `/ws/projects` feed, through the real server and the Manager's MCP session | Gated (`RUN_AGY_FAILURE_E2E` + scripted AGY CLI), like its sibling live suites |
| `autobyteus-server-ts/tests/e2e/projects/project-task-boundaries.e2e.test.ts` | Updated (POF-API-001 added; 19 acks + CTX-E2E-001 key lists pinned additively) | SCN-002, SCN-005, SCN-008, SCN-010, SCN-011; AC-003, 004, 006, 014, 015, 018 | Tool boundary over MCP equals native | Existing suite's fixture pattern (`agent_run_resources.json` with `fixture-root` / `fixture-manager`, lines 425, 597, 679) reused for the open run resource |
| `autobyteus-server-ts/tests/e2e/projects/projects-graphql.e2e.test.ts` | Updated (API-011 added; API-007 field list) | SCN-001, SCN-005, SCN-006, SCN-009, SCN-010; AC-001–005, 007, 016 | The GraphQL boundary the app uses | Omitted / null / ID, as variables and inline literals; exact refusal messages; folder snapshot; concurrency; step-1 file shape |
| `autobyteus-server-ts/tests/e2e/projects/project-task-search.e2e.test.ts` | Updated (POF-SEARCH-001; one exact result pin) | SCN-008; AC-015 | Search tool results | Numeric order checked with keys 2 and 11 |
| `autobyteus-server-ts/tests/e2e/projects/project-change-feed.e2e.test.ts` | Updated (snapshot query adds `partOfTaskId`) | AC-008 | Feed snapshot | Additive |
| `autobyteus-server-ts/tests/e2e/projects/project-task-context-files-delegation.e2e.test.ts` | Updated (3 acks) | Preserved behavior | Additive `partOf: null` | — |
| `autobyteus-server-ts/tests/e2e/projects/task-existing-copy-assignment.e2e.test.ts` | Updated (3 acks) | Preserved behavior | Additive `partOf: null` | — |
| `autobyteus-web/tests/e2e/project-manager-ux-probe.mjs` (PMU-002) | Updated (baseline fix) | Existing probe; not part-of | Waits until the root line is live **and openable** before asserting | The cause is named (openable needs the hosting run listed). The assertion is unchanged; only the wait condition is stricter. |
| `autobyteus-web/tests/e2e/project-manager-ux-task-locator-cases.mjs` (PMU-021) | Updated (baseline fix) | Existing probe; not part-of | "Settled" center now also requires the Manager's header to have left `Running` | A stricter settle condition; nothing is weakened |

- No durable test file changed: `No`

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | IDs POF-LIVE-001..003, POF-API-001, API-011 and POF-SEARCH-001, with titles that name the ACs. Inline comments tie each block to its AC / REQ / DEC. |
| Assertions prove approved requirements instead of incidental implementation details | Pass | Assertions check exact acks (`closedParts` in key order), stored statuses, byte-identical files of parts that were already closed, the closure event, `closedAt`, process exit, and the `send_message_to` refusal `TASK_AGENT_RESOURCE_CLOSED`. They also check feed frames (`partOfTaskId`, and `updatedAt` kept on cleanup), exact refusal messages with a projects-folder snapshot, exactly-one concurrent success, and the step-1 file bytes kept until the file's own save. The shape pins are additive only (`partOf: null`, field lists). |
| Fixtures, setup, helpers, and data builders reuse meaningful repetition | Pass | Within each new case: `ack`, `make`, `delegateRunning`, `upserts`, `toolError`, `listed`, `create` / `update`. Shared harnesses are reused (`startStudioE2eRuntimeServer`, `until`, `sendE2eSendMessageCommand`). The scripted-AGY result helpers (`calledResults`, `toolResult`, `liveAgyCwds`) are copied locally, as in 13–14 sibling suites; that pre-existing duplication is FU-TR-001. |
| Test isolation and determinism are appropriate for the exercised boundary | Pass | Each suite uses its own temp data dir, server and sockets, with cleanup recorded (no remaining roots or AGY processes). Live waits are bounded `until` conditions, not sleeps. The GraphQL `pause()` (5 ms) only separates `updatedAt` stamps. POF-LIVE-002/003 build on the frames and Tasks of 001 in the same file; that is documented and fits a one-stream scenario suite. |
| Large files remain coherent and navigable rather than mixing unrelated scenarios | Pass | The new live file covers one subject (the cascade and feed, live). The added blocks stay in the suites that own their boundary (tools, GraphQL, search). |
| No stale, duplicated, disabled-without-reason, or compatibility-only tests remain | Pass | No skips other than the suites' documented gates. The pins were updated, not deleted. |
| Added, updated, and removed coverage agrees with the coverage investigation and execution evidence | Pass | Matches the report's Cases table. The pins the handoff missed (search, feed, existing-copy) were found by the API-00 baseline. The context-files anomaly is explained, with a HEAD-only run (`API-06-head-context-files.log`). |
| Test callers and fixtures exercise an independently established supported scenario rather than proving one by themselves | Pass | Every case maps to an approved SCN / AC. The step-1 `task.json` rewrite reproduces SCN-009 upgrade data. The tool-level open run resource uses the suite's established fixture shape, and the real running task agent path is proven separately in POF-LIVE-001. |
| Each test enters through its scenario's real trigger and follows the real actor's or event's steps, without a setup real use does not produce | Pass | The live suite drives the Manager's own MCP tools (`create_task`, `delegate_task`, `send_message_to`, `update_task`), as the Project Task Manager does. The GraphQL case sends Edit task's shape (description plus relation fields). Only the external AGY CLI is scripted. |

## Findings

None.

## Follow-ups

| Follow-up ID | What is wrong, where | Evidence | Why it is outside this ticket | Suggested Task description |
| --- | --- | --- | --- | --- |
| FU-TR-001 | The scripted-AGY E2E helpers are re-declared per suite in `autobyteus-server-ts/tests/e2e/projects/*`: `calledResults` (14 suites), `toolResult` (13), `liveAgyCwds` (6) | `grep -rl` over `tests/e2e`; `tests/e2e/helpers/` has no shared module for them | The duplication predates this ticket; the new suite follows the established local pattern. Extracting the helpers touches many unrelated suites. | "Move the scripted-AGY tool-result helpers (calledResults, toolResult, liveAgyCwds, callTool, segment) into one module under tests/e2e/helpers and use it from every projects E2E suite." |

- Sent to: `/project_task_manager`, in one message after this report.

## Latest Authoritative Result

- Result: `Pass`
- Changed durable test paths reviewed: the 9 paths above (commits `f1902e8a7b`, `ca37919cdf`)
- Unresolved finding IDs: none
- Recommended Recipient: `/software_engineering_team/delivery_engineer`
- Notes: no source review is reopened, because product code is unchanged since CRR-001. The web probe baseline fix follows TESTING.md Rule 9: its own commit, the cause named, and the assertions not weakened. I reran nothing; the diffs and the recorded evidence were enough to judge every changed assertion.
