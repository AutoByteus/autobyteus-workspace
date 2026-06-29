# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-runtime-system-task-notification-duplicate/tickets/in-progress/autobyteus-runtime-system-task-notification-duplicate/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-runtime-system-task-notification-duplicate/tickets/in-progress/autobyteus-runtime-system-task-notification-duplicate/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-runtime-system-task-notification-duplicate/tickets/in-progress/autobyteus-runtime-system-task-notification-duplicate/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-runtime-system-task-notification-duplicate/tickets/in-progress/autobyteus-runtime-system-task-notification-duplicate/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-runtime-system-task-notification-duplicate/tickets/in-progress/autobyteus-runtime-system-task-notification-duplicate/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-runtime-system-task-notification-duplicate/tickets/in-progress/autobyteus-runtime-system-task-notification-duplicate/code-review-report.md`
- Current Investigation Round: 2
- Trigger: User challenged the initial live-gated E2E skip and requested enabled E2E execution.
- Prior Investigation Reviewed: Round 1 concluded existing durable coverage was adequate and live E2E was skipped because flags were unset. That conclusion is superseded for the live mixed task-delegation E2E path.
- Latest Authoritative Investigation: Round 2

## Current Requirement And Design Basis

The approved behavior remains one live user-visible notification surface for server-owned task-delegation work packets and lifecycle notifications. The model/runtime must still receive the full task packet and lifecycle protocol. AutoByteus must not emit its extra generic `SenderType.SYSTEM` runtime `SYSTEM_TASK_NOTIFICATION` for stamped server-owned task-delegation messages, and `MixedAgentMemberHandle` must suppress the plain `MEMBER_INPUT_MESSAGE` echo for those stamped system task messages. Ordinary user messages and inter-agent deliveries must continue to emit `MEMBER_INPUT_MESSAGE`. Runtime-neutral local `SYSTEM_TASK_NOTIFICATION` events remain valid. Durable history notification replay remains out of scope.

The implementation handoff's `Legacy / Compatibility Removal Check` remains clean: no compatibility wrapper, no legacy old-behavior retention, no frontend content dedupe, no global AutoByteus system-notification disabling, and no stale old path intentionally retained.

## Changed Behavior Summary

