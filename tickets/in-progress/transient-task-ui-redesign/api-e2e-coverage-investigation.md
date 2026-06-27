# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/transient-task-ui-redesign/tickets/in-progress/transient-task-ui-redesign/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/transient-task-ui-redesign/tickets/in-progress/transient-task-ui-redesign/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/transient-task-ui-redesign/tickets/in-progress/transient-task-ui-redesign/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/transient-task-ui-redesign/tickets/in-progress/transient-task-ui-redesign/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/transient-task-ui-redesign/tickets/in-progress/transient-task-ui-redesign/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/transient-task-ui-redesign/tickets/in-progress/transient-task-ui-redesign/code-review-report.md`
- Current Investigation Round: 1
- Trigger: Code review passed and requested API/E2E coverage investigation/execution for transient task UI redesign.
- Prior Investigation Reviewed: N/A
- Latest Authoritative Investigation: Round 1

## Current Requirement And Design Basis

The reviewed requirements and design require a clean ownership split for transient delegated task runs:

- Left workspace navigation remains stable and does not render transient task-agent, task-team, or task-team-child projection rows.
- Center team workspace remains focused conversation/event content and no longer renders the center `TeamActiveTaskExecutionsBar` active-task strip.
- Right-side Team tab owns delegated task visibility through a top-level `Active Tasks` section next to `Messages`.
- Active task rows show task-agent/task-team identity, task/run disambiguation, status, simple delegated task details, target, `Task ID`, and explicit `Agent run ID` / `Agent team run ID` labels; they must not use `Runtime` or expose task-team phase/timeline complexity.
- Users can focus task agents, task teams, and task-team members from Team → Active Tasks using existing team focus routing, without relying on left-nav duplicates.
- Pending approval controls previously available in the center active-task bar remain available from the Team tab with concrete task-agent/task-team identity.
- Backend task delegation events must carry `TaskDelegationRecord.description` deterministically into frontend task projections; the frontend must not scrape descriptions from conversation/tool-call text.
- Completion/offline/settled cleanup may keep existing disappearance semantics, but disappearance must be isolated to Active Tasks and must not destabilize stable left navigation.
- No backward-compatibility/dual-display path is allowed: no center bar plus Team tab list, no left-tree temporary badges, and no compatibility wrapper around old active-task behavior.

Implementation handoff `Legacy / Compatibility Removal Check` was reviewed: it reports no compatibility mechanisms introduced, no legacy old behavior retained, obsolete center bar source/test removed, and shared structures kept tight. Code review independently passed those checks and noted stale durable docs as delivery-owned, not an API/E2E blocker.

## Changed Behavior Summary

