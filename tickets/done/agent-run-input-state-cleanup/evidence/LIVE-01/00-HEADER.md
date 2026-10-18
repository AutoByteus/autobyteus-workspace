# LIVE-01 — evidence header

- Case: LIVE-01 (BEH-001 / AC-005 on a real stream: the PB-001 live journey after the refactor)
- Command (from the worktree root): `node tickets/in-progress/agent-run-input-state-cleanup/evidence/LIVE-01-live-stream-probe.mjs --server-dir autobyteus-server-ts --out tickets/in-progress/agent-run-input-state-cleanup/evidence/LIVE-01 --label refactor`. The probe is PB-001's, copied with one change: the main-server port is the one answering `/rest/health`.
- Commit: code `a3c4982721` (built `autobyteus-server-ts/dist` at 16:23 contains `refreshInputState` and `reconcileAndPublishInputState`); HEAD `24b6017a7e`
- Environment: macOS 26.5.2 arm64, node v22.23.1, built server with a clean env, temp data root, LM Studio `qwen/qwen3.6-35b-a3b` (JIT-loaded by this run, unloaded afterwards), default 500 ms window. Date: 2026-10-18 ~16:33–16:46 local.
- Steps: a native agent run; socket A subscribes; message 1 (a ~350-word essay) is sent; 1.5 s into streaming, message 2 is sent (queued); 1.2 s later socket B subscribes; the probe waits for two completed turns (max 480 s), then terminates the run.
- Files: `frames-A.jsonl`, `frames-B.jsonl`, `summary.json`, `server.log`, `probe-output.log`
- Outcome: all measured checks completed (see the report's LIVE-01 row). The probe's final wait ended with `Timed out: two completed turns on A`, because turn 2's model output ran away (a 185,352-character segment). The run was terminated and the temp root removed. `server.log` has no error lines.
