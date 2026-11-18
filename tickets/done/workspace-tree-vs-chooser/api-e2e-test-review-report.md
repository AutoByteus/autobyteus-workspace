# API/E2E Test Review Report

## Review Meta

- Review Round: 1
- Trigger: API/E2E round 1 (API-REV-001) `Pass`, 93%. Head `0b8f2075da`; test commits `25769bc969` (baseline fixes) and `450fe43929` (this ticket's coverage). The code under test is unchanged (`a5fc23849e`, `0d3c31c4ae`, `71ce23ced8`).
- Requirements Doc Reviewed As Context: `requirements-doc.md` (REQ-002, REQ-004, REQ-006…REQ-011; AC-002, AC-005, AC-009, AC-011, AC-012)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (as cited)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-004)
- Design Spec Reviewed As Context: `design-spec.md` ("Tests → API/E2E", "Risks", DS-002)
- Supplemental Task Artifacts Reviewed As Context: `follow-ups.md` (FU-001…FU-005)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md` (ARCH-REV-004)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md` (IR-001, IR-002)
- Original Code Review Report: `code-review-report.md` (CRR-002 `Pass`)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-003`
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- Execution Coverage Report: `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed As Context: `api-e2e-revision-record.md`
- Delivery Revision Record Reviewed As Context (delivery re-entry only): N/A
- API/E2E Result: `Pass` (API-REV-001)
- Final Validation Confidence: 93%
- Prior unresolved test-review findings rechecked: None (first test review)
- Project testing guideline(s) applied: `TESTING.md`, as the coverage investigation records it (probe-owned stack, clean environment, scripted AGY, one heavy run at a time, never the user's data). No conflicts.
  - Discrepancy noted, not a test-code issue: the budget was measured at a load average of about 70 on 10 CPUs. TESTING.md's one-heavy-run rule governs this worktree's runs, but other worktrees' load cannot be excluded. The evidence records the load with each window.
- Supported Product Scenario Basis Confirmed: `Yes`. Each case traces to an approved criterion or the design's API/E2E list: SCN-A…SCN-E and SCN-D2 of the code review, plus the design's 250 ms budget and the phone/desktop window risk.

## Changed Durable Test Scope

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-web/tests/e2e/run-history-read-budget-probe.mjs` | Added (410 lines) | Design Risks (250 ms), C-05; DS-002, DS-005 | Seed once through public APIs, then time the app's poll read on each build and check its content | It reads each build's own query documents, so a base build is measured with its own fields. Content checks RB-C1…C4 (window `null`, newest 6, per-folder `null`, `lastActivityAt`); budget checks RB-B1…B3 |
| `autobyteus-web/tests/e2e/workspace-views-chooser-cases.mjs` | Added (380 lines) | WVC-001 AC-012, VIS-017; WVC-002 AC-002, AC-005, CR-001; WVC-003 AC-009, AC-011, DS-002, DS-007; WVC-004 DS-002 and the phone/desktop risk | The run section's views and the chooser Remove on a real stack | Opt-in, because the cases archive runs and remove folders |
| `autobyteus-web/tests/e2e/delegated-launch-defaults-probe.mjs` | Updated (+7) | — | Registry and header | Registers the WVC cases only when selected |
| `autobyteus-web/package.json` | Updated (+2) | — | Scripts | `test:e2e:workspace-views-chooser`, `test:e2e:run-history-read-budget` |
| `autobyteus-web/tests/e2e/projects-left-navigation-probe.mjs` | Updated (PLN-08) | REQ-009; 353 AC-004 preserved | A Project created after the restart is listed once it has a run | Replaces the assertion that a Project with no run is listed live |
| `autobyteus-web/tests/e2e/task-closure-tree-probe.mjs`, `team-status-live-probe.mjs` | Updated (one wait each) | REQ-009 (Temp listed only with a run) | Wait for the folder used, not for two rows | — |
| `agent-org-task-team-disclosure-probe.mjs`, `background-agent-renderer-contention-probe.mjs`, `standalone-agent-error-stop-probe.mjs`, `fixtures/agent-org-task-team-disclosure.page.vue` | Updated (baseline, +16) | Preserved tree rows (API-08) | Answer the app-wide feeds (`agent-package-definitions`, `update-notifications`) that these backend-less probes never answered; give the fixture's Team copies their recorded `source` | Causes outside this ticket (autobyteus-210 feeds; the `source` field since `7d689455ad`). The tests follow the current code (DESIGN.md rule 11); no compatibility shim |

- No durable test file changed: `No`

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | Each WVC case's header names its AC/DS and its steps. The budget probe's header documents the seed and measure steps, the windows and the checks. Check IDs RB-C1…C4 and RB-B1…B3 |
| Assertions prove approved requirements instead of incidental implementation details | Pass | The checks cover: rows in the tree (`data-workspace-root`); chooser options; the chip falling back to Temp; the exact success and refusal toasts; the registry and files on disk; history on the server per run kind; the window on the wire (`null`, 6, `null`; the phone 5); "Show older (N)" against the server count; Archive all older refused and then exact; the view surviving a reload; p95 per poll read against 250 ms, and the capped read against base |
| Fixtures, setup, helpers, and data builders reuse meaningful repetition | Pass | `newFolder`, `agentRun`/`teamRun`/`orgRun`, `historyAll`, `chooseView`, `recordWindows`; the probe registry's shared helpers; the Phone Access pairing as in LRL-004 |
| Test isolation and determinism are appropriate for the exercised boundary | Pass (with notes) | Probe-owned stack and data root; a fresh folder per case; a private HOME and a temp copy of the seed for the budget probe; cleanup receipts. Notes below on fixed waits |
| Large files remain coherent and navigable rather than mixing unrelated scenarios | Pass | One ticket per file |
| No stale, duplicated, disabled-without-reason, or compatibility-only tests remain | Pass | PLN-08's stale expectation (a Project without runs listed) was replaced. The opt-in registration is stated with its reason |
| Added, updated, and removed coverage agrees with the coverage investigation and execution evidence | Pass | API-02…API-08 and API-10 map to these files. API-09 (real AGY) is Not Tested with a reason (unchanged subject, needs the host login) |
| Test callers and fixtures exercise an independently established supported scenario rather than proving one by themselves | Pass | Runs a case only needs to exist are created through public GraphQL. The start, Remove, archive and view actions the scenarios are about go through the UI |
| Each test enters through its scenario's real trigger and follows the real actor's or event's steps | Pass | Real triggers: first send in the composer; archive and stop in the Runs view; Remove and confirmation in the chooser; the `⋯` menu; reload; Phone Access pairing. The budget probe times the app's own two parallel poll queries, as `fetchRunHistoryTree` sends them |

## Findings

None.

Non-blocking notes (no action required):

- **Fixed waits for absence.** Some checks assert that something does not appear after a fixed `delay(6000)`: WVC-001 (draft folder not listed), WVC-002 (removed folder after a poll) and PLN-08 (a Project with no run, where the Projects view does not poll at all). Under heavy load such a check can pass without a fresh read having happened. It is weaker, but it cannot fail falsely. `recordWindows` already exists in the WVC file, so waiting for the next `ListWorkspaceRunHistory` request would make the two WVC checks exact. The positive halves of these checks (appear with the first message, appear once the Project has a run) use `waitFor` on the real event.
- **WVC-003 counts the whole stack's history.** Its "Show older" and "Archive all older" expectations come from the stack's server history, so they hold whatever other cases ran first on the same stack. Archive all older also archives earlier cases' runs, which is the button's real behavior. Because the cases are opt-in, they don't disturb the other registered cases.
- **The budget's +91 ms over base applies in every view.** The capped Workspaces read also computes `lastActivityAt` for every Team and Org root. That is within the design's budget (RB-B3) and the design's choice; recorded in the coverage report.

## Follow-ups

- Follow-ups this review added: None. FU-004 (the Projects view re-reads only on its events) and FU-005 (a note for FU-001) were recorded by API/E2E.

## Latest Authoritative Result

- Result: `Pass`
- Changed durable test paths reviewed: the 10 paths above, from commits `25769bc969` and `450fe43929`.
- Unresolved finding IDs: None
- Recommended Recipient: `delivery_engineer`
- Notes:
  - I reused the execution evidence and did not rerun anything.
  - Residuals for delivery:
    - API-09 is Not Tested;
    - the budget was measured under a high machine load;
    - Org runs without a root folder show only in the Runs view;
    - FU-001…FU-005.
