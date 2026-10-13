# Investigation Notes

## Investigation Meta
- Package: delegated-team-default-collapse / project_task_394f7ced-6597-41e8-824a-e2140c35b743
- Repository mode: Git
- Worktree: /home/autobyteus/workspace/.codex/worktrees/delegated-team-default-collapse
- Branch: requirements/delegated-team-default-collapse
- Base: refreshed origin/personal, 8d52dc4eb378609ae2dca6089eb62678eeafe803
- Finalization target: origin/personal, subject to Delivery gates.
- Bootstrap: git fetch origin and git worktree add succeeded; no preexisting package found.
- Shared checkout left untouched; preexisting untracked user directories preserved.
- Authorities read 2026-10-13: solution-designer/SKILL.md, references/requirements-engineering.md, requirements and investigation templates, AGENTS.md, autobyteus-web/AGENTS.md, autobyteus-server-ts/AGENTS.md, DESIGN.md, TESTING.md. Architecture references read ahead of phase; architecture work starts only after approval.
- Current revision: SR-002; requirements/architecture investigation complete for bounded design.

## Initial Request And Clarifications
Task delegator: /project_task_manager, AgentRun project_task_manager_2f7a8ea2d421446f8f22e4f616528547.
Original request: keep delegated teams collapsed by default when opening Project Task Manager after startup/restart; preserve manual team expansion/collapse, member selection, conversations and worker/task state. Investigate slow initial selection, do not infer causality from screenshot. Include durable tests, rendered UI checks, truthful runtime/delivery state and cleanup.
Incoming task says dispatch needs separate user approval; this is a dispatched assignment, not evidence of a release or finalization approval. Delegator owns dispatch approval; no user final verification recorded yet.
User runtime question sent asynchronously 2026-10-13; no answer yet.

## Evidence So Far
- Attached screenshot inspected with view_image: several delegated team rows and their members visible under selected Project Task Manager conversation. Image is visual problem context, not a latency trace or OS/runtime proof.
- Safe environment inventory: uname reports Linux aarch64 linuxkit; PID 61 runs node dist/app.js on 8000 with /home/autobyteus/data. Chromium exists, no Electron process in current namespace, no docker CLI available. This identifies worker environment only, NOT user's reported runtime. No user app/data tests or restarts performed.
- list_tabs returned empty; no UI automation performed.

## Supplemental Artifact Inventory
- User screenshot: /home/autobyteus/data/projects/project_f34a9537-07d7-449a-b78f-16368f1aa619/tasks/project_task_394f7ced-6597-41e8-824a-e2140c35b743/context/ctx_efad056b398c__ctx_c530ee43ec84_image.png; user-owned visual context; BEH/REQ IDs pending; not normative UI design or performance evidence.

## Product Design Request Context
Not stated: existing-interaction bug fix, no Product Team/visualizer request. Product artifacts N/A — not applicable.

## Unknowns
Current default expansion owner, automatic-expansion watcher, selection critical path, latency measurements and actual user runtime remain to investigate.

## Current-Source Evidence Log (2026-10-13, base 8d52dc4eb)
All repository paths below are relative to the isolated worktree named in Investigation Meta; sources consulted using cat/sed and rg.
- E-001: Incoming screenshot and task, as recorded above. Supported user trigger is selecting role/run after startup with multiple delegated teams; no latency measurement in image.
- E-002: autobyteus-web/stores/agentRunCollaborationStore.ts, openNewTaskTeams/publish/attach: every indexed team is inserted in ephemeral expandedTeams on first publication; autoExpanded deduplicates opening during current store lifetime. Stored inspect, stream snapshot publish and collaborator-added hook call this opener. isTaskTeamExpanded otherwise defaults false; toggleTaskTeam keys by hostRunId + teamRunId. These are explicit default-opening paths, not a task engine action.
- E-003: components/workspace/history/AgentRunTaskRows.vue mounts for each shown run; onMounted(loadStored) and hasCollaboration watcher inspect without restoration. WorkspaceHistoryWorkspaceSection.vue renders AgentRunTaskRows under role/run (lines 121-199), including unselected shown runs. So expansion is tied to collaboration publication, not necessarily a manager-selection watcher. User sees it when opening/revealing that role/run.
- E-004: AgentRunTaskRows.vue toggle emits only local disclosure; select targets row.agentRunId or index.coordinatorOf(team).agentRunId; emit select-run opens host context without changing selected child. WorkspaceHistoryWorkspaceSection selectAgentRun clears selectedChild for explicit host click. AgentRunCollaborationContext.listTaskRows renders children only when supplied isTeamExpanded returns true; closed subtrees are excluded independently.
- E-005: composables/projects/useTaskRootNavigation.ts openInAgentRun explicitly expands only root.teamRunId before selecting root.ingressAgentRunId; this is targeted user navigation, not implicit initial expansion.
- E-006: stores/__tests__/agentRunCollaborationStore.spec.ts currently asserts initial team opening (must update to new approved behavior), child conversation targeting, browsing, and submit transport. Existing closure/termination/compaction tests live alongside it. services/agentCollaboration/__tests__/agentRootFixture.ts has one hosted team and two members; realistic multiple-team test needs additional delegated copies with unique run IDs, including shared addresses.
- E-007: services/agentCollaboration/agentRunCollaborationHydration.ts builds index then Promise.all over every child Agent; each calls fetchMemberRunState. services/runHydration/memberRunStateHydration.ts fetches one member projection and file-change query in parallel per child. All staged children must resolve before context publication. This cost exists regardless of isTaskTeamExpanded. Seven six-member teams imply 42 child projections + 42 file-change queries, plus view/host/workspace/Task summary reads. Source-derived work count, NOT observed user latency or proof that any query is slow. No speedup measured.

