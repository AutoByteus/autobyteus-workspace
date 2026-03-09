# Future-State Runtime Call Stack

## Use Case 1: Telegram Message Starts A Codex Or Claude Messaging Run

1. Managed gateway receives an inbound provider message.
2. Gateway forwards the normalized envelope to `/api/channel-ingress/v1/messages`.
3. `ChannelIngressService.handleInboundMessage(...)` resolves the bound agent target.
4. `DefaultChannelRuntimeFacade.dispatchToAgent(...)` asks the launcher to resolve or start the agent run and passes the first-message summary.
5. `ChannelBindingRuntimeLauncher.resolveOrStartAgentRun(...)` checks for a cached active run.
6. If no active run exists:
   - ensures workspace by root path,
   - creates the run using `binding.launchPreset.runtimeKind`,
   - binds the runtime session,
   - persists the binding `agentRunId`,
   - bootstraps `run_manifest.json` and run-history row for the new run.
7. `RuntimeCommandIngressService.sendTurn(...)` delivers the external message into the selected runtime.
8. If the turn is accepted, the external-channel runtime facade publishes a run-scoped live external user-turn websocket event for any subscribed frontend sessions on that `runId`.
9. `ChannelIngressService` records the ingress receipt with the resolved `agentRunId`.

Expected result:

- Telegram and other messaging providers still use the runtime selected in the binding launch preset.
- Newly created background runs immediately exist in persisted run history.
- Open subscribed frontend chats for that run can receive a live mirror of the accepted external user turn.

## Use Case 2: Electron/Web UI Discovers Background Messaging Runs

1. `WorkspaceAgentRunsTreePanel.vue` mounts and loads the history tree.
2. While mounted, the panel performs a quiet periodic refresh of run history.
3. `runHistoryStore.fetchTree()` calls `listRunHistory`.
4. Backend returns the newly persisted messaging-created run row.
5. The left history tree renders the run as an active history row.
6. User selects the row.
7. `openRunWithCoordinator(...)` loads run projection + resume config, hydrates `agentContextsStore`, and connects the live stream if the run is active.

Expected result:

- Background messaging-created runs become discoverable in the UI without manual reload.
- Selecting the run promotes it from persisted history into a live hydrated frontend context.

## Use Case 3: Open Frontend Chat Mirrors A New External User Turn Live

1. The user has already opened an active agent run in the Electron/web frontend.
2. `openRunWithCoordinator(...)` has hydrated the run and connected the agent websocket stream.
3. A new inbound external message for the same binding reaches `ChannelIngressService.handleInboundMessage(...)`.
4. `DefaultChannelRuntimeFacade.dispatchToAgent(...)` resolves the existing `agentRunId` and calls `RuntimeCommandIngressService.sendTurn(...)`.
5. The turn is accepted by the runtime ingress layer.
6. `DefaultChannelRuntimeFacade` hands the accepted external envelope + `agentRunId` to a live message publisher.
7. The live message publisher emits a typed single-agent websocket server message for that `runId`.
8. The agent-stream broadcaster fans out that server message to all connected single-agent websocket sessions registered for the `runId`.
9. `AgentStreamingService.dispatchMessage(...)` routes the new message type to a dedicated frontend handler.
10. The frontend handler appends a `user` message to the already-open conversation using the external message content and any supported context-file metadata.
11. Runtime assistant/tool/status events continue to stream through the existing runtime-event path.

Expected result:

- The open chat shows the new messaging-originated user turn immediately.
- The solution is provider-agnostic (`Telegram`, `Discord`, `WhatsApp`, `WeChat`) and runtime-agnostic (`autobyteus`, `codex_app_server`, `claude_agent_sdk`).
- Persisted history/projection remains the source of truth when the run is later reopened.

## Use Case 4: App Restart Recovers A Still-Healthy Managed Gateway

1. A managed gateway runtime is still healthy on the persisted preferred bind port after an app/server restart or service reset.
2. The new server process handles `managedMessagingGatewayStatus` or a recovery mutation.
3. `ManagedMessagingGatewayService` reads persisted state and sees that the in-memory process supervisor does not currently own a child runtime.
4. Before launching a new process, the service probes the persisted preferred bind host/port with the current admin token.
5. If the runtime is healthy, the service adopts that reachable runtime as the effective managed gateway for status/recovery purposes instead of attempting a second conflicting launch.
6. The persisted managed-gateway state is rewritten to `RUNNING` with the adopted bind host/port so the frontend no longer presents a stale `BLOCKED` badge.
7. If the user later disables or updates the gateway, the service uses the authenticated admin shutdown boundary to stop the adopted runtime cleanly before further lifecycle action.

