# Investigation Notes

- Ticket: `messaging-runtime-visibility`
- Date: `2026-03-09`
- Scope: `Small`

## Question 1: Does Telegram only support the in-house runtime?

No provider-specific runtime restriction was found in the messaging ingress path.

Relevant code path:

1. The managed gateway forwards inbound Telegram and other provider messages to the server ingress API.
2. `ChannelIngressService.handleInboundMessage(...)` resolves the binding and dispatches through `ChannelRuntimeFacade`.
3. `DefaultChannelRuntimeFacade.dispatchToAgent(...)` calls `ChannelBindingRuntimeLauncher.resolveOrStartAgentRun(binding)`.
4. `ChannelBindingRuntimeLauncher` starts the run with `runtimeCompositionService.createAgentRun({ runtimeKind: binding.launchPreset.runtimeKind, ... })`.

Evidence:

- `autobyteus-server-ts/src/external-channel/runtime/channel-binding-runtime-launcher.ts`
  - uses `binding.launchPreset.runtimeKind` directly when creating the run.
- `autobyteus-server-ts/src/runtime-execution/runtime-composition-service.ts`
  - resolves the runtime adapter generically from `runtimeKind`.
- `autobyteus-web/composables/useMessagingChannelBindingSetupFlow.ts`
  - populates binding runtime options from `runtimeCapabilitiesStore.capabilities`.
- `autobyteus-web/stores/runtimeCapabilitiesStore.ts`
  - loads enabled runtimes from backend `runtimeCapabilities`.

Conclusion:

- Messaging bindings are runtime-generic at the server layer.
- Telegram does not have a Telegram-only runtime implementation.
- If `codex_app_server` or `claude_agent_sdk` are enabled on the node, the binding UI can select them and the launcher will use them.

## Question 2: Is there a runtime-specific messaging limitation?

Current product limitation is target-type based, not runtime based.

Evidence:

- `autobyteus-web/composables/messaging-binding-flow/policy-state.ts`
  - `allowedTargetTypes` is `['AGENT']`.

Conclusion:

- Managed messaging currently supports `AGENT` bindings only.
- This still allows Codex and Claude Agent SDK runtimes, because runtime choice is part of the agent launch preset.
- Team runs are not the current messaging target model.

## Question 3: Why are messaging-started agents not visible in the frontend?

The messaging create path bypasses the run-history bootstrap used by the normal frontend create flow.

Normal frontend create flow:

1. Web UI creates or continues a run through `RunContinuationService.continueRun(...)`.
2. `RunContinuationService.createAndContinueNewRun(...)` writes:
   - `run_manifest.json`
   - run-history index row
3. The frontend history tree later discovers the run via `listRunHistory`.

Messaging create flow:

1. Messaging dispatch calls `ChannelBindingRuntimeLauncher.resolveOrStartAgentRun(binding)`.
2. That method creates the runtime session and caches `binding.agentRunId`.
3. It does not write a run manifest or run-history row.
4. `runHistoryStore.fetchTree()` only reads persisted history, so the UI has nothing to show.

Evidence:

- `autobyteus-server-ts/src/run-history/services/run-continuation-service.ts`
  - `createAndContinueNewRun(...)` writes manifest and calls `runHistoryService.upsertRunHistoryRow(...)`.
- `autobyteus-server-ts/src/external-channel/runtime/channel-binding-runtime-launcher.ts`
  - creates runtime session and persists only the binding run id.
- `autobyteus-web/stores/runHistoryStore.ts`
  - fetches history from `listRunHistory` and `listTeamRunHistory`; no background push or polling source exists.
- `autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue`
  - fetches tree on mount only.

## Question 4: Can the frontend show background messaging runs?

Yes, with two bounded changes:

1. Persist messaging-created runs into run history at creation time.
2. Refresh the history tree periodically or on an event so the UI notices newly-created background runs without a manual action.

Why this is sufficient:

- Once a run has persisted manifest + history row, the left history tree can list it.
- When the user selects that row, `openRunWithCoordinator(...)` hydrates the run into `agentContextsStore` and connects the live stream if the run is active.
- This provides an Electron/web discovery path without needing to auto-open every background run.

## Residual Gaps

1. There is no focused automated test proving a messaging binding launches `codex_app_server` or `claude_agent_sdk`; the code path is generic, but explicit regression coverage is missing.
2. The running panel is based on locally hydrated contexts, so background runs will first appear in persisted history, then move into the active context store when the user opens them.

## Question 5: Can messaging-originated user turns be pushed into an already-open frontend chat?

Yes. The current architecture already supports pushed non-token events over the agent websocket, but it does not yet define a user-turn event for externally originated messages.

Evidence:

- `autobyteus-server-ts/src/services/agent-streaming/models.ts`
  - the backend websocket protocol already carries non-segment events such as `INTER_AGENT_MESSAGE`, `SYSTEM_TASK_NOTIFICATION`, `TODO_LIST_UPDATE`, and artifact events.
- `autobyteus-server-ts/src/services/agent-streaming/runtime-event-message-mapper.ts`
  - runtime and agent events are normalized into typed server messages.
- `autobyteus-web/services/agentStreaming/AgentStreamingService.ts`
  - the frontend dispatcher already routes typed websocket events into conversation/state mutations.
- `autobyteus-web/services/agentStreaming/TeamStreamingService.ts`
  - team flows already render pushed events like `INTER_AGENT_MESSAGE`.
- `autobyteus-server-ts/src/services/agent-streaming/method-runtime-event-adapter.ts`
  - runtime user-message items are intentionally suppressed (`item/added` and `item/completed` no-op for `usermessage` / `inputmessage`), so runtime raw events are not the right source for frontend mirroring of external messages.
- `autobyteus-server-ts/src/services/agent-streaming/agent-session-manager.ts`
  - the server already tracks active websocket sessions per `runId`, which means a run-scoped publish path can fan out to all connected viewers once a connection registry is added.
- `autobyteus-server-ts/src/external-channel/runtime/default-channel-runtime-facade.ts`
  - the external envelope is available at the exact point where a turn is accepted/rejected, which is the correct place to publish a synthetic live user-turn event after acceptance.

Conclusion:

- A clean design is to keep persisted history/projection as the discovery and reopen source of truth, then add one provider-agnostic run-scoped websocket event for accepted external user turns.
- The synthetic event should be emitted from the external-channel dispatch path after `sendTurn(...)` is accepted, not from runtime raw events.
- This keeps the feature runtime-agnostic for `autobyteus`, `codex_app_server`, and `claude_agent_sdk`.

## Design Implications For The Re-Entry

1. The previous fix solved visibility in history and hydration on open, but not live mirrored user turns inside an already-open chat.
2. The missing behavior is a requirement gap, not a provider/runtime-specific limitation.
3. The cleanest bounded implementation is:
   - add a run-scoped agent-stream broadcaster / publisher on the backend,
   - add a new single-agent websocket server-message type for external user turns,
   - publish that event from the external-channel dispatch path after successful acceptance,
   - append a `user` message in the frontend streaming layer.
4. Persisted run projection remains authoritative for recovery/reopen, which avoids coupling the UI to transient websocket-only state.

## Post-Handoff Failure Analysis

### Symptom Observed During Live Verification

1. The inbound messaging-app user turn now appears correctly inside the open Electron conversation.
2. The assistant still produces a response in the app.
3. The response is no longer reliably routed back to the external messaging provider.

### Concrete Regression Candidate

The new live frontend fan-out was inserted directly into the external-channel ingress success path:

