# Design Review Report — `project-manager-ux`

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-manager-ux/tickets/in-progress/project-manager-ux/requirements-doc.md` (SR-003, Approved 2026-10-07)
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-manager-ux/tickets/in-progress/project-manager-ux/investigation-notes.md` (A1–A14)
- Upstream Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-manager-ux/tickets/in-progress/project-manager-ux/solution-revision-record.md` (SR-001..SR-004)
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-manager-ux/tickets/in-progress/project-manager-ux/design-spec.md` (SR-005 design revision; round 1 reviewed SR-004)
- Supplemental Task Artifacts Reviewed:
  - `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/project-manager-ux/ui-ux-spec.md`, rounds 1–2 (behavior-defining). VIS-001..018 are present.
  - `product-design-request.md`, `product-design-request-r2.md` (context only).
- Relevant Solution Revision IDs: `SR-003` (requirements, unchanged), `SR-004` (round-1 design), `SR-005` (current design)
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-manager-ux/tickets/in-progress/project-manager-ux/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-002`
- Current Review Round: `2`
- Trigger: SR-005 `Architecture Design Complete` (design revision for ARCH-REV-001), from `/solution_designer` (2026-10-07). The re-review is limited, as round 1 proposed, to AR-001..004 and the sections they touch.
- Prior Review Round Reviewed: Round 1 / `ARCH-REV-001` (`Fail`)
- Latest Authoritative Round: `2`
- Authorities read for this review (2026-10-07):
  - `design-principles.md` and `references/design-examples.md` (all, including Examples 9–10);
  - the worktree's full `DESIGN.md` and `TESTING.md`.
- Current-State Evidence Basis: worktree `codex/project-manager-ux` at `3cc7e05c4`, whose parent is `origin/personal@7d130309e`, which includes `reactivate-done-task-runs`. Read directly:
  - Task side: `projects/services/project-task-service.ts`, `project-service.ts`, `task-agent-resource-service.ts` (`load`/`swap` call sites), `stores/task-agent-resource-schema.ts`.
  - Write call sites: every Project/Task store write outside `projects/stores` is reached only through `ProjectService`/`ProjectTaskService` (grep).
  - Runtime: `active-collaboration-root-directory.ts`; `standalone-agent-run-root.ts` (`onAgentExecutionEvent`, `getAgentStatusSnapshots`); `configured-agent-execution-handle.ts` (`bindEvents`, `getStatusSnapshot`); `configured-agent-status-overlay.ts`.
  - Web: `useWorkspaceHistorySelectionActions.ts`, `WorkspaceAgentOrgHistoryCollection.vue`, `workspaceNavigationService.ts`.

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Classification rationale reviewed: Yes. The change adds:
  - a new realtime contract (`/ws/projects`);
  - an optional persisted field;
  - a cross-subsystem status query (Task side → active roots);
  - event/snapshot concurrency on the web;
  - about 30 files across the server, a contracts package and the web.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: None

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood: Yes.
  - Projects list, board and Task page follow agent and UI writes live, with a 2.4 s highlight.
  - Each delegated Task shows one root, the latest `assigned` entry, with the worker's own status mirroring the left panel (DEC-006), or Couldn't start.
  - DONE → Offline, not openable. After the agent reopens the Task, the root stays Offline until the worker is messaged (DEC-008).
  - A root is openable exactly when its worker is listed in the left panel (REQ-009).
  - Temp tasks get a header button, an Open/Done board and a read-only page, all live.
  - F-006 click fix.
  - No Manager UI; no automatic status changes.
- Relevant existing behavior and evidence confirmed: Yes.
  - Writes funnel through the two services (A2, re-verified by grep).
  - `swap()` is the run-resource commit point (A3). It is also called by `load()` for every file at startup (`task-agent-resource-service.ts:36`).
  - Project counts are computed from the Project's Task list (`project-service.ts:252-253`).
  - There is a status chokepoint `onAgentStatus` (A6).
  - Live status snapshots are computed on demand, through the handle overlay (A7).
  - The resource reader ignores unknown keys (`task-agent-resource-schema.ts`).
  - Org rows already have selection actions (`onInspectAgentOrgExecution`, `selectTaskTeam`).
- Scope guardrail confirmed: Yes (UC-002, 003, 005, 006; Out of Scope and Preserved Boundary as written; Review Authority)
- Approved change, preserved behavior, and outside scope understood: Yes
- Every prospective blocking `Design Impact` finding is traceable to an approved requirement, acceptance criterion, or preserved-behavior ID: `Yes`
  - AR-001 → REQ-004/DEC-006, REQ-003, AC-003, AC-023, QR-002.
  - AR-002 → REQ-009.
- Remaining material ambiguity, if any: None in the requirements

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Pass | Pass | Pass (no change) | Confirmed | — |
| BEH-002 | User | Pass | Pass | Pass: Publication Contract steps 1–3 make each subject's builds serialized, read after the dispatch, and emitted in commit order | Confirmed | — (AR-001 resolved) |
| BEH-003 | User | Pass: status is read after the dispatch (the overlay has already cleared); openable = started ∧ ¬closed ∧ host run listed | Pass | Pass | Confirmed | — (AR-001, AR-002 resolved) |
| BEH-004 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-005 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-006 | User | Pass (inherits the AR-001/AR-002 root rules) | Pass | Pass | Confirmed (through AR-001/AR-002) | — |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `ui-ux-spec.md` rounds 1–2 + VIS-001..018 | Pass | Pass (requirements, design) | Pass | Pass. "Stopped" is superseded by the recorded DEC-006 deviation; the round-2 route is illustrative, so `/projects/temp-tasks` is permitted | Pass | — |
| `product-design-request.md`, `-r2.md` | Pass | Pass | Pass | Pass | Pass (not behavior-defining) | — |
| Investigation-notes supplement inventory | Pass | Pass (all three artifacts listed, with approval applicability) | Pass | Pass (meta SR-005, rebase recorded) | Pass | — (AR-004 resolved) |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | `Feature`, plus F-006 | — |
| Root-cause classification is explicit and evidence-backed | Pass | F-006 `Local Implementation Defect` (`AgentRunTaskRows.vue:85`, A11); feature `No Design Issue Found` | — |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | No, except moving the fold into the contracts package | — |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | Publisher sits beside the write owners; status query on the existing boundary | — |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | Ownership Is Clear? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Committed write → web views | Pass | Pass (Publication Contract) | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Agent status → root line | Pass | Pass (mark only; `setImmediate` read) | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Snapshot read with roots | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 | Root click → conversation | Pass | Pass (org actions exist; see Residual Risks) | Pass | Pass | Pass | Pass | Pass |
| DS-005 | F-006 | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-006 | Web store event/snapshot ordering | Pass | Pass: correct once the server emits each Task's views in commit order (AR-001) | N/A | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `ProjectChangePublisher` | Pass | Pass | Pass | Pass | Only the write owners and `swap()` call it; resolvers never publish |
| `ActiveRootMessageBoundary.taskExecutionStatus` | Pass | Pass | Pass | Pass | The Task side reaches roots only through the composition-bound resolver |
| `TaskAgentResourcePort.taskExecutionsStatusChanged` | Pass | Pass | Pass | Pass | The lifecycle never imports the publisher |
| Web `projectChangeFeed` | Pass | Pass | Pass | Pass | Components never open sockets |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `projects/*` → runtime | Pass | Pass | Pass | Pass | Through the resolver only |
| `agent-collaboration/*` → Task side | Pass | Pass | Pass | Pass | Through the port only. The notification re-enters the root through the resolver, so AR-001's deferral also removes the synchronous re-entry |
| Web stores/components | Pass | Pass | Pass | Pass | — |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| GraphQL `projectTasks(projectId)` + `root`; `tasksWithoutProject` | Pass | Pass | Pass | Low | Pass |
| `/ws/projects` messages (scope union) | Pass | Pass | Pass | Low | Pass |
| `taskExecutionsStatusChanged(hostRoot, references)` | Pass | Pass | Pass | Low | Pass |
| `taskExecutionStatus(reference)` | Pass | Pass | Pass | Low | Pass. It must not wake anything, and is read as specified by AR-001 |
| `TaskAgentResourceLinkInput.recipientAddress` | Pass | Pass | Pass | Low | Pass |
| Web `useTaskRootNavigation().open(root)` + `taskRootPresentation` | Pass | Pass | Pass | Low | Pass (AR-002 rule; org actions named in DS-004) |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Websocket fan-out | Pass | Pass | Pass | Pass | Notification-hub pattern (A1) |
| Live status | Pass | Pass | N/A | Pass | Root snapshots |
| Team fold | Pass | Pass | Pass | Pass | Moved into the contracts package |
| Navigation | Pass | Pass | N/A | Pass | Selection actions; `resolveSelectionRoute`; org actions exist |
| Board UI | Pass | Pass | N/A | Pass | Lanes config and read-only mode on the existing components |
| Root name | Pass | Pass | Pass | Pass | `recipientAddress` instead of per-read tree I/O (A5) |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `projects/changes/` (new) | Pass | Pass | Pass | Pass | Publisher, hub, messages |
| `projects/services` | Pass | Pass | Pass | Pass | `TaskRootViewBuilder`; publication calls |
| `agent-collaboration/execution` | Pass | Pass | Pass | Pass | Status query and forwarding |
| Contracts package | Pass | Pass | Pass | Pass | Shared fold |
| `autobyteus-web` | Pass | Pass | Pass | Pass | Feed, stores, routes, components |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Team aggregate status fold | Pass | Pass | Pass | Pass | One rule for server and web |
| Task view shape (GraphQL = feed) | Pass | Pass | Pass | Pass | Web mirror plus a contract test against server sample payloads |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `TaskRootView` | Pass | Pass | Pass | N/A | Pass | `status` and `closed`/`start` are kept apart. The presentation rule combines them in one function |
| `ProjectChangeMessage` / `TaskScope` | Pass | Pass | Pass | Pass | Pass | — |
| `recipientAddress` | Pass | Pass | Pass | N/A | Pass | `null` truthfully means "not recorded" |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Responsibilities Were Re-Tightened After Shared-Structure Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Server files in the mapping | Pass | Pass | Pass | Pass | — |
| Web files in the mapping | Pass | Pass | Pass | Pass | `teamExecutionViewState.ts` untouched (494/500 lines) |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `projects/changes/*`, `projects/services/task-root-view-builder.ts` | Pass | Pass | Low | Pass | — |
| `api/websocket/projects.ts` | Pass | Pass | Low | Pass | — |
| Web `services/projects`, `composables/projects`, `utils/projects`, `pages/projects/temp-tasks` | Pass | Pass | Low | Pass | — |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Web-only fold body | Pass | Pass | Pass | Pass | — |
| `AgentRunTaskRows` conditional emit | Pass | Pass | Pass | Pass | — |
| "No polling/status push" docs; "never stores addresses" comment and docs | Pass | Pass | Pass | Pass | — |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Root names for older entries | No | Pass | Pass | Kind-only label; no tree fallback |
| Freshness | No | Pass | Pass | Refresh stays an explicit user action, not a parallel path |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? | Direct Use, Rebuild, Or Migration Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `agent_run_resources.json` + optional `recipientAddress` on `assigned` | Directly Usable — No Migration | Pass. The current reader projects known keys and ignores the rest. Absence truthfully means "not recorded" | Pass. A backfill would need per-root tree I/O and still could not name failed starts | N/A | Pass | Reader accepts the key only on `assigned`; writer emits it when present; mixed old/new file test planned |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Steps 1–8 | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Publication, status, root line, name | Yes | Pass | Pass | Pass | The status example should show when the status is read (AR-001) |
| Messages / `TaskRootView` | Yes | Pass | N/A | Pass | — |

## Material Premise Validation (Only When Needed)

### `P-001` — The worker status is read during the triggering status event, before the handle clears its overlay

- Related approved requirement or established contract: REQ-004 and DEC-006 ("the worker's own status, with the same dot and word as its left-panel row"); REQ-016 / AC-023 (after the message, the root shows Running/Idle)
- Relevant behavior ID(s): BEH-003, BEH-006
- Initiating basis kind: `System` (initiated by a supported user/agent action)
- Independent product-supported initiating trigger:
  - an offline worker (idle-paused, or just reactivated) is woken by a message — the assigner's `send_message_to`, or a user post through the left panel;
  - this is SCN-003, and in AC-023 the message itself is the trigger.
- Support evidence:
  - The wake path activates the handle with no `agentRun`. `publishCommandStatus("initializing")` sets `ConfiguredAgentStatusOverlay` (`configured-agent-execution-handle.ts:388-391`).
  - `overlay.get()` returns the overlay snapshot whenever one is set (`configured-agent-status-overlay.ts`).
  - When the run publishes its first `AGENT_STATUS`, `bindEvents` calls `publishAgentEvent(...)` first and `overlay.clear()` only afterwards (`configured-agent-execution-handle.ts:383-384`).
  - `publishAgentEvent` reaches `root.onAgentExecutionEvent`, which calls `taskExecutions.onAgentStatus(...)` synchronously (`standalone-agent-run-root.ts:313-317`).
- Forward path, as the design specifies it:
  1. `onAgentStatus` → `TaskAgentResourcePort.taskExecutionsStatusChanged`
  2. → `ProjectChangePublisher.workerStatus`, with the status taken from `root.taskExecutionStatus(reference)`
  3. → adapter → `handle.getStatusSnapshot()`. The overlay ("initializing") is still set at this point.
  4. → `task_worker_status: initializing` is published.
  5. `overlay.clear()` then runs. No further status event arrives until the turn ends.
- Lifecycle preconditions and material consequence:
  - For the whole first turn after a wake (for example, the reactivated worker processing the assigner's message), the root line shows Initializing.
  - The left panel shows Running for the same worker, because it uses the event's status.
  - This contradicts DEC-006's "same as its left-panel row" and AC-023's "After the message: Running/Idle". It corrects itself only at the next status change.
- Reachability: `Reachable`. The design reads the status within the notification path, and nothing in it defers that read. If the implementation happens to read after an `await`, the overlay is already cleared; that is exactly the rule the design must state.
- Review consequence: AR-001 (blocking).

### `P-002` — Two publications for one Task finish out of order

- Related approved requirement or established contract: REQ-003 ("status changes … appear … Counts follow"); QR-002; DS-006 ("the store applies events in arrival order")
- Relevant behavior ID(s): BEH-002, BEH-006
- Initiating basis kind: `User` (the agent sets DONE through `create_or_update_task`)
- Independent product-supported initiating trigger: DONE, a supported normal action (AC-008, AC-020).
- Support evidence:
  - DONE commits the resource close first (`closeTask` → `store.update` → `swap()`, which publishes #1) and then writes the status (`afterClose` → `updateTask`, after which the owner publishes #2) (`project-task-service.ts`).
  - Each publication builds its view asynchronously: it reads the Task, and for Project Tasks it also re-lists the Project's Tasks for counts (`project-service.ts:252`).
- Forward path:
  1. Publication #1 starts its reads before the status write.
  2. Publication #2 starts after the status write.
  3. Nothing orders their emissions.
  4. If #1's Project-count listing finishes after #2's, the client applies #1 last (DS-006 applies in arrival order) and keeps the pre-DONE `openTaskCount` (or Task view) until the next event or a Refresh.
- Lifecycle preconditions and material consequence: The client shows stale counts or a stale lane after DONE. Refresh repairs it.
- Reachability: `Unclear` (it depends on the timing of concurrent file reads; low probability)
- Review consequence: Supporting evidence only. On its own it would not block, but AR-001's per-Task ordering rule removes it at no extra cost.

### `P-003` — A root is clicked while its assignment is still `starting`

- Related approved requirement or established contract: REQ-009 ("can be opened when its worker is listed in the left panel (started and not closed by DONE)")
- Relevant behavior ID(s): BEH-003
- Initiating basis kind: `User`
- Trigger: The user is watching the board while an agent delegates. Rows with a root appear live (AC-004/005).
- Forward path:
  1. `linkAgentRun` commits a `starting` entry, so `swap()` publishes a root with `start: "starting"`.
  2. The design's presentation rule ("otherwise status, openable") makes it openable.
  3. The worker has no tree node, and so no left-panel row, until activation commits (A4).
  4. A click navigates to a run row that does not exist yet.
- Reachability: `Reachable` (a short window on every delegation)
- Review consequence: AR-002. This is a direct requirement alignment: REQ-009 says "started".

### `P-004` — The root's hosting chat was permanently deleted while its Project Task assignment is open

- Related approved requirement or established contract: REQ-009 (openable when listed in the left panel)
- Relevant behavior ID(s): BEH-003
- Initiating basis kind: `User`
- Trigger: The user permanently deletes the chat (run) in which an agent delegated a Project Task. The Task is not DONE.
- Support evidence: Permanent run delete is a supported left-panel action (TESTING.md ad-hoc suite: "permanent delete removes only that run's ad-hoc Tasks"). `deleteAdHocTasksHostedBy` removes only Tasks with no Project. A Project Task's `assigned` entry stays, with `start: "started"` and `closedAt: null`.
- Forward path:
  1. The board's root view is built from that entry.
  2. The resolver finds no active root, so the status is `offline`.
  3. The design's rule makes the root openable.
  4. `useTaskRootNavigation` tries to open a host run that is not in the left panel.
- Lifecycle preconditions and material consequence: An openable-looking Offline root whose click cannot land. This contradicts REQ-009.
- Reachability: `Reachable`
- Review consequence: AR-002.

### `P-005` — `load()` publishes for every Task

- Trigger: Startup composition `taskAgentResources.load()` → `swap()` for every file (`task-agent-resource-service.ts:36`; `project-task-agent-resource-composition.ts:27`).
- Reachability: `Reachable`, but there is no user-visible consequence. No client is connected yet, and the work is unnecessary (DESIGN.md "remove unnecessary work").
- Review consequence: Non-blocking AR-003.

## Round 2 Re-Review (ARCH-REV-002, SR-005)

| Finding | Verified In | Result |
| --- | --- | --- |
| AR-001 | design-spec "Publication Contract" (lines 273–302); Ownership Map; Risks; Change Sequence step 5 | **Resolved.** Each step was checked against the code: <ul><li>Triggers only mark; they are synchronous, never throw and never read.</li><li>Reads run in a `setImmediate` flush. `overlay.clear()` runs synchronously right after `publishAgentEvent` returns (`configured-agent-execution-handle.ts:383-384`), so the flush sees the settled status. This removes P-001 and the synchronous re-entry into the root.</li><li>Builds are serialized and coalesced per subject, and each build reads state at least as new as the previous one. This removes P-002: DONE ends with the DONE view and an Offline root.</li><li>Removal takes precedence, and Task IDs are never reused.</li><li>Failures are logged and recovered by re-read or Refresh (QR-002).</li><li>Tests are named for wake → Running, DONE order, coalescing and no publication during `load()`.</li><li>Together with DS-006 (arrival-order application, queue-and-replay, reconnect re-read), the web converges to the last commit.</li></ul> |
| AR-002 | Presentation rule (lines 249–258); Off-Spine `taskRootPresentation` | **Resolved.** Openable = `start === "started"` && `!closed` && the host run is present in the web run-history state; otherwise no chevron and not focusable (QR-003). This covers P-003 (`starting`) and P-004 (deleted host), and keeps "Offline after an idle pause" openable as REQ-009 requires. The label keeps the worker status (Initializing while `starting`), consistent with DEC-006. |
| AR-003 | Publication Contract step 6; sequence step 5 | **Resolved.** The swaps called by `load()` do not notify. |
| AR-004 | Investigation meta (SR-005, rebase onto `7d130309e`); Supplemental Artifact Inventory (three entries); design spec SR-005; factual note in the SR record | **Resolved.** Two trivial leftovers remain and need no rework: the handoff's artifact label "(SR-001..SR-004)", and the investigation-status line, which still mentions waiting on Product. |
| Residual (org navigation) | DS-004; Risks | **Closed.** DS-004 reuses `onInspectAgentOrgExecution(run, agentRunId, address)` / `selectTaskTeam`, extracted into a shared org-selection composable when reused. |

Structural verdicts not affected by SR-005 keep their round-1 evidence. No new findings.

## Unresolved Approved-Behavior Or Current-State Gaps

None in the requirements. The design gaps are AR-001 and AR-002.

## Review Decision

- `Pass` (round 2). Round 1 was `Fail`.

## Findings

All round-1 findings are resolved in SR-005 (see Round 2 Re-Review); the entries below are kept for traceability.

### AR-001 — Publication needs a defined read moment and a per-Task order (blocking)

- Type: `Design Impact`
- Severity: Medium
- Protected requirements: REQ-004 and DEC-006 (status the same as the left-panel row); REQ-016 / AC-023 (Running/Idle after the message); REQ-003 / AC-003 (live status changes and counts); QR-002
- Scope status: `Within Approved Scope`
- Changes approved behavior: No
- Affected behavior: BEH-002, BEH-003, BEH-006; DS-001, DS-002, DS-006
- Evidence:
  - P-001 (Reachable): `configured-agent-execution-handle.ts:383-384` publishes before `overlay.clear()`, and the root forwards `onAgentStatus` synchronously.
  - P-002 (Unclear, supporting): DONE triggers two asynchronous publications, and nothing orders them.
- Material premise: P-001 (Reachable); P-002 (Unclear)
- Required update: State the publisher's freshness and ordering contract in the design (DS-001/DS-002 and the Ownership Map). Suggested shape:
  1. A trigger from a write owner, `swap()` or `taskExecutionsStatusChanged` only marks the Task, and its Project for counts, as changed.
  2. The view or status is read afterwards, never during the triggering dispatch. For example, schedule it with `queueMicrotask` or `setImmediate`, which also removes the synchronous re-entry into the root.
  3. Publications are serialized per Task (and per Project for `project_upserted`), so each emission reflects state read after the latest trigger. A pending rebuild may coalesce repeated triggers.
  4. Add tests:
     - a reactivated or woken worker's first turn shows Running on the root line;
     - DONE emits views in commit order.
  - A different rule with the same guarantees is acceptable, for example using the event's own status for agent roots plus a deferred fold for team roots.
- Why proportionate: A small per-key chain or deferral inside the new publisher. It adds no new persistent state and no new contract, and it protects a user-decided rule (DEC-006) on a normal path (wake/reactivation).
- Recommended recipient: `/solution_designer`

### AR-002 — The openable rule must match REQ-009 (blocking, small)

- Type: `Design Impact`
- Severity: Low–Medium
- Protected requirement: REQ-009 (openable exactly when the worker is listed in the left panel: started and not closed); QR-003 (non-openable roots are not focusable)
- Scope status: `Within Approved Scope`
- Changes approved behavior: No
- Affected behavior: BEH-003, BEH-006; the `taskRootPresentation` rule; DS-004
- Evidence:
  - The design's rule is "`failed` → Couldn't start; `closed` → Offline, not openable; **otherwise** status, openable".
  - It makes `starting` roots openable (P-003). It also makes roots openable whose host run is no longer in the left panel because the chat was permanently deleted (P-004).
- Required update:
  - Openable = `start === "started"` && `!closed` && the host run is listed in the left panel. The web run-history state the left panel uses is the natural source.
  - Otherwise show the status (or Couldn't start) without the chevron, and make it non-focusable.
  - Add both cases to the component tests.
- Why proportionate: A rule change in one presentation function plus one lookup the web already has. No server change.
- Recommended recipient: `/solution_designer`

### AR-003 — Do not publish from `load()` (non-blocking)

- Type: `Design Impact` (non-blocking)
- Severity: Low
- Protected requirement: DESIGN.md "remove unnecessary work"; supports QR-001
- Scope status: `Within Approved Scope`
- Changes approved behavior: No
- Evidence: P-005
- Required update: Only committing writes notify the publisher, so the `swap()` called from `load()` does not. Pass a flag or move the callback to the write paths.
- Recommended recipient: `/solution_designer` (or implementation guidance)

### AR-004 — Investigation notes: supplement inventory and metadata are stale (non-blocking)

- Type: `Design Impact` (non-blocking, artifact accuracy)
- Severity: Low
- Protected requirement: package coherence (reviewer skill: canonical supplement inventory)
- Scope status: `Within Approved Scope`
- Changes approved behavior: No
- Evidence:
  - The investigation-notes Supplemental Artifact Inventory lists only `product-design-request.md`. It omits the behavior-defining `ui-ux-spec.md` + VIS-001..018 and `product-design-request-r2.md`, though the requirements doc lists them.
  - The meta shows `Current solution revision ID: SR-001` and base `f48dbfb` (now `7d130309e`).
  - The design spec states `Current solution revision ID: SR-003`, while the solution revision record names the design SR-004.
- Required update: Correct these with the AR-001/AR-002 revision.
- Recommended recipient: `/solution_designer`

## Classification

- N/A (Pass). Round 1: `Design Impact`.

## Recommended Recipient

`/implementation_engineer` (primary); `/solution_designer` (informational)

## Residual Risks

- **Org-hosted root navigation:** closed in SR-005. DS-004 names `onInspectAgentOrgExecution` and `selectTaskTeam`. The step-8 E2E list names agent and team hosts only; an org-hosted root opening may be added if cheap (AC-010/011 do not require it).
- **Publication volume:** status messages are only for assignment roots, and batching is deferred. That is acceptable under DESIGN.md. AR-001's coalescing also bounds bursts.
- **Project counts:** each Project Task publication re-lists the Project's Tasks (`project-service.ts:252`), which is O(Tasks in the Project) per change. This is acceptable at current scale. If boards grow large, revisit by computing counts from the changed Task.
- **Older assignments show only their kind ("Agent"/"Team"):** this is the accepted consequence of Directly Usable.

## Latest Authoritative Result

- Review Decision: `Pass` (ARCH-REV-002)
- Material-Premise Gate: `Pass`. P-001, P-003 and P-004 are addressed by the design. P-002 is removed by per-subject serialization. P-005 is addressed (no publication from `load()`).
- Notes: The design is ready for implementation. Implementers should follow the Publication Contract exactly. Mark-only triggers and the `setImmediate` read are what keep the root line equal to the left panel (DEC-006).
