# Investigation Notes

## Scope Triage

- Scope: `Small`
- Reason: the reopened ticket stays inside the external-channel ingress/recovery spine plus the native AutoByteus dispatch timing contract. The core issue is architectural timing, not a broad subsystem rewrite.

## Investigation Goals

1. Verify whether the packaged Electron + Telegram failure is a real server/runtime regression or only a transport/UI artifact.
2. Determine whether the first bound Telegram reply is missed because of late accepted-receipt observation, a binding/setup race, reply-text recovery failure, or some combination.
3. Explain why the existing Stage 7 integration coverage passed while the real packaged desktop flow still fails.

## Exact Sources Consulted

### Ticket artifacts

- `tickets/done/telegram-outbound-reply-lag/workflow-state.md`
- `tickets/done/telegram-outbound-reply-lag/api-e2e-testing.md`
- `tickets/done/telegram-outbound-reply-lag/requirements.md`
- `autobyteus-web/README.md`
- `autobyteus-web/docs/messaging.md`

### Live persisted data and logs

- `/Users/normy/.autobyteus/server-data/external-channel/message-receipts.json`
- `/Users/normy/.autobyteus/server-data/external-channel/gateway-callback-outbox.json`
- `/Users/normy/.autobyteus/server-data/external-channel/bindings.json`
- `/Users/normy/.autobyteus/server-data/memory/agents/SuperAgent_SuperAgent_8189/raw_traces.jsonl`
- `/Users/normy/.autobyteus/server-data/memory/agents/SuperAgent_SuperAgent_8189/working_context_snapshot.json`
- `/Users/normy/.autobyteus/server-data/logs/server.log`
- `/Users/normy/.autobyteus/server-data/logs/messaging-gateway/stderr.log`

### Current code entrypoints and owners

- `autobyteus-server-ts/src/external-channel/services/channel-ingress-service.ts`
- `autobyteus-server-ts/src/external-channel/runtime/channel-run-facade.ts`
- `autobyteus-server-ts/src/external-channel/runtime/channel-agent-run-facade.ts`
- `autobyteus-server-ts/src/external-channel/runtime/channel-binding-run-launcher.ts`
- `autobyteus-server-ts/src/external-channel/runtime/accepted-receipt-recovery-runtime.ts`
- `autobyteus-server-ts/src/external-channel/runtime/accepted-receipt-turn-correlation-coordinator.ts`
- `autobyteus-server-ts/src/external-channel/runtime/channel-agent-run-reply-bridge.ts`
- `autobyteus-server-ts/src/external-channel/services/channel-turn-reply-recovery-service.ts`
- `autobyteus-server-ts/src/api/graphql/types/external-channel-setup/resolver.ts`
- `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend.ts`
- `autobyteus-ts/src/agent/agent.ts`
- `autobyteus-ts/src/agent/runtime/agent-runtime.ts`
- `autobyteus-ts/src/agent/runtime/agent-worker.ts`
- `autobyteus-ts/src/agent/handlers/user-input-message-event-handler.ts`
- `autobyteus-ts/src/agent/input-processor/memory-ingest-input-processor.ts`
- `autobyteus-ts/src/agent/context/agent-runtime-state.ts`
- `autobyteus-server-ts/tests/integration/api/rest/channel-ingress.integration.test.ts`

### Commands and probes run

- `sed -n '1,220p' tickets/done/telegram-outbound-reply-lag/workflow-state.md`
- `sed -n '1,260p' tickets/done/telegram-outbound-reply-lag/api-e2e-testing.md`
- `sed -n '1,260p' tickets/done/telegram-outbound-reply-lag/investigation-notes.md`
- `sed -n '1,220p' /Users/normy/.autobyteus/server-data/external-channel/message-receipts.json`
- `sed -n '1,220p' /Users/normy/.autobyteus/server-data/external-channel/gateway-callback-outbox.json`
- `sed -n '1,220p' /Users/normy/.autobyteus/server-data/external-channel/bindings.json`
- `rg -n "109349180|109349181|109349182|109349183|109349184|SuperAgent_SuperAgent_8189" /Users/normy/.autobyteus/server-data/logs/server.log`
- `rg -n "Conflict: terminated by other getUpdates request" /Users/normy/.autobyteus/server-data/logs/messaging-gateway/stderr.log`
- `node` probes against `message-receipts.json`, `raw_traces.jsonl`, and `working_context_snapshot.json`

