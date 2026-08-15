# API/E2E Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | `code_reviewer` CRR-002 / initial API/E2E round 1 | CRR-001, CRR-002, IR-002, ARCH-REV-002 | N/A | Fail / 87% |
| API-REV-002 | `code_reviewer` CRR-003 / focused fixture-correction rerun round 2 | CRR-001, CRR-002, CRR-003, IR-002, ARCH-REV-002, API-REV-001 | Fail / 87% | Fail / 84% |
| API-REV-003 | `solution_designer` CRR-004 / one diagnostic approval-path probe round 3 | CRR-001, CRR-002, CRR-003, CRR-004, IR-002, ARCH-REV-002, API-REV-001, API-REV-002 | Fail / 84% | Fail / 85% |
| API-REV-004 | `code_reviewer` CRR-005 / authorized focused rerun round 4 | CRR-001, CRR-002, CRR-003, CRR-004, CRR-005, IR-002, ARCH-REV-002, API-REV-001, API-REV-002, API-REV-003 | Fail / 85% | Pass / 93% |

## Revision Entries

### API-REV-001 — Initial fresh runtime-specific Carpenter API/E2E execution

- Date: 2026-08-15
- Triggering role, report path, and round: `code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/tickets/in-progress/runtime-specific-carpenter-prompt/code-review-report.md`; CRR-002; API/E2E round 1.
- Triggering finding or scenario IDs: `NATIVE-FACTORY-LIVE-001` failed during broader validation; no implementation finding is currently inferred.
- Related solution, architecture-review, implementation, and code-review revisions: `SR-002`, `ARCH-REV-002`, `IR-001`, `IR-002`, `CRR-001`, `CRR-002`.
- Why this baseline was recorded: first completed API/E2E validation result for this ticket; no prior API/E2E record existed.
- Coverage decisions or durable test paths changed: no durable test changes. Existing prompt/bootstrap, native GraphQL, team GraphQL, and provider-gated coverage was rechecked as valid. The direct LM Studio factory fixture is pending failure-origin review because it uses stale backend event/path assertions.
- Scenarios rechecked: focused prompt/provider unit suite, deterministic native/runtime/mixed integration, native standalone GraphQL restore, native write-file materialization, native team create/restore, fake Claude interrupt/resume, and provider gate characterization.
- Commands/environment delta: isolated Vitest Prisma setup; owned `qwen/qwen3.6-35b-a3b` LM Studio model loaded for native live tests. An explicit model override initially failed model lookup; an unset-override rerun discovered the active model and reached the fixture failure.

#### Prior Failure Resolution

None. This is `API-REV-001`; no prior result or confidence record exists.

