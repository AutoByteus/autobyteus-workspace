# Investigation Notes: team-interrupt-ack-602

## Bootstrap

- **Task:** `autobyteus-602` (587 FU-005, urgent), read with `get_project_task` on 2026-11-22.
- **Worktree:** `/Users/normy/autobyteus_org/autobyteus-worktrees/team-interrupt-ack-602`. Branch `codex/team-interrupt-ack-602`; base `origin/personal` `0da6bfbfc1`; finalization target `personal`.
- **Authorities read:** the `solution-designer` skill and `requirements-engineering.md` (unchanged since autobyteus-591), `finding-the-cause.md`, `DESIGN.md`, `TESTING.md` (lines 195-236: positive waits, OS latency limits).
- **Handoff rules** re-read 2026-11-22: they gained the Evidence Decision route.

## Findings

| ID | Finding | How established |
| --- | --- | --- |
| F-1 | **The server sends the ack, after the release.** `handleTeamInterruptGenerationCommand` (`team-interrupt-generation-command-handler.ts:42-60`) sends `AGENT_COMMAND_ACK` only after `executeAgentCommand(agentRunId, { kind: "interrupt" })` returns. For a leaving member, that call ends its held turn, and the release (the member removed from the run) happens inside it. In a passing run on this machine, the frames after the interrupt are `TURN_INTERRUPTED`, `AGENT_STATUS offline`, `AGENT_INPUT_STATE`, `RUN_TREE_CHANGED` (writer removed), then **`AGENT_COMMAND_ACK` accepted**, last (`/tmp/sd602/r1/TF-04.json` `writerFramesAfterInterrupt`). | Read + reproduced |
| F-2 | **The test reads the ack at the release, not after waiting for it.** TF-04 (`team-run-follows-definition.e2e.test.ts:433-442`) waits until a snapshot lacks the writer, then reads `view.acks(errorsFrom)` once. `until` polls every 50 ms (`tests/e2e/helpers/agy-runtime-error-fixture.ts:18-22`). When the ack arrives later than the poll that saw the release, `interruptAck` is `null`. | Read |
| F-3 | **That is exactly 587's failure.** In `tickets/done/cross-node-file-transfer-587/evidence/API-R4/TF-base/TF-04.json`, `released: true`, `interruptAck: null`, and the recorded frames end at `RUN_TREE_CHANGED`: the ack had not arrived yet. | Read (587's evidence) |
| F-4 | **It is timing, not a merge regression.** The autobyteus-22 merge `3f75e22589` has the same tree as 22's own tip (merge base = its first parent `ecd6d4556c`). The failing base `6533d7be04` adds only documents. 22's delivery reran all 12 cases on the merged state, passing (in a Linux container). 587 failed 3 of 3 on its macOS machine. On this Mac, base `0da6bfbfc1` passed 4 of 4 (load 37-43), with the ack always the last frame. | Read (git), reproduced (4 runs, `/tmp/sd602/r1 … r4`) |
| F-5 | A diagnostic delaying the server's ack by 1 s (reverted, never committed) failed TF-04 at an earlier step ("the rejoined writer answered"). A delay inside the stream's command handling also delays the commands after it. **Not used as evidence.** | Reproduced (inconclusive) |

## Root cause

A test race, not a server defect. The server's order is right: a command's ack follows its effects. TF-04 asserts the ack at the moment of an effect it causes, which TESTING.md forbids: wait for the event itself, with the limit from `os-latency-under-load.ts`.
