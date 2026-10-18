# DIAG-STOP — evidence header (round 2 diagnosis of the slow Stop seen in LIVE-ADOPT run 1)

- Case: DIAG-STOP (temporary diagnosis probe; not an acceptance case)
- Commands (from the worktree root):
  - `node tickets/…/evidence/live-sequenced-probe.mjs --server-dir autobyteus-server-ts --out tickets/…/evidence/DIAG-STOP-with-socket --scenario host-stop`
  - `… --out tickets/…/evidence/DIAG-STOP-no-socket --scenario host-stop --no-collab-socket`
- Commit: `335f065cd1` (dist from IMP-06 at `b3666d458f`, same server code); Env: ENV-2; Date: 2026-10-18 ~14:52–14:55
- Steps: a standalone run on qwen streams a ~600-word answer on `/ws/agent/<run>` (with or without a `/ws/agent-collaboration/<run>` subscriber); 3 s into its own streaming turn, `terminateAgentRun(<run>)` with a 60 s client timeout.
- Result (`probe-output.log` marks): with the socket, `"what":"terminate returned","ms":54236`; without it, `"what":"terminate did not return","ms":60004`, and the run's own socket still showed `SEGMENT_CONTENT` frames 2 s later.
- Cause: `StandaloneAgentRunRoot.stop()` awaits `host.terminate()` → `backend.terminateHost()`. The native AutoByteus runtime does not interrupt its in-flight LLM stream on stop, so Stop returns only after the model's turn ends. This is independent of the collaboration socket (slow in both variants). None of these files changed in this ticket or the merge (`git diff --stat e24ff6b333 335f065cd1 -- …standalone-host-agent-handle.ts …agent-run.ts …backends/autobyteus` is empty). Out of scope, recorded as a follow-up.