- Canonical artifacts updated:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/tickets/in-progress/runtime-specific-carpenter-prompt/api-e2e-coverage-investigation.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/tickets/in-progress/runtime-specific-carpenter-prompt/api-e2e-execution-coverage-report.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/tickets/in-progress/runtime-specific-carpenter-prompt/api-e2e-revision-record.md`

- Prior result and confidence: `N/A` — no prior API/E2E result existed.
- Current result and confidence: `Fail` pending focused failure-origin review; `87%` final confidence.
- Fresh repository evidence: `/tmp/runtime-specific-carpenter-prompt-focused-vitest.log` (5 files / 56 tests), `/tmp/runtime-specific-carpenter-prompt-integration.log` (3 files / 19 tests), `/tmp/runtime-specific-carpenter-prompt-build-typecheck.log` (exit 0), `/tmp/runtime-specific-carpenter-prompt-package-typecheck.log` (pre-existing TS6059 limitation), and `/tmp/runtime-specific-carpenter-prompt-provider-gates.log` (4 fake tests passed, 21 provider tests skipped).
- Fresh native live evidence: `/tmp/runtime-specific-carpenter-prompt-native-restore.log`, `/tmp/runtime-specific-carpenter-prompt-native-write.log`, and `/tmp/runtime-specific-carpenter-prompt-team-restore.log` all passed their targeted journeys.
- Failure evidence: `/tmp/runtime-specific-carpenter-prompt-native-factory-lmstudio.log` records the explicit model-ID environment mismatch; `/tmp/runtime-specific-carpenter-prompt-native-factory-lmstudio-rerun.log` records successful model discovery/materialization followed by `backend.subscribeToEvents is not a function` at fixture lines 252/340/402 and an obsolete relative artifact-path assertion at line 553.
- Cleanup evidence: `/tmp/runtime-specific-carpenter-prompt-lms-load.log`, `/tmp/runtime-specific-carpenter-prompt-lms-unload.log`, and `/tmp/runtime-specific-carpenter-prompt-lms-ps-after.log`; no model remains loaded.
- New or remaining failure IDs: `NATIVE-FACTORY-LIVE-001`; preliminary `Local Fix` owned by `api_e2e_engineer`, pending `code_reviewer` confirmation.
- Recommended recipient: `code_reviewer` with handoff type `api_e2e_failure_origin_review`.
  - Remaining risks or untested scope: direct live factory fixture completion, live Claude/Codex provider prompt projection, and full all-provider mixed-team lifecycle remain unproven. No production source or prompt-boundary failure was observed.

### API-REV-002 — Focused native factory rerun after authorized durable-fixture correction

- Date: 2026-08-15
- Triggering role, report path, and round: `code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/tickets/in-progress/runtime-specific-carpenter-prompt/code-review-report.md`; CRR-003; API/E2E round 2.
- Triggering finding or scenario IDs: `NATIVE-FACTORY-LIVE-001` remained failing after its stale backend event/status/path assumptions were corrected.
- Prior result and confidence: `API-REV-001` — `Fail / 87%`; its failure was the pre-correction fixture contract/path failure and is not reused as current evidence.
- Current result and confidence: `Fail / 84%`, pending fresh focused failure-origin review. The corrected fixture passed 3/4 tests; the approval-path write_file test observed `TOOL_EXECUTION_STARTED` followed by `TOOL_EXECUTION_FAILED` and timed out waiting for `TOOL_EXECUTION_SUCCEEDED`.
- Durable coverage change: updated only `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/tests/integration/agent-execution/autobyteus-agent-run-backend-factory.lmstudio.integration.test.ts` as authorized by CRR-003: direct-backend source-event-batch subscriptions with flattening, direct-backend lifecycle phase polling, and canonical realpath projection assertion. The `AgentRun` wrapper APIs remain unchanged.
- Exact rerun command: `env -u LMSTUDIO_MODEL_ID RUN_LMSTUDIO_E2E=1 pnpm --filter autobyteus-server-ts exec vitest run tests/integration/agent-execution/autobyteus-agent-run-backend-factory.lmstudio.integration.test.ts --no-watch`.
- Fresh evidence: `/tmp/runtime-specific-carpenter-prompt-native-factory-lmstudio-api002.log` — 4 tests, 3 passed and 1 failed; `/tmp/runtime-specific-carpenter-prompt-lms-load-api002.log` — owned model load succeeded; `/tmp/runtime-specific-carpenter-prompt-lms-ps-before-api002.log` — no model loaded before setup.
- Fresh classification: `Unclear`, owned by `code_reviewer` for `api_e2e_failure_origin_review`. The stale fixture issue is resolved, but the log does not establish whether the failed tool execution is caused by model/tool input, environment/runtime behavior, or implementation source.
- Proportional review status: deferred. The changed durable fixture must return through proportional review only after a successful rerun; current result routes through focused failure-origin review first.
- Cumulative canonical artifacts:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/tickets/in-progress/runtime-specific-carpenter-prompt/requirements.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/tickets/in-progress/runtime-specific-carpenter-prompt/investigation-notes.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/tickets/in-progress/runtime-specific-carpenter-prompt/design-spec.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/tickets/in-progress/runtime-specific-carpenter-prompt/solution-revision-record.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/tickets/in-progress/runtime-specific-carpenter-prompt/design-review-report.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/tickets/in-progress/runtime-specific-carpenter-prompt/architecture-review-revision-record.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/tickets/in-progress/runtime-specific-carpenter-prompt/implementation-handoff.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/tickets/in-progress/runtime-specific-carpenter-prompt/implementation-revision-record.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/tickets/in-progress/runtime-specific-carpenter-prompt/code-review-report.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/tickets/in-progress/runtime-specific-carpenter-prompt/code-review-revision-record.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/tickets/in-progress/runtime-specific-carpenter-prompt/api-e2e-coverage-investigation.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/tickets/in-progress/runtime-specific-carpenter-prompt/api-e2e-execution-coverage-report.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/tickets/in-progress/runtime-specific-carpenter-prompt/api-e2e-revision-record.md`

