# Design Review Report — task-run-resources-workspace-cleanup

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-run-resources-workspace-cleanup/tickets/in-progress/task-run-resources-workspace-cleanup/requirements-doc.md` (Approved, SD-AP-001, SR-003 basis)
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-run-resources-workspace-cleanup/tickets/in-progress/task-run-resources-workspace-cleanup/investigation-notes.md` (AE-01–AE-14)
- Upstream Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-run-resources-workspace-cleanup/tickets/in-progress/task-run-resources-workspace-cleanup/solution-revision-record.md` (SR-001–SR-006)
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-run-resources-workspace-cleanup/tickets/in-progress/task-run-resources-workspace-cleanup/design-spec.md` (SR-009)
- Supplemental Task Artifacts Reviewed: Product UI/UX spec `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/task-run-resources-workspace-cleanup/ui-ux-spec.md` (design repo `a38bd6e`, VIS-001–008); `product-design-request.md`; `solution-design-handoff.md` (including the SR-006 Revision section)
- Relevant Solution Revision IDs: SR-003, SR-004, SR-005, SR-006, SR-007 (split, SD-AP-002), SR-008 (resume), SR-009 (DESIGN.md full-read revision; user-approved 2026-10-06)
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-run-resources-workspace-cleanup/tickets/in-progress/task-run-resources-workspace-cleanup/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-004`
- Current Review Round: 4
- Trigger: SR-008 resume re-confirmation from `/solution_designer`. Since SR-006: REQ-010 / AC-011 / BEH-007 / UC-004 (restyle) were split out (SR-007, SD-AP-002) and delivered as `delegated-row-clean-style` (merged `24e00db81`); the base moved `88851166f` → `origin/personal@5c74fed71`. Round 2 (SR-006, ARCH-REV-002) is retained as the structural verdict basis.
- Prior Review Round Reviewed: 3 (ARCH-REV-003, `Pass`)
- Latest Authoritative Round: 4
- Current-State Evidence Basis:
  - Round 1 source reads are still valid; the base `88851166f` is unchanged.
  - Round 2 adds these reads:
    - `run-history/services/collaboration-root-history-service.ts`: dependencies `orgRuns: Pick<AgentOrgRunManager,"getActive">` and `projectAgentOrg`;
    - `agent-team-execution/services/agent-team-run-manager.ts`: holds `taskAgentResources`;
    - `agent-org-execution/services/agent-org-run-manager.ts`: reaches the port through `scopeBuilder`;
    - `standalone-agent-run-root/services/standalone-agent-run-root-manager.ts`: reaches the port through `options.rootDependencies.taskAgentResources`;
    - `investigation-notes.md` AE-12–AE-14 and the Supplemental Artifact Inventory.

- Round 3 delta verification:
  - Worktree HEAD is `5c74fed71`, a fast-forward descendant of `88851166f`.
  - In `git diff --name-only 88851166f..5c74fed71`, the only design-owned files touched are `WorkspaceTransientExecutionRow.vue` (+ spec) and `WorkspaceAgentOrgHistoryCollection.vue`, which carry the delivered restyle. The other drift is in launch, draft and run-settings code, not the closure, history or listing paths. This matches AE-15.
  - `utils/agentOrgHistoryRows.ts` still uses the context-else-history tree (so SP-3 still applies). The reapplied `CollaborationRootHistoryService.orgRuns` Pick now includes `closedTaskExecutionsFor` (R-3 is in progress).
  - `design-spec.md` drops every restyle item (Removal Plan "None in this package"; file table "row style is already on the base"). It keeps the leave motion, `aria-hidden`, focus and selection items (REQ-002 and REQ-009 stay in scope).

- Round 4 (SR-009) verification:
  - This reviewer also read `DESIGN.md` in full (336 lines). Its "Project-specific design documents" and "Before accepting a design" sections apply to this package.
  - AE-16, protocol doc: `autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md` § Team Server Messages lists `TASK_EXECUTION_STARTED` and has no closure entry. Adding `TASK_EXECUTIONS_CLOSED` and the `closed_task_executions` snapshot field to scope is correct. That doc covers only standalone and Team WebSocket messages. The Agent and Org `task_execution_started` events are documented in `autobyteus-server-ts/docs/modules/agent_communication.md:403`, `docs/modules/standalone_agent_run_root.md:144` and `autobyteus-web/docs/agent_orgs.md:354` (R-6).
  - AE-17, scaling: `TaskAgentResourceService.swap()` is the single synchronous update point for `files` and `owners`, and damaged files never reach `swap()`. A derived per-host-root closed index updated there has the same lifecycle and needs no separate invalidation. It removes the O(Orgs × entries) history-list cost that the AR-001 fix introduced. This is a justified, bounded derived index in the existing owner (DESIGN.md rules 3 and 5), not speculative caching.
  - Naming collision: the design names the new private map `closedByHostRoot`, but `TaskAgentResourceService` already has a public method `closedByHostRoot(taskId)` (line 89, used by `project-task-service.ts:121`). A field and a method with the same name in one class is a TypeScript duplicate identifier. Rename the map (R-5).
  - R-4 is fixed at design-spec line 32 (AE-01–AE-17). Line 8 still says AE-01–AE-11; this is cosmetic.

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Classification rationale reviewed: unchanged from round 1. Shared stream/GraphQL contracts change across three root kinds, the neutral port gains a read, and server and web both change. The `agent_org` history item field adds to the same rationale.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: None.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood: Yes (REQ-001–010, AC-001–011, DEC-001–008, UI/UX spec @ `a38bd6e`). Approval SD-AP-001 is unchanged; SR-006 changes no intended behavior.
- Relevant existing behavior and evidence confirmed: as in round 1, plus:
  - AE-12: Org rows fall back to the history-item tree.
  - AE-13: `listNavigationRows()` has consumers outside the tree.
  - AE-14: Team and Agent history paths render no task rows without a context. Verified in round 1 reads (`runHistoryTeamExecutionRows.ts`: no context → `flattenStableRows`; `AgentRunTaskRows` → `contextFor`).
- Scope guardrail confirmed: unchanged.
- Approved change, preserved behavior, and outside scope understood: Yes.
- Every prospective blocking `Design Impact` finding is traceable to an approved ID: `Yes` (none remain).
- Remaining material ambiguity: the REQ-009 scope for Team surfaces outside the Workspaces tree is recorded as a design clarification and listed under Residual Risks. It is not blocking.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | Pass | Pass | Pass | Confirmed | — |
| BEH-002 (live DONE) | System | Pass | Pass | Pass. The Team filter now sits at the Workspaces tree consumer (AR-002 resolved). | Confirmed | — |
| BEH-003 (reload/restart) | User | Pass | Pass | Pass. SP-3 covers the Org history list (AR-001 resolved). | Confirmed | — |
| BEH-004 (inactive at DONE) | System | Pass | Pass | Pass | Confirmed | — |
| BEH-005 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-006 | Contract | Pass | Pass | Pass | Confirmed | — |
| BEH-007 | User | Pass | Pass | Pass | Confirmed | — |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `ui-ux-spec.md` @ `a38bd6e` (+ VIS-001–008) | Pass | Pass | Pass | Pass (AE-09 correction recorded) | Pass | — |
| `product-design-request.md` | Pass | Pass (now in the inventory) | Pass | Pass | Pass (not behavior-defining) | — |
| Investigation-notes supplement inventory | Pass | Pass | Pass | Pass | Pass | — (AR-004 resolved) |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Feature/behavior change | — |
| Root-cause classification is explicit and evidence-backed | Pass | `No Design Issue Found` for ownership | — |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Shared closure function; Org row consolidation deferred | — |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | `listClosedTaskExecutions`; manager-owned `closedTaskExecutionsFor`; AE-09 residual | — |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | Ownership Is Clear? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SP-1 Live DONE | All roots | Pass | Pass. Step 0 sets the payload as released ∩ closed ∩ in-tree; step 3 still has older wording (see Recommendations). | Pass | Pass | Pass | Pass | Pass |
| SP-2 Read | All roots | Pass | Pass | Pass | Pass | Pass (manager-owned stored reads) | Pass | Pass |
| SP-3 Org history list | Org | Pass | Pass | Pass (`CollaborationRootHistoryService` is a facade; `AgentOrgRunManager` owns the closure read) | Pass | Pass | Pass | Pass |
| EV-1 Event | All roots | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| LS-1 Web listing/motion | Web | Pass | Pass | N/A | Pass | Pass. The Team filter is at `buildRunHistoryTeamExecutionRows` through `isTaskExecutionRowListed`. | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Task side behind the port | Pass | Pass | Pass | Pass | — |
| Root scope + adapters | Pass | Pass | Pass | Pass | — |
| Root-kind managers (`closedTaskExecutionsFor`) | Pass | Pass | Pass | Pass | `run-history` services call managers they already hold (`TeamRunHistoryService.manager`; `CollaborationRootHistoryService.dependencies.orgRuns`, whose `Pick` is widened). |
| Team view state (`isTaskExecutionRowListed`) vs. navigation projection | Pass | Pass | Pass | Pass | `projectNavigationRows` is unchanged; the consumer inventory is explicit. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Roots/managers → port | Pass | Pass | Pass | Pass | Standalone and Org managers do not hold the port as a field today. They reach it through their builder dependencies (see Recommendations). |
| `run-history` → managers (not the port) | Pass | Pass | Pass | Pass | AR-003 resolved |
| Web components → stores → contexts | Pass | Pass | Pass | Pass | — |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `TaskAgentResourcePort.closedAgentRunsIn(hostRoot)` | Pass | Pass | Pass | Low | Pass |
| `listClosedTaskExecutions({ port, root, contains })` | Pass | Pass | Pass | Low | Pass |
| `<RootKind>Manager.closedTaskExecutionsFor(rootRunId, tree)` | Pass | Pass | Pass (per-root-kind manager, typed tree) | Low | Pass |
| Adapter `publishTaskExecutionsClosed(refs)` | Pass | Pass | Pass | Low | Pass |
| View/snapshot/resume-config `closed_task_executions` + correlation | Pass | Pass | Pass | Low | Pass |
| `agent_org` history item `closed_task_executions` | Pass | Pass | Pass | Low | Pass |
| Agent/Org `task_executions_closed`; Team `TASK_EXECUTIONS_CLOSED` | Pass | Pass | Pass | Low | Pass |
| Team view `isTaskExecutionRowListed(row)` | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Closure fact | Pass | Pass | N/A | Pass | — |
| Stored closure reads | Pass | Pass (existing managers) | N/A | Pass | — |
| Live signal | Pass | Pass | Pass | Pass | — |
| Selection fallback | Pass | Pass | N/A | Pass | — |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-collaboration/execution/task` | Pass | Pass | Pass | Pass | — |
| Root subsystems + managers | Pass | Pass | Pass | Pass | — |
| `run-history/services` (facades through managers) | Pass | Pass | Pass | Pass | — |
| Web contexts, `utils/collaboration`, history stores/utils | Pass | Pass | Pass | Pass | — |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Server closure policy | Pass | Pass | Pass | Pass | — |
| Web key + closed-subtree predicate | Pass | Pass | Pass | Pass | Used by the Agent, Team and Org contexts and by the Org history rows. |
| `TaskExecutionReferenceDto` | Pass | Pass | Pass | Pass | — |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `closed_task_executions` beside the tree | Pass | Pass | Pass | N/A | Pass | — |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Responsibilities Were Re-Tightened After Shared-Structure Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Server files (incl. managers, `collaboration-root-history-service.ts`, GraphQL types) | Pass | Pass | Pass | Pass | — |
| `stores/runHistoryTeamExecutionRows.ts` (tree filter); `teamExecutionTreeSelectors.ts` unchanged | Pass | Pass | N/A | Pass | — |
| `runHistoryStoreSupport.ts`, `utils/agentOrgHistoryRows.ts` | Pass | Pass | Pass | Pass | — |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-collaboration/execution/task/task-execution-closure.ts` | Pass | Pass | Low | Pass | — |
| `autobyteus-web/utils/collaboration/taskExecutionClosure.ts` | Pass | Pass | Low | Pass | — |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Dashed transient-row styling; Org `user-group` icon | Pass | Pass | Pass | Pass | — |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Contract and history-item fields | No | Pass | Pass | Fields are required. Only server and web consume them. |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? | Direct Use, Rebuild, Or Migration Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `agent_run_resources.json`, execution trees, messages | `Not Affected` | Pass | Pass | N/A | Pass | Read-only; resource files are loaded at composition. |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Contracts → port/closure → managers/roots/history → web → UI → tests | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| View field and live event shape | Yes | Pass | Pass | Pass | — |
| Team consumer inventory | Yes | Pass | N/A | Pass | — |

## Material Premise Validation (Only When Needed)

### `MP-001` — The Org tree renders task rows from the history list before or without a hydrated Org context

- Round 1 record unchanged: `Reachable`. The trigger is a user reload or restart followed by expanding an Org run in the Workspaces tree. The path runs `projectAgentOrg` → history item → `projectAgentOrgHistoryRows` without a context.
- Round 2 status: addressed by SP-3. The history item carries `closed_task_executions` from `AgentOrgRunManager.closedTaskExecutionsFor`, and the shared predicate is applied to both row sources. There is a test for the case with no context.

### `MP-002` — Filtering Team `projectNavigationRows` changes surfaces outside the Workspaces tree

- Round 1 record unchanged: `Reachable`.
- Round 2 status: addressed by option (a). `projectNavigationRows` is unchanged, only the tree consumer filters, and the consumer inventory states that every other surface is unchanged.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Pass`

