# API/E2E Test Review Report

## Review Meta

- Review Round: 1
- Trigger: API-REV-001 `Pass` (95%), with a request for proportional review of the changed durable tests
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-002; REQ-001…REQ-007, AC-001…AC-005)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (INV-16: both retired agents are listed to agents on the live node)
- Solution Revision Record Reviewed As Context: SR-003
- Design Spec Reviewed As Context: `design-spec.md` (SR-003)
- Supplemental Task Artifacts Reviewed As Context: `follow-ups.md` (FU-001…FU-003)
- Architecture Review Revision Record Reviewed As Context: ARCH-REV-002
- Implementation Revision Record Reviewed As Context: IR-001
- Original Code Review Report: `code-review-report.md` (CRR-001 `Pass`)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-002`
- Coverage Investigation: `api-e2e-coverage-investigation.md` (§ Ambiguities: the stale tests)
- Execution Coverage Report: `api-e2e-execution-coverage-report.md` (Cases API-00…API-13, Acceptance-Criteria Proof, Durable Coverage)
- API/E2E Revision Record Reviewed As Context: API-REV-001
- Delivery Revision Record Reviewed As Context: N/A
- API/E2E Result: `Pass` on product code `91ee1603a5`. Test commits: `cbdf02f15a`, `24582b576c`, `0a7993c227`, `984e04707f`; reports and evidence in `da95a6105c`.
- Final Validation Confidence: 95% (API/E2E's figure)
- Prior unresolved test-review findings rechecked: none (first test review)
- Project testing guideline applied: `TESTING.md`:
  - Rule 9: each baseline fix is its own labelled commit;
  - § Fresh-start build: API-11;
  - § Environments, credentials and data: test-owned data roots only; the LM Studio model was loaded by the run and unloaded after.
  - No conflicts.
- Supported Product Scenario Basis Confirmed: `Yes`. SCN-A, the upgrade start, gets two new checks: RRB-3 for AC-004 through the tool, and SIR-002 for the Agents page.

## Changed Durable Test Scope

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/app-data-migrations/remove-retired-built-in-agents-startup.e2e.test.ts` | Updated: RRB-3 added; `studio()` takes extra env and returns `origin` and `gql` | AC-004 (`list_available_agents`), REQ-003/004 | The retired built-ins through the real built Studio start | RRB-3 is gated by `RUN_AGY_FAILURE_E2E` and the scripted CLI's `--version` |
| `autobyteus-web/tests/e2e/skill-improvement-removal-cases.mjs` | Updated (SIR-002) | AC-003/AC-004 (Agents page), REQ-004 | Upgrade removal in a real browser | It also installs the Memory Compactor and expects it gone. Baseline fix `cbdf02f15a`: improver sessions in the released shapes; `memory/episodic/` left out of the byte check. |
| `autobyteus-ts/tests/integration/helpers/lmstudio-llm-helper.ts` | Updated (baseline fix `24582b576c`) | AC-002 (memory flows) | Resolve an LM Studio model for gated integration tests | Registers LM Studio's models by reloading the provider |
| `autobyteus-ts/tests/integration/agent/memory-llm-flow.test.ts` | Updated (same commit) | AC-002 | The memory assembler with a real LM Studio call | Expects one user and one assistant record, and allows a reasoning record |
| `autobyteus-ts/tests/integration/agent/openai-read-file-strict-live.test.ts` | Updated (baseline fix `0a7993c227`) | AC-002 | OpenAI tool arguments through a native agent (live) | Sets the hand-built runtime's tool search as the factory does |

- No durable test file changed: `No`

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | RRB-3 is named by its outcome and listed in the file header with its gate and run line. Every baseline fix carries a comment naming its cause (autobyteus-280, -493, -515). |
| Assertions prove approved requirements instead of incidental implementation details | Pass | **RRB-3:** asserts what the tool returns to an agent: "My Agent" present; no retired name, id or address (`/memory_compactor`, `/skill_self_evolver`). The control is sound: "My Agent" is written in the same minimal shape as the retired fixtures (`agent.md` with a name) and is listed, so a retired folder that stayed would be listed too (INV-16 shows they were on the live node). **SIR-002:** checks the definitions list and the Agents page count for both agents. **memory-llm-flow:** the fixed count of 2 became exactly one user and one assistant, with only `reasoning` allowed besides. That is not weaker, because the evidence shows the reasoning record is real model output, not a read artifact. |
| Fixtures, setup, helpers, and data builders reuse meaningful repetition | Pass | RRB-3 reuses `setupRoot`, `writeRetiredBuiltInsRoot` and `studio()`, extended rather than copied. SIR-002 now uses the fixture module's `fx.session` released shapes, as the server fixture does. |
| Test isolation and determinism are appropriate for the exercised boundary | Pass | **RRB-3:** its own temp root, a `finally` that closes the socket and stops the run, and the existing `afterEach` cleanup. On timeout it reports the frame types, error frames, server log tail and conversation, which makes a load-caused failure readable (API-06 run 2). **LM Studio helper:** `reloadModels` catches an unreachable provider (`llm-factory.ts:347-353`), so the helper still returns null and skips. The suite stays gated by `hasLmstudioConfig()`. |
| Large files remain coherent and navigable rather than mixing unrelated scenarios | Pass | — |
| No stale, duplicated, disabled-without-reason, or compatibility-only tests remain | Pass | Three stale tests on base made to run again; the LM Studio pair had skipped silently, returning in 2 ms as passes. SIR-001's stale expectation, which is not this ticket's behavior, is follow-up FU-001 rather than a quiet edit. |
| Added, updated, and removed coverage agrees with the coverage investigation and execution evidence | Pass | API-06/07 (`API-07-rrb3-list-available-agents.json`); API-08 (`agentsPage {selfEvolver: 0, memoryCompactor: 0}`); API-12 (LM Studio 2/2, OpenAI 2/2) |
| Test callers and fixtures exercise an independently established supported scenario rather than proving one by themselves | Pass | SCN-A, the upgrade start, is REQ-003/004. RRB-3's tool surface is AC-004. |
| Each test enters through its scenario's real trigger and follows the real actor's or event's steps, without a setup real use does not produce | Pass | **RRB-3:** a built Studio start, GraphQL `createAgentRun`, an agent websocket message, then a real tool call executed by the server. Only the external AGY CLI is scripted, and the Daily Assistant's own configuration enables the tool. **SIR-002:** real Chrome on the real backend. The `memory/episodic/` exclusion is proportionate: those catalogs are derived files (autobyteus-493, `Discard or Rebuild`) that the start rightly rewrites when the deleted helper runs leave. |

## Findings

None.

## Follow-ups

- Follow-ups this review added: None (API/E2E's FU-001…FU-003 noted)

## Latest Authoritative Result

- Result: `Pass`
- Changed durable test paths reviewed:
  - `remove-retired-built-in-agents-startup.e2e.test.ts`;
  - `skill-improvement-removal-cases.mjs`;
  - `lmstudio-llm-helper.ts`;
  - `memory-llm-flow.test.ts`;
  - `openai-read-file-strict-live.test.ts`.
- Unresolved finding IDs: none
- Recommended Recipient: `delivery_engineer`
- Notes: carried for delivery:
  - REQ-007: the founder's approval and a backup before the first start on his node.
  - Not tested: the signing policy and the Docker image (API-11).
  - Suite failures outside this ticket: FU-002 (base failures), FU-003 (watcher timing under load).
