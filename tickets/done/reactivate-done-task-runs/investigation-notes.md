# Investigation Notes

## Investigation Meta

- Package identifier: `reactivate-done-task-runs`
- Request / ticket: Reactivate a DONE Task's delegated agent/team by messaging its run ID (user conversation, 2026-10-07)
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/reactivate-done-task-runs`
- Repository mode: `Git`
- Task worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/reactivate-done-task-runs` / `codex/reactivate-done-task-runs`
- Resolved base remote / branch / revision: `origin` / `personal` / `cfeda548bfb1838fd21961b09f13733f2a95e139` (fetched 2026-10-07)
- Finalization target remote / branch: `origin` / `personal`
- Bootstrap result: Worktree created from refreshed `origin/personal`
- Bootstrap blocker: None
- Current solution revision ID: `SR-001`
- Authorities read: `references/requirements-engineering.md` (2026-10-06); architecture gate on 2026-10-07: `references/architecture-design.md`, `design-principles.md`, `/DESIGN.md`, `autobyteus-server-ts/docs/design/data_migration_guideline.md` (§1–4)
- Investigation status: Requirements approved; architecture investigation complete for design

## Initial Request And Clarifications

- Origin: While working on `project-manager-ux`, the Solution Designer set the Product Team's ad hoc Task DONE (`ad_hoc_task_6750625c-…`) after design confirmation. A follow-up round was then impossible: the copy `product_ui_ux_designer_9ea6001c…` is closed for good.
- The user (2026-10-07): "It's not your mistake… our software should be supporting you to do that." First proposal: return a team run ID from `delegate_task`. Then: "if you send it to the coordinator again, it should reactivate the team."
- Solution Designer analysis given to the user:
  - sending to the coordinator already wakes an offline team; only DONE blocks it;
  - the run ID is enough as the handle.
  - Proposed decisions: (a) helpers stay closed; (b) only the assigner may reactivate; (c) no team run ID, add the agent/team kind.
- User: "let's work on this task ticket first… Go ahead. You don't need my approval…" (approval of the proposal).
- SR-002 (2026-10-07): the user reversed the automatic status change. The agent owns status: it reopens the Task (TODO/IN_PROGRESS), then messages the worker. Rationale: "if you silently change the status, the agent is not aware of it and this stays intransparent for the user."
- Dependency: `project-manager-ux` (SR-002, Ready for Approval) is on hold until this ticket is delivered.

## Source Log

