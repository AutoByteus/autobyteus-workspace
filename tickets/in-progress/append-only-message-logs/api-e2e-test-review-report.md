# API/E2E Test Review Report — Append-Only Message Logs

## Review Meta

- Review Round: 1
- Trigger: API/E2E Pass (API-REV-001) from `/software_engineering_team/api_e2e_engineer`; request for a proportional review of the changed durable E2E tests
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-004)
- Investigation Notes Reviewed As Context: through the design and the coverage investigation
- Solution Revision Record Reviewed As Context: SR-005 (as in CRR-001)
- Design Spec Reviewed As Context: `design-spec.md` (SR-005): gate rule, dispositions, fixture table
- Supplemental Task Artifacts Reviewed As Context: none new
- Architecture Review Revision Record Reviewed As Context: ARCH-REV-004 (as in CRR-001)
- Implementation Revision Record Reviewed As Context: IR-001
- Original Code Review Report: `code-review-report.md` (CRR-001, Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-002`
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- Execution Coverage Report: `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed As Context: `api-e2e-revision-record.md` (API-REV-001)
- Delivery Revision Record Reviewed As Context: N/A
- API/E2E Result: Pass
- Final Validation Confidence: 96% (no category below 95%)
- Prior unresolved test-review findings rechecked: none (first test review)
- Project testing guideline applied: `TESTING.md` (root), as the coverage investigation records. I applied rules 1–2 and 5–6 and rule 9, which governs fixing test-side causes. No conflicts.
- Supported Product Scenario Basis Confirmed: `Yes`. The tests use SCN-001, SCN-002, SCN-003, SCN-004 and SCN-006, as approved.
- Code reviewed: test commit `e7437d7cf1`. The source is unchanged since `201a4933c6` (verified: no `src/` diff).

## Changed Durable Test Scope

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `tests/e2e/app-data-migrations/append-only-message-logs-startup.e2e.test.ts` | Added | SCN-001..004, SCN-006; AC-001..004, AC-006..009 (server part), BEH-001, BEH-007 | The built server's startup conversion of a faithful released install (AOML-1), then resuming and messaging the converted runs in each family (AOML-2) | 557 lines, two scenarios, clearly sectioned (server, data, reading, driving). The header states the run command and the prerequisite. |
| `tests/e2e/app-data-migrations/task-agent-own-run-startup.e2e.test.ts` | Updated | SCN-006; REQ-007 | Own-run's faithful upgrade, now ending with the conversion in the same start | The faithful root also removes the conversion's ledger row, because an install that never ran own-run never ran the later migration either. The old setup (conversion recorded as SUCCEEDED while own-run never ran) is unreachable. TAU-1 asserts the conversion SUCCEEDED and that no JSON log is left. |
| `tests/e2e/app-data-migrations/team-run-v1-production-upgrade.e2e.test.ts` | Updated | SCN-006; design gate (WAITING while a log-writing predecessor is pending) | Production upgrade chain, warning scenario | The JSONL expectation (added during implementation but never run) contradicted the design. The test now asserts the released JSON is unchanged, that no append-only file exists, and that the item is WAITING_FOR_PREDECESSOR and the status FAILED on both starts. The conversion's row is excluded from the unchanged-rows check, as the other retried rows are. A misplaced doc comment was put back on `assertAgentOrgPackage`. |
| `tests/e2e/app-data-migrations/agent-org-token-continuation.e2e.test.ts` | Updated | SCN-003 | In-process flat-families continuation | Runs `convertMessageLogsAsOnStartup` after flat-families, as a real start does, and asserts SUCCEEDED. |

- No durable test file changed: `No`

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | AOML-1 and AOML-2 names state the outcome. The header maps each one to its ACs. The inline comments name the AC each block proves. |
| Assertions prove approved requirements instead of incidental implementation details | Pass | They assert served views equal to the released lists (AC-004), references resolving by `messageId` + `referenceId` (AC-008), JSON kept byte for byte for unusable logs with a warning (REQ-006), rotation within limit plus one message (AC-003), and one appended line with sealed sha256 unchanged (REQ-001, REQ-003). Also: an empty log for a delegated team (BEH-007), and a second start writes nothing (AC-006). The seven-field key-set check is the designed line contract. |
| Fixtures, setup, helpers, and data builders reuse meaningful repetition | Pass | Reuses `writeReleasedDataRoot` with its HUB/TEAM/ORG messages, the frozen released validators, `flattenE2eConfiguredAgentExecutions`, and the `studio`/`faithfulRoot` pattern of the own-run E2E. Local helpers (`views`, `driver`, `logLines`) serve both scenarios. |
| Test isolation and determinism are appropriate for the exercised boundary | Pass | Each scenario uses its own temp root, HOME, SQLite database and port 0. The scripted AGY CLI means no inference. Waits are bounded. `afterEach` kills child processes and removes the roots. The synthesized `createdAt` values (2026-10-02) predate runtime messages, so ordering is stable. |
| Large files remain coherent and navigable | Pass | One surface (startup conversion and its aftermath), two scenarios. |
| No stale, duplicated, disabled-without-reason, or compatibility-only tests remain | Pass | The stale JSONL expectation in team-run-v1-production-upgrade was corrected to the designed outcome. Nothing is skipped or disabled. |
| Coverage agrees with the coverage investigation and execution evidence | Pass | API-05: AOML-1 and AOML-2 pass. API-01: TAU-1..3, token continuation and collaborators-startup pass; API-01-before-test-updates records the test-side causes. API-04: the one failure, `terminal-websocket-lifecycle`, is not in the changed tests and its environmental cause is recorded. |
| Test callers and fixtures exercise an independently established supported scenario | Pass | Every path is an approved scenario: upgrade start (SCN-003, SCN-006), open (SCN-002), reference open (SCN-004), agent sends (SCN-001). The fixtures reproduce released shapes and are checked with the frozen released validators. They do not create new behavior. |
| Each test enters through its scenario's real trigger without a setup real use does not produce | Pass | The trigger is a real start of `dist/app.js` with the real runner, ledger and registry, and sends are real tool calls through the WebSocket. Removing the ledger rows reproduces what an upgrading install has: the later migrations have never run. In AOML-2 the logs are rewritten into the released JSON shape on a current-build folder. The test documents this approximation (only the message logs differ from the release), and RU-1 (API-06, a data package from the actual released v1.5.6-beta.4 app) closes the gap. |

## Findings

None.

## Follow-ups

None from this review. The API/E2E engineer is sending FU-API-1 (`context-file-storage-runtime`, failing identically on base `65cf41c6b4`) to the Project Task Manager.

- Sent to: `None`

## Latest Authoritative Result

- Result: `Pass`
- Changed durable test paths reviewed: the four listed above
- Unresolved finding IDs: none (CR-001 from the source review is still non-blocking and open for the docs sync)
- Recommended Recipient: `/software_engineering_team/delivery_engineer`
- Notes: CRR-002. task_size `Large`, architectural_risk `High` (unchanged).
