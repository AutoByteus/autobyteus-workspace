# Investigation Notes

## Investigation Meta

- Package identifier: `delegate-to-existing-copy`
- Request / ticket: Delegate follow-up work to an existing copy — `delegate_task` returns the team run ID and the coordinator agent run ID, and accepts the copy's run ID as a target for a new Task (Project Task Manager delegation, user request 2026-10-09)
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegate-to-existing-copy`
- Repository mode: `Git`
- Task worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegate-to-existing-copy` / `codex/delegate-to-existing-copy`
- Resolved base remote / branch / revision: `origin` / `personal` / `048ea6cecb3f1999d4201be5b995157a8007d8e7` (fetched 2026-10-09; `origin/HEAD` → `origin/personal`)
- Finalization target remote / branch: `origin` / `personal`
- Bootstrap result: Worktree and branch created from freshly fetched `origin/personal`.
- Bootstrap blocker: None
- Current solution revision ID: `SR-006`
- Authorities read (requirements reading gate; file and date): `.claude/skills/solution-designer/references/requirements-engineering.md` (2026-10-09); templates for requirements, investigation notes and solution revision record (2026-10-09)
- Authorities read (design reading gate, 2026-10-09): `references/architecture-design.md`, `design-principles.md`, repo `DESIGN.md`, `autobyteus-server-ts/docs/design/data_migration_guideline.md` §2, `autobyteus-server-ts/AGENTS.md`, design-spec template
- Investigation status: Requirements approved (SR-003); architecture investigation complete (SR-004).

## Initial Request And Clarifications

- Original request: see `requirements-doc.md` → Problem. Delegated by `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`) with the user's rationale (2026-10-09) and six requested behaviours.
- Clarifications received: none yet; open decisions DEC-001..DEC-007 are for the user.
- User-supplied facts and constraints:
  - A follow-up ticket should naturally go to the same team copy that did the earlier work.
  - Keep current result fields working; the coordinator ID must keep working for messaging.
  - Only the run that delegated the copy (or the user) may re-assign it; "define the rule".
  - A copy works on at most one open Task at a time "(or define another clear rule)".
  - "Done when" includes: finishing A doesn't stop the copy while B is open.
- Initial ambiguity:
  - The one-open-Task rule and "finishing A doesn't stop the copy while B is open" can only both hold if A is closed before B is assigned, or if a copy may hold several open Tasks (DEC-001).
  - "or the user": there is no user-facing (UI) delegation path today (DEC-002).
  - Item 5 (sub-work as child Tasks) is a design choice for the user (DEC-006).

## Product And Domain Understanding

- Product area: Projects / Tasks; server-owned task delegation (`delegate_task`), task executions (delegated copies), Task agent run resources.
- Affected actors or systems: Project Task Manager and any delegating agent; delegated Agent/Team copies; workers who delegate sub-work (e.g. Solution Designer → Product Team); the user on the Projects board and run tree.
- Existing purpose: every delegated copy belongs to exactly one Task, so DONE/CANCELLED can close and stop it; the assigner can reactivate a closed copy by reopening the same Task and messaging it.
- Terminology:
  - **Copy / task execution**: one delegated Agent run (`{agentRunId}`) or Team run (`{teamRunId}`).
  - **Ingress / coordinator**: the agent run of a Team copy that receives work; today the only ID exposed for a Team copy.
  - **Assignment** (`role: assigned`): a copy linked to a Task by a delegator (`assignedBy`).
  - **Sub-work** (`role: delegated`) and **helper** (`role: broughtIn`): copies a Task's worker started; they inherit that Task.

## Source Log