## Current Entrypoints And Execution Boundaries

### External-channel ingress spine

1. `ChannelIngressService.handleInboundMessage()` creates the pending receipt, resolves the binding, dispatches to the binding, records the accepted receipt, then registers it with `AcceptedReceiptRecoveryRuntime`.
2. `ChannelAgentRunFacade.dispatchToAgentBinding()` resolves or starts the run, calls `activeRun.postUserMessage(...)`, records run activity, and publishes the external user message to the live frontend stream.
3. `AcceptedReceiptRecoveryRuntime.registerAcceptedReceipt()` schedules asynchronous processing for accepted receipts.
4. `AcceptedReceiptTurnCorrelationCoordinator` subscribes to runtime `TURN_STARTED` events and binds the oldest unmatched accepted receipt for that run.
5. `ChannelAgentRunReplyBridge` publishes only after the bound turn emits `TURN_COMPLETED` and assistant text is available.

### Native AutoByteus dispatch boundary

1. `AutoByteusAgentRunBackend.postUserMessage()` calls `Agent.postUserMessage()` and returns accepted if the enqueue succeeds.
2. `Agent.postUserMessage()` submits `UserMessageReceivedEvent` to the runtime.
3. `AgentRuntime.submitEvent()` only enqueues the event; it does not wait for processing.
4. `AgentWorker` can immediately dequeue that event and emit `TURN_STARTED` while the server-side ingress path is still returning from dispatch bookkeeping.

## Runtime And Probe Findings

### 1. The real packaged-app bug is confirmed in persisted state, not just the UI

- The packaged desktop app showed the agent reply in the UI but Telegram missed the first bound reply.
- `message-receipts.json` and `gateway-callback-outbox.json` confirm the lag:
  - `update:109349181` was ultimately routed to `turn_0002`
  - `update:109349182` was ultimately routed to `turn_0003`
  - `update:109349183` was ultimately routed to `turn_0004`
- The callback outbox payloads for those message ids contain the later turn replies, matching the user’s screenshots exactly.

### 2. A pre-binding discovery inbound was also present in the same session

- `update:109349180` was stored with:
  - `ingressState = "UNBOUND"`
  - `agentRunId = null`
  - `turnId = null`
- `bindings.json` shows the Telegram binding for the same route was created only later:
  - `createdAt = 2026-04-06T18:50:07.141Z`
- Product docs already describe Telegram peer discovery as requiring a real inbound message before the user refreshes peers and saves a channel binding:
  - `autobyteus-web/README.md`
  - `autobyteus-web/docs/messaging.md`
- So this first unbound inbound is not sufficient by itself to classify the ticket regression. The durable ticket defect is what happened next: the first *bound* message still failed to receive its own reply.

### 3. The first bound native turn existed and completed, but no receipt captured it

- `raw_traces.jsonl` for `SuperAgent_SuperAgent_8189` contains `turn_0001`:
  - user trace for `hello`
  - assistant trace for `Hello! 👋 How can I help you today?...`
- `working_context_snapshot.json` also contains the same assistant reply.
- Therefore the first bound native turn was real and its final assistant text was persisted.
- The issue is not “the agent never produced reply text.” The issue is that no accepted receipt was correlated to that first bound turn.

### 4. The current late-correlation observation starts too late for the native AutoByteus timing

- `ChannelIngressService` currently calls:
  1. `runFacade.dispatchToBinding(...)`
  2. `recordAcceptedDispatch(...)`
  3. `acceptedReceiptRecoveryRuntime.registerAcceptedReceipt(...)`
