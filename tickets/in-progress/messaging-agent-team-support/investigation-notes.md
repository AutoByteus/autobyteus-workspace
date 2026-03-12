# Investigation Notes

## Status

- Date: `2026-03-12`
- Ticket: `messaging-agent-team-support`
- Investigation Scope: current messaging setup target selection, runtime dispatch support for teams, outbound Telegram reply behavior, and restart-safe workspace identity for live frontend recovery

## Executive Summary

The current product limitation is real, but it is still not a deep runtime limitation.

- The current settings UI and public GraphQL setup mutation explicitly allow only `AGENT` targets.
- The lower-level external-channel domain model, persistence layer, and runtime ingress facade already understand `TEAM` bindings.
- A pure team-definition binding is feasible, but not with the current binding model alone because team runs need runtime/model/workspace launch configuration in addition to the definition id.
- The clean phase-2 shape is to bind `TEAM` by `teamDefinitionId` plus a persisted team launch preset and let external ingress lazy-create/cache the concrete `teamRunId`.
- For Telegram, the recommended external reply policy is coordinator-only by default. Internal member chatter should stay internal.
- The repeated post-restart websocket flood now points to a second design problem: ordinary filesystem workspaces are currently identified by a process-local random `workspaceId`, but the frontend treats that id as durable across backend restart.
- The most reasonable restart-safe model is to make ordinary filesystem workspace identity deterministic from normalized `rootPath`, keep websocket/file-explorer session ids ephemeral, and let the backend re-resolve workspaces from that stable identity after restart.
- A related but separate gap exists at the frontend node-binding boundary: `workspace.ts` already tries to guard in-flight workspace fetches with `bindingRevision`, but `windowNodeContextStore` did not expose that revision at all. That makes rebinding invalidation dead code unless the revision is made real and scoped only to node-context changes.

## Findings

### 1. The user-facing messaging setup is intentionally AGENT-only today

- Docs state that Telegram bindings support `AGENT` targets only.
  - Evidence: `autobyteus-web/docs/messaging.md`
- Web flow policy hardcodes allowed target types to `['AGENT']` and shows a Telegram AGENT-only hint.
  - Evidence: `autobyteus-web/composables/messaging-binding-flow/policy-state.ts`
- The setup flow resets the draft target type back to `AGENT` when the provider changes.
  - Evidence: `autobyteus-web/composables/useMessagingChannelBindingSetupFlow.ts`
- The setup store rejects any non-`AGENT` target before the mutation request is sent.
  - Evidence: `autobyteus-web/stores/messagingChannelBindingSetupStore.ts`
- The setup card copy and form shape are built around selecting one agent definition plus launch preset; there is no team selector.
  - Evidence: `autobyteus-web/components/settings/messaging/ChannelBindingSetupCard.vue`

### 2. The core external-channel model already supports TEAM bindings

- The external-channel domain model defines `ChannelBindingTargetType = "AGENT" | "TEAM"`.
  - Evidence: `autobyteus-server-ts/src/external-channel/domain/models.ts`
- `ChannelBinding` and `UpsertChannelBindingInput` already include `teamRunId` and `targetNodeName`.
  - Evidence: `autobyteus-server-ts/src/external-channel/domain/models.ts`
- The binding persistence layer already stores `TEAM` target information.
  - Evidence: `autobyteus-server-ts/src/external-channel/providers/*channel-binding-provider.ts`

### 3. Inbound runtime dispatch already knows how to send an external message to a team

- The channel runtime facade branches on `binding.targetType`.
- `AGENT` dispatch goes through the agent runtime launcher.
- `TEAM` dispatch loads `teamRunId` from the binding and calls `team.postMessage(...)`.
  - Evidence: `autobyteus-server-ts/src/external-channel/runtime/default-channel-runtime-facade.ts`
- `AgentTeam.postMessage(...)` defaults the target node to the team coordinator when no explicit target is supplied.
  - Evidence: `autobyteus-ts/src/agent-team/agent-team.ts`

### 4. The public setup API is the main server-side blocker

- The GraphQL setup types expose only `targetAgentDefinitionId` and `launchPreset`.
  - Evidence: `autobyteus-server-ts/src/api/graphql/types/external-channel-setup/types.ts`
- The resolver parses `targetType` but rejects anything other than `AGENT`.
  - Evidence: `autobyteus-server-ts/src/api/graphql/types/external-channel-setup/resolver.ts`
- The resolver always upserts bindings with `targetType: "AGENT"` and `teamRunId: null`.
  - Evidence: `autobyteus-server-ts/src/api/graphql/types/external-channel-setup/resolver.ts`

### 5. Auto-start behavior exists for agents, not for teams

- The current channel-binding runtime launcher is specifically for agent runs.
- It throws if a non-`AGENT` binding is passed in.
  - Evidence: `autobyteus-server-ts/src/external-channel/runtime/channel-binding-runtime-launcher.ts`
- This means the current product flow is definition-bound for agents: save an agent definition plus launch preset, then auto-start or reuse the agent run later.
- There is no equivalent external-channel launch flow for team definitions in this setup path today.

### 6. Team definitions alone are not sufficient launch inputs

- Team run creation requires `teamDefinitionId` plus `memberConfigs`.
  - Evidence: `autobyteus-server-ts/src/api/graphql/types/agent-team-run.ts`
  - Evidence: `autobyteus-server-ts/src/api/graphql/services/team-run-mutation-types.ts`
- Existing lazy team creation in `sendMessageToTeam(...)` proves the runtime already supports definition-bound creation when `memberConfigs` are supplied.
  - Evidence: `autobyteus-server-ts/src/api/graphql/services/team-run-mutation-service.ts`
- Existing workspace UI already models a reusable team launch preset shape:
  - global `runtimeKind`
  - shared `workspaceId`
  - default `llmModelIdentifier`
  - global `autoExecuteTools`
  - optional per-member overrides
  - Evidence: `autobyteus-web/types/agent/TeamRunConfig.ts`
  - Evidence: `autobyteus-web/components/workspace/config/TeamRunConfigForm.vue`

Inference:

- A team definition is the structural template.
- A separate launch preset is still required for first-message team creation.
- For messaging setup, the smallest clean preset can be a global/shared team launch preset rather than a raw `memberConfigs[]` payload.

### 7. Team continuation/resume capability exists elsewhere in the server

- `TeamRunContinuationService` can restore inactive team runs from run history and then post a message into them.
  - Evidence: `autobyteus-server-ts/src/run-history/services/team-run-continuation-service.ts`
- `TeamRunMutationService` can continue an existing team run and also create a new one from a team definition plus member configs.
  - Evidence: `autobyteus-server-ts/src/api/graphql/services/team-run-mutation-service.ts`
- The external-channel ingress path does not currently use these services, so Telegram team support would need an explicit choice:
  - active-team-only binding, or
  - active/resumable team binding

### 8. Existing workspace team-launch logic can be adapted for messaging bindings

- The workspace team-send flow already performs lazy creation from a temporary team context by deriving per-member configs from a definition plus run config.
  - Evidence: `autobyteus-web/stores/agentTeamRunStore.ts`
