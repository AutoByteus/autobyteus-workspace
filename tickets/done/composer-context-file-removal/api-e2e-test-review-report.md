# API/E2E Test Review Report — composer-context-file-removal

## Review Meta

- Review Round: `1`
- Trigger: API/E2E Pass (API-REV-001) from `/software_engineering_team/api_e2e_engineer`, requesting proportional review of durable test changes
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-003)
- Investigation Notes Reviewed As Context: `investigation-notes.md`
- Solution Revision Record Reviewed As Context: `solution-revision-record.md`
- Design Spec Reviewed As Context: `design-spec.md`
- Supplemental Task Artifacts Reviewed As Context: None behavior-defining
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md` (ARCH-REV-001)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md` (IR-001)
- Original Code Review Report: `code-review-report.md` (CRR-001, Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-002`
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- Execution Coverage Report: `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed As Context: `api-e2e-revision-record.md` (API-REV-001)
- Delivery Revision Record Reviewed As Context: N/A
- API/E2E Result: Pass. Run-2 passed 9/9; `evidence.json` shows `result: Pass`, every case Pass, and cleanup with the browser closed, the frontend and backend terminated, and `dataRootRemoved: true`.
- Final Validation Confidence: 95%
- Prior unresolved test-review findings rechecked: None (first test review)
- Project testing guideline(s) applied: root `TESTING.md`, as recorded by the coverage investigation. The probe follows its rules: it owns its data, ports and processes, cleans up, never touches the user's running app, and uses the scripted AGY CLI for real `delegate_task`. Conflicts or discrepancies: none.
- Supported Product Scenario Basis Confirmed: `Yes` (SCN-001..004 and CT-001 from `code-review-report.md`)

## Changed Durable Test Scope

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-web/tests/e2e/composer-context-file-removal-probe.mjs` | Added (uncommitted) | AC-001..008, QR-001; SCN-001..004, CT-001 | One live-stack probe for composer context-file removal: universal routes over raw HTTP plus composer journeys per owner kind | 824 lines; one coherent surface; cases are named functions mapped in `CASES` |
| `autobyteus-web/package.json` | Updated | — | Adds the `test:e2e:composer-context-file-removal` script | Follows the existing `test:e2e:*` convention |
| `TESTING.md` | Updated | — | New "Composer Context-File Removal Regression" section: prerequisites, command, case list, evidence | Consistent with neighboring probe sections |

- No durable test file changed: `No`
- No existing test was changed or removed.

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | The header maps each CF-ID to its AC. `CASES` pairs each ID with a description and a named function (`universalRoutes`, `trayJourney`, `foreignDraftClone`, `injectedFailures`, `pendingWithoutUploadOwner`, `outageRetry`, `offlineAfterRestart`). |
| Assertions prove approved requirements instead of incidental details | Pass | Each removal is checked three ways: the tray count, DELETE 204 at the composer's own owner-path locator prefix, and the file absent on disk. AC-006 asserts no DELETE to the source locator, that the source stays readable, and that the clone sits under the child's owner folder. AC-008 asserts the error names the file and includes the detail, the item is kept, `role="alert"` is set, and the retry clears the error. AC-007 asserts `+` is disabled with the reason, no upload POST is sent, and a path still attaches. CF-001 asserts the full upload → GET → DELETE → GET → DELETE status chain and that the bytes match, for all 4 kinds. |
| Fixtures, setup, helpers, and data builders reuse meaningful repetition | Pass | One `trayJourney` is reused by CF-002, CF-003, all 7 CF-006 targets and CF-005. Shared `ownerDir`/`collabDir`, `uploadDraft`, `rawRequest`, paste/pick helpers and a typed `newPage` network recorder. The scripted AGY CLI fixture is reused from the server tests. |
| Test isolation and determinism are appropriate for the boundary | Pass | Private temp data root, free ports, owned process groups, fresh headless Chrome, and refusal to overwrite existing evidence. Polling uses `until` with bounded timeouts. A journey diffs against a `before` snapshot so leftovers from earlier cases are not counted (the fix the engineer noted). Teardown runs in `finally`. A stability rerun passed 9/9. |
| Large files remain coherent and navigable | Pass | A single feature surface, sectioned into owned stack, public API setup, raw HTTP, browser helpers, journeys and the case table |
| No stale, duplicated, disabled-without-reason, or compatibility-only tests | Pass | Nothing disabled. Three pre-existing `draftRunId` traversal paths are marked `observeOnly`, with the reason inline (the handoff's Known Risks / OBS-001); they are recorded, not graded. |
| Coverage agrees with the coverage investigation and execution evidence | Pass | The CF-IDs in the investigation, the ledger and `evidence.json` (run-2) match the code's `ALL_CASES`; every case is Pass |
| Test callers and fixtures exercise an independently established supported scenario | Pass | Owners are created by the product's own GraphQL and WS surfaces, and a real `delegate_task` call through the AGY runtime. The probe does not fabricate owner state. |
| Each test enters through the real trigger and follows the real actor's steps | Pass | The probe uses a real clipboard paste (Cmd/Ctrl+V), the real `+` file chooser, workspace-tree navigation, and the × and Clear All buttons. Failure injection is narrow: one response each for CF-008 (AC-008 explicitly calls for a simulated 5xx). CF-004 uses a real backend stop. CF-009 holds `finalize` only to widen the real pending window; the pending send and the Org tree change it relies on are product-produced (see note). |

Note on CF-009: the no-upload-owner state needs the view to recompute the target while the send is pending. The probe triggers that with a real Manager `delegate_task`. That dependency comes from the pre-existing non-reactive `submissions` Map (OBS-002), which is outside this ticket and documented in the execution report. The probe records the post-send state only as observation.

## Findings

None.

Non-blocking observations (no action required for this ticket):
- Cases share one world and are order-dependent: CF-004 stops the backend and CF-005 terminates the root. The default order puts them last, so this is safe. A custom `--cases` order could reorder them. The TESTING.md note could mention running them last; this is optional.
- OBS-001 (pre-existing trim-only `draftRunId` validation) and OBS-002 (pre-existing composer reactivity) are separate-ticket candidates, already recorded by the implementer and API/E2E. They are not test-code issues.

## Latest Authoritative Result

- Result: `Pass`
- Changed durable test paths reviewed: `autobyteus-web/tests/e2e/composer-context-file-removal-probe.mjs` (added), `autobyteus-web/package.json` (script), `TESTING.md` (section)
- Unresolved finding IDs: None
- Recommended Recipient: `/software_engineering_team/delivery_engineer`
- Notes: The test changes are uncommitted in the worktree; delivery owns commit and integration. The user's desktop 19.png verification remains a delivery gate.