- `AutoByteusAgentRunBackend.postUserMessage()` is enqueue-oriented, so it returns after the runtime enqueue succeeds, not after later correlation is armed.
- `AgentRuntime.submitEvent()` likewise only enqueues the event.
- The native worker can then dequeue the just-submitted user message and emit `TURN_STARTED` almost immediately.
- `AcceptedReceiptRecoveryRuntime.registerAcceptedReceipt()` does not start observation synchronously. It only calls `scheduleProcessing(..., 0)`, and the later `processReceipt()` path is what eventually subscribes to `TURN_STARTED`.
- That means the first `TURN_STARTED` for the just-dispatched message can occur before any turn-correlation observer is attached, even though the accepted receipt row already exists.
- Once that happens, the coordinator sees only the next `TURN_STARTED`, and the oldest unmatched receipt is then bound to the next turn instead of the just-dispatched one.

### 5. The current Stage 7 integration harness does not model the real native timing

- `tests/integration/api/rest/channel-ingress.integration.test.ts` creates the binding ahead of time.
- Its mock backend schedules runtime events via delayed timers inside `postUserMessage()`:
  - `TURN_STARTED` after `10ms`
  - `TURN_COMPLETED` after `100ms`
- That is materially different from the native AutoByteus path, where `postUserMessage()` returns immediately after enqueue and the worker may emit `TURN_STARTED` with effectively no protective delay for receipt-observer setup.
- So the current integration test closes only the delayed-mock case; it does not prove the packaged native path.

### 6. Reply-text recovery is not the primary blocker for the first bound turn

- `ChannelTurnReplyRecoveryService` reads raw traces only.
- For this real failing run, `raw_traces.jsonl` already contains the `turn_0001` assistant trace.
- So once the correct `turnId` is known, persisted reply recovery can resolve the first bound reply text.
- The primary blocker is missing exact turn correlation, not missing persisted assistant output.

### 7. Messaging-gateway Telegram polling conflict is present but is not sufficient to explain the lag pattern

- `/Users/normy/.autobyteus/server-data/logs/messaging-gateway/stderr.log` repeatedly reports:
  - `TELEGRAM_API_ERROR: Conflict: terminated by other getUpdates request; make sure that only one bot instance is running`
- That is a real environment problem and can destabilize inbound polling.
- It does not explain the one-message-behind callback correlation pattern already persisted in the receipt/outbox state.

## Current Contract Gap

The event-driven late-correlation architecture is still directionally correct, but the current implementation assumes the next exact `TURN_STARTED` will always be observed after accepted-receipt processing begins. That assumption is false in the real native AutoByteus packaged path.

The concrete gap is:

1. direct dispatch enqueues the user message,
2. the native worker emits `TURN_STARTED` immediately,
3. accepted-receipt processing arms correlation only later on an asynchronous timer,
4. the first exact `TURN_STARTED` is missed,
5. the oldest unmatched accepted receipt binds to the next turn,
6. reply publication becomes one message behind even though publication itself remains exact after the wrong binding.

## Constraints And Unknowns

- The setup-time `UNBOUND` first inbound observed in this session is likely part of the documented Telegram peer-discovery flow, not the main regression. The primary failing contract is still the first *bound* inbound message missing its own exact turn.
- No source edits are allowed yet because the ticket has re-entered Stage 1 and `workflow-state.md` remains locked.
- The existing `vitest` evidence is not enough to close this ticket without a scenario that models native same-tick `TURN_STARTED` timing.

## Design Implications

1. Live-only future observation is not sufficient for exact accepted-receipt correlation in the native AutoByteus path.
2. The corrective design must either:
   - arm exact turn capture before or during dispatch so the just-dispatched `TURN_STARTED` cannot be missed, or
   - persist enough exact external-source -> turn identity in the runtime to reconstruct the missed turn after the fact.