- The server-side lazy-create path already persists run history manifests and supports both native-team and member-runtime modes.
  - Evidence: `autobyteus-server-ts/src/api/graphql/services/team-run-mutation-service.ts`
- The missing architectural piece for messaging setup is not team runtime capability; it is a setup/runtime bridge that:
  - expands a persisted team launch preset into member configs,
  - creates the run when no cached `teamRunId` exists,
  - caches the resolved `teamRunId` on the binding for later reuse.

### 9. Coordinator-only Telegram replies are the natural default

- External inbound messages are converted into `AgentInputUserMessage` with external-source metadata attached.
  - Evidence: `autobyteus-server-ts/src/external-channel/runtime/default-channel-runtime-facade.ts`
- The team user-message handler forwards that same message object to the selected target node.
  - Evidence: `autobyteus-ts/src/agent-team/handlers/process-user-message-event-handler.ts`
- The agent-side input processor binds the external receipt only when that external-source metadata is present.
  - Evidence: `autobyteus-server-ts/src/agent-customization/processors/persistence/external-channel-turn-receipt-binding-processor.ts`
- Inter-agent delegation does not preserve that original external metadata for downstream sub-team fan-out; it creates fresh messages.
  - Evidence: `autobyteus-ts/src/agent-team/handlers/inter-agent-message-request-event-handler.ts`
- The mandatory outbound reply processor publishes callbacks from the responding agent run using that bound turn/receipt data.
  - Evidence: `autobyteus-server-ts/src/agent-customization/processors/response-customization/external-channel-assistant-reply-processor.ts`
  - Evidence: `autobyteus-server-ts/src/startup/agent-customization-loader.ts`

Inference:

- If a Telegram message is bound to a team with no explicit `targetNodeName`, the team coordinator receives the external message.
- The coordinator is therefore the externally visible responder.
- Internal collaboration between members should not automatically spam Telegram.

### 10. There is one notable callback-service caveat

- `ReplyCallbackService.publishAssistantReplyByTurn(...)` explicitly skips when `teamRunId` is supplied.
  - Evidence: `autobyteus-server-ts/src/external-channel/services/reply-callback-service.ts`
- However, the current outbound path is agent-run based, not team-run based:
  - the reply processors call `publishAssistantReplyByTurn(...)` with `agentRunId`
  - the turn/receipt binding processor also binds by `agentRunId`
- That means coordinator-only team replies can work through the existing agent-level callback pipeline, while direct team-level callback publishing is still unsupported.

### 11. The current TEAM binding lifecycle does not yet match AGENT lifecycle after restart

- `AGENT` bindings reuse `binding.agentRunId` only when that exact cached run is still active.
  - Evidence: `autobyteus-server-ts/src/external-channel/runtime/channel-binding-runtime-launcher.ts:resolveOrStartAgentRun`
- `TEAM` bindings currently reuse `binding.teamRunId` whenever a resume config exists, even if the run is inactive and only resumable from history.
  - Evidence: `autobyteus-server-ts/src/external-channel/runtime/channel-binding-runtime-launcher.ts:resolveOrStartTeamRun`
- `TeamRunHistoryService.getTeamRunResumeConfig(...)` already exposes `isActive`, so the runtime already has the data needed to mirror the AGENT rule cleanly.
  - Evidence: `autobyteus-server-ts/src/run-history/services/team-run-history-service.ts:getTeamRunResumeConfig`
- Manual workspace reopening of a team run does not update the messaging binding itself. The binding still points at its own cached `teamRunId`.
  - Evidence: `autobyteus-server-ts/src/external-channel/services/channel-binding-service.ts`

Clarified requirement:

- A `TEAM` binding should behave like an `AGENT` binding:
  - reuse only the binding's cached run when that exact cached run is currently active
  - otherwise create a fresh run for the inbound Telegram message
- A manually reopened history run should not be implicitly adopted by the bot unless it is the binding's own cached run and is active again.

### 12. The workspace-page symptom also exposed a frontend reconnect gap during backend restart

- The left sidebar in the workspace page is still driven by the run-history tree panel and its polling loop.
  - Evidence: `autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue`
- The selected team/agent live view depends on websocket streaming services, not just history polling.
  - Evidence: `autobyteus-web/stores/agentTeamRunStore.ts`, `autobyteus-web/stores/agentRunStore.ts`
- The shared `WebSocketClient` only schedules another reconnect when the close event happens from the `CONNECTED` state.
  - Evidence: `autobyteus-web/services/agentStreaming/transport/WebSocketClient.ts`
- When a reconnect attempt itself fails, the client is already in `RECONNECTING`, so the follow-up close does not schedule the next retry. This makes a multi-second backend restart look permanently offline after the first failed reconnect attempt.
  - Evidence: `autobyteus-web/services/agentStreaming/transport/WebSocketClient.ts`

Implication:

- The workspace-page clarification matters. This was not only a history-selection issue. There is also a transport-level reconnect bug that can keep an already selected live context offline after a server restart even while the backend continues processing Telegram messages.

### 13. TEAM outbound Telegram callback still has a local route-binding gap

- Manual Telegram verification now proves a later-stage failure mode: inbound Telegram messages are routed into the bound team, the coordinator or entry-member produces a reply, and the reply appears in the workspace UI, but the reply is not delivered back to Telegram.
  - Evidence: user manual verification screenshots and logs from `2026-03-10`
- The current member-runtime TEAM bridge binds the accepted external turn using the coordinator or entry-member `memberRunId`, which is correct for locating the receipt source by turn.
  - Evidence: `autobyteus-server-ts/src/external-channel/runtime/default-channel-runtime-facade.ts`
  - Evidence: `autobyteus-server-ts/src/external-channel/runtime/runtime-external-channel-turn-bridge.ts`
- However, `ReplyCallbackService.publishAssistantReplyByTurn(...)` still performs a route-to-target binding check using only the supplied dispatch target. For TEAM replies, the binding row is persisted under `targetType: "TEAM"` plus `teamRunId`, not under the coordinator/member `agentRunId`.
  - Evidence: `autobyteus-server-ts/src/external-channel/services/reply-callback-service.ts`
  - Evidence: `autobyteus-server-ts/src/external-channel/providers/sql-channel-binding-provider.ts`
- The existing runtime-bridge regression proves only that TEAM coordinator/member replies reach `publishAssistantReplyByTurn(...)`; it does not prove that the callback publish survives the binding check and actually hits the gateway callback endpoint.
  - Evidence: `autobyteus-server-ts/tests/unit/external-channel/runtime/runtime-external-channel-turn-bridge.test.ts`
- The exact Telegram TEAM ingress regression added earlier proves create -> shutdown -> recreate behavior for inbound dispatch, but it does not yet cover the outbound callback publish.
  - Evidence: `autobyteus-server-ts/tests/integration/api/rest/channel-ingress.integration.test.ts`

Inference:

