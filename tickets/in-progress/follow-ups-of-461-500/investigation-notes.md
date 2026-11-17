# Investigation Notes: follow-ups-of-461-500

## Bootstrap

- Task: `autobyteus-500`, read with `get_project_task` on 2026-11-17. Context file: `source-follow-ups-461.md` (copied from the Task's context).
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/follow-ups-of-461-500`. Branch: `codex/follow-ups-of-461-500`. Base: `origin/personal` at `e4f4b3e176` (461's delivery). Finalization target: `personal`.
- Authorities read: the `solution-designer` skill; `references/requirements-engineering.md` (phase 1 gate); the Solution Designer's lessons (`reflections/lessons.md`: re-walk changed spines; read the code behind every premise).

## Sources inventory

| Source | Purpose |
| --- | --- |
| `source-follow-ups-461.md` | The 22 follow-up rows, with their evidence and suggested handling |
| `tickets/done/delegated-copies-outlive-delegator-461/` (on `personal`) | 461's design, contract, evidence |

## Findings

- **FU-019:** 20 web files use `transient_execution` / `RunHistoryTransientExecutionRow` / `transientKind` (grep, 2026-11-17), including `WorkspaceTransientExecutionRow.vue`, `runTreeDisplayRows.ts`, `mobileRunListRows.ts` and `useTaskWorkerTasks.ts`.
- **FU-020:** final attachments already live in the child's own folder. `context-file-owner-resolver.ts:80-97` resolves `agent_collaboration_member_final` to the child's location by `agentRunId`, and only checks that the host is admitted. The link format is in `context-file-owner-types.ts:188-189`. Read-only count on `~/.autobyteus/server-data/memory`: 425 host-scoped links in 143 files, in 84 run folders; 1 draft under `draft_context_files/agent-collaborations`.
- **FU-002:** `standalone-agent-run-root.ts` 323 lines, `standalone-agent-run-root-manager.ts` 429 lines: already under the limit. The project's documents state no 500-line rule. Other server files over 500 lines exist (for example `delegation-index.ts` 548, `agent-stream-handler.ts` 508), noted only.
- **FU-007:** 29 uses of `agentRunResources` / `executionResources` in `src/projects`.
- **FU-035:** `grok-build-tool-projection.ts:37` falls back to "Tool execution failed." when the snapshot carries no `error`, `message`, `output_for_prompt` or content. `agent-tool-mcp-tool-executor.ts:103` has the server's own error message. Whether the model sees the server's text inside the Grok CLI is unknown: to reproduce with a live run.
- **FU-036:** `api/websocket/agent.ts`: `attachRootStream` attaches its listener after `connect`; `attachRunStream` answers `SESSION_NOT_READY` (per the follow-up row; to re-read in design).