| Date | Type | Exact Source / Command | Why | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-10-09 | Command | `git fetch origin`; `git worktree add -b codex/delegate-to-existing-copy … origin/personal` | Bootstrap | Base `048ea6cec` | — |
| 2026-10-09 | Code | `autobyteus-server-ts/src/agent-collaboration/execution/task/task-execution-reference.ts` | Copy identity | `{agentRunId}` or `{teamRunId}` | — |
| 2026-10-09 | Code | `…/task/task-delegation-command.ts` l.5-17 | Tool input/result types | Input: `recipient_address` + (`task_id` \| `description`/`reference_files`). Result: `{target_agent_run_id, target_kind, task_id?}` or `{target_agent_run_id: null, message}` | Add team run ID; add existing-copy target |
| 2026-10-09 | Code | `…/task/root-task-dispatch.ts` l.22-86 (`dispatchTaskCopy`) | Spawn + link path | Links the Task **before** activation; Team links carry `coordinatorAgentRunId`; result `target_agent_run_id` = ingress (coordinator for a Team) | Existing-copy path needs a link step without planning a new copy |
| 2026-10-09 | Code | `…/task/root-task-execution-lifecycle.ts` l.93-129 (`delegate`) | Admission and join | `task_id` from a Task-owned sender → `TASK_AGENT_RESOURCE_OWNED_SENDER`; description-only from an owned sender → `{role: "delegated", creator: owner.agentRun}` (sub-work, no `task_id`, l.119-122); from an unowned sender → new ad-hoc Task, `task_id` returned | Item 5 |
| 2026-10-09 | Code | same file l.188-226 (`deliverToExactTarget`, `reactivateClosedTarget`) | Reactivation | Assigner-only reopen of a closed `assigned` entry: advisory `assertReopenable` → queue step (settle previous release, discard released authority, `assertRestorableChain`) → `reopenAssignment` → `publishTaskExecutionsReopened` → normal wake/restore/deliver | Reusable runtime step for waking a stopped copy for Task B |
| 2026-10-09 | Code | `…/task/root-task-agent-resource-scope.ts` | Ownership questions | `ownerOf(chain)`; `assertMessageScope` rejects owned→other-Task messaging (`TASK_AGENT_RESOURCE_CONFLICT`); closed checks | Ownership must follow the copy's current Task |
| 2026-10-09 | Code | `…/task/task-agent-resource-port.ts` | Runtime ↔ Task contract | `linkAgentRun`, `ownerOf`, `isOpen`, `closedAgentRunsIn`, `assertReopenable`, `reopenAssignment` | New port operation for "assign existing copy" |
| 2026-10-09 | Code | `autobyteus-server-ts/src/projects/domain/task-agent-resources.ts` | Persisted entry shape and rules | Entry: `role, assignedBy?, recipientAddress?, hostRoot, agentRun, coordinatorAgentRunId?, linkedAt, start, startError?, closedAt`. `currentAssignments` lists open `assigned` entries only, `targetAgentRunId` = agent or coordinator (l.108-114). Reopen: assigner-only, `started` only | Assignment view needs team run ID; closed assignments are invisible to `list_project_tasks` |
| 2026-10-09 | Code | `…/projects/services/task-agent-resource-service.ts` | In-memory authority | `owners: Map<runKey, taskId>` — one Task per run; `link()` rejects a run that already belongs to a Task (`TASK_AGENT_RESOURCE_CONFLICT`, l.207-211); `swap()` logs a conflict if a run appears in two files (l.233-234); `closedRunsByHostRootKey` marks a run closed if any of its entries is closed | Core invariant to change: one run may appear in several Task files over time |
| 2026-10-09 | Code | `…/projects/services/project-task-service.ts` l.248-260, 303-315 | Link/close orchestration | Link re-reads Task status under the Task's serialization; DONE/CANCELLED closes all open entries then releases `closedByHostRoot(taskId)` — **every** closed run of that Task, also on a repeated DONE | A repeated DONE of A would stop a copy now working on B unless filtered |
| 2026-10-09 | Code | `…/projects/services/task-root-view-builder.ts` | Board root | Task root = latest `assigned` entry; view already has `ingressAgentRunId`, `teamRunId`, `closed`, `status` | Board can show B's root without new fields |
| 2026-10-09 | Code | `…/agent-tools/project-tasks/project-task-tool-contract.ts`, `project-task-tool-manifest.ts` | PTM tools | `list_project_tasks` returns `assignments` (open only) `{targetAgentRunId, kind, assignedBy, outcome}`; `create_or_update_task` is automatic wherever `delegate_task` is | Add `teamRunId`; consider closed assignments |
| 2026-10-09 | Code | `…/agent-tools/task-delegation/*` | Tool surface | Strict zod input modes; parameter schema; result schema `DelegateTaskResultSchema` (strict) | New optional field and parameter |
| 2026-10-09 | Code | `…/agent-collaboration/domain/agent-team-collaboration-llm-contract.ts` | Agent-facing texts | `delegate_task` "always spawns a new copy"; `send_message_to` run-ID semantics | Update texts |
| 2026-10-09 | Code | `…/agent-communication/services/global-agent-run-message-router.ts` l.97-125 | `send_message_to(target_agent_run_id)` | Same-root targets resolved by `senderRoot.hasAgentExecution(id)` → root `deliverExactAgentMessage`; otherwise live-only path; a team run ID is not an agent execution → "not active" | Item 4 feasibility: a same-root team-run lookup is needed |
| 2026-10-09 | Code | `…/task/root-task-execution-adapter.ts` | Adapter contract (Team, Org, standalone roots) | `taskExecutionWithIngress(agentRunId)`, `containsTaskExecution`, `publishTaskExecutionsReopened`, `restoreChain` exist for all three roots | Existing-copy lookup by team run ID can use `containsTaskExecution({teamRunId})` |
| 2026-10-09 | Code | `…/projects/domain/ad-hoc-task.ts` | Task with no Project | `{taskId, description, referenceFiles, status, createdAt, updatedAt}`; created only by unowned description-only delegation | Item 5 option B would add a parent link |
| 2026-10-09 | Doc | `autobyteus-server-ts/docs/modules/projects.md` (Scope, `list_project_tasks`, Ownership, DONE, Reactivation) | Contract docs | Documents one-Task-per-run ownership, open-only assignments, reactivation table | Docs to update |
| 2026-10-09 | Doc | `tickets/done/reactivate-done-task-runs/requirements-doc.md` (SR-002) | Prior decision | DEC-003 there: "No team run ID; the run ID stays the only messaging handle"; out of scope: "Returning or messaging by team run ID" | This request deliberately revisits that decision |
| 2026-10-09 | Doc | `tickets/done/delegated-team-member-lazy-activation/followup-cleanup-ticket-brief.md` | User's motivating example | Follow-up cleanup proposed by the lazy-activation team; went to a fresh copy | Supports SCN-001 |
| 2026-10-09 | Code | `grep -rn "delegate\|assign" autobyteus-server-ts/src/api/graphql/types/project-tasks.ts`; web grep | User-facing delegation | No GraphQL mutation or UI that delegates/assigns a Task; delegation is agent-only | DEC-002 ("or the user") |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Trigger / Contract | Current Path / Lifecycle | Current Outcome / Invariants | Evidence | Confidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Contract | `delegate_task` success | Spawn → link → activate → seed | Returns coordinator ID only for a Team copy (`target_agent_run_id`), `target_kind`, `task_id?` | root-task-dispatch.ts l.70-72 | High |
| BEH-002 | Contract | `delegate_task` target | `recipient_address` only | Every call spawns a new copy; no run-ID target | task-delegation-tool-input-parsers.ts | High |
| BEH-003 | Contract | Task ownership | `owners` map, link conflict | A run belongs to at most one Task, forever | task-agent-resource-service.ts l.207-211 | High |
| BEH-004 | Contract | DONE/CANCELLED | `closeTask` → `release(closedByHostRoot)` | Stops every closed run of the Task; repeated DONE re-requests all | project-task-service.ts l.303-315 | High |
| BEH-005 | Contract | `send_message_to(target_agent_run_id)` | Same-root exact delivery by agent run ID | Team run ID not accepted | global-agent-run-message-router.ts | High |
| BEH-006 | Contract | Worker's description-only delegation | `join = {role: "delegated", creator}` | Sub-work of the worker's Task, no `task_id`, closes only with the parent Task | root-task-execution-lifecycle.ts l.119-122 | High |
| BEH-007 | Contract | `list_project_tasks` | `currentAssignments(file)` | Open `assigned` entries only; coordinator ID only | task-agent-resources.ts l.108-114 | High |

