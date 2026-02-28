# Code Review

- Stage: `8`
- Date: `2026-02-28`
- Decision: `Pass`

## Review Scope

- Runtime registration/capability/model-catalog changes for `claude_agent_sdk`
- Runtime-neutral streaming and command-ingress decoupling
- Team external-member runtime orchestration and routing
- Run-history/projection updates and web runtime option wiring

## Findings

### Resolved During Verification

1. `getAgentStreamHandler` was constructing with an undefined codex runtime dependency instead of the external runtime event source registry.
   - Fixed in: `autobyteus-server-ts/src/services/agent-streaming/agent-stream-handler.ts`
2. Team relay unit tests used member bindings without `runtimeKind`, which hid the new relay guard behavior.
   - Fixed in: `autobyteus-server-ts/tests/unit/agent-team-execution/team-member-runtime-orchestrator.test.ts`
3. `TeamRunHistoryService` introduced external-member active checks but singleton wiring did not inject orchestrator by default.
   - Fixed in: `autobyteus-server-ts/src/run-history/services/team-run-history-service.ts`
   - Guarded by test: `autobyteus-server-ts/tests/unit/run-history/team-run-history-service.test.ts`
4. Full backend-suite re-run exposed stale fixture shape in `team-run-continuation-service` unit test (missing canonical team/member runtime fields), causing incorrect branch selection.
   - Fixed in: `autobyteus-server-ts/tests/unit/run-history/team-run-continuation-service.test.ts`
5. Claude runtime stream delta normalization trimmed whitespace, collapsing tokenized output (`"Hello "` + `"world"` -> `"Helloworld"`).
   - Fixed in: `autobyteus-server-ts/src/runtime-execution/claude-agent-sdk/claude-agent-sdk-runtime-service.ts`
   - Guarded by test: `autobyteus-server-ts/tests/unit/runtime-execution/claude-agent-sdk/claude-agent-sdk-runtime-service.test.ts`
6. Claude runtime query resume option previously used boolean `true`, which causes Claude CLI transport exit code 1 on live runs.
   - Fixed in: `autobyteus-server-ts/src/runtime-execution/claude-agent-sdk/claude-agent-sdk-runtime-service.ts`
   - Guarded by tests:
     - `autobyteus-server-ts/tests/unit/runtime-execution/claude-agent-sdk/claude-agent-sdk-runtime-service.test.ts` (first turn no resume, second turn resume uses session id string)
     - `autobyteus-server-ts/tests/e2e/runtime/claude-runtime-graphql.e2e.test.ts` (live send/terminate pass)
7. Team external-member session restoration treated placeholder `memberRunId` as a completed turn, causing first send to incorrectly resume Claude with an invalid session id.
   - Fixed in: `autobyteus-server-ts/src/runtime-execution/claude-agent-sdk/claude-agent-sdk-runtime-service.ts` (`restoreRunSession` completed-turn detection tightened)
   - Guarded by tests:
     - `autobyteus-server-ts/tests/unit/runtime-execution/claude-agent-sdk/claude-agent-sdk-runtime-service.test.ts`
     - `autobyteus-server-ts/tests/e2e/runtime/claude-team-external-runtime.e2e.test.ts`
8. Team member orchestrator did not persist refreshed external runtime references after member sends, risking stale continuation pointers.
   - Fixed in: `autobyteus-server-ts/src/agent-team-execution/services/team-member-runtime-orchestrator.ts`
   - Guarded by tests:
     - `autobyteus-server-ts/tests/unit/agent-team-execution/team-member-runtime-orchestrator.test.ts`
     - `autobyteus-server-ts/tests/e2e/runtime/claude-team-external-runtime.e2e.test.ts`

### Open Findings

- None.

## Required Checks

- Decoupling boundary check: `Pass` (external-runtime abstractions introduced and consumed across stream/ingress paths)
- No backward-compatibility dead paths introduced: `Pass` (compat wrappers remain intentional and thin)
- No legacy retention in new integration path: `Pass`
- Codex-vs-Claude live E2E parity gate: `Pass` (`13` Codex tests == `13` Claude tests)
