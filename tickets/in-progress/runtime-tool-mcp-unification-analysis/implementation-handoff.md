# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/tickets/in-progress/runtime-tool-mcp-unification-analysis/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/tickets/in-progress/runtime-tool-mcp-unification-analysis/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/tickets/in-progress/runtime-tool-mcp-unification-analysis/design-spec.md`
- Supplemental analysis: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/tickets/in-progress/runtime-tool-mcp-unification-analysis/task-management-server-migration-analysis.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/tickets/in-progress/runtime-tool-mcp-unification-analysis/design-review-report.md`
- API/E2E validation report: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/tickets/in-progress/runtime-tool-mcp-unification-analysis/api-e2e-validation-report.md`
- API/E2E frontend UX reroute: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/tickets/in-progress/runtime-tool-mcp-unification-analysis/api-e2e-frontend-task-agent-ux-reroute.md`
- API/E2E Round 12 frontend task-agent failure: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/tickets/in-progress/runtime-tool-mcp-unification-analysis/api-e2e-round12-frontend-task-agent-failure.md`
- API/E2E Round 14 worker-row semantics reroute: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/tickets/in-progress/runtime-tool-mcp-unification-analysis/api-e2e-round14-worker-row-semantics-reroute.md`
- API/E2E Round 17 worker-row focus failure: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/tickets/in-progress/runtime-tool-mcp-unification-analysis/api-e2e-round17-worker-row-focus-failure.md`
- API/E2E Round 18 stale worker route failure: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/tickets/in-progress/runtime-tool-mcp-unification-analysis/api-e2e-round18-stale-worker-route-failure.md`
- Prior code review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/tickets/in-progress/runtime-tool-mcp-unification-analysis/review-report.md`
- Delivery docs sync report: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/tickets/in-progress/runtime-tool-mcp-unification-analysis/docs-sync-report.md`
- Delivery handoff summary: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/tickets/in-progress/runtime-tool-mcp-unification-analysis/handoff-summary.md`
- Delivery release/deployment report: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/tickets/in-progress/runtime-tool-mcp-unification-analysis/release-deployment-report.md`
- Delivery Electron rebuild failure log: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/tickets/in-progress/runtime-tool-mcp-unification-analysis/delivery-evidence/round-8/electron-rebuild-failure.log`

## What Changed

- Aligned implementation with Architecture Review Round 7 and re-checked against Architecture Review Round 8. Round 8 was a clarification-only pass; no source implementation delta was required beyond the current schema/parser/lifecycle state.
- `delegate_tasks.tasks[]` model-facing schema is now exactly:
  - `member_name` — exact logical team member/template name from the current roster.
  - required rich `description`.
  - optional `reference_files`.
- Removed model-facing `assignee_name`, `task_name`, `dependencies`, `completion_criteria`, and `expected_deliverables` from the task-delegation input type, parser, parameter schema, docs, work packets, E2E payloads, and focused tests. Parser objects are strict, so stale fields are rejected before ledger mutation.
- `update_task_status` model-facing schema is now exactly:
  - `status`.
  - optional `message`.
  - optional `reference_files`.
- Removed model-facing `task_id`, `task_name`, `summary`, and `deliverables` from `update_task_status`. The service now resolves the bound task only from caller task-agent instance/run context.
- Kept internal task identity in ledger/events/metadata only. The work packet renders a derived task label for human display but does not instruct the worker to pass any task selector.
- Updated `TaskDelegationService` to enforce selector-free updates:
  - resolves records by caller `taskAgentRunId` / task-agent context;
  - rejects unbound task-agent contexts;
  - rejects ambiguous task-agent bindings;
  - verifies caller logical member and internal task-agent instance/task context still match the bound record.
