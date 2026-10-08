# API/E2E Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code Reviewer / `code-review-report.md` CRR-001 / round 1 | SR-002, SR-003, ARCH-REV-001, IR-001, CRR-001 | N/A | Pass / 95.6% |

## Revision Entries

### API-REV-001 — Baseline: context_files E2E over MCP/native, live linked delegation, rendered Task page

- Triggering role, report path, and round: `/software_engineering_team/code_reviewer`, `code-review-report.md`, round 1 (Full Review, Pass)
- Triggering finding or case IDs: the code review's coverage requests 1–5 (MCP/native E2E, linked delegation, MCP error contract, MCP schema, ASM-001)
- Related revision IDs: SR-002 (requirements), SR-003 (design), ARCH-REV-001, IR-001 (commit `741b05131`), CRR-001
- Why this baseline was recorded: first completed API/E2E result for the package
- Coverage decisions or durable test paths changed:
  - Updated `autobyteus-server-ts/tests/e2e/projects/project-task-boundaries.e2e.test.ts` (CTX-E2E-001, CTX-E2E-002).
  - Added the gated `autobyteus-server-ts/tests/e2e/projects/project-task-context-files-delegation.e2e.test.ts` (CTX-E2E-003).
  - Updated `autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs` with the `READ_REFERENCE_FILES` route.
  - Updated `autobyteus-server-ts/tests/unit/agent-execution/backends/antigravity/agy-failure-cli-routing.test.ts` (CTX-FIX-001).
- Cases added, changed, removed, or rechecked:
  - Added: CTX-E2E-001..003, CTX-FIX-001.
  - Temporary: BV-001.
  - Rechecked: all existing `tests/e2e/projects` suites in both modes, and the unit suites.
  - Nothing removed.
- Commands, environment, fixture, or broader-validation delta: commands are in the coverage investigation. Broader validation was `Required` and ran as BV-001 (web-equivalent browser against the built dist).

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated:
  - `api-e2e-coverage-investigation.md` (all sections);
  - `api-e2e-execution-coverage-report.md` (new);
  - `api-e2e-test-case-ledger.md` (seq 1–11);
  - `api-e2e-evidence/`.
- Prior result and confidence: N/A
- Current result and confidence: Pass / 95.6% (post-repository 93.6%; user surface 85% → 95% after BV-001)
- New or remaining failure IDs: none. The one in-stage test-input defect (CTX-E2E-001, first attempt) was fixed.
- Recommended owner: proportional test-code review by `code_reviewer` (reviewed route)
- Remaining risks, blocked evidence, or untested scope:
  - Explicit user verification in the packaged app (delivery).
  - Phase-2 copy failure is covered by unit tests only.
  - No real-model use of the argument.
  - `TESTING.md` mention of the new gated suite is a docs-sync candidate.