| Behavior / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Backend `TASK_DELEGATION_EVENT` payloads include delegated task `description` for activation, status update, result submission, and review. | Added | Requirements REQ-006/AC-007; design DS-001; implementation handoff "What Changed". | Execute server unit/integration coverage for publisher payloads and websocket mapper shape. |
| Frontend task projection parses/applies task ID, label, description, target, and status to task-agent/task-team projection nodes. | Changed | Design DS-001; code review scope and residual risks. | Execute frontend projection/router tests plus TeamStreamingService lifecycle tests. |
| Right Team tab has `Active Tasks` rows/details, task-team members, focus actions, pending approvals, empty state, and explicit run-ID labels. | Added | Requirements REQ-002/003/006/008, AC-003/004/007/008/009. | Execute component coverage for TeamActiveTasksSection/TeamOverviewPanel. |
| Left navigation filters transient task-run projection rows centrally while preserving stable rows. | Changed | Requirements REQ-001/004/005, AC-001/002/005; design DS-003. | Execute `runHistoryTeamRows` coverage and lifecycle cleanup coverage. |
| Center `TeamActiveTaskExecutionsBar` source/render/test path is removed. | Removed | Design legacy removal policy; implementation handoff; code review legacy verdict. | Treat removed center-bar test as stale/obsolete and execute center workspace test proving focused monitor renders without old bar. |
| Existing task-agent/task-team cleanup/focus fallback semantics remain, now only affecting Active Tasks/task projection. | Preserved | Requirements completion journey and AC-005; design DS-004; implementation assumption that no Recent subsection was added. | Execute existing TeamStreamingService cleanup tests and server integration lifecycle coverage. |
| Activity tab remains focused-run activity, not the active task list. | Preserved | Requirements global information architecture; design intended change. | Covered indirectly by absence of Activity-tab changes; no separate durable coverage needed in this task. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/unit/agent-team-execution/task-delegation-service.test.ts` | Delegation to member/team publishes activation payloads with execution identity and description; result/review payloads keep description; task tool parser remains tight. | REQ-006, AC-007, DS-001. | Still Valid | Inspected assertions around repeated singular delegation, explicit team target, submit/review lifecycle, and parser strictness. | Execute in final validation. |
| `autobyteus-server-ts/tests/unit/services/agent-streaming/agent-run-event-message-mapper.test.ts` | Websocket mapper flattens current task delegation target/execution shapes and preserves description; does not flatten legacy top-level identity fields. | DS-001; no compatibility wrappers/legacy-shape retention. | Still Valid | Inspected mapper tests for `TASK_DELEGATION_EVENT` description and current execution identity; legacy top-level identity remains intentionally not flattened. | Execute in final validation. |
| `autobyteus-server-ts/tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts` | In-memory server-managed delegate/submit/review/settlement paths for task agents and task teams, websocket payload mapping, cleanup, sequential delegation. | REQ-003/004/006, AC-004/005/007, DS-001/DS-004. | Still Valid | Integration test uses fake managed backend and does not require external LLM/runtime; covers API lifecycle closest to real server boundary. | Execute in final validation. |
| `autobyteus-server-ts/tests/e2e/runtime/mixed-task-delegation.e2e.test.ts` | Live mixed-runtime delegation/revision feedback E2E over websocket with Codex/LM Studio runtime configuration. | Residual live API/E2E risk from code review; DS-001/DS-004. | Still Valid, but local execution is environment-gated | File uses `describe.skip` unless `RUN_MIXED_TASK_DELEGATION_E2E=1` or mixed LM Studio/Codex env is configured. Current task worktree has no configured live runtime evidence. | Do not use as final local gate; record as not executed due external runtime env. In-memory integration plus projection/component tests are the practical validation path. |
| `autobyteus-web/services/agentStreaming/__tests__/teamTaskExecutionEventRouter.spec.ts` | Applies delegated task details to task-agent projection nodes from `TASK_DELEGATION_EVENT` payloads. | DS-001; AC-007. | Still Valid | Inspected current test for `description`, `taskLabel`, target, task-agent run ID, task execution status. | Execute in final validation. |
| `autobyteus-web/services/agentStreaming/__tests__/teamTaskTeamExecutionProjection.spec.ts` | Extracts task-team identity only from task-team payloads and creates a distinct task-team root with cloned focusable child projections plus task details. | REQ-002/003/007, AC-003/004/008. | Still Valid | Inspected task-team activation test assertions for description/target/status and child clone non-mutation. | Execute in final validation. |
| `autobyteus-web/services/agentStreaming/__tests__/TeamStreamingService.spec.ts` | Existing service-level stream projection coverage for task-agent creation/removal, task-team settlement/offline cleanup, nested task-agent cleanup, focus fallback, and sequential delegation. | REQ-004, AC-005, DS-004. | Still Valid | Inspected task-agent offline removal and task-team cleanup/sequential delegation sections. | Execute in final validation because it covers completion cleanup beyond the new component tests. |
| `autobyteus-web/utils/__tests__/teamActiveExecutionMembers.spec.ts` | Active execution member flattening and focus fallback for task-agent/task-team projection nodes. | DS-002/DS-004; completion focus fallback. | Still Valid | Inspected focus fallback and task-team/nested-task-agent display tests. Although the new Team tab uses a new entry helper, cleanup still calls the existing fallback utility. | Execute in final validation. |
| `autobyteus-web/components/workspace/team/__tests__/TeamActiveTasksSection.spec.ts` | Renders task-agent/task-team rows with details, explicit run-ID labels, no `Runtime`, approval actions, row/member focus emissions, and empty state. | REQ-002/003/006/007/008, AC-003/004/007/008/009. | Still Valid | Inspected new component tests for details, labels, approval identity, row click vs expansion, members, empty state. | Execute in final validation. |
| `autobyteus-web/components/workspace/team/__tests__/TeamOverviewPanel.spec.ts` | Team tab composes Messages and Active Tasks and passes focused-member/team identity for communication panel. | Team tab top-level layout; DS-002. | Still Valid | Inspected tests for Messages section and focused subteam route/path identity. | Execute in final validation. |
| `autobyteus-web/components/workspace/team/__tests__/TeamWorkspaceView.spec.ts` | Center team workspace renders focused event monitor/composer behavior without old active-task bar. | AC-006; design legacy removal policy. | Still Valid | Existing focused monitor/composer tests remain relevant after center strip removal; old center-bar assertions were removed. | Execute in final validation. |
| `autobyteus-web/stores/__tests__/runHistoryTeamRows.spec.ts` | Builds stable live context rows while filtering transient task-agent/task-team/task-team-child projections; preserves membership labels. | REQ-001/004/005, AC-001/002/005, DS-003. | Still Valid | Inspected test explicitly filters `isTaskAgentInstance`, `isTaskTeamInstance`, `isTaskTeamChildProjection`. | Execute in final validation. |
| `autobyteus-web/components/workspace/team/__tests__/TeamActiveTaskExecutionsBar.spec.ts` | Former center active-task strip behavior. | Removed behavior: design forbids center active-task strip plus Team tab dual display. | Stale / Remove | File is deleted in this implementation; replacement responsibilities are covered by `TeamActiveTasksSection.spec.ts` and `TeamWorkspaceView.spec.ts`. | No API/E2E removal action; deletion already occurred before code review. |
| `autobyteus-web/components/agentInput/__tests__/AgentUserInputTextArea.focusedInterrupt.e2e.spec.ts` | Focused interrupt text-area E2E/component behavior unrelated to active task list move. | Not tied to REQ/AC for this redesign. | Out Of Scope | Found as only web `*.e2e.spec.ts`; it does not exercise task delegation UI or projection boundaries. | Do not execute for this task. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/workspace/team/__tests__/TeamActiveTaskExecutionsBar.spec.ts` | Center active-task bar renders/manages active task cards above the team event monitor. | Active-task list moved to Team tab; dual center+Team display is explicitly rejected. | Requirements AC-006; design legacy removal policy and backward-compatibility rejection log; implementation handoff notes deleted obsolete component/test. | `TeamActiveTasksSection.spec.ts` for Team tab rows/details/focus/approval; `TeamWorkspaceView.spec.ts` for center focused monitor without the old strip. | N/A; replacement coverage exists. |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| N/A | N/A | N/A | N/A | Existing reviewed durable coverage is sufficient for current scope; no new repository-resident coverage is planned in API/E2E. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| N/A | N/A | N/A | N/A | No API/E2E-stage durable coverage update planned. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| N/A for API/E2E stage | The obsolete center-bar spec was already removed during implementation before code review. | AC-006 and design legacy removal policy. | Replacement already present in Team Active Tasks/TeamWorkspaceView tests. |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| APIE2E-TEMP-001 | Temporary dependency symlinks from `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` into this worktree (`node_modules`, `autobyteus-web/node_modules`, `autobyteus-web/.nuxt`, `autobyteus-server-ts/node_modules`, and server-imported workspace package dependency folders such as `autobyteus-ts/node_modules`, `autobyteus-application-sdk-contracts/node_modules`, and `autobyteus-application-backend-sdk/node_modules`) if still absent, then cleanup afterward. | Enables executing existing reviewed durable coverage in the isolated task worktree without changing repository files. | Environment scaffolding only; not product/test behavior. |
| APIE2E-TEMP-002 | Execute targeted frontend Vitest/Nuxt files including new Team Active Tasks tests plus existing `TeamStreamingService` and focus-fallback coverage. | Verifies UI/projection/read-model/focus/approval/left-nav/center-removal/completion cleanup behavior in executable frontend harness. | Uses existing durable tests; no temporary code remains. |
| APIE2E-TEMP-003 | Execute targeted server unit/integration Vitest files for task delegation service, websocket mapper, and in-memory lifecycle integration. | Verifies backend event DTO/publisher/mapper and server-managed task-agent/task-team lifecycle/cleanup without external live runtime. | Uses existing durable tests; no temporary code remains. |
| APIE2E-TEMP-004 | Execute guard/build hygiene checks: server build typecheck, web localization boundary guard, and `git diff --check`. | Verifies API/type/localization/diff hygiene relevant to changed boundaries. | Existing project commands; no temporary code remains. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Full live mixed-runtime E2E (`RUN_MIXED_TASK_DELEGATION_E2E=1` / LM Studio + Codex) | The repository live E2E is explicitly gated by external runtime environment variables and a live runtime setup; this task worktree currently has no configured live mixed-runtime environment. | Lower confidence than a live runtime run for real LLM/Codex timing, but in-memory server integration plus websocket mapper/projection/component coverage exercises the changed contracts deterministically. | No escalation; optional future live E2E can run in an environment configured for mixed runtime validation. |
| Browser/Electron full-app click path with real running UI | The web project has component/Nuxt tests but no task-specific Playwright/Cypress browser E2E suite for this workflow. Standing up a complete app/server/runtime is disproportionate without configured live task execution dependencies. | Lower confidence in CSS/visual layout than component-rendered DOM assertions. | No escalation; component tests cover emitted focus, labels, details, approvals, and section layout. |
| Full web `nuxi typecheck` as pass gate | Upstream handoff/review records broad pre-existing project/test type errors unrelated to changed implementation files. | Broad typecheck remains noisy and cannot be used as a clean API/E2E pass/fail signal. | Record if re-run; no reroute unless changed-file-specific errors appear. Delivery/maintenance may address global typecheck debt separately. |

