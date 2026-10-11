# Design Review Report — delegated-copy-task-locator

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-task-locator/tickets/in-progress/delegated-copy-task-locator/requirements-doc.md` (Approved, SR-002)
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-task-locator/tickets/in-progress/delegated-copy-task-locator/investigation-notes.md`
- Upstream Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-task-locator/tickets/in-progress/delegated-copy-task-locator/solution-revision-record.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-task-locator/tickets/in-progress/delegated-copy-task-locator/design-spec.md` (Ready, SR-003)
- Supplemental Task Artifacts Reviewed: Product `ui-ux-spec.md`, `product-ticket.md`, `VIS-001..014` (design repo `personal` @ `b08ddf6`), via the requirements/investigation references. `approval-request.md` (historical) noted.
- Relevant Solution Revision IDs: `SR-001`, `SR-002`, `SR-003`
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-task-locator/tickets/in-progress/delegated-copy-task-locator/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-002`
- Current Review Round: `2`
- Trigger: re-review of design revision SR-003 (`handoff-design-revision-sr-003.md`), which responds to ARCH-REV-001
- Prior Review Round Reviewed: round 1 (`ARCH-REV-001`, Fail, AR-001..AR-004)
- Latest Authoritative Round: `2`
- Current-State Evidence Basis: round 2 rechecked the SR-003 changes against `project-task-service.ts` (`readTaskChangeView`, `readTaskAt`), `projectTaskStore.ts` (read flags, epochs, `connected` re-read), `WorkspaceHistoryWorkspaceSection.vue` (`selectAgentRun`), and `AgentRunTaskRows.vue`. Round 1 basis: worktree `codex/delegated-copy-task-locator` @ `359d2c0ef` (= base `origin/personal`). Files read:
  - Server: `task-execution-resource-service.ts`, `project-task-service.ts`, `project-service.ts` (`deleteProject`), `project-store.ts` (`readTask`, `deleteProject`), `project-change-publisher.ts`, `project-change-messages.ts`, `task-execution-reference.ts`.
  - Web: `projectChangeFeed.ts`, `useProjectChangeFeed.ts`, `projectTaskStore.ts`, `projectsPanelStore.ts`, `ProjectsPanel.vue`, `ProjectTaskBoard.vue`, `TempTaskBoard.vue`, `WorkspaceToolShell.vue`, `pages/workspace.vue`, `pages/chat.vue`, `WorkspaceAdaptiveLayout.vue`, `layouts/default.vue`, `AgentRunTaskRows.vue`, `WorkspaceTeamExecutionTree.vue`, `WorkspaceHistoryWorkspaceSection.vue`, `useWorkspaceHistorySelectionActions.ts`, `WorkspaceAgentRunsTreePanel.vue`, `runHistoryTypes.ts`, `agentRunCollaborationContext.ts` (`isListed`).
  - Repository `DESIGN.md`.

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Classification rationale reviewed: two packages; a new public GraphQL query; new client cached state with live invalidation and feed retention; a request that crosses the tree, shell, panel, boards and cards; a shared row that another branch is changing at the same time.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: none.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood: yes. A delegated copy row shows its current Task's summary, and clicking the summary locates the Task on the board in the right panel's Projects tab. The lookup uses server data and stays live. Agent and Team hosts only (DEC-001 b). On a page with no right panel, the row's run opens first (DEC-002 a).
- Relevant existing behavior and evidence confirmed:
  - `rootTaskLocationOf` returns the copy's current Task only when the copy is that Task's latest `assigned` entry (`task-execution-resource-service.ts:211-217`).
  - Every committed resource write and every metadata write publishes `task_upserted` with the full Task and its `root`. Task deletes publish `task_removed`.
  - The feed is a ref-counted singleton. It reconnects on node rebind, and every `connected` frame re-reads.
  - `revealTool` is provided by inject inside the shell only. The shell mounts on `/workspace`, `/chat?id=…`, and the start surfaces (`/chat` new, Org launch).
  - The boards keep their filters locally and force a re-read on mount.
  - `onSelectTeam` toggles a team run that is already selected.
