# Implementation Handoff — task-run-resources-workspace-cleanup

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: Large/High; independent architecture review passed (ARCH-REV-002 on SR-006, ARCH-REV-003 on SR-008 resume). Code review follows.
- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-run-resources-workspace-cleanup/tickets/in-progress/task-run-resources-workspace-cleanup/requirements-doc.md` (Approved SD-AP-001; split SD-AP-002 moves REQ-010 out)
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-run-resources-workspace-cleanup/tickets/in-progress/task-run-resources-workspace-cleanup/investigation-notes.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-run-resources-workspace-cleanup/tickets/in-progress/task-run-resources-workspace-cleanup/solution-revision-record.md` (through SR-008)
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-run-resources-workspace-cleanup/tickets/in-progress/task-run-resources-workspace-cleanup/design-spec.md`
- Supplemental task artifacts: Product UI/UX spec `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/task-run-resources-workspace-cleanup/ui-ux-spec.md` @ `a38bd6e` (motion, focus, selection fallback; VIS-001–008); `solution-design-handoff.md`; `product-design-request.md`.
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-run-resources-workspace-cleanup/tickets/in-progress/task-run-resources-workspace-cleanup/design-review-report.md`
- Architecture review revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-run-resources-workspace-cleanup/tickets/in-progress/task-run-resources-workspace-cleanup/architecture-review-revision-record.md`
- Triggering rework report: N/A (initial)

## Current Implementation Summary

Task closure (DONE) is now a view fact: each root's view keeps the full execution tree and carries `closed_task_executions` beside it. The web listing leaves out every closed task execution and its subtree, live and after reload, under Agent, Team and Org roots. Leaving rows fade out over 200 ms, or instantly under reduced motion. They are hidden from assistive technology at once, and focus and selection fall back.

- Implementation cycle: `Rework` (IR-004 implements SR-009 / ARCH-REV-004; IR-003 fixed CR-002; IR-002 fixed CR-001; IR-001 was the initial baseline)
- Implementation revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-run-resources-workspace-cleanup/tickets/in-progress/task-run-resources-workspace-cleanup/implementation-revision-record.md`
- Current implementation revision ID: `IR-004`
- Related solution revision IDs: `SR-006`, `SR-007`, `SR-008`, `SR-009`
- Related architecture-review revision IDs: `ARCH-REV-002`, `ARCH-REV-003`, `ARCH-REV-004`
- Related code-review revision IDs: `CRR-001` (Fail, CR-001), `CRR-002` (Pass, targeted delta on IR-002 `489268fc7`), `CRR-003` (failure-origin of API-F-001: CR-002, Local Fix → IR-003), `CRR-004` (Pass, targeted delta on IR-003 `3570b8c10`; no open findings), `CRR-005` (Pass, targeted delta on IR-004 `50b08001d`; DOC-001 resolved); API-E2E / delivery: `N/A`
- Triggering finding IDs: `CR-002` (fixed in IR-003); `CR-001` (fixed in IR-002)
- Workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-run-resources-workspace-cleanup`, branch `codex/task-run-resources-workspace-cleanup`, base `origin/personal@5c74fed71`; the implementation commit is named in the handoff message. The ticket folder is untracked.

## Routing Classification (Mandatory)

- Task size: `Large`
- Architecture risk: `High`
- Design classification section: design-spec "Task Size And Architectural Risk".
- Classification confirmed or changed: `Confirmed`
- Evidence: shared wire contracts changed for all three root kinds (collaboration and Team stream contracts, Team resume-config GraphQL, Org history item); the neutral Task port gained a read; server roots/managers and three web root contexts changed.
- Selected route: `Code Review`
- Lightweight implementation self-review for the direct route: `Not Applicable`
- New design impact or escalation trigger: `None`

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-002 / REQ-001, 002, 003, 005 (SP-1, EV-1) | DONE removes the Task's runs live, before stopping, regardless of stop outcome | `ProjectTaskService` DONE → `TaskAgentResourceRelease` → root `releaseTaskAgentResources` → `RootTaskAgentResourceScope.releaseTaskAgentResources`: synchronously publishes released refs that are closed (port) and in the tree (`adapter.containsTaskExecution`) via `adapter.publishTaskExecutionsClosed` (R-1 payload) → standalone/Org `task_executions_closed` root event, Team `TASK_EXECUTIONS_CLOSED` source → projectors → web contexts merge the closed set; rows recompute and leave | Implemented. Server test: published first, failed stop still published, repeated DONE re-publishes, open-only release publishes nothing (all 3 adapters). Web: Agent/Team/Org context tests. |
| BEH-003/004 / REQ-004 (SP-2) | Closed runs absent after reload/restart/Task delete/inactive root | Live snapshots: `closedTaskExecutions` read with the tree (`lifecycle.closedTaskExecutions()` → scope → `listClosedTaskExecutions`). Stored reads: `StandaloneAgentRunRootManager.getInspection` (private `closedTaskExecutionsFor`), `AgentOrgRunManager.getInspection`/`closedTaskExecutionsFor`, `AgentTeamRunManager.closedTaskExecutionsFor` used by `TeamRunHistoryService.getTeamRunResumeConfig` → GraphQL `closedTaskExecutions` → `teamRunContextHydrationService` | Implemented; server root/manager tests, Team hydration test. Task side: `TaskAgentResourceService.closedAgentRunsIn`, backed (IR-004, SR-009) by a private per-host-root closed index updated only in `swap()`. It survives restart and Task delete; a damaged Task contributes none. |
| BEH-003 / REQ-004 Org history list (SP-3, AR-001) | Org rows without a hydrated context hide closed runs | `CollaborationRootHistoryService.projectAgentOrg` → `orgRuns.closedTaskExecutionsFor(row.orgRunId, tree)` on the same tree instance it projects (R-3) → `closed_task_executions` on the item → `parseAgentOrgHistoryItem` → `projectAgentOrgHistoryRows` uses the context's closed set, else the item's | Implemented; server scoped-history test (same tree instance), web Org test without context. |
| BEH-006 / REQ-007, 008 | Tree records, contexts and Team-tab messages kept | Tree DTOs never filtered; contract correlation accepts only task-execution refs; web contexts keep indexes/contexts; only listings filter | Agent/Team/Org tests assert contexts and messages remain. |
| REQ-009 | Open closed conversation returns to the root; closed run not selectable; focus to run row; leaving row out of a11y tree | Agent: `agentRunCollaborationStore` (`isListed`, `returnToHostWhenUnlisted` on publish and on `onTaskExecutionsClosed`). Team: `teamExecutionViewState.leaveClosedFocus` (delegator of outermost closed execution, else root coordinator) on message/snapshot, emitting `reconcile_focused_team_member_projection`. Org: `AgentOrgExecutionContext.leaveClosedSelection` (delegator if listed, else none). Components: `useLeavingTreeRows` (aria-hidden, inert, focus to run row) | Implemented; store/context tests, composable test, browser self-check. |
| REQ-002 motion | 200 ms ease-out fade + collapse, rows move up; instant under reduced motion; no enter motion | `<TransitionGroup name="tree-row">` in `AgentRunTaskRows.vue`, `WorkspaceTeamExecutionTree.vue`, `WorkspaceAgentOrgHistoryCollection.vue`; shared `treeRowLeave.css`. The Agent tree stays mounted (`rendered`) until its last leaving rows settle, then stops rendering the empty list (IR-002, CR-001) | Browser self-check (Org): fading at 100 ms, gone by 350 ms; reduced motion: no fade, removed within ~2 frames. Agent last-row leave: mounted-component test with a real `TransitionGroup`. IR-003: the leave rule follows the move rule and lists transform, so a row leaving mid-move still fades and collapses (CR-002; cascade test + real-Chrome check). |
| REQ-006 / BEH-001, 005 | Non-Task rows, other Tasks, reopen+redelegate unchanged | Closure is per agent run; new runs are open; collaborators/description-only work never closed | Task-side test (reopen keeps old closed, new open); listing tests keep other Tasks' rows. |
| Team scope (AR-002) | Only the Workspaces tree filters | `buildRunHistoryTeamExecutionRows` filters by `view.isTaskExecutionRowListed`; `projectNavigationRows`/`listNavigationRows()` unchanged | Test asserts navigation rows identical with/without closure. |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes` (REQ-010 restyle not touched; it is on the base).

