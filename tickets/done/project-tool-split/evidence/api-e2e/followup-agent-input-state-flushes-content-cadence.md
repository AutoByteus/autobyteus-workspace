# Follow-up: AGENT_INPUT_STATE flushes the WebSocket content cadence window (product defect)

Found during project-tool-split API/E2E (2026-10-17). Not caused by that ticket; outside its scope.

## Symptom

`autobyteus-server-ts/tests/integration/agent/agent-status-websocket.integration.test.ts`, 2 of 7 cases fail on
every run (they were listed in TESTING.md as a "known baseline exception" without a cause):

- `coalesces a representative fine-grained canonical stream into one default-window content frame`
- `uses a changed interval only for the active socket's next newly opened window`

Both fail with `expected [ { type: 'SEGMENT_CONTENT', … } ] to have a length of +0 but got 1`. The coalesced content
frame reaches the socket about 15 ms after the burst instead of after the 500 ms window.

## Cause (traced)

- `AgentRun` (`src/agent-execution/domain/agent-run.ts`, `onCanonicalEventsDispatched` → `publishInputState()`, added in
  `6908ccff48`, 2026-09-30, held-input recovery) dispatches an `AGENT_INPUT_STATE` event after **every** dispatched
  canonical batch, whether or not the input state changed.
- `AgentStreamContentCadenceScheduler` (`src/services/agent-streaming/websocket-egress/agent-stream-content-cadence-scheduler.ts`,
  from `3b5144a0be`, 2026-08-06, server-side response cadence) classifies every message that is not content and not in
  `SAFE_COMPANION_TYPES` (`AGENT_COMMAND_ACK`, `CONNECTED`, `TOKEN_USAGE_UPDATED`) as `FLUSH_THEN_FORWARD`.
  `AGENT_INPUT_STATE` is not in that set, so each one flushes the pending content immediately.
- Verified with a temporary stack trace in `flush()`. The timer was set to 500 ms. The flush came from `accept()` ←
  `AgentStreamWebSocketEgress.send` ← `AgentStreamHandler.forwardRunEvent` ← `AgentRun.publishInputState`.
- Effect in production: a real runtime streams each delta as its own batch, so the server-side 500 ms content cadence
  never coalesces anything. The test's `captureMessages` drops `AGENT_INPUT_STATE` frames, which hides the trigger.

## Fix options for the owner (product decision)

1. Treat `AGENT_INPUT_STATE` as a safe companion (`FORWARD_WITHOUT_FLUSH`), if its order relative to content does not
   matter to the client.
2. Publish `AGENT_INPUT_STATE` only when its signature or revision changes (`inputStateEvent` already computes the
   signature).

Either way, the two integration cases are the regression proof. TESTING.md no longer lists them as an accepted
exception, so they will fail until this is fixed.

## Evidence

- `integration-agent-status-websocket.log` (current failure, 2 failed / 5 passed)