- This is a local fix, not a requirement/design change.
- The TEAM outbound callback path needs to carry the owning `teamRunId` alongside the coordinator/member `agentRunId` so the pre-send route-binding guard remains valid for TEAM bindings.
- The server test matrix also needs one stronger callback regression:
  - fake Telegram ingress to a TEAM binding
  - accepted coordinator/member turn
  - simulated runtime completion
  - assertion that the gateway callback publish is invoked

### 14. Live TEAM selection regressed because the branch removed the local-team fast path that existed on `personal`

- The regression is broader than Telegram. It reproduces for manually started live team runs in the workspace page.
  - Evidence: user manual verification screenshots from `2026-03-11`
- The current branch removed the `selectTreeRunFromHistory(...)` fast path that previously reused an already opened local team context and only switched focus.
  - Evidence: `git diff origin/personal -- autobyteus-web/stores/runHistorySelectionActions.ts`
- After that removal, every click on a team-member row in the left history tree now calls `openTeamMemberRun(...)`, even when the team is already live and subscribed in memory.
  - Evidence: `autobyteus-web/stores/runHistorySelectionActions.ts`
- `openTeamRunWithCoordinator(...)` rebuilds the team from persisted projection and initializes active runs with `AgentTeamStatus.Uninitialized` plus member `AgentStatus.Uninitialized`.
  - Evidence: `autobyteus-web/services/runOpen/teamRunOpenCoordinator.ts`
  - Evidence: `autobyteus-web/stores/runHistoryTeamHelpers.ts`
- The team tree/read-model then interprets those `Uninitialized` statuses as inactive/offline when projecting left-tree rows.
  - Evidence: `autobyteus-web/stores/runHistoryTeamHelpers.ts:toTeamRunStatus`
- This explains the user-visible symptoms:
  - selecting `Professor` or `Student` in the left tree can make a live team look historical/offline,
  - focused member status drops back to `Uninitialized`,
  - the conversation view rehydrates from persisted projection and can show historical formatting such as `**[User Requirement]**`,
  - switching among team members behaves differently from single-agent runs.

### 15. The cached Telegram team run is persisted in the channel binding row

- The Telegram BUSINESS_API binding persists the cached team run in SQLite, so it survives backend restart and keeps appearing in Settings even when the process is stopped.
- The persisted field is `channel_bindings.team_id`, exposed in the binding domain as `teamRunId`.
  - Evidence: `autobyteus-server-ts/prisma/schema.prisma`
  - Evidence: `autobyteus-server-ts/src/external-channel/providers/sql-channel-binding-provider.ts`
- The currently affected binding row for the user's Telegram peer stores:
  - `provider = TELEGRAM`
  - `transport = BUSINESS_API`
  - `peer_id = 8438880216`
  - `target_type = TEAM`
  - `team_definition_id = professor-student-team`
  - `team_id = team_professor-student-team_8564dad1`
  - `runtime_kind = codex_app_server`

Implication:

- The cached run surviving restart is expected database behavior.
- That persistence alone does **not** explain the websocket flood; it only explains why the same team run keeps showing up as the binding's cached target.

### 16. Only the cached Telegram team run floods because it is the only active reconnect target

- The frontend does not directly read the binding row to decide websocket attachment.
- It reconnects runs and teams from the backend active-runtime snapshot in `activeRuntimeSyncStore`.
  - Evidence: `autobyteus-web/stores/activeRuntimeSyncStore.ts`
- For team runs, the store reconnects when:
  - the backend snapshot says the team run is active, and
  - the local team context is missing or unsubscribed.
- The Telegram-cached run is the one backend-reported active team run after the external message starts/reuses it, so it becomes the repeated reconnect target.
- Other historical team runs do not reconnect because they are not reported active.

Implication:

- The flood is not "all teams reconnecting".
- It is one active Telegram-bound team repeatedly becoming reconnect-worthy.

### 17. Fresh restart logs show a second loop: repeated workspace recreation plus file-explorer websocket 404s

- After a clean backend/frontend restart, the server logs repeatedly show:
  - `GraphQL mutation to create workspace`

### 18. `ensureWorkspaceByRootPath(...)` is not actually an ensure path; it always calls `createWorkspace(...)`

- The frontend helper used by both historical open and active-runtime hydration is:
  - `ensureRunHistoryWorkspaceByRootPath(...)`
  - Evidence: `autobyteus-web/stores/runHistoryLoadActions.ts`
- Even after optionally loading existing workspaces, that helper still always calls:
  - `workspaceStore.createWorkspace({ root_path: normalizedRootPath })`
  - Evidence: `autobyteus-web/stores/runHistoryLoadActions.ts`
- `RunHistoryStore.ensureWorkspaceByRootPath(...)` is only a direct pass-through to that helper.
  - Evidence: `autobyteus-web/stores/runHistoryStore.ts`
- `WorkspaceResolver.createWorkspace(...)` on the backend is idempotent at the workspace-manager level, but every call still triggers the create/reuse mutation path and reconnects file-explorer streaming on the frontend.
  - Evidence: `autobyteus-server-ts/src/api/graphql/types/workspace.ts`
  - Evidence: `autobyteus-web/stores/workspace.ts`

Implication:

- The repeated `GraphQL mutation to create workspace` lines in the restart logs are explained by the current frontend implementation, not by the cached Telegram team run itself.
- This path is called during team hydration/recovery, so repeated active-team recovery can repeatedly invoke workspace re-resolution and file-explorer reconnect.

### 19. Deterministic filesystem workspace ids are currently incompatible with the file-explorer websocket URL path

- The frontend file-explorer websocket client builds the websocket URL by interpolating the workspace id directly as a path suffix:
  - ``${this.wsEndpoint}/${this.workspaceId}``
  - Evidence: `autobyteus-web/services/fileExplorerStreaming/FileExplorerStreamingService.ts`
- Ordinary filesystem workspace ids are now deterministic and contain the normalized root path, for example:
  - `root:/Users/.../temp_workspace`
  - Evidence: restart logs from `2026-03-12`
- The backend file-explorer websocket route is still declared as:
  - `/ws/file-explorer/:workspaceId`
  - Evidence: `autobyteus-server-ts/src/api/websocket/file-explorer.ts`
- Because the workspace id now contains `/`, the raw websocket URL path no longer matches the backend route cleanly, which explains the repeated:
  - `GET /ws/file-explorer/root:/... -> 404`
  - Evidence: restart logs from `2026-03-12`

Implication:

- The deterministic workspace-id model is still conceptually correct.
- The current implementation is incomplete because one transport consumer still assumes workspace ids are path-safe opaque tokens.
- This broken file-explorer websocket path likely destabilizes the page and contributes to the repeated active-team reconnect loop after restart.
  - `Reusing existing workspace ID: root:/.../temp_workspace`
  - `GET /ws/file-explorer/root:/.../temp_workspace -> 404`
- This means the page is repeatedly re-resolving the workspace by root path and then failing to attach the file-explorer websocket for that deterministic workspace id.
- The deterministic filesystem workspace id now contains `/`, but the frontend file-explorer websocket client currently interpolates it directly into the path without URL encoding.
  - Evidence: `autobyteus-web/services/fileExplorerStreaming/FileExplorerStreamingService.ts`
  - Evidence: `autobyteus-server-ts/src/api/websocket/file-explorer.ts`

