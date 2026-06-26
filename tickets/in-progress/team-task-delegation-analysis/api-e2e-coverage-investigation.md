# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-task-delegation-analysis/tickets/in-progress/team-task-delegation-analysis/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-task-delegation-analysis/tickets/in-progress/team-task-delegation-analysis/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-task-delegation-analysis/tickets/in-progress/team-task-delegation-analysis/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-task-delegation-analysis/tickets/in-progress/team-task-delegation-analysis/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-task-delegation-analysis/tickets/in-progress/team-task-delegation-analysis/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-task-delegation-analysis/tickets/in-progress/team-task-delegation-analysis/code-review-report.md`
- Current Investigation Round: 3
- Trigger: Code review round 8 passed after frontend/backend task-team projection, terminal cleanup, and task-team scoped approval routing rework.
- Prior Investigation Reviewed: Yes — prior Round 1 API/E2E artifacts remain context, but the round 8 frontend/backend rework changes coverage needs.
- Latest Authoritative Investigation: This file, Round 3.

## Current Requirement And Design Basis

The current approved behavior is broader than the Round 1 server-only task-team runtime proof. The system must keep the explicit `delegate_task({ target: { kind, name }, description, reference_files? })` contract with no `member_name` compatibility path; support parent PM delegation to a visible team target; create a task-scoped child team run; route child ingress `submit_task_result` to the parent ledger through `TaskDelegationToolRunRouter` and `TaskTeamActiveRunDirectory`; support review, revision, acceptance, settlement gates, cleanup, and later delegation to the same logical team.

Round 8 adds/reworks the frontend/runtime boundary: websocket task-team identity must be explicit-stamp-only; task-team executions must be visible as first-class transient `agent_team` projections distinct from structural team nodes; scoped child members and nested task-agent projections must be grouped under the task-team run id; lifecycle status/timeline must render through active execution and monitor surfaces; terminal cleanup must occur only after a terminal render opportunity and must preserve structural nodes/contexts; concurrent same-logical-team executions must route by `taskTeamRunId`; and tool approval/denial for task-team scoped child tools must carry `task_team_run_id` plus the relative child selector so the backend routes to the child task-team run first.

The implementation handoff's `Legacy / Compatibility Removal Check` is clean and remains an active validation constraint: no `member_name` shorthand, no legacy websocket flattening fallbacks for top-level `payload.taskAgentInstance` / `payload.taskTeamInstance` / `payload.member`, no old `TaskTeamDirectory` tombstones/starting/task-id index, and no retained catch-all mixed member registry facade.

## Changed Behavior Summary

