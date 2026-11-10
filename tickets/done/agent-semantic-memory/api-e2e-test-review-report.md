# API/E2E Test Review Report

## Review Meta

- Review Round: 1
- Trigger: API/E2E validation passed (API-REV-001); proportional review of the durable tests it added
- Requirements Doc Reviewed As Context: `requirements-doc.md` (Approved, SR-004)
- Investigation Notes Reviewed As Context: through `api-e2e-coverage-investigation.md` and the design spec citations
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-004)
- Design Spec Reviewed As Context: `design-spec.md` (SR-004)
- Supplemental Task Artifacts Reviewed As Context: `semantic-memory-prompt-contract.md` (§2 text the suites copy)
- Architecture Review Revision Record Reviewed As Context: ARCH-REV-001
- Implementation Revision Record Reviewed As Context: IR-001. Implementation source is unchanged since CRR-001 (`git diff 7e5f90d7f..HEAD` touches only the two test files under `src`/`tests` plus ticket documents).
- Original Code Review Report: `code-review-report.md` (CRR-001, Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-002`
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- Execution Coverage Report: `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed As Context: `api-e2e-revision-record.md` (API-REV-001)
- Delivery Revision Record Reviewed As Context: N/A
- API/E2E Result: Pass, final confidence 95%
- Prior unresolved test-review findings rechecked: None (first test review)
- Project testing guideline(s) applied: root `TESTING.md`, the only guideline the coverage investigation records. The suites follow its rules: clean `env -i` commands; one gate per runtime, and a skip is not a pass; a throwaway `CODEX_HOME` with an `auth.json` link; the scripted AGY CLI behind `RUN_AGY_FAILURE_E2E`; the test vault for native runs. No conflicts or discrepancies.
- Supported Product Scenario Basis Confirmed: `Yes` (SCN-001..SCN-005; AC-001..AC-008)

## Changed Durable Test Scope

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/agent-definitions/agent-semantic-memory.e2e.test.ts` (401 lines) | Added | AC-001, AC-003..AC-008; REQ-001/002/007/008/009; DEC-012 | Semantic memory at the real Studio server boundary. Every runtime builds the instructions with the same composer, so the scripted AGY CLI stands in for a runtime here. | SM-01/SM-02 run ungated. SM-03..SM-08 and SM-10 use the scripted AGY CLI. |
| `autobyteus-server-ts/tests/e2e/runtime/agent-semantic-memory-live.e2e.test.ts` (566 lines) | Added | AC-001..AC-005; REQ-006, REQ-009; QR-002 | Real runtimes write and read the folder, and the test records exactly what the runtimes received | Gated per runtime; paid inference |

- No durable test file changed: `No`

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | Each case ID names its AC and outcome (`SM-04 (AC-001): … after the Project section …`). Both file headers list the cases, gates and exact commands. Runtime-specific live cases are grouped under `describe.each(enabledRuntimes)` with `skipIf(name !== …)`. |
| Assertions prove approved requirements instead of incidental implementation details | Pass | The instruction text is copied from contract §2, not imported from the source, so the suites check the source independently. SM-04/05/07 check placement exactly with `endsWith(project + "\n\n" + section)`. Package files are compared by tree hash (AC-007). Live Codex compares the exact `sandbox_workspace_write` objects and config keys (AC-005, the single-object merge). Claude checks `--add-dir <folder>`. Files on disk and codeword read-back prove the user-visible outcome (AC-002/AC-003). |
| Fixtures, setup, helpers, and data builders reuse meaningful repetition | Pass | Uses the existing `collaboration-root-harness`, `agy-runtime-error-fixture.until`, `studio-runtime-test-server`, `live-model-choice` and websocket helpers. Local helpers (`composedOf`, `treeHashes`, `ask`, `readWire`, `excerpt`) each remove real repetition. |
| Test isolation and determinism are appropriate for the exercised boundary | Pass | Disposable HOME, package root, data root and Projects, all removed in `afterAll`. Names are unique per run. Env changes are restored. The live data root refuses a path under the temp folder (AF-03). Cases inside one file build on each other (SM-04 → SM-05/07/10 → SM-08; SML-WRITE → SML-READ/TEAM/CLAUDE-APPROVALS). This is stated in the headers and is a fitting shape for an E2E journey. LLM-dependent live cases are gated and only judge outcomes. |
| Large files remain coherent and navigable rather than mixing unrelated scenarios | Pass | Each file has one surface: the server boundary with a scripted runtime, and real runtimes |
| No stale, duplicated, disabled-without-reason, or compatibility-only tests remain | Pass | Skips are the documented gates only. The suites do not repeat the unit-level composer, config or personal-settings tests; they add the HTTP, run-path and wire boundary. |
| Added, updated, and removed coverage agrees with the coverage investigation and execution evidence | Pass | Case IDs match the execution report's Cases and AC-proof tables. The sampled evidence (`SML-WRITE-codex*.json`, `SML-CODEX-INTEGRATION.json`, `SML-CODEX-OFF.json`, `SML-CLAUDE-APPROVALS.json`, `SM-05-prompts.json`) holds the values the assertions name. |
| Test callers and fixtures exercise an independently established supported scenario rather than proving one by themselves | Pass | Each case realizes a requirements scenario (SCN-001..SCN-005) through supported surfaces. These are the renderer's own GraphQL documents, package import, createAgentRun/createAgentTeamRun, a real `delegate_task` call, and terminate/restore. |
| Each test enters through its scenario's real trigger and follows the real actor's or event's steps, without a setup real use does not produce | Pass | Live runs learn the folder only from their instructions. Recorder wrappers run the real CLI unchanged. SM-04 writes a document into the folder directly because the AGY CLI is scripted: that stands in for the agent's own write, which the live suite proves for real (SML-WRITE). It is not an artificial state. |

Non-blocking observation (not a finding): `agent-semantic-memory-live.e2e.test.ts:350` calls `chooseLiveModel(name === "agy" ? "grok" : name, …)`. This gives AGY the helper's Grok-only fallback to the first offered model. Because the runtime name is passed as "grok", a miss would show up as "grok model … is not offered", and the header (line 43) states the fallback for Grok only. The run is not affected, since the AGY pin was offered. Whoever next touches the helper could give it an explicit fallback option.

## Findings

None.

## Follow-ups

- Follow-ups this review added: None

## Latest Authoritative Result

- Result: `Pass`
- Changed durable test paths reviewed: the two files above (commit `595990347`)
- Unresolved finding IDs: None
- Recommended Recipient: `delivery_engineer`
- Notes: Classification Large/High is preserved. DeepSeek harness AC-002 is the documented alternate outcome (FU-007, evidence API-20).
