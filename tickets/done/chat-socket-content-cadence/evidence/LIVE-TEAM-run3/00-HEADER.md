# LIVE-TEAM run 2 — evidence header

- Case: LIVE-TEAM (run 3; final-text equality run (projections saved))
- Command (from the worktree root): `node tickets/in-progress/chat-socket-content-cadence/evidence/live-sequenced-probe.mjs --server-dir autobyteus-server-ts --out tickets/in-progress/chat-socket-content-cadence/evidence/LIVE-TEAM-run3 --scenario team --prompt-prefix "/no_think " --llm-config '{"max_tokens":3000}'`
- Commit: `e24ff6b333` (built `autobyteus-server-ts/dist` from `test:integration:prepare`)
- Environment: ENV-2 (built server, clean env, temp data root, LM Studio `qwen/qwen3.6-35b-a3b:lmstudio@127.0.0.1:1234`, interval default 500 ms). `/no_think` did not stop the model's reasoning segments; `max_tokens` bounded the turns.
- Date: 2026-10-18 ~13:20 local
- Journey: Team with members alpha and beta (native runtime). Both are messaged at once over `/ws/agent-team` (`SEND_MESSAGE` with `agent_run_id`). Socket S1 is open from the start; socket S2 opens 3 s after both stream (reconnect). After both turns complete, the probe reads `getTeamMemberRunProjection` for each member and compares the streamed text.
- Files: `frames-S1.jsonl`, `frames-S2.jsonl`, `summary.json`, `projections.json`, `final-text-check.txt`, `batches-S1.json`, `unk001-status-windows-S{1,2}.txt`, `server.log`, `probe-output.log`
