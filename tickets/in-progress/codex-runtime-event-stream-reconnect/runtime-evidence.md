# Runtime Evidence: Codex Retry Misclassified As Terminal

## Artifact Metadata

- Canonical path: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-event-stream-reconnect/tickets/in-progress/codex-runtime-event-stream-reconnect/runtime-evidence.md`
- Type: Investigation evidence supplement
- Status: `Complete`
- Approval applicability: `N/A` — this artifact records observed evidence and does not define intended product behavior.
- Supports: `requirements.md`, `investigation-notes.md`, and `design-spec.md`
- Related behavior / requirement / acceptance IDs: `BEH-001`, `BEH-002`, `BEH-003`, `REQ-001` through `REQ-005`, `AC-001` through `AC-005`

## Identified Production Run

The screenshot title `Codex - 1FC3` resolves to the retained standalone run whose id ends in `1fc3`:

| Field | Value |
| --- | --- |
| AutoByteus run id | `codex_45ce1b9e80ea42db869dc86615d51fc3` |
| Runtime kind | `codex_app_server` |
| Model | `gpt-5.6-sol` |
| Reasoning effort | `xhigh` |
| Codex thread id | `01a038c4-03c6-7a83-80cb-10a99331ae18` |
| Working directory | `/Users/normy/autobyteus_org/autobyteus_mcps` |
| Reported turn id | `01a061ea-d7b6-7123-99c5-a19070bfa97e` |
| User input | `open the droplet 3x ui again for me` |
| Installed Codex CLI | `codex-cli 0.152.1` |

Source: `/Users/normy/.autobyteus/server-data/memory/agents/codex_45ce1b9e80ea42db869dc86615d51fc3/run_metadata.json`, the retained run index, process inspection, and the Codex rollout named below.

## Evidence Timeline

Times are UTC on 2026-09-02; local time is UTC+02:00.

| Time | Source | Evidence |
| --- | --- | --- |
| 11:39:35.758 | Codex rollout | Turn `01a061ea-...` starts. |
| 11:39:40.698 | Codex SQLite log | Response WebSocket stream disconnect; Codex logs that it is retrying sampling request `1/5`. |
| 11:39:45.134 | Codex SQLite log | Same turn retries `2/5`. |
| 11:39:49.967 | Codex SQLite log | Same turn retries `3/5`. |
| 11:39:54.615 | Codex SQLite log | Same turn retries `4/5`. |
| 11:40:00.390 | Codex SQLite log | Same turn retries `5/5`. |
| 11:40:13.071 | Codex SQLite log | Sampling continues over the Responses HTTP path after the WebSocket retry sequence. |
| 11:40:17.710 | Codex rollout | Codex emits reasoning for the same turn. |
| 11:40:21.448–11:40:21.715 | Codex rollout | Codex invokes and completes the command that opens the UI. |
| 11:40:28.482–11:40:32.903 | Codex rollout | Codex verifies the local tunnel; the command succeeds and reports it reachable. |
| 11:40:42.244 | Codex rollout | Codex emits the assistant answer: the Droplet 3x-ui was opened and the local tunnel is reachable. |
| 11:40:42.303 | Codex rollout | Codex emits `task_complete` for the same turn. |

The five retry records came from `/Users/normy/.codex/logs_2.sqlite`, table `logs`, target `codex_core::responses_retry`, filtered by the exact thread and time window. The successful continuation came from `/Users/normy/.codex/sessions/2026/08/25/rollout-2026-08-25T13-52-45-01a038c4-03c6-7a83-80cb-10a99331ae18.jsonl`.

## AutoByteus Projection Divergence

The AutoByteus application-owned replay trace is:

`/Users/normy/.autobyteus/server-data/memory/agents/codex_45ce1b9e80ea42db869dc86615d51fc3/raw_traces_active.jsonl`

At investigation time it contained 155 records (158,455 bytes). For turn `01a061ea-d7b6-7123-99c5-a19070bfa97e`, it contained exactly one record, the user input at line 155. It contained none of the later reasoning, tool, assistant, or completion records proven by the Codex rollout.

The AutoByteus server log also contains repeated rejections for the same run such as:

```text
[CodexSegmentTurnAdmissionRejected] {
  runtimeKind: 'codex_app_server',
  runId: 'codex_45ce1b9e80ea42db869dc86615d51fc3',
  nativeEventName: 'item/agentMessage/delta',
  reasonCode: 'CODEX_SEGMENT_TURN_INACTIVE'
}
```

The same log records successful AutoByteus agent WebSocket attachment/session creation for this run. Together with the upstream retry logs, this rules out the visible `Reconnecting... n/5` text being an AutoByteus browser-to-server WebSocket reconnect indicator. It is a Codex provider-stream retry diagnostic.

## Upstream Protocol Contract

The installed production CLI generated its TypeScript app-server protocol with:

```bash
/Users/normy/.codex/packages/standalone/releases/0.152.1-aarch64-apple-darwin/bin/codex \
  app-server generate-ts --experimental --out /tmp/codex-schema-4B1gQo
