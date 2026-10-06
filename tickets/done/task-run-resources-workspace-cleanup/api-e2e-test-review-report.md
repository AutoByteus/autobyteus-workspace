# API/E2E Test Review Report — task-run-resources-workspace-cleanup

## Review Meta

- Review Round: 1
- Trigger: `/api_e2e_engineer` API/E2E **Pass** (API-REV-003, round 3, HEAD `50b08001d` = IR-003 + IR-004). A proportional test-code review was requested.
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SD-AP-001; REQ-010 moved out)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (AE-01–AE-17)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (through SR-009)
- Design Spec Reviewed As Context: `design-spec.md` (SR-009)
- Supplemental Task Artifacts Reviewed As Context: UI/UX spec @ `a38bd6e` (Motion, Accessibility, TR-001–TR-005)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md` (ARCH-REV-004)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md` (IR-004)
- Original Code Review Report: `code-review-report.md` (CRR-005, Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-006`
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- Execution Coverage Report: `api-e2e-execution-coverage-report.md` (the round-3 section is authoritative)
- API/E2E Revision Record Reviewed As Context: `api-e2e-revision-record.md` (API-REV-001 to API-REV-003)
- Delivery Revision Record Reviewed As Context: N/A
- API/E2E Result: `Pass`
- Final Validation Confidence: 95%
- Prior unresolved test-review findings rechecked: None (first test review)
- Supported Product Scenario Basis Confirmed: `Yes`
  - SCN-001 to SCN-004 and AC-001 to AC-010, across the Agent, Team and Org roots.
  - Every journey starts from a product trigger: the Manager's real `create_or_update_task` / `delegate_task` / `send_message_to` tool calls over scoped MCP, the user's real composer, reload, a real backend restart, and the history-list disclosure.

## Changed Durable Test Scope

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/projects/task-closure-root-visibility.e2e.test.ts` | Added | SCN-001 to SCN-003; AC-001, 002, 004 to 008; REQ-003 ordering | Task closure as a root view fact at the server and wire boundary, with one shared scenario run for each of the Agent, Team and Org roots. | Gated like the sibling scripted-AGY suites (`RUN_AGY_FAILURE_E2E=1` plus a working `ANTIGRAVITY_CLI_COMMAND`), and skips cleanly otherwise. 394 lines, one coherent surface. |
| `autobyteus-web/tests/e2e/task-closure-tree-probe.mjs` | Added | AC-001 to AC-006, AC-008 to AC-010; SP-3; CR-001 and CR-002 regressions | Workspaces-tree closure in real Chrome against a real built backend and Nuxt: live leave, motion, reduced motion, a11y, focus, fallback, reload, restart, and the Org history list. | 548 lines, seven named cases (BR-001 to BR-007). It owns its stack and cleans up in `finally`. |
| `autobyteus-web/package.json` | Updated | — | Adds the `test:e2e:task-closure-tree` script, next to the sibling probe scripts. | — |
| `autobyteus-web/tests/e2e/agent-org-task-team-disclosure-probe.mjs` | Updated | Existing disclosure behavior, plus the accepted collapse-motion residual | Waits for the collapse leave to settle (up to 1.5 s) before asserting absence. | 6 assertions wrapped; the expectations are unchanged. |
| `autobyteus-web/tests/e2e/nested-team-hierarchy-probe.mjs` | Updated | Same | Same | 2 assertions wrapped. |
| `autobyteus-web/tests/e2e/task-agent-peer-sidebar-probe.mjs` | Updated | Same | Same | 2 assertions wrapped. |

- No durable test file changed: `No`

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | Server: one `rootScenario(kind)` with numbered steps 1–7 (plus 4b), and three `it` names stating the root kind and coverage. Web: a `CASES` table of BR-001 to BR-007, each with a one-line description, and journey functions named by intent (`liveDone`, `reducedMotion`, `lastRows`, `reloadAndRestart`, `orgHistoryFirstRender`). |
| Assertions prove approved requirements instead of incidental implementation details | Pass | The assertions check exact closed-reference sets (Task A only, the union after repeated DONE, plus Task B after SCN-003, kept after Task delete). They also check the unfiltered tree, kept message IDs and files on disk, fade frames ≥ 3 with a ~200 ms window, `aria-hidden`/inert at once, focus on the run row, selection back to the Manager, the Team/Org tab message, and no closed row ever rendered (a MutationObserver from document start). Timing bounds are generous (150–450 ms normal, ≤ 80 ms reduced motion). |
| Fixtures, setup, helpers, and data builders reuse meaningful repetition | Pass | The server suite reuses the existing E2E helpers (`startStudioE2eRuntimeServer`, `sendE2eSendMessageCommand`, `until`, `flattenE2eConfiguredAgentExecutions`). The web probe has one `setupRoot` builder shared by every journey. The small `afterLeave` helper is copied into three probes; that matches the existing self-contained probe convention, where each probe defines its own `getArg`/`waitFor`. Not worth a finding. |
| Test isolation and determinism are appropriate for the exercised boundary | Pass | Both use a private temporary data root and free ports, and remove everything they own. The probe refuses an existing `evidence.json`. Only the external AGY CLI is scripted, so there is no provider inference. BR-005 and BR-007 depend on BR-001 to BR-003 in the same run, and say so with explicit asserts. |
| Large files remain coherent and navigable rather than mixing unrelated scenarios | Pass | Each new file covers one surface: server/wire closure, and browser tree closure. |
| No stale, duplicated, disabled-without-reason, or compatibility-only tests remain | Pass | The probe updates adapt to approved behavior (collapse motion) without weakening expectations. Nothing is disabled. The gate is the documented scripted-AGY gate. |
| Added, updated, and removed coverage agrees with the coverage investigation and execution evidence | Pass | Round-3 evidence: server E2E 3/3 (`closedIndex < stopIndex` for every root: Agent 3/4, Team 11/22, Org 12/23; cleanup clean), probe 7/7, updated probes 5/5, 3/3 and 7/7. |
| Test callers and fixtures exercise an independently established supported scenario rather than proving one by themselves | Pass | Every scenario traces to SCN-001 to SCN-004, the AC table, or CR-001/CR-002. The tests do not introduce any new scenario. |
| Each test enters through its scenario's real trigger and follows the real actor's or event's steps, without a setup real use does not produce | Pass | Definitions, projects, Tasks and runs are created through the product GraphQL. Manager actions are its actual tool calls over its input channel; Task B is closed through the real composer. Reload and restart are real, and SCN-003 uses another Manager. Two pieces of setup are synthetic but reproduce product states: the Task A description embeds a `CALL_TOOL` for the scripted worker, and the probe focuses a row before DONE (the AC-009 "focused leaving row"). |

## Findings

No actionable findings.

Non-blocking observations, which need no rework:

- **Server E2E stop-ordering assertion.** `task-closure-root-visibility.e2e.test.ts:297` guards `closedIndex < stopIndex` with `if (stopIndex >= 0)`, so it would pass silently if no stop frame were streamed. The round-3 evidence shows the check ran on all three roots. Making it unconditional would harden the REQ-003 "published before stop" proof; it is optional.
- **BR-002 move-class assertion.** The probe records `moveClassAtLeaveStart` but does not assert it. The CR-002 regression relies on the natural trigger (clicking the worker row) reproducing the move overlap; round 3 observed it. The cascade unit test in `useLeavingTreeRows.spec.ts` covers the CSS rule deterministically.
- **Docs follow-up for Delivery.** `TESTING.md` has no entry yet for `test:e2e:task-closure-tree` or the gated `task-closure-root-visibility` E2E (§ "Project Task Agent Run Resources…", whose `tests/e2e/projects` command already includes the gated suite path).
- **Uncommitted changes.** The durable test changes are not committed yet. Delivery should stage them explicitly (package `AGENTS.md`: never `git add .`/`-A`).

## Latest Authoritative Result

- Result: `Pass`
- Changed durable test paths reviewed:
  - `autobyteus-server-ts/tests/e2e/projects/task-closure-root-visibility.e2e.test.ts`
  - `autobyteus-web/tests/e2e/task-closure-tree-probe.mjs`
  - `autobyteus-web/package.json`
  - `autobyteus-web/tests/e2e/agent-org-task-team-disclosure-probe.mjs`
  - `autobyteus-web/tests/e2e/nested-team-hierarchy-probe.mjs`
  - `autobyteus-web/tests/e2e/task-agent-peer-sidebar-probe.mjs`
- Unresolved finding IDs: None
- Recommended Recipient: `/delivery_engineer`
- Notes:
  - Source review stands at CRR-005 (Pass, 9.4/10).
  - Docs follow-ups for Delivery: a `TESTING.md` entry for the new probe and the gated server E2E. DOC-001 (the protocol doc) is already resolved in IR-004.
  - Accepted residuals still stand:
    - AC-003's failing stop is proven by unit tests plus the real closed-before-stop ordering;
    - packaged Electron was not run;
    - reduced-motion removal takes about 2 frames, and collapse animates;
    - Team REQ-009 covers only the Workspaces tree and main view;
    - a damaged Task file keeps its runs listed;
    - the C-07 codegen doc comment is cosmetic.
