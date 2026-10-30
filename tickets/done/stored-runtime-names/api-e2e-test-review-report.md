# API/E2E Test Review Report — autobyteus-343 (stored-runtime-names)

## Review Meta

- Review Round: 1
- Trigger: API/E2E validation Pass (API-REV-001), durable tests in `b65c6c2220`; head `67da7bb909`
- Requirements Doc / Investigation Notes / Solution Revision Record / Design Spec Reviewed As Context: `requirements-doc.md`, `investigation-notes.md`, `solution-revision-record.md` (SR-002), `design-spec.md`
- Supplemental Task Artifacts: `task-brief-from-316.md` (context only)
- Architecture Review Revision Record: `architecture-review-revision-record.md` (ARCH-REV-001)
- Implementation Revision Record: `implementation-revision-record.md` (IR-001)
- Original Code Review Report: `code-review-report.md` (CRR-001 Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-002`
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- Execution Coverage Report: `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record: `api-e2e-revision-record.md` (API-REV-001)
- Delivery Revision Record: N/A
- API/E2E Result: Pass
- Final Validation Confidence: 95.3% (post-repository 94.0%)
- Prior unresolved test-review findings rechecked: None (first round)
- Project testing guideline(s) applied: `TESTING.md` (never run startup on real data or a copy; test-owned roots; live failures alone are not defects). No conflict or discrepancy found.
- Supported Product Scenario Basis Confirmed: `Yes` — the first start after an update (operational event), the Memory Sync of a node's own manifest, and a backend compaction are the supported triggers named by the requirements; the tests enter through the built server (`dist/app.js`), the GraphQL status, `startMemorySync`, and the app WebSocket/compaction path, not through internal methods.

## Changed Durable Test Scope

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/app-data-migrations/raw-trace-manifest-runtime-names-startup.e2e.test.ts` | Added (253 lines) | AC-002, AC-003, AC-004, AC-007 | Built Studio startup: clean journey (all shapes, three families, out-of-reach files byte-identical, leftover tmp, second start) and warnings journey | Header documents purpose, prerequisite (fresh `dist`), command, journeys |
| `autobyteus-server-ts/tests/e2e/memory-sync/raw-trace-manifest-runtime-names-sync.e2e.test.ts` | Added (173 lines) | design F-09, DEC-2 | Two real server processes: source migration → first sync (4 files) → hub mirrors converted manifest, hash recorded → second sync uploads nothing → changed manifest re-syncs; hub's older import untouched | Header documents the same |
| `autobyteus-server-ts/tests/e2e/runtime/agy-compaction-rotation-transport.e2e.test.ts` | Updated (+6) | AC-001 | Manifest `runtime_kind` equals the payload value and `antigravity_cli` | Gated file; assertion added inside the existing scenario |
| `autobyteus-server-ts/tests/e2e/runtime/grok-build-compaction-replay.e2e.test.ts` | Updated (+4) | AC-001 | Manifest holds `grok_build` ×3 after three replayed compactions | Existing scenario |

- No durable test file changed: `No`

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | Two journeys named by outcome; file headers state purpose and journeys; the sync test is one linear scenario with comments per stage |
| Assertions prove approved requirements | Pass | Exact converted bytes (`compact(converted(value))`) incl. key order and unknown keys; exact summaries; status values; per-file sha256 snapshots for everything that must stay; mtime checks for "not rewritten"; log lines name run and reason; hub sha256 matches source |
| Fixtures, setup, helpers reuse meaningful repetition | Pass | `entry`/`manifest`/`converted`/`writeRun`/`snapshot` builders; the `converted` oracle is derived from a separate label table, not from the code under test. Sync test repeats the process helpers from `memory-sync-multiprocess.e2e.test.ts` (existing pattern in that folder); acceptable |
| Isolation and determinism | Pass | Test-owned temp root, private HOME and DB, restricted env in the startup test, port 0 / free ports, cleanup in `afterEach`/`afterAll`, kill with SIGKILL fallback. Sync test inherits `process.env` but overrides HOME, host, and data dir and unsets database vars (same as the sibling multiprocess test). Mutation checks (evidence `API-02-03-mutation-checks.md`) show the tests fail for wrong target, imports visited, nothing converted, warnings off, leftover cleanup off (after the fixture was strengthened) |
| Large files coherent | Pass | Each file covers one surface |
| No stale, duplicated, disabled-without-reason tests | Pass | No skips added; the two updated runtime suites keep their existing gates |
| Agrees with coverage investigation and execution evidence | Pass | Cases and counts in the report match the assertions (`Scanned 11; migrated 9; skipped 2; failed 0.`, `Scanned 6; migrated 1; skipped 5; failed 0.`) |
| Fixtures exercise an independently established scenario | Pass | Synthetic roots are released shapes of the manifest (design shape inventory; real census F-04); the trigger is the real startup |
| Real trigger and real steps | Pass | Real built server start, GraphQL status, real sync mutation. One acknowledged simplification: the sync test's third stage writes a longer manifest by hand to stand for a later rotation (the comment says so); it checks the existing changed-file upload path, not this ticket's code, and the actual rotation write is proven by the AGY and Grok suites |

## Findings

None.

Optional tidy, not a finding: `exists` in the startup test (`:50`) is declared and never used; remove when next touched.

## Follow-ups

- Follow-ups this review added: None (FU-001 from CRR-001 unchanged)

## Latest Authoritative Result

- Result: `Pass`
- Changed durable test paths reviewed: the four listed above
- Unresolved finding IDs: None
- Recommended Recipient: `delivery_engineer`
- Notes: Production code unchanged since `f5f9ee3221` (verified from `git diff dd56f6de6c..67da7bb909` showing only tests and ticket documents). Residual risks as reported by API/E2E: live AGY compaction, Claude/Codex/native compaction through a running server, and kill-mid-migration on the built server are covered at unit/converter level only; the live Grok failure on the first run (timeout before any compaction event) was not isolated, and the rerun passed. Delivery carries the release-note points (rollback, re-upgrade, imports, in-record labels).