Expected result:

- App restart does not strand the user behind a stale blocked state when the gateway is already healthy.
- Restart/recover flows stop treating “healthy already-running runtime” as “generic startup failure.”

## Use Case 5: Binding Setup Recovers From Discovery Failure Without Silent Save Errors

1. The user opens the binding setup flow for a provider that supports peer discovery and manual peer input.
2. The managed gateway is unavailable, degraded, or unable to refresh peer candidates.
3. The binding flow keeps the current draft, surfaces the stale-selection or discovery failure inline, and explains why save cannot proceed in dropdown mode.
4. The binding card offers a direct recovery action to switch into manual peer-input mode without leaving the page.
5. The user can either:
   - recover the gateway and refresh peers, or
   - continue in manual peer-entry mode and save the binding.

Expected result:

- The user is never left with a dead-end “Save Binding” button that appears broken.
- Messaging setup always provides a visible recovery path back to a valid save state.

## Use Case 6: Codex Or Claude Messaging Turns Still Route Assistant Replies Back To The Provider

1. A provider message reaches `ChannelIngressService.handleInboundMessage(...)` for a binding whose runtime is `codex_app_server` or `claude_agent_sdk`.
2. `DefaultChannelRuntimeFacade.dispatchToAgent(...)` resolves or starts the run and calls `RuntimeCommandIngressService.sendTurn(...)`.
3. The external runtime adapter returns an accepted runtime turn id.
4. A runtime-generic external turn bridge binds the external receipt to `(agentRunId, turnId)` immediately after acceptance.
5. The same bridge registers a runtime-event listener scoped to `(runId, turnId)`.
6. The external runtime emits runtime-native assistant output events for that turn.
7. The bridge accumulates assistant text from runtime-native output events, with projection fallback on terminal completion when the runtime does not emit final text directly.
8. When the matching turn reaches terminal completion, the bridge calls `ReplyCallbackService.publishAssistantReplyByTurn(...)`.
9. `ReplyCallbackService` resolves the original provider route from the bound receipt and publishes the assistant reply back through the gateway callback publisher.

Expected result:

- The same external message that appears live in Electron also gets a routed provider reply for `codex_app_server` and `claude_agent_sdk`.
- Turn binding and outbound callback logic no longer depend on the in-house `autobyteus` processor chain.
- Provider reply routing remains bound to the accepted runtime turn instead of best-effort inference from frontend state.

## Use Case 7: Recovered Managed Gateway Still Supports Outbound Reply Callbacks

1. The packaged app/server restarts or loses direct child-process ownership, but the managed gateway remains reachable on the persisted bind host/port.
2. `ManagedMessagingGatewayService.getStatus()` or a lifecycle action reconciles that reachable runtime and persists the gateway state as `RUNNING`.
3. A later external-runtime turn completes and `RuntimeExternalChannelTurnBridge` calls `ReplyCallbackService.publishAssistantReplyByTurn(...)`.
4. `ReplyCallbackService` asks `resolveGatewayCallbackPublisherOptions()` for a callback publisher configuration.
5. Callback option resolution consults the same reconciled managed-gateway runtime contract used for lifecycle/status recovery, not only the raw in-memory child-process snapshot.
6. If the managed gateway is reachable and adopted/recovered for the current data root, callback option resolution returns `http://<bindHost>:<bindPort>` for the managed runtime.
7. `ReplyCallbackService` records callback idempotency, records a pending delivery event, and publishes the outbound envelope to the managed gateway callback endpoint.
8. The managed gateway accepts the callback request and delivers the provider reply.
9. `ReplyCallbackService` records the delivery event as sent.

Expected result:

- A recovered/adopted managed gateway remains usable for outbound provider replies, not just for UI status reporting.
- The system has one consistent definition of “gateway is running enough for callbacks”: reachable and reconciled for the current data root.
- Reply callbacks no longer skip with `CALLBACK_NOT_CONFIGURED` merely because the current server process did not spawn the child directly.
