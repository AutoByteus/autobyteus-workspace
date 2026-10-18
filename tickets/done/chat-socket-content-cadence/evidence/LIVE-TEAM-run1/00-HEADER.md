# LIVE-TEAM run 1 — evidence header

- Case: LIVE-TEAM (run 1 of 2)
- Command (from the worktree root): `node tickets/in-progress/chat-socket-content-cadence/evidence/live-sequenced-probe.mjs --server-dir autobyteus-server-ts --out tickets/in-progress/chat-socket-content-cadence/evidence/live-team --scenario team` (folder renamed to LIVE-TEAM-run1 afterwards)
- Commit: `e24ff6b333` (built `autobyteus-server-ts/dist` from `test:integration:prepare`)
- Environment: ENV-2: macOS 26.5.2 arm64, Node v22.23.1, built server with a clean env, temp data root, LM Studio `qwen/qwen3.6-35b-a3b:lmstudio@127.0.0.1:1234`, interval default 500 ms
- Date: 2026-10-18 ~13:01–13:12 local
- Files: `frames-S1.jsonl` (first socket, from the start), `frames-S2.jsonl` (second socket opened mid-stream), `summary.json` (computed analysis), `batches-S1.json` (every batch frame with range/items/closing frame), `server.log`, `probe-output.log` (marks + brief result)
- Outcome: the probe ended with `Timed out: both turns done` because member alpha's model reasoned for >600 s (one 88,285-character reasoning segment). Beta finished its turn. The run was then terminated. No final-text projection check happened in this run (see run 2).
