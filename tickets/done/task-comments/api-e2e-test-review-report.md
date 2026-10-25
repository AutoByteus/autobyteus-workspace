# API/E2E Test Review Report — task-comments

## Review Meta

- Review Round: 1
- Trigger: API/E2E validation passed (API-REV-001), from `/software_engineering_team/api_e2e_engineer`
- Requirements Doc Reviewed As Context: `tickets/in-progress/task-comments/requirements-doc.md` (SR-013)
- Investigation Notes Reviewed As Context: through the design spec (AF-001–AF-009)
- Solution Revision Record Reviewed As Context: SR-011 to SR-013, as in CRR-001
- Design Spec Reviewed As Context: `tickets/in-progress/task-comments/design-spec.md` (SR-013)
- Supplemental Task Artifacts Reviewed As Context: `follow-ups.md` (FU-001 to FU-004)
- Architecture Review Revision Record Reviewed As Context: ARCH-REV-002
- Implementation Revision Record Reviewed As Context: IR-001
- Original Code Review Report: `tickets/in-progress/task-comments/code-review-report.md` (CRR-001, Pass)
- Code Review Revision Record: `tickets/in-progress/task-comments/code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-002`
- Coverage Investigation: `tickets/in-progress/task-comments/api-e2e-coverage-investigation.md`
- Execution Coverage Report: `tickets/in-progress/task-comments/api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed As Context: `api-e2e-revision-record.md` (API-REV-001)
- Delivery Revision Record: N/A
- API/E2E Result: Pass. All critical ACs are proven, and the broader validation was required and executed: API-08 (browser probe with a running Manager) and API-09 (isolated desktop instance, J1–J8).
- Final Validation Confidence: 96%
- Prior unresolved test-review findings rechecked: none (first test review)
- Project testing guideline applied: the worktree's `TESTING.md` (Rule 6 "Assertions first", Rule 9 "Fix every failure; find its cause first"; the browser-probe rules). Rule 9 was checked against the two failures recorded outside this ticket:
  - FU-003: the cause is found (the suite predates autobyteus-197's launch / restore contract), and the fix needs that design's decisions, so it is not a small local fix.
  - FU-004: the cause is reproduced (a product defect in file-explorer streaming, not caused by this change).

  Both are reported as their own items with their causes, and neither is closed as "flaky" or "pre-existing". This is consistent with Rule 9. Conflicts or discrepancies: none.
- Supported Product Scenario Basis Confirmed: `Yes`. Scenarios as in CRR-001. Product code is unchanged since `e014c349b8`: `git diff e014c349b8..HEAD` shows no change in server `src` or web product files.

Reviewed commit: `e9e4fba0b4`.

## Changed Durable Test Scope

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/projects/project-task-comments-live.e2e.test.ts` | Added | SCN-001, SCN-007; AC-001, AC-010 (new and existing task agent), REQ-007 wire | Comments through the real server, the Manager's MCP session and live delegated task agents; the `/ws/projects` feed | Gated (`RUN_AGY_FAILURE_E2E` + scripted AGY CLI), like its sibling live suites. CMT-LIVE-002 and 004 build on 001's Tasks and frames in the same file, which fits a one-stream scenario suite. |
| `autobyteus-server-ts/tests/e2e/projects/project-task-boundaries.e2e.test.ts` | Updated: CMT-API-001 and CMT-API-002 added; CTX-E2E-001 key list | SCN-001, SCN-005, SCN-006; AC-001, 005, 008, 009 | The tool boundary over MCP equals the native tool; `partsNotClosed` | The open-run fixture uses the suite's established `agent_run_resources.json` shape. AC-009's damaged data is real unparsable bytes in a test-owned root (DESIGN.md rule 7 scenario), and the Project is deleted afterwards. |
| `autobyteus-server-ts/tests/e2e/projects/projects-graphql.e2e.test.ts` | Updated: API-012 added; API-007 mutation list and API-011 key set pinned additively | SCN-002, SCN-003; AC-001 (app side), AC-003, AC-011 | The GraphQL boundary the app uses | Schema shapes, numbering and trimming, exact refusal codes and messages with a folder snapshot. A description edit keeps the thread. An older-release `task.json` keeps its bytes until its own save. |
| `autobyteus-server-ts/tests/e2e/projects/project-task-search.e2e.test.ts` | Updated: CMT-SEARCH-001 | SCN-005, SCN-009; AC-005, AC-016 | The board's GraphQL search and the search tool | Case-insensitive; `commentCount` present only when > 0; no comment text in the tool result |
| `autobyteus-server-ts/tests/e2e/projects/project-change-feed.e2e.test.ts` | Updated: snapshot query adds `comments` | REQ-007 | Feed snapshot | Additive |