1. `DefaultChannelRuntimeFacade.dispatchToAgent(...)` now calls `runtimeCommandIngressService.sendTurn(...)`.
2. After acceptance, it immediately calls `liveMessagePublisher.publishExternalUserMessage(...)`.
3. Only after `dispatchToBinding(...)` returns does `ChannelIngressService.handleInboundMessage(...)` persist the channel ingress receipt via `recordIngressReceipt(...)`.
4. Outbound reply routing later depends on that receipt + turn binding pair, because `ReplyCallbackService.publishAssistantReplyByTurn(...)` resolves the provider route by `(agentRunId, turnId)`.

The new broadcaster path is not isolated from transport failures:

- `AgentStreamBroadcaster.publishToRun(...)` calls `connection.send(...)` directly with no `try/catch`.
- If any registered websocket connection throws during that send, the exception bubbles out of `publishExternalUserMessage(...)`.
- That exception bubbles out of `dispatchToAgent(...)` after the runtime already accepted the user turn.
- `ChannelIngressService.handleInboundMessage(...)` then aborts before `recordIngressReceipt(...)` executes.

Why this matches the reported symptom:

1. The runtime already received the user turn, so the agent can still respond locally/in-app.
2. The missing ingress receipt means the later outbound callback lookup can resolve to `SOURCE_NOT_FOUND`.
3. The frontend live mirror is therefore a plausible direct cause of “message appears in Electron, but reply no longer reaches the bot.”

### Current Classification

- Classification: `Local Fix`
- Reason: the likely defect is an exception-isolation bug inside the newly added live frontend publish path, not a requirement or architecture gap.

## New Live Verification Failure: Binding Replacement + Gateway Startup

### User-Observed Symptoms

1. An existing messaging binding was deleted intentionally to replace it with a new one.
2. After deletion, saving any new binding no longer works.
3. The managed messaging gateway now shows `BLOCKED`, reports `Managed messaging gateway exited unexpectedly`, and will not start.

### Why This Reopens Investigation

These symptoms are broader than the previous callback-routing regression:

1. Binding save failure suggests a persistence, validation, or frontend state bug in the messaging configuration flow.
2. Gateway startup failure suggests a runtime bootstrap/configuration issue in the managed gateway lifecycle.
3. Either one could be independent, or both could share a single stale-config / invalid-state root cause after binding deletion.

### Initial Investigation Targets

1. The frontend save flow for messaging bindings after a delete-and-recreate sequence.
2. Backend binding persistence and uniqueness/validation behavior for replacement bindings.
3. Managed messaging gateway startup logs and the persisted provider account config that the gateway loads.
4. Whether the installed Electron build is reading stale app-local provider configuration even after server-side binding deletion.

## Recovery UX Root Cause Analysis

### Why The Gateway Felt “Strangely Blocked”

1. The managed gateway lifecycle is modeled primarily around an in-memory child-process handle.
2. After the Electron/server restart sequence, the previous managed gateway instance could still be healthy on the persisted preferred port while the new server process no longer owned that child handle.
3. The next restore/start attempt then tried to launch a second runtime on a new port, hit the queue-owner lock, and persisted `BLOCKED`.
4. The user-facing card only showed the generic lifecycle state and message, so the product did not explain whether the problem was:
   - a healthy already-running runtime,
   - a stale lock,
   - a provider conflict such as Telegram polling,
   - or an actual unrecoverable startup failure.

### Why Binding Save Looked Completely Broken

1. The backend binding CRUD path remained functional; direct GraphQL create/delete succeeded against the packaged-app server.
2. The visible “save is broken” symptom came from the frontend setup flow:
   - the Telegram/Discord binding flow was still in dropdown peer-selection mode,
   - peer discovery was unavailable while the gateway was blocked,
   - `assertSelectionsFresh(...)` threw before mutation,
   - `onSaveBinding()` swallowed that error,
   - and the stored stale-selection error was never rendered.
3. The product therefore presented a dead-end flow: the user saw a save button, but no actionable explanation or recovery step.

### UX/Architecture Classification

- Classification: `Design Impact`

## External Runtime Reply-Routing Root Cause Analysis

### User-Observed Symptom