## Key Files Or Areas

- Contracts: `autobyteus-collaboration-stream-contracts/src/{agent-org-execution-dtos,agent-run-collaboration-dtos,root-execution-view-dtos}.ts` (+ dist, `tests/closed-task-executions.test.mjs`); `autobyteus-team-stream-contracts/src/{team-task-execution-message-dtos,team-stream-server-message}.ts` (+ dist, `tests/team-task-executions-closed.test.mjs`).
- Server: `agent-collaboration/execution/task/{task-agent-resource-port,root-task-agent-resource-scope,root-task-execution-adapter,root-task-execution-lifecycle}.ts`, new `task-execution-closure.ts`; `projects/services/{task-agent-resource-service,project-task-service}.ts`; standalone/Org/Team roots, events, adapters, managers; `run-history/services/{team-run-history-service,collaboration-root-history-service}.ts`; `api/graphql/types/{team-run-history,collaboration-root-history}.ts`; `services/agent-streaming/*-projector.ts`; `agent-execution/runtime/general-process-run-supervisor.ts` (explicit port to the standalone and Org managers, R-2).
- Web: new `utils/collaboration/taskExecutionClosure.ts`, `components/workspace/history/{useLeavingTreeRows.ts,treeRowLeave.css}`; `services/agentCollaboration/*`, `stores/agentRunCollaborationStore.ts`; `services/teamExecution/{teamExecutionViewState,teamExecutionViewModels}.ts`, `stores/runHistoryTeamExecutionRows.ts`, `services/runHydration/teamRunContextHydrationService.ts`; `services/agentOrgExecution/agentOrgExecutionContext.ts`, `utils/agentOrgHistoryRows.ts`, `stores/{runHistoryStoreSupport,runHistoryTypes}.ts`; `graphql/queries/{runHistoryQueries,collaborationRootHistoryQueries}.ts`, `generated/graphql.ts` (hand-updated to match the server schema; codegen needs a running server).

