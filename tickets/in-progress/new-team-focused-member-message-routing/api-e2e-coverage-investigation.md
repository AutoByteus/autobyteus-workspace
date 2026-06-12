# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/new-team-focused-member-message-routing/tickets/in-progress/new-team-focused-member-message-routing/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/new-team-focused-member-message-routing/tickets/in-progress/new-team-focused-member-message-routing/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/new-team-focused-member-message-routing/tickets/in-progress/new-team-focused-member-message-routing/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/new-team-focused-member-message-routing/tickets/in-progress/new-team-focused-member-message-routing/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/new-team-focused-member-message-routing/tickets/in-progress/new-team-focused-member-message-routing/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/new-team-focused-member-message-routing/tickets/in-progress/new-team-focused-member-message-routing/code-review-report.md`
- Current Investigation Round: 1
- Trigger: Code-review pass handed to API/E2E on 2026-06-12 for new-team focused-member message routing.
- Prior Investigation Reviewed: N/A
- Latest Authoritative Investigation: Round 1

## Current Requirement And Design Basis

The approved behavior is that ordinary team user messages are targeted by the visible roster focus, not by the active-execution display fallback. For a temporary/not-yet-started team where all members are offline, if the user focuses a valid non-coordinator leaf such as `code_reviewer`, the first send must use `target_member_route_key: "code_reviewer"`, place the optimistic/local user message under that member, and finalize any context attachments under that same member. Coordinator fallback remains valid only when there is no valid focused send target, not when a valid non-coordinator member is offline. Stale/missing focused routes must not silently reroute to an arbitrary non-coordinator or coordinator. Backend `SEND_MESSAGE` keeps the existing `target_member_route_key` command shape and must preserve explicit targets into `TeamRun.postMessage(...)`/mixed-team member routing. Active-execution display/status filtering remains a separate capability and may still protect task-agent-only logical-parent cases.

The implementation handoff's `Legacy / Compatibility Removal Check` is clean: no backward-compatibility mechanism was introduced, old in-scope coordinator-forcing behavior is not retained, and obsolete send-path dependence on active-execution focus was removed from composer/send/attachment paths. Code review confirmed the same and found no blocking findings.

## Changed Behavior Summary

