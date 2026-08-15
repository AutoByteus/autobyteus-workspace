# API/E2E Revision Record

## API-REV-001

- Date: 2026-08-14
- Prior result: N/A (initial API/E2E revision record)
- Prior confidence: N/A (no prior API/E2E result or confidence record exists)
- Trigger: CRR-004 Local Fix followed by mandatory API/E2E execution
- Coverage investigation: /Users/normy/autobyteus_org/autobyteus-worktrees/agent-runtime-default-core-tools/autobyteus-server-ts/tickets/done/agent-runtime-default-core-tools/api-e2e-coverage-investigation.md
- Execution report: /Users/normy/autobyteus_org/autobyteus-worktrees/agent-runtime-default-core-tools/autobyteus-server-ts/tickets/done/agent-runtime-default-core-tools/api-e2e-execution-coverage-report.md
- Result: Fail — focused failure-origin review required
- Current confidence: 89% applicable-category average; clean Pass target not met

### Validation delta

- Repository baseline: focused native/neutral/mixed/prompt coverage passed (6 files / 29 tests), corrected native factory lifecycle passed (4 tests), corrected orchestration passed (3 files / 23 tests), build-scoped typecheck passed, and diff hygiene passed.
- Live standalone delta: LM Studio qwen/qwen3.6-35b-a3b passed API-NATIVE-DEFAULT-001 through GraphQL create with empty toolNames, websocket approval, default run_bash execution, workspace side effect, and cleanup. Existing native create/restore and explicit approval lifecycle also passed.
- Live team delta: first team write_file approval/execution passed, but the model issued a second unapproved run_bash verification call. The existing test timed out waiting for assistant completion before terminate/restore continuation. This failure is routed to code_reviewer; no implementation defect is inferred.
- Provider delta: Claude/Codex live isolation remains Not Tested because no safe credentials or explicit live provider flags were available.
- Durable coverage delta: added API-NATIVE-DEFAULT-001; corrected stale native factory and manager test fixtures. All changed durable test code awaits proportional code review after failure-origin classification.

### Evidence

- Focused repository output: /tmp/agent-runtime-default-core-tools-focused-vitest.log
- Native factory integration output: /tmp/agent-runtime-default-core-tools-native-integration-fixed2.log
- Orchestration integration output: /tmp/agent-runtime-default-core-tools-orchestration-integration-fixed.log
- Native API default output: /tmp/agent-runtime-default-core-tools-api-native-default.log
- Native API lifecycle output: /tmp/agent-runtime-default-core-tools-api-native-lifecycle.log
- Team API failure output: /tmp/agent-runtime-default-core-tools-api-team-lifecycle.log
- LM Studio model load output: /tmp/agent-runtime-default-core-tools-lms-load.log
- Package typecheck output: /tmp/agent-runtime-default-core-tools-typecheck.log
- Build-scoped typecheck output: /tmp/agent-runtime-default-core-tools-build-typecheck.log

### Handoff

- Recipient: code_reviewer
- Handoff type: api_e2e_failure_origin_review
- Required reviewer action: classify team failure origin and decide whether a bounded durable fixture/configuration correction is needed; do not add production compatibility aliases or collapse backend/team boundaries.

## API-REV-002

- Date: 2026-08-14
- Prior result: API-REV-001 Fail — focused failure-origin review required
- Prior confidence: 89%
- Trigger: CRR-005 FO-004 Local Fix assigned after team failure
- Coverage investigation: /Users/normy/autobyteus_org/autobyteus-worktrees/agent-runtime-default-core-tools/autobyteus-server-ts/tickets/done/agent-runtime-default-core-tools/api-e2e-coverage-investigation.md
- Execution report: /Users/normy/autobyteus_org/autobyteus-worktrees/agent-runtime-default-core-tools/autobyteus-server-ts/tickets/done/agent-runtime-default-core-tools/api-e2e-execution-coverage-report.md
- Result: Pass with residual provider-isolation Not Tested evidence
- Current confidence: 93% applicable-category average; clean-confidence target not met
- Review route: code_reviewer proportional durable-test review before delivery

### Rerun delta and failure resolution

- Updated the durable native team fixture to assert the expected second run_bash cat verification against the created file, approve only that invocation, require its execution success and assistant completion, and fail on unexpected additional worker approvals.
- Added explicit isolated workspace base_dir to make the relative write_file call deterministic.
- Added target_member_route_key: worker to the restored team follow-up because the current SEND_MESSAGE API requires an explicit member route.
- Focused rerun command passed: 1 test passed / 4 provider-gated tests skipped in 24.46s.
- The prior FO-004 failure is resolved. No production source or compatibility alias changed.
- Build-scoped source typecheck passed (exit 0); diff check passed.
- LM Studio owned model was unloaded after execution.

