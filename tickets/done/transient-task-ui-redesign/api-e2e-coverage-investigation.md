# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/transient-task-ui-redesign/tickets/done/transient-task-ui-redesign/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/transient-task-ui-redesign/tickets/done/transient-task-ui-redesign/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/transient-task-ui-redesign/tickets/done/transient-task-ui-redesign/design-spec.md`
- UX Recommendation: `/Users/normy/autobyteus_org/autobyteus-worktrees/transient-task-ui-redesign/tickets/done/transient-task-ui-redesign/ux-recommendation.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/transient-task-ui-redesign/tickets/done/transient-task-ui-redesign/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/transient-task-ui-redesign/tickets/done/transient-task-ui-redesign/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/transient-task-ui-redesign/tickets/done/transient-task-ui-redesign/code-review-report.md`
- Current Investigation Round: 2
- Trigger: User requested additional real browser validation after the initial API/E2E pass; delivery had paused after integrating latest `origin/personal`.
- Prior Investigation Reviewed: Round 1 coverage investigation and execution report reviewed before Round 2 browser execution.
- Latest Authoritative Investigation: Round 2

## Current Requirement And Design Basis

The reviewed requirements and design require a clean ownership split for transient delegated task runs:

- Left workspace navigation remains stable and does not render transient task-agent, task-team, or task-team-child projection rows.
- Center team workspace remains focused conversation/event content and no longer renders the center `TeamActiveTaskExecutionsBar` active-task strip.
- Right-side Team tab owns delegated task visibility through a top-level `Active Tasks` section next to `Messages`.
- Active task rows show task-agent/task-team identity, task/run disambiguation, status, delegated task details, target, `Task ID`, and explicit `Agent run ID` / `Agent team run ID` labels; they must not use `Runtime` or expose task-team phase/timeline complexity.
- Users can focus task agents, task teams, and task-team members from Team → Active Tasks using existing team focus routing, without relying on left-nav duplicates.
- Pending approval controls previously available in the center active-task bar remain available from the Team tab with concrete task-agent/task-team identity.
- Backend task delegation events must carry `TaskDelegationRecord.description` deterministically into frontend task projections; the frontend must not scrape descriptions from conversation/tool-call text.
- Completion/offline/settled cleanup may keep existing disappearance semantics, but disappearance must be isolated to Active Tasks and must not destabilize stable left navigation.
- No backward-compatibility/dual-display path is allowed: no center bar plus Team tab list, no left-tree temporary badges, and no compatibility wrapper around old active-task behavior.

The implementation handoff `Legacy / Compatibility Removal Check` was reviewed: it reports no compatibility mechanisms introduced, no old center active-task behavior retained, obsolete center bar source/test removed, and shared structures kept tight. Code review independently passed those checks and noted stale durable docs as delivery-owned.

## Round 2 Browser Validation Update

Delivery paused after creating checkpoint commit `d0c2f9957b554d4a20835faa8d77d1adc1f4b3f8` and merging latest tracked `origin/personal` (`f3305f40c990f76614158533c14f16de6f2c3608`) as merge commit `aed19ff8c9861a58b5164cd94518de40f52a75b4`. Browser validation was planned and then executed against the current integrated worktree state on branch `codex/transient-task-ui-redesign` with delivery-owned docs edits present but not relevant to runtime UI behavior.

Round 2 browser validation was required because this is a broad UI information-architecture change. The prior Round 1 executable coverage remained valid but did not include a real browser/app run.

Browser execution scope recorded before the browser run:

- Start the current branch frontend and connect it to the already-running Electron-owned backend at `http://127.0.0.1:29695`.
- Use the user's existing `Nested Classroom Test Team` fixture.
- Verify the agent teams page and workspace run history render the fixture.
- Select the existing nested classroom team run and inspect the real left navigation, center conversation, right Team tab, `Messages`, `Active Tasks`, and absence of the old center active-task strip.
- Send a bounded real prompt that causes `Teacher` to delegate to `StudentStudyGroup`, then capture Team → Active Tasks while active and after cleanup.
- Use temporary browser automation only; do not add, update, or remove repository-resident durable coverage.

