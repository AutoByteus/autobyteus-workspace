# Implementation Plan

- Scope: `Small`
- Goal: preserve messaging runtime visibility while adding resilient managed-gateway recovery and actionable setup UX so users can recover from blocked gateway and stale binding-selection states inside the product.

## Design Basis

Messaging should keep using the existing binding launch preset as the source of truth for runtime selection. The solution stays hybrid:

1. persisted run history remains the canonical discovery + reopen path,
2. a new run-scoped websocket event mirrors accepted external user turns into already-open frontend chats.

This avoids coupling the UI to backend runtime memory for discovery while still giving real-time visibility for open runs.

## Planned Changes

1. Backend: keep the focused persistence helper for messaging-created agent runs.
   - Input: binding launch preset + created runtime session + initial summary.
   - Output: `run_manifest.json` written and run-history row upserted.
2. Backend: add a single-agent live event publisher that can fan out typed websocket messages to all connected sessions for a `runId`.
3. Backend: define a provider-agnostic server-message contract for accepted external user turns.
4. Backend: publish that event from the external-channel dispatch path only after `sendTurn(...)` is accepted.
5. Frontend: handle the new live user-turn event in `AgentStreamingService` and append a normal `user` message to the open conversation.
6. Frontend: keep the best-effort background refresh in the workspace history panel so persisted background runs still appear without manual reload.
7. Tests: extend backend and frontend focused suites for both history bootstrap and live external user-turn mirroring.
8. Backend: teach managed messaging lifecycle to reconcile a still-healthy runtime that survived app/server restart on the persisted preferred port instead of leaving the UI in `BLOCKED`.
9. Backend: add an authenticated runtime shutdown endpoint so disable/update/restart can stop an adopted runtime even when the current server process did not spawn it.
10. Frontend: upgrade the managed gateway card from generic blocked status to actionable recovery UX:
    - show failure detail,
    - surface provider blocked reasons,
    - use a recovery-oriented primary action when blocked.
11. Frontend: surface stale peer-selection failures and give the user a direct manual-entry fallback in the binding flow.
12. Backend: add a runtime-generic external turn bridge for non-`autobyteus` runtimes that:
    - binds the inbound external receipt to the accepted runtime turn id,
    - listens for that turn's completion on `codex_app_server` / `claude_agent_sdk`,
    - publishes the external provider reply callback when assistant output is available.
13. Backend: extend runtime command results so external runtimes can return the accepted `turnId` to the external-channel facade.
14. Tests: extend focused backend coverage for Codex/Claude turn binding and runtime-native reply callback publishing.
15. Backend: resolve runtime-native reply callback publishing lazily inside the external turn bridge so `codex_app_server` and `claude_agent_sdk` do not freeze callback configuration at server startup before the managed gateway is running.

## File Plan