- Scope guardrail confirmed: In-Scope UC-001..UC-005; Out of Scope (Org rows, `/projects` pages, row icon/header chip, server rule/feed schema changes); Preserved BEH-002/006/007/008; Review Authority.
- Approved change, preserved behavior, and outside scope understood: yes.
- Every prospective blocking `Design Impact` finding is traceable to an approved requirement, acceptance criterion, or preserved-behavior ID: `Yes`. Round 1's AR-001 traced to REQ-009/AC-015/QR-001 and AR-002 to REQ-012/AC-020. Round 2 raises no new findings.
- Remaining material ambiguity: none.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-002 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-003 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-004 | Contract | Pass | Pass | Pass | Confirmed | — |
| BEH-005 | System | Pass | Pass | Pass (SR-003: `project_removed` invalidation; the server read uses `readTaskChangeView`, so a missing Task or Project gives null; per-key epochs) | Confirmed | — |
| BEH-006 | System | Pass | Pass | Pass | Confirmed | — |
| BEH-008 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-009 | User | Pass | Pass | Pass (SR-003: Agent host `open-run` → `selectAgentRun`; `drop` removed; boards decide only on a settled list) | Confirmed | — |

The behavior basis is confirmed and every row is `Confirmed` in round 2. The requirements need no change.

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| Product `ui-ux-spec.md` + `VIS-001..014` | Pass | Pass | Pass | Pass. The reference mechanics (`taskLocatorStore` timing window, client scan) are recorded as non-normative. | Pass (user-approved 2026-10-11) | — |
| Product `product-ticket.md` | Pass | Pass | Pass | Pass | Pass (record) | — |
| `approval-request.md` | Pass (historical) | Pass | N/A | Superseded by SR-002 | Pass | — |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Feature posture; structural triggers walked | — |
| Root-cause classification is explicit and evidence-backed | Pass | `No Design Issue Found`. The existing owners absorb the work: the server index on `ProjectTaskService`, and the feed. | — |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Only the `onSelectTeam` → `openTeam` core split (AF-010, verified at `useWorkspaceHistorySelectionActions.ts:69-104`) | — |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | Appears in the file mapping, the removal plan and sequence step 5 | — |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | Ownership Is Clear? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Host tree → server → summary | Pass | Pass | Pass (resolver is thin over `ProjectTaskService`) | Pass | Pass | Pass | Pass |
| DS-002 | Summary → shell → panel → board → card | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Feed → cache invalidation | Pass | Pass | N/A | Pass | Pass | Pass | Pass (AR-001 resolved) |
| DS-004 | No-shell page → open run → DS-002 | Pass | Pass | Pass | Pass | Pass | Pass | Pass (AR-002 resolved) |
| DS-005 | Locator request state machine | Pass | Pass | N/A | Pass | Pass | Pass | Pass (AR-004 resolved: `drop` removed) |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `ProjectTaskService.currentTasksOfTaskWorkers` | Pass | Pass | Pass | Pass | The resolver → `TaskExecutionResourceService` shortcut is explicitly forbidden |
| `taskWorkerTaskStore` | Pass | Pass | Pass | Pass | Components never run the query or touch the feed |
| `taskLocatorStore` | Pass | Pass | Pass | Pass | The tree never calls `projectsPanelStore.choose` directly |
| `WorkspaceToolShell` | Pass | Pass | Pass | Pass | `revealTool` stays inject-scoped; the shell observes the store |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Tree ↔ Projects surfaces | Pass | Pass | Pass | Pass | They connect only through the two stores |
| `projectChangeFeed` → `taskWorkerTaskStore` | Pass | Pass | Pass | Pass | Same fan-out pattern as the existing two stores |
| Row data (`AgentRunTaskTreeRow`) | Pass | Pass | Pass | Pass | No Task data is added there and `teamStatus` is unchanged (QR-003) |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| GraphQL `taskWorkerTasks(agentRunIds, teamRunIds)` | Pass | Pass | Pass (two typed lists; the result carries `workerKind`) | Low | Pass |
| `ProjectTaskService.currentTasksOfTaskWorkers(TaskExecutionReference[])` | Pass | Pass | Pass (`{agentRunId}` \| `{teamRunId}`, verified type) | Low | Pass. A missing Task or Project gives null; per-worker isolation is specified. |
| `taskWorkerTaskStore.retain/taskOf/applyChange` | Pass | Pass | Pass | Low | Pass |
| `taskLocatorStore` API | Pass | Pass | Pass (`seq`) | Low | Pass |
| `onOpenTeamRun(team, workspaceId)` | Pass | Pass | Pass | Low | Pass |
| `WorkspaceHierarchyBranches` `anchor` prop | Pass | Pass | Pass | Low | Pass |