Important backend-scope note: the browser run used the existing Electron backend so it could use the user's real nested classroom fixture and live runtime configuration. This backend is not the branch-built backend, so browser evidence is strongest for the current branch frontend UI/navigation/projection behavior against a real backend. The branch backend event-description contract remains covered by the server unit/integration tests listed below. In the browser-expanded active task row, the description was unavailable because the existing Electron backend did not provide the new branch event description payload; that limitation does not change the durable coverage decision because branch backend description publication is covered by `task-delegation-service.test.ts` and `agent-run-event-message-mapper.test.ts`.

Round 2 does not require repository-resident durable coverage changes. It uses browser execution as temporary validation evidence only.

## Changed Behavior Summary

| Behavior / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Backend `TASK_DELEGATION_EVENT` payloads include delegated task `description` for activation, status update, result submission, and review. | Added | Requirements REQ-006/AC-007; design DS-001; implementation handoff; code review. | Execute server unit/integration coverage for publisher payloads and websocket mapper shape. Browser run notes branch-backend description was not live because it used Electron backend. |
| Frontend task projection parses/applies task ID, label, description, target, and status to task-agent/task-team projection nodes. | Changed | Design DS-001; code review notes. | Execute frontend projection/router tests plus browser active task row evidence. |
| Right Team tab has `Active Tasks` rows/details, task-team members, focus/approval controls, empty state, and explicit run-ID labels. | Added | Requirements REQ-002/003/006/008, AC-003/004/007/008/009. | Execute component coverage and real browser active task scenario. |
| Left navigation filters transient task-agent/task-team/task-team-child projection rows centrally while preserving stable rows. | Changed | Requirements REQ-001/004/005, AC-001/002/005; design DS-003. | Execute `runHistoryTeamRows` coverage and browser selected-run navigation inspection. |
| Center `TeamActiveTaskExecutionsBar` source/render/test path is removed. | Removed | AC-006; design legacy removal policy; implementation handoff; code review. | Treat removed center-bar test as stale/obsolete; execute center workspace tests and browser screenshot proving no center bar. |
| Existing task-agent/task-team cleanup/focus fallback semantics remain, now only affecting Active Tasks/task projection. | Preserved | Requirements completion journey and AC-005; design DS-004. | Execute TeamStreamingService cleanup tests and browser active-to-empty lifecycle after delegated task acceptance. |
| Activity tab remains focused-run activity, not the active task list. | Preserved | Requirements/design global information architecture. | Covered indirectly by right Team tab browser placement and absence of center bar; no separate durable coverage needed. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/unit/agent-team-execution/task-delegation-service.test.ts` | Delegation to member/team publishes activation payloads with execution identity and description; result/review payloads keep description; task tool parser remains tight. | REQ-006, AC-007, DS-001. | Still Valid | Inspected assertions around repeated singular delegation, explicit team target, submit/review lifecycle, and parser strictness. | Execute in validation. |
| `autobyteus-server-ts/tests/unit/services/agent-streaming/agent-run-event-message-mapper.test.ts` | Websocket mapper flattens current task delegation target/execution shapes and preserves description; does not flatten legacy top-level identity fields. | DS-001; no compatibility wrappers/legacy-shape retention. | Still Valid | Inspected mapper tests for `TASK_DELEGATION_EVENT` description and current execution identity. | Execute in validation. |
| `autobyteus-server-ts/tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts` | In-memory server-managed delegate/submit/review/settlement paths for task agents and task teams, websocket payload mapping, cleanup, sequential delegation. | REQ-003/004/006, AC-004/005/007, DS-001/DS-004. | Still Valid | Integration test uses fake managed backend and does not require external LLM/runtime. | Execute in validation. |
| `autobyteus-server-ts/tests/e2e/runtime/mixed-task-delegation.e2e.test.ts` | Live mixed-runtime delegation/revision feedback E2E over websocket with Codex/LM Studio runtime configuration. | Residual live API/E2E risk from code review; DS-001/DS-004. | Still Valid, but local execution is environment-gated | File uses `describe.skip` unless `RUN_MIXED_TASK_DELEGATION_E2E=1` or mixed LM Studio/Codex env is configured. | Do not use as final local gate; record as not executed due external runtime env. |
| `autobyteus-web/services/agentStreaming/__tests__/teamTaskExecutionEventRouter.spec.ts` | Applies delegated task details to task-agent projection nodes from `TASK_DELEGATION_EVENT` payloads. | DS-001; AC-007. | Still Valid | Inspected current test for `description`, `taskLabel`, target, task-agent run ID, task execution status. | Execute in validation. |
| `autobyteus-web/services/agentStreaming/__tests__/teamTaskTeamExecutionProjection.spec.ts` | Extracts task-team identity only from task-team payloads and creates a distinct task-team root with cloned focusable child projections plus task details. | REQ-002/003/007, AC-003/004/008. | Still Valid | Inspected task-team activation assertions for description/target/status and child clone non-mutation. | Execute in validation. |
| `autobyteus-web/services/agentStreaming/__tests__/TeamStreamingService.spec.ts` | Service-level stream projection coverage for task-agent creation/removal, task-team settlement/offline cleanup, nested task-agent cleanup, focus fallback, and sequential delegation. | REQ-004, AC-005, DS-004. | Still Valid | Covers completion cleanup beyond component tests. | Execute in validation. |
| `autobyteus-web/utils/__tests__/teamActiveExecutionMembers.spec.ts` | Active execution member flattening and focus fallback for task-agent/task-team projection nodes. | DS-002/DS-004. | Still Valid | Cleanup still calls existing fallback utility. | Execute in validation. |
| `autobyteus-web/components/workspace/team/__tests__/TeamActiveTasksSection.spec.ts` | Renders task-agent/task-team rows with details, explicit run-ID labels, no `Runtime`, approval actions, row/member focus emissions, and empty state. | REQ-002/003/006/007/008, AC-003/004/007/008/009. | Still Valid | New component tests match moved Team tab responsibility. | Execute in validation. |
| `autobyteus-web/components/workspace/team/__tests__/TeamOverviewPanel.spec.ts` | Team tab composes Messages and Active Tasks and passes focused-member/team identity. | Team tab top-level layout; DS-002. | Still Valid | Inspected tests for Messages and focused subteam route/path identity. | Execute in validation. |
| `autobyteus-web/components/workspace/team/__tests__/TeamWorkspaceView.spec.ts` | Center team workspace renders focused event monitor/composer behavior without old active-task bar. | AC-006; design legacy removal policy. | Still Valid | Old center-bar assertions were removed; focused monitor/composer coverage remains. | Execute in validation. |
| `autobyteus-web/stores/__tests__/runHistoryTeamRows.spec.ts` | Builds stable live context rows while filtering transient task-agent/task-team/task-team-child projections; preserves membership labels. | REQ-001/004/005, AC-001/002/005, DS-003. | Still Valid | Explicitly filters `isTaskAgentInstance`, `isTaskTeamInstance`, `isTaskTeamChildProjection`. | Execute in validation. |
| `autobyteus-web/components/workspace/team/__tests__/TeamActiveTaskExecutionsBar.spec.ts` | Former center active-task strip behavior. | Removed behavior; design forbids center active-task strip plus Team tab dual display. | Stale / Remove | File is deleted in implementation; replacement responsibilities are covered by `TeamActiveTasksSection.spec.ts` and `TeamWorkspaceView.spec.ts`. | No API/E2E removal action; deletion already occurred before code review. |
| `autobyteus-web/components/agentInput/__tests__/AgentUserInputTextArea.focusedInterrupt.e2e.spec.ts` | Focused interrupt text-area E2E/component behavior unrelated to active task list move. | Not tied to this redesign. | Out Of Scope | Only existing web `*.e2e.spec.ts`; does not exercise task delegation UI/projection boundaries. | Do not execute for this task. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/workspace/team/__tests__/TeamActiveTaskExecutionsBar.spec.ts` | Center active-task bar renders/manages active task cards above the team event monitor. | Active-task list moved to Team tab; dual center+Team display is explicitly rejected. | Requirements AC-006; design legacy removal policy; implementation handoff notes deleted obsolete component/test. | `TeamActiveTasksSection.spec.ts` for Team tab rows/details/focus/approval; `TeamWorkspaceView.spec.ts` for center focused monitor without the old strip; Round 2 browser screenshots. | N/A; replacement coverage exists. |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| N/A | N/A | N/A | N/A | Existing reviewed durable coverage is sufficient for current scope; Round 2 browser validation is temporary evidence, not new durable coverage. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| N/A | N/A | N/A | N/A | No API/E2E-stage durable coverage update planned. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| N/A for API/E2E stage | The obsolete center-bar spec was already removed during implementation before code review. | AC-006 and design legacy removal policy. | Replacement already present in Team Active Tasks/TeamWorkspaceView tests and now browser evidence. |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| APIE2E-TEMP-001 | Temporary dependency symlinks from `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` into this worktree as needed, then cleanup afterward. | Enables executing existing reviewed durable coverage in isolated task worktree without changing repository files. | Environment scaffolding only. |
| APIE2E-TEMP-002 | Execute targeted frontend Vitest/Nuxt files including Team Active Tasks, TeamOverviewPanel, TeamWorkspaceView, run-history rows, projection, service lifecycle, and focus fallback coverage. | Verifies frontend UI/projection/read-model/focus/approval/left-nav/center-removal/completion cleanup behavior. | Uses existing durable tests; no temporary code remains. |
| APIE2E-TEMP-003 | Execute targeted server unit/integration Vitest files for task delegation service, websocket mapper, and in-memory lifecycle integration. | Verifies backend event DTO/publisher/mapper and server-managed task-agent/task-team lifecycle/cleanup without external live runtime. | Uses existing durable tests; no temporary code remains. |
| APIE2E-TEMP-004 | Execute guard/build hygiene checks: server build typecheck, web localization boundary guard, and `git diff --check`. | Verifies API/type/localization/diff hygiene relevant to changed boundaries. | Existing project commands; no temporary code remains. |
| APIE2E-TEMP-005 | Start branch frontend with `BACKEND_NODE_BASE_URL=http://127.0.0.1:29695`, open a real browser to the UI, inspect `Nested Classroom Test Team`, select an existing nested classroom team run, send two live validation prompts that delegate to `StudentStudyGroup`, capture active and completed Team → Active Tasks states, then terminate the restored test run and remove temporary frontend scaffolding. | Proves the real browser UI layout: Team tab owns active tasks, center bar is absent, left nav remains stable, active task row shows task-team identity/status/target/task ID/agent-team run ID/members/no `Runtime`, and accepted task cleanup returns the section to `0 Active`. | Browser automation and live fixture mutation are task-specific evidence; permanent coverage remains the repository tests above. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Full live mixed-runtime E2E (`RUN_MIXED_TASK_DELEGATION_E2E=1` / LM Studio + Codex) | Repository live E2E is explicitly gated by external runtime env; this worktree does not have that specific mixed-runtime setup. | Lower confidence than that optional live suite for real LM Studio/Codex timing, but in-memory server integration plus live browser AutoByteus run exercises the changed contracts and UI practically. | No escalation; optional future run in a configured mixed-runtime environment. |
| Branch backend + branch frontend browser stack with copied live user fixture | The user's existing nested classroom fixture and runtime configuration live in the Electron backend data dir. Starting a branch backend against that same live data concurrently risks DB/data contention; copying the full data dir is disproportionate. | Browser evidence did not prove branch-backend description payload live in a browser; it showed description fallback with the existing Electron backend. | No escalation because branch backend DTO/mapper description behavior is covered by durable server tests that passed. |
| Full web `nuxi typecheck` as a pass gate | Upstream handoff/review records broad pre-existing project/test type errors unrelated to changed implementation files. | Global typecheck debt remains. | No escalation for this task unless changed-file-specific errors appear; targeted checks passed. |