## Ambiguities Or Reroute Triggers

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| None identified during coverage investigation. | N/A | Upstream requirements/design/code review are explicit; implementation legacy check is clean. | N/A |

## Execution Plan

1. Create temporary dependency symlinks only if absent; include server-imported workspace package dependency folders if direct server tests need them; record and remove them after execution.
2. Run targeted frontend coverage:
   - `pnpm -C autobyteus-web test:nuxt --run components/workspace/team/__tests__/TeamActiveTasksSection.spec.ts components/workspace/team/__tests__/TeamOverviewPanel.spec.ts components/workspace/team/__tests__/TeamWorkspaceView.spec.ts stores/__tests__/runHistoryTeamRows.spec.ts services/agentStreaming/__tests__/teamTaskTeamExecutionProjection.spec.ts services/agentStreaming/__tests__/teamTaskExecutionEventRouter.spec.ts services/agentStreaming/__tests__/TeamStreamingService.spec.ts utils/__tests__/teamActiveExecutionMembers.spec.ts`
3. Run targeted server coverage:
   - `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-team-execution/task-delegation-service.test.ts tests/unit/services/agent-streaming/agent-run-event-message-mapper.test.ts tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts`
4. Run executable hygiene checks:
   - `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit`
   - `pnpm -C autobyteus-web guard:localization-boundary`
   - `git diff --check`
5. Do not add/update/remove repository-resident durable coverage in API/E2E unless final execution reveals a real coverage gap; if that happens, update this investigation before making changes and route through code review afterward.
6. Write `/Users/normy/autobyteus_org/autobyteus-worktrees/transient-task-ui-redesign/tickets/in-progress/transient-task-ui-redesign/api-e2e-execution-coverage-report.md` with command results, cleanup evidence, failure classification if any, and handoff recommendation.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: Existing durable coverage, including coverage added/updated/removed before code review, is sufficient for this stage. API/E2E will execute the valid coverage plus in-memory integration/lifecycle checks without introducing new coverage-code changes.