Implication:

- The previous "team websocket retry" diagnosis was incomplete.
- The page is simultaneously stuck in a workspace/file-explorer reconnect loop.
- That loop may be destabilizing the live team context and indirectly causing repeated team websocket attaches.

### 18. The current strongest root-cause hypothesis is a coupled restart loop, not just a websocket retry bug

- The cached Telegram team run remains persisted and active, so it is the one team eligible for active reconnect.
- At the same time, the frontend repeatedly issues `createWorkspace(rootPath)` and repeatedly fails `/ws/file-explorer/root:/...` websocket attachment.
- The earlier WebSocketClient retry fix may still be correct per client, but the observed flood now points to a larger coupled restart loop:
  1. backend restarts
  2. page restarts live recovery
  3. workspace/file-explorer rebinding fails for deterministic workspace websocket path
  4. live team context ends up unsubscribed or rehydrated again
  5. `activeRuntimeSyncStore` sees the Telegram team as active and reconnects it again

Open question:

- Prove exactly which path re-enters team hydration/reconnect after the file-explorer failure:
  - direct selection/open logic,
  - background active-runtime refresh,
  - or broader workspace/node-context rebinding.

Inference:

- This is a local web-selection regression introduced by this ticket branch, not a server/runtime ownership problem.

### 15. Restart-time file-explorer failures are caused by stale process-local workspace ids

- `FileSystemWorkspace` currently assigns a random UUID when no explicit `workspaceId` is configured.
  - Evidence: `autobyteus-server-ts/src/workspaces/filesystem-workspace.ts`
- `WorkspaceManager.ensureWorkspaceByRootPath(...)` reuses a workspace only while the current backend process is alive; after restart, a new live workspace instance is created and therefore gets a new random `workspaceId`.
  - Evidence: `autobyteus-server-ts/src/workspaces/workspace-manager.ts`
- The frontend stores and reconnects file-explorer state by `workspaceId`.
  - Evidence: `autobyteus-web/stores/workspace.ts`
  - Evidence: `autobyteus-web/services/fileExplorerStreaming/FileExplorerStreamingService.ts`
- The file-explorer websocket handler resolves workspaces by `workspaceId`, and ordinary filesystem workspaces cannot be recreated from that id after restart.
  - Evidence: `autobyteus-server-ts/src/services/file-explorer-streaming/file-explorer-stream-handler.ts`
  - Evidence: `autobyteus-server-ts/src/workspaces/workspace-manager.ts:getOrCreateWorkspace`
- This exactly matches the live restart logs:
  - `File explorer WebSocket connection rejected: workspace ... not found`

Inference:

- The frontend is retaining a stale runtime-local workspace handle across backend restart.
- The backend restart invalidates that handle, but the current design provides no deterministic re-resolution path for ordinary filesystem workspaces.

### 16. Temp and skill workspaces prove the durable-identity model already exists conceptually

- `TempWorkspace` extends `FileSystemWorkspace` but uses a fixed id (`temp_ws_default`).
  - Evidence: `autobyteus-server-ts/src/workspaces/temp-workspace.ts`
- `SkillWorkspace` also extends `FileSystemWorkspace` and uses deterministic synthetic ids (`skill_ws_*`).
  - Evidence: `autobyteus-server-ts/src/workspaces/skill-workspace.ts`
- So the inconsistent case is ordinary filesystem workspaces, which still default to random per-process ids.

Inference:

- The clean model is not "filesystem vs non-filesystem."
- The clean model is "durable workspace identity vs ephemeral session identity."
- Ordinary filesystem workspaces should follow the same deterministic-identity rule as temp/skill workspaces, but derive that identity from normalized `rootPath`.

### 17. The most reasonable design is a stable filesystem workspace key plus ephemeral session ids

### 18. The current websocket flooding is a scoped stale-live-open bug, not a new design-basis failure

- `openTeamRunWithCoordinator(...)` still auto-connects the team websocket whenever persisted `resumeConfig.isActive` is true, even if the active-runtime lookup returns no live team snapshot after backend restart.
  - Evidence: `autobyteus-web/services/runOpen/teamRunOpenCoordinator.ts`
- `openRunWithCoordinator(...)` has the same stale-live-open pattern for standalone agents.
  - Evidence: `autobyteus-web/services/runOpen/runOpenCoordinator.ts`
- The shared websocket transport retries every close while auto-reconnect is enabled; it does not treat missing-run closes (`4004`/`4005`) as terminal.
  - Evidence: `autobyteus-web/services/agentStreaming/transport/WebSocketClient.ts`
- Backend websocket handlers already use `4004` for missing agent/team runs, so a stale history-open after restart can loop forever through the shared transport.
  - Evidence: `autobyteus-server-ts/src/services/agent-streaming/agent-stream-handler.ts`
  - Evidence: `autobyteus-server-ts/src/services/agent-streaming/agent-team-stream-handler.ts`

Inference:

- The flood shown after a fresh backend/frontend restart is not another workspace-identity design change.
- It is a local implementation gap inside the already-approved restart-safe model:
  - history-open must only attach live streams when a live active snapshot actually exists,
  - and the generic websocket transport must stop retrying missing-run closes.

- The backend already guarantees one live workspace instance per `WorkspaceConfig`/`rootPath` within one process.
  - Evidence: `autobyteus-server-ts/src/workspaces/workspace-manager.ts:findWorkspaceByConfig`
- There is therefore no strong need for a second random workspace-level identity for ordinary filesystem workspaces.
- File-explorer sessions already have their own separate per-connection/session ids.
  - Evidence: `autobyteus-server-ts/src/services/file-explorer-streaming/file-explorer-stream-handler.ts`

Conclusion:

- Ordinary filesystem workspaces should use one stable deterministic identity derived from normalized `rootPath`.
- Workspace-level random per-process ids should be removed for ordinary filesystem workspaces.
- Ephemeral identity belongs at the session/connection layer, not at the workspace identity layer.

### 15. Repeated reasoning bursts in a single turn are still being collapsed into one think segment

- The reproduced failure is broader than TEAM bindings. The same merged-thinking behavior appears in the regular live workspace stream when a run emits reasoning, then `run_bash`, then more reasoning before `turn/completed`.
  - Evidence: user manual verification screenshots from `2026-03-11`
- The runtime adapter caches reasoning segment ids per `turnId` in `reasoningSegmentIdByTurnId`.
  - Evidence: `autobyteus-server-ts/src/services/agent-streaming/method-runtime-event-segment-helper.ts`
- That cache is only cleared on `turn/completed`, not when the runtime leaves one reasoning burst and later returns to reasoning within the same turn.
  - Evidence: `autobyteus-server-ts/src/services/agent-streaming/method-runtime-event-adapter.ts`
- Existing server tests currently codify this turn-wide collapse behavior, including a case that intentionally forces two different reasoning item ids in the same turn to reuse the first id.
  - Evidence: `autobyteus-server-ts/tests/unit/services/agent-streaming/runtime-event-message-mapper.test.ts`
