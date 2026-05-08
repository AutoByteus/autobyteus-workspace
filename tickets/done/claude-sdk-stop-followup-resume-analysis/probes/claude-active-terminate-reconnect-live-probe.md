# Probe: Claude active terminate -> restore -> reconnect -> continue

## Purpose

The user clarified the failing case is frontend row-level **Terminate run**, not chat Stop/interrupt. Existing E2E coverage only proved terminate/restore after an idle turn. This probe temporarily inserted a live-gated test into `autobyteus-server-ts/tests/e2e/runtime/agent-runtime-graphql.e2e.test.ts` to exercise terminating while Claude was active and awaiting tool approval, then restoring, reconnecting, and sending a follow-up.

The temporary source edit was reverted after running; this file records the durable investigation result.

## Temporary test shape

Inside `defineRuntimeSuite`, after the existing `creates a run, restores it...` test:

1. Create a Claude SDK agent run with `autoExecuteTools: false` and `write_file` enabled.
2. Open `/ws/agent/:runId`.
3. Send a prompt that forces a real `write_file` tool call.
4. Wait for `TOOL_APPROVAL_REQUESTED` so the run is active and a tool approval/control response is pending.
5. Call GraphQL `TerminateAgentRun`.
6. Close the first WebSocket/app to match frontend local stream teardown.
7. Call GraphQL `RestoreAgentRun`.
8. Open a new WebSocket.
9. Send a simple exact-token follow-up and wait for streamed assistant text and `AGENT_STATUS IDLE`.

## Command

```bash
RUN_CLAUDE_E2E=1 pnpm --dir autobyteus-server-ts exec vitest run \
  tests/e2e/runtime/agent-runtime-graphql.e2e.test.ts \
  -t "terminates an active tool-approval run, restores it, reconnects, and continues streaming" \
  --reporter=verbose
```

## Result

- The follow-up after restore/reconnect streamed successfully.
- The Vitest run still failed because it caught an unhandled rejection from the Claude Agent SDK:

```text
Unhandled Rejection
Error: Operation aborted
  at .../@anthropic-ai/claude-agent-sdk/sdk.mjs ...
```

## Interpretation

The frontend and GraphQL restore/send path are not the primary defect. The terminate-specific Claude backend path aborts/closes an active SDK query while a tool approval/control callback is settling. The interrupt path does not show this issue because `ClaudeSession.interrupt()` clears pending approvals, flushes the denial response, aborts/closes the active query, and awaits turn settlement in the right order.
