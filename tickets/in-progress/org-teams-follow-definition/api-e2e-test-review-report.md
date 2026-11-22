# API/E2E Test Review Report

## Review Meta

- Review Round: 2 (proportional test-code review after API/E2E pass)
- Trigger: API/E2E round 4 (API-REV-004) passed on IR-008 (`26c6240f33`); review requested by the API/E2E engineer (commit `a3ed1a587c`), with observation C-1 for a decision
- Requirements Doc Reviewed As Context: `requirements-doc.md` (Approved, SR-015..SR-018 change no requirement; REQ-007/AC-006)
- Investigation Notes Reviewed As Context: through the design's citations
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (through SR-018)
- Design Spec Reviewed As Context: `design-spec.md` (§ SR-017, § SR-018: "**Cost.** With several pending Orgs there is still one node pass"; R-4 (c) follow-ups; the path-writer follow-ups re-run the pass for converted Orgs "for files the predecessor produced when it finished late")
- Supplemental Task Artifacts Reviewed As Context: `org-container-storage-contract.md`, `release-notes.md`
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md` (ARCH-REV-013)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md` (IR-006..IR-008)
- Original Code Review Report: `code-review-report.md` (CRR-011, Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-012`
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- Execution Coverage Report: `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed As Context: `api-e2e-revision-record.md` (API-REV-004)
- Delivery Revision Record Reviewed As Context (delivery re-entry only): N/A
- API/E2E Result: Pass (API-REV-004)
- Final Validation Confidence: 95% (no category below 90%)
- Prior unresolved test-review findings rechecked: None (CRR-008 Pass; its OC-13 observation unchanged, non-blocking)
- Project testing guideline(s) applied (from the coverage investigation): root `TESTING.md`, `autobyteus-server-ts/AGENTS.md`. No conflicts.
- Supported Product Scenario Basis Confirmed: `Yes` (OC-14: REQ-007/AC-006 with SR-017/SR-018; COST-01: the Migration Plan's cost acceptance)

## Changed Durable Test Scope

| Durable Test Path | Change (`Added`/`Updated`/`Removed`) | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/agent-org-runs/org-container-package.e2e.test.ts` | Updated: a third suite, OC-14 | AC-006, REQ-007, SR-017/SR-018 | The beta.7 cross-node released Org converted by the built server | Reuses `writeBeta7CrossNodeOrg` (the shared fixture) and the file's `startServer` |
| `autobyteus-server-ts/tests/e2e/app-data-migrations/agent-org-units-conversion-cost.e2e.test.ts` | Added | Migration Plan acceptance (cost), SR-018 | Built-server startup cost on a synthetic heavy node | Opt-in (`RUN_ORG_CONVERSION_COST_E2E=1`); the sizes are stated assumptions recorded in the receipt |

- No durable test file changed: `No`

## Proportional Test-Code Checks

| Check | Result (`Pass`/`Fail`/`N/A`) | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | OC-14's title lists its claims; COST-01's header states layout, run command and opt-in |
| Assertions prove approved requirements instead of incidental implementation details | Pass | OC-14: every typed field names the moved folder and the file exists there; the Org, Team and agent routes serve the bytes; trace prose and a foreign data-directory path stay; a second start changes no hashed byte; the base's rule that a peer-node line is not in a Team/Org view (565 / 492 DEC-014) is asserted as kept, not worked around. COST-01 asserts success and a moved attachment and records the timings without a fragile threshold |
| Fixtures, setup, helpers, and data builders reuse meaningful repetition | Pass | The shared beta.7 fixture and ledger-reset pattern (as OC-11) |
| Test isolation and determinism are appropriate for the exercised boundary | Pass | Own data roots; the ledger reset recreates an upgraded install's state; COST-01 is opt-in (about 1.6 GB written) |
| Large files remain coherent and navigable rather than mixing unrelated scenarios | Pass | OC-14 is a separate suite with its own server and root |
| No stale, duplicated, disabled-without-reason, or compatibility-only tests remain | Pass | COST-01's skip is its documented opt-in |
| Added, updated, and removed coverage agrees with the coverage investigation and execution evidence | Pass | `round-4/OC-01-14/OC-14.json`, `round-4/COST-01/COST-01.json` match |
| Test callers and fixtures exercise an independently established supported scenario rather than proving one by themselves | Pass | The beta.7 shape is the design's evidence (587 since `v1.5.14-beta.7`) |
| Each test enters through its scenario's real trigger and follows the real actor's or event's steps, without a setup real use does not produce | Pass | Upgrade = the built server's startup on released data; reads through the app's routes and views |

## Findings

| Finding ID | Test Path / Scenario | Evidence | Required Action | Classification / Owner |
| --- | --- | --- | --- | --- |
| T-1 (API/E2E's C-1) | COST-01 reveals a source defect this ticket caused: every upgrade start runs the node pass 24 times | **Measured (receipt):** conversion 2,220 ms; the 23 `agent_org_units_after_*` follow-ups 36,801 ms in total (1.4–2.2 s each); first start ready after 44,069 ms vs 4,643 ms for the second start, on a 1,347 MiB synthetic node. **Read:** `OrgUnitsFollowUp` sets `passOverConverted: true` for **every** follow-up (`agent-org-units-follow-ups.ts`): the 5 reader, the 13 delegation-writer (`preserved_items_after_*`) and the 5 path-writer follow-ups. Each pass lists and reads every candidate file of the node again. **Against the design:** SR-018 gives the pass only to the path-writer predecessors' follow-ups, for files such a predecessor wrote **late**, and states "there is still one node pass". On an ordinary upgrade every predecessor completed before the conversion started, so the conversion's own pass already saw everything they wrote; the 23 repeats find nothing to change. The cost grows with the node's data (about 2.5 min at 5 GB, API/E2E's estimate) and blocks every Org owner's upgrade start (`requiredOnStartup`). Accepting it as a release note would trade away the design's "one node pass" for no gain | (1) Only the path-writer predecessors' follow-ups (`PATH_WRITER_PREDECESSORS`) run the pass over converted Orgs; reader and delegation-writer follow-ups do what they did before IR-006. (2) A path-writer follow-up runs the pass only when its predecessor completed after the conversion started (the ledger has `startedAt`/`completedAt`): otherwise nothing it wrote can be late. A predecessor that was `FAILED` or `NOT_RUN` and finishes later still gets its pass (the existing late-writer test). (3) Tests: with every predecessor terminal before the conversion, no follow-up parses or reads candidate files (count `filesVisited`, or spy on the pass); the late-writer case still moves its file. API/E2E reruns COST-01 (expected: first start close to the conversion's own time plus the ordinary start) and the migration suites | `Local Fix` / `implementation_engineer` |

## Follow-ups

- Follow-ups this review added: None.

## Latest Authoritative Result

- Result: `Fail`
- Changed durable test paths reviewed: `org-container-package.e2e.test.ts` (OC-14), `agent-org-units-conversion-cost.e2e.test.ts`
- Unresolved finding IDs: T-1
- Recommended Recipient: `implementation_engineer` (T-1 is a source defect the change caused; it returns through source review, API/E2E and this review)
- Notes: The test code itself is sound and needs no change. C-1 is decided here as a defect, not a release-note item: the design asked for one node pass, and the repeats do no work on an ordinary upgrade.
