# Investigation Notes — atomic-agent-run-creation (autobyteus-349)

## Investigation Meta
- Package: `atomic-agent-run-creation`. Task `autobyteus-349`, Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`,
  from `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), 2026-10-31, at the
  user's word. The brief is 339's follow-ups FU-004 and FU-003.
- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/atomic-agent-run-creation`, branch
  `codex/atomic-agent-run-creation`, created with `git worktree add -b` from `origin/personal` @ `e87e6bb2b1` after
  `git fetch`. Target `personal`.
- Authorities read (this conversation): `requirements-engineering.md`, `finding-the-cause.md`, `ticket-scope.md`; the
  templates; `DESIGN.md`, `TESTING.md`.
- Status: the requirements facts are established (`Read`); DEC-001 needs the user.

## Facts (all `Read` at `e87e6bb2b1`)
| ID | Source | Finding |
| --- | --- | --- |
| F-01 | `agent-execution/services/agent-run-service.ts:245-250` | `createAgentRun` = `provisioningService.prepareAgentRun(input)` (persists the run: metadata with `preparedAt`, `startedAt: null`, a history row, a memory dir), then `activate(runId)`. **There is no rollback when `activate` throws.** |
| F-02 | `agent-run-provisioning-service.ts:74-118` | Prepare records the Project start (when `projectId` is given), writes metadata with `preparedExpiresAt = preparedAt + 24 h` (`PREPARED_RUN_TTL_MS`, `:43`), and the history row with `initialSummary` |
| F-03 | `agent-run-provisioning-service.ts:120-129`; `agent-run-history-catalog-service.ts:310-350` | `cancelPreparedAgentRun` refuses while a command is outstanding or a runtime is active, and refuses a run that started (`isPreparedIdentity`: `preparedAt` set, `startedAt` null). Otherwise it removes the history row and the run's directory |
| F-04 | `standalone-agent-run-lifecycle-service.ts:339-370` | Activation records `startedAt` (`recordRunStarted`) **before** publishing. A failure after that commit leaves a started run, which cancel correctly refuses |
| F-05 | `agent-run-provisioning-service.ts:131-157` | `cleanupStalePreparedRuns(now)` cancels never-started runs whose `preparedExpiresAt` has passed, skipping active runs and runs with commands. It has **no production caller** (339 FU-003) |
| F-06 | Callers | `createAgentRun`: GraphQL (`api/graphql/types/agent-run.ts:206`, used by the mobile app's run launch), applications (`application-execution-scope.ts:44`, `application-run-binding-launch-service.ts:115`), Model Routing (`model-router-agent.ts:134`, `model-routing-composition.ts:29`). `prepareAgentRun` (two steps, activated later by a first message): the web app's first message (`autobyteus-web/stores/agentRunStore.ts:190-240`) and remote delegation (`remote-collaboration/inbound/remote-delegation-receiver.ts:98`; the peer's work packet activates it) |
| F-07 | `autobyteus-web/stores/agentRunStore.ts:240, 268-279` | The web flow puts the user's first message text into `initialSummary` and moves draft attachments into the prepared run. On a failed send it calls `cancelPreparedAgentRun` itself; it cannot when the server has gone away |
| F-08 | 339 evidence API-02/02B | Prepared-only runs show in history as `offline` with an empty summary, and they **restore successfully**, so a user can open one and send a message |
| F-09 | — | No other kind (Team, Org) has a prepare-then-activate pair with a TTL in this code path (`cleanupStalePrepared*` exists only for agent runs) |

## Implications
- FU-004 can be fixed inside `createAgentRun`: on an activation failure, cancel the prepared run (it refuses safely when
  the run started or is busy), then rethrow the original error. This covers every `createAgentRun` caller.
- An **interrupted** create (the server process ends during activation, 339's residual after the 2 s grace) cannot
  roll back. Only a startup cleanup removes it. With the existing 24 h rule it stays visible for up to 24 h, and longer
  if no restart happens after that.
- A startup cleanup **deletes stored runs**: empty ones, but restorable (F-08), possibly with a first-message title and
  attachment copies (F-07). That is hard to undo, so it is the user's decision (DEC-001). At first start after the
  update it also applies to the never-started runs already in the user's history.
