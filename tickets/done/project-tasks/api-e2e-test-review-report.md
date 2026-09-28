# API/E2E Test Review Report

Package `PROJ-TASKS-20260926-001` — `project-tasks`.

## Review Meta

- Review Round: `2`. This supersedes round 1 (`CRR-002`), which reviewed the probe for the now-rejected two-pane UI.
- Trigger: `/api_e2e_engineer` reported that API/E2E round 2 passed (`API-REV-002`) against the SR-008 UI, `IR-002` at `ae0cd4755`.
- Requirements Doc Reviewed As Context: `requirements-doc.md` (`SR-008` basis, `APPROVAL-PROJ-TASKS-20260927-002`)
- Investigation Notes Reviewed As Context: `investigation-notes.md`
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (`SR-001`–`SR-008`)
- Design Spec Reviewed As Context: `design-spec.md` (`SR-008`)
- Supplemental Task Artifacts Reviewed As Context: `handoff-to-architecture-review-sr-008.md`
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md` (`ARCH-REV-003`)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md` (`IR-002`)
- Original Code Review Report: `code-review-report.md` (`CRR-003`, Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-004`
- Coverage Investigation: `api-e2e-coverage-investigation.md` (Round 2 section)
- Execution Coverage Report: `api-e2e-execution-coverage-report.md` (authoritative, round 2)
- API/E2E Revision Record Reviewed As Context: `api-e2e-revision-record.md` (`API-REV-002`)
- Delivery Revision Record Reviewed As Context: `delivery-revision-record.md` (`DR-001`, rejected by the user; not finalized)
- API/E2E Result: `Pass`
  - Browser probe: 29/29, three identical runs.
  - Server: 45 files / 275 tests, including `tests/e2e/projects` API-001 to API-009 with the shell's `ENABLE_*` variables set.
  - Web: 1184 of 1185 pass. The one failure is the pre-existing `org-definition-navigation`.
  - Both localisation guards pass.
- Final Validation Confidence: 95% (reported)
- Prior unresolved test-review findings rechecked: None (`CRR-002` had none).
- Supported Product Scenario Basis Confirmed: `Yes`

## Changed Durable Test Scope

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-web/tests/e2e/projects-feature-probe.mjs` | Updated. Rewritten by implementation in `ae0cd4755`. API/E2E added +97/−2 lines, still uncommitted. | **E2E-001–013** restore the v1.4.86 journeys. **E2E-014–027** cover the SR-008 board: AC-001–AC-008, AC-010–AC-012, the AC-002 width guards and REQ-013. **E2E-028** is a width sweep for REQ-006 / AC-002 / DEC-016. **E2E-029** covers REQ-016 / AC-011: Back in the error state, and the 2-line description clamp from the UI rules. | The browser journey probe for the Projects feature and Project Tasks on the full-width Project page board | I diffed E2E-001–013 against the v1.4.86 probe (`e06080b00`). The differences are only: helper extraction (`projectCard`, `gridNames`); `openProjectDetail(…, { tab: 'workspaces' })` and `?tab=workspaces`, needed because Tasks is now the default tab; one added keyboard tab switch (ArrowRight to Workspaces) in E2E-007; and in E2E-008, the "no Task wording" check replaced by a raw-translation-key check, with the Task label added to the zh-CN expectations. That last change is correct under REQ-011. The round-1 two-pane cases were rightly replaced rather than kept. |
| `autobyteus-server-ts/tests/e2e/projects/projects-graphql.e2e.test.ts` | Unchanged since `768c155f6` | API-001–009 | — | Reviewed in round 1 (`CRR-002`, Pass). The committed file contains the reviewed content: API-007–009 and the hermetic `ENABLE_*` handling. The server is unchanged, so nothing new to review. |

- No durable test file changed: `No`

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | Case titles state the SR-008 outcome, for example "E2E-020 Grid → full-width Project page → '← Projects'; deep link opens the board; unknown id not-found with Back" and "E2E-028 Width sweep … never squeezed". |
| Assertions prove approved requirements instead of incidental implementation details | Pass | The assertions check approved, user-visible outcomes: <br>• column heading text and counts ("To Do 1\|In Progress 0\|Done 0"); <br>• cards in the To Do column; <br>• the card's accessible name is the summary; <br>• no status controls, inner controls, selects or draggables on the board or in the dialog; <br>• newest-first order; <br>• the card count line variants; <br>• Back position and navigation; <br>• measured column widths ≥ 240 px or stacked, and no horizontal overflow; <br>• the 3-line card clamp and 2-line description clamp, measured by rendered height with the full text still in the DOM. <br>The width checks assert the approved rule (≥ 240 px or stacked). They do not pin the 752 px threshold, which stays an implementation detail. |
| Fixtures, setup, helpers, and data builders reuse meaningful repetition | Pass | Shared `projectCard`, `gridNames`, `boardColumn`, `columnHeading`, `boardColumnBoxes`, `taskCard`, `cardCounts`, `noStatusControlIn` and `openProjectDetail({ tab })`. E2E-027 and E2E-028 repeat a short side-panel drag sequence; extracting it into a helper would be an optional tidy-up. |
| Test isolation and determinism are appropriate for the exercised boundary | Pass | Isolated nodes and a scrubbed environment as before. The new cases create their own Projects and browser contexts and delete or close them afterwards. E2E-029 scopes its GraphQL interception to one context and calls `unroute` before the positive check. The run is deterministic across three identical 29/29 runs. The sweep's `sleep(150)` after each viewport resize is a fixed settle wait. That is acceptable for a layout sweep with 44 samples and no observed flakiness, but polling for a stable column box would be more robust (optional). |
| Large files remain coherent and navigable rather than mixing unrelated scenarios | Pass | About 1885 lines covering one feature surface (Projects and Tasks): shared helpers, then self-contained `runCase` blocks in two labelled sections. The earlier suggestion stands: split the Task journeys into their own probe if the admission ticket grows this further. |
| No stale, duplicated, disabled-without-reason, or compatibility-only tests remain | Pass | The two-pane cases were removed rather than disabled, and the header comment was corrected. There are no skipped cases. |
| Added, updated, and removed coverage agrees with the coverage investigation and execution evidence | Pass | The case IDs E2E-001–029 match the round 2 execution report and ledger sequences 21–25. The results match `/tmp/ptasks-logs/r2/probe-run1/result.json` and the two confirmation runs. |
| Test callers and fixtures exercise an independently established supported scenario rather than proving one by themselves | Pass | **E2E-029:** it injects a synthetic `GetProject` failure only to reach the approved "error" state. That state is a required state in the requirements' UI section, and the "Back in every state" rule comes from SR-008. The test creates no new scenario. **E2E-026:** the mixed-status fixture still asserts only the approved rendering contracts (one card per column, counts, "2 open tasks" excluding Done), and records the unreachable delete-count behavior only as an observation. **E2E-028:** it exercises the approved AC-002 guard (default and maximum side panel, varying window width) across a range rather than at one point. |

## Findings

None.

## Latest Authoritative Result

- Result: `Pass`
- Changed durable test paths reviewed:
  - `autobyteus-web/tests/e2e/projects-feature-probe.mjs`: the `ae0cd4755` rewrite plus the uncommitted round-2 additions E2E-028 and E2E-029 and the header correction.
  - `autobyteus-server-ts/tests/e2e/projects/projects-graphql.e2e.test.ts` was confirmed unchanged; it was reviewed in round 1.
- Unresolved finding IDs: None
- Recommended Recipient: `/delivery_engineer`
- Notes:
  - The probe's round-2 additions are uncommitted, and delivery should commit them.
  - `DR-001` must not be finalized as-is. Delivery re-runs integration and docs sync on `ae0cd4755` plus these tests.
  - The uncommitted docs edits describe the rejected two-pane UI and must be redone. `autobyteus-web/test-results/` and the SDK `dist/` folders are leftovers and should not be committed.
  - Optional polish:
    - extract the side-panel drag into a helper;
    - replace the sweep's fixed settle wait with polling;
    - split the Task journeys into their own probe if the file grows.
  - Carried product notes, all non-blocking:
    - focus falls to `BODY` after a Task is deleted from its dialog;
    - the delete count uses `openTaskCount`; revisit at admission;
    - the stack threshold falls at a window of about 1140 px with the default side panel, and about 1340 px with the 520 px panel. This is the approved stack-not-squeeze behavior.
  - Task size `Medium` and architectural risk `High` are preserved.
