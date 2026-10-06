# Investigation Notes

## Investigation Meta

- Package identifier: `task-run-resources-workspace-cleanup`
- Request / ticket: User request 2026-10-05 — Task agent run resources should disappear from the left Workspaces tree when the Project Task Manager marks the Task DONE.
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-run-resources-workspace-cleanup`
- Repository mode: `Git`
- Task worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-run-resources-workspace-cleanup` / `codex/task-run-resources-workspace-cleanup`
- Resolved base remote / branch / revision: `origin` / `personal` / `5c74fed71` (SR-008 update, 2026-10-06; originally `88851166fe8a37944381f0299bd479f20ed0f877`, fetched 2026-10-05)
- Finalization target remote / branch: `origin` / `personal`
- Bootstrap result: Worktree created with `git worktree add -b codex/task-run-resources-workspace-cleanup … origin/personal`.
- Bootstrap blocker: None
- Current solution revision ID: `SR-001`
- Investigation status: Requirements-level investigation complete; architecture investigation not started (pending approval).

## Initial Request And Clarifications

- Original request (paraphrased, voice transcript): A Project Task Manager (with Project Task tools) runs as the root to plan and delegate Tasks. Delegating creates Task agent run resources, which appear in the left Workspaces area under the root Project Task Manager run. When the Manager updates a Task to DONE, those resources are stopped and cleaned up. At that moment they should also disappear from the frontend. Otherwise, as the Manager keeps running Tasks, the list grows without bound and becomes unmanageable. "When it's created, it appears; when it's done and cleaned up, it disappears — that's more like reality."
- Clarifications received: Follow-up message "Please, I know nice." (unclear voice transcript; treated as "please proceed").
- User-supplied facts: DONE already stops/cleans up the Task's resources; rows currently remain.
- Initial ambiguity: whether hiding applies to all Task-owned runs (assigned/delegated/broughtIn), all root kinds, Team-tab message history, and an open worker conversation at the moment of DONE. Recorded as DEC-001..DEC-005 in requirements.

## Product And Domain Understanding