- Preserved one runnable task -> one concrete task-agent instance activation. Same-member parallel tasks receive distinct task-agent run IDs and cannot update each other's tasks through model-facing selectors.
- Replaced terminal result storage/projection from deliverable objects to optional `message` plus string `reference_files`.
- Updated activation/status/terminal events and coordinator notifications to carry task label, member identity, optional message/reference files, and task-agent identity.
- Updated runtime and work-packet instructions to say `update_task_status` is bound to the current task-agent instance and must not receive `task_id`/`task_name`.
- Kept mandatory delayed final task-agent settlement for supported server-managed paths and native AutoByteus pure-team gating while native task-agent/per-member settlement remains unsupported.
- Tightened Claude task-delegation MCP schema object generation for nested task items so stale fields are not accepted by the runtime projection layer before service parsing.
- Carried forward earlier fixes: obsolete legacy `autobyteus-ts` task-tool imports/tests are gone, canonical task-delegation activation/status events are emitted, and pre-activation/unbound status transitions reject without mutation.
- CR-004 local fix: native AutoByteus standalone/mixed custom data now carries task-agent instance identity (`taskAgentInstanceId`, `taskAgentRunId`, `taskId`, and `logicalMemberRouteKey`) from `MemberTeamContext.taskAgentInstance`; native task-delegation context parsing maps those fields into caller identity so selector-free `update_task_status` cannot fall back to logical member-only identity on Mixed AutoByteus task-agent workers.
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
  - Added an explicit active-execution member projection for frontend team execution surfaces. Grid and spotlight views no longer render the raw logical `memberTree`; they render only concrete task-agent instances, the coordinator execution node, members/subteams with live runtime activity, or logical members that have a separate direct conversation/history.
  - Offline empty logical assignees that only served as task-agent templates disappear from active execution grid/spotlight UI after the final concrete task-agent instance settles.
  - Task-agent settlement focus fallback no longer chooses the task-only logical worker. It resolves to an active execution route, preferring the coordinator when available, otherwise the first remaining active execution entity, otherwise no focused execution route.
  - `TeamWorkspaceView` derives header/status/avatar/composer state from the active-execution focused route, so a stale hidden worker focus cannot keep a `worker • Offline` style header after task-agent settlement.
  - The roster/topology panel is explicitly labeled as a logical roster and non-active task execution when it shows logical members.
- CR-009 / CR-010 local fix for active-execution focus/row bypasses:
  - `AgentTeamEventMonitor`, `activeContextStore`, `agentTeamRunStore`, and `ContextFilePathInputArea` now use the store-owned active-execution focused route/context/node instead of raw logical `focusedMemberRouteKey` for focus-mode body, active context, send/interrupt target, and context-file draft ownership.
  - `agentTeamContextsStore` exposes active-execution focus getters as the single frontend boundary for these consumers, preserving the raw logical focus only for roster/template state.
  - `RunningTeamRow` now renders the active-execution projection instead of raw `memberTree`, and highlights the resolved active-execution focused route so an offline task-only worker row is not kept in the running-team sidebar after settlement.
  - Added focused tests for stale logical worker focus after task-agent settlement across focus-mode display, active-context interrupt routing, send target/draft ownership, and expanded running-team sidebar projection.
- API/E2E Round 10 / Round 17 worker-row focus local fix:
  - The run-history/workspace team tree now projects active local team contexts through the same active-execution member filter before rendering member rows, so a task-delegation-only logical worker with only placeholder `initializing` state is removed from the clickable workspace tree after the concrete task-agent settles.
  - Active-execution projection no longer treats logical-member `initializing` status alone as runtime activity; concrete task-agent nodes still render through explicit task-agent identity, and direct logical-member conversations/history still keep those logical rows visible.
  - Stale workspace/history member-row selection is guarded in `selectTreeRunFromHistory`: when a local live team context exists, the requested row is normalized to the resolved active-execution target before focus hydration and selected-team-member state are updated, preventing a stale DOM click from targeting the task-only worker for composer sends.
  - Run-history team-node focus now falls back to the first active-execution row when the raw focused logical member was filtered out.