## Findings

None open. AR-001–AR-004 are resolved; see `ARCH-REV-002` in the revision record.

### Non-blocking implementation recommendations (no rework required)

- R-1: fix the older wording in SP-1 step 3 during implementation. It says "computes the closed refs present in this root's tree (`listClosedTaskExecutions`)". The authoritative payload is step 0: the released `agentRuns` that are closed per the port and present in the tree. The existing `isClosed(port, agentRun)` in `RootTaskAgentResourceScope` already performs the closed check.
- R-2: the Ownership Map says the root-kind managers "own the port". Today `StandaloneAgentRunRootManager` reaches it only through `options.rootDependencies.taskAgentResources`, and `AgentOrgRunManager` only through `scopeBuilder`. Wire an explicit manager-level reference at construction. Do not reach into builder internals.
- R-3: in `CollaborationRootHistoryService`, widen `orgRuns: Pick<AgentOrgRunManager, "getActive">` to include `closedTaskExecutionsFor`. Use the same tree instance (active snapshot or stored) for both the projection and the closure computation.
- R-4: the design spec's evidence pointers (lines 8 and 32) still say AE-01–AE-11. AE-12–AE-14 also exist. This is documentation only.

## Classification

N/A (Pass).

## Recommended Recipient

`/implementation_engineer` (primary), with an informational notification to `/solution_designer`.