1. A Telegram inbound user turn targeting a `codex_app_server` run appears correctly in the Electron conversation.
2. The assistant produces a response in the Electron conversation as well.
3. The assistant response is not delivered back to Telegram.

### Live Evidence From The Packaged App

1. The active packaged app is running from `/Users/normy/.autobyteus/server-data`, not the older `~/Library/Application Support/...` path.
2. The gateway outbox contains earlier successful Telegram replies for the legacy `autobyteus` runtime-backed run:
   - `external-reply:SuperAgent_SuperAgent_1895:turn_0001`
   - `external-reply:SuperAgent_SuperAgent_1895:turn_0002`
3. Later Telegram receipts for the Codex runs exist, but the newer rows are missing `turn_id`:
   - `update:109349047` -> `agent_id = 87fb6820-8395-49a0-bd8c-60a30182d523`, `turn_id = null`
   - `update:109349048` -> `agent_id = f2a7ab7f-0110-4dea-b1f0-ae3a3e59cff3`, `turn_id = null`
   - `update:109349049` -> `agent_id = f2a7ab7f-0110-4dea-b1f0-ae3a3e59cff3`, `turn_id = null`
4. The Codex run manifests confirm these are `codex_app_server` runs:
   - `/Users/normy/.autobyteus/server-data/memory/agents/87fb6820-8395-49a0-bd8c-60a30182d523/run_manifest.json`
   - `/Users/normy/.autobyteus/server-data/memory/agents/f2a7ab7f-0110-4dea-b1f0-ae3a3e59cff3/run_manifest.json`

### Why This Is Not Primarily A Gateway Transport Failure

1. The gateway accepted inbound traffic and the frontend received the mirrored external user turn, so ingress transport is alive.
2. No new outbound delivery records were created for the later Codex-backed turns, which means the failure happens before the gateway delivery queue.
3. The callback path needs `(agentRunId, turnId)` to resolve the source route in `ReplyCallbackService.publishAssistantReplyByTurn(...)`.
4. When `turn_id` is never bound to the receipt, outbound provider reply routing cannot resolve the source route for the later runtime turn.

### Code-Level Root Cause

The external-channel callback machinery currently exists only inside the legacy `autobyteus` agent processor chain:

1. `ExternalChannelTurnReceiptBindingProcessor`
   - binds `(external message -> agentRunId + turnId)`
   - runs inside `UserInputMessageEventHandler`
2. `ExternalChannelAssistantReplyProcessor`
   - publishes the provider callback from `(agentRunId + turnId + final assistant response)`
   - runs inside `LLMCompleteResponseReceivedEventHandler`

## Refreshed Packaged-App Root Cause: Runtime-Native Callback Configuration Gap

### New Live Evidence

1. The latest failing Telegram receipt is no longer missing a `turn_id`:
   - `channel_message_receipts.id = 42`
   - `external_message_id = update:109349052`
   - `agent_id = ce6be3ce-cbdb-4290-a0ed-4f1edb30d613`
   - `turn_id = 019cd3de-8116-7140-a1c5-26e44a3bef95`
2. There is no matching new `channel_callback_idempotency_keys` row or `channel_delivery_events` row for that turn, so the failure now happens before provider delivery recording.
3. The packaged-app server log contains the exact skip reason for the failing run:
   - `Run 'ce6be3ce-cbdb-4290-a0ed-4f1edb30d613': runtime-native outbound callback skipped (CALLBACK_NOT_CONFIGURED).`
4. The managed gateway persisted state on disk says the runtime is healthy and recovered:
   - `state/managed-gateway-state.json` shows `lifecycleState = RUNNING`, `bindHost = 127.0.0.1`, `bindPort = 8010`, `pid = null`
5. The gateway config on disk also confirms the runtime is live on `127.0.0.1:8010`, while logs show repeated Telegram polling conflicts and queue-lock ownership evidence consistent with a recovered/adopted runtime instead of a freshly supervised child.
6. The user then provided the decisive product signal: the same Telegram setup routes replies correctly with the in-house `autobyteus` runtime, but still fails with `codex_app_server`.

