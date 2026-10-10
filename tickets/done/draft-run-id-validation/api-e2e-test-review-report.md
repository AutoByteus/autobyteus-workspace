# API/E2E Test Review Report — draft-run-id-validation

## Review Meta

- Review Round: `1`
- Trigger: API/E2E Pass (API-REV-001) from `/software_engineering_team/api_e2e_engineer`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (approved SR-001 baseline, REQ-001..009)
- Investigation Notes Reviewed As Context: `investigation-notes.md`
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-003)
- Design Spec Reviewed As Context: `design-spec.md`
- Supplemental Task Artifacts Reviewed As Context: None behavior-defining
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md` (ARCH-REV-002)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md` (IR-001)
- Original Code Review Report: `code-review-report.md` (CRR-001, Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-002`
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- Execution Coverage Report: `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed As Context: `api-e2e-revision-record.md` (API-REV-001)
- Delivery Revision Record Reviewed As Context: N/A
- API/E2E Result: Pass. Run-1 `evidence.json` shows `result: Pass` with all 11 cases Pass. Cleanup closed the browser, terminated the frontend and backend, and removed the data root (`dataRootRemoved: true`). A stability rerun also passed 11/11.
- Final Validation Confidence: 96%
- Prior unresolved test-review findings rechecked: None
- Project testing guideline(s) applied: root `TESTING.md`. The probe keeps its owned stack, cleanup and never-touch-user-data rules. Conflicts or discrepancies: none.
- Supported Product Scenario Basis Confirmed: `Yes` (SCN-001..004 from `code-review-report.md`)

## Changed Durable Test Scope

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-web/tests/e2e/composer-context-file-removal-probe.mjs` | Updated (uncommitted) | CF-001: AC-001..003, AC-007..009, REQ-002. CF-011/012: REQ-005, AC-006, SCN-004 | Same live-stack probe. Adds malformed upload/finalize owner rows plus a data-root snapshot to CF-001, and adds the first-send-from-New-chat journeys | Builds on the implementer's graded rows |
| `TESTING.md` | Updated | — | CF-001 rejection rows; CF-011/CF-012 entry | Consistent with the existing section |

- No durable test file changed: `No`

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | The header documents CF-011/012. The `CASES` descriptions state the journey and the outcome, and `firstSendFromNewChat` has a doc comment tying it to REQ-005/AC-006. |
| Assertions prove approved requirements | Pass | Rejections must be 400 with a string `detail` (REQ-002). A snapshot of every `context_files` file in the data root, compared before and after, proves nothing was written or moved (AC-003/009). This is stronger than checking sentinels alone. CF-011/012 assert a `temp-chat-<ms>-<n>` draft owner, a final locator of the expected shape, and a raw GET that returns the exact bytes. They also assert the draft is gone after finalize and the launched run shows the message with its file chip. |
| Fixtures, setup, helpers reuse meaningful repetition | Pass | Reuses `rawRequest`, `pickFiles`, `draftFiles`, `newPage` (extended with a `finalized` collector) and `openAgentRoot`. `firstSendFromNewChat` is parameterized for both run kinds. |
| Isolation and determinism | Pass | Same owned stack. The snapshot brackets only the malformed requests: the keeper upload comes before it and the bearer upload after. Bounded `until` waits are used, and a stability rerun passed 11/11. |
| Large file coherent and navigable | Pass | Still one feature surface. The new cases sit before the destructive CF-004/CF-005 in `ALL_CASES`, so the ordering stays safe. |
| No stale / disabled / compatibility-only tests | Pass | Nothing disabled; no `observeOnly` remains |
| Coverage agrees with investigation and evidence | Pass | The CF-IDs in the code, the ledger and `evidence.json` match, with 11/11 Pass |
| Callers and fixtures exercise an established supported scenario | Pass | Malformed owners exercise SCN-001, the user-approved trust boundary. CF-011/012 exercise SCN-004 through real product surfaces. |
| Real trigger and real actor steps | Pass | CF-011/012 follow the real path: the `+` header action → New chat → the file chooser → the primary send. The finalize response is captured from the real request, not mocked. CF-001 uses raw HTTP, the stated surface for a contract scenario. |

## Findings

None.

Non-blocking observations (no action required):
- `openTeamRunMember` repeats the navigation in `regressions()`'s inner `teamMember(page, '/manager')`. Hoisting that helper would remove the duplication; this is optional.
- `draft.split('/')` assumes POSIX separators. That matches the probe's existing POSIX-only process handling (`process.kill(-pid)`).

## Latest Authoritative Result

- Result: `Pass`
- Changed durable test paths reviewed: `autobyteus-web/tests/e2e/composer-context-file-removal-probe.mjs`, `TESTING.md`
- Unresolved finding IDs: None
- Recommended Recipient: `/software_engineering_team/delivery_engineer`
- Notes: The test changes are uncommitted; delivery owns commit and integration. CND-002 (pre-existing `..`-in-name upload rejection) remains a separate-ticket candidate.