- The frontend segment handler only keys think segments by the single `payload.id` it receives from the backend, so once the server reuses the same reasoning id the UI must append into the original segment.
  - Evidence: `autobyteus-web/services/agentStreaming/handlers/segmentHandler.ts`

Inference:

- This is a local streaming-identity regression, not a Telegram-only or TEAM-only issue.
- The current runtime behavior is too coarse: it models "one reasoning segment per turn" instead of "one visible reasoning burst per contiguous reasoning phase".
- The fix should restore separate visible reasoning bursts inside one turn by preserving stable reasoning item ids when they differ and by resetting the turn-level fallback cache when tool or text boundaries interrupt reasoning.
- The correct behavior is:

### 16. TEAM callback linkage is currently being overwritten onto delegated member turns

- Live database inspection on `2026-03-12` showed the Telegram TEAM binding persisted under `runtime_kind=codex_app_server` with `team_id=team_professor-student-team_30537ad0`.
  - Evidence: `autobyteus-server-ts/db/production.db`, table `channel_bindings`
- The newest inbound Telegram receipt for the reproduced message `update:109349124` is no longer bound to the professor/coordinator turn. It is stored against the delegated student member turn `019ce090-ba83-7203-816f-b6ae4355b90c` and `agent_id=student_50d53881bb8c67d4`.
  - Evidence: `autobyteus-server-ts/db/production.db`, table `channel_message_receipts`
- There is no matching `channel_delivery_events` row for that newer external message, while the immediately previous Telegram ingress `update:109349123` does have a successful callback event keyed to the professor turn.
  - Evidence: `autobyteus-server-ts/db/production.db`, table `channel_delivery_events`
- `ReplyCallbackService.publishAssistantReplyByTurn(...)` resolves callback sources strictly by `(agentRunId, turnId)`.
  - Evidence: `autobyteus-server-ts/src/external-channel/services/reply-callback-service.ts`
- `SqlChannelMessageReceiptProvider.bindTurnToReceipt(...)` upserts on `(provider, transport, accountId, peerId, threadId, externalMessageId)`, so rebinding the same external message to another member turn overwrites the earlier turn association.
  - Evidence: `autobyteus-server-ts/src/external-channel/providers/sql-channel-message-receipt-provider.ts`
- `TeamMemberRuntimeRelayService.propagateExternalSourceIfPresent(...)` currently propagates the same external source onto every accepted `send_message_to` recipient turn, regardless of whether that recipient is the externally addressable coordinator/entry member.
  - Evidence: `autobyteus-server-ts/src/agent-team-execution/services/team-member-runtime-relay-service.ts`
- The result is:
  - inbound Telegram -> professor accepted turn is initially linked correctly
  - professor delegates to student with `send_message_to`
  - relay propagation overwrites the same Telegram receipt onto the student's accepted turn
  - professor's immediate confirmation reply then cannot find a source by `(professorRunId, professorTurnId)` and callback enqueue is skipped
- This skip is effectively silent in the current logs because `ExternalChannelAssistantReplyProcessor` intentionally suppresses `SOURCE_NOT_FOUND` skip logs.
  - Evidence: `autobyteus-server-ts/src/agent-customization/processors/response-customization/external-channel-assistant-reply-processor.ts`
- Historical delivery evidence also shows that this model can route a Telegram callback from a student member run (`external-reply:student_f4096a8b636d4397:...`), which is not the intended coordinator-only external behavior.
  - Evidence: `autobyteus-server-ts/db/production.db`, table `channel_delivery_events`

Inference:

- This is a local callback-linkage bug within the already approved coordinator-only TEAM reply policy.
- The correct propagation rule is narrower than the current implementation:
  - keep the original inbound source bound to the coordinator/entry turn so the coordinator's immediate reply can publish
  - only propagate the external source across later `send_message_to` hops when the accepted recipient turn is again the externally addressable coordinator/entry member
  - do not bind the source onto delegated non-entry member turns such as `Student`
- Existing TEAM callback tests cover initial coordinator replies and later coordinator follow-up replies, but they do not cover the failing intermediate case: coordinator delegates to student and also emits an immediate confirmation that must still publish to Telegram.
  - if a team context for that `teamRunId` already exists locally and is still subscribed/live, a left-tree member click should only switch selection/focus,
  - if no live local team context exists, or the existing context is not subscribed, then the history-open path should still reopen from persisted projection.
- A focused regression test should cover both branches so the earlier stale-history fix is preserved for non-live contexts.

### 16. TEAM coordinator replies after teammate messages are not routed back to Telegram because the external callback chain is turn-scoped and the inter-agent relay drops the needed linkage

- The current external callback bridge only binds runtime reply routing when an externally accepted turn is dispatched from the external-channel ingress path.
  - Evidence: `autobyteus-server-ts/src/external-channel/runtime/default-channel-runtime-facade.ts`
  - Evidence: `autobyteus-server-ts/src/external-channel/runtime/runtime-external-channel-turn-bridge.ts`
- `ReplyCallbackService.publishAssistantReplyByTurn(...)` still resolves callback routing by exact `(agentRunId, turnId)` receipt binding, which is correct for avoiding leakage from unrelated UI turns.
  - Evidence: `autobyteus-server-ts/src/external-channel/services/reply-callback-service.ts`
- A naive fallback to `getLatestSourceByDispatchTarget(...)` would be too broad because it could echo unrelated manual workspace turns from the same bound run back to Telegram.
  - Evidence: `autobyteus-server-ts/src/external-channel/services/channel-message-receipt-service.ts`
- The member-runtime inter-agent relay path currently strips the callback chain:
  - the runtime relay request does not carry the sender turn id,
  - the adapter relay result drops the recipient turn id even though the underlying runtime service already has it,
  - therefore the recipient turn cannot be rebound to the original external source.
  - Evidence: `autobyteus-server-ts/src/runtime-execution/runtime-adapter-port.ts`
  - Evidence: `autobyteus-server-ts/src/runtime-execution/adapters/codex-app-server-runtime-adapter.ts`
  - Evidence: `autobyteus-server-ts/src/runtime-execution/adapters/claude-agent-sdk-runtime-adapter.ts`

### 17. The active-runtime snapshot is still too thin, so the frontend is inventing live status instead of consuming authoritative backend state

- The active-runtime GraphQL snapshot currently returns only `id` and `currentStatus` for active agent runs and active team runs.
  - Evidence: `autobyteus-web/graphql/queries/activeRuntimeQueries.ts`
  - Evidence: `autobyteus-server-ts/src/api/graphql/services/active-runtime-snapshot-service.ts`
- The frontend active-runtime sync reduces that snapshot to two id sets and throws away the backend status payload.
  - Evidence: `autobyteus-web/stores/activeRuntimeSyncStore.ts`
- Existing active contexts are then forced back to heuristic placeholder states:
  - standalone active runs are reset from `ShutdownComplete` to `Uninitialized`
  - active team contexts are reset from `ShutdownComplete` to `Uninitialized`
  - team members are also reset from `ShutdownComplete` to `Uninitialized`
  - Evidence: `autobyteus-web/stores/activeRuntimeSyncStore.ts`
