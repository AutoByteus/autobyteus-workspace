# API-F-015 — live inter-Agent event is delivered and persisted but skipped by the frontend stream projection

## Classification

- API/E2E revision: `API-REV-022`
- Scenario: `API-LIVE-022-AUTOBYTEUS` / `API-WEB-INTERAGENT-022-001`
- Result: `Fail`
- Preliminary owner: `implementation_engineer`
- Preliminary class: bounded implementation `Local Fix`; `code_reviewer` must confirm failure origin.
- Requirements / user surface: R-039, UC-021, AC-036; exact current Team execution identity and human-readable inter-Agent presentation.

## Safe real execution

The authoritative failing journey used:

- HEAD `d21fdeb2717e932d1af591a9396862016117a744`;
- checked `test-support/live-e2e/test-runtime-bootstrap.mjs` server launcher;
- disposable runtime `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/autobyteus-server-ts/tests/.tmp/api-rev-022-live-20260811`;
- disposable database `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/autobyteus-server-ts/db/api-rev-022-live-20260811.db`;
- actual TTY `pnpm secrets:import` from `/Users/normy/.autobyteus/server-data/.env` into that disposable target (nine identifiers configured; no values recorded);
- exact post-listen PID/lsof proof that only the disposable database was open;
- isolated Nuxt frontend `127.0.0.1:31122`, server `127.0.0.1:60122`, and headless real Google Chrome;
- imported staged nested-classroom package, AutoByteus runtime, and `gpt-5.6-luna`.

The operational home-folder database was neither targeted nor inspected. After evidence capture, the root TeamRun was terminated, both owned listeners were stopped, and the disposable runtime/database/key/staged package were removed.

## Expected

When `/StudentStudyGroup/student_one` sends `CLASSROOM_REPLY_AUTOBYTEUS` to `/Teacher`, the exact `INTER_AGENT_MESSAGE` should project into the addressed Teacher conversation. The UI should render one `[data-testid="inter-agent-inline"]` entry with the current human sender label (`student_one` / `Student One`), without serialized execution-address JSON.

The same exact current routing is required for task-Team peer messages while the task Team is active.

## Observed

The public API proves delivery and exact identity:

- root TeamRun: `nested_classroom_test_team_225add5f659b42ef8aeea10faefcbef5`;
- persisted ordinary reply: exactly one `CLASSROOM_REPLY_AUTOBYTEUS` from persistent `/StudentStudyGroup/student_one` to persistent `/Teacher`;
- persisted task peer: `TASK_PEER_AUTOBYTEUS` from task-Team `/StudentStudyGroup/student_one` to same-chain `/StudentStudyGroup/student_two`, with the exact nonempty task-Team chain;
- task `task_0001`: `active -> awaiting_review -> accepted`, exact submission `NESTED_CLASSROOM_OK_AUTOBYTEUS`, exact accepted review;
- browser task panel: `1 task`, task-Team summary, task details, selected detail, active/awaiting-review/accepted screenshots, refresh-retained task record, and terminal transient execution cleanup all pass.

But the browser projection fails:

- `[data-testid="inter-agent-inline"]` count is `0` before refresh and `0` after supported history restore;
- `humanSenderVisible` is `false`;
- the browser repeatedly logs `No member context found for message, skipping`;
- task-Team stream traffic also logs `No exact task Team Agent execution exists at '/StudentStudyGroup/student_one'.` during the journey.

The authoritative structured result has every other asserted condition `true`; only `humanSenderVisible` is `false`.

## Failure-origin evidence

The current server event builder emits exact identity under `receiver_address`:

```ts
payload: {
  // ...
  receiver_address: input.request.receiverAddress,
  // no execution_address
}
```

The current frontend exact member resolver reads only `payload.execution_address` and returns null when it is absent. `TeamStreamingService` then prints the observed warning and drops the message.

The passing frontend durable test is not representative of the real producer: it fabricates an `INTER_AGENT_MESSAGE` payload with `execution_address: studentAddress`. The source/event contract audit records all four sites with line numbers.

This is a producer/consumer integration mismatch at the current exact-address stream boundary. It is not a missing requirement, approved design gap, provider failure, test-environment defect, or request for route/path/name compatibility. A correction must preserve strict `TeamExecutionAddress` identity and must not add fallback or relaxed parsing.

## Evidence

- Authoritative browser/API row: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-evidence-sr015/api-rev-022/live/browser/autobyteus-browser-row.json`
- Browser command output: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-evidence-sr015/api-rev-022/live/autobyteus-browser-row.log`
- Active task screenshot: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-evidence-sr015/api-rev-022/live/browser/autobyteus-task-active.png`
- Awaiting-review screenshot: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-evidence-sr015/api-rev-022/live/browser/autobyteus-task-awaiting-review.png`
- Accepted screenshot: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-evidence-sr015/api-rev-022/live/browser/autobyteus-task-accepted.png`
- Post-refresh screenshot: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-evidence-sr015/api-rev-022/live/browser/autobyteus-post-refresh.png`
- Source/event mismatch audit: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-evidence-sr015/api-rev-022/live/api-f015-source-event-contract-audit.log`
- Safe-target preflight: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-evidence-sr015/api-rev-022/live/safe-target-preflight.log`
- Secret-import result (identifiers only): `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-evidence-sr015/api-rev-022/live/secrets-import-result.log`
- Exact disposable PID target proof: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-evidence-sr015/api-rev-022/live/server-lsof-database-target.log`
- Cleanup: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-evidence-sr015/api-rev-022/live/final-owned-cleanup.log`

## Required next validation after correction

1. Rerun this exact AutoByteus journey first and require a nonzero inter-Agent inline projection with the current human sender label.
2. Preserve the already-passing task count/details, active/awaiting-review/accepted states, exact task-Team peer messages, refresh retention, and terminal cleanup.
3. Add/maintain a producer-consumer contract test that uses the real current server payload shape rather than injecting a frontend-only `execution_address` field.
4. Only after the first row passes, run the fresh required Codex `gpt-5.6-luna` / medium and authenticated Claude rows.
5. Return all repository-resident durable coverage changes for proportional review after an overall API/E2E Pass.