| Behavior / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Visible-focus-led team user-message target resolver | Added | Requirements REQ-001/003/005, design `teamUserMessageTarget.ts`, implementation handoff `What Changed` | Durable resolver tests must prove valid offline non-coordinator, coordinator, stale focus, subteam, concrete task-agent, and task-agent-only fallback decisions. |
| Temporary team first send target route | Changed | AC-001/002/003 and code review data-flow spine | Durable store/component coverage must prove first-send `target_member_route_key`, local projection, and attachment owners use focused target. |
| Old valid-offline-non-coordinator-to-coordinator send behavior | Removed | Design Legacy Removal Policy and Backward-Compatibility Rejection Log | Existing stale test expectation must remain replaced; no compatibility coverage for old behavior is allowed. |
| Active-execution display filtering | Preserved | Requirements REQ-006; design ownership map keeps `teamActiveExecutionMembers.ts` display/status-only | Existing active-execution tests remain valid but must not be treated as send-target authority. |
| Stale focused route handling | Changed | AC-004, design examples, implementation handoff | Durable send coverage must prove stale focus blocks/errors and does not silently send coordinator. |
| Backend route-key command shape and explicit-target routing | Preserved | REQ-004/AC-005; investigation found backend already accepts route key; backend unchanged | Existing backend/WebSocket contract tests should be rerun; temporary probe should exercise lazy-start routing to a non-coordinator explicit target. |
| Subteam focus behavior | Preserved/clarified | Design residual risk and implementation handoff | Existing subteam target tests remain valid; API/E2E will keep this as safety coverage, not broaden scope. |
| Task-agent safety behavior | Preserved/clarified | REQ-006; design/review residual risks | Durable resolver/send tests must cover concrete task-agent targeting and task-agent-only logical-parent fallback. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/utils/__tests__/teamUserMessageTarget.spec.ts` | Resolver returns focused offline non-coordinator leaf; coordinator when focused; stale focus reports error; subteam requires explicit `allowSubteam`; concrete task-agent can be targeted; task-agent-only logical parent falls back only when allowed. | REQ-001/002/005/006, AC-001/002/004/006, design `DS-003` | Still Valid | Directly tests the new resolver boundary added by implementation. | Run as part of targeted frontend coverage. |
| `autobyteus-web/utils/__tests__/teamActiveExecutionMembers.spec.ts` | Active-execution display/filtering behavior remains separate from ordinary send target selection. | REQ-006; design says active-execution utility remains display/status owner | Still Valid | Code review confirmed ownership split; tests remain relevant for preserved capability. | Run with targeted frontend coverage. |
| `autobyteus-web/stores/__tests__/activeContextStore.spec.ts` | Team composer active context follows visible focused member even when active-execution falls back to coordinator; interrupt still uses active-execution/focused runtime target semantics. | REQ-003/006, AC-001/004/006; design active-context facade | Still Valid | Updated test replaces old all-offline coordinator composer expectation while preserving interrupt/stale safety. | Run with targeted frontend coverage. |
| Prior old `activeContextStore` all-offline non-coordinator composer expectation | Previously asserted `delivery_engineer` visible focus resolves composer to coordinator. | Obsolete under REQ-001/005 and design legacy removal policy | Stale / Remove | Upstream investigation identified it as codifying the bug; implementation replaced it. | No API/E2E removal needed; verify replacement tests pass. |
| `autobyteus-web/stores/__tests__/agentTeamRunStore.spec.ts` focused temporary send scenario | Temporary team focused on offline non-coordinator sends payload to that route, projects local message under that member, and finalizes attachments with matching draft/final owners. | REQ-001/003/005/007, AC-001/003/006 | Still Valid | Test covers mocked GraphQL launch, active-execution fallback set to coordinator, attachment owner, dedupe key, and `mockSendMessage` target. | Run with targeted frontend coverage. |
| `autobyteus-web/stores/__tests__/agentTeamRunStore.spec.ts` stale focus scenario | Stale `focusedMemberRouteKey` rejects with `missing_node` and does not call WebSocket send. | REQ-005/006, AC-004 | Still Valid | Prevents silent coordinator fallback for stale visible focus. | Run with targeted frontend coverage. |
| `autobyteus-web/stores/__tests__/agentTeamRunStore.spec.ts` task-agent-only logical parent scenario | Task-agent-only logical parent uses active-execution safety fallback, preserving existing safety semantics. | REQ-006; design/review residual task-agent risk | Still Valid | Ensures resolver fallback option is narrow and does not become general coordinator fallback. | Run with targeted frontend coverage. |
| `autobyteus-web/components/agentInput/__tests__/ContextFilePathInputArea.spec.ts` team draft owner scenarios | Team draft uploads/cloned draft URLs use the resolved focused member owner and do not move files to another member during async focus changes. | REQ-003/007, AC-003 | Still Valid | Component uses the same resolver/owner shape as send path. | Run focused component test. |
| `autobyteus-web/components/workspace/team/__tests__/TeamWorkspaceView.spec.ts` composer/header label scenarios | Header/shared composer label follows roster focus/user-message target even when active execution falls back. | REQ-001/003, AC-001/006; design view alignment | Still Valid | Protects visible target semantics in shared composer UI. | Run focused component test. |
| `autobyteus-web/services/agentStreaming/__tests__/TeamStreamingService.spec.ts` SEND_MESSAGE route-key serialization | Transport serializes `target_member_route_key` for team sends and interrupt/approval route-key payloads remain explicit. | REQ-004, AC-005 | Still Valid | Existing transport contract is unchanged but central to API boundary. | Run focused service test as API/contract coverage. |
| `autobyteus-server-ts/tests/unit/services/agent-streaming/agent-team-stream-handler.test.ts` SEND_MESSAGE explicit route-key/path selectors | Backend WebSocket handler parses `target_member_route_key`/`targetMemberRouteKey`, rejects scalar legacy aliases, and restores/rebinds before send. | REQ-004, AC-005; no compatibility scalar aliases | Still Valid | Direct backend command-boundary coverage exists and should be rerun. | Run focused backend handler test. |
| `autobyteus-server-ts/tests/unit/agent-team-execution/team-run.test.ts` coordinator fallback for omitted target | Backend `TeamRun` falls back to coordinator only when target is omitted/null. | REQ-004/005; design backend fallback only for missing target | Still Valid | This preserved fallback remains required for missing target cases. | Run focused backend domain test. |
| `autobyteus-server-ts/tests/unit/agent-team-execution/team-manager-member-interrupt.test.ts` task-agent/member target routing | Mixed manager routes targeted messages/approvals/interrupts to concrete member/task-agent runs where applicable. | REQ-006; task-agent safety residual | Still Valid | Not specific to new-team first send, but relevant to task-agent safety. | Run focused backend task-agent/member target test if dependency setup permits. |
| `autobyteus-server-ts/tests/unit/agent-team-execution/team-command-start-status.test.ts` mixed member/subteam lazy start overlays | Lazy member/subteam start publishes initializing status while delayed runtime creation is pending. | Backend lazy-start residual from code review | Still Valid for leaf-member lazy start; subteam case is existing broader coverage outside this change's acceptance scope | Existing lazy-start coverage is target-agnostic. Execution later showed the subteam child-run-id case fails the same way in the shared checkout, so only leaf-member lazy start is used as in-scope evidence for this frontend-focused task. | Run focused leaf/member status cases; record broader subteam failure as pre-existing/out-of-scope evidence, not a current-change blocker. |
| `autobyteus-web/components/agentInput/__tests__/AgentUserInputTextArea.focusedInterrupt.e2e.spec.ts` | UI-to-WebSocket focused interrupt sends visible route key after focus switch. | REQ-006 non-send active runtime safety | Still Valid | Adjacent E2E-style UI/runtime safety coverage; not the first-send path but protects focus routing semantics. | Run with frontend focused checks if feasible. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| Prior `autobyteus-web/stores/__tests__/activeContextStore.spec.ts` all-offline focused non-coordinator test | Focused offline `delivery_engineer` composer context resolves to coordinator. | This asserted the bug: valid focused non-coordinator first sends must not be replaced by coordinator. | REQ-001, REQ-005, AC-001, design Legacy Removal Policy. | Updated `activeContextStore` composer context test plus `teamUserMessageTarget` and `agentTeamRunStore` focused-send tests. | N/A |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| N/A | N/A | Existing implementation-reviewed durable coverage already covers the changed frontend resolver/send/attachment/UI paths, and existing backend contract tests cover unchanged backend route-key parsing. | N/A | No additional repository-resident durable coverage is planned in this API/E2E round. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| N/A | N/A | N/A | N/A | No durable updates planned. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| N/A | N/A | N/A | No durable removals planned in this round; obsolete assertion was already replaced during implementation and code-reviewed. |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| TEMP-FE-001 | Run targeted Nuxt/Vitest suite for resolver, active-execution, active context, team run send, attachment component, team workspace view, TeamStreamingService, and focused interrupt e2e-style component test. | Review-passed durable frontend coverage still passes in API/E2E stage and proves the visible-focus-led send path plus adjacent route-key serialization. | Uses existing durable tests; no temporary scaffold. |
| TEMP-BE-001 | Run focused backend Vitest tests for `agent-team-stream-handler`, `team-run`, `team-manager-member-interrupt`, and in-scope leaf/status cases from `team-command-start-status`. | Backend route-key command parsing, no scalar legacy aliases, omitted-target coordinator fallback, task-agent target safety, and leaf-member lazy-start status coverage remain passing. | Uses existing durable tests; no temporary scaffold. |
| TEMP-BE-002 | Create and delete a temporary backend Vitest probe that instantiates a mixed team with coordinator `solution_designer`, targets offline non-coordinator `code_reviewer` by explicit route key, and asserts only `code_reviewer` is lazily created/posted. | Directly proves the code-review priority scenario: backend lazy-start/routing honors explicit non-coordinator target and does not start/use coordinator. | Specific integrated probe duplicates the unchanged backend contract in a task-specific way; current source change is frontend-owned, so keeping it as durable coverage would broaden repository tests beyond the reviewed change scope. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Full live browser + real server + real LLM/runtime first-send session | The repository has focused Vitest/API tests and no established full Playwright/live-runtime harness for this path; real agent runtimes would require external model/process configuration outside this task's local validation budget. | Lower confidence than a fully live manual session for visual projection after backend events. | Use targeted frontend store/component and backend executable probes as practical proof; no escalation unless those fail. |
| Restored inactive historical team broader semantics | Upstream scoped the bug to temporary/not-yet-started runs; code review listed restored inactive behavior as residual risk, not required acceptance. | Future ambiguity if product wants focused-member-first for every restored inactive run. | No escalation now; delivery can note as residual if desired. |
| Full backend mixed subteam lazy-start command-status test | Existing `team-command-start-status` subteam case fails in both the task worktree and shared checkout with `childTeamRunId for subteam 'ReviewTeam' is required`; the current requirements scope first-send leaf-member targeting and says subteam focus should be preserved only if feasible. | Indicates pre-existing backend subteam test debt outside this frontend routing fix. | No current reroute; execution report records the failure and focused leaf/backend target checks are used for this task. |

## Ambiguities Or Reroute Triggers

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| None currently | N/A | Upstream package and code review are clear; no invalid compatibility wrapper or legacy fallback was observed in changed scope. | N/A |

## Execution Plan

1. Preserve current repository state; do not edit durable coverage unless execution reveals a current-requirement coverage gap.
2. Ensure local dependency setup is available in the task worktree (existing `autobyteus-web/node_modules` symlink; create ignored `autobyteus-server-ts/node_modules` symlink to shared checkout if needed for backend test execution).
3. Run frontend targeted API/E2E-adjacent executable coverage:
   - `pnpm exec nuxt prepare`
   - `pnpm test:nuxt utils/__tests__/teamUserMessageTarget.spec.ts utils/__tests__/teamActiveExecutionMembers.spec.ts stores/__tests__/activeContextStore.spec.ts stores/__tests__/agentTeamRunStore.spec.ts components/agentInput/__tests__/ContextFilePathInputArea.spec.ts components/workspace/team/__tests__/TeamWorkspaceView.spec.ts services/agentStreaming/__tests__/TeamStreamingService.spec.ts components/agentInput/__tests__/AgentUserInputTextArea.focusedInterrupt.e2e.spec.ts --run`
4. Run backend focused executable coverage:
   - `pnpm exec vitest run tests/unit/services/agent-streaming/agent-team-stream-handler.test.ts tests/unit/agent-team-execution/team-run.test.ts tests/unit/agent-team-execution/team-manager-member-interrupt.test.ts`
   - `pnpm exec vitest run tests/unit/agent-team-execution/team-command-start-status.test.ts --testNamePattern "keeps mixed leaf member initializing|gates member initializing|replaces member failure|keeps task-agent command overlays|keeps root and sub-team source-path overlays"`
5. Run temporary backend lazy-start explicit non-coordinator probe, then delete any temporary probe file.
6. Record commands, results, environment setup, cleanup, and residual untested areas in the execution coverage report.
7. If no durable coverage code changes are made and all current valid checks pass, hand off to `delivery_engineer`. If any durable coverage is added/updated/removed, reroute to `code_reviewer` first.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: Existing repository-resident durable coverage is current and adequate for the reviewed frontend change. API/E2E will execute that coverage plus focused backend contract/lazy-start probes without adding durable coverage in this round unless execution contradicts this investigation.