- Focused web tests currently encode that heuristic behavior, which is why the UI can still show `Offline` or `Uninitialized` even when the backend already knows the run or team is live.
  - Evidence: `autobyteus-web/stores/__tests__/activeRuntimeSyncStore.spec.ts`

Inference:

- Backend active-runtime state should become authoritative for live status.
- The active-runtime snapshot needs to expose enough normalized status information for the frontend to stop inventing placeholder live status.
- For teams, that means the snapshot should carry focused/member-visible status in addition to aggregate team liveness.

### 18. Active-runtime sync still rehydrates live contexts through history-open coordinators, so status ownership and selection concerns remain mixed

- `activeRuntimeSyncStore` still recovers missing active runs by calling `openRunWithCoordinator(...)`.
  - Evidence: `autobyteus-web/stores/activeRuntimeSyncStore.ts`
- It still recovers missing active team runs by calling `openTeamRunWithCoordinator(...)`.
  - Evidence: `autobyteus-web/stores/activeRuntimeSyncStore.ts`
- Those open coordinators are selection/history-opening flows:
  - they fetch persisted projection and resume data
  - they hydrate or replace contexts
  - they optionally select the run/team
  - they attach the websocket when `isActive`
  - Evidence: `autobyteus-web/services/runOpen/runOpenCoordinator.ts`
  - Evidence: `autobyteus-web/services/runOpen/teamRunOpenCoordinator.ts`

Inference:

- The new active-runtime registry is still partially coupled to the old history-open path.
- The architecture needs one explicit live-hydration path that:
  - fetches the projection/resume payload needed to render a newly discovered active run,
  - does not own selection,
  - does not infer status heuristically,
  - and leaves websocket ownership to the subscription manager.
- The history-open coordinators should become thin orchestration layers over shared hydration helpers instead of being reused directly by active-runtime sync.

### 19. Team-member ownership lookup still falls back to per-run filesystem scans, which is too expensive for a backend-owned active-runtime registry

- `RunOwnershipResolutionService.resolveOwnership(...)` uses `TeamMemberRunManifestStore.findManifestByMemberRunId(...)` to decide whether an active agent run actually belongs to a team.
  - Evidence: `autobyteus-server-ts/src/run-history/services/run-ownership-resolution-service.ts`
- `findManifestByMemberRunId(...)` currently scans every team directory under `memory/agent_teams` and attempts to read one manifest path per team for every lookup miss.
  - Evidence: `autobyteus-server-ts/src/run-history/store/team-member-run-manifest-store.ts`
- `ActiveRuntimeSnapshotService.listActiveAgentRuns()` calls ownership resolution once per active agent run on every active-runtime snapshot query.
  - Evidence: `autobyteus-server-ts/src/api/graphql/services/active-runtime-snapshot-service.ts`

Inference:

- The ownership lookup needs an indexed/cache-backed path before the active-runtime registry can become the single live-status source without unnecessary polling cost.
- The correct boundary is still the ownership resolver, but the underlying member-manifest store should maintain a member-run index rather than re-scanning disk for every poll.
  - Evidence: `autobyteus-server-ts/src/agent-team-execution/services/team-member-runtime-relay-service.ts`
  - Evidence: `autobyteus-server-ts/src/agent-team-execution/services/team-runtime-inter-agent-message-relay.ts`

Inference:

- The correct fix is selective propagation, not a run-wide latest-source fallback.
- If a `send_message_to` relay originates from a sender turn that is already bound to an external source, the relay should:
  - preserve the sender turn id in the relay request,
  - preserve the recipient turn id in the relay result,
  - bind the accepted recipient turn to that same external source,
  - and subscribe that recipient turn into the external reply bridge.
- This lets the chain continue:
  - Telegram -> Professor turn bound
  - Professor `send_message_to` Student -> Student turn rebound to Telegram source
  - Student `send_message_to` Professor -> Professor turn rebound to Telegram source
  - Professor reply -> Telegram callback publish
- Because propagation only happens when the sender turn is already externally bound, unrelated UI-only turns still remain internal.

## Feasibility Assessment

## Overall

This is realistic.

- Product/UI work: moderate
- GraphQL/API work: moderate
- Runtime work: low to moderate for a run-bound phase 1
- Architecture risk: manageable because the core binding/runtime model already includes `TEAM`

## Realistic Phase 1

The lowest-risk implementation is:

1. Add `TEAM` as a selectable target in messaging setup.
2. Bind to an existing or resumable `teamRunId`.
3. Default `targetNodeName` to `null`, which means the coordinator handles external user messages.
4. Publish only the coordinator/default-target reply back to Telegram.

This avoids building a new team-definition launch model inside external-channel setup.

## Realistic Phase 2

If the product goal becomes "bind Telegram directly to a team definition and auto-create the team on first message", that is still realistic.

It needs:

- new setup schema for team-definition selection
- a team launch preset/config model alongside `teamDefinitionId`
- runtime bootstrapping logic that expands the preset into `memberConfigs`, creates the team when needed, caches `teamRunId`, and then reuses/continues that run afterward

It does **not** require a new reply architecture. Coordinator or entry-node-only replies are still the right model.

## Recommendation

The earlier run-bound recommendation was valid as a low-risk slice, but the user’s follow-up requirement is also realistic.

Recommended updated product shape:

1. Bind `TEAM` targets by team definition, not by pre-existing team run.
2. Persist a team launch preset with the binding.
3. Keep `teamRunId` as an internal cached execution pointer, not the primary user-facing target.
4. Keep Telegram externally single-stream and coordinator or entry-node only.

## Answer To The Telegram Reply Question

Telegram should receive only one reply stream by default.

Recommended rule:

- For `TEAM` bindings, send back only the coordinator response, or more precisely the response from the bound entry node.
- Do not send all member responses to Telegram.

Why:

- It matches the current metadata and callback flow.
- It avoids chaotic message fan-out in Telegram.
- It keeps the external conversation understandable even when the team internally delegates work.

Possible advanced option later:

- expose an expert-only setting for a non-coordinator `targetNodeName`
- still keep outbound replies single-stream from that chosen entry node

## Risks / Unknowns

1. The public setup flow currently blocks `TEAM`, so there is no existing end-to-end path that proves team bindings through the normal settings UI.
2. `DefaultChannelRuntimeFacade.dispatchToTeam(...)` currently expects `teamRunId`; phase 2 must introduce lazy creation plus cache-reset semantics when team-definition launch settings change, and the updated lifecycle rule is now active-only reuse rather than resumable reuse.
3. If nested team definitions are used, member-config expansion must recurse to leaf-agent members rather than only top-level nodes.
4. If member-runtime team modes are used, outbound reply behavior should be covered by explicit tests to confirm the coordinator/entry-member callback path behaves as expected.
5. Backend restart behavior also depends on frontend websocket reconnect reliability for already selected runs, so transport retry behavior needs explicit regression coverage.
6. The current TEAM callback-path tests still stop too early at `publishAssistantReplyByTurn(...)`; they need one stronger server-side regression that proves the gateway callback publish itself occurs for TEAM replies.