`workerKind: String!` could be a GraphQL enum. This is optional and not a finding.

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Worker → Task answer | Pass | Pass | N/A | Pass | O(1) server index |
| Liveness | Pass | Pass | N/A | Pass | The existing feed carries `root` |
| Worker cache | Pass | Pass | Pass | Pass | A different subject and lifecycle from `projectTaskStore` |
| Locate request | Pass | Pass | Pass | Pass | Crosses component trees that share no ancestor |
| Reveal / picker / highlight / summary text | Pass | Pass | N/A | Pass | All reused |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Server Projects | Pass | Pass | Pass | Pass | — |
| Web Projects data | Pass | Pass | Pass | Pass | — |
| Web Projects UI | Pass | Pass | Pass | Pass | Steps run in compact mode only |
| Web layout shell | Pass | Pass | Pass | Pass | — |
| Web workspace history | Pass | Pass | Pass | Pass | — |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Summary button | Pass | Pass | Pass | Pass | — |
| `useTaskWorkerTasks` (Agent + Team hosts) | Pass | Pass | Pass | Pass | AR-003 resolved |
| `TaskWorkerRef` / `TaskWorkerTask` types | Pass | Pass | Pass | Pass | — |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `TaskWorkerTaskView` | Pass | Pass | Pass | N/A | Pass | `projectId` null ⇔ Temp task |
| `TaskWorkerTask` (client) | Pass | Pass | Pass | N/A | Pass | — |
| `TaskWorkerRef` | Pass | Pass | Pass | N/A | Pass | — |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Responsibilities Were Re-Tightened After Shared-Structure Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Server domain / service / resolver | Pass | Pass | N/A | Pass | — |
| `taskWorkerTaskStore.ts`, `taskLocatorStore.ts`, `useTaskWorkerTasks.ts` | Pass | Pass | Pass | Pass | — |
| Shell / panel / boards / card | Pass | Pass | N/A | Pass | — |
| Tree row files, `onOpenTeamRun` / `open-run` wiring | Pass | Pass | N/A | Pass | AR-002 resolved |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| New stores / composable / component | Pass | Pass | Low | Pass | Flat, follows existing convention |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `onSelectTeam` already-selected branch duplication | Pass | Pass | Pass | Pass | `openTeam` core |
| Dead code in touched files | Pass | N/A | Pass | Pass | Delegated to the implementer, who records it with evidence |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Client fallback scan | No (rejected) | Pass | Pass | — |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? | Direct Use, Rebuild, Or Migration Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Server Task / resource files | Not Affected | Pass | Pass | N/A | Pass | Read only |
| Projects tab choice (localStorage) | Not Affected | Pass | Pass | N/A | Pass | Same key and shape through `choose()` |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Steps 1–3 before the aggregate-status merge; rows after the rebase | Pass | Pass (no temporary seams) | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Query shape | Yes | Pass | Pass | Pass | — |
| Invalidation / Project deleted | Yes | Pass | Pass | Pass | "Project deleted" example added |
| Row markup (QR-003) | Yes | Pass | Pass | Pass | — |
| Locate request steps | Yes | Pass | Pass | Pass | — |

## Material Premise Validation (Only When Needed)

### `P-001` — A Project that contains a shown worker's Task is deleted

- Related approved requirement or established contract: REQ-009 ("a Task … deletion updates (or removes) the summary without a reload"); AC-015; QR-001 (one batched read).
- Relevant behavior ID(s): BEH-005, BEH-004.
- Initiating basis kind: `User`.
- Independent product-supported initiating trigger: the user deletes a Project from its Project detail page (`ProjectDetail.vue:278` → `projectStore.deleteProject`). This is an existing, supported Projects action, and nothing blocks it while Tasks are open.
- Support evidence: exposed surface `/projects/<id>` detail page; supported action "Delete project".
- Forward production path:
  1. `projects.ts deleteProject` → `ProjectService.deleteProject` → `ProjectStore.deleteProject`. The store removes `project.json` and every Task's metadata and context, but it "keeps agent run resources" (`project-store.ts:117-130`; comment on `project-service.ts:182-185`).
  2. Only `projectRemoved(projectId)` is published, so the feed sends `project_removed`. No `task_removed` is sent per Task.
  3. `TaskExecutionResourceService` is not told (no `forget`). The copy's current entry still points at the Task, and `rootTaskLocationOf` still returns its location.
  4. The copy's open entry is not closed, so `isListed` keeps the copy row in the tree.
