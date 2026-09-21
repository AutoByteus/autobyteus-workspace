# API-FIND-008 Evidence-Only Correlated Rerun

- Ticket: `AORG-FLAT-TEAM-001`
- Existing finding: `API-FIND-008` / held `Unclear` by `CRR-012`
- Execution date: `2026-09-01 UTC`
- Scope: one supported standalone-Team same-task revision/resubmission rerun plus shutdown observation
- Cumulative API/E2E result change: **None**. `API-REV-002` remains `Fail / 92.3%`; this is a focused origin probe, not `API-REV-003`.
- Source under probe: detached exact artifact HEAD `895665929213ddf7c276c9a89af19b975935f128`
- Runtime: built TypeScript server, browser Nuxt client, SQLite isolated below this evidence directory, real Codex App Server, `gpt-5.6-sol`, reasoning `low`, auto-approve enabled

## Probe isolation and instrumentation

Temporary observation-only instrumentation was applied in a detached worktree and removed after execution. It did not change the assigned production worktree. The retained patch is `instrumentation.patch` (SHA-256 `cfb535545c0f2099b1f8c1bd19fa177fa8dd53601d6a6e58fcbe18443587e288`). It adds synchronous JSONL observation points; it does not change admission, queueing, persistence, task state, provider, or shutdown behavior.

Validation of the instrumented exact source:

- `pnpm exec tsc -p tsconfig.build.json --noEmit` — exit `0` (`instrumentation-validation.txt`).
- `pnpm run build:full` — exit `0`, built-in bootstrap smoke passed (`instrumentation-build-validation.txt`).
- `git diff --check` — exit `0` (`probe-source-final-state.txt`).

The real browser launched `aorg-research-squad` from the Team catalog and sent the task/review instructions through the ordinary member composer. The package was already the corrected API-REV-002 fixture; this focused probe registered that isolated package root directly rather than repeating the already-proven Settings import journey.

## Exact execution identity

| Field | Value |
| --- | --- |
| Root subject | `agent_team` |
| Root TeamRun | `aorg_e2e_research_squad_3ba09981d7344c2ea15a577d2d1604d3` |
| Configured assignee address | `/analyst` |
| Fresh task AgentRun | `aorg_e2e_analyst_bda68d61c1b44d208a13d73245299375` |
| Delegator address / AgentRun | `/lead` / `aorg_e2e_lead_cf66995dd5664e69ba3d2dffe50abbb3` |
| Task | `task_3110f35c97b54ee3b3ae8fddb0f6103e` |
| First submission | `submission_be1b77ab6cb947b5bb91a44be4bdf91b` |
| Revision | `review_127d2a05682d4822915c740b9a5bc48b` |
| Revised submission | `submission_cbe8b973d7fa48769501ef804d434bbe` |

## Correlation chain for the second `submit_task_result`

### 1. Codex provider item/tool dispatch

The retained fresh-task provider trace records:

- AgentRun: `aorg_e2e_analyst_bda68d61c1b44d208a13d73245299375`
- turn ID: `01a05ec8-731f-7943-8d1c-c851484c5b49`
- provider trace item ID: `rt_1788296593853_7170b7f9-7626-4cf8-8a68-6fc688386261`
- provider tool-call ID: `exec-a246306f-a94b-49f4-baef-9d42a440a334`
- tool: `submit_task_result`
- tool-call-start timestamp: `2026-09-01T21:03:13.853Z` (`ts=1788296593.853`)
- exact argument: `AORG-FIND008-REVISED-001\nThe requested deterministic revision marker is complete.`
- provider result item ID: `rt_1788296593867_2e67ee9e-a440-4da7-b833-15fb183df89c`
- provider tool-result timestamp: `2026-09-01T21:03:13.867Z`
- provider result: `{task_id: task_3110..., status: awaiting_review}`

Evidence: `provider-raw-trace-after-rerun.jsonl`.

The provider tool-call ID is not carried as a field in the MCP HTTP JSON-RPC envelope. The correlation from provider item to MCP request is therefore by the exact AgentRun/session owner, tool name, uninterrupted sequence, and the adjacent `1 ms` timestamps; it is not represented as a shared ID by the current protocol.

### 2. Agent Tools MCP HTTP ingress

At `2026-09-01T21:03:13.854Z`, one millisecond after provider tool-call start:

- MCP session ID: `agtrun_Z2NM_VcrG3sW1pw7LCXCA9ajZmnRclyka0vzTqIRQhA`
- session owner: fresh task AgentRun `aorg_e2e_analyst_bda68d61c1b44d208a13d73245299375`
- root identity: `agent_team` / `aorg_e2e_research_squad_3ba09981d7344c2ea15a577d2d1604d3`
- owner member address: `/analyst`
- JSON-RPC request ID: `5`
- method: `tools/call`
- normalized tool: `submit_task_result`
- HTTP route session matched the MCP session exactly.

### 3. MCP executor and task adapter

- executor start: `21:03:13.854Z`
- task adapter start and parse: `21:03:13.855Z`
- parsed collaboration identity matched the exact root, `/analyst`, and fresh task AgentRun
- adapter command complete: `21:03:13.862Z`
- executor completion: `accepted=true`, `code=success`, `resultKind=operation_result`
- HTTP dispatch complete: status `200` at `21:03:13.862Z`

No adapter, executor, or HTTP error stage was emitted.

### 4. Bound Team task command capability and queue