- No durable test file changed: `No`

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | The IDs CMT-LIVE-001..004, CMT-API-001/002, API-012 and CMT-SEARCH-001 have titles that name their ACs, and comments tie each block to a REQ / DEC. |
| Assertions prove approved requirements instead of incidental implementation details | Pass | The assertions check: exact numbering 1–4 in order; the description untouched; the ack exactly unchanged (DEC-024); exact work-text substrings with no IDs or times (`not.toMatch(/#1\|#2\|…T/)`); one-write proof over every feed view (status DONE if and only if 3 comments); refusals leaving the folder byte-identical and the open run open; `partsNotClosed` exact, and absent when every part closes; the older-file bytes kept. The `updatedAt === comments[2].createdAt` assertion pins the designed one-timestamp write (REQ-002 / DEC-008), which is acceptable. |
| Fixtures, setup, helpers, and data builders reuse meaningful repetition | Pass | The local `openRunFixture`, `toolError`, `ack`, `create` / `add` / `listed`, plus the shared harnesses. The scripted-AGY helper duplication across suites predates this ticket and is already in Task autobyteus-59 (task-part-of FU-TR-001). |
| Test isolation and determinism are appropriate for the exercised boundary | Pass | Each suite owns its data root and server. Live waits are bounded `until` conditions. The 5 ms pauses only separate timestamps. CMT-API-002 deletes its Project, so no damaged data is left for later cases. |
| Large files remain coherent and navigable rather than mixing unrelated scenarios | Pass | The live suite covers one subject; the added blocks sit in the suites that own their boundary. |
| No stale, duplicated, disabled-without-reason, or compatibility-only tests remain | Pass | Only the suites' documented gates skip. The pins were updated, not deleted. |
| Added, updated, and removed coverage agrees with the coverage investigation and execution evidence | Pass | Matches the report's Cases table. The baseline found the four unforeseen pins. API-07 shows 2 failures, identical to the pre-edit baseline and recorded as FU-003. The PMU-021 intermittency is FU-004 (cause reproduced). |
| Test callers and fixtures exercise an independently established supported scenario rather than proving one by themselves | Pass | Every case maps to an approved SCN / AC. The damaged-run-data setup reproduces SCN-006, a Supported Explicit Edge (DESIGN.md rule 7, autobyteus-187). The older-release `task.json` reproduces REQ-013 upgrade data. |
| Each test enters through its scenario's real trigger and follows the real actor's or event's steps, without a setup real use does not produce | Pass | The live suite drives the Manager's own `update_task` / `delegate_task` and reads the worker's received text. The GraphQL case uses the app's mutation; the search case uses the board's query and the tool. Only the external AGY CLI is scripted. |

## Findings

None.

## Follow-ups

Findings outside this ticket go in the ticket's `follow-ups.md`.

- Follow-ups this review added: None. FU-003 and FU-004 were added by API/E2E; I checked them under TESTING.md Rule 9 above.

## Latest Authoritative Result

- Result: `Pass`
- Changed durable test paths reviewed: the 5 paths above (commit `e9e4fba0b4`)
- Unresolved finding IDs: none
- Recommended Recipient: `/software_engineering_team/delivery_engineer`
- Notes: source review is not reopened, because product code is unchanged since CRR-001. I reran nothing; the diffs and the recorded evidence were enough to judge every changed assertion. AC-002 (concurrent comments) is proven by unit tests only (QR-001), as recorded by API/E2E.