## Relevant Codebase And Technical Facts

| Path / Component | Current Responsibility | Requirement Implication | Architecture Question |
| --- | --- | --- | --- |
| `TaskAgentResourceService` | Process authority over all Task run files; one owner per run | A run must be able to appear in a closed entry of A and an open entry of B | How to derive the "current Task" of a run deterministically on load (open entry, else latest `linkedAt`) |
| `ProjectTaskService.closeAndWrite` | DONE closure and release | Releasing A must skip runs whose current Task is another open Task | Filter in `closedByHostRoot` or in release request |
| `RootTaskExecutionLifecycle.reactivateClosedTarget` | Runtime half of reactivation | Assigning B to a stopped copy needs the same settle/discard/restore and "reopened" publication | Reuse vs. generalise |
| `dispatchTaskCopy` | Spawn path | Not applicable to an existing copy (no planning/activation) | New "assign existing copy" path delivering the work packet as a message |
| Root adapters (Team, Org, standalone) | Physical trees | Copy lookup by team run ID or ingress | `containsTaskExecution`, `taskExecutionWithIngress` |

## Structural And Payload Surface Inventory

### Payload Or Content Surfaces

- Files: `<project>/tasks/<taskId>/agent_run_resources.json`, `<appData>/ad-hoc-tasks/<taskId>/{task.json,agent_run_resources.json}`.
- Readers/writers: `TaskAgentResourceStore`/`Service`, `AdHocTaskStore`, `ProjectTaskService`.
- Evidence: projects.md data shape section; task-agent-resource-schema.ts.