| Date | Type | Source | Finding |
| --- | --- | --- | --- |
| 2026-10-07 | Doc | `autobyteus-server-ts/docs/modules/projects.md` "DONE" §1–3, "Reopen and what DONE never touches", "Tasks With No Project" | DONE closes every open entry; "A closed run can never receive new input, be woken or be restored… after restart and after the Task is deleted"; reopening status starts nothing |
| 2026-10-07 | Code | `src/projects/domain/task-agent-resources.ts:70-72` | `closeTaskAgentResources` sets `closedAt` on every open entry; nothing ever clears it ("Closed is forever") |
| 2026-10-07 | Code | `src/projects/services/task-agent-resource-service.ts` | Sole authority over `agent_run_resources.json` + in-memory view (`owners`, `closedRunsByHostRootKey`, derived only in `swap()`); per-Task `serialize()`; `closeTask()` |
| 2026-10-07 | Code | `src/projects/services/project-task-service.ts` (`closeAndWrite`, `updateTaskById`, `linkAgentRun`) | DONE = close entries (fence) → write status → ask roots to release; Project Tasks via ProjectStore, Tasks with no Project via `AdHocTaskStore`; implements `TaskAgentResourcePort` |
| 2026-10-07 | Code | `src/projects/stores/task-agent-resource-schema.ts` | Strict reader/exact writer; `closedAt: string \| null`; no version field |
| 2026-10-07 | Code | `src/agent-collaboration/execution/task/task-agent-resource-port.ts` | Runtime ↔ Task-side port (resolveAssignment, link, ownerOf, isOpen, closedAgentRunsIn…) |
| 2026-10-07 | Code | `src/agent-collaboration/execution/task/root-task-agent-resource-scope.ts:52-62` | `assertInputAllowed` / `assertMessageScope` throw `TASK_AGENT_RESOURCE_CLOSED` when the owner entry is closed |
| 2026-10-07 | Code | `src/agent-collaboration/execution/task/root-task-execution-lifecycle.ts` (`withLiveLease`, `acquireLiveLease`, `acquireAtHead`) | The input fence + wake path: `assertInputAllowed` → queue `wake` → `assertRestorableChain` → `restoreChain` → lease. Idle-shutdown copies restore this way. |
| 2026-10-07 | Code | `src/agent-communication/services/global-agent-run-message-router.ts:96-124` | Run-ID send from a sender inside a root goes to `senderRoot.deliverExactAgentMessage` when the root contains the target (shut-down children included) |
| 2026-10-07 | Code | `standalone-agent-run-root.ts:276`, `root-team-run.ts:328`, `agent-org-run.ts:232` | All three roots implement `deliverExactAgentMessage` as `operationGate.run(() => taskExecutions.withLiveLease(sender, () => delivery.deliverToRunId(input)))` and wire `assertDeliveryAllowed` → `assertMessageScope` |
| 2026-10-07 | Code | `src/standalone-agent-run-root/services/standalone-root-task-execution-adapter.ts:180-264` (same shape in `agent-org-task-execution-adapter.ts`, `team-task-execution-adapter.ts`) | `cancelOwnedExecution` / `releaseOwnedExecution` / `assertRestorableChain` (conversation present) / `restoreChain` per host kind (root agent, root team, team-hosted) |
| 2026-10-07 | Code | `backends/root-agent-execution-registry.ts:184-235`; `backends/configured-agent-execution-handle.ts:207-215,342` | DONE release calls `cancelActivation()` → `rootShutdownFenced = true` on the handle, which **stays in `active`**. `restoreTask` reuses an existing handle → `getOrCreateAgentRun` on a fenced handle fails. After a server restart no handle exists, so restore creates a fresh `restore`-mode handle. |
| 2026-10-07 | Code | `agent-team-execution/local/registries/task-agent-execution-registry.ts:73-100,196-204` | Same pattern for team-hosted task agents (fenced handle retained in `active`) |
| 2026-10-07 | Code | `backends/root-team-execution-directory.ts:215-227`; `agent-team-execution/domain/team-run.ts:16-30,71-80` | Root task Team release terminates the TeamRun runtime; `TeamRun` keeps `releasedTaskExecutions` / `directTaskExecutions` sets for idempotent re-release |
| 2026-10-07 | Code | `agent-team-execution/domain/team-run-event.ts`, `standalone-root-event.ts`, `agent-org-run-event.ts`; projectors in `services/agent-streaming/*` | Live closure event per root kind: `TASK_EXECUTIONS_CLOSED` (team), `task_executions_closed` (standalone, org); snapshots carry `closed_task_executions` computed from `closedAgentRunsIn(root)` ∩ tree |
| 2026-10-07 | Code | `autobyteus-team-stream-contracts/src/team-stream-server-message.ts`; `autobyteus-collaboration-stream-contracts/src/agent-org-execution-dtos.ts:109-112` | Contract schemas for closure events |
| 2026-10-07 | Code | `autobyteus-web/services/teamExecution/teamExecutionViewState.ts:395-403`; `services/agentOrgExecution/agentOrgExecutionContext.ts:232-240`; `services/agentCollaboration/agentRunCollaborationStreamingService.ts:210` + `agentRunCollaborationContext.ts`; `utils/collaboration/taskExecutionClosure.ts` | Web merges closed references monotonically (`mergeClosedTaskExecutions`) and hides closed subtrees; history rows use `closedTaskExecutions` from GraphQL (recomputed server-side on read) |
| 2026-10-07 | Code | `src/agent-communication/services/send-message-to-tool-result-contract.ts`; `src/agent-team-execution/task-delegation/task-delegation-result-contract.ts`; `root-task-dispatch.ts:69-70` | Strict result schemas: send `{accepted, code, message, target_agent_run_id}`; delegate `{target_agent_run_id, task_id?}` |
| 2026-10-07 | Code | `src/agent-tools/project-tasks/project-task-tool-contract.ts:14`; `src/agent-collaboration/domain/agent-team-collaboration-llm-contract.ts:54,61,119,124` | Agent-facing text: "DONE closes the Task's delegated copies for good"; "follow-ups remain possible unless its Task is DONE" |
| 2026-10-07 | Data | `/Users/normy/.autobyteus/server-data/ad-hoc-tasks/` (read-only) | 2 ad hoc Tasks, both DONE; representative `agent_run_resources.json` entries with `closedAt` set |