- API/E2E Round 11 / Round 18 stale-route local fix:
  - Active team opening now normalizes a requested `workspaceExecutionMemberRouteKey` against the existing subscribed team context's active-execution projection before hydration/open state is applied.
  - A stale URL or workspace execution link targeting a settled task-only logical worker is therefore reopened/focused through the resolved active-execution route, preferring the coordinator when available, instead of hydrating/focusing the logical `worker Offline` row.
  - Added focused `openTeamRun` coverage proving stale live member focus is rewritten to the active execution target before the hydration payload is requested/applied.
- CR-011 local fix:
  - Active team opening now resolves the final focused route from the hydrated active-execution projection for every live open, including no pre-existing context and existing-but-unsubscribed active contexts, rather than only the subscribed in-memory branch.
  - Live team-run hydration now normalizes the requested member route before returning the hydration payload, so raw metadata membership cannot by itself assign `focusedMemberRouteKey` to a settled task-delegation-only logical worker.
  - Active-execution member filtering no longer treats task-agent work-packet-only logical-member conversations as direct logical member activity. A logical worker whose projection only contains the task-agent activation packet/history is excluded from active execution rows and cannot become the final focused member solely because raw metadata contains `worker`.
  - Added focused run-history/open tests for direct stale URL/link opening with no existing context and with an existing unsubscribed active context.

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
- `update_task_status` is valid only from a task-agent instance bound to exactly one delegated task. The model-facing tool takes no selector; internal task-agent context is the selector.
- Dependency authoring/dependent activation remains deferred out of this first ticket. `delegate_tasks` accepts only ready-to-run work items; dependent follow-up work is coordinator-sequenced by waiting for completion notification and then calling `delegate_tasks` again. Multiple submitted tasks are independent and activated according to current task-agent concurrency behavior.
- Supported server-managed paths must settle each final task-agent instance after terminal status once the current turn is safe, idle/offline is observed, and no current delegated work remains for that task-agent instance.
- Native AutoByteus pure-team task delegation remains hidden/gated until native task-agent/per-member settlement is implemented and validated.
- Approval-required task-agent tool calls require both the logical member selector and the concrete `task_agent_run_id`; the logical selector guards roster/member ownership while the run ID routes the approval/denial to the active task-agent instance.

## Known Risks / Follow-Ups