## Refreshed Investigation: live-state ownership, polling, and websocket attach churn

### 17. History refresh is currently coupled to live-run recovery

- The left workspace history tree polls every 5 seconds.
  - Evidence: `autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue`
- The history load path is not read-only. After fetching persisted history, it immediately runs live recovery.
  - Evidence: `autobyteus-web/stores/runHistoryLoadActions.ts`
  - Evidence: `autobyteus-web/services/runRecovery/activeRunRecoveryCoordinator.ts`
- That recovery step can reconnect team and agent streams for any run that history currently marks as active.
  - Evidence: `autobyteus-web/services/runRecovery/activeRunRecoveryCoordinator.ts`
  - Evidence: `autobyteus-web/stores/agentTeamRunStore.ts`

Implication:

- History polling is indirectly participating in websocket subscription management.
- This is the main design smell. A persisted-history read path should not own live-runtime reconnection policy.

### 18. The backend already has authoritative active-run managers, but the frontend does not consume them as a separate live-registry concept

- The backend already keeps the authoritative in-process active sets for agents and teams.
  - Evidence: `autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts:listActiveRuns`
  - Evidence: `autobyteus-server-ts/src/agent-team-execution/services/agent-team-run-manager.ts:listActiveRuns`
- The backend already exposes active-run GraphQL queries for both agents and teams.
  - Evidence: `autobyteus-server-ts/src/api/graphql/types/agent-run.ts:agentRuns`
  - Evidence: `autobyteus-server-ts/src/api/graphql/types/agent-team-run.ts:agentTeamRuns`
- The frontend does not treat those active sets as a separate source of truth. Instead it overlays liveness through run-history polling plus recovery side effects.

Implication:

- A cleaner design can be built mostly by re-structuring state ownership and frontend orchestration rather than by inventing a brand-new backend runtime subsystem.

### 19. Repeated `Agent team websocket attached` logs are real handshakes, but they do not necessarily mean one websocket client is looping by itself

- The server log line is emitted once per successful websocket handshake.
  - Evidence: `autobyteus-server-ts/src/api/websocket/agent.ts`
- The user-provided log excerpt alternates across multiple `teamRunId` values, not just one.
  - Evidence: manual logs from `2026-03-11`
- The earlier `WebSocketClient` reconnect fix addressed duplicate reconnect scheduling for a single client while already reconnecting, but it does not address the larger question of why multiple active team runs are being reattached repeatedly.
  - Evidence: `autobyteus-web/services/agentStreaming/transport/WebSocketClient.ts`

Inference:

- There are two layers of behavior:
  - transport-level reconnect correctness for one websocket client
  - application-level policy that decides which active runs should currently have live subscriptions
- The remaining churn is primarily an application-level state-ownership and subscription-policy issue.

### 20. The missing architecture boundary is an explicit active-runtime registry with a dedicated subscription owner

- The current frontend mixes four concerns:
  - persisted history loading
  - active-runtime detection
  - websocket subscription orchestration
  - selection and focus state
- That mixing explains the repeated regressions:
  - live team reselection reopening history
  - inactive-looking status after selection changes
  - websocket attach churn
  - difficult-to-explain liveness transitions

Recommended architecture direction:

1. Persisted history is read-only.
   - It loads rows, summaries, and timestamps only.
   - It never reconnects streams.
2. Backend exposes a dedicated active-runtime registry.
   - This can be a GraphQL query, a lightweight websocket feed, or both.
   - It publishes which agent runs and team runs are currently active in this backend process.
3. Frontend owns one subscription manager.
   - It decides which active runs should have live streams.
   - If product policy is "all active runs stay connected", that manager computes the desired subscribed set from the active registry and diffs it against the actual subscribed set.
4. Selection is separate from liveness.
   - Selecting a row changes focus only.
   - It does not itself decide whether a run is active or should be auto-recovered.

Conclusion:

- The repeated attach noise and state-confusion issues are not best solved by adding more local patches around the current history-refresh path.
- The correct next step is a design-level refactor that separates persisted history from active-runtime state and centralizes websocket subscription ownership.

### 21. The active-runtime snapshot is still not runtime-aware enough for mixed team/runtime modes

Evidence:

- The frontend now polls a dedicated active-runtime snapshot and then tries to recover every returned active agent run through the standalone run-open path.
  - Evidence: `autobyteus-web/stores/activeRuntimeSyncStore.ts`
- During live Telegram verification, the backend repeatedly logged GraphQL failures for `getRunResumeConfig(runId: "professor_d1b2d7525aa08a86")` and `getRunResumeConfig(runId: "student_d7d870e5c542bf16")`.
  - Evidence: live server logs captured on 2026-03-11
- Those `professor_*` and `student_*` ids are team-member run ids, not standalone run-history ids, so the standalone run-history service correctly cannot find manifests for them.
  - Evidence: `autobyteus-server-ts/src/run-history/services/run-history-service.ts`
  - Evidence: `autobyteus-server-ts/src/run-history/store/team-member-run-manifest-store.ts`
- The active standalone-agent GraphQL query currently returns every active id from `AgentRunManager.listActiveRuns()` with no filtering for team-member ownership.
  - Evidence: `autobyteus-server-ts/src/api/graphql/types/agent-run.ts`
  - Evidence: `autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts`
- Native team members are still agents underneath, and their configs carry team-member metadata in `customData`, notably `member_route_key` and `member_run_id`.
  - Evidence: `autobyteus-server-ts/src/agent-team-execution/services/agent-team-run-manager.ts`
- The active team GraphQL query currently only reports native-team activity from `AgentTeamRunManager.listActiveRuns()` and does not use the more complete member-runtime awareness already encapsulated by `TeamRunHistoryService.isTeamRunActive(...)`.
  - Evidence: `autobyteus-server-ts/src/api/graphql/types/agent-team-run.ts`
  - Evidence: `autobyteus-server-ts/src/run-history/services/team-run-history-service.ts`

Inference:

- The frontend cleanup was necessary, but the backend contract it consumes is still wrong for mixed runtime modes.
- Team-member agent runs must not be exposed through the standalone `agentRuns()` snapshot because the frontend will naturally try to recover them through the standalone resume-config path.
- Member-runtime team runs must be exposed through the active-team snapshot so selected Telegram-triggered team contexts remain visibly active and keep their live UI state coherent.
- The repeated `Memory file missing ...` logs are a related runtime-awareness smell: Codex/Claude-backed runs and team-member projections should not be treated as if every run necessarily has native local memory files or a native standalone run manifest.
- The immediate fix is to make the active-runtime snapshot runtime-aware at the backend boundary, not to add more frontend conditionals.

### 22. Run-history projection is already runtime-aware, but history metadata and resume semantics are still only partly runtime-aware

Evidence:

- Standalone run projection already resolves a provider from persisted runtime kind.
  - Evidence: `autobyteus-server-ts/src/run-history/services/run-projection-service.ts`
  - Evidence: `autobyteus-server-ts/src/run-history/projection/run-projection-provider-registry.ts`
