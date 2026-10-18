# LIVE-COLLAB run 1 — evidence header

- Case: LIVE-COLLAB (run 1)
- Command (from the worktree root): `node tickets/in-progress/chat-socket-content-cadence/evidence/live-sequenced-probe.mjs --server-dir autobyteus-server-ts --out …/LIVE-COLLAB --scenario collab --prompt-prefix "/no_think "` (folder renamed to LIVE-COLLAB-run1)
- Commit: `e24ff6b333`; Environment: ENV-2; Date: 2026-10-18 ~13:24–13:27 local
- Journey: standalone PM (qwen, `list_available_agents`) on `/ws/agent/<pm>`. Socket S1 = `/ws/agent-collaboration/<pm>`. The PM calls `list_available_agents`, then `delegate_task` twice in one response to `/abt139_essay_worker` (topics: lighthouses, tides). Both children stream. After both turns: both children messaged at once over S1 (`SEND_MESSAGE`, `root_subject_kind agent`, `target_agent_run_id`). 8 s into streaming: `terminateAgentRun(<pm>)` (Stop mid-answer).
- Result: 0 gaps; 25 two-child batches; tail batch at the same ms as ROOT_LIFECYCLE inactive, 0 frames after. Child 2 wrote its essay into a `send_message_to` tool call (a 1,834-char `tool_call` segment, batched too). Final text was not checked: `getRunProjection` cannot read root-hosted children ("Run package … is unavailable"), so run 2 reads `agentRunCollaborationMemberProjection`.
- Files: `frames-S1.jsonl`, `frames-PM.jsonl` (the PM's `/ws/agent` socket), `summary.json`, `batches-S1.json`, `unk001-status-windows-S1.txt`, `server.log`, `probe-output.log`
