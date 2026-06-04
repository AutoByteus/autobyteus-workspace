# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/tickets/done/runtime-tool-mcp-unification-analysis/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/tickets/done/runtime-tool-mcp-unification-analysis/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/tickets/done/runtime-tool-mcp-unification-analysis/design-spec.md`
- Supplemental analysis: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/tickets/done/runtime-tool-mcp-unification-analysis/task-management-server-migration-analysis.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/tickets/done/runtime-tool-mcp-unification-analysis/design-review-report.md`
- API/E2E validation report: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/tickets/done/runtime-tool-mcp-unification-analysis/api-e2e-validation-report.md`
- API/E2E frontend UX reroute: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/tickets/done/runtime-tool-mcp-unification-analysis/api-e2e-frontend-task-agent-ux-reroute.md`
- API/E2E Round 12 frontend task-agent failure: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/tickets/done/runtime-tool-mcp-unification-analysis/api-e2e-round12-frontend-task-agent-failure.md`
- API/E2E Round 14 worker-row semantics reroute: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/tickets/done/runtime-tool-mcp-unification-analysis/api-e2e-round14-worker-row-semantics-reroute.md`
- API/E2E Round 17 worker-row focus failure: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/tickets/done/runtime-tool-mcp-unification-analysis/api-e2e-round17-worker-row-focus-failure.md`
- API/E2E Round 18 stale worker route failure: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/tickets/done/runtime-tool-mcp-unification-analysis/api-e2e-round18-stale-worker-route-failure.md`
- Prior code review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/tickets/done/runtime-tool-mcp-unification-analysis/review-report.md`
- Delivery docs sync report: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/tickets/done/runtime-tool-mcp-unification-analysis/docs-sync-report.md`
- Delivery handoff summary: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/tickets/done/runtime-tool-mcp-unification-analysis/handoff-summary.md`
- Delivery release/deployment report: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/tickets/done/runtime-tool-mcp-unification-analysis/release-deployment-report.md`
- Delivery Electron rebuild failure log: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/tickets/done/runtime-tool-mcp-unification-analysis/delivery-evidence/round-8/electron-rebuild-failure.log`
- Delivery latest-base conflict reroute: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/tickets/done/runtime-tool-mcp-unification-analysis/delivery-latest-base-conflict-reroute.md`
- Delivery Round 20 Electron rebuild log after latest-base merge: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/tickets/done/runtime-tool-mcp-unification-analysis/delivery-evidence/round-20/electron-rebuild-after-origin-personal-merge.log`
- Delivery Round 20 post-conflict targeted Vitest log: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/tickets/done/runtime-tool-mcp-unification-analysis/delivery-evidence/round-20/post-conflict-targeted-vitest.log`

## What Changed

- Aligned implementation with Architecture Review Round 7 and re-checked against Architecture Review Round 8. Round 8 was a clarification-only pass; no source implementation delta was required beyond the current schema/parser/lifecycle state.
- `delegate_tasks.tasks[]` model-facing schema is now exactly:
  - `member_name` — exact logical team member/template name from the current roster.
  - required rich `description`.
  - optional `reference_files`.
- Removed model-facing `assignee_name`, `task_name`, `dependencies`, `completion_criteria`, and `expected_deliverables` from the task-delegation input type, parser, parameter schema, docs, work packets, E2E payloads, and focused tests. Parser objects are strict, so stale fields are rejected before ledger mutation.
- Replaced the generic model-facing `update_task_status` surface with explicit-intent tools: `mark_task_completed`, `mark_task_failed`, and `accept_task`.
- Task-agent result tools are selector-free and do not accept `status`, `task_id`, `task_name`, `summary`, `deliverables`, or other task selectors. `mark_task_completed` / `mark_task_failed` require a result `message` and may include `reference_files`; the task is resolved from caller task-agent instance/run context.
- Original-delegator acceptance now uses `accept_task` with the generated `task_id` from the completion notification plus optional `message`, authorized against the stored original delegator identity.
- Kept internal task identity in ledger/events/metadata only. The work packet renders a derived task label for human display but does not instruct the worker to pass any task selector.
- Updated `TaskDelegationService` to enforce selector-free updates:
  - resolves records by caller `taskAgentRunId` / task-agent context;
  - rejects unbound task-agent contexts;
  - rejects ambiguous task-agent bindings;
  - verifies caller logical member and internal task-agent instance/task context still match the bound record.
- Preserved one runnable task -> one concrete task-agent instance activation. Same-member parallel tasks receive distinct task-agent run IDs and cannot update each other's tasks through model-facing selectors.
- Replaced terminal result storage/projection from deliverable objects to optional `message` plus string `reference_files`.
- Updated activation/status/reported-completion events plus original-delegator notifications/coordinator-visible fallback to carry task label, member identity, exact delegator identity, optional message/reference files, and task-agent identity. Accepted status updates carry acceptance message/timestamp and schedule settlement.
- Updated runtime and work-packet instructions to say task-agent execution uses `mark_task_completed` / `mark_task_failed`, must not pass `status` or task selectors, and acceptance uses `accept_task` with the generated `task_id` only from the original delegator.
- Kept mandatory delayed final task-agent settlement for supported server-managed paths and native AutoByteus pure-team gating while native task-agent/per-member settlement remains unsupported.
- Tightened Claude task-delegation MCP schema object generation for nested task items so stale fields are not accepted by the runtime projection layer before service parsing.
- Carried forward earlier fixes: obsolete legacy `autobyteus-ts` task-tool imports/tests are gone, canonical task-delegation activation/status events are emitted, and pre-activation/unbound status transitions reject without mutation.
- CR-004 local fix: native AutoByteus standalone/mixed custom data now carries task-agent instance identity (`taskAgentInstanceId`, `taskAgentRunId`, `taskId`, and `logicalMemberRouteKey`) from `MemberTeamContext.taskAgentInstance`; native task-delegation context parsing maps those fields into caller identity so selector-free task-agent result tools cannot fall back to logical member-only identity on Mixed AutoByteus task-agent workers.
- CR-005 local fix: canonical runtime-exposed `delegate_tasks` manifest and parameter-schema descriptions now state that task items are ready-to-run, dependencies must not be encoded in a task item, and dependent follow-up work should be delegated later after the framework terminal/completion notification.
- Round 9 frontend task-agent lifecycle UX alignment:
  - server team member input/work-packet websocket payloads now carry `task_agent_instance_id`, `task_agent_run_id`, and `task_id` when the input belongs to a concrete task-agent instance, so the frontend can create/route a transient task-agent entity from the work-packet echo itself;
  - team WebSocket streaming now projects concrete task-agent identity into transient frontend member nodes/agent contexts keyed by `task_agent_run_id`;
  - task-agent work-packet echoes, stream segments, tool/status events, and conversation messages route to the transient task-agent entity instead of the logical worker row after the task-agent identity is observed;
  - multiple same-member task-agent instances render as distinct transient entities with separate conversations;
  - backend offline/settlement status removes the transient task-agent entity and focus falls back to the logical member/coordinator;
  - transient task-agent rows/cards are labeled as `Task agent`, are excluded from historical member hydration, and do not expose the shared user composer as if they were logical roster members.
- CR-006 local fix: frontend protocol types now own task-agent stream/tool/status identity through a reusable `TaskAgentIdentityPayload` / `TeamStreamIdentityPayload` shape. Relevant team-scoped stream, status, lifecycle, external-user-message, compaction, and tool payload interfaces compose that shape, and task-agent identity extraction no longer depends on an untyped `Record<string, unknown>` payload cast.
- CR-007 local fix: approval-required task-agent tool calls now preserve and route by concrete task-agent run identity.
  - Frontend approval targets, parsed tool activities, and `APPROVE_TOOL` / `DENY_TOOL` command payloads carry `task_agent_run_id`.
  - Server command parsing passes that concrete run guard through `TeamRun` / backend interfaces.
  - Codex, Claude, and Mixed server-managed team managers route approvals to the active task-agent registry/handle when a task-agent run ID is present, instead of falling back to the logical member run.
  - Focused tests prove typed task-agent tool payload routing on the frontend and active task-agent-run approval routing on the server.
- Round 12 API/E2E local fix for frontend task-agent visibility/approval:
  - Added a workspace-level active task-agent activity bar that is visible in team focus/grid/spotlight modes whenever concrete task-agent instances are present in the active team context.
  - The bar renders each transient task-agent entity as a distinct visible card keyed by concrete `taskAgentRunId`/`memberRouteKey`, displays the run identity and status, and emits member selection for focused conversation inspection.
  - Pending task-agent tool approvals are surfaced directly on the task-agent entity card with `Approval required`, tool name, and inline approve/deny buttons.
  - Inline task-agent approval buttons call the team approval path with the concrete `taskAgentRunId` plus logical member/source route guard, so the browser can send `APPROVE_TOOL` / `DENY_TOOL` with `task_agent_run_id` even when the coordinator remains focused.
  - Task-agent context projection now replaces team context maps/member tree arrays when adding/removing transient task-agent entities, avoiding missed Vue/Pinia updates from nested in-place mutations.
- Delivery Round 8 Electron packaging local fix:
  - Localized the new task-agent UI labels through the existing web `$t(...)` localization system instead of hardcoded literals.
  - Added English and Simplified Chinese message entries for the task-agent badge, active task-agent activity bar title, and approval-required badge.
  - The delivery-blocking `audit:localization-literals` step now passes with zero unresolved findings. Implementation did not re-run the Electron packaging command itself; delivery still owns the final `build:electron:mac` retry after code review.
- CR-008 local fix:
  - Replaced the remaining raw `Deny` / `Approve` button labels in `TeamTaskAgentActivityBar.vue` with existing localized approval-action keys from `ToolCallIndicator`.
  - No new component-owned keys were needed because the shared approval action labels already exist in the generated workspace localization catalogs for English and Simplified Chinese.
- Round 14 worker-row semantics alignment:
  - Added an explicit active-execution member projection for frontend team execution surfaces.
  - After the 2026-06-01 architecture clarification, that projection keeps logical members visible as stable parent/template rows and renders concrete task-agent instances as distinct child/near-child rows under the matching logical parent.
  - Offline/available logical assignees remain visible after the final concrete task-agent instance settles, but the settled task-agent child is removed.
  - Task-agent settlement focus fallback removes only the concrete child; parent visibility is preserved and any parent `Offline`/available status is member/template status, not completed task-agent execution status.
  - `TeamWorkspaceView` derives header/status/avatar/composer state from the active-execution focused route while task-agent packet/tool/status streams remain routed to concrete task-agent child contexts.
  - The roster/topology panel is explicitly labeled as a logical roster and non-active task execution when it shows logical members.
- CR-009 / CR-010 local fix for active-execution focus/row bypasses:
  - `AgentTeamEventMonitor`, `activeContextStore`, `agentTeamRunStore`, and `ContextFilePathInputArea` now use the store-owned active-execution focused route/context/node instead of raw logical `focusedMemberRouteKey` for focus-mode body, active context, send/interrupt target, and context-file draft ownership.
  - `agentTeamContextsStore` exposes active-execution focus getters as the single frontend boundary for these consumers, preserving the raw logical focus only for roster/template state.
  - `RunningTeamRow` now renders the active-execution projection instead of raw `memberTree`, including logical member parents and any active task-agent child rows.
  - Added focused tests for stale logical worker focus after task-agent settlement across focus-mode display, active-context interrupt routing, send target/draft ownership, and expanded running-team sidebar projection.
- API/E2E Round 10 / Round 17 worker-row focus local fix:
  - The run-history/workspace team tree now projects active local team contexts through the same active-execution member projection before rendering member rows.
  - Under the latest parent/child semantics, task-delegation logical workers remain clickable parent/template rows, while task-agent packet/tool/completed conversation content is not rendered as the parent member's normal conversation.
  - Stale workspace/history member-row selection is still guarded through `selectTreeRunFromHistory`, but logical parent selection is now valid when the parent row is visible.
  - Run-history team-node focus resolves to a visible active-execution row instead of a removed child.
- API/E2E Round 11 / Round 18 stale-route local fix:
  - Active team opening resolves a requested `workspaceExecutionMemberRouteKey` against the active-execution projection before hydration/open state is applied.
  - Under the latest parent/child semantics, a URL or workspace execution link targeting the logical worker can focus that parent row, but task-agent-only projection content is suppressed from the parent conversation surface.
  - Focused `openTeamRun` coverage now proves logical parent focus remains valid while task-agent-only history does not promote the parent into a completed task-agent execution row.
- CR-011 local fix:
  - Active team opening resolves the final focused route from the hydrated active-execution projection for every live open, including no pre-existing context and existing-but-unsubscribed active contexts.
  - Live team-run hydration continues to use the active-execution projection before returning the hydration payload.
  - The 2026-06-01 parent/child UX clarification supersedes the earlier stronger exclusion rule: a logical worker whose projection only contains task-agent activation packet/history remains visible as a parent/template row, but those task-agent work-packet messages are not displayed through the parent normal conversation surface.
  - Focused run-history/open tests cover direct stale URL/link opening with no existing context and with an existing unsubscribed active context under the latest parent visibility semantics.
- Delivery latest-base integration local fix:
  - Reviewed the merge of latest `origin/personal` (`27f19cdef8101bb94ed1fad7fae6b9228bfec9fb`) into the ticket branch (`a64978a3447d49e147be3d5f6bc9398ad1d72ef6`) and took implementation ownership of the conflict-resolution local fix reported by delivery.
  - Confirmed `compactionTypes.ts` preserves this ticket's `TeamStreamIdentityPayload` inheritance for task-agent/team-stream identity while also accepting the latest base compaction status/provenance fields.
  - Confirmed `AgentTeamEventMonitor.spec.ts` no longer asserts a stale direct `compactionStatus` prop after latest base moved compaction display through `AgentEventMonitor`'s activity-store-derived compaction rows, while preserving the active-execution focus regression coverage from this ticket.
- 2026-06-01 / Architecture Review Round 12 delegation-authority local fix:
  - `delegate_tasks` remains available to any authorized active team agent context when exposed by runtime tooling; service authorization now validates the caller against the active team member roster instead of assuming coordinator-only delegation.
  - The model-facing schema still has no `delegator` field. Strict parser coverage now rejects stale/model-supplied `delegator`, and runtime descriptions/instructions tell agents the framework derives the delegator from tool context.
  - `TaskDelegationService` stores exact original delegator identity in the ledger, including `taskAgentInstanceId`, `taskAgentRunId`, `taskId`, and `logicalMemberRouteKey` when the delegator is itself a concrete task-agent.
  - Terminal completion notification now first targets that exact original delegator run when it is a task-agent, and still records coordinator-visible fallback history without retargeting the task-agent through the logical member normal run.
  - TeamRun/backend post-message APIs accept an optional concrete member/task-agent run guard. Codex, Claude, and Mixed server-managed managers route guarded task-agent messages to the active task-agent registry/handle; native pure-team rejects unsupported task-agent-run post targeting.
  - Work packets include the delegating task-agent run ID for nested delegation auditability while preserving selector-free task-agent result tools.
  - Focused unit/integration tests cover task-agent-as-delegator child work, exact delegator identity in terminal payloads, original task-agent-run notification plus coordinator fallback, strict `delegator` rejection, runtime guidance, and backend task-agent post-message routing.
- 2026-06-01 / Architecture Review Round 13 completion acceptance local fix:
  - Worker-reported completion now transitions delegated tasks to `awaiting_acceptance` rather than final settlement, preserving the task-agent child/addressability for revision.
  - Original-delegator acceptance uses `accept_task({ task_id })`, validates exact stored delegator identity (including task-agent delegator identity for nested delegation), transitions the record to `accepted`, and requests delayed settlement only after acceptance.
  - The settlement coordinator records idle task-agent observations so a task-agent that became idle before acceptance still settles immediately after acceptance when no bound work remains.
  - Completion notifications include generated `task_id`, target logical member, `task_agent_id`, `task_agent_run_id`, reported status, message, reference files, and explicit revision/acceptance instructions.
  - `send_message_to` accepts notification-provided `task_agent_id` / `task_agent_run_id`; Codex, Claude, and Mixed server-managed delivery routes revision messages to the concrete task-agent run, while native pure-team rejects unsupported task-agent-targeted delivery.
  - Failure reports remain failure-terminal by explicit policy and schedule idle-gated settlement without acceptance.
  - Focused tests cover awaiting-acceptance transitions, revision before acceptance, exact original-delegator acceptance (including task-agent delegators), task-agent-targeted revision routing, parser/schema contracts, and the updated live mixed-runtime E2E acceptance prompt.

- 2026-06-01 frontend parent/child task-agent UX local fix:
  - Logical team members now remain visible as stable member/template parent rows even when they are offline/available and have no direct conversation.
  - Concrete task-agent instances remain the execution children. The active-execution flattener orders task-agent nodes directly after their `logicalMemberRouteKey` parent and indents them in grid/running-team surfaces.
  - Task-agent display labels use parent/child wording (`worker · task_0001`) instead of treating the logical parent row as the task execution row.
  - Parent member tiles are explicitly labeled `Member`; task-agent child tiles remain labeled `Task agent`.
  - Task-agent work-packet-only conversations are suppressed from logical parent preview/focus surfaces so task packets/tools/status history are not rendered as the parent's normal conversation.
  - Focused tests were updated to assert parent visibility, task-agent child ordering, child removal with parent preservation, and work-packet suppression on the parent surface.

## Key Files Or Areas

- Task delegation service/domain:
  - `autobyteus-server-ts/src/agent-team-execution/task-delegation/*`
  - `autobyteus-server-ts/src/agent-team-execution/domain/task-agent-instance.ts`
- Model-facing task-delegation tools:
  - `autobyteus-server-ts/src/agent-tools/task-delegation/*`
  - `autobyteus-server-ts/tests/unit/agent-tools/task-delegation/task-delegation-runtime-descriptions.test.ts`
- Task-agent lifecycle/backend registries:
  - `autobyteus-server-ts/src/agent-team-execution/domain/team-run.ts`
  - `autobyteus-server-ts/src/agent-team-execution/backends/team-run-backend.ts`
  - `autobyteus-server-ts/src/agent-team-execution/backends/team-manager.ts`
  - `autobyteus-server-ts/src/agent-team-execution/backends/common/server-managed-task-agent-instance-registry.ts`
  - `autobyteus-server-ts/src/agent-team-execution/backends/common/server-managed-team-member-projections.ts`
  - Codex/Claude/Mixed backend managers and run backends.
- Native AutoByteus standalone/mixed custom team context:
  - `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-team-communication-context-builder.ts`
  - `autobyteus-server-ts/src/agent-tools/task-delegation/task-delegation-autobyteus-context.ts`
  - `autobyteus-server-ts/tests/unit/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.test.ts`
- Runtime projections/instructions/events:
  - `autobyteus-server-ts/src/agent-execution/backends/codex/task-delegation/build-task-delegation-dynamic-tool-registrations.ts`
  - `autobyteus-server-ts/src/agent-execution/backends/claude/task-delegation/build-claude-task-delegation-tool-definitions.ts`
  - `autobyteus-server-ts/src/agent-team-execution/services/member-run-instruction-composer.ts`
  - `autobyteus-server-ts/src/services/agent-streaming/team-run-event-websocket-message-mapper.ts`
  - `autobyteus-server-ts/src/agent-execution/domain/agent-status-payload.ts`
- Native AutoByteus pure-team gating:
  - `autobyteus-server-ts/src/agent-team-execution/backends/autobyteus/autobyteus-agent-config-builder.ts`
  - `autobyteus-server-ts/src/agent-team-execution/backends/autobyteus/autobyteus-team-run-backend.ts`
- Durable validation/tests updated:
  - `autobyteus-server-ts/tests/unit/agent-team-execution/task-delegation-service.test.ts`
  - `autobyteus-server-ts/tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts`
  - `autobyteus-server-ts/tests/unit/agent-team-execution/member-run-instruction-composer.test.ts`
  - `autobyteus-server-ts/tests/unit/agent-team-execution/autobyteus-agent-config-builder.test.ts`
  - `autobyteus-server-ts/tests/unit/agent-tools/task-delegation/task-delegation-runtime-descriptions.test.ts`
  - `autobyteus-server-ts/tests/e2e/runtime/mixed-task-delegation.e2e.test.ts`
  - `autobyteus-ts/tests/unit/task-management/tools/task-tools/legacy-task-tools-removed.test.ts`
  - `autobyteus-ts/tests/unit/agent-team/bootstrap-steps/agent-configuration-preparation-step.test.ts`
- Frontend task-agent UX projection:
  - `autobyteus-server-ts/src/agent-team-execution/domain/team-run-event.ts`
  - `autobyteus-server-ts/src/agent-team-execution/services/team-member-input-event-builder.ts`
  - `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-agent-member-handle.ts`
  - `autobyteus-server-ts/src/services/agent-streaming/team-member-input-message-payload.ts`
  - `autobyteus-server-ts/tests/unit/services/agent-streaming/agent-team-stream-handler.test.ts`
  - `autobyteus-web/services/agentStreaming/TeamStreamingService.ts`
  - `autobyteus-web/services/agentStreaming/teamTaskAgentContextProjection.ts`
  - `autobyteus-web/utils/teamActiveExecutionMembers.ts`
  - `autobyteus-web/types/agent/AgentTeamContext.ts`
  - `autobyteus-web/services/agentStreaming/protocol/messageTypes.ts`
  - `autobyteus-web/services/agentStreaming/protocol/teamStreamIdentityTypes.ts`
  - `autobyteus-web/services/agentStreaming/protocol/externalUserMessageTypes.ts`
  - `autobyteus-web/services/agentStreaming/protocol/compactionTypes.ts`
  - `autobyteus-web/services/agentStreaming/handlers/toolLifecycleParsers.ts`
  - `autobyteus-web/types/segments.ts`
  - `autobyteus-web/components/workspace/team/TeamMemberMonitorTile.vue`
  - `autobyteus-web/components/workspace/team/TeamGridView.vue`
  - `autobyteus-web/components/workspace/team/TeamSpotlightView.vue`
  - `autobyteus-web/components/workspace/team/TeamWorkspaceView.vue`
  - `autobyteus-web/components/workspace/team/AgentTeamEventMonitor.vue`
  - `autobyteus-web/components/workspace/running/RunningTeamRow.vue`
  - `autobyteus-web/components/agentInput/ContextFilePathInputArea.vue`
  - `autobyteus-web/stores/activeContextStore.ts`
  - `autobyteus-web/stores/agentTeamRunStore.ts`
  - `autobyteus-web/stores/runHistoryTeamRows.ts`
  - `autobyteus-web/stores/runHistoryTeamHelpers.ts`
  - `autobyteus-web/stores/runHistorySelectionActions.ts`
  - `autobyteus-web/services/runHydration/teamRunContextHydrationService.ts`
  - `autobyteus-web/services/runOpen/teamRunOpenCoordinator.ts`
  - `autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue`
  - `autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue`
  - `autobyteus-web/components/workspace/team/TeamTaskAgentActivityBar.vue`
  - `autobyteus-web/components/workspace/team/TeamMembersPanel.vue`
  - `autobyteus-web/localization/messages/en/workspace.ts`
  - `autobyteus-web/localization/messages/zh-CN/workspace.ts`
  - `autobyteus-web/stores/agentTeamContextsStore.ts`
  - `autobyteus-web/composables/useTeamMemberPresentation.ts`
  - `autobyteus-web/services/agentStreaming/__tests__/TeamStreamingService.spec.ts`
  - `autobyteus-web/components/workspace/team/__tests__/TeamMemberMonitorTile.spec.ts`
  - `autobyteus-web/components/workspace/team/__tests__/TeamGridView.spec.ts`
  - `autobyteus-web/components/workspace/team/__tests__/TeamSpotlightView.spec.ts`
  - `autobyteus-web/components/workspace/team/__tests__/TeamWorkspaceView.spec.ts`
  - `autobyteus-web/components/workspace/team/__tests__/AgentTeamEventMonitor.spec.ts`
  - `autobyteus-web/components/workspace/running/__tests__/RunningTeamRow.spec.ts`
  - `autobyteus-web/stores/__tests__/activeContextStore.spec.ts`
  - `autobyteus-web/stores/__tests__/agentTeamRunStore.spec.ts`
  - `autobyteus-web/components/agentInput/__tests__/ContextFilePathInputArea.spec.ts`
  - `autobyteus-web/stores/__tests__/runHistoryStore.spec.ts`
  - `autobyteus-web/services/runOpen/__tests__/teamRunOpenCoordinator.spec.ts`
  - `autobyteus-web/components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts`
  - `autobyteus-web/components/workspace/team/__tests__/TeamTaskAgentActivityBar.spec.ts`
- Task-agent tool approval routing:
  - `autobyteus-server-ts/src/services/agent-streaming/agent-team-stream-handler.ts`
  - `autobyteus-server-ts/src/services/agent-streaming/team-command-selector-parser.ts`
  - `autobyteus-server-ts/src/agent-team-execution/domain/team-run.ts`
  - `autobyteus-server-ts/src/agent-team-execution/backends/team-run-backend.ts`
  - `autobyteus-server-ts/src/agent-team-execution/backends/team-manager.ts`
  - `autobyteus-server-ts/src/agent-team-execution/backends/common/server-managed-task-agent-instance-registry.ts`
  - `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-team-member-registry.ts`
  - Codex/Claude/Mixed backend managers and run backends.
  - `autobyteus-server-ts/tests/unit/services/agent-streaming/agent-team-stream-handler.test.ts`
  - `autobyteus-server-ts/tests/unit/agent-team-execution/team-manager-member-interrupt.test.ts`
  - `autobyteus-web/services/agentStreaming/handlers/__tests__/toolLifecycleParsers.spec.ts`

## Important Assumptions

- `member_name` is an exact logical team roster member/template name. Route-key aliases are intentionally not accepted by the model-facing schema.
- The server generates internal task identity and may derive a display label from `description`; the model never supplies `task_name`.
- `mark_task_completed` and `mark_task_failed` are valid only from a task-agent instance bound to exactly one delegated task. The model-facing result tools take no selector; internal task-agent context is the selector. `accept_task` is original-delegator-only and uses the generated task id from the completion notification.
- Dependency authoring/dependent activation remains deferred out of this first ticket. `delegate_tasks` accepts only ready-to-run work items; dependent follow-up work is sequenced by the delegator by waiting for completion notification and then calling `delegate_tasks` again. Multiple submitted tasks are independent and activated according to current task-agent concurrency behavior.
- Supported server-managed paths must settle each final task-agent instance after terminal status once the current turn is safe, idle/offline is observed, and no current delegated work remains for that task-agent instance.
- Native AutoByteus pure-team task delegation remains hidden/gated until native task-agent/per-member settlement is implemented and validated.
- Approval-required task-agent tool calls require both the logical member selector and the concrete `task_agent_run_id`; the logical selector guards roster/member ownership while the run ID routes the approval/denial to the active task-agent instance.
- `delegate_tasks` authorization is context-derived: any authorized active team agent can delegate when the tool is exposed, but the model cannot supply or spoof a delegator/task selector.
- Nested delegation completion routes to the original task-agent delegator run when reachable and also leaves team/coordinator-visible fallback history.

## Known Risks / Follow-Ups

- The delegation ledger is in-memory per active `TeamRun`; durable recovery remains out of scope.
- Rejected task-agent activation rolls the task back to `not_started` and reports the rejection to the tool caller. There is no independent retry scheduler in this ticket.
- Native AutoByteus pure-team task delegation is intentionally gated rather than implemented.
- Live mixed-runtime validation with LMStudio/Codex flags was not re-run by implementation; API/E2E owns that environment. The repository E2E was updated to use `member_name`, explicit `mark_task_completed` / `accept_task` calls, and to assert task-agent-run settlement after acceptance-gated completion.
- Live nested-delegation runtime validation was not run by implementation; focused server unit/integration tests cover the service/backend routing contract and API/E2E owns live validation.
- Live browser/API E2E for the new frontend transient task-agent card/row behavior was not re-run by implementation; API/E2E owns that environment. Implementation added focused frontend unit coverage and a Nuxt production build check.
- Live browser/API E2E for the Round 14/Round 17/Round 18/CR-011 and 2026-06-01 parent/child worker-row semantics clarification was not re-run by implementation; API/E2E owns that environment. Implementation added focused frontend coverage for active-execution projection, parent visibility, child ordering/removal, focus-mode display, active command targets, draft ownership, running-team sidebar projection, run-history/workspace tree projection, stale history-row selection guards, stale URL/workspace execution link focus handling, and task-agent-work-packet suppression on the logical parent surface.
- Electron packaging was not re-run by implementation after the localization local fix; delivery owns that packaging command. Implementation re-ran the blocking localization audit plus targeted frontend checks and a Nuxt production build.
- Electron packaging was not re-run by implementation after the latest-base conflict local fix; delivery already produced the integrated Round 20 Electron rebuild evidence before routing back, and implementation re-ran source/test/build checks around the conflict-resolution files.
- `pnpm -C autobyteus-server-ts typecheck` remains unsuitable in this repo shape because `tsconfig.json` includes tests while `rootDir` is `src` (TS6059). Build/type coverage used `tsconfig.build.json` and executable focused tests instead.
- `pnpm -C autobyteus-web exec tsc -p tsconfig.json --noEmit` remains unsuitable as a broad local gate in the current repo shape because it includes many existing test/SFC and unrelated type errors. Nuxt production build and focused Vitest coverage were used for this frontend change.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Feature + behavior change + material refactor.
- Reviewed root-cause classification: Boundary/ownership issue, lifecycle invariant, identity split, stale model-facing schema/selectors, and unsupported runtime exposure.
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): Refactor Needed Now.
- Implementation matched the reviewed assessment (`Yes`/`No`): Yes.
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): N/A; Round 8 architecture review passed before this refreshed alignment.
- Evidence / notes: Runtime adapters call the server-owned task delegation boundary; task-agent lifecycle is explicit; stale schema fields/selectors are rejected; native pure-team exposure is gated until settlement support exists; frontend runtime projection now preserves concrete task-agent identity as a transient child entity under the logical roster member, active execution surfaces/actions/history-tree selections plus stale workspace execution links consume one active-execution projection/focus boundary, and task delegation now derives/stores exact original delegator identity for non-coordinator and task-agent delegators.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None` for removed legacy task-plan model-facing tools, stale `delegate_tasks` fields, or stale generic status selectors.
- Legacy old-behavior retained in scope: `No`.
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes` for legacy task tools and stale task-delegation fields/selectors.
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`.
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): `Yes`.

## Local Implementation Checks Run

### 2026-06-02 Architecture Review Round 14 Explicit-Intent Task API Reconciliation Checks

- Source size check on changed explicit-intent task-delegation source files — passed; all checked implementation files remain below the `500` effective non-empty-line hard guardrail:
  - `task-delegation-service.ts` `282`, `task-delegation-ledger.ts` `265`, `task-delegation-record.ts` `149`, `task-delegation-tool-service.ts` `133`, `task-delegation-tool-manifest.ts` `97`, `task-delegation-tool-parameter-schemas.ts` `95`, `task-delegation-tool-input-parsers.ts` `63`, `mark-task-completed.ts` `49`, `mark-task-failed.ts` `49`, `accept-task.ts` `49`.
- `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-team-execution/task-delegation-service.test.ts tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts tests/unit/agent-tools/task-delegation/task-delegation-runtime-descriptions.test.ts tests/unit/agent-team-execution/member-run-instruction-composer.test.ts tests/unit/agent-team-execution/autobyteus-agent-config-builder.test.ts tests/unit/agent-execution/shared/configured-agent-tool-exposure.test.ts tests/unit/agent-execution/backends/autobyteus/autobyteus-mixed-tool-exposure.test.ts tests/unit/agent-execution/backends/codex/team-communication/team-member-codex-thread-bootstrap-strategy.test.ts tests/unit/agent-execution/backends/claude/session/build-claude-session-mcp-servers.test.ts tests/unit/agent-execution/backends/claude/session/claude-session-tool-gating.test.ts` — passed: `10` files / `49` tests. Vitest emitted existing tool-registration/stdout and Node SQLite experimental warnings only.
- `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit` — passed.
- `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/mixed-task-delegation.e2e.test.ts --no-file-parallelism` — passed with default gating skip: `1` file / `1` skipped test.
- `pnpm -C autobyteus-ts build` — passed, including runtime dependency verification.
- Explicit API surface sweep:
  - `rg -n "update_task_status|UPDATE_TASK_STATUS|UpdateTaskStatus|updateTaskStatus|parseUpdateTaskStatus|buildUpdateTaskStatus" autobyteus-server-ts/src autobyteus-server-ts/tests` — only matched legacy-removal/gating coverage for stale `update_task_status` (`LEGACY_LOCAL_TASK_TOOL_NAMES` and tests proving it is not enabled).
  - `rg -n "in_progress" autobyteus-server-ts/src/agent-tools/task-delegation autobyteus-server-ts/tests/unit/agent-tools/task-delegation autobyteus-server-ts/tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts autobyteus-server-ts/tests/unit/agent-team-execution/task-delegation-service.test.ts` — passed with no matches.
- `git diff --check` — passed.

### 2026-06-01 Delegation-Authority Round 12 Local Fix Checks

- Source size check on changed server source files — passed: `task-delegation-record.ts` `139` effective lines, `task-delegation-ledger.ts` `230`, `task-delegation-input-resolver.ts` `157`, `task-delegation-service.ts` `180`, `task-delegation-completion-notifier.ts` `84`, `server-managed-task-agent-instance-registry.ts` `272`, `codex-team-manager.ts` `497`, `claude-team-manager.ts` `492`, `mixed-team-manager.ts` `497`, all changed server source files below the `500` effective-line hard guard.
- `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-team-execution/task-delegation-service.test.ts tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts tests/unit/agent-tools/task-delegation/task-delegation-runtime-descriptions.test.ts tests/unit/agent-team-execution/member-run-instruction-composer.test.ts tests/unit/agent-team-execution/team-manager-member-interrupt.test.ts tests/unit/agent-team-execution/team-run.test.ts tests/integration/agent-team-execution/codex-team-run-backend.integration.test.ts tests/integration/agent-team-execution/claude-team-run-backend.integration.test.ts tests/integration/agent-team-execution/mixed-team-run-backend.integration.test.ts` — passed: `9` files / `56` tests. Vitest emitted existing tool-registration/stdout and Node SQLite experimental warnings only.
- `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit` — passed.
- `git diff --check` — passed.

### 2026-06-01 Parent/Child Task-Agent UX Local Fix Checks

- Source size check on changed frontend source files — passed: `teamActiveExecutionMembers.ts` `99` effective lines, `teamTaskAgentContextProjection.ts` `229`, `TeamMemberMonitorTile.vue` `173`, `AgentTeamEventMonitor.vue` `99`, `TeamTaskAgentActivityBar.vue` `178`.
- `pnpm -C autobyteus-web exec vitest run components/workspace/team/__tests__/TeamGridView.spec.ts components/workspace/team/__tests__/TeamSpotlightView.spec.ts components/workspace/running/__tests__/RunningTeamRow.spec.ts components/workspace/team/__tests__/TeamMemberMonitorTile.spec.ts components/workspace/team/__tests__/AgentTeamEventMonitor.spec.ts services/agentStreaming/__tests__/TeamStreamingService.spec.ts stores/__tests__/runHistoryStore.spec.ts components/workspace/team/__tests__/TeamTaskAgentActivityBar.spec.ts` — passed: `8` files / `97` tests. Vitest emitted existing KaTeX quirks warnings and expected mocked websocket error logs only.
- `pnpm -C autobyteus-web exec vitest run components/workspace/team/__tests__/TeamGridView.spec.ts components/workspace/team/__tests__/TeamSpotlightView.spec.ts components/workspace/team/__tests__/TeamWorkspaceView.spec.ts components/workspace/team/__tests__/AgentTeamEventMonitor.spec.ts components/workspace/team/__tests__/TeamTaskAgentActivityBar.spec.ts components/workspace/team/__tests__/TeamMemberMonitorTile.spec.ts components/workspace/running/__tests__/RunningTeamRow.spec.ts components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts stores/__tests__/runHistoryStore.spec.ts stores/__tests__/activeContextStore.spec.ts stores/__tests__/agentTeamRunStore.spec.ts components/agentInput/__tests__/ContextFilePathInputArea.spec.ts services/agentStreaming/__tests__/TeamStreamingService.spec.ts` — passed: `13` files / `165` tests. Vitest emitted existing KaTeX quirks warnings, expected mocked websocket error logs, and the existing terminate-failure test log only.
- `pnpm -C autobyteus-web audit:localization-literals && pnpm -C autobyteus-web guard:localization-boundary && pnpm -C autobyteus-web guard:web-boundary` — passed; localization audit emitted the existing `MODULE_TYPELESS_PACKAGE_JSON` warning only.
- `pnpm -C autobyteus-web build` — passed; Nuxt production client/server/static build completed with the existing large chunk warning only.
- `git diff --check` — passed.

### Delivery Latest-Base Integration Conflict Local Fix Checks

- Conflict marker sweep on the delivery conflict files: `rg -n "<<<<<<<|=======|>>>>>>>" autobyteus-web/components/workspace/team/__tests__/AgentTeamEventMonitor.spec.ts autobyteus-web/services/agentStreaming/protocol/compactionTypes.ts || true` — passed with no matches.
- Source size check: `autobyteus-web/services/agentStreaming/protocol/compactionTypes.ts` is `33` effective non-empty lines.
- `pnpm -C autobyteus-web exec vitest run components/workspace/team/__tests__/AgentTeamEventMonitor.spec.ts services/agentStreaming/__tests__/TeamStreamingService.spec.ts services/agentStreaming/handlers/__tests__/agentStatusHandler.spec.ts components/workspace/agent/__tests__/AgentEventMonitor.spec.ts components/workspace/agent/__tests__/AgentCompactionLiveFlow.spec.ts` — passed: `5` files / `48` tests. Vitest emitted existing KaTeX quirks warnings and expected mocked websocket error logs only.
- `pnpm -C autobyteus-web guard:web-boundary` — passed.
- `pnpm -C autobyteus-web build` — passed; Nuxt production client/server/static build completed with the existing large chunk warning only.
- `git diff --check` — passed.

### Delivery Round 8 Electron Localization Local Fix Checks

- `pnpm -C autobyteus-web audit:localization-literals` — passed with zero unresolved findings. Node emitted the existing `MODULE_TYPELESS_PACKAGE_JSON` warning for the audit script module type.
- `pnpm -C autobyteus-web exec vitest run components/workspace/team/__tests__/TeamTaskAgentActivityBar.spec.ts components/workspace/team/__tests__/TeamMemberMonitorTile.spec.ts` — passed: `2` files / `6` tests.
- `pnpm -C autobyteus-web guard:localization-boundary && pnpm -C autobyteus-web guard:web-boundary` — passed.
- `pnpm -C autobyteus-web build` — passed; Nuxt production client/server/static build completed with the existing large chunk warning only.
- `git diff --check` — passed.

### CR-008 Approval Action Localization Local Fix Checks

- Source sweep: `rg -n ">\\s*(Deny|Approve)\\s*<|\\b(Deny|Approve)\\b" autobyteus-web/components/workspace/team/TeamTaskAgentActivityBar.vue` — passed with no matches.
- `pnpm -C autobyteus-web audit:localization-literals` — passed with zero unresolved findings. Node emitted the existing `MODULE_TYPELESS_PACKAGE_JSON` warning for the audit script module type.
- `pnpm -C autobyteus-web exec vitest run components/workspace/team/__tests__/TeamTaskAgentActivityBar.spec.ts components/workspace/team/__tests__/TeamMemberMonitorTile.spec.ts` — passed: `2` files / `6` tests.
- `pnpm -C autobyteus-web guard:localization-boundary && pnpm -C autobyteus-web guard:web-boundary` — passed.
- `pnpm -C autobyteus-web build` — passed; Nuxt production client/server/static build completed with the existing large chunk warning only.
- `git diff --check` — passed.

### Round 14 Worker-Row Semantics / CR-009 / CR-010 Local Fix Checks

- Source bypass sweep: `rg -n "flattenTeamMemberNodesForDisplay|teamContextsStore\.focusedMember(Context|Node)|activeTeam\.focusedMemberRouteKey|props\.teamRun\.memberTree" autobyteus-web/components/workspace/running/RunningTeamRow.vue autobyteus-web/components/workspace/team/AgentTeamEventMonitor.vue autobyteus-web/stores/activeContextStore.ts autobyteus-web/stores/agentTeamRunStore.ts autobyteus-web/components/agentInput/ContextFilePathInputArea.vue autobyteus-web/components/workspace/team/TeamWorkspaceView.vue || true` — passed with no matches.
- `pnpm -C autobyteus-web exec vitest run stores/__tests__/activeContextStore.spec.ts stores/__tests__/agentTeamRunStore.spec.ts components/agentInput/__tests__/ContextFilePathInputArea.spec.ts components/workspace/team/__tests__/TeamWorkspaceView.spec.ts components/workspace/team/__tests__/AgentTeamEventMonitor.spec.ts components/workspace/running/__tests__/RunningTeamRow.spec.ts` — passed: `6` files / `39` tests.
- `pnpm -C autobyteus-web exec vitest run components/workspace/team/__tests__/TeamGridView.spec.ts components/workspace/team/__tests__/TeamSpotlightView.spec.ts components/workspace/team/__tests__/TeamWorkspaceView.spec.ts components/workspace/team/__tests__/AgentTeamEventMonitor.spec.ts components/workspace/team/__tests__/TeamTaskAgentActivityBar.spec.ts components/workspace/team/__tests__/TeamMemberMonitorTile.spec.ts components/workspace/running/__tests__/RunningTeamRow.spec.ts stores/__tests__/activeContextStore.spec.ts stores/__tests__/agentTeamRunStore.spec.ts components/agentInput/__tests__/ContextFilePathInputArea.spec.ts services/agentStreaming/__tests__/TeamStreamingService.spec.ts` — passed: `11` files / `78` tests.
- `pnpm -C autobyteus-web audit:localization-literals` — passed with zero unresolved findings. Node emitted the existing `MODULE_TYPELESS_PACKAGE_JSON` warning for the audit script module type.
- `pnpm -C autobyteus-web guard:localization-boundary && pnpm -C autobyteus-web guard:web-boundary` — passed.
- `pnpm -C autobyteus-web build` — passed; Nuxt production client/server/static build completed with the existing large chunk warning only.
- `git diff --check` — passed.

### API/E2E Round 10 / Round 17 Worker-Row Focus Local Fix Checks

- Source bypass sweep including run-history/workspace tree paths: `rg -n "flattenTeamMemberNodesForDisplay|teamContextsStore\.focusedMember(Context|Node)|activeTeam\.focusedMemberRouteKey|props\.teamRun\.memberTree" autobyteus-web/components/workspace/running/RunningTeamRow.vue autobyteus-web/components/workspace/team/AgentTeamEventMonitor.vue autobyteus-web/stores/activeContextStore.ts autobyteus-web/stores/agentTeamRunStore.ts autobyteus-web/components/agentInput/ContextFilePathInputArea.vue autobyteus-web/components/workspace/team/TeamWorkspaceView.vue autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue autobyteus-web/stores/runHistorySelectionActions.ts autobyteus-web/stores/runHistoryTeamRows.ts autobyteus-web/stores/runHistoryTeamHelpers.ts || true` — passed with no bypass matches.
- `pnpm -C autobyteus-web exec vitest run stores/__tests__/runHistoryStore.spec.ts components/workspace/team/__tests__/TeamGridView.spec.ts components/workspace/team/__tests__/TeamWorkspaceView.spec.ts components/workspace/running/__tests__/RunningTeamRow.spec.ts components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts stores/__tests__/agentTeamRunStore.spec.ts stores/__tests__/activeContextStore.spec.ts components/agentInput/__tests__/ContextFilePathInputArea.spec.ts components/workspace/team/__tests__/AgentTeamEventMonitor.spec.ts services/agentStreaming/__tests__/TeamStreamingService.spec.ts` — passed: `10` files / `152` tests.
- `pnpm -C autobyteus-web audit:localization-literals && pnpm -C autobyteus-web guard:localization-boundary && pnpm -C autobyteus-web guard:web-boundary` — passed; localization audit emitted the existing `MODULE_TYPELESS_PACKAGE_JSON` warning only.
- `pnpm -C autobyteus-web build` — passed; Nuxt production client/server/static build completed with the existing large chunk warning only.
- `git diff --check` — passed.

### API/E2E Round 11 / Round 18 Stale Worker Route Local Fix Checks

- `pnpm -C autobyteus-web exec vitest run services/runOpen/__tests__/teamRunOpenCoordinator.spec.ts` — passed: `1` file / `5` tests.
- `pnpm -C autobyteus-web exec vitest run services/runOpen/__tests__/teamRunOpenCoordinator.spec.ts stores/__tests__/runHistoryStore.spec.ts components/workspace/team/__tests__/TeamGridView.spec.ts components/workspace/team/__tests__/TeamWorkspaceView.spec.ts components/workspace/running/__tests__/RunningTeamRow.spec.ts components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts stores/__tests__/agentTeamRunStore.spec.ts stores/__tests__/activeContextStore.spec.ts components/agentInput/__tests__/ContextFilePathInputArea.spec.ts components/workspace/team/__tests__/AgentTeamEventMonitor.spec.ts services/agentStreaming/__tests__/TeamStreamingService.spec.ts` — passed: `11` files / `157` tests.
- `pnpm -C autobyteus-web audit:localization-literals && pnpm -C autobyteus-web guard:localization-boundary && pnpm -C autobyteus-web guard:web-boundary` — passed; localization audit emitted the existing `MODULE_TYPELESS_PACKAGE_JSON` warning only.
- `pnpm -C autobyteus-web build` — passed; Nuxt production client/server/static build completed with the existing large chunk warning only.
- `git diff --check` — passed.

### CR-011 Full Active Open Stale Worker Route Local Fix Checks

- `pnpm -C autobyteus-web exec vitest run stores/__tests__/runHistoryStore.spec.ts services/runOpen/__tests__/teamRunOpenCoordinator.spec.ts` — passed: `2` files / `54` tests.
- `pnpm -C autobyteus-web exec vitest run services/runOpen/__tests__/teamRunOpenCoordinator.spec.ts stores/__tests__/runHistoryStore.spec.ts components/workspace/team/__tests__/TeamGridView.spec.ts components/workspace/team/__tests__/TeamWorkspaceView.spec.ts components/workspace/running/__tests__/RunningTeamRow.spec.ts components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts stores/__tests__/agentTeamRunStore.spec.ts stores/__tests__/activeContextStore.spec.ts components/agentInput/__tests__/ContextFilePathInputArea.spec.ts components/workspace/team/__tests__/AgentTeamEventMonitor.spec.ts services/agentStreaming/__tests__/TeamStreamingService.spec.ts` — passed: `11` files / `159` tests.
- `pnpm -C autobyteus-web audit:localization-literals && pnpm -C autobyteus-web guard:localization-boundary && pnpm -C autobyteus-web guard:web-boundary` — passed; localization audit emitted the existing `MODULE_TYPELESS_PACKAGE_JSON` warning only.
- `pnpm -C autobyteus-web build` — passed; Nuxt production client/server/static build completed with the existing large chunk warning only.
- `git diff --check` — passed.

### Round 11 CR-006 / CR-007 Local Fix Checks

- `pnpm -C autobyteus-web exec vitest run components/workspace/team/__tests__/TeamMemberMonitorTile.spec.ts services/agentStreaming/handlers/__tests__/toolLifecycleParsers.spec.ts services/agentStreaming/__tests__/TeamStreamingService.spec.ts` — passed: `3` files / `32` tests.
- `pnpm -C autobyteus-server-ts exec vitest run tests/unit/services/agent-streaming/agent-team-stream-handler.test.ts tests/unit/agent-team-execution/team-manager-member-interrupt.test.ts` — passed: `2` files / `37` tests.
- `pnpm -C autobyteus-server-ts exec vitest run tests/integration/agent-team-execution/codex-team-run-backend.integration.test.ts tests/integration/agent-team-execution/claude-team-run-backend.integration.test.ts tests/integration/agent-team-execution/mixed-team-run-backend.integration.test.ts` — passed: `3` files / `9` tests.
- `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit` — passed.
- `pnpm -C autobyteus-web build` — passed; Nuxt production client/server/static build completed with the existing large chunk warning only.
- `git diff --check` — passed.

### Round 12 Frontend Task-Agent Visibility / Approval Local Fix Checks

- `pnpm -C autobyteus-web exec vitest run components/workspace/team/__tests__/TeamTaskAgentActivityBar.spec.ts` — passed: `1` file / `3` tests.
- `pnpm -C autobyteus-web exec vitest run components/workspace/team/__tests__/TeamTaskAgentActivityBar.spec.ts components/workspace/team/__tests__/TeamMemberMonitorTile.spec.ts services/agentStreaming/handlers/__tests__/toolLifecycleParsers.spec.ts services/agentStreaming/__tests__/TeamStreamingService.spec.ts` — passed: `4` files / `35` tests.
- `pnpm -C autobyteus-web build` — passed; Nuxt production client/server/static build completed with the existing large chunk warning only.
- `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit` — passed.
- `git diff --check` — passed.

### Round 9 Frontend Task-Agent UX Local Fix Checks

- `pnpm -C autobyteus-web exec vitest run services/agentStreaming/__tests__/TeamStreamingService.spec.ts` — passed: `1` file / `23` tests.
- `pnpm -C autobyteus-web exec vitest run components/workspace/team/__tests__/TeamMemberMonitorTile.spec.ts services/agentStreaming/__tests__/TeamStreamingService.spec.ts` — passed: `2` files / `26` tests.
- `pnpm -C autobyteus-web build` — passed; Nuxt production client/server/static build completed.
- `pnpm -C autobyteus-server-ts exec vitest run tests/unit/services/agent-streaming/agent-team-stream-handler.test.ts tests/unit/agent-tools/task-delegation/task-delegation-runtime-descriptions.test.ts` — passed: `2` files / `24` tests.
- `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit` — passed.
- `pnpm -C autobyteus-server-ts build` — passed, including shared package builds, Prisma generation, server `tsc -p tsconfig.build.json`, managed messaging asset copy, and built-in agents bootstrap smoke check.
- Attempted broad frontend typecheck: `pnpm -C autobyteus-web exec tsc -p tsconfig.json --noEmit` — failed on existing broad repo/test/SFC typecheck issues unrelated to this task-agent UX delta; not used as the implementation gate.

### Round 9 CR-005 Local Fix Checks

- Runtime-exposed source wording check: `rg "ready-to-run|dependent follow-up|terminal/completion notification|do not encode dependencies" autobyteus-server-ts/src/agent-tools/task-delegation autobyteus-server-ts/src/agent-execution/backends/codex/task-delegation autobyteus-server-ts/src/agent-execution/backends/claude/task-delegation autobyteus-server-ts/tests/unit/agent-tools/task-delegation` — passed; wording is present in canonical manifest/schema and covered by tests.
- `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-tools/task-delegation/task-delegation-runtime-descriptions.test.ts tests/unit/agent-team-execution/task-delegation-service.test.ts tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts` — passed: `3` files / `15` tests.
- `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit` — passed.

### Round 8 Clarification Re-checks

- Source contract spot-check: `delegate_tasks.tasks[]` parser/schema exposes only `member_name`, required `description`, and optional `reference_files`; `mark_task_completed` / `mark_task_failed` expose only required `message` plus optional `reference_files`; `accept_task` exposes only required `task_id` plus optional `message`. Parser objects are strict.
- Stale field sweep for task-delegation source/tests: `rg "\b(dependencies|task_name|assignee_name|completion_criteria|expected_deliverables|task_id)\b" autobyteus-server-ts/src/agent-tools/task-delegation autobyteus-server-ts/src/agent-team-execution/task-delegation autobyteus-server-ts/tests/unit/agent-team-execution/task-delegation-service.test.ts autobyteus-server-ts/tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts` — source matches are internal event metadata, non-model-facing implementation names, or explicit instructions/rejection tests; no stale model-facing contract fields found.
- `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-team-execution/task-delegation-service.test.ts tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts` — passed: `2` files / `12` tests.

### Round 7 CR-004 Local Fix Checks

- `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.test.ts` — passed: `1` file / `5` tests.
- `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.test.ts tests/unit/agent-team-execution/task-delegation-service.test.ts tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts tests/unit/agent-team-execution/autobyteus-agent-config-builder.test.ts` — passed: `4` files / `18` tests.
- `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit` — passed.
- `pnpm -C autobyteus-server-ts build` — passed, including shared package builds, Prisma generation, server `tsc -p tsconfig.build.json`, managed messaging asset copy, and built-in agents bootstrap smoke check.

### Prior Round 7 Alignment Checks

- `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit` — passed.
- Focused task-agent/task-delegation/server-managed Vitest run — passed: `6` files / `28` tests.
  - `tests/unit/agent-team-execution/task-delegation-service.test.ts`
  - `tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts`
  - `tests/unit/agent-team-execution/member-run-instruction-composer.test.ts`
  - `tests/unit/agent-team-execution/autobyteus-agent-config-builder.test.ts`
  - `tests/unit/agent-team-execution/mixed-team-manager.test.ts`
  - `tests/unit/agent-team-execution/team-run.test.ts`
- Additional server-managed regression run — passed: `4` files / `39` tests.
  - `tests/integration/agent-team-execution/agent-team-run-manager.integration.test.ts`
  - `tests/integration/agent-team-execution/team-run-service.integration.test.ts`
  - `tests/integration/run-history/memory-layout-and-projection.integration.test.ts`
  - `tests/e2e/external-channel/external-channel-team-open-delivery.e2e.test.ts`
- `pnpm -C autobyteus-server-ts build` — passed, including shared package builds, Prisma generation, server `tsc -p tsconfig.build.json`, managed messaging asset copy, and built-in agents bootstrap smoke check.
- Gated live mixed task-delegation E2E command without live flags — passed with skip: `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/mixed-task-delegation.e2e.test.ts --no-file-parallelism` (`1` file / `1` skipped test).
- `pnpm -C autobyteus-ts exec vitest run tests/unit/agent-team/bootstrap-steps/agent-configuration-preparation-step.test.ts tests/unit/task-management/tools/task-tools` — passed: `2` files / `4` tests.
- `pnpm -C autobyteus-ts build` — passed, including runtime dependency verification.
- Stale deleted task-tool import sweep — passed with no matches:
  - `rg "task-management/tools/task-tools/(create-tasks|create-task|assign-task-to|get-my-tasks|get-task-plan-status)|create-tasks\\.js|create-task\\.js|assign-task-to\\.js|get-my-tasks\\.js|get-task-plan-status\\.js" autobyteus-ts/tests autobyteus-ts/src autobyteus-server-ts/tests autobyteus-server-ts/src`
- Round 7 stale schema sweep across relevant source/docs/tests — no source contract/schema/projection occurrences of old model-facing fields remained. Matches are limited to explicit rejection/instruction text saying not to pass stale fields/selectors.


### Round 13 Completion Acceptance / Revision Routing Local Fix Checks

- `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-team-execution/task-delegation-service.test.ts tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts tests/unit/agent-team-execution/team-manager-member-interrupt.test.ts tests/unit/agent-tools/task-delegation/task-delegation-runtime-descriptions.test.ts tests/unit/agent-team-execution/member-run-instruction-composer.test.ts` — passed: `5` files / `47` tests.
- `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit` — passed.
- `git diff --check` — passed.

Round 13 implementation notes:
- Worker task-agent completion now records `awaiting_acceptance`, emits the reported-completion event/notification, and deliberately does not request settlement.
- Original-delegator acceptance uses generated `task_id`, is authorized against the stored original delegator identity, transitions the record to `accepted`, and schedules task-agent settlement only after no-bound-work plus idle gates.
- Revision feedback can use existing `send_message_to` with the notification-provided `recipient_name`, `task_agent_id`, and `task_agent_run_id`; Codex/Claude/Mixed server-managed routing sends that message to the concrete task-agent run instead of the logical member conversation.
- Failure reports remain failure-terminal by explicit policy: `failed` notifies the delegator and schedules idle-gated settlement without requiring acceptance.
- The repository live mixed-runtime E2E prompt/expectations were aligned so the coordinator accepts by generated `task_id` before expecting task-agent offline/settled state.


### CR-012 / CR-013 Task-Agent Child Preservation Local Fix Checks

- Source size check on changed frontend source files — passed: `teamRunOpenCoordinator.ts` `253` effective lines and `teamTaskAgentContextProjection.ts` `308`, both below the `500` effective-line guardrail.
- `pnpm -C autobyteus-web exec vitest run services/runOpen/__tests__/teamRunOpenCoordinator.spec.ts services/agentStreaming/__tests__/TeamStreamingService.spec.ts components/workspace/team/__tests__/TeamTaskAgentActivityBar.spec.ts` — passed: `3` files / `34` tests. Vitest emitted existing KaTeX quirks warnings and expected mocked websocket error logs only.
- `pnpm -C autobyteus-web build` — passed; Nuxt production client/server/static build completed with the existing large chunk warning only.
- `git diff --check` — passed.

CR-012 / CR-013 implementation notes:
- Live re-open/hydration now preserves concrete task-agent child `AgentContext`s and restores/reconstructs their `memberNodesByRouteKey` / `memberTree` entries after active subscribed team metadata refreshes, so running or awaiting-acceptance task-agent children remain visible/addressable instead of being dropped while their contexts survive.
- `ensureTaskAgentContext(...)` now repairs a missing task-agent node/tree entry when the task-agent context already exists, covering streamed status/tool/activity arrivals after any projection refresh that temporarily removed the node.
- Focused run-open expectations were updated for the latest parent-visible semantics: logical member parents remain valid visible/focusable team-member/template rows; stale worker-hidden expectations are no longer the target behavior.
- Focused coverage was added for reconstructing missing live task-agent children through subscribed active-team reopen and for repairing a missing task-agent node from an existing task-agent context on subsequent stream identity.


### API/E2E Round 15 / Round 27 Worker Initializing After Acceptance Local Fix Checks

Change classification: Local implementation defect, not a design issue. The latest design already permits the logical worker parent as roster/topology but forbids using it as the settled task-agent execution subject; this fix keeps that boundary in the frontend active-execution projection and stream routing.

- Source size check on changed frontend source files — passed: `TeamStreamingService.ts` `496` effective lines, `taskAgentRunIdentity.ts` `8`, `teamActiveExecutionMembers.ts` `143`, `runHistoryTeamHelpers.ts` `493`, and `runHistoryTeamRows.ts` `191`, all below the `500` effective-line guardrail.
- `pnpm -C autobyteus-web exec vitest run utils/__tests__/teamActiveExecutionMembers.spec.ts services/agentStreaming/__tests__/TeamStreamingService.spec.ts components/workspace/team/__tests__/TeamGridView.spec.ts components/workspace/team/__tests__/TeamSpotlightView.spec.ts components/workspace/running/__tests__/RunningTeamRow.spec.ts components/workspace/team/__tests__/TeamWorkspaceView.spec.ts stores/__tests__/agentTeamRunStore.spec.ts stores/__tests__/activeContextStore.spec.ts components/agentInput/__tests__/ContextFilePathInputArea.spec.ts services/runOpen/__tests__/teamRunOpenCoordinator.spec.ts stores/__tests__/runHistoryStore.spec.ts` — passed: `11` files / `133` tests. Vitest emitted existing KaTeX quirks warnings and expected mocked error-path logs only.
- `pnpm -C autobyteus-web audit:localization-literals` — passed with zero unresolved findings; emitted the existing `MODULE_TYPELESS_PACKAGE_JSON` warning only.
- `pnpm -C autobyteus-web guard:localization-boundary && pnpm -C autobyteus-web guard:web-boundary` — passed.
- `pnpm -C autobyteus-web build` — passed; Nuxt production client/server/static build completed with the existing large chunk warning only.
- `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit` — passed.
- `git diff --check` — passed.

Round 27 implementation notes:
- Identity-less task-agent status events whose `agent_id` is a concrete task-agent run id are no longer routed through the logical member context when no task-agent projection exists yet. The subsequent identity-bearing task-agent event creates/updates the concrete child as before.
- Active execution member projection now excludes logical member contexts that are task-agent-only conversations or that have been poisoned with a task-agent run id, and stale focus resolves to the coordinator/visible active execution target.
- Running/history/team-open projections now use the same active-execution focus normalization, so stale `worker` route selection cannot keep the active header/body/composer/send/interrupt target on a settled task-only logical worker after accepted settlement.
- Concrete task-agent children remain visible while active/awaiting acceptance and still attach under their logical parent; only task-agent-only settled/poisoned logical-parent active execution is filtered.

## Downstream Validation Hints / Suggested Scenarios

- Re-run code review before API/E2E because implementation and repository-resident E2E validation changed after the previous review.
- API/E2E should re-run the live mixed-runtime task-delegation scenario and verify:
  - coordinator can call `delegate_tasks` with only `member_name`, rich `description`, and optional `reference_files`;
  - worker receives a work packet containing rich `description`, optional references, task-agent instance identity, and explicit result-tool instructions;
  - worker calls `mark_task_completed` or `mark_task_failed` with required `message` plus optional `reference_files` for result reports;
  - stale result-tool selectors such as `status`, `task_id`, and `task_name` are rejected before mutation, while original-delegator acceptance uses `accept_task` plus generated `task_id`;
  - coordinator/original delegator receives reported-completion notification with generated task identity, target member, task-agent identity, reported status, message, and reference files;
  - revision feedback through `send_message_to` with `task_agent_run_id` reaches the same concrete task-agent instance;
  - the task-agent remains addressable while awaiting acceptance, then goes offline/settles only after original-delegator acceptance plus idle/no-bound-work gates.
- Validate same-member parallel tasks produce separate task-agent run IDs and cannot report each other's tasks through model-facing selectors.
- Validate native AutoByteus pure-team agents do not receive server-owned task-delegation tools while native task-agent settlement remains unsupported.
- Validate frontend/browser behavior for task-agent lifecycle:
  - task-agent activation/status/stream payloads create a transient row/card keyed by concrete task-agent run/instance identity;
  - the work packet and subsequent task-agent conversation/tool activity appear on that transient entity, not the logical worker row;
  - multiple same-member task-agent instances render independently;
  - reported completion keeps the task-agent child visible/addressable while awaiting acceptance;
  - accepted/offline backend settlement removes only the settled transient entity.
  - active execution grid/spotlight/header keep the logical member parent visible but do not reuse that parent as the completed task-agent execution row after the concrete child settles;
  - workspace/history team tree rows keep logical parents distinct from task-agent children, and stale child-route clicks route to the resolved visible active-execution target;
  - roster/topology-only views, if visible, are clearly labeled as logical member/template surfaces rather than completed task-agent execution history.
- Validate an approval-required tool call from a task-agent worker:
  - approval request payload includes concrete `task_agent_run_id`;
  - frontend approval/denial command sends that run ID back;
  - server routes approval/denial to the active task-agent run, not the logical member run.

## API / E2E / Executable Validation Still Required

Yes. Implementation-scoped build/unit/integration checks passed, and the gated live E2E file was syntax/execution loaded with the test skipped by default. Full live API/E2E validation of mixed runtime task delegation, reported-completion notification, original-delegator acceptance, revision routing, and mandatory acceptance-gated task-agent settlement remains owned by `api_e2e_engineer` after this package passes code review.