### Structural Surfaces

- Agent tool contracts (`delegate_task`, `send_message_to`, `list_project_tasks`, `create_or_update_task` descriptions), the runtime↔Task port, the root lifecycle (all three root kinds), the global run message router.

### Potential Structural Impacts To Investigate

- API / external contract change: Yes (tool inputs/results; additive).
- Persistence schema or invariant change: Invariant yes (a run may appear in several Task files). Entry shape likely unchanged. Option B of DEC-006 adds a parent link to Tasks with no Project.
- Security / privacy boundary: authorization rule for re-assignment (assigner only).
- Concurrency / lifecycle: Yes (link vs DONE serialization across two Tasks; wake of a stopped copy).
- Deployment / migration: expected none (existing files stay valid); to verify in design.

## Runtime, Probe, Or Reproduction Findings

| Method | Scenario | Observation | Implication | Evidence |
| --- | --- | --- | --- | --- |
| Code reading (no runtime probe needed) | Linking a run already owned by a Task | Rejected `TASK_AGENT_RESOURCE_CONFLICT` | Confirms request item 2 is impossible today | task-agent-resource-service.ts l.207-211 |
| Code reading | Repeated DONE of a Task | Re-requests stop of every closed run in the Task | Must not stop a copy that moved on | project-task-service.ts l.312 |

## Stakeholder And User Evidence

| Source | Need / Constraint | Strength | Implication | Open Question |
| --- | --- | --- | --- | --- |
| User via PTM, 2026-10-09 | Give a follow-up Task to the same team copy | Explicit | Core scope | DEC-001..005 |
| User ("option 2") | Worker can close its own helper | Explicit, "design together" | DEC-006 | Which option |
| Prior ticket reactivate-done-task-runs (SR-002) | Task status is only changed by agents; no silent status change | Approved earlier | Preserve | — |

## External Contracts, Standards, And Dependencies

None outside the repository.

## Persisted Data And State Facts

- Affected: Task agent run resource files (Project and no-Project Tasks); for DEC-006 option B, no-Project `task.json`.
- Shape: see projects.md "agent_run_resources.json".
- Volume: small per Task.
- Readers/writers: `TaskAgentResourceService` only (plus `AdHocTaskStore`).
- Unknown-field behaviour: schema is validated (task-agent-resource-schema.ts) — to check in design whether an extra field would be rejected by older readers.
- Must preserve: all existing entries and their meaning; closed work stays closed; history kept.
- Acceptable loss: none.
- Remaining gap: verify no migration needed (design).

## Product Design Request Context

- Product Design request: `Not stated`. The board already shows a Task's root; no new UI requested.

## Product Design Findings

N/A — not applicable.

## Supplemental Artifact Inventory

