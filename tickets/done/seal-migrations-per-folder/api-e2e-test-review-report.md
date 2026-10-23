# API/E2E Test Review Report

Ticket `seal-migrations-per-folder` (autobyteus-280). Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/seal-migrations-per-folder`, branch `codex/seal-migrations-per-folder`, head `50fdac959a`. The test code is in `f1342aacfe`.

## Review Meta

- Review Round: 1
- Trigger: API/E2E pass (API-REV-001) from `/software_engineering_team/api_e2e_engineer`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (REQ-006, REQ-008, AC-004, AC-005; DEC-003)
- Investigation Notes Reviewed As Context: not reopened
- Solution Revision Record Reviewed As Context: via the design spec (SR-003)
- Design Spec Reviewed As Context: `design-spec.md` (DS-001, DS-002, DS-003; the pending-outcome table)
- Supplemental Task Artifacts Reviewed As Context: `follow-ups.md`
- Architecture Review Revision Record Reviewed As Context: N/A for this bounded review
- Implementation Revision Record Reviewed As Context: IR-002 (no source change since CRR-002)
- Original Code Review Report: `code-review-report.md` (CRR-002, Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-003`
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- Execution Coverage Report: `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed As Context: `api-e2e-revision-record.md` (API-REV-001)
- Delivery Revision Record Reviewed As Context: N/A
- API/E2E Result: Pass.
  - Full non-gated server e2e: 97 files.
  - Unit: 6625. Integration: 421. Library: 2041.
  - RA-04 failed once because the Mac went into idle sleep for 906 s (power log) during a 20 s wall-clock wait; rerun alone it passes 4/4.
- Final Validation Confidence: 95.5%
- Prior unresolved test-review findings rechecked: none
- Project testing guideline applied: `TESTING.md` (server e2e on the built server; synthesized data only; rerun by impact). No conflicts.
- Supported Product Scenario Basis Confirmed: `Yes`. SC-2 (a gated feature while its migration is pending or failed, DEC-003 / REQ-006) and SC-3 (205 on an install that has not run it, REQ-008), as established in CRR-001.

## Changed Durable Test Scope

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/secret-management/custom-provider-readable-id-startup-migration.e2e.test.ts` | Updated (one case rewritten, one added, an obsolete helper removed) | AC-004, DS-003, DEC-003 | The custom-provider migrations on a real startup | The old case asserted the removed whole-server G-1 block and failed on the current build (API-08). Its replacement asserts the approved narrowed behavior. Convergence assertions are unchanged |
| `autobyteus-server-ts/tests/e2e/app-data-migrations/remove-skill-improvement-data-startup.e2e.test.ts` | Updated (SID-2 extended) | AC-005, REQ-008 | 205 startup | Assertions added only |

- No durable test file changed: `No`

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | Case titles state the behavior ("serves while … holds custom providers back, then converges"; "serves while the custom-provider migrations cannot finish …"); comments cite DEC-003, AC-004 and REQ-008 |
| Assertions prove approved requirements | Pass | <ul><li>Health 200, and no `CUSTOM_PROVIDER_READABLE_ID_STARTUP_BLOCKED` in the output.</li><li>Migration statuses (`RUNNING`; `FAILED` with `CUSTOM_PROVIDER_V1_RESET_UNAVAILABLE`; `NOT_RUN`) with `canRetry`.</li><li>Settings lists built-ins only; create and delete refuse with `CUSTOM_PROVIDERS_MIGRATION_PENDING`, with no secret change.</li><li>A custom-model run is refused with the code while a built-in run starts.</li><li>The V2 file and selectors are untouched while pending.</li><li>After the V1 retry alone the capability stays pending; after the readable retry it is released without a restart, and a provider is created and its model's run starts.</li><li>SID-2: the compactor run is byte-identical, its row is kept, and it is listed after both starts.</li></ul> |
| Fixtures and helpers reuse meaningful repetition | Pass | `expectCustomProvidersPending` is used three times; `startAgentRun` and `terminateRun` are shared; the 205 fixture module's `writeRun`, `historyRow` and `COMPACTOR_RUN` are reused |
| Isolation and determinism | Pass | Test-owned runtime root and database. The read-only `llm/` folder is restored in `finally` and the case skips where mode bits do not bind (root, Windows), with a write probe asserting the permission holds. The discovery fixture is local |
| Large files coherent and navigable | Pass | One surface (the custom-provider startup lifecycle) |
| No stale, duplicated, disabled or compatibility-only tests | Pass | The obsolete case's assertions are replaced, not kept beside the new ones; `startExpectingGateFailure` and its import are removed; the other imports remain used |
| Coverage agrees with the investigation and evidence | Pass | The execution report's "Durable Coverage Changed In The Codebase" records the replacement with API-08's failure log |
| Callers and fixtures exercise an established scenario | Pass | DEC-003 (a pending or failed custom-provider migration, the server keeps running) and REQ-008 are approved. The unwritable folder is a test device that puts the migration in its supported `FAILED` state through the real runner; it is not a scenario of its own |
| Real triggers and real steps | Pass | A real built server is started. Settings actions go through the same GraphQL mutations the page sends, and the retries through `runAppDataMigration`, as Settings → Migrations does. Runs start through `createAgentRun`. No hidden state is mutated, apart from the stale `RUNNING` ledger row the existing case already seeded |

## Findings

None for the changed tests.

Note for the record, on my source review: the stale e2e that asserted the removed G-1 block was in the branch from IR-001. Neither implementation's e2e runs nor my source review caught it. A grep of `tests/` for the removed code `CUSTOM_PROVIDER_READABLE_ID_STARTUP_BLOCKED` during CRR-001 would have found it. It is recorded in CRR-003 as a review gap. API/E2E's replacement is correct.

## Follow-ups

- Follow-ups this review added: **FU-002**. `team-run-v1-production-upgrade.e2e.test.ts:1498` still asserts the absence of the removed TeamRun V2 warning, so it can no longer fail. The file is untouched by this ticket; the suggested fix is a status check of the V2 migration.
- Existing: FU-001.
- Sent to: `None` (the Solution Designer sends the ticket's follow-ups).

## Latest Authoritative Result

- Result: `Pass`
- Changed durable test paths reviewed:
  - `tests/e2e/secret-management/custom-provider-readable-id-startup-migration.e2e.test.ts`
  - `tests/e2e/app-data-migrations/remove-skill-improvement-data-startup.e2e.test.ts`
- Unresolved finding IDs: none
- Recommended Recipient: `/software_engineering_team/delivery_engineer`
- Notes: `CRR-003`. The classification Large / High is preserved.