1. `autobyteus-server-ts/src/external-channel/runtime/channel-binding-runtime-launcher.ts`
2. `autobyteus-server-ts/src/external-channel/runtime/channel-run-history-bootstrapper.ts`
3. `autobyteus-server-ts/src/external-channel/runtime/default-channel-runtime-facade.ts`
4. `autobyteus-server-ts/src/services/agent-streaming/models.ts`
5. `autobyteus-server-ts/src/services/agent-streaming/agent-stream-handler.ts`
6. `autobyteus-server-ts/src/services/agent-streaming/agent-stream-broadcaster.ts`
7. `autobyteus-server-ts/src/services/agent-streaming/agent-live-message-publisher.ts`
8. `autobyteus-server-ts/tests/unit/external-channel/runtime/channel-binding-runtime-launcher.test.ts`
9. `autobyteus-server-ts/tests/unit/external-channel/runtime/default-channel-runtime-facade.test.ts`
10. `autobyteus-server-ts/tests/unit/services/agent-streaming/agent-live-message-publisher.test.ts`
11. `autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue`
12. `autobyteus-web/components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts`
13. `autobyteus-web/services/agentStreaming/protocol/messageTypes.ts`
14. `autobyteus-web/services/agentStreaming/AgentStreamingService.ts`
15. `autobyteus-web/services/agentStreaming/handlers/externalUserMessageHandler.ts`
16. `autobyteus-web/services/agentStreaming/__tests__/AgentStreamingService.spec.ts`
17. `autobyteus-message-gateway/src/http/routes/runtime-reliability-route.ts`
18. `autobyteus-message-gateway/tests/integration/http/routes/runtime-reliability-route.integration.test.ts`
19. `autobyteus-server-ts/src/managed-capabilities/messaging-gateway/messaging-gateway-admin-client.ts`
20. `autobyteus-server-ts/src/managed-capabilities/messaging-gateway/managed-messaging-gateway-service.ts`
21. `autobyteus-server-ts/tests/e2e/messaging/managed-messaging-gateway-update-graphql.e2e.test.ts`
22. `autobyteus-web/components/settings/messaging/ManagedGatewayRuntimeCard.vue`
23. `autobyteus-web/components/settings/messaging/__tests__/ManagedGatewayRuntimeCard.spec.ts`
24. `autobyteus-web/components/settings/messaging/ChannelBindingSetupCard.vue`
25. `autobyteus-web/components/settings/messaging/__tests__/ChannelBindingSetupCard.spec.ts`
26. `autobyteus-web/stores/__tests__/gatewaySessionSetupStore.spec.ts`
27. `autobyteus-server-ts/src/external-channel/runtime/runtime-external-channel-turn-bridge.ts`
28. `autobyteus-server-ts/src/runtime-execution/runtime-adapter-port.ts`
29. `autobyteus-server-ts/src/runtime-execution/adapters/codex-app-server-runtime-adapter.ts`
30. `autobyteus-server-ts/src/runtime-execution/adapters/claude-agent-sdk-runtime-adapter.ts`
31. `autobyteus-server-ts/tests/unit/external-channel/runtime/runtime-external-channel-turn-bridge.test.ts`
32. `autobyteus-server-ts/tests/unit/runtime-execution/adapters/codex-app-server-runtime-adapter.test.ts`
33. `autobyteus-server-ts/tests/unit/runtime-execution/adapters/claude-agent-sdk-runtime-adapter.test.ts`
34. `autobyteus-server-ts/tests/unit/external-channel/runtime/runtime-external-channel-turn-bridge.test.ts`

## Verification Plan

1. Backend unit: new run creation writes history bootstrap and still persists `binding.agentRunId`.
2. Backend unit: cached active run reuse does not bootstrap history again.
3. Backend unit: accepted external dispatch publishes one live user-turn event for the resolved `runId`.
4. Backend unit: rejected external dispatch does not publish a live user-turn event.
5. Backend unit: run-scoped publish fans out only to active sessions for the targeted run.
6. Frontend unit: mounted history panel still loads once immediately and performs a quiet refresh on the background timer.
7. Backend unit: accepted Codex/Claude external turns bind `turnId` to the receipt and publish provider callbacks from runtime-native completion events.
7. Frontend unit: the new live user-turn websocket event appends a `user` message to the open conversation.
8. Backend integration/e2e: after service reset or restart-style state loss, querying/updating the managed gateway reconciles the already-running runtime and no longer leaves status stuck in `BLOCKED`.
9. Backend integration: a reachable adopted runtime can be shut down through the authenticated runtime-reliability admin surface.
10. Frontend unit: the managed gateway card renders recovery detail and a recovery-oriented primary action for blocked lifecycle state.
11. Frontend unit: the binding card renders stale peer-selection errors and exposes a manual fallback when discovery is unavailable.
12. Backend unit: the runtime-native external turn bridge resolves its callback service only when the assistant reply is ready, so startup-time singleton construction cannot permanently freeze `CALLBACK_NOT_CONFIGURED` for later Codex/Claude replies.

## Risks

1. Coupling launcher directly to run-history persistence would make the runtime launcher broader than necessary.
   - Mitigation: keep persistence logic in a dedicated helper.
2. Polling too aggressively would create unnecessary GraphQL traffic.
   - Mitigation: use a modest interval and only refresh while the panel is mounted.
3. Live mirrored user turns could be duplicated if projection rehydrate and websocket push both mutate the same already-open context.
   - Mitigation: keep persisted projection as the reopen source of truth and limit the live event to already-open subscribed runs; avoid projection overwrite for subscribed contexts.
4. Gateway reconciliation could accidentally treat an unrelated process as managed runtime state.
   - Mitigation: only adopt/recover runtimes reachable through the persisted bind host/port and matching admin token for the current data root.
5. Lazy callback-service resolution in the runtime-native bridge could accidentally create duplicated publishers per turn.
   - Mitigation: keep idempotency and delivery-event recording in `ReplyCallbackService`, and limit the change to service creation timing rather than callback semantics.
