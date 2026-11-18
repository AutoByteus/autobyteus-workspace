# API/E2E Test Review Report: follow-ups-of-461-500 (autobyteus-500)

The latest result is **CRR-009: Pass** (API-REV-003, the merged state). CRR-006 and CRR-005 follow as history.

## API-REV-003 (CRR-009)

- **Scope:** `d600a2af71`, `project-task-boundaries.e2e.test.ts` E-007 (+8 / −2). Docs are in `cfbbd1af8e`.
- **The change:**
  - E-007 releases the process Task service mid-test to read the Task entries on disk "as a restart reads them". Before, the lazy getter rebuilt the service; FU-011 removed that getter.
  - The test now composes the Task side again from disk with the hosts' own `composeTaskSide`, plus the shared `NO_RUN_SIDE_TASK_PORTS` (no running roots), and initializes the process instance.
  - That is the real restart path, not a fake, and the file's reset (`releaseComposedProjectTaskService`) releases it afterwards.
  - 18/18; the type gate is at baseline.
- **Checks:** names and intent are clear (the comment says why); the assertions are unchanged; the setup reuses the shared helper; nothing stale or skipped.
- **The merged state's evidence (API-REV-003):**
  - This ticket's cases pass in the full server E2E run: ALM-1, RSE-1, ODM-1, LTI-1, E-002, SCP, DCM, DTL, DLC, RC 46/46, and the G-5 and FU-011 suites.
  - Each remaining failure was classified alone, on the branch and on base `ff13782f36`: load, FSEvents, or the same on base (FU-500-09, FU-500-12).
  - AC-005: Linux 5/5 on the merged state.
  - Browser cases: 8/8, and the composer 12/12.
- **Result: Pass.** No findings. Recipient: `/delivery_engineer`.

---

## Recheck (CRR-006)

- **Scope:** `73bfba186c` (test) and `642737b97a` (docs). API/E2E's handoff first named other hashes and then corrected them; the branch holds these.
- **CR-500-006: Resolved.** ODM-1 now asserts each path's own answer and keeps the G-5 negatives:
  - step b contains `MODEL_IDENTIFIER_NOT_AVAILABLE`;
  - step c contains `AgentDefinition with ID ${retired} not found`;
  - the lead's options are checked every time (`modelListReadable: true`, the LM Studio model), and the message lists the scopes if the lead's is missing.
- **Rerun:** "Tests 1 passed (1)" (`/tmp/api500/r2/odm3.log`).
- **The optional suggestion, declined:** the reason holds. Detecting "no composition yet" another way would need a test-only query in product code, and the helper rethrows any other error.
- **Result: Pass.** Recipient: `/delivery_engineer`.

---

## Review Meta

- Review Round: 1 (proportional test-code review)
- Trigger: API-REV-002 Pass (95%) on CRR-004; head `7529c27723`.
- Scope: `c0770ea7b0` (round 1) and `a7e76ca248` (round 2).
- Context read: the requirements (AC-005 … AC-012), design G-5 (SR-015/016), `code-review-report.md` (CRR-003, CRR-004), `api-e2e-execution-coverage-report.md`, `API-r2-runs.txt`.
- Current Code Review Revision ID: `CRR-005`
- Prior unresolved test-review findings: none (first test review).
- Project testing guideline: `TESTING.md`, including its Gates rule from 461 (clients found by search, rules readable from source checked by a unit test). No conflicts.
- Supported Product Scenario Basis Confirmed: `Yes`

## Changed Durable Test Scope