### Why The Previous Fix Was Insufficient

The previous design-impact fix solved the earlier missing-turn-binding gap for external runtimes:

1. the latest receipt is now correctly bound to a runtime-native `turn_id`
2. the runtime bridge reaches the callback publish attempt
3. but the callback publisher is still treated as unavailable in the packaged-app runtime

So the remaining bug is not “Codex never produced a routable turn id.” It is “the runtime-native callback path freezes its callback configuration too early, while the working in-house runtime resolves callback publishing later.”

### Code-Level Root Cause

1. `ExternalChannelAssistantReplyProcessor` creates its `ReplyCallbackService` inside `processResponse(...)`, so the working `autobyteus` runtime resolves callback publishing when the assistant reply is actually ready.
2. `RuntimeExternalChannelTurnBridge` is constructed once through `getDefaultChannelIngressRouteDependencies()` during REST route registration at server startup.
3. Before this fix, the bridge constructor eagerly created and cached one `ReplyCallbackService` for the lifetime of the process.
4. That eager `ReplyCallbackService` resolved its `GatewayCallbackPublisher` from startup-time state, often before the managed messaging gateway had been enabled and started.
5. Result:
   - `autobyteus` runtime still worked because it created callback publishing late per response.
   - `codex_app_server` and `claude_agent_sdk` stayed stuck with the startup-time unconfigured callback publisher inside the singleton bridge.
   - `ReplyCallbackService.publishAssistantReplyByTurn(...)` then skipped with `CALLBACK_NOT_CONFIGURED` even though the gateway was healthy by the time the assistant reply completed.

### Classification

- Classification: `Design Impact`
- Reason: the failure is in the runtime-native boundary between external-channel dispatch and assistant reply publication. The current product has two callback-resolution lifecycles:
  - late-bound per-response callback publishing in the in-house runtime
  - startup-time cached callback publishing in the runtime-native singleton bridge

They need to be aligned so runtime-native reply routing does not depend on server-start ordering.

That works for the in-house runtime because `AutobyteusRuntimeAdapter.sendTurn(...)` forwards into `AgentRunManager.postUserMessage(...)`, which executes those processors.

It does not work for the external runtimes:

1. `DefaultChannelRuntimeFacade.dispatchToAgent(...)` sends the external message through `RuntimeCommandIngressService.sendTurn(...)`.
2. `CodexAppServerRuntimeAdapter.sendTurn(...)` and `ClaudeAgentSdkRuntimeAdapter.sendTurn(...)` send directly into their runtime services.
3. Those runtimes bypass `UserInputMessageEventHandler` and `LLMCompleteResponseReceivedEventHandler`.
4. Therefore they never execute:
   - `ExternalChannelTurnReceiptBindingProcessor`
   - `ExternalChannelAssistantReplyProcessor`

### Resulting Product Behavior

1. The frontend live mirror still works because that was added directly in the external-channel dispatch path.
2. The assistant response still appears in Electron because the runtime itself completed normally.
3. Telegram does not receive the assistant reply because the external-runtime path never bound the receipt turn id and never invoked the outbound callback publisher.

### Runtime Scope Of The Bug

- `autobyteus`: not affected by this exact gap because it still uses the processor chain.
- `codex_app_server`: affected.
- `claude_agent_sdk`: affected by the same architectural gap, even if the user reported Codex first.

### New Classification

- Classification: `Design Impact`
- Reason:
  - The runtime abstraction currently assumes that external-channel turn binding and reply publishing can live inside the in-house processor chain.
  - That assumption is invalid for `codex_app_server` and `claude_agent_sdk`, so the fix must move those responsibilities to a runtime-generic boundary.
- Reason: the fix is not only local validation messaging. The managed gateway needs restart/recovery reconciliation semantics, and the frontend needs explicit recovery UX for both blocked lifecycle states and stale peer-selection states.
