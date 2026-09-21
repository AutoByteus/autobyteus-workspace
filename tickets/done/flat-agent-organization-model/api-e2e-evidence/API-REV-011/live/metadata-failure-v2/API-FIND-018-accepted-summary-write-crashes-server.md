# API-FIND-018 — accepted AgentOrg summary write failure terminates the server

## Classification

- API/E2E result: **Fail**.
- Scenario: `LIVE-003`.
- Requirement/design boundary: `REQ-033`, `QR-011`, `DS-027`, implementation handoff downstream scenario 5.
- Preliminary origin: **Local Fix / server implementation**, subject to Code Review failure-origin confirmation.
- Tested artifact/source: `54716ad0ffd4c4be7aab389a84d3d7e41f72ecb5` / `0d7b6e7e7bc1050a43d3681eb83b09a342537ef7`.

## Expected

After exact configured-Agent input has been accepted, a separate derived AgentOrg history-index I/O failure must be logged but must not relabel, reject, or replay the accepted Agent work. The stream must return the truthful accepted ACK and the application process must remain available. `design-spec.md:1443-1448` and `implementation-handoff.md:24,56,143` establish this boundary.

## Real execution mode

1. Started the exact production-built server from `autobyteus-server-ts/dist/app.js` on isolated port `8695` and isolated copied data.
2. Created a fresh `aorg-direct-agents-org` through the production GraphQL mutation with real Codex App Server / `gpt-5.6-sol` configuration.
3. Connected to the production `/ws/agent-org/:orgRunId` WebSocket and waited for the complete root snapshot.
4. Before the first qualifying message, renamed the isolated `memory/agent_org_run_history_index.json` to a backup and put a directory at that exact target path. This forces an exact, deterministic `EISDIR` only at the derived atomic rename boundary; no shared/user data was touched.
5. Sent a real `SEND_MESSAGE` to the configured `/lead` Agent and retained the ACK, socket close, server stderr/exit and post-ACK reachability.
6. Restored the exact original index in `finally`; all three SHA-256 values match.

The scenario was reproduced twice. The second run was narrowed to persist the ACK before performing any post-ACK request.

## Observed correlated boundary

- Root: `aorg_e2e_direct_agents_org_0a64574e17fc47c292357226f0efdf96`.
- Exact Agent: `/lead` / `aorg_e2e_lead_133fc67ed0844d589192c4eae4c5bb42`.
- `00:18:08.643Z`: production WebSocket returned `AGENT_COMMAND_ACK`, `command_type=SEND_MESSAGE`, `state=accepted`, `code=null`.
- The server logged `Accepted AgentOrg input history summary commit failed ... EISDIR`, proving the handler's local `try/catch` ran.
- The same rejected `atomicWriteJsonFile` operation then escaped through Node's unhandled-promise path.
- `00:18:08.659Z`: the browser-protocol client received abnormal close `1006`—16 ms after the accepted ACK.
- The server process exited `1`; post-ACK HTTP reachability was false and port `8695` was no longer listening.
- The first reproduction likewise logged the caught failure and uncaught copy, terminated the process and reset the post-ACK history request.

## Source correlation for focused review

`agent-org-stream-handler.ts:154-167` correctly awaits and catches `recordRunActivity`, then sends accepted ACK. The shared writer creates `next`, but stores a distinct `next.finally(...)` promise in `pathQueues` while returning only `next`:

```ts
const next = previous.then(...);
pathQueues.set(resolvedPath, next.finally(() => {
  if (pathQueues.get(resolvedPath) === next) {
    pathQueues.delete(resolvedPath);
  }
}));
return next;
```

The handler catches rejection of returned `next`; the separately stored `finally`-derived promise rejects without a consumer. Its identity can also never equal `next`, so the cleanup predicate cannot remove the stored entry. This exactly matches the duplicate caught/uncaught error and process termination. Code Review should confirm final ownership and ensure any correction preserves serialization, failure propagation to the caller, queue cleanup, and absence of unhandled rejection.

## Evidence

- `accepted-ack-rerun.json` — ACK persisted immediately after receipt.
- `probe-rerun-result.json` — ACK, abnormal close, health failure and restored-index facts.
- `probe-rerun.log` — concise correlated result.
- `server-rerun.log` — second exact reproduction, caught error followed by Node unhandled rejection and exit.
- `server.log` and `server-failure-excerpt.log` — first exact reproduction.
- `probe-rerun.mjs` — retained evidence-only production GraphQL/WebSocket probe.
- `index-before-rerun.json`, `index-restored-rerun.json`, `index-restore-sha256.log` — cleanup/source-data immutability.
- Source: `autobyteus-server-ts/src/services/agent-streaming/agent-org-stream-handler.ts:154-167` and `autobyteus-server-ts/src/run-history/store/atomic-json-file-writer.ts:33-51`.

## Scope and fail-fast disposition

All repository coverage, real direct/mounted first-title behavior, exclusion/concurrent winner coverage, and migration matrix passed before this failure. `LIVE-004` and the current-artifact cumulative `LIVE-005` rerun are **Not Tested** under fail-fast; prior `API-REV-010` material passes remain historical evidence only. All owned browser/server/renderer resources were closed after capture.