- Provider implementations are already split by runtime family.
  - Evidence: `autobyteus-server-ts/src/run-history/projection/providers/local-memory-run-projection-provider.ts`
  - Evidence: `autobyteus-server-ts/src/run-history/projection/providers/codex-thread-run-projection-provider.ts`
  - Evidence: `autobyteus-server-ts/src/run-history/projection/providers/claude-session-run-projection-provider.ts`
- Team-member projection also branches by member binding runtime kind and can prefer a richer runtime-managed projection over local persisted projection.
  - Evidence: `autobyteus-server-ts/src/run-history/services/team-member-run-projection-service.ts`
- However, the broader standalone history metadata path still assumes a local manifest/index/memory-store model for much of its behavior.
  - Evidence: `autobyteus-server-ts/src/run-history/services/run-history-service.ts:listRunHistory(...)`
  - Evidence: `autobyteus-server-ts/src/run-history/services/run-history-service.ts:getRunResumeConfig(...)`
  - Evidence: `autobyteus-server-ts/src/run-history/services/run-history-service.ts:rebuildIndexFromDisk(...)`
- Team history still persists local member manifests and local member subtree layout for every runtime mode.
  - Evidence: `autobyteus-server-ts/src/run-history/services/team-run-history-service.ts`
- The current team-member projection path first probes local team memory and only then falls back to the runtime-aware provider path.
  - Evidence: `autobyteus-server-ts/src/run-history/services/team-member-memory-projection-reader.ts`
  - Evidence: `autobyteus-server-ts/src/run-history/services/team-member-run-projection-service.ts`

Inference:

- The codebase already has the beginning of the correct architecture: runtime-aware projection providers behind a registry.
- The remaining design gap is that runtime awareness stops too low in the stack.
- Projection is normalized, but history metadata, resume semantics, and storage expectations are not yet owned by one explicit runtime-aware history boundary.
- That is why Codex and Claude can still surface confusing local-file or local-manifest assumptions in neighboring history flows even when projection itself is correct.
- The cleaner next architecture is to grow the existing projection-provider idea into a broader runtime-aware history-source boundary that owns:
  - projection
  - summary extraction
  - resume metadata
  - storage assumptions
  - active-state interpretation for history purposes

Design implication:

- The frontend should remain fully runtime-agnostic for history loading.
- Backend history queries should return one normalized history contract regardless of runtime.
- Runtime-specific knowledge should stay behind a backend history-source registry rather than leaking into generic history services or frontend recovery logic.

## Recommended Next Slices If Implementation Is Approved

1. Replace run-bound team target selection with definition-bound team selection in setup GraphQL and web UI.
2. Add a `teamLaunchPreset` binding contract and persist it alongside `teamDefinitionId`.
3. Extend runtime launch logic so external ingress can resolve an existing cached team run or create a new one from the definition and preset.
4. Reset cached `teamRunId` whenever the bound team definition or team launch preset changes.
5. Add end-to-end tests that prove Telegram team binding yields one external reply stream rather than member fan-out.
6. Expand the existing run-projection-provider boundary into a broader runtime-aware history-source boundary for standalone runs and team members.
7. Split backend lifecycle initiation from history opening so frontend-initiated create/continue and backend-initiated messaging ingress converge on the same lifecycle service.
8. Keep member status as the primary visible UI status and reserve team aggregate status for liveness/subscription ownership only.

### 23. Fresh restart logs show two distinct stale-live-state problems still surviving the v8 workspace identity change

Evidence:

- After a clean backend restart, the server repeatedly logs the same team websocket attach for the same active team run:
  - `Agent team websocket attached for team run team_professor-student-team_8564dad1`
  - repeated dozens of times in one fresh-start log capture on `2026-03-12`
- The same fresh-start log also shows file-explorer reconnect attempts using an old UUID-like workspace id that the restarted backend cannot resolve:
  - `File explorer WebSocket connection rejected: workspace 26ff356d-77c0-4ead-a4de-8e56dcec0c92 not found`
- That rejected id is not a deterministic filesystem workspace id from the new `workspace-identity.ts` model, so it must be coming from stale frontend-held live state rather than the new backend identity path.
  - Evidence: `autobyteus-server-ts/src/workspaces/workspace-identity.ts`
- The workspace tree poll still refreshes both persisted history and active-runtime state every five seconds on mount and on interval.
  - Evidence: `autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue`
- Active team recovery is now owned by the dedicated active-runtime sync store, which will reconnect any active team context whose local subscription state appears falsey.
  - Evidence: `autobyteus-web/stores/activeRuntimeSyncStore.ts`
- Team websocket disconnects still mark `teamContext.isSubscribed = false`, so any rapid close/retry loop will be amplified by the poller repeatedly deciding the same active team needs another reconnect attempt.
  - Evidence: `autobyteus-web/services/agentStreaming/TeamStreamingService.ts`
  - Evidence: `autobyteus-web/stores/agentTeamRunStore.ts`

Inference:

- The workspace-identity correction was necessary, but it does not yet clear or rebind stale frontend live handles after backend restart on the same node.
- Two different stale-live-state paths are involved:
  - stale file-explorer/live workspace state is still attempting to reconnect with a pre-restart workspace id
  - stale active-team subscription state is still deciding that an already-failed or already-closed team stream should be reattached again on every refresh cycle
- This means the remaining noisy area is no longer primarily about durable workspace identity. It is about restart-time invalidation and rehydration of ephemeral live state on the frontend.

### 24. The backend restart boundary is not explicit enough for same-node frontend recovery

Evidence:

- `windowNodeContextStore` now exposes `bindingRevision`, but that revision only changes when the selected backend node or base URL changes.
  - Evidence: `autobyteus-web/stores/windowNodeContextStore.ts`
- Restarting the backend on the same node and same base URL does not increment that revision, so restart recovery does not automatically invalidate all live workspace/file-explorer/team-stream state.
  - Evidence: `autobyteus-web/stores/windowNodeContextStore.ts`
- `workspace.ts` still reconnects filesystem change streaming for each fetched workspace, and live file-explorer sessions are keyed by `workspaceId`.
  - Evidence: `autobyteus-web/stores/workspace.ts`
- The workspace tree itself can remain mostly correct after restart because persisted history reloads from durable data, while live file-explorer and team-stream state drift because their stale handles are not being invalidated at the restart boundary.
  - Evidence: live restart logs captured on `2026-03-12`

Inference:

- The current architecture still lacks a same-node backend-restart invalidation signal for ephemeral frontend live state.
- The reasonable next fix is not another ad hoc reconnect tweak. It is to make backend restart detection explicit and use it to clear or re-resolve all ephemeral live state:
  - file-explorer sessions
  - workspace live handles
  - active team stream subscription state
- Durable state should survive:
  - persisted history tree
  - deterministic filesystem workspace identity
- Ephemeral state should not survive:
  - websocket-backed file-explorer sessions
  - websocket-backed team stream subscriptions
  - any cached runtime-local handle from before restart