- Team capability entry: `21:03:13.855Z`
- materialization gate admitted exact root: `21:03:13.855Z`
- queue admission attempt: `21:03:13.856Z`
  - `commandKind=submit_result`
  - `rootFailStopped=false`
  - `externalAdmissionOpen=true`
  - `running=false`
  - `queuedBefore=0`
- queue admitted: `queuedAfter=1`
- command started at the head immediately: `queuedRemaining=0`
- command completed: `21:03:13.862Z`

### 5. RootTaskLifecycleEngine, durability, publication, and notification

- engine entry saw the exact task with status `active`
- selected task: `task_3110...`, status `active`
- built transition: `active -> awaiting_review`, submission `submission_cbe8...`
- `commitRecordTransition` start: `21:03:13.857Z`
- persistence start: `21:03:13.857Z`
- durable write complete: `21:03:13.859Z`
- in-memory commit: `21:03:13.859Z`
- task event published: `21:03:13.860Z`
- persistence result: `outcome=committed`
- delegator notification start/complete: `21:03:13.860Z` / `21:03:13.861Z`, `warning=null`
- final lifecycle/queue/adapter result: `{task_id: task_3110..., status: awaiting_review}` by `21:03:13.862Z`
- provider recorded its corresponding success result at `21:03:13.867Z`

The browser task panel displayed the original result, revision request, and `Revised result submitted · Result 2` with the exact revised marker. Evidence: `screenshots/revision-resubmission-success.png`.

## Durable sidecar before and after

Before review/revision:

- SHA-256: `6cdf0b781aae312c664bf269266e9eccc2b2254a97f7959155b1e51720f862f6`
- status `awaiting_review`
- exactly one initial submission

After second submission, before any server interruption:

- SHA-256: `d97f7dc2ca7cc5b42c6f16ea3e58b902c69c213120ab1b0c168cf8db2df4e87b`
- same task ID and task AgentRun
- revision record retained
- second submission retained with exact revised marker
- status `awaiting_review`

Evidence: `task-sidecar-before-revision.json`, `task-sidecar-after-rerun.json`, and their `.sha256` files.

## Shutdown evidence and limitation

The first attempt to signal the originally running server used a PTY pipeline (`node | tee`). Sending Ctrl-C to that process group terminated the wrapper/process group without entering the application's registered shutdown handler. It produced no shutdown probe events and is explicitly **not** used as graceful-shutdown evidence.

The same isolated data root was then restarted. The exact TeamRun was restored through the supported `restoreAgentTeamRun` GraphQL mutation (`restore-team-response.json`), and a direct `SIGTERM` was delivered to the Node server PID so the application handler owned shutdown.

Observed graceful shutdown at `2026-09-01T21:07:17Z`:

1. `agent_org_runs` start/complete
2. `agent_team_runs` start/complete; four queued `settle` commands admitted, started, and completed
3. `agent_runs` start/complete
4. `shutdown_supervisor_complete`
5. server log: `Server closed cleanly.`
6. process exit code: `0`; server/Codex child PIDs and ports `8437`/`3437` were gone

No manager/root/AgentRun close phase failed, no `shutdown_server_error` was emitted, and therefore there is no `AggregateError.errors` or `cause` tree to serialize in this rerun.

Restart/Restore marked the still-awaiting-review live task `interrupted` with the current supported explanation that live task recovery is not supported after TeamRun reopen. This occurred at Restore (`2026-09-01T21:07:01.847Z`), not during the successful second submission or graceful shutdown, and is retained separately in `task-sidecar-after-graceful-shutdown.json` / `task-sidecar-shutdown-diff.patch`.

Evidence: `correlation-after-graceful-shutdown.jsonl`, `second-submit-and-shutdown-correlation.jsonl`, `graceful-shutdown-evidence.log`, and `server-console-live.log`.

## Direct answers to the classification questions

| Question | Observed answer |
| --- | --- |
| Did the second call reach MCP ingress? | **Yes.** JSON-RPC request `5`, `tools/call`, exact task AgentRun/session at `21:03:13.854Z`. |
| Did it enter/start the root task queue? | **Yes.** Admission, enqueue, and command-start events occurred at `21:03:13.856Z`. |
| Did persistence begin and commit? | **Yes.** Persistence began at `.857Z`, durable write completed at `.859Z`, in-memory/event publication completed by `.860Z`, delegator notification completed by `.861Z`. |
| Did the caller receive completion? | **Yes.** MCP/HTTP completed by `.862Z`; provider trace records tool success at `.867Z`. |
| Is shutdown failure the same blocked operation or a separate provider teardown error? | **No shutdown failure occurred in the valid graceful-shutdown observation, and the second operation was not blocked.** This rerun therefore cannot classify the prior failure as same-operation or separate-provider teardown; it disproves neither intermittent possibility. |

## Evidence disposition

`API-FIND-008` was **not reproduced** in this one fully correlated rerun. The evidence removes the prior assumption that every same-task resubmission deterministically stalls and proves a complete successful chain on this attempt. It does not explain the retained API-REV-002 stall, so API/E2E does not assign a production owner or prescribe recovery machinery. Architecture retains origin/disposition ownership.

## Cleanup and source fidelity

- fixture post-run `sha256sum -c PACKAGE.sha256`: all files `OK`
- isolated database retained; generated `production.db.secret.key` removed
- browser tabs: `[]`
- owned listeners on `8437` and `3437`: none
- detached instrumented worktree: removed
- assigned production worktree source: not modified by this probe