## Relevant Existing Behavior And Supported Product Paths
BEH-001: User selects manager role/conversation after start; role ancestors reveal history; shown runs load collaboration and currently auto-open all teams (E-002/003). Confidence high for source mechanism; actual user runtime/version still unknown.
BEH-002: User chooses one disclosure/member or Task root; independent UI state and exact coordinator/member target (E-004/005). Supported Normal Scenario.
BEH-003: Background stream/task completion updates status/listing while disclosure is UI-only (E-004/006). Supported Normal Scenario.
BEH-004: Slow first selection reported; E-007 exposes independent eager hydration as candidate workload. Cause/confidence unresolved until comparable measured validation.

## Structural And Payload Surface Inventory
Payload: task-owned Markdown package and screenshot evidence; no production persisted payload conversion.
Structural: existing standalone-run collaboration store, row component/context, stream callback and neighboring tests. Browser/desktop renderer share these owners. Team/Org roots have separate defaults (useWorkspaceHistoryTreeState.ts/WorkspaceAgentOrgHistoryCollection.vue/runHistoryTeamExecutionRows.ts) and are out of scope for this standalone manager ticket.
Current readers/writers: expandedTeams shallowReactive and autoExpanded Set are memory-only; no localStorage/database serialization in this store; release deletes host record; node binding watch releases contexts and clears autoExpanded.
Potential impacts: no API/persistence/security/deployment contract change required for presentation fix. Need architecture check of dead callback and same-session release lifecycle. No measured performance improvement known.

## Supplemental Inventory Update
User screenshot: evidence-only; related REQ-001/006, AC-001/006; no approval applicability. Product-owned artifact N/A — not requested.

## Requirements Implications
Default collapse is independent of worker running status or Task status. Keep explicit reveal/navigation and user disclosure choices. Requirements approved as REQ-B1/SR-001 with informed-user conversation reference; no behavior-defining supplement.

## Architecture Investigation Findings (After REQ-B1 Approval, 2026-10-13)
Authorities read in full: /home/autobyteus/workspace/autobyteus-workspace/.codex/skills/solution-designer/references/architecture-design.md; references/design-principles.md; templates/design-spec-template.md; task worktree DESIGN.md (base 8d52dc4eb); applicable AGENTS.md and TESTING.md. No closer DESIGN.md governs web code. DESIGN.md was also reviewed through git show origin/personal before source investigation. No design-principle conflict.

