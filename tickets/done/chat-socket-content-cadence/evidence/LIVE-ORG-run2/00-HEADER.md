# LIVE-ORG run 2 — evidence header

- Case: LIVE-ORG (run 2; run 1 in `../LIVE-ORG-run1` had the same results, but only a containment text check)
- Command (from the worktree root): `node tickets/in-progress/chat-socket-content-cadence/evidence/live-sequenced-probe.mjs --server-dir autobyteus-server-ts --out tickets/in-progress/chat-socket-content-cadence/evidence/LIVE-ORG-run2 --scenario org --prompt-prefix "/no_think "`
- Commit: `e24ff6b333`; Environment: ENV-2 (built server, clean env, temp root, LM Studio qwen3.6-35b-a3b, interval 500 ms → 1000 ms mid-stream)
- Date: 2026-10-18 ~13:17 local
- Journey: Org with direct members alpha and beta (`refType AGENT`). S1 = `/ws/agent-org/<orgRunId>`. Both members messaged at once (`SEND_MESSAGE` with `root_subject_kind agent_org`, `target_agent_run_id`). 4 s after both stream: `updateServerSetting(AUTOBYTEUS_STREAMING_CONTENT_FLUSH_INTERVAL_MS, 1000)`. 8 s later: `terminateAgentOrgRun` (Stop mid-answer). Then `getAgentOrgMemberRunProjection` for each member.
- Files: `frames-S1.jsonl`, `summary.json`, `batches-S1.json`, `projections.json`, `final-text-check.txt`, `interval-and-stop-check.txt`, `unk001-status-windows-S1.txt`, `server.log`, `probe-output.log`
