# API/E2E Test Review Report — agy-native-image-output-path

## Review Meta

- Review Round: 1
- Trigger: API/E2E Pass (API-REV-001, round 1) from `api_e2e_engineer`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (Approved SR-003; SR-004 current)
- Investigation Notes Reviewed As Context: `investigation-notes.md`
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-001..SR-004)
- Design Spec Reviewed As Context: `design-spec.md`
- Supplemental Task Artifacts Reviewed As Context: `api-e2e-evidence/`; Product/UI supplements N/A — not applicable
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md` (ARCH-REV-002)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md` (IR-001)
- Original Code Review Report: `code-review-report.md` (CRR-001, Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-002`
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- Execution Coverage Report: `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed As Context: `api-e2e-revision-record.md` (API-REV-001)
- Delivery Revision Record Reviewed As Context: N/A
- API/E2E Result: Pass
- Final Validation Confidence: 95.6%
- Prior unresolved test-review findings rechecked: None (first test review)
- Supported Product Scenario Basis Confirmed: `Yes` — SCN-001 (user generates an image; also restore/reopen), SCN-002 (AGY layout drift / missing output → fallback), AC-003 containment contract

## Changed Durable Test Scope

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/runtime/agy-native-image-step-output.e2e.test.ts` | Added (uncommitted) | SCN-001, SCN-002; REQ-001..005; AC-002, AC-003, AC-004, AC-005 | Deterministic, in-process real server with fake AGY transport. Covers the native image step-output enrichment: resolved, missing, outside, and symlink cases | Gated by `RUN_AGY_FAILURE_E2E=1` + `ANTIGRAVITY_CLI_COMMAND` |
| `autobyteus-server-ts/tests/e2e/runtime/agy-native-image-app-chat.e2e.test.ts` | Updated (uncommitted) | SCN-001 restore/reopen; AC-001, AC-004 | Live real-agy app chat; adds `expectReopenedHistory()` before and after `terminateAgentRun` | Live-gated |
| `autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs` | Updated (uncommitted) | Fixture for the new suite | Adds the `image_done` case (ACTIVE params → DONE → SUCCESS) with a UUID conversation from `AGY_FAKE_CONVERSATION_ID` | Existing denial and terminal cases unchanged |

- No durable test file changed: `No`
- Removed tests: none. `agy-failure-transport.e2e.test.ts` was restored to HEAD after an interim change (per the execution report, L43).

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | Four `it` cases named by outcome (publishes path/output/Artifacts/history; missing → success null; outside ignored; symlink ignored). The `runImageTurn` / `expectUnresolved` / `plantStepOutput` helpers read clearly. Minor: `started` is re-declared (shadowed) inside the `try` block of `runImageTurn`. This is legal and non-blocking. |
| Assertions prove approved requirements instead of incidental details | Pass | Resolved case: exact result `{DONE, output, file_path}` (REQ-001, AC-005), public args (REQ-005), one `generated_output` entry via both the live wire and `getRunFileChanges` (REQ-004), preview bytes with an `image/*` content type (AC-004), and history replay (SCN-001). Unresolved cases: SUCCESS with `output:null`, exactly one content-free warning with the specific reason, no FILE_CHANGE, and history `output:null` (REQ-003, AC-002, AC-003). Asserting the warning text is justified because the design specifies its exact content-free format. |
| Fixtures, setup, helpers reuse meaningful repetition | Pass | Shared `beforeAll` server and definition; `plantStepOutput` mirrors AGY 1.2.12's real output format (matches probe evidence); `expectUnresolved` removes triplicated assertions. The fixture extends the existing fake CLI rather than adding a new one. |
| Test isolation and determinism are appropriate for the boundary | Pass | A gated `vi.hoisted` sets HOME to a realpath'd temp dir before server modules load, so the production default brain root is test-owned and the real `~/.gemini` is untouched. `vitest.config.ts` uses `pool: "forks"` with `fileParallelism: false`, so the HOME change is confined to this file's worker process. Each case uses a fresh UUID conversation. The temp home is removed in `afterAll`, and `AGY_FAKE_*` env vars are deleted. The fixed `wait(200)` settle after TURN_COMPLETED mirrors the existing failure-transport suite. With the gate off, `home` is `""` and the suite is skipped, so no hooks run. |
| Large files remain coherent | Pass | The new suite is ~190 lines on a single surface. The app-chat addition is scoped to the reopen scenario. |
| No stale, duplicated, disabled-without-reason, or compatibility-only tests | Pass | Interim fallback case moved out of failure-transport (restored to HEAD) rather than duplicated. Gating is the established convention for these runtime e2e suites, not disabled-without-reason. |
| Coverage agrees with investigation and execution evidence | Pass | Execution report L88 (API-E2E-007: 6/6) and L152 match the files. Live app-chat and browser evidence are in `api-e2e-evidence/`. |
| Test callers and fixtures exercise an independently established scenario | Pass | The fake transport reproduces the AGY stream shape for SCN-001/SCN-002, which were established upstream from real AGY probes (E-004..E-006, E-010). Outside and symlink cases exercise the approved AC-003 contract; they do not invent new behavior. The live real-agy suites independently confirm SCN-001. |

## Findings

None.

## Latest Authoritative Result

- Result: `Pass`
- Changed durable test paths reviewed: `tests/e2e/runtime/agy-native-image-step-output.e2e.test.ts` (added), `tests/e2e/runtime/agy-native-image-app-chat.e2e.test.ts` (updated), `tests/fixtures/agy-failure-cli.mjs` (updated)
- Unresolved finding IDs: None
- Recommended Recipient: `/delivery_engineer`
- Notes: The test changes are still uncommitted in the worktree, so delivery must include them when finalizing. There is an optional readability nit (shadowed `started` in `runImageTurn`); no action is required.
