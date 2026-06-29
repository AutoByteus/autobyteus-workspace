# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/home/autobyteus/workspace/autobyteus-workspace/tickets/done/claude-code-process-start-failure/requirements.md`
- Investigation Notes: `/home/autobyteus/workspace/autobyteus-workspace/tickets/done/claude-code-process-start-failure/investigation-notes.md`
- Design Spec: `/home/autobyteus/workspace/autobyteus-workspace/tickets/done/claude-code-process-start-failure/design-spec.md`
- Design Review Report: `/home/autobyteus/workspace/autobyteus-workspace/tickets/done/claude-code-process-start-failure/design-review-report.md`
- Implementation Handoff: `/home/autobyteus/workspace/autobyteus-workspace/tickets/done/claude-code-process-start-failure/implementation-handoff.md`
- Code Review Report: `/home/autobyteus/workspace/autobyteus-workspace/tickets/done/claude-code-process-start-failure/code-review-report.md`
- Current Investigation Round: 3
- Trigger: Code review Round 2 passed; proceeded with API/E2E. Round 3 update adds repository-resident live Claude auto-approve E2E coverage after user clarified on 2026-06-29 that the proof must exercise frontend/WebSocket-visible no-approval behavior for multiple Claude auto-approve use cases, including configured workspace and outside-workspace writes/deletes/shell actions.
- Prior Investigation Reviewed: Rounds 1-2 in this same artifact path.
- Latest Authoritative Investigation: `/home/autobyteus/workspace/autobyteus-workspace/tickets/done/claude-code-process-start-failure/api-e2e-coverage-investigation.md`

## Current Requirement And Design Basis

The approved behavior to prove is:

- Standard Claude Agent SDK launches must not derive Claude provider `permissionMode: "bypassPermissions"` from AutoByteus `autoExecuteTools=true`; provider mode must remain `"default"` unless a future explicit provider-permission feature is separately designed.
- AutoByteus `autoExecuteTools=true` must remain an AutoByteus approval policy and must auto-allow Claude SDK permission callbacks through the `ClaudeSessionToolUseCoordinator`/`canUseTool` boundary.
- `autoExecuteTools=false` must still preserve the normal manual approval lifecycle for permission-sensitive tools.
- Claude process/startup failures must include bounded sanitized stderr diagnostics when the SDK only throws a generic process-exit error.
- Claude terminal result chunks that represent provider/runtime/auth failure (`is_error`, `error`, or auth markers such as `authentication_failed` / `Not logged in · Please run /login`) must emit runtime `ERROR`, not a successful `TURN_COMPLETED`.
- Durable validation must cover representative write, delete, and shell-command permission requests in both a run workspace and a disposable outside-workspace scratch directory, without using `bypassPermissions`, and must keep manual mode gated for at least one outside-scratch permission-sensitive operation.
- Live Claude success still depends on container/root Claude auth and provider availability. Missing/invalid live auth is an environment/setup failure, not an implementation failure, when deterministic mocked/controlled coverage proves the runtime boundary.
- Legacy/compatibility check from the implementation handoff is clean for source: no standard old `autoExecuteTools -> bypassPermissions` path was retained. Delivery still owns stale documentation that mentions `CLAUDE_AGENT_SDK_PERMISSION_MODE=bypassPermissions`.

## Changed Behavior Summary

