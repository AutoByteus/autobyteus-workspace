# API/E2E Test Review Report

## Review Meta

- Review Round: 1 (after API/E2E round 2, API-REV-002 Pass)
- Trigger: `/software_engineering_team/api_e2e_engineer`, API-REV-002 Pass on `5b16e1fe4a` (code `3204aa2455`); proportional review of API-D01
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-006; AC-006 imported runs excluded)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (as cited by the design)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-001…SR-006)
- Design Spec Reviewed As Context: `design-spec.md` (§ Run Kinds, discovery; § Match Facts)
- Supplemental Task Artifacts Reviewed As Context: `follow-ups.md`
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md` (ARCH-REV-004)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md` (IR-005)
- Original Code Review Report: `code-review-report.md` (CRR-005, Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-006`
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- Execution Coverage Report: `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed As Context: `api-e2e-revision-record.md` (API-REV-001, API-REV-002)
- Delivery Revision Record Reviewed As Context (delivery re-entry only): N/A
- API/E2E Result: `Pass` (API-REV-002)
- Final Validation Confidence: 94% (no category below 90%)
- Prior unresolved test-review findings rechecked: none (first test review)
- Project testing guideline(s) applied (from the coverage investigation): the worktree `TESTING.md` (isolated memory copies only, never `~/.autobyteus`). The changed test uses a temporary memory folder, which complies. No conflicts.
- Supported Product Scenario Basis Confirmed: `Yes`. AC-006 says runs imported by Memory Sync from another node (`imports/<sourceId>/…`) are never indexed or searched as local runs.

## Changed Durable Test Scope

| Durable Test Path | Change (`Added`/`Updated`/`Removed`) | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/unit/memory-search/memory-run-discovery.test.ts` | Updated: one test added, "never finds runs imported from another node by Memory Sync (AC-006)" (`06fdc1306a`, +12 lines) | AC-006 | Yes: run discovery, beside the other discovery tests | The only durable test change in API/E2E rounds 1–2; `git diff --stat 5b16e1fe4a..HEAD` outside `tickets/` is empty |

- No durable test file changed: `No`

## Proportional Test-Code Checks

| Check | Result (`Pass`/`Fail`/`N/A`) | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | Inside `describe("MemoryRunDiscovery")`; the name states the rule and the AC |
| Assertions prove approved requirements instead of incidental implementation details | Pass | Asserts the found run keys equal only the local run. That is the observable rule of AC-006, not the mechanism (which folder set is skipped) |
| Fixtures, setup, helpers, and data builders reuse meaningful repetition | Pass | Reuses the file's `writeRun` and `turn`; the empty location sources follow the file's existing pattern |
| Test isolation and determinism are appropriate for the exercised boundary | Pass | Temporary `memoryDir` per test; no clock, network or user data |
| Large files remain coherent and navigable rather than mixing unrelated scenarios | Pass | Small, single-responsibility file |
| No stale, duplicated, disabled-without-reason, or compatibility-only tests remain | Pass | None |
| Added, updated, and removed coverage agrees with the coverage investigation and execution evidence | Pass | `API-D01-discovery-imports-test.log`: passes on the reviewed code; IMP-29 (650 tests) and API-REV-002 include it at `3204aa2455` |
| Test callers and fixtures exercise an independently established supported scenario rather than proving one by themselves | Pass | The layout `imports/<memorySyncSourceId>/<family>/…` is Memory Sync's real layout (comment in the test; AC-006); the test doesn't invent the scenario |
| Each test enters through its scenario's real trigger and follows the real actor's or event's steps, without a setup real use does not produce | Pass | Enters through `findRuns()`, the pipeline's real call; imported runs in both an agent family and a team family, beside a local run |

**Controls (from the log; Read):**
- Control 2 (walk the whole memory folder without skipping `imports`) makes the test fail with both imported runs listed, so the test guards AC-006 against a plausible regression in the walk.
- Control 1 (only `imports` removed from `SKIPPED_FOLDERS`) still passes, because the walk starts at the family roots and never reaches `imports/`. The API/E2E engineer reported this honestly. It means the `imports` entry in `SKIPPED_FOLDERS` is redundant today. It is harmless belt-and-braces in source I reviewed in round 1, not a test defect, and not worth reopening implementation.

## Findings

None.

## Follow-ups

- Follow-ups this review added: None.

## Latest Authoritative Result

- Result: `Pass`
- Changed durable test paths reviewed: `autobyteus-server-ts/tests/unit/memory-search/memory-run-discovery.test.ts` (API-D01)
- Unresolved finding IDs: none
- Recommended Recipient: `/software_engineering_team/delivery_engineer`
- Notes:
  - Residual risks for delivery, from API-REV-002 and CRR-005:
    - AC-008 on the user's own memory needs the user's approval and a backup;
    - latency on an idle reference machine is not measured (measured at load 10–17: p90 742 ms in-process, 678 ms over HTTP; max ≤ 1.2 s);
    - Windows, Linux and macOS x64 builds are not built;
    - O-1: agents need "search your memory" phrasing;
    - O-3: same-topic runs compete in the ranking;
    - O-6: "No matches" outranks the absent-words note right after a restart;
    - C-12: link-only tokens can be named as found words;
    - R-13 and R-3 (accepted).
  - Design-spec § Match Facts wording (items 1 and 4) is with the Solution Designer.
  - My review reports are uncommitted.