| Behavior / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Explicit task target object and no `member_name` compatibility | Preserved | Requirements REQ-001..REQ-004; implementation handoff clean legacy check | Retain Round 1 E2E/schema/unit coverage and rerun focused server checks. |
| Task-team server runtime lifecycle, ingress result routing, revision, accept/settlement gate, cleanup, and sequential same-team delegation | Preserved / Changed | Requirements UC-003..UC-007; design DS-003..DS-007; prior API/E2E integration added in Round 1 | Existing server integration remains valid; rerun it against round 8 changes. |
| Frontend task-team root projection, child clone projection, and active execution display | Added / Changed | Requirements REQ-033..REQ-044 and AC-FE-001..AC-FE-012; design frontend section; frontend gap artifact | Existing new frontend tests are relevant; execute current projection/service/component coverage. |
| Task-team lifecycle status separation from runtime idle/offline and one-turn terminal cleanup | Changed | Implementation handoff CR-006 notes; code review report CR-006 pass | Existing service tests cover accepted not regressed by idle, offline/terminal settled status, delayed cleanup, cascade, structural preservation; execute them. |
| Nested task-agent grouping and cleanup under task-team projection | Changed | Requirements AC-FE-006/007; design required frontend tests; implementation handoff CR-006 | Existing active-execution and service cleanup tests are relevant; execute them. |
| Sequential same-logical-team delegation after cleanup | Preserved / Changed | UC-007/UC-008; implementation handoff risk; code review CR-006 | Existing frontend service and server integration tests cover sequential run replacement; execute them. |
| Concurrent same-logical-team frontend routing by explicit `taskTeamRunId` | Added / Incomplete Coverage | Design explicitly requires two active task-team executions for the same logical team to route only by `task_team_run_id`; implementation handoff calls out simultaneous runs | Existing tests cover malformed missing run id and sequential same-team runs, but not two concurrently active same-logical-team roots. Add narrow frontend service durable coverage. |
| Task-team scoped approval/denial payload routing | Added / Incomplete Coverage | Design approval contract; implementation handoff CR-007; code review CR-007 pass | Backend routing tests cover positive/negative approve/deny. Add frontend service serialization coverage so browser approve/deny emits `task_team_run_id` and relative child selector. |
| Monitor tile task-team badge/status/timeline/child scoped rows | Added / Incomplete Coverage | Requirements AC-FE-003/004/005/008; design required component tests | Source renders the surface, but current component spec lacks a task-team monitor assertion. Add narrow component durable coverage. |
| Full frontend `nuxi typecheck` | Preserved known non-gating issue | Implementation handoff says broad pre-existing repository errors outside touched task-team files remain | Run or inspect typecheck impact after coverage edits; classify as known pre-existing/non-blocking if no touched task-team projection files are implicated. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/runtime/mixed-task-delegation.e2e.test.ts` | Live member-target mixed runtime E2E uses current `target` schema and has no legacy activation fallback; locally env-gated | Explicit target schema; no legacy; existing member lifecycle | Still Valid | Round 1 updated stale schema/fallback assertions; no round 8 frontend change invalidates it. | Rerun as import/skip check if local live env remains unavailable. |
| `autobyteus-server-ts/tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts` | Member lifecycle plus task-team activation, child tool routing, parent ingress submit, revision, acceptance, settlement gate, cleanup, stale lookup rejection, sequential same-team delegation | UC-003..UC-007; AC-003..AC-009; DS-003..DS-007 | Still Valid | Current file contains the Round 1 task-team scenario and code review still points to server runtime paths. | Rerun focused integration. |
| `autobyteus-server-ts/tests/unit/agent-tools/task-delegation/task-delegation-tool-run-router.test.ts` | Thin service/router ownership for current/parent/fallback task-tool service routing | CR-002; DS-004/DS-007 | Still Valid | Directly covers `TaskDelegationToolRunRouter` ownership retained after round 8. | Rerun focused unit. |
| `autobyteus-server-ts/tests/unit/agent-team-execution/task-team-active-run-directory.test.ts` | Active-only task-team lookup by task-team/child run id; no tombstone; cleanup by parent | CR-003; active directory responsibility; concurrent active entries by run id | Still Valid | Tests active bind/resolve/unbind and parent cleanup for multiple same-parent entries. | Rerun focused unit. |
| `autobyteus-server-ts/tests/unit/services/agent-streaming/agent-run-event-message-mapper.test.ts` | Current target/execution websocket flattening, task-team child identity flattening, no legacy top-level flattening | CR-004; frontend explicit-stamp contract | Still Valid | Current tests verify no legacy fields are flattened and stamped child events carry task-team fields. | Rerun focused unit. |
| `autobyteus-server-ts/tests/unit/services/agent-streaming/agent-team-stream-handler.test.ts` | Websocket command handling including task-team scoped approval/denial routing with sixth `taskTeamRunId` argument and invalid selector rejection | CR-007; design approval routing contract | Still Valid | Code review report confirms positive/negative scoped approve/deny tests were added and passed. | Rerun focused unit. |
| `autobyteus-web/services/agentStreaming/__tests__/teamTaskTeamExecutionProjection.spec.ts` | Projection owner creates distinct root and scoped child clones without mutating structural nodes | AC-FE-001/002/005 | Still Valid | Current assertions cover root identity/status and child clone ownership. | Rerun focused frontend unit. |
| `autobyteus-web/services/agentStreaming/__tests__/TeamStreamingService.spec.ts` existing task-team tests | Service consumes task-team activation; routes stamped child status to scoped child; drops malformed missing run id; accepted not regressed by idle; delayed terminal cleanup; nested task-agent cleanup; sequential same-team delegation | AC-FE-001..AC-FE-007/010/011; CR-006 | Needs Update | Existing tests cover most round 8 guidance but lack two active same-logical-team routing and frontend approval/denial payload serialization. | Add narrow tests in this file, then rerun. |
| `autobyteus-web/utils/__tests__/teamActiveExecutionMembers.spec.ts` | Active execution flattening includes task-team roots, scoped child projections, and nested task agents | AC-FE-006/007; active execution UI | Still Valid | Current test asserts route order includes root, child, nested task-agent. | Rerun focused frontend unit. |
| `autobyteus-web/components/workspace/team/__tests__/TeamActiveTaskExecutionsBar.spec.ts` | Active execution bar renders task-agent and task-team cards/status; task-agent approval uses concrete run identity | AC-FE-007/008 | Still Valid | Current assertions include `Task team` card and `awaiting_review`. | Rerun focused component unit. |
| `autobyteus-web/components/workspace/team/__tests__/TeamMemberMonitorTile.spec.ts` | Logical member/subteam/task-agent tile rendering | AC-FE-003/004/008 | Needs Update | Current spec has no task-team badge/lifecycle/timeline/scoped child assertion despite source support. | Add narrow task-team monitor tile test, then rerun. |
| `autobyteus-web/components/workspace/team/__tests__/TeamWorkspaceView.spec.ts` and `autobyteus-web/utils/__tests__/teamUserMessageTarget.spec.ts` | Shared composer/focus behavior and direct task-agent focus behavior | AC-FE-009; implementation handoff composer notes | Still Valid | Source suppresses task-team focus targeting and tests direct task-agent targeting; latest round 8 coverage guidance focuses runtime/visible lifecycle/approval. | Rerun focused suites; no durable update planned unless failures expose stale coverage. |
| `autobyteus-web/services/agentStreaming/__tests__/teamStreamMemberContextResolver.spec.ts` | Task-agent context resolver behavior | Existing task-agent non-regression | Still Valid | Task-team projection now routes before structural resolver; resolver tests remain adjacent non-regression. | Rerun with focused frontend service suites. |
| Full `autobyteus-web` `nuxi typecheck` | Repository-wide frontend typecheck | Execution confidence, not a durable test | Still Valid but known non-gating failure | Implementation handoff reports broad pre-existing failures outside touched files. | Attempt after `nuxi prepare`; record exact result and touched-path impact. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| None in Round 2 | N/A | No stale current tests identified during this investigation. | N/A | N/A | N/A |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| APIE2E-FE-CONC-001 | Two active task-team executions for the same logical team route stamped child status by `task_team_run_id`, leaving sibling task-team and structural context untouched; missing `task_team_run_id` still drops instead of guessing | Design required frontend test for two active same logical team executions; implementation handoff risk for simultaneous runs; latest code-review coverage guidance | `/Users/normy/autobyteus_org/autobyteus-worktrees/team-task-delegation-analysis/autobyteus-web/services/agentStreaming/__tests__/TeamStreamingService.spec.ts` | Existing tests cover sequential same-team and malformed missing id separately, but not concurrent active roots. |
| APIE2E-FE-APPROVAL-001 | Frontend approve and deny commands for task-team scoped child tool requests include `task_team_run_id`, team route/path, and relative child selector | Design approval payload contract; CR-007; latest code-review coverage guidance | `/Users/normy/autobyteus_org/autobyteus-worktrees/team-task-delegation-analysis/autobyteus-web/services/agentStreaming/__tests__/TeamStreamingService.spec.ts` | Backend routing is covered; frontend serialization must also be durable so browser payloads carry the scoped identity. |
| APIE2E-FE-TILE-001 | Task-team monitor tile renders task-team badge, lifecycle status/timeline, and task-scoped child row | AC-FE-003/004/005/008; design required `TeamMemberMonitorTile` component test | `/Users/normy/autobyteus_org/autobyteus-worktrees/team-task-delegation-analysis/autobyteus-web/components/workspace/team/__tests__/TeamMemberMonitorTile.spec.ts` | Current component spec lacks a task-team assertion although the UI source implements the surface. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| APIE2E-FE-CONC-001 | `autobyteus-web/services/agentStreaming/__tests__/TeamStreamingService.spec.ts` | Add concurrent same-logical-team routing assertion. | Explicit-stamp-only frontend design; concurrent same logical team guidance. | Test-only addition. |
| APIE2E-FE-APPROVAL-001 | `autobyteus-web/services/agentStreaming/__tests__/TeamStreamingService.spec.ts` | Add scoped approve/deny serialization assertion. | CR-007 approval routing contract. | Test-only addition. |
| APIE2E-FE-TILE-001 | `autobyteus-web/components/workspace/team/__tests__/TeamMemberMonitorTile.spec.ts` | Add task-team tile UI assertion. | AC-FE-008 and design component test list. | Test-only addition. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| None | N/A | N/A | N/A |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| APIE2E-FE-TYPECHECK-001 | `pnpm -C autobyteus-web exec nuxi prepare` then `pnpm -C autobyteus-web exec nuxi typecheck --pretty false` with touched-path impact inspection if it fails | Whether round 8 touched frontend task-team paths are implicated in the broad typecheck result | Repository-wide typecheck already exists as a command, not task-specific durable coverage; known broad pre-existing failures must be classified with evidence. |


### Round 3 Browser Validation Addendum

| Scenario ID | Current Behavior To Validate | Decision | Planned Surface / Evidence | Rationale |
| --- | --- | --- | --- | --- |
| APIE2E-BROWSER-001 | A real browser against the worktree-started server can open a minimal nested parent team, send a coordinator prompt, receive task-team target activation from the backend, and visibly render the task-team active execution/lifecycle state in the frontend. | Use Temporary Executable Probe Only | Start the backend from `/Users/normy/autobyteus_org/autobyteus-worktrees/team-task-delegation-analysis` per `autobyteus-server-ts/README.md` on `127.0.0.1:8000` with an isolated `--data-dir`; start Nuxt dev on `127.0.0.1:3020`; create agent/team definitions via that backend GraphQL; use a real browser automation session to open `/workspace?workspaceExecutionKind=team&workspaceExecutionRunId=<run>&workspaceExecutionMemberRouteKey=product_manager`; send the prompt through the frontend composer; capture DOM/screenshot and runtime events. | The previous Round 2 no-live-browser classification no longer satisfies the user's confidence concern. This is temporary evidence because a live Codex model/browser orchestration is slower and environment-sensitive, while durable coverage remains the deterministic unit/integration coverage already added. |
| APIE2E-BROWSER-002 | The live browser run uses the worktree backend, not the Electron internal/static backend at `127.0.0.1:29695`. | Use Temporary Executable Probe Only | Record backend health URL, PID/command/data-dir, frontend URL, browser page URL, and any screenshot path. | The user specifically rejected Electron-server validation; the browser proof must be tied to the README startup path and isolated worktree data. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Full live LLM/browser PM -> task-team settlement after acceptance | Round 3 now attempts browser task-team activation/rendering, but final settlement depends on model prompt compliance and may time out or require manual acceptance/retry if Codex runtime/model authentication blocks. | If activation is observed but settlement is not, browser proof covers frontend activation/lifecycle visibility but not complete autonomous closeout. | Record exact browser/runtime result in the execution report; durable deterministic backend integration remains the settlement proof. |
| Durable product documentation sync | Delivery engineer owns docs after API/E2E/code-review loop | Docs may still describe old schema/lifecycle until delivery | Include docs-impact note in handoff to delivery/code reviewer. |

## Ambiguities Or Reroute Triggers

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| None before execution | N/A | Upstream requirements/design/code review are sufficient to decide coverage validity. | N/A |

## Execution Plan

0. Round 3 live browser validation:
   - Confirm backend health at `http://127.0.0.1:8000/rest/health` and that the backend process command is `node autobyteus-server-ts/dist/app.js --data-dir /tmp/autobyteus-team-task-delegation-browser-data --host 127.0.0.1 --port 8000` from the worktree README startup path.
   - Confirm Nuxt dev frontend is on `http://127.0.0.1:3020/` and routes to the worktree backend, not Electron `127.0.0.1:29695`.
   - Create a minimal nested team with `product_manager` plus nested `MiniChildTeam`/`child_worker`, using `runtimeKind: codex_app_server`, `llmModelIdentifier: gpt-5.5`, `autoExecuteTools: true`, `skillAccessMode: NONE`, and configured task-delegation tools.
   - Use browser automation to open the team run in the frontend, send the initial user prompt through the visible composer when possible, wait for task-team activation/lifecycle DOM evidence, and capture screenshot/event evidence.