## Residual Risks

- REQ-009 for Team roots:
  - "A closed run cannot be selected" applies to the Workspaces tree and the main-view fallback.
  - The Team members panel, the running panel, token usage and the mobile focus bar keep listing closed members, and focus eligibility is unchanged. A closed member can therefore still be focused from those Team surfaces after DONE.
  - This follows the approved Workspaces-tree scope (REQ-001) and keeps the three root kinds consistent (REQ-005). The design records it explicitly and says that a wider change needs a new requirement.
  - Confirm with the user during delivery verification if needed.
- REQ-009 "return to the Manager" for Team and Org roots is read as the delegating member, else the root default. Accepted as a mapping.
- AE-09: Org rows can drift from the shared row component's style (consolidation deferred).
- `TransitionGroup` also animates removals caused by a collapse. Accepted.
- A damaged Task file keeps its runs listed (the existing Q-3 surface).

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass`. MP-001 and MP-002 were reachable and are now addressed. No in-scope machinery depends on an unsupported premise.
- Notes:
  - SR-006 resolved AR-001–AR-004 (ARCH-REV-002).
  - SR-008 (ARCH-REV-003) is re-confirmed: removing the restyle from scope and moving the base to `5c74fed71` leaves every structural verdict above unchanged. REQ-010 / AC-011 / BEH-007 / UC-004 are out of this package's scope (SD-AP-002), so the BEH-007 row, the REQ-010 removal items and the AC-011 tests no longer apply here.
  - R-1–R-4 remain non-blocking. R-4 is still open: the design-spec evidence pointer still says AE-01–AE-11, while AE-12–AE-15 also exist.
  - SR-009 (ARCH-REV-004) is accepted:
    - the area-contract update joins the file scope;
    - the per-host-root closed index is derived in `swap()`, with stated scaling and a consistency test;
    - R-4 is fixed at line 32.
  - New non-blocking notes:
    - R-5: rename the private map so it does not collide with the existing `closedByHostRoot(taskId)` method, for example `closedRunsByHostRootKey`.
    - R-6: during docs sync, add `task_executions_closed` and `closed_task_executions` to the Agent and Org module docs listed above.
