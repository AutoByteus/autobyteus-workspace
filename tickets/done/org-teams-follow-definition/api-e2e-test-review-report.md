# API/E2E Test Review Report

## Review Meta

- Review Round: 3 (proportional test-code review after API/E2E pass; recheck of T-1)
- Trigger: API/E2E round 5 (API-REV-005) passed on IR-009 (`70dd2b03f1`), commit `43b063f249`; the package returned for the open T-1 (round 2: API-REV-004, commit `a3ed1a587c`, C-1 decided as T-1)
- Requirements Doc Reviewed As Context: `requirements-doc.md` (Approved, SR-015..SR-018 change no requirement; REQ-007/AC-006)
- Investigation Notes Reviewed As Context: through the design's citations
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (through SR-018)
- Design Spec Reviewed As Context: `design-spec.md` (§ SR-017, § SR-018: "**Cost.** With several pending Orgs there is still one node pass"; R-4 (c) follow-ups; the path-writer follow-ups re-run the pass for converted Orgs "for files the predecessor produced when it finished late")
- Supplemental Task Artifacts Reviewed As Context: `org-container-storage-contract.md`, `release-notes.md`
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md` (ARCH-REV-013)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md` (IR-006..IR-009)
- Original Code Review Report: `code-review-report.md` (CRR-011, Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-014`
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- Execution Coverage Report: `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed As Context: `api-e2e-revision-record.md` (API-REV-004)
- Delivery Revision Record Reviewed As Context (delivery re-entry only): N/A
- API/E2E Result: Pass (API-REV-005; API-REV-004 before)
- Final Validation Confidence: 95% (no category below 90%)
- Prior unresolved test-review findings rechecked: T-1 (CRR-012): resolved, see Findings
- Project testing guideline(s) applied (from the coverage investigation): root `TESTING.md`, `autobyteus-server-ts/AGENTS.md`. No conflicts.
- Supported Product Scenario Basis Confirmed: `Yes` (OC-14: REQ-007/AC-006 with SR-017/SR-018; COST-01: the Migration Plan's cost acceptance)

## Changed Durable Test Scope

| Durable Test Path | Change (`Added`/`Updated`/`Removed`) | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/agent-org-runs/org-container-package.e2e.test.ts` | Updated: a third suite, OC-14 | AC-006, REQ-007, SR-017/SR-018 | The beta.7 cross-node released Org converted by the built server | Reuses `writeBeta7CrossNodeOrg` (the shared fixture) and the file's `startServer` |
| `autobyteus-server-ts/tests/e2e/app-data-migrations/agent-org-units-conversion-cost.e2e.test.ts` | Added | Migration Plan acceptance (cost), SR-018 | Built-server startup cost on a synthetic heavy node | Opt-in (`RUN_ORG_CONVERSION_COST_E2E=1`); the sizes are stated assumptions recorded in the receipt |

- No durable test file changed: `No` (round 2). Round 3: API/E2E's durable tests are unchanged since `a3ed1a587c`. The only test change since then is IR-009's own `agent-org-units-path-rewrite.test.ts` T-1 cases, reviewed in source review CRR-013

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
| T-1 | COST-01 (round 2: every upgrade start ran the node pass 24 times) | **Resolved.** IR-009 (`lateWriterOf`, `predecessorWroteLate`; source review CRR-013 Pass). Round-5 receipt (`round-5/COST-01/COST-01.json`), same 1,347 MiB layout: conversion 2,028 ms; the 23 follow-ups 2,101 ms in total, at most 102 ms each, all `SUCCEEDED` (round 4: 36,801 ms); first start ready after 8,663 ms vs 4,206 ms for the second start (round 4: 44,069 ms). One node pass, as SR-018 states | — | Resolved |

## Follow-ups

- Follow-ups this review added: None.

## Latest Authoritative Result

- Result: `Pass`
- Changed durable test paths reviewed: `org-container-package.e2e.test.ts` (OC-14), `agent-org-units-conversion-cost.e2e.test.ts` (round 2; unchanged in round 3)
- Unresolved finding IDs: None
- Recommended Recipient: `delivery_engineer`
- Notes: Large/High preserved. The test code is sound, and T-1's cost is back to the design's one node pass (8.7 s first start on the 1.35 GB synthetic node, with sizes stated as assumptions). The OC file has 14 cases, OC-01..OC-14.