### API-REV-003 — One diagnostic approval-path probe and bounded prompt correction

- Date: 2026-08-15
- Triggering role, report path, and round: `solution_designer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/tickets/in-progress/runtime-specific-carpenter-prompt/code-review-report.md`; CRR-004; API/E2E round 3.
- Triggering finding or scenario IDs: `NATIVE-FACTORY-LIVE-001` remained unclear after API-REV-002 because the retained log lacked tool invocation arguments and error details.
- Prior result and confidence: `API-REV-002` — `Fail / 84%`; its corrected fixture passed 3/4 tests but approval-path execution failed without origin details.
- Authorized execution: exactly one temporary reverted diagnostic targeted only `converts approval and tool lifecycle events through the backend event stream`; 1 test failed and 3 were skipped. Evidence: `/tmp/runtime-specific-carpenter-prompt-native-factory-lmstudio-api003-diagnostic.log`.
- Captured origin evidence: `TOOL_EXECUTION_STARTED` sent `write_file` with `path: "approval-flow-test.txt"` and exact `content: "line one\\nline two"`, but omitted `base_dir`. `TOOL_LOG` captured `[TOOL_EXCEPTION]` requiring an explicit absolute base_dir for relative paths; projected `ERROR` had source `ToolExecution.Exception.write_file` and matching details; `TOOL_EXECUTION_FAILED` carried the same error.
- Classification: `Local Fix` owned by `api_e2e_engineer`; invalid model arguments are proven under the authoritative write_file contract. No source defect is inferred.
- Durable correction: updated only the first approval-path fixture prompt to explicitly provide relative path, absolute `workspaceDir` as `base_dir`, and exact content. The temporary diagnostic logging was reverted; the CRR-003 contract corrections remain. No production source, prompt composer, compatibility behavior, or boundary changed.
- Current result and confidence: `Fail / 85%`. The corrected prompt has not been runtime-rerun; do not claim it green. Route the changed fixture through proportional durable-test review now.
- Cleanup evidence: `/tmp/runtime-specific-carpenter-prompt-lms-unload-api003.log` and `/tmp/runtime-specific-carpenter-prompt-lms-ps-after-api003.log`; model unloaded and no models remain loaded.
- Proportional review recipient: `code_reviewer` with `api_e2e_durable_test_proportional_review`.
- Cumulative canonical artifacts:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/tickets/in-progress/runtime-specific-carpenter-prompt/requirements.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/tickets/in-progress/runtime-specific-carpenter-prompt/investigation-notes.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/tickets/in-progress/runtime-specific-carpenter-prompt/design-spec.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/tickets/in-progress/runtime-specific-carpenter-prompt/solution-revision-record.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/tickets/in-progress/runtime-specific-carpenter-prompt/design-review-report.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/tickets/in-progress/runtime-specific-carpenter-prompt/architecture-review-revision-record.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/tickets/in-progress/runtime-specific-carpenter-prompt/implementation-handoff.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/tickets/in-progress/runtime-specific-carpenter-prompt/implementation-revision-record.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/tickets/in-progress/runtime-specific-carpenter-prompt/code-review-report.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/tickets/in-progress/runtime-specific-carpenter-prompt/code-review-revision-record.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/tickets/in-progress/runtime-specific-carpenter-prompt/api-e2e-coverage-investigation.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/tickets/in-progress/runtime-specific-carpenter-prompt/api-e2e-execution-coverage-report.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/tickets/in-progress/runtime-specific-carpenter-prompt/api-e2e-revision-record.md`

### API-REV-004 — Authorized focused native factory rerun after proportional test review

- Date: 2026-08-15
- Triggering role, report path, and round: `code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/tickets/in-progress/runtime-specific-carpenter-prompt/api-e2e-test-review-report.md`; CRR-005; API/E2E round 4.
- Triggering scenario: `NATIVE-FACTORY-LIVE-001` required runtime proof after the CRR-005-reviewed first approval-path prompt correction.
- Prior result and confidence: `API-REV-003` — `Fail / 85%`; one authorized diagnostic proved the model omitted the required absolute `base_dir` for a relative `write_file` path. That diagnostic is retained as failure-origin evidence and is not reused as the current result.
- Authorized rerun command: `env -u LMSTUDIO_MODEL_ID RUN_LMSTUDIO_E2E=1 pnpm --filter autobyteus-server-ts exec vitest run tests/integration/agent-execution/autobyteus-agent-run-backend-factory.lmstudio.integration.test.ts --no-watch`.
- Current result and confidence: `Pass / 93%`. Fresh result: 1 file / 4 tests passed. The live native factory materialized four tools and passed approval/write_file execution and side-effect assertions, denied approval, auto-execution, publish-artifact projection, completion/idle, restore/follow-up, and teardown behavior.
- Durable coverage state: no test edit occurred after CRR-005. CRR-003 source-event-batch/lifecycle/path corrections and the CRR-004-authorized explicit `base_dir`/content prompt correction remain the only API/E2E fixture changes. CRR-005 proportional durable-test review is Pass.
- Failure-origin resolution: the prior failure remains classified as `Resolved Local Fix` owned by `api_e2e_engineer`; the diagnostic's missing `base_dir` was invalid model input under the authoritative `write_file` contract. API-REV-004 produced no new failure. No production source, prompt composer, compatibility alias/fallback, auto-approval behavior, or AgentRun/backend boundary changed.
- Cleanup evidence: `/tmp/runtime-specific-carpenter-prompt-lms-load-api004.log`, `/tmp/runtime-specific-carpenter-prompt-lms-unload-api004.log`, and `/tmp/runtime-specific-carpenter-prompt-lms-ps-after-api004.log`; the owned model was loaded for the run, unloaded afterward, and `lms ps` reported no models. The suite cleaned live runs/sockets and isolated test state.
- External-runtime isolation: live Claude/Codex wire execution remains `Not Tested` because explicit safe provider gates/authentication were unavailable. Fake Claude characterization passed and is recorded in the execution report; no live provider result is inferred.
- Canonical artifacts updated:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/tickets/in-progress/runtime-specific-carpenter-prompt/api-e2e-coverage-investigation.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/tickets/in-progress/runtime-specific-carpenter-prompt/api-e2e-execution-coverage-report.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/tickets/in-progress/runtime-specific-carpenter-prompt/api-e2e-revision-record.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/tickets/in-progress/runtime-specific-carpenter-prompt/api-e2e-test-review-report.md`
- Fresh final evidence: `/tmp/runtime-specific-carpenter-prompt-native-factory-lmstudio-api004.log`; cleanup evidence is listed above.
- Next recipient: `delivery_engineer` for integrated-state refresh, documentation/no-impact handling, and final handoff. The cumulative package is the requirements doc, investigation notes, design spec, design review report, implementation handoff, code review report, coverage investigation, execution coverage report, and CRR-005 proportional test-review report.