## Area Contract And Docs (SR-009, IR-004)

- `autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md` § Team Server Messages: `TASK_EXECUTIONS_CLOSED`, the snapshot's required `closed_task_executions`, and the unfiltered tree.
- R-6: `autobyteus-server-ts/docs/modules/agent_communication.md`, `autobyteus-server-ts/docs/modules/standalone_agent_run_root.md`, `autobyteus-web/docs/agent_orgs.md`.

## Important Assumptions

- Team event: a new `TeamRunEventSourceType.TASK_EXECUTIONS_CLOSED` (list payload) rather than a variant of the single-ref `TASK_EXECUTION` source (the design allows either).
- The Team snapshot contract carries `closed_task_executions` without tree correlation, consistent with that contract family (only Agent/Org views correlate); the web rejects an unknown ref on the live message.
- Team resume-config GraphQL uses camelCase `{agentRunId}|{teamRunId}` as specified; the web parses it with the shared `closedTaskExecutionsDtoSchema`.
- The standalone manager's `closedTaskExecutionsFor` is private (its only consumer is its own stored inspection).
- Web unknown closed refs on a live event: Agent/Org contexts require reopen (like other identity mismatches); Team rejects the message.

## Known Risks

- Reduced motion: Vue removes the leaving element after its next frames (~2 frames), so "immediately" means without visible motion, not synchronous removal.
- `TransitionGroup` also fades rows removed by collapsing a Team (accepted in the design).
- Team REQ-009 is scoped to the Workspaces tree and main view; members panel, running list, token usage and mobile focus still list closed members (design residual risk).
- `generated/graphql.ts` was edited by hand for the three new fields; regenerate with codegen against a running server to confirm.
- Damaged Task resource file: its runs stay listed (existing error surface).

## Task Design Health Assessment Implementation Check

- Reviewed change posture: feature/behavior change
- Reviewed root-cause classification: `No Design Issue Found` (ownership)
- Reviewed refactor decision: `No Refactor Needed` (one shared closure function; Org row consolidation deferred)
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`
- Evidence: closure computed only through `listClosedTaskExecutions` (scope and the three managers); web closed-subtree rule only through `collectClosedSubtrees`.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None` (fields are required; no optional/defaulted closure).
- Legacy old-behavior retained in scope: `No`
- Dead/obsolete code removed in scope: `Yes`
- Shared structures remain tight: `Yes` (one reference DTO per contract family; no `closed` flag on tree nodes)
- Canonical shared design guidance reapplied: `Yes`
- Changed source files within size guardrails: `Yes` (largest 476 non-empty lines: `teamExecutionViewState.ts`; no file delta >220)
- Notes: test fixtures across the web/server suites gained the now-required field.

## Persisted Data Transition Check

- Approved decision: `Not Affected` — nothing new is written; closure is read from the existing `agent_run_resources.json` view.

## Environment Or Dependency Notes

- After the rebase: `pnpm install --frozen-lockfile`, rebuilt both contract packages (dist is tracked and committed), `pnpm -C autobyteus-server-ts prepare:shared` + prisma generate, `pnpm -C autobyteus-web exec nuxt prepare`.

## Local Implementation Checks Run

