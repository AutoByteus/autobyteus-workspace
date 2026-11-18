# API/E2E Test Review Report — delegated-copy-project-workspace (autobyteus-97)

## Review Meta

- Review Round: 1
- Trigger: API-REV-001 `Pass` from the API/E2E engineer
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-002)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (as cited)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-002)
- Design Spec Reviewed As Context: `design-spec.md` (SR-002)
- Supplemental Task Artifacts Reviewed As Context: `follow-ups.md` (FU-001)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md` (ARCH-REV-001)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md` (IR-001)
- Original Code Review Report: `code-review-report.md` (CRR-001 Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-002`
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- Execution Coverage Report: `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed As Context: `api-e2e-revision-record.md` (API-REV-001)
- Delivery Revision Record Reviewed As Context: N/A
- API/E2E Result: `Pass` on code `8959bc507a`; test commit `e6321c9e82`
- Final Validation Confidence: 95.9%
- Prior unresolved test-review findings rechecked: none
- Project testing guideline applied: root `TESTING.md`, mainly gates, clean environment and signed-in CLIs, owned data roots, assertions first, and rule 9. No conflicts.
- Supported Product Scenario Basis Confirmed: `Yes`

## Changed Durable Test Scope

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/projects/delegated-copy-project-folder.e2e.test.ts` | Added | AC-001…AC-007; REQ-001…REQ-005, REQ-007 | Where a new delegated copy runs: the real server and tools with the scripted AGY CLI, and a built server across a real restart | Gated `RUN_AGY_FAILURE_E2E`; DCF-01…08 named by AC; two suites (in-process, built-server restart) |
| `autobyteus-server-ts/tests/e2e/projects/delegated-copy-project-folder-live.e2e.test.ts` | Added | The design's escalation trigger; AC-001 on real runtimes | A real Codex or Claude copy's own `pwd` | Gated per runtime (`RUN_CODEX_E2E`, `RUN_CLAUDE_E2E`) plus AGY for the manager; one small turn each. In its own file because the harness sets the app data folder once per process. |
| `autobyteus-server-ts/tests/e2e/projects/project-change-feed.e2e.test.ts` | Updated | REQ-005 (new approved behavior) | Project change feed | Its agent-made link points at a missing folder, so its delegation is now refused. It asserts the refusal and the unassigned Task, creates the folder, then delegates again. |

- No durable test file changed: `No`

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | The header lists DCF-01…08 and L1/L2 against ACs and REQs; each case name states its outcome |
| Assertions prove approved requirements instead of incidental details | Pass | Each copy is checked three ways: the recorded launch, the AGY capsule `workspacePath`, and `--add-dir` from the CLI's argv log. There is a real `pwd` file in F and none in G. The refusal code and folder appear in the tool result, with no Task entry and no copy. After the restart, folders are checked in the stored tree and in the new launches, and the PIDs differ. |
| Fixtures, setup, helpers and data builders reuse meaningful repetition | Pass | Uses `collaboration-root-harness` (`startRoot`, `calls`, `taskAgents`, `liveTree`), `until` and the websocket helper. Local `launchOf` / `expectIn` remove repetition inside the suite. |
| Isolation and determinism fit the boundary | Pass | Owned data roots, a temporary argv log restored afterwards, `until` waits rather than sleeps, SIGTERM then SIGKILL for the built servers, and cleanup in `afterAll`. The live file states that a Claude run adds to the user's Claude history (signed-in CLI, TESTING.md). |
| Large files stay coherent and navigable | Pass | 374 lines, one subject: a copy's folder, in-process then across a restart |
| No stale, duplicated, disabled-without-reason or compatibility-only tests | Pass | Skips are the documented gates. The `project-change-feed` change follows new approved behavior, not a weakened assertion. |
| Coverage agrees with the investigation and execution evidence | Pass | API-01: 8 passed; API-02: 2 passed (Codex, Claude); API-03 regressions; the JSON evidence holds the observed values |
| Callers and fixtures exercise an established scenario | Pass | SCN-001…005 from the requirements |
| Each test enters through its real trigger | Pass | `delegate_task` is called by the agent through the scoped MCP tool (scripted CLI). The restart is a real process stop and start of the built server. The live worker runs its own shell command on the real runtime. |

Observations, not findings:

- `real`, `recordedFolders` and `nodeOf` are repeated between the two new files, and the live file's `nodeOf` matches Agent runs only.
- DCF-08 has its own built-server start and stop, as several other e2e suites do; there is no shared helper for that today.
- Neither is worth a change at this size.

## Findings

None.

## Follow-ups

- Follow-ups this review added: None. FU-001 is unchanged; `EXC-E2E-004` passed in this run.

## Latest Authoritative Result

- Result: `Pass`
- Changed durable test paths reviewed: the three listed above.
- Unresolved finding IDs: none.
- Recommended Recipient: `delivery_engineer` (`/software_engineering_team/delivery_engineer`).
- Notes: Medium / High, unchanged. Source review: CRR-001 Pass.