## Relevant Existing Behavior

| ID | Path | Current Outcome |
| --- | --- | --- |
| BEH-001 | Assigner `send_message_to(run ID)` → router → sender root `deliverExactAgentMessage` → `withLiveLease`/`assertMessageScope` → `TASK_AGENT_RESOURCE_CLOSED` | Refused |
| BEH-002 | `create_or_update_task` status only | Status changes; no run reopen |
| BEH-003 | DONE → `publishTaskExecutionsClosed` → web hides subtree; snapshot `closed_task_executions` | Hidden live and after reload |
| BEH-004 | A team copy is one `assigned` entry `{teamRunId, coordinatorAgentRunId}`; members are owned through the ownership chain | — |
| BEH-005 | Helpers = `delegated` / `broughtIn` entries with `creator` | Close with DONE |

## Architecture Investigation Findings

1. **Only the Task-side flag and the retained fenced runtime authority block reactivation.** Conversations, execution-tree nodes and memory are retained by DONE. `assertRestorableChain` / `restoreChain` already restore idle-shutdown copies from their saved conversation.
2. **In-process obstacle:** after DONE, the released handle (agent) or terminated TeamRun (team) stays registered with its fence set. Restore would reuse it and fail. The retained authority must be discarded before restore (after a restart there is none).
3. **Release may still be in flight** when a reactivation arrives (release is asynchronous and not queued). Re-invoking the exact release is idempotent (`beginRootTaskActivation.release`, `TeamRun.releaseDirectTaskExecution`). `EXACT_RELEASE_AUTHORITY_UNAVAILABLE` already counts as "stopped" (`root-task-agent-resource-scope.ts` NO_AUTHORITY).
4. **Ordering authority:** DONE and linking are serialized per Task (`TaskAgentResourceService.serialize`). The view swaps only on commit, so `closedAgentRunsIn` (snapshots) and `isOpen` (input fence) follow a committed reopen automatically.
5. **Host root:** every entry of an assignment is hosted in the assigner's root. The assigner messages from inside that root, so the reactivation always runs in `senderRoot.deliverExactAgentMessage` (one place per root kind).
6. **Identity:** `assignedBy` is the assigner's agentRunId. The ingress run ID is `agentRunId` for an agent entry and `coordinatorAgentRunId` for a team entry (`currentAssignments`).
7. **Crash ordering (SR-001 only; moot in SR-002, where status is not written):** writing status IN_PROGRESS first and opening the entry second means a crash between the writes leaves a benign state (Task IN_PROGRESS, entry closed), equal to a manual reopen. The reverse order could leave a DONE Task with an open entry.

## Persisted Data And State Facts

- Stored subject: `<project>/tasks/<taskId>/agent_run_resources.json` and `<appData>/ad-hoc-tasks/<taskId>/agent_run_resources.json`; Task `task.json` status.
- Change: an entry's `closedAt` can go from a timestamp back to `null`. Status can go DONE → IN_PROGRESS (already possible through the tool).
- Meaning of `closedAt: null` = "open" is unchanged. Schema, reader and writer are unchanged.
- Volume: one file per Task; reactivation touches one entry.

## Requirement Implications

None beyond the approved basis. Finding 2 is a technical obligation (design), not new behavior.

## Notes For Architecture Design

See `design-spec.md`.