- Lifecycle preconditions and material consequence:
  - (a) DS-003 handles only `connected` / `task_upserted` / `task_removed`, so the row keeps the deleted Task's summary. Clicking it chooses a Project that no longer exists. `projectsPanelStore.choice` then falls back to the default Project, the Task isn't there, and the locate fails.
  - (b) On any later read that includes this worker (every `connected`, any re-read in the same batch), `ProjectStore.readTask` throws `PROJECT_NOT_FOUND` (`requireProject`, `project-store.ts:84-86`). The design doesn't specify handling for this. If the error propagates through the batched resolver (`withProjectErrors`), the whole batch fails, and every summary in it is missing or stale, not just this worker's.
- Reachability: `Reachable`.
- Review consequence / proportionate response: AR-001. Resolved in SR-003 (server null via `readTaskChangeView`; `project_removed` invalidation; tests).

### `P-002` — The board finds the located Task missing from its loaded list (`drop` branch of DS-005)

- Related approved requirement or established contract: REQ-007 / REQ-006 (locate outcome). No requirement defines a "Task missing" outcome.
- Relevant behavior ID(s): BEH-009.
- Initiating basis kind: `User` (summary click).
- Independent product-supported initiating trigger: the user clicks a summary whose Task is no longer in its scope's list. The only supported way to get there that I found is P-001: a deleted Project, after which the picker falls back to another Project.
- Forward production path: summary click → `taskLocatorStore.locate` → `choose(scope)` → the board of the chosen scope finishes its read → the Task is absent.
- Lifecycle preconditions and material consequence: after AR-001 is fixed, the summary is removed when `project_removed` / `task_removed` arrives. The only way left is a click inside the feed-latency window, concurrent with a deletion. Two independent actions don't make a supported concurrent workflow (design-principles §6). Also, the board force-re-reads on mount (`ProjectTaskBoard.vue onMounted load(true)`) and keeps showing a cached, possibly stale list (`hasLoaded` true) while that read is in flight. A `drop` evaluated against that snapshot could fire wrongly.
- Reachability: `Reachable` only through P-001 today; otherwise `Not Reachable`.
- Review consequence / proportionate response: AR-004 (Low). Resolved in SR-003. The `drop` branch is gone, so nothing depends on this premise. A request whose Task is absent simply expires after 10 s; that expiry is justified by DS-004's route and mount timing and by a run that fails to open.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

- `Pass`. The behavior basis is confirmed. AR-001..AR-004 are resolved in the current `design-spec.md` (SR-003). No in-scope machinery depends on an unsupported premise. The design is ready for implementation, subject to the landing constraint: the tree-row work (step 5) waits for `codex/delegated-team-aggregate-status`.

## Findings

None open. Round 1 findings AR-001..AR-004 are resolved; see the `ARCH-REV-002` prior-finding resolution table in `architecture-review-revision-record.md`.

## Classification

N/A (Pass).

## Recommended Recipient

`/software_engineering_team/implementation_engineer`

## Residual Risks

- RSK-001: overlap with `codex/delegated-team-aggregate-status`. Mitigated by sequence step 4 and QR-003.
- Out-of-order batched responses: addressed in SR-003 by per-key read epochs.
- Implementation note on the boards' "no read in flight" condition. SR-003 expresses it as `initialPending` and `refreshPending` both false. Two details for the implementer:
  - The board's locate watcher must not run before its own mount read has started. Otherwise the flags are still false and the board would decide on the cached snapshot. Run it after `load(true)`, or treat "the mount read hasn't completed" explicitly.
  - A `connected` re-read (`startRead(id, false)`) leaves both flags false while it is in flight. This matters only when a reconnect coincides with a click, which is not a supported concurrent workflow, so it is not a finding.

  Component tests should cover the just-mounted board.
- Per-worker reads use `readTaskChangeView`, which builds the full view, including a stat of each context file. The cost is bounded by the shown workers and acceptable.
- A worker that hits an unexpected server error answers null and the error is logged. That worker's summary is hidden until the next re-read, which is acceptable batch isolation.
- DS-004 depends on the run opening and its shell mounting within the 10 s expiry. If a run open fails (for example `ArchivedAgentRunOpenError`), the locate silently expires. This is acceptable and covered by browser validation.
- Scroll and focus timing in the drawer and tab-mount cases. Browser validation is planned.
- The `/ws/projects` socket stays open while Task workers are shown. Accepted (ref-counted).

## Latest Authoritative Result

- Review Decision: `Pass` (round 2, `ARCH-REV-002`)
- Material-Premise Gate: `Pass`. P-001 drove AR-001, which is resolved. P-002's branch was removed.
- Notes: the next recipient is `/software_engineering_team/implementation_engineer`. Steps 1–3 can start now; the tree rows (step 5) wait for the aggregate-status merge and a rebase.
