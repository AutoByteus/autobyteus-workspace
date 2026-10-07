# API/E2E Test Review Report — `project-manager-ux`

## Review Meta

- Review Round: `1`
- Trigger: API/E2E `Pass` (API-REV-002, round 2, final confidence 96%) from `/api_e2e_engineer`, 2026-10-07
- Requirements Doc Reviewed As Context: `.../requirements-doc.md` (SR-003)
- Investigation Notes Reviewed As Context: `.../investigation-notes.md`
- Solution Revision Record Reviewed As Context: `.../solution-revision-record.md`
- Design Spec Reviewed As Context: `.../design-spec.md` (SR-005)
- Supplemental Task Artifacts Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/project-manager-ux/ui-ux-spec.md`
- Architecture Review Revision Record Reviewed As Context: `.../architecture-review-revision-record.md` (ARCH-REV-002)
- Implementation Revision Record Reviewed As Context: `.../implementation-revision-record.md` (IR-002, commit `8ef467696`)
- Original Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-manager-ux/tickets/in-progress/project-manager-ux/code-review-report.md` (CRR-003 Pass)
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-manager-ux/tickets/in-progress/project-manager-ux/code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-004`
- Coverage Investigation: `.../api-e2e-coverage-investigation.md`
- Execution Coverage Report: `.../api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed As Context: `.../api-e2e-revision-record.md` (API-REV-001 Fail → API-REV-002 Pass)
- Delivery Revision Record: N/A
- API/E2E Result: `Pass`
- Final Validation Confidence: 96%
- Prior unresolved test-review findings rechecked: None (first test review)
- Project testing guideline applied: root `TESTING.md` (gated scripted-AGY `tests/e2e/projects`, browser probes with a current server build, owned cleanup). No conflicts with this skill.
- Supported Product Scenario Basis Confirmed: `Yes`. The tests reproduce SCN-002..006, AC-001..023 and QR-001/002. The start-failure trigger (a member configured with a model its runtime doesn't offer) is an ordinary user configuration that leads to `AGY_MODEL_UNAVAILABLE`, not a setup real use cannot produce.

## Changed Durable Test Scope

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/projects/project-change-feed.e2e.test.ts` | Added | AC-001..008, 019..021, 023; QR-001/002; DS-003 parity; feed contract | The `/ws/projects` feed and Task roots at the real server/wire boundary, one `it` per journey | 523 lines; coherent; gated like its siblings |
| `autobyteus-web/tests/e2e/project-manager-ux-probe.mjs` | Updated (+313) | AC-007, 012, 013, 020, 021, 023; QR-001; Org cold open | Adds PMU-008..012, browser-error assertions in every case, failure console capture, and the dev-server warm-up | Extends the implementer's probe and its helpers |
| `autobyteus-web/package.json` | Updated | — | `test:e2e:project-manager-ux` script | One line |
| `TESTING.md` | Updated | — | Commands, layer description and the warm-up rationale | Guideline doc; checked for accuracy |

- No durable test file changed: `No`

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | `it` names and PMU case titles state the journey and the AC IDs; comments mark each AC step |
| Assertions prove approved requirements, not incidental details | Pass | <ul><li>Feed-vs-GraphQL parity on every settled Task (`settledTask`).</li><li>Exact root shape (name from address, host, start, closed, status).</li><li>DONE's last view is DONE + Offline; a reopen stays Offline until the message.</li><li>A real `TASK_DISPATCH_FAILED`/`AGY_MODEL_UNAVAILABLE` root, and re-delegation replacing it.</li><li>Strict-schema validity of every frame.</li><li>4401 parity with `/ws/file-explorer`.</li><li>Rendered "Couldn't start" with tooltip and Task-page reason; left-panel state across pages; removal live after chat deletion.</li></ul> |
| Fixtures, setup, helpers reuse meaningful repetition | Pass | Reuses the shared E2E server, `until`, websocket helpers and the probe's existing `createDefinitions`/`createRoot`/`managerInput`/`rootState` helpers |
| Isolation and determinism for the boundary | Pass | <ul><li>Private temp data root; env restored; owned cleanup asserted; condition-based waits.</li><li>The warm-up removes a measured dev-server artifact: cold-cache "optimized dependencies changed. reloading" wiped first reads. The forced-cold rerun passes 12/12, and the packaged app has no such reload (desktop journey).</li><li>It does not hide product behavior: it only waits before the first case.</li></ul> |
| Large files coherent and navigable | Pass | One feed surface (server); one probe surface (browser) |
| No stale, duplicated, disabled-without-reason, or compatibility-only tests | Pass | No disabled cases; the gates match the sibling suites |
| Coverage agrees with the investigation and execution evidence | Pass | The investigation's planned additions match the files. Results: 7/7 feed cases, PMU 12/12 (warm and forced-cold), PT-E2E 16/16 |
| Callers/fixtures exercise independently established scenarios | Pass | All writes are real agent tool calls or UI/GraphQL mutations; only the external AGY CLI is scripted |
| Tests enter through the real trigger and follow real steps | Pass | Agent tool calls through scoped MCP; UI clicks for left-panel navigation, chat deletion and root opening; reactivation by the assigner's message |

Non-blocking notes (no action required for delivery):
- Feed suite:
  - The comment above the reactivation check says "the first turn after the wake reports Running", but the assertion only checks that the final status is `idle`, i.e. never a final Initializing. That still proves P-001's guarantee; the comment overstates it.
  - The last `it` (strict-schema check of all frames) depends on frames collected by the earlier cases in the same file. This is intended and ordered, but not isolated.
- Probe:
  - `selectAgentRun` builds an unused `runRow` locator, and `leftPanelAcrossPages` has an unused `workerRow`. This is harmless leftover code.
  - PMU-012 records whether the Org worker row is selected but does not assert it (`.catch(() => false)`). The opened conversation is asserted.
  - Org-root selection is otherwise covered by PMU-003.

## Findings

None.

## Latest Authoritative Result

- Result: `Pass`
- Changed durable test paths reviewed:
  - `autobyteus-server-ts/tests/e2e/projects/project-change-feed.e2e.test.ts` (added)
  - `autobyteus-web/tests/e2e/project-manager-ux-probe.mjs` (updated)
  - `autobyteus-web/package.json` (script)
  - `TESTING.md` (guideline doc)
- Unresolved finding IDs: None
- Recommended Recipient: `/delivery_engineer`
- Notes:
  - No suite was rerun; every assertion could be judged from the code and the recorded evidence.
  - O-1 is explained as a dev-server harness effect: it reproduced only on a cold cache with recorded reloads, it passes forced-cold with the warm-up, and the packaged app was clean.
  - The API/E2E residual risks are carried forward:
    - a real-provider `error` status is not exercised;
    - AC-004's in-place Task-page update is proven on the wire and in the browser, not in the desktop journey;
    - the Server Settings Projects toggle needed a second click (outside scope; a separate-ticket candidate).
