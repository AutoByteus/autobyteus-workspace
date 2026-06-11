# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete.
- Current Status: Design-ready investigation complete for architecture review.
- Investigation Goal: Understand current task-agent delegation, `origin/personal` result/notification model, and historical task-agent design decisions to support a clean pure task protocol refactor.
- Scope Classification (`Small`/`Medium`/`Large`): Large.
- Scope Classification Rationale: Tool contracts, task ledger, task-agent notifications, runtime projections, prompts, docs, tests, and settlement are all affected.
- Scope Summary: Replace current `delegate_tasks` + generic `send_message_to` reports/revisions + `accept_task` model with `delegate_tasks` + `submit_task_result` + `review_task_result`, where result/revision/acceptance notifications are system-mediated.
- Primary Questions To Resolve:
  1. What exact current branch behavior causes the model-facing ambiguity?
  2. What should be reused conceptually from `origin/personal`?
  3. What historical design was superseded and why?
  4. What target owner/boundary should govern the new protocol?

## Request Context

The user observed that the current delegator agent is confused by overlapping task and communication tools: it can call `delegate_tasks`, can use `send_message_to` to communicate with the task-agent, and can call `accept_task`, but it sometimes sends a message saying the task is finished rather than calling the lifecycle tool. The user concluded that mixing the task model with the agent communication model is not good. After comparing with Codex subagent semantics and `origin/personal`, the user approved a pure task protocol using `delegate_tasks`, `submit_task_result`, and `review_task_result`, with system notifications between task-agent and delegator.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git.
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/pure-task-delegation-protocol`.
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/pure-task-delegation-protocol/tickets/done/pure-task-delegation-protocol`.
- Current Branch: `codex/pure-task-delegation-protocol`.
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/pure-task-delegation-protocol`.
- Bootstrap Base Branch: `origin/codex/auto-approve-external-git-ops-regression`.
- Remote Refresh Result: `git fetch origin codex/auto-approve-external-git-ops-regression` succeeded on 2026-06-10; local and remote base both resolve to `188a5f0305f3aed4877fcff70942975077455725`.
- Task Branch: `codex/pure-task-delegation-protocol` created from `origin/codex/auto-approve-external-git-ops-regression`.
- Expected Base Branch (if known): `codex/auto-approve-external-git-ops-regression` / `origin/codex/auto-approve-external-git-ops-regression` per user instruction to use the current worktree branch as base.
- Expected Finalization Target (if known): likely `codex/pure-task-delegation-protocol`, later integration into the user's current task branch.
- Bootstrap Blockers: None.
- Notes For Downstream Agents: Historical ticket artifacts under `tickets/done/runtime-tool-mcp-unification-analysis` and `tickets/done/remove-native-autobyteus-agent-team` are relevant but not target behavior. `origin/personal` is a reference for system notifications, not a source to copy verbatim.

## Source Log

| Date | Source Type | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-06-10 | Design Reference | `/Users/normy/autobyteus_org/autobyteus-agents/agent-teams/software-engineering-team/agents/solution-designer/skills/solution-designer/design-principles.md` | Reload mandatory design guidance | Authoritative Boundary Rule, data-flow spine inventory, clean-cut legacy removal, explicit owner boundaries are central for this refactor | Applied in design spec |
| 2026-06-10 | Design Reference | `/Users/normy/autobyteus_org/autobyteus-agents/agent-teams/software-engineering-team/agents/solution-designer/skills/solution-designer/references/design-examples.md` | Refresh good design shapes | Agent runtime and state-machine examples confirm task protocol should have a clear owner and explicit return/event spines | Applied in design spec |
| 2026-06-10 | Command | `git fetch origin codex/auto-approve-external-git-ops-regression && git worktree add ...` | Bootstrap dedicated task worktree | Created `/Users/normy/autobyteus_org/autobyteus-worktrees/pure-task-delegation-protocol` on `codex/pure-task-delegation-protocol` from base `188a5f03` | No |
| 2026-06-10 | Command | `git fetch origin personal && git rev-parse origin/personal` | Refresh comparison branch | `origin/personal` resolved to `36b2dbd6d5bfba4634db19d7fbb7e60df27487ec` | No |
| 2026-06-10 | Code | `autobyteus-server-ts/src/agent-team-execution/task-delegation/*` on current branch | Inspect current task model | Current branch has `delegate_tasks` and `accept_task`; task-agent result/revision uses `send_message_to`; ledger statuses are `not_started`, `active`, `accepted` | Design replacement |
| 2026-06-10 | Code | `autobyteus-server-ts/src/agent-tools/task-delegation/*` on current branch | Inspect model-facing tool surface | Current manifest/tool list contains only `delegate_tasks` and `accept_task`; result tool files are deleted | Replace with new three-tool surface |
| 2026-06-10 | Code | `git show origin/personal:autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-service.ts` | Inspect older task-agent result implementation | `markTaskCompleted`, `markTaskFailed`, `reportTaskAgentResult`, `TaskDelegationCompletionNotifier`, and `acceptTask` existed | Reuse notification concept, not old names |
| 2026-06-10 | Code | `git show origin/personal:autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-ledger.ts` | Inspect older ledger states | States included `queued`, `awaiting_acceptance`, and `failed`; completion mapped to awaiting acceptance | Use improved `awaiting_review`; avoid worker terminal failure shortcut |
| 2026-06-10 | Code | `git show origin/personal:autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-completion-notifier.ts` | Inspect system notification mechanism | The system posted completion notifications to original delegator and coordinator fallback, including task ID and task-agent identity | Design generalized notification dispatcher |
| 2026-06-10 | Code | `git show origin/personal:autobyteus-server-ts/src/agent-tools/task-delegation/task-delegation-tool-manifest.ts` | Inspect old model-facing tool descriptions | Old tools were `delegate_tasks`, `mark_task_completed`, `mark_task_failed`, `accept_task`; result tools were selector-free and task-agent-only | Rename/improve to `submit_task_result` and `review_task_result` |
| 2026-06-10 | Doc | `tickets/done/runtime-tool-mcp-unification-analysis/requirements.md` | Understand first explicit task tool design | Designed server-owned task delegation, selector-free worker result tools, completion notification, original-delegator acceptance | Use as historical reference |
| 2026-06-10 | Doc | `tickets/done/remove-native-autobyteus-agent-team/round4-simplified-task-agent-communication-design.md` and requirements/investigation addenda | Understand why result tools were removed | The simplification intentionally collapsed task-agent progress/completion/revision onto `send_message_to`; current user-observed confusion shows this overcorrected | Supersede with pure task protocol |
| 2026-06-10 | Code | `autobyteus-server-ts/src/agent-team-execution/backends/mixed/delivery/team-message-recipient-resolver.ts` | Check current exact-run routing | `target_agent_run_id` can reach active/recoverable task-agent runs through `TaskAgentDirectory` | Keep for general exact-run communication if needed, but stop using it for task lifecycle |
| 2026-06-10 | Code | `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-settlement-coordinator.ts` | Inspect settlement gates | Current settlement waits for idle/offline, checks assigned current work, protects coordinator, calls `TeamRun.settleTaskAgentInstance` | Reuse for accepted review settlement after extending readiness to include open child delegations |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: runtime-specific tool projection invokes task delegation tools from `autobyteus-server-ts/src/agent-tools/task-delegation` through `TaskDelegationToolService`.
- Current execution flow:
  - Delegator calls `delegate_tasks`.
  - `TaskDelegationService.delegateTasks` creates ledger records and `TaskDelegationActivationCoordinator` starts task-agent instances.
  - Work packet instructs task-agent to report progress/blockers/completion/revisions via `send_message_to`.
  - Delegator may reply to the task-agent with `send_message_to(target_agent_run_id=...)`.
  - Delegator calls `accept_task(task_id)` when satisfied.
  - `TaskDelegationSettlementCoordinator` settles the task-agent after idle/no-work gates.
- Ownership or boundary observations:
  - `TaskDelegationService` owns creation and acceptance but no longer owns result submission or revision. Those lifecycle transitions are effectively delegated to free-form messages.
  - `send_message_to` owns committed communication and exact-run routing, but it should not be the authoritative lifecycle owner for task results and reviews.
  - `TaskAgentDirectory` owns active/settled exact-run reachability and can be reused by system notifications.
- Current behavior summary: The current implementation is simpler but model-facing ambiguous because generic communication and task lifecycle overlap.

## Design Health Assessment Evidence

- Change posture: Behavior change + refactor / task protocol redesign.
- Candidate root cause classification: Boundary Or Ownership Issue; Duplicated Policy Or Coordination; Shared Structure Looseness; Legacy Or Compatibility Pressure.
- Refactor posture evidence summary: The task lifecycle owner must regain explicit result/review transitions; current `send_message_to` lifecycle instructions should be removed from task work packets and prompts.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| Current branch `task-delegation-work-packet-renderer.ts` | Tells task-agents to use `send_message_to` for progress, blockers, completion, revision results | Completion/revision lifecycle is not uniquely owned by task protocol | Replace with `submit_task_result` instructions |
| Current branch `member-run-instruction-composer.ts` | Tells models to use `send_message_to` for task-agent progress/completion/feedback and `accept_task` for acceptance | Delegator must choose between generic message and task terminal action | Replace with review tool guidance |
| User observation | Delegator sent "task is finally finished" through `send_message_to` instead of lifecycle tool | Tool surface creates cognitive load for LLM agents | Remove lifecycle overlap |
| `origin/personal` completion notifier | System sent completion notification to delegator with task ID and follow-up instructions | System-mediated notifications are the right return/event spine | Generalize to result/review notification dispatcher |
| Historical Round 4 simplification | Removed result tools because revision path was brittle | Old names/path should not be copied directly | Introduce better names and system-mediated revision |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-service.ts` | Delegation and acceptance owner | Needs to own result submission and review again | Add `submitTaskResult` and `reviewTaskResult`; remove `acceptTask` |
| `task-delegation-ledger.ts` | In-memory task state | Current states omit review state | Add `awaiting_review`, result/review history, active revision transition |
| `task-delegation-record.ts` | Task domain types | Current record has no result/review submissions | Add tight result/review types; remove accept-only action result shape |
| `task-delegation-activation-coordinator.ts` | Starts task-agent runs | Current work packet advertises `send_message_to` result protocol | Keep activation but change work packet/protocol fields |
| `task-delegation-work-packet-renderer.ts` | Task-agent system packet | Current lifecycle text is ambiguous | Teach `submit_task_result` and system revision notifications |
| `task-agent-directory.ts` | Active/settled exact-run reachability | Current status lacks awaiting-review distinction | Extend or coordinate with ledger for awaiting review/revision notification |
| `task-delegation-settlement-coordinator.ts` | Safe settlement after acceptance | Existing gates are incomplete for nested task-agent delegators because current readiness is based on assigned work only | Reuse after `review_task_result(accept)`, but extend ledger readiness to block settlement while the task-agent has open child delegations |
| `autobyteus-server-ts/src/agent-tools/task-delegation/*` | Model-facing task tool contract | Current tool list is two tools; origin has four old names | New clean-cut three-tool manifest/schema/parser/service wrappers |
| Runtime projection files for Codex/Claude/AutoByteus task tools | Expose task tools to models | Must use shared manifest and new names | Update tests and generated schemas |
| Docs under `autobyteus-server-ts/docs` and `autobyteus-ts/docs` | Durable task protocol docs | Current docs describe send-message lifecycle | Rewrite to system-mediated task protocol |

## Runtime / Probe Findings

No live runtime reproduction was executed during solution design. Investigation was code/doc based. Historical validation logs demonstrate both the old `delegate_tasks -> mark_task_completed -> accept_task` path and the current simplified `send_message_to` path; new validation should include harnessed and/or live runtime coverage.

## External / Public Source Findings

No public internet sources were needed. All evidence came from the repository, branch history, and user-provided runtime observation.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: None for design investigation.
- Required config, feature flags, env vars, or accounts: None for design investigation.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation:
  - `git fetch origin codex/auto-approve-external-git-ops-regression`
  - `git fetch origin personal`
  - `git worktree add /Users/normy/autobyteus_org/autobyteus-worktrees/pure-task-delegation-protocol codex/pure-task-delegation-protocol`
- Cleanup notes: None.

## Findings From Code / Docs / Data / Logs

1. `origin/personal` is not the final target, but it confirms the right communication mechanism: result submission should cause a system notification to the delegator.
2. The old names `mark_task_completed` and `mark_task_failed` encode internal state mutation and split failure handling; the improved name `submit_task_result` is clearer and avoids task-agent choosing terminal state semantics.
3. The old `accept_task` only handled acceptance; because revision was still generic `send_message_to`, that model was only partially pure. `review_task_result` should own both acceptance and revision decisions.
4. The current branch's `TaskAgentDirectory` and exact-run routing are useful internal infrastructure but should not be the model-facing lifecycle path for task review/revision.
5. The current settlement coordinator's safe-idle gates remain the correct finalization mechanism, but the readiness query must be expanded beyond assigned work. Current code has `hasCurrentWorkForTaskAgentInstance(taskAgentRunId)`, which checks non-terminal tasks assigned to the task-agent run. The target also needs an open-child-delegation blocker for non-terminal tasks whose `delegator.taskAgentRunId` is that same task-agent run.


## Architecture Review Round 1 Follow-Up Evidence

Architecture review round 1 is recorded at `/Users/normy/autobyteus_org/autobyteus-worktrees/pure-task-delegation-protocol/tickets/done/pure-task-delegation-protocol/design-review-report.md` with decision `Fail / Design Impact`. The approved direction remains the clean three-tool task protocol, but the review identified three concrete design tightenings:

1. Settlement must not settle a task-agent run that still owns child delegated work. Current branch evidence: `TaskDelegationLedger.hasCurrentWorkForTaskAgentInstance(taskAgentRunId)` checks non-terminal records assigned to the run, while nested delegation requires also checking non-terminal records where `record.delegator.taskAgentRunId` matches the run.
2. Notification delivery failure must be deterministic. The revised design chooses non-transactional notification semantics after valid lifecycle mutation: record state, publish event, attempt notification, log structured warning, return `notification_delivered` plus `warnings[]`.
3. Result/review history must be explicitly linked. The revised design uses a `pendingSubmissionId` invariant and records `reviewedSubmissionId` on every review/event/tool result.

## Constraints / Dependencies / Compatibility Facts

- No compatibility aliases for `accept_task`, `mark_task_completed`, or `mark_task_failed` should remain in the target design.
- Historical ticket artifacts under `tickets/done/**` can still mention old names; active source, docs, prompts, tests, and runtime exposure should not.
- Runtime adapters should continue using shared task-delegation manifest/service rather than reimplementing behavior per provider.

## Open Unknowns / Risks

- Exact event names and payload compatibility with current frontend projection need design finalization.
- The UI may consume current `TASK_DELEGATION_STATUS_UPDATED` shape; implementation should either preserve semantic fields or update consumers/tests cleanly.
- Live LLM behavior may still require prompt tuning so delegators understand `review_task_result` is the only task review path.

## Notes For Architect Reviewer

The design should be judged primarily against the Authoritative Boundary Rule. `TaskDelegationService` must be the authoritative lifecycle owner. `send_message_to` may remain a communication owner, but it must not be a parallel lifecycle owner for task result submission, revision request, or acceptance.