- Product area: Workspaces left tree (run history / execution rows) in `autobyteus-web`; Project Tasks and Task agent run resources in `autobyteus-server-ts`.
- Affected actors: User viewing the Workspaces tree; Project Task Manager (built-in agent `project-task-manager`); platform DONE closure.
- Terminology: **Task agent run resources** = records in `<appData>/projects/<projectId>/tasks/<taskId>/agent_run_resources.json` with roles `assigned` / `delegated` / `broughtIn`, each with `closedAt` (null = open). **Closed** = set by DONE, forever.

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-10-05 | Code | `autobyteus-web/components/workspace/history/AgentRunTaskRows.vue` | Tree rows under a standalone Agent run | Rows = `agentRunCollaborationStore.taskRows(runId)`; no closure filter | Architecture |
| 2026-10-05 | Code | `autobyteus-web/services/agentCollaboration/agentRunCollaborationContext.ts` (`listTaskRows`, `applyEvent`) | How rows are built and kept live | Rows built from `view.execution_tree.taskExecutions` + collaborators; live events: `agent_presentation`, `task_execution_started` (reload), `collaborator_added`, messages. No "closed/removed" event | Architecture |
| 2026-10-05 | Code | `autobyteus-server-ts/src/run-history/domain/run-execution-tree-shared-records.ts` | Durable host tree | `TaskAgentExecution`/`TaskTeamExecution` record identity/start only; "Liveness is runtime-only and never persisted"; no closure | Projection needs Task-side closure facts |
| 2026-10-05 | Code | `autobyteus-server-ts/src/projects/domain/task-agent-resources.ts`, `services/task-agent-resource-service.ts` | Closure authority | `closeTaskAgentResources` sets `closedAt` on every open entry; service keeps in-memory view (`owners`, `isOpen`, `closedByHostRoot`) | Closure is queryable per agent run |
| 2026-10-05 | Code | `autobyteus-server-ts/src/projects/services/project-task-service.ts` L110-L125 | DONE path | DONE → `closeTask` (close entries, write status) → `release.release(...)` per host root | Natural hook to notify roots |
| 2026-10-05 | Code | `autobyteus-server-ts/src/projects/runtime/task-agent-resource-release.ts` | Stop side-effect | Stops closed runs per host root; failures logged only; `null` when root not active | Stop success is not tracked durably (Q-1) |
| 2026-10-05 | Code | `autobyteus-server-ts/src/agent-collaboration/execution/task/root-task-execution-lifecycle.ts` L128-L150 | Where `broughtIn` helpers live | Helpers are Task copies (`dispatchTaskCopy`) → also task executions in host tree, not collaborator entries | All three roles appear as task-execution rows |
| 2026-10-05 | Code | `grep task_execution_started` (server) | Root kinds | Standalone agent root, Team root, Agent Org root each publish `task_execution_started` | All three root kinds show Task rows |
| 2026-10-05 | Code | `autobyteus-web/utils/agentOrgHistoryRows.ts`, team `task_executions` fixtures | Team/Org trees | Org and Team trees also flatten `taskExecutions` into rows | Same behavior needed for Team/Org roots |
| 2026-10-05 | Code | `grep -i assignment autobyteus-web/components` | Alternate navigation to worker conversations | No Task UI lists assignments/worker runs | After hiding, no in-app navigation to a closed worker's conversation (data still on disk) |
| 2026-10-05 | Doc | `tickets/done/project-task-manager-linked-delegation/requirements-doc.md` REQ-BL-009 Q-2, B-3, B-5, REQ-008 | Prior approved behavior | Q-2: "Closed assignments and workers' internal delegated/broughtIn runs are not listed [by list_project_tasks]; **they stay visible in the app's run views**." B-3 closed forever; REQ-008 DONE preserves conversations/history | This request intentionally reverses the "stay visible" clause for the Workspaces tree; REQ-008 data preservation stays |
| 2026-10-05 | Doc | `tickets/done/task-agents-workspace-tree-ux/requirements.md` REQ-TWU-010 / AC-TWU-008 | Prior tree UX | "Transient rows must disappear when their backing projection node is removed" — prior precedent for disappearing transient rows | Consistent with request |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger | Current Path / Lifecycle | Current Outcome | Evidence | Confidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User/System | Manager `delegate_task` with `task_id` (and workers' sub-delegation / helper bring-in) | Server links run resource (`starting`) → starts run → host root publishes `task_execution_started` → web reloads collaboration view → row appears under root run | Row appears live | Source log rows 2, 7, 8 | High |
| BEH-002 | System | Manager updates Task to DONE | Server closes all open resources, writes status, asks host root to stop them; status events turn rows Offline | Rows remain in tree indefinitely (Offline) | Rows 4-6; user report | High (code); user-observed |
| BEH-003 | User | User reloads app / restarts / opens a stopped root | Stored execution tree read (`agentRunCollaboration` inspect) | All historic task rows shown, incl. closed ones | Rows 2-3 | High |
| BEH-004 | System | DONE when host root not active | Release returns `null`; closure still committed | Rows still listed when root later viewed | Row 6 | High |
| BEH-005 | User | Description-only `delegate_task` (no Task) / user `@` collaborators | Rows appear; no DONE concept | Rows remain | Rows 2, 7 | High |

## Relevant Codebase And Technical Facts

| Path | Responsibility | Requirement Implication | Architecture Question |
| --- | --- | --- | --- |
| `TaskAgentResourceService` | Sole authority of closure (`closedAt`) | Closure is the right trigger, independent of stop success | How do root views query closure (port `isOpen`)? |
| Host execution tree (run-history) | Durable record of task executions | Must not be deleted (REQ-008 history preservation) | Filter at projection vs. flag + client filter |
| Collaboration stream (`AgentRunCollaborationEventDto`, team/org equivalents) | Live tree changes | Needs a live signal for closure | New event vs. checkpoint reload |
| `agentRunCollaborationContext.assertMessagesCorrelated` | Requires message participants to be in index | Hiding runs must not break Team-tab history (DEC-003) | Separate "visible rows" from "participant index" |

## Structural And Payload Surface Inventory

- Payload surfaces: `agent_run_resources.json` (read only; no schema change expected); run-history execution tree files (no change expected).
- Structural surfaces: collaboration view projectors (standalone/Team/Org), collaboration stream event contracts (`autobyteus-collaboration-stream-contracts`, team stream contracts), web contexts/stores for the three root kinds, Task DONE path.
- Potential impacts: stream contract addition (likely); no persistence schema change expected; lifecycle: closure notification from Task side to active roots.

## Persisted Data And State Facts

- Affected: none written. Closure already persisted in `agent_run_resources.json` (kept on Task delete).
- Must preserve: execution tree records, conversations, workspaces (REQ-008 of prior ticket).
- Damaged resource file: closure unknown for that Task (existing Q-3 error surface).

## Product Design Request Context

- Product Design request in the current input: `Present` (user, 2026-10-05, after SR-001 was presented).
- User's requested outcome, in the user's own terms: "@Product Team could you ask ui to work on UI first then" — the user wants the Product Team UI/UX designer to work on the UI for this change before requirements approval and architecture design.
- Requirement / behavior IDs involved: BEH-002–004, REQ-001–006, REQ-008, REQ-009, AC-001, AC-004, AC-008, AC-009; open DEC-001–006.
- Product decision / experience to understand or evolve: how the left Workspaces tree should behave when a Task is DONE and its agent run rows go away (removal moment and feedback, Team/Org root trees, an open worker conversation at DONE, Manager Team-tab message history with hidden runs, whether any access to finished work remains).
- Critical journey and states: Manager root run with live Task rows → Task DONE → rows removed; reload/restart; reopen-and-redelegate; non-Task rows unchanged.
- Known constraints and non-goals: no data deletion; DONE closure semantics unchanged; non-Task delegations and `@` collaborators unchanged; visibility follows DONE, not stop success.
- Relevant existing frontend context: `autobyteus-web/components/workspace/history/AgentRunTaskRows.vue`, `WorkspaceTransientExecutionRow.vue`, `WorkspaceTeamExecutionTree.vue`, `WorkspaceAgentOrgHistoryCollection.vue`; prior tree UX ticket `tickets/done/task-agents-workspace-tree-ux/`.
- Product Design request artifact: `product-design-request.md` in this ticket folder.
- Separate design repository/ticket: Not yet established (Product-owned).

## Product Design Findings

- Round 1 received 2026-10-05 from `/product_team/product_ui_ux_designer` (run `product_ui_ux_designer_08171b735f2a40d78ad7b5ab23126f8c`). Status: Awaiting User Review; nothing approved.
- Package (external, Product-owned): `/Users/normy/autobyteus_org/autobyteus-web-design-worktrees/task-run-resources-workspace-cleanup/tickets/in-progress/task-run-resources-workspace-cleanup/review-round-1.md`; `product-ticket.md`; evidence `review-evidence/round-1/R1-00..R1-05` (non-normative).
- UI reference: design repo `/Users/normy/autobyteus_org/autobyteus-web-design`, branch `design/task-run-resources-workspace-cleanup` @ `d750cc2`; review URL `http://127.0.0.1:4530/workspace?prototypeReview=task-run-cleanup`.
- Explicit user confirmation: Pending.
- Proposals: fade + height collapse 200 ms ease-out (instant under reduced motion; alternative Instant); all Task runs removed; open worker conversation → back to Manager (alternative "Stay, read-only" with notice); Team tab keeps every message; no in-app access to finished work; same rule/motion for Agent/Team/Org roots (only Agent root built).
- ID mapping note: the Product package labels differ from `requirements-doc.md`. Its "DEC-001 how rows leave" is a new UX decision (no SR-001 ID; proposed DEC-007 on integration); its "DEC-004 access to finished work" corresponds to the R-002 / out-of-scope archive question; its "DEC-006 root kinds" corresponds to requirements DEC-004. Canonical IDs are reconciled at integration.
- Mocked boundaries: Manager run stored/Offline; worker statuses illustrative; DONE triggered from a simulation panel, not a real tool call/Projects page; Team/Org roots specified, not built.
- Requirements sections affected on approval: REQ-002 (motion), REQ-009 (fallback), REQ-008, UI section, DEC table.

### Final Product result (2026-10-06, supersedes round 1)

- Status: Design Completed; user confirmation 2026-10-06 "perfect. i like the UI. now i confirm". Round-1 review panel/switches rejected and removed.
- Spec: `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/task-run-resources-workspace-cleanup/ui-ux-spec.md`; ticket `product-ticket.md`; VIS-001–008.
- Verification by Solution Designer: design repo HEAD = origin/personal = `a38bd6edf0cdd66eba80effd3597a43291614c0d`; spec and ticket agree on repo, ticket, base `6718986`, pin `10fb695`; spec links runnable reference and VIS-001–008 (all 8 files present); confirmation quoted. Minor: spec says port 4530, handoff says 3210 — port is incidental.
- New user-requested visual change: clean delegated rows (REQ-010).
- Product closure notice (2026-10-06): Product ticket closed; design repo `personal` @ `a38bd6e` in sync; ticket worktree removed, review server on 4530 stopped; branch `design/task-run-resources-workspace-cleanup` kept. Runnable reference now from the canonical design repo. Further UI changes go to Product as a new request.
- Source check: `WorkspaceTransientExecutionRow` is used by `AgentRunTaskRows.vue` and `WorkspaceTeamExecutionTree.vue`; Agent Org rows built via `utils/agentOrgHistoryRows.ts` — Org rendering path to verify in architecture.

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/task-run-resources-workspace-cleanup/ui-ux-spec.md` (+ `visual-references/VIS-001–008`, `product-ticket.md`) | Product Team (external) | Approved UI/UX spec | Tree removal, motion, focus, selection, row style | REQ-001–010, AC-001–011 | Approved @ design repo `a38bd6e` | Behavior-defining; part of SD-AP-001 basis |
| `product-design-request.md` (this folder) | Solution Designer | Product request context | Request only | DEC-001–006 | Sent / closed | Not behavior-defining |
| `design-review-report.md`, `architecture-review-revision-record.md` (this folder) | Architecture Reviewer | ARCH-REV-001 | Design review | AR-001–AR-004 | Fail (Design Impact) | Review evidence |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| U-001 | Unknown | Exact live-update mechanism per root kind | Design | Architecture phase | Open |
| R-001 | Risk | Team-tab message history references hidden runs; current client asserts participant correlation | Could throw on reload if naively filtered | Architecture phase; DEC-003 | Open |
| R-002 | Risk | Hidden runs lose in-app navigation to their conversations | User may later want history access | DEC-003 user decision; data preserved on disk | Open |

## Architecture Investigation Findings

- Project design guideline: `DESIGN.md` (repo root), `TESTING.md`; skill `design-principles.md`. Conflicts: none.

Architecture evidence (2026-10-06, base `88851166f`):

| ID | Source | Finding | Design implication |
| --- | --- | --- | --- |
| AE-01 | `autobyteus-collaboration-stream-contracts/src/root-execution-view-dtos.ts` (`validateAgentRootCorrelation`, Org superRefine) | Every message sender/receiver must be an identity in the projected tree; Org active roots require a status for every tree agent. | Do NOT drop closed runs from the tree DTO (breaks Team-tab history REQ-008 and the contract). Closure is a separate fact. Resolves R-001. |
| AE-02 | `autobyteus-server-ts/src/services/agent-streaming/collaboration-execution-tree-dto-projection.ts` header | "every public concrete child is projected, never filtered". | Keep tree projection unchanged; add a closure list beside it. |
| AE-03 | `projects/domain/task-agent-resources.ts` | Each entry has `hostRoot {rootSubjectKind, rootRunId}`, `agentRun`, `closedAt`. | Task side answers "closed agent runs hosted in root X" from memory. |
| AE-04 | `agent-collaboration/execution/task/task-agent-resource-port.ts`; `compositions/project-task-agent-resource-composition.ts` | Process-wide neutral port already given to `standalone-root-builder.ts`, `agent-org-execution-scope-builder.ts`, `agent-team-run-manager.ts`. | Add one read to the port. |
| AE-05 | `root-task-agent-resource-scope.ts` `releaseTaskAgentResources`; `standalone-agent-run-root.ts:189`, `root-team-run.ts:193`, `agent-org-run.ts:163` | DONE → `TaskAgentResourceRelease` → `activeRootDirectory.resolve(hostRoot).releaseTaskAgentResources(refs)` reaches the shared scope of each active root with exactly that root's closed refs; inactive roots: `null`. | Single shared place to publish a live "closed" event for all three roots. |
| AE-06 | `publishTaskExecutionStarted` adapter option (standalone, Org); Team `task-execution-event-factory.ts` | Start events go through per-root adapter callbacks into each root's sequenced publisher. | Mirror with a closed-event callback. |
| AE-07 | `openPackageSnapshotConnection()` in the three roots; stored reads `standalone-agent-run-root-manager.ts:201` `getInspection`, `agent-org-run-manager.ts:150` `getInspection`, `run-history/services/team-run-history-service.ts:56` `getTeamRunResumeConfig` | Live snapshots are atomic with `baseChangeSequence`; stored reads differ per root (Team returns raw tree inside resume config; web `teamRunContextHydrationService.ts` builds the view from it). | Closure list in each live snapshot and each stored read. |
| AE-08 | Web: `agentRunCollaborationContext.ts` (`listTaskRows`; participant index separate), `teamExecutionViewState.ts` + `teamExecutionTreeSelectors.ts` (`projectNavigationRows`), `agentOrgExecutionContext.ts` + `WorkspaceAgentOrgHistoryCollection.vue` rows | Each root kind lists rows from its own context. | Filter row listing only; keep indexes/participants. |
| AE-09 | `WorkspaceTransientExecutionRow.vue` (dashed `border-indigo-200 bg-indigo-50/40`, `ring-1 indigo-300`, dashed bolt box) used by `AgentRunTaskRows.vue`, `WorkspaceTeamExecutionTree.vue`; Org task rows inline in `WorkspaceAgentOrgHistoryCollection.vue` (already gray-600/gray-50; task Team icon `user-group` indigo-600) | **Discrepancy with Product statement** that all three roots share the row component: Org renders its own task rows. | REQ-010 for Org: bolt slate-500 icon and 2px indigo-500 focus ring in the Org collection. |
| AE-10 | `stores/agentRunCollaborationStore.ts` `publish` | Selection cleared when the selected child is absent → host conversation shown. | Extend to "not listed" and to live closed events. |
| AE-12 | `utils/agentOrgHistoryRows.ts:197`; `run-history/services/collaboration-root-history-service.ts` `projectAgentOrg` (ARCH-REV-001 AR-001) | Org rows render from the history item's unfiltered tree before the context hydrates. | The history item needs closure too (SP-3). |
| AE-13 | `listNavigationRows()` consumers: `stores/runHistoryTeamExecutionRows.ts`, `TeamMembersPanel.vue`, `RunningTeamRow.vue`, `tokenUsageTeamMemberRows.ts`, `useMobileTeamMemberFocusCoordinator.ts` (AR-002) | Shared by surfaces outside the Workspaces tree. | Filter only at the tree consumer. |
| AE-14 | `buildRunHistoryTeamExecutionRows` without context returns stable rows only; Agent-root task rows come only from the collaboration context | No other history-list path renders task rows. | Only the Org history item needs the field. |
| AE-15 | SR-008 worktree update (2026-10-06): `git stash push -u` → backup ref `refs/backup/task-run-resources-workspace-cleanup-wip-2026-10-06` = `6bb56c8d1` → `git merge --ff-only origin/personal` (`88851166f`→`5c74fed71`) → `git stash apply`. No conflicts; 102 changed/untracked entries restored. `WorkspaceTransientExecutionRow.vue` now has no local diff (the restyle is upstream via `c21d312c0`). `WorkspaceAgentOrgHistoryCollection.vue` keeps only the TransitionGroup/leave-hook hunks. Drift `88851166f..5c74fed71` in design-owned paths: the restyle files and tests, `projects/services/project-service.ts` + `domain/models.ts`/`project-errors.ts` (Project authoring tool; not the Task closure path), and the new `agentOrgExecution/agentOrgLaunchService.ts` (launch). | No design impact; the stash is kept until the implementation is committed. |
| AE-16 | Full read of `DESIGN.md` (336 lines) and package `autobyteus-web/AGENTS.md` / `autobyteus-server-ts/AGENTS.md` on 2026-10-06. Earlier design rounds had read only `DESIGN.md` lines 1–~150 because the tool output was truncated. | "Project-specific design documents" requires updating the touched area contract `autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md`. Its "Team Server Messages" lists `TASK_EXECUTION_STARTED` but not the new `TASK_EXECUTIONS_CLOSED` or the snapshot field. The package AGENTS.md files add only test/git conventions. | Add the protocol-doc update to scope (SR-009). |
| AE-17 | `DESIGN.md` "Before accepting a design" (historical/global work and nested-loop scaling) and the anti-pattern "Whole-history publication"; `projects/services/task-agent-resource-service.ts` (`files`/`owners` maps updated only in `swap()`) | A per-call scan of all Task resource entries, multiplied by Org history rows (AR-001), is O(Orgs × entries) on history-list load. | Use a per-host-root closed map derived in `swap()` (same owner, same single update point); state the scaling (SR-009). |
| AE-11 | `agentOrgExecutionContext.ts:117` | Org selection becomes null when the selected agent is not selectable. | Reuse for closed rows. |

## Requirement Implications

Closure (`closedAt`) is the authoritative, durable, per-run fact matching the user's "done → disappear". It is independent of stop success and survives restart and Task deletion, so the tree can be consistent live and after reload.

## Notes For Architecture Design

Map SCN-001..SCN-004. Verify: projection placement for the three root kinds; live signal; client index vs. visible rows; selection fallback.
