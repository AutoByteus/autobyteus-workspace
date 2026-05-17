# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/tickets/mixed-team-nested-agent-team/requirements-doc.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/tickets/mixed-team-nested-agent-team/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/tickets/mixed-team-nested-agent-team/design-spec.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/tickets/mixed-team-nested-agent-team/design-review-report.md`
- Architecture pause note: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/tickets/mixed-team-nested-agent-team/architecture-review-pause-note.md`
- Design-owner recheck note: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/tickets/mixed-team-nested-agent-team/design-owner-recheck-note.md`
- Prior code review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/tickets/mixed-team-nested-agent-team/review-report.md`
- Prior API/E2E validation report: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/tickets/mixed-team-nested-agent-team/api-e2e-validation-report.md`
- Full-stack UI failure note: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/tickets/mixed-team-nested-agent-team/fullstack-nested-team-ui-validation-failure.md`
- Frontend rework note: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/tickets/mixed-team-nested-agent-team/frontend-nested-team-ui-design-rework-note.md`
- Full-stack communication failure note: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/tickets/mixed-team-nested-agent-team/fullstack-nested-team-communication-validation-failure.md`
- Round 5 live child transcript/display failure note: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/tickets/mixed-team-nested-agent-team/fullstack-nested-team-live-child-transcript-validation-failure.md`
- Round 5 live transcript/projection/presentation design rework note: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/tickets/mixed-team-nested-agent-team/round5-live-transcript-projection-presentation-design-rework-note.md`
- Upward nested-team reporting / representative routing design rework note: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/tickets/mixed-team-nested-agent-team/upward-nested-team-reporting-design-rework-note.md`
- Command API clean-cut design rework note: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/tickets/mixed-team-nested-agent-team/command-api-clean-cut-design-rework-note.md`
- App data migration design rework note: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/tickets/mixed-team-nested-agent-team/app-data-migration-design-rework-note.md`
- Delivery Round 6 Electron build blocker note: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/tickets/mixed-team-nested-agent-team/delivery-round6-electron-build-blocker.md`
- Delivery Round 6 Electron build log: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/tickets/mixed-team-nested-agent-team/electron-build.log`
- Failure screenshot: `/Users/normy/.autobyteus/browser-artifacts/995de5-1778644109170.png`
- Round 4 nested subteam UI screenshots: `/Users/normy/.autobyteus/browser-artifacts/e47bac-1778653656912.png`, `/Users/normy/.autobyteus/browser-artifacts/e47bac-1778653663419.png`
- Round 5 live communication/transcript screenshots: `/Users/normy/.autobyteus/browser-artifacts/382035-1778656478050.png`, `/Users/normy/.autobyteus/browser-artifacts/382035-1778656693356.png`, `/Users/normy/.autobyteus/browser-artifacts/382035-1778657119879.png`

## What Changed

Implemented the approved Round 9 nested mixed-agent-team package in `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team` on branch `codex/mixed-team-nested-agent-team`.

Backend implementation from the earlier approved rounds remains in place:

- Nested `agent_team` definitions route to `TeamBackendKind.MIXED`; no nested flattening backend mode was introduced.
- Mixed runtime uses live `MixedTeamMemberHandle` boundaries with agent and subteam variants, and child team runs are parent-owned internal `TeamRun`s rather than globally registered top-level runs.
- `TeamMemberSelector` route/path identity is used at runtime command boundaries; raw strings remain only transport/application edge adapters.
- Recursive `TeamRunMetadata.memberTree` is canonical. Legacy flat `memberMetadata`/`runVersion` metadata is rejected as unsupported legacy metadata/topology-lost instead of guessed or migrated.
- `TeamRunEvent.sourcePath` is canonical; route keys/display names/legacy fields are derived only at projection/transport edges.
- Team communication projections carry member kind/path/route data so subteams are not impersonated as agent runtimes.

Round 9 frontend/full-stack presentation rework added:

- A recursive frontend team topology read model: `TeamMemberNode` (`agent` / `agent_team`), `AgentTeamContext.memberTree`, `memberNodesByRouteKey`, `leafAgentContextsByRouteKey`, and `focusedMemberRouteKey`.
- Recursive definition-to-UI helpers and metadata-to-UI helpers for nested display/read models while retaining flat leaf lists only as derived projections.
- Draft launch, active run state, history reopen, restore hydration, running sidebar, workspace history, team grid/spotlight/members/overview/event-monitor surfaces updated away from leaf-only `members` / `focusedMemberName` authority.
- Team run config and member overrides now use nested route keys for leaf agent overrides.
- Team streaming sends `target_member_route_key` and tool approval sends `member_route_key`; inbound event routing prefers route/path identity before legacy edge aliases.
- Subteam focus/composer behavior: focusing a subteam is allowed, renders a subteam summary/composer state, and does not incorrectly hydrate or treat the subteam as a leaf `AgentContext`.
- Workspace history GraphQL now exposes recursive `memberTree` JSON for team run rows; frontend history rows are built from the recursive tree and flattened only for display/projection.
- Team communication GraphQL and frontend stores include participant `memberKind`, `memberPath`, and `memberRouteKey` fields for sender/receiver display and routing.
- Seed fixture generation was updated for nested mixed-team UI validation fixtures.


## Round 11 Communication-Roster / Representative Routing Implementation Update

Architecture review Round 11 approved the revised communication-roster and representative-routing design. I implemented the approved contract instead of patching around the old scalar delivery fields.

- Replaced the old inter-agent delivery request shape with participant-shaped endpoints: `sender.participant`, `recipient.participant`, `participant.address`, and explicit `delivery.selector` / `request.recipient.selector` identity. Descriptor/address invariants now reject divergent `memberPath` / `memberRouteKey` / `address` coordinates.
- Added `MemberCommunicationRosterBuilder` and `inter-agent-message-delivery-request-builder` so tools resolve `recipient_name` through a scoped roster rather than structural member lookup. Duplicate visible recipient names now fail fast as ambiguous.
- Parent members now see subteam coordinator representatives by visible leaf name. For example `program_manager -> review_lead` creates a parent-rooted recipient participant at `BuildSquad/review_lead`, with `representedSubTeam=BuildSquad`, and delivery uses an explicit route-key selector.
- `MixedSubTeamMemberHandle.deliverInterMemberMessage(...)` now strips the parent subteam prefix and posts to the child-local selector instead of sending all inter-member deliveries to `null`. Structural subteam composer/default routing still uses the child team's configured default target.
- Child mixed runs receive parent-boundary context. The child coordinator can send upward to parent roster entries, and `MixedTeamManager` bridges those messages back through the parent-owned manager with absolute sender identity such as `BuildSquad/review_lead`; no `reply_to_sender`, `replyAddress`, or stored reply context was introduced.
- Communication projection/transport now carries `representedSubTeam` metadata, including address, through canonical communication events, the team communication projection store, GraphQL, WebSocket payloads, the frontend team communication store, and display badges/breadcrumbs.
- AutoByteus, Codex, and Claude send-message tool adapters now all build delivery requests through the same roster/participant request builder.
- Frontend Team Communication perspective matching treats represented-subteam metadata as a valid match for focused subteam selectors while preserving exact nested leaf route/path matching.
- `teamCommunicationStore` types were split into `teamCommunicationTypes.ts` to keep changed source files under the team source-size guardrail.

Focused Round 11 regression coverage added or updated:

- Duplicate visible communication recipient names are rejected.
- Parent-to-representative roster descriptors use absolute route-key delivery for `BuildSquad/review_lead`.
- Structural subteam default routing remains intact while explicit representative delivery strips to the child-local selector.
- Child-to-parent bridge delivery publishes absolute sender identity and rejects unreachable parent boundaries.
- Canonical communication projection/WebSocket/store/panel preserve and display represented-subteam metadata.
- Frontend focused subteam perspectives match representative-leaf communication by `representedSubTeam` route/path.


## Code Review Round 5 Local Fix Update

Round 5 code review returned `Local Fix` findings in `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/tickets/mixed-team-nested-agent-team/review-report.md`. The bounded fixes are complete:

- `CR-ROUND9-001` fixed: grid and spotlight now use recursive display entries, so `BuildSquad`, `BuildSquad/review_lead`, and `BuildSquad/qa_specialist` are first-class selectable route-key targets. Subteam child rows inside subteam cards and focus-mode subteam summaries are actionable, and component event parameters now represent `memberRouteKey` rather than member names.
- `CR-ROUND9-002` fixed: `TOOL_APPROVAL_REQUESTED` source/member route and path identity is captured into tool segments and activity records, passed through `ToolCallIndicator` and `activeContextStore`, and sent by `agentTeamRunStore` / `TeamStreamingService` without consulting current UI focus. The stream service also caches approval request source identity by invocation ID for direct approve/deny calls.
- `CR-ROUND9-003` fixed: launch config member overrides render from recursive member-tree presentation via `MemberOverrideTree.vue`, with subteam group rows and nested leaf overrides keyed by canonical `memberRouteKey`. `MemberOverrideItem.vue` displays breadcrumbs/route context for nested leaves.
- `CR-ROUND9-004` initially addressed in Round 5 at the presentation-model layer: team communication perspective view models carry counterpart kind/path/route, group by route/path before run ID, and display breadcrumbs plus a visible `Team` badge for subteam participants. Round 6 completed the remaining focused-member route/path filtering gap below.
- `CR-ROUND9-005` fixed: generated untracked `autobyteus-web/logs/fullstack-nested-web-20260513-053943.{pid,log}` artifacts were removed from the product tree.

Additional focused regression coverage added for BuildSquad-style nested grid/spotlight focus, event-source tool approval after focus changes, grouped launch config overrides, nested communication breadcrumbs/badges, and approval target parser/handler propagation.


## Code Review Round 6 Local Fix Update

Round 6 code review kept `CR-ROUND9-004` open because the communication panel display improvements were still filtered by `memberRunId` only. The remaining local fix is complete:

- `teamCommunicationStore.getPerspectiveForMember(...)` now accepts a typed participant selector containing `memberRunId`, `memberRouteKey`, `memberPath`, and `memberKind` instead of requiring only a runtime run ID.
- Perspective matching now checks sender/receiver `memberRouteKey` and `memberPath` identity before falling back to runtime run IDs, while preserving the existing string run-ID adapter for edge callers.
- `TeamOverviewPanel.vue` now passes focused route key/path/kind to `TeamCommunicationPanel.vue`, so focused subteams without leaf `memberRunId` still get their messages counted and displayed.
- `TeamCommunicationPanel.vue` now computes perspective from the full participant selector and treats route/path identity as sufficient focus identity.
- Regression coverage was added for a focused `BuildSquad` subteam with no `memberRunId` receiving a `program_manager -> BuildSquad` message, plus a nested `BuildSquad/review_lead` leaf matching by route/path when its runtime run ID is stale/unavailable.

## API/E2E Round 4 Local Fix Update

API/E2E full-stack validation found `E2E-NESTED-009`: persisted GraphQL communication projection and manual frontend hydration worked, but live `TEAM_COMMUNICATION_MESSAGE` WebSocket ingestion left the frontend Team Communication store empty after `program_manager -> BuildSquad` messages. The local fix is complete:

- Added `autobyteus-server-ts/src/services/agent-streaming/team-communication-message-payload.ts` as the transport-edge projection from canonical nested `TeamRunCommunicationEventPayload` (`sender` / `receiver` participants) into the flattened live `TEAM_COMMUNICATION_MESSAGE` payload consumed by the frontend store.
- Updated `AgentTeamStreamHandler.convertTeamEvent(...)` to use that projection for `TeamRunEventSourceType.COMMUNICATION`, including `senderRunId`, `senderMemberKind`, `senderMemberPath`, `senderMemberRouteKey`, `receiverRunId`, `receiverMemberKind`, `receiverMemberPath`, `receiverMemberRouteKey`, `createdAt`, and `updatedAt`. Nested domain `sender` / `receiver` objects are no longer emitted as the live frontend payload.
- Kept `source_path` / `source_route_key` as stream edge source identity fields alongside the flattened message projection.
- Updated frontend protocol typing so `TeamCommunicationMessagePayload` explicitly allows the stream source identity aliases attached by the backend.
- Added backend regression coverage proving canonical parent-to-subteam communication events are flattened for WebSocket delivery, and frontend regression coverage proving a live parent-to-subteam `TEAM_COMMUNICATION_MESSAGE` is routed into the Team Communication store rather than a leaf conversation.