| Durable test path | Change | Scenario / requirement | Notes |
| --- | --- | --- | --- |
| `tests/e2e/agent/run-stream-early-command.e2e.test.ts` (RSE-1) | Added | AC-006 / FU-036 | Asserts that each early command gets exactly one answer, `SESSION_NOT_READY` or an ack. A positive proof that nothing is dropped. |
| `tests/e2e/app-data-migrations/delegated-run-own-attachment-links-startup.e2e.test.ts` (ALM-1) | Added | AC-008 / FU-020 | Built server, product-written links, byte identity, backups, the removed route's 404, a second start. |
| `tests/e2e/llm-management/on-demand-stored-models-startup.e2e.test.ts` (ODM-1) | Added | AC-012 / G-5 R1, R2 | Real restarts over emulated LM Studio and Ollama. See CR-500-006. |
| `autobyteus-web/tests/e2e/stored-model-not-offered-cases.mjs` (G5-001…003) | Added | AC-012 browser | — |
| `tests/unit/e2e-helpers/team-stream-clients-wait-for-connected.test.ts` | Updated | FU-036 static check | A named exemption with its reason, and a case that removes the exemption when the file stops sending early. Good. |
| `late-team-history-index-v2-startup.e2e` (LTI-1) | Updated | AC-010 / G-2 | Now asserts that the user-started row is kept; base's record of dropping it is turned into the requirement. |
| `append-only-message-logs-startup.e2e` | Updated | FU-020 | The run's own link answers 200; the removed hub route answers 404. |
| `delegated-copy-model-change`, `delegated-team-lazy-member-activation`, `removed-remote-provider-saved-selection` | Updated | G-5 | The runtime's own code is replaced by G-5's text. The removed provider is an AutoByteus remote server, not loaded on demand, so G-5 answers, which is correct. |
| `remote-delegation-two-server` (RC-04/RC-17) | Updated | FU-030 | A peer's refusal keeps the peer's reason only. |
| Five project e2e harnesses, `explicit-host-collaborators.ts`, `project-task-tool-writer.mjs` | Updated | FU-011 | The Task service is the composition's; the tool-only fixture composes its own Task side. |
| `delegated-launch-defaults-probe.mjs` | Updated | FU-030 / CR-500-005 | DLP-005's inherited text. |

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names clear | Pass | Each file names its ACs and steps in its header. |
| Assertions prove the requirement | **Fail** | CR-500-006: two ODM-1 outcomes are asserted only by what they must not contain. |
| Fixtures and helpers reused | Pass | `startBuiltStudio`, `waitConnected`, `agentStreamFramesOf`; one release helper for the five harnesses. |
| Isolation and determinism | Pass | Emulated hosts on loopback; the one fixed wait (RSE-1, 500 ms) checks that nothing more arrives. |
| Large files coherent | Pass | ALM-1 (250 lines) and ODM-1 (235) each cover one surface. |
| No stale, disabled or compatibility-only tests | Pass | Gated `describe.skip` only behind each file's documented environment switch. |
| Coverage agrees with the investigation and evidence | Pass | — |
| Fixtures don't establish scenarios by themselves | Pass | Each case follows a requirement's scenario. |
| Real trigger, real steps | Pass | Built server, real restarts, real HTTP, GraphQL and WebSocket. |

## Findings

| Finding ID | Test path / scenario | Evidence | Required action | Classification / owner |
| --- | --- | --- | --- | --- |
| CR-500-006 | `on-demand-stored-models-startup.e2e.test.ts` ODM-1, steps b and c | Step b, host down: `:200` only checks that the error doesn't contain G-5's text, with `answered === false`. Step c, retired member: `:230` likewise only checks for the absence of G-5's text. A **silent non-answer** (no error frame at all, the defect class F-3 looked like in round 1 and that this ticket removes) passes both. The requirements are positive: AC-012 "with the list unreadable, the start proceeds as today", and SR-015 R2 "the path's own not-found answers". `API-r2-runs.txt` shows the real texts (`MODEL_IDENTIFIER_NOT_AVAILABLE`; "AgentDefinition with ID … not found."), but nothing asserts them. Also `:189`: `if (results.restart.leadOptions) expect(…)` skips the lead's "no note" check when the options are missing. | Assert each path's own answer positively: step b contains `MODEL_IDENTIFIER_NOT_AVAILABLE`, step c contains "AgentDefinition with ID" … "not found", keeping the G-5 negatives. Make the lead's options check unconditional, or state in the test why a member has no options. Rerun ODM-1. | `Local Fix`, API/E2E-owned |

**Suggestion (not a finding):** `releaseComposedProjectTaskService` recognizes "no composition yet" by matching the getter's message text ("is created by the composition"). A rename of that message would fall into the `throw`, loudly, so it's safe, but a small exported check on the service module would be sturdier. Optional.

## Follow-ups

- None added by this review. API/E2E recorded FU-500-09 … FU-500-11.

## Result

- **Fail**, Local Fix (CR-500-006). Recipient: `/api_e2e_engineer`.
- After the fix: a rerun of ODM-1, then a quick recheck here, then delivery.