- The delegation ledger is in-memory per active `TeamRun`; durable recovery remains out of scope.
- Rejected task-agent activation rolls the task back to `not_started` and reports the rejection to the tool caller. There is no independent retry scheduler in this ticket.
- Native AutoByteus pure-team task delegation is intentionally gated rather than implemented.
- Live mixed-runtime validation with LMStudio/Codex flags was not re-run by implementation; API/E2E owns that environment. The repository E2E was updated to use `member_name` and selector-free `update_task_status`, and to assert task-agent-run settlement after terminal status.
- Live browser/API E2E for the new frontend transient task-agent card/row behavior was not re-run by implementation; API/E2E owns that environment. Implementation added focused frontend unit coverage and a Nuxt production build check.
- Live browser/API E2E for the Round 14/Round 17/Round 18/CR-011 worker-row semantics clarification was not re-run by implementation; API/E2E owns that environment. Implementation added focused frontend coverage for active-execution projection, focus fallback, focus-mode display, active command targets, draft ownership, running-team sidebar projection, run-history/workspace tree projection, stale history-row selection guards, stale URL/workspace execution link focus normalization, and task-agent-work-packet-only logical projection exclusion.
- Electron packaging was not re-run by implementation after the localization local fix; delivery owns that packaging command. Implementation re-ran the blocking localization audit plus targeted frontend checks and a Nuxt production build.
- `pnpm -C autobyteus-server-ts typecheck` remains unsuitable in this repo shape because `tsconfig.json` includes tests while `rootDir` is `src` (TS6059). Build/type coverage used `tsconfig.build.json` and executable focused tests instead.
- `pnpm -C autobyteus-web exec tsc -p tsconfig.json --noEmit` remains unsuitable as a broad local gate in the current repo shape because it includes many existing test/SFC and unrelated type errors. Nuxt production build and focused Vitest coverage were used for this frontend change.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Feature + behavior change + material refactor.
- Reviewed root-cause classification: Boundary/ownership issue, lifecycle invariant, identity split, stale model-facing schema/selectors, and unsupported runtime exposure.
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): Refactor Needed Now.
- Implementation matched the reviewed assessment (`Yes`/`No`): Yes.
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): N/A; Round 8 architecture review passed before this refreshed alignment.
- Evidence / notes: Runtime adapters call the server-owned task delegation boundary; task-agent lifecycle is explicit; stale schema fields/selectors are rejected; native pure-team exposure is gated until settlement support exists; frontend runtime projection now preserves concrete task-agent identity as a transient UI entity separate from the logical roster member, and active execution surfaces/actions/history-tree selections plus stale workspace execution links now consume one active-execution projection/focus boundary instead of raw roster focus.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None` for removed legacy task-plan model-facing tools, stale `delegate_tasks` fields, or stale `update_task_status` selectors.
- Legacy old-behavior retained in scope: `No`.
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes` for legacy task tools and stale task-delegation fields/selectors.
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`.
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): `Yes`.

## Local Implementation Checks Run

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

- Source contract spot-check: `delegate_tasks.tasks[]` parser/schema exposes only `member_name`, required `description`, and optional `reference_files`; `update_task_status` exposes only `status`, optional `message`, and optional `reference_files`. Both parser objects are strict.
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

## Downstream Validation Hints / Suggested Scenarios

- Re-run code review before API/E2E because implementation and repository-resident E2E validation changed after the previous review.
- API/E2E should re-run the live mixed-runtime task-delegation scenario and verify:
  - coordinator can call `delegate_tasks` with only `member_name`, rich `description`, and optional `reference_files`;
  - worker receives a work packet containing rich `description`, optional references, task-agent instance identity, and selector-free status instructions;
  - worker calls `update_task_status` with only `status`, optional `message`, and optional `reference_files`;
  - stale selectors such as `task_id`/`task_name` are rejected before mutation;
  - coordinator receives terminal notification with internal task identity, member, status, optional message/reference files;
  - the task-agent run goes offline/settles and `AgentRunManager.getActiveRun(taskAgentRunId)` is absent.
- Validate same-member parallel tasks produce separate task-agent run IDs and cannot update each other's tasks through model-facing selectors.
- Validate native AutoByteus pure-team agents do not receive `delegate_tasks` / `update_task_status` while native task-agent settlement remains unsupported.
- Validate frontend/browser behavior for task-agent lifecycle:
  - task-agent activation/status/stream payloads create a transient row/card keyed by concrete task-agent run/instance identity;
  - the work packet and subsequent task-agent conversation/tool activity appear on that transient entity, not the logical worker row;
  - multiple same-member task-agent instances render independently;
  - terminal/offline backend settlement removes only the settled transient entity.
  - active execution grid/spotlight/header no longer show a task-delegation-only logical worker as an offline/initializing execution entity after the final task-agent settles;
  - workspace/history team tree rows do not expose the settled task-only logical worker as a clickable active execution member, and stale member-row clicks route to the resolved active-execution target;
  - roster/topology-only views, if visible, are clearly labeled as non-execution logical roster surfaces.
- Validate an approval-required tool call from a task-agent worker:
  - approval request payload includes concrete `task_agent_run_id`;
  - frontend approval/denial command sends that run ID back;
  - server routes approval/denial to the active task-agent run, not the logical member run.

## API / E2E / Executable Validation Still Required

Yes. Implementation-scoped build/unit/integration checks passed, and the gated live E2E file was syntax/execution loaded with the test skipped by default. Full live API/E2E validation of mixed runtime task delegation, terminal notification, and mandatory task-agent settlement remains owned by `api_e2e_engineer` after this package passes code review.
