# Design Review Report — projects-left-navigation

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-left-navigation/tickets/in-progress/projects-left-navigation/requirements-doc.md` (R4, SR-005, Approved)
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-left-navigation/tickets/in-progress/projects-left-navigation/investigation-notes.md` (E-001…E-036)
- Upstream Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-left-navigation/tickets/in-progress/projects-left-navigation/solution-revision-record.md` (SR-001…SR-007)
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-left-navigation/tickets/in-progress/projects-left-navigation/design-spec.md` (SR-006 content; user approval recorded at SR-007)
- Supplemental Task Artifacts Reviewed: Product `ui-ux-spec.md` (`/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/projects-left-navigation/ui-ux-spec.md`), sections on scope and controls; `follow-ups.md` (FU-001…FU-006); `handoff-architecture-review.md`
- Relevant Solution Revision IDs: SR-005 (requirements basis), SR-006 (design), SR-007 (design approval)
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-left-navigation/tickets/in-progress/projects-left-navigation/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-001`
- Current Review Round: 1
- Trigger: Architecture Design Complete from the Solution Designer (run `solution_designer_7591e3d191704d25a3396b3020a41127`), 2026-10-31
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Current-State Evidence Basis: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-left-navigation` at `1f0cabbf8d` (base `origin/personal` `8faae96899`). Code read at the design's cited lines plus the web tree projection (`stores/runHistoryReadModel.ts`, `stores/runHistoryNavigationProjection.ts`, `stores/runHistoryStore.ts`, `stores/runHistoryLoadActions.ts`), `projects/changes/project-change-publisher.ts`, `compositions/project-task-execution-resource-composition.ts`, `agent-collaboration/execution/task/root-task-dispatch.ts`, server `docs/modules/projects.md` § Follow-up Task to an existing copy, root `DESIGN.md`.

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Classification rationale reviewed: two subsystems; a new persisted field on four run records; a new GraphQL query and inputs; a new instruction section on every runtime; a cross-subsystem port; a web restructuring. Confirmed against the code.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: none. The design approval is `Obtained` (SR-007).

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed` for the server spines. **`Contradicted`** for the web half of DS-003/DS-004 (AR-001). One requirement is ambiguous (AR-002).
- Approved requirements / intended behavior understood: Yes. Projects mode beside unchanged Workspaces. Runs under a Project are runs started under it plus hosts of its Tasks' assignments. Delegated rows are scoped per Project. Starting under a Project uses the Project's folder (else temp) and tells the run its Project. The tree stays live.
- Relevant existing behavior and evidence confirmed: E-024 (copy linked before registration, `root-task-dispatch.ts`), E-025 (`TaskExecutionResourceService` in-memory view, `files` keyed by Task with `location.projectId`, `currentByExecution`), E-026 (commit listener → `taskChanged`), E-027/E-030 (tolerant readers: `normalizeMetadata` projects known keys; `requireKeys` checks only missing keys), E-032 (all five composer callers have `config` in scope; `grok_build` is a `RuntimeKind` served by the ACP backend factory), E-036. Also confirmed: `runHistoryStore.openRun(runId)` → `openHistoricalRun` opens by run id without needing the run in the loaded tree (`runHistoryLoadActions.ts` 404–439), so REQ-010 holds for Agent runs.
- Scope guardrail confirmed: Yes (In-Scope UC-001…005; Out of Scope; Preserved Behavior Boundary; Review Authority).
- Every prospective blocking `Design Impact` finding is traceable to an approved ID: Yes (AR-001 → REQ-011, REQ-012, AC-006, Preserved Behavior Boundary).
- Remaining material ambiguity: AR-002 (how a delegated copy that holds open Tasks of two Projects is listed).
- Statements about existing code checked at their cited lines: all E-024…E-036 citations hold. Two statements do not match the code:
  - "Forbidden: run-history … importing `src/projects/**` directly" (Dependency Rules). `run-history/services/agent-run-history-catalog-service.ts` 14 and `team-run-history-service.ts` 16 already import `getProjectTaskService` (for `deleteAdHocTasksHostedBy`). AR-005.
  - The file sizes (E-033, FU-006) are raw line counts. The team measures effective non-empty lines, and by that measure several touched files are at or just under 500. AR-003.

| Behavior ID | Kind | Design Alignment | Trigger / Evidence | Target Path / Spine | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Pass | Pass | Fail (the open-run mark and reveal in Projects mode have no owner) | Needs Correction | AR-001 |
| BEH-002 | User/System | Pass | Pass | Pass (DS-001, DS-002, DS-005) | Confirmed | — |
| BEH-003 | System | Pass | Pass | Unclear (copies with open Tasks in two Projects) | Needs Correction | AR-002, AR-004 |
| BEH-004 | System | Pass | Pass | Pass (existing closure hiding, re-read on `task_upserted`) | Confirmed | — |
| BEH-005 | System | Pass | Pass | Pass (draft folder rule) | Confirmed | AR-003 (placement only) |
| BEH-006 | User | Pass | Pass | Pass (open by run id; cap plus open-work hosts) | Confirmed | — |
| BEH-007 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-008 | System | Pass | Pass | Fail (live status of top-level rows) | Needs Correction | AR-001 |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope | Linked | Complete | Consistent | Status / Approval | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| Product `ui-ux-spec.md` + VIS-001…025 | Pass | Pass | Pass | Pass (states, chip, briefcase match REQ-002/004/016) | Pass (user-confirmed) | — |
| `follow-ups.md` | Pass | Pass | Pass | Fail (FU-006 says the panel is over the limit; it is 495 effective lines) | Pass | AR-003 |
| `product-design-request.md` | Pass | Pass | Pass | Pass | Pass (context only) | — |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present | Pass | design § Task Design Health Assessment | — |
| Root-cause classification is explicit and evidence-backed | Fail | Only two web components are measured, in raw lines. `stores/chatDraftStore.ts` is 500 effective lines and gains the draft Project and the folder rule. `autobyteus-agent-run-backend-factory.ts` (499), `agent-run-history-catalog-service.ts` (499), `runHistoryStore.ts` (498), `agentTeamRunStore.ts` (488) and `configured-agent-execution-handle.ts` (487) are touched or likely touched. | AR-003 |
| Refactor decision is explicit | Pass | `RunDefinitionGroups.vue` extraction first | — |
| Refactor decision is supported by the design sections | Fail | No placement for new draft logic beyond the 500-line `chatDraftStore.ts` | AR-003 |

## Spine Inventory Verdict

| Spine | Scope | Readable | Narrative | Facade vs Owner | Naming | One Owner, Call Order | Off-Spine Off Line | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Primary | Pass | Pass | Pass | Pass | Fail (the "Team run creation service" is not named: it is `TeamRunService.createTeamRun` → `AgentTeamRunManager` 136) | Pass | Pass (AR-005, non-blocking) |
| DS-003 | Primary | Pass (server) | Fail (web) | Pass | Pass | Fail: "web projection" has no owner, file or live inputs | Pass | Fail (AR-001) |
| DS-004 | Return-Event | Pass | Fail: the reason given for the unknown-copy re-read is a race; it is in fact the only live trigger for Temp-task work (AR-004) | N/A | Pass | Fail: top-level run status changes have no trigger (AR-001) | Pass | Fail |
| DS-005 | Primary | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-006 | Bounded Local | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-007 | Bounded Local | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Public Entry | Internals Internal | Bypass Controlled | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `ProjectRunHistoryService.projectRunHistory` | Pass | Pass | Pass | Pass | Resolver is thin |
| `ProjectRunLinks` → `TaskExecutionResourceService.runLinksOf` | Pass | Pass | Pass | Pass | Bound in `compositions/`, as `project-task-execution-resource-composition.ts` already does |
| `RunProjectContextReader` | Pass | Pass | Pass | Pass | Placement note in AR-005 |
| `projectRunsStore` | Pass | Pass | Pass | Fail | Owns the read but not the projection into rendered nodes (AR-001) |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Clear | Forbidden Explicit | Coherent | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| run-history ↔ projects | Pass | Fail (the stated rule is already broken by existing imports) | Pass | Pass with note | AR-005: say "new code goes through the ports; existing `deleteAdHocTasksHostedBy` imports stay (out of scope)" |
| agent-execution → reader port | Pass | Pass | Pass | Pass | — |
| web components → stores → GraphQL | Pass | Pass | Pass | Pass | — |

## Interface Boundary Verdict

| Interface | Subject | Singular | Identity | Generic Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `projectRunHistory(projectId)` | Pass | Pass | Pass | Low | Pass |
| `CreateAgentRunInput.projectId` / `CreateAgentTeamRunInput.projectId` | Pass | Pass | Pass | Low | Pass |
| `runLinksOf(projectId \| null)` | Pass | Pass | Pass | Low | Pass. The rule for multi-Project copies is open (AR-002) |
| `RunProjectContextReader.contextOf` | Pass | Pass | Pass | Low | Pass |
| `ProjectRunHistory.scopes[].startedUnderProject` | Fail | Fail | Pass | Medium | Fail (AR-004): its meaning for the web is not defined |

## Existing Capability / Subsystem Reuse Verdict

| Need | Checked | Decision Sound | New Piece Justified | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Grouped rows, Task lines, closed hiding, archive, open | Pass | Pass | N/A | Pass | — |
| Live run status and local or new rows in the tree | Fail | Fail | N/A | Fail | Workspaces gets them from `mergeRunTreeWithLiveContexts` and the agent and team contexts (`runHistoryReadModel.ts` 197–295; `runHistoryNavigationProjection.ts` 49–57). The design does not reuse that for Projects (AR-001) |
| Live feed | Pass | Pass | N/A | Pass | `/ws/projects` broadcasts Task marks for every Project and for no-Project Tasks (`project-change-publisher.ts` 31, 64–67) |
| Prompt section | Pass | Pass | N/A | Pass | — |

## Subsystem / Capability-Area Allocation Verdict

| Area | Allocation Clear | Decision Sound | Supports Spine Owners | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| server run-history | Pass | Pass | Pass | Pass | — |
| server projects | Pass | Pass | Pass | Pass | — |
| server agent-execution / agent-team-execution | Pass | Pass | Pass | Pass | Name the Team owner (AR-005) |
| web stores | Fail | Fail | Fail | Fail | No owner turns the read into rendered nodes (AR-001) |
| web components | Pass | Pass | Pass | Pass | — |

## Reusable Owned Structures Verdict

| Structure | Evaluated | File Sound | Ownership | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `RunDefinitionGroups.vue` | Pass | Pass | Pass | Pass | Its inputs must be the same node types Workspaces passes (AR-001) |
| `taskExecutionScope.ts` | Pass | Pass | Pass | Pass | — |
| `RunProjectContext` | Pass | Pass | Pass | Pass | — |

## Shared Structure / Data Model Tightness Verdict

| Structure | One Meaning | Redundant Removed | Overlap Controlled | Core vs Variant | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `projectId` on run records | Pass | Pass | Pass | N/A | Pass | — |
| `ProjectRunHistory.scopes[]` | Fail | Fail | Pass | N/A | Fail | AR-004 |

- Derived consumers of a changed structure listed with a decision for each (Principle 11): `Pass`. Index row, restore, repair or rebuild, run copy, Team restore and validators are all decided.
- One vocabulary (Principle 15): `Pass`. "Started under a Project" is to be recorded in the docs at delivery.

## File Responsibility Mapping Verdict

| File | Singular | Matches Owner | Re-Tightened | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `stores/projectRunsStore.ts` | Fail | Fail | N/A | Fail | Either it owns the node projection with live overlays, or a named projection file does (AR-001) |
| `stores/chatDraftStore.ts` | Pass | Pass | N/A | Fail | 500 effective lines; the new Project choice and folder rule need their own owned file (AR-003) |
| Other mapped files | Pass | Pass | Pass | Pass | — |

## Subsystem / Folder / File Placement Verdict

| Path | Clear | Matches Boundary | Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `run-history/domain/project-run-links.ts` (both ports) | Pass | Fail for `RunProjectContextReader` | Low | Pass with note | AR-005: its consumers and its return type live in agent-execution |
| `compositions/project-run-links-composition.ts` | Pass | Pass | Low | Pass | — |
| `components/workspace/history/*` (new) | Pass | Pass | Low | Pass | — |

## Removal / Decommission Completeness Verdict

| Item | Named | Replacement | Scope Explicit | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| "Workspaces" `<h3>` | Pass | Pass | Pass | Pass | — |
| Definition-groups markup | Pass | Pass | Pass | Pass | Moved, not copied |
| `heroicons:folder` for Projects | Pass | Pass | Pass | Pass | — |
| Dead code in touched files | Pass | N/A | Pass | Pass | None claimed; the implementation checks the touched files |

## Legacy / Backward-Compatibility Verdict

| Area | Legacy Retained | Clean Cut | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Run records, inputs, left panel | No | Pass | Pass | No dual paths; existing runs are listed through the Task records |

## Persisted-Data Transition Verdict

| Stored Subject | Decision | Evidence | Proportionate | Migration Safety | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `run_metadata.json`, `run_history_index.json`, `team_run_execution_tree.json`, `team_run_history_index.json` | Directly Usable — No Migration | Pass (`normalizeMetadata` 41–66 projects known keys; `requireKeys` checks missing keys only; absence means "not started under a Project") | Pass | N/A | Pass | An invalid `projectId` drops only that field and logs, unlike the `optionalMarker` rule, which throws. That fits DESIGN rule 7; the implementation should state which rule applies |

## Change / Refactor Sequence Verdict

| Area | Realistic | Seams Explicit | Cleanup Explicit | Verdict |
| --- | --- | --- | --- | --- |
| Steps 1–8 | Pass | Pass | Pass | Pass. Step 5 needs the projection owner from AR-001 |

## Example Adequacy Verdict

| Topic | Needed | Present | Avoided Shape | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Scope, cap, prompt, folder rule | Yes | Pass | Pass | Pass | — |
| Projects node projection with live status | Yes | Fail | N/A | Fail | AR-001 |

## Material Premise Validation

### MP-001 — A delegated copy holds open Tasks of two Projects

- Related contract: REQ-008; server `docs/modules/projects.md` § Follow-up Task to an existing copy ("A copy may hold several open Tasks … It can be given Task B … also while its earlier Tasks are open"; `assertAssignable` has no same-Project condition).
- Behavior IDs: BEH-003.
- Initiating basis kind: User (via the agent) / Contract.
- Trigger: a run that serves several Projects (E-017: one manager hosts Tasks of 6 Projects) gives a copy working on P's open Task A a Q Task B: `delegate_task({target_agent_run_id, task_id: B})`.
- Forward path: `assignToExistingCopy` → `assignExisting` appends B's entry → `deriveCurrent` makes B current (newest open, `task-execution-resource-service.ts` 316–331) → under the design's rule ("executions whose current Task belongs to the Project") the copy leaves P's scope.
- Consequence: under P the host is still listed (it has open work of P), but the worker still doing P's open Task A is hidden there. It shows only under Q.
- Reachability: `Reachable`.
- Review consequence: AR-002.

### MP-002 — Temp-task work under a run started under P appears without a P event

- Related contract: REQ-008 (Temp-task work under runs started under P), REQ-011; SCN-009.
- Initiating basis kind: System. A run started under P makes a description-only `delegate_task`.
- Forward path: the ad-hoc Task link commit → `taskChanged({projectId: null, …})` → feed subject `task:no_project:<id>` with no Project mark (`project-change-publisher.ts` 31, 64–67). The design re-reads only on a loaded Project's `task_upserted`, so the only trigger left is the unknown-copy-key re-read.
- Reachability: `Reachable`.
- Review consequence: AR-004 (the rule is needed; its reason must be stated correctly).

## Unresolved Approved-Behavior Or Current-State Gaps

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| Copy with open Tasks in two Projects | REQ-008's "belong to P's Tasks" and its "instead" assume one Project per copy | AR-002 | Open |

## Review Decision

`Fail`.

## Findings

### AR-001 — The Projects tree has no owner for live status, new runs and the open-run reveal

- Type: Design Impact. Severity: High (blocking).
- Protects: REQ-011 ("status changes … appear"), AC-006 ("with live status"), REQ-012 / AC-001 (the open run is marked and revealed in the mode that lists it), and the Preserved Behavior Boundary ("the same run … same … status").
- Scope status: Within Approved Scope. Changes approved behavior: No.
- Evidence: in Workspaces, the rendered nodes come from `runHistoryNavigationProjection` (`stores/runHistoryNavigationProjection.ts` 35–57), which merges history rows with the live agent and team contexts. It overlays live status (`mergeRunTreeWithLiveContexts`, `runHistoryReadModel.ts` 295), adds local runs from contexts (247–278), applies `markRunAsActive` (`runHistoryStore.ts` 144–175), and builds the run, team and Org ancestry indexes that drive the open-run mark and reveal. DS-003 says only "`ProjectRunHistory {groups, scopes}` → web projection → `RunDefinitionGroups`". No file in the mapping owns that projection, and DS-004's re-read triggers (Task writes, `connected`, web create/archive) do not fire when a top-level run becomes active or idle. A Projects tree built from the GraphQL snapshot would show the status at read time.
- Required update: name the owner of the Projects node projection (a file such as a `projectRunsProjection` beside `runHistoryNavigationProjection`, or an action in `projectRunsStore`). State its inputs: the `projectRunsStore` snapshot plus the same live agent and team contexts Workspaces uses, reusing `buildRunHistoryTreeNodes` / `buildRunHistoryTeamNodes` or their merge step rather than a second status rule. State that it produces the node types `RunDefinitionGroups` takes from the workspace section, and how the open-run mark and reveal find a run in Projects mode (the ancestry index or its equivalent). Add it to DS-003, the File Responsibility Mapping and step 5.
- Why proportionate: it is the missing step on an existing primary spine and reuses the existing owner of live overlays. No new mechanism is needed.
- Recipient: Solution Designer.

### AR-002 — How is a copy that holds open Tasks of two Projects listed?

- Type: Requirement Gap. Severity: Medium (blocking until decided and recorded).
- Protects: REQ-008 (rationale "No hidden or duplicated work"), DEC-013.
- Scope status: Requirement Gap. The Solution Designer may decide it within the direction (DEC-013 is its own decision) and must record the decision.
- Evidence: MP-001. REQ-008 says delegated runs "that belong to P's Tasks" are listed under P, and those "that belong to another Project's Tasks" under that Project "instead". A copy with open A (P) and open B (Q) belongs to both. The design's `runLinksOf` rule (the copy's current Task) silently hides it from P while it still holds P's open Task.
- Required update: decide and record the rule in REQ-008/DEC-013 and in `runLinksOf`'s contract. One option within the stated rationale: a copy is in P's scope when it holds an open entry in a P Task, or, when none is open, when its current Task is P's. That would list it under each Project it is working for. Keeping the current-Task rule is also acceptable if recorded as a decision with the consequence. This review does not prescribe either.
- Recipient: Solution Designer.

### AR-003 — File-size baseline is measured in raw lines and misses the store that grows most

- Type: Design Impact. Severity: Medium (non-blocking; fix in this revision).
- Basis: the team's file-size guardrail (effective non-empty lines, > 500 hard limit) and Principle 12. It does not protect a REQ.
- Evidence (effective non-empty lines): `autobyteus-web/stores/chatDraftStore.ts` is 500 and gains `projectId`, the folder rule and the launch input. `WorkspaceAgentRunsTreePanel.vue` is 495, not over the limit (FU-006's premise), but it may not grow. `WorkspaceHistoryWorkspaceSection.vue` is 445. On the server, `autobyteus-agent-run-backend-factory.ts` is 499 and `agent-run-history-catalog-service.ts` is 499 (`recordPreparedRun` plus repair). Also near the limit: `runHistoryStore.ts` 498 (if touched), `agentTeamRunStore.ts` 488 and `configured-agent-execution-handle.ts` 487.
- Required update: restate E-033 and FU-006 in effective lines. Name where the draft's Project choice and folder rule live (for example a small owned module that `chatDraftStore` calls). Note the server files at 499 so the implementation puts new code in owned files instead of growing them.
- Recipient: Solution Designer.

### AR-004 — The scope structure and the unknown-copy re-read rule need exact meanings

- Type: Design Impact. Severity: Low (non-blocking; fix in this revision).
- Protects: REQ-008, REQ-011, SCN-009 (MP-002); Principle 11 (one meaning per field).
- Evidence: `scopes[].startedUnderProject` has no consumer in the design. If `executions` already holds P's work plus, for runs started under P, their no-Project work (`runLinksOf(null)`), the flag is redundant. If the web uses it to widen the filter, that is a second owner of the scope rule ("The web never computes which copy belongs to which Project"). DS-003's spine does not show `runLinksOf(null)` being joined for runs started under P. DS-004 calls the unknown-copy re-read a race fix, but MP-002 shows it is the only live trigger for Temp-task work, because no-Project Task events carry no Project.
- Required update: state in `ProjectRunHistoryService` that a root's `executions` = `runLinksOf(P)` for that root ∪ (if started under P) `runLinksOf(null)` for that root, and remove `startedUnderProject` or name its single use. Restate the DS-004 rule's reason as SCN-009, keep it at one re-read per copy key, and add Temp-task work under a run started under P to the AC-007 / AC-006 tests.
- Recipient: Solution Designer.

### AR-005 — Smaller accuracy and placement points

- Type: Design Impact. Severity: Low (non-blocking).
- (a) The Dependency Rules forbid run-history importing `src/projects/**`. Existing code already does (`agent-run-history-catalog-service.ts` 14, `team-run-history-service.ts` 16). Reword the rule to "new code goes through the ports"; those imports stay (out of scope).
- (b) Name the Team creation owner: `TeamRunService.createTeamRun` (validation) → `AgentTeamRunManager` 136 (`buildInitialTeamRunExecutionTree` with `projectId`).
- (c) `RunProjectContextReader` is used only by agent-execution and agent-team-execution and returns `RunProjectContext` from `agent-execution/domain`. Put it beside that type rather than in `run-history/domain/project-run-links.ts`, or say why run-history owns it.
- Recipient: Solution Designer.

## Classification

`Design Impact` (AR-001, AR-003, AR-004, AR-005) and `Requirement Gap` (AR-002). The failing classification is Design Impact.

## Recommended Recipient

Solution Designer (`/software_engineering_team/solution_designer`).

## Residual Risks

- ACP is the backend for `grok_build`; the implementation should confirm that each runtime's prompt contains the `Project` section (the design already plans a test on every composer path).
- Hosts of a damaged Task file are not listed under its Project (the view skips damaged files). This is consistent with DESIGN rule 7; worth a log line.
- `PROJECT_NOT_FOUND` on Team creation arrives as a message string (`createAgentTeamRun` returns `{success: false, message}`); the web shows the existing start error.

## Latest Authoritative Result

- Review Decision: `Fail`
- Material-Premise Gate: `Pass` (MP-001 and MP-002 are Reachable and evidenced)
- Notes: the server design (records, no migration, ports, `runLinksOf`, the `Project` section on all five composer paths) is sound. A re-review needs AR-001 and AR-002 resolved; AR-003…AR-005 are expected in the same revision.