```

The generated v2 contract defines:

```ts
export type ErrorNotification = {
  error: TurnError,
  willRetry: boolean,
  threadId: string,
  turnId: string,
};
```

`TurnError` includes `message`, `codexErrorInfo`, `additionalDetails`, and `misalignment`. `CodexErrorInfo` explicitly includes provider-stream conditions such as `responseStreamConnectionFailed`, `responseStreamDisconnected`, and `responseTooManyFailedAttempts`.

The generated files were disposable verification output and are not authoritative task artifacts. Contract hashes captured during investigation:

- `ErrorNotification.ts`: `f30701035a45042495c0cbf41d4002f9e1a2c2b8c41bd4762ed6588338c6d5e1`
- `TurnError.ts`: `8ffd5f469dc6c3074d983bcacc3b26fc1582e558d101b0f7d5ba3b57f720719e`

## Fault Localization

The failure is local to the AutoByteus Codex adapter:

1. `codex-thread-notification-handler.ts` receives every native Codex `error` notification.
2. It ignores `willRetry` and, whenever it can resolve a turn id, unconditionally calls `markTurnFailed` and rewrites the event as `error_effect: "terminal"`.
3. `CodexThread.markTurnFailed` changes the thread to `ERROR`, clears `activeTurnId`, and clears pending MCP-call correlation.
4. `codex-thread-lifecycle-event-converter.ts` also treats every Codex error as a terminal structural boundary by closing all reasoning blocks and clearing all ordered-tool correlation.
5. Subsequent Codex item/message events for the still-running turn reach segment admission with no active turn, are rejected as `CODEX_SEGMENT_TURN_INACTIVE`, and never enter the application replay trace or UI projection.
6. Common AgentRun lifecycle and frontend projection code supports a same-turn `error_effect: "diagnostic"` without completing the turn, so generic reconnect/replay remains outside the defect.
7. Architecture review of the complete late-turn path found a distinct `BEH-003` consequence in current source: a terminal/completion event for retired A is still streamed while B is active; canonical lifecycle preserves B, but frontend terminal handlers ignore A's `turn_id` and complete the latest B response. This makes pre-canonical stale-boundary containment part of the Codex-local correction rather than a shared frontend redesign.

## Conclusion

Codex recovered exactly as designed: after five response-WebSocket retries it continued over HTTP, executed the requested actions, emitted an assistant answer, and completed the turn. AutoByteus falsely terminalized the turn on Codex's retryable native error notification. The production fix belongs at the Codex native-notification classification/emission boundary and lifecycle-conversion boundary: classify retry diagnostics correctly, contain an explicitly stale turn terminal before canonical projection, and keep cleanup identity-scoped. It does not belong in generic WebSocket reconnection or the model/tool runtime.
