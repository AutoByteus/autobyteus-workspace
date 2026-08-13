# API-F-025 — Claude active task-peer reverse reply rejection

## Result

- API/E2E revision: `API-REV-039`
- Scenario: `API-LIVE-039-CLAUDE-TASK-PEER-REPLY-001`
- Result: **Fail**
- Current HEAD: `42e42a9471c251075af07c3e0805d43858246e67`
- Runtime/model: `claude_agent_sdk` / `sonnet`
- Root TeamRun: `nested_classroom_test_team_94632c1f5a46474280e349e2adab2811`
- Preliminary owner: implementation source at the Claude active-turn / inter-agent delivery boundary
- Design classification: no design gap is asserted by API/E2E; focused source-origin review is required.

## Expected

Within one real active task AgentTeam, `/StudentStudyGroup/student_one` sends `TASK_PEER_CLAUDE` to `./student_two`. The exact task-scoped `student_two` AgentRun then replies to `./student_one` through its bound production `send_message_to` seam. The public Team communication projection must contain the once-only request and reverse reply with the same canonical root, the same nonempty ordered task-Team chain, and the concrete task-scoped AgentRuns. The task then submits `NESTED_CLASSROOM_OK_CLAUDE` and reaches accepted review.

## Observed

The first request is routed correctly and appears in public Team communication with the correct nonempty task-Team chain. `student_two` invokes its real bound `send_message_to` with `recipient_address: "./student_one"` and exact content. The tool rejects before reverse delivery:

```text
accepted=false
code=RUNTIME_COMMAND_FAILED
Failed to send user input for runtime 'claude_agent_sdk':
Error: Claude runtime turn is already active for run 'student_one_167e0644221e4c90962f4f6b37e4401a'.
```

Consequences in the real browser/provider row:

- task-peer request: present once;
- task-peer reverse reply: absent;
- task remains `active`;
- exact submission: absent;
- accepted review: absent;
- Team termination still succeeds;
- browser console and Team protocol parsing errors: zero.

This is not model tool-election variance: the receiving model did elect and invoke the exact tool, and the production tool adapter returned a concrete runtime rejection.

## Comparison controls

- The same nested scenario passes end to end for AutoByteus and Codex, including request, reverse reply, exact submission, accepted review, refresh, and termination.
- The user-requested `/Users/normy/autobyteus_org/autobyteus-agents` `Classroom Simulation Team` was imported without source modification and executed in real Chrome for AutoByteus, Codex, and Claude. All three simpler persistent professor/student file-backed send/reply/reference journeys pass.
- Therefore the failure is bounded to the Claude task-peer reply-to-an-active-sender lifecycle, not general package import, API-key setup, basic Claude Team messaging, browser proxying, or generic classroom prompting.
- Focused repository coverage passes `3 files / 29 tests`. It separately protects the Claude same-run active-turn rejection and the current Team routing owners, but does not compose the supported task-peer reverse reply with an active Claude sender turn.

## Preliminary source boundary

- `InterAgentMessageRouter.deliver()` posts the collaboration delivery through `recipientRun.postUserMessage(...)`.
- `ClaudeAgentRunBackend.postUserMessage()` delegates to `ClaudeSession.sendTurn()`.
- `ClaudeSession.sendTurn()` rejects whenever `activeTurnId` is already set.
- The current task-peer interaction keeps `student_one`'s Claude turn active while it waits for the peer reply, so the otherwise exact reverse delivery reaches the active-turn rejection.

API/E2E made no production change, added no queue/retry/fallback/compatibility route, and does not prescribe the correction. The focused reviewer must determine the authoritative source owner and whether the supported delivery needs a Claude-native active-turn injection/queue or a different lifecycle mechanism that preserves exactly-once canonical delivery.

## Environment and safety

- Actual `pnpm secrets:import` used `/Users/normy/.autobyteus/server-data/.env` only as a source and configured nine identifiers in the disposable vault/database.
- Exact disposable DB: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/autobyteus-server-ts/db/api-rev-039-live-20260813-1.db`.
- Server/frontend: checked owned ports `60239/31239`; server PID `lsof` proved only the exact disposable DB.
- Operational database action/inspection: **NONE**.
- Protected `60004/31004` action: **NONE**.
- Cleanup removed the owned runtime/database/vault key and closed both owned ports.
- Both source packages remained byte-identical.

## Evidence

- `live/browser/claude-browser-row.json`
- `live/provider/claude-task-peer-reply-trace.json`
- `live/provider/claude-nested-task-public-boundary.json`
- `live/provider/claude-task-peer-reply-marker.log`
- `live/browser/autobyteus-browser-row.json`
- `live/browser/codex-browser-row.json`
- `live/browser/classroom-autobyteus.json`
- `live/browser/classroom-codex.json`
- `live/browser/classroom-claude.json`
- `repository/claude-active-reply-boundary-focused.log`
- `environment/safe-target-preflight.log`
- `environment/secret-import-summary.log`
- `environment/pre-cleanup-owned-process-and-db.log`
- `environment/final-cleanup-verification.log`