| Behavior / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Task-delegation activation work packets are stamped as task-delegation system task notifications and AutoByteus suppression candidates. | Added / Changed | REQ-001, REQ-003, REQ-005; DS-001/DS-002; implementation handoff. | Durable and live coverage must verify the target still receives the task packet while the UI sees one surface. |
| Result-submitted and revision-requested notifications are stamped with the same single-surface policy. | Added / Changed | REQ-001, UC-004; design migration step 5. | Durable and live coverage must verify lifecycle notifications use one notification surface and remain model-visible. |
| `MixedAgentMemberHandle` projects accepted stamped task-delegation system messages as local `SYSTEM_TASK_NOTIFICATION` and suppresses member-input echo. | Changed / Removed old duplicate surface | REQ-001, REQ-004; DS-002/DS-003. | Live E2E should assert no duplicate `MEMBER_INPUT_MESSAGE` for activation/revision packets. |
| AutoByteus `AgentInputPipeline` suppresses only its generic system-task notifier when explicit metadata requests suppression. | Changed | REQ-002, REQ-003, REQ-006; DS-004. | Live E2E with an AutoByteus coordinator should assert result-submitted notification is not duplicated. |
| Ordinary user/inter-agent messages remain `MEMBER_INPUT_MESSAGE`. | Preserved | REQ-004, AC-004. | Existing durable mapper/builder/web tests remain valid. |
| Live AutoByteus + DeepSeek task-tool execution needs deterministic tool calls. | Changed coverage understanding | AC-001/AC-003/AC-007; enabled E2E evidence. | Existing live E2E must disable DeepSeek V4 thinking when it also requires `tool_choice: "required"`; otherwise DeepSeek rejects the request before task delegation. |
| Existing mixed task-delegation E2E approval wait windows were too narrow for live event ordering. | Changed coverage understanding | Enabled E2E evidence: `review_task_result` approval request was visible in the socket preview but outside the wait window anchored after the submitted event. | Update durable E2E harness to start review-approval waits after submit-success events so valid early approval requests are not missed. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/tests/unit/agent/pipelines/agent-input-pipeline.test.ts` | AutoByteus system inputs emit generic system-task notification unless explicit suppression metadata is present; suppressed inputs still run processors and reach LLM content. | REQ-002, REQ-003, REQ-006; DS-004. | Still Valid | Directly covers the AutoByteus duplicate source. | Re-run focused runtime coverage. |
| `autobyteus-server-ts/tests/unit/agent-team-execution/task-delegation-service.test.ts` | Task-agent/team work packets and result/revision notifications carry task-delegation and suppression metadata while preserving content/identity. | REQ-001, REQ-002, REQ-005; AC-003. | Still Valid | Direct constructor/stamping coverage. | Re-run focused server coverage. |
| `autobyteus-server-ts/tests/unit/agent-team-execution/mixed-agent-member-handle-task-notification-projection.test.ts` | Stamped system task messages emit one `SYSTEM_TASK_NOTIFICATION` and no `MEMBER_INPUT`; ordinary user messages still emit `MEMBER_INPUT`. | REQ-001, REQ-004; DS-002/DS-003/DS-005. | Still Valid | Direct accepted-projection boundary. | Re-run focused server coverage. |
| `autobyteus-web/services/agentStreaming/__tests__/TeamStreamingService.spec.ts` and `AgentStreamingService.spec.ts` | Web renders protocol-level `SYSTEM_TASK_NOTIFICATION` and preserves member-input routing/upsert behavior. | REQ-004, REQ-006, AC-005. | Still Valid | Web remains renderer only. | Re-run focused web coverage. |
| `autobyteus-server-ts/tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts` | Fake-backend integration covers `delegate_task -> submit_task_result -> review_task_result`, task-team target ingress, revision, settlement, cleanup, and sequential task-team delegation. | REQ-002, REQ-005, REQ-007; AC-003. | Still Valid | Proves lifecycle semantics without external LLM flakiness. | Re-run integration coverage. |
| Server stream mapper/builder/converter unit tests listed in Round 1 | Preserve WebSocket mapping for member input, task delegation identity, and system task notifications. | REQ-004, REQ-005, REQ-006. | Still Valid | Supports ordinary-message and transport invariants. | Re-run focused server coverage. |
| `autobyteus-server-ts/tests/e2e/runtime/mixed-task-delegation.e2e.test.ts` | Live AutoByteus coordinator + Codex task-agent delegation/revision cycle. | REQ-001, REQ-002, REQ-007; partial AC-001/AC-003/AC-007. | Needs Update | With `RUN_MIXED_TASK_DELEGATION_E2E=1` the suite executed, not skipped. Default run timed out waiting for `delegate_task`; DeepSeek run failed with `400 Thinking mode does not support this tool_choice`; DeepSeek-thinking-disabled temporary probe progressed through delegate, submit, and result notification but missed an early `review_task_result` approval request due the wait anchor. The test also lacked explicit single-notification-surface assertions. | Update durable E2E harness: conditional DeepSeek V4 thinking disablement for required tool choice, wider review approval wait anchors, and live assertions for one `SYSTEM_TASK_NOTIFICATION` plus no `MEMBER_INPUT_MESSAGE` echo. Then run enabled E2E. |
| `autobyteus-server-ts/tests/e2e/runtime/all-runtime-send-message-matrix.e2e.test.ts` | Live multi-runtime inter-agent `send_message_to` projection. | REQ-004; AC-004. | Still Valid but environment-gated | Supporting ordinary inter-agent coverage; not specific to task-delegation notification duplication. | Retain; run only when relevant runtime flags are intentionally enabled. |
| Exact browser UI Nested Classroom task-team scenario (`Teacher` -> `StudentStudyGroup`/`student_one`). | Manual/live UI reproduction of the original screenshot. | AC-001, AC-002. | Still not encoded as durable automated coverage | The current automated E2E is task-agent, not the exact task-team UI path. It now directly covers live AutoByteus+DeepSeek task-tool notification surfaces, but not the browser UI scenario. | Record residual manual/UI validation gap unless a separate browser E2E harness is requested. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| N/A | N/A | No relevant durable coverage intentionally asserts the old duplicate `MEMBER_INPUT_MESSAGE` plus `SYSTEM_TASK_NOTIFICATION` behavior. | Code review found no retained old-behavior path. | N/A | N/A |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| APIE2E-LIVE-001 | Live mixed task-delegation notification surfaces for activation, result-submitted, and revision-requested packets. | REQ-001, REQ-002, REQ-004, AC-001/AC-003/AC-007. | Update existing `autobyteus-server-ts/tests/e2e/runtime/mixed-task-delegation.e2e.test.ts`. | Enabled E2E is the closest automated live runtime boundary and should now explicitly guard against the duplicate surface. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| APIE2E-LIVE-001 | `autobyteus-server-ts/tests/e2e/runtime/mixed-task-delegation.e2e.test.ts` | Add conditional `extra_params.thinking_type="disabled"` when DeepSeek V4 is selected with `tool_choice="required"`; anchor revision/accept review approval waits after worker submit-success events; assert each stamped task packet has exactly one `SYSTEM_TASK_NOTIFICATION` and zero matching `MEMBER_INPUT_MESSAGE` events. | REQ-001, REQ-002, REQ-004; AC-001/AC-003/AC-007. | This is a durable coverage change after code review; if execution passes, route back to `code_reviewer` before delivery. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| N/A | No stale relevant durable coverage identified. | N/A | N/A |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| APIE2E-TEMP-001 | Existing focused runtime/server/web/unit/integration commands. | Reviewed implementation still passes durable owner-boundary coverage. | Commands are execution evidence only. |
| APIE2E-TEMP-002 | Enabled live E2E with `RUN_MIXED_TASK_DELEGATION_E2E=1` and then `LMSTUDIO_MODEL_ID=deepseek-v4-flash`. | Revealed live DeepSeek and approval-window issues. | Temporary command probes; durable learning is captured in the E2E test update. |
| APIE2E-TEMP-003 | Temporary copied E2E file with DeepSeek thinking disabled. | Verified the DeepSeek request can progress through delegate, worker submit, and result-submitted notification when thinking is disabled. | Removed; the durable update belongs in the existing E2E file. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Exact browser UI Nested Classroom task-team scenario with `Teacher`, `StudentStudyGroup`, `student_one`, and geometry result `15 cm`, `54 cm²`, `36 cm`. | No existing browser/UI E2E harness encodes this exact scenario. | Residual product confidence risk for the exact screenshot path. | Record as residual manual/browser validation unless a separate UI E2E task is requested. |
| Equivalent live Claude task-team duplicate check. | Current enabled path uses AutoByteus coordinator plus Codex task-agent; separate Claude live path remains a broader runtime matrix concern. | Residual live runtime confidence risk. | Existing all-runtime matrix remains environment-gated supporting coverage. |
| Durable run-history purple notification replay. | Explicitly out of scope by approved requirements/design. | Historical refresh may not reconstruct the purple notification component. | Separate design if desired. |

## Ambiguities Or Reroute Triggers

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| N/A | N/A | After durable E2E harness/config update, enabled live AutoByteus+DeepSeek mixed task-delegation E2E passed. | N/A |

## Execution Plan

1. Update `mixed-task-delegation.e2e.test.ts` as described above.
2. Re-run focused source/build and durable unit/integration/web coverage affected by the implementation and E2E update.
3. Run enabled live mixed task-delegation E2E with DeepSeek selected: `RUN_MIXED_TASK_DELEGATION_E2E=1 LMSTUDIO_MODEL_ID=deepseek-v4-flash pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/mixed-task-delegation.e2e.test.ts --testTimeout 600000 --hookTimeout 600000`.
4. Update the execution coverage report with latest authoritative result.
5. Because repository-resident durable coverage is now changed after code review, route to `code_reviewer` on pass. If the live E2E still fails, classify and route to the correct owner.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: The initial skipped-live conclusion is superseded. Live E2E was enabled and exposed a valid need to update durable live coverage. Because repository-resident durable E2E coverage changed after the original code review, a passing final execution must return through `code_reviewer` before delivery.
