# API-FIND-008 Settlement/Queue Correlation — Observed Boundaries

## Scope and disposition

- Purpose: evidence-only follow-up requested by Architecture Designer after the
  earlier clean one-task correlated rerun did not reproduce `API-FIND-008`.
- Result: the exact confounding two-task shape reproduced the stall
  deterministically in this run. This document reports observed boundaries and
  does not prescribe recovery machinery. Architecture's later origin
  disposition is recorded at the end.
- Canonical API/E2E result remains `API-REV-002 / Fail / 92.3%`. This focused
  probe is not a cumulative rerun and does not create `API-REV-003`.
- Exact production artifact: detached HEAD
  `895665929213ddf7c276c9a89af19b975935f128`.
- Runtime: built backend on `127.0.0.1:8447`, Nuxt browser surface on
  `127.0.0.1:3447`, isolated data root `live-data-settlement`, real Codex App
  Server, `gpt-5.6-sol` with low reasoning.
- Observation code: an isolated detached-worktree patch added synchronous JSONL
  timestamps and correlation context only. It changed no transition, queue,
  persistence, MCP, or shutdown behavior. TypeScript no-emit and build passed;
  the patch is retained as `instrumentation.patch` and was never merged.
- Browser interaction: task creation/messages ran through the real browser UI.
  When a transient task child was no longer projected in the history tree, the
  test invoked `activeContextStore.postToolExecutionApproval`, the exact Pinia
  action used by the visible Approve/Deny controls, from `open_tab` page context.
  This crossed the real browser Team WebSocket and provider approval boundary;
  no backend API, sidecar, or production store was edited directly.

## Correlated identities

| Role | Identity |
| --- | --- |
| Team root | `aorg_e2e_research_squad_ba9fbaa0b98c4f35abd82c3f98dd8a38` |
| Stable delegator | `/lead`; AgentRun `aorg_e2e_lead_cd6c2471f8fd4cfdb40825a221a80b3c` |
| Supported revision task | `task_e508153307224fce92b3ee00ab9710b6` |
| Revision assignee | `/analyst`; AgentRun `aorg_e2e_analyst_bd659b2ddf114805b2323f01d0b0c51c` |
| Confounding task | `task_8d274669092640df8253687c8fc96e6b` |
| Confounding assignee | `/verifier`; AgentRun `aorg_e2e_verifier_98ade7b2cdaa4b9aa79ec4b1a001f377` |

The analyst task uses the supported same-task revision contract: initial formal
submission, delegator `request_revision`, then the same task Agent formally
resubmits. The verifier task deliberately reproduces the old invalid fixture:
its task description instructs the task assignee both to submit and to call
`review_task_result` on its own task. The lead independently accepts that task
while the verifier's self-review call is still live and waiting for approval.

## Control result

The earlier clean one-task correlated run remains a valid control. Its revised
submission traversed provider -> MCP -> Team capability -> root FIFO -> durable
write -> in-memory commit -> event -> delegator notification -> HTTP/provider
success in 14 ms, and its direct `SIGTERM` shutdown exited `0`. Evidence is in
`../followup-api-find008/correlated-rerun-observed-boundaries.md`.

An additional single-task run within this probe also reached terminal acceptance
while its task Agent provider turn was still open and blocked at settlement
preparation. It is retained as a secondary control, but the two-task run below
is the exact requested confounded reproduction.

## Exact two-task chronology

### 1. Supported analyst revision is ready

- Analyst initial submission durably committed at
  `2026-09-01T21:43:32.223Z`.
- Lead revision request durably committed at
  `2026-09-01T21:44:40.616Z`.
- After the analyst's original provider turn completed, the queued revision
  notification started a new provider turn
  `01a05ef3-a2b5-7b80-8f06-8d9aeab41e65` at
  `2026-09-01T21:50:20.359Z`.
- That turn emitted provider MCP item
  `exec-521705df-e222-421c-b9cc-a5b523af9331`, tool
  `submit_task_result`, at `2026-09-01T21:50:25.470Z`, with message
  `AORG-CONFOUND-ANALYST-REVISED-001`.

### 2. Confounding verifier task remains in a live provider turn

- Verifier provider turn:
  `01a05eef-f2fd-7662-9d19-251241911461`.
- Verifier formal submit item:
  `exec-79e7179d-2491-40fc-a64d-aae8bef6d572`; MCP session
  `agtrun_I36Rj6NsHBz_M1MJaiUBNu5nWqfM8NJe2yyZkhqoxlE`; JSON-RPC request
  `2`; it completed and returned `awaiting_review` at
  `2026-09-01T21:46:39.267Z`.