3. The current delayed mock backend in Stage 7 must be supplemented with a regression that models the native zero-gap dispatch timing.
4. Any separate product decision about replaying pre-binding discovery messages should stay out of the core corrective cut unless later evidence shows users are hitting a post-binding replay requirement, not just the documented discovery flow.

## Relevant Files

- `autobyteus-server-ts/src/external-channel/services/channel-ingress-service.ts`
- `autobyteus-server-ts/src/external-channel/runtime/channel-agent-run-facade.ts`
- `autobyteus-server-ts/src/external-channel/runtime/channel-binding-run-launcher.ts`
- `autobyteus-server-ts/src/external-channel/runtime/accepted-receipt-recovery-runtime.ts`
- `autobyteus-server-ts/src/external-channel/runtime/accepted-receipt-turn-correlation-coordinator.ts`
- `autobyteus-server-ts/src/external-channel/runtime/channel-agent-run-reply-bridge.ts`
- `autobyteus-server-ts/src/external-channel/services/channel-turn-reply-recovery-service.ts`
- `autobyteus-server-ts/src/api/graphql/types/external-channel-setup/resolver.ts`
- `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend.ts`
- `autobyteus-ts/src/agent/agent.ts`
- `autobyteus-ts/src/agent/runtime/agent-runtime.ts`
- `autobyteus-ts/src/agent/runtime/agent-worker.ts`
- `autobyteus-ts/src/agent/handlers/user-input-message-event-handler.ts`
- `autobyteus-ts/src/agent/input-processor/memory-ingest-input-processor.ts`
- `autobyteus-server-ts/tests/integration/api/rest/channel-ingress.integration.test.ts`

## Selected Investigation Conclusion

1. The packaged desktop regression is real and reproducible from persisted evidence.
2. The one-message-behind behavior is primarily caused by missed first-turn correlation in the native AutoByteus path, not by frontend/UI behavior.
3. The current delayed mock integration coverage is insufficient because it does not model immediate native `TURN_STARTED` timing.
4. The first unbound inbound observed in the same session aligns with the documented Telegram peer-discovery flow; the reopened regression to fix is the first *bound* message still missing its own reply.

## Stage 8 Round 10 Re-Entry Addendum

### New independent review findings

1. The reopened server fix is functionally correct under the focused Stage 7 validation, but the new owner split is not yet structurally acceptable for Stage 8.
2. `accepted-receipt-turn-correlation-coordinator.ts` is now a `542` effective non-empty-line changed source file, which violates the Stage 8 hard size gate for changed implementation files.
3. That same coordinator currently owns two different coordination responsibilities in one place:
   - long-lived observation and oldest-unmatched binding for already-accepted receipts
   - short-lived dispatch-scoped pending capture and attach/persist behavior for the first fresh turn
4. `ChannelIngressService` now imports `AcceptedDispatchTurnCapture` directly from the coordinator file while also calling `AcceptedReceiptRecoveryRuntime.prepare*DispatchTurnCapture(...)`.
5. That creates an authoritative-boundary failure: ingress depends on both the recovery-runtime boundary and one of its internal concrete mechanisms at the same time.

### Updated design implications

1. The dispatch-scoped first-turn capture idea remains directionally correct; the failing part is the current ownership split, not the functional goal.
2. The recovery-runtime boundary should be the only public owner that ingress depends on for accepted-receipt capture lifecycle.
3. The current coordinator should likely be decomposed into at least two concrete owners:
   - one owner for persistent unmatched-receipt turn observation
   - one owner for dispatch-scoped pending capture sessions
4. After that split, ingress should either:
   - depend on a recovery-runtime-owned capture-session contract, or
   - hand the whole attach/register lifecycle back to the recovery runtime so no capture-handle type leaks upward at all.

### Immediate re-entry focus

1. Rework the ownership model so the recovery runtime exposes one authoritative public boundary for dispatch-scoped capture.
2. Split the oversized coordinator below the Stage 8 hard size limit while preserving the current passing functional behavior and validation assets.