| Behavior / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Standard Claude session config uses provider `permissionMode: "default"` independent from `autoExecuteTools` | Changed / Removed old mapping | REQ-CLAUDE-START-001, AC-CLAUDE-START-001; design removal plan; implementation handoff "What Changed" | Execute focused config/bootstrap/restore tests and inspect SDK query options in session tests. |
| `autoExecuteTools` is explicit Claude runtime state and coordinator-owned approval policy | Changed | REQ-CLAUDE-START-002/003; design DS-002; implementation handoff | Execute session/coordinator tests for auto/manual approval. |
| Standard `ClaudeSession` always sends a coordinator-backed `canUseTool` callback and no session-level SDK `autoExecuteTools` bypass branch | Changed / Removed old bypass branch | Design ownership map and code-review pass | Execute session harness that asserts `canUseTool` is present and `autoExecuteTools` option is absent. |
| Permission-sensitive write/delete/shell requests inside workspace and outside safe scratch auto-allow under default mode | Added validation behavior | REQ-CLAUDE-START-009, AC-CLAUDE-START-008; 2026-06-29 user clarification | Execute deterministic session harness coverage; no live credential required. |
| Manual mode gates outside-scratch permission-sensitive operation | Added validation behavior | REQ-CLAUDE-START-010, AC-CLAUDE-START-009 | Execute deterministic session harness coverage. |
| Bounded sanitized process stderr diagnostics enrich generic Claude process exits | Added | REQ-CLAUDE-START-004, AC-CLAUDE-START-004; CR-001 resolution | Execute diagnostics helper/session tests, including split-chunk redaction. |
| Terminal SDK auth/error result becomes runtime `ERROR` | Changed | REQ-CLAUDE-START-005/006, AC-CLAUDE-START-005 | Execute session terminal auth-error test. |
| Successful result chunk lifecycle remains successful | Preserved | AC-CLAUDE-START-006; design risk | Execute existing session success lifecycle tests. |
| Live Claude query success | Preserved but environment-dependent | Requirements out of scope for auth setup; residual risk in design/code review | Use a sanitized temporary live startup/auth probe where practical; classify provider/auth/setup failure separately. |
| Docs teaching `CLAUDE_AGENT_SDK_PERMISSION_MODE=bypassPermissions` | Changed downstream, not API/E2E-owned | REQ-CLAUDE-START-008; code-review docs-impact verdict | Record delivery follow-up; do not edit docs in API/E2E stage. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/session/claude-session-config.test.ts` | `resolveClaudePermissionMode` returns the default provider mode for any auto flag; `buildClaudeSessionConfig` stores explicit `autoExecuteTools`. | REQ-001, REQ-002, AC-001 | Still Valid | Current implementation and code-review pass identify this as the config invariant. | Execute in focused suite. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/backend/claude-session-bootstrapper.test.ts` | Team/member Claude bootstrap keeps `autoExecuteTools=true` as AutoByteus approval state while provider mode is `default`. | REQ-001, REQ-002, AC-001, AC-007 | Still Valid | Test builds a member team context and asserts session config/runtime context. | Execute in focused suite. |
| `autobyteus-server-ts/tests/integration/agent-execution/agent-run-manager.integration.test.ts` | Restore path creates Claude runtime state with provider `default` and explicit `autoExecuteTools=true`. | REQ-001, REQ-002, AC-007 | Still Valid | Code review Round 2 passed this test. | Execute in focused suite. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/session/claude-session.test.ts` success lifecycle scenarios | Preserves started/text/token/completed events for successful result chunks. | AC-006 | Still Valid | Existing successful result behavior remains required. | Execute in focused suite. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/session/claude-session.test.ts` auto permission harness | Auto mode asserts `permissionMode: "default"`, no SDK `autoExecuteTools` option, coordinator-backed `canUseTool`, no approval request, and side effects for workspace/outside scratch write/delete/shell. | REQ-002, REQ-009, AC-002, AC-008, AC-010 | Still Valid | Uses test-created directories under `os.tmpdir()` and cleans them up. | Execute in focused suite. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/session/claude-session.test.ts` manual outside-scratch harness | Manual mode asserts outside-scratch permission request emits approval request and does not perform side effect before denial. | REQ-003, REQ-010, AC-003, AC-009, AC-010 | Still Valid | Uses safe outside-scratch directory under `os.tmpdir()` and no sensitive paths. | Execute in focused suite. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/session/claude-session.test.ts` process diagnostics scenario | Split stderr chunks are redacted and actionable root/sudo diagnostic enriches generic process-exit runtime `ERROR`. | REQ-004, AC-004 | Still Valid | CR-001 local fix added split-token coverage. | Execute in focused suite. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/session/claude-session.test.ts` terminal auth/error result scenario | `authentication_failed` / `Not logged in · Please run /login` result emits `ERROR`, no `TURN_COMPLETED`, no assistant message cached. | REQ-005, REQ-006, AC-005 | Still Valid | Directly matches upstream probe finding. | Execute in focused suite. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/session/claude-process-diagnostics.test.ts` | `ClaudeProcessDiagnostics` redacts split Bearer and Anthropic/env-token shapes after chunk concatenation. | REQ-004, AC-004; CR-001 | Still Valid | Code review Round 2 accepted this fix. | Execute in focused suite. |
| `autobyteus-server-ts/tests/unit/runtime-management/claude/client/claude-sdk-client.test.ts` | SDK client forwards `stderr`; prefers explicit `canUseTool`; direct SDK-client fallback auto-allow remains lower-level only. | REQ-002, REQ-004 | Still Valid | Standard session tests assert the run/team path does not use the fallback. | Execute in focused suite. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/session/claude-session-tool-use-coordinator.test.ts` | Coordinator emits normalized auto/manual approval lifecycle decisions. | REQ-002, REQ-003 | Still Valid | Existing coordinator ownership remains required. | Execute in focused suite if focused run has capacity; otherwise covered through session harness. |
| `autobyteus-server-ts/tests/integration/agent-execution/claude-session-manager.integration.test.ts` | Live Claude session manager create/restore/manual/auto/interrupt/terminate flows gated by `RUN_CLAUDE_E2E=1`. | Broader runtime/lifecycle coverage plus live auto/manual tool behavior | Still Valid | User clarified live Claude is configured; run with `RUN_CLAUDE_E2E=1`. | Execute as live integration/E2E-adjacent proof for session manager, manual approval, auto-exec tool turn, interrupt/terminate, and restore after auto-exec. |
| `autobyteus-server-ts/tests/integration/runtime-management/claude/client/claude-sdk-client.integration.test.ts` | Live SDK transport/model/skill/MCP/resume flows gated by `RUN_CLAUDE_E2E=1`. | Broader provider-adapter coverage | Still Valid, environment-gated | Useful live smoke; not required for deterministic bug proof. | Use temporary sanitized live probe instead of full live file unless needed. |
| `autobyteus-server-ts/tests/e2e/runtime/claude-agent-websocket-interrupt-resume.e2e.test.ts` controlled fake-SDK scenarios | WebSocket interrupt/resume and team-targeted follow-up preserve provider session IDs without live Claude. | Broader E2E lifecycle boundary | Out Of Scope | Optional execution during this investigation failed in existing harness paths unrelated to the permission-mode/auto-approval/diagnostics change: agent interrupt waits timed out and the team fake manager lacks the current `postMessageToConversationTarget` interface. Direct Claude session/session-manager interrupt coverage passes. | Do not gate this ticket on this broader stale E2E harness; record the attempted failure in execution report as out-of-scope follow-up evidence. |
| `autobyteus-server-ts/tests/e2e/runtime/claude-team-inter-agent-roundtrip.e2e.test.ts` live team scenarios | Real GraphQL/team launch path and inter-agent Claude runtime roundtrips with Claude Agent SDK team members and `autoExecuteTools=true`, gated by `RUN_CLAUDE_E2E=1`. | AC-007 broader team path | Still Valid | User clarified live Claude is configured; the ping/pong roundtrip scenario is directly relevant to the classroom/team launch path. | Execute the targeted live team roundtrip scenario. |
| Planned `autobyteus-server-ts/tests/e2e/runtime/agent-runtime-graphql.e2e.test.ts` Claude auto-approve permission matrix | Real GraphQL/WebSocket Claude Agent SDK run with `autoExecuteTools=true` performs workspace write, workspace shell/delete, outside-scratch write, and outside-scratch shell/delete without `TOOL_APPROVAL_REQUESTED`. | REQ-002, REQ-009, AC-002, AC-008, AC-010; user follow-up on 2026-06-29 | Add Durable Coverage | Existing live coverage proved manual approval and basic auto-exec workspace write, but not the frontend-visible no-approval matrix across workspace and outside-scratch paths. | Add a live Claude-only E2E test in the existing current runtime GraphQL E2E suite. |
| `README.md`, `autobyteus-server-ts/README.md`, runtime setup docs | Stale guidance mentions `CLAUDE_AGENT_SDK_PERMISSION_MODE=bypassPermissions`. | REQ-008 | Out Of Scope for API/E2E execution; Still delivery-impacting | Code-review docs-impact verdict assigns delivery docs sync/no-impact. | Include in delivery handoff. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| None found during API/E2E coverage investigation. | N/A | N/A | N/A | N/A | N/A |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Added Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| LIVE-E2E-CLAUDE-AUTO-APPROVE-001 | Frontend/WebSocket-visible Claude auto-approve matrix: `autoExecuteTools=true` executes workspace write, workspace shell/delete, outside-scratch write, and outside-scratch shell/delete without emitting `TOOL_APPROVAL_REQUESTED`. | REQ-002, REQ-009, AC-002, AC-008, AC-010; user follow-up on 2026-06-29 | `autobyteus-server-ts/tests/e2e/runtime/agent-runtime-graphql.e2e.test.ts` | This is the live E2E proof the user requested beyond deterministic session harnesses: real GraphQL launch, real WebSocket stream, real Claude SDK, configured workspace plus disposable outside-workspace scratch path, and frontend no-approval assertion. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| None. | N/A | N/A | N/A | No stale or inadequate relevant durable coverage was found that requires API/E2E-stage edits. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| None. | N/A | N/A | N/A |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| TEMP-001 | Sanitized direct live Claude SDK startup/auth probe using `permissionMode: "default"`, a temporary workspace under `/tmp`, bounded timeout, and redacted stderr output. | Confirms the current container/root executable gets past the root-forbidden bypass failure path; if auth/provider fails, captures sanitized environment/setup classification. | Live provider/auth availability is environment-specific; deterministic durable tests already prove code behavior. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Existing `claude-agent-websocket-interrupt-resume.e2e.test.ts` fake WebSocket interrupt harness | Optional execution showed existing harness failures outside this ticket's permission-mode/diagnostics scope; direct session/session-manager interrupt tests pass. | Low for this ticket; possible separate stale E2E maintenance need. | Track separately if broader WebSocket interrupt E2E health is required. |
| Documentation changes | Delivery owns docs sync after integrated branch refresh. | Stale docs could keep teaching bypass mode. | Include docs impact in handoff to delivery. |

## Ambiguities Or Reroute Triggers

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| None at investigation time. | N/A | Upstream requirements/design are explicit; code review passed; no stale required coverage found. | N/A |

## Execution Plan

1. Run focused deterministic implementation/API-boundary coverage:
   - `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-execution/backends/claude/session/claude-session-config.test.ts tests/unit/agent-execution/backends/claude/session/claude-process-diagnostics.test.ts tests/unit/agent-execution/backends/claude/backend/claude-session-bootstrapper.test.ts tests/unit/agent-execution/backends/claude/session/claude-session.test.ts tests/unit/runtime-management/claude/client/claude-sdk-client.test.ts tests/integration/agent-execution/agent-run-manager.integration.test.ts`
2. Run controlled Claude lifecycle/permission owner unit coverage for session manager, coordinator, and tool gating. Optional broader WebSocket/E2E execution is not a gate for this ticket because the existing harness is outside the changed permission-mode scope.
   - `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-execution/backends/claude/session/claude-session-manager.test.ts tests/unit/agent-execution/backends/claude/session/claude-session-tool-use-coordinator.test.ts tests/unit/agent-execution/backends/claude/session/claude-session-tool-gating.test.ts`
3. Run real live Claude execution because this environment is configured:
   - `RUN_CLAUDE_E2E=1 CLAUDE_FLOW_TEST_TIMEOUT_MS=240000 CLAUDE_APPROVAL_STEP_TIMEOUT_MS=60000 pnpm -C autobyteus-server-ts exec vitest run tests/integration/agent-execution/claude-session-manager.integration.test.ts`
   - `RUN_CLAUDE_E2E=1 CLAUDE_FLOW_TEST_TIMEOUT_MS=240000 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/claude-team-inter-agent-roundtrip.e2e.test.ts -t "routes live inter-agent send_message_to ping->pong->ping roundtrip in claude team runtime"`
   - `RUN_CLAUDE_E2E=1 CLAUDE_FLOW_TEST_TIMEOUT_MS=240000 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/agent-runtime-graphql.e2e.test.ts -t "Claude current GraphQL runtime e2e.*creates a run, restores it, and continues streaming on the same websocket"`
   - `RUN_CLAUDE_E2E=1 CLAUDE_FLOW_TEST_TIMEOUT_MS=240000 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/agent-runtime-graphql.e2e.test.ts -t "Claude current GraphQL runtime e2e.*routes tool approval over websocket and streams the normalized tool lifecycle"`
   - `RUN_CLAUDE_E2E=1 CLAUDE_FLOW_TEST_TIMEOUT_MS=300000 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/agent-runtime-graphql.e2e.test.ts -t "Claude current GraphQL runtime e2e.*auto-approves workspace and outside-scratch write/delete/shell operations without frontend approval prompts"`
4. Run source build and diff whitespace check:
   - `pnpm -C autobyteus-server-ts build`
   - `git diff --check`
5. Run TEMP-001 sanitized direct live startup/auth probe with provider `permissionMode: "default"`; classify success, auth/setup failure, or external provider failure separately from deterministic coverage.
6. Remove any temporary probe file/scaffold under `/tmp`.
7. Write the canonical execution coverage report and hand off. Because API/E2E-stage repository-resident durable coverage will be added, pass must route back to `code_reviewer` for coverage-code review before delivery.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: Existing durable coverage added before code-review Round 2 covers the required deterministic behavior. Round 3 adds and executes the live GraphQL/WebSocket Claude auto-approve E2E scenario requested by the user. Live provider/auth failure will be recorded as environment/setup unless deterministic coverage fails.


## Round 2 Live E2E Update

After the initial handoff, the user clarified that Claude Code is correctly configured in this environment and questioned why full live E2E was not run. The investigation decision was first expanded to include targeted live Claude integration and GraphQL/team E2E runs in addition to deterministic coverage. Round 3 supersedes that decision for coverage-code routing because repository-resident live auto-approve E2E coverage is now being added.


## Round 3 Live Auto-Approve E2E Coverage Update

User feedback clarified that the live E2E proof must cover the actual Claude auto-approve user-facing contract, not just deterministic harnesses or single live smoke tests: when `autoExecuteTools=true`, Claude should execute permission-sensitive operations without the frontend/WebSocket stream asking for approval. The added durable E2E scenario must prove both configured-workspace and disposable outside-workspace scratch paths. Because this is repository-resident durable coverage added after code review, successful execution must be routed back to `code_reviewer` before delivery.