## API/E2E Round 5 Local Fix Update

API/E2E full-stack validation then found three local implementation blockers in `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/tickets/mixed-team-nested-agent-team/fullstack-nested-team-live-child-transcript-validation-failure.md`. The design was reworked by `solution_designer` before this implementation pass; I implemented that refined spine rather than a frontend-only patch.

- `E2E-NESTED-011` fixed at the backend-owned leaf-input boundary:
  - Added `TeamRunEventSourceType.MEMBER_INPUT` and `TeamRunMemberInputEventPayload` as a recipient-side transcript event separate from parent-level `COMMUNICATION`.
  - `MixedAgentMemberHandle.postMessage(...)` now emits `MEMBER_INPUT` after accepted direct user input.
  - `MixedAgentMemberHandle.deliverInterMemberMessage(...)` emits `MEMBER_INPUT` with `inputOrigin: "inter_agent_delivery"` for direct leaf inter-member delivery.
  - Mixed agent handles no longer use legacy `INTER_AGENT_MESSAGE` as the canonical recipient transcript event; parent/team message display remains owned by `COMMUNICATION`, and resolved leaf transcript display is owned by `MEMBER_INPUT`.
  - Parent-to-subteam delivery uses `MixedSubTeamMemberHandle` and the child manager default coordinator path; the child leaf emits `MEMBER_INPUT`, and the subteam event bridge preserves canonical nested `sourcePath`.
  - `AgentTeamStreamHandler` maps `MEMBER_INPUT` to existing live `EXTERNAL_USER_MESSAGE` with `source_path`, `source_route_key`, `member_route_key`, `member_path`, `message_id`, `dedupe_key`, and parent communication linkage. The frontend no longer needs to synthesize child prompts from `TEAM_COMMUNICATION_MESSAGE`.
  - Frontend `TeamStreamingService` routes those live leaf input echoes by nested route/source identity; `externalUserMessageHandler` upserts by `message_id` / `dedupe_key` so backend echoes do not duplicate optimistic direct user messages.
- `E2E-NESTED-013` fixed at the backend projection merge boundary:
  - Added `run-projection-dedupe.ts` under the run-history projection subsystem.
  - `AgentRunViewProjectionService` now deduplicates conversation and activity rows from all provider/local merge paths, preferring rows with valid timestamps and richer fields over `ts: null` copies.
  - Frontend `runProjectionConversation.ts` performs defensive conversation-entry dedupe during hydration so stale duplicate projection rows still render once.
- `E2E-NESTED-012` fixed for active/history presentation consistency:
  - `useTeamMemberPresentation()` now treats membership route/member labels as the primary display name and leaves agent definition names as secondary metadata/avatar lookup.
  - Active team history rows from `buildTeamRowsFromContext(...)` use `TeamMemberNode.displayName/memberName`, not `AgentRunConfig.agentDefinitionName`, so active/new and opened/stopped rows use the same primary labels.
- Direct team sends now attach client-generated `messageId`/`dedupeKey` to the optimistic user row and WebSocket `SEND_MESSAGE` payload; the backend copies those IDs into the `AgentInputUserMessage` metadata and the live `MEMBER_INPUT` echo.

## Code Review Round 9 Local Fix Update

Round 9 code review returned `CR-ROUND9-006` because the semantic fallback projection dedupe was still too broad for no-explicit-ID rows:

- Backend `run-projection-dedupe.ts` now only semantically merges no-explicit-ID rows when at least one side has a valid timestamp and the rows are otherwise semantically equal, or when both sides have the same non-null timestamp.
- Backend dedupe no longer merges identical no-explicit-ID rows when both timestamps are absent/null, preserving intentional repeated messages from providers that do not emit timestamps.
- Frontend defensive hydration dedupe in `runProjectionConversation.ts` uses the same conservative rule.
- Added backend regression coverage preserving two identical no-ID/no-timestamp rows while keeping timestamped/null duplicate coverage passing.
- Added frontend regression coverage preserving two identical no-ID/no-timestamp rows in `buildConversationFromProjection(...)` while keeping timestamped/null duplicate coverage passing.


## Delivery Round 6 Electron Build Local Fix Update

Delivery Round 6 reached a packaged-build blocker before Electron packaging because `pnpm audit:localization-literals` found three unresolved product literals in nested-team workspace UI. This is a local localization/source issue, not a broader design issue. The source fix is complete and intentionally scoped to the audit blocker while preserving delivery-owned docs/report edits already present in the worktree.

- `AgentTeamEventMonitor.vue` now renders the focused-subteam label through `workspace.components.workspace.team.AgentTeamEventMonitor.focused_subteam`.
- `TeamMemberMonitorTile.vue` now renders the subteam-members section label through `workspace.components.workspace.team.TeamMemberMonitorTile.subteam_members`.
- `TeamWorkspaceView.vue` now renders the subteam composer placeholder and submit label through `workspace.components.workspace.team.TeamWorkspaceView.send_subteam_placeholder` and `workspace.components.workspace.team.TeamWorkspaceView.send_to_subteam`.
- English and `zh-CN` catalog entries were added in `autobyteus-web/localization/messages/{en,zh-CN}/workspace.ts`.
- Focused component test fixtures for `AgentTeamEventMonitor` and `TeamWorkspaceView` were updated to use the current recursive team context shape while covering the localized components.
- I reran the exact failed guard command from the delivery blocker, and it now passes with zero unresolved findings. I did not rerun the full macOS Electron packaging command in this implementation pass; delivery can resume the README-selected packaged build after code review passes.

## Key Files Or Areas

Backend / GraphQL edges touched in this round:

- `autobyteus-server-ts/src/run-history/domain/team-run-history-index-types.ts`
- `autobyteus-server-ts/src/run-history/services/team-run-history-service.ts`
- `autobyteus-server-ts/src/run-history/projection/run-projection-dedupe.ts`
- `autobyteus-server-ts/src/run-history/services/agent-run-view-projection-service.ts`
- `autobyteus-server-ts/src/agent-team-execution/domain/team-run-event.ts`
- `autobyteus-server-ts/src/agent-team-execution/domain/inter-agent-message-delivery.ts`
- `autobyteus-server-ts/src/agent-team-execution/services/team-member-input-event-builder.ts`
- `autobyteus-server-ts/src/agent-team-execution/services/inter-agent-message-runtime-builders.ts`
- `autobyteus-server-ts/src/agent-team-execution/backends/mixed/mixed-team-manager.ts`
- `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-agent-member-handle.ts`
- `autobyteus-server-ts/src/api/graphql/types/run-history.ts`
- `autobyteus-server-ts/src/api/graphql/types/team-communication.ts`
- `autobyteus-server-ts/src/services/agent-streaming/agent-team-stream-handler.ts`
- `autobyteus-server-ts/src/services/agent-streaming/team-communication-message-payload.ts`
- `autobyteus-server-ts/src/services/agent-streaming/team-member-input-message-payload.ts`

Frontend topology/read model:

- `autobyteus-web/types/agent/AgentTeamContext.ts`
- `autobyteus-web/utils/teamDefinitionMembers.ts`
- `autobyteus-web/utils/teamMemberMetadataNodes.ts`
- `autobyteus-web/stores/agentTeamContextsStore.ts`
- `autobyteus-web/stores/agentTeamRunStore.ts`
- `autobyteus-web/types/agent/TeamRunConfig.ts`
- `autobyteus-web/utils/teamRunMemberConfigBuilder.ts`
- `autobyteus-web/utils/teamRunConfigUtils.ts`

Frontend history/restore/projection:

- `autobyteus-web/stores/runHistoryTypes.ts`
- `autobyteus-web/stores/runHistoryMetadata.ts`
- `autobyteus-web/stores/runHistoryTeamHelpers.ts`
- `autobyteus-web/stores/runHistoryTeamRows.ts`
- `autobyteus-web/stores/runHistoryLoadActions.ts`
- `autobyteus-web/stores/runHistorySelectionActions.ts`
- `autobyteus-web/services/runHydration/teamRunContextHydrationService.ts`
- `autobyteus-web/services/runHydration/runProjectionConversation.ts`
- `autobyteus-web/services/runOpen/teamRunOpenCoordinator.ts`
- `autobyteus-web/services/runRecovery/activeRunRecoveryCoordinator.ts`

Frontend stream/communication/routing:

- `autobyteus-web/services/agentStreaming/TeamStreamingService.ts`
- `autobyteus-web/services/agentStreaming/protocol/messageTypes.ts`
- `autobyteus-web/stores/teamCommunicationStore.ts`
- `autobyteus-web/graphql/queries/runHistoryQueries.ts`

Delivery Round 6 localization/build blocker:

- `autobyteus-web/components/workspace/team/AgentTeamEventMonitor.vue`
- `autobyteus-web/components/workspace/team/TeamMemberMonitorTile.vue`
- `autobyteus-web/components/workspace/team/TeamWorkspaceView.vue`
- `autobyteus-web/localization/messages/en/workspace.ts`
- `autobyteus-web/localization/messages/zh-CN/workspace.ts`
- `autobyteus-web/components/workspace/team/__tests__/AgentTeamEventMonitor.spec.ts`
- `autobyteus-web/components/workspace/team/__tests__/TeamWorkspaceView.spec.ts`

Frontend presentation surfaces:

- `autobyteus-web/components/workspace/team/TeamWorkspaceView.vue`
- `autobyteus-web/components/workspace/team/TeamGridView.vue`
- `autobyteus-web/components/workspace/team/TeamSpotlightView.vue`
- `autobyteus-web/components/workspace/team/TeamMemberMonitorTile.vue`
- `autobyteus-web/components/workspace/team/TeamMembersPanel.vue`
- `autobyteus-web/components/workspace/team/TeamOverviewPanel.vue`
- `autobyteus-web/components/workspace/team/AgentTeamEventMonitor.vue`
- `autobyteus-web/components/workspace/team/TeamCommunicationPanel.vue`
- `autobyteus-web/components/workspace/running/RunningAgentsPanel.vue`
- `autobyteus-web/components/workspace/running/RunningTeamGroup.vue`
- `autobyteus-web/components/workspace/running/RunningTeamRow.vue`
- `autobyteus-web/components/workspace/running/TeamMemberRow.vue`
- `autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue`
- `autobyteus-web/components/workspace/config/TeamRunConfigForm.vue`
- `autobyteus-web/components/workspace/config/MemberOverrideItem.vue`
- `autobyteus-web/components/workspace/config/MemberOverrideTree.vue`
- `autobyteus-web/components/agentInput/ContextFilePathInputArea.vue`

Focused tests updated/added:

- `autobyteus-web/stores/__tests__/agentTeamContextsStore.spec.ts`
- `autobyteus-web/stores/__tests__/agentTeamRunStore.spec.ts`
- `autobyteus-web/components/workspace/team/__tests__/TeamGridView.spec.ts`
- `autobyteus-web/components/workspace/team/__tests__/TeamSpotlightView.spec.ts`
- `autobyteus-web/components/workspace/team/__tests__/TeamOverviewPanel.spec.ts`
- `autobyteus-web/components/workspace/team/__tests__/TeamCommunicationPanel.spec.ts`
- `autobyteus-web/services/agentStreaming/__tests__/TeamStreamingService.spec.ts`
- `autobyteus-web/services/agentStreaming/handlers/__tests__/toolLifecycleParsers.spec.ts`
- `autobyteus-web/services/agentStreaming/handlers/__tests__/toolLifecycleHandler.spec.ts`
- `autobyteus-web/services/agentStreaming/handlers/__tests__/toolLifecycleOrdering.spec.ts`
- `autobyteus-web/components/workspace/config/__tests__/TeamRunConfigForm.spec.ts`
- `autobyteus-web/components/conversation/__tests__/ToolCallIndicator.spec.ts`
- `autobyteus-web/stores/__tests__/agentActivityStore.spec.ts`
- `autobyteus-web/stores/__tests__/runHistoryTeamRows.spec.ts`
- `autobyteus-web/services/runHydration/__tests__/runProjectionConversation.spec.ts`
- `autobyteus-web/utils/__tests__/teamRunConfigUtils.spec.ts`
- `autobyteus-web/services/runOpen/__tests__/teamRunOpenCoordinator.spec.ts`
- `autobyteus-server-ts/tests/unit/agent-team-execution/inter-agent-message-runtime-builders.test.ts`
- `autobyteus-server-ts/tests/unit/run-history/services/agent-run-view-projection-service.test.ts`
- `autobyteus-server-ts/tests/unit/services/agent-streaming/agent-team-stream-handler.test.ts`

## Important Assumptions

- `TeamRunMetadata.memberTree` and frontend `AgentTeamContext.memberTree` are the authoritative topology structures.
- Flat leaf lists in UI/history are display/projection products only and must not be used to infer nested topology.
- `memberRouteKey` is the stable frontend route identity for nested members; `TeamRunEvent.sourcePath` / `memberPath` remain the canonical path shapes where domain/source identity is required.
- Parent team communication records and recipient leaf transcript records are intentionally separate: `COMMUNICATION` feeds Team Messages, while `MEMBER_INPUT` feeds the resolved leaf conversation.
- Subteam focus is a valid UI focus state but has no leaf `AgentContext`; leaf hydration and optimistic conversation updates are skipped when the focused node is a subteam.
- Outbound `agent_name` / `agent_id` fields remain display/correlation metadata only; command-side scalar target aliases such as `target_member_name`, `target_agent_name`, `agent_name`, `agent_id`, `member_name`, and camelCase equivalents are rejected. Frontend team commands send route/path selector fields only.

## Known Risks

- Full-stack browser validation is still required after code review. I did not claim API/E2E/browser sign-off here because the implementation-engineer role owns implementation-scoped checks only.
- Frontend full typecheck is not currently a clean signal: `vue-tsc` is not installed and `nuxi typecheck` fails on many existing/baseline issues across tests/components/stores. Targeted changed-area Vitest coverage passed.
- Server package `pnpm typecheck` is not currently a clean signal because `tsconfig.json` includes `tests` while `rootDir` is `src`, causing broad `TS6059`; server source build typecheck passes with `tsconfig.build.json`.
- Some older un-focused frontend tests still reference legacy flat context names such as `focusedMemberName`; those are outside the focused update set and will need broader cleanup if the repository requires full-suite typecheck/test cleanup.
- Full-stack/browser validation still needs to verify the actual nested-team fixture visually after this code review pass; implementation checks did not stand up that environment.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Feature / larger nested-team runtime and UI behavior change.
- Reviewed root-cause classification: Boundary or ownership issue plus shared-structure looseness from flat traversal/flat metadata/raw-string targeting/leaf-only UI state.
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): Refactor Needed Now.
- Implementation matched the reviewed assessment (`Yes`/`No`): Yes.
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): Yes earlier in the loop; the user explicitly challenged design quality and `solution_designer` produced the Round 5 live transcript/projection/presentation rework note before this implementation pass.
- Evidence / notes: The frontend now has recursive topology authority and route-key indexes; backend history/communication/member-input streams expose recursive/nested participant data; command/tool approval paths use route identity; projection dedupe now lives at the run-history projection merge boundary.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None` for nested topology authority.
- Legacy old-behavior retained in scope: `No`; legacy flat metadata authority is rejected, grid/spotlight/config override surfaces now render recursive route-key presentation, and flat UI lists are derived projections only.
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes` within changed nested-team UI/runtime paths; legacy command target aliases are removed/rejected, while outbound `agent_name` / `agent_id` display metadata remains non-authoritative.
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`; member structures are discriminated by `agent` vs `agent_team` and indexes are keyed by route identity.
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`; implementation resumed only after the Round 5 rework note supplied explicit data-flow spines for the live transcript/projection/presentation defects.
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): `Yes`; `runHistoryTeamRows.ts` was split out of `runHistoryTeamHelpers.ts`, and the final audit found no changed non-test TS/Vue source file over 500 effective non-empty lines.
- Notes: `resolveLeafTeamMembers` still exists as a derived leaf helper, but it now emits nested route keys and is not an authoritative nested topology source.