- In the same provider turn, the invalid fixture caused the verifier to emit
  self-review item `exec-5f8f0914-33ee-4509-bc52-a34ea62e4bb7` at
  `2026-09-01T21:46:42.142Z`.
- At `2026-09-01T21:46:42.149Z` the provider thread reported
  `activeFlags=[waitingOnApproval]`. This self-review was intentionally left
  unapproved, so the exact provider turn stayed live throughout the probe.

### 3. Lead acceptance durably commits, then settlement blocks

- Lead provider item `exec-d70bb49e-2bd6-4521-b7ca-71442a5a0d77` entered MCP
  session `agtrun_wf3-o1jbRxFln-9b01sEtKnT-FgekhWCuYzlAwLIIn4`, JSON-RPC
  request `5`, normalized tool `review_task_result`, at
  `2026-09-01T21:46:58.478Z`.
- Root FIFO entry `6` (`review_result`) began at `21:46:58.480Z`.
- `commitRecordTransition`/persistence began at `21:46:58.482Z`; the durable
  accepted record write completed at `21:46:58.484Z`; the in-memory commit and
  publication followed at `21:46:58.485Z`; the lead received a successful
  `accepted` tool result and HTTP `200`.
- Settlement entry `7` was admitted at `21:46:58.487Z`, became the active FIFO
  head at `21:46:58.488Z`, and carried internal
  `settledAt=2026-09-01T21:46:58.488Z` into the Team adapter. The schema-v1
  sidecar intentionally does not expose `settledAt`; its presence is proven by
  the engine/adapter correlation record rather than inferred from the file.
- The task registry saw the verifier handle as active, running, and
  `hasOpenExecutionWork=true`. `prepareTerminationOnce` began at
  `21:46:58.491Z` with backend lifecycle
  `availability=active`, `phase=running`, and current turn
  `01a05eef-f2fd-7662-9d19-251241911461`. Input admission quiesced at
  `21:46:58.492Z`.
- No later record exists for preparation completion, backend termination, MCP
  session deactivation, settlement commit, `finishLocalTeardown`, or FIFO head
  release. Settlement sweep entries `8` and `9` accumulated behind active head
  `7`.

### 4. Analyst revised submit reaches the root and queues behind settlement

- Browser approval released analyst provider item
  `exec-521705df-e222-421c-b9cc-a5b523af9331` at
  `2026-09-01T21:50:45.549Z`.
- MCP HTTP ingress occurred at `21:50:45.554Z` with session
  `agtrun_zlITfc_4So8vELtc8KhqVIapjKT0RRht9DTrCtUzjWc`, owner exact analyst
  AgentRun, root kind `agent_team`, exact root run, member `/analyst`, JSON-RPC
  request `4`, method `tools/call`, normalized tool `submit_task_result`.
- Executor, task adapter, exact Team capability, and materialization gate all
  started. `RootTaskLifecycleEngine.submitResult` was reached at
  `21:50:45.558Z`.
- FIFO entry `10` (`submit_result`) was admitted at `21:50:45.558Z` behind:
  active head `7` (`settle` verifier), queued duplicate settlement `8`, and
  queued duplicate settlement `9`.
- Entry `10` never became the active head. Therefore task selection,
  `commitRecordTransition`, persistence start/write, in-memory commit, event,
  delegator notification, MCP response, and provider tool completion did not
  occur for the revised submission.
- After more than 178 seconds, the analyst provider turn remained live and
  repeatedly waited on the unresolved call. The durable sidecar still contained
  only the initial analyst submission and the revision request; it contained no
  revised submission.

## Direct answers to the classification questions

| Question | Observed answer |
| --- | --- |
| Did the second analyst call reach MCP ingress? | **Yes.** Exact session, owner, request ID, method, normalized tool, and timestamp are retained. |
| Did it enter/start the root task queue? | **Entered/admitted: yes. Started: no.** It was FIFO entry `10`, queued behind active settlement head `7` and duplicate settlement entries `8/9`. |
| Did analyst revised-submit persistence begin or commit? | **No.** No task selection, transition build, persistence start/write, in-memory commit, event, or notification exists; sidecar is unchanged. |
| Did verifier terminal acceptance persist? | **Yes.** Accepted state and review were durable before settlement began. |
| Did settlement enter/commit/finish teardown? | Entered: **yes**. Durable settlement commit: **no**. Preparation began and blocked before backend termination/MCP deactivation; `finishLocalTeardown` was never reached. |
| Was the verifier provider turn still live? | **Yes.** Same turn remained `waitingOnApproval` on its invalid self-review item. |
| Did the verifier MCP session deactivate? | **No observed deactivation.** No deactivation or AgentRun/backend termination event exists before forced cleanup. |
| Is shutdown a separate provider teardown error? | **No separate error was observed.** Direct `SIGTERM` entered supervisor `agent_team_runs` and remained there for over 60 seconds; it never reached `agent_runs`, never emitted an AggregateError, and required `SIGKILL`. The hang is at the manager/root phase containing the already-blocked Team termination path. |