- Contracts: collaboration-stream-contracts `node --test`: 13 pass, 7 fail. The 7 are pre-existing failures in `root-execution-view-dtos.test.mjs` (stale `schema_version`/`task_records` fixture; they failed identically on baseline src). The new `closed-task-executions.test.mjs` passes 4/4. Team-stream-contracts: 7/7 pass.
- Server `tsc --noEmit -p tsconfig.build.json`: clean.
- Server suites (TESTING.md Project Task set plus affected areas): `tests/unit/{projects,agent-collaboration,agent-tools/project-tasks,agent-tools/task-delegation,run-history,services/agent-streaming,standalone-agent-run-root,agent-org-execution,agent-team-execution,api/graphql/types}` + `tests/integration/agent-team-execution/task-delegation-tool-lifecycle` + `tests/integration/standalone-agent-run-root/native-root-termination`: 1103 pass, 7 fail in 3 files (`memory-view-member-resolver`, `published-artifact-projection-service`, `team-run-history-catalog-service`). All three are in the pre-existing set that failed identically on baseline server source.
- Web `tsc`: no errors in changed source except a pre-existing one in `teamExecutionViewState.ts` (`nextTree.root_team =` in the base `COLLABORATOR_ADDED` branch).
- Web full `pnpm -C autobyteus-web test:nuxt --run`: 3652 pass, 36 fail in 12 files, none in closure paths:
  - ToastContainer, FileExplorer.metadataActivation, RightSideTabs.workspaceTarget, MobileUxRefinement, AgentCompactionLiveFlow, teamTaskApprovalHydration (stale snapshot fixture: `recoverableBlock`/`agent_input_states`), workspaceSelectionComposition: these fail the same way on a checkout without this change.
  - electron/* (Electron install, `child_process` mock), app-font-size audit (token-usage files), codex-turn-lifecycle (`threadManager.getThread`), org-definition-navigation (definition-page GraphQL operations; this change adds no operation): unrelated to changed code.
- New tests: server (Task side `closedAgentRunsIn`, scope publication ×3 adapters, `listClosedTaskExecutions`, standalone root live/snapshot/stored, Org stored inspection, Org history item, Team projector + manager, Team resume config); web (Agent context/store, Team rows/view state/hydration, Org rows/context/parse, closure util, leave composable + motion CSS).

## Frontend Rendered-Result Check

- Affected surfaces: Workspaces tree rows under Agent, Team and Org roots; main-view selection fallback.
- References: UI/UX spec Motion, Accessibility, TR-001–TR-004; VIS-001/002/004.
- Existing design system reviewed: shared tree rows, `WorkspaceHierarchyBranches`, the Product reference's `AgentRunTaskRows.vue` (same TransitionGroup/leave pattern).
- Rendered surface: a temporary Nuxt page reusing the production `WorkspaceAgentOrgHistoryCollection` with the Org disclosure probe's fixture tree, driven by headless Chrome (temporary page and runner removed after the run). Closing the delegated Team `ssg-task-2` through the history-item closure:
  - normal motion: row `aria-hidden` + inert at once; opacity 0.41 and height 13 px at 100 ms; gone by 350 ms; focus moved from a leaving member row to the Org run row; branch lines redrawn; other rows unchanged;
  - reduced motion: no fade; removed within ~2 frames; same focus move.
- Evidence: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-run-resources-workspace-cleanup/tickets/in-progress/task-run-resources-workspace-cleanup/implementation-evidence/org-leave-motion/` (`result.json`, before/after screenshots for both modes).
- Not rendered: a real Manager DONE journey on an isolated instance (preferred in the design; downstream). The Agent and Team trees were not rendered in a browser; they use the same composable/CSS, and their listing is covered by tests.

- IR-004: new per-root index test (link, DONE, reopen + link, repeated DONE, damaged file; index equals a scan of the committed file at each step). Server projects/agent-collaboration/standalone/Org inspection/scoped history/Team projector: 31 files / 354 tests pass; server `tsc` clean.
- IR-003: `useLeavingTreeRows.spec.ts` 4/4, with a new cascade test that fails on the old CSS. History components 13 files / 160 tests pass. Real-Chrome cascade check: move + leave classes → `opacity, max-height, margin-top, transform`; reduced motion → `none`.
- IR-002: `AgentRunTaskRowsLeave.spec.ts` 2/2 (fails against the old guard). Affected web suites 101 files / 689 tests pass.

## Downstream Coverage Hints / Suggested Scenarios

- Standalone Agent root whose only/last Task is marked DONE: the last rows fade out and the empty tree then disappears; focus on a leaving row moves to the run row (CR-001 path).
- Isolated instance: a Project Task Manager delegates Task A (Agent) and Task B (Team), marks A DONE → A's rows fade out live, B and the Manager stay (AC-001); A's worker sub-delegates + brings in a helper → all leave (AC-002).
- A failing stop still hides rows (AC-003). Reload, restart, Task delete and DONE while the root is stopped → closed runs never appear (AC-004).
- Repeat under an Agent Team root and an Agent Org root (AC-005), including an Org run expanded before its context hydrates.
- Reopen + redelegate (AC-006); files still on disk (AC-007); Manager Team tab keeps messages (AC-008).
- Open worker conversation at DONE → Manager view, run row selected; focused leaving row → focus to run row (AC-009). Reduced motion (AC-010).

## API / E2E / Executable Coverage Investigation And Execution Still Required

- All AC-001–AC-010 on a real stack (stream + stored reads) under all three root kinds; contract/codegen confirmation of the hand-updated `generated/graphql.ts`.
