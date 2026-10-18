# LIVE-COLLAB run 1 — evidence header

- Case: LIVE-COLLAB (run 2; final-text equality run)
- Command (from the worktree root): `node tickets/in-progress/chat-socket-content-cadence/evidence/live-sequenced-probe.mjs --server-dir autobyteus-server-ts --out …/LIVE-COLLAB-run2 --scenario collab --prompt-prefix "/no_think "`
- Commit: `e24ff6b333`; Environment: ENV-2; Date: 2026-10-18 ~13:29–13:31 local
- Journey: standalone PM (qwen, `list_available_agents`) on `/ws/agent/<pm>`. Socket S1 = `/ws/agent-collaboration/<pm>`. The PM calls `list_available_agents`, then `delegate_task` twice in one response to `/abt139_essay_worker` (topics: lighthouses, tides). Both children stream. After both turns: both children messaged at once over S1 (`SEND_MESSAGE`, `root_subject_kind agent`, `target_agent_run_id`). 8 s into streaming: `terminateAgentRun(<pm>)` (Stop mid-answer).
- Files: `frames-S1.jsonl`, `frames-PM.jsonl` (the PM's `/ws/agent` socket), `summary.json`, `batches-S1.json`, `unk001-status-windows-S1.txt`, `server.log`, `probe-output.log`
- Result: see the report's LIVE-COLLAB row; `final-text-check.txt` compares the socket text with `agentRunCollaborationMemberProjection` read after the Stop. Files also include `projections.json` and `final-text-check.txt`.