These are boundary facts. Architecture retained the origin/disposition decision
until it reviewed this evidence together with the clean supported control.

## Shutdown facts

- Direct application-owned `SIGTERM`: `2026-09-01T21:54:09.368Z`.
- `agent_org_runs` start/complete: `21:54:09.372Z`.
- `agent_team_runs` start: `21:54:09.373Z`.
- No `agent_team_runs` completion/error, no later supervisor phase, no
  `shutdown_supervisor_aggregate`, and no `shutdown_server_error` appeared.
- Backend PID `26815` and its Codex child remained alive after 60 seconds. The
  owned processes were then force-killed and both ports `8447/3447` were
  verified closed.
- Because shutdown never rejected, there was no AggregateError tree to
  serialize. This is affirmative evidence of an unresolved close, not missing
  error capture.

## Durable state before/after

- `sidecar-run3-after-analyst-revision-request.json`: analyst is `active` with
  initial submission + revision request.
- `sidecar-run3-after-verifier-accepted-settle-head.json`: verifier is durably
  `accepted`; analyst still has two updates.
- `sidecar-run3-after-analyst-revised-submit-blocked.json` and
  `sidecar-run3-after-140s-blocked.json`: unchanged analyst two-update record;
  no revised submission.
- Fixture `PACKAGE.sha256` passed before and after; the test package was not
  mutated.

## Retained evidence index

- `correlation-final.jsonl` — complete process correlation stream.
- `run3-root-correlation.jsonl` — root-focused stream.
- `run3-verifier-accept-settlement-excerpt.jsonl` — exact terminal review and
  settlement chain.
- `run3-analyst-revision-provider-excerpt.jsonl` — provider revision/submit
  item and unresolved wait sequence.
- `run3-verifier-confound-provider-excerpt.jsonl` — verifier submit then invalid
  self-review in the same live turn.
- `run3-lead-verifier-accept-provider-excerpt.jsonl` — lead provider acceptance.
- `run3-analyst-provider-raw.jsonl`, `run3-verifier-provider-raw.jsonl`, and
  `run3-lead-provider-raw.jsonl` — retained raw provider traces.
- `sidecar-run3-*.json` — exact durable before/after task records.
- `run3-shutdown-correlation-final.jsonl` and
  `run3-server-shutdown-tail-before-kill.log` — shutdown boundary.
- `run3-process-tree-before-kill.txt` — still-live backend/Codex processes.
- `run3-confounded-blocked-browser.png` — browser task-state surface.
- `instrumentation.patch`, `instrumentation-typecheck.log` (successful command,
  intentionally no output), `instrumentation-typecheck-status.txt`,
  `instrumentation-build.log`, `runtime-source.txt`, and
  `detached-source-cleanup-status.log` — probe provenance and clean reversion.
- `package-hash-before.log`, `package-hash-after.log`, and
  `package-hash-compare.diff` — fixture immutability.
- `boundary-evidence-assertions.log` — executable consistency checks for the
  durable write, settlement head, live provider turn, MCP/queue admission,
  absent command start/persistence, unchanged sidecar, and shutdown boundary.

## Cleanup

- Browser tab closed.
- Owned backend/web/Codex processes stopped; the blocked backend required
  `SIGKILL` after the recorded graceful-shutdown interval.
- Ports `8447` and `3447` have no listeners.
- Isolated data is retained under this evidence directory for audit only.
- Observation-only source edits remained isolated from the canonical worktree,
  were not merged, and were reverted after evidence capture; detached status is
  clean at the exact artifact HEAD.

## Architecture final disposition

Architecture classified `API-FIND-008` as `Not Reproduced / invalidly
confounded validation evidence` with `No Architecture Impact`. The supported
one-task control is the behavior authority: its same-task revision/resubmit
completed durably and its direct shutdown exited `0`. The exact two-task run in
this document proves only that the invalid task prompt can keep an unrelated
task-assignee provider turn live while terminal settlement occupies the root
FIFO. It does not establish a requirement gap, design impact, implementation
source defect, or shutdown-design defect. No recovery mechanism is requested.