### Evidence

- Successful team rerun: /tmp/agent-runtime-default-core-tools-api-team-lifecycle-fixed4.log
- Prior failure: /tmp/agent-runtime-default-core-tools-api-team-lifecycle.log
- Intermediate rerun diagnostics: /tmp/agent-runtime-default-core-tools-api-team-lifecycle-fixed.log, /tmp/agent-runtime-default-core-tools-api-team-lifecycle-fixed2.log, /tmp/agent-runtime-default-core-tools-api-team-lifecycle-fixed3.log
- Build-scoped typecheck: /tmp/agent-runtime-default-core-tools-build-typecheck-rerun.log
- Diff check: /tmp/agent-runtime-default-core-tools-diff-check-rerun.log
- Existing standalone and repository evidence remains listed in API-REV-001.

### Handoff

- Recipient: code_reviewer
- Handoff type: api_e2e_durable_test_proportional_review
- Required reviewer action: review the changed durable test paths for structure, clarity, determinism, reuse, and requirement alignment; do not reopen the implementation scorecard or infer a source finding from the prior FO-004 failure.

## API-REV-003

- Date: 2026-08-14
- Prior result: API-REV-002 Pass with residual provider-isolation Not Tested evidence (historical)
- Prior confidence: 93% (historical; not reused as current evidence)
- Trigger: `IR-002` fresh API/E2E request after `CRR-007` source-review Pass for commit `20dc45738`
- Coverage investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-runtime-default-core-tools/autobyteus-server-ts/tickets/done/agent-runtime-default-core-tools/api-e2e-coverage-investigation.md`
- Execution report: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-runtime-default-core-tools/autobyteus-server-ts/tickets/done/agent-runtime-default-core-tools/api-e2e-execution-coverage-report.md`
- Result: `Pass` for the reviewed native API/E2E boundary, with Claude/Codex live provider isolation explicitly `Not Tested`
- Current confidence: `94%` applicable-category average (exact average 93.5%, rounded); clean 95% target not met
- Review route: `code_reviewer` proportional durable-test review before delivery

### Fresh validation delta

- Fresh repository evidence: focused native/neutral/mixed/prompt suites passed 6 files / 29 tests; native factory integration passed 1 file / 4 tests and showed DummyLLM plus 4 tools on create/restore; orchestration passed 3 files / 23 tests; build-scoped typecheck passed; package typecheck reproduced the known pre-existing TS6059 limitation; diff check passed.
- Fresh standalone evidence: `API-NATIVE-WRITE-DEFAULT-001` passed with GraphQL-created empty `toolNames`, 4 native tools materialized, exact `write_file` approval/path/content payload, successful file side effect, and idle cleanup.
- Fresh lifecycle evidence: `API-NATIVE-LIFECYCLE-002` passed native create/restore continuation and normalized approval lifecycle.
- Fresh team evidence: `API-TEAM-WRITE-RESTORE-001` passed with empty member definitions, 6 worker tools (four foundation plus two team tools), approved `write_file`, expected `run_bash cat` verification, completion/idle, terminate/restore, and worker-routed follow-up.
- External isolation evidence: Claude/Codex gated run skipped 8 and 12 tests because explicit live flags were unset; neutral-helper isolation passed. No live provider pass is claimed.
- Fresh cleanup evidence: the owned LM Studio model was unloaded and post-cleanup `lms ps` reported no models; live suites closed sockets and removed owned temporary data.
- Fresh logs are under `/tmp/agent-runtime-default-core-tools-ir002-*`; historical API-REV-001/API-REV-002 logs were not used as final evidence.

### Prior failure resolution

| Prior Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence |
| --- | --- | --- | --- |
| API-REV-001 / FO-004 expected second team `run_bash` verification | Local Fix to durable team fixture; source not implicated | Rechecked fresh after committed fixture update; write, verification, completion, restore, and follow-up all passed | `/tmp/agent-runtime-default-core-tools-ir002-team.log` |
| CRR-002/003 stale native factory fixture contracts | Local Fix to durable fixtures; source not implicated | Rechecked fresh current `createLLM` and `getLifecycleSnapshot().phase` path; 4/4 passed | `/tmp/agent-runtime-default-core-tools-ir002-native-integration.log` |
| CRR-004 stale manager test double contract | Local Fix to durable test double; source not implicated | Rechecked fresh lifecycle/source-event orchestration path; 23/23 passed | `/tmp/agent-runtime-default-core-tools-ir002-orchestration.log` |