| Artifact | Owner | Purpose | Scope | Related IDs | Status | Approval |
| --- | --- | --- | --- | --- | --- | --- |
| None | — | — | — | — | — | — |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| U-001 | Unknown | Whether a copy currently live (stop pending) can be safely re-assigned | Race with A's release | Design: reuse reactivation's settle-release step | Open (design) |
| R-001 | Risk | Task A's board root keeps pointing to the copy; opening it shows the copy's conversation, which now continues with B | User confusion | Accept; A's root shows closed/offline | Recorded |
| R-002 | Risk | DEC-006 option B widens scope (cascade closure, messaging scope across parent/child, Temp-task listing) | Size/risk | User decision; may split | Open |

## Architecture Investigation Findings

| Date | Source / Command | Observation | Design Implication |
| --- | --- | --- | --- |
| 2026-10-09 | `projects/stores/task-agent-resource-schema.ts` | Persisted entry shape; duplicate check is per file only; a copy in two files is valid on disk | No persisted change; schema is the only module that knows persisted names |
| 2026-10-09 | `standalone-root-task-execution-adapter.ts` l.165-215 | `taskExecutionWithIngress`, `containsTaskExecution`, `getTaskExecution(reference)`; copies can be hosted inside a team (`host.hostKind === "team"`) → containment chains can include closed sub-work of the copy's previous Task | `ownerOf`: innermost linked element's current entry decides; drop cross-Task conflict |
| 2026-10-09 | `standalone-root-message-delivery.ts` l.118-153; `agent-org-run-message-delivery.ts` l.85-110; `root-team-run.ts` l.313-336 | Each root: `delegateTask` (address → placement → lifecycle) and `deliverToRunId` (exact delivery, wakes/restores) | Split root commands; deliver B's work through `deliverToRunId` |
| 2026-10-09 | `member-task-command-capability.ts`; capability builders (`team-root-materializer.ts`, `agent-org-execution-scope-builder.ts`, `standalone-root-builder.ts`, `standalone-host-member-context-builder.ts`) | Single `delegateTask` capability | Two capability commands |
| 2026-10-09 | `task-scoped-message-recipient.ts` | `ensureTaskHelper` returns the tool-level result to internal code | Internal typed target |
| 2026-10-09 | `active-collaboration-root-directory.ts` l.30 | Root boundary exposes `hasAgentExecution` | Add `teamCoordinatorOf` for the team-run hint |
| 2026-10-09 | grep identifiers in server src | `agentRun` 166×, `targetAgentRunId` 110× (mostly messaging domain, unrelated), `TaskAgentResource*` across ~55 src/test files | Mechanical rename step S1 |
| 2026-10-09 | grep `autobyteus-web` | No consumer of `delegate_task` / `list_project_tasks` results; `target_kind` hits are unrelated streaming commands | No web change |
| 2026-10-09 | `~/autobyteus_org/autobyteus-agents/agents/project-task-manager/skills/project-task-management/SKILL.md` l.49-58; `templates/board-template.md` (repo `AutoByteus/autobyteus-agents`, branch `main`) | Skill uses `target_agent_run_id` and "every delegate_task starts a new worker" | Cross-repo skill update |
| 2026-10-09 | `projects/stores/task-agent-resource-store.ts` l.55-66 (via ARCH-REV-001) | Every write re-parses the file, so one entry per copy per file is enforced before replace | AR-001: SR-005 re-link (deleting the earlier entry) withdrawn; SR-006 relaxes the per-file rule to at most one open entry per copy and appends |
| 2026-10-09 | `active-collaboration-root-directory.ts` | Directory holds all active root boundaries (`active` map) | AR-003: `findTeamCoordinator` over active boundaries |
| 2026-10-09 | `docs/design/data_migration_guideline.md` §2-3 | Prefer tolerant readers; no rewrite for cleanliness | `Directly Usable — No Migration` |

## Requirement Implications

- The one-Task-per-run invariant is the central change; DONE release and the run-tree "closed" index must follow the copy's current Task.
- The reactivation runtime step is the natural mechanism to wake a stopped copy for a new Task.
- `list_project_tasks` cannot today show the ID of a copy whose Task is DONE, which is exactly when a follow-up is assigned (DEC-005).
- Team run ID routing for messaging is feasible only for same-root senders without wider router changes (DEC-004).

## Notes For Architecture Design

See `design-spec.md` (SR-004). Approved scenarios SCN-001..008.