1. Apply narrow durable frontend coverage updates listed above before final execution.
2. Run `git diff --check`.
3. Run frontend focused validation:
   - `pnpm -C autobyteus-web exec nuxi prepare`
   - `pnpm -C autobyteus-web exec vitest run services/agentStreaming/__tests__/TeamStreamingService.spec.ts services/agentStreaming/__tests__/teamTaskTeamExecutionProjection.spec.ts services/agentStreaming/__tests__/teamStreamMemberContextResolver.spec.ts utils/__tests__/teamActiveExecutionMembers.spec.ts utils/__tests__/teamUserMessageTarget.spec.ts components/workspace/team/__tests__/TeamActiveTaskExecutionsBar.spec.ts components/workspace/team/__tests__/TeamMemberMonitorTile.spec.ts components/workspace/team/__tests__/TeamWorkspaceView.spec.ts`
4. Run backend focused validation:
   - `pnpm -C autobyteus-server-ts exec vitest run tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts`
   - `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/mixed-task-delegation.e2e.test.ts` (expected local skip if live flags remain unset)
   - `pnpm -C autobyteus-server-ts exec vitest run tests/unit/services/agent-streaming/agent-team-stream-handler.test.ts tests/unit/services/agent-streaming/agent-run-event-message-mapper.test.ts tests/unit/agent-tools/task-delegation/task-delegation-tool-run-router.test.ts tests/unit/agent-team-execution/task-team-active-run-directory.test.ts tests/unit/agent-team-execution/task-delegation-service.test.ts tests/unit/agent-tools/task-delegation/task-delegation-runtime-descriptions.test.ts tests/unit/agent-team-execution/member-run-instruction-composer.test.ts tests/unit/agent-team-execution/member-team-context-builder.test.ts`
5. Run build/static checks:
   - `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit`
   - `pnpm -C autobyteus-server-ts run build`
   - `pnpm -C autobyteus-web exec nuxi typecheck --pretty false` and, if it fails, record whether any touched task-team/frontend files are implicated.
6. Update the canonical execution coverage report. Because repository-resident durable coverage will be updated after code review round 8, route the cumulative package back to `code_reviewer` before delivery.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: Coverage edits are test-only and narrowly address round 8 frontend/runtime gaps. Final handoff must return through `code_reviewer` for coverage-code re-review before delivery.