- E-008: composables/agentCollaboration/useAgentRunCollaborationSync.ts and components/workspace/agent/AgentWorkspaceView.vue: selected standalone host is synchronized by immediate watcher; Offline host inspects, active host attaches collaboration stream. Viewing stopped/crashed host does not restore it. Host loading path is separately services/runOpen/agentRunOpenCoordinator.ts -> services/runHydration/runContextHydrationService.ts -> host resume/projection/artifact reads, workspace/definition resolution, selection commit and stream attachment. Child hydration is triggered by mounted sidebar/selected workspace, not awaited directly by host open coordinator; distinguish host readiness from collaboration readiness in latency report.
- E-009: services/agentCollaboration/agentRunCollaborationStreamingService.ts accepts CONNECTED then ROOT_EXECUTION_VIEW_SNAPSHOT, hydrates all children, then publish callback. ROOT_EXECUTION_EVENT collaborator_added applies context update and calls optional onCollaboratorAdded hook. rg over production/test .ts/.vue found only one caller providing this hook: agentRunCollaborationStore.attach, where it solely opens teams. It becomes dead when auto-opening policy is removed; remove option and invocation, NOT the actual applyEvent collaborator_added branch. task_execution_started reconnects for a fresh snapshot; task closure hook remains necessary.
- E-010: WorkspaceTransientExecutionRow.vue activateRow toggles a team with children THEN emits select, while independent disclosure click stops propagation and only toggles. Thus team body activation still deliberately opens/closes that team and selects coordinator; host-row selection is different. Existing shared component must not change for this fix. Keyboard Enter/Space mirrors body activation; disclosure remains keyboard button.
- E-011: services/agentCollaboration/agentRunCollaborationIndex.ts indexes collaborators and additional task copies by unique run ID. Repeated addresses/copies are legitimate; use hostRunId + teamRunId for disclosure, never displayed name/address. AgentRunCollaborationContext constructor enforces complete child contexts; listTaskRows checks expansion only when descending after pushing team row. Changing visual default cannot reduce hydration queries. No need to alter index or context to realize collapse.
- E-012: server api/graphql/types/agent-run-collaboration.ts agentRunCollaboration query calls standalone root manager.getInspection and view projector, never restores. Member query calls standalone-root-member-view-projection-service.ts exact host/address/run location validation and projection; fetching child projections remains backend-owned. No server change planned. These are performance candidates to measure, not proven slow operations.
- E-013: existing tests/e2e/task-closure-tree-probe.mjs offers public API/scripted AGY tool setup for real delegation, Task state, reload/backend restart and exact rows with owned stack/cleanup. Use pattern, not its entire suite as authority for collapsed-by-default. TESTING.md requires isolated changed-build Electron for full journey, web tests + browser probe for web behavior, and forbids user instance testing. Current worker namespace is Linux container with no Electron process/docker CLI; ordinary safe isolated setup belongs to validation agents.
- E-014: node binding change watches in store release existing hosts/contexts/streams; release deletes expandedTeams host entry. Expansion has no persistence read/write; grep persist/localStorage produced no match in store. autoExpanded is now redundant suppression state for removed policy, including its binding-watch clear. No persisted-data transition, schema/migration or runtime readiness changes justified.
- E-015: autobyteus-web/ARCHITECTURE.md still describes Python backend; source/runtime now use TypeScript server. Treat stale architecture overview as context only, not execution proof. No need to edit overview for this narrow change. projects.md documents deliberate Task-root reveal, which must remain intact. Team/Org roots separately allow automatic/initial reveal; not this delta.

## Persisted Data And State Facts
Subject affected: transient UI disclosure only. Representative store records are hostRunId -> readonly teamRunId[] in shallowReactive memory, empty on fresh Pinia; release deletes record. Stored collaboration trees, Tasks, projections, database and credentials are unchanged. Approximate validation workload: seven delegated copies, about six members each (42 children); actual user data not read or rewritten. Acceptable loss: ephemeral disclosure reset on app restart; no persisted user data loss.

## Performance Findings And Limits
E-007/E-008/E-011 separate three boundaries: host selection commit, collaboration context/row publication, and selected child conversation display. Source predicts 2 × child-count detail queries even when collapsed; 7 × 6 -> 84 child queries. Host and view, workspace/definitions and Task-summary queries are additional and must be counted separately. Removing automatic expansion reduces visible rows from approximately 49 to 7 (seven team rows + 42 hidden member rows), not an observed timing improvement and not a reduction in child hydration reads. Some row enumeration/closed-subtree work remains; do not assume all rendering cost disappears.
No runtime timings or changed implementation exist yet. Validation must capture comparable baseline/changed cold and warm readiness/work counts using owned data, identify warmup/restart meaning and browser/Electron differences. Candidate separate follow-up: eager standalone collaboration child hydration/inspection work if measurements associate it with latency; broad lazy hydration would change readiness/completeness contracts and is NOT authorized here. Existing member-artifact-lookup-cost worktree seen during bootstrap may overlap; coordinate only if measured findings justify it, do not modify that worktree.

## Assumptions, Unknowns, And Risks
- ASM-001 supported standalone manager path verified in source; exact user runtime/OS/version remains unconfirmed (async question pending).
- Risk: sibling disclosure regression on snapshot/update; targeted tests must cover stored/live publish and new team addition with prior manual choices.
- Risk: full product journey requires actual changed-build isolated app, not old installed binary or component screenshot. Downstream must report real limits.
- Unknown: actual latency cause and magnitude; current evidence is a deterministic work-count hypothesis, not user timings.
- No user data, production runtime or provider credentials were mutated. No processes/tabs/servers/models were started by Solution Designer. Isolated worktree is intentionally retained for downstream authoring; Delivery must archive artifacts and clean it after finalization.

## Investigation Status
Requirements discovery and architecture investigation complete for the bounded disclosure change; REQ-B1 approved. Runtime/performance measurements remain planned downstream validation. Canonical package status will be Architecture Design Complete, not implemented/validated/delivered.