## Environment Or Dependency Notes

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team`
- Branch: `codex/mixed-team-nested-agent-team`
- Dependencies are present in the worktree; focused Vitest/TypeScript commands ran locally.
- `pnpm -C autobyteus-web exec vue-tsc --noEmit` fails immediately because `vue-tsc` is not installed in this workspace.
- `pnpm -C autobyteus-web exec tsc --noEmit --pretty false` is not a clean frontend signal in this workspace; it exits non-zero on broad existing/baseline project and test type errors across unrelated areas (examples include missing `.vue` declarations in many tests, Electron/browser shell bridge typing gaps, and unrelated store/test type mismatches).
- `pnpm -C autobyteus-web exec nuxi typecheck --noEmit` exits non-zero with broad existing/baseline errors, including examples in `build/scripts/*`, stale tests such as `components/agentInput/__tests__/ContextFilePathInputArea.spec.ts` still constructing `focusedMemberName`, missing `~/stores/agents`, `stores/browserShellStore.ts` missing bridge APIs, and many unrelated test/store type issues. A grep of the latest typecheck log for the latest API/E2E local-fix touched frontend files returned no matches; the remaining failures are broad pre-existing/baseline project errors outside the local fix.
- `pnpm -C autobyteus-server-ts typecheck` exits non-zero with `TS6059` because tests are included while `rootDir` is `src`; `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit` passes.

## Local Implementation Checks Run

Passed:


- Round 11 representative-routing focused backend checks:
  - `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit --pretty false && pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-team-execution/member-team-context-builder.test.ts tests/unit/agent-team-execution/inter-agent-message-runtime-builders.test.ts tests/unit/agent-team-execution/mixed-sub-team-member-handle.test.ts tests/unit/agent-team-execution/mixed-team-manager.test.ts tests/unit/services/agent-streaming/agent-team-stream-handler.test.ts tests/unit/services/team-communication/team-communication-service.test.ts --reporter=dot`
  - Result: TypeScript build check passed; Vitest `6 passed`, `27 passed`.

- Round 11 representative-routing focused frontend checks:
  - `pnpm -C autobyteus-web exec vitest run stores/__tests__/teamCommunicationStore.spec.ts components/workspace/team/__tests__/TeamCommunicationPanel.spec.ts services/agentStreaming/__tests__/TeamStreamingService.spec.ts --reporter=dot`
  - Result: `3 passed`, `26 passed`.
  - Notes: output includes the existing KaTeX quirks-mode warning from Markdown renderer tests.

- Round 11 localization/build guard and hygiene checks:
  - `pnpm -C autobyteus-web audit:localization-literals`
  - `git diff --check`
  - Custom changed-source size audit over changed non-test `.ts` / `.vue` files.
  - Result: localization audit passed with zero unresolved findings; whitespace check passed; no changed non-test TS/Vue source file over 500 non-empty lines.

- Delivery Round 6 localization/build blocker check:
  - `pnpm -C autobyteus-web audit:localization-literals`
  - Result: passed with zero unresolved findings.

- Delivery Round 6 localized component fixture check:
  - `pnpm -C autobyteus-web exec vitest run components/workspace/team/__tests__/AgentTeamEventMonitor.spec.ts components/workspace/team/__tests__/TeamMemberMonitorTile.spec.ts components/workspace/team/__tests__/TeamWorkspaceView.spec.ts --reporter=dot`
  - Result: `3 passed`, `13 passed`.

- Delivery Round 6 whitespace and size guard checks:
  - `git diff --check`
  - Custom changed-source size audit over changed/untracked non-test `.ts` / `.vue` files.
  - Result: passed; no changed/untracked non-test TS/Vue source file over 500 non-empty lines.

- API/E2E Round 5 local-fix focused backend checks:
  - `pnpm -C autobyteus-server-ts exec vitest run tests/unit/services/agent-streaming/agent-team-stream-handler.test.ts tests/unit/agent-team-execution/inter-agent-message-runtime-builders.test.ts tests/unit/run-history/services/agent-run-view-projection-service.test.ts --reporter=dot`
  - Result: `3 passed`, `23 passed`.
  - Notes: covers `MEMBER_INPUT` → live `EXTERNAL_USER_MESSAGE` transport projection, inter-agent delivery metadata linking parent communication to recipient input, backend projection dedupe of timestamped/null duplicate rows, and preservation of repeated no-ID/no-timestamp rows.

- API/E2E Round 5 local-fix focused frontend checks:
  - `pnpm -C autobyteus-web exec vitest run services/agentStreaming/__tests__/TeamStreamingService.spec.ts services/runHydration/__tests__/runProjectionConversation.spec.ts stores/__tests__/runHistoryTeamRows.spec.ts stores/__tests__/teamCommunicationStore.spec.ts components/workspace/team/__tests__/TeamCommunicationPanel.spec.ts components/workspace/team/__tests__/TeamOverviewPanel.spec.ts --reporter=dot`
  - Result: `6 passed`, `31 passed`.
  - Notes: covers live nested leaf `EXTERNAL_USER_MESSAGE` routing/upsert, defensive hydration dedupe for timestamped/null duplicates, preservation of repeated no-ID/no-timestamp rows, active/history membership-label consistency, and retained route/path-aware team communication perspectives.

- Server source build typecheck after Round 5 local fix:
  - `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit --pretty false`
  - Result: passed.

- API/E2E Round 4 focused live communication contract checks:
  - `pnpm -C autobyteus-server-ts exec vitest run tests/unit/services/agent-streaming/agent-team-stream-handler.test.ts tests/unit/services/team-communication/team-communication-service.test.ts --reporter=dot && pnpm -C autobyteus-web exec vitest run services/agentStreaming/__tests__/TeamStreamingService.spec.ts stores/__tests__/teamCommunicationStore.spec.ts components/workspace/team/__tests__/TeamCommunicationPanel.spec.ts components/workspace/team/__tests__/TeamOverviewPanel.spec.ts --reporter=dot`
  - Result: backend `2 passed`, `12 passed`; frontend `4 passed`, `24 passed`.
  - Notes: backend includes the new canonical COMMUNICATION event-to-flattened WebSocket payload regression; frontend includes the new live parent-to-subteam communication-store ingestion regression.

- Frontend focused Round 6 communication-perspective regression check:
  - `pnpm -C autobyteus-web exec vitest run stores/__tests__/teamCommunicationStore.spec.ts components/workspace/team/__tests__/TeamCommunicationPanel.spec.ts components/workspace/team/__tests__/TeamOverviewPanel.spec.ts --reporter=dot`
  - Result: `3 passed`, `14 passed`.
  - Notes: output includes expected KaTeX quirks-mode warnings.

- Frontend focused changed-area and Round 5/Round 6/API-E2E local-fix regression suite:
  - `pnpm -C autobyteus-web exec vitest run stores/__tests__/agentTeamContextsStore.spec.ts stores/__tests__/agentTeamRunStore.spec.ts stores/__tests__/agentActivityStore.spec.ts stores/__tests__/teamCommunicationStore.spec.ts components/workspace/team/__tests__/TeamGridView.spec.ts components/workspace/team/__tests__/TeamSpotlightView.spec.ts components/workspace/team/__tests__/TeamOverviewPanel.spec.ts components/workspace/team/__tests__/TeamCommunicationPanel.spec.ts components/workspace/config/__tests__/TeamRunConfigForm.spec.ts components/conversation/__tests__/ToolCallIndicator.spec.ts services/agentStreaming/__tests__/TeamStreamingService.spec.ts services/agentStreaming/handlers/__tests__/toolLifecycleParsers.spec.ts services/agentStreaming/handlers/__tests__/toolLifecycleHandler.spec.ts services/agentStreaming/handlers/__tests__/toolLifecycleOrdering.spec.ts utils/__tests__/teamRunConfigUtils.spec.ts services/runOpen/__tests__/teamRunOpenCoordinator.spec.ts --reporter=dot`
  - Result: `16 passed`, `108 passed`.
  - Notes: output includes expected negative-test backend termination and malformed-denied-payload logs plus KaTeX quirks-mode warnings.
- Backend focused tests:
  - `pnpm -C autobyteus-server-ts exec vitest run tests/unit/run-history/services/team-run-history-service.test.ts tests/unit/run-history/services/workspace-run-history-service.test.ts tests/unit/run-history/store/team-run-metadata-store.test.ts tests/unit/services/team-communication/team-communication-service.test.ts tests/unit/services/agent-streaming/agent-team-stream-handler.test.ts tests/unit/agent-team-execution/team-run.test.ts tests/unit/agent-team-execution/team-definition-topology-planner.test.ts tests/unit/agent-team-execution/team-run-metadata-mapper.test.ts --reporter=dot`
  - Result: `8 passed`, `29 passed`.
- Server source build typecheck:
  - `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit --pretty false`
  - Result: passed.
- Frontend typecheck probe:
  - `pnpm -C autobyteus-web exec nuxi typecheck --noEmit`
  - Result: still exits `1` on broad existing/baseline project errors; latest log grep for latest API/E2E local-fix touched frontend files returned no matches.
- Whitespace check:
  - `git diff --check`
  - Result: passed.
- Changed-source size guard:
  - Custom audit over changed non-test `.ts` / `.vue` files excluding generated files.
  - Result: `source-size audit passed: no changed non-test TS/Vue source file over 500 non-empty lines`.
- Generated log cleanup:
  - `git status --short | grep 'autobyteus-web/logs' || true`
  - Result: no output; Round 5 generated log/pid files are removed.

Failed / not used as implementation sign-off:

- `pnpm -C autobyteus-web exec vue-tsc --noEmit`
  - Fails: `Command "vue-tsc" not found`.
- `pnpm -C autobyteus-web exec tsc --noEmit --pretty false`
  - Fails with broad existing/baseline project and test type errors outside this implementation slice; not used as local sign-off.
- `pnpm -C autobyteus-web exec nuxi typecheck --noEmit`
  - Fails with broad existing/baseline project errors; not a clean full-project signal for this implementation slice.
- `pnpm -C autobyteus-server-ts typecheck`
  - Fails with `TS6059` because package `tsconfig.json` includes `tests` outside `rootDir: src`.

## Downstream Validation Hints / Suggested Scenarios

Please prioritize code review and then API/E2E/browser validation for:

1. Launch the nested mixed team fixture and verify the team grid/sidebar/history show recursive groups instead of flattened duplicate leaf rows.
2. Focus a subteam node and verify the workspace shows subteam summary/composer behavior without hydrating it as a leaf agent.
3. Send from the focused parent/team composer to a nested route key and verify WebSocket payload uses `target_member_route_key`.
4. Trigger a nested leaf tool approval and verify approve/deny payload round-trips the exact nested `member_route_key` / source identity.
5. Restore/reopen a nested mixed team run from history and verify `memberTree`, `memberNodesByRouteKey`, and `leafAgentContextsByRouteKey` reconstruct correctly.
6. Confirm history/team communication panels display participant kind/path/route-aware messages, including subteam recipients.
7. Verify legacy flat metadata containing `memberMetadata` or `runVersion` fails fast rather than silently flattening or guessing topology.
8. Re-run the Round 5 full-stack path: `program_manager -> BuildSquad` should still create one live Team Messages record, and focusing `BuildSquad/review_lead` should show the inbound `You received a message from sender name: program_manager...` prompt before the child reply.
9. Reopen stopped nested runs and verify `getTeamMemberRunProjection(..., memberRouteKey: "BuildSquad/review_lead")` no longer renders duplicate timestamped plus `ts: null` copies.
10. Compare active/new and opened/stopped rows for the seeded nested team; primary labels should be membership labels (`program_manager`, `BuildSquad`, `review_lead`, `qa_specialist`) consistently, with definition names remaining secondary metadata.
11. Re-run the Round 4 full-stack parent-to-subteam communication flow and verify live `TEAM_COMMUNICATION_MESSAGE` ingestion populates `teamCommunication.getMessagesForTeam(teamRunId)` without manual GraphQL hydration.
12. Verify the Round 11 representative-routing path: parent `program_manager` should see visible `review_lead`, send to parent-root route `BuildSquad/review_lead`, show Team Messages as `program_manager -> BuildSquad / review_lead` with a represented `BuildSquad` badge, and the child coordinator should receive the actual inbound prompt.
13. Verify duplicate visible recipient names across reachable roster entries are rejected as ambiguous rather than routed by bare name.
14. Verify child coordinator upward reporting to `program_manager` creates parent-level communication with sender route `BuildSquad/review_lead` and no reply-state shortcut.
15. Run the required full-stack browser validation against the prior screenshot failure paths after code review passes.

## API / E2E / Executable Validation Still Required

API, E2E, and full-stack browser validation remain required after code review and are owned by `api_e2e_engineer`. No downstream validation sign-off is claimed in this implementation handoff.

## Code Review Round 12 Local Fix Update

Round 12 `Local Fix` findings from `review-report.md` are addressed in this implementation pass:

- `CR-ROUND11-001`: tightened participant/address invariants in `inter-agent-message-delivery.ts` so `participant.memberPath` must exactly match `participant.address.memberPath`, represented-subteam paths must exactly match their address paths, represented-subteam team-run IDs must remain aligned with the participant address, and represented-subteam paths must be a prefix of the represented leaf path. Parent-boundary sender normalization in `mixed-team-manager.ts` now uses root-aware full-prefix checks instead of first-segment matching.
- `CR-ROUND11-002`: normalized bridged child `COMMUNICATION` events in `mixed-team-event-bridge.ts` so the outer event and the communication payload are parent-rooted together while preserving nested source/participant route identity. `TeamCommunicationService` now keys canonical communication projection rows by the outer event team-run ID at the stream/projection boundary.
- `CR-ROUND11-003`: updated the live nested runtime E2E durable assertions in `nested-mixed-team-runtime-graphql.e2e.test.ts` to assert flattened sender/receiver transport fields and represented-subteam metadata instead of the obsolete nested `payload.receiver` object shape.

Regression coverage added/updated:

- Backend participant invariant tests preserve exact participant/address path equality and reject divergent participant or represented-subteam address paths.
- Backend mixed-manager tests cover already-parent-rooted child senders and the full-prefix/root-aware normalization case that first-segment matching would misroute.
- Backend event-bridge and team-communication-service tests cover child-internal `BuildSquad/review_lead -> BuildSquad/qa_specialist` communication being visible under the parent team run.
- Frontend team communication store tests cover parent-run visibility and route/path perspective lookup for child-internal nested communication.

## Code Review Round 12 Local Checks

Passed:

- `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit --pretty false`
  - Result: passed.
- `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-team-execution/inter-agent-message-delivery.test.ts tests/unit/agent-team-execution/member-team-context-builder.test.ts tests/unit/agent-team-execution/inter-agent-message-runtime-builders.test.ts tests/unit/agent-team-execution/mixed-sub-team-member-handle.test.ts tests/unit/agent-team-execution/mixed-team-manager.test.ts tests/unit/agent-team-execution/mixed-team-event-bridge.test.ts tests/unit/services/agent-streaming/agent-team-stream-handler.test.ts tests/unit/services/team-communication/team-communication-service.test.ts --reporter=dot`
  - Result: `8` files passed, `35` tests passed.
- `pnpm -C autobyteus-web exec vitest run stores/__tests__/teamCommunicationStore.spec.ts components/workspace/team/__tests__/TeamCommunicationPanel.spec.ts services/agentStreaming/__tests__/TeamStreamingService.spec.ts --reporter=dot`
  - Result: `3` files passed, `27` tests passed.
  - Notes: output includes the existing KaTeX quirks-mode warning from Markdown renderer tests.
- `pnpm -C autobyteus-web audit:localization-literals`
  - Result: passed with zero unresolved findings.
- `git diff --check`
  - Result: passed.
- Custom changed/untracked non-test `.ts` / `.vue` source size audit.
  - Result: `41` changed/untracked non-test source files checked; no file exceeded `500` non-empty lines.

API/E2E/full-stack validation remains paused until code review passes again.

## Code Review Round 13 Local Fix Update

Round 13 re-review left only the narrow `CR-ROUND11-002` sourcePath edge open. This local fix keeps the Round 12 payload/projection normalization intact and adjusts bridged outer `sourcePath` prefixing to use event root context instead of path content alone:

- `mixed-team-event-bridge.ts`: `prefixMixedSubTeamEvent(...)` now calls the same root-aware prefix helper used for participants, with `event.teamRunId === parentTeamRunId` as the already-parent-rooted signal. Child-run events are always prefixed by the parent subteam path, even when their child-local `sourcePath` begins with the same segment as `sourcePrefix`.
- `mixed-team-event-bridge.test.ts`: added the same-name regression requested by code review: `sourcePrefix: ["BuildSquad"]`, child event `teamRunId: "child-run"`, child-local `sourcePath: ["BuildSquad"]` now bridges to canonical outer `sourcePath: ["BuildSquad", "BuildSquad"]` and keeps the prefixed participant route/address aligned.

## Code Review Round 13 Local Checks

Passed:

- `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit --pretty false`
  - Result: passed.
- `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-team-execution/mixed-team-event-bridge.test.ts --reporter=dot`
  - Result: `1` file passed, `2` tests passed.
- `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-team-execution/inter-agent-message-delivery.test.ts tests/unit/agent-team-execution/member-team-context-builder.test.ts tests/unit/agent-team-execution/inter-agent-message-runtime-builders.test.ts tests/unit/agent-team-execution/mixed-sub-team-member-handle.test.ts tests/unit/agent-team-execution/mixed-team-manager.test.ts tests/unit/agent-team-execution/mixed-team-event-bridge.test.ts tests/unit/services/agent-streaming/agent-team-stream-handler.test.ts tests/unit/services/team-communication/team-communication-service.test.ts --reporter=dot`
  - Result: `8` files passed, `36` tests passed.
- `pnpm -C autobyteus-web audit:localization-literals`
  - Result: passed with zero unresolved findings.
- `git diff --check`
  - Result: passed.
- Custom changed/untracked non-test `.ts` / `.vue` source size audit.
  - Result: `41` changed/untracked non-test source files checked; no file exceeded `500` non-empty lines.

API/E2E/full-stack validation remains paused until code review passes again.

## Architecture Round 12 Roster Manifest Implementation Update

Implemented the approved LLM-facing team membership roster manifest refinement without changing the Round 11 runtime routing contract:

- Added `member-team-roster-manifest.ts` as the prompt-presentation/read-model owner. It derives `TeamMembershipRosterManifest` from `MemberTeamContext.communicationRecipients`, current member metadata, parent-boundary presentation metadata, and exact `allowedRecipientNames`; it does not resolve or mutate routing descriptors.
- Updated `MemberRunInstructionComposer` to inject the rendered organization-style roster manifest and exact allowed `recipient_name` list instead of the old flat `Teammates:` prompt block.
- Extended `MemberTeamContext` with presentation metadata needed by the manifest: `teamName`, `coordinatorMemberRouteKey`, and optional `parentBoundary` display metadata.
- Updated `MemberTeamContextBuilder` to resolve current team display names and parent-boundary display names. For a child team running through a parent boundary, the child context uses the represented subteam membership name such as `BuildSquad`; the parent context name can resolve through `parentTeamDefinitionId`, such as `Delivery Leadership Team`.
- Passed parent team definition metadata through `MixedSubTeamMemberHandle` / `MixedParentBoundaryContext` for child coordinator prompts.
- Updated Codex and Claude instruction paths to pass the full `MemberTeamContext` into the composer while leaving tool schema enums and delivery resolution owned by `communicationRecipients` descriptors.

Focused AC-032 coverage:

- `member-run-instruction-composer.test.ts` now verifies `BuildSquad/review_lead` instructions render named contexts `BuildSquad` and `Delivery Leadership Team`, mark `review_lead` as self/coordinator/representative, list `qa_specialist` and `program_manager`, include the exact allowed `send_message_to` recipient names, and avoid technical scope headings such as `local_agent`, `parent_boundary_agent`, `local child-team recipients`, or `parent-boundary recipients`.
- Claude session tool-gating fixtures now carry real `communicationRecipients` descriptors so send-message prompt gating exercises the manifest path rather than only an allowed-name fallback.

## Architecture Round 12 Roster Manifest Local Checks

Passed:

- `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit --pretty false`
  - Result: passed.
- `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-team-execution/member-run-instruction-composer.test.ts tests/unit/agent-team-execution/member-team-context-builder.test.ts tests/unit/agent-execution/backends/codex/team-communication/team-member-codex-thread-bootstrap-strategy.test.ts tests/unit/agent-execution/backends/claude/session/claude-session-tool-gating.test.ts --reporter=dot`
  - Result: `4` files passed, `15` tests passed.
- `git diff --check`
  - Result: passed.
- Custom changed/untracked non-test `.ts` / `.vue` source size audit.
  - Result: `8` changed/untracked non-test source files checked; no file exceeded `500` non-empty lines.

API/E2E/full-stack validation remains paused until code review passes again.

## Delivery Round 8 Latest-Base Integration Local Fix

Resolved the delivery-blocking merge conflicts from the required latest-base refresh against `origin/personal @ a51d3abd8bb6` while preserving the reviewed/API-E2E-passed Round 8 nested mixed-team roster/communication behavior.

Key integration decisions:

- Preserved Round 8 recursive frontend topology (`memberTree`, `memberNodesByRouteKey`, `leafAgentContextsByRouteKey`, `focusedMemberRouteKey`) across the conflicted team grid/spotlight/workspace, run-open, run-hydration, run-recovery, and run-history helper paths.
- Integrated the newer base runtime-status contract (`AGENT_STATUS`/`TEAM_STATUS` using canonical `offline | idle | running | error`, `INTERRUPT_GENERATION`, and runtime status snapshots) without reintroducing flat `focusedMemberName` / `members` authority in the active frontend team context.
- Kept nested team stream identity intact: `source_path` / `source_route_key`, `member_path` / `member_route_key`, `MEMBER_INPUT`, and flattened live `TEAM_COMMUNICATION_MESSAGE` payloads remain the transport contract.
- Kept Round 8 prompt/roster behavior intact: clean named rosters expose real recipient names only; descriptor-owned routing remains authoritative; `allowedRecipientNames` remains a derived schema/edge list.
- Updated nested run-history row projection to carry canonical per-member runtime statuses while preserving recursive team rows from metadata/context rather than falling back to flat rows.
- Resolved docs conflicts by documenting both the nested selector/member-input/team-approval identity contract and the latest base interrupt/status contract.
- Preserved delivery-owned `release-deployment-report.md` edits; the new delivery blocker artifact remains available at `delivery-round8-integration-blocker.md`.

Implementation notes:

- `autobyteus-ts` was rebuilt locally (`pnpm -C autobyteus-ts build`) before server typecheck so the workspace package `dist` declarations reflect the latest base interrupt stream events used by `autobyteus-server-ts`.
- The merge conflicts are resolved in the worktree/index; no unresolved conflict markers or unmerged paths remain.

## Delivery Round 8 Integration Local Checks

Passed:

- `pnpm -C autobyteus-ts build`
  - Result: passed; runtime dependency verification passed.
- `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit --pretty false`
  - Result: passed.
- `pnpm -C autobyteus-server-ts exec vitest run tests/unit/services/agent-streaming/agent-team-stream-handler.test.ts tests/unit/agent-team-execution/member-run-instruction-composer.test.ts tests/unit/agent-team-execution/member-team-context-builder.test.ts tests/unit/agent-team-execution/mixed-team-event-bridge.test.ts tests/unit/agent-team-execution/team-status-aggregation.test.ts --reporter=dot`
  - Result: `5` files passed, `26` tests passed.
- `pnpm -C autobyteus-web exec vitest run components/workspace/team/__tests__/TeamGridView.spec.ts components/workspace/team/__tests__/TeamSpotlightView.spec.ts components/workspace/team/__tests__/TeamWorkspaceView.spec.ts stores/__tests__/agentTeamContextsStore.spec.ts stores/__tests__/agentTeamRunStore.spec.ts services/runOpen/__tests__/teamRunOpenCoordinator.spec.ts services/runRecovery/__tests__/activeRunRecoveryCoordinator.spec.ts stores/__tests__/runHistoryTeamRows.spec.ts --reporter=dot`
  - Result: `8` files passed, `41` tests passed.
  - Notes: output includes existing KaTeX quirks-mode warnings from Markdown renderer tests.
- `pnpm -C autobyteus-web audit:localization-literals`
  - Result: passed with zero unresolved findings.
- `git diff --check`
  - Result: passed.
- Custom changed `.ts` / `.vue` source size audit against `origin/personal`.
  - Result: `216` changed files checked; no changed non-test implementation source file exceeded `500` non-empty lines.

API/E2E/full-stack validation and delivery packaging remain paused until this integrated source state passes code review again.

## Code Review Round 16 Local Fix Update

Addressed `CR-ROUND8-INTEGRATION-001`, the stale canonical-status merge issue found in the active frontend team monitor tile source:

- `TeamMemberMonitorTile.vue` now falls back to canonical `AgentStatus.Offline` when rendering a structural subteam/no-`memberContext` tile, instead of the removed `AgentStatus.Uninitialized` enum member.
- `TeamMemberMonitorTile.spec.ts` adds focused regression coverage for a focused `agent_team` tile with no `memberContext`, verifying the header renders `Offline`, keeps the subteam display/badge, and does not require a leaf agent context.

## Code Review Round 16 Local Checks

Passed:

- `pnpm -C autobyteus-web exec vitest run components/workspace/team/__tests__/TeamMemberMonitorTile.spec.ts components/workspace/team/__tests__/TeamGridView.spec.ts components/workspace/team/__tests__/TeamSpotlightView.spec.ts components/workspace/team/__tests__/TeamWorkspaceView.spec.ts stores/__tests__/agentTeamContextsStore.spec.ts stores/__tests__/agentTeamRunStore.spec.ts services/runOpen/__tests__/teamRunOpenCoordinator.spec.ts services/runRecovery/__tests__/activeRunRecoveryCoordinator.spec.ts stores/__tests__/runHistoryTeamRows.spec.ts --reporter=dot`
  - Result: `9` files passed, `43` tests passed.
  - Notes: output includes existing KaTeX quirks-mode warnings from Markdown renderer tests and the expected negative termination log in `agentTeamRunStore.spec.ts`.
- Active-source removed status grep:
  - Command: `grep -R "AgentStatus\.\(Uninitialized\|ShutdownComplete\|ProcessingUserInput\|AwaitingToolApproval\|ExecutingTool\|ToolDenied\)" -n autobyteus-web --include='*.ts' --include='*.vue' --exclude-dir=node_modules --exclude-dir=.nuxt --exclude-dir=dist --exclude-dir=electron-dist --exclude-dir=tickets --exclude-dir=docs`
  - Result: no matches.
- `pnpm -C autobyteus-web audit:localization-literals`
  - Result: passed with zero unresolved findings.
- `git diff --check`
  - Result: passed.
- Custom changed `.ts` / `.vue` source size audit against `origin/personal`.
  - Result: `217` changed files checked; no changed non-test implementation source file exceeded `500` non-empty lines.

API/E2E/full-stack validation and delivery packaging remain paused until code review passes again.

## Code Review Round 16 No-Legacy Follow-Up

After the user emphasized that the latest-base update must be handled as a clean target-state update rather than backward-compatible fallback code, I re-audited the active frontend source touched by the integration and removed an additional stale fallback path in the tool-approval spine.

Implementation updates:

- `agentTeamRunStore.ts` no longer synthesizes a tool-approval target from the currently focused member when an approval request lacks an explicit event target. Approval and denial now pass the supplied `ToolApprovalTarget` through unchanged; `TeamStreamingService` remains the authoritative edge that can resolve a captured approval-request target by `invocationId`.
- `agentTeamRunStore.spec.ts` adds a regression proving that a focused structural subteam (`BuildSquad`) is not used as a fabricated approval target when the caller supplies no target.
- `toolActivityProjection.ts` now updates approval target metadata by the canonical invocation id directly. This completes the latest-base canonical invocation identity cleanup and removes the last stale `resolveActivityInvocationIds` reference rather than restoring the deleted invocation-alias compatibility helper.

No-legacy audit results:

- Removed status enum refs in active web source: no matches for `AgentStatus.Uninitialized`, `ShutdownComplete`, `ProcessingUserInput`, `AwaitingToolApproval`, `ExecutingTool`, or `ToolDenied`.
- Active frontend team source authority audit: no active-source `focusedMemberName` authority refs outside tests.
- Legacy approval/invocation fallback audit: no active-source matches for `resolveActivityInvocationIds`, `invocationAliases`, `fallbackTarget`, or focused-member approval fallback patterns.

## Code Review Round 16 No-Legacy Follow-Up Checks

Passed:

- `pnpm -C autobyteus-web exec vitest run components/workspace/team/__tests__/TeamMemberMonitorTile.spec.ts stores/__tests__/agentTeamRunStore.spec.ts components/workspace/team/__tests__/TeamGridView.spec.ts components/workspace/team/__tests__/TeamSpotlightView.spec.ts components/workspace/team/__tests__/TeamWorkspaceView.spec.ts stores/__tests__/agentTeamContextsStore.spec.ts services/runOpen/__tests__/teamRunOpenCoordinator.spec.ts services/runRecovery/__tests__/activeRunRecoveryCoordinator.spec.ts stores/__tests__/runHistoryTeamRows.spec.ts services/agentStreaming/__tests__/TeamStreamingService.spec.ts --reporter=dot`
  - Result: `10` files passed, `55` tests passed.
  - Notes: output includes existing KaTeX quirks-mode warnings from Markdown renderer tests and the expected negative termination log in `agentTeamRunStore.spec.ts`.
- `pnpm -C autobyteus-web audit:localization-literals`
  - Result: passed with zero unresolved findings.
- `git diff --check`
  - Result: passed.
- Active-source removed status grep.
  - Result: no matches.
- Active-source no-legacy approval/invocation fallback grep.
  - Result: no matches.
- Active-source `focusedMemberName` authority grep outside tests.
  - Result: no matches.
- `pnpm -C autobyteus-web exec nuxi typecheck --noEmit --pretty false` targeted probe.
  - Result: the known broad typecheck remains non-clean, but the Round 16 blocker signature is absent: no `TeamMemberMonitorTile.vue`, `AgentStatus.Uninitialized`, or `Property 'Uninitialized'` diagnostics were present in the captured output.
- Custom changed `.ts` / `.vue` source size audit for current implementation-owned local changes.
  - Result: `3` changed TS/Vue files checked; no changed non-test implementation source file exceeded `500` non-empty lines.

API/E2E/full-stack validation and delivery packaging remain paused until code review passes this no-legacy integrated source state again.

## Code Review Round 17 Local Fix Update

Addressed `CR-ROUND8-INTEGRATION-002` by removing the remaining legacy scalar approval-target alias from `TeamStreamingService`.

Implementation updates:

- `TeamStreamingService.approveTool(...)` and `denyTool(...)` now accept only `ToolApprovalTarget | null | undefined` for team approval target identity. The public service API no longer exposes `ToolApprovalTarget | string | null`.
- Removed the `typeof target === 'string'` conversion branch from `resolveApprovalTarget(...)`; structured selector identity and cached approval-request target identity are the only accepted target paths.
- Updated `TeamStreamingService.spec.ts` to approve with an explicit structured `{ memberRouteKey: 'worker-a' }` target instead of scalar `'worker-a'`, while the existing nested approval test continues to prove cached event target resolution after focus changes.

No-legacy audit results:

- No active-source matches for `ToolApprovalTarget | string`.
- No active-source matches for `typeof target === 'string'` / `typeof target === "string"` approval-target handling.
- No active-source matches for scalar `approveTool(..., 'member')` / `denyTool(..., 'member')` call patterns.
- Removed status enum refs remain absent in active web source.

## Code Review Round 17 Local Checks

Passed:

- `pnpm -C autobyteus-web exec vitest run services/agentStreaming/__tests__/TeamStreamingService.spec.ts stores/__tests__/agentTeamRunStore.spec.ts components/workspace/team/__tests__/TeamMemberMonitorTile.spec.ts --reporter=dot`
  - Result: `3` files passed, `26` tests passed.
  - Notes: output includes the expected negative termination log in `agentTeamRunStore.spec.ts` and an existing KaTeX quirks-mode warning from Markdown renderer tests.
- `pnpm -C autobyteus-web exec vitest run components/workspace/team/__tests__/TeamMemberMonitorTile.spec.ts stores/__tests__/agentTeamRunStore.spec.ts components/workspace/team/__tests__/TeamGridView.spec.ts components/workspace/team/__tests__/TeamSpotlightView.spec.ts components/workspace/team/__tests__/TeamWorkspaceView.spec.ts stores/__tests__/agentTeamContextsStore.spec.ts services/runOpen/__tests__/teamRunOpenCoordinator.spec.ts services/runRecovery/__tests__/activeRunRecoveryCoordinator.spec.ts stores/__tests__/runHistoryTeamRows.spec.ts services/agentStreaming/__tests__/TeamStreamingService.spec.ts --reporter=dot`
  - Result: `10` files passed, `55` tests passed.
  - Notes: output includes existing KaTeX quirks-mode warnings from Markdown renderer tests and the expected negative termination log in `agentTeamRunStore.spec.ts`.
- `pnpm -C autobyteus-web audit:localization-literals`
  - Result: passed with zero unresolved findings.
- `git diff --check`
  - Result: passed.
- No-legacy approval target grep for `ToolApprovalTarget | string`, `typeof target === 'string'`, and scalar `approveTool(..., 'member')` / `denyTool(..., 'member')` patterns.
  - Result: no matches.
- Active-source removed status grep.
  - Result: no matches.
- Custom changed `.ts` / `.vue` source size audit for current local fix.
  - Result: `2` changed TS/Vue files checked; no changed non-test implementation source file exceeded `500` non-empty lines.

API/E2E/full-stack validation and delivery packaging remain paused until code review passes this no-legacy source state again.

## Code Review Round 19 / Architecture Round 14 Command API Clean-Cut Update

Addressed the superseding no-legacy integrated-state findings from Round 19 code review and the Round 14 architecture-approved command API correction. This pass intentionally removes cleanly instead of preserving compatibility aliases.

Implementation updates:

- `TeamMemberSelector` is now path/route-only. The `top_level_name` selector variant, `selectorFromMemberName(...)`, and `selectorFromOptionalTargetName(...)` were removed from the domain command identity model.
- Mixed dispatch derives the executable top-level subteam handle only from an already accepted `memberPath[0]` or first route-key segment; it no longer creates or resolves a bare-name selector.
- `team-member-selector-payload-adapter.ts` parses only explicit path and route-key fields. The old configurable `nameKeys` branch was deleted.
- Team WebSocket commands now reject scalar/name/id command target aliases (`target_member_name`, `target_agent_name`, `target_member_id`, `target_agent_id`, `agent_name`, `agent_id`, `member_name`, `member_id`, and camelCase equivalents). `SEND_MESSAGE` accepts only `target_member_path` / `target_member_route_key`; `APPROVE_TOOL` / `DENY_TOOL` accept only source/member/target path or route-key selector fields.
- Frontend team command payload types expose only route/path selector fields. `SendMessagePayload` no longer has `target_member_name`, and `ToolActionPayload` no longer has command-side `agent_name` / `agent_id`.
- Frontend live team-event routing no longer treats `agent_name` as a route fallback. It routes by canonical `source_*` / `member_*` route/path identity and uses `agent_id` only after route resolution to update runtime run-id correlation.
- Runtime status normalization now accepts only canonical active UI statuses (`offline`, `idle`, `running`, `error`) plus current persisted run-history statuses (`ACTIVE`, `TERMINATED`). Removed lifecycle tokens (`uninitialized`, `bootstrapping`, `awaiting_llm_response`, `awaiting_tool_approval`, `executing_tool`, `tool_denied`, `shutdown_complete`) fall back instead of being preserved.
- Existing status fixtures touched by the integrated-state review were updated away from removed lifecycle tokens. A focused normalization regression now proves removed lifecycle tokens are not accepted as valid current statuses.

No-legacy audit results:

- No active server source/test matches for `top_level_name`, `selectorFromMemberName`, `selectorFromOptionalTargetName`, or `nameKeys:` outside generated JavaScript.
- Command scalar target aliases only remain in `AgentTeamStreamHandler` as explicit rejection keys and in unit tests as negative-rejection fixtures.
- Client command payload types show route/path selector fields only.
- Active web source has no removed runtime lifecycle status-token matches; the only remaining removed-token strings are negative normalization tests. The `bootstrapping-*` matches in `VoiceInputExtensionCard.vue` are unrelated voice-extension install phases, not agent/team runtime statuses.

## Code Review Round 19 / Architecture Round 14 Local Checks

Passed:

- `pnpm -C autobyteus-server-ts exec vitest run tests/unit/services/agent-streaming/agent-team-stream-handler.test.ts tests/integration/agent/agent-team-websocket.integration.test.ts tests/integration/agent-team-execution/mixed-team-run-backend.integration.test.ts tests/unit/external-channel/runtime/channel-team-run-facade.test.ts --reporter=dot`
  - Result: `4` files passed, `31` tests passed.
- `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-team-execution/team-run.test.ts tests/unit/agent-team-execution/mixed-sub-team-member-handle.test.ts tests/unit/agent-team-execution/mixed-team-manager.test.ts tests/unit/services/agent-streaming/agent-team-stream-handler.test.ts --reporter=dot`
  - Result: `4` files passed, `22` tests passed.
- `pnpm -C autobyteus-server-ts exec vitest run tests/integration/agent/agent-team-websocket.integration.test.ts tests/integration/agent-team-execution/mixed-team-run-backend.integration.test.ts tests/unit/external-channel/runtime/channel-team-run-facade.test.ts --reporter=dot`
  - Result: `3` files passed, `18` tests passed.
- `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit --pretty false`
  - Result: passed.
- `pnpm -C autobyteus-web exec vitest run services/runHydration/__tests__/runtimeStatusNormalization.spec.ts services/runRecovery/__tests__/activeRunRecoveryCoordinator.spec.ts stores/__tests__/runHistoryTeamRows.spec.ts services/agentStreaming/__tests__/TeamStreamingService.spec.ts --reporter=dot`
  - Result: `4` files passed, `18` tests passed.
- `pnpm -C autobyteus-web audit:localization-literals`
  - Result: passed with zero unresolved findings.
- `git diff --check`
  - Result: passed.
- No-legacy scans for removed selector helpers/variants, WebSocket command scalar aliases, and removed active runtime lifecycle statuses.
  - Result: passed with only expected rejection-key/negative-test/display-metadata findings described above.
- Custom changed non-test `.ts` / `.vue` source size audit.
  - Result: `10` changed non-test TS/Vue source files checked; no changed implementation file exceeded `500` non-empty lines.

API/E2E/full-stack validation and delivery packaging remain paused until code review passes this no-legacy integrated source state again.


## Code Review Round 21 Local Fix Update

Addressed all three Round 21 no-legacy command API review findings with clean-cut route/path behavior only.

Implementation updates:

- Added structured camelCase command selector support at the WebSocket command boundary without reintroducing scalar aliases:
  - `SEND_MESSAGE` now accepts `targetMemberRouteKey` / `targetMemberPath` alongside the documented snake_case route/path fields.
  - `APPROVE_TOOL` / `DENY_TOOL` now accept `sourceRouteKey` / `sourcePath`, `memberRouteKey` / `memberPath`, and `targetMemberRouteKey` / `targetMemberPath` alongside documented snake_case fields.
- Extracted command selector parsing/rejection policy into `team-command-selector-parser.ts` so `AgentTeamStreamHandler` remains below the source-size guardrail while the command boundary stays explicit and centralized.
- Scalar command target aliases now produce a WebSocket `ERROR` with stable code `INVALID_TARGET` instead of log-only rejection. Missing tool approval target identity also returns `INVALID_TARGET`.
- External-channel team live messages now publish canonical `member_route_key` / `member_path` and `source_route_key` / `source_path` derived from the accepted team dispatch target/runtime member correlation. `agent_name` / `agent_id` remain display/correlation metadata only.
- Frontend team live stream routing no longer falls back to `focusedMemberRouteKey` when canonical source/member route/path identity is absent. Member-scoped events without canonical route/path identity are skipped instead of being attributed to the focused member.
- `TeamStreamingService` protocol payload types now include documented structured camelCase command selector fields and external user message display metadata while keeping command authority route/path-only.

Regression coverage added/updated:

- Backend unit tests cover camelCase send and approval selectors, `INVALID_TARGET` responses for all scalar send/approval aliases, and missing approval-target rejection.
- Backend integration tests cover camelCase `SEND_MESSAGE`, camelCase approval targeting, and `INVALID_TARGET` WebSocket errors for scalar send/approval aliases plus missing approval target.
- External-channel facade/publisher tests cover live external team message publication with canonical route/path identity.
- Frontend streaming tests cover route/path-only member event routing and prove old no-route live payloads do not route through the focused member.

No-legacy audit results:

- Removed selector helpers/variants remain absent: no matches for `top_level_name`, `selectorFromMemberName`, `selectorFromOptionalTargetName`, or `nameKeys:` in active source/tests.
- Frontend scalar approval-target compatibility remains absent: no matches for `ToolApprovalTarget | string`, `typeof target === 'string'`, or scalar `approveTool(..., 'member')` / `denyTool(..., 'member')` patterns. The only grep hit is `approveTool('inv-nested')`, which has no scalar target argument.
- Scalar command alias strings remain only in the explicit invalid-target rejection-key owner and negative tests.
- `TeamStreamingService` active code has no `focusedMemberRouteKey` event-routing fallback; `agent_name` is not used as route authority.

## Code Review Round 21 Local Checks

Passed:

- `pnpm -C autobyteus-server-ts exec vitest run tests/unit/services/agent-streaming/agent-team-stream-handler.test.ts tests/unit/services/agent-streaming/team-live-message-publisher.test.ts tests/unit/external-channel/runtime/channel-team-run-facade.test.ts tests/integration/agent/agent-team-websocket.integration.test.ts --reporter=dot`
  - Result: `4` files passed, `32` tests passed.
- `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-team-execution/team-run.test.ts tests/unit/agent-team-execution/mixed-sub-team-member-handle.test.ts tests/unit/agent-team-execution/mixed-team-manager.test.ts tests/unit/services/agent-streaming/agent-team-stream-handler.test.ts --reporter=dot`
  - Result: `4` files passed, `25` tests passed.
- `pnpm -C autobyteus-server-ts exec vitest run tests/integration/agent-team-execution/mixed-team-run-backend.integration.test.ts --reporter=dot`
  - Result: `1` file passed, `3` tests passed.
- `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit --pretty false`
  - Result: passed.
- `pnpm -C autobyteus-web exec vitest run services/runHydration/__tests__/runtimeStatusNormalization.spec.ts services/runRecovery/__tests__/activeRunRecoveryCoordinator.spec.ts stores/__tests__/runHistoryTeamRows.spec.ts services/agentStreaming/__tests__/TeamStreamingService.spec.ts --reporter=dot`
  - Result: `4` files passed, `19` tests passed.
- `pnpm -C autobyteus-web audit:localization-literals`
  - Result: passed with zero unresolved findings.
- `git diff --check`
  - Result: passed.
- No-legacy scans for removed selector helpers/variants, scalar approval-target compatibility, active command alias authority, and focused-member live routing fallback.
  - Result: passed with only expected invalid-target rejection-key / negative-test / display-metadata findings described above.
- Custom changed/untracked non-test `.ts` / `.vue` source size audit.
  - Result: `7` changed/untracked implementation source files checked; no file exceeded `500` non-empty lines.

API/E2E/full-stack validation and delivery packaging remain paused until code review passes this Round 21 local fix.

## Delivery Round 12 Latest-Base Integration Local Fix Update

Integrated the ticket branch with the latest tracked base and preserved the Round 21 clean-cut command identity behavior.

Integration work:

- Fetched and merged `origin/personal @ 29c872bbae3f20a492701443b62a0e13a8924966` into `codex/mixed-team-nested-agent-team`.
- Resolved backend runtime, WebSocket command, frontend streaming, docs, and focused-interrupt test conflicts from the focused-member interrupt routing release.
- Kept public/team WebSocket command authority route/path-only:
  - `SEND_MESSAGE`, tool approval, and team interrupt commands accept explicit route/path selector fields only.
  - Team interrupt uses `target_member_route_key` / `targetMemberRouteKey` or `target_member_path` / `targetMemberPath`, with optional `target_member_run_id` / `targetMemberRunId` as a guard.
  - Scalar command aliases such as `target_member_name`, `target_agent_name`, command-side `agent_name`, and command-side `agent_id` remain invalid-target inputs, not compatibility paths.
- Preserved latest-base active focused-member interrupt semantics by translating the frontend focused route key to canonical route-key command payloads, not bare member names or agent IDs.
- Updated mixed nested interrupt routing so `MixedTeamMemberHandle.interrupt(...)` receives the accepted selector and optional run-id guard, delegates through active subteam handles, and does not fall back to aggregate/team-wide interrupt behavior.
- Extracted team-run event WebSocket message mapping into `team-run-event-websocket-message-mapper.ts` to keep `AgentTeamStreamHandler` below the source-size guardrail after the integration.
- Restored pre-merge delivery/ticket artifacts from the protected stash and resolved documentation conflicts to describe route/path-only command identity plus latest focused-interrupt behavior.

No-legacy audit notes:

- Removed command selector helpers/variants remain absent from active command paths: `top_level_name`, `selectorFromMemberName`, `selectorFromOptionalTargetName`, and `nameKeys:` are not present.
- Frontend scalar tool-approval target compatibility remains absent: no `ToolApprovalTarget | string` or `typeof target === 'string'` branch.
- Legacy scalar command alias strings appear only in the explicit invalid-target rejection-key owner and negative tests.
- Outbound/display `agent_name` / `agent_id` metadata is preserved only as display/correlation data, not command target authority.

## Delivery Round 12 Latest-Base Integration Local Checks

Passed:

- `pnpm -C autobyteus-server-ts exec vitest run tests/unit/services/agent-streaming/agent-team-stream-handler.test.ts tests/integration/agent/agent-team-websocket.integration.test.ts tests/unit/agent-team-execution/team-manager-member-interrupt.test.ts --reporter=dot`
  - Result: `3` files passed, `35` tests passed.
- `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit --pretty false`
  - Result: passed.
- `pnpm -C autobyteus-web exec vitest run services/agentStreaming/__tests__/TeamStreamingService.spec.ts stores/__tests__/activeContextStore.spec.ts stores/__tests__/agentTeamRunStore.spec.ts components/agentInput/__tests__/AgentUserInputTextArea.focusedInterrupt.e2e.spec.ts --reporter=dot`
  - Result: `4` files passed, `32` tests passed.
- `pnpm -C autobyteus-web audit:localization-literals`
  - Result: passed with zero unresolved findings.
- `git diff --check`
  - Result: passed.
- Targeted no-legacy command selector scan across active streaming/selector/frontend command source.
  - Result: passed with only explicit invalid-target rejection-key hits in `team-command-selector-parser.ts` and expected negative-test/display-metadata findings.
- Conflict marker scan for `<<<<<<<` / `>>>>>>>` outside generated dependency/build directories.
  - Result: passed.
- Custom changed/untracked non-test `.ts` / `.vue` source size audit.
  - Result: `137` changed/untracked non-test TS/Vue source files checked; no file exceeded `500` non-empty lines.

API/E2E/full-stack validation and delivery packaging remain paused until code review passes this latest-base integrated state.

## Architecture Round 16 App Data Migration Implementation Update

Implemented the approved app-data-migration design reset as an isolated migration subsystem. Runtime stores, frontend parsers, and normal history/restore mappers remain current-schema-only; legacy flat team metadata conversion exists only inside the app-data-migration implementation.

Implementation updates:

- Added `AppDataMigrationRecord` persistence and Prisma migration `20260517090000_add_app_data_migration_records` for durable migration status, attempt counts, summaries, errors, and log paths.
- Added the app-data-migration subsystem:
  - `AppDataMigrationRegistry` owns the registered migration definitions.
  - `AppDataMigrationRunner` owns startup/manual execution, in-process duplicate-run rejection, stale `RUNNING` handling, retry eligibility, status snapshots, and migration log files.
  - `AppDataMigrationRecordRepository` owns DB read/write for migration records.
- Added `TeamRunMetadataMemberTreeMigration` as the only legacy flat metadata conversion owner. It scans team metadata files, skips already-current `memberTree` files idempotently, converts only equivalent flat top-level agent-only records, writes a timestamped backup, writes through a temp file and atomic rename, records per-file details, and leaves unsafe legacy nested/topology-lost files as explicit failures instead of guessing topology.
- Extracted current recursive team metadata validation/normalization into `team-run-metadata-schema.ts` so both `TeamRunMetadataStore` and the migration can validate canonical `memberTree` output without adding a runtime dual-schema reader.
- Kept `TeamRunMetadataStore` current-schema-only: `memberMetadata` / `runVersion` still throw typed unsupported legacy metadata errors and are not converted at runtime.
- Startup now runs pending required app-data migrations after Prisma migrations and before normal service bootstrap continues.
- Added GraphQL thin facade:
  - `getAppDataMigrations`
  - `runAppDataMigration(migrationId)`
- Added Settings -> Server -> Migrations UI, dedicated Pinia store, GraphQL query/mutation documents, localized English/zh-CN strings, status/details display, and manual retry action.
- Direct restore/open of unmigrated legacy team metadata now returns a friendly upgrade-required message rather than exposing the raw unsupported metadata exception; team history listing skips unmigrated legacy rows with a logged migration hint until the migration succeeds.

Focused regression coverage added:

- Migration converts flat top-level agent-only metadata to canonical `memberTree` and writes a backup.
- Migration skips current `memberTree` metadata idempotently.
- Migration records partial failures while continuing other files.
- Migration fails legacy flat metadata with nested route/path identity instead of inferring nested topology.
- Runner rejects true concurrent duplicate retry in-process.
- Runner treats stale `RUNNING` records as retryable.
- Runner lists registered migrations even before DB records exist.
- Frontend app-data migration store fetches statuses and runs/refreshes a migration.
- Settings routes expose the new Server -> Migrations tab and render the migrations manager.

Important clean-cut notes:

- No runtime/frontend dual-read or compatibility conversion was added. Legacy conversion is isolated to `TeamRunMetadataMemberTreeMigration`.
- Existing current-schema parsers still reject `memberMetadata` / `runVersion`; this is intentional and is now paired with a friendly migration-required diagnostic at history/restore edges.
- Unsafe topology-lost legacy records remain explicit migration failures so the app does not reconstruct nested team topology from flat rows.

## Architecture Round 16 App Data Migration Local Checks

Passed:

- `pnpm -C autobyteus-server-ts exec vitest run tests/unit/app-data-migrations/team-run-metadata-member-tree-migration.test.ts tests/unit/app-data-migrations/app-data-migration-runner.test.ts --reporter=dot`
  - Result: `2` files passed, `7` tests passed.
- `pnpm -C autobyteus-server-ts exec vitest run tests/unit/run-history/store/team-run-metadata-store.test.ts tests/unit/run-history/services/team-run-history-service.test.ts --reporter=dot`
  - Result: `2` files passed, `11` tests passed.
- `pnpm -C autobyteus-web exec vitest run stores/__tests__/appDataMigrationsStore.spec.ts components/settings/__tests__/ServerSettingsManager.spec.ts pages/__tests__/settings.spec.ts --reporter=dot`
  - Result: `3` files passed, `26` tests passed.
- `pnpm -C autobyteus-web audit:localization-literals`
  - Result: passed with zero unresolved findings.
- `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit --pretty false`
  - Result: passed.
- `pnpm -C autobyteus-server-ts exec prisma validate`
  - Result: passed.
- `git diff --check`
  - Result: passed.
- Runtime legacy conversion isolation grep:
  - Command: `rg -n "memberMetadata|runVersion" autobyteus-server-ts/src autobyteus-web --glob '!src/app-data-migrations/**' --glob '!**/node_modules/**'`
  - Result: only current-schema rejection, current recursive member metadata variable names, existing tests, and the isolated app-data-migration owner contain legacy schema terms; no runtime conversion path was introduced.
- Custom changed/untracked non-test `.ts` / `.vue` source size audit.
  - Result: `20` changed/untracked non-test TS/Vue source files checked; no file exceeded `500` non-empty lines.

API/E2E/full-stack validation and delivery packaging remain paused until code review passes this app-data-migration implementation state.

## API/E2E Round 14 Local Fix Update

Addressed `APPDATA-MIG-005`, where `listWorkspaceRunHistory` could still leak the raw unsupported legacy metadata error when the team history index was empty and rebuilt from disk.

Implementation updates:

- `TeamRunHistoryIndexService.rebuildIndexFromDisk()` now catches `UnsupportedLegacyTeamRunMetadataError` for unmigrated legacy team metadata, logs a migration hint, skips the unsafe row, and continues indexing current/migrated rows.
- The existing `TeamRunHistoryService.listTeamRunHistory()` legacy skip remains in place for pre-existing index rows. The rebuild path now applies the same friendly degradation boundary before workspace/sidebar history sees rebuilt rows.
- No runtime conversion or dual-schema reader was added. Unmigrated topology-lost metadata stays unsupported and remains visible through Settings -> Server -> Migrations diagnostics/retry only.

Regression coverage added:

- `team-run-history-index-service.test.ts` now creates an unmigrated unsafe legacy flat metadata file with nested route `BuildSquad/review_lead` plus a current canonical metadata file, calls `rebuildIndexFromDisk()`, and asserts only the current/canonical row is returned and persisted to the history index.

## API/E2E Round 14 Local Fix Checks

Passed:

- `pnpm -C autobyteus-server-ts exec vitest run tests/unit/app-data-migrations/team-run-metadata-member-tree-migration.test.ts tests/unit/app-data-migrations/app-data-migration-runner.test.ts --reporter=dot`
  - Result: `2` files passed, `7` tests passed.
- `pnpm -C autobyteus-server-ts exec vitest run tests/unit/run-history/store/team-run-metadata-store.test.ts tests/unit/run-history/services/team-run-history-index-service.test.ts tests/unit/run-history/services/team-run-history-service.test.ts tests/unit/run-history/services/workspace-run-history-service.test.ts --reporter=dot`
  - Result: `4` files passed, `19` tests passed.
- `pnpm -C autobyteus-web exec vitest run stores/__tests__/appDataMigrationsStore.spec.ts components/settings/__tests__/ServerSettingsManager.spec.ts pages/__tests__/settings.spec.ts --reporter=dot`
  - Result: `3` files passed, `26` tests passed.
- `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit --pretty false`
  - Result: passed.
- `pnpm -C autobyteus-server-ts exec prisma validate`
  - Result: passed.
- `pnpm -C autobyteus-web audit:localization-literals`
  - Result: passed with zero unresolved findings.
- `git diff --check`
  - Result: passed.
- `git diff --cached --check`
  - Result: passed.
- Custom changed/untracked non-test `.ts` / `.vue` source size audit.
  - Result: `1` changed non-test TS/Vue source file checked; no file exceeded `500` non-empty lines (`team-run-history-index-service.ts` is `223` non-empty lines).

API/E2E/full-stack validation should resume only after this local fix passes code review.

## Delivery Round 27 Latest-Base Integration Local Fix Update

Integrated latest tracked base `origin/personal @ 720f46940841a2b407bb65428095fe5435f5238d` (`v1.3.15`) after delivery found conflicts against the Round 27 code-review-passed candidate.

Integration decisions:

- Preserved the latest-base Codex history replay/tool-call persistence direction: normal UI run-history projection now uses `LocalMemoryRunViewProjectionProvider` as the display authority for AutoByteus, Codex, and Claude runs. Runtime-native Codex/Claude projection providers remain diagnostic utilities only and are not used as normal UI fallback/merge sources.
- Preserved this ticket's recursive team metadata model: `TeamMemberRunViewProjectionService` resolves leaf agents from canonical recursive `memberTree` via `getTeamRunLeafAgentMetadata(...)`, not flat `memberMetadata`.
- Preserved app-data migration behavior and the Round 14 legacy metadata degradation fix: unsafe unmigrated legacy team metadata is skipped during history-index rebuild and remains visible through Settings -> Server -> Migrations diagnostics/retry rather than workspace history/sidebar raw errors.
- Kept projection dedupe at the run-history projection boundary. The local replay projection is deduped with the conservative rule that merges timestamped/null duplicate copies while preserving repeated no-id/no-timestamp rows.
- Removed the stale provider-registry/team-member-local-reader conflict path in favor of the latest-base local replay service boundary; team-member projection now delegates metadata with the explicit team-member memory directory to `AgentRunViewProjectionService`.
- Resolved `run_history.md` docs to describe local replay as display authority, recursive team `memberTree` restore/projection, team communication projection, and app-data migration boundaries without reintroducing runtime-native projection fallback as UI authority.
- Resolved the latest-base whitespace issue in `tickets/done/codex-history-reload-toolcalls/tmp-dynamic-tool-repro.log` so repository diff hygiene checks pass after merge.

## Delivery Round 27 Latest-Base Integration Checks

Passed:

- `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit --pretty false`
  - Result: passed.
- `pnpm -C autobyteus-server-ts exec vitest run tests/unit/run-history/services/agent-run-view-projection-service.test.ts tests/unit/run-history/team-member-run-view-projection-service.test.ts tests/unit/run-history/services/team-run-history-index-service.test.ts tests/integration/app-data-migrations/team-run-metadata-member-tree-history.integration.test.ts --reporter=dot`
  - Result: `4` files passed, `23` tests passed.
- `pnpm -C autobyteus-server-ts exec vitest run tests/unit/run-history/services/agent-run-view-projection-service.test.ts tests/unit/run-history/team-member-run-view-projection-service.test.ts tests/unit/run-history/services/team-run-history-index-service.test.ts tests/unit/run-history/services/team-run-history-service.test.ts tests/unit/run-history/services/workspace-run-history-service.test.ts tests/unit/run-history/projection/local-memory-run-view-projection-provider.test.ts tests/unit/run-history/projection/codex-run-view-projection-provider.test.ts tests/integration/app-data-migrations/team-run-metadata-member-tree-history.integration.test.ts tests/integration/run-history/codex-mcp-tool-args-projection.integration.test.ts --reporter=dot`
  - Result: `9` files passed, `44` tests passed.
- `pnpm -C autobyteus-web exec vitest run stores/__tests__/appDataMigrationsStore.spec.ts components/settings/__tests__/ServerSettingsManager.spec.ts pages/__tests__/settings.spec.ts --reporter=dot`
  - Result: `3` files passed, `26` tests passed.
- `pnpm -C autobyteus-server-ts exec prisma validate`
  - Result: passed.
- `pnpm -C autobyteus-web audit:localization-literals`
  - Result: passed with zero unresolved findings.
- `git diff --check`
  - Result: passed.
- `git diff --cached --check`
  - Result: passed.
- `git diff --check origin/personal...HEAD`
  - Result: passed.
- Conflict marker scan over backend/frontend source, tests, and docs.
  - Result: no conflict markers found.
- Custom changed/untracked non-test `.ts` / `.vue` source size audit.
  - Result: `155` changed/untracked non-test source files checked; no file exceeded `500` non-empty lines.

API/E2E/full-stack validation and delivery packaging remain paused until code review passes this latest-base integrated state.

## Code Review Round 28 Local Fix Update

Addressed `CR-ROUND28-001`, where active history/projection identity paths could still treat bare `memberName` as a route-key fallback.

Implementation updates:

- Removed `binding.memberName` fallback matching from `TeamMemberRunViewProjectionService`; member projection now resolves only canonical `memberRouteKey` identity.
- Removed `member.memberName` fallback matching from `team-run-metadata-flattener` route-key resolver helpers.
- Removed frontend workspace history selection fallback from `focusedMemberRouteKey` to `memberName`; selection now matches exact `memberRouteKey` only.
- Tightened frontend history metadata helper `toTeamMemberKey(...)` and parsed member path fallback so member-route-key identity is no longer synthesized from `memberName`.
- Replaced the prior positive member-name fallback test with a rejection test using duplicate nested `review_lead` leaves.
- Added backend and frontend duplicate-leaf regressions proving bare `review_lead` does not select either `BuildSquad/review_lead` or `AuditSquad/review_lead`, while exact nested route keys still resolve.

No app-data migration behavior was broadened; the only historical legacy conversion path remains the isolated app-data migration subsystem.

## Code Review Round 28 Local Fix Checks

Passed:

- `pnpm -C autobyteus-server-ts exec vitest run tests/unit/run-history/services/team-run-metadata-flattener.test.ts tests/unit/run-history/team-member-run-view-projection-service.test.ts --reporter=dot`
  - Result: `2` files passed, `8` tests passed.
- `pnpm -C autobyteus-server-ts exec vitest run tests/unit/run-history/services/agent-run-view-projection-service.test.ts tests/unit/run-history/services/team-run-metadata-flattener.test.ts tests/unit/run-history/team-member-run-view-projection-service.test.ts tests/unit/run-history/services/team-run-history-index-service.test.ts tests/integration/app-data-migrations/team-run-metadata-member-tree-history.integration.test.ts --reporter=dot`
  - Result: `5` files passed, `24` tests passed.
- `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit --pretty false`
  - Result: passed.
- `pnpm -C autobyteus-web exec vitest run composables/__tests__/useWorkspaceHistorySelectionActions.spec.ts --reporter=dot`
  - Result: `1` file passed, `2` tests passed.
- `pnpm -C autobyteus-web exec vitest run composables/__tests__/useWorkspaceHistorySelectionActions.spec.ts stores/__tests__/runHistoryMetadata.spec.ts stores/__tests__/runHistoryTeamRows.spec.ts services/runHydration/__tests__/runProjectionConversation.spec.ts --reporter=dot`
  - Result: `4` files passed, `9` tests passed.
- `pnpm -C autobyteus-web audit:localization-literals`
  - Result: passed with zero unresolved findings.
- `git diff --check`
  - Result: passed.
- `git diff --cached --check`
  - Result: passed.
- `git diff --check origin/personal...HEAD`
  - Result: passed.
- No-legacy grep for the removed fallback shapes:
  - Command scanned `binding.memberName`, `member.memberName === memberRouteKey`, `member.memberName === focusedMemberKey`, `memberRouteKey || memberName`, `|| member.memberName`, and the old fallback test title across run-history source/tests and frontend history/hydration/composable paths.
  - Result: no matches.
- Custom changed/untracked non-test `.ts` / `.vue` source size audit.
  - Result: `4` changed/untracked non-test source files checked; no file exceeded `500` non-empty lines.

API/E2E/full-stack validation and delivery packaging remain paused until code review passes this no-legacy identity cleanup.

## Code Review Round 29 Local Fix Update

Addressed `CR-ROUND29-001`, where frontend team-run config reconstruction could still synthesize `memberOverrides` keys from bare `memberName` when `memberRouteKey` was blank.

Implementation updates:

- `teamRunConfigUtils.ts` now treats `memberRouteKey` as the only route identity for reconstructed team config.
- `reconstructTeamRunConfigFromMetadata(...)` filters out metadata leaves with blank route keys before computing launch defaults and member overrides, so blank-route current-schema rows are skipped rather than converted into bare-name override keys.
- Member override emission now requires a non-empty canonical route key; no override can be stored under a synthesized `memberName` key.
- Added a frontend regression proving blank `memberRouteKey` + `memberName: review_lead` does not create `memberOverrides.review_lead`, while exact nested `BuildSquad/review_lead` still produces a route-keyed override.

No app-data migration behavior was changed or broadened.

## Code Review Round 29 Local Fix Checks

Passed:

- `pnpm -C autobyteus-web exec vitest run utils/__tests__/teamRunConfigUtils.spec.ts --reporter=dot`
  - Result: `1` file passed, `8` tests passed.
- `pnpm -C autobyteus-web exec vitest run utils/__tests__/teamRunConfigUtils.spec.ts composables/__tests__/useWorkspaceHistorySelectionActions.spec.ts stores/__tests__/runHistoryMetadata.spec.ts stores/__tests__/runHistoryTeamRows.spec.ts services/runHydration/__tests__/runProjectionConversation.spec.ts --reporter=dot`
  - Result: `5` files passed, `17` tests passed.
- `pnpm -C autobyteus-web audit:localization-literals`
  - Result: passed with zero unresolved findings.
- `git diff --check`
  - Result: passed.
- `git diff --cached --check`
  - Result: passed.
- `git diff --check origin/personal...HEAD`
  - Result: passed.
- No-legacy route-key fallback scans over frontend utils/stores/composables/hydration and backend run-history source/tests.
  - Result: no matches for `memberRouteKey || memberName`, `|| member.memberName`, `memberOverrides[...]` from `memberName`, prior Round 28 fallback shapes, or the old member-name fallback test title. Remaining matches were route-key null-to-empty normalization only, not member-name fallback.
- Custom changed/untracked non-test `.ts` / `.vue` source size audit.
  - Result: `1` changed non-test source file checked; no file exceeded `500` non-empty lines (`teamRunConfigUtils.ts` is `264` non-empty lines).

API/E2E/full-stack validation and delivery packaging remain paused until code review passes this no-legacy config reconstruction cleanup.