- Durable coverage delta: no new API/E2E source edit was made during this round; the reviewed committed standalone/team/integration durable tests were freshly executed and remain required for proportional review.
- Non-fatal observations retained as residual evidence: the generic standalone lifecycle log includes one model-driven `write_file` failure before a later successful retry, and lifecycle/team logs include token-usage idempotency warnings. Final assertions and cleanup passed; no source failure was inferred.
- Canonical artifacts updated: coverage investigation, execution coverage report, and this revision record.

### Handoff

- Recipient: `code_reviewer`
- Handoff type: `api_e2e_durable_test_proportional_review`
- Required reviewer action: review the four changed durable test paths for structure, clarity, determinism, reuse, and requirement alignment; do not reopen the CRR-007 implementation scorecard or treat historical fixture failures as current source findings.
- Changed durable test paths:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-runtime-default-core-tools/autobyteus-server-ts/tests/e2e/runtime/agent-runtime-graphql.e2e.test.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-runtime-default-core-tools/autobyteus-server-ts/tests/e2e/runtime/autobyteus-team-runtime-graphql.e2e.test.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-runtime-default-core-tools/autobyteus-server-ts/tests/integration/agent-execution/autobyteus-agent-run-backend-factory.integration.test.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-runtime-default-core-tools/autobyteus-server-ts/tests/integration/agent-execution/agent-run-manager.integration.test.ts`

## API-REV-004

- Date: 2026-08-14
- Prior result: API-REV-003 Pass for the fresh broad native boundary, followed by proportional-review `FAIL` for `TEST-IR002-001`.
- Prior confidence: `94%` cumulative applicable-category average; external Claude/Codex isolation remained `Not Tested`.
- Trigger: bounded Local Fix required by `code_reviewer` after proportional durable-test review. The first team approval needed durable assertions for `write_file`, `path`, `base_dir`, and `content`.
- Coverage investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-runtime-default-core-tools/autobyteus-server-ts/tickets/done/agent-runtime-default-core-tools/api-e2e-coverage-investigation.md`
- Execution report: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-runtime-default-core-tools/autobyteus-server-ts/tickets/done/agent-runtime-default-core-tools/api-e2e-execution-coverage-report.md`
- Result: `Pass` for focused API-TEAM-WRITE-RESTORE-001 execution; final delivery status is pending fresh proportional durable-test review.
- Current confidence: `94%` unchanged. This round revalidated the bounded team fixture only and does not claim a new broad execution score; API-REV-003 native evidence remains the cumulative basis.

### Bounded test-only delta

- Updated only `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-runtime-default-core-tools/autobyteus-server-ts/tests/e2e/runtime/autobyteus-team-runtime-graphql.e2e.test.ts`.
- Immediately after the first approval, the test now asserts `payload.tool_name === "write_file"` and exact `path === targetRelativePath`, `base_dir === workspaceRootPath`, and `content === expectedContent`.
- Preserved invocation-specific approval, exact `run_bash cat` verification, restore/follow-up route key, and cleanup behavior.
- No production source, native defaults, prompt contract, compatibility alias, auto-approval behavior, or AgentRun/backend/team boundary changed.

### Focused execution delta

- Exact focused command passed: `RUN_LMSTUDIO_E2E=1 LMSTUDIO_MODEL_ID=qwen/qwen3.6-35b-a3b pnpm --filter autobyteus-server-ts exec vitest run tests/e2e/runtime/autobyteus-team-runtime-graphql.e2e.test.ts --no-watch -t 'creates a real team, approves a tool call, restores it, and continues on the same websocket'`.
- Result: 1 targeted test passed / 4 provider-gated tests skipped; duration 44.78s.
- Fresh log: `/tmp/agent-runtime-default-core-tools-ir002-team-assertion-fix.log`.
- Patch hygiene log: `/tmp/agent-runtime-default-core-tools-ir002-team-assertion-fix-diff-check.log`.
- Cleanup logs: `/tmp/agent-runtime-default-core-tools-ir002-team-assertion-fix-lms-load.log`, `/tmp/agent-runtime-default-core-tools-ir002-team-assertion-fix-lms-unload.log`, `/tmp/agent-runtime-default-core-tools-ir002-team-assertion-fix-lms-ps-after.log`.
- Cleanup result: owned model unloaded; post-run `lms ps` reported no models loaded.
- Failure-origin classification: no fresh failure. `TEST-IR002-001` was a durable assertion gap only; no implementation finding or scorecard change is warranted.

### Handoff

- Recipient: `code_reviewer`
- Handoff type: `api_e2e_durable_test_proportional_review`
- Required reviewer action: perform fresh proportional review of the bounded first-approval payload assertions and then route to delivery if passed. Do not reopen the CRR-007 implementation scorecard or infer a production finding from the prior review gap.
