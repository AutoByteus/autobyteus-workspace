# Investigation Notes

## Investigation Meta

- Package identifier: `agy-background-task-turn-liveness`
- Owner: Solution Designer (`/solution_designer`)
- Date: 2026-09-28
- Task worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-background-task-turn-liveness`
- Branch: `codex/agy-background-task-turn-liveness`
- Base: `origin/personal` @ `e6c16d801` (fetched 2026-09-28; tracked default/integration branch of the superrepo)
- Finalization target: `personal`
- Investigation also used (read-only): the installed Electron app (`/Applications/AutoByteus.app`, server `--port 29695`, data dir `/Users/normy/.autobyteus/server-data`) and the local `personal` checkout at `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`. The local checkout is 6 commits behind `origin/personal`; all code facts below were re-verified in the task worktree.

## Initial Request And Clarifications

1. User report: while an AutoByteus Org ran, the Product Team's `product_prototyper` member (runtime: Antigravity CLI / AGY) issued many `run_command` / `manage_task` calls, then errored with an Antigravity runtime error; afterwards the member and the Org could no longer be used.
2. User clarified the order: AGY runtime error first, then the user clicked Terminate, then sent another message (which failed with `AgentOrg '…' is already active`).
3. User direction: fix the first problem first — starting a long-running bash command and continuing is normal agent behavior and must not break the runtime; design must stay simple, not over-engineered; learn from how the other runtimes behave.
4. User asked how AGY background tasks and `manage_task` work, including how AGY learns a task finished (comparison: Claude Agent SDK sends a task notification).
5. User approved the proposed direction ("Please go ahead. I approve.", 2026-09-28).

## Product And Domain Understanding

- AGY runs headless as `agy … --input-format stream-json --output-format stream-json`; AutoByteus converts AGY `step_update` / `result` NDJSON into canonical `AgentRunEvent`s.
- A normal agent workflow is: start a dev server in the background, keep working (edit, build, capture screenshots), hand off.

## Source Log

| Source | What it showed |
| --- | --- |
| `/Users/normy/.autobyteus/server-data/memory/agent_orgs/autobyteus_org_fe601b09441f43c4bc25af4ae22f1193/product_team_81010b23eaab4e41b373a91a57930520/product_prototyper_8f61d3a241f344689c868d03de1b74ef/raw_traces_active.jsonl` | AutoByteus-side trace; last tool call seq 114 `run_command {"CommandLine":"pnpm dev"}` at ts 1790620227.8; seq 115 `TURN_INTERRUPTED` at ts 1790620527.8 (exactly 300.0 s later); no provider events in between. |
| `~/.gemini/antigravity-cli/brain/1c1ebd06-b303-4fd1-84a2-c27e25b1e8df/.system_generated/logs/transcript_full.jsonl` | AGY's own transcript: step 115 `run_command` args `{"CommandLine":"pnpm dev","IsDaemon":true,"WaitMsBeforeAsync":3000}`; step 116 status `RUNNING` "Tool is running as a background task with task id …/task-116"; model continued with steps 117–223 until 20:35:26 local. |
| same brain folder `.system_generated/tasks/task-58.log`, `task-116.log`, `task-164.log` | Background task logs; task-116 shows Vite HMR updates at 20:31:55 (dev server alive and in use). |
| same brain folder `.system_generated/messages/*.json` | Background-task notifications to the conversation inbox: "Command may require input" (output stabilized 5 s) and "… finished with result: exit code …". |
| `autobyteus-server-ts/src/agent-execution/backends/antigravity/stream/agy-stream-process.ts` | `TURN_IDLE_TIMEOUT_MS = 300_000`; timer armed on `sendUserMessage`, reset on every non-`result` message, cleared on `result`; on expiry `fail(new Error("AGY_TURN_IDLE_TIMEOUT: no provider event for five minutes."))` → closes listeners and `SIGTERM`s the AGY process. |
| `autobyteus-server-ts/src/agent-execution/backends/antigravity/backend/agy-agent-run-backend.ts` | `handleClose` during an active turn emits `ERROR` `AGY_PROCESS_ERROR` "Antigravity runtime stopped unexpectedly." + `TURN_INTERRUPTED`, marks the backend inactive (run offline). |
| `autobyteus-server-ts/src/agent-execution/backends/antigravity/stream/agy-stream-event-converter.ts` | Tracks `toolStarts`/`toolTerminals`; `result` closes open text segments only — a tool step that started but never reached `DONE`/`ERROR` is left open. |
| `autobyteus-server-ts/src/agent-memory/services/runtime-tool-trace-sequencer.ts` | `completeTurn` leaves a persisted tool call without a result open; `interruptTurn` writes "Tool execution interrupted.". |
| Other backends (`codex`, `claude`, `grok`/`acp`, `autobyteus`) | No mid-turn idle kill in Codex/Claude/AutoByteus; timeouts only for startup readiness (Codex 60 s, Grok MCP 15 s) or approval waits (Claude 120 s). Exception: ACP has `ACP_TURN_IDLE_TIMEOUT_MS = 300_000` (out of scope; see Risks). |
| `git log -S TURN_IDLE_TIMEOUT_MS` | Introduced in `03bf9a370 Implement AGY runtime baseline…`; no recorded rationale in tickets/docs. |
| `tickets/done/llm-runtime-real-compaction/*` | Precedent: a 5-minute transport idle timeout killed legitimate long LM Studio/Ollama work; fix was to stop treating silence as failure. |
| Live GraphQL on port 29695 (read-only) | `getAgentOrgRunConfig.isActive = true` vs `getAgentOrgRunInspection.root_org.is_active = false` for the stuck Org (secondary Terminate defect; out of scope here). |

## Relevant Existing Behavior And Supported Product Paths

- CUR-1: AGY `run_command` waits `WaitMsBeforeAsync`; if the command is still running it becomes a background task and the model continues. (AGY transcript steps 57–58, 115–116.)
- CUR-2: AGY's stream-json emits step updates strictly in step order; steps after a still-`RUNNING` step are withheld until that step finishes or the turn ends. (Probe P1, P2.)
- CUR-3: AutoByteus kills the AGY process after 300 s without a provider stream event during a turn, even though AGY is alive and working. (Incident trace; `agy-stream-process.ts`.)
- CUR-4: A daemon (`IsDaemon: true`) step never reaches `DONE` in the stream; the turn still ends (`result`) when the model finishes, with the daemon still running. AutoByteus then leaves that tool invocation open (spinner; tool call without result in memory). (Probe P1; converter code.)
- CUR-5: A non-daemon background task holds the AGY turn open until it finishes; AGY injects a `system_message` step (task finished) into the same turn; the model reacts; then `result`. No provider event arrives outside a turn. (Probe P2.)
- CUR-6: When the AGY process is stopped, its background tasks do not survive (no listener on 5188 / 5199 after the incident and after probes).

## Relevant Codebase And Technical Facts

- Startup has a separate 60 s `AGY_STARTUP_TIMEOUT` (unaffected).
- Process death, stream protocol violations (`AGY_STREAM_*`), line-size overflow and stdin write failures already fail the run independently of the idle timer.
- Converter `interrupt()` is used by user Stop and process death paths; not changed.
- `provider_state` is consumed outside the AGY backend only to classify `denied` results (`raw-trace-to-historical-replay-events.ts:96`, `runtime-tool-trace-sequencer.ts:149`, `autobyteus-web/services/runHydration/runProjectionConversation.ts:164`); a new `"RUNNING"` value on a SUCCEEDED result is not interpreted there.

## Structural And Payload Surface Inventory

### Payload Or Content Surfaces

- `TOOL_EXECUTION_SUCCEEDED` payload `{ turn_id, invocation_id, tool_name, arguments, result: { provider_state, output }, provider_state }` — reused, with `provider_state: "RUNNING"` and a fixed output text for backgrounded steps.

### Structural Surfaces

- `AgyStreamProcess` (process owner) and `AgyStreamEventConverter` (event projection owner). No new files, owners or contracts.

### Potential Structural Impacts To Investigate

- None beyond the two owners above.

## Runtime, Probe, Or Reproduction Findings

Probe scripts are preserved in `probes/` (agy 1.2.12, model `gemini-3.8-flash-high`, same stream flags as production).

- P1 `probes/agy-daemon-stream-order-probe.py`: start `python3 -m http.server 5199` as a daemon, then `echo`, `sleep 5 && echo`, write file. Result: step 2 `ACTIVE` at 7.1 s, never `DONE`; steps 4/6/8 each `ACTIVE`+`DONE` all at 25.0 s (the 5 s sleep "started and finished" in the same instant); `RESULT SUCCESS` at 25.0 s with the server still running. Proves in-order withholding and daemon step never closing.
- P2 `probes/agy-background-task-turn-end-probe.py`: `sleep 30 && echo FINISHED_MARKER` backgrounded with `WaitMsBeforeAsync 1000`, model told to end the turn immediately. Result: step 2 `ACTIVE` 6.9 s → `DONE` 36.9 s; model text "STARTED" (written at 6.9 s per AGY transcript) delivered at 36.9 s; step 4 `system_message` at 37.0 s; model reaction step 5; `RESULT SUCCESS` at 39.3 s. Proves AGY keeps the turn open for non-daemon background tasks and delivers completion inside the same turn.
- No orphaned processes after either probe.

## Stakeholder And User Evidence

- User statements in Initial Request And Clarifications; approval reference in `requirements-doc.md`.

## External Contracts, Standards, And Dependencies

- AGY CLI 1.2.12 stream-json behavior (CUR-2, CUR-4, CUR-5) is observed, undocumented provider behavior. The in-order withholding is an AGY limitation outside AutoByteus control.

## Persisted Data And State Facts

- Memory traces (`raw_traces_active.jsonl`) record tool results; the change only adds a result for previously dangling daemon tool calls in new turns. No schema change, no migration.

## Product Design Request Context

N/A — not applicable.

## Product Design Findings

N/A — not applicable.

## Supplemental Artifact Inventory

| Path | Purpose | Owner | Related IDs | Status |
| --- | --- | --- | --- | --- |
| `probes/agy-daemon-stream-order-probe.py` | Reproduces P1 (daemon + in-order withholding) against real AGY | Solution Designer | CUR-2, CUR-4, AC-002, AC-003 | Evidence; reusable by API/E2E |
| `probes/agy-background-task-turn-end-probe.py` | Reproduces P2 (non-daemon background task holds turn; in-turn notification) | Solution Designer | CUR-5, AC-004 | Evidence; reusable by API/E2E |

## Assumptions, Unknowns, And Risks

- AGY stream behavior may change in future CLI versions; the design relies only on `result` ending the turn and on process liveness, which are stable parts of the headless contract.
- ACP/Grok backend has the same 5-minute idle kill; not probed; separate-ticket candidate.
- Secondary defect (Org Terminate with an already-dead member leaves the Org registered but inactive; restore then fails "already active") is real and independent; separate-ticket candidate (Ticket B), not in this package.

## Architecture Investigation Findings

- The idle timer is fully contained in `AgyStreamProcess` (field, two helpers, three call sites). Removing it does not affect startup, close, protocol or stdin failure handling.
- The converter already has per-turn `toolStarts`/`toolTerminals`; it lacks the per-step name/arguments needed to emit a terminal event for an unfinished step at `result`. A small per-turn map of open-step payloads closes that gap.
- Both `result` branches (success and non-success) end the provider turn; an unfinished tool step at either point is, factually, still running in AGY.

## Requirement Implications

- None beyond the approved requirements; no requirement gap found during architecture investigation.

## Notes For Architecture Design

- Keep changes inside the two AGY stream owners; no platform, UI or contract changes.