## Ambiguities Or Reroute Triggers

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| None | N/A | Requirements/design/implementation/code review are sufficient for coverage decisions. | N/A |

## Execution Plan

1. Reuse Round 1 investigation decisions for durable coverage validity.
2. Execute existing valid frontend, backend, build/guard, and diff checks.
3. Before browser validation, update this investigation for Round 2 scope and confirm no durable coverage edits are planned.
4. Start the current branch frontend against the existing Electron backend at `127.0.0.1:29695`.
5. Use real browser automation and the existing `Nested Classroom Test Team` fixture to inspect the team catalog, workspace run history, selected team run, Team tab empty state, live delegated task active state, expanded active task details, and completion cleanup.
6. Record browser evidence in `/Users/normy/autobyteus_org/autobyteus-worktrees/transient-task-ui-redesign/tickets/done/transient-task-ui-redesign/browser-validation-logs`.
7. Stop the frontend dev server, remove temporary symlinks/generated `.nuxt`, terminate the restored live test run, and update the canonical execution coverage report.
8. Because no repository-resident durable coverage was added, updated, or removed after code review, route the fresh cumulative package back to `delivery_engineer`.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: Round 2 browser validation is temporary executable evidence against the integrated branch frontend. No coverage-code re-review is required because API/E2E did not add, update, or remove repository-resident durable coverage.
